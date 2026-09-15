# Example — RuoYi Brownfield feature with EVO v1

Scenario: add a meeting-room management feature to an existing RuoYi Spring Boot/Vue repository.

## 1. Init

Use `evo-init` to inspect the actual repository. Let the Agent read parent/BOM dependency management, representative controllers/services/mappers, permission annotations, response wrappers, pagination helpers, frontend page patterns, tests and Git history. If exact dependency versions matter, use Maven's own effective POM/dependency tree rather than an EVO scanner.

## 2. Clarify

Use `evo-grill-with-docs` to settle business behavior such as room fields, booking conflicts, permissions, status lifecycle and deletion rules. Update existing domain docs/decisions only when the information is durable.

## 3. Spec/plan only when needed

For a substantial feature, use `evo-spec` to record observable acceptance and direct evidence, then `evo-plan` to split vertical slices. A tiny label/style edit does not need this machinery.

## 4. Implement by existing pattern

`evo-implement` should reuse the repository's existing permission, AjaxResult, pagination, mapper, service, validation and Vue conventions instead of creating EVO-specific abstractions.

## 5. Verify with RuoYi's tools

Use the project's actual Maven/npm/browser/API checks. Record exact commands and outcomes. If no CI configuration is present, that is not automatically a blocker for local feature work. If the target environment is unavailable, mark that boundary unverified.

## 6. Requirement changes

If the user changes the requirement mid-way, use `evo-change`: revise the living proposal if work has not shipped, preserve unaffected work/tests, and rerun only invalidated evidence. A stable shipped design reversal gets a new cross-linked decision.

This example illustrates the v1 principle: **the repository does not adapt to EVO; EVO adapts to the repository.**