# Conductor convergence governor

The two-axis governor that brakes the self-growing fleet. `step-09-reconcile.md` and `step-07-budgets.md` cite this doc for the priority order — the order lives here and is not restated elsewhere.

The three brakes evaluate at reconcile time in a fixed priority order. The budget is the guarantee; generation and breadth are governance signals. A consuming team configures the defaults via the config seam in goal-state (`lib/goal-state.md` § Field notes); the values below are Thrive defaults.

## Brake 1 — Dispatch budget (primary)

**Default:** `maxDispatches: 100`.

**What it counts:** every dispatch against `globalBudget.spent` — origin-lane phases, decision-box dispatches (Nora/Winston), and discovered-lane phases alike. Depth, shape, and generation are irrelevant; every dispatch is equal.

**On exhaustion:** park the remaining lanes with `status: parked`; set the run's termination reason to `budget-exhausted`; surface the report. No further auto-dispatch occurs.

**Why it is primary:** a single shape-agnostic counter makes the brake unconditional. A separate budget for discovered work would let the two pools each stay "under budget" while total spend runs away.

## Brake 2 — Generation cap K=3 (soft gate + lineage signal)

**Default:** K=3.

**How generation is tracked:** origin lanes are `generation: 0`. A lane spawned from a discovered signal has `generation = parent.generation + 1` (via `parentId` in goal-state).

**What it does:** gen 0–3 auto-dispatch (origin through three layers of discovery). A gen-3 lane's finds would be gen 4 — those signals are captured in the registry but parked to a human gate rather than auto-dispatched. The human reviews the parked candidates and may authorize further dispatch.

**Why it is soft, not hard:** the budget is the guarantee against runaway; the generation cap is a governance signal — a second opinion that a deep discovery chain may warrant human review. A team that trusts its automation can raise K without changing the budget.

## Brake 3 — Breadth gate (default 12)

**Default:** 12 distinct new lanes per single reconcile.

**What it checks:** count the distinct candidate lanes that survive dedup and the decision box in a single reconcile pass. If the count exceeds the breadth gate, surface the full expansion to a human rather than auto-dispatching it.

**Why 12:** calibrated by Hunter to match the runtime concurrency cap (`min(16, cores-2)`, approximately 12). A single reconcile yielding >12 new lanes is a governance signal — the expansion is unusually large — and deserves human review before auto-dispatch.

**Breadth gate vs. concurrency cap — queueing is safe.** The breadth gate (12) and the concurrency cap (~12) are the same order of magnitude and govern different things:

- The **concurrency cap** is a runtime limit: dispatches beyond it queue, they do not fail. Queueing is the engine's safe default.
- The **breadth gate** is a governance limit: it surfaces large expansions to a human before auto-dispatch.

A reconcile that yields ≤12 candidate lanes dispatches them; the runtime queues the overflow against the cap, which is safe. A team wanting no silent queueing can lower the breadth gate below its cap via the config seam. The default is kept at 12 to honor the calibration; do not lower it without a team config change.

## Termination-reason invariant

Every completed run records exactly one of:

- `converged` — a reconcile pass produced zero new candidate lanes; the run closed cleanly.
- `budget-exhausted` — the dispatch budget was hit; remaining lanes parked.

A run never ends with termination reason `killed` or with no reason set. If a run would otherwise end without a termination reason, set `converged` — a zero-delta reconcile is convergence.

## Priority order at reconcile time

Check in this order, stopping at the first brake that fires:

1. **Budget** — if `globalBudget.spent ≥ globalBudget.maxDispatches`, park remaining candidates and report `budget-exhausted`.
2. **Generation cap** — for each candidate lane, compute `generation = parent.generation + 1`. Candidates at gen ≥ K+1 (gen 4 with default K=3) are captured but parked to a human gate; remaining candidates continue.
3. **Breadth gate** — count remaining auto-dispatchable candidates. If the count exceeds the breadth gate, surface the full set to a human instead of auto-dispatching.
4. **Auto-dispatch** — candidates that cleared all three brakes dispatch as new lanes in the next segment.
