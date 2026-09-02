# Plan: PRISM-477 followup — gate hook delivery on a `hosts` opt-in

## Ticket

Follow-up to https://github.com/HunterMcGrew/PRISM/issues/477 (shipped as PR #478, commit `6649a235`). No new ticket per `.prism/rules/followup-scope.md` § Choosing the vehicle — post-merge, same-scope, so this is a follow-up PR off `main`.

Lineage: PRISM-477's plan (`.prism/plans/prism-477.md`, closed 2026-09-02) records this work in two `## Decisions` entries — "Doctor stays untouched, and the reason its silence is wrong is recorded rather than fixed" and "`refreshHookRuntime` being ungated on host is a real defect, and this ticket names it without fixing it." ADR-0074 § Consequences carries the same state as a maintainer-facing record.

## Goal

Give a consumer a way to say which hosts they run, stop delivering the Claude hook runtime to consumers who don't run Claude Code, and make `prism doctor` report the truth on every host mix.

---

## User Stories

Not applicable — an installer and diagnostic change with no end-user feature.

---

## Design

Not applicable — no UI.

---

## Implementation Tasks

Every task below writes to a path the architect write gate routes. The gate denies the edit until the route's docs have been read; each task names the exact clearing commands. Read them once per agent — credit is per-agent, not per-task, so tasks sharing a route clear together.

**Two things about the gate, learned the hard way while planning this.** Run each clearing `cat` as a bare command with a single path operand — a `cd <dir> && cat <doc>` does not clear it, because the `&&` disqualifies the read-only proof and the whole command is judged as a write. And when you work from a git worktree, the hook resolves its read-state against the main checkout: reading the worktree's copy of a routed doc never clears the gate for a write inside that worktree. Read the main checkout's copy (`/Users/hunter/Documents/PRISM/PRISM/.prism/architect/...`) to earn credit, then make the edit in the worktree.

Sequence: tasks 1–2 land the config surface, task 3 consumes it in the installer, tasks 4–5 consume it in doctor, tasks 6–8 are the tests, tasks 9–12 are the prose homes, task 13 ships. Task 3 depends on task 2; tasks 4–5 depend on task 2 and on task 3's exports.

### Clove (implementation)

1. **Add the `hosts` key to the config schema** — `.ai-skills/config.schema.json`, as a new top-level entry under `properties`, placed immediately after the `techStack` block so the two array-of-enum fields sit together.

   Clear the gate first:

   ```
   cat .prism/architect/_toolkit/spec-editing.md
   cat .prism/architect/_toolkit/skills-ecosystem.md
   cat .prism/architect/_toolkit/output-guards.md
   cat .prism/architect/_toolkit/install-layout.md
   ```

   Insert, exactly:

   ```json
   		"hosts": {
   			"type": "array",
   			"description": "AI coding hosts this repo actually runs. Absent means all of them, so an existing install keeps its current behavior and needs no migration. Today this gates hook-runtime delivery: PRISM writes .claude/hooks/, merges its hook registration into .claude/settings.json, and appends the hook state-file globs to .gitignore only when `claude` is listed. Removing `claude` from a repo that previously received the runtime makes the next `prism update` take it back out.",
   			"items": {
   				"type": "string",
   				"enum": ["claude", "codex", "cursor"]
   			},
   			"uniqueItems": true,
   			"examples": [["claude"], ["codex", "cursor"]]
   		},
   ```

   No validator change is needed. `validateNode` in `scripts/ai-skills/lib/config-schema-validate.ts` already walks `type`, `items`, `enum`, and `uniqueItems`, and it reads the enum straight out of the schema file rather than from a hand-maintained mirror — so an unknown value like `"windsurf"` throws `ConfigSchemaValidationError` at `/hosts/0` from the code that already exists. `validateConsumerConfigAgainstSchema` runs at the top of `runUpdate` before any file is written, which is where the failure belongs.

   Do not add `additionalProperties: false` anywhere while you are in this file — the schema deliberately does not set it, and adding it would reject every consumer carrying a key this schema does not yet know.

   Verification: task 6's invalid-value test.

2. **Add the one shared `hosts` resolver** — new file `scripts/ai-skills/lib/hosts.ts`, plus one field on `PrismConfig`. Gate route is the same as task 1 (already cleared).

   Create `scripts/ai-skills/lib/hosts.ts`:

   ```ts
   /**
    * The one place `hosts` is resolved from a consumer's config.
    *
    * `update.ts` decides what to deliver and `doctor.ts` decides what to
    * report, and the two have to agree — a doctor that reads the key
    * differently from the installer produces exactly the misleading clean
    * report this change exists to remove. Two callers reading one config
    * field is what earns the shared function; neither reads the raw key.
    *
    * Total and non-throwing on purpose. `doctor` never throws on a bad
    * install (it reports instead), so this degrades an absent, malformed, or
    * unrecognized value to the full host set rather than raising. A genuinely
    * invalid value is caught with a field-level message by
    * `validateConsumerConfigAgainstSchema` before `runUpdate` writes anything;
    * this function's job is resolution, not validation.
    */
   export const HOST_NAMES = ["claude", "codex", "cursor"] as const;

   export type HostName = (typeof HOST_NAMES)[number];

   /**
    * Resolves which hosts a consumer runs. An absent or unusable `hosts`
    * value means all of them, so an install that predates the key behaves
    * exactly as it did before.
    */
   export function resolveHosts(config: { hosts?: unknown } | null | undefined): HostName[] {
   	const declared = config?.hosts;

   	if (!Array.isArray(declared)) {
   		return [...HOST_NAMES];
   	}

   	const recognized = declared.filter((entry): entry is HostName =>
   		(HOST_NAMES as readonly string[]).includes(entry as string)
   	);

   	return recognized.length > 0 ? recognized : [...HOST_NAMES];
   }
   ```

   The empty-array fallback is deliberate: `"hosts": []` resolves to all three rather than none. A consumer who wants no hook delivery says so by listing the hosts they do run, and an empty array is far more likely to be a mistake than a request to opt out of everything — resolving it to "nothing" would silently strip a working install.

   Then add one line to `PrismConfig` in `scripts/ai-skills/lib/tokens.ts`, immediately after `techStack?: string[];`:

   ```ts
   	hosts?: HostName[];
   ```

   with `import type { HostName } from "./hosts";` added to that file's imports. `PrismConfig` is a partial view of the schema — `features`, `documentation`, and `modelTiers` are not on it — but `hosts` belongs there because `update.ts` already holds a `loadConfig` result and reads the field off it.

   Verification: `pnpm prism:check-types`.

