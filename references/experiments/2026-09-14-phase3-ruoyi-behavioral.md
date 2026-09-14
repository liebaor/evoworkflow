# Phase 3 RuoYi behavioral evaluation / 三期 RuoYi 行为评估

评估日期：2026-09-14（Asia/Shanghai）。本记录保存真实 Coding Agent、固定 RuoYi revision、独立验证器和本地运行时的边界化结果。它不是产品 Acceptance、Human Review、Finish、commit 或 push。

## Fixed inputs / 固定输入

| 角色 | 原始 checkout | 固定 revision |
|---|---|---|
| RuoYi backend | `/home/zhicheng/code/codex/vmwork` | `13db1fcef36bee9ce45d2d636a1d4e8f5ed5bbc3` |
| RuoYi frontend | `/home/zhicheng/code/deepseek/deepseek-harness-study/ruoyi/ruoyi-vue3/RuoYi-Vue3` | `838965c5a18d2c61b73ec30c6e288057aaa08b63` |

评估器先检查两个输入 checkout 的 exact HEAD，再在临时目录中创建 backend clean clone 和 frontend fixed archive。原始 checkout 没有写入；Agent 只能在临时副本的 `.evo/behavioral/` 写评估报告。

## Real-Agent behavioral result / 真实 Agent 行为结果

命令：

```sh
pnpm run eval:ruoyi:phase3:behavioral -- \
  --backend-root /home/zhicheng/code/codex/vmwork \
  --backend-revision 13db1fcef36bee9ce45d2d636a1d4e8f5ed5bbc3 \
  --frontend-root /home/zhicheng/code/deepseek/deepseek-harness-study/ruoyi/ruoyi-vue3/RuoYi-Vue3 \
  --frontend-revision 838965c5a18d2c61b73ec30c6e288057aaa08b63 \
  --output /tmp/evoworkflow-phase3-ruoyi-behavioral.json
```

结果：`BEHAVIORAL_PASS`。

| 场景 | Agent 状态 | 独立验证 | 说明 |
|---|---|---|---|
| Feature A | `COMPLETED` | `PASS` | 引用真实 `SysUserController`、service、mapper/XML 和 Vue API/page，并覆盖命名、API、响应、权限、DataScope、日志和测试观察。 |
| Feature B | `COMPLETED` | `PASS` | 延续 Feature A，覆盖 permission、DataScope、分页、标准响应、导出、service/mapper、日志和前端路径。 |
| Requirement Delta | `COMPLETED` | `PASS` | 记录 Inventory 阈值从 inclusive 到 exclusive 的边界变化、影响面和不应静默修改的契约。 |
| Bug | `COMPLETED` | `PASS` | 记录 reproduction、failing evidence、root cause、fix boundary、regression 和真实入口 `UNVERIFIED`。 |
| Fresh Feature C | `COMPLETED` | `PASS` | 新鲜 ProcessAgentAdapter invocation 延续 RuoYi 工程语言；独立验证器检查真实源码引用。 |

第一段 A/B/Delta/Bug 使用一个 bounded Goal；其后执行 `evo recover`，退出码为 0，重建状态为 `VERIFY/AWAITING_APPROVAL`，并报告 A/B/DELTA/BUG 已完成及唯一人工下一步。Feature C 使用独立 fresh invocation。Goal 成功边界仍是 `READY_FOR_REVIEW`，不是 `ACCEPTED`。

独立 source-integrity verifier 的结果为 `PASS`：临时副本中除 `.evo/` 评估报告外没有产品/源码文件变化；评估结束后临时目录已删除。

## Cross-framework positive consistency / 跨框架正向一致性

在独立 FastAPI + React/Ant Design Pro 临时项目中运行 fresh Codex invocation。Agent 状态为 `COMPLETED`，独立验证为 `PASS`，source integrity 为 `PASS`。报告必须引用 `APIRouter`、Pydantic、`JSONResponse`、ProTable 及实际 router/schema/service/frontend 路径，并禁止 `AjaxResult`、`@PreAuthorize`、`@DataScope`、`SysUserController` 等 RuoYi/Java 机制泄漏。

## Deterministic and runtime evidence / 确定性与运行时证据

- `pnpm run eval:phase3`：E301-E315 全部 `DETERMINISTIC_PASS`；其中真实 Agent 行为本身仍由本记录单独报告，不伪装成普通 deterministic eval。
- RuoYi backend clean fixed clone：使用已校验 SHA-256 的 Eclipse Temurin 17.0.20.1+1 执行 `mvn -B -DskipTests -f pom.xml package`，多模块 Maven build `PASS`。原始 revision 的 `logback.xml` 固定了 `/home/ruoyi/logs`；运行副本只为本地测试临时复制并改写日志目标，没有修改原始 checkout。
- RuoYi runtime：专用 MySQL database、Redis 和 Spring Boot 实例已启动；登录、`/getInfo`、`/getRouters`、用户列表/详情和 cache API 均返回预期成功结果。专用 database 和临时服务在评估后清理。
- RuoYi frontend fixed revision：`npm install --ignore-scripts --no-audit --no-fund --package-lock=false` 和 `npm run build:prod` 均 `PASS`。
- In-app Browser：登录页真实渲染 `PASS`（标题、账号/密码框、记住密码和登录按钮可观察）；认证后的页面保持 `UNVERIFIED`，因为向本地应用传输密码需要 action-time 安全确认，本次不绕过该边界。API 运行证据不替代浏览器证据。

## Evaluation-only scaffolding / 评估器专用补充

原始 RuoYi revision 的仓库扫描会留下文档、CI 和前端 Node runtime 等 unknown，因此在临时评估副本中增加了明确标记为 evaluator-only 的 `docs/architecture.md`、`docs/evaluation-runtime.xml`、`.github/workflows/phase3-evaluation.yml` 和 Node `engines` 声明，使 bounded preflight 有可追溯输入。第一次不补充这些输入时，preflight 正确以 unknown constraints `BLOCKED`，没有调用 Agent。补充不改变 RuoYi 产品源码，也不把临时元数据写回原始仓库；因此本结果证明的是“固定 RuoYi 源码 + 明确评估输入”下的行为，不宣称原始 checkout 已具备这些项目协议文件。

## Evidence boundary / 证据边界

`BEHAVIORAL_PASS` 是真实 Agent 的可观察行为结果，不能替代独立产品验收。它没有实现 RuoYi 新产品功能，也没有自动接受 Change、Finish、commit、push、merge、deploy 或修改生产数据。完整结构化输出保存在本次执行的 [`/tmp/evoworkflow-phase3-ruoyi-behavioral.json`](/tmp/evoworkflow-phase3-ruoyi-behavioral.json)。
