---
name: setup-pstack
description: Configure which models pstack uses per role. Detects models supported by the active client and writes a portable project override. Use for /setup-pstack, "configure pstack models", or changing pstack's model choices.
---

# Setup pstack

Before using a client-specific tool, model, path, transcript, or subagent
option, read the [platform
adapters](../poteto-mode/references/platform-adapters.md). Its active-client
mapping overrides the mechanism below.

Write `.pstack/models.md` at the target repository root. It sets pstack's
model per role without coupling the repository to one client. The skills read
it and fall back to client-resolved inline defaults when a line is absent, so
this is an override layer, not a requirement.

## Steps

### 1. Detect available models

Use the active client's model or subagent facility to enumerate model names
that are valid in this session. Never infer that a slug supported by another
client is available. If the client exposes no dependable model list, use
`inherit-parent` instead of inventing a slug. The aliases `inherit-parent` and
`auto` are always valid. Both mean to omit the explicit model argument.

### 2. Load current state

If `.pstack/models.md` exists, read it and treat its values as the current
choices. On Cursor only, an existing
`~/.cursor/rules/pstack-models.mdc` is a migration source when the portable file
does not exist. Keep a migrated real slug only if Cursor confirms it is still
available. A client-confirmed inline default may seed its role. Otherwise start
from the safe template in step 5.

### 3. Map and confirm

Show every role with its current model. Mark each real name not in the detected
set as needing a choice. Ask whether to accept the mapping or change specific
roles, using the structured-question mechanism from the adapter when available.
Offer only detected models plus `inherit-parent` and `auto`.

For panel roles such as how critics, arena runners, architect runners, and
interrogate reviewers, one subagent runs per list entry. Alias entries still
count, so the list length sets the fan-out. `arena cross-judge pool` is also a
list, but Arena chooses one entry whose model family differs from the parent's
when possible. `swarm workers` is the default for every worker unless a race or
comparison assigns a different confirmed model per arm.

### 4. Validate

Every real model name written must be in the detected set. `inherit-parent` and
`auto` always pass. If a chosen real model is unavailable, stop and ask again.
A configuration pointing at an unsupported model breaks every delegation that
reads it.

### 5. Write the configuration

Write `.pstack/models.md` with one line per role, using the labels below.
Overwrite the whole file so reruns stay idempotent. Replace aliases only with
models confirmed for the active client.

```
# pstack model configuration

One role per line. Delete a line to use the skill default. `inherit-parent` and
`auto` omit the explicit model argument. Repeated aliases in a panel list keep
the requested fan-out.

feature, refactoring: inherit-parent
bug-fix: inherit-parent
perf-issue: inherit-parent
hillclimb: inherit-parent
judgment and prose: inherit-parent
hardest tasks: inherit-parent
how explorer: inherit-parent
how explainer: inherit-parent
how critics: inherit-parent, inherit-parent, inherit-parent, inherit-parent
why investigators: inherit-parent
why synthesizer: inherit-parent
reflect tooling: inherit-parent
reflect judgment, divergent, synthesizer: inherit-parent
arena runners: inherit-parent, inherit-parent, inherit-parent, inherit-parent
arena cross-judge pool: inherit-parent, inherit-parent, inherit-parent, inherit-parent
swarm workers: inherit-parent
architect runners: inherit-parent, inherit-parent, inherit-parent, inherit-parent
interrogate reviewers: inherit-parent, inherit-parent, inherit-parent, inherit-parent
```

### 6. Confirm

Tell the user that `.pstack/models.md` was written and applies to current and
future pstack runs in this repository. Rerunning this skill updates it.

### 7. Offer a verification skill (optional)

Check whether the project has a way to drive the real app for proof, such as a
`verify-*` skill or an existing harness. If not, offer once: "Want a
project-local verification skill so agents can drive the app the way a user
does and prove changes work?" On yes, invoke `create-verification-skill` using
the active client's skill syntax. On no, move on without pushing.
