# Retro — prism-consumer-delivery-fixes

**Target:** `.prism/plans/prism-consumer-delivery-fixes.md`
**Grain:** per-pr
**Generated:** 2026-08-18

## Summary

The lane shipped correctly — CI green on both platforms, 685/685 tests, review threads closed to zero across two reviewers and five rounds — but the review process is doing more of the correctness work here than usual, and two of the specific things it caught point at gaps that will recur unless something changes. The plan shipped with no `## Acceptance Criteria` section, which is the direct, traceable cause of Eric's final `confidence:needs-judgment` label rather than `high`. Both Majors this lane surfaced (Briar's doctor false-positive, Eric's packaging-parity gap) were escapes the test suite was structurally unable to catch on its own — one because every fixture used unrealistic empty test data, the other because a gate built for exactly this bug class was never told about the new file. A doc fix also left its own twin sentence false two files over, needing a full extra review round to catch.

## Charter coverage

| # | Charter item | Answerable | Source | Note |
|---|---|---|---|---|
| 1 | Did we do what we said? | partial | plan `## Decisions` (Eric's "Spec/plan consistency: swept" axis), plan itself | All 5 Decisions verified against the diff and hold as written. But the plan has **no `## Acceptance Criteria` section** — "did we do what we said" has nothing to check the shipped behavior against beyond the Decisions log. This is the item this retro weighs in on hardest; see Findings. |
| 2 | Issues / bottlenecks? | yes | run-control log (`.prism/plans/conductor/architect-gate-port.md` `## Log`), plan `## Sessions` | 3 review rounds with Briar (self-review + re-review), 3 review rounds with Eric (review + 2 re-reviews), 3 Clove fix passes. Every round found something real — no round was a rubber stamp. |
| 3 | Actionable items? | yes | plan `## Review Issues`, run log | See Action Items below. |
| 4 | Followed code standards? | yes | plan `## Review Issues`, PR review threads (`gh pr view 460`), run log | Eric's 13 Minors covered comment voice, untested branches, an unenforced bijection, an overreaching JSDoc claim, and a broken remedy path — all fixed or explicitly dispositioned. |
| 5 | Did anything wrong / could do better? | yes | plan `## Review Issues`, run log | See Findings below — the test-fixture homogeneity and the unregistered runtime-read path are the two substantive misses. |
| 6 | Tests passing (CI record)? | yes | `gh pr view 460 --json statusCheckRollup` | `prism-check (ubuntu-latest)`: SUCCESS. `prism-check (windows-latest)`: SUCCESS. Local: `pnpm prism:check` 685/685, re-run independently by both reviewers and by Sol at each fix-pass ratification. |

**Evidence counts:** plan — 8 `## Sessions` entries, 7 `## History` entries, 5 `## Decisions` (1 superseded-and-corrected), 5 `## Review Issues` entries (1 major + 2 minor from Briar, 1 major + 13 minor from Eric, 1 minor twin-fix); execution record — 9 commits (`76c2f7de..HEAD`), 22 files changed (1041+/55-), 2 PR review passes from Eric with 7 inline threads all resolved, 2 self-review passes from Briar; CI — 2 check runs, both SUCCESS.

**PR not yet merged** — CI here is the PR's own check run (`prism-check` on ubuntu/windows), not `main` CI. This is an approximation of item 6, not the real thing: `main`'s CI on the eventual squash commit is the fact this table is standing in for.

## Fidelity gap

Shipped matches the stated Decisions — no divergence between what `## Decisions` claims and what the diff does. The gap is structural, not a broken promise: the plan never wrote down what "done" meant in AC form, so there's nothing to check the shipped behavior against beyond the Decisions log itself. Eric's own review said as much — the Spec axis in his `## Review Issues` "Angle Coverage" entry names the missing AC section explicitly and calls it "not this review's to fix."

## Findings

### 1. The plan shipped with no `## Acceptance Criteria` section

**Evidence:** direct read of `.prism/plans/prism-consumer-delivery-fixes.md` — the file has `## Implementation Tasks`, `## Decisions`, `## Sessions`, `## History`, `## Review Issues`, `## Cleanup Items`, `## PR Readiness`, but no `## Acceptance Criteria` heading anywhere. Confirmed independently by Eric's `## Review Issues` "Angle Coverage" entry: *"No AC section exists for this plan (known gap, routed to Winston by Sol per the run log — not this review's to fix)."* Confirmed by the run-control log's `[verdict detail]` at line 142: *"`needs-judgment` rather than `high` because the Spec axis ran **partial**: with no `## Acceptance Criteria` in the plan, AC conformance had no input."*

