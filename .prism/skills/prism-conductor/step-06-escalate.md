# Step 06 — Escalate

Three escalation axes, each with one trigger and one target. Set the lane's `escalation` object (`axis`, `reason`, `raisedAt`) per the mutate protocol in `.prism/skills/prism-conductor/lib/goal-state.md`, then route to the axis target.

- **replan** → Winston. Triggered by a Plan Readiness Gate failure (step-03) or a worker reporting it guessed because the plan was vague. The fix is a better plan, not a bigger model — Winston is already Opus.
- **model** → bump `models.<persona>` to `opus` for that persona's next dispatch. Triggered when Sonnet stalled the unit twice (strike 2). The escalation rides the lane's `models` map so the next step-04 dispatch reads the stronger tier.
- **human** → hard-pause the lane and append to `pendingHumanReport`. Triggered by an `OPEN —` decision, a disagreement Winston couldn't resolve without you, or an inherently human gate.
- **dependency-blocked (co-presented, not a fourth axis)** — a lane held on an unresolved `dependsOn` edge is not itself escalated; it is *surfaced alongside* the blocking lane's escalation. When the `dependsOn` target is `parked`, reconcile (`step-09 § 2.5`) appends a co-presented `pendingHumanReport` entry naming the dependent lane and the parked target's reason. Resolving the parked target's escalation unblocks the dependent lane on the next reconcile pass (FR-3). This is a presentation/routing note, not a new escalation axis — the three axes (replan/model/human) are unchanged.

**Disagreement fast-path.** A fixer who believes a finding is *wrong* escalates immediately to Winston (architect) to adjudicate — it does not burn strikes arguing with itself through repeated fix attempts. Winston rules with cold eyes: side with the reviewer (the fixer implements), side with the fixer (the finding is rejected with a one-line reason), or — only when the call genuinely needs you — escalate to the human axis. This matches the prism-review-loop ladder's disagreement fast-path, so Sol's gauntlet and the standalone loop resolve disagreements the same way.

**One-directional autonomy rule.** A persona may always escalate *up* (`needs-human` under any policy, including `hobby`) but may never auto-clear *below* the policy ceiling (no `auto-cleared` when `launch` locked the gate). The human holds the ceiling; the owning persona exercises judgment beneath it.

## Exit condition

The escalation is recorded on the lane and routed to its target — Winston (replan), a model bump on the next dispatch (model), or a human pause (human). Control returns to step-04 or step-10 (report) depending on whether the lane can proceed.
