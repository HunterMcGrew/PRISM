# Step 07 — Commit

Write the accepted draft to disk. Update manifest. Atomic state write.

## Inputs

- Accepted architect doc draft from step-06
- Optional accepted paired dev doc draft
- Candidate `topic` for filename derivation

## Actions

1. **Write the architect doc.** Use the `Write` tool against `.prism/architect/<topic>.md`. The `<topic>` is a kebab-case derivation of the candidate's `topic` field. Append a closing line:

   > `Paired dev doc: docs/content/dev/architecture/<topic>.md`

   Omit the line when no paired dev doc was drafted.

2. **Write the paired dev doc** (if drafted). Use the `Write` tool against `docs/content/dev/architecture/<topic>.md`. Append a closing line:

   > `Agent-facing spec: .prism/architect/<topic>.md`

3. **Update the manifest.** Open `.prism/architect/manifest.json`, add a new entry routing the architect doc to the candidate's `files` field's path patterns. Example structure:

   ```json
   {
     "<file pattern from candidate.files>": "<topic>.md"
   }
   ```

   The starting pattern set is the candidate's `files`; expand to broader globs (e.g. `<dir>/**`) when the topic clearly governs an entire directory.

4. **Update state.** Set candidate `status: "committed"`. Record `decidedAt: "<ISO timestamp>"` and `committedAt: "<ISO timestamp>"`. Set `currentPhase: "presenting"` (back to step-03 for next candidate, or step-08 if none remain). Append `step-07-commit` to `stepsCompleted`. Atomic write — tmp + rename.

5. **Confirm to user.** One-line summary:

   > "Wrote `.prism/architect/<topic>.md`<and paired dev doc if applicable>. Manifest updated. State committed."

## Exit condition

Both files exist on disk (architect doc plus optional paired dev doc). Manifest contains the new routing entry. Candidate `status: "committed"`. Advance to step-03 (next pending) or step-08 (continue/finish).
