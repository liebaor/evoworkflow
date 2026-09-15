# RuoYi Brownfield adoption example

## 1. Setup

Install EVO Skills, then run `evo-setup`.

If the repository contains existing `docs/adr/`, RFCs or a domain `CONTEXT.md`, Setup migrates the engineering-memory artifacts into:

```text
.evo/decisions/
.evo/specs/
.evo/context.md
```

and repairs references. It does not keep a permanent map back to the old knowledge layout.

API/deployment/user docs remain in the project's normal docs tree.

## 2. Init

Run `evo-init`. The Agent reads the actual RuoYi repository, Maven/Node metadata, representative modules, tests, CI and Git. When static metadata is insufficient it can use project tools such as:

```bash
mvn help:effective-pom
mvn dependency:tree
```

Findings go into `.evo/project.md` and `.evo/context.md` as Confirmed / Inferred / Unknown. Unknowns only block when relevant to the current task.

## 3. Feature

For a meeting-room feature:

```text
evo-grill-with-docs
→ evo-spec (.evo/specs/meeting-room.md)
→ evo-plan (.evo/plans/meeting-room.md)
```

Then either implement slices one by one or run `evo-goal` to execute the prepared plan continuously. TDD drives stable behavior seams; Verify proves acceptance through RuoYi's actual tests/API/UI paths.

## 4. Delivery

After Full Verify + Review, `evo-finish` converges current truth and Decisions, then `evo-commit` records an outcome-oriented Git history. Push occurs only when authorized.