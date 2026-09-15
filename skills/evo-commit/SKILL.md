---
name: evo-commit
description: Create an AI-readable Git commit for the current bounded EVO work and optionally push when explicitly authorized. Use after verified work, for Goal checkpoints, or when the user asks to commit/push. Commit records state; it does not prove correctness.
---

# EVO Commit

## Read first
`git status`, diff from the intended base/checkpoint, `.evo/goal.md` if present, current Plan/Spec and the verification/review results that actually exist.

## Preflight
1. Confirm the diff belongs to one coherent Goal/slice; do not sweep unrelated user work into the commit.
2. Look for obvious secrets, credentials, generated junk or accidental large files.
3. Distinguish verified completion from WIP. Missing evidence does not forbid an explicitly requested checkpoint commit, but the message must not claim completion.
4. Respect repository commit conventions when they exist.

## Message
Prefer an outcome-oriented subject:

```text
<type>(<scope>): <outcome>
```

When useful, body sections make history easy for humans and future Agents:

```text
Implements:
- S3 ...
- AC-4 ...

Verified:
- <executed command/path>

Context:
- .evo/specs/...
- .evo/plans/...
```

Do not fabricate `Verified` entries.

## Commit
Stage only intended files and commit. Re-read status afterward.

## Push
Default is **no push**. Push only when:
- the user explicitly asks, or
- active `.evo/goal.md` explicitly authorizes `push: true`.

For normal feature branches use a non-force push, setting upstream when needed. Never force-push, push an unexpected/default protected branch, rewrite history or bypass hooks without separate explicit authorization.

## Output
Return commit SHA/subject, files/scope, verification represented in the message, remaining working-tree changes and push result/remote branch if performed.