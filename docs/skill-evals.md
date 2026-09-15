# EVO Skill Behavioral Eval Scenarios

Use these scenarios when changing Skill descriptions, routing, or phase boundaries. The goal is behavioral consistency, not keyword matching.

## E1 — First-time Brownfield repository

**Situation:** User opens an unfamiliar RuoYi/Spring Boot repository and asks how to start using EVO.

**Expected:** `ask-evo` routes to `evo-init`. Init reads repository-native Maven/BOM/source/test conventions and does not ask the user for facts the Agent can inspect.

## E2 — Fresh session, active feature already exists

**Situation:** Repository already contains an active Spec/issue/plan and changed files; a new Agent asks what is happening.

**Expected:** route to `evo-recover`, not `evo-init`.

## E3 — Ambiguous product behavior

**Situation:** User says "add meeting-room reservations" but conflict behavior, cancellation rules, and permissions are undecided.

**Expected:** `evo-grill-with-docs`. Agent investigates existing repository facts itself and asks human decisions in dependency-aware rounds with recommended answers.

## E4 — Current framework/API uncertainty

**Situation:** Implementation depends on the currently supported OpenAI/Spring/Vue API behavior or a recent breaking change.

**Expected:** `evo-research` uses current primary sources. Repository-local facts are not unnecessarily sent to web research.

## E5 — Spec synthesis after clarification

**Situation:** Requirements and choices were already settled in conversation/repository.

**Expected:** `evo-spec` synthesizes; it does not restart a broad interview. If it discovers one material unresolved decision, it stops and routes back rather than inventing it.

## E6 — Fresh-Agent slice quality

**Situation:** A feature needs multiple implementation steps.

**Expected:** `evo-plan` creates vertical slices that a new Agent can execute with linked authority, scope/non-goals, prior art, blocking edges, and concrete verification.

## E7 — Requirement changes at 50% implementation

**Situation:** User changes one accepted behavior while other work remains valid.

**Expected:** `evo-change` classifies the delta and retains unaffected code/tests/evidence instead of restarting the feature.

## E8 — Hard bug

**Situation:** A regression is reported with uncertain cause.

**Expected:** `evo-bug` establishes a tight failing feedback loop before broad theorizing, then root cause → minimal fix → regression → real path verification.

## E9 — Tests pass but UI not exercised

**Situation:** Unit/build checks pass, but acceptance includes a user-visible UI flow and no browser/runtime check was run.

**Expected:** `evo-verify` marks the UI acceptance `UNVERIFIED`, not PASS.

## E10 — Review catches duplicated architecture

**Situation:** Acceptance evidence passes, but implementation created a second permission/response/data mechanism instead of using the repository pattern.

**Expected:** `evo-review` can return `NOT READY` even though Verify passed.

## E11 — Finish after successful review

**Situation:** Feature is verified and reviewed, but the working proposal still uses future tense and current docs do not mention the shipped contract.

**Expected:** `evo-finish` converges docs/decision/work artifacts without adding feature scope or silently performing Git delivery actions.

## E12 — Tiny mechanical edit

**Situation:** Change one button label with no contract/rationale impact.

**Expected:** no forced Spec/Plan. `ask-evo` may route directly to a small `evo-implement` step with focused check.

## Evaluation questions

For each scenario inspect whether the Agent:

- selected the correct Skill;
- respected the adjacent-Skill boundary;
- used repository evidence before chat memory;
- distinguished facts from human decisions;
- used the minimum necessary process;
- reported evidence at the scope it actually proves;
- left durable knowledge cleaner than it found it.
