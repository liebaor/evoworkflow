# EVOworkflow repository instructions

EVOworkflow v1 is a **Skill-first, repository-native engineering workflow**. This repository ships Skills and documentation, not an EVO runtime.

## Architectural rules

1. Do not introduce a required `evo` executable, CLI package, central state machine, repository scanner, Goal Runner, generic gate engine, or Evidence Engine.
2. Semantic repository understanding belongs to the Agent/model. Deterministic facts belong to the host project's tests/build/lint/runtime/CI. Material authority belongs to humans.
3. Adapt to the host repository's existing Spec/RFC/ADR/docs/test conventions before proposing EVO-specific structure.
4. Unknown information is not automatically blocking. It blocks only when different answers materially change the current task or risk.
5. Keep root guidance short. Durable detail belongs in `docs/`; runtime engineering behavior belongs in `skills/*/SKILL.md`.
6. One mutable fact has one primary owner. Avoid parallel copies of current truth.
7. Repository > Chat. Evidence > Claim. Change > Rewrite. Existing Pattern > Reinvent. Human Authority > Agent Autonomy. Minimum Necessary Process.

## Canonical layout

- `README.md` — user-facing product positioning, installation and usage.
- `skills/*/SKILL.md` — canonical Skill behavior.
- `docs/architecture.md` — v1 architecture boundary.
- `docs/knowledge-model.md` — repository authority and long-term knowledge model.
- `docs/workflow.md` — adaptive workflow.
- `docs/decisions/` — durable architectural rationale for EVO itself.
- `examples/` — bounded usage examples.
- `.github/workflows/validate.yml` — repository-maintenance validation only; it is not user runtime.

## Skill design

- Keep each Skill focused and usable without an EVO CLI.
- A Skill may use ordinary Agent tools and the host project's commands.
- Prefer repository-native verification to EVO-owned validators.
- `ask-evo` is the read-only router and recommended entry point.
- `evo-init` performs repository archaeology with model reasoning and host tools; it must not force a fixed project layout.
- `evo-verify` reports exact executed evidence and explicit unverified boundaries.
- `evo-review` should be independent from implementation context when possible.

## Change discipline

For substantive changes to EVO itself, update the relevant Skill/docs and record durable architectural rationale in `docs/decisions/` when the decision is likely to be revisited. Git is the chronology; do not recreate `.evo/state.yml` or another derived workflow database.

Before calling a change complete, confirm README, Skills and architecture docs agree and that the lightweight validation workflow still reflects the intended v1 boundaries.