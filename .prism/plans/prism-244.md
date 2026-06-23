# Plan: prism-244

## Ticket

https://github.com/HunterMcGrew/PRISM/issues/244

## Goal

Make consumer adopt/update runnable as a real `prism` command from the consumer repo, instead of a raw tsx invocation.

---

## User Stories

_Not populated — not required for this ticket._

---

## Design

_Not applicable._

---

## Design direction (for Winston to evaluate)

Starting hypothesis only — these are not accepted decisions. Winston owns evaluation and may revise or reject any of these.

- **`bin` entry in `package.json`** — add `"prism"` → a small subcommand dispatcher (`adopt`, `update`) so consumers get a real `prism` binary on PATH after install. Removes the need to know PRISM's internal script paths.
- **Auto-derive `prismSource` from `import.meta.url`** — the key ergonomic win: the running script knows where it lives, so `--prism-source` is no longer required for the common case. Open risk Winston must evaluate: this interacts with the existing `resolvePrismSource` fallback chain in `scripts/ai-skills/update.ts` (order: `--prism-source` CLI arg → `prismSource` in consumer config → error) and the `assertSourceIsPlausible` safety guard. The fallback chain may need to grow a third slot (self-location via `import.meta.url`) ahead of the existing error path.
- **OPEN — distribution mechanism (delegated to Winston):** global link (`pnpm link --global` → `prism` on PATH) vs. npx-from-git (consumer adds PRISM as a git devDependency, runs `npx prism adopt`). Tradeoffs: version pinning, consumer setup friction, whether `import.meta.url` self-location works correctly under each install shape. See OPEN decision entry in `## Decisions` below.

---

## Implementation Tasks

### Clove (implementation)

1. **Add `resolveSelfPrismSource()` to `scripts/ai-skills/update.ts`.** Insert immediately above `resolvePrismSource` (currently at line 527). Full new function:

   ```ts
   /**
    * Derives the PRISM repo root from this script's own location. Used as the
    * last fallback in `resolvePrismSource` so a consumer running the bundled
    * `prism` CLI gets a source without passing `--prism-source` — the script
    * lives at `<prism-root>/scripts/ai-skills/update.ts`, so the root is two
    * directories up from this file.
    */
   function resolveSelfPrismSource(): string {
   	const thisFile = fileURLToPath(import.meta.url);
   	return path.resolve(path.dirname(thisFile), "..", "..");
   }
   ```

   `fileURLToPath`, `path`, and `import.meta.url` are already imported/available in this file (lines 20–22). Anchor on `import.meta.url` only — never `process.cwd()`. Verification: `pnpm prism:check-types`.

2. **Wire `resolveSelfPrismSource()` into the `resolvePrismSource` fallback chain** in `scripts/ai-skills/update.ts`. The chain currently ends (line ~545):

   ```ts
   	const configured = loadConfig(consumerRepoRoot).prismSource;
   	if (typeof configured === "string" && configured.length > 0) {
   		return path.resolve(consumerRepoRoot, configured);
   	}

   	return null;
   ```

   Replace the trailing `return null;` with:

   ```ts
   	return resolveSelfPrismSource();
   ```

   Order is now: explicit `--prism-source` flag > inline `--prism-source=` > config `prismSource` > self-location. Self-location is a fallback, not a default — explicit flag and config still win. Verification: `pnpm prism:check-types`. Note: `resolvePrismSource` no longer returns `null` in normal operation; the `=== null` guard in both `main()` functions becomes effectively dead but stays as defense-in-depth — do not delete it (a future caller could pass a non-script-relative invocation).

