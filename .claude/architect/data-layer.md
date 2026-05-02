# Data Layer

Architect context for `frontend/lib/data-access/` and `frontend/lib/services/`. Loaded when files in those directories appear in a diff, plus on any block resolver work that touches data fetching.

This file documents the **target shape** of the data layer. The codebase is migrating to it gradually — see `.claude/plans/epic-thr-1784.md` for the per-entity sequencing. ADR-0021 carries the full rationale.

For the human-readable narrative version, see `docs/content/dev/architecture/data-layer.md`.

For cross-cutting caching concerns that span the data-access layer, single-template fetchers, and route handlers, see [`.claude/architect/caching-and-revalidation.md`](caching-and-revalidation.md). This file covers per-source caching mechanics; the cross-cutting doc covers the broader landscape.

---

## The Three Layers

```
data-access/<entity>/<source>/                    ← source-coupled I/O + hydration
                                                    (top-level cached fetchers,
                                                     DTOs, mappers, queries)

services/<entity>/                                 ← source-agnostic domain logic
                                                    (service class + pure rules)

routing/resolvers/                                 ← Next.js page resolution
                                                    (depends on services, never the reverse)
```

Each layer has one responsibility. Mapping is data-access. Domain logic is services. Page resolution is routing. The boundaries between them keep source-specific concerns from scattering across the codebase — so a third-party SDK integration doesn't tangle with promotion business logic, a CMS swap doesn't ripple through service code, and tests for sorting rules don't need to mock Apollo. "Source" here means whatever the data is coming from: GraphQL CMS today, plus REST APIs, vendor SDKs, internal services, or additional CMSs as they land.

> **A note on the word "source":** today, most entities have one source (GraphQL/WordPress) plus the SPC API for offers. The pattern is built so that new sources — third-party APIs, vendor SDKs, additional CMSs — slot into `<entity>/<source>/` without touching the service layer or other sources. Future-proofing for "where else might this entity's data come from" is part of the layer's job, not an afterthought.

---

## Folder Structure

```
frontend/lib/
  domain/
    promotion.ts                                  ← IPromotion + partial shapes (IPromotionRef)
    event.ts
    product.ts
    image.ts
    ...                                           ← business nouns and value primitives

  contracts/
    block.ts                                      ← BlockResolver, BlockRegistration, IPostBlock
    render-context.ts                             ← RenderPolicy, RenderEnvironment, AccessLevel
    site-globals.ts                               ← ISiteGlobals
    block-attributes.ts                           ← BlockStyle, BlockBorderProps (WP shape mirrors)
    ...                                           ← application contracts, runtime context

  data-access/
    promotion/
      PromotionRepository.ts                       ← interface — narrow, per-entity
      gql/
        GQLPromotionRepository.ts                  ← class — implements PromotionRepository
        fetchers/
          fetch-promotions.ts                      ← top-level cached function
          fetch-promotion-by-slug.ts
          fetch-promotion-by-id.ts
          fetch-promotions-by-category.ts
        mappers/
          map-gql-promotion.ts
          map-gql-promotion-category.ts
        queries/
          get-promotions.gql.ts
        GQLPromotionDTO.ts                         ← internal — never imported outside this folder
      <new-source>/                                ← future peer (REST API, vendor SDK,
        <Source>PromotionRepository.ts               additional CMS, internal service)
        fetchers/
        mappers/
        ...

  services/
    promotion/
      PromotionService.ts                          ← class — domain orchestration
      rules.ts                                     ← pure functions: isPromotionActive, sortPromotions
      mapping.ts                                   ← domain → domain transforms (e.g. IPromotion → IOffer)
      __tests__/

  routing/
    resolvers/
      resolve-promotion-route.ts
      resolve-event-route.ts
      ...
    fetchers.ts                                    ← was lib/rsc/fetchers.ts

  factory/
    ServiceFactory.ts                              ← creates services, instantiates repos and injects them
```

**`domain/` vs. `contracts/`:** `domain/` holds business nouns and value primitives — promotions, events, products, locations, employees, plus shared primitives like images, links, SEO. `contracts/` holds application contracts (`BlockResolver`), runtime context (`RenderPolicy`, `ISiteGlobals`), external system mirrors (`BlockStyle` from WP, `IndexRecord` from search), and UI primitives (`NoItemsConfig`). Sanity check: would a non-technical PM recognize this as a thing the business has? Yes → `domain/`, no → `contracts/`. Domain types change when the business changes; contract types change when the system architecture changes. The split landed under THR-1786 (Story 2 of THR-1784); contract types have their own architect context at `frontend-contracts.md`.

