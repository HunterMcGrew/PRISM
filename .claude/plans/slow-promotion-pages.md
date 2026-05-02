# Plan: slow-promotion-pages

## Ticket

THR-1778

## Goal

Bring promotion detail page (`/promotions/<slug>`) RSC time in line with other detail templates (sub-1s on production), down from the observed 4-6s on missionvalleykubota.com.

---

## Debugged Issues

### Promotion detail pages render in 4-6s vs sub-1s on comparable routes

- **Status:** `fixed`
- **Fixed in:** `frontend/single-templates/single-promotion/fetchers.ts` (cache wrap), `frontend/single-templates/Promotion.tsx` (Promise.all + early-return on expiry)
- **Severity:** High
- **Environment:** Production (missionvalleykubota.com); confirmed across `/promotions/fire-extinguisher-2-5-lb`, `/promotions/weather-guard-toolbox-model-524-5-02`, `/promotions/l3560hst-package`. Product detail and homepage on the same site are sub-1s.
- **File:** `frontend/single-templates/single-promotion/fetchers.ts` (primary), `frontend/single-templates/Promotion.tsx:42-46` (secondary)
- **Root cause:** Multi-cause, in priority order:
  1. **`fetchRelatedPromotionsCards` is the only uncached supplementary fetch** unique to the promotion render path. It calls `PromotionService.getItemsByCategoryId` → `repo.getItemsByCategoryId` → `client.query(GET_PROMOTIONS_BY_CATEGORY)`, which goes straight to Apollo with `fetchPolicy: "no-cache"` (`frontend/lib/wp/connector.ts:62`) and is not wrapped in `unstable_cache`. Every promotion render hits WP cold for up to 9 full promo DTOs (PROMOTION_BASE_FIELDS — featuredImage, gallery, financing, categories). Equipment and rental fetchers wrap their analogous calls in `cache(unstable_cache(...))`; promotion does not.
  2. `Promotion.tsx:42-46` runs `fetchRelatedPromotionsCards` and `fetchCallToActions` sequentially, even though they are independent. One round-trip of dead air per render.
  3. `Promotion.tsx:49-61` runs the active/expired short-circuit *after* the fetches, so expired or unstarted promos still pay the full fetch cost.
  4. (Marginal) `fetchRelatedPromotionsCards` (`fetchers.ts:51-71`) runs the full `PromotionService.dtoToPromotion` pipeline on 9 related promos and projects the result down to 4 fields for `SimpleCardProps`. Mostly synchronous CPU work — not the dominant cost — but unnecessary.

  **Note on what is *not* the cause** (corrected after colleague pushback):
  - `fetchCallToActions` is **not** uncached — `CallToActionService.getCTALists` wraps in `unstable_cache` at line 36-47, and both `getProductCTAs` and `getPromotionCTAs` route through it. Initial diagnosis incorrectly flagged this as a second uncached fetcher.
  - `fetchRouteData` correctly caches the main detail-page data (THR-1203 followup re-instated `unstable_cache` here). The slowness is in the supplementary template fetches, not the main route data.
- **Steps to Reproduce:**
  1. Visit `https://missionvalleykubota.com/promotions/fire-extinguisher-2-5-lb` (or any other live promotion page) cold (cleared cache / new region edge).
  2. Open Network → Document → time the RSC payload.
  3. Compare against `https://missionvalleykubota.com/product/kubota/tractor-4wd/KT5511/kt5511-l3560hst-2/overview` and `https://missionvalleykubota.com/`.
- **Network evidence (2026-04-27, weather-guard-toolbox-model-524-5-02):**
  - `x-vercel-cache: MISS`, `age: 0` — response rendered fresh; the slow time is real RSC render time, not CDN miss penalty.
  - `cache-control: private, no-cache, no-store, max-age=0, must-revalidate` — Vercel CDN explicitly bypassed for `[...slug]`. This applies to all detail routes (not just promotions), so it doesn't explain the differential — but it confirms that data-layer caching (`unstable_cache`) is the only lever. No edge cache will absorb the cost.
  - `vary: rsc, next-router-state-tree, ...` — standard Next.js RSC.
  - `x-matched-path: /[...slug]` — confirms catch-all route.
