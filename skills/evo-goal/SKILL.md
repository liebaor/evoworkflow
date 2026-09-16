---
name: evo-goal
description: "Continuously execute a prepared tracker-backed ticket graph inside an approved Execution Envelope after repository-conformance gates: implement, verify, review, commit, close and advance until completion or a true semantic/risk stop."
compatibility: "Codex, Claude Code, OpenCode; tracker protocol + Git; optional Matt tdd/diagnosing-bugs"
disable-model-invocation: true
metadata:
  opencode/autoinvoke: "false"
---

# EVO Goal

## Purpose

Delegate execution, not ambiguity. Complete ready work continuously without a central state runtime or repeated human approval for ordinary engineering transitions.

## Preconditions

- Matt setup has configured the issue tracker/domain layout.
- `evo-init` has established current repository guidance.
- A canonical Spec/parent task exists with acceptance sufficient to execute.
- The Spec has passed `evo-spec-review` after the latest material accepted-intent change.
- A canonical ticket graph exists with blocking edges sufficient to execute.
- The ticket graph has passed `evo-plan-review` after the latest material Spec/architecture/capability change; executable tickets contain adequate Repository Fit guidance.
- Material product/architecture/security/data choices needed to begin are settled.
- One checkout has one active writer.

If either conformance gate is missing or stale, route to that gate before Goal execution. Do not compensate by inventing repository-fit decisions inside the execution loop.

## Execution Envelope

Before starting, resolve and, when cross-session continuation matters, persist on the canonical parent task/local tracker document:

- source Spec / parent task;
- scope/ticket graph;
- commit policy: normally `per-ticket`;
- push policy: `none` (default), `final-only`, or `per-ticket`;
- target branch/remote when push is authorized;
- human-stop conditions or special constraints.

Tracker owns progress. Do not mirror ticket checkboxes/status in `.evo/goal.md` or `.evo/state.yml`.

## Loop

While the tracker frontier contains ready work:

1. Select one open, unblocked, conformance-reviewed ticket; claim it when the tracker supports claims/assignees.
2. Record the current Git base so the delivery diff is bounded.
3. Apply `evo-implement` to the ticket. Its Reference Before Edit and Capability Before Creation rules are execution invariants, not optional advice.
4. Apply `evo-verify`.
5. On ordinary FAIL (tests/build/lint/code behavior), diagnose and fix rather than stopping for the human. Use upstream `diagnosing-bugs` for nontrivial root-cause work when installed, then re-verify. Stop only after repeated failure has no new hypothesis/evidence path.
6. Apply `evo-review` to the full intended pre-commit diff. Resolve blocking findings, including duplicate/parallel capability findings, then re-run invalidated evidence/review as needed.
7. Apply `evo-commit` with the envelope's commit/push policy. A Goal invocation pre-authorizes ordinary commits inside the agreed scope; push follows only the explicit envelope policy.
8. Update/close the ticket with verification/commit facts using the configured tracker protocol.
9. Recompute the frontier from the tracker; do not trust cached progress.

If a ticket becomes invalid because accepted intent changed, route to `evo-change`, update canonical owners/frontier, rerun only the conformance gate(s) invalidated by that change, then resume when meaning and Repository Fit are settled.

## Human stop

Stop for unresolved/new product direction, breaking compatibility, material architecture boundary, security/privacy exposure, destructive/irreversible data action, new paid/external service, missing protected credential/production authorization, ambiguous target branch/remote, or exhausted diagnosis.

Do **not** stop merely for compilation errors, failing tests, lint/type errors, ordinary bugs or review findings.

## Finalization

When no in-scope tickets remain:

1. run full `evo-verify` against parent acceptance and real consumer paths;
2. run final `evo-review` across the complete goal diff/history;
3. resolve blocking findings and re-prove affected acceptance;
4. apply `evo-finish`;
5. apply final `evo-commit` if Finish changed current-truth artifacts;
6. push only if the envelope explicitly authorizes it.

## Output

Report completed tickets, conformance gate status, verification/review status, commits, tracker state, push status and any accepted/unverified limitations.