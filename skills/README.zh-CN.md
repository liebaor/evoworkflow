# EVOworkflow 2.0 Skills

v2.0 采用 **Matt 原版 Skills + EVO 扩展 Skills** 的组合模式。Matt 当前正式 Engineering + Productivity Skills 已作为 **vendored read-only upstream** 合并进本仓库，方便单一来源安装；这些文件仍然属于上游代码，EVO 不修改其内容。

## 安装

只需要使用 EVOworkflow 作为 Skill 来源：

```sh
npx skills@latest add liebaor/evoworkflow
```

不要再向同一目标重复安装 `mattpocock/skills`，否则会产生同名 Matt Skill。

## Matt upstream（原样 vendored）

当前固定到 Matt upstream commit：

`959a8e9f1edc3adbe2f7e3054bb6fbefa6696260`

共 25 个正式 Skills，涵盖：

- Engineering：`ask-matt`、`setup-matt-pocock-skills`、`grill-with-docs`、`domain-modeling`、`research`、`to-spec`、`to-tickets`、`wayfinder`、`tdd`、`diagnosing-bugs`、`codebase-design`、`code-review`、`implement`、`triage`、`prototype`、`wizard` 等。
- Productivity：`grill-me`、`grilling`、`handoff`、`teach`、`to-questionnaire`、`wait-what`、`writing-for-agents`。

每个 Matt Skill 目录由 CI 使用 Git tree SHA 校验。普通 EVO 开发不得修改这些目录；升级 Matt 时整块替换到新的 upstream snapshot，再运行兼容性验证。

## EVO-owned

| Skill | 作用 |
|---|---|
| `ask-evo` | 根据当前 Repository / Tracker 状态选择唯一下一步。 |
| `evo-init` | 深入理解现有项目规范、结构、命令和参考实现。 |
| `evo-advisor` | 基于真实 Repository 提供资深工程/架构建议。 |
| `evo-implement` | 按现有结构实现一个 bounded ticket，提交前停止。 |
| `evo-change` | 需求变化时统一更新真正的权威来源并保留未受影响工作。 |
| `evo-verify` | Acceptance → PASS / FAIL / UNVERIFIED Evidence。 |
| `evo-review` | 在 Commit 前检查 Repository Conformance、Intent 与 Evidence。 |
| `evo-goal` | 在 Execution Envelope 内持续消费 ready ticket frontier。 |
| `evo-finish` | 完成后做知识/文档/Tracker 的 Current Truth 收敛。 |
| `evo-commit` | 结构化 Commit + 受控 Push。 |
| `evo-recover` | 新 Session 从 Repository / Tracker / Git / CI 恢复。 |

所有 **EVO-owned** Skill 都按 Codex / OpenCode / Claude Code 的兼容 metadata 设计，同时避免在正文中绑定某一种 Harness 的 Skill 调用语法。Matt vendored Skill 则保持上游原始 metadata，不为了 EVO 兼容性而直接打补丁。
