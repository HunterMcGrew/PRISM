# PR 3 redesign — proposal

> **Status:** proposal, not plan content. Sol folds this into `.prism/plans/opus5-port.md`
> § Implementation Tasks, § Decisions, and § Deferred once PR #470 lands. Written to a
> separate file because #470's branch holds an open lane on the plan file.
>
> **Supersedes** `opus5-port.md` § Implementation Tasks → `### PR 3 — Shared core and roster
> slimming` (tasks 20–29) and the § Deferred row reading *"the nine-angle review battery and
> Briar's file-slice fan-out (`_shared/review-angles.md`)"*.

---

## Goal

Carry Hunter's 2026-08-20 direction into PR 3: cut persona flavor prose the model does not
need, keep the repo-specific instructions it cannot infer, stop reviewers spending passes on
plan hygiene, and give the reviewers the angle-coverage table the portable roster already
runs.

---

## Sessions

- 2026-08-20 [pr3-replan, dispatched by Sol under run `architect-gate-port`]
  - **Intent** — replace PR 3's task list with one that carries Hunter's slimming direction,
    hand back a deletion criterion an implementer can execute without guessing, and cut the
    PR at reviewable boundaries.
  - **Ambiguity** — none load-bearing; assuming "the less the better" governs *persona
    flavor*, not the repo-specific instruction layer, since Hunter named branch plans,
    `manifest.json`, and cross-skill knowledge as keepers in the same breath.
  - **Bounds** — done = this proposal file, with task dispositions, a criterion, the Pixel
    call, and cut lines. Untouchable = `.prism/plans/opus5-port.md`, all source, all skill
    bodies.
  - **Approach** — read the portable roster as measured evidence rather than as a target
    shape, then reconcile Hunter's fourth question against the existing reversal list before
    writing a single task.
  - **Close** — scope held. One thing decided that the brief did not ask for and did not
    forbid: the persona-prose deletion is a *new* task, because tasks 20–29 never contained
    one — the existing list slims batteries, run-order lists, and DoD blocks, none of which
    is the surface Hunter described. Named as task N3 rather than folded silently into
    task 24. Edge recall: an empty roster and a skill with no `## Personality` section both
    fall out of task N3's per-file table as `n/a — no flavor block`, which is a legal row.

- 2026-08-20 [pr3-replan, reshape pass]
  - **Intent** — carry Hunter's two rulings into the proposal: two PRs instead of four, and
    keep Pixel's catalogs with the A/B declined rather than pending.
  - **Ambiguity** — none load-bearing; assuming "cut the prose as much as possible" is a
    standing roster-wide instruction that strengthens the foreclosure test's *keep*
    disposition, not a second deletion criterion competing with it.
  - **Bounds** — done = the same proposal file reshaped. Untouchable = `opus5-port.md`, all
    source, all skill bodies. Task *content* does not change; task *packaging* does.
  - **Approach** — accept the merge, then spend the reshape on the thing the merge costs:
    commit boundaries inside 3B, since that is the only review and rollback structure left
    once the PR boundary is gone.
  - **Close** — scope held. Two things decided beyond the ruling: mirrors move to their own
    terminal commit (the largest single lever on the 150–200-file risk), and the foreclosure
    table is reviewed per-commit rather than as one PR-body wall. Both are answers to risks
    Sol named rather than new scope. One place I push back in writing rather than silently:
    § Where the stronger prose rule over-fires names three block classes where "the sentence
    is the block" produces a worse artifact, one of which is Hunter's own Pixel ruling.

---

- 2026-08-20 [huntermcgrew/opus5-port-3a-reviewer-scope, dispatched by Sol under run `architect-gate-port`]
  - **Intent** — ship PR 3A: the narrower reviewer plan-file scope and the ported nine-angle
    coverage table, wired into Briar and Eric.
  - **Ambiguity** — none load-bearing; assuming 3A's commits may carry regenerated mirrors,
    since the mirror-terminal-commit rule is scoped to 3B by the § 3B accepted-risks Decision.
  - **Bounds** — done = `review-angles.md` exists and mirrors, both reviewer bodies and
    `branch-plan.md` carry the new scope rule, 28a applied, build + check green, draft PR open.
    Untouchable = `.prism/plans/opus5-port.md`, the deny-gate branch, every 3B task.
  - **Close** — scope held, with one deviation recorded as a Decision below: task 28a's `Meta`
    severity token was not added, because the target section states in its own text that no new
    taxonomy vocabulary goes in that file. 28a's substance shipped without the token. Two things
    decided that the task did not name: the `## Angle Coverage` section was added to
    `code-review-pr/summary-template.md` (Eric's summary comment is assembled from that template,
    so requiring the block in the body without a template slot would have left the requirement
    unreachable), and `templates/install/.prism/rules/branch-plan.md` was hand-edited, since
    `branch-plan.md` is a `curated` seed twin that does not regenerate. Edge recall: a clean pass
    still emits all nine angle statuses, and `n/a` on an always-on angle is a legal status — both
    are stated in the fragment rather than left to the reviewer. The § Deferred row in
    `opus5-port.md` was left untouched; PR #470 is open and carries that file.

- 2026-08-21 [huntermcgrew/opus5-port-3a-reviewer-scope, Briar dispatched by Sol under run
  `architect-gate-port`, lane 3a]
  - **Intent** — self-review PR #471 against the § PR 3A spec, weighted toward deletion
    completeness across the whole tree and toward whether the written `review-angles.md` would
    reproduce the coverage table I have been emitting from a briefing.
  - **Ambiguity** — none load-bearing; assuming task N1's *"Register in
    `seed-curation.json` as non-curated"* means an entry in the `mirrored` bucket rather than
    an absent entry, since `mirrored`'s own contract is "ships, byte-identical" and
    `opus5-port.md` C7 forbids the unclassified state.
  - **Bounds** — done = findings in chat plus `## Review Issues` with the nine-angle coverage
    block, and a plan-only commit. Untouchable = every file under review (Clove fixes),
    `.claude/worktrees/agent-a507b79a93c90415f`, the `opus5-port-deny-gate` branch, and
    `.prism/plans/opus5-port.md` § Deferred, which Sol lands.
  - **Close** — scope held. One process slip owned rather than buried: I ran the opening
    battery after the setup batch instead of before it, so the bullets above were written from
    the finished sweep rather than ahead of it; the Bounds did not move, but the ordering
    guarantee did not hold this run. Silent decisions named: I treated `.prism/plans/`
    (`iris-cadence-starvation.md:324`, `epic-prism-thrive-backport-wave-2.md:136`) as
    historical record rather than surviving mandates — both are `> Closed:`, and the new
    § Plan-file scope is itself the rule saying a closed plan's stale AC is not a finding; and
    I did not flag `../../../` link depth in `.claude/agents/` and `.codex/agents/` because
    that shape pre-dates this diff at 16 other sites in the same file. Edge recall: a clean
    pass and a bounded angle both still emit all nine statuses, and `n/a` on the two triggered
    angles here (Security, Accessibility) is a legal status with its reason named, not a
    skipped check. Verification honesty: `pnpm prism:build` and `pnpm prism:check` re-run by me
    at exit 0 with a clean tree afterwards, and task N2's negative grep probe re-run with its
    positive control; the four Major findings are read from file content, not inferred — each
    carries the literal search that produced it.

- 2026-08-21 [huntermcgrew/opus5-port-3a-reviewer-scope, dispatched by Sol under run `architect-gate-port`]
  - **Intent** — close Briar's six findings on PR #471 so the reviewer-scope port stops citing
    mechanisms that do not exist and the new reference file is declared rather than defaulted.
  - **Ambiguity** — none load-bearing; assuming the cleaner path is mine to judge and declining
    it, since Sol asked for the judgement rather than the fold.
  - **Bounds** — done = six findings fixed in canonical files, mirrors regenerated, build and
    check green, PR still draft. Untouchable = `.prism/plans/opus5-port.md`, the deny-gate branch
    and its worktree, every 3B task.
  - **Approach** — canonical-only edits, one build to regenerate all mirrors, and verify each
    finding's claim at source before applying its fix rather than after.
  - **Close** — scope held. One deviation from the brief, recorded as a Decision: Major 3's
    direction half is not upheld, and the rewrite fixes the scope error instead. Two silent
    decisions worth naming: Eric's copy of the *"Fix it inline"* sentence is left alone, which
    the finding offered as its second option, and the `Meta` replacement sentence names
    `prism-review-loop` in prose rather than linking it, because the loop's file name differs
    across generated layouts and a relative link would not resolve in all five. Edge recall: the
    `mirrored` registration is byte-neutral by construction, so the evidence that it worked is
    the unchanged twin hash rather than a diff — all five buckets hash `9d276415` before and
    after.

- 2026-08-21 [huntermcgrew/opus5-port-3a-reviewer-scope, Briar dispatched by Sol under run
  `architect-gate-port`, lane 3a, re-review]
  - **Intent** — re-review the pinned range `176f35c5..8c82764f` at full bar and settle the one
    judgment Sol reserved: whether round-1 Major 3's direction half was correctly rejected.
  - **Ambiguity** — none load-bearing; assuming "confirm or overturn" asks whether `below`
    resolves for a cold reader, not whether the rewrite is an improvement — it is one either way.
  - **Bounds** — done = verdict on Major 3 recorded, range swept at full bar, `## Review Issues`
    plus a round-2 `### Angle Coverage` block written, plan-only commit landed. Untouchable =
    every file under review, `.claude/worktrees/agent-a507b79a93c90415f`, the deny-gate branch,
    `.prism/plans/opus5-port.md`.
  - **Approach** — verify clove's two flagged claims at source before accepting either, and read
    the two Ledger references in the order a cold reader hits them rather than in the order I hit
    them last pass.
  - **Close** — scope held. I overturned my own round-1 finding: `below` resolved correctly, and
    both the word *row* and the paraphrased cell text point at the Disposition table. Two silent
    decisions named: I graded the new bounded-angle finding Major rather than Minor because
    Eric's own lightweight path mandates three bounded angles on every docs-only PR, so it fires
    by construction rather than occasionally; and I did not file the `skills-ecosystem.md`
    omission, because the plan's cut table assigns that file to task 29 in PR 3B. One place I
    went past clove's stated evidence rather than accepting it: `unclassifiedMirrored` warns only
    when `seedFileIsNew` (`build.ts:816`, `:859`), so the build-time warning fires once and is
    silent forever after — the registration is still correct, but the warning is not what makes
    it correct. Edge recall: a clean pass and a bounded angle both still emit all nine statuses;
    `n/a` on the two triggered angles here is a legal status with its reason named. Verification
    honesty: `pnpm prism:build` and `pnpm prism:check` re-run by me at exit 0 with a clean tree
    afterwards; the platform question answered empirically by `gh pr checks 471` (both legs pass)
    rather than by reasoning about line endings; the new Major read from file content at head,
    with the literal searches that produced it recorded in its `Sweep`.

- 2026-08-21 [huntermcgrew/opus5-port-3a-reviewer-scope, dispatched by Sol under run
  `architect-gate-port`, lane 3a]
  - **Intent** — close the bounded-angle verdict gap on both reviewer surfaces, and give
    `review-angles.md` a durable home for Hunter's sweep-before-report instruction.
  - **Ambiguity** — none load-bearing; taking § Reporting as the home for the completeness
    clause rather than a new section, since that section already owns reporting obligations and
    sits directly above § Re-sweep obligation, which owns the after-a-fix half.
  - **Bounds** — done = three clauses in canonical files, mirrors regenerated, build and check
    green, PR still draft. Untouchable = `.prism/plans/opus5-port.md`, the deny-gate branch and
    its worktree, every 3B task.
  - **Approach** — canonical-only edits, one build for all mirrors, and settle the consumer-facing
    citation question by precedent before writing PR numbers into a file that ships.
  - **Close** — scope held. The third-instance check Sol asked for came back negative, with two
    candidates examined rather than dismissed. First, § Status vocabulary's *"expect a consumer to
    record it"* on an always-on `n/a`: routed, because the coverage block carries the status token
    verbatim including its reason, so the discrepancy lands in a slot that exists — which is what
    separates it from the Major, where the slot did not. Second, § Enumeration calls `verdict-only`
    *"a shape on both surfaces"* while Briar's plan-write instruction reads *"on `swept`, its
    enumeration"*, which does not accommodate an angle with no unit; graded not-a-defect on
    evidence rather than on reading, since Briar emitted `Repo writing rules — swept —
    verdict-only` correctly in both rounds (plan `:1165`, `:1243`), resolving it from the file her
    instruction cites. Left alone deliberately: the plan template's own `## PR Readiness` in
    `branch-plan.md` gained no bounded-angle line — it is a shared living checklist, not a verdict
    surface, and the finding named two surfaces. Two corrections carried from Briar's re-review
    rather than left in my prior chat: the `mirrored` registration is correct because the bucket
    is declared, not because a build warning would have caught it — `unclassifiedMirrored` pushes
    only when `seedFileIsNew`, so that warning fires once and is silent forever after; and the
    § Plan-file scope fold is declined primarily because the promotion is already scheduled for
    close, which is the stronger reason and now leads that Decision. Edge recall: a docs-only PR
    on Eric's lightweight path leaves the new checkbox permanently unchecked with three
    structurally-bounded angles, and that is the intended reading rather than a defect — the
    verdict is qualified, which is what the cap asks for. Verification honesty: `pnpm prism:build`
    and `pnpm prism:check` re-run at exit 0; five-way mirror parity confirmed by hash on both
    edited references rather than asserted.