- **Expected behavior:** Promotion detail RSC time comparable to product detail (<1s).
- **Actual behavior:** Promotion detail consistently 4-6s; product detail and homepage sub-1s.
- **Recommended fix:** In priority order:
  1. Wrap `fetchRelatedPromotionsCards` in `cache(unstable_cache(...))` matching the pattern in `frontend/single-templates/single-equipment/fetchers.ts`. Use a cache key that incorporates the promotion's last category id + `CACHE_VERSION`, and tags `[CONTENT_TYPES.PROMOTIONS]` so on-demand revalidation continues to work. (`fetchCallToActions` does not need wrapping — already cached via `getCTALists`.)
  2. Parallelize the independent awaits in `Promotion.tsx`:
     ```ts
     const [relatedPromotionsCards, ctas] = await Promise.all([
       fetchRelatedPromotionsCards(item, 8),
       fetchCallToActions(item),
     ]);
     const formsById = await fetchFormsForCTAs(
       [...ctas.primary, ...ctas.secondary],
       site.wpUrl
     );
     ```
  3. Move `PromotionService.isPromotionExpired` / `hasPromotionStarted` checks above the data fetches so non-displayable promos short-circuit before paying fetch cost.
  4. Add a lightweight `dtoToPromotionCard` mapper that emits only `{title, subtitle, detailPage, uri}` to avoid running the full DTO mapping pipeline for related-card data.
- **Suggested tests:**
  - Update `frontend/single-templates/single-promotion/__tests__/` (or add) to verify the cache-wrapped fetchers are invoked through `unstable_cache` and dedupe within a render via `cache`.
  - No behavioral test changes needed for the parallelization — existing render tests still apply.
  - Worth adding a perf-budget smoke test for top 5 single-template render paths (broader effort, separate ticket).
- **Linear:** `N/A`

---

## Decisions

- The systemic gap is that no rule mandates `cache(unstable_cache(...))` for fetchers in `frontend/single-templates/*/fetchers.ts`. The pattern is imitable code in equipment/rental but not codified — so promotion got missed. A new rule (or a section added to `.claude/rules/headless-architecture.md`) would prevent recurrence.
- Apollo `fetchPolicy: "no-cache"` + per-call `ApolloClient` construction in `ServiceFactory` is a separate architectural smell. Worth its own ticket — out of scope here, since the Next-layer cache is the more impactful lever for this bug.

---

## Regression Analysis

**Not a regression in the traditional sense — it's a missed retrofit.**

Timeline (from `git blame`):

