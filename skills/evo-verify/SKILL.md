---
name: evo-verify
description: Verify an EVO Change by mapping every acceptance criterion to observed evidence across the relevant static, unit, integration, real-entry, end-to-end, and operational paths.
---

# EVO Verify

## Objective

Determine what is proven, contradicted, or still unknown using current observable evidence.

## Inputs and authorities

Read approved acceptance, Decisions, Plan/Slices, changed code and tests, Working Context and consistency observations, project test/run/observe paths, previous Evidence, and relevant environment boundaries.

## Required outcomes

For every acceptance criterion, record exactly `PASS`, `FAIL`, or `UNVERIFIED`; the command or observation; scope; date; result; and why the evidence is sufficient. Re-read generated artifacts and exercise the real user entry path when feasible.

## Constraints and decision rules

- Verify the world, not agent self-report.
- Match evidence scope to the claim; focused checks cannot prove repository-wide or production behavior.
- Distinguish local/test, browser, external-system, deployment, migration, and operational verification.
- Preserve `UNVERIFIED` for unavailable real paths; a static cross-project evaluator does not prove runtime compatibility.
- Do not change implementation while acting as verifier; return failures to Implement.

## Stop conditions

Stop with `FAIL` or `UNVERIFIED` when evidence is missing, unreliable, blocked, or outside authorized environments. Do not weaken acceptance to obtain PASS.

## Repository writes

Update only `evidence.md` and matching Slice verification state. Preserve Plan-owned Slice meaning; State stores only ids and checkpoint status. Do not fix code, approve Review, finish, commit, merge, or deploy.
