# Worktree Mode

Reference procedure for personas that need an isolated checkout of someone else's branch. The canonical caller is Eric (PR review) in worktree mode; future personas that need branch isolation load this same reference.

The isolation invariant and cleanup contract live in [`.prism/rules/worktree-isolation.md`](../rules/worktree-isolation.md) — that rule defines the *why* and the *must-clean-up*. This reference defines the *how*: the concrete create, operate, and tear-down procedure.

## When to use worktree mode

A persona switches to worktree mode in any of three conditions:

- **The PR is on a divergent branch** — the target branch is not the current working tree's branch, and checking it out in place would discard the author's in-flight state.
- **The review must not contaminate the current working tree** — even when the branch matches, running builds, installs, or formatters in the author's tree would mix the reviewer's transient files into the author's diff.
- **The user explicitly requests it** — a `--worktree` flag or "review in worktree" phrasing in the invocation. The explicit request overrides any default; the persona enters worktree mode regardless of branch state.

If none of these apply, the persona stays in its default mode (typically in-branch) and skips this reference entirely.

## Worktree lifecycle

The procedure is create, operate, tear down. Each step has cwd discipline attached — the most common worktree failures are cwd-related.

### 1. Create

Clear any stale entry, fetch the target branch, add the worktree against the remote ref:

```bash
git worktree remove /tmp/<persona>-<branch-slug> --force 2>/dev/null || true
rm -rf /tmp/<persona>-<branch-slug>
git fetch origin <branch>
git worktree add /tmp/<persona>-<branch-slug> origin/<branch>
```

The worktree path uses `/tmp/` to keep it off the author's working tree and clearly disposable. `<persona>` distinguishes concurrent worktrees from different personas; `<branch-slug>` is the safe-filesystem form of the target branch name (slashes replaced).

The worktree is created in **detached HEAD state** against `origin/<branch>`. This is intentional — the persona reads and may push, but should not accidentally rewrite the branch ref locally.

### 2. Operate

All file reads use the worktree path as root: `/tmp/<persona>-<branch-slug>/`.

**cwd discipline — the load-bearing rule.** Never leave the shell cwd inside the worktree. If a command needs to `cd` into the worktree to run (install, build, format, push), return to the repo root immediately after with `cd <repo-root>` (or whatever absolute path the parent session uses). Use absolute paths or workspace-aware commands (`pnpm -r --filter`) for everything else. The worktree cannot be removed while any shell cwd lives inside it — the cleanup at step 3 will fail with `getcwd: cannot access parent directories` if discipline slips.

**Return-to-root pattern when commands may exit non-zero.** Use `;` instead of `&&` between the in-worktree command and the return-to-root:

```bash
cd /tmp/<persona>-<branch-slug>/frontend && npx prettier --check <files>; cd <repo-root>
```

With `&&`, a non-zero exit from prettier prevents the `cd <repo-root>` and the shell stays inside the worktree — the next worktree-remove fails. With `;`, the return-to-root runs regardless. The same pattern applies to eslint, jest, tsc, and any other command that exits non-zero on findings.

**Push from detached HEAD.** Worktrees added against `origin/<branch>` are in detached HEAD state. `git push origin HEAD` fails with `not a full refname`. Always push with the full ref:

```bash
cd /tmp/<persona>-<branch-slug> && git push origin HEAD:refs/heads/<branch>; cd <repo-root>
```

Store the branch name from the create step and reuse it here — do not re-derive it.

### 3. Tear down

Cleanup runs before the persona returns control, on every exit path:

```bash
cd <repo-root> && git worktree remove /tmp/<persona>-<branch-slug> --force
```

The `cd <repo-root>` first is non-negotiable — it ensures the shell is outside the worktree before the remove. `--force` is used because the worktree may have transient build artifacts (`node_modules`, `.next/`) that `git worktree remove` refuses to discard without it; the worktree exists only for this session, so forcing the discard is correct.

## Cleanup contract

The persona that creates a worktree owns its removal. The contract is defined in [`.prism/rules/worktree-isolation.md`](../rules/worktree-isolation.md) § Cleanup contract — three exit paths, all of which must tear down:

- **On success** — remove the worktree before returning the final result.
- **On error** — remove the worktree before propagating the error.
- **On interruption** — the persona's startup registers a cleanup hook so a partial run still tears down.

A user who invokes a persona and walks away should return to a clean filesystem. Stale worktrees accumulate, confuse later sessions, and burn disk; cleanup is not optional.

## Common worktree gotchas

These trip every persona that uses worktree mode at least once. Naming them here keeps the persona source files lean.

### Worktree creation fails

`git fetch` or `git worktree add` errors usually mean the branch doesn't exist on origin or a stale worktree entry is still registered. Clear with `git worktree remove <path> --force` and retry. If `git fetch` reports "couldn't find remote ref," ask the user to push the branch first — the worktree cannot be created against a ref that doesn't exist remotely.

### Cleanup fails with `getcwd: cannot access parent directories`

The shell cwd is inside the worktree being removed. Always prefix cleanup with `cd <repo-root> &&`, or use absolute paths throughout — never leave cwd inside the worktree. This is the most common worktree failure and it's entirely preventable with the cwd discipline above.

### Formatting/test failure cancels parallel tool calls

When a worktree command exits non-zero and is chained with `&&` to a return-to-root, the return-to-root is skipped and the shell stays inside the worktree. Subsequent commands run from the wrong directory; parallel tool calls in the same message may cancel. Use `;` (not `&&`) before `cd <repo-root>` for any command that can exit non-zero on findings (prettier, eslint, jest, tsc). The return-to-root must always run.

### `git push origin HEAD` fails with `not a full refname`

The worktree is in detached HEAD state. `HEAD` is not a branch ref, so `git push origin HEAD` errors. Push with the full ref: `git push origin HEAD:refs/heads/<branch>`. Store the branch name when the worktree is created and reuse it on push.
