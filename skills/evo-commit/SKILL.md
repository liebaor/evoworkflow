---
name: evo-commit
description: Record a coherent, already-understood engineering checkpoint in Git and perform only explicitly authorized push behavior; commit describes state and never creates correctness.
compatibility: "Codex, Claude Code, OpenCode; Git required"
disable-model-invocation: true
metadata:
  opencode/autoinvoke: "false"
---

# EVO Commit

## Core rule

**Commit describes state. It does not create state.**

A commit records implementation/evidence/review facts that already exist. It cannot turn FAIL/UNVERIFIED/WIP into completed work.

## Read first

Read Git status/diff, the owning Spec/ticket, actual verification/review results, repository commit conventions and any active Goal Execution Envelope.

## Preflight

- Bound the checkpoint to one understandable ticket/stage/fix/final convergence.
- Exclude unrelated user changes when safely separable; stop if scope cannot be separated.
- Check obvious credentials/secrets, generated junk and accidental large files.
- Distinguish verified completion from deliberate WIP/error checkpoint.
- Respect the repository's existing commit convention when one exists.

## Message

Prefer a concise outcome-oriented subject, for example:

```text
<type>(<scope>): <outcome>
```

Add only useful body sections when needed:

```text
Context:
- <owning ticket/spec>

Completed:
- <observable outcome>

Verified:
- <actual executed command/path/status>

Limitations:
- <meaningful limitation>

Next:
- <next tracker work or human action>
```

Never fabricate `Verified` entries.

## Commit authorization

An explicit user request to commit, or execution inside an already approved `evo-goal` commit policy, authorizes ordinary scoped commits. Otherwise prepare the message/scope and request authorization before creating the commit.

## Push policy

Default is **no push**.

Push only when:

- the user explicitly requests it; or
- the active Goal Execution Envelope already authorizes `final-only` or `per-ticket` push for the intended feature branch/remote.

Normal authorized push is non-force. Force-push, history rewrite, unexpected/default/protected branch, merge, tag, release and deploy require separate explicit authorization even if a Goal may push ordinary feature commits.

## Output

Report commit SHA/subject, included scope, represented verification/limitations, remaining worktree changes, and push remote/branch/result when push occurred.
