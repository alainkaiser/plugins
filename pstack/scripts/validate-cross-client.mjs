import { existsSync, readFileSync, readdirSync } from "node:fs";
import { dirname, relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const pstackRoot = resolve(scriptDirectory, "..");
const repositoryRoot = resolve(pstackRoot, "..");
const failures = [];

function fail(message) {
  failures.push(message);
}

function assert(condition, message) {
  if (!condition) fail(message);
}

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, "utf8"));
  } catch (error) {
    fail(`${relative(repositoryRoot, path)} is not valid JSON: ${error.message}`);
    return {};
  }
}

function readText(path) {
  return readFileSync(path, "utf8");
}

function pluginPath(value, label) {
  assert(typeof value === "string" && value.startsWith("./"), `${label} must start with ./`);
  const target = resolve(pstackRoot, value ?? "");
  assert(target === pstackRoot || target.startsWith(`${pstackRoot}${sep}`), `${label} escapes the plugin root`);
  assert(existsSync(target), `${label} does not resolve: ${value}`);
  return target;
}

function marketplacePath(value, label) {
  assert(typeof value === "string" && value.startsWith("./"), `${label} must start with ./`);
  const target = resolve(repositoryRoot, value ?? "");
  assert(target === repositoryRoot || target.startsWith(`${repositoryRoot}${sep}`), `${label} escapes the marketplace root`);
  assert(existsSync(target), `${label} does not resolve: ${value}`);
  return target;
}

function unquote(value) {
  if (!value) return value;
  const first = value[0];
  const last = value.at(-1);
  if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
    return value.slice(1, -1);
  }
  return value;
}

function frontmatter(path) {
  const text = readText(path);
  const match = text.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if (!match) {
    fail(`${relative(repositoryRoot, path)} has no YAML frontmatter`);
    return {};
  }

  const values = {};
  for (const line of match[1].split(/\r?\n/)) {
    const field = line.match(/^([a-zA-Z0-9-]+):\s*(.+)$/);
    if (field) values[field[1]] = unquote(field[2].trim());
  }
  return values;
}

function markdownFiles(root) {
  const files = [];
  for (const entry of readdirSync(root, { withFileTypes: true })) {
    const path = resolve(root, entry.name);
    if (entry.isDirectory()) files.push(...markdownFiles(path));
    if (entry.isFile() && entry.name.endsWith(".md")) files.push(path);
  }
  return files;
}

const manifests = {
  portable: readJson(resolve(pstackRoot, "plugin.json")),
  cursor: readJson(resolve(pstackRoot, ".cursor-plugin/plugin.json")),
  codex: readJson(resolve(pstackRoot, ".codex-plugin/plugin.json")),
  claude: readJson(resolve(pstackRoot, ".claude-plugin/plugin.json")),
};

const portableKeys = new Set([
  "$schema",
  "name",
  "version",
  "description",
  "author",
  "homepage",
  "repository",
  "license",
  "keywords",
  "extensions",
]);

assert(
  manifests.portable.$schema === "https://agent-plugins.org/schemas/1.0.0/plugin.schema.json",
  "plugin.json must declare the Agent Plugins 1.0 schema",
);
for (const key of Object.keys(manifests.portable)) {
  assert(portableKeys.has(key), `plugin.json contains non-portable field: ${key}`);
}

for (const field of ["name", "version", "description", "homepage", "repository", "license"]) {
  for (const [client, manifest] of Object.entries(manifests)) {
    assert(manifest[field] === manifests.portable[field], `${client} manifest ${field} differs from plugin.json`);
  }
}
for (const [client, manifest] of Object.entries(manifests)) {
  assert(manifest.author?.name === manifests.portable.author?.name, `${client} manifest author differs from plugin.json`);
  assert(JSON.stringify(manifest.keywords) === JSON.stringify(manifests.portable.keywords), `${client} manifest keywords differ from plugin.json`);
}

