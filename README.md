# EVOworkflow

> **让 AI 按软件工程方式长期开发，而不是靠一次聊天记住整个项目。**

EVOworkflow 是一套 **Skill-first、Repository-native** 的 AI 软件工程工作流。

它的目标不是给 AI 再套一层复杂运行时，而是把长期开发中最重要的工程习惯变成可复用的 Skills：理解已有项目、澄清需求、查最新方案、形成规格、拆小步、实现、处理需求变化、诊断 Bug、验证结果、独立 Review，以及在新 Session / 新 Agent 中恢复上下文。

v1 开始，EVO **不再需要任何 EVO CLI**。

```text
Repository 负责记忆
Skills     负责方法
Project Tools / Tests / CI 负责机械证明
Git        负责历史
Human      负责决策
Harness    负责执行
```

## 为什么重构成 Skill-first

EVO 0.4.x 曾经实现过一个 TypeScript/oclif CLI，用来管理 Scanner、State、Goal、Constraint、Gate、Evidence 和安装发布。它提高了确定性，但真实 Brownfield 项目暴露了一个根本问题：

```text
项目本身是合法的
↓
扫描器理解不了某种工程习惯
↓
UNKNOWN
↓
被提升成 HARD BLOCK
↓
AI 反而不能继续工作
```

例如 Spring Boot BOM、传递依赖、非标准 CI、已有但命名不同的架构文档，都可能被简单扫描器误判。

所以 v1 重新划分责任：

- **语义理解**交给大模型和 Skill；
- **机械事实**交给项目自己的测试、构建、Lint、类型检查、CI 和真实运行路径；
- **重要取舍**交给人；
- EVO 不再重新实现 Maven、npm、Git、CI 或 Agent Harness。

详细原因见 [`docs/decisions/0001-skill-first-core.md`](docs/decisions/0001-skill-first-core.md)。

---

# 1. EVO 解决什么问题

AI 写代码很快，但长期项目真正容易失控的是：

- 新 Session 又要重新解释项目；
- 换一个 Agent 后上下文断掉；
- AI 不知道现有项目已经有一套实现方式，又造一套；
- 项目做到一半需求变了，旧代码、测试、文档开始互相矛盾；
- AI 说“完成了”，但没有真实运行、测试或用户路径证据；
- 临时聊天里的重要决定几周后没人记得为什么；
- 查技术方案时使用了模型旧知识，而不是当前官方资料。

EVO 的核心不是“让 AI 写更多代码”，而是：

> **让不同 Session、不同 Agent 都能从 Repository 恢复当前事实，并沿着同一套工程方法继续工作。**

---

# 2. 安装

推荐把 Skills 安装到**项目范围**，让工程方法跟仓库走，而不是全局污染所有项目。

最简单的方式：

```bash
npx skills@latest add liebaor/evoworkflow
```

在安装器里选择当前项目 / repository scope，并选择需要的 EVO Skills。建议至少安装：

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

你也可以手动把对应 Skill 目录复制到宿主支持的项目级目录，例如 Codex 常用：

```text
<project>/.agents/skills/<skill-name>/SKILL.md
```

Claude Code 等宿主按各自的 repository-local Skill 目录放置即可。

**不需要：**

```text
npm install -g @evoworkflow/cli

evo init
evo doctor
evo gate
evo goal
```

v1 没有 EVO CLI。

---

# 3. 第一次怎么用

进入你的业务项目后，最推荐的入口只有一个：

```text
ask-evo
```

你可以直接说：

```text
使用 ask-evo 看一下这个项目，我现在下一步应该做什么。
```

`ask-evo` 会读取 Repository，而不是依赖过去聊天，然后只推荐一个最合适的下一步。

如果这是一个刚接手、还没有被 AI 系统理解过的项目，通常会进入：

```text
evo-init
```

`evo-init` 会让 Agent 真正阅读：

- `AGENTS.md` / 现有项目指令；
- README、架构/API/业务文档；
- Maven/Gradle/npm/pnpm 等真实依赖元数据；
- 代表性源码与现有实现模式；
- 测试、构建、运行与 CI；
- Git 历史；
- 已有 Spec/RFC/ADR/Issue 规范。

