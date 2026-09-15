# EVOworkflow 1.0

> **让 AI 按软件工程方式参与长期真实项目，而不是靠一次聊天记住全部上下文。**

EVOworkflow 是一套 **Repository-centered、Skill-first** 的 AI 软件工程工作流。

它不接管你的编程工具，也不要求你学习一套新的运行时。EVO 把长期开发中最重要的方法沉淀成一组可组合 Skills，让 Codex、Claude Code、OpenCode 等 Coding Agent 能够围绕同一个 Repository 持续工作：理解现有项目、澄清需求、研究方案、形成规格、拆分计划、实现功能、处理需求变化、诊断 Bug、验证结果、独立 Review，并在新 Session 或新 Agent 中恢复上下文。

```text
Repository 负责记忆
Skills     负责方法
Project Tools / Tests / CI 负责证明
Git        负责历史
Human      负责决策
Harness    负责执行
```

当前版本：**1.0.0**

---

## 为什么需要 EVOworkflow

AI 很擅长快速写代码，但长期项目的问题通常不是“代码写不出来”，而是：

- 新 Session 开始后，又要重新解释项目；
- 换一个 Agent 后，上下文和历史决策丢失；
- AI 没先找现有实现方式，又创建了一套新的模式；
- 项目做到一半需求变化，代码、测试、文档和旧方案开始互相矛盾；
- AI 说“完成了”，但没有真正运行、测试或走真实用户路径；
- 重要设计只留在聊天里，几周后没人记得为什么这样做；
- 技术方案依赖模型旧知识，而不是当前官方资料；
- 项目越做越大，AI 生成速度越来越快，但软件熵也越来越高。

EVOworkflow 的目标是：

> **让 AI 从“会写代码”变成“能沿着项目现有知识、约束和工程方法持续开发”。**

---

## 核心思想

### Repository > Chat

长期知识必须进入 Repository，而不是只存在于某次对话。

### Evidence > Claim

“我已经完成”不算证明。编译、测试、真实 API、浏览器路径、运行结果和 CI 才是对应事实的证据。

### Existing Pattern > Reinvent

先找项目已有实现、已有依赖、已有约定，再决定是否新建机制。

### One Fact → One Owner

一个会变化的事实只保留一个权威 Owner。其他文档只引用或摘要，避免多份状态长期漂移。

### Change > Rewrite

需求变化时分析 Delta：哪些保留、哪些修改、哪些删除、哪些新增，而不是把历史重新写成“从未发生过”。

### Minimum Necessary Process

小修改走小流程，大变化才增加 Spec、Decision、Review 和更强 Evidence。不要把所有任务都变成重流程。

### Human Authority > Agent Autonomy

产品方向、重大架构、成本、隐私、安全、兼容性等重要取舍由人决定；Agent 负责调查、分析和执行。

---

# 快速开始

## 1. 安装 Skills

推荐把 EVO Skills 安装到**当前项目范围**，让工程方法跟 Repository 一起走。

```bash
npx skills@latest add liebaor/evoworkflow
```

在安装器中选择你正在使用的 Coding Agent，并优先选择 repository / project scope。

推荐安装完整的 12 个 Skills：

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
evo-recover
```

安装后，Skills 会作为普通项目文件被 Agent 发现和读取。不同项目可以拥有不同版本和不同定制，不需要全局共享一套工作流。

---

## 2. 第一次进入项目

最推荐的入口只有一个：

```text
ask-evo
```

例如直接告诉 Agent：

```text
使用 ask-evo 看一下这个项目，我现在应该先做什么。
```

`ask-evo` 会先读取 Repository，再推荐当前最合适的一个 Skill，而不是机械地让所有任务走同一条流程。

如果这是一个刚接手的 Brownfield 项目，通常会先进入：

```text
evo-init
```

---

## 3. 初始化现有项目

`evo-init` 的目标不是生成一堆固定目录，而是**理解项目已经如何工作**。

Agent 会优先读取和调查：

- `AGENTS.md`、README、CONTRIBUTING 等项目规则；
- 架构、API、业务和运维文档；
- Maven / Gradle / npm / pnpm / Poetry / Cargo 等真实依赖元数据；
- 代表性源码、目录边界和 Existing Pattern；
- 测试、构建、运行和 CI；
- Git 历史；
- 已有 Spec、RFC、ADR、Issue 和 Decision 习惯。

需要时直接使用宿主项目自己的工具，例如：

```bash
mvn help:effective-pom
mvn dependency:tree
npm test
pnpm test
pytest
cargo test
```

调查结果应区分：

```text
Confirmed  已确认事实
Inferred   有依据的推断
Unknown    当前尚未确认的事实
```

**Unknown 不自动等于 Blocker。** 只有它真正影响当前任务、风险或决策时，才需要停下来确认。

---

# 一条典型开发流程

EVOworkflow 没有强制状态机。下面只是一条常见路径：

```text
ask-evo
   ↓
