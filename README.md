# EVOworkflow 1.0

> **让 AI 按软件工程方式参与长期真实项目，而不是靠一次聊天记住全部上下文。**

EVOworkflow 是一套 **Repository-centered、Skill-first** 的 AI 软件工程工作流。

它把长期 AI 开发中最重要的方法沉淀成一组可组合 Skills，让 Codex、Claude Code、OpenCode 等 Coding Agent 能围绕同一个 Repository 持续工作：理解已有项目、问清需求、研究最新方案、形成规格、拆分工作、实现、处理需求变化、诊断 Bug、验证结果、独立 Review，并把最终事实收敛回仓库。

```text
Repository   负责记忆
Skills       负责方法
Project Tools / Tests / CI 负责证明
Git          负责历史
Human        负责决策
Harness      负责执行
```

当前版本：**1.0.0**

## EVO 解决什么问题

AI 写代码很快，但长期项目真正容易失控的是：

- 新 Session 或换 Agent 后上下文断掉；
- AI 没先找 Existing Pattern，又造一套新机制；
- 需求做到一半变化，旧代码、测试和文档开始互相矛盾；
- 重要决定只存在于聊天里；
- 模型拿旧知识回答最新 API / 框架问题；
- “测试通过”被错误理解成“业务一定正确”；
- 功能做完后，当前文档和长期知识没有跟着收敛。

EVO 的目标不是让 AI 写更多代码，而是：

> **让不同 Session、不同 Agent 都能从 Repository 恢复事实，并沿着同一套工程方法继续工作。**

## 核心原则

- **Repository > Chat** — 长期知识进入仓库。
- **Evidence > Claim** — “做完了”必须匹配真实证据。
- **Existing Pattern > Reinvent** — 先找已有机制，再考虑新建。
- **One Fact → One Owner** — 可变化事实只有一个权威 Owner。
- **Change > Rewrite** — 需求变化分析 Delta，不伪造历史。
- **Human Authority > Agent Autonomy** — 重大产品/风险取舍由人决定。
- **Minimum Necessary Process** — 小任务走小流程，高风险任务才增加治理深度。

## 安装

推荐安装到当前 Repository / Project scope：

```bash
npx skills@latest add liebaor/evoworkflow
```

选择你的 Coding Agent，并优先选择项目级安装。

推荐安装完整的 13 个 Skills：

```text
ask-evo
evo-init
evo-grill-with-docs
evo-research
evo-spec
evo-plan
evo-implement
evo-change
evo-bug
evo-verify
evo-review
evo-finish
evo-recover
```

## 从哪里开始

最推荐入口：

```text
使用 ask-evo 看一下这个项目，我现在下一步应该做什么。
```

`ask-evo` 是只读 Router：它读取 Repository，只推荐**一个**最合适的下一步 Skill，不直接替你执行后续阶段。

## 常见工作流

```text
ask-evo
   ↓
evo-init / evo-recover
   ↓
evo-grill-with-docs
   ↓
evo-research          ← 需要当前外部事实时
   ↓
evo-spec              ← 较大/高风险变化
   ↓
evo-plan
   ↓
evo-implement
   ↓
evo-verify
   ↓
evo-review
   ↓
evo-finish
```

需求中途变化走 `evo-change`；观察到 Bug / 回归 / flake / 性能异常走 `evo-bug`。

这不是强制流水线。一个按钮文字修改可能只需要：

```text
Inspect → Edit → Focused Check
```

而权限、支付、隐私、数据迁移、公共 API、兼容性和重大架构变化通常需要更明确的 Spec、Human Decision 和真实环境 Evidence。

## 13 个 Skills

