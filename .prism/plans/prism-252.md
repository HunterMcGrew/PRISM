# Plan: prism-252

> Closed: 2026-06-24

## Ticket

https://github.com/HunterMcGrew/PRISM/issues/252

## Goal

A cold consumer can run `npx prism init` followed by `npx prism adopt` without the `reading 'claude'` crash caused by a missing or incomplete `.ai-skills/definitions/paths.json`.

---

## User Stories

_Not required for this bug fix._

---

## Design

_Not applicable._

---

## Implementation Tasks

The fix lives at the adopt seam: `runAdopt` provisions a complete `.ai-skills/definitions/paths.json` into the consumer before delegating to `runUpdate`, closing both failure modes (absent file → Mode A; structurally incomplete file → Mode B) in one place. `runUpdate` keeps its strict `loadPathDefinitions` guard untouched — steady-state consumers must still fail fast on a genuinely broken file. Provisioning scope is `paths.json` only: `roles.json` and `config.schema.json` are read from the PRISM package, never from the consumer (see Decisions), so provisioning them would over-reach and risk a stale consumer roster shadowing PRISM's.

### Clove (implementation)

1. **Add a structural-completeness check + provisioner to `scripts/ai-skills/utils.ts`.** Insert two new exported functions immediately after `loadPathDefinitions` (after line 339, before `buildPlatformDirs`).

   First, the completeness predicate. The "structurally incomplete" test is: the file does not parse as JSON, OR the parsed object is missing any of the keys `buildPlatformDirs` + `resolveConsumerSkillTargetRoots` dereference. Those consumers read `generated.platformContentCopies.{claude,codex,cursor}` (utils.ts:352-356) and `generated.{claudeSkillsRoot,claudeAgentsRoot,codexSkillsRoot,codexAgentsRoot,codexConfigFile,cursorSkillsRoot}` (update.ts:405-416). Check the full `generated` key set plus the three `platformContentCopies` sub-keys — not just `platformContentCopies` — so a file stale in any other dimension is also repaired.

   ```ts
   /**
    * Returns true when a consumer's parsed paths.json is missing any key that
    * buildPlatformDirs or resolveConsumerSkillTargetRoots will dereference. A
    * file that parses but lacks generated.platformContentCopies (pre-PR#2 schema)
    * is structurally incomplete and crashes the platform refresh — this predicate
    * is what lets prism:adopt repair it instead of crashing.
    */
   export function isPathDefinitionsComplete(value: unknown): value is PathDefinitions {
   	if (typeof value !== "object" || value === null) {
   		return false;
   	}
   	const generated = (value as { generated?: unknown }).generated;
   	if (typeof generated !== "object" || generated === null) {
   		return false;
   	}
   	const g = generated as Record<string, unknown>;
   	const requiredStringKeys = [
   		"claudeSkillsRoot",
   		"claudeAgentsRoot",
   		"codexSkillsRoot",
   		"codexAgentsRoot",
   		"codexConfigFile",
   		"cursorSkillsRoot",
   	];
   	for (const key of requiredStringKeys) {
   		if (typeof g[key] !== "string") {
   			return false;
   		}
   	}
   	const copies = g.platformContentCopies;
   	if (typeof copies !== "object" || copies === null) {
   		return false;
   	}
   	const c = copies as Record<string, unknown>;
   	return (
   		typeof c.claude === "string" &&
   		typeof c.codex === "string" &&
   		typeof c.cursor === "string"
   	);
   }

   /**
    * Ensures the consumer has a structurally complete
    * `.ai-skills/definitions/paths.json` before prism:update reads it. Writes the
    * PRISM package's own paths.json when the consumer's is absent OR structurally
    * incomplete (pre-PR#2 schema missing platformContentCopies). A consumer file
    * that is already complete is left untouched — a customized-but-complete
    * paths.json is never clobbered. Full-replace, not merge-missing-keys: a file
    * missing platformContentCopies is broken, not customized, and the package
    * copy is the correct shape (see plan prism-252 Decision "Full replace").
    *
    * Returns "written" when it provisioned/repaired, "ok" when the consumer file
    * was already complete, so the caller can report the action.
    */
   export async function ensureConsumerPathDefinitions(
   	prismSourceRoot: string,
   	consumerRepoRoot: string
   ): Promise<"written" | "ok"> {
   	const consumerPathsFile = path.join(
   		consumerRepoRoot,
   		".ai-skills",
   		"definitions",
   		"paths.json"
   	);
   	const existing = await readFileIfExists(consumerPathsFile);
   	if (existing !== null) {
   		try {
   			if (isPathDefinitionsComplete(JSON.parse(existing))) {
   				return "ok";
   			}
   		} catch {
   			// Unparseable — fall through to provision the package copy.
   		}
   	}
   	const packagePathsFile = path.join(
   		prismSourceRoot,
   		".ai-skills",
   		"definitions",
   		"paths.json"
   	);
   	const packageRaw = await readFileIfExists(packagePathsFile);
   	if (packageRaw === null) {
   		throw new Error(
   			`prism:adopt: PRISM source has no paths.json at ${packagePathsFile} — cannot provision consumer path definitions.`
   		);
   	}
   	await ensureDirectory(path.dirname(consumerPathsFile));
   	await fs.writeFile(consumerPathsFile, packageRaw, "utf8");
   	return "written";
   }
   ```

   `path`, `fs`, `readFileIfExists`, `ensureDirectory`, and `PathDefinitions` are all already imported/defined in `utils.ts` — no new imports.

   Verification: `cd <repo-root> && npx tsx --test scripts/ai-skills/utils.test.ts` (if a utils.test.ts exists; otherwise type-check covers it — see task 4). Content-and-types only at this step.

