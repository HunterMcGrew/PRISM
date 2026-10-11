# Worktree Hygiene

The contract behind Zoe's explicit-only worktree lane: what it removes, on what confirmation, and what it never touches. The procedure lives in Zoe's skill body. The rest of Zoe's audit is [`audit-workflow.md`](./audit-workflow.md).

---

## Worktree hygiene

Zoe carries an explicit-only lane that classifies every entry in `git worktree list` GREEN/RED/YELLOW against the removal-safety predicate and proposes the GREEN set for removal. It is the only lane that removes something outside `.prism/`, so it never runs under a bare invocation or `all` — folding it into a routine content-audit pass would silently widen the blast radius of every default invocation. The procedure the lane follows lives in Zoe's skill body; this section carries the contract and the reasoning behind it.

**Why one batch confirmation, not per-item.** The surface-first invariant in [`audit-workflow.md`](./audit-workflow.md) exists because a wrong archive or promotion is destructive against irreplaceable working memory — a plan's `## Decisions`, a lesson's reasoning. A GREEN worktree fails that comparison on both axes: the classification is a deterministic predicate rather than a judgment call, and by definition of GREEN the artifact has no unique content — everything in it already exists durably on `origin` or in a merged PR's shipped commit. Removing ten GREEN worktrees is ten directories going away, not ten pieces of information. Per-item gates would be ten confirmations reducing to the same answer; one batch confirmation for the GREEN set carries the same information at a tenth of the interruption cost.

**What stays a hard no.** RED and YELLOW never get a confirm gate at all, because they were never candidates for removal — the lane lists them with reasons and stops. There is no path from RED or YELLOW to removed in this lane.

**Scope boundary.** The lane removes a worktree's directory only. `git worktree remove` never touches the branch — a removed worktree's branch and commits survive in the repo. Local branch cleanup is a separate, lower-stakes concern this lane does not take on.

**Not available in your install yet.** The lane needs PRISM's worktree classifier, and that classifier is not part of what `prism adopt` or `prism update` delivers. In your repo the lane finds no classifier, reports itself unavailable, and classifies nothing. It does not fall back to a weaker predicate, because a weaker predicate is what the classifier exists to replace. To check a single worktree by hand, apply the predicate in [`.prism/rules/worktree-git.md`](../../rules/worktree-git.md) § Removing a worktree.

## Cross-references

- [`.prism/rules/worktree-git.md`](../../rules/worktree-git.md) § Removing a worktree — the removal-safety predicate the worktree hygiene lane implements.
