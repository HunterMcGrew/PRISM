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

- **Codex also registers `PostCompact`, delivering all three events Claude gets.**
  - **Correction (2026-09-08):** this entry originally read "Two events only: `PreToolUse` and `PostToolUse`. No `PostCompact`," reasoning that "Codex documents no `PostCompact` event." That was wrong — OpenAI's hooks documentation (`https://learn.chatgpt.com/docs/hooks`, verified again on this date) lists `PostCompact` and describes it as running "after Codex compacts the chat," with `session_id`, `cwd`, `turn_id`, and a `manual`/`auto` `trigger` in its payload. Without the third registration, a Codex session's announce-once state never reset after a compaction, so the write gate could let a write through on a doc the model could no longer see — the exact failure this PR exists to close, recurring on every compaction in a long session.
  - **Chosen approach:** register `PostCompact` in `templates/install/.codex/hooks.json` with no `matcher` (Codex's own examples for non-tool events omit it), pointing at `node ".claude/hooks/hook.mjs" --tool=codex --event=PostCompact` — the same command shape Claude's `PostCompact` entry uses. No code change: `runPostCompactArm` already reads `payload.session_id ?? payload.conversation_id` and `payload.cwd` directly with no host branching, `main()` routes `--event=PostCompact` before the harness spec is used, and `PRISM_CODEX_HOOK_COMMAND_PATTERN` already matches the added command string.
  - **Implementation guidance:** the ADR-0074 amendment (task 10) records `PostCompact` as delivered on Codex, not as a named gap.

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
  - **Amended 2026-09-08:** PR 2 now ships together with issue-488's B6, and task 8's probe now runs inside issue-488's B5 session. See the Decision "One probe session and one documentation PR cover both plans' tails" below. PR 1's own scope is unchanged.

- **One probe session and one documentation PR cover both plans' tails.**
  - **Root cause:** two plans each ended up owning a Hunter probe and a documentation pass over the same paragraphs of the same files. This plan's task 8 probes the Codex write gate and announce layer; issue-488's B5 probes the Codex and Cursor git gates. This plan's tasks 9–15 and issue-488's B6 both rewrite `docs/ai-skills/compatibility.md`'s hook-enforcement heading, `.prism/architect/_toolkit/install-layout.md` § Hook runtime, and ADR-0074 — and they write *different* sentences there. Task 13 renames the heading to name two delivered hosts with Cursor as the gap; B6 replaces it with a per-host table across all three. Landing them separately means writing the same lines twice and shipping an intermediate claim that is known to go stale on a schedule already planned.
  - **Alternatives considered:** run this plan's probe and PR 2 now, ahead of Phase B, and let B6 rewrite whatever it rewrites.
  - **Chosen approach:** merge both tails. One probe session covers task 8's four Codex write-gate observations plus B5's Codex and Cursor git-gate observations. One documentation PR then covers tasks 9–15 and B6 together, writing each shared file once at its final wording. Running this plan's PR 2 first loses because the second documentation pass is already written down and waiting: `.prism/plans/issue-488.md` carries B6 as a planned task with its own wording for those same lines, so the rewrite is scheduled rather than hypothetical, and the intermediate heading is known wrong before anyone writes it.
  - **Cost, stated rather than hedged:** this plan's documentation corrections wait for issue-488 B1–B4 to land, because B5 cannot probe git gates that do not yet exist on Codex and Cursor. The stale "Claude Code only" claims stay in the tree for that window. The escape is explicit: if Phase B stalls, this plan's PR 2 runs standalone on its own task list. The merge is a sequencing choice, not a dependency this plan cannot walk back.
  - **Implementation guidance:** PR #487 merges as-is, before the probe — its scope does not change. The consolidated probe runs after B1–B4 land. Eli owns the consolidated documentation PR and carries both task lists into it. Because that PR now spans two plans, it records its `## History` line in both.

- **Doctor's Codex git-gates reach lines belong to issue-488 B4, not to a new ticket.**
  - **Root cause:** `describeGitGates` and the git-gates-inert warning sit inside `if (hosts.includes("claude"))` in `scripts/ai-skills/doctor.ts` (the arm opening at `:921`), while the Codex arm at `:960` has neither. A Codex-only consumer that registers `git-gates.mjs` — which this branch now delivers — is covered by the generic dead-registration loop, but is never told whether its git gates are on, off, or inert.
  - **Alternatives considered:** a new follow-up ticket; folding it into this plan's PR 2.
  - **Chosen approach:** fold into issue-488 B4, which already generalizes `checkHookRegistration` over the same claude/codex/cursor host table and rewrites the Claude-only reach sentence. A new ticket fails `.prism/rules/followup-scope.md` § Scope-fit — this is content inside one already-planned task, not a scope that splits off. Putting it in this plan's PR 2 would land doctor's git-gates behavior in the write-gate plan, one host ahead of the Cursor arm B4 writes in the same pass.
  - **Implementation guidance for B4:** lift `describeGitGates(config)` and the `gitGatesInert` warning out of the Claude arm so each runs once per delivered host. The Codex arm already knows whether `.codex/hooks.json` registers `git-gates.mjs` — this branch widened `PRISM_CODEX_HOOK_COMMAND_PATTERN` to `(?:hook|git-gates)\.mjs` for exactly that reason.

- **Codex also registers and claims `git-gates.mjs`, widened during the merge with `main`'s `commit and push gates are harness hooks` change (issue #488 Phase A).**
  - **Root cause:** merging `origin/main` into this branch pulled in a second entry point, `git-gates.mjs`, delivered into the shared `.claude/hooks/` runtime and registered on Claude via its own `Bash` matcher group in `.claude/settings.json`. Both the Codex registration template and its ownership pattern only knew about `hook.mjs`, so a Codex-only consumer would receive the file but no registration for it, and a Codex registration a consumer edited away would never be reclaimed as PRISM's own.
  - **Alternatives considered:** leaving Codex without git-gates delivery until a follow-up ticket. Rejected — the runtime file already ships to a Codex-only consumer's `.claude/hooks/` per the "one runtime, two registrations" decision above, so shipping the file with no matching registration is exactly the undelivered-gate gap ADR-0072 exists to avoid.
  - **Chosen approach:** added a second `PreToolUse` matcher group (`^Bash$`) to `templates/install/.codex/hooks.json` pointing at `git-gates.mjs`, and widened `PRISM_CODEX_HOOK_COMMAND_PATTERN` to `(?:hook|git-gates)\.mjs`, mirroring how main's own `PRISM_HOOK_COMMAND_PATTERN` widened for the Claude side.
  - **Implementation guidance:** `doctor.ts`'s git-gates-specific messages (`describeGitGates`, the git-gates-inert warning) stay scoped to `hosts.includes("claude")`, matching main's shipped design as-is — a Codex-only consumer's git-gates registration is still covered by the generic dead-registration loop, just not by the host-specific git-gates info/warning lines. Extending those lines to Codex is follow-up work, not done here; the Decision "Doctor's Codex git-gates reach lines belong to issue-488 B4" below says where it goes. Also gated the pre-existing "installed and registered for Claude Code" info message on `!gitGatesInert`, so it never claims a clean bill of health for a delivery whose git-gates half is inert — an interaction the two branches' tests didn't independently exercise until merged. `seedGitGatesConsumer` and one standalone test in `doctor.test.ts` now pin `hosts: ["claude"]` explicitly; without it, the default all-hosts resolution now also evaluates the Codex arm and adds an unrelated "inert for Codex" warning the tests didn't anticipate.

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
   - Original spec omitted a `PostCompact` key on the wrong premise that Codex documents no such event — corrected during PR-review pass 2; the shipped file adds a `PostCompact` entry (see Decisions) alongside the `git-gates.mjs` `PreToolUse` matcher this merge with `main` also added.
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

8. **[HITL] Probe Codex against the delivered registration.** Blocked on PR 1 merging, and now run as part of issue-488 B5's single probe session rather than on its own — the four observations below are B5's Codex arm, recorded in this plan's `## History` as well as issue-488's. Run a Codex session in a repo with PRISM installed and `hosts` including `codex`, then record:
   - Does the `PostToolUse` announcement reach the model (announce arm works)?
   - Does an edit to a routed path with the governing doc unread get blocked, and does the `permissionDecisionReason` text render (deny arm works)?
   - What is `payload.cwd` — the repo root, or below it? This settles the relative-command-string Decision.
   - Does the deny cross into a Codex subagent, if Codex has one?
   - **Blocks tasks 9–15.** If the probe fails, re-plan rather than proceeding; the contingency spellings are in the command-string Decision.

### Eli (documentation) — PR 2: the durable record, after task 8

These tasks ship in one PR together with issue-488's B6, after the consolidated probe. Tasks 11, 13, and the ADR-0074 half of task 10 touch the same lines B6 rewrites, so write each of those lines once at its final three-host wording rather than twice — see the Decision "One probe session and one documentation PR cover both plans' tails." Tasks 9, 12, 14, and 15 have no B6 counterpart and are unaffected.

9. **Correct ADR-0072's Claude-only Consequences bullet** — `.prism/spec/adrs/_toolkit/0072-write-gate-on-routed-paths.md:65`. The bullet currently reads "**The gate reaches Claude Code consumers only.** Cursor and Codex both support `PreToolUse` … Until then, `HARNESSES.cursor.emitDeny` and `HARNESSES.codex.emitDeny` return `null`." Rewrite it to name Cursor alone as the undelivered host, keeping the delivery-gap-not-platform-limit framing and the note that each remaining seam needs its own registration format, merge semantics, and end-to-end run. Do not change the ADR's `Status`.
   - **Verify:** content-only. `pnpm prism:crossref-lint` catches a broken link if one is introduced.

10. **Amend ADR-0074** — `.prism/spec/adrs/_toolkit/0074-hook-enforcement-is-claude-only-with-a-prose-fallback.md`. Keep `Status: accepted` and keep the title; the decision still holds for Cursor. Append an `## Amendment (2026-09-02): the Codex half closed` section covering, in order: which rejected alternative this closes, quoted from the ADR's own § Decision; why the documented envelope clears the unverified-envelope bar — the asymmetric fail-open argument from the Decisions section above, not a claim that anything was measured before the probe; what the probe actually found (task 8's four observations); that Codex's `PostCompact` registration was corrected during PR-review pass 2 (the original spec wrongly assumed Codex documents no such event) and now delivers all three events, matching Claude; and that Cursor remains undelivered. Add, do not rewrite — the original `## Consequences` describes the state the ADR was written in and stays.
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

