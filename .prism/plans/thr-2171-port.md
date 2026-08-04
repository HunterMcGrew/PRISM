# Plan: thr-2171-port

## Ticket

No PRISM tracker ticket. Ports `TracTru/thrive` PR #2262 (THR-2171, "Generalize the architect-context hook to Codex and Cursor"), read at 20 files / +2385 −665 while open. Thrive is the reference implementation, not the source of truth — PRISM's hook has a different internal shape and a different runtime, and both differences are load-bearing.

## Goal

Give Codex and Cursor sessions the same "an architect doc governs this path and you haven't read it" nag Claude Code sessions already get, by replacing PRISM's single Claude adapter with a harness table that costs one row per additional host.

---

## Dependency on `lane-hook-fix` — read this before starting

This plan does not start until task 18 of [`context-delivery-mechanism.md`](./context-delivery-mechanism.md) lands on `main`. That lane runs on branch `huntermcgrew/hook-adherence-ab-harness`.

**What this plan inherits from it, and must not re-derive:**

- **`resolveArchitectDoc` returns a nag, not a body.** Task 18 step 3 re-shapes the payload to name unread matched doc paths and inject no doc bodies. Every harness row here emits that nag string; no row formats a doc.
- **State is keyed on an observed effect.** Task 18 step 2 replaces credit-on-emission with credit-on-read: a doc counts as delivered only once a later real `Read` of that doc's own path is seen. The multi-harness state changes in this plan (task 4) sit on top of that keying, not beside it.
- **The byte-cap machinery is gone or inert.** `MAX_DOC_INJECTION_BYTES`, `truncateToByteLimit`, and `formatInjectionSection` exist to cap doc bodies. Task 18 removes the bodies, so anything still standing there is dead weight this plan does not resurrect for a second harness.
- **ADR-0071's Decision section and byte-cap Consequence are already corrected** by task 18 step 4. This plan appends a harness section to that ADR; it does not re-litigate those two framings.

**Why the sequencing is not optional:** porting the pre-fix resolver shape into a three-harness table means fixing the same defect three times, in three envelopes, after the table has already frozen the wrong contract into its tests. The defect is not cosmetic — see `## Decisions` § "The 2 KB ceiling is the design constraint".

**If task 18 has not landed when this plan opens**, stop and say so rather than starting on the current `main` shape.

---

## What Thrive's PR settled, and what it did not

Thrive ran a live Cursor probe. Its findings are facts about the *host*, so they transfer to PRISM; its findings about *its own command form* do not, because Thrive ships `.mjs` and PRISM ships TypeScript.

**Retired — do not re-derive:**

| Unknown | Thrive's answer | Evidence |
| --- | --- | --- |
| Cursor's read tool name | `Read` | `HARNESSES.cursor.toolKinds` maps `Read: "read"` |
| Cursor's file-path field | `tool_input.file_path` — same as Claude | `HARNESSES.cursor.filePaths` |
| Cursor's session id | `conversation_id`, present on every hook payload | Row plus PR body: the `sessionStart` bridge the plan had designed was deleted after the probe showed it unnecessary |
| Cursor's nag envelope | `{"additional_context": "<text>"}` | `HARNESSES.cursor.emitNag` |
| Cursor's no-op shape | `{}` — not `null`, unlike Claude and Codex | `HARNESSES.cursor.emitNone` |
| Cursor's event-name casing | camelCase (`preToolUse`, `postToolUse`) where Claude and Codex use PascalCase | `CURSOR_EVENT_NAMES` |
| Does Cursor load `.cursor/hooks.json`? | Yes — and it *also* executes `.claude/settings.json`'s hooks behind a per-user "include third-party configs" setting | Probe finding in the PR body; drove Thrive's foreign-payload guard |
| Codex's `apply_patch` path | Not a field — parsed out of the `tool_input.command` patch blob | `extractPatchFilePaths` |

**Surviving — named, with what would settle each:**