The source is a subdirectory inside the entity, not the top-level partition. When any new data source lands — a third-party API, a vendor SDK, an additional CMS, an internal service — it adds a peer folder next to `gql/`. The entity stays the primary axis; the source stays a local detail of how that entity's data is accessed.

---

## Layer Rules

### Data-access — source-specific concerns stay here

- DTOs (`<Source><Entity>DTO`) are internal. They live inside `<entity>/<source>/` and nothing outside the layer imports them. Source-specific shapes never reach the consumer.
- Cached fetchers are **top-level module functions** in `<entity>/<source>/fetchers/`. The Next.js `"use cache"` directive only applies to top-level functions, so the shape today (functions wrapping `unstable_cache`) is the shape that survives the Next.js 16 migration.
- Fetcher arguments are serializable: `site: ISiteGlobals`, primitives, plain data. The Apollo client (or future SDK client) is constructed inside the cached body, not captured in closure.
- Mappers are pure functions in `<entity>/<source>/mappers/`. Mappers can import other mappers within the data-access layer freely — `map-gql-promotion` calling `map-gql-product-ref` is normal. Source-coupled composition stays internal to the layer.
- The repository is a **class** implementing the per-entity `<Entity>Repository` interface. Class methods are thin wrappers over the top-level cached fetchers — `getItems(top)` calls `fetchPromotions(this.site, top)` and returns the result. The class binds `site` once via the constructor; the cached I/O lives in the fetcher functions where Next.js requires it.

**Why this layer matters:** every source has its own quirks — DTO shape, error semantics, pagination model, auth headers, retry policy, response caching. Concentrating them in `<entity>/<source>/` means adding a new source is a contained piece of work, removing one is a contained delete, and a bug in one source's mapping has zero blast radius into another source or into domain logic. The layer is the answer to "where does data source logic live?" — and the answer is "right here, never anywhere else."

**Why repos are classes (with top-level fetchers underneath):** consistency with the service layer. Both ends of the data layer use the same shape (class + interface + constructor injection), which matches standard layered-OO mental models — what a developer with .NET, Java Spring, or NestJS background reads on first scan. The cached fetchers must be top-level functions because of `"use cache"`, but that constraint applies to the _cache primitive_, not the public API. The class wraps the fetchers and presents the consumer-facing interface; the fetchers handle the cache directive. Two-line wrapper methods, full consistency, no idiomatic break between layers.

### Services — domain logic in a class shape

- A service is a **class** with constructor-injected collaborators (a repo, sometimes multiple repos, sometimes additional clients like an AI content API or pricing service) plus `site` for any operation that needs it.
- Each service class declares its own surface honestly. Pass-through methods (`getItems`, `getItemBySlug`) are conventional but not enforced by a shared interface — when a service has them, they're there because the entity needs them.
- Per-entity orchestration (`getActivePromotions`, `getProductCTAs`, `getOffersByRegion`) lives as methods on the service class. This is what the class earns its keep on — composing multiple collaborators under domain rules.
- Pure domain functions (predicates, sorts, transforms) live in `services/<entity>/rules.ts` as free functions. They don't need `this` and they're the easiest things to test in isolation — no Apollo, no mocks, just fixtures. Service methods import and apply them.
- Domain → domain transforms (e.g. `promotionToOffer` for the multi-source `OfferService`) live in `services/<entity>/mapping.ts`. These aren't source-coupled — they're domain decisions about how one model views as another.
- Services never import DTOs. Services never import from `<entity>/<source>/`. Services import the per-entity repository _interface_ from `<entity>/<Entity>Repository.ts` and receive concrete instances via the factory.

**Why the class shape:** services are where multi-collaborator orchestration lives, and constructor injection is the cleanest expression of that. A `ProductService` that combines a CMS repo, an AI content client, an inventory client, and a pricing client wants all of those bound at construction — reaching for free functions would force every operation to repeat a long parameter list or share a `deps` interface, which is the constructor in disguise. Classes also match the team's .NET/OO mental model — `ServiceFactory.createX(site)` reads as `IServiceProvider.GetService<IX>()`, and the layered-OO shape (interface → class → injection → consumer) is what reviewers will read fastest.

