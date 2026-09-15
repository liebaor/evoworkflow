---
name: evo-grill-with-docs
description: Clarify a feature, product, or architecture request through focused questioning while improving the repository's shared domain language and durable decisions.
---

# EVO Grill With Docs

## Objective

Close material ambiguity before implementation and turn durable understanding into repository knowledge rather than chat-only memory.

## Method

Read current repository instructions, domain/context docs, relevant decisions, source and existing behavior first. Ask questions only where different answers would materially change behavior, scope, compatibility, security, data, cost, ownership, or architecture.

Prefer concrete scenarios and edge cases over abstract questionnaires. Distinguish routine implementation choices from decisions that require human authority.

## Knowledge updates

During or after the discussion:

- update the repository's existing domain/context document for stable terminology and durable business facts;
- update an existing decision owner when one already governs the choice;
- create a new narrow decision record only for a genuinely revisitable decision with alternatives and consequences;
- do not turn temporary task notes into permanent global rules.

## Stop condition

Stop when the outcome, non-goals, material constraints, unresolved choices, and shared vocabulary are clear enough for `evo-spec`, `evo-plan`, or a small direct implementation. Do not implement code in this Skill.