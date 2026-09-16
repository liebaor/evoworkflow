---
name: evo-learn
description: Promote stable project-specific engineering lessons from bugs, reviews, incidents and implementation discoveries into the smallest correct durable EVO knowledge owner.
compatibility: "Codex, Claude Code, OpenCode; Git repository with EVO knowledge"
disable-model-invocation: true
metadata:
  opencode/autoinvoke: "false"
---

# EVO Learn

## Purpose

Turn valuable engineering discoveries into durable project memory without turning `.evo/` into a dump of task notes or generic programming advice.

## When to use

Use after a bug diagnosis, review finding, incident, migration or implementation discovery reveals knowledge that may help future agents.

## Read first

Read the evidence for the discovery, relevant source/tests, existing `.evo/project.md`, `references.md`, `capabilities.md`, decisions and learnings.

## Promotion test

Persist a lesson only if all are true:

1. **Evidence-backed** — the lesson is supported by repository/runtime/test evidence.
2. **Stable** — it is likely to remain relevant beyond the current task.
3. **Project-specific** — the project context materially matters; generic language/framework facts alone do not qualify.
4. **Future-useful** — a future agent is likely to make a better decision because of it.
5. **Non-duplicate** — the same fact is not already owned adequately elsewhere.

If any test fails, do not persist the lesson.

## Process

1. Separate symptom, root cause, fix and reusable lesson.
2. Apply the promotion test.
3. Determine the smallest correct canonical owner:
   - capability discovery → `capabilities.md`;
   - representative implementation → `references.md`;
   - architecture/convention/constraint → `project.md`;
   - durable choice with alternatives/consequences → `decisions/`;
   - otherwise durable contextual lesson → `learnings/`.
4. Link to evidence and record scope/confidence/observation point.
5. Avoid duplicating the same rule in multiple places.

## Decision rules

- A bug fix is not automatically a durable lesson.
- Generic framework knowledge belongs in external/framework documentation unless the repository uses it in a project-specific way.
- One isolated implementation normally remains `Observed`, not a project rule.
- If an existing stronger owner can absorb the lesson, update it rather than creating another standalone note.

## Writes

Update only the canonical durable knowledge owner and, when useful, a concise learning trace under `.evo/learnings/`.

## Stop conditions

If evidence is weak or the lesson's scope cannot be bounded, report it as non-promoted/uncertain instead of creating durable knowledge.

## Output

Return:

- candidate lesson;
- promotion decision (`PROMOTED` or `NOT PROMOTED`);
- canonical owner when promoted;
- scope/confidence/evidence;
- any duplicate/stale knowledge reconciled.
