# Frontend Blocks

Architect context for `frontend/blocks/`. Covers folder structure, file conventions, resolver patterns, and block registration.

For coding rules (typing, `"use client"`, file ordering) see `.claude/rules/code-standards.md` and `.claude/rules/code-standards-ts.md`.
For server/client boundaries see `.claude/rules/headless-architecture.md` and [ADR-0026](../spec/adrs/0026-rsc-by-default-use-client-is-load-bearing.md) for the RSC-by-default decision.
For component props decoupling see `.claude/rules/component-props-decoupling.md`.

---

## Folder Structure

~70 block directories. Each block lives in `frontend/blocks/{block-name}/` with these files:

| File | Required | Purpose |
|------|----------|---------|
| `schema.ts` | Yes | Exports `BlockAttributes` type and `DEFAULT_ATTRIBUTES` constant |
| `resolver.ts` | If data fetching or child transformation needed | Server-only resolver, imports `"server-only"` |
| `resolver.props.ts` | If backend editor needs same logic | Shared prop logic imported by both `resolver.ts` and backend `edit.tsx` |
| `{BlockName}.view.tsx` | Yes | Wrapper that imports the component for block registration |
| `__tests__/` | Recommended | Tests for resolver and component logic |
| `*.stories.tsx` | Optional | Storybook stories |

**Note:** The actual component (`MegaMenuNavigationList.tsx`) lives in `frontend/components/`, not `frontend/blocks/`. The block folder contains only CMS wiring (schema, resolver, view wrapper). See "Block Components and the `.view.tsx` Pattern" section below.

---

## schema.ts

Every block's `schema.ts` must export:

- `BlockAttributes` — the type describing CMS block attributes
- `DEFAULT_ATTRIBUTES` — a constant satisfying `BlockAttributes` with sensible defaults

Additional exports (sorting options, max lengths, etc.) are placed here as named constants.

```typescript
// Example: events-list/schema.ts
export interface BlockAttributes {
  columns: number;
  headline: string;
  selectedEventIds: number[];
  showAll: boolean;
}

export const DEFAULT_ATTRIBUTES: BlockAttributes = {
  columns: 4,
  headline: "Event List",
  selectedEventIds: [],
  showAll: true,
};
```

---

## resolver.ts

**When to create a resolver:**
- Block needs to fetch data (API calls, database queries, etc.)
- Block needs to transform WordPress attributes before passing to component
- Block needs to validate or filter data
- Block needs to modify the inner blocks tree (children)
- Block has no view wrapper and the component has required props — a defaults-only resolver guarantees complete props (see "Defaults-only resolver" below)

**When NOT to create a resolver:**
- Block component lives in `frontend/blocks/` and handles its own defaults via parameter destructuring (e.g. HeadingBlock, ParagraphBlock)
- Component is pure and receives all props from a view wrapper that applies defaults

**Important: `BlockService` does not merge defaults.** When a block has no resolver, `BlockService.resolveBlock()` passes raw `context.attrs` straight through to the component — it does **not** merge `DEFAULT_ATTRIBUTES`. This means any attribute WordPress omits (because it matches the registered default) arrives as `undefined`. Blocks without resolvers must handle this themselves, either via a view wrapper or parameter defaults in the component.

Resolvers are server-only. Every resolver file starts with `import "server-only"`.

A resolver satisfies `BlockResolver<Props, Attrs>` from `@frontend/lib/contracts/block` and can implement:

- `resolveProps` — transforms attributes + fetches data into component props
- `resolveChildren` — transforms or generates the block's inner block tree

The default export uses `satisfies BlockResolver<Props, Attrs>`.

**Why resolvers exist:**
- **Data fetching on server**: Keep heavy API calls out of the component bundle
- **Data transformation**: Convert WordPress CMS data shape → component Props shape
- **Caching**: Apply Next.js `unstable_cache` at the resolver level for on-demand revalidation
- **Validation**: Filter/validate data before component renders (e.g., remove links with empty hrefs)

