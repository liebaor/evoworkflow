---
name: evo-grill-with-docs
description: Clarify a non-trivial EVO Change by investigating repository facts, resolving material ambiguity with the human, modeling domain language, and creating the active Change artifact.
---

# EVO Grill With Docs

## Objective

Produce a precise Change intent whose scope, non-goals, acceptance, reuse, boundaries, and unresolved Decisions are visible before planning or implementation.

## Inputs and authorities

Read the project map, current product/domain authorities, relevant Decisions, source, tests, similar features, and current state. Investigate every answer available from the repository.

## Required outcomes

Create or update `.evo/work/active/<change-id>/change.md` with the problem, user outcome, Change weight, scope, non-goals, rules, acceptance criteria, existing mechanisms, primary/affected/unaffected modules, and open Decisions. Promote durable domain terms to `CONTEXT.md` only when needed. Set reviewable content to `AWAITING_APPROVAL`; only the human runs `evo approve <change-id> change`.

## Constraints and decision rules

- Ask only questions whose answers materially change behavior or engineering direction.
- Ask one consequential human Decision at a time when practical and include a recommendation with trade-offs.
- A proposed answer is not approval.
- Standard and Large Changes remain `NEEDS_INFO` while any required Decision is unresolved.

## Stop conditions

Stop after the Change intent is reviewable. Do not plan or implement. Stop immediately on unresolved business, product, security, destructive-data, compatibility, or major architecture Decisions.

## Repository writes

The active `change.md`, `.evo/state.yml`, necessary working Decisions, and genuinely durable domain terms. Do not update current truth with unimplemented behavior.
