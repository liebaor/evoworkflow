# Evidence / 证据

| Acceptance | Status | Evidence | Scope |
|---|---|---|---|
| AC-5.1 | PASS | `pnpm run eval:ruoyi -- --backend-root /tmp/evo-phase2-ruoyi-QHztO6/backend --backend-revision 6230a34b5f9b60b670a9f438dc43b41b8a856598 --frontend-root /tmp/evo-phase2-ruoyi-QHztO6/frontend --frontend-revision 838965c5a18d2c61b73ec30c6e288057aaa08b63`；Feature A/B Context 和原始 checkout clean 复核 | fixed RuoYi archives |
| AC-5.2 | PASS | `pnpm run eval:phase2` 的 E011；FastAPI + Ant Design Pro 自身 JSONResponse、路径和技术事实通过，未报告 RuoYi 机制漂移 | synthetic cross-framework fixture |
| AC-5.3 | PASS | `pnpm run eval:phase2`；E001-E012 全部 PASS | local eval harness |
| AC-5.4 | PASS | `pnpm run check`；类型检查、17 个测试文件/64 个测试、构建、CLI smoke、19 个 Skill 和 7 个 Schema 检查通过 | local repository |

## Commands executed / 已执行命令

2026-09-13 的验证记录如下：

- `pnpm run eval:phase2` — exit 0；E001-E012 全部 PASS。
- `pnpm run eval:ruoyi -- --backend-root /tmp/evo-phase2-ruoyi-QHztO6/backend --backend-revision 6230a34b5f9b60b670a9f438dc43b41b8a856598 --frontend-root /tmp/evo-phase2-ruoyi-QHztO6/frontend --frontend-revision 838965c5a18d2c61b73ec30c6e288057aaa08b63` — exit 0；固定归档 Grounding 与 Feature A/B Context 通过。
- `pnpm run check` — exit 0；17 个测试文件、64 个测试、构建后 CLI smoke、19 个 Skill 和 7 个 Schema 均通过。
- `node dist/index.js context --root . --json` — exit 0；输出路径化 Context、引用理由和 Git 快照，默认不写入。
- `node dist/index.js recover --root . --json` — exit 0；`valid: true`，输出阶段、Slice、Evidence、未知项和下一步建议。

## Unverified external or operational paths / 未验证的外部或运行路径

- RuoYi Maven build、Spring Boot startup、MySQL、浏览器和 Agent 执行仍为 `UNVERIFIED`。
