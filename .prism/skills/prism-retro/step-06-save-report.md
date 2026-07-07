---
step: step-06-save-report
---

# Step 06 — Save report

Assemble the report and write it to `.prism/retros/`. **Iris is read-only on the source plan** — do NOT modify the source plan's `## History`, `## Decisions`, or any other section. Iris writes once to a separate file.

## Grain switch on report shape

**At `per-pr` grain**, the report is the compact fidelity note: header + charter-coverage table + any fidelity gap, no dialogue section, no promotion cautions or lesson candidates sections (step-05 didn't produce them at this grain). Filename: `.prism/retros/<epic-slug>/<ticket-id>.md` when the ticket belongs to a known epic (so the epic-grain retro can glob its children), or `.prism/retros/per-pr/<ticket-id>.md` for a standalone ticket with no parent epic.

**At `epic` grain**, the full report as designed below, with the ingested per-PR fidelity notes cited under `### Per-ticket fidelity` in Citations.

## Actions

1. **Derive the report filename.**
   - Epic-plan mode: `.prism/retros/<epic-slug>/<YYYY-MM-DD>-<epic-slug>.md` (drop the `epic-` prefix from the slug for both the directory and filename).
   - Date-range mode: `.prism/retros/<YYYY-MM-DD>-<from>..<to>.md` (no epic subdir — a date-range retro isn't scoped to one epic).
   - Per-PR mode: `.prism/retros/<epic-slug>/<ticket-id>.md` or `.prism/retros/per-pr/<ticket-id>.md` per the grain switch above.

   `<YYYY-MM-DD>` is the report's creation date, not the epic's close date.

2. **Create `.prism/retros/` (and any epic subdirectory) on first run** if it doesn't exist (per `.prism/rules/lazy-artifacts.md` — no install-template seed).

3. **Assemble the report content.**

   **Epic grain:**
   ```markdown
   # Retro — <epic-slug-or-date-range>

   **Target:** <plan-path-or-date-range>
   **Grain:** epic
   **Generated:** <YYYY-MM-DD>
   **Voices:** <comma-separated persona names>

   ## Summary

   <One-paragraph synthesis of the retro's main finding.>

   ## Charter coverage

   <one row per charter item — answered/unanswered, sources used, gap (`not-configured` distinguished from an unreachable source); the final-child CI approximation is named here when applicable per ADR-0047's placement>

   A supporting line beneath the table renders the evidence counts from `evidence.census`.

   ## Multi-voice dialogue

   <full dialogue from state.dialogue, opening with the per-PR fidelity synthesis>

   ## Action Items

   <rendered actionItems list>

   ## Promotion cautions

   <rendered promotionCautions — each Decision the execution record refuted, with citing evidence>

   ## Lesson candidates

   <rendered lessonCandidates — proposed, not appended>

   ## Citations

   ### Plan evidence

   <plan path, Decision headlines, Debugged/Review Issue titles>

   ### Execution record

   <PR-thread / CI / merged-diff citations, each tagged with its source>

   ### Per-ticket fidelity

   <citations into the ingested per-PR fidelity notes>
   ```

   **Per-PR grain:**
   ```markdown
   # Retro — <ticket-id>

   **Target:** <plan-path>
   **Grain:** per-pr
   **Generated:** <YYYY-MM-DD>

   ## Charter coverage

   <one row per charter item — this ticket's fidelity: shipped-vs-said, CI pass/fail, review-clean>

   ## Fidelity gap

   <any divergence between what was said and what shipped, or "none — shipped as planned">

   ## Citations

   ### Plan evidence
   ### Execution record
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

6. **Emit the closing message.** Per `.prism/architect/_toolkit/closing-messages.md`, Iris's closing names Nora as the conditional next persona for action-item filing and offers the handoff (epic grain only — a per-PR fidelity note with 0–2 trivial action items rarely warrants the Nora offer; use judgment). If the user already declined the handoff in step 05, the closing message just confirms the report's location.

## Invariant

Iris never writes to the source plan. The source plan's `## History` is not appended to. Any change to the source plan happens only when a downstream persona (Nora filing follow-ups, Clove implementing fixes, Winston consuming promotion cautions at plan close) is explicitly invoked by the user.

## Exit condition

Report file exists at the derived path, in the shape matching its grain. State file marks `status: complete`. Closing message emitted with the file path and the optional Nora handoff.
