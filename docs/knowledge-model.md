# Repository Knowledge Model

EVO treats the repository as long-term memory. The goal is not to record everything; it is to keep the smallest durable set of authority owners that lets a fresh Agent reconstruct the project correctly.

## Suggested responsibilities

| Question | Preferred owner |
|---|---|
| How should contributors/Agents work here? | `AGENTS.md` or existing repository instructions |
| What do domain terms mean? | `CONTEXT.md`, glossary, or domain docs |
| What does the system look like now? | Current architecture/API/package docs + source |
| Why was a stable choice made? | ADR / decision record |
| What is the current unfinished change? | Existing issue/spec/RFC/proposal/plan |
| What proves observable behavior? | Tests, runtime checks, CI, and recorded outcomes |
| What happened historically? | Git, PRs, completed issues, release notes |

These are responsibilities, not mandatory filenames. Reuse the host repository's existing conventions first.

## One fact, one owner

Avoid copying mutable detail into many places. A decision record owns rationale, not an API manual. Current docs own current topology, not proposal history. Tests own executable promises, not complete design rationale. Git owns chronology, not current product requirements.

## Current truth vs history

Historical proposals and old decisions are context, not automatic present authority. Current contracts, current docs, source, runtime behavior, and direct evidence outrank stale plans. When a stable decision is later reversed, preserve the earlier rationale according to the repository's decision-history convention rather than rewriting the past deceptively.

## Working knowledge vs durable knowledge

Keep task-local notes lightweight. Promote information into durable repository knowledge only when future contributors/Agents are likely to need it again.

Examples of durable knowledge:

- shared domain vocabulary;
- stable architectural boundaries;
- public contracts;
- non-obvious operational constraints;
- rationale for revisitable choices;
- reliable build/test/run instructions.

Temporary implementation scratch, speculative alternatives, and transient progress belong in the active work artifact or can disappear after use.

## Progressive disclosure

Keep root instructions short and navigational. Put detailed knowledge close to the area it governs. A Skill should load only the authorities relevant to the current task.

## Recoverable workflow status

Prefer workflow status that can be reconstructed from durable artifacts: active issue/Spec/plan, Git branch/diff/history, review findings, and executed verification. Avoid maintaining duplicate task-status facts in multiple documents merely for process bookkeeping.
