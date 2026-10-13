# Step 07 — Commit

Write the accepted draft to disk. Update manifest. Atomic state write.

## Inputs

- Accepted architect doc draft from step-06
- Optional accepted paired dev doc draft
- The target chosen in step-05: an existing doc path, or a new `.prism/architect/<topic>.md`

## Actions

1. **Write the architect doc.** For a new doc, use the `Write` tool against the new path. For a section in an existing doc, use the `Edit` tool to insert it into that doc; never create a second doc for a subject an existing doc owns. When a paired dev doc was drafted (`keepsDevDocs: true`), add a closing line at the end of the new doc, or at the end of the new section in an existing doc:

   > `Paired dev doc: <target path>`

   Omit the line when no paired dev doc was drafted.

2. **Write the paired dev doc** (if drafted — `keepsDevDocs: true` only). Use the `Write` tool against the team's configured doc location. Append a closing line:

   > `Agent-facing spec: <architect doc path>`

3. **Update the manifest.** For a new doc, open `.prism/architect/manifest.json` and add an entry routing it to the candidate's `files` field's path patterns. For a section added to an existing doc, add a route only when some of the candidate's `files` are not already reached by that doc's routes. Example structure:

   ```json
   {
     "<file pattern from candidate.files>": "<target path relative to .prism/architect/>"
   }
   ```

   Use the narrowest pattern that holds the governed files, per the guide's § Route-add is part of authoring. Widen to a directory glob only when every file under it is governed by this doc. A route wider than the concern loads the doc into sessions that never needed it.

4. **Update state.** Set candidate `status: "committed"`. Record `decidedAt: "<ISO timestamp>"` and `committedAt: "<ISO timestamp>"`. Set `currentPhase: "presenting"` (back to step-03 for next candidate, or step-08 if none remain). Append `step-07-commit` to `stepsCompleted`. Atomic write — tmp + rename.

5. **Confirm to user.** One-line summary:

   > "Wrote `<target path>`<as a new doc | as a new section><and paired dev doc if applicable>. Manifest <updated | unchanged>. State committed."

## Exit condition

The architect content exists on disk at the target (plus the optional paired dev doc). Every file in the candidate's `files` is reached by a route to the target. Candidate `status: "committed"`. Advance to step-03 (next pending) or step-08 (continue/finish).
