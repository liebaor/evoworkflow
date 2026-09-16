---
name: evo-spec-review
description: Review and, when unambiguous, revise a canonical Spec so its implementation direction fits the repository's existing architecture, framework capabilities and compatibility constraints before ticket planning begins.
compatibility: "Codex, Claude Code, OpenCode; requires evo-init repository guide + canonical Spec"
disable-model-invocation: true
metadata:
  opencode/autoinvoke: "false"
---

# EVO Spec Review

## Purpose

Prevent a technically plausible Spec from steering implementation away from the repository's established architecture or framework-native capabilities.

This is a lightweight architecture/repository-fit gate. It does not replace upstream `to-spec`, does not create a parallel Spec, and must not turn a product Spec into a file-by-file implementation plan.

## Preconditions

- `evo-init` has produced a current `docs/agents/repository.md`.
- A canonical Spec/parent task exists, normally from upstream `to-spec`.

If either is missing, route to the missing prerequisite rather than guessing.

## Read first

Read the full canonical Spec, `docs/agents/repository.md`, linked architecture/coding standards, relevant ADRs/domain docs, representative implementations and reusable capability references that materially affect the proposed solution.

## Review axes

### Repository architecture fit

Check that the proposed direction respects existing module boundaries, dependency direction, contracts, data/permission conventions and established extension points.

### Framework-native fit

Check whether the repository/framework already provides the mechanisms the Spec appears to need: response/pagination abstractions, auth/permission, audit/logging, validation, persistence helpers, dictionary/state infrastructure, frontend components, test seams, migrations, or equivalent project-native capabilities.

### Capability Before Creation

Before the Spec endorses a new cross-cutting abstraction, shared helper, middleware, utility, component, service base, response/page/auth layer or infrastructure mechanism, confirm that an equivalent repository/framework capability does not already exist.

Classify material solution direction as `REUSE`, `EXTEND`, or `NEW` at the architecture/capability level. `NEW` requires an explicit reason existing capabilities cannot serve.

### Compatibility and migration

Surface breaking API/data/permission/behavior changes, required migrations and compatibility risks that the Spec should acknowledge before ticketing.

### Testability

Confirm the proposed direction can use existing behavioral seams where possible. Prefer repository-native test paths over inventing parallel seams.

## Canonical update

Do not create a review sidecar document.

When repository evidence makes the correction unambiguous and product intent is unchanged, revise the canonical Spec directly by adding or updating a concise `Repository Fit` / equivalent implementation-constraints section. Prefer stable module/capability/symbol references over brittle line numbers or code snippets.

A useful Repository Fit section answers:

- which existing architecture/module boundary is extended;
- which framework/shared capabilities must be reused;
- which representative pattern constrains the solution shape;
- whether the direction is `REUSE`, `EXTEND`, or `NEW`;
- any justified new abstraction or compatibility constraint.

If resolving the mismatch requires a new material product/architecture/security/data decision, do not decide silently. Report `BLOCKED` and route to the appropriate human/design decision path.

## Status

Use one status:

- `READY` — Spec already conforms or only non-material wording was normalized;
- `REVISED` — canonical Spec was updated to reflect confirmed repository constraints without changing product intent;
- `BLOCKED` — a material unresolved choice prevents safe ticket planning.

## Output

Report status, important repository/framework capabilities that govern implementation, any canonical Spec edits, unresolved material choices, and the expected next step (`to-tickets` when READY/REVISED).