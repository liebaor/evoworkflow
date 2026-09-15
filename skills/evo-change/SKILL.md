---
name: evo-change
description: Reconcile changed accepted intent by updating the canonical Working Spec/Plan/Decisions while preserving unaffected implementation and evidence. Use when requirements or direction change after work has started.
---

# EVO Change

## Read first
`.evo/project.md`, `.evo/context.md`, active Spec/Plan/Goal, relevant Decisions, current implementation/tests.

## Classify
- Clarification: wording changes, accepted outcome unchanged.
- Living revision: unfinished scope/behavior/acceptance changes.
- Evidence-driven refinement: observed fact resolves an unknown.
- Stable reversal: a shipped durable Decision is reversed.
- Independent decision: new revisitable problem with its own trade-offs.

## Delta
For Outcome, Non-goals, Acceptance, rationale, code/contracts, tests/evidence, current docs, migration/compatibility and Decision ownership, mark each item **retain / revise / remove / add**.

## Write
- unfinished intent → revise the same `.evo/specs/<change>.md`;
- plan impact → revise `.evo/plans/<change>.md`;
- stable reversal → create a new cross-linked `.evo/decisions/` record instead of rewriting history;
- update `.evo/goal.md` progress/current slice if a Goal is active.

Preserve unaffected implementation/evidence. Rerun only evidence invalidated by the delta.

## Human stop
Ask before accepting new product direction, paid/external service, privacy/security exposure, compatibility loss, destructive data change or major architecture boundary.

## Output
Provide a concise delta table and state which artifacts/evidence remain valid.