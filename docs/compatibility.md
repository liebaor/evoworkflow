# Compatibility

EVOworkflow keeps Skill behavior harness-agnostic. `SKILL.md` describes repository actions semantically; harness-specific discovery/invocation policy stays in metadata.

## Standing repository instructions

The stable consumer integration surface is the repository's existing standing agent instruction file, normally `AGENTS.md` or an equivalent already used by the harness. `evo-init` adds a concise Repository Engineering Context section without replacing surrounding user instructions.

The section points to `.evo/` knowledge and defines when planning/coding/debugging/review workflows should consult it.

## Skill metadata

EVO Skills use:

- `disable-model-invocation: true` for explicit Claude Code invocation posture;
- `metadata.opencode/autoinvoke: "false"` for OpenCode;
- `agents/openai.yaml` with `policy.allow_implicit_invocation: false` for Codex.

No Skill body should depend on a slash-command spelling or proprietary tool-call syntax.

## Consumer principle

Engineering workflows do not need a direct dependency on EVO Skill IDs. They consume the Repository Engineering Contract through standing instructions and `.evo/` paths.
