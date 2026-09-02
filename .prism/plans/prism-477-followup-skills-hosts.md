# Plan: PRISM-477 followup — gate skill and content output on `hosts`

## Ticket

Follow-up to https://github.com/HunterMcGrew/PRISM/issues/477. Lineage: PR #478 (`6649a235`) recorded the posture in ADR-0074 and named the ungated delivery as a defect; PR #480 (`0a896924`) added the `hosts` key, `scripts/ai-skills/lib/hosts.ts`, and the hook-delivery gate, and recorded the remaining ungated skill fanout as a follow-up. No new ticket per `.prism/rules/followup-scope.md` § Choosing the vehicle — post-merge, same-scope, so this is a follow-up PR off `main`.

Adjacent lane: issue #481 is rewriting Atlas. Nothing in this plan touches `.ai-skills/skills/prism-onboarding/**` or `.prism/references/onboarding/**`, and nothing in it should — the onboarding question that would set `hosts` at install time belongs to that lane. See `## Decisions`.

## Goal

Stop writing a host's skill roster and platform content copies into a consumer who does not run that host, and take back what a previous update already wrote when they drop one.

---

## User Stories

Not applicable — an installer change with no end-user feature.

---

## Design

Not applicable — no UI.

---

## Implementation Tasks

Every task below writes to a path the architect write gate routes. Each names the exact clearing commands.

**Two gate mechanics that cost real time in the previous lane.** Run each clearing `cat` as a bare command with a single path operand — a `cd <dir> && cat <doc>` does not clear it, because the `&&` disqualifies the read-only proof and the whole command is judged as a write. And the hook resolves its read-state against the main checkout, so from a worktree you clear the gate by reading the main checkout's copy (`cat /Users/hunter/Documents/PRISM/PRISM/.prism/architect/...`) and then make the edit in the worktree.

Sequence: task 1 adds the derivation, tasks 2–4 consume it in the installer, task 5 is the drop sweep, task 6 is doctor, tasks 7–9 are the tests, tasks 10–12 are the prose homes, task 13 ships. Tasks 2–5 depend on task 1.

### Clove (implementation)

