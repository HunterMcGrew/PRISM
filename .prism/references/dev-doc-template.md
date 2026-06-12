# Developer Documentation Template

Template for developer-facing docs in `docs/content/dev/`. Audience: engineers working on the ${PROJECT} codebase — experienced with the tech stack but potentially new to this project.

## When to use

Create a dev doc when:

- A new architectural pattern or system is introduced
- A feature has integration points other developers need to understand
- A `.prism/architect/` or `.prism/rules/` file exists but has no human-readable onboarding counterpart
- The feature spans frontend and backend with non-obvious wiring

Not every code change needs a dev doc. If the code is self-documenting and follows established patterns, the architect context files are sufficient.

## Category-specific rules

The base template below covers dev docs in general. Some categories have additional shape rules that layer on top:

- **`category: architecture`** — docs in `docs/content/dev/architecture/` follow the four-beat opening arc and supporting principles in `.prism/architect/architecture-doc-shape.md`. Apply that rule alongside this template.
- **`category: operations`** — operations docs pair with architecture counterparts (same base filename where the topics align) per the Two-Reader Model described in `.prism/architect/documentation.md § Architecture + Operations Pairing`.
- **`category: blocks`** — dev block docs in `docs/content/dev/blocks/` are a category layer on this base template. Apply the standard template structure; add a Structure paths table, Block Attributes, Editor Controls split into Toolbar + Sidebar, Inner Blocks, Block Supports, and a Notes section for block-specific quirks.

---

## Template

```markdown
---
title: "[Feature Name]"
description: "One-line description for search and meta tags"
category: "getting-started | architecture | standards | testing | operations | ai-skills | references"
audience: "dev"
last_updated: "YYYY-MM-DD"
---

# [Feature Name]

## Overview

What changed, why, and the high-level approach. One paragraph. Lead with "what this is and why it matters" before diving into details.

> For the precise, agent-enforced spec, see `.prism/rules/...` or `.prism/architect/...`.

## What's New

### New functionality (didn't exist before)

List genuinely new surfaces — components, hooks, PHP classes, endpoints.

### Enhancements (additions to existing)

List additions to existing components or APIs. Note what changed.

## API Reference

### Components

For each new or modified component:
**`<ComponentName>`** — brief description
| Prop | Type | Default | Description |
|------|------|---------|-------------|
| ... | ... | ... | ... |

### Hooks

For each new or modified hook:
**`use<HookName>(params)`** — brief description, return type, usage example.

### PHP

For each new class, method, or filter:
**`ClassName::methodName(type $param): ReturnType`** — brief description.

### Block Attributes

For each new or changed block attribute: name, type, default, and what it controls.

## Integration Notes

How to wire up new components or hooks. Code snippets for the most common integration pattern.

## Breaking Changes

Anything removed or changed that could break existing usage. Omit if none.

## Related Pages

Links to related dev docs and cross-references to `.claude/` files.
```

---

## Writing rules

- Write for a developer who is new to the codebase but experienced with the tech stack
- Lead with "what this is and why it matters" before diving into details
- Cross-reference `.claude/` files for enforceable rules: "For the precise spec, see `.prism/rules/code-standards.md`"
- Include code examples where they clarify concepts
- Keep pages focused — one topic per page
- Always include a **Related Pages** section linking to relevant docs and `.claude/` files
- **Image paths** use relative format from the doc to `public/`: `../../../public/images/dev/{category}/{topic}/descriptive-name.png` (adjust `../` depth based on file location)
- **Callouts** — use GitHub alert syntax for important architectural constraints, common pitfalls, and tips. See `.prism/references/doc-callouts.md` for when to use each type.

## Sections to omit

Not every dev doc needs every section. Omit sections that don't apply:

- **What's New** — omit for reference docs that aren't tied to a specific change
- **API Reference** — omit if there's no programmatic surface to document
- **Breaking Changes** — omit if there are none
- **Integration Notes** — omit if usage is self-evident from the API reference
