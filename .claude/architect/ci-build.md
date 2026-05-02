# CI Build

Architect context for the build half of the CI pipeline. Loaded when `.github/workflows/build.yml`, `Dockerfile.admin`, or `Dockerfile.frontend` is in scope.

`build.yml` is a reusable workflow that produces two outputs from one definition: PR validation gates (Storybook tests, Jest coverage, plugin integration tests, container-build smoke) and release artifacts (composer-installed backend zip, Next.js standalone frontend zip, GitHub release with changelog). The deploy half — how artifacts reach 400+ dealer sites — lives in [`ci-scripts.md`](ci-scripts.md) and the human-readable [`docs/content/dev/architecture/ci-pipeline.md`](../../docs/content/dev/architecture/ci-pipeline.md).

For the four-beat narrative companion to this file, see [`docs/content/dev/architecture/ci-build.md`](../../docs/content/dev/architecture/ci-build.md).

---

## The reusable workflow shape

`build.yml` is invoked via `workflow_call` from two callers:

- `validate-pr.yml` — every PR push. No `release_tag` input. Skips PRs whose head branch starts with `release/v` — those are validated on the tag-push side via `create-release.yml`, so running both would build twice.
- `create-release.yml` — every tag push. `release_tag` set to the tag name.

Three parallel jobs, all on `warp-ubuntu-latest-x64-2x`:

- **`build`** — runs always. Steps inside gate on `release_tag` — same job, two modes.
- **`plugin-tests`** — PR-only (job-level `if: inputs.release_tag == ''`). Owns its own composer install.
- **`docker-compose-build`** — PR-only. Smokes the admin and frontend Dockerfiles via `docker compose build --no-cache admin frontend`.

**Why same job, not two jobs for `build`:** PR mode and release mode share the heavy lifting (pnpm install, workspace build). Forking into two jobs would duplicate that work and double install/cache costs without adding parallelism on the validation path.

---

## Release-tag gating

`release_tag` is the dual-mode toggle. Empty string (default) means PR validation; any other value means release build.

Gating shows up in two shapes:

- **Job-level gating** — `if: inputs.release_tag == ''` on `plugin-tests` and `docker-compose-build`. These jobs only run on PR validation; release builds skip them entirely. The PR that produced the merged commit already ran them.
- **Step-level gating** inside the always-running `build` job — PR-only steps (Storybook build, Playwright cache + install, Storybook tests, Jest coverage) and release-only steps (PHP setup, composer auth + install, Azure plugin download, artifact creation, changelog, GitHub release) live side by side, each gated by the same condition.

The fetch-depth line is the canonical example of the pattern's quirks:

```yaml
fetch-depth: ${{ inputs.release_tag == '' && 1 || 0 }}
```

Reads as: PR mode → depth 1 (shallow); else → depth 0 (full history for changelog). The condition is inverted because `0` is falsy in GitHub Actions expression evaluation — the obvious form `release_tag != '' && 0 || 1` evaluates `0` as falsy and returns `1` on the release path, breaking changelog generation. If you add a new dual-mode toggle that picks between numeric values where one is `0`, mirror this inversion.

---

## Required secrets

`build.yml` declares five required secrets: `ACF_PRO_KEY`, `GRAVITY_FORMS_KEY`, `PACKAGES_READ_TOKEN`, `THRIVE_TOKEN`, `STORAGE_ACCOUNT_KEY`.

`THRIVE_TOKEN` is the one that earns its own line. It's used in two places: composer GitHub auth for private packages, and as the custom token passed to `ncipollo/release-action` when the release path creates the GitHub Release. The release-action use is non-obvious — `GITHUB_TOKEN`-triggered releases don't fire downstream `workflow_run` events, so swapping back to `GITHUB_TOKEN` would silently break the deploy chain that watches for new releases. If you touch the release step, leave the custom token in place.

---

## Step inventory inside `build`

| Step                                                                                         | Gate         |
| -------------------------------------------------------------------------------------------- | ------------ |
| `actions/checkout@v4` (split fetch-depth)                                                    | always       |
| Setup pnpm, Node                                                                             | always       |
| `pnpm install --frozen-lockfile`                                                             | always       |
| `pnpm run build` (workspace packages)                                                        | always       |
| Build Storybook                                                                              | PR only      |
| Cache Playwright (`actions/cache@v4`, key on `frontend/pnpm-lock.yaml`)                      | PR only      |
| `playwright install --with-deps`                                                             | PR only      |
| `pnpm run test-storybook:ci`                                                                 | PR only      |
| Remove `storybook-static/`                                                                   | PR only      |
| Jest coverage via `ArtiomTr/jest-coverage-report-action@v2`                                  | PR only      |
| Setup PHP 8.2 + composer 2                                                                   | release only |
| Composer auth + install (all backend plugins)                                                | release only |
| `az storage blob download` for premium plugins listed in `backend/plugins-from-storage.txt`  | release only |
| Strip `node_modules`, `.next`, test fixtures                                                 | release only |
| Create `frontend.zip` (via `pnpm deploy --filter=next-frontend`) and `backend.zip`           | release only |
| Generate changelog (compare against latest release)                                          | release only |
| Create GitHub release (`ncipollo/release-action@v1`, prerelease unless `ref_name == 'main'`) | release only |

