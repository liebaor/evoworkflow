# evoworkflow Skill 中文索引

每个目录里的 `SKILL.md` 是给 Agent 使用的执行约定。Skill 只完成一个阶段，完成后停止；人工决定是否进入下一阶段。下面的名称是稳定调用标识，说明使用中文。

| Skill | 用途 |
|---|---|
| `ask-evo` | 从仓库状态恢复当前目标、问题和下一步建议。 |
| `ask-evo-architect` | 根据真实仓库证据分析架构，不凭通用模板下结论。 |
| `ask-evo-pm` | 把宽泛产品请求整理成可审阅的交付建议。 |
| `evo-init` | 调查仓库并生成不破坏文件的初始化报告。 |
| `evo-solution-discovery` | 在 Greenfield 自建前比较成熟基础方案。 |
| `evo-grill-with-docs` | 澄清需求、范围、验收和人工 Decision，形成 Change 意图。 |
| `evo-to-spec` | 为 Large Change 编写行为 Specification。 |
| `evo-plan` | 识别复用点、影响范围、垂直 Slice 和验证证据。 |
| `evo-implement` | 只执行当前已批准的一个 Slice。 |
| `evo-verify` | 把验收标准映射到实际 `PASS`、`FAIL` 或 `UNVERIFIED` 证据。 |
| `evo-review` | 检查范围、复用、实现、文档和证据质量，形成评审记录。 |
| `evo-finish` | 在人工接受后检查收敛并归档 Change。 |
| `evo-change` | 记录 OLD/NEW/RETAIN/MODIFY/REMOVE/ADD，并使旧批准失效。 |
| `evo-bug` | 记录复现、失败证据、根因、修复边界和回归证据。 |
| `evo-goal` | 把已批准的执行工作委托给有边界的 Goal。 |
| `evo-engineering` | 按当前 Change 触发条件加载相关工程启发。 |
| `evo-status` | 报告阶段、状态、Slice 检查点和一个下一步建议。 |
| `evo-recover` | 让新会话只根据仓库恢复工作上下文。 |
| `evo-doctor` | 只读检查陈旧知识、锁、未知入口和活动证据。 |

## 使用规则

- 先读根目录 `AGENTS.md`、`.evo/project.md`、`.evo/state.yml` 和活动 Change。
- Skill 不能自己批准文档、解决人工 Decision、进入下一阶段或 Finish。
- 事实必须有仓库证据；没有观察结果就写 `UNVERIFIED`。
- 需要任务导航时使用 `evo context`；它默认只读，`--write` 只写活动 Change 的路径化 Context。
- 一致性分析、Change 分类和跨项目评估都是辅助证据，不会替人工决定架构、批准或真实运行状态。
- 详细的英文 `SKILL.md` 保留为 Agent 兼容接口；命令、路径、Skill 名称和状态值保持原样。
