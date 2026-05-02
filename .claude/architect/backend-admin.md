# Backend Admin

Architect context for `backend/plugins/gravity-platform-core/src/admin/`. Covers small utility scripts that augment existing wp-admin pages.

For standalone editor applications see `backend-apps.md`.
For shared editor components (used by blocks) see `backend-editor-components.md`.

---

## What belongs here

Small, focused scripts that modify or enhance existing WordPress admin behavior. Each script is typically a single file that:
- Adds or constrains behavior on an existing wp-admin page
- Has no component tree or internal state management
- Runs automatically via side-effect import

**This is NOT for:**
- Standalone applications with their own component trees — those go in `src/apps/`
- Block editor components — those go in `src/blocks/`

---

## Directory Structure

```
src/admin/
├── index.tsx                                  # Entrypoint — imports all admin scripts + app bootstraps
├── extend-woocommerce-category-selector.ts    # Adds parent category display to WooCommerce selector
├── limit-product-image-gallery.ts             # Limits product image gallery count
└── number-field-scroll-behavior.ts            # Prevents number field scroll-to-change behavior
```

---

## Entrypoint

`index.tsx` is the webpack entry for all admin-side JavaScript. It imports:
1. The utility scripts in this directory (side-effect imports)
2. Bootstrap files for standalone apps in `src/apps/` (side-effect imports)

```tsx
import "./extend-woocommerce-category-selector";
import "./limit-product-image-gallery";
import "./number-field-scroll-behavior";
import "../apps/mega-menu-editor/bootstrap";
```

The PHP side enqueues this entry's built output on admin pages.

---

## When Adding a New Admin Script

1. Create a single `.ts` or `.tsx` file in `src/admin/`
2. Add a side-effect import in `src/admin/index.tsx`
3. If the script is large enough to need its own component tree, state management, or dedicated admin page — it belongs in `src/apps/`, not here