3. **Gate delivery and add the removal branch** — `scripts/ai-skills/update.ts`. Gate route is the same as task 1 (already cleared). Five edits in one file:

   **3a. Export the two ownership signals doctor needs.** Change `const HOOK_RUNTIME_MARKER` (line 1013) and `const PRISM_HOOK_COMMAND_PATTERN` (the anchored regex above `isPrismOwnedHookEntry`) to `export const`. Leave their doc comments as they are.

   **3b. Parameterize the prune sweep.** Change `pruneStaleHookRuntimeFiles(targetDir, dryRun)` to take a third parameter `deliveredPaths: readonly string[] = HOOK_RUNTIME_FILES`, and build its set from that parameter — `const delivered = new Set(deliveredPaths);`. Everything else in the function is unchanged, including the `BACKUP_BASENAME_PATTERN` skip and the backup-before-remove behavior.

   **3c. Add the canonical-path remover.** New function immediately after `pruneStaleHookRuntimeFiles`:

   ```ts
   /**
    * Removes the runtime files PRISM delivers at their canonical paths, for a
    * consumer who has dropped `claude` from `hosts`. Only a file carrying
    * `HOOK_RUNTIME_MARKER` is removed; an unmarked file at one of those paths
    * is the consumer's own and is left where it is.
    *
    * No backup, deliberately — the asymmetry mirrors delivery rather than
    * prune. `deliverHookRuntimeFile` replaces a marked file at a canonical
    * path without a backup because the marker plus the path together identify
    * PRISM's own content; the same pair identifies it here. `pruneStaleHookRuntimeFiles`
    * backs up first because it acts on marked files at *unrecognized* paths,
    * which are plausibly a consumer's adaptation that carried the marker
    * along — a different case with a different risk.
    */
   async function removeDeliveredHookRuntimeFiles(
   	targetDir: string,
   	dryRun: boolean
   ): Promise<FileOutcome[]> {
   ```

   For each `relative` in `HOOK_RUNTIME_FILES`: resolve the absolute path under `targetDir`; skip when it does not exist; read it and skip when the contents do not include `HOOK_RUNTIME_MARKER`; otherwise `await fs.rm(absolutePath, { force: true })` when not `dryRun`, and push `{ relativePath: '.claude/hooks/' + relative, action: "removed" }`.

   Check whether `"removed"` is already a member of the `FileAction` union (line 70). If it is not, add it, and check `reportSummary` for a per-action count that needs the new member.

   Leave the `.claude/hooks/` directory itself in place even when it ends up empty — it is the consumer's directory, and removing it would reach past PRISM's own files.

   **3d. Give the settings merge a removal mode.** Add a fourth parameter to `mergeHookSettingsRegistration`: `deliver = true`. Inside the event loop, replace the merged value with:

   ```ts
   		mergedHooks[eventName] = mergeHookEventEntries(
   			targetSettings.hooks?.[eventName],
   			deliver ? sourceEntries : []
   		);
   ```

   and immediately after the loop, drop any event key that is now an empty array:

   ```ts
   	for (const [eventName, entries] of Object.entries(mergedHooks)) {
   		if (Array.isArray(entries) && entries.length === 0) {
   			delete mergedHooks[eventName];
   		}
   	}
   ```

   Extend the function's doc comment to say that `deliver: false` composes each event key from the consumer's own entries alone — the same `mergeHookEventEntries` call with an empty incoming set — so removal is the drop half of the merge that already runs on every update, not a second ownership rule that could disagree with it.

   The existing early return when the source settings file is missing stays. The existing no-op-when-identical check stays, and it is what keeps the removal path idempotent. Do not delete `.claude/settings.json` even when the result is `{}` — the file is the consumer's.

   One consequence worth naming rather than fixing: `PRISM_HOOK_COMMAND_PATTERN` is anchored end to end, so a registration a consumer hand-edited into a different shape is not claimed by `isPrismOwnedHookEntry` and survives the removal, then points at a file that is gone. That is not silent — task 4's existing dead-registration warning reports it, with `prism update` as the remedy. The anchoring is what stops removal from deleting a consumer's own wrapper, which is the far worse failure.

   **3e. Gate `refreshHookRuntime` and wire the call site.** Add a fourth parameter `hosts: HostName[]` — required, not defaulted. Immediately after `const targetDir = ...`, branch:

   ```ts
   	if (!hosts.includes("claude")) {
   		const outcomes = await removeDeliveredHookRuntimeFiles(targetDir, dryRun);
   		outcomes.push(...(await pruneStaleHookRuntimeFiles(targetDir, dryRun, [])));
   		await mergeHookSettingsRegistration(prismRepoRoot, consumerRepoRoot, dryRun, false);

   		return outcomes;
   	}
   ```

   Passing `[]` as the third argument to prune sweeps every remaining marked file under `.claude/hooks/`, backing each up first — the right treatment for a marked file at a path PRISM does not ship, on this path as on the delivery path.

   The `.gitignore` lines are deliberately not removed. Leave `appendHookStateGitignoreLines` on the delivery branch only, and do not write a counterpart. See `## Decisions`.

   In `runUpdate`, the config is already loaded — `deriveTokenMap(loadConfig(consumerRepoRoot))` runs near the top. Capture it so the config object is reachable, then pass the resolved hosts:

   ```ts
   	const consumerConfig = loadConfig(consumerRepoRoot);
   	const tokenMap = deriveTokenMap(consumerConfig);
   ```

   ```ts
   	const hookOutcomes = await refreshHookRuntime(
   		prismRepoRoot,
   		consumerRepoRoot,
   		dryRun,
   		resolveHosts(consumerConfig)
   	);
   ```

   with `import { resolveHosts } from "./lib/hosts";` added. `runUpdate` stays the single call site, so `prism adopt` inherits the gate through the same seam, and both branches' outcomes flow into the run summary — which is what makes `--dry-run` preview a removal rather than perform one silently.

   Leave `refreshPlatformSkills`'s hardcoded all-true `optedIn` object exactly as it is. See `## Decisions`.

   Verification: `pnpm prism:check-types`.

