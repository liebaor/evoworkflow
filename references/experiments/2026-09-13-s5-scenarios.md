# S5 本地场景验证

验证日期：2026-09-13（Asia/Shanghai）。

## 标准变更生命周期

`tests/workflow.test.ts` 在临时仓库中依次记录 `GRILL/AWAITING_APPROVAL`、`GRILL/APPROVED`、`PLAN/AWAITING_APPROVAL`、`PLAN/APPROVED`、`IMPLEMENT/APPROVED`、`VERIFY/AWAITING_APPROVAL`、`REVIEW/AWAITING_APPROVAL` 和 `FINISH/APPROVED`。每次阶段改变前都重新读取并写入 `.evo/state.yml`，然后通过 `checkConvergence` 和 `finishChange` 验证最终归档。结果：PASS；活动 Change 被移动到 completed，状态变为 `IDLE/COMPLETED`。

这证明的是本地文件协议和人工阶段边界。它不证明真实用户界面、远程 Git 托管或生产部署。

## 需求变更

同一测试先记录 OLD、NEW、RETAIN、MODIFY、REMOVE、ADD 和 IMPACT，再修改已批准的 `change.md`。`validateProject` 观察到 `STALE_ARTIFACT_APPROVAL`，`checkConvergence` 拒绝收敛。结果：PASS；旧批准没有被静默保留。

## 缺陷修复

同一测试创建一个本地可执行夹具，先观察退出码 `1` 的失败，再修改夹具并用同一入口观察退出码 `0`。随后写入复现、失败证据、根因、修复范围、回归证据和真实入口状态。结果：PASS（本地夹具）；真实应用入口保持 `UNVERIFIED`。

## 中断恢复

`tests/recovery.test.ts` 将 Goal 和 `S1` 持久化为 `RUNNING`，留下一个不存在的进程锁。`evo status` 等价的状态读取推荐先检查 Goal，`runStoredGoal` 拒绝重复执行，`evo doctor` 报告 `STALE_GOAL_LOCK`，检查点仍保留。结果：PASS（持久化中断状态）；真实操作系统强制终止、跨平台行为和远程 Agent 仍为 `UNVERIFIED`。

## 收敛门禁

即使 15 条验收表记录全部为 `PASS`，只要证据文件的外部/运行环境章节仍有 `UNVERIFIED`，`node dist/index.js finish --root .` 就以退出码 `1` 拒绝归档。自评审中的人工接受同样保持待处理。结果：PASS；没有文件被移动。

## 人工接受限制后的最终归档

在 `review.md` 记录 `status: APPROVED`、`humanAcceptance: true` 和 `acceptedLimitations: true` 后，收敛报告将外部 `UNVERIFIED` 项标记为 `APPLY`，但保留原始 `UNVERIFIED` 文本。`node dist/index.js finish --root . --apply` 成功完成仓库内归档；`evo-0001-v0-1` 移入 `.evo/work/completed/`，两个 working Decision 提升到 `.evo/decisions/current/`，`.evo/state.yml` 变为 `IDLE/COMPLETED`。结果：PASS。

这只证明本地仓库闭环和明确的限制接受，不证明真实模型、跨平台、GitHub Actions、全局安装命令或生产入口已经验证。
