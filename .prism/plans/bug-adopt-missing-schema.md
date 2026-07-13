# Plan: bug-adopt-missing-schema

> Closed: 2026-07-13
> Retro: light charter-fidelity check (ticket grain, inline) — PASS: plan intent + all 10 acceptance criteria match the shipped branch diff; no divergence, no refuted decisions, no promotion cautions.

## Goal

Root-cause why `npx @huntermcgrew/prism adopt` fails with "Missing config schema" against the published package while `init` succeeds — and ship a consolidated 0.7.2 fix for the three packaging bugs surfaced during the todo-app adopt (schema omission, dogfooding-content contamination, dry-run paths.json crash) plus the gates that make each class non-recurring.

## Implementation Tasks

Grouped under Clove. Each task names the file, the exact change, verification, and sequence. Reviewable as one 0.7.2 PR (see Decision "One PR, commit-per-bug").

### Clove (implementation)

**Bug #1 — publish the schema + version bump (independent, do first).**

1. **Add the runtime-read schema to the publish allowlist.** In `package.json`, the `files` array, add `".ai-skills/config.schema.json"` immediately after the `".ai-skills/config.json"` entry (keep it grouped with the other `.ai-skills/` leaf files). Verify: `npm pack --dry-run --json | grep config.schema.json` returns a match (currently returns nothing). (Debug-1)

2. **Bump the version.** In `package.json`, change `"version": "0.7.1"` to `"version": "0.7.2"`. No verification beyond the build. Parallel with task 1.

**Bug #2 — source consumer content from the genericized install seed, not the raw dogfooding tree.**

3. **Add the single content-root seam.** In `scripts/ai-skills/update.ts`, add an exported helper next to `resolvePrismSource` (after the `resolvePrismSource` function, ~line 794):

   ```ts
   /**
    * Resolves the tree a consumer pulls canonical PRISM-owned content from: the
    * genericized install seed at `templates/install/.prism`, never PRISM's own
    * raw `.prism/` dogfooding tree. Both `prism:adopt` and `prism:update` source
    * consumer content through this one seam so they can never drift onto the raw
    * tree — which leaks PRISM-internal literals and dogfooding plans into the
    * consumer. See plan Decision "Consumer content sources from the install seed".
    */
   export function resolvePrismContentRoot(prismSourceRoot: string): string {
   	return path.join(prismSourceRoot, "templates", "install", ".prism");
   }
   ```

4. **Repoint `prism:update` at the seam.** In `scripts/ai-skills/update.ts`, in `runUpdateCli` (line 841), replace `const prismContentRoot = path.join(prismRepoRoot, ".prism");` with `const prismContentRoot = resolvePrismContentRoot(prismRepoRoot);`. Then update the absence guard message just below (line 844–848): change `PRISM source has no .prism/ directory at ${prismContentRoot}.` to `PRISM install seed missing at ${prismContentRoot} — run pnpm prism:build in the PRISM source to generate it.`. After task 3. Blocks tasks 7–8.

5. **Repoint `prism:adopt` at the seam.** In `scripts/ai-skills/adopt.ts`, line 184, replace `const prismContentRoot = path.join(prismSourceRoot, ".prism");` with `const prismContentRoot = resolvePrismContentRoot(prismSourceRoot);`. Add `resolvePrismContentRoot` to the existing `import { ... } from "./update";` block (lines 31–37). After task 3. Note: phase A (`installSeedRoot`, line 182) already points at the same seed — post-fix phase A seeds the files and phase B (`runUpdate`) finds them byte-identical and no-ops them, so a fresh adopt produces no `.bak` and no overwrites (the clean-adopt outcome the handoff wants). Phase A is still required for consumer-owned seed files that `applyFilePass` skips (it only writes `classifyPath === "prism"` paths) — do not remove it.

6. **Source version metadata from `package.json`, not the (now-absent) seed manifest.** The install seed ships no `.sync-manifest.json`, so `loadSyncManifest(prismContentRoot)` would return `null` and version deltas would collapse to `"0.0.0"`. Fix by threading explicit version metadata, resolved from the always-shipping `package.json`:

   - In `scripts/ai-skills/build.ts`, add `export` to `resolvePrismVersion` (line ~729) and `resolveSourceCommit` (line ~749). No other change to those functions — `resolveSourceCommit` already returns `"unknown"` in a tarball (no git), which is the correct consumer-side value.
   - In `scripts/ai-skills/update.ts`, add `resolvePrismVersion, resolveSourceCommit` to the existing `import { syncAllPlatformContentCopies } from "./build";` (line 25).
   - Add the type near `VersionDelta` (after line 83):
     ```ts
     /** Version/commit labels for the consumer manifest, resolved from the PRISM
      * package (`package.json` version, git-or-`unknown` commit) rather than any
      * shipped manifest — see plan Decision "Version metadata from package.json". */
     export interface VersionMetadata {
     	prismVersion: string;
     	sourceCommit: string;
     }
     ```
   - Add a fallback resolver (used only by unit-test callers that omit metadata) after `computeVersionDelta`:
     ```ts
     async function deriveMetadataFromSourceManifest(
     	prismContentRoot: string
     ): Promise<VersionMetadata> {
     	const sm = await loadSyncManifest(prismContentRoot);
     	return {
     		prismVersion: sm?.prismVersion ?? "0.0.0",
     		sourceCommit: sm?.sourceCommit ?? "unknown",
     	};
     }
     ```
   - Change `computeVersionDelta` (line 464) to take a resolved current version instead of a manifest: signature `computeVersionDelta(currentVersion: string, previousConsumerManifest: SyncManifest | null): VersionDelta`; body sets `const current = currentVersion;` and keeps `previous`/`changed` as-is (delete the `sourceManifest?.prismVersion ?? ... ?? "0.0.0"` line).
   - Change `rewriteConsumerManifest` (line 485) to accept an optional 4th param `versionMetadata?: VersionMetadata`. First line: `const metadata = versionMetadata ?? (await deriveMetadataFromSourceManifest(prismContentRoot));`. Compute `const versionDelta = computeVersionDelta(metadata.prismVersion, previousConsumerManifest);`. Pass `sourceCommit: metadata.sourceCommit` into `generateSyncManifest` (replace the `sourceManifest?.sourceCommit ?? "unknown"` line). Delete the now-unused `const sourceManifest = await loadSyncManifest(prismContentRoot);`.
   - Change `previewVersionDelta` (line 510) to `previewVersionDelta(prismContentRoot, previousConsumerManifest, versionMetadata?)`: `const metadata = versionMetadata ?? (await deriveMetadataFromSourceManifest(prismContentRoot)); return computeVersionDelta(metadata.prismVersion, previousConsumerManifest);`.
   - Change `applyFilePass` (line 297) to accept a trailing optional `versionMetadata?: VersionMetadata`, and thread it into both the `previewVersionDelta(prismContentRoot, consumerManifest, versionMetadata)` and `rewriteConsumerManifest(prismContentRoot, consumerContentRoot, consumerManifest, versionMetadata)` calls (lines 352–358).
   - In `runUpdate` (line 391), before the `applyFilePass` call (line 430), resolve `const versionMetadata: VersionMetadata = { prismVersion: await resolvePrismVersion(prismRepoRoot), sourceCommit: await resolveSourceCommit(prismRepoRoot) };` and pass it as the 5th arg to `applyFilePass`.

   After tasks 3–5. Verify: `pnpm run prism:check-types`.

