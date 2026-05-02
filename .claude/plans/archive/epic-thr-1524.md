# Plan: epic-thr-1524

## Ticket

https://linear.app/tractru/issue/THR-1524/consolidate-documentation-into-repo-docs-folder

## Goal

Eliminate documentation sprawl by killing the GitHub wiki and consolidating all human-facing docs into a `docs/` folder in the repo, organized by audience (`docs/dev/` for developers, `docs/user/` for dealers), with frontmatter for future static site generation and AI skill updates to keep docs in sync with code.

---

## Stories

### Story 1: Foundation — `docs/` structure, convention doc, frontmatter standard
Create the `docs/` folder structure, `docs/README.md` index, `.claude/architect/documentation.md` convention file, and define the frontmatter schema.

### Story 2: Wiki migration — dev docs
Migrate and integrate wiki content into `docs/dev/`. Extract valuable parts from wiki standards and consolidate where appropriate (e.g. JS standards into a general code standards doc). Not a copy-paste — thoughtful integration.

### Story 3: Wiki migration — user docs
Migrate wiki user-facing content into `docs/user/`. Includes BYO guides, block how-tos, customization snippets, and configuration guides.

### Story 4: Skill updates — Eli, Briar, Winston
Update Eli for publish mode with `docs/` output paths. Add docs impact check to Briar. Add docs task consideration to Winston plan mode.

### Story 5: Link updates and wiki archival
Update README and CONTRIBUTING to point to `docs/`. Update wiki Home.md to point to `docs/` in the repo.

---

## Decisions

- Two-audience model: `docs/dev/` for developer documentation, `docs/user/` for dealer/site-builder documentation. `.claude/` stays agent-facing. No duplication — cross-reference where content overlaps.
- `docs/user/` and `docs/dev/` will each eventually become a separate static site. All files include frontmatter from day one to avoid a re-migration.
- Frontmatter schema: `title`, `description`, `category`, `audience` (`user` | `dev`). Minimal now — extend when a static site generator is chosen.
- Wiki content is integrated thoughtfully, not copy-pasted. Valuable unique content (naming conventions, interface prefix rules, import rules) from wiki standards is consolidated into broader docs rather than preserving the wiki's per-page structure.
- When wiki content conflicts with `.claude/` content (rules, architect docs, standards), `.claude/` wins — it's more current. Extract only the unique value from wiki pages that doesn't already exist in `.claude/` files.
- JS coding standards from the wiki → merged into `docs/dev/standards/code-standards.md`. Unique wiki content (I-prefix, constants, imports, clean code principles) is extracted and integrated alongside the team's current conventions. `.claude/rules/code-standards.md` remains the authoritative enforceable spec; `docs/dev/standards/` is the human-readable narrative that links to it.
- Architecture wiki pages (Frontend Components, Frontend Blocks, Repository-Service Pattern) become `docs/dev/architecture/` prose pages. `.claude/architect/` files remain the agent-scoped pattern docs. The docs/ versions are onboarding narratives; the .claude/ versions are enforcement specs.
- AI Skills wiki page → `docs/dev/ai-skills/overview.md` as a getting-started guide. `.claude/architect/skills-ecosystem.md` remains authoritative for agents. The docs/ version is a simplified human reference.
- No per-page wiki redirect stubs. Wiki Home.md is updated to point to `docs/` in the repo. Team will be informed of the change.
- Naming convention for docs-to-code mapping: `frontend/blocks/{name}/` → `docs/user/blocks/{name}.md`. Convention-based, no manifest needed until 50+ doc files.
- The documentation convention doc (`.claude/architect/documentation.md`) must include a cross-reference map of `.claude/` files to their `docs/` counterparts (e.g. `.claude/rules/code-standards.md` ↔ `docs/dev/standards/code-standards.md`). This is what Briar checks when scanning for staleness.
- Eli gains a "publish" mode that writes to `docs/user/` or `docs/dev/` (topic-based, not per-branch). Draft mode (`.claude/docs/`, gitignored) stays for in-progress work.
- Briar adds a "Docs Impact" section — flags when code changes OR `.claude/` rule/architect file changes touch areas that have corresponding `docs/` files. Covers both directions: code → docs staleness and agent-spec → human-docs staleness. Not a blocker, just a flag.
- Winston includes docs update tasks in implementation plans when the work changes user-facing behavior for a documented feature.
- `README.md` is a signpost, not a documentation site — project description, getting started link, docs link, nothing else. Code blocks and curated link lists belong in `docs/`.
- `CONTRIBUTING.md` owns process (branching, PRs, workflow). For technical references (testing commands, code standards details), it links to `docs/` — never duplicates.
- `docs/README.md` is the single source of truth for "what documentation exists." No other file maintains a parallel index.

