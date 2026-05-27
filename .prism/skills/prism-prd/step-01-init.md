---
step: step-01-init
---

# Step 01 — Init

Detect mode and bootstrap (or resume) a PRD draft.

## Actions

1. **Detect mode** from the trigger phrase:
   - "write a PRD for X" / "spec out X" / "we need a PRD" → greenfield
   - "document this existing feature" / "brownfield PRD" / "PRD for the existing X" → brownfield
   - Ambiguous → ask: "Greenfield (new initiative, interview-driven) or brownfield (document existing feature, code-walking)?"

2. **Check for existing draft.** Glob `.prism/prds/*.md`. For each draft found:
   - If frontmatter `status: draft` AND non-empty `stepsCompleted` → offer to resume: "Found prior draft at `<path>` (last edited `<lastEdited>`). Resume or start fresh?"
   - If `status: finalized` → require explicit user confirmation before any edit ("This PRD is finalized. Edit it anyway?").

3. **On fresh start:**
   - Derive a kebab-case `<slug>` from the user's initiative description.
   - Create `.prism/prds/<slug>.md` with seed frontmatter:
     ```yaml
     ---
     slug: <slug>
     title: "<title>"
     mode: greenfield | brownfield
     stakes: null
     status: draft
     created: <ISO 8601>
     lastEdited: <ISO 8601>
     stepsCompleted: ["step-01-init"]
     linearInitiativeId: null
     ---
     ```
   - Append a one-line "Initiative description" capturing what the user said.

4. **Advance.** Greenfield → step-02-stakes. Brownfield → step-02-explore (lands in PR-3.2; for now, stub returns "brownfield mode pending PR-3.2 implementation").

## Exit condition

PRD file exists at `.prism/prds/<slug>.md` with `stepsCompleted: ["step-01-init"]`. Mode confirmed.
