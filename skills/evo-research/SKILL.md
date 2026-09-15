---
name: evo-research
description: Resolve a current external technical or product question using high-trust primary sources, compare real viable options, and preserve cited findings when they have future repository value. Use for freshness-sensitive APIs, versions, standards, compatibility, security guidance, or solution selection; do not use for facts already discoverable from the repository.
---

# EVO Research

## Purpose

Replace model-memory guesses with current evidence for decisions that depend on the outside world.

## Use when

- an API, SDK, framework, standard, regulation, vendor behavior, or version may have changed;
- the user asks for the latest/current/best-supported approach;
- a material dependency or architecture option needs comparison;
- compatibility, deprecation, security, support policy, or migration risk depends on primary-source evidence.

## Do not use when

- the answer is a repository fact that can be established by reading code/config/history;
- the question is primarily a product decision rather than an external fact — research may inform it, but `evo-grill-with-docs` owns the decision;
- the task is implementation of an already selected direction.

## Process

1. State the concrete question and the repository constraints that matter.
2. Identify what facts must be current and what evidence could settle them.
3. Search primary sources first: official docs, standards, upstream repositories/releases, vendor guidance, original papers, authoritative issue/change records.
4. Use community reports mainly for operational experience and failure signals, not as the sole authority for hard facts.
5. Compare only real viable alternatives. For each option, cover the dimensions that actually matter, such as compatibility, maturity, maintenance burden, migration cost, operational risk, lock-in, performance, security, and support horizon.
6. Record version/date/source when freshness changes the conclusion.
7. Separate external facts from repository-specific implications.
8. Make a recommendation only at the confidence level supported by the evidence.

## Repository write

If the finding is likely to matter beyond the current task, write a concise cited Markdown note in the repository's existing research/docs location. Reuse an existing owner before creating a new file.

A durable note should contain:

- question and scope;
- verified external facts with citations;
- compared options;
- repository-specific implications;
- recommendation and why;
- unresolved uncertainty and re-check trigger.

Research informs a decision; it does not silently authorize one.

## Output

Report:

- answer/recommendation;
- strongest supporting evidence;
- important alternatives rejected and why;
- freshness/version caveats;
- repository implication;
- unresolved uncertainty;
- repository note created/updated, if any.

## Final checks

- current claims are supported by current sources;
- hard facts are not based only on community discussion;
- repository-local facts were not needlessly researched on the web;
- recommendation is clearly separated from sourced facts;
- a material trade-off still requiring human authority is explicitly surfaced.
