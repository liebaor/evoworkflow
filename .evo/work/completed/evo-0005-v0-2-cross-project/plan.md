---
change: evo-0005-v0-2-cross-project
status: APPROVED
approval:
  approvedAt: 2026-09-13T08:57:01.728Z
  approvedBy: human
  fingerprint: b38efaede87102beff1de3a169f2a60dbad12d8035ecadf454ab41054c1b1517
  source: phase2-user-request
---

# Implementation plan / 实施计划

## Reuse analysis / 复用分析

- RuoYi 评估继续使用固定 Git archive，不在用户 checkout 上初始化、写入或运行。
- FastAPI 夹具只作为确定性扫描输入；不安装依赖、不启动服务、不连接外部系统。
- Evals 调用已实现的 Context、Consistency、Classification、Delta、Bug、Recovery，不再复制第二套逻辑。

## Primary and affected modules / 主模块与受影响模块

- Primary：两个 Phase 2 evaluator 和最终证据。
- Affected：中文项目文档、Skills 和构建后 CLI smoke。
- Unaffected：产品代码、Goal Runner、Adapter、数据库和 RuoYi 原始目录。

## Expected blast radius / 预计影响范围

只新增临时 eval 文件和文档/测试更新；临时副本在执行结束后清理。固定输入的 Git revision、扫描结果和未验证项写入证据。

## Vertical Slices / 垂直 Slice

### S1 — RuoYi Feature A/B evaluation / RuoYi Feature A/B 评估

- Objective / 目标：证明实际 RuoYi 的 CRUD、业务规则和导出相关 Context 来自仓库证据。
- Acceptance / 验收：Feature A 找到 `SysUserController`；Feature B 找到 DataScope、分页/响应/导出证据；原始 checkout clean。
- Expected paths / 预期路径：`scripts/phase2-ruoyi-smoke.ts`、`references/experiments/`。
- Verification / 验证：固定归档只读评估。
- Dependencies / 依赖：Grounding、Working Context 和 Consistency。

### S2 — FastAPI cross-framework evaluation / FastAPI 跨框架评估

- Objective / 目标：验证 RuoYi 规则不会泄漏到 FastAPI + Ant Design Pro。
- Acceptance / 验收：实际 FastAPI/前端 metadata 和路径被识别，RuoYi 机制不被报告为当前事实。
- Expected paths / 预期路径：`scripts/phase2-evals.ts`、测试。
- Verification / 验证：E011 确定性临时夹具。
- Dependencies / 依赖：S1 的通用 evaluator 接口。

### S3 — Phase 2 final evidence / 二期最终证据

- Objective / 目标：统一 E001-E012、更新文档并确认二期与 Phase 3 边界。
- Acceptance / 验收：eval harness、Skill 校验、Schema、全量测试和构建通过；真实运行限制仍明确。
- Expected paths / 预期路径：README、docs、skills、references。
- Verification / 验证：`pnpm run check`、`pnpm run eval:phase2`、`pnpm run eval:ruoyi`。
- Dependencies / 依赖：S1、S2。

## Unaffected behavior / 不受影响的行为

CLI 仍保持薄层；eval 不改变项目状态，不自动批准、Finish、commit、merge 或 deploy。

## Migration and rollback / 迁移与回滚

无数据迁移。删除 eval 脚本新增分支和证据即可回滚；已完成 Change 只保留历史记录。

## Stop conditions / 停止条件

固定 revision 不可复现、原始 checkout 变脏、跨框架结果出现 RuoYi 泄漏、或需要真实外部运行时停止并记录 `UNVERIFIED`。