**Why no shared `ContentService<T>` interface:** earlier drafts proposed one. It was the wrong move — services don't actually share a useful uniform shape beyond pass-through `getItems`/`getItemBySlug`, and forcing them under one interface reproduces the original `IContentService<T>` problem of pretending uniformity that isn't real. The uniform contract belongs at the repo level — `<Entity>Repository` interfaces are where polymorphism actually lives (one shape, multiple sources). Services declare their own per-entity surface and the codebase is honest about each one being its own thing.

**Why source-agnostic matters here:** the service layer is the place future devs read to understand what an entity _is_. If a sort rule depends on knowing the data came from GraphQL, the rule is wrong — sort rules describe domain behavior, not source behavior. Keeping services free of source coupling means the next person to add an `isPromotionEligibleForFeature` predicate doesn't have to learn the GraphQL schema first. They read `IPromotion`, write the rule, ship it. Same payoff for every domain question that lands in this layer over the next few years.

### Routing — Next.js concerns, separated from content

- `getRouteData` does not live on services. It lives in `routing/resolvers/resolve-<entity>-route.ts` as a function that takes a service and a path, returns `RouteData | null`.
- Routing depends on services. Services do not depend on routing. The dependency direction protects the service layer from Next.js-shaped concerns leaking in.
- `RouteData`, SEO field shape, redirect logic — all live in the routing layer. When the Next.js version or routing convention changes, the routing layer changes; the data layer doesn't.

---

## Caching

Caching lives at the data-access layer, scoped by the source's revalidation guarantees.

**Why here, not at the service:** cache lifetime is a property of the source, not the domain. WordPress invalidates via webhook, so its content can use `ON_DEMAND_CACHE_TIME`. Space Station has no webhook back, so its content uses `POLLING_CACHE_TIME`. Future sources will bring their own revalidation semantics — some real-time, some eventually-consistent, some webhook-driven, some polling. A multi-source service like `OfferService` (combining CMS promotions and SPC offers, and potentially more sources later) can't honor every source's policy if caching wraps the unified result — one policy always wins, and the others either over-cache or under-cache. Keeping caching at the source means each source declares the policy its own infrastructure supports, and the service composes already-correctly-cached reads.

**Today (Next.js 15):**

```ts
// data-access/promotion/gql/fetchers/fetch-promotions.ts
import "server-only";

import { unstable_cache } from "next/cache";

export async function fetchPromotions(
	site: ISiteGlobals,
	top?: number
): Promise<IPromotion[]> {
	return unstable_cache(
		async () => {
			const client = getClient(site.wpUrl);
			const { data } = await client.query({
				query: GET_PROMOTIONS,
				variables: { first: top },
			});
			return data.promotions.nodes.map((dto) => mapGQLPromotion(dto, site));
		},
		["promotion.gql.getItems", site.id, String(top)],
		{ tags: [CONTENT_TYPES.PROMOTIONS], revalidate: ON_DEMAND_CACHE_TIME }
	)();
}
```

**Next.js 16 target (codemod):**

```ts
import "server-only";

export async function fetchPromotions(
	site: ISiteGlobals,
	top?: number
): Promise<IPromotion[]> {
	"use cache";
	cacheTag(CONTENT_TYPES.PROMOTIONS);
	cacheLife("hours");

	const client = getClient(site.wpUrl);
	const { data } = await client.query({
		query: GET_PROMOTIONS,
		variables: { first: top },
	});
	return data.promotions.nodes.map((dto) => mapGQLPromotion(dto, site));
}
```

Strip the `unstable_cache` wrapper, add the `"use cache"` directive at the top of the function body, and swap config args for `cacheTag`/`cacheLife` calls. **Keep `import "server-only"`** — it's a static guarantee that doesn't go away with the directive change. Function shape is unchanged. This is why fetchers are top-level functions with serializable args — the structural work was done up front so the migration is mechanical.

**Cache key shape:** `[<entity>.<source>.<operation>, site.id, ...serializableArgs]`. The site id is always part of the key so multi-tenant deployments don't leak across sites.

**Cache tag shape:** one tag per fetcher, matching the entity's `CONTENT_TYPES.*` constant. On-demand revalidation already targets these tags, so the existing webhook plumbing keeps working.

**Services do not wrap in another cache.** Composition over already-cached reads is cheap. If a domain operation is expensive enough to cache independently (rare), it gets its own data-access fetcher — not a service-level cache.

