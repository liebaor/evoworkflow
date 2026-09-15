---
name: evo-verify
description: Verify accepted outcomes with direct repository-native evidence. Use after implementation or whenever a completion claim needs proof. Map each acceptance item to a failure surface and real command/runtime path, and report PASS, FAIL, or UNVERIFIED without fixing code by default.
disable-model-invocation: true
---

# EVO Verify

## Purpose

Test accepted claims against direct evidence. Verification asks "did the required outcome actually happen?" and keeps executed facts separate from inference.

## Use when

- a bounded implementation claims to satisfy acceptance;
- a bug fix claims a regression is resolved;
- a change is about to enter independent review;
- the user asks what has actually been proven.

## Do not use when

- the main task is still implementation;
- expected behavior is unclear;
- there is no acceptance/outcome to verify yet;
- the user wants engineering quality review rather than outcome proof — use `evo-review` after verification.

## Read first

Read the original accepted outcome and its current owner: issue, Spec, proposal, acceptance list, or equivalent. Then inspect only enough implementation context to locate the relevant failure surfaces.

## Evidence map

For every acceptance claim identify:

1. **Observable** — what behavior, state, output, or absence would make the claim true;
2. **Failure surface** — where the claim can fail;
3. **Direct evidence** — what observation can falsify it;
4. **Method** — the exact project-native command, test, browser/API/runtime path, external environment, or inspection needed.

Match evidence to the risk:

- local logic/invariants → focused unit tests;
- wiring/composition/provider registration → integration/composition tests;
- persistence/recovery/event reconstruction → replay/resume/integration checks;
- user-visible UI/API behavior → real runnable product path;
- external service behavior → real external evidence when access exists;
- deletion/negative guarantees → negative search plus relevant runtime/tests;
- documentation/generated promises → repository synchronization checks;
- static structure/contracts → source/config/schema inspection where static evidence is actually sufficient.

A build/lint/format pass proves only the mechanical rule it checks. Static source inspection proves source facts, not runtime behavior.

## Execute and classify

For each acceptance item use one status:

- **PASS** — direct evidence was actually obtained and supports the accepted claim within the stated scope;
- **FAIL** — executed evidence contradicts the claim;
- **UNVERIFIED** — required direct evidence was not available or not run.

Do not turn "looks correct" into PASS.

## Output

Use a compact table:

| Acceptance | Evidence actually obtained | Status | Scope / gap |
|---|---|---|---|
| ... | ... | PASS / FAIL / UNVERIFIED | ... |

Then report:

- commands/runtime paths actually executed;
- meaningful failures;
- unavailable environments or external boundaries;
- overall conclusion limited to what the evidence proves.

## Behavior on failure

Verification is read/execute/report by default. Do not silently switch into implementation.

- FAIL caused by implementation defect → recommend `evo-implement` or `evo-bug` depending on whether it is ordinary incomplete work or an observed defect needing diagnosis;
- acceptance itself changed or is wrong → recommend `evo-change`;
- missing environment/access → keep `UNVERIFIED` and state exactly what is needed.

## Final checks

- every material acceptance item has a status;
- PASS is reserved for executed direct evidence;
- skipped checks are explicit;
- evidence matches the actual failure surface;
- negative requirements were checked negatively;
- semantic correctness was not inferred from unrelated mechanical success;
- verified work is ready for `evo-review` only when material acceptance is not FAIL.
