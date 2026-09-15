# EVO Skills

EVOworkflow 1.0 是一套 **Repository-centered、Skill-first** 的 AI 软件工程工作流。

核心分工：Repository 保存长期知识，Skills 提供工程方法，项目自己的测试/构建/CI 提供机械证据，Git 保存历史，人负责重要决策，Coding Agent/Harness 负责执行。

推荐入口是 `ask-evo`。它只读取仓库并推荐一个下一步 Skill，不直接执行目标流程。

## 13 个 Skills

| Skill | 适用场景 |
|---|---|
| `ask-evo` | 不知道下一步做什么，读取仓库后只推荐一个 Skill |
| `evo-init` | 第一次理解一个仓库，梳理项目规则、知识 Owner、构建/测试与 Existing Pattern |
| `evo-grill-with-docs` | 需求或架构存在会影响实现的材料性决策，通过决策轮次问清并沉淀长期知识 |
| `evo-research` | API、版本、标准、兼容性、方案等依赖最新外部事实，优先研究 Primary Sources |
| `evo-spec` | 已经讨论清楚的较大变化，需要综合成一个可验证的 Working Proposal |
| `evo-plan` | 将明确目标拆成 fresh Agent 也能独立执行和验证的 bounded slices |
| `evo-implement` | 实现一个边界明确的工作单元，复用仓库现有模式并持续跑反馈循环 |
| `evo-change` | 已接受需求在开发中变化，分析 Delta 并只使真正受影响的工作失效 |
| `evo-bug` | 已观察到 Bug、回归、flaky 或性能异常，先建立失败反馈循环再定位根因 |
| `evo-verify` | 对照 Acceptance 用真实命令/运行路径给出 PASS / FAIL / UNVERIFIED |
| `evo-review` | 独立从 Intent / Engineering / Evidence 三个维度复核变更 |
| `evo-finish` | Verify + Review 后收敛 Current Docs、Decision 和工作 Artifact，使仓库当前事实一致 |
| `evo-recover` | 新 Session / 新 Agent 接力已有工作，从 Repository + Git 重建可信上下文 |

## 常见路线

```text
ask-evo
  ↓
evo-init / evo-recover
  ↓
evo-grill-with-docs
  ↓
evo-research        (需要外部最新事实时)
  ↓
evo-spec            (较大/高风险变化)
  ↓
evo-plan
  ↓
evo-implement
  ↓
evo-verify
  ↓
evo-review
  ↓
evo-finish
```

需求中途变化走 `evo-change`，观察到故障走 `evo-bug`。小而机械的修改可以跳过不必要的 Spec/Plan，遵守 **Minimum Necessary Process**。

每个 Skill 都优先适应宿主仓库已有的文档、Issue、ADR、测试和 CI 习惯，不要求项目迁移到固定目录结构。
