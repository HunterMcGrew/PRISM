# Lessons Learned

## When to Add Entries

Add an entry **before closing the session** if any of the following happened:

- You were corrected by the user or had to revise your approach
- You made a wrong assumption about a codebase pattern, API, or constraint
- You discovered a pattern, rule, or edge case not documented in the architect context files
- You were surprised by how something works — even if it didn't cause a visible error

Do not wait to be asked. If the session involved any correction or discovery, an entry is required.
Multiple corrections in one session = multiple entries, unless they share a root cause — then merge into one.

---

## Maintenance Rules

- Before adding a new entry, scan for an existing rule that covers the same pattern — update it instead of duplicating.
- If two or more entries share a root cause, merge them into one rule that covers the general case.
- At the start of each session, remove any entry that hasn't been relevant in 30+ days — move it to `.claude/lessons-archive.md` if you want a paper trail.
- Cap at ~50 active entries. If you're at the limit, the new entry must replace or merge with the weakest one.

---

<!-- Format:
## YYYY-MM-DD: <short title>
- **What happened:** one sentence
- **Rule:** one sentence written as a future constraint
-->

## 2026-04-28: A user-reported workaround is a hypothesis, not a verified fact

- **What happened:** While documenting the Purge Frontend Cache toolbar (THR-1776), Hunter reported that editing a template part required three steps: save → purge Site Settings → save the homepage to force the rebuild. Winston accepted the report, wrote a three-step workflow into `admin-toolbar.md`, added a `## Decisions` entry framing the homepage-save as "the workaround for missing `wp_template_part` revalidation," and filed THR-1782 to "fix" the missing hook. PR review (jmotes) pushed back on the framing. On Winston's second pass — verifying the architecture in code — it turned out template parts are part of the same `GET_WORDPRESS_GLOBALS_QUERY` response that powers Site Settings (verified at `frontend/lib/wp/functions/get-site-globals.ts:194-196`), so `revalidateTag('site_globals')` should propagate to template-part content for free. Hunter retested with that framing and confirmed the homepage-save step was never required — local works without any purge (5s `ON_DEMAND_CACHE_TIME` fallback), Vercel works with Purge Site Settings alone. Three doc passes and a Linear ticket got built on a misobservation.
- **Rule:** When the user describes a workaround and asks you to document it as the canonical workflow, verify the workaround is necessary before encoding it. Trace the architecture: what the code says should happen if you skip the workaround step. If the architecture says the workaround shouldn't be needed, ask the user to retest without it before you write the doc — not after. A user-reported workflow is a hypothesis, especially for steps that "feel" load-bearing but aren't traceable to a code path. Folklore enshrined into durable docs is harder to undo than a slightly delayed first draft.
## 2026-04-29: Domain model arrays are non-nullable — promoted to `.claude/rules/code-standards-ts.md` § Domain model arrays are non-nullable

## 2026-04-29: WordPress persists block attribute `default:` values at insert time — schema-only fixes don't heal existing saved blocks

- **What happened:** THR-1130 followup: removing the legacy placehold.co URL from `DEFAULT_ATTRIBUTES.backgroundImage` in `schema.ts` fixed new block inserts, but existing blocks already had the URL persisted into `post_content` via WordPress's block attribute serialization — WordPress writes `default:` values into the stored content when a block is first inserted. QA caught it immediately.
- **Rule:** When removing a block attribute `default:` value that was previously deployed to production, assume existing blocks have that value stored in `post_content`. The schema change only helps new inserts. Add resolver-side normalization (exact string match against a named `LEGACY_*` constant) so existing blocks heal without a DB migration.

## 2026-04-29: Hotfixes that introduce a typed seam beat hotfixes that hide the contract — even when the diff is bigger

- **What happened:** Sasha diagnosed THR-1794 (footer-menu crash on null `locations`) and recommended an inline boundary normalization in `getSiteGlobals` — `locations: node.locations ?? []` mapped over `data.menus.nodes`, with `IMenu.locations` staying `string[]`. I sanity-checked it at ticket creation time and let it through. Jonathan pushed back: the inline fix is unenforced — there's nothing in the type system that signals to future readers that the type is post-normalization, and the next nullable WP field that lands on the menu shape (or any other slice of `getSiteGlobals`) reproduces the bug class invisibly. On second pass I recommended Option B instead — a minimum DAL seam (`GQLMenuDTO` with honest nullability + `mapGQLMenu` mapper, in the `data-access/menu/gql/` target shape from `.claude/architect/data-layer.md`). Two new files (~50 lines) that survive THR-1795 verbatim. The cost difference between the two was small; the precedent difference was large.
- **Rule:** When a hotfix introduces a contract translation between an external system and a domain model, prefer a typed seam (DTO + mapper) over an inline normalization, even when the inline fix is one or two lines smaller. The DTO is the type-system enforcement that the next reviewer can see; the mapper is the named place that handles it. An inline `?? []` in an orchestrator is a silent precedent — the type stays clean, but no future developer or reviewer can tell whether the type is post-normalization or lazily typed without reading the orchestrator line by line. The right question to ask is not "what's the minimum diff to fix the bug?" but "what's the smallest set of files that match the documented architecture and survive the next migration?" — usually those are within a small constant of each other, and the latter is always the better hotfix shape. Applies whenever an architect doc already prescribes the seam shape and the codebase has at least one reference implementation to copy.

