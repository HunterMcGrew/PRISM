---
title: "What PRISM writes"
description: "The complete inventory of every path prism adopt, update, and eject can create or modify in your repo — grouped by who owns it."
category: "getting-started"
audience: "developer-user"
last_updated: "2026-07-02"
---

# What PRISM writes

This page is the complete inventory of every path `prism adopt`, `prism update`, and `prism eject` can touch in your repository. If you're deciding whether to adopt PRISM into a repo you care about, read this first — it names every file PRISM can create or modify, and which of those you're free to hand-edit without a future `prism update` overwriting your changes.

The source of truth for the ownership split is `scripts/ai-skills/ownership.ts` in the PRISM repo — a glob-based classifier, not a judgment call made per-file at write time. This doc mirrors that classification.

## The three categories

Every path PRISM manages falls into one of three buckets:

- **PRISM-owned** — content PRISM generates and keeps in sync. `prism update` overwrites these on every run (backing up your edits first if you've diverged — see below). Don't hand-edit these expecting your changes to survive; if you need a permanent customization, put it in a consumer-owned path instead.
- **Consumer-owned** — content that's yours from the moment it's created. PRISM's sync never touches these paths again after the initial seed, no matter how many times you run `update`.
- **Seed-once** — written exactly once, only when the path doesn't already exist. After that first write, the file behaves like consumer-owned content — PRISM never comes back to it.

## PRISM-owned paths (synced on every update)

These live under `.prism/` and are kept current by `prism update`. If you edit one directly, your edit is preserved in a `.bak` file the next time PRISM syncs — it's never silently discarded (see [Diverged files and `.bak` backups](#diverged-files-and-bak-backups) below).

| Path | What's there |
|---|---|
| `.prism/rules/**` | Cross-cutting rules loaded into every AI agent session — code standards, git conventions, the branch-plan protocol, and so on |
| `.prism/architect/_toolkit/**` | PRISM's own architect-context files (the `_toolkit` subdirectory only — flat files directly under `architect/` are yours, see below) |
| `.prism/spec/adrs/_toolkit/**` | PRISM's own architectural decision records (again, only the `_toolkit` subdirectory — flat ADR files are yours) |
| `.prism/spec/**` | The tier hierarchy and spec-ownership model, excluding the consumer carve-outs listed below |
| `.prism/templates/**` | PR description, acceptance-criteria, and bug-report templates |
| `.prism/references/**` | Operational reference docs shared across skills (startup sequences, doc-writing guides, and similar) |
| `.prism/SPEC.md` | The top-level spec file describing how the tier system works |

## PRISM-owned platform mirrors (synced on every update)

`prism update` and `prism adopt` also mirror a subset of `.prism/` into every AI platform directory your config enables — `.claude/`, `.codex/`, and `.cursor/` by default (the exact target roots live in `.ai-skills/definitions/paths.json` under `generated.platformContentCopies` — see [Seed-once paths](#seed-once-paths-written-once-then-left-alone) below for how that file itself gets there). This is a second PRISM-owned write surface, separate from the `.prism/` paths above: every path it touches lives inside your own repo, outside `.prism/`.

The mirrored areas are `rules`, `architect`, `spec`, `templates`, and `references`, plus the loose `SPEC.md` file — the `COPIED_CONTENT_AREAS` list in `scripts/ai-skills/build.ts`. Notably absent: `plans/` and `lessons.md` never leave `.prism/`, since those are agent-written working memory, not synced content.

| When | What happens |
|---|---|
| Every `prism update` | `runUpdate` calls `refreshPlatformDirs`, which calls `syncAllPlatformContentCopies` — each enabled platform directory gets a fresh copy of the areas above, with token substitution and per-platform dialect transforms applied |
| Every `prism adopt` | The same sync pass runs as part of the initial file pass, so the mirrors exist from the first adopt |

Each synced area directory carries a marker file (`Managed by scripts/ai-skills/build.ts`) that PRISM uses two ways: to tell a genuinely unbuilt platform apart from drift during `prism doctor` / check mode, and to gate orphan cleanup — if a file that previously existed in the source area is removed from `.prism/`, its mirrored copy is deleted from the platform directory on the next sync, but only inside marker-carrying areas. A platform directory with no marker (never built) is left alone rather than reported as drift.

These mirrors are generated output, not a second copy for you to maintain — don't hand-edit files under `.claude/rules/`, `.claude/architect/`, `.claude/spec/`, `.claude/templates/`, `.claude/references/` (or the `.codex`/`.cursor` equivalents). Anything you write there is overwritten on the next sync with no `.bak` protection — the divergence-and-backup mechanism described below applies to canonical `.prism/` paths, not to these generated platform copies. If you need a permanent customization, it belongs in `.prism/custom/` (mirrored via the same mechanism into each platform's `custom/` subdirectory) or another consumer-owned path.

## Consumer-owned paths (never touched after creation)

PRISM's sync passes never write to these paths once they exist — not on `adopt`, not on any later `update`. This is where your own customizations, decisions, and working history belong.

| Path | What's there |
|---|---|
| `.prism/architect/*.md` (flat files, not inside `_toolkit/`) | Your own architect-context docs — PRISM only manages the `_toolkit/` subdirectory inside `architect/` |
| `.prism/spec/adrs/*.md` (flat files, not inside `_toolkit/`) | Your own ADRs |
| `.prism/architect/manifest.json` | Your own architect-doc manifest |
| `.prism/custom/**` | Anything you put here — PRISM's sync never looks inside this directory |
| `.prism/plans/**` | Branch plans — the working memory personas read and write as they implement tickets |
| `.prism/lessons.md` | The running log of corrections and patterns your team has taught the AI agents |

> [!NOTE]
> `.prism/architect/**` and `.prism/spec/**` overlap on purpose: the broad PRISM-owned glob claims the whole tree, and the narrower consumer-owned glob for flat files carves your own docs back out of it. A file directly under `architect/` (like `architect/my-feature.md`) is yours; a file under `architect/_toolkit/` is PRISM's.

## Seed-once paths (written once, then left alone)

| Path | Written when | What happens after |
|---|---|---|
| `.ai-skills/definitions/paths.json` | Absent, or present but missing `generated.platformContentCopies` | `prism adopt` copies PRISM's own `paths.json` in verbatim, before the rest of adopt runs — `update` reads this file, so adopt provisions it first. A complete existing file is left untouched, including a customized one; this isn't a strict one-time seed, since a broken file gets repaired even after it "exists," but the effect is the same once it's complete — PRISM stops touching it. |
| `.claude/settings.json` | Doesn't already exist | Written as a literal empty object (`{}`) — a placeholder, not a hook definition. If it already exists, adopt leaves it (and any hooks or permissions you've configured) completely untouched. |
| `AGENTS.md` (root) | Only if you pass `--seed-agents-md` to `prism adopt`, and only if `AGENTS.md` doesn't already exist | Written with a heading, a provenance comment (`<!-- prism:seeded-agents-md ... -->`), and an empty begin/end marker pair that `pnpm prism:build` (or your team's build step) fills with PRISM's Tier-1 rule content on the next build. Every subsequent build keeps that block current — the file itself is never re-seeded once it exists. The provenance comment is what lets `prism eject` tell a PRISM-seeded `AGENTS.md` apart from one you wrote yourself; delete the comment line if you want to keep a seeded file after ejecting. |
| `CLAUDE.md` | Doesn't already exist | Not created by `prism adopt` at all — you write this yourself, or generate it via Atlas onboarding. If it already exists, adopt never touches it. |
| Persona skill directories (`.claude/skills/prism-*`, `.codex/skills/prism-*`, `.cursor/skills/prism-*`) | Roster projection, run on every `adopt`/`update` | Not strictly seed-once — these regenerate on every sync, but only files inside the `prism-`-prefixed directories that also carry PRISM's generated-file marker. A skill you name anything else, or a `prism-*` directory without the marker, is never read, written, or deleted by PRISM. |

