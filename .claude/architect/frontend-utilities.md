# Frontend Utilities

Architect context for `frontend/lib/utilities/`. Covers conventions for pure utility functions.

---

## Organization

One file per concern in `frontend/lib/utilities/`:

| File | Purpose |
|------|---------|
| `image-utilities.ts` | Image dimension calculation, URL resolution, placeholders |
| `url-utilities.ts` | URL parsing, external URL detection, slug extraction |
| `string-utilities.ts` | String transforms (ucwords, camelCase to title, HTML stripping, trimming) |
| `format-date.ts` | Date formatting with i18n, month names, ordinal suffixes |
| `format-phone-number.ts` | Phone number formatting |
| `money-utilities.ts` | Currency formatting |
| `video-utilities.ts` | Video URL parsing, embed generation, third-party ID extraction |
| `block-attributes.ts` | `normalizeAttrs()` — handles WP sending `[]` for empty attrs |
| `block-spacing-utilities.ts` | Gap, padding, margin class generation from block style props |
| `cache-utilities.ts` | `getCacheKeyParts()` for `unstable_cache` key generation |
| `crypto-utilities.ts` | Hash/crypto helpers |
| `gallery-utilities.ts` | Gallery layout helpers |
| `location-utilities.ts` | Location/geo helpers |
| `offer-utilities.ts` | Offer-specific transforms |
| `object-utilities.ts` | Generic object helpers |
| `heading-level.ts` | Heading level utilities |
| `logging-utilities.ts` | Logging helpers |
| `fetch-utilities.ts` | Fetch wrapper utilities |
| `transform-refinements.ts` | Refinement/filter transforms |
| `jsx-utilities.ts` | JSX helper functions |
| `theme-styles-utilities.ts` | Theme style parsing |
| `link-utilities.ts` | Link helper functions (getLinkHref, setLinkTarget, ensureLinkObject, etc.) |
| `card-pointer-sensor.ts` | Card pointer sensor for drag interactions |
| `favicon-detect-type.tsx` | Favicon type detection |
| `get-categories-tree.ts` | Category tree builder |
| `global-attributes.tsx` | Global block attribute helpers |
| `handle-sharing.ts` | Social sharing utilities |
| `truncate-block-content.tsx` | Block content truncation |
| `type-guards.ts` | Entity type guards (`isCareer`, `isEvent`, `isProduct`, etc.) — `__typename` narrowing for GraphQL union types |
| `ucwords.ts` | Uppercase-first-letter-of-each-word transform |

~32 utility files total (plus `__tests__/` directory).

---

## Conventions

- **Pure functions only** — no side effects, no state, no component imports
- **One concern per file** — image utils in one file, string utils in another
- **Descriptive function names** — `resolveImageUrl`, `getPlaceholderImage`, `isImageUrl`
- **Type definitions in same file** when types are utility-specific (e.g., `PlaceholderType`)
- **Lookup objects for configuration** — map values to Tailwind classes or config strings
- **Dependencies limited to types** — utilities may import from `lib/domain/` and `lib/contracts/` but never from components or services

---

## Key Utilities

### normalizeAttrs (block-attributes.ts)

WordPress sends `[]` instead of `{}` when a block has no saved attributes. Use `normalizeAttrs()` when reading attrs outside `BlockService`:

```typescript
const childAttrs = normalizeAttrs(panelChild.attrs);
```

### getCacheKeyParts (cache-utilities.ts)

Generates deterministic cache key arrays for `unstable_cache`:

```typescript
unstable_cache(fn, getCacheKeyParts([BLOCK_TYPES.MY_BLOCK, ...values]), { tags, revalidate })
```

### Image utilities (image-utilities.ts)

- `calculateWidth()` / `calculateHeight()` — scale images preserving aspect ratio
- `resolveImageUrl()` — converts external URLs to relative paths
- `getPlaceholderImage()` — returns fallback image by content type
- `isImageUrl()` — tests file extension against known image types

---

## Hooks in utilities/

Two files in `utilities/` are actually React hooks (prefixed with `use-`):

- `use-is-menu-overflowing.ts`
- `use-viewport.ts`

These require `"use client"` in consuming components. They are exceptions to the "pure functions only" convention — placed here for historical reasons rather than in a dedicated `hooks/` directory.

---

## Tests

Tests live in `frontend/lib/utilities/__tests__/` mirroring the utility file structure. Some have subdirectories for functions with many test cases (e.g., `string-utilities/`, `url-utilities/`, `video-utilities/`).
