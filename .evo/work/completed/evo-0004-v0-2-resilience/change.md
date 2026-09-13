---
id: evo-0004-v0-2-resilience
weight: LARGE
status: APPROVED
approval:
  approvedAt: 2026-09-13T08:48:12.399Z
  approvedBy: human
  fingerprint: 83f5c3aff5564508458d3812c3062fc20a05820b04eabbfc3e5023087a54c59a
  source: phase2-user-request
---

# evoworkflow v0.2 — Change Resilience / 变更韧性

## Problem / 问题

需求会在实施中变化，Bug 需要从症状追到根因，新 Session 也不能依赖旧聊天恢复。如果这些信息只留在对话里，旧批准、计划、测试和当前知识会悄悄分叉。

## Goal / 目标

让 evoworkflow 用持久化的 Requirement Delta、Bug investigation、Decision supersession 和只读 Recovery 报告保留变化链路；新 Agent 能从仓库状态恢复到正确的人控边界。

## Scope / 范围

- 增加结构化 Requirement Delta 的生成/写入能力，明确 OLD、NEW、RETAIN、MODIFY、REMOVE、ADD 和 Impact。
- 增加结构化 Bug investigation 的生成/写入能力，明确复现失败证据、预期、根因、复用规则、修复边界、回归、真实入口和知识沉淀。
- 加强 current/working/declined Decision 的 `supersedes`/`supersededBy` 双向关系校验，防止静默改写和断链。
- 增加只读 `buildRecoveryReport` 与 `evo recover`，读取 State、Change、Goal、Evidence、Decision、Working Context 和 Git 状态。
- 添加 E006-E008 评估、恢复测试、Delta/Bug/Decision 测试，并更新中文 Skill 与运行文档。

## Non-goals / 非目标

- 不自动修改已批准 Change 的 What，不自动批准 Delta、Decision、Goal 或恢复执行。
- 不自动修复 Bug、不运行真实数据库/浏览器/Agent、不删除 Goal 锁、不 commit/merge/deploy。
- 不把 Recovery 报告变成新的长期 Authority，也不复制源代码、完整文档或旧聊天。
- 不重写一期 Goal Runner 和既有 Finish 行为。

## Rules and acceptance / 规则与验收

- AC-4.1：Requirement Delta 保留 OLD/NEW/RETAIN/MODIFY/REMOVE/ADD/Impact；记录后状态明确需要人工重新审阅，不静默覆盖旧 Artifact。
- AC-4.2：Bug 记录包含复现失败证据、预期行为、根因、复用机制、修复边界、回归证据、真实入口状态和知识沉淀；没有证据时保留 `UNVERIFIED`。
- AC-4.3：Decision 取代关系要求 predecessor/successor 双向链接存在且一致；断链、错链和循环被确定性检查拒绝。
- AC-4.4：`evo recover` 默认只读，能输出当前目标、阶段、已完成/待完成 Slice、阻塞、修改路径、最新 Evidence、未知项和一个下一步建议，不依赖历史聊天。
- AC-4.5：E006、E007、E008 通过；现有全量本地检查保持通过。

## Existing mechanisms to reuse / 复用的现有机制

- `.evo/work`、Artifact frontmatter、原子写入和 `missingWorkflowDocumentSections`。
- `validateProject` 的 State/Decision/Artifact 校验和 `getStatusSummary` 的只读导航。
- `buildWorkingContext` 的路径路由和 Git 只读快照。
- 现有 Delta/Bug 模板、Goal Slice 投影和测试辅助仓库。

## Boundaries / 边界

- Primary module / 主模块：`src/repository/workflow-documents.ts`、`src/repository/recovery.ts`、`src/validation/project.ts`
- Affected modules / 受影响模块：`src/commands/recover.ts`、Decision 校验、Skills、Phase 2 eval 和测试
- Unaffected modules / 不受影响模块：RuoYi checkout、外部服务、产品运行时、自动提交与部署

## Open Decisions / 未决 Decision

- 无新的产品或架构 Decision；Delta、Bug 和 Recovery 都把需要人工决定的内容显式停在仓库中。
