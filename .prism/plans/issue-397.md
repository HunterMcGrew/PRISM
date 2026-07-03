# Plan: issue-397

## Ticket

GitHub issue #397 — eject: preview report doesn't faithfully reflect empty-dir pruning.

---

## Goal

`prism eject`'s preview report matches exactly what a real run would do for empty-directory pruning, and empty projected skill/agent roots (`.claude/skills`, `.claude/agents`, `.agents/skills`, `.codex/agents`, `.cursor/skills`) are pruned in both preview and real runs.

---

## Implementation Tasks

### Clove (implementation)

1. Fix `pruneEmptyDirs` in `scripts/ai-skills/eject.ts` so nested empty directories are reported identically in preview and real runs.
2. Add `pruneEmptySkillRoot` and wire it into `runEject` so an emptied projected skill/agent root is pruned (both preview accounting and real removal).
3. Add test coverage in `scripts/ai-skills/eject.test.ts` for both fixes, including preview/real parity.

---

## Decisions

- **Root cause: preview mode never mutates the filesystem, but the original code re-read the filesystem to decide emptiness.** `pruneEmptyDirs`'s `isEmpty()` called `fs.readdir` on the real directory after conditionally `rmdir`-ing it — in preview mode the child was never actually removed, so a parent directory that becomes empty only *after* its child is pruned never read as empty. Same root cause reproduced in the skill-root case: `removeDeletedManagedSkills`/`removeDeletedManagedAgentFiles` don't `rm` anything in preview mode (`checkMode`), so `pruneEmptySkillRoot`'s first draft (raw `readdir` + length check) also disagreed with what a real run would do.
  - **Alternatives considered:** (a) do a second dry-run pass that simulates deletions on an in-memory tree; (b) make `previewOnly` still physically write/delete to a scratch copy and diff. Both add real complexity for a directory-emptiness check.
  - **Chosen approach:** track "would this be empty in a real run" via return-value propagation instead of re-reading disk. `pruneEmptyDirs`'s `walk` returns whether `dir` is now empty (carrying a just-pruned child's emptiness to its parent regardless of physical `rmdir`), and both `pruneEmptyDirs` and `pruneEmptySkillRoot` accept a `virtuallyRemovedFiles`/`virtuallyRemovedEntries` set (built from `fileOutcomes`/`skillOutcomes` with `action === "removed" | "removed-with-backup"`) so entries already claimed by an earlier pass are subtracted from the real `readdir` results rather than trusted to be gone.
  - **Implementation guidance:** any future pass added to `runEject` that removes content in a way `previewOnly` can suppress must feed its virtually-removed set into any downstream emptiness check the same way — a raw `readdir`/`pathExists` check after a `previewOnly`-gated mutation will silently regress this fix.
  - → no promotion needed (fix is fully contained to `eject.ts`'s own preview/real accounting; no new cross-cutting pattern for other skills to follow)
- **`pruneEmptySkillRoot` is deliberately shallow (root-only), not recursive like `pruneEmptyDirs`.** A projected skill root (e.g. `.claude/skills`) can hold a consumer's own hand-authored skill directory as a sibling to `prism-*` dirs. Recursing into a surviving consumer skill's own subdirectories (as `pruneEmptyDirs` does for `.prism/`) would reach into content this pass has no ownership claim over — an empty subfolder inside a consumer's own skill is the consumer's business, not PRISM's to prune. `.prism/` doesn't have this problem: every path under it is either PRISM-owned or an explicit consumer carve-out (`plans/`, `custom/`, `lessons.md`), and pruning an empty directory anywhere in that tree loses nothing.
  - → no promotion needed (scoped to this file's two directory shapes; not a pattern other skills need)

---

## History

- 2026-07-03 [huntermcgrew/prism-397-eject-preview-empty-dir-fidelity]: Fixed `pruneEmptyDirs` nested-directory preview/real divergence and added `pruneEmptySkillRoot` to prune emptied projected skill/agent roots; both passes now share virtually-removed-entry accounting so preview never re-reads a filesystem that `previewOnly` deliberately left unmutated. Added 4 new tests (nested-dir parity, skill-root pruning, consumer-skill preservation, skill-root preview parity) and tightened one loose `.some()` assertion in the existing empty-dir test to an exact path check. `pnpm prism:check` green — 484/484 tests.
- 2026-07-03 [huntermcgrew/prism-397-eject-preview-empty-dir-fidelity]: Briar self-reviewed the PR #399 diff. Verified the parity fix holds by hand-tracing `walk`'s return-value propagation and the shallow skill-root scope decision against adversarial cases (mixed file/subdir emptying, multi-level nesting, all five projected roots). Confirmed path-join normalization is consistent between outcome recording and prune-time lookups (no raw string comparisons). Found one open Minor (duplicate-root defensive gap); no Critical/Major findings.
- 2026-07-03 [huntermcgrew/prism-397-eject-preview-empty-dir-fidelity]: Fixed the duplicate-root Minor — deduped `skillTargetRoots` before the prune loop and added a test asserting single-count on a duplicated root. `pnpm prism:check` green — 485/485 tests.

---

## Review Issues

### Duplicate emptyDirsRemoved entry possible if two projected skill roots resolve to the same path

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `scripts/ai-skills/eject.ts:592-597`
- **Problem:** `skillTargetRoots` is a plain array, not deduplicated. If a consumer's `paths.json` ever configured two of the five `generated.*` root keys to the same directory, `pruneEmptySkillRoot` would run twice against the identical path and could push the same path into `emptyDirsRemoved` twice (most visibly in preview mode, where the root still "exists" with zero remaining entries on the second call too). Not reachable with the shipped default `.ai-skills/definitions/paths.json` — all five roots are distinct there — so this is a defensive gap, not a live bug.
- **Suggested fix:** dedupe `skillTargetRoots` (e.g. `[...new Set(skillTargetRoots)]`) before the loop, or track already-pruned paths in a `Set` and skip repeats.
- **Fixed in:** `scripts/ai-skills/eject.ts` — dedupe via `[...new Set(skillTargetRoots)]` before the prune loop; all five root values are already `path.join` results from `resolveConsumerSkillTargetRoots`, so a plain string `Set` normalizes consistently with the rest of the file's path accounting. Added `scripts/ai-skills/eject.test.ts` coverage asserting a duplicated root is only counted once in `emptyDirsRemoved`.

---

## Cleanup Items

None.

---

## PR Readiness

- [x] No critical or major issues
- [x] Types correct — no `any`, no unsafe `as`
- [x] No stray console.logs or debug artifacts
- [x] Tests written for new logic and edge cases
- [x] All debugged issues resolved (no `open` entries)
- [x] Build passes — last run: 2026-07-03 (type-check, 485/485 tests, crossref-lint all green)
- [x] PR description up to date
- [x] Lasting decisions promoted to architect context (if applicable — none needed, see Decisions)

**Last updated:** 2026-07-03 (Clove — Minor review fix)
