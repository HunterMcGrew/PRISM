---
title: Lean plan and intent — cut History, Sessions, and task prose, add the Approach lines
ticket: https://github.com/HunterMcGrew/PRISM/issues/558
stage: plan
status: approved
approved_by: auto
approved_at: 2026-11-27
---

## Acceptance Criteria

Each criterion cites the spec requirement it grades as `(REQ-n)`.

- [ ] **AC-1** Given `.prism/templates/plan.md`, When its headings are read, Then they are Tasks, Challenge, Decisions, Verification, Review, PR Readiness in that order, with no `## History` and no `## Sessions`, and a copy of the template holds neither. (REQ-1)
  - Evidence (machine): `pnpm exec tsx --test scripts/ai-skills/plan-templates.test.ts` passes, and its plan heading case fails on `main` at `8c53b07a`.
- [ ] **AC-2** Given the plan template's Decisions comment, `prism-plan`, and the `## Decisions` row of the plan-authoring ownership table, When read, Then each says a folder plan's Decisions hold scope changes and open questions only and a routine implementation choice is a commit, and the template still asks for the close-time verdict line. (REQ-2)
  - Evidence (machine): `grep -c 'scope change' .prism/templates/plan.md .ai-skills/skills/prism-plan/shared.md .prism/architect/_toolkit/plan-authoring.md templates/install/.prism/architect/_toolkit/plan-authoring.md` prints at least 1 for each, and `grep -c 'promoted to' .prism/templates/plan.md` prints at least 1.
- [ ] **AC-3** Given the plan template's Tasks comment, When read, Then it asks for the fields plus at most two gotcha lines and no longer asks for the exact edit, its insertion point, or a content outline. (REQ-3)
  - Evidence (machine): `grep -c -E 'describe the specific change in prose|insertion point' .prism/templates/plan.md` prints 0 and `grep -c 'gotcha' .prism/templates/plan.md` prints at least 1.
- [ ] **AC-4** Given a plan folder's `plan.md` with a task holding three prose lines below its field list, When `plan-folder-citations.ts` runs, Then it reports a `task-prose` violation on the task heading; two lines, a field-only task, and a commented example task pass; an allowlisted plan passes; a clean or missing allowlisted plan is reported stale; and `tasks.mjs` still parses every older plan. (REQ-4)
  - Evidence (machine): `pnpm exec tsx --test scripts/ai-skills/plan-folder-citations.test.ts scripts/ai-skills/plan-tasks.test.ts` passes, and the three-line case fails on `main`.
- [ ] **AC-5** Given `.prism/templates/intent.md`, When its headings are read, Then `## Approach` sits between `## Proposed outcome` and `## Regression surface` and holds the lines `Chosen:`, `Rejected:`, and `Unknown:`. (REQ-5)
  - Evidence (machine): the intent heading case in `plan-templates.test.ts` passes, and fails on `main`.
- [ ] **AC-6** Given an intent, When `approve.mjs` checks it, Then it refuses a missing `## Approach`, a missing or repeated label, a label with nothing after it, and a bare `none`, and passes three filled lines and `none — <why>`. (REQ-6)
  - Evidence (machine): `pnpm exec tsx --test scripts/ai-skills/plan-approve.test.ts` passes, and each refusal case fails on `main`.
- [ ] **AC-7** Given `prism-intent`, When its body is read, Then it interviews for the three Approach lines with a recommended answer each and puts them in the recap, and the skill stays under the 120-line loaded cap. (REQ-7)
  - Evidence (machine): `grep -c -E 'Chosen|Rejected|Unknown' .ai-skills/skills/prism-intent/shared.md` prints at least 1, and `pnpm exec tsx --test scripts/ai-skills/skill-loaded-lines.test.ts` passes.
- [ ] **AC-8** Given `.prism/rules/implementation-task-detail.md` and its curated seed twin, When read, Then a folder-plan task's bar is files, proof, dependencies, and at most two gotcha lines, the Pixel mode 2 section, `[HITL]`, Cite don't restate, and Severity remain, and the any-model, any-effort framing is gone. (REQ-8)
  - Evidence (machine): `grep -c 'any LLM at any effort level' .prism/rules/implementation-task-detail.md templates/install/.prism/rules/implementation-task-detail.md` prints 0 for each, and `grep -c 'Pixel' .prism/rules/implementation-task-detail.md templates/install/.prism/rules/implementation-task-detail.md` prints at least 1 for each.
- [ ] **AC-9** Given `.prism/spec/adrs/_toolkit/`, When listed, Then `0088-folder-plan-tasks-carry-fields-and-two-gotcha-lines.md` exists, ADR-0033 carries a superseded-in-part status line naming ADR-0088, the ADR index lists 0088, `seed-curation.json` excludes it, and no seed copy of it exists. (REQ-9)
  - Evidence (machine): `pnpm prism:crossref-lint` exits 0, `grep -c 'ADR-0088' .prism/spec/adrs/_toolkit/0033-implementation-task-detail.md` prints at least 1, `grep -c '0088-' .ai-skills/definitions/seed-curation.json` prints 1, and `test ! -e templates/install/.prism/spec/adrs/_toolkit/0088-folder-plan-tasks-carry-fields-and-two-gotcha-lines.md`.
- [ ] **AC-10** Given `.prism/rules/workflow.md`, `prism-implement`, and `prism-docs`, When read, Then the build report has no `history:` line, the `done` bullet appends no History lines, and neither skill's folder-plan bullet names a `history:` line, while `prism-implement`'s flat-plan History line stays. (REQ-10)
  - Evidence (machine): `grep -c 'history:' .prism/rules/workflow.md .ai-skills/skills/prism-implement/shared.md .ai-skills/skills/prism-docs/shared.md` prints 0 for each, and `grep -c '## History' .ai-skills/skills/prism-implement/shared.md` prints at least 1.
- [ ] **AC-11** Given `shipping-flow.md` step 4 and the PR-stage bullet of `pr-description.md`, When read, Then the sync trigger is commits or scope changes the body doesn't describe, with no `## History` trigger, and the Clove flat-plan bullet keeps its History trigger. (REQ-11)
  - Evidence (machine): `grep -c '## History' .prism/references/shipping-flow.md` prints 0, `grep '## History' .prism/rules/pr-description.md | grep -c 'PR stage'` prints 0, and `grep '## History' .prism/rules/pr-description.md | grep -c 'Clove'` prints 1.
- [ ] **AC-12** Given `.prism/rules/session-orientation.md`, When Battery Persistence and the Closing battery's last line are read, Then a folder plan runs both batteries and writes no `open:` or `close:` line, and a flat plan keeps them. (REQ-12)
  - Evidence (machine): `grep -c 'folder plan' .prism/rules/session-orientation.md` prints at least 2.
- [ ] **AC-13** Given `prism-retro`, `prism-handoff`, the Iris row and rule 3 of `skills-ecosystem.md` and its twin, the plan-authoring `## History` row and its twin, `writing-a-plan.md`, `docs/ai-skills/iris.md`, and `compact-handoff.mjs`, When read, Then the retro reads no `## History`, and every other mention of `## History` is scoped to flat plans. (REQ-13, architect fold-in)
  - Evidence (machine): `grep -c '## History' .ai-skills/skills/prism-retro/shared.md` prints 0, and `grep -h '## History' .ai-skills/skills/prism-handoff/shared.md docs/ai-skills/iris.md .prism/architect/_toolkit/skills-ecosystem.md templates/install/.prism/architect/_toolkit/skills-ecosystem.md .prism/architect/_toolkit/plan-authoring.md templates/install/.prism/architect/_toolkit/plan-authoring.md .prism/architect/guides/writing-a-plan.md scripts/ai-skills/hooks/compact-handoff.mjs | grep -vc flat` prints 0, `grep -c 'plan with a .## History. line' docs/ai-skills/iris.md` prints 0, and the open-question variant's History sentence in `.prism/rules/branch-plan.md` and its twin names a flat plan.
- [ ] **AC-14** Given `CLAUDE_AGENT_MODEL_DEFAULTS`, When the implement agent is built, Then `.claude/agents/prism-implement.md` reads `model: inherit`, and a test fails when that file names another model. (REQ-14)
  - Evidence (machine): `pnpm exec tsx --test scripts/ai-skills/claude-agent-def.test.ts` passes, and `grep -c '^model: inherit$' .claude/agents/prism-implement.md` prints 1.
- [ ] **AC-15** Given a plan whose `## Challenge` round lines start with `- `, When `auto-approve.mjs` runs, Then it reads them the same as bare lines, for approval and for the round-1-carried refusal. (REQ-15)
  - Evidence (machine): `pnpm exec tsx --test scripts/ai-skills/plan-auto-approve.test.ts` passes, and the dashed cases fail on `main`.
- [ ] **AC-16** Given each part's head, When CI runs, Then `pnpm prism:check` passes on both platforms.
  - Evidence (machine): the PR's check rollup shows the `prism:check` job green on ubuntu and windows.

## Tasks

This child ships as a two-PR stack. **Part 1 (the lean plan and the builder tier, REQ-1 to 4 and 8 to 14, plus the architect fold-ins)** is T1 to T14 and T23, which round 1 added. **Part 2 (the Approach lines and the dashed round lines, REQ-5, 6, 7, 15)** is T15 to T22, and opens with T15, the plan-only commit that names part 1's tasks as shipped. The run stops once part 1's PR is open: T15 starts only on part 2's branch, cut from `main` after part 1 merges, even though `bundles.mjs` reports it ready after T14. Part 1 shipped in #560.

