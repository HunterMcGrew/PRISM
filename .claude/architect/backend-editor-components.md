# Backend Editor Components

Architect context for `backend/plugins/gravity-platform-core/src/components/`. Covers shared editor-side React components that run inside the WordPress block editor.

For coding rules see `.claude/rules/code-standards.md` and `.claude/rules/code-standards-ts.md`.
For server/client boundaries see `.claude/rules/headless-architecture.md`.
For accessibility see `.claude/rules/accessibility.md`.

---

## Runtime Context

These files run inside the **WordPress block editor** (wp-admin), bundled by wp-scripts/webpack into `build/main.js`. Not the Next.js frontend.

- **No `"use client"` directive** — wp-scripts is not processed by Next.js. All code is client-side by definition
- **No Next.js APIs** — `next/dynamic`, route handlers, `unstable_cache` do not exist here
- **`@frontend/` alias is available** — webpack resolves it to the frontend directory
- **WordPress component library** — use `@wordpress/components`, `@wordpress/block-editor`, `@wordpress/element`

---

## Directory Structure

```
src/components/
├── CardRemoveButton.tsx         # Accessible remove button for sortable cards
├── ItemSelector.tsx             # Searchable dropdown for adding items
├── ProductSelector.tsx          # Async product search (uses ServiceFactory)
├── ProductCategorySelector.tsx  # Async category search (uses ServiceFactory)
├── ToolbarLink.tsx              # Inline link editor for BlockControls toolbar
├── editor-sidebar/              # InspectorControls (sidebar) components
│   ├── ColorSelectionButton.tsx
│   ├── ControlledUrlInput.tsx   # Standard URL input wrapper (normalizes URLs)
│   ├── IconSelectionGrid.tsx    # Generic icon picker grid
│   ├── LinkControl.tsx          # Full link editor (URL + target + rel)
│   ├── MediaSelector.tsx        # Image upload/selection with overlay controls
│   ├── ResponsiveRangeControl.tsx # Breakpoint-aware range slider
│   ├── ScheduleSettings.tsx     # Date range picker modal
│   ├── YouTubeVimeoUrlInput.tsx # Video URL input with validation
│   └── sortable-links-modal/    # Multi-link DnD editor
│       ├── SortableLinksModal.tsx
│       └── link-modal-parts.tsx
└── facets-filters/              # Typesense facet filter UI
    ├── FacetFilters.tsx
    ├── FacetFiltersCustomizer.tsx
    ├── FacetFiltersOptions.tsx
    └── FacetFiltersSelected.tsx
```

~19 component files. These are shared building blocks that `edit.tsx` files across the codebase import. A bad change here ripples across every consuming block.

---

## Component Catalog

**Reusable controls** — used by multiple blocks:

| Component            | Purpose                                                                                                                                       |
| -------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `CardRemoveButton`   | Accessible remove button with icon                                                                                                            |
| `ItemSelector`       | Searchable combobox for item selection                                                                                                        |
| `ToolbarLink`        | Toolbar popover for link editing — assembles `ILink` output per ADR-0019                                                                      |
| `ControlledUrlInput` | URL string input with normalization and suggestion filtering; wraps WP's `URLInput`. Consumed by `LinkControl` and `ToolbarLink` per ADR-0019 |
| `LinkControl`        | Full sidebar link editor (URL + target + rel + settings) — assembles `ILink` output per ADR-0019                                              |
| `MediaSelector`      | Image upload with overlay controls                                                                                                            |
| `SortableLinksModal` | Multi-link DnD editor modal                                                                                                                   |

To find consumers, grep for the component name across `src/blocks/` and `src/extend-*.tsx`.

**Domain-specific** — scoped to a feature area:

| Component                                     | Purpose                                    |
| --------------------------------------------- | ------------------------------------------ |
| `ProductSelector` / `ProductCategorySelector` | Async product/category search for showroom |
| `FacetFilters` family                         | Typesense-powered search refinement UI     |
| `ResponsiveRangeControl`                      | Breakpoint-aware value slider              |
| `ScheduleSettings`                            | Date range picker for scheduled content    |

---

## Patterns

**Handler encapsulation** — components accept callback props (`onChange`, `onRemove`, `onClose`). Internal state is limited to UI concerns (open/close, query text). Business logic belongs in the consuming `edit.tsx` handler, not here.

**Controlled components** — most components are controlled (value + onChange). Internal state is only for transient UI (popovers, search queries).

**Composition** — complex UI is split into subcomponents in subdirectories (e.g., `sortable-links-modal/` contains `SortableLinksModal` + `link-modal-parts`). The parent orchestrates; children own their rendering.

**Props typing** — each component defines a named `{ComponentName}Props` type. No inline prop types on function signatures. Never use generic names like `Props`, `BlockFrontendProps`, or `BlockAttributes` — use component-specific names for greppability, IDE clarity, and refactoring safety (e.g., `MediaSelectorProps`, `ControlledUrlInputProps`).

