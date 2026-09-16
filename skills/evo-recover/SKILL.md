---
name: evo-recover
description: Reconstruct interrupted or fresh-session work from repository instructions, tracker state, repository-conformance gates, Git and evidence without depending on chat memory or an EVO state database.
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
3. Active/recent parent Spec/task, including its `Repository Fit` / `evo-spec-review` state and Execution Envelope when present.
4. Open/closed ticket graph, dependencies, per-ticket `Repository Fit`, claims and verification/commit comments.
5. Relevant `CONTEXT.md`/ADRs.
6. Git branch/status/diff/recent commits and references to tracker work.
7. Current source/tests plus available CI/runtime results.

## Reconstruct

Determine:

- current objective/non-goals;
- canonical artifacts and tracker source;
- whether the Spec conformance gate is current, missing, blocked or stale;
- whether the executable ticket frontier has passed `evo-plan-review` after the latest material change;
- completed work supported by commits/evidence;
- open ready frontier and blocked work;
- uncommitted/staged changes and likely owning ticket;
- last trustworthy verification/review facts;
- material blockers/unknowns;
- whether repository guidance, representative patterns or reusable capability assumptions are stale or contradicted.

Tracker status alone is not proof of behavior; a checked/closed item without corresponding evidence/commits should be reported as such. Likewise, an open ticket is not execution-ready merely because its blockers are closed if its Repository Fit gate is missing/stale.

## Output

Produce a compact handoff: Objective; Canonical sources; Conformance gate state; Completed/Verified; Worktree state; Ready frontier; Blockers/Unknowns; Execution policy; exactly one next Matt/EVO Skill.

Do not start implementation unless explicitly requested.
