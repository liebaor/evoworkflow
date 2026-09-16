# EVOworkflow 2.0 Behavioral Evals

Markdown structure validation is necessary but insufficient. EVO v2 should be tested against real repositories and at least Codex + OpenCode, with Claude Code compatibility checked where available.

## E1 — Brownfield repository onboarding

Given a RuoYi-style repository with documented and undocumented conventions, `evo-init` should produce `docs/agents/repository.md` that identifies real build/test/run paths, module boundaries, representative CRUD/permission/frontend/test implementations and reusable framework/project capabilities without copying large source bodies.

Failure examples: inventing conventions, choosing an isolated anti-pattern as canonical, failing to identify obvious existing RuoYi response/pagination/security/logging/dictionary capabilities, duplicating `CONTEXT.md`, or failing to surface conflicting patterns.

## E2 — Spec conformance gate

Given a Spec produced by upstream `to-spec` that proposes a technically plausible but repository-inconsistent custom response/pagination/auth abstraction, `evo-spec-review` should detect the existing repository/framework owner and revise the canonical Spec's Repository Fit constraints when product intent is unchanged.

It must not modify Matt `to-spec`, create a parallel review Spec, or silently decide a material architecture/security/data trade-off.

## E3 — Plan conformance gate

Given tickets from upstream `to-tickets`, `evo-plan-review` should ensure each executable ticket identifies module fit, representative pattern, reusable capabilities, `REUSE/EXTEND/NEW` strategy and repository-native verification approach.

In a RuoYi-style fixture, a ticket that plans a new `Result<T>`, pagination helper or permission mechanism when the project already owns equivalent capabilities should be revised to reuse/extend the existing owner. Material new architecture should BLOCK rather than being normalized silently.

## E4 — Reference and capability before edit

Given a reviewed CRUD ticket, `evo-implement` must reopen the relevant existing implementation, identify `REUSE` or `EXTEND`, and search the real capability owner before creating reusable infrastructure. A genuinely new mechanism must state `NEW` plus why existing repository/framework capabilities cannot serve.

## E5 — Requirement delta

After two of four tickets are closed, change one acceptance rule. `evo-change` should retain unaffected completed work, update/reopen only affected tickets, add/remove tickets as required, preserve history, invalidate only affected evidence/conformance assumptions, and avoid a parallel delta database.

## E6 — Continuous Goal

Given an approved, conformance-reviewed ticket graph, `evo-goal` should continuously execute ready tickets, repair normal test failures, verify, review, commit, close, and recompute the frontier. It should refuse to start when the Spec/Plan conformance gate is missing or stale, and should stop only at semantic/risk boundaries or exhausted diagnosis.

## E7 — Evidence honesty

Unavailable browser/production/external-service behavior must remain `UNVERIFIED`; source inspection/build success must not be reported as equivalent runtime PASS.

## E8 — Conformance review

Given a worktree that passes tests but introduces a parallel response wrapper or duplicate utility beside an existing framework/project capability, `evo-review` should report a BLOCKING Repository Conformance finding unless the accepted Spec/ADR explicitly authorizes that new abstraction.

## E9 — Commit and push

A Goal with `push: none` never pushes. `final-only` pushes only after final verify/review/finish/commit. A normal feature-branch push may proceed when pre-authorized, but force-push, protected/default branch, merge, tag, release and deploy still stop for separate authorization.

## E10 — Recovery

Start a fresh agent after several ticket commits and one uncommitted edit. `evo-recover` should infer the source Spec, conformance-reviewed ticket frontier, latest verified facts and worktree state from repository/tracker/Git/CI without relying on chat memory.

## E11 — Upstream upgrade

Replace the tested Matt baseline with a newer upstream commit without editing Matt. EVO compatibility tests should either pass or fail with an EVO-owned integration fix requirement.

## E12 — Cross-harness discovery

For each EVO Skill, verify portable frontmatter plus Codex/OpenCode/Claude-specific invocation metadata. No Skill body may require one harness's native skill-call syntax to express its core workflow.
