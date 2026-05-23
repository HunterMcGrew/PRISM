# Ren state file — read / write / mutate protocol

Reference doc for `.prism/ren-state.json` — Ren's operational state file. Step files cite this doc instead of restating the schema.

## Schema (v1)

```json
{
  "version": 1,
  "lastUpdated": "<ISO 8601 timestamp>",
  "currentPhase": "exploring | categorizing | presenting | grilling | planning | continuing | idle",
  "targetDir": "<relative path>",
  "stepsCompleted": ["<step-id>", "..."],
  "candidates": [
    {
      "id": "<UUID>",
      "topic": "<short noun phrase>",
      "files": ["<relative path>", "..."],
      "status": "pending | grilling | committed | skipped | deferred",
      "strength": "strong | worth-exploring | speculative",
      "problemStatement": "<one-line>",
      "suggestedApproach": "collapse | extract | inline | move",
      "grillNotes": {
        "pass1_designTree": "<text>",
        "pass2_assumptions": "<text>",
        "pass3_deletionTest": "<text>",
        "pass4_alternatives": "<text>",
        "pass5_userConfirm": "<text>"
      },
      "planPath": "<.prism/plans/refactor-<slug>.md | null>",
      "createdAt": "<ISO 8601>",
      "decidedAt": "<ISO 8601 | null>",
      "committedAt": "<ISO 8601 | null>"
    }
  ],
  "startedAt": "<ISO 8601>"
}
```

## Read protocol

1. Open `.prism/ren-state.json`.
2. If absent → return `null` (fresh start).
3. If present → parse JSON.
4. On parse failure: surface error, ask user to confirm fresh start, archive broken file to `.prism/ren-state.<timestamp>.broken.json`.
5. On version mismatch (file's `version` newer than step's expected): refuse to mutate; recommend upgrade or fresh start.

## Write protocol

Atomic. No exceptions.

1. Serialize updated state to JSON with 2-space indent.
2. Write to `.prism/ren-state.json.tmp`.
3. `Bash mv .prism/ren-state.json.tmp .prism/ren-state.json` — atomic on same filesystem.

Never write directly to the canonical path. Partial writes corrupt resumability.

## Mutate protocol

Read → mutate in-memory copy → atomic write back. Always update `lastUpdated`. Batch multiple mutations within one step into a single read-mutate-write cycle.

## Resume detection

| State file | `currentPhase` | Action |
| --- | --- | --- |
| Absent | — | Fresh start. |
| Present | `idle` | Fresh start; archive prior to `.prism/ren-state.<timestamp>.json`. |
| Present | `exploring` | Resume offer; jump to step-02-explore on accept. |
| Present | `categorizing` | Resume offer; jump to step-03-categorize. |
| Present | `presenting` | Resume offer; jump to step-04-present. |
| Present | `grilling` | Resume offer; jump to step-06-grill with current candidate. |
| Present | `planning` | Resume offer; jump to step-07-plan. |
| Present | `continuing` | Resume offer; jump to step-08-continue. |

## Corruption recovery

- `.tmp` + canonical both present → read canonical; tmp is ignored, overwritten on next write.
- `.tmp` only (no canonical) → fresh start with warning; archive tmp to `.prism/ren-state.<timestamp>.broken.json`.
