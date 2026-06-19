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

### Clove (implementation)

1. **Add a `writeSeedMirror` function to `scripts/ai-skills/build.ts`** — the build-mode inverse of `checkSeedDrift`. Insert it immediately after `checkSeedDrift` (after line 979, before `removeDeletedManagedAgentFiles`). It walks the same areas with the same classification rules as `checkSeedDrift`, but **writes** the canonical file to the seed instead of comparing. Signature mirrors `checkSeedDrift` plus a collector for the warn list:

   ```ts
   /**
    * Writes non-curated canonical files to the install seed so prism:build is the
    * single command that keeps templates/install/.prism/ in parity. The build-mode
    * inverse of checkSeedDrift: same classification (excluded / renames / curated
    * skipped), but writes the raw canonical bytes instead of comparing them.
    *
    * Raw bytes, not substituted: the seed ships tokens as literals (ADR-0030), and
    * checkSeedDrift compares raw bytes — so the write path must NOT call
    * substituteTokens or copyContentFileWithSubstitution. Use writeFileIfChanged
    * with fs.readFile output directly. Idempotent: writeFileIfChanged is a no-op
    * when the seed already matches, so a second prism:build produces no git diff.
    *
    * unclassifiedMirrored collects non-curated files that are absent from every
    * tier in seed-curation.json — main() warns on these so a forgotten curation
    * decision surfaces at build time (see Decision: unclassified-file handling).
    */
   export async function writeSeedMirror(
       contentRoot: string,
       seedRoot: string,
       curation: SeedCuration,
       checkModeArg: boolean,
       changedPathsArg: string[],
       unclassifiedMirrored: string[]
   ): Promise<void>
   ```

   Body — mirror `checkSeedDrift`'s area + loose-file walk exactly, with these per-file actions (the classification order is load-bearing; copy it from `checkSeedDrift` lines 869–953):
   - Build the same four sets: `excludedSet`, `curatedSet`, `renames`, and `renameValues` (the last not needed for the write path — omit it).
   - For each canonical file under each `COPIED_CONTENT_AREAS` area, compute `relPath` the same way (`path.posix.join(area, entry.relativePath.replace(/\\/g, "/"))`).
   - **Skip** when `excludedSet.has(relPath)` — excluded files must never reach the seed.
   - **Skip** when `relPath in renames` — the seed counterpart is author-maintained under its renamed name and intentionally differs.
   - **Skip** when `curatedSet.has(relPath)` — curated seed versions are author-maintained and intentionally differ.
   - **Otherwise (non-curated)** — read the raw canonical bytes (`await fs.readFile(path.join(sourceArea, entry.relativePath), "utf8")`) and write to the seed via `writeFileIfChanged(path.join(seedRoot, relPath), raw, checkModeArg, changedPathsArg)`. If the file was not present in `excludedSet`, `curatedSet`, or `renames` (i.e. it is implicitly non-curated rather than explicitly declared anywhere), push `relPath` onto `unclassifiedMirrored`.
   - Apply the identical skip-then-write logic to `COPIED_LOOSE_FILES` (`SPEC.md`), matching `checkSeedDrift`'s loose-file block (lines 926–953): skip if excluded/seedOnly/curated/renamed, otherwise write raw bytes to `path.join(seedRoot, looseFile)`.

   Do **not** add the seed-orphan sweep (lines 955–978) to the write path — orphan detection stays a check-mode-only concern; the write pass only mirrors canonical→seed, it never deletes from the seed. Verification: `pnpm run prism:check-types` passes (no type errors).

