---
id: evo-0005-v0-2-cross-project
weight: STANDARD
status: APPROVED
approval:
  approvedAt: 2026-09-13T08:56:48.824Z
  approvedBy: human
  fingerprint: 7527bddc0c214b3645f76af91d86fec3f29bd043027584c4ed3ea4c08c8d451c
  source: phase2-user-request
---

# evoworkflow v0.2 — Cross-project validation / 跨项目验证

## Problem / 问题

核心 Context、Consistency、Resilience 能力已经在 evoworkflow 合成夹具上通过，但还需要证明这些能力依赖实际 Repository 证据，而不会把 RuoYi 的 Java/Spring/AjaxResult/注解习惯误套到 FastAPI + Ant Design Pro 项目。

## Goal / 目标

用固定 RuoYi 归档和独立 FastAPI + Ant Design Pro 夹具完成二期最终验证：真实项目的参考实现、响应、权限、命名和前端路径来自各自 Repository；连续 Feature 场景的证据和限制可复查。

## Scope / 范围

- 扩展只读 RuoYi evaluator，针对 Feature A（Supplier CRUD）和 Feature B（Inventory Alert）检查 Working Context 的参考实现、权限/分页/响应/导出证据。
- 增加 FastAPI + Ant Design Pro 跨项目 eval，验证不产生 RuoYi 专属响应、权限或技术事实。
- 记录固定提交、临时实验边界、Feature A/B/C 场景与最终对比证据；更新二期 DoD、README、Testing、Architecture 和相关 Skills。
- 将现有 E001-E012 评估统一为可执行的 Phase 2 eval harness。

## Non-goals / 非目标

- 不修改 `/home/zhicheng/code/deepseek/deepseek-harness-study/ruoyi` 原始 checkout；RuoYi 只读，特性验证在临时归档副本执行。
- 不声称 RuoYi Maven、Spring Boot、MySQL、浏览器或 Agent 运行已通过。
- 不引入 RuoYi Profile、框架专用硬编码、真实数据库、网络服务、云控制面板或自动提交/部署。

## Rules and acceptance / 规则与验收

- AC-5.1：固定 RuoYi 归档的 Feature A/B Context 能路由真实 `SysUserController`、DataScope、分页/响应和导出证据；原始 checkout 保持 clean。
- AC-5.2：FastAPI + Ant Design Pro 夹具被识别为自身技术栈；`JSONResponse`/实际前端路径不触发 RuoYi `AjaxResult` 或 Java 权限机制漂移。
- AC-5.3：E001-E012 都有可执行评估，其中 E011 明确验证 Actual Repository 高于框架 Profile/通用知识。
- AC-5.4：二期文档和 Skills 说明 Context、Consistency、Adaptive Workflow、Delta/Bug/Recovery、证据边界；所有本地检查通过。

## Existing mechanisms to reuse / 复用的现有机制

- `scanRepository`、`buildWorkingContext`、`analyzeRepositoryConsistency` 和现有只读 RuoYi Grounding evaluator。
- 临时目录、固定 Git archive、初始化报告、Vitest、构建后 CLI smoke 和当前文档主权威。

## Boundaries / 边界

- Primary module / 主模块：`scripts/phase2-ruoyi-smoke.ts`、`scripts/phase2-evals.ts`、二期验证文档
- Affected modules / 受影响模块：README、Architecture、Testing、Operations、Skills、测试
- Unaffected modules / 不受影响模块：RuoYi 原始 checkout、生产系统、外部服务和一期状态协议

## Open Decisions / 未决 Decision

- 无；框架选择和真实部署验证仍由调用方项目及人工决定。
