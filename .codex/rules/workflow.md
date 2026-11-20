# Workflow

A plan folder, `.prism/plans/<ticket>/`, runs one of two sizes, standard or epic, and standard is the default. The agent proposes the size in `intent.md`, and the person approves it with the intent.

- **Standard:** intent → design when needed → spec → plan → challenge twice → implement → verify → review → PR → PR review → retro. A standard ticket may ship as one PR or as a stack of dependent PRs.
- **Epic:** work split into several parts under one tracker parent. `epic-<ticket>/` holds `intent.md` and `spec.md`, and no `plan.md`. A child's folder holds `spec.md` and `plan.md` and no intent: its spec's `epic:` line names the epic folder, whose approved intent covers it. From its spec on, a child runs the standard stages.

**Limits.** At most 20 subagents run at once, and at most 3 of them write, each on files no other writer touches. A stage runs at most 3 rounds, and one `blocked` bundle is re-dispatched at most 2 times. When a plan challenge's round 3 still blocks, the plan stage fixes the findings and runs one confirm round, which doesn't count against the 3. That round lets the plan through: a finding still blocking is fixed, or recorded as an open-question Decision and listed in the PR body and the closing summary. A finding holds the plan only when it is major, meaning its fix would change the intent or its foundation: an acceptance criterion, the spec's approach or Affected systems, a shared type, a public API, or a dependency. A major finding goes to `prism-architect` first, and the person is asked only when its verdict confirms the change is intent-level. A brief to a gated subagent names the plan folder, the task IDs, the worktree path, and the report shape, in 15 lines or fewer. Anything longer goes into `plan.md` first.

**Approval.** `intent.md` always needs the person's approval, and an epic's covers its children. `design.md` needs it when the intent says so, and `plan.md` needs it when `auto-approve.mjs` exits 1. The person approves by saying `approve` or `approved` in chat, alone, with a path to name the file, or in a sentence, though not in a question, a negation, a hedge such as `if` or `want`, or quoted text. An approved file keeps its approval through an edit that only writes down the person's own ruling, in their words. So does `plan.md` through any edit outside `## Tasks`, and a change to its tasks goes back through `auto-approve.mjs --check` and reaches the person only when that fails. Any other edit to an approved file is approved again the same way. The agent asks for an approval once, after every pending edit to that file has landed, because a later edit voids the ask. The approve-guard prompt hook records the approval with no time limit, and the agent then runs exactly `node scripts/ai-skills/hooks/plan/approve.mjs <artifact>` as its own command, which stamps `approved_via: chat`. The script refuses a file that changed after the approve message. Without a chat approval, the script refuses inside an agent session or without a terminal, and the hook denies the run. An agent runs the script only after an approve message, once per message, and never writes the approval fields or the approval token. A chain script that exits 2 has a usage or config error, so the stage reports its message and stops, and never turns it into an approval ask.

**Advancing.** An approved intent sets the run's goal: every stage done, with the draft PR open, reviewed, and retro'd, and CI green on its last push. Once the intent is approved, the run goes on without the person, and each finished stage starts the next from the resume table below without asking. After every push, run `node scripts/ai-skills/hooks/plan/watch-ci.mjs <pr>` in the background. On exit 1, fix it and push again, at most 3 times, then put it on the PR like any open item. Exit 8 (timeout) and exit 3 (unreadable PR) go on the PR too. The run stops short of the goal only where going on would build something unapproved or can't work: an approval named above, a plan challenge finding that `prism-architect` confirms is intent-level, a `blocked` report, and a second `needs-replan` on one task. A review pauses to ask only on the four pause triggers in `REVIEW.md`. Review findings never stop the run. A call only the person can make, and anything the review stages can't fix in 3 rounds, goes to the draft PR as an inline comment and is listed in the closing summary. After review fixes are pushed, dispatch `prism-pr-review` again per `shipping-flow.md`. Past the 3-round cap that run is the confirm pass, per `REVIEW.md`. Merging follows `Who merges` in `git-conventions.md`.

