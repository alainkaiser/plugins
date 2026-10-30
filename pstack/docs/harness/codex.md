# pstack in Codex

pstack skills use Cursor names. In Codex, read this file once per session, then apply these mappings wherever a skill or its references use those names. `<pstack>` is the installed folder containing `skills/` and `docs/`. Use the tools and argument schemas exposed in the current session; desktop, CLI, and older clients can differ.

## Tools and invocation

| Cursor | Codex |
| --- | --- |
| `Task` | The available `spawn_agent` tool. It may be in a `collaboration` namespace. |
| `AskQuestion` | Use the available structured question tool. `request_user_input_async` allows independent work while the answer is pending; `request_user_input` may be restricted to Plan mode. Otherwise ask in your reply. |
| Open a todolist | Use `update_plan` when exposed. Otherwise keep the playbook checklist in the conversation and update it at each phase. A goal is not a todo list. |
| Run another pstack skill (`/name` or "the **name** skill") | Read `<pstack>/skills/<name>/SKILL.md` directly and follow it. Most pstack skills intentionally stay out of implicit discovery. When addressing the user, tell them to select the installed pstack skill in the composer or invoke it with `$pstack:name`, not a Cursor slash command. |
| `Read`, `Grep`, `Glob`, `Bash` | The session's file and shell tools; use `rg` for searches. |
| `create-skill`, `deslop`, `control-cli`, `control-ui` | Use the corresponding installed skill or native tool when available. The Cursor team kit is not bundled. Run CLI checks through the shell, drive UI with the exposed browser/computer tools, and perform code cleanup directly when there is no matching skill. Report any required live check that cannot run. |

The package generates `agents/openai.yaml` from each skill's `disable-model-invocation` flag. Explicit selection loads the skill; reading a sibling skill by its packaged path works even when it is absent from the automatic catalog. Installing pstack does not turn on a persistent mode. Invoke `poteto-mode` for each new task.

When creating or updating a skill, including `automate-me`'s `<handle>-mode`, translate its invocation policy too. In that skill's `agents/openai.yaml`, set `policy.allow_implicit_invocation` to the inverse of `disable-model-invocation`; preserve other existing fields. Frontmatter alone does not express Codex's documented invocation policy. For an explicit-only mode, write:

```yaml
policy:
  allow_implicit_invocation: false
```

## Subagents

| Cursor | Codex |
| --- | --- |
| `subagent_type: generalPurpose` | Use the default general-purpose agent. Omit Cursor's `subagent_type`. |
| `poteto-agent` | Spawn a delegate whose brief includes the absolute paths to this adapter and `<pstack>/skills/poteto-mode/SKILL.md`, and tells it to read both before working. These plugin Markdown files do not register a Codex agent type. |
| `comment-sicko` | Spawn a reviewer with the scoped diff and the absolute paths to this adapter and `<pstack>/agents/comment-sicko.md`. |
| `readonly: true` | Give a read-only brief and verify the working tree afterward. A brief does not change permissions; retain the session's sandbox and approval controls. |
| `readonly: false` | Use the normal delegate with the parent's permissions. |
| `environment: "cloud"`, `environment: "local"` | Codex delegates share the filesystem. Give concurrent writers separate worktrees or disjoint output directories. Omit the Cursor fields. |
| `cloud_base_branch` | Put the exact starting branch or commit and the worktree path in the delegate's brief. |
| `run_in_background: true` | Omit. Spawned agents already run alongside the parent. |
| `resume` | Use `followup_task` or `resume_agent` when offered; preserve the skill's restrictions on reusing a delegate. |
| `file_attachments` | Put absolute file paths in the brief. |

Use the returned agent identifier with the session's send, wait, and follow-up tools. `wait_agent` can report mailbox updates rather than return the answer itself; read the delivered messages. A timeout is not completion. Use `close_agent` only when it exists. After a capacity error, wait for existing work; do not retry with a different model. On hosts without a close tool, completion does not necessarily free a slot.

When selecting another model or effort requires a fresh context, use the spawn tool's fresh-context option (`fork_turns: "none"` on hosts that expose it) and supply the task, paths, and relevant constraints explicitly. Full-history forks may inherit model and effort and reject overrides.

Current Codex releases enable subagents by default; local clients can disable them with `agents.enabled = false`. If no spawn tool is available, report that limitation. Independent tasks can run sequentially, but a required independent review remains unverified until another agent or reviewer performs it. Do not count the parent's own second pass as independent review.

## Models and effort

| Cursor | Codex |
| --- | --- |
| `pstack-models.mdc`, `~/.cursor/rules/pstack-models.mdc` | Read `$CODEX_HOME/pstack-models.md` (default `~/.codex/pstack-models.md`) when a skill selects models. Codex does not automatically load this file. |
| An unconfigured `claude-*`, `grok-*`, or `gpt-*` default | Inherit the parent. A Cursor model slug is not evidence that Codex can run it. |
| `auto` or `inherit-parent` | Omit model and effort overrides. Each panel entry still represents one independent agent. |
| A configured Codex model | Pass it only if the current spawn tool and available model inventory support it. |
| `<model>@<effort>` | Pass the model and supported `reasoning_effort` separately. |

