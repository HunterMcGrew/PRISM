# Plan: issue-150

## Ticket

https://github.com/HunterMcGrew/PRISM/issues/150

## Goal

Make the two manual build-propagation steps (templates/install hand-sync, committed mirror freshness) structurally enforced so the recurring class of misses can't ship.

---

## User Stories

Not Applicable

---

## Design

Not Applicable

---

## Implementation Tasks

Added by Winston. Tasks are grouped by persona.

### Clove (implementation)

**Sequence note:** Step 6 (CI workflow) is independent of all others and highest-leverage — it closes the committed-mirror gap immediately with a one-file diff. Recommend doing it first as its own commit. Steps 0–1 gate 2–5. All build-input edits require `pnpm prism:build` + `pnpm prism:check` after; templates/install edits are hand-sync (the very rule being enforced).

---

1. **Step 0 — Baseline triage of templates/install divergence.**

   Run the following in the repo root to enumerate every diff between canonical and the install seed:

   ```bash
   for area in rules architect spec references templates; do
     echo "=== $area ===";
     diff -rq .prism/$area templates/install/.prism/$area 2>/dev/null || true;
   done
   ```

   Classify every diff line into one of four buckets:

   - **excluded** — file exists only in canonical; is PRISM-dev-internal (not shipped to consumers). Do NOT copy to seed.
   - **curated** — file exists in both but intentionally differs (consumer-facing rewrite). Seed is correct; no sync needed.
   - **seedOnly** — file exists only in seed (not in canonical). Flag: may be a relic to remove.
   - **forgotten-drift** — file exists in both but drifted unintentionally. Sync seed to canonical NOW as part of Step 0.

   **Known intentional curation (confirm, do not assume):**

   - **Excluded rules** (canonical-only, not shipped): `autonomous-bug-fixing.md`, `bash-output-minimization.md`, `context-window-handoff-check.md`, `core-principles.md`, `cross-agent-handoff-accountability.md`, `demand-elegance.md`, `plan-before-building.md`, `pre-compaction-checkpoint.md`, `self-improvement-loop.md`, `subagent-strategy.md`, `verification-before-done.md`
   - **Curated rules** (in both, intentionally different): `branch-plan.md`, `verification-commands.md`, `implementation-task-detail.md`, `skill-authoring.md`, `architect-doc-verification.md`
   - **Curated references** (in both, intentionally different): `architect-context.md`, `architect/plan-mode.md`, `micro-file-step-machine.md`, `review-docs-impact.md`, `worktree-mode.md`
   - **Curated architect** (in both, intentionally different): `documentation.md`, `install-layout.md`, `onboarding.md`, `qa-test-planning.md`, `skills-ecosystem.md`
   - **Rename** (canonical `manifest.json` → seed `manifest.stub.json`)
   - **Curated templates** (in both, intentionally different): `bug-report.md`
   - **spec/** — triage all files individually; most are likely excluded (ADRs are PRISM-dev-internal)

   Fix any forgotten-drift files in this step. Record the final classification in `seed-curation.json` (Step 1).

   Verify: `pnpm prism:check` passes after any sync edits.

---

2. **Step 1 — Create `.ai-skills/definitions/seed-curation.json`.**

   Create new file at `.ai-skills/definitions/seed-curation.json`. Paths are relative to the content root (omit the `.prism/` prefix).

   Structure:

   ```json
   {
     "excluded": [
       "rules/autonomous-bug-fixing.md",
       "rules/bash-output-minimization.md",
       "rules/context-window-handoff-check.md",
       "rules/core-principles.md",
       "rules/cross-agent-handoff-accountability.md",
       "rules/demand-elegance.md",
       "rules/plan-before-building.md",
       "rules/pre-compaction-checkpoint.md",
       "rules/self-improvement-loop.md",
       "rules/subagent-strategy.md",
       "rules/verification-before-done.md"
     ],
     "curated": [
       "rules/branch-plan.md",
       "rules/verification-commands.md",
       "rules/implementation-task-detail.md",
       "rules/skill-authoring.md",
       "rules/architect-doc-verification.md",
       "references/architect-context.md",
       "references/architect/plan-mode.md",
       "references/micro-file-step-machine.md",
       "references/review-docs-impact.md",
       "references/worktree-mode.md",
       "architect/documentation.md",
       "architect/install-layout.md",
       "architect/onboarding.md",
       "architect/qa-test-planning.md",
       "architect/skills-ecosystem.md",
       "templates/bug-report.md"
     ],
     "seedOnly": [],
     "renames": {
       "architect/manifest.json": "architect/manifest.stub.json"
     }
   }
   ```

   Populate `excluded`, `curated`, `seedOnly`, and `renames` with the full results from Step 0 (the above is a starting template — the actual triage in Step 0 may add or move entries). Verify the file parses: `node -e "JSON.parse(require('fs').readFileSync('.ai-skills/definitions/seed-curation.json','utf8'))"`.

---

3. **Step 2 — Add `SeedCuration` TypeScript interface and load it in `build.ts`.**

   File: `scripts/ai-skills/build.ts`

   a. Add the interface near the other interfaces/types at the top of the file (after existing imports and type declarations):

   ```typescript
   interface SeedCuration {
     excluded: string[];
     curated: string[];
     seedOnly: string[];
     renames: Record<string, string>;
   }
   ```

   b. In `main()`, load the curation manifest using the existing `loadJsonFile<T>` helper (locate it in the file — it's already used for other JSON configs). Add the load call near the top of `main()` after path definitions are established:

   ```typescript
   const seedCuration = loadJsonFile<SeedCuration>(
     path.join(repoRoot, '.ai-skills/definitions/seed-curation.json')
   );
   ```

   Verify: `pnpm prism:check-types` (or whatever the TypeScript check command is — confirm by reading `package.json` scripts).

---

4. **Step 3 — Implement `checkSeedDrift()` in `build.ts`.**

   Location: add the function near `removeDeletedManagedContent` (~line 658 in the current file — locate by searching for that function name). This function is CHECK-MODE ONLY and never writes to the seed.

   Function signature:

   ```typescript
   function checkSeedDrift(
     contentRoot: string,
     seedRoot: string,
     curation: SeedCuration,
     changedPaths: string[]
   ): void
   ```

   Implementation requirements:

   - **Walk canonical copied areas**: reuse the existing `COPIED_CONTENT_AREAS` and `COPIED_LOOSE_FILES` constants (locate them in the file) to enumerate what should be in the seed. Use `listRelativeDirectoryEntries` (already exists in the file) to walk each area.
   - **For each canonical file:**
     - If path is in `curation.excluded` → assert it is ABSENT from the seed (if present, push to `changedPaths` with message: `"seed contains excluded file: ${relPath}"`).
     - If path is a key in `curation.renames` → the seed should have `curation.renames[relPath]` instead; assert the renamed path is PRESENT in seed (content compare not required — curated shape).
     - If path is in `curation.curated` → assert it is PRESENT in seed (no content compare — intentional divergence is expected).
     - Otherwise (non-excluded, non-curated, non-renamed) → assert it is PRESENT in seed AND byte-identical. Use `filesAreEqual` (already exists). If not identical, push to `changedPaths` with message: `"seed drift: ${relPath}"`.
   - **Reverse sweep for orphans**: walk all files in seedRoot that map to a known area; if a seed file is neither in `curation.curated`, `curation.seedOnly`, the values of `curation.renames`, nor byte-identical to its canonical counterpart (which would have been caught above), push to `changedPaths` with `"seed orphan: ${relPath}"`. (Files in `curation.seedOnly` are intentional seed-only files — ignore them in the orphan check.)
   - **CRITICAL — compare RAW bytes, NOT substituted content.** The seed ships tokens unsubstituted (per ADR-0030 — the build substitutes tokens at install time, not at seed-write time). Do NOT call `substituteTokens()` before comparing. Use the raw file contents. This is the opposite of the platform-copy check, which does substitute. Incorrect substitution here would produce false-positive drift reports on every token-bearing file.
   - The function is read-only: it only reads files and pushes to `changedPaths`. It never writes, deletes, or moves any file.

   Verify by building and running check mode — see Step 4 for the proof sequence.

---

5. **Step 4 — Wire `checkSeedDrift()` into `main()` under check mode.**

   In `main()`, inside the `if (checkMode)` branch, add the call AFTER the platform-copy sync block and BEFORE the check-mode reporter that prints changedPaths and exits:

   ```typescript
   // Locate the pathDefinitions for the seed root — it should be something like:
   const seedRoot = path.join(repoRoot, pathDefinitions.canonical.templatesContentRoot);
   // (Confirm the exact property name by reading pathDefinitions in the file)

   checkSeedDrift(contentRoot, seedRoot, seedCuration, changedPaths);
   ```

   Find the exact insertion point by locating the comment or block in `main()` that runs the existing platform-copy check, then insert immediately after it and before the `if (changedPaths.length > 0)` reporter block.

   **Proof sequence (run these in order to validate correctness):**

   a. `pnpm prism:check` — must pass on clean branch (baseline green).

   b. Inject intentional drift: edit a NON-curated seed file (e.g. `templates/install/.prism/references/session-close.md`) by appending one space. Run `pnpm prism:check` — must FAIL naming that file. Revert the edit.

   c. Edit a curated seed file (e.g. `templates/install/.prism/rules/verification-commands.md`) by appending one space. Run `pnpm prism:check` — must PASS (curated files are not byte-compared). Revert the edit.

   d. Copy an excluded file into the seed (e.g. `cp .prism/rules/core-principles.md templates/install/.prism/rules/core-principles.md`). Run `pnpm prism:check` — must FAIL naming `rules/core-principles.md` as a seed-contains-excluded file. Remove the copied file.

---

6. **Step 5 — Unit tests for `checkSeedDrift()`.**

   Create new file: `scripts/ai-skills/seed-drift.test.ts`

   Pattern: follow `content-copy.test.ts` in the same directory. Export `checkSeedDrift` and `SeedCuration` from `build.ts` (or extract to a shared module if the test needs it — match whatever pattern `content-copy.test.ts` uses for the functions it tests).

   Required test cases (each as a named `it()` or `test()` block):

   - **identical** — canonical and seed are byte-identical; no changes in `curated`/`excluded`; changedPaths stays empty.
   - **drifted** — seed has a non-curated file that differs from canonical; changedPaths contains `"seed drift: <path>"`.
   - **curated** — seed has a curated file that differs from canonical; changedPaths stays empty (content compare skipped).
   - **excluded** — an excluded canonical file appears in the seed; changedPaths contains `"seed contains excluded file: <path>"`.
   - **orphan** — seed has a file that doesn't exist in canonical and isn't in `seedOnly`; changedPaths contains `"seed orphan: <path>"`.
   - **rename** — canonical has `manifest.json`; seed has `manifest.stub.json` (mapped via `renames`); changedPaths stays empty.

   Verify: `pnpm prism:test` passes.

---

7. **Step 6 — CI workflow (independent; recommend doing FIRST).**

   Create new file: `.github/workflows/prism-check.yml`

   Full file content:

   ```yaml
   name: PRISM Check

   on:
     pull_request:
     push:
       branches:
         - main

   jobs:
     prism-check:
       runs-on: ubuntu-latest
       steps:
         - name: Checkout
           uses: actions/checkout@v4

         - name: Setup pnpm
           uses: pnpm/action-setup@v4

         - name: Setup Node.js
           uses: actions/setup-node@v4
           with:
             node-version: 20
             cache: pnpm

         - name: Install dependencies
           run: pnpm install --frozen-lockfile

         - name: Run PRISM check
           run: pnpm prism:check
   ```

   **Pre-flight check before committing:** confirm `pnpm-lock.yaml` exists and is committed (`git ls-files pnpm-lock.yaml`). If it is missing or untracked, either commit it (preferred) or drop `--frozen-lockfile` from the install command and add a comment explaining why.

   This closes the committed-mirror gap for ALL platform mirrors (`.claude/`, `.codex/`, `.cursor/`) because CI runs `pnpm prism:check` on committed state (a fresh checkout), not working-tree state.

   **Proof sequence:**

   a. Push clean branch → CI must go green.
   b. Commit injected drift (e.g. edit `.claude/rules/branch-plan.md` without running `pnpm prism:build`) → CI must go red. Revert and repush.

   This step can land as its own commit before Steps 0–5 are complete. It provides value immediately.

---

8. **Step 7 — Update `.prism/architect/install-layout.md` §seed surface (~lines 49–53).**

   Read the current file. Locate the section that says something like "no tooling flags a forgotten seed write" (the documented gap referenced in the issue). Update it to reflect the new enforcement:

   - Replace the statement that no tooling catches forgotten seed writes with: "Seed drift is enforced by `checkSeedDrift()` in `build.ts`; `pnpm prism:check` fails if a non-curated canonical file diverges from the seed. Intentional divergences are declared in `.ai-skills/definitions/seed-curation.json`."
   - Cite `seed-curation.json` as the source of truth for the excluded/curated/renamed classification.

   **IMPORTANT — hand-sync the edit to the consumer copy:**

   After editing `.prism/architect/install-layout.md`, manually apply the equivalent edit to `templates/install/.prism/architect/install-layout.md`. (The consumer copy is in `curation.curated`, so `checkSeedDrift` will NOT byte-compare it — but the consumer copy should reflect the new reality so consumers get accurate docs.)

   Verify: confirm `install-layout.md` is listed under `curated` in `seed-curation.json` (it should be from Step 1) so that the intentional divergence between the two copies does not trigger a false-positive drift failure.

---

9. **Step 8 — Update plan Decisions and History.**

   After all steps above are complete:

   - Note in `## Decisions` that `seed-curation.json` is now load-bearing: any change to what's excluded or curated requires updating this manifest. Review discipline: when a new rule is added to canonical, the author must decide excluded/curated/included and update `seed-curation.json` accordingly.
   - Append a `## History` entry for this branch.

---

## Decisions

- **Curated drift-check, NOT verbatim build-output for templates/install.** The install seed is a curated subset — it excludes PRISM-dev-internal files and contains intentionally-rewritten consumer files (e.g. `verification-commands.md` ships a generic stub, not Thrive-internal commands). Verbatim regen would clobber curation and ship internal content to consumers; that's why templates/install was excluded from the build originally. Chosen approach: a `seed-curation.json` manifest + read-only drift-check that asserts byte-identity only for non-excluded, non-curated files. Alternatives: (i) verbatim build-output — rejected (clobbers curation); (ii) generate seed from canonical via per-file transforms — rejected as a future epic (divergences are hand-written prose, not mechanical transforms). → no promotion needed (build-tooling tactic; the curation contract lives in seed-curation.json and install-layout.md).

- **CI (GitHub Actions) over pre-commit hook for committed-mirror enforcement.** `prism:check` already compares canonical → mirror; it just needs to run on a fresh checkout (committed state, not working-tree state). CI is the real gate: pre-commit hooks are bypassable with `--no-verify`, don't run in forks, and add husky/Windows friction. Larger finding: PRISM has no CI at all, so this workflow lights up every `prism:check` invariant on committed state for the first time. → no promotion needed.

- **OPEN — defaulted, needs Hunter only if revisited.** Whether to also add a pre-commit hook as a dev convenience (catches mirror drift before push). **Default path (used until resolved):** CI only. No hook for now.

- **Raw-byte comparison for seed drift, not substituted content.** The seed ships tokens unsubstituted; the build substitutes at install time (per ADR-0030). Comparing substituted content would produce false-positive drift on every token-bearing file. `checkSeedDrift` must NOT call `substituteTokens()` before comparing. → no promotion needed (implementation tactic for this specific check).

- **`seed-curation.json` is now load-bearing.** Any new canonical file must be classified (excluded/curated/included) and the manifest updated. Any change to an existing file's curation status requires a manifest update + a `pnpm prism:check` verification. Review discipline: when reviewing PRs that add or move canonical files, check whether `seed-curation.json` was updated. → no promotion needed (operational discipline; enforced by the check itself).

---

## History

- 2026-06-15 [hmcgrew/issue-150-seed-sync-ci-enforcement]: Seeded plan for issue #150 (seed-sync + CI enforcement). Traceable to PR #149 review — Briar Major on seed miss, Eric Major on committed-stale mirrors.

---

## Debugged Issues

Not Applicable (build tooling enforcement — not a runtime bug with a root cause to investigate)

---

## Review Issues

Not Applicable

---

## Acceptance Criteria

### Behavioral

- [ ] Given a canonical ships-to-consumer file (non-curated, non-excluded) is edited without syncing the seed, When `pnpm prism:check` runs, Then it fails and names the specific drifted file. (REQ-1)
- [ ] Given a curated seed file is edited (e.g. `verification-commands.md`), When `pnpm prism:check` runs, Then it passes (content compare is skipped for curated files). (REQ-1)
- [ ] Given a canonical-only/excluded file is manually copied into the seed, When `pnpm prism:check` runs, Then it fails and identifies the file as a seed-contains-excluded violation. (REQ-1)
- [ ] Given a canonical file is committed but its platform mirror (`.claude/`, `.codex/`, `.cursor/`) is left uncommitted, When CI runs `pnpm prism:check` on the committed branch state, Then CI fails. (REQ-2)
- [ ] Given a clean, fully-synced branch, When CI runs `pnpm prism:check`, Then CI passes. (REQ-2)

### Non-behavioral

- [ ] `pnpm prism:build` (non-check mode) never writes to `templates/install/` — seed remains hand-authored. (REQ-1)
- [ ] `seed-curation.json` accounts for 100% of canonical ↔ seed divergence — no unclassified differences remain after Step 0 triage. (REQ-1)
- [ ] Token-bearing files are compared as raw unsubstituted bytes, producing no false-positive drift failures. (REQ-1)
- [ ] Unit tests cover identical, drifted, curated, excluded, orphan, and rename cases. (REQ-1)
- [ ] `.prism/architect/install-layout.md` §seed surface is updated to reflect the new enforcement, and the consumer copy in `templates/install/` is hand-synced. (REQ-3)

### AC Sync Log

| Date | Agent | Action | Plan | Linear |
| ---- | ----- | ------ | ---- | ------ |
| 2026-06-15 | Nora | Generated AC from issue requirements and Winston scope | updated | N/A |

---

## Cleanup Items

None at plan creation.

---

## PR Readiness

- [ ] No critical or major issues
- [ ] Types correct — no `any`, no unsafe `as`
- [ ] No stray console.logs or debug artifacts
- [ ] Tests written for new logic and edge cases
- [ ] All debugged issues resolved (no `open` entries)
- [ ] Build passes — last run: not yet
- [ ] PR description up to date
- [ ] Lasting decisions promoted to architect context (if applicable)

**Last updated:** 2026-06-15