**Per-request memoization** uses React `cache()`, not `unstable_cache`. Apply at the service level only when a single render genuinely calls the same fetcher multiple times.

---

## End-to-End Example: Promotion

The full shape across all three layers.

```ts
// domain/promotion.ts
export interface IPromotion {
	__typename: "Promotion";
	id: string;
	databaseId: number;
	title: string;
	slug: string;
	uri: string;
	publishDate: string;
	timeZone: string;
	description: string | null;
	startDate: string | null;
	endDate: string | null;
	featuredImage: IImage | null;
	eligibleProducts: IProductRef[];
	categories: IPromotionCategory[];
	weight: number | null;
}

export interface IProductRef extends Pick<
	IProduct,
	"id" | "slug" | "title" | "featuredImage"
> {}
```

```ts
// data-access/promotion/PromotionRepository.ts
import type { IPromotion } from "@frontend/lib/domain/promotion";

export interface PromotionRepository {
	getItems(top?: number): Promise<IPromotion[]>;
	getItemBySlug(slug: string): Promise<IPromotion | null>;
	getItemsByIds(ids: string[]): Promise<IPromotion[]>;
	getItemsByCategoryId(
		categoryId: number,
		count?: number
	): Promise<IPromotion[]>;
}
```

```ts
// data-access/promotion/gql/fetchers/fetch-promotions.ts
import "server-only";

import { unstable_cache } from "next/cache";

import { CONTENT_TYPES, ON_DEMAND_CACHE_TIME } from "@frontend/lib/constants";
import type { IPromotion } from "@frontend/lib/domain/promotion";
import type { ISiteGlobals } from "@frontend/lib/contracts/site-globals";
import getClient from "@frontend/lib/wp/connector";

import { mapGQLPromotion } from "../mappers/map-gql-promotion";
import { GET_PROMOTIONS } from "../queries/get-promotions.gql";

export async function fetchPromotions(
	site: ISiteGlobals,
	top?: number
): Promise<IPromotion[]> {
	return unstable_cache(
		async () => {
			const client = getClient(site.wpUrl);
			const { data } = await client.query({
				query: GET_PROMOTIONS,
				variables: { first: top },
			});
			return data.promotions.nodes.map((dto) => mapGQLPromotion(dto, site));
		},
		["promotion.gql.getItems", site.id, String(top)],
		{ tags: [CONTENT_TYPES.PROMOTIONS], revalidate: ON_DEMAND_CACHE_TIME }
	)();
}
```

```ts
// data-access/promotion/gql/GQLPromotionRepository.ts
import "server-only";

import type { ISiteGlobals } from "@frontend/lib/contracts/site-globals";

import type { PromotionRepository } from "../PromotionRepository";
import { fetchPromotionBySlug } from "./fetchers/fetch-promotion-by-slug";
import { fetchPromotions } from "./fetchers/fetch-promotions";
import { fetchPromotionsByCategory } from "./fetchers/fetch-promotions-by-category";
import { fetchPromotionsByIds } from "./fetchers/fetch-promotions-by-ids";

export class GQLPromotionRepository implements PromotionRepository {
	constructor(private readonly site: ISiteGlobals) {}

	getItems(top?: number) {
		return fetchPromotions(this.site, top);
	}

	getItemBySlug(slug: string) {
		return fetchPromotionBySlug(this.site, slug);
	}

	getItemsByIds(ids: string[]) {
		return fetchPromotionsByIds(this.site, ids);
	}

	getItemsByCategoryId(categoryId: number, count?: number) {
		return fetchPromotionsByCategory(this.site, categoryId, count);
	}
}
```