### Resolver with data fetching

```typescript
import "server-only";
import type { BlockResolver } from "@frontend/lib/contracts/block";
import type { BlockFrontendProps } from "./MyBlock";
import type { BlockAttributes } from "./schema";

export default {
  resolveProps: async ({ id, attrs, site }) => {
    const resolvedAttrs = { ...DEFAULT_ATTRIBUTES, ...attrs };
    // fetch data, apply caching with unstable_cache
    return { ...resolvedAttrs, id, data };
  },
} satisfies BlockResolver<BlockFrontendProps, BlockAttributes>;
```

### Defaults-only resolver

When a component lives in `frontend/components/` with required props and no view wrapper, a resolver is the right place to merge `DEFAULT_ATTRIBUTES` — even without data fetching. This keeps the component's type contract honest (required props stay required) and avoids a wrapper file that exists only to apply defaults.

Use `||` for text fields (catches empty strings from WordPress), `??` for enums/numbers/booleans (preserves falsy-but-valid values like `0` or `false`).

```typescript
import "server-only";

import type { BlockResolver } from "@frontend/lib/contracts/block";

import type { MegaMenuAboutUsProps } from "@frontend/components/mega-menu-about-us/MegaMenuAboutUs";
import { DEFAULT_ATTRIBUTES, type BlockAttributes } from "./schema";

export default {
  resolveProps: async ({ attrs }) => ({
    alignment: attrs?.alignment ?? DEFAULT_ATTRIBUTES.alignment,
    description: attrs?.description || DEFAULT_ATTRIBUTES.description,
    headline: attrs?.headline || DEFAULT_ATTRIBUTES.headline,
  }),
} satisfies BlockResolver<MegaMenuAboutUsProps, BlockAttributes>;
```

Register the component directly in `block-views.tsx` (no wrapper needed) and wire the resolver in `block-registry.ts`:

```typescript
// block-registry.ts
registerBlock(BLOCK_TYPES.MEGA_MENU_ABOUT_US, {
  resolver: () => import("@frontend/blocks/mega-menu-about-us/resolver"),
  view: MegaMenuAboutUsBlock,
});
```

### Resolver with child transformation

```typescript
export default {
  resolveChildren: async ({ block }) => {
    if (!block?.innerBlocks) return [];
    return block.innerBlocks.map(/* transform children */);
  },
} satisfies BlockResolver<Props, Attrs>;
```

---

## resolver.props.ts

**When to split into resolver.props.ts:**
- **Critical:** Backend WordPress editor block also needs the same prop logic (live preview in wp-admin)
- The prop transformation is complex enough to warrant reuse (~200+ lines)
- Example: `mega-menu-navigation-list/resolver.props.ts` has `getProps()` that filters empty links. Both backend editor (live preview) and frontend resolver import and use it.

**When NOT to split:**
- Backend editor doesn't need the same logic (only frontend rendering uses it) — keep logic in resolver.ts even if long
- Resolver is simple (< 200 lines total)

**Why this pattern exists:**
- Backend editor runs in `wp-scripts` webpack build with `@frontend/` alias pointing to frontend code
- Editor and frontend can't share a resolver.ts directly (different runtimes)
- `resolver.props.ts` is a shared function that both resolver.ts (server) and backend edit.tsx (wp-admin) can import

The resolver delegates to it:

```typescript
// resolver.ts
import "server-only";
import { getProps } from "./resolver.props";

export default {
  resolveProps: async (args) => {
    const props = getProps(args);
    return props;
  }
} satisfies BlockResolver<Props, Attrs>;
```

The shared function uses `ResolveProps<Props, Attrs>` from `@frontend/lib/contracts/block`.

---

## Caching Pattern

**Current state (interim).** Blocks that fetch data use `unstable_cache` from Next.js with content-type tags at the resolver level:

```typescript
const data = site.policy.useCache
  ? await unstable_cache(fetchFn, getCacheKeyParts([BLOCK_TYPES.MY_BLOCK, ...Object.values(attrs)]), {
      tags: [CONTENT_TYPES.MY_CONTENT],
      revalidate: ON_DEMAND_CACHE_TIME,
    })()
  : await fetchFn();
```

