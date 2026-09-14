# 仓库协议

## 知识分类

| 知识 | 主要位置 | 回答的问题 |
|---|---|---|
| 常驻规则 | `AGENTS.md` | Agent 始终必须遵守什么？ |
| 当前事实 | 已有 README/文档和 `.evo/project.md` | 系统现在是什么样？ |
| 领域语言 | 必要时使用 `CONTEXT.md` | 业务词汇是什么意思？ |
| 持久 Decision | `.evo/decisions/` | 为什么长期选择仍然有效？ |
| 当前工作 | `.evo/work/` 和 `.evo/state.yml` | 现在正在改变什么？ |
| 证据 | 测试、CI、`evidence.yml` 和 `evidence/records/` | 什么可观察结果支持这个结论？ |

一个事实只能有一个主权威。`.evo/project.md` 应链接已有架构或领域文档，而不是复制一份竞争性内容。当前文档描述当前行为；Git、被取代的 Decision、completed Change 和 Postmortem 保存历史。

Working Context 是当前任务的导航投影：它只保存可复查的仓库路径、引用优先级、选择理由和 Git 快照，不复制源代码或文档正文。默认生成不写文件；显式写入时只能落在活动 Change 的 `context.md`。它不能取代项目地图、Decision 或批准的 Change。

## 受管理目录

```text
AGENTS.md
CONTEXT.md                         可选
.evo/
  config.yml
  project.md
  state.yml
  work/
    active/<change-id>/
      change.md
      spec.md                       仅 Large Change
      plan.md
      context.md                    可重建的 Working Context
      constraints.yml                可重建的任务级约束
      acceptance.yml                 Acceptance Trace 派生视图
      protocol-gates.yml             Protocol Gate 报告
      project-gates.yml              Project Gate 报告
      admission.yml                  Candidate Admission 报告
      evidence.yml                  机器证据权威
      evidence/records/*.yml        追加式执行记录
      evidence.md                   人类可读摘要
      review.md                     Review 之后
    completed/<change-id>/
    backlog/<change-id>/
  decisions/
    working/<decision-id>.md
    current/<decision-id>.md
    declined/<decision-id>.md
  goals/
    active/<goal-id>.yml
    completed/<goal-id>.yml
  postmortems/
  change-sets/                      可选的多仓库聚合定义
  migrations/                       协议迁移收据
```

Markdown 保存叙事知识，YAML 保存机器状态。空的可选目录不创建。

`change.md`、`spec.md` 和 `plan.md` 的 frontmatter 保存工作流状态及绑定内容的批准记录。批准哈希规范化的 frontmatter（不含 approval）和正文。当仓库状态声称活动工作已批准时，`evo check` 会拒绝缺失、错误或过期的批准。

对于 Standard 和 Large Change，Plan 拥有每个 Slice 的 id、目标、验收、路径、依赖、验证和停止条件；`state.yml` 只拥有可恢复的 Slice 检查点和 `currentSlice`，不复制 Slice 的含义。Goal 活动时，Goal YAML 是执行权威，State 是经过机器检查的投影。

## 项目地图

`.evo/project.md` 记录：

- 项目模式和仓库概况；
- 架构、领域、API 和运行权威路径；
- 带证据路径的语言和框架；
- 构建、运行、测试和观察命令；
- 可复用能力和参考实现；
- 未解决未知项和置信度。

初始化必须把推断与已验证观察分开标注，不能声称已经完全理解。

Consistency 结果是候选 Review 信号。响应机制、权限机制、命名规则和实际仓库区域与 Plan 不一致时，可以报告 `CONSISTENCY_DRIFT`、`PARALLEL_MECHANISM`、`NAMING_DRIFT` 或 `BLAST_RADIUS_EXPANDED`；只有人工接受或修订批准意图后，才能决定是否改变实现。

## 工程约束与新鲜度

Standard/Large Change 的 `constraints.yml`、`context.md`、`acceptance.yml` 和 Gate 报告都是派生视图，可以删除后从当前 Authority 重建。约束解析优先级为：

