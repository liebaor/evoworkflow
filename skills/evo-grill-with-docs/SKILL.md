---
name: evo-grill-with-docs
description: Resolve material product or architecture ambiguity through decision-tree interview rounds while updating canonical EVO context and durable decisions. Use when different human answers would materially change behavior, scope, risk or architecture.
---

# EVO Grill With Docs

## Read first
`.evo/project.md`, `.evo/context.md`, relevant Decisions, active Spec if any, source/current behavior.

## Rule
**Facts are the Agent's job. Decisions are the human's job.** Search the repository/tools/web rather than asking the user for facts you can establish yourself.

## Workflow
1. Build a decision tree from the desired outcome. A question depends on another when its useful answer cannot be chosen before the prerequisite decision.
2. Compute the current **frontier**: material decisions whose prerequisites are already settled.
3. Ask one round containing only frontier questions. Number them and attach a recommended answer plus short reasoning.
4. Wait for user decisions; update the tree; investigate any newly required facts; compute the next frontier.
5. Continue until no material branch is silently assumed.
6. Update `.evo/context.md` for stable vocabulary/business facts.
7. Create/update `.evo/decisions/` only for durable revisitable choices with meaningful alternatives/consequences.

## Stop
Stop when outcome, non-goals, constraints, acceptance-relevant choices and vocabulary are clear enough for Spec/Plan/direct implementation.

## Output
Summarize settled decisions, remaining non-blocking unknowns, knowledge writes and next Skill. Do not implement code.