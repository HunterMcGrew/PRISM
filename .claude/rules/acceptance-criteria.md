# Acceptance Criteria

## When to generate

- When updating a PR description
- When the user explicitly asks
- When the user says yes after being prompted

Always output as a markdown checklist.

## Writing style

AC is written for non-technical testers with access to WordPress admin and the live frontend only. Each item should:

- Describe a specific, observable behavior verifiable in the browser or WordPress admin
- Include where to find the relevant WordPress setting when it's not obvious
- Use plain English — no technical jargon, code references, or file names
- Be independently testable — each item can pass or fail on its own
- Start with an action verb (e.g. "Navigate to...", "Click...", "Verify that...")

## What to include

- Happy path behavior (the main thing the feature does)
- Edge cases visible to a user (empty states, missing data, boundary values)
- Any behavior that changed from how it worked before
- Accessibility requirements when applicable (keyboard navigation, screen reader behavior)

## What NOT to include

- Implementation details (file names, function names, types)
- Test coverage statements ("unit tests pass")
- Developer-only concerns (TypeScript types, build steps)
- Items that duplicate each other with different wording
