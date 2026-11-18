# Git Hooks

The `pre-commit` and `pre-push` git hooks PRISM ships: the shims that git runs, the `.mjs` modules behind them, what each hook checks, and how the installer points git at them without displacing a hooks setup a team already has. The agent-side gates that ride the same runtime (the write gate, the commit cleanup pass, push verification) are in [`hook-runtime.md`](./hook-runtime.md). Where the delivered files sit in an install is [`install-layout.md`](./install-layout.md).

---

## Shape: a shim over a module

Git runs the files in `.githooks/`. `.githooks/pre-commit` and `.githooks/pre-push` are short `sh` shims, and all the logic lives in zero-dependency `.mjs` modules (`pre-commit.mjs`, `pre-push.mjs`, `install.mjs`) that import only `node:` builtins and `hooks/lib/command.mjs`. A consumer may have no `node_modules`, so the hooks cannot assume a package tree. The shim is plain `sh` so it needs nothing beyond `node`.

Each shim resolves its module from the repo toplevel and tries two candidates in order: `.claude/hooks/git-hooks/<hook>.mjs`, where `prism update` delivers the module in a consumer, then `scripts/ai-skills/hooks/git-hooks/<hook>.mjs`, where it lives in PRISM's own tree. One shim file therefore works in both places. The shim exits 0 with a notice when `node` is not on `PATH` or neither candidate exists, and it replaces itself in place on every update.

Only a shim carrying the `@prism-hook-runtime` marker line is PRISM's. A `.githooks/pre-commit` or `.githooks/pre-push` without that line is the consumer's own hook, and delivery leaves it byte for byte, with a warning. `.githooks/` is the one directory where a consumer's own git hooks are likely to live, so this differs from the agent runtime under `.claude/hooks/`, where an unmarked file at a delivered path is backed up as `.bak` and replaced.

The modules ride the agent hook runtime's delivery (`hook-runtime.md` § Hook runtime), and the shims are delivered only when `claude` or `codex` is in `hosts`. A Cursor-only consumer gets no git hooks, because routing them through a second delivery path would need its own copy step, ownership rule, and prune list for one host. Dropping both hosts removes the marked shims, and `.githooks/` itself once it is empty.

## Configuration and the skip rule

Both hooks read a `gitHooks` block in `.ai-skills/config.json`: `preCommit` takes `command`, `globs`, and an optional `fix`, and `prePush` takes `command` and `globs`. A hook with no block, an empty command, or no globs skips with a notice and exits 0. So does a command whose binary is not found, which the hook recognizes by exit status 127 or, under `cmd.exe`, by its "is not recognized" message. A crash inside either module also skips, with a notice.

**Why skip rather than block.** A hook that fails because of its own setup is one people learn to bypass with `--no-verify`, and a bypassed hook protects nothing. The cost is that a repo with a misconfigured command gets no check and one stderr line, which is why `prism doctor` says when both commands are unset.

## Pre-commit

The formatter contract is stdin to stdout, with `{path}` in the command standing for the file's repo-relative path, so a formatter can pick its parser and config from the name. For each staged file that matches the globs (added, copied, modified, or renamed), the hook feeds the **staged blob** to the formatter and compares what it prints with what went in, byte for byte. Any difference, or a non-zero exit, fails the commit and lists the files. When `fix` is set, the message prints it with `{files}` filled in.

**Why compare output rather than run a `--check` flag.** Prettier's `--check` with stdin exits 0 on a parse error, so a broken file would pass. A byte comparison is correct for any formatter that can read stdin, and it never writes: no `--write`, no `git add`, no change to the index or the working tree. Materializing staged copies into a temp directory was rejected because formatter configs and ignore files resolve relative to the file's real path.

**Why the staged blob.** A partially staged file is judged on what the commit will contain, not on the working copy.

**`GIT_INDEX_FILE` passes through.** `git commit -a` and `git commit <paths>` run hooks against a temporary index named by `GIT_INDEX_FILE`. The hook passes its whole environment to every git call it makes, so `git diff --cached` and `git show :<path>` read the same index the commit will use.

