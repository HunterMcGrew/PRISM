# Mega Menu

Architect context for the Thrive Mega Menu system. Covers block hierarchy, storage, editor shell, frontend rendering, mobile menu, security, and decisions that apply to all future mega menu work.

For the human-readable architecture narrative, see `docs/content/dev/architecture/mega-menu.md`.
For the REST API endpoint reference, see `docs/content/dev/references/mega-menu-api.md`.
For the migration operations guide, see `docs/content/dev/operations/mega-menu-migration.md`.

---

## Legacy paths (phase-out only)

The legacy mega menu lives at `frontend/blocks/site-header/MobileMegaMenu.tsx` and the surrounding tree under `frontend/blocks/site-header/`. It is phase-out only — no new fixes go there. Active work goes to `frontend/components/mega-menu-renderer/` (the new renderer).

**Why:** THR-1616, THR-1617, THR-1626, THR-1656, and THR-1659 each independently confirmed the boundary. Fixing the legacy path means doing the work twice (once in legacy, once in the new renderer when it ships) and increases the surface that has to keep working until legacy is removed.

**How to apply:** When investigating a mega menu bug, locate it in the new renderer first (`frontend/components/mega-menu-renderer/`). If the bug only reproduces on the legacy path because legacy is the active path on a given dealer, file a ticket for the legacy fix and tag it as "legacy phase-out" — the work still happens, but it's tracked as deprecation work, not feature work. Never silently fix legacy without flagging.

---

## File Locations

### PHP (backend)

| File                                                                                   | Purpose                                                     |
| -------------------------------------------------------------------------------------- | ----------------------------------------------------------- |
| `backend/plugins/gravity-platform-core/includes/Admin/MegaMenuEditor.php`              | Admin page registration, JS enqueue, PHP→JS settings bridge |
| `backend/plugins/gravity-platform-core/includes/RestApi/MegaMenuBlocksApi.php`         | All 10 REST endpoints                                       |
| `backend/plugins/gravity-platform-core/includes/Services/MegaMenuMigrationService.php` | Legacy→Thrive Mega Menu migration logic                     |
| `backend/plugins/gravity-platform-core/src/admin/mega-menu-editor/`                    | Editor shell JS/TS entry point                              |
| `backend/plugins/gravity-platform-core/src/blocks/mega-menu-*/`                        | Block edit components                                       |

### Frontend

| Path                                                                  | Purpose                                                                                                              |
| --------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| `frontend/lib/constants/mega-menu.ts`                                 | `MEGA_MENU_ALLOWED_BLOCKS` constant — single source of truth for content blocks allowed inside a column              |
| `frontend/components/mega-menu-editor/MegaMenuContext.tsx`            | Canonical context — every consumer imports from this file. Do not create duplicate or stub contexts.                 |
| `frontend/components/mega-menu-renderer/MegaMenuMobileMenu.tsx`       | Mobile three-level slide-in panel                                                                                    |
| `frontend/components/mega-menu-renderer/MegaMenuEditor.tsx`           | RSC wrapper — applies color CSS variables                                                                            |
| `frontend/components/navigation-menu-item/MegaMenuNavigationItem.tsx` | `"use client"` Thrive Mega Menu nav item (Headless UI Popover)                                                       |
| `frontend/blocks/mega-menu-editor/`                                   | Root block                                                                                                           |
| `frontend/blocks/mega-menu-renderer/`                                 | Entry point — fetches from REST, builds mobile nav model                                                             |
| `frontend/blocks/mega-menu-navigation-item/`                          | Nav item block (Thrive Mega Menu rendering path). Stores `link: ILink`; editor uses `LinkControl`.                   |
| `frontend/blocks/mega-menu-pane/`                                     | Structural block (pane wrapper)                                                                                      |
| `frontend/blocks/columns/` (`ColumnsBlock`, `ColumnBlock`)            | `mega-menu-columns` and `mega-menu-column` reuse the generic columns block views via `block-registry.ts`             |
| `frontend/blocks/mega-menu-*/`                                        | Content blocks (navigation-list, featured-links, links-with-icon, info-banner, featured-banner, about-us, locations) |

---

## Block Hierarchy

### Editor (WordPress)

