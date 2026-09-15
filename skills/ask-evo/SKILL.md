---
name: ask-evo
description: Route repository work to the single best next EVO Skill. Use when the user asks what to do next, how to continue, where work stands, or which EVO workflow applies. Read-only.
---

# Ask EVO

## Purpose
Reconstruct the current situation from repository evidence and recommend exactly one next Skill.

## Read first
1. Check whether `.evo/project.md` and the canonical `.evo/` directories exist.
2. If they exist, read `.evo/project.md`, `.evo/context.md`, `.evo/goal.md` when present, relevant Spec/Plan/Decisions, Git status/diff/history and current tests/CI evidence.

## Routing
- Canonical `.evo/` workspace missing/incomplete → `evo-setup`.
- Workspace exists but project structure/build/test/patterns are not yet understood → `evo-init`.
- User wants senior engineering/architecture guidance → `evo-advisor`.
- Material product/architecture decisions are unclear → `evo-grill-with-docs`.
- Current external technology facts are needed → `evo-research`.
- Settled non-trivial intent needs a Working Spec → `evo-spec`.
- Spec/intent exists but lacks fresh-Agent executable slices → `evo-plan`.
- User wants the prepared plan completed continuously → `evo-goal`.
- One bounded slice is ready → `evo-implement`.
- User explicitly wants test-first development or implementation should be driven by a behavioral seam → `evo-tdd`.
- Accepted intent changed → `evo-change`.
- An observed failure needs diagnosis/root cause → `evo-bug`.
- Acceptance claims need direct proof → `evo-verify`.
- Verified work needs independent Intent/Engineering/Evidence review → `evo-review`.
- Verified/reviewed work needs repository knowledge convergence → `evo-finish`.
- Work is ready for Git history or explicitly requested push → `evo-commit`.
- Existing work lost its current-session context → `evo-recover`.

Small mechanical edits may go directly to implementation/focused checks when no durable behavior, contract, architecture, format, test strategy or rationale changes.

## Output
Report current objective, verified facts, active `.evo/` owners, material unknowns, observed progress, blockers and exactly one next Skill with reason.

## Final checks
Do not edit files, implement work or invoke the destination workflow inside this Skill.