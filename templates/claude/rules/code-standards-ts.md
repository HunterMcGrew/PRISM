---
description: TypeScript coding standards — types, data flow, naming, blocks, server/client
paths:
  - frontend/**
  - backend/plugins/gravity-platform-core/src/**
---

# TypeScript Standards

## Type System

Four type layers, each with a distinct role:

1. **Domain models** (`I` prefix) — domain entity types in `frontend/lib/domain/`. One file per entity. Types only, no logic. Application contracts (`BlockResolver`, `RenderPolicy`, `ISiteGlobals`, etc.) live in `frontend/lib/contracts/` per the split documented in `data-layer.md`.
2. **DTOs** (`{Protocol}{Entity}DTO`) — raw API response shapes in `frontend/lib/data-access/`. Must reflect what the API actually returns — optional fields for data only present in some queries.
3. **Props** (`{ComponentName}Props`) — what a component needs to render. Must be decoupled from `BlockAttributes` — see `component-props-decoupling` rule and `frontend-components.md` architect context.
4. **BlockAttributes** — what WordPress stores. Defined in `schema.ts`. Resolvers receive attrs as `Partial<BlockAttributes>` since WordPress omits values matching defaults.

**How they connect:** `DTO → dtoTo*() mapper in service → domain model → resolver → Props`

- `any` is not allowed. Use `unknown` for genuinely unknown values and narrow with type guards.
- Do not widen types to silence errors.
- Avoid `as` unless justified.
- Do not use non-null assertions (`!`). Guard nullable values with conditionals.
- Use runtime validation at trust boundaries (API, CMS, user input).
- Always define a named type for component props — never inline in a function signature. Never use generic `Props` or `BlockFrontendProps`.

### Modeling external contracts

When a vocabulary or shape comes from an upstream system (WordPress, browser APIs, external libraries, CMS fields) and that system does not ship a TypeScript type you can import, **model the contract as a named type in our codebase**. Do not derive the type from a local constant that happens to use the same values.

**For WordPress contracts specifically, the frontend always models** — `frontend/` does not import from `@wordpress/*` (imports only flow backend→frontend in this repo). The editor side (`backend/plugins/.../src/`) can and does import WP types directly (`BlockEditProps`, `BlockSaveProps`, `BlockRegistration`); the frontend cannot. So for any WP contract landing in frontend code, the modeling pattern below is the only option, not a fallback for when WP didn't ship a type.

- The upstream system is the stable source of the vocabulary; local constants that use the vocab are transient (they may be renamed, split, restructured, or replaced).
- Deriving via `keyof typeof localMapping` couples the type to that mapping's name and structure. When the mapping changes, every consumer of the derived type breaks.
- Use `satisfies Record<ContractType, ValueType>` on the local constant so it conforms to the contract. Drift is caught at compile time — add a key to the mapping without adding it to the type (or vice versa) and TypeScript errors.
- JSDoc the type with its upstream source ("Mirrors the values emitted by X", "Matches the shape returned by Y API") so future readers know where the contract actually lives and when the type needs updating.

**Example — right direction (external contract modeled, local mapping conforms):**

```ts
/**
 * Mirrors the values emitted by WordPress's BlockAlignmentToolbar component.
 * WP doesn't ship a TS type for this — we model the contract here.
 */
export type BlockToolbarAlignment =
	| "left"
	| "center"
	| "right"
	| "wide"
	| "full";

