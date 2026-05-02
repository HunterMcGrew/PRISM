# Frontend Constants

Architect context for `frontend/lib/constants/`. Covers centralized constant definitions used across the codebase.

---

## Organization

Single-purpose files, one domain per file. 12 files total plus a barrel `index.ts`.

| File                 | Purpose                                                                   |
| -------------------- | ------------------------------------------------------------------------- |
| `block-types.ts`     | `BLOCK_TYPES` — string constants for all registered WordPress block types |
| `content-types.ts`   | `CONTENT_TYPES` — string constants for cache tag domains                  |
| `cache.ts`           | Cache configuration (TTLs, revalidation intervals)                        |
| `apis.ts`            | API endpoint configuration                                                |
| `images.ts`          | Image dimension defaults, breakpoints, placeholder paths                  |
| `paths.ts`           | URL path constants                                                        |
| `render-contexts.ts` | Render context identifiers                                                |
| `storybook.ts`       | Storybook configuration constants                                         |
| `wordpress.ts`       | WordPress-specific constants                                              |
| `icons.ts`           | Icon name mappings                                                        |
| `mega-menu.ts`       | Mega menu configuration constants (pane types, navigation structure)      |
| `theme.ts`           | Theme configuration constants                                             |
| `index.ts`           | Barrel re-export                                                          |

---

## Key Constants

### BLOCK_TYPES (`block-types.ts`)

String constants mapping block names to their WordPress type identifiers. Used in:

- Block registration (`block-registry.ts`)
- Resolver cache keys (`getCacheKeyParts([BLOCK_TYPES.MY_BLOCK, ...])`)

### CONTENT_TYPES (`content-types.ts`)

String constants for content domains. Used as `unstable_cache` tags for on-demand revalidation.

These are the two most-referenced constant files across the codebase.

---

## Constants must not live in `"use client"` modules

Constants exported from a file marked `"use client"` ship as a client reference proxy when imported from RSC. Server-side resolvers receive the proxy, not the real object. `in` checks silently fail. Enum-like lookups (`MAP[key]`) miss every key and fall through to whatever default the caller used. The bug is symptomless until a server-rendered code path consumes the constant.

**Why:** THR-1591 shipped a bug where every valid icon name in `MEGA_MENU_LINK_ICONS` resolved to `"call"` because the constant was exported from `MegaMenuLinkWithIcon.tsx` (a `"use client"` module) and the resolver couldn't see the real values through the proxy. THR-1131 hit the same shape earlier in the mega menu work and worked around it by rebuilding the icon map in the editor — a workaround that masked the underlying constraint.

**How to apply:** Constants live in plain modules under `frontend/lib/constants/` — one file per domain, no `"use client"` directive, no React hooks. If a `"use client"` component owns conceptual ownership of the data, still put the constant in `frontend/lib/constants/<domain>.ts` and have the component import it. The component is the _user_ of the data; the constants file is the _source of truth_ and must be RSC-safe so resolvers can read it. See ADR-0021 for the durable record.

---

## Conventions

- One concern per file — do not mix domains
- Constants are plain values (strings, numbers, objects) — no functions. Helpers that operate on a mapping constant (e.g. translators, lookups) live in `frontend/lib/utilities/` next to other `block-*-utilities.ts` files
- New block types go in `block-types.ts`, new content types go in `content-types.ts`
- Import via `@frontend/lib/constants` (barrel) or direct file path

---

## Mapping Constants

Lookup tables that map input keys to CSS classes (or other output strings) are the most common kind of constant in `theme.ts`. How you name and shape them determines whether the file stays clean over time or accumulates direction-coupled twins that slowly duplicate each other.

### Name by output, not by source

A mapping constant should be named by **the class family it produces**, not by the WordPress toolbar that feeds it or the container direction it's used in.

- ✅ `MAIN_AXIS_ALIGN_MAPPINGS` (produces `justify-*`) — describes the output
- ✅ `CROSS_AXIS_ALIGN_MAPPINGS` (produces `items-*`) — describes the output
- ❌ `BLOCK_ALIGNMENT_MAPPINGS` — names the toolbar, not the class family
- ❌ `BLOCK_ALIGNMENT_ROW_MAPPINGS` — couples to a flex direction

