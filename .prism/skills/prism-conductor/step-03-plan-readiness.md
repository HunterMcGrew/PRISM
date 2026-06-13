# Step 03 — Plan readiness

The firewall, and the single highest-leverage gate in the run. A worker dispatched against a fuzzy plan is exactly where two runs diverge into two codebases — so a vague plan is a failed plan, not a "proceed carefully."

This is a **quality** gate, not a stakes gate. The autonomy policy never touches it: it is **never auto-cleared**, under any policy, because plan vagueness is a correctness problem, not a low-stakes judgment call. (Contrast the A/P/C and DoR gates, which the owning persona may auto-clear under `internal` / `hobby`.)

For each lane's plan, check the `## Implementation Tasks` against the detail bar in `.prism/rules/implementation-task-detail.md`: every task names its target file path, the specific change, a verification command, and its sequence — no judgment calls left to the implementer.

- **Pass** → set `currentPhase: implement`; record the gate in the lane's `gate` field (`type: plan-readiness`, disposition cleared on quality grounds).
- **Fail** → set the lane's `escalation` with `axis: replan`, route back to Winston to re-plan in more detail (Winston is already Opus, so the fix is re-plan-harder, never escalate-the-model), and do **not** dispatch implementation.

Mutate goal-state per the protocol in `.prism/skills/prism-conductor/lib/goal-state.md`.

## Exit condition

Each lane is either cleared to `implement` or routed back to Winston with `escalation.axis: replan` — no lane proceeds to implementation against a plan that fails the bar.
