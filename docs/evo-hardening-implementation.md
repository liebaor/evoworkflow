# evoworkflow 优化实施说明

## 目的

本轮优化针对 evoworkflow 本身，目标是让“批准的意图、实际证据、仓库当前事实和交付状态”可以被机器独立检查。RuoYi 只作为 Brownfield/EVO_MANAGED 的真实检验样本，不承载 EVO 协议设计；本轮也不改造真实人工身份认证，命令行测试继续使用约定的模拟人工操作。

## 已实施的四个切片

### Slice 1：Evidence v2

- `evidence.yml` 是验收项集合和状态的机器权威。
- `evidence/records/*.yml` 是追加式观察记录，包含命令参数、工作目录、退出码、摘要哈希、Git 快照和产物哈希；Git 的源工作树指纹排除本次证据自身的 bookkeeping 文件，避免每次记录证据都误报自身漂移。
- `evidence.md` 保留人类解释；旧版 `UNVERIFIED` 表格可读但会提示迁移。
- `evo evidence run` 只用可执行文件加参数数组启动进程，不经过 shell；输出有上限并做常见密钥赋值脱敏。
- 收敛检查要求批准的验收项与 `evidence.yml` 精确匹配，拒绝缺失、重复、额外、未知引用和状态不一致。

### Slice 2：Finish 与交付状态

- `evo finish --apply` 归档后生成 completed Change 的 `completion.yml`。
- 凭证分别记录 Finish 时间、Git 基线、工作树指纹、当前事实目标和源代码状态。
- `READY_TO_COMMIT` 表示流程已归档但没有绑定 Git 提交；`COMMITTED` 只由 `evo completion bind-commit` 绑定已有提交，EVO 不执行 commit。
- Plan 可用 `currentTruthTargets` 声明必须存在的 CREATE/UPDATE 路径；目标缺失会阻止 Finish。

### Slice 3：迁移、Doctor 与恢复

- Config/State 读取 v1/v2，初始化写入 v2。
- `evo migrate` 默认只预览，`--apply` 只创建 v2 文件、导入记录和迁移收据，不删除旧 Markdown。
- Doctor 新增完成凭证缺失、未绑定提交、当前事实缺失、证据记录孤立、证据产物哈希变化和旧协议提示。
- Working Context 和 Recovery 显示 Git HEAD、工作树指纹以及 v2 验收状态，方便新会话恢复。

### Slice 4：多仓库 Change Set

- `.evo/change-sets/<id>.yml` 声明子仓库、子 Change 和共享契约哈希。
- `evo change-set check/status` 只读聚合各成员的 completion handoff 和契约哈希。
- 聚合检查不替子仓库写状态、提交、合并、发布或部署。

## 机械验收

```text
E013  缺失验收项被拒绝
E014  重复或额外验收项被拒绝
E015  证据后的工作树变化被 Doctor 报告
E016  完成但未提交被标为 READY_TO_COMMIT
E017  currentTruthTargets 缺失被报告
E018  v1 到 v2 迁移保留旧证据并生成新记录
E019  多仓库成员和契约哈希聚合通过
E020  新会话恢复可重建活动 Change
```

执行命令：

```sh
pnpm run typecheck
pnpm run test
pnpm run build
pnpm run smoke:cli
pnpm run eval:phase2
pnpm run eval:hardening
pnpm run eval:ruoyi -- --backend-root <backend> --backend-revision <sha> --frontend-root <frontend> --frontend-revision <sha>
pnpm run check
```

## 本轮刻意保留的边界

- 没有自动生成产品需求、架构 Decision 或验收结论。
- 没有自动 commit、merge、release、deploy。
- 没有把人工批准改造成身份认证系统；“人工批准”仍是当前测试协议的显式模拟操作。
- 没有把本地、静态或临时副本结果写成真实 MySQL、浏览器、CI、生产或用户行为已验证。

## 下一轮建议

下一轮优先实现真实项目操作效率，而不是继续扩大协议字段：为 `evidence run` 增加批准命令白名单与结构化测试输出适配，为 `completion` 增加外部提交后的树一致性检查，并把 RuoYi 后端/前端的双 checkout Change Set 作为一条完整实战回放样本。
