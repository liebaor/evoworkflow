---
name: evo-implement
description: Implement one bounded unit of accepted work using the repository's existing patterns and real feedback loops. Use when objective, scope, acceptance, and implementation boundary are clear. Stop and escalate if implementation uncovers a material requirement, architecture, or external-fact change.
disable-model-invocation: true
---

# EVO Implement

## Purpose

Build one bounded unit of work without widening scope, inventing parallel mechanisms, or silently changing accepted intent.

## Use when

- one slice or small task has a clear objective;
- scope and out-of-scope are known;
- acceptance is observable;
- material product/architecture decisions are settled enough to code safely.

## Do not use when

- the desired behavior is still ambiguous — use `evo-grill-with-docs`;
- an external/fresh fact could change the approach — use `evo-research`;
- accepted intent changed — use `evo-change`;
- the primary task is diagnosing an observed failure — use `evo-bug`.

## Preconditions

Before editing, establish:

1. objective and acceptance;
2. current bounded scope and explicit non-goals;
3. governing repository instructions and relevant decisions;
4. at least one representative existing pattern when available;
5. the real consumer/composition path the change must reach;
6. the smallest feedback loop that can catch mistakes early.

If any material precondition is missing, stop and route rather than guessing.

## Implementation loop

1. **Trace before editing.** Follow the existing path from public contract/entry point toward implementation, registration/composition, consumer, persistence, and user-visible result as applicable.
2. **Reuse before inventing.** Prefer existing security, permissions, response, data, transaction, error, logging, component, test, and configuration patterns.
3. **Change the smallest coherent surface.** Keep the patch tied to the current slice.
4. **Run fast feedback early.** Use focused tests, typecheck, build, API/browser/runtime checks, or other project-native loops appropriate to the changed failure surface.
5. **Keep authority surfaces aligned.** When an owned fact changes, update the source, tests, contracts, generated output, and current docs that own that same fact.
6. **Record unrelated discoveries.** Do not opportunistically refactor unrelated code.
7. **Finish the bounded unit, not the whole story.** Stop once this slice's implementation and focused feedback are complete.

## Escalation rules

Stop implementation and route when:

- user intent or acceptance changed → `evo-change`;
- a new material product/architecture choice is required → `evo-grill-with-docs`;
- a current external fact or compatibility question blocks the approach → `evo-research`;
- an unexpected observed defect becomes the primary problem → `evo-bug`;
- the slice proves too broad to reason about safely → return to `evo-plan`.

Do not hide a scope/decision change inside an implementation patch.

## Verification during implementation

Run the smallest relevant feedback loop while coding, but do not confuse focused developer feedback with final acceptance proof. Final acceptance evidence belongs to `evo-verify`.

## Output

Report:

- what changed;
- repository pattern/prior art reused;
- checks actually run and meaningful outcomes;
- checks skipped or unavailable;
- uncertainty/discoveries recorded for later;
- whether the bounded unit is ready for `evo-verify`.

## Final checks

Before stopping:

- patch scope still matches the task;
- no material decision was silently made;
- changed behavior is connected through the real path, not only a leaf file;
- relevant tests/contracts/docs were updated when their owned facts changed;
- no unrelated refactor was bundled in;
- completion language refers only to this bounded unit unless the entire change genuinely consists of this unit.
