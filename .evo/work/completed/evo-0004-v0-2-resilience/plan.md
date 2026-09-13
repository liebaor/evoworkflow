---
change: evo-0004-v0-2-resilience
status: APPROVED
approval:
  approvedAt: 2026-09-13T08:48:42.279Z
  approvedBy: human
  fingerprint: 7b50f22504f984e18f4729364f42d5a4f0f402a297f79f852f1e3db3922a66f5
  source: phase2-user-request
---

# Implementation plan / 实施计划

## Reuse analysis / 复用分析

- Delta/Bug 复用现有模板和标题解析；写入复用原子文本写入，不触碰已批准正文。
- Recovery 复用 `buildWorkingContext`、`getStatusSummary`、`validateProject` 和 Goal/Artifact Schema。
- Decision 校验扩展现有 `validateDecisionLinks`，不增加第二套 Decision 存储。

## Primary and affected modules / 主模块与受影响模块

- Primary：`workflow-documents.ts`、`recovery.ts`、`validation/project.ts`。
- Affected：`recover` CLI、Phase 2 eval harness、Resilience 测试、Skill 和操作文档。
- Unaffected：一期执行适配器、Goal Runner、RuoYi checkout 和所有外部入口。

## Expected blast radius / 预计影响范围

新增写入仅限活动 Change 下的 `delta.md`/`bug.md`，Recovery 默认只读；Decision 校验只收紧缺失或不一致链接，不改变无 supersession 的既有 Decision。

## Vertical Slices / 垂直 Slice

### S1 — Requirement Delta and Bug investigation / 需求变更与 Bug 调查

- Objective / 目标：将需求变化和 Bug 学习保存为结构化、可审阅工作材料。
- Acceptance / 验收：E006/E007 字段完整；旧批准不被静默覆盖；真实入口未验证保持 `UNVERIFIED`。
- Expected paths / 预期路径：`src/repository/workflow-documents.ts`、测试、模板/Skill 文档。
- Verification / 验证：Delta/Bug 格式与显式写入测试，Phase 2 eval。
- Dependencies / 依赖：Grounding 和 Context 已完成。

### S2 — Decision supersession / Decision 取代关系

- Objective / 目标：让 current Decision 的重大变化保留 predecessor 与 successor 关系。
- Acceptance / 验收：双向一致关系通过，断链、错链、循环失败。
- Expected paths / 预期路径：`src/validation/project.ts`、`tests/validation.test.ts`。
- Verification / 验证：协议测试和 E006 相关检查。
- Dependencies / 依赖：S1 的工作材料协议。

### S3 — Fresh-session Recovery / 新 Session 恢复

- Objective / 目标：从仓库状态生成只读恢复报告。
- Acceptance / 验收：报告含目标、阶段、Slice、阻塞、修改路径、Evidence、未知项和建议；默认不写。
- Expected paths / 预期路径：`src/repository/recovery.ts`、`src/commands/recover.ts`、测试、CLI 冒烟。
- Verification / 验证：Recovery 单元测试、E008、构建后 CLI JSON。
- Dependencies / 依赖：S1、S2、Working Context。

## Unaffected behavior / 不受影响的行为

现有 Change/Spec/Plan 批准、Goal 执行和 Finish 收敛规则保持不变；Recovery 不会自动 resume 或进入下一阶段。

## Migration and rollback / 迁移与回滚

无数据迁移。新增 Delta/Bug 是可删除/可重建的工作材料；删除 Recovery 模块和命令即可回滚新增报告能力。Decision 链校验只会暴露原本无效的链接。

## Stop conditions / 停止条件

遇到需要改变产品意图、重大安全/数据/架构 Decision、活动 Goal 正在执行、外部入口不可观察或证据不足时停止并保留 `NEEDS_INFO`/`UNVERIFIED`。
