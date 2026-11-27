---
title: One review — rename self-review, retire the PR reviewer and labels
ticket: https://github.com/HunterMcGrew/PRISM/issues/553
stage: plan
status: approved
approved_by: auto
approved_at: 2026-11-27
---

## Acceptance Criteria

Each criterion cites the spec requirement it grades as `(REQ-n)`.

- [ ] **AC-1** Given the branch head, When the roster is read, Then `.ai-skills/skills/prism-review/` exists with `name: prism-review` and `model: opus`, its `Triggers:` line names "Briar", "Eric", "review pr", "review #123", and "any GitHub PR URL", `roles.json` holds `prism-review` with `persona: "Briar"`, `routing: "auto"`, `gated: true`, and neither `prism-self-review` nor `prism-pr-review` is a role or a skill directory. (REQ-1, REQ-2)
  - Evidence (machine): `node --test scripts/ai-skills/one-review.test.ts` passes, and fails on `main` at `ceab998d`.
- [ ] **AC-2** Given a PR number or URL, When `prism-review` runs, Then its body tells it to review `origin/<baseRefName>..<headRefOid>` through `gh pr diff` and `git show`, write no plan line, post nothing, and report in chat, and the body names the session's fresh-subagent dispatch with a brief of at most 15 lines. (REQ-3, REQ-4)
  - Evidence (machine): `grep -n 'gh pr diff' .ai-skills/skills/prism-review/shared.md` and `grep -n 'fresh subagent' .ai-skills/skills/prism-review/shared.md` each print a line; `grep -n 'in a fresh chat' .ai-skills/skills/prism-review/shared.md` prints nothing.
- [ ] **AC-3** Given the branch head, When the tree is listed, Then `.ai-skills/deprecated/prism-pr-review/` holds the old skill's five source files plus `github-writes.md` and `eric-review-modes.md`, and neither `.prism/references/pr-review/github-writes.md` nor `.prism/architect/_toolkit/eric-review-modes.md` exists. (REQ-5)
  - Evidence (machine): the `one-review.test.ts` case "retires prism-pr-review to .ai-skills/deprecated" passes.
- [ ] **AC-4** Given a consumer `.claude/settings.json` whose `SubagentStop` holds PRISM's `reconcile-gate.mjs` entry and the consumer's own entry, When `mergeHookRegistration` merges the new template, Then PRISM's entry is gone and the consumer's survives, and `reconcile-gate.mjs` is absent from `HOOK_RUNTIME_FILES`, `HOOK_RUNTIME_ENTRY_POINTS`, both install templates, and PRISM's own `.claude/settings.json`. (REQ-6)
  - Evidence (machine): `node --test scripts/ai-skills/update-retire-review.test.ts` passes, and its merge case fails when the `mergeHookRegistration` union change is reverted.
- [ ] **AC-5** Given `brief-gate.mjs`, When `GATED_ROLES` is read, Then it equals the set of roles flagged `gated` in `roles.json`, holds `prism-review`, and lacks `prism-pr-review`. (REQ-7)
  - Evidence (machine): `node --test scripts/ai-skills/brief-gate.test.ts` passes.
- [ ] **AC-6** Given a consumer adopted from a pack of `37cdbd28` with its own `SubagentStop` entry added, When `prism update` runs from a pack of this branch, Then no `prism-pr-review` or `prism-self-review` directory remains under `.claude/skills`, `.cursor/skills`, or `.agents/skills`, no such file under `.claude/agents` or `.codex/agents`, no PRISM `SubagentStop` entry in `.claude/settings.json` or `.codex/hooks.json`, `.claude/hooks/reconcile-gate.mjs` is gone with a `.bak` beside it, and the consumer's own `SubagentStop` entry survives. (REQ-8)
  - Evidence (machine): the `## Release proof` section of this plan records each command T13 runs and its output.
- [ ] **AC-7** Given `.prism/rules/skill-routing.md`, When the routing table is read, Then the Eric and Briar rows both name `prism-review`, the `/review` override names `prism-review`, and "Authors ship, reviewers review" names Briar alone. (REQ-9)
  - Evidence (machine): the `one-review.test.ts` case "routes review phrases to prism-review" passes.
- [ ] **AC-8** Given `.ai-skills/config.schema.json`, When the `modelTiers` description is read, Then it names `overrides.briar` read by the session's `prism-review` dispatch and does not name `eric`. (REQ-10)
  - Evidence (machine): `grep -n 'overrides.eric' .ai-skills/config.schema.json` prints nothing and `grep -n 'overrides.briar' .ai-skills/config.schema.json` prints one line.
- [ ] **AC-9** Given `.prism/rules/workflow.md` and `.prism/references/shipping-flow.md`, When read, Then the standard stage list is `... verify → review → PR → retro`, no resume row names a PR review, the review row dispatches `prism-review`, and shipping-flow names the reconcile-and-log step after each push. (REQ-11, REQ-12)
  - Evidence (machine): the `one-review.test.ts` case "drops the PR-review stage" passes.
- [ ] **AC-10** Given the scanned sources (`.prism/rules`, `.prism/architect`, `.prism/references`, `.prism/templates`, `.ai-skills/skills`, `.ai-skills/definitions`, `.ai-skills/config.schema.json`, `scripts/ai-skills`, `templates/install` outside its `REVIEW.md` and `.prism/review/` until part 2, `AGENTS.md`, `CLAUDE.md`), When searched for `prism-pr-review|prism-self-review`, Then the only hits are in the test allowlist named in T1. (REQ-13)
  - Evidence (machine): the `one-review.test.ts` case "leaves no live mention of the retired skill IDs" passes; a positive control in the same case plants the string in a temp copy and sees it caught.
- [ ] **AC-11** Given `REVIEW.md`, When its exit rule and rounds are read, Then the exit is zero Critical and zero Major apart from decision items with every pass `swept` or `n/a`, rounds cap at two, no confirm pass exists, and leftovers go to the PR body with a leftover Critical or Major also posted inline. (REQ-14)
  - Evidence (machine): `grep -n -i 'confirm pass\|3-round\|three rounds\|pr-review confirm' REVIEW.md` prints nothing; `grep -n 'At most two rounds' REVIEW.md` prints one line.
- [ ] **AC-12** Given `REVIEW.md` and `.prism/review/intent-scope.md`, When read, Then "The whole PR is in scope", the plan-drift checklist line, and "Plan drift is reconciled, not reported" are gone, and the review reads the plan files as its yardstick and never reviews the PR body. (REQ-15)
  - Evidence (machine): `grep -n 'Plan drift\|whole PR is in scope' REVIEW.md .prism/review/intent-scope.md` prints nothing.
- [ ] **AC-13** Given `review/ignore.mjs`, When `resolveReviewIgnore` reads a config without `reviewIgnore`, Then it returns the default whose `.prism/` entries and exceptions equal the lists in `scripts/ai-skills/ownership.ts`; a set list replaces the default; a non-array, a non-string entry, or a `{` pattern throws; and PRISM's own config sets the list from T15. (REQ-16, REQ-17, REQ-18)
  - Evidence (machine): `node --test scripts/ai-skills/review-ignore.test.ts` passes, and fails on `main`.
- [ ] **AC-14** Given a report JSON, When `record.mjs <plan.md> <report.json>` runs, Then it appends exactly `- review round <n> at <sha>[ (part <k> of <m>)]: <verdict>` under `## Review` (creating the heading when absent), exits 1 writing nothing when a finding cites a never-reviewed path, and exits 2 on a round outside 1 and 2 or a malformed report; `plan-retro-line.ts` still reads `pr-review` lines. (REQ-19, REQ-21)
  - Evidence (machine): `node --test scripts/ai-skills/review-record.test.ts scripts/ai-skills/plan-retro-line.test.ts` passes.
- [ ] **AC-15** Given a fake `gh`, When `post.mjs <pr> <file> <line> <body-file>` runs, Then it posts one comment on the PR's `headRefOid` with `side=RIGHT` and `<!-- prism-agent -->` as the body's first line, exits 1 posting nothing for a never-reviewed file, exits 1 naming the reason on a 422, and exits 2 when `github.owner` or `github.repo` is missing. (REQ-20)
  - Evidence (machine): `node --test scripts/ai-skills/review-post.test.ts` passes.
- [ ] **AC-16** Given `reconcile.mjs` and the config schema, When searched for the seven label names and `prism-verdict`, Then neither file holds them, and reconcile still reports threads, human comments, PR-body headings, misses, and `--classes`. (REQ-22)
  - Evidence (machine): `node --test scripts/ai-skills/review-reconcile.test.ts` passes, and the `one-review.test.ts` label case passes.
- [ ] **AC-17** Given `git-conventions.md` "Who merges" and the schema's `mainSessionMayMerge` description, When read, Then the merge bar is `features.mainSessionMayMerge: true`, a last review line reading `clean`, and green CI on the head, with no `review:has-minors` clause. (REQ-23)
  - Evidence (machine): `grep -n 'has-minors' .prism/rules/git-conventions.md .ai-skills/config.schema.json` prints nothing.
- [ ] **AC-18** Given `followup-scope.md`, When read, Then "Bookkeeping findings are recorded, not gated" is gone and "Spec content never rides an unrelated ticket" remains. (REQ-24)
  - Evidence (machine): `grep -c 'Bookkeeping findings are recorded' .prism/rules/followup-scope.md` prints 0 and `grep -c 'Spec content never rides an unrelated ticket' .prism/rules/followup-scope.md` prints at least 1.
- [ ] **AC-19** Given `.prism/spec/adrs/_toolkit/`, When listed, Then `0087-one-review-replaces-the-pr-reviewer-and-labels.md` exists, ADR-0011 and ADR-0078 each carry an `> Amended by [ADR-0087]` status line, and the ADR index lists 0087. (REQ-25)
  - Evidence (machine): `pnpm prism:crossref-lint` exits 0 and `grep -c 'ADR-0087' .prism/spec/adrs/_toolkit/0011-eric-never-approves-prs.md .prism/spec/adrs/_toolkit/0078-main-session-holds-merge-authority-and-the-conductor-is-retired.md` prints 1 for each.
- [ ] **AC-20** Given Claude Code, When a headless `claude -p` session dispatches `prism-review` and it launches one subagent, Then whether the inner call returned is recorded in `hook-runtime.md` under `### Nested dispatch` and in the part 1 PR body, with Codex recorded as unprobed. (REQ-26)
  - Evidence (machine): `grep -n 'Nested dispatch' .prism/architect/_toolkit/hook-runtime.md` prints the heading, and the paragraph under it quotes the probe's final output line, `PROBE inner=pong` or `PROBE inner=failed: <reason>`.
- [ ] **AC-21** Given each part's head, When CI runs, Then `pnpm prism:check` passes on both platforms. (REQ-27)
  - Evidence (machine): the PR's check rollup shows the `prism:check` job green on ubuntu and windows.

## Tasks

This child ships as a two-PR stack per the spec's Design. **Part 1 (rename and retirement, plus the label removal from `reconcile.mjs`)** is T1 to T13. **Part 2 (the rulebook)** is T14 to T23, and opens with T14, the plan-only commit that names part 1's tasks as shipped. Part 1 never touches `REVIEW.md`, `templates/install/REVIEW.md`, or `.prism/review/**`.

