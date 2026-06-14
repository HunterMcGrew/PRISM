# Plan: epic-sol-conductor-phase-d

## Ticket

GitHub epic — *to be opened by Nora* (PRISM tracks on GitHub issues, not Linear). Sourced from the finalized PRD at [`.prism/prds/sol-conductor-phase-d-scale.md`](../prds/sol-conductor-phase-d-scale.md) (`internal` stakes), §7.1/§7.5/§7.8 of [`.prism/plans/sol-product-lead-vision-brief.md`](./sol-product-lead-vision-brief.md), ADR-0049 (sub-conductors permanently rejected), and ADR-0050 (growth loop + convergence governor, whose brakes stay run-wide under partitioning).

## Goal

Scale the Sol conductor to large runs (~100 lanes) by **batching dispatch against the ~12 concurrency cap** and **partitioning the single `conductor-state.json` run-control file** into a root index plus per-epic-subtree partition files — without nesting (sub-conductors are permanently rejected, ADR-0049) and without weakening any Phase A–C invariant or governor brake. Phase D is the terminal phase; it consumes Phase B's `parentId` tree and Phase C's `team`/`dependsOn` fields and redefines neither.

**Build dependency:** Phase D is **last**. Phase B (tree semantics) and Phase C (teams + `dependsOn`) must be on `main` before Phase D work begins — the partition key walks Phase B's `parentId` tree, and batch ordering reads Phase C's `dependsOn` edges. Order this epic third (after the B and C build/merge epics).

---

## User Stories

> Not yet decomposed by Mira. The PRD's 6 user journeys and 12 FR / 6 NFR are the source. Winston has formalized acceptance criteria directly from the PRD success metrics below (`## Acceptance Criteria`); Mira may add `## User Stories` if the build is decomposed per-story, but the AC is the authoritative checklist either way.

---

## Implementation Tasks

