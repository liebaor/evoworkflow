---
name: ask-evo
description: Read the repository and recommend exactly one next EVO workflow step. Use when the user asks what to do next, where work stands, or how to continue. Read-only.
---

# Ask EVO

## Objective

Reconstruct the real situation from repository evidence and recommend one next Skill. Do not depend on chat memory, an EVO CLI, or a workflow state file.

## Read first

Read applicable repository instructions, current docs, domain/context docs, active proposal/spec/plan if any, relevant decisions, Git status/history, changed files, tests and CI evidence relevant to the task.

## Routing

Choose exactly one primary next action:

1. Repository conventions and knowledge owners are not understood → `evo-init`.
2. User intent, product behavior, or a material choice is unclear → `evo-grill-with-docs`.
3. A current external technology/solution question needs primary-source research → `evo-research`.
4. A substantial change needs an explicit working proposal and acceptance criteria → `evo-spec`.
5. Intent is understood but work is not broken into bounded vertical slices → `evo-plan`.
6. Accepted intent changed during work → `evo-change`.
7. An observed failure needs diagnosis → `evo-bug`.
8. One bounded slice is ready to build → `evo-implement`.
9. Implementation claims need direct evidence → `evo-verify`.
10. Evidence exists and an independent quality/spec check is needed → `evo-review`.
11. A fresh/interrupted session or another Agent must continue existing work → `evo-recover`.

Small mechanical edits may skip spec and plan when they change no behavior, contract, architecture, durable format, test strategy, or rationale.

## Output

Report: current objective, verified facts, relevant unknowns, active owner documents, observed progress, blockers, and one recommended next Skill with a short reason.

## Rules

- Repository evidence outranks historical chat.
- Unknown does not equal blocker. Block only when the missing fact materially changes the current task.
- Do not invent workflow state that is not present in repository evidence.
- Do not edit files or invoke the destination Skill.