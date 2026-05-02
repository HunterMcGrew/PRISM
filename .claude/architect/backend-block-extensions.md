# Backend Block Extensions

Architect context for `backend/plugins/gravity-platform-core/src/extend-*.tsx`. Covers core WordPress block extensions that add custom attributes and editor controls to built-in blocks.

For coding rules see `.claude/rules/code-standards.md` and `.claude/rules/code-standards-ts.md`.
For server/client boundaries see `.claude/rules/headless-architecture.md`.

---

## Runtime Context

These files run inside the **WordPress block editor** (wp-admin), bundled by wp-scripts/webpack into `build/main.js`. They are imported from `src/blocks/index.tsx` alongside block registrations.

- **No `"use client"` directive** — wp-scripts is not processed by Next.js
- **`@frontend/` alias is available** — webpack resolves it to the frontend directory
- **WordPress hook API** — extensions use `addFilter` from `@wordpress/hooks` and `createHigherOrderComponent` from `@wordpress/compose`

---

## Extension Catalog

| File | Extends | Adds |
|------|---------|------|
| `extend-button-block.tsx` | `core/button` | Action type (form/content modal), form/modal ID selection |
| `extend-buttons-block.tsx` | `core/buttons` | Default bottom margin |
| `extend-column-block.tsx` | `core/column` | Horizontal alignment toolbar control |
| `extend-global-attributes.tsx` | `core/image`, `core/group` | Mobile/tablet/desktop visibility toggles |
| `extend-group-block.tsx` | `core/group` | Mobile stacking and responsive column controls |
| `extend-site-logo-block.tsx` | `core/site-logo` | Border radius options |
| `extend-social-links-block.tsx` | `core/social-link` | eBay variation via `registerBlockVariation` |
| `extend-video-block.tsx` | `core/video` | Link control via `ToolbarLink` |

---

## Extension Patterns

### addFilter + HOC (most extensions)

Most extensions follow this structure:

1. **Filter attributes** — `addFilter('blocks.registerBlockType', ...)` adds custom attributes to the block's attribute schema
2. **HOC for editor controls** — `createHigherOrderComponent` wraps `BlockEdit` to inject `InspectorControls` or `BlockControls`
3. **HOC for save wrapper** (optional) — adds className or wrapper markup for the save function
4. **Block-name guard** — each HOC checks `props.name` early and returns the original component unchanged for non-matching blocks

```typescript
const withCustomControls = createHigherOrderComponent((BlockEdit) => {
    return (props) => {
        if (props.name !== "core/target-block") return <BlockEdit {...props} />;
        // ... custom controls
    };
}, "withCustomControls");

addFilter("editor.BlockEdit", "namespace/feature", withCustomControls);
```

**Variation:** `extend-column-block.tsx` uses an inline HOC factory instead of `createHigherOrderComponent` — same intent, different API surface.

### registerBlockVariation (extend-social-links-block)

`extend-social-links-block.tsx` does not use addFilter/HOC. It registers a block variation directly:

```typescript
registerBlockVariation("core/social-link", {
    name: "ebay",
    title: "eBay",
    icon: /* ... */,
    attributes: { service: "ebay" },
});
```

This is the correct API when adding a new instance of an existing block rather than modifying the block's editor controls.

---

## Import Boundaries

### Can import

- `@frontend/lib/domain/`, `@frontend/lib/contracts/`, `@frontend/lib/utilities/`, `@frontend/lib/type-guards/`, `@frontend/lib/constants/`
- `@frontend/hooks/` — exported types and constants (e.g., `MODAL_TYPES`)
- `@wordpress/*` — hooks, compose, block-editor, components, element, i18n, icons
- `src/components/` — shared editor components (e.g., `ToolbarLink`)
- `src/utils/` — editor utilities (e.g., `GravityFormSelect`)

For full import boundary rules see `.claude/rules/headless-architecture.md`. Key constraints: no `next/*`, no `@apollo/client` directly, no `frontend/app/`.

---

## When Adding a New Extension

1. **Prefer one file per core block** — name it `extend-{block-name}-block.tsx`. When extending multiple blocks with the same attributes, name by purpose instead (e.g., `extend-global-attributes.tsx` targets both `core/image` and `core/group`)
2. **Follow the addFilter/HOC pattern for editor controls** — or `registerBlockVariation` when adding a new variation of an existing block
3. **Import from `src/blocks/index.tsx`** — add the import at the bottom with the other `extend-*` imports
4. **Keep it focused** — each extension adds one cohesive set of controls. If a core block needs multiple unrelated extensions, use separate files
5. **Sync with frontend** — custom attributes added here must be consumed by the frontend block view or resolver. Note the sync requirement in a code comment (see `extend-global-attributes.tsx` for example)
