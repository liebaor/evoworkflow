# 仓库协议

## 知识分类

| 知识 | 主要位置 | 回答的问题 |
|---|---|---|
| 常驻规则 | `AGENTS.md` | Agent 始终必须遵守什么？ |
| 当前事实 | 已有 README/文档和 `.evo/project.md` | 系统现在是什么样？ |
| 领域语言 | 必要时使用 `CONTEXT.md` | 业务词汇是什么意思？ |
| 持久 Decision | `.evo/decisions/` | 为什么长期选择仍然有效？ |
| 当前工作 | `.evo/work/` 和 `.evo/state.yml` | 现在正在改变什么？ |
| 证据 | 测试、CI 和 `evidence.md` | 什么可观察结果支持这个结论？ |

一个事实只能有一个主权威。`.evo/project.md` 应链接已有架构或领域文档，而不是复制一份竞争性内容。当前文档描述当前行为；Git、被取代的 Decision、completed Change 和 Postmortem 保存历史。

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
      evidence.md
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

## Decision 生命周期

Decision 从 `working` 移到 `current` 或 `declined`。当结论变化时，不能静默改写 current Decision；新 Decision 通过 `supersedes` 记录继承关系，旧 Decision 通过 `supersededBy` 指向新 Decision。

## 仓库收敛

只有满足下面关系时，Finish 才可以完成 Change：

```text
已批准意图 = 当前 Decision = 实现 = 测试 = 证据 = 当前文档
```

`UNVERIFIED`、未解决冲突、缺失权威路径、未关闭的阻塞性评审问题和范围漂移都会阻止无条件完成声明。

证据门禁同时检查验收表和 `Unverified external or operational paths` 章节。本地测试不能静默替代真实模型、跨平台、CI、外部服务或生产结果。

只有当 `review.md` 同时记录 `status: APPROVED`、`humanAcceptance: true` 和 `acceptedLimitations: true` 时，人工才能把这些外部或运行环境项目作为已知限制接受。Finish 会保留原始 `UNVERIFIED` 记录；它们不会被改写成 `PASS`，也不等价于真实环境已经验证。
