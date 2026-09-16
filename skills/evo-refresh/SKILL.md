---
name: evo-refresh
description: Refresh only the repository knowledge whose evidence surface may have changed since its observation point, preserving unaffected knowledge and confidence.
compatibility: "Codex, Claude Code, OpenCode; Git repository with EVO knowledge"
disable-model-invocation: true
metadata:
  opencode/autoinvoke: "false"
---

# EVO Refresh

## Purpose

Keep the Repository Engineering Contract aligned with current repository truth without re-running full archaeology unnecessarily.

## When to use

Use when repository code/docs/architecture have changed after `evo-init`, or when relevant EVO knowledge may be stale.

## Read first

Read standing repository instructions, the relevant `.evo/` knowledge, each affected entry's observation metadata, current Git HEAD/status, and the diff/history since the relevant observation point.

## Process

1. Determine the last observation point for the relevant knowledge.
2. Compare it with current repository changes.
3. Map changed files/modules/contracts to potentially affected knowledge entries.
4. Preserve entries whose evidence surface is unchanged.
5. Re-read source/tests/docs for affected concerns only.
6. Update, retire, split, merge, or downgrade confidence on stale entries as evidence requires.
7. Update observation metadata for knowledge actually revalidated.
8. Report unresolved conflicts or uncertainty.

## Decision rules

- A newer HEAD does not make all knowledge stale.
- Freshness is scoped to evidence surfaces and dependencies.
- Do not refresh unrelated concerns for cosmetic repository changes.
- Source/tests/runtime evidence overrides a stale summary.
- Preserve stable user-authored decisions and instructions unless current accepted intent supersedes them.

## Writes

Update only affected `.evo/project.md`, `.evo/references.md`, `.evo/capabilities.md`, `.evo/current.md`, decisions/learnings as necessary.

Do not implement unrelated product work.

## Stop conditions

Stop if the observation point cannot be established and targeted refresh would be unsafe; recommend `evo-init` only when the knowledge baseline is materially unusable.

## Output

Return:

- changed evidence surfaces;
- knowledge refreshed;
- knowledge preserved unchanged;
- entries retired/downgraded;
- unresolved uncertainty;
- new observation point(s).
