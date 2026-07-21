# Pixel — Design Pattern Vocabulary

> Catalog of the tactical UI patterns `prism-design` draws from in proposals and audits — forms, states, containers, feedback, search, tables, typography, color, motion, micro-interactions, content-first design, and dark patterns. Each has a "when to use" and a "watch out for."

Tactical patterns Pixel draws from. Each one has a "when to use" and a "watch out for." Pixel cites these in proposals and audits.

## Form Design

- **Inline validation** — validate on blur, not on keystroke. Show errors next to the field, not at the top. Green confirmation for fields that pass non-obvious validation.
- **Error message anatomy** — what went wrong + why + how to fix it. Never "Invalid input." Always actionable: "Phone number needs 10 digits — you entered 9."
- **Multi-step forms** — show progress (step 2 of 4), allow back-navigation, preserve state. For equipment quotes: break into logical chunks (equipment selection → contact info → financing preferences).
- **Smart defaults** — pre-fill what you can. Location from browser. Currency from locale. Equipment type from the page they came from. Nielsen #7 (flexibility and efficiency).
- **Required vs optional** — mark the minority. If most fields are required, mark the optional ones and vice versa.

## States

Every UI has five states. Designing only the happy path is designing 20% of the experience.

- **Empty state** — never a dead end. Always include: what this area will contain, why it's empty, and a CTA to fill it. "No saved equipment yet. Browse inventory to start building your list."
- **Loading state** — skeleton screens for layout-predictable content (cards, lists, tables). Spinners only for unpredictable-length operations. Progressive loading: show summary data first, detail after. Never a blank screen.
- **Error state** — problem + cause + next step. "Couldn't load inventory. Check your connection and try again, or call [number] for help." Include a retry action. Severity levels: critical (blocking) vs. warning (degraded) vs. info (notification).
- **Partial/edge state** — one item in a list that expects many. Very long content that breaks a layout. Missing data in one field of a card. Design for these explicitly.
- **Success/confirmation** — toast for background operations. Inline for context-dependent confirmation. Redirect for completion (quote submitted → confirmation page). Peak-End Rule: make this moment feel good.

## Container Patterns

The impulse to use a modal is almost always wrong. Decision framework:

- **Modal** — quick confirmations (1-2 fields), destructive action confirmation, alerts that need acknowledgment. Not for content the user needs to reference while acting.
- **Drawer / side panel** — detail views alongside a list, filters, multi-field forms that benefit from context. Keep the underlying page visible.
- **Inline** — quick edits, toggles, contextual settings. Lowest cognitive cost — user stays in place.
- **Full page** — complex forms, multi-step wizards, anything needing full attention. Equipment configuration, financing applications.
- **Bottom sheet (mobile)** — the mobile equivalent of a drawer. Rises from the thumb zone. Use for filters, quick actions, detail previews.

## Feedback Patterns

- **Toast** — transient (3-5s), non-blocking, confirmatory. "Equipment added to comparison." Include undo when reversible. `role="status"` for screen readers. Max 3 visible; queue the rest.
- **Banner** — persistent until dismissed or resolved. "Financing terms expire in 2 hours." Contextual and important but not blocking.
- **Inline feedback** — attached to the element. Form validation, character counts, status badges on cards.
- **Modal alert** — blocking. Only for critical information requiring acknowledgment. Data loss warnings, authentication failures.

## Search & Discovery

- **Faceted search** — filters narrow results. Show active filters as removable chips. Update result counts on each change so users never hit a dead end. Group related filters under labeled headings (Gestalt proximity).
- **Autocomplete** — 8 suggestions on mobile, 10 on desktop. Show recent searches, popular searches, and matching results. Categorize when inventory is diverse.
- **Zero results** — never a dead end. Suggest: relax a filter, expand the radius, try related terms, browse popular categories.
- **Search intent** — distinguish known-item search ("Cat 320D") from exploratory search ("compact excavators near me"). The UI should adapt.

## Data Tables & Lists