4. **Rewrite `checkHookRegistration` around the four host-mix branches** — `scripts/ai-skills/doctor.ts`. Gate route is the same as task 1 (already cleared).

   First, replace the final paragraph of the function's JSDoc:

   ```
    * Removing both halves is silent. Nothing on disk then distinguishes a
    * consumer who deleted the gate from one who never received it — a Cursor or
    * Codex consumer has no `.claude/` tree at all — so reporting it would fire on
    * installs that are correct as they stand.
   ```

   with:

   ```
    * Removing both halves is silent for a consumer who runs Claude Code:
    * nothing on disk distinguishes one who deleted the gate from one who never
    * received it, so reporting it would fire on installs that are correct as
    * they stand.
    *
    * What is decidable is the host mix. `hosts` in the consumer's config says
    * which hosts they run, and `refreshHookRuntime` delivers only when
    * `claude` is among them — so a consumer who does not run Claude Code
    * should have no runtime and no registration, and finding either means an
    * update has not run since they changed the key. Both directions are
    * reported: the absence is informational, the leftover is a warning.
   ```

   Add a non-throwing config read near the other helpers in the file:

   ```ts
   /**
    * Reads the consumer's config for the fields `doctor` branches on, degrading
    * to `null` on any failure. A config that cannot be read or parsed already
    * produces its own `config` finding, and `doctor` never throws — so the
    * host-mix branch falls back to `resolveHosts`'s all-hosts default rather
    * than turning one bad field into a missing check.
    */
   async function readConsumerConfigSafely(
   	consumerRepoRoot: string
   ): Promise<{ hosts?: unknown } | null> {
   ```

   implemented with `readFileIfExists` on `<consumerRepoRoot>/.ai-skills/config.json` and a `try`/`catch` around `JSON.parse`, returning `null` on either miss.

   Then restructure the body. Keep the existing settings parse, the `HOOK_COMMAND_PATH_RE` collection into `registeredPaths`, and the malformed-JSON early return exactly as they are. After `registeredPaths` is built, add:

   ```ts
   	const hosts = resolveHosts(await readConsumerConfigSafely(consumerRepoRoot));
   	const runtimeOnDisk = await readFileIfExists(hookRuntimePath);
   	const runtimeIsPrisms =
   		runtimeOnDisk !== null && runtimeOnDisk.includes(HOOK_RUNTIME_MARKER);
   	const prismIsRegistered = settingsRaw !== null &&
   		collectHookCommands(JSON.parse(settingsRaw) as Record<string, unknown>)
   			.some((command) => PRISM_HOOK_COMMAND_PATTERN.test(command));
   ```

   (hoist the parsed settings object into a variable in the existing block rather than parsing twice), importing `HOOK_RUNTIME_MARKER` and `PRISM_HOOK_COMMAND_PATTERN` from `./update` — doctor already imports `OVERLAY_SUBPATH` and both `resolvePrismSource` helpers from there — and `resolveHosts` from `./lib/hosts`.

   The four branches:

   - **`claude` in `hosts`** — the two existing findings run unchanged: runtime present but unregistered → the existing `warning`; a registered path not on disk → the existing `warning`. When neither fires, push the reach line:

     ```ts
     		findings.push({
     			check: "hook-registration",
     			severity: "info",
     			message:
     				"The hook runtime is installed and registered. It fires on Claude Code only — Codex and Cursor receive no registration, so on those hosts read-before-write is a discipline carried by .prism/rules/context-reuse.md and .prism/references/skill-core.md, not an enforced gate. See docs/ai-skills/compatibility.md § Hook-based enforcement is Claude Code only.",
     		});
     ```

     gated on `findings.length === 0 && registeredPaths.has(hookRuntimePath)` — the first guard keeps the reach line off a report that already carries a warning about this same check, the second keeps it off a repo where nothing is installed at all.

   - **`claude` not in `hosts`, and neither `runtimeIsPrisms` nor `prismIsRegistered`** — one `info`:

     ```ts
     		findings.push({
     			check: "hook-registration",
     			severity: "info",
     			message:
     				`Hook-based enforcement is not delivered on this repo's hosts (${hosts.join(", ")}). PRISM's write gate runs under Claude Code only; on your hosts, read-before-write is carried by the always-on prose in .prism/rules/context-reuse.md and .prism/references/skill-core.md. Add "claude" to hosts in .ai-skills/config.json and run prism update if you want the gate. See docs/ai-skills/compatibility.md § Hook-based enforcement is Claude Code only.`,
     		});
     ```

   - **`claude` not in `hosts`, but `runtimeIsPrisms` or `prismIsRegistered`** — one `warning` naming which half is stale:

     ```ts
     		findings.push({
     			check: "hook-registration",
     			severity: "warning",
     			message:
     				`hosts does not list "claude", but ${staleHalves} still present. This repo has not been updated since hosts changed — run npx @huntermcgrew/prism update to remove PRISM's hook delivery.`,
     		});
     ```

     where `staleHalves` reads `PRISM's hook runtime is`, `PRISM's hook registration in .claude/settings.json is`, or `PRISM's hook runtime and its registration in .claude/settings.json are` depending on which of the two booleans hold. In this branch, suppress the two `claude`-in-hosts findings — a consumer being told to run `update` does not also need "the runtime is present but unregistered."

   Cite `docs/ai-skills/compatibility.md`, never ADR-0074, in any string a consumer reads — numbered ADRs do not ship (ADR-0064), so an ADR citation in consumer output is a dangling reference. ADR-0074 is named in the code comments, which do not ship either way.

   Verification: `pnpm prism:check-types`.

5. **Keep "No issues found." meaningful by keying it on error and warning only** — `scripts/ai-skills/doctor.ts`, in `formatDoctorReport` (line 933). Gate route is the same as task 1 (already cleared).

   Replace:

   ```ts
   	if (report.findings.length === 0) {
   		lines.push("No issues found.");
   	} else {
   		for (const finding of report.findings) {
   			lines.push(`[${SEVERITY_LABEL[finding.severity]}] ${finding.check}: ${finding.message}`);
   		}
   	}
   ```

   with:

   ```ts
   	if (!report.findings.some((f) => f.severity !== "info")) {
   		lines.push("No issues found.");
   	}

   	for (const finding of report.findings) {
   		lines.push(`[${SEVERITY_LABEL[finding.severity]}] ${finding.check}: ${finding.message}`);
   	}
   ```

   Without this, task 4's info branches — which now fire on every healthy install, on every host mix — would suppress the one line that tells a consumer the run was clean. `healthy` already keys on `error` alone and needs no change.

   Land tasks 4 and 5 in one commit; task 4 alone regresses the healthy-run output.

   Verification: `pnpm prism:check-types`.

6. **Update the existing `refreshHookRuntime` call sites and add the config-validation test** — `scripts/ai-skills/update.test.ts`. Gate route is the same as task 1 (already cleared).

   Every existing `refreshHookRuntime(...)` call in this file gains a fourth argument `["claude"]`. There are seven, all in tests whose names begin `refreshHookRuntime:`. Passing the opted-in host explicitly is not just a compile fix — it labels each existing test as the delivery path, which is what the new opt-out tests in task 7 contrast against.

   The three `mergeHookSettingsRegistration(...)` calls and the three `appendHookStateGitignoreLines(...)` calls are unchanged — task 3d's new parameter defaults to `true`.

   Add one test beside the two existing schema-refusal tests (lines 1291 and 1327), reusing their fixture idiom:

   - `test("runUpdate refuses a config.json whose hosts array names an unrecognized host", ...)` — write a consumer config with `hosts: ["claude", "windsurf"]`, assert `runUpdate` rejects, and assert the error message names `/hosts/1`. That pointer is what proves the schema walk reached the array element rather than merely rejecting the object.

   Verification: `pnpm prism:test`.

7. **Add the delivery-gate and removal tests** — `scripts/ai-skills/update.test.ts`, in the same block as the existing `refreshHookRuntime:` tests, using the `withHookRuntimeRoots` fixture and the `prismRuntimeSource` marker helper already defined there. Gate route is the same as task 1 (already cleared).

   Test names state the contract, not the change that produced them, per `.prism/rules/writing-voice.md` § Anti-pattern: Session-context leakage.

   - `test("refreshHookRuntime: a repo that does not run Claude Code receives no runtime, no registration, and no gitignore lines", ...)` — call with `["codex", "cursor"]` against an empty consumer root; assert `.claude/hooks/hook.mjs` does not exist, `.claude/settings.json` does not exist, and `.gitignore` does not exist. The three assertions matter separately: they are the three consumer files the ungated path was writing.
   - `test("refreshHookRuntime: dropping Claude Code from hosts takes back the delivered runtime and PRISM's registration", ...)` — deliver first with `["claude"]`, then call again with `["codex"]` on the same roots; assert every path in `HOOK_RUNTIME_RELATIVE_PATHS` is gone from `.claude/hooks/`, and that the settings file no longer contains `.claude/hooks/hook.mjs`.
   - `test("refreshHookRuntime: a consumer's own hook on an event PRISM registered survives the removal", ...)` — seed `.claude/settings.json` with the `consumerOwnHook` entry the line-1485 test already uses, deliver with `["claude"]`, then call with `["codex"]`; assert the consumer's entry is still the only entry on `PostToolUse`, and that `PostCompact` — which only PRISM registered — is gone from the `hooks` object entirely rather than left as an empty array.
   - `test("refreshHookRuntime: an unmarked file at a runtime path survives the removal", ...)` — write a consumer-authored `.claude/hooks/hook.mjs` with no marker, call with `["codex"]`, assert the file is unchanged. This is the positive control for the marker check on the removal path: without it, a removal that ignored the marker and one that honored it would produce the same result on every other test in this list.
   - `test("refreshHookRuntime: the state-file gitignore lines are left in place when Claude Code is dropped", ...)` — deliver with `["claude"]`, call again with `["codex"]`, assert both globs are still in `.gitignore`. Records the deliberate asymmetry as a test rather than only as a Decision.
   - `test("refreshHookRuntime: dryRun previews a removal without performing it", ...)` — deliver with `["claude"]`, then call with `["codex"]` and `dryRun: true`; assert the outcomes name the removed paths and that the files are all still on disk.

   Verification: `pnpm prism:test`.

