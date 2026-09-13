---
change: evo-0002-v0-2-grounding
status: APPROVED
approval:
  approvedAt: 2026-09-13T07:20:45.371Z
  approvedBy: human
  fingerprint: 4540d191e494be71907d3d544e8a494021656cd342c98e3c41b6c5dafecf6c83
  source: phase2-user-request
---

# EVOworkflow v0.2 Grounding Specification / 仓库落地规格

## Behavioral authority / 行为权威

本 Change 实现二期计划的 Milestone 2.1，不改变一期产品原则。真实 Repository 的文件、文档、Git 基线和可执行入口优先于通用框架知识。

## Required observations / 必须观察

- `DiscoveryReport` 必须保留现有语言、框架、能力、引用和未知项，并增加可追溯的技术观察和 Repository areas。
- 技术观察必须给出名称、可观察版本（没有版本时为未知）、置信度和证据路径。
- Maven、Node/package manager、前端和后端模块的发现只能根据实际文件、manifest、POM、脚本或配置产生。
- 初始化项目地图只能保存导航信息和证据链接，不复制源代码、完整架构或完整 API。

## Failure behavior / 失败行为

- 解析不了的 manifest、缺失的版本或未找到的运行入口必须进入 unknown，而不是猜测。
- 扫描达到上限时必须保留不完整标记并降低置信度。
- 初始化预览不得写入文件；应用初始化不得覆盖已有项目指令、地图、配置或状态。
- RuoYi 评估只读；任何真实构建、数据库、浏览器或 Agent 入口未执行时，证据必须保持 `UNVERIFIED`。

## Compatibility / 兼容性

- 保持 Node.js 22+、ESM、TypeScript strict、文件系统持久化和现有 CLI 入口不变。
- 新增 Discovery 字段属于 v0.x 预稳定 API；所有本仓库消费者、模板、测试和文档一起更新。
- 不引入数据库、网络服务、RuoYi 运行时依赖或新的框架 Profile 库。
