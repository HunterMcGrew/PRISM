# User Documentation Template

Template for user-facing docs in `docs/content/user/`. Audience: dealers, site builders, and support staff with WordPress admin access but no code knowledge.

## When to use

Every block that has a user-facing presence gets a user doc. Even if it's 3 steps and 1 attribute — the doc confirms the block exists, what it does, and where to find it. For non-block features (configuration, customization, BYO), use this template when the feature is accessible from WordPress admin.

Lightweight blocks with 1-2 self-evident options can use a shorter form — skip Common Scenarios and Tips & Gotchas if there's nothing non-obvious to say. But Overview, How to Use, and Block Options are always required.

## Category-specific rules

The base template below covers user docs in general. Some categories have additional shape rules that layer on top:

- **`category: blocks`** — block docs in `docs/content/user/blocks/` follow additional structure and writing rules in `.prism/references/user-block-doc-template.md` — Block Options as tables per location (Toolbar + Sidebar), mandatory Parent & Child Blocks section for navigating the block hierarchy, and no cross-links into `docs/content/dev/`. Apply that template alongside this one.

Other user categories (`byo`, `configuration`, `customization`, `integrations`) follow the base template below — no additional rules today.

---

## Template

```markdown
---
title: "[Feature Name]"
description: "One-line description for search and meta tags"
category: "blocks | byo | configuration | customization"
audience: "user"
last_updated: "YYYY-MM-DD"
---

# [Feature Name]

## Overview

What this feature does and why it exists. One short paragraph. Lead with the end result: "This block adds a..." or "This guide shows you how to..."

## Prerequisites

What needs to be in place before using this feature (plugin version, WordPress settings, etc.). Omit if none.

## How to Use

### Step 1 — [Title]

Clear description of what this step accomplishes and how to do it.
Refer to WordPress admin locations specifically (e.g. "In the block editor, open the [Block Name] block settings in the sidebar").

![Descriptive alt text](../../../public/images/user/{category}/{topic}/step-name.png)

### Step 2 — [Title]

...

## Block Options

Document **every configurable option** in the block. Do not skip anything. Split into two groups:

### Toolbar

Options available in the floating toolbar when the block is selected (alignment, text controls, etc.).

**[Option Name]**
What it does, available values, default. Note non-obvious behavior.

### Sidebar

Options available in the block settings panel on the right.

**[Option Name]**
What it does, available values, default. Note non-obvious behavior.

## Common Scenarios

### [Scenario title]

A specific use case with step-by-step guidance.

## Tips & Gotchas

Edge cases, limitations, or non-obvious behavior worth flagging. Use callout syntax for important notes — see `.prism/references/doc-callouts.md`.
```

---

## Writing rules

- Plain English — no code, no file names, no technical jargon. Specifically avoid block-tree terms like "leaf" and "root" — readers don't share this vocabulary. Say "has no inner blocks" instead of "is a leaf"; say "can be placed directly in any template or page" instead of "is a root block".
- Observable behavior only — describe what the user sees, not how it works
- Each step should be independently actionable
- Start with an action verb (e.g. "Navigate to...", "Click...", "Verify that...")
- **Document every block option** — toolbar, sidebar panels, toggles, dropdowns. Nothing skipped.
- **Generate the TOC after writing** — Nextra auto-generates a table of contents from headings, so a manual TOC is not needed unless the page is very long
- **Image paths** use relative format from the doc to `public/`: `../../../public/images/user/{category}/{topic}/descriptive-name.png` (adjust `../` depth based on file location)
- **Alt text** must describe what the screenshot shows, not just label it: "The block settings sidebar showing the Headline Level dropdown" not "Block settings"
- **Callouts** — use GitHub alert syntax for tips, warnings, and important notes. See `.prism/references/doc-callouts.md` for when to use each type.
