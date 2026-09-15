# EVOworkflow v1 Working Model

## Default route

```text
ask-evo
  ↓
init / recover
  ↓
grill or research when uncertainty matters
  ↓
spec for substantial non-mechanical changes
  ↓
plan bounded vertical slices
  ↓
implement one slice
  ↓
verify with project-native evidence
  ↓
independent review
```

Requirement changes branch through `evo-change`. Observed failures branch through `evo-bug`.

## Adaptive process

Do not force every task through every stage.

### Lightweight

Use for local, low-risk, mechanically obvious edits that do not change behavior, public contract, architecture, durable format, test strategy or rationale.

`inspect → edit → focused check`

### Standard

Use for ordinary features/behavior changes.

`clarify → plan/spec as needed → implement → verify → review`

### Strict

Use when the change affects security, permissions, privacy, irreversible data, compatibility, external cost, major architecture or another material trade-off.

Add explicit human decision points, migration/rollback reasoning and stronger direct evidence through the real environment.

## Unknowns

Unknown does not automatically mean blocked. An unknown should stop work only when different answers materially change the current task or create unacceptable risk. Otherwise record the uncertainty and continue within the narrower claim that evidence supports.

## Evidence discipline

Every acceptance claim should have a direct falsifying path. Prefer existing project commands and real consumers. A static inspection proves source shape, not runtime behavior. A build pass proves buildability, not product correctness. An unavailable environment remains explicitly unverified.

## Convergence

Before delivery, current implementation, current docs/contracts, stable decision rationale and relevant executable evidence should agree. Do not call work complete because a document status changed or a generic checker returned zero.