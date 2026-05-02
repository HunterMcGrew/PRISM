# Data Layer Boundaries

The data layer separates source-coupled work (Apollo queries, REST calls, SDK calls, DTO mapping) from source-agnostic work (domain logic, composition, page resolution). The seam only works if it's enforced — when source-coupled code lands outside the data-access layer, the architecture's promises collapse silently and the cost compounds quietly until the next migration or schema change.

This rule defines the boundaries, when the new pattern applies, and what to flag at PR review. For the architectural target shape and rationale, see `.claude/architect/data-layer.md` and ADR-0021.

---

## Scope: when this rule applies

The data layer is migrating per-entity from a drifted state to the target shape in `.claude/architect/data-layer.md`. Two scopes coexist during the transition.

**Existing entities, unchanged code paths.** Stay on the current shape. Don't refactor on sight. Per-entity migration absorbs into routine touches per `.claude/plans/epic-thr-1784.md`.

**All new DAL/service work follows the new strategy.** Specifically:

- A new entity (no existing service or repo for this domain) — start in the target shape from day one.
- A new data source for an existing entity (third-party API, vendor SDK, additional CMS, internal service) — add the new `<entity>/<source>/` peer folder under the target shape; existing sources for that entity can stay until their own migration touch.
- A new significant operation that warrants its own fetcher and service method — add it in the target shape under a new `<entity>/<source>/fetchers/` module. Don't pile new logic onto a legacy `dtoTo*` method or static service mapper.
- A new GraphQL query that lives outside an existing repository's queries — the query belongs in `data-access/<entity>/<source>/queries/`, not loose in a service or block resolver.

**Judgment call: extending an existing service method.** A small parameter addition or filter tweak to a method in an un-migrated service stays in the old shape — that's a routine touch, not new DAL work. A substantial new operation (a new fetcher pattern, a new source, multiple new methods) is the signal that the entity should migrate as part of the work. When in doubt, lean toward the new shape — the migration was always going to happen, doing it during a substantial change is cheaper than doing it as a separate ticket later.

**Why scope matters:** without a clear "new work uses the new shape" rule, the legacy patterns reproduce themselves. Every new fetcher added to an old service is a future migration cost. Stopping the new violations is more important than fixing the existing ones.

**How to apply:** before adding data-access code, check whether the entity has been migrated (look for `<entity>/<source>/` folder structure with top-level fetchers, vs. the legacy `<protocol>-<entity>/` flat folder). New entities and new sources go straight to the target shape regardless.

---

## The dependency graph

```
domain/                                 ← depends on nothing in the data layer
  ↑
data-access/<entity>/<source>/          ← depends on domain + source clients (Apollo, fetch, SDKs)
  ↑
services/<entity>/                      ← depends on data-access via the per-entity repository interface
  ↑
routing/, blocks/, components/, app/    ← depends on services (via ServiceFactory)
```

Imports flow up. They never flow down or sideways.

---

## Hard prohibitions

These imports and patterns are allowed only inside `frontend/lib/data-access/`. Anywhere else in the codebase, they're a boundary violation.

