---
name: evo-finish
description: Converge verified and reviewed work into coherent repository current truth. Use after implementation passes required verification and review, before final delivery/commit.
---

# EVO Finish

## Preconditions
Required acceptance is PASS or explicitly accepted as UNVERIFIED by the responsible human; blocking Review findings are resolved.

## Read first
`.evo/project.md`, `.evo/context.md`, `.evo/goal.md` when active, owning Spec/Plan, relevant Decisions, diff, current project docs and verification/review results.

## Workflow
1. Update current project docs/contracts when shipped behavior changed.
2. Update `.evo/context.md` only for stable domain facts/vocabulary learned.
3. Create/update `.evo/decisions/` for durable rationale that should survive the working Spec.
4. Remove stale future-tense claims and reconcile the Working Spec/Plan with what actually shipped. When their unique durable information has been absorbed by Decisions/current docs/Goal, they may be removed; Git preserves history.
5. Update `.evo/project.md` if navigation, modules, commands or stable entry paths changed.
6. Mark `.evo/goal.md` COMPLETE when it owns the completed objective, including final evidence summary and remaining accepted limitations.
7. Check references/links after any Spec/Plan cleanup.

## Boundary
Finish does not create missing implementation evidence, perform code review or make Git delivery claims.

## Output
Report current-truth surfaces changed, durable Decisions retained, working artifacts removed/retained and anything deliberately left unresolved. Route delivery to `evo-commit`.