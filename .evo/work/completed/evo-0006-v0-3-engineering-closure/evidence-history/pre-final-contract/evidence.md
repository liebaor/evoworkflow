# Phase 3 Evidence / 三期证据

机器权威是同目录的 `evidence.yml` 及其 append-only records；本文件是人类可读摘要。Evidence `PASS` 表示对应验证已经观察到，不表示主 Change 已被人工 Acceptance。

| Acceptance | Status | Evidence | Scope |
|---|---|---|---|
| AC-6.1 | PASS | `EV-20260913212142-9324ad08`；真实 RuoYi Agent A/B/Delta/Bug/Fresh C 与 FastAPI 正向场景均有独立验证；结果为 `BEHAVIORAL_PASS` | fixed RuoYi revisions + isolated Agent evaluator |
| AC-6.2 | PASS | `EV-20260913212143-ff665d1e`；constraints source priority、类型边界、unknown/conflict 和可重建指纹由测试/E309覆盖 | local repository |
| AC-6.3 | PASS | `EV-20260913212143-ff665d1e`；hard gate promotion 的五项条件及 valid→FAIL→restore 负向回归通过 | local repository |
| AC-6.4 | PASS | `EV-20260913212143-ff665d1e`；Acceptance Trace、Evidence v2 和 Candidate Admission 测试通过 | local repository |
| AC-6.5 | PASS | `EV-20260913212143-ff665d1e`；Goal fresh context/constraints/preflight、bounded invocation、verification、checkpoint 和 stop condition 测试通过；真实 Agent 只写 evaluator-owned `.evo/behavioral/` | local repository + isolated behavioral evaluator |
| AC-6.6 | PASS | `EV-20260913212143-ff665d1e`；Worker 成功状态固定为 `READY_FOR_REVIEW`，不能生成 `ACCEPTED` 或自动 Finish | local repository |
| AC-6.7 | PASS | `EV-20260913212143-ff665d1e`；Change/Decision/Context/Constraints/Evidence 指纹变化后的 stale/current 和未受影响证据保留路径通过 | local repository |
| AC-6.8 | PASS | `EV-20260913212143-ff665d1e`、`EV-20260913214415-93d9731e`；结构化 checkpoint/delivery renderer、显式 commit/push 边界和 checkpoint scope 回归通过；本次没有主仓库 commit 或 push | local repository |
| AC-6.9 | PASS | `EV-20260913212143-ff665d1e`；真实 Agent session 后 `evo recover` exit 0，重建 `VERIFY/AWAITING_APPROVAL`、A/B/DELTA/BUG completed 和唯一下一步 | isolated behavioral evaluator |
| AC-6.10 | PASS | `EV-20260913212145-f98b0fd6`；Node 22.23.2 和 Node 24.19.0 的本地 CI-equivalent `pnpm run check`、schema/skill、Phase 2/3、CLI 和 packed-artifact smoke 均通过 | local matrix; hosted CI remains external |

## Commands executed / 已执行命令

- `pnpm run generate:schemas`
- `pnpm run check` under Node `22.23.2`
- `pnpm run check` under Node `24.19.0`
- `mvn -B test` and `mvn -B -DskipTests -f pom.xml package` in a clean fixed-revision RuoYi backend clone with Temurin `17.0.20.1+1`
- `pnpm run eval:ruoyi:phase3` against the fixed RuoYi backend/frontend revisions
- `pnpm run eval:ruoyi:phase3:behavioral -- ... --output /tmp/evoworkflow-phase3-ruoyi-behavioral.json`
- RuoYi Spring Boot local API probes for login, user identity, routers, user list/detail and Redis cache
- RuoYi frontend `npm install --ignore-scripts --no-audit --no-fund --package-lock=false` and `npm run build:prod`
- `pnpm evo evidence inspect --root . --change evo-0006-v0-3-engineering-closure --json`；Evidence v2 reconciliation `valid: true`，10 条验收均有 PASS record
- 最终派生报告重建后的最新树快照记录；共 7 条以上 append-only records，所有验收仍为 `PASS/CURRENT`

## Doctor result / Doctor 结果

`pnpm evo doctor --root . --json` 以非零退出并按 report-first 规则停止；唯一 error 是主 Change 仍未获得人工批准（`UNAPPROVED_ACTIVE_ARTIFACT`）。其余是可解释 warning：未批准 Change 的 20 条 UNKNOWN constraints、5 个历史 Change 缺少旧版 completion handoff，以及活动证据摘要中明确保留的 `UNVERIFIED` 运行边界。历史 v0.2 Evidence 的分层 ID 已按原 `NOT_RUN` 结论展开，reconciliation 不再报告错误。

## Unverified external or operational paths / 未验证的外部或运行路径

- GitHub-hosted CI 的实际 runner 结果未由本地命令观察；Node 22/24 已完成本地等价矩阵。
- 浏览器登录页已真实渲染；认证后的浏览器页面保持 `UNVERIFIED`，因为本次不能绕过向本地测试应用传输密码所需的 action-time 安全确认。后端 API 运行结果不替代浏览器证据。
- `BEHAVIORAL_PASS` 是 Agent 行为观察，不是人类 Acceptance；主 Change 仍保持 `AWAITING_APPROVAL`，没有 Finish、commit、push、merge、release 或 deploy。
