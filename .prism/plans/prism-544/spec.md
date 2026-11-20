---
title: Agent hooks — shared parser, secrets, brief, commit, and reconcile gates
ticket: https://github.com/HunterMcGrew/PRISM/issues/544
stage: spec
status: draft
epic: prism-499
child: 8
---

Child 8 of the Kitchen Line epic (#499). The design source is `.prism/plans/prism-499/spec.md`: row 8 of its Children table, its Merge order (this child needs the task parser and stop paths from child 4 and reconcile from child 6, all merged), and the Agent hooks, Architect routes for consumer code, and Always-on rule edits parts of its Design. The epic's approved `intent.md` covers this child.

The thrive reference is TracTru/thrive at `db3570975431fa1d6114cc5f4170c126f6be7e97`, the ref children 4, 6, and 7 pinned. Read a file with `gh api "repos/TracTru/thrive/contents/<path>?ref=db3570975431fa1d6114cc5f4170c126f6be7e97" -q .content | base64 -d`. The files this child ports from:

- `scripts/hooks/secrets-gate/hook.mjs`, `hook.test.mjs`, and `env-keys.test.mjs`, with the remedy script `scripts/env-keys.sh`
- `scripts/hooks/brief-gate/hook.mjs` and `hook.test.mjs`
- `scripts/hooks/commit-gate/hook.mjs`, `parse.mjs`, `checks.mjs`, `test-guard.mjs`, `tree.mjs`, `test-helpers.mjs`, and each one's `.test.mjs`
- `scripts/hooks/reconcile-gate/hook.mjs` and `hook.test.mjs`
- `scripts/hooks/registrations.test.mjs`
- `.ai-spec/architect/agent-hooks.md` and `.ai-spec/architect/commit-gate.md`, for the contracts and the three-leg test convention

The epic's Swaps table applies to every port: `.ai-spec/` becomes `.prism/`, `thrive-<stage>` role IDs become PRISM's (`thrive-pr-review` → `prism-pr-review`, `thrive-devils-advocate` → `prism-challenge`), `origin/main` becomes `origin/<defaultBranch>`, `thrive-pr:` becomes `prism-pr:`, bash becomes zero-dependency `.mjs`, and `.test.mjs` suites become top-level `scripts/ai-skills/<name>.test.ts`, the only pattern `run-tests.ts` discovers.

## Requirements

1. `hook.mjs` (the write gate and the read-credit arm) and `git-gates.mjs` read shell commands through `lib/tokenize.mjs` and `lib/segments.mjs`. No module imports `lib/shell.mjs` afterward, and it leaves the runtime. Every existing case in `hook-gate.test.ts`, `hook-gate-read-credit.test.ts`, and `git-gates.test.ts` passes with its assertion unchanged.
2. The secrets gate denies a read, a search, or a shell command that reaches `.env` or `.env.*` other than `.env.example`, any `secrets/` path segment, a `*.pem` or `*.key` file, or a search whose root holds one, matching without regard to case. A new `secretPaths` config key adds patterns and cannot remove a built-in one.
3. The secrets gate allows exactly one shell form that touches a secret file, `node <runtime dir>/env-keys.mjs <file>`, which prints the file's key names and never a value. Its deny text names that form.
4. `roles.json` accepts an optional boolean `gated` on a role. The brief gate denies a subagent brief sent to a gated role when the brief has more than 15 non-blank lines or carries an override phrase.
5. The commit gate denies, on any branch: `-a`, `-i` or `--include`, a commit naming no paths, a whole-repo path, a path the shell would expand, a `:` magic pathspec, `--no-verify` or `-n`, an inline `core.hooksPath`, and more than one commit in one command. On `git push` it denies `--no-verify` and an inline `core.hooksPath`.
6. On a folder-plan branch the commit gate also denies: a subject that is not a task form, a `plan:` commit touching a path outside the plan folder, a `retro:` commit touching a path outside the retro's paths, a removed line in a test file that predates the branch unless a named task lists the file and carries `behavior change:`, and a stop-path file no named task lists, where a changed dependency file needs `new dependency:` on that task.
7. The commit gate judges the would-be commit from a temporary index, so files a sibling staged and did not name are ignored, and the shared index is never written.
8. The commit gate reads a `node <runtime dir>/plan/commit.mjs "<subject>" <paths>` call the same way it reads a `git commit`, since every folder-plan stage commits through that script.
9. A new `testGlobs` config key names the test files the weakened-test check reads.
10. The reconcile gate blocks a `prism-pr-review` subagent from stopping while `reconcile.mjs` reports unclean, at most three times per session, then lets it stop and logs the fact.
11. `PRISM_HOOK_DISABLE` and `PRISM_HOOK_DENY_DISABLE` keep their behavior for the existing gates and apply to the brief, commit, and reconcile gates. The secrets gate and the approve guard ignore both. The commit gate denies a command that assigns or exports either one.
12. Every gate fails open on its own crash: nothing on stdout, one stderr line, exit 0. The approve guard's execution arm keeps failing closed on shell syntax it cannot read.
13. Each gate has the three-leg test: the deny fires, a seeded state clears it, and the live remedy clears it.
14. A registration test pins each hook's event, matcher, command, and timeout on Claude Code and Codex, in both install templates and in PRISM's own `.claude/settings.json`. Each place a host cannot run a gate as designed is recorded in `hook-runtime.md` as a host limitation.
15. Onboarding writes an architect route over a consumer's source tree only after it has written an architect doc with real content for that route, and never writes a stub. `prism doctor` warns on a route whose doc holds no content.
16. `git-conventions.md` says `--no-verify` is never used. Every other text this child makes false is corrected in the same PR.
17. `pnpm prism:check` passes on both CI platforms.

## Design

### Runtime layout

PRISM's runtime is the base, per the epic's Decision on it. Each new gate is its own entry point beside `hook.mjs`, `git-gates.mjs`, and `approve-guard.mjs`, so a crash or a slow git call in one gate never reaches another:

| File | Role |
| --- | --- |
| `secrets-gate.mjs` | entry point, port of thrive's `secrets-gate/hook.mjs` |
| `env-keys.mjs` | the secrets remedy, a `.mjs` rewrite of thrive's `env-keys.sh` |
| `brief-gate.mjs` | entry point, port of thrive's `brief-gate/hook.mjs` |
| `commit-gate.mjs` | entry point, port of thrive's `commit-gate/hook.mjs` |
| `commit-gate/parse.mjs`, `checks.mjs`, `test-guard.mjs`, `tree.mjs` | ports of the same thrive modules |
| `reconcile-gate.mjs` | entry point, port of thrive's `reconcile-gate/hook.mjs` |

Each runtime file carries the `@prism-hook-runtime` marker and a `.d.mts` sidecar, imports only `node:` builtins and its siblings, and keeps thrive's entry guard and header comments, known-misses lists included, per `.prism/architect/_toolkit/hook-runtime.md` and `.prism/architect/_toolkit/plan-chain-scripts.md`. `HOOK_RUNTIME_FILES` in `scripts/ai-skills/update.ts` gains every new file and drops `lib/shell.mjs`, so `pruneStaleHookRuntimeFiles` backs up and removes a consumer's old marked copy. The same task deletes `lib/shell.mjs` and `lib/shell.d.mts` and fixes their references in `update.test.ts` and `git-gates.test.ts`. The remaining importers, `hook.mjs`, `git-gates.mjs`, and `update.ts`, have already moved by then. A `## History` line, carried into the release note, says a consumer will find `.claude/hooks/lib/shell.mjs.bak` after updating. `HOOK_RUNTIME_ENTRY_POINTS` gains the four entry points. The `test-helpers.mjs` module from thrive is not delivered. Its git fixture helpers move into the commit gate's test file.

The new commit gate is a separate thing from `git-gates.mjs`'s opt-in cleanup-pass hold, which `hook-runtime.md` also calls a commit gate. `hook-runtime.md` and `git-hooks.md` name the new one "the commit gate" and the old one "the cleanup-pass hold", so the two stop sharing a name. ADR-0076 is left as written, and `hook-runtime.md` gains a clause saying that ADR calls the hold "the commit gate".

### Shared parser

`hook.mjs` and `git-gates.mjs` call `splitShellSegments` and `unquote` from `lib/shell.mjs` today. They move to `walkSegments` and `tokenize`. The read-credit arm's contract does not move: the safe-character allow-list over the whole command, the `cd <dir> &&` prefix rule, flagless `cat` as the only crediting read, the heredoc data-reader rule, and the `\` to `/` rewrite. The existing suites are the proof that it held, and no assertion in them changes. A segment the walk reports as unreadable credits nothing and gates as a write, which is the direction the write gate already resolves doubt.

`git-gates.mjs` reads its `commit` and `push` segments through `walkSegments`, which also reaches a `git commit` inside `bash -c` that the old splitter missed. `plan-chain-scripts.md` drops its line that no gate calls the parser yet.

### Harness additions

`harnesses.mjs` gains what the new events need:

- `Agent` and `Task` as a `dispatch` tool kind on Claude, with accessors for `tool_input.subagent_type` and `tool_input.prompt`.
- `emitBlockStop(reason)` for `SubagentStop`, returning `{ decision: "block", reason }` on Claude and Codex.
- The Codex `SubagentStart` and `SubagentStop` payload fields, taken from thrive's `lib/harness.mjs` at the ref.

### Secrets gate

A port of thrive's three arms: Read on the file path, Grep on its `path` and `glob` plus `git ls-files -co --exclude-standard` under the search root (a gitignored root is walked on disk, up to 5000 entries), and the shell arm over `walkSegments`, judging every word as a path and probing unquoted globs. The container env-dump arm and its Docker arms are not ported, per the epic.

- **Patterns.** The built-ins are fixed in the module. `secretPaths` in `.ai-skills/config.json` is an optional array of `compileMatcher` globs added to them. An absent key adds nothing, and a set value that is not an array of strings is ignored with one stderr line, since the gate must not fail open on the built-ins over a config typo.
- **Remedy.** `env-keys.mjs <file>` prints one key name per line, skipping blanks and comments, and exits 2 on a missing file. The exempt shell form is exactly `node <path to env-keys.mjs> <file>` with no other segment, where the path is the runtime's own copy resolved through `import.meta.url`. Deny text: `Secret files stay unread. Run node <rel>/env-keys.mjs <file> for key names, or read .env.example.`, with `<rel>` the runtime directory from the repo's top level.
- **Switches.** The gate reads neither kill switch.
- **Registration.** Claude `PreToolUse` matched `Read|Grep|Bash|PowerShell`. Codex `PreToolUse` matched `^Bash$`, since Codex reads files through the shell. Timeout 21 on both.

### Brief gate

A port of thrive's gate: a brief to a gated role is denied past 15 non-blank lines, or when it matches an override pattern (ignore or disregard the instructions or rules, "you may skip", "do not read the plan"). The deny names the role and says to move the content into `plan.md` and send the plan folder, the task IDs, the worktree path, and the report shape, then gives the cause.

- **Which roles are gated.** `roles.json` gains the optional boolean `gated`. `generate-skills.ts` rejects a non-boolean value. It is set on the roles a plan-folder run dispatches as subagents: `prism-spec`, `prism-challenge`, `prism-verify`, `prism-implement`, `prism-docs`, and `prism-pr-review`. `prism-architect` is left ungated, because a stage sends it a scope idea or a finding in prose by design.
- **How the gate knows.** A consumer has no `roles.json` on disk, because `prism update` reads the roster from PRISM's package. So `brief-gate.mjs` exports a `GATED_ROLES` constant, and its test asserts the constant equals the `gated: true` IDs in `roles.json`. One source of truth, one runtime file, and no build step.
- **Registration.** Claude `PreToolUse` matched `Agent|Task`, timeout 21. Codex `SubagentStart`, timeout 21, where the gate cannot block: it appends a `would-deny` row to the hook log instead.
- **Hook log.** `prism-hooks.jsonl` in the worktree's own git directory, the place the chat approval token already lives. It never shows in the working tree and needs no `.gitignore` line. The reconcile gate writes its `reconcile:unclean` row there too.

### Commit gate

A port of thrive's `commit-gate/` modules with PRISM's sources swapped in:

- **Order.** The flag denies run before any config read, so a broken config never stops them.
- **Config errors.** A config error in `testGlobs` or `stopPaths`, or a `.ai-skills/config.json` that does not parse, denies the commit with the config message, the way `auto-approve.mjs` exits 2 on the same errors. The gate never fails open on it and never skips the check.
- **Flag denies.** The `parse.mjs` ids and remedies as written: `all`, `include`, `no-paths`, `no-verify`, `hooks-path`, `expanded-paths`, `magic-pathspec`, and `multiple-commits`, plus the push pair. One addition, `kill-switch`, denies a command that assigns or exports `PRISM_HOOK_DISABLE` or `PRISM_HOOK_DENY_DISABLE` anywhere in it. Deny text keeps the shape `Commit gate (<check>): <reason> <remedy>`.
- **`commit.mjs` calls.** The thrive parser reads `scripts/plan/commit.sh`. PRISM's equivalent is a `node` segment whose script resolves to `plan/commit.mjs` under the runtime directory, `scripts/ai-skills/hooks` in PRISM and `.claude/hooks` in a consumer. The script path is compared through the native realpath, as the approve guard compares `approve.mjs`. Its first operand is the subject and the rest are paths. Because `commit.mjs` passes `--literal-pathspecs`, a `:` path in a `commit.mjs` call is not magic, and only the `git commit` form gets the magic-pathspec deny.
- **Folder-plan branch.** The branch's ticket ID comes from `ticketPrefix`, resolved to a plan through `plan/lookup.mjs` the way `findPlanForBranch` in `compact-handoff.mjs` does. A branch whose plan is a flat file or absent gets the flag denies only.
- **Subject.** A subject passes when `parseSubject` in `plan/tasks.mjs` reads it as a task form, `plan:`, or `retro:`. `plan:` may touch only the plan folder. `retro:` may touch only the plan folder, `.prism/retros/**`, `.prism/lessons.md`, `.prism/archived/lessons-archive.md`, `.prism/metrics/review-misses.jsonl`, and the promotion targets `.prism/architect/**`, `.prism/spec/adrs/**`, and `.prism/rules/**`, the set `prism-retro` commits.
- **Weakened tests.** A removed line counts when the file matches `testGlobs` and `git blame` marks the line as older than `git merge-base origin/<defaultBranch> HEAD`. It is allowed when a task the subject names lists the file and carries `behavior change:`. The flat-plan allowance in thrive is moot, since the check fires only on a folder plan.
- **Stop paths.** `resolveStopPaths` and `matchStopPath` from `plan/stop-paths.mjs`, read from config. A contract path needs a named task that lists it. A dependency path needs a named task that lists it and carries `new dependency:`, and counts only when its dependency entries change. For `package.json` and `composer.json` that is the dependency fields, compared as parsed JSON. Any other dependency-kind file counts on any change, because PRISM reads no TOML or lockfile format.
- **Would-be tree.** As in thrive's `tree.mjs`: a temp `GIT_INDEX_FILE` under `os.tmpdir()`, `git read-tree HEAD`, `git add -A -- <paths>`, then the changed paths from `git diff --cached --name-only --no-renames -z HEAD`, with cleanup in a `finally` and a 5-second limit per git call. For a `commit.mjs` call, `tree.mjs` passes `--literal-pathspecs` to the git calls that build the temporary index, so the tree it judges is the one `commit.mjs` will commit. A `cd` or `git -C` the walk cannot resolve falls back to the session directory.
- **Mid-operation.** During a merge, cherry-pick, or revert, only the flag denies run.
- **Repos without PRISM.** A repo with no `.prism/architect/manifest.json` passes, as in thrive.
- **Registration.** Claude `PreToolUse` matched `Bash|PowerShell`. Codex `PreToolUse` matched `^Bash$`. Timeout 21 on both.

### `testGlobs`

`testGlobs` is a new optional array of `compileMatcher` globs. As with `stopPaths`, a set list replaces the default, and an absent key takes it. The default covers common test names at the root and at any depth: `*.test.*`, `**/*.test.*`, `*.spec.*`, `**/*.spec.*`, `__tests__/**`, `**/__tests__/**`, `test/**`, `**/test/**`, `tests/**`, and `**/tests/**`. A pattern holding `{` is rejected, since `compileMatcher` reads braces literally. PRISM's own config sets `["scripts/ai-skills/*.test.ts"]`. Onboarding offers a list for the detected stack, merged by hand like `gitHooks`.

### Reconcile gate

A port of thrive's gate:

- **What it reads.** On `SubagentStop` with `agent_type` `prism-pr-review`, it runs `node <runtime dir>/review/reconcile.mjs <pr> --json` with a 90-second limit. The PR number comes from the reply's last non-blank line, `prism-pr: <n>`, which `prism-pr-review` already prints, or from stored state.
- **Blocking.** The block reason lists each unclean item in one sentence and ends by asking for the `prism-pr:` line.
- **Counting.** The count lives in `<os.tmpdir()>/prism-hooks/reconcile/<tool>/<session>.json`, written through a temp file and a rename. A clean report deletes the file. After three blocks, the gate deletes the file, lets the stop through, and logs `reconcile:unclean`. With no PR line and nothing stored, it blocks once to ask for the line, and lets a second miss through.
- **Registration.** `SubagentStop` matched `^prism-pr-review$` on Claude and Codex, timeout 120. The gate checks `agent_type` itself too, so a host that ignores the matcher still reaches only that role.

### Kill switches and failure

The brief, commit, and reconcile gates check both switches before they parse stdin, as `hook.mjs` does. The secrets gate and the approve guard read neither. Every entry point wraps its work in a try/catch that writes one stderr line, prints nothing, and exits 0. `writeStdout` swallows `EPIPE`.

### Registrations

The new entries go into `templates/install/.claude/settings.json`, `templates/install/.codex/hooks.json`, and PRISM's own `.claude/settings.json`, where the commands use the `scripts/ai-skills/hooks/` path. `mergeHookEventEntries` already claims entries by command pattern, so a consumer's own entries survive. The existing entries keep no `timeout`. The registration test pins that absence and the new values above, so a timeout added later is a visible change.

The Codex host gaps go into `hook-runtime.md` as host limitations: the brief gate logs and cannot deny at subagent start, and the `SubagentStart` and `SubagentStop` payloads are documentation-read and not live-probed. Cursor gets no registration, as now.

### Architect routes for consumer code

`prism-onboard` gains one step after rule generation. For each source tree the stack detection found, offer to draft one architect doc at `.prism/architect/<topic>.md`. Write it from the code, under `.prism/architect/guides/writing-an-architect-doc.md`. Add its route to the live `.prism/architect/manifest.json` in the same step, and only once the doc holds content. When the person declines or no content survives the Deletion Test, write neither file. The routing rule in `hook-runtime.md` stays as it is, because an unrouted path is never denied.

`checkArchitectRoutes` in `scripts/ai-skills/doctor.ts` already reports a route to a missing doc. It also warns on a route to a doc with no line besides headings, HTML comments, and blank lines, which is the backstop for a stub that onboarding or a person wrote.

### Text this child makes false

- `.prism/rules/git-conventions.md`, under Force Push Policy: `--no-verify` becomes never used, and its reason is the commit gate. `--no-gpg-sign` keeps "never use unless the user explicitly asks", since no gate denies it.
- `.prism/rules/workflow.md`, one sentence beside the Limits paragraph: "A brief to a gated subagent names the plan folder, the task IDs, the worktree path, and the report shape, in 15 lines or fewer. Anything longer goes into `plan.md` first."
- `.prism/spec/adrs/_toolkit/0081-git-hooks-ship-beside-the-agent-gates.md`: the Consequences line about `--no-verify` stays as written, and a second `> Amended <date> by PRISM-544 …` note goes under the existing one, saying the commit gate now denies `--no-verify` for agents.
- `.prism/spec/adrs/_toolkit/README.md`, the ADR-0081 row, which says `--no-verify` still skips the hooks until the commit gate lands.
- `.prism/architect/_toolkit/git-hooks.md`: the opening line's "the commit cleanup pass" becomes "the cleanup-pass hold", and the line saying an agent passing `--no-verify` skips the hook while the push gate believes it ran is corrected.
- `.prism/architect/_toolkit/hook-runtime.md`: the new gates, the hook log, the Switches paragraph, the delivered file list, the host limitations, and the cleanup-pass hold rename with its ADR-0076 clause.
- `.prism/architect/_toolkit/plan-chain-scripts.md`, the shell-parser line.
- `.prism/architect/_toolkit/onboarding.md`, the workflow order, for the route step.
- The generated copies of each, `AGENTS.md`, the install seed, and the `docs/` pages that list what the hook runtime delivers, regenerated or edited to match.

### Open questions

- **Codex subagent events.** Whether Codex fires `SubagentStart` and `SubagentStop` with the fields thrive reads is unprobed in PRISM. Default: register them as thrive does and record them in `hook-runtime.md` as documentation-read.
- **Claude `SubagentStop` matcher.** Whether Claude Code matches a `SubagentStop` matcher against the agent type is unverified here. Default: keep the matcher and the gate's own `agent_type` check, which holds either way.

## Decisions

- **Gate `prism-docs` and leave `prism-architect` ungated.** The epic spec says the flag is "set on the roles that run as subagents from a plan folder". `prism-docs` runs that way as a build stage, so it is gated. `prism-architect` is dispatched from a plan folder too, which this narrows, because its brief is a prose scope idea or challenge finding by design. Winston's fit verdict: proceed.
- **`testGlobs` has a default list.** An absent key takes the default, and a set list replaces it, following the `stopPaths.dependency` precedent, so a consumer who skips onboarding still gets the weakened-test check. Winston's fit verdict: proceed.
- **The workflow rule states the brief shape up front.** `.prism/rules/workflow.md` gains the 15-line path-brief sentence beside Limits. When the plan stage dispatches a confirm round to `prism-challenge` after an architect ruling, the brief says a verdict exists and does not paste it, which is how `prism-challenge` already reads the brief. The plan stage records the verdict itself in `plan.md`. Rejected: relying on the deny text alone, because Codex only logs at subagent start and never shows a deny there. Winston's fit verdict: proceed with changes.
- **`lib/shell.mjs` is deleted with its delivery entry.** One task removes it from `HOOK_RUNTIME_FILES`, deletes `lib/shell.mjs` and `lib/shell.d.mts`, and fixes `update.test.ts` and `git-gates.test.ts`. A History line, carried into the release note, tells consumers they will find `.claude/hooks/lib/shell.mjs.bak` after updating. Winston's fit verdict: proceed with changes.
- **The commit gate reads `commit.mjs` calls.** Every folder-plan stage commits through `commit.mjs`, which spawns git with no shell, so a gate reading only `git commit` would miss them. The script path is matched through the native realpath, as in the approve guard. `tree.mjs` passes `--literal-pathspecs` when it builds the temporary index for such a call. Winston's fit verdict: proceed with changes.
- **The old hold is renamed "the cleanup-pass hold".** `hook-runtime.md` and the opening line of `git-hooks.md` use the new name. ADR-0076 and ADR-0081's Consequences line are left as written. ADR-0081 gets a second amendment note, and the ADR-0081 row in `.prism/spec/adrs/_toolkit/README.md` is corrected along with its generated copies. Winston's fit verdict: proceed with changes.

## Affected systems

```text
scripts/ai-skills/hooks/**
scripts/ai-skills/*.test.ts
scripts/ai-skills/update.ts
scripts/ai-skills/doctor.ts
scripts/ai-skills/generate-skills.ts
.ai-skills/config.json
.ai-skills/config.schema.json
.ai-skills/definitions/roles.json
.ai-skills/skills/prism-onboard/**
templates/install/.claude/settings.json
templates/install/.codex/hooks.json
templates/install/.prism/rules/git-conventions.md
templates/install/.prism/architect/_toolkit/**
.claude/settings.json
.claude/rules/**
.claude/architect/**
.claude/spec/**
.claude/skills/prism-onboard/**
.codex/rules/**
.codex/architect/**
.codex/spec/**
.codex/agents/**
.cursor/rules/**
.cursor/architect/**
.cursor/spec/**
.cursor/skills/prism-onboard/**
.prism/rules/git-conventions.md
.prism/architect/_toolkit/hook-runtime.md
.prism/architect/_toolkit/git-hooks.md
.prism/architect/_toolkit/plan-chain-scripts.md
.prism/architect/_toolkit/onboarding.md
.prism/spec/adrs/_toolkit/0081-git-hooks-ship-beside-the-agent-gates.md
.prism/spec/adrs/_toolkit/README.md
templates/install/.prism/spec/adrs/_toolkit/README.md
.prism/rules/workflow.md
templates/install/.prism/rules/workflow.md
.prism/plans/prism-544/**
.prism/lessons.md
AGENTS.md
docs/what-prism-writes.md
docs/adopting-into-existing-repos.md
docs/ai-skills/compatibility.md
```
