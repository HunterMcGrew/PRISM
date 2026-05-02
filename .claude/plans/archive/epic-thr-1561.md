# Plan: epic-thr-1561

## Ticket

https://linear.app/tractru/issue/THR-1561/address-dependabot-security-alerts-dependency-updates

## Goal

Resolve all fixable Dependabot security alerts by updating direct dependencies, upgrading dev tooling, and adding pnpm overrides for stuck transitive deps — without crossing into React 19 territory.

---

## Stories

| Ticket | Title | Priority | Depends On |
|--------|-------|----------|------------|
| THR-1562 | Direct production dependency updates (axios, next) | High | — |
| THR-1563 | Storybook 10.3 update | Medium | THR-1562 |
| THR-1611 | pnpm overrides for Critical alerts (handlebars, basic-ftp) | High | THR-1562, THR-1563 |
| THR-1564 | pnpm overrides for stuck transitive dependencies (remaining Highs/Mediums) | Medium | THR-1611 |
| THR-1565 | @wordpress/scripts update | Medium | — (independent) |
| THR-1566 | Final security audit and documentation | Low | THR-1562–1565, THR-1611 |
| THR-1567 | Investigate isomorphic-dompurify upgrade path (jsdom v27 / Vercel compat) | Medium | Related: THR-1412 |

---

## Decisions

- React 19 is blocked until WordPress 7 — all updates must stay within current major version ranges. This means Next.js 16 and @apollo/experimental-nextjs-app-support major updates are off the table.
- isomorphic-dompurify is pinned at 2.26.0 to avoid jsdom v27, which breaks Vercel builds (commit beddd88c6). Bumping it is a separate investigation (THR-1567), potentially unblocked by Node.js 24 (THR-1412).
- Storybook uses its own upgrade CLI (`npx storybook@latest upgrade`), not manual package.json edits — this handles cross-package version alignment.
- Storybook 10.3 auto-migrated from `@storybook/nextjs` (webpack) to `@storybook/nextjs-vite` (Vite). This eliminated webpack-dev-server and node-forge from the frontend dep tree.
- Keeping `@storybook/test-runner` (Playwright-based) over `@storybook/addon-vitest` — Playwright E2E testing is coming soon, so the browser infrastructure is already a sunk cost. Adding Vitest would mean maintaining two test runtimes (Jest + Vitest) for no clear gain. Revisit only if test-runner becomes a bottleneck.
- Dropped both `storybook-addon-module-mock` (webpack) and `storybook-addon-vite-mock` — replaced with `spyOn` from `storybook/test` + `beforeEach`. Built-in, bundler-agnostic, zero dependency.
- `getMockSiteGlobals()` fixture defaults to `useCache: false` so resolvers skip `unstable_cache` (server-only) and call services directly. No custom `viteFinal` alias or mock files needed. All resolvers must check `site.policy.useCache` before calling `unstable_cache` (THR-1571 fixed the navigation resolver to match this pattern).
- pnpm overrides used for stuck transitive deps where direct parent packages haven't updated — each override must include an inline comment with the Dependabot alert number(s) it addresses.
- Stories are ordered by production risk: direct prod deps first (critical axios SSRF), dev-only tooling second, overrides third — each story measures incremental impact before the next begins.
- Each story ships as a separate PR for isolated review and rollback.
- Dev-only "Critical" Dependabot alerts warrant patching but not emergency-scope PRs — CVSS scores reflect exploit severity, not our exposure. Verify actual dependency chain (`pnpm why <pkg>`) before classifying urgency.
- Criticals split out of THR-1564 into THR-1611 — smaller blast radius ships faster and clears dashboard signal, consistent with the epic's one-concern-per-PR pattern. THR-1611 establishes the `pnpm.overrides` pattern in root package.json; THR-1564 inherits and extends it.
- basic-ftp `runtime` scope label in GitHub UI is npm-metadata, not actual production exposure — it reaches us via `@puppeteer/browsers` which is dev-only.

---

## Alert Inventory (baseline: 2026-04-12)

