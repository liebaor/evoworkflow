---
name: evo-spec
description: Synthesize an understood non-trivial change into one bounded working proposal with clear outcome, scope, trade-offs, acceptance, and evidence paths. Use after material decisions are resolved; do not use this Skill to interview the user or to invent unresolved decisions.
disable-model-invocation: true
---

# EVO Spec

## Purpose

Create or update one working owner for a substantial change so a future Agent can understand what is intended and how completion will be judged.

## Use when

- the change spans multiple files/modules/sessions;
- the work changes behavior, public contracts, architecture, durable data, permissions, compatibility, or another revisitable decision;
- a shared proposal is needed before planning or implementation;
- acceptance and trade-offs need to be explicit.

## Do not use when

- material product/architecture decisions are still open — use `evo-grill-with-docs`;
- a critical external fact is unresolved — use `evo-research`;
- the change is a tiny mechanical/local edit with obvious acceptance;
- the user asked only for implementation of an already-owned bounded task.

## Preconditions

Before writing:

1. re-read the user outcome and settled decisions;
2. inspect relevant current docs, source behavior, public contracts, tests, and representative patterns;
3. find an existing Spec/RFC/proposal/design/decision artifact that already owns the change;
4. prefer updating the existing owner over creating a parallel proposal.

If a material unresolved decision appears, stop and route back to `evo-grill-with-docs` or `evo-research` rather than silently choosing.

## Write the working proposal

Adapt to the repository's existing format. At minimum capture:

### Problem

State the problem in solution-independent terms. It should remain true even if the preferred implementation is removed.

### Desired outcome

Describe the observable result from the user/operator/system perspective.

### Non-goals and boundaries

Make exclusions explicit so implementation does not widen scope.

### Current relevant behavior

Point to the current owner/source/pattern that the change builds on or replaces.

### Proposed direction

Describe the selected direction at the right abstraction level. Avoid unstable file-by-file implementation detail unless the path itself is a stable contract.

### Alternatives and trade-offs

Include only genuine alternatives that were actually viable. Explain why they lose and what the chosen direction gives up.

### Acceptance

For each acceptance item define:

1. observable behavior or absence;
2. likely failure surface;
3. direct evidence that could falsify completion.

Acceptance should test outcomes, not merely implementation steps.

### Risks and unresolved items

Record known risks and any explicitly deferred decision. Do not pretend an empirical unknown is settled.

## Output

Return:

- proposal/issue path or identifier;
- one-paragraph scope summary;
- acceptance list;
- unresolved/deferred items;
- next recommended Skill, usually `evo-plan`.

## Final checks

Before calling the Spec ready:

- one artifact clearly owns the intended change;
- the problem is solution-independent;
- non-goals prevent obvious scope creep;
- alternatives are real, not template filler;
- acceptance is observable and falsifiable;
- evidence paths match likely failure surfaces;
- no material decision was invented inside the Spec;
- the document describes intended future work, not falsely current behavior.
