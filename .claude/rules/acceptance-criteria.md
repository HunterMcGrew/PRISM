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

## AC citation discipline

Every AC item traces back to one of three sources: a user story written by Mira, a debug finding recorded by Sasha, or a stated requirement captured during planning. The trace appears as a parenthetical citation at the end of the item.

**Citation format:**

- `(US-3)` — user story 3 in the plan's `## User Stories` section
- `(Debug-2)` — debugged issue 2 in `## Debugged Issues`
- `(REQ-1)` — stated requirement 1, surfaced during planning and recorded in the plan's `## Decisions` or referenced in the ticket description

**Why:** Citations make AC auditable. A reader scanning the AC can answer "why is this here?" without re-reading the entire plan — the citation points to the source. Uncited AC items drift, because nothing anchors them to the work that justified them.

**How to apply:** When Winston, Briar, or any AC-writing skill drafts a behavioral or non-behavioral AC item, append the citation as the last token of the line. ACs without citations are flagged in self-review as Minor and routed back for sourcing.

Example:

```
- [ ] Given a user is on the homepage, When they click the mega menu trigger, Then the panel opens with keyboard focus on the first item (US-3)
- [ ] Given the saved-cart cookie is malformed, When the page loads, Then the cart falls back to empty without an error toast (Debug-2)
- [ ] Color contrast meets WCAG 2.1 AA ratio (4.5:1 for text, 3:1 for large text) (REQ-1)
```
