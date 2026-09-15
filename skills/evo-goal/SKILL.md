---
name: evo-goal
description: Continuously execute a prepared multi-slice plan to completion in one repository: implement, TDD when appropriate, test, diagnose failures, verify, review, finish and create authorized checkpoint commits. Use when the user wants EVO to complete all prepared small tasks rather than drive them one by one.
---

# EVO Goal

## Purpose
Provide controlled continuous execution without a separate workflow runtime.

## Preconditions
- `.evo/` is initialized;
- owning Spec and `.evo/plans/<change>.md` exist and material human decisions are settled;
- one checkout has one writer;
- no other ACTIVE goal exists.

## Start / resume
Create or update `.evo/goal.md`:

```markdown
# Goal
Status: ACTIVE

## Objective
...

## Source
Spec: .evo/specs/...
Plan: .evo/plans/...

## Execution policy
- tdd: when-appropriate
- checkpoint-commit: after-verified-slice
- push: false

## Progress
- [ ] S1 ...
- [ ] S2 ...

## Current
S1

## Last verified
...
```

Resume from repository evidence, not chat memory.

## Execution loop
For the next uncompleted slice:
1. Re-read the slice + governing Spec/Decisions and relevant source.
2. Apply `evo-implement`; apply `evo-tdd` where a stable behavior seam exists.
3. Run focused project feedback throughout.
4. Apply `evo-verify` to slice acceptance.
5. On ordinary FAIL: diagnose/fix, using `evo-bug` when root cause is non-trivial; re-verify. Do not stop merely because code/tests failed.
6. For high-risk or structurally significant slices, perform a focused `evo-review`; otherwise defer full independent review to the end.
7. Update `.evo/goal.md` Progress/Current/Last verified.
8. If execution policy allows checkpoint commits, apply `evo-commit` in commit-only mode.
9. Continue to the next ready slice.

## Stop for human authority
Stop before proceeding when work requires an unapproved product direction, paid/external service, material privacy/security exposure, destructive/irreversible data change, compatibility break, major architecture boundary, missing protected credentials/production authorization, or contradictory Spec that cannot be resolved from repository evidence.

Repeated failures also stop when no new diagnostic hypothesis/evidence path remains; summarize attempts and ask for help instead of looping.

## Final loop
After all slices:
1. Full `evo-verify` across Spec acceptance and real consumer paths.
2. Independent `evo-review` where possible.
3. Resolve findings and repeat evidence as needed.
4. `evo-finish` to converge current truth and mark Goal COMPLETE.
5. `evo-commit` final delivery.
6. Push only when `.evo/goal.md` explicitly says `push: true` or the user explicitly requests it.

## Output
On completion report objective, slices completed, final evidence, review outcome, commits created, push status and accepted limitations.