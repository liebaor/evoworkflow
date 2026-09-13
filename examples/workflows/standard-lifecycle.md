# Standard Change 生命周期示例

这个示例展示一个普通变更如何经过人工控制的阶段。每一行状态都写入仓库后，才允许进入下一阶段；推荐命令只负责提示，不会替用户执行下一阶段。

## 阶段记录

| 阶段 | 仓库状态 | 人工动作 | 结果 |
|---|---|---|---|
| Grill / 需求澄清 | `GRILL/AWAITING_APPROVAL` | 检查问题、目标、范围和验收标准 | 等待批准 |
| Grill / 需求确认 | `GRILL/APPROVED` | 执行 `evo approve <change-id> change` | 允许规划 |
| Plan / 计划审阅 | `PLAN/AWAITING_APPROVAL` | 检查复用点、Slice、依赖和验证命令 | 等待批准 |
| Plan / 计划确认 | `PLAN/APPROVED` | 执行 `evo approve <change-id> plan` | 允许实现 |
| Implement / 实现 | `IMPLEMENT/APPROVED` | 只执行 `currentSlice` 指向的 Slice | 写入检查点 |
| Verify / 验证 | `VERIFY/AWAITING_APPROVAL` | 检查每个验收标准的实际证据 | 形成验证结论 |
| Review / 评审 | `REVIEW/AWAITING_APPROVAL` | 检查范围、复用、文档和遗留问题 | 等待最终接受 |
| Finish / 收敛 | `FINISH/APPROVED` | 人工确认后运行 `evo finish --apply` | 归档变更 |

## 重要限制

- `evo status` 只报告一个推荐动作，不会自动切换阶段。
- `evo goal run` 成功后只到 `READY_FOR_REVIEW`，不会归档 Change。
- 没有完整证据、评审接受或文档收敛时，`evo finish --apply` 必须拒绝移动文件。
