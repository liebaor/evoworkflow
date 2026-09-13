# RuoYi Grounding Evaluation / RuoYi 落地评估

评估日期：2026-09-13（Asia/Shanghai）。本记录只证明 evoworkflow 对固定源码归档的只读发现结果，不证明 RuoYi 已经构建、启动或连接数据库。

## Fixed inputs / 固定输入

| 角色 | 原始 checkout | 评估提交 | 说明 |
|---|---|---|---|
| 后端 | `/home/zhicheng/code/deepseek/deepseek-harness-study/ruoyi/ruoyi-springboot2/RuoYi-Vue` | `6230a34b5f9b60b670a9f438dc43b41b8a856598` (`origin/springboot2`) | Spring Boot 2.5.15、Java 1.8；多模块 Maven/RuoYi |
| 前端 | `/home/zhicheng/code/deepseek/deepseek-harness-study/ruoyi/ruoyi-vue3/RuoYi-Vue3` | `838965c5a18d2c61b73ec30c6e288057aaa08b63` (`master`) | Vue 3.5.26、Vite 6.4.1、JavaScript |

后端和前端是两个独立 Git Repository。评估前后两个原始 checkout 的 `git status --short` 均为空。后端没有切换分支；评估使用 `git archive origin/springboot2` 生成临时目录，前端使用 `git archive master` 生成临时目录。

## Observed results / 观察结果

### Backend / 后端

- `BROWNFIELD`，检查 334 个文件，整体发现置信度 `MEDIUM`。
- 技术：Java `1.8`、Spring Boot `2.5.15`、RuoYi `3.9.2`、Spring Security `5.7.14`；Maven、MySQL、Redis、MyBatis 的版本没有从扫描的元数据确认，保留为未知。
- 区域：`ruoyi-admin`=`backend`、`ruoyi-common`/`ruoyi-framework`=`shared`、`ruoyi-generator`/`ruoyi-quartz`/`ruoyi-system`=`module`、`sql`=`database`。
- 能力证据：authentication、authorization、data permission、pagination、standard response、audit logging、export。
- 入口：`mvn package`、`mvn test`、`bash ry.sh start`、`bash ry.sh status`；这些是发现到的命令，不是本次评估实际执行的命令。
- 参考实现：识别出 `ruoyi-admin/src/main/java/com/ruoyi/web/controller/system/SysUserController.java`。

### Vue3 frontend / Vue3 前端

- `BROWNFIELD`，检查 282 个文件，整体发现置信度 `MEDIUM`。
- 技术：JavaScript、Vue `3.5.26`、Vite `6.4.1`；Node.js 运行时版本没有在 package.json 中声明，保留为未知。
- 区域：`src`=`frontend`，并识别出 `public`、`vite` 和配置区域。
- 入口：`npm run dev`、`npm run build:prod`、`npm run build:stage`。
- 没有发现测试脚本，因此 `No confirmed test entry path was found.` 保持为未知。

## Commands and limits / 命令与限制

实际执行并以退出码 0 完成：

- `pnpm run eval:ruoyi -- --backend-root <backend archive> --backend-revision 6230a34b5f9b60b670a9f438dc43b41b8a856598 --frontend-root <frontend archive> --frontend-revision 838965c5a18d2c61b73ec30c6e288057aaa08b63`
- `node dist/index.js init --root <backend archive>`
- `node dist/index.js init --root <frontend archive>`

两个 `init` 都只显示预览并报告 `No files were written`；临时归档中没有出现 `.evo`。评估脚本只调用 `scanRepository`，不调用 RuoYi 的启动脚本、不写入文件、不连接网络服务。

以下结果仍为 `UNVERIFIED`：RuoYi Maven 构建、Spring Boot 启动、真实 MySQL/Redis 行为、浏览器前后端联调、Codex/Claude/OpenCode 执行、CI 和生产环境。