**Root cause, traced through the run log:** this lane never went through Winston. The dispatch log (`.prism/plans/conductor/architect-gate-port.md` line 92) shows Sol dispatching straight to Clove: *"pr0 → clove (subagent, worktree): ship the two consumer delivery fixes."* `branch-plan.md`'s template puts `## Acceptance Criteria` under "Added by the architect skill (Winston)" — no Winston pass, no AC section. The mechanism (`seed-curation.json`'s rename inversion) came from Winston's *other* work on this run (the `opus5-port.md` amendment task 15b, referenced in the run log's `pr0` summary line), so a plan existed and a spec existed, but neither ever passed through the step that writes AC into *this* plan file.

**Should the charter have caught this earlier?** Yes, and the mechanism to catch it already exists — it just wasn't run here. `plan-before-building.md` requires planning (not just implementation dispatch) for any task spanning 3+ steps or a real architectural decision, and this lane had one: `## Decisions` bullet 2 documents a real branch point (consumer-owned files get a one-time seed write; prism-owned files need the rename threaded through the whole `update` pass) that's exactly the kind of call `plan-before-building.md` reserves for a planning pass. Session-orientation's opening battery Q3 ("what does done look like") is the other net — a session that actually answered that question for a plan with no AC section would have surfaced the gap on Clove's first `open:` line, not five review rounds later.

**The pattern for the charter:** direct-to-implementation dispatch (skipping Winston) skips whatever Winston would have written into the plan along the way — AC chief among them. This is a lane-shape risk, not a one-off. It's already surfaced once this run and been routed to Winston as a side-finding (run log line 103); this retro's job is to name the pattern, not re-route the same finding twice.

### 2. Two different kinds of gate escape — worth distinguishing, not collapsing

**Briar's Major** (`checkSeedDelivery` false-positives a never-adopted consumer): **a gate that never had the coverage.** Every test fixture in `doctor.test.ts` used an empty `renames: {}` table (per Briar's `## Review Issues` entry: *"every existing test — including the 'fresh repo is healthy' test itself — runs `checkSeedDelivery` over zero rename entries and never exercises it against the real, non-empty production table"*). This is a fixture-design gap: the suite tested a shape of the world that doesn't exist in production.

**Eric's Major** (`seed-curation.json` unregistered in `verify-pack-parity.ts`): **a gate that exists for exactly this bug class and wasn't told about the new file.** The run log (line 120) notes the gate *"cit[es] the 0.7.1 `config.schema.json` incident"* — this is not a novel failure mode, it is the same failure mode the gate was built to prevent, recurring because a new runtime-read path didn't get registered.

These are different lessons. The first says: don't let every fixture in a suite share one simplified shape of the input — at least one fixture per suite should carry production-realistic data. The second says: when a PR adds a new hard runtime read from a packaged file, registering it with `verify-pack-parity.ts` needs to be as automatic as adding the import — right now it depends on the author remembering, and the author didn't.

### 3. An interim finding was regraded correctly, but by challenge, not by process

**Evidence:** run log line 121 — Eric's Major on `adopt.ts`'s `${PROJECT}` tokens was re-graded to a Minor in `docs/distribution.md` *"after Sol challenged it against ADR-0030."* The final call was right (confirmed independently in re-review, line 141, with a tree-wide sweep for surviving instances of the false predicate). But the correction depended on Sol knowing ADR-0030 existed and thinking to check the diagnosis against it. Nothing in the review flow requires that check to happen — it happened because Sol did it this time.

