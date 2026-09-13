---
name: evo-bug
description: Diagnose and fix a bug through reproduction, failing evidence, root cause, existing-pattern reuse, regression coverage, and real-entry-path verification.
---

# EVO Bug

## Objective

Repair the proven cause of an observed failure and preserve evidence that prevents recurrence.

## Inputs and authorities

Read the bug report, project map, current behavior and Decisions, relevant logs, source, tests, Git history, and comparable correct implementations. Reproduce through the narrowest real entry path available.

## Required outcomes

Record observed and expected behavior, deterministic reproduction, failing evidence, root cause, existing rule or capability, bounded fix, regression test, real-entry-path result, and any warranted knowledge promotion.

## Constraints and decision rules

- Diagnose before changing code.
- Fix the cause, not only the visible symptom.
- Reuse the repository's established security, permission, error, data, and transaction mechanisms.
- Do not infer that a clean current run proves intermittent or operational failures resolved.
- Promote a rule only when the failure reveals durable future decision value.

## Stop conditions

Stop if reproduction is unavailable, root cause remains unverified, the fix changes approved behavior, or a security, compatibility, data-loss, architecture, or scope Decision is required.

## Repository writes

Write the active bug artifact, scoped fix, regression test, and Evidence. Do not finish or promote current knowledge without verification and human acceptance.
