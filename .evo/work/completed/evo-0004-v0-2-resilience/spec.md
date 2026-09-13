---
change: evo-0004-v0-2-resilience
status: APPROVED
approval:
  approvedAt: 2026-09-13T08:48:27.040Z
  approvedBy: human
  fingerprint: e6863db75068103109800bc80205a0c3907d6555e0862e4ad9ff568ab324cbd9
  source: phase2-user-request
---

# Specification / 行为规格

## Required behavior / 必须行为

1. Requirement Delta 必须保存旧意图、新意图、保留项、修改项、移除项、新增项和对 Acceptance、Decision、Plan/Slice、Code/Tests、Docs、Data/API/Compatibility 的影响。
2. 记录 Delta 时只新增 `.evo/work/active/<change-id>/delta.md` 和必要的机器状态提醒；原有 Change、Spec、Plan 正文及批准记录不得被覆盖。
3. Bug investigation 必须保存观察行为、复现命令和失败结果、预期行为、根因、应复用规则、修复边界、回归结果、真实入口状态和知识沉淀。
4. Decision 取代关系必须能从两端遍历：新 Decision 的 `supersedes` 指向旧 Decision，旧 Decision 的 `supersededBy` 指向新 Decision；目标必须存在且不能形成循环。
5. Recovery 默认不写文件，必须从当前仓库重新读取状态和工作材料；报告中的路径优先于正文复制，建议动作不自动执行。

## Acceptance criteria / 验收标准

- AC-4.1：Delta 的七个部分和影响分类可读、可验证，记录后状态进入需要人工重新审阅的状态。
- AC-4.2：Bug 的完整调查字段可读；真实入口未执行时结果显示 `UNVERIFIED`。
- AC-4.3：一致的 Decision supersession 通过，任一单向或循环关系失败。
- AC-4.4：新 Session 只运行 `evo recover` 即可看到当前目标、阶段、Slice、阻塞、Evidence、Git 修改和下一步。
- AC-4.5：E006-E008 以及现有测试、构建、CLI 和 Schema 检查通过。

## Constraints and compatibility / 约束与兼容性

- 保持 Node.js 22+、ESM、TypeScript strict、JSON Schema 版本 1 和现有状态字段。
- Recovery 和分析结果是只读报告；工作材料的显式写入不改变产品代码和外部系统。
- 旧的 Delta/Bug Markdown 仍按已有标题规则校验；新增字段不得要求旧已完成 Change 迁移。

## Failure behavior / 失败行为

- 缺少必需段落、活动 Change 不存在、Decision 断链或循环时返回确定性错误/协议问题。
- 无法读取 Git、真实入口或外部系统时保留未知，不猜测为通过。
- Recovery 遇到协议错误时报告错误并建议先运行 `evo check`，不修改状态。

## Non-goals / 非目标

- 不实现自动需求合并、自动 Bug 修复、自动 Decision 选择、自动 Goal resume、外部通知或生产回滚。

## Open Decisions / 未决 Decision

- 无。
