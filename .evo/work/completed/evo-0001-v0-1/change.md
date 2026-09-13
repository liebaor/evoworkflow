---
id: evo-0001-v0-1
weight: LARGE
status: APPROVED
approval:
  approvedAt: 2026-09-13T04:45:51.632Z
  approvedBy: human
  fingerprint: a34d13a88fc250b8b116455139d66b6221cfbbb7ba7e615c5fe495d704cdc2a5
  source: active-thread-goal
---

# EVOworkflow v0.1

## Problem

Coding agents can generate code but lack a durable, human-controlled engineering protocol for long-lived repositories. Important intent, Decisions, current state, and Evidence are easily lost in chat or silently diverge from implementation.

## Goal

Deliver an independent EVOworkflow v0.1 that lets humans control requirements, Decisions, approvals, phase transitions, and acceptance while agents execute bounded work and the repository preserves durable knowledge and evidence.

## Scope

- Repository Protocol and machine schemas.
- Brownfield and Greenfield initialization with report-before-write behavior.
- Nineteen outcome-oriented advisory, discovery, planning, execution, quality, and maintenance Skills.
- Deterministic `evo` CLI for init, status, check, Doctor, and Goal lifecycle.
- Sequential single-agent Goal execution with approval fingerprints, checkpoints, verification, stop conditions, and recovery.
- Tests, example repositories, contributor instructions, operations docs, and CI.

## Non-goals

- Multi-agent parallel execution.
- Cloud control plane, dashboard, central or vector database.
- Automatic commit, merge, release, deployment, or production writes.
- Automatic product or architecture Decisions.
- Complex framework-specific profiles or plugin marketplace.

## Acceptance

- AC-01: A new agent can recover current objective, phase, completed/pending work, blockers, and next action without chat history.
- AC-02: Brownfield Init identifies observable stack, commands, authorities, capabilities, and reference implementations without fixture or prose false positives.
- AC-03: Greenfield guidance performs mature-solution discovery before custom bootstrap.
- AC-04: A Standard Feature can traverse Grill, Plan, Implement, Verify, Review, and Finish with explicit phase boundaries.
- AC-05: Requirement Change records OLD/NEW/RETAIN/MODIFY/REMOVE/ADD and invalidates stale approval.
- AC-06: Bug workflow records reproduction, failing evidence, root cause, regression evidence, and real-path status.
- AC-07: `ask-evo` and `evo status` accurately navigate from repository state without executing the recommendation.
- AC-08: Architecture advice is grounded in repository authority and evidence.
- AC-09: Engineering advice loads only heuristics triggered by the Change.
- AC-10: A Goal executes at least five approved Slices sequentially and persists each checkpoint.
- AC-11: Goal execution stops when an unapproved Decision is required while independent Slices may continue.
- AC-12: A Goal cannot Finish a Change and ends successful execution at `READY_FOR_REVIEW`.
- AC-13: Finish requires convergence of approved intent, Decisions, implementation, tests, Evidence, and current docs.
- AC-14: Recovery handles interrupted or blocked Goal state without chat history.
- AC-15: Validation rejects multiple primary authorities for one long-term fact.

## Boundaries

- Primary modules: `src/core`, `src/repository`, `src/validation`, `src/agents`, and `src/commands`.
- Product knowledge: `docs`, `skills`, `templates`, and generated `schemas`.
- Unaffected external systems: no coding model, Git host, deployment, or production environment is invoked by tests.
