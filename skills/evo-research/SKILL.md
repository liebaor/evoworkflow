---
name: evo-research
description: Resolve current external technical uncertainty using high-trust primary sources and preserve durable findings in .evo/research/. Use for current APIs, versions, standards, upstream behavior, technology comparisons or external solution evidence. Do not use when the answer is already in this repository.
---

# EVO Research

## Read first
`.evo/project.md`, `.evo/context.md`, relevant Decisions/Spec and the concrete question.

## Workflow
1. State the decision/question and repository constraints.
2. Search current primary sources first: official docs, standards, upstream repos/releases, authoritative papers and original change/issue records.
3. Use community discussion mainly for experience signals.
4. Compare only real viable alternatives across compatibility, maintenance, migration, operational risk, lock-in, maturity and evidence quality.
5. State dates/versions when freshness matters.
6. If reusable beyond the chat, write `.evo/research/<topic>.md` containing date, question, verified external facts with citations/links, repository implications, recommendation and unresolved uncertainty.

## Boundary
Research informs decisions; it does not silently authorize material trade-offs. Route those to the human through Grill/Spec/Change.

## Output
Lead with the answer/recommendation and evidence quality, then the repository implications and next Skill.