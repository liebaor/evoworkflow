# Migration from EVO 0.4.x CLI to v1 Skill-first Core

EVO 0.4.x experimented with a central TypeScript/oclif runtime for repository scanning, state, approvals, Goal execution, constraints, gates, evidence and CLI/Skill distribution. Real Brownfield use showed an architectural problem: heuristic machine understanding could become a hard authority over semantic project reality.

Example failure mode:

```text
valid project convention
→ scanner cannot model it
→ UNKNOWN
→ hard constraint
→ Goal blocked
```

The v1 architecture removes the central runtime instead of making the scanner increasingly complex.

## Removed from Core

- `evo` executable and `@evoworkflow/cli` package;
- oclif command tree;
- `.evo/state.yml` workflow database;
- Goal Runner/process adapters/locks;
- repository scanner as authority;
- constraint/admission/gate engines;
- EVO Evidence Engine and freshness fingerprints;
- CLI distribution/release bootstrap;
- EVO-specific schemas/templates required by the runtime.

Prior implementation remains available through Git history and 0.4.x branches/tags; it does not remain in the v1 working tree.

## Replacements

| 0.4.x mechanism | v1 replacement |
|---|---|
| `evo init` scanner | `evo-init` Skill + repository archaeology + host tools |
| `state.yml` | active repository owner + Git + `evo-recover` |
| constraints scanner/gate | model relevance reasoning + human authority for material choices |
| Goal Runner | coding-agent harness + bounded plan slices |
| Evidence Engine | acceptance/evidence map + project tests/build/runtime/CI |
| approval fingerprint | human review of current proposal/diff/Git |
| CLI doctor/status | `ask-evo` / `evo-recover` reading real repository state |
| CLI skill installer | standard Agent Skill installation tools / repository-local skill directories |

## Preserved principles

The refactor preserves the ideas that proved valuable: Repository > Chat, Evidence > Claim, One Fact → One Owner, Change > Rewrite, Existing Pattern > Reinvent, Human Authority > Agent Autonomy, Minimum Necessary Process and independent review.

The change is architectural simplification, not a retreat from engineering rigor.