---
name: evo-to-spec
description: Convert a Large EVO Change into an approvable behavioral Specification with acceptance, compatibility, constraints, and non-goals before planning.
---

# EVO To Spec

## Objective

Create the behavioral authority for a Large Change without prescribing unnecessary implementation details.

## Inputs and authorities

Read the active Change, current product and domain truth, relevant contracts, Decisions, existing behavior, tests, and resolved Grill answers.

## Required outcomes

Define actors, required behavior, acceptance criteria, state and failure behavior, data/API compatibility, security and permission expectations, constraints, non-goals, and remaining open Decisions. Trace each requirement to its source.

## Constraints and decision rules

- Specify observable intent and obligations, not speculative internals.
- Existing current truth remains authoritative outside the approved Delta.
- Mark unverified assumptions and unresolved Decisions explicitly.
- Approval binds to the exact Specification content.

## Stop conditions

Stop at `AWAITING_APPROVAL`. The human may record exact-content approval with `evo approve <change-id> spec`. Do not plan or implement. Remain `NEEDS_INFO` while any required human Decision is open.

## Repository writes

Write `spec.md`, working Decisions, and state for the active Large Change. Do not update current product documentation yet.
