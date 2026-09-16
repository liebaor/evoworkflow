---
name: evo-init
description: Build a durable Repository Engineering Contract by semantically learning an existing repository's architecture, commands, representative implementations, reusable capabilities, conventions, constraints and current observation point.
compatibility: "Codex, Claude Code, OpenCode; Git repository"
disable-model-invocation: true
metadata:
  opencode/autoinvoke: "false"
---

# EVO Init

## Purpose

Make a repository legible to future agents without relying on chat history. Create a compact, evidence-backed Repository Engineering Contract that normal planning, coding, debugging and review workflows can consume through standing repository instructions.

This is semantic repository archaeology, not framework detection or file inventory generation.

## When to use

Use when:

- EVO knowledge does not yet exist;
- a repository is being onboarded for long-running AI-assisted development;
- existing EVO knowledge is so incomplete that targeted refresh is not sufficient.

For ordinary incremental repository changes after a valid initialization, use `evo-refresh`.

## When not to use

Do not use this Skill to:

- implement a feature;
- generate a product spec or ticket plan;
- perform ordinary debugging;
- copy the repository into documentation;
- convert generic framework documentation into project rules.

## Read first

Inspect the repository's existing standing instructions (`AGENTS.md`, `CLAUDE.md` or equivalent), README/current architecture/contributing docs, manifests/locks, build and CI configuration, formatter/linter/type/test configuration, application entry points, source roots, tests, migrations/contracts and recent Git history.

Treat existing authoritative repository instructions as constraints. Preserve unrelated user-authored instructions when adding EVO integration.

## Process

### 1. Establish the repository surface

Identify:

- applications and entry points;
- source/test/migration/config roots;
- manifests and dependency/build systems;
- CI and quality gates;
- relevant documentation authorities;
- monorepo/module boundaries when present;
- current Git commit and working-tree state.

Do not write a flat file inventory.

### 2. Reconstruct architecture from real paths

Trace at least one representative end-to-end path appropriate to the project, for example:

```text
UI -> client/API -> controller/handler -> service/domain -> persistence -> data store
```

Adapt to the actual repository shape. Confirm module boundaries, dependency direction and external-system/data boundaries from source evidence rather than directory names alone.

### 3. Mine representative implementations

Find current implementations that future work should inspect first for relevant concerns such as:

- CRUD or common request flow;
- complex business/service logic;
- persistence/migrations;
- permissions/authentication;
- transactions/error handling;
- frontend request/state/forms/tables;
- tests and fixtures.

Prefer current, widely used and tested examples. Record why an implementation is representative.

Classify evidence strength as:

- `Authoritative` — explicitly required by a current authority;
- `Representative` — strongly supported by repeated/current production usage;
- `Observed` — limited evidence; useful as a lead, not a rule.

### 4. Mine reusable capabilities

Search source and framework usage for existing capabilities likely to be reinvented, including when applicable:

- response envelopes;
- pagination;
- authentication/authorization;
- audit/logging;
- validation;
- persistence helpers;
- transactions/errors;
- caching;
- file/import/export/Excel;
- dictionaries/status handling;
- frontend request/state/form/table components;
- migrations and test helpers.

The goal is to answer “what already exists and who owns it?” before a future agent creates parallel infrastructure.

### 5. Extract commands, conventions and constraints

Confirm build/run/test/lint/typecheck/format commands from executable repository evidence. Record material conventions and constraints only when evidence supports them.

Surface meaningful conflicts between docs and current code instead of silently choosing one.

### 6. Synthesize `.evo/`

Create or refresh:

- `.evo/project.md`
- `.evo/references.md`
- `.evo/capabilities.md`
- `.evo/current.md` (minimal initial state)
- `.evo/decisions/`
- `.evo/changes/`
- `.evo/learnings/`

Follow `docs/knowledge-model.md` semantics when this Skill is used inside EVOworkflow itself; in consumer repositories, apply the same contract.

Knowledge must be link-oriented and compact. Reference paths/symbols/docs; do not paste large source bodies.

Each durable map records the current observation commit/date and evidence references sufficient for later freshness checks.

### 7. Install the consumption bridge

Ensure the repository's existing standing agent instruction file contains one concise `## Repository Engineering Context` section. Preserve surrounding instructions.

The section must tell agents that for non-trivial planning, ticketing, implementation, debugging and review they should:

- read `.evo/project.md` for architecture/boundaries/conventions;
- inspect `.evo/current.md` when current work state matters;
- search `.evo/capabilities.md` before creating shared infrastructure;
- search `.evo/references.md` for representative implementations;
- verify important facts against source when relevant EVO evidence may be stale.

Do not copy the full knowledge base into the standing instruction file.

### 8. Consistency check

Before finishing, verify:

- important claims link to evidence;
- confidence is not overstated;
- representative references still exist;
- capabilities have real owners;
- project/current/reference/capability files do not duplicate the same fact unnecessarily;
- the standing agent instruction bridge points to the actual `.evo/` paths.

## Decision rules

### Reference Before Edit

Future non-trivial implementation should identify the nearest representative implementation before editing and prefer `REUSE` or `EXTEND` over `NEW` when adequate owners exist.

### Capability Before Creation

Before creating shared helpers, wrappers, base classes, middleware, components or framework-like mechanisms, future agents should search `capabilities.md` and current source for an existing owner.

### Source > Summary

If EVO knowledge conflicts with current source/tests/runtime evidence, current evidence wins and the knowledge should be refreshed or downgraded.

## Writes

Writes only repository knowledge/instruction integration needed for initialization. Do not implement product functionality.

## Stop conditions

Stop and report uncertainty if:

- relevant repository areas are inaccessible;
- current authorities materially conflict and source evidence cannot resolve them;
- architecture cannot be safely reconstructed from available evidence.

Do not fabricate a clean architecture when the repository is inconsistent.

## Output

Summarize:

- confirmed architecture and authorities;
- key representative references;
- key reusable capabilities;
- important constraints/conflicts/unknowns;
- observation commit;
- whether the Repository Engineering Contract is ready for normal engineering workflows.
