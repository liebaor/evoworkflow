---
name: evo-bug
description: Diagnose and fix an observed bug or performance regression through a tight failing feedback loop, competing hypotheses, root-cause analysis, minimal repair, regression coverage, and real consumer verification. Use when something is broken, failing, flaky, or unexpectedly slow.
---

# EVO Bug

## Purpose

Fix the proven cause, not just the visible symptom, and leave a regression signal that would fail if the bug returns.

## Use when

- behavior is broken relative to accepted intent;
- a test, build, runtime path, API, UI, job, migration, or integration fails;
- a regression or intermittent flake appears;
- performance degrades unexpectedly.

## Do not use when

- the expected behavior itself changed — use `evo-change`;
- the problem is primarily unclear product intent — use `evo-grill-with-docs`;
- the task is a planned feature rather than an observed failure.

## Diagnosis loop

### 1. State the failure

Record observed behavior, expected behavior, environment, and the narrowest known entry path.

### 2. Establish a tight red feedback loop

Before broad theorizing, find the smallest repeatable command, test, request, scenario, trace, or runtime check that demonstrates this bug.

If reproduction is not possible, gather the strongest available evidence and mark the unreproduced boundary `UNVERIFIED`. Do not pretend static inspection reproduces runtime behavior.

### 3. Minimize when useful

Reduce the reproduction until it isolates the failing boundary without removing the failure.

### 4. Form competing hypotheses

Use repository/runtime evidence to form a small set of plausible causes. Prefer hypotheses that make different predictions. Instrument or inspect to eliminate them instead of editing code by intuition.

### 5. Identify root cause

Explain:

- why the failure occurs;
- why the current behavior violates an existing invariant/pattern/contract;
- why the proposed fix addresses the cause rather than hiding the symptom.

### 6. Make the smallest coherent fix

Reuse the repository's existing pattern. Avoid unrelated cleanup unless it is required to make the fix correct.

### 7. Add regression coverage

The regression signal must be red before the fix when practical and green after it. A guard only guards if the bug would make it fail.

### 8. Re-run real paths

Run focused checks and at least one relevant assembled/consumer path when available.

## Escalation

If diagnosis proves the accepted requirement or architecture direction itself must change, stop and use `evo-change`. If a new material product decision is needed, use `evo-grill-with-docs`.

## Durable knowledge

Update a current doc/decision only when the bug reveals a durable invariant, reverses a stable decision, or changes a fact future work must know. Do not create permanent process documentation for every one-off defect.

## Output

Report:

- reproduction / failing loop;
- root cause;
- fix;
- regression coverage;
- commands/checks actually run;
- remaining unverified boundary;
- any durable rule learned.

## Final checks

- diagnosis was evidence-driven;
- a red feedback loop existed or the inability to reproduce is explicit;
- fix targets the root cause;
- regression coverage would catch recurrence;
- real consumer/composition path was checked when available;
- no requirement change was smuggled in as a bug fix.
