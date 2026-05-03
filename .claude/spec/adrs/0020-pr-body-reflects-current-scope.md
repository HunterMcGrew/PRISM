---
Number: 0020
Title: PR Body Reflects Current Scope, Not PR-Open Scope
Status: accepted
Date: 2026-04-22
---

## Context

Teams using PRISM typically squash-merge PRs (per `.claude/rules/git-conventions.md`). When a PR is squash-merged, the PR body becomes part of the merge commit description on `main`. That means the PR body isn't just a review artifact — it's permanent history.

PR bodies are written once, at PR-open time. Branches then evolve: follow-up commits from review feedback, drive-by scope changes approved mid-ticket, deferred work split out, and approach shifts recorded in the plan's `## Decisions`. None of these moments updated the PR body automatically. By merge time the body routinely describes an earlier scope than what actually ships.

This surfaced concretely in the originating incident: a PR's original body described a three-file, single-architect-context-doc change. Mid-review, the scope expanded to include `AGENTS.md` routing-table fixes, a section rename, and redirect-language single-sourcing. The PR body didn't reflect any of it until someone noticed. On squash-merge, the stale body would have landed in `main` as the canonical description of a change that had grown to twice its original scope.

The toolkit's existing sync patterns — Winston auto-syncing AC to the ticket system, plan `## History` appending without prompting — show the precedent: when the trigger is confident, the sync happens. Prompting is the exception, not the default.

## Decision

The PR body describes current scope, not PR-open scope. Two agents enforce this at the two moments where drift becomes inevitable:

- **Winston** — after modifying `## Implementation Tasks`, `## Decisions`, or `## Acceptance Criteria` in the plan, if an open PR exists for the current branch, rewrite the agent-owned sections of the PR body to reflect the new scope. Silent. Mentioned in the closing message.
- **Clove** — in the shipping flow, when pushing to a branch with an existing PR and the plan's `## History` has new entries past the last PR-body write, rewrite the agent-owned sections before push. Silent. Mentioned in the closing message.

**Section-based ownership** — the agent owns the narrative sections it originally generated (`## Summary`, `## What did you do?`, `## Why did you do it?`, `## How did you achieve it?`, `## Ticket`, `## Type of Change`, pre-submit checklist). The user owns `## Screenshots`, `## Notes`, and any section the agent didn't originate (reviewer callouts, deployment notes, ad-hoc context). The agent may seed initial content in Screenshots and Notes at first body creation, but never rewrites them on subsequent syncs — last-editor detection was rejected (the agent has no edit history to consult), and "seed once, never rewrite" is the behavioral rule that keeps section ownership decidable. Auto-sync rewrites agent-owned sections and preserves user-owned sections verbatim.

**Opt-out is per-session, not per-push.** If the user says "don't touch the PR body" during a session, honor it for that session. No per-push prompt — prompting every time is exactly the friction this invariant is designed to avoid.

## Consequences

- Positive: the PR body at merge time reflects what actually shipped. Squash-merge preserves an accurate description in `main` history instead of a stale one.
- Positive: review context stays current. Reviewers who re-read a PR after follow-up commits see the updated scope in the body, not in the commit log.
- Positive: removes manual work. The author doesn't have to remember to update the body after every review response or scope shift.
- Negative: user-authored edits to agent-owned sections get overwritten on next sync. Mitigation is section-based ownership — if the user wants custom content, they add it as a new section (e.g. `## Reviewer Notes`) that the agent's sync step won't touch. If a user edits an agent-owned section and wants those edits preserved, the per-session opt-out is the escape hatch.
- Negative: two agents now do the same sync work at different moments. They must agree on which sections are agent-owned. The rule and template are the shared source of truth.
- Neutral: first PR body creation is still once-at-open — the Clove PR-open flow hasn't changed. Auto-sync is for subsequent updates.

## References

- `.claude/rules/pr-description.md` — documents the sync invariant and section ownership.
- `.claude/rules/git-conventions.md` — squash-merge policy; the load-bearing reason the body must be current at merge time.
- `.claude/references/shipping-flow.md` — Clove's enforcement point.
- `.claude/skills/prism-architect/SKILL.md` — Winston's enforcement point.
- `.claude/templates/pr-description.md` — section structure; callout for squash-merge context.
- ADR-0009 (AC Required, Synced to Ticket System) — the precedent sync pattern.
