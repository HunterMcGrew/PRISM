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
recorded, and the composition with the new plan-file scope is stated — that rule shrinks the set
of plan observations that are findings; the Ledger row caps what the survivors cost.

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
