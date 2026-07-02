# Plan: issue-376

## Ticket

https://github.com/HunterMcGrew/PRISM/issues/376

## Goal

Adopt/update mutate files immediately with no preview, don't re-validate config, and don't check for a git repo. Add `--dry-run`, upfront `config.schema.json` validation, and a git-repo fail-fast check to both `pnpm prism:adopt` and `pnpm prism:update`.

---

## Implementation Tasks

### Clove (implementation)

1. **`--dry-run` seam.** Thread a `dryRun` flag through `applyIncomingFile` / `applyDeletedFile` / `applyFilePass` / `runUpdate` (`update.ts`) and `runAdopt` / `seedConsumerContentRoot` (`adopt.ts`). The classification pipeline (`applyFilePass`) already separates "decide the outcome" from "perform the write" per-file — the outcome (`written` / `no-op` / `overwritten` / `backed-up` / `removed` / `removed-with-backup`) is computed first, then the actual `fs` call follows. Dry-run skips only the `fs` calls (`writeIncoming`, `backupConsumerFile`, `fs.rm`, `fs.copyFile`) and the manifest rewrite / platform-dir refresh / roster projection, returning the same `UpdateSummary` / `AdoptSummary` shape the caller already prints. No refactor of the pipeline shape needed — this is a clean flag-thread, not a wide blast radius change.
2. **CLI wiring.** Add `--dry-run` parsing to `runAdoptCli` and `runUpdateCli` in `adopt.ts` / `update.ts` (mirrors the existing `--consumer` / `--prism-source` flag parsing style). Update `reportSummary` in both files to prefix output with a dry-run banner ("prism:update (dry run) — would ...") when the flag is set, so a dry-run invocation reads unambiguously in CI logs.
3. **Upfront config validation.** New `lib/config-schema-validate.ts` (or extend `lib/onboarding-config.ts`'s existing structural-validator pattern) that reads `.ai-skills/config.schema.json` and validates the consumer's parsed `config.json` against it — required fields, `ticketPrefix` pattern, `ticketSystem.kind` enum, `techStack` enum membership. Throws naming the offending field (JSON-Pointer-style, matching `lib/tokens.ts`'s existing error shape) on first failure. Call this at the top of `runUpdate` (`update.ts`), before any `.prism/` file is touched — alongside the existing `deriveTokenMap(loadConfig(...))` call at the top of the function, which already fails fast on missing required fields but not on the fuller schema (enum values, pattern, techStack membership).
4. **Git-repo check.** New `assertInsideGitRepo(dir)` helper (reuse the `gitCapture`-style pattern from `lib/consumer-root.ts`, e.g. `git rev-parse --is-inside-work-tree`). Call from `runAdopt` and `runUpdate` before any write, targeting `consumerRepoRoot`. Throws a clear message naming the target directory when not inside a git repo.
5. Tests in `adopt.test.ts` / `update.test.ts` for all three behaviors (dry-run leaves fs untouched but returns full summary; config validation names the offending field and writes nothing; git-repo check fails fast with a clear message and writes nothing).
6. README command table (`--dry-run` flag) + `docs/adopt-prism.md` documentation for `--dry-run`.

---

## Decisions

- **Dry-run implemented as a boolean thread, not a separate "plan" pipeline.** The classification pipeline was already separable — `applyIncomingFile`/`applyDeletedFile` compute the `FileOutcome` before performing the corresponding `fs` call. Considered: building a fully separate read-only "plan" function that duplicates the branching logic. Rejected — duplicating the six-way outcome branching (`written`/`no-op`/`overwritten`/`backed-up`/`removed`/`removed-with-backup`) risks the two copies drifting; a single `dryRun` flag guarding the `fs` calls keeps one source of truth for the decision logic.
- **Schema validation reads `config.schema.json` directly rather than hardcoding a second enum/pattern list.** `lib/onboarding-config.ts` already hand-maintains a `TECH_STACK_ENUM` mirror of the schema with a comment admitting it needs to stay in sync manually. Considered: extending that same hand-maintained-mirror pattern for the update-path validator. Rejected in favor of reading the schema file's `techStack.items.enum` and `ticketSystem.properties.kind.enum` at validation time — avoids adding a third place that can drift from the schema. No new dependency (no AJV) — the validator walks the small subset of schema shapes PRISM's config actually uses (required, enum, pattern, type), same spirit as the existing structural validators.
- **Git-repo check uses `git rev-parse --is-inside-work-tree`, matching the existing probe style in `lib/consumer-root.ts`.** Consistent with how the file already shells out to git for topology detection; no new dependency.

---

## History

- 2026-07-02 [hmcgrew/376-pre-write-safety]: Plan created — read adopt.ts/update.ts/cli.ts, existing test patterns, config.schema.json, and lib/consumer-root.ts's git-probe pattern before designing the three seams.
- 2026-07-02 [hmcgrew/376-pre-write-safety]: Implemented all three seams — `--dry-run` threaded through adopt.ts/update.ts/utils.ts (`ensureConsumerPathDefinitions`) and generate-skills.ts/build.ts's existing `checkMode`; `lib/config-schema-validate.ts` added (reads `config.schema.json` directly, no hand-maintained mirror, no new dependency) and wired into `runUpdate`/`runAdopt` before any write; `assertInsideGitRepo` added to `lib/consumer-root.ts` and wired the same way. Existing `withTempRoots`/`withTempRepoRoots` test fixtures in adopt.test.ts/update.test.ts/cli.test.ts needed `git init` + a copy of the real schema file added — those fixtures previously ran outside a git repo and without a schema file, which the new upfront guards now correctly reject.
- 2026-07-02 [hmcgrew/376-pre-write-safety]: README command table and docs/adopt-prism.md updated with `--dry-run` usage and a "Safety checks before any write" section covering config validation and the git-repo check.
- 2026-07-02 [hmcgrew/376-pre-write-safety]: Briar self-review — verified all fs-write paths in adopt.ts/update.ts/utils.ts/generate-skills.ts/build.ts are dryRun/checkMode-gated, git-repo + schema-validation checks run before any write in both runAdopt and runUpdate, and local `prism:test` matches the plan's claimed 431/427/4 (4 pre-existing, 0 new). Two minor findings (test coverage gap, redundant existence check) — see `## Review Issues`.
- 2026-07-02 [hmcgrew/376-pre-write-safety]: Fixed the test-coverage minor — added the write-nothing assertion to the techStack (`adopt.test.ts`) and missing-required-field (`update.test.ts`) schema-failure tests. Deferred the `backupConsumerFile` redundant-check minor — the `pathExists` half is load-bearing for the hash-match early-return path, not fully dead. `prism:test` still 431/427/4 (0 new failures); `prism:build` clean.

---

## Review Issues

### Schema-validation tests don't all assert "nothing written"

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `scripts/ai-skills/adopt.test.ts:773` (techStack test), `scripts/ai-skills/update.test.ts:1116` (missing-required-field test)
- **Problem:** The `ticketPrefix` pattern-failure tests in both `adopt.test.ts` and `update.test.ts` assert both the error message and that no file was written. The sibling `techStack` enum test (`adopt.test.ts`) and the missing-required-field test (`update.test.ts`) only assert the error message — they don't confirm the write-nothing guarantee for those specific failure modes.
- **Suggested fix:** Add the same `fileExists(...) === false` assertion used in the pattern-failure tests to these two tests, for consistency and full coverage of the "fails before any write" AC item across all schema-validation failure shapes.
- **Fixed in:** added the matching `fileExists(...) === false` assertion (same shape as the sibling `ticketPrefix` tests) to both tests.

### Redundant existence check in `backupConsumerFile`

- **Severity:** `minor`
- **Status:** `deferred`
- **File:** `scripts/ai-skills/update.ts:141`
- **Problem:** `if (dryRun || (await pathExists(candidate))) { return candidate; }` — after `resolveBackupPath` returns via its loop-exit path (the common case), `pathExists(candidate)` is already guaranteed `false` by that function's own loop invariant (the loop only exits when the candidate path doesn't exist). The `pathExists(candidate)` half of this condition is therefore dead code for that path and only actually matters for the hash-match early-return case inside `resolveBackupPath` — which already returns a path guaranteed to exist. Harmless (an extra `fs.stat`), not a correctness bug, but reads as though re-checking existence is doing real work when the invariant already guarantees the answer.
- **Suggested fix:** Optional cleanup — `resolveBackupPath` could return both the candidate path and whether it already exists (or the two cases could be split explicitly), removing the redundant recheck. Not blocking; a Minor readability note.
- **Deferred reason:** out of scope for this fix pass — the `pathExists` check is not fully dead (it matters on `resolveBackupPath`'s hash-match early-return path); touching it risks a behavioral change beyond a readability cleanup without deeper verification than this pass calls for.

---

## Acceptance Criteria

### Behavioral

- [x] Given a consumer repo with pending PRISM-owned changes, When `pnpm prism:adopt --dry-run` or `pnpm prism:update --dry-run` runs, Then no file is written/overwritten/removed and the printed summary reflects what would have happened.
- [x] Given a `.ai-skills/config.json` with a field that violates `config.schema.json` (e.g. bad `ticketPrefix` pattern, invalid `ticketSystem.kind`), When `pnpm prism:update` runs, Then it fails before any file write with an error naming the offending field.
- [x] Given a target directory that is not inside a git repository, When `pnpm prism:adopt` or `pnpm prism:update` runs, Then it fails fast with a clear message before any file write.

### Non-behavioral

- [x] `--dry-run` is documented in the README command table and in `docs/adopt-prism.md`.
- [x] New tests pass locally and match CI's known pre-existing failure set (no new failures) — 431 tests, 427 pass, 4 pre-existing failures (3 crossref-lint POSIX-path, 1 generate-skills.test.ts Windows path bug), 0 new failures.

---

## PR Readiness

- [x] No critical or major issues
- [x] Types correct — no `any`, no unsafe `as`
- [x] No stray console.logs or debug artifacts
- [x] Tests written for new logic and edge cases
- [x] All debugged issues resolved (no `open` entries)
- [x] Build passes (`prism:build` clean except the 4 known pre-existing test failures)
- [ ] PR description up to date (pending PR open)

**Last updated:** 2026-07-02
