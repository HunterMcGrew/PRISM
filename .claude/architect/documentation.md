# Documentation Convention

## Two-Audience Model

All human-facing documentation lives in `docs/`, split by audience:

- **`docs/content/dev/`** -- Developer documentation: architecture, standards, operations, setup guides, AI skills reference. Audience: engineers working on the Thrive codebase.
- **`docs/content/user/`** -- User documentation: block guides, BYO how-tos, configuration, customization snippets. Audience: dealers, site builders, and support staff working in WordPress admin.

Agent-facing documentation (`.claude/rules/`, `.claude/architect/`, `.claude/skills/`) is **not** duplicated into `docs/`. When a `docs/` page covers the same topic as a `.claude/` file, the `docs/` page provides the human-readable onboarding narrative and cross-references the `.claude/` file for the precise, enforceable spec.

## Ownership Rules

| Path                 | Owner             | Load pattern                                                                                                                                |
| -------------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `.claude/rules/`     | Agents            | Cross-cutting specs auto-loaded into every conversation (writing voice, code standards, git conventions, accessibility — apply to all work) |
| `.claude/architect/` | Agents            | Scoped specs loaded via manifest file-match — context files and rules that only apply when specific files are in scope                      |
| `.claude/skills/`    | Agents            | Skill definitions invoked by name                                                                                                           |
| `docs/content/dev/`  | Developers        | Human-readable dev guides and references                                                                                                    |
| `docs/content/user/` | Dealers / support | WordPress admin and site builder guides                                                                                                     |

When content overlaps, `.claude/` is the source of truth for agent enforcement. `docs/` is the source of truth for human onboarding. Neither duplicates the other -- they cross-reference. Within `.claude/`, rules that apply to all work live in `rules/`; rules and context that apply only to specific directory trees live in `architect/` and are keyed to those trees in `.claude/architect/manifest.json`.

## Frontmatter Schema

Every file in `docs/` must include YAML frontmatter:

```yaml
---
title: "Page Title"
description: "One-line description for search and future static site generation"
category: "getting-started | architecture | standards | testing | operations | ai-skills | references | blocks | byo | configuration | customization | integrations"
audience: "dev | user"
last_updated: "YYYY-MM-DD"
---
```

- **title**: Display title for the page. Used by static site generators and search.
- **description**: Single sentence. Appears in search results and link previews.
- **category**: Must match the subdirectory the file lives in.
- **audience**: `dev` for `docs/content/dev/` files, `user` for `docs/content/user/` files.
- **last_updated**: Required on every doc. The date the page content was last meaningfully updated. Set to today's date whenever a doc is created or its content is edited. Format: `YYYY-MM-DD`.

Optional fields:

- **related_docs**: List of other `docs/` pages that share content with this page. Human-facing convenience — agents get relationship data from the Doc-to-Doc Overlap table below, not from frontmatter. Format: `- "filename.md — shared topic"`.

```yaml
related_docs:
  - "backend-editor-blocks.md — editor-only UI pattern"
  - "overview.md — three runtimes"
```

Additional fields (e.g. `tags`, `order`) can be added when a static site generator is chosen.

## Images

### Path convention

Image paths in docs use **relative format** from the doc file to the `public/` directory:

```markdown
![Alt text](../../../public/images/user/blocks/colophon/template-parts.png)
```

The path prefix depends on the doc's depth under `docs/content/`. Most docs are 3 levels deep (e.g. `docs/content/user/blocks/colophon.md`), so the prefix is `../../../public/images/...`. Adjust the number of `../` segments if the doc is at a different depth.

This is required by the current Nextra setup — absolute paths (`/images/...`) do not resolve correctly.

### Directory structure

Images mirror the doc structure:

```
docs/public/images/
  user/
    blocks/{block-name}/
    byo/{topic}/
    configuration/{topic}/
    customization/{topic}/
  dev/
    operations/{topic}/
    architecture/{topic}/
    getting-started/{topic}/
```

### File naming

- Lowercase, kebab-case: `template-parts.png`, `export-buttons.png`
- Descriptive of the content: `recaptcha-settings.png` not `step-2.png`
- Use `.png` for screenshots, `.svg` for diagrams

### Alt text

Every image must have meaningful alt text that describes what the screenshot shows — not just labels it.

