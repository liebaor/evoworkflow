---
name: evo-review
description: Review uncommitted or committed work before EVO delivery across repository conformance, accepted intent and evidence, including worktree changes that upstream commit-range review may not see.
compatibility: "Codex, Claude Code, OpenCode; Git worktree or commit diff"
disable-model-invocation: true
metadata:
  opencode/autoinvoke: "false"
---

# EVO Review

## Purpose

Provide an independent pre-delivery review that works for uncommitted Goal output as well as committed diffs.

Use upstream `code-review` unchanged when its fixed-point committed-diff workflow is the better fit. This Skill exists because EVO Goal normally reviews before `evo-commit` and therefore must see worktree/staged changes too.

## Read first

Read the owning Spec/ticket, `docs/agents/repository.md`, linked standards/ADRs, relevant reference implementations, verification result, Git status and the complete intended diff (worktree/staged and/or fixed commit range).

## Axes

### Repository Conformance

Does the change follow documented project rules, module boundaries, existing contracts and the declared `REUSE/EXTEND/NEW` approach? Flag unjustified parallel mechanisms, misplaced responsibilities and divergence from representative patterns.

### Intent

Does the diff satisfy the accepted outcome and non-goals without missing behavior or scope creep?

### Evidence

Does the available verification actually cover the important claims and real consumer path? Identify claims that are merely inferred.

Classify findings: `BLOCKING`, `IMPORTANT`, `OPTIONAL`. Do not invent findings to fill a template.

## Independence

When the harness supports fresh context/subagents, prefer an independent review context. Do not require one particular subagent API.

## Output

Findings first, each tied to evidence/path/acceptance where possible; then readiness and remaining uncertainty. Do not modify implementation during review.
