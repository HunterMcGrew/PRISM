---
title: "What PRISM writes"
description: "The complete inventory of every path prism adopt, update, and eject can create or modify in your repo — grouped by who owns it."
category: "getting-started"
audience: "developer-user"
last_updated: "2026-11-19"
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

These are kept current by `prism update`. Most live under `.prism/`. `REVIEW.md` sits at the repo root, the rows from `.claude/hooks/` on are the hook runtime and the git hooks, and the last row is the one line PRISM adds to your `.gitattributes`. If you edit one of the `.prism/` rows directly, your edit is preserved in a `.bak` file the next time PRISM syncs — it's never silently discarded (see [Diverged files and `.bak` backups](#diverged-files-and-bak-backups) below). The `REVIEW.md` and hook rows follow their own rule, stated in each row: a copy that still carries PRISM's marker line is replaced in place with no backup, so an edit you make there and leave the marker on is lost on the next update.

| Path | What's there |
|---|---|
| `.prism/rules/**` | Cross-cutting rules loaded into every AI agent session — code standards, git conventions, the branch-plan protocol, and so on |
| `.prism/architect/_toolkit/**` | PRISM's own architect-context files (the `_toolkit` subdirectory, and `guides/` below — flat files directly under `architect/` are yours, see below) |
| `.prism/architect/guides/**` | The writing guides for plans, rules, skills, ADRs, and architect docs, which agents read before editing those files |
| `.prism/spec/adrs/_toolkit/**` | PRISM's own architectural decision records (again, only the `_toolkit` subdirectory — flat ADR files are yours) |
| `.prism/spec/**` | The tier hierarchy and spec-ownership model, excluding the consumer carve-outs listed below |
| `.prism/templates/**` | PR description, acceptance-criteria, and bug-report templates |
| `.prism/references/**` | Operational reference docs shared across skills (startup sequences, doc-writing guides, and similar) |
| `.prism/review/*.md` | The pass files the review stages run, one per pass in `REVIEW.md`. Your own stack checks live in `.prism/review/stack/`, listed below |
| `REVIEW.md` (repo root) | The review rulebook: severity, the finding shape, the exit rule, and the table of passes. Its first line is a marker comment beginning `<!-- prism:review`. `prism adopt` and `prism update` write it when absent, and replace a copy that carries the marker and differs from PRISM's in place, with no backup. A copy without the marker is yours, so the update never touches it and prints a warning. `prism doctor` warns when it is missing or a marked copy is out of date and reports an unmarked one as info. `prism eject` removes a marked copy and keeps an unmarked one. To keep your own rulebook, delete the marker line first |
| `.prism/SPEC.md` | The top-level spec file describing how the tier system works |
| `.claude/hooks/git-hooks/*.mjs` | The pre-commit hook, the pre-push hook, and the installer, delivered with the agent hook runtime to every install, whatever `hosts` holds. A copy carrying PRISM's marker line is replaced in place with no backup; one without it is backed up to `.bak` first |
| `.claude/hooks/plan/*.mjs` | The plan-chain scripts: the task parser, plan lookup, bundle check, auto-approval, stop-path matcher, and commit script, plus the two approval scripts below. They arrive with the hook runtime on every install, so a Cursor-only install gets them too. A copy carrying PRISM's marker line is replaced in place with no backup; one without it is backed up to `.bak` first |
| `.claude/hooks/plan/watch-ci.mjs` | The script that waits for a PR's CI to settle on its newest commit, which the PR stage runs after each push. Same replace rule as the row above |
| `.claude/hooks/review/reconcile.mjs` | The script the PR review runs afterward: it replies to and resolves the review's own threads that a later commit fixed, corrects the review labels, and reports what is still unclean. It needs a signed-in `gh`. Same replace rule as the row above |
| `.claude/hooks/verify/check-report.mjs` | The script that checks the `## Verification` section the verify stage wrote into `plan.md`. It reads local files only. Same replace rule as the row above |
| `.claude/hooks/lib/tokenize.mjs`, `.claude/hooks/lib/segments.mjs` | The shell parser every gate reads commands with. They arrive with the hook runtime on every install. Same replace rule as the row above |
| `.claude/hooks/plan/approve.mjs` | The script a person runs to approve a plan-chain file, with a keypress in their own terminal or, in an agent session, on a chat approval token. It arrives on every install, so a Cursor user can approve from a terminal. Same replace rule as the row above |
| `.claude/hooks/plan/chat-approval.mjs` | The chat approval token's file name, prompt parser, and helpers, which `approve.mjs` and the approval guard share. Same replace rule as the row above |
| `.claude/hooks/approve-guard.mjs` | The approval guard, a hook entry point that denies an agent running `approve.mjs` without your chat approval or editing a chain file's approval lines. It arrives on every install and fires only where `.claude/settings.json` or `.codex/hooks.json` registers it. Same replace rule as the row above |
| `.claude/hooks/secrets-gate.mjs`, `.claude/hooks/env-keys.mjs` | The secrets gate, which denies an agent reading, searching, or shell access to `.env` files, `secrets/` folders, and `.pem` and `.key` files, and `env-keys.mjs`, which prints a dotenv file's key names and never a value. They arrive on every install, and the gate fires where `.claude/settings.json` or `.codex/hooks.json` registers it. Same replace rule as the row above |
| `.githooks/pre-commit`, `.githooks/pre-push` | The two shims git runs. A shim carrying PRISM's marker line is replaced in place with no backup, so a step of your own belongs in a hook without the marker line: a `.githooks` file without it is yours and is never touched, `.bak` included. Delivered only when `hosts` includes `claude` or `codex`, unlike the runtime files above |
| `.gitattributes` | One appended line, `.prism/metrics/review-misses.jsonl merge=union`, so two branches that each add a review-miss row merge without a conflict. It is added when absent, never rewritten, and follows no `hosts` setting |

