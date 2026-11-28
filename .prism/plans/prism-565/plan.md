---
title: Close step and triggered retro report
ticket: https://github.com/HunterMcGrew/PRISM/issues/565
stage: plan
status: approved
approved_by: auto
approved_at: 2026-11-27
---

## Acceptance Criteria

Child 13 of the Kitchen Line epic (#499), from its `## Children` row 13 and `spec.md`. Each criterion names the part that builds it and cites the spec requirement it grades as `(REQ-n)`. Part 1's review grades only part 1's criteria.

- [ ] **AC-1** (part 1) Given a plan folder, When `retro-trigger.mjs <folder>` runs, Then a review line whose verdict is not exactly `clean` (including `clean, 1 decision`), a challenge round numbered 3 or higher (bare or dashed), and a task with an `amended` field each print one reason line (`review: <line>`, `challenge: round <n>`, `amended: T<n>`) and exit 0; a plan with none prints nothing and exits 1; a missing `plan.md`, an unreadable file, or a malformed task list exits 2. (REQ-1, REQ-2)
  - Evidence (machine): `npx tsx --test scripts/ai-skills/plan-retro-trigger.test.ts` passes, and the file does not exist on `main` at `02e9aeb0`.
- [ ] **AC-2** (part 1) Given plan text, When `review/lines.mjs` parses `## Review`, Then it returns `{ kind, round, sha, part, verdict }` for `review round`, `self-review round`, and `pr-review round` and `confirm` lines with and without ` (part <k> of <m>)`, a line `record.mjs` just wrote parses back to the round, sha, part, and verdict it was given, and `retro-trigger.mjs` defines no challenge round pattern of its own. (REQ-3)
  - Evidence (machine): `npx tsx --test scripts/ai-skills/review-lines.test.ts` passes; `grep -n 'ROUND_LINE =' scripts/ai-skills/hooks/plan/retro-trigger.mjs` prints nothing, and `grep -n '^const ROUND_LINE\|^export const ROUND_LINE' scripts/ai-skills/hooks/plan/*.mjs` prints exactly one line, in `auto-approve.mjs`.
- [ ] **AC-3** (part 1) Given a git repo and a plan, When `merge-bar.mjs <plan.md> [--head <ref>]` runs, Then it exits 0 only for a last review line reading a bare `clean` whose sha is the head or its ancestor with every later commit exempt (`retro:` subject, or every changed file under the plan's folder); it exits 1 printing one reason per failure for no record line, `clean, 1 decision`, a sha not reachable from the head, a later non-exempt commit (named), and any merge commit after the sha; and it exits 2 for an unreadable plan, an unknown `--head`, or no repo. (REQ-8)
  - Evidence (machine): `npx tsx --test scripts/ai-skills/review-merge-bar.test.ts` passes, with one case per outcome above, and the file does not exist on `main`.
- [ ] **AC-4** (part 1) Given live folder plans, When `plan-retro-line.ts` runs, Then a plan with a dated `> Closed:` line fails when its `Retro:` value is empty, absent, or a single token naming no regular file; passes with an existing path (backticks stripped), `none — no trigger`, or any value holding whitespace; a plan with no `> Closed:` line passes whatever `Retro:` holds; and review lines change nothing. (REQ-7)
  - Evidence (machine): `npx tsx --test scripts/ai-skills/plan-retro-line.test.ts` passes, `pnpm prism:retro-line` exits 0 on the tree (the positive control: every PRISM plan passes), and `grep -c 'pr-review' scripts/ai-skills/plan-retro-line.ts` prints 0.
- [ ] **AC-5** (part 1) Given a consumer update, When the hook runtime is delivered, Then `.claude/hooks/plan/retro-trigger.mjs`, `.claude/hooks/review/lines.mjs`, and `.claude/hooks/review/merge-bar.mjs` exist carrying the `@prism-hook-runtime` marker on line 1, each source has a `.d.mts` sidecar, and each imports only `node:` builtins and relative runtime modules. (REQ-15)
  - Evidence (machine): `npx tsx --test scripts/ai-skills/plan-runtime-delivery.test.ts` passes; `head -1` of each source prints the marker; `test -f` on each sidecar exits 0; `grep -hE '^import .* from "[^.n]' scripts/ai-skills/hooks/plan/retro-trigger.mjs scripts/ai-skills/hooks/review/lines.mjs scripts/ai-skills/hooks/review/merge-bar.mjs` prints nothing.
- [ ] **AC-6** (part 1) Given the architect docs, When read, Then `plan-chain-scripts.md` names `retro-trigger` among the commands and says the challenge round pattern is exported from `auto-approve.mjs`, and `review-runtime.md` has `## review/lines.mjs` and `## review/merge-bar.mjs` sections with exit codes and the exemption rule, and its retro-line section keys on `> Closed:` with no `pr-review round` text. (REQ-13)
  - Evidence (machine): `grep -n 'retro-trigger' .prism/architect/_toolkit/plan-chain-scripts.md` prints a line in the Invocation paragraph; `grep -n '^## review/lines.mjs\|^## review/merge-bar.mjs' .prism/architect/_toolkit/review-runtime.md` prints two lines; `grep -c 'pr-review round' .prism/architect/_toolkit/review-runtime.md` prints 0.
- [ ] **AC-7** (part 2) Given `prism-retro`'s body, When read, Then on a folder plan with a `plan.md` it runs `retro-trigger.mjs` first, always runs the close step (verdicts, review-miss classes, lessons exits, the two lines, the `retro:` commit), writes the report only on exit 0 and `Retro: none — no trigger` on exit 1, stops on exit 2, and an epic folder always writes the full-grain report. (REQ-4, REQ-5)
  - Evidence (machine): `grep -n 'plan/retro-trigger.mjs' .ai-skills/skills/prism-retro/shared.md` and `grep -n 'none — no trigger' .ai-skills/skills/prism-retro/shared.md` each print a line, and `grep -c 'fixed last stage' .ai-skills/skills/prism-retro/shared.md .ai-skills/skills/prism-retro/frontmatter.yml` prints 0 for both.
- [ ] **AC-8** (part 2) Given the skill-size check, When it runs, Then `prism-retro` loads 120 lines or fewer and `OVER_CAP_ALLOWLIST` in `skill-loaded-lines.test.ts` is still `{}`. (REQ-16)
  - Evidence (machine): `npx tsx --test scripts/ai-skills/skill-loaded-lines.test.ts` passes, and `grep -n 'OVER_CAP_ALLOWLIST: Record<string, { thinnedBy: string; max: number }> = {};' scripts/ai-skills/skill-loaded-lines.test.ts` prints a line.
- [ ] **AC-9** (part 2) Given the retro-report template, When read, Then the per-PR skeleton carries a `**Trigger:**` header line for the script's reasons. (REQ-6, REQ-11)
  - Evidence (machine): `grep -c '^\*\*Trigger:\*\*' .prism/templates/retro-report.md` prints at least 1.
- [ ] **AC-10** (part 2) Given the rules and the shipping flow, When read, Then `git-conventions.md`'s merge sentence requires a bare `clean` at the PR head checked by `merge-bar.mjs` plus green CI; `workflow.md`'s empty-`Retro:` resume row names the close step and `retro-trigger.mjs`; `shipping-flow.md` names the close step; and `branch-plan.md` and its seed twin describe the close step and triggered report for folder plans, accept `Retro: none — no trigger`, key the lint on `> Closed:`, and keep the declinable gate for flat plans. (REQ-9, REQ-10, REQ-11)
  - Evidence (machine): `grep -n 'merge-bar.mjs' .prism/rules/git-conventions.md` prints a line and `grep -c 'reads .clean., and CI' .prism/rules/git-conventions.md` prints 0; `grep -n 'retro-trigger.mjs' .prism/rules/workflow.md` prints a line; `grep -n 'close step' .prism/references/shipping-flow.md` prints a line; for each of `.prism/rules/branch-plan.md` and `templates/install/.prism/rules/branch-plan.md`, `grep -c 'final PR-review verdict'` prints 0 and `grep -c 'none — no trigger'` prints at least 1.
- [ ] **AC-11** (part 2) Given the ADRs, When listed, Then `0089-the-close-step-always-runs-and-the-retro-report-runs-on-a-trigger.md` exists, ADR-0083 and ADR-0068 each name ADR-0089 as amending them, the ADR index lists 0089, `seed-curation.json` excludes it, and no seed copy exists. (REQ-12)
  - Evidence (machine): `pnpm prism:crossref-lint` exits 0; `grep -c 'ADR-0089' .prism/spec/adrs/_toolkit/0083-retro-is-a-fixed-stage-on-folder-plans.md .prism/spec/adrs/_toolkit/0068-retro-charter-and-two-grain-cadence.md .prism/spec/adrs/_toolkit/README.md` prints at least 1 for each; `grep -c '0089-' .ai-skills/definitions/seed-curation.json` prints 1; `test ! -e templates/install/.prism/spec/adrs/_toolkit/0089-the-close-step-always-runs-and-the-retro-report-runs-on-a-trigger.md`.
- [ ] **AC-12** (part 2) Given the Iris row and the user docs, When read, Then `skills-ecosystem.md` and its seed twin carry the same Iris row saying the close step always runs and the report runs on a trigger, and `docs/ai-skills/iris.md` and `docs/personas.md` no longer call the retro a fixed stage that always writes a report. (REQ-13)
  - Evidence (machine): `diff <(grep -F '| prism-retro ' .prism/architect/_toolkit/skills-ecosystem.md) <(grep -F '| prism-retro ' templates/install/.prism/architect/_toolkit/skills-ecosystem.md)` exits 0 with both non-empty, `grep -c 'retro-trigger' .prism/architect/_toolkit/skills-ecosystem.md` prints at least 1, and `grep -c 'fixed last stage' docs/ai-skills/iris.md docs/personas.md` prints 0 for both.
- [ ] **AC-13** (part 2) Given the compaction text, When read, Then the `--event=SessionStart` bullet of `hook-runtime.md` (canonical and seed twin) and the header of `compact-handoff.mjs` say the note adds a `## History` line on a flat plan and writes only scope changes and open questions into `## Decisions` on a plan folder. (REQ-14)
  - Evidence (machine): `awk '/^### Compaction arms/{f=1; next} /^#/{f=0} f' .prism/architect/_toolkit/hook-runtime.md | grep -c 'scope changes and open questions'` prints at least 2 (the bullet and the sentence after the plan-path paragraph), the same on the seed twin, and `sed -n 1,40p scripts/ai-skills/hooks/compact-handoff.mjs | grep -c 'scope changes and open questions'` prints at least 2.
- [ ] **AC-14** (both parts) Given each part's head, When CI runs, Then `pnpm prism:check` passes on both platforms. (REQ-16)
  - Evidence (machine): the PR's check rollup shows the `prism:check` job green on ubuntu and windows for each part.
- [ ] **AC-15** (part 2) Given this plan's own close, When `prism-retro` runs on it after part 2's final review, Then it runs `retro-trigger.mjs` and either writes `Retro: none — no trigger` with no new file under `.prism/retros/` for prism-565 (exit 1), or writes a report whose header carries `**Trigger:**` with the script's reasons and sets `Retro:` to its path (exit 0). (REQ-4, REQ-5, REQ-6)
  - Evidence (human): the `retro:` commit's diff, read against `node scripts/ai-skills/hooks/plan/retro-trigger.mjs .prism/plans/prism-565` run at that commit's parent.

## Tasks

This child ships as a two-PR stack. **Part 1 (scripts, checks, delivery, architect-doc entries)** is T1 to T7. **Part 2 (skill split, template, rules, ADR, docs, compaction text)** is T8 to T17 and opens with T8, the plan-only commit naming part 1's tasks as shipped. Part 1 touches no skill, rule, reference, template, ADR, or user doc.

Generated copies sit in each part's build task (T7, T17) so each path belongs to one task. A build task commits only the listed paths `git status -s` shows changed, because `plan/commit.mjs` rejects an unchanged path, and reports any other changed path as `unlisted:`. Curated seed twins (`branch-plan.md`, `skills-ecosystem.md`, `hook-runtime.md` under `templates/install/.prism/`) are hand-edited beside their canonical, because the build never rewrites them.

Bundle groups (from `node scripts/ai-skills/hooks/plan/bundles.mjs .prism/plans/prism-565/plan.md`):

Group 1: T1 (architect context `_toolkit/hook-runtime.md`, `_toolkit/review-runtime.md`, `_toolkit/skills-ecosystem.md`, `_toolkit/spec-editing.md`).
Group 2: T4 (architect context `_toolkit/review-runtime.md`, `_toolkit/skills-ecosystem.md`, `_toolkit/spec-editing.md`).
The script added no import edge. Every other task waits on T1, T4, or T8, so later groups print as tasks finish.

### T1: Part 1 — add the shared review-line reader

- files: scripts/ai-skills/hooks/review/lines.mjs, scripts/ai-skills/hooks/review/lines.d.mts, scripts/ai-skills/review-lines.test.ts
- proof: npx tsx --test scripts/ai-skills/review-lines.test.ts && pnpm prism:check-types
- proof fails on main: yes
- depends on: none

Read `## Review` through `sectionBody` in `plan/frontmatter.mjs`; a non-matching line is skipped, not an error. The round-trip case spawns `review/record.mjs` on a temp plan and parses what it wrote.

### T2: Part 1 — add retro-trigger.mjs and share the challenge round pattern

- files: scripts/ai-skills/hooks/plan/retro-trigger.mjs, scripts/ai-skills/hooks/plan/retro-trigger.d.mts, scripts/ai-skills/hooks/plan/auto-approve.mjs, scripts/ai-skills/hooks/plan/auto-approve.d.mts, scripts/ai-skills/plan-retro-trigger.test.ts
- proof: npx tsx --test scripts/ai-skills/plan-retro-trigger.test.ts scripts/ai-skills/plan-auto-approve.test.ts && pnpm prism:check-types
- proof fails on main: yes
- depends on: T1
- behavior change: the symlinked-invocation test skips on Windows when creating the symlink fails with EPERM, as its four sibling symlink tests already do.
- amended: scripts/ai-skills/plan-retro-trigger.test.ts: review round 2 on #566 found the symlink test had no Windows privilege skip, so `T2 fix` adds it.

Export `ROUND_LINE` and the dash-stripping read from `auto-approve.mjs` and import both here, so `- round 3: clean` triggers; `auto-approve.mjs` behavior stays byte-for-byte the same.
Amended tasks come from `parseTasks`' `amended` list; a `parseTasks` throw is exit 2, and the entry guard is the realpath guard the other commands use.

### T3: Part 1 — add merge-bar.mjs

- files: scripts/ai-skills/hooks/review/merge-bar.mjs, scripts/ai-skills/hooks/review/merge-bar.d.mts, scripts/ai-skills/review-merge-bar.test.ts
- proof: npx tsx --test scripts/ai-skills/review-merge-bar.test.ts && pnpm prism:check-types
- proof fails on main: yes
- depends on: T1

Run git as argv arrays with no shell; the plan folder is the plan's directory relative to the repo root (walk up to `.git`), with `\` turned to `/` before it is compared with git's paths.
Test repos are temp `git init` dirs committed with `-c user.name=t -c user.email=t@t`, so the suite runs on the Windows CI leg with no global git identity.

### T4: Part 1 — rekey the retro-line lint on the closed line

- files: scripts/ai-skills/plan-retro-line.ts, scripts/ai-skills/plan-retro-line.test.ts
- proof: npx tsx --test scripts/ai-skills/plan-retro-line.test.ts && pnpm prism:retro-line
- proof fails on main: yes
- depends on: none
- behavior change: the PR-review-keyed cases are replaced by `> Closed:`-keyed ones, because the PR reviewer is retired and the lint no longer reads review lines.

`> Closed: <date>` counts only before the first `##` heading; keep the entry point, file selection, and the repo-wide positive-control case.

### T5: Part 1 — deliver the three new modules

- files: scripts/ai-skills/update.ts, scripts/ai-skills/plan-runtime-delivery.test.ts
- proof: npx tsx --test scripts/ai-skills/plan-runtime-delivery.test.ts
- proof fails on main: yes
- depends on: T1, T2, T3

Add `plan/retro-trigger.mjs`, `review/lines.mjs`, and `review/merge-bar.mjs` to `HOOK_RUNTIME_FILES` and the test's expected list; none is an entry point.

### T6: Part 1 — document the new scripts and the rekeyed lint

- files: .prism/architect/_toolkit/plan-chain-scripts.md, .prism/architect/_toolkit/review-runtime.md
- proof: grep -q 'retro-trigger' .prism/architect/_toolkit/plan-chain-scripts.md && grep -q '^## review/lines.mjs' .prism/architect/_toolkit/review-runtime.md && grep -q '^## review/merge-bar.mjs' .prism/architect/_toolkit/review-runtime.md && ! grep -q 'pr-review round' .prism/architect/_toolkit/review-runtime.md
- depends on: T2, T3, T4, T5

Walk every new claim against T1 to T5's code per `.prism/rules/architect-doc-verification.md`; add the three paths to `review-runtime.md`'s opening list and Invocation paragraph without a count.

### T7: Part 1 — regenerate the outputs

- files: .claude/architect/_toolkit/plan-chain-scripts.md, .codex/architect/_toolkit/plan-chain-scripts.md, .cursor/architect/_toolkit/plan-chain-scripts.md, templates/install/.prism/architect/_toolkit/plan-chain-scripts.md, .claude/architect/_toolkit/review-runtime.md, .codex/architect/_toolkit/review-runtime.md, .cursor/architect/_toolkit/review-runtime.md, templates/install/.prism/architect/_toolkit/review-runtime.md
- proof: pnpm prism:build && pnpm prism:check
- depends on: T1, T2, T3, T4, T5, T6

Fix a failure in the task that owns the source file, not here.

### T8: Part 2 — record part 1 as shipped

- files: .prism/plans/prism-565/plan.md
- proof: node scripts/ai-skills/hooks/plan/tasks.mjs .prism/plans/prism-565/plan.md
- depends on: T7

The session makes this commit on part 2's branch, cut from `main` after part 1 squash-merges, with subject `T1-T8: Record part 1 as shipped`, per the stacked-ticket note in `plan-chain-scripts.md`.

### T9: Part 2 — split prism-retro into the close step and the triggered report

- files: .ai-skills/skills/prism-retro/shared.md, .ai-skills/skills/prism-retro/frontmatter.yml
- proof: grep -q 'plan/retro-trigger.mjs' .ai-skills/skills/prism-retro/shared.md && grep -q 'none — no trigger' .ai-skills/skills/prism-retro/shared.md && ! grep -q 'fixed last stage' .ai-skills/skills/prism-retro/shared.md .ai-skills/skills/prism-retro/frontmatter.yml
- depends on: T8

The skill loads 118 of 120 lines at `02e9aeb0`, `retro-report.md` included, and T10 adds one, so T9 must end at least one line shorter than it starts; cut, never move (`skill-authoring.md`).
The refuted-Decision clause applies only on a report run, review-miss classes stay in the close step, and the description keeps its `"Iris"` trigger under 1,000 characters.

### T10: Part 2 — add the trigger line to the retro-report template

- files: .prism/templates/retro-report.md
- proof: grep -q '^\*\*Trigger:\*\*' .prism/templates/retro-report.md
- depends on: T8

Put the line in the per-PR skeleton beside `**Grain:**`; the epic skeleton gets none, because an epic always runs.

### T11: Part 2 — describe the close step in branch-plan

- files: .prism/rules/branch-plan.md, templates/install/.prism/rules/branch-plan.md
- proof: ! grep -q 'final PR-review verdict' .prism/rules/branch-plan.md templates/install/.prism/rules/branch-plan.md && grep -q 'none — no trigger' .prism/rules/branch-plan.md && grep -q 'none — no trigger' templates/install/.prism/rules/branch-plan.md
- depends on: T8

Edit the reflect-and-close, universal-gate, and verdict-gate paragraphs only; the twin is curated, so apply the same edits wherever it holds the same paragraph.

### T12: Part 2 — update the resume row, shipping flow, and merge bar

- files: .prism/rules/workflow.md, .prism/references/shipping-flow.md, .prism/rules/git-conventions.md
- proof: grep -q 'retro-trigger.mjs' .prism/rules/workflow.md && grep -q 'close step' .prism/references/shipping-flow.md && grep -q 'merge-bar.mjs' .prism/rules/git-conventions.md
- depends on: T8

The merge sentence names `merge-bar.mjs <plan.md> --head <PR head sha>` and green CI on that head; the flat-plan merge path is unchanged.
`workflow.md` is always-on and counted against the word budget, so the row grows by no more than a clause.

### T13: Part 2 — write ADR-0089 and point 0083 and 0068 at it

- files: .prism/spec/adrs/_toolkit/0089-the-close-step-always-runs-and-the-retro-report-runs-on-a-trigger.md, .prism/spec/adrs/_toolkit/0083-retro-is-a-fixed-stage-on-folder-plans.md, .prism/spec/adrs/_toolkit/0068-retro-charter-and-two-grain-cadence.md, .prism/spec/adrs/_toolkit/README.md, .ai-skills/definitions/seed-curation.json
- proof: pnpm prism:crossref-lint && grep -c '0089-' .ai-skills/definitions/seed-curation.json
- depends on: T8

Add the 0089 row and end the 0083 and 0068 rows with "Amended by ADR-0089."; add 0089 to `excluded` after 0088, and leave the seed index twin alone (it holds no rows).
Record both rejected alternatives the spec names; if 0089 is taken when this runs, take the next number and add an `amended:` line here.

### T14: Part 2 — update the Iris row

- files: .prism/architect/_toolkit/skills-ecosystem.md, templates/install/.prism/architect/_toolkit/skills-ecosystem.md
- proof: diff <(grep -F '| prism-retro ' .prism/architect/_toolkit/skills-ecosystem.md) <(grep -F '| prism-retro ' templates/install/.prism/architect/_toolkit/skills-ecosystem.md) && grep -q 'retro-trigger' .prism/architect/_toolkit/skills-ecosystem.md
- depends on: T8

The row stays identical in both files and attributes the trigger to the script, not to a person.
It names no `ADR-NNNN`, because `crossref-lint` forbids one under `templates/install/`, where numbered ADRs never ship.

### T15: Part 2 — fix the compaction text

- files: .prism/architect/_toolkit/hook-runtime.md, templates/install/.prism/architect/_toolkit/hook-runtime.md, scripts/ai-skills/hooks/compact-handoff.mjs
- proof: test "$(awk '/^### Compaction arms/{f=1; next} /^#/{f=0} f' .prism/architect/_toolkit/hook-runtime.md | grep -c 'scope changes and open questions')" -ge 2 && test "$(awk '/^## Compaction arms/{f=1; next} /^#/{f=0} f' templates/install/.prism/architect/_toolkit/hook-runtime.md | grep -c 'scope changes and open questions')" -ge 2 && test "$(sed -n 1,40p scripts/ai-skills/hooks/compact-handoff.mjs | grep -c 'scope changes and open questions')" -ge 2
- depends on: T8
- amended: templates/install/.prism/architect/_toolkit/hook-runtime.md: the seed twin titles the section `## Compaction arms`, one level up from the canonical's `###`, so the proof's seed awk matched nothing and now reads `##`.

Text only: change the `--event=SessionStart` bullet and the sentence after the plan-path paragraph, and the two matching header sentences, to match the note's own text at lines 242 and 246.
Keep `scope changes and open questions` on one line in the `compact-handoff.mjs` header, because the proof counts lines and a wrap at a ` * ` break fails it.

### T16: Part 2 — update the user docs

- files: docs/ai-skills/iris.md, docs/personas.md
- proof: ! grep -q 'fixed last stage' docs/ai-skills/iris.md docs/personas.md && grep -q 'trigger' docs/ai-skills/iris.md
- depends on: T9

### T17: Part 2 — regenerate the outputs

- files: .claude/skills/prism-retro/SKILL.md, .cursor/skills/prism-retro/SKILL.md, .claude/agents/prism-retro.md, .codex/agents/prism-retro.toml, .claude/templates/retro-report.md, .codex/templates/retro-report.md, .cursor/templates/retro-report.md, templates/install/.prism/templates/retro-report.md, .claude/rules/branch-plan.md, .codex/rules/branch-plan.md, .cursor/rules/branch-plan.mdc, .claude/rules/workflow.md, .codex/rules/workflow.md, .cursor/rules/workflow.mdc, templates/install/.prism/rules/workflow.md, .claude/rules/git-conventions.md, .codex/rules/git-conventions.md, .cursor/rules/git-conventions.mdc, templates/install/.prism/rules/git-conventions.md, .claude/references/shipping-flow.md, .codex/references/shipping-flow.md, .cursor/references/shipping-flow.md, templates/install/.prism/references/shipping-flow.md, .claude/spec/adrs/_toolkit/0089-the-close-step-always-runs-and-the-retro-report-runs-on-a-trigger.md, .codex/spec/adrs/_toolkit/0089-the-close-step-always-runs-and-the-retro-report-runs-on-a-trigger.md, .cursor/spec/adrs/_toolkit/0089-the-close-step-always-runs-and-the-retro-report-runs-on-a-trigger.md, .claude/spec/adrs/_toolkit/0083-retro-is-a-fixed-stage-on-folder-plans.md, .codex/spec/adrs/_toolkit/0083-retro-is-a-fixed-stage-on-folder-plans.md, .cursor/spec/adrs/_toolkit/0083-retro-is-a-fixed-stage-on-folder-plans.md, .claude/spec/adrs/_toolkit/0068-retro-charter-and-two-grain-cadence.md, .codex/spec/adrs/_toolkit/0068-retro-charter-and-two-grain-cadence.md, .cursor/spec/adrs/_toolkit/0068-retro-charter-and-two-grain-cadence.md, .claude/spec/adrs/_toolkit/README.md, .codex/spec/adrs/_toolkit/README.md, .cursor/spec/adrs/_toolkit/README.md, .claude/architect/_toolkit/skills-ecosystem.md, .codex/architect/_toolkit/skills-ecosystem.md, .cursor/architect/_toolkit/skills-ecosystem.md, .claude/architect/_toolkit/hook-runtime.md, .codex/architect/_toolkit/hook-runtime.md, .cursor/architect/_toolkit/hook-runtime.md, AGENTS.md, .codex/config.toml, .claude/architect/_toolkit/review-runtime.md, .codex/architect/_toolkit/review-runtime.md, .cursor/architect/_toolkit/review-runtime.md, templates/install/.prism/architect/_toolkit/review-runtime.md
- proof: pnpm prism:build && npx tsx --test scripts/ai-skills/skill-loaded-lines.test.ts && pnpm prism:check
- depends on: T9, T10, T11, T12, T13, T14, T15, T16
- amended: .claude/architect/_toolkit/review-runtime.md: `T6 fix` edits the canonical `review-runtime.md`, so T17 regenerates its three host copies and its seed copy.

A `prism-retro` load over 120 is fixed by cutting text in T9's files, never by an allowlist entry.

## Challenge

round 1: clean
  - plan (non-blocking): the trigger fires on every recorded plan. Of the seven folder plans with review lines (prism-530, 537, 544, 550, 553, 557, 558), each holds at least one non-`clean` line, so `Retro: none — no trigger` is unreachable on real data and AC-15's exit 1 path will not be exercised. The spec follows the intent's "a review asked for changes" literally, so this is not a plan defect; list it for the person, and record the measured rate as a Decision.
  - T13 (non-blocking): AC-11 greps `ADR-0089` in the ADR README, but the task does not say to add an amended-by note to the 0083 and 0068 index rows, so a builder adding only the 0089 row fails that grep at verify. Also say the Iris row and the seed twins carry no `ADR-NNNN` text, because `crossref-lint` forbids one under `templates/install/` and AC-12 needs the two rows identical.
  - AC-7 (non-blocking): its evidence is two phrase greps, so a skill that writes the report on every run, or ignores exit 2, still passes. Only AC-15 reads behavior, and it is human evidence.
  - T3 (non-blocking): on the Windows leg `path.relative` returns backslashes while git prints forward slashes, so the plan-folder prefix test needs the separators normalized. Say so in a gotcha line.
  - T15 (non-blocking): the proof passes when only one of the bullet, the sentence after the plan-path paragraph, and the header sentences changes. Check each of the three places.
  - plan (non-blocking): `docs/what-prism-writes.md` is a "complete inventory" of delivered runtime files and is outside Affected systems, so T5 leaves it stale. Record it as child 16's sweep, the way the `parameterization.md` Decision does.
  - T9 (non-blocking, unverified): the current loaded-line count of `prism-retro` was not measured, so the headroom under 120 for the trigger step is unknown. Measure it before T9 starts.
round 2: clean
  - T15 (non-blocking): AC-13 and T15's proof count lines, not occurrences, and the `compact-handoff.mjs` header wraps near 72 columns, so a builder who lets `scope changes and open questions` break across a ` * ` line fails the proof. Keep the phrase on one line.
  - T9 (non-blocking, unverified): the 118-of-120 loaded-line figure now in the task was not re-measured this round. `skill-loaded-lines.test.ts` at T17 is the gate, so a miss costs a cut in T9's files and no more.
  - T7 and T17 (non-blocking): the generated-copy lists were not checked against a build. A path the build changes that is not listed comes back as `unlisted:` in the build report, which the plan already tells the builder to do.
  - AC-7 (non-blocking, carried from round 1): its evidence is still two phrase greps, so only AC-15 reads behavior. Accepted, because the retro's own close grades it.

## Decisions

- **This child ships as a two-PR stack, cut after T7.** The spec proposes the cut and the work spans well over 10 files once generated copies count. Part 1 (the reader, both scripts, the rekeyed lint, delivery, and their architect-doc entries) works alone: the old retro still writes `Retro: <report path>`, which the rekeyed lint passes. Part 2 (the skill split, template, rules, ADR, docs, compaction text) needs the trigger script to exist. Rejected: one PR, past the size where review gets painful, and cutting the lint into part 2, which would leave part 1's merge bar and trigger with no doc saying what the retro line now means.
- **Part 1 ships from T7, not from the resume table.** After T7, part 1's verify, review, and PR stages run while T8 to T17 are still open, and the resume table would read an uncommitted task and send the session back to implement. The session drives part 1's verify, review, and PR from this Decision, part 2 resumes from T8 on a branch cut from `main`, and the retro runs once, after part 2's review. Rejected: running the close step on part 1, which would close a plan with half its tasks open.
- **No ADR for the merge-bar tie, confirmed.** Applied `.prism/references/triple-gated-adr-criterion.md` as the spec asks: the tie is one script and one sentence in `git-conventions.md`, reversible by editing both, so the hard-to-reverse gate does not fire. `git-conventions.md` and `review-runtime.md` carry the rule.
- **The report trigger fires on every folder plan recorded so far.** Challenge round 1 found that prism-530, 537, 544, 550, 553, 557, and 558 each hold at least one review line that is not `clean`, so on today's record `Retro: none — no trigger` would never be written and the report would run every time. The spec reads the intent's "a review asked for changes" literally, and the third amendment's two-round, zero-Major exit should make clean first rounds more common from here, so the trigger stays as specified. Hunter should expect the report on most tickets until that shows up in the record. AC-15 grades whichever path this ticket's own close takes, and AC-7's phrase greps lean on it for behavior. Rejected: keying the review reason on the last line only, which would hide a review that asked for changes and is a change to the intent's wording.
- **`docs/what-prism-writes.md` is left for child 16.** It lists the delivered runtime files and goes stale when T5 adds three, but it sits outside this child's Affected systems. Child 16's docs sweep covers the pages the earlier children changed, as the spec's Decision on `docs/parameterization.md` already routes.
- **The merge rule names merge-bar.mjs in part 2, not part 1.** Part 1 adds the script and documents it in `review-runtime.md`, and part 2's T12 changes the rule text. Until part 2 merges, the session's merge bar is the existing sentence, which a bare `clean` already meets. Rejected: editing `git-conventions.md` in part 1, which would put an always-on rule into the scripts PR the spec keeps rule-free.
- **Part 1's three review-round-2 leftovers are fixed in part 2.** Round 2 is the review cap, so #566 listed them as open items: `review-runtime.md`'s merge-bar exit-2 list omits a failed `git log` or `git diff-tree`, the symlinked-invocation test in `plan-retro-trigger.test.ts` has no Windows EPERM skip, and no test covers the exemption for a commit that changes no files. They ship as `T2 fix`, `T3 fix`, and `T6 fix` commits, because they finish part 1's own tasks. Rejected: a separate follow-up PR, which would cost a third review cycle for three small edits in files this ticket owns.
- **AC-13's seed-twin evidence reads `##`, not `###`.** Its Evidence runs `awk '/^### Compaction arms/...'` over `templates/install/.prism/architect/_toolkit/hook-runtime.md`, which titles the section `## Compaction arms`, so that half matches nothing on any tree. The review grades AC-13's seed half with `^## Compaction arms`. The criterion's statement is unchanged and only its command was wrong, the same typo T15's proof carried. Rejected: rewriting the criterion's Evidence line, because agents propose criterion changes and don't make them.

## Verification

verdict: done
base: fe39c308
head: 96dbe912

| check | result | evidence |
| --- | --- | --- |
| typecheck | pass | part 2 of 2, T8-T17 and T2, T3, T6 fixes: local run, log not kept |
| lint | pass | part 2 of 2, T8-T17 and T2, T3, T6 fixes: local run, log not kept |
| test | pass | part 2 of 2, T8-T17 and T2, T3, T6 fixes: local run, log not kept |
| build | pass | part 2 of 2, T8-T17 and T2, T3, T6 fixes: local run, log not kept |
| format | n/a: not configured | part 2 of 2, T8-T17 and T2, T3, T6 fixes: none |
| spec | pass | part 2 of 2, T8-T17 and T2, T3, T6 fixes: local run, log not kept |

### Failures

- none

## Review

- review round 1 at 36d2c4bc (part 1 of 2): clean
- review round 2 at 4913fb07 (part 1 of 2): clean
