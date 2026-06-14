# Conductor fleet contract — lanes, containment, the conflict gate

Reference doc for fleet scheduling. `step-08-fleet.md` cites this doc instead of restating it.

Fleet is the dispatch engine run over multiple lanes — **one engine, not two.** A pipeline run is a one-lane fleet; everything here applies to a single lane trivially, with the conflict gate and batched reporting becoming no-ops when there's only one lane.

## Lane lifecycle

A lane moves through `active → parked | done`:

- **active** — the lane is running its phase chain through the autonomous Workflow segment.
- **parked** — the lane stopped on a budget (step-07) or an escalation (step-06). It carries its survival history; the run continues without it.
- **done** — the lane completed its lifecycle (including a park at the human merge gate, which is a `done`-for-Sol state — the human owns the merge click).

Each lane's `status`, `currentPhase`, and `worktree` live in goal-state (`.prism/skills/prism-conductor/lib/goal-state.md`).

## Native per-lane containment

Containment is free from the dispatch mechanism, not bolted on. `pipeline(lanes, …)` runs each lane independently — a lane that throws drops to `null` and skips its remaining stages while the others continue (cite `claude.md` § The autonomous segment for the mechanism; do not restate it). A single failure parks one lane; it never halts the eight beside it. Sol records the park and surfaces it in the end-of-run report.

## Conflict gate

Before scheduling lanes in parallel, Sol checks for **overlapping blast radius** — two pending lanes that would touch:

- the same shared type,
- the same architect doc,
- the same plan file.

Overlapping lanes are **serialized, not parallelized.** The chosen default is **refuse-to-parallelize**: when in doubt, run them in sequence. Fail safe, not fast.

**Alternative considered — fan out optimistically, then serialize on conflict after the fact.** Rejected: parallel lanes touching shared surface manufacture merge conflicts and races that cost more to untangle than the serialization saved. The default is recorded here so a user can flip it in review if their fleet's units rarely overlap.

**Pending-vs-active overlap:** the conflict gate checks not only pending-vs-pending, but also **pending-vs-active** — a fold-in targeting a parked or active sibling's live worktree cannot be auto-resolved. Two worktrees touching the same code simultaneously is a race condition the gate cannot safely collapse. When the overlap is pending-vs-active, the fold-in routes to a **human gate** rather than auto-dispatching.

## Cross-lane fold-in

When a discovered fix belongs to another lane (a "fold-in"), the routing depends on that sibling lane's status:

**Sibling is done (worktree cleaned):** spawn a new follow-up-PR lane that:
1. Links the origin PR in its branch name and PR body, per `followup-scope.md § Follow-up PR conventions`.
2. Verifies the diagnosis before implementing — does not assume the original signal's diagnosis is correct without a read.
3. Fixes the missing test that let the bug through (required, not optional).

**Sibling is parked or active (live worktree):** the conflict gate cannot auto-resolve two worktrees on the same code. Route to a human gate; append to `pendingHumanReport`. The human decides whether to fold into the active lane or defer.

## Per-lane isolation

Each fleet lane runs in its own worktree (`isolation: 'worktree'`), recorded as the lane's `worktree` path, bound to the cleanup contract in `.prism/rules/worktree-isolation.md` — removed on success, error, or interruption. A single-lane pipeline run leaves `worktree: null` and uses the current checkout.

## Batched human-gate reporting

`needs-human` pauses across lanes are aggregated into **one** end-of-segment report, never one ping per lane. The shape: "4 lanes parked at merge, 2 need you, 2 running." The batched report drains into step-10's closing report; `pendingHumanReport` in goal-state accumulates the entries across the segment.