#### AC Adjustment: AC-9 is graded on PR 2, not PR 1

- **Original:** AC-9 — No document still claims hook enforcement reaches Claude Code alone.
- **Proposed:** the criterion text and its Evidence command stay exactly as written, and the criterion gains one scope line: *Graded on PR 2 (Eli tasks 11–14). PR 1 is not expected to satisfy it.*
- **Reason:** every site AC-9's grader listed is assigned to a PR 2 task — `install-layout.md` to task 11, the curated twin to task 12, `compatibility.md` and `AGENTS.md` to task 13, `context-reuse.md` to task 14 — and PR 2 is sequenced behind task 8's `[HITL]` probe. Reese graded it against PR 1's HEAD and returned UNMET, which is the correct grade for a PR that contains none of that work by design. Without the scope line, every verification of PR 1 re-derives the same UNMET, and a reader lands on a shipped PR that looks like it fails its own acceptance criteria. Nothing about the criterion's strictness changes: the same grep still has to come back clean before this plan closes.
- **Status:** `proposed`

#### AC Adjustment: AC-10 is graded on PR 2, not PR 1

- **Original:** AC-10 — The curated seed twin no longer contradicts itself about whether the hook blocks.
- **Proposed:** the criterion text and its Evidence command stay exactly as written, and the criterion gains one scope line: *Graded on PR 2 (Eli task 12). PR 1 is not expected to satisfy it.*
- **Reason:** `templates/install/.prism/architect/_toolkit/install-layout.md:121` is task 12's edit, and task 12 sits behind task 8's probe. Same shape as the AC-9 adjustment above, and the same limit on it — the grep still has to return nothing before this plan closes.
- **Status:** `proposed`

### AC Sync Log

| Date | Agent | Action | Plan | Ticket |
| ---- | ----- | ------ | ---- | ------ |
| 2026-09-02 | Winston | AC authored | created | N/A — no tracker issue; follow-up to #477 |
| 2026-09-08 | Winston | AC adjustment proposed — AC-9 and AC-10 scoped to PR 2 | updated | N/A — no tracker issue; follow-up to #477 |

---

## Sessions

