---
name: prism-plan
description: >
  The plan stage. Writes plan.md for an approved intent and spec, as ordered
  tasks with files, proofs, and dependencies, and runs the challenge rounds
  from prism-challenge, then auto-approves or asks. With no plan folder, writes
  the plan in chat only. Triggers: plan this out, build out the plan, write the
  plan.
argument-hint: "[plan folder path, or what you want to build]"
---

<!-- AUTO-GENERATED FILE. DO NOT EDIT DIRECTLY. -->
<!-- Source: .ai-skills/skills/prism-plan -->
<!-- Target: claude | Regenerate with: pnpm prism:build -->

You run the plan stage: you write `plan.md` for an approved intent and spec, as tasks with files and proofs, bundled for parallel builds, challenged, then approved. You run in the session, because the plan is built from an intent and spec the session already holds. You write no implementation code and never edit `intent.md` or `spec.md`. A change needed in either goes to `prism-architect`.

## Startup

The brief ($ARGUMENTS) names a plan folder, or the work to plan. Resolve the folder per the lookup in `branch-plan.md`. With none, a person planning something small gets the plan in chat in the same task shape, from the routed architect docs and the code. Write no file, run no challenge, and say a plan in chat can't be built from until it goes through the chain. A branch with a legacy flat plan keeps that plan's own shape, including its close. In a folder, read in full:

- `intent.md`. It must say `status: approved`, or stop and say the intent needs approval first. An epic child's folder holds none: its spec's `epic:` line names the epic folder, and the epic's `intent.md` is the one that must be approved.
- `design.md`, when present. When it says `approval: required`, it must also be approved.
- `spec.md`. When it is missing, stop and say the spec stage runs first. Its Affected systems globs bound every file a task may list.
- An existing `plan.md`. Its `## Decisions` entries are do-not-undo, as far as any Zoe verdict on them allows.

Match each Affected systems path against `.prism/architect/manifest.json` and read every routed doc in full.

## Write the plan

Start from `.prism/templates/plan.md`, at `status: draft`. You own `## Tasks` and `## Decisions`. `## Challenge` belongs to the challenger, so never edit it.

- Each task meets the bar in `.prism/rules/implementation-task-detail.md`, and every acceptance criterion in the intent is covered by at least one task's proof.
- For an epic child, write `## Acceptance Criteria` in `plan.md`, derived from its `## Children` row and its spec, each with an ID and an Evidence line, as an intent's criteria carry them. The review reads them there, and the coverage check above reads these in place of the intent's.
- Write proofs test-first, per `tdd`. A bug's failing test is its own earlier task.
- Each `files` entry is one repo path with forward slashes, because the parser rejects a backslash, a glob character, a space, and a trailing slash. Each sits inside an Affected systems glob and belongs to one task.
- Docs are their own task when the plan changes user-facing behavior, a public contract, or an architect-owned area.
- IDs are permanent: append new tasks and never renumber. A commit subject naming a task marks it done.
- Record each non-obvious call in `## Decisions`: a bold title, the reason in one line, and one clause on why a rejected alternative lost. A plan folder holds no section-sign citations and no `see Decision:` citations, so name a file by its path and a ticket by its ID.

## Group and challenge

Run `node scripts/ai-skills/hooks/plan/bundles.mjs <plan.md>`. Fix every duplicate claim, cycle, and task the parser rejects, rerun until it exits 0, and record the groups it prints above the first task.

Dispatch `prism-challenge` in a fresh context with the folder and the round number and nothing else, because its value is a cold read. It appends one line under `## Challenge`. The round limits are in the workflow rule.

- Fix every blocking finding before the next round, and a non-blocking one when the fix is cheap or else record why not in `## Decisions`. Commit each round as `plan: challenge round <n>`.
- Rounds 1 and 2 always run. Round 3 follows a blocking round 2, and the confirm round follows a blocking round 3. Fix a carried finding when you can, or record it in `## Decisions` as an open question with a default.
- A major finding goes to `prism-architect` as a subagent with the folder and the finding. Ask the person only when its verdict confirms the change is intent-level.

## Approve

Run `node scripts/ai-skills/hooks/plan/auto-approve.mjs <folder>`. Never write the approval lines yourself.

- Exit 0 means it wrote the approval.
- Exit 1 lists the failed conditions. Land every pending edit, then ask the person once, naming them, because an edit after their `approve` voids it. Only after a fresh `approve`, run `node scripts/ai-skills/hooks/plan/approve.mjs <plan.md>` as its own command.
- Exit 2 is a config error. Report it and stop, per the workflow rule.

## Re-plan and hand off

On `needs-replan`, append tasks and never renumber, and mark each changed task `amended:`. Rerun `bundles.mjs`, run one challenge round and its confirm round, then `auto-approve.mjs <folder> --check`. A second `needs-replan` on one task asks the person, because a task that fails to plan twice has a gap the plan can't see.

Commit `plan.md` after the challenge rounds and again after approval, with `node scripts/ai-skills/hooks/plan/commit.mjs "plan: <summary>" <plan.md>`. Then start the next stage from the resume table in the workflow rule, with no further prompt.

## Done when

`plan.md` covers every criterion with tasks that sit inside Affected systems, `bundles.mjs` exits 0, `## Challenge` ends on a round that is not `blocking`, the plan is approved by the script or by the person after one ask, and it is committed.

<!-- Optional Claude-only additions. Keep this file empty when not needed. -->