### By severity
| Severity | Count |
|----------|-------|
| Critical | 3 |
| High | 30 |
| Medium | 19 |
| Low | 4 |
| **Total** | **56** |

### Direct production dependencies
| Alert # | Package | Severity | Current | Fix Version | Story |
|---------|---------|----------|---------|-------------|-------|
| #187 | axios | Critical | 1.13.5 | 1.15.0 | THR-1562 |
| #148 | dompurify | Medium | 2.x | 3.3.1+ (via isomorphic-dompurify 2.36.0) | THR-1567 |
| #176 | dompurify | Medium | 2.x | 3.3.1+ | THR-1567 |
| #181 | dompurify | Medium | 2.x | 3.3.1+ | THR-1567 |
| #182 | dompurify | Medium | 2.x | 3.3.1+ | THR-1567 |
| #153 | next | Medium | 15.5.12 | 15.5.15 | THR-1562 |
| #155 | next | Medium | 15.5.12 | 15.5.15 | THR-1562 |

### Transitive dev dependencies (Storybook / build tooling)
| Alert #(s) | Package | Severity | Current | Fix Version | Story |
|-----------|---------|----------|---------|-------------|-------|
| #163, #164, #165, #166, #167 | handlebars | Critical+High | 4.7.8 | 4.7.9 | THR-1563/1564 |
| #162, #178, #177 | handlebars | Medium+Low | 4.7.8 | 4.7.9 | THR-1563/1564 |
| #168, #169, #170, #171 | node-forge | High | 1.3.3 | 1.4.0 | THR-1563/1564 |
| #184, #183 | lodash | High+Medium | 4.17.23 | 4.18.0 | THR-1564 |
| #179, #180 | lodash-es | High+Medium | 4.17.23 | 4.18.0 | THR-1564 |
| #134, #136, #137, #140, #141, #142, #143, #145, #146 | minimatch | High | various | >=3.1.2 | THR-1564 |
| #156, #157, #159, #160 | picomatch | High+Medium | various | >=2.3.2 | THR-1564 |
| #185, #186 | vite | High+Medium | various | >=6.4.2 | THR-1563/1564 |
| #152, #154 | flatted | High | various | TBD | THR-1564 |
| #149 | immutable | High | various | TBD | THR-1564 |
| #150 | svgo | High | various | TBD | THR-1564 |
| #147, #174 | serialize-javascript | High+Medium | various | TBD | THR-1564 |
| #172, #173 | brace-expansion | Medium | various | TBD | THR-1564 |
| #130, #132 | ajv | Medium | various | TBD | THR-1564 |
| #133, #135 | bn.js | Medium | various | TBD | THR-1564 |
| #158 | yaml | Medium | various | TBD | THR-1564 |
| #113, #114 | webpack-dev-server | Medium | 4.15.2 | TBD | THR-1563/1564 |
| #175 | path-to-regexp | High | various | >=0.1.13 | THR-1564 |
| #144 | rollup | High | various | TBD | THR-1564 |
| #139 | storybook | High | various | 10.3.x | THR-1563 |
| #188, #138 | basic-ftp | High+Critical | various | >=5.2.2 | THR-1564 |

### Other
| Alert # | Package | Severity | Ecosystem | Notes |
|---------|---------|----------|-----------|-------|
| #127 | firebase/php-jwt | Low | Composer | Transitive PHP dep — investigate source |
| #115 | elliptic | Low | npm | Build-time crypto — no exploit path |
| #123, #124 | diff | Low | npm | Build-time — DoS in parsePatch |

