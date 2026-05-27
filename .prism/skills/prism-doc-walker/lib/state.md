# Theo state file — read / write / mutate protocol

Reference doc for `.prism/theo-state.json` — the operational state file Theo persists between phases. Step files cite this doc instead of restating the schema.

## Schema (v1)

```json
{
  "version": 1,
  "lastUpdated": "<ISO 8601 timestamp>",
  "currentPhase": "exploring | presenting | grilling | idle",
  "stepsCompleted": ["<step-id>", "..."],
  "visitedPaths": [
    { "path": "<relative path>", "visitedAt": "<ISO 8601>" }
  ],
  "candidates": [
    {
      "id": "<UUID>",
      "topic": "<short topic name>",
      "files": ["<relative path>", "..."],
      "status": "pending | drafting | committed | skipped | deferred",
      "loadBearingReason": "<one paragraph>",
      "suggestedShape": "architect-doc | paired-dev-doc | adr",
      "pairedDevDoc": true,
      "createdAt": "<ISO 8601>",
      "decidedAt": "<ISO 8601 | null>"
    }
  ]
}
```

The `version` field bumps on shape change. Step files compare `version` on read and refuse to mutate if the on-disk schema is newer than the step's expected schema.

## Read protocol

1. Open `.prism/theo-state.json`.
2. If the file is absent, return `null` — the caller treats null as "fresh start, no prior session."
3. If the file exists, parse as JSON.
4. If the parse fails, surface the error to the user with the offending line/column when available, and ask whether to start fresh (archives the broken file to `.prism/theo-state.<timestamp>.broken.json` before starting fresh).

## Write protocol

Every state write is atomic. Never write directly to the canonical path — a partial write during interruption corrupts resumability.

1. Serialize the updated state to JSON with 2-space indent.
2. Write to `.prism/theo-state.json.tmp`.
3. Use `Bash` to `mv .prism/theo-state.json.tmp .prism/theo-state.json`. The `mv` is atomic on the same filesystem.

The atomic protocol applies to every state mutation, no exceptions.

## Mutate protocol

State mutations are a read-mutate-write cycle:

1. Read the current state per the read protocol.
2. Mutate an in-memory copy — never mutate the on-disk file directly.
3. Update `lastUpdated` to the current ISO 8601 timestamp.
4. Write back atomically per the write protocol.

If two phases mutate the same field within one step, batch the mutations into a single read-mutate-write rather than two cycles.

## Resume detection

When Theo starts, step-01-init checks for the state file and routes:

| State file | `currentPhase` | Action |
| --- | --- | --- |
| Absent | — | Fresh start; prompt for target dir. |
| Present | `idle` | Fresh start; archive prior state to `.prism/theo-state.<timestamp>.json`. |
| Present | `exploring` | Resume offer; jump to step-02-scan on accept. |
| Present | `presenting` | Resume offer; jump to step-03-present on accept. |
| Present | `grilling` | Resume offer; jump to step-06-review with the current candidate. |

The resume offer is always presented — the user can override with `fresh` even when the state file is resumable.

## Corruption recovery

If `.prism/theo-state.json.tmp` exists alongside `.prism/theo-state.json`:
- Canonical file is read; tmp file is ignored and overwritten on the next write. This is the most common pattern when a prior session was interrupted between the write and the rename.

If `.prism/theo-state.json.tmp` exists with no canonical file:
- Treat as fresh start; warn the user that prior state may have been corrupted. Archive the tmp file to `.prism/theo-state.<timestamp>.broken.json` for forensic inspection if needed.
