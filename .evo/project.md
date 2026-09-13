# 项目地图 / Project map

## Initialization / 初始化

- Project / 项目：`EvoFlow`
- Mode / 模式：`BROWNFIELD`（当前仓库已由 EVOworkflow 管理）
- Discovery confidence / 发现置信度：`HIGH`
- Generated / 生成时间：`2026-09-13T06:28:42.000Z`
- Files inspected / 已检查文件：`122`

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

- TypeScript (55 files / 55 个文件)：`vitest.config.ts`、`tests/artifacts.test.ts`、`tests/convergence.test.ts`
- oclif：`package.json`

## Operating paths

> 中文：运行入口。

| Purpose | Command | Evidence |
|---|---|---|
| build | `pnpm build` | package.json#scripts.build |
| check | `pnpm check` | package.json#scripts.check |
| check | `pnpm check:schemas` | package.json#scripts.check:schemas |
| run | `pnpm dev` | package.json#scripts.dev |
| test | `pnpm test` | package.json#scripts.test |
| typecheck | `pnpm typecheck` | package.json#scripts.typecheck |

## Reusable capabilities

> 中文：可复用能力。

No reusable capability was confirmed / 尚未确认可复用能力。

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

## Unknowns / 未知项

No initialization unknowns were recorded / 初始化没有记录未知项。
