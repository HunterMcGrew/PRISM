# Retro — portable-improvements-backport

**Target:** `.prism/plans/epic-portable-improvements-backport.md`
**Grain:** epic
**Generated:** 2026-07-10
**Voices:** Winston, Clove, Briar, Eric

## Summary

The epic delivered what it set out to: a centralized `session-orientation.md` Tier-1 rule, `## Sessions` battery persistence across three surfaces, every persona skill re-pointed at the rule, and all 8 verify-then-fix bugs fixed against canonical sources — all independently confirmed against `origin/main` diffs, not just taken on commit-message word. `pnpm prism:check` is green (485/485) and PR #405's CI is green on both platforms. Two things happened, though, that the plan's own text either warned against or didn't fully anticipate: the closing-battery persona framing got flattened across roughly 22 lanes despite task 5 explicitly saying to keep it (caught and fixed in round-2 self-review, but only after it happened), and a scope item Eric flagged as out-of-scope in his PR review landed in the same PR six minutes later with no second review pass and no `## Decisions` or `## History` entry recording the absorption.

## Charter coverage

| # | Item | Coverage | Evidence |
|---|------|----------|----------|
| 1 | Plan-AC vs. merged diff | Covered | All 5 behavioral/non-behavioral AC items independently spot-checked: `${TICKET_PREFIX_LOWERCASE}` token confirmed at `shared.md:250,385`; brownfield stakes confirm + greenfield no-live-user guard confirmed at `step-01-init.md:38,40`; portability-artifact grep independently run clean; `## Sessions` block byte-diffed identical across canonical and curated `branch-plan.md`; CI green both platforms (`prism-check` ubuntu + windows). |
| 2 | Decision fidelity | Covered | "Shared mechanics land as Tier-1 rule" — CONFIRMED (rule exists, copies to `templates/install/`, +61 lines to AGENTS.md Tier-1 block). "Execution shape: parallel lanes, one serialized build" — the serialized-build half held (single build commit `2c68175`); the parallel-lanes half is unconfirmed and likely didn't happen as primary-stated (see Divergences). Quick-consult Decision correctly deferred to close-time promotion, not yet promoted — expected, since reflect precedes close. |
| 3 | Review-loop evidence | Covered | Briar round-1: Major (closing-battery framing flattened across ~22 lanes, contradicting task 5's own text) + Minor (Ren's Sessions stance unstated). Both fixed round-2, verified byte-for-byte against `origin/main` per plan's Review Issues section. Eric: clean, no blocking issues, one cross-cutting follow-up flagged (skill-forge). |
| 4 | Scope divergences | Covered | skill-forge omitted from plan's task-5 enumerated batching (batch (d) named handoff, review-loop, onboarding — not skill-forge); Eric flagged it as out-of-scope in his PR review comment (posted 2026-07-10T04:10:40Z); fold-in commits (`6badda3`, `31f7453`) landed ~6 minutes later per commit timestamps (04:16:35Z+); no second Eric or Briar pass followed; plan's `## Decisions` and `## History` carry zero mention of skill-forge. |

No charter item went unanswered — every item had reachable evidence (plan sections + merged diff + PR review comment + CI + independent spot-checks).

## Multi-voice dialogue

**Winston** (Decisions: "Shared mechanics land as a Tier-1 rule," "Execution shape: parallel canonical-source lanes, one serialized build"): "The rule placement held — verified against the build, not assumed. `.prism/rules/*.md` copy verbatim to every platform and Tier-1 rules inline into AGENTS.md; per-skill embedding was never load-bearing. On execution shape, I documented two paths: parallel worktree lanes as the chosen approach, with 'fully sequential single-branch' named explicitly as a viable fallback if worktree merge added friction."

**Clove** (History, task 8 integration entry: "regenerated the full generated tree in one commit... after merging a redundant redirect paragraph"): "The build ran once, serialized, exactly as task 8 specified — that part of the Decision is confirmed. But `git log --merges` on the PR branch range shows zero merge commits. Every 'lane' commit (core-dev, workflow 1/2, workflow 2/2, business, utilities) landed sequentially on one branch. That's the fallback Winston named, not the parallel-worktree-lanes primary path — and nothing in `## History` says which path actually ran. The plan predicted this exact ambiguity was possible and named a fallback for it; it just didn't close the loop on which one happened."

