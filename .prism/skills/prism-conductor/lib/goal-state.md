# Conductor goal-state file — read / write / mutate protocol

Reference doc for `.prism/conductor-state.json` — Sol's operational run-control file. Step files cite this doc instead of restating the schema.

The file is the **ephemeral run-control channel** in Sol's two-channel model. The durable content bus is the branch plan (source of truth, ADR-0001); goal-state holds only run-state and **pointers** into plans, never work content. It exists because run-control has to survive across per-phase fresh contexts — strike tables, escalation flags, the active Workflow run id, and per-dispatch model tiers must travel between segments without riding Sol's context window.

The schema doc is tracked here; the runtime file lives at `.prism/conductor-state.json` (repo root under `.prism/`) and is **gitignored**, matching the Ren (`.prism/ren-state.json`) and Theo (`.prism/theo-state.json`) precedent. It is **never** seeded at session start — it is born lazily on the first phase transition (per `.prism/rules/lazy-artifacts.md`), so absence means a fresh run.

## Schema (v2)

```json
{
  "version": "2",
  "lastUpdated": "ISO-8601",
  "goal": "one-line goal statement",
  "runShape": "pipeline | fleet",
  "autonomyPolicy": "launch | internal | hobby",
  "runId": "workflow run id or null",
  "conductorModel": "opus",
  "status": "running | paused | blocked | done | stopped",
  "globalBudget": { "maxDispatches": 100, "spent": 0 },
  "lanes": [
    {
      "laneId": "slug",
      "unit": "ticket id or feature slug",
      "planPath": ".prism/plans/<id>.md",
      "worktree": "path or null",
      "currentPhase": "prd | stories | design | plan | plan-readiness | implement | self-review | pr-review | qa | docs | done",
      "phaseStatus": "running | awaiting-gate | parked | done",
      "status": "active | parked | blocked | done",
      "models": { "winston": "opus", "clove": "sonnet" },
      "strikes": [ { "issueKey": "string", "count": 2, "history": ["ISO-8601"] } ],
      "failureCount": 0,
      "escalation": { "axis": "replan | model | human", "reason": "blast-radius | string", "raisedAt": "ISO-8601" },
      "lastVerdict": "done | needs-fix | blocked | needs-replan | needs-stronger-model | needs-human",
      "signals": [
        {
          "kind": "found-bug | found-followup-work | observation",
          "note": "string",
          "routedTo": "persona or null",
          "target": {
            "file": "string",
            "symbol": "string or null",
            "scopeSlug": "string or null",
            "errorSignature": "string or null"
          },
          "disposition": "fold-active | followup-pr | new-ticket | drop | null",
          "processedAt": "ISO-8601 or null"
        }
      ],
      "gate": { "type": "plan-readiness | a-p-c | review | dor", "disposition": "auto-cleared | needs-human | blocked", "clearedBy": "persona name or null", "reasoning": "stakes reasoning when auto-cleared", "since": "ISO-8601" },
      "team": null,
      "type": null,
      "parentId": "laneId or null",
      "dependsOn": [],
      "blockedBy": [],
      "generation": 0,
      "scope": "one-line lane scope statement",
      "pendingTicketCommit": false
    }
  ],
  "pendingHumanReport": ["string"],
  "teamConfig": [
    { "team": "string", "modelTier": null }
  ]
}
```

### Field notes

