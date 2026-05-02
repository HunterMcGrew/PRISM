# Plan: Frontend Test Coverage to 50%

## Ticket

- **Epic:** [THR-1536](https://linear.app/tractru/issue/THR-1536/epic-frontend-test-coverage-to-50percent)
- **Story 1 (config + utilities):** [THR-1537](https://linear.app/tractru/issue/THR-1537/coverage-config-cleanup-utility-function-tests) — 3 pts
- **Story 2 (services):** [THR-1538](https://linear.app/tractru/issue/THR-1538/coverage-service-tests-expand-existing) — 5 pts
- **Story 3 (hooks):** [THR-1539](https://linear.app/tractru/issue/THR-1539/coverage-hook-tests) — 3 pts
- **Story 4 (infra):** [THR-1540](https://linear.app/tractru/issue/THR-1540/coverage-infrastructure-tests-wp-search-forms) — 3 pts
- **Story 5 (targeted components):** [THR-1541](https://linear.app/tractru/issue/THR-1541/coverage-targeted-block-and-component-tests) — 5 pts
- **Story 6 (buffer):** [THR-1542](https://linear.app/tractru/issue/THR-1542/coverage-buffer-additional-block-and-component-tests) — 3 pts, backlog

## Goal

Raise frontend test coverage to 50% across all four metrics (statements, branches, functions, lines) through a combination of coverage configuration cleanup and targeted test writing.

---

## Current State

| Metric | Current | Covered/Total | Gap to 50% |
|--------|---------|---------------|-----------|
| Statements | 41.02% | 4,177/10,181 | 914 more |
| Branches | 37.09% | 2,375/6,403 | 827 more |
| Functions | 31.87% | 709/2,224 | 404 more |
| Lines | 41.03% | 3,941/9,603 | 861 more |

### After exclusions (Story 0)

| Metric | Adjusted | Covered/Total | Gap to 50% |
|--------|----------|---------------|-----------|
| Statements | 46.42% | 4,177/8,999 | 323 more |
| Branches | 37.09% | 2,375/6,403 | 827 more |
| Functions | 36.23% | 709/1,957 | 270 more |
| Lines | 46.80% | 3,941/8,421 | 270 more |

**Binding constraint: Branches (827 more needed, unaffected by exclusions)**

---

## User Stories

- As a developer, I want test coverage above 50% so that CI catches regressions in the most critical code paths before they reach production.
- As a team lead, I want the coverage denominator to reflect real testable code so that the metric is an honest measure of test quality.

---

## Decisions

- Exclude `components/gravity-forms/graphql.ts` from coverage — auto-generated types, 870 statements, 0 branches, 0 functions, no testable logic
- Exclude `lib/services/block/block-views.tsx` from coverage — pure `dynamic()` import wiring, 173 statements, 0 branches, 172 "functions" (arrow functions in dynamic calls)
- Exclude `lib/services/block/block-registry.ts` from coverage — block name → import map, 139 statements, 0 branches, 95 "functions"
- Target 80% recovery per file (realistic — some branches are defensive code that's hard to reach in unit tests)
- Stories are ordered by ROI: pure logic first, components/blocks last
- Each story is independently shippable and raises coverage incrementally
- Stories 0–5 are required to hit 50%. Story 6 provides buffer and can be deferred.

---

## Stories

### Story 0: Coverage Configuration
**Effort: 30 minutes | Impact: Statements 41% → 46.4%, Functions 31.9% → 36.2%**

Exclude non-testable files from coverage collection and bump the coverage threshold.

**Files to modify:**
- `frontend/jest.config.mjs` — add `coveragePathIgnorePatterns` and update `coverageThreshold`

**Tasks:**
1. Add to `jest.config.mjs`:
   ```js
   coveragePathIgnorePatterns: [
     "components/gravity-forms/graphql.ts",
     "lib/services/block/block-views.tsx",
     "lib/services/block/block-registry.ts",
   ],
   ```
2. Update `coverageThreshold` from 2% to current passing values (so it catches regressions going forward)
3. Run full test suite to verify no threshold failures

---

### Story 1: Utility Function Tests
**Effort: 2–3 days | Impact: Branches +151, Functions +39, Statements +202**
**14 significant files (most already have test files to expand)**

| File | Uncov Branches | Uncov Functions | Current % |
|------|---------------|-----------------|-----------|
| `lib/utilities/block-spacing-utilities.ts` | 54 | 4 | 50% |
| `lib/utilities/format-date.ts` | 12 | 2 | 73% |
| `lib/utilities/truncate-block-content.tsx` | 12 | 0 | 88% |
| `lib/utilities/transform-refinements.ts` | 10 | 3 | 0% |
| `lib/utilities/get-categories-tree.ts` | 9 | 2 | 8% |
| `lib/utilities/gallery-utilities.ts` | 8 | 0 | 74% |
| `lib/utilities/url-utilities.ts` | 8 | 3 | 89% |
| `lib/utilities/use-is-menu-overflowing.ts` | 8 | 5 | 0% |
| `lib/utilities/global-attributes.tsx` | 6 | 2 | 20% |
| `lib/utilities/handle-sharing.ts` | 6 | 4 | 0% |
| `lib/utilities/logging-utilities.ts` | 6 | 0 | 53% |
| `lib/utilities/card-pointer-sensor.ts` | 5 | 1 | 0% |
| `lib/utilities/string-utilities.ts` | 5 | 2 | 94% |
| `lib/utilities/type-guards.ts` | 2 | 11 | 46% |

**Approach:**
- Pure input → output functions. No DOM, no React, no mocking.
- Existing test patterns in `__tests__/url-utilities/`, `__tests__/string-utilities/`
- Start with `block-spacing-utilities` (54 branches, biggest single utility gap)
- `type-guards` has 11 uncovered functions — each is a one-liner boolean, fast to cover

---

### Story 2: Service Tests (Expand Existing)
**Effort: 3–4 days | Impact: Branches +233, Functions +117, Statements +356**
**17 files — all have existing test files to extend**

Priority files (top 7 by branch gap):

| File | Uncov Branches | Uncov Functions | Current % |
|------|---------------|-----------------|-----------|
| `lib/services/call-to-actions/CallToActionService.ts` | 55 | 32 | 7% |
| `lib/services/rental/RentalService.ts` | 33 | 13 | 11% |
| `lib/services/offer/OfferService.ts` | 30 | 17 | 38% |
| `lib/services/promotion/PromotionService.ts` | 24 | 8 | 63% |
| `lib/services/location/LocationService.ts` | 19 | 4 | 74% |
| `lib/services/page/PageService.ts` | 19 | 8 | 7% |
| `lib/services/equipment/EquipmentService.ts` | 16 | 7 | 55% |

Also includes: normalize-media mappers (3 files), composite-product mapper, equipment addons mapper, EventService, BlogPostService, ProductService, ServiceFactory.

**Approach:**
- Follow `OfferService.test.ts` pattern for mocking (Apollo mock, repo mocks, fixture data)
- Static mapper methods (`mapCtaDTO`, `mapPlacementDTO`) are pure transforms — test without mocks
- Async service methods need repo mocks but the pattern is established
- `ServiceFactory` has 11 uncovered functions — test each `create*Service()` method

---

### Story 3: Hook Tests
**Effort: 2–3 days | Impact: Branches +133, Functions +41, Statements +148**
**6 significant files**

| File | Uncov Branches | Uncov Functions | Current % |
|------|---------------|-----------------|-----------|
| `single-templates/single-product/hooks/use-composite-product.ts` | 44 | 23 | 0% |
| `hooks/use-image-placeholder.ts` | 34 | 1 | 75% |
| `hooks/use-contact-ctas.tsx` | 19 | 4 | 0% |
| `components/header/hooks/useCTAAction.ts` | 14 | 4 | 0% |
| `hooks/use-modal-state.ts` | 14 | 6 | 11% |
| `hooks/use-router.ts` | 8 | 3 | 0% |

**Approach:**
- Use `renderHook` from `@testing-library/react`
- `use-composite-product` is the biggest — 23 functions, likely a product config state machine. Use fixture data from `__fixtures__/`.
- `use-image-placeholder` already at 75% — just needs edge case branches (34 uncovered)
- `use-modal-state` already at 11% — needs open/close/toggle paths tested

---

### Story 4: Infrastructure Tests (WP, Search, Forms)
**Effort: 2–3 days | Impact: Branches +168, Functions +29, Statements +106**
**9 significant files**

| File | Uncov Branches | Uncov Functions | Current % |
|------|---------------|-----------------|-----------|
| `lib/wp/functions/get-site-globals.ts` | 54 | 7 | 24% |
| `lib/forms/populate-form-fields.ts` | 36 | 0 | 89% |
| `lib/wp/functions/get-theme-properties.ts` | 20 | 4 | 0% |
| `lib/search/get-refinements-and-sort-options.ts` | 19 | 7 | 0% |
| `lib/search/seo-friendly-router.ts` | 15 | 2 | 91% |
| `lib/search/create-search-client.ts` | 7 | 1 | 0% |
| `lib/forms/fetch-form.ts` | 6 | 5 | 71% |
| `lib/wp/functions/get-menu-link.ts` | 6 | 1 | 0% |
| `lib/wp/connector.ts` | 5 | 2 | 47% |

**Approach:**
- `get-site-globals` and `populate-form-fields` account for 90 branches between them
- `get-site-globals` needs GraphQL mock and null-handling branches
- `populate-form-fields` already at 89% — just needs edge cases for 36 remaining branches
- `seo-friendly-router` already at 91% — small branch gaps

---

### Story 5: Targeted Block & Component Tests (Close the Gap)
**Effort: 3–4 days | Impact: Branches +195, Functions +78, Statements +214**
**5 files — selected specifically to close the branches and functions gap**

| File | Uncov Branches | Uncov Functions | Current % |
|------|---------------|-----------------|-----------|
| `components/hero-carousel/HeroCarouselSlideCTA.tsx` | 89 | 7 | 12% |
| `blocks/button-group-item/ButtonGroupItemBlock.tsx` | 61 | 3 | 0% |
| `components/site-search/Autocomplete.tsx` | 51 | 26 | 0% |
| `components/specs-and-compare/SpecsAndCompare.tsx` | 41 | 23 | 0% |
| `components/gravity-forms/GravityFormsFields/GravityFormsField.tsx` | 2 | 39 | 0% |

**Approach:**
- `HeroCarouselSlideCTA` has 89 uncovered branches — the single biggest branch gap. It's a CTA renderer with many conditional paths (link type, modal type, phone vs email).
- `ButtonGroupItemBlock` has 61 branches — conditional rendering based on button variant props
- `Autocomplete` is the search autocomplete — 51 branches, 26 functions. Complex but user-critical.
- `SpecsAndCompare` has 23 uncovered functions — each is a column/row renderer
- `GravityFormsField` has 39 uncovered functions — field type switch/dispatch. Each field type is a function.
- All need RTL setup with appropriate mocking (Next.js router, Algolia, etc.)

---

### Story 6 (Buffer): Additional Block & Component Tests
**Optional — provides margin if Stories 1–5 come in under 80% recovery**

Top candidates if needed:

| File | Uncov Branches | Uncov Functions |
|------|---------------|-----------------|
| `blocks/dealer-announcement-carousel/DealerAnnouncementCarouselBlock.tsx` | 52 | 3 |
| `blocks/kronos-search/hits/Hits.tsx` | 48 | 6 |
| `components/mega-menu/panes/.../EquipmentNavigationPane.tsx` | 44 | 9 |
| `components/button/ButtonGroup.tsx` | 40 | 12 |
| `components/gravity-forms/GfForm.tsx` | 38 | 9 |
| `blocks/modal/ModalBlock.tsx` | 36 | 9 |
| `blocks/site-header/MobileMegaMenu.tsx` | 36 | 14 |

---

## Projected Outcome (at 80% recovery per file, with exclusions)

| Metric | Current | After All Stories | Target |
|--------|---------|-------------------|--------|
| Statements | 46.4% | ~58% | 50% ✓ |
| Branches | 37.1% | ~50.4% | 50% ✓ |
| Functions | 36.2% | ~51.1% | 50% ✓ |
| Lines | 46.8% | ~58.2% | 50% ✓ |

---

## Sequencing

```
Story 0 (config)          ████  (30 min)
Story 1 (utilities)       ████████████  (2-3 days)
Story 2 (services)        ████████████████  (3-4 days)
Story 3 (hooks)           ████████████  (2-3 days)
Story 4 (infra)           ████████████  (2-3 days)
Story 5 (targeted comps)  ████████████████  (3-4 days)
                          ─────────────────────────────
                          Total: ~3-4 weeks
```

Stories 1–4 can be worked in parallel by different developers. Story 5 can start anytime but is only needed to close the final branch/function gap.

---

## History

- 2026-04-07: Epic plan created. Analyzed coverage-summary.json — identified binding constraint (branches at 827 gap), categorized all 465 uncovered files, built 6-story breakdown.
- 2026-04-07: Linear tickets created. Epic THR-1536 (Todo, assigned). Children THR-1537–THR-1542 (Backlog). Story 0 folded into Story 1.

---

## Debugged Issues

(none)

---

## Review Issues

(none)

---

## Acceptance Criteria

### Behavioral
- [ ] Given the full test suite runs, When coverage is reported, Then all four metrics (statements, branches, functions, lines) are at or above 50%
- [ ] Given `graphql.ts`, `block-views.tsx`, and `block-registry.ts` are excluded from coverage, When the test suite runs, Then those files do not appear in the coverage report
- [ ] Given the coverage threshold is updated in `jest.config.mjs`, When a PR reduces coverage below 50%, Then CI fails the test step

### Non-behavioral
- [ ] No existing tests are deleted or weakened
- [ ] Test files follow established patterns (colocated `__tests__/`, fixtures from `__fixtures__/`)
- [ ] Each story is independently shippable — partial completion still raises coverage

---

## Cleanup Items

(none)

---

## PR Readiness

- [ ] No critical or major issues
- [ ] Types correct — no `any`, no unsafe `as`
- [ ] No stray console.logs or debug artifacts
- [ ] Tests written for new logic and edge cases
- [ ] All debugged issues resolved (no `open` entries)
- [ ] Build passes
- [ ] PR description up to date

**Last updated:** 2026-04-07
