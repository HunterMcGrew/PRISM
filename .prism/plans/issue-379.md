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
- **`prism:test` discovers test files via a `node:fs` wrapper, not a shell glob.** The npm script now runs `tsx scripts/ai-skills/run-tests.ts`, which reads `scripts/ai-skills/` with `readdirSync`, filters `.test.ts`, and spawns `process.execPath` + tsx's CLI entrypoint with the explicit file list.
  - **Root cause:** the old script `tsx --test scripts/ai-skills/*.test.ts` relied on the shell to expand the glob. bash (ubuntu CI, local Git Bash) expands it; cmd.exe (the windows-latest runner's script shell under pnpm) does not, so tsx received the literal unmatched pattern and exited 1 in ~0.2s before running any test.
  - **Alternatives considered:** (1) quote the glob and let Node's `--test` runner glob it natively — rejected because native `--test` globbing requires Node >=21 and CI pins Node 20 (`setup-node` node-version: 20), so the runner would treat the quoted pattern as a literal path and match nothing. (2) `shell: true` on the spawn — rejected because it reintroduces cmd.exe, which would then re-parse the space in the repo path (`Coding Stuff`).
  - **Chosen approach:** a discovery wrapper that never touches a shell glob. It spawns `process.execPath` (absolute Node binary, no `.cmd` shim) with `require.resolve("tsx/cli")` and the explicit file list as a real argv array — no shell (`shell` defaults false), no glob, no path-with-spaces re-parsing. Portable on Node 20 across ubuntu CI, windows-latest CI, and local.
  - **Implementation guidance:** the wrapper uses the codebase's established `fileURLToPath(import.meta.url)` for its own directory (Windows-correct — no `%20`, no doubled drive letter, same pattern the generate-skills fix in this lane applied). Non-recursive `readdirSync` mirrors the flat `*.test.ts` glob — confirmed no nested test files exist, so the discovered set is byte-identical to what the shell glob resolved (469 tests, verified locally). `prism:test` was the sole Windows-fragile npm script — every other script passes explicit single-file paths; no `rm`/`cp`/other shell-isms found.
  - → no promotion needed (build-tooling fix self-contained to this ticket; the wrapper's own JSDoc is the durable record of the mechanism and why it's portable).

---

## History

- 2026-07-02 [hmcgrew/379-windows-path-tests]: Added Windows-path regression tests across sync-manifest, update, adopt, and ownership; fixed the 4 pre-existing Windows-only failures (3 crossref-lint POSIX-hardcoded assertions, 1 generate-skills `%20`/double-drive URL-parsing bug).
- 2026-07-02 [hmcgrew/379-windows-path-tests]: Fixed Eric's PR-review Major (windows-latest CI leg red — added `.gitattributes` with `eol=lf` to fix the CRLF checkout vs. LF-generated byte-compare mismatch) and Briar's minor (deleted the inert `path.join` self-check test in `sync-manifest.test.ts`; the round-trip test already covers the real contract).
- 2026-07-02 [hmcgrew/379-windows-path-tests]: Made `prism:test` discovery cross-platform — the `.gitattributes` fix advanced the Windows CI leg to a new blocker where cmd.exe doesn't expand the `*.test.ts` shell glob. Added a `node:fs` discovery wrapper (`scripts/ai-skills/run-tests.ts`) that spawns Node + tsx's CLI with an explicit file list; see Decision: cross-platform test discovery.
- 2026-07-02 [hmcgrew/379-windows-path-tests]: Fixed the last windows-latest failure — `makeTempRoot` in `consumer-root.test.ts` now canonicalizes with `realpathSync.native` instead of `realpathSync`, matching the long-form path git returns and resolving the 8.3 short-name mismatch across all 5 `resolveEnclosingConsumerRoot` cases.

---

## Debugged Issues

### 5 `resolveEnclosingConsumerRoot` tests fail on windows-latest CI: 8.3 short-path vs long-path mismatch

- **Status:** `fixed`
- **Fixed in:** `scripts/ai-skills/consumer-root.test.ts:52` — `makeTempRoot` now returns `realpathSync.native(dir)` instead of `realpathSync(dir)`, per the recommended fix below.
- **Severity:** High
- **Confidence:** `High` — root cause `[Confirmed]` by local probe reproducing the exact `realpathSync` vs git/`.native` divergence; the CI-specific trigger (`os.tmpdir()` returning the short form on the GitHub runner) is `[Deduced]` — see Missing evidence.
- **Environment:** `windows-latest` GitHub runner only (Node 20, `runneradmin` user, `os.tmpdir()` = `C:\Users\RUNNER~1\...`). Passes on ubuntu CI and local Windows Git Bash (this box's username `hunte` has no distinct 8.3 alias, so both path forms coincide — that is why it can't repro locally).
- **File:** `scripts/ai-skills/consumer-root.test.ts:52` (root cause); `scripts/ai-skills/lib/consumer-root.ts:54` (secondary amplifier for tests 66/67)
- **Root cause:** `[Confirmed]` — the test helper `makeTempRoot` canonicalizes temp dirs with `fs.realpathSync` (the JS impl), which **preserves** Windows 8.3 short names (`RUNNER~1`), while the source function returns paths from `git rev-parse --show-toplevel`, which returns the **canonical long form** (`runneradmin`); `strictEqual` compares short vs long and fails.
- **Steps to Reproduce:**
  1. On a Windows host whose temp path has a distinct 8.3 alias (GitHub `windows-latest`: `os.tmpdir()` = `C:\Users\RUNNER~1\...`).
  2. Run `pnpm run prism:test`.
  3. Tests 64–68 (`resolveEnclosingConsumerRoot` suite) fail with short/long user-dir mismatch.
- **Expected behavior:** The resolver's return value equals the test's expected consumer/prism root, so all 5 topology tests pass on every OS.
- **Actual behavior:** `expected` carries the 8.3 short form (`RUNNER~1`, from `realpathSync`) and `actual` carries the long form (`runneradmin`, from git) — every comparison fails; two cases (66/67) additionally misbehave because the mismatch defeats the source's self-identity check.
- **Local confirmation (evidence in hand):** on a forced 8.3 path, `fs.realpathSync(short)` returned `...\P83-FO~1\PRISM-~1` (short preserved) while `fs.realpathSync.native(short)` returned `...\p83-FO9ZzM\prism-consumer-plain-ABCDEFGH` (long). `git rev-parse --show-toplevel` matches the `.native`/long form. This is the exact `expected`-vs-`actual` split the CI log shows.
- **One-or-many:** ONE root cause (short/long path-form divergence) explains all 5. Tests 64, 65, 68 are pure `strictEqual` short-vs-long mismatches. Tests 66 and 67 are the **same** root cause with a **secondary amplification in the source**: at `consumer-root.ts:54` the guard `path.resolve(topLevel) !== path.resolve(prismRoot)` compares git's long-form `topLevel` against the test's short-form `prismRoot` argument — `path.resolve` does NOT expand 8.3 either, so the two strings differ and the guard passes when it should fail. Result: 66 returns the PRISM subdir (extra trailing `\PRISM`) instead of walking to the parent; 67 returns a path instead of `null`. There is no *separate* walk-logic bug — the walk is correct; it is fed mismatched path forms.
- **Refuted hypotheses:**
  - Slash-direction (`/` vs `\`) mismatch — refuted: local probe shows git returns forward slashes but `path.resolve` (used by both the source and, transitively, the expected side) normalizes to backslashes consistently; the surviving diff is purely short-vs-long segment names, not separator direction.
  - Separate parent-walk logic bug in 66/67/68 — refuted: the walk branch is only *reached* in 66 because the `:54` guard is defeated by the short/long mismatch; feed it matched path forms and the existing walk resolves correctly (it does on ubuntu and on this box).
- **Recommended fix:** **Test-side is the minimal, correct, zero-blast-radius fix.** In `consumer-root.test.ts:52`, change `makeTempRoot` to return `realpathSync.native(dir)` instead of `realpathSync(dir)`, so the test's `expected` values are canonicalized to the same long form git returns. This aligns both sides on the OS-canonical path and fixes all 5 (64,65,68 directly; 66,67 because the source's `:54` comparison then sees matching forms and the walk/null-return fires correctly). One-line change; touches only the test helper; macOS `/var→/private/var` symlink case is still handled (`.native` resolves symlinks too, superset of current behavior).
- **Fix-side analysis (why NOT source-side):** A source-side change (normalizing inside `resolveEnclosingConsumerRoot` via `realpathSync.native` on every returned/compared path) would ALSO fix it, but `resolveEnclosingConsumerRoot`/`resolveConsumerRoot` are the SHARED utility behind adopt/update/doctor/eject — a source change has real blast radius: it would canonicalize the consumer root that all four commands write against, changing the on-disk path form they resolve to (short→long) for any Windows consumer whose checkout sits under an 8.3-aliased directory. That is a behavior change to the product, made to satisfy a test-fixture artifact. The bug is in the fixture's choice of canonicalizer, not in the function — so fix the fixture. If Clove or Winston nonetheless wants source-side hardening (defensible: making the resolver return OS-canonical paths is arguably more correct), it must be `realpathSync.native` applied uniformly to BOTH sides of every `path.resolve(a) !== path.resolve(b)` comparison AND the return values, and re-verified against all four consumers (adopt/update/doctor/eject) — not a spot-patch at `:54`.
- **Suggested tests:** the existing 5 tests ARE the coverage; the fix makes them pass. No new test needed. Optionally add a one-line comment at `makeTempRoot` explaining why `.native` (8.3 expansion) is required, mirroring the existing macOS-symlink rationale comment at lines 6–11.
- **Missing evidence:**
  | Gap | Impact | How to obtain |
  | --- | --- | --- |
  | Direct confirmation that `os.tmpdir()` returns the `RUNNER~1` short form on the specific windows-latest image | The CI-trigger step is Deduced from the log's `RUNNER~1` string, not observed by me running on the runner | Add a one-line `console.log(os.tmpdir())` to the workflow, or read `RUNNER_TEMP` in a CI step; the log already shows `RUNNER~1` in the failing assertions, which is strong corroboration |
  | Test 68's full assertion detail (truncated in the log) | 68's exact failure form is inferred from the submodule code path, not read from the log | Re-run CI with full output, or trust the code-path deduction (superproject branch returns git's long form; expected is realpathSync's short form) |
- **Linear:** `N/A` (GitHub issue #379; recorded here for Sol/Clove handoff)

---

## Review Issues

### windows-latest CI leg fails — byte-exact `build.ts --check` compare mismatches on CRLF checkout

- **Severity:** `major`
- **Status:** `fixed`
- **File:** `.gitattributes` (new)
- **Problem:** Root-caused by Eric against run 28604332044 — on the windows-latest runner, `build.ts --check` reported all 224 generated files out-of-sync. `core.autocrlf=true` is the Windows runner default, so `actions/checkout@v4` converted LF source to CRLF on checkout; the byte-exact compare against the generator's LF output then mismatched on every file. ubuntu-latest was unaffected (no CRLF conversion).
- **Suggested fix:** Add a root `.gitattributes` with `* text=auto eol=lf` so git normalizes checkout to LF on every platform, matching what the generator emits.
- **Fixed in:** added `.gitattributes` with `* text=auto eol=lf`. Ran `git add --renormalize .` — zero files renormalized, confirming the committed tree was already all-LF and the fix introduces no line-ending churn.

### `sync-manifest.test.ts` "path.join accepts a forward-slash manifest key" test is a Node stdlib self-check, not a PRISM regression test

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `scripts/ai-skills/sync-manifest.test.ts:52-80`
- **Problem:** The test builds both its actual and expected values purely from `path.join`/`path.resolve` calls — it never imports or calls `applyIncomingFile`, `applyDeletedFile`, or `seedConsumerContentRoot` (confirmed: no such import exists in the file). The comment says it pins those functions' behavior and would "fail this test loudly" if a future refactor swapped `path.join` for raw string concatenation in `update.ts`/`adopt.ts` — but a regression in those files can't make this test fail, since it never calls them. It only re-verifies Node's own documented `path.join` normalization behavior.
- **Suggested fix:** Either delete the test (Node's `path.join` behavior doesn't need a PRISM-side regression pin) or rewrite it to actually call one of the three named consumer functions (e.g. assert `seedConsumerContentRoot` or `applyIncomingFile` correctly resolves a forward-slash manifest key against a real content root on disk). The other two new tests in this file (`generateSyncManifest normalizes nested relative paths...` and the round-trip test) already exercise real `generateSyncManifest` code, so this isn't a coverage gap — just one mislabeled, functionally inert test.
- **Fixed in:** deleted the test. The round-trip test (`nested relative path round-trips: write, manifest key, re-resolve`) already exercises the real contract this test claimed to pin — it calls `generateSyncManifest`, re-resolves the returned key via `path.join`, and reads the file back — so no coverage was lost.

## Cleanup Items

None.

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
- [x] Build passes — last run: 2026-07-02 (`pnpm run prism:check`, exit 0, 469 tests pass)
- [x] PR description up to date — PR #391 open
- [x] Lasting decisions promoted to architect context (if applicable) — N/A, see Decisions verdicts above

**Last updated:** 2026-07-02
