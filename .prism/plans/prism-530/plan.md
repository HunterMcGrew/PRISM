---
title: Port review and verify, the rulebook, reconcile, and the fixed retro
ticket: https://github.com/HunterMcGrew/PRISM/issues/530
stage: plan
status: draft
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

- files: scripts/ai-skills/build.ts, scripts/ai-skills/path-guard.ts, scripts/ai-skills/ownership.ts, scripts/ai-skills/crossref-lint.ts, .ai-skills/definitions/seed-curation.json, package.json, scripts/ai-skills/review-area.test.ts
- proof: pnpm exec tsx --test scripts/ai-skills/review-area.test.ts && pnpm run prism:build && pnpm run prism:verify-pack
- proof fails on main: yes
- depends on: T5
- behavior change: a consumer update now copies `.prism/review/` from the seed and mirrors it into each host's platform directory, like `references`.

Owner: Clove. The spec puts one pass file per pass in `.prism/review/` and has onboarding add the consumer's stack checks. The pass files are PRISM-owned and refreshed on every update. Stack checks are the consumer's, so they get a folder update never writes: `.prism/review/stack/`.

- **`build.ts`.** Add `"review"` to `COPIED_CONTENT_AREAS`, after `"references"`.
- **`path-guard.ts`.** Add `"review"` to `PATH_GUARD_COPIED_AREAS`.
- **`ownership.ts`.**
  - Add `"review/**"` to `PRISM_OWNED_GLOBS`.
  - Add `"review/stack/**"` to `CONSUMER_OWNED_GLOBS`. Consumer claims are checked first, so a stack file classifies `consumer`.
- **`crossref-lint.ts`.** Add `"review"` to both `areas` arrays (lines 123 and 128 on `2aec908e`).
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
- **The final PR-review verdict.** One sentence: the PR review is final when its last line is `clean` or is the confirm line. Until then fixes and another round are coming, so the retro is not due.
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
  - Keep thrive's "Grade every acceptance criterion" checklist and its `## Plan drift is reconciled, not reported` part.
  - Fold in the verdict semantics from `.prism/references/qa-plan/verdict-contract.md`: met, unmet, or ungradeable, the evidence each needs, and that only a person grades a `human` Evidence line as met. T17 deletes that reference, so read it here first.
  - Grades are recorded with the review's record line under `## Review`, or under `## Review Issues` on a flat plan.

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
- proof: pnpm run prism:build && pnpm exec tsx --test scripts/ai-skills/routing-coverage.test.ts scripts/ai-skills/skill-loaded-lines.test.ts scripts/ai-skills/claude-agent-def.test.ts scripts/ai-skills/agents-md-budget.test.ts
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

**`skill-routing.md` and its curated twin.** `routing-coverage.test.ts` needs every `named-only` id named in the Utility skills section of both. In each, the dispatched-stages bullet changes from "`prism-spec` writes `spec.md` for an approved intent and is never routed off a phrase, and `prism-challenge` also runs the plan stage's challenge rounds." to "`prism-spec` writes `spec.md` for an approved intent, and `prism-verify` records the checks under `## Verification`. Neither is routed off a phrase, and `prism-challenge` also runs the plan stage's challenge rounds." After the build, measure the `AGENTS.md` lead-section end offset with `measureLeadSectionEnds` from `scripts/ai-skills/agents-md-block.ts` and record it in `## History`. It must be at most 31,744.

### T14: Rewrite prism-self-review to run REVIEW.md

- files: .ai-skills/skills/prism-self-review/frontmatter.yml, .ai-skills/skills/prism-self-review/shared.md, .claude/skills/prism-self-review/SKILL.md, .cursor/skills/prism-self-review/SKILL.md, .claude/agents/prism-self-review.md, .codex/agents/prism-self-review.toml
- proof: pnpm run prism:build && pnpm exec tsx --test scripts/ai-skills/skill-loaded-lines.test.ts scripts/ai-skills/routing-coverage.test.ts
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
  - read `intent.md` first on a folder plan
  - inventory the changed files
  - pick the passes whose triggers fire
  - dispatch one subagent per pass or pass group with a no-steer brief per `REVIEW.md`, at most the workflow rule's subagent cap
  - collect findings, then sweep and filter