```
mega-menu-editor (root block)
└── mega-menu-navigation-item (type="dropdown" | "link")
    └── mega-menu-pane
        └── mega-menu-columns
            └── mega-menu-column (1–N per row)
                └── [content blocks]
```

Allowed mega-menu content blocks (maintained in `MEGA_MENU_ALLOWED_BLOCKS`):
`navigation-list`, `featured-links`, `links-with-icon`, `info-banner`, `featured-banner`, `about-us`, `locations`

The constant also permits `mega-menu-columns` and the generic `core/buttons`, `core/heading`, `core/image`, `core/list`, `core/paragraph`, and `gravity-platform-core/card` blocks for general-purpose content styling.

### Frontend (Next.js RSC)

```
BlocksRenderer (recursive, RSC)
└── MegaMenuRenderer (RSC — fetches blocks, builds mobile nav model)
    └── MegaMenuEditor (RSC — applies color CSS variables)
        └── MegaMenuNavigationItem ("use client" — Headless UI Popover)
            └── NavigationMenuPanel (createPortal to document.body)
                └── MegaMenuProvider (closeDropdown context)
                    └── {children} (pane → columns → content blocks)
```

`MegaMenuNavigationItem` is the `"use client"` boundary. Everything above is RSC. Everything below hydrates for interactivity.

---

## Storage Model

Four `wp_options` keys store all mega menu state:

| Option key                                        | Contents                                               |
| ------------------------------------------------- | ------------------------------------------------------ |
| `platform_settings_mega_menu_blocks`              | Published content (served by frontend, 60s ISR)        |
| `platform_settings_mega_menu_blocks_draft`        | Working draft (what the editor loads and saves)        |
| `platform_settings_mega_menu_meta`                | Timestamps and user IDs for last save and last publish |
| `platform_settings_mega_menu_published_snapshots` | Up to 3 LIFO revision snapshots                        |

Publishing copies draft → published and pushes the previous published onto the snapshot stack (drops oldest when at 3).

---

## Security & Capability Model

- **Capability:** `edit_products` for all privileged operations — save, publish, revisions, migration, reset, admin page access.
- **Public endpoint** (`GET /mega-menu-blocks`): No auth. Returns sanitized published content only.
- **Editor endpoints**: Require `edit_products` capability.
- **Preview endpoint** (`GET /mega-menu-blocks-preview`): Accepts `edit_products` OR a valid 32-char alphanumeric preview token. Tokens stored as WordPress transients, 8-hour TTL.
- **Write cap:** 1 MB size limit enforced in `MegaMenuBlocksApi.php` (`MAX_BLOCKS_SIZE = 1048576`). Requests over this are rejected.
- **Sanitization:** On read, not write. `wp_kses_post` strips block comment delimiters if applied on write — so raw markup is stored and sanitized when served through the public endpoint. URL attributes (`url`, `href`, `src`, `buttonUrl`) are `esc_url`-sanitized.
- **Editor shell XSS:** All `wp_json_encode` calls in `MegaMenuEditor.php` use `JSON_HEX_TAG` to prevent XSS in inline scripts.

---

## Key Patterns

### MEGA_MENU_ALLOWED_BLOCKS

The single source of truth for which blocks may appear inside mega menu columns. Lives in `frontend/lib/constants/mega-menu.ts`. Used by:

