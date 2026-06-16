# Documentation Convention

The convention for organizing human-readable documentation alongside agent-facing context. Routed to any agent working under `docs/`.

## Audience model

Docs live under `docs/` and are organized by reader goal. PRISM's own docs use a flat layout per the `documentation.format` config value; teams using other formats (Nextra, Docusaurus) may add subdirectories per their format's convention.

Agent-facing context (`.prism/rules/`, `.prism/architect/`, `.claude/skills/`) is **not** duplicated into `docs/`. When a `docs/` page covers the same topic as a `.claude/` file, the `docs/` page provides the human-readable onboarding narrative and cross-references the `.claude/` file for the precise, enforceable spec.

## Ownership rules

| Path                 | Owner             | Load pattern                                                                                                                                |
| -------------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `.prism/rules/`     | Agents            | Cross-cutting specs auto-loaded into every conversation (writing voice, code standards, git conventions, accessibility — apply to all work) |
| `.prism/architect/` | Agents            | Scoped specs loaded via manifest file-match — context files and rules that only apply when specific files are in scope                      |
| `.claude/skills/`    | Agents            | Skill definitions invoked by name                                                                                                           |
| `docs/`              | Developers / end users | Human-readable guides; format and structure per `documentation` config                                                                 |

When content overlaps, `.claude/` is the source of truth for agent enforcement. `docs/` is the source of truth for human onboarding. Neither duplicates the other — they cross-reference. Within `.claude/`, rules that apply to all work live in `rules/`; rules and context that apply only to specific directory trees live in `architect/` and are keyed to those trees in `.prism/architect/manifest.json`.

## Frontmatter schema

Every file in `docs/` should include YAML frontmatter:

```yaml
---
title: "Page Title"
description: "One-line description for search and link previews"
category: "category-from-the-team-list"
audience: "dev | user"
last_updated: "YYYY-MM-DD"
---
```

- **title**: Display title for the page. Used by static site generators and search.
- **description**: Single sentence. Appears in search results and link previews.
- **category**: Match the subdirectory the file lives in. The category list lives in the team's docs README — extend it when a new directory is added.
- **audience**: the intended reader — `developer-user` for PRISM's own docs; teams using a two-audience split use `dev` and `user`.
- **last_updated**: The date the page content was last meaningfully updated. Format: `YYYY-MM-DD`. Set to today's date whenever a doc is created or its content is edited.

Optional fields:

- **related_docs**: List of other `docs/` pages that share content with this page. Human-facing convenience — agents get relationship data from a Cross-Reference Map (see below), not from frontmatter. Format: `- "filename.md — shared topic"`.

## Images

### Path convention

Image paths in docs use **relative format** from the doc file to the `public/` directory (or the team's image root). Many static site generators don't resolve absolute paths reliably from inside markdown content.

```markdown
![Alt text](../../../public/images/<area>/<topic>/<image>.png)
```

The number of `../` segments depends on the doc's depth in the tree.

### Directory structure

Mirror the docs tree:

```
docs/public/images/
  user/
    <feature-area>/<topic>/
  dev/
    architecture/<topic>/
    operations/<topic>/
    getting-started/<topic>/
```

### File naming

- Lowercase, kebab-case: `template-parts.png`, `export-buttons.png`
- Descriptive of the content: `recaptcha-settings.png` not `step-2.png`
- Use `.png` for screenshots, `.svg` for diagrams

### Alt text

Every image must have meaningful alt text that describes what the screenshot shows — not just labels it.

- Good: `"The settings sidebar showing the Headline Level dropdown set to H2"`
- Bad: `"Screenshot"`
- Decorative images (rare in docs) use `alt=""`

## Callouts

Docs use GitHub alert syntax for callout boxes. Five types are available: NOTE, TIP, IMPORTANT, WARNING, CAUTION. See `.prism/references/doc-callouts.md` for syntax, when to use each type, and examples.

Rules: most pages should have 1–3 callouts. Beyond 3, each additional callout must earn its place — ask whether the information could live in the body text instead. A page with 5+ callouts is a signal it's covering too much ground and may need splitting. Keep callouts short (1–3 sentences). WARNING and CAUTION should be rare.

## Cross-Reference Map

An optional table mapping `.claude/` agent files to their `docs/` human-readable counterparts. Briar uses this for staleness detection: when a file on either side changes, the corresponding file on the other side may need updating.

The map is per-team and lives at the bottom of this file once your team's docs are populated. Format:

| Agent File | Docs Counterpart | Relationship |
|------------|------------------|--------------|
| `.prism/rules/<rule>.md` | `docs/<rule>.md` | Rules file has enforceable spec; docs file is narrative onboarding |
| `.prism/architect/<topic>.md` | `docs/<topic>.md` | Architect file has agent-facing patterns; docs file is the teammate-facing guide |

Add rows as needed. The map is informal — its job is to surface counterpart files during edit, not to be exhaustive.

## File naming

- Lowercase, kebab-case: `local-setup-mac.md`, `repository-service-pattern.md`
- Match the topic, not the source: a wiki page called `How-to:-Import-X-via-spreadsheet.md` becomes `import-x.md`
- Category subdirectories serve as the organizational grouping — filenames describe the specific topic
