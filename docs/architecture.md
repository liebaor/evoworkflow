# Architecture

## Product boundary

EVOworkflow maintains durable repository engineering context across tasks, sessions and models.

It provides project evolution context to planning/coding/debugging/review workflows instead of replacing those workflows.

## Four layers

```text
Repository Truth
  source / tests / runtime / Git / CI
        ↓
EVO Skills
  init / refresh / change / learn / recover / ask
        ↓
EVO Knowledge
  .evo/project.md
  .evo/current.md
  .evo/references.md
  .evo/capabilities.md
  .evo/decisions/
  .evo/changes/
  .evo/learnings/
        ↓
Standing Agent Instructions
  AGENTS.md / equivalent existing instruction file
        ↓
Engineering Consumers
  planning / specification / ticketing / coding / debugging / review agents
```

## Repository Engineering Contract

The Repository Engineering Contract is the compact set of durable facts a future agent needs in order to work conformantly:

- architecture and module boundaries;
- build/run/test commands;
- engineering conventions and constraints;
- representative implementations by concern;
- reusable project/framework capabilities;
- current engineering state;
- durable decisions, accepted changes and promoted learnings.

It is an index into repository truth, not a copy of it.

## Consumption bridge

`evo-init` ensures the consumer repository's standing agent instruction file contains a small Repository Engineering Context section. That section tells any compatible engineering workflow when and how to consult `.evo/`.

The bridge should remain small and stable. Deep project knowledge stays in `.evo/` and is loaded progressively when relevant.

## Precedence

When sources disagree, use this reasoning order:

1. explicit current human-approved intent;
2. current executable/source contracts and runtime/test evidence;
3. authoritative repository instructions and current architecture/docs;
4. representative current production patterns;
5. EVO summaries and indexes;
6. general framework convention;
7. generic engineering preference.

EVO summaries accelerate discovery but do not override contradictory source evidence.

## Knowledge confidence

EVO uses three evidence strengths:

- **Authoritative** — explicitly required by repository instructions, current architecture/docs/contracts, or an accepted decision.
- **Representative** — strongly supported by current, repeated, production usage and preferably tests.
- **Observed** — seen in limited evidence; useful as a lead but not safe to treat as a repository rule.

Observed facts must not silently become normative conventions.

## Freshness

Durable repository knowledge records an observation point, normally a Git commit plus relevant references.

A newer HEAD does not automatically make all knowledge stale. `evo-refresh` compares changes since the observation point, identifies knowledge whose evidence surface changed, and refreshes only affected areas.

## Change propagation

Accepted intent changes are handled by semantic delta rather than full regeneration:

```text
previous intent
    ↓
new intent
    ↓
semantic delta
    ↓
impact analysis
    ↓
affected / unaffected
    ↓
selective invalidation
    ↓
normal engineering workflow continues with updated context
```

Invalidation may apply to project knowledge, current implementation assumptions, tests/evidence, tickets/specifications, or decisions. Unaffected work remains valid.

## Learning loop

Bugs, reviews, incidents and implementation work can reveal project-specific knowledge. `evo-learn` promotes only lessons that are stable, project-specific, likely to help future agents, and not already owned elsewhere.

A promoted learning may remain in `.evo/learnings/` or update a stronger owner such as `capabilities.md`, `references.md`, `project.md`, or a decision.

## Recovery

`evo-recover` reconstructs engineering state from the repository instead of requiring a previous conversation handoff. It uses standing instructions, `.evo/current.md`, active changes, relevant durable knowledge, Git state, recent history, tests/CI and working tree evidence.

## Non-goals

EVOworkflow is not:

- a replacement issue tracker;
- a required specification format;
- a complete software development methodology;
- a chat-memory system;
- a framework tutorial database;
- an encyclopedia of every source file;
- a runtime state machine that must mediate every coding action.
