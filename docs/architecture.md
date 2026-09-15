# EVOworkflow v1 Architecture

## Architectural position

EVOworkflow is a **Skill-first, repository-native engineering method**, not a workflow engine.

There is no required `evo` executable, no EVO state machine, no scanner-owned project model, no Goal Runner, no central Gate/Evidence runtime, and no package-specific bootstrap dependency.

## Responsibility split

- **Human** — product, risk, trade-off, acceptance and authorization authority.
- **Agent + Skills** — semantic understanding, repository archaeology, planning, implementation reasoning, change analysis, review and research.
- **Repository** — durable knowledge and current truth.
- **Project-native tools** — deterministic facts such as tests, build, lint, typecheck, migration checks and CI.
- **Git** — chronology, diffs, branches and delivery history.
- **Harness** — execution environment, sandboxing, tools, subagents and long-running orchestration.

## Core rule

> Semantic judgment belongs to the model. Deterministic facts belong to tools. Business authority belongs to humans.

EVO does not reimplement Maven, npm, Git, CI, browser automation or the host Agent harness.

## Repository authority model

Use the host repository's existing forms first. Common responsibilities are:

- `AGENTS.md` / repository instructions — durable working rules and navigation.
- `CONTEXT.md` / glossary/domain docs — shared language and durable domain facts.
- architecture/current docs — what the system is now.
- working proposal/spec/issue — what an unfinished change intends to become.
- ADR/decision records — why stable choices were made.
- source/config/schema — executable current behavior and contracts.
- tests/runtime evidence — observable promises.
- CI/project scripts — mechanically decidable invariants.
- Git/PR/issues — chronology and delivery collaboration.

One mutable fact should have one canonical owner. Other surfaces link or summarize rather than copy volatile detail.

## Minimal process

EVO applies the minimum process required by change risk. A local mechanical edit may need only inspect → edit → focused check. A substantial feature may need clarify/research → spec → plan → implement → verify → review. Security, data-loss, compatibility or architecture changes may require explicit human decisions and stronger project-native evidence.

## Non-goals

EVO v1 does not provide:

- a central CLI or executable runtime;
- a second project state database;
- workflow phase locks or fingerprints;
- repository-wide heuristic scanners with hard blocking authority;
- autonomous multi-agent scheduling;
- package-manager/dependency resolution reimplementations;
- generic test/evidence storage engines.

If deterministic automation is needed, prefer the host project's tests/CI. Add EVO-owned scripts only for maintaining the EVO skill repository itself, never as a mandatory runtime for user projects.