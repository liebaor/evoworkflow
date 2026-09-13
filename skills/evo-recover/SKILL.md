---
name: evo-recover
description: Recover an interrupted EVOworkflow session from repository state, active work, Decisions, Goals, Evidence, and Git without relying on historical chat or automatically continuing work.
---

# EVO Recover

## Objective

Give a new agent enough verified context to hand control back to the human at the correct phase boundary.

## Inputs and authorities

Read `AGENTS.md`, project map, state, active Change/Specification/Plan, working Decisions, active Goal checkpoints, Evidence, review state, and current Git status/diff. Use `evo check` and `evo status` first.

## Required outcomes

Report current objective, phase, approved content, completed Slices, pending Slices, blockers, modified paths, latest evidence, unknowns, protocol drift, and one recommended next human-controlled action. Link repository paths instead of copying durable knowledge.

## Constraints and decision rules

- Repository state outranks chat and prior summaries.
- Revalidate drift-prone facts and do not assume a previously running process still exists.
- Do not reinterpret drafts as approvals or self-reports as Evidence.

## Stop conditions

Stop after the recovery report. Do not resume a Goal, edit code, change phase, or resolve human Decisions.

## Repository writes

None unless the user separately authorizes repairing a proven state-file defect.
