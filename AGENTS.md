# EVOworkflow repository instructions

EVOworkflow is a repository-centered AI software engineering workflow built from Skills plus a fixed project knowledge convention.

## Core model

- Human: product direction, material trade-offs, authorization, final acceptance.
- Agent + EVO Skills: semantic understanding, engineering reasoning, implementation, diagnosis, review and orchestration.
- `.evo/`: canonical AI engineering knowledge workspace.
- Project-native tests/build/lint/runtime/CI: deterministic evidence.
- Git: chronology and delivery history.
- Harness: execution environment, sandbox, tools, subagents and long-running execution.

## Fixed project convention

Every EVO-enabled project uses:

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

Do not introduce alternate locations or per-project mappings for EVO-owned knowledge. Brownfield adoption migrates existing ADRs/decisions, working specs/RFCs, implementation plans, research notes and domain context into this convention and updates references.

Project/product documentation such as API docs, deployment guides and user documentation stays in the project's normal documentation tree. `.evo/` owns AI engineering memory and work artifacts, not all documentation.

## Engineering principles

- Repository > Chat.
- Evidence > Claim.
- Existing Pattern > Reinvent.
- One Fact → One Owner.
- Change > Rewrite.
- Minimum Necessary Process.
- Human Authority > Agent Autonomy.
- Convention Over Discovery for EVO knowledge locations.
- Unknown is blocking only when different answers materially change the current task or risk.

## Skill maintenance

Every user-facing Skill must state: Use when, Do not use when, Read first, Workflow, Stop/escalate, Output and Final checks.

The canonical set is documented in README and `docs/skill-contract.md`. Any Skill add/remove/rename/boundary change must update `ask-evo`, README, workflow docs, evals and CI in the same change.

`evo-goal` is orchestration, not a runtime: one repository, one active goal, one writer. It may repeatedly apply implementation/TDD/verification/bug/review/commit contracts, but material decisions still stop for a human.

`evo-commit` describes verified state; it does not create evidence. Push requires explicit user authorization or an explicit push policy in `.evo/goal.md`. Never force-push by default.

Before completing an EVOworkflow repository change, confirm the Skill set, Router, metadata, docs and validation workflow agree.