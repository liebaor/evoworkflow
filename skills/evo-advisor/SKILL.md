---
name: evo-advisor
description: Provide repository-aware senior engineering guidance by combining current project evidence, established patterns and capabilities, relevant tradeoffs, and current external technical knowledge when needed.
compatibility: "Codex, Claude Code, OpenCode; Git repository"
disable-model-invocation: true
metadata:
  opencode/autoinvoke: "false"
---

# EVO Advisor

## Purpose

Act as a repository-aware senior engineering advisor.

Help the user decide **how an engineering problem should be approached and why** without taking over the project's normal specification, planning, implementation, testing, debugging, or review workflow.

`ask-evo` answers **what EVO action should happen next**. `evo-advisor` answers **what engineering approach makes sense in this repository, what tradeoffs exist, and what should be considered before proceeding**.

## When to use

Use `evo-advisor` when the user asks questions such as:

- How should this feature be designed in this project?
- Which module or layer should own this behavior?
- Should we reuse, extend, or introduce a new capability?
- Which existing implementation should we follow?
- What are the tradeoffs between two implementation approaches?
- Is this architecture/refactor direction appropriate for the current repository?
- What risks or hidden dependencies should we consider?
- How should a current external framework/library practice be adapted to this repository?
- What should I understand before creating a spec, plan, or tickets?

## When not to use

Do not use `evo-advisor` merely to:

- initialize repository knowledge (`evo-init`);
- refresh stale EVO knowledge (`evo-refresh`);
- analyze an accepted requirement change (`evo-change`);
- promote durable project-specific learning (`evo-learn`);
- reconstruct interrupted work (`evo-recover`);
- route between EVO capabilities (`ask-evo`);
- perform implementation, testing, debugging, or code review itself.

If the user's question is primarily one of those operations, recommend the corresponding workflow instead of pretending advisory analysis replaces it.

## Read first

Use progressive disclosure. Read only what is relevant to the question:

1. standing repository instructions (`AGENTS.md`, `CLAUDE.md`, or equivalent);
2. `.evo/project.md` for architecture, boundaries, commands and constraints;
3. `.evo/capabilities.md` when the question may introduce shared machinery or framework-like behavior;
4. `.evo/references.md` for the nearest representative implementation;
5. `.evo/current.md` and active `.evo/changes/` when current work or accepted intent matters;
6. relevant source, tests, configuration, migrations and Git evidence needed to verify the advice.

Do not trust an EVO summary over conflicting current repository evidence.

If relevant EVO knowledge appears stale and its evidence surface changed, verify the source directly. If safe advice requires a broader freshness pass, recommend `evo-refresh`.

## Process

### 1. Frame the engineering question

Restate the decision to be made in concrete engineering terms. Separate:

- product intent;
- repository constraints;
- implementation choice;
- unknowns that materially affect the answer.

Do not invent missing product intent. When enough evidence exists for a useful answer, state assumptions instead of blocking on unnecessary questions.

### 2. Establish repository facts

Identify the smallest set of current facts that constrain the decision:

- module/layer ownership;
- dependency direction;
- existing data/API contracts;
- existing framework conventions;
- existing tests and extension seams;
- relevant operational or compatibility constraints.

Distinguish facts from inference.

### 3. Apply Reference Before Edit

Find the nearest representative implementation for each affected concern.

Explain whether the likely approach is:

- **REUSE** — use an existing capability/pattern as-is;
- **EXTEND** — extend the existing owner or pattern;
- **NEW** — introduce something new because existing owners are inadequate.

`NEW` requires explicit justification.

### 4. Apply Capability Before Creation

Before recommending a new helper, abstraction, component, middleware, response type, state mechanism, infrastructure service, or framework-like capability, check:

- `.evo/capabilities.md`;
- repository source;
- framework-native capabilities already used by the project.

Prefer the established owner unless there is a concrete mismatch.

### 5. Develop options

When there is a material choice, present 2–3 realistic options rather than one unexplained answer.

Compare them using repository-relevant criteria such as:

- consistency with existing architecture;
- implementation complexity;
- blast radius;
- migration/compatibility cost;
- testability;
- maintainability;
- operational risk;
- future change cost.

Do not create artificial alternatives when the repository already has a clear authoritative convention.

### 6. Use current external knowledge only when needed

If the answer materially depends on fast-changing external information — framework behavior, library guidance, platform APIs, standards, security guidance, or current tooling — research current authoritative sources when the harness supports it.

Prefer primary sources such as official documentation, specifications, maintainers' repositories, and release notes.

Keep the distinction explicit:

- **Repository fact** — what this project currently does;
- **External current fact** — what the relevant technology currently supports/recommends;
- **Recommendation** — how to reconcile the two for this project.

Do not automatically persist external research into `.evo/`. Only project-specific durable conclusions belong in repository knowledge, and those should be promoted through the appropriate knowledge owner after acceptance.

### 7. Give a recommendation

Give a concrete recommendation grounded in the evidence above.

A recommendation should normally include:

- preferred direction;
- why it fits this repository;
- what should be reused or extended;
- what should not be introduced unnecessarily;
- important risks/unknowns;
- the next useful engineering action.

For material architecture/product choices, make clear what still requires human acceptance before implementation.

## Decision rules

- Repository-specific evidence beats generic best practice when the existing approach is valid and intentional.
- Current source/tests/runtime evidence beats stale EVO summaries.
- Prefer REUSE, then EXTEND, then NEW when each can satisfy the accepted intent safely.
- Do not recommend a broad refactor merely because a cleaner theoretical architecture exists.
- Do not turn one observed implementation into a repository rule without sufficient evidence.
- Do not treat external best practice as a mandate when project constraints justify a different choice.
- Surface uncertainty instead of inventing repository facts.

## Writes

None by default.

`evo-advisor` is advisory and read-only. If the user accepts a durable project-specific decision or lesson, recommend recording it through the repository's canonical owner (for example an ADR, accepted spec/change artifact, or `evo-learn`) rather than silently writing knowledge during consultation.

## Stop conditions

Stop and expose the constraint when:

- relevant repository evidence is inaccessible;
- the answer depends on unresolved product intent that changes the architecture materially;
- relevant knowledge is too stale to support safe advice without refresh;
- the requested recommendation would require inventing current system behavior.

## Output

Use this compact structure when it fits:

```text
Engineering question

Repository facts
- ...

Options / tradeoffs
- ...

Recommendation
- ...

Risks / unknowns
- ...

Next action
- ...
```

Keep the advice practical and repository-specific. The goal is to help the user make a better engineering decision, not to produce a generic tutorial.