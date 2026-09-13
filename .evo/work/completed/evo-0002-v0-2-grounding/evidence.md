# evoworkflow v0.2 Grounding Evidence / 落地证据

| Acceptance | Status | Evidence | Scope |
|---|---|---|---|
| AC-2.1 | PASS | `tests/scanner.test.ts` covers metadata versions, confirmed/inferred evidence, unknown versions, area classification and repeated-scan determinism; 8 tests passed | local repository |
| AC-2.2 | PASS | Read-only evaluator identified backend Java 1.8, Maven, Spring Boot 2.5.15, RuoYi 3.9.2, MySQL, Redis, MyBatis, Spring Security and required capabilities; frontend Vue 3.5.26, Vite 6.4.1 and JavaScript | fixed RuoYi archives |
| AC-2.3 | PASS | `tests/init.test.ts`, built CLI preview/apply smoke, project map areas and operating paths; existing files were preserved and preview wrote nothing | local repository and temporary archives |
| AC-2.4 | PASS | `pnpm run eval:ruoyi` passed for backend commit `6230a34b5f9b60b670a9f438dc43b41b8a856598` and frontend commit `838965c5a18d2c61b73ec30c6e288057aaa08b63`; source checkout status remained clean | RuoYi read-only evaluation |
| AC-2.5 | PASS | `pnpm run check` passed: 13 test files, 51 tests, build, built CLI smoke, 19 Skill checks and 7 generated Schema checks | local repository |

## Verification commands / 验证命令

以下命令均在 2026-09-13 执行并以退出码 0 完成：

- `pnpm run typecheck`
- `pnpm exec vitest run tests/scanner.test.ts tests/init.test.ts`（2 个测试文件，9 个测试）
- `pnpm run check`（13 个测试文件，51 个测试；包含 build、`smoke:cli`、19 个 Skill 和 7 个 Schema 检查）
- `pnpm run eval:ruoyi -- --backend-root <fixed backend archive> --backend-revision 6230a34b5f9b60b670a9f438dc43b41b8a856598 --frontend-root <fixed frontend archive> --frontend-revision 838965c5a18d2c61b73ec30c6e288057aaa08b63`
- `node dist/index.js init --root <fixed backend archive>` 和 `node dist/index.js init --root <fixed frontend archive>`；两个预览均显示 `No files were written`，归档中没有出现 `.evo`。
- 两个用户 RuoYi checkout 的 `git status --short` 均为空。

评估器只扫描固定归档，未执行真实构建或运行入口，因此这些命令的成功不代表 RuoYi 运行时已经通过。

## Unverified external or operational paths

中文：未验证的外部或运行环境路径。

- RuoYi real Maven build and Spring Boot startup: `UNVERIFIED`。
- RuoYi real MySQL connection and database behavior: `UNVERIFIED`。
- RuoYi browser/frontend consumer path: `UNVERIFIED`。
- Live Codex, Claude Code, and OpenCode execution against RuoYi: `UNVERIFIED`。