| Unknown | Why it survives | What settles it |
| --- | --- | --- |
| Codex's read-tool name | Thrive's Codex row maps only `Bash` and `apply_patch`; its own comment says the read tool "is unmapped until a live probe observes its name". Thrive deferred the probe to a 2026-08-09 usage window. | One Codex session logging `tool_name` on any `PostToolUse` firing — or confirming a filesystem MCP is present and its read tool is `mcp__filesystem__read_file` |
| Whether `pnpm exec tsx <path>` fires from `.codex/hooks.json` / `.cursor/hooks.json` | PRISM-specific and Thrive cannot answer it — Thrive registers a bare executable `.mjs`. Open sub-questions: is `pnpm` on PATH in the host's hook execution environment, is cwd the repo root, and is there a `$CLAUDE_PROJECT_DIR` equivalent | A human running one session per host with the registration in place, checking for the nag or for a stderr line |
| Cursor's partial-read parameter names | Thrive reuses Claude's `offset`/`limit` and its own comment calls this "the documented guess" | One Cursor session reading a file with a range; worst case until then is that a range read credits as a full read |

---

## Decisions

- **PRISM adopts the harness table, not Thrive's file layout.** One entrypoint `scripts/ai-skills/hooks/hook.ts` dispatching on a `--tool=` flag through a `HARNESSES` map in `scripts/ai-skills/hooks/harnesses.ts`; `architect-route.ts` stays exactly where it is as the host-agnostic resolver.
  - **Root cause:** the brief frames this as "shared script vs per-adapter files," but that framing imports Thrive's starting position. Thrive began with one Claude-specific `.mjs` and *no* resolver seam — its refactor created the seam PRISM already has. PRISM's real question is narrower: does the ~137-line adapter layer become one dispatching file or three near-identical ones?
  - **Alternatives considered:** three thin adapter files (`claude-post-read.ts`, `codex-post-read.ts`, `cursor-post-read.ts`) each importing a shared `runHook(spec, stdin)`; a verbatim port of Thrive's single 1077-line file.
  - **Chosen approach:** the table. Three thin files converge on the same design anyway — the moment the read-stdin/call-resolver/write-stdout skeleton is shared, the three files are three literal harness objects, which is the table spread across a directory. What breaks the tie is that Thrive's PR body records the failure mode of *not* having one: safety that lived in Claude's registration matcher (`Write|Edit`) was silently lost when Cursor's matcher-less registration inherited nothing, producing an unsatisfiable gate that 70 green tests missed. Per-harness behavior belongs in code every harness runs.
  - **Rejecting the verbatim port:** Thrive's single file is a consequence of having no seam. PRISM's resolver is host-agnostic and unit-testable without any wire shape, which is exactly the property `code-standards.md` § General asks for — two adapters serving one port earn the abstraction, and here there are three.
  - **Implementation guidance:** the table holds four things per harness — session-id accessor, file-path accessor, tool-name-to-kind map, and emit envelopes. Nothing below the table reads a harness-specific field name. Task 1 locks that with an assertion, because Thrive records drawing this boundary "one field short three times running."
  - **→ promotion verdict pending close.**

- **PRISM's hooks stay TypeScript on `tsx`; the `.mjs` half of Thrive's port does not come across.** Registration commands keep the `pnpm exec tsx "<path>"` form already in `.claude/settings.json`.
  - **Root cause:** a verbatim port would bring `.mjs`, and `.mjs` falls out of both of PRISM's gates. `pnpm prism:check-types` runs `tsc --noEmit` over `scripts/ai-skills/tsconfig.json`; `pnpm prism:test` runs `tsx --test scripts/ai-skills/*.test.ts`. A `.mjs` hook is type-checked by nothing and collected by nothing. The existing `claude-post-read.test.ts` seam — importing `runAdapter` directly rather than spawning a process — only exists because the adapter is ESM TypeScript in the same toolchain as the test.
  - **Alternatives considered:** port to `.mjs` for byte-parity with Thrive; compile the TS to `.mjs` at build time.
  - **Chosen approach:** stay TypeScript. Byte-parity with Thrive is worth nothing — the two repos have different manifests, different doc sets, and different test runners, so the files diverge on contents regardless. A build step is a new failure mode on a hot path.
  - **Cost, stated rather than hidden:** `pnpm exec tsx` is a heavier spawn per hook firing than `node hook.mjs`, and it adds a dependency on `pnpm` resolving inside each host's hook execution environment. That second cost is the surviving Cursor/Codex unknown in the table above, and it is the specific thing task 8's probe checks.
  - **→ promotion verdict pending close.**

