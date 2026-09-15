# Repository Knowledge Model

EVO treats the repository as long-term memory. The goal is not to store everything; it is to keep the smallest durable set of owners that lets a fresh Agent reconstruct the project correctly.

## Suggested responsibilities

| Question | Preferred owner |
|---|---|
| How should contributors/agents work here? | `AGENTS.md` or existing repository instructions |
| What do project/domain terms mean? | `CONTEXT.md`, glossary or domain docs |
| What does the system look like now? | Current architecture/API/package docs + source |
| Why was a stable choice made? | ADR / decision record |
| What is the current unfinished change? | Existing issue/spec/RFC/proposal/plan |
| What proves observable behavior? | Tests, runtime checks, CI and recorded command outcomes |
| What happened historically? | Git, PRs, completed issues/release notes |

## One fact, one owner

Avoid copying mutable details into many files. A decision record owns rationale, not an API manual. Current docs own current topology, not proposal history. Tests own executable promises, not complete design rationale. Git owns chronology, not current product requirements.

## Current truth vs history

Historical proposals and old decisions remain useful context but do not outrank current contracts, current docs, source and executable evidence. A stable decision that is later reversed should be superseded/cross-linked rather than rewritten as though the old choice never existed.

## Progressive disclosure

Keep root instructions short and navigational. Put detailed knowledge close to the area it governs. A Skill should load only the authorities relevant to the current task.

## Derived state is disposable

Do not maintain a second workflow database when current progress can be reconstructed from the active proposal/issue/plan, Git diff/history and executed verification. Fresh sessions should recover from repository evidence rather than a proprietary state file.