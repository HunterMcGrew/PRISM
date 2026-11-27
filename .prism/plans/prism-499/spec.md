---
title: AI-native SDLC for PRISM — spec for the Kitchen Line port
stage: spec
status: draft
intent: intent.md (amended 2026-11-26)
ticket: https://github.com/HunterMcGrew/PRISM/issues/499
created: 2026-11-17
amended: 2026-11-26
checked_against: PRISM main at 8d27c235, and at 37cdbd28 for the 2026-11-26 amendment; thrive branch tips f071dfcca (#2844, re-read at 3507ce9e1 on 2026-11-18), 2bbbbcf49 (#2847), 51a3d7d20 (#2853), 458045f9f (#2854), 424dcbda2 (#2859); #2859 again at db3570975 on 2026-11-18, after #2937 was folded into it
---

# Spec: the Kitchen Line port

This spec turns the amended intent into a design and cuts it into child PRs. Phase 1 is done and is not repeated here. Each child gets its own plan folder, written by `prism-plan`, with tasks. This file holds the decisions those plans build from.

The 2026-11-26 amendment changes the design in places. The section "Third amendment, 2026-11-26" holds the design for what it adds, and the text elsewhere is edited to match it. Children 1 to 9 are merged. Children 10 and later carry the amendment.

Thrive is the reference implementation. Where this spec says "port", the child copies thrive's file at the tip named above and changes only what the "Swaps" section lists. Where it says "adapt", the design is thrive's and the code is PRISM's.

## Requirements

1. A ticket can run from an approved intent to a draft PR with no person starting a stage.
2. A fresh session can tell the next stage from the plan folder alone.
3. Only a person can approve an intent or a design.
4. Two writers never claim the same file.
5. One review runs `REVIEW.md`'s passes before the PR opens, and a human catch the agent missed is recorded.
6. The rules in the intent's Hooks section stop the action when broken, on every host that exposes the event.
7. Everything a consumer receives reads its commands, paths, and globs from the consumer's config.
8. Every legacy flat plan keeps working.
9. A Codex session gets the workflow block even when it reads only the first 32 KiB of `AGENTS.md`.
10. A code-only change of 100 or fewer product lines runs as a small ticket, with no spec and no task plan, and a script measures the size on the diff.
11. The review passes with zero Critical and zero Major findings, runs at most two rounds, and never gives a Minor a round of its own.
12. The review reads the plan folder as its yardstick and raises no finding on it, and no finding lands on a never-reviewed path.
13. The verify and review stages have no Edit and no Write, a script writes each record, and every stage skill declares its tools.
14. A plan folder is lean: no History or Sessions, Decisions only for scope changes and open questions, at most two prose lines per task, and an intent that states its approach.
15. The close step runs on every plan, and the retro report runs only when a script finds a trigger.
16. The always-loaded rules fit a word budget, and the build fails above it.
17. The npm package publishes once, after every child above has merged.

## Design

### Swaps that apply everywhere

| Thrive | PRISM |
| --- | --- |
| `.ai-spec/` | `.prism/` |
| `thrive-<stage>` skill IDs | `prism-<stage>`, keeping PRISM's existing IDs where a skill already exists |
| `thr[pn]?-\d+` ticket pattern | built from `ticketPrefix` in `.ai-skills/config.json` |
| `origin/main` | `defaultBranch` from config |
| hard-coded prettier, eslint, pnpm, Pest, Storybook | `commands.*` and the new config keys below |
| bash scripts | zero-dependency `.mjs`, because the runtime is tested on Windows |
| `thrive.*` git-config keys, `thrive-pr:` and `thrive-verdict` markers, `thrive-chat-approval.json` | the same names with `prism` |
| `scripts/plan/`, `scripts/review/`, `scripts/verify/`, `scripts/hooks/` | modules beside the existing hook runtime under `scripts/ai-skills/`, delivered to consumers the way the hook runtime is |

How a consumer invokes a script is the chain child's call: a `prism` subcommand, a delivered `.mjs` path, or both. The requirement is that a hook and a skill reach the same parser, so there is one copy of each.

### Skill ID map

| Stage | PRISM skill | Status |
| --- | --- | --- |
| Intent | `prism-intent` | new, absorbs `prism-user-stories` |
| Design | `prism-design` | exists, becomes a stage that writes `design.md` |
| Spec | `prism-spec` | new, subagent |
| Plan | `prism-plan` | exists, becomes a persona-less utility |
| Challenge | `prism-challenge` | exists, gains the round grammar and writes its round line under `## Challenge`, the one edit it makes to `plan.md` |
| Implement | `prism-implement` | exists, commits only |
| Docs | `prism-docs` | exists, a docs task inside the feature PR |
| Verify | `prism-verify` | new, subagent |
| Review | `prism-review` | `prism-self-review` renamed, the only review, runs `REVIEW.md` as a subagent |
| PR review | `prism-pr-review` | retired, its source moves to `.ai-skills/deprecated/` |
| Retro | `prism-retro` | exists, a close step on every plan and a report on a trigger |
| Approach questions | `prism-architect` | new, Winston |
| Diagnosis | `prism-debug` | new, Sasha |
| Test-first rules | `tdd` | exists |

### Plan folder

Port thrive's four templates into `.prism/templates/`: `intent.md`, `design.md`, `spec.md`, and `plan.md`. The small size adds a fifth, `plan-small.md`, which holds the records a small ticket needs and no tasks, as the small-size part of the Third amendment section describes.

- **Frontmatter on every chain file:** `title`, `ticket`, `stage`, `status`. An approved file adds `approved_by`, `approved_at`, and `approved_via: chat` when approved through chat.
- **`intent.md`** adds `size` (`small`, `standard`, or `epic`). Sections: Problem, Proposed outcome, Approach, Regression surface, Security surface, Design, Acceptance criteria, Open questions. Approach is three labeled lines the person approves: `Chosen:`, `Rejected:`, and `Unknown:`. Each takes `none — <why>` and a bare `none` fails approval, as it does for a surface.
  - A surface accepts `none — <why>`. A bare "none" fails approval.
  - Design opens with `needed`, `supplement`, or `not needed`, plus a reason. A supplement adds `approval: required` or `not-required`. A `needed` design always requires approval.
  - Acceptance criteria may be `none — <why>` only on an epic.
- **`design.md`** adds `approval`. Its sections are thrive's, with the state list cited from `prism-design` and not restated.
- **`spec.md`** is never approved. Sections: Requirements, Design, Affected systems. Affected systems is a fenced block with one glob per line. An epic spec adds Children, Merge order, and Decisions, and gains a Retro section when the epic's retro runs.
- **`plan.md`** sections: Tasks, Challenge, Decisions, Verification, Review, PR Readiness. The `Retro:` line lives under PR Readiness. History and Sessions leave the template. A plan folder written before that keeps the two it has, and nothing reads them.
- **Task shape:** heading `### T<n>: <summary>`, with fields `files`, `proof`, `proof fails on main`, `depends on`, and `behavior change`. The parser also accepts `amended` and `new dependency`. Below the fields a task holds at most two lines of gotchas, meaning what the builder would otherwise get wrong. The task parser counts them, and the plan stage fails its own run above two.
- **Plan Decisions** hold scope changes and open questions only. A routine implementation choice is a commit, not a Decision. The retro still writes a verdict under each one.
- A folder counts as a plan only when it holds a chain file.
- **Lookup order:** `<id>/`, `<id>.md`, `epic-<id>/`, `epic-<id>.md`, then a `ticket:` field scan. This extends the folder tier phase 1 added to `resolveLivePlan`.
- `resolveLivePlan` keeps its contract and never reads `.prism/archived/`, because the gates that call it must not treat a frozen record as a branch's live plan. A separate archive search serves the readers that want history, such as the audit and the retro.
- The existing flat-plan template in `branch-plan.md` stays for legacy plans. The rule gains the folder shape and loses nothing a flat plan needs.

### Workflow block and resume table

Port thrive's `## Workflow` block into `AGENTS.md` and `CLAUDE.md` as generated content, so the two cannot drift. It carries the stage order, the stops, the caps, and the resume table. The resume table is thrive's rows with PRISM's paths. The third amendment changes it: rows name the size they apply to, small gets its own, and the review row sits before the PR row with no PR-review row after it. The block is cut to the sizes and the resume table, and the approval, advancing, and scope-change text moves into the stage skills that act on it.

Caps: 20 subagents, 3 writers on disjoint files, 3 rounds per stage, 2 rounds for review, 3 CI-fix pushes, 2 re-dispatches of a blocked bundle. A plan challenge whose round 3 still blocks gets a confirm round outside the 3, rerun once after an architect verdict.

The block's Approval, Limits, and Scope changes paragraphs come from #2859 at db3570975, which carries the approve-once change. They encode the intent's "Where the run stops for a person":

- **Ask once.** The plan and intent stages land every pending edit before asking for `approve`.
- **Rulings are approvals.** A chat answer to a question the run asked approves the edit that writes it down, in the person's words. An approved `plan.md` keeps its approval through an edit outside `## Tasks`.
- **Confirm round.** When round 3 blocks, the plan stage fixes the findings and dispatches round 4. A `needs-replan` amendment gets the same confirm round.
- **Architect before person.** Scope ideas go to `prism-architect`, and a "proceed" goes ahead as a Decision. A confirm round lets the plan through unless a finding is major. With only non-major findings it writes `round <n>: carried <count>`, a form only a confirm round may use, and each carried finding is fixed or becomes an `OPEN` Decision. A major finding, one that looks like a change to the intent or its foundation, makes the round `blocking`, which holds auto-approval. The stage dispatches `prism-architect` with the plan folder and the finding. On a verdict that it is not intent-level, the stage fixes it that way or records it as an `OPEN` Decision, then runs the confirm round again with the verdict in the brief. The person is asked only when the architect judges the finding intent-level, and only when the build cannot go on without the answer.
- **Re-plan.** A `needs-replan` build report appends tasks and never renumbers, reruns `bundles.mjs`, runs one challenge round and its confirm round, then `auto-approve.mjs --check`.
- **Open items.** Every `OPEN` Decision a run leaves is listed in the PR body and the closing summary, and so is every Minor the review left.

Commit subjects on a folder-plan branch: `T3:`, `T3-T5:`, `T11,T15,T22:`, `T3 fix:`, `plan:`, `retro:`. A flat-plan branch keeps `PRISM-NNNN:`. `git-conventions.md` gains this, and its one-commit-per-task guidance becomes one commit per bundle.

`prism-implement` and `prism-docs` commit and never push. The session's PR stage pushes and opens the draft PR. This changes the "authors ship" rule in `skill-routing.md` for folder-plan branches, and that rule is edited in the same child.

### Scripts

| Thrive script | What it does | Port or adapt |
| --- | --- | --- |
| `frontmatter.mjs` | Reads and writes chain-file frontmatter | Port |
| `lookup.mjs` | Resolves a plan in the order above | Adapt into `resolveLivePlan` |
| `approve.mjs` | Stamps approval. Needs a keypress in a terminal, or a one-use chat token. Refuses a spec, a missing required field, and a bare "none" | Port. The agent check reads each host's own environment marker, not only Claude's |
| `chat-approval.mjs` | Detects a typed `approve` and writes the token with a content hash of the plan files | Port, using the hash form from #2859 and no expiry |
| `tasks.mjs` | The one task parser. A task is done when a commit subject in range names it | Port |
| `bundles.mjs` | Rejects two tasks claiming one file, adds import edges, groups tasks by architect-doc set | Adapt. Import-alias resolution comes from config. Use the #2854 version that accepts an amended plan |
| `commit.sh` | Commits only the named paths, retries on a locked index, refuses a named path with no change against HEAD, and treats paths as literal so a magic pathspec cannot widen the commit | Adapt to `.mjs` |
| `auto-approve.mjs` | Approves a plan with at least one task, every file inside Affected systems, challenge rounds 1 and 2 present with the highest-numbered round not blocking, and no file on a stop path. Accepts `carried` only from round 4 on. No task limit. `--check` re-checks an approved plan after a task change | Port from db3570975, with its tests for a 13-task plan and a round-4 confirm |
| `stop-paths.mjs` | Paths that always need a person, in two kinds: `dependency` (manifests and lockfiles) and `contract` (shared-contract trees). Matching is case-insensitive, and a directory holding a stop path matches too | Adapt. Both lists come from a new `stopPaths` config key. `dependency` defaults to the common manifests and lockfiles, and `contract` defaults to empty |
| `watch-ci.mjs` | Waits for CI on a PR | Adapt. The required check name comes from config |
| `check-report.mjs` | Checks the shape of a Verification section | Port. Thrive's planted fixture is not ported |
| `reconcile.mjs` | Resolves addressed agent threads and reports unanswered human comments. It sets no label | Adapt. Markers and the PR template path come from PRISM. The label and verdict-marker code goes in the third amendment |
| `size.mjs` | Measures a diff against the small limits and prints `small` or `standard` with its reasons | New, third amendment |
| `review/record.mjs` | Appends the review's one round line to `plan.md` and rejects a finding aimed at a never-reviewed path | New, third amendment |
| `verify/record.mjs` | Writes the `## Verification` section from the verify run's report | New, third amendment |
| `retro-trigger.mjs` | Reads a plan and says whether the retro report is due, and why | New, third amendment |
| `plan-folder-citations.ts` | Fails a plan folder that holds a section-sign citation or a `see Decision:` citation | Port into the existing lint set, with an allowlist |

The citation lint carries an allowlist of plan files written before it existed. `prism-499/plan.md` is on it, because the phase-1 plan is the record of a finished phase, full of section-sign citations and rewriting it would change history for no reader. The allowlist can only shrink.

Each script ships with a suite named `*.test.ts`, the only pattern `run-tests.ts` discovers, so `pnpm prism:test` runs it. Thrive's suites are `*.test.mjs` and are renamed on the way in.

### Review

The review is one skill, `prism-review`, run before the PR opens. This part describes `REVIEW.md` and what hangs off it, and the Third amendment section holds the changes.

- `REVIEW.md` sits at the repo root and ships to consumers. Port thrive's structure whole: severity, finding kinds, finding shape, coverage line, exit rule, rounds, and the ten passes with their triggers.
- Pass files live in `.prism/review/`, one per pass. PRISM ships the generic checks. Onboarding adds the consumer's stack checks, the way it already generates per-team rules.
- Pass 9, Contracts, ships with generic triggers: a migration, an ADR, or a stored or exported shape.
- The range rule starts a round's new-commit diff after the review's own last round. The clause that started it at a GitHub review's commit goes with the PR reviewer.
- Exit rule: zero Critical and zero Major findings, and every pass swept or not applicable. A Minor is fixed inside the rounds when it can be and never earns a round. A review that reaches its cap with only Minors left has passed, and they are listed in the PR body. At most two rounds.
- The bookkeeping exemption in `followup-scope.md` is removed, because no Minor gates any more. Its other section, the trip-wire for spec content riding an unrelated ticket, stays with its lint.
- The review-misses log is `.prism/metrics/review-misses.jsonl`, append-only, created by its first row.
- The `<!-- prism-agent -->` marker stays on every comment the session posts to the draft PR, so reconcile can tell it from a human's. The `prism-verdict` marker and the review labels go.

### Verify

`prism-verify` runs a closed set of checks, each mapped to a `commands.*` key: typecheck, lint, test, build, and format. It runs once per head, fixes nothing, and writes the Verification section through `verify/record.mjs`, since it has no Edit and no Write. A consumer adds checks through config. Thrive's Pest, Storybook, and workspace mapping are not ported.

### Retro

- The close step runs on every folder plan and is not offered or declined. `branch-plan.md` loses the "declined" form for folder plans. The retro report is separate: it runs only when `retro-trigger.mjs` finds a trigger, so no person decides whether it runs.
- A check fails a folder plan whose `> Closed:` line is set while its `Retro:` line is empty. The third amendment replaces the earlier key, a final PR-review verdict, because the PR reviewer is retired.
- The retro reads unmet acceptance criteria from the review and grades the rest itself.
- It reads `reconcile --classes` and proposes a fix for any class at three or more, a hook first and a `REVIEW.md` line last.
- Lessons exit as promoted, expired at 90 days, or merged.

### Personas

- **Voice block.** Port thrive's ADR-0054 shape: an identity line, an optional scene line, a tone line, three or four signature lines, and one greeting instruction. It sits right after the job statement.
- **Cap.** `measureSkillLoad` skips the first 16 lines of each `## Voice` section. Nothing else about the count changes.
- **Eric is retired with `prism-pr-review`.** His name stays on the `prism-review` Triggers line so a request for him still routes. Briar keeps the persona of the one review, and her Voice block is skipped when it runs as a subagent.
- **Persona names stay unique.** A build check fails when two roles share a persona name, since `prism-architect` takes "Winston" from `prism-plan` in the same change.
- **`prism-architect`.** Chat-only output: Verdict, Evaluation, Suggested approach, Watch for, Open items. It replaces the quick-consult mode inside `prism-plan`. The evaluation sections move from `prism-plan` unchanged. When a running stage dispatches it with a plan folder and a scope idea or a challenge finding, it reads that folder's `intent.md` and `spec.md`, returns a fit verdict to the stage, says whether the finding changes the intent or its foundation, and offers nothing. The chain-skills child builds this mode, since the plan stage calls it.
- **`prism-debug`.** Port thrive's body and trim it to the cap. It changes no file except a lessons entry, and it tags and removes its own temporary logging. The routing phrases for broken behavior move from the implement row to it. This supersedes ADR-0079 for the debugger only.
- **Batteries.** A pointer to `session-orientation.md` costs one line. `measureSkillLoad` charges a cited rule only when it is `load: skill`, and that rule is `load: always`. The persona child decides per skill whether the line earns its place.

### Git hooks

- **Files.** A `.githooks/` directory with `pre-commit` and `pre-push`, each a short `sh` shim that calls a `.mjs` file in the delivered runtime. Git for Windows runs `sh` shims.
- **Pre-commit** checks staged files that match the configured globs with the configured format command. It compares against the staged copy and never writes the index.
- **Pre-push** runs the configured lint command over the files the push carries. It skips a ref that is not the checked-out head.
- **Config.** A new `gitHooks` key holds each hook's command and globs. Onboarding fills it from the detected stack. A hook with no command skips with a notice.
- **Skip, don't block,** when node, the tool, the default branch, or the delivered `.mjs` is missing. The last case covers a `core.hooksPath` that points at another checkout's `.githooks` from a branch older than the script.
- **One glob list for CI.** The format check has a check-all mode over the same `gitHooks` globs, so a consumer's CI can run the list the pre-commit hook runs.
- **Installer.** A `prism hooks install` command sets `core.hooksPath` to `.githooks`. It replaces only an empty value or one that already points at a `.githooks` directory in the same repo, including an absolute path into another worktree of the same repository. It reads the worktree-scoped value too when `extensions.worktreeConfig` is on, and unsets a worktree value that points at PRISM's own `.githooks`. Any other value at either scope is left alone and reported, so husky and lefthook users lose nothing. `prism adopt` and `prism update` run it.
- **Every clone needs it once.** `core.hooksPath` is local git config and is never committed, so a teammate's fresh clone has `.githooks/` with nothing pointing at it. Three things close most of that gap:
  - Onboarding offers to add the install command to the consumer's own setup step, such as a `prepare` script.
  - A new session-start agent hook runs the installer when the value is unset, so every clone an agent works in gets it.
  - `prism doctor` reports a clone where the hooks are not installed.
- **What is left.** A person who clones by hand and never runs setup, an agent, or doctor has no git hooks. CI stays the gate that decides a merge.
- **Agent pushes.** The existing `hooks.pushVerification` gate runs lint and format. With the git hooks installed, pre-push covers lint and pre-commit covers format, so the gate skips whichever of the two an installed hook already runs.
- **ADR.** A new ADR records the reversal of ADR-0076's rejection of real git hooks. ADR-0076's agent-side gates stand.

### Agent hooks

Base: PRISM's runtime in `scripts/ai-skills/hooks/`. Thrive's `tokenize.mjs` and `segments.mjs` are ported as library modules in the chain-scripts child, because the approve guard needs them before the other gates do. The agent-hooks child moves the existing gates onto them. The existing read-credit path keeps its current behavior.

| Gate | Event | Denies | Needs |
| --- | --- | --- | --- |
| Secrets | read, search, and shell tools | `.env` and `.env.*` except `.env.example`, any `secrets/` segment, `*.pem`, `*.key`, and a search whose root holds one. Patterns extend through config. The one allowed shell form prints a file's key names, never values, and the remedy names it | nothing |
| Brief | subagent start | A brief over 15 non-blank lines, or one with an override phrase, sent to a role marked `gated` in `roles.json` | nothing |
| Commit, flag half | shell | `-a`, `-i` and `--include`, no paths, a whole-repo path, a pathspec the shell would expand, a `:` magic pathspec, `--no-verify` and its short forms, an inline `core.hooksPath`, more than one commit per command. On push, `--no-verify` and an inline `core.hooksPath` | nothing |
| Commit, subject | shell | A subject that is not a task form on a folder-plan branch. `plan:` may touch only the plan folder, and `retro:` only the retro's paths | chain |
| Commit, weakened tests | shell | A removed line in a test file that predates the branch, unless a named task lists the file and carries `behavior change:` | chain, and a new `testGlobs` config key |
| Commit, stop paths | shell | A stop-path file with no named task listing it. A dependency file counts only when its dependency entries change, and then the task must carry `new dependency:` | chain |
| Approve guard | prompt submit, shell, and edit tools | Running the approval script except once under a fresh token. Edits to approval fields. Any touch of the token | chain |
| Commit, size | shell | A commit on a branch whose intent says `size: small` when the would-be tree is over the small limits. Added by the third amendment | chain, and `size.mjs` |
| Reconcile stop | subagent stop for `prism-pr-review` | Retired by the third amendment, with the skill and its registration on both hosts | none |

- **Defaults.** The secrets gate, the brief gate, the approve guard, and the commit gate are on wherever the hook runtime is delivered. The plan-dependent commit checks fire only on a folder-plan branch, so a consumer who has not started using plan folders sees only the flag denies. ADR-0076's two gates, `hooks.commitCleanupPass` and `hooks.pushVerification`, stay opt-in.
- **`gated` roles.** `roles.json` gains an optional `gated` flag, set on the roles that run as subagents from a plan folder. The agent-hooks child added it. `prism-review` takes the flag when it replaces `prism-pr-review`, and a test holds `GATED_ROLES` equal to the flagged roles.
- Every gate fails open on its own crash. The approve guard's execution arm is the exception: it fails closed on shell syntax it cannot read, and a new bypass shape goes on its known-misses list.
- **The commit gate reads a would-be tree.** It builds the commit in a temporary index, so files a sibling staged are ignored. A `cd` or `git -C` it cannot resolve falls back to the session directory.
- **A registration test** pins each hook's event, matcher, command, and timeout on each host.
- Remedy text names one action that clears the deny.
- Thrive's screenshot gate, its Docker arms of the secrets gate, and its dev-port work are not ported.
- **Kill switches.** `PRISM_HOOK_DISABLE` and `PRISM_HOOK_DENY_DISABLE` stay. The approve guard and the secrets gate ignore both. The commit gate denies a command that sets either one inline.
- **Hosts.** Codex cannot block at subagent start, so the brief gate logs there. Each such gap goes in `hook-runtime.md` as a host limitation.
- **Proof.** Each gate has the three-leg test thrive uses: the deny fires, a seeded state clears it, and the live remedy clears it.

### Architect routes for consumer code

The write gate is already on by default. The gap is that a fresh install routes only PRISM's own paths. Onboarding writes a route over the consumer's source tree only when it has drafted an architect doc with real content from the detected stack. It writes no stub. A route to an empty doc would hold up a consumer's first edit to read nothing, and `lazy-artifacts.md` does not allow a placeholder file.

### AGENTS.md and Codex

- The generator orders `AGENTS.md` from a named list of lead sections, which come first, ahead of the inlined rules.
- A build test asserts every lead section ends inside the first 32 KiB.
- The Codex child builds the list and the test with the sections that exist today: routing and the behavioral norms. The chain-skills child adds the workflow block and resume table to the same list, and the test covers them from then on.
- The build prints the size of `AGENTS.md` and of the always-on set. Nothing fails on `AGENTS.md`'s size. The always-on rules have a word budget the build does fail on, which the Third amendment section sets.
- When `codex` is among the hosts, onboarding and `prism update` write `project_doc_max_bytes` to the repo's `.codex/config.toml`, merged with any keys already there. The value is the file size rounded up to the next 64 KiB, with one step of headroom.
- `prism doctor` warns when `AGENTS.md` is larger than the configured limit, or larger than 32 KiB with no limit configured.

### Always-on rule edits

Each edit lands in the child that makes it true:

- `git-conventions.md`: task subjects, one commit per bundle, and a folder-plan `plan:` commit whose staged set is the plan folder. Child 8 also changes the `--no-verify` line from "unless the user explicitly asks" to never, since its commit gate denies it.
- `branch-plan.md`: folder plans, the close step and its triggered report, no declined form for folder plans, and the folder form of a plan-only commit. Child 4 drops its History guidance's `see Decision:` recommendation for plan folders, in the same PR as the lint that rejects it.
- `skill-routing.md`: the new skills, the debug and architect rows, who pushes. Child 10 points the Eric and review-phrase rows at `prism-review` and drops the PR-review line from "Authors ship, reviewers review". Child 10 also edits the merge bar in `git-conventions.md` and drops the bookkeeping section of `followup-scope.md`.
- `session-orientation.md` and `response-shape.md`: no change planned. The third amendment edits the first, so a folder plan skips its Battery Persistence step, because a plan folder has no Sessions section.

No other rule or architect doc is rewritten, except the rules the always-on budget re-sorts and cuts. A child edits one only where its own change makes the text wrong.

### Carried in from the 2026-11-18 tips

These come from thrive's tips after the spec was first pinned, and landed in the child named. Child 5's History line and child 6's whole-PR scope, range start at a GitHub review, and 3-round cap are changed by the third amendment.

- **Child 5.**
  - **Build report.** About ten lines, with a verdict of `done`, `needs-replan`, or `blocked`, task IDs, the SHA, files against the plan, and checks run. An unlisted file or an acceptance criterion the tasks cannot meet returns `needs-replan`. The implement stage refuses an unapproved plan and never edits `plan.md`: it returns a History line, which the session appends after the wave.
  - **`tdd` gains thrive's testing rules.** Characterization tests come before changing untested code. A bug fix's failing test goes in its own earlier task with `proof fails on main: yes`. An existing test is edited only when a task lists it and states `behavior change:`. Every new test gets a mutation check.
  - **`preloads`.** `roles.json` gains `preloads`, so the implement role loads `tdd`. The build writes it into agent files and fails on a preload that names no skill.
- **Child 6.**
  - **`REVIEW.md` sections.** It also carries "When a review pauses", "After a fix", the verdict cap, "Sweep, then filter", enumeration units, the whole-PR scope, the range start at the latest review's `commit_id`, and the no-steer brief rule. The pause triggers are a file outside the plan, a dependency, a shared type or public API, and destructive git.
  - **Agent marker.** Every agent comment, reply, and PR-body Notes bullet carries `<!-- prism-agent -->`, and reconcile tells agent comments from human ones by it.
  - **Misses log.** `review-misses.jsonl` gets `merge=union` in `.gitattributes`, for PRISM and for consumers.
  - **Verify reruns.** After a later commit, `prism-verify` reruns only the checks the new commits reach and rewrites those rows. Every check considered gets a row, `n/a: <reason>` included. A spec-surface change runs `pnpm prism:check`, or `prism doctor` for a consumer.
  - **Audit.** `prism-audit` confirms a promoted verdict by finding the rule's text in the named file, and reads Decisions from a folder's `plan.md` and an epic's `spec.md`.
  - **Lower priority, the child's call.** Thrive's foundation-review mode, and retro voices named by stage on a folder plan.

Thrive's `affected.mjs` maps changed files to Jest tests and Storybook stories. It is stack-specific and nothing calls it yet, so it is not ported.

## Third amendment, 2026-11-26

Design for the intent's third amendment, built by children 10 to 16. The design follows the intent's own wording. Thrive's process review of 2026-11-24, which the intent cites, did not open for this spec, so each child's plan checks the thrive branch tips for something to port and otherwise builds from the intent and this section.

### One review

- **One skill, `prism-review`.** It is `prism-self-review` under a new name: the `roles.json` entry renamed and set `gated: true`, Briar as its persona. After verify and before the PR opens, the session dispatches it as a fresh subagent with a path brief, and a host that cannot launch one runs it in the session. It reports to the session, which fixes what it reports, for at most two rounds. It never approves, never posts, and never flips a PR ready.
- **Nested dispatch is unverified.** The review splits files and passes across subagents of its own, and whether a dispatched subagent can launch more is unprobed on each host. Where it cannot, the review sweeps the passes itself, one after another, and prints the same coverage line. The child checks Claude Code and records Codex as a host limitation.
- **Retired.** `prism-pr-review` moves to `.ai-skills/deprecated/prism-pr-review/`, a folder the build and the generators do not read, so the skill can come back. Its reconcile stop gate goes with it: the hook module, its registration on both hosts, and its doctor and prune handling. `prism update` removes the old skill directories and agent files and the `SubagentStop` entry from a consumer. The names Briar and Eric, and the phrases "review pr" and a PR URL, keep routing to `prism-review`. It accepts a PR number or URL and reviews that range read-only through `gh`, which keeps the built-in `/review` overridden.
- **Exit rule and rounds.** As the Review part above says. The confirm pass after the cap stays, with the cap at two. A Critical or Major left after round 2 does not stop the run. It goes to the draft PR as an inline comment, as any open review item does.
- **Scope.** The acceptance criteria and the task list are the yardstick for the diff. No finding is raised on the prose of `intent.md`, `spec.md`, or `plan.md`, so the pass that fixed plan drift in place goes. Published docs, code comments, and the changelog earn a finding only when they are wrong about the code.
- **Never-reviewed paths.** `reviewIgnore` in `.ai-skills/config.json` lists globs in the manifest route dialect. Unset, it defaults in the hook runtime, as `stopPaths` does: plan folders, working notes (`.prism/lessons.md`, `.prism/retros/**`, `.prism/audits/**`, `.prism/metrics/**`), the generated host directories, and every path PRISM delivers. A list that is set replaces the default. PRISM's own config sets a narrower list, so its skills and rules stay reviewable for being wrong about a script or contradicting another rule, and never for wording. A test holds the default's delivered paths equal to the PRISM-owned globs in `ownership.ts`. The PR body is never reviewed either, by a line in `REVIEW.md`.
- **The guard.** The intent has the script that posts findings reject a listed path. Nothing posts findings to GitHub any more, so the guard sits where findings are written and sent: `review/record.mjs` rejects a finding whose cited path is listed, both when it writes the round line and when the session checks a decision item before posting it to the draft PR as an inline comment.
- **Labels.** `effort:*`, `confidence:*`, `review:has-minors`, the `prism-verdict` marker, and the label keys in the config schema and in `reconcile.mjs` are removed. Reconcile keeps threads, human comments, and the misses log.
- **Record line.** `- review round <n> at <short sha>[ (part <k> of <m>)]: <verdict>`, and a `- review confirm at <short sha>` line after the cap. `clean` means zero Critical and zero Major open. A line written with the old `self-review` or `pr-review` prefix stays valid wherever a script reads one. A legacy flat plan keeps `## Review Issues`, which the session writes.
- **Human comments on the draft PR.** After a push, the session runs reconcile and logs each unlogged human comment as a misses row, since no reviewer is left to log one. `reconcile --classes` still feeds the retro.
- **Merge.** `mainSessionMayMerge` keeps its meaning. The bar is a final review line of `clean` and green CI, with no label to read. `git-conventions.md` and the merge Decisions say so. A reviewer never merges.
- **Model.** `prism-review` takes the stronger model setting of the two skills it replaces, and `modelTiers.overrides` is keyed on Briar, not Eric.

### Tools per stage, records by script

- **Declared tools.** Every stage skill declares `tools` in its frontmatter, and the generator writes the list into the Claude agent file's `tools:` for a stage that runs as an agent. A stage the session runs itself carries the list as a declaration, and a test pins every list.
- **Verify and review.** Neither gets Edit or Write. Review keeps read, search, shell, and dispatch tools. Verify keeps read and shell. `review/record.mjs` and `verify/record.mjs` write their records, and a stage's commit goes through `plan/commit.mjs`.
- **What it proves.** A stage with a shell can still write through it, so this is friction and not a wall. The field names for the tool list are unchecked against each host's docs, and the child checks them. A host that takes no tool list for a stage gets the declaration only, and the gap goes in `hook-runtime.md` as a host limitation.

### Small size

- **Limits.** A ticket is small when its diff against the default branch has at most 100 changed lines of product code, at most one new product file, every product file in one area, and no changed file on a stop path. Product code is every changed file except tests (`testGlobs`), docs (the configured docs root and any `.md`), plans (`.prism/plans/**`), lockfiles, and config files (`*.json`, `*.yml`, `*.yaml`, `*.toml`). A file's area is its directory cut to two segments. A stop-path file counts whatever its class, so a manifest edit is never small.
- **The script.** `size.mjs <base>` reads the diff and prints `small` or `standard` with each reason it is over, and exits 1 when over. It reads `stopPaths` and `testGlobs` from the config and adds no config key.
- **Flow.** Intent, implement, verify, review, draft PR, close. There is no spec, no task plan, and no challenge. The intent stage proposes `size: small` with its reason, and the person approves the size with the intent.
- **Records.** `approve.mjs` copies `plan-small.md` to `plan.md` when it approves a small intent, filling the title, ticket, and approval lines. The file holds Verification, Review, and PR Readiness and no Tasks, so each record script has one place to write, and nothing edits the approved intent, which would void its approval. The intent's "no plan" is read as no task plan.
- **Commits.** The subject is `PRISM-NNNN: <summary>`, built from `ticketPrefix`, the ticket form `tasks.mjs` already reads. With no tasks, the commit gate's weakened-tests and stop-path checks deny a removed test line or a stop-path file, which is right, because those changes are not small.
- **Outgrowing.** The implement stage runs `size.mjs` before each commit, and the commit gate denies a commit whose would-be tree is over, naming the script's reasons. The change then goes on as a standard ticket. The person re-approves the intent with `size: standard`, since the size was approved with it.
- **Resume.** Each row names the sizes it applies to. A small ticket has one row of its own, an approved intent with no commit after it, which runs implement. The rows from verify on apply to small and standard alike.

### Lean plan and intent

- **Template cuts.** Applied to `plan.md` and `plan-small.md` as the Plan folder part says. The plan-authoring section-ownership table loses History and Sessions for folder plans, and the retro stops reading History.
- **Task bar.** `implementation-task-detail.md` is rewritten for folder-plan tasks: files, proof, dependencies, and at most two gotcha lines. The part that fixes Pixel's mock specs stays. The task text written so a cheaper model could build from it is cut.
- **Builders.** The implement and plan skills set no `model:` of their own, so both run on the session's tier. A test fails if the implement role sets a cheaper one.
- **Build report.** It drops the History line. The workflow text and the implement and docs skills are edited to match, and `shipping-flow.md` syncs the PR body from commits and scope changes, not from History.
- **Approach lines.** `approve.mjs` refuses an intent whose Approach is missing or has a blank line, and `prism-intent` interviews for it. An already-approved intent is not rechecked.
- **Orientation.** `session-orientation.md` skips Battery Persistence on a folder plan. A flat plan keeps it.

### Close and the retro report

- **Close step.** It runs on every folder plan and cannot be declined. It writes a verdict under each Decision, the `Retro:` and `> Closed:` lines, and the lessons exits, and commits as `retro: <summary>`. With no report it writes `Retro: none — no trigger`.
- **Report trigger.** `retro-trigger.mjs <plan folder>` prints each reason and exits 0 when the report is due. A reason is a challenge round numbered 3 or higher, any review line that is not `clean` (which covers a review that reached its cap), or a task carrying `amended`. The report is the existing retro charter, run on those plans only.
- **The check.** The retro-line lint keys on `> Closed:` with an empty `Retro:` line, and on a `Retro:` path that names no file. It cannot detect a retro nobody ran, because no recorded event marks the stage before the close line. The resume table drives the stage.

### Always-on budget

- **The number.** The rules with `load: always` in `.prism/rules/` total at most 5,000 words, counted after the frontmatter and split on whitespace. The build check fails above it, and the target is about 4,000, for headroom. The intent's lower figure is not enforced, because a floor would reward cutting policy that earns its words.
- **If it cannot fit.** When the plan finds the set cannot fit without cutting policy, it records an open Decision with the real number, and the ceiling stands until Hunter resets it.
- **Cut first, tier second.** A rule moved to `load: skill` is charged to every skill that cites it, so moving a long rule trades the word budget for the 120-line cap. Content that fails the four tests is cut. A rule that governs one area loads by `paths`.
- **Starting list, not a decision.** `workflow.md` shrinks to the sizes and the resume table. `branch-plan.md` is the largest rule, so it is cut to the folder-plan lifecycle. The long voice and scope rules (`writing-voice.md`, `followup-scope.md`, `git-conventions.md`) load by path or skill.
- **Where it shows.** `AGENTS.md` shrinks because it inlines the always-on rules, and the build recomputes the `.codex/config.toml` limit. A consumer's own custom rules are theirs, so no consumer-side check exists.
- **Order.** The check lands in the same child that gets the set under the ceiling.

## Affected systems

```text
.ai-skills/skills/**
.ai-skills/deprecated/**
.ai-skills/definitions/**
.ai-skills/config.json
.ai-skills/config.schema.json
.prism/rules/**
.prism/architect/**
.prism/references/**
.prism/templates/**
.prism/review/**
.prism/metrics/**
.prism/spec/adrs/_toolkit/**
.prism/plans/prism-*/**
.prism/lessons.md
.githooks/**
.gitattributes
scripts/ai-skills/**
templates/install/**
docs/**
AGENTS.md
CLAUDE.md
REVIEW.md
CHANGELOG.md
package.json
.claude/**
.codex/**
.cursor/**
```

The three host directories are generated by `pnpm prism:build`. They are listed because every child commits their regenerated output.

## Children

Each child is a standard ticket with its own GitHub issue, filed under #499 when the child starts. Its plan folder is `.prism/plans/prism-<n>/`, named for that issue, and its branch carries the same number. A child cannot share the epic's number: `extractTicketId` reads one ticket ID from a branch name, so every `prism-499-*` branch would resolve to the epic folder.

Child 1 is the intent and this spec, landed by #512 and amended by #518 and again on 2026-11-26. It edits the epic folder and has no folder of its own. A child also lands what "Carried in from the 2026-11-18 tips" names for it.

| # | Name | What lands | Proves |
| --- | --- | --- | --- |
| 1 | Intent and spec | The amended intent and this spec | Nothing to run. The stack has an agreed design on `main` |
| 2 | Git hooks | `.githooks/`, the `gitHooks` config key, `prism hooks install`, the session-start install, the doctor check, the superseding ADR, the push-gate dedupe | A commit with an unformatted staged file is refused. A foreign `core.hooksPath` is left alone |
| 3 | Codex budget | The lead-section list and its test, the size report, the `.codex/config.toml` write, the doctor warning | Routing and the behavioral norms end inside 32 KiB. A live Codex run reads the raised limit, or the fallback is recorded |
| 4 | Chain scripts | Templates, frontmatter, lookup, the archive search, tasks, bundles, commit, auto-approve, stop paths, the citation lint, the shell parser port | Every suite passes. A plan with two tasks on one file is rejected |
| 5 | Chain skills | `prism-intent`, `prism-spec`, `prism-architect`, the `prism-plan` and `prism-challenge` rewrites, `prism-implement` and `prism-docs` as commit-only stages, `prism-design` as a stage, the workflow block and its lead-section entries, the rule edits, `prism-user-stories` removed, the approval script, chat approval, and the approve guard | A ticket runs from a typed `approve` to committed bundles with no person starting a stage. An agent running the approval script with no token is denied |
| 6 | Review and verify | `REVIEW.md`, the pass files, `prism-verify`, the two review rewrites, reconcile, the misses log, watch-ci, the fixed retro and its check, grading moved out of `prism-qa-plan`, `prism-review-loop` removed, `prism-audit` reading plan folders | Both reviews print one coverage line per pass. A plan with an empty `Retro:` line fails the check |
| 7 | Personas | Voice blocks, the cap allowance, the unique-name check, `prism-debug`, the ADRs | A skill with a 12-line Voice block passes the cap and one whose Voice block runs past 16 lines is charged for the rest. "Sasha" routes to `prism-debug` |
| 8 | Agent hooks | The existing gates moved onto the shell parser, the secrets, brief, commit, and reconcile gates, the `gated` flag, the kill-switch behavior, consumer architect routes | Each gate passes its three-leg test on Claude Code. Codex gaps are recorded |
| 9 | Release | Version `1.0.0`, the migration note, the docs | A fresh `prism adopt` and an upgrade both pass `prism doctor` |

The approval script, chat approval, and the approve guard all land in child 5. They must not ship apart: a script an agent can run freely is worse than no script. The guard reads shell commands through the parser child 4 ports.

Children 4 and 5 are thrive's one large PR cut in two. Child 4 is inert until child 5 uses it, and it is reviewable as code with tests. If the cut makes child 4's review harder than it is worth, `prism-plan` may merge them.

Rows 1 to 9 record what those children delivered, and they are merged. Where the third amendment changes what a row built, the child below changes it, and the row stays as it was. The tickets for the children below are filed under #499 when each starts, and the Ticket column is blank until then.

| # | Name | What lands | Proves | Ticket |
| --- | --- | --- | --- | --- |
| 10 | One review | The review exit rule and two rounds, the plan-as-yardstick scope, the `reviewIgnore` list with its default and `review/record.mjs` guard, `prism-self-review` renamed `prism-review` as a gated subagent, `prism-pr-review` moved to `.ai-skills/deprecated/`, the reconcile stop gate and its registrations removed, labels and the verdict marker removed from reconcile and the config schema, the PR-review step out of the shipping flow and the resume table, the merge bar, the removal handling for `prism update`, and the superseding ADR | A diff touching only a never-reviewed path yields no finding, and `record.mjs` rejects one aimed at it. A round with zero Critical, zero Major, and two Minors records `clean`. An upgrade from the shipped `1.0.0` tree leaves no `prism-pr-review` skill and no `SubagentStop` entry. "Eric" routes to `prism-review` | |
| 11 | Stage tools | The `tools` frontmatter field and its generator support, a declaration on every stage skill, no Edit and no Write for verify and review, `verify/record.mjs`, the pinning tests, and the host limits in `hook-runtime.md` | The generated review and verify agent files list no Edit and no Write. A verify run's record is written by the script and passes `check-report.mjs` | |
| 12 | Lean plan and intent | The plan template without History and Sessions, Decisions narrowed, the two-line task cap in the task parser, the intent's Approach lines and their check in `approve.mjs`, the rewritten task-detail rule, the build report without a History line, the shipping flow's body sync, the orientation edit, the builder-tier pin, and the ADR that supersedes part of ADR-0033 | `approve.mjs` refuses an intent with no Approach. `tasks.mjs` exits 1 on a task with three prose lines. A plan copied from the template has no History or Sessions. A test fails when the implement role sets a cheaper model | |
| 13 | Close and retro report | `retro-trigger.mjs`, `prism-retro` split into the close step and the triggered report, `Retro: none — no trigger`, the rekeyed retro-line lint, the close ceremony text in `branch-plan.md`, the resume and shipping-flow rows for the close, and the ADR that amends ADR-0068 again | A plan with a review line that is not `clean` reports the trigger. A clean plan closes with `Retro: none — no trigger` and no report. A plan with `> Closed:` and an empty `Retro:` fails the lint | |
| 14 | Small size | `size.mjs`, `plan-small.md`, the copy in `approve.mjs`, `size: small` in the intent template and the intent stage, the commit gate's size arm with its three-leg test, the small resume row, the workflow text, and the docs | A 90-line one-area diff reports `small`. A 120-line diff and a manifest edit report `standard`. The commit gate denies an outgrown commit on a small branch. Approving a small intent writes a `plan.md` with Verification, Review, and PR Readiness and no Tasks | |
| 15 | Always-on budget | The word counter and its build check at 5,000 words, the rules re-sorted and cut to fit, `workflow.md` cut to the sizes and the resume table, its approval and scope-change text moved into the stage skills, `AGENTS.md` and the `.codex/config.toml` limit rebuilt | The check fails on a fixture set over the ceiling and passes on the shipped set. The shipped set totals at most 5,000 words. Every skill stays under the 120-line cap or its allowlist entry. The lead-section test passes | |
| 16 | Release refresh | The `1.0.0` changelog entry and migration note updated for the retired PR reviewer, the renamed review skill, the removed labels, the small size, the lean plan, and the budget, and a docs sweep over the pages those change | A fresh `prism adopt` and an upgrade from the shipped `1.0.0` tree both pass `prism doctor`, and the pack-parity check passes. The package version stays `1.0.0` | |

Child 10 is the largest. When its plan counts more than ten changed files, it ships as a two-PR stack cut at the line between the rename and retirement, which goes first and leaves the rulebook as it is, and the rulebook change, which goes second. Each part then leaves a working review.

## Merge order

1, then 2 and 3 in either order, then 4, 5, 6, 7, 8, 9. Children 1 to 9 are merged. After them: 10, then 11 and 12 in either order, then 13, 14, 15, 16.

- 2 and 3 depend on nothing but the intent. They go first so every later child commits through the git hooks.
- 5 needs the parser and the templates from 4, and extends the lead-section list from 3.
- 6 needs the plan folder from 4 and 5.
- 7 comes after 6 so the Voice block is added once to each rewritten skill.
- 8 needs the task parser and stop paths from 4, and reconcile from 6.
- 10 goes first of the rest so every later child runs on the two-round review.
- 11 needs `review/record.mjs` from 10.
- 12 follows 10 because the review reads the lean plan, and 13 follows 12 because the retro reads a plan with no History.
- 14 needs the verify record from 11, the plan template from 12, and the close step from 13.
- 15 comes after the children that edit rules, because it cuts text they settle, and its check cannot land until the set fits.
- 16 is last.

After child 16 merges, the npm package is published by hand, per the publishing guide.

## Decisions

- **The port follows the thrive branch tips, not the Kitchen Line guide.** The guide was last updated on 2026-11-09 and the branches moved after it: the small size, the kill switch, the file-claim check, the five-minute approval window, the 12-task cap, and the stop at a blocking round 3 are all gone at the tips. The small size comes back here on Hunter's 2026-11-26 ruling, with limits of its own.
- **PRISM's hook runtime is the base, with thrive's shell parser ported in.** PRISM already owns delivery to consumers, host gating, marker ownership, and doctor checks, and thrive has none of those. Thrive's parser handles wrappers, `-c` strings, and directory tracking, which the new gates need and PRISM's splitter lacks. Considered: adopting thrive's runtime whole. Rejected, because every consumer-facing part would have to be rebuilt on it.
- **The loaded-line cap keeps counting references.** Considered: thrive's count of the skill body only. Rejected, because a moved line still costs the run that loads it, and phase 1 already paid to cut those lines.
- **Kill switches stay for consumers.** Considered: thrive's no-switch position. Rejected for a shipped toolkit, because a consumer hit by a hook bug has no way to patch it and would be blocked until the next release. The two gates that guard secrets and approval ignore the switches.
- **Plans stay undeletable.** Considered: thrive's rule that a closed plan may be deleted. Rejected, because ADR-0047's reasons still hold here: audits and retros walk the live tree.
- **Merge authority keeps its flag and changes its bar.** Thrive lets no agent merge. PRISM keeps `mainSessionMayMerge` for its own PRs, which a consumer has to set by hand. The bar is a final review line of `clean`, meaning zero Critical and zero Major, and green CI. The `review:has-minors` label it once read is gone.
- **The small size returns, with a size gate on commits.** The 2026-11-18 amendment dropped it and the 2026-11-26 one restores it, so a commit that outgrows the small limits is denied again. Considered: leaving the check to the implement stage alone. Rejected, because the intent says an outgrown change stops, and a prose step is a request and not a stop.
- **Git hooks ship, reversing part of ADR-0076.** Hunter asked for them on 2026-11-17. ADR-0076's objections were that a git hook cannot prompt the model, can be skipped with `--no-verify`, needs a per-clone step, and fires for humans. The commit gate will deny `--no-verify` for agents once child 8 lands, and firing for humans is the point. Until then an agent can still skip the hooks, and the ADR says so. The per-clone step is reduced, not removed: setup scripts, the agent session-start hook, and doctor cover most clones, and a person who uses none of them has no git hooks. Child 2 writes the ADR.
- **Voice returns, reversing part of ADR-0080.** That ADR rejected "a thin opening line" of persona voice by name. The amended intent brings back a block of about a dozen lines, on thrive's finding that voice is what makes a persona recognizable across a long session and that only the "how this persona thinks" sections repeated rules. The four tests and the cap stand. Child 7 writes the ADR.
- **The session ships on a folder-plan branch, amending ADR-0003.** That ADR has the authoring persona commit, push, and open the PR. On a folder-plan branch the implement and docs stages commit only, and the session's PR stage pushes once for code and docs together. Reviewers still never ship. Flat-plan branches keep ADR-0003 as written. Child 5 writes the ADR.
- **The close step cannot be declined on a folder plan, and the report runs on a trigger, amending ADR-0068.** That ADR made the retro a nudge a person may decline with a recorded reason. Child 6 made it a fixed stage that always wrote a report, and child 13 splits it: the close step always runs, and a script decides whether the report does. Flat plans keep the declinable form. Child 13 writes the ADR.
- **The epic folder keeps its name and its phase-1 plan.** The convention is `epic-<id>/` with no `plan.md`. This epic's folder is `prism-499/` and holds the phase-1 plan, which ADR-0078, ADR-0079, and ADR-0080 cite by path. Renaming or moving it would break those citations for no gain. New epics follow the convention.
- **Chat approval is Claude Code and Codex only.** It needs a prompt-submit hook, and Cursor has no hook delivery. A Cursor user approves from a terminal with the keypress, which works on every host.
- **`AGENTS.md` may exceed 32 KiB.** Hunter decided this on 2026-11-17. The file is ordered so the first 32 KiB holds what drives the run, and the limit is raised in the repo's Codex config.
- **After an approved intent, only an intent-level question reaches the person.** Hunter ruled on 2026-11-18 that the challenge passes through unless a finding is a major change to the intent or its foundation, with `prism-architect` deciding which. #2937 as first written still asked the person when the confirm round blocked. The version folded into #2859 at db3570975 carries the leftovers as open Decisions and sends a major finding to the architect first, which matches the ruling. PRISM ports the tip with one difference: the tip's Scope changes paragraph asks the person directly about a changed acceptance criterion or a change that contradicts one of their rulings. PRISM sends both to `prism-architect` first, since both are part of the intent, and the architect forwards them to the person.
- **No task cap on auto-approval.** A cap sent a sound plan to a person for its size alone, and pushed the planner to fold tasks together to fit. The other conditions are about risk and stay.
- **One review, before the PR opens, and no PR reviewer.** Hunter ruled on 2026-11-26 that PRISM needs one reviewer skill, run as a sub-agent with two rounds. `prism-self-review` becomes `prism-review`, and `prism-pr-review` moves to `.ai-skills/deprecated/`, which the build does not read, so it can come back. Considered: keeping both and trimming the PR reviewer. Rejected, because a second review of the same diff reads the same rulebook and costs a round for what the first already swept. It supersedes the parts of ADR-0011 and ADR-0078 that name Eric and the labels. Child 10 writes the ADR.
- **Minors never gate.** The exit rule is zero Critical and zero Major. A Minor is fixed inside a round when it can be, and a review that ends at its cap with only Minors passes. This removes the bookkeeping exemption, which existed to keep one kind of Minor from gating.
- **Review reads the plan folder and never reviews it.** The review process writes the plan's bookkeeping sections, so reviewing them fed itself. The acceptance criteria and tasks are the yardstick for the diff and nothing in the folder is a finding. A list of never-reviewed paths in config holds the plan folder, working notes, generated files, and everything PRISM delivers, and PRISM's own config narrows it so its skills and rules stay reviewable.
- **The never-reviewed guard lives in the record script.** The intent puts it in the script that posts findings. The PR reviewer was the poster, so the guard sits in `review/record.mjs`, which writes the round line and checks each decision item the session posts.
- **A small ticket keeps a record-only `plan.md`.** The intent says a small ticket has no plan. Records need a file, and writing them into the approved `intent.md` would void its approval, so the approval script copies a short `plan-small.md` with no tasks. Considered: records in `intent.md`. Rejected, for the voided approval.
- **The retro-line lint cannot see a retro nobody ran.** With the PR reviewer gone, no recorded event comes before the close line, so the lint checks the close line and the resume table drives the stage. Considered: keying the lint on a final review line. Rejected, because the review is final before the PR opens, so the first push would fail CI until the retro commit followed.
- **The always-on ceiling is 5,000 words and the build fails above it.** Hunter gave a range of 3,000 to 5,000 and left the number to this spec. The top of the range is the ceiling, because the always-on set measured about four times that, and the check lands only in the child that gets under it. The plan records an open Decision with the real number when policy cannot fit.
- **The release waits.** `1.0.0` merged as child 9 and was never published. It publishes after child 16, per Hunter's ruling that 1.0 means the Kitchen Line port is done as he now sees it.
- **OPEN — TBD, needs a live Codex run.** Whether Codex honors `project_doc_max_bytes` in a repo-level config. **Default path (used until resolved):** child 3 writes the key and `prism doctor` prints the per-developer setting as a fallback.
