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
- **Status:** `open`
- **File:** `scripts/ai-skills/doctor.ts:772` and `:779` (the JSDoc directly above `checkHookRegistration`)
- **Problem:** the comment block says "`refreshHookRuntime` delivers only when `claude` is among them — so a consumer who does not run Claude Code should have no runtime and no registration" and "Removing both halves is silent for a consumer who runs Claude Code." Both sentences contradict this PR's own "Runtime delivery gates on claude OR codex" Decision, which the function body four lines below the comment implements: a `hosts: ["codex"]` consumer — who does not run Claude Code — does get the runtime and a `.codex/hooks.json` registration, and the same silent-removal argument applies just as much to a Codex-only consumer. Neither sentence contains the literal string "Claude Code only", so AC-9's grep (`grep -rn "Claude Code only" .`) does not catch it and no PR-2 task names this site — it is untracked. Same class of stale-predicate drift as `code-standards.md § Removal and rename completeness` describes, in the same file and the same PR as the code it now contradicts.
- **Suggested fix:** rewrite the paragraph to say delivery gates on `claude` OR `codex`, matching `refreshHookRuntime`'s actual gate, and extend the silent-removal argument to a consumer running either host.

---

## Cleanup Items

---

## PR Readiness

- [ ] No critical or major issues — one open major: `checkHookRegistration`'s own JSDoc contradicts the code four lines below it
- [x] Types correct — no `any`, no unsafe `as`
- [x] No stray console.logs or debug artifacts
- [x] Tests written for new logic and edge cases — the two new "neither suppresses the other" cases cover the per-host stale-registration branch
- [x] All debugged issues resolved (no `open` entries)
- [x] Build passes — last run: 2026-09-08 (Briar self-review pass 2: `pnpm prism:check` end to end — types, 916 tests (914 pass, 2 skipped), `prism:verify-manifest`, `prism:crossref-lint`, `prism:spec-scope-lint`, `prism:ship-closure`, `prism:verify-pack` all green)
- [ ] PR description up to date
- [ ] Lasting decisions promoted to architect context (if applicable) — deferred to plan close, after PR 2 and task 8's probe

**Last updated:** 2026-09-08 [huntermcgrew/codex-hook-delivery] — Briar self-review pass 2 over the full PR diff against `origin/main`: `pnpm prism:check` green (916 tests, 914 pass, 2 skipped), found one new major (stale JSDoc on `checkHookRegistration`, untracked by AC-9's grep), added it `open` to `## Review Issues`. AC-9/AC-10 remain scoped to PR 2 with their entries `deferred`, unchanged by this pass.
