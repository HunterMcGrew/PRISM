# Plan: prism-477-followup-codex-hooks

## Ticket

Follow-up to [issue #477](https://github.com/HunterMcGrew/PRISM/issues/477). No new ticket per `.prism/rules/followup-scope.md` — same thread, same files, same persona lane as #477 and its two sibling follow-ups.

Closes the alternative ADR-0074 rejected on scope: "Build the Cursor and Codex delivery seams now … This stays open follow-up work." Codex only. Cursor stays open.

## Goal

Deliver PRISM's hook runtime to Codex — a registration in `.codex/hooks.json`, a working `emitDeny`, and a `prism doctor` arm that reports it — so the write gate and the announce layer fire on Codex, not on Claude Code alone.

---

## Decisions

- **Register in `.codex/hooks.json`, not `[hooks]` in `.codex/codex-config.toml`.**
  - **Root cause of the choice:** `codex-config.toml` is per-user and git-ignored (`.gitignore:9`, `/.codex/codex-config.toml`). `install-layout.md:137` says the same in prose — "it is per-user and gitignored, so it has no marker of its own." A registration written there is invisible to the rest of the team and gone on a fresh clone. `.codex/hooks.json` is not ignored, so it commits and every clone inherits the gate.
  - **Alternatives considered:** `[hooks]` in `codex-config.toml`; the user-level `~/.codex/hooks.json`.
  - **Chosen approach:** `<consumer>/.codex/hooks.json`. Past the git-ignore argument, Codex's `hooks.json` schema is structurally identical to Claude's `settings.json` `hooks` block — the same `{hooks: {Event: [{matcher, hooks: [{type, command}]}]}}` shape — so `mergeHookEventEntries` and `collectHookCommands` carry over with no new parser. The TOML route would need a merge writer that does not exist, and `~/.codex/` is outside the repo PRISM installs into.
  - **Verified 2026-09-02** against OpenAI's hooks documentation at `https://learn.chatgpt.com/docs/hooks` and against `git check-ignore` in this worktree.

- **One runtime, two registrations. The runtime stays at `.claude/hooks/`.**
  - **Root cause:** `hook.mjs` is host-neutral already — it dispatches on the `--tool=` flag and resolves the repo root itself from `payload.cwd`. A second copy under `.codex/hooks/` would be the same bytes at a second path, doubling the deliver, prune, and backup surface for no behavior change.
  - **Alternatives considered:** a second copy under `.codex/hooks/`; moving the shared runtime to a host-neutral `.prism/hooks/`.
  - **Chosen approach:** keep `.claude/hooks/`. `.prism/hooks/` is the better long-term home — `install-layout.md` § The bifurcation puts platform-agnostic content under `.prism/`, and a runtime two hosts share is platform-agnostic. It loses on migration cost, not on principle: the move rewrites the command string every existing consumer already has registered, so `PRISM_HOOK_COMMAND_PATTERN` would have to recognize the old and the new spelling together for a release, or old registrations stop being claimed as PRISM's, survive the drop half of the merge, and sit beside their own replacement. `install-layout.md:179` documents that exact hazard for hand-edited commands. It buys nothing this ticket needs.
  - **Implementation guidance:** a Codex-only consumer therefore gets a `.claude/hooks/` directory. That is the accepted cost, and task 12 states it in the consumer-facing doc rather than leaving it to be discovered. Revisit `.prism/hooks/` later if it bites — `pruneStaleHookRuntimeFiles` already removes marker-carrying files at paths no longer delivered, so the migration has half its machinery.

- **Runtime delivery gates on `claude` OR `codex`; each registration gates on its own host.**
  - **Root cause:** `refreshHookRuntime` currently removes the runtime whenever `hosts` excludes `claude` (`update.ts:1305`). A `hosts: ["codex"]` consumer would receive a registration pointing at a file the same run just deleted — a dead registration, which is the failure `install-layout.md:179` and doctor's dead-registration check exist to surface.
  - **Chosen approach:** split the two gates. Deliver and prune the runtime when `hosts` includes either host; merge `.claude/settings.json` only when it includes `claude`; merge `.codex/hooks.json` only when it includes `codex`. Removal when neither host is listed is unchanged.
  - **Alternatives considered:** adding a `codexHooks` flag to `HostOutputFlags` in `lib/hosts.ts`. Rejected — `deriveOptedIn` exists for `generatePlatformSkills`, which branches on six outputs; `refreshHookRuntime` already receives the `hosts` array directly and reads it directly today. A flag would add an indirection with one caller.

- **Command string: `node ".claude/hooks/hook.mjs" --tool=codex --event=<Event>`, relative to the session cwd.**
  - **Root cause:** Codex sets no project-directory environment variable, and its documentation states commands run with the session `cwd` as their working directory. There is no `$CLAUDE_PROJECT_DIR` twin to use.
  - **Alternatives considered:** an absolute path baked in at update time; `node "$(git rev-parse --show-toplevel)/.claude/hooks/hook.mjs"`.
  - **Chosen approach:** the relative path. An absolute path cannot ride a committed file — every machine resolves it differently. The `$(…)` spelling depends on Codex passing `command` through a shell, which the documentation neither states nor denies; if it does not, the string is taken literally, node cannot find the file, and the hook silently never fires. That is the "an unregistered config file is worse than none" failure that removed `.cursor/hooks.json` in `opus5-port.md` task A8. Only *locating the script* depends on cwd — `hook.mjs` resolves the repo root itself from `payload.cwd` — so a session started at the repo root is correct.
  - **Implementation guidance:** this is the highest-risk item in the ticket, and task 8's live probe settles it. If the probe shows Codex starting sessions below the repo root, the contingency is the shell-substitution spelling, adopted only after the probe also confirms `command` is shell-interpreted. Do not adopt it speculatively.

- **`HARNESSES.codex.emitDeny` adopts the documented envelope, identical to Claude's.**
  - **Root cause:** ADR-0074 rejected shipping a deny "in an unverified envelope" because it "either fails open silently or blocks with an unperformable remedy." That reasoning was about a guessed shape. OpenAI now publishes the shape: `{"hookSpecificOutput": {"hookEventName": "PreToolUse", "permissionDecision": "deny", "permissionDecisionReason": "…"}}`, with exit code 2 plus a stderr reason as the documented alternative.
  - **Chosen approach:** ship the documented envelope ahead of the live probe. The two failure directions are not symmetric: every exit path in `hook.mjs` sets `process.exitCode = 0` (lines 1421–1500) and a denial travels in stdout JSON alone, so an envelope Codex does not recognize fails **open** — which is exactly Codex's behavior today. Shipping cannot be worse than not shipping, and it is the only way the probe can happen at all.
  - **Implementation guidance:** the code comment records this as documentation-verified, not live-probed, and names task 8 as what upgrades it — the same distinction the Claude row's comment already draws ("Measured against a live Claude Code host on 2026-08-19"). Do not delete ADR-0074's sentence about unverified envelopes; it is still the right rule, and this case clears it rather than repealing it.

- **Two events only: `PreToolUse` and `PostToolUse`. No `PostCompact`.**
  - **Root cause:** Codex documents no `PostCompact` event.
  - **Consequence, stated rather than hedged:** on Codex the announce-once state never resets after a compaction, so a doc announced before a compaction is not announced again in that session. The write gate is unaffected — it reads the same state but denies on *unread* docs, and a doc wrongly believed read had already been announced and read.
  - → carried into the ADR-0074 amendment (task 10) as a named gap.

- **`toolKinds` gains `Edit` and `Write`; the matcher is `^(Bash|apply_patch|Edit|Write)$`.**
  - **Root cause:** the deny arm fires only on a kind the harness's table explicitly lists (`resolveListedToolKind`), never on the unlisted-name fallback — ADR-0072 § Decision, precondition 3. Codex reports edits as `apply_patch`, but its documentation says a matcher spelled `Edit` or `Write` also matches, so those spellings can reach the runtime.
  - **Chosen approach:** list all three as `write`, for the reason the Claude row already gives for listing `Write` and `Edit` explicitly.
  - **Note:** Codex has no separate read tool — reads run through `Bash` — so read-credit comes from the existing shell arm and needs no new mapping. This is why the `PostToolUse` matcher includes `Bash`.

- **Amend ADR-0074 and correct ADR-0072's Consequences bullet; do not write a new ADR.**
  - **Root cause:** what changes is one rejected alternative inside ADR-0074, which already calls itself "open follow-up work," plus one factual bullet in ADR-0072 (line 65) that says `HARNESSES.codex.emitDeny` returns `null`. A new ADR would fork the reasoning across three files and leave both existing ADRs asserting a Claude-only reach that is no longer true.
  - **Chosen approach:** ADR-0074 stays `accepted` — its decision still holds for Cursor — and gains an amendment section. ADR-0072's bullet is corrected in place to name Cursor as the remaining gap. Neither is superseded.

- **Ship as a two-PR stack.**
  - **Root cause:** the change touches roughly fifteen canonical files, past the ten-file threshold for a single review.
  - **Chosen approach:** PR 1 is the delivery seam and its tests (tasks 1–7) — self-contained and probe-ready. PR 2 is the durable record (tasks 9–15), landed after the probe so the docs record what the probe found rather than what it was expected to find. The cut is not cosmetic: PR 2's content depends on PR 1's outcome, and PR 2 is where the false "Claude Code only" claims get swept.

---

## Implementation Tasks

Every task below touches a routed path, so the write gate will ask for docs before the first edit. Front-loading the full set: `_toolkit/spec-editing.md`, `_toolkit/skills-ecosystem.md`, `_toolkit/output-guards.md`, `_toolkit/install-layout.md`, `_toolkit/documentation.md`, `_toolkit/architecture-doc-shape.md`, `guides/writing-an-adr.md`, `guides/writing-a-rule.md`, `guides/writing-a-plan.md`, `_toolkit/plan-authoring.md`, `_toolkit/audit-workflow.md` — all under `.prism/architect/`.

### Clove (implementation) — PR 1: delivery seam

1. **Teach `HARNESSES.codex` the deny envelope and the write-tool aliases** — `scripts/ai-skills/hooks/harnesses.mjs`, the `codex:` block at lines 165–185.
   - Line 169: replace `toolKinds: { Bash: "shell", apply_patch: "write" },` with `toolKinds: { Bash: "shell", apply_patch: "write", Edit: "write", Write: "write" },`. Update the comment above it — "Codex's read tool is unmapped until a live probe observes its name" is wrong in its premise; Codex has no separate read tool, reads run through `Bash`, so say that instead.
   - Lines 182–184: replace the two comment lines ("Codex supports `PreToolUse`, but as with Cursor nothing delivers it a registration and no probe has observed its deny envelope.") and `emitDeny: () => null,` with:
     ```js
     // The envelope OpenAI documents for Codex `PreToolUse` at
     // https://learn.chatgpt.com/docs/hooks, read 2026-09-02 — identical to
     // Claude's. Documentation-verified, not live-probed: unlike the Claude
     // row above, no measured session has shown the reason reaching the model.
     // Answering ahead of that probe is safe in one direction only — every
     // exit path in `hook.mjs` sets `exitCode = 0` and a deny travels in
     // stdout alone, so an envelope Codex does not recognize fails open,
     // which is what Codex does today.
     emitDeny: (reason) => ({
       hookSpecificOutput: {
         hookEventName: "PreToolUse",
         permissionDecision: "deny",
         permissionDecisionReason: reason,
       },
     }),
     ```
   - In the `HarnessSpec` doc comment above the table: the sentence "`emitDeny` returns `null` on a host whose deny envelope nobody has observed" stays true for Cursor, but the clause ending "makes 'the gate reaches Claude Code only' a property of the code rather than a sentence in a doc (ADR-0072)" is now wrong. Rewrite that clause to name Cursor as the remaining host.
   - **Verify:** `pnpm prism:check-types` — the `tsconfig.hooks.json` arm type-checks the `.mjs` files against their `.d.mts` siblings. Blocks task 7.

2. **Add the Codex registration template** — new file `templates/install/.codex/hooks.json`. Full content:
   ```json
   {
   	"hooks": {
   		"PreToolUse": [
   			{
   				"matcher": "^(Bash|apply_patch|Edit|Write)$",
   				"hooks": [
   					{
   						"type": "command",
   						"command": "node \".claude/hooks/hook.mjs\" --tool=codex --event=PreToolUse"
   					}
   				]
   			}
   		],
   		"PostToolUse": [
   			{
   				"matcher": "^(Bash|apply_patch|Edit|Write)$",
   				"hooks": [
   					{
   						"type": "command",
   						"command": "node \".claude/hooks/hook.mjs\" --tool=codex"
   					}
   				]
   			}
   		]
   	}
   }
   ```
   - No `PostCompact` key — Codex documents no such event (see Decisions).
   - `templates/install/` is already listed in `package.json` `files`, so packaging needs no change. Leave `templates/install/.codex/.gitkeep` in place.
   - **Verify:** content-only, no build effect on its own. Blocks tasks 3 and 5.

3. **Generalize the registration merge to a two-call seam** — `scripts/ai-skills/update.ts`, `mergeHookSettingsRegistration` (roughly line 1434) and its two helpers above it.
   - Change the signature from `(prismRepoRoot, consumerRepoRoot, dryRun, deliver = true)` to a path-and-pattern form, e.g. `mergeHookRegistration(sourcePath, targetPath, pattern, dryRun, deliver)`. Keep the behavior byte-for-byte: additive top-level `hooks`, compose-within-array through `mergeHookEventEntries`, empty arrays deleted, no write when nothing changed, no write when no target existed and nothing merges in.
   - `isPrismOwnedHookEntry` and `mergeHookEventEntries` take the pattern as a parameter instead of closing over the module constant. Do not change what they do.
   - Add the Codex ownership pattern beside `PRISM_HOOK_COMMAND_PATTERN` (roughly line 1366), anchored at both ends for the reason the Claude one gives in its own doc comment:
     ```ts
     export const PRISM_CODEX_HOOK_COMMAND_PATTERN =
     	/^node "\.claude\/hooks\/hook\.mjs"(?: --[a-zA-Z]+=[\w.-]+)*$/;
     ```
   - Keep `mergeHookSettingsRegistration` as a thin wrapper delegating to the new seam with the Claude source, target, and pattern, so the three existing `update.test.ts` cases that import it by name keep working unchanged.
   - **Verify:** `pnpm prism:test`. After task 2; blocks task 4.

4. **Split the host gate in `refreshHookRuntime`** — `scripts/ai-skills/update.ts:1292`.
   - Replace the early-return block at line 1305 (`if (!hosts.includes("claude")) { … }`) with a gate on both hosts: take the removal path only when `hosts` includes neither `claude` nor `codex`. In that path, call the merge seam with `deliver: false` once for `.claude/settings.json` and once for `.codex/hooks.json`, so removal stays the drop half of the same merge rather than a second ownership rule.
   - In the delivery path, keep the runtime copy and the `chmod` unconditional across `claude ∪ codex`, then merge each registration under its own host check: `.claude/settings.json` when `hosts.includes("claude")`, `.codex/hooks.json` when `hosts.includes("codex")`. A host that is *not* listed gets `deliver: false` for its own file, so dropping one host takes its registration back out while the other's survives.
   - `appendHookStateGitignoreLines` runs whenever the runtime is delivered — unchanged, now reachable on a Codex-only consumer.
   - **Verify:** `pnpm prism:test`. After task 3; blocks task 5.

5. **Add the Codex arm to `checkHookRegistration`** — `scripts/ai-skills/doctor.ts:726`.
   - `collectHookCommands` (line 654) walks the parsed `hooks` shape generically and needs no change — Codex's `hooks.json` is the same shape. Read `.codex/hooks.json` with `readFileIfExists`, parse it under the same try/catch that produces the "is not valid JSON" error finding (line 739, with the message naming `.codex/hooks.json`), and fold its commands into the same `registeredPaths` set.
   - `resolveHookCommandPath` (line 637) strips `$CLAUDE_PROJECT_DIR` and resolves against `consumerRepoRoot`; a bare relative Codex path already resolves correctly through the same `path.resolve`, so reuse it unchanged.
   - Findings to add, mirroring the Claude arm's four shapes:
     - `hosts` includes `codex`, runtime on disk, `.codex/hooks.json` carries a command matching `PRISM_CODEX_HOOK_COMMAND_PATTERN` → `info`, naming Codex as covered.
     - `hosts` includes `codex`, runtime present, no Codex registration → `warning`, remedy `npx @huntermcgrew/prism update`, mirroring line 806.
     - `hosts` excludes `codex` but a Codex registration is still on disk → `warning`, the stale-delivery shape at line 763.
     - A Codex-registered command pointing at a file not on disk → the existing dead-registration loop at line 787 covers it once Codex commands are in `registeredPaths`. No new code.
   - Rewrite the `info` message at line 812 — "It fires on Claude Code only — Codex and Cursor receive no registration" is now false. State which of this consumer's hosts have the gate and which do not; Cursor is the host with none. Rewrite the prose-fallback message at line 819 the same way: it currently asserts "PRISM's write gate runs under Claude Code only."
   - **Verify:** `pnpm prism:test`. After task 4; blocks task 6.

6. **Writer and doctor tests** — `scripts/ai-skills/update.test.ts` and `scripts/ai-skills/doctor.test.ts`, in the existing `node:test` + `node:assert/strict` + `fs.mkdtemp` fixture style. Model the new cases on the host-gating block at `update.test.ts:2370–2489` and the `// --- hook registration ---` block at `doctor.test.ts:980`.
   - `update.test.ts`, new cases: a fresh consumer with `hosts: ["codex"]` receives `.codex/hooks.json` with both event keys and receives the runtime under `.claude/hooks/`; a consumer with a pre-existing `.codex/hooks.json` carrying its own `PreToolUse` entry keeps that entry and gains PRISM's; two consecutive runs leave the file byte-identical; dropping `codex` from `hosts` removes only PRISM's entries; dropping both hosts removes the runtime and both registrations. The last one is the regression guard on task 4's gate.
   - `doctor.test.ts`, new cases: `hosts: ["codex"]` with runtime and registration present reports `info` and no warning (mirror the assertion style at line 1098); registration absent reports the warning; a Codex registration left over under `hosts: ["claude"]` reports the stale warning.
   - **Verify:** `pnpm prism:test`. After task 5.

7. **Harness test for the Codex deny envelope** — `scripts/ai-skills/hook-gate.test.ts`, using the file's own `withTempRepo` helper.
   - Assert `HARNESSES.codex.emitDeny("reason")` returns the documented object, and that `resolveListedToolKind(HARNESSES.codex, name)` is `"write"` for each of `apply_patch`, `Edit`, `Write`, while an unlisted name still reaches `"write"` only through `resolveToolKind`.
   - Add a `runPreToolUseArm` case driving a Codex-shaped payload — `{session_id, cwd, tool_name: "apply_patch", tool_input: {command: "*** Update File: .prism/rules/x.md"}}` — over a fixture repo with an unread routed doc, asserting the deny JSON on stdout **and** `process.exitCode === 0`. The exit-0 half is the fail-open property the Decisions section rests on, so it is not optional.
   - **Verify:** `pnpm prism:check`. After task 1.

### Hunter (live probe) — the gate between PR 1 and PR 2

8. **[HITL] Probe Codex against the delivered registration.** Blocked on PR 1 merging. Run a Codex session in a repo with PRISM installed and `hosts` including `codex`, then record four observations in this plan's `## History`:
   - Does the `PostToolUse` announcement reach the model (announce arm works)?
   - Does an edit to a routed path with the governing doc unread get blocked, and does the `permissionDecisionReason` text render (deny arm works)?
   - What is `payload.cwd` — the repo root, or below it? This settles the relative-command-string Decision.
   - Does the deny cross into a Codex subagent, if Codex has one?
   - **Blocks tasks 9–15.** If the probe fails, re-plan rather than proceeding; the contingency spellings are in the command-string Decision.

### Eli (documentation) — PR 2: the durable record, after task 8

9. **Correct ADR-0072's Claude-only Consequences bullet** — `.prism/spec/adrs/_toolkit/0072-write-gate-on-routed-paths.md:65`. The bullet currently reads "**The gate reaches Claude Code consumers only.** Cursor and Codex both support `PreToolUse` … Until then, `HARNESSES.cursor.emitDeny` and `HARNESSES.codex.emitDeny` return `null`." Rewrite it to name Cursor alone as the undelivered host, keeping the delivery-gap-not-platform-limit framing and the note that each remaining seam needs its own registration format, merge semantics, and end-to-end run. Do not change the ADR's `Status`.
   - **Verify:** content-only. `pnpm prism:crossref-lint` catches a broken link if one is introduced.

10. **Amend ADR-0074** — `.prism/spec/adrs/_toolkit/0074-hook-enforcement-is-claude-only-with-a-prose-fallback.md`. Keep `Status: accepted` and keep the title; the decision still holds for Cursor. Append an `## Amendment (2026-09-02): the Codex half closed` section covering, in order: which rejected alternative this closes, quoted from the ADR's own § Decision; why the documented envelope clears the unverified-envelope bar — the asymmetric fail-open argument from the Decisions section above, not a claim that anything was measured before the probe; what the probe actually found (task 8's four observations); the `PostCompact` gap and what it costs; and that Cursor remains undelivered. Add, do not rewrite — the original `## Consequences` describes the state the ADR was written in and stays.
   - **Verify:** content-only.

