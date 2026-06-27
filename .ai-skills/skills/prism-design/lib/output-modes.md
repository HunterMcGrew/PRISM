# Pixel Output Modes — Full Specifications

## Mode 1 — Inline ASCII wireframe + reasoning (DEFAULT)

Use this when:
- The user is mid-thought and wants a quick sketch
- The design is small (a single modal, a single state variation, a single question about an existing screen)
- We're iterating rapidly and a saved spec would be overhead
- The user shared a screenshot and wants specific feedback
- The user didn't ask for a saved mock

Format ASCII wireframes with clear labels, boundaries, and annotations pointing at intent, not just position. Example:

```
┌────────────────────────────────────────┐
│ Manage Navigation Links           [ × ]│ ← close, always top-right
├────────────────────────────────────────┤
│                         [ + Add Link ] │ ← primary action, reachable
├────────────────────────────────────────┤
│  ⋮⋮  Home              [ ✎ ]  [ 🗑 ]   │ ← drag handle on left reads as "grab me"
│  ⋮⋮  About             [ ✎ ]  [ 🗑 ]   │    (Gestalt continuity + F-pattern)
│  ⋮⋮  Contact           [ ✎ ]  [ 🗑 ]   │
├────────────────────────────────────────┤
│              [ Cancel ]    [ Save ]    │ ← Save on right = Fitts's rest position
└────────────────────────────────────────┘
```

Always annotate the *why*, not just the *what*. "Save on right = Fitts's rest position" teaches the dev the pattern; "Save button" doesn't.

---

## Mode 2 — Saved mock spec

Only save a spec to disk when one of these is clearly true:

- The design covers **three or more distinct states** (e.g. default + empty + error + loading + edit) that a single chat response can't hold clearly
- A dev who is NOT in this chat will implement it cold — they need a self-contained artifact
- The user explicitly asks: "save this," "write this up," "I need a mock file," "give me a spec"
- The work is substantial enough to earn a `## Design` section in the branch plan (a new feature screen, not a tweak to an existing modal)

If the question is "where should Save go in this modal," **do not save a spec**. That's mode 1. Saving files and updating the plan for tiny riffs is noise — it pollutes the plan file and creates mock-spec sprawl for decisions that should live in the conversation.

When mode 2 is warranted, save to: `<repo-root>/.prism/design/mocks/<ticket-or-feature-slug>.md`

**When you're saving a mode-2 spec or writing the `## Design` summary back to the branch plan, read [`mock-spec-template.md`](../../../../.prism/references/pixel/mock-spec-template.md) and fill its templates verbatim.** The spec must hit the detail bar in [`implementation-task-detail.md`](../../../rules/implementation-task-detail.md) — measurable units (Tailwind tokens or px/rem), cited principles per decision, and all five states.

---

## Mode 3 — HTML mockup (explicit request ONLY)

Produce a single-file HTML mockup only when the user explicitly asks for one. HTML is opt-in only alongside mode 2 specs — the token/time cost is significant and most of the time isn't worth it.

**How HTML gets triggered (decision logic):**

- **Clear trigger — just do it.** If the user's message contains any of: "mock this up in HTML," "give me an HTML version," "render this as HTML," "render this in HTML," "build the mock," "show me the mockup," "in HTML please," "can I see this in HTML," "HTML mockup," "HTML mock" — produce the HTML file. No need to ask.
- **Ambiguous — ask once.** If the user says something like "I need a mock for X" or "can you mock this up" without specifying format, ask one short question: "Inline sketch (quick) or HTML mockup (opens in browser)?" Then proceed. Don't stack multiple clarifying questions.
- **After a mode-1 sketch — offer, don't push.** When closing a mode-1 inline sketch, if the design feels like it would benefit from a visual version (multi-state, new feature, something the user will share), add a short offer: "Want me to render this as an HTML mockup you can open in the browser?" If they say no, drop it. If they say yes, produce it against the existing sketch.
- **After a mode-2 saved spec — same offer pattern.** When closing a mode-2 save, offer HTML as a follow-up. Don't default to producing both — the spec is the artifact; HTML is an optional visual companion.
- **Never produce HTML for tiny riffs.** If the question was "where does Save go," don't offer HTML. It's overkill.

When asked, produce a single-file HTML document:
- Semantic markup (`<section>`, `<h1>`, `<button>`, real form elements where relevant)
- Inline CSS only — no external stylesheets, no CDN deps, no build step
- Medium fidelity: real typography and spacing, component shapes that read as real, but don't waste tokens on pixel-perfect polish
- Mobile-first CSS: start with mobile layout, use `@media (min-width: ...)` to scale up
- For visual styling, default to the **Kubota-derived palette** described in the Visual language defaults section below unless the user specifies otherwise
- Save as `<slug>.html` in `<repo-root>/.prism/design/mocks/`

The HTML is opened directly in a browser by the user. If they want a PDF from it, they Cmd+P → Save as PDF themselves — that's zero-dependency and works everywhere.

**PDF generation is not a Pixel capability.** The work repo doesn't have reliable PDF tooling, and bundling a PDF pipeline that half-works is worse than not shipping one. If a PDF is needed, the HTML mockup → browser → Cmd+P → Save as PDF flow is the path.

---

## Visual language defaults (for HTML mockups)

The team's default palette, typography stack, and brand-language defaults are populated during onboarding from the team's actual product brand. Until Atlas writes them, ask the user which palette to mock against; if they have no preference, pick neutral grays + a single accent color and call out the placeholder explicitly in the spec.

**Always ask in the spec or chat:** "Which surface and audience is this for?" The answer drives the entire visual direction — different surfaces (public-facing vs internal admin vs embedded widget) typically have different design conventions.

---

## Stack Awareness

Pixel's knowledge of the team's stack (frontend framework, component libraries, design tokens, accessibility baseline, existing component inventory) is populated during Phase 2 onboarding. The general shape: a frontend framework + component library, a backend / CMS layer with its own conventions where relevant, a documented accessibility baseline, and inventories of existing components and patterns Pixel must consult before proposing anything new.

If a proposal assumes a component exists, verify it exists before presenting. If a proposal contradicts a documented convention in `.prism/rules/` or `.prism/architect/`, flag it explicitly and either revise or justify.

---

## Final file layout for saved work

When a spec is saved (mode 2), the folder looks like:
```
.prism/design/mocks/
└── ${TICKET_PREFIX_LOWERCASE}-1574-sortable-links-modal.md    ← source of truth
```

If the user also asked for an HTML mockup (mode 3), the folder looks like:
```
.prism/design/mocks/
├── ${TICKET_PREFIX_LOWERCASE}-1574-sortable-links-modal.md    ← source of truth
└── ${TICKET_PREFIX_LOWERCASE}-1574-sortable-links-modal.html  ← on explicit request
```