---
name: evo-plan-review
description: Review and normalize a canonical ticket graph so each planned slice conforms to the repository's existing modules, framework-native capabilities, reusable utilities/components and representative implementation patterns before execution.
compatibility: "Codex, Claude Code, OpenCode; requires evo-init repository guide + tracker-backed tickets"
disable-model-invocation: true
metadata:
  opencode/autoinvoke: "false"
---

# EVO Plan Review

## Purpose

Make repository conformance explicit before implementation. Upstream `to-tickets` owns vertical slicing and blocking edges; this Skill checks whether those tickets plan the work in the way this repository is actually meant to be extended.

Do not create a second plan/review ledger. Correct the canonical tickets when the correction is mechanical and intent-preserving.

## Preconditions

- `evo-init` has produced a current `docs/agents/repository.md`.
- The canonical Spec has passed `evo-spec-review` after the latest material accepted-intent change.
- A canonical ticket graph exists, normally from upstream `to-tickets`.

## Read first

Read the full Spec/parent task, every in-scope ticket and blocker, `docs/agents/repository.md`, linked standards/ADRs/domain context, relevant source/tests and the representative implementations/capabilities that govern the planned work.

## Review every ticket

For each ticket, establish a concise Repository Fit contract:

### Module fit

Identify which existing module/boundary the slice extends and whether the dependency direction matches the repository architecture.

### Representative implementation

Identify the nearest existing production pattern for the material concerns in the ticket. Prefer a stable symbol/module/guide reference over brittle line numbers or copied code.

### Capability Before Creation

Before the ticket proposes any new shared utility, helper, base class, middleware, response/page abstraction, permission/auth mechanism, persistence wrapper, frontend component infrastructure or other reusable mechanism, search the repository/framework capability map and relevant source for an existing equivalent.

### Reuse strategy

Classify the ticket as `REUSE`, `EXTEND`, or `NEW`:

- `REUSE` — compose/use existing capability without changing its abstraction;
- `EXTEND` — add behavior within an existing pattern/extension point;
- `NEW` — introduce a genuinely new capability/abstraction.

`NEW` must explain why the current framework/repository capabilities cannot satisfy the requirement. Material architecture/security/data/compatibility consequences are not automatically approved by this Skill.

### Verification fit

Identify the repository-native test/verification pattern the ticket should use. Prefer existing seams and real consumer paths over a new parallel test architecture.

## Preserve good ticket design

Do not undo upstream `to-tickets` tracer-bullet slicing merely to make tickets layer-oriented. Preserve vertical behavior, blocking edges and fresh-context sizing unless repository evidence shows the graph itself is invalid.

## Canonical update

When a ticket can be corrected without changing accepted product intent, edit that canonical ticket directly. Add or update a concise `Repository Fit` section containing, as applicable:

- Module / boundary
- Reference pattern
- Reuse capabilities
- Strategy: `REUSE | EXTEND | NEW`
- New abstraction justification (only when NEW)
- Verification pattern

Remove planned duplicate abstractions when an existing repository/framework capability is the confirmed owner.

If the existing ticket graph proposes a materially different architecture, breaking compatibility, destructive data path, new security model or other unresolved decision, report `BLOCKED`; do not silently normalize that decision away.

## Gate status

Use one overall status:

- `READY` — all executable tickets have adequate Repository Fit and no unresolved material conformance issue;
- `REVISED` — canonical tickets were corrected/annotated and are now ready;
- `BLOCKED` — at least one material decision prevents safe execution.

`evo-goal` must not begin on an unreviewed or BLOCKED ticket graph. If a later `evo-change` invalidates architecture/capability assumptions, rerun the affected conformance gate before resuming.

## Output

Report gate status, tickets revised, duplicated/new capabilities prevented, unresolved decisions, and the ready frontier. Do not implement code.