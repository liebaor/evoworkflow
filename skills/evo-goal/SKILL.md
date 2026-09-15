---
name: evo-goal
description: Create, approve, inspect, run, resume, or cancel a bounded sequential EVO Goal composed only of approved, unambiguous, independently verifiable Slices.
---

# EVO Goal

## Objective

Delegate repetitive execution while preserving human control of intent, Decisions, approval, review, and Finish.

## CLI bootstrap guard

Before the first CLI operation, run `evo --version`. If unavailable, report `EVO_CLI_REQUIRED`, print the official installation command, and stop:

`npm install -g https://github.com/liebaor/evoworkflow/releases/latest/download/evoworkflow-cli.tgz`

After installation, rerun this Skill. Do not clone or build the EVO source repository. Do not run `pnpm install`, install or upgrade Corepack, or build TypeScript source as a fallback. Do not vendor EVO source into the business repository or invent an alternative installation URL.

## Inputs and authorities

Read the approved active Change/Specification/Plan, Slice dependencies and acceptance, project adapter configuration, stop conditions, state, and existing Goal. Use the deterministic `evo goal` commands.

## Required outcomes

Create a `DRAFT` Goal with bounded Slices, explicit acceptance, parameterized verification commands, dependencies, adapter, and retry limit. Show the exact execution intent before `evo goal approve`. Persist every attempt, verification result, changed path, blocker, and resume reason.

## Constraints and decision rules

- Approval binds Goal intent, adapter configuration, and active Change/Plan content.
- Execute one eligible Slice at a time.
- A Slice passes only when structured agent output is followed by passing approved verification.
- Independent Slices may continue after a blocker; dependent Slices remain pending.
- A Goal ends at `READY_FOR_REVIEW`, never `DONE`, and never invokes Finish.
- Do not use permission-bypass flags, auto-commit, merge, deploy, or external writes by default.

## Stop conditions

Stop for requirement ambiguity, acceptance change, architecture deviation, breaking API, security Decision, destructive data operation, unexpected dependency, scope expansion, or repeated failure. Resume only after a recorded human reason and unchanged approved intent, or return to planning for reapproval.

## Repository writes

Write active Goal YAML, Slice checkpoints, verification summaries, resume/cancel history, and machine state. Goal execution may modify only approved Slice source/tests through the configured Agent Adapter.