Each part's generated copies are listed in its build task (T14, T22), which commits only the listed paths `git status -s` shows changed. Curated seed twins are hand-edited in the same task as their canonical, because the build never rewrites them. A test and the script it imports share one task, written test-first, because the import edge would otherwise make the test task wait on the script task.

Bundle groups (from `node scripts/ai-skills/hooks/plan/bundles.mjs .prism/plans/prism-558/plan.md`):

Group 1: T3
Group 2: T4
Group 3: T5, T9, T23
Group 4: T7
Group 5: T8
Group 6: T10
Group 7: T11
Group 8: T12
Group 9: T13

Later groups print as tasks finish. The script added two import edges: T1 and T17 depend on T3, because `plan-templates.test.ts` imports `plan-folder-citations.ts`.

### T1: Part 1 — expect a plan template with no History or Sessions

- files: scripts/ai-skills/plan-templates.test.ts
- proof: pnpm exec tsx --test scripts/ai-skills/plan-templates.test.ts
- proof fails on main: yes
- depends on: none
- behavior change: the expected plan heading list drops `History` and `Sessions` (lines 64 and 65), because REQ-1 removes both sections from the template.

### T2: Part 1 — cut History, Sessions, and task prose from the plan template

- files: .prism/templates/plan.md
- proof: pnpm exec tsx --test scripts/ai-skills/plan-templates.test.ts
- depends on: T1

The new Tasks comment drops the pointer to the task-detail rule's file, exact change, verification, and sequence, along with the prose line.

### T3: Part 1 — add the task-prose lint and its allowlist

- files: scripts/ai-skills/plan-folder-citations.test.ts, scripts/ai-skills/plan-folder-citations.ts
- proof: pnpm exec tsx --test scripts/ai-skills/plan-folder-citations.test.ts scripts/ai-skills/plan-tasks.test.ts
- proof fails on main: yes
- depends on: none
- behavior change: `runPlanFolderCheck` gains a third parameter, `taskProseAllowlist = PLAN_TASK_PROSE_ALLOWLIST`, and returns `staleTaskProseAllowlist` beside `staleAllowlist`, so every temp-root call (lines 153, 181, 207, 224, 237, 268, 280, 292, 305) passes `[]` as the third argument and expects `staleTaskProseAllowlist: []`, and the repo-wide case at line 42 also asserts `staleTaskProseAllowlist` is empty.

Seed `PLAN_TASK_PROSE_ALLOWLIST` with the plans over the cap at `c6f9027c`: `prism-516`, `prism-520`, `prism-522`, `prism-530`, `prism-537`, `prism-544`, `prism-550`, `prism-553`, each as `<folder>/plan.md`.
Recount at build time, and add `prism-557/plan.md` when child 11 merged first, per the spec's race Decision.

### T4: Part 1 — map the implement agent to inherit

- files: scripts/ai-skills/claude-agent-def.test.ts, scripts/ai-skills/generate-skills.ts, scripts/ai-skills/role-preloads.test.ts
- proof: pnpm exec tsx --test --test-name-pattern="^(?!generated prism-implement agent)" scripts/ai-skills/claude-agent-def.test.ts && pnpm exec tsx --test scripts/ai-skills/role-preloads.test.ts
- proof fails on main: yes
- depends on: none
- behavior change: line 77 asserted `prism-implement` had no default model, and now asserts it maps to `inherit`, because REQ-14 moves the builder to the session's model; the line-57 test's worker case (lines 64 to 72) builds `prism-docs` with description `Eli.` instead of `prism-implement`, so its `sonnet` assertion and title stay true; `role-preloads.test.ts` line 56 drops `model: sonnet\n` from its regex, so it checks preloads only and stops pinning the implement agent's model.

Name the new cases "maps prism-implement to inherit" and "generated prism-implement agent inherits the session model".
The generated-file case passes only after T14 rebuilds the agent files, and the doc comment above `CLAUDE_AGENT_MODEL_DEFAULTS` names the implement agent's `inherit`.

### T5: Part 1 — rewrite the task-detail rule for folder-plan tasks

- files: .prism/rules/implementation-task-detail.md, templates/install/.prism/rules/implementation-task-detail.md
- proof: grep -c 'any LLM at any effort level' .prism/rules/implementation-task-detail.md templates/install/.prism/rules/implementation-task-detail.md
- depends on: none

Keep and cut the parts the spec's Task-detail rule and ADR part names, and make the same edit in the curated twin, which drops ADR citations.

