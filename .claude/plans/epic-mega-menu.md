# Plan: Epic — Mega Menu V2

## Ticket

Mega Menu V2 epic — encompasses THR-1263, THR-1130–1136, THR-1399, THR-1410, THR-1443, THR-1445, THR-1448, THR-1447, THR-1449, THR-1450, THR-1451

## Goal

Replace the legacy mega menu system with a fully block-based Mega Menu V2: a custom Gutenberg editor shell, composable inner blocks (panes, columns, navigation lists, featured links, banners, locations, icons), a headless Next.js frontend renderer with RSC-first architecture, mobile menu, and a one-click migration tool from legacy data.

---

## PR Merge Order

> Canonical merge chain — all 16 PRs. Merged PRs are checked off.

- [x] 1. #1613 — THR-1443: Link types and helpers
- [x] 2. #1615 — THR-1445: Sortable links modal
- [x] 3. #1616 — THR-1399: URL input component wrapper
- [x] 4. #1608 — THR-1263: Columns block enhancements
- [x] 5. #1536 — THR-1410: Columns alignment controls
- [x] 6. #1611 — THR-1134: Featured links block *(needs retroactive architecture update)*
- [x] 7. #1612 — THR-1136: Navigation list block *(needs retroactive architecture update)*
- [x] 8. #1622 — THR-1131: Links with icons block
- [x] 9. #1623 — THR-1135: Info banner block
- [x] 10. #1625 — THR-1130: Featured banner block
- [x] 11. #1620 — THR-1133: About us block
- [x] 12. #1621 — THR-1132: Locations block
- [x] 13. #1626 — THR-1448: Mega Menu Editor shell
- [x] 14. #1627 — THR-1447: Root block + Navigation item
- [x] 15. #1628 — THR-1449: Renderer + Preview + Mobile menu
- [x] 16. #1633 — THR-1450: Migration tool

### Tier Grouping

| Tier | PRs | Description |
|------|-----|-------------|
| 1 — Foundation | #1613, #1615, #1616, #1608, #1536 | Shared types, utilities, columns |
| 2 — Inner blocks | #1611, #1612, #1622, #1623, #1625, #1620, #1621 | All mega menu content blocks |
| 3 — Editor shell | #1626 | Custom WP admin editor |
| 4 — Root + Nav item | #1627 | Root block, navigation item block |
| 5 — Renderer | #1628 | Frontend renderer, preview route, mobile menu |
| 6 — Migration | #1633 | Legacy data migration tool |

---

## Architecture Overview

### Block Hierarchy (Editor)

```
mega-menu-v2 (root block)
└── navigation-menu-item (type="dropdown" | "link")
    └── mega-menu-pane
        └── mega-menu-columns
            └── mega-menu-column (multiple)
                └── [content blocks: navigation-list, featured-links,
                     links-with-icons, info-banner, featured-banner,
                     about-us, locations]
```

### Frontend Rendering (Next.js RSC)

```
BlocksRenderer (recursive)
└── NavigationMenuItemV2 (Headless UI Popover)
    └── NavigationMenuPanel (createPortal to body)
        └── MegaMenuV2Provider (closeDropdown context)
            └── {children} (pane → columns → blocks)
```

### Storage

- Mega menu content stored in `wp_options` (draft, published, meta, snapshots) — not custom post types
- Preview uses transient-based tokens (8h TTL) for draft content access
- Editor settings passed via `window.thriveMegaMenuSettings`

### Key Patterns

- **RSC-first**: all components are React Server Components by default; `"use client"` only on leaf interactive components
- **Resolver pattern**: blocks use `resolver.ts` for server-side data fetching, `schema.ts` for attributes
- **Headless UI Popover**: handles open/close, ESC, click-outside, focus management
- **MegaMenuV2Context**: lightweight React Context passes Popover `close` function to child blocks via `useMegaMenuV2()`
- **Components stay dumb**: data transformation happens in `getBlockProps` / resolvers, not components
- **`MEGA_MENU_ALLOWED_BLOCKS`**: lives in `frontend/lib/constants/mega-menu.ts`, used by editor shell and block inserter filtering

---

## Decisions

