---
description: Server/client/editor runtime boundaries for headless WordPress + Next.js
paths:
  - frontend/**
  - backend/**
---

# Headless Architecture — Server/Client/Editor Boundaries

This project is a headless WordPress + Next.js setup with three distinct runtime environments. Understanding the boundaries between them is critical for every code change.

## The Three Runtimes

### 1. Next.js Server (RSC / Route Handlers / Server Actions)

- Runs on the Node.js server during page render and API requests
- Has access to `process.env`, `ServiceFactory`, Apollo/GraphQL, `fetchSiteGlobals`
- Files marked `"server-only"` or using `unstable_cache` / React `cache` live here
- Resolvers (`resolver.ts`, `resolver.props.ts`) execute here

### 2. Next.js Client (Browser)

- JavaScript shipped to the visitor's browser
- Files with `"use client"` and everything in their import tree end up here
- **Must not import** `ServiceFactory`, `getClient`, or anything from `@apollo/client` — these pull the entire Apollo runtime into the browser bundle
- When client components need server data at runtime (user-initiated fetches), use **route handlers** (`/api/...`) — the client calls `fetch()`, the server uses Apollo

### 3. WordPress Block Editor (wp-admin)

- Runs inside the WordPress admin iframe, bundled by `wp-scripts`
- Lives in `backend/plugins/gravity-platform-core/src/blocks/`
- Has its own webpack build with `@frontend/` alias pointing to the frontend directory
- **Cannot use** `next/dynamic`, Next.js route handlers, or any Next.js runtime API
- **Can import** frontend components via `@frontend/...` — these get pulled into the editor bundle, not the visitor bundle
- Can call Apollo/ServiceFactory through `resolver.props.ts` (runs at build/preview time via `withSiteGlobals`)

## RSC-First Design

All new code must be written with an RSC-first mindset to take full advantage of Next.js and minimize JS bundle size. If client JS is necessary, it should be as thin as possible and deferred where feasible.

The decision-shaped form of this rule lives in [ADR-0026 — RSC by Default; `"use client"` is Load-Bearing](../spec/adrs/0026-rsc-by-default-use-client-is-load-bearing.md). [ADR-0025](../spec/adrs/0025-use-client-constants-leak-as-proxies-in-rsc.md) is a specific corollary (constants exported from `"use client"` files leak as proxies into RSC).

### Start on the server, push interactivity to the leaves

Build the component tree as RSC. When you hit something that needs a hook, browser API, or event handler, extract **only that piece** into a small `"use client"` leaf component. The parent stays RSC.

**Pattern (CallToActions):**

```
CallToActions (RSC) — layout, CTA resolution, link rendering
├── CTA (RSC) — link-type CTAs, zero JS
├── FormCTAButton ("use client") — just the click handler + modal open
├── CallCTAButton ("use client") — just the click handler
└── PrintCTAButton ("use client") — just window.print()
```

### Fetch data on the server, pass it down

Prefer server-side data fetching over client-side fetching. This eliminates client waterfalls and keeps data-fetching libraries out of the browser bundle. Pass the fetched data as serializable props to client components that need it.

**Do:** Fetch forms server-side via `fetchFormsForCTAs()`, pass `formsById` as a prop.
**Don't:** Use a client-side hook like `useGetGravityForm` that fetches via `/api/form` on mount.

### Never pass non-serializable values across the server→client boundary

Props passed from RSC to `"use client"` components must be JSON-serializable. Functions, component references (`IconType`, `React.FC`), class instances, and symbols **cannot** cross the boundary — they will either error or silently disappear at runtime.

Common pitfall: resolving an icon component in server code and passing it as a prop to a client component.

**Do:** Import the icon directly inside the client component when the value is fixed per component.
**Don't:** Pass `icon: FaList` from an RSC parent to a `"use client"` child.

If the value varies, pass a serializable key (string/enum) and map it to the real value inside the client component.

### Reuse existing shared infrastructure

Before creating new client-side state management (context providers, modals, portals), check if existing infrastructure already handles it. Examples:

- `AppContext.openModal()` + `SharedModals` — shared form/call modals
- `AppContext` — site-wide state already available to all client components

## Key Rules

### Never import server-only modules from `"use client"` files

The bundler follows the full import tree. If a `"use client"` file imports `ServiceFactory`, which imports `getClient`, which imports `@apollo/client` — all of Apollo ships to the browser. This applies to indirect imports too.

### Use route handlers for client-initiated server data

When a client component needs to fetch data in response to user interaction (not known at render time), create a route handler in `frontend/app/api/`. The handler uses `ServiceFactory` server-side; the client calls `fetch()`. Examples: `/api/form`, `/api/equipment/[id]`.

### Supplementary fetchers must be cached

Any module under `frontend/single-templates/*/fetchers.ts` (or any fetcher that calls `ServiceFactory` outside of `resolver.ts` / `resolver.props.ts`) must wrap its read in `cache(unstable_cache(...))`. The Apollo client used by `ServiceFactory` runs with `fetchPolicy: "no-cache"` — without the Next layer, every render hits WordPress cold.

**Why:** THR-1778 — promotion detail pages rendered in 4-6 seconds because `fetchRelatedPromotionsCards` was the only single-template supplementary fetcher missing the wrapper. Equipment, rental, and CTA fetchers had it; promotion was retrofitted late and missed. The cost was invisible on staging (single-promo categories) and only surfaced on dealer sites with sibling promotions. The pattern was imitable code in equipment, not a written rule, so the next bug-shape will land somewhere else.

**How to apply:**

- The canonical pattern lives in `frontend/single-templates/single-equipment/fetchers.ts` — `cache(unstable_cache(fn, [key, CONTENT_TYPE, CACHE_VERSION], { tags, revalidate }))`. Match it.
- Cache keys use the entity / category id that uniquely scopes the read, plus the relevant `CONTENT_TYPES.*` constant and `CACHE_VERSION`. Use the matching content-type tag so on-demand revalidation continues to work.
- Per-render filters that depend on the _current_ item (excluding self from a sibling list, applying activity windows that can flip mid-cache-window) live **outside** the cache. Two callers in the same category share one round-trip; each filters its own self. Don't push these inside the cache for "performance" — that breaks correctness.
- Fetchers that already route through a service whose internal helper wraps `unstable_cache` (e.g. `CallToActionService.getCTALists`) don't need a second wrapper.

### Follow the Promotions block pattern for editor-only UI

When a block has interactive UI that only appears in the WordPress editor (selectors, drag-and-drop, sortable lists):

1. **Shared block component** (e.g. `PromotionsBlock.tsx`, `ShowroomBlock.tsx`) — RSC, no hooks, accepts `isEditor` + `children`. Renders visitor content normally, or `children` when in editor mode.
2. **Reuse existing editor components** — before creating anything new, use what's already there:
   - `SortableItems` (`frontend/components/utility/SortableItems.tsx`) — generic DnD sortable container with render function. Used by Promotions, Locations, Employees, Careers, Kronos, Showroom.
   - `ItemSelector` (`backend/.../components/ItemSelector.tsx`) — searchable dropdown for adding items.
   - `CardRemoveButton` (`backend/.../components/CardRemoveButton.tsx`) — accessible remove button for sortable cards.
3. **Backend `edit.tsx`** — Lives in backend plugin. Imports the shared block component and reusable editor components. Passes all interactive UI as `children`. Never ships to visitors.

This pattern keeps editor-heavy dependencies (DnD, Apollo via selectors) out of the visitor bundle entirely.

### Components using hooks need `"use client"`

If a component uses `useState`, `useEffect`, `useContext`, `useSortable`, or any React hook, it must have the `"use client"` directive. Even if it currently works without it (because a parent has `"use client"`), the directive is required for correctness — removing the parent's directive would silently break it.

## `next/dynamic` code splitting requires `"use client"`

`next/dynamic()` only performs automatic code splitting when called from a `"use client"` module. When called from a Server Component module, webpack eagerly includes all referenced chunks in every page's HTML manifest — `dynamic()` is treated as a regular `import()` with no lazy boundary.

This is why block views live in `block-views.tsx` (`"use client"`): `block-registry.ts` (server) imports those wrappers so `dynamic()` splits correctly. Route templates in `template-registry.tsx` **static-import** server templates (e.g. `Product`). Do not wrap an async product template in a client-only `dynamic()` shell — it becomes a Client Component and breaks async RSC. Use a thin client provider inside the template (e.g. `ProductTemplateProvider` in `Product.tsx`) and, if bundle work needs it, `next/dynamic` for specific heavy **child** client components from that server module.

**Pattern:**

```
block-views.tsx ("use client") ── dynamic(() => import("./Block")) ── code-split ✓
block-registry.ts (server)     ── dynamic(() => import("./Block")) ── NOT split ✗
```

Similarly, `ssr: false` only works inside `"use client"` modules. If you need to skip SSR for a heavy component rendered from an RSC page, create a thin `"use client"` wrapper that owns the `dynamic({ ssr: false })` call (see `KronosSearchFallback.tsx`).

`dynamic()` must be called at module top-level (like `React.lazy`), not inside render functions, loops, or factory functions. The `import()` path must be an explicit string literal — not a template string or variable. Next.js needs both constraints to statically match webpack bundles to `dynamic()` calls for preloading.

### Hydration consequence: useId shifts after dynamic chunks land

`next/dynamic` renders `null` during hydration while the chunk loads, then swaps in the real component. That swap shifts the React tree, so every `useId()` call after the dynamic boundary produces different IDs on server vs client. Headless UI's `Popover` and `Disclosure` use `useId()`; several in-house components do too. The mismatch triggers React hydration recovery, which destroys and re-renders the affected `Suspense` boundary's content — visible as a flash, lost focus, or briefly-disappearing UI.

**Why:** THR-1577 spent multi-pass debugging chasing a "header disappears when mega menu opens" symptom that turned out to be this. Without the rule documented at the `next/dynamic` site, the next person reads the existing `next/dynamic` rule, follows it correctly, and still hits the bug.

**How to apply:** Wrap the consumer of `useId` in its own `<Suspense>` boundary so hydration recovery is contained — don't let it bubble up to a parent that owns sibling content. `React.lazy()` would avoid the issue entirely but is incompatible with the Next.js App Router (`React.lazy()` resolves to `[object Object]` at runtime in RSC module serialization), so `next/dynamic` stays the only viable code-splitting mechanism — accept the constraint, isolate the blast radius. Component identity also doesn't survive `next/dynamic`, so use stable string props if you need to discriminate (`c.type === Foo` checks against the dynamic wrapper, not the underlying component — see THR-1526).

## Import Direction

```
backend edit.tsx ──imports──▶ frontend shared component (RSC)
backend edit.tsx ──imports──▶ frontend editor-only components ("use client")
backend edit.tsx ──imports──▶ frontend utility components