### T6: Part 1 — supersede the task half of ADR-0033

- files: .prism/spec/adrs/_toolkit/0088-folder-plan-tasks-carry-fields-and-two-gotcha-lines.md, .prism/spec/adrs/_toolkit/0033-implementation-task-detail.md, .prism/spec/adrs/_toolkit/README.md, .ai-skills/definitions/seed-curation.json
- proof: pnpm prism:crossref-lint && grep -c '0088-' .ai-skills/definitions/seed-curation.json
- depends on: T5

Add the ADR as one exact path in `excluded` beside 0087, add its README row, and end 0033's row summary with "Task half superseded in part by ADR-0088." as 0023's row does.
If 0088 is taken when this task runs, take the next free number and record the rename as an `amended:` line on this task.

### T7: Part 1 — drop the build report's history line

- files: .prism/rules/workflow.md, .ai-skills/skills/prism-implement/shared.md, .ai-skills/skills/prism-docs/shared.md
- proof: grep -c 'history:' .prism/rules/workflow.md .ai-skills/skills/prism-implement/shared.md .ai-skills/skills/prism-docs/shared.md
- depends on: none

`prism-docs` gets the same folder-plan edit as `prism-implement`, and its plan-read bullet names `## History` for a flat plan only.

### T8: Part 1 — sync the PR body on commits and scope changes

- files: .prism/references/shipping-flow.md, .prism/rules/pr-description.md
- proof: grep -c '## History' .prism/references/shipping-flow.md
- depends on: none

The Clove flat-plan bullet in `pr-description.md` keeps its History trigger.

### T9: Part 1 — skip battery persistence on a folder plan

- files: .prism/rules/session-orientation.md
- proof: grep -c 'folder plan' .prism/rules/session-orientation.md
- depends on: none

### T10: Part 1 — stop the retro and handoff reading History on a folder plan

- files: .ai-skills/skills/prism-retro/shared.md, .ai-skills/skills/prism-handoff/shared.md, docs/ai-skills/iris.md
- proof: grep -c '## History' .ai-skills/skills/prism-retro/shared.md
- depends on: none

The retro's date-range target also reads `## History` today, so it walks each plan's commits in the range instead, and `iris.md` lines 11 and 22 follow.
In `prism-handoff/shared.md`, lines 12 and 47 both say flat plan, and on a folder plan line 47's conflict rule names `plan.md`'s Decisions and task commits.

### T11: Part 1 — scope Decisions to scope changes and open questions

- files: .ai-skills/skills/prism-plan/shared.md, .prism/architect/_toolkit/plan-authoring.md, templates/install/.prism/architect/_toolkit/plan-authoring.md
- proof: grep -c 'scope change' .ai-skills/skills/prism-plan/shared.md .prism/architect/_toolkit/plan-authoring.md templates/install/.prism/architect/_toolkit/plan-authoring.md
- depends on: none

In the ownership table the `## Decisions` row gains the scope rule and the `## History` row reads flat plans only, in the canonical and the twin.

### T12: Part 1 — scope the History mentions in the ecosystem doc and plan guide

- files: .prism/architect/_toolkit/skills-ecosystem.md, templates/install/.prism/architect/_toolkit/skills-ecosystem.md, .prism/architect/guides/writing-a-plan.md
- proof: grep -n '## History' .prism/architect/_toolkit/skills-ecosystem.md templates/install/.prism/architect/_toolkit/skills-ecosystem.md .prism/architect/guides/writing-a-plan.md
- depends on: none

The Iris row drops `## History` and rule 3 gains "on a flat plan", and the guide's Keep it scannable part says the same.

### T13: Part 1 — scope the post-compact History line to flat plans

- files: scripts/ai-skills/hooks/compact-handoff.mjs
- proof: pnpm exec tsx --test scripts/ai-skills/compact-handoff.test.ts && grep -n 'flat plan' scripts/ai-skills/hooks/compact-handoff.mjs
- depends on: none

### T14: Part 1 — regenerate the outputs

