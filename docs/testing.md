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

自动化测试不得调用真实 coding model、外部系统、部署或生产写入。此类证据必须单独标注。

## 命令

```sh
pnpm run typecheck
pnpm run test
pnpm run build
pnpm run validate:skills
pnpm run check
```

`pnpm run check` 是本地聚合检查。CI 在最低支持 Node 主版本和开发 Node 主版本上运行它。

## 证据规则

只报告实际执行过的命令。一个聚焦测试通过，只支持它覆盖的行为，不能自动代表整个 MVP。由于源码加载和编译后的 oclif 发现路径不同，CLI 命令发现必须包含构建后冒烟测试。
