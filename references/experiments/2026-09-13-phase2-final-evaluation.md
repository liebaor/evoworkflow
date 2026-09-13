# Phase 2 final evaluation / 二期最终评估

## Scope / 范围

本记录保存 evoworkflow v0.2 的本地、确定性和只读验证结果。评估使用实际 evoworkflow checkout、固定 RuoYi 归档和独立 FastAPI + Ant Design Pro 合成夹具，不复制外部项目源代码，也不把静态结果解释为真实运行结果。

## Phase 2 eval harness

命令：`pnpm run eval:phase2`

结果：E001、E002、E003、E004、E005、E006、E007、E008、E009、E010、E011、E012 全部 `PASS`。E011 验证 FastAPI + Ant Design Pro 的 JSONResponse、FastAPI 路径和前端路径保持项目自身事实，不触发 RuoYi AjaxResult、Java 权限或 Java 技术栈漂移。

## Fixed RuoYi evaluation

命令：`pnpm run eval:ruoyi -- --backend-root /tmp/evo-phase2-ruoyi-QHztO6/backend --backend-revision 6230a34b5f9b60b670a9f438dc43b41b8a856598 --frontend-root /tmp/evo-phase2-ruoyi-QHztO6/frontend --frontend-revision 838965c5a18d2c61b73ec30c6e288057aaa08b63`

结果：RuoYi Grounding 通过。后端识别 Java、Spring Boot 2.5.15、RuoYi 3.9.2、MySQL/Redis/MyBatis/Spring Security 证据、backend/module/database 区域和 Maven/ry.sh 入口；前端识别 Vue 3.5.26、Vite 6.4.1 和 frontend/vite 区域。

Feature A Supplier CRUD 在临时副本中路由到真实 `SysUserController`，并关联授权、分页和标准响应证据。Feature B Inventory Alert 在临时副本中路由到真实 `SysUserController`、DataScope、分页/标准响应和 `ExcelSheet` 导出证据。

原始 checkout 只读复核结果：后端 `/home/zhicheng/code/deepseek/deepseek-harness-study/ruoyi/ruoyi-springboot2/RuoYi-Vue` 的 `git status --short` 为空，HEAD 为 `13db1fcef36bee9ce45d2d636a1d4e8f5ed5bbc3`；前端 `/home/zhicheng/code/deepseek/deepseek-harness-study/ruoyi/ruoyi-vue3/RuoYi-Vue3` 的 `git status --short` 为空，HEAD 为 `838965c5a18d2c61b73ec30c6e288057aaa08b63`。

## Local checks

- `pnpm run check`：通过；类型检查、17 个测试文件/64 个测试、构建、构建后 CLI smoke、19 个 Skill 校验和 7 个 JSON Schema 校验均通过。
- `node dist/index.js context --root . --json`：退出码 0；返回当前 Change 的路径化引用、理由和 Git 快照。
- `node dist/index.js recover --root . --json`：退出码 0；`valid: true`，返回当前阶段、Slice、证据、未知项和人工下一步建议。

## Evidence limits / 证据边界

上述 RuoYi evaluator 是固定归档的静态扫描和临时副本 Context 验证；没有运行 Maven、Spring Boot、真实 MySQL、浏览器、Agent、CI、部署或生产入口。这些路径仍保持 `UNVERIFIED`，不因本地通过而改写为 `PASS`。

本次二期没有执行 Git commit、merge、release、deploy 或原始 RuoYi 写入。