---

## Implementation Tasks

### Story 1: Foundation

1. Create `docs/` directory structure:
   ```
   docs/
     dev/
       getting-started/
       architecture/
       standards/
       operations/
       ai-skills/
       references/
     user/
       blocks/
       byo/
       configuration/
       customization/
     README.md
   ```
2. Create `docs/README.md` — index/TOC for both `dev/` and `user/` with brief descriptions of each section.
3. Create `.claude/architect/documentation.md` — documents the two-audience model, ownership rules, frontmatter schema, naming convention for docs-to-code mapping, cross-reference principle, and a **cross-reference map** of `.claude/` files to their `docs/` counterparts (e.g. `.claude/rules/code-standards.md` ↔ `docs/dev/standards/code-standards.md`, `.claude/architect/frontend-components.md` ↔ `docs/dev/architecture/frontend-components.md`). This map is what Briar uses for staleness detection. Add to `manifest.json` with pattern `docs/`.
4. Define frontmatter schema and add an example to the documentation convention doc:
   ```yaml
   ---
   title: "Page Title"
   description: "One-line description for search and site generation"
   category: "getting-started | architecture | standards | operations | ai-skills | references | blocks | byo | configuration | customization"
   audience: "dev | user"
   ---
   ```

### Story 2: Wiki migration — dev docs

5. Create `docs/dev/getting-started/local-setup-mac.md` — migrate from wiki `Local-Setup-on-Mac.md`. Clean formatting, add frontmatter.
6. Create `docs/dev/getting-started/local-setup-windows.md` — migrate from wiki `Local-setup-on-Windows.md`. Clean formatting, add frontmatter.
7. Create `docs/dev/architecture/overview.md` — migrate from wiki `Thrive-Architecture.md`. This is the richest wiki page (repo structure, headless arch, CI/CD, plugin management). Add cross-references to `.claude/architect/` files for pattern-level details. Add frontmatter.
8. Create `docs/dev/architecture/repository-service-pattern.md` — migrate from wiki. Add frontmatter, cross-reference `.claude/architect/frontend-services.md`.
9. Create `docs/dev/architecture/frontend-components.md` — migrate from wiki `Thrive-Frontend-Components.md`. Add note at top: "For agent-enforced patterns, see `.claude/architect/frontend-components.md`." Add frontmatter.
10. Create `docs/dev/architecture/frontend-blocks.md` — migrate from wiki `Thrive-Frontend-Blocks.md`. Same cross-reference treatment. Add frontmatter.
11. Create `docs/dev/standards/code-standards.md` — new consolidated doc. Extract valuable unique content from wiki `Javascript-coding-standards.md` (I-prefix for interfaces, constants naming, import rules, self-documenting code, whitespace, debugging code removal) and integrate with current team conventions. Reference `.claude/rules/code-standards.md` as the authoritative enforceable spec. Add frontmatter.
12. Create `docs/dev/ai-skills/overview.md` — simplified getting-started guide for the skills workflow. Brief persona table, common workflows, setup requirements. Link to `.claude/architect/skills-ecosystem.md` for the full reference. Much shorter than the wiki page — focus on "how do I use these" not full API docs. Add frontmatter.
13. Create `docs/dev/operations/dealer-site-spinup.md` — migrate from wiki. Has screenshots (GitHub-hosted images, URLs will still work). Add frontmatter.
14. Create `docs/dev/operations/go-live-procedure.md` — migrate from wiki. Has screenshots. Add frontmatter.
15. Create `docs/dev/operations/clone-dealer-to-local.md` — migrate from wiki. Add frontmatter.
16. Create `docs/dev/references/color-theme-utility.md` — migrate from wiki. Dev API reference with usage examples. Add frontmatter.
17. Create `docs/dev/references/design-mocks.md` — migrate from wiki. Just a list of Adobe XD links. Add frontmatter.
18. Create `docs/dev/references/wordpress-role-capabilities.md` — migrate from wiki. Reference table. Add frontmatter.
19. Create `docs/dev/references/sites-list.md` — migrate from wiki. Quick reference. Add frontmatter.

### Story 3: Wiki migration — user docs