For un-migrated entities, follow this pattern. Always include attrs that affect the result in the cache key parts — omitting them causes over-caching across renders with different attrs.

**Target state.** Caching moves into the data-access fetcher modules, scoped by source revalidation guarantees. Block resolvers stop wrapping; they call services that delegate to already-cached fetchers. The `site.policy.useCache` opt-out moves into the fetcher (or becomes a `noStore()` boundary in editor-preview render contexts). For migrated entities, the resolver looks like:

```typescript
const data = await ServiceFactory.createMyService(site).getActiveItems({ ...attrs })
  .catch((error) => { console.error(...); return []; });
```

See `.claude/architect/data-layer.md` § Caching for the target shape and `.claude/plans/epic-thr-1784.md` for which entities have been migrated.

---

## Block Registration

All blocks are registered in `frontend/lib/services/block/block-registry.ts`.

Each registration maps a `BLOCK_TYPES` constant to a `BlockRegistration<Props>`:

```typescript
registerBlock(BLOCK_TYPES.MY_BLOCK, {
  resolver: () => import("@frontend/blocks/my-block/resolver"),
  view: MyBlockComponent,
});
```

- Resolvers use dynamic imports (`() => import(...)`) for code splitting
- Views are imported from a centralized `block-views` barrel file
- Blocks without data fetching omit the `resolver` field
- `childrenAsRoot: true` gives direct children root-level styling

---

## Block Components: Three Patterns

**Architectural principle:** Keep the block system thin. Implementation logic lives in reusable components; the block system handles registration and schema only.

**Props naming rule (critical for consistency):** All component Props types must be named `{ComponentName}Props` — **never use generic `Props`, `BlockFrontendProps`, or other generic names.** This applies to all components, whether file-private or exported, and regardless of pattern (Pattern 1, 2, or 3).

- ✓ `EventsCalendarProps`, `MegaMenuNavigationListProps`, `ButtonProps`
- ❌ `Props`, `BlockFrontendProps`, `BlockAttributes`

**Why:** Greppability (search for usage), IDE clarity (hover hints), refactoring safety (extract/move without renaming), and team consistency (one rule, no judgment calls).

For new blocks, follow the **component props decoupling pattern** — components define their own Props types independent of `BlockAttributes` (see `.claude/rules/component-props-decoupling.md`). This is an active migration (THR-1452) — new blocks follow decoupled Props; existing blocks migrate as they're touched.

### Pattern 1: Component lives in `frontend/blocks/` (Most common)

The block component stays in the block folder alongside schema and resolver. Simple, straightforward, and sufficient for most blocks.

```
frontend/blocks/button/
  ├─ schema.ts
  ├─ ButtonBlock.tsx         (component with "use client" if it uses hooks)
  └─ __tests__/

frontend/lib/services/block/block-views.tsx
  └─ export const ButtonBlock = dynamic(
       () => import("@frontend/blocks/button/ButtonBlock")
     )
```

**Use this when:**
- Block logic is self-contained and doesn't need reuse elsewhere
- Component doesn't need to be tested independently of the block system
- No block-specific wiring needed (handlers, providers, etc.)

**Props structure:** Component should define its own `Props` type independent of `BlockAttributes` (see component props decoupling rule above). The resolver transforms `BlockAttributes` into component-ready props.

**Example blocks:** Card, ButtonBlock, Heading, Image

### Pattern 2: Component in `frontend/components/`, no wrapper (Growing pattern)

Component lives in the reusable components directory because it's valuable as a standalone piece. Block system imports it directly with no `.view.tsx` wrapper.

```
frontend/components/gallery-grid/
  └─ GalleryGrid.tsx         (actual component)

frontend/blocks/gallery-grid/
  ├─ schema.ts
  └─ resolver.ts             (if needed)

frontend/lib/services/block/block-views.tsx
  └─ export const GalleryGrid = dynamic(
       () => import("@frontend/components/gallery-grid/GalleryGrid")
     )
```

