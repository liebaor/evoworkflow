---
name: evo-plan
description: Break accepted intent into fresh-Agent-sized executable slices with clear scope, blocking edges, repository prior art, and direct verification. Use when the desired outcome is understood but implementation work is not yet safely bounded.
disable-model-invocation: true
---

# EVO Plan

## Purpose

Turn accepted intent into the smallest set of independently understandable, implementable, and verifiable slices.

## Use when

- the change is too large for one safe implementation step;
- multiple modules or consumer paths must converge;
- a fresh Agent/session should be able to pick up one slice without relying on chat history;
- dependency order and verification need to be explicit.

## Do not use when

- the task is a tiny mechanical edit with obvious scope and verification;
- material intent is still unclear — use `evo-grill-with-docs`;
- a substantial change lacks an owning proposal — use `evo-spec` first;
- the current slice is already clear and ready to build — use `evo-implement`.

## Read first

Read the accepted intent owner: Spec/RFC/issue/proposal or equivalent. Also inspect relevant repository instructions, stable decisions, existing implementations/tests, and the real consumer path.

Reuse the repository's issue tracker or planning convention instead of creating an EVO-specific task system.

## Slice contract

Every slice must be understandable in a fresh session. Record:

### Objective

What coherent observable progress this slice delivers.

### Source of truth

Link the owning Spec/issue/decision and the acceptance items this slice covers.

### Scope

What may change in this slice.

### Out of scope

What must not be pulled in opportunistically.

### Existing pattern / prior art

Point to one or more representative implementations, tests, components, or repository conventions to reuse.

### Blocking edges

List only real dependencies that must be resolved first. Avoid serializing work that is actually independent.

### Likely areas

Name likely modules/files only when supported by repository evidence. Do not pretend exact paths are known when they are not.

### Implementation seam

Identify the narrowest coherent seam through which the slice can be built and exercised.

### Verification

State the direct project-native command, test, API/UI/runtime path, or inspection that can falsify this slice's completion.

### Knowledge convergence

Identify current docs/contracts/decision surfaces that must change if their owned fact changes.

## Slice design rules

- Prefer vertical slices through the real composition path over layer-only tasks such as "build all backend first".
- Make slices small enough for one focused Agent/session but large enough to produce coherent, independently testable progress.
- Avoid artificial micro-tasks that cannot be verified on their own.
- Put risky unknowns early when resolving them can invalidate later work.
- Preserve existing working behavior between slices when practical.

## Fresh-Agent test

Before finalizing each slice, ask:

> If a new Agent receives only this slice, the linked owner documents, and the repository, can it understand what to change, what not to change, which pattern to follow, and how to prove the result?

If not, the slice is not ready.

## Output

Return:

- ordered slice list;
- blocking edges;
- acceptance coverage;
- first recommended slice;
- any unresolved item that prevents a slice from being executable.

## Final checks

- every acceptance item is covered or explicitly deferred;
- no slice depends on private chat context;
- verification is concrete, not "test it";
- plan does not become architecture authority;
- unrelated refactors are not hidden inside slices;
- the first unblocked slice is ready for `evo-implement`.
