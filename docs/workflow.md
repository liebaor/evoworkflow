# Workflow

EVOworkflow participates when long-lived project context needs to be created, refreshed, evolved, learned or recovered, and when repository-aware engineering judgment is needed before normal engineering work continues.

## First entry

```text
evo-init
  ↓
Repository Engineering Contract
  ↓
standing agent instructions expose .evo knowledge
  ↓
normal engineering workflow continues
```

## Normal work

Specification, planning, ticketing, implementation, testing, debugging and review workflows consume repository instructions and relevant EVO knowledge. They do not need a direct dependency on EVO Skill IDs.

## Repository evolution

When code/docs/architecture change enough to threaten stored knowledge:

```text
repository changed
    ↓
evo-refresh
    ↓
compare observation point with Git diff
    ↓
identify affected evidence surfaces
    ↓
targeted rescan
    ↓
preserve unaffected knowledge
```

## Accepted intent change

```text
previous accepted intent
       ↓
new accepted intent
       ↓
evo-change
       ↓
semantic delta
       ↓
impact analysis
       ↓
affected / unaffected
       ↓
selective invalidation
       ↓
normal planning/ticketing/implementation continues with updated context
```

## Engineering learning

```text
bug / review / incident / implementation discovery
       ↓
normal engineering workflow resolves/understands event
       ↓
evo-learn
       ↓
is the lesson stable + project-specific + future-useful?
       ├─ no → do not persist
       └─ yes
            ↓
         promote to canonical owner
```

## Recovery

```text
fresh session / new model / lost chat context
       ↓
evo-recover
       ↓
AGENTS + .evo/current + active changes
       ↓
Git status + recent history + worktree + tests/CI
       ↓
confirmed current state + uncertainty + next action
```

## Engineering advisory

Use `evo-advisor` when the main question is not a lifecycle transition but an engineering judgment:

```text
engineering question
       ↓
evo-advisor
       ↓
repository facts + constraints
       ↓
references + capabilities
       ↓
options / tradeoffs
       ↓
current external technical facts when needed
       ↓
repository-specific recommendation
       ↓
normal spec / plan / implementation workflow continues
```

Typical advisory questions include module ownership, architecture/design direction, REUSE vs EXTEND vs NEW, implementation tradeoffs, blast radius, hidden dependencies, and adapting current framework/library guidance to the repository.

`evo-advisor` is read-only by default. Accepted durable conclusions are persisted only through their canonical owner after the user/project accepts them.

## Routing

`ask-evo` is useful when the user is unsure whether EVO is needed:

```text
No repository engineering context → evo-init
Relevant knowledge may be stale → evo-refresh
Accepted intent changed → evo-change
Durable project lesson emerged → evo-learn
Session/model continuity needed → evo-recover
Repository-aware engineering judgment needed → evo-advisor
Otherwise → normal engineering workflow
```

## Integration principle

EVO produces context and repository-aware guidance for engineering workflows; it does not require those workflows to know EVO implementation details.

The stable integration surface is the repository's standing agent instruction file plus the `.evo/` knowledge contract.