## 2026-04-28: Caching belongs at the layer where lifetime is determined — and the source determines lifetime, not the domain

- **What happened:** During architectural discussion of the data-layer reshape, I oscillated three times on where caching should live. First proposed at the repo, then at the service (chasing "domain-level cache identity" and multi-tag invalidation for unified results), then back to the repo when the user pointed out that different sources have different revalidation guarantees — WordPress webhook-driven (`ON_DEMAND_CACHE_TIME`) vs Space Station polling-only (`POLLING_CACHE_TIME`). A service-layer cache wrapper around `OfferService.getItems` (which composes both) can't honor both source policies — one always wins. Caching at the source means each source declares the policy its own infrastructure supports; composition over already-cached reads is cheap and correct. Multi-tag invalidation cascades naturally without a unified-result cache.
- **Rule:** Caching lives at the layer where the cache lifetime is determined. For source-revalidation-driven caching (webhooks, polling, source-imposed TTLs) — which is virtually all caching in Thrive — that's the data-access layer, scoped per-source. Service-level caching is only correct when the *computation result* (not the underlying data) is what dictates lifetime — an expensive sort or merge that's worth caching independently of its inputs. Don't reach for service-level caching as a way to express "this is the domain operation that's cached" — that framing is wrong; cache identity is a source property, not a domain property. When proposing caching architecture, sanity-check against the multi-source case (pick `OfferService` or any future composition of webhook + polling sources) — if the proposed shape can't honor different policies per source, it's wrong.

## 2026-04-28: `"use cache"` constraint applies to the cache primitive, not the public API around it

- **What happened:** While designing the data-layer reshape, I noted that `"use cache"` only works on top-level module functions and concluded "therefore repos must be factory functions returning object literals." User pushed back during the adversarial pass: that conclusion mixed up the *cached function* with the *repo's public shape*. The constraint applies to the cache primitive (where the directive lives); the public API (what consumers call) can be whatever shape fits the rest of the architecture. The right shape is a class that wraps top-level cached fetcher functions — class methods are thin one-line delegations, the directive lives where it has to. Earlier framing forced an unnecessary inconsistency between class-shaped services and function-shaped repos.
- **Rule:** When `"use cache"` is in play, separate two questions: (1) where does the cache primitive live? — top-level module function with serializable args, no exceptions, this is what Next.js requires. (2) what's the public API around it? — whatever fits the codebase's shape. Class methods can wrap top-level cached functions cleanly; the wrapper is one or two lines and consumers see a normal class. Don't reason from the directive constraint backward into "no classes anywhere in the data layer" — that's a leap, and it creates inconsistency with surrounding layers (services as classes) for no real win. The architectural seam is "cached I/O is in module-scope functions"; the class-vs-function call for the public API is a separate decision driven by team mental model and surrounding consistency.

## 2026-04-27: Supplementary fetches in `single-templates/*/fetchers.ts` must wrap in `cache(unstable_cache(...))` — service-level caching is not enough on its own
## 2026-04-27: Supplementary fetches in `single-templates/*/fetchers.ts` must wrap in `cache(unstable_cache(...))` — promoted to `.claude/rules/headless-architecture.md` § Supplementary fetchers must be cached

## 2026-04-25: GitHub Actions ternary returns the wrong value when the truthy branch is `0`, `''`, or `false` — promoted to `.claude/references/operational-gotchas.md`

## 2026-04-25: Util functions go below the main export, not above

- **What happened:** When extracting `shouldInterceptClick` and `patchHistoryMethods` as module-scope helpers in `ProgressBar.tsx`, I placed them above the main `ProgressBar` component export. Jonathan caught it pre-push — the team's convention is that helper / utility functions live below the file's primary export, so a reader scrolling top-to-bottom hits "the main thing" before "its building blocks." The `code-standards.md § File Organization` rule says "exported functions → private utilities," but it doesn't make explicit that the _primary_ exported function leads the export group, with helper exports following it.
- **Rule:** In a file with one primary exported component or function, place that primary export immediately after the constants block. Put helper functions (whether exported for testing or private) below the primary export, in dependency order. Function declarations are hoisted, so referencing them from above is safe — the source order is for human readers, not the compiler.

## 2026-04-23: Narrowly-scoped rules belong in `.claude/architect/`, not `.claude/rules/`

- **What happened:** `architecture-doc-shape.md` was placed in `.claude/rules/` even though it only applies to `docs/content/dev/architecture/*` work. Hunter flagged that `rules/` auto-loads into every conversation via CLAUDE.md, so a narrow rule there taxes every chat with context it won't use. The `rules/` vs `architect/` split isn't about enforceability — `documentation.md` in `architect/` already enforces frontmatter schemas and callout limits — it's about load scope.
- **Rule:** When adding a new spec file, decide its folder by load pattern, not content type. Cross-cutting specs that should load into every conversation (writing voice, code standards, git conventions, accessibility) go in `.claude/rules/`. Specs scoped to a specific directory tree or file family go in `.claude/architect/` with a matching key in `.claude/architect/manifest.json`, so they load only when relevant files are in scope.

## 2026-03-24: Programmatic block selection in WP editor requires wp.data dispatch

- **What happened:** Clicking the block DOM element and dispatching synthetic mouse events both failed to select the block in the sidebar; `wp.data.dispatch('core/block-editor').selectBlock(clientId)` worked reliably.
- **Rule:** To select a block programmatically during screenshot capture, always use `wp.data.dispatch('core/block-editor').selectBlock(clientId)` — never rely on DOM click or synthetic mouse events.

## 2026-03-24: Hero shot must be taken with block deselected (clearSelectedBlock)

- **What happened:** First hero shot included the block toolbar because the block was still selected; had to retake after calling `wp.data.dispatch('core/block-editor').clearSelectedBlock()`.
- **Rule:** Before taking the hero screenshot, always call `wp.data.dispatch('core/block-editor').clearSelectedBlock()` and confirm the toolbar is gone before capturing.

## 2026-03-21: Dropping "use client" unlocks more than the target dependency

- **What happened:** Initial approach removed Apollo imports but kept `"use client"` and DnD on ShowroomBlock; converting to RSC also removed `@dnd-kit` from the visitor bundle.
- **Rule:** When removing a dependency from a client bundle, check whether `"use client"` itself is still needed — if all hooks/interactivity are editor-only, converting to RSC drops the entire client import tree.

## 2026-03-24: Claude in Chrome extension connects to a separate window, not the user's active browser

- **What happened:** User said they were logged into WordPress admin, but the extension was connected to a different Chrome window that had an expired session, causing navigation to redirect to the login page.
- **Rule:** When the user says they're logged in but the browser shows a login page, the extension is likely connected to a different Chrome window. Ask the user to open the extension panel in the same window where they're logged in and click Connect before proceeding.

## 2026-03-24: `save_to_disk` on screenshot tool does not return a file path

- **What happened:** `mcp__Claude_in_Chrome__computer` with `save_to_disk: true` captured screenshots but returned only an ID string (e.g. `ss_abc123`), no file path. Attempting to `cp` by guessing the path produced nothing.
- **Rule:** Don't rely on `save_to_disk` to get a usable file path for screenshots. Reference screenshots by their content description in docs and note the image paths as placeholders the user will need to fill in manually, or use a different approach (e.g. javascript tool) to save images directly to a known path.

## 2026-03-21: Pass `siteGlobals` to components instead of `wpUrl` when available

- **What happened:** `ProductCategorySelector` and `ProductSelector` accepted `wpUrl` and internally called `getSiteGlobals(wpUrl)` — redundant since the parent editor already had `siteGlobals` from `usePreviewProps`.
- **Rule:** When a parent component already has `siteGlobals`, pass it directly to children instead of `wpUrl`. Avoids redundant async fetches and eliminates a class of "undefined" errors from race conditions.

## 2026-03-30: Prettier must run from a package directory, not the repo root — promoted to `.claude/rules/verification-commands.md`

## 2026-04-08: Review skills checked correctness but not necessity — promoted to ADR-0017 (`dual-axis-review-correctness-and-necessity.md`)

## 2026-04-08: "3+ sites" duplication threshold misses data/logic duplication at 2 sites

