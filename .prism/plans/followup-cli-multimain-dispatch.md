# Plan: followup-cli-multimain-dispatch

## Ticket

Consumer-facing bug in the shipped `dist/cli.js`: every bundled subcommand's `main()` fires on any `prism` invocation. Diagnosed during the #425 investigation; carved out as a separate lane (see `## Decisions` — separate-lane scope call). Ships in **0.8.0**.

> dependsOn: #425 (gitignore `dist/`, build in `prepare`/`prepack`) — branch from a `main` that already has #425 merged. See `## Decisions` → "#425 dependency and fallback."

## Goal

Stop `dist/cli.js` from running every subcommand's `main()` on any invocation: replace the four bundled entry guards (`adopt`/`doctor`/`eject`/`update`) with a bundle-safe entry check so `cli.ts`'s `process.argv[2]` switch is the sole dispatcher, and add a compiled-bundle integration test that unit tests structurally cannot replace.

---

## Decisions

- **Root cause (confirmed, High).** esbuild's ESM bundle mode (`format: "esm"`, `bundle: true` in `scripts/ai-skills/bundle.ts`) folds `adopt.ts`, `doctor.ts`, `eject.ts`, `update.ts`, and `init.ts` into the single `dist/cli.js`. Bundling collapses every folded module's `import.meta.url` to the one output file's URL. Each of the four subcommand files ends with `const isMain = process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]); if (isMain) { runXCli() }`. In the bundle, `import.meta.url` (collapsed to `dist/cli.js`) equals `process.argv[1]` (`dist/cli.js`) for all four at once, so all four `runXCli()` blocks execute at import time — on top of `cli.ts`'s own `main()` dispatch. Reproduces on `main`'s previously-committed bundle, so the shipped 0.7.3 CLI carries this bug. `init.ts` has no such guard (never invoked standalone) and does not mis-fire.

- **Fix: bundle-safe entry detection via a shared `isDirectCliEntry(entryName)` helper — not a literal `argv[2]` subcommand guard.** The diagnosis phrased the fix as "explicit `process.argv[2]` subcommand dispatch matching the switch in `cli.ts`." Taken literally (each file guards on `process.argv[2] === "adopt"`), the fix is wrong two ways, so it is refined here:
  - **Double-run.** On `prism adopt`, `cli.ts`'s switch already calls `runAdoptCli()`. If `adopt.ts`'s bundled top-level also fired on `argv[2] === "adopt"`, `runAdoptCli()` would run twice concurrently — and adopt writes files (double seed, double manifest write, race). Harmful, not cosmetic.
  - **`--help` / bare / unknown.** `prism --help`, `prism` (no subcommand), and `prism bogus` have no known subcommand in `argv[2]`, so a "stand down if `argv[2]` is known" variant would let the subcommand files self-fire on exactly those paths.
  - **Chosen approach:** detect the *entry script's basename*. `isDirectCliEntry("adopt")` returns true only when `path.basename(process.argv[1])` (extension stripped) equals `"adopt"` — the standalone dev path `tsx adopt.ts`. In the bundle the entry basename is `cli` (or the global-link symlink name, e.g. `prism`), never a subcommand name, so no subcommand module treats itself as the entry and `cli.ts`'s `argv[2]` switch is the sole dispatcher. Behaviorally identical to the old guard for every unbundled path (standalone `tsx adopt.ts`, `tsx cli.ts adopt`, test imports), and correct in the bundle where the old guard was not.

- **The fix is surgical at the guard level because the same `import.meta.url` collapse is load-bearing elsewhere.** `update.ts:981` (`resolveSelfPrismSource` / `findPrismPackageRoot`) reads `fileURLToPath(import.meta.url)` and *relies* on the bundle collapsing it to `dist/cli.js` — that is the real module location inside `node_modules`, and walking up from it finds the package root. `bundle.ts`'s own header comment states this is why `format: "esm"` + `platform: "node"` is chosen. So changing esbuild to preserve per-module URLs would fix the guards but break self-location. The guards are the wrong place to encode "am I the entry?" via `import.meta.url`; self-location is the right place to use it. Fix the guards, leave `resolveSelfPrismSource` and the esbuild config untouched.

