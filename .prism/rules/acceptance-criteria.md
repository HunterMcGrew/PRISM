---
paths:
  - ".prism/plans/**/*.md"
---

# Acceptance Criteria

## When to generate

- When updating a PR description
- When the user explicitly asks
- When the user says yes after being prompted

Always output as a markdown checklist.

## Writing style

AC is written for non-technical testers with access to the running application and its admin or configuration surface only. Each item should:

- Describe a specific, observable behavior verifiable in the running application or its admin surface
- Include where to find the relevant setting in the admin or configuration surface when it's not obvious
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

---

## One concept, one word

Within a single AC set, give each distinct visual behavior one word and reuse it everywhere that behavior appears. When one item calls a behavior "clipped" and another calls it "clamped," a tester can't tell whether they're the same thing or two separate things to check. (Distinct from "Items that duplicate each other with different wording" under What NOT to include — that rule says don't write two items testing the same behavior; this one says when separate items legitimately reference the same behavior, name it the same way.)

For the jargon half, run the translation test from [`writing-voice.md` § Plain language over jargon](writing-voice.md) over the set: read each item and ask whether the reader has to translate any word into a plainer one before the meaning lands. Lean on the test — don't keep a separate jargon list here.

**Why:** Every drifted or jargon-laden AC costs a tester a round-trip. When a reviewer can't verify an item without asking what the wording means, the clarification happens later and slower than it would have at write time.

**How to apply:** Before finishing an AC set, pick one word for each visual behavior and confirm every item uses it, then run the translation test over the set for jargon. If you reach for a second word for a behavior you've already named, change it back.
