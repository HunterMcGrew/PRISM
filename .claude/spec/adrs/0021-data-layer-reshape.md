---
Number: 0021
Title: Data Layer Reshape — Repos Own Hydration, Services Own Domain Logic, Caching Lives Where Lifetime Is Determined
Status: accepted
Date: 2026-04-28
---

## Context

The current data layer at `frontend/lib/services/` and `frontend/lib/data-access/` started with the right instincts — service-repository, protocol-prefixed repos, DI through `ServiceFactory` — but several boundaries have drifted in ways that compound as the codebase grows. The drift surfaces in everyday work: code review takes longer because PRs cross unrelated layers; tests for domain logic require setting up Apollo mocks they shouldn't need; bug fixes in one service ripple into others through static method calls; new data source integrations (SPC offers, future REST APIs, future third-party SDKs) have no obvious home and end up tangled into existing services.

Three concrete drift problems:

**Mappers live on the service.** `EventService.dtoToEvent`, `PromotionService.dtoToPromotion`, and `OfferService.dtoToOffer` import `GQL*DTO` types directly. `PromotionService.dtoToPromotion` calls `ProductService.dtoToProduct` and `CallToActionService.mapCTAsListDTO` as static methods — three services pass GraphQL DTOs to each other through static method calls. Protocol details are scattered across the layer that was supposed to insulate the codebase from them. A bug in promotion DTO mapping requires touching the promotion service, which means a code review of business logic that has nothing to do with the bug. A new data source for the same entity has nowhere to plug in without duplicating the service's domain logic. And when WordPress is eventually replaced (or augmented with a second source for any entity), every `dtoTo*` method and `GQL*DTO` import becomes work.

**The shared interfaces are fictional.** `IContentService<T>` requires `getRouteData` and `getItemById`; several services throw "not implemented" for these. `IDataAccessLayer<T>` requires `getNames`, which most repos throw on. `EventService.getItemsByIds(ids: number[], includeAll: boolean)` diverges from the interface signature entirely. The compiler accepts the lie because TypeScript can't enforce method bodies. New developers reading the code can't tell which methods are real contracts and which are decorative — the interface stops being a reliable signal about what the layer guarantees.

**Caching is in the wrong place and the convention is already drifting.** The architect doc at `frontend-services.md:111` claims caching lives at the resolver. In practice, `CallToActionService.getCTALists` and `lib/rsc/fetchers.ts` both wrap services in `unstable_cache` directly, and the resolver-level wrappers vary in shape — some include attrs in the cache key, some don't. The drift was the direct cause of THR-1778 (promotion detail page slowness from a missing fetcher wrapper). `OfferService` is the structural worst case: it composes SPC offers (polling-based, no webhook) with CMS promotions (webhook-driven on-demand revalidation), and a single resolver-level cache wrapper can't honor both source policies at once. As more multi-source operations land — and they will, because real CMS work increasingly composes data from third-party APIs, vendor SDKs, and internal services — every one of them hits the same wall.

The existing layout also makes data source isolation worse than it needs to be: protocol prefix as the top-level partition (`gql-event/`, `gql-promotion/`) means a new data source for any existing entity creates N more sibling folders next to the GQL ones. Entity-first (`event/gql/`, `event/spc/`, `event/wix/`) keeps the entity as the primary axis and treats the protocol as a local detail of the entity's data access — which is what it actually is.

These aren't all the same problem, but they share a root cause: the layer's responsibilities aren't separated cleanly. Mapping (protocol-coupled), domain logic (protocol-agnostic), and caching (source-revalidation-coupled) all share methods on the same class. The cost shows up in code review, testing, onboarding, and every new data source integration — not just at migration time. A clean architecture pays its rent every day; the migration is one of the days where the rent is largest.

## Decision

Reshape the data layer along four axes. Each axis stands on its own; together they restore the seam that service-repository was always meant to provide.

**Mapping moves into the data-access layer.** Every `dtoTo*` method moves from its service to a pure function in `data-access/<entity>/<source>/mappers/`. DTOs become internal to the data-access layer and never escape. Mappers can call other mappers freely within the layer. Cross-service static mapper calls (`PromotionService.dtoToPromotion` → `ProductService.dtoToProduct`) become module imports between mapper files — same composition, but the source coupling stays where the source lives.

**Repos and services are both classes.** Repositories are classes implementing per-entity `<Entity>Repository` interfaces (`GQLPromotionRepository implements PromotionRepository`). Services are classes that take repos and other collaborators via constructor injection. Both ends of the data layer use the same shape — interface + class + constructor injection — which matches the standard layered-OO mental model the team reads on first scan (.NET, Java Spring, NestJS).

The `"use cache"` directive constraint (Next.js 16) only allows the directive on top-level module functions, not class methods. We honor that by keeping the cached I/O in **top-level fetcher modules** at `data-access/<entity>/<source>/fetchers/`. The repository class methods are thin wrappers — `getItems(top)` calls `fetchPromotions(this.site, top)` and returns the result. The class binds `site` once via the constructor; the cache primitive lives where Next.js requires it. This split is internal to the data-access layer; consumers see a uniform class shape end to end.

