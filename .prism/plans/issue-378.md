# Plan: issue-378

## Ticket

https://github.com/HunterMcGrew/PRISM/issues/378 (lane L378 of epic #373)

## Goal

`prism update` prints the version delta between the consumer's prior PRISM version and the new one, points at the CHANGELOG, ships `CHANGELOG.md` in the npm tarball, and the docs cover pinned installs.

---

## Implementation Tasks

### Clove (implementation)

1. `scripts/ai-skills/update.ts` — `rewriteConsumerManifest` already reads `previousConsumerManifest?.prismVersion` and the new `sourceManifest?.prismVersion`; have it also return a `VersionDelta` (`{ previous: string | null; current: string; changed: boolean }`) instead of just writing the file. Thread that return value up through `applyFilePass`'s `UpdateSummary` (new `versionDelta` field) and `runUpdate`.
2. `reportSummary` in both `update.ts` and `adopt.ts` — print the delta line when `changed` is true (`PRISM 0.6.0 -> 0.7.0 — see CHANGELOG.md`), skip it on first-adopt (`previous === null`) since there's nothing to delta against.
3. Add `CHANGELOG.md` to `package.json`'s `files` allowlist so the pointer resolves for real npm consumers.
4. `docs/adopt-prism.md` — add an `update`-side pinning example next to the existing `adopt` one, and a short mention of the new delta output under the `prism update` section.
5. `docs/getting-started.md` — add a one-line pinning mention under "Keeping PRISM up to date" that points at `adopt-prism.md`'s pinning section (absorbed per the Decision below — small, tightly-coupled addition to a file already in scope).
6. Test in `scripts/ai-skills/update.test.ts`: `runUpdate` reports a version delta when the consumer's prior manifest has an older `prismVersion` than the source; reports no delta (or `previous: null`) on first-adopt (no prior manifest).

---

## Decisions

- Absorbed the `docs/getting-started.md` pinning mention into this PR instead of routing to Eli — it's a one-line pointer to the pinning section `adopt-prism.md` already documents (added under a different ticket), not new narrative content. Per `.claude/rules/code-standards.md` cross-lane guidance: same-PR absorption is faster than a handoff for a change this small, and it's in a file Clove is already touching for this ticket.
- `docs/adopt-prism.md` already has a full "Pinning vs. latest" section (pre-existing, not added by this ticket) — this ticket only adds the `update`-side pinning example and the delta-output mention, not new pinning conceptual content.
- Version delta is computed from the consumer's own prior `.sync-manifest.json` (`previousConsumerManifest.prismVersion`) vs. the PRISM source's current manifest (`sourceManifest.prismVersion`) — both already resolved locally inside `rewriteConsumerManifest`. No network call, no npm lookup. This is a different comparison than `doctor.ts`'s `checkVersion`, which compares the installed `package.json` version against npm's published `latest` (network-dependent) — the two features are complementary, not overlapping, and `doctor.ts` is untouched by this ticket.

---

## History

- 2026-07-02 [hmcgrew/378-version-delta]: Created plan for issue #378.
- 2026-07-02 [hmcgrew/378-version-delta]: Implemented version delta (`update.ts`'s `computeVersionDelta`/`rewriteConsumerManifest`/`previewVersionDelta`, `formatVersionDeltaLine` reused by `adopt.ts`), added `CHANGELOG.md` to `package.json` `files`, updated `adopt-prism.md`/`getting-started.md` pinning docs, added 4 tests. `prism:test` 463/463 new-relevant (459 pass + same 4 pre-existing Windows-path failures confirmed against an origin/main baseline worktree); `prism:check-types` and `prism:crossref-lint` clean.

---

## Acceptance Criteria

### Behavioral

- [x] Given a consumer with a prior `.sync-manifest.json` recording `prismVersion: 0.6.0`, When `prism update` runs against a PRISM source at `0.7.0`, Then the output prints a delta line naming both versions and pointing at `CHANGELOG.md`.
- [x] Given a first-time `prism adopt` (no prior manifest), When the sync completes, Then no delta line is printed (nothing to compare against) and the new version is recorded.
- [x] Given a consumer already at the source's current version, When `prism update` runs, Then no delta line is printed (`changed: false`).

### Non-behavioral

- [x] `CHANGELOG.md` is present in `package.json`'s `files` allowlist.
- [x] `docs/adopt-prism.md` and `docs/getting-started.md` document pinned installs and when to pin.

### AC Adjustments

### AC Sync Log

| Date | Agent | Action | Plan | Linear |
| ---- | ----- | ------ | ---- | ------ |

---

## PR Readiness

- [x] No critical or major issues
- [x] Types correct — no `any`, no unsafe `as`
- [x] No stray console.logs or debug artifacts
- [x] Tests written for new logic and edge cases
- [x] All debugged issues resolved (no `open` entries)
- [x] Build passes — last run: 2026-07-02 (`prism:build`'s test step surfaces the same 4 pre-existing Windows-only failures present on origin/main; confirmed via baseline worktree, not introduced by this change)
- [x] PR description up to date — PR #390
- [ ] Lasting decisions promoted to architect context (if applicable — none identified; delta computation is a local implementation detail, not a cross-cutting pattern)

**Last updated:** 2026-07-02
