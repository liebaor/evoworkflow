---
id: evo-0002-v0-2-grounding
weight: LARGE
status: APPROVED
approval:
  approvedAt: 2026-09-13T07:20:29.814Z
  approvedBy: human
  fingerprint: 31081ab18bb18598727d680ff386ee6a3527299a7f56ad39f91c06ff5a2ee00c
  source: phase2-user-request
---

# EVOworkflow v0.2 — Repository Grounding / 仓库落地

## Problem / 问题

一期的 EVOworkflow 已能保存协议、状态、批准、证据和恢复信息，但在真实 Brownfield Repository 上的技术版本、模块区域、运行入口和未知项仍然过薄，不能可靠支撑二期的一致性开发。

## Goal / 目标

让 `evo init` 对真实 Repository 产出一份薄而有证据的 Grounding 地图：Agent 能知道项目由哪些区域组成、使用哪些技术、如何构建/测试/运行、哪些能力可复用，以及哪些事实仍未确认。

## Scope / 范围

- 扩展确定性 Repository scanner 的技术观察、版本证据、Repository areas 和 Maven/Node 入口发现。
- 更新项目地图模板和初始化输出，使确认事实、推断事实和未知项可区分。
- 添加针对真实 RuoYi 后端 Spring Boot 2 分支提交和 Vue3 前端提交的只读评估脚本与证据。
- 为新增观察行为添加单元测试、初始化测试和 RuoYi 评估。

## Non-goals / 非目标

- 不修改 `/home/zhicheng/code/deepseek/deepseek-harness-study/ruoyi` 下任何 RuoYi checkout。
- 不实现 `build-working-context`、真实业务 Feature、跨仓库 Change 编排或完整 Consistency Drift gate。
- 不运行真实 MySQL、浏览器、Codex/Claude/OpenCode 或生产环境；没有观察到的路径保留 `UNVERIFIED`。
- 不重写一期已有 Goal、Change、Verify、Review、Finish、Delta、Bug 或 Recovery 能力。

## Acceptance / 验收

- AC-2.1：技术观察对每个版本声明提供证据路径，并区分 `CONFIRMED`、`INFERRED` 和未知；未知不会被模型常识填充。
- AC-2.2：真实 RuoYi 后端被识别为多模块 Maven/Spring Boot/RuoYi 项目，并发现 Java、MySQL、权限、分页、响应和导出相关证据；Vue3 checkout 被识别为 Vue/Vite 项目。
- AC-2.3：项目地图记录薄的 Repository areas、Authority、Operating paths、Capabilities 和 References；初始化仍然报告后写入且不覆盖已有文件。
- AC-2.4：固定提交的两个 RuoYi checkout 完成只读 Grounding 评估；评估不修改 RuoYi，构建/数据库/真实入口未运行的部分明确记为 `UNVERIFIED`。
- AC-2.5：新增行为有确定性测试，构建、CLI 冒烟、Skill 校验和生成 Schema 校验保持通过。

## Boundaries / 边界

- Primary modules: `src/repository/scanner.ts`, `src/repository/init.ts`, `templates/project/.evo/project.md`, tests and Phase 2 evaluation scripts.
- External repositories: RuoYi checkouts are read-only evaluation inputs; they are not copied into EVO and are not modified.
- Current Change does not approve a convention change in any RuoYi repository.
