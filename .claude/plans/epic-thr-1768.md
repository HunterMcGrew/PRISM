# Plan: epic-ci-build-optimization

## Ticket

- **Parent epic:** [THR-1768 — CI/Build Optimization Epic](https://linear.app/tractru/issue/THR-1768/cibuild-optimization-epic)
- **Precursor:** [THR-1769 — Publish thrive-admin-base to GHCR](https://linear.app/tractru/issue/THR-1769/publish-thrive-admin-base-to-ghcr-precursor-to-ci-build-optimization)
- **Story 1:** [THR-1770 — CI: Quick wins in build.yml](https://linear.app/tractru/issue/THR-1770/ci-quick-wins-in-buildyml-tier-1-of-ci-build-optimization)
- **Story 2:** [THR-1771 — CI: Docker layer caching for docker-compose-build](https://linear.app/tractru/issue/THR-1771/ci-docker-layer-caching-for-docker-compose-build-tier-2-of-ci-build)
- **Story 3:** [THR-1772 — CI: Admin base image split](https://linear.app/tractru/issue/THR-1772/ci-admin-base-image-split-tier-3-of-ci-build-optimization) — *blocked by THR-1769 until precursor merges and v1.0.0 base image is published*

## Goal

Cut PR validation build time from ~10 min to ~3 min by gating dead work, caching Playwright, switching the Docker build to use BuildKit layer cache, reordering Dockerfile layers, and extracting stable Dockerfile.admin tooling into a published base image.

---

## Preservation Constraints

This work is **purely additive optimization** — no existing behavior is removed or replaced. Explicit preservation list:

- **`docker-compose.yml` is not touched.** Service definitions, env_file directives, healthchecks (`admin`, `db`), networks, volumes, OrbStack labels, depends_on conditions — all unchanged. Local `docker compose up` works identically before and after.
- **Runtime env vars are unchanged.** `.env` files used by services at runtime continue to flow through the existing `env_file: ./.env` directive in `docker-compose.yml`. CI changes only affect *build-time* arg passing.
- **Build args (`ACF_PRO_KEY`, `GRAVITY_FORMS_KEY`, `PACKAGES_TOKEN`, storage account vars, `HOST_UID`/`HOST_GID`) are preserved.** Story 2 passes them via `docker/build-push-action`'s `build-args:` block — same values, different transport.
- **Healthchecks for `admin` and `db` services live in `docker-compose.yml`, not in Dockerfiles.** Since this work only edits Dockerfiles and `.github/workflows/build.yml`, healthchecks are out of scope and untouched.
- **`Dockerfile.frontend.local` (the dev hot-reload image) is left alone.** It already follows the layered-copy pattern correctly (lines 23-31). No change needed.
- **All current secrets and `vars` references in `build.yml` carry over verbatim.** Stories 2 and 3 reference the same `secrets.ACF_PRO_KEY`, `secrets.GRAVITY_FORMS_KEY`, etc. that the current job uses.
- **`plugin-tests` job is out of scope.** PHP unit and integration tests run there, untouched.
- **`docker-publish.yml` is out of scope** for this epic. It's a manual workflow that publishes the full admin image; it stays as-is. (See Open Question #2 — may be revisited later.)

When in doubt during implementation: if a change isn't explicitly listed in an Implementation Task, do not make it.

---

## Shipping Strategy — Stacked PRs into a "Last Boss" integration PR

Each story gets its **own PR for review** — but the base of each story PR is the long-lived integration branch `hmcgrew/thr-1768-ci-build-optimization` ("Last Boss"), not `main`. The Last Boss branch carries its own PR that targets `main` and accumulates the merged stories. Only the Last Boss PR merges to `main`.

**Why this shape:** independent review per story (small, scoped diffs reviewers can actually read) plus a single integration PR where the cumulative timing improvement is measured against the same baseline before anything lands on `main`. Three small PRs into Last Boss → one bundled merge to `main`.

**Why bundle the final merge:** the wins compound. Tier 1's gating saves 2-3 min. Tier 2's layer cache saves 5-6 min on warm builds. Tier 3's base image saves another 1-2 min on top. We want all three measured against the same baseline on the integration PR before declaring victory.

### Branch and PR structure

- **Last Boss branch:** `hmcgrew/thr-1768-ci-build-optimization` — base = `main`. Long-lived. Hosts the integration PR.
- **Story 1 branch:** `hmcgrew/thr-1770-build-yml-quick-wins` — base = Last Boss. Gets its own PR reviewed and merged into Last Boss.
- **Story 2 branch:** `hmcgrew/thr-1771-...` — base = Last Boss. Same flow.
- **Story 3 branch:** `hmcgrew/thr-1772-...` — base = Last Boss. Same flow. Cannot start until precursor THR-1769 is merged and `thrive-admin-base:v1.0.0` is published to GHCR.

Each story PR is reviewed and merged into Last Boss in order (1 → 2 → 3). After each merge, push and observe CI on the Last Boss branch:

1. **Story 1 merged into Last Boss.** Last Boss CI should drop from ~10 min to ~7-8 min.
2. **Story 2 merged into Last Boss.** Run twice — cold-cache then warm-cache. Warm-cache `docker-compose-build` should drop from ~9 min to ~3 min.
3. **Story 3 merged into Last Boss.** Should shave another ~1-2 min off `docker-compose-build`.

When all three story PRs are merged and the Last Boss CI numbers are recorded, the Last Boss PR is the one that lands on `main`.

### The base image precursor PR (Story 3 prerequisite)

Story 3 pins `Dockerfile.admin` to a published `ghcr.io/.../thrive-admin-base:vX` image — but that image needs to exist in GHCR *before* the pin is added, otherwise the big PR's CI fails immediately on its first push.

**Solution:** ship a tiny precursor PR before the big one — just `.github/workflows/publish-admin-base.yml` and `Dockerfile.admin-base`, no consumer changes. Once that merges, manually trigger the publish workflow to push `thrive-admin-base:v1.0.0` to GHCR. Then the "last boss" PR can safely pin to it.

This keeps the precursor scope tiny (one workflow file + one Dockerfile, no risk of breaking anything) and lets the big PR focus on the consumption side.

### Rollback plan

Because all three tiers land on `main` via a single Last Boss merge commit, rollback is `git revert <last-boss-merge-commit>` and we're back to baseline. If a specific tier proves problematic *after* `main` merge, we can revert individual story merge commits from the Last Boss history — that's why each story is kept as its own PR/merge into Last Boss.

### File-touch summary (for ticket sizing)

| File | Story 1 | Story 2 | Story 3 |
|------|---------|---------|---------|
| `.github/workflows/build.yml` | ✏️ edit | ✏️ edit | — |
| `.github/workflows/publish-admin-base.yml` | — | — | 🆕 create *(in precursor PR)* |
| `Dockerfile.admin` | — | ✏️ reorder | ✏️ reduce + `FROM` base |
| `Dockerfile.admin-base` | — | — | 🆕 create *(in precursor PR)* |
| `Dockerfile.frontend` | — | ✏️ reorder | — |
| `docs/content/dev/architecture/ci-pipeline.md` | ✏️ append | ✏️ append | ✏️ append |
| GHCR retention policy (web UI) | — | — | ⚙️ configure |

The precursor PR adds two files only (`Dockerfile.admin-base` + `publish-admin-base.yml`). The "last boss" PR contains all the consumer changes across all three stories.

---

## Stories

This epic decomposes into 3 independently shippable stories. Each is a clean PR boundary. Recommended order: 1 → 2 → 3, with measurement between each to verify expected savings.

### Story 1 — Quick wins in `build.yml`

Configuration-only changes to the existing `build` job. Lowest risk, smallest diff, fastest measurable payoff.

**Estimated savings:** ~2-3 min per PR build.

### Story 2 — Docker layer caching for `docker-compose-build`

Replace `docker compose build --no-cache` with `docker/build-push-action@v6` using GitHub Actions cache (`type=gha`). Reorder `Dockerfile.admin` and `Dockerfile.frontend` so dependency installs sit above source copies. Add `CACHE_BUST` build arg keyed on the Azure plugin manifest hash.

**Estimated savings:** ~5-6 min on cached builds (~9 min → ~3 min).

### Story 3 — Base image split for `Dockerfile.admin`

Extract stable apt/curl/Playwright system tooling from `Dockerfile.admin` into a new `Dockerfile.admin-base`. Publish the base to GHCR via a new tag-driven workflow. Set GHCR retention policy to keep the last 3 versions. Update `Dockerfile.admin` to `FROM ghcr.io/.../thrive-admin-base:vX`.

**Estimated savings:** additional ~1-2 min on Story 2's already-cached builds, plus comparable savings on every local `docker compose build` for developers.

---

## Implementation Tasks

### Story 1 — `### Clove`

1. In `.github/workflows/build.yml` `build` job: gate the PHP/composer steps by `if: inputs.release_tag != ''`. Affects:
   - `Setup PHP with composer v2` (lines 107-111)
   - `Authenticate Composer with GitHub token` (lines 113-114)
   - `Install composer dependencies in all WP plugins` (lines 116-128)
   - **Why this is safe:** PR validation doesn't create artifacts, and PHP tests run in the parallel `plugin-tests` job which has its own composer install. The `build` job's composer install is only needed downstream for release artifact creation (lines 165-176), which is already gated.

2. In `.github/workflows/build.yml` `build` job: split the checkout step so PR validation uses `fetch-depth: 1` and the release path keeps `fetch-depth: 0`. Two approaches; pick whichever is cleanest in the YAML:
   - Replace the single checkout with two steps, each gated on `inputs.release_tag`
   - Use `fetch-depth: ${{ inputs.release_tag != '' && '0' || '1' }}` in a single step
   - **Why:** The full history is only consumed by `Generate changelog` (lines 180-193), which is already gated. PR validation pays a 30-60s git clone tax for nothing.

3. In `.github/workflows/build.yml` `build` job: add `actions/cache@v4` step before `Install Playwright`, restoring `~/.cache/ms-playwright` keyed on `${{ runner.os }}-playwright-${{ hashFiles('frontend/pnpm-lock.yaml') }}` with a `restore-keys` fallback prefix.
   - **Note:** Playwright's `--with-deps` flag installs both browsers (cacheable) AND apt system libs (not cacheable on a fresh runner). Story 1 caches only the browsers. Story 3's base image will own the apt libs.

4. In `.github/workflows/build.yml` `docker-compose-build` job: drop `fetch-depth: 0` (line 299). The job only needs the working tree, not git history.

5. In `.github/workflows/build.yml`: bump `actions/checkout@v3` → `@v4` everywhere it appears (lines 41, 226, 297). Drop-in replacement, runs on Node 20 instead of deprecated Node 16.

6. Verify Story 1 by pushing to a PR branch and confirming:
   - `build` job completes successfully and runs faster than baseline
   - `plugin-tests` job still passes (it owns composer install on its own)
   - `docker-compose-build` job still passes
   - Push a release-style tag separately to confirm the release path still produces `backend.zip` and `frontend.zip`

### Story 1 — `### Eli`

7. After Story 1 merges, update `docs/content/dev/architecture/ci-pipeline.md` with a short section on the gating pattern: "Composer install in the `build` job is gated by `inputs.release_tag` — PR validation skips it. PHP tests live in the `plugin-tests` job."

### Story 2 — `### Clove`

8. Reorder `Dockerfile.admin` so dependency installs sit above source copies. Target structure:
   - Lines 1-122 unchanged (env, args, apt installs, Playwright deps, user setup, xdebug, wp-cli) — these are stable
   - Replace `COPY . /build` (line 124) with a layered copy:
     ```dockerfile
     COPY --chown=thrive:thrive package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc /build/
     COPY --chown=thrive:thrive frontend/package.json /build/frontend/
     COPY --chown=thrive:thrive backend/package.json /build/backend/
     # plus any other workspace package.json files surfaced by `find . -name package.json -not -path '*/node_modules/*'`
     RUN cd /build && pnpm install --frozen-lockfile

     COPY --chown=thrive:thrive backend/composer.json backend/composer.lock /build/backend/
     # plus backend/plugins/*/composer.json files
     RUN cd /build/backend && composer install --prefer-dist --no-interaction
     # ... existing plugin composer install loop ...

     COPY --chown=thrive:thrive . /build
     ```
   - **Why this layering matters:** Docker's layer cache invalidates a layer (and everything below it) when its inputs change. With lockfiles copied separately, an npm package upgrade only invalidates the install layer, not the apt-install layers above it.

9. Reorder `Dockerfile.frontend` to remove the redundant `COPY . .` before the install. Current state copies package files (line 31) then immediately copies everything (line 34) before installing — defeats the early lockfile copy.

10. Add `CACHE_BUST` build arg to `Dockerfile.admin` immediately above the plugin download layer:
    ```dockerfile
    ARG CACHE_BUST=1
    RUN /usr/local/bin/download_plugins.sh
    ```

11. Replace the `docker compose build --no-cache admin frontend` step in `.github/workflows/build.yml` `docker-compose-build` job with two parallel `docker/build-push-action@v6` invocations (one per Dockerfile) using:
    ```yaml
    - uses: docker/setup-buildx-action@v3
    - uses: docker/build-push-action@v6
      with:
        context: .
        file: Dockerfile.admin
        push: false
        cache-from: type=gha,scope=admin
        cache-to: type=gha,mode=max,scope=admin
        build-args: |
          ACF_PRO_KEY=${{ secrets.ACF_PRO_KEY }}
          GRAVITY_FORMS_KEY=${{ secrets.GRAVITY_FORMS_KEY }}
          PACKAGES_TOKEN=${{ secrets.PACKAGES_READ_TOKEN }}
          STORAGE_ACCOUNT_NAME=${{ vars.STORAGE_ACCOUNT_NAME }}
          STORAGE_CONTAINER_NAME=${{ vars.STORAGE_CONTAINER_NAME }}
          STORAGE_ACCOUNT_KEY=${{ secrets.STORAGE_ACCOUNT_KEY }}
          CACHE_BUST=${{ hashFiles('backend/plugins-from-storage.txt') }}
    ```
    Use `scope=admin` and `scope=frontend` to keep cache entries from colliding. Drop `--no-cache` entirely. The `.env` file creation step in CI (lines 304-311) becomes dead code — `docker/build-push-action` reads build args directly from the workflow's `build-args:` block, so the manufactured `.env` is no longer consulted. Removing it is a cleanup, **not** an env-var change. Local dev's `.env` file mechanism is unaffected. Consider splitting into two parallel jobs for even faster wall-clock time.

12. Verify Story 2 by:
    - First push: cold cache, build completes successfully (slower than baseline expected — populating cache)
    - Second push with no Dockerfile changes: cache hits, build completes 2-3x faster
    - Push a change to `backend/plugins-from-storage.txt`: plugin download layer re-runs, layers below it re-run, layers above stay cached
    - Push a change to `frontend/package.json`: pnpm install layer re-runs in admin and frontend, apt layers stay cached

### Story 2 — `### Eli`

13. After Story 2 merges, update `docs/content/dev/architecture/ci-pipeline.md` with a section on Docker layer caching: how `cache-from`/`cache-to: type=gha` works, what the `CACHE_BUST` arg controls, and how layer ordering protects developer rebuild speed.

### Story 3 — `### Clove`

14. Create `Dockerfile.admin-base` containing the stable layers from current `Dockerfile.admin`:
    - `FROM wordpress:php8.2-apache`
    - PHP config (lines 40-44)
    - Utility script copy (lines 47-48) — *only if* the scripts in `docker/` rarely change. If they're frequently edited, leave them in `Dockerfile.admin`.
    - apt installs: gh, git, nodejs, rsync, sudo, zip, az CLI, composer (lines 55-65)
    - Playwright `install-deps chromium` (lines 73-75)
    - User rename (`www-data` → `thrive`) (lines 89-93)
    - Xdebug install (lines 109-115)
    - WP CLI install (lines 118-121)
    - Corepack/pnpm prepare (line 130)
    - **Skip** the UID/GID remap (lines 101-106) — it depends on host build args, has to stay in `Dockerfile.admin`.

15. Update `Dockerfile.admin` to start `FROM ghcr.io/tractru/thrive/thrive-admin-base:<version>` and contain only the volatile layers:
    - HOST_UID/HOST_GID args + remap
    - Source copies (with the layered ordering from Story 2)
    - `pnpm install`, `composer install`, plugin download
    - Final ownership/copy steps

16. Create `.github/workflows/publish-admin-base.yml` triggered on `workflow_dispatch` (with a `tag` input) and on push of tags matching `admin-base-v*`. Builds and pushes `ghcr.io/tractru/thrive/thrive-admin-base:<tag>` and `:latest`. Use `docker/login-action@v3` + `docker/build-push-action@v6` with `push: true`.

17. Configure GHCR retention policy on the `thrive-admin-base` package: keep last 3 versions. Configurable in package settings on the GitHub web UI; document the steps in the dev doc so the next person knows how to bump it.

18. Verify Story 3 by:
    - Manually triggering `publish-admin-base.yml` with tag `v1.0.0` — confirm image lands at `ghcr.io/tractru/thrive/thrive-admin-base:v1.0.0`
    - Pinning `Dockerfile.admin` to `:v1.0.0` and pushing a PR — confirm the build pulls the base, skips the apt/curl work, completes faster than Story 2's cached builds
    - Confirm GHCR storage usage stays under 2 GB (one base image at a time)

### Story 3 — `### Eli`

19. After Story 3 merges, update `docs/content/dev/architecture/ci-pipeline.md` with the base image versioning policy: when to bump (apt tooling change, Playwright version change, PHP/Apache base bump), how to publish (`admin-base-v*` tag), how to roll back (re-pin the previous tag in `Dockerfile.admin`).

20. Add a brief section to `docs/content/dev/getting-started/devcontainer-reference.md` (or wherever local Docker dev is documented) explaining that the base image is now pulled from GHCR and what to do if the pull fails (auth, fallback to local build).

---

## Decisions

- **Use `cache-from`/`cache-to: type=gha`, not `type=registry`.** GitHub Actions cache is free, has 10 GB per repo allowance, and doesn't touch the GitHub Packages quota. Registry cache would store layers in GHCR, eating into the Team plan's 2 GB Packages allowance with no offsetting benefit.
- **Keep `fetch-depth: 0` on the release-tag path.** The `Generate changelog` step uses `git describe`/`git rev-list` indirectly via `actions/github-script` and `getLatestRelease` — full history is load-bearing for releases. Only PR validation gets the shallow clone.
- **`CACHE_BUST` is keyed on `hashFiles('backend/plugins-from-storage.txt')`.** Automatic, content-driven invalidation — no manual operator step. When you add a plugin to the manifest, the next build re-fetches automatically.
- **Composer install in the `build` job is for release artifact creation only.** PHP tests live in the parallel `plugin-tests` job. PR validation doesn't need composer.
- **Base image stays at one stored version under retention policy.** `thrive-admin-base` is ~1.3 GB compressed; GHCR retention = keep last 3 versions keeps total Packages usage under 4 GB worst case. Team plan's 2 GB free quota would be exceeded by ~2 GB at worst, costing ~$0.50/month. Trivial.
- **Story sequencing is 1 → 2 → 3.** Each story's measurement informs the next. Story 1 establishes a clean baseline; Story 2 validates the Docker cache approach; Story 3 builds on a known-good Story 2 foundation.
- **Each story has its own review PR; all stories share one integration PR to `main`.** Story PRs target the Last Boss branch (`hmcgrew/thr-1768-ci-build-optimization`); the Last Boss PR is the only one that targets `main`. This balances independent reviewability per story with a single bundled merge to `main` so cumulative timing wins are measured against the same baseline.

---

## Acceptance Criteria

### Story 1 — Behavioral

- [ ] **Given** a PR is pushed to a branch that doesn't start with `release/v`, **when** the Validate PR workflow runs, **then** the `build` job completes successfully without running PHP setup or composer install.
- [ ] **Given** a PR is pushed, **when** the Validate PR workflow runs, **then** the `build` job uses a shallow git clone (depth 1).
- [ ] **Given** the previous build for this branch installed Playwright, **when** the next build runs without a `pnpm-lock.yaml` change, **then** Playwright browsers are restored from cache and the install step completes in seconds.
- [ ] **Given** a release tag is created, **when** the Build workflow runs in release mode, **then** it still produces `backend.zip` and `frontend.zip` artifacts and creates a GitHub release.

### Story 1 — Non-behavioral

- [ ] All three jobs (`build`, `plugin-tests`, `docker-compose-build`) still pass on PR validation
- [ ] No `actions/checkout@v3` references remain in `build.yml`
- [ ] PR validation total time drops by at least 90 seconds vs. baseline measured before this story

### Story 2 — Behavioral

- [ ] **Given** the docker-compose-build job has run at least once on this branch (or on `main`), **when** a subsequent build runs without source changes to dependencies, **then** the admin and frontend image builds restore most layers from cache and complete in ~2-3 minutes.
- [ ] **Given** a developer adds a new plugin to `backend/plugins-from-storage.txt`, **when** the next build runs, **then** the plugin download layer re-fetches from Azure Storage and includes the new plugin.
- [ ] **Given** a developer upgrades a pnpm package, **when** the next build runs, **then** the pnpm install layer re-runs while the apt-install layers above it stay cached.

### Story 2 — Non-behavioral

- [ ] `docker compose build --no-cache` is no longer invoked in CI
- [ ] `Dockerfile.admin` and `Dockerfile.frontend` install dependencies before copying full source
- [ ] Cold-cache build (first run after change) still produces working images
- [ ] Local developer `docker compose build` benefits from the layer reordering

### Story 3 — Behavioral

- [ ] **Given** the admin base image has been published to GHCR, **when** the docker-compose-build job runs, **then** the apt/curl/Playwright tooling layers are pulled from the base image and the build skips ~60-80% of the previous apt work.
- [ ] **Given** a maintainer pushes a tag matching `admin-base-v*`, **when** the publish workflow runs, **then** a new versioned image lands at `ghcr.io/tractru/thrive/thrive-admin-base:<tag>`.

### Story 3 — Non-behavioral

- [ ] `Dockerfile.admin` starts `FROM ghcr.io/tractru/thrive/thrive-admin-base:<pinned-version>`
- [ ] GHCR retention policy is configured to keep the last 3 versions of `thrive-admin-base`
- [ ] Documentation explains when to bump the base image and how to publish a new version

---

## History

- 2026-04-25 [main]: Plan created — CI/build optimization epic with 3 tiers. Architect evaluation completed before plan creation; user confirmed scope (build + docker-compose-build only, keep `fetch-depth: 0` on release path, GHA cache over registry cache).
- 2026-04-25 [main]: Plan updated with explicit Preservation Constraints (env vars, healthchecks, runtime config preserved) and "Last Boss" shipping strategy — all 3 tiers ship in one PR after precursor PR publishes the base image.
- 2026-04-25 [main]: Linear tickets filed — THR-1768 (epic), THR-1769 (precursor), THR-1770 (Story 1), THR-1771 (Story 2), THR-1772 (Story 3). THR-1772 blockedBy THR-1769. Plan file renamed to `epic-thr-1768.md`.
- 2026-04-25 [hmcgrew/thr-1769-publish-thrive-admin-base-to-ghcr]: Implemented precursor — created `Dockerfile.admin-base` (extracted stable apt/Playwright/user-rename/Xdebug/wp-cli/corepack layers from `Dockerfile.admin`; kept the `docker/` script copies and `wp-cli.yml` in the consumer per churn analysis — those files have THR-1570-era edits and would force base republishes) and `.github/workflows/publish-admin-base.yml` (workflow_dispatch + push tag trigger on `admin-base-v*`, builds and pushes via `docker/build-push-action@v6` to `ghcr.io/tractru/thrive/thrive-admin-base`).
- 2026-04-25 [hmcgrew/thr-1769-publish-thrive-admin-base-to-ghcr]: Briar self-review surfaced 3 minors on `publish-admin-base.yml`. Winston re-evaluated and bumped Issue #2 (`:latest`) from `deferred` to `open` — the architectural read is that `:latest` has zero consumers in the planned architecture (Story 3 pins specific versions, CI doesn't reference `:latest`, local builds pin), so dropping the tag is simpler than computing it correctly. All 3 minors to be addressed in a follow-up commit before Eric review.
- 2026-04-25 [hmcgrew/thr-1769-publish-thrive-admin-base-to-ghcr]: Applied all 3 review fixes to `publish-admin-base.yml` — env indirection on `inputs.tag` (Issue #1), dropped `:latest` from the build tags (Issue #2 per Winston's no-consumer reasoning), and added a "Validate tag format" step that fails fast on tags not matching `^v[0-9]+\.[0-9]+\.[0-9]+` (Issue #3). All 3 issues marked `fixed`.
- 2026-04-25 [hmcgrew/thr-1769-publish-thrive-admin-base-to-ghcr]: Briar follow-up surfaced one more minor — validation regex needed end anchor. Fixed by adding `$` to the regex on line 52 and the error message on line 53. Validation step now rejects trailing garbage instead of punting to Docker's tag validation.
- 2026-04-25 [hmcgrew/thr-1770-build-yml-quick-wins]: Reconciled shipping strategy — clarified stacked PR model (each story PR targets Last Boss branch; Last Boss PR is the only one targeting `main`). Updated Decisions bullet that previously said "each story ships as its own PR" to reflect the integration model. Moved the Story 1 commit off the Last Boss branch onto its own `hmcgrew/thr-1770-build-yml-quick-wins` branch and reset Last Boss to `origin/main`.
- 2026-04-25 [hmcgrew/thr-1770-build-yml-quick-wins]: Implemented Story 1 (THR-1770) in `.github/workflows/build.yml` — gated `Setup PHP`, `Authenticate Composer`, and `Install composer dependencies` on `inputs.release_tag != ''`; switched the build job's checkout to a conditional `fetch-depth` (0 on release, 1 on PR validation); added `actions/cache@v4` for `~/.cache/ms-playwright` keyed on `frontend/pnpm-lock.yaml` ahead of the Playwright install; dropped `fetch-depth: 0` from `docker-compose-build`; bumped all three `actions/checkout@v3` references to `@v4`.
- 2026-04-25 [hmcgrew/thr-1770-build-yml-quick-wins]: Fixed Briar's critical on `build.yml:44` — flipped the GHA ternary to `${{ inputs.release_tag == '' && 1 || 0 }}` so the falsy `0` lives on the `||` fallback where JS-truthiness can't override it. Release path now correctly resolves `fetch-depth: 0`. Added a comment explaining the inversion so the form isn't "corrected" back to the broken obvious shape.
- 2026-04-25 [hmcgrew/thr-1770-build-yml-quick-wins]: Fixed Briar follow-up major on `lessons.md:32-38` — restored the missing `## 2026-04-25: Util functions go below the main export, not above` heading that was clobbered when the new GHA-ternary lesson was added. Two lessons are now visually distinct again.
- 2026-04-25 [hmcgrew/thr-1770-build-yml-quick-wins]: Eric reviewed PR #1918 — no critical/major issues. One open minor: `plugin-tests` job still has `fetch-depth: 0` (scope-adjacent follow-up, not a Story 1 blocker). Labels applied: `effort:glance`, `confidence:high`.
- 2026-04-25 [hmcgrew/thr-1770-build-yml-quick-wins]: Addressed Eric's open minor — dropped `with: fetch-depth: 0` from the `plugin-tests` checkout step. PHP tests don't consume git history; matches the `docker-compose-build` shape and recovers a few more seconds on PR validation.
- 2026-04-26 [hmcgrew/thr-1769-publish-workflow-bootstrap]: Eric reviewed PR #1924 — no critical/major issues. One open minor on `publish-admin-base.yml:19` (dangling reference to plan Open Question #4 that doesn't exist). Labels applied: `effort:quick`, `review:has-minors`.
- 2026-04-26 [hmcgrew/thr-1769-publish-workflow-bootstrap]: Addressed Eric's open minor — added Open Question #4 to the plan capturing the deferred concurrency-block reasoning (when to add it, candidate `group:` keys depending on trigger pattern). Cross-reference in `publish-admin-base.yml:19` now resolves.

---

## Open Questions

1. **Are there any workspace `package.json` files outside `frontend/` and `backend/` that need to be in the layered copy in Story 2 (Task 8)?** Need to enumerate before writing the Dockerfile diff. Quick `find . -maxdepth 3 -name package.json -not -path '*/node_modules/*'` will surface them.
2. **Does `docker-publish.yml` (the existing manual workflow) still serve a purpose after Story 3 lands?** It publishes the *full* admin image, not the base. May be dead code worth removing in a follow-up — confirm with whoever last touched it.
3. **Should we extract a `thrive-frontend-base` image too in a Story 3.5?** The Dockerfile.frontend is much smaller (~65 lines), so the payoff is smaller, but consistency might be worth it. Defer until Story 3 ships and we can measure.
4. **When should `publish-admin-base.yml` add a `concurrency:` block, and what's the right `group:` key?** Today the workflow is manual-trigger only (`workflow_dispatch`) plus rare `admin-base-v*` tag pushes — the race on GHCR push between two concurrent publishes is theoretical. If auto-triggers get added later (push to `main`, scheduled rebuilds, dependency-bot retags), serializing publishes against the destination image tag becomes load-bearing. The right `group:` key depends on the trigger pattern that surfaces the race: `${{ github.workflow }}-${{ steps.tag.outputs.value }}` if the destination tag is the contention point; `${{ github.workflow }}-${{ github.ref }}` if branch-keyed publishes collide. Revisit when the first auto-trigger lands.

---

## Review Issues

### Use env indirection for inputs.tag in publish workflow

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `.github/workflows/publish-admin-base.yml:35-46`
- **Problem:** `${{ inputs.tag }}` was interpolated directly into the shell script in the "Resolve image tag" step. GitHub's security hardening guide flags this as a footgun — even when actors are trusted, env indirection protects against quoting/whitespace edge cases.
- **Architectural reasoning (Winston):** This workflow will be the template the team copies for future publish workflows. Establishing the safe shape now prevents future workflows inheriting the unsafe pattern.
- **Fixed in:** Added `env: INPUT_TAG: ${{ inputs.tag }}` to the "Resolve image tag" step; bash now references `$INPUT_TAG` instead of direct interpolation.

### `:latest` overwrites on every publish

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `.github/workflows/publish-admin-base.yml:73`
- **Problem:** Every publish pushed `:latest` regardless of whether the new tag was the newest version. Backporting a fix or firing a `workflow_dispatch` with an experimental tag would regress `:latest`.
- **Architectural reasoning (Winston):** `:latest` had zero consumers in the planned architecture. Story 3 pins specific versions, CI doesn't reference `:latest`, local builds pin. Publishing a mutable tag with no consumer is downside-only optionality — if a real consumer surfaces later, add it back with the right constraint at that point.
- **Fixed in:** Removed the `ghcr.io/tractru/thrive/thrive-admin-base:latest` line from the `tags:` block. The build now publishes a single versioned tag.

### No prefix validation on inputs.tag

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `.github/workflows/publish-admin-base.yml:48-55`
- **Problem:** Description said the tag must include the `v` prefix, but nothing enforced it. A workflow_dispatch run with `1.0.0` (no `v`) would silently produce an inconsistent tag that doesn't match the `admin-base-v*` push convention.
- **Fixed in:** Added a "Validate tag format" step right after "Resolve image tag" that fails fast (with a descriptive error message) if the resolved tag doesn't match `^v[0-9]+\.[0-9]+\.[0-9]+`. Uses env indirection (`TAG: ${{ steps.tag.outputs.value }}`) to match the safe shape established in Issue #1.

### Validation regex missing end anchor

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `.github/workflows/publish-admin-base.yml:52-53`
- **Problem:** The validation regex `^v[0-9]+\.[0-9]+\.[0-9]+` was anchored at the start but not the end. Inputs like `v1.0.0; rm -rf /` matched at the prefix and passed validation. Not an exploit (action inputs aren't shell-interpolated, and Docker tag validation rejects bad chars at push time), but the validation step is supposed to catch malformed tags early with a useful error message rather than punt to Docker.
- **Fixed in:** Added `$` end anchor → `^v[0-9]+\.[0-9]+\.[0-9]+$`. Updated the error message on line 53 to match the new regex so the user-facing error stays in sync with what's actually checked. If pre-release tags become a need later, extend to `^v[0-9]+\.[0-9]+\.[0-9]+(-[A-Za-z0-9.]+)?$`.

### Story 1: lessons.md util-functions entry was clobbered by the new ternary lesson

- **Severity:** `major`
- **Status:** `fixed`
- **File:** `.claude/lessons.md:32-38`
- **Problem:** The Edit that added the new "GHA ternary" lesson replaced the heading line for the existing "Util functions go below the main export, not above" entry but left its two bullets in place. Result: the util-functions What happened/Rule pair is now visually nested under the GHA-ternary heading, and the util-functions lesson title is gone. Two distinct lessons collapsed into one, and a future reader sees a ternary lesson followed by orphan bullets about `ProgressBar.tsx` helper placement.
- **Why this matters:** lessons.md is the project's working memory for hard-won patterns. Losing the util-functions title means future-Clove can't discover that lesson by scanning headings, and the existing `code-standards § File Organization` gap it documented is silently re-buried.
- **Recommended fix:** Restore the missing heading between the two entries. Insert `## 2026-04-25: Util functions go below the main export, not above` on its own line above the orphaned `- **What happened:** When extracting shouldInterceptClick...` bullet (currently line 37), with a blank line above and below it.
- **Fixed in:** Restored the heading on its own line above the orphaned util-functions bullets, with blank lines preserved on both sides. Two distinct `## 2026-04-25:` headings now bracket the two lessons cleanly.
- **Suggested tests:** Eyeball the file post-fix — there should be three distinct `## YYYY-MM-DD:` headings between the format comment and the next dated section.

### Story 1: plugin-tests job retains fetch-depth: 0

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `.github/workflows/build.yml:245`
- **Problem:** The `plugin-tests` job's checkout still uses `fetch-depth: 0`. PHP tests don't consume git history — only the `build` job's release-path needs full history (for `Generate changelog`). Out of scope for Story 1's plan tasks (which only called out `docker-compose-build`), but free seconds on the same workflow.
- **Fixed in:** Dropped the `with: fetch-depth: 0` block from the `plugin-tests` checkout. Job now uses default shallow clone, matching `docker-compose-build`.

### Precursor PR #1924: Dangling cross-reference to Open Question #4

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `.github/workflows/publish-admin-base.yml:19`
- **Problem:** Comment ends with "See plan Open Question #4." but the plan's `## Open Questions` section only has #1, #2, and #3. Dangling pointer — anyone chasing the rationale hits a dead end.
- **Recommended fix:** Either (1) add an Open Question #4 to the plan capturing the deferred concurrency-block reasoning, or (2) drop the trailing `See plan Open Question #4.` sentence — the rest of the comment already explains the why. Option 1 is preferred since it gives a hook in the plan when the trigger pattern that surfaces the race actually appears.
- **Fixed in:** Added Open Question #4 to the plan capturing the deferred concurrency-block reasoning, candidate `group:` keys depending on trigger pattern, and the trigger that should resurface it. Cross-reference now resolves.

### Story 1: GHA ternary returns wrong fetch-depth on release path

- **Severity:** `critical`
- **Status:** `fixed`
- **File:** `.github/workflows/build.yml:44`
- **Problem:** The expression `${{ inputs.release_tag != '' && 0 || 1 }}` hits the classic GitHub Actions ternary footgun. GHA evaluates `&&` and `||` left-to-right with JS-style truthiness, and `0` is falsy. On the release path the expression evaluates as `(true && 0)` → `0`, then `(0 || 1)` → `1`. Result: release builds get `fetch-depth: 1` instead of `0`, which breaks `Generate changelog` (it needs full history for `getLatestRelease` + the compare URL). PR validation accidentally returns the correct value (`1`) because that's the `||` fallback.
- **Why this matters:** Story 1's whole point is "PR path goes faster, release path is unchanged." Original ship would have made PR path faster *and* broken the release path. Plan decision on line 234 (`Keep fetch-depth: 0 on the release-tag path`) silently violated until caught.
- **Fixed in:** Flipped the condition to `${{ inputs.release_tag == '' && 1 || 0 }}` — PR path (empty release_tag) returns `1`, release path falls through to `0`. Falsy value now lives on the `||` fallback side where JS truthiness can't override it. Added a two-line comment above the step explaining the inversion so the next reader doesn't "fix" it back to the obvious form.
- **Suggested tests:** Push a release-style tag (or invoke the workflow with `release_tag` set) and confirm the checkout log shows the full clone, plus `Generate changelog` succeeds. PR-path verification is already implicit in the existing PR run on this branch.

---

## PR Readiness

Living checklist — updated after each story's self-review.

### Precursor (THR-1769)
- [x] No critical or major issues — all minors in `## Review Issues` marked `fixed`
- [x] Diff scope verified clean (3 files, all additive — Dockerfile.admin-base, publish-admin-base.yml, plan file)
- [x] Workflow YAML structure valid (visual review; GitHub will validate on first run)
- [x] First-pass review minors addressed (env indirection, `:latest` drop, tag validation step added)
- [x] Follow-up review minor addressed (regex anchored with `$` on validation step)
- [x] Eric review on PR #1924 — minor addressed (Open Question #4 added to plan; cross-reference on `publish-admin-base.yml:19` now resolves)
- [ ] After merge: manually triggered workflow successfully publishes `thrive-admin-base:v1.0.0` to GHCR
- [ ] GHCR retention policy configured on the new package (keep last 3 versions)
- [x] PR description up to date

### Story 1
- [x] No critical or major issues — Briar's `build.yml:44` critical and `lessons.md:32-38` major both fixed
- [x] Implementation complete — build.yml gating, conditional fetch-depth, Playwright cache, docker-compose-build fetch-depth drop, checkout@v4 bumps
- [x] Build skipped — diff does not affect Next.js bundle (CI YAML only)
- [ ] Build passes on a PR push (proves PR-validation path) — pending CI on this branch
- [ ] Build passes on a release tag push (proves release path still works) — pending separate tag push
- [x] PR description up to date

### Story 2
- [ ] No critical or major issues
- [ ] Cold-cache build succeeds
- [ ] Warm-cache build succeeds and is measurably faster
- [ ] Plugin manifest change triggers correct re-run
- [ ] PR description up to date

### Story 3
- [ ] No critical or major issues
- [ ] Base image publishes successfully via the new workflow
- [ ] `Dockerfile.admin` builds against the published base
- [ ] GHCR retention policy is in place
- [ ] PR description up to date
