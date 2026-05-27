# Step 01 — Init

Enter this phase at the start of every Theo invocation. Reads existing state if present; offers resume; otherwise initializes a fresh walk.

## Inputs

- `.prism/theo-state.json` (optional — present on resume, absent on first run)
- User-supplied target directory (asked when no state exists)

## Actions

1. **Read state.** Check for `.prism/theo-state.json`:
   - If absent → fresh start (jump to step 3).
   - If present and `currentPhase === "idle"` → fresh start (state is from a clean prior session).
   - If present and `currentPhase !== "idle"` → resume offer (step 2).

2. **Resume offer.** When state exists with a non-idle phase, present:

   > "I see we paused at phase `<currentPhase>` last `<state.updatedAt>`. Resume from there, or start fresh?"

   Wait for the user's choice (`resume` / `fresh`).
   - On `resume`: jump directly to the step file for `state.currentPhase` per the resume-detection routing table in [`lib/state.md`](./lib/state.md#resume-detection). Do not re-initialize state.
   - On `fresh`: archive the prior state to `.prism/theo-state.<timestamp>.json` before continuing to step 3.

   Read, write, and mutate protocols (including atomic-write, corruption recovery, and schema-version handling) live in [`lib/state.md`](./lib/state.md). Do not restate the protocol here.

3. **Fresh start.** Prompt the user for the target directory:

   > "Where would you like me to start? Default is the repo root."

   Accept the directory path (or `<enter>` for repo root).

4. **Write initial state.** Compose the initial JSON:

   ```json
   {
     "schemaVersion": 1,
     "currentPhase": "exploring",
     "targetDir": "<user-supplied path>",
     "stepsCompleted": ["step-01-init"],
     "visitedPaths": [],
     "candidates": [],
     "startedAt": "<ISO timestamp>",
     "updatedAt": "<ISO timestamp>"
   }
   ```

   Write atomically: tmp file + rename. See `.prism/skills/prism-doc-walker/lib/state.md` for the full schema (PR-2.5.3).

5. **Advance.** Move to step 02 (scan).

## Exit condition

State file exists with `currentPhase: "exploring"` and `step-01-init` in `stepsCompleted`.