**`help` prop for field guidance** — `TextControl`, `TextareaControl`, `RangeControl`, `ToggleControl`, and most `@wordpress/components` form controls accept a `help` string prop. It renders as muted helper text below the field. Use it to communicate constraints (required, max length, format expectations) to content authors. Example: `help="Required. Max length: 75 characters."`. Prefer this over custom `<p>` elements for simple guidance — it's semantically tied to the control for accessibility.

**Character count display** — when a text field has a length limit, show a live character count below the field using a small muted paragraph:

```tsx
<TextareaControl
  label="Headline Text"
  value={value}
  onChange={handler}
  help="Description of the field."
  __nextHasNoMarginBottom={true}
/>
<p className="mb-3 text-xs text-gray-600">
  {value?.length ?? 0}/80 characters
</p>
```

The count sits outside the control (not inside `help`) so it updates reactively without conflicting with static help text. See `dealer-announcement-carousel/edit.tsx` for the reference implementation.

---

## Import Boundaries

### Can import

- `@frontend/lib/domain/`, `@frontend/lib/contracts/`, `@frontend/lib/utilities/`, `@frontend/lib/type-guards/`, `@frontend/lib/constants/`
- `@frontend/components/utility/` — generic React components (e.g., `SortableItems`)
- `@frontend/blocks/*/schema` — block attribute constants
- `@frontend/hooks/` — hooks and exported types
- `@wordpress/*` — all WordPress editor packages

For full import boundary rules see `.claude/rules/headless-architecture.md`. Key constraints: no `next/*`, no `@apollo/client` directly, no `frontend/app/`.

### ServiceFactory Exception

`ProductSelector` and `ProductCategorySelector` import `ServiceFactory` directly. This works because `ServiceFactory` creates an Apollo client that makes GraphQL requests from the browser to the WordPress backend — the same as any other API call. The service is instantiated at component render time (not module import time), so it only runs when the component mounts in wp-admin. This pattern should not be expanded without review — prefer `use-preview-props` or WordPress REST endpoints for new data-fetching needs.

---

## CSS Scoping

Editor styles must be scoped to prevent multi-instance conflicts and accidental suppression of WordPress admin UI.

- **Scope by `clientId`** — use `#${clientId}` selectors for block-instance-specific styles. Multiple instances of the same block on a page must not interfere with each other.
- **Never use global selectors** — selectors like `.notice.notice-info { display: none }` suppress WordPress admin security notices. Scope to the block's container: `.thrive-{block-name}-block-editor ~` or `#wpbody-content >`.
- **File naming** — editor-only styles go in `.editor.scss`. Remove `style.scss` if the block has no frontend styles.

---

## Data Passing

- **Pass `siteGlobals` directly** when the parent already has it (from `usePreviewProps` or `useSiteGlobals`). Do not pass `wpUrl` and have children call `getSiteGlobals(wpUrl)` separately — this causes redundant async fetches and race condition errors when `siteGlobals` hasn't resolved yet.

---

## Testing

Backend editor components do **not** have Storybook or Jest. These tools are frontend-only (`frontend/.storybook/`, `frontend/jest.config.ts`). The backend WordPress build (`wp-scripts`) has no Storybook integration and no Jest setup.

- **PHP behavior:** Test via Pest PHP unit tests in `tests/Unit/`. Mock WordPress functions with Brain\Monkey.
- **Editor UI components** (modals, selectors, sidebar controls): Tested indirectly through the `edit.tsx` integration they serve. If a component has complex standalone logic, extract it into a tested utility.
- **Visual regressions:** Not covered automatically for backend editor components. Manual QA in wp-admin is the verification path.

The Storybook story requirement in `code-standards.md` applies only to `frontend/` components and blocks.

---

## When Adding New Components

1. **Check for existing reusable components first** — `src/components/`, `frontend/components/utility/`, and `src/utils/`
2. **Scope appropriately** — if a component serves only one block, keep it in that block's directory. Move to `src/components/` only when a second block needs it. Components for standalone apps (`src/apps/`) stay in that app's `components/` directory.
3. **Follow the naming convention** — PascalCase files for components, kebab-case directories for feature groups
4. **Define a named Props type** — no inline prop types
5. **Keep handler logic in consumers** — components accept callbacks, they don't own business logic
6. **Import from `@frontend/lib/`** for types and utilities — don't duplicate definitions

### Grouping convention

- **Flat at root**: shared primitive controls used by 3+ blocks (CardRemoveButton, ItemSelector, ToolbarLink)
- **Feature subdirectory**: components belonging to one feature domain, used by 2+ blocks in that domain (editor-sidebar/, facets-filters/)
- **Not here**: components used by a single block stay in that block's directory. Components for standalone apps stay in that app's `components/` directory (e.g. `apps/mega-menu-editor/components/`). See `backend-apps.md`.
