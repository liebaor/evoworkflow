---
name: ask-evo
description: Route repository work to the single best next EVO Skill. Use when the user asks what to do next, how to continue, where work stands, or which EVO workflow applies. Read-only: do not edit files or execute the routed Skill.
disable-model-invocation: true
---

# Ask EVO

## Purpose

Act as the read-only wayfinder for EVOworkflow. Reconstruct the current situation from repository evidence and recommend exactly one next Skill.

## Use when

- the user asks what to do next;
- the user is unsure which EVO Skill fits;
- work has paused and the next phase is unclear;
- the user wants a quick status-and-next-step assessment.

## Do not use when

- the user already named the Skill they want;
- the task is a direct factual question that does not need an engineering workflow;
- you are expected to implement, edit, verify, or review in this same Skill.

## Read first

Read only enough evidence to route correctly:

1. applicable repository instructions;
2. active issue/spec/proposal/plan if one exists;
3. relevant current docs and decisions;
4. Git branch, status, recent commits, and diff when work is already in progress;
5. relevant test/CI evidence when completion is being claimed.

Do not reconstruct the entire repository if a smaller read answers the routing question.

## Routing order

Recommend exactly one primary next action:

1. **`evo-recover`** — active work exists but the current session/Agent has lost working context.
2. **`evo-init`** — the repository's conventions, knowledge owners, build/test paths, or representative patterns are not yet understood.
3. **`evo-bug`** — an observed failure, regression, flake, or performance problem needs diagnosis.
4. **`evo-change`** — already accepted intent changed during ongoing work.
5. **`evo-research`** — a material external or freshness-sensitive fact must be established from current sources.
6. **`evo-grill-with-docs`** — product behavior, scope, terminology, or another material human decision is still ambiguous.
7. **`evo-spec`** — a non-trivial change is understood but needs one explicit working owner with acceptance and trade-offs.
8. **`evo-plan`** — intent is clear but the work is not yet divided into fresh-Agent-sized executable slices.
9. **`evo-implement`** — one bounded unit has clear scope and acceptance and is ready to build.
10. **`evo-verify`** — implementation claims need direct evidence against acceptance.
11. **`evo-review`** — evidence exists and an independent intent/engineering/evidence review is needed.
12. **`evo-finish`** — verification and review are complete and repository current truth must converge.

For a tiny mechanical edit, `evo-implement` may be the correct next step without a separate Spec or Plan.

## Output

Keep the response compact:

- **Current objective**
- **What is known** — only facts relevant to routing
- **Material unknown/blocker** — only if it changes the next action
- **Recommended Skill** — exactly one
- **Why this Skill now** — one short paragraph

## Final checks

Before answering:

- repository evidence outranks chat recollection;
- unknown does not mean blocker unless different answers materially change the next step;
- do not invent workflow state;
- do not edit files;
- do not invoke the destination Skill;
- do not recommend multiple equal next steps.
