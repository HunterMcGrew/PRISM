# Frontend WordPress Data Layer

Architect context for `frontend/lib/wp/`. Covers the GraphQL query and fragment layer that repositories consume.

For the full data flow (services → repositories → queries) see `frontend-services.md`.

---

## Structure

```
frontend/lib/wp/
├── connector.ts          # Apollo client factory (getClient)
├── fragments/            # 13 files — entity-specific GraphQL field selections
│   ├── product/          # 7 type-variant fragments (simple, variable, composite, etc.)
│   └── {entity}-fields.ts
├── functions/            # 3 files — site globals, menu links, theme properties
└── queries/              # 15 files — get-{entity} query documents
```

---

## connector.ts

Creates Apollo clients for GraphQL communication with WordPress. Supports two link types:

- `"persisted"` (default) — uses `createPersistedQueryLink` with SHA-256 hashing for production performance
- `"upload"` — uses `apollo-upload-client` for file uploads

Called by `ServiceFactory.ts` when creating service instances. **Must not be imported in `"use client"` files.**

---

## Fragments

One file per entity in `fragments/`, named `{entity}-fields.ts`.

**Always use the entity's base fields fragment for nested/embedded entities.** When a query embeds another entity (e.g. eligible products inside a promotion), spread the entity's base fragment (`...ProductBaseFields`) instead of hand-rolling an inline field list. The base fragment is the source of truth for what `mapBaseProduct` and the DTO type expect — hand-rolled fragments drift when the base fragment evolves, breaking the TypeScript contract at runtime (THR-1518).

Entity fragments:

| File | Entity |
|------|--------|
| `career-fields.ts` | Career |
| `employee-fields.ts` | Employee |
| `equipment-fields.ts` | Equipment |
| `event-fields.ts` | Event |
| `form-fields.ts` | Form |
| `image-fields.ts` | Image |
| `location-fields.ts` | Location |
| `page-fields.ts` | Page |
| `post-fields.ts` | Post |
| `promotion-fields.ts` | Promotion |
| `rental-fields.ts` | Rental |
| `seo-fields.ts` | SEO |

The `product/` subdirectory contains 7 type-variant fragments for WooCommerce product types (simple, variable, composite, external, group, bundle, and base product fields).

---

## Queries

One file per entity in `queries/`, named `get-{entity}.ts` or `get-{entities}.ts`:

| File | Purpose |
|------|---------|
| `get-careers.ts` | Fetch careers |
| `get-ctas.ts` | Fetch call-to-action items |
| `get-employees.ts` | Fetch employees |
| `get-equipment.ts` | Fetch equipment |
| `get-events.ts` | Fetch events |
| `get-forms.ts` | Fetch Gravity Forms |
| `get-locations.ts` | Fetch locations |
| `get-pages.ts` | Fetch pages |
| `get-posts.ts` | Fetch blog posts |
| `get-product-categories.ts` | Fetch product categories |
| `get-products.ts` | Fetch products |
| `get-promotions.ts` | Fetch promotions |
| `get-rentals.ts` | Fetch rentals |
| `get-wp-globals.ts` | Fetch WordPress global settings |
| `node-by-uri.ts` | Fetch any node by its URI (used for routing) |

Queries compose fragments — e.g. `get-events.ts` uses `event-fields.ts`.

---

## Functions

Three utility files for site-level data:

| File | Purpose |
|------|---------|
| `get-menu-link.ts` | Menu link resolution |
| `get-site-globals.ts` | Site-wide settings (ISiteGlobals) |
| `get-theme-properties.ts` | Theme configuration values |

---

## Relationship to Services Layer

```
ServiceFactory → creates Apollo client via connector.ts
Repository     → executes queries from queries/
Queries        → compose fragments from fragments/
Service        → transforms repository DTOs into domain models
```

Repositories call queries directly. Services never import from `wp/` — they go through their repository.
