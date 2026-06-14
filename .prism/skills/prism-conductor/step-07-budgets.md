# Step 07 — Budgets

Three nested budgets, checked each dispatch. A tripped budget stops the **lane**, not the run — park it with its survival history and surface the report.

- **Per-unit strike budget** — the three-strike rule, generalized: when the same defect survives 3 fix attempts, pause the unit and record the survival history in the lane's `strikes` array (`issueKey`, `count`, `history`). Strike 2 is also the trigger to escalate the model (step-06, model axis) before strike 3 parks the lane.
- **Per-phase failure budget** — N consecutive hard failures of the same persona on the same unit → stop that phase and report. Track via the lane's `failureCount`.
- **Global run budget** — `globalBudget.maxDispatches` caps total dispatches so a runaway can't burn unbounded. Increment `globalBudget.spent` each dispatch; trip at the cap.

**"Failure" is narrow.** A failure is: a persona can't complete its job, a verification command hard-fails repeatedly, or a defect survives the strike budget. A persona's **"no" is a verdict to route, not a failure** — Briar finding issues, Eric flagging concerns, Nora rejecting a follow-up's scope are all normal outcomes routed by step-05, never failures that burn a budget.

Mutate the budget counters per the protocol in `.prism/skills/prism-conductor/lib/goal-state.md`.

## Exit condition

Budgets checked on each dispatch; a tripped budget parks its lane (`status: parked`) with survival history recorded, while other lanes continue. Control returns to step-04 or to step-10 (report) when a lane parks.
