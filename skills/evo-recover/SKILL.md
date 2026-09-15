---
name: evo-recover
description: Recover an interrupted evoworkflow session from repository state, active work, Decisions, Goals, Evidence, and Git without relying on historical chat or automatically continuing work.
---

# EVO Recover

## Objective

Give a new agent enough verified context to hand control back to the human at the correct phase boundary.

## CLI bootstrap guard

Before the first CLI operation, run `evo --version`. If unavailable, report `EVO_CLI_REQUIRED`, print the official installation command, and stop:

`npm install -g https://github.com/liebaor/evoworkflow/releases/latest/download/evoworkflow-cli.tgz`

After installation, rerun this Skill. Do not clone or build the EVO source repository. Do not run `pnpm install`, install or upgrade Corepack, or build TypeScript source as a fallback. Do not vendor EVO source into the business repository or invent an alternative installation URL.

## Inputs and authorities

Read `AGENTS.md`, project map, state, active Change/Specification/Plan, Working Context, working Decisions, active Goal checkpoints, Evidence, review state, and current Git status/diff. Use `evo check`, `evo status`, and `evo recover` first.

## Required outcomes

Report current objective, phase, approved content, completed Slices, pending Slices, blockers, modified paths, latest evidence, unknowns, protocol drift, Working Context references, and one recommended next human-controlled action. Link repository paths instead of copying durable knowledge.

## Constraints and decision rules

- Repository state outranks chat and prior summaries.
- Revalidate drift-prone facts and do not assume a previously running process still exists.
- Do not reinterpret drafts as approvals or self-reports as Evidence.

## Stop conditions

Stop after the recovery report. Do not resume a Goal, edit code, change phase, or resolve human Decisions.

## Repository writes

None unless the user separately authorizes repairing a proven state-file defect.