Generated copies are listed in each part's build task (T11, T23) rather than beside their source edit, so each path belongs to one task. A build task commits only the listed paths `git status -s` shows changed, because `plan/commit.mjs` rejects an unchanged path. Curated seed twins (in `.ai-skills/definitions/seed-curation.json` under `curated`) are hand-edited in the same task as their canonical, because the build never rewrites them.

Bundle groups (from `node scripts/ai-skills/hooks/plan/bundles.mjs .prism/plans/prism-553/plan.md`):

Group 1: T1 (architect context `_toolkit/skills-ecosystem.md`, `_toolkit/spec-editing.md`). Every other task waits on T1 directly or through a chain, so later groups print as tasks finish. The script added one import edge: T18 depends on T3, because `plan-runtime-delivery.test.ts` imports `update.ts`.

### T1: Part 1 — write the failing one-review test

- files: scripts/ai-skills/one-review.test.ts
- proof: node --test scripts/ai-skills/one-review.test.ts
- proof fails on main: yes
- depends on: none

New `node:test` file in the style of `scripts/ai-skills/brief-gate.test.ts` (repo root from `import.meta.url`, `fs.readFileSync`). Cases, each a separate `it`:

1. **"renames self-review to prism-review"** — parse `.ai-skills/definitions/roles.json`; assert one entry `{ id: "prism-review", persona: "Briar", routing: "auto", gated: true }` and no entry whose `id` is `prism-self-review` or `prism-pr-review`. Read `.ai-skills/skills/prism-review/frontmatter.yml`; assert it contains `name: prism-review`, `model: opus`, and the strings `"Briar"`, `"Eric"`, `review pr`, `review #123`, and `any GitHub PR URL`. Assert `.ai-skills/skills/prism-self-review` and `.ai-skills/skills/prism-pr-review` do not exist.
2. **"retires prism-pr-review to .ai-skills/deprecated"** — assert these exist: `.ai-skills/deprecated/prism-pr-review/{shared.md,frontmatter.yml,claude.md,codex.md,cursor.md,github-writes.md,eric-review-modes.md}`; assert `.prism/references/pr-review/github-writes.md` and `.prism/architect/_toolkit/eric-review-modes.md` do not exist.
3. **"removes the reconcile stop gate"** — import `HOOK_RUNTIME_FILES` and `HOOK_RUNTIME_ENTRY_POINTS` from `./update.ts` the way `plan-runtime-delivery.test.ts` does; assert no entry contains `reconcile-gate`. Assert `scripts/ai-skills/hooks/reconcile-gate.mjs` does not exist. Parse `templates/install/.claude/settings.json`, `templates/install/.codex/hooks.json`, and `.claude/settings.json`; assert none has a `hooks.SubagentStop` key.
4. **"routes review phrases to prism-review"** — read `.prism/rules/skill-routing.md`; assert the line starting `| **Eric** |` and the line starting `| **Briar** |` each contain `` `prism-review` ``; assert the `/review` override line contains `prism-review`.
5. **"drops the PR-review stage"** — read `.prism/rules/workflow.md`; assert it contains `verify → review → PR → retro`, contains no line matching `/PR review: dispatch/`, and the resume-table row before `| standard, no PR |` contains `prism-review`. Read `.prism/references/shipping-flow.md`; assert it contains `review/reconcile.mjs` and `review-misses.jsonl` and does not contain `prism-pr-review`.
6. **"leaves no live mention of the retired skill IDs"** — walk the roots listed in AC-10 recursively (skip `node_modules`, `.git`, and any `plans`, `retros`, `audits`, `archived` directory), read every `.md`, `.mdc`, `.mjs`, `.ts`, `.json`, `.tmpl`, `.yml`, `.toml` file, and collect lines matching `/prism-pr-review|prism-self-review/`. Exclude this allowlist, each with a one-line comment giving its reason: `scripts/ai-skills/one-review.test.ts` (this file), `scripts/ai-skills/update-retire-review.test.ts` (fixtures of the 1.0.0 tree), `scripts/ai-skills/doctor.test.ts` (fixture of an old registration), and in part 1 only `templates/install/REVIEW.md` and `templates/install/.prism/review/` (part 2 rewrites them). Assert the collected list is empty and print it on failure. Positive control: write a temp file containing `prism-pr-review` under `os.tmpdir()`, run the same matcher over it, assert one hit.
7. **"removes the review labels"** — read `scripts/ai-skills/hooks/review/reconcile.mjs`, `scripts/ai-skills/hooks/review/reconcile.d.mts`, and `.prism/architect/_toolkit/review-runtime.md`; assert none matches `/review:has-minors|prism-verdict|effort:(glance|quick|deep)|confidence:(high|needs-judgment|standards-only)|planLabels/`. T23 widens this case to the rulebook, the rules, and the schema in part 2.

### T2: Part 1 — rename the skill, retire prism-pr-review, add the PR input

- files: .ai-skills/skills/prism-self-review/shared.md, .ai-skills/skills/prism-self-review/frontmatter.yml, .ai-skills/skills/prism-self-review/claude.md, .ai-skills/skills/prism-self-review/codex.md, .ai-skills/skills/prism-self-review/cursor.md, .ai-skills/skills/prism-review/shared.md, .ai-skills/skills/prism-review/frontmatter.yml, .ai-skills/skills/prism-review/claude.md, .ai-skills/skills/prism-review/codex.md, .ai-skills/skills/prism-review/cursor.md, .ai-skills/skills/prism-pr-review/shared.md, .ai-skills/skills/prism-pr-review/frontmatter.yml, .ai-skills/skills/prism-pr-review/claude.md, .ai-skills/skills/prism-pr-review/codex.md, .ai-skills/skills/prism-pr-review/cursor.md, .ai-skills/deprecated/prism-pr-review/shared.md, .ai-skills/deprecated/prism-pr-review/frontmatter.yml, .ai-skills/deprecated/prism-pr-review/claude.md, .ai-skills/deprecated/prism-pr-review/codex.md, .ai-skills/deprecated/prism-pr-review/cursor.md, .ai-skills/deprecated/prism-pr-review/github-writes.md, .ai-skills/deprecated/prism-pr-review/eric-review-modes.md, .prism/references/pr-review/github-writes.md, .prism/architect/_toolkit/eric-review-modes.md, .ai-skills/definitions/roles.json
- proof: node --test --test-name-pattern="renames self-review|retires prism-pr-review" scripts/ai-skills/one-review.test.ts
- proof fails on main: yes
- depends on: T1

1. `git mv .ai-skills/skills/prism-self-review .ai-skills/skills/prism-review`. `git mv .ai-skills/skills/prism-pr-review .ai-skills/deprecated/prism-pr-review`. `git mv .prism/references/pr-review/github-writes.md .ai-skills/deprecated/prism-pr-review/github-writes.md`. `git mv .prism/architect/_toolkit/eric-review-modes.md .ai-skills/deprecated/prism-pr-review/eric-review-modes.md`. The moved files keep their content unchanged.
2. `.ai-skills/skills/prism-review/frontmatter.yml`: `name: prism-review`; `model: sonnet` → `model: opus`; add `argument-hint: "[PR# or GitHub URL]"` after `description`. Description becomes: `Reviews the current branch, or a PR by number or URL, against REVIEW.md: runs the passes whose triggers fire through subagents and grades the acceptance criteria. Reports in chat, writes one record line to the plan on a branch review, and never posts to GitHub or edits source. Triggers: "Briar", "Eric", review my changes, self review, check my work, am I ready to open a PR, validate branch state, verify the AC, grade the acceptance criteria, review pr, review #123, review this PR, PR review, any GitHub PR URL.`
3. `.ai-skills/definitions/roles.json`: delete the `prism-pr-review` object (lines 48–53 at `ceab998d`); change `"id": "prism-self-review"` to `"id": "prism-review"` and add `"gated": true` after `"routing": "auto"`.
4. `.ai-skills/skills/prism-review/shared.md` (line numbers at `ceab998d`):
   - Line 1: replace `It never posts to GitHub (the PR-review skill's lane), never edits source, and never ships.` with `It never approves, never posts to GitHub, never flips a PR ready, never edits source, and never ships.`
   - Startup, first bullet: replace it with `- **Resolve what to review.** With no argument, resolve the branch, repo root, and PR with \`git branch --show-current\`, \`git rev-parse --show-toplevel\`, and \`gh pr list --head <branch>\`. With a PR number or URL, read \`gh pr view <pr> --json baseRefName,headRefOid,headRefName\`, run \`git fetch -q origin <baseRefName> <headRefName>\`, and review read-only: \`gh pr diff <pr>\` for the diff and \`git show <headRefOid>:<path>\` for a file, with no checkout. A diff is unfamiliar enough to catch what re-reading your own code would slide past.`
   - The run, step 1: append `With a PR, the range is \`origin/<baseRefName>..<headRefOid>\` instead.`
   - "Write the plan before the chat": add a first bullet `- **With a PR argument, write nothing.** No plan line, no commit, no GitHub write. The report in chat is the whole output, because the PR may not be this checkout's branch.`
   - "Rounds and guardrails": replace the `Never post to GitHub.` bullet with `- **Never post, approve, or flip a PR ready.** The chat and the plan are the whole output. After verify and before the PR opens, the session dispatches this skill as a fresh subagent with a path brief of at most 15 lines (the plan folder, the round, the base ref, the report shape), so it reads the diff without the session's reasoning. A host that cannot dispatch runs it in the session.`
   - "Boundaries and handoff": delete the `Clean, PR exists:` bullet (line 61). In the `Issues found:` bullet delete `Hold the PR-review recommendation until the issues are fixed.`
   - Keep `## Voice` and its subagent greeting skip unchanged.

### T3: Part 1 — remove the reconcile stop gate

- files: scripts/ai-skills/hooks/brief-gate.mjs, scripts/ai-skills/brief-gate.test.ts, scripts/ai-skills/hooks/reconcile-gate.mjs, scripts/ai-skills/hooks/reconcile-gate.d.mts, scripts/ai-skills/reconcile-gate.test.ts, scripts/ai-skills/update.ts, scripts/ai-skills/doctor.ts, scripts/ai-skills/hooks/harnesses.mjs, scripts/ai-skills/hooks/harnesses.d.mts, scripts/ai-skills/hook-harnesses.test.ts, scripts/ai-skills/hook-registrations.test.ts, scripts/ai-skills/plan-runtime-delivery.test.ts, scripts/ai-skills/update-retire-review.test.ts, templates/install/.claude/settings.json, templates/install/.codex/hooks.json, .claude/settings.json
- proof: node --test scripts/ai-skills/update-retire-review.test.ts scripts/ai-skills/brief-gate.test.ts scripts/ai-skills/hook-harnesses.test.ts scripts/ai-skills/hook-registrations.test.ts scripts/ai-skills/plan-runtime-delivery.test.ts && node --test --test-name-pattern="removes the reconcile stop gate" scripts/ai-skills/one-review.test.ts
- proof fails on main: yes
- depends on: T2, T10
- behavior change: `brief-gate.test.ts` line 357 asserts `prism-review` is gated instead of `prism-pr-review`; `hook-harnesses.test.ts` drops the `readSubagentStop` and `emitStopBlock`/`emitBlockStop` tests; `hook-registrations.test.ts` and `plan-runtime-delivery.test.ts` (lines 69, 356, 385 at `ceab998d`) stop expecting `reconcile-gate.mjs` and the `SubagentStop` registration — the gate is retired by REQ-6.

