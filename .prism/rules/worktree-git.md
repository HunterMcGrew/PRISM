---
load: skill
---

# Worktree Conventions

## Purpose

Entering and removing a git worktree each have a documented decision procedure — one for which command to reach for on entry, one for whether removal is safe.

**Why:** PRISM's last worktree cleanup (87 worktrees) hit a real gap. `git merge-base --is-ancestor` classified 0 of 87 as safe, because PRISM squash-merges — a squash-merged branch's commits are never ancestors of `main`, so an ancestry check false-negatives on precisely the case it needs to get right. The fallback actually used at the time — "is the branch still on `origin`" — trusts the *branch name* rather than *commit identity*: a commit added after a PR merged still passes that check and would get swept along with everything that shipped. Dozens more accumulated while the repo lacked this predicate.

**How to apply:** follow the entry decision tree below when starting or resuming work in a worktree; follow the removal predicate before deleting one, whether by hand or through Zoe's worktree hygiene lane.

## Entering a worktree

- **Existing worktree for the branch** (it already appears in `git worktree list`) → `EnterWorktree path:<path>` — one call.
- **New branch** → `EnterWorktree name:<slug>` — cuts the branch off `origin/main`, creates the worktree, and enters it in one call.
- **Existing branch, no worktree yet** (resuming work someone else started, or a branch from a prior session) → `git worktree add <path> <branch>` then `EnterWorktree path:<path>` — two calls.

After entering an existing branch, sync it: `git fetch` then `git merge --ff-only origin/<branch>` if it's behind. This is a merge, not a rebase, on purpose — see `git-conventions.md` § Keeping a Branch Current for why rebasing a branch other sessions may share is unsafe.

The two-call resume case exists because `EnterWorktree name:` always cuts a *new* branch and has no resume mode. If a future version of the tool adds one, that's the signal to collapse this case into the one-call form.

## Removing a worktree

A worktree's removal safety sorts into three colors. The classifier at `scripts/ai-skills/worktree-classify.ts` implements this predicate in code — this section is the prose description; the two are kept in sync deliberately (see `code-standards.md` § Removal and rename completeness).

- **GREEN — remove.** `git status --porcelain` is empty, **and** either the branch is caught up with its upstream (`git rev-list --count @{u}..HEAD` is `0`), or a merged PR's shipped commit contains HEAD: `gh pr list --head <branch> --state merged --json headRefOid` returns an oid where `git rev-list --count <headRefOid>..HEAD` is `0`.
- **RED — preserve, never auto-remove.** Tracked uncommitted changes are present, or the branch has commits ahead of upstream that aren't contained in a merged PR's shipped commit.
- **YELLOW — ask, naming exactly what's at risk.** The tree is clean but has untracked-only files; there's no upstream configured and no merged PR; or HEAD is detached (whether or not the commit is still reachable from a branch).

These conditions are checked in order, not evaluated independently — tracked changes win. A detached worktree with tracked changes is RED, not YELLOW: the tracked-changes check runs before the detached-HEAD check, so it's the one that decides.

**Why a merged PR overrides ahead-count.** Because PRISM squash-merges, a branch's own ahead-count against its upstream branch is the wrong signal once a PR has merged — the squash commit on `main` isn't an ancestor of the branch's pre-squash commits, so a plain ancestry or ahead-count check reads a fully-shipped branch as still-ahead and blocks its removal, or worse, misses that a *newer* commit landed after the PR merged and isn't shipped anywhere. The fix is a containment check against the PR's own `headRefOid`, not against `main`: if the branch's current HEAD is exactly what that PR shipped (`rev-list --count <headRefOid>..HEAD == 0`), the branch's content is durably preserved in the merge — removal is safe regardless of what ahead-count against `main` says. If HEAD is *past* that oid, the extra commits were never shipped by that PR, and the branch falls through to the ahead-count/RED path instead of being waved through as GREEN.

**Worktree vs. branch.** `git worktree remove` deletes only the directory — the branch and its commits survive in the repo. `ExitWorktree action:remove` deletes both the directory and the branch. Removing a GREEN worktree by hand with plain git leaves a stale local branch behind; that's a separate, lower-stakes cleanup than the worktree removal itself.

**End-of-task self-cleanup.** Before ending a session that created a worktree, run `pnpm prism:worktree-classify <path>` against it — when the classifier is present in the repo. Consumer installs don't carry it (`scripts/ai-skills/worktree-classify.ts` isn't part of the npm package's published `files` or the `templates/install/` seed surface), so apply the predicate above by hand instead. A `GREEN` result means it's safe to remove; anything else names the reason it isn't.

## Who runs this rule

Zoe's worktree hygiene lane (explicit-invocation only), and any persona that created or worked in a worktree during its own session and wants to clean up before handing off.
