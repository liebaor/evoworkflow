# EVOworkflow Working Model

## Default route

```text
ask-evo
  ↓
evo-init / evo-recover
  ↓
evo-grill-with-docs
  ↓
evo-research          (when current external facts matter)
  ↓
evo-spec              (for substantial/revisitable changes)
  ↓
evo-plan
  ↓
evo-implement
  ↓
evo-verify
  ↓
evo-review
  ↓
evo-finish
```

Requirement changes branch through `evo-change`. Observed failures branch through `evo-bug`.

The route is adaptive, not mandatory.

## Lightweight work

For local, low-risk, mechanically obvious edits:

```text
inspect → edit → focused check
```

A separate Spec or Plan is unnecessary when the change does not materially alter behavior, public contract, architecture, durable format, test strategy, or rationale.

## Standard work

For ordinary feature/behavior changes:

```text
clarify → plan/spec as needed → implement → verify → review → finish
```

## Strict work

For security, permissions, privacy, irreversible data, compatibility, external cost, major architecture, public protocol, or another material trade-off:

- make important human decisions explicit;
- use a working Spec/decision owner;
- reason about migration/rollback/compatibility;
- verify through the real failure surface and environment where possible;
- preserve explicit unverified boundaries when access is unavailable.

## Phase boundaries

A Skill owns one kind of work. Crossing a boundary should be explicit:

- implementation discovers changed intent → `evo-change`;
- implementation needs a new human product/architecture choice → `evo-grill-with-docs`;
- implementation needs a current external fact → `evo-research`;
- verification finds an implementation failure → back to `evo-implement` or `evo-bug`;
- review finds a Spec mismatch → `evo-change` or implementation depending on whether intent changed;
- verified/reviewed work needing current-truth convergence → `evo-finish`.

## Unknowns

Unknown does not automatically mean blocked. Stop only when different answers materially change the current task, evidence claim, or risk. Otherwise record the narrower uncertainty and continue within what is actually known.

## Evidence discipline

Every material acceptance claim should have a direct falsifying path. Prefer existing project commands and real consumers. Static inspection proves source facts, not runtime behavior. Build proves buildability, not product correctness. An unavailable environment remains `UNVERIFIED`.

## Convergence

The engineering loop ends when:

- accepted intent and implementation agree;
- direct evidence supports the claims being made;
- independent review is resolved;
- current docs describe current behavior;
- durable decisions describe current rationale where needed;
- working artifacts no longer misrepresent what is pending vs shipped.

`evo-finish` owns this convergence step.