- **The `PreToolUse` deny half is out of scope, on two independent grounds.** Thrive ships a Cursor deny; PRISM ships none.
  - **First ground — settled precedent.** PRISM reverted runtime enforcement. The record is ADR-0067 (superseded), [`epic-floor-revert.md`](./epic-floor-revert.md), and [`issue-305-floor-canonical-backdoor.md`](./issue-305-floor-canonical-backdoor.md). Re-adding a deny would re-open a closed decision inside a port, which is the wrong vehicle for it.
  - **Second ground — the delivery ceiling makes a deny worse than a nag, not better.** A deny's only user-visible output is its `permissionDecisionReason` / `user_message`, which rides the same ~2 KB channel that drops nag payloads. A deny whose explanation spills is a block with no visible reason: the model is stopped and cannot see why, and its remedy text — the list of docs to read — is exactly the part that gets clipped. Thrive's own first Cursor run hit the adjacent version of this and shipped an unsatisfiable gate. A nag that gets clipped degrades to a weaker nag; a deny that gets clipped degrades to a wall.
  - **Consequence to accept:** Codex and Cursor get the nag half only, at parity with what Claude Code has here. This is a deliberate divergence from Thrive, not an unfinished port.
  - **→ promotion verdict pending close.**

- **Cursor's registration ships; Codex's does not. The split is derived from an existing Decision's reasoning, not around it.** [`context-delivery-mechanism.md`](./context-delivery-mechanism.md) records "a host adapter ships only after it has been exercised on that host," and that Decision is live.
  - **Root cause:** read as a checklist, that Decision blocks everything in this plan and the port is a no-op. Read for its stated reason — "both non-Claude adapters rest on an inferred fact… from vendor docs, not from a run" — it discriminates. Thrive's live Cursor probe converts every Cursor wire fact from vendor-doc to observed (see the retired-unknowns table). Codex's read-tool name is still inferred from nothing at all; Thrive's own row leaves it unmapped.
  - **Alternatives considered:** ship both registrations as Thrive did; ship neither until PRISM has host access to each.
  - **Chosen approach:** Cursor's registration lands, Codex's waits. Shipping Thrive's nag-only Codex arm was rejected on its behavior, not its risk: with no read tool mapped, Codex can never *credit* a doc, so every matched doc is named again on every `apply_patch` and `Bash` firing for the whole session. That is a nag that cannot be satisfied — noise, and the same shape of unsatisfiability Thrive shipped and had to fix. Thrive accepts it because its Codex usage is near zero; a nag nobody can clear is still a bad nag.
  - **Why landing Cursor's registration unrun is acceptable:** the failure mode of a wrong registration is *nothing happens*. The hook's fail-open invariant means a command that does not resolve, a payload that does not parse, and an envelope the host ignores all produce silence. That is a materially different risk profile from the deny half, where a wrong registration blocks work — which is why one ships unrun and the other does not ship at all.
  - **Implementation guidance:** the Codex *harness row* still lands (task 5) — it is fully testable from fixtures. Only `.codex/hooks.json` waits. When the probe returns a tool name, the remaining work is one map entry and one file.
  - **→ promotion verdict pending close.**

