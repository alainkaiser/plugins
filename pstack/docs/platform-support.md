# Platform support

pstack uses one shared `skills/` tree. Manifests and adapters describe how each
client discovers and runs those skills. They do not create independent ports.

## Compatibility matrix

| Capability | Cursor | Codex | Claude Code | Agent Plugins 1.0 floor |
| --- | --- | --- | --- | --- |
| Package identity | `.cursor-plugin/plugin.json` | `.codex-plugin/plugin.json` | `.claude-plugin/plugin.json` | Root `plugin.json` |
| Shared skills | Native | Native | Native | `skills/<name>/SKILL.md` |
| Native `agents/` | Supported | Not loaded | Supported | Not standardized |
| Portable custom-agent behavior | Native `agents/` definitions | General subagent reads `agents/<name>.md` in full first | Native `agents/` definitions | General subagent reads `agents/<name>.md` in full first |
| Structured questions | `AskQuestion` | `request_user_input` when exposed, otherwise plain text | `AskUserQuestion` | Plain text |
| Parallel subagents | `Task` | Codex subagent facility | `Agent` | Not standardized; run sequentially |
| Model selection | Cursor-confirmed slug | Host-confirmed model and reasoning effort | Claude-confirmed model | Inherit parent |
| Project model configuration | `~/.cursor/rules/pstack-models.mdc` (upstream) | `.pstack/models.md` at the repository root | `.pstack/models.md` at the repository root | Not standardized |
| Transcript access | Session path or workspace-scoped Cursor transcript | Current task or thread history exposed by the host | Current or resumed session history | Conversation context or user export |
| Repeat or wake | `/loop` | Monitor, scheduled task, or heartbeat when exposed | `/loop` or scheduled-task tools | Not standardized |
| Hooks shipped by pstack | None | None | None | Not standardized |
| Benny automation | Cursor-only extension | Excluded | Excluded | Excluded |
| `cursor-team-kit` | Optional companion plugin | Use installed Codex verification and authoring facilities | Use installed Claude verification and authoring facilities | No equivalent |

The exact runtime substitutions live in the [platform
adapter](../skills/poteto-mode/references/platform-adapters.md). An active-client
mapping changes the mechanism, not the workflow's intent.

## Package layout

```text
plugins/
  .cursor-plugin/marketplace.json
  .agents/plugins/marketplace.json
  .claude-plugin/marketplace.json
  pstack/
    plugin.json
    .cursor-plugin/plugin.json
    .codex-plugin/plugin.json
    .claude-plugin/plugin.json
    skills/
    agents/
    automations/benny/
    scripts/
```

Only `pstack/skills/` is registered as the shared skill tree. The two files in
`pstack/agents/` are the upstream custom-agent definitions; Cursor and Claude
Code load them natively, and Codex has a general subagent read them via the
platform adapter. Benny has private automation skills under its own directory,
but no portable or non-Cursor manifest declares them.

