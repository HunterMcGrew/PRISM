# Retro — retro-charter-redesign

**Target:** `.prism/plans/iris-cadence-starvation.md` + PR #402 (`huntermcgrew/retro-charter-redesign`, HEAD `2fffbbb`, draft, not yet merged)
**Grain:** per-plan / per-PR charter-fidelity (single plan, single PR — not a multi-child epic; the heavy cross-ticket divergence audit does not apply here)
**Generated:** 2026-07-07
**Voices:** Winston (planning), Clove (implementation), Briar (self-review), Eric (PR review)

**Note on this run:** this retro is doubly self-referential — it runs the newly-shipped charter design on the plan that designed and implemented it. It also runs immediately downstream of a prior dogfood retro (`.prism/retros/dogfood-issue-284-286-401.md`) that manually stitched a plan-only pass against a GitHub-augmented pass on unrelated PRs #400/#401, and whose Part-B findings against those PRs are what surfaced the Task-15 bug in the first place. This retro is the first run of the *shipped* engine — with the issue-comments fix and the durable self-review record both live — against the PR that shipped them.

---

## Summary

The plan shipped what it said. All 16 tasks (14 original + 2 additive, dogfood-surfaced) are implemented, verified by `pnpm run prism:check` (485/485 tests, zero mirror drift), self-reviewed with one Major and one Minor fix cycle, and PR-reviewed with zero blocking findings. Both of this PR's own headline capabilities were exercised directly as part of gathering this retro's evidence, and both worked: the issue-comments REST fetch reached Eric's full review body on PR #402 itself (`reviews[]` returned 0, the issues-endpoint returned 1 comment, 6654 characters, carrying Eric's structured findings) — and the plan's `## Review Issues` section carried Briar's two findings through to `Status: fixed` with a re-review confirmation, giving this retro a durable, plan-only trace of the self-review pass without needing chat transcripts. The one real bottleneck was a single fix loop after self-review (a factual misstatement about where a file lives, plus an over-length frontmatter description) — both caught before PR review, neither reached Eric. No divergences between what `## Decisions` claimed and what the diff/CI/review record shows.

---

## Charter coverage

| # | Charter item | Answerable? | Sources used | Gap |
|---|---|---|---|---|
| 1 | Did we do what we said? | Yes | Plan `## Implementation Tasks` (16 tasks) + `## Decisions` (13 entries, all with verdict sub-bullets) + `## History` (7 entries) vs. `git diff origin/main...HEAD` (64 files, +1552/-244) and 4 commits mapping 1:1 to the task groupings | none |
| 2 | Issues / bottlenecks? | Yes | Plan `## Review Issues` (2 findings) + `## History` entries 6–7 (fix cycle) + Eric's PR comment (re-confirms both fixes independently) | none |
| 3 | Actionable improvements? | Yes | Derived from the fix-cycle pattern below + Eric's review "Nothing for Clove to fix" line | none |
| 4 | Standards adherence? | Yes | `## Review Issues` (Briar, self-review) **and** Eric's PR-review comment body (issue-comments API), per the charter's two-source rule — both reached | none |
| 5 | Anything wrong / better? | Yes | Same two sources as item 4, cross-checked against each other (Briar found 2, Eric independently re-verified both fixes and found nothing new) | none |
| 6 | Tests passing? | Yes | `gh pr view 402 --json statusCheckRollup` — both CI legs (`prism-check` ubuntu-latest, windows-latest) `SUCCESS`; plan's `## PR Readiness` cites local `pnpm run prism:check` 485/485 four separate times | none |

**Full coverage.** All six charter items were answerable from evidence reached this run — no `not-configured` or `unreachable` rows. This plan shipped close to plan, and the retro-charter design itself is the mechanism that let this retro say so with a citation for every claim rather than trusting the plan's self-report.

**Census:** History 7, Decisions 13, Review Issues 2, PR issue-comments 1 (Eric, 6654 chars), CI check-runs 2 (both green), merged/branch commits 4.

---

## Charter answers

**1. Did we do what we said?**
Yes. All 16 tasks map to real diff content: the four commits (`e5aba37` core 14 tasks, `5f78cd0` task 15, `4943310` task 16, `2fffbbb` self-review fixes) correspond exactly to the plan's own task groupings and the two additive R1/R2 tasks the History narrates. Spot-checked against the diff stat (64 files touched, matching the "canonical + mirrors + seed" propagation pattern this codebase always produces) and against two AC items directly: REQ-6 (issue-comments fetch) and REQ-7 (Briar durable record) — both verified working end-to-end below, not just present in the diff.

