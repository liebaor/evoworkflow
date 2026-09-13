---
id: evo-0003-v0-2-context-consistency
weight: STANDARD
status: APPROVED
approval:
  approvedAt: 2026-09-13T08:31:46.545Z
  approvedBy: human
  fingerprint: ae1bd6ab411d3dae2287367533af8fd0fc9cdcc9005c248f7bd622a5b974fc22
  source: phase2-user-request
---

# evoworkflow v0.2 — Working Context 与一致性 / Working Context and Consistency

## Problem / 问题

Grounding 已经能回答“仓库使用什么技术、有哪些区域、如何运行”，但新 Change 还不能从这些事实自动得到最小相关上下文，也没有确定性信号提醒响应、权限、命名、参考实现和影响范围可能发生漂移。

## Goal / 目标

让每个 Change 都能从仓库已有权威、代表性实现、测试、领域词汇和必要的 Git 信息开始工作，并用轻量的确定性分析标出需要模型和人工判断的一致性风险。

## Scope / 范围

- 实现只读 `buildWorkingContext`，并提供显式 `evo context` 输出；只有显式 `--write` 才写入当前 Change 的工作材料。
- 路由项目地图中的 Authority、当前 Change、相关 Decision、参考实现、相关测试、领域文档、历史 Bug 和 Git 状态。
- 实现基于仓库证据的轻量一致性分析：现有机制、响应/权限/命名漂移、并行机制候选和 Blast Radius 扩大提示。
- 实现根据任务复杂度给出 SMALL、STANDARD、LARGE 建议的纯确定性分类器。
- 添加 E001-E005、E009、E010、E012 的确定性评估和中文使用文档。

## Non-goals / 非目标

- 不复制架构文档、Decision 或源代码正文到 `.evo`。
- 不用静态分析器替代模型的架构判断、业务判断或人工 Decision。
- 不自动批准、改变阶段、修改产品代码、commit、merge、deploy 或 Finish。
- 不重写一期 Goal Runner、Artifact 批准、Verify、Review 和 Finish 协议。

## Rules and acceptance / 规则与验收

- AC-3.1：`buildWorkingContext` 只返回路径、关系、理由和必要的状态摘要，不复制权威正文或源代码正文；默认调用不写文件。
- AC-3.2：上下文能从项目地图和活动 Change 路由 Authority、Decision、参考实现、测试、领域文档、历史 Bug 和 Git 状态，并保持稳定排序。
- AC-3.3：一致性分析能识别已有 `AjaxResult`/`@PreAuthorize` 等机制、候选 `ApiResponse`/新权限 Middleware、命名漂移和计划外区域扩大；结果是提示，不把模型判断伪装成事实。
- AC-3.4：Change 分类器对文案/局部判断建议 SMALL，对普通 Feature 建议 STANDARD，对跨模块/API/数据/安全/复杂状态变化建议 LARGE，并支持升级原因。
- AC-3.5：E001-E005、E009、E010、E012 有可重复的 PASS/FAIL 评估，相关 CLI、文档和测试保持一致。

## Existing mechanisms to reuse / 复用的现有机制

- `scanRepository` 的证据路径、能力和参考实现发现：`src/repository/scanner.ts`
- 项目地图与 Authority Map：`.evo/project.md`、`src/repository/init.ts`
- 状态、Artifact 与验证协议：`src/core/schemas.ts`、`src/validation/project.ts`
- 只读状态导航：`src/core/navigation.ts`
- 原子写入和模板渲染：`src/repository/io.ts`、`src/repository/templates.ts`

## Boundaries / 边界

- Primary module / 主模块：`src/repository/working-context.ts`、`src/repository/consistency.ts`、`src/repository/classification.ts`
- Affected modules / 受影响模块：`src/commands/context.ts`、CLI 文档、评估脚本、单元测试
- Unaffected modules / 不受影响模块：Goal 执行、Agent Adapter、RuoYi checkout、外部服务和生产环境

## Open Decisions / 未决 Decision

- 无新的产品、数据、安全或架构 Decision；一致性分析只输出待人工判断的候选项。
