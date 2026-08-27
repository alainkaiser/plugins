# Set up pstack

In this page you install the plugin, pick which models pstack uses, and run your first task. Setup is one command plus a short conversation.

## Install the plugin

In a Cursor chat, run:

```text
/add-plugin pstack
```

Cursor confirms the plugin is installed.

For Codex, Claude Code, or a local Cursor checkout, use the [self-hosted install instructions](../platform-support.md#self-hosted-installation).

## Pick your models

Run:

```text
/setup-pstack
```

[`/setup-pstack`](../../skills/setup-pstack/SKILL.md) detects the models the active client can use, shows you each role (code delegates, judgment, the review panels), and asks what you want. Answer the questions. It writes a client-specific user configuration by default: Cursor uses `~/.cursor/rules/pstack-models.mdc`, Codex uses `~/.codex/pstack/models.md` (or `$CODEX_HOME`), and Claude Code uses `~/.claude/pstack/models.md` (or `$CLAUDE_CONFIG_DIR`). The [platform adapter](../../skills/poteto-mode/references/platform-adapters.md#configuration-and-models) defines the exact paths and precedence.

The default is global for that client, so setup works in a projectless session and applies across repositories. It does not write another client's settings. The Codex and Claude Code paths are pstack-owned files that pstack skills read explicitly, not native host config keys. Project scope is available only when you explicitly request it, and uses that client's own project directory rather than a shared pstack file.

You only override what you care about. A role with no line in the rule keeps the skill's default. To restore a default later, delete that role's line, or just run `/setup-pstack` again.

You might be wondering what happens if you use Auto. Set a role to `inherit-parent` or `auto` and pstack omits the subagent `model` field, so the subagent inherits your parent chat model. Both values mean the same thing, and neither is a model slug. For a panel role the value is a list, and one subagent runs per entry, so the list length sets the panel size. Setup also configures `swarm workers`, the default model for every `/swarm` worker unless a race names a model for each arm.

## Accept the verification offer, or don't

At the end of setup, `/setup-pstack` looks for a way to prove app behavior in your project, either a `verify-*` skill or an existing harness. If it finds neither, it offers once to generate one with [`/create-verification-skill`](../../skills/create-verification-skill/SKILL.md).

Say yes and it writes under the active client's project skill root, a project-local skill that teaches agents to drive your app the way a user does. It proves the skill works once before handing it over. Say no and setup moves on. In a projectless session this offer is skipped. You can run `/create-verification-skill` yourself any time. [Verify and ship](./06-verify-and-ship.md#create-a-project-verification-skill) covers when it earns its place.

After setup, start a new chat. The model configuration applies to new sessions for that client.

## Run your first task

Pick something real but small, and describe it the way you'd describe it to a colleague:

```text
/poteto-mode add a --json flag to this command. text output stays byte-identical. verify both.
```

Watch the todo list. The first item is always "read the Principles section". The rest are the matched playbook's steps copied in, the Feature playbook for this prompt. If `/poteto-mode` skips a step, the step stays in the list with `skip: <reason>`, so you can see what it chose not to do.

From here you can type normal follow-ups. `/poteto-mode` is sticky. It stays on for the conversation until you opt out by saying so.

Next: [Route work through `/poteto-mode`](./02-poteto-mode.md).
