# Step 08 — Fleet

The fleet scheduler — the conductor-loop entry that invokes the fleet contract. Fleet is the dispatch engine run over multiple lanes; a pipeline is a one-lane fleet, so this step also covers the single-lane case trivially. Cite `.prism/skills/prism-conductor/lib/fleet.md` for the lane lifecycle, the native containment mechanism, the conflict gate, and batched reporting — this file schedules against that contract, it does not restate it.

At the step level:

- **Per-lane isolation** — each fleet lane runs in its own worktree (`isolation: 'worktree'`, recorded as the lane's `worktree` path), bound to the cleanup contract in `.prism/references/worktree-mode.md`. A single-lane pipeline run leaves `worktree: null`.
- **Per-lane containment** — a lane that fails or parks does not halt the run; `pipeline(lanes, …)` per-lane independence drops a thrown lane to `null` and skips its remaining stages while the others continue (cite `claude.md` for the mechanism).
- **Conflict gate** — before scheduling lanes in parallel, check for overlapping blast radius (shared types, the same architect doc, the same plan file). Overlapping lanes are **serialized, not parallelized** — the chosen default is refuse-to-parallelize: fail safe, not fast. See `lib/fleet.md` for the rejected fan-out-then-serialize alternative.
- **Batched human-gate reporting** — `needs-human` pauses across lanes are aggregated into one end-of-segment report ("4 lanes parked at merge, 2 need you, 2 running"), never one ping per lane.

## Exit condition

Lanes scheduled per the conflict gate (overlapping units serialized); failed or parked lanes contained without halting the run; `needs-human` pauses batched for step-10.
