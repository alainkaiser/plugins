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
    const field = line.match(/^([a-zA-Z0-9_-]+):\s*(.+)$/);
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
  cursor: readJson(resolve(pstackRoot, ".cursor-plugin/plugin.json")),
  codex: readJson(resolve(pstackRoot, ".codex-plugin/plugin.json")),
  claude: readJson(resolve(pstackRoot, ".claude-plugin/plugin.json")),
};
const canonicalManifest = manifests.cursor;

assert(!existsSync(resolve(pstackRoot, "plugin.json")), "pstack/plugin.json must not claim Agent Plugins portability");

for (const field of ["name", "version", "description", "homepage", "repository", "license"]) {
  for (const [client, manifest] of Object.entries(manifests)) {
    assert(manifest[field] === canonicalManifest[field], `${client} manifest ${field} differs from the Cursor manifest`);
  }
}
for (const [client, manifest] of Object.entries(manifests)) {
  assert(manifest.author?.name === canonicalManifest.author?.name, `${client} manifest author differs from the Cursor manifest`);
  assert(JSON.stringify(manifest.keywords) === JSON.stringify(canonicalManifest.keywords), `${client} manifest keywords differ from the Cursor manifest`);
}

const licenseText = readText(resolve(pstackRoot, "LICENSE"));
assert(licenseText.includes("MIT License"), "pstack/LICENSE must preserve the MIT license");
assert(licenseText.includes("Copyright (c) 2026 Lauren Tan"), "pstack/LICENSE must preserve Lauren Tan's copyright notice");

assert(/^[a-z0-9]+(?:[.-][a-z0-9]+)*$/.test(canonicalManifest.name ?? ""), "plugin name is invalid");
assert(/^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/.test(canonicalManifest.version ?? ""), "plugin version is not semantic");
pluginPath(manifests.cursor.skills, "Cursor skills path");
pluginPath(manifests.cursor.agents, "Cursor agents path");
pluginPath(manifests.codex.skills, "Codex skills path");
assert(!("agents" in manifests.codex), "Codex manifest must not claim native agents support");

for (const nativeDirectory of [".cursor-plugin", ".codex-plugin", ".claude-plugin"]) {
  for (const component of ["skills", "agents"]) {
    assert(!existsSync(resolve(pstackRoot, nativeDirectory, component)), `${nativeDirectory} must not contain a copied ${component} tree`);
  }
}

const cursorMarketplace = readJson(resolve(repositoryRoot, ".cursor-plugin/marketplace.json"));
const codexMarketplace = readJson(resolve(repositoryRoot, ".agents/plugins/marketplace.json"));
const claudeMarketplace = readJson(resolve(repositoryRoot, ".claude-plugin/marketplace.json"));
const cursorEntry = cursorMarketplace.plugins?.find((entry) => entry.name === canonicalManifest.name);
const codexEntry = codexMarketplace.plugins?.find((entry) => entry.name === canonicalManifest.name);
const claudeEntry = claudeMarketplace.plugins?.find((entry) => entry.name === canonicalManifest.name);

assert(cursorEntry, "Cursor marketplace does not contain pstack");
assert(resolve(repositoryRoot, cursorEntry?.source ?? "") === pstackRoot, "Cursor pstack source must resolve to pstack/");
assert(cursorEntry?.description === canonicalManifest.description, "Cursor marketplace description differs from the Cursor manifest");

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
assert(claudeEntry?.version === canonicalManifest.version, "Claude marketplace version differs from the Cursor manifest");
for (const field of ["description", "homepage", "license"]) {
  assert(claudeEntry?.[field] === canonicalManifest[field], `Claude marketplace ${field} differs from the Cursor manifest`);
}
assert(claudeEntry?.author?.name === canonicalManifest.author?.name, "Claude marketplace author differs from the Cursor manifest");

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
  "Discover MCP tools",
  "~/.cursor/rules/pstack-models.mdc",
  "$CODEX_HOME/pstack/models.md",
  "$CLAUDE_CONFIG_DIR/pstack/models.md",
  "<model>@<reasoning-effort>",
  "every pstack skill must explicitly read",
  "shared cross-client model file",
  "pstack serialization, not Codex-native model syntax",
]) {
  assert(adapterText.includes(required), `platform adapter is missing ${required}`);
}

