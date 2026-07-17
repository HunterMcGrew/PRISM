# Retro — prism-413

**Target:** `.prism/plans/prism-413.md` (PR #414, branch `huntermcgrew/prism-413-eval-layer`)
**Grain:** per-pr
**Generated:** 2026-07-17

## Charter coverage

| # | Charter item | Answerable | Sources | Gap |
| --- | --- | --- | --- | --- |
| 1 | Did we do what we said? | yes | `.prism/qa/ac-verification-prism-413.md` (ingested), Decisions, `origin/main..HEAD` | none |
| 2 | Were there issues / bottlenecks? | yes | `## Review Issues` (4), PR #414 threads | none |
| 3 | Actionable improvements? | yes | Review Issues, PR #414 threads | none |
| 4 | Did we follow code standards? | yes | Briar self-review, Eric PR #414 review | none |
| 5 | Did we do anything wrong / do better? | yes | Decisions REVERSAL, Eric Major finding | none |
| 6 | Are the tests passing? | yes | `pnpm prism:check` exit 0; PR #414 check-runs | final-child CI approximated by PR #414 check-runs (pre-merge, not yet main-CI) — ADR-0047 placement |

**Coverage: 6 / 6 charter items answerable.** Evidence census — history 12, decisions 21, debugged 0, review 4 (all `fixed`), PR-thread surfaces 3, CI runs 2, merged PRs 0 (PR #414 open at retro time; the reflect phase runs pre-merge on the final branch).

Charter item 1 was answered by **ingesting Reese's AC-verification report** (`.prism/qa/ac-verification-prism-413.md`, SHA `1dc1975`) discovered via the plan's `## History` pointer — its per-criterion verdict table is the graded evidence, not a re-derivation from the diff. This ingestion **is** the AC-7 demonstration (see Fidelity gap).

## Fidelity gap

**None — shipped as planned.** Reese's report grades **6 / 6 machine criteria MET** (AC-1..AC-6), evidence-type ratio 4 executed / 2 inspected / 0 `demonstrated` — zero verdicts rest on self-report. The integrity check held: fixture (2), the deliberately-failing criterion, genuinely graded UNMET with byte-level expected-vs-observed (expected ≥1 sentinel, observed 0, grep exit 1), so the grader distinguishes a failure from a rubber stamp. CI is green on both runners (`prism-check` ubuntu + windows SUCCESS); `pnpm prism:check` exits 0.

**AC-7 (this retro) satisfied.** AC-7 is the one human-tagged criterion: *"When the run closes, Then Iris ingests the `.prism/qa/` report as charter-item-1 evidence rather than re-deriving fidelity independently."* This report ingested and cited that report for charter item 1 (rows above), rather than recomputing AC fidelity from the diff. That closes AC-7's awaiting-human-verification item — the retro citing the report is the end-to-end trace the criterion asked for.

**Issues surfaced, all resolved before merge.** The work carried real corrections, and the process caught every one inside the same PR:
- Briar's self-review found 3 issues (stale "four modes" count in `shared-mechanics.md`, a missing `## History` heading that would have hidden the plan-pointer AC-7 depends on, and uncited AC-1..AC-7). All `fixed`, re-verified by Briar independently.
- Eric's PR #414 review found 1 Major — the verdict-contract taxonomy was homed only in the non-shipping plan, with five durable files deferring to it, so the pointer dangled in every consumer install. Fixed via Sub-group F; Eric re-reviewed and independently re-verified the fix, closing the gauntlet with zero new findings.

A correction caught and fixed pre-merge is the review layer working as designed, not a shipped-result fidelity gap. The one item worth carrying forward is a latent tooling gap (see Action Items).

## Promotion cautions

One Decision the execution record refuted. Winston consumes this in the close phase — promote **corrected**, never unchanged.

- **Decision: "Per-criterion verdicts are binary; UNGRADEABLE carries a required reason"** — original verdict promoted the *taxonomy* to `.prism/skills/prism-conductor/lib/report-back.md`.
  - **Refuted by:** Eric's PR #414 Major finding (issue-comment summary + inline comment on `report-back.md:49`). `.prism/skills/` ships to zero consumer installs — verified absent from both the npm `files` list and `templates/install/`. A taxonomy homed there is unreachable by the shipped consumer-facing pointers that need it.
  - **Correction (already live):** Winston's mid-run REVERSAL re-homed the *semantics* to a new shipped reference, `.prism/references/qa-test-plan/verdict-contract.md`; `report-back.md` keeps only the `acVerdicts` *shape* + routing predicates. Sub-group F (F1–F6) created the reference and redirected all five pointer sites; `pnpm prism:check` exit 0, install seed carries the file.
  - **For close:** promote the semantics home as `.prism/references/qa-test-plan/verdict-contract.md`; the `acVerdicts` *shape* promotion to `report-back.md` stands unchanged. Do not promote the original report-back.md-owns-the-taxonomy verdict.

## Action Items

- [ ] Decide whether `install-relative-link-gate` / `crossref-lint` should flag inline-code-prose citations to non-shipping paths — the class that let the dangling `prism-413.md` plan-pointer slip past Eric's first pass (caught only because the fix converted the pointers to real markdown links, which the gate *can* validate). The latent gap is that other inline-code-prose pointers to non-shipping paths would still slip past. — proposed owner: Winston

## Citations

### Plan evidence

- `.prism/plans/prism-413.md` — `## Decisions` → "Per-criterion verdicts are binary" + its **REVERSAL** sub-entry; `## Review Issues` (4 entries, all `fixed`); `## Sessions` (9 Sol-dispatched segments); `## Acceptance Criteria` AC-1..AC-7 with `(REQ-N)` citations.
- `.prism/qa/ac-verification-prism-413.md` — `source: ac-verification` — verdict table AC-1..AC-6 (6 MET), evidence-type ratio, awaiting-human AC-7. Ingested as charter-item-1 evidence.

### Execution record

- `source: ci` — PR #414 check-runs: `prism-check (ubuntu-latest)` SUCCESS, `prism-check (windows-latest)` SUCCESS.
- `source: pr-thread` — Eric re-review issue-comment (2026-07-17T06:20Z, "closes the pr-review gauntlet… No new findings"); two inline Major comments from the first pass (`report-back.md`, `templates/install/.prism/references/qa-test-plan/mode-ac-verification.md`), both resolved by Sub-group F.
- `source: merged-diff` — `origin/main..HEAD`: 71 files, +1365 / −123 (skill-spec change; no product source).
