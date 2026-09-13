---
name: evo-status
description: Report deterministic EVOworkflow machine state, protocol validity, active Change and Goal, and the allowed next action. Read-only and narrower than general project advice.
---

# EVO Status

## Objective

Present the current machine-readable workflow state without inference-driven execution.

## Inputs and authorities

Run `evo status --root <repository>` and, when needed, `evo check --root <repository>`. Read only the referenced files needed to explain reported errors.

## Required outcomes

Report project mode, phase, status, active Change, active Goal, current Slice, all Slice checkpoints, error/warning counts, and the recommended next command or Skill with its gate reason. Never infer a current Slice that State or an active Goal does not record.

## Constraints and decision rules

- Machine state is not proof that implementation is correct.
- Do not hide malformed, missing, or stale state.
- Do not choose a product or architecture Decision.

## Stop conditions

Stop after reporting status. Do not execute the recommendation or edit state.

## Repository writes

None.
