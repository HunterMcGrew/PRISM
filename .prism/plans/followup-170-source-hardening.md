# Plan: followup-170-source-hardening

## Ticket

#170 — follow-up to PR #167 (Phase 3). No Linear ticket per `.prism/rules/followup-scope.md`.

## Goal

Harden `pnpm prism:update` against a wrong `--prism-source` path that could cause mass-deletions, and deduplicate the platform-dir resolution logic shared between `update.ts` and `build.ts`.

---

## Implementation Tasks

### Clove (implementation)

1. **Task (a) — source-sanity tripwire**: In `scripts/ai-skills/update.ts` `main()`, after the existing `.prism/` existence check, call `listPrismOwnedRelativePaths(prismContentRoot)` early and abort before any mutations if it returns zero entries. Print `prism:update: --prism-source looks empty (<path>) — refusing N deletions` and exit non-zero. Export a thin `assertSourceIsPlausible` helper so the guard is unit-testable.

2. **Task (b) — shared platform-dir resolver**: Extract the `{ dir, dialect }[]` construction from both `update.ts` `resolveConsumerPlatformDirs()` and `build.ts` `main()` into a shared `buildPlatformDirs(repoRoot: string, pathDefinitions: PathDefinitions): { dir: string; dialect: RuleDialect }[]` function in `scripts/ai-skills/utils.ts`. Both callers use this helper. Output byte-identical to current callers.

3. **Task (a) test**: Add tests in `update.test.ts` covering the tripwire: empty source with consumer manifest entries refuses; non-empty source proceeds normally.

---

## Decisions

- **Tripwire placement: `main()` not `runUpdate()`**. The tripwire guards the CLI entry point. `runUpdate()` is a pure engine tested in isolation. Export `assertSourceIsPlausible` so the tripwire logic is unit-testable without invoking the full `main()` stack.
- **Heuristic: zero PRISM-owned paths = refuse**. `listPrismOwnedRelativePaths` applies the same ownership classifier the update engine uses. Zero entries means the source is empty or mispointed.
- **Shared helper in `utils.ts`**: `PathDefinitions` already lives there. `buildPlatformDirs(repoRoot, pathDefinitions)` matches how `build.ts` already has `pathDefinitions` in scope.

---

## History

- 2026-06-16 [hmcgrew/prism-170-source-hardening]: Created plan; implementing tripwire + shared platform-dir extractor for two Eric minors from PR #167.
- 2026-06-16 [hmcgrew/prism-170-source-hardening]: Implemented `assertSourceIsPlausible` tripwire in `update.ts`, extracted `buildPlatformDirs` to `utils.ts`, updated both callers in `update.ts` and `build.ts`; 217 tests pass, `prism:check` green, no generated-file churn.

---

## Acceptance Criteria

### Behavioral

- [x] Given `--prism-source` points at a directory with no PRISM-owned files and the consumer has recorded hashes, When `prism:update` runs, Then it prints a clear refusal message and exits non-zero without writing or deleting anything.
- [x] Given `--prism-source` is a valid PRISM checkout, When `prism:update` runs, Then behavior is identical to before this change.

### Non-behavioral

- [x] `buildPlatformDirs` is the single definition of platform-dir resolution; both `update.ts` and `build.ts` import and use it.
- [x] `pnpm prism:build` produces no unexpected generated-file churn after the extraction.
- [x] `pnpm prism:check` passes.

---

## PR Readiness

- [ ] No critical or major issues
- [ ] Types correct
- [ ] Tests written for tripwire
- [ ] Build passes
- [ ] PR description up to date

**Last updated:** 2026-06-16