- **What happened:** `MegaMenuEditor.php` and `MegaMenuBlocksApi.php` had byte-for-byte identical draft-resolution logic, default block markup, and option key constants. 11 review rounds (Briar + Eric) never flagged it because the skill instruction says "duplicated logic across 3+ sites." jmotes (human reviewer) caught it.
- **Rule:** The 3+ threshold is appropriate for pattern duplication (similar code shapes that could share a helper). For data/logic duplication over shared state — identical constants, identical business logic reading the same `wp_options` rows — flag at 2 sites. Silent divergence of shared data is a correctness risk, not a style concern.

## 2026-04-04: Complete all mandatory skill sections before responding

- **What happened:** Winston's evaluation skipped the Devil's Advocate section. The user had to prompt "did you do the devils advocate part?" to get it — the skill spec already said NON-OPTIONAL twice.
- **Rule:** Before sending a skill response, check that skill's output format and Definition of Done as a checklist. Every section marked mandatory, required, or non-optional must be present. Do not stop at a natural conclusion point — verify completeness first. This applies to all skills, not just Winston.

## 2026-04-06: ESLint plugin resolution fails from the repo root due to pnpm hoisting — promoted to `.claude/references/operational-gotchas.md`

## 2026-04-08: PHP tests require `composer install` before first run — promoted to `.claude/references/operational-gotchas.md`

## 2026-04-15: Plan tasks with multi-persona handoffs must label ownership and sequencing — promoted to ADR-0018 (`persona-lane-ownership.md`)

## 2026-04-21: Gutenberg apiVersion 2 blocks render as two nested divs, not one

- **What happened:** THR-1652 went through two rounds of wrong diagnoses before the DOM proved the assumption was false. Both Sasha passes assumed `useBlockProps` merged onto a single element that was the flex item inside `.mega-menu-columns-inner`, so inline `flex-basis` would work. The actual DOM has `<div class="block-editor-block-list__block wp-block">` wrapping the `useBlockProps`-spread div — the outer wrapper (`display: block`) is the flex item; the inner styled div is just a block-level descendant. Inline `flex-basis` on a non-flex-item does nothing.
- **Rule:** For layout bugs in the Gutenberg editor, verify the actual DOM in devtools before reasoning about flex/grid behavior — don't infer layout from source. When a block needs to style the flex item in a flex-row parent (columns, toolbars), use `getEditWrapperProps` in `registerBlockType`, not `useBlockProps` style. `useBlockProps` styles the inner block content; `getEditWrapperProps` styles the outer `.block-editor-block-list__block` wrapper that actually participates in the parent's flex layout.

## 2026-04-17: Direction-coupled mapping twins instead of reusing axis-agnostic primitives — promoted to `.claude/architect/frontend-constants.md` § Mapping Constants

## 2026-04-17: Assumed @wordpress/\* imports were bidirectional — promoted to `.claude/rules/code-standards-ts.md` § Modeling external contracts

## 2026-04-17: Deriving a type from a transient local constant instead of modeling the upstream contract — promoted to `.claude/rules/code-standards-ts.md` § Modeling external contracts

## 2026-04-18: When a test folder groups by concern, new tests go into the existing concern file — not a new sibling file

- **What happened:** After discovering the `tests/Unit/Services/MegaMenuMigration/` subfolder (one file per conceptual concern — `NavigationItemTest.php`, `EquipmentPaneTest.php`, `NormalizerAndStructuralTest.php`, etc.), Clove created a new sibling `NavigationItemLinkExtrasTest.php` for 17 tests covering the nav item's target/rel behavior. No other file in the folder splits a single concern across multiple `*Test.php` files — `EquipmentPaneTest.php` has card/links/banner tests together, `ServicePaneTest.php` has all its variants together. Jon flagged it: "there's not a corresponding php file for that" — the `*Extras` naming implied an `Extras.php` source file that doesn't exist, and the split put closely-related nav-item link tests in two files. Merged all 17 tests into `NavigationItemTest.php` under new sub-section headers flanking the existing basic-mapping tests.
- **Rule:** When adding tests to a folder that groups test files by conceptual concern (not by source file), add new tests to the existing concern file using section-divider comments (`// ──── subsection ────`), not a new sibling file. Check the folder's existing organization before creating a new `*Test.php` file: if every other file covers a different concern, a new file should only be created for a genuinely new concern — not a subset of an existing one. Naming patterns like `*ExtrasTest`, `*HelpersTest`, or `*EdgeCasesTest` are a signal that you're creating a sibling for a subset rather than a new concern, and the tests probably belong in the sibling's existing file.