- 2026-08-21 [huntermcgrew/opus5-port-3a-reviewer-scope, dispatched by Sol under run
  `architect-gate-port`, lane 3a]
  - **Intent** — close Eric's two Majors and two Minors on PR #471 so the bounded-angle cap
    reaches every surface that can emit a ready state, and `review-angles.md` stops carrying two
    clauses that contradict each other.
  - **Ambiguity** — none load-bearing; assuming Major 1's fix extends to Eric's § After the
    review closing lines as well as § Decision gate, since the portable source carries the cap in
    both and porting one would leave the reporting surface stating the label the gate had just
    been taught not to emit.
  - **Bounds** — done = both Majors and both Minors fixed at canonical source, mirrors rebuilt,
    PR body resynced, PR still draft. Untouchable = `.claude/worktrees/agent-a507b79a93c90415f`,
    the deny-gate branch, every 3B task.
  - **Approach** — take Eric's Major 2 shape whole and move only its placement, so the new rule
    sits in the paragraph that already owns the adjacent one instead of becoming a second copy.
  - **Close** — scope held, with one absorption recorded as a Decision: Eric's cross-cutting
    observation on the review loop's exempt PR body said *no change requested for 3A*, and it is
    folded in anyway as one sentence, because `followup-scope.md` makes fold-in the default for
    same-scope work pre-merge on a file already in the diff. Two silent decisions named. Briar's
    third verdict state is *not* narrowed to pass-bounded alongside Eric's checkbox — the only
    structural producer this fragment names is Eric's lightweight-path axis skip, and Briar runs
    no axis split, so narrowing hers would add a distinction she cannot produce. And the round-2
    plan entry's stale `4b7624af` hash is left standing: it is a historical snapshot in a
    bookkeeping section, which the § Plan-file scope rule this PR ships says is not a finding —
    the same call Eric made on the same file. One prior reading is retired rather than carried:
    the last session's edge recall defended a permanently-unchecked checkbox on every docs-only
    PR as intended, and the pass-bounded narrowing removes the case that needed defending. Edge
    recall for this pass: an angle swept end to end that finds nothing still reports `swept` with
    `— no items`, and a short enumeration over a full range is a finished sweep — both are stated
    in § Enumeration rather than left to the reviewer, because the deleted thinness heuristic
    invites exactly the opposite reading. Verification honesty: `pnpm prism:build` and
    `pnpm prism:check` re-run at exit 0; `pass-bounded` confirmed to have consumers by tree-wide
    grep where it previously had none; `thinnest` confirmed absent from all five
    `review-angles.md` copies; five-way mirror parity confirmed by hash. The PR body resync is
    verified by re-reading the body back from the API after the `PATCH`, since `gh pr edit` fails
    on this repo and is silent about whether the write landed.

- 2026-08-21 [huntermcgrew/opus5-port-3a-reviewer-scope, dispatched by Sol under run
  `architect-gate-port`, lane 3a]
  - **Intent** — strip the false review-loop attribution out of the PR-body sentence absorbed
    last pass, keeping the rule it carries and the evidence that is real.
  - **Ambiguity** — none load-bearing; assuming the honest version keeps `#471` as a non-loop
    instance rather than dropping the citation entirely, since the drift is real and recorded in
    this plan and `.prism/rules/writing-voice.md` § Explain the why wants the reason to cite
    something.
  - **Bounds** — done = the sentence and its two generated mirrors carry no loop claim, build
    and check green, plan and PR body synced, PR still draft. Untouchable =
    `.claude/worktrees/agent-a507b79a93c90415f` and the deny-gate branch,
    `.prism/plans/opus5-port.md`, and the `../../../` link depth in the flattened `agents/`
    mirrors.
  - **Approach** — one clause at source, then `pnpm prism:build` to regenerate the mirrors
    rather than hand-editing three copies out of parity.
  - **Close** — scope held on the fix. One thing taken beyond it, and said rather than absorbed:
    Eric's stronger reasoning on Briar's un-narrowed verdict state is swapped into the record now
    instead of at close, because the only artifact it changes is this plan entry — the clause it
    justifies is unchanged under either reading, so deferring would only leave close reading the
    weaker reason. It is not adopted whole: Eric's "permanently" is recorded with a residual,
    since § Status vocabulary defines structural by the reason naming the *diff* and gives the
    axis skip as "such as" rather than a closed set. Edge recall: the citation-free variant was
    the other real option and loses the reason the rule exists, and a genuine loop incident does
    not exist to cite — this change introduces the exemption, so nothing has exercised it. Left
    alone deliberately: `.prism/plans/opus5-port.md:697`'s deferred nine-angle battery, which
    reconciles at 3A close and belongs to another lane right now. Verification honesty:
    `pnpm prism:build` and `pnpm prism:check` both exit 0 with 775/775 tests; the false string
    confirmed absent tree-wide by grep and the replacement present in exactly the source and its
    two mirrors; the PR body re-read back from the API after the `PATCH`.

---

## Decisions

### Task 28a ships its substance without the `Meta` severity token

**Root cause of the deviation.** `prism-review-loop/shared.md` § Review surfaces already solves
the meta-churn problem, by surface provenance rather than by severity: a Subject / Repair /
Ledger split where bookkeeping is never raised during the loop. The section closes with an
explicit instruction not to add a taxonomy vocabulary anywhere in the file, reasoning that a
named classification reintroduces the judgment call the surface split removes. Adding `Meta`
would have reversed a documented decision as a side effect of an unrelated task.

**Alternatives considered.** Add `Meta` as written and note the conflict — rejected, because
reversing a reasoned in-file prohibition needs its own evidence, not a task written before the
prohibition existed. Skip 28a entirely — rejected, because two of its three elements were
genuinely absent.

**Chosen approach.** Ship what 28a adds that the section did not already have: the exempt
surface gains the PR body and the loop's own readiness line, the third measured incident is
recorded, and the composition with the new plan-file scope is stated. That composition as first
written was wrong and was corrected inside the same PR after self-review: the Ledger disposition
does not cap what the plan-scope rule keeps, because the survivors are Subject content. The two
rules aim at different sets.

**Implementation guidance.** A future change wanting a severity token here repeals the
no-new-vocabulary paragraph explicitly rather than adding a token beside it.

→ promotion verdict pending — resolves at PR 3A close.

---

### The deletion criterion is a foreclosure test, and its output is written, not held

**Root cause of the question.** The section already carries three questions, and every item
on its reversal list was caught by a reviewer rather than by the slimming pass. Hunter's
"the LLMs already know this" is a fourth question that would over-fire against exactly that
list — the model "knows" what a closing ceremony is, what dispatching means, what a
verification gate is. Knowing the *category* is not knowing which member of it this repo
picked.

**The test.** Before deleting any block, write one sentence naming the alternative behavior
that block forecloses — the thing a competent model would otherwise plausibly do instead.

- **A sentence comes out** → the block is naming a choice. Keep it, compressed to that
  sentence. The sentence is usually shorter than the block.
- **No sentence comes out** → the model's default is the only sensible behavior, and the
  block is flavor. Delete it.

**The sentence is the block.** Hunter's 2026-08-20 standing instruction — *"we just really
need to cut the prose out of the skills as much as possible"* — governs the *keep*
disposition, not just the delete one. Where a block earns a foreclosure sentence, what
survives is the sentence. Not the sentence plus the original paragraph kept for warmth, not
the sentence plus two illustrative examples, not the sentence plus the `**Why:**` that
motivated it. The bound survives; the prose around it does not. An implementer who finds
themselves writing "the sentence, and also this paragraph is worth keeping because…" has
found a second bound and should write it as a second sentence, or has found flavor and
should delete it.

**One sentence per bound, not one sentence per block.** A block foreclosing three different
alternatives yields three sentences. Picking the strongest and dropping two silently loses two
bounds while looking compliant with the rule.

---

#### Where the stronger prose rule over-fires

Sol asked for this plainly, so here it is plainly. "The sentence is the block" is right for
prose and wrong for three block classes. Each is checkable, so an implementer does not have to
adjudicate it by feel.

**The test that separates them: can a reader act on the sentence alone, or does acting require
the block's own contents?** If acting requires the contents, the contents are the block and the
sentence is its caption.

- **Typed contracts.** The foreclosure sentence for a quoted schema is *"forecloses
  paraphrasing a shape something downstream parses."* Replacing the schema with that sentence
  performs the exact failure the sentence forbids. The remedy the sentence names is *quote it
  verbatim* — so the sentence is a caption on the quote, never a substitute for it. Live cases:
  the report-back schema in task 20's `## Reporting back`, and `review-angles.md`'s three
  status tokens.
- **Reference sets the bound points at.** Pixel's principle catalogs are the live example and
  Hunter's own ruling already carved them out: the sentence is *"forecloses citing an unnamed
  vibe,"* and a reader cannot cite Nielsen #4 from that sentence. The list is the content the
  bound refers to. Same shape: `review-angles.md`'s nine angle names and their per-angle units,
  `tdd`'s three anti-patterns and their tells, the severity table in
  `review-frameworks.md`.
- **Verbatim calibration lines the evidence names as the thing that worked.** Task 25's
  outside-facing question and its closing line — *"An unanswerable question is a task, not an
  assumption"* — are the measured mechanism, not a description of it. Paraphrasing a measured
  string discards the measurement. These are already marked verbatim in their tasks.

Everything else in the roster is prose and takes the strong rule. On a fair reading these
three are not exceptions to the rule at all — a schema, a catalog, and a measured string are
each the *content* the foreclosure sentence points at, and the rule was always about the prose
*around* the content. Naming them anyway, because "cut as much as possible" applied by a fast
implementer at 2am to 31 files will otherwise take one of them.

**Why this is safe against the reversal list.** Every protected item yields a foreclosure
sentence immediately:

| Protected item | Alternative it forecloses |
| --- | --- |
| Opening Orientation Battery | Starting work without stating intent and bounds |
| Briar's diff-only reading | Reviewing whole files instead of the diff — a human-set rule |
| A persona's closing ceremony | Leaving `## Decisions` unpromoted at plan close; four dispatchers cite it |
| A persona's dispatched-runs section | Returning free prose where a typed verdict is parsed |
| The evidence-format gradeability bar | Writing AC as prose a human eyeballs |
| Typed contracts | Paraphrasing a shape something downstream parses |
| `## Context budget` | Unbounded subagent fan-out |
| Escape conditions | Stalling instead of routing when work cannot proceed |
| `description` frontmatter | Not being invoked at all |

**Why it fires correctly on Hunter's targets.** *"You are a senior software engineer with
10+ years of experience"* forecloses nothing — no alternative behavior follows from deleting
it. *"You specialize in: application architecture · frontend frameworks · backend services · 
accessibility auditing · identifying bugs · test coverage"* forecloses nothing; every item is
already the job the skill's own procedure describes. Both go.

**Order of operations.** The foreclosure test runs *first* and decides whether a block is
content or flavor. The three existing questions run *second*, on anything the foreclosure
test marked as content but a task still proposes to move or delete: does anything else say
this where the reader arrives; does the evidence measure the right surface; is the proposed
repair "repoint the citers." A block that fails the foreclosure test needs no successor
check, because it never carried a bound.

**The output is written into the PR body, per file, per deleted block class.** The
foreclosure sentence is not a thought the implementer has; it is a table cell. Task 24
already requires a per-skill `swept` / `n/a — <reason>` table — that table gains a
`Foreclosure` column and becomes the shape every deletion commit in PR 3B reports through. A
gap typed into the deliverable is harder to skip than a gap named in an instruction.

**Alternatives considered.** Add "the model already knows this" as a fourth question
alongside the other three (rejected — it is a claim about model knowledge with no written
artifact, so it is unfalsifiable at review time, and it is the question most likely to
over-fire). A word-count budget per skill (rejected — the section already records that a word
ceiling fights its own keep-list, and that two implementers hit the conflict).

→ promotion verdict pending — resolves at PR 3B close, into
`.prism/architect/_toolkit/skills-ecosystem.md`.

---

### Reviewer plan-file scope: a plan is a finding only when it contradicts the diff

