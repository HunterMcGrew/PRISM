# Plan: followup-200-crossref-gitignore

> Closed: 2026-06-16

## Ticket

GitHub issue #200

## Goal

Make `crossref-lint` auto-skip refs to gitignored/runtime-generated paths so local `pnpm prism:check` stops producing false-passes relative to CI.

---

## Implementation Tasks

### Clove (implementation)

1. Add `resolveGitignored(candidates, repoRootPath)` helper to `scripts/ai-skills/crossref-lint.ts` — shells out to `git check-ignore --stdin` (pattern-based, not filesystem-based), fail-open on non-git-repo exit codes.
2. Lift gitignore resolution to `runCrossRefLint`: collect all candidate refs across all files, resolve the ignored set once (one git call), pass the `Set<string>` into `scanLines` as `gitignoredSet`.
3. Add `gitignoredSet` parameter to `scanLines` (defaults to `new Set()`), gate immediately after `isLazyOrHistoricalTarget` skip.
4. Remove the 4 `.sync-manifest.json` rows from `CROSSREF_FILE_ALLOWLIST` — the gitignore gate now subsumes them. Update allowlist JSDoc to note gitignored targets are handled upstream.
5. Add 6 new tests to `crossref-lint.test.ts` covering the helper contract and the gate behavior.

---

## Decisions

- **Auto-skip via `git check-ignore --stdin`, not an `ignore` npm package.**
  - **Root cause:** `.sync-manifest.json` is gitignored and runtime-generated; it exists on the dogfood tree (causing local false-passes) but not on a clean CI checkout (causing CI failures). The allowlist mechanism was the previous workaround — it requires a manual entry per file×ref pair and doesn't generalize.
  - **Alternatives considered:** (a) `ignore` npm package — would need approval, adds a dependency; (b) per-ref git calls — too slow (process-spawn per ref); (c) keep the allowlist — doesn't generalize, authors must remember to add entries.
  - **Chosen approach:** batch all candidate refs, call `git check-ignore --stdin` once per lint run. Pattern-based: returns identical results on any checkout regardless of which files are physically present.
  - **Implementation guidance:** exit code 1 with empty stderr = zero paths matched (not an error); any other non-zero code = fail-open (return empty Set, degrade to today's behavior). Use `cwd: repoRootPath` so git resolves the correct `.gitignore`.
  - **→ no promotion needed** (implementation tactic specific to this script; the lesson about gitignored-path false-passes is already captured in `.prism/lessons.md`).

- **Lift gitignore resolution to `runCrossRefLint`, not per-file or per-ref.**
  - Collect all cleaned candidate refs first, resolve once, pass the Set into `scanLines`. One git call per lint run regardless of file count.
  - **→ no promotion needed** (internal implementation detail).

- **Remove 4 `.sync-manifest.json` allowlist rows; keep security.md / react-guidelines.md / manifest.json / install-cursor.ts rows.**
  - The removed rows are gitignored — the new gate subsumes them. The kept rows reference files that are not gitignored (Atlas-generated or intentionally absent in PRISM), so the allowlist remains their correct home.
  - **→ no promotion needed** (allowlist maintenance, specific to this script).

---

## History

- 2026-06-16 [hmcgrew/prism-200-crossref-gitignore]: Added `resolveGitignored` helper and gitignore gate to `crossref-lint.ts`; removed 4 `.sync-manifest.json` allowlist rows; added 6 new tests. `pnpm prism:crossref-lint` passes clean on the dogfood tree (manifest present, gitignore gate fires) and is structurally clean on a CI checkout (manifest absent, gate is a no-op) — the four `.sync-manifest.json` allowlist rows were removed and the gate covers them in both conditions.
- 2026-06-16 [hmcgrew/prism-200-crossref-gitignore]: Addressed Eric's three review minors — simplified redundant `ExecException` cast to `error.code`, added fail-open test for git-unavailable / not-a-git-repo path, and added `isLazyOrHistoricalTarget` pre-filter in `runCrossRefLint` candidate collection. Plan closed.

---

## PR Readiness

- [x] No critical or major issues
- [x] Types correct — no `any`, no unsafe `as`
- [x] No stray console.logs or debug artifacts
- [x] Tests written for new logic and edge cases (6 new tests, 53 total in suite)
- [x] All debugged issues resolved (no `open` entries)
- [x] Build passes — skipped (diff does not affect Next.js bundle; scripts-only change)
- [x] PR description up to date — N/A (Sol dispatch; no PR opened)
- [x] Lasting decisions promoted to architect context — N/A (implementation tactic, not architectural)

**Last updated:** 2026-06-16
