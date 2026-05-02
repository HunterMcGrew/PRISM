# Accessibility (WCAG 2.1 Level AA)

WCAG 2.1 Level AA is the baseline for UI work in this codebase, with WCAG 2.2 additions flagged inline where they raise the bar. These rules apply when writing, reviewing, or architecting components.

**Why the bar lands here:** the ADA's 2024 final rule ([ada.gov](https://www.ada.gov/resources/2024-03-08-web-rule/)) makes WCAG 2.1 AA the enforceable standard for public-facing digital services under Title II, and courts use it as the floor in private litigation. WCAG 2.2 isn't yet legally enforced but represents the direction of travel — adopting its additions where they apply costs little now and avoids retrofits later.

---

## Semantic HTML

- Use native HTML for its intended purpose — `<button>` not `<div onClick>`, `<nav>` for navigation, `<main>` for primary content.
- Heading levels are sequential — never skip h1 → h2 → h3.
- Use `<ul>`/`<ol>` for lists, `<table>` for tabular data.
- Form fields collecting personal data use the right `autocomplete` value (`email`, `given-name`, etc.) — enables browser autofill and assistive tech (WCAG 1.3.5).
- Don't lock content to a single orientation (WCAG 1.3.4).
- When inline content shifts language, mark it with `lang="..."` on the element (WCAG 3.1.2).

The `<h1>`-per-route rule lives in [Next.js-Specific](#nextjs-specific) — it's tied to the App Router's route announcer.

---

## Keyboard Navigation

- All interactive elements are keyboard-accessible — focusable and operable with Enter/Space.
- Focus order follows visual order — never use positive `tabIndex`.
- Custom widgets (dropdowns, modals, menus) trap focus appropriately and dismiss with Escape.
- Visible focus indicators on every interactive element. If you remove the default `outline`, replace it. Custom focus styles meet 3:1 contrast against adjacent colors (WCAG 1.4.11).
- Sticky headers, banners, and modals can partially obscure a focused element but never fully cover it (WCAG 2.4.11 — **new in 2.2**).
- Interactive targets are at least **24×24 CSS pixels** — audit icon-only buttons, close buttons, inline controls (WCAG 2.5.8 — **new in 2.2**).
- Drag-and-drop has a single-pointer or keyboard alternative — applies to sortable block editor UI, carousels, any DnD interface (WCAG 2.5.7 — **new in 2.2**).

---

## ARIA

- Prefer native semantics; reach for ARIA only when HTML alone can't carry the meaning.
- Every `role` includes its required ARIA properties (e.g. `role="tab"` needs `aria-selected`).
- Dynamic content changes announce to screen readers via `aria-live` regions or focus management.
- `aria-live` containers exist on initial render, even when empty.

  **Why:** screen readers track live regions from the moment they're added to the DOM. A container that appears _with_ its content already inside is treated as a normal element, not a live announcement — the text never gets read out. ([Next.js form error pattern](https://nextjs.org/docs/architecture/accessibility))

- Status messages that don't receive focus (toast notifications, form success, "item added to cart") use `role="alert"` or `aria-live` (WCAG 4.1.3). This is the single most-missed criterion in custom React notification components.
- Form errors: link the input to its error message with `aria-describedby`; the error container uses `aria-live="polite"` and `aria-atomic="true"`.
- Icon-only buttons need `aria-label` or visually hidden text.
- Tooltips and popovers must be (a) dismissible via Escape without moving focus, (b) hoverable — pointer can move into the tooltip without it closing, (c) persistent until explicitly dismissed (WCAG 1.4.13).

### Active state and focus state are not the same selector

An active link (current page) and a focused link are different states. Don't share a CSS selector — give each its own styling channel.

**Why:** THR-1617 → THR-1659 was a third pass at the same bug. Each iteration tried to fix a phantom highlight on iOS Safari that survived navigation. The structural cause was `focus-visible:text-primary` on anchor elements: iOS Safari's `:focus-visible` heuristic is unreliable on touch (sticky after tap, fires on programmatic focus, varies across WebKit versions), and using the same color token for active and focus states meant the bug couldn't be fixed in either dimension without breaking the other. Three tickets, one bug class.

**How to apply:**

- Active link: `aria-current="page"` plus multi-channel styling — combine font weight, border accent, and color, never color alone. Multi-channel keeps the indication legible to color-blind users and survives any single-channel CSS conflict.
- Focus: rely on the browser's default UA focus outline on `<a>` elements unless you need a custom ring. The UA outline uses the browser's internal focus-visible heuristic, which is narrower than CSS `:focus-visible` and only fires on genuine keyboard interaction — no phantom flash on touch.
- Never use `focus-visible:text-*` color swaps on anchors in touch contexts. They have the same trigger as the bug-causing pattern and reintroduce the iOS path.

### Touch device pitfalls

Touch devices break a11y assumptions that hold on desktop. Three patterns to watch:

1. **Tailwind `hover:` variants.** Without `hoverOnlyWhenSupported` enabled in `tailwind.config.js`, `hover:bg-primary` fires on touch tap and sticks until the next interaction. The codebase does not currently have `hoverOnlyWhenSupported` enabled — flag any new `hover:` variant added to a touch-reachable element.
2. **iOS `:focus-visible` heuristic on anchors.** WebKit's match heuristic is wider than expected — focus state can persist across navigation, fire on programmatic focus, and survive element unmount. Don't tie load-bearing visuals to `focus-visible:` on anchors. (See "Active state and focus state are not the same selector" above.)
3. **Headless UI's touch gates.** Some Headless UI behaviors (e.g. `Dialog`'s `initialFocus`) are disabled on touch via `matchMedia("(pointer: coarse)")`. Don't assume a Headless UI prop fires on phone the way it does on desktop — check the source if the behavior matters.

