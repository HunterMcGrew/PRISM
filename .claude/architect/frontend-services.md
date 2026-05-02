# Frontend Services

Architect context for `frontend/lib/services/` and `frontend/lib/data-access/`. Covers the three-tier data access pattern as it exists today.

> **Migration note:** The data layer is moving to a reshape that separates source-coupled mapping (data-access), source-agnostic domain logic (services), page resolution (routing), and source-determined caching (fetcher-level). New entities and migrated entities follow `.claude/architect/data-layer.md` — that file documents the target shape, folder structure, naming, and caching policy. ADR-0021 carries the rationale.
>
> This file describes the **current state** during migration. When an entity has been migrated, prefer the patterns in `data-layer.md` over the patterns documented here. The migration is per-entity, opt-in with each touch — see `.claude/plans/epic-thr-1784.md` for sequencing.

For server/client boundary rules see `.claude/rules/headless-architecture.md`.

---

## Three-Tier Architecture

Data flows through three layers:

```
ServiceFactory  →  Service  →  Repository  →  GraphQL/API
                      ↓
                  Domain Model (via DTO mapping)
```

### ServiceFactory

`frontend/lib/factory/ServiceFactory.ts` — static factory class, single entry point for creating services.

```typescript
ServiceFactory.createEventService(site); // → EventService
ServiceFactory.createProductService(site); // → ProductService
ServiceFactory.createLocationService(site); // → LocationService
```

Each factory method:

1. Creates an Apollo client via `getClient(site.wpUrl)`
2. Instantiates the repository with the client
3. Instantiates the service with the repository and `ISiteGlobals`

**ServiceFactory must never be imported in `"use client"` files.** Use route handlers for client-initiated fetches.

---

### Services

Each domain has a service in `frontend/lib/services/{domain}/{Domain}Service.ts`.

Services implement `IContentService<T>` from `@frontend/lib/contracts/content-service`:

```typescript
export class EventService implements IContentService<IEvent> {
  constructor(repo: GQLEventRepository, site: ISiteGlobals) { ... }

  async getItems(top?: number): Promise<IEvent[]> { ... }
  async getItemBySlug(slug: string): Promise<IEvent | null> { ... }
  async getItemsByIds(ids: number[]): Promise<IEvent[]> { ... }
  async getSortedEvents(sortBy, ids, showPast): Promise<IEvent[]> { ... }

  private dtoToEvent(dto: GQLEventDTO): IEvent { ... }
}
```

- Services transform DTOs to domain models via private `dtoTo*()` methods
- Services use mappers from `@frontend/lib/mappers/` for shared transforms (images, SEO)
- Error handling: catch, wrap with context, re-throw
- Domain-specific business logic lives here (e.g., filtering past events)

Current services: BlogPost, CallToAction, Career, Employee, Equipment, Event, Location, Navigation, Offer, Page, Product, Promotion, Rental, Route, Template, Block, Cookie.

---

## Verifying GraphQL response shape — debug step zero

When a value behaves wrong in a service mapper, in a component, or anywhere downstream of GraphQL — log the raw response and verify the shape against the DTO type before debugging logic. The cheapest way to be wrong about a value is to misread its shape.

**Why:** THR-1419's call-CTA modal silently fell back to locations because `ctaPhoneSource` arrived as `["custom"]` (array), not `"custom"` (string). The DTO typed it `string | null`, so `=== "custom"` was always false. Reading the GraphQL response at the boundary would have shown the array shape immediately; the bug shipped because the mapper output was trusted as the source of truth.

**How to apply:** When a downstream value is wrong, verify in this order: (1) the raw GraphQL response (`console.log(JSON.stringify(rawResponse, null, 2))` at the repository boundary, or copy the query into the WPGraphQL IDE), (2) the DTO type vs the actual response shape, (3) the mapper logic. Most of the time you stop at step 1.

### ACF field shapes via WPGraphQL

WPGraphQL's exposure of ACF field types isn't always what the field's UI suggests. Wire shapes by ACF field type:

- `text`, `textarea`, `number`, `email`, `url` → scalar string (or null).
- `button_group`, `radio` → scalar string.
- `select` (whether `multiple => 0` or `multiple => 1`) → `string[]`. The `multiple` setting does not affect the wire shape.
- `checkbox` → `string[]`.
- `relationship`, `post_object` (multi) → connection edges (separate handling, beyond the scope of this section).

Type DTO fields backed by an ACF `select` as `string | string[] | null` and unwrap at the service-layer mapper:

```ts
function unwrapAcfSelect(
	value: string | string[] | null | undefined
): string | null {
	return Array.isArray(value) ? (value[0] ?? null) : (value ?? null);
}
```

**Why:** Surfaced in production via THR-1419. The unwrap helper currently lives file-local in `CallToActionService.ts`; promote to a shared utility once a second consumer appears (rule of three: wait for the third).

**How to apply:** Before adding a new ACF field to a GraphQL query, look up the field's `'type'` in the post-types PHP. If it's `select`, type the DTO as `string | string[] | null` and unwrap in the mapper. Existing select-field DTOs typed as `string` are bugs waiting to surface — flag during review.

### Per-fragment field presence

When code reads `field.<x>` for a GraphQL-fed value, a single `grep` of the fragment file proves `<x>` exists _somewhere_. It does not prove every fragment selects it. Verify per fragment.

**Why:** THR-242 added a `RequiredIndicator` that read `field.isRequired`. A `grep isRequired fragments/form-fields.ts` returned 11+ hits, so the field looked present. It wasn't selected in `AddressFieldFields`, `CheckboxFieldFields`, `MultiSelectFieldFields`, or `NameFieldFields`. The frontend gate worked correctly; the value arrived `undefined` from GraphQL. Bug shipped to production.

