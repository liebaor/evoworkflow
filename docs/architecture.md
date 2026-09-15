# EVOworkflow 1.0 Architecture

## Position

EVOworkflow is a repository-centered engineering method packaged as composable Agent Skills.

Its job is to help Coding Agents participate in long-lived software projects without making chat history the source of truth.

## Responsibility split

- **Human** — owns product direction, material trade-offs, risk acceptance, and final authority.
- **Agent + EVO Skills** — performs semantic understanding, repository archaeology, clarification, research, planning, implementation reasoning, change analysis, verification strategy, and review.
- **Repository** — owns durable knowledge and current project truth.
- **Project-native tools** — prove mechanically decidable facts through tests, build, lint, typecheck, migrations, runtime checks, and CI.
- **Git / issue / PR history** — owns chronology and delivery collaboration.
- **Harness** — provides execution environment, sandboxing, tools, subagents, and orchestration.

Core rule:

> **Semantic judgment → Model · Deterministic fact → Tool · Material authority → Human**

## Authority model

EVO adapts to the host repository's existing forms. Typical responsibilities are:

- repository instructions — working rules and navigation;
- domain/context docs — shared language and durable business facts;
- current architecture/API/package docs — what the system is now;
- working Spec/RFC/issue/proposal — what an unfinished change intends to become;
- ADR/decision record — why a stable choice was made;
- source/config/schema — executable current behavior and contracts;
- tests/runtime/CI — observable promises and mechanically decidable invariants;
- Git/PR/issues — chronology and collaboration history.

A mutable fact should have one canonical owner. Other surfaces may link or summarize, but should not evolve into competing detailed copies.

## Skill architecture

EVO uses focused Skills instead of one monolithic workflow prompt:

- `ask-evo` routes;
- `evo-init` and `evo-recover` establish working context;
- `evo-grill-with-docs` and `evo-research` resolve uncertainty;
- `evo-spec` and `evo-plan` make intended work portable;
- `evo-implement`, `evo-change`, and `evo-bug` execute/change/repair;
- `evo-verify`, `evo-review`, and `evo-finish` prove, challenge, and converge the result.

Each Skill has a narrow contract and explicit handoff boundaries so a stronger model retains freedom to reason inside the phase without having to infer the phase itself.

## Adaptive process

Process depth follows change risk rather than diff size.

- Mechanical/local edits may need only inspect → edit → focused check.
- Ordinary behavior changes may use clarify → plan → implement → verify → review → finish.
- Cross-session, high-risk, compatibility, security, privacy, data, or architecture changes should add explicit Spec/Decision work, stronger evidence, and human authority points.

## Progressive disclosure

Root guidance stays short and navigational. Skills read only the repository authorities relevant to the current task. Large rubrics/templates should live close to the Skill that consumes them and load only when needed.

## Design goal

A fresh capable Agent should be able to enter a repository, discover how that repository already works, recover the current task from durable evidence, make bounded progress, and leave the repository easier for the next Agent to understand.