**Why:** THR-1577, THR-1617, and THR-1659 all involved touch-only bugs that didn't reproduce on desktop. The patterns above are the root causes; they're easy to write and hard to catch without device testing.

**How to apply:** When building UI that's reachable on touch, audit `hover:`, `focus-visible:`, and Headless UI prop usage against the three patterns. Test on a real iOS device before shipping load-bearing interactions.

---

## Images and Media

- All `<img>` elements have `alt` text — decorative images use `alt=""`.
- `next/image` enforces a required `alt` prop via `eslint-plugin-jsx-a11y` — pass `alt=""` for decorative.
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

> A programmatic color contrast utility is planned for Q2 theming work and tracked separately — see `.claude/plans/thr-1523.md`.

---

## Forms

- Multi-step forms don't ask for data the user already provided in the same flow — auto-populate or offer a selectable option (WCAG 3.3.7 — **new in 2.2**).
- Form errors give a specific suggestion for correction, not just "invalid input" (WCAG 3.3.3).
- Authentication doesn't require a cognitive function test (puzzle CAPTCHA, math problem) as the only option. Acceptable alternatives: object recognition, copy-paste codes, password manager support (WCAG 3.3.8 — **new in 2.2**).

  **Why:** cognitive-function tests exclude users with cognitive disabilities and are routinely defeated by the bots they're meant to stop, so they fail the legitimate user without protecting against the threat.

---

## Next.js-Specific

- **Route announcements:** every page has a meaningful `<h1>`. Next.js's built-in route announcer reads it on client-side navigation — without one, screen reader users get no signal that a route changed. ([Next.js accessibility](https://nextjs.org/docs/architecture/accessibility))
- **`eslint-plugin-jsx-a11y`** ships with `eslint-config-next`. Make sure it's activated in `eslint.config.mjs` — it catches missing `alt`, invalid ARIA, incorrect roles, and unlabeled form controls at write time.
- **`next/image`:** supply a meaningful `alt`, or `alt=""` for decorative.
- **`next/link`:** never use positive `tabIndex` on links — it breaks natural focus order.
- **Dynamic error messages:** error containers exist in the DOM before content changes, not injected after. Pattern: `aria-live="polite"` + `aria-atomic="true"` on the container, `aria-describedby` on the input pointing to it.

---

## WordPress Blocks

- Block editor controls use WordPress's built-in accessible components where available.
- Frontend block output follows the same semantic HTML and ARIA rules as the rest of the codebase.
- Mega menu blocks support keyboard navigation between panes and items.
- Sortable and drag-and-drop block editor UIs include a keyboard or button alternative for every drag operation (WCAG 2.5.7).

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

- `eslint-plugin-jsx-a11y` (via `eslint-config-next`) catches mechanical issues at write time.
- Automated tools (Axe, Lighthouse, WAVE) catch roughly 30–40% of issues — they're a floor, not a ceiling ([a11yproject.com](https://www.a11yproject.com)).
- Manual keyboard testing is required for custom widgets: Tab, Shift+Tab, Enter, Space, Escape, arrow keys.
- Test interactive states (default, hover, focus, active, disabled) for color contrast.
- Include accessibility assertions in component tests — ARIA attributes, semantic elements, keyboard interactions.
