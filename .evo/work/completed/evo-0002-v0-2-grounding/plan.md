---
change: evo-0002-v0-2-grounding
status: APPROVED
approval:
  approvedAt: 2026-09-13T07:21:01.380Z
  approvedBy: human
  fingerprint: 2aa2dbd3820fd0c7f294604a14dc16188df0d64a4aa11472ac32c957a0292c09
  source: phase2-user-request
---

# EVOworkflow v0.2 Grounding Implementation Plan / 落地实施计划

## Reuse analysis / 复用分析

- 复用一期 `scanRepository`、report-before-write 初始化、现有 `.evo/project.md` 模板、oclif CLI、Vitest 和 Node 文件系统。
- 复用 RuoYi 已有 POM、模块目录、`application*.yml`、`ry.sh`、Vue3 `package.json` 和源码作为证据，不创建 RuoYi 专用硬编码 Profile。
- 不复制源码正文；项目地图只保存区域、证据路径和未知项。

## Expected blast radius / 预计影响范围

- Primary: `src/repository/scanner.ts`、`src/repository/init.ts`、`templates/project/.evo/project.md`。
- Affected: `tests/scanner.test.ts`、`tests/init.test.ts`、`scripts/`、`references/experiments/`、`docs/`。
- Unaffected: Goal execution, Agent adapters, Change approval fingerprinting, existing RuoYi checkouts, external services and production.

## Vertical Slices / 垂直 Slice

### S1 — Evidence-backed technology observations / 有证据的技术观察

- Objective: 为技术观察增加版本、置信度和证据路径，并保留未知事实。
- Acceptance: Java/Spring Boot/RuoYi/MySQL、Vue/Vite 和 JavaScript 等观察能从实际 metadata/config 得到；没有版本时不猜测。
- Likely paths: `src/repository/scanner.ts`, `tests/scanner.test.ts`。
- Dependencies: none。
- Verification: deterministic scanner tests and repeated-scan stability test。
- Stop conditions: 观察来源不清、fixture/prose 被提升为事实或需要引入框架专用 Profile。

### S2 — Thin Repository map and operating paths / 薄仓库地图与运行入口

- Objective: 将 Repository areas、技术观察和可靠命令写入项目地图，并继续保持 report-before-write 与 preserve 行为。
- Acceptance: 临时多模块项目和 RuoYi 结构显示 backend/frontend/shared/database/docs 区域；未确认的 test/run/CI 保持 unknown。
- Likely paths: `src/repository/init.ts`, `templates/project/.evo/project.md`, `tests/init.test.ts`, `docs/`。
- Dependencies: S1。
- Verification: initialization tests and built CLI preview/apply smoke in a temporary copy。
- Stop conditions: 地图复制源代码、覆盖现有文件或将推断写成确认事实。

### S3 — Fixed-commit RuoYi Grounding evaluation / 固定提交的 RuoYi 落地评估

- Objective: 在不修改用户 checkout 的前提下，验证后端 Spring Boot 2 提交和 Vue3 提交的 Grounding 结果。
- Acceptance: 两个 checkout 的 Git 基线、扫描数量、技术/能力/引用/未知项和未执行的真实入口都有记录。
- Likely paths: `scripts/phase2-ruoyi-smoke.ts`, `references/experiments/2026-09-13-phase2-ruoyi-grounding.md`。
- Dependencies: S1 and S2。
- Verification: read-only smoke against fixed Git archives or user checkout; no MySQL or external Agent execution。
- Stop conditions: RuoYi checkout dirty, fixed revision unavailable, or scanner output contradicts direct repository evidence。

## Verification / 验证

- Focused Vitest tests for S1/S2 and all existing tests.
- `pnpm run typecheck`, `pnpm run build`, `pnpm run smoke:cli`, `pnpm run validate:skills`, `pnpm run check:schemas`。
- Read-only `node dist/index.js init --root <RuoYi checkout>` and fixed-commit RuoYi evaluation。
- Evidence records local results separately from unverified runtime paths。
