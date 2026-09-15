# Claude Code

Claude Code 通过 `~/.claude/skills` 共享 canonical `~/.agents/skills`。Repository authority 仍然是 `AGENTS.md`；如果 Claude Code 需要根部 `CLAUDE.md`，它只能是这个精确 thin bridge：

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

EVO Skill 的唯一 canonical runtime 是 `~/.agents/skills`；Claude 通过 `~/.claude/skills` 中的 symlink/junction 共享它。不要从仓库 `skills/` 建立第二份物理副本，也不要同时安装等价 copies。缺少 Claude 客户端不会使 EVO Repository protocol 本身失效。
