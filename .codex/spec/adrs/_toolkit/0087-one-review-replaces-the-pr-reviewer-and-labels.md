---
Number: 0087
Title: One Review Replaces the PR Reviewer and the Review Labels
Status: accepted
Date: 2026-11-27
---

> Amends [ADR-0011](./0011-eric-never-approves-prs.md) and [ADR-0078](./0078-main-session-holds-merge-authority-and-the-conductor-is-retired.md).

## Context

PRISM ran two review skills over one rulebook. `prism-self-review` (Briar) reviewed the branch before the PR opened, and `prism-pr-review` (Eric) reviewed the open PR after it. Both read `REVIEW.md` and the same pass files, so the second read went over the same diff with the same rules, at the cost of a second dispatch on every round.

Three pieces of machinery existed mostly to bound that second loop. The PR reviewer set review labels (`effort:*`, `confidence:*`, `review:has-minors`) and a verdict marker, but nothing in PRISM read the effort and confidence labels; they came from thrive's team queue. A confirm pass ran after the 3-round cap so the loop could end. And a bookkeeping exemption in `followup-scope.md` kept Minors in plan sections from earning another round, because the review kept reviewing the plan prose it wrote.

The third amendment to the Kitchen Line epic (#499), approved by Hunter on 2026-11-26, cut this down: "PRISM doesn't need a PR reviewer and a reviewer", and "one reviewer skill in the repo, still 2 rounds. they should be launched as sub-agents preferably." On the labels: "the effort labels and review:minor labels was thrive only stuff, we dont need that." On the exit: "as long as no major or critical are found, it is okay if we hit our max review rounds and minors that don't matter ride."

## Decision

**One review skill, `prism-review` (Briar), replaces both reviewers, and the review labels, the verdict marker, the confirm pass, and the bookkeeping exemption go.**

- `prism-review` reviews the current branch, or a PR by number or URL read-only through `gh pr diff` and `git show`. After verify and before the PR opens, the session dispatches it as a fresh subagent with a path brief. It never approves, never posts, never flips a PR ready, and never edits source.
- The exit rule is zero Critical and zero Major findings, apart from decision items, in at most two rounds. A Minor is fixed inside the rounds when it can be and never earns a round of its own. What is left after round 2 is listed in the PR body, and a Critical or Major left open is also posted inline. The run goes on.
- The review reads `intent.md`, `spec.md`, and `plan.md` as its yardstick and raises no finding on their prose. Paths `reviewIgnore` names are never reviewed.
- `review/record.mjs` writes the plan's one record line per round, and `review/post.mjs` posts the session's inline comments. Neither the reviewer nor the session writes those by hand.
- The main session may merge when `features.mainSessionMayMerge` is true, the plan's last review line reads `clean`, and CI is green on the head.
- `prism-pr-review` moves to `.ai-skills/deprecated/prism-pr-review/`, a folder the build does not read, and its reconcile stop gate is removed. "Eric", "review pr", and a PR URL route to `prism-review`.

Alternatives considered:

- **Keep both skills with the cheaper exit rule.** Rejected. The second skill read the same rulebook over the same diff, so it doubled the dispatches for a check the first one already ran.
- **Keep the labels for human readers.** Rejected. No script or rule in PRISM read the effort and confidence labels, and `review:has-minors` existed only to gate the merge, which now reads the plan's record line.
- **Keep the confirm pass after round 2.** Rejected. It existed to end a loop that could not exit on Minors. With Minors no longer gating, round 2 is the last pass over the final diff.

## Consequences

- **Positive:** One review per round instead of two, and one skill to maintain. The merge bar is a line in the plan and a CI result, both of which a script can check.
- **Negative:** The PR-time read in a fresh context is gone. The fresh subagent dispatch replaces it, but that subagent runs before the PR opens, so nothing reviews the PR as GitHub shows it.
- **Negative:** Minors no longer hold a PR. A Minor left after round 2 ships with a PR-body note and no further round.
- **Negative:** The review depends on a subagent that can launch subagents. A live probe confirmed that on Claude Code (`hook-runtime.md` § Nested dispatch), but Codex is unprobed. Where a host cannot nest, the review sweeps the passes itself, one after another, which is slower.
- **Neutral:** `plan-retro-line.ts` still keys on the old `pr-review` record lines until a later child of the epic rekeys it. Old `self-review` and `pr-review` lines stay valid wherever a script reads review lines.
- **Neutral:** ADR-0011's rule stands under a new name: reviewers never approve PRs. Only the reviewer it named is retired.

## References

- `.prism/plans/prism-499/intent.md` § Third amendment, 2026-11-26
- `.prism/plans/prism-499/spec.md` § Third amendment, 2026-11-26
- `.prism/plans/prism-553/spec.md`
- [ADR-0011](./0011-eric-never-approves-prs.md), the no-approval rule this keeps
- [ADR-0078](./0078-main-session-holds-merge-authority-and-the-conductor-is-retired.md), the merge bar this replaces
- `REVIEW.md`
- `.prism/architect/_toolkit/review-runtime.md`
- `.prism/rules/git-conventions.md` § Who merges