1. **Derive the six-flag `optedIn` shape from `hosts`, beside the resolver that already reads the key** — `scripts/ai-skills/lib/hosts.ts`.

   Clear the gate first:

   ```
   cat /Users/hunter/Documents/PRISM/PRISM/.prism/architect/_toolkit/spec-editing.md
   cat /Users/hunter/Documents/PRISM/PRISM/.prism/architect/_toolkit/skills-ecosystem.md
   cat /Users/hunter/Documents/PRISM/PRISM/.prism/architect/_toolkit/output-guards.md
   cat /Users/hunter/Documents/PRISM/PRISM/.prism/architect/_toolkit/install-layout.md
   ```

   Append to the existing file, leaving `HOST_NAMES`, `HostName`, and `resolveHosts` untouched:

   ```ts
   /**
    * The per-output flags `generatePlatformSkills` branches on, derived from a
    * host set.
    *
    * Three hosts, six outputs — a host owns more than one. Claude Code reads
    * both a skill roster and agent definitions; Codex reads a skill roster, its
    * own agent adapters, and `codex-config.toml`; Cursor reads a skill roster
    * only. Deriving the six from the three in one place is what keeps a caller
    * from gating the roster and forgetting the adapters beside it.
    *
    * This is deliberately not what `build.ts` computes. That object answers a
    * different question — has this platform ever been built in this checkout,
    * so is a diff real drift or an unbuilt platform — and wiring it to a config
    * key would make `prism:check` pass or fail on a value unrelated to drift.
    * See the plan's `## Decisions`.
    */
   export interface HostOutputFlags {
   	claude: boolean;
   	codex: boolean;
   	cursor: boolean;
   	codexAgents: boolean;
   	claudeAgents: boolean;
   	codexConfig: boolean;
   }

   export function deriveOptedIn(hosts: HostName[]): HostOutputFlags {
   	const has = (host: HostName): boolean => hosts.includes(host);

   	return {
   		claude: has("claude"),
   		claudeAgents: has("claude"),
   		codex: has("codex"),
   		codexAgents: has("codex"),
   		codexConfig: has("codex"),
   		cursor: has("cursor"),
   	};
   }
   ```

   Verification: `pnpm prism:check-types`.

2. **Gate the skill roster, the agent adapters, and the Codex config** — `scripts/ai-skills/update.ts`, in `refreshPlatformSkills` (the hardcoded `optedIn` object at line 884). Gate route is the same as task 1 (already cleared).

   Add a `hosts: HostName[]` parameter to `refreshPlatformSkills` — required, not defaulted, for the same reason PR #480 made `refreshHookRuntime`'s required: a default meaning "write everything" is the footgun this change exists to close. Replace the hardcoded object with `const optedIn = deriveOptedIn(hosts);` and pass `optedIn` through to `generatePlatformSkills`.

   In the same function, narrow the leftover-token guard. It currently scans all five target roots unconditionally:

   ```ts
   	const leftoverTokenViolations = await runLeftoverTokenGuard(consumerRepoRoot, [
   		targetRoots.claude,
   		targetRoots.claudeAgents,
   		targetRoots.codex,
   		targetRoots.codexAgents,
   		targetRoots.cursor,
   	]);
   ```

   Build that array from the flags instead — include `targetRoots.claude` when `optedIn.claude`, `targetRoots.claudeAgents` when `optedIn.claudeAgents`, and so on. The guard exists to check output this pass actually wrote; scanning a root the pass skipped either finds nothing or reports stale content from before the consumer set `hosts`, and the second case fails an update over bytes this run did not produce.

   In `runUpdate`, pass the already-resolved hosts. `runUpdate` gained `resolveHosts(consumerConfig)` in PR #480 — hoist it into a local so both the hook call and this one read one value rather than resolving twice:

   ```ts
   	const hosts = resolveHosts(consumerConfig);
   ```

   and pass `hosts` to both `refreshHookRuntime` and `refreshPlatformSkills`.

   Verification: `pnpm prism:check-types`.

3. **Label each platform dir with its host** — `scripts/ai-skills/utils.ts`, in `buildPlatformDirs` (line 513). Gate route is the same as task 1 (already cleared).

   Add `host` to each of the three returned entries — `host: "claude"`, `host: "codex"`, `host: "cursor"` — and widen the return type to `{ dir: string; dialect: RuleDialect; host: HostName }[]`, importing `HostName` from `./lib/hosts`.

   The addition is purely additive: every existing consumer destructures `{ dir, dialect }`, and `syncAllPlatformContentCopies`'s parameter type is structural, so an entry carrying an extra property still satisfies it. Do not change what the function returns — `build.ts` needs all three, always.

   The label is what makes task 4 possible. Filtering by array position would work today and break silently the first time someone reorders the list.

   Verification: `pnpm prism:check-types`.

4. **Gate the platform content copies** — `scripts/ai-skills/update.ts`, in `runUpdate` around the `buildPlatformDirs` call (line 496) and `refreshPlatformDirs` (line 949). Gate route is the same as task 1 (already cleared).

   This is the fanout site that carries no `optedIn` at all, so a search for that name does not find it. `refreshPlatformDirs` calls `syncAllPlatformContentCopies` over every entry `buildPlatformDirs` returns, which copies `.prism/rules/`, `.prism/architect/`, `.prism/spec/`, `.prism/templates/`, `.prism/references/`, and `SPEC.md` into `.claude/`, `.codex/`, and `.cursor/` on every update, for every consumer.

   In `runUpdate`, filter the built list before it reaches `refreshPlatformDirs`:

   ```ts
   	const platformDirs = buildPlatformDirs(
   		consumerRepoRoot,
   		consumerPathDefinitions
   	).filter((entry) => hosts.includes(entry.host));
   ```

   Filter at this call site rather than inside `buildPlatformDirs`. `build.ts` calls the same helper and must keep all three — pushing the filter into the shared helper would put PRISM's own committed platform output at the mercy of PRISM's own `hosts` value.

   Leave `refreshPlatformDirs` itself unchanged; it loops over whatever list it is handed, including the overlay pass, which then inherits the same filter.

   Verification: `pnpm prism:check-types`.

5. **Take back a dropped host's output on the next update** — `scripts/ai-skills/update.ts` and two exports. Gate route is the same as task 1 (already cleared).

   **5a. Export the two skill-cleanup helpers.** In `scripts/ai-skills/generate-skills.ts`, change `removeDeletedManagedSkills` and `removeDeletedManagedAgentFiles` to `export async function`. Leave their bodies and their existing call sites at the tail of `generatePlatformSkills` exactly as they are.

   **5b. Export the content-area list.** In `scripts/ai-skills/build.ts`, change `const COPIED_CONTENT_AREAS` (line 125) to `export const COPIED_CONTENT_AREAS`.

   **5c. Add the content-area remover.** New exported function in `scripts/ai-skills/build.ts`, beside `removeDeletedManagedContent`:

   ```ts
   /**
    * Removes every managed content area under one platform dir — the sweep for
    * a host a consumer has dropped from `hosts`.
    *
    * Gated on the area's own `MANAGED_MARKER`, so an area PRISM never wrote is
    * never removed and a consumer's own file that happens to sit under the
    * platform dir is untouched. `removeDeletedManagedContent` answers a
    * narrower question — which entries under a still-managed area have lost
    * their canonical source — and cannot express "this whole area is no longer
    * wanted."
    */
   export async function removeManagedContentAreas(
   	platformDir: string,
   	checkModeArg: boolean,
   	changedPathsArg: string[]
   ): Promise<void> {
   ```

   For each `area` in `COPIED_CONTENT_AREAS`: resolve `targetArea = path.join(platformDir, area)`; skip when `targetArea` or its `MANAGED_MARKER` does not exist; otherwise record the removal in `changedPathsArg` and, when not `checkModeArg`, `await fs.rm(targetArea, { force: true, recursive: true })`. Sweep the `custom/` overlay subdir the same way — an area's overlay output carries its own marker at `<area>/custom/`, so check and remove that path too before removing the area itself.

   Leave the platform dir itself in place even when every area under it is gone. `.claude/` and `.cursor/` hold consumer files PRISM does not own.

   **5d. Sweep from `refreshPlatformSkills` and `refreshPlatformDirs`, never from inside the shared render.** In `refreshPlatformSkills`, after the `generatePlatformSkills` call and before the leftover-token guard, sweep each opted-out root:

   - when `!optedIn.claude`: `removeDeletedManagedSkills(targetRoots.claude, new Set(), dryRun, changedPaths)`
   - when `!optedIn.cursor`: the same against `targetRoots.cursor`
   - when `!optedIn.codex`: the same against `targetRoots.codex`
   - when `!optedIn.claudeAgents`: `removeDeletedManagedAgentFiles(targetRoots.claudeAgents, new Set(), ".md", GENERATED_MARKDOWN_HEADER_LINE, dryRun, changedPaths)`
   - when `!optedIn.codexAgents`: the same against `targetRoots.codexAgents` with `".toml"` and `GENERATED_HEADER_LINE`
   - when `!optedIn.codexConfig`: remove `codexConfigPath` only when the file exists and its contents start with `GENERATED_HEADER_LINE`

   An empty known-id set is what turns each existing cleanup helper into a full sweep of its own root: every marker-bearing directory is now an id PRISM no longer ships. That is the same move PR #480 made for the hook runtime — the removal is the existing function with an empty incoming set, not a second ownership rule that could disagree with the first.

   In `refreshPlatformDirs`, sweep each dropped host's content dirs. The function currently receives only the filtered list, so pass it the dropped entries too — add a parameter `droppedDirs: ReturnType<typeof buildPlatformDirs>` and call `removeManagedContentAreas(entry.dir, dryRun, [])` for each. In `runUpdate`, compute both halves from one `buildPlatformDirs` call:

   ```ts
   	const allPlatformDirs = buildPlatformDirs(
   		consumerRepoRoot,
   		consumerPathDefinitions
   	);
   	const platformDirs = allPlatformDirs.filter((entry) =>
   		hosts.includes(entry.host)
   	);
   	const droppedPlatformDirs = allPlatformDirs.filter(
   		(entry) => !hosts.includes(entry.host)
   	);
   ```

   **Do not put this sweep inside `generatePlatformSkills`.** That function is shared with `prism:build`, whose `optedIn` means something different: in check mode it sets `codex: false` and `codexConfig: false` to avoid false drift against gitignored roots that a branch checkout left stale. A sweep keyed on `optedIn` inside the shared render would read those flags as "the consumer dropped Codex" and delete `.agents/` and `.codex/codex-config.toml` on every `pnpm prism:check`. Keeping the sweep in the consumer-side callers makes that outcome structurally impossible rather than merely avoided.

   Verification: `pnpm prism:check-types`, then tasks 7–9.

6. **Report leftover output from a dropped host** — `scripts/ai-skills/doctor.ts`. Gate route is the same as task 1 (already cleared).

   Doctor has no per-host output check today. Its checks are `config`, `git-repo`, `seed-delivery`, `sync-manifest`, `rule-load`, `architect-route`, `hook-registration`, and `version`, and none of them reads `.claude/skills`, `.agents/skills`, or `.cursor/skills` — so there is no false "missing `.claude/skills`" warning for a Codex-only consumer to suppress. What is missing is the other direction: after task 5, a repo whose output does not match its `hosts` means an update has not run since the key changed, and nothing says so.

   Add `"host-output"` to the `DoctorFinding["check"]` union, and a check:

   ```ts
   async function checkHostOutput(
   	consumerRepoRoot: string,
   	pathDefinitions: PathDefinitions
   ): Promise<DoctorFinding[]>
   ```

   which resolves `hosts` through the same `readConsumerConfigSafely` + `resolveHosts` pair `checkHookRegistration` already uses, and for each host **not** in `hosts` checks whether any marker-bearing output survives under that host's roots — its skills root, its agents root, and its platform content dir. When any does, push one `warning` per dropped host naming which roots still carry output and giving `npx @huntermcgrew/prism update` as the remedy. When none does, push nothing — a repo already in the right state does not need a line.

   `warning`, not `error`: leftover output is inert data in a directory the consumer's host never reads, and `healthy` keys on `error` alone, so this must not flip an exit code.

   Register it in `runDoctor` beside the `checkHookRegistration` call, wrapped the same way — doctor reports rather than throws, so a failure here cannot take the other checks down.

   Verification: `pnpm prism:check-types`, then task 9.

7. **Test the gate at each site** — `scripts/ai-skills/update.test.ts`, using the `runUpdate` fixture the existing `runUpdate copies content and projects the persona roster` test builds. Gate route is the same as task 1 (already cleared).

   Test names state the contract, not the change that produced them, per `.prism/rules/writing-voice.md` § Anti-pattern: Session-context leakage.

   - `test("runUpdate projects the roster to every host when the config declares none", ...)` — config with no `hosts` key; assert a rendered `SKILL.md` exists under all three skills roots. The no-migration guarantee.
   - `test("runUpdate projects the roster only to the hosts the config declares", ...)` — `hosts: ["codex"]`; assert `.agents/skills/<id>/SKILL.md` exists and neither `.claude/skills/<id>/SKILL.md` nor `.cursor/skills/<id>/SKILL.md` does.
   - `test("runUpdate writes agent definitions and the Codex config only for their own host", ...)` — `hosts: ["claude"]`; assert `.claude/agents/<id>.md` exists, `.codex/agents/<id>.toml` does not, and `.codex/codex-config.toml` does not.
   - `test("runUpdate copies platform content only to the hosts the config declares", ...)` — `hosts: ["cursor"]`; assert `.cursor/rules/` carries a copied rule and `.claude/rules/` and `.codex/rules/` do not exist. This is the site a search for `optedIn` does not find, so it needs its own test rather than riding the roster assertions.
   - `test("runUpdate scans only the roots it wrote for unresolved token literals", ...)` — seed a stale file containing a `${TOKEN}` literal under `.claude/skills/` and run with `hosts: ["codex"]`; assert the update succeeds. Without the narrowed guard this fails, which is what makes the assertion meaningful.

   Verification: `pnpm prism:test`.

8. **Test the drop path** — `scripts/ai-skills/update.test.ts`. Gate route is the same as task 1 (already cleared).

   - `test("runUpdate takes back a dropped host's roster, agent files, and content copies", ...)` — run once with no `hosts` key, rewrite the config to `hosts: ["codex"]`, run again; assert `.claude/skills/<id>/`, `.cursor/skills/<id>/`, `.claude/agents/<id>.md`, `.claude/rules/`, and `.cursor/rules/` are all gone, and that `.agents/skills/<id>/SKILL.md` and `.codex/rules/` remain.
   - `test("a consumer's own file under a dropped host's directory survives the sweep", ...)` — before the second run, write an unmarked `.claude/skills/my-own-skill/SKILL.md` and an unmarked `.claude/notes.md`; assert both survive. The positive control for the marker gate: without it, this test and the previous one would pass identically on an implementation that deleted the whole tree.
   - `test("the Codex config is removed only when it still carries PRISM's generated header", ...)` — two fixtures, one where the file carries the header and one where the consumer replaced its contents; assert the first is removed on dropping `codex` and the second is left alone.
   - `test("runUpdate --dry-run previews a dropped host's removals without performing them", ...)` — assert the files are still on disk after a dry run that reports them.

   Verification: `pnpm prism:test`.

9. **Test that `prism:build` is unaffected, and the doctor branch** — `scripts/ai-skills/generate-skills.test.ts`, `scripts/ai-skills/build`-side coverage, and `scripts/ai-skills/doctor.test.ts`. Gate route is the same as task 1 (already cleared).

   - In `generate-skills.test.ts`, add `test("a platform opted out of a render pass keeps the output a previous pass wrote", ...)` — call `generatePlatformSkills` with `{ ...ALL_OPTED_IN, codex: false }` against a target root that already holds a marker-bearing skill dir; assert the dir survives. This is the regression test for the check-mode trap: it fails on any implementation that moved the drop sweep inside the shared render, which would delete `.agents/` on every `pnpm prism:check`.
   - In `doctor.test.ts`, add `test("runDoctor warns when a host the config excludes still has PRISM's output on disk", ...)` — config with `hosts: ["codex"]`, a marker-bearing `.claude/skills/<id>/`; assert one `host-output` finding of severity `warning` naming `claude`.
   - `test("runDoctor reports no host-output finding when the tree matches the declared hosts", ...)` — config with `hosts: ["codex"]` and no `.claude/` output; assert no `host-output` finding.
   - `test("runDoctor reports no host-output finding when the config declares no hosts", ...)` — no `hosts` key, output under all three roots; assert no finding. Proves the resolver's all-hosts default reaches this check.

   Verification: `pnpm prism:test`.

10. **Widen the `hosts` description from hooks to all delivery** — `.ai-skills/config.schema.json`, the `hosts` block's `description` (line 100). Gate route is the same as task 1 (already cleared).

    The shipped text opens "Today this gates hook-runtime delivery" and enumerates only the three hook writes. Replace the body of that description with text covering all three delivery classes: the hook runtime and its registration, the persona skill roster and agent definitions for each host, and the platform content copies of rules, architect docs, and templates. Keep the two sentences that carry the contract — absent means all hosts and needs no migration, and removing a host makes the next `prism update` take its output back out.

    Drop the word "Today" while you are in there. It dated the sentence to one PR, and this is the second PR to move it.

    Verification: task 7's absent-key test, which reads the schema through `validateConsumerConfigAgainstSchema`.

11. **Update the two consumer-facing docs** — `docs/parameterization.md` and `docs/ai-skills/compatibility.md`.

    Clear the gate first:

    ```
    cat /Users/hunter/Documents/PRISM/PRISM/.prism/architect/_toolkit/documentation.md
    cat /Users/hunter/Documents/PRISM/PRISM/.prism/architect/_toolkit/architecture-doc-shape.md
    ```

    In `docs/parameterization.md` § Field reference, rewrite the `hosts` row (line 55) so its consequence clause covers the roster and the content copies alongside the hook, and keeps the absent-means-all default and the take-back-on-drop behavior. Keep the row to the table's column budget — if it wraps to four lines, the detail belongs in a sentence under the table rather than in the cell (`.prism/rules/writing-voice.md` § An overflowing container is the signal to cut).

    In `docs/ai-skills/compatibility.md`, the paragraph at line 81 currently says PRISM only installs *the hook* when `hosts` includes `claude`. Widen it: a repo that lists its hosts receives skills, agent definitions, and rule copies only for those hosts, and a host removed later has its output taken back out on the next update. The hook sentences above it stay as they are — they are about a different asymmetry (no Cursor or Codex registration writer exists at all), and collapsing the two would lose that.

    Bump `last_updated` in both files' frontmatter, per `.prism/architect/_toolkit/documentation.md` § Frontmatter schema.

    Verification: `pnpm prism:check`.

12. **Reconcile `install-layout.md` and its curated seed twin** — `.prism/architect/_toolkit/install-layout.md` and `templates/install/.prism/architect/_toolkit/install-layout.md`.

    Clear the gate first:

    ```
    cat /Users/hunter/Documents/PRISM/PRISM/.prism/architect/_toolkit/spec-editing.md
    cat /Users/hunter/Documents/PRISM/PRISM/.prism/architect/guides/writing-an-architect-doc.md
    ```

    In the canonical doc, three claims are now false and one is incomplete:

    - § Steady-state persona-skill distribution, **What the consumer receives** — the render writes "to each opted-in platform directory," which was true of the option name and not of the consumer; say that a consumer receives the roster for the hosts their `hosts` key declares, all of them when it is absent.
    - § Steady-state persona-skill distribution, **Orphan cleanup** — extend it: cleanup fires on a persona leaving the roster *and* on a host leaving `hosts`, both gated on the managed marker, so a consumer-authored directory without the marker is never a delete target in either case.
    - § The bifurcation — the sentence saying `pnpm prism:build` copies canonical areas "into each platform dir" describes PRISM's own build correctly; add that on the consumer side `prism update` copies into the platform dirs for the hosts they declare.
    - § Skill namespace ownership — unchanged, but re-read it to confirm the marker-gated ownership claim still reads correctly beside the new sweep.

    Then make the matching edits in the curated twin, in consumer voice and without ADR citations (numbered ADRs do not ship — ADR-0064). The twin is hand-maintained: `install-layout.md` is a `curated` entry in `.ai-skills/definitions/seed-curation.json`, so the build neither writes it nor compares its content, and no gate catches this drift.

    Verification: `pnpm prism:check`.

13. **Run the full gate and ship** — `pnpm prism:check` from the worktree root. Append the implementation entry to `## History` and the `close:` clause to the `## Sessions` line per `.prism/rules/session-orientation.md` § Battery Persistence.

    Ship per `.prism/rules/skill-routing.md` § Authors ship, reviewers review: commit, push, open a draft PR whose body opens with "Follow-up to PRISM-477. No new ticket per `.prism/rules/followup-scope.md`." per that rule's § Follow-up PR conventions.

---

## Decisions

- **The consumer-side host fanout is two sites, not one, and both are gated here.** `refreshPlatformSkills` is the one the follow-up was filed against; the second is `refreshPlatformDirs`, which copies `.prism/rules/`, `.prism/architect/`, `.prism/spec/`, `.prism/templates/`, `.prism/references/`, and `SPEC.md` into all three platform dirs on every update.
  - **Root cause of it being missed:** the second site carries no `optedIn` object at all. It fans out through `buildPlatformDirs`, which returns all three dirs unconditionally, so a search for the name that identifies the first site does not reach it. `adopt.ts`, `init.ts`, and `eject.ts` were checked and have no fanout of their own — every host write on the consumer path goes through `runUpdate`, which is why one seam can carry the gate.
  - **Chosen approach:** label each entry `buildPlatformDirs` returns with its host and filter at the `runUpdate` call site, not inside the helper. `build.ts` calls the same helper and must keep all three; pushing the filter down would put PRISM's own committed platform output at the mercy of PRISM's own `hosts` value.
  - **Alternatives considered:** filter by array position — rejected, it works today and breaks silently the first time someone reorders the list; give `buildPlatformDirs` a `hosts` parameter defaulting to all — rejected, a default that means "everything" on a shared helper is the same footgun as a defaulted `optedIn`, and the consumer-side policy reads better at the consumer-side call site.
  - → promoted to `.prism/architect/_toolkit/install-layout.md` § The bifurcation and § Steady-state persona-skill distribution (task 12)

- **The drop sweep lives in the consumer-side callers, never inside `generatePlatformSkills`.** This is the trap in the change, and it is invisible from the diff of the obvious implementation.
  - **Root cause:** `generatePlatformSkills` is shared between `prism:update` and `prism:build`, and the two pass `optedIn` objects that mean different things. `build.ts` sets `codex: false` and `codexConfig: false` *in check mode only*, to avoid false drift against gitignored roots a branch checkout left stale — it means "skip this," not "the consumer dropped this." A sweep keyed on `optedIn` inside the shared render would read those flags as a drop and delete `.agents/` and `.codex/codex-config.toml` on every `pnpm prism:check`.
  - **Chosen approach:** export `removeDeletedManagedSkills` and `removeDeletedManagedAgentFiles` and call them from `refreshPlatformSkills`, which only the consumer path reaches. The structure makes the failure impossible rather than merely avoided.
  - **Implementation guidance:** task 9's `generate-skills.test.ts` case is the regression test for exactly this — it asserts that a platform opted out of a render pass keeps output a previous pass wrote, and it fails on any implementation that moved the sweep into the shared function.
  - → no promotion needed (a structural constraint whose reason lives in the function it protects and in its test)

- **A dropped host's output is taken back out, not left in place.** Mirrors PR #480's hook decision and reaches the same answer by the same reasoning, though the material differs.
  - **Root cause of the asymmetry with hooks:** the hook writes touched files the consumer owns (`.claude/settings.json`, `.gitignore`) and installed behavior. These writes go to PRISM's own managed roots, marked with `.ai-skill-generated`, holding inert data a host that is not running never reads — so the case for removal is weaker on harm and rests instead on the key meaning something.
  - **Alternatives considered:** leave in place — rejected because `hosts` would then affect only future writes, so a consumer who sets the key sees almost no change and reasonably concludes it does not work; and because `.cursor/skills/` is committed (`install-layout.md` § Direct-write tool outputs), so leftovers live in their git history and show up in their reviews.
  - **Chosen approach:** sweep, gated on the managed marker at every removal — the same gate PRISM's existing orphan cleanup already relies on, which is what keeps a consumer-authored directory under the same root from being a delete target. Dropping a host is the same event as a persona leaving the roster, at a different granularity, so it reuses the same helpers with an empty known-id set.
  - **Implementation guidance:** the platform dir itself and the consumer's own unmarked files under it are never removed. `.codex/codex-config.toml` is removed only when it still carries `GENERATED_HEADER_LINE` — it is a per-user gitignored file, so content-keyed ownership is the only honest test of whether it is ours.
  - → promoted to `.prism/architect/_toolkit/install-layout.md` § Steady-state persona-skill distribution → Orphan cleanup (task 12)

- **`build.ts`'s `optedIn` does not read the shared resolver, in this PR or later.** It answers a different question: has this platform ever been built in this checkout, so is a diff real drift or an unbuilt platform. `hosts` answers what a consumer runs.
  - **The concrete failure if they were wired together:** PRISM's own `.ai-skills/config.json` has no `hosts` key today, so nothing would change immediately — but the moment anyone set `hosts: ["claude"]` on it, `prism:build` would stop producing `.codex/` and `.cursor/` output, both of which are committed artifacts other people consume, and `prism:check` would start passing or failing on a value unrelated to drift.
  - → no promotion needed (recorded in `deriveOptedIn`'s own doc comment, at the point where a future reader would be tempted)

- **`deriveOptedIn` maps three hosts onto six output flags in one place.** A host owns more than one output — Claude Code takes a skill roster and agent definitions, Codex takes a roster, agent adapters, and `codex-config.toml`, Cursor takes a roster only. Deriving the six from the three centrally is what stops a caller gating the roster and forgetting the adapters beside it. It lives in `lib/hosts.ts` beside `resolveHosts` because both answer "what does this host set mean," which is one concern with two shapes.
  - → no promotion needed (a derivation whose reason lives in its doc comment)

- **`refreshPlatformSkills`'s `hosts` parameter is required, not defaulted.** Same call as PR #480 made for `refreshHookRuntime`: a default meaning "write everything" silently reinstates the ungated behavior for any future caller that forgets it. The cost is one call site, which this PR is already editing.
  - → no promotion needed (an API choice evident from the signature)

- **The leftover-token guard is narrowed to the roots the pass actually wrote.** It exists to catch unresolved `${TOKEN}` literals in output this run produced. Pointed at a root the run skipped, it either finds nothing or reports stale bytes written before the consumer set `hosts` — and the second case fails an update over content this run did not touch. Considered leaving it scanning all five roots as a broader safety net: rejected, because a guard that fails on output the run did not produce trains people to distrust it.
  - → no promotion needed (a scope correction that follows from the gate)

- **Doctor gains a leftover-output warning; it had no per-host output check to fix.** The follow-up brief asked whether doctor's per-host checks should honor `hosts` so a Codex-only consumer is not warned about a missing `.claude/skills`. There is no such warning: doctor's checks are `config`, `git-repo`, `seed-delivery`, `sync-manifest`, `rule-load`, `architect-route`, `hook-registration`, and `version`, and none reads any platform skills root. What the sweep does create is the opposite state — output that no longer matches the declared hosts, meaning no update has run since the key changed — and nothing would say so.
  - **Alternatives considered:** add nothing, on the grounds that the hook check's stale-delivery warning already tells a consumer to run `prism update` — rejected because that branch fires only when `claude` is the dropped host, so a consumer who drops `cursor` would get no signal at all.
  - **Chosen approach:** one `host-output` check covering every dropped host, `warning` severity so it cannot flip an exit code, silent when the tree already matches the config. If this reads as scope creep on review, it is the one task in this plan that can be cut without weakening the rest — the gate and the sweep stand on their own.
  - → no promotion needed (a new check whose contract lives in its own tests)

- **No new ADR.** Per `.prism/references/triple-gated-adr-criterion.md`: *hard to reverse* — this is a filter and a marker-gated sweep on a key that already exists, revertible by deleting both; *surprising without explanation* — ADR-0074 already records the posture and PR #480 already established `hosts` as the consent mechanism, so this extends a documented decision rather than making one; *genuine trade-off* — the sweep-vs-leave call is real and is recorded above with its rejected alternative, which is what a plan Decision is for. None of the three fires cleanly.
  - → no promotion needed (an application of the existing criterion)

- **The Atlas onboarding question that would set `hosts` at install time stays out, and is a handoff rather than a follow-up ticket.** Issue #481 is rewriting Atlas, so an onboarding-question edit landed here would collide with that lane on the same files. Nothing in this plan touches `.ai-skills/skills/prism-onboarding/**` or `.prism/references/onboarding/**`, and nothing in it should. The `hosts` key and its full delivery semantics exist for #481 to wire a question to; hand the requirement to that lane rather than filing a competing ticket.
  - → no promotion needed (a lane-boundary note; the requirement belongs to #481)

---

## Sessions

- 2026-09-02 [huntermcgrew/prism-477-followup-skills-hosts] open: Intent — stop writing a host's skill roster and platform content into consumers who do not run it, and take back what a prior update wrote; Bounds — done when both consumer-side fanout sites gate on `hosts`, a dropped host's marked output is swept, and every prose home of the key's description covers all three delivery classes, touching nothing under `prism-onboarding` or `.prism/references/onboarding/` and nothing in `build.ts`'s check-mode heuristic; Approach — derive the existing six-flag shape from `hosts` in one place, filter the platform-dir list at the consumer call site, and reuse the existing cleanup helpers with an empty known-id set · close: scope held — planning only, no source touched

---

## History

- 2026-09-02 [huntermcgrew/prism-477-followup-skills-hosts]: Winston planned the second follow-up. Enumeration found a second ungated fanout beyond `refreshPlatformSkills` — the platform content copies through `buildPlatformDirs`, which carries no `optedIn` and so does not surface in a search for it — and a trap in the obvious implementation, where a drop sweep placed inside the shared `generatePlatformSkills` would delete `.agents/` on every `pnpm prism:check`; see Decisions.

---

## Debugged Issues

None recorded on this branch. The originating defect is documented in `.prism/plans/prism-477.md` § Decisions and in ADR-0074 § Consequences.

---

## Review Issues

---

## Acceptance Criteria

### Behavioral

**Background:** A consumer repo with a valid `.ai-skills/config.json`, run through `prism update`.

- [ ] **AC-1** Given a config that does not mention hosts, When the repo is updated, Then it receives skills, agent definitions, and rule copies for every host exactly as it did before
  - Evidence (machine): `pnpm prism:test` → the absent-key test passes, asserting a rendered `SKILL.md` under all three skills roots · UNMET looks like: any of the three roots has no rendered skill after the run

- [ ] **AC-2** Given a config listing only Codex, When the repo is updated, Then it receives Codex output and no Claude or Cursor output
  - Evidence (machine): `pnpm prism:test` → the declared-hosts roster test passes, asserting `.agents/skills/<id>/SKILL.md` present and both other skills roots absent · UNMET looks like: a `SKILL.md` appears under `.claude/skills/` or `.cursor/skills/`

- [ ] **AC-3** Given a config listing only Claude, When the repo is updated, Then it gets Claude agent definitions but no Codex agent adapters and no Codex config file
  - Evidence (machine): `pnpm prism:test` → the agent-and-config test passes, asserting `.claude/agents/<id>.md` present, `.codex/agents/<id>.toml` absent, `.codex/codex-config.toml` absent · UNMET looks like: either Codex artifact exists

- [ ] **AC-4** Given a config listing only Cursor, When the repo is updated, Then rules and architect docs are copied for Cursor only
  - Evidence (machine): `pnpm prism:test` → the content-copy test passes, asserting `.cursor/rules/` carries a copied rule while `.claude/rules/` and `.codex/rules/` do not exist · UNMET looks like: `.claude/rules/` or `.codex/rules/` exists after the run

- [ ] **AC-5** Given a repo that previously received every host's output, When a host is removed from the config and the repo is updated, Then that host's PRISM-written output is taken back out and the remaining hosts' output is untouched
  - Evidence (machine): `pnpm prism:test` → the take-back test passes, asserting the dropped host's skills, agent files, and rule copies are gone and the kept host's are present · UNMET looks like: any dropped-host artifact survives, or a kept-host artifact is missing

- [ ] **AC-6** Given that removal, When it completes, Then anything the consumer wrote themselves under the same directories survives
  - Evidence (machine): `pnpm prism:test` → the consumer-file test passes, asserting an unmarked skill directory and an unmarked loose file both survive · UNMET looks like: either file is gone, which means the sweep is not marker-gated

- [ ] **AC-7** Given a Codex config file the consumer has replaced with their own content, When Codex is dropped and the repo is updated, Then the file is left alone
  - Evidence (machine): `pnpm prism:test` → the header-gated test passes on both fixtures — removed when PRISM's header is present, kept when it is not · UNMET looks like: the consumer-authored file is deleted

- [ ] **AC-8** Given a preview run, When a host has been dropped, Then the removals are reported and nothing is deleted
  - Evidence (machine): `pnpm prism:test` → the dry-run test passes, asserting the files remain on disk after the run reports them · UNMET looks like: any file is missing after a dry run

- [ ] **AC-9** Given a repo whose output no longer matches its declared hosts, When the consumer runs `prism doctor`, Then they are warned which host's output is left over and told to run the update
  - Evidence (machine): `pnpm prism:test` → the leftover-output test passes, asserting one `host-output` finding of severity `warning` naming `claude` · UNMET looks like: no finding, or a finding of severity `error`

- [ ] **AC-10** Given a repo whose output matches its declared hosts, or one declaring no hosts at all, When the consumer runs `prism doctor`, Then no leftover-output warning appears
  - Evidence (machine): `pnpm prism:test` → both quiet-path doctor tests pass, asserting no `host-output` finding · UNMET looks like: a warning fires on a repo that is in the correct state

### Non-behavioral

- [ ] **AC-11** PRISM's own build still produces all three platforms regardless of any `hosts` value
  - Evidence (machine): `git diff origin/main...HEAD -- scripts/ai-skills/build.ts` → the diff shows no change to the `optedIn` object at the `main()` seam, and no `resolveHosts` import in `build.ts`; positive control: the same diff does show the `COPIED_CONTENT_AREAS` export and the new remover, proving the diff is being read · UNMET looks like: `resolveHosts` or `deriveOptedIn` appears in `build.ts`

- [ ] **AC-12** The drop sweep cannot fire from the shared render path
  - Evidence (machine): `pnpm prism:test` → the `generate-skills.test.ts` opted-out-platform test passes, asserting a marker-bearing directory under an opted-out root survives a render pass · UNMET looks like: that test fails, meaning check-mode opt-out is being read as a consumer drop

- [ ] **AC-13** Nothing in the diff touches the Atlas lane
  - Evidence (machine): `git diff --name-only origin/main...HEAD` → no path under `.ai-skills/skills/prism-onboarding/` or `.prism/references/onboarding/`; positive control: the same command lists `scripts/ai-skills/update.ts` · UNMET looks like: any onboarding path appears, which would collide with issue #481

- [ ] **AC-14** The `hosts` key's description covers all three delivery classes everywhere it is described
  - Evidence (human): read the `hosts` description in `.ai-skills/config.schema.json`, the `hosts` row in `docs/parameterization.md` § Field reference, and the `hosts` paragraph in `docs/ai-skills/compatibility.md`; each names the hook runtime, the skill roster and agent definitions, and the platform content copies · UNMET looks like: any of the three still describes the key as gating hooks only

- [ ] **AC-15** The curated seed twin of `install-layout.md` carries the same corrected claims as its canonical partner
  - Evidence (human): open `templates/install/.prism/architect/_toolkit/install-layout.md` and confirm its § Steady-state and § bifurcation passages describe per-host delivery and the marker-gated sweep · UNMET looks like: either passage still describes delivery to every platform dir unconditionally

- [ ] **AC-16** Consumer-facing output and shipped docs cite no numbered ADR
  - Evidence (machine): `pnpm prism:check` → exits 0 with crossref-lint's install-adr-gate green · UNMET looks like: the gate reports an `ADR-NNNN` reference in the install seed or a consumer-facing string

- [ ] **AC-17** The full repository gate passes
  - Evidence (machine): `pnpm prism:check` → exit 0 · UNMET looks like: any non-zero exit, with the failing sub-gate named in the output

### AC Adjustments

### AC Sync Log

| Date | Agent | Action | Plan | Ticket |
| ---- | ----- | ------ | ---- | ------ |
| 2026-09-02 | Winston | Not synced — follow-up PR, no ticket of its own per `followup-scope.md` | prism-477-followup-skills-hosts | N/A |

---

## Cleanup Items

---

## PR Readiness

- [ ] No critical or major issues
- [ ] Types correct — no `any`, no unsafe `as`
- [ ] No stray console.logs or debug artifacts
- [ ] Tests written for new logic and edge cases
- [ ] All debugged issues resolved (no `open` entries)
- [ ] Build passes — last run: not yet run
- [ ] PR description up to date
- [ ] Lasting decisions promoted to architect context (if applicable)

**Last updated:** 2026-09-02
