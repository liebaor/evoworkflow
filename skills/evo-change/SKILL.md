---
name: evo-change
description: Reconcile a change in already accepted intent without restarting unaffected work. Use when requirements, scope, behavior, constraints, or direction change during ongoing work; classify the delta, update the correct owner, and invalidate only what the change actually affects.
disable-model-invocation: true
---

# EVO Change

## Purpose

Handle changed intent explicitly so valid work survives, invalid work is revised, and history is not rewritten as if the old direction never existed.

## Use when

- the user changes accepted requirements during implementation;
- review or evidence changes the intended outcome;
- a delivered stable decision is being reversed;
- a new material decision appears inside an existing change.

## Do not use when

- the observed behavior is simply broken relative to unchanged intent — use `evo-bug`;
- the original request was never clear enough to be accepted — use `evo-grill-with-docs`;
- the only change is a mechanical implementation correction with no effect on intent or acceptance.

## Classify the change

Choose the narrowest fitting class:

- **Clarification** — wording becomes more precise; outcome/acceptance do not materially change.
- **Living revision** — unfinished work changes scope, behavior, acceptance, or direction; revise the same working owner.
- **Evidence-driven refinement** — an empirical unknown is resolved by observed evidence and changes the plan.
- **Stable reversal** — a decision that already shipped is intentionally reversed; create a new cross-linked replacement decision when the repository's convention supports durable decisions.
- **Independent decision** — the new issue has its own alternatives/consequences and deserves a separate owner.

## Reconcile the delta

Build a delta table across only the affected surfaces:

| Surface | Previous | New | Action |
|---|---|---|---|
| Outcome / non-goal | | | retain / revise / remove / add |
| Acceptance | | | retain / revise / remove / add |
| Constraints / rationale | | | retain / revise / remove / add |
| Code / public contract | | | retain / revise / remove / add |
| Tests / evidence | | | retain / rerun / replace / add |
| Current docs | | | retain / revise / remove / add |
| Migration / compatibility | | | retain / revise / add |

Do not create rows for unaffected surfaces merely to fill a template.

## Authority rules

- unfinished intent normally updates the existing working proposal/issue rather than creating a permanent replacement chain;
- stable shipped rationale should not be silently rewritten; preserve history and cross-link the replacement when the old rationale remains meaningful;
- ask the responsible human before accepting new product direction, recurring external cost, privacy/security exposure, compatibility loss, destructive data change, or major architecture boundary.

## Preserve valid work

Existing code, tests, docs, and evidence remain valid unless the delta actually invalidates them. Rerun only the checks whose assumptions or acceptance changed.

## Output

Report:

- change classification;
- delta table;
- owner document/issue updated or created;
- implementation/test/docs surfaces invalidated;
- work explicitly retained;
- human decisions still required;
- recommended next Skill.

## Final checks

- old and new intent are distinguishable;
- unaffected work was not discarded;
- stable history was not rewritten deceptively;
- no parallel permanent delta-state system was created;
- downstream Plan/implementation/verification affected by the delta is clearly identified.
