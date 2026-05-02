# Frontend Contracts

Architect context for `frontend/lib/contracts/`. Holds application contracts, runtime context, external system mirrors, and UI primitives — type-shaped agreements between layers or systems.

The split between `contracts/` and `domain/` is the decision rule from `data-layer.md` § Folder Structure: would a non-technical PM recognize this as a thing the business has? Yes → `domain/`. No → `contracts/`. Contracts describe how layers and systems agree on shape; domain describes the business itself. Domain types change when the business changes; contract types change when the system architecture changes.

For typing rules see `.claude/rules/code-standards-ts.md`. For the broader data-layer architecture and where domain types live, see `data-layer.md`.

---

## What goes here

| File                       | Role                                                                                                                                          |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `block.ts`                 | Block system types — `BlockResolver`, `BlockRegistration`, `BlockProcessingContext`, `IPostBlock`, `BaseBlockProps`, `ResolveProps`, `ResolvedBlock` |
| `block-attributes.ts`      | WP attribute-shape mirrors — `BlockStyle`, `BlockBorderProps`, `BlockLayout`                                                                  |
| `render-context.ts`        | Runtime context — `RenderContext`, `RenderEnvironment`, `RenderPolicy`, `AccessLevel`                                                         |
| `site-globals.ts`          | Site runtime config — `ISiteGlobals` plus theme, feature-flag, and inventory-settings shapes                                                  |
| `site-settings.ts`         | WP-emitted shape mirrors — `IWordPressGlobalSettings`, `ISiteSettings`, theme and WooCommerce settings                                        |
| `no-items-config.ts`       | UI primitive — `NoItemsConfig` and `DEFAULT_NO_ITEMS_CONFIG`                                                                                  |
| `responsive-values.ts`     | UI primitive — `IResponsiveNumber`                                                                                                            |
| `index-record.ts`          | Search index contract — `IndexRecord`                                                                                                         |
| `index-sort-by-item.ts`    | InstantSearch shape mirror — `SortByItem`                                                                                                     |
| `content-service.ts`       | Legacy generic — `IContentService`. Slated for deletion in Story 5 of THR-1784; lives here for consistency with other generic application-layer types until then. |
| `data-access-layer.ts`     | Legacy generic — `IDataAccessLayer`. Same disposition as above.                                                                                |

Entity types — `IPromotion`, `IEvent`, `ILocation`, `ICard`, etc. — live in `frontend/lib/domain/`. If you're reading or writing domain code, the architect context for that lives in `data-layer.md`.

---

## Conventions

- One file per contract concern. Types only — no logic, no components.
- Constants that define defaults stay alongside the type (e.g. `DEFAULT_NO_ITEMS_CONFIG` next to `NoItemsConfig`).
- Use `satisfies Record<ContractType, ValueType>` on local mappings that conform to a contract. Drift between the contract and the mapping is caught at compile time. See `code-standards-ts.md` § Modeling external contracts for the rule and the canonical example.

---

## Block system types

`block.ts` is the central type file for the block resolution pipeline:

- `BlockResolver<Props, Attrs, Meta>` — the contract a `resolver.ts` file satisfies
- `BlockRegistration<Props>` — wiring stored in `block-registry.ts`. Uses `NoInfer<Props>` on the resolver to prevent inference from narrowing the view's props
- `BlockProcessingContext<Attrs, Meta>` — input provided to resolvers
- `IPostBlock<Attrs, Meta>` — WP block shape from the CMS. `attrs` can be `[]` when no attrs are saved — a known WP quirk that consumers must handle
- `ResolveProps<Props, Attrs, Meta>` — type for `resolver.props.ts` shared functions
- `BaseBlockProps` — always provided to block components by `BlocksRenderer`
- `ResolvedBlock` — output of `BlockService.resolveBlock()`

---

## WP attribute mirrors

`block-attributes.ts` names the shapes WP serializes into block attributes. WP doesn't ship TS types for these (and frontend can't import from `@wordpress/*` even when it does — imports only flow backend→frontend in this repo), so the contract is modeled here. The decision direction matters: the type owns the vocabulary, local mappings conform to the type via `satisfies`. See `code-standards-ts.md` § Modeling external contracts for the full rationale and the right-direction / wrong-direction examples.
