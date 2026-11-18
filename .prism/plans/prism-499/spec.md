---
title: AI-native SDLC for PRISM — spec for the Kitchen Line port
stage: spec
status: draft
intent: intent.md (amended 2026-11-18)
ticket: https://github.com/HunterMcGrew/PRISM/issues/499
created: 2026-11-17
checked_against: PRISM main at 8d27c235; thrive branch tips f071dfcca (#2844, re-read at 3507ce9e1 on 2026-11-18), 2bbbbcf49 (#2847), 51a3d7d20 (#2853), 458045f9f (#2854), 424dcbda2 (#2859); #2859 again at db3570975 on 2026-11-18, after #2937 was folded into it
---

# Spec: the Kitchen Line port

This spec turns the amended intent into a design and cuts it into child PRs. Phase 1 is done and is not repeated here. Each child gets its own plan folder, written by `prism-plan`, with tasks at full detail. This file holds the decisions those plans build from.

Thrive is the reference implementation. Where this spec says "port", the child copies thrive's file at the tip named above and changes only what the "Swaps" section lists. Where it says "adapt", the design is thrive's and the code is PRISM's.

## Requirements

1. A ticket can run from an approved intent to a draft PR with no person starting a stage.
2. A fresh session can tell the next stage from the plan folder alone.
3. Only a person can approve an intent or a design.
4. Two writers never claim the same file.
5. Both reviews run the same passes, and a human catch the agent missed is recorded.
6. The rules in the intent's Hooks section stop the action when broken, on every host that exposes the event.
7. Everything a consumer receives reads its commands, paths, and globs from the consumer's config.
8. Every legacy flat plan keeps working.
9. A Codex session gets the workflow block even when it reads only the first 32 KiB of `AGENTS.md`.

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
| Review | `prism-self-review` | exists, runs `REVIEW.md` |
| PR review | `prism-pr-review` | exists, subagent, Eric |
| Retro | `prism-retro` | exists, fixed last stage |
| Approach questions | `prism-architect` | new, Winston |
| Diagnosis | `prism-debug` | new, Sasha |
| Test-first rules | `tdd` | exists |

### Plan folder

Port thrive's four templates into `.prism/templates/`: `intent.md`, `design.md`, `spec.md`, and `plan.md`. Thrive's `plan-small.md` is not ported, because there is no small size.

- **Frontmatter on every chain file:** `title`, `ticket`, `stage`, `status`. An approved file adds `approved_by`, `approved_at`, and `approved_via: chat` when approved through chat.
- **`intent.md`** adds `size` (`standard` or `epic`). Sections: Problem, Proposed outcome, Regression surface, Security surface, Design, Acceptance criteria, Open questions.
  - A surface accepts `none — <why>`. A bare "none" fails approval.
  - Design opens with `needed`, `supplement`, or `not needed`, plus a reason. A supplement adds `approval: required` or `not-required`. A `needed` design always requires approval.
  - Acceptance criteria may be `none — <why>` only on an epic.
- **`design.md`** adds `approval`. Its sections are thrive's, with the state list cited from `prism-design` and not restated.
- **`spec.md`** is never approved. Sections: Requirements, Design, Affected systems. Affected systems is a fenced block with one glob per line. An epic spec adds Children, Merge order, and Decisions, and gains a Retro section when the epic's retro runs.
- **`plan.md`** sections: Tasks, Challenge, Decisions, History, Sessions, Verification, Review, PR Readiness. The `Retro:` line lives under PR Readiness.
- **Task shape:** heading `### T<n>: <summary>`, with fields `files`, `proof`, `proof fails on main`, `depends on`, and `behavior change`. The parser also accepts `amended` and `new dependency`.
- A folder counts as a plan only when it holds a chain file.
- **Lookup order:** `<id>/`, `<id>.md`, `epic-<id>/`, `epic-<id>.md`, then a `ticket:` field scan. This extends the folder tier phase 1 added to `resolveLivePlan`.
- `resolveLivePlan` keeps its contract and never reads `.prism/archived/`, because the gates that call it must not treat a frozen record as a branch's live plan. A separate archive search serves the readers that want history, such as the audit and the retro.
- The existing flat-plan template in `branch-plan.md` stays for legacy plans. The rule gains the folder shape and loses nothing a flat plan needs.

### Workflow block and resume table

Port thrive's `## Workflow` block into `AGENTS.md` and `CLAUDE.md` as generated content, so the two cannot drift. It carries the stage order, the stops, the caps, and the resume table. The resume table is thrive's fourteen rows with PRISM's paths.

Caps: 20 subagents, 3 writers on disjoint files, 3 rounds per stage, 3 CI-fix pushes, 2 re-dispatches of a blocked bundle. A plan challenge whose round 3 still blocks gets a confirm round outside the 3, rerun once after an architect verdict.

The block's Approval, Limits, and Scope changes paragraphs come from #2859 at db3570975, which carries the approve-once change. They encode the intent's "Where the run stops for a person":

- **Ask once.** The plan and intent stages land every pending edit before asking for `approve`.
- **Rulings are approvals.** A chat answer to a question the run asked approves the edit that writes it down, in the person's words. An approved `plan.md` keeps its approval through an edit outside `## Tasks`.
- **Confirm round.** When round 3 blocks, the plan stage fixes the findings and dispatches round 4. A `needs-replan` amendment gets the same confirm round.
- **Architect before person.** Scope ideas go to `prism-architect`, and a "proceed" goes ahead as a Decision. A confirm round lets the plan through unless a finding is major. With only non-major findings it writes `round <n>: carried <count>`, a form only a confirm round may use, and each carried finding is fixed or becomes an `OPEN` Decision. A major finding, one that looks like a change to the intent or its foundation, makes the round `blocking`, which holds auto-approval. The stage dispatches `prism-architect` with the plan folder and the finding. On a verdict that it is not intent-level, the stage fixes it that way or records it as an `OPEN` Decision, then runs the confirm round again with the verdict in the brief. The person is asked only when the architect judges the finding intent-level, and only when the build cannot go on without the answer.
- **Re-plan.** A `needs-replan` build report appends tasks and never renumbers, reruns `bundles.mjs`, runs one challenge round and its confirm round, then `auto-approve.mjs --check`.
- **Open items.** Every `OPEN` Decision a run leaves is listed in the PR body and the closing summary.

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
| `reconcile.mjs` | Resolves addressed agent threads, corrects labels, reports unanswered human comments | Adapt. Markers, labels, and the PR template path come from PRISM |
| `plan-folder-citations.ts` | Fails a plan folder that holds a section-sign citation or a `see Decision:` citation | Port into the existing lint set, with an allowlist |

The citation lint carries an allowlist of plan files written before it existed. `prism-499/plan.md` is on it, because the phase-1 plan is the record of a finished phase, full of section-sign citations and rewriting it would change history for no reader. The allowlist can only shrink.

Each script ships with a suite named `*.test.ts`, the only pattern `run-tests.ts` discovers, so `pnpm prism:test` runs it. Thrive's suites are `*.test.mjs` and are renamed on the way in.

### Review

- `REVIEW.md` sits at the repo root and ships to consumers. Port thrive's structure whole: severity, finding kinds, finding shape, coverage line, exit rule, rounds, and the ten passes with their triggers.
- Pass files live in `.prism/review/`, one per pass. PRISM ships the generic checks. Onboarding adds the consumer's stack checks, the way it already generates per-team rules.
- Pass 9, Contracts, ships with generic triggers: a migration, an ADR, or a stored or exported shape.
- The range rule names the repo owner from config.
- Exit rule: zero Critical, Major, or Minor apart from decisions only a person can make, every nit fixed or declined with a reason, and every pass swept or not applicable.
- The bookkeeping exemption in `followup-scope.md` stays. It is PRISM's and does not conflict.
- The review-misses log is `.prism/metrics/review-misses.jsonl`, append-only, created by its first row.
- The existing summary-comment marker keeps its spelling, per the phase-1 Decision.

### Verify

`prism-verify` runs a closed set of checks, each mapped to a `commands.*` key: typecheck, lint, test, build, and format. It runs once per head, fixes nothing, and writes the Verification section. A consumer adds checks through config. Thrive's Pest, Storybook, and workspace mapping are not ported.

### Retro

- The retro is the last stage and is not offered or declined. `branch-plan.md` loses the "declined" form for folder plans.
- A check fails a folder plan whose `Retro:` line is empty once its PR review verdict exists. This closes the phase-1 Decision that deferred `> Retro:` enforcement.
- The retro reads unmet acceptance criteria from the review and grades the rest itself.
- It reads `reconcile --classes` and proposes a fix for any class at three or more, a hook first and a `REVIEW.md` line last.
- Lessons exit as promoted, expired at 90 days, or merged.

### Personas

- **Voice block.** Port thrive's ADR-0054 shape: an identity line, an optional scene line, a tone line, three or four signature lines, and one greeting instruction. It sits right after the job statement.
- **Cap.** `measureSkillLoad` skips the first 16 lines of each `## Voice` section. Nothing else about the count changes.
- **Eric needs no registry change.** PRISM's `roles.json` has two role types, `persona` and `utility`, and `prism-pr-review` is already a persona role named Eric. Thrive had to widen its registry to name him, and PRISM does not. What he gains here is a Voice block that shows in chat and never in a GitHub comment.
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
| Reconcile stop | subagent stop for `prism-pr-review` | Stopping while reconcile reports unclean, up to three times | review |

- **Defaults.** The secrets gate, the brief gate, the approve guard, and the commit gate are on wherever the hook runtime is delivered. The plan-dependent commit checks fire only on a folder-plan branch, so a consumer who has not started using plan folders sees only the flag denies. ADR-0076's two gates, `hooks.commitCleanupPass` and `hooks.pushVerification`, stay opt-in.
- **`gated` roles.** `roles.json` gains an optional `gated` flag, set on the roles that run as subagents from a plan folder. The agent-hooks child adds it.
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
- The build prints the size of `AGENTS.md` and of the always-on set. Nothing fails on the number.
- When `codex` is among the hosts, onboarding and `prism update` write `project_doc_max_bytes` to the repo's `.codex/config.toml`, merged with any keys already there. The value is the file size rounded up to the next 64 KiB, with one step of headroom.
- `prism doctor` warns when `AGENTS.md` is larger than the configured limit, or larger than 32 KiB with no limit configured.

### Always-on rule edits

Each edit lands in the child that makes it true:

- `git-conventions.md`: task subjects, one commit per bundle, and a folder-plan `plan:` commit whose staged set is the plan folder. Child 8 also changes the `--no-verify` line from "unless the user explicitly asks" to never, since its commit gate denies it.
- `branch-plan.md`: folder plans, the fixed retro, no declined form for folder plans, and the folder form of a plan-only commit. Child 4 drops its History guidance's `see Decision:` recommendation for plan folders, in the same PR as the lint that rejects it.
- `skill-routing.md`: the new skills, the debug and architect rows, who pushes.
- `session-orientation.md` and `response-shape.md`: no change planned.

No other rule or architect doc is rewritten. A child edits one only where its own change makes the text wrong.

### Carried in from the 2026-11-18 tips

These come from thrive's tips after the spec was first pinned, and land in the child named:

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

## Affected systems

```text
.ai-skills/skills/**
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
package.json
.claude/**
.codex/**
.cursor/**
```

The three host directories are generated by `pnpm prism:build`. They are listed because every child commits their regenerated output.

## Children

Each child is a standard ticket with its own GitHub issue, filed under #499 when the child starts. Its plan folder is `.prism/plans/prism-<n>/`, named for that issue, and its branch carries the same number. A child cannot share the epic's number: `extractTicketId` reads one ticket ID from a branch name, so every `prism-499-*` branch would resolve to the epic folder.

Child 1 is the intent and this spec, landed by #512 and amended by #518. It edits the epic folder and has no folder of its own. A child also lands what "Carried in from the 2026-11-18 tips" names for it.

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

## Merge order

1, then 2 and 3 in either order, then 4, 5, 6, 7, 8, 9.

- 2 and 3 depend on nothing but the intent. They go first so every later child commits through the git hooks.
- 5 needs the parser and the templates from 4, and extends the lead-section list from 3.
- 6 needs the plan folder from 4 and 5.
- 7 comes after 6 so the Voice block is added once to each rewritten skill.
- 8 needs the task parser and stop paths from 4, and reconcile from 6.

After child 9 merges, the npm package is published by hand, per the publishing guide.

## Decisions

- **The port follows the thrive branch tips, not the Kitchen Line guide.** The guide was last updated on 2026-11-09 and the branches moved after it: the small size, the kill switch, the file-claim check, the five-minute approval window, the 12-task cap, and the stop at a blocking round 3 are all gone at the tips.
- **PRISM's hook runtime is the base, with thrive's shell parser ported in.** PRISM already owns delivery to consumers, host gating, marker ownership, and doctor checks, and thrive has none of those. Thrive's parser handles wrappers, `-c` strings, and directory tracking, which the new gates need and PRISM's splitter lacks. Considered: adopting thrive's runtime whole. Rejected, because every consumer-facing part would have to be rebuilt on it.
- **The loaded-line cap keeps counting references.** Considered: thrive's count of the skill body only. Rejected, because a moved line still costs the run that loads it, and phase 1 already paid to cut those lines.
- **Kill switches stay for consumers.** Considered: thrive's no-switch position. Rejected for a shipped toolkit, because a consumer hit by a hook bug has no way to patch it and would be blocked until the next release. The two gates that guard secrets and approval ignore the switches.
- **Plans stay undeletable.** Considered: thrive's rule that a closed plan may be deleted. Rejected, because ADR-0047's reasons still hold here: audits and retros walk the live tree.
- **Merge authority is unchanged.** Thrive lets no agent merge. PRISM keeps `mainSessionMayMerge` for its own PRs, which a consumer has to set by hand.
- **No small size, so no size gate on commits.** The amended intent has two sizes. The earlier rule that a commit outgrowing the small limits is blocked has nothing left to check.
- **Git hooks ship, reversing part of ADR-0076.** Hunter asked for them on 2026-11-17. ADR-0076's objections were that a git hook cannot prompt the model, can be skipped with `--no-verify`, needs a per-clone step, and fires for humans. The commit gate will deny `--no-verify` for agents once child 8 lands, and firing for humans is the point. Until then an agent can still skip the hooks, and the ADR says so. The per-clone step is reduced, not removed: setup scripts, the agent session-start hook, and doctor cover most clones, and a person who uses none of them has no git hooks. Child 2 writes the ADR.
- **Voice returns, reversing part of ADR-0080.** That ADR rejected "a thin opening line" of persona voice by name. The amended intent brings back a block of about a dozen lines, on thrive's finding that voice is what makes a persona recognizable across a long session and that only the "how this persona thinks" sections repeated rules. The four tests and the cap stand. Child 7 writes the ADR.
- **The session ships on a folder-plan branch, amending ADR-0003.** That ADR has the authoring persona commit, push, and open the PR. On a folder-plan branch the implement and docs stages commit only, and the session's PR stage pushes once for code and docs together. Reviewers still never ship. Flat-plan branches keep ADR-0003 as written. Child 5 writes the ADR.
- **The retro cannot be declined on a folder plan, amending ADR-0068.** That ADR made the retro a nudge a person may decline with a recorded reason. A folder plan runs it as a fixed stage. Flat plans keep the declinable form. Child 6 writes the ADR.
- **The epic folder keeps its name and its phase-1 plan.** The convention is `epic-<id>/` with no `plan.md`. This epic's folder is `prism-499/` and holds the phase-1 plan, which ADR-0078, ADR-0079, and ADR-0080 cite by path. Renaming or moving it would break those citations for no gain. New epics follow the convention.
- **Chat approval is Claude Code and Codex only.** It needs a prompt-submit hook, and Cursor has no hook delivery. A Cursor user approves from a terminal with the keypress, which works on every host.
- **`AGENTS.md` may exceed 32 KiB.** Hunter decided this on 2026-11-17. The file is ordered so the first 32 KiB holds what drives the run, and the limit is raised in the repo's Codex config.
- **After an approved intent, only an intent-level question reaches the person.** Hunter ruled on 2026-11-18 that the challenge passes through unless a finding is a major change to the intent or its foundation, with `prism-architect` deciding which. #2937 as first written still asked the person when the confirm round blocked. The version folded into #2859 at db3570975 carries the leftovers as open Decisions and sends a major finding to the architect first, which matches the ruling. PRISM ports the tip with one difference: the tip's Scope changes paragraph asks the person directly about a changed acceptance criterion or a change that contradicts one of their rulings. PRISM sends both to `prism-architect` first, since both are part of the intent, and the architect forwards them to the person.
- **No task cap on auto-approval.** A cap sent a sound plan to a person for its size alone, and pushed the planner to fold tasks together to fit. The other conditions are about risk and stay.
- **OPEN — TBD, needs a live Codex run.** Whether Codex honors `project_doc_max_bytes` in a repo-level config. **Default path (used until resolved):** child 3 writes the key and `prism doctor` prints the per-developer setting as a fallback.