The release path lifts plugin filenames from `backend/plugins-from-storage.txt` — the manifest documented in [`plugin-management.md`](plugin-management.md). Edits to that file flow through this step.

---

## Job: `plugin-tests` (PR only)

Spins a MariaDB 11.3.2 service container on port 3306 with database `wordpress_test`. Before running tests, `composer test:install` (in `gravity-platform-core`) installs WordPress against the MariaDB service so the integration tests have a real DB to talk to.

Runs against the real DB:

- `gravity-platform-core` — unit (`composer test:unit`) + integration (`composer test:integration`)
- `thrive-sss` — unit + integration

Owns its own composer install — does not share state with the `build` job. The two jobs run composer in different modes: `build`'s release path uses `--no-dev` for plugin installs so release artifacts ship without dev deps; `plugin-tests` keeps dev deps so the tests can run. Sharing composer state would conflict.

Every test step uses `set -e`. Any failure stops the job — no cumulative reporting.

---

## Job: `docker-compose-build` (PR only)

Validates that both Dockerfiles still build successfully:

- Sets up Buildx via `docker/setup-buildx-action@v3`.
- Writes a `.env` from CI secrets (`ACF_PRO_KEY`, `GRAVITY_FORMS_KEY`, `PACKAGES_READ_TOKEN`, Azure storage account name/container/key).
- Runs `DOCKER_BUILDKIT=1 docker compose build --no-cache admin frontend`.

`--no-cache` is the current behavior — every PR push rebuilds both images from scratch. This is the slowest job in the workflow today.

---

## The two Dockerfiles

`Dockerfile.admin` and `Dockerfile.frontend` answer different runtime needs and have different shapes.

### `Dockerfile.admin`

`FROM wordpress:php8.2-apache`. Single-stage. Contains the entire WordPress admin runtime in one image:

- PHP config tweaks (`file_uploads`, `max_execution_time`, `memory_limit`, `post_max_size`, `upload_max_filesize`).
- Utility scripts copied to `/usr/local/bin/` and made executable.
- apt installs: `gh`, `git`, `nodejs`, `rsync`, `sudo`, `zip`.
- curl-based installers: Azure CLI (`aka.ms/InstallAzureCLIDeb`), Composer 2.7.6 (`getcomposer.org/installer`).
- Playwright Chromium system libraries via `playwright install-deps chromium`.
- User rename `www-data` → `thrive` (UID/GID 33 preserved; Apache `envvars` rewritten to match).
- Optional UID/GID remap via `HOST_UID` / `HOST_GID` build args. Defaults to 33 — correct for OrbStack/Mac and for Windows workspaces stored on the Windows filesystem. Override (`--build-arg HOST_UID=$(id -u)`) is needed for native Linux or for Windows workspaces stored on the WSL2 filesystem.
- Xdebug install + config (`/usr/local/etc/php/conf.d/xdebug.ini`).
- WP CLI install.
- pnpm 10.28.2 via Corepack.
- Build-time: `pnpm install`, build `gravity-platform-core`, composer install for all backend plugins, download premium plugins from Azure, copy plugins + theme into `/var/www/html`.

Monolithic by design. The admin runtime is a coupled WP + Apache + PHP + Node + Composer + WP CLI + Xdebug stack. Splitting it would require maintaining the coupling across multiple images for no operational benefit at the current scale.

### `Dockerfile.frontend`

`FROM node:22-alpine`. Three stages: `base` → `installer` → `runner`.

- **`base`** — Alpine + `libc6-compat` (Next.js native deps). pnpm 10.28.2 via Corepack. `NEXT_TELEMETRY_DISABLED=1`.
- **`installer`** — copies the workspace, `pnpm install --frozen-lockfile`, builds with `BUILD_STANDALONE=1` so Next.js emits `.next/standalone`.
- **`runner`** — non-root `nextjs:nodejs` (UID 1001). Copies only the standalone output (`/app/frontend/.next/standalone`, `/app/frontend/.next/static`, `/app/frontend/public`) from `installer`. Starts via `node server.js`.

Multi-stage exists to keep the runtime image small — the installer stage is discarded, so `node_modules`, source files, and build tooling don't ship to production. The runtime image carries only what `server.js` needs.

`Dockerfile.frontend.local` is a sibling for local devcontainer use, not built by `docker-compose-build`.

---

## Cross-references

- [`ci-scripts.md`](ci-scripts.md) — agent context for the deploy half (`packages/ci-scripts/` bulk dispatch tooling).
- [`plugin-management.md`](plugin-management.md) — rules for `backend/plugins-from-storage.txt`, the manifest the release path reads.
- [`docs/content/dev/architecture/ci-build.md`](../../docs/content/dev/architecture/ci-build.md) — four-beat narrative companion.
- [`docs/content/dev/architecture/ci-pipeline.md`](../../docs/content/dev/architecture/ci-pipeline.md) — the broader CI taxonomy. Mentions `build.yml` at a high level and points here for internals.
