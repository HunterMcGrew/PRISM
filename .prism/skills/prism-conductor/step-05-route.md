# Step 05 — Route

Apply the verdict + gate-disposition routing table. The table is canonical in `.prism/skills/prism-conductor/lib/report-back.md` — cite it, do not restate it. Routing is **deterministic**: Sol applies the table and never interprets the work behind a verdict.

### Deterministic ratification

Before routing a write-lane `done`: (a) `git diff --stat` in the lane's worktree is non-empty — an empty diff behind a `done` routes as `needs-replan` (the lane claims work that doesn't exist); (b) re-run the lane's reported `verificationCommand` and require exit 0 — **never trust the reported exit code**.

Doer ≠ checker: ratification is a deterministic script stage (fleet) or Sol's own re-run (conducted segments) — a doer never grades its own homework.

Trust asymmetry, one line: **cheaper tier in → harder gate out.** A `top`-tier plan rides on the plan-readiness firewall; a `worker`-tier code edit gets the deterministic gate *and* the review gauntlet before advancing.

Ratification is evidence-checking, not verdict interpretation — checking an exit code is not re-deciding the work (guards the `shared.md` § How Sol thinks #3 invariant).

This is ADR-0067's ratification goal relocated from Stop-hooks (reverted — `epic-floor-revert.md`) to an explicit pipeline stage that never sits on the report-back turn. See [ADR-0069](../../spec/adrs/_toolkit/0069-deterministic-verification-is-a-pipeline-stage.md).

**Primary verdict** routes the lane:

- `done` → advance `currentPhase` to the next phase.
- `needs-fix` → dispatch the implementer (Clove) for the `## Review Issues`, then re-dispatch the same reviewer; the lane stays in the review phase. This is the gauntlet loop (step-04 § The review phase is the gauntlet), bounded by the step-07 pass budget + three-strike rule.
- `needs-replan` / `blocked` → route back to Winston (set `escalation.axis: replan`).
- `needs-stronger-model` → re-dispatch the same lane, same persona, at `top` tier (set `escalation.axis: model`); a lane already at `top` parks at `needs-human` instead.
- `needs-human` → pause the lane and append to `pendingHumanReport`.

**Secondary signals** route independently — a dispatch can be `done` *and* carry a signal:

- `found-bug` → Sasha.
- `found-followup-work` → Nora (through her scope-fit + DoR gate).

**Gate dispositions:**

- `auto-cleared` → advance; the owning persona already recorded the resolution in the plan.
- `needs-human` → pause the lane.

On a human response to a paused gate, **re-dispatch the gate's owning persona carrying the human's answer** — the owner writes the resolved `## Decisions` entry (escalation reason, human answer, rationale) via the OPEN-decision lifecycle and re-judges the gate. Sol logs the gate event in goal-state and carries the answer back; Sol never writes the plan.

Write `lastVerdict`, `signals`, and the next `currentPhase` per the mutate protocol in `.prism/skills/prism-conductor/lib/goal-state.md`.

## Exit condition

Every returned verdict and signal is routed and goal-state reflects each lane's next state — control returns to step-04 for the next segment, or to step-06 when a verdict raised an escalation.