**2. Issues / bottlenecks?**
One real bottleneck: after the 16 tasks landed, Briar's self-review caught a Major (Task 15's body and Decision write-up asserted the wrong sourcing model for `step-02-gather-evidence.md` — claimed an `.ai-skills/` canonical source with build mirrors that don't exist; the file is actually hand-authored canonical source in place) and a Minor (frontmatter description at 467 chars, over its own 250–400 target band). Both were fixed by Clove and independently re-confirmed by Briar's second pass at `2fffbbb`. This is the charter-fidelity design working as intended — the bottleneck is visible in the plan's own `## Review Issues`, not smoothed into a one-line History note.

**3. Actionable improvements?**
See Action Items below. The main one isn't a defect in this PR — it's a process gap the fix-cycle exposed: nothing currently checks a task's own stated numeric target (frontmatter description length, "250–400 chars") until self-review catches it by hand-counting. That's a cheap, automatable check.

**4. Standards adherence?**
Clean per both sources. Eric's review (fetched via the issues-endpoint, not `--json reviews`) explicitly checked comment hygiene (no `TODO`/`HACK`/session-context-leakage phrases), mirror fidelity (`pnpm run prism:check` build --check authoritative), lazy-artifacts discipline (`.prism/retros/` not pre-seeded, `retroEvidence` config content-bearing not a placeholder), and seed-curation sequencing (ADR-0068 added to `excluded[]` correctly) — all pass. Briar's two findings were about factual accuracy and a stated-target overshoot, not code-standards violations per se.

**5. Anything wrong / what could we do better?**
Nothing wrong that reached merge. The one process observation: the Major finding was a plan-internal contradiction that persisted across several History entries before Briar's gauntlet caught it — the plan's own Task 15 preamble and a later History entry already stated the correct model, but the task body and Decision write-up (written earlier) still said the opposite. A "does this decision write-up match what a later entry already corrected" self-consistency check might have caught this earlier, though catching it at self-review (before PR review, before merge) is exactly where the gauntlet design wants it caught, not a bottleneck by the charter's own bar.

**6. Are the tests passing?**
Yes on all axes checked. `gh pr view 402 --json statusCheckRollup` shows `prism-check (ubuntu-latest)` and `prism-check (windows-latest)` both `SUCCESS`, completed 2026-07-07T05:06–05:07Z. Locally, the plan's `## PR Readiness` and `## History` cite `pnpm run prism:check` green (485/485 tests, verify-manifest, crossref-lint, build/seed-drift) four separate times across the implementation and fix cycles. No red cycles recorded anywhere in the plan or the PR — this diff is spec/docs/config only (Eric's review notes explicitly: "no executable source paths changed").

---

## Capability proof (Tasks 15 / 16 end-to-end)

**Task 15 — issue-comments fetch.** Ran the exact commands step-02 now specifies against PR #402 itself:
- `gh pr view 402 --json reviews -q '.reviews | length'` → `0`
- `gh api repos/HunterMcGrew/PRISM/issues/402/comments --paginate -q 'length'` → `1`, body 6654 characters, opening with the `<!-- code-review-pr-summary -->` marker and closing "— Eric", containing structured Summary / Standards findings / Spec findings / Cross-cutting observations / PR Readiness sections.

This is the precise failure mode Task 15 fixes, reproduced live: the reviews API is blind to Eric's review (he never files a Review object per ADR-0011), and the issue-comments endpoint is the only surface that carries it. Without Task 15's fix, this retro's items 4/5 would have read `pr-thread-unreachable` on a PR that was, in fact, thoroughly reviewed — exactly the misclassification the plan's Decision (task 15 write-up) names. With the fix, items 4/5 above read answerable, sourced, and cited. **Confirmed working.**

**Task 16 — durable self-review record.** Read `.prism/plans/iris-cadence-starvation.md`'s `## Review Issues` section directly (no chat transcript, no GitHub call). It carries two structured entries (Major: step-file sourcing; Minor: frontmatter length), each with `Status: fixed`, a `Fixed in:` note, and a `Re-review confirmation` line dated and branch-tagged from Briar's second pass at `2fffbbb`. This let items 4/5 above cite self-review evidence purely from the plan — the exact durable-record contract Task 16 establishes (a clean pass would have written `No issues found — <date>`; this pass had findings, so it wrote the structured form instead, which is the branch of that same contract). **Confirmed working** — though this run didn't exercise the *zero-findings* line specifically, since this branch's self-review wasn't clean; that specific branch remains unproven by this retro (see Promotion cautions).

---

## Action Items

