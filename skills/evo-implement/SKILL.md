---
name: evo-implement
description: Implement one bounded ticket or task using the repository's existing structure, framework-native capabilities and representative patterns, with Reference Before Edit and Capability Before Creation, stopping before Git delivery.
compatibility: "Codex, Claude Code, OpenCode; optional Matt tdd/diagnosing-bugs capabilities"
disable-model-invocation: true
metadata:
  opencode/autoinvoke: "false"
---

# EVO Implement

## Purpose

Deliver one bounded vertical behavior without introducing a parallel architecture, duplicate framework capability or bundling Git delivery into implementation.

## Read first

Read the owning Spec/ticket, acceptance criteria, its `Repository Fit` section when tracker-backed, `docs/agents/repository.md`, relevant linked standards/ADRs/domain context, affected source/tests and the nearest consumer path.

If repository guidance is missing or materially contradicted by current code, route to `evo-init` before substantial implementation. If a planned ticket graph exists but the current ticket has not passed `evo-plan-review` after the latest material change, run that gate before implementation rather than improvising a plan locally.

## Reference Before Edit

Before a non-mechanical edit:

1. identify the nearest representative implementation for each material concern;
2. trace the real consumer path through the layers being changed;
3. classify the approach as `REUSE`, `EXTEND`, or `NEW`;
4. reopen the real reference/capability source at execution time; do not rely only on a stale ticket summary;
5. for `NEW`, explain why an existing capability/pattern cannot be extended.

A material new architecture boundary, permission mechanism, persistence model or cross-cutting abstraction is a design/decision escalation, not an implementation convenience.

## Capability Before Creation

Before adding any shared class/helper/utility/component/middleware/base abstraction, response/page wrapper, auth/permission mechanism, persistence wrapper, logging/audit mechanism, import/export helper or similar reusable capability:

1. search `docs/agents/repository.md` Reusable Capabilities;
2. inspect the actual framework/project implementation behind the relevant capability;
3. search nearby source for equivalent usage;
4. prefer the existing owner through `REUSE` or `EXTEND`;
5. use `NEW` only when the existing project/framework capability cannot satisfy the accepted requirement, and surface material consequences before coding.

Repository-specific framework usage outranks generic tutorials or the model's preferred stack pattern. For example, a RuoYi-based repository should normally reuse its existing response, pagination, security, logging, dictionary, data-scope and CRUD conventions rather than introducing parallel generic abstractions.

## Workflow

1. Restate the bounded observable outcome and out-of-scope boundary.
2. Reuse existing modules/framework capabilities/helpers/contracts before adding abstractions.
3. When a stable behavioral seam exists and upstream `tdd` is installed, apply `tdd`; do not assume a harness-specific invocation syntax. If absent, continue with focused project-native tests and explicitly note that the upstream TDD capability was unavailable.
4. Implement the smallest coherent vertical change while preserving repository module boundaries and the ticket's Repository Fit contract.
5. Run focused type/test/lint/build feedback appropriate to the touched path.
6. If accepted intent changed, stop into `evo-change`.
7. If a difficult observed failure needs root-cause diagnosis and `diagnosing-bugs` is installed, apply it; do not hide repeated failure behind speculative edits.

## Stop

Stop for unresolved product meaning, breaking compatibility, material architecture/security/privacy choice, destructive data action, unexpected paid/external dependency, protected credential/production authorization, or scope expansion that changes acceptance.

## Output

Report outcome, `REUSE/EXTEND/NEW` references, existing capabilities reused/extended, any new capability justification, changed areas, focused checks actually run, remaining uncertainty, and the next expected step (`evo-verify`). Do not commit or push.
