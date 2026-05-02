---
Number: 0019
Title: Block Link Attributes Use ILink
Status: accepted
Date: 2026-04-19
---

## Context

Block link attributes historically shipped in whatever shape the block author reached for first. Some blocks stored a bare `url: string`. Others stored a split pair — `url` plus `urlTarget` — with no guarantee the two stayed in sync. A "link" in one block carried different fields than a "link" in the next, so shared code that wanted to read a link had to branch on which block it came from.

Migration tickets already in flight — THR-1443, THR-1445, THR-1449, THR-1588, THR-1619, THR-1621 — are converting existing blocks to a single link shape one at a time. This ADR captures the target state those migrations are moving toward, so new blocks land on the canonical shape from day one and reviewers have a durable reference for flagging regressions.

## Decision

Block link attributes take the `ILink` shape defined in `frontend/lib/domain/link.ts`:

```ts
interface ILink {
	href: string;
	target?: LinkTarget;
	rel?: string;
	label?: string;
	className?: string;
}
```

`href`, `target`, and `rel` are the core link fields; `label` and `className` are optional and only set when a block needs a display label or a link-specific class override. `url: string` and split `url`/`urlTarget` attributes are being phased out. New block attributes use `ILink`; existing blocks migrate as they're touched.

Editor controls for link editing come in two components, both composing `ControlledUrlInput`:

- `LinkControl.tsx` — full sidebar editor (URL + target + rel).
- `ToolbarLink.tsx` — inline toolbar popover.

`ControlledUrlInput` wraps WordPress's `URLInput` and emits a normalized URL string (with suggestion filtering). `LinkControl` and `ToolbarLink` each pair that string input with target/rel controls and assemble the full `ILink` object emitted to the block. Together these two components cover every link-editing surface an editor block needs.

## Consequences

- Positive: consistent shape across blocks. `target` and `rel` carry predictably; there's one answer to "what does a link look like."
- Positive: `isLinkObject` (in `frontend/lib/type-guards/link.ts`) enforces the shape at boundaries. `ensureLinkObject` (in `frontend/lib/utilities/link-utilities.ts`) wraps legacy string values at block-attribute write time so partial migrations don't corrupt data.
- Positive: editor UX stays consistent — two components cover every link-editing need, so dealer-facing editors don't hit three different link UIs across blocks.
- Negative: existing blocks with `url: string` or split `url`/`urlTarget` need migration. Reviewers must flag `url: string` on new attributes as a regression.
- Neutral: WordPress's own `URLInput` is still the underlying control. We wrap, not replace — the point is conforming output to `ILink`, not reinventing link editing.

### Migration shape: native ILink vs adapter

When migrating a block to `ILink`, choose between two shapes based on production status:

- **Adapter (default for shipped blocks):** Keep flat string attributes (`ctaLink`, `ctaTarget`, `ctaRel`) at the schema level. Build the `ILink` object inside the edit handler when emitting to the component. Saved content stays compatible — the schema didn't change. The frontend block reads the flat fields and assembles `ILink` at the resolver boundary or component prop boundary.
- **Native (for unshipped blocks):** Schema attribute is `link: ILink`. No flat fields, no adapter. The mega menu blocks landed this way because they were pre-production at the time of migration — no saved content existed to preserve.

**Why:** A naive "replace flat fields with `link: ILink`" migration on a shipped block destroys saved content — the new schema rejects the old flat-field data, blocks render empty, and dealers see broken pages. THR-1512 (panel-hero), THR-1619, and THR-1621 each independently arrived at the adapter pattern after considering native and rejecting it for shipped blocks. The decision tree should be the default, not rediscovered.

**How to apply:** Before starting an ILink migration on an existing block, check whether the block ships content live (search dealer sites for instances). If yes → adapter. If no (block is unreleased or feature-flagged off in production) → native. Schema migration scripts are an option in theory but expensive in practice; the adapter pattern is cheaper and reversible.

### Encounter Protocol

When a block using `url: string` or split `url`/`urlTarget` attributes is discovered during unrelated work, the author judges scope, blast radius, and relation to current work before deciding:

- **Migrate in the current ticket** when: the block is already being touched by the current work, the migration is contained (doesn't ripple to shared types, resolvers, or multiple consumers), and the PR narrative still reads cleanly.
- **File a Linear ticket** when: the block is unrelated to current work, migration touches shared types or multiple consumers, or folding it in would bloat the PR, broaden review surface, or delay ship.
- **Silent workarounds are the failure mode this ADR prevents.** Routing data around a `url: string` attribute to avoid touching it is not an option. Flag every time: migrate or ticket, never ignore.

This applies the general "do not refactor unrelated code" principle from `.claude/rules/code-standards.md` to this specific migration — it's not a special-case exception, just the general rule spelled out for the case that keeps coming up.

Generalized in ADR-0022. ADR-0019's scope-specific version stays as the ILink example; the rule applies broadly.

## References

- `frontend/lib/domain/link.ts` — `ILink`, `LinkValue`, `LinkTarget`, `DragAndDropLink` definitions
- `frontend/lib/utilities/link-utilities.ts` — `getLinkHref`, `setLinkTarget`, `setLinkRel`, `ensureLinkObject` (link helper functions)
- `frontend/lib/type-guards/link.ts` — `isLinkObject`, `isLinkTarget` (guard functions)
- THR-1443, THR-1445, THR-1449, THR-1588, THR-1619, THR-1621 — in-flight migration tickets
- `.claude/architect/backend-editor-components.md` — `LinkControl`, `ToolbarLink`, `ControlledUrlInput` component catalog
- `.claude/architect/backend-editor-blocks.md` — block attribute patterns
- `.claude/rules/code-standards.md` — general "do not refactor unrelated code" principle