`prism adopt` and `prism update` also set `core.hooksPath` to `.githooks` in this clone's local git config, but only when it is unset or already points at a `.githooks` in this repo. A value pointing anywhere else, at any git config scope, is left alone and reported, so husky, lefthook, and a team-wide hooks path keep working. So are hooks already in `.git/hooks`, which git would stop running once the value is set. `prism hooks install` runs the same step by hand, and it also gives a PRISM shim the executable bit when a checkout lost it, because git skips a hook without it. If you later drop both `claude` and `codex` from `hosts`, `prism update` removes the shims and, once `.githooks/` is gone, unsets a `core.hooksPath` of `.githooks`. That setting is per clone, so a teammate who pulled the deletion gets it unset on their own next `prism update`. It is also shared by every worktree of the clone, so `prism update` leaves it set while another worktree still has PRISM's shims in its `.githooks/`. The hooks run the formatter and linter you name under `gitHooks` in `.ai-skills/config.json` and skip when that block is absent. See [Parameterization](./parameterization.md).

The chat approval token, `prism-chat-approval.json`, lives inside the repo's git directory and never appears in your working tree. The approval guard writes it when you type `approve` in chat.

## PRISM-owned platform mirrors (synced on every update)

`prism update` and `prism adopt` also mirror a subset of `.prism/` into every AI platform directory your config enables — `.claude/`, `.codex/`, and `.cursor/` by default (the exact target roots live in `.ai-skills/definitions/paths.json` under `generated.platformContentCopies` — see [Seed-once paths](#seed-once-paths-written-once-then-left-alone) below for how that file itself gets there). This is a second PRISM-owned write surface, separate from the `.prism/` paths above: every path it touches lives inside your own repo, outside `.prism/`.

The mirrored areas are `rules`, `architect`, `spec`, `templates`, `references`, and `review`, plus the loose `SPEC.md` file — the `COPIED_CONTENT_AREAS` list in `scripts/ai-skills/build.ts`. Notably absent: `plans/` and `lessons.md` never leave `.prism/`, since those are agent-written working memory, not synced content.

| When | What happens |
|---|---|
| Every `prism update` | `runUpdate` calls `refreshPlatformDirs`, which calls `syncAllPlatformContentCopies` — each enabled platform directory gets a fresh copy of the areas above, with token substitution and per-platform dialect transforms applied |
| Every `prism adopt` | The same sync pass runs as part of the initial file pass, so the mirrors exist from the first adopt |

Each synced area directory carries a marker file (`Managed by scripts/ai-skills/build.ts`) that PRISM uses two ways: to tell a genuinely unbuilt platform apart from drift during `prism doctor` / check mode, and to gate orphan cleanup — if a file that previously existed in the source area is removed from `.prism/`, its mirrored copy is deleted from the platform directory on the next sync, but only inside marker-carrying areas. A platform directory with no marker (never built) is left alone rather than reported as drift.

These mirrors are generated output, not a second copy for you to maintain — don't hand-edit files under `.claude/rules/`, `.claude/architect/`, `.claude/spec/`, `.claude/templates/`, `.claude/references/`, `.claude/review/` (or the `.codex`/`.cursor` equivalents). Anything you write there is overwritten on the next sync with no `.bak` protection — the divergence-and-backup mechanism described below applies to canonical `.prism/` paths, not to these generated platform copies. If you need a permanent customization, it belongs in `.prism/custom/` (mirrored via the same mechanism into each platform's `custom/` subdirectory) or another consumer-owned path.

## Consumer-owned paths (never touched after creation)

PRISM's sync passes never write to these paths once they exist — not on `adopt`, not on any later `update`. This is where your own customizations, decisions, and working history belong.

| Path | What's there |
|---|---|
| `.prism/architect/*.md` (flat files, not inside `_toolkit/`) | Your own architect-context docs — PRISM only manages the `_toolkit/` and `guides/` subdirectories inside `architect/` |
| `.prism/spec/adrs/*.md` (flat files, not inside `_toolkit/`) | Your own ADRs |
| `.prism/architect/manifest.json` | Your own architect-doc manifest |
| `.prism/custom/**` | Anything you put here — PRISM's sync never looks inside this directory |
| `.prism/plans/**` | Branch plans — the working memory personas read and write as they implement tickets |
| `.prism/lessons.md` | The running log of corrections and patterns your team has taught the AI agents |
| `.prism/review/stack/**` | Your own review checks, at most one file per pass: `architecture.md` and `security.md` when the repo has a matching rule, and `correctness.md` when a language was detected and `commands.typecheck` or `commands.test` is set. Onboarding writes them, keeps a file that already exists, and an update never writes or removes anything here |
| `.prism/metrics/review-misses.jsonl` | The log of human review comments the agent review missed, one JSON line each. The PR review appends to it and the first row creates the file, so it is never shipped empty |

> [!NOTE]
> `.prism/spec/**` overlaps on purpose: the broad PRISM-owned glob claims the whole tree, and the narrower consumer-owned glob for flat ADR files carves your own ADRs back out of it. Under `architect/`, PRISM owns only `_toolkit/` and `guides/`. A file directly under `architect/` (like `architect/my-feature.md`) is yours.

## Seed-once paths (written once, then left alone)

| Path | Written when | What happens after |
|---|---|---|
| `.ai-skills/definitions/paths.json` | Absent, or present but missing `generated.platformContentCopies` | `prism adopt` copies PRISM's own `paths.json` in verbatim, before the rest of adopt runs — `update` reads this file, so adopt provisions it first. A complete existing file is left untouched, including a customized one; this isn't a strict one-time seed, since a broken file gets repaired even after it "exists," but the effect is the same once it's complete — PRISM stops touching it. |
| `.claude/settings.json` | Doesn't already exist | Written from PRISM's install seed, carrying the architect-context hook's `PreToolUse`, `PostToolUse`, `PostCompact`, `PreCompact`, and `SessionStart` registrations, plus the approval guard's `PreToolUse` and `UserPromptSubmit` registrations. `PreToolUse` is the write gate — a write, a delete, or any other call touching a routed path is held until the route's doc is read, and `PRISM_HOOK_DENY_DISABLE=1` turns it off. If it already exists, it is merged rather than seeded — your permissions, env vars, and your own hook entries survive, and only PRISM's own prior entries (identified by the command path of a PRISM entry point under `.claude/hooks/`) are replaced. |
| `AGENTS.md` (root) | Only if you pass `--seed-agents-md` to `prism adopt`, and only if `AGENTS.md` doesn't already exist | Written with a heading, a provenance comment (`<!-- prism:seeded-agents-md ... -->`), and an empty begin/end marker pair that `pnpm prism:build` (or your team's build step) fills with PRISM's Tier-1 rule content on the next build. Every subsequent build keeps that block current — the file itself is never re-seeded once it exists. The provenance comment is what lets `prism eject` tell a PRISM-seeded `AGENTS.md` apart from one you wrote yourself; delete the comment line if you want to keep a seeded file after ejecting. |
| `CLAUDE.md` | Doesn't already exist | Not created by `prism adopt` at all — you write this yourself, or generate it via Atlas onboarding. If it already exists, adopt never touches it. |
| Persona skill directories (`.claude/skills/prism-*`, `.codex/skills/prism-*`, `.cursor/skills/prism-*`) | Roster projection, run on every `adopt`/`update` | Not strictly seed-once — these regenerate on every sync, but only files inside the `prism-`-prefixed directories that also carry PRISM's generated-file marker. A skill you name anything else, or a `prism-*` directory without the marker, is never read, written, or deleted by PRISM. |

