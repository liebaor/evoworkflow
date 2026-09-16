# EVOworkflow 2.0 Workflow

## First adoption

```text
install Matt Skills + EVO Skills
        ↓
setup-matt-pocock-skills
        ↓
evo-init
        ↓
ask-evo
```

Matt setup owns issue-tracker and domain-document configuration. EVO Init owns semantic understanding of how this repository should actually be extended, including reusable framework/project capabilities and representative implementations.

## Planning

Use upstream planning methods directly, then pass their outputs through EVO repository-conformance gates:

```text
grill-with-docs / domain-modeling / research / wayfinder
        ↓
to-spec
        ↓
evo-spec-review
        ↓
to-tickets
        ↓
evo-plan-review
```

EVO does not maintain parallel `evo-spec`, `evo-plan`, `evo-research`, or `evo-grill-with-docs` copies.

`evo-spec-review` checks architecture/framework fit without replacing the canonical Spec. `evo-plan-review` checks every planned slice against module boundaries, representative implementations, reusable capabilities and repository-native verification paths. Both update canonical owners directly when the correction is intent-preserving and unambiguous.

## One bounded delivery

```text
reviewed ticket / bounded task
        ↓
evo-implement
        ↓
evo-verify
        ↓
evo-review
        ↓
evo-commit
```

`evo-implement` enforces both **Reference Before Edit** and **Capability Before Creation**. It may apply upstream `tdd` where appropriate. A difficult observed failure should use upstream `diagnosing-bugs` when available.

## Continuous Goal

```text
reviewed Spec + reviewed ticket graph + Execution Envelope
        ↓
evo-goal
        │
        ├─ choose ready frontier ticket
        ├─ snapshot delivery base
        ├─ evo-implement
        ├─ evo-verify
        ├─ diagnose/fix/reverify ordinary failures
        ├─ evo-review
        ├─ evo-commit
        ├─ close/update ticket
        └─ recompute frontier
        ↓
full evo-verify
        ↓
final evo-review
        ↓
evo-finish
        ↓
final evo-commit
        ↓
push only if pre-authorized
```

`evo-goal` must not begin when `evo-spec-review` or `evo-plan-review` is missing/stale after a material accepted-intent or architecture/capability change.

Normal build/test/lint/review failures are execution work, not reasons to interrupt the human. Stop when meaning or risk changes, credentials/production authority are missing, destructive action is required, or repeated diagnosis has no new evidence path.

## Requirement change

```text
accepted intent changes
        ↓
evo-change
        ↓
RETAIN / REVISE / REMOVE / ADD
        ↓
update canonical Spec / tickets / ADR / docs
        ↓
invalidate only affected evidence + conformance assumptions
        ↓
rerun evo-spec-review / evo-plan-review only where needed
        ↓
recompute frontier
        ↓
resume implementation or Goal
```

## Recovery

A fresh session reconstructs from standing instructions, repository guide, domain/ADR config, canonical Spec/ticket Repository Fit sections, tracker source and comments, Git status/log/diff, tests/CI and current code. Chat history is optional context, never the authority.
