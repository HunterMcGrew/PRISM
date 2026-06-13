# Worktree Mode

Reference procedure for personas that need an isolated checkout of someone else's branch. The canonical caller is Eric (PR review) in worktree mode; future personas that need branch isolation load this same reference.

This reference carries both halves of worktree mode: the *why* (the isolation invariant and the cleanup contract, below) and the *how* (the concrete create, operate, and tear-down procedure).

## Isolation invariant

Worktrees let a persona check out and operate on a different branch without disturbing the author's current working tree. Code review is the canonical case: Eric needs to read the PR's branch as it actually exists, run builds against it, and walk the file tree — but doing any of that on the author's own working tree would corrupt the in-flight state. A worktree gives the reviewing persona a parallel checkout, isolated from the author's session.

**Why:** Without isolation, a reviewer either reads the PR's diff in the abstract (missing context that only the live tree provides) or stomps the author's branch state (losing uncommitted work, contaminating builds, mixing the reviewer's transient files into the author's diff). Worktrees pay a small filesystem cost to keep both sides of the review honest. The cost only becomes a problem when worktrees leak — a session that creates a worktree and then exits without removing it leaves stale checkouts that accumulate, confuse later sessions, and quietly burn disk.

This is not a default-on procedure. A persona that operates on the current branch (the author's own work) does not create a worktree. A persona that operates on someone else's branch (PR review, comparative analysis across branches, multi-branch refactor planning) does. The invariant is isolation when isolation is needed, not creating worktrees as a routine — the next section names the exact conditions that trigger it.

## Who uses this reference

- **Eric** ([prism-code-review-pr](../skills/prism-code-review-pr/SKILL.md)) — runs the worktree procedure when invoked in worktree mode. The mode-selection logic and the procedure itself live in the skill source; this reference defines the isolation invariant and the cleanup contract the procedure must satisfy.
- **Sol** ([prism-conductor](../skills/prism-conductor/SKILL.md)) — creates one worktree per fleet lane so parallel lanes stay isolated, bound to the same cleanup contract (remove on success, error, or interruption). The fleet scheduler that allocates and tears down lane worktrees lives in `.prism/skills/prism-conductor/lib/fleet.md`; this reference defines the isolation invariant it satisfies.

Future personas that need isolated checkouts load this reference the same way.

## When to use worktree mode

A persona switches to worktree mode in any of three conditions:

- **The PR is on a divergent branch** — the target branch is not the current working tree's branch, and checking it out in place would discard the author's in-flight state.
- **The review must not contaminate the current working tree** — even when the branch matches, running builds, installs, or formatters in the author's tree would mix the reviewer's transient files into the author's diff.
- **The user explicitly requests it** — a `--worktree` flag or "review in worktree" phrasing in the invocation. The explicit request overrides any default; the persona enters worktree mode regardless of branch state.

If none of these apply, the persona stays in its default mode (typically in-branch) and skips this reference entirely.

Sol is the fleet case: a fleet run dispatches several lanes that each edit a different branch in parallel, so Sol gives **one worktree per fleet lane** to keep the lanes from stomping each other's checkout. A single-lane pipeline run needs no worktree — it uses the current checkout, exactly like a persona working its own branch.

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

## Formatting checks (review personas)

A reviewing persona in worktree mode runs formatting and linting checks on all files in the PR diff — **check only, no auto-fix**, since this is someone else's branch. (In-branch mode does not run formatters or linters — those require files on disk and per-package plugin resolution; CI catches formatting on the PR, and the in-branch reviewer flags only what's visible in the diff itself.)

**Critical:** Formatter and linter plugin resolution is team-specific (per-package vs repo-root, plugin location, working-directory requirement). The team's formatter invocation is set during onboarding — see [`verification-commands.md`](../rules/verification-commands.md). Use the `cd` and return-to-root pattern from § Operate (use `;` not `&&` before the return-to-root so a non-zero formatter exit does not cancel the return).

Run prettier and eslint in parallel (they are independent). They can safely run in the same batch as file reads — formatting checks and Read tool calls do not interfere with each other.

If either reports violations, include them in the review: post inline comments on specific issues, summarize under **Minor** severity, and note in the summary "Run `prettier --write` and `eslint --fix` on the flagged files to resolve." Leave the fix to the author — it's their branch.

## Cleanup contract

The persona that creates a worktree owns its removal, and removal happens on every exit path — three of them, all of which must tear down:

- **On success** — remove the worktree before returning the final result. The output should not depend on the worktree continuing to exist.
- **On error** — remove the worktree before propagating the error. Errors that leave worktrees behind are double failures — the original error plus the stale checkout.
- **On interruption** — the persona's startup registers a cleanup hook so a partial run still tears down what it created.

A user who invokes a persona and walks away should return to a clean filesystem. Stale worktrees accumulate, confuse later sessions, and burn disk; cleanup is the persona's responsibility, not the user's, and not optional.

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
