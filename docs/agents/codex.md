# Codex

Codex 直接读取仓库根部的 `AGENTS.md`，并从用户级 `~/.agents/skills` 原生发现 EVO Skills。`skills/*` 只是 EVO package 的 authoring source；不要新增 `CODEX.md` 或复制 EVO standing rules。

推荐在新 checkout 先运行：

```sh
evo recover --root /path/to/project
evo agents inspect --root /path/to/project
evo agents doctor --root /path/to/project
```

然后使用 `ask-evo`，只执行当前已批准并持久化的 Slice。变更、批准、phase transition、Evidence、commit 和 merge 仍受 Repository/EVO 协议约束。

EVO 不创建 `.codex/skills` 或 project-local duplicate。重复 source 和 hash drift 不要靠优先级猜测；交给 `evo skills doctor` 报告，并由人工审查历史副本。
