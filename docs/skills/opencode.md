# OpenCode shared Skills

OpenCode can reuse the same canonical source through `~/.agents/skills`. EVO does not create an EVO-specific `.opencode/skills` copy. The project remains centered on the same `AGENTS.md`, `.evo/`, and Git state used by Codex and Claude Code.

`evo skills doctor` checks the declared shared-source contract and reports whether the OpenCode executable is available. It does not claim a real OpenCode load when the executable is absent.
