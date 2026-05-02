# Routing and Page Resolution

Architect context for the catch-all routing pipeline and the single-template pattern. Loaded for `frontend/app/[...slug]/`, `frontend/single-templates/`, and the redirects route handler.

This file covers how a URL becomes a page — the pipeline from catch-all to rendered block tree. For broader Next.js App Router structure (route handlers, sitemaps, robots), see `.claude/architect/frontend-app.md`. For caching of route-side fetches, see `.claude/architect/caching-and-revalidation.md`.

For the human-readable narrative, see `docs/content/dev/architecture/routing-and-page-resolution.md`.

---

## The Page-Resolution Pipeline

Every CMS-managed page resolves through the same chain. Concrete walkthrough using an Offer URL:

1. **Request** — `/offers/labor-day-special` arrives at the Next.js server.
2. **Catch-all match** — the URL falls through to `frontend/app/[...slug]/page.tsx`. The slug array is `["offers", "labor-day-special"]`.
3. **Site globals** — `fetchSiteGlobals()` resolves the per-tenant configuration. Build-phase fallback handles the case where site data isn't yet available.
4. **Content resolution** — `fetchRouteData(slug, site)` calls a `node-by-uri` GraphQL query against WordPress and returns `{ content, seo, blocks, redirectUrl }`. The `content` carries `__typename` (e.g. `"Offer"`) plus the entity payload.
5. **Redirect short-circuit** — if `redirectUrl` is set, the page redirects before rendering. Used for legacy URL handling.
6. **Template resolution** — content type maps to a single-template component via the template registry (`TemplateService`). `__typename: "Offer"` resolves to `single-templates/Offer.tsx`.
7. **Template render** — the template receives `{ item, site, urlPath }`, fetches supplementary data (CTAs, forms, related items) via `ServiceFactory`, and composes the page.
8. **Metadata** — `generateMetadata` calls `getRouteMeta(content, seo, site)` from `app/meta.ts`. Runs in parallel with the page render.
9. **Block tree** — for content types that carry blocks (Pages, Posts), the template hydrates the block tree from `blocks` and each block resolver fetches its block-owned data.

The pipeline never branches by content type until step 6. Everything before that is uniform — slug → site → content. Everything after is type-specific composition.

---

## The Single-Template Pattern

One component per content type lives in `frontend/single-templates/`. The current set: Career, Equipment, Event, GroupProduct, Location, Offer, Page, Post, Product, Promotion, Rental.

**Why one component per type, not a generic page renderer:** content types compose differently. An Offer page wraps eligible equipment cards, expiration handling, and offer-specific CTAs. A Career page is a job listing with apply CTAs. A Product page composes media galleries with spec tables. The shape is content-type-specific by intent — a generic renderer would either be too narrow (forcing every type into the same shape) or too wide (a config DSL replacing the component, with all the cost that implies). One component per type keeps each type's composition local and type-safe.

**Per-template fetcher folders.** Templates that need supplementary data (related items, CTAs, sibling cards, content-type-specific lookups) live alongside a per-template folder: `single-templates/single-offer/`, `single-templates/single-equipment/`, etc. The folder holds the fetcher modules and any template-only sub-components.

**Fetcher pattern.** Supplementary fetchers wrap reads in `cache(unstable_cache(...))` — the canonical example is `single-templates/single-equipment/fetchers.ts`. See `.claude/rules/headless-architecture.md` § Supplementary fetchers must be cached and `.claude/architect/caching-and-revalidation.md` for the layering.

---

## Where Data Fetches Live

Three places, mirroring the caching tiers. Each tier has its own ownership rule.

| Tier                          | Owner            | What it fetches                                   |
| ----------------------------- | ---------------- | ------------------------------------------------- |
| **Block resolvers**           | The block        | Block-owned data (the data the block renders)     |
| **Supplementary fetchers**    | The route        | Supplementary data the template composes around the main content |
| **Route handlers**            | The client       | Client-initiated runtime fetches                  |

Block resolvers run during page render. Single-template fetchers run during template composition. Route handlers run when the client calls `fetch("/api/...")`. The boundaries matter — fetching block-owned data in a single-template fetcher couples the template to a block; fetching supplementary data in a block resolver couples the block to a route. Cross-link `.claude/architect/caching-and-revalidation.md` for the cache primitives at each tier.

---

## Metadata Composition

`app/meta.ts` exports `getRouteMeta(content, seo, site)`, which maps the content + SEO fields onto Next.js's `Metadata` shape. Single-templates use it directly through `generateMetadata` in the catch-all `page.tsx` — they don't override per-template unless the content type has metadata that doesn't fit the shared shape.

