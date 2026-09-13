# AGENTS.md

EVOworkflow 是一套由人工控制、以仓库为中心的 AI 辅助软件工程工作流。修改产品行为前，先阅读[产品规格](docs/product-spec.md)、[工作流协议](docs/workflow-protocol.md)和[仓库协议](docs/repository-protocol.md)。

## 产品不变量

- 人工拥有产品决策、批准、阶段转换、风险接受和副作用授权。
- Agent 调查仓库事实，只执行当前已授权的工作。
- 没有命令或 Skill 会自动完成 Change、commit、merge、deploy 或扩大范围。
- Goal 只接受已批准且没有歧义的 Slice；遇到问题会停止，成功结束于 `READY_FOR_REVIEW`，永远不是 `DONE`。
- 批准绑定精确内容；实质编辑会使批准失效。
- Standard 和 Large 工作只能执行 `.evo/state.yml` 或活动 Goal 持久化的 `currentSlice`，不能根据文档顺序猜测。
- 长期知识必须进入仓库。一个事实只能有一个主权威，其他文档链接到它。
- 当前文档描述当前行为；历史进入 Git、Decision、Postmortem 和已完成 Change 证据。
- 验证记录 `PASS`、`FAIL` 或 `UNVERIFIED`。声明不是证据。
- 除非已有批准 Decision，否则已有仓库模式和成熟能力优先于新抽象。
- 初始化不破坏数据并且幂等；不覆盖已有项目指令和权威文档。

## 源码目录

- `src/core/`：Schema、状态转换、批准指纹、导航和 Goal 执行。
- `src/repository/`：文件协议、仓库发现、初始化和模板。
- `src/agents/`：Agent Adapter 约定和本地 CLI Adapter。
- `src/validation/`：确定性项目检查和 Doctor 诊断。
- `src/commands/`：oclif 命令入口。
- `skills/`：面向结果的 Agent Skill；保持 `SKILL.md` 简洁，把条件性内容放到 references。
- `templates/`：安装到受管理仓库的文件。
- `schemas/`：Zod 权威生成的 JSON Schema 投影。

## 常用命令

```sh
pnpm install
pnpm run generate:schemas
pnpm run typecheck
pnpm run test
pnpm run build
pnpm run validate:skills
pnpm run check
```

迭代时运行聚焦测试，声称仓库可用前运行 `pnpm run check`。不要在测试中运行真实 Agent Adapter；使用确定性假 Adapter。

## 变更纪律

保持协议文档、Zod Schema、生成的 Schema、模板、CLI、Skill 和测试一致。新增行为必须有可观察测试。保留用户已有改动，除非用户明确要求，不要 commit。
