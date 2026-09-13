# Evidence / 证据

| Acceptance | Status | Evidence | Scope |
|---|---|---|---|
| AC-4.1 | PASS | `tests/resilience.test.ts` and E006 preserved OLD/NEW/Impact, wrote only `delta.md`, and set `NEEDS_INFO` for human re-review | local repository |
| AC-4.2 | PASS | `tests/resilience.test.ts` and E007 covered reproduction, root cause, regression, learning and `UNVERIFIED` real-entry status | local repository |
| AC-4.3 | PASS | `tests/resilience.test.ts` accepted reciprocal Decision links and rejected broken links/cycles | local repository |
| AC-4.4 | PASS | `tests/resilience.test.ts`, E008 and built `node dist/index.js recover --root . --json` reconstructed the persisted boundary without writing | local repository |
| AC-4.5 | PASS | `pnpm run smoke:cli`, typecheck and resilience/core tests passed | local repository |

## Commands executed / 已执行命令

实现后记录精确命令、日期、退出结果和输出摘要。

- `pnpm exec vitest run tests/resilience.test.ts` — 2026-09-13，5 tests passed。
- `pnpm run eval:phase2` — 2026-09-13，E001-E010、E012 全部 PASS。
- `pnpm run typecheck` — 2026-09-13，exit 0。
- `pnpm run build` — 2026-09-13，exit 0。
- `pnpm run smoke:cli` — 2026-09-13，exit 0；包含构建后 `recover --json`。
- `node dist/index.js recover --root . --json` — 2026-09-13，exit 0；只读输出。

## Unverified external or operational paths / 未验证的外部或运行路径

- 本 Change 不执行真实 RuoYi、数据库、浏览器或 Agent 入口；这些仍为 `UNVERIFIED`。