8. **Rewrite the healthy-path doctor test and add one per branch** — `scripts/ai-skills/doctor.test.ts`, in the `// --- hook registration ---` block, using the existing `withTempRoots` / `writeFile` / `hookFindings` idiom. Gate route is the same as task 1 (already cleared).

   Fixtures in this block currently write `.claude/hooks/hook.mjs` with the body `"// runtime\n"`, which carries no ownership marker. Every new test that depends on `runtimeIsPrisms` needs the marker line `// @prism-hook-runtime` in the body — write it explicitly rather than relying on the existing placeholder.

   Rewrite the test at line 1080, `"runDoctor reports no hook finding when the runtime and its registration agree"`: keep its fixture, rename it to `"runDoctor reports hook reach, not a problem, when the runtime and its registration agree"`, and change `assert.deepEqual(hookFindings(report.findings), [])` to assert exactly one finding, severity `info`, message matching `/Claude Code only/`.

   Add:

   - `test("runDoctor omits the hook reach line when the runtime is present but unregistered", ...)` — reuse the line-984 fixture; assert one finding of severity `warning` and no `info` finding. The positive control for the `findings.length === 0` guard.
   - `test("runDoctor reports the prose fallback, not a problem, on a repo whose hosts exclude Claude Code", ...)` — config with `hosts: ["codex"]`, no `.claude/` tree; assert one finding, severity `info`, message matching `/not delivered on this repo's hosts/` and naming `codex`.
   - `test("runDoctor warns when hosts exclude Claude Code but PRISM's runtime is still on disk", ...)` — config with `hosts: ["codex"]`, a marker-carrying `.claude/hooks/hook.mjs`, no settings file; assert one finding of severity `warning` matching `/run npx @huntermcgrew\/prism update/`.
   - `test("runDoctor warns when hosts exclude Claude Code but PRISM's registration is still in settings", ...)` — config with `hosts: ["codex"]`, the `PRISM_HOOK_SETTINGS`-shaped registration, no runtime file; assert one `warning`, and that its message names the registration rather than the runtime.
   - `test("runDoctor ignores a consumer's own hook entry when deciding whether PRISM's registration is stale", ...)` — config with `hosts: ["codex"]`, a settings file carrying only the consumer's own `./scripts/consumer-audit.sh` entry, no runtime file; assert no `warning`. The positive control for the anchored command pattern on the doctor side.
   - `test("runDoctor treats an unreadable config as declaring every host", ...)` — no `config.json` at all, plus a runtime and registration that agree; assert the reach `info` fires rather than the stale-delivery warning. This is what proves `resolveHosts`'s fallback reaches doctor.
   - `test("formatDoctorReport still prints No issues found. alongside an info-only finding", ...)` — build a `DoctorReport` literal with one `info` finding, call `formatDoctorReport`, assert the output contains both `No issues found.` and `[INFO] hook-registration:`.

   Leave the line-1099 test (`stays silent when a repo has neither a hook runtime nor a registration`) as it is except for one thing: it needs a config declaring `hosts: ["claude"]`, or it will now fall into the not-delivered `info` branch. Add that config to its fixture and keep its assertion.

   Verification: `pnpm prism:test`.

9. **Reconcile `install-layout.md` and its curated seed twin** — `.prism/architect/_toolkit/install-layout.md` and `templates/install/.prism/architect/_toolkit/install-layout.md`.

   Clear the gate first:

   ```
   cat .prism/architect/_toolkit/spec-editing.md
   cat .prism/architect/guides/writing-an-architect-doc.md
   ```

   In the canonical doc, three edits:

   - § Steady-state persona-skill distribution, the paragraph beginning **The hook runtime rides the same update.** (line 141) — open it with the gate: the runtime rides the update *for a consumer whose `hosts` includes `claude`*, and a consumer who drops `claude` has the marked files and PRISM's own registration entries taken back out on the next update while their `.gitignore` lines stay.
   - § Hook runtime, the **Delivery path.** paragraph (line 147) — name `hosts` as the opt-in and keep the existing sentence that Claude Code is the only host with a delivery path at all. These are two different facts and the paragraph now has to carry both: `hosts` says whether a consumer wants the Claude delivery, and the missing Cursor/Codex registration writers say why no other delivery exists to want.
   - § Write gate, the final sentence of the **The gate is friction, not a wall.** paragraph (line 169) — extend the compensating-control claim: doctor reports a removed hook, reports the reach on an install that has one, and reports a leftover delivery on a consumer whose `hosts` no longer names `claude`.

   Then make the matching edits in the curated twin, in consumer voice and without ADR citations (numbered ADRs do not ship — ADR-0064). The twin's three touch points are its § Steady-state paragraph beginning "**The hook runtime rides the same update.**" (line 122), its § Hook runtime **Delivery path.** paragraph (line 125), and its § Write gate **Turning it off.** paragraph (line 143). The twin is hand-maintained: `install-layout.md` is a `curated` entry in `.ai-skills/definitions/seed-curation.json`, so the build neither writes it nor compares its content and no gate catches this drift.

   Verification: `pnpm prism:check`.

10. **Amend ADR-0074 § Consequences** — `.prism/spec/adrs/_toolkit/0074-hook-enforcement-is-claude-only-with-a-prose-fallback.md`.

    Clear the gate first:

    ```
    cat .prism/architect/_toolkit/spec-editing.md
    cat .prism/architect/guides/writing-an-adr.md
    ```

    Leave the third paragraph's account of the false premise in place — the guide keeps the reasoning that led somewhere wrong, because it is part of why the current answer is right. Replace only its closing two sentences:

    ```
    A clean `doctor` run on those hosts is not evidence that enforcement is present. This ticket does not change doctor (see the plan's `## Decisions`); this record exists so a later reader is not misled by the doc comment.
    ```

    with:

    ```
    A clean `doctor` run on those hosts was therefore not evidence that enforcement is present. The follow-up to this ticket closed both halves: an optional `hosts` array in `.ai-skills/config.json` now gates delivery, so a consumer who does not list `claude` receives no runtime and no registration and has a prior delivery taken back out; and `checkHookRegistration` reads the same key, reporting the prose fallback where the gate is not delivered and warning where a delivery is left over. The `## Context` sentence above stating that delivery is not gated on the consumer's host describes the state this ADR was written in, not the state on `main`.
    ```

    Also correct the `## Context` paragraph beginning "Delivery is not gated on the consumer's host." to past tense with a pointer forward, rather than deleting it — the paragraph is what makes the Consequence legible.

    `Status` stays `accepted`. The decision the ADR records — Claude-only enforcement with prose everywhere else — is unchanged; what moved is one consequence and one fact about the installer.

    Verification: `pnpm prism:check` (crossref-lint resolves the plan-path reference; the ADR is `excluded` from the seed, so there is no twin to sync).

