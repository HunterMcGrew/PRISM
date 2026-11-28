---
title: Small size
ticket: https://github.com/HunterMcGrew/PRISM/issues/568
stage: plan
status: approved
approved_by: auto
approved_at: 2026-11-27
---

## Acceptance Criteria

Child 14 of the Kitchen Line epic (#499), from its `## Children` row 14 and `spec.md`. Each criterion names the part that builds it and cites the spec requirement it grades as `(REQ-n)`. Part 1's review grades only part 1's criteria.

- [ ] **AC-1** (part 1) Given a diff against the default branch, When `size.mjs <base>` runs, Then 90 changed product lines in one area with no new product file print `small` and exit 0; 120 changed product lines print `standard` with a `lines:` reason and exit 1; an edit to `package.json` prints `standard` with a `stop path:` reason and exit 1; two new product files, product files in two areas, and a binary product file each add their own reason; test, doc, plan, lockfile, and config files outside the stop paths, and any other `.prism/**` path such as a new `.prism/metrics/review-misses.jsonl`, count toward no limit; a rename is not a new file; `--tree <treeish>` measures that tree in place of the working tree; and an unknown `<base>` or a config that does not parse exits 2. (REQ-1, REQ-2, REQ-3)
  - Evidence (machine): `npx tsx --test scripts/ai-skills/plan-size.test.ts` passes with one case per outcome above, a `.prism/metrics` case, a `--tree` case, and a case where 90 added and 150 deleted product lines print `small` included, and the file does not exist on `main` at `1b3904cd`.
- [ ] **AC-2** (part 1) Given a folder-plan branch whose `intent.md` in the would-be tree says `size: small`, When an agent commits a change that takes the diff past the small limits, Then the commit gate denies it naming the size check, the script's reasons, and the remedy to set `size: standard` and ask for a fresh `approve`; the same commit passes once the intent says `size: standard`; and the spawned gate passes the remedy commit for a diff that fits. (REQ-8, REQ-10)
  - Evidence (machine): `npx tsx --test scripts/ai-skills/commit-gate-size.test.ts` passes, holding the three legs by name, and `grep -n 'SIZE_CHECK' scripts/ai-skills/hooks/commit-gate.mjs` prints a line where `GATE_CHECKS` lists it second, after `CONFIG_CHECK`. UNMET looks like: a leg missing, or the size check after the weakened-tests check.
- [ ] **AC-3** (part 1) Given a branch whose intent does not say `small`, or whose `origin/<defaultBranch>` ref cannot be resolved, When it commits a diff over the small limits, Then the size check passes it; and given a small branch, When a commit removes a line from a test file, Then the weakened-tests deny names going on as a standard ticket as its remedy. (REQ-8, REQ-9)
  - Evidence (machine): `npx tsx --test scripts/ai-skills/commit-gate-size.test.ts scripts/ai-skills/commit-gate-test-guard.test.ts scripts/ai-skills/commit-gate.test.ts` passes, with a case for each condition above.
- [ ] **AC-4** (part 1) Given a consumer update, When the hook runtime is delivered, Then `.claude/hooks/plan/size.mjs` exists with the `@prism-hook-runtime` marker on line 1, the source has a `.d.mts` sidecar, and it imports only `node:` builtins and relative runtime modules. (REQ-14)
  - Evidence (machine): `npx tsx --test scripts/ai-skills/plan-runtime-delivery.test.ts` passes; `head -1 scripts/ai-skills/hooks/plan/size.mjs` prints the marker; `test -f scripts/ai-skills/hooks/plan/size.d.mts` exits 0; `grep -hE '^import .* from "[^.n]' scripts/ai-skills/hooks/plan/size.mjs` prints nothing.
- [ ] **AC-5** (part 1) Given the architect docs, When read, Then `plan-chain-scripts.md` describes `size.mjs` (its limits, product-code classes, area rule, and exit codes) and names `size` among the commands, and `hook-runtime.md`, canonical and seed twin, describes the commit gate's size check and puts it second in the check order. (REQ-15)
  - Evidence (machine): `grep -n 'size.mjs' .prism/architect/_toolkit/plan-chain-scripts.md` prints a line in the Contracts list and one in the Invocation paragraph; `grep -c 'four checks' .prism/architect/_toolkit/hook-runtime.md templates/install/.prism/architect/_toolkit/hook-runtime.md` prints at least 1 for each, and `grep -c 'three checks'` on the same two files prints 0 for each.
- [ ] **AC-6** (part 2) Given a plan folder with a small intent, When `approve.mjs` approves it, Then it writes `plan.md` from `plan-small.md` with the intent's title and ticket and its approval lines, reading `status: approved`, holding `## Verification`, `## Review`, and `## PR Readiness` with the `Retro:` line, and no `## Tasks`; it refuses `size: small` in an `epic-*/` folder or with a Design line of `needed` or `supplement`; it refuses before writing either file when the template is missing; and on a re-approval it leaves an existing `plan.md` byte-for-byte unchanged. (REQ-4, REQ-5)
  - Evidence (machine): `npx tsx --test scripts/ai-skills/plan-approve.test.ts scripts/ai-skills/plan-templates.test.ts` passes with a case for each outcome above.
- [ ] **AC-7** (part 2) Given a plan copied from `plan-small.md`, When `verify/record.mjs`, `review/record.mjs`, `retro-trigger.mjs`, `merge-bar.mjs`, and the retro-line check run on it, Then none errors, `parseTasks` returns no task, the plan-folder citation lint passes it, and `retro-trigger.mjs` exits 1 when every review line reads `clean`. (REQ-4, REQ-13)
  - Evidence (machine): `npx tsx --test scripts/ai-skills/plan-templates.test.ts` passes with a case that runs each script on the copied template.
- [ ] **AC-8** (part 2) Given the intent template and `prism-intent`, When read, Then the template's `size:` comment names `small` and its limits, the skill proposes `size: small` with its reason when the work is code only and its expected diff fits the limits, and the skill commits a small intent's stamp with both `intent.md` and `plan.md`. (REQ-6)
  - Evidence (machine): `grep -n 'small' .prism/templates/intent.md` prints the `size:` comment line; `grep -c 'small' .ai-skills/skills/prism-intent/shared.md` prints at least 1, and `grep -n 'plan.md' .ai-skills/skills/prism-intent/shared.md` prints a line in the approval paragraph.
- [ ] **AC-9** (part 2) Given the skill-size check, When it runs, Then `prism-intent` loads 120 lines or fewer and `OVER_CAP_ALLOWLIST` is still `{}`. (REQ-16)
  - Evidence (machine): `npx tsx --test scripts/ai-skills/skill-loaded-lines.test.ts` passes, and `grep -n 'OVER_CAP_ALLOWLIST: Record<string, { thinnedBy: string; max: number }> = {};' scripts/ai-skills/skill-loaded-lines.test.ts` prints a line.
- [ ] **AC-10** (part 2) Given `prism-implement`, When read, Then on a small ticket it builds in the session test-first with no bundle and no build report, runs `size.mjs` with the default branch before each commit, commits as `<ticketPrefix>-<digits>: <summary>` through `plan/commit.mjs`, and stops so the ticket goes on as a standard one when the script reports `standard`. (REQ-7)
  - Evidence (machine): `grep -n 'size.mjs' .ai-skills/skills/prism-implement/shared.md` prints a line that also names `standard`, and `grep -n 'TICKET_PREFIX}-<digits>' .ai-skills/skills/prism-implement/shared.md` prints a line (absent on `main`, where the only `TICKET_PREFIX` is the PR title's).
- [ ] **AC-11** (part 2) Given the workflow rule, When its resume table is read, Then the spec row opens with `standard or epic`, the plan, challenge, plan-approval, and task rows open with `standard`, the verify, review, PR, and retro rows open with `small or standard`, and one row reads `small, no ticket-subject commit since the approving commit` and runs implement; and the rule states the small size, its flow, and the small commit subject. (REQ-11, REQ-12)
  - Evidence (machine): `grep -c '^| small or standard' .prism/rules/workflow.md` prints 4, `grep -c '^| small, no ticket-subject commit' .prism/rules/workflow.md` prints 1, `grep -c '^| standard or epic' .prism/rules/workflow.md` prints 1, and `grep -n '\*\*Small:\*\*' .prism/rules/workflow.md` prints a line.
- [ ] **AC-12** (part 2) Given `git-conventions.md`, `ticket-workflows.md` (canonical and seed twin), `plan-chain-scripts.md`, and `docs/workflow.md`, When read, Then `git-conventions.md` gives the small subject form, the sizes text in the other three names three sizes, and `plan-chain-scripts.md` describes `plan-small.md` and the copy `approve.mjs` makes. (REQ-12, REQ-15)
  - Evidence (machine): `grep -n 'small' .prism/rules/git-conventions.md` prints a line naming the ticket subject; `grep -c 'standard. or .epic.,' .prism/architect/_toolkit/ticket-workflows.md templates/install/.prism/architect/_toolkit/ticket-workflows.md` prints 0 for each, and `grep -c 'small'` on those two and `docs/workflow.md` prints at least 1 for each; `grep -n 'plan-small.md' .prism/architect/_toolkit/plan-chain-scripts.md` prints a line in the Templates paragraph and one in the `approve.mjs` contract.
- [ ] **AC-13** (both parts) Given each part's head, When CI runs, Then `pnpm prism:check` passes on both platforms. (REQ-16)
  - Evidence (machine): the PR's check rollup shows the `prism:check` job green on ubuntu and windows for each part.

## Tasks

This child ships as a two-PR stack. **Part 1 (size script, commit gate arm, delivery, architect-doc entries)** is T1 to T5. **Part 2 (template, approval copy, intent, implement, rules, docs)** is T6 to T13 and opens with T6, the plan-only commit naming part 1's tasks as shipped. Part 1 touches no skill, rule, template, or user doc, and its gate arm is dormant until part 2 lets an intent say `size: small`.

Generated copies sit in each part's build task (T5, T13) so each path belongs to one task. A build task commits only the listed paths `git status -s` shows changed, because `plan/commit.mjs` rejects an unchanged path, and reports any other changed path as `unlisted:`. The curated seed twins of `hook-runtime.md` and `ticket-workflows.md` under `templates/install/.prism/` are hand-edited beside their canonical, because the build never rewrites them.

Bundle groups (from `node scripts/ai-skills/hooks/plan/bundles.mjs .prism/plans/prism-568/plan.md`):

Group 1: T1 (architect context `_toolkit/hook-runtime.md`, `_toolkit/plan-chain-scripts.md`, `_toolkit/skills-ecosystem.md`, `_toolkit/spec-editing.md`).
The script added no import edge. Every other task waits on T1 or T6, so later groups print as tasks finish.

### T1: Part 1 — add size.mjs

- files: scripts/ai-skills/hooks/plan/size.mjs, scripts/ai-skills/hooks/plan/size.d.mts, scripts/ai-skills/plan-size.test.ts
- proof: npx tsx --test scripts/ai-skills/plan-size.test.ts && pnpm prism:check-types
- proof fails on main: yes
- depends on: none

Export the pure classifier and one reader that takes an optional tree, which `--tree` and the commit gate (with `index.treeHash`) both call, so there is one numstat parser; the test covers `--tree`, and `documentation.location` (`docs/` here) is normalized to a prefix with no trailing slash.
Reuse `readPlanConfig`, `resolveStopPaths`/`matchStopPath`, and `resolveTestGlobs` (from `commit-gate/test-guard.mjs`); only added product lines count and a product file with none counts toward no limit, per Hunter's line-count Decision, and every `.prism/**` path not on a stop path is a record, never product code, per its Decision.

### T2: Part 1 — add the commit gate's size check and the small-branch test remedy

- files: scripts/ai-skills/hooks/commit-gate/checks.mjs, scripts/ai-skills/hooks/commit-gate/checks.d.mts, scripts/ai-skills/hooks/commit-gate.mjs, scripts/ai-skills/commit-gate-size.test.ts, scripts/ai-skills/commit-gate-checks.test.ts, scripts/ai-skills/hooks/commit-gate/test-guard.mjs, scripts/ai-skills/hooks/commit-gate/test-guard.d.mts, scripts/ai-skills/commit-gate-test-guard.test.ts
- proof: npx tsx --test scripts/ai-skills/commit-gate-size.test.ts scripts/ai-skills/commit-gate-checks.test.ts scripts/ai-skills/commit-gate-test-guard.test.ts scripts/ai-skills/commit-gate.test.ts && pnpm prism:check-types
- proof fails on main: yes
- depends on: T1

`loadContext` gains the docs root and a `smallIntent` flag read with `git show <index.treeHash>:<plan folder>/intent.md`, never the working copy; `GATE_CHECKS` becomes config, size, weakened tests, stops, and the base is `git merge-base HEAD origin/<defaultBranch>` with no HEAD fallback (fixtures set it with `git update-ref`).
The weakened-tests deny keeps its reason and, on `ctx.smallIntent`, swaps only its remedy to setting `size: standard` and asking for a fresh `approve`; the size check returns null on any thrown error, and the header order lines ("three checks" in `commit-gate.mjs`, "config, weakened tests, and stops" in `checks.mjs`) name the size check second.

### T3: Part 1 — deliver size.mjs

- files: scripts/ai-skills/update.ts, scripts/ai-skills/plan-runtime-delivery.test.ts
- proof: npx tsx --test scripts/ai-skills/plan-runtime-delivery.test.ts
- proof fails on main: yes
- depends on: T1

Add `plan/size.mjs` to `HOOK_RUNTIME_FILES` only, not to `HOOK_RUNTIME_ENTRY_POINTS`, since it runs as `node <file>`.

### T4: Part 1 — document size.mjs and the size check

- files: .prism/architect/_toolkit/plan-chain-scripts.md, .prism/architect/_toolkit/hook-runtime.md, templates/install/.prism/architect/_toolkit/hook-runtime.md
- proof: grep -n 'size.mjs' .prism/architect/_toolkit/plan-chain-scripts.md && grep -c 'four checks' .prism/architect/_toolkit/hook-runtime.md templates/install/.prism/architect/_toolkit/hook-runtime.md && ! grep -q 'three checks' .prism/architect/_toolkit/hook-runtime.md templates/install/.prism/architect/_toolkit/hook-runtime.md && pnpm prism:crossref-lint
- depends on: T2, T3

Walk every claim against the T1 and T2 source per `architect-doc-verification.md`; the seed twin carries the same commit-gate paragraphs with unreachable references dropped, per `install-layout.md`.
Both files say "three checks" twice, in the flag-deny paragraph and the check-order sentence, and every one becomes "four checks", which AC-5's evidence greps for.

### T5: Part 1 — regenerate the outputs

- files: .claude/architect/_toolkit/plan-chain-scripts.md, .codex/architect/_toolkit/plan-chain-scripts.md, .cursor/architect/_toolkit/plan-chain-scripts.md, templates/install/.prism/architect/_toolkit/plan-chain-scripts.md, .claude/architect/_toolkit/hook-runtime.md, .codex/architect/_toolkit/hook-runtime.md, .cursor/architect/_toolkit/hook-runtime.md
- proof: pnpm prism:build && pnpm prism:check
- depends on: T1, T2, T3, T4

Fix a failure in the task that owns the source file, not here.

### T6: Part 2 — record part 1 as shipped

- files: .prism/plans/prism-568/plan.md
- proof: node scripts/ai-skills/hooks/plan/tasks.mjs .prism/plans/prism-568/plan.md
- depends on: T5

The session makes this commit on part 2's branch, cut from `main` after part 1 squash-merges, with subject `T1-T6: Record part 1 as shipped`, per the stacked-ticket note in `plan-chain-scripts.md`.

### T7: Part 2 — add the plan-small.md template

- files: .prism/templates/plan-small.md, scripts/ai-skills/plan-templates.test.ts
- proof: npx tsx --test scripts/ai-skills/plan-templates.test.ts && pnpm prism:plan-citations
- proof fails on main: yes
- depends on: T6

Frontmatter is `title`, `ticket`, `stage: plan`, `status: draft`; the headings are exactly Verification, Review, and PR Readiness with `Retro:` last, each comment copied from `plan.md`'s template so the two never describe a record differently.
The test copies the template into a temp plan folder and runs both record scripts, `retro-trigger.mjs`, `merge-bar.mjs`, and the retro-line check on it (AC-7).

### T8: Part 2 — accept size: small and copy plan-small.md on approval

- files: scripts/ai-skills/hooks/plan/approve.mjs, scripts/ai-skills/hooks/plan/approve.d.mts, scripts/ai-skills/plan-approve.test.ts
- proof: npx tsx --test scripts/ai-skills/plan-approve.test.ts scripts/ai-skills/approve-guard.test.ts && pnpm prism:check-types
- proof fails on main: yes
- depends on: T7
- behavior change: `approve.mjs` accepts `size: small`, so the case asserting `small` is refused drops it from its list, and that loop's name and regex follow the new `size must be small, standard, or epic` refusal.
- amended: scripts/ai-skills/plan-approve.test.ts: the commit gate's weakened-tests check denied T8's first commit, because REQ-5 reverses an existing assertion.

Write `plan.md` through the same injected `write` the intent stamp uses, after every refusal has run, so a missing template refuses with neither file written; skip the copy when `plan.md` already exists.
The plan's approval lines are the ones `stampApproval` writes on the intent in that run, `approved_via` included.

### T9: Part 2 — propose size: small in the intent template and stage

- files: .prism/templates/intent.md, .ai-skills/skills/prism-intent/shared.md
- proof: npx tsx --test scripts/ai-skills/skill-loaded-lines.test.ts && grep -n 'small' .prism/templates/intent.md
- depends on: T6

The skill loads 118 lines today counting the template, so rewrite the template's `size:` line and the skill's Size bullet and approval paragraph in place; net growth past 2 lines fails AC-9.

### T10: Part 2 — build a small ticket in the session

- files: .ai-skills/skills/prism-implement/shared.md
- proof: grep -n 'size.mjs' .ai-skills/skills/prism-implement/shared.md && npx tsx --test scripts/ai-skills/skill-loaded-lines.test.ts
- depends on: T6

Scope the existing "On a plan folder" Startup bullet to a `plan.md` with tasks, since a small plan matches it too, and add the small-ticket bullet beside it; spell the subject `${TICKET_PREFIX}-<digits>: <summary>`, the runtime path `${HOOK_RUNTIME_DIR}`, and the size base `origin/${DEFAULT_BRANCH}`, the base the gate measures.
The build lands as one ticket-subject commit made last, after the size check, because the small resume row reads any such commit as a finished build.

### T11: Part 2 — add the small size to the workflow and git conventions

- files: .prism/rules/workflow.md, .prism/rules/git-conventions.md, scripts/ai-skills/one-review.test.ts
- proof: grep -c '^| small or standard' .prism/rules/workflow.md && grep -n 'small' .prism/rules/git-conventions.md && pnpm prism:crossref-lint && npx tsx --test scripts/ai-skills/one-review.test.ts
- depends on: T6
- behavior change: `one-review.test.ts`'s "drops the PR-review stage" case finds the PR resume row by the `| small or standard, no PR |` prefix REQ-11 gives it, in place of `| standard, no PR |`.
- amended: scripts/ai-skills/one-review.test.ts: T7's full-suite run found the case still keyed on the old row text, so a `T11 fix` commit updates its prefix and failure message.

Keep the resume rows in their order and place the small row after the `no spec.md` row and before the verify row; the Design row needs no size, since `approve.mjs` refuses a small intent whose Design line is not `not needed`.
Both rules load every session, so keep the additions to the sizes list, the resume rows, and one subject bullet in each.

### T12: Part 2 — document the small plan, the approval copy, and three sizes

- files: .prism/architect/_toolkit/plan-chain-scripts.md, .prism/architect/_toolkit/ticket-workflows.md, templates/install/.prism/architect/_toolkit/ticket-workflows.md, docs/workflow.md, .prism/architect/_toolkit/hook-runtime.md, templates/install/.prism/architect/_toolkit/hook-runtime.md
- proof: grep -n 'plan-small.md' .prism/architect/_toolkit/plan-chain-scripts.md && grep -c 'small' .prism/architect/_toolkit/ticket-workflows.md templates/install/.prism/architect/_toolkit/ticket-workflows.md docs/workflow.md && grep -c 'trusts `size:`' .prism/architect/_toolkit/hook-runtime.md templates/install/.prism/architect/_toolkit/hook-runtime.md && pnpm prism:crossref-lint
- depends on: T8
- amended: .prism/architect/_toolkit/hook-runtime.md: the size bullet in the Commit gate section, canonical and twin, gains a sentence saying the gate trusts `size:` as written per the Decision "The approve guard lets an unapproved `size:` flip through".

`docs/workflow.md` changes only its Sizes paragraph, per the spec's Decision leaving the stale stage list to child 16.
`ticket-workflows.md`'s "Shortcut — small fix, known scope" section, canonical and twin, points at the small size on a plan folder, so the two names don't read as two flows.

### T13: Part 2 — regenerate the outputs

- files: .claude/templates/plan-small.md, .codex/templates/plan-small.md, .cursor/templates/plan-small.md, templates/install/.prism/templates/plan-small.md, .claude/templates/intent.md, .codex/templates/intent.md, .cursor/templates/intent.md, templates/install/.prism/templates/intent.md, .claude/skills/prism-intent/SKILL.md, .cursor/skills/prism-intent/SKILL.md, .claude/agents/prism-intent.md, .codex/agents/prism-intent.toml, .claude/skills/prism-implement/SKILL.md, .cursor/skills/prism-implement/SKILL.md, .claude/agents/prism-implement.md, .codex/agents/prism-implement.toml, .claude/rules/workflow.md, .codex/rules/workflow.md, .cursor/rules/workflow.mdc, templates/install/.prism/rules/workflow.md, .claude/rules/git-conventions.md, .codex/rules/git-conventions.md, .cursor/rules/git-conventions.mdc, templates/install/.prism/rules/git-conventions.md, .claude/architect/_toolkit/ticket-workflows.md, .codex/architect/_toolkit/ticket-workflows.md, .cursor/architect/_toolkit/ticket-workflows.md, .claude/architect/_toolkit/plan-chain-scripts.md, .codex/architect/_toolkit/plan-chain-scripts.md, .cursor/architect/_toolkit/plan-chain-scripts.md, templates/install/.prism/architect/_toolkit/plan-chain-scripts.md, AGENTS.md, .codex/config.toml, .claude/architect/_toolkit/hook-runtime.md, .codex/architect/_toolkit/hook-runtime.md, .cursor/architect/_toolkit/hook-runtime.md
- proof: pnpm prism:build && npx tsx --test scripts/ai-skills/skill-loaded-lines.test.ts && pnpm prism:check
- depends on: T7, T8, T9, T10, T11, T12
- amended: .claude/architect/_toolkit/hook-runtime.md: T12 now edits the canonical `hook-runtime.md`, so T13 regenerates its three host copies.

A `prism-intent` load over 120 is fixed by cutting text in T9's files, never by an allowlist entry.

## Challenge

round 1: clean
  - T1 (non-blocking): `.jsonl` is product code under REQ-2, so the retro's `.prism/metrics/review-misses.jsonl` commit (new on a branch, area `.prism/metrics`) trips the gate's size check on a small branch and sends the ticket to `size: standard` at close; exempt `.prism/**` non-code as a Decision plus one test case.
  - T10 (non-blocking): the stage runs `size.mjs` against "the default branch" but the gate measures against `origin/<defaultBranch>`; a stale local `main` reads `standard` where the gate reads `small`, so spell `origin/${DEFAULT_BRANCH}`.
  - plan (non-blocking): the small resume row treats one ticket-subject commit as a finished build, but T10 has the stage commit more than once, so an interrupted build resumes into verify; have the stage make its ticket-subject commit last, or say so in the Decision.
  - T4 (non-blocking): `hook-runtime.md` says "three checks" on two lines (the flag-deny paragraph and the check-order sentence), the gotcha names one, and the proof only greps `four checks`, so AC-5's `three checks` = 0 fails at review; add a negative grep and update the "three checks" header comments in T2's `commit-gate.mjs` and `checks.mjs`.
  - T1 (non-blocking): REQ-1's `--tree` has no AC or named test, and T1 has the gate "build its own input" instead of reusing the reader with a tree, which leaves two numstat parsers; reuse the reader and add a `--tree` case.
  - plan (non-blocking): `REVIEW.md`'s "file outside the plan" pause trigger has no meaning on a small ticket (no tasks or Affected systems), and the T9 to T12 proofs are weaker than AC-8, AC-10, AC-11, and AC-12's evidence; the spec's "small fix" shortcut in `ticket-workflows.md` also clashes with the new size name.

round 2: clean
  - T10 (non-blocking): `prism-implement`'s existing Startup bullet opens "On a plan folder (`plan.md`)" and says build one dispatched bundle, return a build report, never edit `plan.md`, and a small ticket's record-only `plan.md` matches it too, so the skill would give two opposite instructions; have T10 scope that bullet to a plan with tasks, not only add a bullet beside it.
  - T10 (non-blocking): AC-10's `grep -n 'TICKET_PREFIX'` already prints line 54 (the PR title) before the change, so it cannot fail; grep for the `${TICKET_PREFIX}-<digits>` subject form or the `size.mjs` line instead.
  - T1 (non-blocking): the `.prism/**` record exemption (round 1's fix) and `--tree` appear in no AC evidence, so review cannot grade them; add a `.prism/metrics` case and a `--tree` case to AC-1's evidence, and say what an absent `documentation.location` does (no docs root, `.md` still a doc).
  - T2 (non-blocking): `checks.mjs`'s header says "config, weakened tests, and stops in that order" and never says "three checks", so the header edit is the order sentence there and "three checks" only in `commit-gate.mjs` lines 9 and 39.

round 3: blocking 1
  - T8 (blocking): the Decision "T8 confirms the approve guard stops an unapproved `size:` flip" has the builder record its result in `plan.md`, which is not in T8's `files`, so the report would carry `unlisted: plan.md` and read as `needs-replan`; it also routes a gap to `prism-architect`, which a builder subagent cannot dispatch. Have T8 report the result in its build report's `checks:` line and the session write the Decision and dispatch the architect. Expect a gap: `approvalLines` reads only `status`, `approved_by`, and `approved_at` (`plan/frontmatter.mjs` `APPROVAL_KEYS`), so the guard's frontmatter arm lets a `size:` edit through.
  - plan (non-blocking): part 2's branch carries part 1's `## Verification` record and its `review round 1 ... (part 1 of 2): clean` line, so after T13 the resume table sees both stages as done and goes to the PR; add a Decision that part 2's verify and review are dispatched regardless, and that the retro's `Retro:` line waits on part 2's review.
  - T11 (non-blocking): the amended `one-review.test.ts` fix has no open task, because T11 reads `done`, and the case fails at HEAD (`workflow.md has no | standard, no PR | row`); T13's proof does not run it. Name who commits it (the session, as `T11 fix:`) and that it lands before verify.

round 4: resolved 1
  - T8 (non-blocking): the `size:` flip check lives only in the Decision, and T8's `proof` runs `approve-guard.test.ts`, which has no `size:` case, so the builder's `checks:` line can report the check only from a hand-run payload; fine as written, but the session should expect that line to name the payload it ran.

round 5: blocking 1
  - T12 (blocking): the amendment put the section sign in prose on two lines, T12's `amended:` line and the size-flip Decision, so `pnpm prism:plan-citations` fails with `section-citation` at `plan.md:161` and `plan.md:210`, and T13's `pnpm prism:check` proof cannot pass; wrap each citation in a backtick span or name the section in words.
  - T12 (non-blocking): its proof's `grep -c 'approve guard'` already prints a count on `main` for both files, so it cannot fail when the size-flip sentence is missing; grep for a phrase the new sentence carries, and add that grep to AC-12's evidence so review can grade it.

round 6: resolved 1
  - T12 (non-blocking): AC-12's evidence still lacks the `trusts \`size:\`` grep that T12's proof now runs, and `grep -c` over two files exits 0 when only one file matches, so a missing sentence in the seed twin passes; name the grep in AC-12 and check each file on its own, or have review grade the twin by eye.

## Decisions

- **This child ships as a two-PR stack, cut after T5.** The work spans well over 10 files once generated copies count, and part 1 works alone: no intent can say `size: small` until T8, so the gate arm is dormant and every stage runs as it does today. Part 1 is `size.mjs`, the commit gate arm, delivery, and the architect-doc entries; part 2 is everything else. Rejected: one PR, past the size where review gets painful.
- **Part 1 ships from T5, not from the resume table.** After T5, part 1's verify, review, and PR stages run while T6 to T13 are open, and the resume table would read an uncommitted task and send the session back to implement. The session drives part 1's verify, review, and PR from this Decision, part 2 resumes from T6 on a branch cut from `main`, and the retro runs once, after part 2's review. Rejected: running the close step on part 1, which would close a plan with half its tasks open.
- **Only added lines in product code count toward the 100-line limit.** Hunter ruled on 2026-11-28: only added lines in product code count. Deleted lines don't, and neither do tests, docs, plans, lockfiles, or config. The limit measures new code a reviewer has to read, and a deletion adds none, so T1's classifier sums added lines only and a product file with no added lines counts toward no limit (a stop path and a binary product file still count). Rejected: added plus deleted, as `git diff --numstat` reports, which reads a 60-line rewrite as 120; and the larger of added and deleted per file, which still charges a file for code it removed.
- **The weakened-tests remedy on a small branch rides part 1.** It is commit gate code that reads the `smallIntent` flag T2 adds, and `hook-runtime.md`'s commit-gate text in T4 describes both small-branch behaviors in one place. Like the size check, it is dormant until part 2. Rejected: moving it to part 2, which would leave part 1's architect doc describing a gate whose small-branch remedy still points at a task that cannot exist.
- **The approve guard lets `git rm` remove an approved small `plan.md`.** The spec asked the plan stage to check this first. A `PreToolUse` payload carrying `git rm -q .prism/plans/prism-568/plan.md`, run through `approve-guard.mjs --tool=claude` on 2026-11-27, printed nothing and exited 0: the frontmatter arm judges file edits only, and the execution arm judges commands naming `approve.mjs`. So Outgrowing stays as the spec designs it. No guard test is added, because `approve-guard.test.ts` sits outside Affected systems.
- **`prism-intent` fits under the cap by rewriting in place.** Measured with `measureSkillLoad` on 2026-11-27, the skill loads 118 lines, `intent.md` included. The template's `size:` comment, the skill's Size bullet, and its approval paragraph each already exist, so T9 rewrites those lines rather than adding new ones. Rejected: an allowlist entry, which REQ-16 rules out.
- **No ADR for the small size, confirmed.** No ADR under `.prism/spec/adrs/_toolkit/` mentions `size: small` or the sizes, and applying `.prism/references/triple-gated-adr-criterion.md`, the size fails the hard-to-reverse gate: deleting one check and one script removes it, as the epic spec's own Decisions record. `workflow.md` and `plan-chain-scripts.md` carry the rule.
- **Every `.prism/**` path off the stop paths counts as a record, not product code.** Challenge round 1 found that the close step commits `.prism/metrics/review-misses.jsonl`, which REQ-2's classes read as a new product file in a second area, so the gate would deny a small ticket's own retro commit and tell it to go standard. `.prism/` holds PRISM's plans, records, and spec, none of it product code, so this follows from the intent's "product code" and extends REQ-2's plans class to its parent folder. A stop path under `.prism/` still counts first. Rejected: exempting only `.prism/metrics/**`, which leaves `audit-state.json` and the next record file to hit the same deny.
- **`REVIEW.md`'s file-outside-the-plan pause trigger is left as it reads.** On a small ticket there is no task list or Affected systems, so the review reads the intent's outcome and acceptance criteria as the yardstick, as the spec's flow says. `REVIEW.md` sits outside Affected systems, and a small diff is one area by construction, so the trigger has little to fire on. Rejected: editing `REVIEW.md` here, which is a scope change for a case the size limits already narrow.
- **The approve guard lets an unapproved `size:` flip through, and this child documents the gap.** Part 1's review (#570) asked whether the guard stops it. T8's probe, run through `approve-guard.mjs --tool=claude --event=PreToolUse` on an approved `size: small` intent, showed an Edit or Write from `size: small` to `standard` exits 0 with no output, while a `status:` edit is denied. The frontmatter arm compares only the approval lines (`APPROVAL_KEYS` in `plan/frontmatter.mjs`), so any edit to an approved file's body, its acceptance criteria included, already passes the same way. `prism-architect` ruled to proceed with changes and called it not intent-level. T12 adds one or two sentences to the size bullet in the Commit gate section of `hook-runtime.md`: the gate trusts `size:` as written, and the control is the person reading the intent's diff. The general fix, a hash of the approved text stamped by `approve.mjs` and checked by the guard or the gate, goes to a standalone follow-up ticket, because it covers every approved chain file and touches files outside this child. Rejected: comparing against the approval stamp, because `approved_at` is a date, so a same-day re-approve during Outgrowing looks identical to no re-approve. Also rejected: a guard rule allowing `size:` edits only with a demotion to draft, which changes the guard's model for one key while body edits stay open.
- **Part 2's verify and review run on part 2's own head.** Part 2's branch carries part 1's `## Verification` record and its `(part 1 of 2)` review line, so the resume table would read both stages as done. The session dispatches verify and review for part 2 after T13 anyway, and the `Retro:` line waits on part 2's review. Rejected: clearing part 1's records, which are the durable record of the merged #570.
- **The session commits T11's `one-review.test.ts` fix as `T11 fix:` before verify.** `tasks.mjs` reads T11 as done, so no bundle would pick up the amendment, and T13's proof doesn't run that test.

## Verification

verdict: done
base: 9aca8b54
head: 80acae36

| check | result | evidence |
| --- | --- | --- |
| typecheck | pass | /tmp/claude-1000/-home-zibbix-Projects-PRISM/b0840a51-e844-4baa-b46e-ea88566ea84b/scratchpad/p2b-check-types.log |
| test | pass | /tmp/claude-1000/-home-zibbix-Projects-PRISM/b0840a51-e844-4baa-b46e-ea88566ea84b/scratchpad/p2b-test.log |
| lint | pass | /tmp/claude-1000/-home-zibbix-Projects-PRISM/b0840a51-e844-4baa-b46e-ea88566ea84b/scratchpad/p2b-crossref-lint.log |
| format | n/a: not configured | none |
| build | pass | /tmp/claude-1000/-home-zibbix-Projects-PRISM/b0840a51-e844-4baa-b46e-ea88566ea84b/scratchpad/p2b-build.log |
| spec | pass | /tmp/claude-1000/-home-zibbix-Projects-PRISM/b0840a51-e844-4baa-b46e-ea88566ea84b/scratchpad/p2b-check.log |

### Failures

- none

## Review

- review round 1 at ea512f91 (part 1 of 2): clean
- review round 1 at ed27e4a4: clean
- review round 2 at 035275ee: clean

## PR Readiness

Retro:
