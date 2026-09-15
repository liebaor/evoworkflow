---
name: evo-spec
description: Synthesize already-understood non-trivial intent into a canonical Working Spec under .evo/specs/. Use when behavior, contract, architecture, durable format or multi-session work needs an explicit acceptance owner. Do not use to interview unresolved product decisions.
---

# EVO Spec

## Preconditions
Material product/architecture choices are settled. If not, return to `evo-grill-with-docs`. External facts requiring current research are resolved.

## Read first
`.evo/project.md`, `.evo/context.md`, relevant Decisions/Research, current source/contracts/tests and the settled user outcome.

## Workflow
Create/update one `.evo/specs/<change>.md` with:
- solution-independent Problem;
- desired Outcome;
- Non-goals;
- current relevant behavior/pattern;
- proposed Direction;
- genuine Alternatives and why they lose;
- risks/trade-offs;
- observable Acceptance criteria;
- for each acceptance item: likely failure surface and direct evidence path;
- unresolved non-blocking uncertainty.

Do not include brittle implementation trivia merely to make the document longer.

## Lifecycle
A Working Spec describes intended change, not current truth. After implementation/review, `evo-finish` moves durable rationale to Decisions/current docs and prevents stale proposal language from masquerading as current behavior.

## Output
Return the Spec path, key acceptance items and recommend `evo-plan` unless the change is small enough for direct implementation.