**No shared `ContentService<T>` interface.** An earlier draft proposed a narrow shared service contract (`getItems`, `getItemBySlug`). It was rejected because services don't actually share a useful uniform shape beyond pass-through methods, and forcing them under one interface reproduces the original `IContentService<T>` problem of pretending uniformity that isn't real. Each service class declares its own surface honestly. The uniform contract belongs at the repository level — `<Entity>Repository` interfaces are where polymorphism actually lives (one shape, multiple sources). Pure domain rules (`isPromotionActive`, `sortPromotions`) live in `services/<entity>/rules.ts` as free functions — no `this`, no mocks needed for tests. `getRouteData` leaves services entirely and becomes its own routing layer; pages aren't a content concern.

**Caching lives at the layer where lifetime is determined.** Cache lifetime is a property of the source, not the domain — WordPress can support `ON_DEMAND_CACHE_TIME` because it invalidates via webhook, third-party APIs like Space Station can only support `POLLING_CACHE_TIME` because there's no signal back. Caching at the service forces one policy across all sources of a unified result; caching at the repo lets each protocol declare the policy its source actually supports. Composition over already-cached reads is cheap. Today caching uses `unstable_cache` inline in top-level fetcher modules; on Next.js 16, the same modules adopt the `"use cache"` directive — the function shape was designed to make that migration a codemod, not a refactor.

## Consequences

- **Positive:** data source logic stops scattering across the codebase. New integrations — third-party APIs, vendor SDKs, additional CMS sources, internal services — have an obvious home in `data-access/<entity>/<source>/`. They don't tangle with existing services and they don't require touching domain logic to land.
- **Positive:** code review slows fewer PRs. Protocol changes don't cross into service code; service changes don't cross into protocol code. Reviewers can focus on one layer at a time, and bug fixes don't accidentally widen scope into adjacent concerns.
- **Positive:** tests get cheaper to write. Domain rules in `services/<entity>/rules.ts` are pure functions tested with fixtures — no Apollo mocks, no service instantiation. Repos are tested with HTTP mocks against a known DTO shape — no business logic to set up. The seam makes each layer testable on its own terms.
- **Positive:** `OfferService` and any future multi-source service can compose sources with different revalidation guarantees correctly. Each repo caches with its source's appropriate lifetime; the unified service composes already-cached reads.
- **Positive:** the `"use cache"` migration becomes a codemod. Fetchers are already top-level functions with serializable args, so adopting the directive is mechanical when Next.js 16 stabilizes.
- **Positive:** fictional interfaces go away. `IContentService<T>` and `IDataAccessLayer<T>` are deleted. Service classes declare their own per-entity surface honestly; the uniform contract moves to per-entity `<Entity>Repository` interfaces, where polymorphism actually lives. New developers reading the layer get contracts that mean what they say.
- **Positive:** entity-first layout absorbs new data sources cleanly. Adding a vendor SDK for offers, a REST API for inventory, or a second CMS for any entity adds a peer folder next to `gql/` — the entity stays the primary axis and the layer stays scannable.
- **Positive:** WordPress migration when it eventually happens is a downstream beneficiary, not the central rationale. The work to swap CMSs becomes "implement a new repo per entity" instead of "rewrite the data layer." Same payoff applies to any future source swap.
- **Negative:** the reshape touches every entity. It can't ship as one PR; it has to be per-entity work absorbed into routine touches, and that takes time. The codebase lives with two patterns side by side during the transition. The plan codifies the per-entity sequencing.
- **Negative:** partial domain shapes (`IProductRef` for embedded promotion data, etc.) become a real consideration. We can defer them per-case, but they're now a recurring design question instead of a hidden bug — which is itself an upgrade, just one that needs developer attention.
- **Neutral:** the split between class methods (the public repo API) and top-level fetcher functions (the cache primitive) is internal to the data-access layer. Consumers never see it. New devs adding a fetcher need to know to put it in `<entity>/<source>/fetchers/` and have the repo class delegate — the architect file and dev doc make this explicit.
- **Neutral:** the service layer keeps existing — both as a folder and as a class shape — but it does less. Most of what services do today is pass-through (after the move) or pure rules (after the extract). What's left is the orchestration that justifies the layer.

## References

- `.claude/architect/data-layer.md` — the target shape (folder structure, types, patterns).
- `.claude/plans/epic-thr-1784.md` — migration playbook and per-entity sequencing.
- `.claude/architect/frontend-services.md` — current shape; will be updated to point at the new target as the migration progresses.
- `.claude/architect/frontend-blocks.md` — current resolver caching examples; same.
- `.claude/rules/headless-architecture.md` § Supplementary fetchers must be cached — the bug class this reshape eliminates by co-locating caching with I/O.
- THR-1778 — promotion detail page slowness; example of cache-policy drift from missing wrappers.
