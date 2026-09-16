---
name: evo-implement
description: Implement one bounded ticket or task using the repository's existing structure and representative patterns, with Reference Before Edit and focused feedback, stopping before Git delivery.
compatibility: "Codex, Claude Code, OpenCode; optional Matt tdd/diagnosing-bugs capabilities"
disable-model-invocation: true
metadata:
  opencode/autoinvoke: "false"
---

# EVO Implement

## Purpose

Deliver one bounded vertical behavior without introducing a parallel architecture or bundling Git delivery into implementation.

## Read first

Read the owning Spec/ticket, acceptance criteria, `docs/agents/repository.md`, relevant linked standards/ADRs/domain context, affected source/tests and the nearest consumer path.

If repository guidance is missing or materially contradicted by current code, route to `evo-init` before substantial implementation.

## Reference Before Edit

Before a non-mechanical edit:

1. identify the nearest representative implementation for each material concern;
2. trace the real consumer path through the layers being changed;
3. classify the approach as `REUSE`, `EXTEND`, or `NEW`;
4. for `NEW`, explain why an existing capability/pattern cannot be extended.

A material new architecture boundary, permission mechanism, persistence model or cross-cutting abstraction is a design/decision escalation, not an implementation convenience.

## Workflow

1. Restate the bounded observable outcome and out-of-scope boundary.
2. Reuse existing modules/helpers/contracts before adding abstractions.
3. When a stable behavioral seam exists and upstream `tdd` is installed, apply `tdd`; do not assume a harness-specific invocation syntax. If absent, continue with focused project-native tests and explicitly note that the upstream TDD capability was unavailable.
4. Implement the smallest coherent vertical change.
5. Run focused type/test/lint/build feedback appropriate to the touched path.
6. If accepted intent changed, stop into `evo-change`.
7. If a difficult observed failure needs root-cause diagnosis and `diagnosing-bugs` is installed, apply it; do not hide repeated failure behind speculative edits.

## Stop

Stop for unresolved product meaning, breaking compatibility, material architecture/security/privacy choice, destructive data action, unexpected paid/external dependency, protected credential/production authorization, or scope expansion that changes acceptance.

## Output

Report outcome, `REUSE/EXTEND/NEW` references, changed areas, focused checks actually run, remaining uncertainty, and the next expected step (`evo-verify`). Do not commit or push.