evo-init / evo-recover
   ↓
evo-grill-with-docs
   ↓
evo-research          ← 需要最新外部知识时
   ↓
evo-spec              ← 较大或高风险变更
   ↓
evo-plan
   ↓
evo-implement
   ↓
evo-verify
   ↓
evo-review
```

不同任务使用不同深度。

### 小修改

```text
Inspect → Edit → Focused Check
```

例如：修改一个按钮文案、修正文档错字、调整局部样式。

### 普通功能

```text
Clarify → Plan → Implement → Verify → Review
```

例如：新增一个后台业务模块、一个普通 API、一个页面能力。

### 高风险变化

```text
Research → Spec / Decision → Plan → Implement → Strong Evidence → Independent Review → Human Acceptance
```

例如：权限、支付、隐私、数据迁移、公共 API、兼容性和重大架构变化。

---

# Repository 如何成为长期记忆

EVOworkflow 不要求所有项目使用同一种目录结构。

优先复用项目已有知识体系。如果仓库缺少长期知识机制，可以采用下面这个最小模型：

```text
PROJECT/
├── AGENTS.md
├── CONTEXT.md
├── docs/
│   ├── architecture/
│   ├── decisions/
│   ├── plans/
│   └── research/
├── src/
├── tests/
└── Git
```

不同 Artifact 负责不同问题：

| Artifact | 负责什么 |
|---|---|
| `AGENTS.md` | 工作规则、项目地图、常用命令、去哪里找知识 |
| `CONTEXT.md` | 领域词汇、稳定业务事实、团队共享语言 |
| Current docs | 系统当前是什么样 |
| Decision / ADR | 为什么做出某个长期选择 |
| Working Spec / Plan / Issue | 当前准备改变什么 |
| Source / Config / Schema | 系统实际行为和结构 |
| Tests / Runtime / CI | 哪些可观察事实已经得到证明 |
| Git | 历史上发生了什么 |

重要原则：

> **不要让一份文档同时承担“当前事实、历史、任务状态、设计理由和验证结果”。**

详见 [`docs/knowledge-model.md`](docs/knowledge-model.md)。

---

# 需求先问清楚，再开始写

使用：

```text
evo-grill-with-docs
```

它不仅负责“多问几个问题”，还会帮助 Agent 建立项目长期需要的共享语言。

它关注：

- 用户真正想得到什么结果；
- 不做什么；
- 业务术语是什么意思；
- 边界和异常情况；
- 哪些是当前事实；
- 哪些是需要人决定的产品/架构选择；
- 哪些 Decision 值得长期保存。

好的需求澄清不是为了生成更长的文档，而是为了减少后续返工。

---

# 查询最新方案

使用：

```text
evo-research
```

适合：

- 框架最新最佳实践；
- 官方 API / SDK；
- 新版本 breaking changes；
- 架构方案对比；
- 安全、兼容性或行业方案；
- 项目是否应该引入新的依赖或技术。

Research 应优先使用官方文档、标准、源代码仓库、论文等高可信 Primary Sources，并把有长期价值的结论和引用保存在 Repository 中。

这样新 Session 不需要重新研究同一个问题。

---

# 什么时候需要 Spec

使用：

```text
evo-spec
```

Spec 适合真正需要跨文件、跨模块、跨 Session 或需要讨论取舍的变化。

一个好的 Working Spec 应至少说明：

- Problem：真正要解决的问题；
- Outcome：希望最终出现什么行为；
- Non-goals：明确不做什么；
- Existing Pattern：项目已经有哪些相关机制；
- Alternatives：有哪些真实选项；
- Direction：当前建议；
- Acceptance：什么观察结果可以证明目标成立；
- Risks / Trade-offs：为了这个方向牺牲了什么；
- Evidence Strategy：准备怎样验证。

小改动不要为了“流程完整”强行建 Spec。

---

# 如何拆计划

使用：

```text
evo-plan
```

计划不是按“后端 / 前端 / 数据库”机械拆层，而是尽量拆成能够独立验证的 **bounded vertical slices**。

一个好的 Slice 应该让 fresh Agent 也能回答：

```text
我要改变什么？
已有模式在哪里？
边界是什么？
完成后如何证明？
```

避免一个 Slice 横跨几十个文件、多个独立决策和无法验证的“大实现”。

---

# 实现功能

使用：

```text
evo-implement
```

实施前先找 Existing Pattern，然后只做当前 bounded slice。

核心纪律：

1. 先读项目规则和当前 Plan / Spec；
2. 找相似 Controller / Service / Component / Test / Config；
3. 优先复用现有 abstraction；
4. 不顺手重构无关代码；
5. 边实现边运行最小反馈循环；
6. 新发现如果改变需求或方案，转 `evo-change`，不要悄悄偏离；
7. 完成后进入真实验证，而不是直接宣布 Done。

---

# 需求做到一半变了怎么办

使用：

```text
evo-change
```

EVO 不要求“需求一变就推倒重来”。

先重新对齐 Delta：

| 维度 | 处理方式 |
|---|---|
| 原目标 | keep / revise / withdraw / add |
| Acceptance | keep / revise / remove / add |
| Existing code | retain / revise / remove |
| Tests | retain / revise / remove |
| Docs | retain / revise / remove |
| Decision | still valid / superseded / new decision |

未完成的工作直接更新当前 Working Proposal；已经稳定交付、后来被反转的长期 Decision，则建立新的 replacement decision，并链接旧 Decision。

这就是：

> **Change > Rewrite**

---

# Bug 怎么处理

使用：

```text
evo-bug
```

核心闭环：

```text
Reproduce
↓
建立会失败的反馈循环
↓
Minimize
↓
Hypotheses / Instrument
↓
Root Cause
↓
Minimal Fix
↓
Regression Test
↓
Real Consumer Verification
```

避免：

```text
看到报错
→ 猜原因
→ 改一段代码
→ “应该好了”
```

无法访问生产环境、第三方系统或真实设备时，要明确说明未验证边界。

---

# 怎么判断“真的完成了”

使用：

```text
evo-verify
```

Skill 负责把每条 Acceptance 映射到真实 Failure Surface 和直接 Evidence。

例如：

| Acceptance | 直接 Evidence |
|---|---|
| Service 本地规则正确 | focused unit test |
| Controller 能通过真实依赖组合调用 | integration test |
| 页面用户路径可用 | browser / Playwright / real runtime |
| 持久化恢复正确 | replay / resume / integration evidence |
| 一个旧 API 已删除 | negative search + exports/routes/tests/docs 检查 |
| 外部服务契约正常 | real E2E；不可访问时明确 UNVERIFIED |

报告结果时严格区分：

```text
Passed: <真实执行过的命令>
Failed: <真实失败的命令>
Inspected: <静态检查路径>
Not run: <缺少环境或权限>
Inferred from: <支持较窄结论的证据>
```

> **测试通过只能证明测试覆盖到的事实，不等于整个业务绝对正确。**

---

# 为什么还需要 Review

使用：

```text
evo-review
```

Verify 主要回答：

> **做没做成？**

Review 主要回答：

> **这样做合理吗？**

Review 会重新对照用户需求、Spec、Repository 规则和 Diff，检查：

- 是否真的解决原问题；
- 是否重复造了一套已有机制；
- 是否偏离项目风格和架构；
- 是否扩大了范围；
- 是否漏掉真实 consumer path；
- 是否存在兼容性、安全或数据风险；
- Evidence 是否真的覆盖对应 Acceptance；
- Current docs 是否与实现一致。

重要变化最好使用 fresh context / fresh Agent 做 Review，降低实现者自我确认偏差。

---

# 新 Session 或换 Agent 怎么继续

使用：

```text
evo-recover
```

它从 Repository + Git 重建：

- 当前目标；
- 当前 Working Spec / Plan / Issue；
- 关键 Decisions；
- Git branch、status、diff 和 recent commits；
- 已完成工作；
- 剩余工作；
- 已验证事实；
- 未验证边界；
- 下一步最小动作。

EVO 不依赖聊天私有记忆作为项目权威。

> **换 Session、换模型、换 Agent，但项目知识仍然留在 Repository。**

---

# 12 个 Skills

| Skill | 作用 |
|---|---|
| `ask-evo` | 通用入口。读取真实 Repository，推荐现在最值得做的一个下一步 |
| `evo-init` | 理解 Brownfield 项目、Existing Pattern、知识 Owner、真实命令和关键未知项 |
| `evo-grill-with-docs` | 深入澄清需求，同时沉淀共享语言和 durable decisions |
| `evo-research` | 基于当前高可信资料研究技术方案，并把有长期价值的结论写入 Repository |
| `evo-spec` | 把较大变化写成范围清晰、可讨论、可验证的 Working Spec |
| `evo-plan` | 将工作拆成 fresh Agent 也能理解和验证的 bounded vertical slices |
| `evo-implement` | 沿着 Existing Pattern 实现当前 slice，并保持范围受控 |
| `evo-change` | 处理中途需求变化，重新对齐代码、测试、文档和 Decision |
| `evo-bug` | Reproduce → Root Cause → Minimal Fix → Regression |
| `evo-verify` | Acceptance → Failure Surface → Direct Evidence |
| `evo-review` | 独立复核需求、实现、架构、风险和 Evidence 是否一致 |
| `evo-recover` | 新 Session / 新 Agent 从 Repository + Git 恢复当前上下文 |

详细说明见 [`skills/README.zh-CN.md`](skills/README.zh-CN.md)。

---

# 推荐知识模型

EVOworkflow 借鉴并融合几类成熟实践：

- Repository 作为长期 System of Record；
- `AGENTS.md` 保持简短，作为项目地图和 standing rules；
- Working Proposal 与 Stable Decision 分离；
- Domain language / `CONTEXT.md` 帮助跨 Session 保持术语一致；
- Requirement Delta 显式化；
- Acceptance 与真实 Evidence 一一对应；
- 机械可判断的不变量交给项目 Test / Lint / CI；
- Git 保留 chronology，不重复维护另一套历史状态。

核心关系可以理解为：

```text
Human Intent
    ↓
