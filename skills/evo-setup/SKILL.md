---
name: evo-setup
description: Adopt EVO in a repository by establishing the canonical .evo workspace and migrating existing engineering knowledge into it. Use once when a project first adopts EVO or when its EVO workspace is structurally incomplete.
---

# EVO Setup

## Purpose
Make EVO knowledge location deterministic before any long-running workflow depends on it.

## Use when
- `.evo/` is missing or incomplete;
- a Brownfield project is adopting EVO;
- prior engineering knowledge exists in scattered ADR/RFC/Spec/Plan/Context locations.

## Do not use when
- the workspace is already healthy and only project understanding is missing → `evo-init`;
- a new session merely lost context → `evo-recover`.

## Canonical layout
Create/ensure:

```text
.evo/project.md
.evo/context.md
.evo/goal.md        # create only when a Goal is started
.evo/decisions/
.evo/specs/
.evo/plans/
.evo/research/
```

## Workflow
1. Explore existing `AGENTS.md`/instructions, domain context/glossaries, ADR/decision records, working Spec/RFC/design docs, implementation plans, research notes and references between them.
2. Classify artifacts by responsibility, not filename.
3. Migrate all EVO-owned engineering knowledge:
   - durable rationale/ADR → `.evo/decisions/`;
   - unfinished Spec/RFC/proposal → `.evo/specs/`;
   - executable implementation plan → `.evo/plans/`;
   - external research → `.evo/research/`;
   - durable domain language/facts → merge into `.evo/context.md`.
4. Use Git-aware moves when possible; preserve authorship/history and update Markdown/source links.
5. Leave current API docs, deployment docs, user/operator guides and other product documentation in the project's normal docs tree.
6. Create a minimal `.evo/project.md` placeholder pointing to the next step: `evo-init`.
7. Add a short `AGENTS.md` section that tells Agents to read `.evo/project.md` and follow the fixed workspace.
8. Search for stale references to migrated paths and repair them.

## Ambiguity
Do not retain a permanent path mapping. If an artifact mixes current documentation with decision rationale, keep the current documentation in place and extract/move the durable rationale to `.evo/decisions/`. Ask the human only when classification would materially change project documentation ownership.

## Output
Report created directories, migrated artifacts, links updated, artifacts intentionally left outside `.evo/`, and any unresolved classification.

## Final checks
Exactly one canonical owner exists for migrated engineering knowledge; no old ADR/Spec/Plan/Context location remains an active competing owner.