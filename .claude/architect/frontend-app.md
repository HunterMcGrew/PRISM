# Frontend App Router

Architect context for `frontend/app/`. Covers the Next.js App Router structure, route handlers, and data fetching patterns.

For server/client boundary rules see `.claude/rules/headless-architecture.md`.

For the catch-all routing pipeline, single-template pattern, and content-type resolution flow, see [`.claude/architect/routing-and-page-resolution.md`](routing-and-page-resolution.md). This file covers the route layout; the routing doc covers how a URL becomes a rendered page.

---

## Route Structure

```
frontend/app/
├── layout.tsx           # Root layout — providers, global styles, header/footer
├── page.tsx             # Homepage
├── error.tsx            # Global error boundary
├── not-found.tsx        # 404 page
├── [...slug]/           # Catch-all route for CMS-managed pages
│   └── page.tsx
├── search/              # Search page
│   ├── page.tsx
│   └── KronosSearchFallback.tsx  # Dynamic import wrapper (ssr: false)
├── api/                 # Route handlers (see below)
├── sitemaps/            # Sitemap generation
├── sitemap.ts           # Root sitemap
├── sitemap_index.xml    # Sitemap index
├── robots.ts            # robots.txt generation
├── meta.ts              # Shared metadata helpers
└── llms.txt             # LLM-readable site description
```

---

## API Route Handlers

Thin wrappers for client-initiated server fetches. Each uses `ServiceFactory` server-side.

| Route | Purpose |
|-------|---------|
| `/api/form/route.ts` | Gravity Forms submission handling |
| `/api/revalidate/route.ts` | On-demand ISR revalidation webhook |
| `/api/redirects/route.ts` | Redirect lookup |
| `/api/equipment/[id]/route.ts` | Single equipment item fetch |

**Pattern:** Client components call `fetch("/api/...")`. The route handler creates a service via `ServiceFactory`, fetches data, and returns JSON. This keeps `ServiceFactory` and Apollo out of the client bundle.

---

## Data Fetching Pattern

Pages fetch data server-side through the services layer:

```
page.tsx (RSC) → ServiceFactory → Service → Repository → GraphQL
                                     ↓
                              Domain Model (props)
                                     ↓
                            Component tree (RSC + client leaves)
```

- Pages and layouts are React Server Components by default
- Data fetching happens at the page level, not in components
- Client components receive data as serializable props
- For user-initiated runtime fetches, use API route handlers

### Where data fetching can live

Three tiers, each cached at its own level:

1. **Block resolvers** (`resolver.ts`, `resolver.props.ts`) — the main data a block renders. Wrapped in `unstable_cache` at the resolver.
2. **Single-template supplementary fetchers** (`frontend/single-templates/*/fetchers.ts`) — reads that supplement the route's main data with related items, sibling cards, or content-type-specific lookups. Each fetcher wraps its read in `cache(unstable_cache(...))`. See `.claude/rules/headless-architecture.md` § Supplementary fetchers must be cached.
3. **Route handlers** (`frontend/app/api/...`) — client-initiated runtime fetches. Caching strategy is per-route since these respond to user interaction, not page render.

---

## SEO and Metadata

| File | Purpose |
|------|---------|
| `meta.ts` | Shared metadata generation helpers |
| `robots.ts` | Generates `robots.txt` |
| `sitemap.ts` | Generates XML sitemap |
| `sitemap_index.xml` | Static sitemap index |

---

## Conventions

- All page components are RSC — no `"use client"` on pages
- Interactive client components live as thin leaves (see headless architecture rules)
- The `[...slug]` catch-all handles all CMS page routes via `node-by-uri` query
- Search uses `KronosSearchFallback.tsx` (`"use client"` + `dynamic({ ssr: false })`) to avoid SSR of the heavy search client
