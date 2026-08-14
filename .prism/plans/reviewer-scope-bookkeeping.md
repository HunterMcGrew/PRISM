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

   The six section names (`## Review Issues`, `## History`, `## Sessions`, `## Debugged Issues`, `## Cleanup Items`, `## PR Readiness`) must **not** survive anywhere in this file — that removal is what AC-4 checks. Leave the `| Ledger |` row in the Disposition table unchanged. Sequence: after task 1.

5. **Regenerate mirrors and verify.** Run `pnpm prism:build` (regenerates `.claude/`, `.codex/`, `.cursor/`, and `templates/install/.prism/` from the canonical sources, then runs `pnpm prism:test`), then `pnpm prism:check` — expect exit 0. `prism:check` includes `prism:crossref-lint` (validates the two new `§ Bookkeeping findings are recorded, not gated` cross-references) and `prism:spec-scope-lint` (the four changed discriminators — `followup-scope.md`, `prism-code-review-pr`, `prism-code-review-self`, `prism-review-loop` — are each named in `## Implementation Tasks` above, outside every bookkeeping section, so the lint passes). Then run every AC evidence command below and record the observed value beside each. Sequence: last.

---

## Acceptance Criteria

Baselines measured on `main` at `93434232`, 2026-08-14. Each probe counts occurrences with `grep -o … | wc -l`, never `grep -c`, per `.prism/lessons.md` § AC evidence commands are code.

### Behavioral

- [x] **AC-1** Given a reviewer has only findings about a plan's own history, session, or readiness prose, When they finish the pass, Then the pull request is not held open for those findings alone.
  - *Evidence (machine):* `grep -o 'bookkeeping-only' .ai-skills/skills/prism-code-review-pr/shared.md | wc -l` → `≥ 3` (baseline today: `0`; task 2 lands one occurrence in state #2 and one in state #3, task 3 lands a third in the verdict paragraph of the same file). Positive control: the same probe against `.prism/rules/followup-scope.md` returns `≥ 1`, proving the pattern matches. · UNMET looks like: `0`, meaning the decision gate never learned the exemption. **Observed:** `3` (positive control `3`) — MET.
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
  - *Evidence (machine):* `pnpm prism:check` → exit `0`. · UNMET looks like: non-zero exit, most likely `build --check` reporting seed or platform drift because task 5's `pnpm prism:build` was skipped, or `crossref-lint` failing on a section anchor that does not resolve. **Observed:** exit `0` (668/668 tests pass, crossref-lint/spec-scope-lint/verify-pack-parity all pass) — MET.

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

---

## History

- 2026-08-14 [huntermcgrew/opus5-port-lint-resolution]: Winston scoped the rule after PR #458 spent three review rounds on plan prose. Found the review-loop's Ledger surface already covers most of the section set but is loop-only and puts AC evidence in Subject; see Decision: the mechanism is Eric's three-state decision gate.
- 2026-08-14 [huntermcgrew/reviewer-scope-bookkeeping-rule]: Clove implemented tasks 1-5 verbatim — the bookkeeping-findings exemption in `followup-scope.md`, Eric's and Briar's decision-gate qualifiers, and the review-loop's Ledger re-point to citation. `pnpm prism:build` (668/668 tests) and `pnpm prism:check` both exit 0; all eight AC evidence commands recorded MET.

---

## Review Issues

---

## Cleanup Items

---

## PR Readiness

- [x] No critical or major issues
- [x] `pnpm prism:check` passes — last run: 2026-08-14
- [x] All eight AC evidence commands executed with observed values recorded
- [ ] PR description up to date
- [ ] Lasting decisions promoted to architect context (if applicable) — deferred to plan close per `branch-plan.md § Before Closing`; this plan is unfiled and not yet closed

**Last updated:** 2026-08-14