**Root cause.** This is not a vague reviewer tendency to correct with tone. It is four
literal instructions to file Minors on plan hygiene, plus the two rule sections that mandate
them:

- `.ai-skills/skills/prism-code-review-self/shared.md:389` — flag a `## Decisions` entry
  missing a verdict sub-bullet as Minor.
- `.ai-skills/skills/prism-code-review-self/shared.md:390` — flag a plan close missing the
  `> Retro:` line as Minor.
- `.ai-skills/skills/prism-code-review-pr/shared.md:431` and `:432` — the same two, for Eric.
- `.prism/rules/branch-plan.md` § Decision verdict gate — *"Briar surfaces missing verdicts
  as a Minor in self-review… Eric surfaces missing verdicts during PR review."*
- `.prism/rules/branch-plan.md` § Before Closing — the `> Retro:` gate the two body lines
  cite.

**The rule that replaces them.** A plan-file observation is a finding only when the plan
contradicts the change:

> The plan claims work the diff does not contain, describes behavior the code does not have,
> or carries a `## Decisions` entry this change reversed without amending it. Severity
> follows the normal Impact × Likelihood calculation from there.
>
> Everything else about a plan is not a finding: a missing verdict sub-bullet, a missing
> retro line, section ordering, history-entry length, formatting. Fix it inline if you own
> the branch; otherwise mention it in one line and move on.

**Why the rule sections move with the bodies.** Deleting the two body lines while
`branch-plan.md` still mandates them is the behavior-changed-without-a-token drift
`code-standards.md` § Removal and rename completeness names — the prose home and the code
share no symbol, so no search reconciles them. Both rule sections keep their *gate* (Winston
still runs the verdict gate at close; the retro line is still recorded) and lose only the
clause assigning enforcement to a reviewer's severity list.

**Relationship to task 28's `Meta` severity — complement, not conflict.** Task 28 rules that
a meta finding is real, gets fixed, and never drives another review pass. This rule says most
plan observations are not findings at all. They stack: the plan-scope rule shrinks the set,
`Meta` caps what the survivors can cost. Task 28 keeps its text and gains the plan-scope
clause as its named concrete instance. Nothing in task 28 is dropped.

→ promotion verdict pending — resolves at PR 3A close, into
`.prism/references/review-frameworks.md` § Severity Classification.

---

### The angle-coverage table is ported; the § Deferred row that held it back is reversed

The § Deferred row reading *"the nine-angle review battery and Briar's file-slice fan-out
(`_shared/review-angles.md`)"* is **split, not silently dropped**. Hunter asked for the angle
table by name and described its rendered shape. The row becomes two:

| Item | Disposition |
| --- | --- |
| Nine-angle battery + status vocabulary + enumeration + reporting + re-sweep obligation | **Reversed — ships in PR 3A** (task N1) on Hunter's 2026-08-20 direction. |
| Briar's file-slice fan-out | **Still deferred.** It is a review-execution change (parallel context-isolated slices), not a coverage-reporting change, and it has its own cost profile. Independent PR. |

**Two portable sections do not port as-is.** § Axis split assigns angles across a
Standards/Spec pair — PRISM's Eric already runs that split
(`prism-code-review-pr/shared.md:182`), so Eric cites the assignment. PRISM's Briar has no
axes, so Briar sweeps all nine in one pass and the fragment must say so rather than assuming
the portable roster's symmetry. § Finding anatomy (`Class`/`Sweep`) is genuinely valuable and
genuinely separable — deferred to its own PR so 3A stays reviewable, recorded here so the
deferral is visible rather than lost.

→ promotion verdict pending — resolves at PR 3A close.

---

### Pixel keeps the catalogs. Whether they change the design or only the vocabulary stays an open question with no measurement lane.

**Ruled by Hunter, 2026-08-20:** *"Keep the catalogs, no a/b."* The keep is a decision; the
underlying question is knowingly left open.

**The keep/cut call, and why it is sound on its own.** The portable
roster Hunter reports as working well *kept* Pixel's catalogs — Nielsen's ten heuristics,
Johnson's cognitive foundations, Gestalt, the named laws, the Design Pattern Vocabulary — at
212 total lines, and attached the rationale in the file:

> These are model-resident; the list enforces consistency of citation, not instruction.

That line is the foreclosure sentence. The catalog forecloses citing an unnamed vibe — "too
many choices" instead of "Hick's Law, fourteen filter categories with no grouping." The model
knows Hick's Law; what it does not reliably do is reach for the *same* named principle across
sessions, which is the behavior Hunter is praising when he says Pixel quotes textbook rules
well. So: **keep the catalogs, add the rationale line, and cut the elaboration around them** —
the `You specialize in` list, the seven-item specialization block, and the Design Leadership
course-correction bullets that restate the recommendation-first rule three ways.

**The warm-up hypothesis stays open, and is not scheduled work.** Whether the catalog's
presence changes the *design* Pixel produces — as opposed to the vocabulary it describes the
design in — is unmeasured, and **the measurement is declined, not pending.** Nothing in PR 3
or any successor is blocked on it, nobody owns it, and it should not appear on a backlog. It
is recorded here for one reason: so that a future reader who notices the catalogs cost ~900
words on Pixel invocations can see that the cost was known, weighed, and accepted rather than
overlooked.

The catalogs are also not fragile to the answer. If the warm-up effect turns out to be zero,
the citation-consistency bound stands on its own and the catalogs still earn their place —
which is why the question can stay open without putting anything at risk.

→ no promotion needed (open question, measurement declined — exit condition: someone observes
Pixel citing principles inconsistently *with* the catalogs present, which is the one
observation that would make the question worth spending on).

---

### PR 3 is cut into two PRs. 3A runs parallel to #470; everything else is one branch.

**Ruled by Hunter, 2026-08-20**, after hearing the costs of a single PR. Two PRs, not the four
this proposal originally carried.

| PR | Contents | Why this boundary |
| --- | --- | --- |
| **3A — Reviewer scope and the angle table** | Tasks N1, N2, 28a | Ships the misbehavior fix **first**, so the reviewers that review 3B are already operating under the new plan-scope rule instead of paying the old budget tax on the largest diff in the stack. Branches now, parallel to #470. |
| **3B — Everything else** | Tasks 20, 21, 22, 23, 24, 25, 26, 27, 28b, 29, N3, N4 | Shared core, the Step-0 pointer across 31 bodies, the slimming pass, and both utility skills. Branches after #470 and PR 2E land. |

**The 3A argument does not extend to splitting 3B, and that is the whole reason 3B is one
branch.** 3A earns separation because it changes how the *next* review runs. No cut inside 3B
has that property — the core file, the slimming pass, and the two utility skills do not change
each other's review conditions. Splitting them would buy smaller diffs and nothing else, at
the cost of three more branch-and-review cycles on work that lands in the same place.

**3A can run parallel to #470.** #470 is the deny gate — hook runtime, ADR-0072, manifest
validation. 3A touches `.prism/rules/branch-plan.md`, a new
`.prism/references/review-angles.md`, and the Briar / Eric / review-loop bodies. The only
shared file is `.prism/plans/opus5-port.md`, which is why this proposal is a separate file.

**Sequencing preconditions already cleared:** task 22's *"strictly after PR 1 merges"* is
satisfied — PR 1 merged as `ccbef3d0`.

→ no promotion needed (stack-shaping for one epic; the cut table expires when 3B lands).

---

### 3B's three accepted risks, and the commit structure that answers two of them

Hunter accepted these with his eyes open. They are recorded as risks rather than absorbed into
the merge, because a risk that disappears into a decision cannot be checked against later.

| # | Risk | Standing after mitigation |
| --- | --- | --- |
| R1 | The diff is roughly 150–200 files once generated mirrors are counted. | **Largely answered** by the mirror-terminal-commit boundary below — the reviewable source surface drops to roughly 35 files. |
| R2 | The foreclosure table is the quality mechanism, and at this size it gets long enough that honest review is a real question. | **Partly answered** by per-commit table slices. The residual is real: a reviewer still reads every row, just never all of them at once. |
| R3 | The reversal list exists because a prior slimming pass over-cut and a reviewer caught it. One branch means worse rollback granularity. | **Partly answered** by one-commit-per-deletion-class. The residual is real: reverting after the squash means reverting the whole PR. |

**Yes, this changes how I would sequence work inside 3B.** Sol asked directly, and the answer
is that commit boundaries are now doing the job PR boundaries were doing, so they stop being
an implementer's housekeeping choice and become part of the plan. Four rules, in order of how
much they buy:

1. **Mirrors land in one terminal commit, and source commits carry source only.** This is the
   single largest lever on R1. `pnpm prism:build` regenerates every mirror deterministically,
   so the reviewable diff is the canonical sources and the mirror commit is verified
   mechanically rather than read: check out the commit before it, run the build, and confirm
   the working tree matches. A reviewer who reads 35 source files has read the change; a
   reviewer who reads 165 files has read the same change three extra times.
2. **Additive work first, deletions last.** Order: task 20 (core file) → task 21 (Step-0
   pointer) → tasks 26, 27, 28b (the two utility skills) → tasks 22, 23, 24, 25, N3, N4 (the
   deletions) → task 29 (docs) → mirrors. A revert of any deletion commit then leaves the
   additive base intact, which is the only rollback granularity available once the PR is one
   branch. This is the direct answer to R3.
3. **One commit per deletion class, never per file.** Reverting "the persona-prose pass" is one
   revert, not 26. Task 22 is one commit, task 23 is one commit, task 24 is one commit, task 25
   is one commit, task N3 is one commit. Task N4's Pixel protection rides task N3's commit —
   splitting the protection from the pass it protects against is how the protection gets
   reverted alone.
4. **The foreclosure table is reviewed per commit, not once in the PR body.** Each deletion
   commit's message carries its own slice of the table — only the rows for the blocks that
   commit touched. The PR body carries the roll-up counts and a pointer to the commits. This is
   the R2 answer, and it uses the lever Sol named: branch-level `git log` is read during review
   even though `main` only sees the squash. A reviewer reviewing task N3's commit reads task
   N3's rows against task N3's diff, which is a reviewable unit; the same rows in a PR body
   next to five other tasks' rows are not.

**One collision to check before 3B branches**, not a blocker: PR 2 task 17 edits
`.ai-skills/skills/prism-conductor/shared.md:106`, and task 21 adds a Step-0 line to that same
file. Different regions, so the merge resolves cleanly — and 3B branches after #470 and 2E
land rather than concurrently with them.

→ no promotion needed (branch-shaping for one PR; rules 1 and 3 are worth promoting to
`.prism/rules/git-conventions.md` § Commit Granularity if a second large generated-mirror PR
ever wants them, and that is a separate call on a second instance, not this one).

---

### § Plan-file scope stays inline in both reviewer bodies for PR 3A

Briar's non-blocking cleaner path: the section is byte-identical in both bodies, and
`.prism/references/review-frameworks.md` is already the shared catalog both consume and already
owns § Severity Classification, which is where this plan's own Decision promotes the rule at
close.

**Chosen approach.** Decline for this PR. Two reasons. The one that decides it: this plan's own
Decision already schedules the promotion for close, so folding inside 3A absorbs scope that is
already parked, and does it while the text is still moving — the same paragraphs get edited
twice. Second, the two copies are no longer byte-identical; fixing Briar's unadapted *"Fix it
inline if you own the branch"* gave her a disposition sentence Eric does not share, so the fold
is no longer a lift — it needs a shared body plus a per-persona carve-out on exactly the clause
whose one-size wording caused the finding.

**Alternatives considered.** Fold now with a carve-out — rejected on the reason above. Fold now
and revert Briar's adaptation to keep the copies identical — rejected outright; that trades a
real contradiction in her bounds for a structural convenience.

**Implementation guidance.** At close, promote the shared three paragraphs into
`review-frameworks.md` and leave each reviewer the one disposition sentence its write bounds
require.

→ no promotion needed (the promotion this Decision defers *is* the close-time action; recorded
here so the close does not re-litigate it).

---

### Briar's Major 3 is upheld on scope and not upheld on direction

**Finding as filed.** *"The Ledger row **below**"* points up, and the paragraph's cap claim is
false.

**What the check found.** The cap claim is real and is fixed. The direction claim is not: the
file carries two Ledger references, a surfaces bullet at `:27` and a **Disposition** table row at
`:101`, and the paragraph paraphrases the table row's cell text (*"swept once at close"*)
verbatim — so `below` resolved correctly to the row and Briar read it against the bullet.

**Chosen approach.** Fix the scope error, and name the **Disposition** table explicitly in the
rewrite rather than leaving a bare directional word for two same-named references to compete
over. A reviewer who misread it once will not be the last.

→ no promotion needed (a correction to one paragraph in one skill body; the general form —
a bare `above`/`below` where two references share a name — is already covered by
`.prism/rules/writing-voice.md` § Every reference carries its own content in spirit).

