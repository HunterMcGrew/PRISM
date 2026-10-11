# Install Layout

PRISM ships into a consumer repo as a multi-platform toolkit. This file is the everyday lookup for what lives where and why.

## The bifurcation

Two kinds of content sit in a PRISM install:

- **Platform-agnostic canonical content** — rules, ADRs, architect docs, templates, references, plans, lessons. One copy lives at `.prism/<area>/`. This is the source.
- **Platform-specific outputs** — Claude skills, Codex agents/skills, Cursor skills, native config files. These live under `.claude/`, `.codex/`, `.cursor/`, and `.agents/` per platform.

`pnpm prism:build` copies the read-only canonical areas into each platform dir so that each platform's auto-load mechanism surfaces the rules and architect docs without the agent having to Read them at session start. Every copied area carries a managed marker (`.ai-skill-generated`) at its root. In your own repo, `prism update` copies the same areas into the platform dirs for the hosts your `hosts` config key declares — all three when the key is absent, and a dropped host's copies taken back out on the next update ([`consumer-sync-flow.md`](./consumer-sync-flow.md) § Steady-state persona-skill distribution).

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

The committed-vs-ignored split inside each tool namespace is the consumer install contract — codified in PRISM's internal `.ai-skills/docs/compatibility.md` § Per-Tool Directory Ownership (monorepo-only, not shipped to consumers). The short version:

- `.cursor/skills/` is **committed** — Cursor consumers get skills via `git pull`, no install step.
- `.codex/codex-config.toml` is **ignored** — per-user file (personality, projects, marketplaces) that would clobber consumer customization if committed.
- `.agents/skills/` is **populated directly, not auto-gitignored** — every `prism adopt`/`prism update` renders the persona roster there directly (see [`consumer-sync-flow.md`](./consumer-sync-flow.md) § Steady-state persona-skill distribution), the same render pass that writes `.claude/skills/` and `.cursor/skills/`. It belongs in your `.gitignore` as machine-local output, not because population is unshipped. PRISM writes nothing into your `.gitignore` except the two hook state-file globs described in [`hook-runtime.md`](./hook-runtime.md), and the render regenerates on every `prism update`.
- Per-tool `worktrees/` directories are **ignored** — operational state, not generated output.

The rule for future tool integrations: in-repo destinations get sync; outside-repo destinations get install scripts. See PRISM's internal `.ai-skills/docs/compatibility.md` § Install-Script Scope for the full reasoning (monorepo-only, not shipped to consumers).

## The templates/install seed surface

`templates/install/.prism/` is the consumer install seed — what a consumer repo receives at install time. The PRISM build keeps it in parity automatically: non-curated canonical files (anything not classified `excluded`, `curated`, or `renamed` in `seed-curation.json`) and files classified `mirrored` are written to the seed as raw bytes at build time. Curated files — those that intentionally ship a simplified consumer-facing version — stay author-maintained, and any new file must be classified in `seed-curation.json` before it ships.

**Enforcement:** Seed drift is enforced by PRISM's drift check; `pnpm prism:check` remains the CI backstop — it fails if a non-curated canonical file diverges from the seed, catching any case the build-time mirror missed (e.g. a hand-edited seed file). The classification of every canonical file — which are excluded (not shipped), curated (intentionally different), mirrored (kept byte-identical to canonical), or renamed in the seed — is declared in `.ai-skills/definitions/seed-curation.json`. A `curated` file ships but is never refreshed, so a file the consumer must read the same words from belongs in `mirrored` instead. That manifest is the source of truth: any new canonical file must be classified and the manifest updated, or `prism:check` will fail. CI runs `pnpm prism:check` on every PR and main push, so forgotten seed writes are caught on a fresh checkout before merge.

## Drift detection

`pnpm prism:check` runs the same logic as `pnpm prism:build` but in dry-run mode — if any platform-copy file would change, it reports drift and fails. This catches:

- Out-of-band edits to a platform copy (the file no longer matches its canonical source)
- Forgotten rebuilds (canonical was edited but `prism:build` wasn't run)
- Renames in canonical (old platform copies remain when canonical files move)

The cleanup function under `removeDeletedManagedContent` handles the last case — it detects build copies whose canonical source no longer exists (recognized via the area-level `.ai-skill-generated` marker) and removes them.

Platforms without managed content are treated as opt-out, not drift. The signal is the area-level `.ai-skill-generated` marker — if no copied area carries it inside `<platformDir>/`, `prism:build` has never run for that platform and `prism:check` skips it. This keeps fresh clones passing on platforms the contributor hasn't built locally yet (e.g. `.agents/` is gitignored in this repo's dogfood install — `.codex/` and `.cursor/` are committed, so only per-user files like `.codex/codex-config.toml` and each tool's `worktrees/` are ignored). Once any area is built and the marker is written, drift detection picks the platform up on subsequent checks. Build mode always copies and writes the marker.

## Where to look

- `scripts/ai-skills/build.ts` — the copy and cleanup orchestration in `main()`
- `.ai-skills/definitions/paths.json` — `canonical.contentRoot` and `generated.platformContentCopies` declare the source/target dirs