### Blocked until React 19 / WP 7
- Next.js 16 (alerts #153, #155 may persist if 15.5.15 doesn't fully resolve)
- @apollo/experimental-nextjs-app-support major update
- @next/bundle-analyzer, @next/third-parties (16.x only for latest)

---

## Implementation Tasks

### THR-1562: Direct production dependency updates (axios, next)
1. `pnpm update axios` — resolves 1.13.5 → 1.15.0 within ^1.13.5 range
2. `pnpm update next @next/bundle-analyzer @next/third-parties` — resolves to 15.5.15
3. `pnpm install` to regenerate lockfile
4. Run full frontend build (`pnpm build`)
5. Run test suite (`pnpm test`)
6. Run `gh api repos/TracTru/thrive/dependabot/alerts` to count remaining alerts
7. Create PR, note which alerts should auto-close

### THR-1563: Storybook 10.3 update
1. Run `npx storybook@latest upgrade` from the frontend directory
2. Manually verify @chromatic-com/storybook, eslint-plugin-storybook, @storybook/test-runner versions
3. Run `pnpm build-storybook` to verify build
4. Spot-check stories in dev server
5. Run Storybook test runner if available
6. Check which transitive alerts (handlebars, node-forge, picomatch) resolved
7. Create PR, note cascading alert closures

### THR-1564: pnpm overrides
1. Check which alerts remain after THR-1562 and THR-1563 merge
2. Add `pnpm.overrides` to root package.json for each remaining package
3. Add inline comments mapping each override to Dependabot alert numbers
4. `pnpm install` to regenerate lockfile
5. Run full build across all workspaces
6. Run all test suites
7. Verify overridden versions resolve correctly: `pnpm why <package>`
8. Create PR

### THR-1565: @wordpress/scripts update
1. Update @wordpress/scripts in backend/plugins/gravity-platform-core/package.json (31.4.0 → 31.8.0)
2. `pnpm install` in workspace
3. Rebuild all blocks
4. Run Pest PHP tests
5. Spot-check block editor UIs in wp-admin (if environment available)
6. Create PR

### THR-1566: Final audit and documentation
1. Run `pnpm audit` for final count
2. Run `gh api repos/TracTru/thrive/dependabot/alerts` to compare before/after
3. Dismiss dev-only alerts with no exploit path via Dependabot UI
4. Update this plan with final alert counts and status
5. Document React 19 blockers in this plan's Decisions section
6. Close the epic

---

## Acceptance Criteria

### Behavioral
- [ ] Given the frontend application is built after all stories merge, When a user navigates any page, Then all pages render correctly with no regressions
- [ ] Given a developer runs the Storybook dev server after THR-1563, When browsing component stories, Then all stories render without errors
- [ ] Given a developer runs the Jest test suite after each story, When tests execute, Then all existing tests pass without modification
- [ ] Given a developer opens the block editor in wp-admin after THR-1565, When editing any block, Then all block editor UIs render correctly

### Non-behavioral
- [ ] axios resolves to >= 1.15.0 in the lockfile
- [ ] Next.js resolves to latest 15.5.x patch (15.5.15)
- [ ] All Storybook packages are at 10.3.x
- [ ] No critical or high severity alerts remain for production dependencies
- [ ] pnpm overrides are documented with inline comments explaining each
- [ ] No pnpm override forces a version across a major version boundary
- [ ] Alerts blocked by React 19 are documented in this plan

### AC Adjustments

### AC Sync Log

| Date | Agent | Action | Plan | Linear |
|------|-------|--------|------|--------|

---

## History

- 2026-04-12 [main]: Epic plan created — address 56 Dependabot alerts via targeted dependency updates across 5 stories
- 2026-04-12 [main]: Created Linear epic THR-1561 with child stories THR-1562 through THR-1566
- 2026-04-12 [main]: Spun isomorphic-dompurify out to THR-1567 — pinned at 2.26.0 due to jsdom v27 breaking Vercel builds (commit beddd88c6). Linked to THR-1412 (Node.js 24)
- 2026-04-12 [jmotes/thr-1562-thr-1561-direct-production-dependency-updates-axios-next]: Updated axios 1.13.5→1.15.0 (critical SSRF fix), next 15.5.12→15.5.15 (2 medium alerts), @next/bundle-analyzer + @next/third-parties to 15.5.15, docs workspace next to 15.5.15. Build and all 1552 tests pass.
- 2026-04-12 [jmotes/thr-1562-thr-1561-direct-production-dependency-updates-axios-next]: Briar self-review — clean sweep, no issues. PR #1749 ready for human review.
- 2026-04-12 [jmotes/thr-1562-thr-1561-direct-production-dependency-updates-axios-next]: Bumped eslint-config-next 15.5.12→15.5.15 to match next version (Briar review issue). Build and tests pass.
- 2026-04-12 [jmotes/thr-1562-thr-1561-direct-production-dependency-updates-axios-next]: Eric PR review — one minor issue: root package.json eslint-config-next not bumped to match. Otherwise clean.
- 2026-04-12 [jmotes/thr-1562-thr-1561-direct-production-dependency-updates-axios-next]: Bumped root eslint-config-next and @next/eslint-plugin-next from ^15.5.12 to ^15.5.15 (Eric review issue). Both resolve to 15.5.15.
- 2026-04-12 [jmotes/thr-1563-storybook-103-update]: Upgraded Storybook 10.2.8→10.3.5 via CLI. Auto-migrated from @storybook/nextjs (webpack) to @storybook/nextjs-vite (Vite 7.3.2). Converted webpackFinal to viteFinal for next/cache mock. Updated ~100 story files (@storybook/nextjs → @storybook/nextjs-vite imports). Companion packages: @chromatic-com/storybook 5.1.1, eslint-plugin-storybook 10.3.5, test-runner 0.24.3, addon-coverage 3.0.1, addon-styling-webpack 3.0.2. Storybook build and all 1552 Jest tests pass. Resolved alerts: node-forge (#168–171), vite (#185–186), webpack-dev-server (#113–114), storybook (#139) — 9 alerts cleared from frontend tree.
- 2026-04-12 [jmotes/thr-1563-storybook-103-update]: Removed dead @storybook/addon-styling-webpack (no-op under Vite). Updated architect context.
- 2026-04-12 [jmotes/thr-1563-storybook-103-update]: Fixed phantom `util` dependency — backend build broke because `util` was a transitive dep of Storybook's webpack chain, pruned by the Vite migration. Added as explicit devDep of gravity-platform-core.
- 2026-04-12 [jmotes/thr-1563-storybook-103-update]: Replaced storybook-addon-module-mock with spyOn + beforeEach. The webpack mock addon is incompatible with Vite; the Vite replacement (storybook-addon-vite-mock) doesn't support class prototype mocking. Built-in spyOn from storybook/test works with any bundler. 4 stories updated (Promotions, Employees, Navigation, Offer).
- 2026-04-12 [jmotes/thr-1563-storybook-103-update]: Fixed type-only imports — 24 story files used value imports for Meta/StoryObj instead of `import type`.
- 2026-04-12 [jmotes/thr-1563-storybook-103-update]: Resolved unstable_cache failures in Storybook tests. Stories that render through BlocksRenderer now set `site.policy.useCache = false` in beforeEach to bypass server-only unstable_cache. Custom next-cache.ts mock restored via viteFinal alias (framework's default stub returns undefined). 343/344 tests pass — Navigation blocked on THR-1571 (resolver doesn't check useCache).
- 2026-04-13 [jmotes/thr-1563-storybook-103-update]: Fixed two Eric PR review issues — DefaultTemplate.tsx type-only import, architect context react-docgen reference.
- 2026-04-16 [main]: Re-evaluated remaining epic stories against current Dependabot state (54 open: 2 Critical, 28 High, 20 Medium, 4 Low). Traced both Criticals to dev-only chains (handlebars via ts-jest, basic-ftp via @puppeteer/browsers). Split Criticals out into new story THR-1611 for fast surgical ship; THR-1564 retains the larger remaining sweep.

---

## Debugged Issues

### gravity-platform-core build fails — Cannot find module 'util/'
- **Status:** `fixed`
- **Severity:** Critical
- **Environment:** CI (GitHub Actions), reproducible locally
- **File:** `backend/plugins/gravity-platform-core/webpack.config.js:51`
- **Root cause:** `util` (Node.js browser polyfill) was a phantom transitive dependency — never explicitly declared but resolved through Storybook's webpack builder chain. The Storybook 10.3 webpack→Vite migration pruned it from the lockfile.
- **Fixed in:** `pnpm add -D util --filter gravity-platform-core` — backend build passes
- **Steps to Reproduce:**
  1. Apply the Storybook 10.3 upgrade (branch jmotes/thr-1563-storybook-103-update)
  2. Run `pnpm build` or `cross-env IS_BACKEND=true wp-scripts build` in gravity-platform-core
  3. Build fails: `Cannot find module 'util/'`
- **Expected behavior:** Backend plugin build succeeds
- **Actual behavior:** webpack.config.js fails to load — `require.resolve("util/")` throws MODULE_NOT_FOUND
- **Recommended fix:** `pnpm add -D util --filter gravity-platform-core` — makes the dependency explicit
- **Suggested tests:** CI build pipeline already covers this; the fix is a dependency declaration, not logic
- **Linear:** `not synced`

---

## Review Issues

### eslint-config-next not updated with next
- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `frontend/package.json:98`
- **Problem:** `next` was bumped to 15.5.15 but `eslint-config-next` was not updated to match — these should stay in sync.
- **Suggested fix:** `pnpm update eslint-config-next --filter next-frontend`
- **Fixed in:** second commit on THR-1562 branch

### Root eslint-config-next not updated with next
- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `package.json` (root)
- **Problem:** Root `package.json` has `eslint-config-next: "^15.5.12"` while frontend was bumped to `"^15.5.15"`. Root ESLint config (`eslint.config.mjs:42`) extends `next/core-web-vitals` from this package. Lockfile pins root to 15.5.12.
- **Suggested fix:** `pnpm update eslint-config-next` from repo root, or manually bump specifier to `"^15.5.15"` and re-run `pnpm install`.
- **Fixed in:** third commit on THR-1562 branch — also bumped `@next/eslint-plugin-next` to match

### Stale @storybook/nextjs references in architect context
- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `.claude/architect/frontend-stories.md:23,53,56,64,107`
- **Problem:** Five references still say `@storybook/nextjs` or "webpack overrides" after the Vite migration. Line 23: config table says "webpack overrides". Lines 53, 56, 64, 107: code examples use `@storybook/nextjs` import path.
- **Suggested fix:** Replace with `@storybook/nextjs-vite` and "Vite overrides" respectively.

### DefaultTemplate.tsx value import for type-only symbols
- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `frontend/.storybook/DefaultTemplate.tsx:3`
- **Problem:** Imports `StoryContext`, `StoryFn`, `StoryObj` as runtime values but they are only used as type annotations. The PR fixed 24 story files for this exact issue but missed this file.
- **Suggested fix:** Change to `import type { StoryContext, StoryFn, StoryObj } from "@storybook/nextjs-vite";`
- **Fixed in:** Eric review fix commit on THR-1563 branch

### Stale react-docgen-typescript reference in architect context
- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `.claude/architect/frontend-stories.md:44`
- **Problem:** Says `react-docgen-typescript` but the config now uses `react-docgen` (switched in commit d082efb1a).
- **Suggested fix:** Update to `react-docgen`.
- **Fixed in:** Eric review fix commit on THR-1563 branch

---

## Cleanup Items

(none)

---

## PR Readiness

### THR-1562 (PR #1749)
- [x] No critical or major issues
- [x] No source code changes — dependency bumps only
- [x] No stray console.logs or debug artifacts
- [x] Tests pass — 201 suites, 1552 tests
- [x] Build passes — Next.js 15.5.15, compiled clean
- [x] PR description up to date

**Build**: ✅ Passed
**Last updated:** 2026-04-12

### THR-1563 (PR #1750)
- [x] No critical or major issues
- [x] No stray console.logs or debug artifacts
- [x] Types pass — `tsc --noEmit` clean
- [x] Jest tests pass — 201 suites, 1552 tests
- [x] Storybook build passes — 10.3.5 with Vite 7.3.2
- [x] Storybook tests — 344/344 passing locally
- [x] Architect context fully updated
- [x] PR description up to date
- [x] No stale references (mock addons, viteFinal, dead video URLs)

**Build**: ✅ Passed (Storybook build + Jest + tsc + test-storybook 344/344)
**Last updated:** 2026-04-13 (Briar follow-up review)