- **Scope is exactly four files + one helper + a testability refactor.** A tree-wide sweep for the `fileURLToPath(import.meta.url) === path.resolve(process.argv[1])` guard returns eight files. Four are bundled into `cli.ts` and mis-fire: `adopt.ts`, `doctor.ts`, `eject.ts`, `update.ts`. The other four — `verify-pack-parity.ts`, `verify-manifest-coverage.ts`, `crossref-lint.ts`, `build.ts` — are standalone build scripts never in `cli.ts`'s import graph, so their `import.meta.url` never collapses and their guard is correct. They are deliberately **not** changed. `cli.ts` (the entry, runs `main()` unconditionally) and `init.ts` (no guard) are unchanged.

- **`bundle.ts` gets a behavior-preserving refactor (extract `buildBundle(outfile)`), not a bundling-config change.** The integration test must build and run the *compiled* artifact. Extracting the esbuild call + shebang rewrite into an exported `buildBundle(outfile)` lets the test build a throwaway bundle to a temp file using the exact production config — single source of truth for the esbuild options, no working-tree mutation, no dependency on install ordering. The esbuild options are byte-identical before and after; only the code is reorganized, and the top-level driver is wrapped in the standard `isMain` guard (the plain `import.meta.url === argv[1]` form — correct here because `bundle.ts` is never bundled, and matching its sibling build scripts) so `import { buildBundle }` has no side effect.
  - **Alternative considered:** test spawns `pnpm prism:bundle` (or `tsx bundle.ts`) as a subprocess to build the real `dist/cli.js`, then runs it — no `bundle.ts` change. Rejected: it mutates `dist/cli.js` in the working tree, depends on `dist/` being writable and (post-#425) gitignored, and couples the test to external build ordering. The temp-file build is hermetic and proves itself, which the verification bar prefers.

- **The integration test lives at `scripts/ai-skills/cli-bundle.test.ts` — a `*.test.ts`, so it runs under `prism:test` with no new wiring.** `run-tests.ts` discovers `*.test.ts` via `node:fs` and spawns `process.execPath` with an explicit file list — no shell, no glob, no `.sh`. The new test likewise spawns `process.execPath` on the temp bundle path (no shell, no glob), so it is Windows-CI-safe by construction and gets both-matrix-leg coverage automatically. Same rationale as `verify-pack-parity.ts`'s file comment: unit tests read the source tree where each module's `import.meta.url` is its own file, so they *structurally cannot* reproduce the bundle collapse — the bug lives in the built artifact, so the test must exercise the built artifact.

- **Separate-lane scope call (made by Sol, recorded here).** Not folded into #425: #425's own Decision is "no runtime source changes," this fix touches four shared CLI entry files plus a bundle concern (wide blast radius), and it is a distinct consumer-facing defect. Ships in 0.8.0 as a consumer-facing bug in the shipped CLI.

- **#425 dependency and fallback.** Branch from a `main` that already has #425 merged so `dist/` is gitignored and this lane is **source + test only** — no `dist/cli.js` blob committed, no bundle-blob merge conflict. The integration test builds its own temp bundle and never reads a committed `dist/cli.js`, so it passes regardless of #425. **Fallback if #425 has not merged at build time:** coordinate with Sol — prefer waiting for #425; if branching from a pre-#425 `main` where `dist/cli.js` is still tracked, do **not** commit a rebuilt `dist/cli.js` (it would be a large blob diff and conflict with #425's untrack). The source fix + test stand alone; #425 untracks the blob when it lands.

---

## Implementation Tasks

All tasks `[AFK]`. Task 1 blocks tasks 2–5 (they import the helper). Tasks 2–5 are independent of each other (four separate files) and may run in any order or parallel once task 1 lands. Task 6 (`bundle.ts`) is independent of 1–5. Task 7 (the test) depends on task 6 (imports `buildBundle`) and is best written after 1–5 so the fix it guards is in place. Task 8 is last.

### Clove (implementation)

1. **Create the bundle-safe entry helper.** New file `scripts/ai-skills/lib/cli-entry.ts`, full content (tabs for indentation, matching repo style):

   ```ts
   import path from "node:path";

   /**
    * True when the current process was launched with `entryName` as its direct
    * entry script — the standalone dev path, e.g. `tsx adopt.ts` (basename
    * `adopt`). False when this module has been folded into the `dist/cli.js`
    * esbuild bundle.
    *
    * Replaces the `fileURLToPath(import.meta.url) === path.resolve(process.argv[1])`
    * guard, which mis-fires under esbuild's ESM bundle: bundling collapses every
    * folded-in module's `import.meta.url` to the single output file's URL, so that
    * equality held for adopt/doctor/eject/update at once and ran every
    * subcommand's `main()` on any `prism` invocation. Comparing the entry
    * script's basename survives bundling — the bundle's entry basename is `cli`
    * (or the global-link symlink name), never a subcommand, so no subcommand
    * module treats itself as the entry and `cli.ts`'s `process.argv[2]` switch is
    * the sole dispatcher.
    */
   export function isDirectCliEntry(entryName: string): boolean {
   	const entryScript = process.argv[1];
   	if (entryScript === undefined) {
   		return false;
   	}

   	const base = path.basename(entryScript);
   	const withoutExtension = base.slice(0, base.length - path.extname(base).length);

   	return withoutExtension === entryName;
   }
   ```

   Verify: `pnpm run prism:check-types` (the new file must type-check). Blocks tasks 2–5.

2. **Replace the entry guard in `scripts/ai-skills/adopt.ts`.** Three edits:

   (a) Remove the now-unused import — delete line `import { fileURLToPath } from "node:url";` (`adopt.ts:19`). `fileURLToPath` is used only in the guard being removed (confirmed: its sole other reference is the guard).

   (b) Add the helper import alongside the existing `./lib/` imports. Immediately after the `import { ... } from "./lib/consumer-root";` block (ends at `adopt.ts:28`), insert:

   ```ts
   import { isDirectCliEntry } from "./lib/cli-entry";
   ```

   (c) Replace the guard block (`adopt.ts:340-347`):

   ```ts
   const isMain =
   	process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
   if (isMain) {
   	runAdoptCli().catch((error: unknown) => {
   		console.error(error instanceof Error ? error.message : String(error));
   		process.exit(1);
   	});
   }
   ```

   with:

   ```ts
   if (isDirectCliEntry("adopt")) {
   	runAdoptCli().catch((error: unknown) => {
   		console.error(error instanceof Error ? error.message : String(error));
   		process.exit(1);
   	});
   }
   ```

   Verify: `pnpm run prism:check-types` (no unused-import or missing-symbol error). After task 1.

3. **Replace the entry guard in `scripts/ai-skills/doctor.ts`.** Same three-edit shape as task 2:

   (a) Delete `import { fileURLToPath } from "node:url";` (`doctor.ts:26`) — `fileURLToPath` is used only in the guard.

   (b) Add `import { isDirectCliEntry } from "./lib/cli-entry";` alongside the existing `./lib/` imports (e.g. immediately after the `import { assertInsideGitRepo, parseConsumerFlag, resolveConsumerRoot } from "./lib/consumer-root";` line at `doctor.ts:29`).

   (c) Replace the guard block (`doctor.ts:539-546`) — identical old text to task 2(c) but calling `runDoctorCli()` — with the `if (isDirectCliEntry("doctor")) { runDoctorCli().catch(...) }` form, keeping the existing `.catch` body byte-identical.

   Verify: `pnpm run prism:check-types`. After task 1.

4. **Replace the entry guard in `scripts/ai-skills/eject.ts`.** Same three-edit shape:

   (a) Delete `import { fileURLToPath } from "node:url";` (`eject.ts:35`) — used only in the guard.

   (b) Add `import { isDirectCliEntry } from "./lib/cli-entry";` alongside the existing `./lib/` imports (e.g. after the `import { ... } from "./lib/consumer-root";` block ending at `eject.ts:52`).

   (c) Replace the guard block (`eject.ts:700-707`) with `if (isDirectCliEntry("eject")) { runEjectCli().catch(...) }`, keeping the `.catch` body byte-identical.

   Verify: `pnpm run prism:check-types`. After task 1.

5. **Replace the entry guard in `scripts/ai-skills/update.ts` — but KEEP the `node:url` import.** Two edits only:

   (a) **Do not** remove `import { fileURLToPath } from "node:url";` (`update.ts:23`) — it is still used at `update.ts:981` (`const thisFile = fileURLToPath(import.meta.url);` inside self-location). Removing it breaks self-location and type-check.

   (b) Add `import { isDirectCliEntry } from "./lib/cli-entry";` alongside the existing `./lib/` imports.

   (c) Replace the guard block (`update.ts:1150-1157`) with `if (isDirectCliEntry("update")) { runUpdateCli().catch(...) }`, keeping the `.catch` body byte-identical. Leave `update.ts:981` untouched.

   Verify: `pnpm run prism:check-types`. After task 1.

6. **Refactor `scripts/ai-skills/bundle.ts` to expose `buildBundle(outfile)`.** Replace the top-level driver (`bundle.ts:28-50`, from `const outfile = ...` through `console.log("dist/cli.js built.");`) with an exported function plus a guarded driver:

   ```ts
   /**
    * Bundles `scripts/ai-skills/cli.ts` to `outfile` as a single self-contained
    * ESM bundle, rewrites its shebang to `#!/usr/bin/env node`, and marks it
    * executable. Exported so the bundle-dispatch integration test can build a
    * throwaway bundle with the exact production config instead of duplicating
    * the esbuild options.
    */
   export async function buildBundle(outfile: string): Promise<void> {
   	await build({
   		entryPoints: [path.join(repoRoot, "scripts/ai-skills/cli.ts")],
   		outfile,
   		format: "esm",
   		platform: "node",
   		target: "node20",
   		bundle: true,
   	});

   	// Strip any leading shebang line emitted from the source file and prepend the
   	// correct Node shebang. The source cli.ts carries `#!/usr/bin/env -S npx tsx`
   	// for local dev; the compiled bin needs `#!/usr/bin/env node`.
   	const content = readFileSync(outfile, "utf8");
   	const stripped = content.startsWith("#!")
   		? content.slice(content.indexOf("\n") + 1)
   		: content;
   	writeFileSync(outfile, `#!/usr/bin/env node\n${stripped}`, "utf8");

   	chmodSync(outfile, 0o755);
   }

   const isMain =
   	process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1]);
   if (isMain) {
   	await buildBundle(path.join(repoRoot, "dist/cli.js"));
   	console.log("dist/cli.js built.");
   }
   ```

   Keep `repoRoot` and all existing imports (`build`, `readFileSync`/`writeFileSync`/`chmodSync`, `path`, `fileURLToPath`) — all are still used. The esbuild option object is byte-identical to the current call; do not change any option. Preserve the exact `console.log("dist/cli.js built.")` line inside the guard — #425's tests grep for it.

   Verify: `pnpm run prism:bundle` still prints `dist/cli.js built.` and produces a runnable `node dist/cli.js --help`. Independent of tasks 1–5.

7. **Add the compiled-bundle integration test.** New file `scripts/ai-skills/cli-bundle.test.ts`. It builds one throwaway bundle via `buildBundle` into an OS temp dir, then spawns `process.execPath` (no shell, no glob — Windows-safe, mirroring `run-tests.ts`) against it. Required structure and assertions (the decisions; harness mechanics are Clove's):

   - File-level JSDoc stating the rationale: unit tests import source modules where each `import.meta.url` is its own file, so they cannot reproduce the bundle collapse; the bug lives in the compiled artifact, so the test exercises the compiled artifact (same shape as `verify-pack-parity.ts`).
   - `import { buildBundle } from "./bundle";` plus `node:test`, `node:assert/strict`, `node:child_process` (`spawnSync`), `node:fs/promises`, `node:os`, `node:path`.
   - A top-level `before` hook that `mkdtemp`s a temp dir and calls `await buildBundle(path.join(dir, "cli.js"))` once; an `after` hook that `fs.rm`s the temp dir. Name the bundle `cli.js` so its basename matches production.
   - **Test A — `--help` prints only the usage banner:** `spawnSync(process.execPath, [bundlePath, "--help"], { encoding: "utf8" })`, then assert:
     - `result.status === 0` (include `result.stderr` in the failure message).
     - `result.stderr === ""` — the strongest discriminator; on the buggy bundle at least one subcommand `main()` rejects and writes to stderr / exits non-zero.
     - `result.stdout` matches `/prism — PRISM consumer CLI/` (banner present).
     - `result.stdout` does **not** match `/prism:adopt|prism adopt:|Sync state:|Version:|prism eject/` — no subcommand `main()` leaked output.
   - **Test B — no-argument invocation:** `spawnSync(process.execPath, [bundlePath], ...)`; assert `status === 0`, `stderr === ""`, `stdout` matches `/Usage:/`, and the same `doesNotMatch` no-subcommand-leak assertion.
   - **Test C — unknown subcommand errors cleanly:** `spawnSync(process.execPath, [bundlePath, "definitely-not-a-command"], ...)`; assert `status === 1`, `stderr` matches `/unknown subcommand "definitely-not-a-command"/`, and `stdout` does **not** match `/prism:adopt|Sync state:|Version:/` (only `cli.ts`'s own error path ran).

   The marker regexes and banner strings are decisions — they must match `cli.ts`'s actual `USAGE` (`scripts/ai-skills/cli.ts:21-35`, which opens `prism — PRISM consumer CLI` and contains `Usage:`) and the subcommand CLIs' output prefixes (`prism:adopt`, `Sync state:`, `Version:`, `prism eject`). Verify: `node --test scripts/ai-skills/cli-bundle.test.ts` passes on the fixed tree. After tasks 1–6.

8. **Full verification.** Run, in order:

   ```bash
   pnpm run prism:check-types
   pnpm run prism:test
   ```

   Then prove the fix against a freshly built real bundle:

   ```bash
   pnpm run prism:bundle
   node dist/cli.js --help
   ```

   Expect `node dist/cli.js --help` to print only the usage banner, write nothing to stderr, and exit 0. `prism:test` must be green including the new `cli-bundle.test.ts` on the local run (CI runs it on `ubuntu-latest` and `windows-latest`). After tasks 1–7; last task before commit. (Do not run `pnpm prism:build` as part of planning — that is Clove's verification step, not the planner's.)

---

## Acceptance Criteria

### Behavioral

- [ ] **AC-1 — The compiled bundle runs no subcommand on `--help`.** Given a freshly built `dist/cli.js`, When `node dist/cli.js --help` runs, Then it prints the usage banner, writes nothing to stderr, and exits 0 — no subcommand `main()` fires. (Debug-1)
  - Evidence (`machine`): `cli-bundle.test.ts` Test A — `status === 0`, `stderr === ""`, stdout matches the banner and does not match any subcommand-output marker.

- [ ] **AC-2 — Bare invocation runs no subcommand.** Given a freshly built `dist/cli.js`, When `node dist/cli.js` runs with no arguments, Then it prints the usage banner and exits 0 with empty stderr. (Debug-1)
  - Evidence (`machine`): `cli-bundle.test.ts` Test B.

- [ ] **AC-3 — An unknown subcommand errors cleanly.** Given a freshly built `dist/cli.js`, When invoked with an unrecognized subcommand, Then it prints `unknown subcommand "…"` to stderr, exits 1, and no subcommand `main()` output appears. (Debug-1)
  - Evidence (`machine`): `cli-bundle.test.ts` Test C.

- [ ] **AC-4 — Each subcommand runs alone in a real consumer repo.** Given an onboarded consumer repo with the linked/global `prism`, When `prism doctor` (and, separately, `prism adopt`) runs, Then only that subcommand's output and side effects occur — the other three subcommands do not run. (Debug-1)
  - Evidence (`human`): in a consumer repo, run `prism doctor` and confirm the output is a single doctor report (config/sync/version findings), with no adopt/eject/update output interleaved. Requires a linked or global `prism` on PATH, so it is not agent-verifiable end to end.

### Non-behavioral

- [ ] **AC-5 — The standalone dev path still runs exactly one subcommand.** Given the source tree, When `pnpm prism:doctor` runs (`tsx doctor.ts`), Then only `runDoctorCli` executes — `adopt`/`eject`/`update` do not self-fire. (Debug-1)
  - Evidence (`machine`): `pnpm prism:doctor` in the PRISM repo prints a single doctor report; no adopt/eject/update output appears.

- [ ] **AC-6 — Self-location is unchanged; the esbuild config is unchanged.** Given the refactor, When the existing adopt/update suites run (they exercise `resolveSelfPrismSource`), Then they pass — the bundle still resolves its package root from `import.meta.url`, and `bundle.ts`'s esbuild options are byte-identical. (REQ-1)
  - Evidence (`machine`): `pnpm run prism:test` green (including `cli.test.ts`, `adopt.test.ts`, `update.test.ts`); `git diff scripts/ai-skills/bundle.ts` shows no change to any esbuild option key or value.

- [ ] **AC-7 — CI is green on both matrix legs, new test included.** `pnpm install --frozen-lockfile` then `pnpm prism:check` succeeds on `ubuntu-latest` and `windows-latest`, with `cli-bundle.test.ts` running under `prism:test` on both. (REQ-1)
  - Evidence (`machine`): the `PRISM Check` workflow on the PR — both matrix jobs green.

### AC Adjustments

### AC Sync Log

| Date | Agent | Action | Plan | Ticket |
| ---- | ----- | ------ | ---- | ------ |

---

## Sessions

- 2026-07-22 [main] open: Intent — turn Sol's already-diagnosed multi-main bundle bug into an executable fix plan (evaluate + plan, no code); Bounds — write this plan file only, no branch, no code, no `prism:build`; Approach — verify the diagnosis against source, refine the `argv[2]` fix direction to bundle-safe entry-basename detection, front-load exact per-file edits · close: scope held

---

## History

- 2026-07-22 [main]: Winston wrote this plan from Sol's dispatched diagnosis (multi-main bundle bug). Confirmed the four bundled guard-carriers (adopt/doctor/eject/update) against source, found `resolveSelfPrismSource` relies on the same `import.meta.url` collapse (fix must stay at the guard level), and refined the `argv[2]` direction to an `isDirectCliEntry` basename helper to avoid a double-run on the matched subcommand. Eight tasks, all Clove; no code written.

---

## Debugged Issues

### Bundled `dist/cli.js` runs every subcommand's `main()` on any invocation

- **Status:** `open`
- **Severity:** High
- **Confidence:** `High` (Confirmed root cause + deterministic repro on `main`'s own committed bundle)
- **Environment:** Compiled `dist/cli.js` (npm/npx and global-link consumer paths). Not reproducible via `tsx` source runs — the bug requires the esbuild bundle.
- **File:** `scripts/ai-skills/adopt.ts:340`, `doctor.ts:539`, `eject.ts:700`, `update.ts:1150` (the four `import.meta.url === argv[1]` entry guards)
- **Root cause:** `[Confirmed]` esbuild's ESM bundle collapses every folded module's `import.meta.url` to the single output URL (`dist/cli.js`), so all four `const isMain = ... fileURLToPath(import.meta.url) === path.resolve(process.argv[1])` guards evaluate true at once and run their `runXCli()` alongside `cli.ts`'s dispatch.
- **Steps to Reproduce:**
  1. Build the bundle (`pnpm prism:bundle`).
  2. Run `node dist/cli.js --help`.
  3. Observe subcommand `main()` output/errors in addition to the usage banner (buggy); non-zero exit as a subcommand CLI rejects.
- **Expected behavior:** `node dist/cli.js --help` prints only the usage banner and exits 0.
- **Actual behavior:** Every subcommand's `main()` fires; extra output and a non-zero exit.
- **Refuted hypotheses:**
  - "It's a `tsx`-only issue" — refuted: unbundled `tsx <file>.ts` runs the intended single subcommand; the fault is bundle-specific.
  - "esbuild should be reconfigured to preserve per-module `import.meta.url`" — refuted: `update.ts:981` (`resolveSelfPrismSource`) relies on the collapse to locate the package root from `dist/cli.js`; preserving per-module URLs would break self-location. The fix belongs at the guard level.
- **Recommended fix:** Replace the four guards with `isDirectCliEntry(entryName)` (entry-script-basename detection); leave `cli.ts`'s `argv[2]` switch as the sole dispatcher; leave `resolveSelfPrismSource` and the esbuild config untouched. See `## Decisions` and `## Implementation Tasks`.
- **Suggested tests:** Compiled-bundle integration test (`cli-bundle.test.ts`) — build the real bundle, run `node <bundle> --help` / bare / unknown-subcommand, assert exit + clean stderr + no subcommand-output leak. Unit tests cannot cover this class (they read source, not the bundle).
- **Ticket:** `N/A`

---

## Review Issues

---

## Cleanup Items

---

## PR Readiness

- [ ] No critical or major issues
- [ ] Types correct — no `any`, no unsafe `as`
- [ ] No stray console.logs or debug artifacts
- [ ] Tests written for new logic and edge cases (`cli-bundle.test.ts` — the compiled-bundle regression guard)
- [ ] All debugged issues resolved (Debug-1 flipped to `fixed`)
- [ ] Build passes — last run: —
- [ ] PR description up to date
- [ ] Lasting decisions promoted to architect context (if applicable — evaluate the `isDirectCliEntry` / bundle-entry-guard pattern at close)

**Last updated:** 2026-07-22
