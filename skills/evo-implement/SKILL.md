---
name: evo-implement
description: Implement one bounded plan slice using repository patterns and real feedback loops. Use when one slice has clear objective, boundaries and acceptance. Escalate changed intent instead of silently changing the plan.
---

# EVO Implement

## Preconditions
Read `.evo/project.md`, `.evo/context.md`, current Plan slice, owning Spec, relevant Decisions, source/tests and at least one representative implementation when available.

Do not start if a material human decision is unresolved.

## Workflow
1. Trace the real consumer/composition path the slice must reach.
2. Reuse existing permissions, response, transaction, data, error, logging, component and testing patterns.
3. If a behavior has a stable test seam, apply `evo-tdd` rather than writing broad implementation first.
4. Keep changes inside the slice; record unrelated discoveries separately.
5. Run focused typecheck/tests/build/runtime checks during work.
6. Update tests/contracts/current docs only when their owned fact changes.

## Escalate
- accepted intent changed → `evo-change`;
- human product/architecture decision missing → `evo-grill-with-docs`;
- current external fact needed → `evo-research`;
- observed unexpected failure/root-cause problem → `evo-bug`;
- slice is much broader than planned → return to `evo-plan`.

## Output
Report exact changes, checks actually run, skipped checks and remaining uncertainty. Do not claim the whole Goal complete; route acceptance proof to `evo-verify`.