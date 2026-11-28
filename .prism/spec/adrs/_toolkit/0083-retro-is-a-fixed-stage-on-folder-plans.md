---
Number: 0083
Title: The Retro Is a Fixed Last Stage on Folder Plans
Status: accepted
Date: 2026-11-19
---

> Amended by [ADR-0089](./0089-the-close-step-always-runs-and-the-retro-report-runs-on-a-trigger.md): the close step below still always runs, and the retro report now runs only when `retro-trigger.mjs` finds a trigger, with `Retro: none — no trigger` otherwise. `prism:retro-line` keys on a dated `> Closed:` line, because nothing writes a final PR-review record line since ADR-0087.

## Context

[ADR-0068](./0068-retro-charter-and-two-grain-cadence.md) made the retro a visible nudge that a person may decline. It rejected a mandatory gate, because forced retros on trivial tickets were the theater risk and hook enforcement had been tried and reverted.

A folder-plan run changes who is there to decline. Once the intent is approved, the run goes on without the person, so a declinable retro has nobody to decline it and nobody to ask for it. It silently does not happen. The cost shows up in review: a miss that a human catches on a PR is logged by class, and only the retro classifies those rows and turns an open class into a fix. A run that skips the retro leaves its review misses unclassed, and the same miss class comes back.

## Decision

On a folder plan the retro always runs, as the last stage after PR review. It writes the Decision verdicts, the `Retro:` line under `## PR Readiness`, the `> Closed:` line, and the lessons exits, then commits them, and `prism:retro-line` fails a plan whose final PR-review verdict is recorded while that line is empty. There is no declined form on a folder plan.

Flat plans keep ADR-0068's declinable gate unchanged, so legacy plans work as before.

Alternatives that lost:

- **Declinable everywhere.** In an unattended run nothing would decline it, so it would not happen, which is the defect above.
- **Enforced on flat plans too.** Legacy plans have no stage that writes the line, and a check that fails them would break plans that finished correctly under the old rule.

## Consequences

- Positive: every folder-plan ticket gets its verdicts, its review-miss classes, and its lessons exits, with no one needing to remember.
- Positive: the grain still scales the work, because a one-line fix gets the light per-ticket report and only an epic gets the full audit.
- Negative: `prism-retro` is no longer read-only on folder plans. It writes verdicts into the plan, an epic's `## Retro` into `spec.md`, and the lessons file, so a reviewer of the retro commit reads edits and not only a report.
- Negative: the check reads the final PR-review record line. The run commits that line and the retro with no push between them, so CI sees both together. A push that lands between them, such as a session that stops after the final PR review, fails CI until the retro runs. That failure is the check doing its job, and it is also a red build someone has to explain.
- Neutral: the check is PRISM's own and is not delivered to consumers, so a consumer's folder plans get the stage and no enforcement of it.

## References

- [ADR-0068](./0068-retro-charter-and-two-grain-cadence.md), which this amends for folder plans
- `.prism/rules/branch-plan.md` § Before Closing
- `.prism/architect/_toolkit/review-runtime.md` § The retro-line check
