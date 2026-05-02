# Dev Block Doc Template

Template for developer-facing block documentation in `docs/content/dev/blocks/`. Audience: engineers working on the Thrive codebase — experienced with the tech stack but potentially new to this block.

This template is a specialization of `dev-doc-template.md` for blocks. Use it for every block that warrants a standalone dev page. Pilot references: `docs/content/dev/blocks/mega-menu/mega-menu-about-us.md`, `mega-menu-column.md`, `mega-menu-columns.md`.

## When to use

Create a dev block doc when:

- The block has non-trivial wiring between editor attributes, resolver, and frontend component
- The block has inner-block rules that other blocks need to respect
- The block has CSS or alignment wiring that would confuse a new reader of the source
- The block is part of a larger system (like the Mega Menu) where per-block references make cross-linking cleaner than one giant page

For trivial blocks with a single attribute and no surprises, a section in an existing architecture doc may be enough.

---

## Structure

Every dev block doc has these sections in this order:

1. **Overview**
2. **Structure**
3. **Block Attributes**
4. **Editor Controls** — Toolbar + Sidebar subsections, always both even if empty
5. **Inner Blocks** _(omit if the block has no inner blocks)_
6. **Block Supports** _(omit if `block.json` declares only `html: false`)_
7. **Notes** _(omit if there's nothing block-specific to explain)_
8. **Related Pages**

Reader-consistent section names matter more than strict symmetry. If a section has nothing useful to say, omit it (with the exception of Editor Controls, which always shows both Toolbar and Sidebar even when one is empty).

---

## Template

````markdown
---
title: "[Display Name]"
description: "One-line description for search and meta tags"
category: "blocks"
audience: "dev"
last_updated: "YYYY-MM-DD"
related_docs:
  - "mega-menu.md — mega menu architecture overview"
  - "parent-block.md — parent / child relationship note"
---

# [Display Name]

## Overview

`namespace/block-name` is a one-line identifier of what the block does and where it lives in the hierarchy. Follow with one or two paragraphs of context:

- What role this block plays inside its system
- What it contains vs. what contains it
- Any design decision that shaped its attributes (e.g. "horizontal alignment lives on the child, not here")

> For the enforceable architecture spec, see `.claude/architect/...`. For the surrounding system, see [parent system doc](../architecture/...).

## Structure

Paths table — where the code lives. Useful for navigating from the doc to the source.

| Concern             | Path                                    |
| ------------------- | --------------------------------------- |
| Editor registration | `backend/.../src/blocks/block-name/`    |
| Schema              | `frontend/blocks/.../schema.ts`         |
| Resolver            | `frontend/blocks/.../resolver.ts`       |
| Frontend component  | `frontend/components/.../Component.tsx` |
| Shared constants    | `frontend/lib/constants/...`            |

Add or remove rows as relevant. Omit rows that don't apply (e.g. no resolver for editor-only blocks).

## Block Attributes

| Attribute  | Type                 | Default  | Description                               |
| ---------- | -------------------- | -------- | ----------------------------------------- |
| `attrName` | `"left" \| "center"` | `"left"` | One-line description of what it controls. |

Types are written as TypeScript. For shared types imported from frontend constants (e.g. `BlockToolbarAlignment`), link to the contract definition below the table or in Notes.

When an attribute has a subtle default or fallback, a short note below the table is better than a bloated Description column.

## Editor Controls

Both subsections are always present. Empty sections state it explicitly with one sentence.

### Toolbar

| Control            | Writes to           | Type                            | Notes                  |
| ------------------ | ------------------- | ------------------------------- | ---------------------- |
| Vertical alignment | `verticalAlignment` | `BlockVerticalAlignmentToolbar` | Top / Middle / Bottom. |

_or when empty:_

This block has no toolbar controls.

### Sidebar

Panel: **[Panel Title]**

| Control           | Writes to        | Type           | Notes                                                         |
| ----------------- | ---------------- | -------------- | ------------------------------------------------------------- |
| Number of Columns | _(no attribute)_ | `RangeControl` | Min 1, max 4. Adds/removes children via `replaceInnerBlocks`. |

When a control writes to multiple attributes or has no attribute (e.g. a control that manages child blocks), put it in the **Writes to** column as `_(no attribute)_` and explain in Notes.

## Inner Blocks

_Omit this section entirely if the block has no inner blocks._

- **Template:** `[["namespace/child-block", {}]]` — describe what inserting the block creates by default.
- **Allowed:** `["namespace/child-block"]` — or reference a constant like `MEGA_MENU_ALLOWED_BLOCKS`.
- **Orientation:** `horizontal` or `vertical`.
- **Template lock:** on / off — note if `insert`, `all`, or `contentOnly` locks apply.

## Block Supports

_Omit this section if `block.json` declares only `html: false` — that's too trivial to document._

Include the relevant portion of `block.json` as a fenced code block, then explain any non-obvious choices:

```json
{
	"align": ["wide", "full"],
	"spacing": {
		"blockGap": false,
		"margin": ["top", "bottom"],
		"padding": true
	}
}
```

Explain the reason for non-default settings — e.g. "`blockGap: false` because gap is handled by Tailwind classes on the outer flex container, not WP's block gap system."

## Notes

_Omit this section if there's nothing block-specific to explain that doesn't fit elsewhere._

Each quirk, gotcha, or design decision gets its own H3 subheading so readers can scan the section.

### [Gotcha or wiring detail title]

Short explanation (1–2 paragraphs). Code samples when they clarify — and only when they clarify. A paragraph of prose plus a code block is usually the right density.

### [Another note]

…

## Related Pages

| Page                                             | Relationship                    |
| ------------------------------------------------ | ------------------------------- |
| [System architecture](../architecture/system.md) | System-level design             |
| [Parent block](./parent-block.md)                | Container that holds this block |
| [User guide](../../user/blocks/block-name.md)    | End-user configuration          |
| [Pattern reference](../architecture/pattern.md)  | Pattern this block follows      |
````

---

## Writing rules

All general dev-doc rules from `dev-doc-template.md` apply. Block-specific emphasis:

- **Don't call this "API Reference."** Block attributes, editor controls, and inner blocks aren't APIs in the REST sense — they're configuration surfaces. Name sections what they are.
- **File paths live in Structure only.** Do not repeat the editor `edit.tsx` path inside Editor Controls — it's noise. The table in Structure already showed it.
- **Editor Controls is always split into Toolbar + Sidebar.** Even when one is empty. Consistency across blocks matters for reader speed.
- **Notes is an umbrella.** Block-specific quirks — resolver fallback semantics, CSS wiring, column-count math, migration behavior — each get an H3 inside Notes. This keeps the top-level structure predictable while giving space for block-specific detail.
- **Code snippets go in the sections where they clarify the surrounding prose.** A 4-line resolver excerpt makes Notes readable; a 40-line dump does not. If a snippet needs a paragraph of introduction, it's probably better extracted into its own Notes subheading.
- **Link contracts to their definitions.** When an attribute type comes from `frontend/lib/constants/`, link it. Readers new to the project will follow the link; readers who know the constant will scroll past.

## Relation to architect context

`.claude/architect/mega-menu.md` (and equivalents) is the enforceable spec for the system. Dev block docs are the human-readable companion — they explain _this specific block_ within the system. The Overview links to the architect file; the architect file is the source of truth for enforcement.

Dev block docs are reference pages, not architecture docs. System-level architectural reasoning — the four-beat arc, natural-fit framing, platform limits — lives in the paired architecture doc at `docs/content/dev/architecture/<system>.md`. This template is for per-block reference detail.
