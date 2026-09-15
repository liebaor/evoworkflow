---
name: evo-review
description: Independently review a change against user intent, its owning proposal/decision, repository standards, real consumer paths, and verification evidence.
---

# EVO Review

## Objective

Provide an independent review after implementation/verification. Prefer a fresh context or fresh reviewer so implementation assumptions do not dominate the review.

## Review order

1. Re-read the original user outcome and active proposal/spec before reading the implementation details.
2. Inspect the diff from a fixed Git point.
3. Check acceptance against the evidence actually executed.
4. Trace at least one real assembled consumer path for user/model-visible behavior.
5. Check repository conventions, reuse, architecture boundaries, naming, permissions/security, data/compatibility, deletion/negative guarantees, docs/current truth, and unnecessary scope expansion.
6. Distinguish blocking findings, important non-blocking findings, and optional improvements.

A passing test suite does not override a spec mismatch, duplicated mechanism, unsafe migration, or unreachable feature. Conversely, do not manufacture findings simply because a template expects them.

## Output

Lead with findings and evidence. Then state what appears ready, what remains uncertain, and whether current docs/decision rationale now describe what actually shipped. Do not silently edit implementation during a read-only review.