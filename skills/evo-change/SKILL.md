---
name: evo-change
description: Analyze an accepted intent change as a semantic delta, map its impact, preserve unaffected work, and selectively invalidate stale project knowledge, assumptions and evidence.
compatibility: "Codex, Claude Code, OpenCode; Git repository with EVO knowledge"
disable-model-invocation: true
metadata:
  opencode/autoinvoke: "false"
---

# EVO Change

## Purpose

Keep project evolution coherent when accepted intent changes after work has already begun.

This Skill does not replace the project's normal specification or planning workflow. It produces the change context those workflows need.

## When to use

Use when previously accepted product/domain/architecture behavior changes materially.

Do not use for implementation-only refactors that preserve accepted behavior unless they invalidate durable project knowledge.

## Read first

Read:

- the previous accepted intent from its canonical owner;
- the new accepted intent from the user/current authority;
- relevant `.evo/project.md`, `.evo/current.md`, references/capabilities;
- active change/spec/tickets when they exist;
- current source/tests and Git state in affected areas.

## Process

1. State the previous intent and new intent precisely.
2. Derive the semantic delta; separate behavioral change from wording change.
3. Trace impact through relevant domains: data/schema, API/contracts, backend/domain, frontend/client, permissions/security, integrations, tests/evidence, documentation/decisions, active work.
4. Classify each relevant area as `AFFECTED`, `UNAFFECTED`, or `UNCERTAIN` with evidence.
5. Identify existing work/knowledge/evidence that remains valid.
6. Identify assumptions, tests, evidence, plans or knowledge made stale by the delta.
7. Record selective invalidation and required follow-up.
8. Update `.evo/current.md` so future agents know the active change and uncertainty.

## Decision rules

### Selective Invalidation

Invalidate only artifacts whose assumptions actually changed. Preserve unrelated work and evidence.

### Canonical intent ownership

Do not create a parallel replacement for an existing canonical product/spec owner. Record the delta and link to/update the canonical owner where the workflow allows.

### Uncertainty is explicit

Use `UNCERTAIN` when impact cannot be proven. Do not silently widen the blast radius just to be safe, and do not silently declare an area unaffected without evidence.

## Writes

Create/update a material record under `.evo/changes/` containing:

- previous intent;
- new intent;
- semantic delta;
- affected / unaffected / uncertain areas;
- preserved work;
- invalidated assumptions/knowledge/evidence;
- follow-up required;
- references and observation point.

Update `.evo/current.md` and directly affected durable knowledge only when the new intent makes the previous knowledge false.

## Stop conditions

Stop if the new intent is not actually accepted/clear enough to compare, or if the change requires unresolved product/architecture/security decisions.

## Output

Summarize the semantic delta, blast radius, preserved work, invalidated items, uncertainties, and the next normal engineering action (for example revise spec/plan/tickets, implement, or verify).