11. **Update the canonical install-layout doc** — `.prism/architect/_toolkit/install-layout.md`. Edits at: line 145 ("**Delivery is Claude Code only.**" — the heading claim is now wrong); line 149 (§ Hook runtime, "Independent of that opt-in, Claude Code is the only host with a delivery path at all"); line 151 (the "asymmetry is a decision" paragraph — point it at the ADR-0074 amendment); line 159 (§ Write gate, "it reaches Claude Code only — the same delivery gap § Hook runtime states"); line 171 ("reports the Claude-only reach on an install that has the gate"); line 179 (§ Hook-runtime ownership and recovery — the pattern-keyed ownership paragraph now covers two patterns and two files). State plainly that one runtime at `.claude/hooks/` serves both registrations, and that a Codex-only consumer therefore has a `.claude/hooks/` directory.
   - **Verify:** content-only, but `pnpm prism:build` regenerates the platform copies — run it in task 15.

12. **Update the curated consumer twin** — `templates/install/.prism/architect/_toolkit/install-layout.md`. Edits at: line 121 ("The hook announces; it never blocks … Delivery reaches Claude Code only"); line 125 (§ Hook runtime, "Claude Code is the only host with a delivery path at all today"); line 127 ("How PRISM decides which hook entries in your settings are its own" — now two files); line 135 (§ Write gate, "Like the rest of the hook runtime, this reaches Claude Code only").
   - Line 121 carries a pre-existing contradiction independent of this ticket: it says the hook "never blocks" one line above the twin's own § Write gate describing blocking. Fix it in the same pass. `checkSeedDrift` only checks that a curated seed file exists and never compares content, so nothing else will catch it.
   - **Verify:** content-only.

