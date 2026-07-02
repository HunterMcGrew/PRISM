# Plan: issue-377

## Ticket

https://github.com/HunterMcGrew/PRISM/issues/377 — Add `prism eject` command (lane L377 of epic #373)

## Goal

Add a `prism eject` command that cleanly removes a PRISM install — PRISM-owned `.prism/` files, projected `prism-*` skills/agents, and the sync manifest — while preserving consumer-owned content and never silently destroying diverged edits, so an evaluation-minded team can back out without lock-in.

---

## User Stories

- As an evaluating team lead, I want to run one command that removes PRISM cleanly, so that adopting PRISM does not read as lock-in.
- As a consumer who edited PRISM-owned files, I want my divergent edits preserved as `.bak` on eject, so that I do not lose work I can re-apply later.
- As a cautious operator, I want eject to show me exactly what it would remove before it removes anything, so that I never delete files by surprise.

---

## Design

No UI. CLI-only command; design captured in `## Decisions` and `## Implementation Tasks`.

---

## Implementation Tasks

### Clove (implementation)

The whole command is a **thin composition of primitives that already exist** — `applyDeletedFile` (delete-with-`.bak`), the `.ai-skill-generated` marker gate from `removeDeletedManagedSkills`, `loadSyncManifest`, `classifyPath`, `resolveConsumerSkillTargetRoots`, `loadPathDefinitions`, `parseDryRunFlag`, `assertInsideGitRepo`. Do **not** rebuild deletion or backup logic — reuse the tested code paths. Follow `doctor.ts`'s two-export shape (`runEject` testable core + `runEjectCli` wrapper) and its manifest-reader pattern.

1. **Create `scripts/ai-skills/eject.ts` with the two-export shape.** Mirror `doctor.ts` (lines 13–17, 446–478):
   - `export async function runEject(options: RunEjectOptions): Promise<EjectReport>` — testable core, no `process.exit`, no console output. Takes `{ consumerRepoRoot, consumerContentRoot, pathDefinitions, confirmed: boolean, dryRun: boolean }`.
   - `export async function runEjectCli(): Promise<void>` — resolves roots from argv (`resolveConsumerRoot` + `parseConsumerFlag` from `lib/consumer-root`, same as `doctor.ts` lines 447–452), parses `--yes` and `--dry-run`, calls `runEject`, prints the completeness report, sets exit code.
   - `const isMain = …` guard identical to `doctor.ts` lines 471–478.
   - Define result types near the top: `EjectFileOutcome { relativePath; action: "removed" | "removed-with-backup" | "preserved" | "no-op"; backupPath?: string; ownership: "prism" | "consumer" | "unknown" }`, `EjectSkillOutcome { path; action: "removed" | "skipped-no-marker" | "skipped-not-prism" }`, and `EjectReport { fileOutcomes; skillOutcomes; manifestRemoved: boolean; emptyDirsRemoved: string[]; preservedNotices: string[]; confirmed: boolean; dryRun: boolean }`.

2. **Guard before any work** (in `runEject`, before computing anything): call `assertInsideGitRepo(consumerRepoRoot)` — reuse from `lib/consumer-root` (used by `doctor.ts` line 153, `update.ts` line 372). Eject deletes files that must be revertable via git. Then `loadSyncManifest(consumerContentRoot)`; if it returns `null`, this repo has no PRISM baseline — return an `EjectReport` that reports "nothing to eject" (a `preservedNotices` entry: `No .sync-manifest.json found — nothing to eject.`) rather than throwing. Mirror `doctor.ts` lines 207–218's null-manifest handling.

3. **Add `--yes` parser to `lib/consumer-root.ts`.** Add `export function parseConfirmFlag(argv: string[]): boolean { return argv.includes("--yes"); }` directly below `parseDryRunFlag` (lines 197–205). Same boolean-flag shape as `parseDryRunFlag` — presence means `true`. Reuse `parseDryRunFlag` as-is; do not duplicate it.

4. **Compute the effective preview mode.** In `runEjectCli`: `const confirmed = parseConfirmFlag(argv); const dryRunFlag = parseDryRunFlag(argv);`. Pass to `runEject` as `confirmed` and `dryRun: dryRunFlag`. Inside `runEject`, derive `const previewOnly = !confirmed || dryRun;` — **this single boolean gates every `fs` mutation** (Decision 5). When `previewOnly` is true, compute every outcome exactly as a real run would but perform no `fs.rm`. This is the same "compute the outcome, then guard the write" split `update.ts`'s `applyFilePass` uses via its `dryRun` param (lines 267–335) — follow that pattern; every write site checks `previewOnly` the way `applyFilePass` checks `dryRun`.

