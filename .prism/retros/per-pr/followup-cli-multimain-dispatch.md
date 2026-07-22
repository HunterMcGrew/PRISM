# Retro — followup-cli-multimain-dispatch

**Target:** `.prism/plans/followup-cli-multimain-dispatch.md` (PR #436, branch `huntermcgrew/prism-cli-multimain-dispatch`)
**Grain:** per-pr
**Generated:** 2026-07-22

## Charter coverage

| # | Charter item | Answerable | Sources | Gap |
| --- | --- | --- | --- | --- |
| 1 | Did we do what we said? | yes | Decisions, Implementation Tasks, `## Acceptance Criteria` (AC-1..7), branch diff `merge-base..HEAD` | none — one scope divergence, self-caught and documented (see Fidelity gap) |
| 2 | Were there issues / bottlenecks? | yes | `## Decisions` (scope-correction + test-fixture entries), `## Debugged Issues` (Debug-1 `fixed`) | none |
| 3 | Actionable improvements? | yes | scope-correction Decision, `.prism/lessons.md` (branch), PR #436 threads | none |
| 4 | Did we follow code standards? | yes | Briar self-review (clean pass), Eric PR #436 review (3 rounds), `## Review Issues` (2 minor, both `fixed`) | none |
| 5 | Did we do anything wrong / do better? | yes | scope-correction + test-fixture Decisions, Eric round-1/round-2 Minors | none |
| 6 | Are the tests passing? | yes | head-commit check-runs (`prism-check` ubuntu + windows both SUCCESS), `## Debugged Issues` suggested-tests, Reese QA report | final-child CI is the PR-run at head (pre-merge, not yet main-CI) — ADR-0047 placement |

**Coverage: 6 / 6 charter items answerable.** Evidence census — history 5, decisions 9 (7 base + 2 scope/fixture, with a ninth-guard note inside the scope-correction entry), debugged 1 (`fixed`), review 2 (both minor, both `fixed`) + 1 Briar clean-pass line, PR-thread rounds 3 (Eric) + 1 QA comment (Reese), CI runs 2 (both SUCCESS at head), merged PRs 0 (PR #436 open/draft at retro time; the reflect phase runs pre-merge on the final branch).

## Fidelity gap

**Scope diverged from plan — four guards planned, six shipped — but the divergence was self-caught during implementation, verified, and documented before merge.**

The plan's `## Decisions` scope call was explicit: *"Scope is exactly four files… `verify-manifest-coverage.ts`… `build.ts`… are standalone build scripts never in `cli.ts`'s import graph, so their `import.meta.url` never collapses and their guard is correct. They are deliberately **not** changed."* The execution record refutes that rationale directly: a fresh `dist/cli.js` built from the four-file fix still leaked `Missing path definitions: …` on `node dist/cli.js --help` (exit 1). `build.ts` is transitively bundled via `update.ts`'s import; `verify-manifest-coverage.ts` via `ownership.ts`'s `compileMatcher` import (reached from adopt/doctor/eject through `classifyPath`). Both carried the identical collapsed-guard bug one hop removed from `cli.ts`'s direct imports — the exact class the fix exists to remove. This meets the divergence test: the Decision said *"X is correct because it is never in the import graph"*; the execution record showed *"X caused the leaked error the fix targets, because it IS in the transitive import graph."* A real refutation of the stated rationale, not an adjacent issue.

**Why this reads as the process working, not a shipped defect:**
- The miss was a plan-time analysis error — the tree-wide sweep checked *direct* imports, classifying the two build scripts as unreachable when the graph needed to be walked *transitively*. It never reached a consumer: Clove caught it while manually verifying a fresh bundle before writing the regression test.
- The fix was the same mechanically-verified `isDirectCliEntry` swap already applied four times, touched neither "leave alone" constraint (`resolveSelfPrismSource`, the esbuild config), and preserved both standalone dev paths (`pnpm prism:build`, `pnpm prism:verify-manifest`) — verified by running both after the change.
- Closure was proven, not asserted: a transitive sweep of every file reachable from `cli.ts` confirmed no further gap, and `grep -c "resolve(process.argv[1])" dist/cli.js` → 0 on the rebuilt bundle. `migrate-skill.ts` was surfaced as a ninth guard-family file (its guard hides behind a dynamic `import("node:url")` a literal sweep misses) and correctly excluded — only its own test imports it.
- The plan's own AC-1/AC-2 could not have passed at four files; the correction was required for the fix to be a fix. Clove declined `needs-replan` for a stated reason (the correct fix was already unambiguous and mechanically verified) — a defensible call.

**A separate near-miss, also self-caught:** the compiled-bundle integration test was initially a rubber stamp. Built into `os.tmpdir()` directly, all three tests passed even against a deliberately-reverted guard — macOS's `/var`→`/private/var` symlink made `os.tmpdir()`'s non-canonical path mismatch `import.meta.url`'s canonical path for a reason unrelated to the fix (a false negative). Caught by the implementer's own "prove it both directions" discipline; fixed by resolving `os.tmpdir()` through `fs.realpath()` in the `before()` hook, then re-proven (revert `eject.ts`'s guard → 2 of 3 fail; restore → all pass). Eric's inline comment on `cli-bundle.test.ts:44` calls this out as the thing that keeps the test trustworthy.

**Review and CI, at head:** Eric ran three rounds — round 1 flagged `isDirectCliEntry`'s true branch and extension-stripping edges as untested (the bundle test only exercises the false branch, since a bundle's entry basename is always `cli`); round 2 flagged a mislabeled multi-dot test whose fixture had a single extension. Both Minors fixed and independently re-verified; round 3 was a clean pass, zero findings. Briar's self-review was a clean pass from a detached checkout of the branch tip. Reese executed a bug-fix verification checklist (`.prism/qa/bugfix-verification-pr-436.md`) against a fresh bundle — repro, subcommand-isolation, and the build.ts/verify-manifest-coverage.ts adjacency check — all scenarios passed. `prism-check` is SUCCESS on both matrix legs at the head commit (547/547 tests). AC-4 (real-consumer-repo isolation) is legitimately human-gated and correctly left unchecked — a linked/global `prism` on PATH, not agent-verifiable.

## Promotion cautions

One Decision the execution record refuted. Winston consumes this in the close phase — promote **corrected**, never unchanged.

- **Decision: "Scope is exactly four files + one helper + a testability refactor… `build.ts` / `verify-manifest-coverage.ts` … never in `cli.ts`'s import graph … their guard is correct … deliberately not changed."**
  - **Refuted by:** the branch's own `## Decisions` scope-correction entry and the source diff — both build scripts were transitively bundled, carried the same collapsed-guard bug, produced the leaked `Missing path definitions:` error the fix targets, and were converted to `isDirectCliEntry` (`build.ts:1071`, `verify-manifest-coverage.ts:186`). The guard family is nine files, not eight (`migrate-skill.ts` hides one behind a dynamic import).
  - **Correction (already live in the plan):** the scope-correction Decision records the transitive root cause, the "why the plan missed it" (direct-import-only sweep), the confirming transitive sweep + `grep → 0`, and the ninth-file note. Its verdict is `→ no promotion needed` (ticket-tactical), pointing the general lesson at `.prism/lessons.md` — already captured on the branch ("check the transitive import graph, not just direct imports").
  - **For close:** the PR Readiness line defers *"evaluate the `isDirectCliEntry` / bundle-entry-guard pattern"* for promotion to architect context. If that pattern graduates, the durable version must carry the corrected rule — **any file transitively reachable from `cli.ts`'s import graph needs the bundle-safe entry check; classify by walking the transitive graph, not direct imports; the guard family spans nine files including the dynamic-import case** — never the original "exactly four / those four build scripts are fine" enumeration. Do not promote the four-file scope Decision as written.

## Action Items

- [ ] At plan close, evaluate the `isDirectCliEntry` / bundle-entry-guard pattern for promotion to architect context (per the unchecked PR Readiness line). If promoted, carry the corrected transitive-reachability rule from the Promotion caution above, not the refuted four-file scope claim. — proposed owner: Winston (close phase)

## Citations

### Plan evidence

- `.prism/plans/followup-cli-multimain-dispatch.md` — `## Decisions`: original "Scope is exactly four files" call (**refuted**), plus the branch's "Scope correction" and "Test fixture bug (`os.tmpdir()`)" entries; `## Debugged Issues` Debug-1 (`open` → `fixed`, file list expanded from four guards to six); `## Review Issues` (2 minor, both `fixed`) + Briar "No issues found" clean-pass line; `## Acceptance Criteria` AC-1..7 (AC-1/2/3/5/6/7 `[x]`, AC-4 human-gated `[ ]`); `## Sessions` (5 segments — Winston plan, Clove implement `close: drifted`, Briar self-review, two Eric-fix rounds, Reese QA); `## PR Readiness` (all checked except the deferred pattern-promotion line).
- `.prism/qa/bugfix-verification-pr-436.md` — Reese bug-fix verification; §1 repro, §2 subcommand-isolation, §3 build.ts/verify-manifest-coverage.ts adjacency, §4 human-gated consumer-repo check. All §1–§3 scenarios executed green against a fresh bundle.

### Execution record

- `source: merged-diff` — `merge-base..HEAD` (13 files, +415 / −67): six guard swaps (`adopt`/`doctor`/`eject`/`update`/`build`/`verify-manifest-coverage`), new `lib/cli-entry.ts` helper, `bundle.ts` `buildBundle(outfile)` export (esbuild options byte-identical), new `cli-bundle.test.ts` (compiled-bundle integration) and `cli-entry.test.ts` (6 unit tests). `adopt`/`doctor`/`eject` dropped the now-unused `node:url` import; `update`/`build`/`verify-manifest-coverage` kept it (still used for self-location / `scriptDirectory`).
- `source: pr-thread` — Eric 3 rounds. Round 1 inline Minor on `cli-entry.ts:19` (true-branch + extension-stripping coverage gap) → `cli-entry.test.ts` added; round 2 inline Minor on `cli-entry.test.ts:26` (mislabeled multi-dot test) → renamed + real `foo.config.ts` fixture added; round-3 issue-comment summary — clean pass, zero findings, both matrix legs green at head, AC-4 correctly human-gated. Eric did not approve (ADR-0011). Reese QA issue-comment links the verification checklist.
- `source: ci` — head-commit `37cabee` check-runs: `prism-check (ubuntu-latest)` SUCCESS, `prism-check (windows-latest)` SUCCESS. (An earlier mid-run snapshot showed `windows-latest` pending; the head commit's check-runs both conclude success — AC-7 met.)