const clientPrimitivePatterns = [
  /\bTask\b|AskQuestion|subagent_type|run_in_background|~\/\.cursor|\.cursor\/|agent-transcripts|cursor-team-kit|\/loop|Cursor(?:'s)? built-in/,
  /\b(?:cursor-grok|gpt|gemini|glm|composer)-[a-z0-9][a-z0-9.-]*\b/,
  /\bclaude-(?:fable|opus|sonnet|\d)[a-z0-9.-]*\b|\bkimi-k[a-z0-9.-]*\b/,
  /\bupdate_state\b|\bSendToUser\b|api2\.cursor\.sh/,
];
const cursorOnlySkillPattern = /\bupdate_state\b|\bSendToUser\b|api2\.cursor\.sh/;
const directModelConfigPath = /~\/\.cursor\/rules\/pstack-models\.mdc|\$CODEX_HOME\/pstack\/models\.md|\$CLAUDE_CONFIG_DIR\/pstack\/models\.md/;
for (const directory of skillDirectories) {
  const skillPath = resolve(skillsRoot, directory.name, "SKILL.md");
  if (!existsSync(skillPath)) continue;
  const text = readText(skillPath);
  const relatedPaths = markdownFiles(resolve(skillsRoot, directory.name));
  const relatedText = relatedPaths.map(readText).join("\n");
  const nonAdapterText = relatedPaths.filter((path) => path !== adapterPath).map(readText).join("\n");
  const metadata = frontmatter(skillPath);
  const isCursorOnly = metadata.compatibility?.startsWith("Cursor only.");
  if (clientPrimitivePatterns.some((pattern) => pattern.test(relatedText))) {
    assert(text.includes("platform-adapters.md") || isCursorOnly, `skills/${directory.name}/SKILL.md uses a client primitive without an adapter or Cursor-only boundary`);
  }
  if (cursorOnlySkillPattern.test(relatedText)) {
    assert(isCursorOnly, `skills/${directory.name}/SKILL.md uses Cursor-only primitives without compatibility metadata`);
    const sections = [...text.matchAll(/^##\s+(.+)$/gm)];
    assert(sections[0]?.[1] === "Check client support", `skills/${directory.name}/SKILL.md must check client support before other steps`);
    const supportEnd = sections[1]?.index ?? text.length;
    const supportText = text.slice(sections[0]?.index ?? 0, supportEnd);
    assert(/\bstop\b/i.test(supportText) && /\bcredential\b/i.test(supportText), `skills/${directory.name}/SKILL.md must stop before credential requests on unsupported clients`);
  }
  assert(!directModelConfigPath.test(nonAdapterText), `skills/${directory.name}/SKILL.md names a client model-config path instead of using the platform adapter`);
}

const setupText = readText(resolve(skillsRoot, "setup-pstack/SKILL.md"));
assert(setupText.includes("Default to that client's user scope"), "setup-pstack must default to client-specific user scope");
assert(setupText.includes("Never write another"), "setup-pstack must forbid cross-client configuration writes");

const staleCursorModel = "grok-4.6-fast-xhigh";
const sharedModelConfigPath = ".pstack/models.md";
for (const markdownPath of markdownFiles(pstackRoot)) {
  const text = readText(markdownPath);
  assert(!text.includes(staleCursorModel), `${relative(repositoryRoot, markdownPath)} uses the stale Cursor model ${staleCursorModel}`);
  assert(!text.includes(sharedModelConfigPath), `${relative(repositoryRoot, markdownPath)} uses the shared cross-client model path ${sharedModelConfigPath}`);
}
const checkPlanPath = resolve(skillsRoot, "poteto-mode/scripts/check-plan.mjs");
assert(!readText(checkPlanPath).includes(staleCursorModel), `${relative(repositoryRoot, checkPlanPath)} uses the stale Cursor model ${staleCursorModel}`);

const whyText = readText(resolve(skillsRoot, "why/SKILL.md"));
assert(whyText.includes("active host's exposed MCP and tool inventory"), "why must discover MCP tools from the active host");

const workflowText = readText(resolve(repositoryRoot, ".github/workflows/validate-plugins.yml"));
for (const required of [
  '".agents/plugins/marketplace.json"',
  '".claude-plugin/marketplace.json"',
  '".github/workflows/validate-plugins.yml"',
  '"pstack/**"',
  "node-version: 20",
  "node scripts/validate-plugins.mjs",
  "node pstack/scripts/validate-cross-client.mjs",
]) {
  assert(workflowText.includes(required), `validate-plugins workflow is missing ${required}`);
}

for (const name of ["comment-sicko", "poteto-agent"]) {
  const agentPath = resolve(pstackRoot, `agents/${name}.md`);
  assert(existsSync(agentPath), `agents/${name}.md is missing`);
  if (existsSync(agentPath)) {
    const metadata = frontmatter(agentPath);
    assert(metadata.name === name, `agents/${name}.md name must match its filename`);
    assert(!("is_background" in metadata) && !("background" in metadata), `agents/${name}.md must leave background scheduling to the active client`);
  }
  assert(adapterText.includes(`${name}.md`), `platform adapter must name agents/${name}.md as a source of truth`);
}

for (const [client, manifest] of Object.entries({ codex: manifests.codex, claude: manifests.claude })) {
  assert(!JSON.stringify(manifest).toLowerCase().includes("benny"), `${client} manifest must not register Benny`);
}

let checkedLinks = 0;
for (const markdownPath of markdownFiles(pstackRoot)) {
  const text = readText(markdownPath);
  assert(!/subagent_type:\s*["'`]Comment Sicko["'`]/.test(text), `${relative(repositoryRoot, markdownPath)} uses the stale Comment Sicko identifier`);
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
  process.stdout.write(`Validated 3 manifests, 3 marketplaces, ${skillDirectories.length} skills, and ${checkedLinks} local Markdown links.\n`);
}
