# EVOworkflow repository instructions

EVOworkflow 1.0 is a **Repository-centered, Skill-first AI software engineering workflow**.

## Product principles

1. Repository > Chat.
2. Evidence > Claim.
3. Existing Pattern > Reinvent.
4. One Fact → One Owner.
5. Change > Rewrite.
6. Human Authority > Agent Autonomy.
7. Minimum Necessary Process.
8. Derived workflow status should be reconstructable from durable repository evidence.

Semantic engineering judgment belongs to the Agent/model. Mechanically decidable facts should be proven with the host project's tests, build, lint, typecheck, runtime paths, and CI. Material product/risk decisions belong to humans.

## Canonical repository layout

- `README.md` — user-facing positioning, installation, workflow, and Skill index.
- `skills/*/SKILL.md` — canonical cross-host Skill behavior.
- `skills/*/agents/openai.yaml` — Codex/OpenAI-facing display and invocation policy metadata.
- `docs/architecture.md` — product architecture and responsibility split.
- `docs/knowledge-model.md` — repository authority and long-term knowledge model.
- `docs/workflow.md` — adaptive workflow and phase boundaries.
- `docs/skill-contract.md` — common contract for authoring EVO Skills.
- `docs/skill-evals.md` — behavioral scenarios used to audit routing and Skill boundaries.
- `examples/` — bounded usage examples.
- `.github/workflows/validate.yml` — repository-maintenance validation.

## Canonical Skill set

The user-facing Skill set is exactly:

`ask-evo`, `evo-init`, `evo-grill-with-docs`, `evo-research`, `evo-spec`, `evo-plan`, `evo-implement`, `evo-change`, `evo-bug`, `evo-verify`, `evo-review`, `evo-finish`, `evo-recover`.

When any Skill is added, removed, renamed, or changes responsibility boundaries, review and update all of:

- `ask-evo` routing;
- README Skill table and examples;
- `skills/README.zh-CN.md`;
- `docs/workflow.md`;
- `docs/skill-evals.md`;
- validation workflow.

## Skill authoring rules

Each user-facing Skill should make these explicit where relevant:

- purpose;
- use when;
- do not use when;
- inputs/read-first or preconditions;
- executable workflow;
- stop/escalation boundaries;
- repository writes/authority effects;
- output;
- final checks.

Descriptions must help discovery: say both what the Skill does and when it should be used. Adjacent Skills must state their boundary clearly.

Prefer progressive disclosure. Keep the core Skill executable and concise; move large rubrics/templates into local `references/` only when repeated detail materially helps execution.

## Responsibility boundaries

- `ask-evo` is read-only and recommends exactly one next Skill.
- `evo-init` is first-time repository archaeology; `evo-recover` is continuation of already-existing work.
- `evo-grill-with-docs` owns human decisions; discoverable facts should be investigated by the Agent.
- `evo-spec` synthesizes settled understanding; it must not become a second interview phase.
- `evo-plan` produces fresh-Agent-sized executable slices.
- `evo-implement` stops when implementation discovers a material intent/architecture/external-fact change.
- `evo-verify` proves acceptance with direct evidence and does not silently fix code.
- `evo-review` is read-only and reviews Intent, Engineering, and Evidence.
- `evo-finish` converges current truth after verification/review; it does not add feature scope or perform delivery actions unless explicitly requested.

## Change discipline for EVO itself

For substantive changes, inspect the affected Skills as a system rather than editing one file in isolation. Before completion, confirm README, Skill descriptions, router, workflow docs, metadata, and validation rules still agree.
