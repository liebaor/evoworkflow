# 工作流协议

## 控制模型

每个 Skill 只在一个阶段内工作，并在产出该阶段结果后停止。用户明确调用下一个阶段。`ask-evo`、`evo status`、`evo context` 和 `evo recover` 可以提供仓库事实或下一步建议，但永远不会自动执行。

`phase` 和 `status` 是两个字段：

- `phase` 表示工作的种类：`INIT`、`GRILL`、`SPEC`、`PLAN`、`IMPLEMENT`、`VERIFY`、`REVIEW`、`FINISH` 或 `IDLE`。
- `status` 表示准备程度：`DRAFT`、`NEEDS_INFO`、`AWAITING_APPROVAL`、`APPROVED`、`BLOCKED` 或 `COMPLETED`。

Artifact 的批准只对被批准内容的指纹有效。规划 Skill 会把文档留在 `AWAITING_APPROVAL`；人工通过 `evo approve <change-id> <change|spec|plan>` 记录决定。编辑已批准的意图或执行细节会使确定性检查失败，直到文档重新回到 `AWAITING_APPROVAL` 并再次批准。

## Change 权重

### Small

适用于范围本地、风险低、行为清楚且不产生持久 Decision 的工作：

```text
理解 -> 实现 -> 聚焦验证 -> 必要时评审/Finish
```

### Standard

适用于普通用户功能和非平凡修复：

```text
Grill -> Plan -> 人工批准 -> Implement -> Verify -> Review -> 人工接受 -> Finish
```

### Large

适用于广泛、高风险、架构、迁移、安全或多 Slice 工作：

```text
Grill -> Spec -> 人工批准 -> Plan -> 人工批准 -> Slice -> Implement -> Verify -> Review -> 人工接受 -> Finish
```

Agent 可以建议权重，但由人工确认。

## 阶段产出

### INIT

发现真实 checkout、构建/测试/运行/观察入口、架构权威、能力、参考实现、技术版本置信度、仓库区域和未知项。先报告后写入。应用初始化只创建缺失的 EVO 文件，不覆盖已有指令。

### GRILL

解决有后果的模糊点，建立持久领域词汇，识别 Decision，并写入 Change 意图。通过调查仓库事实回答问题，而不是凭经验询问用户。

### SPEC

为 Large Change 定义行为、验收标准、约束、兼容性、非目标和未解决 Decision。

### PLAN

识别可复用机制、主模块和受影响模块、未受影响模块、Working Context 引用、预计影响范围、垂直 Slice 以及每个 Slice 的证据。

### IMPLEMENT

默认只执行一个已授权 Slice。实现前读取 Working Context；遇到范围扩大、验收变化、架构偏离、破坏性约定、安全 Decision、破坏性数据操作、意外依赖或重复失败时停止。

### VERIFY

把每个验收标准映射到实际证据。新协议使用 `evidence.yml` 作为机器权威、`evidence/records/*.yml` 保存追加式执行记录、`evidence.md` 保存人类可读摘要；状态为 `PASS`、`FAIL`、`BLOCKED` 或 `NOT_RUN`。每条记录绑定命令、退出码、输出哈希、Git 快照和可选产物哈希。旧版 `evidence.md` 的 `UNVERIFIED` 在迁移期间只读兼容，不得当作新的证据格式继续扩展。

### REVIEW

检查规格一致性、现有模式复用、范围纪律、改动局部性、约定泄漏、不必要复杂度、Consistency 候选信号、实际与预期影响范围以及证据质量。评审报告问题，不静默修复。

### FINISH

人工接受后，协调已批准意图、当前 Decision、实现、测试、证据和当前文档，把活动工作移到 completed 并更新机器状态。Finish 同时写入 `completion.yml`，记录完成时间、Git 基线、工作树指纹、当前事实目标和 `READY_TO_COMMIT` / `COMMITTED` 状态。Finish 不自动 commit、merge、release 或 deploy；已有提交只能由人工或外部 Git 流程产生，再通过 `evo completion bind-commit` 绑定。

### Migration and Change Set / 迁移与 Change Set

旧仓库先运行 `evo migrate` 预览，再由人工决定是否 `evo migrate --apply`。迁移只创建 v2 机器证据和导入记录，不覆盖原有 `evidence.md`。需要同时协调前后端或多个 checkout 时，在根仓库 `.evo/change-sets/<id>.yml` 声明成员和契约哈希，用 `evo change-set check <id>` 聚合检查；它不会替子仓库提交或发布。

## 返回路径

- 新的模糊点返回 `GRILL` 或 `SPEC`。
- 实质执行变化返回 `PLAN` 并使批准失效。
- 验证失败在用户选择继续后返回 `IMPLEMENT`。
- 评审发现返回拥有该问题的阶段。
- 任何未解决停止条件都记录为 `BLOCKED`，附带证据和建议的人工动作。
