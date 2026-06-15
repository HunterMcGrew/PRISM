# Install Layout

PRISM ships into a consumer repo as a multi-platform toolkit. This file is the agent-loaded reference for the bifurcated install layout. ADR-0031 records the decision; this doc is the everyday lookup for what lives where and why.

## The bifurcation

Two kinds of content sit in a PRISM install:

- **Platform-agnostic canonical content** — rules, ADRs, architect docs, templates, references, plans, lessons. One copy lives at `.prism/<area>/`. This is the source.
- **Platform-specific outputs** — Claude skills, Codex agents/skills, Cursor skills, native config files. These live under `.claude/`, `.codex/`, `.cursor/`, and `.agents/` per platform.

`pnpm prism:build` copies the read-only canonical areas into each platform dir so that each platform's auto-load mechanism surfaces the rules and architect docs without the agent having to Read them at session start. Every copied area carries a managed marker (`.ai-skill-generated`) at its root.

Concrete example: `.prism/rules/code-comments.md` is the canonical comment-style rule. `pnpm prism:build` writes byte-identical copies to `.claude/rules/code-comments.md` and `.codex/rules/code-comments.md` — both runtimes read the canonical Claude dialect (`paths:` frontmatter for Tier 2, no frontmatter for Tier 1) directly. Cursor is the exception: its rules loader keys on `.mdc` files whose frontmatter uses `globs:` (path-scoped) or `alwaysApply: true` (always-on), so `pnpm prism:build` translates the dialect when copying to `.cursor/rules/` — `code-comments.md` lands as `.cursor/rules/code-comments.mdc`. Editing the canonical and rebuilding refreshes all three. Editing a platform copy directly is drift — `pnpm prism:check` flags it.

The Cursor translation is mechanical and lossless: `paths:` becomes `globs:` with the same glob list, a frontmatter-less Tier 1 rule gains `alwaysApply: true`, and the `.md` extension becomes `.mdc`. Canonical rules stay in the Claude dialect per [ADR-0035](../spec/adrs/_toolkit/0035-rule-loading-tiers.md); a verbatim `.md` copy carrying `paths:` was untiered in Cursor at best and inert at worst (the gap routed to issue `#73`).

## What gets copied; what stays canonical-only

Copied areas (mirrored to every platform dir):

- `.prism/rules/` (whole tree)
- `.prism/architect/` (whole tree, including `manifest.json`)
- `.prism/spec/` (whole tree, including `adrs/`)
- `.prism/templates/` (whole tree)
- `.prism/references/` (whole tree)
- `.prism/SPEC.md` (loose file)

Canonical-only (lives at `.prism/` and is not mirrored):

- `.prism/plans/` — agent-written; mirroring would create write conflicts when an agent edits a plan and the next build overwrites the platform copy
- `.prism/lessons.md` — same reason

Skills are never under canonical at all — they're generated platform outputs from `.ai-skills/skills/<id>/` into `.claude/skills/<id>/`, `.agents/skills/<id>/`, and `.cursor/skills/<id>/`. The skill build mechanism is older than the bifurcation and continues to work the same way.

## Direct-write tool outputs

`pnpm prism:build` writes platform outputs directly to their tool-namespaced destinations — no staging directory. Cursor skills land at `.cursor/skills/<id>/SKILL.md`; Codex config lands at `.codex/codex-config.toml`. There is no `.generated/` staging surface.

The committed-vs-ignored split inside each tool namespace is the consumer install contract — codified in [`.ai-skills/docs/compatibility.md`](../../.ai-skills/docs/compatibility.md) § Per-Tool Directory Ownership and recorded as [ADR-0044](../spec/adrs/_toolkit/0044-direct-write-tool-outputs.md). The short version:

- `.cursor/skills/` is **committed** — Cursor consumers get skills via `git pull`, no install step.
- `.codex/codex-config.toml` is **ignored** — per-user file (personality, projects, marketplaces) that would clobber consumer customization if committed.
- `.agents/` is **ignored** — per-user Codex skills root; consumers will populate it via a per-user install script planned for Phase 2 (not yet shipped in PRISM).
- Per-tool `worktrees/` directories are **ignored** — operational state, not generated output.

The rule for future tool integrations: in-repo destinations get sync; outside-repo destinations get install scripts. See [`.ai-skills/docs/compatibility.md § Install-Script Scope`](../../.ai-skills/docs/compatibility.md) for the full reasoning.

## The templates/install seed surface

