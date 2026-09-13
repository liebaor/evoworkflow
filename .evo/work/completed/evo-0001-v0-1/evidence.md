# evoworkflow v0.1 Evidence

| Acceptance | Status | Evidence | Scope |
|---|---|---|---|
| AC-01 | PASS | Fresh-agent recovery matched objective, phase, checkpoint ids, blockers, and next human action; see `references/experiments/2026-09-13-forward-tests.md` | repository recovery |
| AC-02 | PASS | Scanner tests plus read-only RuoYi and SDD_Study initialization previews; see `references/experiments/2026-09-13-init-results.md` | synthetic and real local checkouts |
| AC-03 | PASS | Fresh solution-discovery forward test left foundation unselected and recorded a Plane/Odoo/Frappe comparison; see `references/experiments/2026-09-13-greenfield-discovery.md` | requirements-only Greenfield example |
| AC-04 | PASS | `tests/workflow.test.ts` records one Standard Change through Grill, Plan, Implement, Verify, Review, and Finish; every phase boundary is persisted and observed before the next action | local repository protocol |
| AC-05 | PASS | The requirement Delta scenario records OLD/NEW/RETAIN/MODIFY/REMOVE/ADD, then edits approved intent; `validateProject` reports `STALE_ARTIFACT_APPROVAL` and convergence refuses to proceed | local repository protocol |
| AC-06 | PASS | The bug scenario observes a real local fixture failure, applies a bounded fix, observes the same entry pass, and records reproduction, root cause, regression, and `UNVERIFIED` real-entry status | local fixture; real application path remains unverified |
| AC-07 | PASS | `tests/navigation.test.ts` and built CLI status smoke show one non-executing recommendation from state | navigation |
| AC-08 | PASS | Fresh architecture forward test stopped at `NEEDS_INFO` for an unapproved RBAC/security Decision and named repository evidence | separate read-only SDD_Study checkout |
| AC-09 | PASS | `skills/evo-engineering/SKILL.md` routes topic-specific heuristics; fresh architecture forward test used the routed guidance | context-specific advice |
| AC-10 | PASS | `tests/goal.test.ts` and built CLI smoke execute five dependent Slices sequentially with persisted PASS checkpoints | deterministic adapter + real subprocess checks |
| AC-11 | PASS | `tests/goal.test.ts` blocks a security Decision and continues an independent Slice | deterministic Goal engine |
| AC-12 | PASS | Goal tests and built CLI smoke end at `READY_FOR_REVIEW`; active Change remains unarchived | Goal lifecycle |
| AC-13 | PASS | `tests/convergence.test.ts` proves pending Evidence does not move work and accepted fixture convergence archives work and promotes Decisions | local convergence fixtures |
| AC-14 | PASS | `tests/recovery.test.ts` reconstructs a persisted `RUNNING` Goal after interruption, refuses a stale locked rerun, reports `STALE_GOAL_LOCK`, and preserves `currentSlice` | persisted interruption fixture; host-kill recovery remains unverified |
| AC-15 | PASS | `tests/validation.test.ts` rejects duplicate primary authorities | repository validator |

## Commands executed

Verification date: 2026-09-13 (Asia/Shanghai).

- `pnpm run check` — PASS; typecheck, 13 test files/49 tests, build, built CLI smoke, 19-Skill validation, and 7 generated-schema checks.
- `pnpm run generate:schemas` and `pnpm run check:schemas` — PASS; the Review metadata projection includes the explicit accepted-limitations flag.
- `pnpm exec vitest run tests/workflow.test.ts tests/recovery.test.ts tests/validation.test.ts` — PASS; 3 focused test files/9 tests, including the new S5 scenarios.
- `pnpm exec vitest run tests/convergence.test.ts tests/workflow.test.ts tests/recovery.test.ts` — PASS; 3 focused test files/9 tests, including the external-evidence convergence gate.
- `for skill in skills/*; do if [ -d "$skill" ]; then python3 /home/zhicheng/.codex/skills/.system/skill-creator/scripts/quick_validate.py "$skill" || exit 1; fi; done` — PASS; 19 Skill directories passed the Skill Creator quick validator.
- `node dist/index.js check --root .` — PASS; zero protocol errors and zero warnings.
- `node dist/index.js status --root .` — PASS before final human acceptance; reports `VERIFY / AWAITING_APPROVAL`, `S1..S5=PASS`, and recommends `/evo-verify`.
- `node dist/index.js doctor --root .` — PASS before final Finish with the expected `UNVERIFIED_ACTIVE_WORK` warning.
- `node dist/index.js init --root .` — PASS; read-only self-scan reports `EVO_MANAGED`, `HIGH`, and 122 inspected files; no files were written.
- `node dist/index.js finish --root .` — expected exit 1 before final human acceptance; no files moved because external/operational evidence and human review acceptance remained pending.
- `node dist/index.js finish --root .` — PASS after `acceptedLimitations: true` was recorded in the human-approved Review; the report kept external evidence `UNVERIFIED` while classifying it as an accepted limitation.
- `node dist/index.js finish --root . --apply` — PASS; archived `evo-0001-v0-1`, promoted two working Decisions to current, and set State to `IDLE/COMPLETED`.
- Post-Finish `node dist/index.js status --root .`, `check --root .`, and `doctor --root .` — PASS; no active work, zero protocol issues, and no repair applied.
- `node dist/index.js --help` — PASS; built oclif entry discovered commands.

## Unverified external or operational paths

- Live Codex, Claude Code, and OpenCode model execution: UNVERIFIED by automated tests.
- Windows and macOS behavior: UNVERIFIED locally; CI currently covers Linux Node 22/24 after publication.
- GitHub Actions execution: UNVERIFIED until the repository is published.
- `evo` as a globally installed command: UNVERIFIED; the fresh recovery environment used `node dist/index.js` because `evo` was not on `PATH`.