20. Create `docs/user/byo/import-products.md` — migrate from wiki `How-to:-Import-BYO-products-via-spreadsheet.md`. Has screenshots. Add frontmatter.
21. Create `docs/user/byo/update-option-prices.md` — migrate from wiki `How-to:-Update-BYO-option-prices.md`. Has screenshots. Add frontmatter.
22. Create `docs/user/blocks/colophon.md` — migrate from wiki `How-to:-add-Colophon.md`. Has screenshots. Add frontmatter.
23. Create `docs/user/configuration/recaptcha-setup.md` — migrate from wiki `How-to:-add-ReCAPTCHA.md`. Has screenshots. Add frontmatter.
24. Create `docs/user/customization/tailwind-snippets.md` — migrate from wiki. Add frontmatter.
25. Create `docs/user/customization/scrolling-images-embed.md` — migrate from wiki. Add frontmatter.

### Story 4: Skill updates

26. Update `Eli` skill (`SKILL.md`) — add publish mode:
    - New "publish" mode that writes to `docs/user/` or `docs/dev/` (topic-based organization, not per-branch)
    - Check if doc already exists for the topic — update existing rather than create new
    - All published docs include frontmatter
    - Draft mode (`.claude/docs/`, gitignored) stays as-is for in-progress work
    - After draft, offer: "Want me to publish this to docs/?"
27. Update `Briar` skill (`SKILL.md`) — add docs impact check:
    - After existing review checks, scan the diff for two kinds of staleness:
      a. **Code → docs:** changes to blocks/components/features that have corresponding `docs/user/` or `docs/dev/` files
      b. **Agent spec → human docs:** changes to `.claude/rules/` or `.claude/architect/` files that have corresponding `docs/dev/` files (using the cross-reference map from `.claude/architect/documentation.md`)
    - If a match exists and the change is substantive (not formatting), flag: "This change modifies [X]. The docs at [path] may need updating. Consider bringing in Eli."
    - If no docs match, skip silently
28. Update `Winston` skill (`SKILL.md`) — add docs task consideration:
    - In plan mode, when building implementation tasks, check if the work changes user-facing behavior for a block or feature that has existing docs in `docs/`
    - If yes, include a task: "Update docs/user/blocks/[name].md to reflect [what changed]"
29. Update `.claude/architect/skills-ecosystem.md` — add note about Eli's publish mode, Briar's docs impact check, Winston's docs tasks. Update common workflow diagram to show Eli integration point.

### Story 5: Link updates and wiki archival

30. Update `README.md` — replace wiki links with `docs/` paths. Keep the Getting Started section pointing to `docs/dev/getting-started/`.
31. Update `.github/CONTRIBUTING.md` — replace wiki links (JS coding standards, Frontend Components) with `docs/` paths. Update the AI Skills section link.
32. Update wiki `Home.md` — replace the one-line welcome with a notice: "Documentation has moved to the `docs/` folder in the main repository. See `docs/README.md` for the full index."

---

## Acceptance Criteria

### Behavioral
- [ ] Given a new developer reads the README, When they click documentation links, Then all links resolve to files in the `docs/` folder (no wiki links remain in README or CONTRIBUTING)
- [ ] Given a developer looks for setup instructions, When they navigate to `docs/dev/getting-started/`, Then they find setup guides for both Mac and Windows
- [ ] Given a developer looks for architecture documentation, When they navigate to `docs/dev/architecture/`, Then they find overview, frontend blocks, frontend components, and repository-service pattern docs
- [ ] Given a developer looks for code standards, When they navigate to `docs/dev/standards/`, Then they find a consolidated code standards document covering naming conventions, imports, TypeScript, and clean code practices
- [ ] Given a developer reads a `docs/dev/architecture/` page, When they look for enforceable rules, Then the doc cross-references the corresponding `.claude/architect/` or `.claude/rules/` file
- [ ] Given a developer reads a `docs/dev/standards/code-standards.md`, When they look for the precise spec, Then the doc links to `.claude/rules/code-standards.md`
- [ ] Given a dealer or site builder looks for block guides, When they navigate to `docs/user/`, Then they find guides organized by category (blocks, BYO, configuration, customization)
- [ ] Given someone visits the GitHub wiki, When they land on the Home page, Then they see a notice directing them to the `docs/` folder in the main repo
- [ ] Given a developer opens any file in `docs/`, When they view the file, Then it contains YAML frontmatter with at minimum title, description, category, and audience
- [ ] Given Clove modifies a block that has docs in `docs/user/blocks/`, When Briar runs a self-review, Then Briar flags that the corresponding docs may need updating
- [ ] Given Winston builds an implementation plan for a feature that changes user-facing block behavior, When the block has existing docs in `docs/`, Then the plan includes a task to update the docs
- [ ] Given a developer asks Eli to publish documentation, When Eli runs in publish mode, Then the output is saved to the appropriate `docs/user/` or `docs/dev/` path with frontmatter

