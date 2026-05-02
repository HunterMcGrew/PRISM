# UX Patterns

Implementation-facing UX rules for all skills working on UI. This is the building code — Pixel (the UX skill) owns the full design framework; this file captures the subset that Clove, Briar, Winston, and Eric enforce during implementation and review.

**Loaded by:** Pixel (startup), and any skill working on frontend components or blocks. Not auto-loaded via manifest — reference explicitly when reviewing or implementing UI.

---

## State Coverage

Every UI component that displays data or accepts input handles all five states. Missing states are review blockers — partial coverage is the failure mode that ships blank screens, unrecoverable errors, and layout shift to production.

| State              | What it looks like                                                                                                  | Common mistake                                                                   |
| ------------------ | ------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| **Empty**          | No data yet. CTA to populate. Never a blank screen.                                                                 | Showing nothing — no message, no guidance                                        |
| **Loading**        | Skeleton screen for layout-predictable content (cards, lists, tables). Spinner for unpredictable-length operations. | Blank screen while loading, or spinner where skeleton would prevent layout shift |
| **Error**          | Problem + cause + next step + retry action.                                                                         | "Something went wrong" with no recovery path                                     |
| **Partial / edge** | One item in a multi-item list. Missing fields in a card. Very long content.                                         | Only testing with 3-5 ideal items                                                |
| **Success**        | Toast for background ops. Inline for contextual confirmation. Redirect for completion.                              | No feedback at all — user wonders if the action worked                           |

**Skeleton vs spinner decision:**

- Content has a predictable layout (card grid, table rows, list items) → **skeleton screen** — matches the shape of incoming content, prevents layout shift
- Operation length is unpredictable or content shape is unknown → **spinner**
- Short operations (<300ms) → no indicator needed — adding one creates flicker
- Never show a blank screen. If data isn't loaded, show the structure it will fill.

---

## Mobile-First

All frontend UI is designed and built mobile-first. Start at 375px, scale up with `@media (min-width: ...)`.

### Touch targets

- **Primary actions:** 48×48px minimum (WCAG says 44×44, field conditions warrant extra)
- **Spacing between targets:** 8px minimum to prevent mis-taps
- **Thumb zone:** primary actions in the bottom third of the screen on mobile
- **One-handed operation:** assume the user has one hand free; avoid top corners for frequent actions

### Content priority

- **P0 (no scroll):** the primary information the user came for — price, title, main image, primary CTA
- **P1 (one scroll):** supporting details — specs, secondary actions, description
- **P2+ (on demand):** expandable sections, detail pages, "show more" — service history, full specs, related items

### Responsive patterns

- Tables → reflow to card layout on mobile. Show P0 columns; collapse P2-P3 behind expand.
- Modals → bottom sheet on mobile (rises from thumb zone)
- Side drawers → full-screen overlay on mobile with back-navigation
- Hover interactions → must have tap/focus equivalents. No hover-only functionality.

---

## Container Patterns

Use the right container for the task. Modals are almost always the wrong choice.

| Container                 | Use when                                                                         | Never use when                                          |
| ------------------------- | -------------------------------------------------------------------------------- | ------------------------------------------------------- |
| **Modal**                 | Quick confirmation (1-2 fields), destructive action gate, must-acknowledge alert | User needs to reference underlying content while acting |
| **Drawer / side panel**   | Detail view alongside a list, filters, multi-field forms needing context         | Content is complex enough to need full screen           |
| **Inline**                | Quick edits, toggles, contextual settings                                        | The change affects multiple areas or needs confirmation |
| **Full page**             | Complex forms, multi-step wizards, equipment configuration                       | The task is simple enough for inline or drawer          |
| **Bottom sheet (mobile)** | Mobile equivalent of drawer — filters, quick actions, detail previews            | Desktop layouts (use drawer instead)                    |

---

## Feedback Patterns

| Pattern         | Duration                        | Use for                                          | Accessibility                                        |
| --------------- | ------------------------------- | ------------------------------------------------ | ---------------------------------------------------- |
| **Toast**       | 3-5s, auto-dismiss              | Non-blocking confirmation: "Added to comparison" | `role="status"`, include undo for reversible actions |
| **Banner**      | Persistent until dismissed      | Important contextual info: "Expires in 2 hours"  | `role="alert"` for urgent, `role="status"` for info  |
| **Inline**      | Persistent, attached to element | Validation, character counts, status badges      | `aria-describedby` linking error to field            |
| **Modal alert** | Until acknowledged              | Critical blocking info: data loss, auth failure  | `role="alertdialog"`, focus trapped                  |