Runs in parallel with the page render — `generateMetadata` and the default export are both invoked, so any data the metadata needs (site globals, route data) is fetched again. The Next.js cache de-dupes the calls within a single request as long as the underlying fetchers are wrapped in `cache()` or `unstable_cache`.

---

## Adding a New Content Type

When a new content type lands in WordPress and needs a frontend page:

1. Add the content type to the template registry so the catch-all can resolve it.
2. Create `single-templates/<TypeName>.tsx` — accepts `{ item, site, urlPath }`, returns the rendered page.
3. If the template needs supplementary data, create `single-templates/single-<type-name>/` with a `fetchers.ts` that wraps reads in `cache(unstable_cache(...))`.
4. If the content type appears in sitemaps, add it to the sitemap config.
5. If the content type has metadata fields beyond the shared SEO shape, extend `app/meta.ts` (or compose a per-template metadata helper that calls `getRouteMeta` and overrides specific fields).
6. If a new directory pattern emerged (e.g. a new sub-folder under `single-templates/`), add it to the architect manifest so future agents loading that path get this doc as context.

---

## Where the Codebase Stands Today

**Current State:**
- The catch-all + single-template pattern is the established way every CMS page renders. All content types listed above route through this pipeline.
- Per-template fetcher folders are the convention for templates with supplementary data. Not every template has one — only those that need supplementary fetches beyond the main content.
- `fetchRouteData` and `fetchSiteGlobals` live in `frontend/lib/rsc/fetchers.ts` and are slated to move to `frontend/lib/routing/fetchers.ts` per epic THR-1784, Story 2 (gentle refactor — file move + import path update). Behavior unchanged.

**Target Shape:**
- Same shape as Current. The pattern is stable; the only in-flight refactor is the routing-layer file move noted above.

**Next.js 16 Target:**
- Metadata generation may be affected by Next.js 16 changes (verify against release notes when adopting). The pipeline shape stays the same.
- Caching primitives at the route layer follow the broader codemod path described in `.claude/architect/caching-and-revalidation.md`.

**Touch-It-Fix-It Migration Policy:**
- New content types use the established pattern from day one.
- Existing templates stay in place; refactor on touch only when the work justifies it.

---

## Review Rules

| Pattern                                                                                        | Where it shows up                       | Flag with                                                                                                                                                                          |
| ---------------------------------------------------------------------------------------------- | --------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Block-owned data fetched in a single-template's `fetchers.ts`                                   | Template fetcher modules                | "Block-owned data belongs in the block's resolver, not the template's fetcher. The template should compose the block, not fetch its data."                                        |
| Single-template that branches on `__typename` to render different shapes                       | Single-template files                    | "If the template renders multiple content types, those are separate single-templates. Each `__typename` resolves to its own template via the registry."                            |
| Per-template metadata override when the content type fits the shared `getRouteMeta` shape       | Template files                           | "If `getRouteMeta` already covers the metadata, don't override per-template — the override creates drift between content types that should share the same metadata strategy."      |
| Supplementary fetcher in a single-template that doesn't wrap in `cache(unstable_cache(...))`    | Template fetcher modules                | "Supplementary fetchers must be cached. The Apollo client runs `fetchPolicy: 'no-cache'`, so without the Next layer every render hits WordPress cold. See `headless-architecture.md` § Supplementary fetchers must be cached." |
| New content type added without a template registry entry                                        | New `single-templates/X.tsx` files       | "The catch-all routes by content type via the template registry. Without a registry entry, the new template won't be reached."                                                     |

---

## References

- [`.claude/architect/frontend-app.md`](frontend-app.md) — broader App Router structure (route handlers, sitemaps, robots)
- [`.claude/architect/caching-and-revalidation.md`](caching-and-revalidation.md) — the three caching tiers and primitives
- [`.claude/architect/data-layer.md`](data-layer.md) — services, repositories, and the per-source data-access shape
- [`.claude/spec/adrs/0021-data-layer-reshape.md`](../spec/adrs/0021-data-layer-reshape.md) — the routing layer separation from services
- [`.claude/rules/headless-architecture.md`](../rules/headless-architecture.md) § Supplementary fetchers must be cached — the canonical fetcher pattern
- [`.claude/plans/epic-thr-1784.md`](../plans/epic-thr-1784.md) — the `lib/rsc/fetchers.ts` → `lib/routing/fetchers.ts` move