**Use this when:**
- Component is reusable and might be used outside the block system
- Component should be independently testable
- No block-specific logic needed (pure data → UI)

**Example blocks:** GalleryGrid, HeroCarouselSlideCTA, EventsCalendar (before .view wrapper)

### Pattern 3: Component in `frontend/components/` with `.view.tsx` wrapper (Least common)

Component lives in reusable components. `.view.tsx` wrapper in the block folder adds block-specific logic (handlers, providers, etc.) without polluting the component.

```
frontend/components/events-calendar/
  └─ EventsCalendar.tsx      (pure component)

frontend/blocks/events-calendar/
  ├─ schema.ts
  ├─ resolver.ts
  └─ EventsCalendarBlock.view.tsx  (thin wrapper with router logic)

frontend/lib/services/block/block-views.tsx
  └─ export const EventsCalendarBlock = dynamic(
       () => import(".../EventsCalendarBlock.view")
     )
```

**Use this when:**
- Component is reusable AND needs block-specific wiring (router, context, handlers)
- Want to keep the component pure (no knowledge of Next.js routing)
- Block-specific logic should be added without modifying the component

**Bundle impact:** `"use client"` in the `.view.tsx` file does not regress bundle size. The `block-views.tsx` module is already `"use client"` and uses `next/dynamic()` for code splitting. The `.view.tsx` chunk loads only on pages that render the block. No impact to pages without the block.

**Example blocks:** EventsCalendarBlock (adds `router.push` to `onEventClick`), MegaMenuNavigationList (proven pattern with useId/useMegaMenuContext)

### Component and Resolver Coordination

The resolver transforms WordPress data into component props. The component should be designed to receive exactly what the resolver provides:

**Resolver's job:**
- Merge CMS attributes with `DEFAULT_ATTRIBUTES`
- Fetch additional data
- Transform data to component-ready shape
- Validate/filter data

**Component's job:**
- Receive fully-resolved props
- Render UI
- Handle user interaction

For detailed component design patterns, Props naming conventions, and component-specific architecture, see `.claude/architect/frontend-components.md`.


### The `.view.tsx` wrapper (Optional)

**When you need it:** Only when you want to add block-specific logic to a reusable component without modifying the component itself.

The wrapper file (`*Block.view.tsx`) sits between the block system and the component:
- Imports the pure component from `frontend/components/`
- Adds block-specific concerns: route handlers, context providers, callbacks
- Keeps the component reusable and testable independently
- Stays thin — significant logic stays in the component

**When you don't need it:**
- Component lives in `frontend/blocks/` (most blocks)
- Component has no block-specific wiring needed
- Pure data → UI transformation with no extra context

**Pattern (simple passthrough):**
```tsx
// MegaMenuNavigationListBlock.view.tsx
import MegaMenuNavigationList from "@frontend/components/mega-menu-navigation-list/MegaMenuNavigationList";
export default MegaMenuNavigationList;
```

**Pattern (adding block-level logic via hooks):**
```tsx
// EventsCalendarBlock.view.tsx — adds router-based navigation
"use client";
import EventsCalendar from "@frontend/components/events-calendar/EventsCalendar";
import { useRouter } from "@frontend/hooks/use-router";

export default function EventsCalendarBlockView(props) {
  const router = useRouter();
  // The component itself doesn't know about routing — the wrapper adds that
  return <EventsCalendar {...props} onEventClick={router.push} />;
}
```

**Why this pattern:**
- `EventsCalendar.tsx` is a pure, reusable component that renders a calendar UI
- It doesn't know about Next.js routing — it just needs an `onEventClick` callback
- In **block context**, we want clicks to navigate to event detail pages via `router.push`
- In **other contexts** (modal, sidebar, etc.), the same component could use a different callback (open modal, analytics, etc.)
- By keeping the component dumb and adding block-specific routing in `.view.tsx`, the component stays flexible and testable

