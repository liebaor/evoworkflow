---
name: evo-review
description: Independently review verified work across Intent, Engineering and Evidence. Use after evo-verify or to review a branch/diff against its EVO Spec and repository standards. Read-only by default.
---

# EVO Review

## Independence
Prefer a fresh context/subagent when available so implementation assumptions do not dominate review.

## Read first
Re-read the user outcome and owning `.evo/specs/` / Decisions before implementation details. Inspect diff from a fixed Git point, then verification evidence.

## Three axes
### Intent
Does behavior match Outcome, Non-goals and Acceptance? Is any requested path unreachable or any negative guarantee still present?

### Engineering
Does the change reuse repository patterns, respect architecture/security/data/compatibility boundaries, avoid duplicate mechanisms and keep scope coherent?

### Evidence
Do actually executed checks cover the claims and real consumer paths? Are any important boundaries only inferred?

Classify findings as Blocking, Important non-blocking or Optional. Do not manufacture findings to fill a template.

## Output
Lead with findings + evidence, then state readiness and uncertainty. Do not edit implementation during read-only review. Blocking findings route back to Implement/Bug/Change; clean review routes to `evo-finish`.