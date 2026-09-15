---
name: evo-bug
description: Diagnose and fix a bug through reproduction, a failing feedback loop, root-cause analysis, minimal repair, regression coverage, and verification through the real consumer path.
---

# EVO Bug

## Objective

Fix the proven cause, not only the visible symptom, and leave a regression signal that would fail if the bug returns.

## Loop

1. State observed vs expected behavior and environment.
2. Reproduce through the narrowest real entry path available.
3. Build a feedback loop that is red on the bug.
4. Minimize the reproduction when useful.
5. Form competing hypotheses from code/runtime evidence; instrument before guessing when needed.
6. Identify the root cause and the existing repository rule/pattern it should follow.
7. Make the smallest coherent fix.
8. Add or strengthen regression coverage.
9. Re-run focused checks and at least one relevant assembled/consumer path.

If the failure cannot be reproduced or a production/external boundary is unavailable, state `UNVERIFIED` for that boundary rather than substituting static inspection as proof.

If the bug reveals a durable design rule or reverses a stable decision, update the appropriate current docs/decision owner; otherwise avoid permanent process documentation for a one-off defect.