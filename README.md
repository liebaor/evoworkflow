# EVOworkflow

EVOworkflow is a repository-centered project evolution layer for long-running AI-assisted software development.

It keeps durable engineering context in the repository so coding agents can understand how the project works, reuse what already exists, detect stale knowledge, propagate requirement changes, retain project-specific learning, and recover work across sessions and models.

## What EVO owns

EVO focuses on six capabilities:

1. **Repository Intelligence** — understand architecture, module boundaries, commands, representative implementations, and reusable capabilities.
2. **Knowledge Freshness** — detect when stored project knowledge may have become stale and refresh only affected areas.
3. **Change Propagation** — model semantic deltas, impact, affected/unaffected areas, and selective invalidation.
4. **Engineering Learning** — promote durable project-specific lessons from bugs, reviews, incidents, and implementation discoveries.
5. **Repository Continuity** — reconstruct current engineering state from repository evidence rather than chat memory.
6. **Routing** — decide when EVO intervention is useful and when normal engineering work should continue.

EVO does not prescribe how every feature must be specified, planned, implemented, tested, or reviewed. Those workflows consume EVO context through the repository's standing agent instructions.

## Core model

```text
Repository source / tests / Git / CI
                │
                ▼
            EVO Skills
                │
                ▼
        .evo knowledge layer
                │
                ▼
           AGENTS.md
                │
                ▼
   Coding / planning / review agents
```

`AGENTS.md` is the consumption bridge. `.evo/` is the durable knowledge layer. Source code, tests, runtime behavior, Git and CI remain the strongest evidence for current truth.

## Core Skills

| Skill | Responsibility |
|---|---|
| `evo-init` | Build the initial Repository Engineering Contract from real repository evidence. |
| `evo-refresh` | Refresh stale repository knowledge from changes since the last observation point. |
| `evo-change` | Analyze accepted intent changes and selectively invalidate affected knowledge/work. |
| `evo-learn` | Promote durable project-specific engineering learning without creating a knowledge dump. |
| `evo-recover` | Reconstruct current work and reliable context from repository evidence. |
| `ask-evo` | Route to the single most useful EVO action, or say that normal engineering work should continue. |

## Repository Engineering Contract

A consumer repository initialized by EVO uses a compact knowledge structure:

```text
.evo/
├── project.md
├── current.md
├── references.md
├── capabilities.md
├── decisions/
├── changes/
└── learnings/
```

The contract is intentionally index-like rather than encyclopedic. It should help an agent find the right source and pattern quickly, not replace the source tree.

## Core principles

- **Repository > Chat** — durable project context lives in the repository.
- **Source > Summary** — EVO knowledge accelerates navigation; source/tests/runtime evidence resolve conflicts.
- **Current Truth > Historical Assumption** — knowledge carries observation metadata and may need refresh.
- **Existing Pattern > Reinvention** — representative project usage is preferred over parallel abstractions.
- **Reference Before Edit** — non-trivial work should identify the nearest representative implementation first.
- **Capability Before Creation** — search existing project/framework capabilities before adding shared machinery.
- **Change > Rewrite** — evolve accepted intent by semantic delta and impact instead of regenerating everything.
- **Selective Invalidation** — invalidate only knowledge, work and evidence that a change actually affects.
- **One Fact → One Owner** — each durable fact has one canonical owner; other artifacts reference it.
- **Promote, Don't Accumulate** — only stable, project-specific, future-useful learning becomes durable knowledge.
- **Progressive Disclosure** — agents read the small entry map first and deeper knowledge only when relevant.

## Typical lifecycle

```text
First entry
  evo-init
      ↓
Normal planning / coding / testing / review
      ↓
Repository changes ───────→ evo-refresh
Accepted intent changes ──→ evo-change
Durable engineering lesson → evo-learn
New session / lost context → evo-recover
Unsure what is needed ─────→ ask-evo
```

## Installation

```sh
npx skills@latest add liebaor/evoworkflow
```

Then run `evo-init` in the target repository. It establishes `.evo/` and adds a small Repository Engineering Context section to the repository's standing agent instruction file.

## Design docs

- `docs/architecture.md` — product boundary and integration model.
- `docs/knowledge-model.md` — ownership, freshness and promotion rules for `.evo/` knowledge.
- `docs/skill-contract.md` — common behavior contract for EVO Skills.
- `docs/workflow.md` — lifecycle and interaction between EVO capabilities.

## Success criterion

A fresh agent with no chat history should be able to enter a mature repository, read standing instructions plus relevant EVO knowledge, understand the established engineering shape, identify reusable capabilities and references, detect uncertainty, and continue work without reconstructing the project from scratch.
