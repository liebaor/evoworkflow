---
name: ask-evo
description: Route the current software-engineering situation to exactly one best next Matt or EVO Skill without doing the work itself.
compatibility: "Codex, Claude Code, OpenCode; Matt engineering Skills recommended"
disable-model-invocation: true
metadata:
  opencode/autoinvoke: "false"
---

# Ask EVO

## Purpose

Act as a read-only router over unmodified Matt engineering Skills plus EVO extensions. Recommend exactly one next Skill/capability.

## Read first

Read the repository's standing instructions, `docs/agents/issue-tracker.md`, `docs/agents/domain.md`, `docs/agents/repository.md` when present, relevant tracker state including Repository Fit sections, Git status, and the user's current intent. Do not create missing project artifacts merely to route.

## Routing

- Matt setup/config missing → `setup-matt-pocock-skills`.
- Repository engineering structure/patterns/capabilities are not understood or guide is materially stale → `evo-init`.
- User wants repository-grounded senior engineering/architecture guidance → `evo-advisor`.
- Product/domain meaning is unclear → `grill-with-docs` or, when specifically domain language/modeling, `domain-modeling`.
- Current external facts are needed → `research`.
- Settled intent needs a Spec → `to-spec`.
- A canonical Spec exists but has not passed Repository Fit review after the latest material change → `evo-spec-review`.
- A reviewed Spec needs agent-sized vertical work with blockers → `to-tickets`.
- A ticket graph exists but has not passed Repository Fit review after the latest material Spec/architecture/capability change → `evo-plan-review`.
- Work is too large/uncertain for one session and decisions must be mapped first → `wayfinder`.
- One bounded reviewed ticket should be implemented under EVO delivery semantics → `evo-implement`.
- Accepted intent changed → `evo-change`.
- A difficult observed bug/performance regression needs diagnosis → `diagnosing-bugs`.
- Acceptance claims need direct proof → `evo-verify`.
- Worktree/branch changes need pre-delivery conformance review → `evo-review`.
- A conformance-reviewed ticket graph should be completed continuously → `evo-goal`.
- Final verified/reviewed work needs current-truth convergence → `evo-finish`.
- A coherent checkpoint needs commit or an explicitly authorized push → `evo-commit`.
- A fresh/interrupted session must reconstruct current work → `evo-recover`.

If the best route is a Matt Skill that is not installed, report `MATT_SKILL_REQUIRED: <id>` rather than substituting an EVO imitation.

## Output

Return: `Next: <skill-id>` plus 1–3 sentences grounded in current repository/tracker evidence. Do not execute the next Skill.
