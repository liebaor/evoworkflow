# EVOworkflow repository instructions

EVOworkflow 2.0 is a thin extension layer over unmodified Matt Pocock engineering Skills carried in this repository as a vendored read-only upstream.

## Architectural invariants

- Matt Skills are vendored upstream dependencies. Their source trees are pinned to Matt's upstream commit and protected by CI tree-SHA checks.
- Never edit, rename, shadow, or copy-and-patch Matt Skills under their original IDs.
- A behavioral difference from Matt must live in an `evo-*` Skill or EVO documentation/evals.
- EVO 2.0 has no central runtime, CLI state machine, `.evo/state.yml`, phase database, or duplicated tracker progress.
- The configured issue tracker owns Spec/Ticket progress and blocking relationships.
- Repository source/contracts/current docs own current behavior; `CONTEXT.md` owns domain vocabulary; ADRs own durable rationale; Git/PR history owns chronology; tests/runtime/CI own mechanical evidence.
- `docs/agents/repository.md` in a consumer repository is a map of authorities, structure, commands and reference implementations, not a copied encyclopedia.
- Reference Before Edit: a non-mechanical implementation must identify the nearest existing pattern and classify the change as REUSE, EXTEND, or NEW.
- Human owns product meaning, material decisions, risk acceptance, and external authorization. Agents may continuously transition through implementation mechanics inside an approved Execution Envelope.
- Commit describes state; it does not create acceptance or completion.

## Cross-harness contract

Portable EVO behavior belongs in `SKILL.md`. Do not embed one harness's tool-call syntax in EVO workflow bodies.

Every EVO Skill must:

- use lowercase kebab-case `name` matching the directory;
- provide a useful `description` and `compatibility` field;
- retain `disable-model-invocation: true` for Claude Code user-invoked behavior;
- set `metadata.opencode/autoinvoke: "false"` for OpenCode;
- include `agents/openai.yaml` with `policy.allow_implicit_invocation: false` for Codex;
- refer to Matt Skills by logical Skill ID, not by slash-command/tool syntax;
- fail clearly with `MATT_SKILL_REQUIRED: <id>` when a required upstream capability is unavailable rather than silently reimplementing it.

Vendored Matt Skills keep their upstream content and metadata exactly; do not retrofit EVO harness metadata into them.

## EVO-owned Skill set

`ask-evo`, `evo-init`, `evo-advisor`, `evo-implement`, `evo-change`, `evo-verify`, `evo-review`, `evo-goal`, `evo-finish`, `evo-commit`, `evo-recover`.

Do not reintroduce EVO copies of upstream `tdd`, bug diagnosis, research, grilling, Spec, ticketing, or setup methods unless a genuinely different lifecycle requires a new and clearly differentiated name.

## Upstream updates

Matt updates are snapshot replacements, not normal edits. Follow `UPSTREAM.md`: replace from a chosen upstream commit, update expected tree SHAs, run compatibility evals, and adapt only EVO-owned files when behavior changed.

## Change discipline

When changing this repository, keep README, UPSTREAM policy, architecture/workflow/knowledge docs, Skill contract/evals, `ask-evo`, metadata, examples, and CI aligned in the same change. Prefer behavioral evals over adding more process text.