1. Write `scripts/ai-skills/update-retire-review.test.ts` first, with two cases, and see both fail: (a) `mergeHookRegistration` takes `(sourcePath, targetPath, pattern, dryRun)`, so write a temp target settings file whose `hooks.SubagentStop` holds PRISM's old entry (copy the block from `templates/install/.claude/settings.json` at `ceab998d`, lines 114–125) plus a consumer entry `{ matcher: "^my-agent$", hooks: [{ type: "command", command: "node scripts/mine.mjs" }] }`, and a temp source file holding the new template, call it with `PRISM_HOOK_COMMAND_PATTERN` and `dryRun` false, read the target back, and assert its `SubagentStop` holds only the consumer entry. Repeat with only PRISM's entry and assert the `SubagentStop` key is deleted. (b) In a temp consumer dir, write `.claude/hooks/reconcile-gate.mjs` with the `@prism-hook-runtime` marker, run `pruneStaleHookRuntimeFiles`, assert the file is gone and `.claude/hooks/reconcile-gate.mjs.bak` exists.
2. `update.ts` `mergeHookRegistration`: iterate the union of event keys from the source and the target, so PRISM-owned entries (matched by `PRISM_HOOK_COMMAND_PATTERN` / `PRISM_CODEX_HOOK_COMMAND_PATTERN`) are dropped from a target key the source lacks; the existing empty-key deletion then applies. Add a JSDoc line: `PRISM-owned entries are also dropped from event keys only the target holds, so a registration the source retired leaves the consumer's file.` Remove `reconcile-gate.mjs` from `HOOK_RUNTIME_FILES` (~line 1130) and `HOOK_RUNTIME_ENTRY_POINTS` (~line 1168). Keep `reconcile-gate` in both command patterns, and add to each pattern's JSDoc the sentence `reconcile-gate stays in the alternation as a retired entry point, so an update recognizes and drops an old registration.`
3. `doctor.ts`: keep `reconcile-gate` in `HOOK_COMMAND_PATH_RE` and add JSDoc `reconcile-gate stays as a retired entry point, so doctor reports a leftover registration whose file is gone.`
4. `git rm scripts/ai-skills/hooks/reconcile-gate.mjs scripts/ai-skills/hooks/reconcile-gate.d.mts scripts/ai-skills/reconcile-gate.test.ts`.
5. `harnesses.mjs` and `harnesses.d.mts`: delete `readSubagentStop`/`subagentStop` and `emitStopBlock`/`emitBlockStop` (their only caller was the gate); delete their tests in `hook-harnesses.test.ts`.
6. `brief-gate.mjs` `GATED_ROLES`: replace `prism-pr-review` with `prism-review`; `brief-gate.test.ts` line 357 `assertAllowed("prism-pr-review", ...)` → `"prism-review"`.
7. Delete the whole `"SubagentStop": [...]` member (and the preceding comma) from `templates/install/.claude/settings.json`, `templates/install/.codex/hooks.json`, and `.claude/settings.json`.
8. `hook-registrations.test.ts` and `plan-runtime-delivery.test.ts`: remove the `reconcile-gate` expectations named in the behavior-change field.

### T4: Part 1 — sweep the always-on rules