13. **Update the consumer-facing compatibility statement** — `docs/ai-skills/compatibility.md`. Three sites: the summary bullet at line 17 ("**Hook-based enforcement** reaches Claude Code only"); the section heading at line 69 ("Hook-based enforcement is Claude Code only"), which is now wrong as a heading and needs renaming to name the two delivered hosts and Cursor as the gap; and the body at lines 71–83, where the second paragraph asserts "no equivalent is written for Codex or Cursor."
   - Renaming the heading breaks every cross-reference to it. Sweep with `grep -rn "Hook-based enforcement is Claude Code only" . --exclude-dir=node_modules --exclude-dir=.git` and fix each hit — known callers are ADR-0074's closing paragraph, both doctor findings from task 5, and `AGENTS.md:858`, which carries the same stale "reaches Claude Code only" sentence and is hand-maintained rather than a build mirror, so it needs the same hand edit as the others. This is `code-standards.md` § Removal and rename completeness.
   - **Verify:** the grep returns no stale hits.

14. **Correct the always-on prose** — `.prism/rules/context-reuse.md:30`, § "Architect-context routing is diff-blind". The clause "It reaches Claude Code only, it is friction rather than a wall, and it never fires on a path no route matches — so this clause remains the fallback that runs everywhere else, including hosts with no hook" is wrong on its first phrase. Rewrite to name Claude Code and Codex as the hosts the enforcer reaches, keeping Cursor and any host with no hook support as what the following fallback clause covers. Keep the friction-not-a-wall clause.
   - This file declares `load: always`, so its discriminator is named here deliberately, satisfying `.prism/rules/followup-scope.md` § "Spec content never rides an unrelated ticket".
   - Edit the canonical file only. The four mirrors — `.claude/rules/context-reuse.md`, `.codex/rules/context-reuse.md`, `.cursor/rules/context-reuse.mdc`, `templates/install/.prism/rules/context-reuse.md` — are build outputs and are regenerated in task 15, not hand-edited.
   - **Verify:** task 15's `pnpm prism:check` flags any mirror left stale.

