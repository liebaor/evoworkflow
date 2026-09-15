---
name: evo-verify
description: Verify accepted outcomes using project-native tests, builds, runtime paths and direct observations. Use after implementation or bug repair. Report PASS, FAIL or UNVERIFIED per acceptance claim; do not silently fix code.
---

# EVO Verify

## Read first
`.evo/project.md`, owning Spec/Plan acceptance, relevant Decisions, implementation diff and available project commands/environments.

## Evidence map
For each acceptance claim identify:
1. observable behavior/absence;
2. failure surface;
3. direct evidence that can falsify it;
4. exact command/inspection/runtime path.

Match evidence to risk: local logic → focused unit tests; composition → integration tests; persistence/recovery → replay/resume; user-visible behavior → real app/browser/API path; external service → real E2E when available; deletion → negative search plus registration/export/docs/tests checks.

## Status
- **PASS** — direct evidence was executed/observed and supports the claim.
- **FAIL** — direct evidence contradicts the claim.
- **UNVERIFIED** — required evidence could not be obtained.

Static inspection proves source shape, not runtime behavior. Build/lint success proves only the encoded rule.

## Output
Use a table: Acceptance | Evidence | Status | Scope/Notes. Include commands actually run and skipped boundaries.

## Boundary
Do not repair implementation inside Verify. FAIL routes to Implement/Bug; changed intent routes to Change. Verified work routes to `evo-review`.