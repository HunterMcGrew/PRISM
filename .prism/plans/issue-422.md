# Plan: issue-422

## Ticket

https://github.com/HunterMcGrew/PRISM/issues/422

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

Not yet added — pending Sasha (confirm root cause + exact fix mechanism against pnpm v9/v11) then Clove (implement).

---

## Decisions

- **OPEN — TBD, needs Sasha confirmation.** The exact pnpm-workspace.yaml key name that pnpm 11+ reads for build-script approval (this repo's own history shows the name has already drifted once: `onlyBuiltDependencies` → `allowBuilds` → back to `onlyBuiltDependencies` in `package.json`, all within PR #249 — see `.prism/plans/prism-248.md` `## History` and `## Debugged Issues`). **Default path (used until resolved):** issue #422 documents the suspected fix (reintroduce `pnpm-workspace.yaml` with a `packages:` field plus the current-correct approval key) as a starting hypothesis only; do not implement from the issue body without verifying the key name against https://pnpm.io/settings first.

---

## Sessions

- 2026-07-20 [huntermcgrew/prism-422-pnpm-esbuild-workspace-settings] open: Intent — file the ticket, create the branch, and seed the plan for the pnpm/esbuild build-script-approval regression, per Sol's scope-split ruling against #416/#417; Bounds — ticket creation + branch + plan seed only, no code changes, no touching #416/#417/#419 or main's uncommitted work; Approach — dupe-search, ground the issue in verified repo state (pnpm --version, CI workflow pin, prior #248/#249 history), file via `gh issue create`, worktree-isolate the branch to avoid the dirty shared main tree · close: scope held

---

## History

- 2026-07-20 [huntermcgrew/prism-422-pnpm-esbuild-workspace-settings]: Ticket #422 filed via `gh issue create` (label `bug`). Dupe-search against `gh issue list --state all` found no duplicates — #170/#163/#160 are unrelated closed pnpm/build topics. Grounded the issue in verified repo state: `pnpm --version` (11.2.2) reproduces the exact warning locally; `.github/workflows/prism-check.yml` pins CI to pnpm v9; `.prism/plans/prism-248.md` supplied the #248/#249 history showing `pnpm-workspace.yaml` was tried and reverted for this exact setting after breaking CI's `pnpm store path` call. Branch created in an isolated worktree (not the shared main tree, which carries uncommitted human work) from `origin/main`, following the `<username>/prism-NNNN-<slug>` convention used by sibling lanes #416/#417/#419.

---

## Debugged Issues

None yet — pending Sasha.

---

## Review Issues

None yet.

---

## Acceptance Criteria

### Behavioral

- [ ] Given a fresh git worktree with no cached pnpm content-addressable store, When `pnpm install` is run, Then no `[ERR_PNPM_IGNORED_BUILDS]` error is reported and esbuild's build scripts execute (REQ-1)
- [ ] Given the build-script approval config change, When `pnpm run prism:check` is run, Then it exits 0 (REQ-2)
- [ ] Given the build-script approval config change, When `pnpm run prism:build` is run, Then it exits 0 and produces a working `dist/cli.js` (REQ-2)
- [ ] Given the GitHub Actions `prism-check` workflow (pnpm v9, `.github/workflows/prism-check.yml`), When it runs against the updated config, Then it stays green and does not reproduce the `packages field missing or empty` failure that PR #249 fixed (REQ-3)
- [ ] Given `pnpm install` completes with the build script approved and no other errors, When its exit code is checked, Then it is `0` (REQ-4)

### Non-behavioral

- [ ] No `[WARN] The "pnpm" field in package.json is no longer read by pnpm` warning is emitted by any pnpm invocation (REQ-1)
- [ ] The fix does not reintroduce the `pnpm-workspace.yaml` missing-`packages:`-field gap documented in `.prism/plans/prism-248.md` → `## Debugged Issues` (REQ-3)

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

- [ ] No critical or major issues
- [ ] Types correct — no `any`, no unsafe `as`
- [ ] No stray console.logs or debug artifacts
- [ ] Tests written for new logic and edge cases
- [ ] All debugged issues resolved (no `open` entries)
- [ ] Build passes — last run: N/A
- [ ] PR description up to date
- [ ] Lasting decisions promoted to architect context (if applicable)

**Last updated:** 2026-07-20 (Nora — plan seeded)
