---
name: evo-init
description: Initialize an existing or empty repository for EVOworkflow by discovering actual conventions, producing a reviewable report, and applying only approved non-destructive scaffolding.
---

# EVO Init

## Objective

Make a repository legible to a new agent without claiming complete understanding or replacing existing project authorities.

## Inputs and authorities

Use the repository root, existing instructions, README and docs, dependency and build metadata, CI, source, tests, Git, and observable run/test paths. Run `evo init --root <repository>` first.

## Required outcomes

Classify the checkout as `GREENFIELD`, `BROWNFIELD`, or `EVO_MANAGED`; report technology and framework evidence, authority candidates, build/run/test/observe paths, reusable capabilities, reference implementations, confidence, unknowns, and exact proposed writes.

For Brownfield work, perform repository archaeology against the actual checkout. For Greenfield work, stop before framework bootstrap and route to `evo-solution-discovery` after requirements are understood.

## Constraints and decision rules

- Facts come from repository or runtime evidence; label inference and unknowns.
- Existing `AGENTS.md`, documentation, source, tests, and configuration are preserved.
- One fact has one primary authority; `.evo/project.md` links instead of copying.
- Apply with `evo init --root <repository> --apply` only after the human reviews the report.

## Stop conditions

Stop on conflicting authorities, unknown application entry paths, an unresolved foundation Decision, or any proposed overwrite. Do not begin feature development.

## Repository writes

After approval, create only missing `AGENTS.md`, `.evo/config.yml`, `.evo/project.md`, and `.evo/state.yml`. Optional directories remain lazy.
