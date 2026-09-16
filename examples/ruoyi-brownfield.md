# RuoYi Brownfield example — EVOworkflow 2.0

Scenario: add Supplier Management to an existing RuoYi-derived system without creating a parallel architecture.

## Adopt

```text
setup-matt-pocock-skills
→ evo-init
```

`evo-init` should inspect the actual checkout and produce `docs/agents/repository.md` with references for concerns such as:

- controller/service/mapper flow;
- permission annotations and menu/button permission naming;
- DataScope or equivalent data-permission behavior;
- pagination/response conventions;
- transaction/error conventions;
- Vue API/table/form layout;
- representative backend/frontend tests;
- build/test/typecheck commands.

It should point to real files rather than copying their bodies.

## Plan

Use upstream Matt methods:

```text
grill-with-docs
→ to-spec
→ to-tickets
```

Each ticket is a vertical, independently verifiable behavior with blocking edges.

## Execute one ticket

```text
evo-implement
```

Before editing, the Skill should state for each important concern:

```text
Permission: EXTEND → <existing reference>
Pagination: REUSE → <existing reference>
Supplier module structure: EXTEND → <existing CRUD reference>
```

A new permission/data-scope mechanism without a repository-based reason is not acceptable.

Then:

```text
evo-verify
→ evo-review
→ evo-commit
```

## Execute continuously

After the Spec/tickets and delivery policy are approved:

```text
evo-goal
```

The Goal consumes the ready tracker frontier and continues through ordinary code/test/review failures. It stops if the work now requires a new product rule, breaking compatibility, material architecture, destructive migration, security/privacy choice, paid service, or unavailable protected credential.

## Requirement changes halfway through

If Supplier deletion changes from hard-delete to disable-only:

```text
evo-change
```

The change should update the canonical Spec/tickets, preserve unaffected finished CRUD work, invalidate deletion-specific evidence, and create/supersede an ADR only if the choice meets the project's ADR threshold. Then recompute the frontier and resume the Goal.