Keep role names identical to `setup-pstack`. Preserve an existing bare model's session effort when the host exposes that effort and accepts it; otherwise explain that the host chooses the effort. An optional `default effort` row applies to real model entries without an `@effort` suffix; `session` means the parent's effort. Do not translate a configured Codex model to a Claude or Grok fallback. If it is rejected, report the rejection and use a confirmed available model only under the workflow's fallback rule; otherwise inherit the parent and disclose the substitution.

Repeated models still provide independent reviewers, but not model diversity. GPT models belong to the same family for Arena's cross-judge rule. When no different-family model is available, follow Arena's documented skip path and report the missing cross-judge. Do not launch another provider's CLI merely to manufacture diversity; that needs separate access and authorization.

### setup-pstack

Follow the skill's steps with these substitutions:

- **Detect:** inventory the models and effort levels the current spawn tool accepts. If no reliable inventory is exposed, offer `inherit-parent` and `auto`; ask for model choices only when needed. Do not persist guessed slugs.
- **Load:** read the Codex sheet above, not a Cursor rule. Use its existing role values and budget as the starting point. Preserve its `default effort` setting when present.
- **Defaults:** map each unconfigured role to `inherit-parent`. Keep the number of entries in default panels. Explain that inherited entries follow the session's model and effort, so changing the budget does not override those entries.
- **Budget and confirm:** show every role, model, effort, and panel size before writing. For a real model, store `<model>@<effort>` when an effort is chosen. Offer only supported levels and keep an inheritance choice for effort.
- **Write:** write the confirmed rows and budget to the Codex sheet, with no Cursor frontmatter. Change only that file. Do not put model preferences in `AGENTS.md`, `CLAUDE.md`, or `config.toml`.
- **Confirm:** the next model-selecting pstack skill reads the sheet. Continue the optional verification-skill offers using the Codex paths below.

## Paths and history

| Cursor | Codex |
| --- | --- |
| `.cursor/skills/`, `~/.cursor/skills/` | `.agents/skills/`, `~/.agents/skills/` for project and personal skills. |
| `~/.cursor/plugins/`, `.cursor-plugin/plugin.json` | Use the installed `<pstack>` path supplied by the skill catalog. The generated package has `plugin.json` and a `.codex-plugin/plugin.json` compatibility manifest. |
| `.cursor/rules/`, always-applied rules | Project or personal `AGENTS.md`. The separate model sheet above is the exception. |
| `https://github.com/cursor/plugins/blob/main/pstack/<path>` | Read `<pstack>/<path>` when packaged. Give the public URL to the user when they need a link. |
| `~/.cursor/projects/<slug>/agent-transcripts/` | Use a thread/history tool scoped to the requested chat when available. For local rollouts, use the helper below to select this workspace's sessions before reading their contents. |

For `recall`, `reflect`, `automate-me`, and session pickup, list matching local sessions with:

```sh
node <pstack>/docs/harness/codex/sessions.mjs --cwd <absolute-workspace-path>
```

The helper reads only session metadata until the workspace matches, searches `sessions/` and `archived_sessions/` under `$CODEX_HOME` (default `~/.codex`), and returns matching paths newest first. Use `--id <session-id>` to select a known chat. Read the matching rollout's messages only after selection. If the active conversation is ephemeral or unavailable locally, use the current conversation or the session digest that the skill permits; do not substitute a different workspace's history.

The bundled `worktree-audit.sh` reads Cursor history only. For a Codex worktree cleanup, use the Codex wrapper instead:

```sh
node <pstack>/docs/harness/codex/worktree-audit.mjs [-b <base-ref>] <repo-path>
```

It retains the shared audit's worktree and PR checks, incorporates Codex session activity, and keeps recent worktrees out of the `safe` bucket. An audit error leaves cleanup unverified. The audit does not delete worktrees.

## Cursor-only features

Cursor Automations, routine webhooks, and Cursor cloud-agent dashboards have no direct Codex equivalent. Mark the affected step `Skipped in Codex: <step>. <reason>.` and continue independent steps. A step that depends on the missing result remains blocked. Use Codex automations only when the user requests one and the host exposes a suitable tool.

Bugbot findings on a GitHub PR are normal review threads. Read them through the forge CLI. If no Bugbot check exists, omit steps that start or await it and report that omission; retain the workflow's own review and verification requirements. For a built-in PR tool, use the forge command the workflow gives, subject to the user's authorization.

Codex keeps its own permission and approval rules. A missing driver, unsupported feature, or declined operation is not permission to weaken a required check or claim it passed.

The mappings follow the current [Codex subagent documentation](https://learn.chatgpt.com/docs/agent-configuration/subagents), [skill documentation](https://learn.chatgpt.com/docs/build-skills), and [plugin packaging documentation](https://developers.openai.com/plugins/build/plugins). The active tool schema controls when a client's capabilities differ.