---

### Sweep-before-report is a clause on § Reporting, not a new section or a body-level rule

**Root cause of the question.** Hunter's instruction — a reviewer sweeps the whole range against
every angle before reporting, and reports only when that is complete — arrived as a dispatch
brief, which dies with the run. It needed a durable home, and three placements were available.

**Alternatives considered.** A new top-level section — rejected, because § Reporting already owns
when and how a pass reports, and a second reporting section invites the two to drift. The two
reviewer bodies instead of the shared fragment — rejected, because both reviewers load this file
and a rule stated twice is a rule that disagrees with itself after the first edit; the file also
already carries the shared angle set both readers use, so the completeness rule belongs beside it.

**Chosen approach.** A clause on § Reporting, placed directly above § Re-sweep obligation, with
one sentence naming how the two compose — § Reporting governs when a pass may report, § Re-sweep
governs what a later pass re-runs. Two boundaries are stated in the clause itself because both
are misreadable: the contract is coverage before reporting rather than finding everything, so a
complete sweep that still misses a defect has met it; and an angle the pass genuinely could not
reach does not withhold the report, it reports `not reached` and the verdict cap qualifies the
verdict instead.

**Implementation guidance.** The `**Why:**` cites two measured incidents rather than asserting a
preference — PRISM PR #471's re-review finding a fifth defect of the round-1 class, and PR #470's
ten rounds. Both are qualified by repo, matching how `writing-voice.md` and `code-standards.md`
cite `thrive#2196` on the same consumer-shipped surface.

→ promotion verdict pending — resolves at PR 3A close.

### The loop's exempt PR body is absorbed into 3A rather than deferred

Eric's cross-cutting observation on the review loop — that the newly-exempted PR body is where
both stale verification claims lived, and the loop by design cannot catch them — carried a named
remedy and an explicit "no change requested for 3A." It is absorbed anyway, as one sentence on
the Ledger row saying the body is checked once, out of loop, before the human gate.

- **Root cause.** The exemption is scoped to *during the loop*, which is correct: reviewing the
  body every pass is the meta-churn the exemption exists to stop. What the row did not say is
  that the check still has to happen somewhere, so a reader could take the exemption as
  permanent. This PR is the demonstration — the loop converged clean with two of four
  verification probes no longer reproducing, and only a standalone pass caught them.
- **Alternatives considered.** A follow-up ticket, per Eric's "no change requested."
- **Chosen approach.** Fold in. `.prism/rules/followup-scope.md` makes fold-in the default for
  same-scope work pre-merge, and all four signals point that way: the file is already in this
  diff, the exemption is this PR's own addition, the change is one sentence, and it is the same
  persona's lane. A ticket carrying one sentence is the overhead that rule exists to refuse.
- **Implementation guidance.** The sentence sits directly under the Ledger bullet rather than
  inside it — the bullet already runs eleven lines, and the out-of-loop check is a different
  claim from the during-loop exemption it qualifies. It cites PR #471 as the incident, matching
  how the surrounding `**Why:**` cites #446.

→ promotion verdict pending — resolves at PR 3A close.

---

## Implementation Tasks

Renumbered from tasks 20–29. Verification convention is unchanged from the parent plan:
`pnpm prism:build` then `pnpm prism:check`, both from the repo root, both green, unless a
task states otherwise.

### Disposition of the existing tasks 20–29

| Old | Disposition | Now |
| --- | --- | --- |
| 20 — shared core file | Survives as written | PR 3B, commit 1 |
| 21 — Step-0 pointer ×31 | Survives as written | PR 3B, commit 2 |
| 22 — delete `## The run, in order` | Survives as written | PR 3B, deletion commit |
| 23 — collapse closing-battery restatements | Survives as written | PR 3B, deletion commit |
| 24 — dedup DoD blocks | **Amended** — its per-skill table gains a `Foreclosure` column and becomes the reporting shape for every deletion commit | PR 3B, deletion commit |
| 25 — exit-condition rewrite | Survives as written | PR 3B, deletion commit |
| 26 — `tdd` skill | Survives as written | PR 3B, additive commit |
| 27 — `devils-advocate` skill | Survives as written | PR 3B, additive commit |
| 28 — anti-meta-loop + Sol operator contract | **Split** across both PRs | 28a → PR 3A; 28b → PR 3B additive |
| 29 — Eli docs | Survives, rejoined into one task now that 3B ships both halves | PR 3B, docs commit |
| — | **New** | N1, N2 → 3A; N3, N4 → 3B deletion commits |

Nothing from tasks 20–29 is dropped.

**Tasks 26 and 27 are checked against the new direction and both survive.** Neither conflicts
with "the less the better": both are persona-less references read for their content, carrying
no greeting, no batteries, no DoD, and no flavor prose. `tdd`'s three anti-patterns each ship
with their tell, which is a foreclosure sentence by construction. Task 27's instruction to
**leave Winston's inline `### Devil's Advocate` section in place** also survives, and the new
direction is exactly the pressure it was written to resist — the reversal list is made of
sections a slimming pass deleted and a reviewer restored. Deleting it is its own call, taken
on its own evidence, not absorbed into this one.

---

### PR 3A — Reviewer scope and the angle table

Branch from `origin/main`. Runs parallel to #470.

#### Clove (implementation)

**N1. Add `.prism/references/review-angles.md`.** Ported from the portable roster's
`_shared/review-angles.md`, read by Briar and Eric only — an opt-in fragment, never core
content. Port these sections: the six always-on angles (runtime behavior, test efficacy,
spec and doc consistency, citation integrity, external-system claims, repo writing rules),
the three triggered angles (security, docs impact, accessibility), § Status vocabulary
(`swept` / `n/a — <reason>` / `not reached — <reason>`, with the pass-bounded vs structural
split), § Enumeration (the per-angle unit and the counts slot), § Reporting (all nine
statuses every pass, including a clean pass), and § Re-sweep obligation.

Two adaptations, both required — the portable file assumes a symmetry PRISM does not have:

- **§ Axis split** ports for Eric only. Eric's Standards axis takes runtime behavior, test
  efficacy, external-system claims, repo writing rules, security, accessibility; his Spec
  axis takes spec and doc consistency, citation integrity, docs impact. State in the file
  that **Briar has no axis split and sweeps all nine in one pass** — porting the portable
  Briar's split is the deferred file-slice fan-out, not this task.
- **§ Finding anatomy** (`Class` / `Sweep`) does **not** port. Recorded as deferred in
  § Decisions above.

Register in `.ai-skills/definitions/seed-curation.json` as **non-curated** — it should mirror
verbatim.

**Verify:** `pnpm prism:build && pnpm prism:check` green; the file appears at
`templates/install/.prism/references/review-angles.md` and in all three platform mirrors;
`grep -c "not reached" .prism/references/review-angles.md` returns a non-zero count (the
three-token vocabulary is what makes an incomplete pass distinguishable from a clean one, and
a port that drops the third token is the failure worth catching).

**N2. Wire the angle table into Briar and Eric, and fix the plan-file scope.** Four edits,
two files each side.

- `.ai-skills/skills/prism-code-review-pr/shared.md` — after § Phase 3's two-axis assembly
  step (currently around `:210`), require a `## Angle Coverage` block in the summary comment,
  placed after `## Cross-cutting observations`. Each subagent returns its own angles'
  enumerations; Eric assembles the combined block naming which axis produced each line. Cite
  `review-angles.md` § Axis split rather than restating the assignment — two context-isolated
  subagents with a restated split is how the sweep runs twice or not at all.
- `.ai-skills/skills/prism-code-review-self/shared.md` — require an `### Angle Coverage`
  block in the plan's `## Review Issues` write, all nine angles, single pass, no axis
  attribution.
- **Delete** `prism-code-review-self/shared.md:389` and `:390`, and
  `prism-code-review-pr/shared.md:431` and `:432`. Replace with the one-paragraph plan-scope
  rule from § Decisions above, stated once per body.
- `.prism/rules/branch-plan.md` — in § Decision verdict gate and § Before Closing, keep the
  gate and delete only the clause assigning reviewer enforcement. Winston still runs the
  verdict sweep at close; the retro line is still recorded. Neither gate loses its teeth;
  both lose their reviewer-severity hook.

**Verify:** `! grep -q "missing a verdict sub-bullet as Minor" .ai-skills/skills/prism-code-review-self/shared.md .ai-skills/skills/prism-code-review-pr/shared.md .prism/rules/branch-plan.md` — paired with the positive control
`grep -c "Decision verdict gate" .prism/rules/branch-plan.md` returning non-zero, proving the
probe reached a file that still exists. Absence checks without a positive control are the
recurring failure this stack has already paid for twice. Then build + check.

**28a. Anti-meta-loop and `Meta` severity** (from `thrive-port.md` task 5, unchanged in
substance). `.ai-skills/skills/prism-review-loop/shared.md`: a meta finding — a PR body
describing the change wrong, a readiness line reporting a closed finding as open, plan
hygiene — is real and gets fixed, but never drives another review pass; only subject-surface
findings count toward the zero-findings exit. Cite thrive's measured incident (five of nine
passes spent on meta churn) in the `**Why:**`. Add one line naming N2's plan-scope rule as the
concrete instance: most plan observations are not findings at all, and `Meta` caps what the
rest can cost. **Verify:** build + check.

---

### PR 3B — Everything else

Branch from `origin/main` after #470 and PR 2E land. One branch, and the commit boundaries do
the work the PR boundaries used to — see § 3B's three accepted risks for why each rule exists.
Task groups below are commits, in order:

1. **Additive base** — tasks 20, 21, 26, 27, 28b. Nothing deleted; a revert of any later
   commit lands on an intact base.
