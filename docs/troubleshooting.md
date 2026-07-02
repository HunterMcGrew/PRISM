---
title: "Troubleshooting"
description: "Fixes for the most common prism adopt, update, and build failures — start with prism doctor."
category: "getting-started"
audience: "developer-user"
last_updated: "2026-07-02"
---

# Troubleshooting

Start here whenever `prism adopt`, `prism update`, or a build step doesn't do what you expected.

> [!TIP]
> Run `npx @huntermcgrew/prism doctor` first, before anything else on this page. It's read-only — it never writes a file — and in one pass it validates your `.ai-skills/config.json` against its schema, confirms you're inside a git repository, reports any drift between your sync manifest and what's actually on disk (pairing diverged files with `.bak` siblings already sitting there), and compares your installed version against the latest on npm. Most of the failures below show up in `doctor`'s findings before you'd otherwise notice them.

## `prism adopt` refuses to run

**Symptom:** `adopt` exits with an error instead of writing anything, mentioning a sync record already exists.

**Cause:** `prism adopt` is a first-contact command. If `.prism/` already has a `.sync-manifest.json` — meaning `adopt` (or a prior `update`) has already run successfully in this repo — a second `adopt` refuses to proceed rather than risk re-seeding on top of an established install.

**Resolution:** you almost certainly want `prism update`, not `adopt`, at this point — `update` is the steady-state command for pulling in PRISM's latest content into a repo that's already adopted. If you're intentionally trying to re-baseline (for example, after deleting `.prism/` by hand), remove the stale `.sync-manifest.json` first, or run `prism eject --yes` to fully remove PRISM's content before adopting fresh.

## `update` produced `.bak` files

**Symptom:** after running `prism update`, you see one or more `<file>.bak` (or `.bak.1`, `.bak.2`, …) files under `.prism/`.

**Cause:** this is expected, not an error. A `.bak` appears when a PRISM-owned file has diverged from what PRISM last wrote — meaning you or someone on your team edited it directly. Rather than silently overwriting your edit, PRISM copies your version to `.bak` first, then writes its current content to the original path. Your edit isn't lost; it's sitting right next to the new file.

**Resolution:** decide what to do with each `.bak` — keep PRISM's new version (delete the `.bak`, or just leave it, PRISM never reads `.bak` files back in), restore your version (copy the `.bak` content back over the live file — note this will diverge again on the next update), or hand-merge the two. If you find yourself repeatedly restoring the same edit to the same PRISM-owned file, that's a sign the customization belongs in a consumer-owned path instead (`.prism/architect/<topic>.md`, `.prism/custom/**`) rather than as a standing hand-edit to a file PRISM regenerates every sync.

For the full walkthrough — including how to preview which files would get a `.bak` before running a real update — see [docs/adopting-into-existing-repos.md § The `.bak` conflict-resolution workflow](./adopting-into-existing-repos.md#the-bak-conflict-resolution-workflow).

## Leftover-token build failure

**Symptom:** a build step fails with an error naming an unsubstituted `${TOKEN}`-style placeholder in generated output — or you notice a literal `${PROJECT}` or similar sitting in a skill file that should have been replaced with your project's actual name.

**Cause:** PRISM's skill content is written with tokens that get substituted from your `.ai-skills/config.json` at build/sync time. If a field the substitution step expects is missing, misnamed, or the wrong shape in your config, the token has nothing to substitute with and survives into the generated output — where a guard catches it and fails the build rather than shipping a broken skill.

**Resolution:**

1. Run `prism doctor` — it validates your `.ai-skills/config.json` against its schema and, if the config itself is invalid, names the offending field directly (for example, `/ticketSystem/kind: must be one of [...]`) rather than leaving you to trace the failure back from generated output.
2. If `doctor` reports the config as valid but you still see a leftover-token failure, check that every field the failing token depends on is actually populated — a structurally valid config can still be missing a value a specific token needs.
3. Both `prism adopt` and `prism update` also validate your config against the schema *before* writing anything — so a structurally invalid config is caught upfront as a hard refusal, not mid-write. Run either command with `--dry-run` first if you want to see this validation happen without risking a partial write.

## Pre-manifest install fallback

**Symptom:** you're working in a repo where `.prism/.sync-manifest.json` doesn't exist yet, but `.prism/` has some content in it (for example, if `.prism/` was hand-copied, or adopted with an older PRISM version before the manifest existed).

**Cause:** PRISM's update logic is built around comparing three states for every file — the incoming content, what's on disk, and the recorded hash from the manifest. With no manifest, there's no recorded hash to compare against, so PRISM treats the file the same way it would treat a first-time write: if a consumer file already exists at that path, it's left alone (or backed up before being overwritten, depending on the command); there's no "assume everything is safe to clobber" fallback.

**Resolution:** run `prism doctor` to confirm the current state (it will report the missing manifest as a finding), then run `prism update` — it handles the missing-manifest case as part of its normal first-sync path and will (re)write the manifest as part of that run. If you're unsure whether existing `.prism/` content is safe to sync over, run `update --dry-run` first to preview exactly what would be written, skipped, or backed up before committing to a real run.

## Windows notes

PRISM's CI runs a full check on both `ubuntu-latest` and `windows-latest` (see `.github/workflows/prism-check.yml`), and the repo carries a `.gitattributes` entry (`* text=auto eol=lf`) that normalizes line endings to LF on checkout — including on Windows, where git's default `core.autocrlf=true` would otherwise convert files to CRLF. This matters because PRISM's build does a byte-exact comparison between generated output and committed source; without the LF normalization, a Windows checkout could show phantom drift purely from line-ending differences that have nothing to do with actual content changes.

If you're adopting PRISM into a Windows-based repo and see unexpected file-drift findings from `prism doctor` or a `prism:check`-style build comparison, confirm your own repo's line-ending handling (`.gitattributes` or `core.autocrlf`) isn't fighting PRISM's LF normalization before assuming it's a real content divergence.

## Related pages

- [docs/what-prism-writes.md](./what-prism-writes.md) — the full inventory of paths PRISM can create or modify, and which are safe to hand-edit
- [docs/adopting-into-existing-repos.md](./adopting-into-existing-repos.md) — coexistence rules and the full `.bak` conflict-resolution workflow
- [docs/adopt-prism.md](./adopt-prism.md) — the full adopt/update/eject command reference, including `--dry-run`
- [SECURITY.md](../SECURITY.md) — the trust model and how to report a security issue
