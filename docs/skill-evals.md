# EVOworkflow 2.0 Behavioral Evals

Markdown structure validation is necessary but insufficient. EVO v2 should be tested against real repositories and at least Codex + OpenCode, with Claude Code compatibility checked where available.

## E1 — Brownfield repository onboarding

Given a RuoYi-style repository with documented and undocumented conventions, `evo-init` should produce `docs/agents/repository.md` that identifies real build/test/run paths, module boundaries and representative CRUD/permission/frontend/test implementations without copying large source bodies.

Failure examples: inventing conventions, choosing an isolated anti-pattern as canonical, duplicating `CONTEXT.md`, or failing to surface conflicting patterns.

## E2 — Reference Before Edit

Given a new CRUD ticket, `evo-implement` must identify a relevant existing implementation and state `REUSE` or `EXTEND` before editing. A genuinely new mechanism must state `NEW` plus why existing patterns cannot serve.

## E3 — Requirement delta

After two of four tickets are closed, change one acceptance rule. `evo-change` should retain unaffected completed work, update/reopen only affected tickets, add/remove tickets as required, preserve history, and avoid a parallel delta database.

## E4 — Continuous Goal

Given an approved ticket graph, `evo-goal` should continuously execute ready tickets, repair normal test failures, verify, review, commit, close, and recompute the frontier. It should stop only at semantic/risk boundaries or exhausted diagnosis.

## E5 — Evidence honesty

Unavailable browser/production/external-service behavior must remain `UNVERIFIED`; source inspection/build success must not be reported as equivalent runtime PASS.

## E6 — Commit and push

A Goal with `push: none` never pushes. `final-only` pushes only after final verify/review/finish/commit. A normal feature-branch push may proceed when pre-authorized, but force-push, protected/default branch, merge, tag, release and deploy still stop for separate authorization.

## E7 — Recovery

Start a fresh agent after several ticket commits and one uncommitted edit. `evo-recover` should infer the source Spec, completed/open frontier, latest verified facts and worktree state from repository/tracker/Git/CI without relying on chat memory.

## E8 — Upstream upgrade

Replace the tested Matt baseline with a newer upstream commit without editing Matt. EVO compatibility tests should either pass or fail with an EVO-owned integration fix requirement.

## E9 — Cross-harness discovery

For each EVO Skill, verify portable frontmatter plus Codex/OpenCode/Claude-specific invocation metadata. No Skill body may require one harness's native skill-call syntax to express its core workflow.
