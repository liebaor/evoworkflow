# v0.3 Final Engineering Closure Evidence / v0.3 最终工程收口证据

机器权威是同目录的 `evidence.yml` 及其 append-only `evidence/records/*.yml`；本文件只提供人类可读索引。Evidence `PASS` 表示对应验证已经被观察并记录，不等于 Worker 自行完成 Human Acceptance。

## Current acceptance / 当前验收

| Acceptance | Status | Evidence boundary |
|---|---|---|
| AC-F1 | PASS | `EV-20260914124820-d0fd0717`：implementation-ahead-of-approval diagnostic、Recovery 和 non-retroactive reconciliation |
| AC-F2 | PASS | `EV-20260914124831-d1154046`：fixed RuoYi revisions 上真实代码变更的 A → Delta → Bug/Regression → Fresh Recover → Follow-up Feature |
| AC-F3 | PASS | `EV-20260914124831-d1154046`：脱敏 continuity JSON/Markdown、Evidence artifact copy 和 SHA-256 |
| AC-F4 | PASS | `EV-20260914124843-66cb2fe5`：registered deterministic Project HARD checker、负向回归和 WARNING-first heuristic boundary |
| AC-F5 | NOT_RUN | exact approval、fresh derived views、current Evidence、Protocol Gates 和 Candidate Admission |
| AC-F6 | PASS | `EV-20260914125808-ccfd2132`：READY_FOR_REVIEW → independent fresh-context Review → delegated Human Acceptance；Finish 尚未执行 |
| AC-F7 | PASS | `EV-20260914124927-455bad51`：repository check、local Node 24 coverage、package smoke 和已声明的外部限制；Node 22/hosted CI 仍待远端证明 |
| AC-F8 | NOT_RUN | `evo-finish --apply`、final `evo-commit`、push、CI 和 main merge chronology |

## Historical evidence boundary / 历史证据边界

在最终 Change/Plan 改写为 AC-F1…AC-F8 后，上一份 AC-6.x 的 Evidence、Acceptance Trace 和 records 已移动到：

`evidence-history/pre-final-contract/`

这些文件保留原始内容和原始 PASS/UNVERIFIED 结论，作为 implementation-ahead-of-approval 的 Git chronology 证据；它们不再伪装成当前 Contract 的 Evidence。新 Contract 的 Evidence 必须重新建立，不能通过删除旧记录或 retroactive approval 获得 PASS。

## Known limitations / 已知限制

- Continuity trace 的 `BEHAVIORAL_PASS` 只覆盖真实代码变更、独立 verifier、Recovery、Fresh Agent 和 expected changed boundary；它不代表 RuoYi 的全部业务已通过运行时验收。
- RuoYi runtime、MySQL/Redis、认证浏览器路径不作为本地 EVO Evidence；未执行部分保持 `UNVERIFIED`。
- 如果宿主缺少固定 revision 所需的 Java 17 或 frontend dependency/build 环境，backend/frontend build 记录为 `UNVERIFIED`，不能改写为 PASS。
- GitHub-hosted CI 只能由远端 run 记录证明；本地 `pnpm run check` 不能替代 hosted CI。

## Fresh records / 新建记录

- F2/F3 artifact copies: `.evo/work/active/evo-0006-v0-3-engineering-closure/evidence/artifacts/`
- Continuity result: `BEHAVIORAL_PASS`; A/DELTA/BUG/C and their independent verifiers are `PASS`.
- The current Evidence document remains authoritative; this Markdown file is only its human-readable index.