- **The `compileMatcher` brace trap gets a mechanical guard, not a fix.** `scripts/ai-skills/verify-manifest-coverage.ts:105` escapes `{` and `}` into the regex-metacharacter class, so a `{ts,tsx}` route compiles to a regex matching only a literal-brace filename. Verified on disk this session, not taken on report.
  - **Root cause:** brace expansion was never implemented; the escape treats braces as characters to neutralize rather than syntax to expand. PRISM's `.prism/architect/manifest.json` has zero brace routes (checked), so nothing is broken today. Thrive's manifest has three, which is why the trap is live for anyone carrying Thrive patterns across.
  - **Alternatives considered:** implement brace expansion in `compileMatcher`; document the limitation in prose only.
  - **Chosen approach:** reject a brace-containing manifest key at validation time, in `verify-manifest-coverage.ts`, with a message naming the limitation. Implementing expansion means changing a shared exported function that both `verify-manifest-coverage.ts` and `architect-route.ts` call — `code-standards.md` § General says stop and explain before changing a shared utility, and this port is the wrong ticket to do it under. Prose alone fails the only way that matters: it does not fire when someone adds a brace route two months from now, and the symptom is a silent no-match.
  - **Implementation guidance:** task 7. The guard is the cheaper artifact *and* the stronger one — it turns a silent miss into a loud failure without touching matcher semantics, so it cannot regress an existing route.
  - **→ promotion verdict pending close.**

- **State files gain a per-harness segment: `.prism/architect-route-state.<tool>.<session>.json`.** Thrive namespaces by tool under `os.tmpdir()`; PRISM keeps its repo-local path and adds the segment.
  - **Root cause:** three harnesses mint session ids from three id spaces. Collision between UUID spaces is negligible, so this is a debuggability call more than a correctness one — the filename says which harness wrote it, which matters when the surviving unknown is "did this host fire at all."
  - **Alternatives considered:** move to `os.tmpdir()` as Thrive did; leave the filename alone.
  - **Chosen approach:** the segment. Moving to tmpdir relocates a file task 18's tests already assert against and drops the existing `.gitignore` glob and the `pruneStaleRouteState` reaper, all for no gain PRISM needs.
  - **Implementation guidance:** `buildStateFilePath` gains a `tool` parameter; the prune predicate's `startsWith("architect-route-state.")` prefix still matches, so the reaper needs no change. Confirm that during task 4 rather than assuming it.
  - **→ promotion verdict pending close.**

- **This port inherits an unproven premise; it does not create one. Say so rather than letting the port imply evidence that does not exist.** ADR-0071's case for the hook is an argument, not a measurement. The A/B harness built to falsify it was retired — [`context-delivery-mechanism.md`](./context-delivery-mechanism.md) task 14 records the operator's call and, more importantly, records *why* the instrument could never have answered the question: its positive control asserted on what the hook **emitted**, so it would have certified a hook delivering nothing.
  - **Consequence:** extending the mechanism to two more hosts multiplies an unmeasured benefit by three. That is a defensible bet — the hook is cheap and fails open — but the plan should not read as though Cursor and Codex are inheriting a proven thing.
  - **What would change this:** any measurement of adherence-with-vs-without on any host. None is scoped here, and this plan does not propose building another harness.
  - **→ promotion verdict pending close.**

- **OPEN — TBD, needs Hunter input.** Whether consumers ever receive these hook registrations. `templates/install/.claude/settings.json` is an empty `{}` and no code path in `adopt.ts` or `update.ts` reads it, so consumers receive no hook registration today, for any host. **Default path (used until resolved):** hooks stay PRISM-repo-local. This plan adds no `templates/install/.codex/hooks.json` or `.cursor/hooks.json`, and no seed-curation entry. Consumer distribution is its own decision with its own migration, and inventing it inside a port would ship a surface nobody asked for.
  - **→ promotion verdict pending close.**

---

## Implementation Tasks

Every task below is `[AFK]` unless tagged. Verification for each is stated inline; where a claim cannot be verified in this repo, the task says so instead of naming a command that would not prove it.

**Sequencing:** 1 → 2 → 3 → 4 → 5 are strictly ordered (each edits the file the previous one creates or reshapes). 6 depends on 2. 7 is independent and may run in parallel with any of them. 8 and 9 are `[HITL]` and gate nothing in 1–7.

