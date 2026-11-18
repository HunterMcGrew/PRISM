---
title: Ship git pre-commit and pre-push hooks with an installer
ticket: https://github.com/HunterMcGrew/PRISM/issues/516
stage: plan
status: draft
---

Child 2 of the Kitchen Line epic (#499). The design comes from the "Git hooks" part of the epic spec on `huntermcgrew/prism-499-approve-once` (PR #518), at `.prism/plans/prism-499/spec.md`. The thrive reference is TracTru/thrive #2847 at 2bbbbcf49.

**Goal:** PRISM ships a pre-commit hook and a pre-push hook, for its own repo and for every consumer, that run the consumer's own commands, skip with a notice when something is missing, and never replace a hook setup PRISM does not recognize.

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
- **No challenge rounds were run, and `status` stays `draft`.** The challenge round grammar and `auto-approve.mjs` land in children 4 and 5. Until then this plan goes through today's review flow, and `## Challenge` stays empty, not filled with invented rounds.
- **Commits use `PRISM-516: <summary> (T<n>)`, one per task.** The rule that changes subjects to `T3:` on a folder-plan branch lands in child 5, so `git-conventions.md` as it stands governs this branch. Putting the task ID in the subject keeps every task traceable.
- **Git hooks ride the agent hook runtime's delivery.**
  - **Root cause.** The `.mjs` modules have to live somewhere zero-dependency and already delivered.
  - **Alternatives considered.** A host-independent delivery into `.githooks/lib/`. Rejected. It would need a second copy path, a second ownership rule, and a second prune list, all to serve Cursor-only consumers, and the intent already says those consumers get no hooks.
  - **Chosen approach.** The modules join `HOOK_RUNTIME_FILES` under `.claude/hooks/git-hooks/`. The shims are delivered only when `claude` or `codex` is a host, and a Cursor-only consumer gets no git hooks.
  - **Implementation guidance.** The shim's second candidate path is what lets the same file work in PRISM's own tree, where agent hooks run from `scripts/ai-skills/hooks/`.
- **The pre-commit command contract is stdin to stdout with a `{path}` hint, not a `--check` flag.** This is what lets the hook judge the staged copy with any formatter without writing anything. It is also thrive's finding: Prettier's `--check` with stdin exits 0 on a parse error. Considered: materializing staged copies into a temp directory. Rejected, because formatter configs and ignore files resolve relative to the file's real path.
- **An unmarked `.githooks/<name>` in a consumer is left alone, not backed up and replaced.** Runtime files under `.claude/hooks/` get `.bak` and replace, but `.githooks/` is the one directory where a consumer's own git hooks are likely to live, and the intent forbids touching them.
- **The installer treats a foreign value at any of the four scopes as "leave alone", global and system included.** Thrive checked local and worktree only. A local `.githooks` would silently shadow a team-wide global hooks path, which is the same harm as overwriting a local one.
- **`left-alone` exits 0 everywhere.** It is a report, not a failure. A non-zero exit would break `prism update` and a consumer's `prepare` script for a repo that is set up correctly in its own way.
- **Session start installs only when every scope is unset, and prints nothing otherwise.** A foreign value reported at every session start is noise. Doctor carries that report.
- **Doctor reuses the `hook-registration` check id.** Adding a `git-hooks` id would widen the exported `DoctorFinding` union, a shared type, for a label nobody filters on.
- **PRISM's own config gets no `gitHooks` block.** PRISM has no formatter, and its linter (`prism:crossref-lint`) does not take a file list. Adding Prettier or ESLint would be a new dependency, outside this child's limits. PRISM's hooks install and print their skip notice. That proves delivery and install on PRISM itself, but it means PRISM's own commits are not format-checked until a tool is chosen.
- **`prism eject` does not remove the shims or unset `core.hooksPath`.** Eject today leaves the whole hook runtime in place, so this matches it. A left shim skips with a notice once its runtime is gone. Removing hook delivery on eject is a follow-up PR off `main` per `followup-scope.md`, covering the runtime and the shims together.
- **This child ships as one PR, not a stack.** It touches more than ten files, but the modules have no value until the installer and delivery reach a repo, and the epic is already split at child grain.
- **OPEN — TBD, needs a live Codex run (Hunter).** Whether Codex fires `SessionStart` with `source: "startup"` for the install arm. The event and its `source` values come from a summarized read of the Codex hooks page on 2026-11-18, not verbatim text. **Default path (used until resolved):** register it on Codex as T9 says, record it as documentation-summarized in `git-hooks.md`, and rely on adopt and update, the setup-script line, and doctor to cover Codex clones meanwhile. Child 8's per-host registration test is the natural place to confirm it.

## History

- 2026-11-18 [huntermcgrew/prism-516-git-hooks]: Plan created: git hooks, installer, delivery, session-start install, doctor check, push-gate dedupe, ADR, and docs, as 15 tasks.

## Sessions

- 2026-11-18 [huntermcgrew/prism-516-git-hooks] open: Intent: plan child 2 (git hooks) to the detail bar from the epic spec and thrive #2847. Bounds: plan file only, no code, no PR, and nothing outside the spec's Affected systems. Approach: port thrive's behavior, generalize its hard-coded tools into the gitHooks config, and reuse the hook runtime's delivery. · close: scope held

## Verification

## Review

## Acceptance Criteria

The issue's checklist, with IDs and evidence added. The criterion text matches the issue word for word.

- [ ] **AC-1** A commit that stages an unformatted file matching the configured globs is refused, and the message names the command that fixes it.
  - Evidence (machine): `git-hooks-shim.test.ts` runs a real `git commit` through `.githooks/pre-commit` with a stub formatter → non-zero exit, stderr contains the configured `fix` command with the file path, and HEAD is unchanged · UNMET looks like: the commit succeeds, or stderr lacks the fix command.
- [ ] **AC-2** A commit with no configured format command goes through, with a notice that the hook skipped.
  - Evidence (machine): the same suite with no `gitHooks` block → the commit exits 0 and stderr contains `pre-commit: skipped (no gitHooks.preCommit` · UNMET looks like: the commit fails, or succeeds silently.
- [ ] **AC-3** A push that carries a file with a lint error is refused.
  - Evidence (machine): `git-hooks-shim.test.ts` pushes to a bare remote with a `LINT_ERROR` file → non-zero exit and the remote ref is unchanged. The positive control is that a clean push moves the remote ref · UNMET looks like: the remote ref moves on the lint-error push.
- [ ] **AC-4** Running the installer in a repo whose `core.hooksPath` points at husky or lefthook changes nothing and reports the value it left alone.
  - Evidence (machine): `hooks-cli.test.ts` with local `core.hooksPath=.husky` → afterward `git config --local --get core.hooksPath` prints `.husky` and stderr contains `'.husky'`. The positive control is that an unset repo gets `.githooks` · UNMET looks like: the value changes, or nothing is reported.
- [ ] **AC-5** `prism doctor` reports a clone with the hooks not installed.
  - Evidence (machine): `doctor.test.ts` on a fixture with marked shims and an unset hooks path → one warning finding containing `not installed in this clone`. The positive control is that after `installGitHooks` the warning is gone · UNMET looks like: no finding, or the warning stays after install.
- [ ] **AC-6** An agent push with the git hooks installed runs lint once, not twice.
  - Evidence (machine): `git-gates.test.ts` with the hooks installed and `gitHooks.prePush.command` set → the `commands.lint` counter file is absent after the push arm runs. With `core.hooksPath` unset, the counter has exactly one line · UNMET looks like: the counter exists while the hooks are installed.
- [ ] **AC-7** The hooks run on Windows, macOS, and Linux.
  - Evidence (machine): the PR's `prism-check` CI is green on both `ubuntu-latest` and `windows-latest`, and both run `git-hooks-shim.test.ts`'s real `git commit` and `git push` cases · UNMET looks like: either leg fails or skips that suite.
  - Evidence (human): on a Mac, `pnpm prism:test` passes `git-hooks-shim.test.ts`. CI has no macOS leg, and `.github/` is outside this child's Affected systems · UNMET looks like: a failure or skip on macOS.

### AC Sync Log

| Date | Agent | Action | Plan | Ticket |
| ---- | ----- | ------ | ---- | ------ |
| 2026-11-18 | Winston | Generated AC from the issue checklist | written | already matches; no write |

## PR Readiness

Retro:
