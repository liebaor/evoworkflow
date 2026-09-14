# Codex

Codex 直接读取仓库根部的 `AGENTS.md` 和 canonical `skills/*/SKILL.md`。不要新增 `CODEX.md` 或复制 EVO standing rules。

推荐在新 checkout 先运行：

```sh
evo recover --root /path/to/project
evo agents inspect --root /path/to/project
evo agents doctor --root /path/to/project
```

然后使用 `ask-evo`，只执行当前已批准并持久化的 Slice。变更、批准、phase transition、Evidence、commit 和 merge 仍受 Repository/EVO 协议约束。

Codex 的 Skill source 可能来自仓库 `skills/`、项目 `.codex/skills/`、用户 `~/.codex/skills/` 或通用 `.agents/skills/`。重复 source 和 hash drift 不要靠优先级猜测；交给 `evo agents doctor` 报告并清理。