| Skill | 一句话说明 |
|---|---|
| `ask-evo` | 读取真实仓库，告诉你当前最应该做哪一步；只读 Router |
| `evo-init` | 第一次理解项目：规则、知识 Owner、构建/测试、Existing Pattern |
| `evo-grill-with-docs` | 用决策树和分轮问题问清材料性选择，同时沉淀长期领域知识 |
| `evo-research` | 从当前 Primary Sources 研究 API、版本、标准、兼容性和方案 |
| `evo-spec` | 将已经讨论清楚的非平凡变化综合成可验证 Working Proposal |
| `evo-plan` | 拆成 fresh Agent 也能独立执行和验证的 bounded vertical slices |
| `evo-implement` | 按仓库现有模式实现一个明确工作单元，并在材料性变化时停止升级 |
| `evo-change` | 处理已接受需求中途变化，只使真正受影响的工作失效 |
| `evo-bug` | 先建立失败反馈循环，再 Root Cause → Minimal Fix → Regression |
| `evo-verify` | 对 Acceptance 给出真实 `PASS / FAIL / UNVERIFIED` Evidence |
| `evo-review` | 独立按 Intent / Engineering / Evidence 三轴复核 |
| `evo-finish` | Verify + Review 后收敛 Current Docs、Decision 和工作 Artifact |
| `evo-recover` | 新 Session / 新 Agent 从 Repository + Git 恢复当前工作 |

## 需求澄清：事实和决定要分开

`evo-grill-with-docs` 不只是“多问问题”。它采用一个简单规则：

```text
事实 → Agent 自己查
决定 → 问人
有依赖的问题 → 后问
当前可决定的问题 → 当前一轮问
```

每个材料性问题都应尽量给出推荐答案和理由。这样用户负责真正需要授权的决定，而不是被迫回答 Maven、源码结构、现有实现等 Agent 自己能查到的问题。

## Repository 如何成为长期记忆

EVO 优先复用项目已有知识体系。常见职责包括：

| 责任 | 常见 Owner |
|---|---|
| 工作规则 / 导航 | `AGENTS.md` 或现有 instructions |
| 领域词汇 / 稳定业务事实 | `CONTEXT.md`、glossary、domain docs |
| 系统现在是什么样 | Current architecture/API/package docs + source |
| 为什么做出长期选择 | ADR / decision record |
| 当前准备改变什么 | Issue / Spec / RFC / proposal / plan |
| 可观察行为是否成立 | Tests / Runtime / CI |
| 历史发生过什么 | Git / PR / completed issues |

文件名不是重点，**责任归属**才是重点。

详见 [`docs/knowledge-model.md`](docs/knowledge-model.md)。

## 验证和 Review 为什么分开

`evo-verify` 回答：

> **要求的行为有没有被直接证据证明？**

每条 Acceptance 使用：

```text
PASS
FAIL
UNVERIFIED
```

`evo-review` 回答：

> **即使功能证据通过，这个实现整体是否合理？**

它独立检查三个维度：

```text
Intent       做的是不是用户真正要的
Engineering  做法是否符合这个仓库
Evidence     证明是否足以支撑完成声明
```

所以测试 PASS 仍然可能因为重复机制、Spec mismatch、兼容性风险或未接入真实 consumer path 而 Review 不通过。

## 为什么需要 evo-finish

实现、验证、Review 之后，仓库还需要完成最后一步：

```text
实际实现
+ 当前文档
+ 稳定 Decision
+ Issue / Plan / Working Proposal 生命周期
```

重新一致。

`evo-finish` 只做这种 **Current Truth Convergence**。它不会顺手增加新功能，也不会默认替用户 commit / tag / release / push。

## 新 Session 怎么接力

使用 `evo-recover`。

它从当前 Issue/Spec/Plan、Decision、Git branch/status/diff、测试/CI 结果和正在变化的源码重建一个可信 Handoff，然后推荐一个下一步 Skill。

如果是第一次认识这个 Repository，用 `evo-init`；如果项目早就认识，只是 Session 换了，用 `evo-recover`。

## 项目结构

EVO 自身主要由：

```text
skills/       13 个工程 Skills
docs/         架构、知识模型、工作流、Skill Contract 与 Evals
examples/     使用示例
```

组成。

进一步阅读：

- [`docs/architecture.md`](docs/architecture.md)
- [`docs/knowledge-model.md`](docs/knowledge-model.md)
- [`docs/workflow.md`](docs/workflow.md)
- [`docs/skill-contract.md`](docs/skill-contract.md)
- [`docs/skill-evals.md`](docs/skill-evals.md)

---

> **AI 负责推理和执行，Repository 负责记忆，工具负责证明，人负责最终决定。**