- **2024-07-01 [`a6c03b96c` — Jonathan Motes / THR-538 (App Router/RSC migration)]** — `fetchRelatedPromotionsCards` was authored without `unstable_cache`. At the time, the cache pattern hadn't yet been standardized across detail-template fetchers.
- **2025-08-10 [`c95e702015` — Jonathan Motes / THR-1203 followup, "revert back to unstable cache" (#1234)]** — Established the `cache(unstable_cache(...))` pattern in `single-equipment/fetchers.ts`. This is the canonical pattern Sasha references.
- **2025-09-25 / 2025-09-26 [Brian McDaniel / THR-1266, THR-1274]** — Refactors to `fetchRelatedPromotionsCards` (sort/order params, count tweak) — but no cache wrapper added.
- **2026-02-23 / 2026-03-23 / 2026-03-26 [Robert Samuel, Jonathan Motes]** — Edits to `Promotion.tsx` template, including the sequential-await structure at lines 42-46. The waterfall pattern wasn't introduced or addressed.
- **2026-04-27 [Hunter / Jonathan, Slack DM]** — Bug surfaces visibly on missionvalleykubota.com. Empirically confirmed by removing related promotions on a staging test promo (instantly fast) vs. adding them back (instantly slow).

**Why it surfaced now and not earlier:**

The bug has existed since July 2024, but only causes user-visible slowness on promotions whose category has multiple siblings. Test promotions on staging typically don't have category siblings (one promo per category), so the slow path returns near-empty. Dealer sites like MVT have categorized promotions with siblings → 9 full promo DTOs come back uncached every render.

**Audit of sibling templates** (single-templates with their own fetchers or direct `ServiceFactory` calls):

| Template | Has fetcher / direct ServiceFactory call? | Cached? | Notes |
|---|---|---|---|
| `single-equipment/fetchers.ts` | yes — 3 fetchers | ✓ all wrapped in `cache(unstable_cache(...))` | Reference pattern (THR-1203 followup) |
| `single-rental/RentalLocation.tsx` | yes | ✓ wrapped | |
| `single-rental/RentalCTAs.tsx` | yes — `getRentalCTAs` | ✓ via `getCTALists` internal cache | False alarm in initial scan |
| `Product.tsx` | yes — `getProductCTAs` | ✓ via `getCTALists` internal cache | |
| **`single-promotion/fetchers.ts`** | **yes — `fetchRelatedPromotionsCards` (the bug)** | **✗ missing wrapper** | **The only outlier** |
| Other single-templates (offer, event) | no fetcher file — go through `fetchRouteData` only | ✓ via `fetchRouteData` | |

So this is the only instance of the bug. No additional secondary bugs surfaced in the audit.

---

## History

- 2026-04-27 [worktree-wondrous-tinkering-treehouse]: Sasha diagnosed slow promotion RSC pages. Root cause: uncached fetchers + sequential awaits + heavy DTO mapping for throwaway card data. Recorded recommended fix priorities; no Linear ticket yet.
- 2026-04-27 [worktree-wondrous-tinkering-treehouse]: Corrected diagnosis after colleague pushback. `fetchCallToActions` is *not* uncached (it routes through `getCTALists` which wraps in `unstable_cache`). The single uncached supplementary fetch is `fetchRelatedPromotionsCards` only. Fix priority list reduced from "wrap two fetchers" to "wrap one." Sequential await + early-return-on-expiry recommendations unchanged.
- 2026-04-27 [worktree-wondrous-tinkering-treehouse]: Empirically validated — Hunter and Jonathan confirmed in Slack that adding related promotions to a staging test promo immediately reproduces the slowness. Without related promos, render is fast. Confirms `fetchRelatedPromotionsCards` is the dominant cause.
- 2026-04-27 [worktree-wondrous-tinkering-treehouse]: Ran `git blame` on the fetcher and template. Not a regression — `fetchRelatedPromotionsCards` was authored 2024-07-01 (THR-538, App Router migration) without `unstable_cache`. The cache pattern was retrofitted onto `single-equipment/fetchers.ts` on 2025-08-10 (THR-1203 followup, #1234) but never applied to single-promotion. Audited all sibling single-templates — promotion is the only outlier.
- 2026-04-27 [hmcgrew/thr-1778-investigate-slow-ttfb-on-promotion-detail-pages]: Wrapped `fetchRelatedPromotionsCards` in `cache(unstable_cache(...))` (category-keyed), parallelized `fetchRelatedPromotionsCards` + `fetchCallToActions` via `Promise.all`, and hoisted `isPromotionExpired` / `hasPromotionStarted` checks above all awaits in `Promotion.tsx` so non-displayable promos short-circuit before fetch cost. Active / current-promotion filter intentionally lives outside the cache.
- 2026-04-27 [hmcgrew/thr-1778-investigate-slow-ttfb-on-promotion-detail-pages]: Codified the supplementary-fetcher cache rule per Winston's review. Added "Supplementary fetchers must be cached" to `.claude/rules/headless-architecture.md`, expanded the caching section in `.claude/architect/frontend-services.md` to cover single-template fetchers as a second valid `unstable_cache` location, and added a "Where data fetching can live" three-tier note to `.claude/architect/frontend-app.md`. The Apollo `fetchPolicy: "no-cache"` + per-call `ApolloClient` construction smell is deferred to its own ticket.

---

## Review Issues

### Variable shadowing in fetchRelatedPromotionsCards map callback

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `frontend/single-templates/single-promotion/fetchers.ts:70`
- **Problem:** `.map((promotion) => ...)` parameter name `promotion` shadows the outer `promotion: IPromotion` parameter. Pre-existing behavior carried from the original code; functionally correct because `.filter()` resolves the outer `promotion.id` before `.map()` runs. Could confuse future readers who see `promotion.subtitle` inside the map and assume it refers to the current page's promotion.
- **Fix:** Renamed map callback parameter to `relatedPromo`; updated all references inside the callback.

### No Storybook story for Promotion.tsx

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `frontend/single-templates/Promotion.tsx`
- **Problem:** `Promotion.tsx` was modified and has no `.stories.tsx` sibling. `Career.stories.tsx` and `Offer.stories.tsx` exist in the same directory, establishing the pattern.
- **Fix:** Created `frontend/single-templates/Promotion.stories.tsx` with four stories: `PromotionPage`, `PromotionWithFinancing`, `ExpiredPromotion`, `NotYetStartedPromotion`. Service methods mocked via `spyOn` following the Offer pattern.

### Eric PR review — 2026-04-27

- **Severity:** `none`
- **Status:** `n/a`
- No new critical, major, or minor issues. One non-blocking observation: the four stories all use `categories: []`, so the related-specials grid (the surface affected by the cache fix) doesn't render in any story. Future story addition opportunity if visual coverage of that section becomes valuable. Labels applied: `effort:quick`, `confidence:high`.

---

## Acceptance Criteria

### Behavioral

- [ ] Given a promotion page with sibling promotions in the same category, When a visitor loads the page cold, Then the page renders in under 2s (compared to the 4-6s baseline before this fix)
- [ ] Given two promotions in the same category loaded in the same render window, When both promotion pages are requested, Then only one WordPress round-trip is made for related promotions (shared cache entry)
- [ ] Given a promotion page, When the promotion is displayed, Then the "Other Related Specials" section does not include the current promotion or any expired/not-yet-started promotions
- [ ] Given an expired promotion, When a visitor loads the promotion page, Then the page immediately returns "No longer available" without making any fetch calls for related promotions or CTAs
- [ ] Given a not-yet-started promotion, When a visitor loads the promotion page, Then the page immediately returns "Not yet available" without making any fetch calls
- [ ] Given a promotion page with no category assigned, When a visitor loads the page, Then the "Other Related Specials" section is absent (empty array returns gracefully, no error)
- [ ] Given a CONTENT_TYPES.PROMOTIONS on-demand revalidation webhook fires, When the next promotion page is loaded, Then the related promotions cache is busted and fresh data is fetched from WordPress

### Non-behavioral

- [ ] `fetchRelatedPromotionsCards` and `fetchCallToActions` execute in parallel (not sequentially) for active promotions
- [ ] The "Supplementary fetchers must be cached" rule is present in `.claude/rules/headless-architecture.md`

### AC Sync Log

| Date | Agent | Action | Plan | Linear |
| ---- | ----- | ------ | ---- | ------ |
| 2026-04-27 | Briar | Initial AC from self-review | updated | N/A — no Linear ticket |

---

## PR Readiness

- [x] No critical or major issues — all Briar review issues resolved
- [x] Types correct — no `any`, no unsafe `as`
- [x] No stray console.logs or debug artifacts
- [ ] Tests written for new logic and edge cases — N/A; cache-wrapper invocation is implementation-detail testing per `behavior-not-implementation`. Behavior preserved (filter still excludes self + inactive promos) and covered by manual QA against the staging test promo.
- [x] All debugged issues resolved (no `open` entries)
- [x] Build passes — last run: 2026-04-27 (`pnpm --filter=next-frontend run build` ✓ Compiled successfully in 24.1s, all 8 pages generated)
- [x] PR description up to date

**Last updated:** 2026-04-27
