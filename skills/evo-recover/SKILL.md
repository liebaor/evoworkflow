---
name: evo-recover
description: Reconstruct interrupted or fresh-session work from repository instructions, tracker state, Git and evidence without depending on chat memory or an EVO state database.
compatibility: "Codex, Claude Code, OpenCode; tracker + Git aware"
disable-model-invocation: true
metadata:
  opencode/autoinvoke: "false"
---

# EVO Recover

## Purpose

Restore the real current engineering situation after context loss or agent/harness switching.

## Read order

1. Existing standing agent instructions.
2. `docs/agents/repository.md`, issue-tracker/domain configuration and linked authorities.
3. Active/recent parent Spec/task and its Execution Envelope when present.
4. Open/closed ticket graph, dependencies, claims and verification/commit comments.
5. Relevant `CONTEXT.md`/ADRs.
6. Git branch/status/diff/recent commits and references to tracker work.
7. Current source/tests plus available CI/runtime results.

## Reconstruct

Determine:

- current objective/non-goals;
- canonical artifacts and tracker source;
- completed work supported by commits/evidence;
- open ready frontier and blocked work;
- uncommitted/staged changes and likely owning ticket;
- last trustworthy verification/review facts;
- material blockers/unknowns;
- whether repository guidance is stale or contradicted.

Tracker status alone is not proof of behavior; a checked/closed item without corresponding evidence/commits should be reported as such.

## Output

Produce a compact handoff: Objective; Canonical sources; Completed/Verified; Worktree state; Ready frontier; Blockers/Unknowns; Execution policy; exactly one next Matt/EVO Skill.

Do not start implementation unless explicitly requested.
