---
title: Ship git pre-commit and pre-push hooks with an installer
ticket: https://github.com/HunterMcGrew/PRISM/issues/516
stage: plan
status: closed
---

Child 2 of the Kitchen Line epic (#499). The design comes from the "Git hooks" part of the epic spec on `huntermcgrew/prism-499-approve-once` (PR #518), at `.prism/plans/prism-499/spec.md`. The thrive reference is TracTru/thrive #2847 at 2bbbbcf49.

**Goal:** PRISM ships a pre-commit hook and a pre-push hook, for its own repo and for every consumer, that run the consumer's own commands, skip with a notice when something is missing, and never replace a hook setup PRISM does not recognize.

> Closed: 2026-11-18
> Retro: declined — ticket grain; the lightweight charter-fidelity check ran inline during this close (all 15 tasks landed, AC-1 to AC-6 met by their suites in CI run 44275791883 green on both legs, Eric's re-review at 632035e5 left no finding standing, AC-7's macOS human check still pending), so a separate report would restate it.

## Tasks

Parallel groups, worked out by hand because `bundles.mjs` does not exist until child 4. Each group's tasks touch disjoint files.

- Group 1: T1, T2, T5, T13
- Group 2: T3, T4, T8, T10, T11, T12
- Group 3: T6, T9
- Group 4: T7
- Group 5: T14, T15

Every task is Clove's except T15, which is Eli's. Each new `.mjs` module imports only `node:` builtins and its siblings, and gets a `.d.mts` sidecar, so it runs in a consumer with no `node_modules` and `pnpm prism:check-types` covers it through `tsconfig.hooks.json`. Each new test file sits at the top level of `scripts/ai-skills/` and ends in `.test.ts`, the only shape `run-tests.ts` discovers. Fixture repos isolate git config with `GIT_CONFIG_NOSYSTEM=1` and `GIT_CONFIG_GLOBAL` pointing at an empty temp file, and the formatter and linter in every fixture are small `node` stub scripts written into the fixture, so no test needs Prettier or ESLint.

### T1: Add the shared command helpers the git hooks and the push gate use

- files: scripts/ai-skills/hooks/lib/command.mjs, scripts/ai-skills/hooks/lib/command.d.mts, scripts/ai-skills/hook-command.test.ts
- proof: pnpm exec tsx --test scripts/ai-skills/hook-command.test.ts
- proof fails on main: yes
- depends on: none

Owner: Clove. New module `hooks/lib/command.mjs`, carrying the file's header marker line with `@prism-hook-runtime` like its siblings. Exports:

- `quoteForShell(arg, platform = process.platform)`. On `win32`, wrap in double quotes. Windows filenames cannot contain `"`, so throw if one does. Everywhere else, wrap in single quotes and write each embedded `'` as `'\''`.
- `fillCommand(command, placeholder, paths, platform)`. Replace every `{path}` or `{files}` token (whichever `placeholder` names) with the quoted paths joined by spaces. If the token is absent, append the quoted paths after one space. With `paths` empty, return the command unchanged.
- `isCommandNotFound(result)` takes a `spawnSync` result. It is true for exit 127 (every POSIX shell's not-found), or for a non-zero exit whose stderr matches `/is not recognized as an internal or external command/` (cmd.exe). Move the two constants `POSIX_COMMAND_NOT_FOUND_STATUS` and `CMD_EXE_COMMAND_NOT_FOUND` here verbatim from `git-gates.mjs` (T10 switches `git-gates.mjs` over).
- `readRepoConfig(toplevel)` returns the parsed `.ai-skills/config.json` at `toplevel`, or `null` when the file is absent or not valid JSON. It never throws.

Test cases: POSIX quoting of a name with a space and one with `'`; win32 quoting and its throw on `"`; `{files}` substitution, append when the token is absent, and the empty list; both not-found shapes plus a positive control (exit 1 with other stderr is not "not found"); `readRepoConfig` on absent, invalid, and valid files.

### T2: Add the gitHooks config key to the schema

- files: .ai-skills/config.schema.json, scripts/ai-skills/git-hooks-config.test.ts
- proof: pnpm exec tsx --test scripts/ai-skills/git-hooks-config.test.ts
- proof fails on main: yes
- depends on: none

Owner: Clove. Add a top-level `gitHooks` object to the schema, after `hooks`, with `additionalProperties: false`:

- `preCommit` (object, `additionalProperties: false`):
  - `command` (string). A formatter that reads one file's content on stdin and prints the formatted content on stdout. `{path}` is replaced by the file's repo-relative path. Example: `pnpm exec prettier --stdin-filepath {path}`.
  - `globs` (array of strings, `minItems: 1`). Git glob pathspecs: `**/` crosses directories, `*` does not, and braces are not expanded. Say so in the description.
  - `fix` (string, optional). The command the refusal message prints, with `{files}` replaced by the failing paths. Example: `pnpm exec prettier --write {files}`.
- `prePush` (object, `additionalProperties: false`):
  - `command` (string). Run once with `{files}` replaced by the pushed files that match, or with them appended when the token is absent. Example: `pnpm exec eslint {files}`.
  - `globs`, same shape as above.

The top-level description says the git hooks read this key, onboarding proposes it from the detected stack, and a hook with no `command` or no `globs` skips with a notice. Also extend the existing `hooks.pushVerification` description with one sentence: when PRISM's git hooks are installed, the gate skips `lint` if `gitHooks.prePush.command` is set and skips `format` if `gitHooks.preCommit.command` is set, because the git hook already ran it.

The test validates through the same path `prism update` uses (`config-schema-validate.ts`). A config with both blocks passes. A config with `gitHooks.preCommit.extra` fails. A config with `globs: []` fails. The positive control is that PRISM's own `.ai-skills/config.json` still passes. PRISM's own config gets no `gitHooks` block (see Decisions).

### T3: Write the pre-commit hook module

- files: scripts/ai-skills/hooks/git-hooks/pre-commit.mjs, scripts/ai-skills/hooks/git-hooks/pre-commit.d.mts, scripts/ai-skills/git-hooks-pre-commit.test.ts
- proof: pnpm exec tsx --test scripts/ai-skills/git-hooks-pre-commit.test.ts
- proof fails on main: yes
- depends on: T1

Owner: Clove. A new entry module, `node pre-commit.mjs [--all]`, with an exported `runPreCommit({ toplevel, all, env, platform })` that returns `{ exitCode, stdout, stderr }`, so tests call it in-process and the entry wrapper prints and exits. The wrapper works out `toplevel` with `git rev-parse --show-toplevel` and exits 0 silently when that fails. It passes `process.env` through unchanged. That matters because `git commit -a` and `git commit <paths>` point hooks at a temporary index through `GIT_INDEX_FILE`, and clearing the env would check the wrong index.

Behavior, in order:

1. Read config with `readRepoConfig`. If `gitHooks.preCommit.command` or `.globs` is missing, print `pre-commit: skipped (no gitHooks.preCommit in .ai-skills/config.json)` to stderr and exit 0.
2. Staged mode (the default) lists files with `git -c core.quotePath=false diff --cached --name-only -z --diff-filter=ACMR -- <each glob prefixed with ":(glob)">`. Git does the glob matching, so there is one glob dialect. `--all` mode lists `git ls-files -z -- <same pathspecs>`.
3. For each path, read the content. In staged mode that is `git show ":<path>"` as a Buffer, never the working tree. In `--all` mode it is the file on disk. Run `fillCommand(command, "{path}", [path])` with `spawnSync(..., { shell: true, cwd: toplevel, input: content, maxBuffer: 64 MiB })`.
   - If `isCommandNotFound`, print `pre-commit: skipped (\`<command>\` not found)` and exit 0. This is the "tool is missing" skip.
   - On a non-zero exit, the file fails as "could not format": print `pre-commit: could not format <path>:` plus the command's stderr.
   - On exit 0 with stdout that differs from the content byte for byte (`Buffer.equals`), the file fails as "would reformat".
4. Nothing is ever written: no `--write`, no `git add`, and no change to the index or the working tree.
5. If any file failed, print to stderr `pre-commit: these files are not formatted:`, one `  <path>` line each, then either `Format them, then stage the result:` and `  <fill(fix, "{files}", failing paths)>` when `fix` is set, or `Format them with your formatter, then stage the result.` when it is not. Exit 1. Otherwise exit 0 with no output. `--all` mode uses the same message without "stage the result".

Test cases, each a fixture repo with a stub formatter (`node fmt.mjs {path}`) that prints stdin with trailing spaces stripped and exits 2 on a line `PARSE_ERROR`:

- A staged unformatted file is refused, the message names the fix command, and `git diff --cached` and `git ls-files -s` are unchanged afterward.
- A partially staged file whose staged copy is clean passes while the working copy is dirty.
- A non-ASCII name is named unquoted.
- Nested files under two different globs are both caught.
- A file outside the globs is not checked.
- A parse error refuses with "could not format".
- No `gitHooks` block skips with the notice.
- A missing formatter binary skips with the not-found notice.
- `--all` refuses a committed unformatted file and passes a clean tree.
- With `GIT_INDEX_FILE` pointing at a temp index that holds a clean blob, the temp index's copy is what gets checked.

### T4: Write the pre-push hook module

- files: scripts/ai-skills/hooks/git-hooks/pre-push.mjs, scripts/ai-skills/hooks/git-hooks/pre-push.d.mts, scripts/ai-skills/git-hooks-pre-push.test.ts
- proof: pnpm exec tsx --test scripts/ai-skills/git-hooks-pre-push.test.ts
- proof fails on main: yes
- depends on: T1

Owner: Clove. A new entry module, `node pre-push.mjs <remote> <url>` with the ref lines on stdin. It exports `runPrePush({ toplevel, remote, stdinText, env, platform })` returning `{ exitCode, stdout, stderr }`.

1. Read config. If `gitHooks.prePush.command` or `.globs` is missing, print `pre-push: skipped (no gitHooks.prePush in .ai-skills/config.json)` and exit 0. `defaultBranch` comes from config, or `main` when it is unset.
2. `headSha` is `git rev-parse -q --verify HEAD`. For each stdin line `<local_ref> <local_sha> <remote_ref> <remote_sha>`:
   - Skip a blank line and a 40-zero `local_sha`, which is a ref delete.
   - When `local_sha !== headSha`, print `pre-push: skipped <local_ref> (not the checked-out HEAD; the lint reads the working tree)` and go on to the next line.
   - The base is `remote_sha` when it is non-zero and `git cat-file -e <sha>^{commit}` succeeds. Otherwise it is `<remote>/<defaultBranch>` when that resolves. Otherwise print `pre-push: skipped <local_ref> (no <remote>/<defaultBranch> to diff against)` and go on.
   - The files come from `git -c core.quotePath=false diff --name-only -z --diff-filter=d <base>...<local_sha> -- <":(glob)" pathspecs>`. Keep only paths that exist on disk.
3. Take the union of all refs' files, sorted and de-duplicated. If it is empty, exit 0 without running anything.
4. Run `fillCommand(command, "{files}", files)` once with `spawnSync(..., { shell: true, cwd: toplevel, stdio: "inherit" })`.
   - If `isCommandNotFound`, print `pre-push: skipped (\`<command>\` not found)` and exit 0.
   - On a non-zero exit, print `pre-push: \`<command>\` failed; fix the lint errors, commit, and push again` and exit 1.
   - Otherwise exit 0.

Test cases, each a fixture repo with a bare remote and a stub linter (`node lint.mjs {files}`) that appends its argv to a log file and exits 1 if any file contains `LINT_ERROR`:

- A lint error refuses the push, and the linter ran exactly once.
- A clean push passes, with both changed files in one run.
- A deleted file is not passed to the linter.
- A push of only a deletion runs nothing.
- A known remote SHA lints only the new commits.
- A ref delete line runs nothing.
- A ref that is not HEAD runs nothing and prints the notice.
- With no `origin/main` and a zero remote SHA, the push skips with the notice.
- A missing linter binary skips with the not-found notice.
- No `gitHooks` block skips.
- A non-ASCII name reaches the linter unquoted.

### T5: Write the installer, its state reader, and its session-start arm

- files: scripts/ai-skills/hooks/git-hooks/install.mjs, scripts/ai-skills/hooks/git-hooks/install.d.mts, scripts/ai-skills/git-hooks-install.test.ts
- proof: pnpm exec tsx --test scripts/ai-skills/git-hooks-install.test.ts
- proof fails on main: yes
- depends on: none

Owner: Clove. One module serves `prism hooks install`, `prism update`, the session-start agent hook, `prism doctor`, the push gate, and a consumer's own setup script, so the predicate exists once. Exports:

- `classifyHooksPath(value, repoRoot)` returns `"unset"`, `"ours"`, or `"foreign"`. It strips one trailing `/` or `\` first.
  - `""` is unset.
  - `.githooks` is ours.
  - An absolute path whose basename is `.githooks` is ours only when `git -C <its parent> rev-parse --path-format=absolute --git-common-dir` equals this repo's own common dir, compared after `realpath`. That covers any worktree of the same repository. A failed command makes it foreign.
  - Every other value is foreign: another relative path, `.husky`, a `.githooks` in another repo.
  - Normalize `\` to `/` before the basename check, so a Windows spelling classifies the same way.
- `readGitHooksState(repoRoot)` returns `{ scopes, effective, installed }`.
  - `scopes` reads `git config --<scope> --get core.hooksPath` for `system`, `global`, and `local`, and for `worktree` only when `git config --type=bool --get extensions.worktreeConfig` is `true`. Every read tolerates failure.
  - `effective` is `git config --get core.hooksPath`.
  - `installed` is true when `effective` classifies as ours and `<resolved hooks dir>/pre-commit` exists and contains `@prism-hook-runtime`.
- `installGitHooks(repoRoot, { dryRun })` returns `{ action, message }`, where `action` is `set`, `already`, `left-alone`, or `no-shims`.
  - When `<repoRoot>/.githooks/pre-commit` is absent or lacks the marker, the action is `no-shims`, there is nothing to point at, and nothing is written.
  - When any scope classifies as foreign, the action is `left-alone`. Nothing is written at any scope. The message is `prism hooks: the <scope> core.hooksPath is '<value>'. Git reads one hooks directory, so PRISM's hooks are not active. Compose them with yours by hand. Nothing was changed.`
  - Otherwise, set `git config --local core.hooksPath .githooks` unless it is already exactly that, and unset a worktree-scope value. A system or global value that classifies as ours is left in place. The action is `set` (message `prism hooks: set core.hooksPath to .githooks`, plus `, and removed this worktree's '<old>'` when one was unset) or `already` (message `prism hooks: already installed`).
  - `dryRun` writes nothing and prefixes the message with `would `.
- `runSessionStartInstall(rawStdin)` parses the payload and acts only when `source` is `startup` or `resume`. It resolves the toplevel from `payload.cwd`, and calls `installGitHooks` only when every scope is unset. It returns the message on `set` and `null` on every other path, including any thrown error, so session start never fails because of it.
- Entry point: `node install.mjs` runs `installGitHooks(<toplevel of cwd>)`. It prints the message to stdout, or to stderr for `left-alone`, and exits 0 on every action. That is the line a consumer puts in a setup script.

Why the relative `.githooks` value: local config is shared by every worktree, and git resolves a relative hooks path per worktree, so each branch runs its own hooks. An absolute path into one checkout would make every worktree run that checkout's hooks.

Test cases, each a fixture repo with `.githooks/pre-commit` carrying the marker:

- Unset becomes `.githooks`.
- A local absolute path to this repo's `.githooks/` with a trailing slash is replaced.
- With worktreeConfig on, a worktree value pointing at this repo's `.githooks` is unset, and local becomes `.githooks`.
- A local `.husky` is `left-alone` with the exact message, and both scopes are unchanged.
- A global foreign value (through `GIT_CONFIG_GLOBAL`) is `left-alone`, with no local value written.
- A `.githooks` path in a different repo is foreign.
- No shims gives `no-shims`.
- `dryRun` writes nothing.
- `readGitHooksState` reports installed only when the shim has the marker. The positive control is the same repo with the marker present.
- `runSessionStartInstall` with `source: "compact"` returns null and writes nothing, and with `source: "startup"` in an unset repo sets the value.

### T6: Add the two git hook shims

- files: .githooks/pre-commit, .githooks/pre-push, scripts/ai-skills/git-hooks-shim.test.ts
- proof: pnpm exec tsx --test scripts/ai-skills/git-hooks-shim.test.ts
- proof fails on main: yes
- depends on: T3, T4, T5

Owner: Clove. Two POSIX `sh` files, LF endings (`.gitattributes` already forces LF), committed with mode 100755 (`git add --chmod=+x`). `pre-commit` is below. `pre-push` is the same with `hook=pre-push`.

```sh
#!/bin/sh
# @prism-hook-runtime: PRISM git hook shim. prism update replaces this file.
hook=pre-commit
top=$(git rev-parse --show-toplevel 2>/dev/null) || exit 0
command -v node >/dev/null 2>&1 || { echo "$hook: skipped (node not on PATH)" >&2; exit 0; }
for candidate in "$top/.claude/hooks/git-hooks/$hook.mjs" "$top/scripts/ai-skills/hooks/git-hooks/$hook.mjs"; do
	if [ -f "$candidate" ]; then
		exec node "$candidate" "$@"
	fi
done
echo "$hook: skipped (PRISM's $hook.mjs is not in this checkout)" >&2
exit 0
```

The first candidate is a consumer's delivered runtime. The second is PRISM's own source tree, which registers its agent hooks from `scripts/ai-skills/hooks/`, not `.claude/hooks/`. Resolving from the toplevel, not from the shim's own directory, covers a `core.hooksPath` that points at another checkout's `.githooks` from a branch older than the script: that branch has no `.mjs`, so the hook skips.

Test cases. These run real `git` through the shims, on both CI legs, with Git for Windows' `sh` on Windows:

- Build a fixture repo containing the shims, a copy of `scripts/ai-skills/hooks/git-hooks/` plus `hooks/lib/command.mjs` under `.claude/hooks/`, a config with both `gitHooks` blocks pointing at the stub formatter and linter, and `core.hooksPath` set to `.githooks`.
- A real `git commit` of an unformatted file fails, and its stderr names the fix command. Then a clean commit succeeds.
- A real `git push` to a bare remote with a lint error fails, and a clean one succeeds.
- With `.claude/hooks/git-hooks/` removed, a commit succeeds with the "not in this checkout" notice.
- With a config that has no `gitHooks` block, a commit succeeds with the skip notice.

### T7: Deliver the git hooks to consumers and run the installer on adopt and update

- files: scripts/ai-skills/update.ts, scripts/ai-skills/verify-pack-parity.ts, package.json, scripts/ai-skills/git-hooks-delivery.test.ts
- proof: pnpm exec tsx --test scripts/ai-skills/git-hooks-delivery.test.ts && pnpm run prism:verify-pack
- proof fails on main: yes
- depends on: T5, T6

Owner: Clove.

- **Runtime files.** Append `"lib/command.mjs"`, `"git-hooks/pre-commit.mjs"`, `"git-hooks/pre-push.mjs"`, and `"git-hooks/install.mjs"` to `HOOK_RUNTIME_FILES` in `update.ts`. They then reach `.claude/hooks/` through `deliverHookRuntimeFile` and its marker ownership, with no new copy path.
- **Shim delivery.** Add `deliverGitHookShims(prismRepoRoot, consumerRepoRoot, dryRun)`, called from `refreshHookRuntime` after the runtime files when `claude` or `codex` is in `hosts`. For each of `pre-commit` and `pre-push`, copy `<prismRepoRoot>/.githooks/<name>` to `<consumer>/.githooks/<name>`:
  - An absent target is written.
  - Byte-identical is a no-op.
  - A target carrying `HOOK_RUNTIME_MARKER` is overwritten.
  - An unmarked target is the consumer's own hook. Leave it untouched and `console.warn` `prism:update: .githooks/<name> is not PRISM's; left it alone`. Do not back it up and replace it the way runtime files are handled. That is the "never touch a consumer's git-hook setup" constraint.
  - `chmod 0o755` after each write.
  - Return `FileOutcome`s for the write, no-op, and overwrite cases only, so the `FileOutcome` type does not change.
- **Removal.** In the branch where neither host remains, remove each `.githooks/<name>` only when it carries the marker, then remove `.githooks/` if it is empty.
- **Installer.** In `runUpdate`, right after `refreshHookRuntime`, when `claude` or `codex` is in `hosts`, call `installGitHooks(consumerRepoRoot, { dryRun })`, imported from `./hooks/git-hooks/install.mjs`. Print its message with `console.log`, or `console.warn` for `left-alone`. `runAdopt` delegates to `runUpdate`, so adopt gets it with no second call site.
- **Packaging.** Add `".githooks/"` to `package.json` `files`. Add `{ path: ".githooks", reader: "update.ts deliverGitHookShims — git hook shims copied into the consumer's .githooks/", kind: "prefix" }` to `RUNTIME_READ_PATHS`.

Test cases. These use the existing `runUpdate` fixture shape from `update.test.ts`, copied into this new file rather than imported if it is not exported. The file stays separate so T9 alone owns `update.test.ts`.

- A fresh update writes both shims with the executable bit on POSIX, delivers the four new runtime files, and sets `core.hooksPath` to `.githooks`.
- A second update is a no-op for every git-hook file.
- An unmarked consumer `.githooks/pre-commit` survives byte for byte and the warning prints. The positive control is that the marked `pre-push` beside it is refreshed.
- A consumer whose `core.hooksPath` is `.husky` keeps it.
- `hosts: ["cursor"]` delivers no shims and removes previously delivered marked ones.
- `--dry-run` writes nothing and leaves `core.hooksPath` unset.

### T8: Add the prism hooks install command

- files: scripts/ai-skills/hooks-cli.ts, scripts/ai-skills/cli.ts, scripts/ai-skills/hooks-cli.test.ts
- proof: pnpm exec tsx --test scripts/ai-skills/hooks-cli.test.ts
- proof fails on main: yes
- depends on: T5

Owner: Clove.

- **`hooks-cli.ts`.** Export `runHooksCli(argv)`. Resolve the repo root exactly as `runDoctorCli` does (`resolveConsumerRoot` with `parseConsumerFlag`), then call `installGitHooks`. Print `left-alone` to stderr and every other action to stdout. Exit 0 for every action, including `left-alone`, which is a report and not a failure. An unknown or missing sub-subcommand prints `Usage: prism hooks install [--consumer <path>]` and exits 1. End the file with the `isDirectCliEntry("hooks-cli")` guard pattern from `lib/cli-entry.ts`.
- **`cli.ts`.** Add `case "hooks": await runHooksCli(process.argv.slice(3)); break;`. Add a USAGE line after `doctor`: `  prism hooks install   Point git at PRISM's .githooks (leaves another hooks setup alone)`.

The USAGE text is the authority the cross-reference reachability check reads, so T14 and T15 can name `prism hooks install` in shipped docs.

Test cases:

- In a fixture repo with marked shims, `runHooksCli(["install"])` sets the value.
- A `.husky` value is unchanged and stderr names `.husky`.
- `runHooksCli([])` prints usage and sets the exit code to 1.
- A spawned `cli.ts --help` lists the `hooks install` line.

### T9: Run the installer at agent session start

- files: scripts/ai-skills/hooks/hook.mjs, templates/install/.claude/settings.json, templates/install/.codex/hooks.json, .claude/settings.json, scripts/ai-skills/session-start-install.test.ts, scripts/ai-skills/update.test.ts
- proof: pnpm exec tsx --test scripts/ai-skills/session-start-install.test.ts scripts/ai-skills/update.test.ts scripts/ai-skills/compact-handoff.test.ts
- proof fails on main: yes
- depends on: T5

Owner: Clove.

- **`hook.mjs`.** In `main`'s `SessionStart` branch, run `runSessionStartArm(rawStdin)` and then `runSessionStartInstall(rawStdin)` (imported from `./git-hooks/install.mjs`). Write whichever of the two returns non-null text, joined with a newline when both do. Each arm already filters on `source`, so a compact gets only the post-compact note and a startup gets only the install line.
- **`templates/install/.claude/settings.json` and PRISM's own `.claude/settings.json`.** Change the `SessionStart` entry's matcher from `compact` to `startup|resume|compact`, leaving the command unchanged.
- **`templates/install/.codex/hooks.json`.** Add a `SessionStart` entry with matcher `startup|resume` and command `node ".claude/hooks/hook.mjs" --tool=codex --event=SessionStart`. That command matches `PRISM_CODEX_HOOK_COMMAND_PATTERN`, so later updates own it. Codex gets no compact matcher, because PRISM has not verified that Codex does anything with the post-compact note.
- **`update.test.ts`.** Edit only the assertions that pin the old `compact` matcher or the old Codex event list, and give each edit a `behavior change:` reason in the commit body. Leave the file untouched if nothing there pins them.

Test cases, in `session-start-install.test.ts`:

- Spawn `hook.mjs --tool=claude --event=SessionStart` with a `startup` payload in a fixture repo that has marked shims and no hooks path. `core.hooksPath` becomes `.githooks` and stdout carries the install line.
- The same with `source: "compact"` leaves `core.hooksPath` unset and prints the post-compact note.
- A repo with `.husky` set stays unchanged and prints nothing. Session start does not nag; doctor reports it instead.
- The template files parse, and each one's `SessionStart` entry has the matcher above.

### T10: Skip the push gate's lint or format when a git hook already runs it

- files: scripts/ai-skills/hooks/git-gates.mjs, scripts/ai-skills/git-gates.test.ts
- proof: pnpm exec tsx --test scripts/ai-skills/git-gates.test.ts
- proof fails on main: yes
- depends on: T1, T5

Owner: Clove. In `git-gates.mjs`:

- Delete the local `POSIX_COMMAND_NOT_FOUND_STATUS` and `CMD_EXE_COMMAND_NOT_FOUND` and import `isCommandNotFound` from `./lib/command.mjs`. This is a straight swap with the same behavior.
- In `runPushGate`, compute `readGitHooksState(configRoot).installed` once.
  - When it is true and `config.gitHooks?.prePush?.command` is a non-empty string, skip the `lint` slot.
  - When it is true and `config.gitHooks?.preCommit?.command` is non-empty, skip the `format` slot.
  - Each skip writes one stderr line: `git-gates: skipped commands.<slot>; the installed <pre-push|pre-commit> git hook runs it`.
- Update the file's header JSDoc bullet for push verification with the same rule.

New test cases:

- With marked shims, `core.hooksPath=.githooks`, and `gitHooks.prePush.command` set, a `git push` arm call never runs `commands.lint`. Lint is a stub that appends to a counter file, and the file is absent afterward.
- The positive control is the same repo with `core.hooksPath` unset, where the counter file has one line.
- With only `prePush` configured, `commands.format` still runs.
- The existing not-found test still passes unchanged.

### T11: Report git-hook install state in prism doctor

- files: scripts/ai-skills/doctor.ts, scripts/ai-skills/doctor.test.ts
- proof: pnpm exec tsx --test scripts/ai-skills/doctor.test.ts
- proof fails on main: yes
- depends on: T5

Owner: Clove. Add `checkGitHooks(consumerRepoRoot)` to `doctor.ts` and call it in `runDoctor` right after `checkHookRegistration`. It reuses the existing `"hook-registration"` check id, so the exported `DoctorFinding` union does not change.

- No marked `.githooks/pre-commit` produces no finding. That covers a pre-adopt repo, a Cursor-only consumer, and a consumer's own `.githooks`.
- `readGitHooksState(...).installed` true gives info: `Git hooks are installed (core.hooksPath → .githooks).`
- Any scope foreign gives info: `core.hooksPath is '<value>' (<scope>), so PRISM's git hooks are not active. Compose them with your hooks by hand.`
- Otherwise it is a warning: `PRISM's git hooks are delivered but not installed in this clone. Run npx @huntermcgrew/prism hooks install, or node .claude/hooks/git-hooks/install.mjs.` A warning leaves `healthy` true, so doctor's exit code does not change.
- A finding's text says the gitHooks commands are unset when both are. That reuses the `describeCommandSlot` style.

Test cases: one per branch above, each in a fixture repo, plus the positive control that the warning disappears after `installGitHooks` runs.

### T12: Teach onboarding to propose gitHooks and the setup-step install

- files: .ai-skills/skills/prism-onboard/shared.md, .claude/skills/prism-onboard/SKILL.md, .claude/agents/prism-onboard.md, .codex/agents/prism-onboard.toml, .cursor/skills/prism-onboard/SKILL.md
- proof: pnpm run prism:build && pnpm exec tsx --test scripts/ai-skills/skill-loaded-lines.test.ts
- depends on: T2, T5

Owner: Clove. In `prism-onboard`'s `shared.md`, add one item to the "Survey, then ask" order after item 7:

> 8. Git hooks (`gitHooks`). Propose a `preCommit` formatter that reads stdin and prints stdout, with `{path}`, and a `prePush` linter with `{files}`, from the formatter and linter the repo already declares (for example Prettier and ESLint in `package.json`, or Ruff for Python). Use globs for the detected languages and a `fix` command, and leave a block out when no tool is declared. Merge the block into `.ai-skills/config.json` yourself after the write, as with `retroEvidence`. Then offer once to add `node .claude/hooks/git-hooks/install.mjs` to the repo's own setup step, such as a `package.json` `prepare` script, so a fresh clone installs the hooks. Edit nothing there without a yes.

Also extend the `retroEvidence` sentence's "mark `documentation-setup` complete only after both sets" to "after all three sets". Run `pnpm prism:build` and commit every projection it rewrites for this skill. The files list names the two known projections. Add any other projection the build rewrites for `prism-onboard` to this task's commit. The skill stays under the 120-line cap. It is about 70 lines today.

### T13: Write the ADR that brings back real git hooks

- files: .prism/spec/adrs/_toolkit/0081-git-hooks-ship-beside-the-agent-gates.md, .prism/spec/adrs/_toolkit/0076-commit-and-push-gates-are-harness-hooks.md, .prism/spec/adrs/_toolkit/README.md
- proof: pnpm run prism:crossref-lint
- depends on: none

Owner: Clove. List `.prism/spec/adrs/_toolkit/` first. Use the highest number plus one, which is 0081 as of 2026-11-18, and rename the file if a sibling child took 0081 first. The ADR has `Status: accepted` and three sections:

- **Context.** ADR-0076 rejected real git hooks for four reasons: they cannot prompt the model, `--no-verify` skips them, they need a per-clone `core.hooksPath` step, and they fire for every human. Hunter asked for git hooks on 2026-11-17. Format and lint failures show up as red CI, and a person committing from a terminal gets no check.
- **Decision.** PRISM ships a pre-commit and a pre-push hook as `sh` shims over zero-dependency `.mjs`, installed by pointing `core.hooksPath` at `.githooks`, never replacing a value PRISM does not recognize. Name the rejected alternatives:
  - husky, because it is a new dependency;
  - absolute hooks paths, because every worktree would run one checkout's hooks;
  - backing up and replacing a consumer's own `.githooks/` files, because the intent forbids touching a consumer's hook setup.
- **Consequences.**
  - Firing for humans is the point.
  - Until child 8's commit gate lands, an agent can still pass `--no-verify`.
  - The per-clone step is reduced, not removed: adopt and update, the agent session-start hook, an optional setup-script line, and doctor each cover clones, and a person who clones by hand and uses none of them has no git hooks. CI stays the gate that decides a merge.
  - Codex's `SessionStart` arm rests on a summarized read of its docs.
  - Cursor-only consumers get no git hooks.
  - ADR-0076's agent-side gates stand.
  - ADR-0074's rejection of git hooks as a read-before-write substitute is a different question and also stands.

In ADR-0076, add one line under its `Status:` line: `Partly superseded by ADR-0081: its rejection of real git hooks no longer holds; its agent-side gates stand.` Add the ADR-0081 row to the README index in the same format as the 0080 row. Mirror copies under `.claude/spec/`, `.codex/spec/`, and `.cursor/spec/` are regenerated in T14's build.

### T14: Record the git hooks in the architect docs and route them

- files: .prism/architect/_toolkit/git-hooks.md, .prism/architect/_toolkit/hook-runtime.md, .prism/architect/_toolkit/install-layout.md, .prism/architect/manifest.json, .prism/architect/_toolkit/manifest.base.json, templates/install/.prism/architect/_toolkit/git-hooks.md, templates/install/.prism/architect/_toolkit/hook-runtime.md, templates/install/.prism/architect/_toolkit/install-layout.md, templates/install/.prism/architect/_toolkit/manifest.base.json, .claude/architect/_toolkit/git-hooks.md, .claude/architect/_toolkit/hook-runtime.md, .claude/architect/_toolkit/install-layout.md, .codex/architect/_toolkit/git-hooks.md, .codex/architect/_toolkit/hook-runtime.md, .codex/architect/_toolkit/install-layout.md, .cursor/architect/_toolkit/git-hooks.md, .cursor/architect/_toolkit/hook-runtime.md, .cursor/architect/_toolkit/install-layout.md, .claude/spec/adrs/_toolkit/0081-git-hooks-ship-beside-the-agent-gates.md, .codex/spec/adrs/_toolkit/0081-git-hooks-ship-beside-the-agent-gates.md, .cursor/spec/adrs/_toolkit/0081-git-hooks-ship-beside-the-agent-gates.md, .claude/spec/adrs/_toolkit/0076-commit-and-push-gates-are-harness-hooks.md, .codex/spec/adrs/_toolkit/0076-commit-and-push-gates-are-harness-hooks.md, .cursor/spec/adrs/_toolkit/0076-commit-and-push-gates-are-harness-hooks.md, .claude/spec/adrs/_toolkit/README.md, .codex/spec/adrs/_toolkit/README.md, .cursor/spec/adrs/_toolkit/README.md, templates/install/.prism/spec/adrs/_toolkit/README.md, .claude/architect/_toolkit/manifest.base.json, .codex/architect/_toolkit/manifest.base.json, .cursor/architect/_toolkit/manifest.base.json
- proof: pnpm run prism:build && pnpm run prism:check
- depends on: T3, T4, T5, T6, T7, T8, T9, T10, T11, T13

Owner: Clove. Write every claim against the merged source of T3 to T11, per the writing-an-architect-doc guide.

- **New `_toolkit/git-hooks.md`.** Scope: the git hooks PRISM ships. Its neighbour for agent-side hooks is `hook-runtime.md`.
  - The shim-over-`.mjs` shape, and why each shim resolves its module from the toplevel with two candidates.
  - The pre-commit stdin/stdout format contract, and why staged content is compared rather than run through `--check` (a formatter's check mode can exit 0 on a parse error).
  - `GIT_INDEX_FILE` passthrough.
  - The pre-push base rules and the not-HEAD skip.
  - Skip-don't-block, and the exact skip conditions.
  - The installer's ours/foreign predicate across all four scopes, and why the value is relative.
  - Shim ownership by marker, with unmarked files left alone.
  - The `--all` mode for a consumer's CI, with a one-line example.
  - The dedupe rule with the push gate.
  - Codex `SessionStart` as documentation-summarized.
- **Routes.** In both `manifest.json` and `_toolkit/manifest.base.json`, add `".githooks/**": "_toolkit/git-hooks.md"` and `"scripts/ai-skills/hooks/git-hooks/**": ["_toolkit/hook-runtime.md", "_toolkit/git-hooks.md"]`.
- **`hook-runtime.md`.** Keep this to edits of existing paragraphs, with no new `##` heading:
  - Name the new runtime files.
  - Say the Claude template's `SessionStart` matcher is now `startup|resume|compact` and Codex registers `SessionStart` for the install arm.
  - In the Git gates section, add the dedupe sentence and a pointer to `git-hooks.md`.
  - Keep the sentence about ADR-0074's standing rejections.
- **`install-layout.md`.** Add `hooks` to the sentence that lists the consumer CLI's commands from `USAGE`.

Run `pnpm prism:build` and commit the mirror and seed copies it writes. The files list names the expected ones. Add any other mirror the build rewrites from these sources to this task's commit. `pnpm prism:check` must pass, covering verify-manifest, crossref-lint, ship-closure, and verify-pack.

### T15: Document the git hooks for consumers

- files: docs/parameterization.md, docs/what-prism-writes.md, docs/adopting-into-existing-repos.md
- proof: pnpm run prism:crossref-lint
- depends on: T7, T8, T11

Owner: Eli. Set `last_updated` to the edit date where a page carries frontmatter.

- **`parameterization.md`.** Add field-reference rows for `gitHooks.preCommit.command`, `.globs`, and `.fix`, and for `gitHooks.prePush.command` and `.globs`. Use the same wording as the T2 schema descriptions. Extend the `hooks.pushVerification` row with the dedupe sentence.
- **`what-prism-writes.md`.**
  - Under PRISM-owned paths, add rows for `.claude/hooks/git-hooks/*.mjs` and `.githooks/pre-commit` / `pre-push`, and say a `.githooks` file without PRISM's marker is never touched.
  - Add a short note that adopt and update set `core.hooksPath` only when it is unset or already points at a `.githooks` of this repo.
  - Add one sentence to the doctor paragraph about the new install-state report.
- **`adopting-into-existing-repos.md`.** Add a `## Existing git hooks (husky, lefthook)` section:
  - Git reads one hooks directory, so PRISM leaves a foreign `core.hooksPath` alone and doctor says so.
  - How to compose PRISM's hooks with yours: call `node .claude/hooks/git-hooks/pre-commit.mjs` from your own hook.
  - The setup-script line `node .claude/hooks/git-hooks/install.mjs`.
  - A CI snippet that runs `node .claude/hooks/git-hooks/pre-commit.mjs --all`.

## Challenge

## Decisions

- **The child plan uses the folder shape and the chain task shape before the chain tooling exists.**
  - **Root cause.** The spec gives every child a folder at `.prism/plans/prism-<n>/`. Child 4's task parser throws on an unknown task field or a non-task `###` under `## Tasks`.
  - **Alternatives considered.** A flat `prism-516.md` with persona headings, the shape `plan-mode.md` prescribes. Rejected, because child 4 would then be unable to read the plan it is meant to govern.
  - **Chosen approach.** Folder plan, `### T<n>:` tasks with only the parser's fields, and the owning persona named in each task's first prose line in place of `### Clove` / `### Eli` headings.
  - **Implementation guidance.** No `intent.md` is written here, because only a person can approve one. The acceptance criteria live below in this file, mirroring the issue's checklist word for word, so no tracker sync was needed.
  - → no promotion needed (a bridge until child 4's tooling reads plan folders; the epic spec owns the folder shape)
- **No challenge rounds were run, and `status` stays `draft`.** The challenge round grammar and `auto-approve.mjs` land in children 4 and 5. Until then this plan goes through today's review flow, and `## Challenge` stays empty, not filled with invented rounds.
  - → no promotion needed (temporary until children 4 and 5 land the round grammar and approval; at close `status` moved from `draft` straight to `closed`, since this plan was never approved through the chain)
- **Commits use `PRISM-516: <summary> (T<n>)`, one per task.** The rule that changes subjects to `T3:` on a folder-plan branch lands in child 5, so `git-conventions.md` as it stands governs this branch. Putting the task ID in the subject keeps every task traceable.
  - → no promotion needed (`git-conventions.md` as it stands governed this branch; child 5 owns the folder-plan subject form)
- **Git hooks ride the agent hook runtime's delivery.**
  - **Root cause.** The `.mjs` modules have to live somewhere zero-dependency and already delivered.
  - **Alternatives considered.** A host-independent delivery into `.githooks/lib/`. Rejected. It would need a second copy path, a second ownership rule, and a second prune list, all to serve Cursor-only consumers, and the intent already says those consumers get no hooks.
  - **Chosen approach.** The modules join `HOOK_RUNTIME_FILES` under `.claude/hooks/git-hooks/`. The shims are delivered only when `claude` or `codex` is a host, and a Cursor-only consumer gets no git hooks.
  - **Implementation guidance.** The shim's second candidate path is what lets the same file work in PRISM's own tree, where agent hooks run from `scripts/ai-skills/hooks/`.
  - → promoted to `.prism/architect/_toolkit/git-hooks.md` § Shape: a shim over a module
- **The pre-commit command contract is stdin to stdout with a `{path}` hint, not a `--check` flag.** This is what lets the hook judge the staged copy with any formatter without writing anything. It is also thrive's finding: Prettier's `--check` with stdin exits 0 on a parse error. Considered: materializing staged copies into a temp directory. Rejected, because formatter configs and ignore files resolve relative to the file's real path.
  - → promoted to `.prism/architect/_toolkit/git-hooks.md` § Pre-commit
- **An unmarked `.githooks/<name>` in a consumer is left alone, not backed up and replaced.** Runtime files under `.claude/hooks/` get `.bak` and replace, but `.githooks/` is the one directory where a consumer's own git hooks are likely to live, and the intent forbids touching them.
  - → promoted to `.prism/architect/_toolkit/git-hooks.md` § Shape: a shim over a module
- **The installer treats a foreign value at any of the four scopes as "leave alone", global and system included.** Thrive checked local and worktree only. A local `.githooks` would silently shadow a team-wide global hooks path, which is the same harm as overwriting a local one. Each scoped read passes `--includes`, because a team-wide path is often set in a file that a global config pulls in through `include.path`, and a scoped read ignores includes by default.
  - → promoted to `.prism/architect/_toolkit/git-hooks.md` § The installer
- **`left-alone` exits 0 everywhere.** It is a report, not a failure. A non-zero exit would break `prism update` and a consumer's `prepare` script for a repo that is set up correctly in its own way.
  - → promoted to `.prism/architect/_toolkit/git-hooks.md` § The installer
- **Session start installs only when every scope is unset, and prints nothing otherwise.** A foreign value reported at every session start is noise. Doctor carries that report.
  - → promoted to `.prism/architect/_toolkit/git-hooks.md` § The installer
- **Doctor reuses the `hook-registration` check id.** Adding a `git-hooks` id would widen the exported `DoctorFinding` union, a shared type, for a label nobody filters on.
  - → no promotion needed (a tactic that keeps the shared `DoctorFinding` union unchanged, visible in `doctor.ts`)
- **PRISM's own config gets no `gitHooks` block.** PRISM has no formatter, and its linter (`prism:crossref-lint`) does not take a file list. Adding Prettier or ESLint would be a new dependency, outside this child's limits. PRISM's hooks install and print their skip notice. That proves delivery and install on PRISM itself, but it means PRISM's own commits are not format-checked until a tool is chosen.
  - → no promotion needed (the absence is visible in PRISM's own `.ai-skills/config.json`; choosing a formatter for PRISM is tracked in #527)
- **`prism eject` does not remove the shims or unset `core.hooksPath`.** Eject today leaves the whole hook runtime in place, so this matches it. A left shim skips with a notice once its runtime is gone. Removing hook delivery on eject is a follow-up covering the runtime and the shims together, tracked in #525.
  - → no promotion needed (the consumer docs already say what eject leaves, in `docs/adopt-prism.md` and `docs/what-prism-writes.md` since dcd7caf6; removing hook delivery on eject is tracked in #525)
- **This child ships as one PR, not a stack.** It touches more than ten files, but the modules have no value until the installer and delivery reach a repo, and the epic is already split at child grain.
  - → no promotion needed (ticket tactic)
- **OPEN — TBD, needs a live Codex run (Hunter).** Whether Codex fires `SessionStart` with `source: "startup"` for the install arm. The event and its `source` values come from a summarized read of the Codex hooks page on 2026-11-18, not verbatim text. **Default path (used until resolved):** register it on Codex as T9 says, record it as documentation-summarized in `git-hooks.md`, and rely on adopt and update, the setup-script line, and doctor to cover Codex clones meanwhile. Child 8's per-host registration test is the natural place to confirm it.
  - → no promotion needed (open question — exit condition: a live Codex session fires `SessionStart` with `source: "startup"`, which child 8's per-host registration test can show; `git-hooks.md` § The installer already says the Codex registration is unverified)
- **The config validator is not tightened for `gitHooks`.** `validateOnDiskConfig` does not enforce `additionalProperties: false` or `minItems`, so a typo under `gitHooks` passes validation and the hook skips with its notice. `git-hooks-config.test.ts` pins the schema keywords instead. Changing the validator would change a shared function, which is outside this child's limits. Follow-up: make the validator enforce those two keywords.
  - → no promotion needed (a limit of this child; tightening the validator for `gitHooks` is tracked in #526)
- **The pre-push hook pipes the lint command's stderr instead of inheriting it.** `isCommandNotFound` has to read `cmd.exe`'s "is not recognized" text, which exists only on stderr. The hook re-emits what it read, so the user still sees it.
  - → no promotion needed (implementation tactic; the observable behavior, the command's output reaching the terminal, is in `git-hooks.md` § Pre-push)
- **`hook-gate.test.ts` was edited though the plan does not list it.** It pinned the Claude `SessionStart` matcher at `compact`, and T9 changed that to `startup|resume|compact`. The commit body for T9 says so.
  - → no promotion needed (scope record for this branch)
- **ADR-0081 is classified `excluded` in `seed-curation.json`, and the consumer stub manifest routes `.githooks/**` to `git-hooks.md`.** Neither file is in T14's list. The build would otherwise ship the ADR to consumers, and `verify-manifest-coverage` rejects a shipped doc that no stub route names. The route is `.githooks/**` only. `.claude/hooks/` stays unrouted in a consumer, because `hook-runtime.md` treats those files as the consumer's own territory. `.githooks/` is routed even though a consumer's own hooks can live there, because the doc it loads is what an agent editing that directory needs. It says which files `prism update` overwrites (marked ones), which it never touches (unmarked ones), and that `core.hooksPath` decides whether any of them run. The cost is one forced read of `git-hooks.md` per session that edits a consumer hook. Routing `.claude/hooks/git-hooks/**` instead was considered and rejected: it satisfies `verify-manifest-coverage` but routes a path no consumer edits, so the doc would never load where it helps.
  - → no promotion needed (the exclusion follows `install-layout.md` § Test 2, under which no numbered ADR ships; the stub route lives in `manifest.stub.json`, and child 8, which owns consumer architect routes, is where its rationale gets revisited)
- **`git-hooks.md` carries no numbered ADR links and no maintainer-only commands.** It ships to consumers verbatim as a non-curated mirror, and the install ADR gate rejects an ADR citation there.
  - → no promotion needed (the general rule already lives in `install-layout.md` § Test 2, and `prism:crossref-lint` enforces it)
- **Hooks in `.git/hooks` are a foreign setup the installer leaves alone.** This reverses the earlier call to only document the bypass and defer detection to a follow-up.
  - **Root cause.** With `core.hooksPath` unset at every scope, git runs `.git/hooks`. Setting the value made git stop reading that directory, so a hook manager that installs there was bypassed with no report.
  - **Alternatives considered.** Documenting it and checking `ls .git/hooks` by hand, the earlier call. Rejected, because the bypass is silent and the doc is not read at install time. Treating only known hook names as foreign. Rejected, because git runs any file under a hook name and a name list goes stale.
  - **Chosen approach.** While every scope is unset, any file in `git rev-parse --git-path hooks` that is not a `.sample` makes the installer `left-alone`, with the file names in its message. Once any scope holds a value of ours, git already skips that directory, so the check does not run.
  - **Implementation guidance.** `describeForeignHooks` in `install.mjs` is the one search. The installer, doctor, and the session-start arm all go through it, so doctor no longer keeps its own copy of the scope walk.
  - → promoted to `.prism/architect/_toolkit/git-hooks.md` § The installer
- **A git hook counts as active only when git will run PRISM's own shim for it.** That means the effective `core.hooksPath` is ours, and the shim at that path carries the marker and, off Windows, the executable bit. Git silently skips a hook without the bit, and judging both push-gate slots on the `pre-commit` shim let a consumer's own `pre-push` turn off the gate's lint. `readGitHooksState` reports `active` per hook, and the push gate checks the slot's own hook.
  - → promoted to `.prism/architect/_toolkit/git-hooks.md` § Relationship to the agent gates
- **Delivery sets the shims' mode on every pass, the no-op included.** A byte-identical shim can still have lost its mode, because a `core.fileMode=false` clone adds a new path as `100644` (an ordinary commit from one keeps an existing `100755`). This matches how `HOOK_RUNTIME_ENTRY_POINTS` are chmodded on every update. The installer repairs the mode too, off Windows, before it reports `set` or `already`: a marked shim without the bit is chmodded, and when that fails the result is `left-alone` naming the shim, because git would skip it.
  - → promoted to `.prism/architect/_toolkit/git-hooks.md` § Shape: a shim over a module
- **Dropping both hosts unsets a local `core.hooksPath` of `.githooks` whenever `.githooks/` is gone.** Left set, it points git at a missing directory, so git runs no hooks and still skips `.git/hooks`. It stays set while a consumer's own file remains in `.githooks/`, because that file may rely on it. The check runs on every pass, not only the one that emptied the directory, because the value is per-clone config and a teammate's clone pulls the deletion without ever running that pass.
  - **Root cause of the sibling-worktree limit.** The local value is shared by every worktree of the clone, while `.githooks/` is checked per worktree. Unsetting on every pass in a worktree that lacks the directory disabled a sibling worktree whose branch still delivers the shims, until that sibling's next session start set the value again.
  - **Alternatives considered.** Naming the multi-worktree case as a known limit in `git-hooks.md` and leaving the code. Rejected, because the check is a few lines and the limit would be a flip-flop between two worktrees' updates, not a stable state.
  - **Chosen approach.** `removeGitHooksPath` skips the unset while `git worktree list --porcelain` shows another worktree with a PRISM-marked shim in its `.githooks/`. The current worktree is excluded from the check, because a dry run still has its shims on disk. A sibling's own unmarked hook does not count.
  - **Implementation guidance.** The cost is that the Cursor-only worktree keeps a value pointing at a missing directory, so it runs no git hooks, until the last worktree with shims drops them and one more update runs. `git-hooks.md` and `docs/what-prism-writes.md` say so.
  - → promoted to `.prism/architect/_toolkit/git-hooks.md` § Shape: a shim over a module
- **The setup-script line PRISM offers imports `install.mjs` and calls `runInstallCli`.** A plain `node .claude/hooks/git-hooks/install.mjs` exits 1 when the file is gone, which fails every `pnpm install` through `prepare` after `hosts` drops to Cursor only. Considered: `test -f ... && node ... || true`. Rejected, because `prepare` runs under `cmd.exe` on Windows, where `test` does not exist.
  - → promoted to `.prism/architect/_toolkit/git-hooks.md` § The installer (the guarded line and why the plain form fails; the rejected `test -f` form stays here)
- **The review's docs findings were absorbed from Eli's lane into this child.** They are short corrections to pages this PR already edits, and handing them off would cost a separate docs round for a few sentences. Two files outside T15's list were touched for them: `README.md` and `docs/adopt-prism.md`, the two command references that did not list `prism hooks install`. The curated seed `templates/install/.prism/architect/_toolkit/hook-runtime.md` was also corrected, since its "other session starts print nothing" went false once startup runs the installer.
  - → no promotion needed (scope record for this branch)
- **`installGitHooks` with `dryRun` prefixes its message with `would`.** `prism update --dry-run` prints what it would do and writes nothing.
  - → no promotion needed (message wording, visible in `install.mjs` and pinned by its tests)
- **The close markers are the `>` lines under the opening paragraph, and frontmatter `status: closed` stays as a placeholder.** `branch-plan.md` § Before Closing step 2 and Zoe's plan-archive lane read `> Closed:` and `> Retro:`, not frontmatter, so those two lines are what make this plan closed today. The frontmatter `status: closed` stays because the epic spec defines no closed value; child 4 or child 6 defines folder-plan close and settles it.
  - **Alternatives considered:** dropping the frontmatter `status`. Rejected, because the folder-plan close that child 4 or 6 defines may read it, and removing it now would be an edit they reverse. The trailing `Retro:` line stays for the same reason.
  - → no promotion needed (bridge until the folder-plan close lands)

## History

- 2026-11-18 [huntermcgrew/prism-516-git-hooks]: Plan created: git hooks, installer, delivery, session-start install, doctor check, push-gate dedupe, ADR, and docs, as 15 tasks.
- 2026-11-18 [huntermcgrew/prism-516-git-hooks-impl]: Implemented T1 to T15: hook modules, shims, installer, delivery, `prism hooks install`, session-start arm, push-gate dedupe, doctor check, onboarding step, ADR-0081, architect docs, and consumer docs; `pnpm prism:check` passes. Deviations are recorded under Decisions.
- 2026-11-18 [huntermcgrew/prism-516-git-hooks]: Fixed all 12 self-review findings and the orchestrator's `.git/hooks` bypass, in four commits (code, quoteForShell JSDoc, architect docs, consumer docs) separate from the review record; see the Decisions on `.git/hooks`, active hooks, and the guarded setup line.
- 2026-11-18 [huntermcgrew/prism-516-git-hooks]: Fixed the three re-review findings in two commits: the `core.hooksPath` unset now runs when `.githooks/` is already gone, the installer follows `include.path` on scoped reads, and its stale header is corrected. Tests for the first two failed on the previous head.
- 2026-11-18 [huntermcgrew/prism-516-git-hooks]: Fixed Eric's six Minor findings on PR #523 in three commits (installer and worktree code, `unknown` config types, docs and mirrors); see Decisions on the shim mode and on dropping both hosts. The installer now repairs a non-executable shim, and the `core.hooksPath` unset waits for sibling worktrees.
- 2026-11-18 [huntermcgrew/prism-516-git-hooks]: Fixed Eric's Major on PR #523 in 07f234b5: `otherWorktreeHasShim` takes the current worktree from `git rev-parse --show-toplevel`, since Windows spells Node's and git's paths differently and CI went red on 874d5d99. The same commit corrects the dry-run wording and the partial-chmod message. The new test failed on the previous head, and Windows was not run locally.
- 2026-11-18 [huntermcgrew/prism-516-git-hooks]: Closed the plan: a verdict on all 26 Decisions, 11 of them already promoted to `git-hooks.md`, the ticket-grain retro run inline, and AC-1 to AC-6 ticked on CI run 44275791883. AC-7's macOS check stays open for a person.
- 2026-11-18 [huntermcgrew/prism-516-git-hooks]: Fixed the plan-close findings: added the `> Closed:` and `> Retro:` markers under the opening paragraph, and filed #525, #526, and #527 for the three follow-ups whose verdicts had no home. Each verdict now cites its issue.

## Sessions

- 2026-11-18 [huntermcgrew/prism-516-git-hooks] open: Intent: plan child 2 (git hooks) to the detail bar from the epic spec and thrive #2847. Bounds: plan file only, no code, no PR, and nothing outside the spec's Affected systems. Approach: port thrive's behavior, generalize its hard-coded tools into the gitHooks config, and reuse the hook runtime's delivery. · close: scope held
- 2026-11-18 [huntermcgrew/prism-516-git-hooks-impl] open: Intent: implement T1 to T15 and open a draft PR. Bounds: only the plan's files, no new dependency, no shared type or public API change. Approach: one commit per task, tests first for each module, then docs. · close: drifted — touched `hook-gate.test.ts`, `seed-curation.json`, and the consumer stub manifest, each recorded under Decisions
- 2026-11-18 [huntermcgrew/prism-516-git-hooks] open: Intent: full self-review of PR #523 against the plan and the rules. Bounds: findings into the plan only, no source fixes, no GitHub posts, no merge. Approach: run `prism:check`, read every new module and doc, and source-verify the architect docs. · close: scope held
- 2026-11-18 [huntermcgrew/prism-516-git-hooks] open: Intent: fix the 3 Major and 9 Minor self-review findings plus the orchestrator's `.git/hooks` bypass. Bounds: this PR's files, with any file outside them recorded under Decisions; no new dependency, no merge, PR stays draft. Approach: tests first for each code finding, then the architect and consumer docs, then the plan and lesson. · close: scope held, with `README.md`, `docs/adopt-prism.md`, and the curated hook-runtime seed recorded under Decisions
- 2026-11-18 [huntermcgrew/prism-516-git-hooks] open: Intent: self-review the fix round `ce7ef2bb..5844d51e` on PR #523. Bounds: findings into `## Review` and `## PR Readiness` only, landed as a plan-only commit; no source fixes, no GitHub posts, no merge. Approach: run `prism:check`, read the code and doc diffs, and source-verify each fix and each changed architect-doc claim. · close: scope held
- 2026-11-18 [huntermcgrew/prism-516-git-hooks] open: Intent: fix the three open findings in the re-review of the fix round. Bounds: this PR's files only, a failing test first for each behavior fix, fix commits separate from the plan record; no new dependency, no merge, PR stays draft. Approach: reproduce each finding as a failing test on the previous head, fix it, then correct the architect and consumer docs and rebuild the mirrors. · close: scope held
- 2026-11-18 [huntermcgrew/prism-516-git-hooks] open: Intent: self-review the re-review fixes `5594e724..acdc112f` on PR #523. Bounds: findings into `## Review` and `## PR Readiness` only, landed as a plan-only commit; no source fixes, no GitHub posts, no merge. Approach: run `prism:check`, run the new tests against the previous head's source, and source-verify each fix and changed doc claim. · close: scope held
- 2026-11-18 [huntermcgrew/prism-516-git-hooks] open: Intent: fix Eric's six Minor findings on PR #523. Bounds: this PR's files only, a failing test first for each behavior fix, fix commits separate from the plan record; no new dependency, no merge, PR stays draft, review threads left for Eric to resolve. Approach: repair the shim mode in the installer, skip the unset for sibling worktrees, narrow the config types, then correct the docs and rebuild the mirrors. · close: scope held, with the `hooks install` and session-start test fixtures now writing executable shims
- 2026-11-18 [huntermcgrew/prism-516-git-hooks] open: Intent: fix Eric's Major on the worktree self-check, plus the dry-run grammar and partial-chmod message. Bounds: `install.mjs`, its test, the architect doc sentence and mirrors, the plan, and one lesson; no new dependency, no merge, PR stays draft, no review threads resolved. Approach: a failing test first, then take self from git, then the plan record in its own commit. · close: scope held, with the `git-hooks.md` sentence on unfixable shims corrected because the message behavior changed
- 2026-11-18 [huntermcgrew/prism-516-git-hooks] open: Intent: close the plan on the final PR branch. Bounds: this plan file only, as a plan-only commit; any promotion outside `.prism/plans/` or `.prism/architect/` is reported, not made; no merge, PR stays draft. Approach: check the AC, CI, and review against the diff, then a verdict per Decision, the closed markers, and the Retro line. · close: scope held; every promotion was already in `git-hooks.md`, so no architect doc changed

## Verification

Pre-flight against the diff, not the graded verdict. `pnpm prism:check` passes on the final tree, and the suite includes the tests each criterion's Evidence names.

- AC-1 to AC-6: the named tests exist and pass, and each carries the positive control its Evidence asks for.
- AC-7: the Linux and Windows legs pass in CI run 44275791883 on 632035e5. The macOS human check is still pending.

## Review

Self-review 2026-11-18 [huntermcgrew/prism-516-git-hooks], full range `8e1dabc7..ce7ef2bb`. `pnpm prism:check` passes locally (1111 tests), and both `prism-check` CI legs are green.

### A shim without its executable bit is never repaired, and the hooks still read as installed

- **Severity:** `major`
- **Status:** `fixed`
- **File:** `scripts/ai-skills/update.ts:1334`, `scripts/ai-skills/hooks/git-hooks/install.mjs:155`
- **Problem:** This is major because a POSIX clone whose `.githooks/*` lost mode 755 gets no checks at all, while every report says the hooks are active. That clone can come from a Windows teammate's commit, where `core.fileMode=false` adds new files as `100644`, or from any tool that drops modes. `deliverGitHookShims` calls `chmod` only on a write, so the byte-identical no-op path never restores the bit. Git then skips the hook and prints only an `advice.ignoredHook` hint (reproduced locally). `readGitHooksState().installed` checks the marker and not the mode, so doctor reports info, and the push gate skips `commands.lint` and `commands.format` because it believes the git hook runs them.
- **Suggested fix:** On POSIX, `chmod 0o755` on the no-op path too, the way `HOOK_RUNTIME_ENTRY_POINTS` are chmodded on every update. Make `installed` require the executable bit off Windows. Add a delivery test that starts from a byte-identical `0644` shim.
- **Fixed in:** 780fa0dd delivery chmods every PRISM shim on the no-op pass, `isRunnableShim` requires the bit off Windows, `readGitHooksState().active` uses it, and doctor warns on a non-executable shim; delivery and installer tests start from a `0644` shim. dbeae470 documents it.

### hook-runtime.md still says the SessionStart compaction arm is registered with matcher `compact`

- **Severity:** `major`
- **Status:** `fixed`
- **File:** `.prism/architect/_toolkit/hook-runtime.md:58` (plus the seed and `.claude/`, `.codex/`, `.cursor/` mirrors)
- **Problem:** This is major because the claim diverges from source, the minimum severity under `architect-doc-verification.md`. Both settings files now register `startup|resume|compact`, and the bullet says `compact` and then talks about the sources "the registration also matches", which contradicts itself. Line 9 of the same doc already gives the correct matcher.
- **Suggested fix:** Change the bullet to say the Claude `SessionStart` registration matches `startup|resume|compact`, and that this arm prints only on `compact`.
- **Fixed in:** dbeae470 the bullet now says the Claude registration matches `startup|resume|compact` and the arm prints only on `compact`, rebuilt into every mirror; the curated seed's "other session starts print nothing" was corrected in the same commit.

### git-hooks.md says doctor always notes unset gitHooks commands

- **Severity:** `major`
- **Status:** `fixed`
- **File:** `.prism/architect/_toolkit/git-hooks.md:61`
- **Problem:** This is major because it is a diverged claim, the floor `architect-doc-verification.md` sets, though the impact is small. "It also says when both `gitHooks` commands are unset" holds for the installed and not-installed findings. `checkGitHooks` leaves the note off the foreign-`core.hooksPath` finding (`doctor.ts:821-831`) and emits nothing when no shim exists.
- **Suggested fix:** Scope the sentence to the installed and not-installed findings, or append `unsetNote` to the foreign finding too.
- **Fixed in:** dbeae470 the sentence is scoped to the installed and not-installed findings.

### The installed predicate and the lint dedupe key off the pre-commit shim only

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `scripts/ai-skills/hooks/git-hooks/install.mjs:158`, `scripts/ai-skills/hooks/git-gates.mjs:478`
- **Problem:** This is minor because it takes an uncommon layout: a consumer's own unmarked `.githooks/pre-push` beside PRISM's marked `pre-commit`. Delivery then leaves their `pre-push` in place, and `installGitHooks` sets `core.hooksPath`, which activates a hook git was not reading before. `installed` turns true, so the push gate skips `commands.lint` and announces that "the installed pre-push git hook runs it", when PRISM's lint never runs.
- **Suggested fix:** Judge each slot on its own shim. Skip `lint` only when `.githooks/pre-push` is marked, and `format` only when `pre-commit` is.
- **Fixed in:** 780fa0dd `readGitHooksState` reports `active` per hook, and the push gate skips `lint` only when PRISM's `pre-push` runs and `format` only when its `pre-commit` runs; `git-gates.test.ts` covers an unmarked consumer `pre-push`.

### The consumer stub routes `.githooks/**`, against the stated rationale for leaving `.claude/hooks/` unrouted

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `templates/install/.prism/architect/manifest.stub.json:27`
- **Problem:** This is minor because the cost is one forced doc read. The plan's own Decision calls `.githooks/` "the one directory where a consumer's own git hooks are likely to live", and `hook-runtime.md` leaves `.claude/hooks/` unrouted for exactly that reason. With this route, the write gate holds an agent's edit to the consumer's own hook until it reads PRISM's `git-hooks.md`.
- **Suggested fix:** Either record in the Decision why routing a consumer-owned directory is acceptable here, or satisfy `verify-manifest-coverage` another way (for example a route on `.claude/hooks/git-hooks/**`).
- **Fixed in:** the plan-record commit; the ADR-0081 Decision now says why routing `.githooks/**` is worth one forced read and why a `.claude/hooks/git-hooks/**` route was rejected. The route itself is unchanged.

### The setup-script line is said to be unable to break `prepare`, but it fails when `install.mjs` is absent

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `docs/adopting-into-existing-repos.md:114`, `.ai-skills/skills/prism-onboard/shared.md:41`
- **Problem:** This is minor because only an uncommon host change triggers it. "It exits 0 on every outcome ... so it cannot break that step" holds only while the file exists. After `hosts` drops to Cursor-only, update removes `.claude/hooks/git-hooks/install.mjs`, so `node` exits 1 and every `pnpm install` fails in `prepare`. Onboarding item 8 offers the line without checking `hosts`.
- **Suggested fix:** Ship a guarded form (for example `test -f .claude/hooks/git-hooks/install.mjs && node .claude/hooks/git-hooks/install.mjs || true`, or a `node -e` existence check). Have onboarding offer it only when `claude` or `codex` is a host.
- **Fixed in:** 780fa0dd exports `runInstallCli`, and two tests run the guarded line with and without the file. dcd7caf6 ships that line in the docs and onboarding, offered only when `claude` or `codex` is a host. dbeae470 documents it.

### Dropping both hosts removes the shims but leaves `core.hooksPath` at `.githooks`

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `scripts/ai-skills/update.ts:1361`
- **Problem:** This is minor because Cursor-only consumers are rare and the result is quiet, not broken. `removeDeliveredGitHookShims` deletes the shims and the empty `.githooks/`, but the local `core.hooksPath` still points there. Git then runs no hooks, and it keeps bypassing `.git/hooks`. Doctor stays silent because no shim remains.
- **Suggested fix:** Unset the local value when it is exactly `.githooks` and the directory was removed, or record it beside the eject Decision as accepted.
- **Fixed in:** 780fa0dd removal unsets a local `.githooks` value once `.githooks/` is gone, and keeps it while a consumer's own file remains; both cases are tested.

### `prism update --dry-run` on a fresh consumer reports "no PRISM shims" instead of what it would set

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `scripts/ai-skills/update.ts:564`
- **Problem:** This is minor because only the preview text is wrong, not any write. On a dry run the shims are not written, so `installGitHooks(..., { dryRun })` returns `no-shims`. That contradicts the Decision that `--dry-run` "prints what it would do".
- **Suggested fix:** On a dry run, judge shim presence against the PRISM source's `.githooks/`, or let the dry-run path assume delivered shims.
- **Fixed in:** 780fa0dd `installGitHooks` takes `shimsDelivered`, which `runUpdate` sets from the dry run's own `.githooks/pre-commit` outcome; the delivery test asserts the `would` message.

### doctor re-implements the foreign-scope search the installer owns

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `scripts/ai-skills/doctor.ts:821`
- **Problem:** This is minor because the two copies agree today. The scope order and the foreign test are written a second time beside `install.mjs:185`, and the module's stated purpose is that the predicate exists once, so a change to one copy can silently miss the other.
- **Suggested fix:** Export the search from `install.mjs`, or derive the finding from `installGitHooks(root, { dryRun: true }).action`.
- **Fixed in:** 780fa0dd `describeForeignHooks` is exported from `install.mjs`, and the installer and doctor both call it.

### Docs do not cover `prism hooks install`, and the eject section omits what stays behind

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `README.md:168`, `docs/what-prism-writes.md:89`
- **Problem:** This is minor because the docs are incomplete, not wrong. The README command table and `docs/adopt-prism.md` (the "full command reference") never list the new `hooks install` command. `what-prism-writes.md` calls itself the complete inventory, but its eject section does not say that eject leaves the shims, the `.mjs` runtime, and `core.hooksPath`, so the hooks keep firing after eject.
- **Suggested fix:** Eli adds the command row and one sentence on what eject leaves.
- **Fixed in:** dcd7caf6 adds the command to the README table and `docs/adopt-prism.md`, and says in both eject sections that the runtime, the shims, and `core.hooksPath` stay.

### The pre-push lint reads uncommitted edits for the HEAD ref, which the docs do not mention

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `.prism/architect/_toolkit/git-hooks.md:41`
- **Problem:** This is minor because it is a documentation gap in a known design. The non-HEAD skip is justified by "would judge files the push does not carry", but a dirty working tree does the same for the HEAD ref. An uncommitted lint error blocks a clean push, and an uncommitted fix passes a push that carries the error.
- **Suggested fix:** Add one sentence naming the dirty-tree case as a known limit.
- **Fixed in:** dbeae470 `git-hooks.md` names the dirty-tree case as a known limit.

### `quoteForShell` calls double quotes always safe under `cmd.exe`

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `scripts/ai-skills/hooks/lib/command.mjs:26`
- **Problem:** This is minor because it needs a Windows filename containing `%NAME%` for a variable that is set. `cmd.exe` expands `%VAR%` inside double quotes, so "always safe" overclaims.
- **Suggested fix:** Soften the JSDoc to name the `%` exception, or reject `%` the way `"` is rejected.
- **Fixed in:** 8665d6a2 the JSDoc names the `%NAME%` exception.

### The installer silently bypasses hooks already in `.git/hooks`

- **Severity:** `major`
- **Status:** `fixed`
- **File:** `scripts/ai-skills/hooks/git-hooks/install.mjs:216`
- **Problem:** Raised by the orchestrator. With `core.hooksPath` unset at every scope, the installer set it without looking at `.git/hooks`, so git silently stopped running any hook installed there. Doctor agreed with the installer and reported nothing.
- **Suggested fix:** Treat any non-`.sample` file in the repo's default hooks directory as foreign: leave `core.hooksPath` alone and report it, as a foreign `core.hooksPath` is reported. Doctor and the docs should match, with a test that fails on the branch before the fix.
- **Fixed in:** 780fa0dd `describeForeignHooks` covers the default hooks directory, used by the installer, doctor, and the session-start arm; tests cover a hook in `.git/hooks`, `.sample` files only, an already-ours value, and a linked worktree. Run against the pre-fix `install.mjs`, the same scenario returned `set` and wrote `.githooks`. dbeae470 and dcd7caf6 update the architect and consumer docs.

### Re-review of the fix round

Self-review 2026-11-18 [huntermcgrew/prism-516-git-hooks], range `ce7ef2bb..5844d51e` (the fix commits 8665d6a2, 780fa0dd, dbeae470, dcd7caf6, 5844d51e). `pnpm prism:check` passes locally at 5844d51e (1129 tests, 0 failed, 1 skipped), and both `prism-check` CI legs are green on the same head. `spec-scope-lint` skipped locally because the detached checkout resolves no branch plan. Every fix above was checked against its source and holds, except the `core.hooksPath` unset, which covers only the clone whose update removed `.githooks/`.

### The `core.hooksPath` unset is skipped when `.githooks/` is already gone, while the docs say it happens whenever the directory is gone

- **Severity:** `major`
- **Status:** `fixed`
- **File:** `scripts/ai-skills/update.ts:1395`, `.prism/architect/_toolkit/git-hooks.md:17`, `docs/what-prism-writes.md:40`
- **Problem:** This is major because the architect doc's claim diverges from source, the floor `architect-doc-verification.md` sets. The code impact alone is minor, since it needs the rare move to Cursor-only hosts. `removeDeliveredGitHookShims` returns before `removeGitHooksPath` when `.githooks/` does not exist, so the unset runs only in the pass that empties the directory. `core.hooksPath` is per-clone local config, so a teammate who pulls the commit that deleted `.githooks/` keeps `core.hooksPath=.githooks`. That holds even when they run `prism update` themselves. Their git runs no hooks and still skips `.git/hooks`, and doctor stays silent because no shim remains. That is the exact harm the Decision and the fix were meant to close. `git-hooks.md` says "Once the directory is gone, a local `core.hooksPath` of `.githooks` is unset too", and `what-prism-writes.md` makes the same promise to consumers.
- **Suggested fix:** Run the `removeGitHooksPath` check whenever `.githooks/` is absent, not only when this pass emptied it. Add a delivery test that starts with no `.githooks/` directory and a local `core.hooksPath` of `.githooks`, `hosts: ["cursor"]`, and asserts the value is unset.
- **Fixed in:** 0878d4e9 `removeDeliveredGitHookShims` unsets a local `.githooks` whenever the directory is gone, whether this pass emptied it or a pulled commit already had. The new delivery test starts with no `.githooks/`, a local `core.hooksPath=.githooks`, and `hosts: ["cursor"]`, and failed on the previous head (`'.githooks' !== ''`). A second test keeps a foreign `.husky` in the same setup. `git-hooks.md` and `what-prism-writes.md` now say the unset runs per clone on its own `prism update`.

### `install.mjs`'s file header still names the unguarded setup-script line and omits `.git/hooks`

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `scripts/ai-skills/hooks/git-hooks/install.mjs:11`
- **Problem:** This is minor because it is comment drift, not behavior. The header lists "a consumer's own setup script (`node .claude/hooks/git-hooks/install.mjs`)" as a caller. That is the plain form the fix round replaced with the guarded `node -e "import(...)..."` line, because the plain form fails `prepare` once the file is gone. The next paragraph names only a foreign `core.hooksPath` as the reason to change nothing, and leaves out hooks in `.git/hooks`.
- **Suggested fix:** Say "a consumer's own setup script (the guarded `runInstallCli` import)" and add one clause naming hooks in `.git/hooks`, or point at `describeForeignHooks`.
- **Fixed in:** cad5bb8f the header names the guarded `runInstallCli` import and says hooks in `.git/hooks` (`describeForeignHooks`) are a reason to change nothing.

### Scope reads skip `include.path`, so an included team-wide `core.hooksPath` reads as unset

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `scripts/ai-skills/hooks/git-hooks/install.mjs:117`
- **Problem:** This is minor because it needs a hooks path set through `include.path` or `includeIf`, and the line itself predates this range. The new `describeForeignHooks` builds on it, though. `readScope` runs `git config --<scope> --get` without `--includes`. Git's documented default leaves includes off for a scoped read, so a `core.hooksPath` that a global config pulls in through an include never shows in `scopes`, although `effective` sees it. Every scope then reads as unset. The installer and the session-start arm would write a local `.githooks`, which shadows the team's path. That is the harm the four-scope Decision exists to prevent. This is deduced from git's documented `--includes` default and was not reproduced, because worktree isolation blocked a fixture repo outside the worktree.
- **Suggested fix:** Pass `--includes` to each scoped read, or treat a non-null `effective` that classifies as foreign as foreign even when no scope shows it. Cover it with an `include.path` fixture in `git-hooks-install.test.ts`.
- **Fixed in:** cad5bb8f `readScope` passes `--includes`. The new test has a global config that includes a file setting `core.hooksPath=/team/hooks`; on the previous head the installer returned `set` and wrote a local `.githooks`, and it now returns `left-alone`. `git-hooks.md` says includes are followed.

### Re-review of the re-review fixes

Self-review 2026-11-18 [huntermcgrew/prism-516-git-hooks], range `5594e724..acdc112f` (0878d4e9, cad5bb8f, acdc112f). `pnpm prism:check` passes locally at acdc112f (1132 tests, 0 failed, 1 skipped; spec-scope skipped on a detached checkout), and both `prism-check` CI legs are green on the same head. The two new behavior tests were run against `install.mjs` and `update.ts` from 5594e724 and both failed there; the `.husky` control passed on both heads. All three fixes hold against source, and the changed `git-hooks.md` and `what-prism-writes.md` claims match the code. No critical or major findings.

### `removeGitHooksPath`'s JSDoc still says it runs only after this pass removed the shims

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `scripts/ai-skills/hooks/git-hooks/install.mjs:315`
- **Problem:** This is minor because it is comment drift, not behavior. The JSDoc says the function is "for a consumer whose shims were just removed". Since 0878d4e9 it also runs when a pulled commit already removed `.githooks/` and this pass removed nothing, which is the case the fix exists for. A reader of the function alone would think the already-gone case is unhandled.
- **Suggested fix:** Say it runs whenever `.githooks/` is gone for a consumer with neither `claude` nor `codex` as a host, whether this pass removed the shims or a pulled commit did.
- **Fixed in:** c95ac903 the JSDoc says it runs whenever `.githooks/` is gone in this checkout, whether this pass or a pulled commit removed it, and names the sibling-worktree skip.

### The unset now fires on every update in a linked worktree that lacks `.githooks/`, and clears the value for sibling worktrees that still have it

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `scripts/ai-skills/update.ts:1411`
- **Problem:** This is minor because it needs a hosts drop committed on one branch while another worktree of the same clone sits on a branch that still has PRISM's shims, and it self-heals on that worktree's next session start or `prism update`. `hooksDir` is checked per worktree, but `core.hooksPath` is local config shared by every worktree of the clone. A relative `.githooks` resolves per worktree, so a sibling whose branch still has the shims was running them. The earlier code unset only on the pass that emptied the directory. This range unsets on every pass in the worktree that lacks it, so the value flips back and forth between the two worktrees' updates and session starts. `git-hooks.md:17` explains the unset as "it would point git at a missing directory", which is true only for the worktree doing the update.
- **Suggested fix:** Either skip the unset when another worktree of the clone (`git worktree list --porcelain`) still has a marked `.githooks/pre-commit`, or name the multi-worktree case as a known limit in `git-hooks.md` and the Decision on dropping both hosts. The second is the smaller change and fits the rarity.
- **Fixed in:** c95ac903 the first option: `removeGitHooksPath` skips the unset while another worktree of the clone has a PRISM-marked shim. The new delivery test builds a linked worktree that has the shims, drops `hosts` to Cursor in the main checkout, and asserts the value stays; it failed on the previous head. It then removes the sibling's shims and asserts the value goes. `git-hooks.md` and `docs/what-prism-writes.md` say so, and the Decision on dropping both hosts records the trade.

Cleaner path (non-blocking): none that deletes complexity. The `hooksDirIsGone` flag in `removeDeliveredGitHookShims` looks removable by re-checking `pathExists` after `rmdir`, but a dry run never removes the directory, so the flag is what lets the dry run preview the unset.

### PR review (Eric), six Minor findings

PR review 2026-11-18 [huntermcgrew/prism-516-git-hooks] at `4021624a`, summary comment 6973976498. Two of the six are the open self-review findings above. All six are fixed in `c95ac903..93066e8f`.

- **`install.mjs:308`, `set` reported for a shim git skips** (`minor`, `fixed`). c95ac903 `installGitHooks` chmods marked shims without the executable bit off Windows before it reports `set` or `already`, and returns `left-alone` naming the shim when the chmod fails. Three tests fail on the previous head: a fresh install, an already-installed repair, and a dry run. The `hooks install` and session-start fixtures now write executable shims. 93066e8f `git-hooks.md` names the first-add route as the cause.
- **`update.ts:1411`, worktree flip-flop** (`minor`, `fixed`). See the self-review entry above.
- **`install.mjs:315`, stale JSDoc** (`minor`, `fixed`). See the self-review entry above.
- **`docs/what-prism-writes.md:25`, `.bak` promise** (`minor`, `fixed`). 93066e8f the promise covers the `.prism/` rows only, and the two hook rows and § Diverged files say a marked copy is replaced in place with no backup.
- **`hook-runtime.md:11`, ADR-0081 sentence** (`minor`, `fixed`). 93066e8f it reads "The git hooks ([ADR-0081](...)) run format and lint", linked like the doc's other ADRs.
- **`git-gates.mjs:476`, `lib/command.mjs:103`, `command.d.mts:15`, `any`** (`minor`, `fixed`). 47876023 `readRepoConfig` returns `Record<string, unknown> | null`, and a new `asRecord` helper narrows each nested `gitHooks` block in the push gate and both hook modules. `prism:check-types` passes on both tsconfigs.

Eric's cross-cutting observation is recorded in `git-hooks.md` § Configuration and the skip rule (93066e8f): `pnpm exec <missing-bin>` exits 1, not 127, so with a package-runner command a clone missing the tool fails the commit instead of skipping it. No test covers that shape, by design: the behavior is the package runner's.

### The worktree self-check compares Node's path with git's, so Windows counts the current worktree as a sibling

- **Severity:** `major`
- **Status:** `fixed`
- **File:** `scripts/ai-skills/hooks/git-hooks/install.mjs:391`
- **Problem:** Eric's finding on PR #523, confirmed by Windows CI going red on 874d5d99 at `removeGitHooksPath unsets only a local value of exactly .githooks` (`git-hooks-install.test.ts:417`). `otherWorktreeHasShim` compared `realpathSync(repoRoot)` with the paths from `git worktree list --porcelain`. Windows spells one directory differently in Node and in git, so the current worktree, which still has its shims on disk, counted as a sibling and the unset was skipped. Linux spells both the same, so the failure does not reproduce locally.
- **Suggested fix:** Take self from git, `git rev-parse --show-toplevel`, and normalize it the same way as the list entries, as `classifyHooksPath` does with `resolveCommonDir`.
- **Fixed in:** 07f234b5 self is `resolve(git rev-parse --show-toplevel)` with the same `realpathSync` as the list entries. The new test passes a path inside the linked worktree, which Node does not normalize to the toplevel, and failed on 874d5d99. It also runs the self-exclusion from the linked worktree while its shim is on disk, and checks that the main checkout still sees that shim. Windows was not run locally, so the Windows leg of CI on the new head is the confirmation. The same commit corrects two installer messages: the dry run says "make" instead of "made", and a partial chmod now names the shim it fixed as well as the one it could not.

## Cleanup Items

- `scripts/ai-skills/git-hooks-pre-commit.test.ts`, `git-hooks-pre-push.test.ts`, `git-hooks-install.test.ts`, `git-hooks-shim.test.ts`, `git-hooks-delivery.test.ts`, `hooks-cli.test.ts`, and `session-start-install.test.ts` — each builds its own git fixture with the same isolation env (`GIT_CONFIG_NOSYSTEM`, an empty global config, stripped `GIT_*`). A shared helper would remove the copies, but it spans seven new files and the existing `git-gates.test.ts` and `doctor.test.ts`, which carry the same env, so it is out of this child's frame.

## Acceptance Criteria

The issue's checklist, with IDs and evidence added. The criterion text matches the issue word for word.

- [x] **AC-1** A commit that stages an unformatted file matching the configured globs is refused, and the message names the command that fixes it.
  - Evidence (machine): `git-hooks-shim.test.ts` runs a real `git commit` through `.githooks/pre-commit` with a stub formatter → non-zero exit, stderr contains the configured `fix` command with the file path, and HEAD is unchanged · UNMET looks like: the commit succeeds, or stderr lacks the fix command.
- [x] **AC-2** A commit with no configured format command goes through, with a notice that the hook skipped.
  - Evidence (machine): the same suite with no `gitHooks` block → the commit exits 0 and stderr contains `pre-commit: skipped (no gitHooks.preCommit` · UNMET looks like: the commit fails, or succeeds silently.
- [x] **AC-3** A push that carries a file with a lint error is refused.
  - Evidence (machine): `git-hooks-shim.test.ts` pushes to a bare remote with a `LINT_ERROR` file → non-zero exit and the remote ref is unchanged. The positive control is that a clean push moves the remote ref · UNMET looks like: the remote ref moves on the lint-error push.
- [x] **AC-4** Running the installer in a repo whose `core.hooksPath` points at husky or lefthook changes nothing and reports the value it left alone.
  - Evidence (machine): `hooks-cli.test.ts` with local `core.hooksPath=.husky` → afterward `git config --local --get core.hooksPath` prints `.husky` and stderr contains `'.husky'`. The positive control is that an unset repo gets `.githooks` · UNMET looks like: the value changes, or nothing is reported.
- [x] **AC-5** `prism doctor` reports a clone with the hooks not installed.
  - Evidence (machine): `doctor.test.ts` on a fixture with marked shims and an unset hooks path → one warning finding containing `not installed in this clone`. The positive control is that after `installGitHooks` the warning is gone · UNMET looks like: no finding, or the warning stays after install.
- [x] **AC-6** An agent push with the git hooks installed runs lint once, not twice.
  - Evidence (machine): `git-gates.test.ts` with the hooks installed and `gitHooks.prePush.command` set → the `commands.lint` counter file is absent after the push arm runs. With `core.hooksPath` unset, the counter has exactly one line · UNMET looks like: the counter exists while the hooks are installed.
- [ ] **AC-7** The hooks run on Windows, macOS, and Linux.
  - Evidence (machine): the PR's `prism-check` CI is green on both `ubuntu-latest` and `windows-latest`, and both run `git-hooks-shim.test.ts`'s real `git commit` and `git push` cases · UNMET looks like: either leg fails or skips that suite.
  - Evidence (human): on a Mac, `pnpm prism:test` passes `git-hooks-shim.test.ts`. CI has no macOS leg, and `.github/` is outside this child's Affected systems · UNMET looks like: a failure or skip on macOS.
  - Status at close (2026-11-18): the machine evidence is met, with both legs green in CI run 44275791883 on 632035e5. The macOS human check is pending, so AC-7 stays unticked until a person runs it.

### AC Sync Log

| Date | Agent | Action | Plan | Ticket |
| ---- | ----- | ------ | ---- | ------ |
| 2026-11-18 | Winston | Generated AC from the issue checklist | written | already matches; no write |
| 2026-11-18 | Winston | Ticked AC-1 to AC-6 at close; AC-7 left open for the macOS check | ticked | not synced; the issue's checkboxes are left for a person |

## PR Readiness

- [x] No critical or major issues: the self-review of `5594e724..acdc112f` found none, and its 2 minors plus Eric's other 4 are fixed in `c95ac903..93066e8f`; Eric's later Major on the worktree self-check is fixed in `07f234b5`
- [x] Types correct: `prism:check-types` passes on both tsconfigs
- [x] No stray console.logs or debug artifacts
- [x] Tests written for new logic and edge cases: the already-absent `.githooks/` case and the `include.path` case are covered, and both fail on 5594e724. The linked-worktree unset and the shim-mode repair each have tests that fail on 4021624a, and the worktree self-exclusion test fails on 874d5d99
- [x] All debugged issues resolved (none recorded)
- [x] Build passes: CI run 44275791883 on 632035e5 is green on `ubuntu-latest` and `windows-latest`, after the Windows leg went red on 874d5d99 (`git-hooks-install.test.ts:417`)
- [x] PR description up to date: the body covers the `.git/hooks` leave-alone and the per-hook executable-shim rule; its "any of four scopes" line still holds with includes followed
- [x] Lasting decisions promoted to architect context: every Decision carries a verdict, and the 11 promotions were already in `git-hooks.md` before close

**Last updated:** 2026-11-18

Retro: ticket-grain charter-fidelity check, run inline at close on 632035e5. All 15 tasks landed; the only files outside their lists are the ones the Decisions record, plus generated manifest mirrors and a lesson. AC-1 to AC-6 are met by their named suites, and AC-7's machine evidence is met by CI run 44275791883, green on both legs. AC-7's macOS human check is pending. Eric's re-review at 632035e5 left no finding standing. No Decision was refuted, so there are no promotion cautions.
