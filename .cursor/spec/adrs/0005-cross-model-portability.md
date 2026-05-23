---
Number: 0005
Title: Cross-Model Portability
Status: accepted
Date: 2026-04-19
---

## Context

The skill ecosystem was designed for Claude, but the same patterns — persona-driven routing, plan-based working memory, shared rules and architect context — apply to any capable agentic model. If skill files baked in Claude-specific behavioral patches, porting to another model (Codex, etc.) would require rewriting every skill.

The Opus 4.7 compatibility audit surfaced this explicitly: some patches that work for Claude ("absolute mandates trigger 4.7's alignment override — reframe as contextual authority") would be noise on a different model with different regressions.

## Decision

Three-layer architecture for agent configuration:

- **`AGENTS.md`** — model-agnostic shared layer. Routing, accountability, compaction, core behavioral expectations. Applies to any model.
- **`CLAUDE.md`** — Claude-specific behavioral patches targeting documented 4.7 regressions (instruction hierarchy awareness, anti-gaslighting, dimensional reasoning, context preservation).
- **Future `CODEX.md` (or equivalent)** — would hold GPT-specific patches targeting whatever regressions that model exhibits.

Skill files themselves (`.claude/skills/<skill>/SKILL.md`) stay model-agnostic — they reference `AGENTS.md` but not model-specific patches. After the Opus 4.7 audit, skill files should port to any capable model without modification.

## Consequences

- Positive: skill maintenance is not coupled to a single model. Model-specific quirks live in model-specific files.
- Positive: when a new model is adopted, only one file needs its own behavioral patches — the skills and shared layer come along unchanged.
- Negative: CLAUDE.md and a future CODEX.md may drift if the same underlying problem manifests differently per model. Audit both when a new regression class is discovered.
- Neutral: developers reading the config need to know the layering. The file headers state this explicitly.

## References

- `AGENTS.md` — model-agnostic shared layer
- `CLAUDE.md` — Claude-specific patches
- `.prism/plans/4.7-skill-audit-strategy.md` § Cross-Model Portability Notes
