---
name: evo-change
description: Propagate changed accepted intent through the real Spec/tickets/ADRs/docs/tests while preserving unaffected implementation and evidence; no parallel EVO change database.
compatibility: "Codex, Claude Code, OpenCode; tracker-aware"
disable-model-invocation: true
metadata:
  opencode/autoinvoke: "false"
---

# EVO Change

## Purpose

Make requirement evolution explicit without rewriting unrelated work or creating a second source of truth.

## Read first

Read the canonical old Spec/parent task, current ticket graph and comments, relevant domain/ADRs, current implementation/tests/docs, Git history/status and any prior verification notes.

## Classify

Classify the change as one or more of:

- clarification — wording changes but accepted outcome does not;
- living revision — unfinished behavior/scope/acceptance changes;
- evidence-driven refinement — a new fact resolves an earlier unknown;
- stable reversal — a previously shipped durable decision is reversed;
- independent decision — a new material trade-off has appeared.

## Delta

For outcome, non-goals, acceptance, tickets/blockers, code/contracts, tests/evidence, docs, data/migration/compatibility and decision rationale, mark:

`RETAIN | REVISE | REMOVE | ADD`

## Apply to canonical owners

- Revise the existing unfinished Spec/parent task instead of creating `final-v2` copies.
- Preserve unaffected closed tickets; update/reopen only tickets whose delivered acceptance is invalidated; add/remove work where required and record why.
- Update blocking edges/frontier through the configured tracker protocol.
- Update `CONTEXT.md` only when domain language/facts changed.
- For a durable reversal, create/supersede ADRs according to the repository's ADR convention rather than rewriting history.
- Keep unaffected implementation and evidence valid; only affected acceptance claims require new proof.
- Do not create `.evo/delta`, `.evo/state`, or a duplicate progress ledger.

If the user's new instruction is explicit enough to authorize the changed intent, do not require a ceremonial second approval. Stop only when a material choice remains ambiguous or crosses a new product/security/privacy/data/compatibility/architecture boundary.

## Output

Provide a concise Delta table, canonical artifacts/tickets changed, evidence invalidated/preserved, and the new ready frontier or next Skill.
