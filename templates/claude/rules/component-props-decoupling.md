---
description: Decouple component Props from CMS BlockAttributes — components define own data requirements
paths:
  - frontend/blocks/**
  - frontend/components/**
---

# Component Props Decoupling

## Status: In Progress (THR-1452)

Block components are being migrated to define their own Props types independently of CMS `BlockAttributes` schema types. The full transition is tracked in **THR-1452**. This is a gradual migration — follow this pattern for new blocks and when touching existing blocks.

## The Problem

Most block components currently define Props by extending or directly using `BlockAttributes`:

```ts
// Coupled — component inherits CMS optionality
import type { BlockAttributes } from "./schema";

export interface BlockFrontendProps extends BlockAttributes {
    id?: string;
    children?: ReactNode;
    items: Item[];
}
```

This couples the component to the CMS data shape. Because resolvers wrap attributes in `Partial<BlockAttributes>` (WordPress omits attributes matching defaults), the component inherits that optionality even though the resolver always fills in defaults before the props reach the component.

## The Target

Component Props should reflect what the component actually receives after the resolver fills in defaults — not what WordPress might or might not send:

```ts
// Decoupled — component declares its own data requirements
export interface HeroCarouselProps {
    id?: string;
    autoHeight: boolean;   // resolver always provides via defaults
    autoplay: boolean;     // resolver always provides via defaults
    children?: ReactNode;
    items: Item[];
}
```

The three type layers are:

1. **`BlockAttributes`** (schema.ts) — what WordPress stores. Resolvers receive attrs as `Partial<BlockAttributes>` since WordPress omits values matching defaults.
2. **Resolver** — transforms `Partial<BlockAttributes>` into fully resolved props. Uses `satisfies BlockResolver<ComponentProps, BlockAttributes>`.
3. **Component Props** — what the component needs to render. Required for anything the resolver guarantees. No import from `schema.ts`.

## File Structure for New Blocks

For new blocks, the component itself should live in `frontend/components/`, not `frontend/blocks/`. The `frontend/blocks/` directory is for CMS-specific wiring only (schema, resolver, editor). This makes the component reusable outside the block system and reinforces that it has no knowledge of WordPress.

```
frontend/components/hero-carousel/
  HeroCarousel.tsx            ← the actual component (owns its Props type)

frontend/blocks/hero-carousel/
  schema.ts                   ← BlockAttributes, DEFAULT_ATTRIBUTES
  resolver.ts                 ← transforms Partial<BlockAttributes> → ComponentProps
  HeroCarousel.view.tsx       ← thin wrapper for dynamic loading (replaces block-views.tsx entry)
```

The `.view.tsx` wrapper is a convention under consideration — it owns the `dynamic()` import and any loading/SSR config for that block, keeping `block-views.tsx` from growing unboundedly. For now, existing blocks continue to use `block-views.tsx`; new blocks can use the `.view.tsx` pattern.

## Rules

- **New blocks**: Define component Props independently. Do not extend `BlockAttributes`. Place the component in `frontend/components/`, not `frontend/blocks/`.
- **Existing blocks being modified**: Decouple Props from `BlockAttributes` if the change touches the Props type. Don't refactor Props types in unrelated changes.
- **Resolver `satisfies`**: Always use `satisfies BlockResolver<ComponentProps, BlockAttributes>` — the first param is the component's Props (output), the second is the schema attrs (input).
- **Required vs optional on component Props**: If the resolver always provides a field (via defaults or data fetching), it should be required on the component. Only mark fields optional if the component genuinely handles their absence.
- **`id`**: Should be optional on component Props — the renderer (`BlocksRenderer`) always provides it via `BaseBlockProps`, not the resolver.
- **`children`**: Always optional — provided by React, not the resolver.
- **Props naming (critical consistency rule)**: Name the type `{ComponentName}Props` — never use generic `Props`, `BlockFrontendProps`, or `BlockAttributes`. Examples: `HeroCarouselProps`, `MegaMenuNavigationListProps`, `EventsCalendarProps`. See `.claude/architect/frontend-components.md` for the full rationale (greppability, IDE clarity, refactoring safety, team consistency).

## Completed Migrations

- `hero-carousel/HeroCarouselBlock.tsx` — THR-1458

## How to Migrate a Block

1. Read the component to identify which fields it destructures and uses
2. Read the resolver to confirm which fields it always provides
3. Replace `extends BlockAttributes` with explicit field declarations
4. Mark fields required if the resolver guarantees them, optional otherwise
5. Rename the Props type to match the component (`BlockFrontendProps` → `HeroCarouselProps`)
6. Remove the `import type { BlockAttributes } from "./schema"` from the component
7. Update the resolver's `satisfies BlockResolver<NewPropsType>` and any test imports
8. Verify `tsc --noEmit` passes and existing tests still pass