- files: .claude/templates/plan.md, .codex/templates/plan.md, .cursor/templates/plan.md, templates/install/.prism/templates/plan.md, .claude/rules/implementation-task-detail.md, .codex/rules/implementation-task-detail.md, .cursor/rules/implementation-task-detail.mdc, .claude/rules/workflow.md, .codex/rules/workflow.md, .cursor/rules/workflow.mdc, templates/install/.prism/rules/workflow.md, .claude/rules/session-orientation.md, .codex/rules/session-orientation.md, .cursor/rules/session-orientation.mdc, templates/install/.prism/rules/session-orientation.md, .claude/rules/branch-plan.md, .codex/rules/branch-plan.md, .cursor/rules/branch-plan.mdc, templates/install/.prism/rules/pr-description.md, .claude/references/shipping-flow.md, .codex/references/shipping-flow.md, .cursor/references/shipping-flow.md, templates/install/.prism/references/shipping-flow.md, .claude/architect/_toolkit/plan-authoring.md, .codex/architect/_toolkit/plan-authoring.md, .cursor/architect/_toolkit/plan-authoring.md, .claude/architect/_toolkit/skills-ecosystem.md, .codex/architect/_toolkit/skills-ecosystem.md, .cursor/architect/_toolkit/skills-ecosystem.md, .claude/architect/guides/writing-a-plan.md, .codex/architect/guides/writing-a-plan.md, .cursor/architect/guides/writing-a-plan.md, templates/install/.prism/architect/guides/writing-a-plan.md, .claude/spec/adrs/_toolkit/0088-folder-plan-tasks-carry-fields-and-two-gotcha-lines.md, .codex/spec/adrs/_toolkit/0088-folder-plan-tasks-carry-fields-and-two-gotcha-lines.md, .cursor/spec/adrs/_toolkit/0088-folder-plan-tasks-carry-fields-and-two-gotcha-lines.md, .claude/spec/adrs/_toolkit/0033-implementation-task-detail.md, .codex/spec/adrs/_toolkit/0033-implementation-task-detail.md, .cursor/spec/adrs/_toolkit/0033-implementation-task-detail.md, .claude/spec/adrs/_toolkit/README.md, .codex/spec/adrs/_toolkit/README.md, .cursor/spec/adrs/_toolkit/README.md, AGENTS.md, .codex/config.toml, .claude/skills/prism-plan/SKILL.md, .cursor/skills/prism-plan/SKILL.md, .claude/skills/prism-implement/SKILL.md, .cursor/skills/prism-implement/SKILL.md, .claude/agents/prism-implement.md, .codex/agents/prism-implement.toml, .claude/skills/prism-retro/SKILL.md, .cursor/skills/prism-retro/SKILL.md, .claude/agents/prism-retro.md, .codex/agents/prism-retro.toml, .claude/skills/prism-handoff/SKILL.md, .cursor/skills/prism-handoff/SKILL.md, .claude/skills/prism-docs/SKILL.md, .cursor/skills/prism-docs/SKILL.md, .claude/agents/prism-docs.md, .codex/agents/prism-docs.toml
- proof: pnpm prism:check
- depends on: T2, T3, T4, T5, T6, T7, T8, T9, T10, T11, T12, T13, T23

Run `pnpm prism:build`, then `pnpm prism:check`, and fix a failure in the task that owns the source file.
A changed path missing from this list goes in the build report as `unlisted:`, and `.codex/config.toml` changes only if `AGENTS.md` crosses a 64 KiB step.

### T15: Part 2 — record part 1 as shipped

- files: .prism/plans/prism-558/plan.md
- proof: node scripts/ai-skills/hooks/plan/tasks.mjs .prism/plans/prism-558/plan.md
- depends on: T14

On part 2's branch, cut from `main` after part 1 squash-merges, add `Part 1 shipped in #<n>.` to the end of the first paragraph under `## Tasks`.
Commit it as `T1,T2,T3,T4,T5,T6,T7,T8,T9,T10,T11,T12,T13,T14,T15,T23: Record part 1 as shipped` through `plan/commit.mjs`, per the stacked-ticket note in `plan-chain-scripts.md`.

### T16: Part 2 — refuse an intent without its Approach lines

- files: scripts/ai-skills/plan-approve.test.ts, scripts/ai-skills/hooks/plan/approve.mjs
- proof: pnpm exec tsx --test scripts/ai-skills/plan-approve.test.ts scripts/ai-skills/approve-guard.test.ts
- proof fails on main: yes
- depends on: T15

Write the cases first from the spec's Approach lines list, and give the existing intent fixtures a filled `## Approach` so they keep passing.
Read the section through `sectionBody` and test the none form with `NONE_WITH_REASON`, so an Approach line reads `none` the way a surface does.

### T17: Part 2 — expect the Approach heading in the intent template

- files: scripts/ai-skills/plan-templates.test.ts
- proof: pnpm exec tsx --test scripts/ai-skills/plan-templates.test.ts
- proof fails on main: yes
- depends on: T15, T1

### T18: Part 2 — add the Approach section to the intent template

- files: .prism/templates/intent.md
- proof: pnpm exec tsx --test scripts/ai-skills/plan-templates.test.ts
- depends on: T17

Copy the three label lines from the spec's Approach lines part with its comment on one line, and fold the four-line `## Proposed outcome` comment onto one line.
`prism-intent` loads 113 of 120 lines at `c6f9027c`, so this task and T19 together add no more than 7 net.

