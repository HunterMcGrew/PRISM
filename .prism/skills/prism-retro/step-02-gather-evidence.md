---
step: step-02-gather-evidence
---

# Step 02 — Gather evidence

Walk the target plan(s) and collect everything that constitutes evidence for the retro. Iris reads only — she does not modify the source plan.

## Actions

1. **Read the target plan(s).**
   - Epic-plan mode: read the single plan file at `retroTarget.planPath`.
   - Date-range mode: glob `.prism/plans/*.md` and include every plan whose `## History` section has at least one entry whose date falls inside `[from, to]`.

2. **Categorize the evidence.** For each plan in scope, extract entries from these sections:
   - `## History` — every dated line. Capture date, branch name, and the one-line summary.
   - `## Decisions` — every Decision bullet. Capture the headline, sub-bullets (root cause / alternatives / chosen approach / implementation guidance), and the verdict sub-bullet if present.
   - `## Debugged Issues` — every entry with status, severity, root cause, recommended fix.
   - `## Review Issues` — every entry with severity, status, file:line, problem, suggested fix.

3. **Cross-reference Decisions against Debugged Issues.** For each Decision that names a chosen approach, scan `## Debugged Issues` for entries whose root-cause text overlaps with the Decision's rejection rationale or chosen-approach claim. Flag any divergences — these are the candidates for evidence-based disagreement in step 04.

4. **Write the evidence blob to state.** Append to `.prism/iris-state.json`:
   ```json
   {
     "evidence": {
       "history": [...],
       "decisions": [...],
       "debugged": [...],
       "review": [...],
       "divergences": [...]
     },
     "stepsCompleted": [..., "step-02-gather-evidence"],
     "currentStep": "step-03-stage-voices"
   }
   ```

## Exit condition

`evidence` blob populated in state with categorized entries. At least one entry exists in `history` (a retro with zero history entries has no signal to work with — surface the miss and abort).
