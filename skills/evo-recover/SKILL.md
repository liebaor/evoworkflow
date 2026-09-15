---
name: evo-recover
description: Reconstruct enough repository context for a fresh or interrupted Agent/session to continue safely without relying on private chat history or an EVO state file.
---

# EVO Recover

## Objective

Recover current working context from durable repository evidence.

## Reconstruct

Read applicable instructions, domain/context docs, current architecture/public docs, active working proposal/spec/plan or issue, relevant stable decisions, Git branch/status/recent commits/diff, tests or CI results available in the repository, and the source areas currently changing.

Determine:

- current objective and non-goals;
- which document/issue owns the active work;
- completed vs pending slices inferred from repository/Git evidence;
- relevant decisions and patterns;
- changed files and likely next seam;
- verified results vs claims not yet checked;
- blockers that materially affect the next step.

Do not require `.evo/state.yml` or reproduce stale chat summaries as authority. Derived workflow state should be disposable and recoverable from the repository.

## Output

Produce a compact handoff and recommend one next EVO Skill. Do not begin implementation unless explicitly asked.