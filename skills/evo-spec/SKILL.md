---
name: evo-spec
description: Turn an understood non-trivial change into a bounded working proposal with clear ownership, alternatives, observable acceptance criteria, and direct evidence paths.
---

# EVO Spec

## Objective

Create or update one working owner for a substantial non-mechanical change. Adapt to the repository's existing Spec/RFC/proposal/design/ADR conventions instead of creating an EVO-specific spec system.

## Before writing

Re-read the user outcome, current docs, relevant stable decisions, real source/consumer paths, tests, and comparable implementations. Find an existing proposal or decision that already owns the change before creating a new file.

## Minimum content

Record:

- solution-independent problem and desired outcome;
- non-goals and boundaries;
- current relevant behavior/authority;
- proposed direction;
- genuine alternatives and why they lose;
- material risks/trade-offs;
- observable acceptance criteria;
- for each acceptance item, the likely failure surface and direct repository-native evidence that could falsify completion;
- unresolved human decisions.

Do not invent alternatives or pretend an unknown empirical result is already decided.

## Lifecycle

A working proposal describes intended work, not current behavior. It becomes stable/current only after implementation, direct evidence, and current docs agree. Small mechanical edits may not need a spec.