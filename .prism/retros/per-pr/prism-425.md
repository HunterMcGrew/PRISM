# Retro — prism-425

**Target:** `.prism/plans/followup-425-dist-lifecycle.md` (PR #434, branch `huntermcgrew/prism-425-dist-lifecycle`)
**Grain:** per-pr
**Generated:** 2026-07-22

## Charter coverage

| # | Charter item | Answerable | Sources | Gap |
| --- | --- | --- | --- | --- |
| 1 | Did we do what we said? | yes | Decisions, `## Acceptance Criteria` + `## AC Adjustments`, `origin/main..HEAD` diff, Eric PR #434 spec findings, Reese QA checklist (PR-thread ref) | AC-verification report absent — no `.prism/plans/qa/ac-verification-425.md`; answered from Decisions + diff + PR-thread instead |
| 2 | Were there issues / bottlenecks? | yes | `## Debugged Issues` (1 open), `## Decisions` (stdout-pollution fix), PR #434 threads | none |
| 3 | Actionable improvements? | yes | Debugged Issue, Eric cross-cutting + inline Minor | none |
| 4 | Did we follow code standards? | yes | Briar self-review (2 Minor, both `fixed`), Eric PR #434 review (1 Minor, non-blocking) | none |
| 5 | Did we do anything wrong / do better? | yes | `## AC Adjustments`, `## Review Issues`, Eric spec findings | none |
| 6 | Are the tests passing? | yes | PR #434 check-runs; `pnpm prism:check` exit 0 | final-branch CI approximated by PR #434 check-runs (pre-merge, not yet main-CI) — ADR-0047 placement |

**Coverage: 6 / 6 charter items answerable.** Evidence census — history 5, decisions 9 (8 plan + 1 execution-added), debugged 1 (`open`), review 3 (2 `fixed` + 1 clean-pass line), PR-thread surfaces 3 (issue-comments ×2, 1 inline review comment; reviews[] `COMMENTED`), CI runs 2 (both SUCCESS), merged PRs 0 (PR #434 open at retro time; reflect phase runs pre-merge on the final branch).

No AC-verification report exists for this ticket (Reese produced a tester-facing QA **checklist** at `.prism/plans/qa/bug-prism-425-verification.md`, referenced in the PR thread, not a graded per-criterion AC-verification). Charter item 1 is therefore answered from the Decisions + merged diff + Eric's spec-axis findings, which independently graded AC-1..AC-9 against the diff and reproduced AC-1's failure — not from a re-derivation this retro invented.

## Fidelity gap

**One gap, honestly documented before review; everything else shipped as planned.**

All nine tasks landed as specified — the `origin/main..HEAD` diff shows `dist/cli.js` untracked (−4612, via `git rm --cached`, working-tree copy preserved per AC-9), `/dist/` gitignored (`.gitignore` +6), `prepare` + `prepack` added (`package.json` +2), the parity gate extended to 6 runtime-read paths (`verify-pack-parity.ts` +7/−1), ADR-0063 amended canonically with the three mirrors regenerated (+1 each), and both docs edited verbatim. CI is green on both legs (`prism-check` ubuntu + windows SUCCESS, 2026-07-22T07:57Z); `pnpm prism:check` exits 0. Both Briar Minors and Eric's re-run confirm the drift class is gone, not gated.

**The gap: AC-1's exit-0 clause does not universally hold.** AC-1 said a fresh clone → `node dist/cli.js --help` should print the banner **and exit 0**. The banner-prints clause holds; the exit-0 clause does not — the compiled bin exits state-dependently (1 from the worktree, 0 from `/tmp`) because a **pre-existing** multi-`main()` bundling bug fires an unrelated subcommand's `main()` alongside `--help`. This is charter-item-1 divergence between *said* (exit 0) and *shipped* (state-dependent exit), and it is the one place the ticket's own stated acceptance does not pass as written.

The process handled it the honest way, before Eric ever looked: Clove recorded the bug as an `open` Debugged Issue (High, `[Confirmed]` root cause with a deterministic repro), proved it pre-existing by reproducing the same class from `main`'s own previously-committed stale bundle, and added an `## AC Adjustments` entry naming the blocked clause. Briar's pass-1 self-review independently caught that AC-1's evidence line still claimed exit 0 with an empty AC Adjustments — the adjustment was added in response. Eric independently reproduced the state-dependent exit and confirmed no Spec-axis defect in what the PR *ships*. A known-limitation surfaced, reproduced, scoped, and signposted in three places is the review layer working — not a silently shipped fidelity gap.

**One in-frame Decision the plan under-anticipated (handled gracefully, not a divergence).** The plan's Decision "Bundle *existence* at pack time is guaranteed by `prepare`, not by `prepack` firing during `npm pack --dry-run`" called the prepack-fires question "version-dependent and not something this plan relies on," and asked task 5 to record the observed answer. Execution found both `prepare` and `prepack` **do** fire during the dry run — and their child-process stdout polluted npm's `--json` stream, breaking `JSON.parse` in the parity gate. That required a new fix (slice from `stdout.indexOf("[")`) and a new `## Decisions` entry. The existence Decision itself held (existence still comes from `prepare`); the plan simply didn't foresee that the same fact would need in-scope work. Because the Decision's rationale (existence via `prepare`) was not contradicted, this is an adjacent surprise, not a refuted Decision — noted here, not staged as a promotion caution.

## Promotion cautions

**None.** No `## Decisions` entry was refuted by the execution record. Each was checked against the diff, CI, and both review passes: option 2 ratified (held), esbuild caret moot under option 2 (held — no bundle comparison ever ran), `git rm --cached` mechanism (held — AC-9, file preserved on disk), prepack duplicating prepublishOnly as accepted cost (held), bundle-existence-via-`prepare` (held — see Fidelity gap for the adjacent wrinkle), no-new-unit-test for the parity entry (held — the entry is data; the separate stdout-slice fix is covered by the live `prism:verify-pack` run, with Eric's Minor noting the residual coupling), generated-mirrors-never-hand-edited (held — AC-8, mirrors regenerated via `prism:build`), `prism:doctor` staleness out of scope (held). Nothing for the plan-closer to correct before promoting; the sole promotion (ADR-0063 amendment, task 6) stands unchanged.

## Action Items

- [ ] File the follow-up ticket for the **multi-`main()` bundling bug** — the compiled `dist/cli.js` runs unrelated subcommands' `main()` on any invocation because esbuild's ESM bundle collapses `import.meta.url` to the single output path, so every `process.argv[1]`-based entry guard fires at once. High severity, pre-existing, affects the shipped `prism` bin, and trips this ticket's own AC-1. Both Eric's review and the Debugged Issue write-up recommend a separately-scoped ticket (different persona class — debugging/architecture, not packaging-lifecycle). A plausible direction is already recorded: replace the `import.meta.url` guards with a `process.argv[2]` subcommand check matching `cli.ts`'s own dispatch. — proposed owner: Nora to file, then Sasha/Winston
- [ ] **Observation only — no action required this PR.** Eric's non-blocking Minor: `verify-pack-parity.ts`'s `stdout.indexOf("[")` slice couples the pack-parity parse to `prism:bundle`'s stdout staying bracket-free. The failure mode is loud (a stray `[` throws in `JSON.parse` and fails the gate visibly, never passes a wrong result), so it is genuinely minor. The cleaner shape — have `bundle.ts` log its `built.`/`Done` lines to stderr so npm's `--json` stdout stays pure — is a `bundle.ts` change with its own blast radius, correctly out of scope here. — proposed owner: Clove (if ever pursued)

## Citations

### Plan evidence

- `.prism/plans/followup-425-dist-lifecycle.md` (branch version) — `## Decisions` (8 plan entries + the execution-added stdout-slice entry, verdict `no promotion needed`); `## Acceptance Criteria` AC-1..AC-9; `## AC Adjustments` (AC-1 exit-0 clause blocked on the open bug); `## Debugged Issues` (1 `open`, High — multi-`main()` bundling bug, `[Confirmed]`, pre-existing); `## Review Issues` (2 Briar Minors both `fixed`, plus a clean pass-2 line); `## Sessions` (4 segments: 1 planning, 1 implementation, 2 self-review); `## History` (5 entries, task 5's prepack-fires answer recorded).

### Execution record

- `source: merged-diff` — `origin/main..huntermcgrew/prism-425-dist-lifecycle`: 4 commits, 11 files, +90 / −4625 (−4612 from the `dist/cli.js` untrack). No runtime source changes, per the plan's Decision.
- `source: ci` — PR #434 check-runs: `prism-check (ubuntu-latest)` SUCCESS, `prism-check (windows-latest)` SUCCESS (completed 2026-07-22T07:57Z).
- `source: pr-thread` — Eric PR #434 review (issue-comment 2026-07-22T08:21Z): 1 Minor Standards (`indexOf` robustness, non-blocking, inline on `verify-pack-parity.ts:66`), AC-1 exit-0 clause reproduced as genuinely unmet + correctly scoped, pre-existing High bug flagged for a prompt follow-up ticket, no blockers, not approving (human call, ADR-0011). Second issue-comment (2026-07-22T08:30Z): Reese QA checklist posted at `.prism/plans/qa/bug-prism-425-verification.md` — 10 tester-facing scenarios, scenarios 1–5/8/9/10 dry-run passed against PR head. `reviews[]` state `COMMENTED`.