**Key principle:** If the component needs a behavior (like "navigate on click"), the wrapper provides it via a callback prop. The component stays reusable — it doesn't care *how* the callback is implemented, just that it gets called with the right data.

For blocks with editor-only interactive UI (selectors, drag-and-drop, sortable lists), follow the Promotions block pattern described in `.claude/rules/headless-architecture.md`.

### Component Organization Decision Tree

```
Is the component reusable outside a block context?
(Could it be used in a page, another block, a modal, etc.?)

  → No, it's block-specific
    └─ Put in frontend/blocks/{name}/
       └─ Import directly in block-views.tsx
       └─ Done! ✓

  → Yes, or might be in the future
    └─ Does it need block-specific wiring?
       (router.push handler, context provider, etc.?)

       → No, it's pure (data → UI)
         └─ Put in frontend/components/{name}/
            └─ Does the component have required props that need defaults?
               → Yes: add a defaults-only resolver in frontend/blocks/{name}/
               → No: no resolver needed
            └─ Import directly in block-views.tsx
            └─ Done! ✓

       → Yes, it needs block-specific logic
         └─ Put component in frontend/components/{name}/
            └─ Create frontend/blocks/{name}/{BlockName}.view.tsx wrapper
            └─ Import .view.tsx in block-views.tsx
            └─ Wrapper adds the block logic (router, handlers, etc.)
            └─ Done! ✓
```

**Real examples:**

| Block | Pattern | Reason |
|-------|---------|--------|
| Button, Card | Pattern 1 (blocks/) | Self-contained, block-specific, no reuse needed |
| GalleryGrid, HeroCarouselSlideCTA | Pattern 2 (components/) | Reusable, pure data→UI, no extra wiring |
| MegaMenuAboutUs | Pattern 2 (components/ + defaults resolver) | Reusable, required props, resolver merges defaults |
| EventsCalendarBlock | Pattern 3 (components/ + .view) | Reusable, but needs router.push in block context |
| MegaMenuNavigationList | Pattern 3 (components/ + .view) | Reusable, uses hooks (useId, useMegaMenuContext) |

**Key principle for all patterns:** Define component Props independently from `BlockAttributes`. See the props naming rule and component props decoupling guidance at the top of this section.

---

## Data Flow: WordPress → Resolver → Component

Understanding how data flows through the block system helps you understand where to put logic.

```
WordPress Editor (wp-admin)
  ↓
CMS stores: BlockAttributes
  ↓
Frontend page render (Next.js)
  ↓
block-registry finds the block type
  ↓
resolver.ts (server-only) runs:
  - Merges attributes with DEFAULT_ATTRIBUTES
  - Fetches additional data from services/APIs
  - Transforms CMS shape → ComponentProps shape
  - Returns component-ready props
  ↓
block-views.tsx dynamic() code-splits and loads the view
  ↓
{BlockName}.view.tsx wrapper:
  - Imports the pure component from frontend/components/
  - May add block-specific logic (router, context, callbacks)
  ↓
Component (frontend/components/{name}/)
  - Receives fully-resolved ComponentProps
  - Renders UI
  - May be RSC or "use client" depending on needs
  ↓
HTML sent to browser
```

**Key insight:** At each layer, only handle the concern relevant to that layer:

| Layer | Concern | Example |
|-------|---------|---------|
| **schema.ts** | CMS attribute shape | `type BlockAttributes = { heading: string; itemIds: number[] }` |
| **resolver.ts** | Data fetching + transformation | `async ({ attrs }) => ({ heading: attrs.heading, items: await fetchItems(attrs.itemIds) })` |
| **.view.tsx wrapper** | Block-specific wiring | `<EventsCalendar {...props} onEventClick={router.push} />` |
| **Component** | Rendering UI | `export default function EventsCalendar({ events, onEventClick }: Props) { return <Calendar events={events} onClick={onEventClick} /> }` |

