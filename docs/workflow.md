---
title: "The PRISM Workflow"
description: "How work moves from intent to merged PR in PRISM: the plan folder, its stages, and where you step in."
category: "workflow"
audience: "developer-user"
last_updated: "2026-11-28"
---

# The PRISM Workflow

A ticket runs through a plan folder at `.prism/plans/<ticket>/`. You approve the intent and read the PR. Everything between those two touches runs on its own, with each stage writing its output into the folder so the next stage picks it up.

The enforceable spec for every stage, cap, and stop is [`.prism/rules/workflow.md`](../.prism/rules/workflow.md). This page is the onboarding narrative.

## Your two touches

1. **Approve `intent.md`.** Say `approve` in chat, or run the approval script in a terminal (`node .claude/hooks/plan/approve.mjs <path to the file>`) and press `y`. The intent sets the run's goal, so once you approve it the stages after it start without asking again.
2. **Read the draft PR, flip it ready, and merge.** The run ends with a reviewed draft PR. CI ran on its last push, and any failure is fixed or listed on the PR. Merging stays a human step unless your repo sets `features.mainSessionMayMerge: true` in `.ai-skills/config.json`, which lets the main session merge once the final review comes back clean.

A few things add a touch:

- A design the intent marks as needing your approval.
- A plan that fails automatic approval.
- A change that would alter the approved intent, such as a different acceptance criterion, or a plan-challenge finding the architect confirms is intent-level.
- A stage that stays `blocked` after its re-dispatches, or a second re-plan of the same task.
- A review that would touch a file outside the plan, add a dependency, change a shared type or public API, or need destructive git.

Anything else a stage can't settle lands on the draft PR as a comment and in the closing summary, so you can still veto it there.

## The stages

1. **Intent** (Mira, `prism-intent`) interviews you one question at a time and writes `intent.md`: the problem, the proposed outcome, and the acceptance criteria.
2. **Design**, when the intent says it's needed (Pixel, `prism-design`), writes `design.md`.
3. **Spec** (`prism-spec`, a subagent) reads the intent and the code and writes `spec.md`: requirements, design, and the systems the work may touch.
4. **Plan** (`prism-plan`) writes `plan.md`: ordered tasks, each with its files and a proof.
5. **Two challenge rounds** (`prism-challenge`, subagents) try to break the plan before any code exists. The plan then auto-approves or asks you.
6. **Implement** (Clove, `prism-implement`) builds the code tasks, and **docs** (Eli, `prism-docs`) writes the docs tasks.
7. **Verify** (`prism-verify`, a subagent) runs every automated check the repo configures and records the results in `plan.md`.
8. **Self-review** (Briar, `prism-self-review`) reviews the branch against `REVIEW.md` and grades the acceptance criteria.
9. **Draft PR** opens from the branch.
10. **PR review** (Eric, `prism-pr-review`, a subagent) posts inline comments and a summary on the PR. Eric never approves or merges.
11. **Retro** (Iris, `prism-retro`) compares the plan against what shipped, records a verdict on each decision, and closes the plan.

Stages commit their own work. The session pushes and opens the PR for them.

## Sizes

A ticket runs one of three sizes: small, standard, or epic. Standard is the default: one plan folder, the stages above, shipped as one PR or a stack of dependent PRs. A small ticket is code-only work that fits `size.mjs`'s limits, at most 100 added lines of product code and one new product file, all in one area, with no change to a dependency manifest or another stop path. It skips the spec, plan, and challenge stages: approving its intent writes a `plan.md` with no tasks, and the session builds it, then verify, review, the PR, and the retro run as usual. If the work outgrows the limits, it goes on as a standard ticket after you approve the intent again. An epic is work split into several parts under one tracker parent. Its folder holds `intent.md` and `spec.md`, and each child gets its own folder that runs the standard stages from its spec onward. The intent proposes the size, and your approval of the intent confirms it.

## Picking up where a session left off

A fresh session reads the plan folder and runs the first stage whose output is missing. No handoff note is needed, because the folder holds the state. The table that maps folder state to the next stage is in [`.prism/rules/workflow.md`](../.prism/rules/workflow.md).

## Asking for help along the way

These personas work outside the stage chain, and you can call them at any point.

| Persona                         | Call when                                                                  |
| ------------------------------- | -------------------------------------------------------------------------- |
| **Winston** (`prism-architect`) | You have an approach question at any time. No plan folder is needed.       |
| **Sasha** (`prism-debug`)       | A bug's cause is unknown. Her report becomes the intent's Problem section. |
| **Nora** (`prism-start-ticket`) | You need a ticket set up and a branch created                              |
| **Parker** (`prism-prd`)        | You need a PRD at initiative grain                                         |
| **Reese** (`prism-qa-plan`)     | You need a QA checklist                                                    |
| **Sage** (`prism-changelog`)    | You need a changelog between releases                                      |
| **Lilac** (`prism-standup`)     | You need a standup summary                                                 |
| **Zoe** (`prism-audit`)         | You want a cadence audit of stale decisions and open plans                 |

See [personas.md](./personas.md) for what each persona owns, what it needs, and what it hands off.

## Flat plans still work

An existing `.prism/plans/<ticket>.md` keeps resolving and keeps its own shape. Nothing is migrated.

---

## Why rules load when they do

The tier system is built so rules load at the right scope rather than all at once — a rule about WordPress blocks doesn't load when you're working on a TypeScript utility. See [SPEC.md](../.prism/SPEC.md) for the full tier breakdown and the [ADR for the three-tier rule loading model](../.prism/spec/adrs/_toolkit/0035-rule-loading-tiers.md).

---

## Going deeper

The behavioral norms behind this workflow — why authors ship and reviewers don't, why plans are never deleted, why cross-agent handoffs require verification — are documented in the ADRs under [`.prism/spec/adrs/`](../.prism/spec/adrs/). The stage definitions, caps, and resume table are in [`.prism/rules/workflow.md`](../.prism/rules/workflow.md). The tier system, promotion pathways, and spec ownership model are in [`.prism/SPEC.md`](../.prism/SPEC.md).