- Good: `"The block settings sidebar showing the Headline Level dropdown set to H2"`
- Bad: `"Block settings"`
- Bad: `"Screenshot"`
- Decorative images (rare in docs) use `alt=""`

## Callouts

Docs use GitHub alert syntax for callout boxes. Five types are available: NOTE, TIP, IMPORTANT, WARNING, CAUTION. See `.claude/references/doc-callouts.md` for syntax, when to use each type, and examples grounded in the existing docs.

Rules: most pages should have 1-3 callouts. Beyond 3, each additional callout must earn its place — ask whether the information could live in the body text instead. A page with 5+ callouts is a signal it's covering too much ground and may need splitting. Keep callouts short (1-3 sentences). WARNING and CAUTION should be rare.

## Block Documentation Rule

Every block with a user-facing presence gets a user doc under `docs/content/user/blocks/`, and every block that warrants a standalone dev page gets a dev doc under `docs/content/dev/blocks/`. No exceptions — even a block with 3 steps and 1 attribute gets a doc. The doc confirms the block exists, what it does, and where to find it. It also gives the search index content to return.

### Where the doc file lives

A block's `block.json` `"parent"` field is the decidable test for placement. Apply the rules in order — first match wins.

**System with an umbrella — nest into a system folder.** When an umbrella doc exists for a block family, every block in the family lives inside a single system folder at `docs/content/{user,dev}/blocks/{system}/`, with the umbrella doc as the folder's entry page. This keeps the sidebar compact — one collapsible folder per system beats N flat entries scrolling past unrelated blocks every time a reader opens the blocks directory.

Example: the Mega Menu system lives at `docs/content/user/blocks/mega-menu/` (all 14 user pages) and `docs/content/dev/blocks/mega-menu/` (all 15 dev pages). The umbrella at `mega-menu/mega-menu.md` is the reader's entry page and provides a Block Reference jump-table to the sibling per-block pages inside the same folder. The dev-side system-architecture narrative at `docs/content/dev/architecture/mega-menu.md` stays separate — it's not a block doc, it's the architecture doc.

**Isolated simple pair — nest the child under the parent.** When a child's `block.json` declares a hard parent AND that parent is itself standalone (no `"parent"` of its own) AND the pair is not part of a larger family with an umbrella, the child doc nests under the parent's slug: `docs/content/{user,dev}/blocks/{parent}/{child}.md`.

Example: `columns` + `column`. `column/block.json` declares `"parent": ["core/columns"]`; `columns/block.json` has no `"parent"` of its own; no columns family umbrella exists. The pair is isolated. Docs: `blocks/columns.md` (parent) and `blocks/columns/column.md` (child). Mirrors the frontend source shape — `frontend/blocks/columns/` already holds both `ColumnsBlock.tsx` and `ColumnBlock.tsx` together.

**Chain — flat.** When a child's hard parent is itself hard-parented, both docs stay flat as siblings. Chains without an umbrella stay readable by sitting side-by-side rather than burying later links under deep directory paths.

Example: a hypothetical `section → section-row → section-cell` chain with no family umbrella stays flat as `blocks/section.md`, `blocks/section-row.md`, `blocks/section-cell.md`.

### The decidable test

1. Does an umbrella doc exist for this block's family? → nest into the system folder at `blocks/{system}/` with the umbrella as the entry page.
2. Else: does the child's `block.json` declare a `"parent"`, and does that parent's own `block.json` declare no `"parent"` of its own? → nest the child under the parent at `blocks/{parent}/{child}.md`.
3. Else → flat as siblings under `blocks/`.

Eli creates block docs when prompted. When Eli is invoked and detects that a block has been touched but has no user doc, he nudges the user: "I notice there's no user doc for the {name} block. Want me to create one?"

## Architecture + Operations Pairing (Two-Reader Model)

Architecture docs in `docs/content/dev/architecture/` and operations docs in `docs/content/dev/operations/` are paired by topic. A topic that has both a design dimension (why the system looks the way it does) and an execution dimension (how to run it in production) should be split across the two directories and cross-linked.

**Why this pairing exists.** Two distinct readers: the first-time architect (a new engineer, a CTO onboarding, someone evaluating the design) who needs shape and reasoning, and the 3am-operator reader who needs a checklist. A single doc that serves both compromises both — the architect is buried under keystrokes, the operator has to hunt through reasoning paragraphs for the next step.