**Stacking:** max 3 visible toasts. Queue additional. More than 3 is noise.

---

## Modal lifecycle conventions

Modals follow a Save / Cancel commitment model. The conventions:

- **Parent owns `isOpen`** — no local-shadow state. The modal receives the prop and does not duplicate it. Prevents the prop-to-state sync anti-pattern documented in `.claude/rules/use-effect-guidelines.md`.
- **Save commits, Cancel discards** — the modal holds a working copy of the data being edited. Save calls `onSave(workingCopy)` and the parent commits. Cancel calls `onCancel()` and the parent unmounts the modal; the working copy is naturally discarded with the component.
- **X icon = Cancel** — closing via the X is semantically equivalent to Cancel. Don't add a separate "save and close" path on X.
- **Escape = Cancel** — keyboard parity with X.
- **Overlay click blocked when dirty** — `shouldCloseOnClickOutside` set to `false` whenever the working copy differs from the initial snapshot. Escape, X, and Cancel remain available as deliberate exits.
- **Two-level working copy when needed** — when a modal contains sub-edits (editing a single item within a list), each sub-edit gets its own snapshot. Sub-Done commits to the modal's working copy; sub-Cancel restores the snapshot. The modal's outer Save/Cancel governs the whole lifecycle.
- **Focus returns to trigger on close** — when Save or Cancel closes, focus moves back to the element that opened the modal. Keyboard users don't lose their place.

**Why:** THR-1574 specified these for the sortable links modal; THR-1469 reinforced the focus-return pattern; multiple plans (THR-1132, THR-1574) hit prop-to-state sync as a recurring smell. Documented now so the next modal-shaped UI ships with the conventions, not against them.

**How to apply:** Build new modals with these defaults. Reach for two-level working copy only when the modal contains an edit-within-edit (item editing inside a list). Don't add confirmation-on-overlay-click — block the close instead; X / Escape / Cancel are sufficient explicit exits.

---

## Form Design

- **Validate on blur**, not on keystroke. Show errors next to the field, not at the page top.
- **Error anatomy:** what went wrong + how to fix it. "Phone number needs 10 digits — you entered 9." Never "Invalid input."
- **Mark the minority:** if most fields are required, mark the optional ones. If most are optional, mark the required ones.
- **Smart defaults:** pre-fill from browser (location), locale (currency), or page context (equipment type from the page they came from).
- **Multi-step forms:** show progress (step 2 of 4), allow back-navigation, preserve state between steps.
- **Destructive actions:** require confirmation. Typed confirmation for high-cost actions (delete account). Checkbox or button for medium-cost (remove item). Toast with undo for low-cost (archive).

---

## Typography

- **Hierarchy:** display → h1 → h2 → h3 → body → caption → overline. Each level visually distinct at a glance.
- **Line length:** 45-75 characters for body text. Constrain with `max-width`, not by shrinking font.
- **Spacing:** use the 4px/8px base unit system. Don't use arbitrary pixel values — reference design tokens.
- **Scanning:** front-load important words in labels. Users read the first 2 words of every line (F-pattern). Bold key terms for scannability.

---

## Color

- **Contrast:** 4.5:1 for normal text, 3:1 for large text (18px+ or 14px+ bold), 3:1 for UI components. Non-negotiable per WCAG 2.1 AA.
- **Semantics:** red = error/danger, green = success, amber = warning, blue = info/primary action. Don't fight established conventions without strong justification.
- **Never color alone:** pair color with icons, text, or patterns. Color-blind users lose meaning carried by color alone.
- **Frontend vs backend:** frontend uses dealer-branded colors (varies per site). Backend uses `@wordpress/components` conventions (WP blue `#007CBA`, neutral grays).

---

## Motion & Animation

