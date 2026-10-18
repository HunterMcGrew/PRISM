---
name: prism-retro
description: >
  Runs the retro charter on a plan, comparing what it said would happen with
  the execution record (merged diffs, PR threads, CI) at a light per-ticket
  grain or a full epic grain, and writes a report to `.prism/retros/`.
  Read-only on the plan. Triggers: "Iris", retrospective, post-mortem, retro
  this epic, plan close, per-PR retro.
argument-hint: "[retro <epic-slug> | retro <from>..<to> | retro <ticket-id>]"
category: retrospective
---

<!-- AUTO-GENERATED FILE. DO NOT EDIT DIRECTLY. -->
<!-- Source: .ai-skills/skills/prism-retro -->
<!-- Target: claude | Regenerate with: pnpm prism:build -->

Runs the retro charter on a plan: what the plan said would happen against what the execution record shows happened. It writes one report to `.prism/retros/` and never edits the plan. Target: $ARGUMENTS

## Startup

- **Resolve the target** to a plan (per `.prism/rules/branch-plan.md` § Plan Lookup, or `epic-<id>.md`) or a date range (`YYYY-MM-DD..YYYY-MM-DD`, every plan with a `## History` line in it). With neither named and no plan matching the branch, ask, and confirm the target before reading anything.
- **Pick the grain.** `per-pr` is one ticket and runs at every plan close. `epic` covers the epic plan and its children. The plan-close ceremony in `branch-plan.md` § Before Closing passes the grain, and an epic plan defaults to `epic`.
- **Read `.ai-skills/config.json#retroEvidence`.** It declares which execution-record sources this team has (CI system, PR platform, test command, coverage gates). A source marked absent is `not configured for this team`. A configured source that fails this run, such as `gh auth status` failing, is `unreachable this run`. Git is always available. With no `retroEvidence` block, every source but git is not configured.

## Charter

Answer each question from whichever source can. Plan sections hold intent. The execution record (merged diffs, PR threads, CI conclusions) holds outcome.

1. Did we do what we said? (`## Decisions` and `## Acceptance Criteria` against what shipped)
2. Were there issues or bottlenecks?
3. What improvements could we make?
4. Did we follow the code standards?
5. Did we do anything wrong, or could we have done better?
6. Are the tests passing? (what CI shows: red cycles, late catches, cost)

An item no reached source can answer is reported unanswered, never filled in. A retro that reached few sources says so and qualifies every conclusion, because absence of evidence is not absence of drift. Never write an unqualified "no divergences" while any item is unanswered. When more than half the items are unanswerable, say so before drafting ("3 of 6 unanswered: <gaps>") and offer to continue with qualified conclusions or stop while the user configures the missing sources.

## Evidence

- **Plan sections:** `## History`, `## Decisions` with sub-bullets and verdicts, `## Acceptance Criteria`, `## Debugged Issues`, and `## Review Issues`.
- **Merged diffs:** resolve merge commits from the branch names and PR references in `## History`, with `git log --grep=<ticket-id>` or `gh pr view <n> --json mergeCommit,files`.
- **PR threads on GitHub:** read all three surfaces and merge them, because none alone is complete. Issue comments (`gh api repos/{owner}/{repo}/issues/{n}/comments --paginate`) are where the PR reviewer posts findings, since it files no review object. Then read review objects with their line comments, and the check-run rollup. Empty reviews beside non-empty issue comments is answerable, not a gap.
- **CI conclusions,** only when a CI system is configured: pass and fail history, not logs.
- **AC-verification report:** when `## History` points at `.prism/qa/ac-verification-<ticket-id>.md`, ingest its verdict table for item 1 instead of re-deriving the answer from the diff.
- **Per-PR scope** reads only that ticket's plan, merged diff, own CI, and PR thread. **Epic scope** also ingests the per-PR notes under `.prism/retros/<epic-slug>/` so it spends its effort on cross-ticket patterns.

## Divergences

A Decision is refuted only when a Debugged Issue, review finding, CI pattern, or UNMET or UNGRADEABLE(`converted`) verdict directly contradicts its stated rationale: the Decision said "X was chosen because it avoids Y" and the evidence shows X caused Y. An adjacent bug is not a refutation, so log it under Citations. When the causal link is not stated in the evidence, quote both entries and ask the user. At epic grain, also flag AC items with no shipped change and CI red cycles on an area a Decision called low-risk.

## Report

Write once to a temp path and rename it, creating `.prism/retros/` on first use. Never edit the source plan: the plan-close ceremony consumes this report, and keeping the reflector separate from the closer is deliberate.

- **Epic grain:** `.prism/retros/<epic-slug>/<YYYY-MM-DD>-<epic-slug>.md` without the `epic-` prefix. A date range goes to `.prism/retros/<YYYY-MM-DD>-<from>..<to>.md`.
- **Per-PR grain:** a compact note at `.prism/retros/<epic-slug>/<ticket-id>.md`, or `.prism/retros/per-pr/<ticket-id>.md` for a ticket with no parent epic. It holds the header, charter coverage, any fidelity gap, and Promotion cautions only when there are any.

Sections, in order: header (target, grain, date), Summary, Charter coverage (one row per item with its answer, sources, and gap, where `not configured` stays distinct from `unreachable`; at epic grain it also names that the final child's main-branch CI is approximated by its PR CI, since earlier children have fully merged), Findings, Action Items, Promotion cautions, Lesson candidates (epic only), and Citations split into plan evidence, execution record, and per-ticket notes.

- **Findings** follow the charter. Each cites the plan section or execution-record entry it comes from and names a persona or skill only when that entry does. Never invent a perspective the evidence does not contain.
- **Action Items** carry a proposed owner. Every divergence yields one, or an explicit "observation only". Epic retros produce about 3 to 8, per-PR notes at most 2.
- **Promotion cautions** list each Decision the execution record refuted, with the evidence, at both grains. The close ceremony promotes such a Decision as corrected or demotes it to a lesson, never unchanged.
- **Lesson candidates** are proposed for `.prism/lessons.md`, never appended.

## Close

Offer to file the action items as follow-ups with `prism-start-ticket`, which runs the scope-fit gate in `.prism/rules/followup-scope.md` on each. Propose it and never invoke it. If the user declines, confirm the report path and stop.

Before closing the session, append to `.prism/lessons.md` when a divergence pattern fit no heuristic here, or a source read as reachable and was not.

<!-- Optional Claude-only additions. Keep this file empty when not needed. -->
