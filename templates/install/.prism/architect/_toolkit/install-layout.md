# Install Layout

PRISM ships into a consumer repo as a multi-platform toolkit. This file is the everyday lookup for what lives where and why.

## The bifurcation

Two kinds of content sit in a PRISM install:

- **Platform-agnostic canonical content** — rules, ADRs, architect docs, templates, references, plans, lessons. One copy lives at `.prism/<area>/`. This is the source.
- **Platform-specific outputs** — Claude skills, Codex agents/skills, Cursor skills, native config files. These live under `.claude/`, `.codex/`, `.cursor/`, and `.agents/` per platform.

`pnpm prism:build` copies the read-only canonical areas into each platform dir so that each platform's auto-load mechanism surfaces the rules and architect docs without the agent having to Read them at session start. Every copied area carries a managed marker (`.ai-skill-generated`) at its root.

Concrete example: `.prism/rules/code-comments.md` is the canonical comment-style rule. `pnpm prism:build` writes byte-identical copies to `.claude/rules/code-comments.md`, `.codex/rules/code-comments.md`, and `.cursor/rules/code-comments.md`. Editing the canonical and rebuilding refreshes all three. Editing a platform copy directly is drift — `pnpm prism:check` flags it.

## Ownership is path-decidable: the `_toolkit/` namespace

`pnpm prism:update` pulls PRISM's latest content into an already-onboarded consumer repo. For that to be safe, "what is PRISM allowed to overwrite" has to be answerable from the path alone.

PRISM-owned content lives under `_toolkit/` subdirs so ownership is a glob, not a guess:

- `.prism/architect/_toolkit/**` — PRISM's architect docs. Flat `.prism/architect/*.md` is reserved for consumer product docs.
- `.prism/spec/adrs/_toolkit/**` — PRISM's ADRs. Flat `.prism/spec/adrs/*.md` is reserved for consumer product ADRs, which sidesteps numbering collisions between PRISM and consumer ADRs.

`manifest.json` is split-ownership: `.prism/architect/_toolkit/manifest.base.json` holds the toolkit routes (PRISM-owned), while the live `.prism/architect/manifest.json` is consumer-owned.

## Consumer overlay: `.prism/custom/`

Consumers extend PRISM without editing PRISM-owned files by dropping content under `.prism/custom/`, which mirrors the canonical area names: `.prism/custom/{rules,architect,references,templates}/<file>`. The overlay is consumer-owned, so `pnpm prism:update` never writes into it.

The update flow reads the overlay only during the platform-copy step, emitting each area into a `custom/` subdir per platform: `.claude/rules/custom/<file>.md`, `.cursor/rules/custom/<file>.mdc`, `.codex/rules/custom/<file>.md`. The `custom/` subdir makes base-vs-overlay collision structurally impossible.

## Skill namespace ownership

PRISM owns `prism-*` skill IDs and regenerates only those on update. Consumer-authored skills use a non-`prism-*` prefix — the org token from `config.json` (e.g. `acme-<role>`) or `custom-<role>` — and are consumer-owned, so an update never touches them. `prism-skill-forge` enforces this default in both its create and migrate modes.

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

The committed-vs-ignored split inside each tool namespace is the consumer install contract — codified in [`.ai-skills/docs/compatibility.md`](../../.ai-skills/docs/compatibility.md) § Per-Tool Directory Ownership. The short version:

- `.cursor/skills/` is **committed** — Cursor consumers get skills via `git pull`, no install step.
- `.codex/codex-config.toml` is **ignored** — per-user file (personality, projects, marketplaces) that would clobber consumer customization if committed.
- `.agents/` is **ignored** — per-user Codex skills root; consumers will populate it via a per-user install script planned for Phase 2 (not yet shipped in PRISM).
- Per-tool `worktrees/` directories are **ignored** — operational state, not generated output.

The rule for future tool integrations: in-repo destinations get sync; outside-repo destinations get install scripts. See [`.ai-skills/docs/compatibility.md § Install-Script Scope`](../../.ai-skills/docs/compatibility.md) for the full reasoning.

## The templates/install seed surface

`templates/install/.prism/` is the consumer install seed — what a consumer repo receives at install time. The PRISM build keeps it in parity automatically: non-curated canonical files (anything not classified `excluded`, `curated`, or `renamed` in `seed-curation.json`) are mirrored to the seed as raw bytes at build time. Curated files — those that intentionally ship a simplified consumer-facing version — stay author-maintained, and any new file must be classified in `seed-curation.json` before it ships.

**Enforcement:** Seed drift is enforced by PRISM's drift check; `pnpm prism:check` remains the CI backstop — it fails if a non-curated canonical file diverges from the seed, catching any case the build-time mirror missed (e.g. a hand-edited seed file). The classification of every canonical file — which are excluded (not shipped), curated (intentionally different), or renamed in the seed — is declared in `.ai-skills/definitions/seed-curation.json`. That manifest is the source of truth: any new canonical file must be classified and the manifest updated, or `prism:check` will fail. CI runs `pnpm prism:check` on every PR and main push, so forgotten seed writes are caught on a fresh checkout before merge.