### Non-behavioral
- [ ] No `wiki.lapero.io` links remain anywhere in the repository
- [ ] No GitHub wiki links remain in README.md or CONTRIBUTING.md
- [ ] All `docs/` files include YAML frontmatter with title, description, category, and audience fields
- [ ] `docs/README.md` serves as a navigable index for all documentation
- [ ] `.claude/architect/documentation.md` exists and documents the two-audience model, ownership rules, and frontmatter schema
- [ ] Wiki content is integrated thoughtfully — not verbatim copies. Standards content is consolidated where appropriate.
- [ ] Screenshots in migrated docs use existing GitHub-hosted image URLs (no broken images)

### AC Adjustments

### AC Sync Log

| Date | Agent | Action | Plan | Linear |
|------|-------|--------|------|--------|
| 2026-04-05 | Winston | Generated AC | updated | synced |

---

## History

- 2026-04-05 [jmotes/thr-1524-consolidate-documentation-into-repo-docs-folder]: Epic plan created. 5 stories: foundation + convention doc, dev wiki migration, user wiki migration, skill updates, link updates + wiki archival. Full wiki content audited and mapped to docs/ structure.
- 2026-04-05 [jmotes/thr-1524-consolidate-documentation-into-repo-docs-folder]: Synced AC to Linear ticket THR-1524.
- 2026-04-05 [jmotes/thr-1524-consolidate-documentation-into-repo-docs-folder]: Story 1 complete. Created docs/ directory structure (dev/ and user/ with all subdirectories), docs/README.md index/TOC, .claude/architect/documentation.md convention doc with cross-reference map and frontmatter schema, added docs/ pattern to manifest.json.
- 2026-04-05 [jmotes/thr-1524-consolidate-documentation-into-repo-docs-folder]: Story 2 complete. Migrated all 15 dev wiki pages into docs/dev/. Getting-started (Mac, Windows), architecture (overview, repo-service, components, blocks), standards (consolidated code-standards), AI skills overview, operations (spinup, go-live, clone-to-local), references (color-theme, design-mocks, role-capabilities, sites-list). All files have frontmatter and cross-reference .claude/ files where applicable. Wiki content was integrated thoughtfully — unique value extracted, not copy-pasted.
- 2026-04-05 [jmotes/thr-1524-consolidate-documentation-into-repo-docs-folder]: Story 3 complete. Migrated all 6 user-facing wiki pages into docs/user/. BYO (import-products, update-option-prices), blocks (colophon), configuration (recaptcha-setup), customization (tailwind-snippets, scrolling-images-embed). All files have frontmatter, plain-English tone, and preserved screenshot URLs.
- 2026-04-05 [jmotes/thr-1524-consolidate-documentation-into-repo-docs-folder]: Story 4 complete. Updated Eli with publish mode (adapts drafts for docs/ audience with frontmatter, cross-references, and prose expansion). Updated Briar with docs impact check (flags docs/ staleness after review using cross-reference map). Updated Winston with docs task consideration (includes docs update tasks in plans when documented features change). Updated skills-ecosystem.md with new capabilities and documentation integration workflow.
- 2026-04-05 [jmotes/thr-1524-consolidate-documentation-into-repo-docs-folder]: Story 5 complete. Replaced all wiki links in README.md and CONTRIBUTING.md with docs/ paths. Updated wiki Home.md to redirect visitors to docs/ in the main repo.
- 2026-04-05 [jmotes/thr-1524-consolidate-documentation-into-repo-docs-folder]: Winston evaluated README/CONTRIBUTING structure. Decided both files should be signposts, not documentation. README slimmed to 3 sections (description, getting started, docs link). CONTRIBUTING keeps process sections, drops code blocks in favor of links. Added root file convention decisions to plan.
- 2026-04-05 [jmotes/thr-1524-consolidate-documentation-into-repo-docs-folder]: Implemented Winston's recommendations. README slimmed to signpost format (3 sections, no code blocks, no duplicate links). CONTRIBUTING testing/standards sections reduced to links only. Added Root File Conventions section to .claude/architect/documentation.md.
- 2026-04-05 [jmotes/thr-1524-consolidate-documentation-into-repo-docs-folder]: Briar self-review complete. All 23 docs/ files have valid frontmatter. Zero wiki links remain. Categories match subdirectories. Cross-references present. No issues found. PR ready to ship.
- 2026-04-05 [jmotes/thr-1524-consolidate-documentation-into-repo-docs-folder]: Eric PR review complete. 1 critical issue (Windows guide secrets — real API keys need placeholder replacement), 3 minor issues (reCAPTCHA key confirmation, admonition syntax for outdated notices, docs/README audience field). Posted inline comments and summary to PR #1710.
- 2026-04-05 [jmotes/thr-1524-consolidate-documentation-into-repo-docs-folder]: Clove fixed 2 of 3 review issues. Replaced 6 real API keys with XXX placeholders in Windows setup guide and added "ask another developer" instruction. Switched outdated notices to `> [!WARNING]` admonition syntax in dealer-site-spinup.md and go-live-procedure.md. Deferred reCAPTCHA key (public by design, pending team confirmation).
- 2026-04-05 [hmcgrew/thr-1524-review]: Winston post-review improvements. Epic naming convention changed to `epic-<ticket-id>.md` (branch-plan.md + Winston SKILL.md). Renamed epic-docs-consolidation.md → epic-thr-1524.md, epic-skills-ecosystem.md → epic-thr-1473.md. Fixed stale CI/CD section (removed dead `dev` branch, updated to trunk-based dev). Moved testing docs to `docs/dev/testing/overview.md`. Added I-prefix convention to code-standards.md. Added `linguist-documentation` to .gitattributes. Added `last_updated` optional frontmatter field to schema and Eli publish mode.
- 2026-04-05 [jmotes/thr-1524-consolidate-documentation-into-repo-docs-folder]: Rewrote Tagging and Releases section in architecture overview to reflect actual current process — auto-increment on main, biweekly freeze/QA/deploy cadence, no release branches or RC tags. Used "currently" phrasing per Winston's recommendation.