5. **File-removal pass (Decision 1 + 2).** Iterate `Object.entries(manifest.files)`. For each `relativePath`:
   - `const ownership = classifyPath(relativePath);` (import from `./ownership`, same as `doctor.ts` line 29).
   - If `ownership !== "prism"` → push an `EjectFileOutcome` with `action: "preserved"`, `ownership`, and add a `preservedNotices` entry the first time each consumer-owned area is seen (e.g. `Preserved consumer-owned content: plans/, lessons.md, custom/, flat architect docs.`). Never delete. (This is the mirror of `classifyPath`'s carve-out — consumer/unknown paths are exactly what update.ts leaves untouched.)
   - If `ownership === "prism"` → reuse the **exact `applyDeletedFile` semantics** from `update.ts` lines 217–244: hash the consumer copy; if absent → `no-op`; if it matches `manifest.files[p].contentHash` → `removed` (clean, no `.bak`); if it diverged → back up first (`removed-with-backup`, preserve the `.bak`) then remove. Two implementation options, pick the cleaner one during implementation and record which in `## History`:
     - **(a)** Export `applyDeletedFile` and `backupConsumerFile` from `update.ts` and call them directly (they already take a `dryRun` param that maps to `previewOnly`). Preferred if the signatures fit without contortion.
     - **(b)** If importing from `update.ts` drags in unwanted module-load side effects, lift `applyDeletedFile` + `backupConsumerFile` + `resolveBackupPath` + `hashFileIfExists` into a shared `lib/` module and import from both. Only do this if (a) is genuinely awkward — do not pre-emptively refactor.
   - **Diverged `.bak` rule (Decision 2):** eject never deletes an existing `.bak`/`.bak.N` sibling and never deletes the freshly-written one. The `.bak` is the user's only copy of their edits.

6. **Projected-skill removal pass (Decision 3).** For each platform skills/agents root from `resolveConsumerSkillTargetRoots(consumerRepoRoot, pathDefinitions)` (reuse from `update.ts` lines 462–487 — export it if not already exported) — that is `.claude/skills`, `.codex/agents`, `.agents/skills`, `.cursor/skills`, `.claude/agents`, plus the `codexConfigFile`:
   - Read the root's direct entries. For each entry whose name matches `prism-*` (skill dirs) or `prism-*.toml` (codex agent files):
     - **Gate 1 — prefix:** only `prism-`-prefixed names are candidates. A `custom-*` or org-token (`acme-*`) skill is never a candidate → `skipped-not-prism`.
     - **Gate 2 — marker:** the candidate is removed **only if** its `.ai-skill-generated` marker is present (`path.join(skillDir, MANAGED_MARKER)` from `utils.ts` line 12). A `prism-`-prefixed dir *without* the marker is a consumer's own hand-authored skill → `skipped-no-marker`, never deleted. This is the identical safety guarantee `removeDeletedManagedSkills` enforces (`utils.ts` lines 280–283) — reuse that function's gate logic. For codex agent `.toml` files (which have no per-file marker), key removal on the sibling skill dir's marker OR the presence of the generated header line — decide during implementation and record in `## History`; default to "only remove `prism-*.toml` when the corresponding `prism-*` skill dir was itself marker-confirmed for removal."
   - Respect `previewOnly` — record the outcome, skip the `fs.rm` when previewing.
   - Consider reusing `removeDeletedManagedSkills(outputRoot, new Set(), previewOnly, changedPaths)` with an **empty valid-set** so every marked skill is an orphan — but add the `prism-*` prefix filter first so non-PRISM marked skills (if any ever exist) are untouched. If the empty-set reuse is clean, prefer it; document the choice.

7. **Empty-dir cleanup + manifest removal (Decision 4).** After the file and skill passes:
   - Prune now-empty directories under `.prism/` bottom-up. A directory is removed only when it contains no files and no non-empty subdirectories — a dir still holding preserved consumer content (e.g. `plans/`, `custom/`) must survive. Record each removed dir in `emptyDirsRemoved`. Respect `previewOnly`.
   - **Remove `.sync-manifest.json` last** (`path.join(consumerContentRoot, SYNC_MANIFEST_FILENAME)` from `sync-manifest.ts` line 19). It is the last PRISM-owned artifact; removing it means `doctor`/`update` correctly report no install, and `prism adopt`'s `assertConsumerIsEstablished` guard (`adopt.ts` lines 110–120) will permit re-adoption. Set `manifestRemoved` accordingly. Respect `previewOnly`.

8. **AGENTS.md / CLAUDE.md reporting (issue requirement — leave in place, report contribution).** Do **not** delete `AGENTS.md` or `CLAUDE.md` (seeded once, possibly consumer-edited). Instead, detect and report PRISM's contribution so the user can prune manually:
   - `AGENTS.md`: PRISM's contribution is the delimited block between `AGENTS_MD_BLOCK_BEGIN` and `AGENTS_MD_BLOCK_END` (from `agents-md-block.ts` lines 23–25). If present, add a `preservedNotices` entry naming the file and the exact begin/end marker lines so the user can delete that block by hand.
   - `CLAUDE.md`: seeded whole; add a `preservedNotices` entry noting it was seeded by PRISM and may contain consumer edits — recommend manual review rather than auto-delete.
   - Do not modify either file. Reporting only.

9. **Completeness report (`formatEjectReport` + wire into `runEjectCli`).** Add `export function formatEjectReport(report: EjectReport): string` mirroring `doctor.ts`'s `formatDoctorReport` (lines 417–444). Sections, in order:
   - A header line stating mode: `prism eject (preview — no --yes)` / `prism eject (dry run)` / `prism eject`.
   - Counts: N PRISM-owned files removed, N removed-with-backup (list each `.bak` path — loud, per Decision 2), N preserved consumer-owned, N skills/agents removed, N skills skipped (not-prism / no-marker, with reason).
   - Empty dirs removed; manifest removed (yes/no).
   - The `preservedNotices` block (consumer content, AGENTS.md block markers, CLAUDE.md note).
   - A trailing completeness line: preview mode → `Re-run with --yes to perform the eject.`; real run → `prism eject complete — PRISM removed. Preserved N consumer file(s) and N .bak snapshot(s).`
   - In `runEjectCli`, `console.log(formatEjectReport(report))`. Preview mode is not an error — do not set a non-zero exit code for a clean preview.

10. **Wire `eject` into the CLI dispatch.** In `cli.ts`: import `runEjectCli` (line 15–18 group), add `case "eject": await runEjectCli(); break;` to the switch (lines 38–60), and add a `prism eject` line to the `USAGE` string (lines 20–33): `  prism eject    Remove PRISM from this repo (requires --yes; --dry-run to preview)`.

11. **Tests — `scripts/ai-skills/eject.test.ts`** (`tsx --test`, mirror `doctor.test.ts` / `update.test.ts` fixture style — build a temp `.prism/` with a real manifest, run `runEject`, assert on the returned `EjectReport` and on disk state). Required cases:
    - **Full eject:** clean install (all PRISM-owned files match recorded hashes) → every `prism` file `removed` (no `.bak`), all projected `prism-*` marked skills removed, empty dirs pruned, manifest removed, `manifestRemoved: true`. Assert the PRISM-owned files are gone from disk and the manifest is absent.
    - **Diverged files:** a PRISM-owned file whose bytes differ from the recorded hash → `removed-with-backup`, `.bak` exists on disk after eject, original removed. Assert the `.bak` content equals the pre-eject divergent content. A pre-existing `.bak` is never clobbered (assert `.bak.1` naming via `resolveBackupPath` reuse).
    - **Consumer-owned content preserved:** seed `plans/foo.md`, `lessons.md`, `custom/bar.md`, a flat `architect/baz.md` → all still on disk after a full eject; each appears as `preserved` in `fileOutcomes`; a `preservedNotices` entry names them.
    - **`--yes` safety / dry-run parity (non-behavioral):** `runEject` with `confirmed: false` (or `dryRun: true`) computes the identical `EjectReport` shape but leaves every file, skill, and the manifest on disk. Assert disk is byte-identical before and after the preview run. Assert the preview report and the real report list the same outcomes.
    - **Marker safety:** a `prism-`-prefixed skill dir **without** `.ai-skill-generated` → `skipped-no-marker`, still on disk after eject. A `custom-foo` skill dir with a marker → `skipped-not-prism`, still on disk. Neither is ever deleted.
    - **No-manifest repo:** `runEject` against a `.prism/` with no `.sync-manifest.json` → returns the "nothing to eject" report, deletes nothing, does not throw.

12. **Verification.** Run in order: `pnpm run prism:check-types`, `pnpm run prism:crossref-lint`, `pnpm run prism:test`. All green before handoff. Do not open a PR (Sol owns the lifecycle gate).

### Eli (documentation)

1. **README.md** — add `prism eject` to the consumer CLI command list wherever `prism doctor` / `prism update` are documented, one line describing it removes PRISM (requires `--yes`, supports `--dry-run`) and preserves consumer-owned content + `.bak` snapshots.
2. **docs/adopt-prism.md** — add an "Ejecting PRISM" section covering: what eject removes vs preserves (the `classifyPath` mirror), the `--yes` requirement and dry-run-by-default posture, the diverged-`.bak` guarantee, the AGENTS.md/CLAUDE.md manual-prune note, and re-adoption after eject. Cross-reference `.prism/plans/issue-377.md` Decisions for the rationale.

Docs tasks depend on Clove's command being implemented; sequence Eli after Clove.

---

## Decisions

- **Delete set is the manifest filtered by `classifyPath === "prism"`, not a live glob walk.** Eject removes exactly the files recorded in `.sync-manifest.json` that `classifyPath` marks PRISM-owned; consumer-owned (`plans/`, `lessons.md`, `custom/**`, flat `architect/*.md`, `architect/manifest.json`, flat `spec/adrs/*.md`) and unknown paths are preserved with a printed notice.
  - **Root cause:** the manifest is the authoritative record of what PRISM *installed* — `doctor.ts` already treats it so (lines 205–250). Eject's delete set must be the inverse of what adopt/update wrote, and `classifyPath` is the single canonical owner-decider both already use.
  - **Alternatives considered:** walk `.prism/` on disk and match `PRISM_OWNED_GLOBS` directly.
  - **Chosen approach:** manifest-driven. Beats the live glob walk because a consumer could have dropped their own file under a PRISM-owned glob (e.g. a new file in `rules/`) that PRISM never installed — the glob walk would delete it; the manifest never recorded it, so the manifest-driven pass correctly leaves it as `unknown`.
  - **Implementation guidance:** iterate `manifest.files`, branch on `classifyPath`, reuse `applyDeletedFile` for the `prism` branch.
  - → no promotion needed (ticket-tactical; the general owner-classification rule already lives in `ownership.ts` and its JSDoc).

- **Diverged PRISM-owned files are removed but their `.bak` is preserved — eject never destroys user data silently.** When a PRISM-owned file's bytes differ from the recorded hash, eject backs it up to `.bak` (or the next free `.bak.N`) before removing it, and never deletes any existing `.bak` sibling.
  - **Root cause:** a diverged file *is* the consumer's edited work; the `.bak` is the only copy once the file is removed. Silent destruction is the failure mode the issue explicitly warns against ("lean toward not destroying user data silently").
  - **Alternatives considered:** delete both the file and its `.bak` for a fully-clean tree; delete the file but not the `.bak` (chosen); delete neither (leave diverged files in place).
  - **Chosen approach:** delete the file, preserve the `.bak`. Beats delete-both (destroys re-appliable edits and the only record of them) and beats leave-in-place (leaves PRISM-authored content behind, defeating "clean eject"). Reuses `update.ts`'s `applyDeletedFile` (lines 217–244) and `backupConsumerFile`/`resolveBackupPath`, which already implement exactly this and are tested.
  - **Implementation guidance:** the `.bak`s are reported loudly in the completeness report so the user can find and prune them deliberately.
  - → no promotion needed (reuses an existing tested code path; behavior documented in `update.ts` JSDoc).

- **Projected `prism-*` skills/agents are removed only when both the `prism-*` prefix AND the `.ai-skill-generated` marker are present.** A `prism-`-prefixed dir without the marker (a consumer's hand-authored skill) is never deleted; a marked non-`prism-*` skill is never deleted.
  - **Root cause:** the marker is PRISM's authored-by-us signal (`removeDeletedManagedSkills` already refuses to delete marker-less dirs, `utils.ts` lines 280–283). The prefix filter is a second belt so eject can never touch `custom-*` / org-token consumer skills even if one somehow carried a marker.
  - **Alternatives considered:** prefix-only removal (no marker check); marker-only removal (no prefix check).
  - **Chosen approach:** both gates required. Beats prefix-only (a consumer could hand-author a `prism-`-prefixed skill; deleting it would destroy their work) and beats marker-only (defense-in-depth against a mis-marked consumer skill). Mirrors the existing marker gate exactly.
  - **Implementation guidance:** consider reusing `removeDeletedManagedSkills` with an empty valid-set + a prefix pre-filter; otherwise replicate its marker gate.
  - → no promotion needed (ticket-tactical; the marker convention itself is documented in `generate-skills.ts` JSDoc and ADR-referenced by prism-242).

- **`.sync-manifest.json` is removed last; no tombstone is left.** After all PRISM-owned files and projected skills are removed and empty dirs pruned, the manifest is deleted as the final step.
  - **Root cause:** the manifest is what `doctor`/`update` read to decide an install exists, and `prism adopt`'s `assertConsumerIsEstablished` (`adopt.ts` lines 110–120) *refuses to run* when a manifest is present.
  - **Alternatives considered:** keep the manifest as a tombstone record of the former install.
  - **Chosen approach:** remove it. A tombstone would block `prism adopt` from re-adopting — the exact opposite of eject's anti-lock-in purpose — and would make `doctor` report a half-present install. Removing it last (after everything it records is gone) keeps the report accurate throughout the pass.
  - **Implementation guidance:** empty-dir cleanup runs before the manifest removal; a dir holding preserved consumer content must survive the prune.
  - → no promotion needed (ticket-tactical).

- **`--yes` is required to delete; without it eject is dry-run-by-default. `--dry-run` is an explicit preview synonym, and when both are passed `--dry-run` wins (no deletion).** A single `previewOnly = !confirmed || dryRun` boolean gates every `fs` mutation.
  - **Root cause:** eject is destructive; the "evaluation-minded team" audience runs it partly to *see* what leaving would cost. Default-safe means an accidental `prism eject` with no flags prints the plan and deletes nothing.
  - **Alternatives considered:** delete-by-default with `--dry-run` as the only preview path; require `--yes` and treat `--dry-run` as an error when combined.
  - **Chosen approach:** dry-run-by-default; `--yes` opts into real deletion; `--dry-run` forces preview even alongside `--yes`. Beats delete-by-default (one careless invocation wipes the install) and beats erroring-on-both (an explicit preview request should always be honored, never rejected). Reuses `parseDryRunFlag` (`lib/consumer-root.ts` lines 197–205) and the compute-then-guard split from `update.ts`'s `applyFilePass` (the L376 seam).
  - **Implementation guidance:** `previewOnly` is checked at every write site exactly as `applyFilePass` checks its `dryRun` param; the returned `EjectReport` is identical in shape for preview and real runs so the report reads the same either way.
  - → no promotion needed (ticket-tactical; extends the existing `--dry-run` posture established by L376).

- **AGENTS.md and CLAUDE.md are left in place; eject reports PRISM's contribution instead of deleting.** AGENTS.md's PRISM block is delimited by `AGENTS_MD_BLOCK_BEGIN`/`END`; eject names those markers so the user can prune by hand. CLAUDE.md was seeded whole; eject notes it and recommends manual review.
  - **Root cause:** both files are seeded once and are commonly consumer-edited; auto-deleting risks destroying consumer content, and auto-editing the AGENTS.md block risks corrupting a file the consumer owns.
  - **Alternatives considered:** strip the AGENTS.md generated block automatically; delete both files.
  - **Chosen approach:** report-only. Beats auto-strip (the block edit is easy to get wrong on a consumer-modified file and is reversible by hand anyway) and beats delete (destroys consumer edits). The issue explicitly requires "leave in place but print what PRISM contributed."
  - **Implementation guidance:** detection is read-only; the begin/end marker constants come from `agents-md-block.ts`.
  - → no promotion needed (ticket-tactical).

- **`applyDeletedFile`/`backupConsumerFile`/`resolveBackupPath`/`hashFileIfExists`/`resolveConsumerSkillTargetRoots` are exported directly from `update.ts`, not lifted into a shared `lib/` module.** Option (a) from the task list.
  - **Root cause:** the task list offered two options — export from `update.ts` (a), or lift into a shared `lib/` module if importing from `update.ts` was awkward (b).
  - **Alternatives considered:** (b) lifting into `lib/`.
  - **Chosen approach:** (a). `update.ts`'s module-level code has no side effects beyond `isMain`-guarded CLI dispatch, so importing its functions carries no unwanted load cost — (b)'s justification never applied.
  - **Implementation guidance:** none beyond the exports themselves; see `update.ts` for the reused functions.
  - → no promotion needed (ticket-tactical).

- **Codex agent `.toml` removal keys off `removeDeletedManagedAgentFiles`'s existing generated-header-line gate, not a sibling skill dir's marker.** `generate-skills.ts` already ships `removeDeletedManagedAgentFiles`, which prunes `.toml`/`.md` agent adapters whose content contains `GENERATED_HEADER_LINE`/`GENERATED_MARKDOWN_HEADER_LINE` and whose skill ID is absent from a valid-set — the exact same marker-substitute problem the task anticipated, already solved for flat files with no directory to hold a `.ai-skill-generated` marker.
  - **Root cause:** flat agent adapter files (`prism-*.toml`, `prism-*.md`) have no directory to carry `.ai-skill-generated`; `generate-skills.ts` already solved this with an in-file header-line check when it originally built agent-file pruning for `prism:update`.
  - **Alternatives considered:** "only remove `prism-*.toml` when the corresponding `prism-*` skill dir was itself marker-confirmed" (the task's stated default).
  - **Chosen approach:** reuse `removeDeletedManagedAgentFiles` directly (now exported) rather than re-deriving a sibling-dir dependency — it's the tested, already-existing mechanism for exactly this file shape, and coupling `.toml` removal to a *different* root's skill-dir marker would be a novel, untested dependency for no correctness gain.
  - **Implementation guidance:** `eject.ts`'s `collectAgentFileOutcomes` scans `.codex/agents` and `.claude/agents` independently, applying the prefix gate first (see next Decision) and delegating to `removeDeletedManagedAgentFiles`.
  - → no promotion needed (ticket-tactical; the reused function's contract is documented in `generate-skills.ts`).

- **The `prism-*` prefix gate must be enforced by passing non-`prism-*` marked entries back into `removeDeletedManagedSkills`/`removeDeletedManagedAgentFiles`'s `validSkillIds` set — a pre-scan alone does not gate the delegated deletion.**
  - **Root cause:** the first implementation pass pre-scanned each skill/agent root to classify outcomes (`skipped-not-prism` / `skipped-no-marker` / `removed`) but then called `removeDeletedManagedSkills(outputRoot, new Set(), ...)` with an *empty* valid-set — that empty set has no prefix awareness, so a marker-confirmed skill that is NOT `prism-*` (e.g. a hypothetical marked `custom-foo`) would still be deleted as an "orphan." Caught by the `eject.test.ts` marker-safety test (`custom-foo` case), which failed on first run.
  - **Alternatives considered:** re-implement the deletion loop from scratch with an inline prefix+marker check (would duplicate `removeDeletedManagedSkills`'s tested logic); wrap `removeDeletedManagedSkills` in a pre-filter that renames/moves non-`prism-*` dirs temporarily (needlessly destructive).
  - **Chosen approach:** collect every non-`prism-*` entry name into a `keepIds` set during the pre-scan and pass that set as `validSkillIds` to the reused deletion functions — they already treat anything in the valid-set as "not orphaned." This makes the prefix gate structurally enforced by the same call that enforces the marker gate, rather than relying on the pre-scan and the deletion call agreeing by convention.
  - **Implementation guidance:** see `collectSkillDirOutcomes` and `collectAgentFileOutcomes` in `eject.ts` — both build `keepIds` before calling their respective `removeDeletedManaged*` function.
  - → no promotion needed (ticket-tactical; but worth flagging in review as the kind of gap a "reuse the existing function" plan step can hide until a test exercises the exact combination).

---

## History

- 2026-07-02 [hmcgrew/377-prism-eject]: Winston planned `prism eject` deletion semantics — delete set mirrors `classifyPath`, diverged files preserved as `.bak`, marker+prefix-gated skill removal, dry-run-by-default with `--yes`. Command is a thin composition of existing tested primitives (`applyDeletedFile`, `removeDeletedManagedSkills` marker gate).
- 2026-07-02 [hmcgrew/377-prism-eject]: Clove implemented `scripts/ai-skills/eject.ts` (`runEject`/`runEjectCli`/`formatEjectReport`), exported `applyDeletedFile`/`backupConsumerFile`/`resolveBackupPath`/`hashFileIfExists`/`resolveConsumerSkillTargetRoots` from `update.ts` and `removeDeletedManagedAgentFiles` from `generate-skills.ts` for reuse, added `parseConfirmFlag` to `lib/consumer-root.ts`, and wired `eject` into `cli.ts` and `package.json`. See Decisions below for the prefix+marker gate fix a test caught.
- 2026-07-02 [hmcgrew/377-prism-eject]: Eli documented `prism eject` in README's consumer CLI table and added the "Ejecting PRISM" section to `docs/adopt-prism.md`.

---

## Acceptance Criteria

### Behavioral

- [x] Given a clean PRISM install (all PRISM-owned files match the recorded manifest hashes), When I run `prism eject --yes`, Then every PRISM-owned `.prism/` file and every projected `prism-*` skill/agent is removed, the sync manifest is removed, and the completeness report states the eject is complete.
- [x] Given a PRISM-owned file I edited (diverged from the recorded hash), When I run `prism eject --yes`, Then the file is backed up to a `.bak` snapshot before removal, the `.bak` is preserved on disk, and the completeness report lists that `.bak` path.
- [x] Given consumer-owned content (`plans/`, `lessons.md`, `custom/**`, a flat `architect/*.md`), When I run `prism eject --yes`, Then all of it remains on disk and the completeness report lists it as preserved.
- [x] Given a `prism-`-prefixed skill dir with no `.ai-skill-generated` marker (a hand-authored skill), When I run `prism eject --yes`, Then that skill is not deleted and the report records it as skipped (no marker).
- [x] Given a repo with no `.sync-manifest.json`, When I run `prism eject --yes`, Then nothing is deleted and the report states there is nothing to eject.
- [x] Given AGENTS.md and CLAUDE.md exist, When I run `prism eject --yes`, Then both files remain on disk and the report names PRISM's AGENTS.md block markers and notes CLAUDE.md for manual review.

### Non-behavioral

- [x] `prism eject` without `--yes` performs no deletion — it prints exactly what would be removed and leaves the repo byte-identical (dry-run-by-default).
- [x] `prism eject --dry-run` (with or without `--yes`) performs no deletion and produces the same report shape a real run would.
- [x] The completeness report accounts for every action: files removed, files removed-with-backup (each `.bak` path listed), consumer content preserved, skills/agents removed, skills skipped with reason, empty dirs removed, manifest removed.
- [x] Deletion and backup logic reuses `update.ts`'s `applyDeletedFile` / backup primitives and the `.ai-skill-generated` marker gate — no reimplemented delete-or-backup logic.
- [x] Verification passes: `pnpm run prism:check-types`, `pnpm run prism:crossref-lint`, `pnpm run prism:test` all green.

### AC Adjustments

### AC Sync Log

| Date | Agent | Action | Plan | Linear |
| ---- | ----- | ------ | ---- | ------ |
| 2026-07-02 | Winston | Generated AC from issue #377 done-conditions | issue-377 | N/A (GitHub issue) |

---

## PR Readiness

- [x] No critical or major issues
- [x] Types correct — no `any`, no unsafe `as` (used a runtime type-guard narrowing function instead of a cast — see `isDeletePathAction` in `eject.ts`)
- [x] No stray console.logs or debug artifacts
- [x] Tests written for new logic and edge cases (full eject / diverged-with-existing-.bak / consumer-preserved / marker-safety for both skill dirs and flat agent files / dry-run parity (`confirmed: false` and `dryRun: true`) / no-manifest / AGENTS.md+CLAUDE.md reporting / empty-dir prune / non-git guard / report formatting)
- [x] All debugged issues resolved (no `open` entries)
- [x] Build passes — `pnpm run prism:build` clean; `pnpm run prism:test` 456 tests, 452 pass, same 4 pre-existing Windows-path failures as `origin/main` baseline (confirmed via throwaway worktree, not stash)
- [ ] PR description up to date (pending PR open)
- [x] Lasting decisions promoted to architect context — not applicable; all Decisions are ticket-tactical per their verdict sub-bullets

**Last updated:** 2026-07-02