11. **Update the consumer-facing hook section** — `docs/ai-skills/compatibility.md`, § "Hook-based enforcement is Claude Code only".

    Clear the gate first:

    ```
    cat .prism/architect/_toolkit/documentation.md
    cat .prism/architect/_toolkit/architecture-doc-shape.md
    ```

    Replace the section's final line:

    ```
    A clean `prism doctor` run on a Codex-only or Cursor-only install isn't evidence that enforcement is present — the check looks for a Claude-shaped registration.
    ```

    with two short paragraphs: `prism doctor` now says which case you are in — it prints the Claude-only reach on an install that has the gate, and says the gate is not delivered on a repo whose `hosts` excludes `claude`; and PRISM only installs the hook when `hosts` includes `claude` (or when `hosts` is absent, which means all hosts), so a Codex-only or Cursor-only repo that lists its hosts gets no `.claude/hooks/`, no settings merge, and no `.gitignore` lines. Point at `docs/parameterization.md` § Field reference for the key.

    Bump `last_updated` in the frontmatter to the date you make the edit, per `.prism/architect/_toolkit/documentation.md` § Frontmatter schema.

    Verification: `pnpm prism:check`.

12. **Document the new config key where consumers look for config keys** — `docs/parameterization.md`. Gate route is the same as task 11 (already cleared).

    Two edits:

    - § Config schema, the example JSON block (around line 31) — add `"hosts": ["claude"],` beside the existing `techStack` line so the key is visible in the shape a reader copies.
    - § Field reference, the table (around line 53) — add a row: `` | `hosts` | string[] | optional | Which AI coding hosts this repo runs — `claude`, `codex`, `cursor`. Absent means all of them, so an existing install needs no change. Gates hook-runtime delivery: PRISM writes `.claude/hooks/` and its `.claude/settings.json` registration only when `claude` is listed, and takes them back out on the next `prism update` after you remove it. | ``

    `hosts` is not a token, so it does not belong in § All tokens. Do not add it there.

    Verification: `pnpm prism:check`.

13. **Run the full gate and ship** — `pnpm prism:check` from the worktree root. Append the implementation entry to `## History` and the `close:` clause to the `## Sessions` line per `.prism/rules/session-orientation.md` § Battery Persistence.

    Ship per `.prism/rules/skill-routing.md` § Authors ship, reviewers review: commit, push, open a draft PR whose body opens with "Follow-up to PRISM-477. No new ticket per `.prism/rules/followup-scope.md`." per that rule's § Follow-up PR conventions.

---

## Decisions

- **`hosts` is an optional array in `.ai-skills/config.json`, absent meaning all three hosts.** Hunter's call, taken after the first pass of this plan found no host signal anywhere in the consumer surface.
  - **Root cause of the earlier framing:** PRISM-477's Decision and ADR-0074 § Context both say `refreshHookRuntime` is called "with no `optedIn` check," which reads as though a value exists and the call site forgot it. None existed: `config.schema.json` had no host key, `paths.json` declares where each host's output goes rather than whether it is wanted, and `build.ts`'s `optedIn` is a check-mode drift heuristic over PRISM's own managed-marker directories. `update.ts`'s hardcoded all-true was the only value available.
  - **Alternatives considered:** a key defaulting to no hosts — rejected, it strips a working install from every existing consumer on their next update; deriving the signal from what is on disk — rejected as circular, since `runUpdate` creates `.claude/skills` and `.claude/agents` itself, so after the first run the evidence is self-fulfilling; a `--no-hooks` flag or environment variable — rejected because a per-invocation switch does not describe a repo, so it would have to be remembered on every update by every person who runs one.
  - **Chosen approach:** absent-means-all is what makes this shippable as a follow-up PR — no migration, no `init` flag, no onboarding question, and every existing consumer's next update is a no-op on this axis.
  - **Implementation guidance:** the key needs no validator code. `validateNode` in `lib/config-schema-validate.ts` already walks `type`, `items`, `enum`, and `uniqueItems`, and it reads enum values out of the schema file rather than a hand-maintained mirror — so `"windsurf"` throws `ConfigSchemaValidationError` at `/hosts/1` from code that already exists, before `runUpdate` writes anything.
  - → promoted to `.prism/architect/_toolkit/install-layout.md` § Hook runtime (task 9) and to `docs/parameterization.md` § Field reference (task 12)

