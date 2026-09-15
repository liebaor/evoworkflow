# evoworkflow

> 让 AI Coding 从“会写代码”，进一步变成“能够按项目规则持续开发、可验证、可恢复、可交接”的软件工程工作流。

![CI](https://github.com/liebaor/evoworkflow/actions/workflows/ci.yml/badge.svg)

`evoworkflow` 是一套 **Repository-centered AI Software Engineering Workflow**。

它不替代 Codex、Claude Code、OpenCode 等 Coding Agent，也不试图重新开发一个 Agent Runtime。它主要解决的是另一层问题：

> **当 AI 真正参与一个持续数周、数月的项目时，怎么保证它不丢上下文、不重复造轮子、不随意扩大范围，并且每次“完成”都有证据。**

一句话理解：

```text
人负责决策
AI 负责执行
Repository 负责记忆
Evidence 负责证明
```

---

## 为什么需要 EVOworkflow

AI 写一个页面、一个接口、一个脚本已经很快，但长期项目会出现另外一类问题：

- 换一个 Session 后，又要重新解释项目；
- 不同任务逐渐出现不同的命名、API、权限和异常处理方式；
- 项目已有能力没有复用，Agent 又重新实现一套；
- 需求开发一半发生变化，旧计划、测试和文档容易一起失效；
- Bug 修到“不报错”为止，但根因和回归测试没有留下；
- Agent 说“已经完成”，但没有真实 Build、Test、Runtime 或 CI 证据；
- Codex、Claude Code、OpenCode 切换以后，项目上下文容易断裂。

EVOworkflow 希望把这些问题从“靠一个更长的 Prompt 提醒”变成一套可以长期维护的工程机制。

---

## EVOworkflow 是什么，不是什么

### 它是什么

EVOworkflow 由两部分组成：

```text
EVOworkflow
│
├── EVO Skills
│   └── 告诉 Agent“应该怎么工作”
│
└── EVO CLI
    └── 负责可机械执行和检查的工程规则
```

### EVO Skills

Skill 是 Agent 的工作方法，例如：

- 开始前怎么理解 Repository；
- 怎么澄清需求；
- 怎么拆 Plan；
- 怎么处理 Requirement Change；
- 怎么修 Bug；
- 怎么验证结果；
- 什么情况下可以 Finish。

### EVO CLI

CLI 负责那些不应该只靠自然语言提醒的事情，例如：

- 初始化 `.evo/`；
- 查看状态；
- 检查 Approval / Freshness / Gate；
- 记录 Evidence；
- 恢复 Context；
- 检查是否满足 Finish；
- 创建受控 Git checkpoint；
- 安装、更新和诊断 EVO Skills。

可以把它们理解成：

```text
Skill = AI 的工作说明书
CLI   = 工程流程的执行器 / 检查器
```

### 它不是什么

EVOworkflow 不是：

- 一个“大 Prompt”；
- 一个新的大模型；
- Codex / Claude Code / OpenCode 的替代品；
- 无人值守自动决定需求、架构、合并、发布的系统；
- 多 Agent 在同一 working tree 并发写代码的调度器。

---

## 核心原则

EVOworkflow 当前重点遵循以下原则：

| 原则 | 含义 |
|---|---|
| `Repository > Chat` | 项目事实尽量保存在仓库，而不是依赖聊天记录。 |
| `Evidence > Claim` | Agent 说完成不算，真实证据才算。 |
| `Reuse > Reinvent` | 先找已有能力，再决定是否新建。 |
| `Existing Pattern > New Abstraction` | Brownfield 项目优先延续现有工程语言。 |
| `Change > Rewrite` | 需求变化优先识别变化范围，而不是推倒重来。 |
| `Gate > Reminder` | 能机械判断的规则，尽量交给 CLI Gate。 |
| `Human Authority > Agent Autonomy` | 需求、关键 Decision、风险接受和最终验收属于人。 |
| `Minimum Necessary Process` | 小任务不套重流程，大任务才增加 Spec / Slice / Review。 |
| `One Fact -> One Owner` | 同一个工程事实只保留一个权威来源。 |
| `Worker Cannot Accept Its Own Work` | 实现者不能只靠自己的判断完成最终验收。 |

## Quick Start / 普通用户安装

EVO CLI 从 GitHub Release 分发。普通用户不需要 clone 或构建 evoworkflow 源码。

前置条件：Node.js 22 或更高版本，以及 npm。

```sh
# 1. 安装 EVO CLI
npm install -g https://github.com/liebaor/evoworkflow/releases/latest/download/evoworkflow-cli.tgz

# 2. 安装并检查 EVO Skills
evo skills install --apply
evo skills doctor

# 3. 初始化业务项目
cd /path/to/my-project
evo init --root .
evo init --root . --apply

# 4. 启动你的 Coding Agent，然后使用 ask-evo
codex
```

检查安装结果：

```sh
evo --version
evo --help
```

更新、回滚、卸载和 checksum 校验请参阅[安装指南](docs/installation.md)；Release 运维约定请参阅[GitHub Release 分发说明](docs/distribution/github-release.md)。

---

## 项目知识放在哪里

EVOworkflow 不把长期项目知识放在 Agent 的私有记忆里，而是放回 Repository：

```text
my-project/
├── AGENTS.md
│   └── 项目长期规则、入口和权威地图
│
├── .evo/
│   ├── project.md
│   ├── state.yml
│   ├── work/
│   ├── decisions/
│   ├── goals/
│   └── evidence/
│
├── src/
└── tests/
```

核心分工：

```text
AGENTS.md        项目长期 Standing Rules
.evo/project.md  项目地图与当前事实
.evo/work        Change / Plan / 当前工作
.evo/decisions   重要工程 Decision
Evidence         验收证据
Git              持久工程历史
```

新 Session 或新 Agent 不应该依赖旧聊天恢复项目，而应该从这些 Repository Facts 重新恢复。

---

## 标准工作流程

一个典型任务可以是：

```text
Understand
  ↓
Grill / 澄清需求
  ↓
Spec（仅复杂 Change）
  ↓
Plan
  ↓
Human Approval
  ↓
Implement
  ↓
Verify
  ↓
Review
  ↓
Human Acceptance
  ↓
Finish
  ↓
Commit
```

其中：

- `Verify` 关注：**功能有没有真实证据证明做成了？**
- `Review` 关注：**实现方式、范围、复用、文档和风险是否合理？**
- `Finish` 关注：**这个 Change 是否真的已经收敛完成？**
- `Commit` 关注：**如何把已经完成的工程事实记录进 Git？**

简单任务可以缩短流程，EVO 不要求每个小改动都执行完整重流程。

---

# 快速开始

## 当前状态先说明

当前版本已经具备：

- EVO CLI 源码与完整命令体系；
- 20 个 EVO Skills；
- `evo skills install / update / doctor`；
- Codex-first Skill 分发；
- Claude Code thin adapter；
- OpenCode shared-source compatibility；
- 跨 Session / 跨 Agent Repository continuity；
- package smoke 与真实 Codex native behavioral eval。
- GitHub Release `.tgz` CLI distribution and global-install smoke。

普通用户应先按上面的 Quick Start 从 GitHub Release 安装 CLI；`npx skills@latest add liebaor/evoworkflow` 仍然只安装 Skills，不安装 CLI。CLI 缺失时，Skill 必须报告 `EVO_CLI_REQUIRED` 并给出官方 Release 安装命令，不得自动 clone/build 源码。

---

## 方式 A：完整使用 EVOworkflow（当前推荐给测试/开发用户）

### 1. 环境要求

- Node.js `>= 22`
- pnpm `>= 11`
- Git

### 2. 获取 EVOworkflow

```sh
git clone https://github.com/liebaor/evoworkflow.git
cd evoworkflow
pnpm install
pnpm run build
```

先确认 CLI 可以运行：

```sh
pnpm evo --help
```

### 3. 安装 EVO Skills

先预览：

```sh
pnpm evo skills install
```

确认后执行：

```sh
pnpm evo skills install --apply
pnpm evo skills doctor
```

默认模型是：

```text
~/.agents/skills
      │
      ├── Codex：直接使用
      ├── OpenCode：共享 canonical source
      └── Claude Code：symlink / junction / safe copy adapter
```

### 4. 初始化你的业务项目

假设业务项目路径为：

```text
/path/to/my-project
```

先预览：

```sh
pnpm evo init --root /path/to/my-project
```

确认初始化内容后：

```sh
pnpm evo init --root /path/to/my-project --apply
```

`evo init` 不会静默覆盖已有项目文件。

### 5. 查看项目状态

```sh
pnpm evo status --root /path/to/my-project
pnpm evo doctor --root /path/to/my-project
pnpm evo recover --root /path/to/my-project
```

### 6. 启动 Codex

进入业务项目：

```sh
cd /path/to/my-project
codex
```

然后直接告诉 Agent：

```text
Use ask-evo and tell me what I should do next.
```

或者直接描述你的需求：

```text
我要在现有系统中增加供应商管理，请使用 EVOworkflow 帮我推进。
```

`ask-evo` 会读取 Repository 状态并推荐一个下一步 Skill，而不是自己吞并整个开发流程。

---

## 方式 B：只安装 EVO Skills

如果你只想体验 Skill，不需要 EVO CLI，可以使用：

```sh
npx skills@latest add liebaor/evoworkflow
```

然后在 Codex / Claude Code / OpenCode 中使用相应 Skill。

再次强调：

```text
npx skills add
=
安装 Skills

它不会安装 evo CLI
```

如果某个 Skill 需要 `evo` CLI，而本机没有 CLI，正确行为应该是停止并提示安装方式，而不是自动 clone EVOworkflow 源码并在业务项目环境中构建 EVO。

---

# 一个实际例子

假设你有一个 RuoYi 项目，需要新增“供应商管理”。

你不需要先记住 20 个 Skill，只需要：

```text
ask-evo
```

可能的工作链路是：

```text
ask-evo
  ↓
evo-grill-with-docs
问清字段、权限、页面、范围和验收条件
  ↓
evo-plan
找到已有 CRUD / 权限 / 分页实现并拆成 Slice
  ↓
人工批准
  ↓
evo-implement
只实现当前一个批准的 Slice
  ↓
evo-verify
运行 Build / Test / API 等真实验证
  ↓
evo-review
检查是否跑偏、重复造轮子、超出范围
  ↓
人工验收
  ↓
evo-finish
  ↓
evo-commit
```

如果开发一半需求变了：

```text
evo-change
```

如果出现 Bug：

```text
evo-bug
```

如果换了 Session 或 Agent：

```text
evo-recover
```

---

# CLI 能做什么

常用 CLI 可以按职责理解，不需要一次记住所有命令。

## 初始化与状态

```sh
evo init
evo status
evo check
evo doctor
evo context
evo recover
```

## 约束与审批

```sh
evo constraints
evo gate
evo admission
evo approve
```

## Evidence

```sh
evo evidence run
evo evidence record
evo evidence inspect
evo evidence reconcile
```

## Goal

```sh
evo goal create
evo goal approve
evo goal run
evo goal resume
evo goal inspect
evo goal cancel
```

## 完成与 Git Delivery

```sh
evo finish
evo commit
evo completion inspect
evo completion bind-commit
```

## Skill / Agent compatibility

```sh
evo skills inspect
evo skills install
evo skills update
evo skills doctor

evo agents inspect
evo agents setup
evo agents doctor
```

EVO 的写操作通常遵循：

```text
Preview by default
        ↓
Human checks
        ↓
--apply
```

---

# Codex / Claude Code / OpenCode

EVOworkflow 当前正式采用：

> **Codex-first, harness-portable**

也就是说：

- **Codex**：默认、第一优先级执行 Harness；
- **Claude Code**：兼容，通过 thin repository / Skill adapter 使用同一工程协议；
- **OpenCode**：兼容，共享同一 canonical Skill source；
- **Repository Protocol**：不绑定某一个 Agent。

三个 Agent 真正共享的是：

```text
AGENTS.md
+
.evo/
+
Git
+
Evidence
```

而不是聊天记录。

### 并发边界

一个 checkout 同时只允许一个 executing writer。

如果需要两个 Agent 并行开发：

```text
使用不同 Git branch / worktree
```

不要让两个 Agent 同时修改同一个 working tree。

---

# 全部 EVO Skills

当前项目共有 20 个稳定 Skill。

## 导航与角色辅助

| Skill | 用途 |
|---|---|
| `ask-evo` | 统一入口。读取 Repository 和 EVO 状态，推荐一个最合适的下一步 Skill。 |
| `ask-evo-architect` | 根据真实仓库证据分析架构、边界和已有机制，不套通用模板。 |
| `ask-evo-pm` | 把宽泛产品想法整理成目标、范围、风险和可审阅交付建议。 |

## 初始化与方案发现

| Skill | 用途 |
|---|---|
| `evo-init` | 调查现有仓库，生成安全初始化报告并建立 EVO 项目基础。 |
| `evo-solution-discovery` | 新项目或新能力自建前，先比较框架、成熟方案、Library 和 OSS。 |

## 需求与计划

| Skill | 用途 |
|---|---|
| `evo-grill-with-docs` | 澄清需求、范围、验收条件和需要人工决定的问题。 |
| `evo-to-spec` | 为较大的 Change 编写行为 Specification。 |
| `evo-plan` | 找复用点、分析影响范围、拆 Vertical Slice、设计验证方式。 |

## 开发执行

| Skill | 用途 |
|---|---|
| `evo-implement` | 只实现当前已经批准的一个 Slice，避免 Scope Creep。 |
| `evo-goal` | 把已批准的执行工作交给有边界、可暂停、可恢复的 Goal。 |
| `evo-engineering` | 根据当前 Change 类型加载相关工程原则和启发。 |

## 变化与问题处理

| Skill | 用途 |
|---|---|
| `evo-change` | 处理 Requirement Delta，记录 OLD / NEW / RETAIN / MODIFY / REMOVE / ADD，并判断旧批准是否失效。 |
| `evo-bug` | 管理 Bug 的复现、失败证据、Root Cause、最小修复和 Regression。 |

## 验证与评审

| Skill | 用途 |
|---|---|
| `evo-verify` | 把 Acceptance 映射成真实 `PASS` / `FAIL` / `UNVERIFIED` Evidence。重点回答“功能有没有被证据证明做成”。 |
| `evo-review` | 检查范围、复用、实现方式、文档和 Evidence 质量。重点回答“实现是否合理、有没有跑偏”。 |

## 完成与交付

| Skill | 用途 |
|---|---|
| `evo-finish` | 在 Evidence、Review、Human Acceptance 和文档收敛后，判断 Change 是否真的完成并归档。 |
| `evo-commit` | 为已经形成的工程事实创建结构化 Git checkpoint；Commit 记录状态，不创造完成状态。 |

## 状态、恢复与健康检查

| Skill | 用途 |
|---|---|
| `evo-status` | 报告当前 Phase、Change、Slice、Blocker 和一个下一步建议。 |
| `evo-recover` | 让新的 Session / Agent 只依赖 Repository 恢复工作上下文。 |
| `evo-doctor` | 只读检查陈旧知识、锁、Evidence、未知入口和协议健康度。 |

完整中文 Skill 索引见：[`skills/README.zh-CN.md`](skills/README.zh-CN.md)。

---

# Verify 和 Review 为什么分开

这是比较容易混淆的一点。

```text
evo-verify
=
证明“有没有做成”

例如：
Build 是否通过？
接口是否真的可用？
Acceptance 是否有 Evidence？
```

而：

```text
evo-review
=
检查“做得是否合理”

例如：
有没有重复造轮子？
有没有超出范围？
有没有破坏项目已有写法？
Evidence 是否足够可信？
```

所以：

> **Verify 是验结果，Review 是验实现与工程质量。**

二者互补，不冲突。

---

# 项目当前能力边界

EVOworkflow 当前已经覆盖：

- Brownfield Repository grounding；
- Existing Pattern / Reference Implementation 发现；
- Requirement Delta；
- Bug / Regression；
- Working Context；
- Fresh Session Recovery；
- Resolved Constraints；
- Approval fingerprint；
- Protocol / Project Gate；
- Evidence v2；
- Candidate Admission；
- bounded Goal；
- Finish / Git Delivery 分离；
- Codex-first Skill installation；
- Claude / OpenCode compatibility；
- deterministic eval；
- packed-artifact smoke；
- native Codex behavioral proof。

当前明确不包含：

- 自动产品或关键架构决策；
- 自动替用户接受风险；
- 自动 Finish / Merge / Release / Deploy；
- 同一 checkout 多 Agent 并发写；
- 云控制面板；
- 中央数据库；
- 后台自动更新 daemon；
- 通用 Agent Runtime / Subagent scheduler。

---

# 项目开发

如果你开发的是 EVOworkflow 本身，而不是使用 EVO 管理其他项目：

```sh
pnpm install
pnpm run generate:schemas
pnpm run check
```

主要检查包括：

- TypeScript typecheck；
- unit / deterministic tests；
- build；
- CLI smoke；
- Skill validation；
- Schema consistency；
- Phase 2 / Phase 3 / hardening regression；
- cross-agent eval；
- package smoke。

真实 Agent behavioral eval 与普通 deterministic CI 分开保存，避免把没有真实执行的结果写成 PASS。

---

# 当前版本方向

## v0.4.1

已经完成：

- Codex-first canonical Skill installation；
- `evo skills inspect/install/update/doctor`；
- Claude shared-link adapter；
- Codex native metadata；
- Skill drift / conflict protection；
- real Codex `ask-evo -> target Skill -> bounded work` behavioral proof。

## v0.4.2

已完成：

> **GitHub Release CLI Distribution & Bootstrap**

目标是让普通用户最终不再需要：

```text
git clone evoworkflow
pnpm install
pnpm build
```

而是直接安装 GitHub Release 中已经构建好的 CLI，然后：

```text
安装 EVO CLI
  ↓
evo skills install
  ↓
evo init
  ↓
启动 Codex
  ↓
ask-evo
```

普通用户安装、更新、回滚、卸载和 checksum 校验见[安装指南](docs/installation.md)；发布流程和真实 exact/latest URL 验证见[GitHub Release 分发说明](docs/distribution/github-release.md)。

---

# 设计目标

EVOworkflow 不追求让 AI “完全自由地自主开发”。

它更希望达到：

```text
模型可以变
Session 可以变
Agent 可以变

但：
项目规则不变
工程状态不断
验收证据可复查
关键决策仍由人掌握
```

最终目标：

> **换模型、换 Session、换 Agent，但不换工程体系。**
