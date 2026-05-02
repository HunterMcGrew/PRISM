# Frontend Hooks

Architect context for `frontend/hooks/`. Covers shared React hooks available to client components.

---

## Organization

9 hooks in `frontend/hooks/`, each in its own file:

| File | Purpose |
|------|---------|
| `use-contact-ctas.tsx` | Provides contact CTA data from context |
| `use-feature-flag.ts` | Reads feature flag values |
| `use-image-placeholder.ts` | Returns placeholder image for a given content type |
| `use-is-ios.ts` | Detects iOS device via user agent |
| `use-modal-state.ts` | Manages modal open/close state |
| `use-router.ts` | Wraps Next.js router with additional helpers |
| `use-search-client.ts` | Provides configured search client instance |
| `use-search-stats.ts` | Reads search statistics from context |
| `use-utm-params.ts` | Reads UTM parameters from the URL |

---

## Conventions

- All hooks require `"use client"` in consuming components
- Most are context-reading hooks — they consume a provider higher in the tree
- One hook per file, named `use-{concern}.ts` (or `.tsx` if JSX is involved)

---

## Distinction from Other Hook Locations

Hooks appear in three places in this codebase:

| Location | Scope | Notes |
|----------|-------|-------|
| `frontend/hooks/` | Shared across the app | This directory — general-purpose client hooks |
| `frontend/lib/utilities/use-*.ts` | Historical placement | `use-is-menu-overflowing.ts`, `use-viewport.ts` — exceptions to the "pure functions only" convention in utilities |
| `backend/.../src/utils/use-*.ts` | Editor-only | Hooks for the WordPress block editor, not shipped to visitors |

New shared hooks should go in `frontend/hooks/`. Editor-only hooks go in `backend/.../src/utils/`.
