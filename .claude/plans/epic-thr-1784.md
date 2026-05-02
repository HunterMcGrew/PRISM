# Plan: epic-thr-1784 — Frontend Data Layer Reshape

## Ticket

https://linear.app/tractru/issue/THR-1784

Epic. Five child stories tracked separately:

| Ticket | Story | Status |
|--------|-------|--------|
| THR-1785 | Story 1 — Document the new architecture (foundation) | In PR |
| THR-1786 | Story 2 — Quick wins: gentle refactors (file moves, no behavior change) | Backlog |
| THR-1790 | Story 3 — Pre-work: measurements and audits | Backlog |
| THR-1789 | Story 4 — Per-entity migration to the target shape | Backlog |
| THR-1788 | Story 5 — Interface cleanup and architect doc canonicalization | Backlog |

Supersedes THR-1780 (Hunter's original "hardening" framing — closed; pre-work, projection mappers, and WPE persisted-query awareness absorbed here). Related to THR-1778 (the surgical fix that revealed the structural pattern; this epic prevents recurrence).

## Goal

Reshape `frontend/lib/data-access/` and `frontend/lib/services/` into a clean, source-agnostic data layer where source-specific concerns stay isolated, domain logic is portable, caching is co-located with revalidation policy, and folder layout is entity-first so new data sources slot in cleanly. Migration is per-entity, opt-in with each touch.

---

## Why this matters

The data layer is doing real work, and the work is mostly correct. The drift problems aren't catastrophic — they're paper cuts that compound. Three observable costs:

**Source logic scatters.** `EventService.dtoToEvent`, `PromotionService.dtoToPromotion`, and the `OfferService` discriminator all import GraphQL DTO types directly. New data sources have nowhere obvious to land — SPC offers had to thread through the existing `OfferService`, producing the `GQLPromotionDTO | SPCOfferDTO` discriminator that's now the canonical example of how it goes wrong. The next third-party integration — vendor SDK, REST API, internal service — will hit the same problem and produce the same shape unless the seam exists.

**Caching policy can't honor multiple sources.** Cache lifetime is a property of the source (webhook-driven on-demand vs polling-based intervals). A single resolver-level wrapper picks one policy across all sources of a unified result. Already an active bug surface — THR-1778 (promotion detail page slowness) was a missing wrapper, but the deeper issue is that the wrapper shape varies across resolvers and won't generalize as multi-source operations become common.

**The contract layer lies.** `IContentService<T>` and `IDataAccessLayer<T>` require methods that most implementations throw on. New developers reading the layer can't tell which methods are real contracts. The compiler accepts the lie. The interface stops constraining anything.

The reshape addresses all three with one structural move: separate the layer's responsibilities along the natural seams (source-coupled, source-agnostic, page-resolution), and make each seam visible and enforced. ADR-0021 carries the full rationale.

This is foundational architecture work. It pays its rent in code review velocity, test simplicity, onboarding clarity, and contained blast radius for future changes — every day, not just at migration time. CMS migration is one of several future scenarios that becomes much cheaper as a downstream effect; it's not the central justification.

---

## Stories

### Story 1 — Document the new architecture (THR-1785) — Foundation, in PR

Architecture docs only — no code changes. Ships ADR-0021, `.claude/architect/data-layer.md`, `.claude/rules/data-layer-boundaries.md`, this epic plan, lessons entries, and patches to `frontend-services.md` / `frontend-blocks.md` redirecting at the new target.

**Tasks:**

#### Winston (architecture documentation)

1. ✅ Write `.claude/spec/adrs/0021-data-layer-reshape.md` — the canonical decision record covering Context, Decision, Consequences, References.
2. ✅ Write `.claude/architect/data-layer.md` — agent-facing target shape: folder structure, layer rules, naming conventions, end-to-end Promotion example, multi-source Offer example, type contracts, migration status.
3. ✅ Register `data-layer.md` in `.claude/architect/manifest.json` so it auto-loads on diffs touching `frontend/lib/data-access/`, `frontend/lib/services/`, `frontend/lib/domain/`, `frontend/lib/factory/`, or `frontend/lib/routing/`.
4. ✅ Patch `.claude/architect/frontend-services.md` to point at `data-layer.md` as the target architecture; note that the current shape is interim and migrating per-entity. Strike the obsolete "caching at resolver" claim.
5. ✅ Patch `.claude/architect/frontend-blocks.md` § Caching Pattern to note the resolver-wrapping pattern is interim; new blocks should follow the data-layer pattern (caching inside the fetcher) where their entity has been migrated.
6. ✅ Write `.claude/rules/data-layer-boundaries.md` — the enforcement rule. Defines the dependency graph, hard prohibitions (Apollo imports, DTO leaks, raw `gql` outside data-access), the scope rule for new vs. existing work, and a review checklist with concrete remediation language for Eric and Briar. Surfaces architectural drift at PR review the way issue #1096 (direct Apollo connection without DAL entry) should have been caught.
7. ✅ Add `.claude/lessons.md` entries — caching layer placement (the rule that survived three oscillations), `"use cache"` constraint (top-level functions only; class methods can wrap them).

#### Eli (paired human-readable doc — follow-up after Story 1 PR merges)

8. Write `docs/content/dev/architecture/data-layer.md` — narrative version of the architect file. Same content, longer prose, framed for teammates reading to learn rather than agents loading context. Cross-link both ways: this file references the architect doc and the ADR; the architect doc points back here for the human-readable narrative. Use `docs/content/dev/architecture/headless-architecture.md` as the structural reference (frontmatter, "for the precise agent-enforced rules see..." callout, three-runtimes-style framing).

### Story 2 — Quick wins: gentle refactors (THR-1786)

Mechanical file moves and renames that prepare the codebase for the per-entity migration without changing any behavior. Reversible, low-risk, parallelizable with Story 3 (pre-work). **Ships as a single PR** — type-check + tests are the validation gates; reviewer cost is lower in one mechanical sweep than four sequential PRs. See Decisions log entry 2026-04-29 for the call.

The five moves:

1. Split-rename `frontend/lib/interfaces/` into `frontend/lib/domain/` (business nouns) and `frontend/lib/contracts/` (application contracts) — file-by-file split per THR-1786, plus import path updates, `manifest.json` patches, and architect file rename (`frontend-interfaces.md` → `frontend-contracts.md`).
2. Restructure `data-access/<source>-<entity>/` → `data-access/<entity>/<source>/` (file moves + import path updates + manifest patterns).
3. Move `frontend/lib/rsc/fetchers.ts` → `frontend/lib/routing/fetchers.ts` (file move + import path updates + manifest registration).
4. Move `frontend/lib/services/ServiceFactory.ts` → `frontend/lib/factory/ServiceFactory.ts` (file move + import path updates across all consumers — every block resolver, every supplementary fetcher, every test). The factory is the wiring layer, not a service; the location should match. The manifest's `frontend/lib/factory/**` → `data-layer.md` registration is already in place and goes live once this task lands.
5. Manifest + architect file path sweep for any stale references missed by the per-move updates.

After Story 2 lands, Story 4's per-entity migrations just edit files inside the right folders.

#### Implementation Tasks

##### Clove

1. Create `frontend/lib/domain/` and `frontend/lib/contracts/`. `git mv` each file from `frontend/lib/interfaces/` per the file-by-file split in THR-1786's description (28 files to `domain/`, 11 files to `contracts/`). Move `__tests__/` files to whichever side their subject lives on. Remove the now-empty `frontend/lib/interfaces/` directory.
2. Restructure `frontend/lib/data-access/`: `git mv` 13 source-prefixed folders (`gql-blog-post`, `gql-call-to-action`, `gql-career`, `gql-employee`, `gql-equipment`, `gql-event`, `gql-location`, `gql-page`, `gql-product`, `gql-promotion`, `gql-rental`, `spc-equipment`, `spc-offer`) into the `<entity>/<source>/` shape. The `spc-equipment` folder joins the existing `equipment/` folder.
3. Move `frontend/lib/rsc/fetchers.ts` → `frontend/lib/routing/fetchers.ts`. Create `routing/` directory. `actions.ts` stays in `lib/rsc/` (different concern), so don't delete the directory.
4. Move `frontend/lib/services/ServiceFactory.ts` → `frontend/lib/factory/ServiceFactory.ts`. No matching test file under `services/__tests__/` (only `ContentServiceFactory.test.ts` lives there, which stays put).
5. Repo-wide import path updates — single grep-replace pass per pattern:
   - `@frontend/lib/interfaces/<file>` → `@frontend/lib/domain/<file>` or `@frontend/lib/contracts/<file>` per the split (~457 files touched)
   - `@frontend/lib/data-access/<source>-<entity>/` → `@frontend/lib/data-access/<entity>/<source>/` (~49 files)
   - `@frontend/lib/rsc/fetchers` → `@frontend/lib/routing/fetchers` (~13 files)
   - `@frontend/lib/services/ServiceFactory` → `@frontend/lib/factory/ServiceFactory` (~50 files)
6. Update `.claude/architect/manifest.json`: drop the `frontend/lib/interfaces/` entry; add `frontend/lib/contracts/**` → `frontend-contracts.md`. Existing entries for `domain/`, `factory/`, and `routing/` are already registered from THR-1785 and go live as those folders appear.
7. Rename `.claude/architect/frontend-interfaces.md` → `.claude/architect/frontend-contracts.md`. Rewrite content to cover only the contract-shape types (block, render-context, site-globals, block-attributes, no-items-config, responsive-values, index-record, index-sort-by-item, content-service, data-access-layer). Strike entity-type rows from the file table — those are now under `data-layer.md` § Domain models.
8. Update `.claude/architect/data-layer.md` § Folder Structure: change "The split lands in THR-1786 (Story 2)..." line to past-tense / current state. Confirm the decision rule (PM-recognizable noun → `domain/`; system contract → `contracts/`) is documented.
9. Verify clean: run `pnpm run check-types`, `pnpm run test`, `pnpm run build`. Then run these greps to confirm zero stragglers — `rg "@frontend/lib/interfaces"`, `rg "lib/data-access/(gql|spc)-"`, `rg "@frontend/lib/rsc/fetchers"`, `rg "@frontend/lib/services/ServiceFactory"`. All four must return zero matches.

### Story 3 — Pre-work: measurements and audits (THR-1790)

Foundational measurement and audit work. Required regardless of pattern.

1. Cold-render TTFB baseline per single-template page. Output saved under `.claude/plans/perf-baselines/`.
2. Cache tag audit — every existing tag must be preserved by name in the new fetcher pattern. Output: `.claude/plans/audits/cache-tags.md`. Critical correctness gate.
3. `unstable_cache` location audit — produces the per-entity migration order. Output: `.claude/plans/audits/unstable-cache-locations.md`.
4. Build-time vs runtime cache verification — sitemap generation runs at build time. Output appended to `.claude/architect/data-layer.md` § Caching.

Gates Story 4 specifically on the cache tag audit (mismatched tags silently break WP webhook invalidation).

### Story 4 — Per-entity migration to the target shape (THR-1789)

The bulk of the work. Per-entity, opt-in with each touch. Each entity ticket is atomic and ships as one PR.

**Phasing:**

- **Phase 1 — Event** (small DTO, no cross-entity coupling, validates the pattern end-to-end).
- **Phase 2 — Single-source entities**: Career, Employee, Location, Rental, BlogPost, Page, Equipment, Navigation. Parallelizable.
- **Phase 3 — Cross-coupled**: Promotion + Product + CTAs together (mapper graph references each other; splitting across PRs leaves a half-translated graph).
- **Phase 4 — Multi-source**: Offer last (benefits most from `IPromotion` already being domain-shape; the `dtoToOffer(GQLPromotionDTO | SPCOfferDTO)` discriminator dies).

Each per-entity migration absorbs sync mapper cleanup (drop `async` on mappers that do no I/O) and adds projection mappers for card-shape consumers where the perf win is meaningful (8+ items rendered).

Per-entity tickets get filed under THR-1789 as work is picked up. Title format: `THR-XXXX: Migrate <Entity> to data layer reshape`.

### Story 5 — Interface cleanup and architect doc canonicalization (THR-1788)

Final phase, after every entity has migrated.

1. Delete `IContentService<T>` (no replacement; uniform contract lives at the per-entity `<Entity>Repository` interface level).
2. Delete `IDataAccessLayer<T>` (replaced by per-entity `<Entity>Repository` interfaces).
3. Delete `ContentServiceFactory.ts` if redundant.
4. Drop interim language from `data-layer.md`, `frontend-services.md`, `frontend-blocks.md`. Rewrite as canonical (no migration in flight).
5. Drop the scope distinction in `data-layer-boundaries.md` (all code now follows the target shape).
6. Promote durable decisions from this plan to architect docs.
7. Delete this plan file (`.claude/plans/epic-thr-1784.md`).

---

## Sequencing

- **Story 1 (docs):** ready, in PR
- **Story 2 (quick wins):** parallel with Story 3, can ship anytime after Story 1 lands
- **Story 3 (pre-work):** 3–5 days, gates Story 4
- **Story 4 (per-entity migration):** parallelizable, ~3–4 weeks calendar with 2–3 devs
- **Story 5 (cleanup):** final pass after all entities migrate

Total: ~4–6 weeks calendar with 2–3 devs in parallel.

---

## Decisions

- Documentation lands first, code follows per-entity. The target shape is durable before any migration starts so that per-entity work has something concrete to build against and code review has a reference. Reason: a half-migrated codebase without a shared target produces inconsistent shapes per PR; a documented target produces consistent shapes that converge cleanly.
- Sources, not protocols. The ADR and architect doc use "source" rather than "protocol" as the primary noun — protocols are one kind of source, but vendor SDKs, REST APIs, and internal services are sources too. Reason: the original `gql-` prefix framing was implicitly assuming all data comes from GraphQL-shaped systems; widening the noun keeps the architecture's framing accurate as Thrive integrates more diverse sources.
- Repos and services are both classes, with top-level cached fetcher functions underneath repos. Reason: consistency end-to-end with the team's .NET/OO mental model — interface + class + constructor injection at both layers, which is what reviewers and new hires read fastest. The `"use cache"` directive constraint (top-level functions only) is honored by keeping the cache primitive in fetcher modules; the repo class methods are thin wrappers (one line each). Considered: factory functions returning object literals for repos. Rejected: created a layer-shape inconsistency (services as classes, repos as functions) that read as accidental complexity to .NET-background reviewers, with no real win — the cached fetchers were going to be top-level functions either way, so the only question was whether the repo's public API was a class or an object literal, and class won on team-fit.
- No shared `ContentService<T>` interface. Reason: services don't actually share a useful uniform shape beyond pass-through methods, and forcing them under one interface reproduces the original `IContentService<T>` problem of pretending uniformity that isn't real. The uniform contract belongs at the repository level — `<Entity>Repository` interfaces are where polymorphism actually lives. Considered: a narrow `ContentService<T>` with `getItems`/`getItemBySlug`. Rejected: even narrowed, it forces shape on services that have substantively different orchestration surfaces (`OfferService` does multi-source unification, `PromotionService` does activity filtering, etc.) — a shared interface that has to be re-evaluated for fit on every service is the same fictional-uniformity bet that bit us with the legacy `IContentService<T>`.
- Service classes carry orchestration with constructor-injected collaborators. Reason: multi-collaborator orchestration is exactly what classes earn their keep on. A future `ProductService` combining a CMS repo, an AI content client, an inventory client, and a pricing client wants all of those bound at construction; constructor injection is the cleanest expression. Functions taking a long deps list (or a `deps` interface) reinvent the constructor poorly.
- Caching at the data-access layer, not the service. Reason: cache lifetime is a property of the source, not the domain — webhook-driven sources cache differently than polling sources, and a service-level wrapper can't honor both in a multi-source operation. Considered: service-layer caching for unified domain identity. Rejected after thinking through `OfferService` — every multi-source operation hits the policy-conflict wall.
- Migration is per-entity, not big-bang. Reason: the codebase has many entity services; one PR is unreviewable and one branch's lifetime can't span the whole reshape. Per-entity opt-in lets the work absorb into routine touches at low marginal cost per ticket.
- All new DAL/service work uses the new shape from day one (codified in `data-layer-boundaries.md`). Reason: without a clear "new work uses the new shape" rule, legacy patterns reproduce themselves and every new fetcher added to an old service becomes future migration cost.
- Eli writes the paired human-readable doc. Reason: per the architect file pairing precedent (`plugin-management.md` + `docs/content/dev/architecture/plugin-management.md`), agent-facing specs and human-facing narratives are separate audiences with different scanning patterns. The architect file is short and definitive for context loading; the dev doc is longer and explanatory for teammates.
- **THR-1786 ships as a single PR rather than four.**
  - **Root cause:** the original "atomic per sub-task" framing reasoned from convention rather than the actual cost-benefit. Mechanical file moves are validated by type-check and tests; reviewer cost is lower in one pass than four sequential PRs.
  - **Alternatives considered:** four sequential PRs per the original ticket framing; two PRs (interfaces split alone + everything else mechanical).
  - **Chosen approach:** one PR. Beats four sequential PRs on merge-conflict surface (one merge instead of four chances for someone else's import to land on the old path) and CI/review overhead. Beats the two-PR split because the architect doc edits are 30 lines and read fine inside a larger mechanical diff. "Atomic revert per sub-task" doesn't earn its keep — `git revert` works at any granularity, and reverting half a refactor leaves files in inconsistent shapes anyway.
  - **Implementation guidance:** validation gates are type-check, tests, and four `rg` checks for stragglers (see Clove task 9). PR description should call out the architect doc rename and decision-rule documentation explicitly so the reviewer's eye lands there in the diff.
- **ServiceFactory move included in THR-1786 scope.**
  - **Root cause:** Linear ticket description listed four sub-tasks; epic plan listed five (the fifth being `services/ServiceFactory.ts` → `factory/ServiceFactory.ts`). The manifest already registers `frontend/lib/factory/**` → `data-layer.md` and the end-to-end example in `data-layer.md` imports from `@frontend/lib/factory/ServiceFactory` — the move was always part of the target shape.
  - **Alternatives considered:** leave ServiceFactory move for a separate ticket later in the epic.
  - **Chosen approach:** include in THR-1786. Since this work is a single mechanical sweep, splitting one of the moves out costs a separate PR cycle without changing the work.
  - **Implementation guidance:** ~50 consumers updated by grep-replace. Linear ticket description updated to match.

- 2026-04-28 [main]: Plan created. Architecture discussion converged on data-layer reshape across multiple sessions. ADR-0021 written, architect file `data-layer.md` written and registered in manifest. Eli handoff pending for paired dev doc. Existing architect files (`frontend-services.md`, `frontend-blocks.md`) need patches to redirect to the new target.
- 2026-04-28 [main]: Added `.claude/rules/data-layer-boundaries.md` — the enforcement rule with hard prohibitions, scope rule for new vs. existing work, and PR review checklist. Triggered by issue #1096 (direct Apollo connection without DAL entry) which would have been caught with this rule in place. Architect file updated to reference the rule as a pair.
- 2026-04-28 [main]: Adversarial pass on the architecture surfaced two revisions. (1) Repos move from "factory function returning object literal" to **classes** implementing per-entity interfaces, matching the service layer's class shape end-to-end and the team's .NET/OO mental model. The `"use cache"` constraint is honored by keeping cached I/O in top-level fetcher modules; class methods are thin wrappers over them. (2) The shared `ContentService<T>` interface is dropped — service classes declare their own surface honestly. Uniform contract lives at the repository level (`<Entity>Repository`), where polymorphism for source swaps actually exists. Architect file, ADR-0021, and Decisions log updated to reflect.
- 2026-04-28 [main]: Epic THR-1784 created in Linear. Five child stories filed: THR-1785 (docs, in PR), THR-1786 (quick wins), THR-1790 (pre-work), THR-1789 (per-entity migration), THR-1788 (interface cleanup). Plan file renamed from `data-layer-reshape.md` to `epic-thr-1784.md`. Original Hunter epic THR-1780 superseded by THR-1784 — pre-work plan, projection mapper criteria, and WPE persisted-query awareness absorbed into the new stories.
- 2026-04-29 [jmotes/thr-1786-thr-1784-quick-wins-gentle-refactors-file-moves-no-behavior]: Story 2 plan detailed. Decided to ship THR-1786 as a single PR rather than four — mechanical moves validated by type-check, tests, and grep checks; merge-conflict surface and reviewer cost both lower in one pass. Added ServiceFactory move to THR-1786 scope (was in the epic plan but missing from the Linear ticket description). Linear ticket description updated to match.
- 2026-04-29 [jmotes/thr-1786-thr-1784-quick-wins-gentle-refactors-file-moves-no-behavior]: Story 2 implementation complete. All five moves landed: `interfaces/` split into `domain/` + `contracts/` (38 files), `data-access/<source>-<entity>/` restructured to `<entity>/<source>/` (13 folders), `lib/rsc/fetchers.ts` → `lib/routing/fetchers.ts`, `lib/services/ServiceFactory.ts` → `lib/factory/ServiceFactory.ts`. Repo-wide import updates (~514 files touched). Manifest updated (drop `lib/interfaces/`, add `lib/contracts/**` → `frontend-contracts.md`). Architect file rename `frontend-interfaces.md` → `frontend-contracts.md` with content focused on contracts only; `data-layer.md` § Folder Structure tense-fixed. Stale path sweep across `.claude/architect/`, `.claude/rules/`, and ADR-0019. Validation gates clean: `check-types` (frontend + backend), `pnpm run test` (221 suites, 1751 tests), `pnpm run build` (all routes), and four straggler greps return zero matches.
- 2026-04-29 [jmotes/thr-1786-thr-1784-quick-wins-gentle-refactors-file-moves-no-behavior]: Briar's self-review caught one Minor issue — ADR-0019 referenced `frontend-contracts.md § Link System`, a section that was correctly dropped in the rewrite. Replaced the broken reference with direct pointers to `lib/utilities/link-utilities.ts` and `lib/type-guards/link.ts` so readers can still navigate to the link-system code from the ADR.
- 2026-04-29 [jmotes/thr-1786-thr-1784-quick-wins-gentle-refactors-file-moves-no-behavior]: PR review surfaced a type-import correctness gap on `frontend/app/meta.ts` — type-only symbols imported as runtime values. Codebase-wide sweep: 343 files updated to `import type` for pure-type imports from `lib/domain/` and `lib/contracts/`, with inline `type` modifier on mixed imports and `import type X from` on `I*` default imports. Runtime exports (`isCTAIconKey`, `CTAListPlacementEnum`, `CARD_DEFAULT_HEADING_LEVEL`, `DEFAULT_NO_ITEMS_CONFIG`) untouched at import sites that consume them. Type-check clean across packages; 221 suites, 1751 tests pass; prettier + eslint clean.
- 2026-04-29 [jmotes/thr-1786-thr-1784-quick-wins-gentle-refactors-file-moves-no-behavior]: Eli swept docs drift across `docs/content/dev/` to address Eric's PR review minor. 14 files updated with mechanical path corrections — `interfaces/` paths split to `domain/` (entity types) or `contracts/` (application contracts and shape mirrors) per the THR-1786 split rule, and `services/ServiceFactory.ts` → `factory/ServiceFactory.ts`. `repository-service-pattern.md` § Repository Layer and § Directory Structure Summary restructured to show the entity-first `<entity>/<source>/` shape. Frontmatter `last_updated` bumped on all 14 files. Verification: zero matches for `lib/interfaces/`, `data-access/gql-<entity>/`, `data-access/spc-<entity>/`, or `services/ServiceFactory` across `docs/`. Narrative-level alignment of `repository-service-pattern.md` with the target shape (per-entity migration, repo-class pattern) deferred to Story 4 cleanup.
- 2026-04-29 [jmotes/thr-1786-thr-1784-quick-wins-gentle-refactors-file-moves-no-behavior]: Briar self-reviewed Eli's docs sweep (commit d2e07279b). Doc-class verification: every path claim in the diff resolved against the branch — `domain/{career,image,cta-button,menus,product,…}.ts` exist; `contracts/{site-globals,site-settings,no-items-config,responsive-values,block-attributes,content-service,data-access-layer,block,render-context}.ts` exist; `factory/ServiceFactory.ts`, `routing/fetchers.ts`, `services/ContentServiceFactory.ts`, `data-access/product/gql/gql-product-type-guards.ts`, and `data-access/gql-shared-types.ts` all present. New claims in the rewritten directory tree match source (`gql-shared-types.ts` top-level, `ContentServiceFactory.ts` retained in `services/`). Build/tests/lint skipped — diff is `.md` + plan only. No issues.
- 2026-04-29 [jmotes/thr-1786-thr-1784-quick-wins-gentle-refactors-file-moves-no-behavior]: Eric ran PR review on #1951. Doc-class triage source-verified all architect-doc claims; one Major flagged (data-layer.md:83 annotation drift, severity escalated from `minor` per architect-doc-verification rule) and one Minor flagged (28 relative-pathed type-only imports inside `frontend/lib/` missed by the codebase-wide sweep — same correctness class as qodo's original `meta.ts` flag). Both findings recorded in § Review Issues with `open` status. PR Readiness updated to reflect outstanding items.
- 2026-04-29 [jmotes/thr-1786-thr-1784-quick-wins-gentle-refactors-file-moves-no-behavior]: Eli fixed the Major. `data-layer.md:83` annotation updated from `fetch-site-globals.ts ← was lib/rsc/fetchers.ts` to `fetchers.ts ← was lib/rsc/fetchers.ts` — doc now matches the source as written. The rename to `fetch-site-globals.ts` is deferred to Story 4 when `routing/resolvers/` lands. Relative-path type-import sweep gap (Minor) remains `open` for Clove.
- 2026-04-29 [jmotes/thr-1786-thr-1784-quick-wins-gentle-refactors-file-moves-no-behavior]: Clove fixed the Minor. Broader sweep than Eric's original 28-line estimate — converted 103 relative-path type-only imports across 39 files under `frontend/lib/{constants,contracts,domain,factory,routing,search,services,utilities}/`. Covered all relative paths (`./` siblings inside `domain/`/`contracts/` plus `../` parent-relative consumers), all `I*`-prefixed interfaces and non-`I` type aliases (`BlockStyle`, `RouteData`, `IndexRecord`, `MediaType`, etc.). The four runtime exports stayed untouched. One TS1363 split needed in `get-categories-tree.ts` (`import type Default, { Named }` not allowed). `tsc --noEmit` clean post-sweep; one prettier auto-wrap on a long import line in `block-spacing-utilities.ts`.
- 2026-04-29 [jmotes/thr-1786-thr-1784-quick-wins-gentle-refactors-file-moves-no-behavior]: Briar verified Clove's import sweep (commit 674c4ca65). Straggler greps: zero unconverted relative-path type imports from `domain/` or `contracts/` across both `./` siblings and `../` parents. TS1363 check: zero `import type Default, { Named }` combos. Runtime exports: all four (`isCTAIconKey`, `CTAListPlacementEnum`, `CARD_DEFAULT_HEADING_LEVEL`, `DEFAULT_NO_ITEMS_CONFIG`) preserved as runtime imports at every call site, none accidentally converted. `tsc --noEmit` clean across `frontend/lib/`. Prettier spot-check clean on highest-risk files. All Review Issues confirmed `fixed`, PR Readiness current.
- 2026-04-29 [jmotes/thr-1786-thr-1784-quick-wins-gentle-refactors-file-moves-no-behavior]: Eric ran a re-review pass on PR #1951. Doc-class triage surfaced two new Major divergences and one Minor straggler. Major #1: five `data-layer.md` examples (lines 252, 281, 364, 425, 517) import `ISiteGlobals` from `@frontend/lib/domain/site-globals`, but the file is at `lib/contracts/site-globals` (the actual ServiceFactory.ts in this PR uses `contracts/`). Major #2: `frontend-services.md` lines 117 and 138 still describe the old `data-access/{protocol-entity}/` folder shape — half-aligned doc with `data-layer.md` and `repository-service-pattern.md`, both of which were rewritten to entity-first. Minor: Clove's sweep missed `frontend/lib/constants/render-contexts.ts:1-5` (runtime import of three `export type`-only symbols). All three recorded with `open` status. ServiceFactory.ts thread from prior pass confirmed fixed and resolved.
- 2026-04-30 [jmotes/thr-1786-thr-1784-quick-wins-gentle-refactors-file-moves-no-behavior]: Clove fixed all three of Eric's re-review findings. (1) `data-layer.md` — five `ISiteGlobals` import paths replaced via `replace_all` from `domain/site-globals` to `contracts/site-globals`. (2) `frontend-services.md` — line 115 (legacy `{protocol-entity}` repo path) and line 138 (legacy DTO path) rewritten to entity-first `<entity>/<source>/<Source><Entity>{Repository,DTO}.ts` with concrete examples. While in the file, also caught a stale line-25 reference (`frontend/lib/services/ServiceFactory.ts` → `frontend/lib/factory/ServiceFactory.ts`) that the original PR's architect-doc sweep missed — fixed under same scope. (3) `render-contexts.ts:1` — `import {` → `import type {`. Validation: `pnpm run check-types` (frontend + backend) clean; `pnpm run test` clean (221/1751); prettier clean on `render-contexts.ts` and `frontend-services.md`. Skipped prettier `--write` on `data-layer.md` — `--check` proposed wholesale pre-existing whole-file drift unrelated to this fix, exactly the case the operational rule says to skip.
- 2026-04-30 [jmotes/thr-1786-thr-1784-quick-wins-gentle-refactors-file-moves-no-behavior]: Briar verified Clove's three doc-class fixes (commit 5f994ad13). Source-verification: `frontend/lib/contracts/site-globals.ts`, `frontend/lib/factory/ServiceFactory.ts`, `frontend/lib/data-access/event/gql/{GQLEventRepository,GQLEventDTO}.ts` all exist. `RenderContext`, `RenderEnvironment`, `RenderPolicy` all `export type` in `contracts/render-context.ts`. Render-contexts.ts now uses `import type {`. Adversarial straggler grep across `.claude/architect/`, `.claude/rules/`, `.claude/spec/` for `{protocol-entity}`, `domain/site-globals`, `lib/services/ServiceFactory`, `lib/rsc/fetchers`, `data-access/(gql|spc)-<entity>` — only remaining hits are intentional historical annotations (`data-layer.md:83` "← was lib/rsc/fetchers.ts" and ADR-0021 frozen-in-time references). `tsc --noEmit` clean; prettier and eslint clean on changed source. Build skipped — diff is .md plus single-keyword type-import change, no Next.js bundle impact (CI will re-verify). All three Review Issues confirmed `fixed`. PR Readiness: green.
- 2026-04-30 [jmotes/thr-1786-thr-1784-quick-wins-gentle-refactors-file-moves-no-behavior]: Eric 3rd-pass PR re-review on #1951. Source-verified all six prior findings against the worktree at commit `8707365a5` — render-contexts.ts uses `import type {`, frontend-services.md lines 25/115/138 all use entity-first paths, all five `data-layer.md` ISiteGlobals examples import from `contracts/site-globals`, and the `data-layer.md:83` annotation reads as current state. Adversarial straggler sweep across `.claude/architect/`, `.claude/rules/`, `.claude/spec/`: only intentional historical references remain (`data-layer.md:83` "← was lib/rsc/fetchers.ts" annotation; old plan files for unrelated tickets). Both open inline threads (`render-contexts.ts:5`, `frontend-services.md:117`) resolved with confirmation comments. Summary comment updated. Labels applied: `effort:deep`, `confidence:high`. PR ready for human review.

---

## Acceptance Criteria

### Behavioral

- [ ] Given an agent loads context for a file under `frontend/lib/data-access/`, `frontend/lib/services/`, `frontend/lib/domain/`, `frontend/lib/factory/`, or `frontend/lib/routing/`, When the manifest matches, Then `data-layer.md` is loaded.
- [ ] Given a developer reading `data-layer.md`, When they reach the end, Then they can describe the target folder structure, name a fetcher in the right shape, and explain why caching lives at the data-access layer.
- [ ] Given a developer reading `docs/content/dev/architecture/data-layer.md`, When they finish, Then they understand the rationale behind the reshape (without needing to read the ADR) and know where to find the architect-facing version.
- [ ] Given a developer working on a per-entity migration, When they consult the plan's Sequencing section, Then they can determine which phase their entity falls into and what depends on it.
- [ ] Given a PR introduces a direct `@apollo/client` import outside `frontend/lib/data-access/`, When Eric or Briar reviews, Then the boundary violation is flagged with concrete remediation language pointing at `ServiceFactory` or a new fetcher.
- [ ] Given a PR adds a new entity, source, or substantial DAL operation, When Eric or Briar reviews, Then the new work is checked against `data-layer.md`'s target shape and the scope rule in `data-layer-boundaries.md`.

### Non-behavioral

- [ ] ADR-0021 is in `accepted` status with Context, Decision, Consequences, and References sections.
- [ ] `data-layer.md` is registered in `.claude/architect/manifest.json` for all five relevant directories.
- [ ] `frontend-services.md` and `frontend-blocks.md` reference `data-layer.md` as the target architecture and clearly mark the current shape as interim.
- [ ] The paired human-readable doc at `docs/content/dev/architecture/data-layer.md` cross-links to the architect file and the ADR; the architect file links back to the dev doc.
- [ ] All standard CRUD entities migrated under Story 4. `IContentService<T>` and `IDataAccessLayer<T>` deleted under Story 5. Architect docs canonicalized.

### AC Sync Log

| Date | Agent | Action | Plan | Linear |
| ---- | ----- | ------ | ---- | ------ |
| 2026-04-28 | Winston | Generated AC | written | synced to THR-1784 |
| 2026-04-29 | Winston | Generated AC for THR-1786 (Story 2) | written | synced to THR-1786 |

---

## Review Issues

### ADR-0019 stale § Link System reference

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `.claude/spec/adrs/0019-block-links-use-ilink.md:72`
- **Problem:** ADR-0019 References section points to `.claude/architect/frontend-contracts.md` § Link System. `frontend-contracts.md` has no Link System section — it was intentionally dropped when the file was rewritten (link.ts is a domain type, not a contract). The reference is a broken anchor in a durable spec file.
- **Fixed in:** Replaced the broken `frontend-contracts.md § Link System` reference with direct pointers to the source files where link type layout and key behaviors are documented inline — `frontend/lib/utilities/link-utilities.ts` (helpers like `setLinkTarget`, `setLinkRel`, `ensureLinkObject`) and `frontend/lib/type-guards/link.ts` (guards `isLinkObject`, `isLinkTarget`). Recovers the navigation paths the dropped section provided. Orphaned narrative documentation (delete-not-spread invariant, `isLinkObject` key+typeof check rationale) remains a Story 5 cleanup target — not blocking, the JSDoc and inline behavior is in the code.

### Type-only symbols imported as runtime values from lib/domain and lib/contracts

- **Severity:** `major`
- **Status:** `fixed`
- **File:** `frontend/app/meta.ts:3-5` (flagged), plus 343 other files codebase-wide
- **Problem:** The path-rename sweep preserved each existing `import { ... }` statement verbatim, so symbols that are pure TypeScript (`export type`, `export interface`, `export default interface`) continued to import as runtime values. Under `isolatedModules` and Next.js's SWC pipeline, single-file transpilation can't always tell type from value at the import site, which risks emitting non-existent runtime references for type-only symbols. The pattern existed pre-rename, but the rename touched every offending line and is the right moment to correct it.
- **Fixed in:** Codebase-wide sweep — converted every `import { ... }` from `lib/domain/*` or `lib/contracts/*` to `import type { ... }` when every imported symbol is type-only. Mixed imports (type plus genuine runtime symbol) use the inline `type` modifier per member. Default imports of `I*` interfaces (`IPost`, `ILocation`, `IEvent`, `IEmployee`, `ICategory`, `ICareer`) converted to `import type X from`. The four files in `domain/` + `contracts/` that export runtime values (`isCTAIconKey`, `CTAListPlacementEnum`, `CARD_DEFAULT_HEADING_LEVEL`, `DEFAULT_NO_ITEMS_CONFIG`) keep their imports intact for callers that need the runtime symbol. 343 files touched. Validation: `pnpm run check-types` passes across all packages; `pnpm run test` passes (221 suites, 1751 tests); prettier + eslint clean on every changed file.

### data-layer.md § Folder Structure annotates a fetcher rename that didn't happen

- **Severity:** `major` (raised from `minor` per `architect-doc-verification.md` — diverged claims in architect docs are at minimum Major; the doc routes into agent context via manifest.json so the wrong fact propagates to every future agent that loads it)
- **Status:** `fixed`
- **File:** `.claude/architect/data-layer.md:83`
- **Problem:** The folder-structure diagram annotates `routing/fetch-site-globals.ts ← was lib/rsc/fetchers.ts`, but the actual file landed as `routing/fetchers.ts` — the rename did not happen in this PR. The doc is target-shape, but the "← was" annotation reads as "this rename happened" and will mislead future agents and devs reading the diagram against the source.
- **Fixed in:** Updated the annotation to honest current state — `fetchers.ts ← was lib/rsc/fetchers.ts`. The rename to `fetch-site-globals.ts` is deferred to Story 4 when `routing/resolvers/` lands and the routing folder is restructured per the target shape. Doc now matches the source as written.
- **Flagged by:** Briar (self-review, 2026-04-29) and Eric (PR review, 2026-04-29 — escalated to Major per architect-doc-verification rule)

### Type-import sweep missed relative-pathed imports inside frontend/lib/

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** 39 files under `frontend/lib/{constants,contracts,domain,factory,routing,search,services,utilities}/` — 103 import lines total
- **Problem:** The codebase-wide `import type` sweep that came out of qodo's `meta.ts` flag converted alias-pathed imports (`@frontend/lib/domain/...`, `@frontend/lib/contracts/...`) but did not cover the relative-pathed equivalents (`../domain/...`, `./image`, etc.) that live inside `frontend/lib/` itself. Same correctness gap qodo originally surfaced under `isolatedModules` + Next.js SWC.
- **Fixed in:** Codebase-wide sweep with broader scope than Eric's original 28-line estimate — covered all relative-path type-only imports of types declared in `lib/contracts/` or `lib/domain/`, including `./`-relative imports inside those folders themselves. Symbols converted: every `I*`-prefixed interface plus non-`I` type aliases (`BlockStyle`, `BlockBorderSide`, `RouteData`, `RouteContentType`, `IndexRecord`, `MediaType`, `SortByItem`, `IThemePresets`, `IThemeSettings`, `IThemeStyles`, `RenderEnvironment`, `RenderPolicy`, `LinkTarget`, `IHierarchicalCategory`). Default `I*` imports converted to `import type IFoo from "..."`. The four runtime exports (`isCTAIconKey`, `CTAListPlacementEnum`, `CARD_DEFAULT_HEADING_LEVEL`, `DEFAULT_NO_ITEMS_CONFIG`) remained untouched. One file (`get-categories-tree.ts`) needed a split — TS1363 disallows `import type Default, { Named }` mixing default and named bindings on a single type-only import; split into two `import type` lines. Verification: `tsc --noEmit` clean, prettier wrapped one long import (`block-spacing-utilities.ts`).
- **Flagged by:** Eric (PR review, 2026-04-29)
- **Fixed by:** Clove (2026-04-29)

### docs/content/dev/architecture/repository-service-pattern.md drift

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `docs/content/dev/architecture/repository-service-pattern.md` (lines 53, 69, 92, 95, 203, 207, 230, 240–247)
- **Problem:** Substantial drift after the path rename — references `frontend/lib/interfaces/data-access-layer.ts`, `frontend/lib/interfaces/content-service.ts`, `frontend/lib/data-access/gql-product/`, and `gql-product-type-guards.ts`, none of which exist post-merge. Thirteen other `docs/content/dev/` files had lighter drift (block docs, headless-architecture.md, feature-flags.md, code-standards.md, color-theme-utility.md).
- **Fixed in:** Eli swept all 14 affected `docs/content/dev/` files. Mechanical path updates: `interfaces/` → `domain/` (entity types: career, image, cta-button, menus) or `contracts/` (application contracts and shape mirrors: site-globals, site-settings, no-items-config, responsive-values, block-attributes, content-service, data-access-layer); `services/ServiceFactory.ts` → `factory/ServiceFactory.ts`. Restructured `repository-service-pattern.md` § Repository Layer and § Directory Structure Summary to show the entity-first `<entity>/<source>/` shape (gql/spc as subdirectories, not prefixes); `gql-shared-types.ts` annotated as intentionally top-level (cross-entity). Frontmatter `last_updated` bumped to 2026-04-29 across all 14 files. Verification: zero matches for `lib/interfaces/`, `data-access/gql-<entity>/`, `data-access/spc-<entity>/`, `lib/rsc/fetchers`, or `services/ServiceFactory` across `docs/`.

### data-layer.md examples import ISiteGlobals from wrong path (domain instead of contracts)

- **Severity:** `major` (per `architect-doc-verification.md` — diverged claims in architect docs are at minimum Major; the doc routes into agent context for every data-layer edit via manifest.json)
- **Status:** `fixed`
- **File:** `.claude/architect/data-layer.md` lines 252, 281, 364, 425, 517
- **Problem:** All five code examples (`fetch-promotions.ts`, `GQLPromotionRepository.ts`, `PromotionService.ts`, `ServiceFactory.ts`, `OfferService.ts`) import `ISiteGlobals` from `@frontend/lib/domain/site-globals`, but the actual file is at `frontend/lib/contracts/site-globals.ts`. The new `frontend-contracts.md` lists `site-globals.ts` in its file table, and `frontend/lib/factory/ServiceFactory.ts:1` (in this very PR) imports from `../contracts/site-globals`. Looks like a search-replace pass that treated `ISiteGlobals` as a domain type when it's a contract type.
- **Fixed in:** Replaced all five occurrences of `@frontend/lib/domain/site-globals` with `@frontend/lib/contracts/site-globals` via a single `replace_all` edit. Verified with `grep -n "domain/site-globals"` returning zero matches. Doc now matches the source as written and the import path the actual `ServiceFactory.ts` uses.
- **Flagged by:** Eric (PR re-review, 2026-04-29)

### frontend-services.md describes the OLD data-access folder shape

- **Severity:** `major` (per `architect-doc-verification.md`)
- **Status:** `fixed`
- **File:** `.claude/architect/frontend-services.md` lines 25, 115, 138
- **Problem:** Both lines reference `frontend/lib/data-access/{protocol-entity}/{Protocol}{Entity}Repository.ts` and `{protocol-entity}/{Protocol}{Entity}DTO.ts` — the legacy `gql-event/` / `spc-offer/` shape. This very PR restructures into `<entity>/<source>/`, and both `data-layer.md` and `repository-service-pattern.md` were rewritten to the new shape. `frontend-services.md` is loaded for all `frontend/lib/services/**` work via the manifest, so future agents adding services will see two contradicting shapes.
- **Fixed in:** Rewrote line 115 to `frontend/lib/data-access/<entity>/<source>/<Source><Entity>Repository.ts (e.g. frontend/lib/data-access/event/gql/GQLEventRepository.ts)` and line 138 to the matching DTO shape. Same scope-discipline pass also caught a third stale path on line 25 — `frontend/lib/services/ServiceFactory.ts` updated to `frontend/lib/factory/ServiceFactory.ts` (the file moved in this PR but the architect doc reference hadn't been swept). All three lines now match the source. The surrounding example code (`GQLEventRepository implements IDataAccessLayer<GQLEventDTO>`, constructed with `client: ApolloClient`) accurately reflects the legacy shape that un-migrated entities still use; per-entity migration in Story 4 will rewrite the surrounding narrative as those entities migrate.
- **Flagged by:** Eric (PR re-review, 2026-04-29) — inline comment posted on line 117

### Type-import sweep missed render-contexts.ts

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `frontend/lib/constants/render-contexts.ts:1-5`
- **Problem:** Clove's commit `674c4ca65` swept 39 files under `frontend/lib/{constants,contracts,domain,factory,routing,search,services,utilities}/` but missed this file. All three imported names (`RenderContext`, `RenderEnvironment`, `RenderPolicy`) are `export type` only in `contracts/render-context.ts`. Same `isolatedModules` + Next.js SWC class as the prior flag.
- **Fixed in:** Changed `import {` to `import type {` on line 1. Validation: `pnpm run check-types` (frontend + backend) clean; `pnpm run test` clean (221/1751); prettier clean on the file.
- **Flagged by:** Eric (PR re-review, 2026-04-29) — inline comment posted

---

## Cleanup Items

- After Story 5 completes: drop the "Migration Status" section from `data-layer.md`, drop interim language from all three architect files, delete `IContentService<T>` and `IDataAccessLayer<T>`, delete this plan file.
- After Story 4: revisit `docs/content/dev/architecture/repository-service-pattern.md` for full alignment with the target shape (per-entity migrations, repo-class pattern, mapper extraction). Today's sweep handled mechanical path drift only — narrative still describes the legacy `IContentService<T>` / `IDataAccessLayer<T>` shape that the per-entity migration replaces.

---

## PR Readiness — Story 1 (THR-1785)

- [x] ADR-0021 written with Context, Decision, Consequences, References
- [x] `.claude/architect/data-layer.md` written with target shape, examples, migration status
- [x] `manifest.json` registers `data-layer.md` for the five relevant directories
- [x] `frontend-services.md` and `frontend-blocks.md` patched to redirect to the new target
- [x] `.claude/rules/data-layer-boundaries.md` written with hard prohibitions, scope rule, and review checklist
- [x] `.claude/lessons.md` entries added for caching layer placement and `"use cache"` constraint
- [x] Plan file `.claude/plans/epic-thr-1784.md` written with Stories, Decisions, History, AC
- [ ] `docs/content/dev/architecture/data-layer.md` written by Eli (paired doc — follow-up after Story 1 PR merges)
- [x] PR opened, description references THR-1785 and links to architect docs

**Last updated:** 2026-04-28

---

## PR Readiness — Story 2 (THR-1786)

- [x] No critical or major issues — Eric 3rd-pass re-review 2026-04-30 confirmed all prior findings fixed; both inline threads (`render-contexts.ts:5`, `frontend-services.md:117`) resolved
- [x] Types correct — `pnpm run check-types` passes (frontend + backend)
- [x] No stray console.logs or debug artifacts — file-move PR, no logic touched
- [x] Tests pass unchanged — 221 suites, 1751 tests, all green
- [x] Build passes — `pnpm run build` clean, all routes generated — last run: 2026-04-29
- [x] Four straggler greps return zero matches (`@frontend/lib/interfaces`, `data-access/(gql|spc)-<entity>`, `lib/rsc/fetchers`, `lib/services/ServiceFactory`)
- [x] Stale path sweep across `.claude/architect/`, `.claude/rules/`, ADR-0019 — Eric 3rd-pass adversarial sweep 2026-04-30 returned only intentional historical annotations
- [x] PR description up to date — PR #1951 opened with full narrative body
- [x] Build passes — confirmed clean by Clove (2026-04-29); build skipped by Briar — confirmed clean by prior skill
- [x] All review issues resolved — all Eric findings across three passes confirmed fixed in source

**Last updated:** 2026-04-30