### Clove (implementation)

1. **Extract the harness table.** New file `scripts/ai-skills/hooks/harnesses.ts`.

   Export an interface `HarnessSpec` with exactly five members and no others:

   - `toolKinds: Record<string, "read" | "write" | "search" | "shell">`
   - `sessionId: (payload: HookPayload) => string | null`
   - `filePaths: (payload: HookPayload) => string[]`
   - `emitNag: (text: string) => unknown`
   - `emitNone: () => unknown`

   Export `const HARNESSES: Record<string, HarnessSpec>` with a `claude` row and a `cursor` row (the `codex` row is task 5). Values, taken from Thrive's verified rows:

   - `claude`: `toolKinds: { Read: "read", Bash: "shell" }`; `sessionId: (p) => p.session_id ?? null`; `filePaths: (p) => [p.tool_input?.file_path].filter(Boolean)`; `emitNag: (text) => ({ hookSpecificOutput: { hookEventName: "PostToolUse", additionalContext: text } })`; `emitNone: () => null`.
   - `cursor`: `toolKinds: { Read: "read", Shell: "shell", Grep: "search" }`; `sessionId: (p) => p.conversation_id ?? null`; `filePaths` same accessor as claude; `emitNag: (text) => ({ additional_context: text })`; `emitNone: () => ({})`.

   Export `function resolveToolKind(spec: HarnessSpec, toolName: string | undefined): string` returning `spec.toolKinds[toolName ?? ""] ?? "write"`. The `write` default is deliberate — an unmapped tool over-nags rather than under-gating; JSDoc it with that reason.

   Do **not** list Cursor's edit tool (`StrReplace`) in `toolKinds`; the `write` default is what covers it, and listing it adds a name that has to stay correct for no behavioral gain.

   Verification: `pnpm prism:check-types` passes.

2. **Replace the Claude adapter with one dispatching entrypoint.** New file `scripts/ai-skills/hooks/hook.ts`; delete `scripts/ai-skills/hooks/claude-post-read.ts`; rename `scripts/ai-skills/hooks/claude-post-read.test.ts` to `hook.test.ts` and re-point its import.

   `hook.ts` carries, in this order: the `PRISM_HOOK_DISABLE` kill switch as the first statement of the entry path (unchanged behavior — write nothing, exit 0); `--tool=<name>` parsing off `process.argv`; a `HARNESSES[tool]` lookup that returns without writing when the name is unknown (fail open — an unknown harness must never throw on a hot path); then the existing `runAdapter` body reworked to take a `HarnessSpec` and read every payload field through it.

   Export `runAdapter(spec: HarnessSpec, rawStdin: string): Promise<string | null>` with the same no-process-IO discipline the current adapter documents — no `process.stdout.write`, no `process.exitCode` inside it, so tests call it directly with no global state to restore.

   Update `.claude/settings.json`: the `PostToolUse` / `Read` command becomes `pnpm exec tsx "$CLAUDE_PROJECT_DIR/scripts/ai-skills/hooks/hook.ts" --tool=claude`. This is the only edit to that file in this plan.

   Add a test asserting the boundary Thrive records drawing "one field short three times running": grep the compiled module text (or the source file read at test time) for every harness-specific field name — `session_id`, `conversation_id`, `additional_context`, `additionalContext`, `hookSpecificOutput` — and assert each appears in `harnesses.ts` and in no other file under `scripts/ai-skills/hooks/`.

   Verification: `pnpm prism:test` — every pre-existing assertion in the renamed test file passes unedited except for the `runAdapter` call signature, and a `--tool=claude` fixture produces the same stdout string the old adapter produced for the same stdin.

