# EVOworkflow Working Model

## Adoption

```text
install skills
→ evo-setup
→ evo-init
→ ask-evo
```

`evo-setup` establishes the fixed workspace and migrates Brownfield engineering memory. `evo-init` then learns the actual codebase and fills project/context knowledge.

## Standard feature route

```text
advisor / grill / research as needed
→ spec
→ plan
→ implement (+ tdd where appropriate)
→ verify
→ review
→ finish
→ commit [→ push when authorized]
```

## Long-running route

After Spec and Plan are ready:

```text
evo-goal
  loop each slice:
    implement
    tdd when appropriate
    focused verify
    fix or bug loop on failure
    checkpoint commit when policy allows
  then:
    full verify
    independent review
    finish
    final commit
    optional push
```

Goal does not stop for ordinary coding/test failures when the Agent can gather new evidence and continue. It stops for material human decisions, missing authorization/credentials, destructive irreversible actions, contradictory intent, or repeated failure without a new diagnostic path.

## TDD

TDD is an implementation method, not final acceptance proof:

1. choose a public behavior seam;
2. write one focused test;
3. run it and confirm the failure is specifically the missing target behavior;
4. write the minimum implementation to make it green;
5. run the focused test plus nearby regressions;
6. refactor only while green and without changing behavior;
7. repeat one vertical slice at a time.

Avoid bulk test-first horizontal slicing and implementation-coupled assertions.

## Review and finish

Review asks three independent questions:

- **Intent** — did we build the requested outcome?
- **Engineering** — does it fit this repository safely and maintainably?
- **Evidence** — do the executed checks support the claims?

Finish then converges current docs, `.evo/context.md`, durable decisions, working specs/plans and goal progress so the next Agent reads a coherent repository.

## Delivery

Commit is the delivery-history step. It reads the diff plus verified context and writes an AI-readable message. Push is explicit, never assumed.