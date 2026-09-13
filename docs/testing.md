# 测试

## 测试层次

- Scanner 测试使用合成 Greenfield/Brownfield 仓库，并包含防误报夹具。
- 初始化测试验证先报告后写入、保留已有文件、Schema 有效性和幂等性。
- 协议测试拒绝重复主权威和悬空活动状态。
- Artifact 测试拒绝在 `AWAITING_APPROVAL` 之前批准，并检测批准后的内容变化。
- Goal 测试使用确定性假 Adapter 和真实子进程验证命令，覆盖持久化 current Slice 投影以及忽略优雅超时的进程。
- Adapter 测试验证 JSON 结果解析，不连接模型。
- CLI 冒烟测试在临时仓库中验证源码和构建后的用户入口。
- S5 场景测试覆盖 Standard 生命周期、Requirement Delta、Bug 回归和中断 Goal 恢复。
- Working Context 测试验证按 Change、能力、参考实现、测试和 Git 路径排序，默认不写入；一致性测试验证响应、权限、命名和实际区域的候选漂移。
- Resilience 测试验证 Delta/Bug 记录只写活动工作、使状态进入 `NEEDS_INFO`，以及 `evo recover` 保留未知项并且不自动继续。
- 二期 RuoYi Grounding 评估只读取调用方提供的固定 Git 归档，检查后端/前端的技术、区域、能力、入口和未知项；归档可以是尚未初始化的 `BROWNFIELD`，也可以是已经应用 EVO 的 `EVO_MANAGED`。它不启动 RuoYi、不连接 MySQL、不打开浏览器，也不调用 Agent。
- 二期 `eval:phase2` 执行 E001-E012：机制漂移、权限并行、命名、Context、复用、影响范围、Bug、恢复、Small 流程、过早抽象、跨框架和实际区域扩张。
- EVO hardening 评估执行 E013-E020：验收项精确集合、重复/额外验收、证据记录引用、证据后的工作树漂移、完成凭证、当前事实目标、v1-to-v2 迁移和多仓库 Change Set。
- RuoYi evaluator 针对 Feature A（Supplier CRUD）和 Feature B（Inventory Alert）在临时副本中检查 `SysUserController`、DataScope、分页/响应和导出证据；FastAPI + Ant Design Pro 使用独立确定性夹具。

自动化测试不得调用真实 coding model、外部系统、部署或生产写入。此类证据必须单独标注。

## 命令

```sh
pnpm run typecheck
pnpm run test
pnpm run build
pnpm run validate:skills
pnpm run check
pnpm run eval:phase2
pnpm run eval:hardening

# Evidence v2
pnpm evo evidence reconcile --root /path/to/project --change <change-id>
pnpm evo evidence run --root /path/to/project --change <change-id> --acceptance AC-01 --kind integration --label "focused test" -- pnpm test --filter focused
pnpm evo evidence inspect --root /path/to/project --change <change-id>

# Finish handoff and migration
pnpm evo migrate --root /path/to/project
pnpm evo migrate --root /path/to/project --apply
pnpm evo completion inspect --root /path/to/project <change-id>
pnpm evo completion bind-commit --root /path/to/project <change-id>

# 二期只读评估；使用固定 Git 提交和只读归档。
pnpm run eval:ruoyi -- \
  --backend-root /path/to/ruoyi-backend-archive \
  --backend-revision <40-char-commit> \
  --frontend-root /path/to/ruoyi-vue3-archive \
  --frontend-revision <40-char-commit>
```

`pnpm run check` 是本地聚合检查。CI 在最低支持 Node 主版本和开发 Node 主版本上运行它。

## 证据规则

只报告实际执行过的命令。一个聚焦测试通过，只支持它覆盖的行为，不能自动代表整个 MVP。由于源码加载和编译后的 oclif 发现路径不同，CLI 命令发现必须包含构建后冒烟测试。Evidence 记录中的命令、退出码、工作目录、输出摘要和 Git 快照必须能被独立检查；人工观察证据必须明确标为 `manual`，不能伪装成自动执行。
