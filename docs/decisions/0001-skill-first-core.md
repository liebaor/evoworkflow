# Decision 0001 — EVO v1 uses a Skill-first Core with no mandatory EVO CLI

Status: Current on the `v1/skill-first-core` architecture branch.

## Problem

The 0.4.x CLI accumulated repository scanning, state, constraints, gates, evidence, Goal execution and distribution. This increased determinism but also created duplicated state, installation complexity and false hard blockers when deterministic heuristics could not understand valid Brownfield conventions such as dependency BOMs, transitive dependencies or non-standard CI/documentation layouts.

## Decision

EVO v1 removes the central CLI/runtime from Core.

Use Skills for semantic engineering methods, the repository for durable knowledge, project-native tests/build/lint/runtime/CI for deterministic evidence, Git for chronology, the coding-agent harness for execution, and humans for material authority.

No EVO-owned scanner, state machine, Goal Runner, generic gate engine or Evidence Engine is required for user projects.

## Consequences

Benefits:

- no EVO bootstrap/runtime dependency;
- project-local Skills fit normal Agent sandbox boundaries;
- fewer duplicated sources of truth and less state drift;
- stronger adaptation to existing repositories;
- model reasoning is used where semantic understanding is required;
- deterministic project rules remain enforceable through normal tests/CI.

Trade-offs:

- EVO no longer guarantees phase transitions through a proprietary state machine;
- process discipline depends on Skills, repository review and project feedback loops;
- high-assurance projects must encode their truly deterministic invariants in project-native tests/CI rather than expect EVO to infer them.

## Rejected alternative

Continue expanding the scanner/resolver/CLI until it understands more ecosystems. Rejected because the space of valid repository conventions is open-ended and because semantic project relevance is not a good fit for a central heuristic hard gate.

## Verification

The v1 working tree should contain no `evo` executable/package/runtime source, no `.evo` workflow database, and no user-facing Skill that requires an EVO CLI. README and Skills should describe repository-native operation only.