frontend RSC ──imports──▶ frontend RSC (ok)
frontend RSC ──imports──▶ frontend "use client" component (ok — client boundary)
frontend "use client" ──imports──▶ frontend "use client" (ok)

frontend "use client" ──banned──▶ ServiceFactory / getClient / @apollo/client
frontend RSC ──banned──▶ backend/ (wrong direction)
frontend (any) ──banned──▶ @wordpress/* (backend edit.tsx imports @wordpress/*; frontend never does)
```

## Contracts at Runtime Boundaries

WordPress and our frontend are separate worlds that happen to exchange data. WP emits vocabularies (toolbar outputs, alignment enums), shapes (block attributes, spacing objects), and entity data (posts, media, events); our frontend consumes all of it. Every one of those is a **contract** that crosses a runtime boundary — and contracts need explicit handling.

The rules below codify that handling. This section is the conceptual framing; the specific rules are in `code-standards-ts.md` and `frontend-constants.md`.

### What WP owns

| Contract kind                | Examples                                                                                                   | Where WP ships a TS type                               |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| Block attribute vocabularies | `BlockAlignmentToolbar` values (`left`/`center`/`right`/`wide`/`full`), vertical alignment, text alignment | No — `@wordpress/block-editor` is mostly JS-sourced    |
| Block attribute shapes       | `BlockStyle`, spacing presets, border objects                                                              | Partial — some shapes in `@wordpress/blocks`, many not |
| Editor data entities         | `WPPost`, `WPMedia`, `WPEvent` returned by `@wordpress/data` selectors                                     | No — returns implicit `any`, must be cast              |
| Block registration metadata  | `attributes`, `supports`, `context` schemas                                                                | Yes — `@wordpress/blocks` types these                  |
| Editor component props       | `BlockEditProps`, `BlockSaveProps`                                                                         | Yes                                                    |

**Import direction matters.** The editor side (`backend/plugins/.../src/`) imports `@wordpress/*` types directly — that's the convention for `BlockEditProps`, `BlockSaveProps`, etc. The frontend side (`frontend/`) cannot import `@wordpress/*` at all; imports only flow backend→frontend in this repo. Frontend contracts must always be mirrored as named types in `frontend/lib/constants/`, `frontend/lib/contracts/`, or `frontend/lib/domain/` (per the split documented in `data-layer.md`), regardless of whether WP ships a TS type for them. See `code-standards-ts.md` § Modeling external contracts for the rule and `code-standards-ts.md` § WordPress Editor Data for the cast-return conventions for `@wordpress/data` selectors.

### Where contract types and adapters live

```
Contract types             → frontend/lib/constants/     (BlockToolbarAlignment, etc.)
                           → frontend/lib/contracts/     (application contracts, runtime context)
                           → frontend/lib/domain/        (entity shapes — I-prefixed)
Cross-block primitives     → frontend/lib/constants/theme.ts
                             (reusable axis / alignment mappings —
                              MAIN_AXIS_ALIGN_MAPPINGS, BLOCK_ALIGNMENT_MAPPINGS)
Block-local mappings       → frontend/blocks/<block>/alignment-classes.ts
                             (values encode block-specific breakpoints, overrides,
                              or vocab closure — VERTICAL_ALIGNMENT_STACKED_CLASSES)
Shared adapters (rule-of-3)→ frontend/lib/utilities/block-*-utilities.ts
                             (block-spacing-utilities, block-attributes)
DTO → domain mappers       → frontend/lib/services/      (dtoTo*() methods on services)
WP entity types            → backend/.../src/types/      (editor — wp-admin consumption)
                           → frontend/lib/domain/        (frontend — resolver consumption)
```

An **adapter** takes WP vocabulary or shape and produces domain vocabulary or class strings. It can live in two places depending on how many consumers need it:

- **Inside a local mapping** (preferred when there's one container pattern) — the mapping is keyed by the source vocab and emits the full class string, baking in any container-specific overrides. Location depends on whether the mapping's **values** are reusable: cross-block primitives (any block can index correctly) live in `theme.ts`; block-local mappings (values assume block-specific breakpoints, overrides, or children) live in the block folder. Example: `VERTICAL_ALIGNMENT_STACKED_CLASSES` is block-local — it lives at `frontend/blocks/columns/alignment-classes.ts` because its values bake in the `max-md:` / `md:` breakpoint tied to Columns' stack-on-mobile flow.
- **In a `block-*-utilities.ts` helper** (reserve for rule-of-three) — extracted only when three or more consumers need the same translation composed with different downstream mappings. Examples today: `getGapClass` / `getPaddingClasses` (WP `BlockStyle` → Tailwind classes), `normalizeAttrs` (WP's `[]`-for-empty-object quirk → plain object).

See `frontend-constants.md` § Source-vocab translation for the decision rules between these two shapes.

### Direction of dependency

Contract types are upstream — the mapping, adapter, and every consumer depend on them. Never the reverse.

```
BlockToolbarAlignment (contract — frontend/lib/constants/theme.ts)
        ▲
        │ satisfies
block-local mapping (e.g. frontend/blocks/<block>/alignment-classes.ts)
        ▲
        │ value lookup
downstream consumers (ColumnBlock, carousel-item, etc.)
```

If you find a utility owning a type that a constant depends on, the dependency flow is inverted — fix it by moving the type to the constants file. See `frontend-constants.md` § Source-vocab translation for the applied pattern.

### Why adapters exist

So downstream code doesn't carry WP vocabulary into business logic. `ColumnsBlock` shouldn't know that `wide` and `full` are WP's way of signalling "stretch" — it should see an axis key. The adapter IS the boundary; crossing it means translating. Business logic stays clean, WP quirks stay localized, and when WP's vocabulary changes, only the adapter updates.