**Scope changes.** Later stages find work the intent didn't name. A change that follows from the approved outcome, such as extending a ruling to a sibling case or updating a doc the change makes false, goes ahead as a `## Decisions` entry in `spec.md` or `plan.md`. Anything else, such as a change to what a user sees beyond that outcome or a new system, goes to `prism-architect` as a subagent for a fit verdict. A `proceed` or `proceed with changes` verdict goes ahead the same way, with the verdict in the entry. A change that contradicts one of the person's rulings, or changes an acceptance criterion, goes to `prism-architect` first too, and the architect forwards it to the person. The person is asked mid-run only when the build can't go on without the answer: a change the architect forwards, or a `don't proceed` verdict on work a task depends on. That question is asked on its own, never inside an approval. Everything else stays an open item: an open-question Decision per `Open-question Decision variant` in `branch-plan.md`, listed in the PR body and the closing summary. Every scope change since the intent is listed at each stop and in the PR body, so the person can still veto one.

**Commit subjects on a folder-plan branch.** One bundle is one commit.

- `T3: <summary>`, `T3-T5: <summary>`, or `T11,T15,T22: <summary>` for task work
- `T3 fix: <summary>` for a review fix to a task that is already done
- `plan: <summary>` for plan-only commits
- `retro: <summary>` for the retro's promotions

Legacy flat-plan branches keep `PRISM-NNNN:`.

**Build report.** The implement and docs stages end with this report, and the session checks that one arrived before routing it.

```
verdict: done | needs-replan | blocked
tasks: <task ids>
commit: <sha, or none>
files: <each changed path, or unlisted: <path>>
checks: <each check run and its result>
history: <one `## History` line>
<one paragraph>
```

- `done`: rerun `node scripts/ai-skills/hooks/plan/bundles.mjs <plan.md> --base <base>`, dispatch the next bundles, and after each wave append the reports' History lines to `plan.md` and commit `plan: <summary>`. `<base>` is the commit that first added `plan.md`, the last line of `git log --diff-filter=A --format=%H -- <plan.md>`, and never the default branch, whose parent commits would read as done.
- `blocked`: fix the environment and re-dispatch, at most 2 times. A chain script's exit 2, or a `commit.mjs` failure other than an unchanged path, is `blocked`.
- `needs-replan`: the plan stage's re-plan, where a second one on the same task asks the person. An unlisted file, or an acceptance criterion the tasks cannot meet, is `needs-replan`.

**Resume.** A fresh session picks its next stage from folder state alone. Run the first row that matches.

| Folder state | Next stage |
| --- | --- |
| intent draft | grill or approve |
| Design line `needed` or `supplement`, and `design.md` missing or draft with approval required | design |
| no `spec.md` | spec |
| standard, no `plan.md` | plan |
| standard, `## Challenge` missing round 1 or 2 | plan (finish the challenge rounds) |
| standard, `plan.md` not approved, challenge rounds 1 and 2 done | plan approval (`auto-approve.mjs`, then the person on exit 1, or a stop on exit 2) |
| standard, a task with no commit naming it | implement |
| standard, `## Verification` empty | verify: dispatch `prism-verify` |
| standard, no final self-review line under `## Review` | review: run `prism-self-review` against `REVIEW.md` |
| standard, no PR | PR: follow `.prism/references/shipping-flow.md` |
| standard, PR open with no final PR-review verdict under `## Review` | PR review: dispatch `prism-pr-review` per `shipping-flow.md` |
| standard, `Retro:` line empty under `## PR Readiness` | retro: run `prism-retro`, which writes the line and commits `retro: <summary>`, then push |
| epic, a child in `## Children` not merged | the next unmerged child per `## Merge order`: `prism-spec` writes its spec in its own folder |
| epic, every child in `## Children` merged, no `## Retro` in `spec.md` | retro: run `prism-retro`, which appends `## Retro` to `spec.md` |
