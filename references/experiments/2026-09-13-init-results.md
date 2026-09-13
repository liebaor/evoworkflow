# Initialization experiments — 2026-09-13

这些记录来自本地只读初始化预览。命令没有使用 `--apply`，因此没有向被检查的仓库写入 `.evo`、`AGENTS.md` 或其他文件。

## Commands

```sh
node dist/index.js init --root /home/zhicheng/code/deepseek/openspec_study/RuoYi-Vue --json
node dist/index.js init --root /home/zhicheng/code/codex/SDD_Study --json
node dist/index.js init --root examples/greenfield-team-tracker --json
```

实验使用构建后的 CLI；对应构建由 `pnpm run build` 产生。`examples/greenfield-team-tracker` 只有需求说明文件，用来确认“需求-only 目录”不会因为文档文本被误判为 Brownfield。

## Observed results

| Repository | Mode and confidence | Observed technology or path evidence | Remaining unknowns |
|---|---|---|---|
| `/home/zhicheng/code/deepseek/openspec_study/RuoYi-Vue` | `BROWNFIELD`, `MEDIUM` | 334 files; Java evidence; RuoYi and Spring Boot markers; `mvn test`; README authority; authentication, authorization, data permission, pagination, standard response, audit, and export references | Linux run path, architecture authority, and CI entry path were not confirmed |
| `/home/zhicheng/code/codex/SDD_Study` | `BROWNFIELD`, `HIGH` | 277 files; TypeScript, Python, and JavaScript; FastAPI, React, Ant Design, Ant Design Pro, and Umi Max markers; nested frontend build/dev/test/typecheck/browser-test commands; `bash scripts/check`; `python -m pytest`; repository authority documents and OpenAPI evidence | No additional initialization unknown was emitted by the scanner |
| `examples/greenfield-team-tracker` | `GREENFIELD`, `LOW` | One requirements file; no implementation manifest, source tree, test tree, or framework evidence | Product scope, foundation selection, architecture, test path, run path, and CI remain unknown |

The RuoYi follow-up inspection also found a concrete controller reference at `ruoyi-admin/src/main/java/com/ruoyi/web/controller/system/SysUserController.java`, including permission annotations, operation logging, pagination, export, and CRUD handlers. This confirms a reusable reference path; it does not prove that the repository can be started or tested successfully in this environment.

## Scope and limitations

- These are local checkout observations, not CI, production, external-platform, or model-execution evidence.
- A discovered command is an entry path recorded from repository files; it was not executed by the initialization preview.
- The scanner preserves unknowns instead of selecting a framework or claiming that a reference implementation is compatible.
- The two external repositories remained outside this project’s write scope; no initialization files were applied there.
