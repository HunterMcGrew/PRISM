# Retro — PRISM-550

**Target:** `.prism/plans/prism-550/plan.md` and `spec.md`
**Grain:** per-pr
**Generated:** 2026-11-20
**Graded at:** `caf0a645`, the local head of PR #551. The last pushed commit is `7d0d50e6`, and `caf0a645` changes one line of `CHANGELOG.md` to fix PR-review round 2's nit.

## Charter coverage

This run reached every source `.ai-skills/config.json#retroEvidence` declares: git, the GitHub PR platform (`gh` signed in, and `reconcile.mjs 551 --no-write --json` reports clean), and GitHub Actions CI. This retro did not run the test command. Test results come from CI and the verify record. No source reads `not configured for this team` or `unreachable this run`, and all six questions are answered.

| Charter question | Answer | Sources | Gap |
| --- | --- | --- | --- |
| Did we do what we said? | Yes. All nine tasks shipped, each with a commit naming it. This retro re-ran the machine evidence for AC-1 to AC-4 and AC-9 to AC-14 at `caf0a645`, and all are met: one changed `package.json` line and no tag, 37 roster IDs all in the entry, no unrouted skill, Sol, Ren, and Theo named, 12 doctor bullets and 1 link, and the sweep and retired-ID greps silent. AC-5 to AC-8 are met from `## Release proof`, and AC-15 from CI. AC-16 and the human halves of AC-2, AC-10, AC-12, and AC-13 still need a person. | `## Tasks`, `## Acceptance Criteria`, `## Release proof`, `## Review`, `git log origin/main..HEAD`, the PR #551 body | AC-16 and four human halves |
| Were there issues or bottlenecks? | Review volume on prose. Self-review ran 3 rounds (11, 3, then 1 Minor), and PR review ran 2 (1 Minor, then a nit). Two finding classes came back after their fixes: the closed count of person touches (round 1, then round 2 at `CHANGELOG.md:68`), and the approve-guard exception wording (PR-review round 1's nit, then round 2's nit about its scope). The plan took 2 challenge rounds. The approve guard denied an inline comment that quoted the approval script's filename, so that nit went into the summary instead. | `## Review` round lines, `## Challenge` | none |
| What improvements could we make? | Check every line of task text that describes source behavior against that source when the plan is written. Six task lines prescribed wording that review then had to replace (see Fidelity gap). Open the three deferred follow-ups once #551 merges. | the Decision on review rounds replacing task wording, `## Review` round 1 | none |
| Did we follow the code standards? | Yes, after review. No Critical or Major in any round. `last_updated` frontmatter was checked on every edited `docs/` page. One nit was declined with a reason: "run on their own" in `overview.md` and `getting-started.md`. | `## Review` coverage lines, PR #551 summary comment | none |
| Did we do anything wrong, or could we have done better? | Three things. Six task lines paraphrased a source and got it wrong, and those lines account for 6 of the 14 Minors in self-review rounds 1 and 2, plus one nit. The `## Verification` evidence cells are session scratch paths, which a reader of the merged plan cannot open, as the PRISM-537 and PRISM-544 retros also found. `## Sessions` was empty until this retro, so no earlier stage persisted its orientation battery. The release proof did its job: it caught the `.bak` defect in `prism update` before publish. | `## Review`, `## Verification`, `## Sessions`, `## Release proof` | none |
| Are the tests passing? | Yes at the pushed head. `prism-check` passed on `ubuntu-latest` and `windows-latest` at `7d0d50e6` (run 44862372352) and at `8ab5e533` (run 44861282622). Verify passed at `8d782b30`. `caf0a645` and this retro's commit change only docs, plan, retro, and architect prose. | `gh pr checks 551`, `gh run list`, `## Verification` | CI pending on `caf0a645` and the retro commit until the session pushes |

## Fidelity gap

- **Six task lines prescribed wording that review replaced.** These were T2 item 6 ("matches no file"), T5 item 2 ("three things add a touch"), T6's `Parker → Mira → Nora`, T7's opening ("names its gate", "Cursor gets no hooks"), T7's umbrella row ("or in a rule file"), and T8 Part 7 (the merge key "governs PRISM's own merges"). Each read like a source fact, and each was a paraphrase that the named source contradicted: `checkArchitectRoutes`, the workflow rule's Advancing paragraph, `ticket-workflows.md`, the deny strings in the gate modules, the `umbrellas` reach, and `git-conventions.md` Who merges. The shipped docs follow the review. The tasks stay as approved, and a Decision records each departure. That keeps the plan honest, but the plan stage wrote six claims nobody checked. Observation only: T2 already said "verified against the named function's JSDoc" and was still wrong, so a sharper sentence in the plan template would not have caught it. A reviewer reading the source did.
- **AC-16 and four human halves are open.** AC-16 asks a person to run onboarding in the scratch repo from the release proof and decline Atlas's architect-doc offer. The human halves are AC-2's `blob/main` anchors, which resolve only after merge, AC-10's run order, AC-12's stage order, and AC-13's row check. The PR #551 body lists AC-16 under Still open.
- **Scope grew only through recorded Decisions.** `README.md`, `CONTEXT.md`, `CHANGELOG.md`, and `package.json` joined Affected systems under a Winston `proceed with changes` verdict. The extra `parker.md` and `CONTEXT.md` lines and the extra troubleshooting rows each have a Decision. `.prism/plans/prism-544/plan.md` rides this PR with PR #549's round 2 record, and the PR body's Notes name it.
- **Four open questions shipped on their defaults** (spec Decisions D1 to D4: changelog-only migration note, no 0.7.0 to 0.10.0 backfill, no tag step in the publishing guide, Sol, Ren, and Theo retired). The PR body's Notes list all four for Hunter.

