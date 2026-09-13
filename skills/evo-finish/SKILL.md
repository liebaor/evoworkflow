---
name: evo-finish
description: Finish an EVO Change only after explicit human acceptance by checking repository convergence, promoting Decisions, synchronizing current truth, and archiving work evidence.
---

# EVO Finish

## Objective

Restore agreement between approved intent, current Decisions, implementation, tests, Evidence, and current documentation.

## Inputs and authorities

Read the accepted Change/Specification/Plan, review disposition, all acceptance Evidence, working Decisions, current docs, code/tests, Goal state, and Git diff. Confirm explicit human acceptance of the current content.

Run `evo finish --root <repository>` for a read-only convergence report. After every gate passes and the human confirms the report, use `evo finish --root <repository> --apply` for deterministic archival.

## Required outcomes

Classify convergence as `APPLY`, `PENDING`, `DRIFT`, `CONFLICT`, or `UNAFFECTED`; resolve or preserve each status accurately. Promote accepted working Decisions, update only affected current truth, move active work to completed, update state, and retain unverified limitations.

## Constraints and decision rules

- `FAIL`, unresolved blockers, stale approval, open review findings, or unaccepted scope prevent Finish.
- `UNVERIFIED` may remain only when `review.md` records `status: APPROVED`, `humanAcceptance: true`, and `acceptedLimitations: true`; retain the original marker and never convert it to PASS.
- Current docs describe the resulting system, not the development narrative.
- Finish does not imply commit, merge, release, deployment, migration, or production validation.

## Stop conditions

Stop on any convergence conflict or missing human acceptance and report the owning authority and required action.

## Repository writes

Update affected current docs and Decision lifecycle, finalize Evidence/review, move active Change and associated ready Goal to completed, and set state to `IDLE/COMPLETED`. Do not perform external actions.