7. **Add the build-time seed dogfooding-literal canary.** In `scripts/ai-skills/literal-guard.ts`, after `LEFTOVER_TOKEN_PATTERN` (line 35), add:

   ```ts
   /**
    * Dogfooding literals that must never reach a consumer's `.prism/`. The de-
    * thriving set (`Thrive`/`TracTru`/`THR-`/`thrive.`) plus PRISM's own ticket
    * refs (`PRISM-NNN`) and the migration meta-reference (`de-thriving`). `Sol`,
    * `Iris`, `ADR-NNNN` are deliberately absent — they are legitimate framework
    * content that ships to consumers. Scans the install seed, the tree consumers
    * receive verbatim; allowlisted files (legitimate provenance) are exempt.
    */
   const SEED_DOGFOODING_PATTERN =
   	/(Thrive|tractru|TracTru\/thrive|THR-[0-9A-Z#*\\]+|thrive\.[a-zA-Z]+|PRISM-[0-9]+|de-thriving)/;
   ```

   Then add an exported entry point mirroring `runLeftoverTokenGuard` (after line 238):

   ```ts
   /**
    * Scans the install seed (`templates/install/.prism`) for dogfooding literals
    * that would reach a consumer's `.prism/` verbatim. Reuses the allowlist-aware
    * scan engine; one violation per matching line.
    */
   export async function runConsumerSeedLiteralGuard(
   	repoRoot: string,
   	seedRoot: string
   ): Promise<LiteralGuardViolation[]> {
   	return scanPlatformRoots(repoRoot, [seedRoot], SEED_DOGFOODING_PATTERN);
   }
   ```

   After task 3.

8. **Wire the seed canary into the build (both modes).** In `scripts/ai-skills/build.ts`: add `runConsumerSeedLiteralGuard` to the existing `import { runLeftoverTokenGuard, runLiteralGuard } from "./literal-guard";` (line 31). In `main()`, immediately after the `writeSeedMirror` block (after line 912, before `syncAgentsMdTier1Block`), add:

   ```ts
   if (await pathExists(templatesContentRoot)) {
   	const seedViolations = await runConsumerSeedLiteralGuard(
   		repoRoot,
   		templatesContentRoot
   	);
   	if (seedViolations.length > 0) {
   		for (const violation of seedViolations) {
   			console.error(
   				`seed-literal-guard: templates/install/.prism/${violation.relativePath}:${violation.line}: ${violation.match}`
   			);
   		}
   		console.error(
   			`seed-literal-guard: ${seedViolations.length} dogfooding literal(s) in the install seed — consumers receive this content verbatim. Genericize the canonical source, or allowlist the file in .ai-skills/definitions/literal-allowlist.json.`
   		);
   		process.exit(1);
   	}
   }
   ```

   This runs in both build and check mode (a correctness gate, not a volatile-output check). After task 7. Note: `scanPlatformRoots` builds the violation `relativePath` as repo-root-relative (`templates/install/.prism/architect/...`), so the `console.error` above double-prefixes — instead pass the violation's own `relativePath` directly without the extra prefix: use `` `seed-literal-guard: ${violation.relativePath}:${violation.line}: ${violation.match}` ``. Confirm the actual prefix by running the guard once against the seed and reading the printed path.

9. **Allowlist the one pre-existing seed provenance line.** In `.ai-skills/definitions/literal-allowlist.json`, append to `files`:

   ```json
   {
   	"path": "templates/install/.prism/architect/onboarding.md",
   	"reason": "provenance citation (PRISM-256/PRISM-250) in an architect doc; genericization tracked as follow-up — see plan bug-adopt-missing-schema"
   }
   ```

   This is the single existing hit (`architect/onboarding.md:49`). After task 7. Verify tasks 7–9 together: `pnpm run prism:build` exits 0 (seed guard green); temporarily inject `THR-9999` into a seed file and confirm the build fails, then revert.

**Bug #3 — make `adopt --dry-run` survive a fresh consumer.**

10. **Add a dry-run-tolerant path-definitions resolver.** In `scripts/ai-skills/utils.ts`, after `ensureConsumerPathDefinitions` (line 449), add:

    ```ts
    /**
     * Resolves the path definitions a run builds platform dirs from, tolerating a
     * fresh consumer under `--dry-run`. A real run always has a provisioned
     * consumer `paths.json` (`ensureConsumerPathDefinitions` wrote it); `--dry-run`
     * skips that write (compute-don't-write), so when the consumer file is absent
     * or structurally incomplete this falls back to the PRISM package's own
     * `paths.json` — the exact file a real adopt would have provisioned —
     * preserving preview fidelity instead of crashing. A real run with a
     * missing/incomplete file still defers to the strict loader so its throw
     * semantics are unchanged.
     */
    export async function resolveRunPathDefinitions(
    	prismSourceRoot: string,
    	consumerRepoRoot: string,
    	dryRun: boolean
    ): Promise<PathDefinitions> {
    	const consumerRaw = await readFileIfExists(
    		path.join(consumerRepoRoot, ".ai-skills", "definitions", "paths.json")
    	);
    	if (consumerRaw !== null) {
    		try {
    			const parsed = JSON.parse(consumerRaw);
    			if (isPathDefinitionsComplete(parsed)) {
    				return parsed;
    			}
    		} catch {
    			// Unparseable — fall through to the dry-run fallback / strict loader.
    		}
    	}

    	if (dryRun) {
    		const packageRaw = await readFileIfExists(
    			path.join(prismSourceRoot, ".ai-skills", "definitions", "paths.json")
    		);
    		if (packageRaw !== null) {
    			const parsed = JSON.parse(packageRaw);
    			if (isPathDefinitionsComplete(parsed)) {
    				return parsed;
    			}
    		}
    	}

    	return loadPathDefinitions(consumerRepoRoot);
    }
    ```

11. **Use the resolver in `runUpdate`.** In `scripts/ai-skills/update.ts` line 409, replace `const consumerPathDefinitions = await loadPathDefinitions(consumerRepoRoot);` with `const consumerPathDefinitions = await resolveRunPathDefinitions(prismRepoRoot, consumerRepoRoot, dryRun);`. Add `resolveRunPathDefinitions` to the existing `import { ... } from "./utils";` (lines 48–55); `loadPathDefinitions` may stay imported (still used elsewhere) — leave it. After task 10. Verify: `pnpm run prism:check-types`. (Debug-3)