- **Filter placement** — sidebar on desktop, bottom sheet on mobile. Real-time update for exploration; "Apply" button for saved searches.
- **Sorting** — column headers for tables, dropdown for lists. Always indicate sort direction. Server-side for large datasets.
- **Pagination vs infinite scroll** — pagination for bounded datasets (equipment inventory with total count). Infinite scroll for feeds. Always show total.
- **Bulk actions** — floating action bar on selection. "Compare selected (3)" / "Request quote for selected."
- **Responsive tables** — never horizontally scroll. Reflow to card layout on mobile. Show P0 columns, collapse P2-P3 behind expand.

## Typography System

- **Hierarchy** — display → h1 → h2 → h3 → body → caption → overline. Each level must be visually distinct at a glance.
- **Line length** — 45-75 characters per line for body text. Shorter lines feel choppy; longer lines cause tracking errors.
- **Vertical rhythm** — consistent spacing based on a baseline unit (typically 4px or 8px). Consistency creates calm; inconsistency creates noise.
- **Scanning** — bold key terms, use sentence case for labels, front-load important words. Users scan the first 2 words of every line (F-pattern).

## Color System

- **Contrast minimums** — 4.5:1 for normal text, 3:1 for large text (18px+ or 14px+ bold), 3:1 for UI components and graphical objects. These are WCAG 2.1 AA requirements — the legal and ethical floor.
- **Color semantics** — red = error/danger, green = success, amber/yellow = warning, blue = info/primary action. Established conventions; don't fight them without strong justification.
- **Never color alone** — color is never the sole means of conveying information. Pair with icons, text labels, or patterns.
- **Dark/light mode** — if supported, design both. Contrast ratios shift, shadows disappear, images may need different treatments. Don't just invert.

## Motion & Animation

- **Functional vs decorative** — functional animation conveys state change (collapse, expand, slide in) or spatial relationship (where did this come from). Decorative animation is noise. Every animation should answer "what does this teach the user?"
- **`prefers-reduced-motion`** — respect this always. Disable non-essential animation; reduce essential animation to opacity transitions for users who set this flag. This is an accessibility baseline, not a nice-to-have.
- **Duration** — micro-interactions: 100-200ms. Transitions: 200-400ms. Page-level: 300-500ms. Over 500ms feels sluggish.
- **Easing** — ease-out for entering elements (fast start, gentle landing). ease-in for exits. Use linear easing for progress indicators only.

## Micro-interactions & Affordances

- **Hover states** — desktop only. Reveal secondary actions, indicate clickability. Must have keyboard and touch equivalents.
- **Press/active states** — visual feedback that the tap/click registered. Critical for touch where there's no hover.
- **Drag affordances** — grip dots on the left (convention), cursor change, shadow lift. Must have keyboard alternative (arrow keys or move buttons).
- **Focus indicators** — visible, consistent, high-contrast. Never `outline: none` without a replacement.

## Content-First Design

Design serves content, not the reverse. Before designing a layout:

- **Content priority** — what does the user need first, second, third? For equipment cards: photo + price + location (P0), then specs + hours + model (P1), then service history + certification (P2). Design for the priority, not for visual balance.
- **Content absence** — what happens when content is missing? A card without a price, a listing without a photo, a dealer without reviews. Design for the holes, not just the ideal.
- **Content structure** — understand types, lengths, and relationships before drawing boxes. Lorem ipsum hides layout failures.

## Dark Patterns (Pixel flags these)

Trust is the currency of high-consideration purchasing. Pixel flags these if she sees them:

- **Confirmshaming** — guilt-trip language on decline buttons ("No, I don't want to save money")
- **False scarcity** — "Only 2 left!" when inventory is fine
- **Hidden costs** — fees revealed only at checkout or "Call for pricing" after showing a price range
- **Roach motel** — easy to enter (newsletter signup), hard to exit (buried unsubscribe)
- **Bait-and-switch** — advertised price ≠ actual price
- **Forced continuity** — auto-renewal without clear notice
- **Misdirection** — visual emphasis on the option that benefits the business, not the user

Equipment buyers research for days. One deceptive experience destroys trust permanently. Ethical design isn't just principled — it's good business.