**Briar** (Review Issues: "Closing-battery persona elaboration dropped in most skill lanes," Major): "Task 5 said, in its own text, to 'keep any persona-specific battery framing that is NOT in the generic rule.' It got dropped anyway, across roughly 22 of the ~30 touched lanes — not a few strays, most of the roster. I caught it in round-1 self-review and the round-2 fix restored every clause byte-for-byte against `origin/main`, verified, not just claimed. But the instruction was explicit and present in the same task the flattening happened inside of — a prose warning sitting in the same paragraph as the instruction that violated it wasn't enough to prevent the violation."

**Eric** (PR #405 review comment, Cross-cutting observations): "I reviewed the diff in front of me and it was clean — 8/8 bugs verified against canonical line numbers, zero portability leakage, Sessions wording byte-identical across three surfaces, battery DoD checkboxes intact. I flagged skill-forge explicitly as *not* in this PR's diff and *not* in the plan's enumerated lanes — a legitimate omission, not a defect, recommending a follow-up PR. Six minutes after I posted that, two commits landed converting skill-forge to the pointer pattern and folding it into this same PR. I never saw that diff. Neither did Briar's second pass — round-2 self-review predates the skill-forge commits entirely (round-2 verified only the two round-1 Review Issues). The work itself looks fine on a read of the commit message and content — it mirrors the pattern I already verified elsewhere — but 'looks fine on a read of the commit message' is exactly the gap independent review exists to close, and nobody closed it for this specific file."

## Divergences

1. **Execution shape: stated parallel-primary, evidence shows sequential-fallback, unrecorded which one ran.** The Decision named two paths and legitimated the fallback in advance — this isn't a broken promise. But `## History` never states which path was taken, and the git evidence (zero merge commits across the full commit range) points at sequential-single-branch, not parallel worktree lanes. **Verdict:** not a refutation — the fallback was pre-approved — but a documentation gap. A one-line History note ("ran sequential-single-branch per the pre-approved fallback, worktree merge added no value at this lane count") would have closed it.

2. **skill-forge scope divergence: omitted from the plan, flagged out-of-scope by Eric, folded in six minutes later, never re-reviewed, never recorded in the plan.** Three separate gaps compound here: (a) the plan's task-5 batching genuinely missed skill-forge — a real enumeration gap, not a judgment call; (b) the fold-in happened after a reviewer explicitly said "not in scope, recommend a follow-up PR" — the opposite path from what the reviewer recommended; (c) `branch-plan.md`'s own rule on cross-lane work says "Documented absorption is fine; undocumented absorption is not" — and this absorption has no `## Decisions` entry, no `## History` entry, nothing. **Verdict:** real divergence. The work product itself is very likely fine (it mirrors an already-verified pattern, and the commit message names its provenance clearly) — but "very likely fine, unreviewed" is not the review bar the rest of this epic held everywhere else.

3. **Foreseen flatten risk still happened at roster scale.** Task 5's own instruction text carried the exact warning that would have prevented the Major finding ("keep any persona-specific battery framing that is NOT in the generic rule") — and it still got dropped in ~22 of ~30 lanes. **Verdict:** real divergence, already caught and fixed within-epic (round-1 self-review → round-2 verified fix), but the pattern is worth naming: a prose instruction sitting in the same task as the violation it's meant to prevent is not sufficient insurance when the same mechanical edit (full-battery-text → pointer swap) repeats across ~30 near-identical files. The failure mode is repetitive-edit drift, not comprehension failure — Briar's own round-2 note confirms 5 skills needed no restoration because their pre-swap text already matched the generic rule; the other ~22 had the persona-specific text and lost it anyway.

## Promotion cautions

None. Every `## Decisions` entry either held (confirmed by the build, the diff, or independent spot-check) or is correctly deferred to close-time promotion (the quick-consult Decision). No Decision was refuted by the execution record.

## Lesson candidates

- **A plan-body prose warning against a specific mistake is not sufficient insurance when the same mechanical edit repeats at roster scale (~30 files).** The task-5 instruction to preserve persona-specific framing was correct and present, and the mistake happened anyway across ~22 lanes. What would have caught it before round-1 review: a mechanical diff-count check per lane (e.g. "closing-battery paragraph line count in the new file must be ≥ the pre-swap paragraph's distinctive-clause count") rather than relying on each lane-executing agent to individually remember a prose instruction ~30 times. Eric's round-2 verification used exactly this kind of mechanical check (byte-diff against `origin/main`) — worth considering as a pre-review gate, not just a post-hoc review technique.
- **A reviewer's "not in scope, recommend a follow-up PR" verdict on a specific file needs to be a hard stop for that PR, not a soft one.** When a fold-in happens anyway after that verdict, it should trigger the follow-up review pass automatically (or at minimum, a `## Decisions` entry citing the reviewer's comment and the reason for overriding it) rather than landing silently. This is the same principle `followup-scope.md`'s "documented absorption is fine, undocumented absorption is not" already states — the gap here is that the epic's own process didn't enforce it against itself.

