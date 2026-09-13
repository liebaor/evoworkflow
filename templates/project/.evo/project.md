# Project map

## Initialization

- Project: `{{PROJECT_NAME}}`
- Mode: `{{PROJECT_MODE}}`
- Discovery confidence: `{{CONFIDENCE}}`
- Generated: `{{NOW}}`
- Files inspected: `{{FILES_SCANNED}}`

This map records observed repository facts and unresolved unknowns. It is not a claim that the project is completely understood.

## Authority map

> 中文：权威映射。每个事实只能有一个主权威。

{{AUTHORITIES}}

Each topic must have one primary authority. Additional documents should link to that authority instead of maintaining a competing copy.

## Technology evidence

> 中文：技术证据。

{{TECHNOLOGIES}}

## Repository areas

> 中文：仓库区域。这里只记录导航路径和证据文件，不复制源代码。

{{AREAS}}

## Operating paths

> 中文：运行入口。

{{COMMANDS}}

## Reusable capabilities

> 中文：可复用能力。

{{CAPABILITIES}}

## Reference implementations

> 中文：参考实现。

{{REFERENCES}}

## Working Context and consistency

- Working Context stores task-relevant repository paths, priorities, reasons, and Git observations; it does not copy source or documentation bodies.
- `evo context` is read-only by default. Explicit `--write` may write only the active Change's `context.md`.
- Consistency findings are review signals for response, permission, naming, and blast-radius drift. They do not decide architecture or acceptance.

## Unknowns

> 中文：未知项。

{{UNKNOWNS}}
