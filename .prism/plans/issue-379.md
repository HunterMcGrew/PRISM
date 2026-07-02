# Plan: issue-379

## Ticket

https://github.com/HunterMcGrew/PRISM/issues/379 (epic #373, lane L379)

## Goal

Add Windows-path regression coverage for the manifest-key normalization contract (sync-manifest, `update.ts`, `adopt.ts`, `classifyPath`), and fix the 4 pre-existing Windows-only test failures this repo has carried across every prior Windows-path lane.

---

## Implementation Tasks

### Clove

1. `sync-manifest.test.ts` — add a nested relative path round-trip test: write a file under a multi-segment subdirectory, generate the manifest, assert the key is forward-slash-normalized regardless of `path.sep`.
2. `update.test.ts` — add a `.bak` creation test using a nested relative path (multiple segments) to pin that `resolveBackupPath`/`backupConsumerFile` produce a correct `<path>.bak` on Windows including intermediate separators.
3. `adopt.test.ts` — add a seed test with a nested relative path (2+ segments) to pin `walkAndSeed`'s `path.relative(...).split(path.sep).join("/")` normalization on Windows.
4. `ownership.test.ts` — add `classifyPath` tests with mixed/backslash-style input segments to pin that classification is glob-matched against forward-slash keys (the manifest's stored form), not raw OS paths.
5. Fix `crossref-lint.test.ts` — 3 `resolveRef` tests hardcode POSIX expected strings (`/repo/.prism/...`). Rewrite to assert OS-agnostic behavior (`path.resolve` result) instead of a hardcoded separator.
6. Fix `generate-skills.test.ts:315-319` — `new URL(import.meta.url).pathname` is wrong on Windows (leading slash + `%20`-encoded spaces breaks `path.dirname`/`path.join`). Replace with `fileURLToPath(import.meta.url)`, the pattern already used correctly in `update.ts`/`adopt.ts`.
7. Add a `windows-latest` leg to `.github/workflows/prism-check.yml`'s `prism-check` job via `strategy.matrix.os` with `fail-fast: false`.

---

## Decisions

- **All 4 pre-existing Windows failures are fixed in this lane, not deferred.** All four are contained, well-understood, single-file fixes with no wide blast radius — the crossref-lint fix only touches test assertions (not `resolveRef` itself), and the generate-skills fix swaps one URL-parsing call for the codebase's own established `fileURLToPath` pattern.
  - **Root cause (crossref-lint):** `resolveRef` internally calls `path.resolve`/`path.join`, which always emit the OS-native separator. The tests fed POSIX-style inputs (`/repo/...`) and asserted POSIX-style outputs — correct on Ubuntu CI, wrong on Windows where `path.resolve` returns `D:\repo\...`.
  - **Root cause (generate-skills):** `new URL(import.meta.url).pathname` returns a URL path component, not an OS path — on Windows this yields a leading slash before the drive letter (`/D:/...`) and `%20` for spaces (never decoded). Downstream `path.dirname`/`path.join` treat this as a literal string, producing `D:\D:\...%20...` — a doubled drive letter and an unresolved literal path segment.
  - **Alternatives considered:** skip/deferred-with-follow-up ticket. Rejected — this is the dedicated Windows-path lane; deferring here just re-adds "4 pre-existing failures" to the next lane's plate, which is the exact pattern that's repeated across `epic-floor-revert.md`, `epic-prism-enforcement-layer.md`, `issue-305-floor-canonical-backdoor.md`, and `issue-376.md`.
  - **Chosen approach:** (1) rewrite the 3 `resolveRef` tests to build their expected value via `path.resolve`/`path.join` (asserting the contract, not a hardcoded string); (2) swap `new URL(import.meta.url).pathname` for `fileURLToPath(import.meta.url)` in `generate-skills.test.ts`.
  - **Implementation guidance:** do not touch `resolveRef`'s implementation — the bug is in the test's hardcoded expectations, not the function. For generate-skills, `fileURLToPath` is already imported/used correctly elsewhere in this codebase (`update.ts`, `adopt.ts`) — same import, same call shape.
  - → no promotion needed (implementation-tactical test fixes; the underlying contract — manifest keys are forward-slash-normalized, OS path resolution uses `path.*` not URL parsing — is already documented in `sync-manifest.ts`'s own JSDoc and doesn't need a new architect doc).
- **Added a `windows-latest` leg to `.github/workflows/prism-check.yml`.** Turned the single `prism-check` job into a `matrix.os: [ubuntu-latest, windows-latest]` with `fail-fast: false`, so both platforms run every PR and one platform failing doesn't cancel the other mid-run.
  - **Alternatives considered:** skip the CI leg and rely on this session's one-time local Windows verification plus the new normalization-contract tests (which assert forward-slash output regardless of which OS runs the test process).
  - **Chosen approach:** add the leg. The change is a two-line matrix addition to an existing single-job workflow — genuinely cheap, not a new pipeline — and it converts "verified once, locally, by whoever happened to be on Windows this session" into a permanent, every-PR signal. That's a better trade than saving a few CI minutes, especially since this is literally the fourth lane in this epic to carry "4 pre-existing Windows failures" — a standing CI leg is what stops a fifth.
  - **Implementation guidance:** no new Windows-only test skip logic was needed — the fix set (this PR) already makes the full suite pass on Windows, so the new leg should be green from its first run.
  - → no promotion needed (CI-topology change, self-contained to this ticket's scope; the workflow file itself is the durable record).

---

## History

- 2026-07-02 [hmcgrew/379-windows-path-tests]: Added Windows-path regression tests across sync-manifest, update, adopt, and ownership; fixed the 4 pre-existing Windows-only failures (3 crossref-lint POSIX-hardcoded assertions, 1 generate-skills `%20`/double-drive URL-parsing bug).

---

## Acceptance Criteria

### Behavioral

- [x] Given a nested relative path with multiple segments, When the sync manifest is generated, Then the manifest key is forward-slash-normalized regardless of the host OS's path separator.
- [x] Given a diverged consumer file at a nested relative path, When `prism:update` backs it up, Then the `.bak` file is created at the correct nested location with Windows-correct separators.
- [x] Given a nested relative path during `prism:adopt` seeding, When the seed pass runs, Then the written/skipped path in the summary is forward-slash-normalized.
- [x] Given `classifyPath` is called with a manifest-form (forward-slash) key, When classification runs, Then it matches the same globs on Windows as on POSIX.
- [x] Given the `resolveRef` tests, When run on Windows, Then they assert against `path.resolve`-produced values (OS-agnostic) instead of hardcoded POSIX strings.
- [x] Given `generate-skills.test.ts`'s "renders PRISM's own source" test, When run on Windows, Then `loadPathDefinitions` resolves the real repo root (no `%20` or doubled drive letter).

### Non-behavioral

- [x] `pnpm run prism:test` passes with 0 failures on this Windows machine (was 4 pre-existing failures) — confirmed: 470 tests, 470 pass, 0 fail (up from 463/459/4).
- [x] `pnpm run prism:build` passes clean; crossref-lint and verify-manifest stay green — confirmed via `pnpm run prism:check` (build --check + check-types + test + verify-manifest + crossref-lint), exit 0.
- [x] No new failures introduced on ubuntu CI (existing passing tests stay passing — verified by reasoning: the crossref-lint fix only changes assertion values computed via `path.resolve`, which is identity-equivalent to the old hardcoded string on POSIX; the generate-skills fix uses `fileURLToPath`, which is POSIX-correct too). Will get a live second signal from the new `windows-latest` CI leg on this PR's own run.

---

## PR Readiness

- [x] No critical or major issues
- [x] Types correct — no `any`, no unsafe `as`
- [x] No stray console.logs or debug artifacts
- [x] Tests written for new logic and edge cases
- [x] All debugged issues resolved (no `open` entries)
- [x] Build passes — last run: 2026-07-02 (`pnpm run prism:check`, exit 0)
- [ ] PR description up to date — pending PR creation
- [x] Lasting decisions promoted to architect context (if applicable) — N/A, see Decisions verdicts above

**Last updated:** 2026-07-02
