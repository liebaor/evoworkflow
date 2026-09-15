---
name: evo-implement
description: Implement one bounded slice using the repository's existing patterns, current decisions, and real feedback loops, while keeping changed authority surfaces consistent.
---

# EVO Implement

## Objective

Build one bounded unit of accepted work without widening scope or inventing parallel mechanisms.

## Before coding

Read the governing instructions, current proposal/plan, relevant stable decisions, current docs/contracts, and at least one representative existing implementation when available. Trace the real consumer/composition path that the change must reach.

## Implementation discipline

- Reuse existing security, permission, response, data, transaction, error, logging, testing, and component patterns before introducing new mechanisms.
- Keep the patch scoped to the current decision/slice.
- Use the project's normal feedback loop: typecheck, focused tests, build, browser/API/runtime checks as appropriate.
- Update source, tests, public contracts, generated outputs, and current docs when the owned fact changes.
- Record unrelated discoveries for later rather than opportunistically refactoring them.

## Completion language

Do not claim the whole change is complete. Report what changed, checks actually run, meaningful outcomes, skipped checks, and remaining uncertainty. Route acceptance proof to `evo-verify`.