2. **Call the provisioner from `runAdopt` in `scripts/ai-skills/adopt.ts`, after the config-exists guard and before `runUpdate`.** Add `ensureConsumerPathDefinitions` to the import from `./utils` on line 29 (currently `import { ensureDirectory, pathExists } from "./utils";` → `import { ensureConsumerPathDefinitions, ensureDirectory, pathExists } from "./utils";`).

   Then, in `runAdopt`, insert the provisioning call between the `assertConsumerIsEstablished` call (line 142) and the `seedConsumerContentRoot` call (line 144). Place it after `assertConsumerIsEstablished` so the manifest-exists refusal still fires first (a steady-state repo is never touched), and before `seed`/`runUpdate` so paths.json is complete by the time `runUpdate` calls `loadPathDefinitions`:

   ```ts
   await assertConsumerIsEstablished(consumerContentRoot);

   const pathsProvisioned = await ensureConsumerPathDefinitions(
   	prismSourceRoot,
   	consumerRepoRoot
   );

   const seed = await seedConsumerContentRoot(installSeedRoot, consumerContentRoot);
   ```

   Extend `AdoptSummary` (line 36-39) with the provisioning result so the CLI can report it:

   ```ts
   export interface AdoptSummary {
   	pathsProvisioned: "written" | "ok";
   	seed: SeedSummary;
   	update: UpdateSummary;
   }
   ```

   Return it from `runAdopt` (line 152): `return { pathsProvisioned, seed, update };`

   Verification: type-check (task 4).

3. **Report the provisioning in `reportSummary` in `scripts/ai-skills/adopt.ts`.** In `reportSummary` (line 179), add a line near the top of the body (before the `seed.written` block) so the user sees that adopt self-healed paths.json:

   ```ts
   if (summary.pathsProvisioned === "written") {
   	console.log(
   		"prism:adopt provisioned .ai-skills/definitions/paths.json (was absent or incomplete)."
   	);
   }
   ```

   Verification: type-check (task 4).

