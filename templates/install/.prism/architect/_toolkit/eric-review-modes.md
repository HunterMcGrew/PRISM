# Eric's Review Modes

Why Eric, the PR reviewer, reads a PR in place by default and opts into a worktree only when the review needs one. Eric's roster entry is [`skills-ecosystem.md`](./skills-ecosystem.md) § Skill Roster.

---

## Session-cost economics — why Eric's mode default matters

Eric is the highest-frequency review skill in the ecosystem — every PR that lands gets at least one Eric pass, and PRs that go through fix-and-re-review cycles get several. The cost per invocation compounds across the team. Worktree creation alone adds 5–15 seconds per run plus filesystem state: a `git fetch`, a `git worktree add`, an optional `pnpm install --frozen-lockfile`, and a cleanup at the end. Over hundreds of reviews per cycle, that overhead adds up to real session time and real disk churn — and on the typical PR (clean working tree, branch is fine to read at HEAD, no formatters that need package-local plugin resolution), none of it earns its cost.

In-branch mode as the default flips the economics. The common path — read the diff, read the changed files at the PR head, post inline comments and a summary — happens without touching the filesystem. Worktree mode remains available for the cases where it earns its cost: branches with divergent state where a plain read would mislead, reviews that must run formatters or tests against the PR's branch, or explicit user requests. The mode gate at session start picks the right path; the user sees the chosen mode announced before the review starts; the cost lands where the value is.
