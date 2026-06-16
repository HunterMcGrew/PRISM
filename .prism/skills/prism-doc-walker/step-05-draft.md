# Step 05 — Draft

Compose the architect doc (and optional paired dev doc). Drafts live in working memory; nothing hits disk until step-07.

## Inputs

- A candidate with `status: "drafting"` from step-04
- `.prism/architect/_toolkit/architecture-doc-shape.md` — the four-beat arc

## Actions

1. **Draft the architect doc.** Compose against the four-beat arc named in [`architecture-doc-shape.md`](../../architect/_toolkit/architecture-doc-shape.md). Do not restate the four beats — cite the doc and structure the draft accordingly. Use the candidate's `topic`, `files`, and `loadBearingReason` as the seed material.

2. **Flag narrative doc need.** Consider whether the topic warrants human-readable narrative documentation for engineers. This is not automatic — ADR-0058 retired the automatic paired dev doc convention. If the topic does warrant narrative docs, note this for step-06 so the user can decide whether to route to Eli after the architect doc is committed.

3. **Update state.** Set `currentPhase: "grilling"` (review loop coming). Append `step-05-draft` to `stepsCompleted`. Atomic write. Do NOT write the doc to disk yet — drafts live inline in chat until step-07.

## Exit condition

Architect doc draft is composed in working memory. Optional paired dev doc draft composed (or explicitly skipped with reason). Advance to step-06.
