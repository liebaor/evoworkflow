---
name: evo-finish
description: Converge a verified and reviewed change into clean repository current truth. Use after implementation, verification, and review are complete to update current docs and durable decisions, close or settle working artifacts, remove stale temporary guidance, and leave the repository understandable to the next Agent. Do not implement new feature scope.
disable-model-invocation: true
---

# EVO Finish

## Purpose

Close the engineering loop by making the repository's current truth match what actually shipped.

## Use when

- implementation is complete for the accepted change;
- `evo-verify` has produced direct evidence;
- `evo-review` has no unresolved blocking findings, or an explicit accepted unverified boundary is documented;
- the remaining work is lifecycle/documentation convergence rather than feature implementation.

## Do not use when

- material acceptance still FAILs;
- blocking review findings remain;
- product intent is still changing;
- new implementation scope is required.

## Read first

Read:

1. original outcome and non-goals;
2. active Spec/issue/proposal/plan;
3. verification result;
4. review findings/readiness;
5. current docs and durable decision records affected by the change;
6. final Git diff.

## Converge current truth

### 1. Update current documentation

Update only docs whose owned facts changed: architecture, API/package/user/operations docs, examples, generated references, or other current-truth surfaces.

Use present tense for what is now true. Do not leave future-proposal language describing already shipped behavior.

### 2. Converge durable decisions

When the repository keeps ADRs/decision records, ensure stable rationale describes the decision that actually shipped:

- preserve why the choice won;
- preserve meaningful alternatives and consequences;
- record compatibility/migration/reintroduction constraints when important;
- cross-link replacement decisions rather than rewriting history deceptively.

Do not create a Decision merely to mark every small feature as complete.

### 3. Settle working artifacts

Follow the repository's existing convention:

- close/update the issue;
- mark the plan complete;
- move or rewrite a working proposal if that is how the repository records lifecycle;
- remove temporary notes that no longer have future value;
- keep useful historical rationale only where the repository normally keeps it.

Avoid creating an archive system when none exists.

### 4. Check consistency

Confirm:

- current docs match current behavior;
- tests/contracts match shipped behavior;
- no obsolete working proposal reads as if it is still pending;
- review findings are resolved or explicitly accepted;
- known UNVERIFIED boundaries remain explicit;
- no duplicate current owner was created.

### 5. Respect human authority

If the repository or user requires explicit product/release acceptance, obtain it before presenting the change as fully accepted. Do not infer business acceptance from passing tests.

## Output

Lead with **what is now true**.

Then report:

- current docs updated;
- decision lifecycle changes, if any;
- plan/issue/proposal lifecycle changes;
- temporary/stale artifacts removed;
- verification/review status carried forward;
- explicit remaining unverified boundaries;
- whether the repository is cleanly handoff-ready.

## Boundaries

- Do not add new feature scope.
- Do not silently fix blocking implementation defects; route back to `evo-implement`, `evo-bug`, or `evo-change`.
- Do not create a Git commit, tag, release, or push unless the user explicitly asks for delivery actions.

## Final checks

A change is finished only when:

1. accepted behavior and implementation agree;
2. direct evidence supports the claims being made;
3. independent review is resolved;
4. current docs describe current behavior;
5. durable decisions describe current rationale where needed;
6. working artifacts no longer misrepresent lifecycle;
7. the next fresh Agent can understand what is now true without relying on the closing chat.
