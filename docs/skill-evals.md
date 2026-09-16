# Scenario Evals

EVOworkflow should be evaluated by repository scenarios rather than prose inspection alone.

## Core scenarios

1. **Brownfield init** — identify architecture, real end-to-end path, representative references and reusable capabilities.
2. **Existing capability reuse** — a repository already has pagination/auth/response infrastructure; EVO knowledge makes it discoverable before new infrastructure is proposed.
3. **Stale knowledge** — only knowledge whose evidence surface changed is refreshed.
4. **Requirement change** — semantic delta identifies affected, unaffected and uncertain areas.
5. **Selective invalidation** — valid prior work/evidence survives an unrelated change.
6. **Engineering learning** — project-specific durable lesson is promoted; generic or duplicate advice is rejected.
7. **Cross-session recovery** — a fresh agent reconstructs current work without chat history.
8. **Consumer planning** — an external planning/spec workflow uses AGENTS + EVO context without direct EVO coupling.
9. **Consumer ticketing** — task decomposition respects existing capabilities/references exposed by EVO context.

Each scenario should define fixture repository state, user intent, expected knowledge mutations, expected routing, and forbidden behavior.