```ts
// services/promotion/rules.ts
import type { IPromotion } from "@frontend/lib/domain/promotion";
import { getCurrentDateInTimezone } from "@frontend/lib/utilities/format-date";

export function isPromotionActive(
	promotion: IPromotion,
	now = new Date()
): boolean {
	return (
		hasPromotionStarted(promotion, now) && !isPromotionExpired(promotion, now)
	);
}

export function hasPromotionStarted(promotion: IPromotion, now: Date): boolean {
	if (!promotion.startDate) return true;
	const current = getCurrentDateInTimezone(promotion.timeZone, now);
	return new Date(promotion.startDate).getTime() < current.getTime();
}

export function isPromotionExpired(promotion: IPromotion, now: Date): boolean {
	if (!promotion.endDate) return false;
	const current = getCurrentDateInTimezone(promotion.timeZone, now);
	const oneDay = 24 * 60 * 60 * 1000;
	return new Date(promotion.endDate).getTime() + oneDay < current.getTime();
}

export function sortPromotions(
	promotions: IPromotion[],
	by: "name" | "date" = "date",
	order: "asc" | "desc" = "desc"
): IPromotion[] {
	const sorted = [...promotions];
	if (by === "name") {
		sorted.sort((a, b) =>
			a.title.localeCompare(b.title, undefined, {
				numeric: true,
				sensitivity: "base",
			})
		);
	} else {
		sorted.sort(
			(a, b) =>
				new Date(a.publishDate).getTime() - new Date(b.publishDate).getTime()
		);
	}
	return order === "desc" ? sorted.reverse() : sorted;
}
```

```ts
// services/promotion/PromotionService.ts
import type { PromotionRepository } from "@frontend/lib/data-access/promotion/PromotionRepository";
import type { IPromotion } from "@frontend/lib/domain/promotion";
import type { ISiteGlobals } from "@frontend/lib/contracts/site-globals";

import { isPromotionActive, sortPromotions } from "./rules";

export interface PromotionQueryOptions {
	count?: number;
	sortBy?: "name" | "date";
	order?: "asc" | "desc";
}

export class PromotionService {
	constructor(
		private readonly repo: PromotionRepository,
		private readonly site: ISiteGlobals
	) {}

	getItems(top?: number): Promise<IPromotion[]> {
		return this.repo.getItems(top);
	}

	getItemBySlug(slug: string): Promise<IPromotion | null> {
		return this.repo.getItemBySlug(slug);
	}

	getItemsByIds(ids: string[]): Promise<IPromotion[]> {
		return this.repo.getItemsByIds(ids);
	}

	async getActivePromotions(
		opts: PromotionQueryOptions = {}
	): Promise<IPromotion[]> {
		const { count, sortBy = "date", order = "desc" } = opts;
		const all = await this.repo.getItems(count);
		return sortPromotions(
			all.filter((p) => isPromotionActive(p)),
			sortBy,
			order
		);
	}

	async getActivePromotionsByCategory(
		categoryId: number,
		opts: PromotionQueryOptions = {}
	): Promise<IPromotion[]> {
		const { count = 10, sortBy = "date", order = "desc" } = opts;
		const all = await this.repo.getItemsByCategoryId(categoryId, count);
		return sortPromotions(
			all.filter((p) => isPromotionActive(p)),
			sortBy,
			order
		);
	}
}
```

```ts
// factory/ServiceFactory.ts
import "server-only";

import { SPCOfferRepository } from "@frontend/lib/data-access/offer/spc/SPCOfferRepository";
import { GQLPromotionRepository } from "@frontend/lib/data-access/promotion/gql/GQLPromotionRepository";
import type { ISiteGlobals } from "@frontend/lib/contracts/site-globals";
import { OfferService } from "@frontend/lib/services/offer/OfferService";
import { PromotionService } from "@frontend/lib/services/promotion/PromotionService";

export class ServiceFactory {
	static createPromotionService(site: ISiteGlobals) {
		return new PromotionService(new GQLPromotionRepository(site), site);
	}

	static createOfferService(site: ISiteGlobals) {
		return new OfferService(
			new SPCOfferRepository(site),
			new GQLPromotionRepository(site),
			site
		);
	}
	// static createEventService(site: ISiteGlobals) { return new EventService(new GQLEventRepository(site), site); }
	// ...
}
```

```ts
// frontend/blocks/promotions/resolver.ts (the consumer)
import "server-only";

import type { BlockResolver } from "@frontend/lib/contracts/block";
import { ServiceFactory } from "@frontend/lib/factory/ServiceFactory";

import type { BlockFrontendProps } from "./PromotionsBlock";
import { DEFAULT_ATTRIBUTES, type BlockAttributes } from "./schema";

export default {
	resolveProps: async ({ id, site, attrs }) => {
		const resolvedAttrs = { ...DEFAULT_ATTRIBUTES, ...attrs };

		const promotions = await ServiceFactory.createPromotionService(site)
			.getActivePromotions({
				count: resolvedAttrs.count,
				sortBy: resolvedAttrs.sortBy,
				order: resolvedAttrs.orderBy,
			})
			.catch((error) => {
				console.error("Error fetching promotions for block", error);
				return [];
			});

		return { ...resolvedAttrs, id, isEditor: false, promotions };
	},
} satisfies BlockResolver<BlockFrontendProps, BlockAttributes>;
```

