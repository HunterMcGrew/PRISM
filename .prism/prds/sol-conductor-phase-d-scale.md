---
slug: sol-conductor-phase-d-scale
title: "Sol conductor Phase D: scale — batching + state partitioning"
mode: greenfield
stakes: internal
status: finalized
created: 2026-06-14T00:00:00Z
lastEdited: 2026-06-14T00:00:00Z
stepsCompleted: ["step-01-init", "greenfield-step-02-stakes", "greenfield-step-03-mode", "greenfield-step-04-draft", "greenfield-step-05-decision-log", "step-06-review", "step-07-finalize"]
linearInitiativeId: null
---

## Initiative description

Phase D is the fourth and final phase of the Sol product-lead conductor initiative. Phase A (shipped, merged) closed the discovery loop and built the reconcile-delta primitive. Phase B adds hierarchy (epic→issue→ticket tree semantics + greenfield decompose). Phase C adds teams as lane-groups with cross-team dependency sequencing and an integration gate. Phase D addresses what B and C expose: when a run grows large enough — many teams, deep trees, dozens of concurrent tickets — two constraints become load-bearing. The **Workflow engine's concurrency cap (~12 agents/run)** limits how many lanes dispatch simultaneously, and the **single `goal-state` file** becomes a read/write bottleneck when a run spans dozens of tickets across teams and epics. Phase D solves both by adding **batch dispatch against the concurrency cap** and **partitioning run-control state** across multiple files, without changing the underlying reconcile-delta primitive or any of the invariants established in Phases A–C.

Sourced from §7.1 and §7.8 of [`sol-product-lead-vision-brief.md`](../plans/sol-product-lead-vision-brief.md), the Phase A PRD at [`.prism/prds/sol-product-lead-conductor.md`](./sol-product-lead-conductor.md), and the Phase B PRD at [`.prism/prds/sol-conductor-phase-b-hierarchy.md`](./sol-conductor-phase-b-hierarchy.md), all of which name "batching + state partitioning" as explicitly deferred to Phase D.

**Build dependency:** Phase D depends on both Phase B (tree semantics drive the partition shape) and Phase C (team groupings drive batch ordering) being on `main` before Phase D work begins.

---

## Problem statement

**The concurrency cap becomes a ceiling.** The Workflow engine caps concurrent agents at approximately 12 per run. Phase A runs on small, flat lane sets and never approaches the cap. Phases B and C change the math: a greenfield decompose across two teams might generate 30 leaf-ticket lanes (gen-0 planned work) plus discovered work accruing on top. Today, Sol dispatches whatever the current segment's lane set contains and the engine enforces the cap by blocking the overflow. There is no batching strategy — Sol does not order lanes into segments sized to the cap, does not respect priority or dependency ordering across batches, and does not track which lanes are "waiting for a batch slot" vs. "waiting on a `dependsOn` dependency." The cap was a non-issue at Phase A's scale; at Phase D's target scale it is the primary throughput constraint.

**The single-file model becomes a bottleneck.** Run-control lives in one `goal-state` file, the bus across segment boundaries. Phase A's Constraint section names this explicitly: "Partitioning it is a Phase D concern; v1 must work within the single-file model." Phase B's Constraint section names it again: "may constrain the maximum tree size." Phase C will amplify the pressure — teams running in parallel with cross-team dependency edges and an integration gate all serialize through writes to one file. At a large enough run (dozens of tickets across multiple teams and epics), this is both a read-time cost (Sol re-parses the whole file on every segment boundary) and a practical complexity cost (a single file holding hundreds of lane records is hard to inspect, hard to diff in a PR, and fragile under concurrent writes if the model ever shifts).

**Why Phase D is last.** The correct partition strategy depends on the tree structure (Phase B) and the team grouping (Phase C). Partitioning by epic subtree requires epic→issue→ticket tree semantics. Partitioning by team requires team-labeled lane-groups. Neither is available in Phase A. Phase D is last because it correctly builds on top of what B and C define, rather than anticipating a shape that hadn't yet landed.