**Anti-pattern: Resolver returns BlockAttributes directly**
```tsx
// ❌ Bad — component receives CMS shape, not component shape
export default {
  resolveProps: async ({ attrs }) => attrs,  // Just returns BlockAttributes
} satisfies BlockResolver<BlockAttributes, BlockAttributes>;
```

**Pattern: Resolver returns component-ready Props**
```tsx
// ✓ Good — component receives exactly what it needs
export interface Props {
  heading: string;
  items: Item[];
}

export default {
  resolveProps: async ({ attrs }) => ({
    heading: attrs.heading,
    items: await fetchItems(attrs.itemIds),  // Transformed
  }),
} satisfies BlockResolver<Props, BlockAttributes>;
```

---

## Common Pitfalls

### ❌ Putting logic in the component that belongs in the resolver

**Bad:**
```tsx
// Component fetches data — violates server-first principle
export default function MyBlock({ attrs }: Props) {
  const [data, setData] = useState(null);
  useEffect(() => {
    fetch(`/api/data?id=${attrs.itemId}`).then(r => setData(r.json()));
  }, [attrs.itemId]);
  return <div>{data}</div>;
}
```

**Good:**
```tsx
// Resolver fetches data server-side
export default {
  resolveProps: async ({ attrs }) => {
    const data = await fetchData(attrs.itemId);
    return { data, ...attrs };
  },
} satisfies BlockResolver<Props, Attrs>;

// Component receives already-fetched data
export default function MyBlock({ data }: Props) {
  return <div>{data}</div>;
}
```

**Why:** Server-side fetching eliminates client waterfalls, keeps the bundle small, and renders faster.

### ❌ Creating a component inside `frontend/blocks/` instead of `frontend/components/`

**Bad:**
```
frontend/blocks/my-block/
  ├─ schema.ts
  ├─ resolver.ts
  └─ MyBlockComponent.tsx  ← ❌ Component lives in blocks folder
```

**Good:**
```
frontend/components/my-component/
  └─ MyComponent.tsx  ← ✓ Component is reusable

frontend/blocks/my-block/
  ├─ schema.ts
  ├─ resolver.ts
  └─ MyBlock.view.tsx  ← ✓ Thin wrapper for block registration
```

**Why:** Blocks are CMS wiring only. Components should live in `frontend/components/` so they're reusable outside the block system and testable in isolation.

### ❌ Coupling component Props to BlockAttributes

**Bad:**
```tsx
export interface BlockFrontendProps extends BlockAttributes {
  // Component inherits optional/partial fields from CMS
  heading?: string;  // Might be undefined from WordPress
}
```

**Good:**
```tsx
export interface HeroCarouselProps {
  heading: string;  // Resolver guarantees this field via defaults
  autoplay: boolean;
  columns: number;
}

// Resolver fills in defaults:
export default {
  resolveProps: async ({ attrs }) => ({
    heading: attrs.heading ?? DEFAULT_ATTRIBUTES.heading,
    autoplay: attrs.autoplay ?? DEFAULT_ATTRIBUTES.autoplay,
    columns: attrs.columns ?? DEFAULT_ATTRIBUTES.columns,
  }),
} satisfies BlockResolver<HeroCarouselProps, BlockAttributes>;
```

**Why:** Component props should reflect what the resolver actually provides, not what WordPress might send. For the full migration pattern, see `.claude/rules/component-props-decoupling.md` (THR-1452).

### ❌ Forgetting to import "server-only" in resolver.ts

**Bad:**
```tsx
// resolver.ts — accidentally bundles ServiceFactory into client
export default { resolveProps };
```

**Good:**
```tsx
import "server-only";  // ✓ Prevents accidental client imports
export default { resolveProps };
```

**Why:** `"server-only"` is a compile-time barrier that prevents accidentally importing server-only code from client components.

### ❌ Not using caching for data-fetching resolvers

**Bad:**
```tsx
const data = await fetchExpensiveAPI(attrs.id);  // Fetches every page render
```