- The editor shell to filter the block inserter (client-side, because `getInserterItems()` doesn't respect `allowedBlockTypes` in standalone editors)
- Any code that needs to enumerate or validate mega menu content blocks

Do not hardcode allowed block names elsewhere — import from this constant.

### MegaMenuProvider

`frontend/components/mega-menu-editor/MegaMenuContext.tsx` is the canonical context file. Every consumer imports from this single location. Do not create duplicate or stub contexts.

Provides: `closeMenu()`, `closeDropdown()`, `containerStyles` (CSS variables for colors), `defaultColors`. `closeMenu` and `closeDropdown` are aliases for the same callback — both names exist for call-site readability.

The provider is placed at two levels: `MegaMenuEditor` wraps the entire nav bar; each `MegaMenuNavigationItem` wraps its panel with the Popover's `close` function.

### Mobile nav model — server-resolved

The `mega-menu-renderer` resolver builds `MegaMenuMobileNavItem[]` server-side (`mobile-nav-model.ts`) by walking the block tree. This is passed as a serializable prop to `MegaMenuMobileMenu`. No client-side block parsing.

### Breakpoint switching — CSS only

The desktop popover nav has `lg:block` (hidden on mobile); the mobile nav has `lg:hidden` (hidden on desktop). Both render in HTML — CSS controls visibility. Do not use conditional rendering that depends on window width — it causes hydration mismatches.

### block-views.tsx dynamic() pattern

All mega menu block views must export from `block-views.tsx` using the `dynamic()` pattern. Inline `view: () => import(...)` in `block-registry.ts` breaks TypeScript after the blocks-renderer refactor. This applies to all inner blocks and `MegaMenuRendererBlock`.

---

## Decisions

- `MEGA_MENU_ALLOWED_BLOCKS` is the inserter filter source — `getInserterItems()` doesn't respect `allowedBlockTypes` in standalone editors; client-side filtering is the workaround.
- All mega menu block views use `block-views.tsx` `dynamic()` pattern — inline view imports in `block-registry.ts` break TypeScript.
- `render()` from `@wordpress/element` instead of `createRoot()` — Gutenberg's `BlockEditorProvider` has timing issues with React 18 concurrent rendering in standalone contexts; synchronous `render()` avoids the race condition.
- `@wordpress/interface` must be externalized in webpack, not bundled — bundling pulls in `@wordpress/ui` which calls `__dangerousOptInToUnstableAPIsOnlyForCoreModules` and crashes. WP core already provides `wp-interface` at runtime; rely on WordPress to load it rather than adding it to the admin script's PHP `$dependencies`.
- Sanitization happens on read, not write — `wp_kses_post` strips block comment delimiters if applied on write, destroying block structure.
- Editor shell CSS is scoped, not global — a global `display:none` would suppress WP security-critical admin notices.
- The mega menu editor hides WordPress's wp-admin sidebar and toolbar via scoped CSS to give the editor the full viewport. Reason: the editor is a focused workspace, not a wp-admin sub-page that benefits from surrounding navigation. Don't fight the chrome; remove it inside the editor's own DOM scope.
- The collapsible sidebar is **320px wide** with `aria-expanded` controlling collapsed vs expanded state, a width-transition animation, and `prefers-reduced-motion` respected. Reason: 320px matches WordPress's built-in `InterfaceSkeleton` width, so a user navigating between the post editor and the mega menu editor sees a familiar layout instead of a foreign one. Match the width unless there's a reason to break the visual continuity.
- `MegaMenuContext.tsx` is the canonical context — every consumer imports from this single file. Do not create new context files or stubs.
- Breakpoint switching is CSS-only — conditional rendering on window width causes hydration mismatches.
- Mobile nav model is built server-side in the `mega-menu-renderer` resolver — client-side block parsing is not needed and not acceptable.
- Mobile mega menu renders `links-with-icon` entries as title-only. The `description` attr from `mega-menu-link-with-icon` blocks is authored for desktop only — the mobile nav resolver (`parseLinkWithIcon`) must not copy it into `MegaMenuMobileLink`, and the mobile view has no `description` prop. Desktop rendering via `BlocksRenderer` still shows title + description as designed (THR-1656).
- `isLinkObject` checks both key presence and `typeof href === "string"` — not just key existence.
- `setLinkTarget(link, undefined)` deletes both `target` and `rel` — callers use `setLinkRel` to set rel independently.
- `ensureLinkObject` wraps string link values at block-attribute write time — components always receive `ILink`. Lives in `utilities/link-utilities`, not `interfaces/link`.
- `urlIsExternal` guards against null/undefined — CMS data may pass falsy URLs at runtime.
- Use `ControlledUrlInput` when a block only needs an editable URL field. Use `LinkControl` when the block needs target/rel editor UI — `LinkControl` internally wraps `ControlledUrlInput`. Do not use raw `URLInput` from `@wordpress/block-editor`.
- Mega menu top-level nav item stores `link: ILink`, not `url: string` (THR-1619). `MegaMenuMigrationService.buildNavItemBlock` writes `link: { href }` when migrating legacy `gravity-platform-core/mega-menu` content. Dropdown-type nav items omit `link` entirely; editors configure target via `LinkControl`.
- `LinkControl` uses `isExternalUrl(href, frontendDomain)` for auto-`target="_blank"` default — same site-aware check as `ControlledUrlInput`. Reads `frontend_domain` via `useEntityProp`. Advanced-settings panel defaults to open when a target is set so auto-behavior is visible to editors (THR-1619).
- Mega menu link `target` is editor-controlled only — the renderer does not default to `_blank` based on URL shape. Locations panels (which have no editor target UI) always render with no target. Top-level nav items use `LinkControl` so editors can opt into `_blank` explicitly. Editor-set `rel` is emitted regardless of target (supports `nofollow` on same-tab links); when target is `_blank` and no editor rel is set, `rel="noopener noreferrer"` is applied as a security default. The `urlIsExternal` utility remains available for other consumers (e.g. `LocalVideo`, legacy menus) but must not drive target selection in the mega menu.
- Mega menu editor bootstrap unregisters `core/paragraph`/`stretchy-paragraph` and `core/heading`/`stretchy-heading` after `registerCoreBlocks()` — these variations are registered globally but don't fit mega menu context. General pattern: see `backend-apps.md` step 5.
- `MegaMenuMigrationService` auto-derives `target`/`rel` for migrated top-level nav item links using a site-aware check against `platform_settings_frontend_domain` (mirrors `LinkControl.handleUrlChange`). This is not a violation of the editor-controlled-only renderer rule — the migration is seeding the editor-controlled value at create-time, matching what a human using `LinkControl` would have produced. Legacy `target`/`rel` values on the source `attrs` always win over auto-derivation (THR-1621). Other migration builders (links-with-icon, featured-banner, info-banner, normalizeLinks) preserve legacy `target` only and do not auto-derive — nav items are the only surface where editors can control `rel` via `LinkControl`'s advanced settings.
- The real root cause of the recurring mobile mega menu phantom-highlight bug class is **iOS sticky hover transferring through the global `a:hover` rule in `frontend/styles/globals.css`**. That rule sets every anchor's hover color to `theme("textColor.link.hover")` (which falls back to the `primary-light` WordPress preset — visually indistinguishable from the brand primary). On iOS Safari, tapping any element applies a sticky `:hover` state at the tap coordinate; when React re-renders the mega menu panel, whichever `<a>` lands at that coordinate inherits the sticky state and the global rule colors it primary-light. This reliably produces "first link in the third-level panel is highlighted" because the tap on the first second-level navigation-list button and the first third-level link render at overlapping Y-coordinates — the second navigation-list button is further down the panel, so its sticky coordinate doesn't overlap the top of the third-level panel. Buttons are immune because the `a:hover` rule does not apply to `<button>` elements. This surface has burned through **four** fix passes via this same underlying sticky-hover mechanism: PR #1797 removed `hover:text-primary` from `ITEM_CLASSES`, PR #1828 removed a panel-transition `useEffect .focus()` call (diagnosed as a different mechanism but the symptom overlapped), THR-1659 initially removed `focus-visible:text-primary` (the diagnosis was wrong — that CSS was not the active responder on iOS), and THR-1659's final fix added `[@media(hover:none)]:hover:!text-[var(--mega-menu-text-color)]` to `ITEM_CLASSES` to override the global `a:hover` rule ON TOUCH DEVICES ONLY — preserving mouse-hover feedback for pointer users at narrow viewports. Rules going forward for `MegaMenuMobileMenu.tsx` and any sibling mobile mega menu work: (1) any `<a>` in the mega menu mobile tree MUST include a hover utility that neutralizes the global `a:hover` on touch devices — otherwise sticky hover will produce phantom highlights on iOS; (2) **scope the hover override by device capability (`@media (hover: none)`), NOT by viewport size (`max-lg:`)** — the assumption "component is `lg:hidden` so desktop doesn't matter" is wrong because real-pointer users hit this component at narrow viewports (responsive debugging, iPad with Magic Keyboard, tablet modes), and breakpoint-based scoping kills their hover feedback; (3) active-link indication (when implemented) is reserved for `aria-current="page"` with multi-channel styling (font weight + border accent + color, not color alone) and must use a CSS channel distinct from hover or focus; (4) do not assume Headless UI Dialog's `initialFocus` is a viable lever on touch devices — the `InitialFocus` feature bit is disabled on `matchMedia("(pointer: coarse)")` in v2.x, so the redirect is a no-op where the bug surfaces; (5) when diagnosing a bug that looks like this one, check `frontend/styles/globals.css` FIRST for base-layer selectors that apply to all anchors — component-local class inspection is not sufficient.
- In blocks that consume `LinkControl`, `handleLinkChange` must write the full link directly — `setAttributes({ link: ensureLinkObject(updatedLink) })` — rather than merging with the prior attribute value. Spread-merge (`{ ...attributes.link, ...normalized }`) resurrects deleted keys: `setLinkTarget(link, undefined)` deletes `target` and `rel` from the returned object, but spread doesn't override absent keys, so the old values survive. Two blocks shipped with this bug (THR-1787: `mega-menu-info-banner`, `mega-menu-featured-banner`). The correct pattern is used by `mega-menu-navigation-item` and `mega-menu-link-with-icon`. Partial updates to a single link field (e.g. `label` only) may still use spread — the rule applies to handlers wired to `LinkControl`'s `onChange`.
- The broader issue behind this bug class: Tailwind's `hoverOnlyWhenSupported` future flag is not enabled in `frontend/tailwind.config.js`, and the globals.css `a:hover` rule is unguarded — so every anchor on every dealer site is susceptible to iOS sticky-hover color artifacts. Fixing this site-wide would require either enabling `hoverOnlyWhenSupported` globally (visual regression sweep required) or adding `@media (hover: hover)` guards to globals.css `a:hover` (safer but still needs visual QA). Track as a separate ticket — mega menu is one surface, not the only one.
- In the standalone mega menu editor, per-block content style handles (`gravity-platform-blocks`, `gravity-platform-blocks-theme`) must enqueue LAST in `MegaMenuEditor::enqueueEditorAssets()` — after `thrive-mega-menu-styles` (adminMain.css) and after WP core editor styles. The shell's `wp-admin-reset(".block-editor")` mixin (`apps/mega-menu-editor/styles.scss:49-51`) emits anchor/button reset rules at specificity (0,1,1) that tie with per-block `editor.scss` rules; on equal-specificity ties, later-loaded wins. Inverting this order silently breaks per-block rules like card `pointer-events: none` inside the mega menu canvas — and because regular gutenberg has its own `.edit-post-visual-editor a` catch-all in `main.scss:81`, the breakage is mega-menu-only and easy to miss in code review (THR-1741).
- **Panel close-on-link-click is event delegation in `MegaMenuNavigationItem.tsx`, not per-block `onClick={closeMenu}` wiring.** The Popover render-prop's `close` callback is captured by a `handlePanelClick` handler attached to a wrapper `<div>` around the panel children. The handler walks the click target with `Element.closest("a[href]")` and calls `close()` on match. Modifier-clicks (`metaKey` / `ctrlKey` / `shiftKey`) skip the close so cmd/ctrl/shift+click leaves the panel open for new-tab navigation. Reason: the bug class is wider than any single block — `CardBlock → Standard/Horizontal/FloatingCard → CardsButtonsList → Button → <Link>` is fully RSC, so no client component in the chain can read `useMegaMenuContext` to bind `closeMenu` as `onClick`. The same is true for any future RSC chain rendering a link inside a panel. Panel-level delegation makes generic primitives (Button, Card, banners) completely unaware of the mega menu — they don't import from `mega-menu-editor/` to participate, and any anchor with an `href` rendered inside a panel automatically closes the panel on click. Buttons (`<button>`) and other non-anchor interactive elements inside panels are intentionally unaffected — they are not navigation, and closing the panel on every interactive click would surprise users. Per-block `onClick={closeMenu}` wiring inside a panel is redundant and was removed from `MegaMenuFeaturedLinks`, `MegaMenuNavigationList`, `MegaMenuLinkWithIcon`, and `MegaMenuLocations` once delegation took over (THR-1811).
- **The wrapper `<div>` around panel children must keep `className="w-full"`.** The wrapper sits inside `PopoverPanel` (`flex w-full`); pane content uses `container-xl` (= `mx-auto w-full max-w-screen-xl px-6` per `frontend/styles/globals.css:56-58`). Without `w-full` on the wrapper, it becomes a shrink-wrapping flex item and the pane's `mx-auto` loses its auto-margin space, left-aligning panes at viewports > 1280px. `display: contents` would also restore centering but invites historical a11y-tree quirks (Chromium <86, Firefox <89) on a high-blast-radius UI surface. `w-full` is the conservative choice — wrapper fills the panel, pane's `mx-auto` centers within the wrapper up to `max-w-screen-xl`, layout matches the pre-delegation behavior. Removing the className will silently regress panel centering at desktop widths (THR-1811).

---

## Feature Flag

`enable_mega_menu` — ACF true/false toggle on Platform Settings page. Stored in `wp_options` as `platform_settings_enable_mega_menu`.

Gates: admin page registration, four structural block types via `FeatureFlags::gated_blocks`, and the `EnableMegaMenu` GraphQL boolean field on `ThriveSettings`. The frontend reads this field to determine whether to render the Thrive Mega Menu.

Enabling the flag makes the Thrive Mega Menu available — it does not activate it. Dealers must also switch the `menuType` attribute on their header block. These are two separate steps.

For the full feature flag system, see `.claude/architect/php-classes.md` (Feature Flags section).

---

## Migration

### Legacy display conventions are real data

When migrating legacy mega menu data to the new editor schema, treat the legacy display conventions as data, not styling. A naive instance-shape mapping (one block per legacy item, copy fields one-to-one) loses the per-section conventions baked into legacy CSS and structure — column counts, image dimensions, link targets — and the migrated content renders wrong.

**Why:** Six migration plans (THR-1585, THR-1588, THR-1589, THR-1590, THR-1591, THR-1658) each rediscovered this. THR-1658's example: legacy column count was never per-instance data — `firstSection` hardcoded `columnCount: 2` in inline style, `secondSection` was always `flex-col` (1 column). The migration assumed columns were a per-instance attribute and dropped them entirely. The fix was to read the legacy frontend component's rendering logic and encode those conventions explicitly in the migration mapper.

**How to apply:** Before writing a migration mapper, trace the legacy frontend rendering. Identify which display attributes are per-instance (data) and which are per-section conventions (encoded in the legacy frontend component, not the data). Encode the per-section conventions explicitly in the new schema's defaults or in the mapper. The source of truth is how the legacy frontend rendered, not the legacy data model.

---

## Per-Block Documentation

Each Mega Menu block has a pair of human-readable docs — one dev, one user — that agents must keep in sync when block source changes. This architect file owns system-level patterns and enforcement rules; the per-block docs own the per-block reference detail (attributes, editor controls, inner-block rules) and the end-user configuration guide.

**Dev docs** — `docs/content/dev/blocks/mega-menu/*.md`. One reference page per Mega Menu block inside the system folder, plus the legacy root `mega-menu.md`. Reference pages, not architecture docs. When editing a block's source (`frontend/blocks/mega-menu-*/` or `backend/plugins/*/src/blocks/mega-menu-*/`), check whether the change alters attributes, editor controls, inner-block rules, or block supports and update the matching dev doc.

- `mega-menu.md` — legacy root block (being phased out)
- `mega-menu-editor.md` — wp-admin editor shell root block
- `mega-menu-renderer.md` — frontend entry point placed in the site header
- `mega-menu-about-us.md`, `mega-menu-column.md`, `mega-menu-columns.md`, `mega-menu-featured-banner.md`, `mega-menu-featured-links.md`, `mega-menu-info-banner.md`, `mega-menu-link-with-icon.md`, `mega-menu-links-with-icon.md`, `mega-menu-locations.md`, `mega-menu-navigation-item.md`, `mega-menu-navigation-list.md`, `mega-menu-pane.md` — content and structural blocks

**User docs** — `docs/content/user/blocks/mega-menu/*.md`. One reference page per user-facing Mega Menu block inside the system folder (`mega-menu-editor` is dev-only) plus the umbrella `mega-menu.md` overview at the folder root. When a block's attributes, controls, or allowed inner blocks change in a way a dealer would see in wp-admin, update the matching user doc.

The umbrella user doc (`docs/content/user/blocks/mega-menu/mega-menu.md`) and the paired dev architecture doc (`docs/content/dev/architecture/mega-menu.md`) link out to the per-block pages — they don't duplicate per-block detail.