3. **Lift `assertSourceIsPlausible` into `runUpdate`** in `scripts/ai-skills/update.ts`. This is the load-bearing safety change — it closes the pre-existing adopt-path gap (today `assertSourceIsPlausible` is only called in `update.ts main()` at line 608, so `prism:adopt` → `runAdopt` → `runUpdate` bypasses it entirely). Inside `runUpdate` (currently lines 287–325), after the config/paths resolution block and before `const summary = await applyFilePass(...)` (line 308), insert:

   ```ts
   	const consumerManifest = await loadSyncManifest(consumerContentRoot);
   	const pendingDeletionCount = consumerManifest
   		? Object.keys(consumerManifest.files).filter(
   				(p) => classifyPath(p) === "prism"
   			).length
   		: 0;

   	await assertSourceIsPlausible(prismContentRoot, pendingDeletionCount);
   ```

   `loadSyncManifest`, `classifyPath`, and `assertSourceIsPlausible` are all already imported in this file. Then **remove the now-duplicated guard from `update.ts main()`** — delete the `consumerManifest`/`pendingDeletionCount`/`assertSourceIsPlausible` block at lines 601–608 (the comment block + the three statements), since `runUpdate` now owns it. Keep the `if (!(await pathExists(prismContentRoot)))` check at lines 592–596 in `main()` (it guards before `runUpdate` is reached). Verification: `pnpm prism:test` (the existing `assertSourceIsPlausible refuses...` and `...passes...` tests at update.test.ts:373,394 still exercise the function directly and must stay green).

4. **Create the CLI dispatcher at `scripts/ai-skills/cli.ts`.** New file. Full content:

   ```ts
   #!/usr/bin/env -S npx tsx
   /**
    * Consumer-facing `prism` command — the single entry point a consumer repo
    * uses after linking PRISM globally (`pnpm link --global` from the PRISM
    * clone). Dispatches `prism adopt` and `prism update` to the existing
    * adopt/update mains without duplicating their logic. The PRISM source is
    * auto-derived from this script's own location (see `resolveSelfPrismSource`
    * in update.ts), so no `--prism-source` argument is needed; an explicit
    * `--prism-source` flag still overrides.
    *
    * The shebang runs `npx tsx` rather than bare `tsx` so the runtime resolves
    * from PRISM's own node_modules (this file's real path is inside the PRISM
    * clone even when invoked via a global symlink), not the consumer's PATH.
    */
   import { runAdoptCli } from "./adopt";
   import { runUpdateCli } from "./update";

   const USAGE = `prism — PRISM consumer CLI

   Usage:
     prism adopt    Seed .prism/ and project the persona roster into this repo (first run)
     prism update   Pull PRISM's latest canonical content into this repo (steady-state)

   Run from your consumer repo root. PRISM source is auto-derived from the linked
   PRISM checkout; pass --prism-source <path> to override.`;

   async function main(): Promise<void> {
   	const subcommand = process.argv[2];

   	switch (subcommand) {
   		case "adopt":
   			await runAdoptCli();
   			break;
   		case "update":
   			await runUpdateCli();
   			break;
   		case "--help":
   		case "-h":
   		case undefined:
   			console.log(USAGE);
   			break;
   		default:
   			console.error(`prism: unknown subcommand "${subcommand}"\n`);
   			console.error(USAGE);
   			process.exit(1);
   	}
   }

   main().catch((error: unknown) => {
   	console.error(error instanceof Error ? error.message : String(error));
   	process.exit(1);
   });
   ```

   Note: the dispatcher consumes `process.argv[2]` as the subcommand; the existing mains read flags from `process.argv.slice(2)` via `resolvePrismSource`, which scans for `--prism-source` anywhere in argv, so `prism adopt --prism-source /x` still resolves correctly (the `adopt` token is ignored by the flag scan). Verification: `pnpm prism:check-types`.

5. **Export `runAdoptCli` from `scripts/ai-skills/adopt.ts`.** The current `main()` (lines 134–151) is module-private and only runs under the `isMain` guard. Rename `main` → `runAdoptCli` and `export` it so `cli.ts` can import it. Update the `isMain` block at the bottom (lines 190–197) to call `runAdoptCli()` instead of `main()`. The `isMain` direct-invocation path stays so `pnpm prism:adopt` (the existing package.json script) keeps working unchanged. Verification: `pnpm prism:check-types && pnpm prism:test` (adopt.test.ts must stay green).

6. **Export `runUpdateCli` from `scripts/ai-skills/update.ts`.** Same pattern as task 5: rename `main` → `runUpdateCli` (the `update.ts` `main` at line 570), `export` it, update the `isMain` block at lines 645–652 to call `runUpdateCli()`. Keep the consumer-self-check (`path.resolve(prismRepoRoot) === path.resolve(consumerRepoRoot)` at lines 582–587) and the `pathExists(prismContentRoot)` check inside this function — they guard before `runUpdate`. Sequence: do task 3 (lift guard) before this so the `main` body you're renaming already has the duplicated guard removed. Verification: `pnpm prism:check-types && pnpm prism:test`.

