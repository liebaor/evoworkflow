---
name: evo-verify
description: Prove each acceptance claim with direct project-native evidence and report PASS, FAIL or UNVERIFIED without silently fixing implementation.
compatibility: "Codex, Claude Code, OpenCode; project-native tests/runtime/CI"
disable-model-invocation: true
metadata:
  opencode/autoinvoke: "false"
---

# EVO Verify

## Purpose

Answer whether the requested behavior is actually supported by evidence, independently of whether the implementation looks plausible.

## Read first

Read the owning Spec/ticket acceptance criteria, relevant repository verification commands, implementation diff and available environment/runtime paths.

## Evidence map

For every acceptance criterion identify:

1. observable behavior or required absence;
2. likely failure surface;
3. direct evidence that could falsify/support it;
4. exact test/build/runtime/inspection path to execute.

Match evidence to risk. Prefer focused tests for local logic, integration for composition/persistence, real API/browser/application paths for user-visible behavior, and genuine external E2E only when that boundary is available.

## Status

- **PASS** — direct evidence was actually executed/observed and supports the claim.
- **FAIL** — direct evidence contradicts the claim.
- **UNVERIFIED** — required direct evidence is unavailable or was not run.

Static source inspection proves source shape, not runtime behavior. Build/lint success proves only the rules those tools check.

## Persistence

When operating under a tracker-backed Goal or when durable evidence is useful, record a concise verification summary on the owning ticket using the configured tracker protocol. Do not create a separate EVO evidence database.

## Boundary

Do not repair code inside Verify. FAIL routes back to `evo-implement` or upstream `diagnosing-bugs`; changed intent routes to `evo-change`.

## Output

Return `Acceptance | Evidence | Status | Scope/Notes`, list commands/paths actually executed, and identify skipped/unavailable boundaries.
