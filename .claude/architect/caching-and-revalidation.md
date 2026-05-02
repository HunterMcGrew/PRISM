# Caching and Revalidation

Architect context for caching and revalidation across the frontend. Loaded for cache-related data-access files, supplementary fetchers under `single-templates/*/fetchers.ts`, and the `/api/revalidate` route handler.

This file covers the **cross-cutting** caching story — where caching happens across the codebase, what each tier is responsible for, and the rules that span layers. For the per-source data-access mechanics (cache key shapes, fetcher patterns, the Next.js 16 codemod), see `.claude/architect/data-layer.md` § Caching. ADR-0021 carries the foundational decision; this file is the broader landscape it sits in.

For the human-readable narrative, see `docs/content/dev/architecture/caching-and-revalidation.md`.

---

## The Three Caching Tiers

Caching happens in three places. Each tier owns a different lifecycle question.

| Tier                          | What it caches                                              | Where the primitive lives                                                    | Lifetime + invalidation                                                                                          |
| ----------------------------- | ----------------------------------------------------------- | ---------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| **Block resolvers**           | Block-owned data fetched during page render                  | `frontend/blocks/<block>/resolver.ts` and `resolver.props.ts` (`unstable_cache`) | **Tag:** entity content type (e.g. `CONTENT_TYPES.PROMOTIONS`). **TTL:** inherited from the wrapped fetcher.     |
| **Supplementary fetchers**    | Route-owned reads that supplement a single-template's main data | `frontend/single-templates/<type>/fetchers.ts` (`cache(unstable_cache(...))`) | **Tag:** per-fetcher, tied to the content type and operation. **TTL:** per-fetcher `revalidate`.                  |
| **Data-access fetchers**      | Source-coupled I/O (the actual GraphQL/REST/SDK call)        | `frontend/lib/data-access/<entity>/<source>/fetchers/*.ts`                   | **Tag:** per fetcher (upper layers cascade from these). **TTL:** `ON_DEMAND_CACHE_TIME` / `POLLING_CACHE_TIME` per source. |

Route handlers (`frontend/app/api/...`) are a fourth caching context, but their strategy is per-route — client-initiated fetches don't share the same lifecycle as page render. Treat each route handler's caching as a local decision; don't generalize.

**Why three tiers and not one:** each layer has a different cache key shape and a different invalidation trigger. Block resolvers cache by block attributes plus content. Supplementary fetchers cache by route + supplementary read. Data-access fetchers cache by source operation and serializable args. Collapsing them creates either over-caching (stale block data when a single content row updates) or under-caching (every page render hits the network).

---

## Cache Primitives

Three primitives are in play. They are not interchangeable — the choice tree is explicit.

### `unstable_cache` (current workhorse)

The Next.js 15 caching primitive. Used in resolvers, supplementary fetchers, and data-access fetchers. Takes a function, a key array, and `{ tags, revalidate }`. Returns a wrapped function that caches by the key.

```ts
const result = await unstable_cache(
  async () => fetchPromotions(site, top),
  ["promotion.gql.getItems", site.id, String(top)],
  { tags: [CONTENT_TYPES.PROMOTIONS], revalidate: ON_DEMAND_CACHE_TIME }
)();
```

### `"use cache"` (Next.js 15.5+, canonical in Next.js 16)

The directive form. Only allowed on top-level module functions with serializable arguments. The data-layer reshape (ADR-0021) was structured so the migration from `unstable_cache` to `"use cache"` is a codemod — strip the wrapper, add the directive, swap config calls.

The directive applies to the cache primitive (where the I/O happens). The public API around it can be any shape — class methods, factory functions, plain re-exports — because class methods can wrap top-level cached functions cleanly. ADR-0021 settles this: the cached I/O lives in top-level fetcher modules (where Next.js 16 requires it); the repository class methods delegate to those fetchers; consumers see a uniform class shape. Separate the two questions — "where does the cache primitive live" vs "what shape does the public API take" — and don't reason from one to the other.

### `cache()` from React (request-scoped de-dup)

The React primitive that de-dupes calls within a single render. Used as the **outer wrapper** around `unstable_cache` in supplementary fetchers — the canonical pattern lives in `frontend/single-templates/single-equipment/fetchers.ts`. See `.claude/rules/headless-architecture.md` § Supplementary fetchers must be cached.

Apply `cache()` only when a single render genuinely calls the same fetcher multiple times. Most code doesn't need it; the supplementary-fetcher pattern is the established case.

---

## Lifetime is a Source Property

Cache lifetime is determined by the **source**, not the domain. ADR-0021's caching axis carries the full reasoning; the rule restated:

- **Webhook-driven sources** (WordPress today, plus any future source with a push-back signal) use `ON_DEMAND_CACHE_TIME`. The TTL is a fallback; the webhook does the real invalidation work.
- **Polling-only sources** (Space Station today, plus any future source with no push-back) use `POLLING_CACHE_TIME`. The TTL is the actual invalidation cadence.

A multi-source service (`OfferService` composing GraphQL promotions and SPC offers) cannot have a single TTL — one source's policy always loses. Caching at the source per-fetcher is the only way to honor each source's revalidation guarantees in the same composition.