### 4. A doc fix left its own twin false

**Evidence:** run log line 135 — correcting `docs/distribution.md`'s token-substitution claim left `docs/parameterization.md:9` asserting the same false predicate, caught only in Eric's first re-review as *"a new minor"* requiring a fourth review round (fix pass 3, commit `f52b6673`) to close.

This is the exact failure `code-standards.md` § Removal and rename completeness names for a **changed predicate**, not a rename: *"the prose describing it elsewhere shares no symbol with the code, so no search surfaces it, and the drift stays invisible until a reader acts on the stale description."* The rule already exists and already predicts this exact shape of miss. The gap isn't the rule — it's that fixing one prose home of a predicate doesn't trigger a search for its other prose homes.

## Action Items

- [ ] Add at least one production-realistic (non-empty) fixture case to `doctor.test.ts`'s shared test setup, so a check exercising real config data can't silently degrade to only ever seeing the empty-table shape — proposed owner: clove (or whoever picks up the `checkSeedDrift`/stale-twin follow-up PR already routed by this lane, since it touches the same file).
- [ ] When a plan-authoring pass is skipped in favor of direct-to-implementation dispatch (Sol → Clove with no Winston pass), the dispatcher names the missing planning artifacts explicitly at dispatch time (AC chief among them) rather than discovering the gap during PR review — proposed owner: winston, since this is a change to how the architect-skipped lane shape is dispatched, not to this ticket.

## Promotion cautions

None. All five `## Decisions` entries hold as written against the shipped diff (confirmed independently by Eric's "Spec/plan consistency: swept" axis) — no Decision was refuted by the execution record. The one entry marked `superseded` (the `assertSourceIsPlausible` rename-unaware Decision) was self-corrected within this same plan, not refuted after the fact.

## Lesson candidates

- A gate built to catch "new runtime-read file not registered" (like `verify-pack-parity.ts`'s `RUNTIME_READ_PATHS`) is easy to forget precisely because forgetting it produces no local symptom — `pnpm prism:check` stays green. Worth a `.prism/lessons.md` entry naming the pattern generally: a packaging/parity gate needs its own reminder at the point a new hard-runtime-read is introduced, not just a green suite.
- Test fixtures sharing one simplified default value across an entire suite (here: every fixture using `renames: {}`) can make a suite blind to a whole class of production behavior without any single test looking wrong. Worth checking whether this shape shows up elsewhere in the suite, not just in `doctor.test.ts`.

## Citations

### Plan evidence
- `.prism/plans/prism-consumer-delivery-fixes.md` `## Decisions` (5 entries, 1 superseded)
- `.prism/plans/prism-consumer-delivery-fixes.md` `## Sessions` (8 entries)
- `.prism/plans/prism-consumer-delivery-fixes.md` `## History` (7 entries)
- `.prism/plans/prism-consumer-delivery-fixes.md` `## Review Issues` (Briar: 1 major + 2 minor; Eric: 1 major + 13 minor + 1 twin-fix minor; "Angle Coverage" sub-section)
- `.prism/plans/prism-consumer-delivery-fixes.md` `## PR Readiness`

### Execution record
- `.prism/plans/conductor/architect-gate-port.md` `## Log`, lines 92, 101–143 (dispatch/verdict trail for lane `pr0`)
- `gh pr view 460` — reviews, `isDraft: true`, `mergeable: MERGEABLE`, 7 resolved review threads
- `gh pr view 460 --json statusCheckRollup` — `prism-check (ubuntu-latest)` SUCCESS, `prism-check (windows-latest)` SUCCESS
- `git log --oneline 76c2f7de..HEAD` — 9 commits
- `git diff --stat 76c2f7de..HEAD` — 22 files, 1041 insertions, 55 deletions