**How to apply.** The architecture doc explains _why_ a procedure is the shape it is; the operations doc owns _how_ to execute it. Cross-link both ways. When editing either doc and finding yourself tempted to add content that serves the other reader, move it to the paired file instead of inlining it.

**Naming convention.** Share a topic keyword across both directories so the pairing is discoverable, and use whichever suffix best describes each side. Exact same base filename is fine when both sides cover the same topic at the same scope; different suffixes are fine — and often clearer — when the operational scope doesn't mirror the architectural scope:

- `docs/content/dev/architecture/ci-pipeline.md` ↔ `docs/content/dev/operations/ci-operations.md` (shared keyword: `ci`; architecture is broad, operations is the runbook)
- `docs/content/dev/architecture/mega-menu.md` ↔ `docs/content/dev/operations/mega-menu-migration.md` (shared keyword: `mega-menu`; operations are migration-specific rather than a general runbook)

**Shape rule for architecture docs.** See `.claude/architect/architecture-doc-shape.md` for the four-beat opening arc (need → technical flows → natural fit → platform limits + custom layer) and the five supporting principles (shopping-list exception, concrete platform limits, operational bleed, problem-shape ↔ solution-shape, natural-fit framing).

## Naming Conventions

### Docs-to-Code Mapping

Block docs map to their block by convention. Three shapes exist, matching the cases in the Block Documentation Rule above:

- **System folder** — when an umbrella doc exists for a family, `frontend/blocks/{system-member}/` → `docs/content/{user,dev}/blocks/{system}/{system-member}.md`. The umbrella lives at `docs/content/{user,dev}/blocks/{system}/{system}.md` inside the same folder.
- **Nested pair** — isolated hard-parent pairs: `frontend/blocks/{child}/` → `docs/content/{user,dev}/blocks/{parent}/{child}.md`.
- **Flat sibling** (default) — standalone top-level blocks and chains without an umbrella: `frontend/blocks/{name}/` → `docs/content/{user,dev}/blocks/{name}.md`.

No manifest is needed for this mapping until the doc count in any single directory exceeds 50 files. The `block.json` `"parent"` field plus umbrella presence makes the shape decidable from source.

### File Naming

- Lowercase, kebab-case: `local-setup-mac.md`, `repository-service-pattern.md`
- Match the topic, not the source: a wiki page called `How-to:-Import-BYO-products-via-spreadsheet.md` becomes `import-products.md`
- Category subdirectories serve as the organizational grouping -- filenames describe the specific topic

## Cross-Reference Map

This map links `.claude/` agent files to their `docs/` human-readable counterparts. Briar uses this for staleness detection: when a file on either side changes, the corresponding file on the other side may need updating.

