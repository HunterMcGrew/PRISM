---
load: paths
paths:
  - "**/*.tsx"
  - "**/*.jsx"
  - "**/*.vue"
  - "**/*.svelte"
  - "**/*.html"
---

# Accessibility (WCAG 2.1 Level AA)

WCAG 2.1 Level AA is the baseline for UI work, with WCAG 2.2 additions flagged inline where they raise the bar. These rules apply when writing, reviewing, or architecting any UI — frontend, backend admin, embedded widgets, anything a human interacts with through a screen.

**Why the bar lands here:** the ADA's 2024 final rule ([ada.gov](https://www.ada.gov/resources/2024-03-08-web-rule/)) makes WCAG 2.1 AA the enforceable standard for public-facing digital services under Title II, and courts use it as the floor in private litigation. WCAG 2.2 isn't yet legally enforced but represents the direction of travel — adopting its additions where they apply costs little now and avoids retrofits later.

The rules below are stack-agnostic. Framework-specific patterns (React, Next.js, Vue, etc.) live at the bottom under [Stack-specific notes](#stack-specific-notes) — those sections only apply when your `techStack` includes that framework.

---

## Semantic HTML

- Use native HTML for its intended purpose — `<button>` not `<div onClick>`, `<nav>` for navigation, `<main>` for primary content.
- Heading levels are sequential — never skip h1 → h2 → h3.
- Use `<ul>`/`<ol>` for lists, `<table>` for tabular data.
- Form fields collecting personal data use the right `autocomplete` value (`email`, `given-name`, etc.) — enables browser autofill and assistive tech (WCAG 1.3.5).
- Don't lock content to a single orientation (WCAG 1.3.4).
- When inline content shifts language, mark it with `lang="..."` on the element (WCAG 3.1.2).
- Every page has a meaningful `<h1>`. Single-page-app frameworks rely on the `<h1>` for route-change announcements; without one, screen reader users get no signal that a route changed.

---

## Keyboard Navigation

- All interactive elements are keyboard-accessible — focusable and operable with Enter/Space.
- Focus order follows visual order — never use positive `tabIndex`.
- Custom widgets (dropdowns, modals, menus) trap focus appropriately and dismiss with Escape.
- Visible focus indicators on every interactive element. If you remove the default `outline`, replace it. Custom focus styles meet 3:1 contrast against adjacent colors (WCAG 1.4.11).
- Sticky headers, banners, and modals can partially obscure a focused element but never fully cover it (WCAG 2.4.11 — **new in 2.2**).
- Interactive targets are at least **24×24 CSS pixels** — audit icon-only buttons, close buttons, inline controls (WCAG 2.5.8 — **new in 2.2**).
- Drag-and-drop has a single-pointer or keyboard alternative — applies to sortable lists, carousels, any DnD interface (WCAG 2.5.7 — **new in 2.2**).

---

## ARIA

- Prefer native semantics; reach for ARIA only when HTML alone can't carry the meaning.
- Every `role` includes its required ARIA properties (e.g. `role="tab"` needs `aria-selected`).
- Dynamic content changes announce to screen readers via `aria-live` regions or focus management.
- `aria-live` containers exist on initial render, even when empty.

  **Why:** screen readers track live regions from the moment they're added to the DOM. A container that appears _with_ its content already inside is treated as a normal element, not a live announcement — the text never gets read out.

- Status messages that don't receive focus (toast notifications, form success, "item added to cart") use `role="alert"` or `aria-live` (WCAG 4.1.3). This is the single most-missed criterion in custom notification components.
- Form errors: link the input to its error message with `aria-describedby`; the error container uses `aria-live="polite"` and `aria-atomic="true"`.
- Icon-only buttons need `aria-label` or visually hidden text.
- Tooltips and popovers must be (a) dismissible via Escape without moving focus, (b) hoverable — pointer can move into the tooltip without it closing, (c) persistent until explicitly dismissed (WCAG 1.4.13).

### Active state and focus state are not the same selector

An active link (current page) and a focused link are different states. Don't share a CSS selector — give each its own styling channel.

**Why:** sharing color tokens between active and focus states leads to phantom highlights that survive navigation, especially on iOS Safari where `:focus-visible` heuristics are inconsistent on touch.

**How to apply:**

- Active link: `aria-current="page"` plus multi-channel styling — combine font weight, border accent, and color, never color alone. Multi-channel keeps the indication legible to color-blind users and survives any single-channel CSS conflict.
- Focus: rely on the browser's default UA focus outline on `<a>` elements unless you need a custom ring. The UA outline uses the browser's internal focus-visible heuristic, which is narrower than CSS `:focus-visible` and only fires on genuine keyboard interaction — no phantom flash on touch.
- Avoid `focus-visible:` color swaps on anchors in touch contexts.

### Touch device pitfalls

Touch devices break a11y assumptions that hold on desktop:

- **`hover:` styles fire on tap** in many CSS frameworks unless you opt into a hover-media-query gate. A `hover:bg-primary` style sticks until the next tap.
- **`:focus-visible` heuristics differ across browsers**, especially on touch. Don't tie load-bearing visuals to it on anchors.
- **Component library touch behaviors** (e.g. Headless UI gates some `Dialog` behaviors via `matchMedia("(pointer: coarse)")`) may not match desktop. Read the source if behavior matters.

**How to apply:** when building UI reachable on touch, audit `hover:`, `focus-visible:`, and library-specific touch gates. Test on a real touch device before shipping load-bearing interactions.

---

## Images and Media

- All `<img>` elements have `alt` text — decorative images use `alt=""`.
- Frameworks that wrap images (e.g. Next.js's `next/image`, Nuxt's `<NuxtImg>`) typically enforce a required `alt` prop — pass `alt=""` for decorative.
- Video and audio need captions or transcripts where applicable.

---

## Color and Contrast

- Text meets **4.5:1** contrast against its background; **3:1** for large text (18pt+ or 14pt bold) — WCAG 1.4.3.
- UI components and graphical objects (buttons, input borders, icons, focus rings) need **3:1** against adjacent colors — WCAG 1.4.11.
- Check contrast in _all_ interactive states. A button passing at default may fail at `:hover` or `:focus` if the background changes.
- Contrast requirements don't apply to decorative text, disabled controls, logotypes, or purely decorative imagery.
- Never use color alone to convey information — pair with icons, text, or patterns.
- Content reflows at 320px width without breaking or requiring horizontal scroll (equivalent to 1280px viewport at 400% zoom) — WCAG 1.4.10.
- Content survives users overriding spacing: 1.5× line-height, 0.12em letter-spacing, 0.16em word-spacing, 2× paragraph spacing — avoid fixed-height containers on text (WCAG 1.4.12).
- Respect `prefers-reduced-motion` — pause or disable transform-based animations; opacity-only transitions are acceptable for reduced-motion users.

---

## Forms

- Multi-step forms don't ask for data the user already provided in the same flow — auto-populate or offer a selectable option (WCAG 3.3.7 — **new in 2.2**).
- Form errors give a specific suggestion for correction, not just "invalid input" (WCAG 3.3.3).
- Authentication doesn't require a cognitive function test (puzzle CAPTCHA, math problem) as the only option. Acceptable alternatives: object recognition, copy-paste codes, password manager support (WCAG 3.3.8 — **new in 2.2**).

  **Why:** cognitive-function tests exclude users with cognitive disabilities and are routinely defeated by the bots they're meant to stop, so they fail the legitimate user without protecting against the threat.

---

## When Architecting

Before a UI design lands in implementation:

- Does the component hierarchy support focus management?
- Are ARIA roles and relationships planned, or being retrofitted?
- How are dynamic content updates announced?
- Does the design avoid inherently inaccessible patterns (hover-only, drag-only without keyboard)?
- Is there a meaningful `<h1>` on every route?
- Do auth flows avoid cognitive function tests as the sole option?
- Does the layout reflow at 320px width?

---

## When Reviewing

Apply the rules above to every UI change in the diff. The ones easy to miss when scanning:

- Status messages without `role="alert"` or `aria-live` (WCAG 4.1.3).
- `aria-live` containers injected after content changes instead of present from initial render.
- Focus styles missing or removed without replacement.
- Sticky headers fully covering a focused element (WCAG 2.4.11).
- Icon-only buttons under 24×24px (WCAG 2.5.8).
- DnD or sortable UIs without a keyboard alternative (WCAG 2.5.7).
- Tooltips that close when the pointer moves toward them or steal focus on dismiss (WCAG 1.4.13).
- `autocomplete` missing on personal-data fields (WCAG 1.3.5).
- Color contrast failing at `:hover` or `:focus` even when the default state passes.

---

## Testing

- Linters with a11y rules (e.g. `eslint-plugin-jsx-a11y` for React/JSX) catch mechanical issues at write time. Activate in your config.
- Automated tools (Axe, Lighthouse, WAVE) catch roughly 30–40% of issues — they're a floor, not a ceiling ([a11yproject.com](https://www.a11yproject.com)).
- Manual keyboard testing is required for custom widgets: Tab, Shift+Tab, Enter, Space, Escape, arrow keys.
- Test interactive states (default, hover, focus, active, disabled) for color contrast.
- Include accessibility assertions in component tests — ARIA attributes, semantic elements, keyboard interactions.

---

## Stack-specific notes

These sections apply only when your `techStack` includes the named framework.

### React / Next.js

- **Route announcements**: ensure each route has a meaningful `<h1>` so the framework's route announcer can read it on client-side navigation. ([Next.js accessibility](https://nextjs.org/docs/architecture/accessibility))
- **`eslint-plugin-jsx-a11y`** ships with `eslint-config-next` and most React style configs. Activate it in `eslint.config.*` — it catches missing `alt`, invalid ARIA, incorrect roles, and unlabeled form controls at write time.
- **`next/image`**: supply a meaningful `alt`, or `alt=""` for decorative.
- **`next/link`**: never use positive `tabIndex` on links — it breaks natural focus order.
- **Dynamic error messages**: error containers exist in the DOM before content changes, not injected after. Pattern: `aria-live="polite"` + `aria-atomic="true"` on the container, `aria-describedby` on the input pointing to it.

### CMS-driven block editors (WordPress Gutenberg, Sanity blocks, etc.)

- Block editor controls use the platform's built-in accessible components where available.
- Frontend block output follows the same semantic HTML and ARIA rules as the rest of the codebase.
- Sortable and drag-and-drop block editor UIs include a keyboard or button alternative for every drag operation (WCAG 2.5.7).

### Touch UI (mobile, tablet, hybrid)

See [Touch device pitfalls](#touch-device-pitfalls) above. The patterns there apply to any touch-reachable UI, not just one framework.
