# Plan: prism-230

## Ticket

PRISM-230

## Goal

Eliminate the recurring manual seed-mirror step when editing canonical `.prism/` content by automating the sync or making the gap impossible to miss.

---

## User Stories

---

## Design

---

## Implementation Tasks

_To be filled by Winston after diagnosis._

---

## Decisions

---

## History

- 2026-06-19 [hmcgrew/prism-230-seed-parity]: Scaffolded plan; Sasha investigation complete — see Debugged Issues.

---

## Debugged Issues

### Seed-parity manual mirror step is invisible until CI fails

- **Status:** `open`
- **Severity:** Medium
- **Confidence:** `High` (Confirmed root cause + deterministic repro — see below)
- **Environment:** Observed repeatedly during Epic #212 (business persona waves); reproducible on any edit to a non-curated canonical `.prism/` file without a matching seed update.
- **File:** `.prism/architect/_toolkit/install-layout.md` (documents the contract at line 74); `scripts/ai-skills/build.ts` (`checkSeedDrift`, line 859); `.ai-skills/definitions/seed-curation.json` (classification manifest)
- **Root cause:** `[Confirmed]` — `pnpm prism:build` does NOT write to `templates/install/.prism/`. By design, the build only generates runtime adapter mirrors (`.claude/`, `.codex/`, `.cursor/`) from the canonical `.prism/` source. The install seed is intentionally hand-maintained as a separately-curated artifact (per the "dual-writes" contract at `install-layout.md` § "The templates/install seed surface"). The gap is not a bug in `build.ts`; it is the absence of any tooling that makes the dual-write step visible at the moment of authoring.
- **Steps to Reproduce:**
  1. Edit any non-curated canonical file (e.g. `.prism/architect/_toolkit/business-layer.md`).
  2. Run `pnpm prism:build` — exits clean; no mention of seed.
  3. Do NOT manually mirror the edit to `templates/install/.prism/architect/_toolkit/business-layer.md`.
  4. Open a PR; CI runs `pnpm prism:check`, which calls `checkSeedDrift()` (build.ts line 1445), and fails with `seed drift: architect/_toolkit/business-layer.md`.
- **Expected behavior:** The author is alerted to the seed mirror requirement at or before `prism:build` completion, not only at CI `prism:check` time.
- **Actual behavior:** `pnpm prism:build` exits silently with no mention of seed drift. The failure surface is `pnpm prism:check` (check-mode only; CI-run), which is too late in the loop to serve as authoring guidance.

---

### Architecture findings

**What the build does vs. what it does not:**

`pnpm prism:build` has two distinct jobs:
1. **Skill compilation** — assembles `.ai-skills/skills/<id>/{shared.md, claude.md, ...}` into platform-specific SKILL.md and agent adapter files under `.claude/`, `.codex/`, `.cursor/`.
2. **Content mirroring** — copies canonical `.prism/{rules,architect,spec,templates,references}/` verbatim (with token substitution and dialect translation) into `.claude/`, `.codex/`, `.cursor/` platform dirs. This is `syncAllPlatformContentCopies()`.

Neither job touches `templates/install/.prism/`. That directory is declared as `pathDefinitions.canonical.templatesContentRoot` in `paths.json` and is read by `checkSeedDrift()` in check mode — but `build.ts` never writes to it.

**The seed is NOT a verbatim mirror of `.prism/`:**

The install seed `templates/install/.prism/` is a curated subset with three tiers of files:
- **Excluded** (11 rules + 8 conductor ADRs): dogfood-only content, not shipped to consumers. Examples: `rules/autonomous-bug-fixing.md`, `rules/core-principles.md`, all conductor ADRs (0049–0056). These are in `.ai-skills/definitions/seed-curation.json` under `"excluded"`.
- **Curated** (27 files): exist in both dogfood and seed but may intentionally differ in content. Examples: `architect/_toolkit/install-layout.md` (seed version is simplified, strips PRISM-internal implementation details — confirmed by diff), `rules/verification-commands.md` (seed is a stub consumers fill in), most shipped ADRs. These are listed under `"curated"`.
- **Non-curated** (everything else): must be byte-identical between `.prism/` and `templates/install/.prism/`. `business-layer.md` is non-curated — a byte-by-byte match is required and enforced.

**Why the curated files legitimately differ:**

Checked `install-layout.md` diff (dogfood vs seed): the seed version omits PRISM-internal implementation details — references to specific TypeScript functions, internal file paths like `scripts/ai-skills/ownership.ts`, and advanced feature explanations. This is intentional: the seed ships a consumer-readable version, while the dogfood version is the full authoritative doc. The `curated` classification is the correct mechanism for these files; the check confirms they exist in the seed but skips byte-comparison.

**What `checkSeedDrift` enforces:**

Called only in `--check` mode (line 1445 of `main()`). For non-curated files: verifies byte-identical match. For curated files: verifies existence only. For excluded files: verifies absence from seed. Reports `seed drift: <path>` or `seed orphan: <path>` on violation. CI (`prism-check.yml`) runs `pnpm prism:check` on every PR and main push — so missed mirrors fail CI, not pre-commit.

**The current gap:** there is no `prism:build` step or pre-commit hook that notifies the author that the canonical edit they just made requires a seed mirror. The dual-write is documented in `install-layout.md` § "The templates/install seed surface" but is easy to miss — it's prose in an architect doc, not a build-time signal.

