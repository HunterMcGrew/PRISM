# Step 03 — Present

Walk the user through each pending candidate. One candidate at a time; explicit four-option prompt.

## Inputs

- `state.candidates[]` filtered to `status === "pending"`

## Actions

1. **Pick the next pending candidate.** Iterate in `createdAt` order. Set the current candidate in chat context (don't mutate state yet).

2. **Present.** Render the candidate as:

   > **Topic:** `<topic>`
   >
   > **Affected files:**
   > - `<file 1>`
   > - `<file 2>`
   > - …
   >
   > **Load-bearing reason:** `<one paragraph>`
   >
   > **Suggested shape:** `<architect-doc | architect-doc-plus-paired | adr-candidate>` — `<one sentence rationale>`
   >
   > **Preview:** `<one-line preview of what the doc would say>`
   >
   > `discuss` / `write` / `skip` / `defer`?

3. **Wait for choice.** Do not advance to the next candidate until the user picks one of the four options. Capture the raw answer for step 04 to branch on.

4. **Update state.** Set `currentPhase: "presenting"` if not already there. No candidate-status changes yet — the choice is processed in step-04.

## Exit condition

User has chosen one of `discuss` / `write` / `skip` / `defer`. Advance to step-04.

If no pending candidates remain, advance directly to step-08 (continue).