- Link types (`ILink`, `LinkValue`, `LinkTarget`) consolidated in THR-1443 — `type-guards/link.ts` imports from `interfaces/link.ts` (one direction only), never reverse
- `isLinkObject` checks both key presence and `typeof href === "string"` — not just key existence
- `setLinkTarget(link, undefined)` deletes both `target` and `rel` — callers use `setLinkRel` to set rel independently. Same delete-not-spread pattern for all link setters
- `ensureLinkObject` wraps string link values at block-attribute write time — components always receive `ILink`
- Handler functions encapsulate all logic including normalization — callers pass handler references directly (`onChange={handleChange}`, not `onChange={(v) => handleChange(transform(v))}`)
- `ControlledUrlInput` is the canonical URL input wrapper — `LinkControl` moved from editor-sidebar to components
- `IconSelectionGrid` is the reusable editor icon picker component (from THR-1131)
- `getItemsByIds` added to `IDataAccessLayer` interface (optional, generic) for location fetching
- XSS prevention: all `wp_json_encode` calls in editor shell use `JSON_HEX_TAG` flag
- Editor shell CSS scoped to avoid suppressing WP security-critical notices (not global `display:none`)
- Use `render()` from `@wordpress/element` instead of `createRoot()` — Gutenberg has timing issues with React 18 concurrent rendering
- Block inserter manually filters using `MEGA_MENU_ALLOWED_BLOCKS` — `getInserterItems()` doesn't always respect `allowedBlockTypes` settings in standalone editors
- Multiple blocks have MegaMenuContext stubs — all should be removed once the full chain merges and real context is available
- Migration tool dispatches by `type` field, not pane title — `type=link` items are carried over as links regardless of title
- All mega menu block views must use `block-views.tsx` `dynamic()` pattern — inline `view: () => import(...)` in `block-registry.ts` breaks TypeScript after the blocks-renderer refactor (THR-1451)
- `ensureLinkObject` lives in `utilities/link-utilities`, not `interfaces/link` — moved during THR-1443/THR-1445 merge to main
- `urlIsExternal` guards against null/undefined — CMS data may pass falsy URLs at runtime

---

## History

