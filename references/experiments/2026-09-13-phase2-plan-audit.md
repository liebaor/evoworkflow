# evoworkflow Phase 2 计划审查 / Plan Audit

审查日期：2026-09-13（Asia/Shanghai）。

## 结论

二期目标和 Workstream 划分合理：先让 Agent 认识真实 Repository，再为单个 Change 提供局部上下文，最后用一致性评审和变更恢复证明长期开发不会漂移。

原计划不能不加修改地执行。它把整期能力、真实项目验证和跨项目评估放在同一张路线图中，但没有固定 RuoYi 的仓库边界、版本基线和可观察的 Eval 判据。本期先按修正后的 Milestone 2.1 开始。

## 已确认的 RuoYi 事实

| 角色 | 路径 | Git 基线 | 观察结果 |
|---|---|---|---|
| 后端 | `/home/zhicheng/code/deepseek/deepseek-harness-study/ruoyi/ruoyi-springboot2/RuoYi-Vue` | 当前 `master`：`13db1fcef36bee9ce45d2d636a1d4e8f5ed5bbc3`；`origin/springboot2`：`6230a34b5f9b60b670a9f438dc43b41b8a856598` | 当前 checkout 的 `master` 是 Spring Boot 4.1/JDK 17；`origin/springboot2` 是 Spring Boot 2.5.15/JDK 8 |
| 前端 | `/home/zhicheng/code/deepseek/deepseek-harness-study/ruoyi/ruoyi-vue3/RuoYi-Vue3` | `master`：`838965c5a18d2c61b73ec30c6e288057aaa08b63` | 独立 Vue 3 + Vite + JavaScript 仓库 |

两个 RuoYi checkout 都没有未提交改动。EVO 的初始化预览没有写入它们：后端检查 334 个文件，前端检查 282 个文件，均识别为 `BROWNFIELD`、置信度 `MEDIUM`。

## 需要修正的计划边界

1. 把后端和前端作为两个独立 Repository 观察；真实 Feature 需要先定义跨仓库 Change 约定，不能默认由单仓库 State 代管。
2. 把 RuoYi 验证固定到明确的 Git 提交；默认使用 Spring Boot 2 分支提交 `6230a34...` 和 Vue3 提交 `838965c...`，不改变用户现有 checkout。
3. 将“像同一个团队”“没有并行机制”拆成路径、命名、响应、权限、分页、测试和影响范围等可观察 Eval 输出。
4. 一期已有 Goal Runner、Change 生命周期、Verify、Review、Finish、Delta、Bug 和 Recovery 基础实现；二期只增强真实项目 Grounding 和一致性证据，不重写这些能力。
5. 二期真实构建、MySQL、浏览器、真实 Agent、跨平台和 CI 结果分开记录；未实际观察的路径保持 `UNVERIFIED`。

## 本次开始的第一 Change

`evo-0002-v0-2-grounding` 只覆盖 Milestone 2.1：

- 扩展确定性 Brownfield 发现，使技术观察带有版本、证据和 `CONFIRMED/INFERRED` 标记；
- 记录薄的 Repository areas 和更可靠的 Maven、Node、运行入口发现；
- 把这些观察写入项目地图，不复制整个 Repository；
- 使用固定提交的 RuoYi 后端和 Vue3 前端做只读初始化评估。

`build-working-context`、真实 Feature A/B、Requirement Change、Bug、Fresh Session 和 FastAPI 跨项目评估留在后续 Change，不在本次偷偷扩大范围。