- files: .prism/rules/skill-routing.md, templates/install/.prism/rules/skill-routing.md, .prism/rules/branch-plan.md, templates/install/.prism/rules/branch-plan.md, .prism/rules/git-conventions.md, .prism/rules/followup-scope.md, .prism/rules/code-standards.md, .prism/rules/context-reuse.md, .prism/rules/design-governance.md, .prism/rules/architect-doc-verification.md, templates/install/.prism/rules/architect-doc-verification.md, .prism/rules/implementation-task-detail.md, templates/install/.prism/rules/implementation-task-detail.md, .prism/rules/lazy-artifacts.md, .prism/rules/skill-authoring.md
- proof: node --test --test-name-pattern="routes review phrases" scripts/ai-skills/one-review.test.ts && { grep -nE 'prism-pr-review|prism-self-review' .prism/rules/*.md templates/install/.prism/rules/skill-routing.md templates/install/.prism/rules/branch-plan.md templates/install/.prism/rules/architect-doc-verification.md templates/install/.prism/rules/implementation-task-detail.md | grep -v 'rules/workflow.md' ; test $? -eq 1; }
- depends on: T1

Make each edit in the canonical and, for the four curated twins listed in `files`, the same edit in the twin. Line numbers are at `ceab998d`.

- `skill-routing.md`: line 20 Eric row → `| **Eric** | \`prism-review\` | "review pr", "review #123", "review this PR", "PR review", shares a PR URL or number |`; line 23 Briar row → `\`prism-review\``; line 67 → `Any PR review phrase goes to \`prism-review\`, because the built-in ...` (drop "(Eric)"); line 75 → `Briar reviews and never ships. Asked to create a PR, she routes back to the author, ...` (rest unchanged).
- `branch-plan.md`: line 42 bullet → `- **Review of a PR by number** (\`prism-review <pr>\`): note "no plan found" and proceed without one, because the PR may be someone else's branch, and write nothing.`; line 137 `(Clove, Briar, Eric)` → `(Clove, Briar)`; line 198 `after the final PR review` → `after the final review`; line 236: `after the final PR review` → `after the final review`, and replace `The review covers the whole PR per \`REVIEW.md\`, and its intent-scope pass (\`.prism/review/intent-scope.md\`) still fixes other plan drift outside \`## Tasks\` in place and lists what it edited. A stale task is reported as a Minor, and \`intent.md\` is never edited.` with `The review reads the plan files as its yardstick and raises no finding on their prose, per \`REVIEW.md\`.`, and `once the final PR review is recorded` → `once the final review is recorded`; line 389 `Add entries here via the \`prism-self-review\` or \`prism-pr-review\` skills.` → `Add entries here via the \`prism-review\` skill.`; line 436 `prism-self-review` → `prism-review`.
- `git-conventions.md` line 73: remove `Eric, ` from the reader list. Lines 112 and 118 stay for part 2.
- `followup-scope.md` line 55 `noted by Briar or Eric` → `noted by Briar`; line 98 → `- **Briar** (\`prism-review\`) — when surfacing ...` (rest unchanged).
- `code-standards.md` line 39: `the \`prism-self-review\` and \`prism-pr-review\` skills` → `the \`prism-review\` skill`.
- `context-reuse.md` lines 38–39 → one line `- prism-review (Briar)`.
- `design-governance.md` line 31 → `- **Briar** (\`prism-review\`) — flag implementation ...`.
- `architect-doc-verification.md` lines 24–27 → one bullet `- **Briar** (\`prism-review\`) — auto-trips into source-verification mode on doc-class diffs, on a branch or a PR.`, and delete the "Eric's and Briar's hooks share phrasing" line.
- `implementation-task-detail.md` line 115 → `- **Briar** (\`prism-review\`) — flags tasks or specs that fail the bar during review.`; line 119 `in self-review and PR review` → `in review`.
- `lazy-artifacts.md` line 44 `Briar and Eric flag` → `Briar flags`.
- `skill-authoring.md` line 37 example `prism-self-review` → `prism-review`; line 49 `Self-review and PR review flag` → `Review flags`.
- `writing-voice.md` line 40 cites an ADR title and stays.

### T5: Part 1 — drop the PR-review stage from workflow, shipping flow, and the schema

- files: .prism/rules/workflow.md, .prism/references/shipping-flow.md, .ai-skills/config.schema.json
- proof: node --test --test-name-pattern="drops the PR-review stage" scripts/ai-skills/one-review.test.ts && node -e "JSON.parse(require('fs').readFileSync('.ai-skills/config.schema.json','utf8'))" && node --test scripts/ai-skills/plan-config-schema.test.ts
- proof fails on main: yes
- depends on: T1

- `workflow.md` line 9: `→ verify → review → PR → PR review → retro.` → `→ verify → review → PR → retro.`
- `workflow.md` Advancing (line 16): replace `A call only the person can make, and anything the review stages can't fix in 3 rounds, goes to the draft PR as an inline comment and is listed in the closing summary. After review fixes are pushed, dispatch \`prism-pr-review\` again per \`shipping-flow.md\`. Past the 3-round cap that run is the confirm pass, per \`REVIEW.md\`.` with `A call only the person can make, and anything the review can't fix in its rounds, is listed in the PR body and the closing summary.`
- `workflow.md` resume table: line 57 → `| standard, no final review line under \`## Review\` | review: dispatch \`prism-review\` as a fresh subagent with a path brief, on \`modelTiers.overrides.briar\` when set |`; delete line 59 (the PR-review row).
- `shipping-flow.md` Close (line 58): replace the whole paragraph with `Then run \`node ${HOOK_RUNTIME_DIR}/review/reconcile.mjs <pr> --json\`. For each human comment it reports as not yet logged, append one miss row to \`.prism/metrics/review-misses.jsonl\` in the shape \`.prism/architect/_toolkit/review-runtime.md\` gives under "The misses log", naming the nearest pass. The log is committed by the retro, per step 3.` Also check the top-of-file "Per-push invariant" and step 1 for `prism-pr-review`; none at `ceab998d`.
- `config.schema.json` line 365 `modelTiers` description → `Optional model selection. Only \`overrides.briar\` is read, by the session's \`prism-review\` dispatch, so a value for any other persona has no effect. ...` (keep the rest of the sentence after the first two). Line 52 `github` description → `GitHub repo info for Sage (changelog), Reese (QA plans), Lilac (standup), and the review scripts.` Remove every other occurrence of the seven label names and `prism-verdict` (find with `grep -nE 'effort:(glance|quick|deep)|confidence:(high|needs-judgment|standards-only)|review:has-minors|prism-verdict' .ai-skills/config.schema.json`), except the `mainSessionMayMerge` description, which T20 rewrites with the merge bar in part 2.

### T6: Part 1 — sweep the architect docs and routes

- files: .prism/architect/_toolkit/skills-ecosystem.md, templates/install/.prism/architect/_toolkit/skills-ecosystem.md, .prism/architect/_toolkit/closing-messages.md, .prism/architect/_toolkit/ticket-workflows.md, templates/install/.prism/architect/_toolkit/ticket-workflows.md, .prism/architect/_toolkit/audit-workflow.md, .prism/architect/_toolkit/plan-authoring.md, templates/install/.prism/architect/_toolkit/plan-authoring.md, .prism/architect/_toolkit/hook-runtime.md, templates/install/.prism/architect/_toolkit/hook-runtime.md, .prism/architect/manifest.json, .prism/architect/_toolkit/manifest.base.json, templates/install/.prism/architect/manifest.stub.json
- proof: pnpm prism:verify-manifest && { grep -rnE 'prism-pr-review|prism-self-review|eric-review-modes' .prism/architect templates/install/.prism/architect ; test $? -eq 1; }
- depends on: T2

Each curated twin gets the same edit as its canonical.

- `skills-ecosystem.md`: delete the `eric-review-modes.md` bullet (line 10). Roster: replace the `prism-self-review` and `prism-pr-review` rows with one row `| prism-review | **Briar** | Reviews the current branch, or a PR by number or URL, against \`REVIEW.md\`: runs the passes through subagents, grades the acceptance criteria, and records one line per round in the plan on a branch review. The session dispatches it as a fresh subagent after verify. Never approves, never posts, never flips a PR ready. | No |`. Handoffs table: Clove row → `Briar (review)`; delete the Briar → Eric row and the Eric row. Handoff phrases: `Self-review` bullet → `- Review → "Briar handles review — want me to bring her in?"`; delete the `PR review` bullet. Rule 9: `by \`prism-self-review\` and \`prism-pr-review\`` → `by \`prism-review\``. Rule 11 → `**Reviewers never approve PRs** — the review comments only, in chat or the plan. PR approval is a human responsibility, and the review never runs \`gh pr review --approve\`. See ADR-0011 and ADR-0087.` (twin: drop the ADR citations per its curation).
- `closing-messages.md`: Clove row conditional → `After Briar clean → ship; after Briar issues → back to Clove`; Briar row conditional → `Runs as a fresh subagent; on a PR number it reports in chat only`; delete the Eric row.
- `ticket-workflows.md`: in each workflow line remove ` → [Eric]` and `→ Eric`; delete Feature step 8 and renumber step 9 to 8; "UX Concern from Review" → `Briar → Pixel → the spec stage → the plan stage → Clove → Briar` and `Briar surfaces a UX problem`; "PR Identifier Flexibility" `(Eric, Briar, Reese, Sage when scoped to a PR)` → `(Briar, Reese, Sage when scoped to a PR)`.
- `audit-workflow.md` line 26: `(the plan stage, Clove, Briar, Eric, Zoe)` → `(the plan stage, Clove, Briar, Zoe)`.
- `plan-authoring.md` ownership table: `## Acceptance Criteria` read-by `Clove, Briar, Eric` → `Clove, Briar`; `## Debugged Issues` read-by → `Clove, Briar`; `## Verification` read-by → `Briar, Iris`; `## Review` written-by → `` `prism-review` (one record line per round) ``; `Retro:` read-by → `Clove`; `## Review Issues` written-by → `Briar (creates), Clove (marks fixed)`; `## PR Readiness` read-by → `Clove`.
- `hook-runtime.md`: delete the `### Reconcile gate` section and every `SubagentStop` mention, including in the switches and hook-log text; in the Brief gate's role list replace `prism-pr-review` with `prism-review`. Add to the registration-merge text: `A merge also drops PRISM-owned entries from an event key the new source no longer carries, then deletes the key if it is empty, so a retired registration such as the old \`SubagentStop\` reconcile gate leaves a consumer's settings on the next update while the consumer's own entries under that key stay. The update and doctor command patterns keep \`reconcile-gate\` as a retired entry point so the old entry is still recognized as PRISM's.`
- `manifest.json`: delete the routes at line 3 (`.claude/skills/prism-pr-review/`) and line 49 (`.ai-skills/skills/prism-pr-review/**`). `manifest.base.json`: delete line 47. `manifest.stub.json`: delete line 13. Fix the trailing comma of the entry before each deletion.

### T7: Part 1 — sweep references, templates, and the consumer AGENTS template

- files: .prism/references/triple-gated-adr-criterion.md, .prism/templates/pr-description.md, templates/install/AGENTS.md.tmpl
- proof: grep -nE 'prism-pr-review|prism-self-review|\bEric\b' .prism/references/triple-gated-adr-criterion.md .prism/templates/pr-description.md templates/install/AGENTS.md.tmpl ; test $? -eq 1
- depends on: T1

- `triple-gated-adr-criterion.md` line 41: drop Eric from the reviewer list; line 47 `(Briar review checks, Eric PR review checks, the Iris retrospective persona)` → `(Briar review checks, the Iris retrospective persona)`.
- `pr-description.md` line 3: drop the clause naming Eric or `prism-pr-review` (keep the rest of the sentence).
- `AGENTS.md.tmpl`: routing row line 32 (Reviewing a PR) → `**Briar** (\`prism-review\`)`; line 35 → `**Briar** (\`prism-review\`)`; line 50 → `... invoke \`prism-review\` — not the built-in \`/review\` ...`; line 58 authors-ship text: Briar alone as reviewer; ownership table: delete the Eric row (line 140), line 136 hands-off → `Winston (architecture), Briar (review)`, line 139 → `| Briar | Review — flags issues, doesn't fix them | Clove (fixes) |`; handoff phrases: line 157 → `- Review → "Briar handles review — want me to bring her in?"` and delete line 158.

### T8: Part 1 — sweep the implement, retro, and forge-skill skills

- files: .ai-skills/skills/prism-implement/shared.md, .ai-skills/skills/prism-retro/shared.md, .ai-skills/skills/prism-forge-skill/shared.md
- proof: grep -nE 'prism-pr-review|prism-self-review|PR-review finding|after PR review|and PR review' .ai-skills/skills/prism-implement/shared.md .ai-skills/skills/prism-retro/shared.md .ai-skills/skills/prism-forge-skill/shared.md ; test $? -eq 1
- depends on: T1

- `prism-implement/shared.md` line 1: `review its own work (\`prism-self-review\`)` → `(\`prism-review\`)` (keep any other wording). Line 44: `non-trivial PR-review finding` → `non-trivial PR finding`. Line 56: `then propose \`prism-self-review\` in this session, or \`review pr #<n>\` in a fresh chat.` → `then propose \`prism-review\`.`
- `prism-retro/shared.md` line 18: `It runs after PR review` → `It runs after review`. Line 25: replace `Read all three PR surfaces and merge them, because none alone is complete: issue comments hold the PR reviewer's findings, since it files no review object.` with `Read all three PR surfaces and merge them, because none alone is complete: human reviewers use issue comments, review objects, and inline threads interchangeably.` Line 32: `(the intent, spec, and plan stages, then challenge, implement, verify, review, and PR review)` → `(the intent, spec, and plan stages, then challenge, implement, verify, and review)`. Line 42: describe the misses log as `the rows the session logged after each push`.
- `prism-forge-skill/shared.md` line 15 (the ID-namespace bullet): change the example skill ID `prism-self-review` to `prism-review`, leaving the rest of the line as is.

### T9: Part 1 — sweep the scripts and their fixtures

- files: scripts/ai-skills/verify-manifest-coverage.ts, scripts/ai-skills/verify-manifest-coverage.test.ts, scripts/ai-skills/bootstrap-from-claude.ts, scripts/ai-skills/persona-voice.test.ts, scripts/ai-skills/spec-scope-lint.test.ts
- proof: node --test scripts/ai-skills/verify-manifest-coverage.test.ts scripts/ai-skills/persona-voice.test.ts scripts/ai-skills/spec-scope-lint.test.ts
- depends on: T6
- behavior change: `persona-voice.test.ts` drops the Eric tone test (line 128) because the Eric skill is retired; `verify-manifest-coverage.test.ts`'s `findMissingCoverage` cases key on `briar` instead of `eric` (lines 220, 232, 239) to match the renamed fixture; `spec-scope-lint.test.ts` fixture paths move from `prism-self-review`/`prism-pr-review` to `prism-review` because the old directories no longer exist.

- `verify-manifest-coverage.ts` lines 63–64: the `eric` fixture becomes `briar` with path `.claude/skills/prism-review/SKILL.md`; update the matching `EXPECTED_POSITIVES` entry. It depends on T6 because the routes it checks change there.
- `verify-manifest-coverage.test.ts` lines 220 and 232: the `eric:` keys become `briar:`; line 239 `startsWith("eric ")` → `startsWith("briar ")`.
- `bootstrap-from-claude.ts`: map `thrive-code-review-self` → `prism-review`; delete the `thrive-code-review-pr` row.
- `persona-voice.test.ts`: delete the Eric test at line 128.
- `spec-scope-lint.test.ts`: replace `.ai-skills/skills/prism-self-review/` and `.ai-skills/skills/prism-pr-review/` in fixture paths with `.ai-skills/skills/prism-review/`.

### T10: Part 1 — remove the review labels from reconcile

- files: scripts/ai-skills/hooks/review/reconcile.mjs, scripts/ai-skills/hooks/review/reconcile.d.mts, scripts/ai-skills/review-reconcile.test.ts, scripts/ai-skills/review-reconcile.fixtures.json, .prism/architect/_toolkit/review-runtime.md
- proof: node --test scripts/ai-skills/review-reconcile.test.ts && node --test --test-name-pattern="removes the review labels" scripts/ai-skills/one-review.test.ts && pnpm prism:check-types
- proof fails on main: yes
- depends on: T1
- behavior change: `review-reconcile.test.ts` loses its label and verdict-line cases and the fixture entries they read, because REQ-22 removes the labels.

In `reconcile.mjs` delete `VERDICT_LINE`, `REVIEW_LABELS`, `SUMMARY_MARKER`, `planLabels`, `expectedLabels`, the label read and write calls, and the label fields of the `--json` output; remove the "labels" item from the usage text. Keep threads, human comments, PR-body headings, the misses log, and `--classes`. Mirror the removed exports in `reconcile.d.mts`. In `review-runtime.md` delete the "**Labels.**" paragraph and the clause `corrects the review labels,` in the `reconcile.mjs` intro, and in the "Why the login check gates every write" paragraph drop `or read the summary the labels follow` (keep the rest). This task sits in part 1 because `reconcile-gate.test.ts`, which T3 deletes, imports `reconcile.mjs`; see the Decision on it.

### T11: Part 1 — regenerate the outputs

- files: AGENTS.md, .codex/config.toml, .claude/rules/skill-routing.md, .codex/rules/skill-routing.md, .cursor/rules/skill-routing.mdc, .claude/rules/workflow.md, .codex/rules/workflow.md, .cursor/rules/workflow.mdc, .claude/rules/branch-plan.md, .codex/rules/branch-plan.md, .cursor/rules/branch-plan.mdc, .claude/rules/git-conventions.md, .codex/rules/git-conventions.md, .cursor/rules/git-conventions.mdc, .claude/rules/followup-scope.md, .codex/rules/followup-scope.md, .cursor/rules/followup-scope.mdc, .claude/rules/code-standards.md, .codex/rules/code-standards.md, .cursor/rules/code-standards.mdc, .claude/rules/context-reuse.md, .codex/rules/context-reuse.md, .cursor/rules/context-reuse.mdc, .claude/rules/design-governance.md, .codex/rules/design-governance.md, .cursor/rules/design-governance.mdc, .claude/rules/architect-doc-verification.md, .codex/rules/architect-doc-verification.md, .cursor/rules/architect-doc-verification.mdc, .claude/rules/implementation-task-detail.md, .codex/rules/implementation-task-detail.md, .cursor/rules/implementation-task-detail.mdc, .claude/rules/lazy-artifacts.md, .codex/rules/lazy-artifacts.md, .cursor/rules/lazy-artifacts.mdc, .claude/rules/skill-authoring.md, .codex/rules/skill-authoring.md, .cursor/rules/skill-authoring.mdc, templates/install/.prism/rules/workflow.md, templates/install/.prism/rules/git-conventions.md, templates/install/.prism/rules/followup-scope.md, templates/install/.prism/rules/code-standards.md, templates/install/.prism/rules/context-reuse.md, templates/install/.prism/rules/design-governance.md, templates/install/.prism/rules/lazy-artifacts.md, .claude/architect/_toolkit/skills-ecosystem.md, .codex/architect/_toolkit/skills-ecosystem.md, .cursor/architect/_toolkit/skills-ecosystem.md, .claude/architect/_toolkit/closing-messages.md, .codex/architect/_toolkit/closing-messages.md, .cursor/architect/_toolkit/closing-messages.md, .claude/architect/_toolkit/ticket-workflows.md, .codex/architect/_toolkit/ticket-workflows.md, .cursor/architect/_toolkit/ticket-workflows.md, .claude/architect/_toolkit/audit-workflow.md, .codex/architect/_toolkit/audit-workflow.md, .cursor/architect/_toolkit/audit-workflow.md, .claude/architect/_toolkit/plan-authoring.md, .codex/architect/_toolkit/plan-authoring.md, .cursor/architect/_toolkit/plan-authoring.md, .claude/architect/_toolkit/hook-runtime.md, .codex/architect/_toolkit/hook-runtime.md, .cursor/architect/_toolkit/hook-runtime.md, .claude/architect/manifest.json, .codex/architect/manifest.json, .cursor/architect/manifest.json, .claude/architect/_toolkit/manifest.base.json, .codex/architect/_toolkit/manifest.base.json, .cursor/architect/_toolkit/manifest.base.json, .claude/architect/_toolkit/eric-review-modes.md, .codex/architect/_toolkit/eric-review-modes.md, .cursor/architect/_toolkit/eric-review-modes.md, templates/install/.prism/architect/_toolkit/closing-messages.md, templates/install/.prism/architect/_toolkit/audit-workflow.md, templates/install/.prism/architect/_toolkit/manifest.base.json, templates/install/.prism/architect/_toolkit/eric-review-modes.md, .claude/references/shipping-flow.md, .codex/references/shipping-flow.md, .cursor/references/shipping-flow.md, .claude/references/triple-gated-adr-criterion.md, .codex/references/triple-gated-adr-criterion.md, .cursor/references/triple-gated-adr-criterion.md, .claude/references/pr-review/github-writes.md, .codex/references/pr-review/github-writes.md, .cursor/references/pr-review/github-writes.md, templates/install/.prism/references/shipping-flow.md, templates/install/.prism/references/triple-gated-adr-criterion.md, templates/install/.prism/references/pr-review/github-writes.md, .claude/templates/pr-description.md, .codex/templates/pr-description.md, .cursor/templates/pr-description.md, templates/install/.prism/templates/pr-description.md, .claude/architect/_toolkit/review-runtime.md, .codex/architect/_toolkit/review-runtime.md, .cursor/architect/_toolkit/review-runtime.md, templates/install/.prism/architect/_toolkit/review-runtime.md, .claude/skills/prism-review/SKILL.md, .claude/skills/prism-review/.ai-skill-generated, .cursor/skills/prism-review/SKILL.md, .cursor/skills/prism-review/.ai-skill-generated, .claude/agents/prism-review.md, .codex/agents/prism-review.toml, .claude/skills/prism-self-review/SKILL.md, .claude/skills/prism-self-review/.ai-skill-generated, .cursor/skills/prism-self-review/SKILL.md, .cursor/skills/prism-self-review/.ai-skill-generated, .claude/agents/prism-self-review.md, .codex/agents/prism-self-review.toml, .claude/skills/prism-pr-review/SKILL.md, .claude/skills/prism-pr-review/.ai-skill-generated, .cursor/skills/prism-pr-review/SKILL.md, .cursor/skills/prism-pr-review/.ai-skill-generated, .claude/agents/prism-pr-review.md, .codex/agents/prism-pr-review.toml, .claude/skills/prism-implement/SKILL.md, .cursor/skills/prism-implement/SKILL.md, .claude/agents/prism-implement.md, .codex/agents/prism-implement.toml, .claude/skills/prism-retro/SKILL.md, .cursor/skills/prism-retro/SKILL.md, .claude/agents/prism-retro.md, .codex/agents/prism-retro.toml, .claude/skills/prism-forge-skill/SKILL.md, .cursor/skills/prism-forge-skill/SKILL.md
- proof: pnpm prism:check
- depends on: T2, T3, T4, T5, T6, T7, T8, T9, T10

Run `pnpm prism:build`. It rewrites the host copies and the non-curated seed mirrors, generates the `prism-review` skill and agent files, and removes the `prism-self-review` and `prism-pr-review` generated files and the host copies of the two moved docs. Then `git rm templates/install/.prism/architect/_toolkit/eric-review-modes.md templates/install/.prism/references/pr-review/github-writes.md` if the build left them (the seed mirror does not delete orphans). Run `pnpm prism:check`; fix any failure in the task that owns the source file, not here. Commit only the listed paths `git status -s` shows; `.codex/config.toml` changes only if `AGENTS.md` crosses a 64 KiB step. A path the build changes that is not listed here is reported as `unlisted:` in the build report.

### T12: Part 1 — run the live nested-dispatch probe

- files: .prism/architect/_toolkit/hook-runtime.md, templates/install/.prism/architect/_toolkit/hook-runtime.md, .claude/architect/_toolkit/hook-runtime.md, .codex/architect/_toolkit/hook-runtime.md, .cursor/architect/_toolkit/hook-runtime.md
- proof: grep -n 'Nested dispatch' .prism/architect/_toolkit/hook-runtime.md && pnpm prism:check
- depends on: T11

Run unattended by the main session after T11, so the regenerated `.claude/agents/prism-review.md` exists. A build subagent cannot run it, because it is already one layer down. The main session already showed general-purpose → general-purpose nesting works on 2026-11-27T07:54Z; this repeats the check with `prism-review` as the middle layer. From the repo root, run:

```bash
claude -p --allowedTools Agent --output-format text "Use the Agent tool to dispatch the prism-review subagent with exactly this prompt: 'Probe only. Review nothing and write no file. Use the Agent tool once to launch a general-purpose subagent with the prompt: Reply with exactly the word pong. Then reply with exactly one line: PROBE inner=<that subagent's reply>, or PROBE inner=failed: <the error or the reason no Agent tool was available>.' Then print the prism-review subagent's reply verbatim and nothing else."
```

Pass is a last stdout line of exactly `PROBE inner=pong`. `PROBE inner=failed: ...`, a missing `PROBE` line, or a non-zero exit is a failed probe. Record it either way; a failure does not fail the task. Record:

- in `hook-runtime.md` and its curated twin, a `### Nested dispatch` paragraph under the Brief gate section: the date (Central time), the command above in short form, the final output line verbatim, that Codex is unprobed, and that where a dispatched review cannot launch subagents it sweeps the passes itself and prints the same coverage line (REQ-26).
- in the part 1 PR body, one line with the same final output line. The PR stage writes it when it opens the PR. Do not record it under `## Verification`, because an empty `## Verification` is what starts the verify stage.

Then run `pnpm prism:build` to refresh the three host copies and `pnpm prism:check`.

### T13: Part 1 — prove the upgrade from the 1.0.0 tree

- files: .prism/plans/prism-553/plan.md
- proof: grep -n '## Release proof' .prism/plans/prism-553/plan.md
- depends on: T12

Follow the release-proof pattern in `.prism/plans/prism-550/plan.md` (its T9 and its `## Release proof` section). In a scratch dir: `git worktree add <tmp>/old 37cdbd28`, `pnpm pack` there and here; make a consumer repo with `git init`, run `prism init` then `prism adopt` from the old pack with all three hosts, add a consumer `SubagentStop` entry `{ "matcher": "^my-agent$", "hooks": [{ "type": "command", "command": "node scripts/mine.mjs" }] }` to its `.claude/settings.json`, then `prism update` from the branch pack. Record each command and its output under a `## Release proof` section appended to this plan, checking AC-6's list:

- `ls .claude/skills .cursor/skills .agents/skills | grep -E 'prism-(pr|self)-review'` prints nothing
- `ls .claude/agents .codex/agents | grep -E 'prism-(pr|self)-review'` prints nothing
- `node -e` over `.claude/settings.json` and `.codex/hooks.json` shows no `SubagentStop` entry whose command names `reconcile-gate`, and the consumer's `^my-agent$` entry present
- `test ! -e .claude/hooks/reconcile-gate.mjs && test -e .claude/hooks/reconcile-gate.mjs.bak`
- `test ! -e .prism/references/pr-review/github-writes.md && test ! -e .prism/architect/_toolkit/eric-review-modes.md`, and the same two paths under `.claude/`, `.codex/`, and `.cursor/` are absent
- `prism doctor` exits 0. Record whether it warns about the consumer's own `.prism/architect/manifest.json` still routing `.claude/skills/prism-pr-review/**` (the live manifest is consumer-owned, so update leaves it). A warning there is recorded, not a failure.

Remove the worktree and scratch dir after.

### T14: Part 2 — record part 1 as shipped

- files: .prism/plans/prism-553/plan.md
- proof: node scripts/ai-skills/hooks/plan/tasks.mjs .prism/plans/prism-553/plan.md
- depends on: T13

On part 2's branch, cut from `main` after part 1 squash-merges, append a `## History` line naming part 1's PR and commit `node scripts/ai-skills/hooks/plan/commit.mjs "T1-T14: Record part 1 as shipped" .prism/plans/prism-553/plan.md`, per the stacked-ticket note in `plan-chain-scripts.md`. The proof prints T1 to T14 done.

### T15: Part 2 — add review/ignore.mjs and reviewIgnore

- files: scripts/ai-skills/hooks/review/ignore.mjs, scripts/ai-skills/hooks/review/ignore.d.mts, scripts/ai-skills/review-ignore.test.ts, .ai-skills/config.schema.json, .ai-skills/config.json
- proof: node --test scripts/ai-skills/review-ignore.test.ts && node -e "JSON.parse(require('fs').readFileSync('.ai-skills/config.schema.json','utf8'))" && node --test scripts/ai-skills/plan-config-schema.test.ts
- proof fails on main: yes
- depends on: T14

Write `review-ignore.test.ts` first. `ignore.mjs` carries the `@prism-hook-runtime` marker and imports `compileMatcher` from `../lib/match.mjs`. Exports:

- `DEFAULT_REVIEW_IGNORE` — `.prism/plans/**`, `.prism/lessons.md`, `.prism/retros/**`, `.prism/audits/**`, `.prism/metrics/**`, `REVIEW.md`, `.githooks/**`, `.claude/hooks/**`; `.prism/<g>` for each glob in `PRISM_OWNED_GLOBS` (written out); for each host `H` in `.claude`, `.codex`, `.cursor`: `H/rules/**`, `H/architect/**`, `H/spec/**`, `H/templates/**`, `H/references/**`, `H/review/**`, `H/SPEC.md`; `S/prism-*/**` and `S/tdd/**` for each skill root `S` in `.claude/skills`, `.cursor/skills`, `.agents/skills`; `.claude/agents/prism-*.md` and `.codex/agents/prism-*.toml`.
- `DEFAULT_REVIEW_KEEP` — `.prism/architect/*.md`, `.prism/spec/adrs/*.md`, `.prism/architect/manifest.json`, `.prism/custom/**`, `.prism/review/stack/**` (`CONSUMER_OWNED_GLOBS` minus `plans/**` and `lessons.md`, which the ignore list names).
- `resolveReviewIgnore(config)` — returns `{ ignore, keep }`. An absent `reviewIgnore` key returns both defaults. A set array returns `{ ignore: <it>, keep: [] }`, so a set value replaces both lists. A non-array, a non-string entry, or a pattern holding `{` throws an `Error` naming the key, as `resolveStopPaths` in `plan/stop-paths.mjs` does.
- `isNeverReviewed(path, lists)` — true when `path` matches `ignore` and not `keep`, matched case-sensitively through `compileMatcher`.

Test cases: default contents; the `.prism/` entries of the default equal `PRISM_OWNED_GLOBS` prefixed with `.prism/`, and `DEFAULT_REVIEW_KEEP` equals `CONSUMER_OWNED_GLOBS` minus `plans/**` and `lessons.md` prefixed with `.prism/` (import both from `../ownership.ts`); `.prism/spec/adrs/0001-x.md` is reviewable under the default and `.prism/spec/adrs/_toolkit/0001-x.md` is not; a consumer skill `.claude/skills/acme-x/SKILL.md` is reviewable; set-list replacement; each malformed value throws.

`config.schema.json`: add `reviewIgnore` as `{ "type": "array", "items": { "type": "string" }, "description": "Globs in the manifest route dialect naming paths the review never raises a finding on. Unset takes the hook runtime's default in review/ignore.mjs. Set replaces the default, its keep-list exceptions included." }`.

`.ai-skills/config.json`: set `"reviewIgnore"` to `.prism/plans/**`, `.prism/lessons.md`, `.prism/retros/**`, `.prism/audits/**`, `.prism/metrics/**`, then for each host `H` in `.claude`, `.codex`, `.cursor`: `H/rules/**`, `H/architect/**`, `H/spec/**`, `H/templates/**`, `H/references/**`, `H/review/**`, `H/SPEC.md`; `.claude/skills/**`, `.cursor/skills/**`, `.claude/agents/**`, `.codex/agents/**`. Not `.claude/settings.json`, `templates/install/**`, `AGENTS.md`, `REVIEW.md`, or `.ai-skills/**`.

### T16: Part 2 — add review/record.mjs

- files: scripts/ai-skills/hooks/review/record.mjs, scripts/ai-skills/hooks/review/record.d.mts, scripts/ai-skills/review-record.test.ts
- proof: node --test scripts/ai-skills/review-record.test.ts scripts/ai-skills/plan-retro-line.test.ts
- proof fails on main: yes
- depends on: T15

Write the test first. `record.mjs <plan.md> <report.json>` with the runtime marker and a realpath entry guard like the plan-chain commands. It reads the report shape in the spec's `record.mjs` section, resolves `reviewIgnore` from `.ai-skills/config.json` at the repo root via `resolveReviewIgnore`, and:

- exits 2 with a message on a missing argument, unreadable or non-JSON report, `round` not 1 or 2, a missing `sha`, `passes` or `findings` not arrays, a finding without `severity` or `file`, a `part` without integer `k` and `m`, or a malformed config;
- exits 1 writing nothing, naming each offending finding, when any finding's `file` is never-reviewed;
- otherwise computes the verdict: `clean` when no finding with severity `critical` or `major` is open apart from findings with `kind: "decision"`, and every pass token starts with `swept — ` or `n/a: `; else `<crit> critical, <maj> major, <min> minor, <nit> nit`, where the counts leave out `kind: "decision"` findings. A finding's optional `kind` is the `REVIEW.md` finding kind, plus `decision` for a decision item;
- appends `- review round <n> at <sha>[ (part <k> of <m>)]: <verdict>` as the last line of the `## Review` section (before the next `## ` heading), creating `## Review` at the end of the file when absent, and exits 0.

Test cases: clean round; a round whose only Major carries `kind: "decision"` is `clean`, and the same finding without that kind gives `0 critical, 1 major, 0 minor, 0 nit`; a bare `swept` makes it unclean; counts verdict; part marker; heading created; a never-reviewed finding exits 1 and leaves the file byte-identical; round 3 exits 2; a `- pr-review round 1 at abc1234: clean` line already under `## Review` is kept and the new line follows it.

### T17: Part 2 — add review/post.mjs

- files: scripts/ai-skills/hooks/review/post.mjs, scripts/ai-skills/hooks/review/post.d.mts, scripts/ai-skills/review-post.test.ts
- proof: node --test scripts/ai-skills/review-post.test.ts
- proof fails on main: yes
- depends on: T15

Write the test first, with a fake `gh` the way `plan-watch-ci.test.ts` injects one. `post.mjs <pr> <file> <line> <body-file>` with the runtime marker and entry guard. Export `postComment({ pr, file, line, bodyFile, gh, cwd })` with `gh` an injectable `(args: string[]) => { status, stdout, stderr }` runner (default: `spawnSync("gh", args)` with no shell). It:

- exits 2 when an argument is missing, `<line>` is not a positive integer, the body file is unreadable, or `github.owner`/`github.repo` is missing from `.ai-skills/config.json`;
- exits 1 posting nothing when `<file>` is never-reviewed;
- reads `headRefOid` with `gh pr view <pr> --json headRefOid -q .headRefOid`;
- prepends `<!-- prism-agent -->\n` when the body's first line is not that marker;
- posts with `gh api repos/<owner>/<repo>/pulls/<pr>/comments -f body=<body> -f commit_id=<oid> -f path=<file> -F line=<line> -f side=RIGHT`;
- exits 1 with `post: line outside the diff (422)` when `gh` reports a 422, and passes any other `gh` failure through as exit 1 with its stderr.

### T18: Part 2 — deliver the three review modules

- files: scripts/ai-skills/update.ts, scripts/ai-skills/plan-runtime-delivery.test.ts
- proof: node --test scripts/ai-skills/plan-runtime-delivery.test.ts
- proof fails on main: yes
- depends on: T16, T17

Add `review/ignore.mjs`, `review/record.mjs`, and `review/post.mjs` to `HOOK_RUNTIME_FILES` beside `review/reconcile.mjs` (not to `HOOK_RUNTIME_ENTRY_POINTS`; they run as `node <file>`). Append the three to the expected list in `plan-runtime-delivery.test.ts`.

### T19: Part 2 — rewrite the rulebook

- files: REVIEW.md, .prism/review/intent-scope.md, .prism/review/docs-citations.md
- proof: node --test scripts/ai-skills/one-review.test.ts && { grep -nE 'Plan drift|whole PR is in scope|confirm pass|3-round|prism-pr-review|prism-self-review' REVIEW.md .prism/review/*.md ; test $? -eq 1; }
- depends on: T14, T10, T20

`REVIEW.md` (line numbers at `ceab998d`):

- Line 4: `Both \`prism-self-review\` and \`prism-pr-review\` read this file.` → `\`prism-review\` reads this file.`
- Line 15: `The exit rule below holds the review until it is fixed.` → `It is fixed inside the rounds when it can be, and it never earns a round of its own.`
- Line 52 paragraph ("In `plan.md`, name a rule ...") — delete.
- "The whole PR is in scope" section (lines 62–66) — replace with `## The plan is the yardstick` and one paragraph: `The review reads \`intent.md\`, \`spec.md\`, and \`plan.md\` to judge the diff and raises no finding on their prose. The PR body is never reviewed. Published docs, code comments, and the changelog earn a finding only when they are wrong about the code. Paths \`reviewIgnore\` names are never reviewed, and \`review/record.mjs\` refuses a finding that cites one.`
- Exit rule (lines 93–97): line 93 → `The exit rule is zero Critical and zero Major findings apart from decision items, with every pass reading \`swept\` or \`n/a\`.`; delete line 95; line 97 `where \`prism-pr-review\` posts it as an inline comment` → `where the session posts it as an inline comment through \`review/post.mjs\``. Add after line 101: `**What is left after round 2.** Minors, decision items, and any Critical or Major still open are listed in the PR body. A Critical or Major is also posted inline through \`review/post.mjs\`, and the run goes on.`
- Rounds and range: line 108 — drop the sentence starting `In PR review, when anyone has reviewed` through `the run reviews the full PR.` and end the bullet at `It starts after the review's own last round.`; line 109 → `- **Rounds.** At most two rounds. What is left after round 2 goes to the PR body, per the exit rule.`; lines 112–117 record bullet → `- **Record.** The session records each round with \`node ${HOOK_RUNTIME_DIR}/review/record.mjs <plan.md> <report.json>\`, which writes \`- review round <n> at <short sha>[ (part <k> of <m>)]: <verdict>\` under \`## Review\` and nothing else. \`<verdict>\` is \`clean\` or \`<crit> critical, <maj> major, <min> minor, <nit> nit\`. A legacy flat plan records under \`## Review Issues\` instead. Older \`self-review\` and \`pr-review\` lines stay valid wherever a script reads them.` Keep the stacked-ticket paragraph (line 119) with "a line whose `<k>` is less than `<m>` is never a final verdict".
- Line 121 "When a round is clean" → `A round's verdict is \`clean\` exactly when zero Critical and zero Major are open apart from decision items and every pass reads \`swept — …\` or \`n/a: …\`.`
- Line 123 "The final verdicts" → `The review is final when its last line is \`clean\` or is round 2.`
- "After a fix": delete step 3 and the "Why one confirm pass" paragraph (lines 131, 135); line 133 → `**The last round is the final pass over the final diff.** It pins the head the PR ships, and its full-range passes read the whole PR there. The retro runs after it.`
- Line 148: `A loop at its 3-round cap` → `A loop at its two-round cap`.

`.prism/review/intent-scope.md`: delete line 12 (Plan drift checklist line) and lines 36–59 (the "Plan drift is reconciled, not reported" section including "Reconcile against the Decision"), keeping the stack-checks line. Rewrite "Where the grades go" (line 34): `**Where the grades go.** Grades go in the review's report to the session. An unmet criterion is a finding. Criteria awaiting a person are listed in the PR body.`

`.prism/review/docs-citations.md`: line 10 `changed prose in a plan, retro, doc, or comment` → `changed prose in a doc or comment`; delete line 11 (the "No section sign in a plan folder" bullet).

### T20: Part 2 — set the merge bar, drop the bookkeeping exemption, post leftovers

- files: .prism/rules/git-conventions.md, .prism/rules/followup-scope.md, .prism/rules/workflow.md, .ai-skills/config.schema.json
- proof: grep -n 'has-minors\|Bookkeeping findings are recorded' .prism/rules/git-conventions.md .prism/rules/followup-scope.md .ai-skills/config.schema.json ; test $? -eq 1 && node -e "JSON.parse(require('fs').readFileSync('.ai-skills/config.schema.json','utf8'))" && node --test scripts/ai-skills/plan-config-schema.test.ts
- depends on: T14, T15

- `git-conventions.md` "Who merges": line 112 `This is the merge-side complement of "Eric never approves PRs": the review-side rule binds the reviewer;` → `This is the merge-side complement of "reviewers never approve PRs": that rule binds the reviewer;`. Line 118 → `The main session may flip a PR ready and squash-merge it when \`features.mainSessionMayMerge: true\` is set in \`.ai-skills/config.json\`, the plan's last review line under \`## Review\` reads \`clean\`, and CI is green on the head. The flag is the gate: absent or false means the human merges. A team opts in by setting the flag by hand; installs leave it absent. A reviewer or a subagent never merges, whatever the flag says.`
- `followup-scope.md`: delete the "Bookkeeping findings are recorded, not gated" section (lines ~80–91 at `ceab998d`, from its `##` heading to the line before `## Who runs this rule`). Keep "Spec content never rides an unrelated ticket" and its lint.
- `workflow.md` Advancing: replace the part-1 sentence `A call only the person can make, and anything the review can't fix in its rounds, is listed in the PR body and the closing summary.` with `A call only the person can make, and anything the review can't fix in its two rounds, is listed in the PR body and the closing summary, and a decision item or a Critical or Major left open is also posted inline through \`node ${HOOK_RUNTIME_DIR}/review/post.mjs\`.` Line 12 `A stage runs at most 3 rounds` stays (it covers the other stages; REVIEW.md caps the review at two).
- `config.schema.json` `mainSessionMayMerge` description → `When true, the main session may squash-merge a PR once the plan's last review line reads \`clean\` and CI is green on the head. Absent or false by default — merge remains a human action.`

### T21: Part 2 — record through record.mjs in the skill, template, and runtime doc

- files: .ai-skills/skills/prism-review/shared.md, .prism/templates/plan.md, .prism/architect/_toolkit/review-runtime.md
- proof: grep -q 'review/record.mjs' .ai-skills/skills/prism-review/shared.md && grep -q 'review/record.mjs' .prism/templates/plan.md && grep -q 'review/record.mjs' .prism/architect/_toolkit/review-runtime.md && { grep -n 'Fix plan drift\|3-round' .ai-skills/skills/prism-review/shared.md ; test $? -eq 1; }
- depends on: T16, T17, T19

- `prism-review/shared.md` "Write the plan before the chat", plan-folder bullet → `- **On a plan folder,** write the round's report JSON to a temp file in the shape \`REVIEW.md\` names, marking each decision item \`kind: "decision"\` so the verdict leaves it out, run \`node ${HOOK_RUNTIME_DIR}/review/record.mjs <plan.md> <report.json>\`, and commit with \`node ${HOOK_RUNTIME_DIR}/plan/commit.mjs "plan: review record" <plan.md>\`. Add \`part\` when the plan's Decisions declare a stack and this PR is not its last part. Exit 1 means a finding cites a never-reviewed path: drop it and record again. Findings and criterion grades go in the report, not the plan.` Delete the "Fix plan drift in place" bullet. "Report": `Ready for PR` verdict stays; append `Minors, decision items, and anything left after round 2 are listed for the PR body.` "Rounds and guardrails": `up to the 3-round cap per \`REVIEW.md\`` → `up to the two-round cap per \`REVIEW.md\``; `On a folder plan its only writes are the record line and the in-place plan-drift fixes` → `On a folder plan its only write is the record line`.
- `.prism/templates/plan.md` `## Review` comment → `One line per review round, "- review round <n> at <sha>[ (part <k> of <m>)]: <verdict>", written by review/record.mjs per REVIEW.md.`
- `review-runtime.md` (T10 already removed the labels text): add after the reconcile section: `The session runs \`reconcile.mjs <pr> --json\` after each push and logs each unlogged human comment, per \`.prism/references/shipping-flow.md\`.` Add three sections, `## review/ignore.mjs`, `## review/record.mjs`, `## review/post.mjs`, each stating the contract T15, T16, or T17 implements (arguments, exit codes, what it writes or posts) in the doc's existing voice. Update "Invocation" to name all five scripts. In the retro-line check's "Stacked tickets" paragraph, replace `[\`REVIEW.md\`](../../../REVIEW.md) gives the \`self-review\` lines the same marker and says a line whose \`<k>\` is less than \`<m>\` is never a final verdict.` with `[\`REVIEW.md\`](../../../REVIEW.md) gives the \`review round\` lines \`record.mjs\` writes the same marker and says a line whose \`<k>\` is less than \`<m>\` is never a final verdict.` Leave the rest of the section as is (child 13 rekeys it).

### T22: Part 2 — add ADR-0087 and amend 0011 and 0078

- files: .prism/spec/adrs/_toolkit/0087-one-review-replaces-the-pr-reviewer-and-labels.md, .prism/spec/adrs/_toolkit/0011-eric-never-approves-prs.md, .prism/spec/adrs/_toolkit/0078-main-session-holds-merge-authority-and-the-conductor-is-retired.md, .prism/spec/adrs/_toolkit/README.md, .ai-skills/definitions/seed-curation.json
- proof: pnpm prism:crossref-lint && grep -c 'ADR-0087' .prism/spec/adrs/_toolkit/0011-eric-never-approves-prs.md .prism/spec/adrs/_toolkit/0078-main-session-holds-merge-authority-and-the-conductor-is-retired.md
- depends on: T14

Confirm 0087 is free with `ls .prism/spec/adrs/_toolkit/ | sort | tail -2`. Write ADR-0087 per `.prism/architect/guides/writing-an-adr.md`, `Status: accepted`. Context: two review skills read one rulebook; the PR reviewer re-read what self-review had read, posted labels nothing consumed, and its confirm pass and bookkeeping exemption existed to bound its loop (cite epic #499's third amendment). Decision: one review, `prism-review` (Briar), on a branch or a PR read-only, dispatched as a fresh subagent; exit on zero Critical and zero Major in at most two rounds; no labels, no verdict marker, no confirm pass; never-reviewed paths via `reviewIgnore`; `record.mjs` and `post.mjs` own the plan line and the inline comment; merge bar is a `clean` last line plus green CI. Alternatives: keep both skills with the cheaper exit (lost: the second read found little the first missed and doubled cost); keep labels for humans (lost: nothing read them). Consequences: a fresh-context PR read is gone, replaced by the fresh subagent; Minors no longer gate; `plan-retro-line.ts` reads only `pr-review` lines until child 13. ADR-0011 and ADR-0078: add `> Amended by [ADR-0087](./0087-one-review-replaces-the-pr-reviewer-and-labels.md): <one sentence on what no longer applies>.` after the existing status block, as ADR-0068 line 8 does. `README.md`: add the 0087 row at the end of the index table; amend the 0078 row's summary to say its merge bar is amended by 0087 (0011 has no row; the index starts at 0022). `seed-curation.json`: add `spec/adrs/_toolkit/0087-one-review-replaces-the-pr-reviewer-and-labels.md` to `excluded`, beside the 0078 entry.

### T23: Part 2 — regenerate the outputs

- files: AGENTS.md, .codex/config.toml, scripts/ai-skills/one-review.test.ts, templates/install/REVIEW.md, .claude/review/intent-scope.md, .codex/review/intent-scope.md, .cursor/review/intent-scope.md, .claude/review/docs-citations.md, .codex/review/docs-citations.md, .cursor/review/docs-citations.md, templates/install/.prism/review/intent-scope.md, templates/install/.prism/review/docs-citations.md, .claude/rules/git-conventions.md, .codex/rules/git-conventions.md, .cursor/rules/git-conventions.mdc, .claude/rules/followup-scope.md, .codex/rules/followup-scope.md, .cursor/rules/followup-scope.mdc, .claude/rules/workflow.md, .codex/rules/workflow.md, .cursor/rules/workflow.mdc, templates/install/.prism/rules/git-conventions.md, templates/install/.prism/rules/followup-scope.md, templates/install/.prism/rules/workflow.md, .claude/templates/plan.md, .codex/templates/plan.md, .cursor/templates/plan.md, templates/install/.prism/templates/plan.md, .claude/architect/_toolkit/review-runtime.md, .codex/architect/_toolkit/review-runtime.md, .cursor/architect/_toolkit/review-runtime.md, templates/install/.prism/architect/_toolkit/review-runtime.md, .claude/spec/adrs/_toolkit/0087-one-review-replaces-the-pr-reviewer-and-labels.md, .codex/spec/adrs/_toolkit/0087-one-review-replaces-the-pr-reviewer-and-labels.md, .cursor/spec/adrs/_toolkit/0087-one-review-replaces-the-pr-reviewer-and-labels.md, .claude/spec/adrs/_toolkit/0011-eric-never-approves-prs.md, .codex/spec/adrs/_toolkit/0011-eric-never-approves-prs.md, .cursor/spec/adrs/_toolkit/0011-eric-never-approves-prs.md, .claude/spec/adrs/_toolkit/0078-main-session-holds-merge-authority-and-the-conductor-is-retired.md, .codex/spec/adrs/_toolkit/0078-main-session-holds-merge-authority-and-the-conductor-is-retired.md, .cursor/spec/adrs/_toolkit/0078-main-session-holds-merge-authority-and-the-conductor-is-retired.md, .claude/spec/adrs/_toolkit/README.md, .codex/spec/adrs/_toolkit/README.md, .cursor/spec/adrs/_toolkit/README.md, .claude/skills/prism-review/SKILL.md, .cursor/skills/prism-review/SKILL.md, .claude/agents/prism-review.md, .codex/agents/prism-review.toml
- proof: pnpm prism:check
- depends on: T18, T19, T20, T21, T22

Run `pnpm prism:build`, then `pnpm prism:check`; fix a failure in the task that owns the source. Commit only the listed paths `git status -s` shows changed.

After the build, edit `one-review.test.ts`: in the sweep case, drop the part-1 allowlist entries for `templates/install/REVIEW.md` and `templates/install/.prism/review/`, and add `REVIEW.md` and `.prism/review` to the scanned roots. Widen case 7, "removes the review labels", to also read `REVIEW.md`, every file in `.prism/review/`, `.prism/rules/git-conventions.md`, `.prism/rules/followup-scope.md`, and `.ai-skills/config.schema.json`, with the same pattern. These edits wait for T23 because the mirror `templates/install/REVIEW.md` and the T20 rule edits must land first. Rerun `node --test scripts/ai-skills/one-review.test.ts` and `pnpm prism:check`.

Then dispatch `prism-review` on the part 2 branch per REQ-27's CI and the spec's Decision that this child runs on the new exit rule.

## Challenge

round 1: blocking 4
  - T9 (blocking): `scripts/ai-skills/verify-manifest-coverage.test.ts` is not in `files` or `behavior change`, yet its `findMissingCoverage` cases (lines 220, 232) key on `eric`, so renaming the fixture to `briar` fails T9's own proof.
  - T12 (blocking): writing probe lines under `## Verification` makes that section non-empty, so the resume table's verify row (`## Verification` empty) never fires and prism-verify's section is pre-filled with non-report lines; and "start a fresh Claude Code session" names no mechanism an unattended run can perform (headless `claude -p`, or a `[HITL]` tag).
  - T16 (blocking): the report shape has no decision-item marker, so `record.mjs` counts a Critical or Major decision item as unclean while T19's `REVIEW.md` makes the round `clean` apart from decision items; T16 and T21 need one agreed field (such as `kind: "decision"`) excluded from the verdict.
  - plan (blocking): `.prism/rules/branch-plan.md` line 236 still says the review "covers the whole PR" and that intent-scope "fixes other plan drift ... in place", which part 2 retires (REQ-15); no task edits it, and T4 only changes its "final PR review" wording.
  - T8 (non-blocking): the `prism-retro` line 25 instruction ("replace ... with `the PR's comments, reviews, and check rollup` (already present)") gives no replacement text for "issue comments hold the PR reviewer's findings", and the line 32 drop leaves "verify, review, )" unspecified.
  - plan (non-blocking): a consumer's live `manifest.json` (consumer-owned, never rewritten) keeps `.claude/skills/prism-pr-review/**` -> `_toolkit/eric-review-modes.md` after update, and doctor's empty-route warning may fire; T13 does not run `prism doctor` or check that the moved `.prism/` files and their host copies left the consumer, and it omits `prism init` before `prism adopt`.
  - plan (non-blocking): `review-runtime.md` line 91 ("REVIEW.md gives the `self-review` lines the same marker") goes false after T19, and T21 leaves that section untouched.
  - plan (non-blocking): nothing says part 1 goes to verify, review, and PR after T13 while T14 to T23 stay open, so the resume table's implement row keeps matching on part 1's branch.
round 2: blocking 1
  - T19 (blocking): its proof runs all of `one-review.test.ts`, which cannot pass at T19's commit. The widened label case reads `git-conventions.md` line 118, `followup-scope.md` line 80, and the schema's `mainSessionMayMerge` description, all of which hold `review:has-minors` until T20. T20 is not a dependency, and the two share no file, so the bundle check lets them run in parallel. Dropping the `templates/install/REVIEW.md` allowlist entry also fails: that mirror keeps lines 4 and 97 naming both old skills until T23's build. Fix by narrowing T19's proof with `--test-name-pattern`, or by adding `depends on: T20` and moving the allowlist removal into T23.
  - plan (non-blocking): the "Part 1 ships from T13" Decision does not say the retro waits for part 2. After part 1's PR opens, the resume table's retro row (`Retro:` empty) matches, and `prism-retro` would write `> Closed:` with T14 to T23 still open.
  - T3 (non-blocking): `mergeHookRegistration` takes `(sourcePath, targetPath, pattern, dryRun)`, so step 1(a) has to write temp files and cannot pass a settings object. Its JSDoc ("an event name the consumer hasn't registered is added outright") also needs a sentence on dropping target-only keys.
  - T18 (non-blocking): changes `update.ts` behavior, but has no `proof fails on main: yes`. Its appended expectations fail on `main`.

round 3: blocking 4
  - T4 (blocking): the proof `node --test … && grep … | grep -v … ; test $? -eq 1` passes when the routing test fails, because a failed `node --test` exits 1 and skips the grep, so `test $? -eq 1` reads that 1 as success. Replace the tail with `! grep …` so each half must hold.
  - T6 (blocking): same shape. A failing `pnpm prism:verify-manifest` exits 1, skips the grep, and the proof passes.
  - T19 (blocking): same shape. A failing `node --test scripts/ai-skills/one-review.test.ts` exits 1 and the proof passes.
  - T21 (blocking): `grep -n 'review/record.mjs' … && grep -n 'Fix plan drift\|3-round' … ; test $? -eq 1` passes when the first grep finds nothing, which is the state before T21's edits.
  - plan (non-blocking): rounds 1 and 2 are written `- round 1: blocking 4` and `- round 2: blocking 1`, and `auto-approve.mjs` matches `^round <n>: …` with no leading `- `, so `--check` reports "## Challenge holds rounds none". Those two lines need the `- ` dropped before approval can pass.
round 4: resolved 4

## Decisions

- **The stop-block emitters go with `readSubagentStop`.** `emitStopBlock` in `harnesses.mjs` and its `.d.mts` twin `emitBlockStop` have no caller but the reconcile gate, so T3 removes them beside `readSubagentStop`, which the spec names. This extends REQ-6 to the gate's other dead helpers. Rejected: keeping them, which leaves untested dead code in the delivered runtime.
- **`docs-citations.md` and `REVIEW.md`'s plan-citation paragraph change in part 2.** Both tell the review to check plan prose: the "Citation integrity" bullet names a plan, the "No section sign in a plan folder" bullet and `REVIEW.md` line 52 police plan citations. REQ-15 says the review raises no finding on plan prose, so T19 drops the plan from those lines. `pnpm prism:plan-citations` keeps enforcing the section-sign rule mechanically. This follows from the approved outcome, so it is recorded here rather than sent to `prism-architect`.
- **The whole "Reconcile against the Decision" subsection goes with the plan-drift section.** It is a subsection of "Plan drift is reconciled, not reported" and only governs plan-internal drift, which REQ-15 retires. Its first rule, a Decision contradicting an architect doc is a finding, survives through `REVIEW.md`'s Severity rule on architect-doc departures.
- **Part 2 names the leftover-posting path in `workflow.md`.** REQ-20 says the session posts decision items and leftover Critical or Major findings through `post.mjs`, and the session reads that from `workflow.md`'s Advancing paragraph, so T20 edits it. Part 1 says leftovers go to the PR body, matching the spec's Design for the gap between merges.
- **The label removal in `reconcile.mjs` ships in part 1, per the spec's Decision on it.** `reconcile-gate.test.ts`, which part 1 deletes, imports `reconcile.mjs`, so leaving the label task in part 2 formed a dependency cycle with part 1. With `prism-pr-review` retired in part 1, nothing writes a verdict line, so the label code is already dead there. T10 removes it and `review-runtime.md`'s labels text, T5 removes the schema's label text, and `REVIEW.md` and the `mainSessionMayMerge` description keep their label wording until part 2.
- **Both parts merge on the 2026-11-27 bar.** Between the part 1 and part 2 merges, `git-conventions.md` "Who merges" still names the PR-review pass and the `review:has-minors` label, which nothing produces any more. The main session applies Hunter's 2026-11-27 ruling to both merges: the plan's final review line reads `clean` and CI is green on the head. Part 2 (T20) rewrites the rule text to match.
- **`prism-forge-skill` joins the sweep, per the spec's Decision adding it to Affected systems.** Its ID-namespace bullet uses `prism-self-review` as an example, a live mention under requirement 13, so T8 changes it and T1's sweep test carries no allowlist entry for it.
- **T4 fixes `branch-plan.md`'s review sentence in part 1.** Line 236 says the review "covers the whole PR" and that intent-scope fixes plan drift in place, which part 2's rulebook retires. A file belongs to one task, and T4 already owns `branch-plan.md`, so T4 rewrites the sentence to the part 2 behavior. The two parts merge back to back, so the rule leads the rulebook by one merge rather than trailing it.
- **Part 1 ships from T13, not from the resume table.** After T13, part 1's verify, review, and PR stages run while T14–T23 are still open. The resume table would read "a task with no commit naming it" and send the session back to implement, so the session drives part 1's verify, review, and PR from this Decision, and part 2 resumes from T14 on its own branch. The retro waits for part 2: `prism-retro` runs once, after part 2's review, on the whole plan.
- **The session dispatches `prism-review` with a `model: opus` override.** The generated agent file stays pinned to `sonnet` until child 12 reworks model tiers, and the spec chose `sonnet` for that file. An override at dispatch time gives this child's reviews the stronger model without changing the generator. Rejected: editing the generator here, which is child 12's scope.
- **TS proofs run under `npx tsx --test`, not plain `node --test`.** Test files with extensionless imports or JSON imports, such as `review-reconcile.test.ts` and `plan-config-schema.test.ts`, fail to load under plain node. `tsx` is the runner `pnpm prism:test` and CI use, so builders and the verify stage use it. The per-task proof text keeps `node --test` as written, since the approved tasks do not change for a runner swap.
- **`one-review.test.ts` reads the hook runtime lists from `update.ts` source text.** `HOOK_RUNTIME_FILES` and `HOOK_RUNTIME_ENTRY_POINTS` are not exported, and `update.ts` cannot load under plain node, so T1 parses the array literals with `readArrayLiteral` instead of importing them. T3 therefore adds no exports. Rejected: exporting them, which widens `update.ts`'s public surface for a test.

## History

- 2026-11-27 [huntermcgrew/prism-553-one-review]: Plan stage wrote 23 tasks across the two-part stack (T1–T13 rename, retirement, and label removal; T14–T23 the rulebook) from the spec at 286db6ce.
- 2026-11-27 [huntermcgrew/prism-553-one-review]: T1 added `one-review.test.ts`, seven cases, all failing on the branch base.
- 2026-11-27 [huntermcgrew/prism-553-one-review]: T2 renamed `prism-self-review` to `prism-review` (Briar, gated, opus, PR input) and moved `prism-pr-review` and its two docs to `.ai-skills/deprecated/prism-pr-review/`.
- 2026-11-27 [huntermcgrew/prism-553-one-review]: T4 swept the always-on rules and their curated twins to name `prism-review` and Briar alone.
- 2026-11-27 [huntermcgrew/prism-553-one-review]: T5 dropped the PR-review stage from `workflow.md`, `shipping-flow.md`, and the config schema; a follow-up fix dropped the PR-review brief from the Limits paragraph.
- 2026-11-27 [huntermcgrew/prism-553-one-review]: T7 swept the ADR-criterion reference, the PR-description template, and the consumer AGENTS template.
- 2026-11-27 [huntermcgrew/prism-553-one-review]: T10 removed the review labels and verdict marker from `reconcile.mjs`, its types, tests, fixtures, and `review-runtime.md`.
- 2026-11-27 [huntermcgrew/prism-553-one-review]: T8 swept `prism-implement`, `prism-retro`, and `prism-forge-skill` to name `prism-review` and drop the separate PR-review stage.
- 2026-11-27 [huntermcgrew/prism-553-one-review]: T3 retired the reconcile stop gate, its tests, and its `SubagentStop` registrations, and gated `prism-review`; `mergeHookRegistration` now drops PRISM entries from event keys only the consumer holds. Its prune test drives the exported `refreshHookRuntime` rather than exporting the private prune.
- 2026-11-27 [huntermcgrew/prism-553-one-review]: T6 swept the architect context, its curated twins, and the routes to name only `prism-review`, and removed the reconcile gate text from `hook-runtime.md`; its proof waits on T11's seed refresh.
- 2026-11-27 [huntermcgrew/prism-553-one-review]: T9 moved the manifest-coverage fixture from eric to briar, dropped Eric's tone test and bootstrap row, and moved the spec-scope-lint fixtures to `prism-review`.

## Sessions

## Verification

## Review

## PR Readiness

Retro:
