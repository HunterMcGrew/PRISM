---
Number: 0028
Title: Block Attribute Deprecation Pattern
Status: accepted
Date: 2026-05-02
---

## Context

Block attribute deprecations have surfaced often enough — ADR-0019 (`url: string` → `ILink`), ADR-0027 (`backgroundImage` + flat dimensions → `image: IImage`), and the smaller mega menu migrations — that the team has implicitly converged on a pattern. Each migration solved the same problem independently and ended up with the same three-leg shape: WP's `deprecated[]` array for editor-side parse, a write-side fix in any PHP service that builds the block, and a frontend resolver + typed legacy shape for the read-side adapter.

The implicit pattern works, but two costs:

1. Each new author rediscovers the three legs from the existing examples.
2. Without a doctrine, the write-side leg gets forgotten silently — the frontend keeps adapting and the migration service keeps emitting legacy shape forever.

THR-1817 (the `image` attribute migration on `mega-menu-featured-banner`) made the asymmetry visible. The WP `deprecated[]` array landed in `index.tsx`. But `MegaMenuMigrationService::buildFeaturedBanner()` continued emitting `attrs.backgroundImage` for every fresh dealer migration, and three tests asserted that exact shape. The frontend resolver had no read-side fallback for already-published wp_options content sitting on dealer sites in legacy shape. The architect docs had no doctrine on what a "complete" deprecation looks like, so each missed leg landed silently.

This ADR captures the doctrine. ADR-0019 and ADR-0027 stay as concrete shape-specific guidance; this one carries the framework.

## Decision

A block attribute deprecation has up to three legs. Authors apply each leg that's relevant to the block:

- **Leg 1 — Editor parse migration (WordPress `deprecated[]`).** Always applies. Add a `deprecated[]` entry to the block's `index.tsx` whose `isEligible(attributes)` predicate detects the legacy shape and whose `migrate(attributes)` function returns the canonical shape. WordPress runs `migrate()` at editor parse time; saving the block writes the canonical shape back. Canonical pattern: `backend/plugins/gravity-platform-core/src/blocks/button-group-item/index.tsx`.

- **Leg 2 — Write-side migration service (when applicable).** When a PHP service builds blocks of this type (`MegaMenuMigrationService::build*()`, content seeders, importers), update its emit shape to the canonical form. Without this leg, fresh content in production lands in legacy shape and the frontend leg has to carry it indefinitely. The grep test for whether this leg applies:

  ```bash
  grep -rn "'blockName' => 'gravity-platform-core/<block-name>'" backend/plugins/gravity-platform-core/includes/
  ```

  Each match is a write-side leak that needs updating in the same ticket.

- **Leg 3 — Read-side adapter (frontend resolver + typed legacy shape).** Applies whenever published content can sit unread for non-trivial time before the editor re-parses it. WP's `deprecated[]` array only fires when the editor parses saved markup — until a human opens and saves the block, the frontend reads legacy shape directly. The adapter is the read-side fallback. Pattern detailed in `.claude/architect/frontend-blocks.md` § Legacy Attribute Adapter Pattern.

### Naming convention for legacy shapes

The frontend's typed legacy shape carries a predictable name so reviewers, debuggers, and future authors can grep and locate it.

- **Default — `Legacy<DeprecatedAttributeName>`.** PascalCase, suffixed with the primary deprecated attribute name. The type body carries that attribute plus any sibling fields part of the same shape (dimension siblings, paired URL/target fields, etc.). The name picks the primary; the body is exhaustive.
- **Same-name escape hatch — `Legacy<AttributeName>_<ShapeQualifier>`.** Used only when the same attribute name has been deprecated more than once across different shapes (e.g. `image: string` → `image: { url, id }` → `image: IImage`). The signal: WP's `isEligible` predicate checks structure (`typeof attrs.image === "string"`) instead of presence (`typeof attrs.backgroundImage === "string"`).

Examples:

- THR-1817: `LegacyBackgroundImage` carries `backgroundImage` + `backgroundImageId` + `backgroundImageWidth` + `backgroundImageHeight`.
- Hypothetical paired URL/target: `LegacyButtonUrl` carries `buttonUrl` + `buttonUrlTarget`.
- Same-name re-deprecation: `LegacyImage_StringUrl` and `LegacyImage_FlatFields` if the `image` attribute had been deprecated twice.

**Why this convention works:** the grep test. A future reader investigating "why isn't this saved `backgroundImage` rendering" greps `LegacyBackgroundImage` and lands directly on the type definition and the resolver branch that handles it. Version-numbered names (`LegacyAttributesV1`, `V2`) carry no information about what shape they represent — every reader has to dig.

### Type composition

The block's `schema.ts` exports two layered types:

```ts
// Canonical — what the editor writes, what the component sees, what tests assert.
export type BlockAttributes = { ... };

// Read-only legacy. Lives next to BlockAttributes so the resolver can pick
// it up but edit.tsx and component code never see it.
export type LegacyBackgroundImage = { ... };

// Resolver-facing intersection. Only the resolver consumes Partial<this>.
export type BlockAttributesWithLegacy =
  BlockAttributes & LegacyBackgroundImage;
```

Each new deprecation round adds a sibling `Legacy*` type and intersects it into `BlockAttributesWithLegacy`. The canonical `BlockAttributes` stays clean — it never carries deprecated fields, even read-only. The editor's `edit.tsx` keeps importing `BlockAttributes`, so it can't accidentally write legacy fields.

### When each leg is required

| Leg | Required when |
| --- | --- |
| Leg 1 — `deprecated[]` | Always. Without it, the editor warns "this block contains unexpected attributes" and the author has to re-save every block manually to migrate it. |
| Leg 2 — Migration service emit | Only when a PHP service builds this block type. Use the grep test above to confirm. |
| Leg 3 — Read-side adapter | Whenever the block serves from persistent storage (post content, `wp_options`) to the frontend without going through editor parse on every read. Practical effect: almost always. |

The architect rule for authors: when adding leg 1, deliberately check legs 2 and 3. The grep test for leg 2 takes seconds. The question for leg 3 is "does the frontend read this block from storage that the editor doesn't re-parse on every read?" — yes for almost every block.

### When to retire a legacy shape

Legacy shapes accumulate. Without a retirement criterion they become permanent furniture and `BlockAttributesWithLegacy` grows unboundedly.

A `Legacy<...>` shape and its resolver branch are retired when one of the following holds:

- A direct query against production wp_options / post content shows zero instances of the legacy fields.
- A one-shot WP migration script has rewritten all known legacy content to the canonical shape.
- The legacy shape has been in `deprecated[]` long enough for ordinary editor activity to migrate every dealer's content (judgment call — typically one full content review cycle).

Retirement is its own deletion ticket, not part of a new feature ticket. The retiring author owns confirming no legacy content remains. Both the `Legacy*` type and the resolver branch are removed in the same change.

### Encounter Protocol

The encounter protocol from ADR-0022 applies. When a deprecated attribute shape is discovered during unrelated work, the author judges whether to migrate in the current ticket or file a separate one. Silent workarounds — routing data around a legacy attribute to avoid touching it — are the failure mode this ADR prevents. Flag every time: migrate or ticket, never ignore.

## Consequences

- Positive: a complete deprecation has one shape across the codebase. Authors stop rediscovering the three legs each time, and the migration-service leg gets visibility through the grep test.
- Positive: the read-side adapter has a typed contract instead of inline `as` casts. `Legacy*` types make the resolver self-documenting and let TypeScript prevent the editor and component from accidentally reading legacy fields.
- Positive: reviewers (Eric, Briar) can flag any backend `deprecated[]` addition without a paired frontend leg as Major. The doctrine gives the flag a citation.
- Negative: legacy types accumulate over time. The retirement criterion is the discipline that contains the cost — without enforcement it's easy to never delete a `Legacy*` type once the migration is in production.
- Neutral: this codifies what ADR-0019 and ADR-0027 already implicitly required. Existing migrations don't need rework; new migrations follow this doctrine.

## References

- ADR-0019 — Block Link Attributes Use ILink (concrete shape-specific instance)
- ADR-0027 — Block Image Attributes Use IImage (concrete shape-specific instance)
- ADR-0022 — Encounter Protocol for Out-of-Scope Anti-Patterns
- `.claude/architect/backend-editor-blocks.md` § Deprecating Block Attributes (operational guidance, leg 1 + leg 2)
- `.claude/architect/frontend-blocks.md` § Legacy Attribute Adapter Pattern (operational guidance, leg 3)
- `backend/plugins/gravity-platform-core/src/blocks/button-group-item/index.tsx` — canonical `deprecated[]` precedent
- `backend/plugins/gravity-platform-core/src/blocks/mega-menu-featured-banner/index.tsx` — full three-leg example (THR-1817)
- `.claude/plans/thr-1817.md` — branch where the doctrine landed
