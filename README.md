# EVOworkflow 1.0

> **让 AI 像一个长期参与项目的工程团队成员，而不是只会在一次聊天里写代码。**

EVOworkflow 是一套 **Repository-centered、Skill-driven** 的 AI 软件工程工作流。它给项目一个固定的 `.evo/` 工程知识空间，再用一组专职 Skills 完成项目理解、需求澄清、技术指导、方案研究、规格、计划、TDD、实现、Bug、验证、Review、连续执行和 Git 交付。

```text
.evo/       负责长期工程记忆
Skills      负责工程方法
Project Tools / Tests / CI 负责证明
Git         负责历史
Human       负责决策
Harness     负责执行
```

当前版本：**1.0.0**

## 固定的 EVO 工作区

所有采用 EVO 的项目统一使用：

```text
PROJECT/
├── AGENTS.md
├── .evo/
│   ├── project.md
│   ├── context.md
│   ├── goal.md
│   ├── decisions/
│   ├── specs/
│   ├── plans/
│   └── research/
├── .agents/skills/
├── src/
├── tests/
└── ...
```

知识位置不再由每个 Agent 每次重新发现：

- `.evo/project.md`：项目地图、技术栈、模块、build/test/run、关键入口。
- `.evo/context.md`：领域语言和稳定业务事实。
- `.evo/decisions/`：长期技术、架构与工程决策。
- `.evo/specs/`：尚未完成的需求/设计规格。
- `.evo/plans/`：可执行的 bounded slices。
- `.evo/research/`：带日期与来源的外部研究。
- `.evo/goal.md`：当前或最近一次连续执行目标。

Brownfield 项目也采用同一目录：已有 ADR/Decision、Working Spec/RFC、Plan、Research、Context 会由 `evo-setup` 迁移到 `.evo/`，不保留第二套知识位置。API 文档、用户文档、部署说明等正式产品/项目文档仍留在原项目文档体系。

## 安装

```bash
npx skills@latest add liebaor/evoworkflow
```

推荐 repository/project scope。

安装后第一次使用：

```text
evo-setup
→ evo-init
→ ask-evo
```

以后不知道下一步时，只要使用 `ask-evo`。

## 18 个 Skills

### 入口与指导

- `ask-evo`：读取 Repository，推荐唯一下一步。
- `evo-advisor`：以资深开发工程师 / 软件架构师视角给出技术指导，不直接改代码。

### 项目基础

- `evo-setup`：建立固定 `.evo/` Convention，并迁移 Brownfield 工程知识。
- `evo-init`：理解代码库并填充 `project.md` / `context.md`。
- `evo-recover`：新 Session / 新 Agent 恢复当前工作上下文。

### 思考与设计

- `evo-grill-with-docs`：事实 Agent 查，材料决策问人，持续完善 context/decision。
- `evo-research`：从最新高可信 Primary Sources 调研外部方案。
- `evo-spec`：把已澄清的非机械变化综合成 Working Spec。
- `evo-plan`：拆成 fresh Agent 可独立实施和验证的 vertical slices。
- `evo-change`：处理中途需求和方向变化。

### 执行、质量与交付

- `evo-implement`：实施一个 bounded slice。
- `evo-tdd`：按有效 RED → 最小 GREEN → 安全 REFACTOR 推进。
- `evo-bug`：复现、根因、最小修复、Regression。
- `evo-verify`：逐条 Acceptance 给出 PASS / FAIL / UNVERIFIED。
- `evo-review`：按 Intent / Engineering / Evidence 三轴独立复核。
- `evo-finish`：让实现、当前文档、Decision 和工程知识收敛。
- `evo-goal`：一个目标连续完成所有 slices，并持续测试、修复、验证和检查点提交。
- `evo-commit`：生成 AI-readable Git 历史，并在明确授权时 push。

## 常见主流程

```text
evo-setup          # 每个项目一次
  ↓
evo-init           # 建立项目认知
  ↓
evo-grill-with-docs / evo-advisor / evo-research
  ↓
evo-spec
  ↓
evo-plan
  ↓
单步：evo-implement → evo-tdd → evo-verify
或
连续：evo-goal
  ↓
evo-review
  ↓
evo-finish
  ↓
evo-commit [→ push]
```

流程按风险裁剪。小机械修改不需要强行 Spec/Plan；高风险权限、隐私、不可逆数据、兼容性、外部成本和重大架构变化必须保留显式人类决策。

## Goal：连续完成一个目标

`evo-goal` 使用 `.evo/goal.md` 作为人和 Agent 都可读的执行记录。它循环：

```text
next slice
→ implement
→ TDD when appropriate
→ focused verify
→ fix / bug loop on failure
→ checkpoint commit when configured
→ next slice
```

全部 slices 完成后再进行 Full Verify → Review → Finish → Final Commit。普通代码/测试问题由 Agent 自己解决；产品方向、不可逆数据、安全/隐私、重大兼容性和新增外部成本等材料决策必须停下来找人。

## TDD 与 Verify 的区别

- `evo-tdd`：**怎么开发**，要求 RED 的失败原因确实是目标行为尚不存在，而不是环境、语法或 fixture 错误。
- `evo-verify`：**怎么证明已经满足 Acceptance**，使用真实项目工具和运行路径。

因此不另设 `evo-test`：测试设计归 TDD，完成证明归 Verify。

## Git 历史也要让 AI 看得懂

`evo-commit` 推荐：

```text
feat(meeting-room): reject conflicting bookings

Implements:
- S3 permission and conflict path
- AC-4 conflict rejection

Verified:
- MeetingRoomServiceTest
- booking API integration test

Context:
- .evo/specs/meeting-room.md
- .evo/plans/meeting-room.md
```

Commit 成功不等于功能完成。Push 默认不自动发生，除非用户明确要求，或当前 Goal 明确授权。

## 核心原则

> **知识存哪里由 Convention 决定；知识内容由 Agent 基于 Repository 推理；可机械判断的事实由真实工具证明；重大取舍由人决定。**

更多内容见：`docs/architecture.md`、`docs/knowledge-model.md`、`docs/workflow.md`、`docs/skill-contract.md`。