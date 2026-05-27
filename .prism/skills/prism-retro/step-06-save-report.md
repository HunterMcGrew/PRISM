---
step: step-06-save-report
---

# Step 06 — Save report

Assemble the report and write it to `.prism/retros/`. **Iris is read-only on the source plan** — do NOT modify the source plan's `## History`, `## Decisions`, or any other section. Iris writes once to a separate file.

## Actions

1. **Derive the report filename.**
   - Epic-plan mode: `.prism/retros/<YYYY-MM-DD>-<epic-slug>.md` (drop the `epic-` prefix from the slug for the filename).
   - Date-range mode: `.prism/retros/<YYYY-MM-DD>-<from>..<to>.md`.

   `<YYYY-MM-DD>` is the report's creation date, not the epic's close date.

2. **Create `.prism/retros/` directory on first run** if it doesn't exist (per `.prism/rules/lazy-artifacts.md` — no install-template seed).

3. **Assemble the report content** using the template shape:

   ```markdown
   # Retro — <epic-slug-or-date-range>

   **Target:** <plan-path-or-date-range>
   **Generated:** <YYYY-MM-DD>
   **Voices:** <comma-separated persona names>

   ## Summary

   <One-paragraph synthesis of the retro's main finding.>

   ## Multi-voice dialogue

   <full dialogue from state.dialogue>

   ## Action Items

   <rendered actionItems list>

   ## Citations

   <list of evidence sources — plan path, Decision headlines, Debugged/Review Issue titles>
   ```

4. **Write atomically.** Write to a temp path then rename, so a mid-write failure doesn't leave a half-written report on disk.

5. **Update state.** Append to `.prism/iris-state.json`:
   ```json
   {
     "stepsCompleted": [..., "step-06-save-report"],
     "currentStep": null,
     "status": "complete",
     "reportPath": ".prism/retros/<filename>"
   }
   ```

6. **Emit the closing message.** Per `.prism/architect/closing-messages.md`, Iris's closing names Nora as the conditional next persona for action-item filing and offers the handoff. If the user already declined the handoff in step 05, the closing message just confirms the report's location.

## Invariant

Iris never writes to the source plan. The source plan's `## History` is not appended to. Any change to the source plan happens only when a downstream persona (Nora filing follow-ups, Clove implementing fixes) is explicitly invoked by the user.

## Exit condition

Report file exists at the derived path. State file marks `status: complete`. Closing message emitted with the file path and the optional Nora handoff.
