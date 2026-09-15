# EVO Skill Contract

This document defines how EVO Skills should be authored and reviewed. It is a design contract for the EVO repository, not a template that every user repository must adopt.

## 1. Discovery contract

Every `SKILL.md` frontmatter must have:

- `name` — stable Skill id;
- `description` — what it does **and when to use it**.

Descriptions should distinguish adjacent Skills. A discovery description that says only "helps with planning" is insufficient.

User-controlled workflow Skills may disable implicit invocation in host-specific metadata. Reactive capabilities such as bug diagnosis or current-source research may allow implicit invocation when the trigger is unambiguous.

## 2. Execution contract

A mature Skill should answer these questions where relevant:

1. **Purpose** — what single kind of work does it own?
2. **Use when** — what situations should route here?
3. **Do not use when** — which adjacent Skill owns look-alike situations?
4. **Read first / Preconditions** — what authority/evidence is required before acting?
5. **Workflow** — what repeatable cognitive or engineering procedure should the Agent follow?
6. **Stop / Escalate** — what discoveries invalidate this Skill's authority to continue?
7. **Repository writes** — what durable artifacts may this Skill update?
8. **Output** — what should be visible when the Skill finishes?
9. **Final checks** — what must be true before handoff?

These headings need not be mechanically identical in every Skill, but the behavior must be explicit.

## 3. Facts, decisions, and tools

- Discoverable repository/environment facts are the Agent's job to investigate.
- Current external facts belong to primary-source research.
- Material product/risk/trade-off decisions belong to humans unless repository policy already authorizes them.
- Mechanically decidable claims should use project-native tools rather than model confidence.

## 4. Repository authority

Skills must adapt to the host repository's existing issue, Spec/RFC, ADR, documentation, testing, and CI conventions.

Before creating a new artifact, search for an existing owner with the same responsibility.

One mutable fact should have one canonical owner. Other surfaces may link or summarize.

## 5. Phase boundaries

Skills should not silently absorb adjacent phases.

Examples:

- `evo-spec` synthesizes settled understanding; it does not conduct another broad interview.
- `evo-verify` executes evidence and reports status; it does not silently fix failures.
- `evo-review` is read-only; it does not edit the implementation it judges.
- `evo-finish` converges current truth; it does not introduce new feature scope.

## 6. Progressive disclosure

Keep the core procedure short enough to stay operational in context. Add local `references/` only when a detailed rubric, template, or domain method materially improves repeated execution.

References should support the Skill, not become a second hidden workflow.

## 7. Router synchronization

`ask-evo` is a manual router over the user-facing Skill set. Any Skill add/remove/rename or responsibility change requires re-checking:

- router coverage and precedence;
- README Skill list;
- `skills/README.zh-CN.md`;
- workflow docs;
- behavioral eval scenarios;
- static validation.

## 8. Quality test

Before accepting a Skill change, ask:

> Could a capable fresh Agent execute this Skill consistently without needing the author to explain the missing method in chat?

If the answer is no, the Skill is still a principle note rather than an executable capability.