2. **Deletions** — tasks 22, 23, 24, 25, N3 (with N4 riding N3's commit). One commit per task,
   never per file, so reverting a class is one revert. Each commit message carries its own
   slice of the foreclosure table — only the rows for the blocks that commit touched.
3. **Docs** — task 29.
4. **Mirrors** — one terminal commit, `pnpm prism:build` output only, no hand edits. Verified
   by re-running the build against the prior commit and confirming an empty diff, not by
   reading 130 generated files.

Every source commit carries canonical sources only. A generated mirror appearing in any commit
but the last is the failure mode this ordering exists to prevent, and it is mechanically
checkable: `git show --stat <sha>` on any non-terminal commit must list no path under
`.claude/`, `.codex/`, `.cursor/`, or `templates/install/`.

#### Clove (implementation) — commit 1, additive base

**20. Create `.prism/references/skill-core.md`.** Unchanged from the parent plan — one file,
not two; each section a pointer plus the fact it establishes; `## Orientation`,
`## The plan is the working memory`, `## Reading before writing`, `## Reporting back` (the
report-back schema quoted as a fragment, never paraphrased — something downstream parses it),
`## Closing`, and `## Context budget` (kept deliberately; it is on the reversal list).
Single-owner content stays with its owner. Register in `seed-curation.json` as non-curated.
**Verify:** build + check; the file appears at `templates/install/.prism/references/skill-core.md`
and in all three platform mirrors.

**21. Add the Step-0 core pointer to all 31 skill bodies.** Unchanged from the parent plan.
One line in each `.ai-skills/skills/<id>/shared.md` immediately before the greeting section,
using the existing relative-link form (`[…](../../../.prism/references/skill-core.md)`), never
a literal profile path. A persona overriding a core section writes a one-line stub under a
`Persona notes on the shared core:` sub-list, never a restatement. **Verify:**
`grep -l "skill-core.md" .ai-skills/skills/*/shared.md | wc -l` returns `31`; `pnpm prism:check`
crossref lint green.

**26. Add `.ai-skills/skills/tdd/`.** Unchanged from the parent plan. Persona-less reference,
~67 lines. Three anti-patterns, each with its tell: *implementation-coupled* (a refactor breaks
the test though behavior did not change), *tautological* (the assertion recomputes the expected
value the same way the code does), *horizontal slicing* (all tests written, then all
implementation). State explicitly that refactoring is not part of the red-green loop. Register
in `roles.json` with `"type": "utility"` and **no** `persona` field. Add its row to
`.prism/rules/skill-routing.md` § Utility skills, not the persona routing table. **No greeting,
no Step-0 core pointer, no batteries, no DoD** — that scoping is what keeps the `31` counts in
tasks 21 and 23 correct rather than `33`. **Verify:** `pnpm prism:build` emits
`.claude/skills/tdd/SKILL.md` and **no** `.claude/agents/tdd.md`;
`grep -c "skill-core.md" .ai-skills/skills/tdd/shared.md` returns `0`; check green.

**27. Add `.ai-skills/skills/devils-advocate/`.** Unchanged from the parent plan. Four passes,
a typed verdict, and an applicability test: *"does this artifact commit to a decision before
the evidence exists?"* Deliberately no name and no personality. Registration and scoping
identical to task 26. **Leave Winston's inline `### Devil's Advocate` section in place** and
add a one-line pointer to the skill — see the note above on why the new direction does not
change this, and note that the *stronger* prose rule does not change it either: the inline
section's foreclosure sentence is *"forecloses committing to a plan before its evidence
exists,"* which is a bound, not warmth. **Verify:** same as task 26;
`grep -c "Devil's Advocate" .ai-skills/skills/prism-architect/shared.md` still returns a
non-zero count.

**28b. Sol's operator-communication contract** (from `thrive-port.md` task 6, unchanged).
`.ai-skills/skills/prism-conductor/shared.md`, new `## Talking to the operator`: interim
updates are one line; plain words, no coined run-vocabulary; every handle redeemed at first
mention; evidence cells one clause. Cite `response-shape.md` rather than restating it. **Do
not touch § Enforcement is guidance + pipeline stages** — PR 2 task 17 owns that section.
**Verify:** build + check.

---

#### Clove (implementation) — commit 2, the deletions

One commit per task. The foreclosure criterion in § Decisions governs every deletion, and each
commit message carries the rows for the blocks that commit touched.

**24. Dedup the DoD blocks, and establish the deletion-commit reporting table.** 28 files carry
`## Definition of Done`. Apply the criterion: delete items restating a battery, "types
pass" / "lint passes" / "no stray console.logs" / "full diff read", and anything restating a
`load: always` rule. Keep skill-specific policy — "No implementation code written" (Winston),
"AC synced to the ticket tracker", Clove's real build and test criteria. Keep the one line
naming the deliverable under each surviving heading; where every item fails, the heading goes
and one deliverable sentence replaces the section. **Judgment-bounded — read each body, do not
sweep.**

**The table this task establishes is used by tasks 22, 23, 25, and N3 as well.** One row per
file per task, in the PR body:

| Skill | Block | Status | Foreclosure | Disposition |
| --- | --- | --- | --- | --- |
| `prism-code-review-pr` | `## Definition of Done` item 3 | `swept` | *none — restates `verification-before-done.md`* | deleted |
| `prism-architect` | `## Definition of Done` item 1 | `swept` | *forecloses writing implementation code* | kept, compressed to one line |

An empty `Foreclosure` cell on a `kept` row, or a filled one on a `deleted` row, is a
self-contradicting row and fails review on sight. That contradiction is the point — the
column makes the criterion checkable by a reader who was not in the implementer's head.

**Verify:** `grep -o "Battery answered" .ai-skills/skills/*/shared.md | wc -l` returns `0`;
the PR body carries the table with a row per touched block; build + check.

**22. Delete the `## The run, in order` headings.** 22 headings across `shared.md` files, plus
four further files mentioning the phrase in prose (26 files total carry the string). PR 1
already removed the two always-on rules that mandated them, so this is a clean deletion with
no dangling mandate. **Verify:** `grep -rn "The run, in order" .ai-skills/skills/` returns
nothing; `grep -rn "The run, in order" .prism/rules/ .prism/references/` returns nothing — if
either returns a hit, PR 1 regressed and this task stops.

**23. Collapse the `## Closing Re-Orientation Battery` restatements.** 30 files carry the
heading; 31 mention the phrase. **The mechanism is not deleted — the restatement is.**
`session-orientation.md` remains the single owner of both batteries and its `## Sessions`
`open:`/`close:` persistence contract is untouched. Each body keeps one pointer at open (task
21's Step 0 covers it via the core) and one line at close, folded into the deliverable
sentence task 24 writes. **Verify:** both halves required —
`grep -c "^## Closing Re-Orientation Battery" .ai-skills/skills/*/shared.md | grep -v ":0"`
returns nothing, **and** `grep -l "session-orientation.md" .ai-skills/skills/*/shared.md | wc -l`
still returns `31`. The first alone would pass if the mechanism were deleted outright.

**25. Replace prescribed read sequences with exit-condition questions.** Unchanged from the
parent plan and **not to be diluted by the new direction** — this is the one `[measured]`
change in the whole slimming effort, and it moved external research calls 0 → 17 while cutting
chat words 1,856 → 917.

**The trap, restated so it cannot be missed: "four questions" is not the mechanism.** The
Opening Orientation Battery is already four questions and produces zero research, because its
questions are about the *request*. The rewrite works only if at least one question is about
constraints originating **outside** the repo:

> What does this change depend on that this repo does not define — a vendor API, a host
> runtime, a platform behavior, an upstream contract — and what is the current fact about it?

Scope: `prism-architect` (the Batch 1 / Batch 2 block), `prism-code-dev`,
`prism-code-review-self`, `prism-code-review-pr`, `prism-debugger`. For each, replace the
enumerated read list with exit conditions naming the fact each read must establish, plus the
outside-facing question. Closing calibration, verbatim: *"An unanswerable question is a task,
not an assumption."* **Keep** calibration reads that already say what they are for.
**Verify:** each rewritten skill's exit-condition block contains an outside-facing question —
human evidence, named per skill in the PR body; build + check.

**N3. Delete the persona flavor prose.** This is Hunter's headline ask and it appears nowhere
in the original tasks 20–29 — that list slims batteries, run-order lists, and DoD blocks, none
of which is the surface he described.

Three block classes, each run through the foreclosure test:

- **Credential prose** — *"You are **Eric** (he/him), a senior software engineer with 10+
  years of experience"*, and the `You specialize in:` bullet list under it (8 files carry that
  exact string). **Keep the name and the declared pronoun** — the pronoun is a hard fact the
  model cannot infer and gets wrong, and the persona name is the routing handle. Delete the
  seniority claim and the specialization list.
- **`## Personality` sections** — 26 files. Compress each to a `## Voice` paragraph of a few
  sentences. Voice is measured as load-bearing; the essay around it is not. Where a
  personality section contains a *working instruction* wearing narrative clothes — Pixel's
  "opinionated first and warm second: lead with the recommendation," Eric's "never leaves a
  'this is wrong' without a 'here's what I'd try instead'" — that instruction survives as one
  sentence inside `## Voice`. Keep the discriminator, cut the elaboration.
- **Stack recitations** — any block naming the team's stack in prose. The repo's own rules and
  `.repo-map.md` say it where the reader arrives, and on a consumer install the recitation is
  actively wrong.

**One mechanical hazard the implementer must check first.** 15 of the 31 bodies carry
`<!-- atlas:end -->` regions, and at least one credential block sits **inside** one
(`prism-code-review-pr/shared.md`). Atlas rewrites those regions during onboarding. Before
deleting inside any atlas region, read `.ai-skills/skills/prism-onboarding/shared.md` for the
anchor contract and confirm whether the region's content is Atlas-generated (edit the
generator) or merely Atlas-delimited (edit the body). Guessing here silently reverts the
deletion on the consumer's next onboarding run.

**Verify:** `! grep -rq "You specialize in" .ai-skills/skills/` paired with the positive
control `grep -rc "he/him\|she/her\|they/them" .ai-skills/skills/ | grep -v ":0" | wc -l`
returning a non-zero count — proving the probe reached the same files and that the pronoun
declarations survived. `grep -c "^## Personality" .ai-skills/skills/*/shared.md | grep -v ":0"`
returns nothing. The PR body carries task 24's table with a row per deleted block. Build +
check.

**N4. Protect Pixel's catalogs, and record the question left open.** Rides task N3's commit —
splitting the protection from the pass it protects against is how the protection gets reverted
alone. Add the Pixel Decision from § Decisions above to the plan, **with its measurement
declined rather than pending** — no A/B is scheduled and none should appear on a backlog. In
`.ai-skills/skills/prism-design/shared.md`: **keep** the principle catalogs (Nielsen, Johnson,
Gestalt, named laws, Design Pattern Vocabulary) and add the one-line rationale immediately
above them —

> These are model-resident; the list enforces consistency of citation, not instruction.

— then apply task N3 to Pixel's surrounding prose normally. **Verify:**
`grep -c "Nielsen" .ai-skills/skills/prism-design/shared.md` still returns a non-zero count
after N3 runs, and `grep -c "model-resident" .ai-skills/skills/prism-design/shared.md` returns
`1`. The first is the real check: it is the one place in PR 3B where a task deliberately
protects content from the pass running beside it.

---

#### Eli (documentation) — commit 3, docs

**29. Document the shared core and the two new utility skills.** One task, one commit — 3B
ships both halves, so the split this proposal originally carried is unnecessary.
`.prism/architect/_toolkit/skills-ecosystem.md`: every persona gains a Step-0 core read, and
the roster gains two utility skills. **This file has a `curated` seed twin** at
`templates/install/.prism/architect/_toolkit/skills-ecosystem.md` that does not regenerate and
has drifted 65 lines behind canonical before; hand-edit both. **Verify:** `pnpm prism:check`
green; diff the two and confirm the delta is only the intentional consumer simplification.

#### Clove (implementation) — commit 4, mirrors

**Regenerate every mirror.** `pnpm prism:build`, commit the result, no hand edits.
**Verify:** check out the preceding commit, run `pnpm prism:build`, and confirm
`git status -s` is clean against the mirror commit's tree — the build is deterministic, so a
non-empty diff means a hand edit reached a generated file. Then `pnpm prism:check` green.

---

## Acceptance Criteria

Added to the parent plan's `## Acceptance Criteria` on fold-in. IDs continue from the parent
plan's highest assigned ID; `AC-P3-n` here is a placeholder Sol renumbers.

### Behavioral

- [ ] **AC-P3-1.** Given a PR-3B deletion commit has landed, When a reader opens that commit message, Then
      every deleted block appears as a row naming what it foreclosed, and no row is both
      `deleted` and non-empty in the `Foreclosure` column.
  - Evidence (human): read the commit message's table slice against `git show --stat <sha>`;
    each `deleted` row's `Foreclosure` cell reads *none — <reason>*, and every file in the
    stat has a row · UNMET looks like: a `deleted` row naming a real foreclosure, or a file in
    the stat with no row.
- [ ] **AC-P3-2.** Given Eric reviews a PR after 3A lands, When the summary comment is posted,
      Then it carries a `## Angle Coverage` block with all nine angles and a status token each.
  - Evidence (machine): `gh pr view <n> --comments` and grep the summary for nine angle names
    → all nine present, each followed by `swept`, `n/a —`, or `not reached —` · UNMET looks
    like: fewer than nine lines, or a bare status with no reason on `n/a` / `not reached`.
- [ ] **AC-P3-3.** Given a PR whose plan is missing a `## Decisions` verdict sub-bullet, When
      Briar or Eric reviews it, Then no finding is filed for that omission.
  - Evidence (human): run a review against a branch with a deliberately incomplete plan →
    findings list contains no plan-hygiene entry · UNMET looks like: a Minor citing the
    verdict gate or the retro line.
- [ ] **AC-P3-4.** Given Pixel is invoked after PR 3B, When she audits a UI, Then she still
      cites named principles by name.
  - Evidence (machine): `grep -c "Nielsen" .ai-skills/skills/prism-design/shared.md` returns
    non-zero · UNMET looks like: `0`, meaning N3 swept the catalog N4 was protecting.

### Non-behavioral

- [ ] **AC-P3-5.** No item on the parent plan's reversal list is deleted by any PR-3B deletion
      commit.
  - Evidence (machine): for each reversal-list item, a grep for its distinguishing token
    against the post-3B tree returns non-zero, paired with one deliberately-absent token
    returning zero as the positive control · UNMET looks like: any reversal-list grep
    returning `0`, or the control returning non-zero (the probe never arrived).
- [ ] **AC-P3-6.** `pnpm prism:build && pnpm prism:check` green at 3A's head and at every
      commit in 3B.
  - Evidence (machine): exit 0 on both, run at each commit · UNMET looks like: any non-zero
    exit, or a crossref-lint failure from a citation whose target a deletion commit removed.
- [ ] **AC-P3-7.** No generated mirror appears in any PR-3B commit but the last.
  - Evidence (machine): `git show --stat <sha>` for every non-terminal 3B commit lists no path
    under `.claude/`, `.codex/`, `.cursor/`, or `templates/install/`; positive control — the
    same command on the terminal commit lists many · UNMET looks like: a mirror path in an
    earlier commit (a hand edit reached a generated file), or the terminal commit listing none
    (the build never ran, and the probe proves it).

---

## Review Issues

Briar self-review of PR #471, 2026-08-21, pinned range
`176f35c5..343588ab` on `huntermcgrew/opus5-port-3a-reviewer-scope`.

### `Meta` severity is cited by both reviewer bodies and exists nowhere

- **Axis:** `standards`
- **Severity:** `major`
- **Status:** `fixed` — both bodies now cite the mechanism that exists — under `prism-review-loop` a bookkeeping-section observation is Ledger surface and is not raised during the loop at all.
- **File:** `.ai-skills/skills/prism-code-review-self/shared.md:78`,
  `.ai-skills/skills/prism-code-review-pr/shared.md:82` (+5 generated mirrors each)