- **Write the plan before the chat.**
  - On a folder plan, line 47's bullet keeps its `## Review` target, its `plan: self-review record` subject, and its "do not push", and its content becomes the `REVIEW.md` record line, `- self-review round <n> at <short sha>: <verdict>`, with each open finding under it in the finding shape `REVIEW.md` sets.
  - On a flat plan, findings go under `## Review Issues` as today.
- **Report.** The coverage line from `REVIEW.md`, one token per pass, then findings by severity.
- **Rounds.** Fix and re-run up to the 3-round cap, per `REVIEW.md`.
- **Guardrails.** Keep "never posts to GitHub" and the four pause triggers by reference to `REVIEW.md`.

Thrive's `.ai-spec/references/review/run.md` is not ported as a reference, because the cap would charge it. Its range pin and inventory steps are one bullet each in the body. Its `scripts/pre-review.sh`, `pnpm skills:check`, and frontend build steps are thrive's stack and are dropped.

Delete every mention of `prism-review-loop`, which is lines 13 and 27 on `2aec908e`.

### T15: Rewrite prism-pr-review with reconcile, the agent marker, and the misses log

- files: .ai-skills/skills/prism-pr-review/frontmatter.yml, .ai-skills/skills/prism-pr-review/shared.md, .prism/references/pr-review/github-writes.md, templates/install/.prism/references/pr-review/github-writes.md, .claude/references/pr-review/github-writes.md, .codex/references/pr-review/github-writes.md, .cursor/references/pr-review/github-writes.md, .claude/skills/prism-pr-review/SKILL.md, .cursor/skills/prism-pr-review/SKILL.md, .claude/agents/prism-pr-review.md, .codex/agents/prism-pr-review.toml
- proof: pnpm run prism:build && pnpm exec tsx --test scripts/ai-skills/skill-loaded-lines.test.ts scripts/ai-skills/routing-coverage.test.ts && pnpm run prism:crossref-lint
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
  - Commit the log with the plan record.
- **Record.**
  - **Folder plan.** When the session's own checkout is on the PR's branch and holds the plan folder, write `- pr-review round <n> at <short sha>: <verdict>` under `## Review` in that checkout's `plan.md`, or `- pr-review confirm at <short sha>: <verdict>` for the confirm pass past the cap, per `REVIEW.md`. Mark a confirmed fix `fixed <sha>`. This holds in both modes: a worktree-mode run still writes the record in the session's checkout, never in its `/tmp` worktree.
  - Commit with `node ${HOOK_RUNTIME_DIR}/plan/commit.mjs "plan: pr-review record" <plan.md> [.prism/metrics/review-misses.jsonl]` and do not push. The session pushes, per ADR-0082 and the routing rule's reviewer exception.
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
- proof: pnpm run prism:build && pnpm exec tsx --test scripts/ai-skills/skill-loaded-lines.test.ts && pnpm run prism:crossref-lint
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
- proof: pnpm run prism:build && pnpm exec tsx --test scripts/ai-skills/skill-loaded-lines.test.ts scripts/ai-skills/routing-coverage.test.ts && pnpm run prism:crossref-lint
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
- **Grading.** It takes the review's unmet criteria from `## Review` as given and grades the rest itself.
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
- **Commit.** `node ${HOOK_RUNTIME_DIR}/plan/commit.mjs "retro: <summary>" <plan.md> <report> [.prism/lessons.md] [.prism/archived/lessons-archive.md] [.prism/metrics/review-misses.jsonl] [<promotion targets>]`. The session pushes, per the workflow rule.
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
  - Rewrite the `prism-review-loop` fixture strings (lines 276, 279, 710, 716, 729, and 1022) to name `prism-self-review` where they stand in for a skill.
- **`followup-scope.md`** and its seed twin:
  - Line 70's list names `REVIEW.md` and `.prism/review/*.md` (not `stack/`) in place of `.prism/references/review-*.md`.
  - The bookkeeping set gains `## Review` and `## Verification`.
  - Line 82's AC-verification report sentence becomes "the Evidence sub-bullets the review grades under `## Review`".
  - The "Who runs this rule" bullet for `prism-review-loop` (line 100) is deleted.

### T20: Remove prism-review-loop

