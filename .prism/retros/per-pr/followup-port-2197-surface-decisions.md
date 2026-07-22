# Retro — followup-port-2197-surface-decisions

**Target:** `.prism/plans/followup-port-2197-surface-decisions.md` (PR #438, branch `huntermcgrew/prism-port-2197-surface-decisions`)
**Grain:** per-pr
**Generated:** 2026-07-22

## Charter coverage

| # | Charter item | Answerable | Sources | Gap |
| --- | --- | --- | --- | --- |
| 1 | Did we do what we said? | yes | `.prism/qa/ac-verification-followup-port-2197-surface-decisions.md` (ingested), `## Decisions`, `origin/main...<branch>` diff | none |
| 2 | Were there issues / bottlenecks? | yes | `## History` (Briar pass 1/2), PR #438 threads (Eric inline + summary) | none |
| 3 | Actionable improvements? | yes | Eric PR #438 summary, Reese AC-verification observation | none |
| 4 | Did we follow code standards? | yes | Briar self-review (History), Eric PR #438 review; the file's own § Plain language over jargon honored ("tool" over "mechanism") | none |
| 5 | Did we do anything wrong / do better? | yes | Reese + Eric AC-6 enumeration observation, Briar `#2197` Minor | none |
| 6 | Are the tests passing? | yes | `prism-check` ubuntu + windows SUCCESS; three local `pnpm prism:check` exit-0 runs (Clove, Reese, Briar) | PR check-runs green **pre-merge** — the child's own CI, not yet post-merge main-CI (reflect runs on the final branch before merge) |

**Coverage: 6 / 6 charter items answerable.** Evidence census — history 7, decisions 5, debugged 0, review-section 0 (Briar's findings recorded in `## History` + `## Sessions`, this plan carries no `## Review Issues` section), PR-thread surfaces 3 (1 inline review comment, 2 issue comments), CI runs 2 (+3 local exit-0), merged PRs 0 (PR #438 draft/open at retro time).

Charter item 1 was answered by **ingesting Reese's AC-verification report** rather than re-deriving fidelity from the diff: 5 machine criteria MET (AC-1/2/3/5/6), 0 UNMET, 0 UNGRADEABLE, AC-4 awaiting-human with both required clauses confirmed present in the shipped bullet. Eric independently re-verified all five machine AC against the branch ref and confirmed AC-4's two clauses — so item 1's fidelity rests on graded evidence, not self-report.

## Fidelity gap

**Shipped result matches plan intent — the one divergence is in the plan's own AC-6 evidence text, not in what shipped.** The port landed exactly as decided: a 2-line canonical edit (one appended `**Why:**` sentence, one new `- Surface the ask, don't bury it` bullet at `:84`, immediately after `:83` "Point, don't menu"), propagated byte-identically to all five generated mirrors by `pnpm prism:build`. `prism-check` is green on both runners. All five `## Decisions` held under execution — canonical-file target, "tool" over "mechanism", the change-what-happens-next scoping, the A/P/C-gate carve-out kept separate, and the unbolded style all shipped as written and none was refuted.

The single genuine plan-intent-vs-execution divergence: **AC-6's Evidence clause hard-enumerated a file list the real diff outgrew.** It asserts the diff "lists only `.prism/rules/writing-voice.md`, its **four** generated mirrors, and this plan file" (six paths). The actual diff is nine — the canonical file, **five** mirrors (`.cursor/rules/writing-voice.mdc` is the uncounted fifth), the plan, and two QA paper-trail files (the AC-verification report and the PR-438 QA checklist). The **substance** AC-6 tests — change confined to rule prose, no script/schema/skill body — holds; only the enumeration drifted. Both Reese (observation in the AC-verification report) and Eric (cross-cutting observation in the PR summary) flagged it, and Reese's verdict contract correctly refused to grade it UNMET, since doing so would route an appeasement fix (deleting a legitimate build-required `.cursor` regeneration to satisfy a stale count). This is an AC-authoring drift caught by two independent review passes, not a shipped defect.

**Issues surfaced, all resolved or teed up before merge.** One Minor was caught and fixed in-PR: Briar's pass 1 found the PR title/body's bare `#2197` autolinking within this repo instead of the upstream thrive PR; Clove fixed it (title now `chore: Port thrive PR 2197 — …`, 61 chars, zero bare `#2197`), and Briar's pass 2 independently confirmed the fix with zero new findings. Eric's one open Minor is genuinely optional (see Action Items). A correction caught and fixed pre-merge is the review layer working as designed.

## Promotion cautions

**None — no `## Decisions` entry was refuted by the execution record.** All five Decisions held, and every one already carries a `→ no promotion needed` verdict, so the close phase promotes nothing durable and consumes no caution. Charter coverage is full (6 / 6), so this is absence of drift, not absence of evidence.

## Action Items

- [ ] **Sharpen AC-6's Evidence at plan close** — replace the hard six-path enumeration ("its four generated mirrors, and this plan file") with a count-free membership rule: "its generated mirrors, the plan, and this port's own QA paper trail," per this same file's § "Count rules, not numbers." The current wording would grade UNMET against the real nine-file diff even though the change it tests for is satisfied. — proposed owner: **Winston** (at close; already recommended by both Reese and Eric). Routes through the close phase as a same-scope, pre-merge refinement — no new ticket (per `followup-scope.md`).
- [ ] **Optional — bullet length (author's judgment).** The new bullet runs ~6 sentences against 1–2 for each of its five siblings, in tension with the same file's § "Keep it short enough to be read." Eric's proposed shape: move the two closing meta sentences (the *ask-back*-vs-answer disambiguation and the status/orchestration carve-out) into the section's existing **Two carve-outs** block, leaving the bullet punchy. Non-blocking, genuinely the author's call — flagged inline at `:84` so a human decides. — proposed owner: **Clove / human** (at close, if taken).

## Lesson candidate

*Proposed, not appended — Iris is read-only on the plan and lessons file.*

- **AC Evidence clauses that hard-enumerate generated-mirror paths or counts drift the moment the mirror set grows.** Here the plan's six-path AC-6 evidence didn't count `.cursor` (the fifth mirror) and predated the two QA paper-trail files, so a machine `git diff --name-only` grade would fail against a substantively-correct change. When an AC's evidence is a diff-name check over generated mirrors, cite the membership rule ("its generated mirrors, plus its own QA paper trail") rather than a fixed list — writing-voice § "Count rules, not numbers" applies inside AC Evidence lines, not just prose. Fits `.prism/lessons.md`.

## Citations

### Plan evidence

- `.prism/plans/followup-port-2197-surface-decisions.md` — `## Decisions` (5 entries, all `→ no promotion needed`); `## Acceptance Criteria` AC-1..AC-6 (AC-6 evidence enumeration is the drifted clause); `## Sessions` (7 segments); `## History` (7 entries, Briar Minor recorded + fixed); `## PR Readiness` (no critical/major, `prism:check` green).
- `.prism/qa/ac-verification-followup-port-2197-surface-decisions.md` — `source: ac-verification` — verdict table AC-1/2/3/5/6 MET, AC-4 awaiting-human; the AC-6 stale-count observation. Ingested as charter-item-1 evidence.
- `.prism/qa/pr-438-qa-checklist.md` — Reese Feature/PR-mode checklist; self-corrected its AC-6 item to the accurate diff count.

### Execution record

- `source: ci` — PR #438 check-runs: `prism-check (ubuntu-latest)` SUCCESS, `prism-check (windows-latest)` SUCCESS (workflow run 29964349718).
- `source: pr-thread` — Eric inline review comment on `.prism/rules/writing-voice.md:84` (bullet-length Minor, optional); Eric PR #438 summary issue-comment (5 machine AC re-verified, byte-identity mirror check, AC-6 enumeration observation, no critical/major); Reese QA-checklist issue-comment.
- `source: merged-diff` — `origin/main...huntermcgrew/prism-port-2197-surface-decisions`: 9 files, +294 / −11 (canonical rule + 5 mirrors + plan + 2 QA files; the canonical rule change is 2 lines). No product source, no script/schema/skill body.