- `version` is `"2"`. v2 code reading a v1 file (missing v2 fields) treats missing fields as `null` — the additive-migration guarantee. v1 code reading a v2 file hits the existing version-mismatch refusal in the read protocol — that refusal is the rollback safety; no down-migration step is needed.
- `autonomyPolicy` is set once at intake (launch / internal / hobby, reusing Parker's stakes-calibration vocabulary). It is the human-set ceiling — a persona may escalate above it (`needs-human` under any policy) but never auto-clear below it.
- `runId` points at the active Workflow run while it is running and is `null` between segments; the plan stays the source of truth regardless.
- `escalation` is absent/null on a lane with no open escalation; `gate` is absent/null when no gate is pending; a lane's `strikes` array is empty until a defect survives a fix attempt. These fields appear only when active — nothing is pre-seeded. `escalation.reason` is typed `"blast-radius"` for decision-box escalations; plain string for other escalation axes. A same-scope-vs-split scope-fit call is never escalated — Nora resolves it inside her four-signal gate.
- `lastVerdict` carries the *primary* verdict that routes the lane; `signals[]` carries the *secondary* signals, each routed independently. A dispatch can be `done` and still carry a `found-followup-work` signal.
- `worktree` is `null` for a single-lane (pipeline) run and a checkout path for a fleet lane under worktree isolation.
- `team`, `dependsOn`, and `type` are driven as of Phase C: `team` groups lanes for scheduling/reporting/discovered-work routing; `dependsOn` is a flat `laneId[]` DAG enforced at dispatch eligibility; `type: "integration" | null` marks a lane as an integration lane (`null` = ordinary lane). Phase A/B runs with null `team` / empty `dependsOn` / null `type` dispatch identically — the fields are additive (NFR-2).
- A lane blocked on an unresolved `dependsOn` edge stays `status: "active"` with `phaseStatus: "parked"` and a `blockedBy: laneId[]` note naming the unresolved edges; it is not a new top-level status value (the four-value status model is unchanged). `blockedBy` is absent when the lane has no unresolved dependency.
- `teamConfig[]` is a top-level nullable array (absent on Phase A/B runs). Each entry is `{ team: string, modelTier: string | null }`. `modelTier` is one of the valid model tier values defined in `shared.md § Model tiering` (e.g. `opus`, `sonnet`); `null` means use the run-wide conductor model. Sol reads `teamConfig[].modelTier` when setting the per-dispatch `model` override for a lane whose `team` matches an entry — the per-team model tier is the override when set; the run-wide model applies otherwise.
- `parentId` is driven for discovery lineage: a lane spawned from a discovered signal carries the originating lane's `laneId`; `generation = parent.generation + 1`; origin lanes are `generation: 0`. Phase B additionally drives `parentId` as an epic→issue→ticket tree pointer over the flat `lanes[]` — a lane whose `parentId` names a parent lane is a child in that parent's subtree; a lane with at least one child is a **container lane** (epic or issue) that has no implementation phase of its own. Its `status`/`currentPhase` are *derived* from its children (§ Tree dispatch, `step-04-dispatch.md`), never dispatched; only leaf lanes (no children) run a phase chain.
- **Container lanes carry `generation: 0` when planned.** A lane emitted by the greenfield decompose chain is `generation: 0` regardless of its depth in the planned tree (epic, issue, and ticket lanes are all gen 0). Generation accrues only from *unplanned* discovery during build (`parent.generation + 1`). Tree depth ≠ generation depth — the convergence governor's generation cap (`lib/convergence.md`) is not triggered by a planned tree's depth, only by discovered work's lineage.
- `pendingTicketCommit` is `true` at the `routed` and `winston-verdict` steps and resets to `false` at `finalized`, enabling deterministic resume after a crash — a `true` value on resume means the ticket was drafted but not committed (surface it to the human), so there is no double-commit and no lost draft.
- Every dispatch counts against `globalBudget.spent` — origin-lane phases, decision-box dispatches (Nora/Winston), and discovered-lane phases alike. A single shape-agnostic counter is what makes the budget brake honest.
- Governor thresholds (`globalBudget.maxDispatches`, generation cap K, breadth gate) and the autonomy→threshold mapping are config-driven; the defaults (100 / K=3 / 12) are Thrive values and are overridable by a consuming team.

## Schema (v3 — partitioned layout)

Version `"3"` activates when the lane count crosses the partition threshold (default 50 — see § Field notes). Below the threshold the run stays single-file (v2 layout) exactly as today. Partitioning is a **layout** the same schema takes, not a breaking change.

### Root index — `.prism/conductor-state.json`

Same top-level fields as v2 (`version: "3"`, `lastUpdated`, `goal`, `runShape`, `autonomyPolicy`, `runId`, `conductorModel`, `status`, `globalBudget`, `pendingHumanReport`) plus three new root-only fields:

```json
{
  "version": "3",
  "lastUpdated": "ISO-8601",
  "goal": "one-line goal statement",
  "runShape": "pipeline | fleet",
  "autonomyPolicy": "launch | internal | hobby",
  "runId": "workflow run id or null",
  "conductorModel": "opus",
  "status": "running | paused | blocked | done | stopped",
  "globalBudget": { "maxDispatches": 100, "spent": 0 },
  "pendingHumanReport": ["string"],
  "teamConfig": [ { "team": "string", "modelTier": null } ],
  "partitionManifest": [
    {
      "key": "epic-<laneId>",
      "path": ".prism/conductor-state.epic-<laneId>.json",
      "laneCount": 0,
      "lastWritten": "ISO-8601"
    }
  ],
  "lanesSummary": {
    "<laneId>": {
      "status": "active | parked | blocked | done",
      "team": "string or null",
      "generation": 0,
      "partitionKey": "epic-<laneId>"
    }
  },
  "signals": [
    {
      "kind": "found-bug | found-followup-work | observation",
      "note": "string",
      "routedTo": "persona or null",
      "target": {
        "file": "string",
        "symbol": "string or null",
        "scopeSlug": "string or null",
        "errorSignature": "string or null"
      },
      "disposition": "fold-active | followup-pr | new-ticket | drop | null",
      "processedAt": "ISO-8601 or null"
    }
  ]
}
```

**Root-only fields (new in v3):**

- `partitionManifest` — the canonical record of which partition files exist. Absent or empty on a single-file (sub-threshold) run. Each entry carries `key` (partition identifier), `path` (relative file path), `laneCount` (number of lanes in this partition), and `lastWritten` (timestamp of the last atomic write to that partition file). Sol updates `lastWritten` after each partition write and uses it for stale-partition detection on resume.
- `lanesSummary` — a **denormalized per-lane status summary** covering every lane across all partitions. This is the read-fast copy that cross-partition `dependsOn` checks read instead of opening the foreign partition file (see `lib/fleet.md § Cross-partition dependency resolution`). Written atomically in the same root-index write that follows every partition write. The partition lane record is the source of truth for the full record; the summary is the indexed copy for cross-partition reads.
- `signals` — the **run-wide signal registry**, moved from per-lane to the root index in v3. The registry is run-wide so structural dedup spans all partitions (see `lib/reconcile.md`). Schema of each signal element is unchanged from v2.

**Note:** The v2 `lanes[]` array is **absent from the root index in a partitioned run** — lanes live in partition files. The root index carries only `lanesSummary` (the status snapshot) and `partitionManifest` (the file map).

### Partition files — `.prism/conductor-state.epic-<laneId>.json`

Each partition file holds the lane records for lanes whose epic-subtree root is `<laneId>`:

```json
{
  "version": "3",
  "key": "epic-<laneId>",
  "lastWritten": "ISO-8601",
  "lanes": [ ]
}
```

The `lanes[]` array contains **unchanged v2 lane records** — only the file location changes. The partition key derivation is `walkToEpicRoot(laneId)`, which walks `parentId` to the tree root (requires Phase B on `main`).

### Field notes (v3 additions)

- `version: "3"` indicates partitioned-capable code. v3 reads v2 forward: a v2 single-file state has no `partitionManifest` → treat as single-file and operate as v2. v2 code reading a v3 root index hits the version-mismatch refusal — the rollback safety (NFR-2/NFR-3).
- The **partition key is the epic-subtree root** ([ADR-0055](../../spec/adrs/_toolkit/0055-conductor-partitions-run-control-by-epic-subtree.md), `lib/partition-store.md`). `lanesSummary[laneId].partitionKey` is `"epic-" + walkToEpicRoot(laneId)`. A lane with no epic ancestor (a flat run, no `parentId`) partitions under a synthetic `"epic-root"` key or stays single-file below threshold.
- The `signals[]` registry and `globalBudget` live **only in the root index** — never in a partition file — so dedup and budget are run-wide by construction. This is the invariant that keeps governor brakes honest under partitioning (see `lib/convergence.md § Brakes are run-wide under partitioning`).
- `lanesSummary` is denormalized: a lane's `status`/`generation` appears in both its partition file's lane record and the root summary. The partition file is the source of truth for the full record; the summary is the read-fast copy for cross-partition checks. The two copies are kept in sync by the partition-store write order (write partition file, then root index in the same mutate cycle — they cannot drift mid-segment because Sol is the single writer).
- **Phase D config seams** (all config-driven, not hardcoded — FR-12, NFR-5, same seam contract as Phase A's governor thresholds above): (a) **partition threshold** — default 50 lanes; (b) **batch size** — default = concurrency cap ~12; (c) **team co-batching preference** weight; (d) **partition key strategy** — default `epic-subtree` (see [ADR-0055](../../spec/adrs/_toolkit/0055-conductor-partitions-run-control-by-epic-subtree.md); a consuming team could select `team` or `hybrid`, but `epic-subtree` is the shipped default and the only one v1 implements end-to-end). All four defaults are Thrive values, overridable by a consuming team. See `lib/partition-store.md` for the onset rule and migration protocol.

## Read protocol

1. Open `.prism/conductor-state.json`.
2. If absent → return `null` (fresh run — no prior state to resume).
3. If present → parse JSON.
4. On parse failure: surface the error, ask the user to confirm a fresh start, and archive the broken file to `.prism/conductor-state.<timestamp>.broken.json` before re-initializing.
5. On version mismatch (file's `version` newer than the step's expected): refuse to mutate; recommend upgrade or fresh start.

## Write protocol

Atomic. No exceptions.

1. Serialize the updated state to JSON with 2-space indent.
2. Write to `.prism/conductor-state.json.tmp`.
3. `Bash mv .prism/conductor-state.json.tmp .prism/conductor-state.json` — atomic on the same filesystem.

Never write directly to the canonical path — a partial write corrupts resumability. Both the canonical file and its `.tmp` sibling are gitignored (task 11 of the foundation PR).

## Mutate protocol

Read → mutate the in-memory copy → atomic write back. Always update `lastUpdated`. Batch multiple mutations within one step into a single read-mutate-write cycle. Read at every dispatch boundary; write at every phase transition.

## Resume detection

| State file | `status` | Action |
| --- | --- | --- |
| Absent | — | Fresh run. |
| Present | `done` / `stopped` | Run is closed; offer a fresh run, archive prior to `.prism/conductor-state.<timestamp>.json`. |
| Present | `running` | Validate `runId` against the schema; on a live run id, resume the Workflow via `resumeFromRunId`; on a stale id, re-dispatch the current segment from lane state. |
| Present | `paused` | Resume offer; surface `pendingHumanReport`, take the human's input on the open gate, and re-dispatch the gate's owning persona carrying the answer. |
| Present | `blocked` | Resume offer; the blocking lane's `escalation` names the axis and reason — route accordingly. |

**Partitioned run resume:** a run whose root index carries a `partitionManifest` (v3 partitioned layout) runs the stale-partition check from `lib/partition-store.md` before re-dispatching — see that doc's § Stale-partition detection for the timestamp-comparison procedure. A stale or missing partition surfaces as a `needs-human` gate, never auto-repaired.

## Corruption recovery

- `.tmp` + canonical both present → read canonical; the `.tmp` is ignored and overwritten on the next write.
- `.tmp` only (no canonical) → fresh run with a warning; archive the `.tmp` to `.prism/conductor-state.<timestamp>.broken.json`.
- A `conductor-state.epic-N.json.tmp` present without its canonical sibling, or both present, follows the same rule: read canonical if present; a `.tmp`-only partition file is a stale-partition case → surface as `needs-human` gate per `lib/partition-store.md § Stale-partition detection`. Never auto-repair.