**The rejected alternative, restated prominently.** The vision brief (§5) originally floated sub-conductors as the "Phase D" answer to scale. §7.1 and ADR-0049 permanently rejected this on runtime grounds: the Workflow engine forbids nesting deeper than one level (`workflow()` inside a child throws), and a nested workflow *shares the parent's concurrency cap, agent counter, and budget* — so a sub-conductor is structurally blocked and buys **zero** throughput over the current design. Sub-conductors are not an alternative to batching and partitioning; they are a non-starter that consumes complexity for no gain. Phase D's answer is batching against the cap and partitioning the single-file model. This is stated here, not only in "Won't this time," because it is the primary reframing of what "scale" means in this conductor.

---

## Target users

- **PRISM operators running large initiatives (primary).** Developers who hand Sol a large goal — a finalized PRD across multiple teams, a full epic with a deep ticket tree — and want the run to proceed efficiently without either hitting the concurrency cap as a hard wall or requiring them to manually split the work into sub-runs. They do not care about partitioning implementation details; they care that large runs complete without stalling or overflowing.
- **The run owner / human gate.** Whoever sets the autonomy ceiling and clears escalation gates. At Phase D's target scale, the end-of-run report and any mid-run escalations become harder to read if they conflate work from multiple teams and epics into a flat list. Partition-aware reporting (progress per team, per epic) becomes load-bearing for the human reviewer, not a cosmetic improvement.
- **The PRISM personas, as parties to the run-control contract.** Sol's batch dispatch and partition read/write are the implementation concern; the personas (Clove, Briar, Nora, etc.) write to a `goal-state` surface that may now span multiple files. Their per-lane write behavior is unchanged; what changes is which file a lane's record lives in, and whether Sol's segment boundary reads the whole state or only the relevant partition.
- **Future PRISM-consuming teams (secondary).** They inherit the capability at whatever run scale their initiatives require. Partitioning thresholds (when to split, how large a partition grows before splitting) and batch-size defaults must be config-driven rather than hardcoded so each team's scale profile is tunable.

---

## Success metrics

How we'll know Phase D solved the problem — observable from the end-of-run report, `goal-state` partition files, and run-duration comparison:

- **Large runs complete without manual splitting.** A run with more dispatchable lanes than the concurrency cap (>12 ready-to-dispatch lanes at a given reconcile) completes end-to-end in a single Sol run — no operator intervention to split the work into sub-runs. The batcher sequences lanes into segments automatically, respecting ordering constraints.
- **Batch ordering is correct.** Lanes with unmet `dependsOn` edges are not batched ahead of their dependencies. Lanes with met dependencies are batched in priority order [ASSUMPTION-1]. No `done` lane is re-dispatched because the batcher misread its status.
- **State is partitioned and readable.** Runs larger than the partition threshold [ASSUMPTION-2] produce multiple `goal-state` partition files (e.g., one per epic or one per team [ASSUMPTION-3]), each within a readable size. Sol reads and writes across partitions without data loss or cross-partition corruption. A crashed run resumes deterministically from partition files, the same as from a single file.
- **The cap composition holds.** The dispatch budget (Phase A) and the concurrency cap (Phase D batching) compose correctly: budget counts total dispatches across batches, not per-batch. The dedup registry (Phase A) and structural dedup survive partitioning — a signal in one partition is deduplicated against registries across all partitions. [ASSUMPTION-4]
- **The brakes still hold.** No runaway behavior surfaces from batching or partitioning: the generation cap (K=3), breadth gate (default 12), and dispatch budget are all evaluated against the full run's state, not per-partition subsets.
- **Partition-aware reporting.** The end-of-run report surfaces progress per partition (per team or per epic [ASSUMPTION-3]) in addition to the flat lane list. The human reviewer can read team-level or epic-level progress without parsing the full lane list.

