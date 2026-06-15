# Step 05 — Draft

Compose the architect doc (and optional paired dev doc). Drafts live in working memory; nothing hits disk until step-07.

## Inputs

- A candidate with `status: "drafting"` from step-04
- `.prism/architect/_toolkit/architecture-doc-shape.md` — the four-beat arc

## Actions

1. **Draft the architect doc.** Compose against the four-beat arc named in [`architecture-doc-shape.md`](../../architect/_toolkit/architecture-doc-shape.md). Do not restate the four beats — cite the doc and structure the draft accordingly. Use the candidate's `topic`, `files`, and `loadBearingReason` as the seed material.

2. **Check ADR-0038's two gates for the paired dev doc.** Cite [ADR-0038](../../spec/adrs/_toolkit/0038-paired-dev-doc-gates.md) for the gate definitions:
   - **Category-fit** — does the topic belong in `docs/content/dev/architecture/`?
   - **Pairing-value** — does the narrative version carry information the agent-facing version doesn't?

3. **Branch on gate result:**
   - **Both gates pass** → draft the paired dev doc as a narrative companion. Cross-link both ways.
   - **Either gate fails** → skip the paired dev doc. Record the failed gate in the candidate's `pairedDevDoc` field as the verdict reason. Surface this verdict in step-06 so the user knows why no paired doc was drafted.

4. **Update state.** Set `currentPhase: "grilling"` (review loop coming). Append `step-05-draft` to `stepsCompleted`. Atomic write. Do NOT write the doc to disk yet — drafts live inline in chat until step-07.

## Exit condition

Architect doc draft is composed in working memory. Optional paired dev doc draft composed (or explicitly skipped with reason). Advance to step-06.
