---
Number: 0050
Title: Conductor — Growth via Between-Segment Reconcile, Governed by a Two-Axis Convergence Brake
Status: accepted
Date: 2026-06-14
---

## Context

Sol today conducts a **flat, fixed lane set** — lanes are the input, hand-listed at decompose time, and the run ends when they finish. But real product work discovers itself: a Clove lane finds a bug outside its frame, an Eric review surfaces a follow-up, a Sasha diagnosis spawns a fix. Today that discovered work routes to Nora as a *separate future run* (`found-followup-work → Nora`, `.prism/skills/prism-conductor/lib/report-back.md`) — a ticket that waits for a human to notice and start another run. The fleet cannot grow during the run it was found in, so a single run can't take a goal from "start" to "actually done."

Closing that loop is the smallest net-new capability that unlocks "drive this to done while I'm away," and it is the foundation every later phase reuses. But closing it without braking it creates a new failure mode: an autonomously self-growing fleet runs away — work that finds work that finds work, or sixteen lanes finding the same broken helper, burning budget unsupervised overnight. The loop and its brake have to ship together or v1 ships a hazard.

Two runtime facts shape the mechanism: a lane **cannot be injected into a running Workflow script** (growth has to happen *between* segments), and the engine's ~12-agent concurrency cap and single goal-state file (per [ADR-0049](./0049-conductor-teams-are-lane-groups.md)) bound how much one expansion can safely fan out. The find-and-route half of the loop already exists; this ADR records the reconcile half and the governor.

## Decision

**Growth is a between-segment reconcile-delta primitive.** At each segment boundary Sol reads goal-state (`signals[]` + `lanes[]`), and the next segment's lane set is *recomputed* from it rather than carried forward unchanged — so the lane set becomes an output of the run, not only its input. Discovery-loop growth and (later) greenfield specs→ticket-tree decompose are the **same** primitive; it is built once here and reused by Phases B/C/D.

**Sol holds the registry and dedups structurally — never semantically.** Sol maintains the live registry (it *is* `signals[]` + `lanes[]`) and, before dispatching a decision for a new signal, matches it **structurally** by its `target` against in-flight and already-disposed entries — the same file-overlap class of check the conflict gate already runs — attaching obvious duplicates instead of re-dispatching. The line is firm: Sol tracks and structurally-dedups; every **semantic** "are these the same issue?" / "does this earn a ticket?" call goes to Nora. This is air-traffic control, not interpretation, and it keeps Sol on the right side of ADR-0048.

**Convergence is governed on two axes, with the budget primary.** Three brakes evaluate at reconcile time in priority order:

1. **Dispatch budget (primary, depth- and shape-agnostic).** The "while I'm sleeping" backstop — it caps *total* dispatches whatever the fleet's shape, and every dispatch counts against it (origin-lane phases, decision-box dispatches, discovered-lane phases alike). This is the load-bearing guarantee. The dedup registry is what makes the budget buy real progress rather than redundant investigations.
2. **Generation cap (K = 3 default — a soft gate and a lineage signal).** Generation is *lineage* (`parent.generation + 1`; origin lanes are gen 0), not a wall-clock wave. Gen 1–3 auto-dispatch; a gen-3 lane's finds (gen 4) are captured but **parked to a human gate**. It catches deep recursion the budget's volume cap would miss, and it is reported as a lineage signal.
3. **Breadth gate (default 12, configurable).** A single reconcile that yields more than the threshold of distinct new lanes surfaces the expansion to a human rather than auto-dispatching it — catching the "one reconcile spawns thirty lanes" pathology that neither the budget (might be under) nor generation (all gen-1) catches.

Generation is a reported signal and a soft gate; **the budget is the guarantee.** Every completed run records a termination reason of `converged` (no new work) or `budget-exhausted` — never `killed` or unset.

## Consequences

- **Positive:** One run drives a goal to done including the work that surfaces along the way. The three brakes are not redundant — each catches a distinct runaway shape (total volume, recursion depth, single-expansion breadth) — so the run stops on the *first* limit it hits and reports which. Structural dedup collapses the "N finders, one bug" case before it spends budget. The reconcile-delta primitive is the reuse seam that makes Phases B/C/D cheaper.
- **Negative:** Three brakes under one priority order is more run-control surface to keep coherent than a single budget would be — the priority order is itself load-bearing and must not drift. The breadth-gate default (12) and the concurrency cap (~12) are the same order of magnitude: an auto-dispatched near-or-over-cap expansion *serializes against the cap by queueing*, which is safe (the runtime's default), not a failure — but a team that wants no silent queueing must lower the breadth gate below its cap via the config seam. Generation as a soft gate (not a hard guarantee) means a misconfigured or absent budget is the real runaway risk — which is why the budget, not generation, is primary.
- **Neutral:** Crash-safety rides typed escalation reasons (`blast-radius` | `scope-fit`), a `pendingTicketCommit` flag, and per-step goal-state writes through the deferred-commit decision box; a run interrupted mid-decision resumes without double-committing a ticket or losing a signal. The governor thresholds and the autonomy→threshold mapping are config-driven, not hardcoded to one team's defaults (per the epic plan's `## Decisions`).

## References

- `.prism/plans/sol-product-lead-vision-brief.md` § 7.3–7.5 — the growth loop, decision box, and two-axis convergence this ADR records
- `.prism/prds/sol-product-lead-conductor.md` — the v1 PRD (FR-1, FR-3, FR-7, FR-9; NFR-3, NFR-5)
- `.prism/plans/epic-sol-product-lead-conductor.md` — the epic plan that implements this decision
- [ADR-0049](./0049-conductor-teams-are-lane-groups.md) — the flat lane list this growth loop runs on
- [ADR-0048](./0048-conductor-autonomy-between-gates.md) — Sol dispatches and structurally-tracks; semantic judgment stays with the owning persona
- `.prism/skills/prism-conductor/lib/goal-state.md`, `lib/report-back.md`, `lib/fleet.md` — the run-control schema, signal contract, and conflict gate this design extends
- `.prism/rules/followup-scope.md` — the three-tier dispositions the decision box maps onto
