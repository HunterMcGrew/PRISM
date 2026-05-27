---
step: brownfield-step-04-tests
---

# Brownfield Step 04 — Test scope confirmation

Confirm the test surfaces with the user.

## Actions

1. **Present found tests:**

   > "Tests found alongside `<target>`:
   > - `<test file>` — `<test count>` cases
   > - ...
   >
   > Are there other test surfaces I should consider? Integration tests, e2e tests, manual QA flows, smoke tests, contract tests?"

2. **Capture additions.** Distinguish: automated (unit/integration/e2e — paths), manual (QA flow — description), contract (interfaces — endpoint + scenario).

3. **Update PRD frontmatter:** append `brownfield-step-04-tests` to `stepsCompleted`. `lastEdited: <ISO 8601>`.

## Exit condition

Test surfaces confirmed. Advance to brownfield-step-05-draft.
