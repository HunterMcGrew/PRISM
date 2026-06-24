# Documentation Convention

The convention for organizing human-readable documentation alongside agent-facing context. Routed to any agent working under the team's doc root.

## Model overview

Doc format, location, and audience are per-team onboarding outputs — set by Atlas in `.ai-skills/config.json` during Phase 2 onboarding. Agents read these values before writing any docs:

- **`documentation.location`** — the root path where this team's docs live (e.g. `docs/`, `documentation/`, `site/`)
- **`documentation.audience`** — the primary audience (`developer-user`, `end-user`, `mixed`, or a team-defined value)
- **`documentation.keepsDevDocs`** — whether the team maintains a separate dev doc tree alongside user-facing docs
- **`documentation.format`** — the doc format (`flat-markdown-guides`, `nextra-blocks`, or a team-defined value)

PRISM itself is a single-audience product (`audience: developer-user`, `keepsDevDocs: false`, `format: flat-markdown-guides`). Its docs live under `docs/` as flat markdown guides. Other teams may configure different values — the doc system adapts to what Atlas writes at onboarding, not the other way around.

## Single-audience vs. split-audience teams

**Single-audience teams** (`keepsDevDocs: false`) have one doc tree under `documentation.location`. All docs — feature guides, setup instructions, reference material — live in a single tree organized by topic. PRISM's own docs are this shape.

**Split-audience teams** (`keepsDevDocs: true`) maintain two parallel trees: one for user-facing guides and one for developer-facing docs. A common arrangement is `docs/content/user/` and `docs/content/dev/` — but the actual paths come from the team's onboarding configuration, not from a PRISM default. The dev-doc template applies only when `keepsDevDocs: true`.

The split is a team choice configured during onboarding, not a mandate. When in doubt, read `documentation.keepsDevDocs` before creating any new doc file.

## What goes where

Agent-facing context (`.prism/rules/`, `.prism/architect/`, `.ai-skills/skills/`) is **not** duplicated into the doc root. When a `docs/` page covers the same topic as a `.prism/` file, the `docs/` page provides the human-readable onboarding narrative and cross-references the `.prism/` file for the precise, enforceable spec.

| Path                        | Owner   | Load pattern                                                                               |
| --------------------------- | ------- | ------------------------------------------------------------------------------------------ |
| `.prism/rules/`             | Agents  | Cross-cutting specs auto-loaded into every conversation                                    |
| `.prism/architect/`         | Agents  | Scoped specs loaded via manifest file-match                                                |
| `.ai-skills/skills/`        | Agents  | Skill definitions invoked by name                                                          |
| `${documentation.location}` | Humans  | Human-readable guides and references, organized per team config                            |

When content overlaps, `.prism/` is the source of truth for agent enforcement. The doc root is the source of truth for human onboarding. Neither duplicates the other — they cross-reference.

## Frontmatter schema

Every file in the team's doc root (`documentation.location`) should include YAML frontmatter:

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
- **audience**: `user` for user-facing docs; `dev` for developer-facing docs (only used when `keepsDevDocs: true`). For single-audience teams, `user` is the default.
- **last_updated**: The date the page content was last meaningfully updated. Format: `YYYY-MM-DD`. Set to today's date whenever a doc is created or its content is edited.

Optional fields:

- **related_docs**: List of other `docs/` pages that share content with this page. Human-facing convenience — agents get relationship data from a Cross-Reference Map (see below), not from frontmatter. Format: `- "filename.md — shared topic"`.

## Images

### Path convention

Image paths in docs use **relative format** from the doc file to the image root. Many static site generators don't resolve absolute paths reliably from inside markdown content.

```markdown
![Alt text](<relative-path-to-image-root>/<area>/<topic>/<image>.png)
```

The number of `../` segments depends on the doc's depth in the tree and the team's image root location.

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

## Architecture + operations pairing (two-reader model)

Teams that use a `dev/` doc tree often organize architecture docs under an `architecture/` subdirectory and operations docs under `operations/` — but the actual paths follow `documentation.location` in `.ai-skills/config.json`. A topic that has both a design dimension (why the system looks the way it does) and an execution dimension (how to run it in production) splits across the two directories and cross-links.

**Why this pairing exists.** Two distinct readers: the first-time architect (a new engineer, a CTO onboarding, someone evaluating the design) who needs shape and reasoning, and the 3am-operator reader who needs a checklist. A single doc that serves both compromises both — the architect is buried under keystrokes, the operator has to hunt through reasoning paragraphs for the next step.

**How to apply.** The architecture doc explains _why_ a procedure is the shape it is; the operations doc owns _how_ to execute it. Cross-link both ways. When editing either doc and finding yourself tempted to add content that serves the other reader, move it to the paired file instead of inlining it.

**Naming convention.** Share a topic keyword across both directories so the pairing is discoverable. Exact same base filename is fine when both sides cover the same topic at the same scope; different suffixes are fine — and often clearer — when the operational scope doesn't mirror the architectural scope (e.g. `architecture/payments.md` ↔ `operations/payments-runbook.md`).

**Shape rule for architecture docs.** See `.prism/architect/_toolkit/architecture-doc-shape.md` for the four-beat opening arc and the supporting principles.

## Cross-Reference Map

A team-specific table mapping `.prism/` agent files to their human-readable doc counterparts. Briar uses this for staleness detection: when a file on either side changes, the corresponding file on the other side may need updating.

The map is per-team and lives at the bottom of this file once your team's docs are populated (during onboarding, Phase 3). Paths on the right use the team's configured `documentation.location`. Format:

| Agent File | Docs Counterpart | Relationship |
|------------|------------------|--------------|
| `.prism/rules/<rule>.md` | `${documentation.location}<path>.md` | Rules file has enforceable spec; docs file is narrative onboarding |
| `.prism/architect/<topic>.md` | `${documentation.location}<path>.md` | Architect file has patterns and review rules; docs file walks readers through the topic |

Add rows as architect docs land. The map is informal — its job is to surface counterpart files during edit, not to be exhaustive.

## File naming

- Lowercase, kebab-case: `local-setup-mac.md`, `repository-service-pattern.md`
- Match the topic, not the source: a wiki page called `How-to:-Import-X-via-spreadsheet.md` becomes `import-x.md`
- Category subdirectories serve as the organizational grouping — filenames describe the specific topic