- **Problem:** § Plan-file scope closes with *"The `Meta` severity the review loop applies caps
  what such a finding costs once filed"*, but this plan's own Decision *Task 28a ships its
  substance without the `Meta` severity token* rules the token out and instructs future changes
  to repeal the no-new-vocabulary paragraph before adding one — so both bodies now cite a
  mechanism the same PR decided not to build.
- **Class:** prose retained a citation to a mechanism a late deviation removed — the deviation
  was applied in the target file and not in the files that cite it.
- **Sweep:** `grep -rn "Meta" . --exclude-dir=.git --exclude-dir=node_modules` over the whole
  tree — the only hits are these two sentences and their ten mirrors. `grep -n -i "Meta"
  .ai-skills/skills/prism-review-loop/shared.md` — none found.
- **Suggested fix:** replace the sentence with the mechanism that does exist, after resolving
  the next finding: the review loop's surface-provenance split, not a severity token.

### The review-loop composition paragraph contradicts the Ledger bullet above it

- **Axis:** `standards`
- **Severity:** `major`
- **Status:** `fixed` — paragraph rewritten to the composition that holds: the survivors are Subject content and are reviewed at the Subject bar; the Ledger disposition runs over the bookkeeping sections instead. The `below` half of the finding is not upheld — see the Decision below.
- **File:** `.ai-skills/skills/prism-review-loop/shared.md:55-59` (+5 mirrors)
- **Problem:** two errors from one cause. The paragraph says *"The Ledger row **below**"* while
  the Ledger bullet sits ~30 lines above it; and it says the Ledger *"caps what the survivors
  can cost"*, when the survivors of § Plan-file scope are by that rule's own three clauses
  contradictions in `## Implementation Tasks`, `## Decisions`, and `## Acceptance Criteria` —
  which the Ledger bullet explicitly classifies as **Subject** content, not Ledger. The Ledger
  caps the observations § Plan-file scope filters *out* (history-entry length in `## History`),
  not the ones it keeps, so *"upstream filter, downstream cap"* describes a composition that
  does not hold.
- **Class:** a composition claim re-pointed at a second mechanism without re-checking that
  mechanism's stated scope or position.
- **Sweep:** read `.ai-skills/skills/prism-review-loop/shared.md:18-70` in full and diffed the
  Ledger bullet's section list against § Plan-file scope's three survivor clauses; also
  `grep -n "Ledger" .ai-skills/skills/prism-review-loop/shared.md` — three hits, all above the
  paragraph.
- **Suggested fix:** state the composition that is true — § Plan-file scope drops most plan
  observations; the survivors are Subject content and are reviewed at the Subject bar like any
  other finding; the Ledger bullet independently keeps bookkeeping out at every bar. Fix
  `below` to `above` in the same edit.

### Briar's new § Plan-file scope tells her to fix code, contradicting her bounds

- **Axis:** `standards`
- **Severity:** `minor`
- **Status:** `fixed` — Briar's copy now reads *"Note it in one line and move on: plan hygiene is no more Briar's to fix than the code is."* Eric's copy left as-is, per the finding's own second option.
- **File:** `.ai-skills/skills/prism-code-review-self/shared.md:74` (+5 mirrors)
- **Problem:** *"Fix it inline if you own the branch"* is Eric's sentence copied into Briar's
  body unadapted. `:110` of the same file reads *"Briar reviews and flags issues — Clove fixes
  them"*, and `skill-routing.md` § Authors ship, reviewers review binds her the same way.
- **Class:** a paragraph written once for two personas and installed in both without adapting
  the half that turns on the persona's write bounds.
- **Sweep:** `grep -n "Fix it inline if you own the branch" .ai-skills/skills/` — two hits,
  Briar's and Eric's. Checked Eric's copy too: he reviews from a worktree on another author's
  branch, so the clause is thin there as well, but it contradicts nothing in his body.
- **Suggested fix:** in Briar's copy, *"Note it in one line and move on — plan hygiene is not
  hers to fix any more than code is."* Leave Eric's as-is or narrow it the same way.

### `review-angles.md` was never registered in `seed-curation.json`

- **Axis:** `spec`
- **Severity:** `major`
- **Status:** `fixed` — `references/review-angles.md` added to the `mirrored` bucket; rebuilt, and all five seed twins hash `9d276415`, unchanged from before the registration.
- **File:** `.ai-skills/definitions/seed-curation.json`
- **Problem:** task N1 ends *"Register in `.ai-skills/definitions/seed-curation.json` as
  non-curated — it should mirror verbatim"*, and the file carries no entry in any bucket.
  `opus5-port.md:198-201` records constraint C7 for this port — every new file carries a
  classification entry, and *"a file in none of them auto-mirrors and counts as unclassified,
  which is the state C7 exists to forbid"* — and `opus5-port.md:1378` already logs this exact
  defect once against the five guides. The `mirrored` bucket added by #466 (`4cae9ba4`, two
  commits before this branch's base) exists for precisely this shape and currently holds those
  same five guides.
- **Class:** a required declaration skipped because the undeclared default happens to produce
  the same bytes — the reasoning the constraint was written to reject after it failed once.
- **Sweep:** `python3` load of `seed-curation.json` printing all five buckets — `references/`
  entries appear only under `curated` (5 files), and `mirrored` holds the five guides;
  `grep -rn "review-angles" .ai-skills/definitions/` — none found. Read `build.ts:690-712` and
  `:845-860` to confirm the unclassified fall-through writes and byte-compares identically, so
  this is a declaration defect and not a live drift defect.
- **Suggested fix:** add `"references/review-angles.md"` to `mirrored`, rebuild, confirm the
  seed twin hash is unchanged.

### `review-angles.md` defines a chat-side line no PRISM persona is told to emit

- **Axis:** `spec`
- **Severity:** `major`
- **Status:** `fixed` — `**Angle Coverage:**` added to Briar's `## Review format` between **Issues:** and **Accessibility:**, carrying status tokens and counts with the enumerations left in the plan block.
- **File:** `.prism/references/review-angles.md` § Enumeration, *Where it goes* (+4 mirrors)
- **Problem:** the section specifies a chat-side shape — *"The chat-side line carries the angle,
  its status token verbatim, and the counts"*, with three worked examples — and nothing routes
  it. Briar's `## Review format` is a closed enumerated chat contract that opens *"Do not
  duplicate plan content into chat"* and gained no Angle Coverage slot, because task N2 asked
  only for the plan block. Eric's chat is not his surface; his block goes to the summary
  comment via the template. So about a third of § Enumeration has no consumer in this tree.
  This is the port's one unnamed adaptation: the portable roster's `briar/SKILL.md`
  § Review format carries an explicit `**Angle Coverage:**` line, and PRISM kept the paragraph
  describing that line's shape while dropping the instruction that causes it.
- **Class:** a ported spec section whose consumer-side instruction lived in a file the port did
  not touch, leaving the contract described but unreachable.
- **Sweep:** `grep -n "Angle Coverage" .ai-skills/skills/prism-code-review-self/shared.md` —
  one hit, the plan write at `:334`, none in § Review format; same grep against
  `prism-code-review-pr/shared.md` and `.prism/references/code-review-pr/summary-template.md` —
  Eric's path is complete. Compared against `~/.claude/skills/briar/SKILL.md` § Review format,
  which carries the missing line.
- **Suggested fix:** add `**Angle Coverage:** all nine angles, status token verbatim, counts
  only — enumerations stay in the plan` to Briar's `## Review format`, between **Issues:** and
  **Accessibility:**. Deleting the chat-side paragraph instead is the weaker fix — the counts
  line in chat is what makes a bounded angle visible mid-loop.

### `review-angles.md` names the review loop as a coverage-gating consumer that does not gate

- **Axis:** `spec`
- **Severity:** `minor`
- **Status:** `fixed` — the `(the review loop's convergence check)` parenthetical is dropped; the sentence stands conditional on a consumer that gates, and none is named.
- **File:** `.prism/references/review-angles.md` § Status vocabulary and § Enumeration
  (*Status interaction*) (+4 mirrors)
- **Problem:** both sections assert a consumer gating on coverage, the second naming it — *"(the
  review loop's convergence check)"*. `prism-review-loop/shared.md` contains no occurrence of
  "angle" or "coverage"; its exit condition is **subject-clean**, two consecutive passes with
  zero subject-surface findings. The parenthetical asserts an integration that does not exist.
- **Class:** a cross-file integration claim ported verbatim without checking the named consumer
  in this tree.
- **Sweep:** `grep -n -i "angle\|coverage\|convergence" .ai-skills/skills/prism-review-loop/shared.md`
  — no angle or coverage hits; `grep -n -i "exit\|clean pass" ` on the same file returns
  subject-clean and thread-clean only.
- **Suggested fix:** drop the parenthetical and leave the sentence conditional, or wire the loop
  and keep it. Do not leave it naming a consumer that is not one.

---

Briar re-review of PR #471, 2026-08-21, pinned range `176f35c5..8c82764f`. All six
round-1 findings verified `fixed` at source. One new Major, and the round-1 Major 3
direction half overturned by its own author.

### Round-1 Major 3, direction half — overturned; Clove's partial rejection is upheld

- **Axis:** `spec`
- **Severity:** `major` (round-1 grading, retained for the record)
- **Status:** `fixed` — the scope half was real and is fixed; the direction half was my error.
- **File:** `.ai-skills/skills/prism-review-loop/shared.md:60`
- **Problem:** I wrote that *"the Ledger row **below**"* pointed the wrong way, having read it
  against the Ledger bullet in § Review surfaces at `:27`, which sits above the sentence.
- **Why the rejection is correct:** two independent cues both resolve `below` to the Disposition
  table at `:102-106`, which is genuinely below. First, *row* is the word for a table line —
  § Review surfaces is a bulleted list and has no rows, and the Disposition table is the only
  table in the section. Second, the sentence paraphrases that row's own cell text: the pre-fix
  wording *"swept once at close and never drive another pass"* tracks the cell *"not raised
  during the loop; swept once at close"* at `:106`. A cold reader following either cue lands on
  the table; my reading required ignoring both.
- **What stands from the finding:** the scope half — the Ledger row caps what the plan-scope
  rule *filters out*, not what it *keeps*, because the survivors are Subject content. Clove
  accepted and fixed that, and the rewrite now names `**Disposition**` explicitly so two
  same-named references stop competing for a bare direction word. That naming is an
  improvement, not a repair: `below` resolved correctly before it.
- **Class:** reviewer resolved a relative direction word against the nearest same-named
  reference rather than against the one the surrounding prose paraphrases.
- **Sweep:** `grep -n "Ledger" .ai-skills/skills/prism-review-loop/shared.md` — two references
  (`:27` bullet, `:106` table row) plus the new `:60` pointer; read both against the paragraph
  at head, and only the table row matches the paraphrase.
- **Suggested fix:** none — no change owed. Recorded so the record says which way this went.

### The bounded-angle verdict cap has no slot in either reviewer's verdict surface

- **Axis:** `spec`
- **Severity:** `major`
- **Status:** `fixed` — one clause each side, both citing the cap rather than restating it.
  Briar's `**Verdict:**` line gains a third state, `Ready except <angle> — needs <specific
  check>`, and states that `Ready for PR` is unavailable until every angle reports `swept` or
  `n/a`. Eric's `## PR Readiness` gains a second checkbox obliging the `## Summary` to name the
  angle and the check still owed while the box is unchecked. Both fixes landed in canonical
  files and rebuilt; the five `review-angles.md` twins hash `4b7624af` and the five
  `summary-template.md` twins hash `1d6b21ab`.
- **File:** `.prism/references/review-angles.md:52` (§ Status vocabulary), against
  `.ai-skills/skills/prism-code-review-self/shared.md:315` and
  `.prism/references/code-review-pr/summary-template.md` § PR Readiness
- **Problem:** the new fragment states *"A bounded angle — any angle whose status is not
  `swept` or `n/a` — caps the reviewer's own verdict: the reviewer does not report an
  unqualified ready state while one stands, and the best available verdict names the angle and
  the specific check still owed."* Neither reviewer's verdict surface can express that. Briar's
  is binary — `**Verdict:** Ready for PR (or: N Major, M Minor to fix)` — so a zero-findings
  pass carrying one bounded angle has to emit *Ready for PR*, the unqualified ready state the
  fragment forbids, in exactly the case where zero findings is least informative. Eric's
  `## PR Readiness` checklist carries no bounded-angle line; his `## Summary` paragraph is free
  prose that *may* carry the qualification but is never required to, and nothing connects the
  `## Angle Coverage` block's bounded statuses to the readiness statement.
