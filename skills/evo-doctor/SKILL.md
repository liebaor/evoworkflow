---
name: evo-doctor
description: Audit an EVO-managed repository for stale work, zombie Decisions, duplicate authorities, invalid project maps, knowledge drift, AGENTS bloat, unresolved evidence, and repeated findings. Report first.
---

# EVO Doctor

## Objective

Identify repository-knowledge entropy and recommend bounded gardening without silently rewriting authority documents.

## CLI bootstrap guard

Before the first CLI operation, run `evo --version`. If unavailable, report `EVO_CLI_REQUIRED`, print the official installation command, and stop:

`npm install -g https://github.com/liebaor/evoworkflow/releases/latest/download/evoworkflow-cli.tgz`

After installation, rerun this Skill. Do not clone or build the EVO source repository. Do not run `pnpm install`, install or upgrade Corepack, or build TypeScript source as a fallback. Do not vendor EVO source into the business repository or invent an alternative installation URL.

## Inputs and authorities

Run `evo doctor --root <repository>`. Inspect the exact files behind reported diagnostics, current Git state, completed work, Decisions, docs, tests, and review evidence relevant to confirmed findings.

## Required outcomes

Separate protocol errors, stale or duplicate knowledge, architecture/documentation drift, unverified active work, repeated violations, and unavailable checks. For each finding, name evidence, impact, primary owner, and a proposed repair.

## Constraints and decision rules

- Default to read-only reporting.
- Do not delete history merely because it is old.
- Promote a repeated rule to a gate only when a deterministic check can enforce the real invariant.
- Do not claim dead tests or architecture drift without direct evidence.

## Stop conditions

Stop after the report unless the user separately approves a repair scope. Conflicting authorities require human selection.

## Repository writes

None during the audit.
