# Sasha — Case File & Cross-Session Resumability

Reference for `prism-debugger`. Read this when an investigation may outlast a single conversation, when resuming a prior session, or when closing out a case — anything touching `.prism/sasha-state.json`. The skill body pins the six-phase spine; this file carries the state-management procedure.

> _Operational state in `.prism/sasha-state.json` — schema, atomic writes, resume detection, cleanup._

Diagnostic sessions sometimes outlast a single conversation — multi-day production incidents, intermittent bugs with multi-day repro windows, complex distributed-system traces. Sasha persists operational state to `.prism/sasha-state.json` so an interrupted investigation can resume cleanly across sessions.

The case file follows the **lighter variant** of the micro-file step machine pattern (see [`micro-file-step-machine.md`](../micro-file-step-machine.md) § "Lighter variant — state file only, no per-step files"). A single state file carries operational state; the durable findings live in the plan's `## Debugged Issues` entry, so per-phase files would duplicate that artifact without adding signal.

## Schema

```json
{
  "schemaVersion": 1,
  "caseSlug": "prism-1234-empty-array",
  "currentPhase": 3,
  "phasesCompleted": [1, 2],
  "status": "in-progress",
  "category": "timing",
  "hypotheses": [
    {
      "id": "h1",
      "rank": 0.6,
      "text": "Race condition between fetch and state setter",
      "falsificationCriterion": "logging shows fetch completes before setter",
      "status": "open"
    },
    {
      "id": "h2",
      "rank": 0.25,
      "text": "Server-side cache returning stale empty result",
      "falsificationCriterion": "direct curl returns populated data",
      "status": "refuted",
      "refutedBy": "curl test 2026-05-23, populated response"
    }
  ],
  "confirmedEvidence": [
    {
      "claim": "empty array returned on 2nd consecutive call",
      "source": "network panel 2026-05-23",
      "phase": 2
    }
  ],
  "instrumentationTags": ["[DEBUG-a3f9c1]", "[DEBUG-7b2e4d]"]
}
```

- `caseSlug` — short identifier, typically `<ticket-id>-<short-symptom>`. One case per ticket; multiple symptoms within one ticket are keyed under `hypotheses` and `confirmedEvidence`, not as separate cases.
- `currentPhase` / `phasesCompleted` — integers 1–6 matching the six-phase frame.
- `status` enumerates `not-started | in-progress | paused | complete | aborted`.
- `category` — the Phase 2 categorization (`data | control_flow | timing | integration | environmental`).
- `hypotheses` — ranked Phase 3 outputs. Hypotheses are never deleted; refuted ones get `status: refuted` with the refutation evidence. This preserves the audit trail and matches the `Refuted hypotheses` field in the plan entry.
- `confirmedEvidence` — anchor points for the diagnosis. Every Phase 3 hypothesis should be expanded outward from at least one entry here (Stronghold-first principle).
- `instrumentationTags` — `[DEBUG-<hash>]` tags Sasha added during Phase 4. The Phase 6 cleanup gate greps against this list to confirm every tag was removed.

## Atomic-write protocol

Mirror Theo's pattern: write to `.prism/sasha-state.json.tmp`, then rename. Never write directly to the canonical path — partial writes leave the state file unreadable if the session interrupts mid-update.

## Resume detection

On Sasha invocation, check for an existing state file matching the current ticket or branch:

1. Look for `.prism/sasha-state.json`. If absent, no resume — proceed with normal Phase 1 entry.
2. If present and `caseSlug` matches the current ticket: read `currentPhase` and `status`.
   - If `status` is `in-progress` or `paused`: offer "Found prior case at Phase N — continue from Phase N, restart from Phase 1, or abort?"
   - If `status` is `complete` or `aborted`: state is historical; ask whether to start a fresh case or amend the existing one.
3. If present but `caseSlug` does not match the current ticket: a different case is in progress. Surface the slug and ask whether to abort the prior case or resume it instead.

The skill never silently overwrites a prior state file. Resumption is always offered, even if the user clearly wants a fresh run — explicit confirmation is cheaper than discovering the override after the fact.

## Cleanup

On `status: complete`, delete `.prism/sasha-state.json`. The plan's `## Debugged Issues` entry is the durable record; the state file's job is done. Aborted cases (`status: aborted`) also delete on confirmation — the user may want the state preserved for one more pass, so prompt before deletion. The state file follows the lazy-artifact rule (`.prism/rules/lazy-artifacts.md`): it is created on first phase advance, not at session start, and removed when its job is done.
