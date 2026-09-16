# Repository knowledge model

EVOworkflow 2.0 follows **One Fact → One Owner** and reuses the repository's existing knowledge system instead of moving everything into an EVO directory.

| Question | Primary owner |
|---|---|
| What are the project's standing agent instructions? | `AGENTS.md` / existing host instruction root |
| What do domain terms mean? | `CONTEXT.md` or the layout configured by Matt setup |
| Why was a durable technical choice made? | ADRs configured by Matt setup |
| What should this change accomplish? | Canonical Spec / parent issue |
| What architecture/framework constraints must this change respect? | `Repository Fit` section on the canonical Spec, grounded in `docs/agents/repository.md` |
| What work remains and what blocks it? | Configured issue tracker / local ticket files |
| How should each planned slice fit existing modules/capabilities? | `Repository Fit` section on the canonical ticket |
| How is this repository structured and what should new code resemble? | `docs/agents/repository.md` plus linked authorities/source |
| What reusable framework/project capabilities already exist? | `docs/agents/repository.md` capability map plus actual source/framework owner |
| What does the product do now? | Source, contracts, current product docs |
| What proves behavior? | Tests, runtime observation, CI and persisted tracker verification notes |
| What happened historically? | Git / PR / tracker history |

## `docs/agents/repository.md`

`evo-init` creates or refreshes this guide. It should contain pointers and concise conclusions about:

- authority documents;
- build/test/run commands;
- architecture and module boundaries;
- representative consumer paths;
- reusable framework/project capabilities;
- reference implementations by concern;
- known inconsistencies and meaningful unknowns.

It must not duplicate whole coding standards, domain glossaries, ADR rationale, or source code.

## Repository Fit lives with the canonical plan owner

EVO conformance review does not create sidecar review documents.

- `evo-spec-review` writes/repairs concise architecture/framework fit constraints on the canonical Spec/parent task.
- `evo-plan-review` writes/repairs per-ticket module/reference/capability/verification fit on the canonical ticket.
- Later `evo-change` preserves unaffected fit and invalidates only assumptions touched by the requirement delta.

This keeps one actionable version of the Spec/ticket instead of forcing agents to reconcile a plan plus a separate review ledger.

## Tracker owns progress

Ticket status, dependencies, claims and completion live in one tracker. EVO Goal recomputes the frontier from that source rather than mirroring `[x]` state elsewhere.

A concise Execution Envelope may be persisted on the parent Spec/task so another session can resume the same delivery policy without inventing a second workflow database.

## Knowledge convergence

`evo-finish` performs knowledge gardening after final evidence/review: update current docs, domain language and ADRs only when the shipped behavior actually changes them; close or reconcile tracker artifacts; remove stale future-tense claims. Git preserves history.
