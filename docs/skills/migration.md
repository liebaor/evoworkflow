# Skill migration

Historical copies are report-only findings. EVO never removes them automatically.

Recommended order:

1. Run `evo skills inspect`.
2. Review `evo skills install` preview.
3. Apply the canonical `~/.agents/skills` installation.
4. Run `evo skills doctor`.
5. Review Claude links and compatibility.
6. Manually remove legacy copies only after their contents are no longer needed.

Unknown existing content is treated as a conflict. Use a separate backup or a reviewed manual merge when a Skill has been customized.
