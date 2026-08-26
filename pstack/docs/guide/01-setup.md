# Set up pstack

In this page you install the plugin, pick which models pstack uses, and run your first task. Setup is one command plus a short conversation.

## Install the plugin

In a Cursor chat, run:

```text
/add-plugin pstack
```

Cursor confirms the plugin is installed.

For Codex, Claude Code, or a local Cursor checkout, use the [self-hosted install
instructions](../platform-support.md#self-hosted-installation).

## Pick your models

Run:

```text
/setup-pstack
```

[`/setup-pstack`](../../skills/setup-pstack/SKILL.md) detects models the active
client confirms, shows you each role, and asks what you want. It writes
`.pstack/models.md` in the target repository, which every pstack skill can
read.

You only override what you care about. A role with no line in the configuration
keeps the skill's client-resolved default. To restore a default later, delete
that role's line or run `/setup-pstack` again.

You might be wondering what happens if you use Auto. Set a role to `inherit-parent` or `auto` and pstack omits the subagent `model` field, so the subagent inherits your parent chat model. Both values mean the same thing, and neither is a model slug. For a panel role the value is a list, and one subagent runs per entry, so the list length sets the panel size. Setup also configures `swarm workers`, the default model for every `/swarm` worker unless a race names a model for each arm.

## Accept the verification offer, or don't

At the end of setup, `/setup-pstack` looks for a way to prove app behavior in your project, either a `verify-*` skill or an existing harness. If it finds neither, it offers once to generate one with [`/create-verification-skill`](../../skills/create-verification-skill/SKILL.md).

Say yes and it writes `verify-<app>/` under the active client's project skill
root, a project-local skill that teaches agents to drive your app the way a
user does. It proves the skill works once before handing it over. Say no and
setup moves on. You can invoke `create-verification-skill` yourself any time.
[Verify and ship](./06-verify-and-ship.md#create-a-project-verification-skill)
covers when it earns its place.

The model configuration applies to current and future pstack runs in this
repository.

## Run your first task

Pick something real but small, and describe it the way you'd describe it to a colleague:

```text
/poteto-mode add a --json flag to this command. text output stays byte-identical. verify both.
```

Watch the todo list. The first item is always "read the Principles section". The rest are the matched playbook's steps copied in, the Feature playbook for this prompt. If `/poteto-mode` skips a step, the step stays in the list with `skip: <reason>`, so you can see what it chose not to do.

From here you can type normal follow-ups. In Cursor, `/poteto-mode` is sticky
and stays on for the conversation until you opt out. Invoke it explicitly on a
client that does not support Cursor's mode metadata.

Next: [Route work through `/poteto-mode`](./02-poteto-mode.md).