---

## Revalidation Tag Conventions

Tags are how on-demand invalidation cascades across a fetcher's cache entries. Two rules govern tag choice.

**One tag per fetcher, matching the entity's `CONTENT_TYPES.*` constant.** The webhook plumbing already targets these tags, so the new fetcher pattern keeps existing invalidation working without code changes on the WordPress side.

**Site Globals propagate to template-part content via the same query response.** The `GET_WORDPRESS_GLOBALS_QUERY` in `frontend/lib/wp/functions/get-site-globals.ts` returns site config and template-part content together. `revalidateTag('site_globals')` invalidates the cached query response, which means template-part edits propagate without needing a separate template-part tag. THR-1782 was almost filed as a missing-tag bug before the architecture was traced — this is the structural fact that makes the homepage-save workaround unnecessary. Document this when reaching for "we need a new tag for X" — check whether X is already inside a tag's response shape.

---

## Where the Codebase Stands Today

This is a snapshot of the layered model, not a manual.

**Current State:**
- Resolvers wrap fetchers in `unstable_cache` per the existing pattern in block resolver files. Some include block attributes in the cache key, some don't — a minor drift the data-layer reshape tightens up per-entity.
- Supplementary fetchers in single-templates use `cache(unstable_cache(...))` — the canonical pattern is in `single-equipment/fetchers.ts`.
- Data-access caching is migrating from in-service or static-method placement (`CallToActionService.getCTALists`, `lib/rsc/fetchers.ts` wrapping in `unstable_cache` directly) to top-level fetcher modules at `data-access/<entity>/<source>/fetchers/`. Per-entity migration is in flight (epic THR-1784).

**Target Shape:**
- Per-source caching at the data-access layer, in top-level fetcher modules.
- Resolvers and supplementary fetchers compose over already-cached source reads.
- Multi-source services (`OfferService` etc.) read each source's already-cached fetcher and compose the result.

**Next.js 16 Target:**
- `"use cache"` directive becomes canonical. `unstable_cache` retired.
- Fetcher function shapes stay the same; the wrapper changes. Codemod, not refactor.
- `cacheTag` and `cacheLife` replace the config-args pattern.

**Touch-It-Fix-It Migration Policy:**
- New caching code goes in target shape from day one (per `.claude/rules/data-layer-boundaries.md` § Scope).
- Existing caching code migrates on touch — when an entity is touched substantially, its caching moves to the target shape as part of the same work.
- No standalone migration tickets unless the entity warrants a full reshape. Per-entity tickets get filed as the work is picked up (epic THR-1784, Story 4).

---

## Review Rules

Patterns to flag at PR review.

| Pattern                                                                            | Where it shows up                                       | Flag with                                                                                                                                                                          |
| ---------------------------------------------------------------------------------- | ------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `ServiceFactory` call inside `single-templates/*/fetchers.ts` without `cache(unstable_cache(...))` wrapper | Supplementary fetcher modules | "Supplementary fetchers must be cached. The Apollo client runs `fetchPolicy: 'no-cache'`, so without the Next layer every render hits WordPress cold. See `headless-architecture.md` § Supplementary fetchers must be cached." |
| Service-level `unstable_cache` wrapping a method that composes multiple sources    | Service classes                                         | "Caching at the service forces one TTL across all sources. Move the cache to each source's data-access fetcher; the service composes already-cached reads. ADR-0021."              |
| Cache key without `site.id`                                                         | Any fetcher                                             | "Multi-tenant deployments need `site.id` in the cache key, otherwise data leaks across dealer sites. Add it as the second key element."                                            |
| `"use cache"` directive on a class method                                           | Class-shaped data-access code                            | "`\"use cache\"` only works on top-level module functions. Move the cached I/O to a top-level function in `data-access/<entity>/<source>/fetchers/` and have the class method delegate." |
| Adding a new revalidation tag for content that's already inside an existing tag's query response | Webhook handlers, route handlers                | "Check whether the content is already part of an existing tag's response shape (e.g. template parts inside `site_globals`). If yes, the existing tag's invalidation already cascades; a new tag is dead weight." |
| Mismatched cache TTL across sources in a multi-source composition                   | Service code composing CMS + third-party data            | "Each source has its own revalidation guarantees. Cache at the source per-fetcher; let composition read already-cached values. ADR-0021."                                           |

---

## References

- [`.claude/spec/adrs/0021-data-layer-reshape.md`](../spec/adrs/0021-data-layer-reshape.md) — caching axis: lifetime is a source property; cache primitives live in top-level fetcher modules.
- [`.claude/architect/data-layer.md`](data-layer.md) § Caching — per-source cache key shapes, fetcher patterns, the Next.js 16 codemod.
- [`.claude/rules/headless-architecture.md`](../rules/headless-architecture.md) § Supplementary fetchers must be cached — the canonical wrapper pattern for `single-templates/*/fetchers.ts`.
- [`.claude/plans/epic-thr-1784.md`](../plans/epic-thr-1784.md) — per-entity migration sequencing.
