---
name: evo-recover
description: Reconstruct active working context from durable repository and Git evidence when a fresh or interrupted Agent/session must continue existing work. Use for context loss, handoff, or resumption; do not use for first-time repository onboarding.
disable-model-invocation: true
---

# EVO Recover

## Purpose

Produce a compact, trustworthy handoff for work that already exists, using durable repository evidence rather than private chat history.

## Use when

- a new Agent/session must continue active work;
- a long-running task was interrupted;
- context was compacted or lost;
- another contributor needs a repository-grounded handoff.

## Do not use when

- the repository has never been understood — use `evo-init`;
- the user only asks which Skill to use — use `ask-evo`;
- there is no active work to recover.

## Reconstruct in this order

1. applicable repository instructions;
2. active issue/spec/proposal/plan and its acceptance;
3. relevant current docs and stable decisions;
4. Git branch/status/diff/recent commits;
5. changed source/tests/docs;
6. verification or CI results that are actually available;
7. unresolved review findings or explicit blockers.

Read only the history needed to explain current work. Do not replay old chats or historical documents as present authority when current repository evidence has superseded them.

## Infer working state

Determine:

- current objective and non-goals;
- current owner document/issue;
- accepted decisions and patterns that govern the work;
- completed vs pending slices based on repository/Git evidence;
- changed files and likely current seam;
- evidence already obtained and its scope;
- open findings/blockers;
- the smallest safe next action.

If evidence conflicts, surface the contradiction instead of choosing whichever source is convenient.

## Output

Produce a compact handoff:

### Objective

What is being achieved and what is explicitly out of scope.

### Current authority

Links/paths for the active owner, relevant decisions, and current docs.

### Progress

What repository/Git evidence shows is already done.

### Remaining work

The next bounded pieces still pending.

### Verification state

What is PASS/FAIL/UNVERIFIED based on evidence actually present.

### Risks / blockers

Only material items that affect continuation.

### Next Skill

Recommend exactly one next EVO Skill and why.

## Final checks

- no private chat summary is treated as authority;
- progress claims are grounded in repository/Git evidence;
- old proposals are not mistaken for current facts;
- `evo-init` is not re-run merely because the Agent is new;
- no implementation begins inside Recover unless the user explicitly changes the task.
