# Pixel — Mock Spec & Plan Design Templates

> Verbatim templates `prism-pixel` fills when saving a mode-2 mock spec to `.prism/design/mocks/<slug>.md` and when writing the `## Design` summary back to the branch plan. Copy the structure; don't reinvent it.

## Mock Spec Template (mode 2)

Save to: `<repo-root>/.prism/design/mocks/<ticket-or-feature-slug>.md`

```markdown
# Mock: <Feature name>

**Ticket:** <THR-xxxx or N/A>
**Branch:** <branch name>
**Author:** Pixel
**Date:** <YYYY-MM-DD>

## User & Goal

One paragraph: who uses this, what they're trying to do, and why.

## Feeling

One or two sentences: what this screen should *feel* like. This is the tuning fork for every other decision.

## States

Every state's wireframe must annotate measurable units (Tailwind tokens like `text-lg`, `p-4`, `gap-2`, or explicit px/rem when tokens don't fit) and cite the UI/UX principle justifying each visual choice (Hick's Law, Fitts's Law, Miller's Law, Nielsen heuristic by number, Gestalt principle by name). This is the spec-side detail bar — without it, Winston has to guess when writing implementation tasks. See [`implementation-task-detail.md`](../../rules/implementation-task-detail.md).

### Default / happy-path state
<ASCII wireframe + annotations>

### Empty state
<ASCII wireframe + annotations — including the CTA that points to filling the empty state>

### Loading state
<how loading is communicated — skeleton? spinner? inline? disabled controls?>

### Error state
<what errors are likely, how they're surfaced, how the user recovers>

### Partial / edge states
<e.g. one item in a list, very long list, item with missing data>

### Success / confirmation state
<toast? inline? does the screen change?>

## Interaction notes

Keyboard flow, focus management, what Tab order looks like, any modifier-key behavior, confirmation-before-destruction rules.

## Reused components

Which existing components/blocks this stitches together. Link to `frontend/components/<Name>` or `backend/plugins/.../blocks/<name>` — include file paths for every component named. Note server/client classification (RSC default; mark `'use client'` requirement explicitly when local state, hooks, or browser APIs are involved).

## New patterns (if any)

If this introduces a net-new pattern, name it and justify why it couldn't be a restitch.

## Accessibility notes

Keyboard navigation, ARIA roles, focus traps, contrast callouts, motion/reduced-motion considerations.

## Copy direction

Not final strings — direction. "The delete confirmation should feel like a pause, not a warning. Use 'Remove link' not 'Delete link forever' — it's reversible." Final strings get written by Clove (or the dev) during implementation, against this direction.

## Mobile behavior

How this design adapts at mobile breakpoints. Content priority shifts, interaction pattern changes (bottom sheet vs modal, swipe vs button), touch target adjustments.

## Open questions

Anything you need the dev/PM/designer to resolve before implementation.

## Architectural inputs for Winston

Inputs Winston needs to write `## Implementation Tasks` against your spec without round-tripping back for clarification:

- **Data flow** — where state lives, where data is fetched, what's the source of truth.
- **Server/client classification** — what's RSC, what needs `'use client'`, why.
- **Component boundaries** — what's a new component vs a restitch of an existing one.
- **Architectural concerns surfaced** — anything that crossed your radar as a structural question (new shared component candidate, coupling risk, new design system pattern, accessibility architecture pattern affecting more than this screen).
```

## Plan Design Section

When a mock spec gets saved (mode 2), also write a summary to the branch plan so the rest of the team sees it. Update `<repo-root>/.prism/plans/<branch>.md` with a `## Design` section. If it already exists, append or update — don't nuke prior content. Format:

```markdown
## Design

**Status:** <Draft | Ready for Winston | Needs architecture review | Needs copy pass | Needs a11y review>
**Mock:** `.prism/design/mocks/<slug>.md` (also `.html`)
**Author:** Pixel
**Date:** <YYYY-MM-DD>

### Summary
One paragraph: what was designed, which states are covered, what patterns were reused, what's new.

### Decisions worth knowing
Bullet the 2–5 design decisions the next person in the flow needs to understand (not every decision — just the ones with implementation or architecture implications). Example:
- Used inline edit instead of a modal for the editing state — keeps user in place, no commit until Save
- Reused `SortableList` with a new `renderItem` prop — flagging for Winston: this may be the second consumer, worth evaluating if the component needs a formal slot pattern
- Empty state CTA points at `[+ Add Link]` in the toolbar — matches the pattern in `ManageMenusBlock`

### Open questions
Anything the dev or PM needs to resolve before implementation.
```

The `Status` field matters — it's how the handoff decision gets made.
