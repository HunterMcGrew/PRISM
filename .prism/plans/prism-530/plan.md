---
title: Port review and verify, the rulebook, reconcile, and the fixed retro
ticket: https://github.com/HunterMcGrew/PRISM/issues/530
stage: plan
status: approved
approved_by: Hunter McGrew
approved_at: 2026-11-19
---

Child 6 of the Kitchen Line epic (#499). The design comes from the epic spec on `main`, at `.prism/plans/prism-499/spec.md`. These parts apply:

- the Children table row 6
- the Review, Verify, and Retro sections of its Design
- the `watch-ci.mjs`, `check-report.mjs`, and `reconcile.mjs` rows of the Scripts table
- the Decision that amends ADR-0068
- the Child 6 entry under "Carried in from the 2026-11-18 tips"

The thrive reference is TracTru/thrive at `db3570975431fa1d6114cc5f4170c126f6be7e97`.

**Goal:** both reviews run one rulebook, `REVIEW.md`, and print one coverage line per pass. A fresh-context verify stage records the checks, reconcile keeps PR threads and labels honest and logs what a human caught, and the retro runs as the fixed last stage. A folder plan with an empty `Retro:` line fails the check.

## Tasks

The build groups waves with `node scripts/ai-skills/hooks/plan/bundles.mjs .prism/plans/prism-530/plan.md --base <base>`, per the workflow rule's Build report part, so this plan lists no groups by hand. Tasks that edit a shared file (`roles.json`, `skill-routing.md`, `skills-ecosystem.md`, `plan-authoring.md`, `package.json`, `update.ts`, `build.ts`, or `AGENTS.md`) are chained by `depends on`. On `2aec908e` the first wave is T1, T3 with T4, T5, T8, and T16, and the script adds three import edges, which are written into `depends on` below: T6 on T7 and T11, and T10 on T11, because `update.ts` imports `ownership.ts` and `lib/onboarding-run.ts`.

T1 to T12 are the scripts, the rulebook, and their delivery. T13 to T25 are the skills, rules, ADR, docs, and cap wording that use them. That boundary is the proposed stack cut. The stack is described under Decisions.

Every task is Clove's except T24, which is Eli's. These conventions hold for every task.

**Precondition.** Children 2 (#516), 3 (#519), 4 (#520), and 5 (#522, PRs #531 and #532) are merged to `main`. Start the build with `git merge origin/main`. Every file and symbol below was checked present on `main` at `2aec908e` on 2026-11-18. Stop and report the build as blocked if a later `main` drops any of them:

- `scripts/ai-skills/hooks/plan/approve.mjs` and `scripts/ai-skills/hooks/approve-guard.mjs`
- `.prism/rules/workflow.md` and `.prism/references/shipping-flow.md`
- the `"agent"` member of `RoleDefinition.type` in `scripts/ai-skills/generate-skills.ts`
- `HOOK_RUNTIME_DIR` in `deriveTokenMap` in `scripts/ai-skills/lib/tokens.ts`
- `.ai-skills/skills/prism-architect/shared.md`, `.ai-skills/skills/prism-plan/shared.md`, `.ai-skills/skills/prism-intent/shared.md`, and `.ai-skills/skills/prism-spec/shared.md`

**What child 5 landed that this plan builds on.** Each item was checked against `main` at `2aec908e`. Line numbers in the tasks below are on that commit unless a task names another.

- **Script paths.** Skill and rule text spells them `${HOOK_RUNTIME_DIR}/<dir>/<name>.mjs`. Used by T13 to T18 and T21.
- **Runtime delivery.** `HOOK_RUNTIME_FILES` in `scripts/ai-skills/update.ts` lists every `plan/` module, `HOOK_RUNTIME_ENTRY_POINTS` is `hook.mjs`, `git-gates.mjs`, and `approve-guard.mjs`, and `plan-runtime-delivery.test.ts` asserts the delivered list. Used by T6.
- **Agent roles.** `roles.json` accepts `"type": "agent"`, which generates both agent files and no persona. `prism-spec` and `prism-challenge` are the existing agent roles. Used by T13.
- **The workflow rule.** `.prism/rules/workflow.md` is first in `AGENTS_MD_LEAD_RULES`. Used by T21.
  - Its Advancing part has a bare "Fix a red CI result" sentence and no `watch-ci.mjs` or `REVIEW.md` mention. It already lists the four pause triggers inline and already says to re-dispatch `prism-pr-review` after review fixes are pushed.
  - Its resume table has the verify row running the `verification-commands.md` checks, the review row running `prism-self-review`, the PR-review row dispatching `prism-pr-review`, a retro row where the session writes `Retro:` because `prism-retro` is read-only, and an epic row that resumes at retro until `spec.md` holds `## Retro`.
- **The routing rule.** `skill-routing.md` has a Utility skills line for `prism-review-loop` and a dispatched-stages line naming `prism-spec` and `prism-challenge`. The seed twin is curated and has both lines. Used by T13 and T20.
- **Approval.** `prism-implement` refuses a folder plan whose `status` is not `approved`. The approval Decision below covers this plan's own build.
- **The cap allowlist.** `OVER_CAP_ALLOWLIST` holds only `prism-review-loop`. Used by T20.
- **The PR stage.** `shipping-flow.md` has no `watch-ci.mjs` and no `REVIEW.md` citation, and its Close already dispatches `prism-pr-review` again after review fixes. `prism-self-review` line 47 records to `plan.md`'s `## Review`, commits as `plan: self-review record`, and does not push. Used by T14, T15, and T21.
- **Commits.** `git-conventions.md` has the folder-plan subjects (`T3:`, `plan:`, `retro:`) and one commit per bundle at lines 25 and 71. `branch-plan.md` has the folder form of a plan-only commit and the four-template sentence. Used by T17, T18, T22, and the commit convention below.
- **Names.** "Winston" means `prism-architect`, the plan stage is `prism-plan`, the intent stage is `prism-intent`, and `prism-user-stories` is gone. Used by T17, T19, T22, and T23.
- **ADR numbers.** ADR-0082 is taken, so this plan's ADR is 0083. Used by T22.

**Reading thrive.** `gh api "repos/TracTru/thrive/contents/<path>?ref=db3570975431fa1d6114cc5f4170c126f6be7e97" -q .content | base64 -d`. "Port" means copy the file and change only the swaps the task names, plus the JSDoc types `checkJs` asks for.

**Swaps that apply to every port.**

- `.ai-spec/` becomes `.prism/`.
- Skill ids:
  - `thrive-review` → `prism-self-review`
  - `thrive-pr-review` → `prism-pr-review`
  - `thrive-verify` → `prism-verify`
  - `thrive-retro` → `prism-retro`
  - `thrive-surface-audit` → `prism-audit`
  - `thrive-devils-advocate` → `prism-challenge`
  - `thrive-plan` → `prism-plan`
- Markers:
  - `<!-- thrive-agent -->` → `<!-- prism-agent -->`
  - `thrive-verdict` → `prism-verdict`
  - `thrive-pr:` → `prism-pr:`
  - The summary marker `<!-- code-review-pr-summary -->` keeps its spelling, per the spec.
- `scripts/plan/commit.sh` becomes `node ${HOOK_RUNTIME_DIR}/plan/commit.mjs` in skill and rule text.
- `origin/main` becomes `origin/${DEFAULT_BRANCH}` in skill and rule text. In script code, read `defaultBranch` through `readRepoConfig` and fall back to `main`.
- "`CLAUDE.md` Workflow" becomes the workflow rule, `.prism/rules/workflow.md`.
- Drop thrive ticket ids (`THR-`, `THRP-`, `THRN-`) and dealer, Storybook, Pest, Docker, Next.js, WordPress, and Tailwind content. A sentence that only makes sense with them is cut, not genericized.
- Test literals:
  - `TracTru/thrive` → `acme/app`
  - the agent login `hunter` → `agent-bot`
  - the human `priya` → `reviewer-1`
  - `qodo-merge-pro[bot]` stays
- Text outside a plan folder may keep thrive's section-sign citations. The plan-folder citation lint only reads plan folders.

**Runtime modules** follow child 4's rule:

- the three-line `@prism-hook-runtime` header from `scripts/ai-skills/hooks/lib/match.mjs`
- `node:` builtins and sibling runtime modules only
- a `.d.mts` sidecar
- `pnpm prism:check-types` passing
- CLI modules keep thrive's `realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)` entry guard, because nothing in `cli.ts` imports them

**Tests.** Each suite is a top-level `scripts/ai-skills/<name>.test.ts` using `node:test` and `node:assert/strict`, ported case for case.

- Fixture git repos set `GIT_CONFIG_NOSYSTEM=1` and point `GIT_CONFIG_GLOBAL` at an empty temp file.
- Spawned processes get an env with every host marker deleted: `CLAUDECODE`, `CLAUDE_CODE_SESSION_ID`, `CODEX_THREAD_ID`, `CODEX_SESSION_ID`, `CODEX_CI`, `PRISM_HOOK_DISABLE`, and `PRISM_HOOK_DENY_DISABLE`.
- A `gh` call is never made for real. Each module takes an injected `gh` runner, as thrive's do.

**Skill line budgets.** Every skill this child writes aims for the 120-line cap that `scripts/ai-skills/skill-loaded-lines.test.ts` enforces. The cap is soft, per Hunter's ruling in the Decisions. A skill may go over it with an `OVER_CAP_ALLOWLIST` entry that gives a one-line reason, and no text is cut only to fit the number.

- A skill's body budget is 120 minus the lines of every file it cites that `measureSkillLoad` charges. Today that is a file under `.prism/references/`, `.prism/templates/`, or `.prism/architect/`, a skill source, or a `load: skill` rule.
- Root `REVIEW.md` and `.prism/review/*.md` are not charged under today's rules. The Decision on the cap records Hunter's ruling that they stay uncounted.
- Cut content that fails the four skill tests. Never move it into an uncited file to dodge the count.
- Measure with `measureSkillLoad` from `scripts/ai-skills/lib/skill-loaded-lines.ts`, and record each rewritten skill's total in `## History`.

**Shared mechanics live in the workflow rule and the rulebook.**

- Stage order, caps, approval, the build report, and the resume table live in `.prism/rules/workflow.md`.
- Severity, finding shape, the coverage line, the exit rule, rounds and range, and the pause triggers live in `REVIEW.md`.
- A skill points at these. It never restates them.

**Generated output.** Every task that edits a skill, rule, reference, template, architect doc, ADR, pass file, or `roles.json` runs `pnpm prism:build` and commits what the build writes from its sources. The files list names the expected copies. Add any other copy the build writes from these sources to the same commit and name it in `## History`.

- A skill's copies are `.claude/skills/<id>/SKILL.md`, `.claude/skills/<id>/.ai-skill-generated`, `.cursor/skills/<id>/SKILL.md`, and `.cursor/skills/<id>/.ai-skill-generated`. A non-utility role adds `.claude/agents/<id>.md` and `.codex/agents/<id>.toml`.
- A rule's copies are `.claude/rules/<name>.md`, `.codex/rules/<name>.md`, `.cursor/rules/<name>.mdc`, and `AGENTS.md`.
- A reference, template, architect doc, or ADR has a copy at the same path under each of `.claude/`, `.codex/`, and `.cursor/`.
- After T7, a pass file does too.
- The seed twin is `templates/install/.prism/<path>`. The build writes it for a non-curated file. Edit it by hand when `seed-curation.json` lists the file as curated.

**Commits.** This is a folder-plan branch, so one bundle is one commit, per `git-conventions.md`. The subject is `T<n>: <summary>`, `T<a>-T<b>: <summary>`, or `T<a>,T<b>: <summary>`, made with `node scripts/ai-skills/hooks/plan/commit.mjs "<subject>" <paths>`. Plan edits commit as `plan: <summary>`. The stage skills commit and never push. The session's PR stage pushes, per ADR-0082.

**The `AGENTS.md` budget.** Only `workflow.md` and `skill-routing.md` among this plan's files are lead rules. T13, T20, and T21 edit them, and each one measures the lead-section end offset after its build and records it in `## History`. The Decisions say which cut pays for each addition.

### T1: Add the ci.requiredCheck config key

- files: .ai-skills/config.schema.json, scripts/ai-skills/config-ci-key.test.ts
- proof: pnpm exec tsx --test scripts/ai-skills/config-ci-key.test.ts
- proof fails on main: yes
- depends on: none

Owner: Clove. This adds one key to the consumer-facing config schema. The Decisions list it as flagged, and Hunter approved it on 2026-11-18.

- **Schema.** Add a top-level optional `ci` object with `additionalProperties: false` and one property, `requiredCheck`, a non-empty string.
  - Its description: "The name of the CI check the PR stage waits for, as `gh pr checks` prints it. When absent, the watcher waits until every check on the head has settled."
- **PRISM's config** stays unchanged. PRISM's `prism-check` workflow runs on two platforms, and waiting for every check is what PRISM wants.

The test follows `scripts/ai-skills/plan-config-schema.test.ts`. Configs go through `validateConsumerConfigAgainstSchema` from `scripts/ai-skills/lib/config-schema-validate.ts`, which enforces `type` but not `additionalProperties` or `minLength`, so those two are pinned on the schema document itself. It covers five cases:

- a config with `ci.requiredCheck: "build"` validates
- `ci.requiredCheck: 3` is rejected by the validator
- the schema's `ci` node has `additionalProperties: false`, read off the parsed schema
- the schema's `ci.requiredCheck` node has `minLength: 1`, read off the parsed schema
- PRISM's own config still validates

### T2: Port the CI watcher with a config-driven required check

- files: scripts/ai-skills/hooks/plan/watch-ci.mjs, scripts/ai-skills/hooks/plan/watch-ci.d.mts, scripts/ai-skills/plan-watch-ci.test.ts
- proof: pnpm exec tsx --test scripts/ai-skills/plan-watch-ci.test.ts
- proof fails on main: yes
- depends on: T1

Owner: Clove. Port thrive's `scripts/plan/watch-ci.mjs`. Keep these as they are:

- the CLI `<pr> [--required <check>] [--timeout-min <n>]`, the 60-minute default, and the 20-second poll
- following a new head through `gh pr view <pr> --json headRefOid`
- the failed buckets `fail` and `cancel`
- the exit codes: 0 pass, 1 fail, 8 timeout, 2 usage, and 3 when `gh` cannot read the PR on the first read
- the JSON result line on 0, 1, and 8

The swaps:

- `REQUIRED_CHECK` is deleted.
- The required check is `--required` when given, else `ci.requiredCheck` from `readRepoConfig` (child 2's `scripts/ai-skills/hooks/lib/command.mjs`), else none. An empty string counts as none, because the validator does not enforce the schema's `minLength`.
- With no required check, the head is settled when it has at least one check and none is `pending`. With one, keep thrive's rule: that check exists on the head and none is `pending`.
- `watchCi` takes `required: string | null`.

Port `scripts/plan/watch-ci.test.mjs` case for case. Add these cases:

- With no required check, a head with two checks, one `pending`, is still waiting, and settles to 0 once both pass.
- With no required check, a head with zero checks is still waiting.
- A fixture repo whose config sets `ci.requiredCheck: "build"` waits for `build` with no `--required` flag.

### T3: Port reconcile with PRISM's markers, labels, log, and template

- files: scripts/ai-skills/hooks/review/reconcile.mjs, scripts/ai-skills/hooks/review/reconcile.d.mts, scripts/ai-skills/review-reconcile.test.ts, scripts/ai-skills/review-reconcile.fixtures.json
- proof: pnpm exec tsx --test scripts/ai-skills/review-reconcile.test.ts
- proof fails on main: yes
- depends on: none

Owner: Clove. Port thrive's `scripts/review/reconcile.mjs`. Keep these as they are:

- the CLI `<pr> [--log <path>] [--no-write] [--classes] [--json]` and the exit codes (0 clean, 1 unclean, 2 usage)
- every export: `reconcile`, `isAgent`, `readsAsAgent`, `isBot`, `isAuthorNote`, `isHuman`, `needsReply`, `ownAddressed`, `planLabels`, `missingHeadings`, `readLog`, `openClasses`, `toJsonReport`, and `formatClasses`
- the GraphQL `reviewThreads` read and its `ccr/` fallback
- the addressed-sha `git log` read, the reply text, the thread resolve, and the label writes
- agent-versus-human classification: the marker plus a non-bot author, and for writes, also the `gh api user` login
- the unclean conditions, `OPEN_CLASS_THRESHOLD = 3`, class normalization, and the class sort and output lines

The swaps:

- **Markers.** `<!-- prism-agent -->` and `prism-verdict`. The verdict regex becomes `/<!--\s*prism-verdict:\s*state=(\S+)\s+effort=(\S+)\s+confidence=(\S+)\s*-->/`.
- **`REVIEW_LABELS`** is PRISM's closed set from `.prism/references/pr-review/github-writes.md`:
  - `effort:glance`, `effort:quick`, and `effort:deep`
  - `confidence:high`, `confidence:needs-judgment`, and `confidence:standards-only`
  - `review:has-minors`
  - `planLabels` maps `confidence=standards-only` to its label.
- **Log path.** `.prism/metrics/review-misses.jsonl` at `git rev-parse --show-toplevel`. Reading an absent log returns no rows. Nothing creates the file except an appended row.
- **Template.** `DEFAULT_TEMPLATE` is `.prism/templates/pr-description.md`, resolved from the repo toplevel rather than from the module's own directory. A consumer's runtime copy lives under `.claude/hooks/`, so a module-relative path would miss.
- **Text.** Messages naming `thrive-pr-review` name `prism-pr-review`.

**Fixtures.** Thrive keeps one directory per case under `scripts/review/fixtures/`. Port every case into one JSON file, `review-reconcile.fixtures.json`, keyed by case name and then by fixture file name (`pr.json`, `issue-comments.json`, `review-comments.json`, `reviews.json`, `threads.graphql.json`, `threads.ccr.json`, `review-misses.jsonl` as an array of row objects).

- The test's fake `gh` reads from that object. `_default` supplies any file a case omits.
- Swap the literals listed in the conventions, plus `TracTru/thrive` URLs to `https://github.com/acme/app/...`.

Port `scripts/review/reconcile.test.mjs` case for case, with the test-literal swaps.

- `TEMPLATE` reads PRISM's real `.prism/templates/pr-description.md`.
- The labels case that names `DX` and "QA Failed" keeps them as the non-review labels reconcile must leave alone.

Add these cases:

- `confidence:standards-only` is removed when the verdict says `confidence=high`.
- A comment carrying `<!-- thrive-agent -->` and no PRISM marker is human.
- `--classes` on a log whose file does not exist prints "No open class has 3 or more rows." and exits 0.

### T4: Adapt the verification report check to PRISM's section shape

- files: scripts/ai-skills/hooks/verify/check-report.mjs, scripts/ai-skills/hooks/verify/check-report.d.mts, scripts/ai-skills/verify-check-report.test.ts
- proof: pnpm exec tsx --test scripts/ai-skills/verify-check-report.test.ts
- proof fails on main: yes
- depends on: none

Owner: Clove. Port thrive's `scripts/verify/check-report.mjs`, keeping `checkReport`, `extractVerificationSection`, and `parseSection` and the exit codes (0 ok, 1 one problem per line, 2 usage or unreadable input).

The swaps:

- **No package column.** The spec drops thrive's workspace mapping.
  - A table row is `| <check> | <result> | <evidence> |`, where `<result>` is `pass`, `fail`, or `n/a: <reason>`.
  - A Failures line is `- <check>: <path>[:<line>]`, or `- none`.
  - The Failures regex becomes `/^-\s+(\S+):\s+(\S+?)(?::\d+)*\s*$/`.
- **Header lines.** The section opens with `verdict: done` or `verdict: blocked`, then `base: <sha>` and `head: <sha>`. A missing `head:` line is a problem.
- **Expected list is optional.** The CLI becomes `check-report.mjs <plan.md> [<expected.json>]`.
  - With no expected file it checks shape only: the verdict line, the head line, every `fail` row has a Failures line, every Failures line has a `fail` row, and every row's result is one of the three forms.
  - With one, it also runs thrive's missed and false-failure comparison.

Port `scripts/verify/check-report.test.mjs` case for case.

- Thrive's report fixtures (`exact`, `missed`, `false-failure`, `blocked`, `no-section`, `fail-without-line`, `line-without-row`, `unknown-verdict`, `bad-failures-line`) become template strings in the test, rewritten to PRISM's row and Failures shape with the checks `typecheck`, `lint`, `test`, `build`, and `format`.
- The expected list becomes an inline array.
- Thrive's `make-fixture.sh`, `plan.md.planted`, and `planted/` tree are not ported, per the spec.

Add these cases:

- An `n/a: no source changed` row passes.
- A row whose result is `skipped` fails.
- The CLI with one argument checks shape only and exits 0 on a clean section.

### T5: Add the retro-line check for folder plans

- files: scripts/ai-skills/plan-retro-line.ts, scripts/ai-skills/plan-retro-line.test.ts, package.json
- proof: pnpm exec tsx --test scripts/ai-skills/plan-retro-line.test.ts && pnpm run prism:retro-line
- proof fails on main: yes
- depends on: none

Owner: Clove. Thrive has no such check at the reference commit. Its resume table only routes on an empty `Retro:` line. This is new code against the spec's sentence: "A check fails a folder plan whose `Retro:` line is empty once its PR review verdict exists."

**What it reads.** Every `.prism/plans/<dir>/plan.md`. It never reads `.prism/archived/`, epic folders (`epic-*`), or flat plans.

- **The PR-review lines** are the lines in the `## Review` section, read with `sectionBody` from `scripts/ai-skills/hooks/plan/frontmatter.mjs`, that match `/^\s*-\s*pr-review (round \d+|confirm) at \S+:\s*(.*)$/`. T8 defines both forms in `REVIEW.md`, and T15 writes them.
- **A final PR-review verdict exists** when the last PR-review line is a `confirm` line, or is a `round` line whose verdict text, trimmed, is exactly `clean`. A non-clean round means fixes and another round are still coming, so the retro is not due yet.
- **The `Retro:` line** is the last line under `## PR Readiness` matching `/^>?\s*Retro:/`.
- **The plan fails** when a final verdict exists and the `Retro:` line is missing or holds only whitespace after the colon.

**Output.** One line per failing plan, `plan-retro-line: <path>: PR review recorded and Retro: is empty`. Exit 1 on any failure and 0 otherwise. Use `isDirectCliEntry("plan-retro-line")` from `scripts/ai-skills/lib/cli-entry.ts` for the entry guard.

**`package.json`.**

- Add `"prism:retro-line": "tsx scripts/ai-skills/plan-retro-line.ts"`.
- Append `&& pnpm run prism:retro-line` to `prism:check`, right after `prism:plan-citations`.

The test covers these cases, each over a temp repo:

- a folder plan with `- pr-review round 1 at abc1234: clean` and an empty `Retro:` fails
- the same plan with `Retro: .prism/retros/x.md` passes
- a folder plan with `- pr-review round 1 at abc1234: 0 critical, 2 major, 0 minor, 0 nit` as its last PR-review line and an empty `Retro:` passes, because another round is coming
- a folder plan whose last PR-review line is `- pr-review confirm at abc1234: 0 critical, 1 major, 0 minor, 0 nit` and whose `Retro:` is empty fails, because the confirm pass is final
- a folder plan with no `pr-review` line and an empty `Retro:` passes, because the retro has not come due
- a `- self-review round 1 at abc1234: clean` line alone does not count
- a flat plan with the same content is ignored
- a plan under `.prism/archived/plans/` is ignored
- running over PRISM's own tree exits 0, the positive control on today's plans

### T6: Deliver the review and verify scripts and the union-merge line

- files: scripts/ai-skills/update.ts, scripts/ai-skills/update.test.ts, scripts/ai-skills/plan-runtime-delivery.test.ts, scripts/ai-skills/review-misses-attributes.test.ts, .gitattributes
- proof: pnpm exec tsx --test scripts/ai-skills/update.test.ts scripts/ai-skills/plan-runtime-delivery.test.ts scripts/ai-skills/review-misses-attributes.test.ts && pnpm run prism:verify-pack
- proof fails on main: yes
- depends on: T2, T3, T4, T7, T11
- behavior change: a consumer update now delivers three more runtime modules and appends one line to the consumer's `.gitattributes`.

Owner: Clove. Edits to `update.ts`:

- **Runtime files.** `HOOK_RUNTIME_FILES` gains `"plan/watch-ci.mjs"`, `"review/reconcile.mjs"`, and `"verify/check-report.mjs"`. None is an entry point, so `HOOK_RUNTIME_ENTRY_POINTS` is unchanged.
- **The union-merge line.**
  - Add `const REVIEW_MISSES_GITATTRIBUTES_LINE = ".prism/metrics/review-misses.jsonl merge=union";` beside `HOOK_STATE_GITIGNORE_LINES`.
  - Add `appendReviewMissesAttribute(consumerRepoRoot)`, shaped like the existing `.gitignore` append. It creates `.gitattributes` when absent, appends the line with a preceding newline when the file does not end in one, and skips when an identical trimmed line is present. It never edits another line.
  - Call it from `runUpdate` beside the hook runtime refresh, on every host mix. The log exists for every consumer, not only those with hooks.
- **`verify-pack-parity.ts` stays unchanged.** Its `RUNTIME_READ_PATHS` already names `scripts/ai-skills/hooks` as a `prefix` entry, so the three new modules are covered.

**PRISM's own `.gitattributes`.** Append the comment `# The review-misses log is append-only, so union merge keeps both sides' rows.` and the line.

Tests:

- **`update.test.ts`.** Add the three paths to `HOOK_RUNTIME_RELATIVE_PATHS`.
- **`plan-runtime-delivery.test.ts`.** Add them to the delivered list, and assert `node .claude/hooks/review/reconcile.mjs --classes` exits 0 in a delivered fixture with no log.
- **New `review-misses-attributes.test.ts`.**
  - An absent `.gitattributes` is created holding the line.
  - One holding `* text=auto` and no trailing newline gains the line on its own line.
  - A second update leaves the file byte-identical.
  - A consumer's own `docs/** merge=union` line survives.

### T7: Make .prism/review a delivered content area with a consumer-owned stack folder

- files: scripts/ai-skills/build.ts, scripts/ai-skills/path-guard.ts, scripts/ai-skills/ownership.ts, scripts/ai-skills/crossref-lint.ts, scripts/ai-skills/crossref-lint.test.ts, .ai-skills/definitions/seed-curation.json, package.json, scripts/ai-skills/review-area.test.ts
- proof: pnpm exec tsx --test scripts/ai-skills/review-area.test.ts scripts/ai-skills/crossref-lint.test.ts && pnpm run prism:build && pnpm run prism:verify-pack
- proof fails on main: yes
- depends on: T5
- behavior change: a consumer update now copies `.prism/review/` from the seed and mirrors it into each host's platform directory, like `references`.

Owner: Clove. The spec puts one pass file per pass in `.prism/review/` and has onboarding add the consumer's stack checks. The pass files are PRISM-owned and refreshed on every update. Stack checks are the consumer's, so they get a folder update never writes: `.prism/review/stack/`.

- **`build.ts`.** Add `"review"` to `COPIED_CONTENT_AREAS`, after `"references"`.
- **`path-guard.ts`.** Add `"review"` to `PATH_GUARD_COPIED_AREAS`.
- **`ownership.ts`.**
  - Add `"review/**"` to `PRISM_OWNED_GLOBS`.
  - Add `"review/stack/**"` to `CONSUMER_OWNED_GLOBS`. Consumer claims are checked first, so a stack file classifies `consumer`.
- **`crossref-lint.ts`.**
  - Add `"review"` to both `areas` arrays (lines 123 and 128 on `2aec908e`).
  - In `isLazyOrHistoricalTarget` (line 292 on `2aec908e`), return `true` for exactly `.prism/metrics/review-misses.jsonl` and for any path starting with `.prism/review/stack/`. Both are created on first write and never exist in PRISM's tree: the log by its first row, and stack files by a consumer's onboarding. Without this, a scanned file that cites either one fails the lint. That covers T21's `shipping-flow.md` sentences, T9's pass-file last lines, T12's `review-runtime.md`, and T18's `retro-report.md`.
- **`crossref-lint.test.ts`.** Beside the existing `isLazyOrHistoricalTarget` cases (line 452 on `2aec908e`), add one test asserting `true` for `.prism/metrics/review-misses.jsonl` and `.prism/review/stack/correctness.md`, and `false` for `.prism/review/correctness.md` and `.prism/metrics/other.jsonl`. It fails before the `isLazyOrHistoricalTarget` edit, which is what the proof's added test file checks.
- **`seed-curation.json`.** Add `review/stack/**` to the excluded set, in the form its existing excluded entries use. PRISM's own stack checks never reach a consumer.
- **`package.json`.** Add `".prism/review/"` to `files`, after `".prism/references/"`.

Then run `git grep -n '"references"' scripts/ai-skills .ai-skills/definitions`. Add `review` beside every other content-area list the search finds, add that file to this commit, and list it in `## History`. `generate-skills.ts`'s skill-payload `references` entry is a different concept and stays.

The test covers these cases:

- `classifyPath("review/correctness.md")` is `prism`, and `classifyPath("review/stack/correctness.md")` is `consumer`.
- `COPIED_CONTENT_AREAS` includes `review`.
- A build over a temp tree holding `.prism/review/a.md` and `.prism/review/stack/b.md` writes `templates/install/.prism/review/a.md`, writes no seed copy of `b.md`, and writes `.claude/review/a.md`.

### T8: Write REVIEW.md

- files: REVIEW.md
- proof: pnpm run prism:crossref-lint && node -e "const t=require('fs').readFileSync('REVIEW.md','utf8');for(const h of ['## Severity','## Finding kinds','## Finding shape','## Coverage line','## Sweep, then filter','## Exit rule','## Rounds and range','### After a fix','## When a review pauses','## The passes','## Enumeration units','## The whole PR is in scope']){if(!t.includes(h)){console.error('missing '+h);process.exit(1)}}"
- proof fails on main: yes
- depends on: none

Owner: Clove. Port thrive's root `REVIEW.md` whole, per the spec's Review section and the Child 6 carried-in items. It is PRISM's rulebook and the consumer's, byte for byte, so it holds no token and no PRISM-only path.

- **Line 1** is the ownership marker T10 reads: `<!-- prism:review — prism update refreshes this file while this line is here. Delete the line to keep your own version. -->`
- **Keep thrive's headings and order:**
  - `## Severity`, `## Finding kinds`, `## Finding shape`, and `## Read widely, report narrowly`
  - `## The whole PR is in scope`, `## Coverage line`, `## Sweep, then filter`, and `## Exit rule`, with the verdict cap
  - `## Rounds and range` with `### After a fix`, `## When a review pauses`, `## The passes`, and `## Enumeration units`
- **Drop `## UI diffs`.** It rests on thrive's screenshot script, which the intent leaves out.

The swaps:

- **Severity.**
  - Drop the THRP-965 citation, and keep its rule. A departure from a manifest-matched architect doc is Major, never a nit.
  - "Formatting is never a finding" cites the git pre-commit hook and the verify stage's `format` check.
- **The bookkeeping exemption.** Add one sentence under the exit rule. A Minor whose every cited line falls in bookkeeping content gates nothing, per `.prism/rules/followup-scope.md`. The spec keeps PRISM's exemption.
- **Range rule.** The `<owner>/<repo>` path segments come from `github.owner` and `github.repo` in `.ai-skills/config.json`. Keep "whoever left it".
- **The record line** under `### After a fix` or Rounds and range becomes concrete, because T5's check and the workflow rule's resume table read it. Each review stage writes one line per round under `## Review` in `plan.md`:
  - `- self-review round <n> at <short sha>: <verdict>`
  - `- pr-review round <n> at <short sha>: <verdict>`
  - `- pr-review confirm at <short sha>: <verdict>`, for the one confirm pass past the 3-round cap

  `<verdict>` is `clean`, or the open counts as `<c> critical, <m> major, <n> minor, <k> nit`. A legacy flat plan records under `## Review Issues` instead.
- **When a round is `clean`.** Two sentences beside the record line. A round's verdict is `clean` exactly when the exit rule holds at the end of that round, with PRISM's bookkeeping exemption. So decision items, nits fixed or declined with a reason, and Minors whose every cited line is bookkeeping content per `.prism/rules/followup-scope.md` leave it `clean`. Any other open Critical, Major, or Minor, a nit neither fixed nor declined, or a pass reading `not reached` or a bare `swept` makes the verdict the open counts, which count only those blocking items. T5's check and both final-line resume rows read this word, so a round is never recorded `clean` while the exit rule fails, and never recorded with counts once it holds.
- **The final PR-review verdict.** One sentence: the PR review is final when its last line is `clean` or is the confirm line. Until then fixes and another round are coming, so the retro is not due.
- **The final self-review line.** One sentence: the self-review is final when its last `self-review` line is `clean` or is round 3. Until then the author fixes and self-review runs again, so the PR stage is not due.
- **Pause triggers.** These four, citing `.prism/rules/worktree-git.md` for destructive git:
  - a file outside the plan
  - a new dependency
  - a change to a shared type or public API
  - destructive git
- **Subagent limits** cite the workflow rule, `.prism/rules/workflow.md`.
- **The passes.** One line per pass naming its file under `.prism/review/` and its trigger. Pass 9's trigger is the spec's generic one: a migration, an ADR, or a stored or exported shape. Pass 10 gets its own file, `performance.md`.
- **Stack checks.** One sentence: each pass also runs the checks in `.prism/review/stack/<pass>.md` when that file exists. Onboarding writes them, and `prism update` never touches them.
- **Spec-surface trigger** for the docs pass:
  - paths under `.prism/` other than `.prism/plans/`
  - `.ai-skills/`
  - `REVIEW.md`, `AGENTS.md`, and `CLAUDE.md`
  - `docs/`
- **The no-steer brief rule** stays as thrive wrote it.

### T9: Write the ten pass files

- files: .prism/review/correctness.md, .prism/review/regressions.md, .prism/review/security.md, .prism/review/architecture.md, .prism/review/intent-scope.md, .prism/review/simpler-paths.md, .prism/review/accessibility.md, .prism/review/docs-citations.md, .prism/review/contracts.md, .prism/review/performance.md, templates/install/.prism/review/correctness.md, templates/install/.prism/review/regressions.md, templates/install/.prism/review/security.md, templates/install/.prism/review/architecture.md, templates/install/.prism/review/intent-scope.md, templates/install/.prism/review/simpler-paths.md, templates/install/.prism/review/accessibility.md, templates/install/.prism/review/docs-citations.md, templates/install/.prism/review/contracts.md, templates/install/.prism/review/performance.md, .claude/review/correctness.md, .claude/review/regressions.md, .claude/review/security.md, .claude/review/architecture.md, .claude/review/intent-scope.md, .claude/review/simpler-paths.md, .claude/review/accessibility.md, .claude/review/docs-citations.md, .claude/review/contracts.md, .claude/review/performance.md, .codex/review/correctness.md, .codex/review/regressions.md, .codex/review/security.md, .codex/review/architecture.md, .codex/review/intent-scope.md, .codex/review/simpler-paths.md, .codex/review/accessibility.md, .codex/review/docs-citations.md, .codex/review/contracts.md, .codex/review/performance.md, .cursor/review/correctness.md, .cursor/review/regressions.md, .cursor/review/security.md, .cursor/review/architecture.md, .cursor/review/intent-scope.md, .cursor/review/simpler-paths.md, .cursor/review/accessibility.md, .cursor/review/docs-citations.md, .cursor/review/contracts.md, .cursor/review/performance.md
- proof: pnpm run prism:build && pnpm run prism:crossref-lint && pnpm run prism:check
- proof fails on main: yes
- depends on: T7, T8

Owner: Clove. Port each thrive `.ai-spec/review/<name>.md` with the global swaps. Each keeps its opening sentence pointing at `REVIEW.md` for its enumeration unit, severity, finding shape, and coverage line.

- **Generic files port nearly whole.** `correctness.md`, `intent-scope.md`, `simpler-paths.md`, and `accessibility.md`. Drop "dealer and shopper" from accessibility.
- **`regressions.md`.**
  - Drop the Storybook stories rule and the THR citations.
  - "`thrive-verify`" becomes the verify stage.
  - `origin/main` becomes the configured default branch.
- **`security.md`.** Keep the generic checks: trust boundaries, injected input, secrets, auth, and the intent's security surface. Drop dealer tenant isolation, `wp_remote_get`, and the PHP and thrive-architect citations. They are stack checks a consumer's onboarding writes.
- **`architecture.md`.** Keep only what applies to any stack:
  - follow the manifest-matched architect docs
  - no new pattern where one exists
  - no premature abstraction
  - removal and rename completeness per `.prism/rules/code-standards.md`

  Drop the WordPress, Next.js, React Server Components, `@thrive/ui`, Studio, Tailwind, and `globals.css` checks.
- **`docs-citations.md`.**
  - Keep the cited-line, sha, path, and quoted-rule checks.
  - Swap `scripts/check-deleted-names.sh` for a `git grep` of the removed name, per the code-standards removal rule.
  - Swap `docs/content/user|dev/` for `docs/`.
  - Add a check that a plan folder file holds no section sign, citing the plan-folder citation lint.
- **`contracts.md`.** Keep `## Establish the horizon first`, `## The questions`, and `## Reporting`, with generic contracts: a migration, an ADR, a stored record shape, an exported type or API, a config key, and a file other tools read. Drop the `block.json`, WPGraphQL, postmeta, Typesense, `packages/`, and dealer examples. Drop the sentence saying the plan stage runs this pass over its own proposal, because foundation mode is not ported.
- **`performance.md`** is new, from thrive's inline pass 10 checklist made generic:
  - work repeated inside a loop
  - an unbounded query or fetch
  - a hot path that gained I/O
  - a cache bypassed or invalidated
  - a large asset added to a shipped bundle

  Its trigger is a change to a render path, data fetching, a query, a loop over external data, or a shipped bundle.
- **`intent-scope.md` absorbs AC grading.**
  - Keep thrive's "Grade every acceptance criterion" checklist and its `## Plan drift is reconciled, not reported` part, with one narrowing. The review fixes drift in place only in `plan.md` sections other than `## Tasks`. A task whose stated approach the code did not take, including a task a later Decision contradicts, is reported as a Minor finding and left as written. A difference from `intent.md` is a finding, and the review never edits `intent.md`. Rewrite thrive's two examples that edit a task to say this.
  - Fold in the verdict semantics from `.prism/references/qa-plan/verdict-contract.md`: met, unmet, or ungradeable, the evidence each needs, and that only a person grades a `human` Evidence line as met. T17 deletes that reference, so read it here first.
  - Grades are recorded with the review's record line under `## Review`, or under `## Review Issues` on a flat plan.
  - Name where the criteria come from. On a plan folder it is `intent.md` when the folder has one, and otherwise `plan.md`'s `## Acceptance Criteria`, which is where an epic child folder keeps them. On a flat plan it is the plan's `## Acceptance Criteria`. The review never edits criteria in either file, so a difference is a finding.

Each pass file ends with one line: "Stack checks for this pass, when the repo has them: `.prism/review/stack/<name>.md`."

### T10: Deliver REVIEW.md to consumers without touching one they own

- files: scripts/ai-skills/build.ts, templates/install/REVIEW.md, scripts/ai-skills/update.ts, scripts/ai-skills/doctor.ts, scripts/ai-skills/eject.ts, scripts/ai-skills/review-md-delivery.test.ts, scripts/ai-skills/doctor.test.ts, scripts/ai-skills/eject.test.ts
- proof: pnpm exec tsx --test scripts/ai-skills/review-md-delivery.test.ts scripts/ai-skills/doctor.test.ts scripts/ai-skills/eject.test.ts && pnpm run prism:build && pnpm run prism:verify-pack
- proof fails on main: yes
- depends on: T6, T7, T8, T11
- behavior change: `prism adopt` and `prism update` now write a root `REVIEW.md` in the consumer repo when none exists or when the existing one carries PRISM's marker line. Doctor and eject learn the file.

Owner: Clove. A root file outside `.prism/` has no sync-manifest hash, so ownership is the marker line, the same content-keyed rule the hook runtime uses.

- **`build.ts`.** After the seed mirror, copy root `REVIEW.md` byte for byte to `templates/install/REVIEW.md`. `checkSeedDrift`, or the `--check` path beside it, fails when the two differ, naming both paths. `templates/install/` is already in `package.json` `files`.
- **`update.ts`.** Add `syncReviewMd(consumerRepoRoot, prismSourceRoot)`, called from `runUpdate`:
  - When the consumer has no `REVIEW.md`, write the seed copy.
  - When its first line starts with the T8 marker's opening, the HTML comment opener followed by ` prism:review`, write the seed copy if the bytes differ, keeping the old one as `REVIEW.md.bak` first, the posture `applyIncomingFile` takes. Define that prefix once as a constant in `update.ts`, and have `doctor.ts` and `eject.ts` import it.
  - Otherwise leave it and return a warning: "REVIEW.md exists without PRISM's marker line, so it was left alone. The review stages read it as the rulebook."
- **`doctor.ts`.** A check reports the same three states: absent (warn, prescribe `prism update`), marked and current (ok), and unmarked (warn with the update text). It runs behind the adopted-consumer gate at the `runDoctor` call site, per `install-layout.md`.
- **`eject.ts`.** Eject removes a root `REVIEW.md` whose first line is the marker and leaves an unmarked one, the same shape as the `AGENTS_MD_SEEDED_MARKER` path.

The tests:

- **`review-md-delivery.test.ts`** has five cases:
  - an absent file is written
  - a marked stale file is replaced and its `.bak` holds the old bytes
  - an unmarked file is byte-identical afterward and a warning is returned
  - a second update is a no-op
  - the seed copy equals the root `REVIEW.md`
- **`doctor.test.ts`** gets the three states.
- **`eject.test.ts`** gets marked-removed and unmarked-kept.

### T11: Generate stack checks for the review passes at onboarding

- files: scripts/ai-skills/lib/rule-generators/review-stack.ts, scripts/ai-skills/lib/onboarding-run.ts, scripts/ai-skills/review-stack-generator.test.ts, .ai-skills/skills/prism-onboard/shared.md, .claude/skills/prism-onboard/SKILL.md, .cursor/skills/prism-onboard/SKILL.md, .claude/agents/prism-onboard.md, .codex/agents/prism-onboard.toml
- proof: pnpm exec tsx --test scripts/ai-skills/review-stack-generator.test.ts scripts/ai-skills/atlas-dogfood.test.ts && pnpm run prism:build && pnpm exec tsx --test scripts/ai-skills/skill-loaded-lines.test.ts
- proof fails on main: yes
- depends on: T7, T9
- behavior change: onboarding writes `.prism/review/stack/` files beside the per-team rules it already generates.

Owner: Clove. The spec says onboarding adds the consumer's stack checks the way it generates per-team rules. Those rules already encode the stack's conventions, so the stack checks point the passes at them rather than restating them.

- **New generator `review-stack.ts`.** Read two generators in `scripts/ai-skills/lib/rule-generators/` first and match their input, return type, and skip-if-exists posture exactly, including the "exists — preserve team hand-edits; pass --force to regenerate" reason.
- **What it writes,** for the detected stack:
  - **`.prism/review/stack/architecture.md`.** One bullet per per-team rule file the run generated or found (the language code standards and framework guidelines). Each bullet says to check the diff against that rule and that a departure is a standards violation.
  - **`.prism/review/stack/security.md`.** One bullet: check the diff against `.prism/rules/security.md`. It is written only when that file exists.
  - **`.prism/review/stack/correctness.md`.** One bullet per detected language naming its type checker or test command from `commands.*`, when set, as the evidence a correctness finding cites.
- **Each file** opens with a `# Stack checks: <pass>` title and one sentence saying onboarding wrote it and the team owns it.
- **`onboarding-run.ts`.** Append the generator to `RULE_GENERATORS` after the existing ones, so it reads their output.
- **`prism-onboard/shared.md`.**
  - The Rules step gains one clause naming the stack-check files.
  - The closing summary lists them like any generated file.
  - The skill stays at 120 or less.

The test covers these cases:

- a TypeScript-detected temp repo with a generated `code-standards-typescript.md` gets an architecture file naming it
- a repo with no `security.md` gets no security file
- a second run with an existing file returns `written: false` with the skip reason and leaves the bytes alone

### T12: Document the review runtime and route the rulebook

- files: .prism/architect/_toolkit/review-runtime.md, .prism/architect/_toolkit/plan-chain-scripts.md, .prism/architect/_toolkit/hook-runtime.md, .prism/architect/manifest.json, .prism/architect/_toolkit/manifest.base.json, templates/install/.prism/architect/_toolkit/review-runtime.md, templates/install/.prism/architect/_toolkit/plan-chain-scripts.md, templates/install/.prism/architect/_toolkit/hook-runtime.md, templates/install/.prism/architect/_toolkit/manifest.base.json, .claude/architect/_toolkit/review-runtime.md, .codex/architect/_toolkit/review-runtime.md, .cursor/architect/_toolkit/review-runtime.md, .claude/architect/_toolkit/plan-chain-scripts.md, .codex/architect/_toolkit/plan-chain-scripts.md, .cursor/architect/_toolkit/plan-chain-scripts.md, .claude/architect/_toolkit/hook-runtime.md, .codex/architect/_toolkit/hook-runtime.md, .cursor/architect/_toolkit/hook-runtime.md, .claude/architect/manifest.json, .codex/architect/manifest.json, .cursor/architect/manifest.json, .claude/architect/_toolkit/manifest.base.json, .codex/architect/_toolkit/manifest.base.json, .cursor/architect/_toolkit/manifest.base.json
- proof: pnpm run prism:build && pnpm run prism:check
- depends on: T2, T3, T4, T5, T6, T7, T10, T11

Owner: Clove. Write every claim against T1 to T11's merged source, per the writing-an-architect-doc guide. The doc ships to consumers, so it names no origin project and no PRISM ticket.

**New `_toolkit/review-runtime.md`.** Its scope is the review rulebook's delivery and the scripts the review and verify stages call. Its neighbours are `hook-runtime.md` for delivery mechanics and `plan-chain-scripts.md` for the plan modules. It covers:

- **The rulebook.**
  - `REVIEW.md` at the root, its marker line, and how update, doctor, and eject treat a marked and an unmarked file.
  - The pass files under `.prism/review/`, PRISM-owned and refreshed.
  - `.prism/review/stack/`, consumer-owned and written by onboarding.
  - Why stack checks point at the per-team rules rather than restating them.
- **`reconcile.mjs`.**
  - Its CLI and exit codes.
  - How it tells an agent comment from a human one, and why the login check gates writes.
  - The label set it corrects and the verdict line it reads.
  - The template headings it requires.
  - The misses log, its row shape, the class threshold, and the union-merge line.
- **`check-report.mjs`.** The Verification section shape and its shape-only mode.
- **The retro-line check.** What counts as a recorded PR review, why only folder plans, and that it is PRISM's own lint, not delivered.
- **Invocation.** `node .claude/hooks/<dir>/<name>.mjs` in a consumer, and `node scripts/ai-skills/hooks/<dir>/<name>.mjs` in PRISM's tree.

**Routes.** In both `manifest.json` and `_toolkit/manifest.base.json`, and in the seed twin of `manifest.base.json`, add:

- `"REVIEW.md": "_toolkit/review-runtime.md"`
- `".prism/review/**": "_toolkit/review-runtime.md"`
- `"scripts/ai-skills/hooks/review/**": "_toolkit/review-runtime.md"`
- `"scripts/ai-skills/hooks/verify/**": "_toolkit/review-runtime.md"`
- `"scripts/ai-skills/plan-retro-line.ts": "_toolkit/review-runtime.md"`

The existing `scripts/ai-skills/hooks/**` route keeps naming `hook-runtime.md`.

**`plan-chain-scripts.md`.** Add one Contracts line for `watch-ci.mjs`: the required check from `ci.requiredCheck`, the wait-for-every-check default, and the exit codes.

**`hook-runtime.md`.** Edit the Delivery path paragraph only. It now names the `review/` and `verify/` modules, with a link to `review-runtime.md`, and the `.gitattributes` line beside the `.gitignore` lines. The doc is curated, so make the same edit by hand in its seed twin.

### T13: Add prism-verify as a dispatched agent

- files: .ai-skills/skills/prism-verify/frontmatter.yml, .ai-skills/skills/prism-verify/shared.md, .ai-skills/skills/prism-verify/claude.md, .ai-skills/skills/prism-verify/codex.md, .ai-skills/skills/prism-verify/cursor.md, .ai-skills/definitions/roles.json, .prism/rules/skill-routing.md, templates/install/.prism/rules/skill-routing.md, .claude/skills/prism-verify/SKILL.md, .claude/skills/prism-verify/.ai-skill-generated, .cursor/skills/prism-verify/SKILL.md, .cursor/skills/prism-verify/.ai-skill-generated, .claude/agents/prism-verify.md, .codex/agents/prism-verify.toml, .claude/rules/skill-routing.md, .codex/rules/skill-routing.md, .cursor/rules/skill-routing.mdc, AGENTS.md
- proof: pnpm run prism:build && pnpm exec tsx --test scripts/ai-skills/routing-coverage.test.ts scripts/ai-skills/skill-loaded-lines.test.ts scripts/ai-skills/claude-agent-def.test.ts scripts/ai-skills/agents-md-budget.test.ts && pnpm exec tsx -e "import('./scripts/ai-skills/agents-md-block.ts').then(m=>{const e=m.measureLeadSectionEnds(require('fs').readFileSync('AGENTS.md','utf8'));const b=Math.max(...e.map(x=>x.endByte??Infinity));console.log(b);if(b>31744)process.exit(1)})"
- proof fails on main: yes
- depends on: T4, T12, T20

Owner: Clove. `roles.json`: add `{ "id": "prism-verify", "type": "agent", "routing": "named-only" }`. It runs after T20 so the `prism-review-loop` line T20 deletes from `skill-routing.md` pays for the words this task adds there.

Port thrive's `thrive-verify`, trimmed to 120 with no counted citation. The body covers:

- **When it runs.** Once per head, as a fresh subagent, after the build. It fixes nothing and grades no acceptance criterion.
- **The checks.** One per `commands.*` key in `.ai-skills/config.json` with a non-empty value.
  - The closed set is `typecheck`, `lint`, `test`, `build`, and `format`.
  - Any other key with a non-empty value is a consumer-added check, run the same way.
  - A key that is empty or absent gets an `n/a: not configured` row.
- **The spec-surface check.** When a changed path is on the spec surface `REVIEW.md` names for the docs pass, add a `spec` row:
  - `pnpm prism:check` when `scripts/ai-skills/` exists at the repo root, which is toolkit context
  - `npx @huntermcgrew/prism doctor` otherwise
- **Writing the section.** `## Verification` in `plan.md`:
  - `verdict: done` or `verdict: blocked`, with one `blocked: <reason>` line each
  - `base: <sha>` and `head: <sha>`
  - the table `| check | result | evidence |`, with every check considered getting a row
  - `### Failures` with `- <check>: <path>[:<line>]` lines or `- none`
  - It then runs `node ${HOOK_RUNTIME_DIR}/verify/check-report.mjs <plan.md>` and fixes its own section until that exits 0.
- **Re-running after a later commit.**
  - Diff from the recorded `head:` to HEAD.
  - Rerun only the checks the new commits reach and rewrite those rows. Plan-only commits reach none, any other source change reaches every configured check, and a spec-surface change reaches `spec`.
  - Untouched rows keep their results. Update `head:` and keep `base:`.
- **Commit.** `node ${HOOK_RUNTIME_DIR}/plan/commit.mjs "plan: record verification" <plan.md>`.
- **Report** for the session: the verdict, the failing checks, and the SHA.

Drop thrive's Touched packages, linked-worktree, and Visual parts. The spec does not port workspace mapping, and PRISM has no screenshot script.

**`skill-routing.md` and its curated twin.** `routing-coverage.test.ts` needs every `named-only` id named in the Utility skills section of both. In each, the dispatched-stages bullet changes from "`prism-spec` writes `spec.md` for an approved intent and is never routed off a phrase, and `prism-challenge` also runs the plan stage's challenge rounds." to "`prism-spec` writes `spec.md` for an approved intent, and `prism-verify` records the checks under `## Verification`. Neither is routed off a phrase, and `prism-challenge` also runs the plan stage's challenge rounds." After the build, measure the `AGENTS.md` lead-section end offset with `measureLeadSectionEnds` from `scripts/ai-skills/agents-md-block.ts` and record it in `## History`. It must be at most 31,744, and the proof's last command prints it and fails past that line.

### T14: Rewrite prism-self-review to run REVIEW.md

- files: .ai-skills/skills/prism-self-review/frontmatter.yml, .ai-skills/skills/prism-self-review/shared.md, .claude/skills/prism-self-review/SKILL.md, .cursor/skills/prism-self-review/SKILL.md, .claude/agents/prism-self-review.md, .codex/agents/prism-self-review.toml
- proof: pnpm run prism:build && pnpm exec tsx --test scripts/ai-skills/skill-loaded-lines.test.ts scripts/ai-skills/routing-coverage.test.ts && grep -q -i "coverage line" .ai-skills/skills/prism-self-review/shared.md
- proof fails on main: yes
- depends on: T8, T9
- behavior change: self-review now runs the ten `REVIEW.md` passes by trigger through subagents and grades the acceptance criteria. The checks it ran inline before are now passes.

Owner: Clove. Port thrive's `thrive-review` with the global swaps, minus its Voice section, which child 7 adds.

- **Frontmatter.**
  - The description is thrive's with "Briar" kept: local review against `REVIEW.md`, reported in chat, one record line to the plan, never posts to GitHub.
  - The triggers gain "verify the AC" and "grade the acceptance criteria", which move here from `prism-qa-plan` (T17).
  - Keep `model` and `effort` as they are.
- **The run, in order.** Keep these parts:
  - pin the range from `git merge-base origin/${DEFAULT_BRANCH} HEAD` to `HEAD`
  - read the criteria first, from the source `.prism/review/intent-scope.md` names: `intent.md` on a folder that has one, else `plan.md`'s `## Acceptance Criteria`. Line 10's "(in `intent.md` on a plan folder)" says the same.
  - inventory the changed files
  - pick the passes whose triggers fire
  - dispatch one subagent per pass or pass group with a no-steer brief per `REVIEW.md`, at most the workflow rule's subagent cap
  - collect findings, then sweep and filter
- **Write the plan before the chat.**
  - On a folder plan, line 47's bullet keeps its `## Review` target, its `plan: self-review record` subject, and its "do not push", and its content becomes the `REVIEW.md` record line, `- self-review round <n> at <short sha>: <verdict>`, with each open finding under it in the finding shape `REVIEW.md` sets.
  - On a flat plan, findings go under `## Review Issues` as today.
  - Keep line 50's folder-plan clause: the criteria live in `intent.md`, which this skill never edits, so a difference from one is a finding under `## Review`. Extend it to a folder with no `intent.md`: the criteria are `plan.md`'s `## Acceptance Criteria`, and a difference is still a finding under `## Review`, with no adjustment and no sync.
- **Report.** The coverage line from `REVIEW.md`, one token per pass, then findings by severity.
- **Rounds.** Self-review fixes nothing in source, as line 1 says today. The author fixes each round's findings, which on a folder plan is the implement stage dispatched by the session, and self-review runs again on the new head, up to the 3-round cap per `REVIEW.md`. Its only writes are the record line and the in-place plan-drift fixes `.prism/review/intent-scope.md` allows outside `## Tasks`.
- **Guardrails.** Keep "never posts to GitHub" and the four pause triggers by reference to `REVIEW.md`.

Thrive's `.ai-spec/references/review/run.md` is not ported as a reference, because the cap would charge it. Its range pin and inventory steps are one bullet each in the body. Its `scripts/pre-review.sh`, `pnpm skills:check`, and frontend build steps are thrive's stack and are dropped.

Delete every mention of `prism-review-loop`, which is lines 13 and 27 on `2aec908e`.

### T15: Rewrite prism-pr-review with reconcile, the agent marker, and the misses log

- files: .ai-skills/skills/prism-pr-review/frontmatter.yml, .ai-skills/skills/prism-pr-review/shared.md, .prism/references/pr-review/github-writes.md, templates/install/.prism/references/pr-review/github-writes.md, .claude/references/pr-review/github-writes.md, .codex/references/pr-review/github-writes.md, .cursor/references/pr-review/github-writes.md, .claude/skills/prism-pr-review/SKILL.md, .cursor/skills/prism-pr-review/SKILL.md, .claude/agents/prism-pr-review.md, .codex/agents/prism-pr-review.toml
- proof: pnpm run prism:build && pnpm exec tsx --test scripts/ai-skills/skill-loaded-lines.test.ts scripts/ai-skills/routing-coverage.test.ts && pnpm run prism:crossref-lint && grep -q "### Pass coverage" .prism/references/pr-review/github-writes.md
- proof fails on main: yes
- depends on: T3, T8, T9
- behavior change: Eric now runs the `REVIEW.md` passes, marks every comment, writes a verdict line into the summary, runs reconcile, logs human catches, and records one line in the plan.

Owner: Clove. Port thrive's `thrive-pr-review` with the global swaps, minus Voice (child 7), Foundation mode, and Screenshots. Keep the persona, Eric, and his in-branch and worktree modes from `eric-review-modes.md`. The modes decide where Eric reads and runs checks. They no longer decide where the plan record goes, which the Record bullet below sets.

**Body** (`shared.md`):

- **The run, in order.** Thrive's eleven steps, trimmed:
  - resolve the PR
  - pin the range per the `REVIEW.md` range rule
  - run the passes by trigger through subagents
  - post inline comments and one summary
  - apply labels
  - run reconcile
  - log human catches
  - record in the plan
  - report
- **Threads.** Triage unresolved threads, then run `node ${HOOK_RUNTIME_DIR}/review/reconcile.mjs <pr> --json`. On exit 1:
  - reply to each thread that needs a reply
  - log each unlogged human comment as a miss row
  - add any missing PR-body heading
  - rerun until clean or three times
- **Misses log.** Append one JSON line per human comment the agent review missed to `.prism/metrics/review-misses.jsonl`, with the keys `pr`, `reviewer`, `file`, `summary`, `class`, `nearest_pass`, `comment`, and `logged_at`.
  - `class` names the pattern, not the instance.
  - Append in the session's own checkout, the one the record goes to, never in a `/tmp` worktree. In worktree mode, run reconcile with `--log <session checkout>/.prism/metrics/review-misses.jsonl`, so it reads the rows already logged.
  - Leave the rows uncommitted. A `plan:` commit stages only the plan folder, so the log can't ride the record. On a folder plan the retro's `retro:` commit carries it (T18), and once `Retro:` is filled the session commits it alone as `retro: log review misses` (T21). On a flat plan, or with no plan, the report names the log as uncommitted, and the author's next commit carries it.
- **Record.**
  - **Folder plan.** When the session's own checkout is on the PR's branch and holds the plan folder, write `- pr-review round <n> at <short sha>: <verdict>` under `## Review` in that checkout's `plan.md`, or `- pr-review confirm at <short sha>: <verdict>` for the confirm pass past the cap, per `REVIEW.md`. Mark a confirmed fix `fixed <sha>`. This holds in both modes: a worktree-mode run still writes the record in the session's checkout, never in its `/tmp` worktree.
  - Commit with `node ${HOOK_RUNTIME_DIR}/plan/commit.mjs "plan: pr-review record" <plan.md>` and do not push. The session pushes, per ADR-0082 and the routing rule's reviewer exception.
  - **Flat plan.** Keep today's worktree-mode behavior: update `## Review Issues` and `## PR Readiness`, then land the plan-only commit and push it, per `branch-plan.md`. In-branch mode records nothing, as today.
  - With no plan, or when the checkout is on another branch, the PR comments are the whole record.

Lines 11 and 12 on `2aec908e` are the mode bullets this replaces. Line 11's "Push with `git push origin HEAD:refs/heads/<branch>`" and line 12's "Worktree mode updates `## Review Issues` and `## PR Readiness`, then commits and pushes the plan file alone" now apply to a flat plan only.
- **Report.** The coverage line, then the verdict. The last line is exactly `prism-pr: <n>`, which child 8's reconcile gate reads.
- **Guardrails.** Keep never approve and never flip to ready.

Delete the AC-verification report checker at line 28 on `2aec908e`. The intent-scope pass now grades. Delete the `prism-review-loop` mentions at lines 33 and 41.

**`github-writes.md`.**

- The summary comment's first three lines become the summary marker, `<!-- prism-agent -->`, and `<!-- prism-verdict: state=<1|2|3> effort=<glance|quick|deep|-> confidence=<high|needs-judgment|standards-only|has-minors|-> -->`.
- Every inline comment and reply starts with `<!-- prism-agent -->`.
- The summary gains `### Pass coverage`, one line per pass.
- Keep the label table and the three states.

Budget: 120 minus `github-writes.md`'s lines, measured after its edit. Severity, finding shape, the exit rule, and rounds now live in `REVIEW.md`, so delete any body text restating them. Record the measured total in `## History`.

### T16: Teach prism-audit plan folders and promotion checks

- files: .ai-skills/skills/prism-audit/frontmatter.yml, .ai-skills/skills/prism-audit/shared.md, .prism/architect/_toolkit/audit-workflow.md, templates/install/.prism/architect/_toolkit/audit-workflow.md, .claude/architect/_toolkit/audit-workflow.md, .codex/architect/_toolkit/audit-workflow.md, .cursor/architect/_toolkit/audit-workflow.md, .claude/skills/prism-audit/SKILL.md, .cursor/skills/prism-audit/SKILL.md, .claude/agents/prism-audit.md, .codex/agents/prism-audit.toml
- proof: pnpm run prism:build && pnpm exec tsx --test scripts/ai-skills/skill-loaded-lines.test.ts && pnpm run prism:crossref-lint && grep -q "broken-promotion-claim-in-plan" .ai-skills/skills/prism-audit/shared.md
- proof fails on main: yes
- depends on: none

Owner: Clove. Adapt thrive's `thrive-surface-audit` and its `plan-reconciliation.md` step 8, "Pre-archive Decisions sweep", into PRISM's existing audit. The skill keeps its verdicts, gates, and worktrees lane.

- **Finding plans.**
  - A plan is a flat `.prism/plans/<name>.md`, or a folder under `.prism/plans/` holding `intent.md`, `design.md`, `spec.md`, or `plan.md`. That is the same test `scripts/ai-skills/hooks/plan/lookup.mjs` uses.
  - A folder's Decisions live in its `plan.md`. An epic folder's live in its `spec.md`.
  - A folder with no `## Decisions` passes empty.
- **Archiving.** An archive-ready folder plan moves whole to `.prism/archived/plans/<folder>/`, with the same confirmation gate. A folder is archive-ready when its `plan.md`, or an epic's `spec.md`, carries a `> Closed:` marker or a `stage`/`status` of `closed`, and meets the existing Decision and 90-day rules.
- **Promotion check.** For each `→ promoted to <path>` (or `-> promoted to`):
  - strip backticks and open the file
  - search for a distinctive phrase from the Decision's bold title or the rule it states, where a named section is a hint only
  - a missing file, or a file without the text, is `broken-promotion-claim-in-plan`, reported under its plan
- **Delete** the line that flags `.prism/qa/ac-verification-<ticket-id>.md` beside an archived plan (line 30 on `2aec908e`). The review now records grades in the plan.

**`audit-workflow.md`.**

- Add the folder shape to Audit surfaces and Plan-archive lane.
- Add the promotion check to Per-Decision verdict procedure.
- Write each change into the existing paragraph. `audit-workflow.md` is an umbrella doc, so it gets no new heading.

### T17: Move acceptance-criteria grading out of prism-qa-plan

- files: .ai-skills/skills/prism-qa-plan/frontmatter.yml, .ai-skills/skills/prism-qa-plan/shared.md, .prism/references/qa-plan/verdict-contract.md, templates/install/.prism/references/qa-plan/verdict-contract.md, .claude/references/qa-plan/verdict-contract.md, .codex/references/qa-plan/verdict-contract.md, .cursor/references/qa-plan/verdict-contract.md, .prism/templates/acceptance-criteria.md, templates/install/.prism/templates/acceptance-criteria.md, .claude/templates/acceptance-criteria.md, .codex/templates/acceptance-criteria.md, .cursor/templates/acceptance-criteria.md, .prism/architect/_toolkit/plan-authoring.md, templates/install/.prism/architect/_toolkit/plan-authoring.md, .claude/architect/_toolkit/plan-authoring.md, .codex/architect/_toolkit/plan-authoring.md, .cursor/architect/_toolkit/plan-authoring.md, .prism/architect/_toolkit/skills-ecosystem.md, templates/install/.prism/architect/_toolkit/skills-ecosystem.md, .claude/architect/_toolkit/skills-ecosystem.md, .codex/architect/_toolkit/skills-ecosystem.md, .cursor/architect/_toolkit/skills-ecosystem.md, .ai-skills/skills/prism-implement/shared.md, .ai-skills/skills/prism-challenge/shared.md, .claude/skills/prism-qa-plan/SKILL.md, .cursor/skills/prism-qa-plan/SKILL.md, .claude/agents/prism-qa-plan.md, .codex/agents/prism-qa-plan.toml, .claude/skills/prism-implement/SKILL.md, .cursor/skills/prism-implement/SKILL.md, .claude/agents/prism-implement.md, .codex/agents/prism-implement.toml, .claude/skills/prism-challenge/SKILL.md, .cursor/skills/prism-challenge/SKILL.md, .claude/agents/prism-challenge.md, .codex/agents/prism-challenge.toml
- proof: pnpm run prism:build && pnpm exec tsx --test scripts/ai-skills/skill-loaded-lines.test.ts scripts/ai-skills/routing-coverage.test.ts && pnpm run prism:crossref-lint && ! git grep -q "AC Verification" -- .ai-skills/skills/prism-qa-plan && test ! -e .prism/references/qa-plan/verdict-contract.md && grep -q "Grade every acceptance criterion" .prism/review/intent-scope.md
- proof fails on main: yes
- depends on: T9, T14, T15
- behavior change: Reese no longer grades acceptance criteria and no longer writes `.prism/qa/ac-verification-*.md` reports.

Owner: Clove. The intent moves grading into the review's intent-conformance pass, which T9 wrote.

- **`prism-qa-plan`.**
  - Delete `## AC Verification` (lines 27 to 37 on `2aec908e`), the mode-selection clause at line 7, and the citation of `verdict-contract.md`. That deletion includes line 34, which sends an UNMET result to `## Review Issues`, so a folder plan's grades now land only where the intent-scope pass records them.
  - The frontmatter drops "verify the AC" and "grade the AC" from its triggers and its AC-verification description clause.
  - Keep the four checklist modes.
- **Delete `verdict-contract.md`,** its seed twin, and its platform copies.
- **Sweep its citations:**
  - `acceptance-criteria.md` and its twin. "Reese's AC Verification mode" (line 55 on `2aec908e`) becomes "the review's intent-conformance pass, `.prism/review/intent-scope.md`".
  - `plan-authoring.md` and its curated twin. The Acceptance Criteria Format paragraph that cites `verdict-contract.md` names the intent-scope pass.
  - `skills-ecosystem.md` and its curated twin. The Reese roster row drops the AC Verification mode and its `verdict-contract.md` citation. The rest of the roster is T23's.
  - `prism-implement`, two bullets under "Verify and ship".
    - Line 37's pre-flight stays. Its sentence "When `prism-qa-plan` runs AC verification, it renders MET or UNMET, and this skill never claims "AC-3 is MET"." becomes "When the review grades the criteria, it renders met or unmet, and this skill never claims "AC-3 is met"."
    - Line 39's "one commit per plan task on a multi-task plan" becomes "one commit per bundle on a folder plan and per task on a flat plan", which is the wording `git-conventions.md` lines 25 and 71 already use. This is the fix child 5 handed here. It rides this task because the file is already in its diff.
  - `prism-challenge`. Line 8's AC-verification mention names the review stage.

Run `git grep -n -e verdict-contract -e "AC Verification" -e "ac-verification"` after the build. Only plans, retros, audits, ADRs, `.prism/qa/`, `.prism/research/`, `CHANGELOG.md`, `.prism/lessons.md`, `docs/` (T24's), `followup-scope.md` (T19's), and `prism-retro` (T18's) may still match.

### T18: Rewrite prism-retro as the fixed last stage

- files: .ai-skills/skills/prism-retro/frontmatter.yml, .ai-skills/skills/prism-retro/shared.md, .prism/templates/retro-report.md, templates/install/.prism/templates/retro-report.md, .claude/templates/retro-report.md, .codex/templates/retro-report.md, .cursor/templates/retro-report.md, .claude/skills/prism-retro/SKILL.md, .cursor/skills/prism-retro/SKILL.md, .claude/agents/prism-retro.md, .codex/agents/prism-retro.toml
- proof: pnpm run prism:build && pnpm exec tsx --test scripts/ai-skills/skill-loaded-lines.test.ts && pnpm run prism:crossref-lint && pnpm run prism:retro-line
- proof fails on main: yes
- depends on: T3, T5, T14, T15
- behavior change: on a folder plan, Iris now runs without being asked, writes Decision verdicts, the `Retro:` line, and lessons exits, and commits them. On a flat plan she keeps the declinable gate and stays read-only.

Owner: Clove. Port thrive's `thrive-retro` with the global swaps, minus Voice (child 7), trimmed to budget: 120 minus `.prism/templates/retro-report.md`'s lines.

- **New `.prism/templates/retro-report.md`.** Port thrive's `.ai-spec/templates/retro-report.md`, both grains, whole. Its Review-miss classes line names `node ${HOOK_RUNTIME_DIR}/review/reconcile.mjs --classes`.
- **Fixed stage.** On a folder plan it runs after PR review with no prompt and is not declinable. Light per-ticket grain at a ticket's close, and full grain at an epic's close, when every child in its spec's `## Children` has merged.
- **What it reads:**
  - the plan's `## Decisions`, `## Review`, `## Verification`, `## Challenge`, and `## History`
  - the diff against `origin/${DEFAULT_BRANCH}`
  - the PR's comments, reviews, and check rollup
  - per-PR retro notes under `.prism/retros/`

  It never starts `watch-ci.mjs`. A pending check is reported as `CI pending on <sha>`.
- **Grading.** It takes the review's unmet criteria from `## Review` as given and grades the rest itself, reading the criteria from the source `.prism/review/intent-scope.md` names (T9).
- **Decision verdicts.** Every `## Decisions` entry gets `→ promoted to <path>` or `→ no promotion needed (<reason>)`, per `branch-plan.md`'s verdict gate.
  - Promotion targets follow the writing-an-architect-doc guide's placement order.
  - A Decision the record refuted is promoted as corrected or demoted to a lesson.
- **Review-miss classes.**
  - Run `node ${HOOK_RUNTIME_DIR}/review/reconcile.mjs --classes`.
  - For each open class, propose a fix in thrive's order: a hook or lint rule, then an architect-doc rule, then a `REVIEW.md` or pass-file line, then a written reason. A person approves each.
  - On approval, append `{"class":"<class>","resolved":"YYYY-MM-DD","fix":"<path>"}`.
  - With no person present, list the proposals as open items for the PR body and append nothing.
- **Lessons exits** over `.prism/lessons.md`, each listed in the report's `## Lessons exits`:
  - **promoted:** its rule now lives in the file a verdict names, so delete the entry
  - **expired:** older than 90 days with no reference from a plan, rule, ADR, or architect doc in that time, so move it to `.prism/archived/lessons-archive.md`, the file the audit already uses
  - **merged:** collapse duplicates into one entry
- **Voices.** On a folder plan, attribute each finding to its stage:
  - the intent, the spec, and the plan stage
  - challenge, implement, verify, review, and PR review

  A flat plan attributes by persona.
- **`Retro:` line.** Write `Retro: <report path>` under `## PR Readiness`.
- **Epic close.** At full grain on an `epic-<ticket>/` folder, append a `## Retro` section to its `spec.md` holding the report path. That section is what ends the epic row of the workflow rule's resume table, which T21 names. `prism-retro` is the only writer of it.
- **Commit.** `node ${HOOK_RUNTIME_DIR}/plan/commit.mjs "retro: <summary>" <plan.md> <report> [.prism/lessons.md] [.prism/archived/lessons-archive.md] [.prism/metrics/review-misses.jsonl] [<promotion targets>]`. The log path carries the rows the PR review left uncommitted (T15) along with any resolve rows. The session pushes, per the workflow rule.
- **Flat plans.** Keep today's behavior: read-only on the plan, offered at close, declinable with a recorded reason.

Drop thrive's state file (`iris-state.json`), its batteries text beyond the one-line `session-orientation.md` pointer, and its procedures A to E. Delete the line ingesting `.prism/qa/ac-verification-<ticket-id>.md` (line 28 on `2aec908e`). Record the measured total in `## History`.

### T19: Point the spec-scope lint and the follow-up rule at the rulebook

- files: scripts/ai-skills/spec-scope-lint.ts, scripts/ai-skills/spec-scope-lint.test.ts, .prism/rules/followup-scope.md, templates/install/.prism/rules/followup-scope.md, .claude/rules/followup-scope.md, .codex/rules/followup-scope.md, .cursor/rules/followup-scope.mdc, AGENTS.md
- proof: pnpm exec tsx --test scripts/ai-skills/spec-scope-lint.test.ts && pnpm run prism:build && pnpm run prism:spec-scope-lint
- proof fails on main: yes
- depends on: T9, T17
- behavior change: the spec-scope lint now treats `REVIEW.md` and `.prism/review/*.md` (outside `stack/`) as always-on spec content, in place of the `.prism/references/review-*.md` pattern no file matches.

Owner: Clove.

- **`spec-scope-lint.ts`.**
  - The matcher at line 78 on `2aec908e` (`.prism/references/review-<anything>.md`) becomes two matchers: root `REVIEW.md`, and `.prism/review/<name>.md` with no `stack/` segment.
  - Lines 94, 150, and 194 that refer to it follow.
  - The discriminator for a pass file is its basename. For `REVIEW.md` it is `REVIEW.md`.
  - Add `## Review` and `## Verification` to the bookkeeping headings the plan search skips, beside `## Review Issues`. They are the folder plan's findings sections.
  - The `LEDGER_SECTION_HEADINGS` JSDoc (lines 235 and 245) drops its tie to `prism-review-loop`.
- **`spec-scope-lint.test.ts`.**
  - Swap the `review-docs-impact.md` and `review-frameworks.md` fixtures for `.prism/review/correctness.md` and `REVIEW.md`.
  - Add a case where `.prism/review/stack/correctness.md` does not fire.
  - Rewrite the `prism-review-loop` fixture strings (lines 276, 279, 710, 716, and 729) to name `prism-self-review` where they stand in for a skill.
  - Line 1022 is the branch literal `huntermcgrew/prism-review-loop-self-audit`, not a skill name. In that test case (lines 1022 to 1042) make the same rename T20 makes in `resolve-live-plan.test.ts`: the branch becomes `huntermcgrew/prism-plan-lookup-self-audit`, `review-loop-self-audit` becomes `plan-lookup-self-audit`, and `review-loop-self` becomes `plan-lookup-self`, including the expected message on line 1042.
- **`followup-scope.md`** and its seed twin:
  - Line 70's list names `REVIEW.md` and `.prism/review/*.md` (not `stack/`) in place of `.prism/references/review-*.md`.
  - The bookkeeping set gains `## Review` and `## Verification`.
  - Line 82's AC-verification report sentence becomes "the Evidence sub-bullets the review grades under `## Review`".
  - The "Who runs this rule" bullet for `prism-review-loop` (line 100) is deleted.

### T20: Remove prism-review-loop

- files: .ai-skills/skills/prism-review-loop/frontmatter.yml, .ai-skills/skills/prism-review-loop/shared.md, .ai-skills/definitions/roles.json, .claude/skills/prism-review-loop/SKILL.md, .claude/skills/prism-review-loop/.ai-skill-generated, .cursor/skills/prism-review-loop/SKILL.md, .cursor/skills/prism-review-loop/.ai-skill-generated, .prism/rules/skill-routing.md, templates/install/.prism/rules/skill-routing.md, .claude/rules/skill-routing.md, .codex/rules/skill-routing.md, .cursor/rules/skill-routing.mdc, .prism/architect/_toolkit/skills-ecosystem.md, templates/install/.prism/architect/_toolkit/skills-ecosystem.md, .claude/architect/_toolkit/skills-ecosystem.md, .codex/architect/_toolkit/skills-ecosystem.md, .cursor/architect/_toolkit/skills-ecosystem.md, scripts/ai-skills/skill-loaded-lines.test.ts, scripts/ai-skills/lib/resolve-live-plan.test.ts, AGENTS.md
- proof: pnpm run prism:build && pnpm run prism:test && pnpm run prism:crossref-lint && test ! -e .ai-skills/skills/prism-review-loop && ! git grep -l prism-review-loop -- . ':!.prism/plans' ':!.prism/retros' ':!.prism/audits' ':!.prism/spec/adrs' ':!.claude/spec/adrs' ':!.codex/spec/adrs' ':!.cursor/spec/adrs' ':!templates/install/.prism/spec/adrs' ':!.prism/qa' ':!CHANGELOG.md' ':!.prism/lessons.md' ':!CONTEXT.md' ':!docs'
- proof fails on main: yes
- depends on: T14, T15, T19

Owner: Clove. The intent deletes `prism-review-loop` once `REVIEW.md` and the review rounds inside the stages replace it, and T8, T14, and T15 land those. It runs before T13 and T21, because the 166-byte routing line it deletes pays for what they add to the lead rules. After the build, measure the `AGENTS.md` lead-section end offset with `measureLeadSectionEnds` and record it in `## History`.

- Delete the skill directory, its generated outputs, and its `roles.json` entry. It is a utility, so it has no agent files.
- **`skill-routing.md`** and its curated twin: delete its Utility skills line.
- **`skills-ecosystem.md`** and its curated twin: delete its sentence from the Utility skills paragraph.
- **`skill-loaded-lines.test.ts`.** Delete the `prism-review-loop` entry from `OVER_CAP_ALLOWLIST`, and only that entry. The allowlist and its ratchet stay, as the mechanism for reasoned overages. Any entry another task in this child added for a skill over 120 stays too. If the constant ends up empty and the test's type or loop rejects an empty object, keep it as `{}` with its type annotation and change nothing else. T25 rewrites the test's comment.
- **`resolve-live-plan.test.ts`.** Lines 320, 347, 366, 390, and 512 hold the branch literal `huntermcgrew/prism-review-loop-self-audit`. It is fixture data for the unfiled-plan slug tier, not a skill name, so rename the fixture's theme in those five test cases:
  - the branch becomes `huntermcgrew/prism-plan-lookup-self-audit`
  - every `review-loop-self-audit` in their plan paths, titles, and expected values becomes `plan-lookup-self-audit`, and every `review-loop-self` becomes `plan-lookup-self`

  The slug tier matches whole hyphen tokens, and the new plan slugs' tokens are still a subset of the branch's, so every assertion holds with no other change.

The proof's last command is AC-10's `git grep`. Only plans, retros, audits, ADRs and their copies, `.prism/qa/`, `CHANGELOG.md`, `.prism/lessons.md`, `CONTEXT.md`, and `docs/` (T24's) may still match, and the proof excludes exactly those. On `2aec908e` every other hit is in a file T14, T15, T19, or this task edits. `CONTEXT.md` sits outside the spec's Affected systems. Note it in `## History` for child 9.

### T21: Wire the review stages into the workflow rule and the PR stage

- files: .prism/rules/workflow.md, templates/install/.prism/rules/workflow.md, .claude/rules/workflow.md, .codex/rules/workflow.md, .cursor/rules/workflow.mdc, .prism/references/shipping-flow.md, templates/install/.prism/references/shipping-flow.md, .claude/references/shipping-flow.md, .codex/references/shipping-flow.md, .cursor/references/shipping-flow.md, AGENTS.md
- proof: pnpm run prism:build && pnpm exec tsx --test scripts/ai-skills/agents-md-budget.test.ts scripts/ai-skills/routing-coverage.test.ts && pnpm run prism:crossref-lint && pnpm exec tsx -e "import('./scripts/ai-skills/agents-md-block.ts').then(m=>{const e=m.measureLeadSectionEnds(require('fs').readFileSync('AGENTS.md','utf8'));const b=Math.max(...e.map(x=>x.endByte??Infinity));console.log(b);if(b>31744)process.exit(1)})"
- proof fails on main: yes
- depends on: T13, T14, T15, T18, T20
- behavior change: the resume table now routes verify to `prism-verify` and lets `prism-retro` write the `Retro:` line, and the PR stage watches CI. A push whose commits touch only the plan folder, the retro report, and the misses log no longer re-dispatches PR review.

Owner: Clove. Child 5 left the `watch-ci.mjs` and `REVIEW.md` sentences out of the workflow rule until this child existed. Each edit below replaces text on `2aec908e`, quoted so the change is exact.

**`workflow.md`, Advancing.** Three edits:

- Replace "Fix a red CI result and push again, at most 3 times, then put it on the PR like any open item." with "After every push, run `node ${HOOK_RUNTIME_DIR}/plan/watch-ci.mjs <pr>` in the background. On exit 1, fix the failure and push again, at most 3 times, then put it on the PR like any open item. Exit 8, a timeout, and exit 3, an unreadable PR, go on the PR the same way."
- Replace "A review pauses to ask the person on four things only: a file outside the plan, a new dependency, a change to a shared type or public API, and destructive git." with "A review pauses to ask the person only on the four pause triggers in `REVIEW.md`." `REVIEW.md` owns the list after T8, and the shorter sentence pays for the watch-ci one.
- After "After review fixes are pushed, re-dispatch `prism-pr-review` on the commits since its last review.", add "Past the 3-round cap that run is the one confirm pass, per `REVIEW.md`."

**`workflow.md`, Resume table.** Five rows change. Every other row stays.

| Row (folder state) | New next stage |
| --- | --- |
| standard, `## Verification` empty | verify: dispatch `prism-verify` |
| standard, no final self-review line under `## Review` | review: run `prism-self-review` against `REVIEW.md` |
| standard, PR open with no final PR-review verdict under `## Review` | PR review: dispatch `prism-pr-review` as a subagent |
| standard, `Retro:` line empty under `## PR Readiness` | retro: run `prism-retro`, which writes the line and commits `retro: <summary>`, then push |
| epic, every child in `## Children` merged, no `## Retro` in `spec.md` | retro: run `prism-retro`, which appends `## Retro` to `spec.md` |

The review and PR-review rows are the two whose folder-state cell changes. The other three change only their next-stage cell. "Final" has the meaning T8 gives it in `REVIEW.md`: the last `self-review` line is `clean` or is round 3, and the last `pr-review` line is `clean` or is the confirm line. Without it, a fresh session that found one non-clean round recorded would skip ahead, to the PR row or the retro row, while fixes were still owed.

**`shipping-flow.md`.** Four edits:

- Step 1, "Verify": replace "rerun the verification commands on the new head first" with "re-dispatch `prism-verify` on the new head first, per the After a fix part of `REVIEW.md`".
- Step 3, "Commit": after "Commit anything still uncommitted", add ", except `.prism/metrics/review-misses.jsonl`, which the retro's `retro:` commit carries. Once `Retro:` is filled, commit the log alone with `node ${HOOK_RUNTIME_DIR}/plan/commit.mjs "retro: log review misses" .prism/metrics/review-misses.jsonl`". The PR review leaves its rows uncommitted (T15). A review that runs after the retro, on promotion or lessons edits, appends rows the retro will not come back for, so the session commits them under `retro:`, whose paths include the log (T18). A log-only commit is inside the Close exemption, so it starts no further review.
- After step 8, add step 9: "**Watch CI.** Start `node ${HOOK_RUNTIME_DIR}/plan/watch-ci.mjs <pr>` in the background, and read a failed job with `gh run view <run-id> --log-failed`."
- Close: after "dispatch it again on the commits since its last review.", add "Skip the dispatch when no commit since its last review touches a file outside the plan folder, the retro report under `.prism/retros/`, and `.prism/metrics/review-misses.jsonl`. A retro commit that edits a rule, an architect doc, an ADR, or any other file gets a review. That review records the next `pr-review round` line, or a `pr-review confirm` line once the cap is reached, per `REVIEW.md`." The exemption keys on the files a commit touches, not on its subject. Without it, the push carrying the final PR-review record and a bookkeeping-only retro would start another round, whose own record commit no push would ever carry.

**Byte budget.** Measure the `AGENTS.md` lead-section end offset with `measureLeadSectionEnds` after the build, and record it and `workflow.md`'s byte size in `## History`. It must be at most 31,744. The net change in this task should be about zero or less: the watch-ci and confirm-pass sentences add bytes, and the shorter pause sentence and the shorter verify and retro rows give them back. If the offset still passes 31,744, cut `workflow.md` prose until it does not. Never cut a resume row or a cap. `agents-md-budget.test.ts` must pass, and the proof's last command prints the offset and fails past 31,744.

### T22: Make the retro fixed for folder plans in the plan rule, template, and an ADR

- files: .prism/rules/branch-plan.md, templates/install/.prism/rules/branch-plan.md, .claude/rules/branch-plan.md, .codex/rules/branch-plan.md, .cursor/rules/branch-plan.mdc, .prism/templates/plan.md, templates/install/.prism/templates/plan.md, .claude/templates/plan.md, .codex/templates/plan.md, .cursor/templates/plan.md, .prism/architect/_toolkit/plan-authoring.md, templates/install/.prism/architect/_toolkit/plan-authoring.md, .claude/architect/_toolkit/plan-authoring.md, .codex/architect/_toolkit/plan-authoring.md, .cursor/architect/_toolkit/plan-authoring.md, .prism/spec/adrs/_toolkit/0083-retro-is-a-fixed-stage-on-folder-plans.md, .prism/spec/adrs/_toolkit/0068-retro-charter-and-two-grain-cadence.md, .prism/spec/adrs/_toolkit/README.md, templates/install/.prism/spec/adrs/_toolkit/README.md, .claude/spec/adrs/_toolkit/0083-retro-is-a-fixed-stage-on-folder-plans.md, .codex/spec/adrs/_toolkit/0083-retro-is-a-fixed-stage-on-folder-plans.md, .cursor/spec/adrs/_toolkit/0083-retro-is-a-fixed-stage-on-folder-plans.md, .claude/spec/adrs/_toolkit/0068-retro-charter-and-two-grain-cadence.md, .codex/spec/adrs/_toolkit/0068-retro-charter-and-two-grain-cadence.md, .cursor/spec/adrs/_toolkit/0068-retro-charter-and-two-grain-cadence.md, .claude/spec/adrs/_toolkit/README.md, .codex/spec/adrs/_toolkit/README.md, .cursor/spec/adrs/_toolkit/README.md, AGENTS.md
- proof: pnpm run prism:build && pnpm run prism:crossref-lint && pnpm run prism:spec-scope-lint && pnpm run prism:retro-line
- depends on: T5, T17, T18, T21

Owner: Clove.

- **`branch-plan.md`** and its curated twin. Under Before Closing:
  - The universal gate's "declinable" wording stays for flat plans.
  - In both, add that a folder plan runs the retro as the fixed last stage with no declined form, and that `prism-retro` writes the `Retro:` line.
  - In `.prism/rules/branch-plan.md` only, add that `pnpm prism:retro-line` fails a folder plan whose final PR-review verdict is recorded and whose `Retro:` line is empty. The curated twin ships to consumers, who get no retro-line check and can't run a `pnpm prism:` command, so it leaves that clause out.
  - Edit existing paragraphs, and add no heading.
- **`.prism/templates/plan.md`.**
  - The comment above `Retro:` reverts to thrive's "Fill the Retro line with the retro report's path. The retro always runs."
  - Add a comment under `## Review`: "One line per review round, `- self-review round <n> at <sha>: <verdict>`, `- pr-review round <n> at <sha>: <verdict>`, or `- pr-review confirm at <sha>: <verdict>`, per REVIEW.md."
  - This reverses child 4's Decision allowing `declined`. The Decisions record why.
- **`plan-authoring.md`** and its curated twin, Plan Section Ownership table:
  - Add rows for `## Verification` (written by `prism-verify`), `## Review` (written by `prism-self-review` and `prism-pr-review`), and `Retro:` (written by `prism-retro`).
  - Keep the `## Review Issues` row for flat plans.
- **The ADR.**
  - Take the number from the directory after the precondition merge: the highest plus one. ADR-0082 is the highest on `2aec908e`, so expect 0083. Rename the file and every files entry if it differs.
  - Follow `TEMPLATE.md`:
    - **Context.** ADR-0068 made the retro a nudge a person may decline. The amended intent makes it the fixed last stage, because a run that finishes without the person has no one to decline it, and a skipped retro is how review misses go unclassed.
    - **Decision.** On a folder plan the retro always runs, writes Decision verdicts, the `Retro:` line, and lessons exits, and a check enforces the line. Flat plans keep ADR-0068's declinable form.
    - **Alternatives.** Declinable everywhere was rejected, because nothing would decline it in an unattended run, so it would silently not happen. Enforced on flat plans too was rejected, because legacy plans keep working unchanged.
    - **Consequences.** `prism-retro` is no longer read-only on folder plans, and it writes an epic's `## Retro` in `spec.md`. The check reads the final PR-review record line. The run commits that line and the retro with no push between them, so CI sees both together. A push that lands between them, such as a session that stops after the final PR review, fails CI until the retro runs, and that failure is the check doing its job.
  - Add `Amended by ADR-0083 for folder plans.` to ADR-0068's status line, and the new row to the README index and its curated twin.

### T23: Update the roster

- files: .prism/architect/_toolkit/skills-ecosystem.md, templates/install/.prism/architect/_toolkit/skills-ecosystem.md, .claude/architect/_toolkit/skills-ecosystem.md, .codex/architect/_toolkit/skills-ecosystem.md, .cursor/architect/_toolkit/skills-ecosystem.md
- proof: pnpm run prism:build && pnpm run prism:crossref-lint
- depends on: T13, T14, T15, T17, T18, T20

Owner: Clove. Write every claim against the merged skills.

- **`skills-ecosystem.md`** and its curated twin, Skill Roster:
  - **Briar:** runs `REVIEW.md`'s passes locally and grades the acceptance criteria.
  - **Eric:** runs the same passes on the PR, marks his comments, runs reconcile, and logs human catches.
  - **Reese:** checklists only.
  - **Iris:** the fixed last stage on a folder plan, writing verdicts and the `Retro:` line, and still offered on a flat plan.
  - **Zoe:** reads plan folders and checks promotion claims.
  - Add `prism-verify` to the dispatched `agent` roles in the Utility skills paragraph, beside `prism-spec` and `prism-challenge`.
  - Rule 9 gains that grading happens in review.

`qa-test-planning.md` is not edited. On `2aec908e` it holds no AC Verification material, so there is nothing to move.

### T24: Update the consumer docs for review, verify, and retro

- files: docs/personas.md, docs/ai-skills/compatibility.md, docs/ai-skills/iris.md, docs/what-prism-writes.md, docs/parameterization.md
- proof: pnpm run prism:crossref-lint
- depends on: T1, T6, T10, T11, T20, T23

Owner: Eli. Set `last_updated` to the edit date.

- **`personas.md`.**
  - Briar and Eric run `REVIEW.md`.
  - Reese writes checklists only.
  - Iris is the fixed last stage on a folder plan.
  - Zoe reads plan folders.
  - Add a `### prism-verify — verify stage` entry under `## Chain stages (no persona)`, after the `prism-plan` entry, in the same What it does, When it runs, and Skill shape the `prism-spec` entry uses.
  - Delete the `prism-review-loop` row of the Utility skills table, line 345 on `2aec908e`.
- **`ai-skills/compatibility.md`.** Line 21 names `prism-review-loop` as an example utility skill. Change "(e.g. `prism-handoff`, `prism-review-loop`)" to "(e.g. `prism-handoff`)".
- **`ai-skills/iris.md`.** The retro grades what the review left ungraded. On line 28, drop "and an AC-verification report when the plan points at one".
- **`what-prism-writes.md`.** Add rows for:
  - root `REVIEW.md`, with its marker line and what update, doctor, and eject do
  - `.prism/review/` and the team-owned `.prism/review/stack/`
  - `.prism/metrics/review-misses.jsonl`, created by its first row
  - the `.gitattributes` line
  - `.claude/hooks/plan/watch-ci.mjs`, `.claude/hooks/review/reconcile.mjs`, and `.claude/hooks/verify/check-report.mjs`
- **`parameterization.md`.** Add a field-reference row for `ci.requiredCheck` using T1's schema description, and add that extra `commands.*` keys become verify checks.

`docs/workflow.md` is child 9's and stays as it is.

### T25: Reword the 120-line cap as soft in the intent, the rules, and the test comment

- files: .prism/plans/prism-499/intent.md, .prism/plans/prism-499/plan.md, scripts/ai-skills/skill-loaded-lines.test.ts, .prism/rules/skill-authoring.md, .claude/rules/skill-authoring.md, .codex/rules/skill-authoring.md, .cursor/rules/skill-authoring.mdc, .prism/architect/_toolkit/business-layer.md, templates/install/.prism/architect/_toolkit/business-layer.md, .claude/architect/_toolkit/business-layer.md, .codex/architect/_toolkit/business-layer.md, .cursor/architect/_toolkit/business-layer.md
- proof: pnpm run prism:build && pnpm exec tsx --test scripts/ai-skills/skill-loaded-lines.test.ts && pnpm run prism:crossref-lint && test "$(git grep -l -i "soft cap" -- .prism/plans/prism-499/intent.md .prism/rules/skill-authoring.md scripts/ai-skills/skill-loaded-lines.test.ts | wc -l)" -eq 3 && ! git grep -n -i "hard cap" -- .prism/rules .prism/architect .ai-skills scripts/ai-skills/skill-loaded-lines.test.ts
- proof fails on main: yes
- depends on: T20, T23, T24
- behavior change: none to any skill or script. The cap's wording now says it is soft, and the check still enforces it.

Owner: Clove. This task edits `.prism/plans/prism-499/intent.md`, which is intent-level. Hunter's chat ruling of 2026-11-18 counts as his approval of the intent edit that records it. Name that ruling in the commit body, and do not edit the intent for anything else.

- **`.prism/plans/prism-499/intent.md`, three lines.** Find them by their text, since line numbers drift (50, 65, and 140 on `2aec908e`).
  - The Skill size line in the priority list becomes: "3. **Skill size.** Every skill aims for 120 loaded lines or less, enforced by the existing build check as a soft cap: a skill may go over with an allowlist entry that gives a one-line reason. A persona skill's `## Voice` block does not count, up to 16 lines."
  - The Phase-1 skills line becomes: "The 120-line build check keeps passing. It is a soft cap: a skill may go over 120 with an allowlist entry that gives a one-line reason, and no text is cut only to fit the number."
  - The cap line under the thinning list becomes: "The 120-line cap is a soft cap, and it keeps counting everything a skill loads. A skill may go over it with an allowlist entry and a one-line reason. Thrive reached its numbers partly by moving text into references its check does not count. PRISM does not copy that. Content that fails the tests is still cut, not moved."
- **`.prism/plans/prism-499/plan.md`.** Under the phase-1 Decision "The 120-line cap is enforced by a check, not by review" (line about 325), add a sub-bullet: "Hunter ruled on 2026-11-18 that the cap is soft with reasoned overages. The ruling is recorded in the Decisions of `.prism/plans/prism-530/plan.md`, and it supersedes this Decision going forward."
- **`scripts/ai-skills/skill-loaded-lines.test.ts`.** Rewrite the header comment and the one above `OVER_CAP_ALLOWLIST`.
  - Call the cap a "soft cap", in those words: an entry lets a skill go over 120 for a stated reason, or until the change that thins it lands.
  - Keep the ratchet sentence: a listed skill under the cap fails until its entry is removed, and one whose size moves fails until its `max` is updated.
  - For a reasoned overage, the entry's `thinnedBy` text starts with `reasoned overage:` and then gives the one-line reason. Change no type and no test body.
- **`.prism/rules/skill-authoring.md` and `.prism/architect/_toolkit/business-layer.md`.** Their Length test lines say the body "fits in 120 lines". Change each to say it aims for 120 lines, that the cap is a "soft cap", in those words, and that a reasoned overage takes an allowlist entry with a one-line reason. Keep the rest of the Length line.
- **Other hits.** Run `git grep -n -i -E "120-line|120 line|hard cap" -- .prism .ai-skills scripts docs` and fix each hit that calls the cap hard. Leave plans, retros, audits, and ADRs alone, because they are records. Run `pnpm prism:build` and commit what it writes. The proof's last two commands are AC-15's evidence. All three files must name the "soft cap", and no "hard cap" may remain in the rules, architect docs, skills, or the test.

## Challenge

round 1: blocking 1
  - T20 (blocking): lines 320, 347, 366, 390, and 512 of `resolve-live-plan.test.ts`, and line 1022 of `spec-scope-lint.test.ts` (T19), are all the branch literal `huntermcgrew/prism-review-loop-self-audit`. That is neither a skill-name stand-in nor quoted plan text, so the task's swap-or-leave rule decides none of them and two builds diverge. Left alone, they also fail T20's own `git grep -n prism-review-loop` allowed list and AC-10's evidence. Name the replacement branch string, or add both test files to the allowed list.
  - T21 (non-blocking): the self-review resume row still fires on "`## Review` empty". After a non-clean `self-review round 1` line, a fresh session skips to the PR row with fixes still owed. That is the same flaw the final PR-review Decision fixed for PR review. Key the row on a final self-review line instead: `clean`, or round 3.
  - T9, T14 (non-blocking): porting intent-scope's "Plan drift is reconciled, not reported" lets the review edit `## Tasks` and Decisions in place. An edit to `## Tasks` of an approved folder plan goes back through `auto-approve.mjs --check`, which always fails on a child folder with no `spec.md`, so the review would re-ask Hunter mid-run. It also reverses today's self-review rule that a difference is a finding and `intent.md` is never edited, and no Decision records that. Scope fix-in-place to sections outside `## Tasks` and outside `intent.md`.
  - T25 (non-blocking): intent line 50 ("Every skill stays at 120 loaded lines or less") still states a hard cap. T25 edits only lines 65 and 140, and its sweep skips plans. The fix touches `intent.md` and records the same soft-cap ruling.
  - T13, T21 (non-blocking): `agents-md-budget.test.ts` asserts 32,768, not 31,744. No proof enforces the 31,744 line the tasks say "must" hold, so only the History record shows it.
  - T14 (non-blocking): "Fix and re-run up to the 3-round cap" reads as if self-review fixes code. Thrive's body says a round fixes nothing in source and the author fixes, and today's line 1 says it never fixes. Say who fixes.
  - T5, T12 (non-blocking): the retro-line check is PRISM's own lint and is not delivered, so a consumer's folder plans have no enforcement. The spec's Retro sentence names no scope. Record this as a Decision, or route it to `prism-architect`.
  - plan (non-blocking): AC-1 and AC-13 have only human evidence, AC-14 only CI, and no task's proof runs AC-9's `git grep` or its check that the file is absent.
round 2: blocking 2
  - T15 (blocking): the PR review commits `.prism/metrics/review-misses.jsonl` under `plan: pr-review record`. `git-conventions.md` line 29 says a `plan:` commit stages only files inside the plan folder, and `branch-plan.md` line 179 says the same for a reviewer's plan-only commit. The epic spec's commit gate also limits `plan:` to the plan folder. A builder can't follow both T15 and those rules, so two builds diverge. Give the log a commit path that fits them, such as leaving it to the retro's `retro:` commit, which T18 already lists. Widening the `plan:` rule would change the spec's design.
  - T25 (blocking): AC-15's evidence greps for the literal "soft cap" in `skill-loaded-lines.test.ts` and for no "hard cap" hit. T25 tells the builder to "say the cap is soft" in the test comment and in `skill-authoring.md`, which doesn't contain that phrase. Its proof checks neither the test file nor the "hard cap" absence. A faithful build can pass T25's proof and fail AC-15. Name the phrase "soft cap" in each of the three rewrites, and add AC-15's two `git grep` commands to the proof.
  - T9, T14 (non-blocking): the intent-scope pass and self-review read the criteria from `intent.md` on a folder plan. Every PRISM epic child folder, this one included, has no `intent.md`, and its criteria live in `plan.md`'s `## Acceptance Criteria`. With T17 deleting Reese's grading, the review grades nothing on those plans, and only the retro does. Name `plan.md`'s `## Acceptance Criteria` as the source when the folder has no `intent.md`.
  - T21 (non-blocking): the shipping flow's Close dispatches `prism-pr-review` after every push, and T21 leaves it as it is. So the retro's push starts another PR-review round, whose record commit is never pushed. After a confirm pass, that round's line form is also undefined. Skip the re-dispatch when the push carries only `retro:` commits.
  - T20 (non-blocking): AC-10's `git grep -l prism-review-loop` check is a prose step after the build, not part of T20's proof.
round 3: blocking 1
  - T21 (blocking): T21's proof runs `pnpm run prism:crossref-lint`, and the shipping-flow sentences it quotes cite `.prism/metrics/review-misses.jsonl` in backticks. `references` is a scanned area in both the canonical and seed roots, and that file is absent, not gitignored, and not matched by `isLazyOrHistoricalTarget`, so the lint reports a broken reference and the proof fails. The fix is in `crossref-lint.ts`, which T21 does not list. T9 hits the same wall if each pass file's last line names its real stack file, such as `.prism/review/stack/correctness.md`, once T7 adds `review` to the scanned areas, and so do T12 and T18 if their text cites the log. Have T7, which already edits `crossref-lint.ts`, add the log path and the `.prism/review/stack/` prefix to `isLazyOrHistoricalTarget`, because both are created on first write.
  - T22 (non-blocking): the curated twin of `branch-plan.md` ships to consumers, and the new sentence says `pnpm prism:retro-line` fails a folder plan. Per the retro-line Decision consumers get no such check, and a consumer can't run a `pnpm prism:` command. Keep the fixed-retro sentence in the twin and drop the check clause.
  - T15, T21 (non-blocking): the narrowed Close exemption sends a retro that edits lessons or a promotion target back to PR review. That review appends miss rows, but the retro does not rerun and shipping-flow step 3 skips the log, so nothing ever commits those rows. Name the carrier, such as a `retro:` commit of the log alone when `Retro:` is already filled.
  - T25 (non-blocking): the workflow rule keeps an approved file's approval only through an edit that writes down the person's ruling in their words. T25's three intent sentences are the plan's wording, so `intent.md` keeps `status: approved` over text Hunter never approved. Quote the three sentences in the plan approval ask so his approve covers them.
  - T8 (non-blocking): `<verdict>` is `clean` or the open counts, and nothing ties `clean` to the exit rule. A round left with declined nits, decision items, or bookkeeping-only Minors can be recorded either way, and T5's check and both final-line resume rows read that word. Say `clean` means the exit rule holds.
round 4: blocking 1
  - T5, T21 (blocking, major): T5 and T21 build to the AC-2 adjustment, which is still `proposed`. T5's required case "a non-clean round with an empty `Retro:` passes" fails AC-2 as written, which fails any folder plan "whose PR review is recorded". Either fix changes an acceptance criterion: accepting the adjustment, or reverting T5 to the original wording, which reopens the CI-loop flaw the final-verdict Decision fixed. The plan routes the change to Hunter "with the plan approval", but the workflow rule sends an acceptance-criterion change to `prism-architect` first and asks the person "on its own, never inside an approval". No architect verdict on it is recorded.
  - plan (non-blocking): the misses-log Decision's "Alternatives considered" bullet still says a log-only commit was rejected because no folder-plan subject fits one. Its round-3 sub-bullet and T21 now use exactly that commit, `retro: log review misses`. The first Decision's "`## Challenge` is empty" and the OPEN Decision on running rounds 1 and 2 before the ask are also stale now that three rounds are recorded.
round 5: carried 1
  - plan (non-blocking): the scope-change list says it holds every entry that did not come from Hunter's rulings, but it names only AC-2. The criteria fallback to `plan.md`'s `## Acceptance Criteria` (architect at round 2, ruled not intent-level) and the retro-line check's PRISM-only scope (Winston at round 1) went through the architect path the workflow rule names and are missing, so the PR body built from the list would hide them from Hunter's veto. Add them, or say why they are not scope changes.

## Decisions

- **The plan uses the folder shape and the chain task shape, as children 4 and 5 do.** It was written before child 5's challenge-round runner landed. The rounds have since run and are recorded under `## Challenge`, and `status` stays `draft` until Hunter approves.
- **This plan is approved by Hunter in chat, once, after the 2026-11-18 refresh against `main` at `2aec908e`.** `prism-implement` refuses a folder plan whose `status` is not `approved`, and `auto-approve.mjs` cannot approve this one.
  - **Root cause.** `auto-approve.mjs` checks task files against the folder's own `spec.md`, and a child folder has none, because its spec is the epic's. T5 and T7 also list `package.json`, a default dependency stop path. On 2026-11-18 `auto-approve.mjs --check` exits 1 here on all three, whatever `## Challenge` holds.
  - **Alternatives considered.** Copying the epic spec's Affected systems into a child `spec.md` was rejected, because it duplicates the epic spec and drifts. Building child 6 outside the chain, as children 4 and 5 were, was rejected, because child 5's implement stage now refuses an unapproved folder plan.
  - **Chosen approach.** The workflow rule's approval path: Hunter says `approve` in chat, and the session runs `node scripts/ai-skills/hooks/plan/approve.mjs .prism/plans/prism-530/plan.md`, which stamps `approved_via: chat`.
  - **Implementation guidance.** Every pending edit lands before the ask. Per the workflow rule, an approved `plan.md` keeps its approval through any edit outside `## Tasks`. A change to `## Tasks` goes back through `auto-approve.mjs --check`, which fails here, so it goes back to Hunter.
  - **Approved 2026-11-19.** Hunter typed `approve` in chat twice on 2026-11-18. The first token sat in a worktree on another branch, so it could not stamp this plan. He then ran `approve.mjs` in his own terminal and confirmed with the keypress. That is why the stamp carries no `approved_via: chat` line. The approval covers what the chat ask covered.
  - **What Hunter's chat approval covers.** It covers this plan and the three T25 intent lines quoted below, and nothing else. The AC-2 adjustment is no longer part of the ask: `prism-architect` accepted it at challenge round 4 as not intent-level, and it is listed with the scope changes for Hunter's veto.
  - **The ask quotes T25's three intent lines, so Hunter's approve covers their exact wording.** The workflow rule keeps an approved `intent.md` approved only through an edit that writes down the person's ruling in their words, and these lines are the plan's wording of his soft-cap ruling. The session quotes them verbatim in the approval ask. T25 does not change them after that. The three lines:
    - "3. **Skill size.** Every skill aims for 120 loaded lines or less, enforced by the existing build check as a soft cap: a skill may go over with an allowlist entry that gives a one-line reason. A persona skill's `## Voice` block does not count, up to 16 lines."
    - "The 120-line build check keeps passing. It is a soft cap: a skill may go over 120 with an allowlist entry that gives a one-line reason, and no text is cut only to fit the number."
    - "The 120-line cap is a soft cap, and it keeps counting everything a skill loads. A skill may go over it with an allowlist entry and a one-line reason. Thrive reached its numbers partly by moving text into references its check does not count. PRISM does not copy that. Content that fails the tests is still cut, not moved."
- **The challenge rounds run before the approval ask.** This was an open question: the workflow rule's resume table runs its first matching row, and "standard, `## Challenge` missing round 1 or 2" comes before "a task with no commit naming it", so an approved plan with no rounds would go back to the plan stage instead of to implement. Resolved on 2026-11-18: the session ran every round, 1 to 3 and the confirm round 4, before asking Hunter, so the plan he approves is the challenged one and the resume table routes to implement.
- **Root `REVIEW.md` and `.prism/review/*.md` do not count toward the review skills' 120-line cap.** Hunter ruled on 2026-11-18, in chat: "Yes to both", on the question of whether they count.
  - **Root cause.** The intent says the cap "keeps counting everything a skill loads" and that PRISM does not move text into files its check ignores. The spec says nothing about the count changes except the Voice allowance, and `measureSkillLoad` charges neither path today. Counting them would put both review skills far over the cap, since thrive's `REVIEW.md` alone is 179 lines.
  - **Alternatives considered.** Counting both paths and adding the review skills to `OVER_CAP_ALLOWLIST`, rejected by Hunter's ruling.
  - **Chosen approach.** Hunter's ruling: the rulebook is a shared artifact the intent itself names, read by subagents per pass, not skill text moved out to dodge the count. The skills cite it uncounted, and nothing is added to `OVER_CAP_ALLOWLIST`. The intent's cap sentence was left as written by this ruling, and the later soft-cap ruling below rewords it through T25.
  - **Implementation guidance.** Cut skill text that fails the four skill tests. Never move it into an uncited file to dodge the count. Only the rulebook paths named here are exempt.
- **The 120-line skill cap is a soft cap with reasoned overages.** Hunter ruled on 2026-11-18, in chat, that the cap is soft, not a hard limit he must hold to. He chose "O1, reasoned overages". This supersedes the phase-1 Decision in `.prism/plans/prism-499/plan.md` titled "The 120-line cap is enforced by a check, not by review" for everything going forward.
  - **Root cause.** The phase-1 Decision made the check a hard gate with an allowlist expected to shrink one PR at a time, so a skill that needed more than 120 lines had to be cut to the number.
  - **Alternatives considered.** The hard cap with a shrinking allowlist, which is the phase-1 Decision, superseded by this ruling.
  - **Chosen approach.** The loaded-lines check and its allowlist stay. A skill may go over 120 by adding an allowlist entry with a one-line reason. Nobody cuts text just to fit the number. The four skill tests still cut content that fails them, and moving text into an uncited file to dodge the count stays wrong.
  - **Implementation guidance.** T20 removes only the `prism-review-loop` entry, so the allowlist is not expected to end empty. T25 rewords the intent and the rules. The test's ratchet stays: a listed skill whose size moves updates its `max` in the same diff.
- **The rulebook lives in root `REVIEW.md` and a new delivered `.prism/review/` area. Stack checks live in a consumer-owned `.prism/review/stack/`.**
  - **Root cause.** The spec puts pass files in `.prism/review/`, ships both to consumers, and has onboarding add stack checks. No delivered area covered `.prism/review/`, no path delivered a root file, and a refreshed pass file would overwrite a team's stack checks.
  - **Alternatives considered.** Pass files under `.prism/references/review/`, rejected because it contradicts the spec's path and the cap would charge them. Stack checks inside the pass files behind Atlas anchors, rejected because `prism update` rewrites PRISM-owned files.
  - **Chosen approach.** `review` joins the copied areas (T7). `review/stack/**` is consumer-owned and seed-excluded. `REVIEW.md` is marker-owned like the hook runtime (T10).
  - **Implementation guidance.** A consumer's own `REVIEW.md` without the marker is never touched. Some other tools may read a root `REVIEW.md`. That is unverified, and it is why an unmarked file is left alone rather than backed up and replaced.
  - **Approved by Hunter, 2026-11-18, in chat ("Yes to both"): `review` as a delivered content area.** That covers `COPIED_CONTENT_AREAS`, the path guard, the crossref-lint areas, the ownership globs with the consumer owning `review/stack/`, the seed-curation exclude, and package `files` (T7).
  - **Approved by Hunter, 2026-11-18, in chat ("Yes to both"): the new consumer root `REVIEW.md`.** It is written only when it is absent or carries PRISM's marker (T10).
- **Onboarding's stack checks point the passes at the per-team rules it already generates.** Writing new per-stack review content would duplicate those rules and drift from them. Thrive's stack checks were thrive's stack, which the intent leaves out.
- **Pass 10, Performance, gets its own file.** Thrive keeps it inline in `REVIEW.md`, and the spec says one file per pass.
- **Not ported:**
  - **Foundation-review mode,** which the spec lists as lower priority and the child's call. It adds a Contracts-only mode to `prism-pr-review` that the cap cannot absorb, and nothing in PRISM calls it.
  - **The `## UI diffs` section and Eric's Screenshots part.** They rest on thrive's screenshot script.
  - **Thrive's `references/review/run.md` and its five `pr-review/` references.** The cap would charge them. Their steps are one bullet each in the skills, and `github-writes.md` keeps the GitHub mechanics.
- **Retro voices named by stage are ported.** They cost one bullet in `prism-retro`.
- **PRISM defines the review record line, `- <stage> round <n> at <sha>: <verdict>`, plus `- pr-review confirm at <sha>: <verdict>` for the confirm pass.** Thrive says each stage writes "one verdict line" but gives it no fixed shape. The retro-line check needs a machine-readable "PR-review verdict exists", and a fixed prefix is the smallest thing that gives it one.
- **The retro-line check is new, a PRISM lint in `prism:check`, and reads folder plans only.** Thrive has no such check at the reference commit. Flat plans keep the declinable retro, per the spec's Retro section.
- **"PR-review verdict" means the final one: the last `pr-review` line is `clean`, or is the confirm line past the cap.** T5's check and T21's resume row both read it this way, and T8 defines it in `REVIEW.md`.
  - **Root cause.** The plan first counted any `pr-review round` line as the verdict. T21 now runs `watch-ci.mjs` after every push and fixes a red result up to 3 times. A non-clean round is followed by pushed fixes, so under the first reading every fix push would fail the retro-line check while the retro was not yet due, and the CI loop would chase a failure the run is meant to produce. The resume table had the same flaw: a fresh session finding one non-clean round recorded would jump to the retro row with fixes still owed.
  - **Alternatives considered.** Keeping "any round line" and teaching the CI loop to ignore a retro-line failure was rejected, because it puts an exception in the always-on rule and hides a real failure in the same check. Moving the check out of `prism:check` was rejected, because the spec and AC-2 put it there.
  - **Chosen approach.** Only a final verdict makes the retro due. The run commits the final PR-review record and the retro with no push between them, so CI sees both together.
  - **Implementation guidance.** T8 adds the confirm form of the record line and the one-sentence definition. T5 reads the last PR-review line. T15 writes the confirm line. T21 names "final" in the PR-review row. AC-2 now carries the adjusted wording, accepted at challenge round 4.
  - **Architect verdict on AC-2 (challenge round 4, 2026-11-18).** `prism-architect` ruled the AC-2 adjustment not intent-level: it measures spec line 142's "PR review verdict" as the stage's final verdict, per intent line 150 and the Review section's stop gate. The workflow rule sends an acceptance-criterion change to the architect first, so the adjustment was accepted on that verdict, not inside the plan approval, and it is listed with the scope changes so Hunter keeps his veto.
- **The self-review resume row also keys on a final line: the last `self-review` line is `clean`, or is round 3.** Challenge round 1 found the row still fired on "`## Review` empty", so a fresh session that found a non-clean round 1 would skip to the PR row with fixes owed, the same flaw the PR-review Decision above fixed. Round 3 is final because the workflow rule caps a stage at 3 rounds and sends what is left to the PR, and self-review has no confirm pass. T8 defines it in `REVIEW.md`, and T21 changes the row. Keeping "`## Review` empty" and relying on the session to remember a non-clean round lost, because the resume table exists for a session that remembers nothing.
- **The review fixes plan drift in place only outside `## Tasks`, and never edits `intent.md`.** Thrive's intent-scope pass fixes a stale task in place. On a folder plan an edit to approved `## Tasks` goes back through `auto-approve.mjs --check`, which always fails on a child folder with no `spec.md`, so the review would stop to ask Hunter mid-run. `intent.md` is the person's approved file, and today's self-review already reports a difference from it as a finding. So a stale task is a Minor finding, and drift in `## PR Readiness`, `## History`, Decision verdict sub-bullets, and Decision wording is still fixed in place (T9, T14). Porting thrive whole lost to the mid-run ask, and reporting every drift lost to the round trips thrive's rule was written to stop.
  - Narrowed on 2026-11-19 by the Decision that the review never writes a Decision verdict sub-bullet.
- **The retro-line check stays PRISM's own lint, and consumer folder plans get no mechanical check from this child.** The spec's sentence names no scope, and AC-2 grades it through `pnpm prism:check`, PRISM's command. A consumer's fixed retro comes from the delivered workflow rule, whose retro row keeps sending a fresh session back until `Retro:` is filled, and from `prism-retro` itself. A consumer check needs a delivered surface the spec's Scripts table does not name, a `prism doctor` check or CI wiring PRISM does not own, so delivering it here would widen the child past its spec. A `prism doctor` check that reads the same rule is the natural follow-up if consumer runs are seen ending with an empty `Retro:`. Decided by Winston at challenge round 1.
- **AC-1, AC-13, and AC-14 keep the evidence they have, and tasks carry the structural proofs they can.** T14 and T15's proofs check the skill and `github-writes.md` name the coverage line, T16's checks the audit skill names `broken-promotion-claim-in-plan`, and T17's runs AC-9's three checks. Whether a review prints ten entries, or the audit flags a false claim, is behavior a grep cannot show, so AC-1 and AC-13 stay human. AC-14 is the CI result on both platforms, and no local proof can produce the Windows leg. The criteria themselves are unchanged.
- **Two test files keep their fixture logic and lose the `prism-review-loop` branch literal.** `huntermcgrew/prism-review-loop-self-audit` in `resolve-live-plan.test.ts` (T20) and `spec-scope-lint.test.ts` (T19) is a slug-tier fixture, neither a skill name nor quoted plan text, so T20's swap-or-leave rule decided nothing. Both become `huntermcgrew/prism-plan-lookup-self-audit`, with the plan slugs renamed to match, so T20's `git grep` allowed list and AC-10's evidence hold. Adding the two files to the allowed list lost, because it would leave a deleted skill's name in live test code.
- **Child 5's handoffs (issue #530, comment 6990125591) each land in a task or are already covered.**
  - **Who writes an epic's `## Retro`.** `prism-retro` does, at full grain, in the epic's `spec.md` (T18). T21's epic resume row names it, which ends the loop where an epic resume sat at retro forever.
  - **`prism-pr-review` pushing the plan file alone in worktree mode.** On a folder plan Eric writes the record in the session's own checkout, whichever mode he read in, commits it with `commit.mjs`, and never pushes. The session pushes, per ADR-0082 and the routing rule's reviewer exception. A record written in his `/tmp` worktree would be stranded when the worktree is removed. A flat plan keeps today's plan-only commit and push (T15).
  - **`prism-qa-plan` sending UNMET results to `## Review Issues`.** T17 deletes the whole AC Verification section, line 34 included, and the intent-scope pass records grades under `## Review` on a folder plan (T9). No separate fix is needed.
  - **`prism-implement`'s "one commit per plan task".** T17 changes line 39 to per bundle on a folder plan and per task on a flat plan, matching `git-conventions.md`. It rides T17 because T17 already edits that file, and two open tasks may not claim one file without a dependency between them.
- **The self-review record keeps child 5's subject, `plan: self-review record`, and the PR review mirrors it as `plan: pr-review record`.** The plan first swapped in thrive's `plan: record review`. Renaming a subject that already shipped buys nothing, and matching names make the two records easy to find in `git log`.
- **The PR review leaves its misses-log rows uncommitted, and the retro's `retro:` commit carries them on a folder plan.** Decided by Winston at challenge round 2.
  - **Root cause.** T15 committed `.prism/metrics/review-misses.jsonl` under `plan: pr-review record`. `git-conventions.md` and `branch-plan.md` limit a `plan:` commit to the plan folder, and the epic spec's commit gate will deny anything wider, so a builder could not follow both.
  - **Alternatives considered.** Widening `plan:` to admit the log was rejected, because it changes the spec's folder-plan commit design. Committing the log on its own at every review was rejected for the normal path, because the retro's commit already carries it. The log-only `retro: log review misses` commit is kept for rows a review appends after the retro, per the sub-bullet below.
  - **Chosen approach.** Rows are appended in the session's own checkout and stay uncommitted. T18's `retro:` commit already lists the log, and shipping-flow step 3 leaves it for that commit (T21). Reconcile reads the working-tree file, so uncommitted rows still count as logged.
  - **Implementation guidance.** In worktree mode Eric passes `--log` pointing at the session checkout's log. On a flat plan, or with no plan, the report names the log as uncommitted for the author's next commit, because a flat plan's plan-only commit can't carry it either.
  - **Rows from a review after the retro.** A retro that edits promotion targets or lessons gets a PR review, and that review can append rows the retro will not return for. The review's `plan:` record commit can't carry them, because `plan:` stages only the plan folder. Instead, once `Retro:` is filled, the session commits the log alone as `retro: log review misses` at shipping-flow step 3 (T21). The log is one of the retro's paths (T18), so the commit fits the `retro:` rule. It touches only the log, so it sits inside the Close exemption and the loop still ends. Decided by Winston at challenge round 3. Letting the `plan:` record commit carry the log lost, because it widens the folder-only rule this Decision exists to keep.
- **The review reads the criteria from `intent.md` when the folder has one, and from `plan.md`'s `## Acceptance Criteria` otherwise.** Every epic child folder in PRISM, this one included, has no `intent.md`, because its intent is the epic's. Without the fallback, T17's removal of Reese's grading would leave those plans graded only by the retro. The spec puts criteria in `intent.md` and does not list an Acceptance criteria section in `plan.md`. This adds a read, not a section, and changes nothing where `intent.md` exists (T9, T14, T18). Decided by Winston at challenge round 2. The session ruled on 2026-11-18 that this is not intent-level, because it is a read fallback for bridge children.
- **PR review is not re-dispatched for a push whose commits touch only the plan folder, the retro report under `.prism/retros/`, and `.prism/metrics/review-misses.jsonl`.** Decided by Winston at challenge round 2, and narrowed by the session's ruling of 2026-11-18 to key on files, not subjects.
  - **Root cause.** The shipping flow's Close dispatches `prism-pr-review` after every push. The push after the final PR review carries the review's own record commit and the retro, so it would start a round whose record commit no later push carries. After a confirm pass that round's line form was also undefined.
  - **Alternatives considered.** Exempting every `plan:` and `retro:` commit by subject was the first call, and the session narrowed it. A retro's promotion edits to rules, architect docs, and ADRs would land after the last PR review, and with `mainSessionMayMerge` set in PRISM the main session could merge them unreviewed. Reviewing every post-retro push was rejected, because a review of bookkeeping is the cycle `followup-scope.md` already declines to gate.
  - **Chosen approach.** Skip the dispatch only when no commit since the last review touches a file outside those three places (T21). A `retro:` commit that carries promotion edits, or any other file, gets a review, recorded as the next `pr-review round` line, or a `pr-review confirm` line once the cap is reached.
  - **Why the loop still ends.** That review's record commit is plan-only, so the push that carries it touches only the plan folder and is exempt. A review with findings sends fixes back through the normal rounds, bounded by the 3-round cap and the confirm pass. The retro does not rerun, because its `Retro:` line is filled.
  - **Implementation guidance.** Judge each commit by `git diff --name-only <commit>^ <commit>`, not by its subject. A retro with no promotion edits leaves the final PR-review line as the last one, so T5's check and the resume table read the run as finished.
- **The `AGENTS.md` lead sections have 2 bytes of room, so every lead-rule addition names the cut that pays for it.** They end at byte 31,742 on `2aec908e`, against the 31,744 working line PRISM-522 T10 set, 1 KiB under Codex's 32,768-byte default window.
  - **Which files count.** Only lead rules move the offset, and this plan edits two: `workflow.md` and `skill-routing.md`. `followup-scope.md` (T19) and `branch-plan.md` (T22) render after the lead block, so they change the file's size and not the offset.
  - **The cuts.** T20 deletes the 166-byte `prism-review-loop` line from `skill-routing.md` and runs first. T13 then adds `prism-verify` to the dispatched-stages bullet. T21 replaces the inline pause-trigger list with a pointer to `REVIEW.md` and shortens the verify and retro rows, which pays for the watch-ci and confirm-pass sentences. The expected end offset after T21 is near 31,600.
  - **Alternatives considered.** Moving the watch-ci text into `shipping-flow.md` only was rejected, because the CI loop runs after every push, review fixes included, and the session reads the workflow rule for that, not the PR-stage reference. Raising the working line was rejected, because the 1 KiB margin is what absorbs a consumer's own text above the generated block.
  - **Implementation guidance.** T13, T20, and T21 each measure the offset after their build and record it in `## History`. A task that lands past 31,744 cuts prose in the rule it edited, never a resume row or a cap. `agents-md-budget.test.ts` only asserts 32,768, so T13 and T21, the two tasks that add lead-rule bytes, end their proofs with a `measureLeadSectionEnds` command that prints the offset and fails past 31,744. T20 only removes bytes and needs no such proof.
- **`check-report.mjs` is adapted, not ported verbatim.** Thrive's version checks a section against planted failures. The spec drops the planted fixture and the workspace mapping, so the package column goes and the expected list becomes optional, which leaves a shape check the verify stage can run on itself.
- **Verify's checks are the non-empty `commands.*` keys, and extra keys are consumer checks.** The schema already describes `commands` as the team's verification commands, open to extra keys. A separate list key was considered and rejected as a second place to name the same commands.
- **The CI watcher reads a new optional `ci.requiredCheck` key and waits for every check when it is unset.** The spec says the name comes from config, and no key held it. This is a consumer-facing schema addition, so it is flagged. `retroEvidence.ci` was considered and rejected, because it describes evidence for the retro, not what the PR stage waits on.
  - **Approved by Hunter, 2026-11-18, in chat ("Yes to both").** The new optional `ci.requiredCheck` config key is approved (T1).
- **`prism-retro` writes to folder plans, reversing "read-only on plans" there, and child 5's resume row where the session wrote `Retro:`.** The intent has the retro give every Decision a verdict and prune lessons, which is a write. Child 5 had the session write the line only because `prism-retro` was read-only until this child. Flat plans keep read-only. ADR-0083 records it.
- **Expired lessons move to the audit's archive file rather than being deleted.** Thrive deletes them. PRISM's audit already archives stale lessons to `.prism/archived/lessons-archive.md`, and an unattended stage deleting shared notes outright would be harder to undo than a move a reviewer sees in the diff.
- **`verdict-contract.md` folds into the intent-scope pass and is deleted.** Its 16 lines are the grading semantics, and grading moves to that pass. A reference under `qa-plan/` would name the wrong owner.
- **The plan template's `Retro:` comment reverts to "the retro always runs", reversing child 4's Decision.** Child 4 allowed `declined` because the plan rule still made the retro declinable. This child makes it fixed for folder plans, which is the only place the template is used.
- **`## Review` and `## Verification` join the bookkeeping sections.** They are the folder plan's findings sections. The spec-scope lint and the follow-up rule would otherwise treat review records as scope declarations.
- **`CONTEXT.md` keeps its `prism-review-loop` mention.** It sits outside the spec's Affected systems. Child 9 owns the user docs and the release sweep, as child 5 did with its Winston sweep.
- **The epic spec's Affected systems lacks two paths this plan needs.**
  - `templates/install/REVIEW.md` is already inside `templates/install/**`, so it is covered.
  - `.claude/review/**`, `.codex/review/**`, and `.cursor/review/**` are inside the host globs.

  Every file this plan names is covered, so nothing is flagged as outside.
- **The consumer `.gitattributes` gets a `merge=union` line for the review-misses log.** The log is append-only, so union merge keeps both sides' rows (T6).
  - **Approved by Hunter, 2026-11-18, in chat ("Yes to both").**
- **`prism-verify` joins `roles.json` as `{ "id": "prism-verify", "type": "agent", "routing": "named-only" }`.** It is a dispatched stage with no persona and is never routed off a phrase (T13).
  - **Approved by Hunter, 2026-11-18, in chat ("Yes to both").**
- **Stack: two PRs, cut after T12.**
  - **PR A, T1 to T12.** The config key, the three scripts, the retro-line check, the delivery of scripts, `REVIEW.md`, and pass files, the onboarding generator, and their architect doc. It ships inert and self-consistent: no skill reads the rulebook yet, every script has its suite, and the check passes on today's plans.
  - **PR B, T13 to T25.** The skills, rules, ADR, docs, and the soft-cap wording that use them.

  The cut follows child 5's, and it lets PR A be reviewed as code with tests and PR B as prose against a rulebook already on `main`. The 2026-11-18 refresh added no task and moved no task across the cut, so the split stands. The stack call is the orchestrator's.
- **Scope changes since the intent, listed at each stop and in the PR body so Hunter can veto any of them.** The workflow rule asks for this list. The plan kept none until challenge round 4, and these are the entries that did not come from Hunter's own rulings:
  - **AC-2 measures the final PR-review verdict.** A folder plan fails the retro-line check only once its last PR-review line is `clean` or the confirm line, not on a non-clean round. `prism-architect` accepted it at challenge round 4 as not intent-level. It changes an acceptance criterion, so Hunter keeps the veto.
  - **The review falls back to `plan.md`'s `## Acceptance Criteria` when a folder has no `intent.md`.** Epic child folders keep their criteria there, so without it they would be graded only by the retro. Decided by the architect at challenge round 2, and ruled not intent-level by the session on 2026-11-18. The Decision "The review reads the criteria from `intent.md` when the folder has one, and from `plan.md`'s `## Acceptance Criteria` otherwise" records it.
  - **The retro-line check stays in PRISM's own tree, so consumer folder plans get no mechanical retro check from this child.** The spec's sentence names no scope, and a consumer check would need a delivered surface the spec does not name. Decided by Winston at challenge round 1. The Decision "The retro-line check stays PRISM's own lint, and consumer folder plans get no mechanical check from this child" records it.
- T11 also updates `scripts/ai-skills/rule-generators.test.ts`. Adding `review-stack` to `RULE_GENERATORS` changes the generator order and the files `runRuleGenerators` writes, so the order test now expects four names and the output test expects the stack-check files. The output test asserts stack-check files by repo-relative path, because `.prism/rules/security.md` and `.prism/review/stack/security.md` share a basename.
- T11 also updates `.prism/architect/_toolkit/rule-generation.md` and `.prism/architect/_toolkit/onboarding.md`, and their platform copies. Both describe the generator list and order that T11 changes, and the code standards require every prose description of a changed behavior to be fixed in the same change. Neither file ships in the seed, so there is no twin to edit.
- T12 also updates `.prism/architect/_toolkit/install-layout.md`, with its curated seed twin edited by hand, and `.prism/architect/_toolkit/token-substitution.md`. T7 made `review` a copied content area, added `review/**` and `review/stack/**` to the ownership globs, and let a `seed-curation.json` excluded entry be a glob. Both docs list those areas or globs, and an architect doc that disagrees with its source is a Major finding.
- `build.ts` now treats a `seed-curation.json` excluded entry that holds `*` as a `compileMatcher` glob, and keeps exact matching for every other entry. T7 needed `review/stack/**` excluded as a whole folder, and the excluded list only matched exact paths. No existing entry contains `*`, so their behavior is unchanged. `ship-closure.ts` gained `review` in its seeded-area list as part of T7's content-area sweep, and its own excluded check uses the same matcher, so two readers of one config cannot disagree.
- `pnpm prism:check` fails at ship-closure from T9 until T12 lands. The ten pass files ship in the seed, and nothing on the ship surface reaches them until `review-runtime.md` is routed. T9's proof is therefore checked at T12's commit, and PR A's head stays green. T12's `review-runtime.md` links the rulebook as `[REVIEW.md](../../../REVIEW.md)`, or names each pass file by its `.prism/review/<name>.md` path. A bare `REVIEW.md` resolves against the doc's own folder, and the closure walk does not reach it.
- T12 also routes `REVIEW.md` and `.prism/review/**` to `_toolkit/spec-editing.md`, because the rulebook and pass files are spec prose, and `spec-editing.md` asks that every spec path route to it.
- T12 also adds the `REVIEW.md` and `.prism/review/**` routes to `templates/install/.prism/architect/manifest.stub.json`, matching `manifest.json` and `manifest.base.json`. `review-runtime.md` ships in the install seed, and `prism:verify-manifest` fails when a seeded doc has no route in the consumer's starting manifest, because a consumer would receive a doc nothing loads.
- **On a stacked ticket, only the last PR's final review lines end their stages, and only the last PR's final PR-review verdict makes the retro due.** A `self-review` or `pr-review` record line written on an earlier PR of a stack carries ` (part <k> of <m>)` after its sha, as in `- pr-review round 2 at <sha> (part 1 of 2): clean`. A line whose k is less than m does not count as final. A line with no part marker, or with k equal to m, counts as before.
  - **Root cause.** Every PR in a stack shares the plan folder and its `## Review` section. PR A's clean round would read as the ticket's final verdict while stack B was still unbuilt, so `prism:check` would fail on PR A and on `main` after it merged. For the same reason, a fresh session on PR B would find PR A's final lines and skip PR B's self-review and PR review.
  - **Alternatives considered.** Requiring every task to be done by `tasks.mjs`'s done set lost, because that set comes from commit subjects. After a squash-merge no `T<n>:` subject reaches `main`. Once PR B is rebased onto the squashed `main`, the T1 to T12 commits leave its range, so the check would never fire on the final PR. Keying the line on the PR number lost, because nothing in the plan says which PR is last. A placeholder `Retro:` value lost, because the resume table reads an empty line, and a placeholder the final PR forgot to clear would skip the retro.
  - **Chosen approach.** The marker is plain text on a line the reviewer already writes, so it survives a squash-merge. The stack size comes from this plan's stack Decision, which exists before the first PR opens. AC-2's wording holds, because its final verdict is the ticket's, and the marker is how a stacked ticket says which verdict that is.
  - **Implementation guidance.** A T5 fix widens `PR_REVIEW_LINE` to accept an optional ` (part <k> of <m>)` group between the sha and the colon, and skips a final line whose k is less than m. It adds three test cases: part 1 of 2 clean with an empty `Retro:` passes, part 2 of 2 clean with an empty `Retro:` fails, and a part 1 of 2 confirm line with an empty `Retro:` passes. A T8 fix adds the optional marker to the `self-review` and `pr-review` record-line forms in `REVIEW.md`, with one sentence on when to write it. A T12 fix adds it to the retro-line paragraph of `review-runtime.md`. Every record line PR #535 writes from here on carries `(part 1 of 2)`, and a `plan:` commit adds it to the final self-review line already recorded. T14 and T15 write the marker when the plan's Decisions declare a stack and the PR is not its last part. In T21, the review and PR-review resume rows read "final" this way. The retro row needs no change, because the implement row fires first while a later part's tasks have no commit.
- **A marked root `REVIEW.md` is replaced in place, with no `.bak`.** The marker says the file is PRISM's, and T10 took its ownership rule from the hook runtime, which replaces a marked file at a delivered path without a backup. A `.bak` on every rulebook change would leave untracked `REVIEW.md.bak` files in a consumer's root even when nobody edited the file. A team that edits the rulebook deletes the marker line, which is the documented opt-out, and an unmarked file is never touched. The cost is that an edit made with the marker still in place is lost on the next update, the same trade the hook runtime accepts. Neither the epic spec nor any acceptance criterion asks for the backup. A T10 fix drops the `backupConsumerFile` call in `syncReviewMd` and reports a plain replacement, its test asserts that the replaced file holds the seed bytes and that no `REVIEW.md.bak` exists, and a T12 fix updates `review-runtime.md`, which says the update saves the old bytes as `REVIEW.md.bak`.
- **`prism doctor` reports an unmarked `REVIEW.md` as info, not a warning.** Deleting the marker line is the documented way to keep your own rulebook, so a warning on every doctor run flags a choice the team made on purpose. `prism update` keeps printing its notice, because it explains why the update skipped the file. A T10 fix changes the severity in `doctor.ts` and its test, and a T12 fix changes `review-runtime.md`'s "warns on an unmarked file" to say doctor reports it as info.
- **Stack B opens with a `T1-T12:` record commit, because the squash of PR #535 left no task subject on `main`.**
  - **Root cause.** `tasks.mjs` judges a task done by a `T<n>:` commit subject in the range it reads. PR #535 squash-merged as one `PRISM-530:` commit, and a ticket subject completes no task. So on a branch cut from `main` after the merge, T1 to T12 read as open, both with `--base 2cbd8716` and without it. `bundles.mjs` would dispatch them again, and the resume table's implement row would send a fresh session back to T1.
  - **Alternatives considered.** Teaching `tasks.mjs` to read a stack part from a squash subject or a plan line lost, because it changes a script every install receives, which is a shared utility, and it would block stack B on a separate PR. Ordering T13 to T25 by hand and skipping `bundles.mjs` lost, because a fresh session would still follow the resume table to T1, and the build would lose the duplicate-claim and import-edge checks.
  - **Chosen approach.** The first commit on stack B's branch, `0cf3195e`, has the subject `T1-T12: Record stack A as shipped in #535` and holds only a `## History` line. The subject marks T1 to T12 done for `tasks.mjs`, `bundles.mjs`, and the resume table. The commit does not implement those tasks; PR #535 did, as `2cbd8716` on `main`. It is a task-subject commit that touches only the plan, unlike the usual `plan:` form, and this entry is why.
  - **Implementation guidance.** Run `bundles.mjs` with `--base 2cbd8716` as the workflow rule says; the range includes the record commit. The first wave is T14, T15, and T16.
  - → no promotion needed (the same gap affects every stacked ticket, and the follow-up PR to the workflow rule carries the lasting fix)
- T22 also updates `.ai-skills/definitions/seed-curation.json`, adding ADR 0083 to `excluded`. Every numbered ADR is excluded from the seed, so a new one left off that list is written into `templates/install/.prism/spec/adrs/_toolkit/`, where the install ADR gate and the relative-link gate fail on its ADR references. T22 also leaves the curated twin of the ADR README alone, because that twin's index holds no rows: no numbered ADR ships, so a row would link to a file a consumer never receives.
- T24 is Eli's task, and the session that built the rest of stack B built it, as the brief for this stack asked. It also corrected prose in its own files that the removal of `prism-review-loop` and the fixed retro made false: `iris.md` said Iris never edits a plan, `parameterization.md` named the review loop as the reader of `modelTiers` and as the merge gate, and `what-prism-writes.md` listed five mirrored areas, not six. Nothing in the repo reads `modelTiers` now, so its section says so and drops the example that no longer did anything.
  - Narrowed on 2026-11-19 by the Decision that the shipping flow's `prism-pr-review` dispatch honors `modelTiers.overrides.eric`.
- **The review fix round on PR #536 updates prose this PR made false, in files outside the task lists: `.prism/architect/_toolkit/lesson-promotion.md`, `.prism/rules/git-conventions.md`, `.ai-skills/config.schema.json`, `REVIEW.md`, and `.prism/architect/_toolkit/review-runtime.md`.** Removing `prism-review-loop`, moving Decision verdicts and lesson exits to `prism-retro`, and rewriting the reviewer skills onto `REVIEW.md` left sentences in these files that describe the old process. The workflow rule treats updating a doc a change made false as part of the change. Leaving them would ship rules that contradict the skills a session runs. The root `REVIEW.md` placeholder rename and the `review-runtime.md` row-length sentence are carried over from PR #535's review for the same reason.
  - Round 3 of the fix round also widened the `modelTiers` description in `.ai-skills/config.schema.json`, which no task lists, because the workflow rule's other two dispatch sites now honor the `eric` pin the same way the shipping flow does.
  - Round 4 of the fix round also edited `README.md`, which no task lists, because T17 removed AC grading from Reese and the file still named her an AC verifier. No task owns the file and no Decision defers it, so the same rule applies.
- **The review never writes a Decision verdict sub-bullet, on a folder plan or a flat one.** Verdicts belong to the close: `prism-retro` writes them on a folder plan after the final PR review, and the plan stage writes them at a flat plan's close. Before the close, a Decision with no verdict is the expected state, not drift. A reviewer that fills one in first hands the close a Decision that already looks settled, so the retro's check for a Decision the record refuted never runs on it. Keeping fix-in-place for flat plans was considered and lost: a flat plan's close is skipped the same way, the plan rule on `main` already keeps verdicts out of the reviewer's hands, and one rule with no shape branch is shorter. The review still fixes `## PR Readiness`, `## History`, and Decision wording in place. Decided by Winston on 2026-11-19 in the PR #536 fix round.
- **A folder plan closes on a dated `> Closed: YYYY-MM-DD` line that `prism-retro` writes, which replaces T16's clause letting a `stage` or `status` of `closed` mark a folder closed.** The audit's 90-day rule needs a close date, and a `stage` or `status` field carries none, so fix 642e6c8c made the dated line the only signal. No stage wrote that line, so no folder plan could ever become archive-ready. The plan rule's Before Closing puts the close on the final PR branch before merge, once Decisions are promoted, and the retro promotes them there. So the retro writes the line in its `retro:` commit: directly after the frontmatter of `plan.md`, and of the epic's `spec.md` at full grain. Restoring the status clause with a date from the commit that set it was rejected, because nothing sets `closed` and the audit would have to read git history. Having the session write the line after merge was rejected, because it needs a close-only PR, which is the cost the Before Closing placement exists to avoid. Decided by Winston on 2026-11-19 in the PR #536 fix round.
- **The shipping flow's `prism-pr-review` dispatch honors `modelTiers.overrides.eric`, which reverses the T24 note that nothing reads `modelTiers`.** Removing `prism-review-loop` removed the only reader, so a team's pin for a cross-model reviewer would silently stop working, and `followup-scope.md` folds same-scope work into the open PR before merge. The dispatch replaces the loop, so the pin moves with it as one sentence: dispatch on the pinned model when the host can run it, and otherwise on the default, saying so in the closing summary. A `prism doctor` warning was rejected, because it reports the setting as dead instead of keeping it working. A follow-up PR was rejected, because `main` would carry the silent no-op between merges. Decided by Winston on 2026-11-19 in the PR #536 fix round.

## History

- 2026-11-18 [huntermcgrew/prism-530-review-verify]: Plan created for child 6 as 24 tasks: the CI watcher, reconcile, the report check, the retro-line check, `REVIEW.md` and ten pass files with their delivery, onboarding stack checks, `prism-verify`, the self-review, PR-review, retro, audit, and QA rewrites, the review-loop removal, rule and ADR edits, and docs.
- 2026-11-18 [huntermcgrew/prism-530-review-verify]: Recorded Hunter's chat rulings: the 120-line cap does not count `REVIEW.md` or `.prism/review/*.md`, and five items are approved. The plan approval stays OPEN and `status` stays `draft`.
- 2026-11-18 [huntermcgrew/prism-530-review-verify]: Recorded Hunter's soft-cap ruling ("O1, reasoned overages") as a Decision that supersedes the phase-1 cap Decision. T20 now removes only the review-loop allowlist entry, and new T25 rewords the intent, rules, and test comment; AC-10 and AC-11 were adjusted and AC-15 added, logged in the AC Sync Log as not synced to issue #530.
- 2026-11-18 [huntermcgrew/prism-530-review-verify]: Refreshed the plan against `main` at `2aec908e` after child 5 merged: line citations, child 5's landed names and subjects, T1's validator limits, T6, T21, T23, T24, and T25 were corrected, and T10's unclosed comment literal, which hid T10 to T15 from `tasks.mjs`, was rewritten. Child 5's four handoffs now land in T15, T17, T18, and T21, the PR-review verdict now means the final one, and T20 runs before T13 to pay for the lead-rule bytes. The groups now come from `bundles.mjs`, three import edges were written into `depends on`, AC-2 has a proposed adjustment, and the main session's AC sync is logged.
- 2026-11-18 [huntermcgrew/prism-530-review-verify]: Acted on challenge round 1: T19 and T20 rename the `prism-review-loop` branch literal in two test fixtures, T8 and T21 key the self-review resume row on a final line, and T9 and T14 scope in-place drift fixes outside `## Tasks` and name the author as fixer. T25 adds intent line 50, T13 and T21 prove the 31,744 offset, and T14 to T17 gained structural AC proofs; the retro-line check's PRISM-only scope and the AC evidence limits are recorded as Decisions.
- 2026-11-18 [huntermcgrew/prism-530-review-verify]: Acted on challenge round 2: T15 leaves the misses log for the retro's commit and T21 keeps shipping-flow step 3 off it, and T25 names "soft cap" in each rewrite and runs AC-15's two greps. T9, T14, and T18 fall back to `plan.md`'s criteria when a folder has no `intent.md`, T21 skips the PR-review re-dispatch on a `plan:`/`retro:`-only push, and T20's proof runs AC-10's grep; three Decisions record the calls.
- 2026-11-18 [huntermcgrew/prism-530-review-verify]: Applied the session's rulings: the criteria fallback stays and is recorded as not intent-level, and T21's Close exemption now keys on the files a commit touches, so a retro carrying promotion edits gets a PR review.
- 2026-11-18 [huntermcgrew/prism-530-review-verify]: Acted on challenge round 3: T7 makes the crossref lint treat the misses log and `.prism/review/stack/` as created on first write, with a failing-first test. T22's curated twin drops the retro-line clause, T21 commits post-retro miss rows as a log-only `retro:` commit, and T8 defines `clean` as the exit rule holding. The approval Decision now lists T25's three intent lines for the ask.
- 2026-11-18 [huntermcgrew/prism-530-review-verify]: Applied `prism-architect`'s round-4 verdict: AC-2 takes the final-verdict wording, its adjustment is accepted, and it heads a new scope-change list for the PR body. The approval ask now covers the plan and T25's three intent lines only, and three stale Decisions were brought current, including the resolved challenge-rounds question.
- 2026-11-18 [huntermcgrew/prism-530-review-verify]: Fixed round 5's carried finding: the scope-change list now also names the `plan.md` criteria fallback (round 2) and the retro-line check's PRISM-only scope (round 1), each citing its Decision. The AC Sync Log records the main session's AC-2 sync to issue #530.
- 2026-11-19 [huntermcgrew/prism-530-review-verify]: Built T1 to T5, the `ci.requiredCheck` key, the CI watcher, reconcile, the report check, and the retro-line check, each with its test. T3 and T4 share one commit.
- 2026-11-19 [huntermcgrew/prism-530-review-verify]: Built T7, so `review` is a copied content area with a consumer-owned `review/stack/` folder. `build.ts` now matches `*` globs in `seed-curation.json` `excluded`, since the old exact-match list could not express `review/stack/**`. `ship-closure.ts` gained `review` in its seed content areas, a file outside T7's list that the task's own sweep of the content-area lists required.
- 2026-11-19 [huntermcgrew/prism-530-review-verify]: Built T8 and T9, the root `REVIEW.md` and the ten pass files with their generated copies. `pnpm run prism:ship-closure` reports the ten pass files as unreached until a shipped doc names `REVIEW.md`, which no task before T12 does.
- 2026-11-19 [huntermcgrew/prism-530-review-verify]: Built T11, the `review-stack` generator that writes `.prism/review/stack/` files at onboarding, and T6, which delivers `watch-ci.mjs`, `reconcile.mjs`, and `check-report.mjs` and adds the `merge=union` `.gitattributes` line for the misses log. T11 also updated `rule-generators.test.ts`, `rule-generation.md`, and `onboarding.md` with their platform copies, which the first two re-plan Decisions entries allow. `measureSkillLoad` puts `prism-onboard` at 56 loaded lines.
- 2026-11-19 [huntermcgrew/prism-530-review-verify]: Fixed T7 so `ship-closure.ts` reads the excluded list through the shared `buildExcludedMatcher`, next to the `SEED_CONTENT_AREAS` change T7 made in `c39a4c6c`. Fixed T3, so `reconcile.mjs` exits 2 with a message outside a git repository, and T2, where the Windows skip is one `WINDOWS_SKIP` constant. The "T9 fix" commit added the three `.ai-skill-generated` markers that the `*.md` glob missed in the `review` platform copies.
- 2026-11-19 [huntermcgrew/prism-530-review-verify]: Built T10, the root `REVIEW.md` delivery. `prism update` writes it when absent, refreshes a marked copy after saving `REVIEW.md.bak`, and warns on an unmarked one. Doctor and eject learn the marker, and the build mirrors it to `templates/install/REVIEW.md`.
- 2026-11-19 [huntermcgrew/prism-530-review-verify]: Built T12, the new `review-runtime.md` and its routes in `manifest.json`, `manifest.base.json`, and the install `manifest.stub.json`, with the `plan-chain-scripts.md`, `hook-runtime.md`, `install-layout.md`, and `token-substitution.md` edits and their copies and seed twins. The `plan-chain-scripts.md` Invocation paragraph was also corrected to list `watch-ci` as a command with its exit codes 8 and 3 and its config-parse behavior, because it was false once `watch-ci` shipped. `pnpm run prism:check` is green at this head, `prism:ship-closure` included.
- 2026-11-19 [huntermcgrew/prism-530-review-verify]: Fixed Briar's round 1 on stack A, one `T<n> fix:` commit each for T10, T4, T2, T11, and T3, and marked the five Minors and the bookkeeping Minor fixed under `## Review`. The two nits, a two-cell row in `check-report.mjs` and `readOption` in `watch-ci.mjs`, stay open.
- 2026-11-19 [huntermcgrew/prism-530-review-verify]: Fixed the two-cell row nit in `T4 fix` 79abb962, so `check-report.mjs` drops a table row with fewer than three cells as thrive does. The `readOption` nit was declined earlier.
- 2026-11-19 [huntermcgrew/prism-530-review-verify]: Fixed Eric's PR-review round 1 on stack A, one `T<n> fix:` commit each for T5, T8, T12, T10, T7, and T9, after `prism-architect` ruled on the stack marker, the in-place `REVIEW.md` replacement, and doctor's info severity. The three rulings are recorded as Decisions, and the cleaner path on the correctness stack check is not taken in this PR.
- 2026-11-19 [huntermcgrew/prism-530-review-verify-part-2]: Recorded T1 to T12 as shipped in #535 (`2cbd8716`), so `tasks.mjs` reads stack B's range correctly. The Decision on the stack B record commit explains why.
- 2026-11-19 [huntermcgrew/prism-530-review-verify-part-2]: Built T14, T15, and T16, the self-review, PR-review, and audit rewrites. `measureSkillLoad` puts `prism-self-review` at 53 loaded lines, `prism-pr-review` at 116 (a 48-line body plus 68 lines of `github-writes.md`), and `prism-audit` at 61, so none needs an allowlist entry. The `REVIEW.md` and `review-runtime.md` carry-overs sit in no stack B task, so they go to the report.
- 2026-11-19 [huntermcgrew/prism-530-review-verify-part-2]: Built T17 and T18. Reese's checklist skill loses AC Verification and drops to 28 loaded lines, `verdict-contract.md` and its copies are deleted, and `prism-retro` is the fixed last stage at 115 loaded lines (a 37-line body plus the 78-line `retro-report.md`). After T18 the old AC-verification names still match only in `followup-scope.md` (T19) and the consumer docs (T24).
- 2026-11-19 [huntermcgrew/prism-530-review-verify-part-2]: Built T19, so `spec-scope-lint.ts` keys on the root rulebook and `.prism/review/*.md` with `stack/` excluded, and treats `## Review` and `## Verification` as ledger sections. `followup-scope.md` and its twins name the rulebook and drop the review-loop bullet, and the lint's 51 tests pass.
- 2026-11-19 [huntermcgrew/prism-530-review-verify-part-2]: Built T20, which removes `prism-review-loop` and renames the branch literal in `resolve-live-plan.test.ts`, and T13, which adds `prism-verify` at 72 loaded lines. `measureLeadSectionEnds` puts the `AGENTS.md` lead section at 31,742 before, 31,576 after T20, and 31,638 after T13, under the 31,744 limit. `CONTEXT.md` still names `prism-review-loop` and sits outside the spec's Affected systems, so it is for child 9.
- 2026-11-19 [huntermcgrew/prism-530-review-verify-part-2]: Built T21, wiring `watch-ci.mjs`, the `REVIEW.md` pause triggers, the confirm pass, and the five resume rows into the workflow rule and the PR stage. `measureLeadSectionEnds` puts the `AGENTS.md` lead section at 31,739 with `workflow.md` at 8,659 bytes. The first build landed at 31,777, so the watch-ci sentence and the pause sentence were shortened, and no row or cap was cut.
- 2026-11-19 [huntermcgrew/prism-530-review-verify-part-2]: Built T22 and T23. ADR 0083 makes the retro a fixed last stage on folder plans, and it needed one unlisted file, `seed-curation.json`, to exclude it from the seed, recorded as a Decision. The roster in `skills-ecosystem.md` now matches the merged self-review, PR-review, QA, retro, audit, and verify skills.
- 2026-11-19 [huntermcgrew/prism-530-review-verify-part-2]: Built T24, the consumer docs for review, verify, and retro, and T25, which rewords the 120-line cap as soft in the intent, `plan.md` of PRISM-499, the rule, the architect doc, and the test comment. The `soft cap` grep matches the three files AC-15 names and `hard cap` matches none.
- 2026-11-19 [huntermcgrew/prism-530-review-verify-part-2]: Fixed Briar's round 1 on stack B, one `T<n> fix:` commit each for T22, T20, T18, T15, and T16, and marked the five Minors and the nit fixed under `## Review`. It also carried over PR #535's two review items, the `REVIEW.md` placeholder rename in a `T8 fix:` commit and the `review-runtime.md` short-row sentence in a `T12 fix:` commit.
- 2026-11-19 [huntermcgrew/prism-530-review-verify-part-2]: Fixed Eric's round 1 on stack B, one `T<n> fix:` commit each for T22, T9, T18, T15, T21, and T24, and marked his four Minors, the nit, and the pin item fixed under `## Review`. Three Decisions record the rulings: the review writes no verdict, a folder plan closes on a dated `> Closed:` line `prism-retro` writes, and the PR-review dispatch honors `modelTiers.overrides.eric`.
- 2026-11-19 [huntermcgrew/prism-530-review-verify-part-2]: Fixed Eric's round 2 on stack B, one `T<n> fix:` commit each for T21, T24, T18, T22, and T23, and marked his three Minors fixed under `## Review`. The workflow rule's two other `prism-pr-review` dispatch sites now point at the shipping flow's pin rule, and the `AGENTS.md` lead sections end at byte 31,737, 7 under the working line.
- 2026-11-19 [huntermcgrew/prism-530-review-verify-part-2]: Extended two more lists of the retro's writes with the `> Closed:` line at the coordinator's request, in `prism-retro`'s frontmatter description (`T18 fix:`) and ADR-0083's Decision paragraph (`T22 fix:`). Both were found by the round 2 sweep for lists of the retro's output and sit beside the four sites already fixed.
- 2026-11-19 [huntermcgrew/prism-530-review-verify-part-2]: Fixed Eric's round 3 on stack B, one `T<n> fix:` commit each for T14, T15, T18, T22, and T24, and marked his three Minors and five nits fixed under `## Review`. The `README.md` edit rode the T24 commit and is recorded as a Decision sub-bullet, and a `lessons exits` sweep found no other list of the retro's writes missing the `> Closed:` line.

## Sessions

- 2026-11-18 [huntermcgrew/prism-530-review-verify] open: Intent: plan child 6 (review and verify) to the detail bar from the epic spec and thrive at db3570975, against child 5's plan as written. Bounds: plan file only, no code, nothing outside the spec's Affected systems, no new dependency, and flag shared-type, public-surface, and intent-level questions. Approach: port the rulebook and the review scripts as an inert first PR, then rewrite the stages on top, naming every child 5 dependency. · close: scope held
- 2026-11-18 [huntermcgrew/prism-530-review-verify] open: Intent: refresh the child 6 plan against `main` after child 5 merged, so Hunter approves it once. Bounds: the plan file and a merge of `main` only, Hunter's existing rulings kept, nothing that changes the PRISM-499 intent or spec. Approach: verify every task claim on `2aec908e`, fold child 5's four handoffs into existing tasks, and name the lead-rule cuts. · close: scope held
- 2026-11-18 [huntermcgrew/prism-530-review-verify] open: Intent: dispose of challenge round 1, fixing the blocking T20 finding and fixing or recording each non-blocking one. Bounds: `plan.md` only, never `## Challenge`, nothing that changes the PRISM-499 intent or spec beyond Hunter's recorded soft-cap ruling. Approach: verify each finding against the code, then fix in the owning task or record a Decision. · close: scope held
- 2026-11-18 [huntermcgrew/prism-530-review-verify] open: Intent: dispose of challenge round 2, fixing both blocking findings and fixing or deciding each non-blocking one. Bounds: `plan.md` only, never `## Challenge`, no change to `git-conventions.md`'s `plan:` rule or AC-15, and anything touching the PRISM-499 intent or spec reported to Hunter. Approach: verify each finding on `e61ecce9`, fix in the owning task, and record the architect calls as Decisions. · close: scope held
- 2026-11-18 [huntermcgrew/prism-530-review-verify] open: Intent: dispose of challenge round 3, fixing the blocking crossref-lint finding in T7 and acting on the four non-blocking ones. Bounds: `plan.md` only, never `## Challenge`, T25's intent wording unchanged, and `plan:` kept folder-only. Approach: verify the lint's scan roots and thrive's exit rule, fix in the owning tasks, and record the log-carrier call as a Decision. · close: scope held
- 2026-11-18 [huntermcgrew/prism-530-review-verify] open: Intent: apply the architect's round-4 AC-2 verdict and clear the stale Decisions. Bounds: `plan.md` only, never `## Challenge`, the issue sync left to the main session. Approach: swap in the accepted AC-2 text, record the verdict where the plan reads it, and start the scope-change list. · close: scope held
- 2026-11-19 [huntermcgrew/prism-530-review-verify] open: Intent: self-review stack A (T1 to T12) at `6d16a76f` against this plan and the repo's rules. Bounds: record in `plan.md` only, no fixes, no GitHub posts, stack B out of scope. Approach: run `prism:check`, read every source and doc change, and check the four ported scripts against thrive at `db35709` with one subagent. · close: scope held
- 2026-11-19 [huntermcgrew/prism-530-review-verify] open: Intent: fix Eric's PR-review round 1 on stack A under `prism-architect`'s rulings. Bounds: the files named per `T<n> fix:`, their generated copies and seed twins, and `plan.md` Decisions and Review only, no `## Tasks` edit. Approach: record the Decisions first, then one fix commit per task, then mark each finding fixed. close: scope held
- 2026-11-19 [huntermcgrew/prism-530-review-verify] open: Intent: PR-review round 2 of PR #535 over `95089dcc..b7626d33`, confirming each round 1 finding. Bounds: new findings only in that range, GitHub posts plus this plan's record line, no other repo file. Approach: read the range diff and sweep its references, run `prism:check` at the head, then resolve the fixed threads. · close: scope held
- 2026-11-19 [huntermcgrew/prism-530-review-verify-part-2] open: Intent: self-review stack B (T13 to T25) at `fe1a92c1` against this plan and `REVIEW.md`. Bounds: record in `plan.md` only, no fixes, no GitHub posts. Approach: run `prism:check` and the spec-scope lint, read every source diff, and sweep removed names and moved responsibilities. · close: scope held

## Verification

verdict: done
base: 2cbd87165e866ae603d27e6fdc2bb9589eafbc61
head: 203f68454c28b7fa7d9095c3b4fbf52dfb30d23a

| check | result | evidence |
| --- | --- | --- |
| typecheck | pass | /tmp/claude-1000/-home-zibbix-Projects-PRISM--claude-worktrees-hook-prism-pr-896bdc/f7e88157-5587-417c-ae9a-2c7e608332f2/scratchpad/v3/typecheck.log |
| lint | pass | /tmp/claude-1000/-home-zibbix-Projects-PRISM--claude-worktrees-hook-prism-pr-896bdc/f7e88157-5587-417c-ae9a-2c7e608332f2/scratchpad/v3/lint.log |
| test | pass | /tmp/claude-1000/-home-zibbix-Projects-PRISM--claude-worktrees-hook-prism-pr-896bdc/f7e88157-5587-417c-ae9a-2c7e608332f2/scratchpad/v3/test.log |
| build | pass | /tmp/claude-1000/-home-zibbix-Projects-PRISM--claude-worktrees-hook-prism-pr-896bdc/f7e88157-5587-417c-ae9a-2c7e608332f2/scratchpad/v3/build.log |
| format | n/a: not configured | none |
| spec | pass | /tmp/claude-1000/-home-zibbix-Projects-PRISM--claude-worktrees-hook-prism-pr-896bdc/f7e88157-5587-417c-ae9a-2c7e608332f2/scratchpad/v3/spec.log |

### Failures

- none

## Review

- self-review round 1 at 6d16a76f (part 1 of 2): 0 critical, 0 major, 5 minor, 3 nit
  - Checks: `pnpm run prism:check` exits 0 at `6d16a76f`, covering build `--check`, types, the full test suite, manifest, crossref, plan citations, retro-line, ship closure, and pack parity. `spec-scope-lint` skipped on the detached checkout, so it was rerun with `GITHUB_HEAD_REF=huntermcgrew/prism-530-review-verify` and passed. A subagent diffed `reconcile.mjs`, `watch-ci.mjs`, `check-report.mjs`, their tests, and the 46 fixture files against thrive at `db35709`. It found every thrive case present with no assertion weakened and no unallowed behavior change, and the three suites ran 96 pass, 0 fail.
  - Criteria in stack A: the machine evidence for AC-2 to AC-5, AC-7, and AC-8, plus AC-6's machine half, passes inside `prism:check`. AC-1, AC-9, AC-10, AC-12, AC-13, AC-15, AC-6's human half, and AC-11's skill totals other than `prism-onboard` belong to stack B. AC-14 waits on CI.
  - Cleanup: none. No debug output, stray files, or dead code in the diff.
- self-review round 2 at d9cfb7c6 (part 1 of 2): 0 critical, 0 major, 0 minor, 2 nit
  - Range: `60c39b21..d9cfb7c6`, the five `T<n> fix:` commits and one `plan:` commit.
  - Checks: `pnpm run prism:check` exits 0 at `d9cfb7c6`, with 2324 tests, 0 failing, and the new capitalized-header test passing. `spec-scope-lint` skipped on the detached checkout and was not rerun, because this agent's worktree guard refuses the `GITHUB_HEAD_REF` override. The range adds no always-on spec path, only two architect docs, the schema, scripts, tests, and the plan.
  - Round 1 confirmed closed: all five Minors and the bookkeeping Minor. `runDoctor`'s JSDoc sits directly above it again, `check-report.mjs` reads `Check` as the header, the watch-ci header, `plan-chain-scripts.md`, and both schema descriptions now name the late-check gap and match the code at `watch-ci.mjs:83`, `rule-generation.md` matches `review-stack.ts`'s per-file skip, `grep -rn lucas` finds only this plan, and T11's History line carries the 56-line total. The `base:` nit is fixed too. The watch-ci fix added no late-check test, which was part of the suggested fix, and the fix records it as doc-only.
  - Still open: the two-cell row nit in `check-report.mjs` and the `readOption` nit in `watch-ci.mjs`. History says they stay open but gives no reason, so the exit rule counts them until each is fixed or declined with one.
  - No new findings in the range.
- self-review round 3 at 95089dcc (part 1 of 2): clean
  - Range: `61383da8..95089dcc`, one `T4 fix:` commit and two `plan:` commits.
  - Checks: `pnpm run prism:check` exits 0 at `95089dcc`, with 2324 tests passing and 0 failing. `spec-scope-lint` skipped on the detached checkout. The range adds no always-on spec path.
  - Two-cell row nit closed: `parseTableRow` now returns null when the evidence cell is missing. Thrive's parser at `db35709` drops a row with fewer than three cells the same way, and its third cell is `result` where PRISM's is evidence. Both new tests pass and assert that their replacement changed the fixture.
  - `readOption` nit closed as declined: PRISM's `readOption` matches thrive's at `db35709` line for line, so the reason given holds.
  - No new findings in the range.
- pr-review round 1 at 95089dcc (part 1 of 2): 0 critical, 1 major, 3 minor, 3 nit
  - Range: the full PR, `2aec908e..95089dcc`, read in place with no checkout. The ubuntu CI leg was green and the windows leg pending at review time. Tests were not rerun by the reviewer.
  - Posted on PR #535 as seven inline comments and the summary comment. No prior threads existed, and no labels were applied because a Major stands.
  - Criteria in stack A: AC-2 to AC-8 and AC-6's machine half each have the tests their Evidence names. AC-14 waits on the windows leg. The rest belong to stack B.
- pr-review round 2 at b7626d33 (part 1 of 2): clean
  - Range: `95089dcc..b7626d33`, six `T<n> fix:` commits plus plan-only records, checked out detached at the head.
  - Checks: `pnpm run prism:check` exits 0 at `b7626d33`, with 2330 tests, 2328 passing, 0 failing, and 2 skipped. `spec-scope-lint` skipped on the detached checkout, and the range adds no always-on spec path. Both CI legs, ubuntu and windows, pass at this head, so AC-14 holds for stack A.
  - Round 1 confirmed closed: the Major, all three Minors, and all three nits, each at the sha its entry names. The seven threads on PR #535 are resolved with a reply naming the fix.
  - No new findings in the range. The cleaner path on `review-stack.ts` stays not taken and non-blocking.
  - Labels applied: `effort:deep` and `confidence:high`. The summary comment is updated in place, and the PR stays in draft.
- self-review round 1 at fe1a92c1 (part 2 of 2): 0 critical, 0 major, 5 minor, 1 nit
  - Range: `2cbd8716..fe1a92c1`, stack B's full range (T13 to T25 plus plan-only records), checked out detached at the head.
  - Checks: `pnpm run prism:check` exits 0 at `fe1a92c1`, with 2350 tests, 2348 passing, 0 failing, and 2 skipped. `spec-scope-lint` skipped on the detached checkout, so it was rerun with `GITHUB_HEAD_REF=huntermcgrew/prism-530-review-verify-part-2` and passed. Both CI legs on PR #536 pass at `fe1a92c1`. T17's sweep for `verdict-contract`, `AC Verification`, and `ac-verification` matches only allowed paths, and every source-to-seed twin diff shows only the curated differences.
  - Coverage: Correctness swept (`spec-scope-lint.ts` rulebook matchers and ledger headings, the empty `OVER_CAP_ALLOWLIST`, the two renamed test fixtures: all correct). Regressions swept (new ledger headings paired with `spec-scope-lint.test.ts:392`, the `stack/` exclusion with `:223`, the full suite green). Security n/a: the only executable change is a path matcher and tests, with no trust boundary. Architecture swept (review-runtime, plan-chain-scripts, hook-runtime, skills-ecosystem, plan-authoring, audit-workflow, worktree-hygiene, ticket-workflows, closing-messages, lesson-promotion, spec-editing: two findings below; no new helper). Intent swept (grades below). Simpler paths swept (the review-loop removal and the skills' delegation to `REVIEW.md` delete text; no simpler shape found). Accessibility n/a: no UI. Docs swept (findings below). Contracts swept (ADR-0083 amends ADR-0068 for folder plans only; `roles.json` adds `prism-verify` and drops `prism-review-loop`; both consistent). Performance n/a: no render path, query, or bundle.
  - Criteria: AC-2 to AC-8 met (executed, `prism:check` at `fe1a92c1`). AC-9 met (executed: the QA-skill grep prints nothing, the contract file is absent, the intent-scope phrase matches once). AC-10 met (executed: no skill folder, an empty allowlist, and `git grep -l prism-review-loop` outside the allowed paths prints nothing). AC-11 met (inspected: History records verify 72, self-review 53, PR review 116, retro 115, audit 61, QA plan 28, onboard 56, and the loaded-lines test passes). AC-12 met (executed: `agents-md-budget.test.ts` passes, offset 31,739 recorded). AC-14 met (executed: `gh pr checks 536`, both legs pass). AC-15 met (executed: both AC-15 greps). Awaiting human: AC-1, AC-6's human half, AC-13.
  - Minor, standards violation: `.prism/rules/branch-plan.md:236` tells a reviewer to file a plan observation "per each reviewer skill's" Plan-file scope section, which this PR deleted from both `prism-self-review` and `prism-pr-review`. A reviewer following the always-on rule looks for a section that no longer exists, and the policy it names now conflicts with `REVIEW.md`'s whole-PR scope and the intent-scope pass's fix-in-place rule.
    - Class: a citation to a section that a removal in the same change deleted.
    - Sweep: `grep -rn "Plan-file scope" . --exclude-dir=node_modules --exclude-dir=plans --exclude-dir=retros --exclude-dir=audits` found the same sentence at `templates/install/.prism/rules/branch-plan.md:219` and in the generated copies (`AGENTS.md:669`, `.claude/`, `.codex/`, `.cursor/` rules). Section-name sweep for the other deleted headings found none.
    - Fix: point the sentence at `REVIEW.md`'s "The whole PR is in scope" part and the intent-scope pass's plan-drift part in both the rule and its seed twin, then rebuild.
    - Fixed in 2b45c8e7: the sentence now says the review covers the whole PR per `REVIEW.md` and the intent-scope pass fixes drift outside `## Tasks` in place, in the rule, its seed twin, and the generated copies.
  - Minor, standards violation: `.prism/rules/branch-plan.md:236` says "The plan stage runs this gate during plan close", but on a folder plan `prism-retro` now writes every Decision verdict and the lessons exits. A folder-plan session following the rule hands the verdict gate to a stage that no longer runs at close.
    - Class: a responsibility moved to a new owner while the prose still credits the old one.
    - Sweep: read the plan-section ownership and lesson routing docs. Also at `.prism/architect/_toolkit/plan-authoring.md:37` (the `## Decisions` row lists only the plan stage as writer, and its seed twin) and `.prism/architect/_toolkit/lesson-promotion.md:20` ("the routing decision is the plan stage's", while the retro now deletes promoted lessons).
    - Fix: name `prism-retro` as the folder-plan writer in all three. `lesson-promotion.md` is in no task's files, and per the workflow rule's scope-change part a doc the change makes false goes ahead as a Decisions entry.
    - Fixed in 2b45c8e7: `branch-plan.md`, `plan-authoring.md`, and `lesson-promotion.md` name `prism-retro` as the folder-plan writer and keep the plan stage for a flat plan. The lesson text quotes what the retro's lessons exits do.
  - Minor, standards violation: `.prism/rules/git-conventions.md:116` gates the main session's merge on "the review loop's final PR-review pass", naming the removed skill in the merge rule. `.ai-skills/config.schema.json:200` says the same, and `:353` still says the review loop reads `modelTiers.overrides`, which now contradicts `docs/parameterization.md` ("Nothing reads it today").
    - Class: prose naming a removed component without its token, so the removal's token grep misses it.
    - Sweep: `grep -rniE "review loop|review-loop|gauntlet" . --exclude-dir=node_modules --exclude-dir=plans --exclude-dir=retros --exclude-dir=audits --exclude-dir=adrs --exclude-dir=qa` found the three lines above, the git-conventions seed twin and generated copies, `AGENTS.md:1443`, and `CONTEXT.md:51` (left for child 9 by Decision). `.prism/lessons.md` and research notes are records.
    - Fix: say "the final PR review" in the rule, its twin, and the schema's merge description, and make the `modelTiers` description match the docs. `git-conventions.md` is in no task's files, so record it as a Decisions entry.
    - Fixed in 8c289b8c: `git-conventions.md`, its seed twin, `AGENTS.md`, and the schema's merge description say "the final PR-review pass" with the same conditions, and the `modelTiers` description says nothing reads it.
  - Minor, standards violation: `.prism/templates/retro-report.md:20` asks for "the six-row table from the skill's evidence step, plus the evidence-count line", and the rewritten `prism-retro` no longer defines either. The skill dropped the coverage columns (answer, sources, gap), keeping not-configured apart from unreachable in that table, and the epic-grain note that the final child's main-branch CI is approximated by its PR CI, which `.prism/rules/branch-plan.md:202` says the table names. Line 33 also says lesson candidates are appended once the user accepts, where the skill says never appended.
    - Class: a template and the skill that cites it describing one artifact differently.
    - Sweep: `grep -n "approximat\|evidence-count\|appended" .ai-skills/skills/prism-retro/shared.md .prism/templates/retro-report.md` found the sites above and none else.
    - Fix: put the coverage-table shape and the epic CI note into the template's Charter coverage placeholder, drop "evidence-count line", and align the lesson-candidates line with the skill.
    - Fixed in 7713f2a6: the epic grain's Charter coverage placeholder defines the table (charter question, answer, sources, gap) and the epic CI note, and the lesson-candidates line says never appended.
  - Minor, standards violation: `.prism/references/pr-review/github-writes.md:14` defines `confidence:high` as "Both checks ran clean", naming the Standards and Spec groups this PR removed, and `:17` defines `review:has-minors` without the skill's other state-2 case, a pass left unfinished. An Eric reading the label table alone can apply `confidence:high` over an unfinished pass, and that label opens the merge gate.
    - Class: a reference's definitions left behind when the skill's states changed.
    - Sweep: read the whole label table against the skill's three states. The seed twin carries the same two rows.
    - Fix: `confidence:high` becomes "every pass swept or n/a and nothing open", and `review:has-minors` adds "or a pass is unfinished".
    - Fixed in 32a1c797: `confidence:high` reads every pass `swept` or `n/a` with no judgment call or bookkeeping-only Minor, and `review:has-minors` adds a pass left unfinished.
  - nit: `.ai-skills/skills/prism-audit/shared.md:34` and `.prism/architect/_toolkit/audit-workflow.md:63` let a folder count as closed by `stage` or `status: closed`, which carries no date, while the 90-day rule needs a close date. Name the fallback, such as the commit that set the status.
    - Fixed in 642e6c8c: a folder counts as closed only with a dated `> Closed: YYYY-MM-DD` line, and a `closed` stage or status without one is not yet eligible.
  - Cleanup: none. No debug output or stray files.
  - Out of scope: the PR body says this part's record lines carry no marker, while this line carries `(part 2 of 2)`. Both read as final.
- self-review round 2 at c92b0558 (part 2 of 2): clean
  - Range `ba6b8839..c92b0558`. All five Minors and the nit from round 1 are closed, each checked against its source: `prism-retro`'s evidence and lessons-exits steps, `prism-pr-review`'s three states, `intent-scope.md`'s fix-in-place part, and `check-report.mjs`'s `parseTableRow`. A tree grep finds no remaining "review loop" in the rules, architect docs, references, schema, or `REVIEW.md`, and no script reads `modelTiers`.
  - Checks: `pnpm prism:check` exits 0, and `spec-scope-lint` with `GITHUB_HEAD_REF` set to this branch passes.
  - Observation, no finding: the new verdict-gate sentence in `branch-plan.md` and its seed twin names `pnpm prism:retro-line`, a maintainer-only command. The same rule already named it before this range, in its retro-gate paragraph, so the repair adds no new class. That class is tracked in GitHub issue #444.
- pr-review round 1 at 2fe309fb (part 2 of 2): 0 critical, 0 major, 4 minor, 1 nit
  - Range: the full PR, `2cbd8716..2fe309fb`, read at the head in a detached checkout. Both CI legs, ubuntu and windows, pass at `2fe309fb`. Tests were not rerun locally. Posted on PR #536 as six inline comments and the summary comment. No prior threads existed, `reconcile.mjs 536 --json` exits 0 clean, and the labels are `effort:deep` and `review:has-minors`.
  - Criteria: AC-2 to AC-8 met (executed, CI `prism:check`). AC-9 met (executed: no `AC Verification` match in `prism-qa-plan`, `verdict-contract.md` absent, the intent-scope phrase present). AC-10 met (executed: no skill folder, an empty allowlist, and `prism-review-loop` matching only `CONTEXT.md` outside the allowed records). AC-11 met (inspected: the History totals and a green loaded-lines test in CI). AC-12 met (executed, CI). AC-14 met (executed: `gh pr checks 536`). AC-15 met (executed: both greps). Awaiting human: AC-1 and AC-13.
  - Minor, standards violation: `templates/install/.prism/rules/branch-plan.md:219` tells consumers that `pnpm prism:retro-line` fails a folder plan, though consumers get no such check and can't run it. T22 keeps that clause out of the curated twin, and so does the Decision that the retro-line check stays PRISM's own lint.
    - Class: a toolkit-only command named in a consumer-shipped copy of a rule.
    - Sweep: `grep -rn 'retro-line' templates/install/` found this line and `review-runtime.md`, which correctly says the check is not delivered.
    - Fix: end the twin's sentence at "is no reviewer finding either", and keep the clause in the source rule.
    - Fixed in e83487ef: the twin's sentence ends at "is no reviewer finding either", and the source rule keeps the `pnpm prism:retro-line` clause.
  - Minor, standards violation: `.prism/rules/branch-plan.md:236` gives folder-plan Decision verdicts to `prism-retro` after the final PR review, and in the same sentence lets the review's intent-scope pass write a missing verdict in place. A reviewer writes verdicts before the retro reads the record, which skips its refuted-Decision check.
    - Class: a responsibility moved to a new owner while a sibling rule still hands it to the old one.
    - Sweep: `grep -n 'missing its verdict' .prism/review/intent-scope.md .prism/rules/branch-plan.md templates/install/.prism/rules/branch-plan.md` found `.prism/review/intent-scope.md:40`, the twin at line 219, and the generated copies.
    - Fix: say a folder plan's Decisions carry no verdict until the retro, so a missing one before then is not drift, and keep fix-in-place for a flat plan. Narrowing `intent-scope.md` needs a Decisions entry. This review added no verdicts here for that reason.
    - Fixed in e83487ef and dda1ddc4: the rule and its twin say the review writes no Decision verdict and reports none missing, and `intent-scope.md` drops the missing-verdict case and says the close writes verdicts. Flat plans take the same rule, per the Decision that the review never writes a verdict sub-bullet, which replaces the suggested flat-plan fix-in-place.
  - Minor, bug: `.ai-skills/skills/prism-retro/shared.md:29`. No stage writes `> Closed: YYYY-MM-DD` on a folder plan, and fix 642e6c8c made the audit treat a folder as closed only with that dated line (`prism-audit/shared.md:34`, `audit-workflow.md:63`). So no folder plan ever becomes archive-ready. The same fix contradicts T16's "or a `stage`/`status` of `closed`" clause, and no Decision records it.
    - Class: a reader keyed on a marker that no writer in the flow produces.
    - Sweep: `grep -rn -e '> Closed' -e 'Closed:' .ai-skills/skills .prism/rules/workflow.md .prism/templates/plan.md .prism/templates/intent.md .prism/templates/spec.md` found only the audit's reader.
    - Fix: duty 4 also writes `> Closed: <date>` under the title on a folder plan, and a Decision records that a folder closes on that dated line, superseding T16's clause.
    - Fixed in edf79004 and e83487ef: duty 4 writes `> Closed: <today>` directly after the frontmatter of `plan.md`, or of the epic's `spec.md` at full grain, and the rule and its twin name the line. The Decision that a folder plan closes on that dated line records it.
  - Minor, bug: `.ai-skills/skills/prism-pr-review/shared.md:34` names the misses-log `comment` key without its value. `reconcile.mjs:260-262` treats a comment as logged only when `comment` equals its `html_url`, so any other value leaves reconcile unclean on every rerun and duplicates rows.
    - Class: a log row's key named without the value its reader matches on.
    - Sweep: `grep -n 'comment' .ai-skills/skills/prism-pr-review/shared.md .prism/references/pr-review/github-writes.md` found no other definition.
    - Fix: add that `comment` is the human comment's `html_url`.
    - Fixed in a773f2f7: the misses-log bullet says `comment` is the human comment's `html_url`, the value reconcile matches to mark it logged.
  - nit: `.prism/rules/branch-plan.md:200` says PRISM cannot force a retro, two lines after the folder-plan sentence that says it does. Scope it to a flat plan, here and in the twin at line 183.
    - Fixed in e83487ef: the rule and its twin scope the sentence, and the epic-grain retro sentence above it, to a flat plan.
  - Minor, bookkeeping-only, not gated: `## Verification` records head `87a06c44`, and the eight fix commits after it touch the schema, rules, templates, and `REVIEW.md`, with no verify re-run before the push. Both CI legs passing at `2fe309fb` cover the substance. Re-dispatch `prism-verify` with the next fix push.
    - Fixed in 80dabcae: `## Verification` records head `ffe0e9ae`, and the only later commit is plan-only.
  - Still open, a decision item: removing `prism-review-loop` left `modelTiers.overrides` with no reader (`docs/parameterization.md:163`), so a team's `eric` pin for cross-model review silently does nothing. Recommendation: a follow-up PR that has the shipping flow's `prism-pr-review` dispatch honor it.
    - Fixed in 3a022928 and a0a5fedc: the dispatch honors `modelTiers.overrides.eric` in this PR, and the schema and `docs/parameterization.md` name it as the reader. The Decision on the pin replaces the follow-up recommendation.
  - Out of scope: `docs/workflow.md` lines 43 and 87, and `CONTEXT.md` line 51, which the plan leaves to child 9.
- pr-review round 2 at 80dabcae (part 2 of 2): 0 critical, 0 major, 3 minor, 0 nit
  - Range: `863d83f0..80dabcae`, which holds six `T<n> fix:` commits and three `plan:` commits, read in a detached checkout at the head. Verify at `ffe0e9ae` passes with 2349 tests and 0 failing. CI ubuntu passes at `80dabcae`, and windows was pending at review time.
  - Round 1 confirmed closed: all four Minors, the nit, the pin decision item, and the bookkeeping Minor, each at the sha its entry names. The six threads on PR #536 are resolved, each with a reply naming the fix.
  - Coverage: Docs and citations is not reached, because the full-PR re-sweep was not re-run. The range's citations and every prose home of the three predicates it changed were swept. Round 3 owes the full-range sweep. Every other pass is swept or n/a.
  - Minor, standards violation: `.prism/rules/workflow.md:59`, and line 16 too. The `modelTiers.overrides.eric` pin is honored only at `shipping-flow.md:58`. The resume row and the re-dispatch after a fix push both send `prism-pr-review` out on the default model with no note.
    - Class: a dispatch rule stated at one of several sites that dispatch the same agent.
    - Sweep: `git grep -n "dispatch.*prism-pr-review\|prism-pr-review.*subagent" -- .ai-skills .prism/rules .prism/references .prism/architect docs REVIEW.md` found `shipping-flow.md:58`, `workflow.md:16`, and `workflow.md:59`.
    - Fix: send both workflow sites through `shipping-flow.md`, or name the pin in the rule. Then widen `docs/parameterization.md:163` and the schema description to every `prism-pr-review` dispatch.
    - Fixed in 27da79e9 and 65d30fe5: the re-dispatch sentence and the resume row in `workflow.md` send `prism-pr-review` through `shipping-flow.md`, and `docs/parameterization.md` and the schema say every `prism-pr-review` dispatch reads the pin. The `AGENTS.md` lead sections end at byte 31,737.
  - Minor, bug: `.ai-skills/skills/prism-retro/shared.md:30`. The `retro:` commit names `<plan.md>` only, but at full grain duty 4 writes `> Closed:` and `## Retro` into the epic's `spec.md`, and an epic folder has no `plan.md`.
    - Class: a commit path list that omits a file the same step writes.
    - Sweep: `grep -n "spec.md" .ai-skills/skills/prism-retro/shared.md` found lines 13 and 29. Line 30 names no `spec.md`.
    - Fix: change `<plan.md>` to `<plan.md, or the epic's spec.md at full grain>`.
    - Fixed in 7b67f939: the `retro:` commit's path list names `<plan.md, or the epic's spec.md at full grain>`.
  - Minor, standards violation: `docs/ai-skills/iris.md:15`. The retro's folder-plan writes are listed without `> Closed:` there and at `iris.md:38`, `docs/personas.md:230`, and `.prism/architect/_toolkit/skills-ecosystem.md:72`. The section-ownership table in `.prism/architect/_toolkit/plan-authoring.md` has no row for the line either.
    - Class: a writer duty that changed while the prose lists of that writer's output did not.
    - Sweep: `grep -rn "Retro:\` line\|lessons exits" docs .prism/architect` found the four sites above.
    - Fix: add the `> Closed:` line to each list, and add a table row naming `prism-retro` for folder plans.
    - Fixed in 65d30fe5, 50f8014a, and bc00532f: `iris.md` (both lists), `personas.md`, and `skills-ecosystem.md` with its curated twin name the `> Closed:` line, and the ownership table has a `> Closed:` row owned by `prism-retro` for folder plans.
  - Labels: `effort:deep` and `review:has-minors`. The summary comment is updated in place, and the PR stays in draft. Reconcile `--no-write --json` reports clean.
  - Out of scope: the plan rule's Before Closing step 2 says to put `> Closed:` under the plan's title. A folder `plan.md` has no title, and the retro writes the line after the frontmatter, which the audit still reads.
- pr-review round 3 at 848a5a0d (part 2 of 2): 0 critical, 0 major, 3 minor, 5 nit
  - Range: `80dabcae..848a5a0d` for every pass, and the full PR `2cbd8716..848a5a0d` for Docs and citations and Regressions. Read in a detached checkout at the head. Both CI legs pass at `848a5a0d`, and verify at `203f6845` passes, with only a plan commit after it.
  - Round 2 confirmed closed: the `eric` pin at both `workflow.md` dispatch sites (27da79e9, 65d30fe5), the epic `spec.md` in the retro commit (7b67f939), and the `> Closed:` line in each list of retro writes (65d30fe5, 50f8014a, bc00532f, dc79d10c, 5b0a39fd). The three threads are resolved, each with a reply.
  - Coverage: every pass is swept or n/a. Docs and citations ran over the full PR, which round 2 owed.
  - Minor, standards violation: `.prism/spec/adrs/_toolkit/README.md:137`. The ADR-0083 index row lists the retro's writes without the `> Closed:` line, which the ADR now names.
    - Class: a writer duty that changed while a prose list of that writer's output did not.
    - Sweep: `git grep -n "lessons exits"` over the tree. This row is the only site that lacks the line.
    - Fix: add the `> Closed:` line to the row.
    - Fixed in df84983b: the ADR-0083 index row names the `> Closed:` line. A sweep of `lessons exits` found no other list of the retro's writes without it, outside the approved task text of T18 and T22.
  - Minor, standards violation: `docs/ai-skills/iris.md:15`, also `iris.md:30` and `docs/personas.md:230`. The retro's review-miss class duty and the report template's lessons-exits and review-miss sections are missing from the Iris docs.
    - Class: a feature doc left behind when the skill gained duties.
    - Sweep: `git grep -n -i "review-miss" docs/` found nothing in either file.
    - Fix: name the review-miss proposals at line 15 and in the personas row, and add both sections to step 5.
    - Fixed in 04de614b: `iris.md` and `personas.md` say Iris proposes a fix for each open review-miss class, and `iris.md` step 5 names the report's `## Lessons exits` and `## Review-miss classes` sections as folder-plan sections.
  - Minor, standards violation: `README.md:11` still calls Reese an "AC verifier", which T17 removed. No Decision defers README to child 9.
    - Class: a removed role still named in a doc outside the diff.
    - Sweep: `git grep -n -i "AC verifi"` over README, `docs/`, the rules, architect docs, skills, and `AGENTS.md` found only this line.
    - Fix: "QA planner (Reese)".
    - Fixed in 04de614b: `README.md` calls Reese a QA planner. The file sits in no task, so the Decision on files outside the task lists names it.
  - nit: `.ai-skills/skills/prism-pr-review/shared.md:41` says the reconcile gate reads `prism-pr: <n>`. No reader exists yet, and T15 names child 8's gate.
    - Fixed in f9533206: the line says a later reconcile gate will read `prism-pr: <n>`.
  - nit: `.ai-skills/skills/prism-pr-review/shared.md:12` cites "Record", and the heading is "Threads, misses, record".
    - Fixed in f9533206: the citation names Threads, misses, record.
  - nit: `.ai-skills/skills/prism-self-review/shared.md:39` says "only writes", which holds on a folder plan only. Line 28 lists the flat-plan writes.
    - Fixed in 83f53317: the sentence says that on a folder plan the only writes are the record line and the in-place drift fixes, and that a flat plan adds its review entries and checklist state.
  - nit: `docs/what-prism-writes.md:82` gives the stack-file predicate as a rule per pass. It misses the language and `commands` gate on `correctness.md`.
    - Fixed in 04de614b: the row gives each stack file its gate, with `correctness.md` needing a detected language and `commands.typecheck` or `commands.test`.
  - nit: `.prism/templates/retro-report.md` lines 38, 41, 72, and 75 hold lessons exits and review-miss classes with no folder-plan-only marker.
    - Fixed in bc05f236: both grains mark the lessons-exits and review-miss sections folder-plan only, so omit them on a flat plan.
  - Still open, a judgment call:
    - The pr-review skill (line 27) and its writes reference give a structural `not reached` state 3.
    - The exit rule and clean definition in `REVIEW.md` still count every `not reached` as unfinished, and that wording dates from stack A.
    - Recommendation: a follow-up PR that exempts the structural case in `REVIEW.md`.
  - Labels: `effort:deep` and `review:has-minors`. The summary comment is updated in place, and the PR stays in draft.
  - Out of scope:
    - The ADR links at `.prism/architect/_toolkit/skills-ecosystem.md` lines 70 and 76 resolve to a missing path, which predates this PR.
    - ADR-0080 still says the cap fits in 120 lines, with no amendment note.

### PR review: the retro-line check fails a stacked ticket at its first PR's final review

- **Severity:** `major`
- **Status:** `fixed c81a746a`
- **Fixed in:** `c81a746a` makes `plan-retro-line.ts` skip a last PR-review line marked `(part <k> of <m>)` with `<k>` below `<m>`, with three new tests, `1e99ca3e` adds the marker to `REVIEW.md`'s record lines, and `4dc0ab84` documents it in `review-runtime.md`. The Decisions entry on stacked tickets records the rule.
- **File:** `scripts/ai-skills/plan-retro-line.ts:44`
- **Problem:** One folder plan serves every PR in its stack, so the first `clean` or `confirm` PR-review line on #535 makes `findEmptyRetroLines` fail this plan while stack B is still unreviewed. `prism:check` then goes red on #535 and on `main`, and so does the live-tree test at `plan-retro-line.test.ts:145`. The Decisions "Stack: two PRs, cut after T12" and "PR-review verdict means the final one" don't account for each other. Class: a completion check keyed on a per-PR event over a per-ticket record. Sweep: `git grep -n 'pr-review' 95089dcc -- scripts .prism/review REVIEW.md`. This lint is the only code reader today, and T21's resume row will need the same fix.
- **Suggested fix:** make the retro due only when the review of the PR that lands the last task is final. Either also require every task done using `tasks.mjs`'s done set, or carry the PR number in the record line. This changes T5 and a Decision, so `prism-architect` should rule first.

### PR review: the marker test never reads the shipped REVIEW.md

- **Severity:** `minor`
- **Status:** `fixed ad1fb936`
- **Fixed in:** `ad1fb936` reads the shipped root `REVIEW.md` and asserts its first line starts with `REVIEW_MD_MARKER_PREFIX`.
- **File:** `scripts/ai-skills/review-md-delivery.test.ts:118`
- **Problem:** The prefix is asserted against the test's own `SEED_CONTENT` literal, so a root `REVIEW.md` that loses its marker line passes every test and ships unowned to every consumer. Class: a guard test that reads a fixture instead of the artifact it guards. Sweep: `git grep -n -E 'REVIEW_MD_MARKER_PREFIX|prism:review' 95089dcc -- 'scripts/ai-skills/*.test.ts'`. The doctor and eject tests also use literals.
- **Suggested fix:** assert `startsWith(REVIEW_MD_MARKER_PREFIX)` on the real root `REVIEW.md`.

### PR review: the crossref lint never reads REVIEW.md

- **Severity:** `minor`
- **Status:** `fixed ad602c2e`
- **Fixed in:** `ad602c2e` adds both paths to the repo-root scan entry, which already resolved its loose files against the repo root, and a config test. A broken backticked citation added to `REVIEW.md` failed the lint before it was reverted.
- **File:** `scripts/ai-skills/crossref-lint.ts:123`
- **Problem:** Root `REVIEW.md` and `templates/install/REVIEW.md` are missing from the repo-root `looseFiles`, so a later rename of a path the rulebook cites ships broken with `prism:check` green, and T8's crossref proof checks nothing about the rulebook. Every citation resolves today. Class: a new shipped carrier file left out of the lint's scan list. Sweep: read `CROSSREF_SCAN_ROOTS` at `95089dcc`.
- **Suggested fix:** add both paths to the third scan root's `looseFiles`.

### PR review: a marked REVIEW.md gets a backup on every rulebook refresh

- **Severity:** `minor` (design call for Hunter, since T10 prescribes the backup)
- **Status:** `fixed ad1fb936`
- **Fixed in:** `ad1fb936` drops the backup in `syncReviewMd` and reports a plain replacement, with a test that no `REVIEW.md.bak` exists, and `4dc0ab84` updates `review-runtime.md`.
- **File:** `scripts/ai-skills/update.ts:1803`
- **Problem:** With no hash, `syncReviewMd` can't tell a team's edit from an older PRISM copy. So every release that changes the rulebook leaves `REVIEW.md.bak`, then `.bak.1`, untracked in the consumer's root. The hook runtime overwrites its marked files in place instead. Class: an ownership marker that still triggers a divergence backup. Sweep: `git grep -n 'backupConsumerFile(' 95089dcc -- scripts/ai-skills/update.ts`. Every other call is gated on a hash or a marker.
- **Suggested fix:** overwrite a marked file in place, as `deliverHookRuntimeFile` does. The recommendation is this one over adding a sync-manifest hash.

### runDoctor's JSDoc now documents checkReviewMd

- **Severity:** `minor`
- **Status:** `fixed 7f4ffd8c`
- **Fixed in:** `7f4ffd8c` moved `checkReviewMd` and its JSDoc above `runDoctor`'s block.
- **File:** `scripts/ai-skills/doctor.ts:1529`
- **Problem:** `checkReviewMd` and its JSDoc were inserted between `runDoctor`'s JSDoc block and `runDoctor`. The "Runs every health check" block now sits directly above `checkReviewMd`'s own block, and `runDoctor` has no doc comment at all. Class: a new declaration inserted between an existing JSDoc and the declaration it documents. Sweep: `grep -n -B2 '^/\*\*$' scripts/ai-skills/{doctor,update,eject,build}.ts` turned up no other stacked blocks among the new functions.
- **Suggested fix:** move `checkReviewMd` and its JSDoc above the "Runs every health check" block, for example next to `checkCodexDocLimit`.

### check-report counts a capitalized table header as a row

- **Severity:** `minor`
- **Status:** `fixed 13c2d3ee`
- **Fixed in:** `13c2d3ee` compares the header cell case-insensitively, adds a capitalized-header test, and trims the JSDoc's `base:` claim.
- **File:** `scripts/ai-skills/hooks/verify/check-report.mjs:233`
- **Problem:** `parseTableRow` skips a header only when its first cell is exactly `check`. A `| Check | Result | Evidence |` header therefore becomes a row, and `checkReport` reports `unknown result for Check: Result`. Thrive never validated results, so this hazard is new. Neither `REVIEW.md` nor `review-runtime.md` names the header the verify stage must write, so the T13 author has nothing that steers them away from the failing spelling. Class: a parser that accepts a narrower input than the documented shape. Sweep: `grep -n '"check"' scripts/ai-skills/hooks/verify/check-report.mjs` shows this as the only header check.
- **Suggested fix:** compare the first cell case-insensitively, or skip the line just above the separator row. Add a test with a capitalized header.

### watch-ci's header says it defends against an early green that the default does not cover

- **Severity:** `minor`
- **Status:** `fixed 24e3ab8c`
- **Fixed in:** `24e3ab8c` reworded the watch-ci header, `plan-chain-scripts.md`, and the `ci.requiredCheck` schema text, and left the behavior and tests alone as a doc-only fix.
- **File:** `scripts/ai-skills/hooks/plan/watch-ci.mjs:19`
- **Problem:** The header explains that a slow build can register after quicker checks and give an early green, and says the script avoids that by waiting for the required check. With no `--required` flag and no `ci.requiredCheck`, which is the default, a check that registers after the others settle is missed, and the watcher can exit 0 before the build runs. `plan-chain-scripts.md`'s "waits for every check on the head to settle" also reads as stronger than the code. Class: a guarantee stated for one configuration that the default configuration lacks. Sweep: `grep -rn 'every check' .prism/architect/_toolkit/ .ai-skills/config.schema.json` found this claim in `plan-chain-scripts.md` and in the schema description.
- **Suggested fix:** say in the header, the doc line, and the schema description that the race is closed only when a required check is named. Add a test showing a late-registered check is missed with no required check.

### The correctness stack check cannot fire on a first onboarding

- **Severity:** `minor`
- **Status:** `fixed 5df833ec`
- **Fixed in:** `5df833ec` states in `rule-generation.md` that a person sets `commands.*` by hand and that the next onboarding run writes the file with no `--force`, and leaves the generator's gating as it is.
- **File:** `scripts/ai-skills/lib/rule-generators/review-stack.ts:100`
- **Problem:** `buildCorrectnessFile` reads `commands.typecheck` and `commands.test` from `.ai-skills/config.json` on disk. Onboarding runs the generators before `writeOnboardingConfig`, and neither `prism init` nor `writeOnboardingConfig` writes `commands`. So a normal first onboarding never produces `.prism/review/stack/correctness.md`. `rule-generation.md` says "a later run after they are set writes it", but the only later path is a forced regeneration. Class: a generator gated on state that a later step writes. Sweep: `grep -n 'commands' scripts/ai-skills/lib/onboarding-config.ts scripts/ai-skills/init.ts scripts/ai-skills/lib/onboarding-types.ts` found no writer.
- **Suggested fix:** derive the evidence commands from the detected stack, run `review-stack` after the config write, or state in the onboarding skill that the correctness file needs a `--force` run once `commands` is set.

### A thrive developer's login survives in the reconcile fixtures

- **Severity:** `minor`
- **Status:** `fixed 4c60d90c`
- **Fixed in:** `4c60d90c` swapped the login for `author-1` in the test and the fixtures.
- **File:** `scripts/ai-skills/review-reconcile.test.ts:199`
- **Problem:** The PR-author login `lucas` comes from thrive's fixtures. The plan's literal swaps replaced thrive's other people (`hunter` and `priya`), and this one was missed. It is still at test lines 199, 273, 284, and 310, and 16 times in `review-reconcile.fixtures.json` in `user.login` and `head.ref`. Class: a third-party identifier left behind after a port's literal swap. Sweep: `grep -n lucas scripts/ai-skills/review-reconcile.*`.
- **Suggested fix:** swap it for a neutral login such as `author-1` in the test and the fixtures.

### AC-11's History record lacks prism-onboard's measured total

- **Severity:** `minor` (bookkeeping only, does not gate)
- **Status:** `fixed d9cfb7c6`
- **Fixed in:** this plan commit adds the 56-line `prism-onboard` total to T11's History line.
- **File:** `.prism/plans/prism-530/plan.md:1083`
- **Problem:** AC-11's evidence asks `## History` to record the measured total for `prism-onboard`, and the T11 History line does not. `measureSkillLoad` gives 56 lines at `6d16a76f`.
- **Suggested fix:** add the 56-line total to the next plan commit.

### Nits

- `scripts/ai-skills/hooks/verify/check-report.mjs:9`: the JSDoc says the section opens with `base:` and `head:` lines, but only `head:` is checked. Drop `base:` from the sentence, or check it.
- `scripts/ai-skills/hooks/verify/check-report.mjs:228`: a two-cell row such as `| lint | pass |` is accepted, so the documented evidence column is never enforced. Thrive dropped rows with fewer than 3 cells.
  - Fixed in 79abb962: `parseTableRow` now drops a row with fewer than three cells, as thrive's does, and two tests cover a two-cell fail row and a section of only two-cell rows.
- `scripts/ai-skills/hooks/plan/watch-ci.mjs:205`: `readOption` takes the next token blindly. A trailing `--required` quietly falls back to config, and `--required --timeout-min 5` waits on a check named `--timeout-min`. Thrive has the same behavior.
  - Declined 2026-11-19 by the main session: T2 ports thrive's watcher, and its argument parsing matches thrive's. Changing it would be a behavior change the port doesn't call for.
- `scripts/ai-skills/doctor.ts:1558` warns on every run about an unmarked `REVIEW.md`, though deleting the marker line is the documented opt-out. `info` fits better.
  - Fixed in ad1fb936: doctor reports it as info, and `4dc0ab84` updates `review-runtime.md` to match.
- `REVIEW.md:27` maps from "review-changes output", a skill PRISM doesn't ship and nothing else names.
  - Fixed in 1e99ca3e: the paragraph is deleted from `REVIEW.md` and its seed twin.
- `.prism/review/intent-scope.md:48` cites the branch-plan heading without its number. The heading is `3. Preserve Intentional Logic`.
  - Fixed in 878b37e5: the citation now carries the number, and the generated copies follow.
- PR review, cleaner path, not taken in this PR: `scripts/ai-skills/lib/rule-generators/review-stack.ts:123` writes one correctness bullet per detected language, and every bullet repeats the same `commands.*` evidence. One bullet naming the commands would say the same in a line.

## Acceptance Criteria

The issue's proof ("both reviews print one coverage line per pass; a plan with an empty `Retro:` line fails the check"), expanded into checkable criteria.

- [ ] **AC-1** Both reviews print one coverage line with an entry for each of the ten passes.
  - Evidence (human): on a scratch folder-plan branch with a one-file code change, `prism-self-review`'s chat report and `prism-pr-review`'s summary comment `### Pass coverage` each hold ten entries. Each entry reads `swept — <enumeration>`, `n/a: <reason>`, or `not reached: <reason>`. Record both outputs' coverage lines in `## History` · UNMET looks like: fewer than ten entries, a bare `swept`, or one review with no coverage line.
- [ ] **AC-2** A folder plan whose final PR-review verdict is recorded (a `clean` round, or the confirm pass past the cap) but whose `Retro:` line is empty fails `pnpm prism:check`. A non-clean round alone does not fail it, and the same plan with a filled `Retro:` line passes.
  - Evidence (machine): `plan-retro-line.test.ts` passes its clean-round-fails, filled-passes, non-clean-round-passes, confirm-fails, no-verdict-passes, and self-review-only cases. `pnpm prism:retro-line` exits 0 on the tree, and `prism:check` in `package.json` runs it · UNMET looks like: the clean or confirm case passing, the non-clean case failing, or the step missing from `prism:check`.
- [ ] **AC-3** Reconcile tells agent comments from human ones by the `<!-- prism-agent -->` marker, resolves addressed agent threads, corrects the review labels, and reports an unlogged human comment as unclean.
  - Evidence (machine): `review-reconcile.test.ts` passes its `forged-marker`, `same-login-human`, `own-addressed`, `labels`, and thrive-marker-is-human cases. A human comment absent from the log yields exit 1 · UNMET looks like: a thrive-marked or unmarked comment counted as agent, or exit 0 with an unlogged human comment.
- [ ] **AC-4** A review-miss class with three rows is reported as open, one with two rows is not, and a resolve row closes it.
  - Evidence (machine): `review-reconcile.test.ts`'s `classes` cases pass, and `--classes` with no log file prints "No open class has 3 or more rows." · UNMET looks like: a two-row class listed, or a resolved class still listed.
- [ ] **AC-5** The CI watcher exits 0 on green, 1 on a failed check, and 8 on timeout, and waits for the configured required check when one is set.
  - Evidence (machine): `plan-watch-ci.test.ts` passes the ported exit-code cases, the no-required-check waiting cases, and the `ci.requiredCheck` config case · UNMET looks like: a settle with a check still pending, or the config key ignored.
- [ ] **AC-6** The verify stage writes a row for every check it considered, `n/a` rows included, and the report check rejects a section whose failure lines and rows disagree.
  - Evidence (machine): `verify-check-report.test.ts` passes `fail-without-line`, `line-without-row`, and the `skipped`-result rejection.
  - Evidence (human): a `prism-verify` run on the scratch branch writes one row per non-empty `commands.*` key plus `n/a: not configured` for `format`, and `check-report.mjs` exits 0 on it · UNMET looks like: a configured check with no row, or a disagreeing section accepted.
- [ ] **AC-7** A consumer update delivers `REVIEW.md`, the pass files, and the review and verify scripts, leaves a `REVIEW.md` it did not write untouched, and adds the review-misses union-merge line to `.gitattributes` once.
  - Evidence (machine): `review-md-delivery.test.ts`, `review-area.test.ts`, `review-misses-attributes.test.ts`, and `plan-runtime-delivery.test.ts` pass, including the unmarked-file-byte-identical and second-update-no-op cases · UNMET looks like: an unmarked `REVIEW.md` changed, or a duplicated attributes line.
- [ ] **AC-8** Onboarding writes stack-check files for the review passes and leaves an existing one alone.
  - Evidence (machine): `review-stack-generator.test.ts` passes, and `atlas-dogfood.test.ts` stays green · UNMET looks like: an existing stack file rewritten.
- [ ] **AC-9** `prism-qa-plan` no longer grades acceptance criteria, and the review's intent-conformance pass does.
  - Evidence (machine): `git grep -n "AC Verification" .ai-skills/skills/prism-qa-plan` prints nothing, and `.prism/references/qa-plan/verdict-contract.md` does not exist. `.prism/review/intent-scope.md` contains "Grade every acceptance criterion" · UNMET looks like: any match in the QA skill, or the reference still present.
- [ ] **AC-10** `prism-review-loop` is gone, and its over-cap allowlist entry went with it.
  - Evidence (machine): no `.ai-skills/skills/prism-review-loop/` exists, `OVER_CAP_ALLOWLIST` has no `prism-review-loop` key, and `skill-loaded-lines.test.ts` passes. `git grep -l prism-review-loop` matches only the files T20 lists · UNMET looks like: a review-loop allowlist entry, or a live reference left.
- [ ] **AC-11** Every skill this child writes or rewrites fits the 120-line cap, or carries an allowlist entry with a one-line reason.
  - Evidence (machine): `skill-loaded-lines.test.ts` passes, and `## History` records the measured totals for `prism-verify`, `prism-self-review`, `prism-pr-review`, `prism-retro`, `prism-audit`, `prism-qa-plan`, and `prism-onboard` · UNMET looks like: a total over 120 with no allowlist entry and no reason.
- [ ] **AC-12** Every lead section of `AGENTS.md` still ends inside the first 32 KiB.
  - Evidence (machine): `agents-md-budget.test.ts` passes, and `## History` records the end offset after T21 · UNMET looks like: an offset past 32,768.
- [ ] **AC-13** `prism-audit` reads Decisions from folder plans and epic specs, archives a plan folder whole, and flags a promotion claim whose text is missing from the named file.
  - Evidence (human): on a scratch branch, add a folder plan whose Decision says `→ promoted to .prism/rules/code-comments.md` for a phrase that file lacks. Run Zoe in plans mode. The report lists `broken-promotion-claim-in-plan` for it and lists Decisions from `prism-499/spec.md` · UNMET looks like: the folder plan skipped, or the false claim passing.
- [ ] **AC-14** The whole check suite passes on both CI platforms.
  - Evidence (machine): the PR's `prism-check` CI is green on `ubuntu-latest` and `windows-latest` · UNMET looks like: either leg red.
- [ ] **AC-15** The intent, the skill-authoring rule, and the loaded-lines test comment describe the 120-line cap as soft with reasoned overages.
  - Evidence (machine): `git grep -n -i "soft cap" -- .prism/plans/prism-499/intent.md .prism/rules/skill-authoring.md scripts/ai-skills/skill-loaded-lines.test.ts` matches in all three, and `git grep -n -i "hard cap" -- .prism/rules .prism/architect .ai-skills scripts/ai-skills/skill-loaded-lines.test.ts` prints nothing · UNMET looks like: a file still calling the cap hard, or one of the three silent on overages.

### AC Adjustments

### AC Adjustment: AC-10, the allowlist need not end empty
- **Original:** `prism-review-loop` is gone, and the over-cap allowlist is empty.
- **Proposed:** `prism-review-loop` is gone, and its over-cap allowlist entry went with it.
- **Reason:** Hunter ruled the cap soft with reasoned overages, so the allowlist stays as the mechanism for them.
- **Status:** `accepted`, by Hunter's chat ruling on 2026-11-18.

### AC Adjustment: AC-11, a reasoned overage is allowed
- **Original:** Every skill this child writes or rewrites fits the 120-line cap.
- **Proposed:** Every skill this child writes or rewrites fits the 120-line cap, or carries an allowlist entry with a one-line reason.
- **Reason:** same ruling.
- **Status:** `accepted`, by Hunter's chat ruling on 2026-11-18.

### AC Adjustment: AC-15, added for the soft-cap wording task
- **Original:** none.
- **Proposed:** AC-15, which grades T25's wording changes.
- **Reason:** same ruling. T25 needs a criterion to be graded against.
- **Status:** `accepted`, by Hunter's chat ruling on 2026-11-18.

### AC Adjustment: AC-2, the retro is due at the final PR-review verdict
- **Original:** A folder plan whose PR review is recorded but whose `Retro:` line is empty fails `pnpm prism:check`, and the same plan with a filled `Retro:` line passes.
- **Proposed:** A folder plan whose final PR-review verdict is recorded (a `clean` round, or the confirm pass past the cap) but whose `Retro:` line is empty fails `pnpm prism:check`. A non-clean round alone does not fail it, and the same plan with a filled `Retro:` line passes. Evidence (machine): `plan-retro-line.test.ts` passes its clean-round-fails, filled-passes, non-clean-round-passes, confirm-fails, no-verdict-passes, and self-review-only cases. `pnpm prism:retro-line` exits 0 on the tree, and `prism:check` in `package.json` runs it · UNMET looks like: the clean or confirm case passing, the non-clean case failing, or the step missing from `prism:check`.
- **Reason:** with `watch-ci.mjs` fixing red CI after every push, counting a non-clean round as the verdict would fail CI on every review-fix push before the retro is due. The Decision on the final PR-review verdict has the detail.
- **Status:** `accepted`, by prism-architect at challenge round 4 (2026-11-18): not intent-level. It measures spec line 142's "PR review verdict" as the stage's final verdict, per intent line 150 and the Review section's stop gate.

### AC Sync Log

| Date | Agent | Action | Plan | Ticket |
| ---- | ----- | ------ | ---- | ------ |
| 2026-11-18 | Winston | Generated AC and wrote them, without IDs or Evidence, into issue #530 at creation | written | synced |
| 2026-11-18 | Winston | Adjusted AC-10 and AC-11 and added AC-15 for the soft cap, as adjustments Hunter's chat ruling approved | written | not synced |
| 2026-11-18 | main session | Synced the 15 AC, AC-1 to AC-15, to issue #530 | written | synced |
| 2026-11-18 | Winston | Proposed the AC-2 adjustment for the final PR-review verdict; not synced until Hunter accepts it | proposed | not synced |
| 2026-11-18 | Winston | Applied the AC-2 adjustment, accepted by prism-architect at challenge round 4 as not intent-level; the issue #530 sync was left to the main session, which made it in the next row | written | not synced |
| 2026-11-18 | main session | Synced the accepted AC-2 wording to issue #530's body, the tracker-facing sentence only, without the ID or Evidence line | written | synced |

## PR Readiness

Retro:
