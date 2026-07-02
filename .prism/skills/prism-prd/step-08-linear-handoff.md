---
step: step-08-linear-handoff
---

# Step 08 — Ticket tracker handoff (optional)

Offer to create a tracker initiative/epic from the finalized PRD. Never runs automatically — always requires explicit user confirmation.

## Preconditions

- PRD `status: finalized` (from step-07).
- A ticket-tracker connector available in the session (Linear MCP when the tracker is Linear). If absent, skip with: "No ticket-tracker connector in this session. Skip the tracker handoff; the PRD lives at `<path>` and can be handed to Nora later."

## Behavior by stakes

- **`hobby`** — skip the offer entirely. The closing summary in step-07 already mentions the option for completeness.
- **`internal`** — offer: "Want me to create a tracker initiative from this PRD? Nora handles the creation; I just hand off the title, summary, and link to this PRD."
- **`launch`** — recommend explicitly: "Launch stakes — recommend creating a tracker initiative for cross-team visibility. Want me to hand off to Nora?"

## Actions on user confirmation

1. **Compose the handoff payload:**
   - `title` — derived from PRD frontmatter `title`
   - `summary` — first paragraph of PRD `## Problem statement`
   - `prdPath` — relative path to `.prism/prds/<slug>.md`
   - `stakes` — PRD frontmatter `stakes`

2. **Route to Nora.** Either invoke the Nora skill inline (Claude) or pass the payload to the user with a one-line invocation prompt: "Run `nora create tracker initiative from <slug>` to complete the handoff."

3. **Receive the tracker initiative ID** from Nora's response. Update PRD frontmatter:
   - `linearInitiativeId: <ID>`
   - `lastEdited: <ISO 8601>`
   - Append `step-08-linear-handoff` to `stepsCompleted`

4. **Confirm:**

   > "Tracker initiative created: `<initiative ID>`. PRD frontmatter updated. Mira can pick up `<slug>` to decompose into stories whenever you're ready."

## Decline path

If the user declines the offer, append `step-08-linear-handoff` to `stepsCompleted` with note `skipped: user declined`. Close the session cleanly.

## Exit condition

Either `linearInitiativeId` (the tracker initiative ID field) is populated in PRD frontmatter, OR the step was explicitly skipped. Session closes.
