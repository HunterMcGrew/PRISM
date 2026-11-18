---
Number: 0081
Title: Git Hooks Ship Beside the Agent-Side Gates
Status: accepted
Date: 2026-11-18
---

> Amended 2026-11-18 by PRISM-522 (`.prism/plans/prism-522/plan.md`, task T6): the git hook modules now reach every install whatever `hosts` holds, so the Cursor-only consequence below is wrong about the modules. Only the shims and the registrations follow `hosts`. A Cursor-only consumer still gets no git hooks, because git runs nothing without a shim.

## Context

[ADR-0076](./0076-commit-and-push-gates-are-harness-hooks.md) rejected real git hooks for four reasons. They cannot prompt the model. An agent can pass `--no-verify` and skip them. They need a per-clone `core.hooksPath` step, or a dependency such as husky. And they fire for every human on the team, not only for an agent. The agent-side gates it chose are harness hooks on the shell tool, because that is the only place a message can reach the model at diff-complete time.

That reasoning was about the agent. It left a gap for everyone else. Hunter asked for git hooks on 2026-11-17 because format and lint failures were surfacing as red CI, and a person committing from a terminal got no check at all. The harness gates never see a terminal commit.

[ADR-0074](./0074-hook-enforcement-is-claude-only-with-a-prose-fallback.md) rejected a git `pre-commit` hook as a substitute for read-before-write. That is a different question: a commit-time hook runs after the write has already happened, so it cannot give that guarantee. This decision does not reopen it.

## Decision

PRISM ships a `pre-commit` and a `pre-push` hook as `sh` shims in `.githooks/`, over zero-dependency `.mjs` modules that the existing hook runtime delivers to `.claude/hooks/git-hooks/`. The hooks run the formatter and linter the consumer names in `gitHooks` in `.ai-skills/config.json`. They are installed by pointing `core.hooksPath` at the relative value `.githooks`, and the installer never replaces a value it does not recognize, at any git config scope.

Alternatives, and why each lost:

- **husky.** It is a new dependency, and PRISM's runtime is zero-dependency `.mjs` so that a consumer with no `node_modules` still works.
- **An absolute hooks path.** Local config is shared by every worktree of a clone, so one checkout's absolute path would make every worktree run that checkout's hooks. A relative path is resolved per worktree, so each branch runs its own.
- **Backing up and replacing a consumer's own `.githooks/` files.** The runtime files under `.claude/hooks/` are handled that way, but `.githooks/` is the one directory where a consumer's own git hooks are likely to live. An unmarked file there is left untouched.

## Consequences

- Firing for humans is the point. This reverses the fourth reason ADR-0076 gave against real git hooks.
- Until the commit gate from child 8 of the Kitchen Line epic (#499) lands, an agent can still pass `--no-verify` and skip both hooks.
- The per-clone step is reduced, not removed. `prism adopt` and `prism update`, the agent session-start hook, an optional setup-script line, and `prism doctor` each cover clones. A person who clones by hand and uses none of them has no git hooks. CI stays the gate that decides a merge.
- Codex's `SessionStart` arm for the installer rests on a summarized read of its docs, not a live run.
- Cursor-only consumers get no git hooks, because the shims and modules ride the same delivery as the agent hooks, which Cursor does not receive.
- A consumer who already uses husky or lefthook keeps their setup and gets no PRISM git hooks until they compose them by hand. Git reads one hooks directory, so PRISM leaves a foreign value alone and `prism doctor` reports it.
- ADR-0076's agent-side gates stand. When the git hooks are installed and configured, the push gate skips the `lint` or `format` slot the git hook already ran.
- ADR-0074's rejection of git hooks as a read-before-write substitute also stands.

## References

- [ADR-0076](./0076-commit-and-push-gates-are-harness-hooks.md) — the gates this ships beside, and the rejection this reverses
- [ADR-0074](./0074-hook-enforcement-is-claude-only-with-a-prose-fallback.md) — git hooks rejected as a read-before-write substitute; superseded by [ADR-0077](./0077-hook-enforcement-reaches-claude-code-and-codex.md) for reach, and that rejection still stands
- `.prism/plans/prism-516/plan.md`
- [`git-hooks.md`](../../../architect/_toolkit/git-hooks.md) — the shims, the hook contracts, and the installer predicate