## 2026-04-18: Existing test files for a service may live in a per-concern subfolder, not a single top-level file

- **What happened:** Clove searched for tests of `MegaMenuMigrationService` via `tests/**/MegaMenuMigration*` and concluded no tests existed, then created a new top-level `MegaMenuMigrationServiceTest.php`. Running the full unit suite revealed `tests/Unit/Services/MegaMenuMigration/` — a subdirectory with 7 pane-specific test files (`NavigationItemTest.php`, `EquipmentPaneTest.php`, etc.) plus a `Helpers.php` with `makeMigrationService`, `legacyMenuBlock`, and `captureBlock`. Adding a `get_option` call to the service broke 8 pre-existing tests because they didn't stub it. First attempt fixed it with a folder-scoped `beforeEach` in `tests/Pest.php`; Jon pushed back — global test config for a local problem is the wrong shape. Correct fix: add a per-file `beforeEach` stub to the two files that actually exercise the new code path (`NavigationItemTest.php`, `NormalizerAndStructuralTest.php`), and keep my new test file explicit about its stubs.
- **Rule:** Before creating a test file for an `includes/Services/*.php` class, check both `tests/Unit/Services/{ClassName}Test.php` **and** `tests/Unit/Services/{ClassName}/` (a subdirectory split by concern). Grep for uses of the class in the `tests/` tree (`grep -r 'use Thrive_Core\\Services\\{ClassName}'` or any invocation pattern) rather than globbing by filename. Reuse any co-located `Helpers.php` and its factory functions (e.g. `makeMigrationService`, `captureBlock`) instead of duplicating them. When adding a WP function call to a service whose existing tests didn't stub it, add the stub in each affected test file's own `beforeEach` — do not reach for a folder-scoped `uses()->beforeEach()` in `Pest.php`. `Pest.php` is for framework wiring (setUp/tearDown, base test cases, custom expectations); per-area defaults belong in the tests themselves where they're visible to whoever's reading the test.

## 2026-03-30: Self-review after another skill should scope to only what changed — promoted to `.claude/skills/thrive-code-review-self/SKILL.md` § Scope

## 2026-04-18: Proposing a separate file for new constants without checking existing file contents

- **What happened:** In THR-1610's axis-fix follow-up, Winston proposed a new file `frontend/blocks/columns/alignment-classes.ts` to host two new `HORIZONTAL_ALIGNMENT_*_CLASSES` mappings, justifying it as "container-specific concerns don't belong in theme.ts — the `[&>*]:` selectors are Columns-pattern-specific." Hunter pushed back: `theme.ts` already contained `BLOCK_ALIGNMENT_MAPPINGS` and `BLOCK_VERTICAL_ALIGNMENT_MAPPINGS`, both of which are container-specific (flex-col assumptions baked in). The "purity" distinction didn't hold up against existing precedent. Winston conceded and relocated the mappings to `theme.ts`.
- **Root cause:** Winston had read `theme.ts` earlier in the session (via grep and file-level references) but didn't use that knowledge to site the new mappings correctly. The proposal was driven by an idealized mental model of what `theme.ts` "should" contain, not by what it actually contains.
- **Rule:** Before proposing a new file for constants or shared data, grep the existing analogous file (e.g. `theme.ts`, `site-settings.ts`) for similar patterns. If the existing file already hosts container-specific or block-specific content, new entries of the same kind belong alongside them. Discoverability beats purity — a developer looking for "all the X we have" should find them in one place. This is the same class of error as the 2026-04-17 `@wordpress/*` import-direction lesson: unchecked assumption about what a codebase location "is for" driving architectural recommendations.
- **Process takeaway:** When challenged on placement ("shouldn't this go with the other X?"), default to conceding if the existing file already contains content of the same kind. Don't defend a distinction the codebase has already refused to honor.

## 2026-04-18: Updating Jest assertions for a contract change without auditing Storybook play assertions