7. **Add the `bin` entry to `package.json`.** After the `"description"` field (line 4) or alongside `"scripts"`, add a top-level key:

   ```json
   	"bin": {
   		"prism": "scripts/ai-skills/cli.ts"
   	},
   ```

   Verification: `pnpm prism:check` (full check — types, tests, manifest, crossref all green). After this, from the PRISM repo root, a maintainer runs `pnpm link --global` to put `prism` on PATH.

8. **Add a CLI dispatch test at `scripts/ai-skills/cli.test.ts`.** New file. Cover: (a) self-derivation — `resolveSelfPrismSource()` (export it from update.ts for the test, or test via `resolvePrismSource([], <tmp-with-no-config-prismSource>)` returning the PRISM root rather than null); (b) the plausibility guard now fires through `runUpdate` (scaffold a consumer with a recorded manifest, point `runUpdate` at an empty `.prism/` source, assert it rejects with the "looks empty" message — mirrors update.test.ts:373 but through `runUpdate` instead of the bare guard). Use the temp-root + `scaffoldConsumerAndSkills` helper pattern from adopt.test.ts:142–170. Verification: `pnpm prism:test`.

### Eli (documentation)

9. **Write a consumer quickstart: "Adopt PRISM into your repo."** New short guide (suggested path `docs/content/usage/adopt-prism.md` — confirm the docs usage dir convention against existing `docs/` layout before placing). Cover exactly three things a consumer maintainer needs: (1) one-time setup — clone PRISM, `cd` into it, run `pnpm install && pnpm link --global`; (2) first adopt — from your repo root, run `prism adopt` (no path arguments); (3) steady-state — run `prism update` to pull PRISM's latest. Note the override: `prism adopt --prism-source <path>` if you have multiple PRISM checkouts. State that adopt is first-contact only (it refuses once a `.sync-manifest.json` exists) and update is the steady-state command. Keep it under one screen. Verification: content-only, no build effect.

---

## Decisions

