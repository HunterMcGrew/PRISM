---
title: Agent hooks — shared parser, secrets, brief, commit, and reconcile gates
ticket: https://github.com/HunterMcGrew/PRISM/issues/544
stage: plan
status: approved
approved_by: auto
approved_at: 2026-11-19
---

Child 8 of the Kitchen Line epic (#499). The design is this folder's `spec.md`, which carries the parts of `.prism/plans/prism-499/spec.md` this child builds: row 8 of the Children table, the Agent hooks, Architect routes for consumer code, and Always-on rule edits sections, and the Swaps. The epic's approved `intent.md` covers this child. `spec.md` names every thrive file this plan ports and the command that reads one at the pinned ref.

**Goal:** every gate that reads a shell command shares one parser, and four new gates stop what the intent's Hooks section names: reading a secret, a long or overriding subagent brief, a commit that bypasses hooks or misstates its task, and a PR review that stops while reconcile is unclean. Onboarding writes an architect route over consumer code only with a real doc behind it.

## Tasks

Groups from `node scripts/ai-skills/hooks/plan/bundles.mjs .prism/plans/prism-544/plan.md` on the draft:

- Group 1: T1, T4
- Group 2: T2
- Group 3: T18

These are the first wave, the open tasks with no unfinished dependency. Later waves follow the `depends on` fields and the import edges the script adds. Part 1: T3 after T1, T2, and T18 (`update.ts` imports `generate-skills.ts`); T5 after T3; T6 after T4 and T5. Part 2: T7 after T6; T8 after T2 and T7; T9 after T3, T5, T8, and T18; T10 after T6 and T9. Part 3: T11 and T12 after T10; T13 after T8 and T12; T14 after T11, T12, and T13; T15 after T3, T9, T14, and T18; T16 after T15; T17 after T10 and T16. Part 4: T19 after T2, T17, and T18; T20 after T19; T21 after T3, T9, T15, T18, T19, and T20; T22 after T17; T23 after T17, T21, and T22. Part 5: T24 after T3, T9, T18, T21, and T23; T25 after T24; T26 after T25. Rerun the script after any task change and replace the groups with what it prints.

T1 to T6 and T18 are part 1 of a five-PR stack, T7 to T10 part 2, T11 to T17 part 3, T19 to T23 part 4, and T24 to T26 part 5. The first task of each later part depends on the last task of the part before, so no wave builds two parts at once. The Decisions record the cuts.

Every task is Clove's except T6, T10, T17, T23, and T26, which are Eli's. These conventions hold for every task.

**Precondition.** Children 4, 6, and 7 are merged to `main` (#530 and the PRs before it, #541, #542). Start the build with `git merge origin/main`. Every file and symbol below was checked present at `a5f1e6c5` on 2026-11-19. Stop and report the build as blocked if a later `main` drops one:

- `walkSegments`, `resolveDir`, and the `Segment` typedef in `scripts/ai-skills/hooks/lib/segments.mjs`, and `tokenize` and `flattenCommand` in `lib/tokenize.mjs`
- `splitShellSegments` and `unquote` in `scripts/ai-skills/hooks/lib/shell.mjs`, imported by `hook.mjs`, `git-gates.mjs`, and `scripts/ai-skills/git-gates.test.ts` only
- `HARNESSES`, `resolveListedToolKind`, and `resolveToolKind` in `scripts/ai-skills/hooks/harnesses.mjs`
- `findRepoRoot` in `architect-route.mjs`, `findPlanForBranch` in `compact-handoff.mjs`, `resolvePlan` and `CHAIN_FILES` in `plan/lookup.mjs`, `parseTasks`, `parseSubject`, `readPlanConfig`, and `PlanConfigError` in `plan/tasks.mjs`, and `resolveStopPaths` and `matchStopPath` in `plan/stop-paths.mjs`
- `HOOK_RUNTIME_FILES`, `HOOK_RUNTIME_ENTRY_POINTS`, `PRISM_HOOK_COMMAND_PATTERN`, and `PRISM_CODEX_HOOK_COMMAND_PATTERN` in `scripts/ai-skills/update.ts`, and `HOOK_COMMAND_PATH_RE` and `checkArchitectRoutes` in `scripts/ai-skills/doctor.ts`
- `buildRoleMap` and `RoleDefinition` in `scripts/ai-skills/generate-skills.ts`
- `review/reconcile.mjs` with its `--json` flag, and the `prism-pr: <n>` last line in `prism-pr-review`

**Measured at `a5f1e6c5`.** The `AGENTS.md` lead set ends at byte 31,708, the end of `pre-compaction-checkpoint.md`, and `workflow.md` ends at 11,807. `AGENTS.md` is 137,154 bytes, so `.codex/config.toml`'s 262,144 holds. `prism-onboard`'s `shared.md` is 68 lines.

**Ports.** Where a task says "port", copy thrive's file at the ref and change only what the task and the Swaps in `spec.md` list. Every port also makes these changes, so no task repeats them:

- Keep thrive's header comment, entry guard, and known-misses lists. Drop each line that describes a dropped feature (Cursor rows, Docker arms, the container env-dump arm), and rewrite each `.ai-spec/`, `scripts/plan/`, `scripts/review/`, and `thrive-` name per the Swaps.
- Imports from thrive's `../lib/harness.mjs`, `../lib/envelope.mjs`, and `../lib/decline.mjs` become imports from `harnesses.mjs` (T2 adds what they provided). `findManifestRoot` becomes `findRepoRoot` from `architect-route.mjs`, which is async, so the caller awaits it.
- Line 1 to 3 is the `@prism-hook-runtime` marker block every runtime file carries, copied from `harnesses.mjs` lines 1 to 3. Each module gets a `.d.mts` sidecar declaring its exports, in the shape of `lib/segments.d.mts`.
- Ported tests become `scripts/ai-skills/<name>.test.ts`, using `node:test`, `node:assert/strict`, and the import style of `scripts/ai-skills/hook-segments.test.ts`. Drop each thrive case that tests a dropped feature, Cursor, or a file's executable bit.
- A test that runs an entry point spawns `process.execPath` with the entry file and `--tool=<harness> --event=<event>`, feeding the payload on stdin and a copy of `process.env` with both kill switches deleted. A git fixture repo is made under `os.tmpdir()` with `git init -q`, `user.name` and `user.email` set, and `commit.gpgsign` false, and removed in an `after` hook.

**The three legs.** Each gate's suite has three cases named `<gate> leg 1: ...`, `<gate> leg 2: ...`, and `<gate> leg 3: ...`. Leg 1 shows the deny firing. Leg 2 seeds the state that clears it and calls the gate in-process. Leg 3 performs the remedy the deny text names, through the spawned entry point, and shows it pass.

**Failure and switches.** Every new entry point wraps its work in one try/catch that writes one stderr line starting `<gate-name>:`, writes nothing to stdout, and leaves `process.exitCode` at 0. Its suite has a case "a crash fails open: malformed JSON on stdin writes nothing to stdout and one stderr line". The brief, commit, and reconcile gates return before reading stdin when `process.env.PRISM_HOOK_DISABLE === "1"` or `process.env.PRISM_HOOK_DENY_DISABLE === "1"`, as `hook.mjs` does in its kill-switch checks, and each suite has a case that leg 1's payload passes under each switch. The secrets gate reads neither, and its suite shows leg 1 still denying under each.

**Section references in quoted text.** A plan folder holds no section sign, so where a quoted old or new string points at a section of the doc it sits in, this plan writes the reference as `[ref: <Heading>]`. The builder writes it in the doc's own form, the section sign, a space, and the heading, matching the doc's other references: `([ref: Approve guard])` becomes the parenthetical naming the Approve guard section that the doc already uses. Where this plan names a section to edit, it says "the <Heading> section".

**Generated output.** Every task that edits a rule, architect doc, ADR, skill, or `roles.json` runs `pnpm prism:build` and commits what the build writes from its sources. The files list names the expected copies. Add any other copy the build writes from these sources to the same commit and name it in `## History`. Check with `git status -s` after the build.

- A rule's copies are `.claude/rules/<name>.md`, `.codex/rules/<name>.md`, and `.cursor/rules/<name>.mdc`, plus its inlined text in `AGENTS.md`.
- An architect doc or ADR has a copy at the same path under each of `.claude/`, `.codex/`, and `.cursor/`.
- The seed twin is `templates/install/.prism/<path>`. The build writes it for a file `.ai-skills/definitions/seed-curation.json` does not list. `architect/_toolkit/hook-runtime.md` is `curated`, so its twin is edited by hand: make the same edit, with every ADR link and citation dropped, per Test 2 in `install-layout.md`. ADRs and `architect/_toolkit/onboarding.md` are `excluded` and have no twin.

**Naming the source repo.** The build's literal guard fails on `Thrive`, `TracTru/thrive`, `tractru`, and `thrive.` followed by a key in skill and ADR copies, and the seed canary fails on origin-project references in `templates/install/`. Name the source repo only as lowercase `thrive`, and never in `templates/install/` or a delivered runtime file. A runtime header that cites thrive's file says "ported from the reference implementation" instead.

**Commits.** One bundle is one commit, with subject `T<n>: <summary>`, `T<a>-T<b>: <summary>`, or `T<a>,T<b>: <summary>`, made with `node scripts/ai-skills/hooks/plan/commit.mjs "<subject>" <paths>`. Plan edits commit as `plan: <summary>`. Stages commit and never push. A task that edits an existing test file appends its new `test(...)` blocks after the file's last test, or inserts list entries above an existing line, so no existing line changes unless the task carries `behavior change:`. Once T15 lands, PRISM's own commit gate denies a removed test line no task permits, and from T21 on the brief gate denies a brief to a gated stage past 15 non-blank lines, so dispatch briefs name the folder, the task IDs, the worktree path, and the report shape.

### T1: Add a failing test for a commit inside a bash -c string

- files: scripts/ai-skills/git-gates-shell-string.test.ts
- proof: pnpm exec tsx --test scripts/ai-skills/git-gates-shell-string.test.ts
- proof fails on main: yes
- depends on: none

Owner: Clove. The splitter in `lib/shell.mjs` reads `bash -c '<cmd>'` as one `bash` segment, so the git gates never see the commit inside it. This test pins the fix T3 makes.

New file. Header JSDoc: "Pins that the git gates read a commit or push the shell runs inside a `bash -c` or `sh -c` string. The test spawns the entry point and imports nothing from the runtime, so it runs before the fix lands." It spawns `scripts/ai-skills/hooks/git-gates.mjs` per the Ports convention, in a fixture repo holding one commit and `.ai-skills/config.json` with `{ "hooks": { "commitCleanupPass": true } }`.

- **"the commit hold fires on a commit inside bash -c"**. Payload `{ session_id: "s1", cwd: <repo>, hook_event_name: "PreToolUse", tool_name: "Bash", tool_input: { command: "bash -c 'git commit -m x'" } }`. Stdout parses to JSON whose `hookSpecificOutput.permissionDecision` is `deny` and whose reason matches `/cleanup-pass\.md/`.
- **"the push gate reads a push inside sh -c"**. Same repo with `{ "hooks": { "pushVerification": true }, "commands": { "lint": "node -e \"process.exit(3)\"" } }` and command `sh -c "git push -q"`. Stdout is a deny whose reason matches `/exit status 3|exited 3|3/`.
- **"text that only mentions a commit stays silent"**. The first repo, command `bash -c 'echo "git commit"'`. Stdout is empty.

The first two fail on `main`.

### T2: Add the dispatch, subagent-stop, block-stop, and shell-call readers to harnesses.mjs

- files: scripts/ai-skills/hooks/harnesses.mjs, scripts/ai-skills/hooks/harnesses.d.mts, scripts/ai-skills/hook-harnesses.test.ts
- proof: pnpm exec tsx --test scripts/ai-skills/hook-harnesses.test.ts scripts/ai-skills/hook-gate.test.ts scripts/ai-skills/hook-gate-read-credit.test.ts scripts/ai-skills/approve-guard.test.ts && pnpm run prism:check-types
- proof fails on main: yes
- depends on: none

Owner: Clove. The new gates read payload fields the current table has no accessor for.

- **`toolKinds`.** The Claude row gains `Agent: "dispatch"` and `Task: "dispatch"`. The `HarnessSpec` typedef's kind union gains `"dispatch"`. No registration of `hook.mjs` matches either tool, so the write gate never sees them.
- **`subagentDispatch(payload)`**, a new field on every row, returning `{ type, prompt }` or `null`. Claude: when `resolveListedToolKind` gives `dispatch`, `{ type: payload.tool_input?.subagent_type, prompt: payload.tool_input?.prompt }`. Codex: when `payload.hook_event_name === "SubagentStart"`, `{ type: payload.agent_type, prompt: payload.prompt }`. Cursor: `() => null`. The Codex field names come from thrive's brief gate, which read them off Codex's documentation. A comment above the Codex field says they are documentation-read and not live-probed.
- **`subagentStop(payload)`**, returning `{ agentType: payload.agent_type, message: payload.last_assistant_message, active: payload.stop_hook_active }` on Claude and Codex, and `null` on Cursor, with the same comment on the Codex row.
- **`emitBlockStop(reason)`**, returning `{ decision: "block", reason }` on Claude and Codex and `null` on Cursor.
- **`export function readShellCall(tool, payload)`**, ported from thrive's `scripts/hooks/lib/harness.mjs` minus its Cursor branch and `event` parameter. Shell tools are `Bash` and `PowerShell` on Claude and `Bash` on Codex. It returns `{ command, cwd }` or `null`. A Codex argv array is quoted word by word with thrive's `quoteArgv`, a `PowerShell` command has every `\` turned into `/`, and `cwd` is `payload.cwd` when it is a non-empty string, else `null`.
- **`export function writeStdout(body)`**, ported from thrive's `scripts/hooks/lib/envelope.mjs`: it adds a no-op `error` listener to `process.stdout` so `EPIPE` never throws, then writes a string as is and anything else as JSON.
- `harnesses.d.mts` declares the four fields and two exports.

`scripts/ai-skills/hook-harnesses.test.ts`, new, covers each accessor: a Claude `Agent` and a `Task` payload read as a dispatch and an `Edit` payload reads `null`; a Codex `SubagentStart` reads `{ type, prompt }` and a Codex `PreToolUse` reads `null`; `subagentStop` reads the three fields; `emitBlockStop` gives the block shape on both hosts; `readShellCall` reads a Claude `Bash` call, a `PowerShell` call with `C:\a\b` read as `C:/a/b`, a Codex argv array `["git", "commit", "-m", "a b"]` read back by `tokenize` as those four words, and returns `null` for a `Read` call and for a missing command.

### T3: Read both gates' commands through walkSegments and delete lib/shell.mjs

- files: scripts/ai-skills/hooks/git-gates.mjs, scripts/ai-skills/hooks/hook.mjs, scripts/ai-skills/hooks/lib/shell.mjs, scripts/ai-skills/hooks/lib/shell.d.mts, scripts/ai-skills/update.ts, scripts/ai-skills/update.test.ts, scripts/ai-skills/git-gates.test.ts
- proof: pnpm exec tsx --test scripts/ai-skills/git-gates-shell-string.test.ts scripts/ai-skills/git-gates.test.ts scripts/ai-skills/hook-gate.test.ts scripts/ai-skills/hook-gate-read-credit.test.ts scripts/ai-skills/hook-command.test.ts scripts/ai-skills/update.test.ts && pnpm run prism:check-types && git diff --exit-code origin/main -- scripts/ai-skills/hook-gate.test.ts scripts/ai-skills/hook-gate-read-credit.test.ts && test ! -e scripts/ai-skills/hooks/lib/shell.mjs && ! grep -rln 'lib/shell.mjs' scripts/ai-skills --include='*.mjs' --include='*.mts' --include='*.ts'
- depends on: T1, T2
- behavior change: `git-gates.test.ts` loses its import of `splitShellSegments` and the test "splitShellSegments: cuts on every separator, skips heredoc bodies, and keeps a continuation in one segment", because the module it tests is deleted, and its header drops the clause naming the splitter. T4 carries its assertions to `hook-segments.test.ts` against `walkSegments`. `update.test.ts` drops `"lib/shell.mjs",` from `HOOK_RUNTIME_RELATIVE_PATHS`, because the runtime no longer ships it.

Owner: Clove. Both importers move and the module goes in one task. The bundle check makes a task that edits an importer wait on the task that owns the imported file, so a separate deletion task would wait on the migrations while they waited on it.

**`git-gates.mjs`.**

- Replace `import { splitShellSegments, unquote } from "./lib/shell.mjs";` with `import { walkSegments } from "./lib/segments.mjs";`.
- `detectGitSegments(command)` loops over `walkSegments(command).segments` and passes `segment.argv` to `resolveGitInvocation`. Every segment counts whatever its `via`, because bash runs a command inside `bash -c` or a substitution too. A command the walk can't read yields only the segments it read before the unreadable line.
- `resolveGitInvocation` now receives unquoted words, so its two `unquote(...)` calls go and it reads `tokens[index]` and `tokens[index + 1]` directly.
- The JSDoc paragraph on `detectGitSegments` that begins "The HEREDOC commit form" becomes: "The walk unwraps `bash -c`, `env`, and `timeout`, and reads a heredoc body as data, so a body line is never a command."

**`hook.mjs`.** Replace the same import with `import { walkSegments } from "./lib/segments.mjs";` and move each call site. The read-credit contract does not move: the safe-character allow-list over the whole command, the `cd <dir> &&` prefix rule, flagless `cat` as the only crediting read, the heredoc data-reader rule, and the `\` to `/` rewrite.

- **Each loop.** `for (const tokens of splitShellSegments(x))` at `parseShellReadTargets` (line 317), the `cd`-relative argument reading (line 808), and `checkCommandWritesNoFile` (line 1002) becomes a loop over `walkSegments(x).segments`. `segment.argv` stands where the code read `tokens` through `unquote`, and the raw tokens it read without `unquote` come from `segment.words`. The `unquote` calls at lines 184, 380, 754, 755, and 770 go.
- **Doubt resolves as a write.** When `walkSegments(x).unreadable` is non-empty, `parseShellReadTargets` credits nothing for the command and `checkCommandWritesNoFile` returns `false`, so `parseUnprovenShellPaths` treats the whole command as unproven. A segment with `depth > 0` credits nothing.
- **`removeDataHeredocBodies`.** Delete the `heredocs` array at line 749 with its JSDoc type `import("./lib/shell.mjs").HeredocBody[]`, which `prism:check-types` fails on once the module is gone. A segment's heredoc bodies are `segment.stdinTexts`. A reader pipes onward when a later segment's `pipedFrom` is that segment. To cut an inert body from the command text, find it with `command.indexOf(body, cursor)`, where `cursor` starts at 0 and moves past each body found, and keep the whole command unchanged when a body is not found verbatim. That keeps every body in the scan, the over-deny direction the gate already takes.
- The comments at lines 93, 295, 796, and 944 that name `splitShellSegments` name `walkSegments` instead.
- The JSDoc above the safe-character allow-list (line 65) says the quote characters are allowed "(so `unquote` keeps working)". Replace that parenthetical with "(so `walkSegments` can read a quoted word)".

No assertion in `hook-gate.test.ts` or `hook-gate-read-credit.test.ts` changes, which the proof's `git diff` checks. When one fails, the fix goes in `hook.mjs`. No assertion in `git-gates.test.ts` changes beyond the behavior change above, and T1's first two cases now pass.

**The deletion.**

- Delete `scripts/ai-skills/hooks/lib/shell.mjs` and `lib/shell.d.mts`.
- In `scripts/ai-skills/update.ts`, delete the `"lib/shell.mjs",` line from `HOOK_RUNTIME_FILES`. `pruneStaleHookRuntimeFiles` then backs up and removes a consumer's marked copy.
- In `update.test.ts`, delete the `"lib/shell.mjs",` entry from `HOOK_RUNTIME_RELATIVE_PATHS` (line 2317).
- In `git-gates.test.ts`, delete line 24's import, the `// --- lib/shell.mjs ---` marker, and the splitter test. In the header JSDoc, replace "the spawned entry point's argv dispatch, and the shared shell splitter's branches that only these gates reach." with "and the spawned entry point's argv dispatch."
- `## History` gets a line, carried into the release note: "A consumer will find `.claude/hooks/lib/shell.mjs.bak` after their next `prism update`, and can delete it."

### T4: Carry the splitter assertions to walkSegments

- files: scripts/ai-skills/hook-segments.test.ts
- proof: pnpm exec tsx --test scripts/ai-skills/hook-segments.test.ts
- depends on: none

Owner: Clove. The splitter test T3 deletes pinned cases the git gates now read through `walkSegments`. Append to `scripts/ai-skills/hook-segments.test.ts` **"walkSegments: cuts on every separator, reads heredoc bodies as data, and keeps a continuation in one segment"**: `a && b`, `a | b`, and `a; b` each give argvs `[["a"], ["b"]]`; `tee f <<'E'\nline one\nE\necho after` gives `[["tee", "f"], ["echo", "after"]]` with `stdinTexts` on the first segment equal to `["line one"]`, no trailing newline; `cat <<-E\n\tbody\n\tE\necho x` gives `[["cat"], ["echo", "x"]]`; `git commit \\\n-m x` gives one segment. These pass on `main`, since `walkSegments` already behaves this way. The task keeps the coverage when the old test goes.

### T5: Pin that an update removes the old shell splitter from a consumer

- files: scripts/ai-skills/update-prune-shell.test.ts
- proof: pnpm exec tsx --test scripts/ai-skills/update-prune-shell.test.ts
- proof fails on main: yes
- depends on: T3
- amended: scripts/ai-skills/update-prune-shell.test.ts: the test moves out of update.test.ts, whose import of update.ts gave T5 an edge to T9 and a cycle

Owner: Clove. Write the new file `scripts/ai-skills/update-prune-shell.test.ts`, with a header JSDoc saying it pins that an update removes the shell splitter the runtime stopped shipping. It holds one test, **"refreshHookRuntime backs up and removes a marked lib/shell.mjs the runtime no longer ships"**, built like the prune cases in `update.test.ts`, importing `refreshHookRuntime` and `HOOK_RUNTIME_MARKER` from `./update` and the fixture helpers it needs from `node:fs/promises`, `node:os`, and `node:path`: a consumer `.claude/hooks/lib/shell.mjs` carrying `HOOK_RUNTIME_MARKER` is gone after `refreshHookRuntime`, and `.claude/hooks/lib/shell.mjs.bak` holds its bytes. It fails on `main`, where `HOOK_RUNTIME_FILES` still ships the file.

### T6: Record the shared parser in the docs

- files: .prism/architect/_toolkit/plan-chain-scripts.md, templates/install/.prism/architect/_toolkit/plan-chain-scripts.md, .claude/architect/_toolkit/plan-chain-scripts.md, .codex/architect/_toolkit/plan-chain-scripts.md, .cursor/architect/_toolkit/plan-chain-scripts.md, docs/what-prism-writes.md
- proof: pnpm exec tsx scripts/ai-skills/build.ts --check && pnpm run prism:crossref-lint && ! grep -q 'No gate calls it yet' .prism/architect/_toolkit/plan-chain-scripts.md && ! grep -q 'later gates read' docs/what-prism-writes.md
- depends on: T4, T5

Owner: Eli. Content only.

- `.prism/architect/_toolkit/plan-chain-scripts.md`, under Shell parser: replace "No gate calls it yet: it is delivered so the gates that read a command can share one parser." with "Every gate that reads a shell command reads it through these two modules, and the runtime ships no other shell splitter."
- `docs/what-prism-writes.md`, the `lib/tokenize.mjs` row: replace "The shell parser that later gates read commands with." with "The shell parser every gate reads commands with." Set the frontmatter `last_updated` to the build date.
- Run `pnpm prism:build` for the twin and the three copies.

### T7: Port env-keys as the secrets gate's remedy

- files: scripts/ai-skills/hooks/env-keys.mjs, scripts/ai-skills/hooks/env-keys.d.mts, scripts/ai-skills/env-keys.test.ts
- proof: pnpm exec tsx --test scripts/ai-skills/env-keys.test.ts && pnpm run prism:check-types
- proof fails on main: yes
- depends on: T6

Owner: Clove. A zero-dependency `.mjs` rewrite of thrive's `scripts/env-keys.sh`, with its behavior and header:

- `node env-keys.mjs <file>` prints each key name once, in file order, one per line, and never text right of an `=`.
- Blank lines, `#` lines, and lines that are not `KEY=value` are skipped. An optional `export ` prefix is accepted. A value that opens a single, double, or backtick quote and does not close it on the same line runs to its closing quote, and every line inside it prints nothing. A backslash escapes the next character inside a quote. A trailing `\r` is dropped, and a byte order mark on the first line is skipped.
- A file whose basename, or whose realpath's basename, is not `.env`, `.env.*`, or `*.env` in any case is refused with one stderr line and nothing on stdout.
- A line opening `-----BEGIN` outside a quoted value refuses the file with nothing on stdout.
- A missing argument, a missing file, or a directory exits 2 with `env-keys: cannot read <file>` on stderr. A refusal exits 1. Exit 2 follows the runtime's usage-error code, where thrive's script exits 1.
- It ends with the realpath entry guard `plan/commit.mjs` uses, and exports `listEnvKeys(text)` for the test.

`scripts/ai-skills/env-keys.test.ts` ports thrive's `scripts/hooks/secrets-gate/env-keys.test.mjs` minus "the script is executable" and "a plain dotenv file prints its keys on a host with no realpath", spawning the module with `process.execPath`, and changes "a missing file exits 1" to exit 2.

### T8: Port the secrets gate

- files: scripts/ai-skills/hooks/secrets-gate.mjs, scripts/ai-skills/hooks/secrets-gate.d.mts, scripts/ai-skills/secrets-gate.test.ts, .ai-skills/config.schema.json
- proof: pnpm exec tsx --test scripts/ai-skills/secrets-gate.test.ts scripts/ai-skills/plan-config-schema.test.ts && pnpm run prism:check-types
- proof fails on main: yes
- depends on: T2, T7

Owner: Clove. Port thrive's `scripts/hooks/secrets-gate/hook.mjs` as `scripts/ai-skills/hooks/secrets-gate.mjs`, keeping its three arms: `Read` on the file path, `Grep` on its `path` and `glob` plus `git ls-files -co --exclude-standard` under the search root (a gitignored root walked on disk to 5,000 entries), and the shell arm over `walkSegments`. Changes beyond the Ports convention:

- **Dropped.** The container env-dump arm, `ENV_DUMP_REASON`, every Docker and compose branch, and Cursor's `beforeReadFile`.
- **Shell calls.** Read through `readShellCall` from `harnesses.mjs`. Deny with `writeStdout(HARNESSES[tool].emitDeny(reason))`.
- **The remedy form.** `ENV_KEYS_RELATIVE` goes. The runtime's own copy is `fileURLToPath(new URL("./env-keys.mjs", import.meta.url))`. The exempt command is exactly one segment whose argv is `node`, a word whose `realpathSync.native` equals that copy's, and one file word, with no redirect, pipe, assignment, or substitution.
- **Deny text.** `Secret files stay unread. Run node <rel>/env-keys.mjs <file> for key names, or read .env.example.`, with `<rel>` the runtime directory relative to `git rev-parse --show-toplevel` from the call's `cwd`, with `/` separators. Outside a git repo, `<rel>` is the runtime directory's absolute path.
- **`secretPaths`.** `.ai-skills/config.json` at the toplevel is read once per call. An absent key adds nothing. An array of strings adds each entry, compiled with `compileMatcher` from `./lib/match.mjs`, matched against the lowercased repo-relative path with the pattern lowercased too. Any other value, or a config that does not parse, keeps the built-ins alone and writes one stderr line: `secrets-gate: secretPaths in .ai-skills/config.json is not a list of strings; using the built-in patterns.` A built-in is never removed.
- **Switches.** The header gains one sentence: it reads neither kill switch, because a secrets path an agent can turn off is not a control.
- **Schema.** `.ai-skills/config.schema.json` gains, after `importAliases`: `"secretPaths": { "type": "array", "items": { "type": "string" }, "description": "Extra paths the secrets gate denies, beside its built-in patterns, which it always keeps. Patterns use the manifest route syntax and match without regard to case.", "examples": [["config/credentials/**"]] }`.

`scripts/ai-skills/secrets-gate.test.ts` ports thrive's `scripts/hooks/secrets-gate/hook.test.mjs` minus the Cursor, container, env-dump, and executable cases, with `scripts/env-keys.sh` read as `node <runtime>/env-keys.mjs`, where `<runtime>` is `fileURLToPath(new URL("./hooks/", import.meta.url)).split(path.sep).join("/")`, the forward-slash spelling `approve-guard.test.ts` builds as `APPROVE_COMMAND_PATH`. On `windows-latest` `fileURLToPath` returns backslashes, and `tokenize` reads a `\` in a command string as an escape. Add:

- **"secrets gate leg 1: a Read of .env is denied and the deny names the env-keys form"**, whose reason holds `env-keys.mjs .env` or `env-keys.mjs <file>`.
- **"secrets gate leg 2: with only .env.example on disk, a Read of it passes"**.
- **"secrets gate leg 3: the remedy run through the spawned gate passes and prints key names only"**. The spawned gate writes nothing for `node <runtime>/env-keys.mjs .env`, then running that command prints `API_KEY` and not the value from a seeded `.env` holding `API_KEY=sk-test-123`.
- **"secretPaths adds a pattern and keeps every built-in"**, with `["config/creds/**"]`: a Read of `config/creds/a.json` and a Read of `.env` both deny.
- **"a secretPaths that is not a list keeps the built-ins and writes one stderr line"**.
- **"either kill switch leaves the deny in place"**, spawning leg 1's payload with each switch set to `1`.
- The fail-open case from the Failure convention.

### T9: Deliver and register the secrets gate, and pin every registration

- files: scripts/ai-skills/update.ts, scripts/ai-skills/doctor.ts, scripts/ai-skills/doctor.test.ts, scripts/ai-skills/plan-runtime-delivery.test.ts, templates/install/.claude/settings.json, templates/install/.codex/hooks.json, .claude/settings.json, scripts/ai-skills/hook-registrations.test.ts
- proof: pnpm exec tsx --test scripts/ai-skills/hook-registrations.test.ts scripts/ai-skills/plan-runtime-delivery.test.ts scripts/ai-skills/approve-guard-registration.test.ts scripts/ai-skills/update.test.ts scripts/ai-skills/doctor.test.ts && pnpm run prism:check-types
- proof fails on main: yes
- depends on: T5, T8

Owner: Clove.

- **`update.ts`.** `HOOK_RUNTIME_FILES` gains `"secrets-gate.mjs"` and `"env-keys.mjs"` after `"approve-guard.mjs"`. `HOOK_RUNTIME_ENTRY_POINTS` gains `"secrets-gate.mjs"`. In `PRISM_HOOK_COMMAND_PATTERN` and `PRISM_CODEX_HOOK_COMMAND_PATTERN`, `(?:hook|git-gates|approve-guard)` becomes `(?:hook|git-gates|approve-guard|secrets-gate)`, so an update claims the new entry as PRISM's.
- **`doctor.ts`.** `HOOK_COMMAND_PATH_RE`'s alternation gains `|secrets-gate`, so a registration naming a missing `secrets-gate.mjs` is reported dead.
- **Registrations.** Append one `PreToolUse` group to each file:
  - `templates/install/.claude/settings.json`: matcher `Read|Grep|Bash|PowerShell`, command `node "$CLAUDE_PROJECT_DIR/.claude/hooks/secrets-gate.mjs" --tool=claude --event=PreToolUse`, `"timeout": 21` on the hook object.
  - `templates/install/.codex/hooks.json`: matcher `^Bash$`, command `node ".claude/hooks/secrets-gate.mjs" --tool=codex --event=PreToolUse`, `"timeout": 21`.
  - `.claude/settings.json`: the Claude group with `scripts/ai-skills/hooks/` in place of `.claude/hooks/`.
- **`plan-runtime-delivery.test.ts`.** Insert `".claude/hooks/secrets-gate.mjs",` and `".claude/hooks/env-keys.mjs",` directly above its `".claude/hooks/approve-guard.mjs",` line.
- **`doctor.test.ts`.** Append **"runDoctor reports a registration naming a secrets-gate.mjs that is not on disk"**, built like the existing dead-registration case.
- **`scripts/ai-skills/hook-registrations.test.ts`**, new. Header JSDoc: it pins every hook registration in the two install templates and PRISM's own `.claude/settings.json`, by event, matcher, command, and timeout, because each gate's own suite cannot see whether a host calls it, and the existing entries carry no timeout so that adding one later is a visible change. It flattens each file's `hooks` into rows `{ event, matcher?, command, timeout? }`, keeping an absent key absent, and asserts each file's rows `deepEqual` a table written in the test, in file order. PRISM's own `UserPromptSubmit` row is compared by `command.startsWith('f="$CLAUDE_PROJECT_DIR/scripts/ai-skills/hooks/approve-guard.mjs"')`. Two more cases: every template command matches `PRISM_HOOK_COMMAND_PATTERN` or `PRISM_CODEX_HOOK_COMMAND_PATTERN`, and every runtime file a command names exists under `scripts/ai-skills/hooks/`.

### T10: Document the secrets gate and the delivered remedy

- files: .prism/architect/_toolkit/hook-runtime.md, templates/install/.prism/architect/_toolkit/hook-runtime.md, .claude/architect/_toolkit/hook-runtime.md, .codex/architect/_toolkit/hook-runtime.md, .cursor/architect/_toolkit/hook-runtime.md, docs/what-prism-writes.md, docs/adopting-into-existing-repos.md, docs/ai-skills/compatibility.md, .prism/rules/verification-commands.md, templates/install/.prism/rules/verification-commands.md, .claude/rules/verification-commands.md, .codex/rules/verification-commands.md, .cursor/rules/verification-commands.mdc
- proof: pnpm exec tsx scripts/ai-skills/build.ts --check && pnpm run prism:crossref-lint && grep -q '### Secrets gate' .prism/architect/_toolkit/hook-runtime.md && grep -q '### Secrets gate' templates/install/.prism/architect/_toolkit/hook-runtime.md && grep -q 'secrets-gate.mjs' docs/what-prism-writes.md && ! grep -q 'turns every hook off' .prism/rules/verification-commands.md templates/install/.prism/rules/verification-commands.md
- depends on: T6, T9

Owner: Eli. Every claim here is checked against `secrets-gate.mjs` and `env-keys.mjs` as T7 and T8 wrote them, per `architect-doc-verification.md`.

- `hook-runtime.md`, Delivery path: "`hook.mjs`, `git-gates.mjs`, and `approve-guard.mjs` are the three entry points, and all three get the executable bit." becomes "Each entry point in `HOOK_RUNTIME_ENTRY_POINTS` gets the executable bit: `hook.mjs`, `git-gates.mjs`, `approve-guard.mjs`, and the gates below." Add after it: "`env-keys.mjs` is the secrets gate's remedy and runs as `node <file>`."
- `hook-runtime.md`, Switches: append "The secrets gate reads neither, for the same reason ([ref: Secrets gate])."
- `hook-runtime.md`: a new `### Secrets gate` section after `### Approve guard`, covering, one short paragraph each: what it denies (the built-in patterns, matched without regard to case, and a search whose root holds one); `secretPaths`, which adds and never removes, and a malformed value keeping the built-ins; the one exempt form and the deny text; the registration (Claude `Read|Grep|Bash|PowerShell`, Codex `^Bash$`, timeout 21) and that Codex reads files through the shell; that it reads neither switch and fails open on its own crash; and that its known misses live in the header of `secrets-gate.mjs`.
- The twin gets the same edits with ADR links dropped.
- `docs/what-prism-writes.md`: a row after the `approve-guard.mjs` row, "`.claude/hooks/secrets-gate.mjs`, `.claude/hooks/env-keys.mjs` | The secrets gate, which denies an agent reading, searching, or shell access to `.env` files, `secrets/` folders, and `.pem` and `.key` files, and `env-keys.mjs`, which prints a dotenv file's key names and never a value. They arrive on every install, and the gate fires where `.claude/settings.json` or `.codex/hooks.json` registers it. Same replace rule as the row above". In the `.claude/settings.json` row, "identified by the `.claude/hooks/hook.mjs`, `git-gates.mjs`, or `approve-guard.mjs` command path" becomes "identified by the command path of a PRISM entry point under `.claude/hooks/`".
- `docs/adopting-into-existing-repos.md`, the note: "identified by the `.claude/hooks/hook.mjs` or `git-gates.mjs` command path" becomes "identified by the command path of a PRISM entry point under `.claude/hooks/`".
- `docs/ai-skills/compatibility.md`, after the paragraph on the two opt-in git gates: "The same runtime carries a secrets gate, on by default. It denies an agent reading `.env` files, `secrets/` folders, and key files, and points it at `env-keys.mjs`, which prints key names only. No kill switch turns it off."
- Set `last_updated` on each `docs/` page to the build date, and run `pnpm prism:build`.
- `.prism/rules/verification-commands.md` line 105, and the same sentence at line 95 of its curated twin `templates/install/.prism/rules/verification-commands.md`, edited by hand: replace "Both are off until set; `PRISM_HOOK_DISABLE=1` turns every hook off for a session." with "Both are off until set. `PRISM_HOOK_DISABLE=1` turns off every hook for a session except the secrets gate and the approve guard, which ignore it." The build rewrites the three platform copies.

### T11: Port the commit gate's command parser

- files: scripts/ai-skills/hooks/commit-gate/parse.mjs, scripts/ai-skills/hooks/commit-gate/parse.d.mts, scripts/ai-skills/commit-gate-parse.test.ts
- proof: pnpm exec tsx --test scripts/ai-skills/commit-gate-parse.test.ts && pnpm run prism:check-types
- proof fails on main: yes
- depends on: T10

Owner: Clove. Port thrive's `scripts/hooks/commit-gate/parse.mjs`, with its deny ids and remedies as written: `all`, `include`, `no-paths`, `no-verify`, `hooks-path`, `expanded-paths`, `magic-pathspec`, `multiple-commits`, and the push pair. Changes:

- **The commit script.** thrive's `commit.sh` form becomes a `node` segment whose first operand resolves, through `realpathSync.native` from the segment's `cwd`, to `plan/commit.mjs` under the runtime directory, which is `path.dirname(path.dirname(fileURLToPath(import.meta.url)))`. Its next operand is the subject and the rest are paths. A path that does not resolve leaves the segment unread as a commit. `form` reads `"commit.mjs"`.
- **Magic pathspecs.** Only a `git commit` path starting with `:` gets the `magic-pathspec` deny, because `commit.mjs` passes `--literal-pathspecs`.
- **`kill-switch`.** A new deny id, judged on every segment of any command: an `assignments` entry starting `PRISM_HOOK_DISABLE=` or `PRISM_HOOK_DENY_DISABLE=`, or an argv whose head is `export`, `declare`, `typeset`, or `readonly` with an operand equal to either name or starting with either name followed by `=`. Export `readKillSwitch(command, sessionCwd)` returning `{ id: "kill-switch", flag }` or `null`. Remedy: `Leave PRISM_HOOK_DISABLE and PRISM_HOOK_DENY_DISABLE to the person; run the command without them.`
- Deny text keeps the shape `Commit gate (<check>): <reason> <remedy>`.

`scripts/ai-skills/commit-gate-parse.test.ts` ports thrive's `parse.test.mjs` with `scripts/plan/commit.sh` rewritten to `node <runtime>/plan/commit.mjs`, where `<runtime>` is the absolute path `fileURLToPath(new URL("./hooks/", import.meta.url)).split(path.sep).join("/")` from the test file, spelled with forward slashes as in T8 because `tokenize` reads a `\` as an escape, so the script word resolves through `realpathSync.native` to the runtime's own `plan/commit.mjs`. A copy of the script in a temp dir resolves to itself and reads no commit, and a symlink needs privileges on `windows-latest`, so the fixture uses neither. The commit's paths still resolve against the temp fixture repo, passed as the segment cwd. Add: a `commit.mjs` call with a `:` path reads no `magic-pathspec` deny; a `node other.mjs "T1: x" a` call reads no commit; and the kill-switch rows `PRISM_HOOK_DISABLE=1 git commit -m x a`, `export PRISM_HOOK_DENY_DISABLE=1; ls`, `env PRISM_HOOK_DISABLE=1 ls`, and `readonly PRISM_HOOK_DISABLE` each read `kill-switch`, while `echo PRISM_HOOK_DISABLE` reads `null`.

### T12: Port the commit gate's would-be tree

- files: scripts/ai-skills/hooks/commit-gate/tree.mjs, scripts/ai-skills/hooks/commit-gate/tree.d.mts, scripts/ai-skills/commit-gate-tree.test.ts
- proof: pnpm exec tsx --test scripts/ai-skills/commit-gate-tree.test.ts && pnpm run prism:check-types
- proof fails on main: yes
- depends on: T10

Owner: Clove. Port thrive's `scripts/hooks/commit-gate/tree.mjs`: `buildWouldBeIndex(repoRoot, paths)` and `runGit(cwd, args, options)`, with a temp `GIT_INDEX_FILE` under `os.tmpdir()`, `git read-tree HEAD`, `git add -A -- <paths>`, the changed paths from `git diff --cached --name-only --no-renames -z HEAD`, cleanup in a `finally`, and a 5,000 ms limit per git call. One change: `buildWouldBeIndex(repoRoot, paths, { literal = false } = {})` passes `--literal-pathspecs` before the subcommand on every git call that builds the index when `literal` is true.

`scripts/ai-skills/commit-gate-tree.test.ts` ports thrive's `tree.test.mjs`, with thrive's `test-helpers.mjs` (`git`, `write`, `read`, `GIT_ENV`) written as local functions in the test file, plus **"a sibling's staged file is not in the would-be tree and the shared index is unchanged"**: stage `b.txt`, build the index for `["a.txt"]`, assert its changed paths are `["a.txt"]`, and assert `git diff --cached --name-only` still prints `b.txt` alone. Add **"literal mode reads a path holding a glob character as itself"** with a file named `x*.txt`.

### T13: Port the commit gate's subject, stop-path, and weakened-test checks, with testGlobs

- files: scripts/ai-skills/hooks/commit-gate/checks.mjs, scripts/ai-skills/hooks/commit-gate/checks.d.mts, scripts/ai-skills/hooks/commit-gate/test-guard.mjs, scripts/ai-skills/hooks/commit-gate/test-guard.d.mts, scripts/ai-skills/commit-gate-checks.test.ts, scripts/ai-skills/commit-gate-test-guard.test.ts, .ai-skills/config.schema.json, .ai-skills/config.json
- proof: pnpm exec tsx --test scripts/ai-skills/commit-gate-checks.test.ts scripts/ai-skills/commit-gate-test-guard.test.ts scripts/ai-skills/plan-config-schema.test.ts && pnpm run prism:check-types
- proof fails on main: yes
- depends on: T8, T12

Owner: Clove. Port thrive's `checks.mjs` and `test-guard.mjs`. Changes:

- **Branch to plan.** `TICKET_IN_BRANCH` goes. `loadContext` reads the branch with `git symbolic-ref --short -q HEAD` and the plan with `findPlanForBranch(repoRoot, branch)` from `../compact-handoff.mjs`. The branch is a folder-plan branch when the resolved path's basename is in `CHAIN_FILES` and its parent's parent is `.prism/plans`. Anything else gets no subject, stop-path, or weakened-test check.
- **Config.** `readPlanConfig(repoRoot)` from `../plan/tasks.mjs` returns the raw config, or `null` when no file exists, and throws `PlanConfigError` on a file that does not parse. Read `ticketPrefix` off it as `typeof config?.ticketPrefix === "string" ? config.ticketPrefix : null`, and `defaultBranch` as a non-empty string or `main`, the same reads `tasks.mjs` makes at its line 349. Call it before `findPlanForBranch`: that function swallows a config it can't parse and returns `null`, so a later read would let a broken config pass as a non-plan branch instead of denying. A `PlanConfigError`, or an error from `resolveStopPaths` or `resolveTestGlobs`, becomes a deny `Commit gate (config): <message> Fix .ai-skills/config.json, then commit again.`, so the gate never skips a check on a config it can't read.
- **Subject.** `parseSubject(subject, ticketPrefix)` from `../plan/tasks.mjs` must read a task form, `plan:`, or `retro:`.
- **`PLANS_PREFIX`** is `.prism/plans/`. A `plan:` commit may touch only the branch's plan folder.
- **`RETRO_PATHS`** is the branch's plan folder plus `.prism/retros/`, `.prism/lessons.md`, `.prism/archived/lessons-archive.md`, `.prism/metrics/review-misses.jsonl`, `.prism/architect/`, `.prism/spec/adrs/`, and `.prism/rules/`, and the generated copies a promotion commits beside them: `.claude/`, `.codex/`, and `.cursor/` each followed by `architect/`, `rules/`, and `spec/adrs/`, plus `AGENTS.md` and `templates/install/.prism/`. Add a case to `commit-gate-checks.test.ts`: **"a retro: commit touching .claude/rules/x.md, AGENTS.md, and templates/install/.prism/rules/x.md passes"**.
- **Stop paths.** `resolveStopPaths(config)` and `matchStopPath` from `../plan/stop-paths.mjs`. A dependency path counts only when its dependency entries change: for `package.json` and `composer.json`, compare the parsed `dependencies`, `devDependencies`, `peerDependencies`, and `optionalDependencies` (and `require` and `require-dev` for `composer.json`) between `HEAD` and the would-be index with `git show`. Any other dependency file counts on any change.
- **Weakened tests.** `MAIN_REF` becomes `origin/<defaultBranch>`. A removed line counts when its file matches `testGlobs` and `git blame` dates it before `git merge-base origin/<defaultBranch> HEAD`. thrive's flat-plan allowance goes.
- **`resolveTestGlobs(config)`**, exported from `test-guard.mjs`: an absent `testGlobs` gives `DEFAULT_TEST_GLOBS`, `["*.test.*", "**/*.test.*", "*.spec.*", "**/*.spec.*", "__tests__/**", "**/__tests__/**", "test/**", "**/test/**", "tests/**", "**/tests/**"]`. A set array of strings replaces it. A value that is not an array of strings, or an entry holding `{`, throws an `Error` naming `testGlobs`.
- **Schema.** `.ai-skills/config.schema.json` gains, after `secretPaths`: `"testGlobs": { "type": "array", "items": { "type": "string" }, "description": "The test files the commit gate's weakened-test check reads. A list that is set replaces the default, which covers common test names at the root and at any depth. Braces are not supported.", "examples": [["src/**/*.test.ts"]] }`.
- **`.ai-skills/config.json`** gains `"testGlobs": ["scripts/ai-skills/*.test.ts"]` after `"hooks"`.

The two test files port thrive's `checks.test.mjs` and `test-guard.test.mjs`, with fixture plans under `.prism/plans/prism-9/` on a branch `u/prism-9-x` and a config whose `ticketPrefix` is `PRISM`. Add: a `retro:` commit touching `.prism/review/x.md` denies; a `retro:` commit touching `.prism/rules/x.md` passes; `resolveTestGlobs` returns the default for an absent key, the list for a set one, and throws on `"x"`, `[1]`, and `["{a,b}.ts"]`; a config that does not parse denies with the config check; and a flat-plan branch gets no subject check.

### T14: Port the commit gate's entry point

- files: scripts/ai-skills/hooks/commit-gate.mjs, scripts/ai-skills/hooks/commit-gate.d.mts, scripts/ai-skills/commit-gate.test.ts
- proof: pnpm exec tsx --test scripts/ai-skills/commit-gate.test.ts && pnpm run prism:check-types
- proof fails on main: yes
- depends on: T11, T12, T13

Owner: Clove. Port thrive's `scripts/hooks/commit-gate/hook.mjs` as `scripts/ai-skills/hooks/commit-gate.mjs`. Changes:

- **Order.** The kill-switch deny from `readKillSwitch` runs first on every command, then the push and commit flag denies, all before any config read.
- **Shell calls** come from `readShellCall`, denies go out through `writeStdout(HARNESSES[tool].emitDeny(reason))`, and `declineForeignPayload` goes.
- **`MANIFEST`** is `.prism/architect/manifest.json`, and `findThriveRoot` becomes a `git rev-parse --show-toplevel` from the commit's directory whose result holds that manifest. A repo without it passes.
- **`commit.mjs` calls** build the index with `{ literal: true }`.
- `outsideThriveRepo` is renamed `outsidePrismRepo`.

`scripts/ai-skills/commit-gate.test.ts` ports thrive's `hook.test.mjs` with `commit.sh` read as `node <runtime>/plan/commit.mjs`, `<runtime>` spelled with forward slashes as in T11, plus:

- **"commit gate leg 1: git commit -a is denied with the all reason"**.
- **"commit gate leg 2: with a staged sibling file and a folder plan whose T1 lists a.txt, commit.mjs naming a.txt with subject T1: x passes"**. In-process `runGate`.
- **"commit gate leg 3: the remedy commit.mjs passes the spawned gate and commits only the named path"**. Spawn the gate on `node <runtime>/plan/commit.mjs "T1: x" a.txt`, assert empty stdout, run that command, and assert `git show --name-only --format= HEAD` prints `a.txt` and `git diff --cached --name-only` still prints the sibling.
- **"a command that sets a kill switch inline is denied"**, and the switch cases and fail-open case from the Failure convention.

### T15: Deliver and register the commit gate

- files: scripts/ai-skills/update.ts, scripts/ai-skills/doctor.ts, scripts/ai-skills/doctor.test.ts, scripts/ai-skills/plan-runtime-delivery.test.ts, templates/install/.claude/settings.json, templates/install/.codex/hooks.json, .claude/settings.json, scripts/ai-skills/hook-registrations.test.ts
- proof: pnpm exec tsx --test scripts/ai-skills/hook-registrations.test.ts scripts/ai-skills/plan-runtime-delivery.test.ts scripts/ai-skills/update.test.ts scripts/ai-skills/doctor.test.ts && pnpm run prism:check-types
- depends on: T9, T14
- behavior change: `hook-registrations.test.ts`'s three expected tables gain the commit gate's row, so the line closing each `PreToolUse` block changes.

Owner: Clove.

- `HOOK_RUNTIME_FILES` gains `"commit-gate.mjs"`, `"commit-gate/parse.mjs"`, `"commit-gate/checks.mjs"`, `"commit-gate/test-guard.mjs"`, and `"commit-gate/tree.mjs"`. `HOOK_RUNTIME_ENTRY_POINTS` gains `"commit-gate.mjs"`. Both command patterns gain `|commit-gate`, and so does `HOOK_COMMAND_PATH_RE`.
- Append a `PreToolUse` group: Claude template matcher `Bash|PowerShell`, command `node "$CLAUDE_PROJECT_DIR/.claude/hooks/commit-gate.mjs" --tool=claude --event=PreToolUse`, `"timeout": 21`; Codex template matcher `^Bash$`, command `node ".claude/hooks/commit-gate.mjs" --tool=codex --event=PreToolUse`, `"timeout": 21`; PRISM's own with `scripts/ai-skills/hooks/`.
- `plan-runtime-delivery.test.ts`: insert the five `.claude/hooks/` paths above its `approve-guard.mjs` line.
- `doctor.test.ts`: append the dead-registration case for `commit-gate.mjs`.
- `hook-registrations.test.ts`: add the commit gate's row to each table.

### T16: Make git-conventions and ADR-0081 true for the commit gate

- files: .prism/rules/git-conventions.md, templates/install/.prism/rules/git-conventions.md, .claude/rules/git-conventions.md, .codex/rules/git-conventions.md, .cursor/rules/git-conventions.mdc, AGENTS.md, .prism/spec/adrs/_toolkit/0081-git-hooks-ship-beside-the-agent-gates.md, .claude/spec/adrs/_toolkit/0081-git-hooks-ship-beside-the-agent-gates.md, .codex/spec/adrs/_toolkit/0081-git-hooks-ship-beside-the-agent-gates.md, .cursor/spec/adrs/_toolkit/0081-git-hooks-ship-beside-the-agent-gates.md, .prism/spec/adrs/_toolkit/README.md, .claude/spec/adrs/_toolkit/README.md, .codex/spec/adrs/_toolkit/README.md, .cursor/spec/adrs/_toolkit/README.md
- proof: pnpm exec tsx scripts/ai-skills/build.ts --check && pnpm run prism:crossref-lint && pnpm exec tsx --test scripts/ai-skills/agents-md-budget.test.ts && grep -q '`--no-verify`: never use' .prism/rules/git-conventions.md && grep -q '`--no-gpg-sign`: never use unless the user explicitly asks' .prism/rules/git-conventions.md && ! grep -q 'until the commit gate lands' .prism/spec/adrs/_toolkit/README.md
- depends on: T15

Owner: Clove (spec content, under `writing-voice.md`).

- `.prism/rules/git-conventions.md`, Force Push Policy: replace `- \`--no-verify\` and \`--no-gpg-sign\`: never use unless the user explicitly asks` with two lines: `- \`--no-verify\`: never use. The commit gate denies it on \`git commit\` and \`git push\`, because a skipped hook protects nothing.` and `- \`--no-gpg-sign\`: never use unless the user explicitly asks`.
- ADR-0081: add under the existing `> Amended 2026-11-18 …` note, with one blank `>` line between: `> Amended <build date> by PRISM-544 (\`.prism/plans/prism-544/plan.md\`, task T16): the commit gate now denies \`--no-verify\` and an inline \`core.hooksPath\` for agents, on \`git commit\` and \`git push\`, so the Consequences line about \`--no-verify\` no longer holds for an agent. A person can still pass it.` The Consequences line stays as written.
- `.prism/spec/adrs/_toolkit/README.md`, the 0081 row: replace "`--no-verify` still skips them until the commit gate lands, and Cursor-only consumers get none." with "The commit gate denies `--no-verify` for agents, and Cursor-only consumers get none." The seed twin has no 0081 row, so it needs no edit.
- Run `pnpm prism:build` and record in `## History` where the lead set ends.

### T17: Document the commit gate and rename the cleanup-pass hold

- files: .prism/architect/_toolkit/hook-runtime.md, templates/install/.prism/architect/_toolkit/hook-runtime.md, .claude/architect/_toolkit/hook-runtime.md, .codex/architect/_toolkit/hook-runtime.md, .cursor/architect/_toolkit/hook-runtime.md, .prism/architect/_toolkit/git-hooks.md, templates/install/.prism/architect/_toolkit/git-hooks.md, .claude/architect/_toolkit/git-hooks.md, .codex/architect/_toolkit/git-hooks.md, .cursor/architect/_toolkit/git-hooks.md, docs/what-prism-writes.md, docs/adopting-into-existing-repos.md, docs/ai-skills/compatibility.md
- proof: pnpm exec tsx scripts/ai-skills/build.ts --check && pnpm run prism:crossref-lint && grep -q '### Commit gate' .prism/architect/_toolkit/hook-runtime.md && grep -q 'cleanup-pass hold' .prism/architect/_toolkit/git-hooks.md && ! grep -q 'the commit cleanup pass' .prism/architect/_toolkit/git-hooks.md && grep -q 'commit-gate.mjs' docs/what-prism-writes.md
- depends on: T10, T16

Owner: Eli. Every claim is checked against `commit-gate.mjs` and `commit-gate/*.mjs` as T11 to T14 wrote them.

- **The rename.** In the Git gates section of `hook-runtime.md`, "The commit gate holds the first `git commit`" becomes "The cleanup-pass hold holds the first `git commit`", and every later "commit gate" in that section becomes "cleanup-pass hold". Append to the section: "ADR-0076 calls the hold \"the commit gate\". The commit gate is now the separate gate below." In `git-hooks.md`, the opening line's "the commit cleanup pass" becomes "the cleanup-pass hold".
- **`git-hooks.md`, the limits paragraph.** Replace "The skip assumes the git hook ran, and an agent that passes `--no-verify` to `git commit` or `git push` skips the hook while the push gate still believes it ran." with "The skip assumes the git hook ran. The commit gate denies an agent's `--no-verify` on `git commit` and `git push`, so only a person can skip the hook that way."
- **`hook-runtime.md`, a new `### Commit gate` section** after `### Secrets gate`: the flag denies, which hold on every branch and run before any config read, and the kill-switch deny; the folder-plan checks (subject, `plan:` and `retro:` path sets, weakened tests through `testGlobs`, stop paths with `new dependency:`); that a config error denies rather than skips; the temporary index and the 5 s limit per git call; that it reads `commit.mjs` calls through the native realpath and builds their index with `--literal-pathspecs`; that a merge, cherry-pick, or revert runs only the flag denies, and a repo without `.prism/architect/manifest.json` passes; the registration (Claude `Bash|PowerShell`, Codex `^Bash$`, timeout 21); and that the known misses live in the headers of `commit-gate.mjs` and `commit-gate/parse.mjs`.
- **Switches** in `hook-runtime.md`: "`PRISM_HOOK_DENY_DISABLE=1` is the narrower switch: it turns off both the write gate and the git gates while leaving announcements on." becomes "`PRISM_HOOK_DENY_DISABLE=1` is the narrower switch: it turns off every deny but the secrets gate's and the approve guard's, and leaves announcements on." Append: "The commit gate denies a command that sets either switch inline, so an agent cannot turn a gate off on its own command."
- The twin gets the same edits, with ADR names dropped.
- `docs/what-prism-writes.md`: a row after the secrets-gate row, "`.claude/hooks/commit-gate.mjs`, `.claude/hooks/commit-gate/*.mjs` | The commit gate, which denies an agent's commit that sweeps the whole tree, bypasses hooks, or sets a kill switch, and on a plan-folder branch a commit whose subject or files don't match its task. Same replace rule as the row above".
- `docs/ai-skills/compatibility.md` and `docs/adopting-into-existing-repos.md`: rename "commit-time cleanup pass" to "cleanup-pass hold" where it appears, and add after the secrets-gate sentence in `compatibility.md`: "A commit gate, on by default, denies an agent's `--no-verify`, a whole-tree commit, and a commit that sets a kill switch, and on a plan-folder branch checks each commit against its task."
- Set `last_updated` on each `docs/` page and run `pnpm prism:build`.

### T18: Add the gated flag to roles.json

- files: .ai-skills/definitions/roles.json, scripts/ai-skills/generate-skills.ts, scripts/ai-skills/discovery-metadata.test.ts
- proof: pnpm exec tsx --test scripts/ai-skills/discovery-metadata.test.ts && pnpm run prism:check-types && pnpm exec tsx scripts/ai-skills/build.ts --check
- proof fails on main: yes
- depends on: none

Owner: Clove.

- `RoleDefinition` gains `/** True for a role a plan-folder run dispatches as a subagent, whose brief the brief gate holds to a path brief. */ gated?: boolean;` after `preloads`.
- In `buildRoleMap`, after the routing check: when `role.gated !== undefined && typeof role.gated !== "boolean"`, throw `Role '${role.id}' in .ai-skills/definitions/roles.json has a non-boolean gated value — use true, false, or omit it.`
- `roles.json`: add `"gated": true` to `prism-spec`, `prism-challenge`, `prism-verify`, `prism-implement`, `prism-docs`, and `prism-pr-review`, after each entry's `routing`. `prism-architect` stays ungated.
- `discovery-metadata.test.ts`: append **"buildRoleMap rejects a non-boolean gated value"** with `gated: "yes"`, and **"buildRoleMap accepts a boolean gated value"**.

The flag renders into no generated file, which the proof's `build.ts --check` shows by finding no drift. The proof runs no full suite, because T1's test fails on purpose until T3 lands and T18 may run first.

### T19: Port the brief gate and the hook log

- files: scripts/ai-skills/hooks/brief-gate.mjs, scripts/ai-skills/hooks/brief-gate.d.mts, scripts/ai-skills/hooks/lib/hook-log.mjs, scripts/ai-skills/hooks/lib/hook-log.d.mts, scripts/ai-skills/brief-gate.test.ts, scripts/ai-skills/generate-skills.ts
- proof: pnpm exec tsx --test scripts/ai-skills/brief-gate.test.ts && pnpm run prism:check-types
- proof fails on main: yes
- depends on: T2, T17, T18

Owner: Clove.

- **`lib/hook-log.mjs`**, new: `export function appendHookLog(cwd, entry)` resolves `git rev-parse --absolute-git-dir` from `cwd` with `execFileSync` and a 5,000 ms timeout, and appends `JSON.stringify(entry) + "\n"` to `prism-hooks.jsonl` there. Every error is swallowed, because the log is a record and never a reason to fail the call. Its JSDoc says the git directory keeps the log out of the working tree with no `.gitignore` line, as the chat approval token is kept.
- **`brief-gate.mjs`**, a port of thrive's `scripts/hooks/brief-gate/hook.mjs`, keeping `MAX_LINES = 15`, `OVERRIDE_PATTERNS`, and `denyReason` as written. `ROLES_FILE` and `gatedTypes` go, replaced by `export const GATED_ROLES = new Set(["prism-spec", "prism-challenge", "prism-verify", "prism-implement", "prism-docs", "prism-pr-review"]);` with a comment saying a consumer has no `roles.json` on disk and the test holds the set equal to the `gated: true` roles. The dispatch comes from `HARNESSES[tool].subagentDispatch(payload)`. A repo with no `.prism/architect/manifest.json` above `payload.cwd` passes. On Codex a would-be deny writes `appendHookLog(cwd, { ts, hook: "brief-gate", tool, note: "would-deny", type, lines })` and nothing to stdout, since Codex cannot block at subagent start. On Claude the deny goes out through `writeStdout(HARNESSES.claude.emitDeny(reason))`.

`scripts/ai-skills/brief-gate.test.ts` ports thrive's `hook.test.mjs` minus its Cursor cases, plus:

- **"GATED_ROLES equals the gated roles in roles.json"**, reading `.ai-skills/definitions/roles.json` and comparing the sorted IDs.
- **"brief gate leg 1: a 16-line brief to prism-implement is denied and names the cause"**.
- **"brief gate leg 2: with the content seeded into the plan, a 4-line path brief passes"**.
- **"brief gate leg 3: a brief built from the deny's own instructions passes the spawned gate"**: the plan folder, two task IDs, a worktree path, and a report shape on four lines.
- **"a long brief to prism-architect passes"**, **"Codex logs a would-deny row and writes nothing"**, reading `prism-hooks.jsonl` from the fixture's git directory, and the switch and fail-open cases.
- In `scripts/ai-skills/generate-skills.ts`, the `gated` field's comment reads "the brief gate, when it ships, reads as a path brief". Replace "the brief gate, when it ships, reads" with "the brief gate reads", since this task ships it.
- In the same comment, "a role a plan-folder run dispatches as a subagent" is narrower than the gated set, which also covers `prism-architect`. Reword it to say the flag marks a role whose dispatch brief the brief gate checks.

### T20: Port the reconcile gate

- files: scripts/ai-skills/hooks/reconcile-gate.mjs, scripts/ai-skills/hooks/reconcile-gate.d.mts, scripts/ai-skills/reconcile-gate.test.ts, .ai-skills/skills/prism-pr-review/shared.md, .claude/agents/prism-pr-review.md, .claude/skills/prism-pr-review/SKILL.md, .cursor/skills/prism-pr-review/SKILL.md, .codex/agents/prism-pr-review.toml
- proof: pnpm exec tsx --test scripts/ai-skills/reconcile-gate.test.ts scripts/ai-skills/skill-loaded-lines.test.ts && pnpm run prism:check-types && pnpm exec tsx scripts/ai-skills/build.ts --check && ! git grep -q 'later reconcile gate' -- .ai-skills .claude .codex .cursor
- proof fails on main: yes
- depends on: T19

Owner: Clove. Port thrive's `scripts/hooks/reconcile-gate/hook.mjs` as `scripts/ai-skills/hooks/reconcile-gate.mjs`, keeping `runGate(payload, { tool, exec, now, stateDir })`. Changes:

- `REVIEW_AGENT` is `prism-pr-review`. `PR_LINE` is `/^prism-pr:\s*#?(\d+)$/`, and both reason strings say `prism-pr:`.
- `RECONCILE_SCRIPT` is `fileURLToPath(new URL("./review/reconcile.mjs", import.meta.url))`, run as `process.execPath` with `<script> <pr> --json` and a 90,000 ms timeout.
- `DEFAULT_STATE_DIR` is `path.join(os.tmpdir(), "prism-hooks", "reconcile")`, and the counter file is written to a `.tmp` sibling and renamed.
- `readStop` goes, replaced by `HARNESSES[tool].subagentStop(payload)` plus `payload.hook_event_name`, `payload.session_id`, and `payload.cwd`. A block goes out through `writeStdout(HARNESSES[tool].emitBlockStop(reason))`.
- After three blocks it deletes the counter, passes, and calls `appendHookLog(cwd, { ts, hook: "reconcile-gate", tool, note: "reconcile:unclean", pr })`. `MISSES_LOG` goes if nothing else reads it.

`scripts/ai-skills/reconcile-gate.test.ts` ports thrive's `hook.test.mjs` with a stub `exec`, plus:

- **"reconcile gate leg 1: an unclean report blocks and lists each item"**.
- **"reconcile gate leg 2: a counter seeded at 3 lets the stop through and logs reconcile:unclean"**.
- **"reconcile gate leg 3: a clean reconcile run through the spawned gate passes and deletes the counter"**, spawning a temp copy of the runtime that holds `reconcile-gate.mjs`, `harnesses.mjs`, and `lib/hook-log.mjs` copied from `scripts/ai-skills/hooks/`, plus a `review/reconcile.mjs` stub that prints `{}` and exits 0. `RECONCILE_SCRIPT` resolves from `import.meta.url`, so the copy runs the stub.
- **"a stop from another agent type passes"**, and the switch and fail-open cases.

**The skill line the gate makes true.** In `.ai-skills/skills/prism-pr-review/shared.md` line 54, replace "The last line is exactly `prism-pr: <n>`, which a later reconcile gate will read." with "The last line is exactly `prism-pr: <n>`, which the reconcile gate reads to find the PR." Run `pnpm prism:build` and commit the four generated copies the files list names.

### T21: Deliver and register the brief and reconcile gates

- files: scripts/ai-skills/update.ts, scripts/ai-skills/doctor.ts, scripts/ai-skills/doctor.test.ts, scripts/ai-skills/plan-runtime-delivery.test.ts, templates/install/.claude/settings.json, templates/install/.codex/hooks.json, .claude/settings.json, scripts/ai-skills/hook-registrations.test.ts
- proof: pnpm exec tsx --test scripts/ai-skills/hook-registrations.test.ts scripts/ai-skills/plan-runtime-delivery.test.ts scripts/ai-skills/update.test.ts scripts/ai-skills/doctor.test.ts && pnpm run prism:check-types
- depends on: T15, T19, T20
- behavior change: `hook-registrations.test.ts`'s three tables gain the brief and reconcile rows, so the lines closing the changed blocks change.

Owner: Clove.

- `HOOK_RUNTIME_FILES` gains `"brief-gate.mjs"`, `"reconcile-gate.mjs"`, and `"lib/hook-log.mjs"`. `HOOK_RUNTIME_ENTRY_POINTS` gains the two gates. Both command patterns and `HOOK_COMMAND_PATH_RE` gain `|brief-gate|reconcile-gate`.
- Claude template: a `PreToolUse` group matched `Agent|Task` running `node "$CLAUDE_PROJECT_DIR/.claude/hooks/brief-gate.mjs" --tool=claude --event=PreToolUse` with `"timeout": 21`, and a new `SubagentStop` event with one group matched `^prism-pr-review$` running `node "$CLAUDE_PROJECT_DIR/.claude/hooks/reconcile-gate.mjs" --tool=claude --event=SubagentStop` with `"timeout": 120`.
- Codex template: a new `SubagentStart` event, no matcher, running `node ".claude/hooks/brief-gate.mjs" --tool=codex --event=SubagentStart` with `"timeout": 21`, and a new `SubagentStop` event matched `^prism-pr-review$` running `node ".claude/hooks/reconcile-gate.mjs" --tool=codex --event=SubagentStop` with `"timeout": 120`.
- PRISM's own `.claude/settings.json`: the Claude entries with `scripts/ai-skills/hooks/`.
- `plan-runtime-delivery.test.ts`, `doctor.test.ts`, and `hook-registrations.test.ts` as in T15, for the three files and two gates.

### T22: State the path-brief shape in the workflow rule

- files: .prism/rules/workflow.md, templates/install/.prism/rules/workflow.md, .claude/rules/workflow.md, .codex/rules/workflow.md, .cursor/rules/workflow.mdc, AGENTS.md
- proof: pnpm exec tsx scripts/ai-skills/build.ts --check && pnpm exec tsx --test scripts/ai-skills/agents-md-budget.test.ts && grep -q 'in 15 lines or fewer' .prism/rules/workflow.md
- depends on: T17

Owner: Clove (spec content).

- `.prism/rules/workflow.md`: append to the end of the **Limits.** paragraph: " A brief to a gated subagent names the plan folder, the task IDs, the worktree path, and the report shape, in 15 lines or fewer. Anything longer goes into `plan.md` first."
- Run `pnpm prism:build`, measure where the lead set ends with `measureLeadSectionEnds` from `scripts/ai-skills/agents-md-block.ts`, and record the offset in `## History`. The sentence adds about 170 bytes, so the lead set lands near 31,880, under the 32,768 the budget test enforces.

### T23: Document the brief gate, the reconcile gate, the hook log, and the host limitations

- files: .prism/architect/_toolkit/hook-runtime.md, templates/install/.prism/architect/_toolkit/hook-runtime.md, .claude/architect/_toolkit/hook-runtime.md, .codex/architect/_toolkit/hook-runtime.md, .cursor/architect/_toolkit/hook-runtime.md, docs/what-prism-writes.md, docs/adopting-into-existing-repos.md, docs/ai-skills/compatibility.md
- proof: pnpm exec tsx scripts/ai-skills/build.ts --check && pnpm run prism:crossref-lint && grep -q '### Brief gate' .prism/architect/_toolkit/hook-runtime.md && grep -q '### Reconcile gate' .prism/architect/_toolkit/hook-runtime.md && grep -q 'prism-hooks.jsonl' .prism/architect/_toolkit/hook-runtime.md && grep -q 'cannot block at subagent start\|can not block at subagent start\|logs and cannot deny' .prism/architect/_toolkit/hook-runtime.md
- depends on: T17, T21, T22

Owner: Eli. Every claim is checked against `brief-gate.mjs`, `reconcile-gate.mjs`, and `lib/hook-log.mjs`.

- **`### Brief gate`**, after `### Commit gate`: the roles it gates and why `prism-architect` is not one; the 15-line limit and the override phrases; that `GATED_ROLES` is a constant a test holds equal to `roles.json`; the registration (Claude `PreToolUse` `Agent|Task`, Codex `SubagentStart`, timeout 21).
- **`### Reconcile gate`**: what it runs, the `prism-pr:` line, the three-block cap and the `reconcile:unclean` row, the counter file under the OS temp directory, and the registration (`SubagentStop` `^prism-pr-review$` on both hosts, timeout 120), with the gate's own `agent_type` check for a host that ignores the matcher.
- **The hook log**, one paragraph under State file: `prism-hooks.jsonl` in the worktree's git directory, written by the brief and reconcile gates, never in the working tree and needing no `.gitignore` line.
- **Host limitations**, one paragraph after the asymmetry paragraph: Codex cannot block at subagent start, so the brief gate logs a would-deny row there; Codex's `SubagentStart` and `SubagentStop` payload fields are documentation-read and not live-probed; whether Claude Code matches a `SubagentStop` matcher against the agent type is unverified, which the gate's own check covers; Cursor has no registration.
- **Registered events**, in the Delivery path paragraph of the Hook runtime section: replace "Both templates register `PreToolUse`, `PostToolUse`, `PostCompact`, and `UserPromptSubmit`, which only the approve guard uses ([ref: Approve guard])." with "Both templates register `PreToolUse`, `PostToolUse`, `PostCompact`, `UserPromptSubmit`, which only the approve guard uses ([ref: Approve guard]), and `SubagentStop`, which only the reconcile gate uses ([ref: Reconcile gate]). The Codex template also registers `SubagentStart`, for the brief gate." In the twin, replace "Both register `PreToolUse`, `PostToolUse`, `PostCompact`, and `UserPromptSubmit`, which only the approve guard uses." with "Both register `PreToolUse`, `PostToolUse`, `PostCompact`, `UserPromptSubmit`, which only the approve guard uses, and `SubagentStop`, which only the reconcile gate uses. The Codex template also registers `SubagentStart`, for the brief gate."
- **Switches**: the brief, commit, and reconcile gates read both switches before stdin, as `hook.mjs` does.
- The twin gets the same edits with ADR names dropped.
- `docs/what-prism-writes.md`: one row for `brief-gate.mjs`, `reconcile-gate.mjs`, and `lib/hook-log.mjs`, written in the shape of the earlier rows. `docs/ai-skills/compatibility.md`: one sentence on each gate and on Codex logging rather than denying at subagent start. `docs/adopting-into-existing-repos.md`: add `SubagentStop` to the list of registered events in the note.
- Set `last_updated` and run `pnpm prism:build`.

### T24: Warn on an architect route to a doc with no content

- files: scripts/ai-skills/doctor.ts, scripts/ai-skills/doctor.test.ts
- proof: pnpm exec tsx --test scripts/ai-skills/doctor.test.ts && pnpm run prism:check-types
- proof fails on main: yes
- depends on: T23

Owner: Clove. In `checkArchitectRoutes` in `scripts/ai-skills/doctor.ts`, after the missing-doc findings: for each doc a route in the live `manifest.json` names that exists on disk, read it, strip HTML comments (`/<!--[\s\S]*?-->/g`), and push a `warning` with `check: "architect-route"` and message `.prism/architect/<doc> is routed but holds no content besides headings and comments — write the doc or remove its route, because the write gate holds an edit until it is read.` when every remaining line is blank or starts with `#`. The JSDoc gains one sentence naming the check.

Append to `doctor.test.ts`, built like the existing route cases: **"runDoctor warns on a route to a doc holding only headings and comments"**, and **"runDoctor stays quiet on a route to a doc with one line of prose"**.

### T25: Add the architect-route step to onboarding

- files: .ai-skills/skills/prism-onboard/shared.md, .claude/skills/prism-onboard/SKILL.md, .cursor/skills/prism-onboard/SKILL.md, .codex/agents/prism-onboard.toml, .claude/agents/prism-onboard.md
- proof: pnpm run prism:build > /dev/null && pnpm exec tsx --test scripts/ai-skills/skill-loaded-lines.test.ts && grep -q 'manifest.json' .ai-skills/skills/prism-onboard/shared.md
- depends on: T24

Owner: Clove (skill content). In `.ai-skills/skills/prism-onboard/shared.md`, under `## Confirm, generate, write`, append a new item 6 after item 5 (**Regenerate.**):

`6. **Architect routes.** After regeneration, and for first-contact after the seed-and-sync, so the live manifest already holds the stub's default routes: for each source tree the detection found, offer once to draft one architect doc at \`.prism/architect/<topic>.md\` from the code, per the writing-an-architect-doc guide. Add its route to the live \`.prism/architect/manifest.json\` in the same step, and only once the doc holds content that passes the guide's Deletion Test. When the person declines, or nothing survives the test, write neither file, because a route to an empty doc holds the team's first edit to read nothing. Mark \`build-verify\` complete only after this step.`

In `## Close`, add "the architect docs and routes written" to the summary list after "the review stack checks included". Run `pnpm prism:build`, measure `prism-onboard` with `measureSkillLoad`, and record the total in `## History`.

### T26: Add the route step to the onboarding workflow order

- files: .prism/architect/_toolkit/onboarding.md, .claude/architect/_toolkit/onboarding.md, .codex/architect/_toolkit/onboarding.md, .cursor/architect/_toolkit/onboarding.md
- proof: pnpm exec tsx scripts/ai-skills/build.ts --check && pnpm run prism:crossref-lint && grep -q 'draft architect docs' .prism/architect/_toolkit/onboarding.md
- depends on: T25

Owner: Eli. In the Workflow order section of `.prism/architect/_toolkit/onboarding.md`, insert after step 7 and renumber step 8: `8. After regeneration, draft architect docs for the detected source trees on a yes, one per tree, and add each route to the live \`manifest.json\` only once its doc holds content. A declined or empty doc writes neither file, and \`prism doctor\` warns on a route to a doc with no content.` Run `pnpm prism:build`.

## Challenge

round 1: blocking 1
  - T11 (blocking): the parser reads a `commit.mjs` call only when the script's `realpathSync.native` equals the runtime's own `plan/commit.mjs` (`path.dirname(path.dirname(import.meta.url))`), but the test builds its fixture as "a temp dir holding a copy of that path" and runs the relative `node scripts/ai-skills/hooks/plan/commit.mjs`. A copy resolves to itself, not the runtime file, so every ported `commit.sh` case reads no commit and the proof fails. Name one fixture: the absolute runtime path, or a segment cwd at the repo root. Don't use a symlink, which needs privileges on `windows-latest`.
  - T3 (non-blocking): `hook.mjs` line 65's comment says the quote characters are allowed "so `unquote` keeps working", and T3's comment list (lines 93, 295, 796, 944) misses it, so it is stale once `unquote` goes.
  - T13 (non-blocking): `readPlanConfig` returns the raw config or null, not `ticketPrefix` and `defaultBranch`, which are read off it (`defaultBranch` falls back to `main`). `findPlanForBranch` swallows an unparseable config and returns null, so the config read has to come before the folder-plan test, or the "config that does not parse denies" case passes as a non-plan branch. State that order.
  - T20 (non-blocking): leg 3 says `PRISM_RECONCILE_SCRIPT` unset, but no such variable exists anywhere, and `RECONCILE_SCRIPT` comes from `import.meta.url`. Drop the clause, and name the files the temp runtime copy holds (`reconcile-gate.mjs`, `harnesses.mjs`, `lib/hook-log.mjs`, and the `review/reconcile.mjs` stub).
  - T23 (non-blocking): the Hook runtime section of `hook-runtime.md` says "Both templates register `PreToolUse`, `PostToolUse`, `PostCompact`, and `UserPromptSubmit`", which T21's `SubagentStart` and `SubagentStop` make false. No bullet names that sentence.
  - plan (non-blocking): `.prism/rules/verification-commands.md` line 105 says `PRISM_HOOK_DISABLE=1` "turns every hook off for a session", which the secrets gate makes more false (the approve guard already ignored it). The file is outside Affected systems, so it needs a scope-change entry under spec Requirement 16, or an open item.
round 2: blocking 1
  - T18 (blocking): the proof runs `pnpm run prism:build`, which is `build.ts && pnpm run prism:test`, the whole suite. T1 sits in the same first wave and commits `git-gates-shell-string.test.ts`, which fails by design until T3. Once T1's file is on disk, T18's proof fails for a reason outside T18, so the result depends on wave order. Use `pnpm exec tsx scripts/ai-skills/build.ts --check` (or `build.ts > /dev/null`) in place of `pnpm run prism:build`.
  - T13 (non-blocking): `RETRO_PATHS` leaves out the generated copies a PRISM promotion has to commit. Retro commit `75a131f7` touched `.claude/`, `.codex/`, and `.cursor/` copies of `architect/` and `rules/`, plus `AGENTS.md` and `templates/install/.prism/...`. Under T13's set the commit gate denies that commit, and the gate is live in PRISM from T15, so this ticket's own retro hits it. The spec defines the set as "the set `prism-retro` commits", so adding those paths follows from the outcome. Record it as a `## Decisions` entry and widen the list.
  - T11, T14, T8 (non-blocking): `<runtime>` comes from `fileURLToPath`, which gives backslashes on `windows-latest`. Put into a command string, `tokenize` reads each `\` as an escape, so `node <runtime>/plan/commit.mjs` (T11, T14 leg 3) and `node <runtime>/env-keys.mjs` (T8 leg 3) stop resolving, and the tests fail on that CI leg (AC-13). Name the forward-slash spelling, `.split(path.sep).join("/")`, the way `approve-guard.test.ts` builds `APPROVE_COMMAND_PATH`.
  - T25 (non-blocking): the new item 3 runs before item 5, where first-contact runs seed-and-sync. In first-install and first-contact mode, `.prism/architect/manifest.json` may not exist yet, so the step creates it holding one route. `seedConsumerContentRoot` then skips the existing file, and the consumer never gets the stub's default routes. Either place the step after item 5, or say it runs after seed-and-sync when no live manifest exists.
round 3: blocking 1
  - T4 (blocking): the case asserts `"line one\n"` in the first segment's `stdinTexts`, but `walkSegments("tee f <<'E'\nline one\nE\necho after")` returns `stdinTexts: ["line one"]` on this head, with no trailing newline. The task says the case passes on `main`, so as written its proof fails and T4 blocks wave 1. Assert `["line one"]`, or assert with `includes("line one")`. The other T4 argvs and T1's three commands walk as the plan says.
  - T3 (non-blocking): the proof's `! grep -rln 'lib/shell.mjs' scripts/ai-skills --include=*.mjs --include=*.mts --include=*.ts` leaves the globs unquoted. Under zsh, this checkout's shell, `nomatch` aborts the grep and the leading `!` turns the abort into a pass, so the leg checks nothing. Quote each `--include` value.
  - T3 (non-blocking): line 1002 is in `checkCommandWritesNoFile`, not `parseUnprovenShellPaths`, so "treats the whole command as unproven" should read as that function returning `false` when `unreadable` is non-empty. `removeDataHeredocBodies` also calls `splitShellSegments(command, heredocs)` at line 750, under a `@type {import("./lib/shell.mjs").HeredocBody[]}` at line 749. The rewrite bullet covers the call, but name the JSDoc type too, because `check-types` fails on it once the module is deleted.
round 4: resolved 1

## Decisions

- **Stack: five PRs, cut at T6, T10, T17, and T23.** The child passes 10 files and 500 lines in every part, mostly ported tests and generated copies.
  - **Part 1, T1 to T6 and T18: one parser.** `hook.mjs` and `git-gates.mjs` move onto `walkSegments`, `lib/shell.mjs` goes, and the git gates start reading `bash -c` commits. It ships whole: one parser, and a fixed miss. Two tasks ride here for the bundle check's import edges. T2's harness readers, because `hook.mjs` and `git-gates.mjs` import `harnesses.mjs`. T18's `gated` flag, because `update.ts` imports `generate-skills.ts`, so T3 waits on T18 and T18 can't sit in a later part. The flag is inert until part 4, and its validation in `buildRoleMap` stands on its own.
  - **Part 2, T7 to T10: the secrets gate.** It needs nothing from parts 3 to 5, and it closes the security gap the intent names first. It also creates the registration test the later parts extend.
  - **Part 3, T11 to T17: the commit gate.** The largest part, and one concern: the flag denies and the folder-plan checks share one entry point and one would-be tree, so splitting them would ship a gate that reads a commit twice. It carries the rule, ADR, and doc edits it makes true.
  - **Part 4, T19 to T23: the brief and reconcile gates.** Both are subagent-event gates sharing the hook log and the new host limitations, and the workflow sentence that the brief gate makes necessary.
  - **Part 5, T24 to T26: consumer architect routes.** Independent of every gate in what it does. It comes last because `doctor.ts` is claimed by T9, T15, and T21 and imports `update.ts`, so T24 waits on them whatever the part order.
  - Each later part's branch starts from the one before. When a part squash-merges first, the next part opens with one plan-only commit whose subject names the shipped tasks, such as `T1,T2,T3,T4,T5,T6,T18: Record part 1 as shipped`, so the task parser reads them as done. Every review record line on a part that is not the last carries ` (part <k> of 5)` after its sha, per `REVIEW.md`.
  - Rejected: one PR, because a reviewer would face five unrelated gates at once; and fewer parts, because each merge would put two unrelated gates in front of one reviewer.
- **No task here fixes a reported bug, except the `bash -c` miss.** Every other code task adds behavior and carries its own test with `proof fails on main: yes`, except T4, which moves existing coverage. T1's failing test sits in its own file and spawns the entry point, because a test that imports `git-gates.mjs` would give T1 an import edge to T3 and the bundle check would order the fix first. Each gate's three legs are named cases in its suite, per the three-legs convention above.
- **Both gates move off `lib/shell.mjs` in the same task that deletes it.** The bundle check makes a task that edits an importer wait on the owner of the file it imports, so separate migration and deletion tasks formed a cycle. Rejected: leaving the module in place until a later part, which would ship two shell parsers in part 1.
- **`verification-commands.md`'s switch sentence is corrected in T10: a scope change that follows from the outcome.** Line 105 says `PRISM_HOOK_DISABLE=1` "turns every hook off for a session", which the approve guard already contradicted and the secrets gate makes more false, so it is a doc this child makes false. `spec.md` adds the rule and its curated install twin to Affected systems, and the platform copies were already covered. T10 owns it because it lands with the secrets gate.
- **`RETRO_PATHS` covers the generated copies a promotion commits: a scope change that follows from the outcome.** The spec defines the set as what `prism-retro` commits, and retro commit `75a131f7` committed the `.claude/`, `.codex/`, and `.cursor/` copies of `architect/` and `rules/`, `AGENTS.md`, and `templates/install/.prism/` beside the canonical files. Without them the commit gate, live in PRISM from T15, denies this ticket's own retro. The `spec/adrs/` copies are added on the same reasoning, since a promotion to an ADR writes them too.
- **T5's prune test lives in its own new file, not `update.test.ts`.** The bundle check gives a task an edge to the first open owner of any file its listed files import. `update.test.ts` imports `update.ts`, so once T3 finished, T5's edge moved to T9, which already depends on T5, and `bundles.mjs --base e8a2633a` reported `T5 -> T9 -> T5`. A file not yet on disk is not scanned, and once T5 is done it claims nothing, so the new file keeps T5 and its test in part 1 with no edge. Rejected: dropping T9's `depends on: T5`, because T9 would still wait on T5 through T8, T7, and T6, and T5 waiting on T9 closes the same cycle through part 2. Also rejected: moving the test into T9, which would take part 1's proof that consumers lose the old file out of part 1.
- **The two command patterns and `HOOK_COMMAND_PATH_RE` widen with each gate.** The spec says `mergeHookEventEntries` already claims entries by pattern, but `PRISM_HOOK_COMMAND_PATTERN` and its Codex twin name only `hook`, `git-gates`, and `approve-guard`. Without the widening an update would never replace or remove a new gate's entry, and doctor would not see a dead one. This follows from the approved outcome, so it goes ahead here. The registration test checks every template command against the patterns, so a gate added later without widening fails a test.
- **`doctor`'s runtime-without-registration check stays on the three existing entry points.** It names each entry point by path, and the spec asks only for the dead-registration direction, which the widened regex covers. Extending it to the four new gates is a follow-up PR off `main` after the stack merges. Rejected for now: adding four more path checks and cases here, which the spec does not name.
- **The hook log lives in `lib/hook-log.mjs`.** The brief and reconcile gates both write it, so one helper serves two callers. Putting it in `harnesses.mjs` was rejected, because it reads the git directory and has nothing to do with a host's wire format.
- **`readShellCall` and `writeStdout` join `harnesses.mjs`.** The secrets and commit gates both read shell calls the way thrive's `lib/harness.mjs` did, and every new gate writes through `writeStdout`. The approve guard keeps its own copies, because importing them would touch `approve-guard.mjs`, which no task in this plan lists.
- **`env-keys.mjs` exits 2 on an unreadable file, where thrive exits 1.** The spec says exit 2, which matches the runtime's usage-error code. A refused file still exits 1, so a caller can tell a typo from a refusal.
- **The workflow sentence crosses the 31,744 working line.** The lead set ends near 31,880 after T22. `agents-md-budget.test.ts` enforces 32,768, and PRISM-538 records 31,744 as a convention no test holds. Paying for 170 bytes by cutting another lead rule was rejected, because the spec places the sentence in the rule and Winston's verdict on it was proceed with changes.
- **Two files outside the first Affected systems list join it: a scope change that follows from the outcome.** `.claude/agents/prism-onboard.md` is a generated copy the build rewrites when T25 edits the onboarding skill, so T25 lists it. `prism-pr-review`'s `shared.md` line 54 and its four generated copies call the `prism-pr:` line input for "a later reconcile gate", a doc T20 makes false, so T20 rewrites it and lists the copies. `spec.md` adds the six paths to Affected systems. Rejected: leaving them as unlisted build-report files, which a build report flags as `needs-replan`.
- **Self-review round 1's T3 fix adds two files T3 did not list: a scope change that follows from the outcome.** `hooks/hook.d.mts` declares the newly exported `walkCommand`, which `git-gates.mjs` now shares, and `hook-shell-walk.test.ts` holds the tests for the unreadable-command guard and the nested-command skip the round found untested. Both match existing Affected systems globs. Rejected: a `needs-replan` round trip for a sidecar and a test file inside the same lane.
- **Heredoc bodies are placed by verified text and offset, not by `walkSegments` positions.** `walkSegments` and the tokenizer return no offsets, so `locateHeredocBodies` places a segment's first body only when its text is a line of its own exactly once and the line above opens the same heredocs, and reads each later body at the offset after the previous delimiter. Anything that fails to place stays in the scan, so the residual cases (two bodies with identical text, a `<<-` body with stripped tabs) over-deny and never under-deny. T3's task text still describes `command.indexOf(body, cursor)`; this entry supersedes it.
- **The quadratic walk on an unreadable command is reduced, not removed.** One walk is now shared per hook call, which takes a 2,000-line unreadable command from about 142 ms and 106 ms to about 60 ms and 63 ms. The rest is `readablePrefix` in `lib/segments.mjs`, which retokenizes at every newline. Rejected for this ticket: rewriting the ported parser's prefix search, which no task lists and which changes parser behavior every gate depends on. It ships as a follow-up PR off `main` after the epic, and part 1's PR body lists it under open items.
- **Part 1 corrects `hook-runtime.md`: a scope change that follows from the outcome.** Its heredoc paragraph did not say that every body stays in the scan when one cannot be placed, and its Git gates section did not say the gates skip a segment run inside a container. Both are behavior part 1 shipped, so a doc part 1 made incomplete is fixed in part 1 rather than waiting for T23. T23 edits other sentences in the same doc, and its text stands.
- **The five-part split was taken under Hunter's epic-level go-ahead, and he can veto it before part 1's PR opens.** Part 1 is T1 to T6 and T18, part 2 is T7 to T10, part 3 is T11 to T17, part 4 is T19 to T23, and part 5 is T24 to T26. A veto before part 1 opens costs one re-cut of this list; after it opens, the stack is already in review.
- **The confirm-round brief binds the plan stage through child 8's spec, so `prism-plan`'s skill text is not edited.** Child 8's spec has a Decision on that brief, and it applies to the plan stage directly. The epic spec's older wording, "with the verdict in the brief", stays as history.
- **ADR-0076 is amended in this PR, and its path joins part 1's files under Hunter's 2026-11-19 ruling.** This PR deleted the splitter, so the ADR's Consequences bullet about the splitter's quote gap became false. Hunter ruled "Amend in #545" over a follow-up PR off `main`. The bullet now names the shared parser's unreadable-text scan and its over-hold, with a dated `Amended` note, and the build wrote the three platform copies (`71fa8515`).
- **ADR-0076's push-cost sentence names the format check as well as lint.** The push gate runs both `commands.lint` and `commands.format` (`PUSH_VERIFICATION_SLOTS` in `git-gates.mjs`), so a nit carried from #545's last confirm pass is fixed in part 2 under the same ruling.
- **The unreadable-text scan promises no catch of every spelling.** It is a text scan and not a parse, so a `git` built from a variable or an escape can slip past it, and `hook-runtime.md` and ADR-0076 say so instead of claiming it never misses.
- **`resolveCdTarget` takes a `substitutions` argument, and `checkSegmentWritesNoFile` deliberately omits it.** `checkShellProofSafe` rejects `$` before that caller runs, so a substitution never reaches it.

## History

- 2026-11-19 [huntermcgrew/prism-544-agent-hooks]: Wrote the plan, 26 tasks in a five-part stack, with acceptance criteria AC-1 to AC-13 carried from issue #544.
- 2026-11-19 [huntermcgrew/prism-544-agent-hooks]: Folded the two out-of-scope findings into T20 and T25, after `spec.md` added the onboarding agent file and the `prism-pr-review` skill copies to Affected systems.
- 2026-11-19 [huntermcgrew/prism-544-agent-hooks]: Fixed challenge round 1's six findings: T11's fixture, T3's line 65 comment, T13's config order, T20's temp runtime, T23's registered-events sentence, and the `verification-commands.md` switch sentence, now T10's.
- 2026-11-19 [huntermcgrew/prism-544-agent-hooks]: Fixed challenge round 2's four findings: T18's proof is `build.ts --check`, T13's `RETRO_PATHS` covers the generated copies, T8, T11, and T14 spell the runtime path with forward slashes, and T25 and T26 run the route step after regeneration.
- 2026-11-19 [huntermcgrew/prism-544-agent-hooks]: Fixed challenge round 3's three findings: T4's `stdinTexts` assertion, T3's quoted grep globs, and T3's `checkCommandWritesNoFile` and line 749 type rewrites.
- 2026-11-19 [huntermcgrew/prism-544-agent-hooks]: T18 added the optional `gated` flag to `RoleDefinition`, a boolean check in `buildRoleMap`, and `"gated": true` on the six dispatched roles in roles.json.
- 2026-11-19 [huntermcgrew/prism-544-agent-hooks]: T1,T4 built; T1's `bash -c` and `sh -c` git-gate test fails on main by design until T3, and T4 carries the splitter assertions onto `walkSegments`.
- 2026-11-19 [huntermcgrew/prism-544-agent-hooks]: T2 added the `dispatch` tool kind, `subagentDispatch`, `subagentStop`, `emitBlockStop`, `readShellCall`, and `writeStdout` to `harnesses.mjs`, with a 12-case `hook-harnesses.test.ts`.
- 2026-11-19 [huntermcgrew/prism-544-agent-hooks]: T3 built; both git gates and the write gate read commands through `walkSegments`, `lib/shell.mjs` and its sidecar are deleted, and T1's `bash -c` and `sh -c` cases now pass. A consumer will find `.claude/hooks/lib/shell.mjs.bak` after their next `prism update`, and can delete it.
- 2026-11-19 [huntermcgrew/prism-544-agent-hooks]: T3's builder found `commit.mjs` refuses a path already removed with `git rm` (git's pathspec error), so a deleted file is named to it as an unstaged deletion. Left as an open item for a follow-up, since `commit.mjs` is outside this plan.
- 2026-11-19 [huntermcgrew/prism-544-agent-hooks]: Re-planned T5 into its own test file `update-prune-shell.test.ts` after `bundles.mjs --base e8a2633a` reported the cycle `T5 -> T9 -> T5`, which appeared once T3 finished.
- 2026-11-19 [huntermcgrew/prism-544-agent-hooks]: T5 added `update-prune-shell.test.ts`, which pins that `refreshHookRuntime` backs up and removes a marked consumer `lib/shell.mjs` the runtime no longer ships; re-adding the entry to `HOOK_RUNTIME_FILES` failed it.
- 2026-11-19 [huntermcgrew/prism-544-agent-hooks]: Replaced the section signs in four task lines with `[ref: <Heading>]` and plain section names, per a new Conventions paragraph, because `plan-folder-citations.test.ts` rejects the sign anywhere in a plan folder.
- 2026-11-19 [huntermcgrew/prism-544-agent-hooks]: T6 rewrote the Shell parser paragraph in `plan-chain-scripts.md` and the `lib/tokenize.mjs` row in `what-prism-writes.md` to say every gate reads commands through the shared parser, then rebuilt the twin and three platform copies. Part 1 (T1 to T6, T18) is built.
- 2026-11-19 [huntermcgrew/prism-544-agent-hooks]: Fixed the part 1 self-review findings: the shell-parser doc names which gates use `lib/segments.mjs`, the gated-role comment and the prune-test header state what is true now, and the plan cites the kill-switch checks by name.
- 2026-11-19 [huntermcgrew/prism-544-agent-hooks]: T3 fix for round 1 findings 2 to 7: the git gates normalize CRLF and skip container and `env -C` segments, heredoc bodies are placed by verified text and offset, and one walk is shared per hook call.
- 2026-11-19 [huntermcgrew/prism-544-agent-hooks]: Self-review round 2 plan edits: T19 now also fixes the `gated` comment, the quadratic-walk follow-up is a PR off `main`, `hook-runtime.md` joins part 1 as a scope change, and `spec.md` no longer calls `update.ts` an importer of the old splitter. Nits 9 and 10 are declined, since no under-deny was found and T2 specified the ported function.
- 2026-11-19 [huntermcgrew/prism-544-agent-hooks]: Round 2 fixes: `hook-runtime.md` says an unplaceable heredoc body keeps every body in the scan and that the git gates skip container segments, and the git gates fold an `env -C` directory into the segment's directory chain, with the heredoc substitution guard now pinned by tests.
- 2026-11-19 [huntermcgrew/prism-544-agent-hooks]: Recorded the stack split, the confirm-round brief binding, and retro candidates.
- 2026-11-19 [huntermcgrew/prism-544-agent-hooks]: Retro candidates from the part 1 run: plan-prescribed prose was wrong twice (the no-other-shell-splitter sentence and the git-gates JSDoc), the plan-folder citation lint is not run by the challenge rounds or the auto-approval script so the plan was approved carrying section signs, and `bundles.mjs` import edges re-resolve to the next owner when a task finishes so a cycle can appear mid-build, as T5 showed.
- 2026-11-19 [huntermcgrew/prism-544-agent-hooks]: Round 3 fixes: `hook-runtime.md` cites the unwrapped docker forms by owner (`b6996110`), and `hook-harnesses.test.ts` spawns a hook whose stdout is already closed to pin the EPIPE listener (`4155e36f`). The `pipesOnward` and attached `env -C` nits are declined with reasons under `## Review`.
- 2026-11-19 [huntermcgrew/prism-544-agent-hooks]: PR review round 1 fixes: a `cd` inside a substitution or nested shell no longer moves the write gate's directory (`81c1e667`), and text the walk cannot read is scanned conservatively by both gates, with `walkLines` renamed `walkCommand` (`13d67c40`). The heredoc chaining and shell-tool twin nits are declined, and the `gated` comment note joined T19.
- 2026-11-19 [huntermcgrew/prism-544-agent-hooks]: PR review round 2 fixes: the cd-resolution tests build their paths with `path.resolve` and `path.join` so windows-latest passes (`f150add1`), and the unreadable-text git scan starts each piece at its first `git` word (`21a0a6b2`).
- 2026-11-19 [huntermcgrew/prism-544-agent-hooks]: PR review round 3 fix: `hook-runtime.md` scopes the container skip to commands the parser can read and says unreadable text is scanned for commit and push words (`73f9e328`). ADR-0076's stale splitter bullet is recorded as an open Decision, because the ADR is outside Affected systems.
- 2026-11-19 [huntermcgrew/prism-544-agent-hooks]: PR review confirm-pass fixes: a `cd` target that holds a substitution reads as unresolvable in the write gate (`7159cd61`), `hook-harnesses.test.ts` now pins the argv quote escape, the empty cwd, and a non-string command, each mutation-checked (`af5b0521`), and the spec's Shared parser paragraph is in past tense.
- 2026-11-19 [huntermcgrew/prism-544-agent-hooks]: Hunter ruled to amend ADR-0076 in this PR, so the open question on its splitter bullet closed. The ADR's Consequences bullet and its three platform copies now describe the shared parser's unreadable-text scan (`71fa8515`).
- 2026-11-19 [huntermcgrew/prism-544-agent-hooks]: Confirm-pass fix: ADR-0076 drops the `cd` claim from its parser bullet (`dfb018f8`) and scopes the over-hold cost per gate, a push blocks nothing unless lint fails and a commit costs one retry (`0e183936`).
- 2026-11-19 [huntermcgrew/prism-544-secrets-gate]: Part 1 of 5 (T1 to T6 and T18) shipped as #545, squash `fdce3e87`. Parts 2 to 5 build from `main` after it. The commit that marks them done lists every ID (`T1,T2,T3,T4,T5,T6,T18`), because the subject parser reads a range or a list and not both in one subject.

## Sessions

- 2026-11-19 [huntermcgrew/prism-544-agent-hooks] open: Intent — write plan.md for child 8 from the final spec; Bounds — plan.md only, no challenge rounds, local commit; Approach — tasks to the detail bar, a stack at the gate boundaries, import edges checked with bundles.mjs

## Verification

verdict: done
base: 6f045ec596e560147e91f32f84d2649e5690eb51
head: 81544b1a18bbed30d7fb32bfe782f4cab25f030a (part 1 of 5)

| check | result | evidence |
| --- | --- | --- |
| typecheck | pass | /tmp/claude-1000/-home-zibbix-Projects-PRISM--claude-worktrees-prism-personas-handoff-9543ef/b5b3cef5-428f-4603-b5db-5f5291220dc9/scratchpad/verify-typecheck.log |
| lint | pass | /tmp/claude-1000/-home-zibbix-Projects-PRISM--claude-worktrees-prism-personas-handoff-9543ef/b5b3cef5-428f-4603-b5db-5f5291220dc9/scratchpad/verify-lint.log |
| test | pass | /tmp/claude-1000/-home-zibbix-Projects-PRISM--claude-worktrees-prism-personas-handoff-9543ef/b5b3cef5-428f-4603-b5db-5f5291220dc9/scratchpad/verify-test.log |
| format | n/a: not configured | none |
| build | pass | /tmp/claude-1000/-home-zibbix-Projects-PRISM--claude-worktrees-prism-personas-handoff-9543ef/b5b3cef5-428f-4603-b5db-5f5291220dc9/scratchpad/verify-build.log |
| spec | pass | /tmp/claude-1000/-home-zibbix-Projects-PRISM--claude-worktrees-prism-personas-handoff-9543ef/b5b3cef5-428f-4603-b5db-5f5291220dc9/scratchpad/verify-spec.log |

### Failures

- none

## Review

- self-review round 1 at 63476448 (part 1 of 5): 0 critical, 1 major, 7 minor, 3 nit
  - Coverage: Correctness swept (detectGitSegments, resolveGitInvocation, parseShellReadTargets, removeDataHeredocBodies, checkCommandWritesNoFile, resolveArgumentsAfterCd, the dispatch kind through runPreToolUseArm, the three new harness fields, readShellCall, writeStdout, the gated check in buildRoleMap, HOOK_RUNTIME_FILES). Regressions swept (T1, T4, T5, and T18 tests paired; gaps in findings 2, 5). Security swept (write-gate path scan: finding 4; read credit, read-only exemption, after-cd arguments, git gates, harness readers, gated, runtime delivery: clean). Architecture swept (hook-runtime.md, spec-editing.md, writing-an-architect-doc.md, skills-ecosystem.md, install-layout.md, consumer-sync-flow.md, token-substitution.md, documentation.md aligned; plan-chain-scripts.md diverged: finding 1; new helpers walkLines, checkReaderPrecedesIntroducer, readSubagentStop, emitStopBlock, readShellCall, writeStdout). Intent swept (grades below). Simpler paths swept (detectGitSegments on walkSegments, walkLines, the heredoc rewrite, the doubt branches, the depth skip, harness accessors, gated check, shell.mjs deletion, T5's own file). Accessibility n/a: no UI. Docs swept (plan-chain-scripts.md and its four copies, what-prism-writes.md row, every deleted name tree-wide, hook.mjs and git-gates.mjs comments, plan and spec shas and line cites). Contracts swept (eight foundation questions; Q2 and Q7 fail on finding 1). Performance swept (per-Bash hook path in hook.mjs and git-gates.mjs: finding 6).
  - **1. Major, standards violation, fixed f043bee0.** File: .prism/architect/_toolkit/plan-chain-scripts.md:101. "Every gate that reads a shell command reads it through these two modules, and the runtime ships no other shell splitter" is false: approve-guard.mjs imports only tokenize and segments with its own splitSegments at line 1070, its parser frozen by design (the approve guard section of hook-runtime.md). Class: an architect doc's "every X / no other Y" claim widened past the callers the change moved. Sweep: `git grep -l 'no other shell splitter'` found the four generated copies and T6's own text in plan.md; docs/what-prism-writes.md:44 holds, since the approve guard does tokenize through lib/tokenize.mjs. Fix: say the write gate, read credit, and git gates walk commands with lib/segments.mjs, and the approve guard tokenizes with lib/tokenize.mjs and keeps its own frozen segmenting; then `pnpm prism:build`. T6's prescribed sentence stays as written.
  - **2. Minor, bug (regression), fixed 05c9d477.** File: scripts/ai-skills/hooks/git-gates.mjs:157. `git push\r\n` and `git commit\r\n` give `[]` at head and push or commit at 6f045ec5, so the push gate and the cleanup-pass hold fail open on CRLF; the CRLF normalization lives only in hook.mjs walkLines (line 266). Class: input normalization every caller of a shared parser needs, added to one caller. Sweep: `grep -n 'walkSegments(' scripts/ai-skills/hooks/*.mjs` shows git-gates.mjs:157 is the only raw call; git-gates.test.ts feeds no carriage return. Fix: normalize in walkSegments or one shared helper used by both gates, plus a `git push\r\n` case.
  - **3. Minor, bug, fixed 05c9d477 (the env arm of the fix is round 2 finding 1).** File: scripts/ai-skills/hooks/git-gates.mjs:158. Only segment.argv reaches resolveGitInvocation, so the newly reached `docker exec app git push` and `env -C /other git push` are detected and judged against the payload cwd's repo and config (base ignored both). Class: a parser result carries the directory or container and the caller drops it. Sweep: `grep -n 'segment\.\(cwd\|container\)' scripts/ai-skills/hooks/{git-gates,hook}.mjs` finds nothing. Fix: skip segments whose container is set, and resolve from segment.cwd before applying -C; or record both as known misses in the detectGitSegments JSDoc.
  - **4. Minor, security risk (regression), fixed 05c9d477.** File: scripts/ai-skills/hooks/hook.mjs:820. removeDataHeredocBodies finds each body again with `command.indexOf("\n" + body + "\n", cursor)`, so a copy of the body earlier in the command is cut instead: `cat a.md # <<` / `cat b.md` / `cat src.md | tee <routed rule>` / `cat <<'A'` / `cat b.md` / `A` drops the routed tee target from parseUnprovenShellPaths at head (base keeps it). The same search misses a CRLF body and a second heredoc on one line, which now over-deny (`gh ... <<'EOF'\r\nsee .prism/y.md\r\nEOF`, `cat <<'A' <<'B' ...`). Class: a parsed fragment located again by content search instead of the position the parser had. Sweep: `grep -n 'indexOf(' scripts/ai-skills/hooks/hook.mjs` finds only lines 756, 820, 826 in this path. Fix: have the walk report each body's offsets and opening segment, and cut by offset; failing that, verify the introducer line and closing delimiter around the match and keep the whole command otherwise. Add the first command as a test that the routed path survives.
  - **5. Minor, bug (test gap), fixed 05c9d477.** File: scripts/ai-skills/hooks/hook.mjs:331 and :338. Removing the unreadable guard or the depth skip leaves hook-gate, hook-gate-read-credit, and hook-command green (mutation run by the regressions subagent), though `cat a.md\ncat 'x` and `bash -c 'cat a.md'` then earn credit. The git gates' new reach beyond -c strings (`timeout 5 git push`, `(git push)`) is unpinned too. Class: a changed behavior with no test that fails without it. Sweep: `grep -c 'bash -c'` on both read-credit suites gives 0. Fix: cases in a new test file for both inputs, and one `timeout` or subshell case in git-gates-shell-string.test.ts.
  - **6. Minor, bug (performance regression), partly fixed 05c9d477; the rest deferred by the quadratic-walk Decision.** File: scripts/ai-skills/hooks/hook.mjs:266 and git-gates.mjs:157. A 2000-line command the tokenizer cannot read near its start (a `gh pr comment --body "` with a lone backtick) takes 142 ms in parseUnprovenShellPaths and 106 ms in detectGitSegments at head, against 8 ms and 1 ms at base, because readablePrefix in lib/segments.mjs retokenizes per newline and each hook call walks the command up to four times. Class: a fallback parse retried from the start at every cut point, on a per-event hook path, repeated per caller. Sweep: `grep -n 'walkLines\|walkSegments(' scripts/ai-skills/hooks/*.mjs`. Fix: walk once per hook call and share the result; make readablePrefix a single pass.
  - **7. Minor, nitpick, fixed 05c9d477.** File: scripts/ai-skills/hooks/git-gates.mjs:144. "reads a heredoc body as data, so a body line is never a command" is wrong for a heredoc fed to a shell: `bash <<'EOF'\ngit push\nEOF` is detected, correctly. Class: a comment restating a shared module's contract more narrowly than the module's header. Sweep: `grep -n heredoc` over git-gates.mjs, hook.mjs, hook-segments.test.ts; nothing else. Fix: "reads a heredoc body as data unless a shell reads it."
  - **8. Minor, nitpick (task text, left as written), fixed 24317224.** File: .prism/plans/prism-544/plan.md:50. The Failure and switches convention cites "hook.mjs does at its line 1262"; after T3 the kill-switch checks sit at lines 1186, 1331, 1467, and 1553, and 1262 is unrelated. Parts 3 and 4 build from it. Class: a source line cite a prior task in the same plan shifted. Sweep: plan.md line cites for later tasks; the others point at files this range left alone. Fix: the plan stage cites the check by name.
  - **9. nit, nitpick, fixed 38a7ebe6.** File: scripts/ai-skills/generate-skills.ts:52. The gated JSDoc says the brief gate "holds" a brief; no brief gate exists until part 4. Fix: future tense, or decline because the stack makes it true.
  - **10. nit, standards violation, fixed 05c9d477 and 9b602718.** Files: scripts/ai-skills/git-gates-shell-string.test.ts:4 ("so it runs before the fix lands") and scripts/ai-skills/update-prune-shell.test.ts:5 ("was delivered to every consumer before the gates moved"), against the session-context leakage section of writing-voice.md. Fix: state the contract each pins.
  - **11. nit, code smell.** File: scripts/ai-skills/hooks/harnesses.mjs:441. readShellCall is a free function with its own SHELL_TOOLS table (line 409) beside per-row fields, and the private emitStopBlock (line 200) mirrors the field name emitBlockStop. Declinable, since T2 specified the ported free function.
  - AC-1: met (executed). lib/shell.mjs absent, `git grep` finds no importer, both read-credit suites unchanged against 6f045ec5 and origin/main, and hook-gate, hook-gate-read-credit, git-gates, git-gates-shell-string, and discovery-metadata pass 160 of 160 with the bash -c commit held. Finding 4 is a heredoc-scan change this Evidence does not reach.
  - AC-3: gated flag met (executed: "buildRoleMap rejects a non-boolean gated value" and "accepts a boolean gated value" pass); the brief gate half is out of part (part 4).
  - AC-13: ungradeable, pass-bounded: part 1 has no PR yet, so no CI has run; local verify passed at 746725a1.
  - AC-2, AC-4 to AC-12: out of part.
- self-review round 2 at 33c546e2 (part 1 of 5): 0 critical, 0 major, 4 minor, 6 nit
  - Coverage: Correctness swept (detectGitSegments CRLF, container skip, env skip: finding 1; walkLines export and one-entry cache; locateHeredocBodies over 13 doubt shapes, none under-denies; removeDataHeredocBodies collect-sort-cut; generate-skills.ts JSDoc). Regressions swept over 6f045ec5..33c546e2 (gated, harness readers, shell.mjs prune, unreadable and nested read credit, heredoc CRLF and placement, walkLines memo, git gates under bash -c, timeout, subshell, CRLF, container, env -C each paired; substitution guard unpaired: finding 2; callers of walkLines, detectGitSegments, parseShellReadTargets, parseUnprovenShellPaths checked; full suite 2416 of 2417 pass, 0 fail). Security swept (write-gate heredoc cut fails closed; read credit unchanged; git-gate detection fails open: finding 1). Architecture swept (hook-runtime.md: finding 3; spec-editing.md, writing-an-architect-doc.md, writing-a-plan.md, plan-authoring.md, audit-workflow.md, skills-ecosystem.md aligned; token-substitution.md unaffected; new helpers walkLines, lastWalk, locateHeredocBodies, checkRunsOutsideSessionRepo fit). Intent swept (grades below; Decisions that leave code unchanged: the quadratic-walk deferral is finding 4, the doctor-check scope holds). Simpler paths swept (checkRunsOutsideSessionRepo env arm: finding 1; walkLines memo, locateHeredocBodies, two-phase cuts: ok). Accessibility n/a: no UI. Docs swept over 6f045ec5..33c546e2 (plan-chain-scripts.md and its four copies verified against approve-guard.mjs and hook.mjs; what-prism-writes.md row verified; hook-runtime.md lines 29 and 51 to 53: finding 3; spec.md lines 58 and 64; plan.md Decisions and line cites; new JSDoc in hook.mjs, git-gates.mjs, generate-skills.ts; test headers; deleted names tree-wide: none live). Contracts swept (eight foundation questions on the walkLines export: all hold). Performance swept (walkLines memo lowers walks per Bash call; locateHeredocBodies bounded by command length).
  - **1. Minor, bug, fixed 0e72af34.** File: scripts/ai-skills/hooks/git-gates.mjs:147. The env arm of checkRunsOutsideSessionRepo skips commands that run in the session repo, so the push gate and the cleanup-pass hold fail open: `env -C . git push` and `env -C sub git push` give `[]` while `git -C sub push` gives the push, and `env FOO=1 git -C sub push 2>/dev/null` gives `[]` because the wrapper-word slice by length difference runs into git's own `-C` once redirect words sit in `words` but not `argv` (`> log.txt` alone still gives the push). The test rows at git-gates.test.ts:186 to 188 pin the skip. Class: a gate that skips a command it cannot place instead of resolving it through its existing directory chain. Sweep: `grep -rn 'words.length - \|words.slice(0' scripts/ai-skills/hooks` finds only this site; `grep -n 'continue;' git-gates.mjs` finds no other skip; the container skip is sound. Fix: delete the env arm, prepend env's `-C` or `--chdir` value to the segment's `directories` so resolveSegmentDir resolves it from the session cwd, flip the three test rows to expect the push with the directory, and add `env X=1 git -C sub push 2>&1`.
  - **2. Minor, bug (test gap), fixed 0e72af34.** File: scripts/ai-skills/hooks/hook.mjs:909. Removing the `$(` and backtick check (leaving `if (readerFirst)`) keeps hook-shell-walk and both hook-gate suites green, though `cat <<EOF` / `$(tee <routed rule> </dev/null)` / `EOF` then drops the routed tee target from parseUnprovenShellPaths (it is a candidate at head). Class: a safety predicate inside a rewritten loop with no test that fails when it is removed. Sweep: `grep -n '\$(' scripts/ai-skills/hook-shell-walk.test.ts` finds nothing; hook-gate.test.ts:2717 does not reach this branch. Fix: a hook-shell-walk case for that command expecting the routed path, and a two-body case where only the second body holds `$(`, which pins the per-index lookup.
  - **3. Minor, standards violation, fixed 2b261a8c.** File: .prism/architect/_toolkit/hook-runtime.md:29. The heredoc paragraph says a data-reader body "is left out of the candidates when" three conditions hold, but at head every body stays when any body cannot be placed (locateHeredocBodies in hook.mjs: a repeated line, a header that does not open the same heredocs, a here-string whose text is also a word). The Git gates paragraph (lines 51 to 53) also says nothing of the new container skip. Over-deny only. Class: an architect doc's sufficient-condition list left unchanged when the code adds a keep condition. Sweep: `grep -n 'heredoc\|Heredoc' .prism/architect/_toolkit/hook-runtime.md` finds lines 29 and 33; 33 holds. Fix: add "and only when every body in the command can be placed in its text with certainty (`locateHeredocBodies` in `hook.mjs`); otherwise every body stays", and a container sentence in the Git gates paragraph; same edits by hand in the curated templates/install twin; `pnpm prism:build`.
  - **4. Minor, standards violation, fixed 209368ef.** File: .prism/plans/prism-544/plan.md:541. The quadratic-walk Decision ends "Left as an open item for a follow-up" with no vehicle, so nothing carries the `readablePrefix` cost to the PR body or the closing summary as the Scope changes paragraph of the workflow rule asks. Class: a deferral in a gating plan section with no named vehicle. Sweep: `grep -n 'follow-up\|open item' .prism/plans/prism-544/plan.md` finds the doctor Decision (names a follow-up PR off main: fine) and the History line on commit.mjs and `git rm` (same class, bookkeeping, recorded only). Fix: name the vehicle, a follow-up PR off main per the followup-scope rule, and list it in the part's PR body.
  - **5. nit, nitpick, fixed 209368ef (T19 lists the file).** File: scripts/ai-skills/generate-skills.ts:52. "the brief gate, when it ships, reads" goes stale when part 4 ships the gate, and no later task lists the file. Fix: add the JSDoc edit to T19's files, or drop the clause now.
  - **6. nit, nitpick, fixed 0e72af34.** File: scripts/ai-skills/hooks/git-gates.mjs:170. "a body line is a command only when `bash <<'EOF'` runs it" is narrower than SHELLS in lib/segments.mjs (sh, zsh, dash, ksh, and a heredoc piped into a shell). Fix: "only when a shell reads it, as in `bash <<'EOF'`".
  - **7. nit, standards violation, fixed 0e72af34.** File: scripts/ai-skills/hooks/hook.mjs:269. "a Bash call reaches this three times" counts callers, against the count rules section of writing-voice.md. Fix: "every shell reader in a Bash call reaches this".
  - **8. nit, nitpick, fixed 209368ef.** File: .prism/plans/prism-544/spec.md:58. "The remaining importers, `hook.mjs`, `git-gates.mjs`, and `update.ts`": update.ts only listed lib/shell.mjs for delivery. Fix: drop `update.ts` from the list.
  - **9. nit, test coverage, declined: no under-deny one guard alone prevents was found.** File: scripts/ai-skills/hook-shell-walk.test.ts:27. The "earlier line equal to a body" case passes with either placement guard deleted alone (uniqueness at hook.mjs:805, header walk at :818); no under-deny one guard alone prevents was found. Recommend declining with that reason.
  - **10. nit, code smell, declined: T2 specified the ported free function.** Round 1 finding 11 (readShellCall's own SHELL_TOOLS table and emitStopBlock beside emitBlockStop in harnesses.mjs) was neither changed nor declined. Recommend declining: T2 specified the ported free function.
  - Dropped: spec.md:64's "today" names the pre-build state, which is how the spec was written to read.
  - AC-1: met (executed). lib/shell.mjs absent, no runtime or test file imports it (the one `git grep` hit is update-prune-shell.test.ts's fixture name), both read-credit suites unchanged against 6f045ec5 and origin/main, and hook-gate, hook-gate-read-credit, git-gates, git-gates-shell-string, discovery-metadata, and hook-shell-walk pass 175 of 175 with the bash -c commit held.
  - AC-3: gated flag met (executed, discovery-metadata.test.ts:357 and :370 pass); the brief gate half is out of part (part 4).
  - AC-13: ungradeable, pass-bounded: part 1 has no PR yet, so no CI has run; local verify passed at e4ce2059.
  - AC-2, AC-4 to AC-12: out of part.
- self-review round 3 at feb28056 (part 1 of 5): 0 critical, 1 major, 1 minor, 3 nit
  - Coverage: Correctness swept over 97951839..feb28056 (readEnvDirectories over 14 env shapes: finding 4; detectGitSegments container-only skip and the env-then-git directory fold; hook.mjs walkLines comment only). Regressions swept over 6f045ec5..feb28056 (every changed behavior paired and mutation-checked; 12 affected suites pass 833 of 834 with 1 skipped; 8 new or changed tests fail on base code; side-by-side base and head runs on 48 git-gate and 40 read-credit inputs show only added denies; callers of walkLines, detectGitSegments, HARNESSES, readShellCall, writeStdout, buildRoleMap, HOOK_RUNTIME_FILES checked; writeStdout EPIPE: finding 2; pipesOnward: finding 3). Security swept (git-gate directory fold: attached env forms resolve against the session cwd as base did, finding 4; heredoc substitution guard now pinned; container skip sound). Architecture swept (hook-runtime.md: finding 1; plan-chain-scripts.md, spec-editing.md, writing-a-plan.md, plan-authoring.md, audit-workflow.md, writing-an-architect-doc.md, skills-ecosystem.md, token-substitution.md aligned; new helper readEnvDirectories fits). Intent swept (grades below; Decisions that leave code unchanged: the quadratic-walk deferral names a follow-up PR off main, the doctor-check scope, the confirm-round brief binding against spec.md line 161, and the five-part split veto all hold; retro candidates: finding 5). Simpler paths swept (readEnvDirectories replacing the env skip arm: simpler and correct; container-only skip: ok). Accessibility n/a: no UI. Docs swept over 6f045ec5..feb28056 (hook-runtime.md lines 29, 51, 53 against hook.mjs and lib/segments.mjs: finding 1; plan-chain-scripts.md and its four copies; the curated hook-runtime twin needs no edit; what-prism-writes.md row; roles.json gated set; deleted names tree-wide: only dated plan records; spec.md paths and names; plan.md shas, line cites, and quoted rules; no section sign in the folder; JSDoc and test headers in the changed scripts). Contracts swept (GitGateSegment shape unchanged, its directories now lead with env directories, and its one consumer resolveSegmentDir reduces them in order: holds). Performance swept (readEnvDirectories is linear in a segment's words, once per git segment).
  - **1. Major, standards violation, fixed b6996110.** File: .prism/architect/_toolkit/hook-runtime.md:51, and the .claude, .codex, and .cursor copies at the same line. The container sentence lists "(`docker exec` and `docker compose exec`)", but detectGitSegments skips every form unwrapDocker in lib/segments.mjs reads: `docker exec`, `docker container exec`, `docker compose exec`, and `docker compose run`. A reader expects `docker compose run app git push` or `docker container exec c git commit` to be gated, and both are skipped. Low impact, since the doc understates the skip; Major is the floor the architect-doc-verification rule sets for a diverged claim. Class: an architect doc re-enumerating a set another module owns, as a subset of the owner's list. Sweep: `grep -n "docker exec\|compose" .prism/architect/_toolkit/*.md .prism/rules/*.md` finds plan-chain-scripts.md:101 ("`docker exec` and the compose forms"), which holds; the curated install twin has no Git gates section. Fix: cite the owner instead of re-listing, such as "(the `docker exec` and compose forms `lib/segments.mjs` unwraps)", or list all four; then `pnpm prism:build`.
  - **2. Minor, bug (test gap), fixed 4155e36f.** File: scripts/ai-skills/hooks/harnesses.mjs:479 (writeStdout). Deleting `process.stdout.on("error", () => {})` leaves every suite green, because hook-harnesses.test.ts:162 stubs `process.stdout.write`; without the listener, a host that closes stdout early kills the hook on an unhandled EPIPE (`node epipe.mjs | true` prints `Error: write EPIPE` to stderr), breaking the fail-open promise in the JSDoc that parts 2 to 4 rely on. Class: a fail-open guarantee whose test stubs out the failure it guards. Sweep: `grep -n 'process.stdout.write =' scripts/ai-skills/hook-harnesses.test.ts` finds only the stub at :165; approve-guard.mjs keeps its own private writeStdout. Fix: a hook-harnesses case that spawns `process.execPath` on a small script importing writeStdout and writing a large string to an already-closed stdout, asserting exit 0 and no EPIPE on stderr.
  - **3. nit, test coverage, declined: no input lets a write through, because every segment is already `cd`, a data reader, or a read-only command.** File: scripts/ai-skills/hooks/hook.mjs:903 (pipesOnward). Forcing it to false keeps every suite green; no input was found where losing it lets a write through, because every segment must already be cd, a data reader, or a read-only command. Recommend declining with that reason, or add one hook-shell-walk case where a body piped to `jq` stays in the scan.
  - **4. nit, bug, declined as rare: the attached `-C/x` form and a `FOO=/x/env` prefix behave as base did, which judged every env form against the session repo.** File: scripts/ai-skills/hooks/git-gates.mjs:159. readEnvDirectories reads only a separate `-C <dir>`, so GNU env's attached form `env -C/other git push` gives `directories: []` and the gates judge the push against the session repo, as base did for every env form. A leading assignment whose value ends in `/env` (`FOO=/x/env env -C sub git push`) matches the basename search too, with the same result. Fix: also read a `-C` word longer than two characters as `-C` plus its value, and skip words containing `=` when finding the env word; or decline as rare.
  - **5. nit, standards violation, fixed: the retro candidates moved out of `## Decisions` into one `## History` line.** File: .prism/plans/prism-544/plan.md:546. "Retro candidates from the part 1 run" sits under `## Decisions`, which the writing-a-plan guide (its section on Decisions as a do-not-undo contract) reserves for choices the next reader must not reverse; these are observations for prism-retro, which will have to write a verdict on an entry that decides nothing. Fix: move the three bullets to a `## History` line, or decline.
  - AC-1: met (executed). lib/shell.mjs absent, no runtime or test file imports it (the one `git grep` hit is update-prune-shell.test.ts's fixture name), both read-credit suites unchanged against 6f045ec5, and git-gates, git-gates-shell-string, and hook-shell-walk pass 47 of 47 at feb28056 with the bash -c commit held; the 12 affected suites pass 833 of 834 with 1 skipped.
  - AC-3: gated flag met (executed, discovery-metadata.test.ts "rejects a non-boolean gated value" fails on base code and passes at head); the brief gate half is out of part (part 4).
  - AC-13: ungradeable, pass-bounded: part 1 has no PR yet, so no CI has run; local verify passed at de7a3e78, and every later commit touches only the plan.
  - AC-2, AC-4 to AC-12: out of part.
- pr-review round 1 at 6cc418a4 (part 1 of 5): 0 critical, 1 major, 1 minor, 4 nit
  - **1. Major, bug (regression), fixed 81c1e667.** File: scripts/ai-skills/hooks/hook.mjs:954. In resolveArgumentsAfterCd, a `cd` inside `$(...)` or `bash -c` moves `current`, so `ROOT=$(cd scripts && pwd); cd src && tee index.ts` passes the write gate and base denies it. Fix: only `depth === 0` segments move `current`.
  - **2. Minor, bug (regression), fixed 13d67c40.** File: scripts/ai-skills/hooks/git-gates.mjs:199, also hook.mjs:954. Both loops ignore `.unreadable`, so a quoted `)` inside `$( )` hides a later `git push` or write. Fix: read the unreadable text conservatively.
  - **3. nit, bug, declined: it over-denies and never under-denies.** File: scripts/ai-skills/hooks/hook.mjs:811. Two data-reader heredocs opened on one line in separate segments over-deny.
  - **4. nit, code smell, declined in part 1: the fix edits `approve-guard.mjs`, which no task in this plan lists; the Decision's reason is corrected.** File: scripts/ai-skills/hooks/harnesses.mjs:409. The shell-tool list, the PowerShell rewrite, and writeStdout have twins in the approval guard. Recommend declining, and correcting the Decision's reason.
  - **5. nit, code smell, fixed 13d67c40 (renamed `walkCommand`).** File: scripts/ai-skills/hooks/hook.mjs:273. The name `walkLines` does not say it returns the cached whole-command walk.
  - **6. nit, nitpick, deferred to T19, which already lists that comment.** File: scripts/ai-skills/generate-skills.ts:52. The gated JSDoc's membership rule also covers prism-architect. Fold the fix into T19.
  - AC-1: met (executed); findings 1 and 2 sit outside its Evidence. AC-3: the gated half is met. AC-13: met for part 1, with both CI legs green at 6cc418a4. AC-2, AC-4 to AC-12: out of part.
- pr-review round 2 at 829b09b9 (part 1 of 5): 0 critical, 1 major, 1 minor, 1 nit
  - **1. Major, bug (test portability), fixed f150add1.** File: scripts/ai-skills/hook-shell-walk.test.ts:86, also line 96. Both new resolveArgumentsAfterCd tests compare path.resolve output to POSIX literals like "/repo/src/index.ts", so windows-latest fails them at 829b09b9 (run 44663861943) and AC-13 is unmet. Class: a test expectation written as a POSIX path literal where the code returns path.resolve output. Sweep: changed test files grepped for the "/repo/ literal; only this file fails. Fix: build cwd and the expected paths with path.resolve and path.join.
  - **2. Minor, bug, fixed 21a0a6b2.** File: scripts/ai-skills/hooks/git-gates.mjs:218, JSDoc at lines 189-192. The unreadable-text fallback finds git only at a piece's head, so timeout, braces, then, !, command, nohup, and env -C forms of git push stay hidden after unreadable text, and the JSDoc's "never hides" claim and its echo example are both wrong. Base misses them too. Class: a fallback reading built on a narrower recognizer than the main path it backs up. Fix: start each piece at its first git word.
  - **3. nit, nitpick, fixed 21a0a6b2.** File: scripts/ai-skills/hooks/hook.mjs:944. The comment says nested segments come before their holder, which is false for bash -c. Drop the clause.
  - Round 1 findings 1, 2, and 5 confirmed fixed at 81c1e667 and 13d67c40, threads resolved. AC-1: met. AC-3: the gated half is met. AC-13: unmet, windows-latest red at 829b09b9. AC-2, AC-4 to AC-12: out of part.
- pr-review round 3 at a1f03e2b (part 1 of 5): 0 critical, 1 major, 0 minor, 0 nit
  - **1. Major, standards violation (architect doc diverged), fixed 73f9e328 for `hook-runtime.md`; the ADR-0076 bullet is an open Decision, since the ADR is outside Affected systems.** File: .prism/architect/_toolkit/hook-runtime.md:51, second site ADR-0076 Consequences lines 96-100. The container-skip sentence says neither gate fires on a container's git, but the unreadable-text fallback in git-gates.mjs:220-229 skips no container and holds a git commit named only as an argument. ADR-0076 still lists the deleted splitter's quote gap. Over-hold only. Class: prose describing how a gate recognizes commands, not updated when a fallback recognizer was added beside the main parse. Fix: scope the sentence to readable commands, add the fallback's over-hold, replace the ADR bullet, run pnpm prism:build. Open on the PR as an inline thread; a fix gets the confirm pass.
  - Round 2 findings 1, 2, and 3 confirmed fixed at f150add1 and 21a0a6b2, threads resolved. AC-1: met. AC-3: the gated half is met. AC-13: met, prism-check green on ubuntu-latest and windows-latest at a1f03e2b (run 44664976745). AC-2, AC-4 to AC-12: out of part.
- pr-review confirm at bc91fcef (part 1 of 5): 0 critical, 0 major, 2 minor, 1 nit
  - **1. Minor, bug (write-gate regression), fixed 7159cd61.** File: scripts/ai-skills/hooks/hook.mjs:965, guard at hook.mjs:185. Run from cwd `/repo`, `cd .prism && cd "$(pwd)" && tee rules/a.md` resolves to `/repo/.prism/ pwd /rules/a.md`. That happens because walkSegments flattens the substitution, so the guard in resolveCdTarget never sees `$`. The routed write goes unnamed, where base kept `.prism`. Class: a guard written for raw token text, applied to parser words whose quotes and substitutions are already removed. Sweep: grep for the `$` and backtick guards in hook.mjs and git-gates.mjs found only line 185, and the other two callers are pre-filtered by SHELL_READ_SAFE_CHARACTERS. Fix: read a target holding a substitution as unresolvable via containsSubstitution, and add a test. Open on the PR as an inline thread.
  - **2. Minor, bug (test can't catch its regression), fixed af5b0521.** File: scripts/ai-skills/hook-harnesses.test.ts:116. Three readShellCall branches in harnesses.mjs survive mutation: the quoteArgv quote escape, the empty cwd reading null, and a non-string command returning null. Class: escaping and normalization branches covered only by inputs that never hold the value they handle. Sweep: git grep readShellCall found only harnesses.mjs, its sidecar, and this test. Fix: add three asserts. Open on the PR as an inline thread.
  - **3. nit, nitpick, fixed: the paragraph is in past tense and no longer says the files move to `tokenize`.** File: .prism/plans/prism-544/spec.md:62. The Shared parser paragraph says hook.mjs and git-gates.mjs call lib/shell.mjs "today", and that they move to tokenize, which neither imports. Fix: reword to past tense, or decline it as design history. Open on the PR.
  - Round 3 finding 1 confirmed fixed at 73f9e328 for hook-runtime.md, and its thread is resolved. The ADR-0076 half stays an open decision item under Still open on the PR, with amending it in this PR as the recommendation. CI: prism-check passed on ubuntu-latest and windows-latest at bc91fcef (run 44666839923). Labels: effort:deep, review:has-minors.
- pr-review confirm at d8460c51 (part 1 of 5): 0 critical, 0 major, 1 minor, 0 nit
  - **1. Minor, standards violation, fixed 0e183936.** File: .prism/spec/adrs/_toolkit/0076-commit-and-push-gates-are-harness-hooks.md:108. "An over-hold blocks nothing unless lint actually fails" holds for the push gate only. With `commitCleanupPass` on, the commit gate denies the first `git commit` on each HEAD, so an unreadable-text over-hold (a `gh pr comment --body` holding `git commit` and a lone backtick, checked with `detectGitSegments` at this head) costs one denied call and a retry. Class: the sentence right after an admitted gap, widened from one gate to both. Fix: scope it per gate, then `pnpm prism:build`. Open on the PR as an inline thread.
  - Previous confirm findings 1, 2, and 3 confirmed fixed at 7159cd61, af5b0521, and 785451b4, threads resolved. The ADR-0076 half of round 3 finding 1 is amended (71fa8515, dfb018f8) under the ruling Decision. Its other claims match git-gates.mjs. CI: prism-check passed on ubuntu-latest and windows-latest at d8460c51 (run 44673888087). Labels: effort:deep, review:has-minors.
- pr-review confirm at 5966a640 (part 1 of 5): 0 critical, 0 major, 0 minor, 1 nit
  - **1. nit, nitpick, open.** File: .prism/spec/adrs/_toolkit/0076-commit-and-push-gates-are-harness-hooks.md:108. "blocks nothing unless lint actually fails" leaves out format: `runPushGate` runs every slot in `PUSH_VERIFICATION_SLOTS`, lint and then format, and denies on whichever fails first. Fix: "lint or the format check" in the next commit that touches the ADR, or decline. Listed in the PR summary, with no inline thread.
  - The d8460c51 confirm Minor is confirmed fixed at 0e183936, and its thread is resolved. The sentence matches `runCommitGate`, which denies once per HEAD and then allows the retry, and the four copies are identical. CI: prism-check passed on ubuntu-latest and windows-latest at 5966a640 (run 44674664291). Labels: effort:deep, confidence:needs-judgment, set by reconcile once the marked summary comment (7028723441) carried this pass's state=3 verdict.

## Acceptance Criteria

The issue's criteria, with IDs and evidence.

- [ ] **AC-1** The existing gates read shell commands through the shared parser (`lib/tokenize.mjs` and `lib/segments.mjs`), and the read-credit path keeps its current behavior.
  - Evidence (machine): `test ! -e scripts/ai-skills/hooks/lib/shell.mjs`, no runtime or test file imports it, `git diff origin/main -- scripts/ai-skills/hook-gate.test.ts scripts/ai-skills/hook-gate-read-credit.test.ts` is empty, and both suites pass with `git-gates.test.ts` and `git-gates-shell-string.test.ts` · UNMET looks like: an assertion changed in either read-credit suite, or the `bash -c` commit not held.
- [ ] **AC-2** The secrets gate denies reading, searching, or shell access to `.env` and `.env.*` (except `.env.example`), any `secrets/` path segment, `*.pem`, `*.key`, and a search whose root holds one. Config can extend the patterns. The one allowed shell form prints key names and never values, and the deny's remedy names that form.
  - Evidence (machine): `secrets-gate.test.ts` passes its three legs, "secretPaths adds a pattern and keeps every built-in", and the ported Grep-root cases, and `env-keys.test.ts` passes "no value and no line inside a multi-line quoted value reaches stdout" · UNMET looks like: a Read of `.env` passing, a deny without `env-keys.mjs` in it, or `sk-test-123` on stdout.
- [ ] **AC-3** `roles.json` carries an optional `gated` flag. The brief gate denies a brief over 15 non-blank lines, or one with an override phrase, sent to a `gated` role.
  - Evidence (machine): `discovery-metadata.test.ts` passes "buildRoleMap rejects a non-boolean gated value", and `brief-gate.test.ts` passes "GATED_ROLES equals the gated roles in roles.json", its three legs, and the ported override-phrase cases · UNMET looks like: a 16-line brief to `prism-implement` passing, or the constant and `roles.json` disagreeing.
- [ ] **AC-4** The commit gate denies `-a`, `-i`/`--include`, a commit with no paths, a whole-repo path, a pathspec the shell would expand, a `:` magic pathspec, `--no-verify` and its short forms, an inline `core.hooksPath`, and more than one commit per command. On push it denies `--no-verify` and an inline `core.hooksPath`.
  - Evidence (machine): `commit-gate-parse.test.ts` passes a case per deny id, `all`, `include`, `no-paths`, `expanded-paths`, `magic-pathspec`, `no-verify` with `-n`, `hooks-path`, and `multiple-commits`, plus both push denies, and `commit-gate.test.ts` passes leg 1 · UNMET looks like: any of those commands passing the spawned gate.
- [ ] **AC-5** On a folder-plan branch, the commit gate also denies a subject that is not a task form, a `plan:` commit touching anything outside the plan folder, a `retro:` commit outside the retro's paths, a removed line in a test file that predates the branch unless a named task lists it with `behavior change:` (the test globs come from a new `testGlobs` config key), and a stop-path file no named task lists, with dependency changes needing `new dependency:`.
  - Evidence (machine): `commit-gate-checks.test.ts` and `commit-gate-test-guard.test.ts` pass the ported subject, plan-path, retro-path, weakened-test, and stop-path cases and the `resolveTestGlobs` cases, and `.ai-skills/config.schema.json` declares `testGlobs` · UNMET looks like: `PRISM-9: x` passing on a folder-plan branch, or a removed old test line passing with no `behavior change:`.
- [ ] **AC-6** The commit gate reads a would-be tree from a temporary index, so files a sibling staged are ignored.
  - Evidence (machine): `commit-gate-tree.test.ts` passes "a sibling's staged file is not in the would-be tree and the shared index is unchanged", and `commit-gate.test.ts` leg 3 shows the sibling still staged after the commit · UNMET looks like: `b.txt` in the would-be paths, or the shared index changed.
- [ ] **AC-7** `prism-pr-review` cannot stop while reconcile reports unclean, up to three times.
  - Evidence (machine): `reconcile-gate.test.ts` passes its three legs and the ported count cases · UNMET looks like: an unclean report letting the stop through before the fourth try, or a fourth block.
  - Evidence (human): on a scratch PR with one unanswered human comment, dispatch `prism-pr-review` and see the stop sent back with the comment named. Record the PR number in `## History` · UNMET looks like: the subagent stopping on its first unclean report.
- [ ] **AC-8** `PRISM_HOOK_DISABLE` and `PRISM_HOOK_DENY_DISABLE` still work, the secrets gate and the approve guard ignore both, and the commit gate denies a command that sets either one inline.
  - Evidence (machine): the brief, commit, and reconcile suites pass their switch cases, `secrets-gate.test.ts` passes "either kill switch leaves the deny in place", `approve-guard.test.ts` passes "PRISM_HOOK_DISABLE and PRISM_HOOK_DENY_DISABLE do not turn the execution arm off", and `commit-gate.test.ts` passes "a command that sets a kill switch inline is denied" · UNMET looks like: the secrets deny gone under a switch, or `PRISM_HOOK_DISABLE=1 git commit` passing.
- [ ] **AC-9** Every gate fails open when it crashes, except the approve guard's execution arm, which fails closed on shell syntax it cannot read.
  - Evidence (machine): each new suite passes "a crash fails open: malformed JSON on stdin writes nothing to stdout and one stderr line", and `approve-guard.test.ts` passes "a command the tokenizer can't read is denied when it holds approve" · UNMET looks like: stdout or a non-zero exit on malformed input.
- [ ] **AC-10** A registration test pins each hook's event, matcher, command, and timeout on each host. Each host gap, such as Codex not blocking at subagent start, is recorded in `hook-runtime.md`.
  - Evidence (machine): `hook-registrations.test.ts` passes over both templates and `.claude/settings.json`, and `hook-runtime.md` holds the host-limitations paragraph T23 writes, which T23's proof greps · UNMET looks like: a gate's registration missing from a file, a timeout other than 21 or 120, or no limitations paragraph.
- [ ] **AC-11** Onboarding writes an architect route over a consumer's source tree only when it has drafted an architect doc with real content, and never writes a stub.
  - Evidence (machine): `prism-onboard`'s `shared.md` holds the Architect routes item, and `doctor.test.ts` passes "runDoctor warns on a route to a doc holding only headings and comments" · UNMET looks like: a step that writes the route before the doc, or no doctor warning.
  - Evidence (human): run Atlas on a scratch repo with a `src/` tree and decline the doc offer. `git status -s .prism/architect` shows nothing · UNMET looks like: a new route or an empty doc on disk.
- [ ] **AC-12** `git-conventions.md` says `--no-verify` is never used, instead of "unless the user explicitly asks".
  - Evidence (machine): T16's proof greps the two new lines in `.prism/rules/git-conventions.md`, and `pnpm prism:check` shows the copies and twin match · UNMET looks like: `--no-verify` still sharing the "unless the user explicitly asks" line.
- [ ] **AC-13** The whole check suite passes on both CI platforms.
  - Evidence (machine): each part's `prism-check` CI is green on `ubuntu-latest` and `windows-latest` · UNMET looks like: either leg red.

### AC Sync Log

| Date | Agent | Action | Plan | Ticket |
| ---- | ----- | ------ | ---- | ------ |
| 2026-11-19 | plan stage | Wrote AC-1 to AC-13 from issue #544's thirteen criteria, adding IDs and Evidence only; the wording matches the issue | written | synced |

## PR Readiness

Retro:
