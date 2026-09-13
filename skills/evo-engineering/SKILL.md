---
name: evo-engineering
description: Provide context-specific engineering heuristics for an active EVO Change, such as data integrity, state, integrations, concurrency, performance, migration, or recovery. Do not use as a generic checklist.
---

# EVO Engineering

## Objective

Surface only the engineering risks, reuse opportunities, simplifications, and evidence requirements that the current Change actually triggers.

## Inputs and authorities

Read the active Change, Plan, repository map, relevant Decisions, affected source and tests, and the project's established patterns. Read [references/heuristics.md](references/heuristics.md) only for triggered topics.

## Required outcomes

For each relevant topic, report the triggering evidence, current repository mechanism, concrete risk, recommendation, trade-off, and required verification. State when no additional mechanism is justified.

## Constraints and decision rules

- Reuse existing project capabilities before suggesting new infrastructure.
- Measure before performance optimization.
- Treat configuration, persistence, network, subprocess, user input, and external APIs as real validation boundaries; trust typed same-process values where appropriate.
- Advice is not approval and does not modify Change scope.

## Stop conditions

Stop when advice requires a product, security, destructive-data, compatibility, or major architecture Decision. Do not implement or automatically create a Decision.

## Repository writes

None unless the invoking phase explicitly asks to incorporate approved advice into its own artifact.