3. **Add the foreign-payload guard.** In `hook.ts`, before the resolver call.

   The `claude` row must decline a payload that is not Claude-shaped, silently and without a stderr line. Thrive's probe found that Cursor imports and executes `.claude/settings.json`'s hooks alongside its own, behind a per-user "include third-party configs" setting — so without this guard every Cursor tool call runs the hook twice, once per registration, and both credit into different state files.

   Discriminator: Cursor emits camelCase hook event names (`preToolUse`, `postToolUse`, `sessionStart`, `sessionEnd`); Claude Code emits PascalCase and never camelCase. When `--tool=claude` and the payload's event name is in the camelCase set, return `null`.

   Add a PascalCase control case beside the camelCase case in the test file, so the guard is proven to decline the right payloads *and* accept the right ones. A guard tested only on its reject path is how an over-broad discriminator ships green.

   Verification: `pnpm prism:test` — camelCase payload under `--tool=claude` produces no output; PascalCase payload under `--tool=claude` produces the nag.

4. **Namespace the state file by harness.** `scripts/ai-skills/hooks/architect-route.ts`.

   `buildStateFilePath(repoRoot, sessionId)` gains a `tool: string` first parameter and produces `.prism/architect-route-state.<tool>.<safeSessionId>.json`. Thread `tool` through `loadRouteState` and `saveRouteState` and their call sites in the resolver.

   Confirm — do not assume — that `pruneStaleRouteState`'s `entry.startsWith("architect-route-state.")` predicate still matches the new filename, and that its `.tmp` exclusion still holds. Add one test asserting a file written under `--tool=cursor` is reaped by the same prune pass as one written under `--tool=claude`.

   Verification: `pnpm prism:test`; then manually read a `.prism/` path in a Claude session and confirm the written state file carries the `claude` segment.

5. **Add the Codex harness row and its patch-path extraction.** `scripts/ai-skills/hooks/harnesses.ts`.

   Add a `codex` row: `toolKinds: { Bash: "shell", apply_patch: "write" }`; `sessionId: (p) => p.session_id ?? null`; `emitNag` identical to `claude`'s; `emitNone: () => null`. `filePaths` branches — when `p.tool_name === "apply_patch"`, return `extractPatchFilePaths(p.tool_input?.command)`; otherwise `[p.tool_input?.file_path].filter(Boolean)`.

   `extractPatchFilePaths(command: string | undefined): string[]` parses the `apply_patch` blob's file headers. Codex carries no separate path field — the target lives inside the patch text — so this is the only route to a path on that tool.

   JSDoc the row with the reason no read tool is mapped: the name is unobserved, and the `write` default over-nags rather than under-gating until task 9's probe supplies it.

   **No `.codex/hooks.json` in this task.** Per `## Decisions`, the row lands and the registration waits.

   Verification: `pnpm prism:test` with fixture cases for a single-file patch, a multi-file patch, and a malformed blob (which returns `[]` rather than throwing).

6. **Register Cursor.** New file `.cursor/hooks.json`:

   ```json
   {
   	"version": 1,
   	"hooks": {
   		"postToolUse": [
   			{
   				"type": "command",
   				"command": "pnpm exec tsx scripts/ai-skills/hooks/hook.ts --tool=cursor"
   			}
   		]
   	}
   }
   ```

   `preToolUse` is deliberately absent — that is the deny half, out of scope per `## Decisions`.

   The command path is repo-root-relative because Thrive's Cursor and Codex registrations are, and Cursor exposes no documented `$CLAUDE_PROJECT_DIR` equivalent. Whether Cursor resolves it from the repo root is one of the surviving unknowns; task 8 checks it.

   `.cursor/` is a generated mirror directory — confirm `pnpm prism:build`'s orphan cleanup does not sweep an unmanaged `hooks.json` out of it. If it does, that is a build-script change and it belongs to this task, not a later one.

   Verification here is bounded and the task says so: `pnpm prism:build` then `pnpm prism:check` pass and the file survives the build. **This does not prove Cursor fires the hook** — see task 8 and the risk in `## Decisions`.