```text
Decision > explicit Authority > approved Contract > Project Map > representative code > inference
```

每个约束保存 `source`、`scope`、`evidence` 和输入指纹。代表性代码只能产生 `REFERENCE`/`SOFT`，推断不能伪装成 `HARD`；同一事实的硬冲突产生 `CONFLICT`，在人工解决前不得执行。派生视图使用 `CURRENT`、`STALE`、`UNKNOWN`、`MISSING` 或 `CONFLICT` 表达新鲜度，不能依靠手工“已失效”标记代替输入指纹。

## 门禁与准入

Protocol Gate 是协议硬门禁，Project Gate 默认是评审 warning。任何晋升为硬门禁的 Project Gate 都必须同时保存：`authoritative source`、`deterministic predicate`、`falsifying case`、`negative regression` 和 `remediation`，并选择受支持的确定性 `check`。当前 `check` 覆盖整体一致性、响应、权限、命名和范围膨胀；已晋升定义会在 Project Gate 评估和 Goal postflight 中实际执行。每个硬 Gate 都必须有 valid → PASS、故意违反 → FAIL、恢复 → PASS 的负向回归。Candidate Admission 在硬门禁、Acceptance Trace、Evidence 和 freshness 未满足时返回 `NOT_READY`，不会替人工批准或接受 Review。

## Decision 生命周期

Decision 从 `working` 移到 `current` 或 `declined`。当结论变化时，不能静默改写 current Decision；新 Decision 通过 `supersedes` 记录继承关系，旧 Decision 通过 `supersededBy` 指向新 Decision。

## 仓库收敛

只有满足下面关系时，Finish 才可以完成 Change：

```text
已批准意图 = 当前 Decision = 实现 = 测试 = 证据 = 当前文档
```

`BLOCKED` / `NOT_RUN`（旧版为 `UNVERIFIED`）、未解决冲突、缺失权威路径、未关闭的阻塞性评审问题和范围漂移都会阻止无条件完成声明。

Evidence v2 的门禁先从批准的 Change/Spec 提取验收项，再要求 `evidence.yml` 的 id 集合与其完全一致；验收 ID 支持 `AC-01` 和 `AC-6.1` 这类分层写法，解析和 Schema 必须保留完整后缀。引用的每条记录必须存在、属于同一 Change，`PASS` 必须有 `PASS` 记录。命令记录不可使用 shell 字符串，输出受大小限制并保存哈希，Git 快照用于发现证据之后的工作树变化。本地测试不能静默替代真实模型、跨平台、CI、外部服务或生产结果。

`evo finish --apply` 归档后必须生成 `completion.yml`。当前事实目标由 Plan 的 `currentTruthTargets` 声明；目标缺失会阻止 Finish，旧版没有该字段的 Change 会保留兼容警告。完成但未绑定 Git 提交的 Change 状态为 `READY_TO_COMMIT`，不是已提交，也不是发布完成。

Git commit 是 chronology，不是第二套 EVO 状态数据库。`evo commit` 默认只生成 checkpoint 预览；创建 commit 必须明确 `--apply` 并逐项选择路径，push 还需要明确 `--push` 授权。Checkpoint commit 不能创造 `COMPLETED`，`evo-finish` 也不隐含 commit 或 push。

只有当 `review.md` 同时记录 `status: APPROVED`、`humanAcceptance: true` 和 `acceptedLimitations: true` 时，人工才能把 `BLOCKED` / `NOT_RUN` 或旧版外部 `UNVERIFIED` 作为已知限制接受。Finish 会保留限制记录；它们不会被改写成 `PASS`，也不等价于真实环境已经验证。

Requirement Delta 和 Bug 记录属于活动工作证据。它们应分别保存旧/新意图或复现/根因/回归/真实入口状态；写入后使受影响工作回到 `NEEDS_INFO`，不覆盖原批准内容。`evo recover` 只读读取这些资料，恢复到人工可判断的阶段边界。
