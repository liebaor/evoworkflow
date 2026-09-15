---
name: evo-tdd
description: Drive one behavior through test-first development using a valid RED, minimal GREEN and safe REFACTOR. Use when the user requests TDD/test-first development or a planned slice has a stable behavior seam worth pinning with automated tests.
---

# EVO TDD

## Purpose
Use tests to drive implementation behavior, not to decorate finished code.

## Read first
`.evo/project.md`, `.evo/context.md`, current Spec/Plan acceptance, relevant Decisions and existing tests around the target public seam.

## Choose the seam
Test behavior through the highest stable public interface that gives useful feedback. Prefer existing seams and project testing conventions. Avoid private methods/internal collaborator choreography unless that is itself the public contract.

## Loop
1. **One behavior** — choose one observable acceptance slice.
2. **RED** — write one focused test first.
3. Run it and confirm the failure is specifically because the target behavior is absent/wrong. Import errors, broken fixtures, unavailable environment or syntax failures are not a valid RED; repair the feedback loop first.
4. **GREEN** — write the minimum coherent production code to pass that test. Do not pre-build future slices.
5. Run the focused test and nearby regressions.
6. **REFACTOR** — only while green, improve names/structure or remove duplication without changing behavior; rerun tests.
7. Repeat vertically, letting each cycle teach the next.

## Anti-patterns
- bulk-writing all tests before implementation;
- tautological expected values computed the same way as production code;
- testing implementation details that break under behavior-preserving refactors;
- mocking the system under test so heavily that the real consumer path is never exercised;
- accepting a red test whose failure is unrelated to the target behavior.

## Boundary
TDD is implementation method, not final acceptance proof. After implementation use `evo-verify` for the full evidence map.

## Output
Report the seam, RED reason, GREEN change, tests run and any acceptance still not covered.