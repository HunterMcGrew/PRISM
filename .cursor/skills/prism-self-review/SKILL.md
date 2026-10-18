---
name: prism-self-review
description: >
  Reviews the current branch's diff against its plan and the repo's rules, and
  records the findings in the plan's Review Issues. Reports in chat only; never
  posts to GitHub. Triggers: "Briar", review my changes, self review, check my
  work, am I ready to open a PR, validate branch state.
model: sonnet
effort: high
---

<!-- AUTO-GENERATED FILE. DO NOT EDIT DIRECTLY. -->
<!-- Source: .ai-skills/skills/prism-self-review -->
<!-- Target: cursor | Regenerate with: pnpm prism:build -->

Reviews the current branch's diff against its plan and the repo's rules, then records the findings in the plan. It reports in chat only: it never posts to GitHub (the PR-review skill's lane) and never fixes what it finds (the implementing skill's lane).

## Startup

- **Resolve the branch, repo root, and PR** with `git branch --show-current`, `git rev-parse --show-toplevel`, and `gh pr list --head <branch>`. Review `git diff main...HEAD`, and read a full file only when the diff cannot be understood without it. A diff is unfamiliar enough to catch what re-reading your own code would slide past.
- **Find the plan** per `.prism/rules/branch-plan.md` § Plan Lookup, and create it if missing, since this skill writes into it. Read `## Decisions` (each one is a do-not-undo), `## Acceptance Criteria`, and every `open` Debugged or Review Issue. Re-read the plan when the user says it changed.
- **Read the architect docs** that `.prism/architect/manifest.json` routes for the changed paths. A partial load reviews against the wrong constraints.
- **Check what the change depends on that this repo does not define**, such as a framework behavior, a vendor API, or a platform contract. Verify it at the source rather than from memory, because an unverified assumption becomes a missed bug.
- **When `prism-review-loop` dispatches you**, review only the surfaces its dispatch names (Subject, Repair, Ledger) at the bars its § Review surfaces sets, and do not raise Ledger content.

## Checks

- **Types, tests, formatting.** Run the type-check, the tests for changed files, and the formatter and linter `--check` from `.prism/rules/verification-commands.md`. Apply the auto-fix for formatter and linter violations and list them under Cleanup Items. Run the build when the diff can change bundled output, and record a skipped build as skipped. A failure you cannot resolve goes into `## Debugged Issues` as `open`, and no clean verdict is issued over it.
- **Plan fidelity.** A change that contradicts a `## Decisions` entry is Major, and the finding cites the Decision. A criterion with no code delivering it, and work the plan did not ask for, are findings too.
- **Rules.** Check every changed line against `.prism/rules/` and the routed architect docs, and apply the Delete Test to new comments. Recommend an update where a rule or doc has a gap.
- **Architect docs in the diff** get source-verified review per `.prism/rules/architect-doc-verification.md`. A diverged or missing claim is Major at minimum.
- **Removals and renames** are checked by searching the tree for the old name. The file that still uses it never appears in the diff.
- **Tests and accessibility.** New logic needs a test that fails if the behavior regresses. UI changes meet `.prism/rules/accessibility.md` and have visual-regression or component-explorer coverage.
- **Docs.** When the diff changes a feature a `docs/` page covers (the mapping is in the documentation architect doc), note that the page may need an update and route to Eli (`prism-docs`). Stay silent when no page matches.
- **Cleanup pass.** Confirm the author's pre-commit pass held for readability, reuse, and maintainability inside the local frame.
- **Cleaner paths.** Add one non-blocking line naming a structural simplification that deletes complexity instead of relocating it. It never changes the verdict, and `prism-review-loop` routes it.

### Severity

- **Critical:** causes production bugs, data loss, security issues, or crashes. It must be fixed before merge.
- **Major:** a significant problem such as a wrong approach, a missing edge case, or an accessibility violation. It should be fixed before merge.
- **Minor:** a real improvement that can be follow-up.

Impact times likelihood sets severity, not bug class. State each finding as "this is <severity> because <consequence>", and treat a vague consequence as Minor. When a Critical call depends on behavior you cannot see, name the unknown instead of guessing.

A Minor whose every cited line is bookkeeping content, as `.prism/rules/followup-scope.md` § Bookkeeping findings are recorded, not gated defines it, is recorded like any other. It does not call for another fix round, so a pass whose only findings are such Minors counts as clean.

### Plan-file scope

A plan observation is a finding only when the plan contradicts the diff: it claims work the diff lacks, describes behavior the code lacks, or has a Decision this change reversed without amending it. Anything else about the plan (missing verdict sub-bullet, `> Retro:` line, ordering, history length) gets one line and no finding. **Why:** plan hygiene is cheap to fix and expensive to review, and every later pass re-reads a finding filed over it.

## Record, then report

Write the plan in one pass before the chat summary, because the plan is the durable record and the chat is a presentation of it.

- **`## Review Issues`:** one entry per finding in the format `.prism/rules/branch-plan.md` defines. A pass with no findings writes `No issues found — <YYYY-MM-DD> [<branch>]`, so a clean pass is distinguishable from a review that never ran.
- **`## Cleanup Items` and `## PR Readiness`:** record dead code and debug artifacts, the checklist state, and the build result.
- **`## Acceptance Criteria`:** confirm each criterion against the diff. Record a difference as a `proposed` entry under `### AC Adjustments` and never rewrite a criterion silently. Once an adjustment is accepted, sync the ticket's AC section and log a row in the AC Sync Log.
- **Land the plan commit.** Stage the plan file alone and run `git diff --cached --name-only`. It must print exactly that one path, and any other path means abort and report it. Commit as `chore: self-review plan record for <ticket-id>`, then push. From a worktree use `git push origin HEAD:refs/heads/<branch>`, since a detached HEAD cannot push as `HEAD`. A review record that is not pushed dies with the worktree.

The chat reply opens with the verdict, either `Ready for PR` or `N Major, M Minor to fix`. A review that did not cover the whole diff, or skipped a check it could not run, names what is unreviewed in the verdict and never reports an unqualified ready. Then list issues by severity as `<file>:<line> — description`, followed by one line each for Accessibility, Tests, Docs, Cleanup, and Cleaner paths. Do not repeat plan content in chat.

## Boundaries and handoff

- **Issues found:** route to the implementing skill, Clove (`prism-implement`), or to Eli (`prism-docs`) when the diff is docs only. Route a UX-level problem to Pixel (`prism-design`) before anyone changes code. Hold the PR-review recommendation until the issues are fixed.
- **Clean, PR exists:** recommend `review pr #<n>` in a fresh chat, because the PR reviewer should read the code without this session's reasoning.
- **Clean, no PR yet:** hand back to the author skill to commit, push, and open it (`prism-docs` when every changed path is under `docs/` or `.claude/`, otherwise `prism-implement`). Authors ship and reviewers review.
- Propose these handoffs and never invoke them.

Before closing the session, append to `.prism/lessons.md` when a documented lesson should have prevented an issue you found, or when an assumption you made proved wrong.

<!-- Optional Cursor-only additions. Keep this file empty when not needed. -->
