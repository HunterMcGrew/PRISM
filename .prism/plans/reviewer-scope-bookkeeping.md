# Plan: reviewer-scope-bookkeeping

## Ticket

Unfiled — no tracker ticket. Surfaced during the PR #458 review rounds and scoped directly by Winston.

**Branch:** `huntermcgrew/reviewer-scope-bookkeeping-rule`, off `origin/main`.

---

## Goal

Stop review findings whose only subject is the review process's own bookkeeping from gating a merge or earning another review round.

---

## Decisions

- **The rule lives in `.prism/rules/followup-scope.md`, not a new rule file.** That file is already `load: always`, already owns the bookkeeping-section set the new rule reuses, and its Purpose already reasons about overhead that work does not earn — a review round spent on a `## History` line is the same shape as a ticket filed for a one-line correction. A new `load: always` file would add to the always-on layer this stack is trying to shrink, and it would separate the definition from the list it depends on, giving the two room to drift.
  - **Alternatives considered:** a new rule file; putting it only in the Briar and Eric skill bodies; putting it in `.prism/references/review-frameworks.md`.
  - **Rejected — skill bodies:** the definition would be duplicated across two personas and would not reach a human reviewing directly.
  - **Rejected — `review-frameworks.md`:** it is loaded by the two reviewer personas only, so it misses standalone and human review, which is one of the two gaps this plan exists to close.
  - → no promotion needed (the rule file *is* the durable surface).

- **AC `Evidence` sub-bullets are in scope; AC criterion lines are not.** The existing bookkeeping definition is section-granular, and `## Acceptance Criteria` cannot join it wholesale — the criterion lines are the ticket's contract and must gate exactly like code. So the new rule cites the existing section set unchanged and names two additions beside it: `.prism/lessons.md` and the `Evidence` sub-bullets. This is a separate term ("bookkeeping content"), defined once by citation, not a widened section list and not a second drifting copy.
  - **Root cause it addresses:** PR #458's pass 2 produced exactly one new finding, entirely about AC evidence numbers, and the current review-loop surface split puts `## Acceptance Criteria` wholly in Subject at full bar.
  - → no promotion needed (codified in the rule itself).

- **The classifier is positional, not semantic.** A finding is bookkeeping-only when every `**File:** <path>:<line>` it cites lands in bookkeeping content. The finding format already requires that field (`.prism/rules/branch-plan.md` § Review Issues), so the classification reads off data the reviewer already had to write, and a reviewer cannot downgrade a real defect without misstating a path that is visible in the posted comment.
  - **Alternatives considered:** letting the reviewer judge "is this really about the code?"; a new severity tier below Minor.
  - **Rejected — reviewer judgment:** that is the exact failure mode the rule introduces, and a judgment-based classifier has no audit trail.
  - **Rejected — new severity tier:** the review-loop already established that provenance, not severity, is the discriminator, and a fourth severity is new vocabulary every reviewer has to learn.
  - → no promotion needed (codified in the rule itself).

- **Critical and Major gate regardless of surface; the exemption covers Minors only.** Two conditions, both mechanically checkable, and no judgment hedge that reopens the hole. A reviewer downgrading Major to Minor is a separate failure the existing severity discipline already governs.
  - → no promotion needed.

- **The mechanism is Eric's three-state decision gate, and nothing in Sol changes.** That gate is the single point that produces both the `review:has-minors` label (ADR-0061's condition 2 for Sol's merge authority) and the draft→ready flip (the gate that fires for human reviews too, with no conductor involved). One edit there reaches orchestrated runs and direct human review alike. Briar's equivalent is her Sol verdict — `needs-fix` is what buys another dispatch, so bookkeeping-only Minors return `done`.
  - **Implementation guidance:** do not edit `.ai-skills/skills/prism-conductor/`. Sol reads the label; it does not compute it.
  - → no promotion needed (ADR-0061 already records the label's role; this plan does not change it).

- **The review-loop's stricter disposition stays, and its restated section list goes.** The loop declines to raise Ledger findings at all, because the loop authored the text it would be reviewing and a pass that reviews its own output cannot converge. The rule's disposition is different (record, do not gate) for a different reason (it is not worth a round). Both are correct; only the *scope definition* is shared, so the loop cites `followup-scope.md` for it instead of restating six section names — removing a drift pair per `.prism/rules/implementation-task-detail.md` § Cite, don't restate.
  - → no promotion needed.

- **Measured effect is two of the three PR #458 rounds, not all three.** Pass 2 (AC evidence only) and pass 3 (plan prose numbers) are fully cleared. Of pass 1's three bookkeeping-flavored minors, only the AC-evidence one clears: the mis-cited test reference lives in `## Decisions`, which stays full-bar by design, and the commit-subject note cites no plan line at all. Recorded so nobody reads the rule as clearing more than it does.
  - → no promotion needed.

- **Out of scope: commit-message findings.** A finding about a commit subject cites no file line and is not covered. Widening to commit messages is scope creep on a scoping rule; leave it to `.prism/rules/git-conventions.md`.
  - → no promotion needed.

- **Re-landing this branch on `main` after PR #489: keep main's restructure, restore this branch's citation.** `main` merged PR #489 in between, which rewrote the review-loop's Ledger bullet to a one-pass Subject-clean exit and re-enumerated the six bookkeeping section names plus the PR body and the loop-emitted readiness line. That collided with this branch's task 4, which re-points the same bullet at `.prism/rules/followup-scope.md` § Bookkeeping findings are recorded, not gated.
  - **Root cause:** both branches edited the same Ledger bullet for different reasons — main widened the loop-local exemption list, this branch removed the drift-prone restatement of the shared section set.
  - **Alternatives considered:** take main's enumeration wholesale (reverts this ticket's AC-4 invariant that the six section names never survive in this file); take this branch's citation wholesale (drops main's PR-body and readiness-line additions, which are real loop-local exemptions this ticket never covered).
  - **Chosen approach:** merged text keeps the citation to `followup-scope.md` for the shared section-set + AC-Evidence-sub-bullet nuance, and appends the PR body and the readiness line the loop itself emits as loop-local additions. Beats both wholesale options — neither drops content the other branch added for a real reason.
  - **Implementation guidance:** `.ai-skills/skills/prism-review-loop/shared.md` § Review surfaces was the only file with a real conflict; the two generated mirrors (`.claude/`, `.cursor/`) regenerate from it via `pnpm prism:build` and need no hand edits.
  - → no promotion needed (ticket-tactical merge resolution, not a lasting pattern).

---

## Implementation Tasks

### Clove (implementation)