15. **Rebuild and verify** — run `pnpm prism:build`, then `pnpm prism:check` end to end. The build refreshes the rule mirrors from task 14 and the architect-doc platform copies from task 11. After tasks 9–14.
   - **Verify:** `pnpm prism:check` green, including `prism:check-types` over both tsconfig arms, `prism:verify-manifest`, `prism:crossref-lint`, `prism:spec-scope-lint`, `prism:ship-closure`, and `prism:verify-pack`.

---

## Acceptance Criteria

### Behavioral

- [ ] **AC-1** — Given a consumer with `hosts` including `codex`, When `prism update` runs, Then `.codex/hooks.json` registers PRISM's PreToolUse and PostToolUse hooks and `prism doctor` reports them registered.
  - Evidence (`machine`): the `update.test.ts` fresh-consumer case asserts both event keys present with a command matching `PRISM_CODEX_HOOK_COMMAND_PATTERN`; the `doctor.test.ts` case asserts an `info` finding and zero warnings on the `hook-registration` check. Falsifiable: delete either event key from `templates/install/.codex/hooks.json` and both assertions fail.

- [ ] **AC-2** — Given a consumer whose `.codex/hooks.json` already carries its own PreToolUse entry, When `prism update` runs, Then that entry is still present and PRISM's is added beside it.
  - Evidence (`machine`): `update.test.ts` asserts the consumer's entry object is still in the merged array alongside PRISM's. Falsifiable: replace the compose-within-array call with an overwrite and the assertion fails.

