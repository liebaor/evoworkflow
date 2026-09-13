---
name: evo-implement
description: Implement exactly one approved EVO vertical Slice using existing repository patterns and focused verification. Use only after required Change, Spec, and Plan approvals.
---

# EVO Implement

## Objective

Deliver one bounded, reviewable Slice whose code and tests satisfy its approved acceptance without unrelated refactoring.

## Inputs and authorities

Read `AGENTS.md`, project map, state, approved Change/Specification/Plan fingerprint, current Decisions, the persisted current Slice and its Plan acceptance, Working Context, consistency observations, reference implementation, affected source, tests, and relevant engineering guidance. If no current Slice is recorded, stop for human selection instead of guessing from Plan order.

## Required outcomes

Implement the complete vertical behavior, update its focused tests and necessary current code documentation, run focused verification, and record changed paths, results, and remaining `UNVERIFIED` evidence.

## Constraints and decision rules

- Existing pattern and capability reuse precede new abstractions.
- Stay inside expected modules and contracts.
- Treat consistency and blast-radius findings as stop-and-review signals; do not silently add a parallel mechanism or expand the scope.
- Do not silently repair unrelated findings.
- One invocation implements one Slice unless an approved Goal explicitly delegates several.
- Local passing tests do not prove external, production, browser, or operational behavior.

## Stop conditions

Stop on requirement ambiguity, acceptance change, architecture deviation, breaking API, security Decision, destructive data operation, unexpected dependency, scope expansion, or repeated failure. Record `BLOCKED` and the needed human action.

## Repository writes

Approved Slice source/tests, its `evidence.md` checkpoint, and the matching `.evo/state.yml` Slice status. Mark only the selected Slice `RUNNING`, `PASS`, or `BLOCKED`; clear `currentSlice` after PASS. Do not advance to Verify, Review, Finish, commit, merge, or deploy.