Working Spec / Plan
    ↓
Implementation
    ↓
Tests / Runtime / CI
    ↓
Current Docs + Stable Decisions
    ↓
Git History
```

详见：

- [`docs/architecture.md`](docs/architecture.md)
- [`docs/knowledge-model.md`](docs/knowledge-model.md)
- [`docs/workflow.md`](docs/workflow.md)

---

# 一个 Brownfield 示例

假设你在 RuoYi 上增加“会议室管理”。

不推荐：

```text
用户：做一个会议室管理。
AI：直接开始创建 Controller、Service、Mapper、Vue 页面……
```

推荐：

```text
ask-evo
↓
evo-init
  找已有 CRUD 模块
  找权限写法
  找 AjaxResult / TableDataInfo
  找分页模式
  找 Vue 页面模式
  找测试和构建方式
↓
evo-grill-with-docs
  明确会议室、容量、状态、预订冲突等业务含义
↓
evo-plan
  按真实用户路径拆 Slice
↓
evo-implement
  沿已有 RuoYi 模式开发
↓
evo-verify
  Maven / 前端 / API / UI 真实验证
↓
evo-review
  检查是否重复机制、漏权限、漏 consumer path、范围漂移
```

项目本身已有的工程习惯始终优先于 EVO 的默认模板。

详见 [`examples/ruoyi-brownfield.md`](examples/ruoyi-brownfield.md)。

---

# EVOworkflow 不是什么

EVOworkflow 不是：

- 新的 Coding Agent；
- Agent Harness；
- IDE；
- Workflow Engine；
- Issue Tracker；
- CI 系统；
- 测试框架；
- 替代 Git 的状态管理器；
- 强制所有项目使用同一种目录结构的框架。

它是：

> **一套帮助 AI 在真实 Repository 中持续遵守软件工程纪律的可组合 Skills。**

---

# 适合什么场景

特别适合：

- 现有 Java / RuoYi / Spring Boot / Vue 项目的二次开发；
- 中长期项目；
- 需求会持续变化的项目；
- Brownfield 项目；
- 多 Session 开发；
- Codex / Claude Code / OpenCode 等不同 Agent 接力；
- 希望 AI 先理解现有项目，而不是每次重新发明方案；
- 希望重要决策、研究、验证和上下文长期留在 Repository。

对于一次性、低风险的小修改，可以只使用最轻的流程，不必强行建立完整 Spec 和 Decision 体系。

---

# 一句话记住 EVOworkflow

```text
Repository is memory.
Skills are method.
Tests are proof.
Git is history.
Human is authority.
Harness is execution.
```

中文：

> **仓库负责记忆，Skill 负责方法，测试负责证明，Git 负责历史，人负责决策，Harness 负责执行。**

这就是 EVOworkflow 1.0。