- [ ] **AC-3** — Given a consumer that has run `prism update` once, When it runs again with nothing else changed, Then `.codex/hooks.json` is byte-identical.
  - Evidence (`machine`): `update.test.ts` compares file contents across two runs. Falsifiable: drop the pattern filter from `isPrismOwnedHookEntry` and the second run appends a duplicate PRISM entry.

- [ ] **AC-4** — Given a consumer whose `hosts` drops `codex`, When `prism update` runs, Then PRISM's entries leave `.codex/hooks.json` and the consumer's own entries stay.
  - Evidence (`machine`): the `update.test.ts` drop case asserts PRISM's entry absent and the consumer's present. Falsifiable: gate removal on the whole file rather than on PRISM-owned entries, and the consumer's entry disappears with it.

- [ ] **AC-5** — Given a `hosts: ["codex"]` consumer, When `prism update` runs, Then the hook runtime is present at `.claude/hooks/hook.mjs` and no PRISM registration is written to `.claude/settings.json`.
  - Evidence (`machine`): `update.test.ts` asserts the runtime file exists and that `.claude/settings.json` is either absent or carries no command matching `PRISM_HOOK_COMMAND_PATTERN`. Falsifiable: leave the pre-change `!hosts.includes("claude")` early return in place and the runtime is deleted, so a Codex registration would point at nothing.