The root `plugin.json` follows the [Agent Plugins 1.0
specification](https://agent-plugins.org/specification). That specification is
a packaging interoperability floor. It is not a marketplace or publication
service, and it does not standardize agents, model choice, transcripts, hooks,
or invocation syntax.

## Self-hosted installation

Replace `/absolute/path/to/plugins` with this repository's absolute path.

### Codex

```bash
codex plugin marketplace add /absolute/path/to/plugins
codex plugin add pstack@cursor-plugins
```

The repository marketplace is declared at `.agents/plugins/marketplace.json`.
Restart the client if it asks you to refresh plugin discovery.

### Claude Code

Load the plugin for one development session:

```bash
claude --plugin-dir /absolute/path/to/plugins/pstack
```

Or register this checkout as a local marketplace and install pstack:

```bash
claude plugin marketplace add /absolute/path/to/plugins --scope local
claude plugin install pstack@cursor-plugins --scope local
```

### Cursor

The public Cursor marketplace install remains `/add-plugin pstack`. For a local
development checkout, place or symlink `pstack/` at
`~/.cursor/plugins/local/pstack`, then reload Cursor. This is a user action; the
repository does not write client configuration during validation.

## Validate the package

Run the dependency-free repository check from the repository root:

```bash
node pstack/scripts/validate-cross-client.mjs
```

When Claude Code is installed, also run its native strict checks:

```bash
claude plugin validate pstack --strict
claude plugin validate .claude-plugin/marketplace.json --strict
```

The repository check parses every manifest and marketplace, verifies shared
metadata and attribution, checks skill discovery and frontmatter, resolves
local Markdown links, rejects copied manifest-local skill trees, and requires
an adapter contract wherever a discoverable skill still names a client-only
primitive.

## Publication is client-owned

- Cursor reviews marketplace submissions through
  [cursor.com/marketplace/publish](https://cursor.com/marketplace/publish).
- OpenAI accepts one public submission to the universal Plugins Directory
  shared by ChatGPT and Codex. A local or workspace publication is not a public
  directory submission. See the [OpenAI plugin packaging and publication
  guide](https://developers.openai.com/plugins/build/plugins).
- Anthropic's community marketplace submission is separate from OpenAI and
  from Anthropic's curated official marketplace. Validate first with
  `claude plugin validate`. See [Claude Code plugin
  submission](https://code.claude.com/docs/en/plugins#submit-your-plugin-to-the-community-marketplace).
- Agent Plugins 1.0 defines a package format only. There is no Agent Plugins
  directory to submit to.

This repository does not submit, publish, install, or update a marketplace as
part of its validation scripts.

## Client-only boundaries

Cursor sticky-mode metadata, `Task` options such as `subagent_type`, Cursor
cloud-agent settings, `cursor-team-kit`, `/loop`, and Benny are extensions.
The shared adapter maps only behavior that another client can support without
pretending its guarantees are identical.

The cloud-dependent lanes in Shipping, Orchestrate, Autopilot Full, Autopilot
Stack, and Multi-phase Plan retain Cursor's native wording. Another client may
run those lanes only when it can provide equivalent isolation, wake, review,
and live-control facilities. Otherwise it must skip or stop the unsupported
lane with a clear downgrade instead of claiming the Cursor guarantee.

No transcript adapter guesses a private on-disk layout. It reads only history
scoped and exposed by the active client. No model adapter reuses a provider
slug until the active host confirms it. Unsupported parallelism runs
sequentially and must be disclosed.

No cross-client hooks ship. Hooks have client-specific trust, lifecycle, and
configuration contracts. A future hook should be a named native extension,
not a hidden translation or a second skills tree.

## Prior art and collaboration

[`michael-denyer/pstack-claude`](https://github.com/michael-denyer/pstack-claude)
is active strong prior art. At the audited commits it was synced to upstream
pstack v0.14.2 while upstream was v0.14.3, so it was one patch behind rather
than materially stale. It preserves Lauren Tan's MIT license and documents
additional attributions for imported material.

Its shared-tree layout, mapping references, explicit exclusions, and native
Claude packaging are useful evidence. Its extra hooks, commands, imported
`cursor-team-kit` skills, and v0.14.2 edits are not copied wholesale here.
Every adaptation in this package is checked against current upstream and the
current client contract.

Collaboration is cheaper than maintaining two editorial ports. The preferred
direction is one upstream-owned pstack skill tree, with the existing port used
as a compatibility testbed or downstream distribution layer if its maintainer
agrees.

## Recommended repository split

The smallest useful upstream PR to `cursor/plugins/pstack` is the portability
core: the strict root Agent Plugins manifest, thin native package manifests,
one adapter reference, the one-line adapter pointer in the skills that name
client primitives, focused docs, and the dependency-free validator. Benny
remains a named Cursor extension in that PR.

Repository-level Codex and Claude marketplace catalogs, publication workflow,
release synchronization, and any future client-native hooks or command
trampolines should remain in this cross-client fork unless the
`cursor/plugins` maintainers explicitly want to operate those distribution
surfaces for the whole monorepo. That split gives upstream one maintainable
skills source without imposing cross-client marketplace policy on Cursor's
repository.