**Good:**
```tsx
const data = await unstable_cache(
  () => fetchExpensiveAPI(attrs.id),
  getCacheKeyParts([BLOCK_TYPES.MY_BLOCK, attrs.id]),
  { tags: [CONTENT_TYPES.MY_CONTENT], revalidate: ON_DEMAND_CACHE_TIME }
)();
```

**Why:** Caching eliminates redundant API calls, speeds up page renders, and enables on-demand revalidation via ISR.

---

## Constants

Block type strings are centralized in `@frontend/lib/constants/block-types.ts` as `BLOCK_TYPES`.
Content type strings for cache tags are in `@frontend/lib/constants` as `CONTENT_TYPES`.

---

## Core Block innerHTML Attribute Extraction

WordPress core blocks (heading, paragraph) store certain attributes in both places:
- **Block attrs JSON** — e.g. `{ "anchor": "my-section" }` in the block comment delimiter
- **innerHTML** — e.g. `id="my-section"` on the root HTML element

`attrs.anchor` is not reliably present for core blocks. `BlocksProcessor.php` extracts the `id` from innerHTML using DOMDocument and sets `attrs.anchor` before the data reaches GraphQL. This follows the same pattern used for button and image blocks. The frontend reads `attrs.anchor` like any other attribute — no resolver or innerHTML parsing needed.

---

## Legacy Attribute Adapter Pattern

When a block attribute is deprecated and replaced with a new shape, the frontend carries the read-side leg of the deprecation pattern: a typed legacy shape in `schema.ts` and a fallback adapter in the resolver. The editor side — WP `deprecated[]` array, PHP migration service emit — lives in `backend-editor-blocks.md` § Deprecating Block Attributes. See [ADR-0028](../spec/adrs/0028-block-attribute-deprecation-pattern.md) for the doctrine and naming convention.

### Why the frontend leg exists

WP's `deprecated[]` array runs only when the editor parses saved block markup — typically when a human opens a page in the editor. Until that happens, the saved content (in `wp_options` for mega menu blocks, in post content for everything else) sits in the legacy shape. The frontend reads from that storage directly without going through editor parse.

Without a frontend adapter, deprecated content renders empty until every dealer manually opens and saves every page that contains the block. The adapter is the read-side fallback for that gap.

### Type composition in schema.ts

```ts
import type { IImage } from "@frontend/lib/domain/image";

// Canonical — what the editor writes, what the component sees, what tests assert.
export type BlockAttributes = {
  image?: IImage;
  // ...other current fields
};

// Read-only legacy. Lives next to BlockAttributes so the resolver can pick
// it up but edit.tsx and component code never see it. The name matches the
// primary deprecated attribute (Legacy<DeprecatedAttributeName>); the body
// lists every legacy field that was part of that deprecation round.
export type LegacyBackgroundImage = {
  backgroundImage?: string;
  backgroundImageId?: number;
  backgroundImageWidth?: number;
  backgroundImageHeight?: number;
};

// Resolver-facing intersection. Only the resolver consumes Partial<this>.
export type BlockAttributesWithLegacy =
  BlockAttributes & LegacyBackgroundImage;
```

`BlockAttributes` stays clean — the canonical write contract has no legacy fields, even read-only. Each deprecation round adds a sibling `Legacy*` type and intersects it into `BlockAttributesWithLegacy`. The editor's `edit.tsx` continues to import `BlockAttributes`, so it can't accidentally write legacy fields.

### Naming convention

- **Default:** `Legacy<DeprecatedAttributeName>` in PascalCase. The type body carries that attribute plus any sibling fields that were part of the same shape (dimension siblings, paired URL/target fields, etc.). The name picks the primary; the body is exhaustive.
- **Same-name escape hatch:** `Legacy<AttributeName>_<ShapeQualifier>`. Use only when the same attribute name has been deprecated across multiple shape changes (e.g. `image: string` → `image: { url, id }` → `image: IImage`). The signal: WP's `isEligible` predicate checks structure rather than presence.