- **Distribution mechanism: global-link (`pnpm link --global`), not npx-from-git.** (Resolves the prior OPEN entry; Hunter delegated the call to Winston.)
  - **Root cause / framing:** the real use case is a maintainer with a local PRISM clone syncing their own repo on a manual cadence — single-machine dev, exactly global-link's sweet spot.
  - **Alternatives considered:** npx-from-git (consumer adds PRISM as a git devDependency, runs `npx prism adopt`).
  - **Chosen approach:** global-link. Beats npx-from-git because npx-from-git couples the consumer's `package.json` to a PRISM git URL — the exact dependency entanglement #243 worked to avoid — and turns every invocation into a potential network/install hit, for a portability benefit the single-machine workflow doesn't need.
  - **Rejected alternative, one line:** npx-from-git gives version pinning + cross-machine portability but couples the consumer manifest to PRISM and adds per-invocation install cost; rejected because the workflow is local-clone single-machine.
  - **Implementation guidance:** documented one-time `pnpm link --global` from the PRISM clone (Eli quickstart, task 9); consumer then runs `prism adopt` / `prism update` from their repo root with no path args. A new machine re-runs the one `pnpm link --global` — accepted setup cost.
  - → no promotion needed (ticket-tactical distribution choice for this repo's consumer flow; the quickstart doc carries the durable how-to).

- **Self-location: third fallback slot in `resolvePrismSource`, anchored on `import.meta.url`.** Fallback order is explicit `--prism-source` flag > config `prismSource` > self-location > (effectively unreachable null). Self-location is a fallback, not a default — explicit signals still win, so every existing test and behavior is preserved and only the previously-null case changes.
  - **Root cause:** the script knows where it lives (`<prism-root>/scripts/ai-skills/update.ts`), so the PRISM root is derivable as two dirs up from `fileURLToPath(import.meta.url)` — no user-supplied path needed for the common case.
  - **Chosen approach:** single helper `resolveSelfPrismSource()` in `update.ts`; both `adopt.ts` and `update.ts` already import `resolvePrismSource` from `update.ts`, so one edit fixes both entry points with zero duplication.
  - **Implementation guidance:** anchor on `import.meta.url` only, never `process.cwd()` — cwd is the consumer repo, not PRISM.
  - → no promotion needed (implementation detail of the consumer-sync entry points; lives in the code + this plan).

- **Safety guard `assertSourceIsPlausible` lifted from `update.ts main()` into `runUpdate`.** This is the load-bearing safety decision and it fixes a pre-existing gap, not just a new-CLI concern.
  - **Root cause:** today the plausibility guard is called only in `update.ts main()` (line 608), above `runUpdate`. The adopt path (`adopt.ts main()` → `runAdopt` → `runUpdate`) bypasses it entirely. With explicit `--prism-source` the human supplied the path so the gap was low-risk; self-derivation removes the human from the loop, so a corrupted/cleared PRISM checkout could self-derive to a real-looking root and drive mass deletion on an established consumer's `update`.
  - **Alternatives considered:** add the guard separately to the adopt path and each new CLI subcommand (duplicated, drift-prone); guard only inside the self-derivation helper (misses the explicit-flag-but-corrupted-source case).
  - **Chosen approach:** lift the check into `runUpdate` — the single seam every caller passes through (same "every caller gets it" pattern the file already uses for platform refresh, per the comment at update.ts:281). Closes the adopt-path gap as a byproduct and covers all three entry points (`prism:update` main, `prism:adopt`, both `cli.ts` subcommands).
  - **Implementation guidance:** recompute `pendingDeletionCount` inside `runUpdate` from the loaded consumer manifest; remove the now-duplicated guard from `update.ts main()`; keep the `pathExists(prismContentRoot)` and consumer-self-check guards in `main()` (they gate before `runUpdate`).
  - → promotion candidate: if `.prism/architect/` gains a consumer-sync-safety doc, the "guard at the single shared seam, every entry point passes through it" invariant belongs there. No such doc exists today — flag for Architect Context Updates rather than promote now.

- **Bin executes via `#!/usr/bin/env -S npx tsx`.** A bare `#!/usr/bin/env tsx` requires tsx on the global PATH (it isn't — tsx is a PRISM devDependency). `npx tsx` resolves tsx from PRISM's own `node_modules` because the script's real path is inside the PRISM clone even when invoked through a global symlink. The `-S` splits the shebang args so `env` runs `npx tsx` as a two-token command.
  - **Implementation guidance:** if Clove hits `tsx: command not found` during verification, the bin shape is wrong — stop and reconsider the interpreter strategy rather than bolting on workarounds (see PR Readiness / risk callouts).
  - → no promotion needed (mechanical bin-runtime detail; self-evident from `package.json` + `cli.ts`).

---

## History

- 2026-06-23 [hmcgrew/prism-244-consumer-prism-cli]: Plan skeleton created by Nora; Winston to evaluate design direction and populate implementation tasks, decisions, and AC.
- 2026-06-23 [hmcgrew/prism-244-consumer-prism-cli]: Winston evaluated and designed the implementation. Resolved distribution to global-link, designed self-location as a third fallback slot, and surfaced that the adopt path bypasses `assertSourceIsPlausible` — fix lifts the guard into `runUpdate` so every entry point passes it. See Decisions: distribution, self-location, safety-guard, bin-runtime.
- 2026-06-23 [hmcgrew/prism-244-consumer-prism-cli]: Clove implemented the CLI. Added `resolveSelfPrismSource` + third fallback slot in `update.ts`, lifted `assertSourceIsPlausible` into `runUpdate` (removing the duplicate from `main()`), renamed adopt/update mains to exported `runAdoptCli`/`runUpdateCli`, created `scripts/ai-skills/cli.ts` dispatcher + `bin` entry, and added `cli.test.ts`. End-to-end verified: `prism adopt`/`update` self-locate PRISM from a virgin consumer cwd with no path arg (31 skills projected); guard fires through the adopt path; tsx resolves cleanly via the `npx tsx` shebang through a symlink. `pnpm prism:check` green, 355 tests pass.
- 2026-06-23 [hmcgrew/prism-244-consumer-prism-cli]: Eli wrote consumer quickstart at `docs/adopt-prism.md` covering one-time `pnpm link --global` setup (including the `pnpm setup` PATH gotcha), `prism adopt` first-contact, `prism update` steady-state, and `--prism-source` override. Cross-linked from `docs/getting-started.md`.
- 2026-06-23 [hmcgrew/prism-244-consumer-prism-cli]: Clove cleared Briar's two self-review minors. Folded the manifest dedup (`applyFilePass` gained optional `preloadedManifest` param, `runUpdate` threads its already-loaded manifest — additive, no test ripple, guard/file-movement unchanged) and dropped the conversational "So" from the `adopt-prism.md` opener. `pnpm prism:check` green, 355/355.
- 2026-06-23 [hmcgrew/prism-244-consumer-prism-cli]: Clove cleared Eric's minor — three stale `main()` refs updated to `runUpdateCli`/`runAdoptCli` in comments; two generic-concept uses left unchanged. `pnpm prism:check` green, 355/355.

---

## Debugged Issues

_None._

---

## Review Issues

### Redundant manifest load inside runUpdate

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `scripts/ai-skills/update.ts:313`
- **Problem:** The guard-lift added a `loadSyncManifest(consumerContentRoot)` call at line 313 (for `pendingDeletionCount`), but `applyFilePass` already loads the same manifest at line 221. `runUpdate` now reads the consumer manifest from disk twice per call. Not a correctness bug — the file is not mutated between the two reads — but the relocation collapsed two single-load sites (old `main()` + `applyFilePass`, in different functions) into one call chain that loads twice.
- **Suggested fix:** Optional follow-up. Either thread the already-loaded manifest from `runUpdate` into `applyFilePass`, or compute `pendingDeletionCount` once and pass it down. Low value relative to the refactor cost on a hot-but-tiny path; safe to defer.
- **Fixed in:** `0b169db`. Folded — clean thread-through. `applyFilePass` gained an optional `preloadedManifest?: SyncManifest | null` third param; `runUpdate` passes the manifest it already loaded for the guard. Additive signature: the 13 unit-test call sites omit the param and load as before, so zero test ripple. Guard deletion-count path and file-movement behavior unchanged (`applyFilePass` receives the identical manifest object it would have loaded). The `!== undefined` check distinguishes "not passed" (load) from "passed null" (pre-manifest consumer), preserving no-manifest semantics. `pnpm prism:check` green, 355/355.

### Doc opener "So this guide..." reads as a verbal tic

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `docs/adopt-prism.md:11`
- **Problem:** The intro sentence opens with "So this guide gets you from zero..." The leading "So" reads as conversational filler at the top of a durable doc.
- **Suggested fix:** Drop the leading "So" — "This guide gets you from zero...". Eli's lane; cosmetic.
- **Fixed in:** `e4db247`. Dropped the leading "So" — opener now leads with "This guide gets you from zero...".

### Stale `main()` references in comments after the rename

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `scripts/ai-skills/update.ts:290` (also `:318`, `:571`; `adopt.ts:108`, `:147`)
- **Problem:** After the `main` → `runUpdateCli`/`runAdoptCli` rename, several comments still describe the entry point as `main()`. Borderline — "main()" reads as a generic concept-name in most spots, but `update.ts:290` specifically names "`prism:update`'s `main()`" as a concrete function that no longer exists by that name.
- **Suggested fix:** Cosmetic. Touch up `update.ts:290` (the one pinned to a concrete function) at minimum; the generic-concept uses are wave-through. Found by Eric (PR review, PR #245). Inline comment posted at `update.ts:318`.
- **Fixed in:** `fa4d29c`. Updated three concrete stale references (`update.ts:290`, `update.ts:571`, `adopt.ts:147`) to the current function names. Left `update.ts:318` and `adopt.ts:108` unchanged — both name "main()" as a conceptual role, not the renamed function. `pnpm prism:check` green, 355/355.

---

## Acceptance Criteria

### Behavioral

- [ ] Given a repo that has never had PRISM (no `.prism/`), When the maintainer runs `prism adopt` from that repo's root with no path arguments, Then `.prism/` is seeded and the persona roster is projected into the platform skill dirs (REQ-1)
- [ ] Given a repo already onboarded to PRISM, When the maintainer runs `prism update` from that repo's root with no path arguments, Then PRISM's latest canonical content is pulled in and a summary of changes is printed (REQ-1)
- [ ] Given the maintainer runs `prism` with no subcommand or with `--help`, When the command executes, Then usage text listing `adopt` and `update` is printed and the command exits without error (REQ-2)
- [ ] Given the maintainer runs `prism` with an unrecognized subcommand, When the command executes, Then an "unknown subcommand" message plus usage is printed and the command exits with a non-zero status (REQ-2)
- [ ] Given a PRISM checkout whose `.prism/` is empty or cleared, When `prism update` runs against an established consumer, Then the run refuses with a "source looks empty — refusing N deletion(s)" message and deletes nothing (REQ-3)
- [ ] Given a maintainer passes `prism adopt --prism-source <path>`, When the command runs, Then the explicit path overrides the auto-derived PRISM source (REQ-1)

### Non-behavioral

- [ ] The existing adopt and update test suites stay green (`pnpm prism:test`) (REQ-4)
- [ ] The full PRISM check passes (`pnpm prism:check` — types, tests, manifest coverage, crossref lint) (REQ-4)
- [ ] The empty-source safety guard is reachable from every entry point (adopt, update, and the `prism` CLI), not just the legacy `prism:update` script path (REQ-3)
- [ ] A consumer quickstart documents the one-time `pnpm link --global` setup and the `prism adopt` / `prism update` commands (REQ-5)

### AC Adjustments

### AC Sync Log

| Date | Agent | Action | Plan | Linear |
| ---- | ----- | ------ | ---- | ------ |
| 2026-06-23 | Winston | Generated AC from design evaluation | prism-244 | N/A (GitHub issue #244, no Linear) |

**Requirement sources (REQ keys, captured during planning):**
- REQ-1: consumer command runs as `prism adopt` / `prism update` from the consumer repo with zero path arguments (issue #244 goal).
- REQ-2: the `prism` CLI surfaces `--help` and handles unknown subcommands.
- REQ-3: self-derivation must not weaken the empty/mispointed-source safety guard (Winston load-bearing risk).
- REQ-4: surgical scope — existing adopt/update behavior and tests stay intact.
- REQ-5: consumer-facing quickstart so a maintainer has a documented command.

---

## Cleanup Items

_None._

---

## PR Readiness

- [x] No critical or major issues — Briar self-review: 0 critical, 0 major, 2 minor (redundant manifest load; doc opener), both fixed by Clove (`0b169db`, `e4db247`)
- [x] Types correct — no `any`, no unsafe `as` (the `string | null` null branch is intentional defense-in-depth per task 2, not dead code)
- [x] No stray console.logs or debug artifacts
- [x] Tests written for new logic and edge cases (`cli.test.ts`: self-location, fallback order, flag-wins, guard-through-runUpdate asserting no deletion)
- [x] All debugged issues resolved (no `open` entries)
- [x] Build passes — last run: 2026-06-23 (`pnpm prism:check` re-run by Clove after minor fixes, green: build --check, types, 355/355 tests, manifest, crossref-lint)
- [x] Guard-lift verified — `assertSourceIsPlausible` has exactly one production call site (`update.ts:320` in `runUpdate`), fires before `applyFilePass`, and now covers the adopt path (`runAdopt`→`runUpdate`). Dispatcher exit codes confirmed by hand (unknown→1, help/no-args→0).
- [x] PR description up to date — PR #245 open with full template body
- [ ] Lasting decisions promoted to architect context (if applicable) — safety-guard "single shared seam" invariant flagged for a future `.prism/architect/` consumer-sync-safety doc (none exists today); not promoted now per Winston's verdict
- [x] Eric PR review (PR #245) — 0 critical, 0 major, 1 borderline-minor (stale `main()` comment refs, fixed in `fa4d29c`). Guard-lift independently verified SAFE: single call site at `update.ts:329`, fires before `applyFilePass`, covers all entry points incl. adopt (closes pre-existing gap). `pnpm prism:check` re-run green (355/355). Labels: `effort:quick`, `review:has-minors`.

**Last updated:** 2026-06-23 (Clove — cleared Eric's minor, 0 open issues)