**`--all` for CI.** `node .claude/hooks/git-hooks/pre-commit.mjs --all` checks every tracked file that matches the globs, from disk rather than the index, and exits 1 if any is unformatted. A consumer's CI can run it as a format check with the same command and globs the hook uses. The pre-push hook has no `--all` mode.

## Pre-push

Git writes one line per ref being pushed to the hook's stdin. For each ref the hook finds the files the push adds or changes (deleted files drop out) that match the globs, takes the union across refs, and runs the lint command once, with `{files}` filled in. A non-zero exit blocks the push, and the command's own output reaches the terminal.

**The base.** The diff is taken against the remote's own tip when this clone has that commit. A new branch, or a remote sha the clone does not have, falls back to `<remote>/<defaultBranch>`, where `defaultBranch` is the config's value or `main`. With neither available the ref is skipped with a notice.

**Why a ref that is not the checked-out HEAD is skipped.** The linter reads the working tree. Linting while a different ref is pushed would judge files the push does not carry, so the hook says it skipped that ref instead of passing or failing it on the wrong content.

## The installer

`install.mjs` is the one definition of "is git pointed at PRISM's hooks". `prism hooks install`, `prism update`, `prism adopt`, the agent session-start hook, and a consumer's own setup script (`node .claude/hooks/git-hooks/install.mjs`) all call it.

**What it writes.** `core.hooksPath` set to the relative value `.githooks`, at local scope. Local config is shared by every worktree of a clone, and git resolves a relative hooks path per worktree, so each branch runs the hooks checked out with it. An absolute path would make every worktree run one checkout's hooks.

**What it will not displace.** Git reads one hooks directory, so a `core.hooksPath` that is not PRISM's means PRISM's hooks cannot also be active. The installer reads the value at system, global, local, and worktree scope (the worktree scope only when `extensions.worktreeConfig` is on) and classifies each as unset, ours, or foreign. `.githooks` is ours, and so is an absolute path to a `.githooks` directory in the same repository, which is how a stale absolute value from an older setup is recognized and replaced. Anything else is foreign: husky's `.husky`, a `.githooks` in another repo, a team-wide global path. A foreign value at any scope means the installer changes nothing and says so. A global value would otherwise be shadowed by a local one, which is the same harm as overwriting it. A worktree-scope value that is ours is unset, because it would shadow the local one.

**Exit codes.** Every outcome exits 0, `left-alone` included, which prints to stderr. It is a report, and a non-zero exit would break `prism update` or a `prepare` script in a repo that is set up correctly in its own way. With no PRISM shims in `.githooks/` there is nothing to point git at, and it says that.

**The session-start arm.** At `startup` and `resume`, the agent runtime installs the hooks when every scope is unset, and reports only when it set the value. It stays silent about a foreign setup because a message at every session start is noise, and `prism doctor` carries that report instead. The Claude registration's `SessionStart` matcher is `startup|resume|compact`, and Codex's is `startup|resume`. The Codex registration is based on a read of Codex's hook documentation and has not been run in a live Codex session.

## Relationship to the agent gates

When the git hooks are installed (the effective `core.hooksPath` is ours and the marked `pre-commit` shim is at that path) and the matching `gitHooks` command is set, the push gate skips the `commands` entry the git hook already ran: `commands.lint` when `gitHooks.prePush.command` is set, `commands.format` when `gitHooks.preCommit.command` is set. Each slot is judged on its own, and the gate says which it skipped.

Two limits are worth knowing. The skip assumes the git hook ran, and an agent that passes `--no-verify` to `git commit` or `git push` skips the hook while the push gate still believes it ran. The git hooks also reach only the clones where they were installed: `prism update`, the session-start arm, and a setup script each install them, and a person who clones by hand and runs none of those has no git hooks. CI is the check that decides a merge.

`prism doctor` reports the install state. It is silent when the repo has no PRISM shim. It reports `info` when the hooks are installed or when a foreign `core.hooksPath` is in force, and a warning when the shims are delivered but not installed in this clone. It also says when both `gitHooks` commands are unset.