> Grouped by persona. Sequenced foundation-first: tasks 1–3 lay the partitioned schema and the two new lib primitives (batcher, partition store); tasks 4–8 wire them into the dispatch/reconcile/report steps; tasks 9–11 harden crash-resume and the run-wide brakes under partitioning; task 12 is config; task 13 is build+verify; task 14 is the dev doc.
>
> **The implementer is Clove** for all spec/doc edits — the conductor's step/lib docs and skill instructions are this feature's source (same model as Phase A: the conductor "code" is its instruction surface). **Winston owns the two ADR candidates** named in `## Decisions` (authored only on Hunter's ratification — not written this session). **Eli owns the dev doc** (task 14).
>
> **Critical naming note (load-bearing):** the runtime run-control file is **`.prism/conductor-state.json`** — *not* `goal-state.json`. The PRD and vision brief use "goal-state" as the *conceptual* name; the actual file and its schema doc are `conductor-state.json` / `lib/goal-state.md`. Phase D partition files are therefore **`.prism/conductor-state.<key>.json`** with a root index at **`.prism/conductor-state.json`**. Every task below uses the real file name; do not introduce a `goal-state.json` file.
>
> **Build note (from Phase A, unchanged):** edits under `.prism/skills/prism-conductor/` (step + lib files) are **not** build inputs — verify content-only changes with `pnpm prism:check` (drift-check + tests + manifest-verify). Edits under `.ai-skills/skills/**` and `.prism/rules/**` **are** build inputs — run `pnpm prism:build` to regenerate the platform copies, then `pnpm prism:check`.

### Clove (implementation)

1. **Partition the `conductor-state` schema — root index + partition files** — `.prism/skills/prism-conductor/lib/goal-state.md`. This is additive and non-breaking (NFR-2): a sub-threshold run stays single-file exactly as today; partitioning is a layout the same schema can take.
   - **In the schema doc, bump the version note and add a new `## Schema (v3 — partitioned layout)` section** *after* the existing `## Schema (v2)` block (do not delete or rewrite v2 — it remains the single-file layout). The v3 section describes the **two-file-class layout** that activates above the partition threshold:
     - **Root index** (`.prism/conductor-state.json`) — same top-level fields as v2 (`version` now `"3"`, `lastUpdated`, `goal`, `runShape`, `autonomyPolicy`, `runId`, `conductorModel`, `status`, `globalBudget`, `pendingHumanReport`) **plus** three new root-only fields:
       - `"partitionManifest": [ { "key": "epic-<laneId>", "path": ".prism/conductor-state.epic-<laneId>.json", "laneCount": 0, "lastWritten": "ISO-8601" } ]` — the canonical record of which partition files exist. Absent/empty on a single-file run.
       - `"lanesSummary": { "<laneId>": { "status": "active | parked | blocked | done", "team": "string or null", "generation": 0, "partitionKey": "epic-<laneId>" } }` — a **denormalized per-lane status summary** covering *every* lane across *all* partitions. This is what cross-partition `dependsOn` checks read instead of opening the other partition file (FR-8, D-A9). Written whenever any partition file is written.
       - `"signals": [ ... ]` — the **run-wide signal registry**, moved to the root index (in v2 it lived per-lane). The registry is run-wide so structural dedup spans all partitions (FR-4, D-A4). Schema of each signal element is unchanged from v2 (`kind`, `note`, `routedTo`, structured `target`, `disposition`, `processedAt`).
     - **Partition files** (`.prism/conductor-state.epic-<laneId>.json`) — each holds `{ "version": "3", "key": "epic-<laneId>", "lastWritten": "ISO-8601", "lanes": [ ... ] }` where `lanes[]` is the **unchanged v2 lane-record array** for the lanes whose epic-subtree root is `<laneId>`. Lane-record schema does not change — only its file location does (FR-5).
   - **In § Field notes, add bullets** stating: (a) `version` `"3"` indicates partitioned-capable code; v3 reads v2 forward (a v2 single-file state has no `partitionManifest` → treat as single-file); v2 code reading a v3 *root index* hits the version-mismatch refusal — the rollback safety (NFR-2/NFR-3). (b) The **partition key is the epic-subtree root** — see Decision *D-A3*; `lanesSummary[laneId].partitionKey` is `"epic-" + walkToEpicRoot(laneId)`. A lane with no epic ancestor (a flat run, no `parentId`) partitions under a synthetic `"epic-root"` key or stays single-file below threshold. (c) The `signals[]` registry and `globalBudget` live **only** in the root index — never in a partition file — so dedup and budget are run-wide by construction (FR-4, FR-9). (d) `lanesSummary` is denormalized: a lane's `status`/`generation` appears in *both* its partition file's lane record *and* the root summary; the partition file is the source of truth for the full record, the summary is the read-fast copy for cross-partition checks (D-A9).
   - **Verification:** content-only — `pnpm prism:check`.
   - **Sequence:** first (tasks 2–11 reference this schema).

2. **Partition store — read/write/atomic protocol as a reusable lib** — new file `.prism/skills/prism-conductor/lib/partition-store.md`. This is the partition analogue of v2's `lib/goal-state.md` § Read/Write/Mutate protocol; cite that doc for the single-file atomic-write mechanism (write `.tmp` → `mv`) rather than restating it. Content:
   - **Onset (FR-11, D-A2):** a run operates single-file (`.prism/conductor-state.json` holding `lanes[]` directly, v2 layout) until the lane count crosses the **partition threshold** (Decision *D-A2*, default 50). On crossing, Sol migrates in place: group existing lanes by epic-subtree root, write one partition file per group, rewrite the root index with `partitionManifest` + `lanesSummary` + the moved `signals[]`/`globalBudget`, and clear `lanes[]` from the root. Pre-Phase-D runs and sub-threshold runs never partition (FR-11, D-A10).
   - **Read strategy (FR-6):** every segment boundary, Sol reads the **root index first** (manifest, `lanesSummary`, `signals[]`, `globalBudget`, governor counters). Then Sol reads **only the partition files** whose lanes are active or ready in the current segment. Sol does **not** read a partition it has not touched this segment unless a cross-partition `dependsOn` edge needs a lane *record* detail beyond what `lanesSummary` carries (for a plain status check, the summary suffices — no partition read).
   - **Write strategy + crash-safety (FR-7, NFR-3):** partition files are written atomically (`.tmp` + `mv`, per `lib/goal-state.md`). **Order is load-bearing:** write all touched partition files first; update each partition's `lastWritten`; then write the **root index last** (which carries the matching `lastWritten` per partition in the manifest, plus the refreshed `lanesSummary`). The root index is the commit point — if Sol crashes before the root write, the manifest still reflects the *previous* segment's timestamps, and resume (task 9) detects the mismatch.
   - **Mutate protocol:** read root → read needed partitions → mutate in-memory → write touched partitions → write root last. Always refresh `lanesSummary` for any lane whose `status`/`generation` changed, in the same root write.
   - Cross-link `lib/goal-state.md` (single-file protocol, schema), `lib/reconcile.md` (registry lives in root), `lib/convergence.md` (governor counters live in root).
   - **Verification:** content-only — `pnpm prism:check`.
   - **Sequence:** after task 1.

3. **Batcher — segment-sized dispatch against the cap, as a reusable lib** — new file `.prism/skills/prism-conductor/lib/batcher.md`. Content: the procedure Sol runs at each dispatch boundary when ready-to-dispatch lanes exceed the cap (FR-1, FR-2).
   - **Input:** the set of *ready* lanes (status not `done`/`parked`, all `dependsOn` edges resolved to `done` per Phase C, no unmet parent-tree hold per Phase B). The cap is read from config (default ~12, Decision *D-A1*; same value as the breadth gate by calibration — cite `lib/convergence.md`, do not restate).
   - **Ordering rules, applied in this priority sequence (Decision *D-A1*, FR-2):** (a) **dependency-unblocking first** — a ready lane that other lanes' `dependsOn` edges point at is ordered ahead, so completing it unblocks the most downstream work; (b) **team co-batching** — among equally-unblocking lanes, prefer co-batching lanes sharing a `team` so a team's parallel work advances together rather than interleaving across segments; (c) **leaf-first within the tree** — ticket lanes before issue lanes before epic lanes (consistent with Phase B's leaf-first dispatch); (d) **generation order** — lower `generation` first. All four are deterministic reads of `goal-state` fields — **Sol makes no semantic priority judgment** (NFR-1, "Won't this time").
   - **Batching:** fill a segment with up to `cap` lanes in the ordered sequence; queue the remainder for the next segment. A lane whose `dependsOn` is *unmet* never enters the queue until the dependency resolves (FR-1) — it is not "queued behind a batch slot," it is "waiting on a dependency," and the two states are distinguished in the report (FR-10).
   - **Budget composition (FR-3, D-A8):** the dispatch budget is **per-run, not per-batch**. Before composing each batch segment, the batcher checks `globalBudget.spent < globalBudget.maxDispatches`; if exhausted, it parks the remaining queue (termination reason `budget-exhausted`) and does not compose the segment. Budget counts **total dispatches across all batch segments** — cite `lib/convergence.md` Brake 1; do not restate the default.
   - **Dedup composition (FR-4):** structural dedup against the run-wide root-index registry runs **at the door, before batch assignment** (cite `lib/reconcile.md`) — a signal deduped in segment 1 is never re-dispatched in segment 2 because dedup precedes batching, not per-batch.
   - Cross-link `lib/convergence.md`, `lib/reconcile.md`, `lib/fleet.md` (the cap and conflict gate the batcher schedules against), `lib/goal-state.md`.
   - **Verification:** content-only — `pnpm prism:check`.
   - **Sequence:** after task 1 (reads the schema fields); parallel with task 2.

4. **Wire the batcher into the dispatch step** — `.prism/skills/prism-conductor/step-04-dispatch.md`. Add a section **§ Batching against the concurrency cap** *before* § The review phase is the gauntlet. Content: when the ready-lane set for a segment exceeds the cap, Sol invokes the batcher (`lib/batcher.md`) to order and slice the ready lanes into a cap-sized segment, authoring the segment's `pipeline()` over that batch; the remainder queues for the next segment's dispatch boundary. State explicitly that batching changes *which* lanes a segment's `pipeline()` covers, not *how* a lane runs — the autonomous segment, the gauntlet, and the merge-only human gate are all unchanged (NFR-1). Cite `lib/batcher.md` for the ordering rules and budget/dedup composition; do not restate them. **Removal/rename completeness:** none — this is additive to an existing file.
   - **Verification:** content-only — `pnpm prism:check`.
   - **Sequence:** after task 3.

5. **Wire the partition store into init/resume + the reconcile loop** — two files:
   - `.prism/skills/prism-conductor/step-01-init.md` — in the resume-detection paragraph, add that on resume Sol reads the **root index first** per `lib/partition-store.md`, and that a partitioned run resumes from the manifest + `lanesSummary` without reading every partition file (NFR-3). Cite `lib/partition-store.md`; do not restate the protocol.
   - `.prism/skills/prism-conductor/step-09-reconcile.md` — in the reconcile procedure, add that the registry read (step 1 of the reconcile primitive) reads `signals[]` from the **root index** (run-wide), and that after the decision box + governor, partition writes follow the partition-store write order (touched partitions first, root index last). Cite `lib/partition-store.md` and `lib/reconcile.md`; do not restate.
   - **Verification:** content-only — `pnpm prism:check`.
   - **Sequence:** after tasks 1, 2.

6. **Cross-partition `dependsOn` resolution via the root-index summary** — `.prism/skills/prism-conductor/lib/fleet.md`. In a new **§ Cross-partition dependency resolution** (after § Conflict gate): a `dependsOn` edge from lane A (partition P1) to lane B (partition P2) is resolved by reading B's `status` from the root index's `lanesSummary`, **not** by opening P2's partition file (FR-8, D-A9). The summary is refreshed on every partition write (task 2), so it is never staler than the last segment boundary — which is the only point dependency resolution is checked (consistent with Phase C's "checks at segment boundary, not mid-segment"). A cross-partition edge to a `parked` dependency surfaces to the human gate, same as Phase C's same-partition parked-dependency rule (cite Phase C FR-3; do not restate). Note that the conflict gate's file-overlap check is unaffected by partitioning — it reads the cross-partition edge list and `lanesSummary` from the root index, never two partition files (PRD "Out of scope — cross-partition merge arbitration").
   - **Verification:** content-only — `pnpm prism:check`.
   - **Sequence:** after tasks 1, 2.

7. **Partition-aware end-of-run report** — `.prism/skills/prism-conductor/step-10-report.md`. Add a **§ Partition-aware summary** (FR-10): when the run partitioned, the report aggregates across partitions and surfaces a **per-partition summary** — for each epic-subtree partition: lane count, status breakdown (active/parked/done), discovered-work count, and budget consumed by that subtree (read-time aggregation, same mechanism as Phase B's per-subtree budget attribution — cite Phase B FR-2; do not restate). Add that the report **also** groups by `team` (Phase C's per-team view) — partition-by-epic and report-by-team are orthogonal (Decision *D-A3*), so the report carries both an epic-partition summary and a team summary. The existing flat lane list is **preserved in full** in the detail section for compatibility (FR-10). Cross-link `lib/partition-store.md`.
   - **Verification:** content-only — `pnpm prism:check`.
   - **Sequence:** after tasks 1, 2; depends on the report file existing (it does — Phase A renamed it to `step-10-report.md`).

8. **Run-wide governor brakes under partitioning** — `.prism/skills/prism-conductor/lib/convergence.md`. Add a **§ Brakes are run-wide under partitioning** (FR-9, NFR-6): the dispatch budget and generation counts live in the **root index** (`globalBudget`, and `lanesSummary[laneId].generation`), so all three brakes evaluate against the **full run's state**, never a per-partition subset. Specifically: (a) the budget counter is root-level — every dispatch in any partition's lanes increments the one counter; (b) the generation cap reads `generation` from `lanesSummary` across all partitions; (c) the **breadth gate counts distinct new lanes summed across all partitions in a single reconcile** — not per-partition (a 6-lane expansion in epic-1 plus a 7-lane expansion in epic-2 is a 13-lane reconcile that trips the gate of 12, even though neither partition alone exceeds it). State the invariant plainly: **no brake is weakened by partitioning.** This is a strong ADR candidate (Decision *D-A3* companion); cite the brake priority order already in this doc, do not restate it.
   - **Verification:** content-only — `pnpm prism:check`.
   - **Sequence:** after task 1.

9. **Crash-safe resume across partitions** — `.prism/skills/prism-conductor/lib/partition-store.md` (extends task 2's file) **and** `.prism/skills/prism-conductor/lib/goal-state.md` § Resume detection / § Corruption recovery. Content (FR-7, NFR-3):
   - **Stale-partition detection:** on resume, Sol reads the root index and, for each partition in the manifest, compares the partition file's `lastWritten` against the manifest's recorded `lastWritten` for that partition. A **match** → the partition is current. A **mismatch** (partition file's timestamp older than, or absent versus, the manifest record — meaning the crash happened after that partition was meant to be written but before the root index committed, or mid-write) → the partition is **potentially stale**.
   - **Stale → `needs-human`, not auto-repair:** a potentially-stale or missing partition surfaces as a `needs-human` gate ("partition epic-N may be stale; confirm before resuming") and is appended to `pendingHumanReport`. Sol does **not** auto-repair — the correct action depends on what the crashed segment accomplished, which Sol cannot infer (D-A10, NFR-3). This mirrors v2's corruption-recovery bias (surface, let the human choose) — cite `lib/goal-state.md` § Corruption recovery; do not restate the single-file `.tmp` cases.
   - **`.tmp` partition files:** a `conductor-state.epic-N.json.tmp` present without its canonical sibling, or both present, follows the same rule as the single-file `.tmp` cases (read canonical; a `.tmp`-only partition is a stale-partition `needs-human` gate). Cite `lib/goal-state.md` § Corruption recovery.
   - Add to `lib/goal-state.md` § Resume detection a row noting that a partitioned run (`partitionManifest` present) runs the stale-partition check from `lib/partition-store.md` before re-dispatching.
   - **Verification:** content-only — `pnpm prism:check`.
   - **Sequence:** after tasks 2, 5.

10. **Registry/dedup survives partitioning — confirm the run-wide path end-to-end** — `.prism/skills/prism-conductor/lib/reconcile.md`. In § 1 (Read the registry) and § 2 (Structural dedup at the door), add that under the partitioned layout the registry (`signals[]`) is read from the **root index**, so structural dedup matches a signal in partition A against signals originating in partitions B and C — dedup is run-wide because the registry is root-level, never per-partition (FR-4, D-A4). Add a § Field note that the root registry has **no size cap in v1** (D-A4 default path); a future refinement may prune `processedAt`-old entries, but v1 keeps the full registry in the hot root index. Cite `lib/partition-store.md` for where the registry lives.
   - **Verification:** content-only — `pnpm prism:check`.
   - **Sequence:** after tasks 1, 2.

11. **Scale-ceiling + breadth-gate interaction at scale** — `.prism/skills/prism-conductor/lib/convergence.md` (extends task 8's file) **and** `.ai-skills/skills/prism-conductor/shared.md` (§ How Sol thinks, the scale-ceiling sentence). Content (D-A6, PRD "Scale ceiling definition"): Phase D targets runs up to ~100 lanes; runs trending beyond that are expected to hit the **breadth gate or budget before reaching that size** — the ceiling is a governance expectation enforced by existing brakes, not a new hard limit Sol checks. State that no new "100-lane" counter is added; the budget (default 100 dispatches) and breadth gate (12 per reconcile) are the existing backstops that keep a run from silently scaling past the ceiling. In `shared.md`, add one sentence to the scale framing that batching + partitioning raise the *practical* run size the conductor handles, while the governor brakes remain the ceiling. **Build input:** `.ai-skills/**` edit → `pnpm prism:build` then `pnpm prism:check`.
   - **Verification:** `pnpm prism:build` then `pnpm prism:check`.
   - **Sequence:** after task 8.

12. **Config-driven thresholds** — `.prism/skills/prism-conductor/lib/goal-state.md` § Field notes (extends task 1). Add a bullet enumerating the **Phase D config seams**, all config-driven not hardcoded (FR-12, NFR-5, SPC secondary-user need): (a) **partition threshold** (default 50 lanes — Decision *D-A2*); (b) **batch size** (default = concurrency cap ~12 — Decision *D-A1*); (c) **team co-batching preference** weight (Decision *D-A1*); (d) **partition key strategy** (default `epic-subtree` — Decision *D-A3*; the seam exists so a consuming team could select `team` or `hybrid`, but `epic-subtree` is the shipped default and the only one v1 implements end-to-end). State that the defaults are Thrive values, overridable by a consuming team — same config-seam contract as Phase A's governor thresholds (cite the existing config-driven-thresholds field note; do not restate).
   - **Verification:** content-only — `pnpm prism:check`.
   - **Sequence:** after task 1.

13. **Build + full verify** — run `pnpm prism:build` then `pnpm prism:check` from the repo root. Confirm the build regenerates platform copies for the edited `.ai-skills/**` sources (tasks 11) with no drift, tests pass, and the manifest verifies. Confirm no task introduced a `goal-state.json` file (grep the tree: `grep -rn "goal-state.json" .prism .ai-skills` should match only documentation references to the *conceptual* name, never a real file path — every real path is `conductor-state*.json`).
   - **Verification:** `pnpm prism:build && pnpm prism:check`.
   - **Sequence:** last (after all Clove tasks).

### Eli (documentation)

14. **Update the conductor dev doc** — `docs/content/dev/ai-skills/conductor.md`. Add narrative sections covering the Phase D scale capability: the batcher (segment-sized dispatch against the cap, the four ordering rules, per-run budget composition), the partitioned `conductor-state` layout (root index + per-epic-subtree partition files, on-demand partition reads, atomic per-partition writes with root-last commit), cross-partition `dependsOn` resolution via the denormalized root summary, crash-safe resume (stale-partition → `needs-human`), the run-wide-brakes-under-partitioning invariant, and the partition-aware report. State plainly that partitioning is a *layout*, not a schema break, and that sub-conductors remain permanently rejected (ADR-0049). Cross-link the Phase D ADR candidates (once Hunter ratifies and they're numbered) and ADR-0049/0050. **Naming:** the doc must use `conductor-state.json` for the real file and may use "goal-state" only when quoting the conceptual PRD name.
   - **Verification:** prose-only — confirm internal links resolve.
   - **Sequence:** after tasks 4–10 (the behavior the doc describes is wired).

---

## Decisions

> Winston, plan authoring. Resolves all 10 PRD `[ASSUMPTION-N]` items. **D-A3 (partition key)** is the load-bearing decision and gets the fullest treatment; **D-A9** (cross-partition resolution) and **D-A1/D-A2** (batch ordering, partition threshold) are next. Two decisions are strong ADR candidates (named below). Items marked **confirm** are Winston's calls presented for Hunter's ratification before implementation. Two items (**D-A5 telemetry, D-A7 per-team autonomy**) are **Hunter-policy** — flagged with the default, not Winston-decided.

### Architecture (ADR candidates — author on Hunter's ratification)

- **D-A3 — Partition key is the epic-subtree root; `team` is a reporting dimension, not a partition boundary. (confirm — ADR candidate)**
  - **Root cause:** the PRD names this "the most load-bearing Phase D design decision." Three candidates: (a) one partition per **epic subtree** (aligns with Phase B's `parentId` tree), (b) one per **team** (aligns with Phase C's `team` field), (c) a **hybrid** per team-epic combination. The choice determines which dependency edges land on the slow cross-partition path.
  - **The decisive analysis — partition to localize the hot path.** This is the same shape as database sharding: you shard to keep the *most-traversed* join inside one shard; if your hottest edge crosses shards, sharding made it worse. In Phase D the hottest cross-partition traffic is the **cross-team `dependsOn` edge** — the PRD's own canonical journey is "frontend lane waits on backend lane." Evaluate each candidate against *that* edge:
    - **Team-partitioning (b)** puts *every* cross-team `dependsOn` across a partition boundary — by construction. The most-traversed edge lands entirely on the root-summary slow path. This is sharding by the wrong key. Rejected.
    - **Epic-partitioning (a)** localizes the common case: a backend-API ticket and the frontend-page ticket that depends on it, both under *Epic: checkout*, live in the **same** partition — their `dependsOn` is an in-partition check, no root-summary hop. Only genuinely *cross-epic* dependencies (rarer) take the slow path, which is exactly where a denormalized summary is the right tool (D-A9). Chosen.
    - **Hybrid (c)** minimizes file size but multiplies partition count combinatorially (teams × epics) and *re-introduces* the cross-team-edge-crosses-boundary problem within each epic. Most complexity, reintroduces the rejected failure mode. Rejected.
  - **Chosen approach:** partition by **epic-subtree root** (`conductor-state.epic-<laneId>.json`, key = `walkToEpicRoot(laneId)`). `team` stays a **field on the lane**, surfaced in the report by grouping (task 7) — partition-by-epic and report-by-team are orthogonal, so Phase B's tree *and* Phase C's teams are both honored without either driving the file boundary into the wrong place. A flat run with no epic ancestor partitions under a synthetic `epic-root` key (or stays single-file below threshold).
  - **Implementation guidance:** the partition key derivation (`walkToEpicRoot`) walks `parentId` to the tree root — it depends on Phase B being on `main` (build dependency). `lanesSummary[laneId].partitionKey` caches the derived key so the walk runs once per lane, not per dependency check.
  - **→ ADR candidate ADR-0055: "Conductor partitions run-control by epic-subtree, not by team."** Promote on Hunter's ratification. This generalizes (it's the durable answer to "how does Sol's state scale") and has a real rejected alternative grounded in a runtime cost — exactly the ADR bar. (Number reserved 0055 — sequenced after Phase B's 0051/0052 and Phase C's 0053/0054 in the roadmap.)

- **D-A3-companion — Governor brakes stay run-wide under partitioning. (confirm — ADR candidate)**
  - **Root cause:** partitioning splits *lane records* across files; the risk is that a brake silently becomes per-partition (e.g., a breadth gate that counts per-file would let two partitions each expand 11 lanes — 22 total — without tripping a gate of 12).
  - **Chosen approach:** the budget counter, generation counts, and signal registry live **only in the root index** (task 1), and every brake evaluates against the summed full-run state (task 8). The breadth gate counts distinct new lanes **summed across all partitions** per reconcile. No brake reads a per-partition subset.
  - **Why an ADR:** this is the invariant that keeps Phase D from quietly eroding the ADR-0050 convergence governor. It's load-bearing, cross-cutting (it constrains every future partition-aware change), and non-obvious (the per-partition counting bug is the natural mistake). Strong ADR candidate.
  - **→ ADR candidate ADR-0056: "Conductor governor brakes are evaluated run-wide, never per-partition."** Promote on Hunter's ratification. (Number reserved 0056.)

### Resolved assumptions

- **D-A1 — Batch ordering: the four-rule sequence is complete; team co-batching is correctly the *second* rule; no lane `priority` field is added. (confirm)**
  - **Root cause:** FR-2 named a four-rule order (dependency-satisfying / team co-batching / leaf-first / generation) but asked whether it's complete, whether team co-batching is the right second rule, and whether a schema `priority` field is needed.
  - **Alternatives considered:** (A) put **dependency-unblocking-maximizing** second instead of team co-batching (order by how many downstream lanes each ready lane unblocks); (B) add an explicit per-lane `priority` field operators set.
  - **Chosen approach:** keep the PRD's order, with rule (a) sharpened to **dependency-unblocking-first** (a ready lane that other lanes depend on goes ahead — this *is* a light form of alternative A, folded into rule (a) rather than competing with team co-batching). Team co-batching stays second because, *among equally-unblocking lanes*, keeping a team's work together across a segment is the next-most-valuable ordering (it's why teams exist — Phase C). Leaf-first and generation-order are deterministic tiebreakers. **No `priority` field** — every rule reads existing `goal-state` fields (`dependsOn`, `team`, `parentId` depth, `generation`); a `priority` field would invite operators to encode semantic importance, which is exactly the "Sol makes no semantic judgment" line (NFR-1). Clean YAGNI win and invariant-preserving.
  - **Implementation guidance:** the four rules are a stable sort applied in sequence (task 3). Determinism is the AC — two runs over the same `goal-state` produce the same batch order.
  - **→ no promotion needed** (resolves PRD D-A1 for this build; the ordering rules are conductor-local to `lib/batcher.md`, and the "no semantic judgment" invariant they preserve is already promoted in ADR-0048/0049).

- **D-A2 — Partition threshold = 50 lanes (a lane-count trigger), config-driven. (confirm)**
  - **Root cause:** the lane count (or other trigger) at which Sol splits the single file was unspecified; the PRD asked whether lane-count, file-size, team-count, or epic-count is the right trigger.
  - **Alternatives considered:** epic-count trigger (partition once N epics exist — "aligns more naturally with the partition key," per the PRD); file-size trigger (partition when the JSON exceeds N KB).
  - **Chosen approach:** **lane-count threshold, default 50**, config-driven. Lane count is the metric the PRD's scale ceiling (D-A6, ~100 lanes) and the concurrency cap are both expressed in, so the threshold composes cleanly with them (50 ≈ the midpoint where re-parsing the whole file per segment starts to cost). Epic-count was tempting (it's the partition key) but a run can have one huge epic with 80 lanes — epic-count wouldn't trip, yet the single file is exactly the bottleneck Phase D targets. File-size is an implementation-leak (couples the trigger to JSON serialization width). Lane-count is the honest proxy for the read/parse cost the PRD names.
  - **Implementation guidance:** the threshold is checked at each reconcile boundary (task 2 onset); crossing it migrates in place. Below it, the run stays single-file (FR-11) — no behavioral change for small runs.
  - **→ no promotion needed** (resolves PRD D-A2; the threshold is a config value, not a durable architectural claim — its home is the `lib/goal-state.md` config-seam field note, task 12).

- **D-A9 — Cross-partition `dependsOn` resolves via a denormalized `lanesSummary` in the root index. (confirm)**
  - **Root cause:** when lane A (partition P1) depends on lane B (partition P2), does Sol open P2's file to check B's status, or read a denormalized summary?
  - **Alternatives considered:** read partition P2's file on every cross-partition dependency check (no denormalization, always-fresh, but a partition read per edge per segment boundary — the cost Phase D exists to avoid).
  - **Chosen approach:** **denormalize.** Add `lanesSummary: { [laneId]: { status, team, generation, partitionKey } }` to the root index (task 1), refreshed whenever any partition is written (task 2). Cross-partition checks read the summary, never the foreign partition file (FR-8, task 6). The denormalization cost (writing `status` to both the partition record and the root summary) is paid once per partition write; the read savings are paid per cross-partition edge per segment — and with epic-partitioning (D-A3) keeping most edges *in*-partition, the summary is consulted only for the genuinely-cross-epic minority. The summary is never staler than the last segment boundary, which is the only point dependency resolution is checked (consistent with Phase C). The two denormalized copies can't drift mid-segment because Sol is the single writer and writes them in one mutate cycle (task 2).
  - **Implementation guidance:** `lanesSummary` is the read-fast copy; the partition lane record is the source of truth for the *full* record. Only `status`/`team`/`generation`/`partitionKey` are summarized — never the full lane record (that would re-create the single-file bottleneck in the root).
  - **→ no promotion needed** (resolves PRD D-A9; the denormalization is a conductor-local schema choice whose durable home is the `lib/goal-state.md` v3 schema, task 1 — the *partition-by-epic* decision it composes with is the ADR-worthy claim, not the summary mechanics).

- **D-A4 — The run-wide signal registry lives in the root index, uncapped in v1. (confirm)**
  - **Root cause:** the registry (`signals[]`) is run-wide so dedup spans partitions — but a large run's registry could grow to hundreds of entries, a per-segment read cost.
  - **Chosen approach:** registry lives in the **root index** (so dedup is run-wide by construction — task 10), **uncapped in v1** (default path). At ~100 lanes (D-A6 ceiling) with structural dedup collapsing duplicate finds, the registry stays in the low hundreds — a JSON array of small objects, cheap to parse. A cap/prune (archiving `processedAt`-old entries out of the hot registry) is a named **future refinement**, not v1 — premature without data showing the read cost bites. Over-engineering a prune now would add resume-complexity (where do archived signals live for crash-safety?) for a cost that may never materialize.
  - **→ no promotion needed** (resolves PRD D-A4; "uncapped in v1, prune is a future refinement" is a scoping call; the registry-is-root-level fact composes with the D-A3-companion run-wide-brakes ADR).

- **D-A6 — Scale ceiling ~100 lanes, enforced by existing brakes, not a new counter. (confirm)**
  - **Root cause:** is ~100 lanes the right v1 ceiling, and should it be expressed as a lane count or differently (2 teams × 50, 5 epics × 20)?
  - **Chosen approach:** **~100 lanes as a governance expectation, not a hard checked limit.** No new "100-lane" counter is added (task 11) — a run trending past ~100 lanes hits the **budget** (default 100 dispatches) or the **breadth gate** (12/reconcile) first, which are the existing backstops. Expressing the ceiling as a lane count (vs. "2×50" or "5×20") keeps it composable with the partition threshold (D-A2, also lane-count) and the budget; the alternative formulations are *instances* of ~100 lanes, not different ceilings. The ceiling is documentation of expected scale, enforced by brakes that already exist — adding a hard 100-lane gate would be a fourth brake duplicating the budget's job.
  - **→ no promotion needed** (resolves PRD D-A6; the ceiling-via-existing-brakes shape is a scoping decision documented in `lib/convergence.md`, task 11).

- **D-A8 — Budget is per-run, not per-batch; the global counter is the sufficient brake. (confirm)**
  - **Root cause:** does batching need per-batch budget subdivision ("each batch gets at most N of the total"), or is the global counter enough?
  - **Chosen approach:** **per-run global counter, no per-batch subdivision** (task 3, FR-3). The batcher checks `globalBudget.spent < maxDispatches` before composing each segment and parks the queue on exhaustion. Per-batch subdivision would re-introduce the exact failure ADR-0050 rejected for discovered-work budgets — two pools each "under budget" while total runs away. A single shape-agnostic counter spanning all batch segments is what keeps the brake honest. This is the budget-is-primary doctrine (ADR-0050 Brake 1) applied to batching: batches are just segments, and every segment's dispatches count against the one counter.
  - **→ no promotion needed** (resolves PRD D-A8; it's the existing ADR-0050 budget doctrine applied to batch segments — no new claim, just confirmation that batching doesn't subdivide the counter).

- **D-A10 — No mid-run migration; "below threshold = single-file" covers all realistic cases; stale partitions are `needs-human`, never auto-repaired. (confirm)**
  - **Root cause:** do pre-Phase-D in-flight runs need special handling, and how does a crashed partition write resume?
  - **Chosen approach:** **no retroactive migration** (FR-11) — a pre-Phase-D run (single-file, below threshold) continues single-file for its lifetime; a new run that crosses the threshold partitions from that point forward (task 2 in-place onset). The "below threshold = single-file" rule covers all realistic in-flight cases because pre-Phase-D runs are by definition sub-threshold-shaped (they ran fine single-file). Crash resume across partitions is **surface-not-repair**: a stale or missing partition is a `needs-human` gate (task 9), because the correct recovery depends on what the crashed segment accomplished — which Sol can't infer. This mirrors Phase A's broken-dependency "surface-not-rewire" and v2's corruption-recovery bias (let the human choose).
  - **→ no promotion needed** (resolves PRD D-A10; the no-migration + surface-not-repair shape is consistent with already-promoted Phase A/v2 conventions — its home is `lib/partition-store.md` and `lib/goal-state.md` § Corruption recovery, task 9).

### Hunter-policy (flagged, not Winston-decided)

- **D-A5 — No separate telemetry/dashboard surface in Phase D. (default path; Hunter confirms before merge)**
  - **Default path (used until resolved):** progress is observed via the partition-aware end-of-run report (task 7) and `conductor-state` partition-file inspection — the same observability surface as Phase A (whose D-A1 made the identical call). No instrumentation is added.
  - **Why flagged for Hunter:** the PRD routes telemetry to Hunter as a "resolve before merge" confirmation, consistent with Phase A. Winston's recommendation is **confirm no telemetry** — all six Phase D success metrics are observable from the report + partition files, and a dashboard is a later-initiative concern. But the call is Hunter's to ratify, not Winston's to close.

- **D-A7 — Autonomy stays run-wide; no per-team or per-partition autonomy ceilings in Phase D. (default path; Hunter decides scope)**
  - **Default path (used until resolved):** one run-wide autonomy ceiling (NFR-5), as in Phases A–C. Partitioning does not introduce per-partition autonomy.
  - **Why flagged for Hunter:** the vision brief (Q8) named per-team autonomy as an open question; Phase C also routed it to Hunter (its D-A3). This is a **policy decision about initiative scope** — whether per-team autonomy belongs to the initiative at all, and if so which phase — not a technical call Winston resolves. Winston's read: per-team autonomy is *not* a Phase D requirement (Phase D is scale-mechanics; autonomy granularity is orthogonal), and if it's ever in scope it's a distinct future initiative. But the scope call is Hunter's.

---

## History

- 2026-06-14 [hmcgrew/sol-product-lead-prd]: Authored Phase D epic plan from the finalized PRD. Resolved all 10 assumptions — D-A3 partition key = epic-subtree (localizes the hot cross-team `dependsOn` path, the sharding-by-right-key argument), `team` stays a reporting dimension. Named two ADR candidates (partition-by-epic; run-wide brakes under partitioning); flagged D-A5/D-A7 for Hunter.

---

## Acceptance Criteria

> Winston, plan authoring — formalized from the PRD's 6 success metrics and 6 user journeys. Epic-grain, observable from the partition-aware end-of-run report and `conductor-state` partition-file inspection (no telemetry surface — D-A5). Reese and Briar derive the verifiable per-PR checklist downstream. Format per `.prism/templates/acceptance-criteria.md`. Citations reference PRD requirements (FR/NFR) and journeys (J) until Mira's user stories exist.

### Behavioral

- [ ] Given a run with more ready-to-dispatch lanes than the concurrency cap, When Sol dispatches a segment, Then it batches the lanes into cap-sized sequential segments and the run completes end-to-end with no operator intervention to split the work (FR-1, J1)
- [ ] Given a lane whose `dependsOn` edge is unmet, When the batcher composes the queue, Then that lane is excluded until its dependency reaches done — it is never batched ahead of its dependency (FR-1, FR-2, J2)
- [ ] Given two ready lanes where one unblocks downstream work, When the batcher orders the queue, Then the unblocking lane is ordered first, then team co-batching, then leaf-first, then generation order — deterministically, with no semantic priority judgment (FR-2)
- [ ] Given a run that exhausts its dispatch budget mid-batching, When the batcher checks budget before the next segment, Then it parks the remaining queue with termination reason budget-exhausted — budget counts total dispatches across all batches, not per-batch (FR-3, D-A8)
- [ ] Given a run that crosses the partition threshold, When Sol writes run-control state, Then it produces a root index plus one partition file per epic subtree, each within a readable size, with no lane records in the root index (FR-5, J3)
- [ ] Given a partitioned run at a segment boundary, When Sol reads state, Then it reads the root index first and only the partition files whose lanes are active or ready that segment — untouched partitions are not re-read (FR-6, J3)
- [ ] Given a `dependsOn` edge crossing two partitions, When Sol resolves it, Then it reads the dependency's status from the root-index summary, not from the foreign partition file (FR-8, D-A9)
- [ ] Given signals naming the same target emitted from two different partitions, When Sol dedups at the door, Then they collapse to one decision unit because the registry is run-wide in the root index (FR-4, J4)
- [ ] Given a run that crashes after one partition is written but before the root index commits, When the run resumes, Then Sol detects the timestamp mismatch and surfaces the stale partition as a needs-human gate rather than auto-repairing (FR-7, NFR-3, J5)
- [ ] Given a partitioned run, When the dispatch budget, generation cap, and breadth gate evaluate, Then each is computed against the full run's state across all partitions — the breadth gate counts new lanes summed across partitions, not per-partition (FR-9, NFR-6, J6)
- [ ] Given a partitioned run completes, When the end-of-run report is produced, Then it surfaces per-epic-partition progress and a per-team summary in addition to the full flat lane list (FR-10, J3)
- [ ] Given a run below the partition threshold, When it executes, Then it operates as a single `conductor-state.json` file exactly as in Phases A–C, with no partition files created (FR-11, D-A2)

### Non-behavioral

- [ ] Phase D introduces no breaking schema change — the partition manifest is additive, a single-file run still parses, and v2 code reading a v3 root index hits the version-mismatch refusal as the rollback safety (NFR-2, NFR-3)
- [ ] No design element introduces nesting, a second concurrency counter, or a second budget — partitioning is a state-layout strategy, not a nesting or concurrency strategy (NFR-4, ADR-0049)
- [ ] Partition threshold, batch size, team co-batching preference, and partition key strategy are config-driven with Thrive defaults overridable by a consuming team (FR-12, NFR-5)
- [ ] The batcher and partition store are built as reusable lib references (`lib/batcher.md`, `lib/partition-store.md`), cited by the step files rather than inlined (per `implementation-task-detail.md` cite-don't-restate)
- [ ] Autonomy remains run-wide — no per-partition or per-team autonomy ceiling is introduced (NFR-5, D-A7 default path)

### AC Adjustments

### AC Sync Log

| Date | Agent | Action | Plan | Linear |
| ---- | ----- | ------ | ---- | ------ |
| 2026-06-14 | Winston | AC authored from PRD success metrics + journeys | created | N/A (GitHub epic pending Nora) |

---

## PR Readiness

Living checklist — updated every time `code-review-self` runs. Reflects current state.

- [ ] No critical or major issues
- [ ] Schema v3 additive — single-file runs still parse; no breaking migration
- [ ] No `goal-state.json` real file introduced — every real path is `conductor-state*.json`
- [ ] All `[ASSUMPTION-N]` items resolved or flagged to Hunter (D-A5, D-A7)
- [ ] ADR candidates ratified by Hunter before promotion (partition-by-epic; run-wide brakes)
- [ ] Build passes — `pnpm prism:build && pnpm prism:check` green
- [ ] PR description up to date
- [ ] Lasting decisions promoted to ADRs (after ratification)

**Last updated:** 2026-06-14
