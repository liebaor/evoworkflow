---
name: evo-recover
description: Reconstruct the current engineering state of a repository from durable EVO context, Git/worktree evidence and relevant verification so a fresh session or model can continue safely.
compatibility: "Codex, Claude Code, OpenCode; Git repository with EVO knowledge"
disable-model-invocation: true
metadata:
  opencode/autoinvoke: "false"
---

# EVO Recover

## Purpose

Restore reliable project context without requiring previous chat history or a handoff message.

## When to use

Use when:

- a fresh session/model/agent enters ongoing work;
- chat context was lost;
- the user wants to resume a partially completed task from repository state.

## Read first

Read in this order unless repository evidence suggests otherwise:

1. standing repository instructions;
2. `.evo/current.md`;
3. active `.evo/changes/` records;
4. relevant `.evo/project.md`, `references.md`, `capabilities.md`, decisions/learnings;
5. `git status` / current branch/worktree;
6. recent commits and diff;
7. relevant tests/CI/runtime evidence;
8. canonical tracker/spec/ticket state when referenced by the repository.

## Process

1. Identify the current goal and canonical work owner.
2. Compare `.evo/current.md` with current Git/worktree evidence.
3. Confirm what is completed from commits/tests/evidence rather than labels alone.
4. Identify in-progress/uncommitted work and its likely intent.
5. Identify blockers, pending verification and unresolved decisions.
6. Check whether relevant EVO knowledge is stale relative to current changes.
7. Update `.evo/current.md` only with confirmed current state.
8. Recommend the single next engineering action.

## Decision rules

- Repository evidence outranks stale current-state prose.
- Do not mark work complete merely because code exists; look for the project's normal verification evidence when available.
- Do not reconstruct product intent from guesses when canonical intent is missing.
- If knowledge appears stale, route to `evo-refresh` rather than silently trusting it.
- If accepted intent changed, route to `evo-change`.

## Writes

May update `.evo/current.md` to converge it on confirmed repository truth. Do not rewrite product specs/tickets or implementation during recovery.

## Stop conditions

Stop and expose uncertainty if current work cannot be safely inferred from repository/tracker evidence or if conflicting intent owners exist.

## Output

Return:

- current goal;
- confirmed completed state;
- in-progress work;
- blockers/pending verification;
- stale or uncertain knowledge;
- active change context;
- one recommended next action.