- [ ] Add an automated check for a task's self-stated numeric target band (e.g. frontmatter description "250–400 chars") so a future over-length description is caught by CI/build rather than requiring a human self-review pass to hand-count it. — proposed owner: Winston (scope: `scripts/ai-skills/` discovery-metadata test, extend the existing 1000-char cap check to also warn on a task-stated target band when one exists in the authoring rule). This is process tooling, not a code defect — route through the follow-up-scope gate (`.prism/rules/followup-scope.md`) before filing; it may be small enough to fold into a future frontmatter-touching PR rather than earning its own ticket.
- [ ] Exercise Task 16's zero-findings branch (`No issues found — <date>` durable line) on a genuinely clean self-review pass, to close the one capability this retro could not directly observe. — proposed owner: whichever persona next runs Briar on a branch that turns out clean; no action needed now, just a note that this branch of the contract is implemented but not yet observed in the wild.

No divergence-driven action items — the plan matched its own execution record on every charter axis checked.

---

## Promotion cautions

None. Every `## Decisions` entry in the plan carries a verdict sub-bullet (`→ promoted to ADR-0068` or `→ no promotion needed (<reason>)`), and cross-checking those verdicts against the actual diff and Eric's review turned up no Decision the execution record contradicts. Winston's Decision verdict gate at close should find nothing to relitigate here — this is the "no divergences, full coverage" case the charter design itself calls out as the honest-clean-shipping-close verdict (see plan's own line 62, the coverage-qualified full-coverage phrasing this PR authored).

One narrow caution worth naming for Winston's close pass, not a refuted Decision: the "Per-PR retro-note retention" Decision's verdict line reads `→ no promotion needed (already covered by ADR-0047's plan-preservation precedent — retros inherit the same retention model, no new ADR needed)`. That's a reasonable call, but it means the retention rule for `.prism/retros/<epic>/<ticket-id>.md` co-location lives only in this plan's Decisions prose and ADR-0047's general precedent — not spelled out anywhere in `.prism/rules/`. Not a defect; just worth Winston's eyes at close in case the generalization from "plans are preserved" to "retro co-location paths follow this specific directory shape" needs its own line somewhere durable.

## Lesson candidates

- **Pattern:** a plan's own earlier-written correction (a later History entry stating the true model) coexisted for a time with an uncorrected earlier passage (the Task 15 body/Decision) making the opposite claim, and the contradiction was only caught by an independent self-review pass rereading the whole file, not by the act of writing the correction itself. **Where it might fit `.prism/lessons.md`:** when a plan session discovers that an earlier section was wrong, treat the correction as needing a forward-reference sweep of that specific claim across the file, not just a fresh entry appended after it — akin to the removal/rename completeness sweep in `.prism/rules/code-standards.md`, but for corrected-but-not-swept factual claims within a single plan file. This is a proposal for Winston or the session-close mechanic to evaluate, not an append made by this retro.

---

## Citations

### Plan evidence
- `.prism/plans/iris-cadence-starvation.md` `## Implementation Tasks` (tasks 1–16), `## Decisions` (13 entries with verdicts), `## History` (7 entries), `## Review Issues` (2 entries, both `fixed`), `## PR Readiness`, `## Acceptance Criteria` (12 behavioral items, REQ-1..7).

### Execution record
- `git diff --stat origin/main...huntermcgrew/retro-charter-redesign` — 64 files, +1552/-244.
- `git log --oneline origin/main..huntermcgrew/retro-charter-redesign` — 4 commits: `e5aba37`, `5f78cd0`, `4943310`, `2fffbbb`.
- `gh pr view 402 --json ...` — `isDraft: true`, `state: OPEN`, `mergeable: MERGEABLE`, `headRefOid: 2fffbbb74c4f9d070ae5217a31e793cae8227d89`.
- `gh pr view 402 --json statusCheckRollup` — `prism-check (ubuntu-latest)` SUCCESS, `prism-check (windows-latest)` SUCCESS.
- `gh pr view 402 --json reviews -q '.reviews | length'` → `0` (source: pr-thread, ADR-0011 confirmation).
- `gh api repos/HunterMcGrew/PRISM/issues/402/comments --paginate` → 1 comment, 6654 chars, Eric's structured review (source: pr-thread).

### Per-ticket fidelity
- Not applicable at this grain — this is a single-plan/single-PR close, not an epic aggregating child per-PR notes. (For context only: `.prism/retros/dogfood-issue-284-286-401.md` is a prior, differently-scoped dogfood retro against unrelated PRs #400/#401 that predates this PR's fixes and is not an input to this report.)