## What `prism doctor` does — nothing gets written

`prism doctor` is read-only. It validates your `.ai-skills/config.json` against its schema, confirms you're inside a git repository, reports drift between your sync manifest and what's actually on disk (including pairing diverged files with any `.bak` siblings already sitting there from a prior update), confirms `.prism/architect/manifest.json` and `.prism/SPEC.md` were actually delivered under those names rather than left as their seed names, checks the root `REVIEW.md` once the repo has adopted, checks your installed version against the latest on npm, and reports whether PRISM's git hooks are installed in this clone, left alone because another hooks path is in force, or delivered but not yet installed. It never writes a file — running `prism doctor` as often as you like is always safe.

## What `prism eject` removes

`prism eject` is the inverse of `adopt` — it removes PRISM-owned `.prism/` content, the `prism-*` skill and agent directories it generated, and the sync manifest itself. It also removes the root `REVIEW.md` when its first line carries the marker, and keeps one without it. It never touches consumer-owned content: `plans/`, `lessons.md`, `custom/`, `review/stack/`, your flat architect docs, and your flat ADRs are explicitly preserved. If a PRISM-owned file has diverged (you edited it) at the moment you eject, that edit is backed up to `.bak` before removal, the same protection `update` gives you. A root `AGENTS.md` is only removed if it carries the `--seed-agents-md` provenance marker; otherwise it's left alone with a note that you can review it yourself. `CLAUDE.md` is never removed automatically. `eject` requires `--yes` and defaults to a dry run otherwise — see [docs/adopt-prism.md](./adopt-prism.md) for the full command reference.