- **Functional only in production code.** Animation must convey state change or spatial relationship. Decorative animation is noise.
- **`prefers-reduced-motion`:** mandatory. Disable non-essential animation; reduce essential animation to opacity/fade for users who set this flag.
- **Duration:** micro-interactions 100-200ms, transitions 200-400ms, page-level 300-500ms. Over 500ms feels sluggish.
- **Easing:** `ease-out` for entering elements, `ease-in` for exits, `linear` for progress bars only.

---

## Search & Filters

- **Active filters** are always visible as removable chips. Users must see what's filtering their results.
- **Result counts** update on each filter change. Users should never apply a filter and get zero results without warning.
- **Zero results** is never a dead end. Suggest: relax a filter, expand the area, try related terms, browse popular categories.
- **Faceted search groups:** limit top-level visible filter categories to ~7. Use progressive disclosure (collapsed groups, "Show more") for deeper attributes.
- **Mobile filters:** bottom sheet, not sidebar. "Apply" button to confirm, with result count preview ("Show 23 results").

---

## Data Tables & Lists

- **Desktop:** column headers for sorting. Sidebar filters. Pagination with total count.
- **Mobile:** reflow to card layout. Primary data visible (P0 columns). P2-P3 behind expand/detail. Bottom sheet for filters.
- **Bulk actions:** floating action bar appears on selection. "Compare selected (3)" pattern.
- **No horizontal scroll.** If a table can't fit, it must reflow. Horizontal scrolling on mobile is a usability failure.

---

## Accessibility (beyond `.claude/rules/accessibility.md`)

These are UX-specific accessibility patterns that go beyond the baseline rules:

- **Focus indicators:** visible, consistent, high-contrast. Never `outline: none` without a custom replacement that meets 3:1 contrast.
- **Drag interactions:** always provide a keyboard alternative (arrow keys, move up/down buttons). Drag-only is an accessibility failure.
- **Toasts and live regions:** `role="status"` for non-urgent updates, `role="alert"` for urgent. Screen readers must announce them.
- **Error association:** every error message linked to its field via `aria-describedby`. Screen readers must read the error in context.
- **Modal focus:** trap focus inside modals. Restore focus to trigger element on close.
- **Skip links:** for any page with substantial navigation before main content.

---

## Dealership-Specific Patterns

When the work touches equipment dealership frontend:

- **Trust signals near CTAs.** Inventory count, dealer certifications, response time — place where skepticism peaks (near "Request Quote", on detail pages).
- **Progressive disclosure for specs.** Equipment has deep attribute sets. Show key specs (price, hours, location) upfront; reveal full specs on demand.
- **Comparison support.** Users compare 2-4 items before deciding. Support add-to-compare, side-by-side view, and shareable comparison URLs.
- **Mobile field conditions.** Sales reps on phones in sunlight, gloved, distracted. Generous touch targets, high contrast, key actions (call, directions, price) without scrolling.
- **B2B handoff.** Shareable URLs, printable views, email-a-quote. Multiple decision-makers per purchase.

---

## Dark Patterns (prohibited)

These patterns destroy trust and are review blockers if found:

- **Confirmshaming** — guilt language on decline buttons
- **False scarcity** — fake urgency or inventory pressure
- **Hidden costs** — fees revealed only at commitment point
- **Bait-and-switch** — advertised ≠ actual
- **Misdirection** — visual emphasis on the business-preferred option over the user-preferred one

Equipment buyers research for days. One deceptive experience destroys trust permanently.

---

## Review Checklist (for Briar and Eric)

When reviewing a frontend PR that changes UI, check:

- [ ] All five states handled (empty, loading, error, partial, success)
- [ ] Loading uses skeleton screen where layout is predictable, spinner where not
- [ ] Mobile layout designed first (not desktop shrunk down)
- [ ] Touch targets ≥ 48×48px on mobile
- [ ] No hover-only interactions (tap/focus equivalents exist)
- [ ] `prefers-reduced-motion` respected for any animation
- [ ] Color contrast meets WCAG ratios (4.5:1 text, 3:1 large text and UI)
- [ ] Color is not the sole information carrier
- [ ] Focus indicators visible on all interactive elements
- [ ] Drag interactions have keyboard alternatives
- [ ] Error messages are specific and actionable (not "Something went wrong")
- [ ] Toasts/live regions have appropriate ARIA roles
- [ ] No dark patterns (confirmshaming, false scarcity, hidden costs, misdirection)
