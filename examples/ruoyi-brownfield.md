# RuoYi Brownfield example — EVOworkflow 2.0

Scenario: add Supplier Management to an existing RuoYi-derived system without creating a parallel architecture.

## Adopt

```text
setup-matt-pocock-skills
→ evo-init
```

`evo-init` should inspect the actual checkout and produce `docs/agents/repository.md` with references for concerns such as:

- controller/service/mapper flow;
- existing response model (`AjaxResult` or the repository's actual equivalent);
- pagination (`BaseController`, `startPage`, `getDataTable` or the repository's actual equivalent);
- permission annotations and menu/button permission naming;
- `SecurityUtils` or the repository's authenticated-user mechanism;
- `@Log` / `BusinessType` or the repository's audit mechanism;
- DataScope or equivalent data-permission behavior;
- dictionary/status conventions;
- transaction/error conventions;
- Vue request/table/form/permission/dictionary patterns;
- Excel/import-export/file helpers when present;
- representative backend/frontend tests;
- build/test/typecheck commands.

It should point to real repository/framework capability owners rather than copying their bodies.

## Plan

Use upstream Matt methods unchanged, with EVO conformance gates around them:

```text
grill-with-docs
→ to-spec
→ evo-spec-review
→ to-tickets
→ evo-plan-review
```

### Spec gate

Suppose `to-spec` produced a technically reasonable direction that mentions a generic `Result<T>` response wrapper and a custom permission helper.

`evo-spec-review` should inspect the real RuoYi-derived repository. If the project already standardizes on `AjaxResult`, `BaseController`, `@PreAuthorize`, `SecurityUtils`, `@Log` and other native capabilities, the canonical Spec should be revised to state that Supplier Management extends those existing owners rather than introducing parallel infrastructure.

The Spec remains about outcome and important implementation constraints; it should not become a file-by-file coding plan.

### Ticket gate

Each ticket is still a vertical, independently verifiable behavior with blocking edges from Matt `to-tickets`. `evo-plan-review` adds/repairs a concise Repository Fit contract.

Example ticket:

```text
Supplier CRUD

Repository Fit
- Module: existing business/system module used by comparable CRUD features
- Reference: representative existing CRUD flow from docs/agents/repository.md
- Reuse: BaseController/startPage/getDataTable, AjaxResult, @PreAuthorize, @Log, existing Service/Mapper/XML conventions
- Strategy: EXTEND
- New abstractions: none
- Verification: existing service/controller/integration test pattern
```

A proposed ticket like “create PaginationService”, “add generic Result<T>”, or “build a new permission middleware” should be revised when the repository already owns those capabilities. A genuinely new capability requires `NEW` plus a repository-based justification and may require a material architecture decision.

## Execute one ticket

```text
evo-implement
```

Before editing, the Skill reopens the real references and capability owners rather than trusting a stale ticket summary. It should state for each important concern:

```text
Permission: EXTEND → <existing repository/framework owner>
Pagination: REUSE → <existing repository/framework owner>
Supplier module structure: EXTEND → <existing CRUD reference>
```

This applies both rules:

- **Reference Before Edit** — follow the nearest representative implementation.
- **Capability Before Creation** — search existing RuoYi/project capabilities before creating reusable infrastructure.

A new permission/data-scope/pagination/response mechanism without a repository-based reason is not acceptable.

Then:

```text
evo-verify
→ evo-review
→ evo-commit
```

`evo-review` should block delivery if the implementation passes tests but quietly introduces a parallel framework mechanism that the accepted Spec/ADR did not authorize.

## Execute continuously

After the Spec and ticket graph have passed both conformance gates and the delivery policy is approved:

```text
evo-goal
```

The Goal consumes the ready tracker frontier and continues through ordinary code/test/review failures. It will not start an unreviewed/stale ticket graph. It stops if the work now requires a new product rule, breaking compatibility, material architecture, destructive migration, security/privacy choice, paid service, or unavailable protected credential.

## Requirement changes halfway through

If Supplier deletion changes from hard-delete to disable-only:

```text
evo-change
```

The change should update the canonical Spec/tickets, preserve unaffected finished CRUD work, invalidate deletion-specific evidence, and create/supersede an ADR only if the choice meets the project's ADR threshold.

If this change also alters the data/status capability or architecture assumptions, rerun `evo-spec-review` and/or the affected `evo-plan-review` work. If it only changes acceptance while the same RuoYi patterns remain valid, preserve the existing Repository Fit and avoid ceremonial re-review. Then recompute the frontier and resume the Goal.
