# Plan: issue-375

## Ticket

https://github.com/HunterMcGrew/PRISM/issues/375 (epic #373, lane L375)

## Goal

Add `prism doctor` — a single command that reports install health (config validity, git-repo check, sync-manifest drift, installed-vs-latest version) so a bad install surfaces as a named finding instead of an opaque leftover-token build failure.

---

## Implementation Tasks

### Clove (implementation)

1. Add `scripts/ai-skills/doctor.ts` — `runDoctor` (testable core) + `runDoctorCli` (CLI wrapper), following the `init.ts` / `update.ts` two-entry-point pattern.
   - Reuse `validateConsumerConfigAgainstSchema` (`lib/config-schema-validate.ts`) for the config check — catch `ConfigSchemaValidationError`/`Error` and turn into a named finding, not a thrown error.
   - Reuse `assertInsideGitRepo` (`lib/consumer-root.ts`) for the git check — same catch-and-finding pattern.
   - Reuse `loadSyncManifest` (`sync-manifest.ts`) + `classifyPath` (`ownership.ts`) for the sync-state report: PRISM-owned vs consumer-owned counts, diverged files (bytes differ from recorded hash, paired with any `.bak`/`.bak.N` siblings found on disk), and PRISM-owned paths the manifest expects but which are missing on disk.
   - Report installed PRISM version (own `package.json` version, resolved the same way `resolveSelfPrismSource`/`findPrismPackageRoot` do) vs latest on npm (`registry.npmjs.org` dist-tags, 3s timeout, network/404/unpublished all degrade to "unavailable" — never a failure).
   - Exit 0 when every check is healthy; non-zero with a findings list otherwise.
2. Wire `doctor` into `scripts/ai-skills/cli.ts` (new switch case, USAGE line) — mirrors the existing `init`/`adopt`/`update` cases.
3. Add `scripts/ai-skills/doctor.test.ts` — reuse the `gitInit` / `withTempRepoRoots`-style fixture helpers from `update.test.ts`. Cover: healthy repo (exit 0), bad config field (names the field), missing manifest (degrades to a finding, not a crash), non-git dir (git finding). Mock/stub the npm lookup so no test depends on live network.
4. Docs: README command table (consumer-repo section) + `docs/adopt-prism.md` — one row / one short section describing what `doctor` checks and its exit-code contract.

---

## Decisions

- Config-schema validation and the git-repo check are **reused as-is** from L376's `lib/config-schema-validate.ts` and `lib/consumer-root.ts` — `doctor` wraps each in a try/catch and reports the caught message as a finding rather than letting the process throw, since `doctor`'s whole purpose is to report health, not crash on the first bad thing it finds. `adopt`/`update` still throw (fail-fast before writing); `doctor` never writes, so it can afford to keep checking after one check fails.
- npm version lookup uses the public registry HTTP endpoint (`https://registry.npmjs.org/@huntermcgrew/prism`) directly rather than shelling out to `npm view` — avoids a dependency on the consumer having npm on PATH configured the same way, and is trivially mockable in tests (stub `fetch`). Any failure (network, timeout, 404, malformed JSON) is caught and reported as `unavailable`, never thrown.
- `doctor` never writes files — read-only diagnostic. No `--dry-run` flag needed (nothing to preview).

---

## History

- 2026-07-02 [hmcgrew/375-prism-doctor]: created plan; implementation pending.
- 2026-07-02 [hmcgrew/375-prism-doctor]: implemented `prism doctor` (`scripts/ai-skills/doctor.ts` + `doctor.test.ts`), wired into `cli.ts` and `package.json`'s `prism:doctor` script, documented in README + `docs/adopt-prism.md`. Reused L376's `validateConsumerConfigAgainstSchema` and `assertInsideGitRepo` as accumulating findings instead of throws. 10 new tests pass; the 4 pre-existing Windows POSIX-path failures and the pre-existing missing-`esbuild` type-check failure are unchanged from origin/main.

---

## Acceptance Criteria

### Behavioral

- [x] Given a healthy, fully-adopted consumer repo, when `prism doctor` runs, then it exits 0 and reports no findings.
- [x] Given a `.ai-skills/config.json` with a field that fails schema validation, when `prism doctor` runs, then it exits non-zero and names the offending field in a finding.
- [x] Given a target directory with no `.prism/.sync-manifest.json`, when `prism doctor` runs, then it reports the missing-manifest finding without crashing.
- [x] Given a target directory that is not inside a git repository, when `prism doctor` runs, then it exits non-zero and reports a git-repo finding.
- [x] Given network is unavailable or the npm package is unpublished, when `prism doctor` runs, then the version-check finding degrades to "unavailable" rather than failing the whole command.

### Non-behavioral

- [x] New tests pass on Windows local and Ubuntu CI (OS-agnostic path assertions).
- [x] No test depends on a live network call.
- [x] `prism doctor` documented in the README command table and `docs/adopt-prism.md`.

---

## PR Readiness

- [x] No critical or major issues
- [x] Types correct — no `any`, no unsafe `as`
- [x] No stray console.logs or debug artifacts
- [x] Tests written for new logic and edge cases
- [x] All debugged issues resolved (no `open` entries)
- [x] Build passes — last run: 2026-07-02 (`prism:build`, `prism:crossref-lint`, `prism:verify-manifest` all green; 4 pre-existing Windows POSIX-path test failures and the pre-existing missing-`esbuild` type-check failure are unchanged from origin/main baseline)
- [ ] PR description up to date
- [ ] Lasting decisions promoted to architect context (if applicable) — no lasting architectural decisions here; scoped to a new consumer-facing command

**Last updated:** 2026-07-02
