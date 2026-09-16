# Harness compatibility

EVOworkflow 2.0 is designed around portable Agent Skill content with thin harness metadata. The combined repository contains two ownership classes: vendored Matt upstream Skills, which remain byte-for-byte upstream, and EVO-owned `evo-*` Skills, which carry EVO's portability metadata.

## Shared rules

- The Skill directory name and frontmatter `name` use the same lowercase kebab-case ID.
- EVO-owned core instructions never assume a slash-command spelling or a concrete `skill(...)` tool schema.
- Matt capabilities are named as logical dependencies even though their pinned files are vendored in the same distribution repository.
- Supporting paths are relative to the Skill directory when a harness exposes that base directory.
- Vendored Matt metadata is not rewritten to make it look EVO-native; compatibility adaptations belong in EVO-owned Skills.

## Installation shape

Use one source:

```sh
npx skills@latest add liebaor/evoworkflow
```

Select the vendored Matt Skills and EVO extensions needed by the target project. Do not install the same Matt Skill IDs again from `mattpocock/skills` into the same target.

## Codex

Each EVO-owned Skill includes `agents/openai.yaml` with a display name/description and `policy.allow_implicit_invocation: false` for user-controlled lifecycle Skills.

Vendored Matt Skills retain the upstream `agents/openai.yaml` files from the pinned Matt snapshot.

## OpenCode

OpenCode can discover Agent-compatible Skill locations and reads portable `name`, `description`, `compatibility` and `metadata`. EVO-owned Skills set:

```yaml
metadata:
  opencode/autoinvoke: "false"
```

so lifecycle Skills remain explicitly loadable without being advertised for arbitrary implicit use.

Vendored Matt Skills are intentionally not patched with EVO-specific OpenCode metadata. Cross-harness evals must verify the combined behavior rather than mutating upstream files for convenience.

## Claude Code

EVO-owned lifecycle Skills retain:

```yaml
disable-model-invocation: true
```

Vendored Matt Skills keep Matt's own upstream invocation frontmatter. Other harnesses that do not understand a field should ignore it.

## Skill-to-Skill portability

Different harnesses expose installed Skills differently. Therefore EVO wording is capability-based:

```text
apply `tdd`
apply `diagnosing-bugs`
```

not:

```text
/tdd
skill({id: "tdd"})
```

If a required Matt Skill cannot be loaded by the active harness/session, report `MATT_SKILL_REQUIRED: <id>` instead of silently substituting a forked method. Vendoring guarantees the source is present in the distribution; it does not guarantee every harness has loaded every selected Skill into the current session.

## Current target

First-class behavioral testing should cover Codex and OpenCode against the **combined vendored-Matt + EVO bundle**. Claude Code remains a compatibility target through portable Skill content and its invocation frontmatter, but behavior should be verified separately when its runtime is available.
