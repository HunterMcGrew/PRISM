# Compatibility

How PRISM's build outputs land across the four tool namespaces (`.claude/`, `.codex/`, `.cursor/`, `.agents/`), what gets committed vs ignored, and which destinations need install scripts.

## Runtime Expectations

PRISM generates content for three AI coding tools plus Codex's per-user installation:

- **Claude Code** — reads skills from `.claude/skills/`, rules and architect docs from `.claude/rules/`, `.claude/architect/`, etc. Loaded from the repo directly.
- **Codex** — reads agents from `.codex/agents/`, native configuration from `.codex/codex-config.toml`. The skill bodies install per-user to `.agents/skills/` and `~/.codex/agents/`.
- **Cursor** — reads skills from `.cursor/skills/`. Loaded from the repo directly.

Minimum tool versions are tracked in each tool's own setup docs; PRISM targets the latest stable release of each.

## Generated Outputs

`pnpm prism:build` writes to the destinations enumerated in `.ai-skills/definitions/paths.json`. The destinations follow a consistent shape per skill ID:

| Source | Destination |
| --- | --- |
| `.ai-skills/skills/<id>/` | `.claude/skills/<id>/SKILL.md` |
| `.ai-skills/skills/<id>/` | `.agents/skills/<id>/SKILL.md` (Codex skill body) |
| `.ai-skills/skills/<id>/` | `.codex/agents/<id>.toml` (Codex agent adapter) |
| `.ai-skills/skills/<id>/` | `.cursor/skills/<id>/SKILL.md` |
| Roles definition | `.codex/codex-config.toml` (Codex native config) |

Plus the platform content copies — `.prism/{rules,architect,spec,templates,references}/` and `.prism/SPEC.md` mirror into each platform's namespace (`.claude/`, `.codex/`, `.cursor/`).

The `.codex/agents/<id>.toml` row applies to persona skills only — see the subsection below.

`paths.json` is the authoritative source for the destination strings. Don't hardcode them elsewhere.

### Persona vs Utility skills

Most skills are personas; a skill whose `roles.json` entry declares `type: "utility"` is an action with no persona (e.g. `prism-handoff`). Utility skills generate skill adapters in all three runtimes — `.claude/skills/<id>/`, `.agents/skills/<id>/`, `.cursor/skills/<id>/` — but no Codex agent adapter: an agent adapter announces "You are X," and a utility skill has no X. The build skips `.codex/agents/<id>.toml` for utility entries and removes a stale one if a skill flips type. See [ADR-0046](../../.prism/spec/adrs/0046-persona-vs-utility-skill-type.md).

## Per-Tool Directory Ownership

Each tool namespace has a committed-vs-ignored split. The rule of thumb: content generated from `.ai-skills/` or `.prism/` is committed; per-user files and operational state are ignored.

- **`.claude/`** — fully committed. PRISM dogfoods Claude Code; consumers of PRISM inherit the `.claude/` content tree directly. Exceptions: `.claude/worktrees/` (operational; ignored) and `.claude/settings.local.json` (per-user override; ignored).
- **`.codex/`** — partially committed. `SPEC.md`, `agents/`, `architect/`, `references/`, `rules/`, `spec/`, `templates/` are tracked (generated mirrors of `.prism/`). `codex-config.toml` is **ignored** because it's a per-user file containing personality, projects, and marketplaces — committing it would clobber consumer customization. `.codex/worktrees/` is ignored (operational).
- **`.cursor/`** — partially committed. `skills/` is tracked so Cursor consumers get every persona via `git pull` with no install step. `SPEC.md`, `architect/`, `references/`, `rules/`, `spec/`, `templates/` are also tracked (generated mirrors of `.prism/`). `.cursor/worktrees/` is ignored (operational).
- **`.agents/`** — fully ignored. This is Codex's per-user skills root; the destination lives outside the repo on consumer machines (`~/.agents/skills/`), so even PRISM's own dogfood install doesn't commit it. PRISM does not yet ship a per-user install script — Phase 2 will add one.

The rule for future tool integrations: per-tool workspace state belongs under each tool's own namespace, with the committed-vs-ignored split codified per-tool.

## Install-Script Scope

Install scripts exist only when the destination is outside the repo.

- **In-repo destinations get sync.** `pnpm prism:build` writes directly to `.claude/skills/`, `.codex/agents/`, `.cursor/skills/`, `.codex/codex-config.toml`, and the platform-content-copy areas. No install step required; the build IS the install for in-repo destinations.
- **Outside-repo destinations get install scripts.** The Codex per-user skills root at `~/.agents/skills/` and the per-user Codex agents at `~/.codex/agents/` live in the user's home directory, not the repo. These need a separate install step that copies from the repo to the user's home. PRISM does not yet ship that install script — Phase 2 will add `pnpm prism:install-codex` as part of Atlas's onboarding flow. Until then, Codex consumers either dogfood PRISM directly or wire `~/.agents/skills/` themselves.

The failure mode this rule prevents: staging-and-deploy drift. Without this discipline, build outputs accumulate in a staging directory (formerly `.generated/`) and the install scripts drift from the source of truth — what the build writes to staging stops matching what install copies to the destination. The fix is to remove staging entirely for in-repo destinations and only use install scripts when the destination is genuinely external.

See [ADR-0044](../../.prism/spec/adrs/0044-direct-write-tool-outputs.md) for the architectural decision; see [`.prism/architect/install-layout.md § Direct-write tool outputs`](../../.prism/architect/install-layout.md) for the routing summary; see [`docs/content/dev/ai-skills/compatibility.md`](../../docs/content/dev/ai-skills/compatibility.md) for the human-readable narrative version.