- **Runtime `@apollo/client` imports** — the client construction and query execution belong in repositories. (Type-only `import type { ApolloClient } from "@apollo/client"` in factory wiring is fine — it doesn't pull runtime.)
- **`getClient` from `@frontend/lib/wp/connector`** — only data-access fetchers should construct Apollo clients.
- **`gql\`...\`` template literals** — raw GraphQL query definitions belong in `data-access/<entity>/<source>/queries/`.
- **DTO type imports (`GQL*DTO`, `SPC*DTO`, etc.)** — DTOs are internal to their `<entity>/<source>/` folder. Consumers see domain models from `lib/domain/`, never DTOs.
- **Direct `fetch()` to GraphQL or REST endpoints with hardcoded URL fragments** — protocol I/O belongs in repositories.

**Why:** every one of these in the wrong place creates a hidden coupling that survives until the next CMS migration, third-party API swap, or schema change — at which point the cost compounds. The seam is what protects the codebase from those costs. See ADR-0021 for the full rationale.

**How to apply:** when you need data, find the entity's service via `ServiceFactory.create<Entity>Service(site)`. If the service doesn't have the operation you need, add it as a method on the service that calls a fetcher in the data-access layer — don't reach past the service to Apollo. If no service or repo exists for the entity, both need to be created — see `data-layer.md` for the shape.

---

## Review Rules

When reviewing a PR (Eric on the PR; Briar in self-review before push), flag these patterns. The review comment should always offer the alternative — point at the remediation, not just the violation.

| Pattern                                                                                        | Where it shows up                                 | Flag with                                                                                                                                                                                                                                 |
| ---------------------------------------------------------------------------------------------- | ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `import ... from "@apollo/client"` (runtime)                                                   | Anywhere outside `frontend/lib/data-access/`      | "Apollo client usage belongs in the data-access layer. Use `ServiceFactory.create<Entity>Service(site)` to fetch through the existing repo, or add a new fetcher in `data-access/<entity>/<source>/` if the operation doesn't exist yet." |
| `import getClient from "@frontend/lib/wp/connector"`                                           | Outside `data-access/`                            | Same as above.                                                                                                                                                                                                                            |
| `gql\`...\`` template literal                                                                  | Outside `data-access/<entity>/<source>/queries/`  | "Raw GraphQL queries belong in `data-access/<entity>/<source>/queries/`. Move the query there and call it through a fetcher."                                                                                                             |
| `import { ...DTO }` (any `GQL*DTO`, `SPC*DTO`, etc.)                                           | Outside the DTO's own `<entity>/<source>/` folder | "DTOs are internal to the data-access layer. Service code should only see domain models (`I*` types from `lib/domain/`)."                                                                                                                 |
| Service method that constructs `new ApolloClient(...)` or calls `getClient(...)`               | Inside `services/`                                | "Services should never construct clients. Inject the repo via `ServiceFactory`, which wires up the source."                                                                                                                               |
| Block resolver that calls `getClient(...).query(...)` or imports Apollo directly               | Anywhere in `frontend/blocks/`                    | "Resolvers fetch through services. Use `ServiceFactory.create<Entity>Service(site).<operation>(...)`. If the operation doesn't exist, add it to the service."                                                                             |
| `fetch("/graphql"...)` or similar hardcoded protocol URL                                       | Outside `data-access/`                            | "Direct protocol I/O belongs in the data-access layer."                                                                                                                                                                                   |
| New fetcher added to a legacy service's `dtoTo*` method or static mapper                       | Existing services during new work                 | "New DAL work follows the target shape per `data-layer-boundaries.md` § Scope. Add the fetcher as a top-level module function in `data-access/<entity>/<source>/fetchers/` and have the service call it."                                 |
| New source for an existing entity added without the `<entity>/<source>/` peer folder structure | New integration work                              | "New sources land in the target shape — create `data-access/<entity>/<new-source>/` with the named repository class file (e.g. `<Source><Entity>Repository.ts`), `fetchers/`, `mappers/`, and `queries/` per `data-layer.md`."            |

**Severity guidance:** boundary violations are major (block merge) when they introduce new coupling that propagates — Apollo imports outside data-access, DTOs leaking into services, GraphQL queries in resolvers. They're minor (request-changes) when they're contained extensions of existing legacy patterns that future migration will absorb anyway. The scope rule above helps distinguish: new DAL work in the wrong shape is major; small extensions to existing legacy code are minor.

**Why review enforcement matters:** these patterns compile and run correctly. Tests pass. A "this works" PR drifts the architecture without anyone noticing — until the cost surfaces months later as a tangled service or a slow page. Issue #1096 (Apollo connection added without a DAL entry) is the canonical example: the code worked, the change shipped, and the architectural debt was invisible until the next person tried to extend the entity. PR review is the only enforcement layer until ESLint rules or codemod tooling can catch this at write time. The reviewer carries the boundary's reliability.

**How to apply at review:** scan the diff for the patterns above. For any match, leave a single comment that names the violation, cites this rule, and points at the remediation. If the diff has many violations, request changes once with a summary list — don't comment-spam every line.

---

## Allowed crossings

These imports are explicitly fine and shouldn't be flagged:

- **Service files importing from `data-access/<entity>/<Entity>Repository.ts` (the interface)** — services depend on the repository contract, that's the seam working as designed.
- **`ServiceFactory` importing from `data-access/<entity>/<source>/<Source><Entity>Repository.ts`** — the factory is the wiring layer; it's allowed to construct concrete repository classes (`new GQLPromotionRepository(site)`) and inject them into service constructors.
- **Type-only imports** of `ApolloClient<unknown>` in factory wiring or repo construction (`import type { ApolloClient } from "@apollo/client"`) — type-only imports don't pull runtime.
- **Test fixtures and tests inside `data-access/<entity>/<source>/__tests__/`** — tests are part of the layer they test.
- **Legacy service code that hasn't been migrated yet** — un-migrated entities still importing DTOs and calling other services' static mappers are part of the existing shape, not new violations. Don't flag in review unless the PR is making the violation worse.

---

## Future enforcement

Review-time checks catch violations after they're written. An ESLint rule (or set of rules) could catch them at write time:

- `no-restricted-imports` to ban `@apollo/client` and `getClient` outside `data-access/`
- `no-restricted-syntax` to ban `gql` template literals outside `data-access/<entity>/<source>/queries/`
- A `data-access`-scoped path import boundary (similar to `eslint-plugin-boundaries` or `import/no-restricted-paths`)

Worth tracking as follow-up work once the data-layer reshape has migrated enough entities to make the boundaries concrete in code. Until then, this rule + reviewer attention is the enforcement layer.