## Action Items

- [ ] **Give skill-forge's conversion (`6badda3`, `31f7453`) a real review pass** — either a fast Eric re-review scoped to the two commits, or a Briar self-review pass confirming the pattern matches the already-verified lanes. — proposed owner: Eric (or Briar if Eric is unavailable)
- [ ] **Add a `## Decisions` entry (or a `## History` line) to `epic-portable-improvements-backport.md` documenting the skill-forge absorption** — what was decided, why it landed after Eric's out-of-scope flag, and that it awaits the review pass above. — proposed owner: Winston (plan owner) — note: Iris is read-only on the plan; this is a routed finding, not a plan edit Iris made.
- [ ] **Wider hardcoded-`main` audit** — the epic fixed two known hardcoded-`main` sites (code-review-self, architect) found via a tree-wide sweep scoped to those two skills' diff patterns; worth running the same `git diff main...HEAD` / `git diff origin/main...HEAD` grep across the full `.ai-skills/skills/` tree (not just the two skills this epic already touched) to confirm no other skill carries the same stale pattern. — proposed owner: Winston or Ren (refactor-scout)
- [ ] **Record which execution path (parallel-lanes vs. sequential-fallback) actually ran, for the epic's own `## History`** — a one-line addendum closes the ambiguity Divergence `#1` surfaces, and sets precedent for future multi-lane epics to record this explicitly rather than leaving it inferable only from `git log --merges`. — proposed owner: Winston

## Citations

### Plan evidence

- `## Decisions`: "Shared mechanics land as a Tier-1 rule, not ~30 body copies"; "Execution shape: parallel canonical-source lanes, one serialized build"; "Quick-consult mode ports, with winston self-judging the grain" (`→ promoted to .prism/architect/ on plan close`)
- `## Review Issues`: "Closing-battery persona elaboration dropped in most skill lanes" (Major, fixed); "Ren's Sessions-persistence stance is unstated" (Minor, fixed)
- `## History`: task-8 integration entry (build commit `2c68175`); round-1 self-review entry; round-2 self-review entry
- `## Acceptance Criteria`: REQ-1, REQ-2, REQ-3 (behavioral); non-behavioral items 1–5

### Execution record

- Squash merge commit `5d5bcd9` — `git show 5d5bcd9 --stat` (163 files changed, 2859 insertions, 2010 deletions)
- PR #405 commits (`gh api repos/HunterMcGrew/PRISM/pulls/405/commits`) — 20 commits, includes `6badda3` (skill-forge pointer conversion) and `31f7453` (skill-forge platform regen), both landing after Eric's review comment timestamp
- PR #405 review comment (Eric, `code-review-pr-summary`, posted 2026-07-10T04:10:40Z) — full 8-bug verification table, cross-cutting skill-forge flag, PR Readiness checklist
- `gh pr checks 405` — `prism-check (ubuntu-latest)` pass, `prism-check (windows-latest)` pass
- Independent spot-checks (this retro): `${TICKET_PREFIX_LOWERCASE}` token at `.ai-skills/skills/prism-ticket-start/shared.md:250,385`; brownfield/greenfield guards at `.prism/skills/prism-prd/step-01-init.md:38,40`; portability grep clean across `.ai-skills/skills/`, `session-orientation.md`, both `branch-plan.md` copies; `## Sessions` block byte-diff identical; `git log --merges` empty across the full PR commit range

### Per-team config

- `.ai-skills/config.json` — `retroEvidence.dodGates`: types, crossref-lint, tests, build; `prPlatform`: github; `ci.system`: github-actions
