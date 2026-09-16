# EVO Skill Contract

EVO 2.0 Skills are integration contracts around an unmodified Matt upstream. Matt's formal Skills are vendored in the same distribution repository for reproducibility, but remain upstream-owned and tree-SHA protected.

## Portable Skill shape

Every EVO Skill must:

1. use a lowercase kebab-case directory/`name`;
2. include a clear trigger-oriented `description`;
3. include `compatibility` without claiming one harness-specific API;
4. keep portable behavior in `SKILL.md`;
5. place Codex policy in `agents/openai.yaml`;
6. expose OpenCode invocation policy through `metadata.opencode/autoinvoke`;
7. preserve Claude Code user-invocation policy through `disable-model-invocation`;
8. refer to upstream capabilities by Skill ID rather than `/command` or tool-call syntax.

These EVO metadata rules do **not** apply retroactively to vendored Matt Skills. Matt directories preserve their pinned upstream contents exactly.

## Upstream capability dependency

When an EVO Skill needs a Matt capability:

- use the harness's native installed-Skill mechanism when available;
- expect the combined EVOworkflow distribution to contain the pinned Matt source, but do not assume every Skill was selected/loaded by the active harness;
- do not modify, shadow, or paste a private EVO version of the upstream Skill;
- if the capability is required but unavailable in the current session, report `MATT_SKILL_REQUIRED: <skill-id>` and the missing purpose;
- if the capability is optional, continue only with the narrower EVO behavior and state what was not applied.

## Upstream integrity contract

Vendored Matt directories are not ordinary editable project files. CI compares their Git tree SHAs to the pinned upstream snapshot. Any content, helper-file, metadata, or file-mode drift is a validation failure.

An intentional Matt upgrade must replace the upstream snapshot, update the pinned tree SHAs and commit reference, then run compatibility evals. Compatibility adaptations belong in EVO-owned files.

## Repository-conformance contract

Before non-mechanical implementation, `evo-implement` must:

- read the repository guide and relevant authorities;
- inspect the real affected consumer path;
- identify the nearest representative implementation;
- classify the approach `REUSE`, `EXTEND`, or `NEW`;
- treat unexplained `NEW` architecture as an escalation, not a default.

## Evidence contract

Acceptance claims have one of three statuses:

- `PASS`: direct evidence was actually executed/observed and supports the claim;
- `FAIL`: direct evidence contradicts the claim;
- `UNVERIFIED`: required direct evidence was unavailable or not run.

Static source inspection is not runtime proof. Green build/lint is evidence only for the rules it actually checks.

## Git contract

Commit is downstream of implementation/evidence/review. It may record a deliberate WIP checkpoint if explicitly requested, but its message must not upgrade unverified work into completed work.

Default is **no push**. A Goal may persist explicit `final-only` or `per-ticket` push authorization. Force-push/history rewrite/protected/default-branch delivery/merge/tag/release/deploy require separate authorization.
