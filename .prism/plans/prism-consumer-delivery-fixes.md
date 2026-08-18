# Plan: prism-consumer-delivery-fixes

## Ticket

No tracker ticket — dispatched directly by Sol run `architect-gate-port`, lane `pr0`. See `.prism/plans/conductor/architect-gate-port.md` (run-control, not edited by this plan).

## Goal

Make `prism adopt`/`prism update` invert `seed-curation.json`'s canonical→seed renames on the install direction, so a consumer actually receives `.prism/architect/manifest.json` and `.prism/SPEC.md` instead of the seed's `manifest.stub.json`/`SPEC.md.tmpl` names verbatim.

---

## Implementation Tasks

### Clove (implementation)

1. Add `scripts/ai-skills/lib/seed-curation.ts` — `loadSeedCurationRenames` (reads `.ai-skills/definitions/seed-curation.json`, throws on missing/malformed) and `invertRenames` (canonical→seed to seed→canonical).
2. Ship `.ai-skills/definitions/seed-curation.json` in `package.json`'s `files` array so the npm-published CLI can read it.
3. `adopt.ts`'s `walkAndSeed` writes each seed file to its inverted (consumer-facing) path when one exists in the rename table.
4. `sync-manifest.ts`'s `listPrismOwnedRelativePaths`/`generateSyncManifest` classify and hash a renamed seed file under its consumer name, so `prism update` manages the prism-owned rename (`SPEC.md`) going forward.
5. `update.ts`'s `applyFilePass`/`applyIncomingFile`/`rewriteConsumerManifest` thread the seed→consumer rename map through so the file pass reads from the seed name and writes/records under the consumer name.
6. `doctor.ts` adds a `seed-delivery` check: an already-adopted consumer missing a renamed file gets an error finding with an `mv` remedy (or a source-seed pointer if even the stale copy is gone). Doctor never writes — matches its own no-mutation contract.
7. `docs/distribution.md` — added the same "Renamed from" note to the `SPEC.md.tmpl` row that the `manifest.stub.json` row already carried, for symmetry now that both directions are true.

---

## Decisions

- **Consumer-owned renamed files (`architect/manifest.json`) are delivered once, at adopt time, and never revisited by `prism update`.** `ownership.ts`'s `CONSUMER_OWNED_GLOBS` already excludes `architect/manifest.json` from the update pass (team-customized by Winston after adopt) — the inverted-rename fix only had to reach `adopt.ts`'s seed step for this file. → no promotion needed (matches the existing, already-documented consumer-ownership split in `ownership.ts`; this plan didn't change that boundary).
- **Prism-owned renamed files (`SPEC.md`) need the rename threaded through the whole `prism update` pass, not just adopt's seed step**, because `listPrismOwnedRelativePaths` classifies by name and a seed-named file (`SPEC.md.tmpl`) matches no glob in `ownership.ts`. Considered: leaving `update` unaware and relying on adopt's one-time seed write only — rejected, because a later `prism update` run would then see the consumer's `SPEC.md` as `unknown` (no manifest entry) and never refresh it on a real PRISM content change. Chosen: `listPrismOwnedRelativePaths`/`generateSyncManifest`/`applyFilePass`/`applyIncomingFile`/`rewriteConsumerManifest` all take an optional seed→consumer renames map (default `{}`, so every pre-existing caller and test keeps today's no-rename behavior) and classify/read/write/record under the consumer name. → no promotion needed (mechanism is local to `update.ts`/`sync-manifest.ts`; the renames-table pattern itself is documented in the new `lib/seed-curation.ts` file header).
- **`seed-curation.json` ships in the npm package.** It was previously dev-only (used by `build.ts` on the canonical→seed direction). The install-direction inverse needs the same table at runtime in a consumer's npm install, so it now ships via `package.json`'s `files` array — same shape as the earlier schema-omission fix (`.prism/plans/bug-adopt-missing-schema.md`, Bug `#1`). → no promotion needed (packaging detail, self-evident from `package.json`'s `files` array).
- **`loadSeedCurationRenames` throws loudly on a missing/malformed file when called from `adopt`/`update`, but `doctor`'s check catches and degrades to a warning finding.** `adopt`/`update` write consumer state on the assumption the renames table resolved correctly; a silent empty-map fallback there would reproduce the exact bug this plan fixes, just less visibly. `doctor` never writes and is explicitly documented (`doctor.ts` file header) to report rather than throw, so it catches at the call site instead. → no promotion needed (mirrors the existing throw-vs-catch split already documented in `doctor.ts`'s own header comment).
- **`prism doctor` reports the repair, it does not perform it.** `doctor.ts`'s existing header states it never writes to disk. The `seed-delivery` check's remedy is a plain `mv` (when the stale seed-named copy is still on disk) or a pointer at the seed's own copy (when even that's gone) — both are one-line, human-safe, and consistent with every other doctor finding. Considered: giving `doctor --repair` a write mode — rejected as a scope split from this bug fix; doctor stays read-only. → no promotion needed (extends an existing, already-documented doctor invariant; no new surface).
- **`assertSourceIsPlausible`'s empty-source count stays rename-unaware.** A real PRISM seed always ships far more than the two renamed files (`rules/**`, `templates/**`, etc.), so the plausibility guard never legitimately trips over this in production — only an artificially minimal test fixture can hit it. Test fixtures that exercise the rename now also seed one ordinary rule file so the guard sees a plausible source, rather than widening `assertSourceIsPlausible`'s signature for a case that can't occur outside a test. → no promotion needed (test-fixture concern, not a product behavior).