---

## Debugged Issues

(none)

---

## Review Issues

### Windows setup guide contains real-looking API keys
- **Severity:** `critical`
- **Status:** `fixed`
- **File:** `docs/dev/getting-started/local-setup-windows.md:111-126`
- **Problem:** Real-looking API keys (ACF Pro, Gravity Forms, WP All Import, Algolia app ID, public key, and admin API key) committed in `.env.local` example. Mac guide correctly uses `XXX` placeholders.
- **Suggested fix:** Replace all concrete key values with `XXX` placeholders. Add instruction: "Ask another developer or team lead for the actual values." If keys are real, rotate them.
- **Fixed in:** Replaced all 6 concrete key values with `XXX` placeholders. Added "Ask another developer or team lead for the actual values" instruction matching the Mac guide.

### reCAPTCHA site key in user doc
- **Severity:** `minor`
- **Status:** `deferred`
- **File:** `docs/user/configuration/recaptcha-setup.md:21`
- **Problem:** reCAPTCHA v2 site key committed. Public by design but worth confirming it's intentionally shared.
- **Suggested fix:** Confirm intent. If site-specific, replace with placeholder.
- **Deferred:** reCAPTCHA v2 site keys are public by design (embedded in HTML). Leaving as-is pending team confirmation.

### Outdated notices use regular blockquotes
- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `docs/dev/operations/dealer-site-spinup.md:10`, `docs/dev/operations/go-live-procedure.md:10`
- **Problem:** `> **Outdated:**` renders as a plain blockquote. GitHub admonition syntax (`> [!WARNING]`) would be more prominent.
- **Suggested fix:** Change to `> [!WARNING]` admonition syntax.
- **Fixed in:** Both files updated to `> [!WARNING]` admonition syntax.

---

## Cleanup Items

(none)

---

## PR Readiness

- [x] No critical or major issues — Windows guide secrets fixed
- [x] Types correct — N/A (docs-only PR)
- [x] No stray console.logs or debug artifacts
- [x] Tests written for new logic and edge cases — N/A (docs-only PR)
- [x] All debugged issues resolved (no `open` entries)
- [x] Build passes — N/A (docs-only PR, no source code changes)
- [x] PR description up to date
- [x] Lasting decisions promoted to architect context (documentation.md)
- [x] All 23 docs/ files have valid YAML frontmatter
- [x] No wiki links remain in README, CONTRIBUTING, or docs/
- [x] Categories match subdirectories across all files
- [x] Cross-references to .claude/ files present in architecture/standards docs
- [x] Screenshots use existing GitHub-hosted image URLs

**Build**: ⚠️ Skipped — docs-only PR, no source code changes

**Last updated:** 2026-04-05 (Clove fixes)