- **What happened:** In THR-1610's axis-fix, Clove changed `ColumnBlock.tsx` to only set inline `flexBasis` when a custom `width` is provided (previously defaulted to `"100%"` inline). The `ColumnBlock.test.tsx` Jest test was updated as part of the same task (Task 27) to reflect the new contract — inline flexBasis empty + `w-full` class. But the matching Storybook play assertion in `ColumnBlock.stories.tsx` (`NoWidth` story, asserting `flexBasis === "100%"`) was missed. Task 28 targeted `ColumnsBlock.stories.tsx` (parent) for the new distributive override classes and the sibling `ColumnBlock.stories.tsx` (child) was overlooked. The failure only surfaced when the user ran `pnpm run test-storybook` in their container dev environment.
- **Root cause:** Clove's verification grep at Task 24 was scoped to `toolbarToAxisKey` references, not to all consumers of the contract that changed. The Storybook play-function is a test — it asserts against the component's observable behavior just like Jest — but because the change was framed as "update the Jest test", the play-function version of the same assertion didn't enter the mental model.
- **Rule:** When an inline-style or className contract changes on a component, grep for **every assertion** that targets the affected property across both `__tests__/` (Jest) AND `.stories.tsx` (Storybook play functions). Both are test surfaces; both go stale the same way. A one-word grep (`flexBasis`, or `toHaveClass("w-full"`)) across both file types catches every consumer of the old contract in seconds. Treat Storybook play-function assertions as peers to Jest tests for the purpose of refactor sweeps, not as a separate category.
- **Process takeaway:** The test-update task in a plan should name the property that's changing, not the test file that contains it. "Update flexBasis assertions to match the new conditional-inline contract" reaches every consumer; "update ColumnBlock.test.tsx" reaches only one file.

## 2026-04-18: "Does this file already host similar content?" is the wrong placement test for new constants

- **What happened:** In THR-1610's first relocation pass (2026-04-18), the earlier lesson told Winston to default to `theme.ts` for new alignment mappings because `theme.ts` already contained `BLOCK_ALIGNMENT_MAPPINGS` / `BLOCK_VERTICAL_ALIGNMENT_MAPPINGS` with flex-col assumptions baked in. Hunter pushed back on Winston's initial "new file" proposal and the mappings went into `theme.ts`. On PR #1800, Hunter re-opened the question — and this time the sharper analysis landed: `HORIZONTAL_ALIGNMENT_FLEX_ROW_CLASSES` is Columns-specific in practice (verified GroupBlock cannot reuse it — different breakpoint, different child-sizing assumptions, different vocab closure), so it belongs in a block-local file. The mappings moved back out to `frontend/blocks/columns/alignment-classes.ts`.
- **Root cause:** The earlier "grep the existing file for similar patterns" rule conflated two categories. `BLOCK_ALIGNMENT_MAPPINGS` is **container-specific** (flex-col assumption) but **cross-block** — any flex-col block with toolbar alignment can index it correctly. `HORIZONTAL_ALIGNMENT_FLEX_ROW_CLASSES` is **container-specific** AND **block-specific** — its values bake in `flex-1 w-full` child-sizing assumptions that are unique to Columns-container children. Both look like "container-specific content in `theme.ts`" on casual inspection, but they pass different reusability tests.
- **Rule:** The placement test for new mappings is not "does `theme.ts` host similar content?" — it's "can another block use these **values** correctly?" If yes, it's a cross-block primitive and goes in `theme.ts`. If no, it's block-local and goes in `frontend/blocks/<block>/alignment-classes.ts` regardless of what's already in `theme.ts`. The type being cross-cutting (conforms to `BlockToolbarAlignment`) is not the same as the values being reusable. Naming test: if the constant needs the block name prefixed to read clearly (`COLUMNS_HORIZONTAL_ALIGNMENT_FLEX_ROW_CLASSES`), the block name belongs in the file path, not the identifier.
- **Process takeaway:** This is a Common Closure Principle + Common Reuse Principle distinction codified by Bob Martin — things that change together are packaged together, and things that are reused together are packaged together. Before defaulting to a shared constants file, verify the new values against another plausible consumer. If they'd break that consumer (wrong breakpoint, wrong override, wrong vocab), the values are block-local. Supersedes the 2026-04-18 "grep the existing file for similar patterns" rule where the two collide — that rule is still correct for cross-block primitives, but not for block-specific values.

## 2026-04-20: Worktree absolute paths land in the main workspace — promoted to `.claude/references/operational-gotchas.md`

## 2026-04-20: /tmp/pr-body.md is shared across sessions — promoted to `.claude/references/operational-gotchas.md`

## 2026-04-20: Linear's markdown sanitizer silently drops content after unescaped angle brackets — promoted to `.claude/references/operational-gotchas.md`

## 2026-04-20: Don't assume a raw-API contract when you're calling through an MCP wrapper

