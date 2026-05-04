---
Number: 0003
Title: Authors Ship, Reviewers Review
Status: accepted
Date: 2026-04-19
---

## Context

The skill ecosystem initially had ambiguous ownership around PR creation. Clove wrote code but paused before pushing to ask "Want me to push this up?" Briar, reviewing the branch, sometimes absorbed PR creation when asked. Eli, Sage, and Reese produced artifacts but stopped at file creation — shipping was a separate step the user had to request.

This ambiguity created two failure modes: ceremony (prompting for actions the user almost always approved) and lane drift (reviewers absorbing author responsibilities, eroding the review's adversarial edge). The Round 10 audit in `.prism/plans/4.7-skill-audit-strategy.md` formalized the framework that resolves both.

The three-question test: an action skips its prompt when it is reversible AND the user almost always says yes AND it is in-lane. PR creation by an author after a clean implementation passes all three.

## Decision

**Authors ship. Reviewers review.**

- Clove, Eli, Sage, and Reese each own the full shipping step for their authored artifact — commit, push, and open the PR without a pre-push prompt.
- Briar and Eric never ship. When a user asks a reviewer to create a PR, the reviewer routes back to the author.
- Release PRs are still owned by the team lead. Sage and Reese produce the artifact PRs that the release PR consumes; they do not produce release PRs themselves.

When a reviewer runs against a branch with no PR open yet, the reviewer routes back to the author using a diff-based heuristic (docs/`.claude/` paths → Eli; code → Clove; Sage and Reese route back on explicit user direction).

## Consequences

- Positive: the happy path ships without a redundant confirmation step. The user asks for implementation; implementation includes shipping.
- Positive: the author/reviewer separation stays clean. Review remains adversarial because the reviewer has no shipping stake.
- Negative: authors must know the shipping mechanics. The shared reference at `.prism/references/shipping-flow.md` documents the flow in one place; each skill points at it.
- Neutral: if a branch has no PR open when a reviewer is invoked, there's an extra route-back hop. Acceptable — it's rare and preserves the separation.

## Per-User Overrides

The team-wide default above stays as-is. Individuals whose review discipline needs a diff gate before code leaves their machine can opt into a pre-commit pause via git config:

```bash
git config --global thrive.pauseBeforeCommit true    # opt in
git config --global thrive.pauseBeforeCommit false   # opt out (matches team default)
git config --global --unset thrive.pauseBeforeCommit # reset (prompts again on next ship)
```

The shipping flow (see `.prism/references/shipping-flow.md`) reads this value before every commit and branches:

- `true` — announce the commit subject, wait for the user to say "ship it" before committing. Specific files or a full diff shown on request.
- `false` — commit directly; same as the team default.
- unset — ask the user once, persist the answer, and apply it for this ship going forward.

Matching is strict. Only exact `true` or `false` triggers its path; any other value falls through to the unset path and re-asks on next ship.

**Why strict:** git config values are user-editable strings. Lenient matching (`yes`, `1`, `True`) hides behavior behind magic and makes bug reports harder to interpret. Git itself uses `true`/`false` as the boolean convention (`core.autocrlf`, `pull.rebase`), so matching git's own pattern keeps the contract legible.

### Why git config

The override has to survive across every surface a developer runs Claude Code from — CLI, desktop app, VS Code extension. The common denominator is bash, and git config is universally available wherever git runs. User-level CLAUDE.md works on some surfaces but not reliably on the VS Code extension, which would leave the override silently broken for anyone on that path.

### Scope

`git config --global thrive.*` is reserved for per-user, machine-local Thrive preferences that layer on top of the tier defaults. Currently `thrive.pauseBeforeCommit` is the only entry.

If a second per-user override emerges, write a new ADR that generalizes the mechanism rather than piling into this section. Preferences earn a place in this namespace when they describe durable per-user behavior — not task-level heuristics, not per-skill tweaks, not anything that belongs in a plan or a skill file.

## References

- `.prism/plans/4.7-skill-audit-strategy.md` § Round 10 — the three-question framework
- `.prism/plans/thr-1631.md` — the implementation of this pattern across Clove, Eli, Sage, Reese, Briar, and AGENTS.md
- `.prism/references/shipping-flow.md` — shared shipping mechanics
- `AGENTS.md § 0` — the one-line summary in the auto-routing section
