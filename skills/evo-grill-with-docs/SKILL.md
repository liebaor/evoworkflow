---
name: evo-grill-with-docs
description: Clarify a feature, product, or architecture request through structured decision rounds while preserving durable domain knowledge and decisions in the repository. Use when material choices are unclear. Facts are the Agent's job to investigate; decisions are the human's job to make.
disable-model-invocation: true
---

# EVO Grill With Docs

## Purpose

Reach shared understanding before implementation without turning the conversation into an unstructured questionnaire. Resolve decisions in dependency order and preserve only durable knowledge.

## Use when

- product behavior, scope, terminology, edge cases, compatibility, security, data ownership, cost, or architecture choices are materially ambiguous;
- different reasonable answers would lead to different implementations;
- a large idea is understood only at a high level and needs decision refinement.

## Do not use when

- the missing answer is a repository fact you can inspect yourself;
- the missing answer is an external/current fact you can research — use `evo-research`;
- intent is already settled and only synthesis is needed — use `evo-spec` or `evo-plan`;
- an observed defect needs diagnosis — use `evo-bug`.

## Decision-tree method

Treat clarification as a decision tree.

- A **fact** is discoverable from repository/runtime/external evidence. Investigate it yourself.
- A **decision** is a material choice among viable outcomes. Put it to the responsible human.
- The **frontier** is the set of decisions whose prerequisites are already settled and can be asked now without guessing.

Work in rounds:

1. Read current repository instructions, relevant docs/decisions, source behavior, and the user's request.
2. Build the current decision tree privately: outcome → dependent choices → edge cases/consequences.
3. Resolve discoverable facts before asking questions.
4. Ask the current frontier as one focused round. Do not ask downstream questions whose answers depend on unresolved choices.
5. For every question, give a recommended answer and a short reason when you have enough evidence to recommend one.
6. Wait for the user's decisions, update the tree, and repeat.
7. Stop when no material branch remains silently assumed.

## Question discipline

Ask only questions where different answers materially change at least one of:

- user-visible behavior;
- scope/non-goals;
- public contract or compatibility;
- security/privacy/permissions;
- persistent data or migration;
- operational cost or external dependency;
- ownership/boundary/architecture;
- acceptance or verification strategy.

Prefer concrete scenarios over abstract wording. Example: ask "What should happen when two users reserve the same room at the same time?" rather than "What are the concurrency requirements?"

Never ask the user for facts you can reasonably discover from the repository, tools, or current primary sources.

## Durable knowledge updates

As understanding stabilizes:

- update the repository's existing domain/context owner for durable terminology and business facts;
- update an existing decision owner when it already governs a choice;
- create a narrow decision record only for a genuinely revisitable decision with real alternatives and consequences;
- keep temporary brainstorming and task-local notes out of permanent global instructions.

Do not write implementation code in this Skill.

## Output

At the end, summarize:

- desired outcome;
- non-goals;
- settled decisions;
- durable domain terms/facts added or changed;
- unresolved items, if any;
- recommended next Skill: usually `evo-spec`, `evo-plan`, or `evo-implement` for a genuinely small task.

## Final checks

Before stopping:

- every remaining question is either non-material or explicitly unresolved;
- repository facts were investigated rather than delegated back to the user;
- human decisions were not silently invented;
- durable knowledge has one owner;
- no code implementation was started.