- 2026-09-02 [huntermcgrew/codex-hook-delivery] open: Intent — plan Codex hook delivery so the write gate and announce layer fire on Codex, closing the alternative ADR-0074 deferred; Bounds — write one plan file, no implementation, no source edits; Approach — reuse the existing registration-merge seam for a second file rather than build a parallel writer · close: scope held
- 2026-09-02 [huntermcgrew/codex-hook-delivery] open: Intent — implement the 7 Clove tasks (PR 1) delivering the hook runtime and write gate to Codex; Bounds — `harnesses.mjs`, `update.ts`, `doctor.ts`, `verify-pack-parity.ts`, `templates/install/.codex/hooks.json`, and their test files only — no PR 2 doc tasks, no `[HITL]` probe; Approach — follow the plan's task specs in order, verifying types and tests after each · close: scope held — one addition beyond the literal task text: `verify-pack-parity.ts` gained a `templates/install/.codex` runtime-read entry, needed because `mergeHookCodexRegistration` reads that path at runtime and `prism:verify-pack` would otherwise miss it; local-frame correction, not scope drift.
- 2026-09-02 [huntermcgrew/codex-hook-delivery] open: Intent — Briar self-review of PR 1 (tasks 1–7) against the nine review angles, plus a targeted check of the ownership-merge, host-gate, deny-envelope, and doctor-arm logic named in the dispatch; Bounds — read-only review of the PR 1 diff and its tests, no source edits, plan-only commit; Approach — read every changed file in full, run type-check/tests/crossref/pack/ship-closure, and manually repro any suspicious control-flow interaction rather than trust the green test suite alone · close: scope held — one manual repro built outside the diff (`/tmp/repro-doctor.test.ts`, not committed) to confirm the dead-registration/inert-warning suppression finding; no source files touched besides this plan.
- 2026-09-08 [huntermcgrew/codex-hook-delivery] open: Intent — re-land PR #487 by merging `origin/main` (issue #488 Phase A, git gates) into this branch and reconciling the two features; Bounds — resolve conflicts in `harnesses.mjs` and `doctor.ts` only, widen Codex delivery to cover `git-gates.mjs` where the merge exposed the gap, no other scope; Approach — read both sides' full functions before resolving, keep both features' explicit correctness fixes rather than picking one side wholesale · close: scope held — the one addition beyond the literal conflict (widening `PRISM_CODEX_HOOK_COMMAND_PATTERN` and the Codex hooks.json template to also claim/register `git-gates.mjs`) is documented as a Decision above and was explicitly anticipated by the dispatch, not silent drift.
- 2026-09-08 [huntermcgrew/codex-hook-delivery] open: Intent — grade all 10 acceptance criteria against the merged HEAD with executed evidence, re-grading from scratch rather than trusting the recorded marks; Bounds — read-only grading plus a plan-and-report commit, no source edits, tree clean before and after; Approach — run each Evidence sub-bullet's named command verbatim, and probe the real shipped template directly wherever a named test grades a fixture instead · close: scope held — the only additions beyond the named commands were three read-only probes (byte-identity for AC-3, live merge/drop/refresh against the real template for AC-2/AC-4/AC-5) run in OS temp dirs, which strengthened evidence rather than widening scope.
- 2026-09-08 [huntermcgrew/codex-hook-delivery] open: Intent — resolve the AC-9/AC-10 UNMET so lane pr-487 can proceed, and reconcile this plan's tail with issue-488 Phase B's overlapping probe and docs pass; Bounds — this plan file only, no code, no edits to `.prism/plans/issue-488.md`, PR #487's scope unchanged; Approach — scope the two criteria to PR 2 as proposed adjustments rather than rewriting or deleting them, and merge both plans' tails into one probe session and one docs PR · close: scope held — the two `## Review Issues` entries moved to `deferred` and the pre-existing curated-twin `minor` moved with them, since it is the same site AC-10 grades and leaving the two at different statuses would misreport the same defect twice.
- 2026-09-08 [huntermcgrew/codex-hook-delivery] open: Intent — re-grade all 10 acceptance criteria at `4189b9d1` after the merge with main, from scratch rather than trusting the recorded marks; Bounds — read-only grading plus a plan-and-report commit, no source edits, tree clean before and after; Approach — re-run every Evidence command verbatim and re-probe the real shipped Codex template live, then diff the result against the first pass's record · close: scope held — one scratch probe file written at the worktree root and removed before the tree was re-checked; the only finding beyond the first pass is the two merge-inherited AC-9 sites, recorded as an observation in the AC-9 Review Issues entry rather than acted on.
- 2026-09-08 [huntermcgrew/codex-hook-delivery] open: Intent — Clove fixes every `open` entry in `## Review Issues` per Sol's needs-fix dispatch on lane pr-487; Bounds — local-frame code/doc fixes only, no unilateral accept of a `proposed` AC Adjustment (that gate is the user's per `ac-adjustment.md` and `plan-authoring.md` § Acceptance Criteria Format), no work on PR 2's deferred tasks; Approach — read `## Review Issues` for `open` status entries, fix each in place, and re-verify `pnpm prism:check` · close: scope held — zero entries carry `open` status; the two candidates (AC-9, AC-10) are `deferred` by the plan's own two-PR-stack Decision and their AC Adjustments are `proposed`, pending Hunter's accept, so there is no code or doc change to make on this branch without pre-empting that decision. No source or plan-content edit beyond this Sessions/History record.
- 2026-09-08 [huntermcgrew/codex-hook-delivery] open: Intent — Briar self-review of the full PR #487 diff against `origin/main` (Codex delivery seam plus the merge-conflict resolution with issue #488's git gates), full bar, every severity; Bounds — read-only review plus the plan-only commit, no source edits; Approach — read every changed file in full, run `pnpm prism:check` end to end, and manually repro any control-flow interaction that looked suspicious rather than trust the green test suite alone · close: scope held — one manual repro built outside the diff (two throwaway scripts under the OS temp scratch dir, not committed) confirmed a second instance of the already-known dead-registration-suppression bug shape, one early return later in the same function; this finding was not yet on the plan when Clove's needs-fix pass (the entry above) ran, so it remains `open` for the next pass. No source files touched besides this plan.
- 2026-09-08 [huntermcgrew/codex-hook-delivery] open: Intent — Clove fixes Briar's open major (`checkHookRegistration`'s per-host stale-registration return suppresses independent findings) per Sol's needs-fix dispatch on lane pr-487; Bounds — `scripts/ai-skills/doctor.ts` and `doctor.test.ts` only, no unilateral accept of the two `proposed` AC Adjustments, no PR 2 work; Approach — verify the repro independently before touching code, drop both early returns so every push in the function is additive, run the full fixture-conflict analysis against existing tests rather than assume the fix is drop-in, and re-verify with `pnpm prism:check` · close: scope held — one pre-existing test's fixture (no runtime file on disk) surfaced a second, genuinely-true finding once the suppression was removed; updated that test's assertions to check for both real findings by content instead of narrowing the fix to preserve the old count. Findings, verification, and PR Readiness recorded above.
- 2026-09-08 [huntermcgrew/codex-hook-delivery] open: Intent — Briar self-review pass 2 of the full PR #487 diff against `origin/main` (Codex delivery seam plus the git-gates merge-conflict resolution), full bar, every severity, per Sol's dispatch; Bounds — read-only review plus the plan-only commit, no source edits; Approach — read every changed file in full including the untouched surrounding context (not diff hunks alone), run `pnpm prism:check` end to end, and independently trace the host-gating logic given this function's history of two prior suppression bugs · close: scope held — no source edits; one new open major found and recorded below. No manual repro scripts needed this pass — the suspect logic was traced by reading, not executing.
- 2026-09-08 [huntermcgrew/codex-hook-delivery] open: Intent — Clove fixes Briar's third open major (`checkHookRegistration`'s own JSDoc still claims delivery gates on `claude` alone) per Sol's needs-fix dispatch on lane pr-487; Bounds — `scripts/ai-skills/doctor.ts` JSDoc only, no unilateral accept of the two `proposed` AC Adjustments, no PR 2 work; Approach — rewrite the two contradicting sentences to name the actual dual-host gate, then re-verify with `pnpm prism:check` · close: scope held — one file changed (the JSDoc), no code-behavior change, no test needed since nothing executable moved.
- 2026-09-08 [huntermcgrew/codex-hook-delivery] open: Intent — Briar self-review pass 3 of the full PR #487 diff against `origin/main` (Codex delivery seam plus the git-gates merge-conflict resolution, checking both sides of the resolved hunks survived), full bar, every severity, per Sol's dispatch; Bounds — read-only review plus the plan-only commit, no source edits; Approach — read every changed file in full (including surrounding unchanged context), set up a fresh worktree with `pnpm install --frozen-lockfile`, run `pnpm prism:check` end to end, and reproduce any suspicious control-flow interaction against the built function rather than trust the green test suite alone · close: scope held — no source edits; one new open major found and reproduced with two throwaway repro scripts under the OS temp scratch dir (not committed).
- 2026-09-08 [huntermcgrew/codex-hook-delivery] open: Intent — Clove fixes Briar pass 3's open major (`checkHookRegistration`'s per-host "installed and registered" messages don't verify the specific host registers `hook.mjs`) per Sol's needs-fix dispatch on lane pr-487; Bounds — `scripts/ai-skills/doctor.ts` and `doctor.test.ts` only, no unilateral accept of the two `proposed` AC Adjustments, no PR 2 work; Approach — verify both repro scenarios' logic independently before touching code, track each host's own registered paths separately from the shared cross-host set, and re-verify with `pnpm prism:check` · close: scope held — one addition beyond the literal finding: applied the identical per-host fix to `gitGatesInert` and the `describeGitGates` gate, one line away in the same function, which shared the exact same cross-host-leak shape for `git-gates.mjs`; local-frame correction against a repeat bug shape, not scope drift.
- 2026-09-08 [huntermcgrew/codex-hook-delivery] open: Intent — Briar self-review pass 4 of the full PR #487 diff against `origin/main` (Codex delivery seam plus the git-gates merge-conflict resolution), full bar, every severity, per Sol's dispatch; Bounds — read-only review plus the plan-only commit, no source edits; Approach — trace `checkHookRegistration`'s complete control flow given three prior passes each found one instance of the same cross-host-leak bug shape, cross-check the new tests against the specific scenarios the three fixes claim to cover, and run `pnpm prism:check` in a fresh worktree install rather than trust CI alone · close: scope held — no source edits, no new finding; the four documented fixes hold against the current code and no fifth instance of the same bug shape survives.
- 2026-09-08 [huntermcgrew/codex-hook-delivery] open: Intent — Clove fixes Eric's PR-review pass 1 findings on PR #487 at `4eebe76e` (1 Major + 2 Minors + the carried-over PR-body-structure Minor) per Sol's needs-fix dispatch on lane pr-487; Bounds — `scripts/ai-skills/update.ts`, `doctor.ts`, `hook-gate.test.ts`, and the PR body only, no unilateral accept of the two `proposed` AC Adjustments, no PR 2 work; Approach — fix each finding at its named site, verify with a fresh `pnpm install --frozen-lockfile` then `pnpm prism:check`, and restructure the PR body onto `pr-description.md`'s canonical template · close: scope held — no source edit outside the four named files/PR body; all four findings fixed, `pnpm prism:check` green.
- 2026-09-08 [huntermcgrew/codex-hook-delivery] open: Intent — Clove fixes Eric's PR-review pass 2 findings on PR #487 at `8cf59036` (1 Major + 2 Minors) per Sol's needs-fix dispatch on lane pr-487; Bounds — `templates/install/.codex/hooks.json`, `scripts/ai-skills/hooks/harnesses.mjs`, `scripts/ai-skills/doctor.ts`, and this plan's Decisions/task-10 prose only, no unilateral accept of the two `proposed` AC Adjustments, no PR 2 work; Approach — independently verify the Major's factual claim at OpenAI's hooks docs before touching anything, trace `runPostCompactArm`/`main()`/`PRISM_CODEX_HOOK_COMMAND_PATTERN` to confirm the fix needs no code, then fix each finding at its named site and re-verify with `pnpm prism:check` · close: scope held — one addition beyond the three named findings: corrected two other plan-prose spots (task 2's description, task 10's ADR-amendment instructions) repeating the same now-wrong "Codex documents no PostCompact" claim, per `code-standards.md` § Removal and rename completeness; no source file touched outside the three named sites.
- 2026-09-08 [huntermcgrew/codex-hook-delivery] open: Intent — Clove fixes Eric's PR-review pass 3 findings on PR #487 at `93ebf4d1` (0 Majors, 3 Minors) per Sol's needs-fix dispatch on lane pr-487; Bounds — `scripts/ai-skills/doctor.ts`, `doctor.test.ts`, and `hook-gate.test.ts` only, no unilateral accept of the two `proposed` AC Adjustments, no PR 2 work; Approach — independently confirm each finding against the current code before touching it, fix each at its named site, add or extend tests to cover the specific gap named, and re-verify with a fresh `pnpm install --frozen-lockfile` then `pnpm prism:check` · close: scope held — one addition beyond the three named findings: the pre-existing cross-host-leak test's Codex fixture gained its own `git-gates.mjs` registration so it keeps testing the leak it was written for rather than tripping the new Codex-git-gates-inert guard; local-frame fixture correction, not scope drift. No source file touched outside the three named files.

