---
name: setup-pstack
description: Configure which models pstack uses per role. Detects the active client's available models and writes a client-specific user override. Use for /setup-pstack, "configure pstack models", or changing pstack's model choices.
---

# Setup pstack

Resolve the active client, its model-selector syntax, and its configuration path
through the [platform adapters](../poteto-mode/references/platform-adapters.md)
before reading or writing anything. Default to that client's user scope so the
mapping works across repositories without changing another client's behavior.
Only use project scope when the user explicitly asks for it.

The configuration sets pstack's model per role. Skills read the active client's
effective file and fall back to their inline defaults when a line is absent, so
this is an override layer, not a requirement.

## Steps

### 1. Detect available models

Enumerate the model selectors accepted by the active client's subagent facility
in this session; that is the dependable source. If the client also exposes a
models API or CLI that lists the user's entitled models, prefer it for
completeness. Never infer availability from another client. If you cannot
detect any, ask the user to paste the selectors they have access to. The
aliases `inherit-parent` and `auto` are always valid even though they are not
detected selectors.

### 2. Load current state

Resolve the effective configuration in the precedence order documented by the
adapter. If a client-specific file exists, read it and treat its values as the
current choices. If only the legacy shared `.pstack/models.md` exists, use it
as a migration source, label it as shared legacy state, and write the confirmed
choices to the active client's target in step 5. Otherwise start from the
default role-to-model mapping shown below.

### 3. Map and confirm

Show every role with its current selector, marking any real selector not in the
active client's detected set as needing a choice. Ask whether to accept as-is
or change specific roles, offering the detected selectors plus
`inherit-parent` and `auto` (both mean: this role runs on the parent chat model,
which is how Auto users stay on Auto) as the options. Prefer the active client's
structured-question tool over free text. For panel roles (how critics, arena
runners, architect runners, interrogate reviewers) the value is a list, and
one subagent runs per entry, alias entries included, so the list length sets the
count. `arena cross-judge pool` is also a list, but Arena selects one value from
it whose model family differs from the parent's when possible. `swarm workers`
is the default model for every worker unless a race or comparison assigns
another model per arm.

### 4. Validate

Every real selector written must be valid for the active client;
`inherit-parent` and `auto` always pass. For Codex, validate the model and
reasoning-effort pair separately using the adapter syntax. If a chosen selector
is unavailable, stop and ask again. A configuration pointing at a model the
user cannot use breaks every delegation that reads it.

### 5. Write the active client's configuration

Write the active client's user-scope target from the adapter, unless the user
explicitly requested project scope. Create its parent directory when needed and
overwrite only that file so re-runs stay idempotent. Never write another
client's target. If user-scope writing needs approval, request it; do not fall
back to a repository file.

Use one line per role with the same labels poteto-mode uses. Cursor targets add
the `alwaysApply` frontmatter shown here. Codex and Claude Code targets omit the
frontmatter and start at the comment. Shape:

```
---
description: pstack per-role model choices (overrides skill defaults)
alwaysApply: true
---
# pstack model configuration. One line per role. Delete a line to fall back to the skill default.
# `inherit-parent` or `auto` as a value: the role runs on the parent chat model (omit the explicit model). Alias entries in a panel list still count toward its fan-out.
feature, refactoring: grok-4.6-fast-xhigh
bug-fix: gpt-5.6-sol-max
perf-issue: gpt-5.6-sol-max
hillclimb: gpt-5.6-sol-max
judgment and prose: claude-fable-5-thinking-max
hardest tasks: claude-fable-5-thinking-max
how explorer: grok-4.6-fast-xhigh
how explainer: claude-fable-5-thinking-max
how critics: claude-fable-5-thinking-max, gpt-5.6-sol-max, grok-4.6-fast-xhigh, claude-opus-5-thinking-xhigh
why investigators: grok-4.6-fast-xhigh
why synthesizer: claude-fable-5-thinking-max
reflect tooling: gpt-5.6-sol-max
reflect judgment, divergent, synthesizer: claude-fable-5-thinking-max
arena runners: claude-fable-5-thinking-max, gpt-5.6-sol-max, grok-4.6-fast-xhigh, claude-opus-5-thinking-xhigh
arena cross-judge pool: claude-fable-5-thinking-max, gpt-5.6-sol-max, grok-4.6-fast-xhigh, claude-opus-5-thinking-xhigh
swarm workers: grok-4.6-fast-xhigh
architect runners: claude-fable-5-thinking-max, gpt-5.6-sol-max, grok-4.6-fast-xhigh, claude-opus-5-thinking-xhigh
interrogate reviewers: claude-fable-5-thinking-max, gpt-5.6-sol-max, grok-4.6-fast-xhigh, claude-opus-5-thinking-xhigh
```

### 6. Confirm

Tell the user which client, scope, and path were written. The configuration
applies to new sessions; re-running this skill updates it. If a legacy shared
file was used as a migration source, say that it remains untouched and may
still affect older pstack versions.

### 7. Offer a verification skill (optional)

If there is no repository, skip this step without treating it as a blocker.
Otherwise check whether the project has a way to drive the real app for proof
(a `verify-*` skill, or an existing harness). If not, offer once: "want a
project-local verification skill, so agents can drive the app the way a user
does and prove changes work? I can generate one with
/create-verification-skill." On yes, invoke `/create-verification-skill`
(resolves wherever pstack is installed — workspace, user, or plugin). On no,
move on without pushing.
