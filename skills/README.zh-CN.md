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
| `ask-evo` | 根据当前 Repository / Tracker / Conformance Gate 状态选择唯一下一步。 |
| `evo-init` | 深入理解现有项目规范、结构、命令、参考实现和可复用 Framework/Utility/Component 能力。 |
| `evo-advisor` | 基于真实 Repository 提供资深工程/架构建议。 |
| `evo-spec-review` | 在 `to-spec` 后检查 Spec 是否符合现有架构、框架能力和兼容性约束；不改 Matt 原版。 |
| `evo-plan-review` | 在 `to-tickets` 后逐 Ticket 检查模块归属、参考实现、能力复用、`REUSE/EXTEND/NEW` 和验证方式，是 Goal 前的 Conformance Gate。 |
| `evo-implement` | 按现有结构和已有能力实现一个 reviewed bounded ticket，执行 Reference Before Edit + Capability Before Creation，提交前停止。 |
| `evo-change` | 需求变化时统一更新真正的权威来源，保留未受影响工作，并只使受影响的 Conformance/Evidence 失效。 |
| `evo-verify` | Acceptance → PASS / FAIL / UNVERIFIED Evidence。 |
| `evo-review` | 在 Commit 前检查 Repository Conformance、重复/平行能力、Intent 与 Evidence。 |
| `evo-goal` | 只对已通过 Spec/Plan Conformance Gate 的 ready ticket frontier 进行持续执行。 |
| `evo-finish` | 完成后做知识/文档/Tracker 的 Current Truth 收敛。 |
| `evo-commit` | 结构化 Commit + 受控 Push。 |
| `evo-recover` | 新 Session 从 Repository / Tracker / Git / CI 恢复。 |
| `evo-test` | **手工触发**的较完整测试：复用项目现有测试方式，并在条件允许时模拟关键用户操作；不进入默认 Goal 流程。 |

## 规划与开发约束

Matt 的 `to-spec` 和 `to-tickets` 保持原样：

```text
to-spec
→ evo-spec-review
→ to-tickets
→ evo-plan-review
→ evo-goal / evo-implement
```

EVO 的核心约束是：

- **Reference Before Edit**：写代码前先找现有代表实现。
- **Capability Before Creation**：新增公共类、工具、组件、中间件、权限/分页/响应等机制前，先确认 Repository / Framework 是否已有能力。
- **Planning Conforms Before Execution**：Spec 和 Tickets 在进入持续执行前必须与现有项目结构、框架能力和规范一致。

对于 RuoYi 等 Brownfield 项目，优先级是“当前 Repository 的真实用法 > Framework 通用教程 > AI 自己偏好的新抽象”。

## 手工完整测试

需要更高信心时手工调用：

```text
evo-test
```

它不会被 `evo-goal` 自动调用，也不会为了测试强制给项目引入新的测试框架。它会按本次改动选择必要的 project-native build/unit/integration/API 测试；对用户可见功能，在已有浏览器/E2E或可交互应用能力存在时执行关键 User Journey。无法实际触达的边界必须标记 `UNVERIFIED`。

所有 **EVO-owned** Skill 都按 Codex / OpenCode / Claude Code 的兼容 metadata 设计，同时避免在正文中绑定某一种 Harness 的 Skill 调用语法。Matt vendored Skill 则保持上游原始 metadata，不为了 EVO 兼容性而直接打补丁。
