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

4. **Greenfield no-live-user guard** (greenfield mode only). Before advancing, confirm a live user is available to answer the stakes-calibration interview in `greenfield-step-02-stakes.md`. If Parker is running in a non-interactive or dispatched context with no human to interview, emit `needs-human` immediately — name that stakes calibration requires a live interview and cannot proceed without one. This is `needs-human`, not `blocked` — it matches the existing stakes-escape convention (an interview needs human input, not just an unblocking action). Do not wait for step-02-stakes to discover the gap.

5. **Brownfield stakes confirm** (brownfield mode only). Ask one question: "Is this feature hobby-grade, an internal tool, or public-facing/launch scope?" Map the answer to `stakes` using the same hobby/internal/launch categories as `greenfield-step-02-stakes.md`. Update PRD frontmatter: `stakes: <hobby|internal|launch>`, `lastEdited: <ISO 8601>`. This sets `stakes` before `step-06-review.md` needs it — brownfield has no interview-driven stakes step of its own.

6. **Advance.** Greenfield → step-02-stakes. Brownfield → step-02-explore.

## Exit condition

PRD file exists at `.prism/prds/<slug>.md` with `stepsCompleted: ["step-01-init"]`. Mode confirmed.
