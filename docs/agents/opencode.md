# OpenCode

OpenCode 读取仓库 `AGENTS.md` 和可见的 canonical Skills；不需要 `OPENCODE.md` 或 vendor-specific authority copy。

在交接前运行：

```sh
evo agents inspect --root /path/to/project
evo agents doctor --root /path/to/project
```

OpenCode 可能发现仓库 `skills/`、`.opencode/skills/`、项目 `.agents/skills/`、`~/.config/opencode/skills/` 或通用 `~/.agents/skills/`。多个 source 中同名 Skill 的优先级和版本不能由 Agent 猜测；doctor 会把 duplicate 或 hash drift 显式报告。

OpenCode 只执行当前 approved Slice。一个 checkout 仍只有一个 executing writer；要并行请使用独立 worktree/branch。没有安装 OpenCode 时，inspect/doctor 只报告 INFO，不改变其他 Harness 或 EVO 协议的有效性。
