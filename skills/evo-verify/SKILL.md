---
name: evo-verify
description: Verify accepted outcomes using the repository's real tests, builds, runtime paths, and direct observations. Separate what was executed from what remains unverified.
---

# EVO Verify

## Objective

Test claims, not documents. Verification is repository-native; there is no EVO Evidence Engine.

## Evidence map

For each acceptance claim identify:

1. observable behavior or absence;
2. where it can fail;
3. the direct evidence that can falsify it;
4. the exact project-native command, inspection, browser/API/runtime path, or external environment used.

Match evidence to risk: focused unit tests for local logic, integration/composition tests for wiring, replay/recovery for persistence, real application paths for user-visible behavior, real external checks when access exists, and negative search plus relevant tests for deletion.

## Report precisely

Use language such as:

- `Passed: <command>` only when it was executed successfully.
- `Failed: <command>` with the relevant failure.
- `Inspected: <path>` for static source/doc evidence.
- `Not run: requires <condition>` for unavailable checks.
- `Inferred from <evidence>` only for a narrower inference.

A format/lint/build pass proves only the rule it checks. Do not equate mechanical success with semantic correctness. Route verified work to `evo-review` for independent quality/spec review.