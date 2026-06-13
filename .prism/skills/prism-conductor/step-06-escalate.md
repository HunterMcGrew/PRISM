# Step 06 — Escalate

Three escalation axes, each with one trigger and one target. Set the lane's `escalation` object (`axis`, `reason`, `raisedAt`) per the mutate protocol in `.prism/skills/prism-conductor/lib/goal-state.md`, then route to the axis target.

- **replan** → Winston. Triggered by a Plan Readiness Gate failure (step-03) or a worker reporting it guessed because the plan was vague. The fix is a better plan, not a bigger model — Winston is already Opus.
- **model** → bump `models.<persona>` to `opus` for that persona's next dispatch. Triggered when Sonnet stalled the unit twice (strike 2). The escalation rides the lane's `models` map so the next step-04 dispatch reads the stronger tier.
- **human** → hard-pause the lane and append to `pendingHumanReport`. Triggered by an `OPEN —` decision, the disagreement fast-path, or an inherently human gate.

**Disagreement fast-path.** A fixer who believes a finding is *wrong* escalates immediately to the human axis — it does not burn strikes arguing with itself through repeated fix attempts. A genuine disagreement is a human call, surfaced now.

**One-directional autonomy rule.** A persona may always escalate *up* (`needs-human` under any policy, including `hobby`) but may never auto-clear *below* the policy ceiling (no `auto-cleared` when `launch` locked the gate). The human holds the ceiling; the owning persona exercises judgment beneath it.

## Exit condition

The escalation is recorded on the lane and routed to its target — Winston (replan), a model bump on the next dispatch (model), or a human pause (human). Control returns to step-04 or step-09 (report) depending on whether the lane can proceed.