| Agent File                                                                   | Docs Counterpart                                                                  | Relationship                                                                                                                                                                                                                                                |
| ---------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `.claude/rules/code-standards.md`                                            | `docs/content/dev/standards/code-standards.md`                                    | Universal overview + index; docs file is full narrative                                                                                                                                                                                                     |
| `.claude/rules/code-standards-ts.md`                                         | `docs/content/dev/standards/code-standards.md`                                    | TS-specific rules; docs TypeScript section is narrative counterpart                                                                                                                                                                                         |
| `.claude/rules/code-standards-php.md`                                        | `docs/content/dev/standards/code-standards.md`                                    | PHP-specific rules; docs PHP section is narrative counterpart                                                                                                                                                                                               |
| `.claude/architect/frontend-components.md`                                   | `docs/content/dev/architecture/frontend-components.md`                            | Architect file has patterns and enforcement; docs file is onboarding guide                                                                                                                                                                                  |
| `.claude/architect/frontend-blocks.md`                                       | `docs/content/dev/architecture/frontend-blocks.md`                                | Architect file has block patterns; docs file is architecture narrative                                                                                                                                                                                      |
| `.claude/architect/frontend-services.md`                                     | `docs/content/dev/architecture/repository-service-pattern.md`                     | Architect file has service patterns; docs file explains the data layer                                                                                                                                                                                      |
| `.claude/architect/caching-and-revalidation.md`                              | `docs/content/dev/architecture/caching-and-revalidation.md`                       | Architect file has tier model and review rules; docs file is cross-cutting onboarding narrative with the four-beat arc                                                                                                                                       |
| `.claude/architect/routing-and-page-resolution.md`                           | `docs/content/dev/architecture/routing-and-page-resolution.md`                    | Architect file has pipeline + review rules; docs file walks the page-resolution pipeline end-to-end                                                                                                                                                          |
| `.claude/architect/skills-ecosystem.md`                                      | `docs/content/dev/ai-skills/overview.md`                                          | Architect file is full agent reference; docs file is developer getting-started guide                                                                                                                                                                        |
| `.claude/architect/skills-ecosystem.md`                                      | `docs/content/dev/ai-skills/why-ai-skills.md`                                     | Architect file is full agent reference; docs file is stakeholder business case                                                                                                                                                                              |
| `.claude/architect/skills-ecosystem.md`                                      | `docs/content/dev/ai-skills/how-it-works.md`                                      | Architect file is full agent reference; docs file is stakeholder workflow overview                                                                                                                                                                          |
| `.claude/architect/skills-ecosystem.md`                                      | `docs/content/dev/ai-skills/results-and-safety.md`                                | Architect file is full agent reference; docs file is stakeholder results and guardrails                                                                                                                                                                     |
| `.claude/architect/php-classes.md` (Feature Flags section)                   | `docs/content/dev/architecture/feature-flags.md`                                  | Architect file has registry and API enforcement; docs file is developer onboarding guide                                                                                                                                                                    |
| `.claude/rules/headless-architecture.md`                                     | `docs/content/dev/architecture/headless-architecture.md`                          | Rules file has enforceable server/client boundary rules; docs file is onboarding narrative                                                                                                                                                                  |
| `.claude/rules/headless-architecture.md` (§ Contracts at Runtime Boundaries) | `docs/content/dev/architecture/headless-architecture.md` (§ Data Contracts)       | Rules file has the enforceable contract-modeling spec; docs file is the conceptual framing folded into the runtime-boundaries narrative                                                                                                                     |
| `.claude/rules/code-standards-ts.md` (§ Modeling external contracts)         | `docs/content/dev/standards/code-standards.md` (§ Modeling External Vocabularies) | Rules file has the `keyof typeof` vs named-union rule and related TS constraints; docs file is the human-readable recipe covering WP, Space Station, and any external vocabulary source                                                                     |
| `.claude/architect/frontend-constants.md` (§ Source-vocab translation)       | `docs/content/dev/standards/code-standards.md` (§ Modeling External Vocabularies) | Architect file has the applied pattern for alignment mappings (Shape A/B, placement decision); docs file is the condensed recipe used by humans — generalized to cover any external vocabulary, with block-local placement scoped to WP blocks              |
| `.claude/architect/backend-editor-blocks.md`                                 | `docs/content/dev/architecture/backend-editor-blocks.md`                          | Architect file has backend block editor patterns; docs file is developer guide                                                                                                                                                                              |
| `.claude/architect/mega-menu.md`                                             | `docs/content/dev/architecture/mega-menu.md`                                      | Architect file has canonical patterns, decisions, and enforcement rules; docs file is the developer onboarding narrative                                                                                                                                    |
| `.claude/architect/mega-menu.md`                                             | `docs/content/dev/references/mega-menu-api.md`                                    | Architect file covers security model and auth tiers; API reference owns the full endpoint spec                                                                                                                                                              |
| `.claude/architect/mega-menu.md`                                             | `docs/content/dev/operations/mega-menu-migration.md`                              | Architect file covers migration architecture; operations doc owns the runbook                                                                                                                                                                               |
| `.claude/architect/mega-menu.md`                                             | `docs/content/dev/blocks/mega-menu/*.md`                                          | Architect file owns system-level patterns; per-block dev docs own the attribute/control/inner-block reference for each individual block                                                                                                                     |
| `.claude/architect/mega-menu.md`                                             | `docs/content/user/blocks/mega-menu/*.md`                                         | Architect file owns system-level patterns; per-block user docs own the end-user configuration guide (Block Options, How to Use, Parent & Child Blocks) for each individual block, plus the umbrella overview at `mega-menu/mega-menu.md`                    |
| `.claude/architect/plugin-management.md`                                     | `docs/content/dev/architecture/plugin-management.md`                              | Architect file has enforcement rules for plugins-from-storage.txt; docs file is the full plugin management guide                                                                                                                                            |
| `.claude/rules/headless-architecture.md`                                     | `docs/content/dev/architecture/plugin-ecosystem.md`                               | Rules file owns the frontend reimplementation principle; docs file applies it to the plugin inventory                                                                                                                                                       |
| `.claude/architect/ci-scripts.md`                                            | `docs/content/dev/architecture/ci-pipeline.md`                                    | Architect file has the bulk-service base-class pattern, skip conventions, and post-filter slice rule for `packages/ci-scripts/`; docs file is the full CI-pipeline onboarding narrative covering both GitHub Actions workflows and the bulk-tooling package |
| `.claude/architect/ci-build.md`                                              | `docs/content/dev/architecture/ci-build.md`                                       | Architect file has the build workflow's job structure, release-tag gating pattern, and per-Dockerfile shape rules; docs file is the four-beat narrative for teammates                                                                                       |
| `.claude/architect/ci-build.md`                                              | `docs/content/dev/architecture/ci-pipeline.md`                                    | Architect file owns build-half internals (`build.yml` jobs, gating, Dockerfiles); docs file mentions Build at a high level inside the broader CI taxonomy and points at the agent file for internals                                                        |
| `.claude/architect/dev-seeders.md`                                           | `docs/content/dev/architecture/dev-seeders.md`                                    | Architect file has terse rule-and-rationale form routed via manifest on `backend/seeds/**`; docs file is the developer onboarding narrative with the THR-1418 originating-incident story and the why-each-convention-earned-its-place reasoning             |

