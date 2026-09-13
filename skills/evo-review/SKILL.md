---
name: evo-review
description: Review an implemented EVO Change for specification fidelity, repository-pattern compliance, scope discipline, reuse, locality, contract leakage, complexity, and evidence quality.
---

# EVO Review

## Objective

Identify actionable defects and residual risks before human acceptance, grounded in the actual diff and current repository authorities.

## Inputs and authorities

Read the approved Change/Specification/Plan, current Decisions, diff, affected source/tests/docs, reference implementations, Evidence, and expected blast radius. Inspect current Git state.

## Required outcomes

Report findings ordered by severity with exact paths and behavior impact. Compare expected versus actual modules, identify out-of-scope edits, missing reuse, leaked internals, unnecessary complexity, unproven claims, and required follow-up verification. State explicitly when no actionable findings remain.

## Constraints and decision rules

- Review behavior and obligations, not personal style.
- Existing tests do not excuse divergence from approved intent.
- Do not rewrite code while reviewing.
- A self-review is evidence of inspection, not independent human acceptance.

## Stop conditions

Stop after the review report. Any finding returns to its owning phase; do not silently fix or finish.

## Repository writes

Write `review.md` and review state only. Do not edit implementation, approve acceptance, or complete the Change.
