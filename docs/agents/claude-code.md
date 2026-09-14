# Claude Code

Claude Code 使用同一份 canonical `skills/*/SKILL.md`。Repository authority 仍然是 `AGENTS.md`；如果 Claude Code 需要根部 `CLAUDE.md`，它只能是这个精确 thin bridge：

```text
@AGENTS.md
```

先预览，再显式应用：

```sh
evo agents setup --root /path/to/project
evo agents setup --root /path/to/project --apply
evo agents doctor --root /path/to/project
```

setup 不会覆盖已有 `CLAUDE.md`。已有内容不是精确 bridge 时会返回 `NEEDS_HUMAN_MERGE`；不要把 `AGENTS.md` 内容复制进 `CLAUDE.md`。

Claude Skill source 可能来自仓库 `.claude/skills/`、`skills/`、用户 `~/.claude/skills/` 或通用 `.agents/skills/`。只选择一种 universal distribution，不要同时安装等价副本。缺少 Claude 客户端不会使 EVO Repository protocol 本身失效。