When adding new `docs/` pages that cover the same ground as a `.claude/` file, add a row to this table.

## Doc-to-Doc Overlap

When two `docs/` pages describe the same pattern or concept, one page owns the full description and the other links to it with a brief mention. This table tracks which pages share content so Briar can flag staleness when one side changes.

Agents read this table — they do not read `docs/` files to discover relationships. The `related_docs` frontmatter field is a human-facing convenience only.

| Doc A                      | Doc B                      | Shared topic                                           | Owner (full description)                                                                                                                                                                                                    |
| -------------------------- | -------------------------- | ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `headless-architecture.md` | `backend-editor-blocks.md` | Editor-only UI pattern                                 | `backend-editor-blocks.md`                                                                                                                                                                                                  |
| `headless-architecture.md` | `overview.md`              | Three runtimes                                         | `headless-architecture.md`                                                                                                                                                                                                  |
| `frontend-blocks.md`       | `backend-editor-blocks.md` | PHP-to-React bridge                                    | `backend-editor-blocks.md`                                                                                                                                                                                                  |
| `mega-menu.md`             | `mega-menu-api.md`         | REST API auth tiers and security model                 | `mega-menu-api.md`                                                                                                                                                                                                          |
| `mega-menu.md`             | `feature-flags.md`         | `enable_mega_menu` flag details and gating lifecycle   | `feature-flags.md`                                                                                                                                                                                                          |
| `plugin-ecosystem.md`      | `plugin-management.md`     | Plugin inventory (which plugins exist)                 | `plugin-ecosystem.md`                                                                                                                                                                                                       |
| `plugin-ecosystem.md`      | `headless-architecture.md` | Frontend reimplementation principle                    | `headless-architecture.md`                                                                                                                                                                                                  |
| `how-it-works.md`          | `overview.md`              | Persona roster table                                   | `overview.md` (dev reference); `how-it-works.md` (stakeholder framing)                                                                                                                                                      |
| `how-it-works.md`          | `workflows.md`             | Ticket lifecycle workflow                              | `workflows.md` (dev detail); `how-it-works.md` (stakeholder narrative)                                                                                                                                                      |
| `how-it-works.md`          | `personas.md`              | Persona descriptions                                   | `personas.md` (full capabilities); `how-it-works.md` (stakeholder one-liners)                                                                                                                                               |
| `overview.md`              | `ci-pipeline.md`           | Release flow (trunk-based tagging, Deploy All trigger) | `overview.md` (process narrative, cadence, Latest Release ceremony); `ci-pipeline.md` (workflow-level detail and `packages/ci-scripts/` internals)                                                                          |
| `ci-pipeline.md`           | `ci-operations.md`         | CI pipeline design vs. execution procedure             | `ci-pipeline.md` (architecture — two deployment targets, three stacked rate limits, why `ci-scripts/` exists); `ci-operations.md` (procedure — cutting a release, recovery playbook, running locally, dispatch-log reading) |
| `ci-build.md`              | `ci-pipeline.md`           | The Build workflow within the broader CI               | `ci-build.md` (build-half internals — job structure, release-tag gating, Dockerfile shapes); `ci-pipeline.md` (high-level mention inside the release flow and workflow taxonomy)                                            |

