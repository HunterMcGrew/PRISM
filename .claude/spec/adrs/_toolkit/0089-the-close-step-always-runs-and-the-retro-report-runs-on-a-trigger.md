---
Number: 0089
Title: The Close Step Always Runs and the Retro Report Runs on a Trigger
Status: accepted
Date: 2026-11-27
---

## Context

[ADR-0083](./0083-retro-is-a-fixed-stage-on-folder-plans.md) made the retro a fixed last stage on folder plans, because an unattended run has nobody to decline it or ask for it. That stage bundled two jobs. The close duties, meaning the Decision verdicts, the review-miss classes, the lessons exits, the `Retro:` and `> Closed:` lines, and the `retro:` commit, have to happen on every plan or the plan never closes. The retro report, which grades the work against the plan through the [ADR-0068](./0068-retro-charter-and-two-grain-cadence.md) charter, earns its cost only when something went wrong. A ticket that planned cleanly, built to plan, and reviewed clean gets a report that finds nothing.

The third amendment to the Kitchen Line intent (PRISM-499, 2026-11-26) split the two: the close step runs on every plan, and the report runs only when a stage hit its round cap, a task was re-planned, or a review asked for changes. It asked that a script read the trigger, so no person decides whether the report runs. PRISM-565 built that split.

ADR-0083's check also keyed on the final PR-review record line. The PR reviewer was retired by [ADR-0087](./0087-one-review-replaces-the-pr-reviewer-and-labels.md), so nothing writes that line any more, and the check had nothing to key on.

## Decision

On a folder plan with a `plan.md`, `prism-retro` runs `retro-trigger.mjs` first, then always runs the close step. The report runs only when the script exits 0, and its header carries the script's reasons on a `**Trigger:**` line.

- **Trigger.** A `## Challenge` round numbered 3 or higher, a `## Review` line whose verdict is not exactly `clean`, or a task that carries an `amended` field. Exit 1 means no trigger, and exit 2 stops the run.
- **Close step.** It runs whatever the script says and has no declined form. With no trigger it writes `Retro: none — no trigger` and creates no report file. With a trigger it writes `Retro: <report path>`.
- **Epic.** An epic folder has no challenge, review, or task lines of its own, so its retro always writes the full-grain report.
- **Check.** `prism:retro-line` fails a live folder plan with a dated `> Closed:` line whose `Retro:` line is empty, or is a single path that names no file. It reads no review line.

Flat plans keep ADR-0068's declinable gate unchanged.

Alternatives that lost:

- **Keep the full report on every folder plan.** It is what ADR-0083 did, and the intent's trigger replaces it: a report on a clean ticket spends a run to find nothing.
- **Make the close step optional too.** Nothing in an unattended run would choose to run it, so verdicts and review-miss classes would silently stop. That reopens the hole ADR-0083 closed.

## Consequences

- Positive: the report runs where a divergence is likely, and the reason it ran is written in its header.
- Positive: every folder plan still gets its verdicts, review-miss classes, lessons exits, and close lines. Review-miss classes stay in the close step because a class opens on human catches across tickets that may each have reviewed clean.
- Negative: on the record at the time of this decision the trigger fires on every folder plan. Each of the seven folder plans with review lines held at least one line that was not `clean`, so the saving shows only once clean first rounds become common.
- Negative: the check cannot tell whether `none — no trigger` is true, and it cannot see a retro that never ran. The resume table, not the check, drives the stage.
- Neutral: the check is PRISM's own and is not delivered to consumers, so a consumer's folder plans get the close step and the trigger with no enforcement.

## References

- [ADR-0083](./0083-retro-is-a-fixed-stage-on-folder-plans.md) and [ADR-0068](./0068-retro-charter-and-two-grain-cadence.md), which this amends
- `.prism/plans/prism-565/spec.md`
- `.prism/rules/branch-plan.md` § Before Closing
- `.prism/architect/_toolkit/plan-chain-scripts.md` § Retro trigger
- `.prism/architect/_toolkit/review-runtime.md`
