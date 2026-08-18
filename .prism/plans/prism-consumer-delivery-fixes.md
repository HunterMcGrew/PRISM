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

## History

- 2026-08-18 [huntermcgrew/prism-consumer-delivery-fixes]: Added `lib/seed-curation.ts` and inverted seed-curation.json's renames through `adopt.ts`'s seed copy and `update.ts`'s full file pass (`sync-manifest.ts`, `applyFilePass`, `rewriteConsumerManifest`); added a `prism doctor` `seed-delivery` check with an `mv` remedy for already-adopted consumers; shipped `seed-curation.json` in `package.json`'s `files`; bumped to 0.8.1.

---

## PR Readiness

- [x] No critical or major issues
- [x] Types correct — no `any`, no unsafe `as`
- [x] No stray console.logs or debug artifacts
- [x] Tests written for new logic and edge cases
- [x] All debugged issues resolved (no `open` entries)
- [x] Build passes — last run: 2026-08-18 (`pnpm prism:check`, exit 0)
- [ ] PR description up to date
- [x] Lasting decisions promoted to architect context (if applicable) — see verdicts above, none required promotion

**Last updated:** 2026-08-18
