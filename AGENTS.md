# EVOworkflow repository instructions

EVOworkflow is a repository-centered project evolution layer for long-running AI-assisted software development.

## Product boundary

EVO owns durable repository understanding and project evolution context. It does not own every specification, planning, implementation, testing, debugging, or review workflow.

The core capabilities are:

- `evo-init` — repository intelligence and initial Engineering Contract.
- `evo-refresh` — knowledge freshness and targeted refresh.
- `evo-change` — semantic change impact and selective invalidation.
- `evo-learn` — durable project-specific engineering learning.
- `evo-recover` — repository-based continuity across sessions/models.
- `ask-evo` — read-only routing to one EVO action or normal engineering work.

## Architectural invariants

- Repository source, tests, runtime behavior, Git and CI are stronger evidence than generated summaries.
- `.evo/` is a durable knowledge layer, not a second issue tracker, workflow database, or source-of-truth replacement.
- `AGENTS.md` (or the repository's existing standing agent instruction file) is the consumption bridge into `.evo/` knowledge.
- EVO knowledge must be compact, link-oriented and progressively disclosed.
- Reference Before Edit: identify the nearest representative implementation before non-trivial changes.
- Capability Before Creation: search project/framework capabilities before creating shared infrastructure or abstractions.
- Change > Rewrite: model accepted intent changes as semantic delta and impact.
- Selective Invalidation: invalidate only affected knowledge, work and evidence.
- One Fact → One Owner: each durable fact has a canonical owner.
- Knowledge promotion requires stability, project-specific value and likely future reuse.
- Knowledge entries carry observation evidence sufficient to judge freshness.

## Knowledge contract

Consumer repositories use:

```text
.evo/
├── project.md       # architecture, boundaries, commands, conventions, constraints
├── current.md       # compact current engineering state
├── references.md    # concern -> representative implementation index
├── capabilities.md  # concern -> existing reusable capability index
├── decisions/       # durable project decisions when the project needs them
├── changes/         # accepted intent deltas and impact records
└── learnings/       # promoted project-specific engineering lessons
```

Detailed ownership and lifecycle rules live in `docs/knowledge-model.md`.

## Cross-harness contract

Portable EVO behavior belongs in `SKILL.md`; do not hard-code one agent harness's tool syntax into workflow instructions.

Every EVO Skill must:

- use lowercase kebab-case `name` matching its directory;
- provide `description` and `compatibility` frontmatter;
- retain `disable-model-invocation: true`;
- set `metadata.opencode/autoinvoke: "false"`;
- include `agents/openai.yaml` with `policy.allow_implicit_invocation: false`;
- read the minimum relevant repository/EVO context needed for its job;
- prefer evidence and links over copied source bodies;
- state uncertainty instead of silently converting weak observations into rules.

## Change discipline

When changing EVOworkflow itself, keep README, architecture, knowledge model, Skill contract, Skills, examples and CI aligned. Prefer scenario/eval coverage over adding more prose-only process.
