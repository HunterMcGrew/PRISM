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
<!-- Target: cursor | Regenerate with: pnpm prism:build -->

Orchestrate the full review gauntlet on the target PR. This skill sequences
existing personas — it never reviews, fixes, or writes findings itself, and the
personas keep their own plan hygiene (Review Issues entries, History appends)
exactly as if invoked by hand.

**The run, in order:** opening orientation → self-review loop (findings → fixes
→ re-review until clean) → phase-boundary gate → PR-review loop (findings →
fixes → re-review until clean, threads resolved) → cleaner-path routing →
closing re-orientation → scoreboard TLDR.

## Opening Orientation Battery

Run the Opening Orientation Battery per [session-orientation.md](../../../.prism/rules/session-orientation.md)
once, immediately before the first loop pass, so the scope and intent are clear
before starting.

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
   Route using **Procedure C** below.

## Guardrails

- **Pass budget: 20 review/fix passes.** Before every pass, run **Procedure B**.
  Architect consultations and user pauses don't count — they're escalations,
  already bounded by their own ladder. Budget exhaustion triggers **Procedure D** —
  stop, report state, hand back.
- **Three-strike survival rule.** An issue a reviewer re-raises after a fix
  pass has survived a strike. Strike 1: run **Procedure A**. Strike 2:
  continue, marked in the scoreboard. Strike 3: trigger **Procedure E** —
  pause the loop on that issue and bring the user in with the full survival
  history.
  When the reviewer and fixer run the same model, their strike votes are
  correlated — a blind spot one misses, the other likely misses too — so the
  mandatory one-sentence diagnosis (Procedure A) is the arbiter of whether a
  re-raise is real progress, not the strike count alone. Honor a configured
  Eric `overrides` entry (`.ai-skills/config.json` `modelTiers.overrides.eric`)
  when present — a cross-model reviewer restores the independent second opinion.
- **Disagreement fast-path.** If the strike-1 diagnosis names disagreement —
  the fixer believes the finding is wrong — skip the strike counter and trigger
  **Procedure F** immediately. Disagreement ping-pong would measure
  stubbornness, not progress.
- **Phase-boundary gate.** At the self-review → PR-review boundary, trigger
  **Procedure G**.
- **Thread-clean exit.** The PR-review phase never closes with
  fixed-but-unresolved threads outstanding. If any remain, run a final reviewer
  pass; if after that pass unresolved threads persist, trigger **Procedure H**.
- **Gauntlet state travels.** A mid-gauntlet handoff doc carries the ladder's
  rules and live state — pass count, strike table, scoreboard, current phase —
  in a `## Gauntlet state` section.

## Procedures

**Procedure A — Start a fix pass after a strike.** Before writing any code:
write a one-sentence diagnosis naming the failure mode (misread finding, partial
fix, or disagreement). If the diagnosis names disagreement → skip to Procedure F
immediately. If it names misread or partial fix → continue with the fix. Record
the diagnosis and the strike count in the scoreboard.

**Procedure B — Budget check.** Before every loop pass, count passes taken so
far. If the count reaches 20: stop all loops, write the scoreboard TLDR with
current state (pass count, open findings by severity, strike table, cleaner-path
states), and hand back to the user. **Escape:** emit `blocked` — name the pass
count, the open issues that remain, and the most promising next step.

**Procedure C — Route a cleaner path.** Read the finding. Ask: can the correct
fix be determined from the diff and the existing codebase alone?

- **Yes (clear-cut):** implement now.
- **No (uncertain about the right approach):** invoke the architect persona
  inline; provide the finding plus the relevant diff context. Wait for the
  architect's recommendation; if it resolves the uncertainty, implement.
- **Architect says it needs user input:** pause the loop. Present the finding,
  the architect's analysis, and the specific question to the user. Wait for an
  answer before continuing. **Escape:** if the question cannot be resolved
  without information only a human holds, emit `needs-human` — name the finding,
  the architect's analysis, and the exact question that blocks progress.

**Procedure D — Budget exhausted.** Stop all loops. Produce the scoreboard
TLDR: per-persona table of passes (what each found or fixed), totals (review
passes, fix passes, issues found/fixed by severity, cleaner paths implemented /
rejected / parked). State that the budget is exhausted and list what remains
open. The PR stays draft. Hand back to the user with the scoreboard. **Escape:**
emit `blocked` — name the budget limit, the remaining open findings, and the
most promising continuation path.

**Procedure E — Third strike on a single issue.** Stop all loop passes on that
issue. Collect the full survival history: the finding as originally stated, each
fix attempt and what it changed, each re-raise and what the reviewer said.
Present this to the user with a clear question: accept the finding as-is, reject
it with a written reason, or provide direction for a new approach. Do not
continue the loop on this issue until the user responds. **Escape:** emit
`needs-human` — name the issue, the three strike attempts, and the specific
decision the user must make.

**Procedure F — Disagreement fast-path.** Invoke the architect persona inline;
provide the original finding, the fixer's counter-argument, and the relevant
diff. The architect returns a verdict: finding is correct (implement the fix),
finding is incorrect (close with a written reason), or it needs user input (emit
`needs-human` — name the finding, both positions, and the architect's
assessment). Do not run more fix passes on this issue until the verdict is in.

**Procedure G — Phase-boundary gate.** Before invoking the PR-review persona,
present a single choice:

- **Fresh chat via /prism-handoff** — recommended default; cold context, plus
  per-skill model-pin engagement. Required on runtimes without per-skill model
  honoring (e.g. Cursor, Codex).
- **Continue in-session** — offered when the runtime honors per-skill pins and
  context signals are quiet; the reviewer inherits the conversation.

Wait for the user's choice. If no response is available (orchestrated run):
default to fresh chat and note the assumption in the scoreboard. **Escape:** if
the runtime cannot be determined, emit `needs-human` — name the ambiguity and
the default being used.

**Procedure H — Thread-clean exit blocked.** If a final reviewer pass still
leaves unresolved threads, stop the PR-review phase. List the unresolved
threads, the findings they covered, and the fix commits that addressed them.
Present to the user: they can resolve threads manually in GitHub, or request
another reviewer pass. Do not declare the phase clean. **Escape:** emit
`needs-human` — name each unresolved thread and the action required to close it.

## Closing

Produce the scoreboard TLDR: a per-persona table of passes and what each found
or fixed, plus totals — review passes, fix passes, issues found/fixed by
severity, cleaner paths implemented/rejected/parked. The PR stays draft; tell
the user it is ready for human testing and review. Merging and flipping
ready-for-review remain the human's call (`.prism/rules/git-conventions.md`
§ Who merges).

## Closing Re-Orientation Battery

Run the Closing Re-Orientation Battery per [session-orientation.md](../../../.prism/rules/session-orientation.md)
once, immediately before producing the scoreboard TLDR, so scope and
verification are confirmed before closing.

Gauntlet-specific framing:

- **Scope boundary** — what passes did I run; is any of it outside what was
  named? What did I notice in adjacent code and leave alone? Emit
  `found-followup-work` or `found-bug` per `.prism/rules/followup-scope.md`
  § worker-emit pre-filter for anything left alone that warranted it.
- **Unasked assumptions** — name each silent decision (e.g. runtime chosen for
  Procedure G, cleaner paths parked vs rejected).
- **Edge recall** — what boundary inputs (zero findings on first pass, budget
  hit on pass 1, all cleaner paths rejected) did this run hit, and did I
  handle each on purpose?
- **Verification honesty** — for each phase I claim is clean, what is the
  evidence (a zero-findings reviewer pass, a resolved-thread count)? Where am
  I asserting without proof?