- [ ] **AC-6** — Given a Codex PreToolUse payload for `apply_patch` against a routed path whose governing docs are unread, When the hook runs, Then stdout carries the documented deny envelope and the process exits 0.
  - Evidence (`machine`): the `hook-gate.test.ts` case asserts the parsed stdout object equals the documented shape and that `process.exitCode === 0`. Falsifiable in both halves: restore `emitDeny: () => null` and stdout is empty; make any path exit non-zero and the exit assertion fails, which is the fail-open property the ship-ahead-of-probe decision rests on.

- [ ] **AC-7** — Given a live Codex session in a PRISM-installed repo with `hosts` including `codex`, When the session edits a routed spec file with the governing doc unread, Then Codex blocks the edit and shows the reason naming the doc to read.
  - Evidence (`human`): task 8's probe, recorded in `## History` with all four observations it names. This is the only criterion the suite cannot grade, and it is what the probe exists for. Falsifiable: a probe that shows the edit proceeding fails it.

### Non-behavioral

- [ ] **AC-8** — `pnpm prism:check` passes on both PRs, including `prism:check-types` over the hooks tsconfig arm, `prism:verify-pack`, and `prism:ship-closure`.
  - Evidence (`machine`): the CI run on each PR.

- [ ] **AC-9** — No document still claims hook enforcement reaches Claude Code alone.
  - Evidence (`machine`): `grep -rn "Claude Code only" . --exclude-dir=node_modules --exclude-dir=.git` returns only Cursor-scoped statements and ADR-0074's frozen `## Context` narration. Falsifiable with a positive control: the pre-change tree fails this, and a partial edit that misses `doctor.ts:812` or `context-reuse.md:30` also fails it.

