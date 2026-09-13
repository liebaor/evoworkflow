# Engineering heuristics

Load only sections triggered by the current Change.

## Stateful domains

Name states, legal transitions, transition owner, invariants, retries, terminal states, and evidence for invalid transitions.

## Database changes

Check integrity constraints, transaction ownership, migration order, compatibility window, existing data, rollback or forward repair, and production verification boundaries.

## External integrations

Check timeout, bounded retry, idempotency, duplicate and out-of-order input, partial failure, observability, rate limits, credential ownership, and safe test environments.

## Cross-module changes

Name the primary module, stable contracts, dependency direction, expected blast radius, unaffected behavior, and reference implementation. Avoid sharing internals to save a small amount of code.

## Background work

Check restart, duplicate execution, checkpointing, cancellation, partial completion, process ownership, and recovery after host failure.

## Performance

Define workload, metric, baseline, profile evidence, target, and regression gate before optimizing. Do not infer performance from implementation style alone.

## Security and authorization

Identify actor, resource, operation, trust boundary, server-side enforcement, audit evidence, and failure behavior. Authentication does not imply authorization or data permission.

## Release and recovery

Identify compatibility, configuration rollout, migration, observability, rollback trigger, recovery procedure, and which evidence requires a real environment.
