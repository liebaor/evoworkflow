# Goal 协议

EVO Goal 是对已批准执行工作的明确委托，不是第二套产品规划系统。

## 状态

```text
DRAFT -> APPROVED -> RUNNING -> READY_FOR_REVIEW
                     |   |
                     |   -> BLOCKED -> APPROVED/RUNNING（人工恢复后）
                     -> CANCELLED（人工取消）
```

没有 `DONE` 状态。`evo-finish` 在验证、评审和人工接受之后完成所属 Change。

## 批准

`evo goal approve` 验证每个 Slice 都有：

- 一个有边界的目标；
- 验收标准；
- 确定性的验证命令；
- 明确的依赖；
- 允许使用的 Agent Adapter；
- 有上限的重试次数和停止条件。

每个 Goal Slice id 还必须出现在已批准的活动 Plan 中。Goal 可以委托 Plan 的一部分 Slice，但不能在 Plan 之外引入新的 Slice 目标。

批准会保存执行意图和选定 Adapter 配置的指纹。任何实质编辑都会使批准失效。

## 顺序执行

Runner 一次只执行一个满足依赖的 Slice。每次调用前重建 fresh Working Context、Resolved Constraints 并执行 preflight；只有 Agent 返回结构化完成结果且每个已批准验证命令都成功退出时，Slice 才通过执行验证。之后记录 post-execution project gate 信号，但启发式项目信号默认不升级为硬失败。结果、变更路径、验证输出摘要、尝试次数、时间戳、指纹、门禁和阻塞原因会在每个 Slice 后持久化。`state.yml` 镜像 Goal Slice 状态和当前 Slice，因此即使执行在 Agent 调用之间中断，新会话也能恢复；Goal YAML 仍是主要权威。

Slice 阻塞时，依赖它的 Slice 保持 pending；独立 Slice 可以继续。约束冲突、硬门禁失败、freshness 失效或重复失败达到配置上限后停止。成功的 Goal 状态是 `READY_FOR_REVIEW`，不是 `DONE` 或 `ACCEPTED`。

## 强制停止条件

- 需求模糊或验收变化；
- 架构偏离或破坏性 API 变化；
- 安全或授权 Decision；
- 破坏性数据操作；
- 意外依赖或范围扩大；
- 实现或验证重复失败；
- stale approval、未知/冲突约束或硬 Gate 失败；
- failure budget 耗尽。

Runner 永远不会改需求、批准 Decision、扩大范围、commit、merge、deploy 或完成 Change。