The resolver shrinks. No `unstable_cache` ceremony, no `useCache` ternary, no `.filter(isPromotionActive)` — the service composes that. `ServiceFactory.createPromotionService(site)` instantiates the service with its repo dependency in one place; the consumer stays the same shape it has today.

---

## Multi-Source Composition: Offer

`OfferService` is the case the current `dtoToOffer(GQLPromotionDTO | SPCOfferDTO)` discriminator fails. After the reshape:

```ts
// services/offer/mapping.ts
import type { IOffer } from "@frontend/lib/domain/offer";
import type { IPromotion } from "@frontend/lib/domain/promotion";

export function promotionToOffer(promotion: IPromotion): IOffer {
	return {
		__typename: "Offer",
		id: promotion.id,
		databaseId: promotion.databaseId,
		title: promotion.title,
		slug: promotion.slug,
		uri: promotion.uri,
		description: promotion.description,
		summary: null,
		images: promotion.featuredImage ? [promotion.featuredImage] : [],
		terms: null,
		discountAmount: null,
		discountType: null,
		startedAt: promotion.startDate,
		endedAt: promotion.endDate,
		equipment: [],
		weight: promotion.weight ?? 0,
		financeTable: null,
	};
}
```

```ts
// services/offer/OfferService.ts
import type { OfferRepository } from "@frontend/lib/data-access/offer/OfferRepository";
import type { PromotionRepository } from "@frontend/lib/data-access/promotion/PromotionRepository";
import type { IOffer } from "@frontend/lib/domain/offer";
import type { ISiteGlobals } from "@frontend/lib/contracts/site-globals";

import { promotionToOffer } from "./mapping";
import { sortOffersByWeight } from "./rules";

export class OfferService {
	constructor(
		private readonly spcRepo: OfferRepository,
		private readonly promoRepo: PromotionRepository,
		private readonly site: ISiteGlobals
	) {}

	async getItems(top?: number): Promise<IOffer[]> {
		const [spcOffers, promotions] = await Promise.all([
			this.spcRepo.getItems(top), // cached with POLLING_CACHE_TIME (no webhook)
			this.promoRepo.getItems(top), // cached with ON_DEMAND_CACHE_TIME (WP webhook)
		]);
		return sortOffersByWeight([
			...spcOffers,
			...promotions.map(promotionToOffer),
		]);
	}

	async getItemBySlug(slug: string): Promise<IOffer | null> {
		const [spc, promo] = await Promise.all([
			this.spcRepo.getItemBySlug(slug),
			this.promoRepo.getItemBySlug(slug),
		]);
		return spc ?? (promo ? promotionToOffer(promo) : null);
	}
}
```

What disappeared: the `OfferServiceRepository` union type, the `isGQLPromotionDTO` runtime discriminator, the `dtoToOffer(GQLPromotionDTO | SPCOfferDTO)` switch, and the `mapOfferImages` DTO-shape switch. Each repo handles its own source, returns its own domain model, and the service composes domain-to-domain. Cache invalidation cascades through repo-level tags — invalidating either `OFFERS` or `PROMOTIONS` produces fresh unified output on the next call.

This shape generalizes. A future `EquipmentService` that pulls inventory from a vendor SDK, pricing from a third-party API, and metadata from the CMS slots into the same pattern — three repos, three sources with their own cache policies, one service composing domain models. The discriminator anti-pattern only emerges when the seam isn't there to begin with.

---

## Type Contracts

| Layer                 | Type pattern                                             | Where it lives                                                                          |
| --------------------- | -------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Domain models         | `I<Entity>` (`IPromotion`, `IEvent`) — array fields are non-nullable; see `code-standards-ts.md` § Domain model arrays are non-nullable | `frontend/lib/domain/<entity>.ts`                                                       |
| Partial domain shapes | `I<Entity>Ref`, `I<Entity>Summary`                       | same file as the full shape                                                             |
| DTOs                  | `<Source><Entity>DTO` (`GQLPromotionDTO`, `SPCOfferDTO`) | `data-access/<entity>/<source>/` — internal                                             |
| Repository interface  | `<Entity>Repository`                                     | `data-access/<entity>/<Entity>Repository.ts`                                            |
| Repository class      | `<Source><Entity>Repository` (`GQLPromotionRepository`)  | `data-access/<entity>/<source>/<Source><Entity>Repository.ts`                           |
| Service class         | `<Entity>Service`                                        | `services/<entity>/<Entity>Service.ts` (no shared interface — declares its own surface) |
| Block component props | `<ComponentName>Props`                                   | with the component (per `component-props-decoupling`)                                   |

