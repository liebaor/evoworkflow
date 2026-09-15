# EVO Repository Knowledge Model

EVO uses a fixed `.evo/` workspace so every Agent knows where engineering memory lives without rediscovery.

## Canonical owners

| Question | Canonical owner |
|---|---|
| What is this project and how do I navigate/build/test/run it? | `.evo/project.md` |
| What do domain terms and stable business facts mean? | `.evo/context.md` |
| Why was a durable technical/architecture choice made? | `.evo/decisions/` |
| What unfinished behavior/design are we trying to create? | `.evo/specs/` |
| What bounded slices execute the work? | `.evo/plans/` |
| What current external knowledge supports a choice? | `.evo/research/` |
| What long-running objective is being executed? | `.evo/goal.md` |
| What does the product expose now? | Project source/contracts/current docs |
| What mechanically proves behavior? | Project tests/runtime/CI |
| What happened historically? | Git/PR history |

## Brownfield migration

EVO does not keep path mappings for prior engineering-memory layouts. `evo-setup` migrates existing ADR/decision records, working specs/RFCs, implementation plans, research notes and domain context into the canonical locations and updates references.

Do not migrate product documentation merely because it contains technical material. API references, deployment instructions, operator/user guides and current public architecture documentation remain project docs. If such a document contains a durable decision rationale that belongs in `.evo/decisions/`, extract the rationale while leaving the current-state documentation in place.

## One fact, one owner

Avoid parallel mutable copies. Current behavior belongs to source/contracts/current docs; rationale belongs to decisions; unfinished intent belongs to specs; execution decomposition belongs to plans; external evidence belongs to research.

## Goal is not hidden state

`.evo/goal.md` is deliberately readable. It may contain Objective, linked Spec/Plan, Execution Policy, Progress, Current Slice, recent verification and blockers. It is an execution artifact, not a machine-only state store.

One checkout should have at most one active Goal. A completed Goal may remain until the next Goal replaces it; Git preserves prior versions.

## Fresh-session rule

A fresh Agent should be able to reconstruct work by reading `AGENTS.md`, `.evo/project.md`, `.evo/context.md`, `.evo/goal.md` when relevant, linked Spec/Plan/Decisions, Git diff/history and current tests/CI evidence.