---

## Sessions

- 2026-08-18 [huntermcgrew/prism-consumer-delivery-fixes] open: Intent — invert seed-curation.json's renames on the install direction so `prism adopt`/`prism update` deliver `manifest.json`/`SPEC.md` instead of their seed names; Bounds — `adopt.ts`, `update.ts`, `sync-manifest.ts`, a new `lib/seed-curation.ts`, `doctor.ts`, `package.json` files array, `docs/distribution.md:66`, and their tests; no hook/manifest-schema/architect-gate changes; Approach — read the renames table once via a shared loader, invert it, thread it through adopt's seed copy and update's classify/apply/manifest passes, add a doctor check for already-adopted consumers · close: scope held
- 2026-08-18 [huntermcgrew/prism-consumer-delivery-fixes] open: Intent — self-review PR #460's delivery-fix branch for correctness, especially the doctor "already-installed consumer" repair path; Bounds — diff-only review over `76c2f7de..HEAD`, chat + plan writes, no code fixes; Approach — trace the rename inversion end to end (adopt, update, sync-manifest, doctor), independently re-run type-check and tests, live-verify the doctor repair claim rather than trust it · close: scope held — found 1 major (doctor false-positives a never-adopted consumer as unhealthy) and 2 minor test-coverage gaps, all recorded below; no code touched

## History

- 2026-08-18 [huntermcgrew/prism-consumer-delivery-fixes]: Added `lib/seed-curation.ts` and inverted seed-curation.json's renames through `adopt.ts`'s seed copy and `update.ts`'s full file pass (`sync-manifest.ts`, `applyFilePass`, `rewriteConsumerManifest`); added a `prism doctor` `seed-delivery` check with an `mv` remedy for already-adopted consumers; shipped `seed-curation.json` in `package.json`'s `files`; bumped to 0.8.1.
- 2026-08-18 [huntermcgrew/prism-consumer-delivery-fixes]: Briar self-review — 1 major (`checkSeedDelivery` misreports a never-adopted consumer as unhealthy), 2 minor (untested doctor branches). See `## Review Issues`.

---

## Review Issues

### `checkSeedDelivery` reports a never-adopted consumer as unhealthy with a wrong remedy

- **Severity:** `major`
- **Status:** `open`
- **File:** `scripts/ai-skills/doctor.ts:182-227` (`checkSeedDelivery`), called unconditionally from `runDoctor` at `:526`
- **Problem:** `checkSeedDelivery` has no guard for "this consumer has never run `prism adopt`" versus "this consumer adopted before the rename fix." Reproduced live: a fresh consumer repo with a real (non-empty) `seed-curation.json` renames table and no `.prism/` content at all gets `report.healthy: false` with two `error` findings ("`.prism/architect/manifest.json` is missing and no seed copy... re-run `pnpm prism:update`"), directly contradicting the doctor contract the adjacent test at `doctor.test.ts:135` documents in its own comment: "a fresh repo that hasn't run `prism adopt` is still a healthy target for it." The suggested remedy is also wrong for this case — a never-adopted consumer needs `prism:adopt`, not `prism:update`. The test suite never catches this because `withTempRoots`'s default fixture seeds `seed-curation.json` with an empty `renames: {}` (`doctor.test.ts:107`), so every existing test — including the "fresh repo is healthy" test itself — runs `checkSeedDelivery` over zero rename entries and never exercises it against the real, non-empty production table.
- **Class:** missing-guard: a check assumes a precondition ("this consumer has adopted") that its caller never establishes.
- **Sweep:** grepped `checkSeedDelivery` and `loadSyncManifest` usage across `scripts/ai-skills/doctor.ts` — `checkSyncManifest` (the sibling check) already loads the sync manifest and treats its absence as an `info` finding via `loadSyncManifest(consumerContentRoot)` (`doctor.ts:268`); `checkSeedDelivery` has no equivalent gate. No other doctor check shares this shape, so the fix is local to `checkSeedDelivery`.
- **Suggested fix:** gate `checkSeedDelivery` on the sync manifest's presence — return `[]` early when `await loadSyncManifest(consumerContentRoot)` is `null` (mirroring `checkSyncManifest`'s own null-check), since a consumer with no sync manifest has never adopted and the renamed-file check doesn't apply yet.