- [ ] **AC-10** — The curated seed twin no longer contradicts itself about whether the hook blocks.
  - Evidence (`machine`): `grep -n "never blocks" templates/install/.prism/architect/_toolkit/install-layout.md` returns nothing. Falsifiable: the pre-change file returns line 121.

### AC Adjustments

### AC Sync Log

| Date | Agent | Action | Plan | Ticket |
| ---- | ----- | ------ | ---- | ------ |
| 2026-09-02 | Winston | AC authored | created | N/A — no tracker issue; follow-up to #477 |

---

## Sessions

- 2026-09-02 [huntermcgrew/codex-hook-delivery] open: Intent — plan Codex hook delivery so the write gate and announce layer fire on Codex, closing the alternative ADR-0074 deferred; Bounds — write one plan file, no implementation, no source edits; Approach — reuse the existing registration-merge seam for a second file rather than build a parallel writer · close: scope held
- 2026-09-02 [huntermcgrew/codex-hook-delivery] open: Intent — implement the 7 Clove tasks (PR 1) delivering the hook runtime and write gate to Codex; Bounds — `harnesses.mjs`, `update.ts`, `doctor.ts`, `verify-pack-parity.ts`, `templates/install/.codex/hooks.json`, and their test files only — no PR 2 doc tasks, no `[HITL]` probe; Approach — follow the plan's task specs in order, verifying types and tests after each · close: scope held — one addition beyond the literal task text: `verify-pack-parity.ts` gained a `templates/install/.codex` runtime-read entry, needed because `mergeHookCodexRegistration` reads that path at runtime and `prism:verify-pack` would otherwise miss it; local-frame correction, not scope drift.
- 2026-09-02 [huntermcgrew/codex-hook-delivery] open: Intent — Briar self-review of PR 1 (tasks 1–7) against the nine review angles, plus a targeted check of the ownership-merge, host-gate, deny-envelope, and doctor-arm logic named in the dispatch; Bounds — read-only review of the PR 1 diff and its tests, no source edits, plan-only commit; Approach — read every changed file in full, run type-check/tests/crossref/pack/ship-closure, and manually repro any suspicious control-flow interaction rather than trust the green test suite alone · close: scope held — one manual repro built outside the diff (`/tmp/repro-doctor.test.ts`, not committed) to confirm the dead-registration/inert-warning suppression finding; no source files touched besides this plan.

