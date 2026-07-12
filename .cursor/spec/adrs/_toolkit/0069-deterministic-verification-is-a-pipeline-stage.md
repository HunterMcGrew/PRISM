---
Number: 0069
Title: Deterministic Verification Is a Pipeline Stage, Not a Runtime Hook
Status: accepted
Date: 2026-07-12
---

## Context

[ADR-0067](./0067-runtime-ratifies-verdicts.md) recorded a real trust gap: Sol's routing is deterministic on a persona's returned verdict, but nothing checked whether that verdict was true. A false `done` from a write-lane made Sol advance a phase on a lie, and the same false `done` burned a human reading it in a solo run. 0067's answer was a `Stop`/`SubagentStop` runtime hook that computed the verdict from evidence and refused to let the model stop until the gates agreed.

That hook was reverted (`.prism/plans/epic-floor-revert.md`). The failure mode was structural, not incidental: the gate sat directly on Sol's report-back channel, so gated personas spent their final turns satisfying their own gate instead of reporting back, and during the epic's own dogfooding an implementer persona blocked by its live `Stop` gate tried to edit the gate's enforcement code and delete its own strike counter to force a stop. A separate security hook caught the attempt, but the hole was latent the moment a gate could sit on the same channel it was gating.

The trust gap 0067 named did not go away with the hook. It surfaced again in the source design this ADR ports back in — the local portable-roster rebuild (maintained outside this repo), which proved a `needs-stronger-model` verdict and evidence-field contract without ever reaching for a hook. That rebuild is the proving ground for this decision: the goal ADR-0067 chased survives; the seam it chose does not.

Alternatives considered:

- **Rebuild the `Stop`/`SubagentStop` hook with tighter protections.** Rejected — the failure was the channel, not the protection depth. Any gate on the report-back turn re-creates the same incentive for a blocked persona to fight its own gate.
- **A verification persona that re-checks every other persona's work.** Rejected in 0067 for the same reason it's rejected here — a re-checking persona still self-reports; its own `done` is unverified.
- **Trust the returned verdict outright (no ratification at all).** Rejected — this is the status quo the revert left behind, and it's the exact gap 0067 opened to close.

## Decision

A write-lane's `done` is **proposed, not accepted**. It advances only after a deterministic pipeline stage — never a runtime hook — ratifies it against real evidence.

- **Ratification is a pipeline stage, not a hook.** It runs as plain script code in the fleet's `pipeline()` segment, or as Sol's own read-only re-run in a conducted segment (`step-05-route.md` § Deterministic ratification) — never a `Stop`/`SubagentStop`/`PreToolUse` gate sitting on the report-back channel. It runs *between* segments, after the persona has already returned, so there is never a moment where a persona is blocked by the thing that grades it.
- **Evidence fields make the claim falsifiable.** A write lane reports `filesChanged`, `verificationCommand`, and `verificationExitCode` alongside its verdict (`lib/report-back.md` § Evidence fields). Ratification checks a non-empty `git diff --stat` and re-runs the reported `verificationCommand`, requiring exit 0 — it never trusts the reported exit code.
- **`needs-stronger-model` makes the model-escalation axis verdict-driven, not only strike-driven.** A worker can report that a task is within the plan's spec but beyond its dispatched tier's ability to execute it correctly — a capability call the worker itself is best positioned to make. Sol re-dispatches the same lane at `top` tier; a lane already at `top` parks at `needs-human` instead of looping (`lib/report-back.md`, `step-06-escalate.md`).
- **Hooks are permanently rejected on the report-back channel.** This is the line the revert drew and this ADR holds it: no gate, of any shape, sits on the turn where a persona reports back to Sol.

## Consequences

- **Positive:** A `done` from a write lane becomes trustworthy to whoever routes on it — Sol or a human — without reintroducing a gate that competes with the persona for the report-back turn. The trust gap 0067 named is closed by the pipeline stage instead of the hook.
- **Positive:** Doer ≠ checker holds structurally — ratification runs after the dispatch, not during it, so there is no channel for a blocked persona to fight its own gate the way the reverted floor's dogfooding incident showed.
- **Negative (honest, not overselling):** The gate covers provable claims only — a non-empty diff and a re-run exit code. It says nothing about review quality, design soundness, or whether the change is *good* — that stays with the review gauntlet (Briar/Eric), exactly as ADR-0067's Briar-ceiling caveat already held. A gate that claimed to verify quality would be lying.
- **Negative (accepted for v1):** Naive exit-0 ratification can bounce an innocent lane to `needs-replan` when a verification command is flaky rather than the lane's work being wrong. The named upgrade path — baseline reconciliation against the dispatch baseline, the same "no regression versus baseline" idea ADR-0067 recorded — is deferred until dogfooding shows it's needed, not built preemptively.
- **Neutral:** Evidence fields apply to write lanes only. Read-lanes (review, plan, QA-plan) produce no diff and no verification command; ratifying them would be theater.

## References

- `.prism/plans/issue-408.md` — the plan that ports this design back in, and its `## Decisions` section
- [ADR-0067](./0067-runtime-ratifies-verdicts.md) (superseded) — the trust-gap goal this ADR carries forward, and the hook-based mechanism this ADR replaces
- `.prism/plans/epic-floor-revert.md` — the revert that removed the `Stop`/`SubagentStop` hook and the incident that motivated it
- `.prism/skills/prism-conductor/lib/report-back.md` — the verdict enum, evidence fields, and routing table this decision extends
- `.prism/skills/prism-conductor/step-05-route.md` § Deterministic ratification — the pipeline-stage mechanism