2. **Call `writeSeedMirror` from `main()` in build mode** — `scripts/ai-skills/build.ts`, inside `main()`. Add the call in the **build-mode** path so it is symmetric with the check-mode `checkSeedDrift` call at line 1445. Place it right after the platform-content sync block closes (after line 1381, the `}` ending `if (await pathExists(contentRoot))`) and before `syncAgentsMdTier1Block` at line 1383. Guard it the same way `checkSeedDrift` is guarded by `checkMode` — but the inverse:

   ```ts
   const unclassifiedMirrored: string[] = [];
   if (!checkMode && (await pathExists(contentRoot))) {
       await writeSeedMirror(
           contentRoot,
           templatesContentRoot,
           seedCuration,
           checkMode,
           changedPaths,
           unclassifiedMirrored
       );
   }
   ```

   `contentRoot` and `templatesContentRoot` are already in scope (defined at lines 1320–1324). After task 3's warn block is added, `unclassifiedMirrored` feeds it. Sequence: after task 1. Verification: deferred to task 6 (idempotency run).

3. **Warn on unclassified auto-mirrored files** — `scripts/ai-skills/build.ts`, in `main()`, in the build-mode summary region (after the `writeSeedMirror` call from task 2, and before or alongside the existing `console.log("prism:build completed...")` block at lines 1462–1470). After the mirror pass, if `unclassifiedMirrored.length > 0`, print a distinct, scannable warning block:

   ```ts
   if (unclassifiedMirrored.length > 0) {
       console.warn(
           `prism:build auto-mirrored ${unclassifiedMirrored.length} unclassified file(s) to the install seed as non-curated:`
       );
       for (const relPath of unclassifiedMirrored) {
           console.warn(` - ${relPath}`);
       }
       console.warn(
           "If any of these should be curated (consumer-facing simplified) or excluded (dogfood-only), add them to .ai-skills/definitions/seed-curation.json and rebuild."
       );
   }
   ```

   Use `console.warn` (not `console.error` — this is not a failure) and keep it separate from the `Updated N file(s)` success summary so the warning is visible even on a clean build. Do **not** call `process.exit` — the warn never fails the build. Sequence: after task 2. Verification: task 6 confirms the warn fires for a deliberately-unclassified file and does not fail the build.

4. **Replace the "dual-writes" prose in the dogfood `install-layout.md`** — `.prism/architect/_toolkit/install-layout.md`, § "The templates/install seed surface" (lines 70 and 72). This file is `curated`, so the dogfood and seed copies differ and are edited independently. Replace line 70's sentence describing the manual dual-write:

   `old_string` (line 70): the sentence beginning `` `templates/install/.prism/` is the consumer install seed `` through `team identifiers stay in tokenized form per ADR-0030).`

   `new_string`:
   ```
   `templates/install/.prism/` is the consumer install seed — what a consumer repo receives at install time. `pnpm prism:build` keeps it in parity automatically: after the platform-content sync, `writeSeedMirror()` in `scripts/ai-skills/build.ts` writes every **non-curated** canonical file (anything not classified `excluded`, `curated`, or `renamed` in `seed-curation.json`) to the seed as raw bytes (tokens stay literal per ADR-0030; no substitution). The author is still responsible for the **curated** seed copies — files that intentionally ship a simplified consumer-facing version (like this doc) — and for classifying any new file in `seed-curation.json` before it ships. New files that aren't classified are auto-mirrored verbatim as non-curated, and `prism:build` prints a warning listing them so a forgotten curation decision surfaces at build time.
   ```

   Then update line 72's `**Enforcement:**` sentence so it no longer implies `prism:check` is the only seed gate. Change `; \`pnpm prism:check\` fails if a non-curated canonical file diverges from the seed or is missing from the seed.` to `; \`pnpm prism:check\` remains the CI backstop — it fails if a non-curated canonical file diverges from the seed, catching any case the build-time mirror missed (e.g. a hand-edited seed file).` Leave the rest of line 72 (the classification description and CI sentence) intact. This is content-only — no build effect, but it is an architect-doc edit, so verify the claims match `build.ts` after task 1–3 land (Briar/Eric will source-verify per `architect-doc-verification.md`). Sequence: after tasks 1–3 so the prose describes the shipped behavior.

