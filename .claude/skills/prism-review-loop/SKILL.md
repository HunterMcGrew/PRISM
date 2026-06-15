---
name: prism-review-loop
description: >
  Orchestrate the review gauntlet on a PR — self-review loops with
  fixes until a zero-findings pass, then PR review the same way; cleaner-path
  findings route by certainty (clear-cut → implement, uncertain → architect,
  architect-uncertain → pause for user). Pass budget, three-strike survival rule
  with mandatory diagnosis, scoreboard TLDR; PR stays draft. Explicit
  invocation; no persona. Triggers: review loop, gauntlet, full review cycle,
  briar then eric, review until clean.
argument-hint: "[PR number or branch — e.g. '#76' or 'current branch']"
---

<!-- AUTO-GENERATED FILE. DO NOT EDIT DIRECTLY. -->
<!-- Source: .ai-skills/skills/prism-review-loop -->
<!-- Target: claude | Regenerate with: pnpm prism:build -->

Orchestrate the full review gauntlet on the target PR. This skill sequences
existing personas — it never reviews, fixes, or writes findings itself, and the
personas keep their own plan hygiene (Review Issues entries, History appends)
exactly as if invoked by hand.

## The ladder

1. **Self-review loop** — invoke the self-review persona on the branch. Every
   finding, any severity (critical, major, minor, nit, cleanup), goes to the
   implementation persona to fix — review-fix commits stay separate per
   `.prism/rules/git-conventions.md` § Commit Granularity. Re-run
   self-review. Repeat until a pass returns zero findings.
2. **PR-review loop** — same shape with the PR-review persona on the PR.
   Findings → fixes → re-review. The phase is not done until a pass returns
   **zero new findings AND zero fixed-but-unresolved review threads** — when a
   fix lands a finding, the thread that flagged it is only closed by the
   reviewer's next pass (the reviewer's batch-D resolve step is the sole actor
   that resolves threads). If fixed threads remain unresolved when findings hit
   zero, run a final reviewer pass to resolve them before closing the phase.
3. **Cleaner paths** — non-blocking by design; they never gate the
   zero-findings exit, but each must reach a terminal state before the loop
   closes: implemented, rejected with a one-line reason, or parked by the user.
   Route by certainty: clear-cut → implement now; uncertain → bring in the
   architect; architect needs user input → pause and ask. Architect sign-off →
   implement.

## Guardrails

- **Pass budget: 20 review/fix passes.** Architect consultations and user
  pauses don't count — they're escalations, already bounded by their own
  ladder. Hitting the budget is not failure: stop, report state, hand back.
- **Three-strike survival rule.** An issue a reviewer re-raises after a fix
  pass has survived a strike. Strike 1: the next fix pass opens with a written
  diagnosis — misread finding, partial fix, or disagreement — no silent
  re-attempt. Strike 2: continue, flagged. Strike 3: pause the loop on that
  issue and bring the user in with the survival history.
- **Disagreement fast-path.** If the diagnosis is disagreement — the fixer
  thinks the finding is wrong — escalate to the architect immediately, not via
  strikes. Disagreement ping-pong "fixes" in opposite directions; the strike
  counter would measure stubbornness, not progress.
- **Phase-boundary gate.** At the self-review → PR-review boundary, ask the
  user: **fresh chat via /prism-handoff** (recommended default — cold context
  plus per-skill model-pin engagement; required on runtimes without per-skill
  model honoring, e.g. Cursor keys models to the chat and Codex has no
  skill-level pin) or **continue in-session** (offered when the runtime honors
  per-skill pins and the context signals are quiet — the user accepts that the
  reviewer inherits the conversation; model diversity is not cold eyes).
- **Thread-clean exit.** The PR-review phase never closes with
  fixed-but-unresolved threads outstanding. Resolution happens only on a
  reviewer re-pass — declaring the phase clean without that pass leaves stale
  unresolved threads on the merged PR.
- **Gauntlet state travels.** A mid-gauntlet handoff doc must carry the
  ladder's rules and live state — pass count, strike table, scoreboard, current
  phase — in a `## Gauntlet state` section. Once this skill ships the rules
  travel with it, but the live state exists nowhere else mid-run.

## Closing

Produce the scoreboard TLDR: a per-persona table of passes and what each found
or fixed, plus totals — review passes, fix passes, issues found/fixed by
severity, cleaner paths implemented/rejected/parked. The PR stays draft; tell
the user it is ready for human testing and review. Merging and flipping
ready-for-review remain the human's call (`.prism/rules/git-conventions.md`
§ Who merges).
