# Step 05 — Draft

Compose the architect doc (and optional paired dev doc). Drafts live in working memory; nothing hits disk until step-07.

## Inputs

- A candidate with `status: "drafting"` from step-04
- `.prism/architect/_toolkit/architecture-doc-shape.md` — the four-beat arc

## Actions

1. **Draft the architect doc.** Compose against the four-beat arc named in [`architecture-doc-shape.md`](../../architect/_toolkit/architecture-doc-shape.md). Do not restate the four beats — cite the doc and structure the draft accordingly. Use the candidate's `topic`, `files`, and `loadBearingReason` as the seed material.

2. **Check `documentation.keepsDevDocs` in `.ai-skills/config.json`.** This field controls whether paired dev docs are drafted at all. See [ADR-0058](../../spec/adrs/_toolkit/0058-single-audience-retires-paired-dev-docs.md) — PRISM has one audience, so paired dev docs are config-conditional, not automatic.

3. **Branch on the config value:**
   - **`keepsDevDocs: true`** → draft a paired dev doc as a narrative companion. The target path is `${documentation.location}/architecture/<topic>.md`. Cross-link both ways.
   - **`keepsDevDocs: false` (or absent)** → skip the paired dev doc. Record `pairedDevDoc: "skipped — keepsDevDocs: false"` in the candidate's state entry. Surface this verdict in step-06 so the user knows the skip was config-driven, not a content judgment.

4. **Update state.** Set `currentPhase: "grilling"` (review loop coming). Append `step-05-draft` to `stepsCompleted`. Atomic write. Do NOT write the doc to disk yet — drafts live inline in chat until step-07.

## Exit condition

Architect doc draft is composed in working memory. Optional paired dev doc draft composed (or explicitly skipped with reason). Advance to step-06.
