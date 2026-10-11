# Step 05 — Draft

Compose the architect doc (and optional paired dev doc). Drafts live in working memory; nothing hits disk until step-07.

## Inputs

- A candidate with `status: "drafting"` from step-04
- `.prism/architect/guides/writing-an-architect-doc.md` — what earns a doc, the scope statement, and § Where new content goes
- `.prism/architect/manifest.json` and the docs it routes — the existing architect doc set
- `.prism/architect/_toolkit/architecture-doc-shape.md` — the four-beat arc, for the paired dev doc only

## Actions

1. **Pick the home before drafting.** Read [`writing-an-architect-doc.md`](../../architect/guides/writing-an-architect-doc.md) in full, then walk § Where new content goes against the existing doc set. Match the candidate's `files` against `manifest.json` and read each routed doc's scope statement.
   - **An existing topic doc owns the subject** → the draft is a new section for that doc. The target is that doc's path.
   - **An umbrella's routes reach the files and the content applies to every file they reach** → the draft is a new section for the umbrella.
   - **Neither** → the draft is a new doc. The target is `.prism/architect/<topic>.md`, where `<topic>` is a descriptive kebab-case name for the concern per the guide's filename rule. In a consumer repo the target is never under `_toolkit/`.

   A doc that already exists for the topic is the common miss, and a second doc on the same subject splits the record. The check runs from files on disk, so a resumed session that regenerates the draft repeats it and lands on the same target.

2. **Draft the content.** Follow the guide: carry what the code cannot say for itself, and open a new doc with its scope statement. A section for an existing doc fits under that doc's scope without widening it. Use the candidate's `topic`, `files`, and `loadBearingReason` as the seed material.

3. **Check `documentation.keepsDevDocs` in `.ai-skills/config.json`.** This field controls whether paired dev docs are drafted at all. See [ADR-0058](../../spec/adrs/_toolkit/0058-single-audience-retires-paired-dev-docs.md) — PRISM has one audience, so paired dev docs are config-conditional, not automatic.

4. **Branch on the config value:**
   - **`keepsDevDocs: true`** → draft a paired dev doc as a narrative companion, shaped by the four-beat arc in [`architecture-doc-shape.md`](../../architect/_toolkit/architecture-doc-shape.md). Cite the arc rather than restating it. The target path is `${documentation.location}/architecture/<topic>.md`. Cross-link both ways.
   - **`keepsDevDocs: false` (or absent)** → skip the paired dev doc. Record `pairedDevDoc: "skipped — keepsDevDocs: false"` in the candidate's state entry. Surface this verdict in step-06 so the user knows the skip was config-driven, not a content judgment.

5. **Update state.** Set `currentPhase: "grilling"` (review loop coming). Append `step-05-draft` to `stepsCompleted`. Atomic write. Do NOT write the doc to disk yet — drafts live inline in chat until step-07.

## Exit condition

The target is chosen (an existing doc or a new path) and the draft is composed in working memory. Optional paired dev doc draft composed (or explicitly skipped with reason). Advance to step-06.
