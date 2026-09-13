# 架构

## 系统上下文

EVOworkflow v0.2 没有服务器和数据库。它把 Markdown Skill、一个本地确定性 CLI 和每个受管理 Git 仓库中的工作流状态组合起来。

```text
人工
  -> 调用一个 Skill 或 CLI 命令
  -> 审阅结果并明确批准

Skill
  -> 调查、建议、规划、实现、验证、评审或完成一个阶段

TypeScript CLI
  -> 发现仓库
  -> 验证 YAML 和仓库不变量
  -> 原子化保存状态
  -> 顺序运行已批准的 Goal

受管理仓库
  -> 保存 .evo 状态、当前项目知识、Decision、工作记录和证据
```

## 依赖方向

`src/core` 负责 Schema、批准指纹、导航和 Goal 状态转换。`src/repository` 负责文件系统、仓库发现、初始化、模板和持久化 Goal 操作。`src/agents` 实现 Agent Adapter 约定，但不拥有工作流状态。`src/validation` 读取 core 和 repository 数据，报告协议与知识问题。`src/commands` 是薄的 oclif 展示层。

核心逻辑不依赖 oclif。测试可以使用确定性 Adapter 和内存持久化来验证状态转换。

## 权威来源与状态

`src/core/schemas.ts` 中的 Zod Schema 是机器数据权威；`schemas/*.schema.json` 是自动生成的投影。`templates/` 是安装权威，CLI 运行时读取它，不在源代码中复制模板文本。

YAML 写入先写临时文件再 rename，避免中断留下半个状态文件。初始化使用排他创建并保留所有已有路径。可选的工作、Decision、Goal 和 Postmortem 目录只在使用时创建。Standard 和 Large 的 Plan 拥有 Slice 定义；`state.yml` 只保存 Slice id、状态、阻塞原因和当前 Slice。Goal 执行期间，State 是经过检查的 Goal YAML 投影。

## Agent 执行

`AgentAdapter` 每次接收一个已批准 Slice。内置进程 Adapter 直接使用参数数组启动 Codex、Claude Code 或 OpenCode，不经过 shell。Agent 自报不能单独产生 PASS；Goal Runner 随后执行批准的验证命令并保存退出结果。

Change、Specification 和 Plan 的批准分别绑定规范化 frontmatter 与正文的 SHA-256 指纹。Goal 批准另外绑定：

- Goal 目标、验收、依赖、验证和停止条件；
- 选定 Adapter 的命令与参数；
- 活动 `change.md`、可选 `spec.md` 和 `plan.md` 内容。

批准命令会把机器状态记录为 `APPROVED`，但不会改变阶段。Goal 批准还会拒绝不在已批准 Plan 中的 Slice id，防止只通过 Goal YAML 添加计划外工作。

同一个 Goal 不能并发执行，因为它有排他锁。Goal 可以结束为 `BLOCKED`、`CANCELLED` 或 `READY_FOR_REVIEW`；没有任何 Goal 状态代表 Change 已被接受完成。

## Working Context 与一致性

`buildWorkingContext` 根据当前 Change、项目地图、活动工作、Decision、能力、参考实现、测试和 Git 快照返回路径、优先级与选择理由。它默认只读，不复制源代码或文档正文；明确使用 `evo context --write` 时，才把同一份路径化结果写入活动 Change 的 `context.md`。

`analyzeRepositoryConsistency` 将当前实现与项目已有的响应、权限、命名和实际区域进行比较，输出候选漂移、重复机制和实际影响范围扩大的警告。它是 Review 的证据输入，不拥有架构 Decision，也不会自动重写实现。

`classifyChange` 依据请求中的影响信号建议 Small、Standard 或 Large；分类结果只用于选择流程强度，人工仍可在 Change 中确认或调整。Requirement Delta、Bug 调查和 `evo recover` 都通过仓库文件与确定性解析保留可恢复信息。

## 信任边界

仓库 YAML、Markdown frontmatter、Adapter 输出、子进程退出结果、文件路径和外部固定归档都跨越运行时边界，因此必须验证。批准的验证命令使用可执行文件加参数数组，绝不使用 shell 命令字符串。捕获输出有大小上限，常见的密钥赋值会在保存前脱敏。RuoYi 与跨框架评估只读取临时副本，不把静态扫描结果写成真实运行时结论。

人工仍负责批准可执行命令和 Adapter 权限。默认 Adapter 配置不使用绕过权限的参数。