1. **Add the rule section to `.prism/rules/followup-scope.md`.** Insert a new `## Bookkeeping findings are recorded, not gated` section immediately **before** the existing `## Who runs this rule` heading (currently line 78), separated by a blank line above and below. Full content to insert:

   ```markdown
   ## Bookkeeping findings are recorded, not gated

   A **Minor** finding whose every cited line falls in bookkeeping content is recorded like any other finding — and then it waits. It never holds a PR in draft, never takes the `review:has-minors` slot, and never on its own earns another review round. Critical and Major gate regardless of surface.

   **Bookkeeping content** is the section set named in § Spec content never rides an unrelated ticket, plus two additions that share its shape: `.prism/lessons.md`, which that same section already treats as working notes rather than spec, and the `Evidence` sub-bullets under `## Acceptance Criteria` (per `.prism/templates/acceptance-criteria.md` § Gradeability Bar). Nothing else moves — `## Implementation Tasks`, `## Decisions`, and the AC **criterion** lines those Evidence sub-bullets hang from are the ticket's contract, and they gate exactly like code.

   **Why:** the review process writes the bookkeeping sections, so reviewing them feeds itself. Briar writes `## Review Issues`; Clove writes `## History`, `## Sessions`, `## PR Readiness`, and AC evidence to satisfy the review; the next pass reviews that prose and produces more of it. Severity does not terminate the cycle — a miscounted number in a `## History` line grades Minor exactly like a missed null check. PR #458 measured the cost: three review rounds and roughly five dispatches, while the two actual code fixes were confirmed correct in the first round and never touched again.

   **The citation classifies the finding, not the reviewer's judgment.** A finding is bookkeeping-only when every `**File:** <path>:<line>` it cites lands in bookkeeping content. One cited line outside it — in code, in `## Decisions`, or on an AC criterion — and the finding gates normally. This is the guard against the obvious abuse: a reviewer cannot downgrade a real defect without misstating the path it lives at, and that path is visible to everyone reading the posted comment.

   **How to apply:**

   - **Record it in full.** A bookkeeping-only Minor still earns its `## Review Issues` entry, its inline comment, and its severity. Nothing is suppressed — a claim that would mislead a future implementer, like an AC evidence command that cannot return its asserted result, is worth flagging. It earns one flag, not a round.
   - **Don't re-dispatch for it.** Briar returns `done` rather than `needs-fix` when bookkeeping-only Minors are all that remain; Eric treats them as state #3 rather than state #2.
   - **Fix it in the next commit that touches the plan** — on a live branch that is the next commit, because every persona writes the plan.
   ```

   Then append one row to the **end** of the existing `## Who runs this rule` list, after the `pnpm prism:spec-scope-lint` bullet that currently closes it:

   ```markdown
   - **`prism-review-loop`** — carries a stricter disposition on the same scope: the loop declines to raise a bookkeeping finding at all, because the loop authored the text it would be reviewing. See its § Review surfaces.
   ```

   No verification command — content-only, no build effect until task 5.

2. **Qualify Eric's decision gate** in `.ai-skills/skills/prism-code-review-pr/shared.md` (§ Decision gate — three states, currently lines 331–332). Replace exactly:

   ```
   2. **Unaddressed minors remain** — apply **effort + `review:has-minors`**. The `review:has-minors` label takes the confidence slot — minors need human eyes.
   3. **All clear** (zero issues, or all minors addressed/acknowledged) — apply **effort + confidence**. Pick the confidence label by axis state:
   ```

   with:

   ```
   2. **Unaddressed minors remain, and at least one is not bookkeeping-only** — apply **effort + `review:has-minors`**. The `review:has-minors` label takes the confidence slot — minors need human eyes.
   3. **All clear** (zero issues, or every remaining minor is addressed, acknowledged, or bookkeeping-only per [`.prism/rules/followup-scope.md`](../../../.prism/rules/followup-scope.md) § Bookkeeping findings are recorded, not gated) — apply **effort + confidence**. Pick the confidence label by axis state:
   ```

   Sequence: after task 1, so the cited section exists when `pnpm prism:crossref-lint` runs in task 5. Do not edit `.ai-skills/skills/prism-conductor/` — Sol reads the label, it does not compute it.

3. **Widen the `done` verdict in both reviewer skills.** The same paragraph appears byte-identical in `.ai-skills/skills/prism-code-review-pr/shared.md` (currently line 362) and `.ai-skills/skills/prism-code-review-self/shared.md` (currently line 348). In **both** files, replace exactly:

   ```
   **The review-rung verdict, spelled out.** Zero findings → `done`.
   ```

   with:

   ```
   **The review-rung verdict, spelled out.** Zero findings → `done`; so does a pass whose only remaining findings are bookkeeping-only Minors — record them and return `done` rather than buying another dispatch (see [`.prism/rules/followup-scope.md`](../../../.prism/rules/followup-scope.md) § Bookkeeping findings are recorded, not gated).
   ```

   The rest of each paragraph is unchanged. Sequence: after task 1, parallel with task 2.

4. **Re-point the review-loop's Ledger definition** in `.ai-skills/skills/prism-review-loop/shared.md` (§ Review surfaces, the `- **Ledger** —` bullet, currently lines 27–39). Replace the whole bullet with the content below. Preserve the file's existing ~72-character hard wrap; the exact wrap columns are the implementer's call, the words are not.

   > **Ledger** — bookkeeping content as `.prism/rules/followup-scope.md` § Bookkeeping findings are recorded, not gated defines it: the plan sections a persona appends findings to rather than the sections an author writes to declare scope, plus `.prism/lessons.md` and the `Evidence` sub-bullets under `## Acceptance Criteria`. Not a review target during the loop at any bar. Everything else in the plan file — `## Implementation Tasks`, `## Decisions`, and the AC **criterion** lines those Evidence sub-bullets hang from — is Subject content when it falls inside the diff being reviewed; Ledger names only bookkeeping, never the whole plan file. `## PR Readiness` is persona-rewritten on every self-review pass (`.prism/rules/branch-plan.md` defines it as "updated every time `code-review-self` runs"), which is the same persona-appends-versus-author-declares test the rest of the set applies — reviewing it at Subject bar would flag the loop's own bookkeeping as a finding on every pass. The loop's disposition is stricter than the rule's, for its own reason: the rule keeps a bookkeeping finding non-gating because it is not worth a round; the loop declines to raise one at all because the loop wrote the text it would be reviewing, and a pass that reviews its own output cannot converge.

   The six section names, restated together as the old drift-prone list (`## Review Issues`, `## History`, `## Sessions`, `## Debugged Issues`, `## Cleanup Items`, `## PR Readiness`), must **not** survive anywhere in this file — that removal is what AC-4 checks. This is about the *restatement*, not every individual mention: the replacement bullet above still names `## PR Readiness` on its own, once, to explain why it's persona-rewritten bookkeeping rather than Subject content, and that mention is fine — it's citation-consistent prose, not the six-name list this task removes. Leave the `| Ledger |` row in the Disposition table unchanged. Sequence: after task 1.