必要时 Agent 可以直接调用项目自己的工具，例如：

```bash
mvn help:effective-pom
mvn dependency:tree
npm test
pytest
```

而不是依靠 EVO 自己写一个扫描器去猜。

最终它会区分：

```text
Confirmed  已确认事实
Inferred   有依据的推断
Unknown    尚未建立的事实
```

**Unknown 不等于 Blocker。** 只有这个未知项会实质影响当前任务或风险时，才需要停下来确认。

---

# 4. 一条典型开发路径

对于普通功能开发：

```text
ask-evo
   ↓
evo-init / evo-recover
   ↓
evo-grill-with-docs
   ↓
evo-research          ← 需要最新外部方案时
   ↓
evo-spec              ← 较大变更才需要
   ↓
evo-plan
   ↓
evo-implement
   ↓
evo-verify
   ↓
evo-review
```

这不是强制状态机。

一个按钮文案修改可能只需要：

```text
Inspect → Edit → Focused Check
```

一个普通业务功能可能需要：

```text
Clarify → Plan → Implement → Verify → Review
```

权限、支付、数据迁移、兼容性、重大架构变化则应该增加明确的人类决策和更强的真实环境 Evidence。

原则是：

> **Minimum Necessary Process — 只使用当前风险真正需要的流程。**

---

# 5. 长期知识怎么管理

EVO 不要求业务项目建立固定 `.evo/` 目录。

先复用项目已有的知识体系。没有同等机制时，可以采用下面这个最小模型：

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

它们负责不同问题：

| 内容 | 负责什么 |
|---|---|
| `AGENTS.md` | 工作规则、项目地图、去哪里找知识 |
| `CONTEXT.md` | 领域词汇、稳定业务事实、共享语言 |
| Current docs | 系统现在是什么样 |
| Decision / ADR | 为什么做这个选择 |
| Working Spec / Plan / Issue | 当前准备做什么 |
| Source / Config / Schema | 系统实际做什么 |
| Tests / Runtime / CI | 哪些可观察行为被真正证明 |
| Git | 历史上发生过什么 |

核心规则：

> **One Fact → One Owner。**

不要把同一个会变化的事实复制到五份文档里，再靠工具同步它们。

详见 [`docs/knowledge-model.md`](docs/knowledge-model.md)。

---

# 6. 需求做到一半变了怎么办

使用：

```text
evo-change
```

它不会让你“推倒重来”。

它会先判断变化属于：

- Clarification；
- Living revision；
- Evidence-driven refinement；
- Stable reversal；
- Independent decision。

然后把旧/新需求对照，判断哪些：

```text
retain
revise
remove
add
```

未完成的工作直接修改当前 Working Proposal；已经稳定交付、后来被反转的 Decision 才建立新的 replacement record，并链接旧 Decision。

这样既不会篡改历史，也不会因为需求变了一点就把已经正确的代码和验证全部作废。

---

# 7. Bug 怎么处理

使用：

```text
evo-bug
```

核心闭环：

