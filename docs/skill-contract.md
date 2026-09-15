# EVO Skill Contract

Every EVO Skill is a reusable engineering capability, not a prose principle sheet.

## Required sections

A Skill should make these boundaries explicit:

1. **Purpose** — one responsibility.
2. **Use when** — positive triggers.
3. **Do not use when** — neighboring responsibilities it must not absorb.
4. **Read first / Preconditions** — repository evidence needed before action.
5. **Workflow** — repeatable steps.
6. **Stop / Escalate** — conditions that leave the Skill's authority.
7. **Repository writes** — which `.evo/` or project surfaces it may change.
8. **Output** — what the next human/Agent can consume.
9. **Final checks** — conditions before handoff.

## Canonical workspace

Skills must use these locations directly:

```text
.evo/project.md
.evo/context.md
.evo/goal.md
.evo/decisions/
.evo/specs/
.evo/plans/
.evo/research/
```

Do not add configuration for alternative EVO knowledge paths. If the project has not adopted the convention, route to `evo-setup`.

## Role boundaries

- `evo-advisor` advises; it does not implement.
- `evo-grill-with-docs` resolves material decisions; facts are investigated by the Agent.
- `evo-research` resolves external uncertainty; repository-internal facts should be read locally.
- `evo-spec` synthesizes settled intent; it does not interview through unresolved product choices.
- `evo-plan` creates fresh-Agent-executable slices.
- `evo-implement` builds one slice and escalates changed intent rather than silently changing it.
- `evo-tdd` drives implementation by behavioral tests; `evo-verify` proves acceptance after implementation.
- `evo-review` is read-only by default.
- `evo-finish` converges repository current truth.
- `evo-goal` orchestrates repeated execution across a prepared plan.
- `evo-commit` records Git history and pushes only with authorization.

## Goal rule

Goal may call/apply other Skill contracts, but it cannot waive their safety boundaries. Material decisions remain human authority. A worker does not treat its own self-report as final acceptance; use direct evidence and, when the harness allows, a fresh review context.

## Router synchronization

Any change to the Skill set or flow must update `ask-evo`, README, workflow docs, eval scenarios and CI.