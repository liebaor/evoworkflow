# Claude Code adapter

Claude Code keeps its native directory:

```text
~/.claude/skills/<skill> -> ~/.agents/skills/<skill>
```

`evo skills install --apply` creates missing links safely. Existing correct links are no-ops. Wrong links, broken links, real directories, and copy drift are reported and never silently redirected or deleted.

The project-level `CLAUDE.md` bridge remains a separate `evo agents setup` responsibility and should contain only `@AGENTS.md` when EVO creates it.
