---
name: prism-implement
description: >
  Implements a feature, fix, or task on the current branch against its plan,
  then ships it (commit, push, draft PR). Reads the plan and the routed
  architect docs before editing and updates the plan afterward. Triggers:
  "Clove", implement, build this, fix this, ship it, add feature, write the
  code, make this work.
argument-hint: "[task description]"
---

<!-- AUTO-GENERATED FILE. DO NOT EDIT DIRECTLY. -->
<!-- Source: .ai-skills/skills/prism-implement -->
<!-- Target: cursor | Regenerate with: pnpm prism:build -->

Implements a feature, fix, or task on the current branch against its plan, then ships it. It does not plan architecture (the plan skill's lane), design UI (`prism-design`), or review its own work (`prism-self-review`). Task: $ARGUMENTS

<!-- atlas:domain-context -->
Populated during onboarding from the team's actual product domain.
<!-- atlas:end -->

## Startup

- **Resolve the plan** per `.prism/rules/branch-plan.md` § Plan Lookup, and create it when missing, since this skill writes into it. No implementation starts without one. Present every `open` entry in `## Debugged Issues` and `## Review Issues` before starting, and re-read the plan when the user says it changed, because a stale plan builds the wrong thing.
- **Read `## Decisions`** (each entry is a do-not-undo unless a Zoe verdict sub-bullet marks it archive-candidate) and `## Acceptance Criteria`. Flag any AC edited after the last `synced` row of the AC Sync Log, so it gets synced after the build.
- **Load the architect docs** that `.prism/architect/manifest.json` routes for the paths in the plan's tasks. A partial load builds against the wrong constraints.
- **Verify what the change depends on that this repo does not define**, such as a vendor API or a framework behavior, at its source before building on it.
- **On a bug ticket,** confirm the root cause against the code before fixing. Record the confirmed finding under `## Debugged Issues` in the format `.prism/rules/branch-plan.md` gives, and offer to post it to the tracker.

## Build

- **Stay in the local frame.** Refactor only what `.prism/rules/code-standards.md` § Refactor scope allows. Anything outside it goes to `## Cleanup Items`, or to a follow-up per `.prism/rules/followup-scope.md`.
- **Route gaps out instead of improvising.** A UI gap (a missing state, no spec for an interaction) goes to `prism-design`. A change to a public API or shared type, or a build that proves the plan wrong, goes back to the plan skill before you continue.
- **An AC that cannot be met as written** becomes `### AC Adjustment: <title>` under `## Acceptance Criteria > AC Adjustments`, with Original, Proposed, Reason, and Status `proposed`. Tell the user, and build the affected behavior only after they accept. Agents propose and humans decide, because a silently rewritten criterion moves the goalpost. Once accepted, sync the ticket's AC section and add a row to the AC Sync Log.

## Record in the plan

After the code is done, update the plan in one pass:

- Mark addressed issues `fixed` with a `Fixed in:` note, or `deferred` with a reason. Record each non-trivial PR-review finding under `## Review Issues` as `fixed`, because PR threads do not survive as plan evidence.
- Append one `## History` line, `YYYY-MM-DD [<branch>]: <what and why>`, of three sentences at most.
- Write each new `## Decisions` entry as a standing fact with its reason in the same sentence ("X is used because Y"), never "currently" or "recently". Later readers see it cold.

## Verify and ship

- **Pre-flight the AC** against the diff, following each criterion's Evidence sub-bullet. This is not the graded verdict. When `prism-qa-test-plan` runs AC verification, it renders MET or UNMET, and this skill never claims "AC-3 is MET". If an UNMET misreads the criterion, hand both readings to the plan skill, the criterion's owner. Never change code to satisfy a verdict the requirement does not back.
- **Run fresh** the type check, lint, and tests from `.prism/rules/verification-commands.md`. Run the formatter in check mode first and write only when its changes fall on lines you touched, since pre-existing drift swept into the commit is a formatting-only change.
- **Before every commit,** run the cleanup pass in `.prism/references/cleanup-pass.md`. Commit per `.prism/rules/git-conventions.md`: one commit per plan task on a multi-task plan, and review fixes as separate commits.
- **Ship without asking** (authors ship). First read `git config --global --get prism.pauseBeforeCommit`. `true` means state the commit subject and wait for "ship it". Unset means ask once and save the answer with `git config --global`. Then push, and open a draft PR with `gh pr create --draft`. If `gh pr list --head <branch>` already finds one, the push updates it and no new PR is created.
- **PR title and body.** The title is `PRISM-NNNN: <description>`, or `PRISM-NNNN followup: <description>` once the main PR has merged. The body uses `.github/pull_request_template.md` as its scaffold and adds Summary, What did you do?, Why did you do it?, How did you achieve it?, Screenshots (UI only), Notes, and Ticket ahead of its Type of Change and checklist. Check only the checklist items you can confirm, and leave UI items unchecked when nothing in the UI changed. The body carries reasoning the diff cannot show, so it never lists files or copies the AC. On every push that adds scope past the body, rewrite only the templated sections (Summary through Ticket, Type of Change, and the checklist) and keep every other section verbatim, Screenshots and Notes included. Skip the sync when the user said not to touch the body this session. Write it with `gh pr edit --body-file`, since `--body` hits a GraphQL deprecation error. Escape a bare `#N` in backticks, because GitHub autolinks it.
- **Offer e2e tests** when the plan has behavioral AC: Given/When/Then maps 1:1 to a test case. Only offer, never generate them unasked.
- **Close** with the outcome and the PR number, then propose `prism-self-review` in this session, or `review pr #<n>` in a fresh chat. Propose the handoff and never invoke it.

Before closing the session, append to `.prism/lessons.md` when you were corrected, found a codebase constraint no architect doc states, or an assumption proved wrong.

<!-- Optional Cursor-only additions. Keep this file empty when not needed. -->
