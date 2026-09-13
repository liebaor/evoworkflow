---
name: evo-change
description: Handle a requirement change during or after EVO work by recording the old-to-new Delta, analyzing impact, invalidating stale approvals, and replanning after human confirmation.
---

# EVO Change

## Objective

Make changed intent explicit and propagate it through every affected authority without silently rewriting history.

## Inputs and authorities

Read the old approved Change/Specification, the user's proposed new intent, current Decisions, Plan, implementation, tests, current docs, data and API contracts, Evidence, and Git state.

## Required outcomes

Record `OLD`, `NEW`, `RETAIN`, `MODIFY`, `REMOVE`, and `ADD`. Analyze effects on acceptance, Decisions, Plan and Slices, code, tests, docs, data, API, compatibility, migration, and Goal delegation. Recommend the smallest replan.

## Constraints and decision rules

- The user approves the Delta before affected implementation continues.
- Material changes invalidate Specification, Plan, and Goal approvals bound to previous content.
- A changed durable Decision supersedes its predecessor; it is not silently edited.
- Preserve already valid work and evidence where the Delta does not affect them.

## Stop conditions

Stop for human confirmation of the Delta and any new product, security, compatibility, destructive-data, or architecture Decision. Do not continue implementation automatically.

## Repository writes

Write `delta.md`, update working Change/Specification/Plan after approval, create successor working Decisions when required, and set affected state to `AWAITING_APPROVAL`.