7. **Reject brace globs in the manifest at validation time.** `scripts/ai-skills/verify-manifest-coverage.ts`.

   Before any matcher is compiled, iterate the manifest keys; when a key contains `{` or `}`, fail with a message naming the limitation and the key — for example: `manifest route "<key>" uses a brace glob; compileMatcher escapes braces as literals rather than expanding them, so this route would silently match nothing. Write one route per extension instead.`

   Do not change `compileMatcher`. Its brace escaping at line 105 is the cause, but it is a shared exported function called by both this file and `architect-route.ts`, and changing shared-utility semantics under a port is the wrong vehicle (`code-standards.md` § General).

   Verification: `pnpm prism:test` with a fixture manifest containing `src/**/*.{ts,tsx}` asserting the failure fires, and one containing only PRISM's current route shapes asserting it does not. Then `pnpm prism:check` against the live manifest passes — PRISM has zero brace routes today, verified 2026-08-04.

### Winston / operator (host probes)

8. **[HITL] Probe Cursor on this repo.** Blocked on a human with a Cursor session against a PRISM checkout that has tasks 1–6 landed.

   Three things to observe, in order — stop at the first failure and report which:

   1. Does the hook fire at all? Open a Cursor session, read `.prism/architect/manifest.json` (or any path with a manifest route), and check whether a nag naming unread doc paths appears.
   2. If nothing appears, is the command resolving? Add a temporary `process.stderr.write` at the top of `hook.ts`'s entry path and check Cursor's hook log for it. Silence means `pnpm exec tsx` is not running — which is the `pnpm`-on-PATH / cwd question, and the answer changes the registration's `command` string, not the harness row.
   3. Does crediting work? Read a doc the nag named, then read the original path again, and confirm that doc has dropped out of the nag.

   Also record `tool_input`'s field names on a ranged read, which settles the last surviving Cursor unknown (partial-read parameter names).

   Output is a note in this plan's `## History` plus, if step 2 fails, a correction task for the `command` string.

9. **[HITL] Probe Codex, then register it.** Blocked on a human with a Codex session. Thrive deferred the equivalent probe to a 2026-08-09 usage window; nothing here waits on Thrive's.

   Observe one thing: the `tool_name` value Codex sends on a `PostToolUse` firing for a file read. If the session has a filesystem MCP, confirm whether that name is `mcp__filesystem__read_file`.

   When it returns: add the name to the `codex` row's `toolKinds` as `"read"` (one map entry) and create `.codex/hooks.json` registering `PostToolUse` with matcher `Bash|apply_patch|<the observed read tool>` and command `pnpm exec tsx scripts/ai-skills/hooks/hook.ts --tool=codex`. Both are small enough to ride one PR.

   Until then the Codex row ships without a registration, on purpose — a Codex nag with no read tool mapped can never be cleared, which is noise, not a degraded feature.

### Eli (documentation)

10. **Run the docs grep, then size the gap.** `grep -rn "architect-context hook\|claude-post-read\|inject-architect-context" docs/`.

    No hits — record that in `## History` and the PR proceeds with no docs change. Hits — the docs edit lands in the same PR, per the standing Decision in [`context-delivery-mechanism.md`](./context-delivery-mechanism.md) that Eli rides each PR rather than batching.

    Separately, append a harness section to `.prism/spec/adrs/_toolkit/0071-architect-context-read-hook.md` covering: the harness-row contract and what belongs in a row (any name or shape a host spells its own way); the three hosts' wire shapes; the obligation that a row decline payloads from a host that is not its own; and the nag-only scope with the two grounds from `## Decisions`. Do not re-litigate the Decision section or the byte-cap Consequence — task 18 of the context-delivery plan already corrected both.

    Verification: `pnpm prism:build` regenerates the three ADR mirrors (`.claude/`, `.codex/`, `.cursor/`) with no drift, then `pnpm prism:check` passes.

---

## Acceptance Criteria

### Behavioral

- [ ] **AC-1** — Given a Claude Code session reads a file with a matching manifest route, When the hook fires through `--tool=claude`, Then the nag names every unread matched doc by path and contains no doc body (REQ-1)
  - Evidence: `machine` — `pnpm prism:test`, the fixture case asserting no doc body appears in the emitted payload.
