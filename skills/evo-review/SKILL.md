---
name: evo-review
description: Independently review a completed change against three axes: Intent, Engineering, and Evidence. Use after implementation and verification, or when reviewing a branch/PR from a fixed Git point. Read-only: report findings before suggestions and do not silently edit the implementation.
disable-model-invocation: true
---

# EVO Review

## Purpose

Provide an independent check that the change solves the intended problem, fits the repository, and is supported by adequate evidence.

## Use when

- implementation and initial verification exist;
- a branch/PR/change needs an independent review;
- a fresh reviewer should challenge implementation assumptions;
- the user asks whether work is truly ready to finish.

## Do not use when

- the task is to implement missing work;
- acceptance has not been verified at all — run `evo-verify` first when possible;
- the primary task is bug diagnosis.

## Independence

Prefer a fresh context or reviewer. Re-read the original user outcome and owning Spec/issue/proposal before studying implementation detail so the implementation does not redefine the requirement after the fact.

Review a fixed change set: explicit base commit, merge-base, branch point, PR, or other stable diff boundary.

## Three review axes

### A. Intent

Ask:

- Does the implementation satisfy the original outcome and non-goals?
- Did scope drift or an unapproved product decision enter the patch?
- Are all material acceptance items represented?
- Are negative requirements and removed behavior actually absent?

### B. Engineering

Ask:

- Does the change follow repository instructions and established patterns?
- Did it reuse existing mechanisms instead of creating a duplicate path?
- Is the feature connected through the real consumer/composition path?
- Are security, permissions, data integrity, compatibility, migration, error handling, observability, concurrency, and operational concerns handled where relevant?
- Are names, abstractions, boundaries, tests, and docs consistent with nearby code?
- Is there unnecessary scope expansion or speculative abstraction?

### C. Evidence

Ask:

- Does each important completion claim have evidence that matches its failure surface?
- Were required commands/runtime paths actually executed?
- Are any PASS claims broader than the evidence supports?
- Are unavailable environments and external boundaries explicitly UNVERIFIED?

## Findings discipline

Lead with findings, ordered by impact:

- **Blocking** — must be resolved before the change can be considered ready;
- **Important** — non-blocking but materially affects maintainability, risk, or clarity;
- **Optional** — improvement only; do not manufacture these to fill a template.

Every finding should identify:

- what is wrong or risky;
- evidence/location;
- why it matters;
- the smallest appropriate remediation.

Do not report vague style preferences without a repository rule or concrete engineering consequence.

## Output

1. Findings, highest impact first.
2. Intent assessment.
3. Engineering assessment.
4. Evidence assessment.
5. Remaining uncertainty.
6. Readiness: `READY FOR FINISH`, `NOT READY`, or `READY WITH EXPLICIT UNVERIFIED BOUNDARY` when the user has knowingly accepted that boundary.

## Final checks

- review used a fixed diff boundary;
- original intent was read before implementation detail;
- passing tests did not override a Spec mismatch or unreachable consumer path;
- no finding was invented merely because a checklist expected one;
- review stayed read-only;
- ready work can move to `evo-finish`.