5. **Replace the matching prose in the seed copy of `install-layout.md`** — `templates/install/.prism/architect/_toolkit/install-layout.md`, § "The templates/install seed surface" (lines 70 and 72 in the seed copy). The seed copy is the consumer-facing simplified version; it must NOT reference PRISM-internal symbols like `writeSeedMirror()` or `scripts/ai-skills/build.ts` (that is why this file is `curated`). Replace line 70's manual-dual-write sentence with a consumer-appropriate description:

   `old_string` (seed line 70): the same `` `templates/install/.prism/` is the consumer install seed `` … `per ADR-0030).` sentence.

   `new_string`:
   ```
   `templates/install/.prism/` is the consumer install seed — what a consumer repo receives at install time. The PRISM build keeps it in parity automatically: non-curated canonical files (anything not classified `excluded`, `curated`, or `renamed` in `seed-curation.json`) are mirrored to the seed as raw bytes at build time. Curated files — those that intentionally ship a simplified consumer-facing version — stay author-maintained, and any new file must be classified in `seed-curation.json` before it ships.
   ```

   For seed line 72 (`**Enforcement:**`), apply the same `prism:check` "CI backstop" reframing as task 4 but keep it consumer-readable (no `checkSeedDrift()` symbol reference if the seed copy already avoids it — check the seed line 72 text and preserve its existing abstraction level). This is content-only — no build effect. Sequence: independent of task 4 but do both together so the two copies stay conceptually in sync. Note: because this file is `curated`, editing the seed copy here is exactly the author-maintained-curated-file responsibility the new automation preserves — `writeSeedMirror` will NOT overwrite it.

