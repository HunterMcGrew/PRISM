# `.ai-skills/` — Canonical skill source

Single source of truth for the 12 PRISM personas. Skills are authored once here, then generated into platform-specific outputs (Claude, Codex, Cursor) by `pnpm prism:build`.

## Layout

Each skill lives at `.ai-skills/skills/<skill-id>/`:

- `frontmatter.yml` (required) — `name`, `description`, optional `argument-hint`. The `description` field powers Codex skill discovery, so keep it under 1,000 characters.
- `shared.md` (required) — the durable workflow content. ~95% of the body lives here.
- `claude.md` (optional) — Claude-specific additions (handoff phrasing, tool-call hints).
- `codex.md` (optional) — Codex-specific additions.
- `cursor.md` (optional) — Cursor-specific additions.
- `assets/`, `references/`, `scripts/`, `agents/openai.yaml` (optional) — payload directories copied verbatim into generated outputs.

## Definitions

- `definitions/paths.json` — output locations for each platform.
- `definitions/roles.json` — skill-id → persona mapping (used to build Codex agent adapters).
- `config.schema.json` — JSON Schema for per-team `config.json` (the file Atlas writes during onboarding).

## Commands

- `pnpm prism:bootstrap` — one-time importer. Reads `.claude/skills/<id>/SKILL.md` and splits each into the canonical shape. Renames `thrive-` prefixes to `prism-` during import. Skips files that already exist; pass `--force` to overwrite.
- `pnpm prism:build` — regenerate platform outputs from `.ai-skills/`. Writes to `.claude/skills/`, `.agents/skills/`, `.codex/agents/`, `.cursor/skills/`, `.codex/codex-config.toml`.
- `pnpm prism:check` — drift detection. Fails if any generated output is out of sync with the canonical source. CI-ready.
- `pnpm prism:test` — regression suite for canonical-source invariants (description length, role mapping, managed marker presence).
- `pnpm prism:check-types` — TypeScript check on the generator scripts.

## File ownership

Generated files carry a managed header line and `.ai-skill-generated` marker file. Do not hand-edit generated `SKILL.md` or `.toml` files — your changes are overwritten on the next build. Edit the canonical source in `.ai-skills/skills/<id>/` instead.

## Phase 2 preview

Phase 2 adds `pnpm prism:onboard --target <consumer>` and `pnpm prism:sync --target <consumer>` for cross-team install. Today the build writes only into PRISM's own dogfood install. The consumer-side install flow (with token substitution + three-way merge) lands later.
