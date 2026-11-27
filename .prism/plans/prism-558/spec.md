---
title: Lean plan and intent — cut History, Sessions, and task prose, add the Approach lines
ticket: https://github.com/HunterMcGrew/PRISM/issues/558
stage: spec
status: draft
epic: prism-499
child: 12
---

Child 12 of the Kitchen Line epic (#499). The design source is `.prism/plans/prism-499/spec.md`: row 12 of its second Children table, the "Lean plan and intent" part of its "Third amendment, 2026-11-26" section, and the Plan folder part of its Design, which that part points to. The epic's approved `intent.md` covers this child through its third amendment ("Plan", "Builders", "Intent"), and through the Workflow line that the implement stage runs on the planning model tier.

The checked starting point is `main` at `8c53b07a`. Child 11 (stage tools, #557) runs beside this child, and either may merge first.

## Requirements

1. `.prism/templates/plan.md` has no `## History` and no `## Sessions` section, and a plan copied from it has neither. A plan folder written before this change keeps the two it has, and no script or skill writes them.
2. The plan template's `## Decisions` comment, `prism-plan`, and the plan-authoring section-ownership table say a folder plan's Decisions hold scope changes and open questions only, and that a routine implementation choice is a commit, not a Decision. The retro still writes a verdict under each entry.
3. The plan template's task comment asks for the fields plus at most two lines of gotchas, meaning what the builder would otherwise get wrong. It no longer asks for the exact edit, its insertion point, or a content outline in prose.
4. `plan-folder-citations.ts` fails a task in a plan folder's `plan.md` that holds more than two prose lines below its field list. A shrink-only allowlist, separate from the citation allowlist, names each plan written before the check, and an entry is reported stale once its plan is clean or gone. `tasks.mjs` does not enforce the cap and keeps reading every older plan.
5. `.prism/templates/intent.md` has an `## Approach` section between `## Proposed outcome` and `## Regression surface`, holding three labeled lines: `Chosen:`, `Rejected:`, and `Unknown:`.
6. `approve.mjs` refuses an intent whose `## Approach` is missing, lacks one of the three labels, has a label with nothing after it, or has a label reading a bare `none`. `none — <why>` passes, as it does for a surface. An intent approved before this change is not rechecked by any script.
7. `prism-intent` interviews for the three Approach lines and fills them before the recap.
8. `.prism/rules/implementation-task-detail.md` is rewritten for folder-plan tasks: files, proof, dependencies, and at most two gotcha lines. Its part on Pixel's mode 2 mock specs stays. The text that front-loads every decision so any model at any effort level can build the task is cut.
9. A new ADR in `.prism/spec/adrs/_toolkit/` supersedes the task half of ADR-0033 and records why. ADR-0033 gains a status pointer to it and keeps its mock-spec half.
10. The build report in `.prism/rules/workflow.md` has no `history:` line, and the session no longer appends History lines to `plan.md` after a wave. `prism-implement`'s folder-plan bullet matches.
11. `.prism/references/shipping-flow.md` syncs the PR body when the push carries commits or scope changes the body doesn't describe, not when `## History` has entries past the last body write. The PR-stage sentence in `.prism/rules/pr-description.md` says the same. The flat-plan sentence for Clove keeps its History trigger.
12. `.prism/rules/session-orientation.md` skips Battery Persistence on a folder plan, which has no `## Sessions` section. A flat plan keeps it.
13. `prism-retro` no longer reads `## History`. The `skills-ecosystem.md` row for Iris and the `prism-handoff` line that reads History say the same, the handoff line applying to a flat plan only.
14. `CLAUDE_AGENT_MODEL_DEFAULTS` in `generate-skills.ts` maps `prism-implement` to `inherit`, so the generated `.claude/agents/prism-implement.md` reads `model: inherit`. A test fails when that file names a fixed model.
15. `auto-approve.mjs` reads a `## Challenge` round line written with a leading `- ` the same as one without it.

## Design

### Plan template

Delete the `## History` and `## Sessions` headings and their comments from `.prism/templates/plan.md`. The remaining order is Tasks, Challenge, Decisions, Verification, Review, PR Readiness, which is the order the epic spec's Plan folder part names. `plan-templates.test.ts` lists the headings the scripts read in order, so its expected list drops the two and gains a case that a copy of the template holds neither.

Rewrite two comments:

- **Decisions.** One entry per scope change or open question, with a bold title and the reason. A routine implementation choice goes in the commit, not here. The close-time verdict line stays.
- **Tasks.** Keep the field list as it is. Replace "Below the fields, describe the specific change in prose" and the pointer to the task-detail bar's file, exact change, verification, and sequence with: below the fields, at most two lines of gotchas, meaning what the builder would otherwise get wrong. The lint counts them.

The epic's Template cuts also name `plan-small.md`. That file is created by child 14, after this one, so this child has nothing to cut there, and child 14 writes it without the two sections.

### Two-line task lint

Add a third violation kind, `task-prose`, to `plan-folder-citations.ts`. It runs only on a plan folder's `plan.md`, at any depth the existing walk reaches, under both plan roots.

- Strip HTML comments first, so the template's example task never counts.
- A task is a `### T<n>:` heading under `## Tasks`, running to the next `###` or `##` heading.
- The field list is the run of `- <key>: <value>` lines right after the heading, with blank lines allowed inside it. The keys are the ones `plan-chain-scripts.md` lists under Tasks and subjects: `files`, `proof`, `proof fails on main`, `depends on`, `behavior change`, `amended`, and `new dependency`.
- Every non-blank line after the field list is a prose line, fenced code included. More than two fails, reported on the task's heading line.
- The citation rules keep their fence and code-span handling. The task count does not use them, because a code block under a task is prose for this purpose.

The allowlist is `PLAN_TASK_PROSE_ALLOWLIST`, keyed `<plan folder>/plan.md` like the citation one, with the same stale report. It is separate because one shared list would let a plan's allowlisted citations hide its task prose, and the reverse. Measured on `8c53b07a`, the folder plans with at least one task over the cap are `prism-516`, `prism-520`, `prism-522`, `prism-530`, `prism-537`, `prism-544`, `prism-550`, and `prism-553`. The plan stage recounts at build time and lists what it finds. This child's own `plan.md` is written to the cap and is not listed.

Tests follow the citation suite's shape: three prose lines fail, two pass, a field-only task passes, a commented example task passes, an allowlisted plan with long tasks passes, a clean allowlisted plan is stale, and the repo-wide case passes.

### Approach lines

The intent template gains, between Proposed outcome and Regression surface:

```text
## Approach

<!--
Three lines the person approves with the intent. Each takes "none — <why>", and a bare "none" fails approval.
Chosen: the approach this ticket takes, in one line.
Rejected: the strongest alternative and why it lost.
Unknown: what the approach depends on that nobody has checked yet.
-->

Chosen:
Rejected:
Unknown:
```

`approve.mjs`'s `checkIntent` reads `sectionBody(text, "Approach")`, which already strips comments. It refuses, in this order, with the reason in the message:

- the section is missing;
- one of `Chosen:`, `Rejected:`, or `Unknown:` does not open a line of it;
- a label has nothing after it on its line;
- a label's value is a bare `none` or `none.`, or starts with `none` without `NONE_WITH_REASON`'s dash, colon, or comma and a reason.

Each label must appear once. A second line with the same label is refused, because the person approves one answer per label. The check runs on every size, the epic included, since every intent states its approach.

"Not rechecked" means no lint or script walks approved intents. Re-approving an older intent after an edit runs `checkIntent` like any approval, so that intent gains an Approach section then. `prism-499/intent.md` has none and stays approved as it is.

`plan-templates.test.ts`'s intent heading list gains `Approach` in its place. `plan-approve.test.ts` gains a case for each refusal above, a passing case with three filled lines, a passing case with `none — <why>` on `Unknown:`, and its existing intent fixtures gain the section so they keep passing.

`prism-intent` adds the Approach lines to what it interviews for, with a recommended answer for each, and to the recap. The skill stays under the 120-line loaded cap.

### Task-detail rule and ADR

Rewrite the task half of `.prism/rules/implementation-task-detail.md`. The new bar for a folder-plan task is the field list (`files`, `proof`, `depends on`, and the optional fields) and at most two gotcha lines, and the lint in the part above enforces the count. The rule says why: the builder now runs on the planning model, reads the spec and the code itself, and long task prose was 58 to 73 percent of a plan's words while repeating what the spec and the diff already hold. Keep the decision-versus-keystroke test only where it still serves, as the test for what earns a gotcha line. Cut the cross-model portability framing and the task examples. Keep "Cite, don't restate", the Pixel mode 2 section, the `[HITL]` tag, and the Severity section. A legacy flat plan's `## Implementation Tasks` keeps the old bar, in one sentence.

The ADR takes the next free number in `.prism/spec/adrs/_toolkit/` at build time, because child 11 may land one first. Context: ADR-0033's bar, the measured share of words, and the builder tier moving to the planning model. Decision: folder-plan tasks carry fields and two gotcha lines. Rejected: keeping the full bar with a soft cap, because the prose would come back. Consequences: a builder reads the spec and code to recover what a task no longer states, and that costs more reads per task. ADR-0033's status becomes superseded in part, pointing at the new ADR.

### Build report and PR body

In `.prism/rules/workflow.md`, delete the `history:` line from the build report block, and from the `done` bullet delete "and after each wave append the reports' History lines to `plan.md` and commit `plan: <summary>`". In `prism-implement`, the folder-plan bullet "Return the build report from the workflow rule, whose `history:` line the session appends" becomes "Return the build report from the workflow rule". Its flat-plan "Record in the plan" section keeps its History line, because flat plans keep History.

In `shipping-flow.md` step 4, the trigger becomes: the commits the push carries (`origin/<branch>..HEAD`), or a scope change recorded in `spec.md` or `plan.md` Decisions, add something the body doesn't describe. The PR-stage bullet in `pr-description.md` matches it. The Clove bullet there is for flat plans and keeps History.

### Orientation

In `session-orientation.md`, Battery Persistence gains one sentence: on a folder plan the batteries still run, and the `open:` and `close:` lines are not written, because a plan folder has no `## Sessions` section. The closing battery's Scope boundary diff then reads the opening Bounds from the session's own opening answer. The final line of the Closing battery section, which appends to `## Sessions`, says the same.

### Retro and other readers

- `prism-retro`'s Read bullet drops `## History`.
- The plan-authoring ownership table keeps its `## History` row with "flat plans only" in the section cell. No `## Sessions` row exists there, so nothing else changes in it.
- The Iris row in `skills-ecosystem.md` drops `## History` from the sections it lists. Its rule 3, "Append-only history", gains "on a flat plan".
- `prism-handoff`'s "Changes since the last `## History` line" applies to a flat plan, and on a folder plan reads commits since the plan's last `plan:` commit.

Each skill edit is a line or two, so every skill stays under its cap.

### Builder tier

Add `["prism-implement", "inherit"]` to `CLAUDE_AGENT_MODEL_DEFAULTS`. Claude Code's docs list `inherit` as a valid agent `model:` value, read on 2026-11-27 per the epic spec and not probed here. The plan stage needs no pin, because it runs in the session. `claude-agent-def.test.ts` gains a case that builds the implement agent and asserts `model: inherit`, and a case reading the generated `.claude/agents/prism-implement.md` that fails on any `model:` other than `inherit`. `pnpm prism:build` regenerates the agent files on all three hosts.

### Challenge round lines

`ROUND_LINE` in `auto-approve.mjs` is `/^round (\d+): (clean|resolved \d+|carried \d+|blocking \d+)$/`, matched against `line.trimEnd()`, so a line written `- round 1: clean` matches nothing and the plan reads as having no rounds. Accept an optional `- ` before `round`, so both spellings count and the reported line is the text after the dash. The bare form stays the documented one in `prism-challenge` and the plan template. `plan-auto-approve.test.ts` gains a dashed-line case for approval and one for the round-1-carried refusal. The Auto-approval part of `plan-chain-scripts.md` gains the clause that a leading `- ` is allowed.

## Affected systems

```text
.prism/templates/plan.md
.prism/templates/intent.md
.prism/rules/implementation-task-detail.md
.prism/rules/workflow.md
.prism/rules/session-orientation.md
.prism/rules/pr-description.md
.prism/references/shipping-flow.md
.prism/architect/_toolkit/plan-authoring.md
.prism/architect/_toolkit/skills-ecosystem.md
.prism/architect/_toolkit/plan-chain-scripts.md
.prism/spec/adrs/_toolkit/**
.prism/plans/prism-558/**
.ai-skills/skills/prism-plan/**
.ai-skills/skills/prism-intent/**
.ai-skills/skills/prism-implement/**
.ai-skills/skills/prism-retro/**
.ai-skills/skills/prism-handoff/**
scripts/ai-skills/plan-folder-citations.ts
scripts/ai-skills/plan-folder-citations.test.ts
scripts/ai-skills/plan-templates.test.ts
scripts/ai-skills/plan-approve.test.ts
scripts/ai-skills/plan-auto-approve.test.ts
scripts/ai-skills/claude-agent-def.test.ts
scripts/ai-skills/generate-skills.ts
scripts/ai-skills/hooks/plan/approve.mjs
scripts/ai-skills/hooks/plan/auto-approve.mjs
templates/install/**
AGENTS.md
CLAUDE.md
.claude/**
.codex/**
.cursor/**
```

`templates/install/**` holds the seed copies `pnpm prism:build` mirrors from the templates, rules, references, architect docs, and ADRs above. `AGENTS.md`, `CLAUDE.md`, and the three host directories are regenerated by the same build, because they inline the always-on rules and carry the skill and agent output.

## Decisions

- **A dashed challenge round line counts.** The challenger has written `- round N:` lines, and `auto-approve.mjs` matches only the bare form, so a plan with real rounds read as having none and went to a person. Accepting the optional dash in the parser fixes every plan written either way. Rejected: tightening only the challenger's text, because a markdown writer reaches for the bullet by habit and the next slip would fail the same way. It follows from the approved outcome, a run that approves a sound plan without a person, and sits inside this child's systems.
- **Child 11 and child 12 race on the task-prose allowlist.** Either may merge first, and child 11's `plan.md` predates the lint. Whichever lands second merges `main` before its last push and reruns `pnpm prism:check`: child 12 adds `prism-557/plan.md` to the allowlist when child 11 merged first, and child 11 adds its own entry when child 12 merged first. Rejected: having child 12 allowlist a plan that is not on its branch, because the stale check would fail on a missing file.
- **The consumer pin claim does not hold for the builder.** The epic says a consumer's per-persona pin still wins over the implement agent's `inherit`. `modelTiers.overrides` reads only `briar`, at the review dispatch, so no consumer pin reaches `prism-implement`. This child adds no config read, because that would be new scope the epic does not ask for, and `inherit` is the behavior. The epic's sentence is left for the retro to correct.
