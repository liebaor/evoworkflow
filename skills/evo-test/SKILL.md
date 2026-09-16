---
name: evo-test
description: Manually run a broad, risk-based project-native test pass for a feature or change, including critical user journeys when practical, without adding a new test framework by default.
compatibility: "Codex, Claude Code, OpenCode; project-native tests/runtime; optional browser or E2E capability"
disable-model-invocation: true
metadata:
  opencode/autoinvoke: "false"
---

# EVO Test

## Purpose

Run an explicit, on-demand test pass when the user wants broader confidence than the normal implementation loop provides. This Skill is **manual only** and is not part of the default `evo-goal` lifecycle.

Use the repository's existing test stack and runtime paths. Do not install or introduce a new test framework merely to satisfy this Skill unless the user explicitly asks for that change.

## Read first

Read the owning Spec/ticket or requested scope, `docs/agents/repository.md`, relevant acceptance criteria, existing test commands/configuration, representative tests, application run instructions, and the implementation diff.

## Test selection

Choose the smallest set of tests that gives meaningful confidence for the changed behavior. Consider these layers in order and run only the ones relevant to the change:

1. **Static/project checks** — build, compile, typecheck, lint, or equivalent project-native checks.
2. **Focused behavior tests** — existing unit/service/component tests around the changed rules.
3. **Integration/API tests** — persistence, transactions, HTTP/API contracts, or service composition when those boundaries changed.
4. **Critical user journey** — for user-visible behavior, exercise one or more important end-to-end flows through the real application when an existing browser/E2E or interactive application capability is available.

Examples of user journeys include login → navigate → create/edit/search/delete or the equivalent primary workflow for the feature.

## Risk add-ons

Add extra checks only when the change makes them relevant, for example:

- permission/auth changes → authorized + unauthorized/negative paths;
- data migration/schema changes → migration/compatibility checks;
- duplicate submission or transactional workflows → idempotency/concurrency-sensitive checks;
- external integrations → contract or real integration checks when the boundary is available;
- explicitly performance-sensitive work → project-native performance/load checks when they already exist.

Do not turn every test run into a full QA program.

## User simulation

When browser/application interaction is available, behave like a real user instead of only inspecting source:

- start from the normal user entry point;
- use realistic data;
- perform the critical happy path;
- try a small number of high-value failure/edge actions relevant to the feature;
- observe visible results and important side effects through supported product interfaces.

Prefer existing automated E2E tests when the repository has them because they are repeatable. Interactive Agent/browser operation is useful as current acceptance evidence but does not replace durable automated regression coverage.

If the required browser/application/external boundary cannot be exercised, report it as `UNVERIFIED`; do not infer PASS from lower-level tests.

## Status

For each tested behavior report:

- `PASS` — the selected evidence was actually executed/observed and supports the behavior;
- `FAIL` — executed evidence contradicts the expected behavior;
- `UNVERIFIED` — the necessary boundary or environment was unavailable or not run.

## Boundary

Testing and diagnosis are separate from implementation. Do not silently change production code while running this Skill. On failure, report the failing evidence and recommend `diagnosing-bugs` or `evo-implement` as appropriate unless the user explicitly asked for a test-and-fix loop.

## Output

Return a concise report with:

- scope tested;
- commands/paths actually executed;
- critical user journey performed, if any;
- `Behavior | Evidence | Status`;
- failures and likely next diagnostic step;
- important `UNVERIFIED` boundaries.
