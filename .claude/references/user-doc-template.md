# User Documentation Template

Template for user-facing docs. The audience and doc location come from `documentation.audience` and `documentation.location` in `.ai-skills/config.json` — set per-team during onboarding. Read those values before writing; don't assume a specific audience or path.

## When to use

When the team's `documentation.audience` includes end users (admins, operators, customers, or anyone who uses the product without editing the code), use this template for guides covering features, configuration, and how-tos.

When `documentation.audience` is `developer-user` (the reader is also the builder), this template still applies for user-facing feature guides — the distinction is content depth and assumed context, not a separate file path.

Lightweight features with one or two self-evident options can use a shorter form — skip Common Scenarios and Tips & Gotchas if there is nothing non-obvious to say. Overview, How to Use, and Options are always required.

## Category-specific rules

The base template below covers user-facing docs in general. Some categories have additional shape rules that layer on top:

- **`category: blocks`** — block docs are a category layer on this base template. Apply the standard template structure; add a Block Options section (as tables per location: Toolbar + Sidebar), a Parent & Child Blocks section for navigating the block hierarchy, and omit cross-links into developer docs. This category applies to teams with Gutenberg/WordPress blocks in their stack.

Other categories follow the base template below — add category rules here as the team's needs grow.

---

## Template

```markdown
---
title: "[Feature Name]"
description: "One-line description for search and meta tags"
category: "<team-category>"
audience: "user"
last_updated: "YYYY-MM-DD"
---

# [Feature Name]

## Overview

What this feature does and why it exists. One short paragraph. Lead with the end result: "This lets you..." or "This guide shows you how to..."

## Prerequisites

What needs to be in place before using this feature. Omit if none.

## How to Use

### Step 1 — [Title]

Clear description of what this step accomplishes and how to do it.
Refer to the product's UI locations specifically (e.g. "In the settings panel, open [Section Name]").

![Descriptive alt text](<relative-path-to-image>)

### Step 2 — [Title]

...

## Options

Document **every configurable option** the feature exposes. Do not skip anything.

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

- Plain English — no code, no file names, no technical jargon
- Observable behavior only — describe what the user sees, not how it works
- Each step should be independently actionable
- Start with an action verb (e.g. "Navigate to...", "Click...", "Verify that...")
- **Document every option** — every setting, toggle, dropdown. Nothing skipped.
- **Image paths** use relative format from the doc to the team's image root (set during onboarding). Adjust `../` depth based on the doc's location in the tree.
- **Alt text** must describe what the screenshot shows, not just label it: "The settings sidebar showing the Headline Level dropdown" not "Screenshot"
- **Callouts** — use GitHub alert syntax for tips, warnings, and important notes. See `.prism/references/doc-callouts.md` for when to use each type.
- **TOC** — most static site generators auto-generate a table of contents from headings; check your team's configured format before adding one manually.
