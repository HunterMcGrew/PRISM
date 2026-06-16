# Step 06 — Review

Present the draft to the user. Iterate on feedback until accept or discard.

## Inputs

- Architect doc draft from step-05 (inline in working memory)
- Optional paired dev doc draft

## Actions

1. **Present the draft.** Render the architect doc inline in chat with a clear `Architect doc: .prism/architect/<topic>.md` header. If a paired dev doc was drafted (`keepsDevDocs: true`), render it below with `Paired dev doc: <target path>`. If the paired doc was skipped because `keepsDevDocs: false`, surface the config verdict instead ("Paired dev doc skipped — `documentation.keepsDevDocs` is `false` for this team").

2. **Prompt for choice:**

   > `accept` / `iterate` / `discard`?

3. **Branch on the choice:**

   ### `accept`

   No state mutation. Advance to step-07 (commit).

   ### `iterate`

   Ask the user what to change. Apply the requested change to the draft (still in working memory — no disk write). Loop back to step-06 with the revised draft.

   Keep iterating until the user picks `accept` or `discard`. Each iteration:
   - Show the diff (or the revised section) before re-presenting the full draft
   - Confirm the change addressed the feedback before looping

   ### `discard`

   Set the candidate's `status: "skipped"`. Record `decidedAt: "<ISO timestamp>"` and `discardReason: "discarded after review"`. Atomic state write. Drop the draft from working memory. Advance to step-03 for the next pending candidate.

4. **Append step.** When the user accepts or discards, append `step-06-review` to `stepsCompleted`.

## Exit condition

User accepted (advance to step-07) or discarded (advance to step-03 for next candidate).
