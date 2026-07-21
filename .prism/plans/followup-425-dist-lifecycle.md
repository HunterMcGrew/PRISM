# Plan: followup-425-dist-lifecycle

## Ticket

GitHub issue [#425](https://github.com/HunterMcGrew/PRISM/issues/425) — `dist/cli.js` is stale on `main` and no CI gate catches esbuild-bundle drift.

## Goal

Delete the `dist/cli.js` drift class by making the bundle build-time-materialized instead of git-tracked: gitignore `dist/`, build it in `prepare` + `prepack`, keep `prepublishOnly`, and let the existing tarball parity gate enforce that it ships.

---

## Decisions

- **Option 2 is ratified and closed.** Gitignore `dist/`, build in `prepare` + `prepack`, keep `prepublishOnly`. Recommended in `.prism/plans/eval-backlog-triage.md` § Question 1 and accepted by the operator on 2026-07-21. Option 1 (commit the bundle + add a drift gate to `prism:check`) is a viable fallback, not an open question — do not re-litigate it, and do not re-run the determinism experiment.
  - **Root cause of #425:** the bundle is a machine-generated artifact tracked in git with nothing proving it matches source. Committing a fresh copy without a gate recreates the drift on the next unguarded change.
  - **Chosen approach:** remove the artifact from git entirely. The drift class stops existing rather than being gated, and the global-link consumer path gets fresher instead of staying as fresh as the last forced commit.
  - **Implementation guidance:** no runtime source changes. `findPrismPackageRoot` / `resolveSelfPrismSource` walk to `package.json`, not to `dist/` — all three ADR-0063 invariants survive untouched.

- **`esbuild: "^0.28.1"` (caret) stays as-is; it is moot under option 2.** Bundle determinism was load-bearing only for option 1, which byte-compares a committed bundle against a fresh build. Option 2 never compares bundles — it builds one and ships it — so a caret range that drifts under a deliberate unpinned install changes nothing this plan depends on. Recorded because it is the fallback's precondition: **if option 2 is ever rolled back to option 1, pin esbuild exactly in `package.json` first**, or the drift gate inherits a real (if narrow) flake source that `--frozen-lockfile` masks in CI but a local `pnpm update` would expose.

- **`git rm --cached dist/cli.js` is the removal mechanism, never `git rm` or a delete.** `--cached` untracks the file while leaving the working-tree copy byte-identical on disk. This is what satisfies issue #425's working-tree constraint ("the human may have an uncommitted, locally-modified `dist/cli.js`; do not touch, stash, or overwrite it") — the local copy survives the change untouched, and from then on it is simply an ignored build output.

- **`prepack` duplicating `prepublishOnly`'s bundle step is accepted cost.** `npm publish` runs both, so the bundle builds twice on publish. This mirrors the already-documented ADR-0063 consequence that `prepublishOnly` runs `prism:test` twice: the cost lands on a rare manual operation, and the guarantee (no tarball can ever contain a stale or absent bundle, including from a bare `npm pack`) is worth more than the second esbuild run.

- **Bundle *existence* at pack time is guaranteed by `prepare`, not by `prepack` firing during `npm pack --dry-run`.** `prism:verify-pack` shells out to `npm pack --dry-run --json`; whether npm runs `prepack` on a dry run is version-dependent and not something this plan relies on. `prepare` has already materialized `dist/cli.js` at `pnpm install` time in every environment that runs `prism:check` (local and CI), so the parity gate sees the file either way. Task 5 records which behavior actually occurs so a future reader isn't left guessing.

- **No new unit test for the parity entry.** `findMissingRuntimeReadPaths` is a pure set-difference already covered by `scripts/ai-skills/verify-pack-parity.test.ts` for both `file` and `prefix` kinds. The new `dist/cli.js` entry is data, not logic — a test asserting the list contains a specific literal would test the constant against itself.

- **Generated mirrors are never hand-edited.** ADR-0063 exists canonically at `.prism/spec/adrs/_toolkit/0063-npm-publish-packaging-invariants.md`; the `.claude/`, `.codex/`, and `.cursor/` copies under `spec/adrs/_toolkit/` are generated mirrors. Edit the canonical file only and regenerate with `pnpm prism:build` — never hand-edit a mirror. `pnpm prism:check` fails on out-of-sync generated output, which is the gate that catches a missed regeneration.

- **`prism:doctor` staleness warning is out of scope.** The evaluation floated warning a contributor who pulled without reinstalling that their local bundle is stale. That is a separate, additive change with its own design questions (how does doctor know "stale" without the source hash it deliberately no longer compares?) and it is not needed for #425's done condition.

---

## Implementation Tasks

All tasks are `[AFK]` unless tagged. Tasks 1–5 are strictly sequential (each depends on the previous). Tasks 6–8 (docs + ADR) may run in parallel with each other but must land after task 2. Task 9 is last.

### Clove (implementation)

1. **Untrack the bundle without touching the working-tree file.** From the repo root, run exactly:

   ```bash
   git rm --cached dist/cli.js
   ```

   Do **not** run `git rm dist/cli.js`, `rm dist/cli.js`, `git stash`, or `git checkout -- dist/cli.js` at any point in this ticket. The file must remain on disk byte-identical to whatever the working tree held when you started — issue #425 flags this as a critical constraint. Verify with `test -f dist/cli.js && echo present` (prints `present`) and `git status --porcelain -- dist/` (shows `D  dist/cli.js` staged, and nothing else). Blocks task 2.

2. **Gitignore `dist/`.** In `.gitignore`, replace this exact block:

   ```
   # Per-user local overrides — ignored.
   .claude/settings.local.json
   ```

   with:

   ```
   # Per-user local overrides — ignored.
   .claude/settings.local.json

   # The esbuild bundle is build-time-materialized, not tracked. `prepare` builds it at
   # install, `prepack` before any tarball, and `prepublishOnly` before publish; npm
   # `files` ships it regardless of this ignore — the same mechanism that already ships
   # the gitignored `.prism/.sync-manifest.json`. See ADR-0063 and issue #425: a tracked
   # machine-generated bundle with no drift gate is a silent-staleness surface.
   /dist/
   ```

   Verify: `git check-ignore -v dist/cli.js` prints the `.gitignore` line, and `git status --porcelain -- dist/` still shows only the staged deletion from task 1 (no untracked `dist/cli.js` entry). After task 1, blocks task 3.

3. **Add the `prepare` and `prepack` lifecycle scripts.** In `package.json` `"scripts"`, replace this exact line:

   ```
   		"prepublishOnly": "pnpm run prism:bundle && pnpm run prism:build && pnpm run prism:check"
   ```

   with these three lines (tab-indented, matching the file's existing tab indentation):

   ```
   		"prepare": "pnpm run prism:bundle",
   		"prepack": "pnpm run prism:bundle",
   		"prepublishOnly": "pnpm run prism:bundle && pnpm run prism:build && pnpm run prism:check"
   ```

   Leave `prepublishOnly` byte-identical — it stays as the publish-path belt to `prepack`'s braces. Verify: `node -e "const s=require('./package.json').scripts; console.log(s.prepare, '|', s.prepack, '|', s.prepublishOnly)"` prints all three. After task 2, blocks task 4.

4. **Prove `prepare` materializes the bundle at install.** Delete the local bundle and reinstall:

   ```bash
   rm -f dist/cli.js
   pnpm install --frozen-lockfile
   test -f dist/cli.js && node dist/cli.js --help
   ```

   Expect `dist/cli.js built.` in the install output and the CLI usage banner from `node dist/cli.js --help`. This is the one place in the ticket where deleting `dist/cli.js` is correct — task 1's constraint is about preserving the file *while it is still git-tracked*; once it is ignored and rebuildable, it is disposable. If `prepare` does not fire under pnpm here, stop and report — that is the single load-bearing assumption of the whole change. After task 3, blocks task 5.

5. **Add `dist/cli.js` to the tarball parity gate.** In `scripts/ai-skills/verify-pack-parity.ts`, inside the `RUNTIME_READ_PATHS` array, insert this entry as the **first** element (immediately after the opening `[` line and before the `.ai-skills/config.schema.json` entry), tab-indented to match:

   ```ts
   	{ path: "dist/cli.js", reader: "package.json bin \"prism\" — the published entry point", kind: "file" },
   ```

   Do not add a unit test (see `## Decisions`). Verify with `pnpm run prism:verify-pack` — expect `verify-pack-parity: all 6 runtime-read path(s) present in the tarball.` While running it, note whether the output contains `dist/cli.js built.` (i.e. whether `npm pack --dry-run` fired `prepack`) and record the observed answer as a one-line `## History` entry — the plan explicitly does not assume either behavior. After task 4, blocks task 9.

6. **Amend ADR-0063 with the build-time-materialization note.** Edit the canonical file only — `.prism/spec/adrs/_toolkit/0063-npm-publish-packaging-invariants.md`. In the `## Consequences` list, immediately after the existing bullet beginning `- **Neutral:** \`.prism/.sync-manifest.json\` is gitignored but ships`, insert this bullet verbatim:

   ```markdown
   - **Neutral (amended 2026-07-21, issue #425):** `dist/cli.js` is no longer git-tracked. The bundle is materialized by the build lifecycle — `prepare` on install, `prepack` before any tarball, `prepublishOnly` before publish — and ships because `files` names `dist/` and operates on the working tree, generalizing the `.sync-manifest.json` mechanism above from a JSON manifest to the compiled bin. All three invariants are unchanged: the runtime still walks to `package.json` (1), `files` is still the inclusion allowlist (2), and `bin` still points at the `node`-shebanged `dist/cli.js` (3) — none of them ever required the artifact to be in git. The tracked bundle had drifted from source on `main` with nothing catching it; removing it from git deletes that drift class rather than gating it, and `verify-pack-parity`'s `dist/cli.js` entry is the enforcement that the bundle ships.
   ```

   Do **not** hand-edit the `.claude/`, `.codex/`, or `.cursor/` mirrors of this ADR — task 9 regenerates them. Verify: `grep -c "amended 2026-07-21" .prism/spec/adrs/_toolkit/0063-npm-publish-packaging-invariants.md` prints `1`. After task 2, parallel with tasks 7–8.

### Eli (documentation)

7. **`docs/adopt-prism.md` — global-link section.** Two edits in the `### Global \`prism\` command` section.

   (a) Immediately after the fenced `bash` block containing `pnpm install` / `pnpm link --global`, insert this paragraph:

   ```markdown
   **`pnpm install` is what builds the binary.** The compiled `dist/cli.js` is not checked into the repo — a `prepare` script builds it during install. A fresh clone therefore has no `prism` binary until `pnpm install` has run, and `pnpm link --global` before that will link a bin that doesn't exist yet. Run the two commands in the order above.
   ```

   (b) Replace the existing closing line of that section:

   ```markdown
   When you pull a newer PRISM commit, run `pnpm install` in the clone again — the global link picks up the change automatically, no re-link needed.
   ```

   with:

   ```markdown
   When you pull a newer PRISM commit, run `pnpm install` in the clone again — this rebuilds `dist/cli.js` from the pulled source, and the global link picks up the change automatically, no re-link needed. Skipping the reinstall leaves the linked binary running the bundle from your last install.

   **Installing PRISM as a git-URL dependency is not supported.** The three supported paths are npm/npx, a vendored checkout, and this global link. A git-URL install would depend on your package manager running PRISM's `prepare` script with devDependencies present, which pnpm 10 does not do reliably. Use `npx @huntermcgrew/prism` instead.
   ```

   Verification: content-only, no build effect — `pnpm prism:crossref-lint` is the only relevant check and runs as part of task 9. After task 2, parallel with tasks 6 and 8.

8. **`docs/publishing-prism.md` — the two `dist/` touchpoints.**

   (a) In the Step 4 tarball-review checklist, replace the line:

   ```markdown
   - `dist/cli.js` is present (the compiled binary)
   ```

   with:

   ```markdown
   - `dist/cli.js` is present (the compiled binary — untracked in git, built fresh by `prepack`/`prepublishOnly`, so a missing entry here means the build step failed, not that someone forgot to commit it)
   ```

   (b) In the paragraph that begins ``` `prism:check` validates the full persona roster ```, replace the clause:

   ```markdown
   this is enforced automatically by `prepublishOnly`, which runs `prism:bundle` (the esbuild/dist step), `prism:build`, and `prism:check` before packing
   ```

   with:

   ```markdown
   this is enforced automatically by `prepublishOnly`, which runs `prism:bundle` (the esbuild/dist step), `prism:build`, and `prism:check` before packing — and `prepack` runs `prism:bundle` independently, so even a bare `npm pack` cannot produce a tarball without a freshly built bundle
   ```

   Verification: content-only. After task 2, parallel with tasks 6–7.

### Clove (implementation, final gate)

9. **Regenerate mirrors and run the full check.** Run, in order:

   ```bash
   pnpm prism:build
   pnpm prism:check
   ```

   `prism:build` regenerates the `.claude/`, `.codex/`, and `.cursor/` ADR mirrors from the canonical edit in task 6 — mirrors are always regenerated with `pnpm prism:build`, never hand-edited. `prism:check` must exit 0, including `prism:verify-pack` reporting all 6 runtime-read paths present. Then confirm the tarball independently:

   ```bash
   npm pack --dry-run --json | node -e "let s='';process.stdin.on('data',d=>s+=d).on('end',()=>console.log(JSON.parse(s)[0].files.some(f=>f.path==='dist/cli.js')?'dist/cli.js SHIPS':'MISSING — STOP'))"
   ```

   Expect `dist/cli.js SHIPS` — this is the proof that npm's `files` allowlist overrides `.gitignore`. Finally confirm the vendored path is untouched with `dist/` absent:

   ```bash
   mv dist/cli.js /tmp/cli.js.bak && pnpm prism:doctor && mv /tmp/cli.js.bak dist/cli.js
   ```

   `prism:doctor` runs through `tsx` and must succeed with no bundle on disk. After tasks 5–8; last task before commit.

---

## Acceptance Criteria

### Behavioral

- [ ] **AC-1 — Fresh clone yields a working binary.** Given a fresh `git clone` of the repo at this branch, When `pnpm install` completes, Then `dist/cli.js` exists and `node dist/cli.js --help` prints the CLI usage banner.
  - Evidence (`machine`): `git clone <repo> /tmp/prism-ac1 && cd /tmp/prism-ac1 && pnpm install && node dist/cli.js --help` — exit 0 with banner output.

- [ ] **AC-2 — The bundle is no longer tracked, and rebuilding it never dirties the tree.** Given the branch is checked out and installed, When `pnpm run prism:bundle` runs, Then `git status --porcelain` reports no change.
  - Evidence (`machine`): `pnpm run prism:bundle && git status --porcelain` — empty output. Plus `git ls-files dist/` — empty output.

- [ ] **AC-3 — The tarball gate enforces that the bundle ships.** Given `dist/` is gitignored, When `pnpm run prism:verify-pack` runs, Then it reports all 6 runtime-read paths present; and When `dist/cli.js` is absent from the tree, Then the gate fails naming `dist/cli.js`.
  - Evidence (`machine`): `pnpm run prism:verify-pack` exits 0 printing `all 6 runtime-read path(s) present`. Negative case: `mv dist/cli.js /tmp/ && pnpm run prism:verify-pack; mv /tmp/cli.js dist/` — non-zero exit naming `dist/cli.js` (run this only if `prepack` does not auto-rebuild during the dry run; if it does, note that in `## History` and treat the positive case as sufficient).

- [ ] **AC-4 — npm/npx consumer path is unaffected.** Given a tarball packed from a clean tree, When it is inspected, Then `dist/cli.js` is present and executable as the `prism` bin.
  - Evidence (`machine`): `npm pack && tar tzf huntermcgrew-prism-*.tgz | grep '^package/dist/cli.js$'` — one match. Then `tar xzf` to a temp dir and `node <tmp>/package/dist/cli.js --help` — banner prints.

- [ ] **AC-5 — Vendored-checkout consumer path is unaffected.** Given `dist/cli.js` is absent from the clone, When a `tsx`-run PRISM command executes, Then it succeeds — the vendored path never reads the bundle.
  - Evidence (`machine`): `mv dist/cli.js /tmp/ && pnpm prism:doctor; mv /tmp/cli.js dist/` — `prism:doctor` exits 0 with the bundle absent.

- [ ] **AC-6 — Global-link consumer path is improved, not broken.** Given a clone where `pnpm install` has run, When `pnpm link --global` is executed, Then `which prism` resolves and `prism --help` prints the banner; and When a newer commit is pulled and `pnpm install` re-run, Then the linked binary reflects the new source without re-linking.
  - Evidence (`human`): run `pnpm install && pnpm link --global && which prism && prism --help` in a shell with pnpm's global bin on PATH; then edit a string in `scripts/ai-skills/cli.ts`, re-run `pnpm install`, and confirm `prism --help` reflects it. Requires an interactive shell with PATH set up (`pnpm setup`), so it is not agent-verifiable end to end.

### Non-behavioral

- [ ] **AC-7 — CI is green on both matrix legs.** `pnpm install --frozen-lockfile` followed by `pnpm prism:check` succeeds on `ubuntu-latest` and `windows-latest`, with the new install-time `prepare` bundle step running on both.
  - Evidence (`machine`): the `PRISM Check` workflow on the PR — both matrix jobs green, install logs containing `dist/cli.js built.`

- [ ] **AC-8 — Generated mirrors are regenerated, not hand-edited.** The ADR-0063 amendment appears in the canonical `.prism/` file and in the `.claude/`, `.codex/`, and `.cursor/` mirrors, with the mirrors produced by `pnpm prism:build`.
  - Evidence (`machine`): `pnpm prism:check` exits 0 (its `build.ts --check` step fails on out-of-sync generated output), and `git diff --name-only` on the branch lists the three mirror ADR paths alongside the canonical one.

- [ ] **AC-9 — The working-tree constraint from issue #425 held.** The local `dist/cli.js` was never deleted, stashed, or checked out while it was still git-tracked; only `git rm --cached` was used to untrack it.
  - Evidence (`human`): `git log -p` on the branch shows the `dist/cli.js` deletion as an untrack (no `rm`/`stash`/`checkout` of the path in the session record), and the file is present on disk throughout.

### AC Adjustments

### AC Sync Log

| Date | Agent | Action | Plan | Ticket |
| ---- | ----- | ------ | ---- | ------ |

---

## Sessions

- 2026-07-21 [main] open: Intent — turn the ratified option 2 for #425 into an executable plan; Bounds — write this plan file only, no code, no branch, no tracker writes; Approach — take the evaluation's recorded blast radius as the task spine, verify each surface against source, front-load exact edits · close: scope held

---

## History

- 2026-07-21 [main]: Winston wrote this plan from the ratified option 2 in `.prism/plans/eval-backlog-triage.md` § Question 1. Nine tasks across Clove and Eli; the esbuild caret range is recorded as moot under option 2 and load-bearing only for the option 1 fallback. No code written.

---

## Debugged Issues

---

## Review Issues

---

## Cleanup Items

---

## PR Readiness

- [ ] No critical or major issues
- [ ] Types correct — no `any`, no unsafe `as`
- [ ] No stray console.logs or debug artifacts
- [ ] Tests written for new logic and edge cases (n/a — see `## Decisions`, no new logic)
- [ ] All debugged issues resolved (no `open` entries)
- [ ] Build passes — last run: —
- [ ] PR description up to date
- [ ] Lasting decisions promoted to architect context (ADR-0063 amendment is task 6)

**Last updated:** 2026-07-21
