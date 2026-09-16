---
name: evo-finish
description: "Converge verified/reviewed delivered work into repository current truth by updating only the real owners: current docs, domain context, ADRs and tracker state."
compatibility: "Codex, Claude Code, OpenCode; repository/tracker aware"
disable-model-invocation: true
metadata:
  opencode/autoinvoke: "false"
---

# EVO Finish

## Preconditions

Required parent acceptance is PASS or explicitly accepted UNVERIFIED, and no blocking `evo-review` findings remain.

## Read first

Read the source Spec/parent task, ticket graph/comments, final verification/review, current docs/contracts, `CONTEXT.md`/configured domain docs, ADR convention, repository guide and Git diff/history.

## Workflow

1. Update current product/API/architecture/operator docs only where shipped behavior changed them.
2. Update domain context only for stable domain vocabulary/facts; do not turn it into a feature log.
3. Create/supersede ADRs only when the repository's durable-decision threshold is met.
4. Reconcile or close the parent Spec/task and remaining tickets using the configured tracker protocol. Remove stale future-tense claims that now contradict shipped reality; preserve historical discussion through tracker/Git history rather than copying it elsewhere.
5. Refresh `docs/agents/repository.md` only if commands, module boundaries, authorities or representative patterns materially changed.
6. Check references after any document/task cleanup.

## Boundary

Finish does not manufacture missing implementation evidence, perform code review, commit, push, merge, tag, release or deploy.

## Output

Report current-truth owners changed, durable decisions retained/created, tracker artifacts reconciled, repository-guide changes and intentionally accepted limitations. Next: `evo-commit` when Finish produced a deliverable diff.