`I` prefix is retained for domain models for continuity with the existing codebase. The `interfaces/` folder rename to `domain/` is the only naming change at this layer; types themselves don't rename.

---

## Naming

- **Cached fetcher functions:** `fetch<Entity><Operation>` — `fetchPromotions`, `fetchPromotionBySlug`, `fetchPromotionsByCategory`. Top-level functions in `<entity>/<source>/fetchers/`.
- **Repository classes:** `<Source><Entity>Repository` — `GQLPromotionRepository`, `SPCOfferRepository`. Implements the per-entity `<Entity>Repository` interface.
- **Repository interface:** `<Entity>Repository` — `PromotionRepository`, `OfferRepository`. Lives at `data-access/<entity>/<Entity>Repository.ts`.
- **Mapper functions:** `map<Source><Entity>` — `mapGQLPromotion`, `mapGQLProductRef`, `mapSPCOffer`. Mappers that produce a partial shape append the partial type's suffix (`mapGQLProductRef` produces `IProductRef`, `mapGQLProduct` produces `IProduct`).
- **Domain → domain transforms:** `<source>To<target>` — `promotionToOffer`. These live in `services/<entity>/mapping.ts`.
- **Pure rules:** verb-prefixed predicates and transforms — `isPromotionActive`, `sortPromotions`, `hasPromotionStarted`. Live in `services/<entity>/rules.ts`.
- **Service classes:** `<Entity>Service` — `PromotionService`, `OfferService`. No shared interface; each class declares its own surface.
- **Service methods:** orchestration is verb-prefixed — `getActivePromotions`, `getProductCTAs`. Conventional pass-throughs (`getItems`, `getItemBySlug`) when the service has them.

---

## What Stays the Same

The reshape preserves more than it changes. Existing patterns that keep working:

- `ServiceFactory` survives as the consumer-facing entry point (`ServiceFactory.createPromotionService(site)`); internally it instantiates the repo class and the service class and wires them together.
- Service classes and repository classes both stay class-shaped. Block resolvers still call services and still apply DEFAULT_ATTRIBUTES. The resolver pattern itself doesn't change — what changes is what the resolver doesn't have to do (cache-wrapping, DTO-aware filtering).
- Domain models (`IPromotion`, `IEvent`) keep their shape. The type's location moves (`interfaces/` → `domain/`); the type itself doesn't.
- GraphQL queries, Apollo wiring, and `getClient` keep working as today.
- The repository pattern is preserved — narrowed and reshaped, not replaced.

---

## Migration Status

The codebase is migrating per-entity, opt-in with each touch. See `.claude/plans/epic-thr-1784.md` for the playbook and current entity status.

During migration, two patterns coexist. **All new DAL/service work follows this file** — new entities, new sources, new substantial operations. Existing code stays as-is until its entity is migrated. When the migration completes (`IContentService<T>` and `IDataAccessLayer<T>` have no implementers), the legacy interfaces get deleted and `frontend-services.md` and `frontend-blocks.md` get the cleanup pass.

The boundaries between "new work uses the target shape" and "existing code stays untouched" are codified in `.claude/rules/data-layer-boundaries.md`, which also defines the patterns Eric and Briar flag at PR review.

---

## Boundary Enforcement

The architecture only holds if the seams hold. Apollo imports outside `data-access/`, raw GraphQL queries in resolvers, DTOs leaking into services — every one of these is a hidden coupling that survives until the next migration or schema change. The boundary rule (`.claude/rules/data-layer-boundaries.md`) defines:

- Hard prohibitions (what's allowed only inside `data-access/`).
- Allowed crossings (interface imports, type-only imports, factory wiring).
- A scope rule for new vs. existing work (new DAL work always uses the target shape; existing code stays until per-entity migration touches it).
- A review checklist with concrete remediation language Eric and Briar can use.

When loading data-layer context, load the boundary rule too — they're a pair. The architect file describes the shape; the rule keeps it intact.