export const BLOCK_ALIGNMENT_MAPPINGS = {
	left: "items-start",
	center: "items-center",
	right: "items-end",
	wide: "items-stretch",
	full: "items-stretch",
} as const satisfies Record<BlockToolbarAlignment, string>;
```

**Example — wrong direction (type chained to transient local mapping):**

```ts
// Anti-pattern — if the mapping gets renamed, every consumer of the type breaks.
// Also inverts the dependency — the mapping is saying what the vocab IS, when
// actually the vocab is upstream and the mapping just happens to use it.
export type BlockToolbarAlignment = keyof typeof BLOCK_ALIGNMENT_MAPPINGS;
```

**When `keyof typeof` derivation IS correct:**

When the constant exists specifically to enumerate a vocabulary our codebase owns, derive from it — the constant IS the source of truth. `OEM_SLUGS` and `OEMSlug` in `frontend/lib/constants/theme.ts` are the canonical example:

```ts
export const OEM_SLUGS = ["kubota", "john-deere"] as const;
export type OEMSlug = (typeof OEM_SLUGS)[number];
```

**The distinction:** does the constant exist to _define_ the vocabulary (derive from it) or to _process_ values of a vocabulary owned upstream (use a named type that models the source)?

See `.claude/architect/frontend-constants.md` § Source-vocab translation for the applied pattern with alignment mappings. The developer-facing how-to lives in `docs/content/dev/standards/code-standards.md` § Modeling External Vocabularies; the conceptual framing is in `docs/content/dev/architecture/headless-architecture.md` § Data Contracts.

### Domain model arrays are non-nullable

Arrays on domain models (`I*` types in `frontend/lib/domain/`) are typed as `T[]`, never `T[] | null` and never `T[] | undefined`. When the upstream source can return null for a list, normalize to `[]` at the boundary mapper, not at the consumer.

**Why:** This rule keeps a class of runtime crashes off the codebase entirely. Consumers iterate, `.find`, `.filter`, `.map`, or `.includes` on domain arrays without defensive checks because the type contract guarantees the array exists. Pushing array nullability into the domain shape regresses every consumer toward defensive coding that only sometimes happens — proven by THR-1794, where `IMenu.locations: string[]` was lying about WP's actual response and three of six menu resolvers crashed in production when the lie broke. A nullable domain array is a contract violation waiting for the right combination of inputs to surface; once the rule is in place, the type system enforces the invariant and the bug class disappears.

**How to apply:**

- DTOs (in `frontend/lib/data-access/<entity>/<source>/`) carry the honest source shape — `T[] | null` if the source can actually return null.
- Mappers (`mapGQL*`, `mapSPC*`, `dtoTo*`) normalize the array. The pattern is `arr: dto.arr ?? []`.
- Domain models (`I*`) declare `T[]`. Always. No exceptions. If the empty-array case is meaningful and an empty array can't carry it (e.g. "field was never set" vs "field was explicitly cleared"), model that distinction with a separate field — never overload it onto array nullability.
- At PR review, Eric and Briar flag any new domain field typed `T[] | null` (or `T[] | undefined`). Remediation: move the nullability to the DTO and normalize in the mapper.

**Scope:** Applies to all domain interfaces (`I*` types) regardless of where they live during the data-layer migration. Does not apply to DTOs (which honestly mirror the source), `BlockAttributes` (which use `Partial<>` because WP omits defaults), or component `Props` (which have their own decoupling discipline). Other nullability questions on domain models — single optional fields, union types, discriminated unions — are not in scope here; this rule is specifically about the array shape that produced THR-1794.

`.claude/architect/data-layer.md` describes the seam where this rule is enforced (DTOs internal to data-access, mappers as the boundary, domain models clean for consumers).

### Discriminated unions over sibling flags

When a boolean state field starts collecting siblings to encode the _reason_ for the state — `isOpen: boolean` getting joined by `wasUserTriggered: boolean`, `wasAutoOpened: boolean`, etc. — collapse to a discriminated union. Single field, the type system enforces legal states, no flag-sync drift.

**Why:** THR-1625 surfaced this on the migrate-modal. The original `isMigrateModalOpen: boolean` conflated two entry points (auto-open on first load with a "don't show again" checkbox vs manual click from a header button). Adding `wasAutoOpened: boolean` next to it would have introduced a state-sync invariant the type system can't enforce — both fields can drift, get out of sync, or contradict. The discriminated-union refactor (`migrateModalTrigger: "auto" | "manual" | null`) collapsed two fields into one and made invalid states unrepresentable.

**How to apply:** Watch for the smell — a boolean state with one or more sibling booleans that record why the boolean is what it is. Refactor to a discriminated union: the union's discriminator names the reason; `null` (or a `null` member of the union) represents the negative case. Bonus: components rendering only in specific states (e.g. checkbox shown only on auto) gate on the discriminator (`if (trigger === "auto")`) and disappear from the DOM when the discriminator differs — clearer than a separate `showCheckbox` boolean.

```ts
// Before — two booleans drifting
type State = {
	isOpen: boolean;
	wasUserTriggered: boolean;
};

// After — one field, type-system-enforced
type State = {
	trigger: "auto" | "manual" | null; // null = closed
};
```

## Data Flow

Three-tier architecture:

```
ServiceFactory → Service → Repository → GraphQL/API
                    ↓
                Domain Model (via DTO mapping)