- **What happened:** Lilac v2 was built around a render-target split: standard markdown for paste (WYSIWYG composer), legacy mrkdwn (`<url|text>`) for "API" posts via the Slack MCP. The reasoning came from how Slack's raw Web API documents its wire format — mrkdwn is what `chat.postMessage` wants. We shipped the skill, template, plan, lesson, and persona docs all reacting to this split. When Briar ran the post-implementation review with the MCP finally visible, she loaded the `slack_send_message` tool's schema and the description said the opposite: "Message uses standard markdown (bold, italic, code, strikethrough, blockquotes, lists, links, code blocks)." The MCP wrapper accepts standard markdown and translates to Slack's wire protocol internally. The whole render-target split was overengineered for a problem that didn't exist — rolled back in the same ticket.
- **Rule:** When a skill calls a remote service through an MCP wrapper, the wrapper's schema is the contract — not the underlying service's raw API. MCP servers often normalize input formats (markdown → mrkdwn, channel names → channel IDs, etc.) so the skill doesn't have to. Load the tool schema via `ToolSearch select:<tool-name>` before writing calling code, and read what the description says the tool accepts. Don't default to the raw API's conventions — the wrapper is allowed to be opinionated and often is.
- **Process takeaway:** When a plan makes decisions based on an unverified assumption about an external contract, put "verify the contract" as task 1 and block downstream work on it. The plan had this task (Slack MCP discovery) but the MCP wasn't visible in the implementation session — we pushed ahead on assumptions and ate the cost in review. If the verification can't happen, narrow the scope until it can.

## 2026-04-20: Slack MCP `slack_send_message` rejects `###` markdown headings — promoted to `.claude/templates/standup-summary.md`

## 2026-04-20: Slack's posted-message renderer collapses empty lines between paragraphs — promoted to `.claude/templates/standup-summary.md`

## 2026-04-21: `usermod -m` migrates the current home tree — promoted to `.claude/references/operational-gotchas.md`

## 2026-04-22: Defaulted to "new ticket" for in-scope follow-up without running a scope-fit check — promoted to `.claude/skills/thrive-architect/SKILL.md`

## 2026-04-20: Tailwind `[&>*]:X` arbitrary variants have specificity (0,1,0), not (0,1,1)

- **What happened:** THR-1610's followup fix (#1800) encoded `[&>*]:flex-none [&>*]:w-auto` into the Columns alignment mapping, claiming it would override child sizing "via class specificity (0,1,1 > 0,1,0)". The fix shipped with 27/27 tests green, and the Linear ticket was marked complete. THR-1651 showed alignment still doesn't visually apply — because the math was wrong. `[&>*]:flex-none` compiles to `.<class> > * { flex: none }` — `.class` is (0,1,0), `>` adds nothing, `*` adds nothing. The arbitrary variant's specificity equals the bare utility's, so it ties with `.w-full` on the child and loses outright to `.mega-menu-columns-inner > .block-editor-block-list__block` in editor.scss (0,2,0).
- **Rule:** Tailwind's `[&>*]:X` variants produce `.<class> > * { ... }` selectors. Specificity is just the class — the `*` universal selector contributes (0,0,0), and combinators contribute nothing. For a distributive child override to beat a child utility like `.w-full`, you need either (a) the `!` important modifier, (b) a more specific selector (`[&>.known-class]:X`), or (c) removing the child's conflicting utility so there's nothing to override. Don't plan specificity fights around an extra point the selector doesn't have.
- **Process takeaway:** A test suite that asserts on generated class strings cannot catch specificity bugs — the bug is in the CSS that results, not the class attribute. When a fix's reasoning is "this wins via specificity," the verification must be at the rendered-CSS layer: a Storybook play test that measures `getBoundingClientRect()`, Chromatic snapshot comparison, or a DOM test that reads `getComputedStyle()`. Class-string tests protect against wiring regressions, not specificity regressions.

## 2026-04-22: Turbopack dev caches arbitrary-value Tailwind classes with `!` and `var()` syntax across HMR — promoted to `.claude/references/operational-gotchas.md`

## 2026-04-22: When a destination page works via every path except one, the destination is innocent

- **What happened:** THR-1422 followup spent three debug sessions on a wheel and Tab lock on `/search` that only reproduced when navigating from the Autocomplete component's "View all Results" button. Instrumented the destination page, gated ScrollTo on `hasInteracted`, toggled router.push scroll options, disabled ProgressBar, removed `ssr: false`, tested Firefox and production builds — all fruitless. The framing that finally pruned the decision tree was the user's: _"ScrollTo and Kronos work fine on other pages — it's something about that Autocomplete and that View all button."_ Root cause was structural in the source component (non-`ComboboxOption` child inside `ComboboxOptions`), not in the destination.
- **Rule:** When a bug reproduces only through **one** navigation path into an otherwise-working destination, the destination is innocent — stop instrumenting it. Early in triage, establish whether other entry points to the same destination reproduce (direct link, refresh, bookmark, sibling component). If they don't, all debug effort belongs on the source side. This heuristic costs 30 seconds to verify and can prune hours of destination-side instrumentation.
- **Process takeaway:** When handing a bug off to a debugger (Sasha or similar), include "which entry points reproduce vs. don't" in the initial report. It shapes the entire decision tree. THR-1422's first handoff lacked this framing and the first experiment batch was all destination-side. See `.claude/architect/headless-ui.md` for the Headless UI-specific pattern this incident surfaced.

