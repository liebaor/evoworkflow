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
```

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

状态写入是原子的。进程中断可能留下 `RUNNING` Goal 和 `.evo/goals/.locks/` 下的执行锁。把锁视为陈旧前，检查 PID 和当前进程状态。确认安全删除锁后，使用 `evo goal resume <id> --reason <reason>` 记录新的有边界尝试 epoch 并继续。

证据中的外部或运行环境 `UNVERIFIED` 会阻止 Finish，除非 `review.md` 明确记录 `status: APPROVED`、`humanAcceptance: true` 和 `acceptedLimitations: true`。这种人工接受只保留为已知限制；本地结果不能替代真实模型、跨平台、CI 或生产入口验证，归档证据仍保留 `UNVERIFIED`。

EVOworkflow v0.1 不提供自动 release、deploy 或生产回滚。
