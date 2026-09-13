---
name: ask-evo
description: Navigate an EVO-managed repository when the user asks where work stands, what is blocked, or what human-controlled action should happen next. Read-only; do not use it to execute the recommendation.
---

# Ask EVO

## Objective

Reconstruct the current workflow state from repository evidence and recommend one next action with a concrete reason.

## Inputs and authorities

Read `AGENTS.md`, `.evo/project.md`, `.evo/state.yml`, the active Change, working Decisions, active Goal, latest evidence, and relevant Git state. Prefer `evo status --root <repository>` for deterministic state validation.

## Required outcomes

Report the current objective, phase, status, completed work, pending work, blockers, protocol errors, and one recommended next action. Separate verified facts, unknowns, and advice.

## Constraints and decision rules

- Repository evidence outranks historical chat.
- Investigate missing facts before asking the user.
- Advice does not become a Decision or approval.
- Explain why the recommendation is allowed by the current phase and gates.

## Stop conditions

Stop after navigation. Do not invoke another Skill, edit files, approve work, or advance phase state.

## Repository writes

None.