## Action Items

- **Open the three deferred fixes as follow-up PRs off `main` once #551 merges, one PR each.** (1) Diagnose why `prism update` from an unedited `0.10.0` install keeps `writing-a-skill.md` and `writing-an-architect-doc.md` as `.bak` copies identical to the seed, fix the divergence check, and add a regression test. That traces to the `.bak` Decision in `plan.md`. (2) Add the committed pack, adopt, doctor test the spec deferred ("No committed pack → adopt → doctor test in this release"). (3) Fix `docs/overview.md:29` (PRISM as a sibling repo) and `docs/distribution.md:65-66` (Winston generating architect docs), per the "Adjacent stale lines left alone" Decision. Each is done when its PR merges, and (1) and (2) each with a test that fails on current `main`. All three are same-scope with this ticket, so each is a follow-up PR with no new ticket, per `followup-scope.md`. — proposed owner: the implement stage for (1) and (2), the docs stage for (3) → follow-up PRs off `main`, no new ticket

## Lessons exits

Today's 90-day window opens 2026-08-22, the same window the PRISM-544 retro used earlier today, and `.prism/lessons.md` has had no entry added or changed since then. An entry counts as cited when a rule, ADR, or architect doc still cites it, or when a plan added or changed a citation of it inside the window.

**Promoted (0).** This run's one promotion, the changelog-link rule in `npm-packaging.md`, matches no lesson.

**Expired (0).** The three entries dated before 2026-08-22 are still cited: ADR-0047's Context, `.prism/plans/reviewer-scope-bookkeeping.md` (2026-09-08), and `.prism/rules/writing-voice.md`. Every other entry is dated 2026-09-02 or later.

**Merged (0).** No two entries record the same rule. This is the same reading the PRISM-544 retro gave this morning.

## Review-miss classes

`node scripts/ai-skills/hooks/review/reconcile.mjs --classes` printed "No open class has 3 or more rows." `.prism/metrics/review-misses.jsonl` does not exist, so there is no open class, no proposal, and no row to append.

`reconcile.mjs 551 --no-write --json` reports `clean: true`, with no unlogged human comment, no thread needing a reply, and no missing PR body heading.

## Citations

### Plan evidence

- `plan.md` `## Decisions`: 15 entries. One is promoted (absolute changelog links). The rest are ticket tactics, scope bookkeeping, or deferred fixes.
- `spec.md` `## Decisions`: 10 entries, including the four OPEN questions D1 to D4.
- `## Challenge`: round 1 blocking 2 (no acceptance criteria, unpathed commits in the proof script), round 2 resolved with 7 non-blocking findings.
- `## Review`: self-review rounds 1 to 3 at `c50196b5`, `a410c318`, and `e4e236fe`, then PR-review round 1 at `8ab5e533` (1 Minor, 2 nits) and round 2 at `7d0d50e6` (1 nit, fixed at `caf0a645`).
- `## Verification`: `verdict: done`, base `09e24a22`, head `8d782b30`, five checks passing and `format` n/a. The evidence cells are session scratch paths.
- `## Release proof`: packed from `6afcb8d9`. It records `CLEAN`, doctor exit 0 with no `[ERROR]` in `fresh`, `up`, and `husky`, `prismVersion` `1.0.0`, no retired ID on disk, `untouched=0`, equal hook counts, `core.hooksPath` as expected, and the two `.bak` files.
- `## Acceptance Criteria`: AC-1 to AC-16.

### Execution record

- **PR #551**, an open draft. The pushed head is `7d0d50e6`, and the local head is `caf0a645`, 41 commits ahead of `origin/main`. It changes 15 files, +816/−90: the 12 Affected systems, this folder's `plan.md` and `spec.md`, and two lines of `.prism/plans/prism-544/plan.md`. Labels are `effort:glance` and `confidence:needs-judgment`. Summary comment 7056724495.
- **CI**: run 44861282622 passed at `8ab5e533`, and run 44862372352 passed on both legs at `7d0d50e6`.
- **Task commits** on the branch: T1 1, T2 4, T3 2, T4 1, T5 2, T6 3, T7 3, T8 6, T9 1, counting fix commits.