6. **Extend `scripts/ai-skills/seed-drift.test.ts` with `writeSeedMirror` tests.** Add tests after the existing rename test (after line 249). Use the existing `withTempRoots` + `emptyCuration` helpers. Import `writeSeedMirror` alongside `checkSeedDrift` on line 13. Add these cases:

   - **`writeSeedMirror — non-curated canonical file is written to the seed`**: build a `contentRoot` with `rules/business-style.md` containing `# Style\n` and an empty `seedRoot`. Call `writeSeedMirror(contentRoot, seedRoot, emptyCuration, false, changedPaths, unclassified)`. Assert the seed file now exists and its bytes equal the canonical bytes; assert `changedPaths` includes the seed path; assert `unclassified` includes `rules/business-style.md` (it's not in any tier).
   - **`writeSeedMirror — curated file is not written`**: canonical `rules/verification-commands.md` = `# Canonical\n`, seed pre-populated with `# Stub\n`, curation `{ ...emptyCuration, curated: ["rules/verification-commands.md"] }`. Call with `checkMode=false`. Assert the seed file still reads `# Stub\n` (untouched) and `unclassified` is empty.
   - **`writeSeedMirror — excluded file is not written`**: canonical `rules/core-principles.md` exists, seed empty, curation `{ ...emptyCuration, excluded: ["rules/core-principles.md"] }`. Assert the seed file does NOT exist after the call and `unclassified` is empty.
   - **`writeSeedMirror — renamed file is not written under its canonical name`**: canonical `architect/manifest.json` exists, seed has `architect/manifest.stub.json` = `{"v":1}\n`, curation renames `architect/manifest.json` → `architect/manifest.stub.json`. Assert no `architect/manifest.json` is created in the seed and the existing stub is untouched.
   - **`writeSeedMirror — idempotent: second run produces no changedPaths`**: non-curated canonical file, run `writeSeedMirror` twice with a fresh `changedPaths` each time. Assert the first run's `changedPaths` is non-empty and the second run's is empty (proves `writeFileIfChanged` no-ops on identical content — the git-diff-free guarantee).
   - **`writeSeedMirror — raw bytes, no token substitution`**: canonical `rules/tokened.md` containing a known token literal (use whatever literal token the build's `tokenMap` would substitute — confirm the exact token string from `deriveTokenMap`/`substituteTokens` in `build.ts`; if uncertain, use a sentinel like `__TEAM_NAME__` and assert the seed bytes equal the canonical bytes verbatim). Assert the seed copy contains the literal token unchanged — proving no substitution ran.

   Verification: `pnpm run prism:test` runs all `scripts/ai-skills/*.test.ts` and the new cases pass. Sequence: after task 1.

7. **Verify the full fix end-to-end.** Run in order from repo root:
   - `pnpm run prism:check-types` → passes (no type errors in `build.ts` / test).
   - `pnpm prism:build` → completes; if any canonical file is currently out of seed-parity (the originating bug — e.g. a drifted `business-layer.md`), it auto-mirrors and is listed in `Updated N file(s)`. Inspect the warn block if any unclassified files appear.
   - `pnpm prism:build` **a second time** → reports `No changes needed` (or no seed paths in the updated list). Run `git status -s templates/install/.prism/` → **empty** (idempotency proof — no git diff on the second run).
   - `pnpm prism:check` → `prism:check passed. Generated outputs are in sync.` (the seed-drift gate is now green because the build wrote parity).
   - **Manual auto-mirror confirmation:** make a throwaway edit to a non-curated canonical file (e.g. append a blank line to `.prism/architect/_toolkit/business-layer.md`), run `pnpm prism:build`, confirm the matching `templates/install/.prism/architect/_toolkit/business-layer.md` received the same edit automatically, then revert both. This proves the originating bug is fixed.
   Sequence: last. `[AFK]` — fully agent-runnable.

---

## Decisions

- **Ratified Sasha's Option A — extend `prism:build` to auto-write non-curated canonical files to the install seed.** The recurrence across every Epic #212 wave is the signal: a structural gap in the authoring loop, not a one-off. Option A closes it at the only point that matters (`pnpm prism:build`) with no new command and no reliance on author discipline. `writeSeedMirror` is the clean inverse of `checkSeedDrift` — same area walk, same classification, same raw-byte semantics — so the seam already exists; the build owns canonical→platform mirroring and now owns canonical→seed mirroring symmetrically.
  - **Root cause:** `prism:build` never wrote `templates/install/.prism/`; the seed was a manual dual-write documented only in prose, invisible until CI `prism:check` failed.
  - **Alternatives considered:** Option B (warn-only + separate `prism:sync-seed` command — still two commands, warnings ignorable, doesn't fix recurrence); Option C (pre-commit hook — cheapest but author still manually mirrors and re-commits).
  - **Chosen approach:** Option A. Beats B/C because it eliminates the manual step entirely rather than relocating or re-surfacing it.
  - **Implementation guidance:** write raw bytes via `writeFileIfChanged`, NOT `copyContentFileWithSubstitution` (see next decision); skip excluded/curated/renamed; `prism:check`/`checkSeedDrift` stays the CI backstop unchanged.
  - → no promotion needed (ticket-tactical mechanism; the durable contract is documented in `install-layout.md` via tasks 4–5, which is the architect-doc surface).

- **The seed write path uses raw canonical bytes, never token substitution — correcting Sasha's recommended mechanism.** Sasha's task list said "use the existing `copyContentFileWithSubstitution` helper," which would break parity. `checkSeedDrift` compares **raw unsubstituted bytes** (ADR-0030 — the seed ships tokens as literals, substituted at install time). A substituting write would emit substituted bytes, then `prism:check` would flag drift on every token-bearing file — the inverse of the goal. `writeSeedMirror` reads `fs.readFile` and writes via `writeFileIfChanged` with no `substituteTokens` call.
  - → no promotion needed (codified in `build.ts` JSDoc on `writeSeedMirror` per task 1, and the raw-bytes contract is already durable in ADR-0030).

- **Renames are a skip-from-write case, treated like curated.** The default write path covers only files that are not `excluded`, not `curated`, and not in `renames`. Renamed files (e.g. `manifest.json` → `manifest.stub.json`) ship an author-maintained seed counterpart under a different name that intentionally differs — `checkSeedDrift` only verifies the renamed target *exists*, never its content, so the write path must not touch it. Sasha's "skip excluded + curated" was incomplete; renames is the third skip class.
  - → no promotion needed (ticket-tactical; matches existing `checkSeedDrift` semantics).

- **Unclassified new files auto-mirror as non-curated and the build WARNS — it does not FAIL.** Non-curated (byte-identical) is the manifest's default contract for anything not explicitly excluded/curated/renamed, so auto-mirroring an unclassified file as non-curated is correct by the manifest's own semantics. The narrow risk is an author who *intended* curation but forgot to classify — the auto-write would ship the full dogfood version and `prism:check` would then pass on it, silently losing the curation decision.
  - **Alternatives considered:** (a) hard FAIL the build on any unclassified file — rejected: punishes the common case (most new files are genuinely non-curated) to catch the rare forgot-to-curate case; (b) silent mirror + log only (Sasha's original mitigation) — rejected: logs scroll past and "build succeeded" reads as "nothing to review," so the curation-forgot case stays invisible.
  - **Chosen approach:** loud, distinct `console.warn` block listing every auto-mirrored unclassified file with a prompt to classify in `seed-curation.json` — visible at build time without taxing the 90% case. `prism:check` remains the CI backstop for hand-edited-seed drift.
  - **Implementation guidance:** task 3 — `console.warn`, never `process.exit`; keep the warn block separate from the success summary so it shows on a clean build.
  - → **OPEN sub-note for Hunter:** WARN is the ratified default; if the team would rather force an explicit classify decision on every new file, this can harden to FAIL by changing task 3's `console.warn` to `console.error` + `process.exit(1)`. Surfaced as an Open Question, not a blocker.

---

## History

- 2026-06-19 [hmcgrew/prism-230-seed-parity]: Scaffolded plan; Sasha investigation complete — see Debugged Issues.
- 2026-06-19 [hmcgrew/prism-230-seed-parity]: Winston ratified Option A (verified diagnosis independently); corrected the write mechanism to raw bytes (not substitution) and added renames as a third skip class; ruled unclassified-file handling as WARN-not-FAIL (open question for Hunter). Filled Implementation Tasks, Decisions, AC.

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

### Behavioral

- [ ] Given a non-curated canonical file under `.prism/` has been edited, When `pnpm prism:build` runs, Then the matching file under `templates/install/.prism/` is updated automatically to match it byte-for-byte, with no separate command (REQ-1)
- [ ] Given `pnpm prism:build` has just run and written seed files, When `pnpm prism:build` runs a second time with no canonical changes in between, Then it reports no changes and leaves no uncommitted differences under `templates/install/.prism/` (REQ-2)
- [ ] Given a canonical file is classified as excluded (dogfood-only) in the curation manifest, When `pnpm prism:build` runs, Then that file is never written into the install seed (REQ-3)
- [ ] Given a canonical file is classified as curated (intentionally simplified for consumers), When `pnpm prism:build` runs, Then its existing seed copy is left untouched and not overwritten (REQ-4)
- [ ] Given a new canonical file exists that has not been classified in the curation manifest, When `pnpm prism:build` runs, Then it is mirrored into the seed and the build prints a warning that lists the file and asks the author to classify it (REQ-5)
- [ ] Given a new canonical file that is unclassified, When `pnpm prism:build` runs and prints the warning, Then the build still completes successfully and is not failed by the warning (REQ-5)
- [ ] Given the install seed is in full parity, When `pnpm prism:check` runs, Then it reports the generated outputs are in sync and does not report seed drift (Debug-1)

### Non-behavioral

- [ ] The seed copy of an edited canonical file matches the original exactly, including any placeholder tokens left in their unfilled form (no substitution applied to the seed copy) (REQ-6)
- [ ] The "templates/install seed surface" section in both the internal and the consumer-shipped copy of the install-layout reference describes the automatic parity behavior, replacing the prior manual-copy instructions (REQ-7)

### AC Adjustments

### AC Sync Log

| Date | Agent | Action | Plan | Linear |
| ---- | ----- | ------ | ---- | ------ |
| 2026-06-19 | Winston | Authored AC from diagnosis (Debug-1) and ratified Decisions | prism-230 | not synced |

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
