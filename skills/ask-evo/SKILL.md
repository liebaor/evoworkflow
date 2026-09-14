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

## Universal routing

Choose exactly one destination Skill from the first matching condition below:

1. The repository is not managed by EVO: `evo-init`.
2. The requirement is ambiguous or the recorded blocker needs a human Decision: `evo-grill-with-docs`.
3. A Large Change needs behavior specified before planning: `evo-to-spec`.
4. Approved intent has no executable Plan: `evo-plan`.
5. A requirement changed after approval: `evo-change`.
6. A reproducible bug is being investigated: `evo-bug`.
7. A persisted current Slice is ready for bounded implementation: `evo-implement`.
8. A Slice is complete and needs acceptance evidence: `evo-verify`.
9. A fresh or interrupted session needs repository reconstruction: `evo-recover`.
10. Evidence is ready for independent findings: `evo-review`.
11. Review is human-accepted and convergence can be checked: `evo-finish`.
12. A trusted engineering checkpoint needs Git chronology: `evo-commit`.

The routing result is a recommendation only. The destination Skill owns its
phase outcome, and the human owns approval, phase transition, acceptance, and
side-effect authorization.

## Constraints and decision rules

- Repository evidence outranks historical chat.
- Investigate missing facts before asking the user.
- Advice does not become a Decision or approval.
- Explain why the recommendation is allowed by the current phase and gates.
- Do not select a destination from the order of prose headings or from a remembered session.
- Do not depend on a vendor command, tool name, or invocation syntax.

## Stop conditions

Stop after navigation. Do not invoke another Skill, edit files, approve work, or advance phase state.

## Repository writes

None.
