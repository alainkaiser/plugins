# Platform adapters

pstack keeps one shared `skills/` tree. Some upstream instructions still use
Cursor names because Cursor is the original runtime. Before executing a named
tool, path, model, built-in, or agent, identify the active client and apply the
matching row below. The client mapping overrides the literal mechanism, not the
workflow's intent.

Never invent a tool, model slug, transcript path, or background capability. If
the active client has no equivalent, use the documented fallback and report the
reduced behavior.

## Runtime mapping

| Intent | Cursor | Codex | Claude Code | Agent Plugins 1.0 floor |
| --- | --- | --- | --- | --- |
| Invoke a shared skill | Slash skill such as `/how` | Mention the installed skill, commonly `$how`, or use the client skill picker | Namespaced slash skill such as `/pstack:how` | Client discovers `skills/<name>/SKILL.md`; invocation UX is not standardized |
| Track a multi-step plan | Cursor todo list | `update_plan` when available; otherwise keep a concise checklist | Todo tool when available; otherwise keep a concise checklist | No standard primitive |
| Spawn a subagent | `Task` | `spawn_agent` or the active Codex subagent facility | `Agent`; `Task` remains an accepted alias | No standard primitive; run sequentially |
| Run several subagents | One call containing parallel `Task` launches | Issue independent `spawn_agent` calls before waiting | Issue independent `Agent` calls before waiting | No standard primitive; run sequentially and disclose the downgrade |
| Use a custom agent | `subagent_type` from `agents/` | Spawn a general worker and tell it to read the matching portable skill first | Load the native agent wrapper from `agents/`, or tell a general worker to read the matching portable skill | Custom agents are unsupported; use the portable skill |
| Run in the background | `run_in_background: true` | Spawned subagents already run independently; keep working before `wait_agent` | Use the client background-agent option when available | Unsupported |
| Ask a structured question | `AskQuestion` | `request_user_input` when exposed; otherwise ask one concise plain-text question | `AskUserQuestion` | Ask in plain text |
| Select a model | Use a slug confirmed by Cursor | Use a model and reasoning effort confirmed by the active Codex host | Use a model confirmed by Claude Code | Model selection is not standardized; inherit the parent |
| Read the active transcript | Use the transcript path supplied by the Cursor session; the workspace-scoped Cursor fallback is documented below | Use current-task or thread-history facilities exposed by the host; do not guess a private JSONL layout | Use current-session or resume history exposed by Claude Code; use a raw path only when the session supplies it | Unsupported; use conversation context or a user-provided export |
| Repeat or wake work | Cursor `/loop` | Use a Codex monitor, scheduled task, or heartbeat when that surface exposes one; otherwise use a bounded foreground check | Claude Code `/loop` or scheduled-task tools | Unsupported |
| Author a skill | Cursor's `create-skill` built-in | Codex `skill-creator` | Claude Code's current skill-development guidance | Follow the Agent Skills specification |
| Drive a UI or CLI | Use `control-ui` or `control-cli` when `cursor-team-kit` is installed | Use the active browser, computer, shell, or project verification skill | Use the active browser, shell, or project verification skill | No standard control surface |
| Install hooks | Cursor-native hooks or automations | Codex-native plugin hooks, subject to trust review | Claude-native plugin hooks | Hooks are not portable |

## Project skill paths

Resolve project and personal skill destinations for the active client. Do not
write into another client's configuration directory just because an upstream
instruction names it.

| Scope | Cursor | Codex | Claude Code | Agent Plugins 1.0 floor |
| --- | --- | --- | --- | --- |
| Project skills | `.cursor/skills/` | `.agents/skills/` | `.claude/skills/` | `skills/` inside the plugin |
| Personal skills | `~/.cursor/skills/` | `~/.agents/skills/` | `~/.claude/skills/` | Not standardized |

When a repository already has a documented compatible skill root, preserve its
local convention. Keep every generated skill self-contained under one root.

## Portable custom-agent behavior

The portable [poteto-agent skill](../../poteto-agent/SKILL.md) and
[comment-sicko skill](../../comment-sicko/SKILL.md) are the sources of truth.
Cursor and Claude Code can load the thin wrappers under `agents/`. Codex does
not depend on those wrappers. Resolve the installed skill path, give that path
to a general subagent, and tell the subagent to read it in full before doing the
delegated task.

`generalPurpose`, `readonly`, `environment`, `cloud_base_branch`, and
`run_in_background` are client options, not portable arguments. Preserve the
requested isolation and permissions with the active client's controls. If a
client cannot provide the requested isolation, do not claim that it did.

## Configuration and models

The cross-client model override is `.pstack/models.md` at the target
repository root. It uses the role lines emitted by `setup-pstack`. Every skill
that selects a model reads this file before using its inline default.

On Cursor, `~/.cursor/rules/pstack-models.mdc` remains a legacy fallback for
existing installations. The repository-local `.pstack/models.md` takes
precedence when both exist. Codex and Claude Code do not read the Cursor rule.

Inline model slugs in upstream skills are Cursor defaults. On another client,
use one only when the active host confirms that exact slug. Otherwise omit the
model so the subagent inherits the parent. `inherit-parent` and `auto` always
mean to omit the explicit model argument. Model diversity is best effort; name
any reduced diversity in the result.

## Transcript boundary

Read only the current workspace and current task or session. Never scan every
project under a user's client directory.

- Cursor can use a session-supplied transcript path. Its legacy fallback is
  `~/.cursor/projects/<workspace-slug>/agent-transcripts/`, scoped to the
  active workspace.
- Codex uses task or thread history exposed by the active surface. The raw
  files under the Codex data directory are not a stable plugin contract, so do
  not search them broadly or build a path by guesswork.
- Claude Code uses current-session or resumed-session history exposed by the
  client. Use a raw transcript path only when Claude Code supplies it for that
  session.

If the current transcript is unavailable, continue from conversation state and
live repository evidence. A workflow that specifically requires older raw
messages is blocked until the user supplies an export or the client exposes a
scoped history facility.

## Client-only extensions

The sticky-mode fields on `poteto-mode`, Cursor's native custom-agent metadata,
`cursor-team-kit`, Cursor cloud-agent options, and the Benny automation are
extensions. They are not part of the Agent Plugins portable floor.

Benny stays under `automations/benny/` and is not declared by the Agent
Plugins, Codex, or Claude manifests. It depends on Cursor automations, Cursor
project settings, and Cursor's Slack-triggered workflow. Do not silently map it
to hooks or scheduled tasks on another client.

No Codex or Claude hooks ship in pstack. A future native hook must be a named,
reviewable extension with its own trust and lifecycle documentation. It must
not become a second skills tree.