When a file in a diff appears in this table, check the counterpart for staleness. The "Owner" column has the full description — the other page should have a brief mention + link only.

## Doc Templates

Canonical templates live in `.claude/references/` and are the single source of truth for doc structure:

- `.claude/references/user-doc-template.md` -- user doc format, writing rules, when to use
- `.claude/references/dev-doc-template.md` -- dev doc format, writing rules, when to use
- `.claude/references/doc-callouts.md` -- callout syntax, when to use each type, examples

Category-specific rules layer on top of the base templates:

- `.claude/architect/architecture-doc-shape.md` — architecture-category dev docs (those in `docs/content/dev/architecture/`) follow the four-beat opening arc (need → technical flows → natural fit → platform limits + custom layer) and the supporting principles documented there.
- `.claude/references/user-block-doc-template.md` — user block docs (those in `docs/content/user/blocks/`) layer block-specific structure on top of `user-doc-template.md`: Block Options as tables per location (Toolbar + Sidebar), mandatory Parent & Child Blocks section, no cross-links into `docs/content/dev/`.
- `.claude/references/dev-block-doc-template.md` — dev block docs (those in `docs/content/dev/blocks/`) layer block-specific structure on top of `dev-doc-template.md`: Structure paths table, Block Attributes table, Editor Controls split into Toolbar + Sidebar, Inner Blocks, Block Supports, and Notes for block-specific quirks. Per-block dev docs are reference pages, not architecture docs — system-level reasoning stays in the paired architecture doc.

Eli and other skills reference these templates. Do not duplicate template content in skill files.

## Writing Guidelines

### Dev Docs (`docs/content/dev/`)

- Write for a developer who is new to the codebase but experienced with the tech stack
- Lead with "what this is and why it matters" before diving into details
- Cross-reference `.claude/` files for enforceable rules: "For the precise spec, see `.claude/rules/code-standards.md`"
- Include code examples where they clarify concepts
- Keep pages focused -- one topic per page

### User Docs (`docs/content/user/`)

- Write for a dealer or site builder with WordPress admin access but no code knowledge
- Use plain English -- no technical jargon, no file names, no code references
- Start with the end result: "This guide shows you how to add a Colophon to your site footer"
- Include screenshots where available — use relative image paths per the Images section above
- Step-by-step format: numbered steps with expected outcomes

## Root File Conventions

The root `README.md` and `.github/CONTRIBUTING.md` are **signposts**, not documentation sites. They orient and direct -- they do not duplicate content that lives in `docs/`.

### README.md

The README is the lobby. It answers three questions:

1. What is this project? (one line)
2. How do I set up locally? (one link)
3. Where's the documentation? (one link to `docs/README.md`)

No code blocks, no curated link lists, no testing commands. If it's in `docs/`, the README links there once and gets out of the way.

### CONTRIBUTING.md

CONTRIBUTING owns **process**: branch naming, PR format, team workflow, AI skills workflow. For technical references (testing commands, code standards details), it links to the relevant `docs/` page -- never duplicates.

### docs/README.md

Project README for the Nextra docs site — covers local dev, content authoring, and deployment. The content index is `docs/content/index.mdx` (the Nextra landing page) and the sidebar navigation built from `_meta.js` files.

## Static Site

The docs site is built with [Nextra v4](https://nextra.site) (Next.js App Router) and deployed to Vercel with Deployment Protection (shared password). The Nextra project lives at `docs/` and content lives in `docs/content/`. See `docs/README.md` for local dev and content authoring instructions.
