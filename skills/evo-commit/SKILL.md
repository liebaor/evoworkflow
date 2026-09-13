---
name: evo-commit
description: Create a verified Git delivery checkpoint for an EVO development stage, using structured engineering chronology for humans and future agents. Commit describes existing EVO state; it does not create acceptance or completion. Push only with explicit human authorization.
---

# EVO Commit

## Objective

Turn an already-understood and sufficiently verified engineering state into a durable Git checkpoint that future humans and agents can understand without reconstructing the entire chat history.

`evo-commit` owns Git chronology and delivery.

It does not own engineering acceptance, Decision promotion, repository convergence, or Change completion.

Core rule:

> Commit describes state. It does not create state.

## Relationship to evo-finish

`evo-finish` answers:

> Is this Change complete in engineering terms?

It owns Human Acceptance, Evidence/Review convergence, Decision promotion, current-truth convergence, work archival, and `COMPLETED` state.

`evo-commit` answers:

> How should the current trusted engineering state be recorded and optionally delivered through Git?

A commit MUST NOT imply that a Change is complete unless repository state already records completion through `evo-finish`.

## When to use

Use `evo-commit` after a coherent engineering checkpoint has been reached, for example:

- an approved Slice was implemented and verified,
- a bug root cause was fixed with regression evidence,
- a requirement-change migration step reached a stable checkpoint,
- review-driven corrections were completed,
- or an entire Change was finished and is ready for final Git delivery.

Do not commit merely because files changed.

A checkpoint should represent one understandable engineering state.

## Inputs and authorities

Read only the facts needed to describe and deliver the checkpoint:

- current `.evo/state.yml`,
- active or completed Change,
- current Slice when present,
- relevant Plan and Decisions,
- current Evidence and Review disposition where applicable,
- actual Git status and diff,
- relevant existing commit conventions.

The Git diff is authoritative for what changed.

Change/Plan/Decision explain intent and rationale.

Evidence explains what is verified.

`evo-commit` consumes these facts; it does not independently redefine them.

## Required outcomes

Determine:

1. checkpoint type: `SLICE`, `STAGE`, `BUGFIX`, or `FINAL_DELIVERY`,
2. owning Change and Slice when present,
3. actual diff included in the checkpoint,
4. existing verification facts and limitations,
5. next expected engineering action,
6. whether commit and/or push are explicitly authorized.

Then produce a structured commit message and, when authorized, create the Git commit.

## Structured commit format

Use a concise Conventional Commit-style subject where appropriate:

`<type>(<scope>): <engineering outcome>`

Examples:

- `feat(inventory): add low-stock threshold management`
- `fix(permission): restore DataScope on supplier queries`
- `feat(evo): resolve task-level engineering constraints`

The body should contain only useful engineering chronology:

### Context

Why this checkpoint exists and which Change/Slice it belongs to.

### Completed

What behavior or engineering capability now exists.

Describe outcomes, not a file-by-file diff.

### Engineering Notes

Only important implementation or design facts needed to understand the checkpoint.

Reference Decisions instead of copying their durable rationale.

### Verification

Report existing concrete Evidence: commands, tests, runtime checks, Evidence IDs, and their real status.

Never convert `UNVERIFIED`, `NOT_RUN`, `BLOCKED`, or failed checks into PASS.

### Limitations

Record meaningful known limitations, deferred work, or unavailable runtime paths.

Omit only when there are genuinely no meaningful limitations.

### Next

State the next Slice, phase, Change, or human-controlled action.

## Git trailers

When applicable append machine-readable references:

`EVO-Change: <change-id>`

`EVO-Slice: <slice-id>`

`EVO-Phase: <workflow-phase>`

`EVO-Evidence: <evidence-id[,evidence-id...]>`

`EVO-Decision: <decision-id[,decision-id...]>`

`EVO-Next: <next-action>`

These trailers are indexes into repository authority, not replacements for it.

## Checkpoint commit

A checkpoint commit may occur while a LARGE/STANDARD Change is still active.

Example state:

- Change: ACTIVE
- Slice S1: verified checkpoint
- Next: S2

The commit must clearly avoid language implying the whole Change is complete.

Typical lifecycle:

`Implement Slice → Verify → evo-commit → Next Slice`

## Final delivery commit

A final delivery commit normally follows:

`Independent Review → Human Acceptance → evo-finish → evo-commit`

Only repository state created by `evo-finish` may justify describing the Change as completed.

Push remains a separate external delivery action.

## Scope discipline

Stage only files that belong to the intended checkpoint.

If unrelated modifications are present:

- exclude them when safely separable,
- otherwise stop and report the scope conflict.

Never hide unrelated work inside a large commit merely to obtain a clean tree.

## Commit authorization

Preparing the checkpoint summary and commit message is read-only.

Creating a Git commit requires explicit user authorization unless the user directly invoked a commit action that clearly grants it.

Do not amend or rewrite an unrelated existing commit without explicit authorization.

## Push behavior

Push is never implied by `evo-finish` or by preparing a commit.

When the human explicitly requests push:

`PREPARE → COMMIT → PUSH`

Push only the intended current branch to the configured remote.

Report the branch, commit SHA, remote, push result, and next EVO action.

Never force-push unless separately and explicitly authorized.

## Constraints and decision rules

- Do not redo `evo-verify`, `evo-review`, or `evo-finish` inside this Skill.
- Do not independently decide Acceptance.
- Do not promote Decisions.
- Do not mark a Change `COMPLETED`.
- Do not create `.evo/commit-history/` or a second chronology database.
- Do not merge, tag, release, deploy, or alter remote history unless separately authorized.
- Preserve the distinction between current truth and historical chronology.

## Stop conditions

Stop before commit or push when:

- repository state cannot be interpreted safely,
- the intended checkpoint scope is ambiguous,
- unrelated changes cannot be separated safely,
- the commit message would claim a status not present in EVO state,
- sensitive material may be committed,
- unresolved Git conflicts exist,
- target branch/remote is ambiguous,
- or the requested external Git action lacks explicit authorization.

Verification failures do not automatically forbid every checkpoint commit; a deliberate WIP/error checkpoint may be useful if explicitly requested. In that case the commit must accurately record failure/blocking status and MUST NOT imply successful verification.

## Repository writes

Normally no EVO knowledge document is created solely for `evo-commit`.

The Git commit is the chronology record.

Only update Change, Decision, Evidence, docs, or state when those owning artifacts independently require modification through their own workflow.
