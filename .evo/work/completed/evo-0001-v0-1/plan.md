---
change: evo-0001-v0-1
status: APPROVED
approval:
  approvedAt: 2026-09-13T05:45:50.418Z
  approvedBy: human
  fingerprint: 68a80433b2bd7bd65a500648dc68eccb4c99fcd99cab5bd50b868f491d6e97e8
  source: human-confirmed
---

# EVOworkflow v0.1 implementation plan

## Reuse analysis

- oclif owns command discovery, parsing, help, and exit behavior.
- Zod owns runtime machine-state validation and JSON Schema generation.
- YAML owns readable machine persistence.
- Vitest owns deterministic behavior tests.
- Node filesystem, crypto, and child-process APIs own atomic files, approval hashing, direct process launch, and locks.

## Expected blast radius

Only this new standalone repository is changed. The DeepSeek Harness study repository and source specification remain read-only.

## Vertical Slices

### S1 — Repository can preserve EVO knowledge

Protocol docs, templates, Zod schemas, generated JSON Schemas, Decisions, and state model are complete and internally consistent.

- Acceptance: machine and narrative metadata validate; one fact has one declared owner; stale content approval fails.
- Expected paths: `src/core/`, `src/repository/`, `templates/`, `schemas/`, `docs/`, `.evo/decisions/`.
- Verification: schema drift check, artifact approval tests, and repository protocol check.
- Dependencies: none.
- Stop conditions: unresolved protocol ownership or a required compatibility Decision.

### S2 — User can initialize and navigate a real repository

`evo init`, `status`, `check`, and `doctor` support Greenfield/Brownfield/EVO-managed repositories, preserve existing files, and avoid false capability claims.

- Acceptance: source and built CLI classify representative repositories, preserve existing files, report evidence paths and unknowns, and recommend one valid next action.
- Expected paths: `src/repository/scanner.ts`, `src/repository/init.ts`, `src/core/navigation.ts`, `src/validation/`, `src/commands/`.
- Verification: scanner, initialization, navigation, validation, Doctor, built CLI, and real read-only repository experiments.
- Dependencies: S1.
- Stop conditions: false-positive project claims, destructive initialization, or an unresolved repository authority conflict.

### S3 — Agents can execute each human-controlled phase

Nineteen validated Skills define objectives, authorities, outcomes, evidence, stop conditions, and writes without automatically chaining phases.

- Acceptance: all expected Skill packages pass structural validation and fresh-agent forward tests preserve human phase control.
- Expected paths: `skills/`, `scripts/validate-skills.ts`, `docs/skill-contract.md`.
- Verification: local and skill-creator validators plus advisory, discovery, and recovery forward tests.
- Dependencies: S1.
- Stop conditions: a Skill grants itself approval, invents repository facts, or enters another phase automatically.

### S4 — User can delegate approved work safely

Goal create/approve/run/resume/inspect/cancel uses content-bound approval, sequential Slices, direct Agent Adapters, deterministic verification, locks, checkpoints, and `READY_FOR_REVIEW` completion.

- Acceptance: five approved Slices run sequentially through the built CLI; blockers and timeouts checkpoint; adapter or Change drift invalidates approval; no Goal state finishes a Change.
- Expected paths: `src/core/goal.ts`, `src/repository/goals.ts`, `src/repository/goal-execution.ts`, `src/agents/`, `src/commands/goal/`.
- Verification: Goal and adapter tests plus the built CLI five-Slice lifecycle smoke.
- Dependencies: S1 and S2.
- Stop conditions: ambiguous work, security or architecture Decisions, destructive operations, unexpected dependencies, scope expansion, repeated failure, or unbounded subprocess teardown.

### S5 — A new session can recover and validate the workflow

Examples and tests prove the 15 acceptance criteria, source and built CLI entry paths, self-hosted recovery, and documentation convergence.

- Acceptance: AC-01 through AC-15 each link to observed evidence or remain explicitly unverified; a fresh agent reconstructs this state without chat; review and Finish refuse unresolved evidence.
- Expected paths: `tests/`, `examples/`, `references/experiments/`, active `evidence.md`, and `review.md`.
- Verification: aggregate local checks, representative repository scans, independent forward tests, self-hosted `check/status/doctor`, and convergence report.
- Dependencies: S1 through S4.
- Stop conditions: any failed or unverified MVP acceptance criterion, open review finding, stale approval, or missing human acceptance.

## Verification

- Focused Vitest behavior tests for each module and negative path.
- `pnpm run typecheck`.
- `pnpm run test`.
- `pnpm run build` plus built CLI smoke tests.
- `pnpm run validate:skills`.
- Generated-schema drift check.
- `evo check`, `evo status`, and `evo doctor` against this repository.
- Acceptance matrix in `evidence.md` with unsupported external paths left `UNVERIFIED`.

## Rollback

This is a new repository with no production consumers. Revert individual files or commits after review; do not delete user-owned projects initialized during tests.