5. **Regenerate mirrors and verify.** Run `pnpm prism:build` (regenerates `.claude/`, `.codex/`, `.cursor/`, and `templates/install/.prism/` from the canonical sources, then runs `pnpm prism:test`), then `pnpm prism:check` — expect exit 0. `prism:check` includes `prism:crossref-lint` (validates the two new `§ Bookkeeping findings are recorded, not gated` cross-references) and `prism:spec-scope-lint` (the four changed discriminators — `followup-scope.md`, `prism-code-review-pr`, `prism-code-review-self`, `prism-review-loop` — are each named in `## Implementation Tasks` above, outside every bookkeeping section, so the lint passes). Then run every AC evidence command below and record the observed value beside each. Sequence: last.

---

## Acceptance Criteria

Baselines measured on `main` at `93434232`, 2026-08-14. Each probe counts occurrences with `grep -o … | wc -l`, never `grep -c`, per `.prism/lessons.md` § AC evidence commands are code.

### Behavioral

- [x] **AC-1** Given a reviewer has only findings about a plan's own history, session, or readiness prose, When they finish the pass, Then the pull request is not held open for those findings alone.
  - *Evidence (machine):* `grep -o 'bookkeeping-only' .ai-skills/skills/prism-code-review-pr/shared.md | wc -l` → `≥ 3` (baseline today: `0`; task 2 lands one occurrence in state #2 and one in state #3, task 3 lands a third in the verdict paragraph of the same file). Positive control: the same probe against `.prism/rules/followup-scope.md` returns `≥ 1`, proving the pattern matches. · UNMET looks like: `0`, meaning the decision gate never learned the exemption. **Observed:** `4` (positive control `4`) — MET; the fourth occurrence in the main probe is the precedence clause the pass-1 review-fix added, and the positive control rose to `4` when the pass-3 review fix added the empty-set clause to the same `followup-scope.md` paragraph.
  - *Evidence (human):* read § Decision gate — three states and confirm a pass holding only bookkeeping-only minors routes to state #3, which applies `effort + confidence` and flips the PR out of draft. · UNMET looks like: the reader still lands in state #2. **Observed:** state #3 now reads "every remaining minor is addressed, acknowledged, or bookkeeping-only" — MET.

- [x] **AC-2** Given a finding about how a criterion is to be verified, When the reviewer classifies it, Then it is treated as bookkeeping; and given a finding about the criterion itself, Then it is not.
  - *Evidence (machine):* `grep -o 'sub-bullets under' .prism/rules/followup-scope.md | wc -l` → `≥ 1`, **and** `grep -o 'lines those Evidence sub-bullets hang from' .prism/rules/followup-scope.md | wc -l` → `≥ 1` (baseline for both: `0`). Both patterns are deliberately backtick-free and asterisk-free so they survive shell quoting — the surrounding rule prose wraps both phrases in markdown formatting that a literal-match grep would otherwise trip on. Both halves required: the inclusion without the exclusion would put the ticket's contract on the non-gating side. · UNMET looks like: either probe returns `0`. **Observed:** `1` and `1` — MET.

- [x] **AC-3** Given a reviewer who believes a finding about the code is not worth another round, When they try to treat it as bookkeeping, Then the rule does not let them — the file path the finding cites decides, not their judgment.
  - *Evidence (machine):* `grep -o 'classifies the finding, not the reviewer' .prism/rules/followup-scope.md | wc -l` → `≥ 1` (baseline: `0`). · UNMET looks like: `0`. **Observed:** `1` — MET.
  - *Evidence (human):* read the paragraph and confirm it states the every-cited-line condition and names one line outside bookkeeping content as sufficient to restore full gating. · UNMET looks like: the condition is stated as "mostly" or "primarily" about bookkeeping, which is a judgment call again. **Observed:** the rule states "every `**File:** <path>:<line>` it cites lands in bookkeeping content. One cited line outside it... and the finding gates normally" — no hedge language — MET.

- [x] **AC-4** Given the gauntlet's definition of which plan sections it skips, When the definition changes in one place, Then it cannot disagree with itself in another.
  - *Evidence (machine):* `grep -o '## Cleanup Items' .ai-skills/skills/prism-review-loop/shared.md | wc -l` → `0` (baseline: `1`). Positive control: the same probe against `.prism/rules/followup-scope.md` returns `≥ 1`, proving the pattern matches a live file and the zero above is a real absence. · UNMET looks like: `1`, meaning the restated list survived. **Observed:** `0` (positive control `1`) — MET.

- [x] **AC-5** Given a reviewer working without the conductor — a person reading a PR directly — When the rule applies, Then it reaches them.
  - *Evidence (machine):* `head -3 .prism/rules/followup-scope.md` shows `load: always` in the frontmatter, **and** `git diff --name-only origin/main...HEAD -- .prism/rules/ | wc -l` → `1` with that one path being `.prism/rules/followup-scope.md` (baseline: `0` files changed). Together these show the rule reaches every session without adding a file to the always-on layer. · UNMET looks like: a count above `1`, meaning a new always-on rule file landed. **Observed:** `load: always` present; count `1` (`.prism/rules/followup-scope.md`) — MET.

### Non-behavioral

- [x] **AC-6** The new rule section defines bookkeeping content by citing the existing section set rather than copying it.
  - *Evidence (machine):* `grep -o 'Spec content never rides an unrelated ticket' .prism/rules/followup-scope.md | wc -l` → `≥ 3`. **Baseline is `2`, not `0`** — the heading itself and the existing `## Who runs this rule` reference already match, so a threshold of `≥ 2` would pass without any change to the file. · UNMET looks like: `2`, meaning the new section restated the list instead of citing it. **Observed:** `3` — MET.

- [x] **AC-7** Every generated mirror matches its canonical source and the full check suite passes.
  - *Evidence (machine):* `pnpm prism:check` → exit `0`. · UNMET looks like: non-zero exit, most likely `build --check` reporting seed or platform drift because task 5's `pnpm prism:build` was skipped, or `crossref-lint` failing on a section anchor that does not resolve. **Observed:** exit `0` (901 tests, 900 pass, 0 fail, 1 skipped; crossref-lint/spec-scope-lint/verify-pack-parity all pass) — MET.

- [x] **AC-8** The conductor is unchanged — the label's meaning moved, its consumer did not.
  - *Evidence (machine):* `git diff --name-only origin/main...HEAD -- .ai-skills/skills/prism-conductor/ .prism/skills/prism-conductor/ | wc -l` → `0`. Positive control: `git diff --name-only origin/main...HEAD -- .ai-skills/skills/ | wc -l` → `≥ 3`, proving the pathspec form finds changes when they exist. · UNMET looks like: any non-zero count under the conductor paths. **Observed:** `0` (positive control `3`) — MET.

### AC Adjustments

### AC Sync Log

| Date | Agent | Action | Plan | Ticket |
| ---- | ----- | ------ | ---- | ------ |
| 2026-08-14 | Winston | AC authored | `reviewer-scope-bookkeeping.md` | N/A — unfiled |

---

## Sessions

- 2026-08-14 [huntermcgrew/opus5-port-lint-resolution] open: Intent — stop bookkeeping-only review findings from gating merges and buying review rounds; Bounds — write this plan file only, touch no other plan, prescribe four source edits and no code; Approach — reuse the bookkeeping-section set `followup-scope.md` already defines, add the label mechanism at Eric's decision gate. · close: scope held
- 2026-08-14 [huntermcgrew/reviewer-scope-bookkeeping-rule] open: Intent — implement tasks 1-5 exactly as Winston specified: the bookkeeping-findings exemption in `followup-scope.md`, Eric's and Briar's decision-gate qualifiers, and the review-loop's Ledger citation; Bounds — the four named source files plus their generated mirrors, no `.ai-skills/skills/prism-conductor/` edits, no improvised text; Approach — apply each task's verbatim replacement text, verify `spec-scope-lint` resolves this plan before and after the diff exists, then `pnpm prism:build && pnpm prism:check`. · close: scope held
- 2026-09-08 [huntermcgrew/reviewer-scope-bookkeeping-rule] open: Intent — re-land this branch on top of `main` after PR #489 (the review-loop's one-pass restructure); Bounds — merge only, resolve the one real conflict in the review-loop's Ledger bullet by keeping main's structure and adding this branch's citation, no other source edits; Approach — `git merge origin/main`, hand-resolve the Ledger bullet, `pnpm prism:build && pnpm prism:check`, push. · close: scope held
- 2026-09-08 [huntermcgrew/reviewer-scope-bookkeeping-rule] open: Intent — grade all eight acceptance criteria against the post-merge branch diff and publish a verdict report; Bounds — read-only over the branch, writing only the report under `.prism/qa/` and this plan's pointer lines, no source or mirror edits; Approach — re-run every machine Evidence command from scratch at the merged SHA rather than trusting the recorded marks, keeping the tree clean throughout. · close: scope held
- 2026-09-08 [huntermcgrew/reviewer-scope-bookkeeping-rule] open: Intent — self-review PR #459 (self-review pass 1) at full bar against `git diff origin/main...HEAD`, including the merge-conflict resolution; Bounds — review only, no source edits, write findings to the plan and land a plan-only commit; Approach — verify each of the four source edits against the plan's tasks and Decisions verbatim, re-run `pnpm prism:build && pnpm prism:check`, independently re-verify a sample of the AC evidence commands, sweep all nine review angles. · close: scope held — found one Major finding outside the diff proper (the live PR #459 description on GitHub), which `## PR Readiness` already tracks as a checklist item
- 2026-09-08 [huntermcgrew/reviewer-scope-bookkeeping-rule] open: Intent — fix the one open Review Issue (PR #459's broken GitHub description) within the local frame; Bounds — the PR metadata field plus the plan's bookkeeping entries, no source or mirror edits; Approach — `gh pr edit --body-file` the scratchpad file Briar already verified as correct, confirm via a direct API read, mark the finding fixed. · close: scope held
- 2026-09-08 [huntermcgrew/reviewer-scope-bookkeeping-rule] open: Intent — self-review PR #459 pass 2 at full bar against `git diff origin/main...HEAD`, re-sweeping the same source diff pass 1 covered (unchanged since — the intervening commit touched only this plan) plus confirming the merge-conflict resolution held; Bounds — review only, no source edits, write findings to the plan and land a plan-only commit; Approach — re-read the full diff fresh, re-run `pnpm prism:build && pnpm prism:check` from a clean tree, re-verify AC-2/AC-3/AC-5/AC-8 independently, sweep all nine review angles. · close: scope held — zero new findings; pass 1's one Major was already fixed and stayed fixed
- 2026-09-08 [huntermcgrew/reviewer-scope-bookkeeping-rule] open: Intent — fix Eric's three PR-review pass-1 Minor findings (decision-gate confidence label, plan task 4's invariant wording, the QA report's AC-4 coverage claim) within the local frame; Bounds — the three named files plus this plan's bookkeeping entries, no other source edits; Approach — apply each finding's prescribed fix, re-verify the underlying facts independently, then `pnpm prism:build && pnpm prism:check`. · close: scope held
- 2026-09-08 [huntermcgrew/reviewer-scope-bookkeeping-rule] open: Intent — fix Eric's three PR-review pass-2 Minor findings (the decision gate's pass-bounded vs. bookkeeping-only ready-flip contradiction, `followup-scope.md`'s stale "same scope" claim, two stale AC Observed values) within the local frame; Bounds — the two named source files plus this plan's bookkeeping entries, no other source edits; Approach — verify each finding's underlying facts independently (re-run the grep probe, re-run the test suite, re-read the merged Ledger bullet) before applying the prescribed fix, then `pnpm prism:build && pnpm prism:check`. · close: scope held
- 2026-09-08 [huntermcgrew/reviewer-scope-bookkeeping-rule] open: Intent — re-grade all eight acceptance criteria at the current HEAD, after Eric's two PR-review passes and Clove's fixes, rather than trusting the marks already recorded; Bounds — read-only over the branch, writing only this plan's bookkeeping lines and the report under `.prism/qa/`, no source or mirror edits; Approach — re-run every machine Evidence command from scratch at the merged SHA, keep the tree clean throughout, update the report's verdict table and append a dated re-check entry. · close: scope held — 8 MET, 0 UNMET, 0 UNGRADEABLE; two probe values moved without moving a verdict
- 2026-09-08 [huntermcgrew/reviewer-scope-bookkeeping-rule] open: Intent — fix Eric's two PR-review pass-3 findings (one gating Minor on the bookkeeping classifier's empty-set vacuous-truth gap, one bookkeeping-only Minor on the readiness checklist's stale CI-clean claim) within the local frame; Bounds — the two named files plus this plan's bookkeeping entries, no other source edits, no fix to the merge-blocking `prism-check (windows-latest)` failure since it is inherited from `main`/#488 and out of this branch's scope; Approach — apply each finding's suggested one-clause fix verbatim, verify with `pnpm prism:build && pnpm prism:check`. · close: scope held
- 2026-09-08 [huntermcgrew/reviewer-scope-bookkeeping-rule] open: Intent — self-review PR #459 (self-review pass 3) at full bar against `git diff origin/main...HEAD` post Eric's pass-3 fixes; Bounds — review only, no source edits, write findings to the plan and land a plan-only commit; Approach — read the full diff fresh via `gh pr diff`, independently re-verify the mirror-depth claim behind pass 2's Citation integrity verdict rather than trust it, re-run `pnpm prism:check`, sweep all nine review angles. · close: drifted — the intended Subject (`git diff origin/main...HEAD`) turned out not to include Eric's pass-3 fixes at all, because they were never committed; found one Major (pass-3 fixes and their plan narration are uncommitted and unpushed) and one Minor (a broken-link defect pass 2's Citation integrity sweep missed via a false claim about `crossref-lint`'s coverage); see `## Review Issues`
- 2026-09-08 [huntermcgrew/reviewer-scope-bookkeeping-rule] open: Intent — fix Briar's self-review pass-3 Major (uncommitted pass-3 source fix) and Minor (broken relative link in agent mirrors) within the local frame; Bounds — the uncommitted `followup-scope.md` diff plus the two decision-gate citation source files, no other source edits; Approach — verify the uncommitted diff against Eric's discussion `r3955637504` before committing, drop the markdown-link brackets on every bracketed `followup-scope.md` citation in the two flagged files (not just the two named lines), `pnpm prism:build && pnpm prism:check`, commit, push. · close: scope held

---

## History

- 2026-08-14 [huntermcgrew/opus5-port-lint-resolution]: Winston scoped the rule after PR #458 spent three review rounds on plan prose. Found the review-loop's Ledger surface already covers most of the section set but is loop-only and puts AC evidence in Subject; see Decision: the mechanism is Eric's three-state decision gate.
- 2026-08-14 [huntermcgrew/reviewer-scope-bookkeeping-rule]: Clove implemented tasks 1-5 verbatim — the bookkeeping-findings exemption in `followup-scope.md`, Eric's and Briar's decision-gate qualifiers, and the review-loop's Ledger re-point to citation. `pnpm prism:build` (668/668 tests) and `pnpm prism:check` both exit 0; all eight AC evidence commands recorded MET.
- 2026-09-08 [huntermcgrew/reviewer-scope-bookkeeping-rule]: Merged `origin/main` (PR #489's review-loop restructure) and hand-resolved the one Ledger-bullet conflict; see Decision: re-landing this branch on `main` after PR #489. `pnpm prism:build` (900/901, 1 skipped) and `pnpm prism:check` both exit 0 on the pushed HEAD `15e8e983`; AC-1's and AC-4's grep probes re-verified against the merged file.
- 2026-09-08 [huntermcgrew/reviewer-scope-bookkeeping-rule]: Reese re-graded all eight AC against the post-merge diff at SHA `95bf7102` — 8 MET, 0 UNMET, 0 UNGRADEABLE; report at `.prism/qa/ac-verification-reviewer-scope-bookkeeping.md`. AC-1's and AC-3's human Evidence halves are listed there as awaiting-human-verification and are excluded from those counts. One side observation is recorded in the report: AC-4's probe covers one of the six section names its task names, and the other five were checked by hand.
- 2026-09-08 [huntermcgrew/reviewer-scope-bookkeeping-rule]: Briar self-reviewed the diff (all four source edits verified verbatim against the plan's tasks, `pnpm prism:build`/`pnpm prism:check` re-run clean, 5 of 8 AC evidence commands independently re-verified). Found one Major finding: PR #459's live GitHub description is a broken local-scratchpad-path string, not the intended summary — see `## Review Issues`.
- 2026-09-08 [huntermcgrew/reviewer-scope-bookkeeping-rule]: Clove fixed the one open Review Issue — `gh pr edit 459 --body-file` replaced the broken PR description with the real summary, re-verified against a direct API read; no source edits needed. `pnpm prism:check` re-run clean.
- 2026-09-08 [huntermcgrew/reviewer-scope-bookkeeping-rule]: Briar ran self-review pass 2 over the same source diff (unchanged since pass 1) — full diff re-read, `pnpm prism:build` (900/901, 1 skipped, 0 fail, no drift) and `pnpm prism:check` re-run clean, AC-2/AC-3/AC-5/AC-8 independently re-verified. Zero new findings.
- 2026-09-08 [huntermcgrew/reviewer-scope-bookkeeping-rule]: Eric PR-reviewed #459 (pass 1) and filed three bookkeeping-only Minors, gating normally under this PR's own new rule; Clove fixed all three — capped Eric's decision-gate confidence label for the bookkeeping-minor path, narrowed task 4's "must not survive" invariant to the restated list, and corrected the QA report's AC-4 coverage claim. `pnpm prism:build` (900/901, 1 skipped) and `pnpm prism:check` both exit 0.
- 2026-09-08 [huntermcgrew/reviewer-scope-bookkeeping-rule]: Eric PR-reviewed #459 (pass 2) and filed three Minors, two gating (the decision gate's pass-bounded/bookkeeping-only ready-flip contradiction; `followup-scope.md`'s stale "same scope" claim) and one bookkeeping-only (two stale AC Observed values); Clove fixed all three, adding a precedence clause rather than a fourth case per Eric's suggested fix. `pnpm prism:build` (901 tests, 900 pass, 0 fail, 1 skipped) and `pnpm prism:check` both exit 0.
- 2026-09-08 [huntermcgrew/reviewer-scope-bookkeeping-rule]: Reese re-graded all eight AC at SHA `f748499c` (after Eric's two PR-review passes) — 8 MET, 0 UNMET, 0 UNGRADEABLE; report at `.prism/qa/ac-verification-reviewer-scope-bookkeeping.md`. AC-1's and AC-3's human Evidence halves stay listed there as awaiting-human-verification and are excluded from those counts. Two probe values moved without moving a verdict; both are recorded as side observations in the report.
- 2026-09-08 [huntermcgrew/reviewer-scope-bookkeeping-rule]: Eric PR-reviewed #459 (pass 3) and filed one gating Minor (the bookkeeping classifier is vacuously true for a finding citing zero repo lines) and one bookkeeping-only Minor (the readiness checklist's clean-`prism:check` claim omits the inherited windows-latest CI failure); Clove fixed both — added the empty-set clause to `followup-scope.md:86` and the inherited-failure note to the plan's `## PR Readiness`. `pnpm prism:build` (901 tests, 900 pass, 0 fail, 1 skipped) and `pnpm prism:check` both exit 0.
- 2026-09-08 [huntermcgrew/reviewer-scope-bookkeeping-rule]: Briar ran self-review pass 3 — full `gh pr diff` re-read, `pnpm prism:check` re-run clean in the worktree (901 tests, 900 pass, 0 fail, 1 skipped). Found two issues: a Major (Eric's pass-3 fixes and this plan's own pass-3 entries were never committed or pushed — `git log` shows no commit past the pre-pass-3 Reese re-grade, so the live PR on GitHub does not contain them) and a Minor (two of this PR's new `followup-scope.md` citations use a markdown link whose relative depth breaks in the 2-level-deep `.claude/agents/` and `.codex/agents/` mirrors, missed by pass 2 via a false claim about `crossref-lint`'s coverage).
- 2026-09-08 [huntermcgrew/reviewer-scope-bookkeeping-rule]: Clove fixed both open self-review pass-3 findings — committed and pushed the previously-uncommitted `followup-scope.md` empty-set-clause fix (source + four mirrors + `AGENTS.md`), and dropped the markdown-link brackets on all three bracketed `followup-scope.md` citations in `prism-code-review-pr/shared.md` plus the one in `prism-code-review-self/shared.md` (the finding named two lines; a third carried the identical defect). `pnpm prism:build` (901 tests, 900 pass, 0 fail, 1 skipped) and `pnpm prism:check` both exit 0.

---

## Review Issues

### No issues found — 2026-09-08 (pass 2)

### PR #459 description is a broken file-path string, not content

- **Severity:** `major`
- **Status:** `fixed`
- **File:** GitHub PR #459 description (not a repo file — `gh api repos/HunterMcGrew/PRISM/pulls/459 --jq .body` returns the literal string, confirmed against the API directly, not just the `gh pr view` rendering)
- **Problem:** The PR body is the literal text `@C:\Users\hunte\AppData\Local\Temp\claude\...\scratchpad\pr459-body.md` — a local scratchpad path, not the intended summary. A real summary exists in that local file (Summary, bullet list of the four source edits, known-limitation note) but never reached GitHub, almost certainly because the PR was created with `gh pr create --body "@<path>"` rather than `--body-file <path>` (`gh` does not expand `@file` inside `--body` the way some shells' own `@file` conventions might suggest). Spot-checked PRs #456–#458 and found normal bodies, so this looks isolated to #459, not a systemic tooling break.
- **Suggested fix:** `gh pr edit 459 --body-file <path-to-the-real-summary>` (the local scratchpad file already has the correct content) to replace the body before merge — GitHub's squash-merge dialog offers the PR body as the default commit body, so an unfixed body ships into `main`'s permanent history for this change.
- **Fixed in:** `gh pr edit 459 --body-file <scratchpad>/pr459-body.md`, re-verified via `gh api repos/HunterMcGrew/PRISM/pulls/459 --jq .body` (direct API read, not `gh pr view` rendering) — body now reads the real Summary/edit-list/test-plan content.

### Eric decision gate's confidence label doesn't cover the bookkeeping-only-minor path (PR-review pass 1)

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `.ai-skills/skills/prism-code-review-pr/shared.md:269-274`
- **Problem:** State #3's entry condition was widened to admit bookkeeping-only minors, but the confidence-label sub-branch beneath it wasn't — a pass arriving via that path had no honest label (`confidence:high` implies both axes came back clean while a Minor still stands). The file already settles the same principle for pass-bounded angles at line 274.
- **Suggested fix:** extend the existing pass-bounded cap to also cover an unaddressed bookkeeping-only Minor, capping the label to `confidence:needs-judgment` while letting the ready-flip still fire (the bookkeeping exemption's whole point).
- **Fixed in:** added a paragraph after the pass-bounded cap that caps `confidence:needs-judgment` for the bookkeeping-minor path while preserving the ready-flip. https://github.com/HunterMcGrew/PRISM/pull/459#discussion_r3955258848

### Plan task 4's "must not survive anywhere" invariant contradicts its own prescribed replacement text (PR-review pass 1)

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `.prism/plans/reviewer-scope-bookkeeping.md:126`
- **Problem:** Task 4 said all six bookkeeping section names must not survive anywhere in the review-loop file, but the replacement text prescribed directly above it in the same task contains `## PR Readiness`; the merged file correctly returns `1` for that probe (Clove implemented the text verbatim). AC-4 greps only `## Cleanup Items` today so nothing is broken, but a side note in the QA report recommending a wider probe would walk the next reader into a red AC against correct code.
- **Suggested fix:** narrow the invariant to the restated *list*, not every individual mention of a name.
- **Fixed in:** reworded the sentence to scope "must not survive" to the six-name restated list and note that the bullet's one individual `## PR Readiness` mention is citation-consistent prose, not that list. https://github.com/HunterMcGrew/PRISM/pull/459#discussion_r3955257468

### QA report's AC-4 coverage claim overstates what was probed (PR-review pass 1)

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `.prism/qa/ac-verification-reviewer-scope-bookkeeping.md:137`
- **Problem:** "All six bookkeeping section names were probed" was followed by an enumeration of only five; the unnamed sixth, `## PR Readiness`, returns `1`, not `0`. AC-4's verdict itself is correct and unaffected — the defect is the coverage claim wrapping it, per `writing-voice.md` § Anti-pattern: Reassurance that introduces a new claim.
- **Suggested fix:** state what actually ran — five names return `0`; `## PR Readiness` returns `1` by design, as a reference mention rather than the restated list.
- **Fixed in:** reworded the sentence to state the five-of-six probe accurately and explain the `## PR Readiness` exception. https://github.com/HunterMcGrew/PRISM/pull/459#discussion_r3955257946

### Eric's pass-bounded and bookkeeping-only caps give opposite ready-flip answers where they overlap (PR-review pass 2)

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `.ai-skills/skills/prism-code-review-pr/shared.md:274,276`
- **Problem:** Line 274 says the ready-flip does not fire while any angle is pass-bounded; line 276 says the ready-flip still fires when state #3 is reached only via bookkeeping-only minors. Both antecedents can hold at once — a pass-bounded angle is an unfinished check, not a finding, so it doesn't change which state a pass lands in — and the two lines then disagree on the same PR.
- **Suggested fix:** state the precedence on line 276 rather than adding a fourth case: the ready-flip still fires for the bookkeeping-only path unless a pass-bounded angle also stands, in which case the cap above governs.
- **Fixed in:** added the precedence clause to line 276 — the ready-flip still fires "provided no angle remains pass-bounded," and a trailing sentence states that when one does, the pass-bounded cap takes precedence and the flip does not fire. https://github.com/HunterMcGrew/PRISM/pull/459#discussion_r3955465884

### `followup-scope.md`'s review-loop citation claims "the same scope" the PR #489 merge made false (PR-review pass 2)

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `.prism/rules/followup-scope.md:101`
- **Problem:** The bullet said the loop "carries a stricter disposition on the same scope" as this rule's bookkeeping-content set — true at `3f37e651`, before the merge folded in main's two loop-local Ledger additions (the PR body and the readiness line the loop emits). The loop's own Ledger is now this rule's set plus two, so the scope-equality claim is stale.
- **Suggested fix:** drop the scope-equality claim, keep the disposition contrast, and name the two loop-local additions.
- **Fixed in:** reworded the bullet to state the disposition without claiming equal scope, and to name the PR body and the readiness line as the loop's two additions. https://github.com/HunterMcGrew/PRISM/pull/459#discussion_r3955465907

### Two AC `Observed` values no longer reproduce (bookkeeping-only — recorded, does not gate) (PR-review pass 2)

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `.prism/plans/reviewer-scope-bookkeeping.md:139,161`
- **Problem:** AC-7's Observed value read `668/668 tests pass`; `pnpm prism:build`'s `prism:test` leg now reports `901 tests, 900 pass, 0 fail, 1 skipped` (the exit code the criterion actually grades is still `0`, so the verdict is unaffected). AC-1's Observed value read `3`; the probe now returns `4`, because this same PR's pass-1 review fix added a fourth `bookkeeping-only` occurrence to the file being grepped. Both cited lines are AC `Evidence` sub-bullets, which this PR's own new rule places in bookkeeping content — recorded, not gating.
- **Suggested fix:** update both Observed values to the reproducing numbers; neither criterion's verdict changes.
- **Fixed in:** AC-7's Observed now reads `901 tests, 900 pass, 0 fail, 1 skipped`; AC-1's Observed now reads `4` with a note that the fourth occurrence is the pass-1 precedence-clause fix. Both re-verified independently by re-running the cited commands against the current tree. https://github.com/HunterMcGrew/PRISM/pull/459#discussion_r3955465924

### Bookkeeping classifier is vacuously true for a finding citing zero repo lines (PR-review pass 3)

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `.prism/rules/followup-scope.md:86`
- **Problem:** "Every `**File:** <path>:<line>` it cites lands in bookkeeping content" holds vacuously for a finding that cites no repo line at all, flipping such findings to non-gating — the opposite of this plan's own Decision ("Out of scope: commit-message findings... cites no file line and is not covered"). This plan's own `## Review Issues` entry for the broken PR #459 description (its **File:** field names a non-repo location) is the live instance; it gated only because it was graded Major, not because the classifier caught it. The gap also undercuts the guard sentence two clauses later, which claims downgrading a real defect requires misstating a path — at the empty set, no misstatement is needed.
- **Suggested fix:** append one clause after "gates normally" stating that a finding citing no repo line at all is likewise not bookkeeping-only.
- **Fixed in:** added the clause to `.prism/rules/followup-scope.md:86`. https://github.com/HunterMcGrew/PRISM/pull/459#discussion_r3955637504

### `## PR Readiness` claims a clean `prism:check` without flagging the inherited CI failure (bookkeeping-only — recorded, does not gate) (PR-review pass 3)

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `.prism/plans/reviewer-scope-bookkeeping.md:280,161`
- **Problem:** The readiness checklist and AC-7's Evidence both record a clean local `pnpm prism:check` exit 0, while `prism-check (windows-latest)` is red on this PR's own CI at head `f748499c` on test 346 — local-vs-CI, not a false claim. The failure is inherited from `main` at `972c7757` (PRISM-488's git gates), not caused by this PR; `ubuntu-latest` is green on both.
- **Suggested fix:** append to line 280 that `prism-check (windows-latest)` is red at head, inherited from `main`, and green on `ubuntu-latest`.
- **Fixed in:** appended the inherited-CI-failure note to `## PR Readiness` at line 280. https://github.com/HunterMcGrew/PRISM/pull/459#discussion_r3955643422

### Eric's pass-3 fixes and this plan's own pass-3 narration were never committed or pushed (self-review pass 3)

- **Severity:** `major`
- **Status:** `fixed`
- **File:** not a diff line — a git-state gap. `git log --oneline --all -- '*reviewer-scope-bookkeeping*'` shows no commit after `d374a282` ("Reese AC re-grade... at f748499c"); `git log --oneline --all --grep='pass-3|pass 3' -iE` returns nothing. `git status -s` in this worktree shows `.prism/rules/followup-scope.md`, its four mirrors (`.claude/`, `.codex/`, `.cursor/`, `templates/install/`), `AGENTS.md`, and this plan file all uncommitted.
- **Problem:** This plan's own `## Review Issues` and `## History` record two Eric PR-review pass-3 findings as `fixed`, each with a real `github.com/.../pull/459#discussion_r...` link — meaning Eric's pass-3 review comments are genuinely live on the PR. But the fix commits never happened: the branch's actual tip (`origin/huntermcgrew/reviewer-scope-bookkeeping-rule` at `d374a282`, one commit ahead of my local checkout) is the Reese AC-re-grade commit made *before* Eric's pass-3 review ran, and no commit anywhere in local or remote history touches `followup-scope.md` after it. The pass-3 fix content — the classifier's empty-set clause and the plan's own pass-3 History/Review-Issues/PR-Readiness entries — exists only as uncommitted changes in this one worktree. `gh pr diff 459`, GitHub's file view, CI, and any other reviewer or session all see the PR without these fixes. If this branch merges as it stands on GitHub right now, Eric's two pass-3 findings silently regress to unfixed, contradicting the plan's own "Status: fixed" record — the exact failure `.prism/rules/git-conventions.md § When to Commit` warns about ("A handoff that leaves work uncommitted hands over a branch that misstates its own state").
- **Suggested fix:** commit the uncommitted working-tree changes (verify they match the fixes the plan already describes before committing — I did not re-verify their content, only their absence from history) as a `PRISM-459 followup: Fix Eric's PR-review pass-3 findings` commit, then push. This is source-file work outside a reviewer's plan-only-commit lane (`branch-plan.md § Landing a plan-only commit`) — routing to Clove.
- **Fixed in:** verified the uncommitted `followup-scope.md` empty-set clause (source + four mirrors + `AGENTS.md`) matched Eric's discussion `r3955637504` suggestion verbatim before committing; the plan's own pass-3 narration (including the `## PR Readiness` CI note) had already landed via Briar's plan-only commit `00f8553e`, so only the source diff needed committing. Committed and pushed.

### Two of this PR's three new `followup-scope.md` citations use a markdown link that breaks in the 2-level-deep agent mirrors (self-review pass 3)

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `.ai-skills/skills/prism-code-review-pr/shared.md:269` and `.ai-skills/skills/prism-code-review-self/shared.md:291` (source); manifests as broken links at `.claude/agents/prism-code-review-pr.md:296`, `.claude/agents/prism-code-review-self.md:316`, `.codex/agents/prism-code-review-pr.toml:297,304,332`, `.codex/agents/prism-code-review-self.toml:317`
- **Problem:** Task 2 and task 3 cite `.prism/rules/followup-scope.md` as `[`.prism/rules/followup-scope.md`](../../../.prism/rules/followup-scope.md)`. Three `..` is correct from the 3-level-deep canonical `.ai-skills/skills/<id>/shared.md` (and its 3-level-deep `.claude/skills/`, `.cursor/skills/` mirrors), but the build copies the same link text verbatim into the 2-level-deep `.claude/agents/*.md` and `.codex/agents/*.toml` mirrors, where three `..` overshoots the repo root by one level and resolves nowhere. Pass 2's Citation integrity sweep examined exactly this pattern and cleared it, reasoning that "`crossref-lint` exercises exactly this class of citation and passed at exit 0, so not flagged" — but `crossref-lint` explicitly skips relative links by design (confirmed by direct read of `.prism/architect/_toolkit/install-layout.md` § Cross-reference lint: "Relative links (`../` and `./`) are deliberately skipped"), so that exit-0 result carries no signal on this class of link and the pass 2 verdict rested on a false premise. The identical wrong-depth pattern already exists, pre-existing and unrelated to this diff, at `.claude/agents/prism-code-review-pr.md:329` (the `report-back.md` citation) — this is a systemic gap in how the build renders one relative-link depth into destinations of different depths, not something this PR invented, but this PR's two new citations are new instances of it and task 4's sibling edit (the review-loop's Ledger bullet) already shows the fix within reach.
- **Suggested fix:** drop the markdown-link brackets from the two new citations in `.ai-skills/skills/prism-code-review-pr/shared.md` and `.ai-skills/skills/prism-code-review-self/shared.md` — cite as plain inline code + prose (`` `.prism/rules/followup-scope.md` § Bookkeeping findings are recorded, not gated ``), matching the link-free style task 4 already uses for the review-loop's Ledger bullet. This is a within-scope wording change — no generator work, no touching the pre-existing `report-back.md` citation — and it renders correctly at every mirror depth once rebuilt.
- **Fixed in:** dropped the markdown-link brackets on all three bracketed occurrences in `.ai-skills/skills/prism-code-review-pr/shared.md` (lines 269, 276, 304 — the finding named 269 but 276 carried the identical defect and is fixed too) and the one occurrence in `.ai-skills/skills/prism-code-review-self/shared.md` (line 291), replacing each with plain inline code + prose. Left the pre-existing unrelated instance in `prism-ticket-start/shared.md` untouched (out of scope). `pnpm prism:build` regenerated all mirrors; `grep` confirms no bracketed `followup-scope.md` link remains in either agent mirror at any depth.

---

## Cleanup Items

---

## PR Readiness

- [x] No critical or major issues — the earlier major (PR #459 description) is fixed; Eric's PR-review passes 1-3 found eight Minors, all fixed on disk; Briar's self-review pass 3 found one Major (pass-3's source fixes and plan narration uncommitted/unpushed) and one Minor (broken relative links in two generated agent mirrors), both now fixed and committed — see `## Review Issues`
- [x] `pnpm prism:check` passes — last run: 2026-09-08 (re-run by Clove after committing the pass-3 source fix and fixing the broken-link Minor, from a clean tree after `pnpm prism:build`, 901 tests/900 pass/0 fail/1 skipped, exit 0). `prism-check (windows-latest)` was red on this PR's CI at head `f748499c`, on test 346, inherited from `main` at `972c7757` (PRISM-488) — not this PR's defect; `prism-check (ubuntu-latest)` was green. Status at the new head has not been re-checked against CI as of this write.
- [x] All eight AC evidence commands executed with observed values recorded — all 8 independently re-run across pass 1 and pass 2 by Briar and confirmed matching (AC-1, AC-4, AC-6, AC-8 in pass 1; AC-2, AC-3, AC-5, AC-8 again in pass 2)
- [x] PR description up to date — fixed via `gh pr edit`, see `## Review Issues`
- [ ] Lasting decisions promoted to architect context (if applicable) — deferred to plan close per `branch-plan.md § Before Closing`; this plan is unfiled and not yet closed

**Last updated:** 2026-09-08

### Angle Coverage (pass 2)

- Runtime behavior — swept — 4 items enumerated, 4 verdicts (Eric's state #2/#3 qualifier logic; Briar/Eric's Sol verdict widening; the review-loop's Ledger citation; the new `followup-scope.md` section's classifier logic — all correct, no gap between the stated condition and the prose; unchanged from pass 1 since the source diff did not move)
- Test efficacy — swept — 8 items enumerated, 8 verdicts (`pnpm prism:build` re-run from a clean tree: 900/901, 1 skipped, 0 fail, no post-build drift; `pnpm prism:check` exit 0; AC-2, AC-3, AC-5, and AC-8 independently re-verified this pass — the remaining four (AC-1, AC-4, AC-6, AC-7) already independently re-verified in pass 1, together covering all 8)
- Spec and doc consistency — swept — 8 items enumerated, 8 verdicts (all 8 AC criteria re-checked against the current diff, all MET; plan `## Decisions` cross-checked against the diff for drift, none found, including the re-landing Decision's claim that main's PR-body/readiness-line additions survived the merge)
- Citation integrity — swept — 8 items enumerated, 8 verdicts (the `../../../.prism/rules/followup-scope.md` relative-path citations resolve correctly from the 3-level-deep skill mirrors; the same prefix appears in the 2-level-deep `.claude/agents/` and `.codex/agents/` mirrors on pre-existing unchanged context in the same paragraph — not introduced by this diff — and `crossref-lint` exercises exactly this class of citation and passed at exit 0, so not flagged; both `§ Bookkeeping findings are recorded, not gated` heading citations match the actual heading)
- External-system claims — n/a — no framework, library, API, or platform behavior is asserted anywhere in this diff; it is entirely internal spec prose
- Repo writing rules — swept — verdict-only (re-checked the new section's prose against `.prism/architect/guides/writing-a-rule.md`, read fresh this pass: onboarding voice, no mandate prefixes, why-before-how, plain language, count-rules-not-numbers — no violations)
- Security — n/a — no auth, input handling, secrets, permissions, or trust boundary in this diff
- Docs impact — n/a — no `docs/` page covers this topic; unchanged from pass 1
- Accessibility — n/a — no UI in this diff

### Angle Coverage (pass 3)

- Runtime behavior — swept — 4 items enumerated, 4 verdicts (Eric's state #2/#3 qualifier logic including the pass-2 and pass-3 precedence/empty-set clauses; Briar/Eric's Sol verdict widening; the review-loop's Ledger citation; the new `followup-scope.md` section's classifier logic, including the pass-3 empty-set clause — all correct, no gap between the stated condition and the prose)
- Test efficacy — swept — 1 item enumerated, 1 verdict (`pnpm prism:check` re-run from a clean tree this pass: 901 tests, 900 pass, 0 fail, 1 skipped, exit 0; no drift)
- Spec and doc consistency — swept — 1 item enumerated, 1 verdict (the plan's `## Decisions` and `## Implementation Tasks` re-checked against the current diff for drift, none found)
- Citation integrity — swept — 1 item enumerated, 1 verdict, **gap found**: the `../../../.prism/rules/followup-scope.md` links in the two decision-gate source files resolve correctly at their own 3-level-deep location, but the same link text renders as a broken (one-level-too-deep) relative path in the 2-level-deep `.claude/agents/*.md` and `.codex/agents/*.toml` mirrors — see `## Review Issues`. Independently re-verified `crossref-lint`'s actual scope by reading `.prism/architect/_toolkit/install-layout.md` § Cross-reference lint directly rather than trusting pass 2's characterization of it; the doc states relative links are deliberately skipped, which pass 2 did not check before citing the tool's exit code as clearance.
- External-system claims — n/a — no framework, library, API, or platform behavior is asserted anywhere in this diff; it is entirely internal spec prose
- Repo writing rules — swept — verdict-only (re-checked the new finding's own prose against `.prism/architect/guides/writing-a-rule.md` conventions carried over from pass 2 — no violations)
- Security — n/a — no auth, input handling, secrets, permissions, or trust boundary in this diff
- Docs impact — n/a — no `docs/` page covers this topic; unchanged from prior passes
- Accessibility — n/a — no UI in this diff