```

- **ServiceFactory** — static factory, creates services. Never imported in `"use client"` files.
- **Services** — implement `IContentService<T>`. Transform DTOs to domain models via private `dtoTo*()` methods. Error handling: catch, wrap with context, re-throw.
- **Repositories** — implement `IDataAccessLayer<DTO>`. Protocol-prefixed (`GQL*`, `SPC*`). Return `null` on not found, throw on error.
- **Mappers** — pure functions. Shared mappers in `frontend/lib/mappers/`, domain-specific in their service directory.

## Async Patterns

- Services/resolvers: always `async/await`. Catch errors and wrap with context before re-throwing.
- Route handlers: return proper `Response` status codes and typed JSON.
- Client-initiated fetches: call route handlers (`/api/...`), never import server-only libraries. Use `AbortController` for cancellation.
- See `use-effect-guidelines` rule for effect-specific async safety.

## Naming

- **Functions**: camelCase, must start with a verb — `filterItems`, `validateInput`, `checkPermission`
- **Event handlers**: `handle` prefix — `handleLinkChange`, `handleImageSelect`. `on*` is reserved for callback prop names.
- **Type guards**: `is` prefix allowed by convention — `isLinkObject`, `isLinkTarget`
- **Interfaces**: `I` prefix — `IPost`, `ILocation`, `IEmployee`
- **DTOs**: `{Protocol}{Entity}DTO` — `GQLEventDTO`, `SPCOfferDTO`
- **Props**: `{ComponentName}Props` — `HeroCarouselProps`, `ProductCardProps`
- **Components/filenames**: PascalCase — `ProductCard.tsx`, `HeroCarousel.tsx`
- **Other filenames**: kebab-case — `site-settings.ts`, `block-registry.ts`
- **Constants**: UPPER_SNAKE_CASE — `CARD_DEFAULT_HEADING_LEVEL`, `DEFAULT_PLACEHOLDER_IMAGE`
- **Variables**: noun-based camelCase, never contain a verb. Singular for single items, plural for collections.

## Blocks

- `schema.ts` must export `BlockAttributes` and `DEFAULT_ATTRIBUTES`.
- `block.json` is for WordPress-native features only (typography, alignment, etc.); custom block attributes are defined in the block's index via `schema.ts`.
- Resolvers (`resolver.ts`) handle server-side data fetching. Only break out `resolver.props.ts` when the block editor also needs that prop logic. Consider splitting into multiple files only when you have both a props and children resolver and each exceeds ~200 lines.
- Block components live in `frontend/components/`, not `frontend/blocks/`. The block directory holds only CMS wiring (schema, resolver, view wrapper).
- Before creating a new component, search `frontend/components/utility/` and `backend/.../components/` for existing reusable ones.
- For editor-only interactive UI, follow the Promotions block pattern: shared RSC with `isEditor` + `children`; backend `edit.tsx` passes editor UI as children. See `headless-architecture` rule.

## Server / Client

- **RSC-first**: all new components are React Server Components by default. Only add `"use client"` for leaf components needing interactivity, hooks, or browser APIs.
- Do not access DOM APIs unless explicitly requested.
- `ServiceFactory` and `@apollo/client` must never appear in the import tree of a `"use client"` file. Use route handlers for client-initiated fetches.
- Components using any React hook must have `"use client"` — do not rely on a parent's directive.
- See `headless-architecture` rule for full RSC-first design guide, import direction, and `next/dynamic` code splitting.

## WordPress Editor Data

- `select("core").getEntityRecords()` returns implicit `any` from `@wordpress/core-data`. Always cast the return value with an explicit type: `as WPPost[] | null`, `as WPTaxonomyEntity[] | null`, etc.
- WordPress entity types live in `backend/plugins/gravity-platform-core/src/types/` and are exported from the barrel (`index.ts`). Existing types: `WPPost`, `WPTaxonomyEntity`, `WPMedia`, `WPEvent`.
- If no matching type exists for the entity being fetched, create one in `src/types/wordpress-{entity}.ts` following the existing pattern. Prefer reusable types (`WPPost`) over block-specific ones (`WPLocationPost`) when the shape matches the standard WordPress REST API response.
- The same rule applies to any `@wordpress/data` selector that returns untyped data — always cast or narrow before use.

## Tests

- **Jest** + **React Testing Library** for logic, resolvers, services, type guards.
- **Storybook stories are mandatory** for every component and block touched in a PR — visual regressions are caught by Chromatic, not Jest.
- Tests live in `__tests__/` colocated with source. Shared fixtures in `frontend/__fixtures__/`.
- Run tests: `pnpm run test <filename>` from the `frontend` directory.
- See `frontend-tests.md` architect context for patterns, fixtures, and mocking conventions.
