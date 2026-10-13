# Cross-Reference Checks

How canonical content cites other canonical files, so the citation resolves on every platform. Where canonical content and its platform copies live is [`install-layout.md`](./install-layout.md).

---

## Cross-reference convention

When canonical content cites another canonical file, use `.prism/<area>/<file>`. Every platform's copy of the citing file will resolve correctly via its own auto-load — Claude reads the citation from `.claude/rules/<rule>.md` and resolves `.prism/<area>/<file>` against the canonical location. Codex and Cursor do the same.

Citing `.claude/rules/<file>.md` inside content that gets copied to all three platforms is incorrect — Codex and Cursor consumers don't have a `.claude/` dir.

The convention does not apply to:

- Skill bodies under `.claude/skills/<id>/SKILL.md` — these are platform-specific outputs and may legitimately reference platform-specific paths.
- Agent-written content (plans, lessons) — these aren't copied, so platform-specific path mentions in tickets about platform layout don't propagate anywhere.