## 2026-04-22: `prettier --write` sweeps pre-existing drift into your commit — promoted to `.claude/skills/thrive-code-dev/SKILL.md` § Formatting

## 2026-04-27: Linear MCP silently drops body content when paragraphs use bold-prefix labels — promoted to `.claude/references/operational-gotchas.md`

---

## 2026-04-27: Verify the codebase's actual data-flow boundary before recommending architecture changes — promoted to `.claude/skills/thrive-architect/SKILL.md` (commit 11cebf354)

## 2026-05-01: `gh pr edit --add-label` / `--remove-label` is broken — use the REST labels endpoint with a JSON body

- **What happened:** While re-reviewing PR #1959, Eric tried to swap labels in the standard way (`gh pr edit 1959 --remove-label "..." --add-label "..."`) and got back `GraphQL: Projects (classic) is being deprecated... (repository.pullRequest.projectCards)`. The flag-form command goes through `gh`'s GraphQL path, which still touches a deprecated Projects-classic field on the PR object. The REST API still works, but the labels-array workaround `gh api .../labels -f 'labels[]=foo'` blows up under zsh because the unquoted `labels[]` triggers glob expansion (`zsh: no matches found: labels[]=foo`). Two failures back-to-back, both label-related.
- **Rule:** Don't manage PR labels through `gh pr edit --add-label` / `--remove-label` — the underlying GraphQL call hits a Projects-classic field and errors out. Use the REST API with a JSON body via stdin: `gh api repos/<owner>/<repo>/issues/<num>/labels --input - <<'EOF'\n{"labels": ["effort:quick", "review:has-minors"]}\nEOF`. For removals, use individual `DELETE` calls (`gh api -X DELETE repos/<owner>/<repo>/issues/<num>/labels/<label-name>`) — 404s when the label isn't on the issue are safe to ignore. Avoid `-f 'labels[]=foo'` syntax: zsh glob-expands the brackets. Same workaround pattern likely applies to any `gh pr edit` flag that hits the GraphQL path until GitHub finishes the Projects-classic sunset.

## 2026-04-29: When one element is broken and similar elements nearby work, diff before you dive

- **What happened:** THR-1135 followup — info banner button reportedly not reachable via Tab and no visible focus indicator. Sasha anchored on a complex hypothesis (React `createPortal()` bypassing Headless UI v2's sentinel focus-guard mechanism in `PopoverPanel`) and spent significant time tracing minified Headless UI source to confirm it. The user pushed back: "Tab works for links and buttons in standard card, so why not the info banner?" That single observation invalidated the portal hypothesis instantly — same panel, same portal, other elements work. Eventually the user pasted the rendered DOM, which showed a standard `<a href>` element with no `tabindex`/`aria-hidden`/`inert`. Real root cause was a one-line CSS bug: `focus-visible:outline-current` on a primary button where `currentColor` resolves to white, against a white panel background. The blue `focus:ring-2` was technically present but too faint/transition-faded to register. A two-minute diff against `MegaMenuLinkWithIcon.tsx` (which uses the same `focus-visible:outline*` shape *without* `outline-current`, and works) would have surfaced this immediately.
- **Rule:** When something specific is broken and similar things in the same context aren't, the *first* read after locating the broken file should be a side-by-side diff of the broken element against its working neighbors. Going to framework source, runtime mechanics, or architecture-level hypotheses is a tool of last resort, not first instinct. The codebase usually wants to tell you what's wrong if you compare neighbors first.
- **Process takeaway:** Sasha's existing framework already names this — "Eliminate red herrings: confirm what is NOT the cause before asserting what is" — but it didn't fire because a complex hypothesis felt like *real* debugging. The bias to overlook is fixation: committing to an interesting first hypothesis and chasing it past the point where simpler explanations should be ruled out. Heuristic to deploy at debug-start: list the broken element's siblings that share its context, and demand a one-paragraph "here's what differs" before opening any framework source. This pairs with the 2026-04-22 lesson about destination innocence — both are forms of the same discipline: prune the search space with comparison before instrumenting.
