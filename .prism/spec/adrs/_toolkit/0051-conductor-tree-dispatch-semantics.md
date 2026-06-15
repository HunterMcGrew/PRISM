---
Number: 0051
Title: Conductor — Container Lanes Are Non-Dispatchable Status-Rollup Nodes
Status: accepted
Date: 2026-06-14
---

## Context

Sol drives a flat `lanes[]` in goal-state, where `parentId` models an epic→issue→ticket hierarchy as parent pointers over the flat list ([ADR-0049](./0049-conductor-teams-are-lane-groups.md)). Phase A shipped `parentId` driven only for *discovery lineage* (a discovered lane points at the lane that spawned it). Phase B makes `parentId` mean the planned tree — Sol has to read and drive that tree, and the first question is what a *parent* lane in the tree actually does at dispatch time.

The Phase B PRD framed it as "parent lanes do not dispatch until children resolve — implement child-first dispatch with parent-lane hold." Pressed on it during planning (`.prism/plans/epic-sol-conductor-phase-b.md`, Decision B-A1), that framing is the wrong shape: an epic or issue lane has no implementation phase of its own. There is nothing to dispatch and nothing to hold — "hold the parent's dispatch" describes a queue entry that never had a job. Two runtime facts also constrain the answer: a lane cannot be injected into a running Workflow script (the dispatched segment is authored up front), and the convergence governor's generation cap counts *lineage*, not tree depth ([ADR-0050](./0050-conductor-growth-loop-and-convergence-governor.md)).

Alternatives considered:

- **(A) The PRD's literal parent-lane hold.** Parent lanes are dispatchable but blocked until children close. Carries a "held dispatch" state that never resolves to work.
- **(B) Container lanes are non-dispatchable nodes whose `status` is derived from children; only leaf lanes run a phase chain.** Chosen.
- **(C) A concurrent "meta" epic lane that runs alongside children to track status.** A dispatch that does no work and burns budget to compute what a read-time rollup gives for free.

## Decision

**A lane with at least one child is a container lane; only leaf lanes dispatch.** A leaf lane is one no other lane names as its `parentId`. The dispatched Workflow segment is authored over the leaf lanes only — container lanes (epics, issues) are never passed to `agent()`, never enter a phase chain, and never count against `globalBudget.spent`. A container lane's `currentPhase` is `null` because it has no phase chain.

**A container lane's `status` is a deterministic run-state rollup, computed from its children at each reconcile boundary:** `done` only when every child is `done` or `dropped`; `blocked` if any child is `blocked`; otherwise `active`. This is a read of child state, not a dispatch. The Phase B invariant — no container lane closes `done` while any child remains `active`, `parked`, or otherwise unresolved (FR-1) — falls out of the rollup rule rather than needing separate enforcement.

**Tree depth is not generation depth.** A planned tree emitted by the greenfield decompose chain is all `generation: 0` regardless of depth — an epic, its issues, and their tickets are every one gen 0. Generation accrues only from *unplanned* discovery during build (`parent.generation + 1`). The convergence governor's generation cap therefore never fires on a planned tree's depth; it counts discovered lineage only. A three-level planned tree is three levels of gen-0 lanes, not a gen-3 expansion.

## Consequences

- **Positive:** Removing the "held dispatch" state is strictly simpler than gating a dispatch that never had work — there is no hold because there is no dispatch. The FR-1 close-gating invariant is a property of the rollup, not a second mechanism to keep coherent. Read-time status rollup costs zero budget, where a concurrent status-tracking lane (alternative C) would spend a dispatch per container. The container/leaf distinction is the model Phase C's `team`-grouping and `dependsOn` sequencing build on — team-level status is the same rollup shape, so Phase C does not re-invent it.
- **Negative:** "Container `status` is derived" is a rule the reader has to hold: a container lane's `status` field in goal-state is *computed output*, not an independently writable value, and any later code that writes a container lane's status directly would corrupt the invariant. The rollup must run at every reconcile boundary, not lazily — a stale container status between boundaries would misreport convergence.
- **Neutral:** No schema change. `parentId` and `generation` already ship in `goal-state` v2; Phase B drives their tree meaning as *logic*, never a version bump. A flat (no-`parentId`) run is unaffected — with no container lanes, every lane is a leaf and dispatch is exactly the Phase A behavior.

## References

- `.prism/plans/epic-sol-conductor-phase-b.md` § Decisions B-A1 — the decision this ADR records, with the three alternatives and the chosen rollup rule
- `.prism/prds/sol-conductor-phase-b-hierarchy.md` — the Phase B PRD (FR-1, FR-3, FR-9)
- [ADR-0049](./0049-conductor-teams-are-lane-groups.md) — the flat `lanes[]` and the `parentId` parent-pointer model this tree dispatch runs on
- [ADR-0050](./0050-conductor-growth-loop-and-convergence-governor.md) — the convergence governor whose generation cap counts lineage, not tree depth
- [ADR-0052](./0052-conductor-greenfield-decompose-and-ratification-gate.md) — the greenfield decompose chain that emits the planned gen-0 tree this dispatch model drives
- `.prism/skills/prism-conductor/lib/goal-state.md`, `step-04-dispatch.md`, `lib/convergence.md`, `step-10-report.md` — the schema field notes, tree-dispatch section, convergence check, and tree-structured report that implement this decision
