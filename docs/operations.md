# 运行手册

## 本地 CLI

构建和运行：

```sh
pnpm install
pnpm run build
node dist/index.js --help
node dist/index.js init --root /path/to/project
```

开发期间可以使用：

```sh
pnpm evo --help
```

## 受管理仓库恢复

先运行只读命令：

```sh
evo check --root /path/to/project
evo status --root /path/to/project
evo doctor --root /path/to/project
evo context --root /path/to/project
evo recover --root /path/to/project
```

`evo context` 默认输出当前 Change 的路径化 Working Context，并说明每个引用的优先级和理由。只有明确添加 `--write` 才会写入活动 Change 的 `context.md`；它不会复制源码正文，也不会改变批准状态。`evo recover` 始终只读，汇总当前阶段、Slice、证据、阻塞、Git 变化和未知项，不会自动恢复 Goal 或进入下一阶段。

三期的派生约束、门禁和 Review 准入也默认只读：

```sh
evo constraints --root /path/to/project <change-id>
evo constraints --root /path/to/project <change-id> --write
evo gate --root /path/to/project <change-id> --kind protocol
evo gate --root /path/to/project <change-id> --kind project
evo admission --root /path/to/project <change-id>
evo admission --root /path/to/project <change-id> --write
```

`constraints --write`、`gate --write` 和 `admission --write` 只写入可删除、可重建的派生视图，不批准 Change、不解决 Decision，也不推进阶段。Protocol Gate 的冲突、未知、过期批准或缺失证据会阻止 bounded Goal；项目命名/架构信号默认保持 `WARNING`。只有保存了完整五项晋升材料并选择受支持确定性 `check` 的 Project Gate 才能使用 `HARD`；它会在 postflight 中失败关闭，普通启发式信号仍只记录 warning。

三期收尾使用受控的 Project HARD registry。`authority`、`predicate`、`falsifyingCase`、`negativeRegression` 和 `remediation` 五项文字是必要解释，但文字本身不能晋升 HARD；还必须存在已注册的 deterministic checker、regression id，并由默认 CI 命令实际覆盖。没有注册 checker 的命名/架构 heuristic 始终是 `WARNING`。

当 Change、Specification 或 Plan 到达 `AWAITING_APPROVAL` 时，先检查精确内容，再记录批准：

```sh
evo approve --root /path/to/project <change-id> change
evo approve --root /path/to/project <change-id> spec
evo approve --root /path/to/project <change-id> plan
```

任何后续编辑都会使保存的指纹失效。把 Artifact 改回 `AWAITING_APPROVAL`，重新审阅后再批准，不要直接编辑哈希。

批准命令记录精确内容批准，并把机器状态标为 `APPROVED`，但不改变阶段。批准 Plan 且不存在 Slice 检查点时，只根据 Plan id 初始化 `PENDING` 检查点；已有检查点保留，供人工检查。

然后读取活动 Change、Goal、working Decision、证据和 Git 状态。删除 Goal 锁前，必须确认没有 Runner 进程仍在运行。

## Agent Adapter

Adapter 配置在 `.evo/config.yml` 中。命令直接启动，不经过 shell。Codex 和 Claude 从标准输入接收 Slice 提示；OpenCode 从消息参数接收提示。自定义 process Adapter 可以使用 `{repository}` 和 `{prompt}` 占位符。

Adapter 命令或参数变化属于执行策略变化；已有 Goal 批准会失效，必须重新批准。

## 故障恢复

状态写入是原子的。进程中断可能留下 `RUNNING` Goal 和 `.evo/goals/.locks/` 下的执行锁。把锁视为陈旧前，检查 PID 和当前进程状态。确认安全删除锁后，使用 `evo goal resume <id> --reason <reason>` 记录新的有边界尝试 epoch 并继续。需要变更需求或调查 Bug 时，先保存结构化 Delta/Bug 记录并回到人工批准边界。

Evidence v2 中的外部或运行环境 `BLOCKED` / `NOT_RUN` 会阻止 Finish，除非 `review.md` 明确记录 `status: APPROVED`、`humanAcceptance: true` 和 `acceptedLimitations: true`。旧版 `UNVERIFIED` 只在迁移期间兼容。这种人工接受只保留为已知限制；本地结果不能替代真实模型、跨平台、CI 或生产入口验证。

Evidence v2 的常用操作：

```sh
evo evidence run --root /path/to/project --change <change-id> --acceptance AC-01 --kind integration --label "focused test" -- pnpm test --filter focused
evo evidence record --root /path/to/project --change <change-id> --acceptance AC-02 --kind manual --label "browser observation" --status PASS --summary "Observed the approved path"
evo evidence reconcile --root /path/to/project --change <change-id>
evo evidence inspect --root /path/to/project --change <change-id>
```

Finish 后先检查 `evo completion inspect <change-id>`。如果显示 `READY_TO_COMMIT`，由外部 Git 流程提交后再运行 `evo completion bind-commit <change-id>`；该命令不会创建提交。

`evo commit` 独立负责 Git chronology。它默认只预览：

```sh
evo commit --root /path/to/project <change-id> --checkpoint SLICE --slice S1 --path src/example.ts
evo commit --root /path/to/project <change-id> --apply --checkpoint SLICE --slice S1 --path src/example.ts
evo commit --root /path/to/project <change-id> --apply --push --path src/example.ts
```

创建 commit 必须同时使用 `--apply` 和至少一个明确的 `--path`；`--push` 只能附加在显式 commit 授权之后。Checkpoint commit 不会把活动 Change 变成 `COMPLETED`，也不会代替 Review、Human Acceptance 或 `evo-finish`。

旧仓库迁移先预览再应用：

```sh
evo migrate --root /path/to/project
evo migrate --root /path/to/project --apply
```

evoworkflow v0.3 不提供自动 release、deploy 或生产回滚；只读恢复报告也不代表外部运行已验证。

## v0.3 最终收口

最终顺序固定为：

```text
exact approval
  -> F1/F2/F3/F4 implementation and focused verification
  -> v0.3.0 metadata and fresh derived views/evidence
  -> Candidate Admission = REVIEW_ADMITTED
  -> independent fresh-context Review
  -> explicit Human Acceptance
  -> evo-finish --apply
  -> evo commit --checkpoint FINAL_DELIVERY --apply --push
  -> remote CI PASS
  -> merge phase3/v0.3-engineering-closure into main
```

F1 发现的 implementation-ahead-of-approval 只能作为历史 finding 和恢复说明保留，不能由之后的批准追认。F2 的 continuity JSON/Markdown 是 Repository-owned trace；F3 绑定 Evidence artifact hash；F4 只允许受控 deterministic checker 晋升 Project HARD。Finish 之后才允许最终 delivery commit，远端 CI 通过之前不合并 main。