The grep test makes the convention work — a future reader investigating "why isn't this saved `backgroundImage` rendering" greps `LegacyBackgroundImage` and lands directly on the type and the resolver branch that handles it. ADR-0028 covers the full naming rule and the rare exception.

### Resolver shape

The resolver consumes `Partial<BlockAttributesWithLegacy>` (instead of `Partial<BlockAttributes>`) so it can read legacy fields as a fallback when the canonical shape is absent.

```ts
import type { ResolveProps } from "@frontend/lib/contracts/block";

import type { MyBlockProps } from "@frontend/components/my-block/MyBlock";

import type { BlockAttributesWithLegacy } from "./schema";
import { LEGACY_PLACEHOLDER_BACKGROUND_IMAGE } from "./schema";

export const resolveProps: ResolveProps<
  MyBlockProps,
  BlockAttributesWithLegacy
> = async ({ attrs }) => {
  // Prefer the canonical shape. Fall back to legacy fields only when the
  // canonical shape is absent — published content saved before the migration.
  const image = attrs?.image ?? buildImageFromLegacy(attrs);

  return {
    image,
    // ...
  };
};

function buildImageFromLegacy(
  attrs: Partial<BlockAttributesWithLegacy> | undefined,
): IImage | undefined {
  const url = attrs?.backgroundImage;
  if (!url || url === LEGACY_PLACEHOLDER_BACKGROUND_IMAGE) return undefined;

  return {
    id: attrs.backgroundImageId ?? 0,
    sourceUrl: url,
    altText: "",
    title: "",
    mediaDetails:
      attrs.backgroundImageWidth && attrs.backgroundImageHeight
        ? { width: attrs.backgroundImageWidth, height: attrs.backgroundImageHeight }
        : undefined,
  };
}
```

The fallback function should mirror the WP `deprecated[]` `migrate()` logic — same shape transformation, just at read time instead of editor-parse time. Both can produce `mediaDetails: undefined` when legacy dimensions weren't stored; `ResponsiveWrapper` and `next/image` both handle undefined dimensions via intrinsic-size fallback.

### When this section applies

The frontend leg is required whenever the block serves from persistent storage (post content, `wp_options`) to the frontend without going through editor parse on every read — almost every block in the codebase.

The leg is *not* required for blocks that exclusively render through fresh editor preview (the editor parses on every render, so WP's `deprecated[]` always fires). These are rare and mostly limited to the mega menu editor's standalone preview path.

If you're not sure whether a block needs the frontend leg, the safe default is to add it. The cost of a typed legacy shape and a small adapter function is small; the cost of missing it is published content that renders empty until every dealer manually re-saves.

### Pairing with backend changes

When a `deprecated[]` array is added to a block's `index.tsx`, the frontend pair is required:

1. Add the `Legacy<DeprecatedAttributeName>` type to `schema.ts`.
2. Update `BlockAttributesWithLegacy` to intersect the new legacy shape (or create it if this is the block's first deprecation).
3. Update the resolver's `ResolveProps<>` generic to consume `BlockAttributesWithLegacy`.
4. Add the legacy fallback adapter logic.
5. Add resolver tests covering each legacy shape — the WP `deprecated[]` migrator gets unit-tested in the editor; the frontend adapter needs equivalent coverage.

ADR-0028 covers the full three-leg framework, the `when-required` matrix, and the retirement criterion for legacy types.

---

## WordPress String Attributes: `||` vs `??`

Prefer `||` over `??` for optional WordPress string attributes where "empty string" should be treated as "absent."

WordPress may send empty strings for fields the user left blank (e.g. the HTML Anchor field sends `anchor: ""` rather than omitting the attribute). Nullish coalescing (`??`) only falls back for `null`/`undefined` — it passes empty strings through. Logical OR (`||`) falls back for all falsy values including `""`.

```tsx
// Bad — empty anchor produces id=""
id={anchor ?? id}

// Good — empty anchor falls back to auto-generated id
id={anchor || id}
```

This applies to any WordPress block attribute where the empty-string case should use a default value.
