# User Block Doc Template

Template for user-facing block documentation in `docs/content/user/blocks/`. Audience: dealers, site builders, and support staff with WordPress admin access but no code knowledge.

This template is a specialization of `user-doc-template.md` for blocks. Use it for every block that has a user-facing presence in the WordPress editor. Pilot references: `docs/content/user/blocks/mega-menu/mega-menu-about-us.md`, `mega-menu-column.md`, `mega-menu-columns.md`.

## When to use

Every block with a user-facing editor presence gets a page in `docs/content/user/blocks/`. Even a block with one attribute gets a page — the page confirms the block exists, what it does, and where to find it.

---

## Structure

Every user block doc has these sections in this order:

1. **Overview**
2. **Prerequisites**
3. **How to Use**
4. **Block Options** — Toolbar + Sidebar, always both headings even if one is empty
5. **Common Scenarios** _(optional — skip if there's nothing non-obvious to walk through)_
6. **Tips & Gotchas**
7. **Parent & Child Blocks** — Lives inside + Contains, always both headings even if one is empty
8. **Technical Reference** — single link to the dev counterpart for support staff doing a deeper dive

The headings are consistent across every block doc so readers can jump to the section they need without hunting. Missing sections are explicitly stated as empty ("This block has no toolbar controls", "The About Us block has no inner blocks"), not silently omitted.

---

## Template

```markdown
---
title: "[Display Name]"
description: "One-line description for search and meta tags"
category: "blocks"
audience: "user"
last_updated: "YYYY-MM-DD"
---

# [Display Name]

## Overview

One or two short paragraphs. Lead with the end result: "This block adds a…" or "The [Block Name] block is the container that…". Call out where it lives (standalone page vs. inside a parent block) and what it is _not_ for.

## Prerequisites

Bullet list of what needs to be in place before using this block — feature flags, parent blocks, permissions. Keep each bullet to one line.

- Prerequisite one
- Prerequisite two

## How to Use

### Step 1 — [Action verb phrase]

One or two sentences describing what this step accomplishes and how.

### Step 2 — [Action verb phrase]

Numbered sub-steps when a step has multiple actions:

1. Open the thing.
2. Click the thing.
3. Set the value.

### Step 3 — [Action verb phrase]

Continue as needed. Most blocks need 2–4 steps.

## Block Options

Document **every configurable option**. If the block has no controls in one location, state it explicitly instead of skipping the heading.

### Toolbar

| Option          | What it does               | Values            | Default |
| --------------- | -------------------------- | ----------------- | ------- |
| **Option name** | Plain-English description. | Comma, separated. | Value.  |

_or when empty:_

This block has no toolbar controls — all options live in the sidebar.

### Sidebar

| Option          | What it does               | Values            | Default |
| --------------- | -------------------------- | ----------------- | ------- |
| **Option name** | Plain-English description. | Comma, separated. | Value.  |

## Common Scenarios

_Optional section — skip when there's nothing to say._

### [Scenario title]

A specific use case with numbered steps and a clear outcome.

1. Do the first thing.
2. Do the second thing.
3. Confirm the result.

## Tips & Gotchas

Short bolded lead-ins for edge cases and non-obvious behavior. Use callouts (`> [!NOTE]`, `> [!TIP]`, `> [!IMPORTANT]`, `> [!WARNING]`) sparingly — 0–2 per page. See `.claude/references/doc-callouts.md`.

**Behavior that surprises people.** One sentence explaining what happens and why.

**Another gotcha.** One sentence.

> [!TIP]
> Short, actionable advice that makes the feature easier to use.

## Parent & Child Blocks

### Lives inside

- [Parent Block Name](./parent-block.md) — one-line note on the relationship.

_or when the block is placed directly (no parent block):_

This block can be placed directly in any template or page — it does not need to live inside another block.

### Contains

- [Child Block Name](./child-block.md) — one-line note on what role it plays inside this block.

_or when the block has no inner blocks:_

This block has no inner blocks.

## Technical Reference

Want a deeper look at how this block works under the hood — its attributes, editor controls, and how it wires into the rest of the site? See the [technical reference for [Display Name]](../../dev/blocks/[block-name].md).
```

---

## Writing rules

All general user-doc rules from `user-doc-template.md` apply. Block-specific emphasis:

- **Plain English.** No attribute names, type names, or file paths. "Set the Width" not "Set the `width` attribute." Developers read the dev doc for the technical shape.
- **One link to the dev counterpart, in the Technical Reference section.** Inside the prose of a user doc, link to other user docs (`./other-block.md`); the only crossing into `../../dev/...` is the single link in the Technical Reference section. The user doc's primary audience is the support team, who may use the page as a starting point for a deeper investigation in the dev doc. When a parent or child block is internal-only (no user doc), describe it in plain English without a link instead.
- **Block Options must be tables.** Tables are scannable and force you to name every column. A bullet list or prose description for options is a regression from the template.
- **Both Toolbar and Sidebar headings are always present.** If a location has no controls, say so with one sentence. Do not silently omit the heading.
- **Parent & Child Blocks is always present.** If there are no parents (the block is a top-level / standalone block) or no children (the block has no inner blocks), say so explicitly in plain language. Avoid "root" and "leaf" — those are tree-structure terms readers don't share. This is how readers navigate the block hierarchy from inside a single page.
- **Callouts earn their place.** 0–2 per page. The tables already communicate defaults and values — use callouts for surprising behavior, warnings, and tips that don't fit in a table cell.

## Relation to `mega-menu.md` (umbrella doc)

The umbrella user doc at `docs/content/user/blocks/mega-menu/mega-menu.md` is a system-level overview + jump-table after per-block pages exist. Per-block pages own the full Block Options and parent/child detail. The umbrella links out — it does not duplicate.