---

## History

- 2026-09-02 [huntermcgrew/codex-hook-delivery]: Planned Codex hook delivery as a follow-up to #477. Verified OpenAI's hooks documentation directly and confirmed `.codex/hooks.json` is not git-ignored, which settled the registration target; see Decisions.
- 2026-09-02 [huntermcgrew/codex-hook-delivery]: Implemented tasks 1–7 (PR 1) — `HARNESSES.codex` gained the deny envelope and `Edit`/`Write` aliases, the `.codex/hooks.json` template shipped, `mergeHookSettingsRegistration` generalized into a shared `mergeHookRegistration` seam with a Codex twin, `refreshHookRuntime`'s host gate split so the runtime delivers on `claude` OR `codex` while each registration gates on its own host, `checkHookRegistration` gained the Codex arm, and tests were added or updated across `update.test.ts`, `doctor.test.ts`, and `hook-gate.test.ts`. `pnpm prism:check` is green.
- 2026-09-02 [huntermcgrew/codex-hook-delivery]: Fixed Briar's Major — `checkHookRegistration`'s dead-registration early return was silently dropping the inert-runtime warning for an unrelated host mix. Dropped the blanket early return, hoisted `runtimePresent`, and each per-host arm now guards its own info/warning push on the runtime's actual presence instead of trusting the registered-path set alone. Added the combined-condition test Briar named.

---

## Debugged Issues

---

## Review Issues

### `checkHookRegistration`'s dead-registration early return silently drops the inert-runtime warning

- **Severity:** `major`
- **Status:** `fixed`
- **File:** `scripts/ai-skills/doctor.ts:134-137` (the `if (findings.length > 0) { return findings; }` inserted between the dead-registration loop and the per-host arms)
- **Problem:** the function's own JSDoc promises to report both halves independently — "a hook runtime that is present but unregistered, AND a registration that points at a file which is not there." The new early return breaks that: whenever the dead-registration loop pushes any warning (even for a command wholly unrelated to the host being checked), the function returns before the per-host arms run, so a genuinely inert runtime (present on disk, not registered) is never reported. Confirmed by a manual repro against the built function: `hosts: ["claude"]`, `.claude/hooks/hook.mjs` present and unregistered, plus one unrelated dead registration (a stale `.claude/hooks/old/hook.mjs` command) — the report carries only the dead-registration warning; the inert-runtime warning that the pre-Codex code would have also reported is silently gone. None of the new or existing tests in `doctor.test.ts` combine "runtime present but unregistered" with "an unrelated dead registration exists," so nothing caught this. Pre-Codex, the inert check ran unconditionally inside `if (hosts.includes("claude"))`, independent of the dead-registration loop's findings — this is a regression the Codex generalization introduced, not a pre-existing bug.
- **Fixed in:** dropped the blanket `if (findings.length > 0) return findings;` between the dead-registration loop and the per-host arms. The per-host arms now run unconditionally (gated only on their own host being in `hosts`), each re-checking the runtime's own presence (`runtimePresent`, hoisted once) rather than trusting `registeredPaths.has(hookRuntimePath)` alone — that guard is what keeps a registration the dead-registration loop already flagged as missing from also being claimed as "installed and registered." Added `runDoctor reports a dead registration and an inert runtime together — neither suppresses the other` to `doctor.test.ts`, asserting both findings land in the same report.

### Curated seed twin contradicts itself on whether the hook blocks

- **Severity:** `minor`
- **Status:** `open`
- **File:** `templates/install/.prism/architect/_toolkit/install-layout.md:121`
- **Problem:** the line says "The hook announces; it never blocks" directly above the same file's § Write gate, which describes blocking. `checkSeedDrift` never compares curated content, so no gate catches it.
- **Suggested fix:** task 12.

---

## Cleanup Items

---

## PR Readiness

- [x] No critical or major issues
- [x] Types correct — no `any`, no unsafe `as`
- [x] No stray console.logs or debug artifacts
- [x] Tests written for new logic and edge cases
- [x] All debugged issues resolved (no `open` entries)
- [x] Build passes — last run: 2026-09-02 (`pnpm prism:check-types`, `pnpm prism:test` (220/220), `pnpm prism:crossref-lint`, `pnpm prism:verify-pack`, `pnpm prism:ship-closure` all green)
- [ ] PR description up to date
- [ ] Lasting decisions promoted to architect context (if applicable) — deferred to plan close, after PR 2 and task 8's probe

**Last updated:** 2026-09-02 [huntermcgrew/codex-hook-delivery] — Briar self-review (PR 1)