---

## History

- 2026-09-02 [huntermcgrew/codex-hook-delivery]: Planned Codex hook delivery as a follow-up to #477. Verified OpenAI's hooks documentation directly and confirmed `.codex/hooks.json` is not git-ignored, which settled the registration target; see Decisions.
- 2026-09-02 [huntermcgrew/codex-hook-delivery]: Implemented tasks 1–7 (PR 1) — `HARNESSES.codex` gained the deny envelope and `Edit`/`Write` aliases, the `.codex/hooks.json` template shipped, `mergeHookSettingsRegistration` generalized into a shared `mergeHookRegistration` seam with a Codex twin, `refreshHookRuntime`'s host gate split so the runtime delivers on `claude` OR `codex` while each registration gates on its own host, `checkHookRegistration` gained the Codex arm, and tests were added or updated across `update.test.ts`, `doctor.test.ts`, and `hook-gate.test.ts`. `pnpm prism:check` is green.
- 2026-09-02 [huntermcgrew/codex-hook-delivery]: Fixed Briar's Major — `checkHookRegistration`'s dead-registration early return was silently dropping the inert-runtime warning for an unrelated host mix. Dropped the blanket early return, hoisted `runtimePresent`, and each per-host arm now guards its own info/warning push on the runtime's actual presence instead of trusting the registered-path set alone. Added the combined-condition test Briar named.
- 2026-09-08 [huntermcgrew/codex-hook-delivery]: Merged `origin/main` (PRISM-488 Phase A) to re-land PR #487; resolved `harnesses.mjs` (kept the documented Codex deny envelope, added Codex's `emitAllow`) and `doctor.ts` (kept the Codex host arms and the `claudeIsRegistered` correctness fix, added main's git-gates-inert warning and `describeGitGates` call). Widened Codex's delivery and ownership pattern to also cover `git-gates.mjs` — see Decision "Codex also registers and claims git-gates.mjs." `pnpm prism:check` is green on the merged HEAD (types, 913/913 runnable tests, crossref-lint, verify-manifest, ship-closure, verify-pack).
- 2026-09-08 [huntermcgrew/codex-hook-delivery]: Reese graded the AC against the merged HEAD `fe50d415` — 7 MET, 2 UNMET, 0 UNGRADEABLE across the 9 machine criteria; AC-7 routed to human verification. Both UNMET (AC-9, AC-10) are the documentation sweeps the plan assigns to PR 2. Report at `.prism/qa/ac-verification-prism-477-followup-codex-hooks.md`.
- 2026-09-08 [huntermcgrew/codex-hook-delivery]: Scoped AC-9 and AC-10 to PR 2 as `proposed` adjustments and moved their `## Review Issues` entries to `deferred`; PR #487's own scope is unchanged and it merges before the probe. Merged this plan's task 8 probe and PR 2 docs with issue-488's B5 and B6 into one probe session and one docs PR, and routed Clove's doctor git-gates gap to issue-488 B4; see Decisions.
- 2026-09-08 [huntermcgrew/codex-hook-delivery]: Reese re-checked every machine criterion from scratch at `4189b9d1` — verdicts unchanged at 7 MET, 2 UNMET, 0 UNGRADEABLE; `pnpm prism:check` exit 0 (914 tests, 912 pass, 0 fail) and a fresh live probe against the real Codex template. New: two AC-9 hit sites (`ADR-0076:87`, `docs/ai-skills/compatibility.md:83`) that arrived from main in the merge and that no PR-2 task names — see the AC-9 Review Issues entry.
- 2026-09-08 [huntermcgrew/codex-hook-delivery]: Clove found zero `open` entries in `## Review Issues` on the needs-fix dispatch for lane pr-487 — the two `deferred` entries (AC-9, AC-10) are correctly out of PR #487's scope per the two-PR-stack Decision, and their AC Adjustments stay `proposed`, awaiting Hunter's accept per `plan-authoring.md` § Acceptance Criteria Format. No source change made. `pnpm prism:check` exits 0 (914 tests, 912 pass, 2 skipped) at unchanged HEAD `bef653f5`.
- 2026-09-08 [huntermcgrew/codex-hook-delivery]: Fixed Briar's second Major — `checkHookRegistration`'s per-host stale-registration return was dropping the dead-registration loop and the other host's own findings. Dropped both remaining early returns so every push in the function is additive, and updated one pre-existing test whose fixture had been relying on the old suppression as its expected shape. `pnpm prism:check` is green (916 tests, 914 pass, 2 skipped) at HEAD `9a2c55dd`.
- 2026-09-08 [huntermcgrew/codex-hook-delivery]: Briar self-review pass 2 found one new open major — `checkHookRegistration`'s own JSDoc still says the runtime "delivers only when `claude` is among" `hosts`, contradicting the function's own dual-host gate four lines below and untracked by AC-9's grep. `pnpm prism:check` remains green (916 tests, 914 pass, 2 skipped) at unchanged HEAD `2db7a19b`.
- 2026-09-08 [huntermcgrew/codex-hook-delivery]: Fixed Briar's third Major — rewrote `checkHookRegistration`'s JSDoc to name the dual-host gate (`claude` OR `codex`) instead of `claude` alone, matching the function body it sits above. `pnpm prism:check` is green (916 tests, 914 pass, 2 skipped).
- 2026-09-08 [huntermcgrew/codex-hook-delivery]: Briar self-review pass 3 found one new open major — `checkHookRegistration`'s "installed and registered" messages fire on a host whose file registers only `git-gates.mjs`, not `hook.mjs` (confirmed by direct repro on Codex, and via the shared `registeredPaths` set leaking a sibling host's registration on Claude). `pnpm prism:check` green in a fresh worktree (916 tests, 914 pass, 2 skipped) at unchanged HEAD `e0d4091e`.
- 2026-09-08 [huntermcgrew/codex-hook-delivery]: Fixed Briar pass 3's open major — added per-host `claudeRegisteredPaths`/`codexRegisteredPaths` sets and gated `hookInert`, `gitGatesInert`, and all four "installed and registered" checks on the registering host's own set instead of the merged cross-host set. Added two tests covering both repro scenarios from the finding. `pnpm prism:check` is green (918 tests, 916 pass, 2 skipped).
- 2026-09-08 [huntermcgrew/codex-hook-delivery]: Briar self-review pass 4 found zero new issues — traced `checkHookRegistration`'s full control flow against the four previously-fixed bug shapes and confirmed each holds; ran `pnpm prism:check` from a fresh `pnpm install --frozen-lockfile` (918 tests, 916 pass, 2 skipped, all gates green). Confirmed the PR's Windows CI failure is the known pre-existing `git-gates.test.ts` nested-repo case from main (fixed by PR #491), not a regression; ubuntu CI is green.
- 2026-09-08 [huntermcgrew/codex-hook-delivery]: Fixed Eric's PR-review pass 1 (1 Major, 2 Minors): `refreshHookRuntime`'s JSDoc named only the Claude registration file — rewrote to name both `.claude/settings.json` and `.codex/hooks.json` and both templates. `doctor.ts`'s dead-registration warning named no source file — now names whichever of `.claude/settings.json` / `.codex/hooks.json` (or both) carries the dangling command. Added `emitAllow` shape tests for both Claude and Codex to `hook-gate.test.ts`, mirroring the existing `emitDeny` test. Also restructured the PR body onto `pr-description.md`'s canonical template (Summary/What/Why/How/Notes/Ticket/Type of Change), fixing the carried-over Minor. `pnpm prism:check` is green from a fresh `pnpm install --frozen-lockfile` (920 tests, 918 pass, 2 skipped).
- 2026-09-08 [huntermcgrew/codex-hook-delivery]: Fixed Eric's PR-review pass 2 (1 Major, 2 Minors). The Major: independently verified at OpenAI's hooks docs that Codex does document `PostCompact` (the plan's Decision had claimed otherwise); added the registration to `templates/install/.codex/hooks.json` with no code change needed, and corrected the Decision and two other plan-prose spots. Minors: reworded the `HarnessSpec` JSDoc's `emitDeny` null-return rule to "neither documented nor observed," and deleted a changelog-voice clause from `doctor.ts:916`. `pnpm prism:check` is green from a fresh `pnpm install --frozen-lockfile` (920 tests, 918 pass, 2 skipped).
- 2026-09-08 [huntermcgrew/codex-hook-delivery]: Fixed Eric's PR-review pass 3 (0 Majors, 3 Minors). Gated the Codex "installed and registered" info line on a new `codexGitGatesInert` check, mirroring the Claude arm's existing guard. Replaced both `.claude/settings.json`/`.codex/hooks.json` JSON-parse early returns with per-host `claudeParseFailed`/`codexParseFailed` flags so a parse failure on one host no longer suppresses the other host's findings. Extended `hook-gate.test.ts`'s `assertAdoptedConsumerState` and its negative control to assert the real Codex template's event keys, matcher, and git-gates group. `pnpm prism:check` is green from a fresh `pnpm install --frozen-lockfile` (923 tests, 921 pass, 2 skipped).

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
- **Status:** `deferred`
- **File:** `templates/install/.prism/architect/_toolkit/install-layout.md:121`
- **Problem:** the line says "The hook announces; it never blocks" directly above the same file's § Write gate, which describes blocking. `checkSeedDrift` never compares curated content, so no gate catches it.
- **Suggested fix:** task 12.
- **Deferred to:** PR 2, task 12. The fix is a curated-seed doc edit the plan assigns to PR 2, which is sequenced behind task 8's probe; PR 1 carries no documentation changes by design. Reopens as `fixed` when task 12 lands. Graded by AC-10, adjusted to PR 2 scope in `### AC Adjustments`.

### AC-9 UNMET — documents still claim hook enforcement reaches Claude Code alone

- **Severity:** `major`
- **Status:** `deferred`
- **File:** `.prism/rules/context-reuse.md:30`, `.prism/architect/_toolkit/install-layout.md:145` and `:159`, `docs/ai-skills/compatibility.md:17` `:69` `:73` `:83`, `AGENTS.md:858`, `templates/install/.prism/architect/_toolkit/install-layout.md:121` and `:135`, `templates/install/.prism/rules/context-reuse.md:30`, plus the `.claude/` `.codex/` `.cursor/` build mirrors of each
- **Criterion (verbatim):** AC-9 — No document still claims hook enforcement reaches Claude Code alone.
- **Procedure:** ran the Evidence sub-bullet's own command verbatim from the repo root — `grep -rn "Claude Code only" . --exclude-dir=node_modules --exclude-dir=.git`, exit 0. Run at `fe50d415` (first pass) and re-run from scratch at `4189b9d1` (re-check); same verdict both times.
- **Expected vs observed:** expected "only Cursor-scoped statements and ADR-0074's frozen `## Context` narration"; observed 30 lines at `fe50d415` and 62 at `4189b9d1`, including `.prism/rules/context-reuse.md:30` — "It reaches Claude Code only, it is friction rather than a wall…" — which is one of the two sites the criterion's own positive control names. `scripts/ai-skills/doctor.ts:812`, the other named control site, is clear; its current message at `doctor.ts:984` names the string only as a `§` citation into `compatibility.md`, whose heading at `:69` is itself still a hit. Most of the growth between the two passes is the first pass's own report and Review-Issues entries quoting the string — records of the failure, not instances of the claim.
- **Two sites no PR-2 task names:** `.prism/spec/adrs/_toolkit/0076-commit-and-push-gates-are-harness-hooks.md:87` and `docs/ai-skills/compatibility.md:83` both arrived from `origin/main` in the `fe50d415` merge (PRISM-488 Phase A, commit `972c7757`) and are untouched by this branch — `git diff --name-only origin/main...HEAD` matches neither. Both say the git gates reach Claude Code only, which this branch's own Decision ("Codex also registers and claims `git-gates.mjs`") makes false at this HEAD. Observation, not a prescribed fix: as tasks 9–14 are written, running them verbatim would leave AC-9's grep still returning these two lines.
- **Evidence type:** `executed`
- **Report:** `.prism/qa/ac-verification-prism-477-followup-codex-hooks.md` § AC-9 (including § Re-check delta at `4189b9d1`)
- **Deferred to:** PR 2, tasks 11–14. Every site listed above is an assigned PR 2 edit, and PR 2 is sequenced behind task 8's probe — the grade is correct and PR 1 was never expected to satisfy it. Reopens as `fixed` when the criterion's own grep comes back clean on the PR 2 branch. The criterion keeps its text and its command; only its grading scope moved, as a `proposed` adjustment in `### AC Adjustments` awaiting Hunter's accept.

### `checkHookRegistration`'s per-host stale-registration return silently drops every other finding

- **Severity:** `major`
- **Status:** `fixed`
- **File:** `scripts/ai-skills/doctor.ts:883` (the `if (findings.length > 0) { return findings; }` right after the two per-host stale-registration checks at `:867` and `:875`)
- **Problem:** the same shape as the "dead-registration early return silently drops the inert-runtime warning" entry above, one early return later in the same function. When either per-host stale-registration warning fires (`hosts` dropped `claude` or `codex` while that host's registration file still carries a PRISM entry), the function returns immediately — before the dead-registration loop and before the per-host reachability/`describeGitGates` checks run for the *other*, still-declared host. Confirmed with a manual repro against the built function: `hosts: ["claude"]`, a valid runtime and a correctly registered `.claude/settings.json` entry, plus a leftover `.codex/hooks.json` registration from before `codex` was dropped from `hosts`. Expected both the codex-stale warning and the "installed and registered for Claude Code" info; observed only the codex-stale warning. A second repro swaps the healthy Claude registration for a dead one (points at a `hook.mjs` not on disk): the dead-registration warning is swallowed by the same early return too, so a consumer with a genuinely broken Claude hook gets no warning about it, only the unrelated codex message. No test in `doctor.test.ts` combines a per-host stale-registration warning with a second, independent finding for the other host — the new Codex tests each construct a single-finding scenario, so nothing caught this.
- **Fixed in:** dropped both early returns — the `if (findings.length > 0) return findings;` at line 883 and the `return findings;` inside the `!hosts.includes("claude") && !hosts.includes("codex") && runtimeIsPrisms` branch above it — so the runtime-stale and per-host stale-registration pushes are additive, and the dead-registration loop plus the per-host reachability/`describeGitGates` checks always run afterward. Added two tests mirroring the sibling fix's "neither suppresses the other" shape for this branch: `hosts: ["claude"]` with a healthy Claude delivery plus a leftover Codex registration (asserts both the stale-codex warning and the Claude "installed and registered" info survive), and the same Codex leftover paired with a dead Claude registration (asserts both the stale-codex warning and the dead-registration warning survive). One pre-existing test (`"...PRISM's registration is still in settings"`) was pinning the old suppression as its expected shape — its fixture (no runtime file on disk at all) makes the registration genuinely both stale and dead under the fixed code, so its assertion now checks for both real findings instead of asserting exactly one.

### AC-10 UNMET — the curated seed twin still contradicts itself on whether the hook blocks

- **Severity:** `minor`
- **Status:** `deferred`
- **File:** `templates/install/.prism/architect/_toolkit/install-layout.md:121`
- **Criterion (verbatim):** AC-10 — The curated seed twin no longer contradicts itself about whether the hook blocks.
- **Procedure:** ran the Evidence sub-bullet's own command verbatim — `grep -n "never blocks" templates/install/.prism/architect/_toolkit/install-layout.md`, exit 0. Run at `fe50d415` (first pass) and re-run from scratch at `4189b9d1` (re-check); same single match both times.
- **Expected vs observed:** expected the grep to return nothing; observed one match at line 121 — "The hook announces; it never blocks. … Delivery reaches Claude Code only: no install path writes a Cursor or Codex settings file today." That is the exact line the criterion's positive control names as the pre-change state, so the file is unchanged on this axis. Same site as the open `minor` entry above.
- **Evidence type:** `executed`
- **Report:** `.prism/qa/ac-verification-prism-477-followup-codex-hooks.md` § AC-10
- **Deferred to:** PR 2, task 12 — the same site (`templates/install/.prism/architect/_toolkit/install-layout.md:121`) and the same disposition as the `Curated seed twin contradicts itself` entry above, which grades as this criterion. Reopens as `fixed` when the criterion's grep returns nothing on the PR 2 branch. Grading scope moved as a `proposed` adjustment in `### AC Adjustments`, awaiting Hunter's accept.

### `checkHookRegistration`'s own JSDoc still claims delivery gates on `claude` alone

- **Severity:** `major`
- **Status:** `fixed`
- **File:** `scripts/ai-skills/doctor.ts:772` and `:779` (the JSDoc directly above `checkHookRegistration`)
- **Problem:** the comment block says "`refreshHookRuntime` delivers only when `claude` is among them — so a consumer who does not run Claude Code should have no runtime and no registration" and "Removing both halves is silent for a consumer who runs Claude Code." Both sentences contradict this PR's own "Runtime delivery gates on claude OR codex" Decision, which the function body four lines below the comment implements: a `hosts: ["codex"]` consumer — who does not run Claude Code — does get the runtime and a `.codex/hooks.json` registration, and the same silent-removal argument applies just as much to a Codex-only consumer. Neither sentence contains the literal string "Claude Code only", so AC-9's grep (`grep -rn "Claude Code only" .`) does not catch it and no PR-2 task names this site — it is untracked. Same class of stale-predicate drift as `code-standards.md § Removal and rename completeness` describes, in the same file and the same PR as the code it now contradicts.
- **Fixed in:** rewrote both sentences in `checkHookRegistration`'s JSDoc — "delivers the runtime when either `claude` or `codex` is among them" replaces the `claude`-only phrasing, and the silent-removal sentence now names "a consumer who runs Claude Code or Codex," matching the function body's actual dual-host gate.

### `checkHookRegistration`'s "installed and registered" message doesn't verify the specific host registers `hook.mjs` — it registers false confidence

- **Severity:** `major`
- **Status:** `fixed`
- **File:** `scripts/ai-skills/doctor.ts:842-845` (`claudeIsRegistered` / `codexIsRegistered`), `:922` (`hookInert`), `:946` and `:961-972` (the two info messages)
- **Problem:** `claudeIsRegistered` and `codexIsRegistered` only confirm that *some* PRISM-owned command exists in that host's registration file — `PRISM_HOOK_COMMAND_PATTERN` and `PRISM_CODEX_HOOK_COMMAND_PATTERN` both match `hook.mjs` **or** `git-gates.mjs` commands (the `(?:hook|git-gates)\.mjs` group). Neither flag confirms `hook.mjs` specifically is registered for that host. Two confirmed false positives follow:
  1. **Cross-host:** `registeredPaths` (populated at `:792`, added to from both `.claude/settings.json` at `:811` and `.codex/hooks.json` at `:831`) is one Set shared across hosts. The Claude "installed and registered" check at `:946` is `registeredPaths.has(hookRuntimePath) && claudeIsRegistered` — but `registeredPaths.has(hookRuntimePath)` goes true if *either* host's file names `hook.mjs`, and `claudeIsRegistered` goes true if Claude's file names *either* `hook.mjs` or `git-gates.mjs`. So a consumer with `hosts: ["claude", "codex"]` whose `.claude/settings.json` registers only `git-gates.mjs` (the `hook.mjs` groups hand-removed) and whose `.codex/hooks.json` correctly registers `hook.mjs` gets told "The hook runtime is installed and registered for Claude Code" — while Claude's own write-gate/announce hook never actually fires. `hookInert` (`:922`) is suppressed the same way, so no warning fires either.
  2. **Same-host:** independent of any cross-host mixing, `codexIsRegistered` alone gates the Codex branch (`:961`, `:968`) with no check that the registered command is `hook.mjs` rather than `git-gates.mjs`. A `hosts: ["codex"]` consumer whose `.codex/hooks.json` registers only `git-gates.mjs` gets "The hook runtime is installed and registered for Codex" even though `hook.mjs` is unregistered for Codex.
  - Both reproduced against the built function: repro 1 (`hosts: ["claude","codex"]`, Claude's settings.json carrying only a `git-gates.mjs` `PreToolUse` entry, Codex's `hooks.json` correctly registering `hook.mjs`) returns `"The hook runtime is installed and registered for Claude Code."` with no warning. Repro 2 (`hosts: ["codex"]`, `.codex/hooks.json` registering only `git-gates.mjs`) returns `"The hook runtime is installed and registered for Codex."` with no warning. Neither scenario is covered by any test in `doctor.test.ts` — the new Codex tests each construct a fixture where the same file registers or omits `hook.mjs` outright, never a fixture that registers `git-gates.mjs` without `hook.mjs` on the same or the other host's file.
  - This is the fourth instance of the "a coarse existence check stands in for a specific-registration check" bug shape in this same function this session (the prior three suppressed a finding; this one fabricates one) — doctor's entire purpose for this check is to catch exactly this class of drift, and this scenario is squarely inside what `install-layout.md` § Hook-runtime ownership and recovery describes as a known, expected category (a consumer's hand-edited or partially-reverted registration).
- **Suggested fix:** track each host's own resolved registration paths separately from the shared `registeredPaths` set used by the (correctly host-agnostic) dead-registration loop — e.g. a `claudeRegisteredPaths`/`codexRegisteredPaths` pair populated the same way, and gate `hookInert` and both "installed and registered" messages on `claudeRegisteredPaths.has(hookRuntimePath)` / `codexRegisteredPaths.has(hookRuntimePath)` instead of the merged set combined with the coarse `claudeIsRegistered`/`codexIsRegistered` flags.
- **Fixed in:** added `claudeRegisteredPaths` and `codexRegisteredPaths`, populated alongside (not instead of) the shared `registeredPaths` set as each host's file is parsed — the shared set still feeds the host-agnostic dead-registration loop unchanged. `hookInert` (`:931`) and the Claude "installed and registered" gate (`:955`) now check `claudeRegisteredPaths.has(hookRuntimePath)` directly; the Codex arm (`:970`, `:977`) checks `codexRegisteredPaths.has(hookRuntimePath)` instead of the coarse `codexIsRegistered` flag. Applied the identical fix to `gitGatesInert` (`:942`) and the `describeGitGates` gate (`:964`), which shared the exact same cross-host-leak shape for `git-gates.mjs` one line away — leaving those unfixed would have been the fifth instance of the same bug shape in this function. `claudeIsRegistered`/`codexIsRegistered` stay as they are (`:876`, `:884`) — those two checks are legitimately coarse: "is any PRISM entry, of either kind, still present on a host just dropped from `hosts`" is correct regardless of which entry point it names. Added two tests reproducing both repro scenarios from the finding (`hosts: ["claude","codex"]` with Claude's file naming only `git-gates.mjs`; `hosts: ["codex"]` with Codex's file naming only `git-gates.mjs`), asserting the false "installed and registered" message is gone and the correct `hookInert`-for-that-host warning fires instead.

### No issues found — 2026-09-08 [huntermcgrew/codex-hook-delivery] (pass 4)

Traced `checkHookRegistration`'s complete control flow against the four previously-fixed bug entries above and found each holding on the current code: `claudeRegisteredPaths`/`codexRegisteredPaths` are used only by their own host's branch, `registeredPaths` (merged) is used only by the intentionally host-agnostic dead-registration loop, no early return suppresses a sibling finding, and both rewritten JSDoc/message sites name the actual dual-host gate. Cross-checked `harnesses.mjs` (deny/allow envelope shape, `toolKinds` additions), `update.ts` (`refreshHookRuntime`'s split host gate, the generalized `mergeHookRegistration` seam), the new `templates/install/.codex/hooks.json` template, and `verify-pack-parity.ts`'s new entry — all consistent with the plan's Decisions. Cross-checked the new/updated tests in `doctor.test.ts`, `update.test.ts`, and `hook-gate.test.ts` against the specific scenarios the four prior fixes and the seven Clove tasks claim to cover — each asserts the specific finding it was written for, not just a coarse presence check. `pnpm prism:check` green from a fresh `pnpm install --frozen-lockfile` (918 tests, 916 pass, 2 skipped, types/manifest/crossref/spec-scope/ship-closure/verify-pack all pass). PR CI: ubuntu green; Windows red only on the pre-existing `git-gates.test.ts` nested-repo case inherited from `main` (fix incoming in PR #491), not a regression this diff introduced.

The two `deferred` entries above (AC-9, AC-10) and their `proposed` AC Adjustments are unchanged by this pass — still correctly scoped to PR 2 per the plan's two-PR-stack Decision, awaiting Hunter's acceptance at the merge gate.

#### Angle Coverage

- Runtime behavior — swept — 6 items enumerated, 6 verdicts (`HARNESSES.codex.emitDeny`, `HARNESSES.codex.emitAllow`, `HARNESSES.codex.toolKinds`, `refreshHookRuntime`'s split host gate, the `mergeHookRegistration`/`mergeHookCodexRegistration` seam, `checkHookRegistration`'s full body — all correct as executed)
- Test efficacy — swept — 5 items enumerated, 5 verdicts (Codex deny envelope shape + exit-0; `resolveListedToolKind` Codex table; `mergeHookCodexRegistration` merge/idempotent/fresh-consumer; `refreshHookRuntime` host-gate split across codex-only/drop-claude/drop-codex/drop-both; the four `checkHookRegistration` cross-host-leak regression tests — each fails if its specific behavior regresses, none is a coarse presence check)
- Spec and doc consistency — swept — 10 items enumerated, 10 verdicts (AC-1 through AC-8 hold against the current diff and tests; AC-9 and AC-10 correctly `deferred` to PR 2 per the plan's own Decision, not a new gap)
- Citation integrity — swept — spot-checked plan-cited line numbers in `doctor.ts` (`:772`, `:812`) against the current file; line drift from the sequential Clove fix passes is expected churn, not a citation error
- External-system claims — swept — 1 item enumerated, 1 verdict (the Codex `PreToolUse` deny/allow envelope is labeled "documentation-verified, not live-probed" in both the code comment and the plan's own Decision, correctly hedged rather than asserted as measured)
- Repo writing rules — swept — verdict-only (comments follow what+why with no tags/ALL-CAPS/changelog-voice; no stray console.log or debug artifact in the diff)
- Security — swept — 2 items enumerated, 2 verdicts (the deny arm's fail-open property under exit-0 is asserted by test, not just claimed; `Edit`/`Write` additions to `toolKinds` correctly widen what the deny arm can fire on rather than narrow it)
- Docs impact — not reached — structural: the doc sweep (`install-layout.md`, `compatibility.md`, `AGENTS.md`, `context-reuse.md`) is explicitly scoped to PR 2 by the plan's two-PR-stack Decision; PR 1 carries no doc changes by design, and nothing in a later self-review pass on this branch changes that
- Accessibility — n/a — no UI in the diff (CLI/build-script backend only)

### `refreshHookRuntime`'s JSDoc still describes Claude-only delivery

- **Severity:** `major`
- **Status:** `fixed`
- **File:** `scripts/ai-skills/update.ts:1283-1295`
- **Problem:** the JSDoc said the function "merges its registration into the consumer's `.claude/settings.json`" and grounded the whole reason-for-existing in `templates/install/.claude/settings.json` alone. As of this PR the function merges two registrations from two templates, and on a `hosts: ["codex"]` consumer the Claude half never runs at all — the same stale-predicate class Briar caught on `checkHookRegistration`'s JSDoc and Clove fixed earlier on this branch, one function away in this same PR.
- **Fixed in:** rewrote both paragraphs to name `.claude/settings.json` and `.codex/hooks.json`, and both templates under `templates/install/`, with no behavior change.

### Dead-registration warning no longer names the file to repair

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `scripts/ai-skills/doctor.ts:905`
- **Problem:** `main`'s message named the file (".claude/settings.json registers a hook command pointing at X"); generalizing the loop over both hosts dropped the attribution instead of widening it. A dual-host consumer got "A hook registration points at X" with two candidate files to hunt through.
- **Fixed in:** derived the source file(s) from the existing `claudeRegisteredPaths`/`codexRegisteredPaths` sets and named them in the message — `.claude/settings.json`, `.codex/hooks.json`, or both when the same dead path is registered on each.

### `emitAllow` has no shape assertion — `emitDeny` gained one in the same commit

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `scripts/ai-skills/hooks/harnesses.mjs:221` (test added in `scripts/ai-skills/hook-gate.test.ts`)
- **Problem:** nothing in `scripts/ai-skills/` asserted an `emitAllow` envelope for any harness — a typo in `hookEventName` or `permissionDecisionReason` would fail nothing and silently drop the git-gates fail-open announcement.
- **Fixed in:** added `HARNESSES.claude.emitAllow` and `HARNESSES.codex.emitAllow` deep-equal tests to `hook-gate.test.ts`, mirroring the shape of the existing `emitDeny` test.

### PR body does not follow `pr-description.md` § Structure

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** not file-anchored — the PR #487 body.
- **Problem:** carried over from the 2026-09-02 review round — content was accurate but the body skipped the required headings (`## Summary`, `## What did you do?`, `## Why did you do it?`, `## How did you achieve it?`, `## Ticket`, `## Type of Change` + checklist).
- **Fixed in:** restructured the body onto the canonical template via `gh api ... -X PATCH -F body=@file.md`, preserving all existing content (problem statement, the merge-with-main summary, and the PR-2 stack note) under the correct headings.

### Codex registers only two of Codex's three documented hook events

- **Severity:** `major`
- **Status:** `fixed`
- **File:** `templates/install/.codex/hooks.json:23` (plan Decision "Two events only")
- **Problem:** the plan's Decision claimed "Codex documents no `PostCompact` event." OpenAI's hooks documentation lists `PostCompact` and describes it running "after Codex compacts the chat." Without the registration, a Codex session's announce-once state never reset after a compaction, so the write gate could let a write through on a doc the model could no longer see across a compaction boundary.
- **Fixed in:** added a `PostCompact` entry to `templates/install/.codex/hooks.json` (no `matcher`, matching Codex's own non-tool-event examples and the Claude template's shape) pointing at `node ".claude/hooks/hook.mjs" --tool=codex --event=PostCompact`. No code change — `runPostCompactArm` already reads `session_id`/`cwd` directly with no host branching, `main()` routes the event before the harness spec is used, and `PRISM_CODEX_HOOK_COMMAND_PATTERN` already matches the command string. Corrected the plan Decision's root cause and the two other prose spots repeating the same wrong claim.

### `HarnessSpec` JSDoc still describes `emitDeny`'s null-return rule by the pre-Codex bar

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `scripts/ai-skills/hooks/harnesses.mjs:34`
- **Problem:** the doc comment said `emitDeny` "returns `null` on a host whose deny envelope nobody has observed," while the Codex row 150 lines below returns a real envelope nobody has observed live — only documentation-verified. The sentence stated the old bar (observed) rather than the one the code actually applies (documented or observed).
- **Fixed in:** reworded to "neither documented nor observed," with a clause naming why a documented envelope clears the bar (the asymmetric fail-open argument already used on the Codex row).

### Changelog-voice clause in doctor.ts's per-host comment

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `scripts/ai-skills/doctor.ts:916`
- **Problem:** "mirroring the pre-Codex shape, where the per-host block ran unconditionally rather than being gated on the dead-registration loop above" describes the commit, not the current invariant — `code-comments.md` § Not Allowed.
- **Fixed in:** deleted the clause; the surrounding sentences already state the current invariant and its reason without it.

### Codex "installed and registered" info line has no git-gates-inert guard, unlike its Claude twin

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `scripts/ai-skills/doctor.ts:984` (the Codex `else if` in `checkHookRegistration`)
- **Problem:** the Claude arm withholds "The hook runtime is installed and registered for Claude Code" when `gitGatesInert` is true — added in this PR (see the Decision "Codex also registers and claims git-gates.mjs" above). The Codex arm's twin message had no matching guard, so a `hosts: ["codex"]` consumer whose `.codex/hooks.json` registers `hook.mjs` but not `git-gates.mjs` got told the runtime is cleanly installed and registered while its git gates never fire — the same false clean-bill the Claude-side fix already closed, one arm over.
- **Fixed in:** added `codexGitGatesInert`, computed the same way as `gitGatesInert`, and gated the Codex info push on `!codexGitGatesInert`. No new Codex-specific git-gates info or warning message added — that stays deferred to issue-488 B4 per the plan Decision "Doctor's Codex git-gates reach lines belong to issue-488 B4." Added `runDoctor withholds the Codex reach line when Codex's git gates are inert` to `doctor.test.ts`, and adjusted the pre-existing cross-host-leak test's Codex fixture to also register `git-gates.mjs` so it keeps testing the leak it was written for rather than tripping the new guard.

### `.codex/hooks.json` parse failure drops every downstream check, mirroring the pre-Codex settings.json bug

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `scripts/ai-skills/doctor.ts:824` and `:806` (both JSON-parse `catch` blocks in `checkHookRegistration`)
- **Problem:** a malformed `.claude/settings.json` or `.codex/hooks.json` returned immediately with only the "not valid JSON" finding, skipping the dead-registration loop, both per-host reachability checks, the stale-registration warnings, and `describeGitGates` — for both hosts, not just the one whose file failed to parse. A dual-host consumer with a stray comma in one file learned nothing about the other host's delivery.
- **Fixed in:** replaced both early returns with `claudeParseFailed`/`codexParseFailed` flags — the catch block pushes the error finding and sets its host's flag instead of returning, and the two per-host arms gate on `!claudeParseFailed` / `!codexParseFailed` in addition to their existing `hosts.includes(...)` check, so a parse failure is reported as itself rather than silently read as "genuinely unregistered." The dead-registration loop and stale-registration checks were already unaffected (they read `registeredPaths`/`claudeIsRegistered`/`codexIsRegistered`, which stay empty/false on a parse failure regardless). Added `runDoctor reports a .codex/hooks.json that is not valid JSON` and `runDoctor's settings.json parse failure does not suppress Codex's own findings` to `doctor.test.ts`; scoped the pre-existing settings.json-parse-failure test to `hosts: ["claude"]` so its single-message assertion still isolates the one host it tests.

### Real Codex template unguarded by any test — the Claude twin has one

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `templates/install/.codex/hooks.json:34`
- **Problem:** nothing asserted the real Codex template's contents — not the `PostCompact` block pass 2's Major added, nor the `git-gates.mjs` entry this branch's merge with `main` added. `hook-gate.test.ts`'s `assertAdoptedConsumerState` (the cold-start leg's end-to-end guard against the packed tarball) checked only the Claude side; `update.test.ts`'s `PRISM_CODEX_HOOKS` fixture is hand-written and carries neither block, so it can't stand in.
- **Fixed in:** extended `assertAdoptedConsumerState` to read the adopted consumer's real `.codex/hooks.json` and assert all three event keys, that the `PreToolUse` matcher selects `apply_patch`/`Edit`/`Write`/`Bash`, and that the `git-gates.mjs` entry is its own matcher group distinct from the write-tool entry. Extended the existing negative control the same way — breaking `.codex/hooks.json` to `{hooks:{}}` and restoring it, mirroring the pre-existing `.claude/settings.json` break/restore. This leg is `npm pack`-based and skipped on Windows (`skipColdStartOnWindows`), so the new assertions guard the template on the ubuntu CI leg only.

---

## Cleanup Items

---

## PR Readiness

- [x] No critical or major issues — the two `deferred` PR-2 items (AC-9, AC-10) are correctly out of PR #487's scope per the two-PR-stack Decision.
- [x] Types correct — no `any`, no unsafe `as`
- [x] No stray console.logs or debug artifacts
- [x] Tests written for new logic and edge cases — three new `doctor.test.ts` cases cover pass 3's two Minors, plus the cold-start leg's `assertAdoptedConsumerState` now guards the real Codex template
- [x] All debugged issues resolved (no `open` entries)
- [x] Build passes — last run: 2026-09-08 (Clove, fresh worktree: `pnpm prism:check` end to end)
- [x] PR description up to date — restructured onto `pr-description.md`'s canonical template
- [ ] Lasting decisions promoted to architect context (if applicable) — deferred to plan close, after PR 2 and task 8's probe

**Last updated:** 2026-09-08 [huntermcgrew/codex-hook-delivery] — Clove fixed Eric's PR-review pass 3 (0 Majors, 3 Minors): the Codex "installed and registered" info line now withholds its clean-bill claim when Codex's own git gates are inert, mirroring the Claude arm's existing guard; a malformed `.claude/settings.json` or `.codex/hooks.json` now reports its own parse error without suppressing the other host's findings; and the cold-start leg's `assertAdoptedConsumerState` now asserts the real Codex template's three event keys, matcher, and git-gates group instead of leaving them unguarded. `## Review Issues` carries zero `open` entries. AC-9/AC-10 remain `deferred` to PR 2, unchanged by this pass. PR CI: ubuntu green, Windows red only on the known pre-existing `git-gates.test.ts` failure inherited from `main` (PR #491 fixes it), not a regression.
