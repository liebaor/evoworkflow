# Cross-Agent compatibility / 跨 Agent 兼容

v0.4 让同一份 EVO Engineering Protocol 可以被 Codex、Claude Code 和 OpenCode 接力使用。Harness 可以替换，Repository-owned engineering facts 不能替换。

## Authority

- `AGENTS.md` 是仓库级 standing-rule 的唯一 authority。
- `skills/*/SKILL.md` 是唯一 canonical Skill source。
- `.evo/`、Git history 和 Evidence 保存项目状态、决策、约束与交付事实。
- Claude 的 `CLAUDE.md` 只应作为 `@AGENTS.md` thin bridge；Codex/OpenCode 不需要复制 authority 文件。

## 推荐安装

EVO Skills 只维护一份 canonical runtime。当前推荐使用 Codex-first 安装器：

```sh
evo skills install
evo skills install --apply
evo skills doctor
```

安装后在目标 checkout 运行仓库兼容性检查：

```sh
evo agents inspect --root /path/to/project
evo agents setup --root /path/to/project
evo agents doctor --root /path/to/project
```

`setup` 默认 preview。只有缺少 `CLAUDE.md` 时，显式 `--apply` 才会尝试创建精确内容 `@AGENTS.md`；已有文件永远不覆盖，冲突交给人工处理。

Codex 原生读取 `~/.agents/skills`；OpenCode 共享该路径；Claude Code 通过 `~/.claude/skills` 的 symlink/junction 或受控 COPY fallback 使用同一份内容。`evo agents` 与 `evo skills` 是两个边界清晰的命令主题。

## 交接协议

新 Agent 只读取 Repository、`.evo`、canonical Skills 和 Git chronology，使用 `ask-evo` 得到同一个 next Skill。不要依赖旧聊天，也不要在新 Harness 中创建第二套流程状态。

一个 checkout 同时只有一个 executing writer。并行工作使用独立 worktree/branch；review/inspect/doctor 可以只读运行。

具体 Harness 的查找和限制见 [Codex](./codex.md)、[Claude Code](./claude-code.md) 和 [OpenCode](./opencode.md)。