## What `prism doctor` does — nothing gets written

`prism doctor` is read-only. It validates your `.ai-skills/config.json` against its schema, confirms you're inside a git repository, reports drift between your sync manifest and what's actually on disk (including pairing diverged files with any `.bak` siblings already sitting there from a prior update), and checks your installed version against the latest on npm. It never writes a file — running `prism doctor` as often as you like is always safe.

## What `prism eject` removes

`prism eject` is the inverse of `adopt` — it removes PRISM-owned `.prism/` content, the `prism-*` skill and agent directories it generated, and the sync manifest itself. It never touches consumer-owned content: `plans/`, `lessons.md`, `custom/`, your flat architect docs, and your flat ADRs are explicitly preserved. If a PRISM-owned file has diverged (you edited it) at the moment you eject, that edit is backed up to `.bak` before removal, the same protection `update` gives you. A root `AGENTS.md` is only removed if it carries the `--seed-agents-md` provenance marker; otherwise it's left alone with a note that you can review it yourself. `CLAUDE.md` is never removed automatically. `eject` requires `--yes` and defaults to a dry run otherwise — see [docs/adopt-prism.md](./adopt-prism.md) for the full command reference.

## Diverged files and `.bak` backups

Every write to a PRISM-owned path goes through the same divergence check, whether it happens during `update` or during the sync pass inside `adopt`: PRISM compares the incoming content, what's currently in your repo, and the hash it recorded the last time it wrote that file. If your copy still matches what PRISM last wrote, it's overwritten cleanly. If your copy has changed — meaning you or someone on your team edited a PRISM-owned file directly — the original is preserved as `<file>.bak` (or `.bak.1`, `.bak.2`, and so on, if earlier backups are already sitting there) before the new version replaces it. Nothing is ever silently discarded.

For the full conflict-resolution walkthrough — what to do with a `.bak` once it appears, and how to move a repeat customization into a consumer-owned path so it stops getting backed up on every sync — see [docs/adopting-into-existing-repos.md](./adopting-into-existing-repos.md).

## The sync manifest

Every adopted repo carries a `.sync-manifest.json` inside `.prism/`, recording the hash of every PRISM-owned file as of the last sync, along with the PRISM version and source commit that produced it. This is what lets `update` tell "unchanged" apart from "you edited this" apart from "PRISM changed this since your last sync," and what lets `doctor` report drift without doing a full content diff. You never need to hand-edit this file — it's PRISM's own bookkeeping, updated automatically on every `adopt`, `update`, and `eject`.

## Related pages

- [SECURITY.md](../SECURITY.md) — the trust model this inventory supports, and how to report a security issue
- [docs/adopting-into-existing-repos.md](./adopting-into-existing-repos.md) — the coexistence guide and full `.bak` conflict-resolution workflow
- [docs/adopt-prism.md](./adopt-prism.md) — the full adopt/update/eject command reference, including `--dry-run`
- [docs/troubleshooting.md](./troubleshooting.md) — what to do when adopt, update, or a build fails
