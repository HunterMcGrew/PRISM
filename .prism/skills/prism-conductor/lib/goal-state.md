# Conductor goal-state file — read / write / mutate protocol

Reference doc for `.prism/conductor-state.json` — Sol's operational run-control file. Step files cite this doc instead of restating the schema.

The file is the **ephemeral run-control channel** in Sol's two-channel model. The durable content bus is the branch plan (source of truth, ADR-0001); goal-state holds only run-state and **pointers** into plans, never work content. It exists because run-control has to survive across per-phase fresh contexts — strike tables, escalation flags, the active Workflow run id, and per-dispatch model tiers must travel between segments without riding Sol's context window.

The schema doc is tracked here; the runtime file lives at `.prism/conductor-state.json` (repo root under `.prism/`) and is **gitignored**, matching the Ren (`.prism/ren-state.json`) and Theo (`.prism/theo-state.json`) precedent. It is **never** seeded at session start — it is born lazily on the first phase transition (per `.prism/rules/lazy-artifacts.md`), so absence means a fresh run.

## Schema (v1)

```json
{
  "version": "1",
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
      "escalation": { "axis": "replan | model | human", "reason": "string", "raisedAt": "ISO-8601" },
      "lastVerdict": "done | needs-fix | blocked | needs-replan | needs-stronger-model | needs-human",
      "signals": [ { "kind": "found-bug | found-followup-work | observation", "note": "string", "routedTo": "persona or null" } ],
      "gate": { "type": "plan-readiness | a-p-c | review | dor", "disposition": "auto-cleared | needs-human | blocked", "clearedBy": "persona name or null", "reasoning": "stakes reasoning when auto-cleared", "since": "ISO-8601" }
    }
  ],
  "pendingHumanReport": ["string"]
}
```

### Field notes

- `autonomyPolicy` is set once at intake (launch / internal / hobby, reusing Parker's stakes-calibration vocabulary). It is the human-set ceiling — a persona may escalate above it (`needs-human` under any policy) but never auto-clear below it.
- `runId` points at the active Workflow run while it is running and is `null` between segments; the plan stays the source of truth regardless.
- `escalation` is absent/null on a lane with no open escalation; `gate` is absent/null when no gate is pending; a lane's `strikes` array is empty until a defect survives a fix attempt. These fields appear only when active — nothing is pre-seeded.
- `lastVerdict` carries the *primary* verdict that routes the lane; `signals[]` carries the *secondary* signals, each routed independently. A dispatch can be `done` and still carry a `found-followup-work` signal.
- `worktree` is `null` for a single-lane (pipeline) run and a checkout path for a fleet lane under worktree isolation.

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
