---
name: prism-start-ticket
description: >
  Prepares a ticket for work: fetches or creates it in the session's tracker,
  checks it against the Definition of Ready, creates the branch, and updates
  the description and acceptance criteria. Works with whatever tracker the
  session has. Triggers: "Nora", start PRISM-####, pick up this ticket, create
  a ticket, file a bug, open a ticket.
argument-hint: "[PRISM-####]"
compatibility: Needs a local git environment. Uses the session's ticket tracker (a tracker MCP or gh issue) when one is available. Supported in Claude Code CLI and VS Code extension. Not supported on Claude.ai web.
---

<!-- AUTO-GENERATED FILE. DO NOT EDIT DIRECTLY. -->
<!-- Source: .ai-skills/skills/prism-start-ticket -->
<!-- Target: claude | Regenerate with: pnpm prism:build -->

Prepares a ticket for work: fetches or creates it in the session's tracker, checks it is ready, creates the branch, and summarizes the requirements. It writes no code, plan, or stories, so those go to `prism-implement`, `prism-plan`, or `prism-user-stories`. Task: $ARGUMENTS

## Startup

- **Use the tracker the session has** (a tracker MCP, `gh issue`, or none). With none, ask for the ticket ID, branch name, and a one-line goal, and run the rest of the flow from the Definition of Ready on what they give you.
- **Get the ticket** from `$ARGUMENTS` (`PRISM-NNNN`) or ask. Read its labels, description, comments, estimate, assignee, and linked PR. To create one instead, see Creating a ticket.
- **Detect the type** from the label: `bug`, `feature`, `improvement`, or `DX` (work QA cannot observe, such as docs, CI, or tooling). Ask when no label matches. The type picks the next skill, so a guess from the description sends work down the wrong path.

## Definition of Ready

A ticket is ready when the next skill can start without questions. Name every gap and offer to fill it. Never rubber-stamp, and never block silently.

- **Problem, not solution.** Restate a prescribed solution ("add a dropdown") as the problem. If the user insists, record "framed as solution per user request" and move on.
- **Bounded scope.** In and out are explicit. For each vague word ("improve", "fast", "appropriate", "etc.", "handle errors gracefully"), ask the question that pins it down.
- **Criteria and blockers.** Acceptance criteria exist or can be derived (a DX ticket's are always "None for this ticket."), and no blocker or dependency is open. Flag blocked-by and blocking tickets, since a blocking ticket's priority rises.
- **Estimate set before the branch exists:** 1 for one file, 2 for two or three files in one system, 3 for several files or a shared component, 5 for multiple systems, and 8 means consider splitting. Default to 1, and take the user's number without pushback.
- **Priority, when unset,** follows reach × severity × frequency plus business cost. Cite the reasoning ("High: every site, manual workaround"). Accept the user's override without re-arguing.
- **Description.** Whenever you write one, keep every section heading of the type's template and put "Not Applicable" under any that does not apply, so a later skill never meets a missing section.

## Bug tickets

Check the root cause before anyone plans a fix. When the description is sparse, offer to scaffold it from `.prism/templates/bug-report.md`: fill each section from the ticket and comments, try to reproduce, and mark the root cause verified or suspected. Weigh blast radius (sites, pages, users, shared code path, regression risk) before priority, because a cosmetic bug on every page can outrank a crash in one edge case. Without repro steps, defer the priority and name who must supply them. Derive AC from the repro steps and expected behavior, including edge cases the fix could touch, and sync it to the ticket. Then hand off to `prism-implement` to confirm the root cause and fix it.

## Creating a ticket

For "I found a bug" or "file a ticket": get the type, collect its required fields (bug: the bug-report template; feature: objective, scope, user-facing behavior; improvement or DX: current behavior, change, rationale), and recommend status placement: Triage when information is missing, Backlog, Todo, or the current cycle. Add the priority, estimate, and type label. Create it, show ID, URL, priority, estimate, and status, then stop. Branch setup starts only when the user says to start.

**Follow-up work** first takes the vehicle choice in `.prism/rules/followup-scope.md`: fold into the active PR, open a follow-up PR, or file a ticket. File only when scope genuinely splits and the proposal passes that rule's scope-fit gate. If it fails, name the failed criterion and ask the user to narrow it. On an override, add `> Scope-fit gate overridden by user` to the description.

## Branch

- **Ask "Ready to start work on this?"** before touching anything local, and list what is still open.
- **Stop on a dirty tree.** Show it and ask whether to stash, commit, or discard.
- **Create the branch** from the ticket's `branchName`, or per `.prism/rules/git-conventions.md` § Branch Naming. Run `git fetch origin`. If `origin/<branch>` exists, switch to it and pull. Otherwise run `git switch -c <branch> origin/main`, never from the current branch, which carries unrelated commits.
- **Assign** an unassigned ticket to the authenticated user. Ask before taking one assigned to someone else.
- **Re-check the branch** before handing off. A wrong or dirty branch carries into every later skill.

## Tracker writes

Show every write to the tracker in full and wait for a yes: create, status, labels, links, duplicate close, comments, assignment, and description, estimate, or AC updates. Reads need no confirmation, and a recommendation the user already confirmed (estimate, priority) counts for its field. Print the proposed change with the ticket, field, before, and after, then ask `Confirm? (yes / no / modify)`. `modify` adjusts the value without restarting, and `no` leaves nothing half-written. The tracker is shared state, and a wrong status, label, or duplicate close misroutes someone else's queue. If the user says to skip confirmations for the session, log each write in chat as you make it.

**Sync AC to the ticket** on request or after generating it. Strip the `**AC-N**` ids and Evidence sub-bullets from the plan's `## Acceptance Criteria`, because the ticket's copy is for stakeholders. Replace the ticket's `## Acceptance Criteria` section or append it at the bottom, and add a row to the plan's AC Sync Log: `| YYYY-MM-DD | Nora | Synced AC | updated | synced |`.

## Summary and handoff

Report the objective (problem or outcome), scope (in and out), complexity signals (shared component, cross-boundary change, novel pattern, wide blast radius), dependencies, and open readiness gaps. Then propose the next skill by type and never invoke it: a bug goes to `prism-implement`. A feature goes to `prism-user-stories` when requirements are thin, to `prism-design` when it has UI and no mock, and otherwise to `prism-plan`. An improvement or DX ticket goes to `prism-plan`. Name open gaps in the handoff so the next skill is not surprised.

<!-- atlas:domain-context -->
Populated during onboarding from the team's actual product domain.
<!-- atlas:end -->

Before closing the session, append to `.prism/lessons.md` when a tracker call returned something unexpected, a git state was not covered here, or a ticket's quality problem should have been caught earlier.

<!-- Optional Claude-only additions. Keep this file empty when not needed. -->
