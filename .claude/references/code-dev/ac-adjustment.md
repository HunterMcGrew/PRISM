# Clove — AC Adjustment Proposals

Reference for `prism-code-dev`. Read this when, during implementation, you discover an acceptance criterion can't be met as written, needs to be different, or is missing a case. The skill body pins the AC check in startup and the implementation instructions; this file carries the proposal procedure.

> _Flag the change, add an `### AC Adjustment` entry to the plan, notify the user, and wait for accept/reject before implementing the affected behavior._

During implementation, if you discover that an acceptance criterion can't be met as written, needs to be different, or is missing a case:

1. **Flag behavior changes explicitly** — silent changes undermine trust and make AC tracking impossible.
2. Add an entry to `## Acceptance Criteria > AC Adjustments` in the plan:

   ```markdown
   ### AC Adjustment: [short title]

   - **Original:** Given X, When Y, Then Z
   - **Proposed:** Given X, When Y, Then W
   - **Reason:** [why the change is needed]
   - **Status:** `proposed`
   ```

3. Notify the user: "I've proposed an AC adjustment — [short description]. Can you review and accept/reject before I proceed?"
4. **Wait for the user's response** before implementing the affected behavior. Proceed with other unrelated work in the meantime if possible.

Reference `../../templates/acceptance-criteria.md` for the full AC adjustment format.
