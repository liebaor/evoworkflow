---
name: evo-init
description: Understand an existing repository for durable AI-assisted development. Use when EVO is being adopted for the first time, or when repository instructions, knowledge owners, build/test paths, and implementation patterns are not yet understood. Do not use merely because a new session started.
disable-model-invocation: true
---

# EVO Init

## Purpose

Make an existing repository legible to a fresh Agent while preserving the repository's own conventions.

## Use when

- EVO is being introduced to a repository for the first time;
- the current Agent cannot identify where project rules and current truth live;
- build/test/run paths are unclear;
- representative implementation patterns are not yet understood;
- the repository has durable knowledge gaps that repeatedly force rediscovery.

## Do not use when

- the repository is already understood and only the current task context was lost — use `evo-recover`;
- the only uncertainty is a current external technology fact — use `evo-research`;
- the user already supplied a bounded implementation task with sufficient repository context.

## Process

### 1. Explore before proposing structure

Inspect the repository's real sources of authority:

- root and nested Agent instructions;
- README, CONTRIBUTING, architecture/API/business/operations docs;
- manifests, lockfiles, dependency-management files, generated metadata;
- source layout and representative implementations;
- tests, build, lint, typecheck, run commands, CI;
- Git history relevant to current conventions;
- existing Spec/RFC/ADR/issue/decision conventions;
- domain vocabulary and public contracts.

Use the host project's own tools when they reveal facts more reliably than static reading, for example Maven effective POM/dependency tree, framework CLIs, package-manager metadata, test discovery, or Git history.

### 2. Classify findings

Separate important findings into:

- **Confirmed** — directly supported by repository/runtime evidence;
- **Inferred** — supported but not directly established; state the evidence and uncertainty;
- **Unknown** — not established.

An Unknown is blocking only when different answers would materially change the current task, safety, compatibility, or architecture.

### 3. Map knowledge owners

Identify which existing artifact already owns each responsibility:

- repository working rules;
- current architecture/system behavior;
- domain language and durable business facts;
- working proposals/specs/plans;
- stable decisions and rationale;
- executable behavior and contracts;
- verification commands and CI;
- delivery/history.

Prefer existing owners. Do not create parallel EVO-specific copies of facts the repository already owns.

### 4. Propose only missing durable guidance

If repeated future work would otherwise require rediscovery, propose the smallest missing structure. Typical examples are a concise repository instruction file, domain/context note, architecture entry point, or decision location — but only when no equivalent already exists.

Before writing standing guidance, show:

- what you found;
- what already owns each fact;
- genuine gaps;
- exact files you propose to create or update.

Get human confirmation before creating new standing repository rules or moving authority.

### 5. Write and summarize

Make only the approved knowledge changes. Keep instructions navigational and concise; put durable detail in the repository's normal docs.

## Output

Report:

- repository purpose and major boundaries;
- knowledge-owner map;
- representative implementation patterns to reuse;
- build/test/run paths that were actually confirmed;
- durable guidance created or updated;
- important remaining Unknowns and whether they block anything now.

## Completion check

Initialization is complete when a fresh Agent can determine:

1. what the repository is;
2. where current truth and rationale live;
3. how to inspect/build/test/run relevant areas;
4. which existing patterns should be reused;
5. where unfinished work and durable decisions are recorded;
6. which important facts remain genuinely unknown.
