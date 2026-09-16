# Upstream policy

EVOworkflow 2.0 carries Matt Pocock's current formal Skills as a **vendored read-only upstream**. They are copied into this repository for one-source installation, but remain externally owned upstream code rather than EVO-owned implementations.

## Source

- Repository: `mattpocock/skills`
- Pinned upstream commit for this v2 bootstrap: `959a8e9f1edc3adbe2f7e3054bb6fbefa6696260`
- Imported scope: the formal Engineering + Productivity Skill sets referenced by Matt's README at that commit
- Vendored Skill count: 25
- Upstream ownership: Matt Pocock / contributors
- Upstream license: MIT; retained at `THIRD_PARTY_LICENSES/mattpocock-skills-LICENSE`

## Non-fork rule

1. Vendored Matt Skill files are read-only inside EVOworkflow: do not edit, rename, or shadow them.
2. EVO behavior differences live only in distinct `evo-*` Skills or EVO-owned documentation/evals.
3. CI pins every vendored Matt Skill directory by Git tree SHA. A byte-level or file-mode change fails validation.
4. EVO documentation may name a Matt Skill as a logical dependency, but EVO-owned Skill bodies must not assume a harness-specific invocation syntax.
5. Upstream upgrades replace the vendored snapshot from a newer Matt commit; compatibility fixes are made in EVO-owned integration Skills, never by patching Matt in place.

## Vendored capabilities

The current snapshot includes Matt's formal Engineering Skills:

- `ask-matt`
- `code-review`
- `codebase-design`
- `diagnosing-bugs`
- `domain-modeling`
- `grill-with-docs`
- `implement`
- `improve-codebase-architecture`
- `prototype`
- `research`
- `resolving-merge-conflicts`
- `setup-matt-pocock-skills`
- `tdd`
- `to-spec`
- `to-tickets`
- `triage`
- `wayfinder`
- `wizard`

and formal Productivity Skills:

- `grill-me`
- `grilling`
- `handoff`
- `teach`
- `to-questionnaire`
- `wait-what`
- `writing-for-agents`

## Why vendor instead of patch

Vendoring gives EVO users one install source and makes the exact tested Matt baseline reproducible. The tree-SHA gate preserves the important boundary: carrying upstream code does not make it EVO-owned code.

Conceptually:

```text
Matt repository
    ↓ pinned snapshot
vendored Matt Skills ── read-only, tree-hash protected
    +
EVO-owned evo-* Skills ── may evolve independently
```

## Upgrade procedure

When Matt changes:

1. Inspect Matt's current formal Skill sets and choose a candidate upstream commit.
2. Replace the vendored Matt snapshot from that commit without manual edits.
3. Update the expected Git tree SHAs in CI and the pinned commit in this document.
4. Run EVO compatibility evals against routing, setup, Spec/tickets, TDD/bug, design, review, Goal orchestration, and cross-harness behavior.
5. If an upstream contract changed, adapt EVO-owned Skills/docs/evals only.
6. Accept the new baseline only when the vendored trees match upstream exactly and compatibility passes.

Never freeze or patch Matt merely to preserve an accidental EVO dependency on undocumented behavior.