These are outcome statements at initiative grain, not test assertions. Reese and Briar derive the verifiable checklist downstream. There is no separate telemetry surface in Phase D [ASSUMPTION-5].

---

## Scope

### In scope (Phase D)

- **Batch dispatch against the concurrency cap.** When a reconcile produces more ready-to-dispatch lanes than the cap allows, Sol batches them across sequential segments rather than overflowing the cap. The batcher:
  - Sequences lanes into batch segments sized to the cap (or below it, when not enough lanes are ready).
  - Respects `dependsOn` edges from Phase C — a lane whose dependency is unmet does not enter the batch queue until the dependency resolves.
  - Respects the epic→issue→ticket tree from Phase B — leaf-first ordering is the default within a batch.
  - Respects team grouping from Phase C — lanes from the same team are preferentially co-batched when possible, to keep team-parallel work advancing together rather than interleaved. [ASSUMPTION-1]
  - Composes with the dispatch budget (budget is per-run, not per-batch; the batcher checks budget before each batch segment).
  - Composes with the dedup registry (the registry is run-wide; structural dedup happens before batch assignment, not per-batch).

- **`goal-state` partitioning.** When a run exceeds the partition threshold [ASSUMPTION-2], Sol splits run-control state across multiple files. Partition design:
  - **Partition key:** one partition per epic subtree [ASSUMPTION-3], or one per team [ASSUMPTION-3], or a hybrid. The partition key is the load-bearing design decision for Winston and is recorded as [ASSUMPTION-3] with a stated default.
  - **A root index file** (`goal-state.json`) holds the partition manifest (list of partition files, their keys, their lane-count), the run-wide governor state (budget counter, registry of found signals, generation counts, run status), and the cross-partition dependency edge list. No lane records live in the root file.
  - **Partition files** (`goal-state.<key>.json`) hold the lane records for their key (epic or team). Lane records are unchanged in schema — only their file location changes.
  - **Sol reads the root index first,** then reads only the partition files relevant to the current segment's work. Sol does not re-read partitions it has not touched in the current segment unless a cross-partition dependency edge requires it.
  - **Sol writes atomically per partition** (write to `.tmp`, rename) to preserve crash-safety. The root index is written last after all partition writes succeed.
  - **Registry and dedup survive partitioning.** The run-wide registry of `signals[]` lives in the root index file, not in any partition. Structural dedup always runs against the root-level registry, so a signal in partition A is deduplicated against signals from partitions B and C before dispatch.
  - **Cross-partition dependency edges** (from Phase C's `dependsOn` field, where a lane in one team/epic partition depends on a lane in another) are resolved via the root index, not by reading both partition files. The root index caches the `status` of each lane as a summary field, updated each time the partition file is written.

- **Crash-safe resume across partitions.** A run interrupted during a batch segment or a partition write resumes deterministically: the root index's partition manifest is the canonical record of what exists; any partition file missing or in `.tmp` state is surfaced to the human as a `needs-human` gate rather than auto-repaired.

- **Scale ceiling definition.** Phase D targets runs up to approximately 100 lanes [ASSUMPTION-6]. Runs beyond that are out of scope for v1 Phase D and are surfaced to the human via the breadth gate or budget before reaching that size.

- **Partition-aware end-of-run report.** The report aggregates across partitions and surfaces per-partition (per-team or per-epic) progress. The flat lane list is still present for compatibility; the partition-level summary is additive.

- **Config-driven thresholds.** Partition threshold [ASSUMPTION-2], batch size (default: the concurrency cap, ~12), and team co-batching preference [ASSUMPTION-1] are config-driven, not hardcoded.

### Out of scope (explicitly named — not built in Phase D)

- **Phase B tree semantics and Phase C team groupings.** Phase D consumes and extends these; it does not define them. The `parentId`-driven tree is Phase B's. The `team` field and `dependsOn` edges are Phase C's. Phase D's batcher and partitioner read these fields but does not redefine their semantics.
- **Discovery-rate decay** as a productive-vs-runaway convergence signal — a later governor refinement, not a scale concern.
- **Cross-partition merge arbitration.** If two lanes in different partitions both touch the same file, the conflict gate (Phase A) handles it. Partitioning does not introduce a new arbitration surface; the conflict gate reads the cross-partition dependency edge list from the root index.
- **Horizontal scaling beyond the single-process Workflow engine.** Phase D batches within the existing Workflow engine's single-run model. Multi-process or distributed execution is not in scope and is not the scaling model here.
- **Retroactive partition migration for pre-Phase D runs.** Runs started before Phase D ships use the single-file model for their lifetime. No migration converts an existing single-file `goal-state` into partitions mid-run.

### Won't this time

- **Sub-conductors / nested Sol — permanently rejected** (ADR-0049; §7.1 of the vision brief). This is the single most important "Won't" in Phase D, because the original brief named sub-conductors as the Phase D answer to scale, and they are not. The runtime facts that force this conclusion: the Workflow engine forbids nesting deeper than one level (`workflow()` inside a child throws), and a nested workflow *shares the parent's concurrency cap, agent counter, and budget counter* — a sub-conductor is both structurally blocked and buys **zero** throughput. Batching against the cap and partitioning the single file are the scale answer. The sub-conductor path is closed permanently, not deferred.
- **Sol making semantic judgments.** Phase D does not change this invariant. The batcher orders lanes by priority ordering rules [ASSUMPTION-1] that Sol applies deterministically from `goal-state` fields — it does not interpret "which lane is more important" semantically. Cross-partition dependency resolution is a status lookup, not interpretation.
- **Auto-merge at any scale.** Merge stays the one unconditional human gate (ADR-0011). Batching and partitioning never reach into merge.
- **Per-partition autonomy ceilings.** The autonomy policy remains run-wide. Phase D does not introduce per-partition or per-team autonomy settings. [ASSUMPTION-7]

---

## User journeys

**1. Large team run batches automatically.** An operator hands Sol a two-team goal (backend + frontend, from Phase C) with 28 leaf-ticket lanes across two epics, all gen-0 planned work from the Phase B decompose step. The operator walks away. At the first dispatch segment, Sol's batcher sees 28 ready-to-dispatch lanes and a cap of 12. Sol batches: 12 lanes dispatch in segment 1, 12 in segment 2, and 4 in segment 3. At each segment boundary Sol reconciles, applies dedup, checks the budget, and queues the next batch. The operator returns to an end-of-run report showing all 28 tickets done plus any discovered work (gen 1+) that ran and converged within the same run.

**2. Dependency ordering is respected in batching.** A cross-team dependency (Phase C) says "frontend lane F3 depends on backend lane B2." B2 is not done when the batcher runs. Sol's batcher places F3 in a batch segment after B2's segment, not ahead of it. B2 completes in segment 1. In segment 2's reconcile, B2 is `done` and F3's `dependsOn` edge is satisfied. F3 enters the batch queue for segment 2. No deadlock, no premature dispatch.

**3. State partitions on a large run.** The run has 60 lanes across three epics (planned tree, all gen-0). The partition threshold [ASSUMPTION-2] is crossed. Sol writes `goal-state.json` (root index with partition manifest + run-wide governor state + signal registry) and three partition files (`goal-state.epic-1.json`, `goal-state.epic-2.json`, `goal-state.epic-3.json`). At each segment boundary, Sol reads the root index, then reads only the partitions containing lanes that are active or ready. The human reviewing the run mid-flight can open `goal-state.json` and read the run's status at epic grain without parsing hundreds of lane records.

**4. Cross-partition dedup.** Lane E1 in epic-1's partition and lane E3 in epic-3's partition both emit a signal pointing to the same broken shared helper. The signal registry lives in the root index. Sol's structural dedup at the door checks the root-level registry, finds E1's signal is already registered with the same `target`, and attaches E3's signal to it — one decision unit dispatched, not two. The dedup is run-wide because the registry is root-level, not per-partition.

**5. Crash mid-partition write.** Sol is writing three partition files after a segment boundary. It writes `goal-state.epic-1.tmp`, renames to `goal-state.epic-1.json` (success), then crashes before writing `goal-state.epic-2.tmp`. On resume, Sol reads `goal-state.json` (the root index, which was not yet updated). The manifest shows `goal-state.epic-2.json` exists but its `lastWritten` timestamp is from the previous segment. Sol surfaces this as a `needs-human` gate — "partition epic-2 may be stale; confirm before resuming" — rather than auto-repairing, because the correct action depends on what the crashed segment accomplished.

**6. The brakes hold at scale.** A large run with partitioned state keeps discovering work. The dispatch budget (run-wide, tracked in the root index) exhausts before convergence — Sol parks the remaining batch queue and reports. The generation cap (K=3, run-wide) fires on a gen-3 lane's find — the gen-4 candidate is captured in the root-level registry but parked to a human gate. The breadth gate (default 12) fires when a single reconcile across all partitions yields 15 distinct new lanes — Sol surfaces the expansion to the human rather than auto-dispatching the full 15. All three brakes are evaluated against the full run's state (root index + partition files), not per-partition subsets. No brake is weakened by partitioning.

---

## Requirements

### Functional

- **FR-1 — Batch dispatch against the concurrency cap.** When a segment boundary reconcile produces more ready-to-dispatch lanes than the cap allows (~12), Sol batches them into sequential segments. The batcher reads the cap from config (default ~12; tunable) and queues lanes not dispatched in the current segment for the next. Lanes with unmet `dependsOn` edges are excluded from the batch queue until their dependencies resolve. Lanes within the queue follow the ordering defined in FR-2.
- **FR-2 — Batch ordering rules.** Lanes within the batch queue are ordered as follows, applied in priority sequence: (a) `dependsOn`-satisfying lanes first (a lane whose completion unblocks other lanes is prioritized); (b) team co-batching preference — lanes from the same team are co-batched when the cap permits; (c) leaf-first within a tree — ticket lanes before issue lanes before epic lanes; (d) generation order — lower generation first. [ASSUMPTION-1] The ordering rules are deterministic and config-driven; Sol does not make semantic priority judgments.
- **FR-3 — Budget composition across batches.** The dispatch budget (Phase A `globalBudget.maxDispatches`) counts total dispatches across all batch segments in the run, not per-batch. The batcher checks remaining budget before each batch segment and parks the run if budget is exhausted. [ASSUMPTION-8]
- **FR-4 — Dedup and registry across batches.** The dedup registry (Phase A `signals[]`) is run-wide and batch-agnostic. Structural dedup against the registry occurs at the door (per FR-9 of Phase A) before batch assignment. A signal that was deduplicated in batch segment 1 is not re-dispatched in segment 2.
- **FR-5 — `goal-state` partitioning.** When a run's lane count exceeds the partition threshold [ASSUMPTION-2], Sol partitions run-control state. The partition structure is:
  - **Root index file** (`goal-state.json`): partition manifest (list of partition file paths and their partition keys), run-wide governor state (budget counters, run status, generation counts), cross-partition dependency edge list, per-lane status summary (used for cross-partition dependency resolution without reading partition files), and the run-wide signal registry.
  - **Partition files** (`goal-state.<key>.json`): lane records for the partition's key. Lane record schema is unchanged.
  - The **partition key** is [ASSUMPTION-3] — one partition per epic subtree (default path) or one per team.
- **FR-6 — Partition read strategy.** Sol reads the root index on every segment boundary. Sol reads partition files on-demand — only the partitions containing lanes active or ready in the current segment, unless a cross-partition dependency edge requires reading another partition's lane detail. Sol does not re-read partitions it has not touched in the current segment.
- **FR-7 — Partition write strategy and crash-safety.** Sol writes partition files atomically (`.tmp` + rename). The root index is written last after all partition writes succeed. The root index's `lastWritten` timestamp per partition file is updated when the partition write succeeds; a partition file whose timestamp does not match the root index's record is flagged as potentially stale on resume. A stale partition surfaces as a `needs-human` gate on resume rather than auto-repair.
- **FR-8 — Cross-partition dependency resolution.** A `dependsOn` edge from lane A in partition P1 to lane B in partition P2 is resolved via the per-lane status summary in the root index. Sol does not read partition P2's file to check B's status; it reads the root index's summary field, which is updated whenever P2 is written. [ASSUMPTION-9]
- **FR-9 — Governor brakes are run-wide, not per-partition.** The dispatch budget, generation cap (K=3), and breadth gate (default 12) are evaluated against the full run's state. Budget and generation counts live in the root index. The breadth gate counts distinct new lanes across all partitions in a single reconcile (sum across partitions, not per-partition). No brake is weakened by partitioning.
- **FR-10 — Partition-aware end-of-run report.** The end-of-run report aggregates across partitions and includes a per-partition summary (per-epic or per-team, per [ASSUMPTION-3]) showing lane count, status breakdown, discovered work count, and budget consumed. The existing flat lane list is preserved for compatibility and appears in full in the report's detail section.
- **FR-11 — Partition onset and pre-partition run compatibility.** Runs that do not exceed the partition threshold operate with a single `goal-state.json` file, as in Phases A–C. Partitioning activates only when the threshold is crossed. Pre-Phase D runs (single-file model) remain parseable and are not migrated. [ASSUMPTION-10]
- **FR-12 — Config-driven thresholds.** The partition threshold [ASSUMPTION-2], batch size (default: concurrency cap, ~12), team co-batching preference weight [ASSUMPTION-1], and partition key strategy [ASSUMPTION-3] are config-driven, not hardcoded.

### Non-functional

- **NFR-1 — Invariants preserved.** All Phase A–C NFRs carry forward: Sol dispatches, never does (writes only `goal-state` + chat); the plan is the content bus, `goal-state` is run-control (ADR-0001); merge is the one unconditional human gate (ADR-0011); autonomy is a human-set ceiling — agents escalate above it, never auto-clear below it (ADR-0048). Batching and partitioning change *how* Sol reads and writes run-control state; they do not change *what* Sol writes or what decisions it makes.
- **NFR-2 — Additive, non-breaking.** Phase D does not introduce breaking changes to the `goal-state` schema. The partition manifest in the root index is an additive field; single-file runs still parse and produce a valid root-only `goal-state.json`. Partition files are new files, not a changed schema.
- **NFR-3 — Deterministic crash-safety across partitions.** A run interrupted mid-partition-write resumes deterministically via the root index's partition manifest and timestamp fields. Crash resume does not require reading all partition files — the root index is the recovery entry point.
- **NFR-4 — Lives within Workflow-engine limits.** Batch dispatch sequences lane execution across Workflow segments. Each segment is one level deep (no nested workflows). The concurrency cap (~12) is respected within each segment; the batcher does not attempt to exceed it. Partitioning is a state-management strategy, not a nesting or concurrency strategy.
- **NFR-5 — No per-partition autonomy.** The autonomy policy remains run-wide. Partitioning does not introduce the ability to set different autonomy ceilings for different partitions. [ASSUMPTION-7]
- **NFR-6 — Failure-mode bias preserved.** The over-emit bias (Phase A NFR-5) applies across partitions — a borderline signal in any partition is emitted to the run-wide registry rather than dropped.

---

## Constraints

- **Phase B and Phase C must ship first.** Phase D's batching strategy reads `dependsOn` edges (Phase C) and the `parentId` tree (Phase B). Phase D cannot be built against a codebase missing either. This is a hard delivery sequencing constraint.
- **Workflow engine (technical, hard — same as Phases A–C).** One-level nesting only. ~12 concurrent agents per run. A nested workflow shares the parent's concurrency cap, counter, and budget. The batcher works *within* these limits; it does not change them. These constraints are the reason batching (not sub-conductors) is the scale answer.
- **The sub-conductor path is closed (ADR-0049).** Not a deferred alternative. Sub-conductors are structurally blocked (one-level nesting) and buy zero throughput (shared cap). Phase D does not revisit this. See "Won't this time."
- **Architectural invariants (non-negotiable).** ADR-0001 (plan is content bus), ADR-0011 (merge is the human gate), ADR-0048 (confidence-gated autonomy). Batching and partitioning do not erode them.
- **Tracker-agnostic scope.** Phase D concerns run-control state partitioning, not tracker data. Which tracker Nora writes to (Linear, GitHub issues) is Nora's execution concern, unaffected by Phase D.
- **Phase D is the terminal phase.** There is no Phase E. This is the full scope of the Sol product-lead conductor initiative as currently defined. Future extensions require a new initiative.

---

## Open questions

Phase D has more open questions than any prior phase because the partition strategy, batch ordering, and crash-safety across partitions are the least-resolved design areas. Each assumption below has an explicit default path so Phase D planning can proceed without blocking.

- **[ASSUMPTION-1]** — Batch ordering: team co-batching preference and priority ordering within the queue are not yet specified beyond the four-rule sequence in FR-2. *Default path:* implement FR-2's four-rule ordering sequence in priority order (dependency-satisfying first, team co-batching second, leaf-first third, generation order fourth). *Resolve with Winston during plan authoring:* confirm the ordering is complete (no missing tiebreaker), that team co-batching preference is the right second rule (vs. dependency-satisfying-maximizing), and whether a lane priority field should be added to the schema.

- **[ASSUMPTION-2]** — Partition threshold: the lane count at which Sol splits `goal-state` into partition files is not specified. *Default path:* threshold = 50 lanes (rough midpoint between Phase A's typical small runs and Phase D's 100-lane target scale, per ASSUMPTION-6). *Resolve with Winston:* confirm whether a lane-count threshold is the right trigger (vs. file size, vs. team count, vs. epic count). A team-count or epic-count trigger may align more naturally with the partition key.

- **[ASSUMPTION-3]** — Partition key strategy: the correct partition key is not resolved. The two candidates are (a) one partition per epic subtree (aligns with Phase B's tree structure) and (b) one partition per team (aligns with Phase C's team groupings). A hybrid (one partition per team-epic combination) is possible but adds complexity. *Default path:* one partition per epic subtree. *Resolve with Winston:* this is the most load-bearing Phase D design decision. The choice affects how cross-partition dependency edges are structured, how the batcher reads state, and how the end-of-run report aggregates. Winston's plan authoring is the right venue for a full tradeoff analysis (tree-partitioning vs. team-partitioning vs. hybrid).

- **[ASSUMPTION-4]** — Dedup registry scope: the run-wide signal registry (`signals[]`) lives in the root index. This means every segment boundary, Sol writes the registry to the root index after dedup. For very large runs, the registry may itself become large (hundreds of signals). *Default path:* the registry lives in the root index with no size limit in v1. *Resolve with Winston:* confirm whether a registry that grows to hundreds of entries creates a read-time problem at segment boundaries, and if so, whether the registry should be capped or pruned (e.g., `processedAt` entries older than N segments are archived out of the hot registry).

- **[ASSUMPTION-5]** — No separate telemetry or dashboard surface in Phase D (same as Phase A [ASSUMPTION-1]). *Default path:* progress is observed via the end-of-run report and the partition files. *Resolve before merge:* confirm no instrumentation requirement.

- **[ASSUMPTION-6]** — Target scale ceiling for Phase D is approximately 100 lanes. Runs beyond 100 lanes are out of scope for Phase D and are expected to hit the breadth gate or budget before reaching that size. *Default path:* 100-lane ceiling. *Resolve with Winston:* confirm whether 100 lanes is the right ceiling for v1 Phase D, or whether the ceiling should be expressed differently (e.g., "2 teams × 50 lanes" or "5 epics × 20 tickets").

- **[ASSUMPTION-7]** — Autonomy policy is run-wide (no per-partition or per-team autonomy ceilings in Phase D). *Default path:* run-wide autonomy as in Phases A–C. *Resolve with Hunter:* confirm whether per-team autonomy (e.g., the backend team operates at `hobby` while a high-risk frontend lane operates at `internal`) is in scope for the initiative at all, and if so, which phase it belongs to. The vision brief (Q8) named this as an explicit open question that Phase D does not resolve.

- **[ASSUMPTION-8]** — Budget composition across batches: budget is per-run (not per-batch), and the batcher checks remaining budget before each batch segment. The existing `globalBudget.maxDispatches` counter is the mechanism. *Default path:* implement as described — budget is drawn against the global counter for every lane dispatched in any segment. *Resolve with Winston:* confirm whether per-batch budget subdivision is needed (e.g., "each batch gets at most N of the total budget") or whether the global counter is the right and sufficient brake.

- **[ASSUMPTION-9]** — Cross-partition dependency resolution via root-index status summary: when lane A in partition P1 depends on lane B in partition P2, Sol reads B's status from the root index's per-lane status summary, not from partition P2's file. This means the root index carries a status field for every lane (a denormalized summary). *Default path:* add a `lanes_summary: { [laneId]: { status, team, generation } }` field to the root index, updated whenever any partition file is written. *Resolve with Winston:* confirm the summary shape and confirm that denormalization (writing status to both the partition file and the root summary) is the right trade (vs. reading the partition file on every cross-partition dependency check).

- **[ASSUMPTION-10]** — Pre-Phase D runs (single-file `goal-state`) are not migrated. A run that starts on Phase D code with a single-file `goal-state` (below the partition threshold) continues as single-file for its lifetime. A new run that starts above the threshold partitions from its first segment. *Default path:* implement as described — no mid-run migration, no retroactive partition of existing single-file runs. *Resolve with Winston:* confirm whether any pre-Phase D runs in flight at time of Phase D deploy need special handling, or whether the "below threshold = single-file" rule covers all realistic cases.

---

## Stakeholders

- **Owner / decision-maker — Hunter.** Builds PRISM, sets direction, ratifies this PRD and the Phase D epic plan, and clears the `[ASSUMPTION-N]` items that require his decision ([ASSUMPTION-5] on telemetry, [ASSUMPTION-7] on per-team autonomy ceilings). Merge sign-off is unconditional and human.
- **Implementing personas.** Winston (Phase D epic plan; resolves the load-bearing `[ASSUMPTION-N]` items, especially [ASSUMPTION-3] partition key strategy; ADR authoring if partition or batching decisions generalize; blast-radius reads inside Phase A's decision box carry through), Clove (implementation of the batcher, partition read/write, root index, crash-resume), Briar/Eric (review), Nora (unaffected at execution level — her per-lane ticket writes are partition-agnostic).
- **Affected — future PRISM-consuming teams (SPC).** Inherit the capability at their run scale. Config-driven thresholds (partition threshold, batch size, partition key strategy) must be tunable per team.
- **Sign-off.** Hunter ratifies scope and the ADRs. Merge sign-off is human and unconditional (ADR-0011) — never delegated to Sol.

---

## Decision log link

See [decision-log.md](./sol-conductor-phase-d-scale.decision-log.md).
