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
      "parentId": "laneId or null",
      "dependsOn": [],
      "generation": 0,
      "scope": "one-line lane scope statement",
      "pendingTicketCommit": false
    }
  ],
  "pendingHumanReport": ["string"]
}
```

### Field notes

- `version` is `"2"`. v2 code reading a v1 file (missing v2 fields) treats missing fields as `null` — the additive-migration guarantee. v1 code reading a v2 file hits the existing version-mismatch refusal in the read protocol — that refusal is the rollback safety; no down-migration step is needed.
- `autonomyPolicy` is set once at intake (launch / internal / hobby, reusing Parker's stakes-calibration vocabulary). It is the human-set ceiling — a persona may escalate above it (`needs-human` under any policy) but never auto-clear below it.
- `runId` points at the active Workflow run while it is running and is `null` between segments; the plan stays the source of truth regardless.
- `escalation` is absent/null on a lane with no open escalation; `gate` is absent/null when no gate is pending; a lane's `strikes` array is empty until a defect survives a fix attempt. These fields appear only when active — nothing is pre-seeded. `escalation.reason` is typed `"blast-radius"` for decision-box escalations; plain string for other escalation axes. A same-scope-vs-split scope-fit call is never escalated — Nora resolves it inside her four-signal gate.
- `lastVerdict` carries the *primary* verdict that routes the lane; `signals[]` carries the *secondary* signals, each routed independently. A dispatch can be `done` and still carry a `found-followup-work` signal.
- `worktree` is `null` for a single-lane (pipeline) run and a checkout path for a fleet lane under worktree isolation.
- `team` and `dependsOn` ship nullable and are **provisional** (Phase C — shape not yet driven in v1). Do not write logic that reads them until Phase C.
- `parentId` is driven for discovery lineage: a lane spawned from a discovered signal carries the originating lane's `laneId`; `generation = parent.generation + 1`; origin lanes are `generation: 0`. Phase B additionally drives `parentId` as an epic→issue→ticket tree pointer over the flat `lanes[]` — a lane whose `parentId` names a parent lane is a child in that parent's subtree; a lane with at least one child is a **container lane** (epic or issue) that has no implementation phase of its own. Its `status`/`currentPhase` are *derived* from its children (§ tree dispatch, `step-04-dispatch.md`), never dispatched; only leaf lanes (no children) run a phase chain.
- **Container lanes carry `generation: 0` when planned.** A lane emitted by the greenfield decompose chain is `generation: 0` regardless of its depth in the planned tree (epic, issue, and ticket lanes are all gen 0). Generation accrues only from *unplanned* discovery during build (`parent.generation + 1`). Tree depth ≠ generation depth — the convergence governor's generation cap (`lib/convergence.md`) is not triggered by a planned tree's depth, only by discovered work's lineage.
- `pendingTicketCommit` is `true` at the `routed` and `winston-verdict` steps and resets to `false` at `finalized`, enabling deterministic resume after a crash — a `true` value on resume means the ticket was drafted but not committed (surface it to the human), so there is no double-commit and no lost draft.
- Every dispatch counts against `globalBudget.spent` — origin-lane phases, decision-box dispatches (Nora/Winston), and discovered-lane phases alike. A single shape-agnostic counter is what makes the budget brake honest.
- Governor thresholds (`globalBudget.maxDispatches`, generation cap K, breadth gate) and the autonomy→threshold mapping are config-driven; the defaults (100 / K=3 / 12) are Thrive values and are overridable by a consuming team.

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

## Corruption recovery

- `.tmp` + canonical both present → read canonical; the `.tmp` is ignored and overwritten on the next write.
- `.tmp` only (no canonical) → fresh run with a warning; archive the `.tmp` to `.prism/conductor-state.<timestamp>.broken.json`.
