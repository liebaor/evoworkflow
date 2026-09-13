---
name: evo-plan
description: Plan an approved EVO Change into reusable, localized, verifiable vertical Slices. Use after ambiguity is resolved; do not implement the Plan.
---

# EVO Plan

## Objective

Produce an implementation Plan that follows actual repository patterns and bounds each independently verifiable user behavior.

## Inputs and authorities

Read the approved Change or Specification, current Decisions, project map, Working Context, relevant source/tests, dependency metadata, capability map, consistency observations, and at least one applicable reference implementation when available.

## Required outcomes

Record existing mechanisms to reuse, the primary and affected modules, unaffected behavior, existing and new contracts, Working Context references, expected blast radius, migration and rollback concerns, and ordered vertical Slices. Each Slice defines a stable id, objective, acceptance, expected paths, dependencies, verification, and stop conditions. Initialize the same Slice ids as `PENDING` checkpoints in `.evo/state.yml`; Plan owns their meaning and State owns only execution status.

## Constraints and decision rules

- Slice by user behavior, not database/backend/frontend layers.
- Prefer the smallest local change that satisfies approved intent.
- Do not add infrastructure, dependencies, or abstractions without present evidence.
- Compare expected blast radius during Review.

## Stop conditions

Stop with the Plan at `AWAITING_APPROVAL`. The human may record exact-content approval with `evo approve <change-id> plan`. Return to Grill or Spec on new ambiguity, acceptance change, security choice, breaking contract, destructive migration, or major architecture deviation.

## Repository writes

Write `.evo/work/active/<change-id>/plan.md`, related working Decisions, and planning state only. Do not edit product code.