const licenseText = readText(resolve(pstackRoot, "LICENSE"));
assert(licenseText.includes("MIT License"), "pstack/LICENSE must preserve the MIT license");
assert(licenseText.includes("Copyright (c) 2026 Lauren Tan"), "pstack/LICENSE must preserve Lauren Tan's copyright notice");

assert(/^[a-z0-9]+(?:[.-][a-z0-9]+)*$/.test(manifests.portable.name ?? ""), "plugin name is not portable");
assert(/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(manifests.portable.version ?? ""), "plugin version is not semantic");
pluginPath(manifests.cursor.skills, "Cursor skills path");
pluginPath(manifests.cursor.agents, "Cursor agents path");
pluginPath(manifests.codex.skills, "Codex skills path");

for (const nativeDirectory of [".cursor-plugin", ".codex-plugin", ".claude-plugin"]) {
  assert(!existsSync(resolve(pstackRoot, nativeDirectory, "skills")), `${nativeDirectory} must not contain a copied skills tree`);
}

const cursorMarketplace = readJson(resolve(repositoryRoot, ".cursor-plugin/marketplace.json"));
const codexMarketplace = readJson(resolve(repositoryRoot, ".agents/plugins/marketplace.json"));
const claudeMarketplace = readJson(resolve(repositoryRoot, ".claude-plugin/marketplace.json"));
const cursorEntry = cursorMarketplace.plugins?.find((entry) => entry.name === manifests.portable.name);
const codexEntry = codexMarketplace.plugins?.find((entry) => entry.name === manifests.portable.name);
const claudeEntry = claudeMarketplace.plugins?.find((entry) => entry.name === manifests.portable.name);

assert(cursorEntry, "Cursor marketplace does not contain pstack");
assert(resolve(repositoryRoot, cursorEntry?.source ?? "") === pstackRoot, "Cursor pstack source must resolve to pstack/");
assert(cursorEntry?.description === manifests.portable.description, "Cursor marketplace description differs from plugin.json");

assert(codexMarketplace.name === "cursor-plugins", "Codex marketplace name must be cursor-plugins");
assert(codexMarketplace.interface?.displayName === "Cursor Plugins", "Codex marketplace display name must be Cursor Plugins");
assert(codexEntry, "Codex marketplace does not contain pstack");
assert(codexEntry?.source?.source === "local", "Codex pstack source must be local");
assert(marketplacePath(codexEntry?.source?.path, "Codex pstack source") === pstackRoot, "Codex pstack source must resolve to pstack/");
assert(codexEntry?.policy?.installation === "AVAILABLE", "Codex pstack installation policy must be AVAILABLE");
assert(codexEntry?.policy?.authentication === "ON_INSTALL", "Codex pstack authentication policy must be ON_INSTALL");
assert(codexEntry?.category === "Developer Tools", "Codex pstack category must be Developer Tools");

assert(claudeMarketplace.name === "cursor-plugins", "Claude marketplace name must be cursor-plugins");
assert(claudeMarketplace.owner?.name, "Claude marketplace owner is required");
assert(claudeEntry, "Claude marketplace does not contain pstack");
assert(marketplacePath(claudeEntry?.source, "Claude pstack source") === pstackRoot, "Claude pstack source must resolve to pstack/");
assert(claudeEntry?.version === manifests.portable.version, "Claude marketplace version differs from plugin.json");
for (const field of ["description", "homepage", "license"]) {
  assert(claudeEntry?.[field] === manifests.portable[field], `Claude marketplace ${field} differs from plugin.json`);
}
assert(claudeEntry?.author?.name === manifests.portable.author?.name, "Claude marketplace author differs from plugin.json");

const skillsRoot = resolve(pstackRoot, "skills");
const skillDirectories = readdirSync(skillsRoot, { withFileTypes: true }).filter((entry) => entry.isDirectory());
for (const directory of skillDirectories) {
  const skillPath = resolve(skillsRoot, directory.name, "SKILL.md");
  assert(existsSync(skillPath), `skills/${directory.name} is missing SKILL.md`);
  if (!existsSync(skillPath)) continue;
  const metadata = frontmatter(skillPath);
  assert(metadata.name === directory.name, `skills/${directory.name}/SKILL.md name must match its directory`);
  assert(Boolean(metadata.description), `skills/${directory.name}/SKILL.md needs a description`);
}