4. **Add a regression test reproducing both failure modes + the no-clobber guarantee.** Append three tests to `scripts/ai-skills/adopt.test.ts`, after the existing `runAdopt` orchestration tests (after the `runAdopt projects the persona roster` test, around line 301). Reuse the existing `withTempRoots`, `writeFile`, `readFile`, `fileExists`, `scaffoldConsumerAndSkills`, and `CONSUMER_PATHS_JSON` harness already in the file.

   `scaffoldConsumerAndSkills` currently writes a complete `paths.json` (lines 152-155). For Mode A and Mode B, the test must override that file *after* scaffolding — for Mode A, delete it; for Mode B, overwrite it with a stale shape. Add a stale fixture constant near `CONSUMER_PATHS_JSON` (line 127):

   ```ts
   // Pre-PR#2 schema: generated block omits platformContentCopies, the shape
   // that crashes buildPlatformDirs at utils.ts:356. Mirrors thrive's stale file.
   const STALE_CONSUMER_PATHS_JSON = {
   	canonical: {
   		skillsRoot: ".ai-skills/skills",
   		contentRoot: ".prism",
   		templatesContentRoot: "templates/install/.prism",
   	},
   	generated: {
   		claudeSkillsRoot: ".claude/skills",
   		claudeAgentsRoot: ".claude/agents",
   		codexSkillsRoot: ".agents/skills",
   		codexAgentsRoot: ".codex/agents",
   		codexConfigFile: ".codex/codex-config.toml",
   		cursorSkillsRoot: ".cursor/skills",
   	},
   };
   ```

   The three tests must also write the PRISM package's `paths.json` (the provisioning source) into `prismSourceRoot`, since `ensureConsumerPathDefinitions` reads from `prismSourceRoot/.ai-skills/definitions/paths.json`. Add that write to each test (or extend `scaffoldConsumerAndSkills` to write it once — preferred, since all three need it). If extending the helper, add after line 170:

   ```ts
   await writeFile(
   	roots.prismSourceRoot,
   	".ai-skills/definitions/paths.json",
   	`${JSON.stringify(CONSUMER_PATHS_JSON, null, "\t")}\n`
   );
   ```

   Then the three tests:

   ```ts
   test("runAdopt provisions an absent paths.json and completes (Mode A)", async () => {
   	await withTempRoots(async ({ prismSourceRoot, prismContentRoot, consumerRepoRoot, consumerContentRoot }) => {
   		await writeFile(prismContentRoot, "rules/some-rule.md", "# Rule\n");
   		await scaffoldConsumerAndSkills({ prismSourceRoot, consumerRepoRoot });
   		// Mode A: remove the consumer paths.json scaffolding wrote, simulating a
   		// cold consumer that ran prism init (config only) but has no paths.json.
   		await fs.rm(path.join(consumerRepoRoot, ".ai-skills/definitions/paths.json"));

   		const summary = await runAdopt({ prismSourceRoot, consumerRepoRoot });

   		assert.equal(summary.pathsProvisioned, "written");
   		assert.ok(
   			await fileExists(consumerRepoRoot, ".ai-skills/definitions/paths.json"),
   			"paths.json provisioned"
   		);
   		assert.ok(
   			await fileExists(consumerContentRoot, SYNC_MANIFEST_FILENAME),
   			"adopt completed and wrote the baseline manifest"
   		);
   	});
   });

   test("runAdopt repairs an incomplete paths.json and completes (Mode B)", async () => {
   	await withTempRoots(async ({ prismSourceRoot, prismContentRoot, consumerRepoRoot, consumerContentRoot }) => {
   		await writeFile(prismContentRoot, "rules/some-rule.md", "# Rule\n");
   		await scaffoldConsumerAndSkills({ prismSourceRoot, consumerRepoRoot });
   		// Mode B: overwrite with the pre-PR#2 stale shape that crashes the refresh.
   		await writeFile(
   			consumerRepoRoot,
   			".ai-skills/definitions/paths.json",
   			`${JSON.stringify(STALE_CONSUMER_PATHS_JSON, null, "\t")}\n`
   		);

   		const summary = await runAdopt({ prismSourceRoot, consumerRepoRoot });

   		assert.equal(summary.pathsProvisioned, "written");
   		const repaired = JSON.parse(
   			await readFile(consumerRepoRoot, ".ai-skills/definitions/paths.json")
   		);
   		assert.ok(
   			repaired.generated.platformContentCopies,
   			"repaired paths.json has platformContentCopies"
   		);
   		assert.ok(
   			await fileExists(consumerContentRoot, SYNC_MANIFEST_FILENAME),
   			"adopt completed without the reading 'claude' crash"
   		);
   	});
   });

   test("runAdopt leaves a complete consumer paths.json untouched (no clobber)", async () => {
   	await withTempRoots(async ({ prismSourceRoot, prismContentRoot, consumerRepoRoot }) => {
   		await writeFile(prismContentRoot, "rules/some-rule.md", "# Rule\n");
   		await scaffoldConsumerAndSkills({ prismSourceRoot, consumerRepoRoot });
   		// A complete consumer file with a customized (but structurally valid) value.
   		const customized = {
   			...CONSUMER_PATHS_JSON,
   			generated: {
   				...CONSUMER_PATHS_JSON.generated,
   				claudeSkillsRoot: ".claude/custom-skills",
   			},
   		};
   		await writeFile(
   			consumerRepoRoot,
   			".ai-skills/definitions/paths.json",
   			`${JSON.stringify(customized, null, "\t")}\n`
   		);

   		const summary = await runAdopt({ prismSourceRoot, consumerRepoRoot });

   		assert.equal(summary.pathsProvisioned, "ok");
   		const after = JSON.parse(
   			await readFile(consumerRepoRoot, ".ai-skills/definitions/paths.json")
   		);
   		assert.equal(
   			after.generated.claudeSkillsRoot,
   			".claude/custom-skills",
   			"customized complete paths.json must not be clobbered"
   		);
   	});
   });
   ```

   Note: the existing `runAdopt projects the persona roster` and `runAdopt produces a .sync-manifest.json` tests already pass a complete `paths.json` through `scaffoldConsumerAndSkills`. After the task-4 helper change (writing the package paths.json into `prismSourceRoot`), confirm those still pass — they assert `pathsProvisioned` is not set, so they need no change beyond the helper addition, which is additive.

   Verification: `cd <repo-root> && npx tsx --test scripts/ai-skills/adopt.test.ts` (or the repo's node:test runner — match the command the existing suite uses; check `package.json` scripts for the `prism:test` invocation and use that with the adopt test path).

5. **Run the full verification gate.** From repo root:
   - Type-check: `cd <repo-root> && pnpm run check-types` (or the scripts-package equivalent — confirm against `package.json`).
   - Adopt + utils tests green (task 4 command).
   - `pnpm prism:check` if it exists — confirms no manifest/mirror drift. This change touches only `scripts/ai-skills/` (not a shipped `.prism/` file or architect doc), so **no `pnpm prism:build` is required** — there are no platform mirrors to regenerate for a script-only change. Confirm by checking that no file under `.prism/`, `.ai-skills/skills/`, or `.ai-skills/definitions/` was modified.

---

## Decisions

- This is the same class of cold-start gap as #250 (`config.json` not provisioned): the `adopt` flow assumes a fully-provisioned `.ai-skills/definitions/` directory that `init` does not create.

- **Fix lives at the adopt seam (`runAdopt`), not in `runUpdate`, `seedConsumerContentRoot`, or `init`.**
  - **Root cause:** `runUpdate` calls `loadPathDefinitions(consumerRepoRoot)` (update.ts:312) → `buildPlatformDirs` (utils.ts:352) against a consumer `paths.json` that `init` never writes and `adopt`'s seed never copies. Mode A throws "Missing path definitions"; Mode B crashes reading `.claude` off `undefined`.
  - **Alternatives considered:** (1) provision inside `seedConsumerContentRoot` — rejected, the seed walks `templates/install/.prism/` which has no `.ai-skills/` tree, so paths.json doesn't belong to that surface and bolting it in mixes two provisioning concerns. (2) Have `init` write `paths.json` — rejected, it fixes Mode A only; thrive's Mode B is a *stale* file from a pre-PR#2 Atlas session that `init` would never touch (init refuses when config exists, and wouldn't migrate an existing paths.json). (3) Loosen `runUpdate`'s `loadPathDefinitions` to self-heal — rejected, steady-state consumers should fail fast on a genuinely broken file; self-healing the shared update path hides real corruption.
  - **Chosen approach:** `runAdopt` provisions/repairs before `runUpdate` reads. Beats the alternatives because adopt is the one entry point that *should* self-heal (first contact), it closes both modes with one seam, and it leaves `runUpdate`'s strict guard intact for steady-state. Placed after `assertConsumerIsEstablished` so a steady-state repo is never touched.
  - **Implementation guidance:** new `ensureConsumerPathDefinitions` in utils.ts, called in `runAdopt` between the manifest-guard and the seed. See Implementation Tasks 1-2.
  - → promoted to `.prism/architect/_toolkit/install-layout.md` (§First-contact adoption, step 2): a one-sentence note that adopt self-heals a missing/incomplete consumer `paths.json`, keeping the cold-start contract description truthful. The broader "cold-start provisioning happens at the adopt seam" *pattern* is still deferred — no promotion needed until a third instance lands (this fact is the specific cold-start contract, not the general pattern).

- **Full replace, not merge-missing-keys, when the consumer file is incomplete.**
  - **Root cause:** a `paths.json` missing `generated.platformContentCopies` is broken, not customized — the key is structural, every install needs it, and its absence means the file predates PR#2's schema.
  - **Alternatives considered:** merge the package's missing keys into the consumer's existing object, preserving any customizations.
  - **Chosen approach:** full replace from the package copy. Merge was rejected: a file stale enough to miss `platformContentCopies` is from a schema generation old enough that *any* of its values may be wrong, so partial merge could leave a half-migrated file that passes the completeness check but carries stale paths. Full replace is the predictable, correct shape. The no-clobber guarantee is preserved by only replacing when the file is absent or *incomplete* — a structurally complete file (even a customized one) is left untouched.
  - **Implementation guidance:** `isPathDefinitionsComplete` gates the replace; a complete file returns `"ok"` and is never written. See Implementation Task 1.
  - → no promotion needed (ticket-tactical repair policy).

- **Provisioning scope is `paths.json` only — not `roles.json` or `config.schema.json`.**
  - **Root cause / confirmed asymmetry:** `paths.json` is the *only* `.ai-skills/definitions/` file the adopt→update flow reads from the **consumer** (`loadPathDefinitions(consumerRepoRoot)`, update.ts:312). `roles.json` is read from the **PRISM package** (`refreshPlatformSkills`, update.ts:449 joins `prismRepoRoot`; also `build.ts:762`) — the consumer renders *PRISM's* personas using its own tokens/paths, so it never needs a local roster. `config.schema.json` appears only in JSDoc comments in `lib/onboarding-config.ts`; it is never read at runtime by adopt/update.
  - **Alternatives considered:** provision the whole `.ai-skills/definitions/` directory for symmetry / safety.
  - **Chosen approach:** provision exactly `paths.json`. Over-provisioning `roles.json` would be an active bug — a stale consumer-side `roles.json` would *shadow* PRISM's source roster and freeze the consumer's persona set. Provisioning `config.schema.json` is dead weight (no runtime reader).
  - **Implementation guidance:** the provisioner copies one file. Do not generalize it to a directory walk.
  - → no promotion needed (codified in this Decision; the asymmetry is self-evident from the two `loadPathDefinitions`/`roles.json` read sites).

### Stated requirements (REQ citations for AC)

- **REQ-1:** `npx prism init` followed by `npx prism adopt` must complete on a cold consumer without the `reading 'claude'` crash (the ticket goal).
- **REQ-2:** A consumer's own complete `paths.json` — including a legitimately customized one — must never be clobbered, and a steady-state consumer must still hit the existing baseline-exists refusal.
- **REQ-3:** `runUpdate`'s strict `loadPathDefinitions` fast-fail must stay intact for steady-state consumers; only `adopt` self-heals.

---

## History

- 2026-06-23 [hmcgrew/prism-252-adopt-paths-provision]: Plan created; bug filed as #252. Sol pre-diagnosis recorded in Debugged Issues — Sasha to confirm root cause.
- 2026-06-23 [hmcgrew/prism-252-adopt-paths-provision]: Sasha confirmed root cause — two failure modes (A: absent paths.json → clear throw; B: stale pre-PR#2 paths.json missing `platformContentCopies` → crash at utils.ts:356). Both reproduced locally. Fix seam identified: adopt should provision/validate paths.json before calling runUpdate.
- 2026-06-23 [hmcgrew/prism-252-adopt-paths-provision]: Winston planned the fix — `ensureConsumerPathDefinitions` in utils.ts, called in `runAdopt` after the manifest-guard, full-replaces an absent/incomplete `paths.json` from the package copy; `roles.json`/`config.schema.json` confirmed package-read so provisioning scope is paths.json only. See Decisions; build-ready, no `prism:build` needed (script-only change).
- 2026-06-23 [hmcgrew/prism-252-adopt-paths-provision]: Clove implemented — `isPathDefinitionsComplete` + `ensureConsumerPathDefinitions` in utils.ts, wired into `runAdopt` after manifest-guard; `AdoptSummary.pathsProvisioned` field added; three regression tests (Mode A, Mode B, no-clobber) green; `prism:check` 374/374 pass.
- 2026-06-23 [hmcgrew/prism-252-adopt-paths-provision]: Clove fixed four Eric Minors — stripped changelog-voice from fixture comment and two JSDoc entries (structural invariant rewrites), strengthened Mode B assertion to check all three platformContentCopies sub-keys as strings, added structural content check to Mode A test; `prism:check` 374/374 pass.
- 2026-06-24 [hmcgrew/prism-252-adopt-paths-provision]: Winston closed the plan — promoted the adopt self-heal note to `.prism/architect/_toolkit/install-layout.md` §First-contact adoption, applied the Decision verdict gate, verified AC hold at merge; mirrors rebuilt and `prism:check` green.

---

## Debugged Issues

### Cold adopt crash — `paths.json` not provisioned (`reading 'claude'`)

- **Status:** `fixed`
- **Fixed in:** `scripts/ai-skills/utils.ts` (`isPathDefinitionsComplete`, `ensureConsumerPathDefinitions`) + `scripts/ai-skills/adopt.ts` (`runAdopt` wiring, `AdoptSummary.pathsProvisioned`, `reportSummary`)
- **Severity:** High
- **Confidence:** High (both failure modes confirmed with deterministic local repros; crash site pinned to exact line)
- **Environment:** Cold consumer repo after `npx @huntermcgrew/prism@0.5.0 init` + `npx @huntermcgrew/prism@0.5.0 adopt`
- **File:** `scripts/ai-skills/utils.ts:356` (`buildPlatformDirs` — `platformCopies.claude` where `platformCopies` is `undefined`), reached via `runUpdate` → `loadPathDefinitions` → `buildPlatformDirs` call at `update.ts:313`
- **Root cause:** `[Confirmed]` — Two distinct failure modes exist. Neither `init` (writes only `.ai-skills/config.json`) nor `adopt`'s seed step (seeds only `.prism/` from `templates/install/.prism/`) provisions `.ai-skills/definitions/paths.json`. The `templates/install/` tree has no `.ai-skills/` directory at all. `runUpdate` calls `loadPathDefinitions(consumerRepoRoot)` at `update.ts:312` before any file writes, as an intentional fast-fail guard. What happens next depends on the consumer's state:
  - **Failure mode A (absent `paths.json`):** `loadPathDefinitions` detects the file is missing and throws `"Missing path definitions: ..."` at `utils.ts:326`. This is a hard error but at least a clear one. Thrive did NOT hit this.
  - **Failure mode B (incomplete/stale `paths.json`, confirmed as thrive's crash):** `loadPathDefinitions` succeeds (file parses as valid JSON) but the parsed object is missing `generated.platformContentCopies`. `buildPlatformDirs` at `utils.ts:352` reads `pathDefinitions.generated.platformContentCopies` (→ `undefined`), then immediately dereferences `.claude` at line 356, producing `TypeError: Cannot read properties of undefined (reading 'claude')`. Confirmed with deterministic local repro.
- **Where thrive's incomplete `paths.json` came from:** `[Confirmed]` — The earliest git commit in this repo (`3667e0a`, Phase 1 foundation) shipped a `paths.json` without `platformContentCopies` in its `generated` block. The `platformContentCopies` key was added later in commit `ed57962` (bifurcate install layout, PR #2). Thrive's `.ai-skills/` predates PR #2 — it was set up during an earlier Atlas onboarding session against the v1 schema, and that pre-existing stale `paths.json` was never updated. `prism adopt` has no mechanism to validate or migrate a consumer's existing `paths.json` before reading it.
- **Steps to Reproduce (failure mode B — thrive's actual crash):**
  1. Create a consumer dir with `.ai-skills/config.json` (as `init` writes) and a `paths.json` whose `generated` block omits `platformContentCopies`.
  2. Call `loadPathDefinitions` → succeeds, returns object where `generated.platformContentCopies` is `undefined`.
  3. Call `buildPlatformDirs(repoRoot, pathDefs)` → crashes at `utils.ts:356` with `TypeError: Cannot read properties of undefined (reading 'claude')`.
- **Expected behavior:** `adopt` completes and projects the skill roster without crashing.
- **Actual behavior:** Unhandled `TypeError` at `utils.ts:356` when `paths.json` exists but its `generated.platformContentCopies` block is absent (schema predates PR #2).
- **Refuted hypotheses:**
  - "The crash is in `runUpdate` at line 312" — refuted. `loadPathDefinitions` succeeds when the file exists but is stale. The crash is in `buildPlatformDirs` at line 356, called at `update.ts:313`.
  - "The error would be `Missing path definitions`" — refuted for thrive specifically. That error requires the file to be absent (mode A). Thrive has the file; it's just stale (mode B).
- **Recommended fix:** `adopt` (or `runUpdate`) should validate `paths.json` before using it — specifically that `generated.platformContentCopies` is present and structurally complete. When the file is absent OR incomplete, provision it from the package's own `paths.json` (the source of truth at `.ai-skills/definitions/paths.json` in the PRISM package). This closes both failure modes with one seam. The right place is in `runAdopt` before calling `runUpdate`, so adopt is the only entry point that self-heals; `runUpdate` can retain its current strict behavior for steady-state consumers who should have a complete file.
- **Suggested tests:**
  - Cold-start A: `runAdopt` on a consumer with no `.ai-skills/definitions/paths.json` → exits 0, roster written.
  - Cold-start B: `runAdopt` on a consumer with a stale `paths.json` missing `platformContentCopies` → exits 0, roster written (file provisioned/repaired).
  - Warm consumer: `runAdopt` on a consumer with a complete `paths.json` → existing file unchanged, roster written (no regression).
- **Missing evidence:** The exact contents of thrive's `/workspace/.ai-skills/definitions/paths.json` were not directly inspected (container not accessible). The origin conclusion (pre-PR #2 Atlas session) is deduced from git archaeology showing the v1 schema lacked `platformContentCopies`. Sol can request thrive's actual file from the user to confirm; it does not change the fix direction.
- **Linear:** N/A (GitHub issues)

---

## Review Issues

_Briar self-review 2026-06-23 — clean pass._

### Changelog-voice in fixture comment (adopt.test.ts:136-137)

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `scripts/ai-skills/adopt.test.ts:136`
- **Problem:** Comment referenced "Pre-PR#2 schema" and "Mirrors thrive's stale file" — changelog-voice describing history, not the structural property.
- **Suggested fix:** Rewrite to describe the structural invariant: "a paths.json whose generated block omits platformContentCopies."

### Changelog-voice in JSDoc (utils.ts:394)

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `scripts/ai-skills/utils.ts:394`
- **Problem:** JSDoc for `ensureConsumerPathDefinitions` used "pre-PR#2 schema missing platformContentCopies" — session-context leakage into a durable artifact.
- **Suggested fix:** Rewrite as the structural invariant: "a generated block that omits platformContentCopies."

### Mode B assertion too weak — only checks truthiness (adopt.test.ts:529-532)

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `scripts/ai-skills/adopt.test.ts:529`
- **Problem:** `assert.ok(repaired.generated.platformContentCopies)` only confirms the key is truthy, not that the repair produced a structurally complete file with all three required sub-keys as strings.
- **Suggested fix:** Assert all three sub-keys (`claude`, `codex`, `cursor`) are `typeof === "string"`, matching what `isPathDefinitionsComplete` requires.

### Mode A test asserts existence but not content (adopt.test.ts:499)

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `scripts/ai-skills/adopt.test.ts:499`
- **Problem:** The Mode A test confirms the file was provisioned but does not check that it is structurally valid — an empty or garbage file would pass.
- **Suggested fix:** Parse the provisioned file and assert all three `platformContentCopies` sub-keys are present as strings.

---

## Acceptance Criteria

### Behavioral

- [x] Given a cold consumer that has run `prism init` (config only, no path definitions), When `adopt` runs, Then adopt completes successfully and projects the skill roster, and no crash referencing `'claude'` appears (Debug-1, REQ-1).
- [x] Given a consumer whose `.ai-skills/definitions/paths.json` is missing, When `adopt` runs, Then adopt provisions the file and reports that it did so, then completes (Debug-1 Mode A).
- [x] Given a consumer whose `paths.json` exists but is from an older setup and lacks the platform-copy section, When `adopt` runs, Then adopt repairs the file and completes without an error (Debug-1 Mode B).
- [x] Given a consumer whose `paths.json` is already complete (including a hand-customized but valid one), When `adopt` runs, Then adopt leaves that file exactly as it was and still completes (REQ-2).

### Non-behavioral

- [x] A steady-state consumer (one that already has a sync baseline) still gets the existing "already has a PRISM baseline — run update" refusal; the provisioning step does not change that behavior (REQ-2).
- [x] Running `update` directly (not via adopt) on a consumer with a broken `paths.json` still fails fast with the existing clear error; only `adopt` self-heals (REQ-3).

### AC Adjustments

- 2026-06-23 (Winston): Tightened the three draft behavioral items into four — split "provisioned or error surfaced" into the two concrete outcomes (provision on absent, repair on incomplete), since the chosen fix always provisions rather than ever surfacing a setup-gap error at the adopt seam. Added the no-clobber item (REQ-2) and the update-stays-strict item (REQ-3) to lock the two no-regression guarantees the fix depends on. Resolved the draft's "(or the error is surfaced clearly)" ambiguity in favor of always-provision.

### AC Sync Log

| Date | Agent | Action | Plan | Linear |
| ---- | ----- | ------ | ---- | ------ |
| 2026-06-23 | Nora | Seeded draft AC from bug report | updated | N/A |
| 2026-06-23 | Winston | Refined to 4 behavioral + 2 non-behavioral, added citations, resolved provision-vs-error ambiguity | updated | N/A (GitHub issues) |

---

## Cleanup Items

_None yet._

---

## PR Readiness

- [x] No critical or major issues
- [x] Types correct — no `any`, no unsafe `as`
- [x] No stray console.logs or debug artifacts
- [x] Tests written for new logic and edge cases
- [x] All debugged issues resolved (no `open` entries)
- [x] Build passes — last run: 2026-06-24 (`prism:check` green after self-heal note promotion + mirror rebuild)
- [x] PR description up to date (Eric verified during PR review)
- [x] Lasting decisions promoted to architect context (adopt self-heal note → install-layout.md §First-contact adoption; broader cold-start pattern deferred per Decisions verdict)

**Last updated:** 2026-06-24 (Winston plan close — self-heal note promoted, verdict gate applied)
