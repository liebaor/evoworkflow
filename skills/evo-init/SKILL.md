---
name: evo-init
description: Initialize an existing or empty repository for evoworkflow by discovering actual conventions, producing a reviewable report, and applying only approved non-destructive scaffolding.
---

# EVO Init

## Objective

Make a repository legible to a new agent without claiming complete understanding or replacing existing project authorities.

## CLI bootstrap guard

Run `evo --version` before `evo init`. If the CLI is unavailable, report `EVO_CLI_REQUIRED`, print the official installation command, and stop:

`npm install -g https://github.com/liebaor/evoworkflow/releases/latest/download/evoworkflow-cli.tgz`

After installation, rerun this Skill. Do not clone or build the EVO source repository. Do not run `pnpm install`, install or upgrade Corepack, or build TypeScript source as a fallback. Do not vendor EVO source into the business repository or invent an alternative installation URL.

## Inputs and authorities

Use the repository root, existing instructions, README and docs, dependency and build metadata, CI, source, tests, Git, and observable run/test paths. Run `evo init --root <repository>` first.

## Required outcomes

Classify the checkout as `GREENFIELD`, `BROWNFIELD`, or `EVO_MANAGED`; report technology and framework evidence, confirmed/inferred version confidence, repository areas, authority candidates, build/run/test/observe paths, reusable capabilities, reference implementations, confidence, unknowns, and exact proposed writes.

For Brownfield work, perform repository archaeology against the actual checkout. For Greenfield work, stop before framework bootstrap and route to `evo-solution-discovery` after requirements are understood.

## Constraints and decision rules

- Facts come from repository or runtime evidence; label inference and unknowns.
- Existing `AGENTS.md`, documentation, source, tests, and configuration are preserved.
- One fact has one primary authority; `.evo/project.md` links instead of copying.
- Record navigation paths and evidence references; do not turn initialization into a copied project encyclopedia.
- Apply with `evo init --root <repository> --apply` only after the human reviews the report.

## Stop conditions

Stop on conflicting authorities, unknown application entry paths, an unresolved foundation Decision, or any proposed overwrite. Do not begin feature development.

## Repository writes

After approval, create only missing `AGENTS.md`, `.evo/config.yml`, `.evo/project.md`, and `.evo/state.yml`. Optional directories remain lazy.
