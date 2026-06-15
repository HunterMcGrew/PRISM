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

## Scale ceiling at ~100 lanes

Phase D targets runs up to ~100 lanes. Runs trending beyond that size are expected to hit the breadth gate or dispatch budget before reaching that size — the ceiling is a **governance expectation enforced by existing brakes**, not a new hard limit Sol checks. No new "100-lane" counter is added.

The budget (default 100 dispatches) and breadth gate (12 per reconcile) are the existing backstops: a run cannot dispatch more than 100 times total, and any single reconcile that yields more than 12 new lanes surfaces to a human. Together they prevent a run from silently scaling past the ceiling without operator awareness. The relationship between ceiling and brakes is additive: batching + partitioning raise the practical run size the conductor handles (more lanes fit in memory and fewer I/O round-trips are needed), while the governor brakes remain the enforcement ceiling.

Expressing the ceiling as a lane count (rather than "2 teams × 50" or "5 epics × 20") keeps it composable with the partition threshold (default 50 lanes, also lane-count) and the budget. The alternative formulations are instances of ~100 lanes, not different ceilings.

## Termination-reason invariant

Every completed run records exactly one of:

- `converged` — a reconcile pass produced zero new candidate lanes; the run closed cleanly.
- `budget-exhausted` — the dispatch budget was hit; remaining lanes parked.

A run never ends with termination reason `killed` or with no reason set. If a run would otherwise end without a termination reason, set `converged` — a zero-delta reconcile is convergence.

## Dependency-graph pre-check (Phase C)

Before the three brakes evaluate, the reconcile step runs a `dependsOn`-graph cycle check (defined in `step-09-reconcile.md § 2.5`). A detected cycle is a `needs-human` escalation — never a silent hang. This is a **constraint check, not a brake**: it does not park for budget/generation/breadth reasons and it does not consume `globalBudget` (no dispatch occurs). It escalates a malformed graph.

The check is orthogonal to the three-brake priority order and runs *before* it. See `step-09-reconcile.md § 2.5` for the full DFS procedure — it is not restated here.

## Tree convergence — parent close gated on children

A container lane (≥1 child) is `done` **only when all its children are `done` or `dropped`** — this is a convergence-*check* change, not a governor change: the three brakes (budget / generation cap / breadth gate) are **unchanged** and still evaluate exactly as documented above.

The planned tree's depth does **not** interact with the generation cap. A three-level planned tree (epic→issue→ticket) is three levels of gen-0 lanes; brake 2 (generation cap) only counts *discovered* lineage (`parent.generation + 1` from an unplanned find), never tree depth. Tree depth ≠ generation depth — see `lib/goal-state.md` § Field notes for the canonical statement.

The run still terminates on `converged` (zero-delta reconcile) or `budget-exhausted` — tree shape adds no new termination reason.

### Subtree budget attribution — read-time aggregation, no per-lane counter

Subtree budget attribution is **read-time aggregation** for reporting only. At report time, a leaf lane's share of `globalBudget.spent` rolls up to its parent issue, which rolls up to its parent epic, by summing the dispatches attributed to each subtree's leaves. There is **no per-lane budget counter** in the schema and **no write-time aggregation** — `globalBudget.spent` remains a single shape-agnostic counter (the primary brake, unchanged). Read-time math has no schema cost and no second source of truth that can disagree with the global counter — subtree attribution is *reporting*, not a brake.

## Brakes are run-wide under partitioning (FR-9, NFR-6) {#brakes-run-wide}

Partitioning splits lane records across files; the governor brakes are unaffected. Every brake evaluates against the **full run's state**, never a per-partition subset. This is a strong architectural invariant: no brake is weakened by partitioning.

Specifically:

**(a) Budget counter is root-level.** `globalBudget` lives only in the root index (v3 schema, `lib/goal-state.md § Schema (v3 — partitioned layout)`). Every dispatch in any partition's lanes increments the one counter. There is no per-partition budget.

**(b) Generation cap reads `generation` from `lanesSummary` across all partitions.** `lanesSummary` in the root index is the run-wide source for generation values — the cap applies to the full discovered-lineage graph, not to the lanes in any one partition file.

**(c) The breadth gate counts distinct new lanes summed across all partitions in a single reconcile.** A 6-lane expansion in partition epic-1 plus a 7-lane expansion in partition epic-2 is a 13-lane reconcile that trips the gate of 12, even though neither partition alone exceeds it. The count is over the **reconcile pass's full candidate set**, never per-partition. This is the critical correctness point: a per-partition breadth count is the natural mistake and the invariant this section exists to prevent.

The priority order in `## Priority order at reconcile time` below is unchanged — budget first, generation cap second, breadth gate third. Partitioning adds no new brake and changes no brake's evaluation logic; it only requires that evaluation is run against the run-wide state in the root index rather than against any single partition file.

**See** [ADR-0056](../../spec/adrs/_toolkit/0056-conductor-governor-brakes-evaluated-run-wide.md) — the accepted ADR recording this invariant.

## Priority order at reconcile time

Check in this order, stopping at the first brake that fires:

1. **Budget** — if `globalBudget.spent ≥ globalBudget.maxDispatches`, park remaining candidates and report `budget-exhausted`.
2. **Generation cap** — for each candidate lane, compute `generation = parent.generation + 1`. Candidates at gen ≥ K+1 (gen 4 with default K=3) are captured but parked to a human gate; remaining candidates continue.
3. **Breadth gate** — count remaining auto-dispatchable candidates. If the count exceeds the breadth gate, surface the full set to a human instead of auto-dispatching.
4. **Auto-dispatch** — candidates that cleared all three brakes dispatch as new lanes in the next segment.
