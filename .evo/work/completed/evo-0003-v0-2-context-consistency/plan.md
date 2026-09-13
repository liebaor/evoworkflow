---
change: evo-0003-v0-2-context-consistency
status: APPROVED
approval:
  approvedAt: 2026-09-13T08:31:59.870Z
  approvedBy: human
  fingerprint: fc578389b0963238d12a59c1941fcaeeca9e16ea73cfc5f9130d1310144fd4be
  source: phase2-user-request
---

# Implementation plan / 实施计划

## Reuse analysis / 复用分析

- 复用已有 `repositoryPaths`、`openManagedRepository`、`scanRepository`、Markdown frontmatter 解析、`getStatusSummary`、原子文本写入和 Vitest。
- Git 只通过无 shell 的只读 `git status`/`git log` 调用；Git 不可用时记录未知，不阻止其他上下文。
- 不引入数据库、网络、模型调用或框架专用 Profile。

## Primary and affected modules / 主模块与受影响模块

- Primary：工作上下文路由、一致性观察、Change 分类。
- Affected：`evo context` 薄 CLI、Phase 2 eval harness、Skills/README/测试文档。
- Unaffected：一期阶段转换、批准指纹、Goal 执行和外部 RuoYi 文件。

## Expected blast radius / 预计影响范围

只新增只读分析和显式工作材料输出；默认不写仓库。显式写入仅限 `.evo/work/active/<change-id>/context.md`，不覆盖产品文件、权威文档或 Decision。

## Vertical Slices / 垂直 Slice

### S1 — Working Context 路由 / Working Context routing

- Objective / 目标：为活动 Change 生成最小、可恢复、只保存路径和理由的上下文。
- Acceptance / 验收：默认只读；相关 Authority、Decision、参考实现、测试、领域文档、历史 Bug 和 Git 信息均可观察且排序稳定。
- Expected paths / 预期路径：`src/repository/working-context.ts`、`src/commands/context.ts`、`tests/working-context.test.ts`。
- Verification / 验证：Working Context 单元测试、CLI JSON/写入边界测试。
- Dependencies / 依赖：Grounding 已完成。

### S2 — Consistency signals / 一致性信号

- Objective / 目标：用实际仓库证据提示机制、命名和影响范围漂移。
- Acceptance / 验收：覆盖 E001-E005、E012；提示不直接替代人工架构 Decision。
- Expected paths / 预期路径：`src/repository/consistency.ts`、`tests/consistency.test.ts`。
- Verification / 验证：合成 Brownfield fixture 的通过/漂移/范围扩大测试。
- Dependencies / 依赖：S1 的扫描和路径路由。

### S3 — Adaptive classification and evals / 自适应分类与评估

- Objective / 目标：按复杂度选择最小流程，并防止过早抽象和流程过载。
- Acceptance / 验收：E009、E010 输出 SMALL/局部实现建议；跨模块、API、数据、安全或状态变化升级为 STANDARD/LARGE。
- Expected paths / 预期路径：`src/repository/classification.ts`、`scripts/phase2-evals.ts`、`tests/classification.test.ts`。
- Verification / 验证：分类器测试和 Phase 2 eval harness。
- Dependencies / 依赖：S1、S2。

## Unaffected behavior / 不受影响的行为

一期 Change/Plan/Goal/Verify/Review/Finish 的状态和审批规则不变；RuoYi 仍只读。

## Migration and rollback / 迁移与回滚

没有数据或产品代码迁移。删除未被引用的新增分析模块即可回滚；已显式生成的 `context.md` 是可重建的工作材料，不是长期 Authority。

## Stop conditions / 停止条件

遇到权威冲突、需要改变现有 API/权限/数据约定、需要新增依赖或无法区分仓库证据与推断时停止并记录 `UNVERIFIED` 或请求人工 Decision。
