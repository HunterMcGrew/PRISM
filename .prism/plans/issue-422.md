# Plan: issue-422

## Ticket

https://github.com/HunterMcGrew/PRISM/issues/422
PR: https://github.com/HunterMcGrew/PRISM/pull/424

## Goal

Stop `pnpm.onlyBuiltDependencies` in `package.json` from being silently ignored by pnpm 10+, without reopening the CI break that made the current placement necessary.

---

## User Stories

Not applicable — bug ticket, describes broken tooling behavior, not a new capability.

---

## Design

Not applicable.

---

## Implementation Tasks

### Clove (implementation)

1. Moved build-script approval from `package.json`'s `pnpm.onlyBuiltDependencies` (no longer read by pnpm 10.26+) to a new `pnpm-workspace.yaml` with `allowBuilds: { esbuild: true }`.
2. Added `packages: ["."]` to the same file to avoid reopening the PR #249 CI break (pnpm v9's `pnpm store path` fails on a workspace file with no `packages:` key).
3. Updated `docs/publishing-prism.md` to describe the new `pnpm-workspace.yaml` mechanism instead of the retired `package.json` field.

---

## Decisions

- **Resolved — key name confirmed empirically, not just from docs.** `allowBuilds` (nested `{ esbuild: true }`) is the pnpm 10.26+ home for build-script approval, and it must live in `pnpm-workspace.yaml` — pnpm only reads auth/registry settings from `.npmrc`. Confirmed two ways: (1) fetched https://pnpm.io/settings, (2) empirically installed pnpm v9 (`npx pnpm@9`, matching CI's pin) and pnpm v11 (the local version) side by side and ran real `pnpm install` against each with the candidate file — both approved esbuild's build script with zero warnings.
  - **Alternatives considered:** trusting the issue body's suspected fix without verification (rejected — the OPEN decision explicitly forbade this, and this repo's own history shows the key name already drifted once); reintroducing `pnpm-workspace.yaml` without a `packages:` field (rejected — empirically reproduces the exact PR #249 CI break under pnpm v9, confirmed via `npx pnpm@9 store path` returning `ERROR packages field missing or empty`).
  - **Chosen approach:** `pnpm-workspace.yaml` with both `packages: ["."]` (satisfies pnpm v9's CI requirement even though this isn't a real workspace) and `allowBuilds: { esbuild: true }` (the pnpm v10.26+ approval mechanism). Removed the now-dead `pnpm.onlyBuiltDependencies` field from `package.json` entirely rather than leaving it as harmless-but-stale — it was already emitting a warning on every invocation and would keep drifting from the source of truth.
  - **Implementation guidance:** future build-script approvals for new devDependencies go in `pnpm-workspace.yaml`'s `allowBuilds` map, not `package.json`. See `docs/publishing-prism.md` § `pnpm-workspace.yaml` `allowBuilds` and build script approvals.
  - → no promotion needed (ticket-tactical config fix; the durable guidance already lives in `docs/publishing-prism.md`, which future contributors will read directly rather than an architect doc).

---

## Sessions

- 2026-07-20 [huntermcgrew/prism-422-pnpm-esbuild-workspace-settings] open: Intent — file the ticket, create the branch, and seed the plan for the pnpm/esbuild build-script-approval regression, per Sol's scope-split ruling against #416/#417; Bounds — ticket creation + branch + plan seed only, no code changes, no touching #416/#417/#419 or main's uncommitted work; Approach — dupe-search, ground the issue in verified repo state (pnpm --version, CI workflow pin, prior #248/#249 history), file via `gh issue create`, worktree-isolate the branch to avoid the dirty shared main tree · close: scope held
- 2026-07-20 [huntermcgrew/prism-422-pnpm-esbuild-workspace-settings] open: Intent — migrate build-script approval out of `package.json`'s dead `pnpm.onlyBuiltDependencies` into whatever pnpm 10+ actually reads, without reopening the PR #249 CI break; Bounds — config files + directly-affected docs only (`package.json`, new `pnpm-workspace.yaml`, `docs/publishing-prism.md`), no touching `dist/cli.js` on main, no merge; Approach — resolve the OPEN Decision empirically (install pnpm v9 and v11 side by side, test the candidate config against both) rather than trust the issue body's suspected fix or a single doc fetch · close: scope held — resolved the OPEN Decision myself rather than routing to Sasha first, since the task explicitly asked for direct implementation with verification; one unrelated global-environment side effect occurred and was reverted (see History)

---

## History

- 2026-07-20 [huntermcgrew/prism-422-pnpm-esbuild-workspace-settings]: Ticket #422 filed via `gh issue create` (label `bug`). Dupe-search against `gh issue list --state all` found no duplicates — #170/#163/#160 are unrelated closed pnpm/build topics. Grounded the issue in verified repo state: `pnpm --version` (11.2.2) reproduces the exact warning locally; `.github/workflows/prism-check.yml` pins CI to pnpm v9; `.prism/plans/prism-248.md` supplied the #248/#249 history showing `pnpm-workspace.yaml` was tried and reverted for this exact setting after breaking CI's `pnpm store path` call. Branch created in an isolated worktree (not the shared main tree, which carries uncommitted human work) from `origin/main`, following the `<username>/prism-NNNN-<slug>` convention used by sibling lanes #416/#417/#419.
- 2026-07-20 [huntermcgrew/prism-422-pnpm-esbuild-workspace-settings]: Implemented the fix — see Decision above for the full empirical verification. Moved build-script approval to `pnpm-workspace.yaml` (`allowBuilds: { esbuild: true }` + `packages: ["."]`), removed the dead field from `package.json`, updated `docs/publishing-prism.md`. Verified cold installs clean under both pnpm v9 and v11, `prism:check` and `prism:build` both exit 0, `dist/cli.js` runs correctly via `node`. Note: an `npm install -g pnpm@9` step used for local v9 testing accidentally shadowed the sandbox's global `pnpm` command via PATH order; caught immediately and reverted with `npm uninstall -g pnpm` before finishing — confirmed restored to 11.2.2. No repo files were affected by this; flagging for transparency per cross-agent handoff accountability.

---

## Debugged Issues

None yet — pending Sasha.

---

## Review Issues

None yet.

---

## Acceptance Criteria

### Behavioral

- [x] Given a fresh git worktree with no cached pnpm content-addressable store, When `pnpm install` is run, Then no `[ERR_PNPM_IGNORED_BUILDS]` error is reported and esbuild's build scripts execute (REQ-1) — verified: `rm -rf node_modules && pnpm install` (pnpm v11.2.2), clean output, no warnings, esbuild binary present at `node_modules/.pnpm/esbuild@0.28.1/.../bin/esbuild`
- [x] Given the build-script approval config change, When `pnpm run prism:check` is run, Then it exits 0 (REQ-2) — verified: exit 0, 504/504 tests pass, crossref-lint/verify-manifest/verify-pack-parity all pass
- [x] Given the build-script approval config change, When `pnpm run prism:build` is run, Then it exits 0 and produces a working `dist/cli.js` (REQ-2) — verified: exit 0, `node dist/cli.js` prints the usage banner
- [x] Given the GitHub Actions `prism-check` workflow (pnpm v9, `.github/workflows/prism-check.yml`), When it runs against the updated config, Then it stays green and does not reproduce the `packages field missing or empty` failure that PR #249 fixed (REQ-3) — verified locally against a real pnpm v9 binary (`npx pnpm@9`, matching the CI pin exactly), not just reasoned about: `pnpm store path --silent` exits 0, `pnpm install --frozen-lockfile` exits 0. CI itself will run on push as the final confirmation.
- [x] Given `pnpm install` completes with the build script approved and no other errors, When its exit code is checked, Then it is `0` (REQ-4) — verified under both pnpm v9 and v11

### Non-behavioral

- [x] No `[WARN] The "pnpm" field in package.json is no longer read by pnpm` warning is emitted by any pnpm invocation (REQ-1) — verified: warning is gone from `pnpm install` output after removing the field
- [x] The fix does not reintroduce the `pnpm-workspace.yaml` missing-`packages:`-field gap documented in `.prism/plans/prism-248.md` → `## Debugged Issues` (REQ-3) — verified empirically: reproduced the exact historical break first (`packages field missing or empty` under pnpm v9 with no `packages:` key), then confirmed the fix's `packages: ["."]` field resolves it

### AC Adjustments

### AC Sync Log

| Date | Agent | Action | Plan | Ticket |
| ---- | ----- | ------ | ---- | ------ |
| 2026-07-20 | Nora | Seeded AC from bug repro/expected behavior, synced to ticket description at creation | created | synced (#422) |

---

## Cleanup Items

None yet.

---

## PR Readiness

- [x] No critical or major issues
- [x] Types correct — no `any`, no unsafe `as` (config-only change, no TypeScript touched)
- [x] No stray console.logs or debug artifacts
- [x] Tests written for new logic and edge cases (N/A — config-only fix, no new logic; existing 504-test suite covers regression)
- [x] All debugged issues resolved (no `open` entries)
- [x] Build passes — last run: 2026-07-20 (`prism:check` exit 0, `prism:build` exit 0, 504/504 tests)
- [ ] PR description up to date — pending PR creation
- [x] Lasting decisions promoted to architect context (if applicable) — no promotion needed, ticket-tactical (see Decisions verdict)

**Last updated:** 2026-07-20 (Clove — implementation complete)