**Grandfathered:** `BLOCK_ALIGNMENT_MAPPINGS` and `BLOCK_VERTICAL_ALIGNMENT_MAPPINGS` pre-date this rule and are kept under their source-coupled names for now. Renaming them has broad import reach with no behavior change — the rename lands in the same pass as the axis-vocab type tightening and `GroupBlock.getFlexAlignmentClasses` rework (tracked separately). New mappings follow the output-family convention.

**Why it matters:** direction-coupled names invite adding more direction-coupled twins the first time a consumer hits a container that flips direction. You end up with (N toolbars × 2 directions) constants that all produce the same class families, just keyed differently. Output-family naming gives you two primitives (`justify-*`, `items-*`) and lets the consumer decide which axis maps to horizontal vs vertical based on their own flex direction.

### Flex direction is a consumer concern

When a mapping converts an axis-agnostic key (e.g. `left | center | right | top | bottom`) into a flex class, the consumer already knows whether its container is flex-col or flex-row. That knowledge is where the main-axis vs cross-axis decision belongs.

```tsx
// flex-col container: vertical = main axis, horizontal = cross axis
<div className="flex flex-col">
  className={classNames(
    MAIN_AXIS_ALIGN_MAPPINGS[verticalAlignment],  // justify-*
    CROSS_AXIS_ALIGN_MAPPINGS[horizontalAlignment], // items-*
  )}
</div>

// flex-row container: horizontal = main axis, vertical = cross axis
<div className="flex flex-row">
  className={classNames(
    MAIN_AXIS_ALIGN_MAPPINGS[horizontalAlignment],  // justify-*
    CROSS_AXIS_ALIGN_MAPPINGS[verticalAlignment],   // items-*
  )}
</div>
```

Both consumers use the same two primitives. Adding a `*_ROW_MAPPINGS` twin for the flex-row case is redundancy, not a fix.

### Before adding a new mapping, audit the file

When a new block or component needs an alignment mapping, check `theme.ts` first. If an existing constant produces the right class family and covers the keys the editor actually emits, reuse it. A constant's name or current consumer may make it look specialized, but the values are what matter.

Trigger questions before creating a new mapping:

1. **What class family does this produce?** (`justify-*`, `items-*`, `text-*`, something else?) Search for existing constants that emit the same family.
2. **Which keys does the editor actually emit for this field?** (Does the block register `supports.align`? If not, `wide | full` are dead vocabulary — you don't need a mapping that includes them.)
3. **Is the existing constant "direction-specific" in name only?** `MAIN_AXIS_ALIGN_MAPPINGS` is direction-agnostic at the output level — it doesn't care whether the consumer treats it as main-axis-of-flex-col or main-axis-of-flex-row.

If two existing constants both qualify, prefer the one with broader key coverage so future consumers don't need to extend it.

### When to add a genuinely new mapping

Add a new mapping only when the output class family isn't already covered:

- New CSS utility type (`text-*`, `grid-*`, etc.) with no existing primitive
- Output keys come from a source vocabulary that doesn't overlap with existing mappings
- The existing primitive would need to expand by more than a couple of keys to fit, and the new keys don't belong to its semantic domain

In every other case, reuse the primitive and let the consumer select the right key.

### Source-vocab translation

When a consumer receives source-vocab keys from an upstream system (e.g. WordPress's `BlockAlignmentToolbar` emits `left | center | right | wide | full`) but needs output keyed by domain vocab (e.g. the axis keys used by `MAIN_AXIS_ALIGN_MAPPINGS`: `left | center | right | stretch`), you have two shapes to choose from. Both share the same prerequisites; they diverge on placement.

**Prerequisites that apply to both shapes:**

- **Declare the source-vocab type as a named literal union in `theme.ts`.** Do not derive it via `keyof typeof` from a mapping — the upstream system is the stable contract; local mappings keyed by that vocab are transient (they may be renamed, split, or replaced). The type should survive those changes.
- **Do not add source-vocab keys to an axis primitive** (`MAIN_AXIS_ALIGN_MAPPINGS`, `CROSS_AXIS_ALIGN_MAPPINGS`) — that re-couples the primitive to the source.
- **Do not create a parallel source-keyed primitive** (e.g. `BLOCK_ALIGNMENT_ROW_MAPPINGS`) — that's the `*_ROW_MAPPINGS` trap by another name. See the [Name by output, not by source](#name-by-output-not-by-source) rule above.

#### Placement decision — primitive vs block-local

Before picking Shape A or Shape B, decide where the mapping lives. The decision turns on whether the mapping's **values** are reusable, not whether its **type** is reusable.

1. **Cross-block primitive.** Any block with a matching container shape can index the mapping correctly. Values encode no block-specific assumptions. Examples: `MAIN_AXIS_ALIGN_MAPPINGS`, `CROSS_AXIS_ALIGN_MAPPINGS`, `BLOCK_ALIGNMENT_MAPPINGS`, and the contract type `BlockToolbarAlignment` itself. → `frontend/lib/constants/theme.ts`.

2. **Block-local mapping that conforms to a cross-block contract.** The type is reusable but the values bake in block-specific knowledge — a hard-coded breakpoint, child-sizing overrides tuned to that block's children, vocab closure on a subset of keys. Example: `VERTICAL_ALIGNMENT_STACKED_CLASSES` in Columns is keyed by the `BlockVerticalAlignmentToolbar` vocab (cross-block) but its values bake in a `max-md:` / `md:` breakpoint tied to Columns' stack-on-mobile flow (block-specific). → `frontend/blocks/<block>/alignment-classes.ts` (or an equivalent block-local constants file).

**Naming test.** If the constant needs the block name prefixed to read clearly (`COLUMNS_VERTICAL_ALIGNMENT_STACKED_CLASSES`), the block name belongs in the file path, not the identifier. Location communicates scope; the identifier stays clean.

**Why not `theme.ts` for block-local mappings?** Putting block-specific values in `theme.ts` implies a reusability the values don't support. A future developer searching `theme.ts` for "horizontal alignment for my stacking block" will find the mapping and hit breakpoint or override mismatches — GroupBlock stacks at `lg:`, not `md:`, and its children don't carry the `flex-1 w-full` default the override neutralizes. The CCP / CRP framing: things that change together are packaged together (Common Closure), and things that are reused together are packaged together (Common Reuse). A block-local mapping changes when its block changes and is reused only within that block — it fails both tests for `theme.ts` membership. See [.claude/rules/headless-architecture.md § Contracts at Runtime Boundaries](../rules/headless-architecture.md) for the runtime-boundary framing.

Once placement is settled, apply Shape A vs Shape B.

Starting point for either shape:

```ts
/**
 * Mirrors the values emitted by WordPress's BlockAlignmentToolbar component
 * (@wordpress/block-editor). WP doesn't ship a TypeScript type for this
 * output, so we model the contract ourselves. Local mappings keyed by
 * alignment conform to this type — not the other way around.
 */
export type BlockToolbarAlignment =
	| "left"
	| "center"
	| "right"
	| "wide"
	| "full";
```

From there, the choice:

#### Shape A — encoded mapping (preferred when there's one consumer pattern)

Declare a local mapping keyed by the source vocab that emits the full class string needed for the consumer's container pattern, including any overrides specific to that container. The consumer indexes the mapping directly — no translator function in the call chain.

Use this shape when:

- Exactly one container pattern needs this translation.
- The consumer needs more than just the axis class — e.g. a child-sizing override, a responsive variant, a display mode toggle — and those extras are specific to the container.
- Keeping the logic in one mapping removes a derived predicate that would otherwise sit alongside the lookup.

Example (`frontend/blocks/columns/alignment-classes.ts` — block-local per the placement decision above; the vocab comes from WordPress's `BlockVerticalAlignmentToolbar`):

```ts
/**
 * Responsive vertical alignment for the Columns container. Below md the stack
 * is flex-col so vertical targets the main axis (justify-*); at md+ the
 * container flips to flex-row and vertical targets the cross axis (items-*).
 * The max-md:/md: breakpoints are tuned to Columns' stack-on-mobile flow —
 * other stacking blocks (e.g. GroupBlock at lg:) can't reuse these values.
 */
export const VERTICAL_ALIGNMENT_STACKED_CLASSES = {
	top: "max-md:justify-start md:items-start",
	center: "max-md:justify-center md:items-center",
	bottom: "max-md:justify-end md:items-end",
} as const;
```

The consumer just indexes:

```ts
verticalAlignment && VERTICAL_ALIGNMENT_STACKED_CLASSES[verticalAlignment];
```

No translator function in the path, no "which axis does this target at which breakpoint" predicate duplicated across consumers. The mapping itself answers every question about what classes each vertical alignment produces in this container.

**Why this works:** the consumer doesn't care about the axis flip at the call site. The mapping has already made that decision by baking the output into each entry. When the same block's editor preview needs the same classes (as `mega-menu-columns/edit.tsx` does for its own alignment mappings), it imports the same file. One source of truth for "what classes does `top` produce on this container" keeps editor and frontend from drifting.

#### Shape B — shared translator helper (reserve for rule-of-three)

Extract a pure translator function into `frontend/lib/utilities/block-*-utilities.ts`. The function takes a source-vocab key and returns a domain-vocab key. Consumers compose it with the axis primitive at the callsite.

Use this shape when:

- **Three or more consumers** need the same translation and compose it with **different** axis mappings or post-translation logic. Rule of three; two is coincidence.
- The output is just a key, not a class string — no container-specific overrides to bake in.
- Placing the translation inside a single mapping would require duplicating the mapping for each consumer's container.

If only one consumer has the translation, **use Shape A**. If two consumers exist and both compose with `MAIN_AXIS_ALIGN_MAPPINGS` in the same way, **use Shape A** — the second consumer can import the same encoded mapping. Only when a third case appears with genuinely different post-translation behavior should a shared translator be extracted.

The primitive + translator pattern mirrors the `dtoTo*()` mappers used by services in `frontend/lib/services/` — translate external vocab to domain vocab at the boundary.

#### Historical note

An earlier iteration of this work extracted `toolbarToAxisKey` as a shared translator in `frontend/lib/utilities/block-alignment-utilities.ts`. It had two callers (`ColumnsBlock.tsx` and `mega-menu-columns/edit.tsx`), both composing with `MAIN_AXIS_ALIGN_MAPPINGS` in the same way. Both needed an additional container-specific override (`[&>*]:flex-none [&>*]:w-auto` on distributive values only), which ended up as a derived boolean sitting alongside the lookup at both callsites — duplicated logic. Collapsing both responsibilities into a single encoded mapping (Shape A) removed the translator, the boolean, and the drift risk. The utility file was deleted in THR-1610.

A second iteration (THR-1610 followup) relocated the resulting encoded mapping `HORIZONTAL_ALIGNMENT_FLEX_ROW_CLASSES` from `theme.ts` to `frontend/blocks/columns/alignment-classes.ts`. The original placement treated "single-consumer mapping" and "cross-block primitive" as the same category; the mapping was in fact block-local (values assumed Columns-container child-sizing defaults) while conforming to a cross-block contract type. The Placement decision subsection above codifies the distinction so future mappings don't default to `theme.ts` by reflex.

A third iteration (THR-1651) removed the `horizontalAlignment` control from the Mega Menu Columns container entirely — `core/columns` never had a container-level horizontal alignment control, so the feature had no product requirement behind it. The `HORIZONTAL_ALIGNMENT_FLEX_ROW_CLASSES` mapping and its stacked counterpart went with it. The Shape A pattern is still the right default for any future block-local mapping that conforms to a cross-block contract — the example above uses `VERTICAL_ALIGNMENT_STACKED_CLASSES` as a surviving illustration.