`templates/install/.prism/` is the consumer install seed — what a consumer repo receives at install time. Every addition to a shipped canonical area (rules, ADRs, architect docs, templates, references) dual-writes: author the canonical at `.prism/<area>/`, then write the seed copy at `templates/install/.prism/<area>/`, byte-identical except for content that doesn't ship (plan-file references are stripped; team identifiers stay in tokenized form per ADR-0030).

**Enforcement:** Seed drift is enforced by `checkSeedDrift()` in `scripts/ai-skills/build.ts`; `pnpm prism:check` fails if a non-curated canonical file diverges from the seed or is missing from the seed. The classification of every canonical file — which are excluded (not shipped), curated (intentionally different), or renamed in the seed — is declared in `.ai-skills/definitions/seed-curation.json`. That manifest is the source of truth: any new canonical file must be classified and the manifest updated, or `prism:check` will fail. CI runs `pnpm prism:check` on every PR and main push, so forgotten seed writes are caught on a fresh checkout before merge.

## Cross-reference convention

When canonical content cites another canonical file, use `.prism/<area>/<file>`. Every platform's copy of the citing file will resolve correctly via its own auto-load — Claude reads the citation from `.claude/rules/<rule>.md` and resolves `.prism/<area>/<file>` against the canonical location. Codex and Cursor do the same.

Citing `.claude/rules/<file>.md` inside content that gets copied to all three platforms is incorrect — Codex and Cursor consumers don't have a `.claude/` dir. The build-time path guard catches this (see below).

The convention does not apply to:

- Skill bodies under `.claude/skills/<id>/SKILL.md` — these are platform-specific outputs and may legitimately reference platform-specific paths.
- Agent-written content (plans, lessons) — these aren't copied, so platform-specific path mentions in tickets about platform layout don't propagate anywhere.

## Build-time path guard

`scripts/ai-skills/path-guard.ts` runs as part of `pnpm prism:build` and `pnpm prism:check`. It scans every `.md` file under the copied areas of `.prism/` and `templates/install/.prism/`, plus the loose `SPEC.md` on each surface, and fails the build when it finds a reference matching `(\.claude|\.codex|\.cursor)/(rules|architect|spec|templates|references|plans)/`. Both surfaces share the same allowlist — keys are relative to the surface's content root.

Two exclusions:

- Matches inside fenced code blocks pass — code blocks may legitimately quote prior layouts (e.g. ADR-0031's Context section).
- Filename allowlist (two entries today: `spec/adrs/0031-bifurcated-install-layout.md` and `architect/install-layout.md` — the latter so this doc's own example block can name `.claude/rules/<file>.md` etc. without the guard tripping). New allowlist entries need a comment explaining why.

When the guard fires, it prints `path-guard: <relative-path>:<line>: <text>` for each violation and exits non-zero.

## Drift detection

`pnpm prism:check` runs the same logic as `pnpm prism:build` but in dry-run mode — if any platform-copy file would change, it reports drift and fails. This catches:

- Out-of-band edits to a platform copy (the file no longer matches its canonical source)
- Forgotten rebuilds (canonical was edited but `prism:build` wasn't run)
- Renames in canonical (old platform copies remain when canonical files move)

The cleanup function under `removeDeletedManagedContent` handles the last case — it detects build copies whose canonical source no longer exists (recognized via the area-level `.ai-skill-generated` marker) and removes them.

Platforms without managed content are treated as opt-out, not drift. The signal is the area-level `.ai-skill-generated` marker — if no copied area carries it inside `<platformDir>/`, `prism:build` has never run for that platform and `prism:check` skips it. This keeps fresh clones passing on platforms the contributor hasn't built locally yet (e.g. `.agents/` is gitignored in this repo's dogfood install — `.codex/` and `.cursor/` are committed, so only per-user files like `.codex/codex-config.toml` and each tool's `worktrees/` are ignored). Once any area is built and the marker is written, drift detection picks the platform up on subsequent checks. Build mode always copies and writes the marker.

## Where to look

- ADR-0031 in `.prism/spec/adrs/` — the decision and the alternatives considered
- `scripts/ai-skills/build.ts` — the copy and cleanup orchestration in `main()`
- `scripts/ai-skills/path-guard.ts` — the standalone guard module
- `.ai-skills/definitions/paths.json` — `canonical.contentRoot` and `generated.platformContentCopies` declare the source/target dirs
- `docs/content/dev/architecture/install-layout.md` — the longer human-readable companion