---

### Recommended approach for Winston

**Gap vs intentional design verdict:** The dual-write step is **intentional design** (install-layout.md explicitly documents it). The bug is not that `prism:build` skips the seed — that's correct, because the seed is curated and can't be mechanically derived. The bug is that the manual step is invisible at authoring time, surfaces only at CI, and recurs on every wave.

**Classification of files that should vs. should not auto-mirror:**

Any automation must respect the three-tier classification:
- `excluded` files: must never be in the seed — auto-copy would be wrong.
- `curated` files: intentionally differ — auto-copy would overwrite deliberate differences.
- **Non-curated files only**: byte-identical match required. These are the legitimate auto-mirror candidates.

Of the 4 currently-drifting architect `_toolkit` files (`install-layout.md`, `onboarding.md`, `qa-test-planning.md`, `skills-ecosystem.md`), all are in `curated` — so they legitimately differ and are not candidates for automation. The non-curated files (like `business-layer.md`) are the target class.

**Option A: Extend `pnpm prism:build` to auto-write non-curated files to the seed**

`build.ts` already has all the machinery: the `seed-curation.json` manifest, the `COPIED_CONTENT_AREAS` list, and `copyContentFileWithSubstitution`. Add a post-build step: for each non-curated, non-excluded file in the canonical areas, copy it byte-identical to the seed. Excluded files are skipped; curated files are skipped (the author is responsible for the curated seed version); only new non-curated files auto-mirror.

- Upside: completely eliminates the recurring manual step for non-curated files. `prism:build` becomes the single command.
- Risk 1: if a new file is added to `.prism/` and the author intends it to be curated (consumer-facing simplified version), it would be auto-mirrored verbatim before the author has a chance to classify it. The author would need to add it to `seed-curation.json` before building.
- Risk 2: the seed currently has no managed-marker mechanism like the platform dirs do — there's no `.ai-skill-generated` file in the seed. Auto-writing would need to be careful not to overwrite curated files. The `seed-curation.json` manifest already provides the guard (skip curated + excluded), so this is solvable.
- Mitigation: build logs the auto-mirrored files explicitly so the author can verify.

**Option B: Add a `prism:build` warning when non-curated canonical files have no seed counterpart or differ**

Instead of writing the seed, `prism:build` (non-check mode) checks non-curated files against the seed and prints a warning — not a failure — when drift is detected: "Warning: these canonical files differ from their seed copies — run `pnpm prism:sync-seed` or manually mirror." Add a separate `prism:sync-seed` script that copies only non-curated files.

- Upside: non-invasive; keeps the seed write as an explicit author action; warning surfaces at build time (earlier than CI).
- Downside: still requires a second command; warnings are easy to ignore; doesn't fix the root recurrence.

**Option C: Keep hand-maintained, add a pre-commit hook that warns on seed drift for non-curated files**

A pre-commit hook (or `pnpm prism:check` called pre-commit) would catch drift before push. This is the cheapest change but doesn't fix the authoring loop — the author still has to manually mirror and re-commit.

---

**Sasha's recommendation: Option A**

The recurrence pattern across every Epic #212 wave is the signal: this isn't a one-time oversight; it's a structural gap in the authoring loop. Option A closes the gap at the only point that matters — `pnpm prism:build` — without adding new commands or relying on author discipline. The `seed-curation.json` manifest already provides the classification needed to do this safely (skip curated + excluded, copy the rest). The only new risk is the "new file that should be curated but isn't yet classified" scenario, which is mitigated by: (1) build logging the auto-mirrored files so the author sees them, and (2) the existing `prism:check` still being the enforcement gate.

Winston should scope the implementation to:
1. Add a post-build seed-sync step in `build.ts` `main()` that iterates `COPIED_CONTENT_AREAS`, reads the canonical file, skips if in `excluded` or `curated`, and writes byte-identical to the seed using the existing `writeFileIfChanged` utility.
2. Log each auto-mirrored file (same pattern as the existing `changedPaths` log).
3. Update `install-layout.md` (dogfood and seed) to replace "dual-writes" prose with the new automated behavior, and note what the author is still responsible for (curated files).
4. Update `seed-curation.json` if any new files need to be added to `curated` or `excluded` before the auto-mirror would overwrite them.

- **Suggested tests:** Extend `seed-drift.test.ts` with a test that verifies `build.ts` in non-check mode auto-writes a non-curated canonical file to the seed. Use the existing `withTempRoots` + temp-dir pattern.
- **Missing evidence:** none — root cause is confirmed, mechanism is understood, fix scope is clear.
- **Linear:** `not synced`

---

## Review Issues

---

## Acceptance Criteria

---

## Cleanup Items

---

## PR Readiness

- [ ] No critical or major issues
- [ ] Types correct — no `any`, no unsafe `as`
- [ ] No stray console.logs or debug artifacts
- [ ] Tests written for new logic and edge cases
- [ ] All debugged issues resolved (no `open` entries)
- [ ] Build passes — last run: N/A (diagnosis only, no code changes)
- [ ] PR description up to date
- [ ] Lasting decisions promoted to architect context (if applicable)

**Last updated:** 2026-06-19