### T19: Part 2 — interview for the Approach lines

- files: .ai-skills/skills/prism-intent/shared.md
- proof: grep -c -E 'Chosen|Rejected|Unknown' .ai-skills/skills/prism-intent/shared.md && pnpm exec tsx --test scripts/ai-skills/skill-loaded-lines.test.ts
- depends on: T18

Fold the Approach lines into the existing interview and recap bullets rather than adding new ones, to stay under the cap.

### T20: Part 2 — accept a leading dash on a round line

- files: scripts/ai-skills/plan-auto-approve.test.ts, scripts/ai-skills/hooks/plan/auto-approve.mjs
- proof: pnpm exec tsx --test scripts/ai-skills/plan-auto-approve.test.ts
- proof fails on main: yes
- depends on: T15

Write first one case approving rounds `- round 1: clean` and `- round 2: clean`, and one refusing a dashed `- round 1: carried 1`.
The reported line is the text after the dash, so a refusal message reads the same for both spellings.

### T21: Part 2 — document the dashed round line

- files: .prism/architect/_toolkit/plan-chain-scripts.md
- proof: grep -n 'leading `- `' .prism/architect/_toolkit/plan-chain-scripts.md
- depends on: T20

### T22: Part 2 — regenerate the outputs

- files: .claude/templates/intent.md, .codex/templates/intent.md, .cursor/templates/intent.md, templates/install/.prism/templates/intent.md, .claude/architect/_toolkit/plan-chain-scripts.md, .codex/architect/_toolkit/plan-chain-scripts.md, .cursor/architect/_toolkit/plan-chain-scripts.md, templates/install/.prism/architect/_toolkit/plan-chain-scripts.md, .claude/skills/prism-intent/SKILL.md, .cursor/skills/prism-intent/SKILL.md, .claude/agents/prism-intent.md, .codex/agents/prism-intent.toml
- proof: pnpm prism:check
- depends on: T16, T18, T19, T20, T21

Run `pnpm prism:build`, then `pnpm prism:check`, and fix a failure in the task that owns the source file.
A changed path missing from this list goes in the build report as `unlisted:`.

### T23: Part 1 — scope the open-question History note to flat plans

- files: .prism/rules/branch-plan.md, templates/install/.prism/rules/branch-plan.md, templates/install/AGENTS.md.tmpl
- proof: grep -n 'History\|Sessions' .prism/rules/branch-plan.md templates/install/.prism/rules/branch-plan.md templates/install/AGENTS.md.tmpl
- depends on: none

In `branch-plan.md` and its twin, scope to a flat plan: step 2's history-log bullet, the step 4 History lines, the close step's History entry, the open-question note, and the Sessions and History maintenance bullets.
The `Plan File Template` section is already flat-only; `AGENTS.md.tmpl` line 102 gains "on a flat plan".

## Challenge

round 1: blocking 3
  - T4 (blocking, major): `scripts/ai-skills/role-preloads.test.ts` line 56 builds the agent for skillId `prism-implement` and asserts `model: sonnet`, so REQ-14 breaks it. The file is in no task and outside Affected systems, so T14's `pnpm prism:check` fails with no task able to fix it.
  - T18 (blocking): `prism-intent` loads 113 lines today (47 body plus the 66-line intent template) against an empty over-cap allowlist. The spec's Approach block adds about 13 template lines and T19 adds skill lines, so about 128 lines, and AC-7 and AC-16 cannot pass. No task cuts lines or records a reasoned overage.
  - AC-11 (blocking): `.prism/rules/pr-description.md` has three `## History` lines (61, 65, 66), and T8 edits only line 65. The count prints 2, not the 1 the evidence expects.
  - T6 (non-blocking): the README index row for 0033 reads `accepted`, and the task only adds a status pointer in the ADR itself.
  - T15 (non-blocking): after T14 lands on part 1's branch, `bundles.mjs` reports T15 ready, because it depends only on T14, so the session builds part 2 on part 1's branch. The plan names no stop point.
  - AC-13 (non-blocking): the `flat` check is a line-level grep with no count, so a file passes whether or not its mention was scoped.
  - plan (non-blocking): `.prism/rules/branch-plan.md` line 322 tells every plan to note a resolved open question in `## History`, which is false for a folder plan after REQ-1. The file is outside Affected systems.