### Doctor's "no seed copy either" branch is untested

- **Severity:** `minor`
- **Status:** `open`
- **File:** `scripts/ai-skills/doctor.ts:213-226` (`checkSeedDelivery`, `staleSeedAbsolute` absent branch)
- **Problem:** `doctor.test.ts` covers the mv-remedy branch (stale seed copy present) and the no-finding branch (canonical file present), but not the branch where neither the canonical file nor the stale seed copy exists — the "copy it from the PRISM install seed" message path.
- **Class:** untested branch on new conditional logic.
- **Sweep:** grepped `check === "seed-delivery"` in `doctor.test.ts` — two tests found (`:343`, `:383`), neither covers the "copy from install seed" message.
- **Suggested fix:** add a test asserting the message and severity for the case where both the canonical and seed-named files are absent — once the major finding above is fixed, this branch only fires for an adopted-but-corrupted `.prism/` (sync manifest present, both file names gone), so the fixture should write a sync manifest to represent that state.

### `loadSeedCurationRenames` throw-to-warning degrade path is untested in doctor

- **Severity:** `minor`
- **Status:** `open`
- **File:** `scripts/ai-skills/doctor.ts:190-198` (`checkSeedDelivery`'s `catch` block)
- **Problem:** The plan's own Decisions document doctor's throw-vs-catch split (`doctor` catches `loadSeedCurationRenames`'s throw and degrades to a `warning` finding) as load-bearing behavior, but no test in `doctor.test.ts` exercises a missing or malformed `seed-curation.json` reaching `checkSeedDelivery`.
- **Class:** untested branch on documented behavior.
- **Sweep:** grepped `seed-curation.json` in `doctor.test.ts` — every occurrence writes a valid file; none omits or corrupts it.
- **Suggested fix:** add a test that omits `seed-curation.json` from the temp `prismSourceRoot` and asserts `checkSeedDelivery` returns a `warning` finding rather than throwing.

### Angle Coverage

- Logic correctness: `swept` — enumeration: `adopt.ts` walkAndSeed rename inversion, `update.ts` applyFilePass/rewriteConsumerManifest rename threading, `doctor.ts` checkSeedDelivery (found the major above), `lib/seed-curation.ts` load/invert.
- Type safety: `swept` — enumeration: `pnpm run prism:check-types` (`tsc --noEmit -p scripts/ai-skills/tsconfig.json`), exit 0, re-run independently.
- Test coverage: `swept` — enumeration: `adopt.test.ts`, `doctor.test.ts`, `sync-manifest.test.ts`, `update.test.ts`, `lib/seed-curation.test.ts` — 107 tests re-run independently, all pass; 2 branch gaps found (minors above).
- Accessibility: `n/a` — enumeration: no UI surface in this diff (CLI/build scripts only).
- Removal/rename completeness: `swept` — enumeration: grepped `listPrismOwnedRelativePaths` call sites (3: `sync-manifest.ts` def, `update.ts` ×2) — `assertSourceIsPlausible`'s unrenamed call verified intentional (emptiness check only, doesn't need classification).
- Docs impact: `swept` — enumeration: `docs/distribution.md:62` — the `SPEC.md.tmpl` row's "Renamed from" note added for symmetry with the existing `manifest.stub.json` row; verified correct and consistent.
- Spec/plan consistency: `swept` — enumeration: plan's `## Decisions` (5 entries) cross-checked against the diff; all five hold as written. No AC section exists for this plan (known gap, routed to Winston by Sol per the run log — not this review's to fix).
- Citation integrity: `swept` — enumeration: plan's Decisions cite `ownership.ts`, `doctor.ts`'s own header, and `bug-adopt-missing-schema.md` — all verified present and accurate.
- Cleaner paths: `verdict-only` — none found; the shared-loader/invert-table design is already the clean shape.

---

## Cleanup Items

None.

---

## PR Readiness

- [ ] No critical or major issues — 1 major open (`checkSeedDelivery` misreports never-adopted consumers)
- [x] Types correct — no `any`, no unsafe `as`
- [x] No stray console.logs or debug artifacts
- [x] Tests written for new logic and edge cases — 2 branch gaps flagged as minor
- [x] All debugged issues resolved (no `open` entries)
- [x] Build passes — last run: 2026-08-18 (`pnpm prism:check`, exit 0; independently re-verified type-check + full test suite this session)
- [ ] PR description up to date
- [x] Lasting decisions promoted to architect context (if applicable) — see verdicts above, none required promotion

**Last updated:** 2026-08-18
