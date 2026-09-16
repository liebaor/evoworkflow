# EVOworkflow Skills

EVOworkflow provides seven repository-evolution Skills:

| Skill | Purpose |
|---|---|
| `evo-init` | Build the initial Repository Engineering Contract. |
| `evo-refresh` | Keep EVO knowledge fresh with targeted rescans. |
| `evo-change` | Propagate accepted intent changes with selective invalidation. |
| `evo-learn` | Promote durable project-specific engineering learning. |
| `evo-recover` | Recover current project state across sessions and models. |
| `evo-advisor` | Give repository-aware senior engineering guidance, tradeoff analysis and recommendations. |
| `ask-evo` | Route to one EVO action, advisory guidance, or normal engineering workflow. |

Install:

```sh
npx skills@latest add liebaor/evoworkflow
```

Start a consumer repository with `evo-init`.

Use `evo-advisor` when the question is not “which workflow action comes next?” but “what engineering approach makes sense in this repository, and why?”. It reads the Repository Engineering Contract, relevant source/tests and current external technical sources when needed, but is read-only by default.

EVO Skills maintain engineering context and guidance. Specification, planning, ticketing, coding, testing, debugging and review workflows remain free to use that context through the repository's standing agent instructions.