**Packaging-parity gate (bug #1's 5-Whys terminus).**

12. **Add the pack-parity check script.** Create `scripts/ai-skills/verify-pack-parity.ts`. It asserts every file the CLI reads from `prismSourceRoot` at runtime is present in `npm pack --dry-run --json` output. v1 uses a hand-maintained runtime-read list (acceptable tradeoff — see Decision "Pack-parity gate"). Full content:

    ```ts
    #!/usr/bin/env tsx
    /**
     * Packaging-parity gate: asserts every path the CLI reads from the PRISM
     * package at runtime is present in the published tarball. Closes the class of
     * bug where a file is git-tracked and read at runtime but omitted from the
     * `files` allowlist (config.schema.json shipped broken in 0.7.1 this way).
     *
     * v1: a hand-maintained list of runtime-read paths, checked against
     * `npm pack --dry-run --json`. Unit tests can't catch this class — they read
     * the source tree, not the tarball. Keep RUNTIME_READ_PATHS in sync when a new
     * runtime read of a packaged file is added.
     */
    import { execFile } from "node:child_process";
    import { promisify } from "node:util";

    const execFileAsync = promisify(execFile);

    /** Each entry is a path (file) or path prefix (directory) the CLI reads from
     * the package root at runtime. Comment names the runtime reader. */
    const RUNTIME_READ_PATHS: { path: string; reader: string; kind: "file" | "prefix" }[] = [
    	{ path: ".ai-skills/config.schema.json", reader: "config-schema-validate.ts loadConfigSchema", kind: "file" },
    	{ path: ".ai-skills/definitions/paths.json", reader: "utils.ts ensureConsumerPathDefinitions / resolveRunPathDefinitions", kind: "file" },
    	{ path: ".ai-skills/definitions/roles.json", reader: "update.ts refreshPlatformSkills", kind: "file" },
    	{ path: "templates/install/.prism", reader: "adopt/update consumer content root (resolvePrismContentRoot)", kind: "prefix" },
    	{ path: ".ai-skills/skills", reader: "update.ts refreshPlatformSkills sourceSkillsRoot", kind: "prefix" },
    ];

    async function main(): Promise<void> {
    	const { stdout } = await execFileAsync("npm", ["pack", "--dry-run", "--json"]);
    	const parsed = JSON.parse(stdout) as { files: { path: string }[] }[];
    	const packed = new Set(parsed.flatMap((entry) => entry.files.map((f) => f.path)));
    	const packedList = [...packed];

    	const missing = RUNTIME_READ_PATHS.filter((req) =>
    		req.kind === "file"
    			? !packed.has(req.path)
    			: !packedList.some((p) => p === req.path || p.startsWith(`${req.path}/`))
    	);

    	if (missing.length > 0) {
    		for (const req of missing) {
    			console.error(
    				`verify-pack-parity: runtime-read ${req.kind} "${req.path}" is missing from the tarball (read by ${req.reader}). Add it to package.json "files".`
    			);
    		}
    		console.error(
    			`verify-pack-parity: ${missing.length} runtime-read path(s) not published — see above.`
    		);
    		process.exit(1);
    	}

    	console.log(`verify-pack-parity: all ${RUNTIME_READ_PATHS.length} runtime-read path(s) present in the tarball.`);
    }

    main().catch((error: unknown) => {
    	console.error(error instanceof Error ? error.message : String(error));
    	process.exit(1);
    });
    ```

13. **Wire the gate into `prism:check`.** In `package.json` `scripts`, add `"prism:verify-pack": "tsx scripts/ai-skills/verify-pack-parity.ts"`, and append ` && pnpm run prism:verify-pack` to the end of the `prism:check` script string. This transitively covers `prepublishOnly` (which runs `prism:check`). Confirm no `prepack` script exists (there is none), so `npm pack --dry-run` inside the gate does not recurse. After tasks 1, 12. Verify: `pnpm run prism:verify-pack` prints the all-present line; temporarily remove `.ai-skills/config.schema.json` from `files` and confirm the gate fails, then restore. (Debug-1)

**Tests.**

14. **Cover the fixes.** Add/extend tests — name the file and the contract; test bodies are the implementer's:
    - `scripts/ai-skills/adopt.test.ts`: fixture writes *different* content to `.prism/rules/<f>.md` (raw) vs `templates/install/.prism/rules/<f>.md` (seed); assert after `runAdopt` the consumer `.prism/rules/<f>.md` equals the **seed** content and no `<f>.md.bak` exists; assert no `THR-`/`PRISM-[0-9]` literal appears anywhere under the consumer `.prism/`. (Debug-2)
    - `scripts/ai-skills/update.test.ts`: assert `runUpdate` sources consumer content from the seed (same fixture shape); assert the recorded manifest's `prismVersion` equals the fixture `package.json` version (not `0.0.0`); assert `applyFilePass` called without `versionMetadata` still produces a valid summary (back-compat seam preserved).
    - `scripts/ai-skills/adopt.test.ts`: `runAdopt({ dryRun: true })` on a fixture with `.ai-skills/config.json` but **no** `paths.json` completes without throwing; a second fixture whose `paths.json` omits `generated.platformContentCopies` also completes. (Debug-3)
    - `scripts/ai-skills/literal-guard.test.ts`: `runConsumerSeedLiteralGuard` flags `PRISM-1234`, `THR-1`, and `de-thriving` in a seed fixture and returns zero for an allowlisted file.
    - New `scripts/ai-skills/verify-pack-parity.test.ts` **or** a focused assertion: given a `files` list missing `config.schema.json`, the parity logic reports it missing; present, it passes. (If mocking `npm pack` is heavy, factor the set-difference logic into a pure exported function and unit-test that.) (Debug-1)

    Verify all: `pnpm run prism:test`.

15. **Full gate.** Run `pnpm run prism:check` — types, lint, tests, manifest, crossref, and the new pack-parity gate all green. This is the pre-PR bar. After tasks 1–14.

## Decisions

- **Consumer content sources from the install seed, at both entry points (bug #2 root fix).**
  - **Root cause:** `prismContentRoot` was hardcoded to `<prismSourceRoot>/.prism` — PRISM's raw 367-file dogfooding tree — at **both** `adopt.ts:184` and `update.ts:841`. `applyFilePass` enumerates (`listPrismOwnedRelativePaths`) and copies PRISM-owned files verbatim from that root, so adopt phase B overwrote the correct genericized phase-A seed, and steady-state `prism:update` would re-contaminate any clean consumer on its first run. The intended consumer source is the curated, genericized, build-verified install seed at `templates/install/.prism` (117 files; `checkSeedDrift`/`writeSeedMirror` keep it in parity with canonical).
  - **Alternatives considered:** (a) fix adopt only — rejected: `update.ts:841` shares the identical hardcode, so a clean adopt gets re-contaminated by the next `prism:update`; the bug is a shared-sourcing flaw, not an adopt-phase-B quirk. (b) genericize the raw `.prism/` on read via token substitution — rejected: token substitution only catches `${TOKEN}`/configured literals (`Thrive`→`${PROJECT}`); it can't strip prose refs like `THR-1775`/`PRISM-404`/`ADR-0047`, which is exactly the contamination. The seed is the artifact that's already been curated to remove these.
  - **Chosen approach:** one exported seam `resolvePrismContentRoot(prismSourceRoot)` → `templates/install/.prism`, used at both call sites. Two call sites that must agree on the same resolution = a real seam (code-standards "two adapters earn the abstraction"); centralizing prevents the exact drift that let update.ts diverge from adopt.ts. Post-fix, adopt phase A and phase B source the same tree, so phase B no-ops the seeded files — a fresh adopt yields no `.bak`, no overwrites.
  - **Blast radius (shared surface — flagged per code-standards "stop and explain before changing shared utilities"):** this changes `runUpdate`'s content source for *every* consumer, not just adopt. Safe now because the npm package is unpublished and no committed consumer baselines exist (todo-app never committed its adopt output), so no manifest is stranded. A consumer with an existing raw-`.prism/`-sourced baseline would see a one-time re-sync toward seed content on first 0.7.2 update — acceptable and correct (that content was contaminated).
  - → promoted to `.prism/architect/_toolkit/install-layout.md` (§ Consumer content sources through one seam) — the content-root seam is a durable architectural rule governing every future adopt/update sourcing decision, not a ticket tactic.

- **Version metadata comes from `package.json`, not a shipped manifest (bug #2 support).**
  - **Root cause:** the install seed ships no `.sync-manifest.json` (and `.prism/.sync-manifest.json` is gitignored to avoid per-commit churn), so once content roots move to the seed, `loadSyncManifest(prismContentRoot)` returns `null` and the version delta collapses to `"0.0.0"`.
  - **Alternatives considered:** (a) ship a self-describing `.sync-manifest.json` inside the seed — rejected: adds a build step, breaks the established "don't commit generated manifests" gitignore posture, and re-opens the gitignored-file-inside-a-listed-dir packing ambiguity (the exact bug-#1 class). (b) read version/commit from the raw `.prism/.sync-manifest.json` while hashing files from the seed — rejected: depends on a gitignored file shipping (bug-#1 class again) and keeps a foot in the raw tree, the split-brain that caused this bug.
  - **Chosen approach:** resolve `prismVersion` from `package.json` (always ships, authoritative — reuses the existing `resolvePrismVersion` helper) and `sourceCommit` from git-or-`"unknown"` (already the tarball fallback). Thread as an optional `VersionMetadata` so the unit-test seam (`applyFilePass` against a bare fixture) is preserved via a manifest-reading fallback. Fully severs the raw-tree coupling with no new files, gitignore changes, or churn.
  - → no promotion needed (implementation consequence of the content-root seam; captured alongside it in `install-layout.md` § Consumer content sources through one seam).

- **Build-time seed dogfooding-literal canary (bug #2 gate).**
  - **Chosen approach:** scan the install seed — the tree consumers receive verbatim — for dogfooding literals at build time, failing `prism:build` on any non-allowlisted hit. Reuses the existing allowlist-aware `scanPlatformRoots` engine (new pattern + entry point, ~15 lines). Pattern = the existing de-thriving set (`Thrive`/`TracTru`/`THR-`/`thrive.`) plus `PRISM-[0-9]+` and `de-thriving`. `Sol`/`Iris`/`ADR-NNNN` are deliberately **not** matched — they are legitimate framework content that ships to consumers. Asserting on the seed is deterministic (vs. simulating an adopt) because the seed is exactly what's copied into a consumer.
  - **The one existing hit:** `templates/install/.prism/architect/onboarding.md:49` cites `PRISM-256`/`PRISM-250` in a provenance line. Allowlisted (not genericized) to keep this PR scoped to packaging and ship the gate green; genericizing that dangling ref is tracked as follow-up (see History).
  - → promoted to `.prism/architect/_toolkit/install-layout.md` (§ Consumer content sources through one seam → Seed dogfooding-literal canary) — durable build-guard invariant: consumers receive the seed verbatim, so the canary is a lasting rule, not a ticket tactic.

- **Dry-run tolerates a fresh consumer's absent/incomplete `paths.json` (bug #3 fix).**
  - **Root cause:** `ensureConsumerPathDefinitions` skips the `paths.json` write under `--dry-run` (utils.ts:443, compute-don't-write), but `runUpdate` reads it unconditionally at `update.ts:409` → throws (absent) or `TypeError`s (incomplete, missing `platformContentCopies`) on a fresh `init`'d consumer.
  - **Alternatives considered:** guard/skip the downstream read under dry-run — rejected: skipping the read means the dry-run can't preview the platform-dir set, defeating the preview's purpose. **Chosen approach:** a resolver that, under dry-run with an absent/incomplete consumer file, falls back to the PRISM package's own `paths.json` — the exact file a real adopt would have provisioned — so the preview reflects a real run's platform dirs. Real runs are behavior-identical (they defer to the strict loader), so only dry-run gains tolerance. Preserves preview fidelity, which the "guard the read" alternative sacrifices.
  - → no promotion needed (dry-run seam detail).

- **Packaging-parity gate placement (bug #1's 5-Whys terminus).**
  - **Chosen approach:** a `verify-pack-parity.ts` script asserting every runtime-read path from `prismSourceRoot` appears in `npm pack --dry-run --json`, wired into `prism:check` (which `prepublishOnly` runs — one placement covers both CI and pre-publish). v1 uses a hand-maintained `RUNTIME_READ_PATHS` list; the tradeoff (a new runtime read of a packaged file must be added to the list) is acceptable for v1 and called out in the script header. Unit tests structurally cannot catch this class — they read the source tree, never the tarball.
  - → promoted to `.prism/architect/_toolkit/install-layout.md` (§ Packaging-parity gate) — durable rule governing every future `package.json` `files` edit: a runtime-read packaged file omitted from the publish surface is the exact bug #1 class.

- **One PR, commit-per-bug (reviewability call).** The changes are cohesive — all live under `scripts/ai-skills/` and tell one story ("adopt/update publish and source correctly"), and the gates validate the fixes they ship beside (pack-parity validates #1; seed guard validates #2). Bug #2 is the bulk but not independently large enough to warrant splitting review. Recommend one 0.7.2 PR with commit boundaries per bug (git-conventions § Commit Granularity allows multi-commit for multi-task work) so the reviewer reads clean boundaries without a split.
  - → no promotion needed (process call for this ticket).

## History

- 2026-07-12 [main]: Diagnosed — `.ai-skills/config.schema.json` is absent from the npm `files` allowlist, so the published tarball omits it; `adopt`/`doctor`/`update` read it at runtime and throw, while `init` never touches the schema. Confirmed deterministically via `npm pack --dry-run`.
- 2026-07-12 [main]: Verified unblock path — `--prism-source <local-checkout>` routes through `resolvePrismSource` (update.ts:779) to `prismSourceRoot`, resolving the schema from the local tree (present, 11512 bytes). Clears the schema error (High). Full first-adopt completion not exercised (Medium). Corrected introducing commit: `5a32655` = PRISM-376 (#387), not PRISM-377.
- 2026-07-12 [main]: Verified bug #3 (Confirmed/High) — `adopt --dry-run` on a fresh consumer crashes because the provision write is skipped (utils.ts:443) while `runUpdate` reads consumer paths.json unconditionally (update.ts:409); relayed "silent preview gap" refuted — it's a crash. Corroborated bug #2 direction (Confirmed/High, code-path only) — adopt phase B sources canonical from `<prismSourceRoot>/.prism` (dogfooding, adopt.ts:184) not `templates/install/.prism`, overwriting phase-A seed. Both warrant 0.7.2 fix tasks; no fixes written, bug #2 design left to Winston.
- 2026-07-12 [main] (Winston): Designed the consolidated 0.7.2 fix and authored `## Implementation Tasks` + `## Decisions` + `## Acceptance Criteria`. Key finding beyond Sasha's trace: bug #2 is a shared-sourcing flaw — `update.ts:841` has the same raw-`.prism/` hardcode as `adopt.ts:184`, so the fix routes both through one `resolvePrismContentRoot` seam at the install seed and sources version metadata from `package.json` (seed ships no manifest). Follow-up: genericize the `PRISM-256/250` provenance line in `templates/install/.prism/architect/onboarding.md` (allowlisted for now).
- 2026-07-12 [huntermcgrew/adopt-packaging-fixes-0.7.2] (Clove): Implemented all 15 tasks — published `config.schema.json` + `verify-pack-parity` gate (commit `f84bdab`), and the `resolvePrismContentRoot` seam + package.json-sourced version metadata + seed-literal canary + `resolveRunPathDefinitions` dry-run fallback (commit `2b486f2`). Combined bugs #2 and #3 into one commit rather than bug-per-commit — `update.ts` interleaves both fixes in adjacent regions, and a hand-split patch risked a non-compiling intermediate commit. `pnpm run prism:check` is green (502 tests, all gates); all live canary/parity verifications (schema-present, schema-missing-fails, THR-9999-injection-fails, Sol/Iris/ADR-NNNN-survive) confirmed by hand.
- 2026-07-12 [huntermcgrew/adopt-packaging-fixes-0.7.2] (Clove): Folded in Eric's two PR-review Minors — added a seed-guard canary negative test locking in the `Sol`/`Iris`/`ADR-NNNN` exclusion, and extracted `readCompletePathDefinitionsIfPresent` in `utils.ts` so all three paths.json read sites (including the previously-unguarded package-file parse in `resolveRunPathDefinitions`) share one guarded read-parse-completeness helper. Added a regression test for the newly-guarded malformed-package-file path. `pnpm run prism:check` green (504 tests, all gates).
- 2026-07-13 [huntermcgrew/adopt-packaging-fixes-0.7.2] (Winston): Pre-merge plan-close ceremony on PR #410. Light ticket-grain charter-fidelity reflect passed — plan intent + all 10 AC match the shipped diff, no refuted decisions. Promoted three durable packaging invariants (content-root seam, seed-literal canary, packaging-parity gate) to `.prism/architect/_toolkit/install-layout.md`; all six Decisions carry verdicts; plan closed.

## Sessions

- 2026-07-12 [main] open: Intent — root-cause the adopt "Missing config schema" failure; Bounds — done at an evidence-graded root cause, no source fixes; Approach — diff/packaging inspection before instrumentation · close: scope held
- 2026-07-12 [main] open: Intent — verify bug #3 (dry-run paths.json sequencing) and corroborate the direction of bug #2 (adopt sources canonical from dogfooding tree) at the code level for Winston/Clove; Bounds — two evidence-graded verdicts in this plan, no fixes, no bug #2 fix design (Winston's lane), plan is the only file written; Approach — static control-flow trace via symbols not line numbers, no instrumentation · close: scope held — both confirmed by trace; bug #3 mechanism refined (crash, not silent preview); bug #2 corroborated code-path-only (fs proof lives in consumer repo)
- 2026-07-12 [main] (Winston) open: Intent — design minimal correct fixes for the three confirmed 0.7.2 packaging bugs + parity/canary gates and author Clove-executable tasks; Bounds — plan gets Decisions + to-bar Tasks + AC, no code/commit, Debugged Issues untouched; Approach — one content-root seam at the install seed, version from package.json, reuse existing scan engine for the seed canary · close: scope held — plan-only writes; confirmed bug #2 is shared across adopt+update and designed the fix at both sites; version-metadata sourcing solved via package.json; one-PR call made
- 2026-07-12 [huntermcgrew/adopt-packaging-fixes-0.7.2] (Clove) open: Intent — implement Winston's 15 tasks and ship a draft PR; Bounds — all tasks green under `prism:check`, plan updated, draft PR open, no `.prism/lessons.md`/`.prism/conductor/` in the commit; Approach — execute tasks in sequence, verify against real source before each edit · close: scope held — all 15 tasks implemented; one plan-defect fix applied inline (task 12's exact script content lacked the `isMain` guard every other CLI script in this codebase uses, so importing it for a unit test shelled out to `npm pack` as a side effect — added the guard, matching the established pattern); one keystroke-level deviation (task 11's "loadPathDefinitions may stay imported" assumption didn't hold post-edit — removed the now-unused import); commit-per-bug became commit-per-bug-cluster (bugs #2+#3 combined) because `update.ts` interleaves both fixes and a hand-split patch risked a broken intermediate commit — flagged in Decisions/History, not silently done
- 2026-07-12 [huntermcgrew/adopt-packaging-fixes-0.7.2] (Briar) open: Intent — self-review the branch before PR review, dispatched by Sol; Bounds — chat-only findings plus plan writes to `## Review Issues`/`## PR Readiness`, no code changes, no GitHub posts; Approach — full diff read against the plan's Decisions, source-level trace of the seam/canary/dry-run-fallback logic, targeted re-run of the four touched test suites plus type-check and the pack-parity gate standalone · close: scope held — verified the shared `resolvePrismContentRoot` seam has no other hardcoded raw-`.prism` call sites left, confirmed the seed canary pattern matches the seed tree with only the allowlisted hit, confirmed `isMain` guard and the `loadPathDefinitions` import removal both correct, re-ran 76/76 tests across `adopt.test.ts`/`update.test.ts`/`literal-guard.test.ts`/`verify-pack-parity.test.ts` clean plus `prism:check-types` clean plus the pack-parity gate standalone clean; one open Minor (duplicated paths.json completeness-check logic across two utils.ts functions) recorded, non-blocking
- 2026-07-12 [huntermcgrew/adopt-packaging-fixes-0.7.2] (Clove) open: Intent — fold Eric's two non-blocking PR-review Minors into draft PR #410 before re-review, dispatched by Sol; Bounds — both findings fixed, only source/test/plan files staged (lessons.md and conductor/ left untouched), new commit (not amend) pushed to the existing PR branch which stays draft; Approach — add the seed-guard negative test first (isolated, no shared-code risk), then extract the shared paths.json helper and route all three read sites through it, verify with the four affected suites plus full `prism:check` · close: scope held — both Minors fixed with tests, `pnpm run prism:check` green (504 tests, all gates), no other files touched
- 2026-07-13 [huntermcgrew/adopt-packaging-fixes-0.7.2] (Winston) open: Intent — run the pre-merge two-phase close on PR #410 and promote lasting packaging invariants; Bounds — plan verdicts + closed marker + Retro line, promotions to install-layout.md, close committed to PR #410 (left draft), no lessons.md/conductor/ touched; Approach — light ticket-grain reflect against the shipped diff, then verdict-gate + promote + close · close: scope held — reflect PASS, three invariants promoted to install-layout.md, all six Decisions carry verdicts, close committed to PR #410

## Debugged Issues

### `prism adopt` fails: config.schema.json missing from published package

- **Status:** `fixed`
- **Fixed in:** `f84bdab` (0.7.2) — added `.ai-skills/config.schema.json` to `package.json` `files`; added `verify-pack-parity.ts` wired into `prism:check`/`prepublishOnly`.
- **Severity:** High
- **Confidence:** `High` (Confirmed root cause + deterministic repro)
- **Environment:** Consumer repo running `npx @huntermcgrew/prism adopt`; PRISM resolved as its own source from the installed package dir (`~/.npm/_npx/<hash>/node_modules/@huntermcgrew/prism/`).
- **File:** `package.json` (`files` array) — missing entry; consumed by `scripts/ai-skills/lib/config-schema-validate.ts:172` (`loadConfigSchema`).
- **Root cause:** `[Confirmed]` — `.ai-skills/config.schema.json` is not listed in package.json's `files` allowlist, so npm excludes it from the published tarball; `validateConsumerConfigAgainstSchema` reads `<prismSourceRoot>/.ai-skills/config.schema.json` at runtime and throws when the file isn't there.
- **Steps to Reproduce:**
  1. `npx @huntermcgrew/prism init` (creates `.ai-skills/config.json`) — succeeds.
  2. `npx @huntermcgrew/prism adopt` — throws `Missing config schema at .../node_modules/@huntermcgrew/prism/.ai-skills/config.schema.json`.
  3. In the source repo: `npm pack --dry-run --json | grep config.schema` returns nothing (only `.ai-skills/config.json` is packed).
- **Expected behavior:** `adopt` validates the consumer config against the shipped schema and proceeds to seed `.prism/`.
- **Actual behavior:** `adopt` aborts at the schema-load step because the schema file was never published.
- **Why `init` survives:** `init` never calls the validator. Schema reads live only in `adopt.ts:202`, `doctor.ts:132`, and `update.ts:403` — so `doctor` and `update` are broken in the published package by the same cause; `init` is not.
- **5 Whys:** adopt fails → schema file missing from package → not in `files` allowlist → validator was wired in (commit `5a32655`, PRISM-376/#387 — "Adopt/update pre-write safety") without adding the file it reads to the publish surface → **root:** the publish allowlist and the runtime file-read set are maintained independently, with no gate enforcing parity. Tests pass because they resolve the schema from the source tree (where it exists), never from a packed tarball.
- **Recommended fix:** add `".ai-skills/config.schema.json"` to the `files` array in `package.json`, then republish (0.7.2). Verify with `npm pack --dry-run --json | grep config.schema.json` before publishing.
- **Immediate unblock (no republish):** run `adopt` against a local PRISM checkout — `npx @huntermcgrew/prism adopt --prism-source /Users/hunter/Documents/PRISM/PRISM`. Verified to clear the schema error (flag routing traced through `resolvePrismSource`; local schema present). Full first-adopt completion (seed + `runUpdate` writes) not exercised.
- **Suggested tests:** add a packaging-parity check to `prism:check` (or a `prepublishOnly` gate) that runs `npm pack --dry-run --json` and asserts every file the CLI reads from `prismSourceRoot` at runtime — at minimum `.ai-skills/config.schema.json` — appears in the pack list. This is the missing gate the 5 Whys terminates on; a unit test alone won't catch it because unit tests read the source tree, not the tarball.
- **Missing evidence:** none — root cause reproduced deterministically from the source tree.

### `adopt --dry-run` crashes on a fresh consumer: provision write skipped, downstream read unconditional

- **Status:** `fixed`
- **Fixed in:** `2b486f2` (0.7.2) — added `resolveRunPathDefinitions` (`utils.ts`), which falls back to the PRISM package's own `paths.json` under `--dry-run` when the consumer's is absent or structurally incomplete; wired into `runUpdate` (`update.ts:409`).
- **Severity:** Medium (dry-run is unusable on the exact first-run path it exists to preview; no data corruption, real adopt unaffected)
- **Confidence:** `High` (Confirmed via deterministic control-flow trace + reachability)
- **Environment:** `prism adopt --dry-run` against a consumer that has run `init` but not yet a real `adopt` (i.e. `.ai-skills/config.json` present, `.ai-skills/definitions/paths.json` absent).
- **File:** write skipped at `scripts/ai-skills/utils.ts:443` (`ensureConsumerPathDefinitions`); unconditional read at `scripts/ai-skills/update.ts:409` (`loadPathDefinitions`), deref at `update.ts:410` → `buildPlatformDirs` (`utils.ts:462/466`).
- **Root cause:** `[Confirmed]` — in dry-run, `ensureConsumerPathDefinitions` runs its existence/completeness checks and returns `"written"` but the `if (!dryRun)` guard (utils.ts:443–446) skips the actual write, so the consumer `paths.json` stays absent/incomplete. `runUpdate` (called next at `adopt.ts:213`) then reads that same consumer `paths.json` **unconditionally** at `update.ts:409` in its "resolve everything up front" block — before any dry-run write-guard — and either throws or crashes.
- **Observable consequence (traced, two sub-cases):**
  - Consumer `paths.json` **absent** → `loadPathDefinitions` at `update.ts:409` fails `pathExists` and throws `Missing path definitions: <consumer>/.ai-skills/definitions/paths.json`. Dry-run aborts.
  - Consumer `paths.json` **present but incomplete** (parses, missing `generated.platformContentCopies`) → `loadPathDefinitions` succeeds (it only parses; it does **not** call `isPathDefinitionsComplete`), then `buildPlatformDirs` at `update.ts:410` dereferences `pathDefinitions.generated.platformContentCopies.claude` (`utils.ts:462/466`) → `TypeError: Cannot read properties of undefined`. Dry-run aborts.
- **Reachability confirmed:** `init.ts` does not create `paths.json` (grep: no `paths.json` write outside `adopt.ts`/`utils.ts`), so the absent case is the default fresh-consumer state. `seedConsumerContentRoot` (`adopt.ts:212`) seeds `.prism/` from `templates/install/.prism`, not `.ai-skills/definitions/`, so it does not provision `paths.json` either. The provision the dry-run skips is the only thing that would have made the file present.
- **Control-flow ordering (`runAdopt`, adopt.ts):** `:206` provision (write skipped in dry-run) → `:212` seed (does not touch paths.json) → `:213` `runUpdate` → `update.ts:409` unconditional read → crash.
- **Refuted hypotheses:**
  - "Dry-run silently reports 'written' while producing a wrong-but-successful preview (preview-fidelity gap)" — refuted by the trace: the downstream read throws/crashes, so the dry-run does not complete with a wrong preview; it aborts. Original relayed finding under-stated both the severity and the mechanism.
  - Handoff line refs `utils.ts:317/327` for the "unconditional read" — those are the declaration/throw lines of `loadPathDefinitions`, not the call site. The unconditional *call* that crashes is `update.ts:409` (drifted from the relayed numbers; symbol-anchored here).
- **Recommended fix direction (not designed here):** align the dry-run seam so either the provision write is not skipped when a downstream read depends on it, or the downstream read tolerates the absent/incomplete file in dry-run. Winston/Clove own the design; this entry only confirms the mechanism.
- **Suggested tests:** `adopt --dry-run` against a fixture that has `config.json` but no `.ai-skills/definitions/paths.json`; assert it completes and previews the platform-dir set without throwing. Add a second fixture with a `paths.json` missing `platformContentCopies` to cover the `TypeError` sub-case.
- **Warrants a fix task in the 0.7.2 workstream:** yes — confirmed reachable crash on the first-run dry-run path.
- **Missing evidence:** none for the code-level trace. Not exercised as a live end-to-end `npx` run (deterministic from source; a live run would only re-confirm).
- **Ticket:** `N/A`

### Bug #2 direction: adopt phase-B sources canonical from the raw dogfooding tree, not the install surface

- **Status:** `fixed`
- **Fixed in:** `2b486f2` (0.7.2) — added `resolvePrismContentRoot` seam (`update.ts`), used at both `adopt.ts:184` and `update.ts:841`; added the build-time `runConsumerSeedLiteralGuard` canary and its `prism:build` wiring.
- **Severity:** High (every consumer adopt overwrites genericized content with PRISM-internal dogfooding literals)
- **Confidence:** `High` (Confirmed at the code-path level; consumer-side filesystem proof lives in the todo-app repo and is not visible from here — corroborated the direction claim only, per Sol's scope)
- **Environment:** `prism adopt` (any consumer, any source-resolution path — `--prism-source` or published package).
- **File:** phase-A seed source `adopt.ts:182` (`installSeedRoot = <prismSourceRoot>/templates/install/.prism`); phase-B canonical source `adopt.ts:184` (`prismContentRoot = <prismSourceRoot>/.prism`) → `adopt.ts:216` → `runUpdate` → `applyFilePass` (`update.ts:297`, source arg = `prismContentRoot`).
- **Root cause (direction):** `[Confirmed]` — `runAdopt` runs two phases against **different** source roots. Phase A (`seedConsumerContentRoot`, `adopt.ts:212`) seeds the consumer `.prism/` from `templates/install/.prism` (the genericized install surface). Phase B (`runUpdate`, `adopt.ts:213`) receives `prismContentRoot = <prismSourceRoot>/.prism` — PRISM's own dogfooding tree — and `applyFilePass` enumerates (`update.ts:304 listPrismOwnedRelativePaths(prismContentRoot)`) and copies (`update.ts:328 applyIncomingFile(..., prismContentRoot, consumerContentRoot, ...)`) from that raw tree into the consumer, backing up any phase-A file whose hash differs. So phase B overwrites the correct phase-A seed with raw dogfooding content — matching the handoff's `.bak == templates/install`, `written == raw PRISM/.prism` observation and the `17 backed-up, 65 written` counts.
- **Why source-independent:** `prismContentRoot` is hardcoded to `<prismSourceRoot>/.prism` (`adopt.ts:184`) regardless of how `prismSourceRoot` resolves (`resolvePrismSource`, `update.ts:774`), so `--prism-source <local-checkout>` and the published tarball both feed phase B the raw `.prism/`. The `--prism-source` flag changes *which* dogfooding tree, not *that* it's a dogfooding tree.
- **Scope note:** this corroborates the *direction* of the contamination claim only. The definitive filesystem proof (`diff -q` showing `.bak == templates/install/.prism/…`, `current == PRISM/.prism/…`) lives in the consumer repo (`~/Documents/todo_app/todo-app`), which is not visible from this repo. I did not design or recommend the fix — phase-B sourcing correction and the pack-level dogfooding-literal assertion are Winston's design lane.
- **Recommended fix:** not designed here — Winston owns bug #2's design (route phase-B canonical from `templates/install/.prism` and/or gate against dogfooding literals reaching a consumer `.prism/`).
- **Suggested tests:** owned by Winston's design; at minimum a pack/adopt assertion that no dogfooding literal (`THR-NNNN`, `PRISM-NNN`, `de-thriving`, `Thrive`, `Sol`/`Iris` internal refs) appears in a consumer `.prism/` after adopt.
- **Missing evidence:** consumer-side byte-level diff proof (lives in the todo-app repo; corroborated the code path only).
- **Ticket:** `N/A`

## Review Issues

### Canary negative-test gap: seed guard's legitimate-content exclusion unlocked

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `scripts/ai-skills/literal-guard.ts` (`SEED_DOGFOODING_PATTERN`), tested by `scripts/ai-skills/literal-guard.test.ts`.
- **Problem:** `SEED_DOGFOODING_PATTERN` deliberately excludes legitimate framework content (`Sol`, `Iris`, `ADR-NNNN`) while catching real dogfooding literals. No regression test locked in that exclusion, so a future pattern edit could silently start flagging legitimate content with nothing to catch it.
- **Fixed in:** Eric PR review fold-in (Sol dispatch) — added `"seed literal guard allows legitimate framework references (Sol, Iris, ADR-NNNN)"` to `literal-guard.test.ts`, asserting `runConsumerSeedLiteralGuard` returns zero violations for a fixture containing `Sol`, `Iris`, and `ADR-0047`.

### Duplicated paths.json read/parse/completeness-check logic

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `scripts/ai-skills/utils.ts:462` (`resolveRunPathDefinitions`), duplicating the same read-raw → `JSON.parse` → `isPathDefinitionsComplete` sequence already in `ensureConsumerPathDefinitions` (`utils.ts:406`) — and doing it twice within itself (once for the consumer file, once for the package fallback).
- **Problem:** the same three-step "read the file if it exists, parse it, check `isPathDefinitionsComplete`" block appears three times across the two functions (consumer-file check in `ensureConsumerPathDefinitions`, consumer-file check in `resolveRunPathDefinitions`, package-file check in `resolveRunPathDefinitions`). Logic is correct in all three call sites (verified by trace and by the passing dry-run fixture tests), so this is a readability/DRY observation, not a correctness bug — but a future change to the completeness check or the fallback ordering now has to land in three places to stay consistent. Eric's PR review also flagged that the package-file parse (~`utils.ts:486`) lacked the `try/catch` guarding the consumer-file parse (~`utils.ts:472`), so a malformed package `paths.json` would throw unguarded.
- **Fixed in:** Eric PR review fold-in (Sol dispatch) — extracted `readCompletePathDefinitionsIfPresent(filePath)` in `utils.ts` (read + parse-with-try/catch + completeness check) and routed both `ensureConsumerPathDefinitions` and `resolveRunPathDefinitions` (both its consumer and package reads) through it. A malformed `paths.json` at any of the three sites is now uniformly treated as absent/incomplete instead of throwing. Added `"runAdopt --dry-run treats a malformed PRISM package paths.json as absent, not an unguarded crash"` to `adopt.test.ts` covering the newly-guarded package-file path.

## Acceptance Criteria

Written for a tester with a terminal and a throwaway repo, verifying against the 0.7.2 package (or a local checkout). "Adopt output" means the `.prism/` directory a consumer receives.

### Behavioral

- [x] Given a fresh repo where `prism init` has run, When `prism adopt` runs against the 0.7.2 package with no `--prism-source` flag, Then it completes without a "Missing config schema" error and seeds `.prism/`. (Debug-1) — verified via `npm pack --dry-run` (schema present) plus `adopt.test.ts`/`update.test.ts` exercising the real `runAdopt`/`runUpdate` code paths; no live `npx` smoke test against a published tarball (package currently unpublished — recommend as manual QA before release).
- [x] Given the 0.7.2 package, When you inspect the published tarball's file list, Then `.ai-skills/config.schema.json` is present in it. (Debug-1) — verified live: `npm pack --dry-run --json | grep config.schema.json` matches.
- [x] Given a completed `prism adopt`, When you search the adopt output for the text `THR-` followed by a number, `PRISM-` followed by a number, `de-thriving`, or `Thrive`, Then no matches are found. (Debug-2) — covered by `adopt.test.ts` "runAdopt sources canonical content from the install seed, not the raw dogfooding tree".
- [x] Given a completed `prism adopt`, When you check for backup files (names ending in `.bak`) among the seeded rules and architect files, Then none exist — the adopt output is the genericized content, not a backed-up overwrite. (Debug-2) — same test asserts no `.bak`.
- [x] Given a consumer already on a PRISM baseline, When `prism update` runs against 0.7.2, Then the refreshed `.prism/` content contains no dogfooding references (same search as above) and the reported PRISM version reflects the package version, not `0.0.0`. (Debug-2) — covered by `update.test.ts` "runUpdate records the resolved package.json version in the consumer manifest, not 0.0.0".
- [x] Given a repo where only `prism init` has run (no `paths.json` yet), When `prism adopt --dry-run` runs, Then it completes and prints a preview of what would change without throwing an error. (Debug-3) — covered by `adopt.test.ts` "runAdopt --dry-run completes on a fresh consumer with no paths.json".
- [x] Given a repo whose path-definitions file is present but incomplete, When `prism adopt --dry-run` runs, Then it still completes and previews without crashing. (Debug-3) — covered by `adopt.test.ts` "runAdopt --dry-run completes when paths.json omits generated.platformContentCopies".

### Non-behavioral

- [x] The framework content a consumer receives still includes legitimate references to the PRISM personas (for example Sol, Iris) and to architecture decision records (for example ADR-0047) — the cleanup removes internal ticket and origin-project references, not the shipped framework. (Debug-2) — verified live: `grep -rl` confirms Sol/Iris/ADR-NNNN references remain in `templates/install/.prism/`, and `pnpm run prism:build` passes clean (the seed guard's pattern deliberately excludes them).
- [x] The release build fails with a clear message if any dogfooding reference is introduced into the install seed. (Debug-2) — verified live: injected `THR-9999` into the canonical source (mirrored to the seed), `pnpm run prism:build` failed with `seed-literal-guard: templates/install/.prism/rules/code-standards.md:98: THR-9999`; reverted and confirmed clean rebuild.
- [x] The release build fails with a clear message if a file the tool reads at runtime is left out of the published package. (Debug-1) — verified live: removed `.ai-skills/config.schema.json` from `package.json` `files`, `pnpm run prism:verify-pack` failed with a named-file message; restored and confirmed clean.

---

## PR Readiness

- [x] No critical or major issues
- [x] Types correct — no `any`, no unsafe `as` (the `JSON.parse(...) as T` casts in `verify-pack-parity.ts` match the established codebase pattern for trusted-source JSON — see `build.ts`, `sync-manifest.ts`, `verify-manifest-coverage.ts`)
- [x] No stray console.logs or debug artifacts
- [x] Tests written for new logic and edge cases (18 new/updated test cases across `adopt.test.ts`, `update.test.ts`, `literal-guard.test.ts`, `verify-pack-parity.test.ts` after the Eric fold-in; full `prism:check` — 504 tests, all gates green)
- [x] All debugged issues resolved (no `open` entries)
- [x] Build passes — last run: 2026-07-12 (`pnpm run prism:check`, 504 tests, all gates green, re-run after folding in Eric's two Minors)
- [x] PR description up to date (PR #410 body verified current — Summary/What/Why/How/Notes all reflect current scope, including both mechanical deviations)
- [x] Lasting decisions promoted to architect context — content-root seam, seed-literal canary, and packaging-parity gate promoted to `.prism/architect/_toolkit/install-layout.md` at plan close (2026-07-13)

Both previously-open Minors are now fixed (see `## Review Issues`) — no open review issues remain.

**Last updated:** 2026-07-12
