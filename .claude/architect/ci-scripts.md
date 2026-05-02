# CI Scripts

Architect context for `packages/ci-scripts/`. Loaded when any file in that package appears in a diff.

The package hosts internal CI tooling that dispatches GitHub Actions workflows across the full set of dealer site environments — deploy-all, wp-core-update-all, ssh-port-update, env-var-update, etc. Operators run these from the GitHub Actions UI or locally via `tsx`; they are manually invoked, not part of the main build pipeline.

For the full human-readable guide covering the bulk tooling in the context of the wider GitHub Actions workflow taxonomy and release lifecycle, see `docs/content/dev/architecture/ci-pipeline.md`.

---

## The base-class pattern

Bulk workflow tools that iterate over environments extend `BaseBulkWorkflowService<TOptions>` (`services/BaseBulkWorkflowService.ts`). Two concrete subclasses today:

- `BulkDeployService` — dispatches `deploy-site.yml` per environment
- `BulkWPUpdateService` — dispatches `wp-core-update.yml` per environment

`EnvVarUpdateService` does _not_ extend the base class — it has its own processing loop because the per-environment unit of work is a REST API call rather than a workflow dispatch. It still follows the same skip-filter and index-logging conventions described below.

**Why:** The base class owns iteration, concurrency control, and environment fetching. Subclasses own the dispatch-specific details (workflow name, input shape, verb in logs). New bulk tools that dispatch a workflow per environment should extend the base class; tools that do inline work on each environment can follow `EnvVarUpdateService`'s pattern but must match the skip-filter and log conventions.

---

## Environment skip conventions

Two skip lists are applied in `getEnvironments()` before iteration:

```ts
const ENVIRONMENTS_TO_SKIP = ["build", "thrive-dev", "thrive-staging"];
const ENVIRONMENT_PREFIXES_TO_SKIP = ["Preview", "Production"];
```

- `ENVIRONMENTS_TO_SKIP` — exact-match names. Lowercase, matches the real env names in GitHub.
- `ENVIRONMENT_PREFIXES_TO_SKIP` — `startsWith` prefix match. Capitalized to match how GitHub names these environments (`Preview`, `Preview – thrive-docs`, `Production`, etc.).

`EnvVarUpdateService` carries its own copy of both `ENVIRONMENTS_TO_SKIP` and `ENVIRONMENT_PREFIXES_TO_SKIP` so the two services agree on which environments are dealer sites. They are duplicated today; consolidating into a shared filters module is a noted follow-up but not required. When adding a new skip rule, update both services in the same commit.

**Why prefix-based:** dealer envs are named after each dealer's TracTru client code — short identifiers assigned when a client signs up (e.g. `ogem`, `rangf`). The non-dealer envs GitHub creates for Pages deployments (`Preview`, `Production`, `Preview – thrive-docs`, etc.) are a class that grows over time. A prefix filter handles the current set and any future additions without another code change.

---

## The post-filter slice rule

`startAtEnvironmentIndex` counts into the **post-filter** list of environments that will actually be processed — matching what operators see in the run log. The filter chain order is:

```ts
(environments ?? [])
	.filter(skipPredicate) // drop non-dealer envs first
	.slice(startAtEnvironmentIndex) // then resume from the index
	.map((env) => env.name);
```

**Why this order matters:** the log output shows post-filter environments only. If slice ran first, the operator's "restart at env N" intuition would be off by K (K = number of skipped envs before the restart point). Keeping slice after filter means the parameter's value equals the log index — copy-paste to resume.

New subclasses must preserve this ordering. If a new skip mechanism is added, it joins the filter step, not the slice step.

---

## Indexed dispatch logging

Every dispatch or processing log line includes absolute post-filter coordinates:

```
[274/420] Dispatching deployment to environment: ogem
```

- `displayIndex` = `startAtEnvironmentIndex + iterationIndex`
- `total` = `startAtEnvironmentIndex + environments.length`

Both are absolute (include the resume offset). An operator who sees `[274/420]` in the last successful log line pastes `274` into `START_AT_ENVIRONMENT_INDEX` to resume at that env, or `275` to start at the next one — no math.

**Subclass contract:** `dispatchWorkflow(environment, workflowId, displayIndex, total)`. The base class computes the indexes and passes them in; subclasses render them in their log. Keep the `[N/Total]` prefix at the start of the line so interleaved concurrent logs stay scannable.

`EnvVarUpdateService` follows the same format in its `Processing environment: X` log line — operators using either tool count from the same place.

---

## Test conventions

Live in `packages/ci-scripts/__tests__/`. Jest runs from the repo root:

```bash
NODE_OPTIONS='--experimental-vm-modules' pnpm jest --config packages/ci-scripts/jest.config.js
```

`BaseBulkWorkflowService` is tested through a `TestBulkWorkflowService` fixture at the top of the test file — it implements the abstract `dispatchWorkflow` by pushing to internal arrays, which keeps iteration and index-passing observable without invoking real GitHub API calls.

Environment lists are mocked via `jest.spyOn(octokit, "paginate").mockResolvedValueOnce(mockEnvironments)` — the mock array mirrors the GitHub environments API response shape (id, node_id, name, url, html_url, created_at, updated_at).

When you change iteration logic, filter logic, or the index contract, add a regression test that distinguishes old-vs-new behavior. The `counts startAtEnvironmentIndex against the post-filter list` test is a good pattern — it uses an env list where slice-first and filter-first produce different results.

---

## Follow-ups worth tracking

- Rename `START_AT_ENVIRONMENT_INDEX` → `START_AT_ENVIRONMENT_NAME` — better UX ("resume after ogem") but larger surface area (two workflow YAMLs, two env docs, both subclasses). Filed informally; not on a ticket yet.
- Consolidate `ENVIRONMENTS_TO_SKIP` between `BaseBulkWorkflowService` and `EnvVarUpdateService` into a shared filters module. Low urgency, reduces drift risk the third time someone adds a skip rule.