round 2: blocking 1
  - T15 (blocking): its subject `T1-T15` marks T1 to T15 done, but T23 belongs to part 1 and sits outside that range, and `parseSubject` has no form that joins a range with a list. After part 1 squash-merges, T23 reads open on part 2's branch, so `bundles.mjs` re-dispatches it, `commit.mjs` refuses the unchanged path, and the run ends `blocked`. Use the list form `T1,T2,...,T15,T23: Record part 1 as shipped`.
  - T4 (non-blocking): `claude-agent-def.test.ts` line 72 builds `prism-implement` and asserts `sonnet`, and the test at line 57 is titled "other personas to sonnet". Both break under REQ-14. The task's `behavior change` names only line 77, and its `--test-name-pattern` proof skips line 72, so only T14's `prism:check` would catch it. Name line 72 in `behavior change`.
  - T6 (non-blocking): `templates/install/.prism/spec/adrs/_toolkit/README.md` holds no ADR rows, because numbered ADRs never ship, so "add the 0088 row" there would cite an unshipped ADR. Drop that file from T6.
  - T10 (non-blocking): `prism-handoff/shared.md` line 47 also says the plan's `## History` wins on a conflict, and the task names only line 12. AC-13 fails on line 47 until it says flat plan.
  - AC-13 (non-blocking): line 11 of `docs/ai-skills/iris.md` already says "flat plan", so the grep passes on it before and after the edit.

round 3: blocking 3
  - T1 (blocking): it removes the `"History",` and `"Sessions",` lines from the expected heading list in `scripts/ai-skills/plan-templates.test.ts`. The commit gate's weakened-tests check (`hooks/commit-gate/test-guard.mjs`) denies removing a base line from a test file unless the task lists the file and carries `- behavior change:`, and `prism-implement` may never edit `plan.md`, so the build ends `blocked`. Add `- behavior change: the expected plan heading list drops History and Sessions, because REQ-1 removes both sections from the template`.
  - T3 (blocking): it adds a task-prose allowlist and a stale report to `runPlanFolderCheck`, but nine existing tests in `plan-folder-citations.test.ts` assert the exact result shape (`assert.deepEqual(await runPlanFolderCheck(root, ...), { violations, staleAllowlist })` at lines 153, 181, 207, 224, 237, 268, 280, 292, 305-306). A new result field breaks them, and a default allowlist makes all 8 real entries stale in temp roots, so existing lines must change and T3 has no `behavior change`. Add one, and pin the design: a third optional `taskProseAllowlist` parameter defaulting to the real list, a separate stale field, existing temp-root calls passing `[]`, and the repo-wide case asserting the new stale field is empty.
  - T4 (blocking): its proof runs all of `claude-agent-def.test.ts`, which includes the new case reading generated `.claude/agents/prism-implement.md`, and T4 does not regenerate it, so the case fails until T14 rebuilds. Make the proof a `--test-name-pattern` that excludes the generated-file case, for example `'^(?!generated prism-implement agent)'`, and keep `role-preloads.test.ts`. T14's `pnpm prism:check` runs the full suite.
  - plan / T23 (non-blocking): `.prism/rules/branch-plan.md` is an always-on rule, and its Maintenance Expectations still say "Append to `## Sessions` at session start and close" and "Append new entries to `## History`", with the History-appending text near lines 103-115 also general. T23 scopes only line 322. Extend T23 and its curated twin to scope those lines to "on a flat plan".
  - plan (non-blocking): `templates/install/.prism/AGENTS.md.tmpl` line 102 (Task Management item 3) says "update `## History` after meaningful changes", reaches consumers, and contradicts REQ-1. Scope it to flat plans or drop it; the file sits inside `templates/install/**`, which is in Affected systems.
  - AC-13 (non-blocking, repeat of round 2): `docs/ai-skills/iris.md` line 11 already holds "flat" beside `## History`, so the `grep -vc flat` evidence passes without T10's iris edit. Grade iris line 22 separately, for example `grep -c 'plan with a \`## History\` line' docs/ai-skills/iris.md` prints 0.
  - T18 (non-blocking): it adds about 8 lines (heading, blank, one-line comment, blank, three labels, trailing blank) against the task's own cap of 7 for T18 and T19 together, and `prism-intent` is at 113 of 120. Name the template comment to trim.

round 4: resolved 3
  - AC-1 (non-blocking): its evidence says "its copy case fails on `main`", but T1 adds no copy case; the heading-list assertion is what fails on `main`, and it also covers the copy. Reword the evidence to "its plan heading case".
  - T4 (non-blocking): the `CLAUDE_AGENT_MODEL_DEFAULTS` doc comment in `generate-skills.ts` (lines 116 to 122) says every persona but the architect defaults to the cheaper tier, which is false once `prism-implement` maps to `inherit`. Update it in the same edit.
  - plan / T23 (non-blocking): `branch-plan.md` step 2 under Required Workflow still says "Review the history log for what has already been done", which a folder plan no longer has. Scope it to a flat plan with the other History lines.

## Decisions

