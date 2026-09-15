# EVOworkflow Architecture

## Position

EVOworkflow is a Skill-driven engineering method with a fixed repository knowledge convention.

It deliberately separates four kinds of authority:

- **Human authority** — product direction, material trade-offs and authorization.
- **Semantic authority** — Agent reasoning over repository evidence.
- **Deterministic authority** — project-native tests/build/lint/runtime/CI.
- **Historical authority** — Git chronology and delivery history.

## Fixed knowledge workspace

Every EVO-enabled repository uses `.evo/`:

```text
.evo/
├── project.md
├── context.md
├── goal.md
├── decisions/
├── specs/
├── plans/
└── research/
```

This is an engineering knowledge workspace, not a runtime database. Files are human-readable Markdown. No hidden workflow state, phase lock, fingerprint or generic gate is required.

### Ownership

- `project.md`: project map and operational navigation.
- `context.md`: domain language and durable business facts.
- `decisions/`: stable rationale and revisitable engineering decisions.
- `specs/`: unfinished intended behavior/design.
- `plans/`: executable slice decomposition.
- `research/`: dated external evidence and implications.
- `goal.md`: current or most recent long-running goal record.

Formal product/project docs stay where the project normally exposes them; `.evo/` does not replace API manuals, deployment guides or user docs.

## Convention over discovery

Knowledge location is intentionally deterministic. Brownfield adoption migrates EVO-owned engineering knowledge into `.evo/` and updates references rather than teaching every future Agent a repository-specific mapping.

Content remains semantic: the Agent must still read source, tests, docs, Git and runtime evidence to decide what is true.

## Orchestration boundary

`evo-goal` is a Skill-level loop for one repository, one active goal and one writer. It does not schedule fleets of agents or implement a runtime. Harness-level orchestration remains a harness responsibility.

## Verification boundary

EVO defines evidence discipline; host-project tools generate evidence. A green build proves buildability. A unit test proves the behavior at its seam. A browser/runtime check proves only the path exercised. Unavailable boundaries remain UNVERIFIED.

## Delivery boundary

`evo-finish` converges current truth. `evo-commit` records delivery history. Commit and push never substitute for verification or review.