- files: .ai-skills/skills/prism-review-loop/frontmatter.yml, .ai-skills/skills/prism-review-loop/shared.md, .ai-skills/definitions/roles.json, .claude/skills/prism-review-loop/SKILL.md, .claude/skills/prism-review-loop/.ai-skill-generated, .cursor/skills/prism-review-loop/SKILL.md, .cursor/skills/prism-review-loop/.ai-skill-generated, .prism/rules/skill-routing.md, templates/install/.prism/rules/skill-routing.md, .claude/rules/skill-routing.md, .codex/rules/skill-routing.md, .cursor/rules/skill-routing.mdc, .prism/architect/_toolkit/skills-ecosystem.md, templates/install/.prism/architect/_toolkit/skills-ecosystem.md, .claude/architect/_toolkit/skills-ecosystem.md, .codex/architect/_toolkit/skills-ecosystem.md, .cursor/architect/_toolkit/skills-ecosystem.md, scripts/ai-skills/skill-loaded-lines.test.ts, scripts/ai-skills/lib/resolve-live-plan.test.ts, AGENTS.md
- proof: pnpm run prism:build && pnpm run prism:test && pnpm run prism:crossref-lint
- proof fails on main: yes
- depends on: T14, T15, T19

Owner: Clove. The intent deletes `prism-review-loop` once `REVIEW.md` and the review rounds inside the stages replace it, and T8, T14, and T15 land those. It runs before T13 and T21, because the 166-byte routing line it deletes pays for what they add to the lead rules. After the build, measure the `AGENTS.md` lead-section end offset with `measureLeadSectionEnds` and record it in `## History`.

- Delete the skill directory, its generated outputs, and its `roles.json` entry. It is a utility, so it has no agent files.
- **`skill-routing.md`** and its curated twin: delete its Utility skills line.
- **`skills-ecosystem.md`** and its curated twin: delete its sentence from the Utility skills paragraph.
- **`skill-loaded-lines.test.ts`.** Delete the `prism-review-loop` entry from `OVER_CAP_ALLOWLIST`, and only that entry. The allowlist and its ratchet stay, as the mechanism for reasoned overages. Any entry another task in this child added for a skill over 120 stays too. If the constant ends up empty and the test's type or loop rejects an empty object, keep it as `{}` with its type annotation and change nothing else. T25 rewrites the test's comment.
- **`resolve-live-plan.test.ts`.** Read lines 320, 347, 366, 390, and 512. Where the string stands in for a skill name, swap it for `prism-self-review`. Where it is quoted plan text whose content the test does not assert on, leave it and note that in `## History`.