- **The plan stage ran as a subagent.** The session's context was long after children 10 and 11, so the main session dispatched this stage with the worktree and folder. Rejected: running it in the session, which would have pushed the session toward compaction mid-epic.
- **The child ships as a two-PR stack, cut between the plan side and the intent side.** The hand-edited files cross 10 on their own, generated copies aside. Part 1 is the lean plan with the builder tier, and part 2 is the Approach lines with the dashed round lines. The lean plan goes first because `plan-templates.test.ts` imports the lint, so part 2's intent heading case has to land after the lint exists. Part 1 stays one PR although it crosses 10 files, because its pieces have no value apart: a template without History while the workflow still appends History lines, or a two-line task comment beside a rule that demands the full bar, would each ship a contradiction. Rejected: splitting part 1 into scripts and prose, for that reason. The builder tier rides part 1 because the new ADR's reason names it.
- **`plan-templates.test.ts` is claimed once in each part.** T1 drops the two plan headings and T17 adds the intent heading. T17 depends on T1, so `bundles.mjs` sees an ordered pair, not a parallel claim. Rejected: one task for both edits, which would put part 2's heading case in part 1 ahead of the intent template it checks.
- **This plan has no History or Sessions section and keeps every task to two lines.** REQ-1 removes both sections and nothing in the resume table reads them, and the spec says this plan is written to the cap so the lint needs no allowlist entry for it.
- **The Approach comment folds onto one line to keep `prism-intent` under the cap.** The skill loads its body plus the intent template, 113 lines before this change, and the spec's six-line comment plus the skill text would cross 120. The spec also says the skill stays under the cap, and the three labels and the `none — <why>` rule are what approval reads, so the comment shrinks and the labels don't. Rejected: a reasoned overage in `skill-loaded-lines.test.ts`, which sits outside Affected systems and spends the cap's slack on comment text.
- **Round 1 added T23 and two files, both through `prism-architect`.** `role-preloads.test.ts` pins the implement agent's model and `branch-plan.md` tells every plan to log a resolved open question in `## History`, and both go false with this child. The architect's verdict was proceed for both and it added them to the spec's Affected systems. T23 is appended rather than renumbered, because task IDs are permanent once committed.
- **Round 3 widened T23 to the rest of `branch-plan.md` and the consumer `AGENTS.md.tmpl`.** Both tell every plan to append `## History` or `## Sessions` lines, which REQ-1 makes false for a folder plan. Both sit inside Affected systems, and this is the same kind of change the architect cleared in round 1, a doc this child makes false, so it is recorded here and not sent back to the architect.
- **The ADR number is fixed at 0088 in the task files.** A `files` entry must be a real path, so the plan can't defer the number. Child 11 adds no ADR, so 0088 is free unless another merge takes it first, and T6 carries the rename path.
- **The post-compact note's flat-plan wording gets a test outside the task list.** Review round 1 found that nothing pinned T13's change to `compact-handoff.mjs`, so the T13 fix added a case to `scripts/ai-skills/compact-handoff.test.ts`, a file no task lists. Rejected: leaving the wording untested, since reverting it passed the suite.
- **OPEN — TBD, needs Hunter input.** T21 left out the spec's claim that `prism-challenge` also documents the bare round-line form, because confirming it meant reading three more gated docs for a one-line mention. **Default path (used until resolved):** the claim stays out of this PR and is listed as an open item in the PR body.

## Verification

verdict: done
base: 8c53b07a
head: b6725fbd

| check | result | evidence |
| --- | --- | --- |
| typecheck | pass | /tmp/claude-1000/-home-zibbix-Projects-PRISM/b0840a51-e844-4baa-b46e-ea88566ea84b/scratchpad/verify2/typecheck.log |
| lint | pass | /tmp/claude-1000/-home-zibbix-Projects-PRISM/b0840a51-e844-4baa-b46e-ea88566ea84b/scratchpad/verify2/lint.log |
| test | pass | /tmp/claude-1000/-home-zibbix-Projects-PRISM/b0840a51-e844-4baa-b46e-ea88566ea84b/scratchpad/verify2/test.log |
| build | pass | /tmp/claude-1000/-home-zibbix-Projects-PRISM/b0840a51-e844-4baa-b46e-ea88566ea84b/scratchpad/verify2/build.log |
| format | n/a: not configured | none |
| spec | pass | /tmp/claude-1000/-home-zibbix-Projects-PRISM/b0840a51-e844-4baa-b46e-ea88566ea84b/scratchpad/verify2/spec.log |

### Failures

- none

## Review

- review round 1 at bb6ff420 (part 1 of 2): 0 critical, 2 major, 6 minor, 4 nit
- review round 2 at 67d38b0b (part 1 of 2): clean
