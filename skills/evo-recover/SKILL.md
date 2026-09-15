---
name: evo-recover
description: Reconstruct active EVO work for a fresh or interrupted Agent/session from the canonical .evo workspace plus Git and current repository evidence. Use when work already exists but conversational context is lost. Do not use for first-time adoption.
---

# EVO Recover

## Read order
1. `AGENTS.md` and `.evo/project.md`.
2. `.evo/context.md`.
3. `.evo/goal.md` if present; follow its Spec/Plan links.
4. relevant `.evo/decisions/` and research.
5. Git branch/status/recent commits/diff.
6. source/tests around the current slice and available CI results.

## Reconstruct
Determine objective/non-goals, current/last Goal status, completed vs pending slices, last verified evidence, relevant decisions/patterns, changed files, likely next seam and material blockers.

Repository evidence outranks stale chat summaries. Do not treat a checked progress box as proof without corresponding Git/evidence.

## Output
Produce a compact handoff:
- objective;
- active canonical artifacts;
- what is actually completed/verified;
- what is pending;
- blockers/unknowns;
- exactly one next EVO Skill.

Do not begin implementation unless explicitly asked.