- **Why this fires deterministically rather than occasionally:** Eric's lightweight path, added
  in this range at `prism-code-review-pr/shared.md:198`, mandates that the three Spec-axis
  angles report `not reached — lightweight path, Spec axis skipped`. Every docs-only PR
  therefore carries three bounded angles by construction, and Eric's readiness surface has no
  way to say so. That is the lightweight path's normal output, not a rare edge.
- **Why it lands in this range rather than pre-existing:** `review-angles.md` is new here, so
  the obligation is new. Task N1 listed § Status vocabulary among the sections to port and the
  verdict-cap sentence rode along inside it; task N2 wired the coverage *block* into both bodies
  but named no change to either verdict line. The gap sits between the two tasks, not against
  either one as written.
- **Class:** a ported fragment states an obligation on an output surface the same range left
  unchanged — the identical defect class as round-1's *"the file described a table nothing
  caused"*, one section over.
- **Sweep:** `grep -rn "bounded" .ai-skills/skills/prism-code-review-self/shared.md
  .ai-skills/skills/prism-code-review-pr/shared.md
  .prism/references/code-review-pr/summary-template.md` — zero hits in all three; the word lives
  only in `review-angles.md`. `sed -n '/^## Review format/,/^## /p'` on Briar's body confirms
  the two-state verdict line, and a full read of `summary-template.md` confirms no readiness
  line for coverage.
- **Suggested fix:** one clause each side. Briar's `**Verdict:**` line gains a third state —
  `Ready except <angle> — needs <specific check>`, valid at zero findings while a bounded angle
  stands. Eric's `## PR Readiness` gains one checkbox: *No bounded angle stands in
  `## Angle Coverage` (a bounded angle names the check still owed in the Summary)*. Both cite
  `review-angles.md` § Status vocabulary rather than restating the cap.

### Angle Coverage — round 1 (range `176f35c5..343588ab`)

Briar sweeps all nine in one pass; no line carries an axis attribution.

- **Runtime behavior** — `swept` — 3 items enumerated, 3 verdicts
  - Generated mirrors of `review-angles.md` across `.claude/`, `.codex/`, `.cursor/`,
    `templates/install/` — byte-identical to canonical (`shasum`, all five `346de365074c`) — clean.
  - AGENTS.md inlined `branch-plan.md` block — regenerated and matches canonical — clean.
  - `pnpm prism:build && pnpm prism:check` — exit 0 both, `git status -s` empty afterwards — clean.
- **Test efficacy** — `swept` — 3 items enumerated, 3 verdicts
  - Mirror parity — covered by `checkSeedDrift`'s byte compare inside `pnpm prism:check`; fails
    on drift — adequate.
  - Link resolution for the new `../review-angles.md` and
    `../../../.prism/references/review-angles.md` citations — covered by `prism:crossref-lint` —
    adequate.
  - The four deleted plan-hygiene instructions staying deleted — no regression guard; task N2's
    grep probe is manual and runs once. Gap named, not filed: PRISM has no prose-assertion
    harness, and building one for a single absence check is out of proportion.
- **Spec and doc consistency** — `swept` — 7 items enumerated, 7 verdicts
  - N1 § Axis-split and § Finding-anatomy adaptations — both present as specified — met.
  - N1 register-in-`seed-curation.json` step — unmet — finding 4.
  - N2 four edits — all four present; negative probe
    `! grep -q "missing a verdict sub-bullet as Minor"` passes, positive control
    `grep -c "Decision verdict gate" .prism/rules/branch-plan.md` returns 1 — met.
  - N2 § Before Closing clause — the section carries no reviewer or Minor mention, so there was
    nothing to delete; folding the note into § Decision verdict gate is correct — met.
  - 28a substance — exempt-surface additions, third incident, composition line all present;
    token deviation documented as a Decision — met, with finding 2 against the composition line.
  - AC-P3-3 (no finding filed for a missing verdict sub-bullet) — satisfied by the new
    § Plan-file scope — met.
  - `review-angles.md` chat-side surface — described, unreachable — finding 5.
- **Citation integrity** — `swept` — 5 items enumerated, 5 verdicts
  - `Meta` severity, cited in both reviewer bodies — does not exist — finding 1.
  - *"The Ledger row below"* — wrong direction and wrong scope — finding 2.
  - *"(the review loop's convergence check)"* — names a non-gating consumer — finding 6.
  - `[review-angles.md](../review-angles.md)` from `summary-template.md` — resolves in all five
    buckets — clean.
  - `[review-angles.md](../../../.prism/references/review-angles.md)` from both skill bodies —
    resolves from `.ai-skills/skills/<skill>/`, `.claude/skills/<skill>/`,
    `.cursor/skills/<skill>/`; `crossref-lint` green — clean.
- **External-system claims** — `swept` — 4 items enumerated, 4 verdicts
  - `build.ts` unclassified fall-through writes verbatim and byte-compares — verified at source,
    `:690-712` and `:845-860` — confirmed.
  - `mirrored` bucket semantics ("ships, byte-identical, rename-aware") — verified at
    `build.ts:76-89` and `:791-800` plus the bucket's five current entries — confirmed.
  - `unclassifiedMirrored` warns only when `seedFileIsNew` — verified at `build.ts:859` — confirmed,
    which is why a re-run is silent and cannot serve as the check.
  - `Meta` as a token the review loop applies — verified absent — refuted, finding 1.
- **Repo writing rules** — `swept` — `verdict-only`
- **Security** — `n/a — no auth, input handling, secrets, permissions, or trust boundary in the
  pinned range; the diff is markdown and one JSON-adjacent omission`
- **Docs impact** — `swept` — 2 items enumerated, 2 verdicts
  - `docs/personas.md` — Briar and Eric entries describe their surfaces generically ("reports
    findings in chat and in the branch plan's `## Review Issues`"), still accurate — clean.
  - `docs/adopting-into-existing-repos.md` — mentions code-review skills only by name, carries no
    reviewer plan-hygiene content — clean.
- **Accessibility** — `n/a — no UI in the pinned range`

### Angle Coverage — round 2 (range `176f35c5..8c82764f`)

Briar sweeps all nine in one pass; no line carries an axis attribution.

- **Runtime behavior** — `swept` — 3 items enumerated, 3 verdicts
  - `seed-curation.json` `mirrored` gains `references/review-angles.md` — routes the file to
    `checkSeedDrift`'s mirrored branch at `build.ts:619` instead of the unclassified fall-through
    at `:653`. Both byte-compare for a non-renamed path, so the registration is behaviorally
    neutral; what it buys is a declared classification — clean, and clove's claim confirmed.
  - Five copies of `review-angles.md` byte-identical after the rebuild — `shasum` `9d276415` on
    all five — clean.
  - `pnpm prism:build` and `pnpm prism:check` re-run by me — exit 0 both, `git status -s` empty
    afterwards, so the mirrors are deterministic against this tree — clean.
- **Test efficacy** — `swept` — 2 items enumerated, 2 verdicts
  - The `mirrored` classification — exercised by the bucket's five pre-existing non-renamed
    entries through `checkSeedDrift` inside `pnpm prism:check`; a per-entry test would add
    nothing — adequate.
  - `unclassifiedMirrored` as a regression guard for a forgotten registration — inadequate, and
    worth naming precisely because clove cited the gating as evidence: `build.ts:816` and `:859`
    push to that list only when `seedFileIsNew`, so the warning fires once, on the build that
    creates the twin, and is silent on every build after. It could not have caught this file
    after round 1. The registration is still right; the warning is not the thing that makes it
    right, the declared bucket is.
- **Spec and doc consistency** — `swept` — 7 items enumerated, 7 verdicts
  - Round-1 Major 1 (`Meta` cited, nonexistent) — both bodies now cite the surface-provenance
    split — fixed.
  - Round-1 Major 2 (composition paragraph) — rewritten to "two filters aimed at different
    sets"; scope corrected — fixed.
  - Round-1 Major 3 — scope half fixed; direction half overturned above — resolved.
  - Round-1 Major 4 (`seed-curation.json` registration) — present in `mirrored` — fixed.
  - Round-1 Minor 5 (chat-side coverage surface unreachable) — Briar's `## Review format` gains
    the `**Angle Coverage:**` slot and the plan write gains the `### Angle Coverage` block;
    both match `review-angles.md` § Enumeration *Where it goes* — fixed.
  - Round-1 Minor 6 (parenthetical naming the review loop as a coverage-gating consumer) —
    parenthetical dropped, sentence left conditional — fixed, and it is the drop that leaves the
    reviewer itself as the only consumer gating on coverage, which is what the new Major turns on.
  - 28a Decision *Chosen approach* amendment — checked against the `1d1e0374..cec5368b` diff
    clause by clause: exempt surface gains the PR body and the loop's readiness line, third
    incident recorded, composition line corrected in-PR. The amendment describes what happened
    and does not overclaim — met.
- **Citation integrity** — `swept` — 8 items enumerated, 8 verdicts
  - *"the Ledger row under **Disposition** below"* — Disposition table at `:102-106`, below the
    sentence at `:60` — resolves.
  - `branch-plan.md` § Decision verdict gate → *"each reviewer skill's § Plan-file scope"* —
    both exist (`self:72`, `pr:76`) — resolves.
  - `branch-plan.md` → *"§ Before Closing above"* — exists at `:190` — resolves.
  - Eric lightweight path → `review-angles.md` § Status vocabulary structural class — the class
    is defined there and the reason given names a diff property (docs-only) — resolves.
  - `[review-angles.md](../review-angles.md)` from `summary-template.md` — resolves in all five
    buckets — clean.
  - `[review-angles.md](../../../.prism/references/review-angles.md)` from both reviewer bodies,
    four sites — `crossref-lint` green inside `prism:check` — clean.
  - `review-angles.md`'s three rule citations (`code-comments.md`, `code-standards.md`,
    `writing-voice.md`) — all three files exist — resolve.
  - Removal completeness for the four deleted plan-hygiene instructions — tree-wide
    `grep -rn "surfaces missing verdicts\|missing verdicts as a Minor\|surface it as Minor"`
    over the whole repo returns only two hits, both in `.prism/plans/`: a `> Closed:` historical
    plan and this proposal quoting the old text as the thing it replaces. Neither is a surviving
    mandate — clean.
- **External-system claims** — `swept` — 2 items enumerated, 2 verdicts
  - Clove's *"`checkSeedDrift` now gates the file explicitly rather than letting it fall through
    unclassified"* — verified at `build.ts:619` against the fall-through at `:653-661` —
    confirmed, with the qualification recorded under Test efficacy above.
  - Windows line-ending sensitivity of the byte-exact seed compare — `.gitattributes` pins
    `* text=auto eol=lf` repo-wide with a comment naming this exact failure, so a Windows
    checkout cannot introduce CRLF asymmetry — confirmed, and confirmed empirically by
    `gh pr checks 471`: both `prism-check (ubuntu-latest)` and `prism-check (windows-latest)`
    pass on head `8c82764f`.
- **Repo writing rules** — `swept` — `verdict-only`
- **Security** — `n/a — no auth, input handling, secrets, permissions, or trust boundary in the
  pinned range`
- **Docs impact** — `swept` — 1 item enumerated, 1 verdict
  - `.prism/architect/_toolkit/skills-ecosystem.md` does not yet name `review-angles.md` as a
    fragment two personas read. Task 29 (PR 3B) owns that file by the plan's own cut table, so
    this is scheduled work rather than a gap — clean.
- **Accessibility** — `n/a — no UI in the pinned range`

### The bounded-angle cap reached only one of Eric's two verdict surfaces

- **Axis:** `standards`
- **Severity:** `major`
- **Status:** `fixed` — the portable clause is ported into § Decision gate state `#3`, the
  closing lines that report the label carry the same qualification, and the readiness checkbox
  is narrowed to pass-bounded.
- **File:** `.ai-skills/skills/prism-code-review-pr/shared.md:345-348` (§ Decision gate) and
  `:396-397` (§ After the review), against
  `.prism/references/code-review-pr/summary-template.md:43`
- **Problem:** round 2 gave the cap a slot on Eric's `## PR Readiness` checkbox, but Eric has
  two verdict surfaces and the decision gate — the one that emits labels and fires the
  ready-flip — was untouched. On the full path with a pass-bounded angle, Eric landed zero
  findings, both axes clean, checkbox unchecked, and still applied `confidence:high`: the
  unqualified ready state the cap forbids, and the signal a human scans to merge without
  reading. The port dropped the clause *and* its pass-bounded scoping, which is why the
  checkbox read "No bounded angle" and the PR body had to defend a permanently-unchecked box
  on every docs-only PR.
- **Class:** third instance in this PR of a spec clause added to one consumer surface while a
  sibling surface with the same authority is left unreconciled.
