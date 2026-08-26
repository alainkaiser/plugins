# Cross-client packaging research

Retrieved 2026-08-26. This note records current source-backed facts for the
cross-client pstack design. URLs are intentionally included so a later sync
can re-check any fact that may drift. It is a dated research snapshot; the
implemented design is documented in [platform support](./platform-support.md)
and may differ from recommendations below.

## Executive findings

The portable floor is intentionally small. Agent Plugins 1.0 standardizes a
root `plugin.json`, skills under `skills/<name>/SKILL.md`, and optional MCP
configuration in `mcp.json`. It does not standardize agents, commands, hooks,
model selection, transcript access, slash-command UX, or marketplaces. Those
belong in client extension namespaces or native packaging. Source:
[Agent Plugins specification, sections 4-6](https://agent-plugins.org/specification#4-plugin-package-model).

Codex and Claude Code both support self-hosted local packaging, but their
native manifests and marketplace catalogs are different. A shared skill tree
can be the source of truth, with thin `.codex-plugin` and `.claude-plugin`
metadata around it. Treating `agent-plugins.org` as a distribution directory
would be incorrect. The specification defines package interoperability and
client conformance, while each client owns discovery and publication.

The live `michael-denyer/pstack-claude` repository is useful prior art, not a
drop-in source. At retrieval it was commit `7d61024074900899bd39db03de5612433cc59603`
on `main`. Its README records that its skill tree was synced from upstream
commit `4612556` at pstack v0.14.2. This checkout is upstream
`cursor/plugins` commit `bdf7aa355337897f167153e05069aca505dae17c`, identified
by the task as v0.14.3. The port is therefore one upstream patch behind, not
materially stale. Source: [port repository](https://github.com/michael-denyer/pstack-claude/tree/7d61024074900899bd39db03de5612433cc59603),
[port README sync marker](https://github.com/michael-denyer/pstack-claude/blob/7d61024074900899bd39db03de5612433cc59603/README.md),
[upstream pstack](https://github.com/cursor/plugins/tree/bdf7aa355337897f167153e05069aca505dae17c/pstack).

## Agent Plugins 1.0 floor

Verified requirements:

- A plugin is one directory with a required root `plugin.json`.
- The manifest schema is closed. Portable top-level fields are `$schema`,
  `name`, `version`, `description`, `author`, `homepage`, `repository`,
  `license`, `keywords`, and `extensions`.
- `$schema` must be
  `https://agent-plugins.org/schemas/1.0.0/plugin.schema.json`; `name` is
  lowercase alphanumeric/hyphen/period with no repeated separators.
- Plugin-relative paths begin with `./` and must remain inside the plugin
  root. This is a package containment rule, not a sandbox for subprocesses.
- Fixed component discovery is `skills/` for skills and `mcp.json` for MCP
  servers. Missing component locations are valid. `plugin.json` cannot replace
  those locations or carry inline component configuration.
- Client-specific data belongs under `extensions` and client-owned extension
  directories. A conformant client must reject an unsupported declared spec
  version.

Sources: [package model and standard layout](https://agent-plugins.org/specification#4-plugin-package-model),
[manifest rules](https://agent-plugins.org/specification#5-manifest),
[component discovery](https://agent-plugins.org/specification#6-component-discovery),
[client extensions](https://agent-plugins.org/specification#8-client-extensions).

Inference for pstack: keep the shared tree portable at `skills/`, use the
standard root manifest only for portable metadata, and put client mappings and
native surfaces outside the portable contract. Do not put Codex or Claude
fields such as `skills`, `interface`, `agents`, or `hooks` in the strict root
Agent Plugins manifest unless they are inside a client extension.

## Client packaging and distribution

| Client | Native plugin shape | Local/self-hosted path | Official publication path |
| --- | --- | --- | --- |
| Cursor | Agent Plugins use root `plugin.json`; Cursor Plugins use `.cursor-plugin/plugin.json` and can add rules, agents, commands, hooks, and variables. | Development plugins can be placed or symlinked under `~/.cursor/plugins/local/<name>`, then reload Cursor. | Submit for review at [cursor.com/marketplace/publish](https://cursor.com/marketplace/publish). |
| Codex / ChatGPT | Native manifest is `.codex-plugin/plugin.json`; package may include `skills/`, `.app.json`, `.mcp.json`, assets, and hooks. | Repo marketplace at `$REPO_ROOT/.agents/plugins/marketplace.json`, or personal marketplace at `~/.agents/plugins/marketplace.json`; add a local entry and restart the ChatGPT desktop app. CLI can register a marketplace with `codex plugin marketplace add ./local-marketplace-root`. | Public plugins are submitted once to the universal Plugins Directory shared by ChatGPT and Codex. Workspace publishing is separate and private to that workspace. |
| Claude Code | Native manifest is `.claude-plugin/plugin.json`; components live at plugin root (`skills/`, `agents/`, `hooks/`, `.mcp.json`, etc.). Marketplace catalog is `.claude-plugin/marketplace.json`. | For development, `claude --plugin-dir ./pstack`. For a local marketplace, add it with `/plugin marketplace add ./marketplace` and install with `/plugin install pstack@marketplace`. | Third-party submissions go through the Claude community-marketplace forms at [claude.ai](https://claude.ai/admin-settings/directory/submissions/plugins/new) or [Console](https://platform.claude.com/plugins/submit), after `claude plugin validate`. The Anthropic official marketplace is separately curated and has no application process. |

### Codex details

OpenAI’s current packaging guide says every Codex plugin has
`.codex-plugin/plugin.json`. It explicitly distinguishes the universal public
directory from local/repo marketplaces. The documented repo layout is
`$REPO_ROOT/.agents/plugins/marketplace.json` plus plugins under the repo; the
personal layout is `~/.agents/plugins/marketplace.json` plus plugin files under
`~/.codex/plugins/`. Marketplace entries use a `./`-prefixed local path and
installation/authentication policy. Sources: [package guide](https://developers.openai.com/plugins/build/plugins#package-your-plugin),
[local marketplace and install](https://developers.openai.com/plugins/build/plugins#install-a-local-plugin-manually),
[marketplace CLI](https://developers.openai.com/plugins/build/plugins#add-a-marketplace-from-the-cli).

OpenAI’s public submission model is one universal directory shared by ChatGPT
and Codex. Publishing to a workspace from the local Plugins Directory is not
public publication. Source: [public versus workspace publication](https://developers.openai.com/plugins/build/plugins#publish-a-local-plugin-to-your-workspace).

### Claude Code details

Anthropic’s plugin guide requires only `.claude-plugin/plugin.json` for plugin
identity; skills and other components stay at the plugin root. `--plugin-dir`
loads a local directory for development and `/reload-plugins` reloads edits.
Source: [create plugins](https://code.claude.com/docs/en/plugins#create-plugins).

Claude marketplace catalogs require `name`, `owner`, and `plugins`; each entry
requires `name` and `source`. Relative sources begin with `./` and resolve from
the repository root containing `.claude-plugin/marketplace.json`. Source:
[marketplace schema and local walkthrough](https://code.claude.com/docs/en/plugin-marketplaces#create-and-distribute-a-plugin-marketplace).

Anthropic’s community submission flow is distinct from its official curated
marketplace. The official marketplace is maintained by Anthropic. Community
submissions use the claude.ai or Console forms, run the same validation and
safety pipeline, and are pinned to a commit in
`anthropics/claude-plugins-community`. Source: [submission procedure](https://code.claude.com/docs/en/plugins#submit-your-plugin-to-the-community-marketplace).

## Cursor packaging relevant to pstack

Cursor currently supports both formats. A root Agent Plugins `plugin.json`
loads without changes and is limited to portable skills/MCP. A Cursor Plugin
`.cursor-plugin/plugin.json` can additionally expose rules, agents, commands,
hooks, and variables. Cursor’s marketplace distributes Git repositories and
manually reviews official listings. Local development accepts either format
under `~/.cursor/plugins/local`, including a symlink. Sources: [Cursor plugin overview and local testing](https://prod.cursor.com/docs/plugins),
[manifest and component reference](https://prod.cursor.com/docs/reference/plugins).

This matters for upstream pstack because the current tree is a Cursor Plugin,
not only an Agent Plugins package. The checkout contains
`pstack/.cursor-plugin/plugin.json`, Cursor-native `agents/`, and Cursor-only
automation/docs surfaces. The README also documents Cursor’s `/loop` and
`cursor-team-kit` companion plugin. These are client features, not part of the
portable Agent Plugins floor.

## Live third-party port versus upstream

### License and attribution

The third-party port preserves the upstream MIT license verbatim with
copyright `Lauren Tan`, and adds `LICENSE-cursor-team-kit`,
`LICENSE-superpowers`, and `NOTICE.md` for imported or adapted material. This
is a positive attribution pattern to retain if any prior art informs a new
implementation. Sources: [port LICENSE](https://github.com/michael-denyer/pstack-claude/blob/7d61024074900899bd39db03de5612433cc59603/LICENSE),
[port NOTICE](https://github.com/michael-denyer/pstack-claude/blob/7d61024074900899bd39db03de5612433cc59603/NOTICE.md).

### Concrete deltas observed

The port is an editorial adapter and packaging repository, not a mechanical
copy:

- It adds `.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json`,
  `.codex-plugin/plugin.json`, Codex marketplace metadata, Claude commands,
  Claude agents, and a Claude `SessionStart` hook while retaining one shared
  `skills/` tree.
- It replaces Cursor `Task` with Claude `Agent`, `AskQuestion` with
  `AskUserQuestion`, Cursor built-ins with Claude equivalents, and maps model
  slugs through `skills/poteto-mode/references/codex-tools.md` for Codex.
- It removes or excludes Cursor-only surfaces from the port, notably
  `automations/benny/` and the Cursor-oriented `docs/guide/`; its README
  explains that Benny depends on Cursor event-triggered automation and that
  the guide teaches Cursor UI/sticky mode/cloud agents.
- It supplies a Claude-native `babysit` skill, command trampolines, hook
  runner, vendored pstack tooling, and several imported `cursor-team-kit`
  skills. Those additions are not upstream pstack content.
- It removes Cursor sticky-mode frontmatter and `is_background` agent
  frontmatter where Claude has no equivalent, and it documents that Claude and
  Codex model configuration is separate from upstream Cursor defaults.

Evidence: [port layout and adaptation notes](https://github.com/michael-denyer/pstack-claude/blob/7d61024074900899bd39db03de5612433cc59603/README.md),
[port’s per-skill change log](https://github.com/michael-denyer/pstack-claude/blob/7d61024074900899bd39db03de5612433cc59603/CHANGES.md),
[upstream Cursor tree at the requested live commit](https://github.com/cursor/plugins/tree/bdf7aa355337897f167153e05069aca505dae17c/pstack).

The port README is explicit that its latest upstream sync is `4612556`
(v0.14.2), while the requested upstream checkout is `bdf7aa3` (v0.14.3).
The audited upstream patch changes four pstack paths: the manifest version,
the Multi-phase Plan playbook, deletion of its old `references/plan.md`, and a
new `scripts/check-plan.mjs` validator. Source: [upstream commit
diff](https://github.com/cursor/plugins/commit/bdf7aa355337897f167153e05069aca505dae17c).
That patch must be applied before comparing or collaborating on the port's
v0.14.2 adaptations. Do not copy the port's edits wholesale. First check each
adaptation against upstream content, its MIT attribution, and the target
client's current manifest rules.

## Recommendation for the parent implementation

Collaboration and upstreaming beat another editorial rebuild. This checkout is
a fork of `cursor/plugins` at current pstack v0.14.3, so the implementation can
keep the upstream `skills/` tree authoritative instead of syncing a copied
snapshot. Use the third-party repository as strong design evidence and a
possible compatibility testbed. Coordinate with its maintainer before
duplicating its release and Claude-distribution work.

The smallest useful upstream PR is one cohesive portability core inside
`cursor/plugins/pstack`: the strict Agent Plugins manifest, thin native package
manifests, one adapter reference, native custom-agent definitions with an
adapter-directed fallback, client-specific model configuration, focused
documentation, and a dependency-free validator. Benny stays a named Cursor
extension and is not translated.

Repository-level Codex and Claude marketplace catalogs, publication workflow,
release synchronization, and future client-native hooks or command trampolines
should stay in this cross-client fork unless the `cursor/plugins` maintainers
explicitly choose to own those distribution surfaces for the full monorepo.
This keeps package portability upstream while leaving marketplace policy and
client-specific release work with the cross-client maintainers.

## Runtime checks

Source and manifest facts above were verified against the live repositories and
official docs on 2026-08-26. The same checkout was checked with these installed
clients:

- Claude Code 2.1.246 passed strict validation for both the pstack plugin and
  the repository marketplace.
- Codex CLI 0.149.1 registered the repository marketplace and installed pstack
  end to end under an isolated `CODEX_HOME`. The installed package contained all
  44 shared skills and both native agent definitions. This CLI exposes no
  standalone package-validation command.
- Cursor 3.17.21 was available, but exposes no headless plugin validator.
- `node pstack/scripts/validate-cross-client.mjs` validated four manifests,
  three marketplaces, 44 shared skills, and 247 local Markdown links without
  third-party dependencies.

The repository's existing Ajv validator was unavailable because dependencies
were not installed in this checkout. The Codex plugin-creator validator was
also unavailable because its Python runtime lacked PyYAML. Neither missing
dependency was installed as part of this work.