const adapterPath = resolve(skillsRoot, "poteto-mode/references/platform-adapters.md");
const adapterText = readText(adapterPath);
for (const required of [
  "Cursor",
  "Codex",
  "Claude Code",
  "Agent Plugins 1.0 floor",
  "~/.cursor/rules/pstack-models.mdc",
  "$CODEX_HOME/pstack/models.md",
  "$CLAUDE_CONFIG_DIR/pstack/models.md",
  ".pstack/models.md",
  "<model>@<reasoning-effort>",
  "every pstack skill must explicitly read",
  "pstack serialization, not Codex-native model syntax",
]) {
  assert(adapterText.includes(required), `platform adapter is missing ${required}`);
}

const cursorOnlyPattern = /\bTask\b|AskQuestion|subagent_type|run_in_background|~\/\.cursor|\.cursor\/|agent-transcripts|cursor-team-kit|\/loop|Cursor(?:'s)? built-in|grok-4\.6|claude-(?:fable|opus)-5|gpt-5\.6-sol/;
const directModelConfigPath = /~\/\.cursor\/rules\/pstack-models\.mdc|\$CODEX_HOME\/pstack\/models\.md|\$CLAUDE_CONFIG_DIR\/pstack\/models\.md/;
for (const directory of skillDirectories) {
  const skillPath = resolve(skillsRoot, directory.name, "SKILL.md");
  if (!existsSync(skillPath)) continue;
  const text = readText(skillPath);
  if (cursorOnlyPattern.test(text)) {
    assert(text.includes("platform-adapters.md"), `skills/${directory.name}/SKILL.md uses a client primitive without the platform adapter`);
  }
  assert(!directModelConfigPath.test(text), `skills/${directory.name}/SKILL.md names a client model-config path instead of using the platform adapter`);
}

const setupText = readText(resolve(skillsRoot, "setup-pstack/SKILL.md"));
assert(setupText.includes("Default to that client's user scope"), "setup-pstack must default to client-specific user scope");
assert(setupText.includes("Never write another"), "setup-pstack must forbid cross-client configuration writes");

for (const name of ["comment-sicko", "poteto-agent"]) {
  assert(existsSync(resolve(pstackRoot, `agents/${name}.md`)), `agents/${name}.md is missing`);
  assert(adapterText.includes(`${name}.md`), `platform adapter must name agents/${name}.md as a source of truth`);
}

for (const [client, manifest] of Object.entries({ portable: manifests.portable, codex: manifests.codex, claude: manifests.claude })) {
  assert(!JSON.stringify(manifest).toLowerCase().includes("benny"), `${client} manifest must not register Benny`);
}

let checkedLinks = 0;
for (const markdownPath of markdownFiles(pstackRoot)) {
  const text = readText(markdownPath);
  const links = text.matchAll(/!?\[[^\]]*\]\(([^)]+)\)/g);
  for (const match of links) {
    let target = match[1].trim().replace(/^<|>$/g, "");
    if (!target || target === "url" || /^(?:https?:|mailto:|#)/.test(target)) continue;
    target = target.split("#", 1)[0];
    if (!target || target.includes("<") || target.includes(">")) continue;
    checkedLinks += 1;
    assert(existsSync(resolve(dirname(markdownPath), decodeURIComponent(target))), `${relative(repositoryRoot, markdownPath)} has a broken link: ${match[1]}`);
  }
}

if (failures.length > 0) {
  for (const failure of failures) process.stderr.write(`FAIL ${failure}\n`);
  process.exitCode = 1;
} else {
  process.stdout.write(`Validated 4 manifests, 3 marketplaces, ${skillDirectories.length} skills, and ${checkedLinks} local Markdown links.\n`);
}