`eject` does not yet remove the hook runtime under `.claude/hooks/`, the `.githooks/pre-commit` and `.githooks/pre-push` shims, or the `core.hooksPath` setting, so the git hooks keep running after an eject until you delete the two shims and unset `core.hooksPath`.

## Diverged files and `.bak` backups

Every write to a PRISM-owned path goes through the same divergence check, whether it happens during `update` or during the sync pass inside `adopt`: PRISM compares the incoming content, what's currently in your repo, and the hash it recorded the last time it wrote that file. If your copy still matches what PRISM last wrote, it's overwritten cleanly. If your copy has changed — meaning you or someone on your team edited a PRISM-owned file directly — the original is preserved as `<file>.bak` (or `.bak.1`, `.bak.2`, and so on, if earlier backups are already sitting there) before the new version replaces it. Nothing is ever silently discarded, with one exception: the two git hook rows under [PRISM-owned paths](#prism-owned-paths-synced-on-every-update) replace a copy that still carries PRISM's marker line without a backup.

For the full conflict-resolution walkthrough — what to do with a `.bak` once it appears, and how to move a repeat customization into a consumer-owned path so it stops getting backed up on every sync — see [docs/adopting-into-existing-repos.md](./adopting-into-existing-repos.md).

## The sync manifest

Every adopted repo carries a `.sync-manifest.json` inside `.prism/`, recording the hash of every PRISM-owned file as of the last sync, along with the PRISM version and source commit that produced it. This is what lets `update` tell "unchanged" apart from "you edited this" apart from "PRISM changed this since your last sync," and what lets `doctor` report drift without doing a full content diff. You never need to hand-edit this file — it's PRISM's own bookkeeping, updated automatically on every `adopt`, `update`, and `eject`.

## Related pages

- [SECURITY.md](../SECURITY.md) — the trust model this inventory supports, and how to report a security issue
- [docs/adopting-into-existing-repos.md](./adopting-into-existing-repos.md) — the coexistence guide and full `.bak` conflict-resolution workflow
- [docs/adopt-prism.md](./adopt-prism.md) — the full adopt/update/eject command reference, including `--dry-run`
- [docs/troubleshooting.md](./troubleshooting.md) — what to do when adopt, update, or a build fails
