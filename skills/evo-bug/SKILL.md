---
name: evo-bug
description: Diagnose and fix an observed bug through a tight failing feedback loop, root-cause analysis, minimal repair and regression coverage. Use for broken, throwing, failing, flaky or unexpectedly slow behavior.
---

# EVO Bug

## Read first
`.evo/project.md`, `.evo/context.md`, relevant Spec/Decision, source/tests and environment details.

## Loop
1. State observed vs expected behavior and environment.
2. Reproduce through the narrowest real entry path.
3. Establish one tight feedback loop that is red on this bug. Do not theorize broadly before there is a useful signal when reproduction is feasible.
4. Minimize the reproduction where useful.
5. Form competing hypotheses from code/runtime evidence; instrument before guessing when needed.
6. Identify root cause and repository pattern/invariant that should hold.
7. Make the smallest coherent fix.
8. Add/strengthen regression coverage; use `evo-tdd` where the fix can be driven by the failing behavior.
9. Rerun focused checks and a relevant assembled consumer path.

If a production/external boundary is unavailable, mark that boundary UNVERIFIED rather than substituting source inspection as runtime proof.

If the bug changes accepted intent use `evo-change`; if it reveals a durable revisitable rule, record/update `.evo/decisions/`.

## Output
Reproduction, root cause, fix, regression evidence and remaining unverified boundaries.