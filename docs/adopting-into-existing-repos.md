---
title: "Adopting PRISM into an existing repo"
description: "How PRISM coexists with a repo that already has its own AI tooling — what adopt touches, what it skips, and how to resolve .bak files after an update."
category: "getting-started"
audience: "developer-user"
last_updated: "2026-07-02"
---

# Adopting PRISM into an existing repo

If your repo already has its own AI tooling — a hand-written `AGENTS.md`, an existing `.claude/skills/` directory from another toolkit, `.cursor/rules`, a `.claude/settings.json` with hooks you rely on — you can still run `prism adopt`. PRISM is built to seed alongside existing setup, not replace it. This guide covers exactly what adopt touches, what it leaves alone, and what to do with the `.bak` files that show up if a later `prism update` finds a file you've since edited.

For the general adopt/update/eject walkthrough, see [docs/adopt-prism.md](./adopt-prism.md). This guide is the coexistence-specific companion — read it before adopting into a repo that isn't greenfield.

## The short version

`prism adopt` never overwrites a file that's already there. Every write it makes is either into a fresh subdirectory it created (`.prism/`, the `prism-*` skill folders) or into a file that didn't previously exist. If you've got existing content at any of the paths PRISM would otherwise write to, adopt quietly skips that path and moves on.

The one thing to know going in: **if your repo already has an `AGENTS.md`, PRISM's constitution content — the cross-cutting rules every Codex-based agent needs — does not get seeded into it.** Adopt won't touch your existing `AGENTS.md` at all, which also means the generated rules block never lands there. See [When you already have an AGENTS.md](#when-you-already-have-an-agentsmd) below for what to do about it.

## What adopt touches vs. skips

`prism adopt` does two things: it seeds `.prism/` from PRISM's install surface, and it projects the persona skill roster into `.claude/`, `.codex/`, and `.cursor/`. Both passes follow the same rule — an existing file at the target path is left untouched.

| Path | If it already exists | If it doesn't |
|---|---|---|
| `.prism/**` (rules, architect docs, templates, references) | Skipped, file-by-file | Written from the install seed |
| `AGENTS.md` | Left alone entirely — no PRISM content is added | Not created by `prism adopt` (see note below) |
| `CLAUDE.md` | Left alone entirely | Not created by `prism adopt` (see note below) |
| `.claude/settings.json` | Left alone — your hooks, permissions, and env vars survive | Written as an empty `{}` — PRISM ships no default hooks |
| `.claude/skills/`, `.codex/`, `.cursor/skills/` | Existing non-PRISM skills are untouched; PRISM adds its own `prism-*` entries alongside them | `prism-*` skill roster written |
| `.cursor/rules` | Left alone — no PRISM content merges into it | Not created by `prism adopt` |

**Why `AGENTS.md` and `CLAUDE.md` aren't in the seed step:** the seed pass (`seedConsumerContentRoot` in `scripts/ai-skills/adopt.ts`) only ever writes into `.prism/`. Neither file is part of PRISM's current install seed, so on a fresh repo `prism adopt` doesn't create either — you'd still need to hand-write or generate them yourself (or run Atlas, PRISM's onboarding persona, which does populate rule content for a truly greenfield repo). What adopt guarantees is narrower and more important for coexistence: **if either file already exists, PRISM will never overwrite or append to it during `adopt` or `update`.**

> [!NOTE]
> `.claude/settings.json` ships from PRISM's install surface as a literal empty object (`templates/install/.claude/settings.json` contains just `{}`). If the file doesn't exist yet, adopt writes that empty shell — it's a placeholder, not a hook definition. If a `.claude/settings.json` already exists, adopt leaves it completely alone, hooks and all.

## Why a pre-existing AGENTS.md matters most for Codex

If you're only using Claude Code, a missing `AGENTS.md` is a minor gap — Claude reads `CLAUDE.md` and the generated `.claude/skills/` directly. Codex-based agents are different: **Codex auto-loads only `AGENTS.md`.** To make sure Codex sessions see PRISM's Tier-1 rules (the cross-cutting rules with no `paths:` scoping — the ones every session needs regardless of what it's touching), PRISM's build inlines their full bodies into a generated block inside `AGENTS.md`.

That inlining step (`syncAgentsMdTier1Block` in `scripts/ai-skills/build.ts`) only ever *updates* an `AGENTS.md` that's already there — if the file is absent, the function returns immediately and creates nothing. So on a repo that had its own `AGENTS.md` before adopting PRISM, that file keeps whatever it already said, and the PRISM rules block is simply never added. Functionally, this means: **a pre-existing `AGENTS.md` means PRISM's constitution content is not seeded for Codex agents on that repo**, until you add it yourself.

### When you already have an AGENTS.md

You have two options:

1. **Leave it as-is.** If your existing `AGENTS.md` already covers what your Codex agents need, there's nothing to do. PRISM's rules still apply to Claude Code sessions (which read `.prism/rules/` directly through the generated skills), just not to Codex sessions reading only `AGENTS.md`.
2. **Add PRISM's generated block by hand.** Run `pnpm prism:build` (or `prism update` again after making a first pass) to see what the generated Tier-1 block would look like, then paste it into your `AGENTS.md` yourself, wrapped in the same begin/end markers PRISM uses. Once that block exists in your file, future `prism update` runs will keep it current automatically — the sync only skips *creating* the file, not updating a block that's already present in one.

### When you don't have an AGENTS.md: the opt-in auto-seed

If `AGENTS.md` is absent, you can skip the hand-authoring step above entirely by passing `--seed-agents-md` to adopt:

```bash
prism adopt --seed-agents-md
```

**What the flag does.** When `AGENTS.md` doesn't exist at your repo root, adopt writes a minimal one — a heading, a provenance comment (see below), and an empty pair of the same begin/end markers `pnpm prism:build` already knows how to fill. The next time you run `pnpm prism:build`, that empty pair gets populated with the full Tier-1 rule bodies, exactly as if you'd pasted the block in by hand per option 2 above. Every build after that keeps it current automatically, the same as any other `AGENTS.md` that already carries the markers.

**The no-overwrite guarantee still holds.** The flag only ever writes when `AGENTS.md` is absent. If a file already exists — hand-written, seeded by something else, whatever — adopt leaves it byte-for-byte untouched, with or without `--seed-agents-md` on the command line. This is opt-in, not automatic: without the flag, adopt behaves exactly as described above (it prints the absent-`AGENTS.md` warning and creates nothing).

**Provenance and reversibility.** A seeded file carries an HTML-comment marker (`<!-- prism:seeded-agents-md ... -->`) recording that `prism adopt --seed-agents-md` created it. `prism eject` reads that marker to decide what to do with the file:

- **Marker present** — the file is PRISM's, so `eject` removes it and reports that it did.
- **Marker absent** — either you wrote the file yourself, or you deleted the marker line on purpose. Either way, `eject` treats it as yours and preserves it.

That second case is the deliberate escape hatch: if you want to keep a seeded `AGENTS.md` after ejecting PRISM, delete the marker comment line before you run `prism eject`. Once the marker's gone, the file is yours as far as PRISM is concerned.

## Skill-prefix rules and how consumer-owned skills coexist

Every skill PRISM generates uses the `prism-` prefix — `prism-code-dev`, `prism-architect`, and so on. This is the whole coexistence mechanism for skills: PRISM only ever regenerates or deletes files under that prefix, marked with its own generated-file marker. A skill you or another toolkit already installed under any other name — an org-specific prefix like `acme-code-review`, or a fully custom name — is invisible to PRISM's sync. It's never read, never overwritten, never deleted.

If you're adopting PRISM alongside skills from another toolkit that also uses hyphenated names, the only collision risk is a skill actually named `prism-<something>` that you authored yourself. PRISM's cleanup pass only deletes a `prism-*` directory if it also carries PRISM's managed-file marker — a hand-authored `prism-*` skill without that marker is left alone, but it's still worth avoiding the prefix for your own skills to keep the namespace unambiguous.

**Your own skill naming convention.** Two safe options:

- Use your organization's name or a project-specific prefix (`acme-<role>`, `<team>-<role>`).
- Use a `custom-<role>` prefix — PRISM's own docs use this pattern for examples.

Either way, avoid `prism-` entirely for anything you author by hand.

## How the always-loaded skill-routing table interacts with existing skills

PRISM ships one always-loaded rule, `.prism/rules/skill-routing.md`, that maps phrases like "fix this" or "review pr" to a specific PRISM persona. This table is loaded into every conversation once PRISM is adopted, which means it's actively steering intent-detection alongside whatever routing your existing tooling already does.

If your existing setup has its own routing conventions — a different skill that also wants to own "review this PR," for instance — the two systems don't automatically defer to each other. PRISM's routing table has no awareness of skills outside its own roster. The practical effect: if you invoke a persona by name ("Clove, fix this"), routing is unambiguous. If you rely on the generic phrase-matching instead, you may see both your existing skill and a PRISM persona respond to the same trigger phrase, depending on how the agent resolves the ambiguity.

**To add your own routing entries**, extend the table in `.prism/rules/skill-routing.md` directly — it's a Tier-1 rule under `.prism/rules/`, which is PRISM-owned (see the ownership table below), so hand-edits here follow the same `.bak`-on-divergence path as any other PRISM-owned file on your next `prism update`. If you want routing entries that are guaranteed to survive updates untouched, put them in a consumer-owned location instead — `.prism/architect/<topic>.md` (flat files directly under `architect/`, not `architect/_toolkit/`) is a safe place to document your own skill's triggers, since PRISM's sync never touches that path.

## The `.bak` conflict-resolution workflow

`.bak` files only ever appear under `.prism/`, and only for files PRISM owns (see the ownership split below). They never apply to `AGENTS.md`, `CLAUDE.md`, or anything at your repo root — those are handled by the skip-if-exists rule above, not the backup rule.

### What counts as PRISM-owned

`scripts/ai-skills/ownership.ts` decides this with a glob match, not a guess:

- **PRISM-owned** (subject to `.bak` backup on divergence): `architect/_toolkit/**`, `spec/adrs/_toolkit/**`, `rules/**`, `templates/**`, `references/**`, `spec/**`, `SPEC.md`.
- **Consumer-owned** (never touched by sync, never backed up): flat `architect/*.md` files, flat `spec/adrs/*.md` files, `architect/manifest.json`, `custom/**`, `plans/**`, `lessons.md`.

The flat-file carve-out matters: `.prism/architect/my-feature.md` is yours — PRISM only manages the `_toolkit/` subdirectory inside `architect/`. Same idea for `spec/adrs/` — your own ADRs at the top level are untouched; only `spec/adrs/_toolkit/` is PRISM's.

### When a `.bak` appears

Each `prism update` (and the sync pass inside `prism adopt`) compares three things for every PRISM-owned file: the incoming PRISM content, what's currently in your repo, and the hash PRISM recorded the last time it wrote that file. A `.bak` gets created specifically when your copy has diverged from what PRISM last wrote — meaning you (or someone) edited a PRISM-owned file directly.

When that happens:

1. Your edited version is copied to `<file>.bak` before the incoming PRISM version overwrites the original path.
2. If `<file>.bak` already exists from an earlier divergence and its content differs from your latest edit, the new copy goes to `<file>.bak.1`, then `.bak.2`, and so on — PRISM never clobbers an earlier snapshot to make room for a new one.
3. The command's output lists every `.bak` path it wrote, so you don't have to go looking for them.

### Resolving a `.bak`

A `.bak` file means: "you customized this file, and the update just replaced it with PRISM's current version." Your options:

- **Keep PRISM's version.** Do nothing further — the live file is already PRISM's latest. Delete the `.bak` once you've confirmed you don't need your edits (or just leave it; PRISM never reads `.bak` files back in).
- **Keep your version.** Copy the `.bak` content back over the live file. On the *next* `prism update`, your restored edits will look diverged again (since they don't match PRISM's incoming content) and will get backed up again before being overwritten — this repeats on every future sync unless you either stop editing that specific file, or move your customization to a consumer-owned location instead (see below).
- **Merge the two.** Diff the `.bak` against the live file and hand-merge whatever from your edit you want to keep into PRISM's new version.

**Should you commit the `.bak`?** No — treat it the same as any other local scratch artifact. `.bak` files are diagnostic output for you to review and resolve, not something the team needs preserved in git history; the original edit is already in your git history from whenever you made it. Delete the `.bak` once you've decided what to do with its content.

**The durable fix, if you keep hitting this on the same file:** if you find yourself repeatedly restoring the same customization to a PRISM-owned rule or template, that's usually a sign the customization belongs in a consumer-owned path instead — `.prism/architect/<topic>.md`, `.prism/custom/**`, or a note in `.prism/plans/` — rather than as a permanent hand-edit to a file PRISM regenerates on every sync.

> [!TIP]
> Run `prism update --dry-run` (or `prism doctor`) before a real update to see which files have diverged and would get a `.bak`, without writing anything. `prism doctor` also pairs each diverged file with any `.bak` siblings already on disk, so you can see backlog from prior updates in one report.

## Related Pages

- [docs/adopt-prism.md](./adopt-prism.md) — the full adopt/update/eject walkthrough, including `--dry-run`, `prism doctor`, and ejecting PRISM entirely
- [docs/getting-started.md](./getting-started.md) — the zero-to-installed quick start for a fresh repo
- `.prism/rules/skill-routing.md` — the always-loaded routing table this guide's routing section describes
- `.prism/architect/_toolkit/documentation.md` — the doc conventions this page follows