```text
Reproduce
↓
Failing feedback loop
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

EVO 不鼓励“看见报错 → 猜一段代码 → 改完说好了”。

无法复现、生产环境不可访问、第三方系统不可验证时，要明确写：

```text
UNVERIFIED
```

而不是用静态代码检查冒充真实运行结果。

---

# 8. Verification 不再需要 Evidence Engine

使用：

```text
evo-verify
```

Skill 负责回答：

> 每条 Acceptance 到底应该用什么直接证据证明？

真正执行的仍然是项目自己的：

```text
mvn test
pytest
pnpm test
tsc
eslint
Playwright
curl
真实 UI / API / Runtime
GitHub Actions / Jenkins
```

报告时严格区分：

```text
Passed: <真实执行过的命令>
Failed: <真实失败的命令>
Inspected: <只能证明静态事实的路径>
Not run: <缺少什么环境>
Inferred from: <只能支持较窄结论的证据>
```

> **Evidence > Claim，但 Evidence 不是越多越好，而是要匹配真正的 failure surface。**

---

# 9. 为什么还要独立 Review

测试通过不代表：

- 需求理解一定正确；
- 页面真的符合用户想法；
- 没有重复造一套机制；
- 权限/兼容性/架构没有漂移；
- Feature 已经接到真实 consumer path；
- 文档与当前实现已经一致。

所以最后使用：

```text
evo-review
```

Review 最好在 fresh context / fresh Agent 中进行。它先重新读原始需求/Spec，再看实现和 Diff，避免被实现者自己的假设污染。

---

# 10. 换 Session / 换 Agent 怎么接力

使用：

```text
evo-recover
```

它从 Repository 重建：

- 当前目标；
- 当前 Working Proposal / Issue / Plan；
- 关键 Decision；
- Git branch/status/diff/recent commits；
- 已完成和待完成工作；
- 已验证结果与未验证边界；
- 下一步最小动作。

不需要 `.evo/state.yml`。

> **Derived State Is Disposable。真正重要的状态应该能从 Repository + Git 恢复。**

---

# 11. 所有 Skills

| Skill | 一句话说明 |
|---|---|
| `ask-evo` | 读取真实仓库，告诉你现在最应该做哪一步；只读 Router |
| `evo-init` | 理解已有项目、现有规范和知识 Owner，建立最小缺失结构 |
| `evo-grill-with-docs` | 把需求问清楚，同时沉淀领域语言和 durable decisions |
| `evo-research` | 查当前官方/高可信资料，把有长期价值的结论带引用写进仓库 |
| `evo-spec` | 把较大变更写成有范围、选项、Acceptance 和 Evidence 路径的 Working Proposal |
| `evo-plan` | 拆成 fresh Agent 也能完成和验证的 bounded vertical slices |
| `evo-implement` | 按项目现有模式实现一个 bounded slice |
| `evo-change` | 处理需求变化，只使真正受影响的代码/测试/知识失效 |
| `evo-bug` | Reproduce → Root Cause → Minimal Fix → Regression |
| `evo-verify` | 对每条 Acceptance 找直接、真实、可反驳的 Evidence |
| `evo-review` | 独立检查 Spec、代码、项目规范、真实 consumer path 和 Evidence |
| `evo-recover` | 新 Session / 新 Agent 从 Repository + Git 恢复当前工作 |

---

# 12. EVO 的核心原则

```text
Repository > Chat
Evidence > Claim
One Fact → One Owner
Change > Rewrite
Existing Pattern > Reinvent
Human Authority > Agent Autonomy
Minimum Necessary Process
Derived State Is Disposable
```

再加上 v1 新的边界：

> **Semantic judgment → Model**  
> **Deterministic fact → Project Tools**  
> **Business authority → Human**

---

# 13. EVO 不是什么

EVO v1 不是：

- Agent Harness；
- autonomous orchestrator；
- workflow engine；
- CLI framework；
- 第二套 Issue Tracker；
- 第二套 CI；
- 第二套 Maven/npm；
- 用复杂文档替代代码和测试的 SDD 模板。

Harness 负责执行环境、工具、sandbox、subagent 和长任务；EVO 只负责**如何以更好的软件工程方式使用这些能力**。

---

# 14. 一个 RuoYi 示例

参见 [`examples/ruoyi-brownfield.md`](examples/ruoyi-brownfield.md)。

它特别展示了一个原则：

> **Repository 不应该为了让 EVO Scanner 看懂而修改自己；EVO 应该使用模型推理和宿主工具去理解 Repository。**

---

# 15. 项目自身如何开发

EVOworkflow v1 自己也是一个 Skills/Docs 仓库，没有 Node CLI build。

仓库 CI 只做很轻的维护检查：

- 当前树不能重新出现 EVO CLI/runtime；
- Skill 目录和 frontmatter 必须一致；
- 核心架构文档必须存在。

它不会尝试证明这些 Skills 在所有业务语境中都“语义正确”。真正质量来自真实项目实践、独立 Review 和持续改进。

---

## 一句话总结

> **仓库负责记忆，Skill 负责方法，测试负责证明，Git 负责历史，人负责决策，Harness 负责执行。**