- [ ] **AC-2** — Given a payload carrying a camelCase hook event name, When the hook runs under `--tool=claude`, Then nothing is written to stdout and nothing is written to stderr (REQ-1)
  - Evidence: `machine` — `pnpm prism:test`, the foreign-payload case and its PascalCase control.
- [ ] **AC-3** — Given the same session id under two different harnesses, When each writes route state, Then two separate state files exist, distinguishable by a harness segment in the filename (REQ-1)
  - Evidence: `machine` — `pnpm prism:test`, the state-namespacing case.
- [ ] **AC-4** — Given an `apply_patch` payload whose target path is inside the patch blob, When the Codex row extracts file paths, Then the target path is returned; and given a malformed blob, Then an empty list is returned rather than a thrown error (REQ-1)
  - Evidence: `machine` — `pnpm prism:test`, the three `extractPatchFilePaths` fixture cases.
- [ ] **AC-5** — Given an unknown `--tool` value, When the hook runs, Then it writes nothing and exits 0 (REQ-1)
  - Evidence: `machine` — `pnpm prism:test`, the unknown-harness fail-open case.
- [ ] **AC-6** — Given a Cursor session on a checkout with the registration in place, When a file with a manifest route is read, Then a nag naming unread doc paths appears in the session (REQ-1)
  - Evidence: `human` — task 8 step 1. **This criterion cannot be graded in this repo** and is expected to stay unchecked when the implementation PR opens; it is the honest form of the risk recorded in `## Decisions`.

### Non-behavioral

- [ ] **AC-7** — No harness-specific field name (`session_id`, `conversation_id`, `additional_context`, `additionalContext`, `hookSpecificOutput`) appears in any file under `scripts/ai-skills/hooks/` other than `harnesses.ts` (REQ-1)
  - Evidence: `machine` — `pnpm prism:test`, the boundary assertion from task 2.
- [ ] **AC-8** — A manifest key containing a brace glob fails `pnpm prism:check` with a message naming the key and the limitation (REQ-1)
  - Evidence: `machine` — `pnpm prism:test`, the brace-route fixture case.
- [ ] **AC-9** — `pnpm prism:build` produces no drift and `pnpm prism:check` passes after every task (REQ-1)
  - Evidence: `machine` — the two commands, run at each task's close.
- [ ] **AC-10** — No file under `templates/install/` is added or modified by this plan (REQ-1)
  - Evidence: `machine` — `git diff --name-only origin/main...HEAD | grep '^templates/install/'` returns nothing.
- [ ] **AC-11** — `.codex/hooks.json` does not exist on the implementation branch (REQ-1)
  - Evidence: `machine` — `test ! -f .codex/hooks.json`. Codex's registration is deliberately deferred to task 9; this criterion is what keeps the deferral from eroding mid-implementation.

### AC Sync Log

| Date | Agent | Action | Plan | Ticket |
| ---- | ----- | ------ | ---- | ------ |
| 2026-08-04 | Winston | AC created in plan; no PRISM tracker ticket exists for this work | ✓ | N/A |

---

## Sessions

- 2026-08-04 [huntermcgrew/thr-2171-port] open: Intent — plan the Codex/Cursor generalization of the architect-context hook against Thrive #2262, sequenced behind `lane-hook-fix`; Bounds — one plan file committed and pushed, no hook source, no `.claude/settings.json`, no `.prism/plans/conductor/`, no PR; Approach — port the harness table rather than Thrive's file layout, since PRISM already has the resolver seam Thrive's refactor created · close: scope held

---

## History

- 2026-08-04 [huntermcgrew/thr-2171-port]: Created the plan from Thrive PR #2262, PRISM's `architect-route.ts` / `claude-post-read.ts`, and task 18 of `context-delivery-mechanism.md`. Recorded the harness-table-over-file-layout call, the TypeScript-over-`.mjs` call, and the Cursor-ships / Codex-waits split; see Decisions.

---

## Review Issues

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

**Last updated:** 2026-08-04
