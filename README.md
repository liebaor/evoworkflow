# EVOworkflow

EVOworkflow 是一套由人工驱动、AI 辅助执行、仓库持久化知识的软件工程工作流。

```text
人工决定目标与风险 + AI 执行已批准的工作 + 仓库保存知识与状态 + 证据决定是否完成
```

## 核心原则

- 人工决定做什么、为什么做、是否批准以及是否接受结果。
- Agent 负责调查真实仓库事实，并只执行已经授权的工作。
- `.evo/` 保存当前项目知识、Decision、活动变更、Goal 检查点和证据。
- `evo status` 只给出一个下一步建议，不会替用户进入下一阶段。
- 没有证据、人工接受或文档收敛时，系统不会自动 Finish、提交、合并、发布或部署。

## 当前能力

- `evo init`：先报告仓库发现结果，再以不破坏现有文件的方式初始化。
- `evo status`、`evo check`、`evo doctor`：恢复状态、检查协议、报告陈旧知识和锁。
- `evo approve`：把人工批准绑定到 Change、Specification 或 Plan 的精确内容指纹。
- `evo goal create/approve/run/resume/inspect/cancel`：执行有边界、可恢复、顺序运行的 Goal。
- `evo finish`：生成收敛报告；只有所有门禁通过并且人工接受后，`--apply` 才会归档 Change。
- 19 个面向结果的 Skill：调查、决策、规划、实现、验证、评审和维护。
- Brownfield 发现：依据真实 checkout，而不是根据常见框架名称猜测项目结构。
- Greenfield 指导：先比较成熟方案，再决定是否需要自建基础设施。

EVOworkflow v0.1 不包含多 Agent 并行执行、云控制面板、中央数据库、自动产品或架构决策，也不会自动提交、合并、发布、部署或完成 Change。

## 开发要求

需要 Node.js 22 或更高版本，以及 pnpm。

```sh
pnpm install
pnpm run generate:schemas
pnpm run check
```

## 运行 CLI

```sh
pnpm evo --help
pnpm evo init --root /path/to/project
pnpm evo init --root /path/to/project --apply
pnpm evo status --root /path/to/project
pnpm evo check --root /path/to/project
pnpm evo doctor --root /path/to/project
pnpm evo approve --root /path/to/project <change-id> change
pnpm evo approve --root /path/to/project <change-id> spec
pnpm evo approve --root /path/to/project <change-id> plan
pnpm evo goal create --root /path/to/project <goal-id> --from /path/to/goal.yml
pnpm evo goal approve --root /path/to/project <goal-id>
pnpm evo goal run --root /path/to/project <goal-id>
pnpm evo goal inspect --root /path/to/project <goal-id>
pnpm evo finish --root /path/to/project
pnpm evo finish --root /path/to/project --apply
```

`evo init` 会报告发现了什么以及准备创建什么。`--apply` 只写入缺失的 EVO 文件，不覆盖项目已有的指令和文档。

规划 Skill 会把文档留在 `AWAITING_APPROVAL`。人工检查精确内容后，再执行 `evo approve <change-id> <change|spec|plan>` 记录批准。之后任何实质编辑都会使旧指纹失效，必须重新审阅和批准。

`goal create` 从明确的 Slice 定义创建 `DRAFT` Goal；人工检查后执行 `goal approve` 和 `goal run`。成功执行只到 `READY_FOR_REVIEW`，不会完成 Change。`finish --apply` 是唯一归档 Change 的命令，并且要求当前证据、评审记录和人工接受都已通过。

## 人工工作流

```text
理解仓库
  -> Grill / 需求澄清
  -> Spec / 大变更规格
  -> Plan / 计划
  -> 人工批准
  -> Implement / 每次一个垂直 Slice
  -> Verify / 验证
  -> Review / 评审
  -> 人工接受
  -> Finish / 收敛并归档
```

Small、Standard、Large 变更需要逐步增强的意图、计划和证据。Skill 永远不会自动串到下一个阶段。

详见[产品规格](docs/product-spec.md)、[工作流协议](docs/workflow-protocol.md)、[仓库协议](docs/repository-protocol.md)、[Skill 约定](docs/skill-contract.md)、[Skill 中文索引](skills/README.zh-CN.md)、[Goal 协议](docs/goal-protocol.md)和[运行手册](docs/operations.md)。