Run `git grep -n prism-review-loop` after the build. Only plans, retros, audits, ADRs, `.prism/qa/`, `CHANGELOG.md`, `.prism/lessons.md`, `CONTEXT.md`, and `docs/` (T24's) may still match. `CONTEXT.md` sits outside the spec's Affected systems. Note it in `## History` for child 9.

### T21: Wire the review stages into the workflow rule and the PR stage

- files: .prism/rules/workflow.md, templates/install/.prism/rules/workflow.md, .claude/rules/workflow.md, .codex/rules/workflow.md, .cursor/rules/workflow.mdc, .prism/references/shipping-flow.md, templates/install/.prism/references/shipping-flow.md, .claude/references/shipping-flow.md, .codex/references/shipping-flow.md, .cursor/references/shipping-flow.md, AGENTS.md
- proof: pnpm run prism:build && pnpm exec tsx --test scripts/ai-skills/agents-md-budget.test.ts scripts/ai-skills/routing-coverage.test.ts && pnpm run prism:crossref-lint
- proof fails on main: yes
- depends on: T13, T14, T15, T18, T20
- behavior change: the resume table now routes verify to `prism-verify` and lets `prism-retro` write the `Retro:` line, and the PR stage watches CI.

Owner: Clove. Child 5 left the `watch-ci.mjs` and `REVIEW.md` sentences out of the workflow rule until this child existed. Each edit below replaces text on `2aec908e`, quoted so the change is exact.

**`workflow.md`, Advancing.** Three edits:

- Replace "Fix a red CI result and push again, at most 3 times, then put it on the PR like any open item." with "After every push, run `node ${HOOK_RUNTIME_DIR}/plan/watch-ci.mjs <pr>` in the background. On exit 1, fix the failure and push again, at most 3 times, then put it on the PR like any open item. Exit 8, a timeout, and exit 3, an unreadable PR, go on the PR the same way."
- Replace "A review pauses to ask the person on four things only: a file outside the plan, a new dependency, a change to a shared type or public API, and destructive git." with "A review pauses to ask the person only on the four pause triggers in `REVIEW.md`." `REVIEW.md` owns the list after T8, and the shorter sentence pays for the watch-ci one.
- After "After review fixes are pushed, re-dispatch `prism-pr-review` on the commits since its last review.", add "Past the 3-round cap that run is the one confirm pass, per `REVIEW.md`."

**`workflow.md`, Resume table.** Five rows change. Every other row stays.

| Row (folder state) | New next stage |
| --- | --- |
| standard, `## Verification` empty | verify: dispatch `prism-verify` |
| standard, `## Review` empty | review: run `prism-self-review` against `REVIEW.md` |
| standard, PR open with no final PR-review verdict under `## Review` | PR review: dispatch `prism-pr-review` as a subagent |
| standard, `Retro:` line empty under `## PR Readiness` | retro: run `prism-retro`, which writes the line and commits `retro: <summary>`, then push |
| epic, every child in `## Children` merged, no `## Retro` in `spec.md` | retro: run `prism-retro`, which appends `## Retro` to `spec.md` |

The PR-review row is the only one whose folder-state cell changes. The other four change only their next-stage cell. "Final" has the meaning T8 gives it in `REVIEW.md`: the last `pr-review` line is `clean`, or is the confirm line. Without it, a fresh session that found one non-clean round recorded would skip to the retro row while fixes were still owed.

**`shipping-flow.md`.** Three edits:

- Step 1, "Verify": replace "rerun the verification commands on the new head first" with "re-dispatch `prism-verify` on the new head first, per the After a fix part of `REVIEW.md`".
- After step 8, add step 9: "**Watch CI.** Start `node ${HOOK_RUNTIME_DIR}/plan/watch-ci.mjs <pr>` in the background, and read a failed job with `gh run view <run-id> --log-failed`."
- The Close part already dispatches `prism-pr-review` again after review fixes, so it stays as it is.

**Byte budget.** Measure the `AGENTS.md` lead-section end offset with `measureLeadSectionEnds` after the build, and record it and `workflow.md`'s byte size in `## History`. It must be at most 31,744. The net change in this task should be about zero or less: the watch-ci and confirm-pass sentences add bytes, and the shorter pause sentence and the shorter verify and retro rows give them back. If the offset still passes 31,744, cut `workflow.md` prose until it does not. Never cut a resume row or a cap. `agents-md-budget.test.ts` must pass.

### T22: Make the retro fixed for folder plans in the plan rule, template, and an ADR

- files: .prism/rules/branch-plan.md, templates/install/.prism/rules/branch-plan.md, .claude/rules/branch-plan.md, .codex/rules/branch-plan.md, .cursor/rules/branch-plan.mdc, .prism/templates/plan.md, templates/install/.prism/templates/plan.md, .claude/templates/plan.md, .codex/templates/plan.md, .cursor/templates/plan.md, .prism/architect/_toolkit/plan-authoring.md, templates/install/.prism/architect/_toolkit/plan-authoring.md, .claude/architect/_toolkit/plan-authoring.md, .codex/architect/_toolkit/plan-authoring.md, .cursor/architect/_toolkit/plan-authoring.md, .prism/spec/adrs/_toolkit/0083-retro-is-a-fixed-stage-on-folder-plans.md, .prism/spec/adrs/_toolkit/0068-retro-charter-and-two-grain-cadence.md, .prism/spec/adrs/_toolkit/README.md, templates/install/.prism/spec/adrs/_toolkit/README.md, .claude/spec/adrs/_toolkit/0083-retro-is-a-fixed-stage-on-folder-plans.md, .codex/spec/adrs/_toolkit/0083-retro-is-a-fixed-stage-on-folder-plans.md, .cursor/spec/adrs/_toolkit/0083-retro-is-a-fixed-stage-on-folder-plans.md, .claude/spec/adrs/_toolkit/0068-retro-charter-and-two-grain-cadence.md, .codex/spec/adrs/_toolkit/0068-retro-charter-and-two-grain-cadence.md, .cursor/spec/adrs/_toolkit/0068-retro-charter-and-two-grain-cadence.md, .claude/spec/adrs/_toolkit/README.md, .codex/spec/adrs/_toolkit/README.md, .cursor/spec/adrs/_toolkit/README.md, AGENTS.md
- proof: pnpm run prism:build && pnpm run prism:crossref-lint && pnpm run prism:spec-scope-lint && pnpm run prism:retro-line
- depends on: T5, T17, T18, T21

Owner: Clove.

- **`branch-plan.md`** and its curated twin. Under Before Closing:
  - The universal gate's "declinable" wording stays for flat plans.
  - Add that a folder plan runs the retro as the fixed last stage with no declined form. `prism-retro` writes the `Retro:` line, and `pnpm prism:retro-line` fails a folder plan whose PR review is recorded and whose `Retro:` line is empty.
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
- proof: grep -q -i "soft cap" .prism/plans/prism-499/intent.md && grep -q -i "soft cap" .prism/rules/skill-authoring.md && pnpm run prism:build && pnpm exec tsx --test scripts/ai-skills/skill-loaded-lines.test.ts && pnpm run prism:crossref-lint
- proof fails on main: yes
- depends on: T20, T23, T24
- behavior change: none to any skill or script. The cap's wording now says it is soft, and the check still enforces it.

Owner: Clove. This task edits `.prism/plans/prism-499/intent.md`, which is intent-level. Hunter's chat ruling of 2026-11-18 counts as his approval of the intent edit that records it. Name that ruling in the commit body, and do not edit the intent for anything else.

- **`.prism/plans/prism-499/intent.md`, two lines.** Find them by their text, since line numbers drift (65 and 140 on `2aec908e`).
  - The Phase-1 skills line becomes: "The 120-line build check keeps passing. It is a soft cap: a skill may go over 120 with an allowlist entry that gives a one-line reason, and no text is cut only to fit the number."
  - The cap line under the thinning list becomes: "The 120-line cap is soft, and it keeps counting everything a skill loads. A skill may go over it with an allowlist entry and a one-line reason. Thrive reached its numbers partly by moving text into references its check does not count. PRISM does not copy that. Content that fails the tests is still cut, not moved."
- **`.prism/plans/prism-499/plan.md`.** Under the phase-1 Decision "The 120-line cap is enforced by a check, not by review" (line about 325), add a sub-bullet: "Hunter ruled on 2026-11-18 that the cap is soft with reasoned overages. The ruling is recorded in the Decisions of `.prism/plans/prism-530/plan.md`, and it supersedes this Decision going forward."
- **`scripts/ai-skills/skill-loaded-lines.test.ts`.** Rewrite the header comment and the one above `OVER_CAP_ALLOWLIST`.
  - Say the cap is soft: an entry lets a skill go over 120 for a stated reason, or until the change that thins it lands.
  - Keep the ratchet sentence: a listed skill under the cap fails until its entry is removed, and one whose size moves fails until its `max` is updated.
  - For a reasoned overage, the entry's `thinnedBy` text starts with `reasoned overage:` and then gives the one-line reason. Change no type and no test body.
- **`.prism/rules/skill-authoring.md` and `.prism/architect/_toolkit/business-layer.md`.** Their Length test lines say the body "fits in 120 lines". Change each to say it aims for 120 lines, that the cap is soft, and that a reasoned overage takes an allowlist entry with a one-line reason. Keep the rest of the Length line.
- **Other hits.** Run `git grep -n -i -E "120-line|120 line|hard cap" -- .prism .ai-skills scripts docs` and fix each hit that calls the cap hard. Leave plans, retros, audits, and ADRs alone, because they are records. Run `pnpm prism:build` and commit what it writes.

## Challenge

## Decisions

- **The plan uses the folder shape and the chain task shape, as children 4 and 5 do.** It was written before child 5's challenge-round runner landed, so `## Challenge` is empty and `status` stays `draft`.
- **This plan is approved by Hunter in chat, once, after the 2026-11-18 refresh against `main` at `2aec908e`.** `prism-implement` refuses a folder plan whose `status` is not `approved`, and `auto-approve.mjs` cannot approve this one.
  - **Root cause.** `auto-approve.mjs` checks task files against the folder's own `spec.md`, and a child folder has none, because its spec is the epic's. T5 and T7 also list `package.json`, a default dependency stop path. On 2026-11-18 `auto-approve.mjs --check` exits 1 here on all three, plus the empty `## Challenge`.
  - **Alternatives considered.** Copying the epic spec's Affected systems into a child `spec.md` was rejected, because it duplicates the epic spec and drifts. Building child 6 outside the chain, as children 4 and 5 were, was rejected, because child 5's implement stage now refuses an unapproved folder plan.
  - **Chosen approach.** The workflow rule's approval path: Hunter says `approve` in chat, and the session runs `node scripts/ai-skills/hooks/plan/approve.mjs .prism/plans/prism-530/plan.md`, which stamps `approved_via: chat`.
  - **Implementation guidance.** Every pending edit lands before the ask. Per the workflow rule, an approved `plan.md` keeps its approval through any edit outside `## Tasks`. A change to `## Tasks` goes back through `auto-approve.mjs --check`, which fails here, so it goes back to Hunter.
- **OPEN — TBD, needs Hunter's input.** Whether the two challenge rounds run on this plan before the approval ask. The workflow rule's resume table runs its first matching row, and "standard, `## Challenge` missing round 1 or 2" comes before "a task with no commit naming it", so a fresh session would send an approved plan with an empty `## Challenge` back to the plan stage instead of to implement. **Default path (used until resolved):** the orchestrator dispatches `prism-challenge` for rounds 1 and 2 before asking Hunter to approve, so the plan he approves is the challenged one and the resume table routes to implement. Skipping the rounds would need a recorded waiver here, and a session reading only the table would not see it.
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
  - **Implementation guidance.** T8 adds the confirm form of the record line and the one-sentence definition. T5 reads the last PR-review line. T15 writes the confirm line. T21 names "final" in the PR-review row. AC-2's wording is adjusted as a proposal, below.
- **Child 5's handoffs (issue #530, comment 6990125591) each land in a task or are already covered.**
  - **Who writes an epic's `## Retro`.** `prism-retro` does, at full grain, in the epic's `spec.md` (T18). T21's epic resume row names it, which ends the loop where an epic resume sat at retro forever.
  - **`prism-pr-review` pushing the plan file alone in worktree mode.** On a folder plan Eric writes the record in the session's own checkout, whichever mode he read in, commits it with `commit.mjs`, and never pushes. The session pushes, per ADR-0082 and the routing rule's reviewer exception. A record written in his `/tmp` worktree would be stranded when the worktree is removed. A flat plan keeps today's plan-only commit and push (T15).
  - **`prism-qa-plan` sending UNMET results to `## Review Issues`.** T17 deletes the whole AC Verification section, line 34 included, and the intent-scope pass records grades under `## Review` on a folder plan (T9). No separate fix is needed.
  - **`prism-implement`'s "one commit per plan task".** T17 changes line 39 to per bundle on a folder plan and per task on a flat plan, matching `git-conventions.md`. It rides T17 because T17 already edits that file, and two open tasks may not claim one file without a dependency between them.
- **The self-review record keeps child 5's subject, `plan: self-review record`, and the PR review mirrors it as `plan: pr-review record`.** The plan first swapped in thrive's `plan: record review`. Renaming a subject that already shipped buys nothing, and matching names make the two records easy to find in `git log`.
- **The `AGENTS.md` lead sections have 2 bytes of room, so every lead-rule addition names the cut that pays for it.** They end at byte 31,742 on `2aec908e`, against the 31,744 working line PRISM-522 T10 set, 1 KiB under Codex's 32,768-byte default window.
  - **Which files count.** Only lead rules move the offset, and this plan edits two: `workflow.md` and `skill-routing.md`. `followup-scope.md` (T19) and `branch-plan.md` (T22) render after the lead block, so they change the file's size and not the offset.
  - **The cuts.** T20 deletes the 166-byte `prism-review-loop` line from `skill-routing.md` and runs first. T13 then adds `prism-verify` to the dispatched-stages bullet. T21 replaces the inline pause-trigger list with a pointer to `REVIEW.md` and shortens the verify and retro rows, which pays for the watch-ci and confirm-pass sentences. The expected end offset after T21 is near 31,600.
  - **Alternatives considered.** Moving the watch-ci text into `shipping-flow.md` only was rejected, because the CI loop runs after every push, review fixes included, and the session reads the workflow rule for that, not the PR-stage reference. Raising the working line was rejected, because the 1 KiB margin is what absorbs a consumer's own text above the generated block.
  - **Implementation guidance.** T13, T20, and T21 each measure the offset after their build and record it in `## History`. A task that lands past 31,744 cuts prose in the rule it edited, never a resume row or a cap.
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

## History

- 2026-11-18 [huntermcgrew/prism-530-review-verify]: Plan created for child 6 as 24 tasks: the CI watcher, reconcile, the report check, the retro-line check, `REVIEW.md` and ten pass files with their delivery, onboarding stack checks, `prism-verify`, the self-review, PR-review, retro, audit, and QA rewrites, the review-loop removal, rule and ADR edits, and docs.
- 2026-11-18 [huntermcgrew/prism-530-review-verify]: Recorded Hunter's chat rulings: the 120-line cap does not count `REVIEW.md` or `.prism/review/*.md`, and five items are approved. The plan approval stays OPEN and `status` stays `draft`.
- 2026-11-18 [huntermcgrew/prism-530-review-verify]: Recorded Hunter's soft-cap ruling ("O1, reasoned overages") as a Decision that supersedes the phase-1 cap Decision. T20 now removes only the review-loop allowlist entry, and new T25 rewords the intent, rules, and test comment; AC-10 and AC-11 were adjusted and AC-15 added, logged in the AC Sync Log as not synced to issue #530.
- 2026-11-18 [huntermcgrew/prism-530-review-verify]: Refreshed the plan against `main` at `2aec908e` after child 5 merged: line citations, child 5's landed names and subjects, T1's validator limits, T6, T21, T23, T24, and T25 were corrected, and T10's unclosed comment literal, which hid T10 to T15 from `tasks.mjs`, was rewritten. Child 5's four handoffs now land in T15, T17, T18, and T21, the PR-review verdict now means the final one, and T20 runs before T13 to pay for the lead-rule bytes. The groups now come from `bundles.mjs`, three import edges were written into `depends on`, AC-2 has a proposed adjustment, and the main session's AC sync is logged.

## Sessions

- 2026-11-18 [huntermcgrew/prism-530-review-verify] open: Intent: plan child 6 (review and verify) to the detail bar from the epic spec and thrive at db3570975, against child 5's plan as written. Bounds: plan file only, no code, nothing outside the spec's Affected systems, no new dependency, and flag shared-type, public-surface, and intent-level questions. Approach: port the rulebook and the review scripts as an inert first PR, then rewrite the stages on top, naming every child 5 dependency. · close: scope held
- 2026-11-18 [huntermcgrew/prism-530-review-verify] open: Intent: refresh the child 6 plan against `main` after child 5 merged, so Hunter approves it once. Bounds: the plan file and a merge of `main` only, Hunter's existing rulings kept, nothing that changes the PRISM-499 intent or spec. Approach: verify every task claim on `2aec908e`, fold child 5's four handoffs into existing tasks, and name the lead-rule cuts. · close: scope held

## Verification

## Review

## Acceptance Criteria

The issue's proof ("both reviews print one coverage line per pass; a plan with an empty `Retro:` line fails the check"), expanded into checkable criteria.

- [ ] **AC-1** Both reviews print one coverage line with an entry for each of the ten passes.
  - Evidence (human): on a scratch folder-plan branch with a one-file code change, `prism-self-review`'s chat report and `prism-pr-review`'s summary comment `### Pass coverage` each hold ten entries. Each entry reads `swept — <enumeration>`, `n/a: <reason>`, or `not reached: <reason>`. Record both outputs' coverage lines in `## History` · UNMET looks like: fewer than ten entries, a bare `swept`, or one review with no coverage line.
- [ ] **AC-2** A folder plan whose PR review is recorded but whose `Retro:` line is empty fails `pnpm prism:check`, and the same plan with a filled `Retro:` line passes.
  - Evidence (machine): `plan-retro-line.test.ts` passes its empty-fails, filled-passes, no-verdict-passes, and self-review-only cases. `pnpm prism:retro-line` exits 0 on the tree, and `prism:check` in `package.json` runs it · UNMET looks like: the empty case passing, or the step missing from `prism:check`.
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
- **Status:** `proposed`, for Hunter to accept or reject with the plan approval.

### AC Sync Log

| Date | Agent | Action | Plan | Ticket |
| ---- | ----- | ------ | ---- | ------ |
| 2026-11-18 | Winston | Generated AC and wrote them, without IDs or Evidence, into issue #530 at creation | written | synced |
| 2026-11-18 | Winston | Adjusted AC-10 and AC-11 and added AC-15 for the soft cap, as adjustments Hunter's chat ruling approved | written | not synced |
| 2026-11-18 | main session | Synced the 15 AC, AC-1 to AC-15, to issue #530 | written | synced |
| 2026-11-18 | Winston | Proposed the AC-2 adjustment for the final PR-review verdict; not synced until Hunter accepts it | proposed | not synced |

## PR Readiness

Retro:
