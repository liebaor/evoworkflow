---
name: evo-change
description: Reconcile a requirement or direction change by updating the correct current owner, preserving valid work, and invalidating only the evidence and implementation actually affected by the delta.
---

# EVO Change

## Objective

Handle changed intent without silently rewriting stable history or restarting unaffected work.

## Classify the change

- **Clarification** — wording is more precise; outcome/acceptance unchanged.
- **Living revision** — unfinished work changes scope, behavior, or acceptance; revise the same working proposal.
- **Evidence-driven refinement** — an unknown is resolved by observed evidence.
- **Stable reversal** — a decision already shipped is reversed; create a new cross-linked replacement decision.
- **Independent decision** — a new problem has its own alternatives/consequences and deserves its own owner.

## Reconcile the delta

Compare previous and new accepted intent across outcome/non-goals, constraints, acceptance, rationale, code/contracts, tests/evidence, current docs, migration/compatibility, and authority. Mark each affected item as retain, revise, remove, or add.

Preserve already valid implementation and evidence where the delta does not affect them. Rerun only evidence invalidated by the change.

Ask the human before accepting a new product direction, external cost/service, privacy/security exposure, compatibility loss, destructive data change, or major architecture boundary.

Do not maintain a parallel permanent `delta` state system; keep the reconciliation in the active proposal/task/decision convention already used by the repository.