- **`"hosts": []` resolves to all three hosts, not none.** An empty array is far likelier to be an editing accident than a request to opt out of everything, and resolving it to "no hosts" would silently strip a working install from a consumer who meant to list one. A consumer who wants no hook delivery expresses it by listing the hosts they do run. Considered treating `[]` as literal — rejected on that asymmetry of consequences: the mistake costs a silent removal, the strictness costs nothing anyone asked for.
  - → no promotion needed (the resolver's own doc comment carries the reason at the point of use)

- **Dropping `claude` from `hosts` takes back the marked runtime files and PRISM's own registration entries, and leaves the `.gitignore` lines.** Hunter's recommendation, taken.
  - **Root cause of the asymmetry:** the three writes differ in what they are. The runtime files and the registration are PRISM's own content, identified by `HOOK_RUNTIME_MARKER` and by an end-anchored command pattern, and together they install *behavior*. The `.gitignore` lines are two inert globs in a file the consumer owns, and `install-layout.md` § Hook runtime already states that those two lines are the whole of what PRISM writes there.
  - **Alternatives considered:** prune the files but leave the settings entries — rejected because it leaves the consumer with a registration pointing at a deleted file, which is a worse state than either doing nothing or finishing the job; remove the `.gitignore` lines too — rejected because line-level surgery on a consumer's `.gitignore` risks more than a stale ignore glob costs, and the append is documented as append-only by design.
  - **Chosen approach:** the removal is the drop half of the merge that already runs on every update — `mergeHookEventEntries` with an empty incoming set — rather than a second ownership rule that could disagree with the first. File removal splits by path for the same reason delivery and prune already split: a marked file at a canonical path is PRISM's and goes without a backup, a marked file anywhere else under `.claude/hooks/` is plausibly a consumer's adaptation and is backed up first.
  - **Implementation guidance:** a hand-edited registration whose command no longer matches the anchored pattern is not claimed, survives the removal, and then points at a missing file — which doctor's existing dead-registration warning reports, with `prism update` as the remedy. That is the correct trade: loosening the anchor to catch it would let removal delete a consumer's own wrapper.
  - → promoted to `.prism/architect/_toolkit/install-layout.md` § Hook runtime (task 9)

- **One resolver, `resolveHosts` in `scripts/ai-skills/lib/hosts.ts`, read by both `update.ts` and `doctor.ts`.** Two adapters serving the same port earn the abstraction (`.prism/rules/code-standards.md` § General), and here the second adapter is not hypothetical: an installer and a diagnostic that read the same key differently reproduce exactly the misleading clean report this change exists to remove. The function is total and never throws, because `doctor` never throws — validation is `validateConsumerConfigAgainstSchema`'s job at the `runUpdate` boundary, and resolution is this function's.
  - → no promotion needed (a one-function seam whose reason lives in its own doc comment)

- **`refreshHookRuntime`'s `hosts` parameter is required, not defaulted.** A default meaning "deliver" is the exact footgun this change exists to close — a future caller that forgets the argument silently reinstates the ungated behavior. The cost is updating seven existing test call sites, which is mechanical and has a side benefit: passing `["claude"]` explicitly labels each existing test as the delivery path, which is what the new opt-out tests contrast against. Considered defaulting to `HOST_NAMES` to leave those tests untouched — rejected on that footgun.
  - → no promotion needed (an API choice evident from the signature)

- **`HOOK_RUNTIME_MARKER` and `PRISM_HOOK_COMMAND_PATTERN` are exported from `update.ts` rather than moved to a shared module.** Doctor has to answer "is this PRISM's runtime" and "is this PRISM's registration" with exactly the answers the installer would give, and doctor already imports `OVERLAY_SUBPATH`, `resolvePrismSource`, and `resolveSelfPrismSource` from `update.ts` — the direction is established. Considered extracting a `lib/hook-runtime.ts` to hold the ownership signals: rejected as churn beyond this PR's frame; it moves working code and its tests to buy a tidier import graph, and `.prism/rules/code-standards.md` § General asks for the abstraction when a second concrete case forces it, not before. Worth revisiting if a third module needs these.
  - → no promotion needed (an import-direction choice; revisit if a third caller appears)

- **`refreshPlatformSkills` keeps its hardcoded all-true `optedIn` this PR.** It writes `.claude/skills/**`, `.agents/skills/**`, and `.cursor/skills/**` on every consumer regardless of host — the same ungated shape, but a different risk: those are PRISM's own managed roots, marked with `.ai-skill-generated` and swept by its own orphan cleanup, and what lands there is inert data rather than behavior installed into the consumer's own config files. Hunter chose the narrower PR. The `hosts` key now exists for it to read, so the follow-up is a call-site change rather than a design question. Recommend Nora file it.
  - → no promotion needed (a scoping call; the follow-up is the durable half)

- **An Atlas onboarding question for `hosts` is out of scope and is follow-up work.** Absent-means-all is what lets this ship without one — a consumer who never answers a question still gets correct behavior. The question is worth adding so a Codex-only team gets the right value at install time instead of discovering it in `doctor` output. Recommend Nora file it alongside the `refreshPlatformSkills` item; they are the same shape (a second reader of a key that now exists) and may be one ticket.
  - → no promotion needed (follow-up scope, not a constraint on this PR)

- **The new doctor findings are `info` on both no-delivery paths and `warning` only on a leftover delivery.** An `info` asserts nothing is wrong, which is true both when the gate is present and working and when a consumer's hosts simply do not include Claude Code. The leftover case is the one thing a consumer can act on — their repo does not match their config — so it earns a warning and names `prism update` as the remedy. `severity: "info"` already exists in the `DoctorFinding` union and in `SEVERITY_LABEL`, and `healthy` keys on `error` alone, so no new finding can flip a consumer's exit code.
  - → no promotion needed (a local choice inside one check)

- **`formatDoctorReport`'s "No issues found." moves from a total-count test to an error-or-warning test.** The reach and not-delivered findings now fire on every healthy install on every host mix, so without this the info line silently costs consumers the one line telling them the run was clean. Considered accepting the loss: rejected, it trades a consumer-facing regression for a three-line edit. Considered printing info findings above the "No issues found." line: rejected as noise before signal.
  - → no promotion needed (implementation tactic, evident from the diff)

- **`mergeHookSettingsRegistration` skips writing `.claude/settings.json` when the consumer never had one and removal leaves nothing to merge in.** Without this, a repo with no prior settings file whose `hosts` excludes `claude` would get one written as `{"hooks":{}}` on every update — a file appearing from nothing, failing AC-2. Found while writing the no-registration removal test, not speced in task 3d.
  - → no promotion needed (a guard on one function, evident from the diff)

- **The `docs/` edits are absorbed into Clove's lane rather than routed to Eli.** Both are reference-shaped corrections driven directly by the code in the same PR — a field-reference row for a key this PR adds, and a section whose closing claim this PR's code makes false. `.prism/rules/code-standards.md` § Removal and rename completeness asks that every prose home of a changed predicate be reconciled in the same review pass, and splitting two table-and-sentence edits across a persona handoff costs more than it protects. Recorded here because `.prism/rules/branch-plan.md` § Implementation Tasks permits cross-lane absorption only with a `## Decisions` entry naming the scope shift and the affected files: `docs/ai-skills/compatibility.md` and `docs/parameterization.md`.
  - → no promotion needed (one application of an existing rule)

- **No new ADR.** Per `.prism/references/triple-gated-adr-criterion.md`: *hard to reverse* — `hosts` is additive and absent-means-all, so reverting is deleting a schema block and a branch; *surprising without explanation* — ADR-0072 already names doctor visibility as the compensating control and ADR-0074 § Consequences already records that the installer contradicted it, so this closes a documented gap rather than establishing a new posture; *genuine trade-off* — the removal-on-drop call is real, and it is recorded above with its rejected alternatives, which is what a plan Decision is for. Gate 1 is the weakest of the three and is recorded that way rather than argued up.
  - → no promotion needed (an application of the existing criterion)

- **ADR-0074 is amended in both `## Context` and `## Consequences`, and neither paragraph is deleted.** `.prism/architect/guides/writing-an-adr.md` keeps the reasoning that led somewhere wrong, because it is part of why the current answer is right. The `## Context` sentence asserting that delivery is not gated on host is now false on `main`, so it moves to past tense with a pointer forward rather than vanishing — a reader who finds the Consequence needs the Context that produced it. `Status` stays `accepted`: the decision is unchanged, one of its consequences moved.
  - → no promotion needed (the guide already carries the standing rule)

---

## Sessions

- 2026-09-02 [huntermcgrew/prism-477-followup-hook-optin] open: Intent — close the misleading clean-doctor signal PRISM-477 recorded and left unfixed; Bounds — done when doctor reports hook reach and every prose home of the old claim is reconciled, touching no file under `scripts/ai-skills/update.ts` and no test of `refreshHookRuntime`; Approach — reporting half only, because the delivery half has no consumer signal to gate on · close: drifted — Hunter widened the scope to add a `hosts` config key and gate both halves, so `update.ts`, its tests, and the config schema are now in bounds; re-planned against the decided shape.
- 2026-09-02 [huntermcgrew/prism-477-followup-hook-optin] open: Intent — implement the 13-task plan gating hook delivery on an optional `hosts` key; Bounds — done when all 17 ACs pass, `pnpm prism:check` exits 0, and a draft PR is open; Approach — follow the plan's exact task sequence, one commit per task per `git-conventions.md` § Commit Granularity · close: scope held — all 13 tasks implemented as specced, 21 tests added, all 17 ACs verified, `pnpm prism:check` exits 0.
- 2026-09-02 [huntermcgrew/prism-477-followup-hook-optin] open: Intent — self-review the branch against the plan's 17 AC and the gate/removal logic in `update.ts`/`doctor.ts`; Bounds — done when every code path is traced by hand (removal branch, `resolveHosts`, `mergeHookEventEntries` with an empty incoming set, the four doctor branches) and `pnpm prism:check` is re-run; Approach — read every diff hunk plus the full surrounding function bodies, not just the diff context · close: scope held — traced all named paths, ran `pnpm prism:check` (849 tests, exit 0), found one Major (missing direct test for the documented empty-`hosts`-array behavior) and one Cleanup note (an undocumented but correct guard in `mergeHookSettingsRegistration`).

---

## History

- 2026-09-02 [huntermcgrew/prism-477-followup-hook-optin]: Winston planned the follow-up as the doctor half only, having found no per-host opt-in signal anywhere in the consumer surface.
- 2026-09-02 [huntermcgrew/prism-477-followup-hook-optin]: Hunter decided the scope — add an optional `hosts` key and gate delivery and reporting on it. Re-planned to 13 tasks across the config schema, a shared resolver, the installer's gate and removal branch, doctor's four host-mix branches, and four prose homes; see Decision: "`hosts` is an optional array in `.ai-skills/config.json`, absent meaning all three hosts."
- 2026-09-02 [huntermcgrew/prism-477-followup-hook-optin]: Clove implemented all 13 tasks — the `hosts` schema key and resolver, the installer's delivery gate and removal branch, doctor's four host-mix branches, 21 new tests across `update.test.ts` and `doctor.test.ts`, and the four prose homes (`install-layout.md` canonical and curated twin, ADR-0074, both consumer docs). `pnpm prism:check` exits 0.
- 2026-09-02 [huntermcgrew/prism-477-followup-hook-optin]: Clove fixed Briar's self-review findings — added `scripts/ai-skills/lib/hosts.test.ts` (10 direct tests on `resolveHosts`, including the empty-array-resolves-to-all contract) and recorded the `mergeHookSettingsRegistration` empty-write guard as a `## Decisions` entry. Both Review Issues resolved.
- 2026-09-02 [huntermcgrew/prism-477-followup-hook-optin]: Clove fixed Eric's PR-review finding — the dead-registration check in `checkHookRegistration` had moved inside the `hosts.includes("claude")` branch during the restructure, so a hand-edited registration surviving a `claude`-dropped removal went unreported. Moved the check to run on every host mix except the stale-delivery early return, and added a doctor.test.ts case for the combination.

---

## Debugged Issues

None recorded on this branch. The originating defect is documented in `.prism/plans/prism-477.md` § Decisions and in ADR-0074 § Consequences.

---

## Review Issues

### `resolveHosts`'s empty-array behavior has no direct unit test

- **Severity:** `major`
- **Status:** `fixed`
- **File:** `scripts/ai-skills/lib/hosts.ts:26`
- **Problem:** The plan's `## Decisions` records a deliberate, non-obvious call — `"hosts": []` resolves to all three hosts, not none — with a rejected alternative and a stated reason (an empty array is more likely an editing accident than an opt-out-of-everything request; resolving it to "none" would silently strip a working install). No test in `update.test.ts` or `doctor.test.ts` exercises `hosts: []`, and there is no `hosts.test.ts`. The only coverage is indirect, through fixtures that never pass an empty array. This is exactly the kind of branch (`recognized.length > 0 ? recognized : [...HOST_NAMES]`) a future refactor can silently invert — e.g. simplifying it to `return recognized;` — with nothing in the suite catching it, and the consequence is a silent hook-runtime removal on every consumer's next update.
- **Suggested fix:** Add a direct test for `resolveHosts` (either a small `scripts/ai-skills/lib/hosts.test.ts` or two integration-level tests in `update.test.ts`/`doctor.test.ts` seeding `hosts: []`) asserting it resolves to all three hosts, not none.
- **Fixed in:** `PRISM-477 followup: Pin the empty hosts fallback with a direct test` — `scripts/ai-skills/lib/hosts.test.ts` (10 tests).

---

### Dead-registration check only ran when `hosts` included `claude`

- **Severity:** `major`
- **Status:** `fixed`
- **File:** `scripts/ai-skills/doctor.ts:764` (pre-fix line)
- **Problem:** The pre-PR check that reports a registered command pointing at a file that is not on disk ran unconditionally. This PR's restructure moved it inside `if (hosts.includes("claude"))`, so it stopped running whenever `hosts` excludes `claude`. A consumer who hand-edited a PRISM hook command into a shape `PRISM_HOOK_COMMAND_PATTERN` no longer matches, then drops `claude` from `hosts` and runs `prism update`, gets the marked runtime file removed (unaffected, since the entry isn't claimed as PRISM's own) while the surviving unanchored registration still points at the now-deleted file — and `doctor` reports "not delivered, clean" instead of warning. The plan's task-3e Decision (line 184) and Implementation guidance (line 502) both claim "doctor's existing dead-registration warning reports it," which was true pre-PR and false after the restructure.
- **Suggested fix:** Run the dead-registration check regardless of the resolved `hosts` — it is about the consumer's `settings.json` pointing at a missing file, which is wrong on every host mix — while keeping the other three host-mix outcomes as designed.
- **Fixed in:** `PRISM-477 followup: Run the dead-registration check on every host mix` — the loop over `registeredPaths` moved out of the `hosts.includes("claude")` branch (still suppressed on the stale-delivery early return, where "run update" already covers it); `scripts/ai-skills/doctor.test.ts` gained "runDoctor warns on a dead registration even when hosts excludes Claude Code". The plan's task-3e prose (lines 184, 502) needed no correction — the claim is true again with the fix in place.

---

## Acceptance Criteria

### Behavioral

**Background:** A consumer repo with a valid `.ai-skills/config.json`, run through `prism update` at least once.

- [x] **AC-1** Given a repo whose config does not mention hosts at all, When it is updated, Then the hook runtime is delivered exactly as it was before this change
  - Evidence (machine): `pnpm prism:test` → the seven pre-existing `refreshHookRuntime:` tests pass with `["claude"]` supplied, and the `runUpdate copies content and projects the persona roster` test passes against a config with no `hosts` key · UNMET looks like: any of those tests fails, or a fixture with no `hosts` key produces no `.claude/hooks/hook.mjs`

- [x] **AC-2** Given a repo whose config lists only Codex and Cursor as its hosts, When it is updated, Then it receives no hook files, no hook entry in its Claude settings, and no new lines in its gitignore
  - Evidence (machine): `pnpm prism:test` → the "a repo that does not run Claude Code receives no runtime, no registration, and no gitignore lines" test passes, asserting all three files absent · UNMET looks like: any of `.claude/hooks/hook.mjs`, `.claude/settings.json`, or `.gitignore` exists after the call

- [x] **AC-3** Given a repo that previously received the hook runtime, When Claude Code is removed from its hosts and it is updated, Then PRISM's hook files and its own registration entries are taken back out
  - Evidence (machine): `pnpm prism:test` → the "dropping Claude Code from hosts takes back the delivered runtime and PRISM's registration" test passes · UNMET looks like: a runtime file remains on disk, or the settings file still contains `.claude/hooks/hook.mjs`

- [x] **AC-4** Given that removal, When it completes, Then anything the consumer wrote themselves is untouched — their own hook entries, their own files under the hooks directory, and their gitignore lines
  - Evidence (machine): `pnpm prism:test` → the consumer-own-hook, unmarked-file, and gitignore-lines removal tests all pass · UNMET looks like: the consumer's `PostToolUse` entry is gone, an unmarked `hook.mjs` was deleted, or the state-file globs were stripped from `.gitignore`

- [x] **AC-5** Given a config naming a host PRISM does not recognize, When the repo is updated, Then the update refuses before writing anything and names the offending field
  - Evidence (machine): `pnpm prism:test` → the unrecognized-host test passes, asserting the rejection message names `/hosts/1` · UNMET looks like: the update succeeds, or the message names the object rather than the array element

- [x] **AC-6** Given a repo that runs Claude Code with the gate installed and working, When the consumer runs `prism doctor`, Then they are told the gate covers Claude Code only, and are still told no issues were found
  - Evidence (machine): `pnpm prism:test` → the reach test passes asserting one `info` finding matching `/Claude Code only/`, and the `formatDoctorReport` test passes asserting the output contains both `No issues found.` and `[INFO] hook-registration:` · UNMET looks like: the finding is absent, its severity is `warning`, or `No issues found.` is missing from the rendered output

- [x] **AC-7** Given a repo whose hosts exclude Claude Code and which has no leftover delivery, When the consumer runs `prism doctor`, Then they are told the gate is not delivered on their hosts and that the prose fallback applies — as information, not a problem
  - Evidence (machine): `pnpm prism:test` → the not-delivered test passes asserting one `info` finding matching `/not delivered on this repo's hosts/` and naming `codex` · UNMET looks like: the finding's severity is `warning` or `error`, or no finding is produced

- [x] **AC-8** Given a repo whose hosts exclude Claude Code but which still carries PRISM's runtime or registration, When the consumer runs `prism doctor`, Then they are warned about the leftover and told to run the update
  - Evidence (machine): `pnpm prism:test` → both stale-delivery tests pass, each asserting a `warning` matching `/run npx @huntermcgrew\/prism update/`, and the consumer-own-entry test passes asserting no warning · UNMET looks like: the warning does not fire on a marked runtime, or it fires on a repo carrying only the consumer's own hook entry

- [x] **AC-9** Given a repo with no readable config, When the consumer runs `prism doctor`, Then the hook check behaves as though every host were declared rather than going silent or erroring
  - Evidence (machine): `pnpm prism:test` → the unreadable-config test passes, asserting the reach `info` fires rather than the stale-delivery warning · UNMET looks like: the stale-delivery warning fires, or the check produces no finding

- [x] **AC-10** Given any of these runs, When it finishes, Then the exit status is unchanged from before this change
  - Evidence (machine): `pnpm prism:test` → the existing doctor tests asserting `report.healthy === true` pass unmodified · UNMET looks like: a healthy fixture reports `healthy: false`, meaning a new finding leaked into the error severity

### Non-behavioral

- [x] **AC-11** `hosts` is resolved in exactly one place, and both the installer and the doctor read it from there
  - Evidence (machine): `grep -rn "\.hosts" scripts/ai-skills --include=*.ts` → the only hits outside `lib/hosts.ts` and its tests are type declarations, not reads; positive control: `grep -rn "resolveHosts" scripts/ai-skills` returns hits in both `update.ts` and `doctor.ts`, proving both call the shared function · UNMET looks like: `update.ts` or `doctor.ts` reads `config.hosts` directly

- [x] **AC-12** `refreshPlatformSkills` is unchanged — this PR gates hook delivery, not skill rendering
  - Evidence (machine): `git diff origin/main...HEAD -- scripts/ai-skills/update.ts` → the diff contains no change inside `refreshPlatformSkills`; positive control: the same diff does show changes inside `refreshHookRuntime`, proving the diff is being read · UNMET looks like: the `optedIn` literal in `refreshPlatformSkills` appears in the diff

- [x] **AC-13** The false premise "a Cursor or Codex consumer has no `.claude/` tree at all" survives nowhere in the tree
  - Evidence (machine): `grep -rn "no .claude. tree at all" .` → no matches; positive control: `grep -rn "hook-registration" scripts/ai-skills/doctor.ts` returns matches, proving the search reaches the file · UNMET looks like: the first grep returns a hit in `doctor.ts` or any mirror

- [x] **AC-14** Consumer-facing output and shipped docs cite no numbered ADR
  - Evidence (machine): `pnpm prism:check` → exits 0 with crossref-lint's install-adr-gate green · UNMET looks like: the gate reports an `ADR-NNNN` reference in the install seed or in a consumer-facing string

- [x] **AC-15** The curated seed twin of `install-layout.md` carries the same corrected claims as its canonical partner
  - Evidence (human): open `templates/install/.prism/architect/_toolkit/install-layout.md` and confirm its § Steady-state, § Hook runtime, and § Write gate paragraphs each name the `hosts` gate · UNMET looks like: any of the three still describes delivery as unconditional

- [x] **AC-16** A consumer can find the new key where they look for config keys
  - Evidence (human): open `docs/parameterization.md` § Field reference and confirm a `hosts` row states the allowed values, the absent-means-all default, and the delivery consequence · UNMET looks like: no `hosts` row, or a row that omits the default

- [x] **AC-17** The full repository gate passes
  - Evidence (machine): `pnpm prism:check` → exit 0 · UNMET looks like: any non-zero exit, with the failing sub-gate named in the output

### AC Adjustments

### AC Sync Log

| Date | Agent | Action | Plan | Ticket |
| ---- | ----- | ------ | ---- | ------ |
| 2026-09-02 | Winston | Not synced — follow-up PR, no ticket of its own per `followup-scope.md` | prism-477-followup-hook-optin | N/A |

---

## Cleanup Items

- `scripts/ai-skills/update.ts:1390` — `mergeHookSettingsRegistration` gained a guard (`if (targetRaw === null && Object.keys(mergedHooks).length === 0) return;`) not named in any `## Decisions` entry. It's correct and necessary — without it, a repo that never had `.claude/settings.json` and whose `hosts` excludes `claude` would get one written as `{"hooks":{}}`, failing AC-2 — but it's a real addition beyond task 3d's spec. Worth a one-line Decision recording it. **Addressed** — see the `## Decisions` entry "`mergeHookSettingsRegistration` skips writing `.claude/settings.json`...".

---

## PR Readiness

- [x] No critical or major issues — both Majors (Briar's empty-array test gap, Eric's dead-registration host-mix scoping) are fixed; see `## Review Issues`
- [x] Types correct — no `any`, no unsafe `as`
- [x] No stray console.logs or debug artifacts
- [x] Tests written for new logic and edge cases — `scripts/ai-skills/lib/hosts.test.ts` (10 tests) and a new doctor.test.ts case for the dead-registration fix
- [x] All debugged issues resolved (no `open` entries)
- [x] Build passes — last run: 2026-09-02 (`pnpm prism:check` exit 0, 860 tests passing)
- [x] PR description up to date — PR #480 open
- [x] Lasting decisions promoted to architect context (if applicable) — `install-layout.md` (tasks 9), `docs/parameterization.md` (task 12)

**Last updated:** 2026-09-02 (Clove — fixed Eric's PR-review finding)
