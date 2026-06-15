---
Number: 0046
Title: Persona vs Utility Skill Type
Status: accepted
Date: 2026-06-04
---

## Context

Every PRISM skill shipped before this decision was a persona — `roles.json` required a `persona` field on every entry, the build generated a Codex agent adapter (`.codex/agents/<id>.toml`) opening with "You are X." for each one, and the authoring rules assumed a voice section and a "How X Thinks" lens. That assumption breaks for action-shaped skills: `/prism-handoff` compacts a session into a handoff document. A handoff is something every persona does, not someone you switch into — it runs in the current persona's voice and has no identity of its own.

Two alternatives were considered for shipping it anyway:

- **Fake persona.** Give the skill a name and a placeholder persona to satisfy the registry. Rejected: a persona nobody switches into is a permanent lie in the data model — it pollutes the agent roster every Codex consumer sees, and every future reader has to learn that one "persona" isn't one.
- **Bare slash-command outside `.ai-skills/`.** Hand-author the skill directly in a platform directory. Rejected: it fragments the canonical→multi-runtime pipeline — the one surface where a skill is written once and generated for Claude, Codex, and Cursor. A hand-authored copy drifts the moment the pipeline evolves.

## Decision

`roles.json` entries carry an optional `type` discriminator: `"persona"` (the default when absent) or `"utility"`. The discriminator forks exactly two things:

- **No persona requirement.** A utility entry validates with `id` + `type: "utility"`; persona entries still require `persona`.
- **No agent adapter.** The build skips `.codex/agents/<id>.toml` for utility entries (and cleans up a stale one if a skill flips type). Skill adapters still generate for all three runtimes — a utility skill is invoked the same way everywhere; it just isn't an agent.

Nothing else forks on type. Adding a utility skill is a `roles.json` entry plus a skill source directory — zero pipeline edits.

## Consequences

- Positive: action-shaped skills ship through the same canonical pipeline as personas, with honest data — no fake roster entries, no hand-maintained platform copies.
- Positive: the discriminator is generic; future utility skills cost one registry entry each.
- Negative: the skills≡personas assumption is dead, and content that embodied it needs the carve-out spelled out — `skill-authoring.md` documents what utility skills omit (voice, lens, "You are X" opener).
- Neutral: existing persona entries are untouched; absent `type` means persona, so the registry needed no migration.

## References

- `.prism/rules/skill-authoring.md` — utility-skill authoring carve-out
- `.ai-skills/docs/compatibility.md` — generated-outputs matrix, persona vs utility
- `scripts/ai-skills/build.ts` — `buildRoleMap` validation and the agent-adapter gate
- [ADR-0044](./0044-direct-write-tool-outputs.md) — where generated outputs land per tool