## First-contact adoption: `prism:adopt`

The seed surface above is what a consumer repo *receives*; `pnpm prism:adopt` is what *lays it down* the first time. It is the install entry for a repo that has never had PRISM — an established team adopting PRISM into a codebase that already has its own setup. `scripts/ai-skills/adopt.ts` implements it.

`runAdopt` runs two steps in sequence:

1. **Seed `.prism/` from `templates/install/.prism/`.** `seedConsumerContentRoot` recursively copies the install seed into the consumer's `.prism/`, writing only paths the consumer does **not** already have and skipping any that exist. It never overwrites an existing consumer file — it mirrors the `consumerHash === null → written` posture from `applyIncomingFile`.
2. **Run the first sync.** `runAdopt` then delegates to `runUpdate`, which applies PRISM-owned files and writes the steady-state baseline manifest via `rewriteConsumerManifest`. The no-op-before-`.bak` ordering means byte-identical consumer files are left untouched and only genuinely diverged files are preserved as `.bak` — so the first sync into an established repo with no baseline manifest is safe.

After this one run, `.prism/.sync-manifest.json` exists and the repo is in steady-state: `pnpm prism:update` handles all future syncs.

**The manifest-exists refusal is the install-vs-steady-state guard.** `runAdopt` calls `assertConsumerIsEstablished` before seeding; if a `.sync-manifest.json` is already present, it throws `"prism:adopt: this repo already has a PRISM baseline — run pnpm prism:update for steady-state."` The guard lives inside `runAdopt`, not only in the CLI `main()`, so every caller of `runAdopt` inherits the invariant. This mirrors `update.ts`'s source==consumer refusal: each entry point refuses the other's job so the two flows' preconditions stay clean. There is no `--dry-run` preview — first-contact's safety is recover-after-`.bak` (the seed never overwrites; the sync no-ops byte-identical files and `.bak`-snapshots divergence), not see-before-write (ADR-0059).

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
- Filename allowlist (two entries today: `spec/adrs/_toolkit/0031-bifurcated-install-layout.md` and `architect/_toolkit/install-layout.md` — the latter so this doc's own example block can name `.claude/rules/<file>.md` etc. without the guard tripping). New allowlist entries need a comment explaining why.

When the guard fires, it prints `path-guard: <relative-path>:<line>: <text>` for each violation and exits non-zero.

## Drift detection

`pnpm prism:check` runs the same logic as `pnpm prism:build` but in dry-run mode — if any platform-copy file would change, it reports drift and fails. This catches:

- Out-of-band edits to a platform copy (the file no longer matches its canonical source)
- Forgotten rebuilds (canonical was edited but `prism:build` wasn't run)
- Renames in canonical (old platform copies remain when canonical files move)

The cleanup function under `removeDeletedManagedContent` handles the last case — it detects build copies whose canonical source no longer exists (recognized via the area-level `.ai-skill-generated` marker) and removes them.

Platforms without managed content are treated as opt-out, not drift. The signal is the area-level `.ai-skill-generated` marker — if no copied area carries it inside `<platformDir>/`, `prism:build` has never run for that platform and `prism:check` skips it. This keeps fresh clones passing on platforms the contributor hasn't built locally yet (e.g. `.agents/` is gitignored in this repo's dogfood install — `.codex/` and `.cursor/` are committed, so only per-user files like `.codex/codex-config.toml` and each tool's `worktrees/` are ignored). Once any area is built and the marker is written, drift detection picks the platform up on subsequent checks. Build mode always copies and writes the marker.

## Cross-reference lint

`pnpm prism:check` includes a prose cross-reference check (`scripts/ai-skills/crossref-lint.ts`) that scans carrier files for references that don't exist on disk. The tool is intentionally narrow: it resolves only **repo-root-absolute** references — paths starting with `.prism/`, `scripts/`, `.ai-skills/`, or `templates/`. These are the paths the monorepo materializes and can verify.

Relative links (`../` and `./`) are deliberately skipped. Canonical content carries relative links authored to resolve in the consumer's installed platform tree — where `rules/` and `skills/` are siblings under the platform dir — which is a different directory layout from the partial `.prism/` monorepo tree. Verifying them from the monorepo root would produce false failures by design, so they are excluded.

A green crossref-lint run therefore means the repo-root-absolute class resolves cleanly — not that every prose cross-reference resolves. When a doc carries relative links, verify them against the consumer install surface (`templates/install/.prism/`) rather than the canonical tree.

## Where to look

- `scripts/ai-skills/build.ts` — the copy and cleanup orchestration in `main()`
- `scripts/ai-skills/path-guard.ts` — the standalone guard module
- `.ai-skills/definitions/paths.json` — `canonical.contentRoot` and `generated.platformContentCopies` declare the source/target dirs
- `docs/content/dev/architecture/install-layout.md` — the longer human-readable companion