**How to apply:** When touching code that reads `field.<x>` on a typed-union, `grep "fragment <TypeName>FieldFields"` in the fragments file and confirm `<x>` is in every variant the consumer handles. For Gravity Forms specifically, each field type has its own fragment (`<TypeName>FieldFields`), and they were authored independently at different times — coverage is inconsistent by default. Generalizes to any typed-union with per-branch selection: GraphQL fragments, DTO-to-domain mappers with per-type branches, switch-on-discriminator rendering.

---

### Repositories

Each domain has a repository in `frontend/lib/data-access/<entity>/<source>/<Source><Entity>Repository.ts` (e.g. `frontend/lib/data-access/event/gql/GQLEventRepository.ts`).

Repositories implement `IDataAccessLayer<DTO>` from `@frontend/lib/contracts/data-access-layer`. `getItemsByIds` is optional — only implement it when the domain needs batch-by-ID fetching. All IDs are `string` at the interface level; repos with non-string native IDs (e.g. events use numeric WordPress `databaseId`) convert internally.

```typescript
export class GQLEventRepository implements IDataAccessLayer<GQLEventDTO> {
  constructor(client: ApolloClient<NormalizedCacheObject>) { ... }

  async getItems(top?: number): Promise<GQLEventDTO[]> { ... }
  async getItemBySlug(slug: string): Promise<GQLEventDTO | null> { ... }
  async getItemsByIds(ids: string[]): Promise<GQLEventDTO[]> { ... }
}
```

- Repository names are prefixed with the protocol: `GQL*` for GraphQL, `SPC*` for SPC API
- DTOs live alongside their repository (e.g., `GQLEventDTO.ts`)
- Repositories handle raw queries and pagination
- Return `null` on not found, throw on error

---

### DTO Files

DTOs in `frontend/lib/data-access/<entity>/<source>/<Source><Entity>DTO.ts` (e.g. `frontend/lib/data-access/event/gql/GQLEventDTO.ts`) define the raw API response shape.

DTO types must reflect what the API actually returns — optional fields for data only present in some queries.

WooCommerce taxonomy connections (`productTags`, `productCategories`) return `null` when no terms are assigned, even when the field is explicitly queried. Type these as `| null` on the DTO and use optional chaining with a fallback in mappers (e.g. `dto.productTags?.nodes ?? []`).

---

## BlockService

`frontend/lib/services/block/BlockService.ts` is a singleton that manages the block registry:

- `BlockService.getInstance()` — singleton access
- `registerBlock(type, registration)` — called from `block-registry.ts`
- `resolveBlock(block, context)` — resolves a block for rendering

---

## Caching

**Current state (interim, during migration).** Caching lives in the Next.js layer using `unstable_cache`, not in services or repositories. Services are stateless per request — the Apollo client they use runs `fetchPolicy: "no-cache"`, so every uncached call goes to WordPress cold.

Two valid locations today:

1. **Block resolvers** (`resolver.ts`, `resolver.props.ts`) — the primary location. The block-level resolver is the natural cache boundary for the data a block renders.
2. **Single-template supplementary fetchers** (`frontend/single-templates/*/fetchers.ts`) — for reads that supplement the main route data with related items, sibling cards, or content-type-specific lookups. Use `cache(unstable_cache(...))` matching the pattern in `single-equipment/fetchers.ts`. See `.claude/rules/headless-architecture.md` § Supplementary fetchers must be cached for the rule and the THR-1778 incident that motivated it.

**Target state.** Caching moves to the data-access layer, scoped by the source's revalidation guarantees — webhook-driven `ON_DEMAND_CACHE_TIME` for sources like WordPress, `POLLING_CACHE_TIME` for sources like SPC. Each fetcher is a top-level module function with `unstable_cache` inline today, ready to convert to the Next.js 16 `"use cache"` directive via codemod when WP7 unblocks the upgrade. The "two valid locations" pattern collapses into one: caching is wherever the data is fetched. See `.claude/architect/data-layer.md` § Caching for the target shape and ADR-0021 for the rationale.

### `unstable_cache` requires the `useCache` gate

Resolvers that wrap calls in `unstable_cache` must check `site.policy.useCache` first and bypass the cache when it's false. `unstable_cache` is server-only — it throws when called from a non-server context (Storybook, tests, anywhere `useCache: false` was set deliberately).

**Why:** Storybook 10.3 (epic-thr-1561) renders blocks through `BlocksRenderer`, which exercises the resolver path. With `useCache: true`, every story would call `unstable_cache` and crash. The `getMockSiteGlobals()` fixture sets `useCache: false` so resolvers skip the cache and call services directly — but only if the resolver actually checks the flag. THR-1571 fixed the navigation resolver to match this pattern after a story crash surfaced the gap.

**How to apply:** Wrap the cached call inside an `if (site.policy.useCache)` branch and return the uncached service call directly in the `else`.

```ts
if (site.policy.useCache) {
	return unstable_cache(() => service.getItems(), [cacheKey], {
		tags,
		revalidate,
	})();
}
return service.getItems();
```

---

## Mappers

All mappers are pure functions that transform DTOs into domain models.

### Shared mappers (`frontend/lib/mappers/`)

3 files plus a barrel `index.ts`:

- `map-gql-image.ts` — transforms GraphQL image DTOs to `IImage`
- `map-seo-fields.ts` — transforms GraphQL SEO data

Used across multiple services — imported via `@frontend/lib/mappers`.

### Service-specific mappers

Domain-specific mappers live within their service directory (e.g., `services/equipment/mappers/`). These handle transforms unique to a single domain and are not shared.