- 2024-12-15 [demo/hmcgrew/mega-menu-editor-v2]: Initial mega menu V2 implementation — color theming, close context, mobile menu, featured banner block, code cleanup (phases 1-4)
- 2024-12-16 [demo/hmcgrew/mega-menu-editor-v2]: Editor UX improvements — list view, block inserter filtering, breadcrumbs, left sidebar (phase 5)
- 2024-12-17 [demo/hmcgrew/mega-menu-editor-v2]: NavigationMenuItemV2 panel rendering verified, 49 tests added
- 2024-12-18 [demo/hmcgrew/mega-menu-editor-v2]: WordPress packages updated to latest versions
- 2025-03 — 2026-03: Work split from monolithic demo branch into 16 individual PRs with proper dependency chain
- 2026-03-04 [hmcgrew/thr-1443-link-types]: Link types and helpers — `LinkTarget`, `isLinkObject`, link setters. Merged to main
- 2026-03-06 [feature/hmcgrew/thr-1445-sortable-links-modal]: Sortable links modal — `LinkValue`, `ensureLinkObject`, `SortableLinksModal`. Merged to main
- 2026-03-10 [feature/hmcgrew/thr-1399]: ControlledUrlInput wrapper, LinkControl move, ToolbarLink refactor. Merged to main
- 2026-03-11 [hmcgrew/thr-1410-add-alignment-to-mega-menu-columns]: Alignment toolbar controls for columns. Merged to main
- 2026-03-14 [feature/hmcgrew/thr-1130]: Featured banner block — 18 tests, 13 stories. PR ready
- 2026-03-14 [feature/hmcgrew/thr-1131-links-with-icons]: Links with icons block — IconSelectionGrid, DynamicIcon. PR ready
- 2026-03-14 [feature/hmcgrew/thr-1132-mega-menu-locations]: Locations block — sortable, WPGraphQL ID conversion. PR ready
- 2026-03-15 [feature/hmcgrew/thr-1134-featured-links]: Featured links block — sortable styled links. PR ready
- 2026-03-15 [feature/hmcgrew/thr-1135-info-banner]: Info banner block — WithSkeletonImage, MegaMenuContext integration. PR ready
- 2026-03-16 [feature/hmcgrew/thr-1136-navigation-list]: Navigation list block — multi-column links, WCAG headings. PR ready
- 2026-03-18 [hmcgrew/thr-1448-mega-menu-editor-admin-shell]: Mega Menu Editor shell — wp_options storage, preview tokens, XSS fixes. Code review complete
- 2026-03-20 [hmcgrew/thr-1447-root-block-nav-item]: Root block + Navigation item block. PR ready
- 2026-03-22 [hmcgrew/thr-1449-renderer-preview-mobile]: Renderer, preview route, mobile menu. PR ready
- 2026-03-25 [hmcgrew/thr-1450-migration-tool]: Migration tool — 74 PHP tests, 330 assertions, pane transformers. PR ready
- 2026-03-29 [hmcgrew/thr-1263-mega-menu-columns-column]: Columns block — merged main with blocks-renderer refactor, resolved 3 conflicts
- 2026-03-29: Updated all 12 open PR descriptions with auto-status dependency list format
- 2026-03-29: Created epic-mega-menu.md plan, committed to #1608 branch
- 2026-03-29: Merged main into 9 conflicting branches (#1611, #1612, #1622, #1623, #1625, #1626, #1627, #1628, #1633) — all code conflicts resolved by taking main's versions from already-merged PRs
- 2026-03-29: Fixed build failures across 8 branches — migrated block registrations to block-views.tsx dynamic() pattern, fixed ensureLinkObject import paths, fixed WPMedia fileSizeInBytes typo, added urlIsExternal null guard
- 2026-03-29: All 12 open PRs now building green
- 2026-04-03 [feature/hmcgrew/thr-1133-our-mission-block-for-mega-menu-2]: Merged origin/main. Self-review found 2 major issues (hardcoded heading ID, no unit tests) and 2 minor issues (BlockFrontendProps naming, empty editor.scss). Prettier auto-fixed 4 files.
- 2026-04-03 [feature/hmcgrew/thr-1133-our-mission-block-for-mega-menu-2]: Fixed all 4 review issues — unique heading ID via block `id` prop (no suffix/fallback), renamed props type to MegaMenuAboutUsBlockProps, added 8 unit tests, removed empty editor.scss import. Stories updated with `id` prop.
- 2026-04-03 [feature/hmcgrew/thr-1133-our-mission-block-for-mega-menu-2]: Follow-up self-review (Briar) — all 4 prior issues confirmed fixed locally (unpushed). 8 tests pass, TS clean, Prettier/ESLint clean. 1 new minor issue: redundant comment. AC generated and synced to THR-1133.
- 2026-04-03 [feature/hmcgrew/thr-1133-our-mission-block-for-mega-menu-2]: Removed redundant `// These values are required.` comment in edit.tsx:86 — first comment line already explains the why.
- 2026-04-04 [feature/hmcgrew/thr-1133-our-mission-block-for-mega-menu-2]: PR review round 2 (Eric) — previous majors confirmed fixed. 5 minor issues open: import type in edit.tsx/save.tsx, isAlignment placement, Props/defaults mismatch, empty editor.scss file.
- 2026-03-29 [feature/hmcgrew/thr-1136-navigation-list-block-for-mega-menu-2]: Pre-added all 12 mega menu block types to block-types.ts and genericized MegaMenuContext.tsx stub. After #1612 merges, remaining inner-block PRs will have 2 predictable conflicts (block-registry.ts + block-views.tsx) instead of 4. #1620 and #1621 will be clean or near-clean.
- 2026-03-29: #1611 and #1612 confirmed merged to main. Marked for retroactive architecture update after all PRs merge.
- 2026-03-29 [feature/hmcgrew/thr-1131-links-with-icons-block-for-mega-menu-2]: Merged origin/main (resolved 4 conflicts), decoupled component from block schema per component-props-decoupling rule. Updated PR description.
- 2026-03-29: Launching architecture compliance sweep across all 8 remaining open PRs — merge origin/main, audit against component-props-decoupling + code-standards, fix violations, commit, push.
- 2026-03-29: Architecture sweep complete. Results:
  - #1623 (info-banner): merged main (4 conflicts), decoupled MegaMenuInfoBanner from schema (inlined defaults)
  - #1625 (featured-banner): merged main (4 conflicts), already compliant (no component violations)
  - #1620 (about-us): merged main (29 commits, clean), decoupled MegaMenuAboutUs from schema (own Props type, inlined defaults), migrated to block-views.tsx pattern, removed duplicate block-type constant
  - #1621 (locations): merged main (2 conflicts), migrated to block-views.tsx pattern, no component violations
  - #1626 (editor shell): merged main (clean, no conflicts), no violations (PHP-only)
  - #1627 (root+nav item): merged main (5 conflicts), fixed MegaMenuDefaultColors test. BlockFrontendProps rename deferred — crosses MegaMenuEditor and NavigationItem (deeper refactor for follow-up)
  - #1628/#1633: skipped — violations are from upstream dependency branches, will be clean after inner blocks merge
- 2026-04-09 [hmcgrew/thr-1449-mega-menu-renderer-preview-route]: Merged origin/main after THR-1447 (#1627) merge. Resolved 64 conflicts — bulk-resolved to main's reviewed versions. Fixed 5 stale auto-merges: MegaMenuEditor.tsx (BlockFrontendProps→MegaMenuEditorProps), GQLEventRepository (2-arg generic→1-arg), MegaMenuLinkWithIcon (restored aria-label), PartsNavigationPane (restored correct import path), MegaMenuInfoBannerBlock (tightened heading/buttonLabel to required). 222 tests pass, types clean.
- 2026-04-09 [main]: Sasha debugged white screen on mega menu admin page. Root cause: `@wordpress/interface` bundled by dep extraction plugin's BUNDLED_PACKAGES list → transitive `@wordpress/ui` crashes on private-apis registration. Fix: externalize `@wordpress/interface` in webpack config.
- 2026-04-09 [main]: Clove fixed white screen — added `@wordpress/interface` to webpack externals in `webpack.config.js`, added `wp-interface` to PHP dependencies in `MegaMenuEditor.php`. Verified: `@wordpress/ui` eliminated from `adminMain.js` (0 occurrences).
- 2026-04-09 [hmcgrew/thr-1448-complete-interface-removal]: Completed `@wordpress/interface` removal — replaced `FullscreenMode`/`InterfaceSkeleton` with custom divs+CSS (PR #1731), then added sticky-menu handling to fullscreen useEffect, `role="region"` + `tabIndex={-1}` + `aria-label` on 5 skeleton divs for `navigateRegions` keyboard navigation, `tabIndex={-1}` on header and left-sidebar regions, removed dead type declaration and package dependency (16 transitive packages dropped).
- 2026-04-09 [main]: All 16 PRs merged. Verified open items: MegaMenuContext stubs resolved, merge conflict strategy resolved, isLastBlock not a bug (pre-filtered by caller), group/schema.ts clean. Remaining open items: retroactive architecture update for #1611/#1612, 32 console.logs in BlocksRenderer.stories.tsx, empty editor.scss for about-us, focus-visible ring on V2 NavigationMenuItem, 6 files inline LinkTarget union.
- 2026-04-09 [main]: Fixed all remaining open items — registered MegaMenuRendererBlock in block-registry + block-views, deleted empty editor.scss, switched NavigationMenuItem to focus-visible:ring-2, removed 32 console.logs from BlocksRenderer.stories.tsx, decoupled MegaMenuFeaturedLinks Props from BlockAttributes (renamed BlockFrontendProps → MegaMenuFeaturedLinksBlockProps), deleted dead MegaMenuNavigationListBlock.tsx. Types clean, Prettier/ESLint clean.
- 2026-04-09 [fix/mega-menu-epic-cleanup]: Briar self-review of PR #1734. 1 minor: orphaned trailing comment in BlocksRenderer.stories.tsx:419 (cosmetic, from console.log removal). No critical/major issues. Registration, decoupling, a11y, and deletions all verified correct.

---

## Cross-Cutting Open Items

### MegaMenuContext Stubs
- **Status:** `resolved`
- **Resolved:** All stubs removed during merge process. Canonical implementation lives at `frontend/components/mega-menu-editor/MegaMenuContext.tsx`. All 13 consumers import from this single location.

### Merge Conflict Strategy for Inner Blocks
- **Status:** `resolved`
- **Resolved:** All 16 PRs merged. No further conflict management needed.

### Retroactive Architecture Update for Already-Merged PRs
- **Status:** `fixed`
- **Affected PRs:** #1611 (featured-links), #1612 (navigation-list)
- **Fixed in:** (2026-04-09) Featured-links: decoupled `MegaMenuFeaturedLinksProps` from `BlockAttributes` — now defines own Props with explicit fields, removed schema import from component. Renamed `BlockFrontendProps` → `MegaMenuFeaturedLinksBlockProps` in block wrapper. Navigation-list: deleted dead `MegaMenuNavigationListBlock.tsx` (superseded by `.view.tsx` passthrough + resolver already using component Props).

### Mega Menu Renderer Block Not Registered on Frontend
- **Status:** `fixed`
- **Fixed in:** (2026-04-09) Added `MegaMenuRendererBlock` dynamic export in `block-views.tsx` and `registerBlock(BLOCK_TYPES.MEGA_MENU_RENDERER, { resolver, view })` in `block-registry.ts`.

### THR-1451 Blocks Renderer Refactor
- **Status:** `resolved`
- **Issues:**
  1. ~~`isLastBlock` miscalculation~~ — **not a bug** (verified 2026-04-09). Pre-filtered by caller.
  2. ~~32 `console.log` statements~~ — **fixed** (2026-04-09). Removed all 32 from play functions; meaningful assertions were already in place.
  3. ~~`group/schema.ts` mixing concerns~~ — **not an issue** (verified 2026-04-09).

---

## Debugged Issues

_(Entries from individual ticket plans — all fixed unless noted)_

### BlockEditorStoreType Narrowed Too Aggressively (THR-1135)
- **Status:** `fixed`
- **File:** backend editor types
- **Root cause:** Narrowing BlockEditorStoreType broke 14 blocks
- **Fix:** Reverted to original `typeof BlockEditorSelectors`

### ColumnBlock Props Type Too Restrictive (THR-1410)
- **Status:** `fixed`
- **File:** frontend/blocks/columns/
- **Root cause:** TS2740 — props type didn't allow partial base props
- **Fix:** Changed to use `Partial<BaseBlockProps>`

### Mega Menu admin page white screen — @wordpress/ui private-apis crash
- **Status:** `fixed`
- **Severity:** Critical
- **Environment:** local dev (admin.thrive.orb.local), wp-admin mega menu editor page
- **File:** `backend/plugins/gravity-platform-core/src/admin/mega-menu-editor/editor.tsx:33`
- **Root cause:** `@wordpress/dependency-extraction-webpack-plugin@6.39.0` (from `@wordpress/scripts@31.4.0`) lists `@wordpress/interface` in its `BUNDLED_PACKAGES` array, so it bundles the package into `adminMain.js` instead of externalizing it. The bundled `@wordpress/interface@9.28.0` transitively pulls in `@wordpress/admin-ui@1.11.0` → `@wordpress/ui@0.10.0`. When the bundled `@wordpress/ui` initializes, it calls `__dangerousOptInToUnstableAPIsOnlyForCoreModules` which WordPress core's `private-apis.min.js` rejects — only core scripts may use that API. The uncaught error crashes webpack module initialization before `domReady` fires, so React never mounts. Additionally, WordPress core already provides `wp-interface` as a registered script (loaded via `wp-editor` dependency chain), causing a duplicate "Store 'core/interface' is already registered" warning.
- **Steps to Reproduce:**
  1. Navigate to `/wp-admin/admin.php?page=thrive-mega-menu`
  2. Page renders white; console shows `Uncaught Error: You tried to opt-in to unstable APIs as module "@wordpress/ui"`
- **Expected behavior:** Mega menu block editor loads and renders
- **Actual behavior:** White screen, JS crash during module initialization
- **Recommended fix:** Override webpack externals in `webpack.config.js` to externalize `@wordpress/interface` (and its transitive deps `@wordpress/admin-ui`, `@wordpress/ui`) instead of bundling them. WordPress core already provides `wp-interface` at runtime. Add `wp-interface` to the PHP `$dependencies` array in `MegaMenuEditor.php` so WordPress enqueues it. This aligns the bundled behavior with what core provides and eliminates both the private-apis crash and the duplicate store registration.
- **Suggested tests:** After fix, verify mega menu editor loads without console errors. Verify `adminMain.asset.php` no longer lists `wp-interface/build-style/style.css` as a dependency (should be just `wp-interface`).
- **Linear:** `not synced`
- **Fixed in:** Added `@wordpress/interface` to webpack `externals` in `webpack.config.js` so it uses WP core's runtime version instead of being bundled. Added `wp-interface` to PHP `$dependencies` in `MegaMenuEditor.php`. Verified: `@wordpress/ui` no longer appears in `adminMain.js` (0 occurrences post-build).

---

## Review Issues

_(Consolidated from individual ticket plans — all fixed unless noted)_

### Apply focus-visible ring to V2 NavigationMenuItem
- **Severity:** `minor`
- **Status:** `fixed`
- **Fixed in:** (2026-04-09) Changed `focus:outline-none focus:ring-2` to `focus-visible:outline-none focus-visible:ring-2` in `NavigationMenuItem.tsx`.

### Deferred: 4 Components Still Inline LinkTarget Union (THR-1443)
- **Severity:** `minor`
- **Status:** `deferred`
- **Problem:** Four components outside the mega menu still inline the `"_blank" | "_self"` union instead of using `LinkTarget`
- **Suggested fix:** Follow-up ticket to migrate remaining consumers

### #1620 (About Us): Hardcoded heading ID causes duplicate IDs
- **Severity:** `major`
- **Status:** `fixed`
- **File:** `frontend/components/mega-menu-about-us/MegaMenuAboutUs.tsx:18`
- **Problem:** `HEADING_ID = "mega-menu-about-us-heading"` is a module-level constant. If multiple About Us blocks appear on the same page (different panes), all instances share the same `id` and `aria-labelledby`, violating WCAG 4.1.1 (unique IDs). Other mega menu blocks (MegaMenuNavigationList, MegaMenuFeaturedLinks) derive heading IDs from the block's `id` prop.
- **Fixed in:** Added optional `id` prop to `MegaMenuAboutUsProps`, uses block `id` directly for heading `id` and `aria-labelledby` (no suffix, no fallback — BlocksRenderer always provides unique `id` via BaseBlockProps). Updated block wrapper to pass `id` through. Updated stories and tests.

### #1620 (About Us): Props type named BlockFrontendProps
- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `frontend/blocks/mega-menu-about-us/MegaMenuAboutUsBlock.tsx:8`
- **Problem:** Props type is named `BlockFrontendProps` — should be `MegaMenuAboutUsBlockProps` per code standards.
- **Fixed in:** Renamed to `MegaMenuAboutUsBlockProps`.

### #1620 (About Us): No unit tests
- **Severity:** `major`
- **Status:** `fixed`
- **File:** `frontend/components/mega-menu-about-us/__tests__/MegaMenuAboutUs.test.tsx`
- **Problem:** No unit tests exist for MegaMenuAboutUs component or MegaMenuAboutUsBlock. Stories have play functions but dedicated tests are expected for new components.
- **Fixed in:** Added 8 tests covering: heading rendering, paragraph rendering, derived heading ID from block id, omitted ID when no id prop, all 3 alignment classes, and unique IDs for multiple instances.

### #1620 (About Us): Empty editor.scss
- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `backend/plugins/gravity-platform-core/src/blocks/mega-menu-about-us/editor.scss`
- **Problem:** File is empty (0 bytes) but imported in edit.tsx. Dead file.
- **Fixed in:** Removed the import from edit.tsx.

### #1620 (About Us): Redundant second comment line in edit.tsx
- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `backend/plugins/gravity-platform-core/src/blocks/mega-menu-about-us/edit.tsx:86`
- **Problem:** `// These values are required.` restates what's already clear from the component type. The first comment line already explains the why (editor preview vanishes without fallback).
- **Fixed in:** Removed the redundant second comment line.

### #1620 (About Us): Value imports for type-only BlockEditProps and Element
- **Severity:** `minor`
- **Status:** `fixed`
- **Fixed in:** Both `BlockEditProps` and `Element` now use `import type` in edit.tsx (verified 2026-04-09).

### #1620 (About Us): isAlignment type guard defined inside component body
- **Severity:** `minor`
- **Status:** `fixed`
- **Fixed in:** `isAlignment` is now at module level (line 20) outside the `Edit` function (verified 2026-04-09).

### #1620 (About Us): Required Props fields with redundant destructuring defaults
- **Severity:** `minor`
- **Status:** `fixed`
- **Fixed in:** Props fields are required and destructuring no longer provides defaults (verified 2026-04-09).

### #1620 (About Us): Empty editor.scss not deleted
- **Severity:** `minor`
- **Status:** `fixed`
- **Fixed in:** (2026-04-09) `git rm` deleted the empty file.

### #1620 (About Us): Value import of type-only Element in save.tsx
- **Severity:** `minor`
- **Status:** `fixed`
- **Fixed in:** `Element` now uses `import type` in save.tsx (verified 2026-04-09).

### Orphaned trailing comment in BlocksRenderer.stories.tsx
- **Severity:** `minor`
- **Status:** `open`
- **File:** `frontend/blocks/BlocksRenderer.stories.tsx:419`
- **Problem:** `// Verify container has unique ID` is trailing on the `expect(childrenCount)` line. It describes the next code block (container ID checks), not the assertion it's attached to. Got orphaned when the `console.log` between them was removed.
- **Suggested fix:** Move to its own line above `const containerBlockId`.

---

## Acceptance Criteria

### Behavioral
- [ ] Navigate to the WordPress Mega Menu editor and add an "About Us" block inside a Mega Menu Column. Verify the block appears with default placeholder text for the headline and description.
- [ ] In the sidebar, update the Headline field. Verify the editor preview updates immediately.
- [ ] In the sidebar, update the Description field. Verify the editor preview updates immediately.
- [ ] Clear the Headline field completely. Verify the editor preview does not go blank — it falls back to the default "Headline.." placeholder.
- [ ] Clear the Description field completely. Verify the editor preview does not go blank — it falls back to the default "Description.." placeholder.
- [ ] Set Block Alignment to "Center". Verify content is centered in the editor preview and on the live frontend.
- [ ] Set Block Alignment to "Right". Verify content is right-aligned in the editor preview and on the live frontend.
- [ ] Set Block Alignment to "Left". Verify content is left-aligned in the editor preview and on the live frontend.
- [ ] Navigate to a live page with a Mega Menu that includes an About Us block. Verify the headline and description appear correctly.
- [ ] Add two About Us blocks in different panes of the same Mega Menu. Verify each renders its own content and the page has no duplicate element IDs.

### Non-behavioral
- [ ] On the frontend, the About Us section is labelled by its heading — confirm via browser dev tools that `aria-labelledby` on the `<section>` matches the `id` on the heading.

### AC Adjustments

### AC Sync Log

| Date | Agent | Action | Plan | Linear |
|------|-------|--------|------|--------|
| 2026-04-03 | Briar | Generated AC from implementation review | updated | synced |

---

## Cleanup Items

- `frontend/blocks/mega-menu-about-us/MegaMenuAboutUsBlock.tsx` — Prettier formatting fixed (2026-04-03)
- `frontend/components/mega-menu-about-us/MegaMenuAboutUs.stories.tsx` — Prettier formatting fixed (2026-04-03)
- `frontend/lib/constants/block-types.ts` — Prettier formatting fixed (2026-04-03)
- `frontend/lib/services/block/block-views.tsx` — Prettier formatting fixed (2026-04-03)
- `backend/plugins/gravity-platform-core/src/blocks/mega-menu-about-us/editor.scss` — deleted (2026-04-09)
- `frontend/blocks/mega-menu-navigation-list/MegaMenuNavigationListBlock.tsx` — deleted dead file (2026-04-09)
- `frontend/blocks/mega-menu-navigation-list/MegaMenuNavigationListBlock.view.tsx` — deleted unnecessary passthrough; `block-views.tsx` now imports component directly (2026-04-09)

---

## PR Readiness

All 16 PRs merged.

Cleanup PR #1734:
- [x] No critical or major issues
- [x] Types correct — no `any`, no unsafe `as`
- [x] No stray console.logs or debug artifacts
- [ ] 1 minor open: orphaned trailing comment in BlocksRenderer.stories.tsx:419
- [x] Build/types/Prettier/ESLint clean
- [x] Plan updated

**Last updated:** 2026-04-09
