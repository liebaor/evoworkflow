# 项目地图 / Project map

## Initialization / 初始化

- Project / 项目：`evoworkflow`
- Mode / 模式：`BROWNFIELD`（当前仓库已由 evoworkflow 管理）
- Discovery confidence / 发现置信度：`HIGH`
- Generated / 生成时间：`2026-09-13T09:22:22.941Z`
- Files inspected / 已检查文件：`137`

此地图记录实际观察到的仓库事实和未解决未知项，不代表已经完全理解项目。

## Authority map

> 中文：权威映射。每个事实只能有一个主权威。

| Topic | Primary authority | Basis |
|---|---|---|
| standing-rules | `AGENTS.md` | existing repository file |
| project-overview | `README.md` | existing repository file |
| architecture | `docs/architecture.md` | existing repository file |
| testing | `docs/testing.md` | existing repository file |
| operations | `docs/operations.md` | existing repository file |

其他文档应链接到这些主权威，而不是复制出第二份事实。

## Technology evidence

> 中文：技术证据。

- TypeScript (67 files / 67 个文件)：`vitest.config.ts`、`tests/artifacts.test.ts`、`tests/classification.test.ts`
- oclif：`package.json`

## Operating paths

> 中文：运行入口。

| Purpose | Command | Evidence |
|---|---|---|
| build | `pnpm build` | package.json#scripts.build |
| check | `pnpm check` | package.json#scripts.check |
| check | `pnpm check:schemas` | package.json#scripts.check:schemas |
| phase2 evaluation | `pnpm run eval:phase2` | package.json#scripts.eval:phase2 |
| RuoYi evaluation | `pnpm run eval:ruoyi -- --backend-root <archive> --backend-revision <commit> --frontend-root <archive> --frontend-revision <commit>` | package.json#scripts.eval:ruoyi |
| run | `pnpm dev` | package.json#scripts.dev |
| test | `pnpm test` | package.json#scripts.test |
| typecheck | `pnpm typecheck` | package.json#scripts.typecheck |
| working context | `node dist/index.js context --root <repository>` | src/commands/context.ts |
| recovery report | `node dist/index.js recover --root <repository>` | src/commands/recover.ts |

## Reusable capabilities

> 中文：可复用能力。

- `buildWorkingContext` — path-based task context routing without source/doc body copying / 不复制源码和文档正文的路径化任务上下文路由。
- `analyzeRepositoryConsistency` — candidate consistency and blast-radius signals / 一致性与影响范围候选信号。
- `recordRequirementDelta`、`recordBugInvestigation`、`buildRecoveryReport` — resumable change, bug and recovery records / 可恢复的变更、Bug 和恢复记录。

## Reference implementations

> 中文：参考实现。

- `src/repository/init.ts` — report-before-write initialization and preservation / 先报告后写入的初始化与保留。
- `src/repository/scanner.ts` — evidence-based repository archaeology / 基于证据的仓库调查。
- `src/core/goal.ts` — sequential Slice execution and stop conditions / 顺序 Slice 执行与停止条件。
- `src/repository/goal-execution.ts` — persisted Goal locks and configured adapters / 持久化 Goal 锁与 Adapter。
- `src/validation/project.ts` — deterministic Repository Protocol gates / 确定性仓库协议门禁。
- `src/agents/adapter.ts` — Agent Adapter seam / Agent Adapter 接口。
- `src/agents/process-adapter.ts` — direct local CLI adapter process handling / 直接启动本地 CLI Adapter。
- `src/commands/approve.ts` — exact-content human approval command / 精确内容人工批准命令。
- `src/commands/check.ts` — repository protocol check command / 仓库协议检查命令。
- `src/commands/doctor.ts` — read-only knowledge diagnostics / 只读知识诊断命令。
- `src/repository/working-context.ts` — path/reason Working Context routing / 路径与理由化 Working Context 路由。
- `src/repository/consistency.ts` — candidate consistency and blast-radius analysis / 一致性与影响范围候选分析。
- `src/repository/classification.ts` — evidence-based Small/Standard/Large suggestion / 基于证据的变更等级建议。
- `src/repository/workflow-documents.ts` — Delta and Bug structured records / Delta 与 Bug 结构化记录。
- `src/repository/recovery.ts` — read-only repository recovery report / 只读仓库恢复报告。
- `scripts/phase2-evals.ts` — deterministic E001-E012 harness / E001-E012 确定性评估。
- `scripts/phase2-ruoyi-smoke.ts` — fixed-archive RuoYi grounding and Feature A/B evaluator / 固定归档 RuoYi Grounding 与 Feature A/B 评估。
- `scripts/phase3-ruoyi-behavioral.ts` — separate real-Agent RuoYi A/B/Delta/Bug/Recovery/C baseline plus FastAPI positive-consistency evaluator / 独立真实 Agent RuoYi 连续场景与 FastAPI 正向一致性评估。

## Unknowns / 未知项

No initialization unknowns were recorded / 初始化没有记录未知项。
