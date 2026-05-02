# Backend Apps

Architect context for `backend/plugins/gravity-platform-core/src/apps/`. Covers standalone editor applications that run inside wp-admin as full React applications with their own component trees, state management, and API integration.

For coding rules see `.claude/rules/code-standards.md` and `.claude/rules/code-standards-ts.md`.
For shared editor components (used by blocks) see `backend-editor-components.md`.
For small admin utility scripts see `backend-admin.md`.

---

## What belongs here

Standalone applications that:

- Have their own React component tree (not a single block `edit.tsx`)
- Manage their own state (multiple `useState`/`useCallback` hooks, entity records, API calls)
- Render on a dedicated wp-admin page (not inside the block editor canvas)
- Were designed as independent features that could have been plugins

**This is NOT for:**

- Block editor components — those go in `src/blocks/`
- Shared controls used across blocks — those go in `src/components/`
- Small behavioral scripts that augment existing wp-admin pages — those go in `src/admin/`

---

## How it differs from other `src/` directories

| Directory         | Purpose                                        | Scale                                        |
| ----------------- | ---------------------------------------------- | -------------------------------------------- |
| `src/apps/`       | Standalone editor applications                 | Full React app with component tree           |
| `src/admin/`      | Small utility scripts for wp-admin pages       | Single-file behavioral tweaks                |
| `src/blocks/`     | WordPress block registrations                  | Block registration + `edit.tsx` + `save.tsx` |
| `src/components/` | Shared editor controls used by multiple blocks | Individual reusable components               |

---

## Runtime Context

Same as `backend-editor-components.md` — these files run inside **WordPress wp-admin**, bundled by wp-scripts/webpack. Not the Next.js frontend.

- No `"use client"` directive — wp-scripts is not processed by Next.js
- No Next.js APIs — `next/dynamic`, route handlers, `unstable_cache` do not exist here
- `@frontend/` alias is available — webpack resolves it to the frontend directory
- WordPress component library — use `@wordpress/components`, `@wordpress/block-editor`, `@wordpress/element`

---

## Cross-registry `useSelect` — store reference, not store name

Apps under `src/apps/` run inside a standalone `@wordpress/data` registry, separate from the default registry the post editor uses. Module-level `select("storeName")` with a string binds to the **default** registry; `useSelect`'s subscription wires to the **active** registry. The two cross — the read target lives in one registry, the subscription in another — and the component never re-renders when the fetch lands.

**Why:** THR-1614's promotions-block bug. `useSelect((select) => select("core").getEntityRecords(...))` returned `null` forever because the fetch resolved into the default registry while `useSelect` subscribed to the mega menu editor's registry. Visible symptom: the "More" button never appeared after locations loaded.

**How to apply:** Import the store reference and pass it into `useSelect`'s parameterized `select`. The reference resolves against whichever registry the component is mounted inside, so subscription and read align.

```tsx
import { store as coreStore } from "@wordpress/core-data";
import { useSelect } from "@wordpress/data";

const posts = useSelect(
	(select) =>
		select(coreStore).getEntityRecords("postType", "locations", {
			per_page: -1,
		}),
	[]
);
```

This pattern works in both the default registry (regular post editor) and any standalone registry (mega menu editor today, future standalone apps under `src/apps/`). Always use it; never use module-level `select("name")`.

Block builders see the same rule from a block-side angle in `.claude/architect/backend-editor-blocks.md` § Store access — use the imported store reference with parameterized `select`.

---

## Expected Internal Structure

Each app follows this structure:

```
src/apps/<app-name>/
├── bootstrap.tsx          # Entrypoint — domReady, createRoot, renders the app
├── editor.tsx             # Root React component — state, handlers, layout
├── styles.scss            # Root styles
├── _variables.scss        # SCSS variables (optional)
└── components/            # Feature-specific components
    ├── <feature>/
    │   ├── FeatureName.tsx
    │   ├── SubComponent.tsx
    │   └── styles.scss
    └── ...
```

### Naming conventions

- **Entrypoint**: `bootstrap.tsx` — the webpack entry that calls `domReady` and `createRoot`
- **Component files**: PascalCase — `Header.tsx`, `BlockEditor.tsx`, `RevisionsDropdown.tsx`
- **Directories**: kebab-case for feature groups — `block-editor/`, `left-sidebar/`
- **Styles**: `styles.scss` colocated with the component they style
- **No `index.tsx` for components** — `index.tsx` is reserved for block registration entrypoints and true barrel files. Component files are named for what they are.

---

## Current Apps

| App                | Purpose                                            | Admin page                                                   |
| ------------------ | -------------------------------------------------- | ------------------------------------------------------------ |
| `mega-menu-editor` | Full Gutenberg-based editor for the site mega menu | Mega Menu Editor (`thrive-mega-menu-block-editor` container) |

---

## Import Boundaries

### Can import

- `src/utils/` — shared utilities (`config.ts`, `use-site-globals.ts`)
- `src/types/` — shared TypeScript type definitions
- `src/components/` — shared editor controls (same wp-admin runtime, same purpose as block editors)
- `@frontend/lib/domain/`, `@frontend/lib/contracts/`, `@frontend/lib/utilities/`, `@frontend/lib/type-guards/`, `@frontend/lib/constants/`
- `@frontend/components/utility/` — generic React components
- `@wordpress/*` — all WordPress editor packages

### Should NOT import

- `src/blocks/` — block registration is a separate concern

---

## Webpack Entry

Apps are imported through `src/admin/index.tsx` (the admin webpack entry). The admin entrypoint imports the app's `bootstrap.tsx`, which guards against the container element not existing:

```tsx
// admin/index.tsx
import "../apps/mega-menu-editor/bootstrap";
```

```tsx
// apps/mega-menu-editor/bootstrap.tsx
domReady(function () {
	const container = document.getElementById("thrive-mega-menu-block-editor");
	if (!container) return;
	// ...render the app
});
```

This means the app code is bundled into the admin entry but only activates on its dedicated admin page. A future optimization would be to give each app its own webpack entry so the PHP side can enqueue it only where needed.

---

## When Adding a New App

1. Create `src/apps/<app-name>/` with the structure above
2. Add the bootstrap import to `src/admin/index.tsx`
3. Create the PHP-side admin page that renders the container element
4. Register the app's allowed blocks (if it uses `BlockEditorProvider`)
5. **Unregister any globally-registered block variations that don't apply in this app's context.** Global `registerBlockVariation` calls from the theme or other plugins affect every editor that uses `BlockEditorProvider` — including standalone apps. The `allowedBlockTypes` setting filters block types but not variations. Scope variation cleanup inside the app's `bootstrap.tsx`, immediately after `registerCoreBlocks()`. Example: `mega-menu-editor` unregisters `core/paragraph`/`stretchy-paragraph` and `core/heading`/`stretchy-heading` so they don't appear in the inserter.
6. Follow the same component conventions: PascalCase files, kebab-case directories, feature-scoped components
