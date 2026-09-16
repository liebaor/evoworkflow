---
name: ask-evo
description: Inspect repository/EVO state and route to exactly one useful EVO action, or explicitly say that normal engineering work should continue without EVO intervention.
compatibility: "Codex, Claude Code, OpenCode; Git repository"
disable-model-invocation: true
metadata:
  opencode/autoinvoke: "false"
---

# Ask EVO

## Purpose

Provide a read-only routing decision. Do not perform the routed work.

## Read first

Read standing repository instructions, `.evo/` existence/state when present, current Git status/HEAD, active change/current context and the user's intent. Read only enough evidence to distinguish the routing cases below.

## Routing

Choose exactly one:

- Repository Engineering Contract missing or materially incomplete → `evo-init`.
- Relevant EVO knowledge may be stale because its evidence surface changed → `evo-refresh`.
- Previously accepted intent changed materially → `evo-change`.
- A stable project-specific engineering lesson has emerged and should be considered for durable promotion → `evo-learn`.
- A fresh/interrupted session needs repository-based continuity → `evo-recover`.
- None of the above → `NORMAL_ENGINEERING_WORKFLOW`.

Normal engineering work includes specification, planning, ticketing, implementation, testing, debugging and review when no EVO-specific evolution/memory action is needed.

## Decision rules

- Do not route to EVO merely because coding work exists.
- Do not route to `evo-refresh` solely because HEAD changed; require plausible impact on stored knowledge evidence.
- Do not route to `evo-change` for a pure implementation refactor with unchanged accepted behavior.
- Do not route to `evo-learn` for generic programming knowledge or one-off task notes.
- Prefer `evo-recover` when the main problem is “what is the current state?” rather than stale durable knowledge.

## Writes

None.

## Output

Return exactly one primary decision:

```text
Next: <evo-skill-id | NORMAL_ENGINEERING_WORKFLOW>
```

Then give 1–3 sentences grounded in repository/current-state evidence explaining why.
