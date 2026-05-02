---
Number: 0027
Title: Block Image Attributes Use IImage
Status: accepted
Date: 2026-05-01
---

## Context

Block image attributes have drifted the same way block link attributes drifted before ADR-0019. Some blocks store a bare `imageUrl: string` (`card`, `feature`, `hero-card`, `hero-cards`). Others store split fields — a URL plus separately-tracked `id`, `width`, `height` — with no guarantee the four stay in sync. The `mega-menu-featured-banner` block landed this split-field shape on THR-1817 (PR #1962) as part of fixing a sidebar preview that was skewing because hardcoded `naturalWidth={854} naturalHeight={400}` couldn't accommodate arbitrary image aspect ratios. The fix worked, but the schema shape codified the wrong target — four flat fields where one `IImage` would carry the same data as a single object.

Meanwhile, several blocks already use the canonical shape — `mega-menu-info-banner`, `image`, `navigation-menu-item`, and `gallery-grid` all store `image: IImage` (or arrays of `IImage`). Domain models throughout the codebase (`IPost`, `IEmployee`, `IProduct`, `IPromotion`, `ILocation`) declare image fields as `IImage` or `IImage | null`. The frontend is consistent; the editor block layer is not.

This ADR captures the target state for new block image attributes so reviewers have a durable reference, and so future block authors land on the canonical shape from day one. It mirrors ADR-0019's structure deliberately — the link migration solved the same shape of problem, and the same migration template applies.

## Decision

Block image attributes take the `IImage` shape defined in `frontend/lib/domain/image.ts`:

```ts
interface IImage {
	id: string | number;
	altText: string;
	sourceUrl: string;
	title: string;
	mediaDetails?: {
		width: number;
		height: number;
	};
}
```

`sourceUrl`, `id`, `altText`, and `title` are core fields populated from the WordPress media object (`media.url`, `media.id`, `media.alt`, `media.title`). `mediaDetails` carries dimensions and is optional only because legacy saved content predates the field — new blocks always populate it from `media.width` / `media.height`.

`imageUrl: string` and split `imageUrl` + `imageId` + `imageWidth` + `imageHeight` attribute clusters are phased out. New block attributes use `IImage`; existing blocks migrate as they're touched, following the encounter protocol.

The canonical editor pattern for `IImage` block attributes is inline `MediaUpload` (from `@wordpress/block-editor`), with the handler building the full `IImage` object before calling `setAttributes`. `mega-menu-info-banner/edit.tsx` and `mega-menu-featured-banner/edit.tsx` are the references — `handleMediaSelect` reads `media.id`, `media.url`, `media.alt`, `media.title`, `media.width`, and `media.height` from the WordPress media object and assembles the `IImage` shape in one place.

The existing `MediaSelector` wrapper at `backend/plugins/gravity-platform-core/src/components/editor-sidebar/MediaSelector.tsx` emits a fixed `MediaSelectorImage` shape (`{ imageUrl, mediaId, mediaWidth, mediaHeight, altText }`) — structurally the legacy split-field cluster this ADR is phasing out. Six blocks consume it (`card`, `hero-card`, `hero-cards`, `mega-menu-locations`, plus `navigation-menu-item`'s `LocationPaneSettings` and `EquipmentPaneSettings`); they fall under the encounter protocol below when touched. When the last consumer migrates off, `MediaSelector.tsx` is a deletion candidate — a reshaped wrapper emitting `IImage` would be a single-consumer abstraction at that point, and inline `MediaUpload` already reads cleanly without the indirection.

For sidebar previews using `@wordpress/components` `ResponsiveWrapper`, pass `naturalWidth={image.mediaDetails?.width}` and `naturalHeight={image.mediaDetails?.height}` directly. The aspect-ratio math is correct because both dimensions come from the same `IImage` object.

## Consequences

- Positive: consistent shape across blocks. There is one answer to "what does an image look like" — the same answer the frontend domain layer already gives.
- Positive: `IImage` carries alt text and dimensions natively, so accessibility (`<img alt={image.altText}>`) and layout-stable rendering (`next/image` with explicit `width`/`height` instead of `fill`) are reachable without schema changes.
- Positive: editor preview correctness is automatic — `mediaDetails.width/height` from a real upload feed `ResponsiveWrapper` exactly the way it expects, eliminating the THR-1817 skew bug class for any block that adopts the shape.
- Negative: existing blocks with `imageUrl: string` or split-field clusters need migration. Reviewers flag `imageUrl: string` on new attributes as a regression.
- Neutral: WordPress's `MediaUpload` is still the underlying control. Reuse `MediaSelector` (or the inline `MediaUpload` + `ResponsiveWrapper` pattern from `mega-menu-info-banner/edit.tsx`) — the point is conforming the emitted shape to `IImage`, not reinventing media editing.

### Migration shape: native vs adapter

When migrating a block to `IImage`, choose between two shapes based on production status — the same decision tree ADR-0019 established for `ILink`:

- **Adapter (default for shipped blocks):** Keep flat string attributes (`imageUrl`, optionally `imageId`/`imageWidth`/`imageHeight`) at the schema level. Build the `IImage` object inside the edit handler when emitting to the component. Saved content stays compatible — the schema didn't change. The frontend block reads the flat fields and assembles `IImage` at the resolver boundary or component prop boundary.
- **Native (for unshipped blocks, or shipped blocks where WP `deprecated[]` migration is appropriate):** Schema attribute is `image: IImage`. No flat fields, no adapter. Saved content using the legacy shape is migrated at parse time via WordPress's `deprecated[]` array with an `isEligible` predicate and a `migrate(attributes)` function — the canonical precedent is `button-group-item/index.tsx`, which uses this exact mechanism for its `link: string` → `link: ILink` migration. The `mega-menu-info-banner` block landed `image: IImage` natively because it was pre-production.

**Why prefer native when WP `deprecated[]` migration is available:** the adapter pattern in ADR-0019 was conservative — schema migration scripts would have been expensive, but WP's `deprecated[]` is parse-time, free, and built for exactly this case. For a block whose only legacy attribute shape is a single `imageUrl: string` (no compound or relational data), `deprecated[]` cleanly maps the legacy URL to a partial `IImage` with `mediaDetails: undefined`, and `ResponsiveWrapper`'s graceful fallback keeps the editor preview rendering correctly until the editor next replaces the image. Native shape ships forward; the adapter complexity stays out of the codebase.

**How to apply:** before starting an `IImage` migration on an existing block, decide:

- If the block ships content live AND the legacy shape is non-trivial (compound fields beyond a URL, relational references) → adapter, per ADR-0019's template.
- If the block ships content live AND the legacy shape is a simple URL → native + WP `deprecated[]` migration.
- If the block is unreleased or feature-flagged off → native, no migration needed.

### Encounter Protocol

When a block using `imageUrl: string` or split-image attributes is discovered during unrelated work, the author judges scope, blast radius, and relation to current work before deciding. This applies the general encounter protocol (ADR-0022) to image attributes specifically:

- **Migrate in the current ticket** when: the block is already being touched by the current work, the migration is contained (doesn't ripple to shared types, resolvers, or multiple consumers), and the PR narrative still reads cleanly.
- **File a Linear ticket** when: the block is unrelated to current work, migration touches shared types or multiple consumers, or folding it in would bloat the PR, broaden review surface, or delay ship.
- **Silent workarounds are the failure mode this ADR prevents.** Routing data around an `imageUrl: string` attribute to avoid touching it is not an option. Flag every time: migrate or ticket, never ignore.

## References

- ADR-0019 — Block Link Attributes Use ILink (parallel precedent; same migration template)
- ADR-0022 — Encounter Protocol for Out-of-Scope Anti-Patterns (general encounter rule)
- `frontend/lib/domain/image.ts` — `IImage` definition
- `backend/plugins/gravity-platform-core/src/blocks/mega-menu-info-banner/edit.tsx` — canonical native-shape pattern (`handleMediaSelect` builds full `IImage`)
- `backend/plugins/gravity-platform-core/src/blocks/mega-menu-featured-banner/edit.tsx` — second canonical reference; built natively from day one with `deprecated[]` migration for legacy saved content
- `backend/plugins/gravity-platform-core/src/components/editor-sidebar/MediaSelector.tsx` — legacy split-field wrapper; consumers fall under the encounter protocol
- `backend/plugins/gravity-platform-core/src/blocks/button-group-item/index.tsx` — `deprecated[]` migration precedent (link variant)
- `.claude/architect/backend-editor-blocks.md` § Image Attributes
- `.claude/plans/thr-1817.md` — branch where the IImage migration for `mega-menu-featured-banner` landed
