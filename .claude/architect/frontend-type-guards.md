# Frontend Type Guards

Architect context for `frontend/lib/type-guards/`. Covers type guard conventions and their relationship to interfaces.

---

## Organization

Type guards live in `frontend/lib/type-guards/` with one file per entity.

Currently one file exists:

| File | Guards |
|------|--------|
| `link.ts` | `isLinkTarget()`, `isLinkObject()` |

Additional type-guard-like functions exist in `frontend/lib/utilities/type-guards.ts` for historical reasons.

---

## Pattern

Each file exports guard functions and re-exports types from `interfaces/`:

```typescript
import type { ILink } from "../interfaces/link";

// Re-exported from interfaces — defined there to avoid circular deps
export type { LinkTarget } from "../interfaces/link";

export const isLinkTarget = (v: unknown): v is LinkTarget =>
  v === "_self" || v === "_blank" || v === "_parent" || v === "_top";

export const isLinkObject = (v: unknown): v is ILink =>
  typeof v === "object" && v !== null && "href" in v && typeof (v as { href: unknown }).href === "string";
```

- `LinkTarget` is *defined* in `interfaces/link.ts` and *re-exported* from `type-guards/link.ts` for convenience
- Guard functions use TypeScript's `is T` return type for narrowing
- Input is `unknown` — guards validate at runtime trust boundaries
- Simple equality checks for literal union types
- Object shape checks for interface types

---

## Relationship to Interfaces

Types flow one way: `interfaces/` → `type-guards/` (import + re-export). This prevents circular dependencies:

```
interfaces/link.ts        →  defines ILink, LinkTarget, DragAndDropLink, LinkValue (types only)
utilities/link-utilities.ts →  pure helper functions (getLinkHref, setLinkTarget, etc.)
                               imports types from interfaces/link.ts
type-guards/link.ts       →  defines isLinkObject, isLinkTarget
                               imports ILink from interfaces/link.ts
                               re-exports LinkTarget from interfaces/link.ts
```

- Types live in `interfaces/`
- Helper functions live in `utilities/`
- Shape validators live in `type-guards/`

---

## When to Use

- **Runtime validation at trust boundaries** — user input, API responses, CMS data
- **Narrowing unknown values** before passing to typed functions
- **Not needed** for internal code where TypeScript already ensures the type

---

## Tests

Tests live in `frontend/lib/type-guards/__tests__/` and test:
- Valid inputs return `true`
- Invalid strings return `false`
- Non-matching types return `false`
- Edge cases: `null`, `undefined`, wrong primitive types
