---
step: step-03-stage-voices
---

# Step 03 — Stage voices

Identify which personas actually touched this work. Only those personas speak in the retro — absent personas don't get scripted in.

## Actions

1. **Mine `## History` branch names** for persona signals. PRISM branches encode the author, not the persona — so the persona signal comes from the history line's summary text and the `[branch-name]` annotation context. Look for explicit persona-attribution language ("Winston re-planned", "Clove implemented", "Briar flagged", "Sasha diagnosed").

2. **Mine `## Implementation Tasks` persona headings** in each plan in scope. Per ADR-0018, persona headings (`### Clove (implementation)`, `### Eli (documentation)`, etc.) are the source of truth for who owned which tasks. A persona heading with at least one task counts as a voice that touched the work.

3. **Mine `## Debugged Issues` and `## Review Issues`** for owner attribution. Debugged Issues with entries imply Sasha; Review Issues imply Briar or Eric.

4. **Dedupe and build the voices array.** Each voice carries:
   - `persona` — the canonical name (Winston, Clove, Briar, Eric, Sasha, Nora, Mira, Pixel, Sage, Eli, Reese, Parker, Theo, Ren, Zoe, Lilac, Atlas, Iris).
   - `role` — the role string as it appears in `skills-ecosystem.md` (e.g. "senior architect", "implementation engineer").
   - `evidenceTouched` — the count of evidence entries (history, decisions, debugged, review) attributed to this persona.

5. **Skip personas with zero evidence.** A retro that scripts in personas who didn't show up is fiction. The point of the multi-voice format is to surface the actual disagreements between the actual participants.

6. **Append to state.**
   ```json
   {
     "voices": [
       { "persona": "Winston", "role": "...", "evidenceTouched": 7 },
       { "persona": "Clove", "role": "...", "evidenceTouched": 12 }
     ],
     "stepsCompleted": [..., "step-03-stage-voices"],
     "currentStep": "step-04-facilitate"
   }
   ```

## Exit condition

`voices` array populated with at least two personas (a single-voice retro isn't a retro — surface the miss and ask the user whether to abort or to expand the scope).