- **Why the round-2 third-instance search missed it:** the search ran inside
  `review-angles.md`. A clause with no consumer has its other half in the consumer file by
  construction, so a search scoped to the clause's own file can only ever find half the class.
  The reusable form: when the class is "X has no consumer," sweep the consumers, not X.
- **Fix as applied, and where it goes past Eric's prescription:** Eric named § Decision gate
  and the checkbox. The closing lines in § After the review are a third site reading
  "Both axes ran clean → `confidence:high`" with no bounded qualification — the portable source
  carries the cap there too (`~/.claude/skills/eric/SKILL.md:316`), and porting only the gate
  would leave the reporting surface stating the label the gate had just been taught not to
  emit. All three landed together.

### § Reporting orphans § Re-sweep obligation's thinnest-enumeration trigger

- **Axis:** `spec`
- **Severity:** `major`
- **Status:** `fixed` — the enumeration is now the evidence of range coverage, and § Re-sweep's
  trigger collapses to the bounded set alone.
- **File:** `.prism/references/review-angles.md:102` against `:110`
- **Problem:** the sweep-before-report clause declares that a pass may not report until every
  angle has been swept across the whole reviewed range. § Re-sweep obligation, eight lines
  below, still triggered on "the ones whose enumeration was thinnest" — a proxy for
  *probably under-swept*, which § Reporting had just declared impossible. For a compliant pass
  the trigger was unreachable; for a non-compliant one § Reporting was already violated. The
  trailing sentence named the division of labour but asserted the composition rather than
  showing it.
- **Class:** newly-added absolute clause invalidates the premise of an existing clause in the
  same file, left unreconciled — `.prism/rules/code-standards.md` § Removal and rename
  completeness biting on its own terms, since the flipped predicate shares no symbol with the
  prose that reads it.
- **Fix as applied, and the one placement change from Eric's prescription:** Eric's shape is
  taken whole — an angle whose enumeration reaches only part of the reviewed range reports
  `not reached`, not `swept`. It lands in § Enumeration's **Status interaction** paragraph
  rather than in § Reporting, because that paragraph already owns the adjacent rule (a `swept`
  with *no* enumeration reads as bounded) and already carries the `verdict-only` carve-out that
  keeps Repo writing rules out of the new rule's reach. § Reporting then gains its observable
  by citation instead of a second copy. Two clarifications ride along, both against misreadings
  the deleted "thinnest" heuristic invites: an angle swept end to end that turned nothing up
  reports `swept — no items`, and a short enumeration over a full range is a finished sweep.

### "One section over" is a spatial claim that was never resolved against the file

- **Axis:** `spec`
- **Severity:** `minor`
- **Status:** `fixed` — the phrase is dropped, and the `**Why:**` now cites the third instance
  Eric's own pass found.
- **File:** `.prism/references/review-angles.md:104`
- **Problem:** round-1's Major landed at `prism-code-review-self/SKILL.md:347` and round-2's at
  `:341` — six lines apart inside the same `## Review format` section, with the other half of
  round-2's fix in a different file. Neither reading makes it "one section over." The detail
  was true in the writer's working set mid-run and ships to consumer repos via
  `templates/install/.prism/references/review-angles.md`, which is
  `.prism/rules/writing-voice.md` § Anti-pattern: Session-context leakage.
- **Suggested fix:** dropped rather than corrected to "six lines from the first" — the sentence
  lands harder without the spatial detail, and "a spec clause with no consumer" already carries
  the point.

### Two of the PR body's four verification probes no longer reproduce

- **Axis:** `spec`
- **Severity:** `minor`
- **Status:** `fixed` — both literals are replaced with claims that survive the next edit.
- **File:** PR #471 body, `## Verification`
- **Problem:** the `not reached` count read `7` against an actual `8`, and the five-copy hash
  read `4b7624af` against an actual `3fdb2231` — both stale since round 2 landed, one root
  cause. The verification block's job is to let a reader skip re-running the probes, so two of
  four returning different values costs more trust than a shorter block would have.
- **Fix as applied:** resynced as rules rather than literals, per
  `.prism/rules/writing-voice.md` § Count rules, not numbers — a presence probe for the third
  status token, and byte-identity verified by `checkSeedDrift` rather than a hash literal. A
  literal count would have gone stale inside this same pass: the § Enumeration fix adds another
  `not reached` occurrence.

### Eric's qualification on the two round-2 not-a-defect gradings

Both gradings hold, and Eric confirmed them rather than re-deriving. One qualification on the
always-on `n/a` discrepancy: Briar's coverage blocks carry `n/a` only on Security and
Accessibility, both *triggered* angles, so the always-on path has never been exercised. **That
one stays argument, not evidence, and no cheap observation converts it** — an emission would
require a real pass on a diff where one of the six always-on angles genuinely does not apply,
and manufacturing a synthetic one would be a fabricated observation rather than a check. The
slot argument itself is verified: § Enumeration requires the status token verbatim including
its `— <reason>` on both surfaces.

### Briar's verdict state is not narrowed to pass-bounded — checked, not overlooked

Eric's Major narrows Eric's checkbox from "bounded" to "pass-bounded" because a structural bound
is honest as `confidence:standards-only`. Briar's third verdict state
(`prism-code-review-self/shared.md:326`) keeps the wider "bounded" reading deliberately. The
clause is unchanged either way; what changed is the reason on the record. Eric supplied the
stronger one and it supersedes the enumeration first written here: § Status vocabulary already
routes "does not apply to this diff" to `n/a`, so what reaches `not reached` is an angle that
applies, and for a reviewer with no axis to skip nothing makes that terminal. Bounded and
pass-bounded denote the same set for Briar by construction, where the enumeration held only
under today's producer inventory and would have gone stale the moment a second structural
producer landed. One residual keeps this short of absolute: § Status vocabulary defines
structural as the reason naming the *diff*, with the axis skip as "such as" rather than a closed
set, so a future non-axis structural producer is not formally foreclosed. Narrowing her clause
would still add a distinction she has no way to produce.

### The absorbed PR-body sentence cited a review-loop run that never happened

- **Axis:** `spec`
- **Severity:** `minor`
- **Status:** `fixed` — the rule stands, the loop attribution is gone.
- **File:** `.ai-skills/skills/prism-review-loop/shared.md:46`, plus the two generated mirrors
- **Problem:** the sentence absorbed under Decision: The loop's exempt PR body read "the loop can
  converge clean while that block states counts and hashes an earlier round moved. PRISM PR #471
  did exactly that." No `prism-review-loop` run ever ran on #471 — every `## Sessions` header
  reads `dispatched by Sol under run architect-gate-port, lane 3a`, and the tree holds no
  `loopBase`, pass budget, or scoreboard for it. The Ledger exemption the paragraph qualifies is
  scoped to a loop run, so it was never in force. The `**Why:**` nine lines below cites `#446`
  with a resolvable merge sha, which sets the standard the neighbour missed.
- **Fix as applied:** kept the rule and the evidence, dropped the attribution — "PRISM PR #471
  carried exactly that drift twice — outside a loop run, caught by a review pass over the body
  itself." The drift is real and recorded above under § Two of the PR body's four verification
  probes; only the loop framing was false. Citing a genuine loop incident instead was considered
  and is unavailable: the PR-body exemption is introduced by this very change, so no loop run has
  exercised it yet.

---

## Cleanup Items

- `.ai-skills/skills/prism-code-review-self/shared.md:72-80` and
  `prism-code-review-pr/shared.md:76-84` — § Plan-file scope is byte-identical in both reviewer
  bodies. `.prism/references/review-frameworks.md` is already the shared catalog both reviewers
  consume and already owns § Severity Classification, which is where this plan's own Decision
  says the rule promotes at close. The same PR introduces `review-angles.md` on exactly that
  shared-reference pattern two sections away. Non-blocking, and the author could reasonably keep
  it inline for read-locality.

---

## PR Readiness

- [x] No critical or major issues — round 1's 4 Major and 2 Minor, round 2's 1 Major, Eric's
      round-3 2 Major and 2 Minor, and Eric's round-4 1 Minor are all `fixed`
- [x] Types correct — no `any`, no unsafe `as` — n/a, no TypeScript in the diff
- [x] No stray console.logs or debug artifacts
- [x] Tests written for new logic and edge cases — no new logic; existing seed-drift and
      crossref-lint coverage carries the diff
- [x] All debugged issues resolved (no `open` entries)
- [x] Build passes — last run: 2026-08-21 after Eric's round-4 fix, `pnpm prism:build` exit 0
      and `pnpm prism:check` exit 0 with 775/775 tests
- [x] PR description up to date — re-synced 2026-08-21 after Eric's round-4 pass; the round-3
      resync already replaced the two stale verification literals with claims that survive the
      next edit
- [ ] Lasting decisions promoted to architect context — three Decisions carry
      `→ promotion verdict pending — resolves at PR 3A close`

**Last updated:** 2026-08-21

---

## History

- 2026-08-20 [pr3-replan]: Wrote this proposal replacing `opus5-port.md` tasks 20–29. Cut PR 3
  into 3A–3D, added the foreclosure criterion, reversed the angle-table deferral, and recorded
  the Pixel question as OPEN with a default path; see Decisions.
- 2026-08-20 [pr3-replan]: Reshaped on Hunter's two rulings — two PRs instead of four, and
  Pixel's catalogs kept with the A/B declined rather than pending. Commit boundaries inside 3B
  now carry the review and rollback structure the dropped PR boundaries were carrying; see
  Decision: 3B's three accepted risks.
- 2026-08-20 [huntermcgrew/opus5-port-3a-reviewer-scope]: Shipped PR 3A — tasks N1, N2, and 28a.
  Added `.prism/references/review-angles.md`, wired the coverage block into Briar and Eric, and
  replaced the four plan-hygiene instructions plus the `branch-plan.md` clause mandating them
  with the plan-scope rule. 28a shipped without its `Meta` token; see Decision: Task 28a.
- 2026-08-21 [huntermcgrew/opus5-port-3a-reviewer-scope]: Briar self-reviewed PR #471 — 4 Major,
  2 Minor, all recorded in `## Review Issues` with the nine-angle coverage block. The four Major
  are the dropped `Meta` token still cited by both reviewer bodies, the review-loop composition
  paragraph contradicting its own Ledger bullet, the missing `seed-curation.json` registration
  task N1 asked for, and a chat-side coverage line `review-angles.md` defines with no consumer.
- 2026-08-21 [huntermcgrew/opus5-port-3a-reviewer-scope]: Closed all six review findings —
  the `Meta` citations, the loop's composition paragraph, Briar's chat-side Angle Coverage slot,
  the `mirrored` registration, Briar's unadapted disposition sentence, and the non-gating
  consumer parenthetical. Major 3 is upheld on scope only; see Decision: Briar's Major 3.
  Declined the § Plan-file scope fold for this PR; see Decision: § Plan-file scope stays inline.
- 2026-08-21 [huntermcgrew/opus5-port-3a-reviewer-scope]: Briar re-reviewed the range
  `176f35c5..8c82764f`; all six round-1 findings verified fixed at source, and Major 3's
  direction half overturned in Clove's favour. One new Major opened — the bounded-angle verdict
  cap in `review-angles.md` has no slot in either reviewer's verdict surface.
- 2026-08-21 [huntermcgrew/opus5-port-3a-reviewer-scope]: Closed the bounded-angle Major with one
  clause on each reviewer's verdict surface, and added Hunter's sweep-before-report rule as a
  clause on § Reporting; see Decision: Sweep-before-report. The invited third-instance check came
  back negative on two examined candidates, recorded in this run's `## Sessions` close.
- 2026-08-21 [huntermcgrew/opus5-port-3a-reviewer-scope]: Eric PR-reviewed the pinned range
  `176f35c5..6dfa25d7` — 2 Major, 2 Minor, no critical. The third instance of the no-consumer
  class is his Major 1, in Eric's own § Decision gate; the round-2 search missed it by scoping to
  `review-angles.md`, and a clause with no consumer has its other half in the consumer file.
- 2026-08-21 [huntermcgrew/opus5-port-3a-reviewer-scope]: Closed all four of Eric's findings —
  the bounded-angle cap ported into § Decision gate and the closing lines with the checkbox
  narrowed to pass-bounded, the enumeration made the evidence of range coverage so § Re-sweep's
  trigger collapses to the bounded set, the unverified spatial detail dropped, and the PR body's
  two stale literals replaced with rules. Absorbed Eric's review-loop observation as one
  sentence; see Decision: The loop's exempt PR body.
- 2026-08-21 [huntermcgrew/opus5-port-3a-reviewer-scope]: Closed Eric's round-4 Minor — the
  absorbed PR-body sentence cited a `prism-review-loop` run that never happened on #471, so the
  loop attribution is dropped and the real drift kept. Also swapped Eric's stronger reasoning for
  the enumeration behind Briar's un-narrowed verdict state, with the residual named.
