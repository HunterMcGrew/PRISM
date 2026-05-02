# Backend Editor Utilities

Architect context for `backend/plugins/gravity-platform-core/src/utils/`. Covers editor-only hooks, helpers, and HOCs that support block development in the WordPress editor.

For coding rules see `.claude/rules/code-standards.md` and `.claude/rules/code-standards-ts.md`.
For server/client boundaries see `.claude/rules/headless-architecture.md`.

---

## Runtime Context

These files run inside the **WordPress block editor** (wp-admin), bundled by wp-scripts/webpack into `build/main.js`. They use WordPress APIs (`@wordpress/api-fetch`, `@wordpress/core-data`) and browser globals (`window`).

- **No `"use client"` directive** — wp-scripts is not processed by Next.js
- **`@frontend/` alias is available** — webpack resolves it to the frontend directory
- **WordPress data layer** — these hooks interact with WP's `@wordpress/data` stores and REST API

---

## File Catalog

| File | Type | Purpose |
|------|------|---------|
| `use-site-globals.ts` | Hook | Fetches site globals, caches on `window.siteGlobals` for cross-block sharing |
| `use-preview-props.ts` | Hook | Calls a block's `resolveProps` to generate preview data in the editor |
| `with-site-globals.ts` | HOC | **Deprecated** — injects `siteGlobals` prop into wrapped components. Use `usePreviewProps` instead. |
| `GravityFormSelect.tsx` | Component | React-select dropdown for Gravity Forms selection |
| `hook-use-gravity-form.ts` | Hook | Fetches GF forms via `@wordpress/api-fetch` (`/gf/v2/forms`) |
| `BlockAlignmentMatrixControl.tsx` | Component | Alignment matrix control wrapper |
| `IconSelect.tsx` | Component | Icon selection dropdown |
| `WithAppContext.tsx` | HOC | App context provider for editor |
| `config.ts` | Config | Typed reference to `window.wp` |
| `file-size-utils.ts` | Utility | File size formatting helpers |
| `migrate-utilities.ts` | Utility | Block migration helpers |
| `no-items-config-controls.tsx` | Component | Empty-state configuration UI |
| `no-items-config-utils.ts` | Utility | Helpers for no-items configuration |

~13 files total.

---

## Key Hooks

### `use-site-globals`

Fetches site globals (WPGraphQL endpoint, site URL, etc.) and caches them on `window.siteGlobals` so multiple blocks share one fetch. Used by `ControlledUrlInput` and passed to `ProductSelector`/`ProductCategorySelector`.

### `use-preview-props`

**The standard hook for editor data fetching.** Type-safe hook that calls a block's `resolveProps` function (from `resolver.props.ts`) with current attributes and site globals to generate preview data. Handles site globals resolution, error state, and attribute-change refetching automatically.

```typescript
const { previewProps, error, siteGlobals } = usePreviewProps(resolveProps, attributes);
```

All new editor `edit.tsx` files should use `usePreviewProps` for data fetching. The `withSiteGlobals` HOC is deprecated — it requires manual `useState`/`useEffect` fetch loops that `usePreviewProps` handles automatically.

### `hook-use-gravity-form`

Fetches available Gravity Forms via `@wordpress/api-fetch` calling `/gf/v2/forms`. Returns forms as react-select options. Used by `GravityFormSelect`.

---

## Conventions

- **Hooks use `use-` prefix** in filename (e.g., `use-site-globals.ts`). Legacy exception: `hook-use-gravity-form.ts` uses a `hook-use-` prefix — do not follow this pattern for new hooks
- **HOCs use `with-` prefix** in kebab-case filename (e.g., `with-site-globals.ts`). Legacy exception: `WithAppContext.tsx` uses PascalCase — do not follow this pattern for new HOCs
- **WordPress APIs preferred** — use `@wordpress/api-fetch` for REST calls, not raw `fetch()`
- **No ServiceFactory here** — data fetching in utils goes through WordPress REST or `resolveProps` pattern. Direct `ServiceFactory` usage is limited to `src/components/` (see `backend-editor-components.md`)

---

## Import Boundaries

### Can import

- `@frontend/lib/domain/`, `@frontend/lib/contracts/`, `@frontend/lib/utilities/`
- `@frontend/hooks/` — shared hook utilities
- `@frontend/lib/wp/functions/` — WordPress helper functions (e.g., `getSiteGlobals`)
- `@wordpress/*` — api-fetch, core-data, element, data

For full import boundary rules see `.claude/rules/headless-architecture.md`. Key constraints: no `next/*`, no `@apollo/client` directly, no `frontend/app/`.
