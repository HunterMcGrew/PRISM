---
title: AI-native SDLC for PRISM — spec for the Kitchen Line port
stage: spec
status: draft
intent: intent.md (amended 2026-11-17)
ticket: https://github.com/HunterMcGrew/PRISM/issues/499
created: 2026-11-17
checked_against: PRISM main at 8d27c235; thrive branch tips f071dfcca (#2844), 2bbbbcf49 (#2847), 51a3d7d20 (#2853), 458045f9f (#2854), 424dcbda2 (#2859)
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
| Challenge | `prism-challenge` | exists, gains the round grammar |
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
- **`spec.md`** is never approved. Sections: Requirements, Design, Affected systems. Affected systems is a fenced block with one glob per line. An epic spec adds Children, Merge order, and Decisions.
- **`plan.md`** sections: Tasks, Challenge, Decisions, History, Sessions, Verification, Review, PR Readiness. The `Retro:` line lives under PR Readiness.
- **Task shape:** heading `### T<n>: <summary>`, with fields `files`, `proof`, `proof fails on main`, `depends on`, and `behavior change`. The parser also accepts `amended` and `new dependency`.
- A folder counts as a plan only when it holds a chain file.
- **Lookup order:** `<id>/`, `<id>.md`, `epic-<id>/`, `epic-<id>.md`, a `ticket:` field scan, then the same over the archive. This extends the folder tier phase 1 added to `resolveLivePlan`.
- The existing flat-plan template in `branch-plan.md` stays for legacy plans. The rule gains the folder shape and loses nothing a flat plan needs.

### Workflow block and resume table

Port thrive's `## Workflow` block into `AGENTS.md` and `CLAUDE.md` as generated content, so the two cannot drift. It carries the stage order, the stops, the caps, and the resume table. The resume table is thrive's fourteen rows with PRISM's paths.

Caps: 20 subagents, 3 writers on disjoint files, 3 rounds per stage, 3 CI-fix pushes, 2 re-dispatches of a blocked bundle.

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
| `commit.sh` | Commits only the named paths, retries on a locked index | Adapt to `.mjs` |
| `auto-approve.mjs` | Approves a plan with 1 to 12 tasks, every file inside Affected systems, challenge rounds 1 and 2 present with the last not blocking, and no file on a stop path | Port |
| `stop-paths.mjs` | Paths that always need a person | Adapt. Lists come from a new `stopPaths` config key, with dependency manifests as the default |
| `watch-ci.mjs` | Waits for CI on a PR | Adapt. The required check name comes from config |
| `check-report.mjs` | Checks the shape of a Verification section | Port. Thrive's planted fixture is not ported |
| `reconcile.mjs` | Resolves addressed agent threads, corrects labels, reports unanswered human comments | Adapt. Markers, labels, and the PR template path come from PRISM |
| `plan-folder-citations.ts` | Fails a plan folder that holds a section-sign citation | Port into the existing lint set |

Each script ships with a `node --test` suite wired into `pnpm prism:test`.

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
- **Agent roles may carry a persona.** `roles.json` and the sync code allow `persona` on an agent-type role and keep persona names unique. This is what lets `prism-pr-review` be Eric.
- **`prism-architect`.** Chat-only output: Verdict, Evaluation, Suggested approach, Watch for, Open items. It replaces the quick-consult mode inside `prism-plan`. The evaluation sections move from `prism-plan` unchanged.
- **`prism-debug`.** Port thrive's body and trim it to the cap. It changes no file except a lessons entry, and it tags and removes its own temporary logging. The routing phrases for broken behavior move from the implement row to it. This supersedes ADR-0079 for the debugger only.
- **Batteries.** A one-line pointer to `session-orientation.md` loads that rule under PRISM's count. The persona child decides per skill whether the pointer earns its lines.

### Git hooks

- **Files.** A `.githooks/` directory with `pre-commit` and `pre-push`, each a short `sh` shim that calls a `.mjs` file in the delivered runtime. Git for Windows runs `sh` shims.
- **Pre-commit** checks staged files that match the configured globs with the configured format command. It compares against the staged copy and never writes the index.
- **Pre-push** runs the configured lint command over the files the push carries. It skips a ref that is not the checked-out head.
- **Config.** A new `gitHooks` key holds each hook's command and globs. Onboarding fills it from the detected stack. A hook with no command skips with a notice.
- **Skip, don't block,** when node, the tool, or the default branch is missing.
- **Installer.** `prism adopt` and `prism update` set `core.hooksPath` to `.githooks`. They replace only an empty value or one that already points at a `.githooks` directory in the same repo. Any other value is left alone and reported, so husky and lefthook users lose nothing.
- **Doctor** reports whether the hooks are installed.
- **Agent pushes.** The existing `hooks.pushVerification` gate and the pre-push hook would lint twice. The gate stops running lint when the git hook is installed.
- **ADR.** A new ADR records the reversal of ADR-0076's rejection of real git hooks. ADR-0076's agent-side gates stand.

### Agent hooks

Base: PRISM's runtime in `scripts/ai-skills/hooks/`. Port thrive's `tokenize.mjs` and `segments.mjs` as library modules, and move the existing gates onto them. The existing read-credit path keeps its current behavior.

| Gate | Event | Denies | Needs |
| --- | --- | --- | --- |
| Secrets | read, search, and shell tools | `.env` and `.env.*` except `.env.example`, any `secrets/` segment, `*.pem`, `*.key`. Patterns extend through config | nothing |
| Brief | subagent start | A brief over 15 non-blank lines, or one with an override phrase, sent to a role marked `gated` in `roles.json` | nothing |
| Commit, flag half | shell | `-a`, no paths, a whole-repo path, `--no-verify` and its short forms, an inline `core.hooksPath`, more than one commit per command. On push, `--no-verify` and an inline `core.hooksPath` | nothing |
| Commit, subject | shell | A subject that is not a task form on a folder-plan branch. `plan:` may touch only the plan folder | chain |
| Commit, weakened tests | shell | A removed line in a test file that predates the branch, unless a named task lists the file and carries `behavior change:` | chain, and a new `testGlobs` config key |
| Commit, stop paths | shell | A stop-path file with no named task listing it | chain |
| Approve guard | prompt submit, shell, and edit tools | Running the approval script except once under a fresh token. Edits to approval fields. Any touch of the token | chain |
| Reconcile stop | subagent stop for `prism-pr-review` | Stopping while reconcile reports unclean, up to three times | review |

- Every gate fails open on its own errors.
- Remedy text names one action that clears the deny.
- Thrive's screenshot gate, its Docker arms of the secrets gate, and its dev-port work are not ported.
- **Kill switches.** `PRISM_HOOK_DISABLE` and `PRISM_HOOK_DENY_DISABLE` stay. The approve guard and the secrets gate ignore both. The commit gate denies a command that sets either one inline.
- **Hosts.** Codex cannot block at subagent start, so the brief gate logs there. Each such gap goes in `hook-runtime.md` as a host limitation.
- **Proof.** Each gate has the three-leg test thrive uses: the deny fires, a seeded state clears it, and the live remedy clears it.

### Architect routes for consumer code

The write gate is already on by default. The gap is that a fresh install routes only PRISM's own paths. Onboarding writes at least one route over the consumer's source tree, pointing at an architect doc it drafts from the detected stack. A consumer with no architect docs gets a stub doc and one route, per the structural-stub exception in `lazy-artifacts.md`.

### AGENTS.md and Codex

- The generator orders `AGENTS.md` so the workflow block, resume table, routing, and safety rules come first, ahead of the inlined rules.
- A build test asserts those sections end inside the first 32 KiB.
- The build prints the size of `AGENTS.md` and of the always-on set. Nothing fails on the number.
- When `codex` is among the hosts, onboarding and `prism update` write `project_doc_max_bytes` to the repo's `.codex/config.toml`, merged with any keys already there. The value is the file size rounded up to the next 64 KiB, with one step of headroom.
- `prism doctor` warns when `AGENTS.md` is larger than the configured limit, or larger than 32 KiB with no limit configured.

### Always-on rule edits

Each edit lands in the child that makes it true:

- `branch-plan.md`: folder plans, the fixed retro, no declined form for folder plans.
- `git-conventions.md`: task subjects, one commit per bundle.
- `skill-routing.md`: the new skills, the debug and architect rows, who pushes.
- `session-orientation.md` and `response-shape.md`: no change planned.

No other rule or architect doc is rewritten. A child edits one only where its own change makes the text wrong.

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
.prism/plans/prism-499/**
.prism/plans/prism-499-*/**
.prism/lessons.md
.githooks/**
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

Each child is a standard ticket with its own plan folder at `.prism/plans/prism-499-<slug>/`.

| # | Slug | What lands | Proves |
| --- | --- | --- | --- |
| 1 | `kitchen-line-intent` | The amended intent and this spec | Nothing to run. The stack has an agreed design on `main` |
| 2 | `git-hooks` | `.githooks/`, the `gitHooks` config key, the installer, the doctor check, the superseding ADR, the push-gate dedupe | A commit with an unformatted staged file is refused. A foreign `core.hooksPath` is left alone |
| 3 | `codex-budget` | `AGENTS.md` ordering, the size report, the `.codex/config.toml` write, the doctor warning | The workflow sections end inside 32 KiB. A live Codex run reads the raised limit, or the fallback is recorded |
| 4 | `chain-scripts` | Templates, frontmatter, lookup, tasks, bundles, commit, approve, chat approval, auto-approve, stop paths, the citation lint | Every suite passes. A plan with two tasks on one file is rejected |
| 5 | `chain-skills` | `prism-intent`, `prism-spec`, `prism-architect`, the `prism-plan` and `prism-challenge` rewrites, `prism-implement` and `prism-docs` as commit-only stages, `prism-design` as a stage, the workflow block, the rule edits, `prism-user-stories` removed, the approve guard | A ticket runs from a typed `approve` to committed bundles with no person starting a stage |
| 6 | `review-verify` | `REVIEW.md`, the pass files, `prism-verify`, the two review rewrites, reconcile, the misses log, watch-ci, the fixed retro and its check, grading moved out of `prism-qa-plan`, `prism-review-loop` removed, `prism-audit` reading plan folders | Both reviews print one coverage line per pass. A plan with an empty `Retro:` line fails the check |
| 7 | `personas` | Voice blocks, the cap allowance, personas on agent roles, `prism-debug`, the ADRs | The build check passes with Voice blocks in place. "Eric" routes to `prism-pr-review` |
| 8 | `agent-hooks` | The tokenizer port, the secrets, brief, commit, and reconcile gates, the kill-switch behavior, consumer architect routes | Each gate passes its three-leg test on Claude Code. Codex gaps are recorded |
| 9 | `release` | Version `1.0.0`, the migration note, the docs | A fresh `prism adopt` and an upgrade both pass `prism doctor` |

Child 5 carries the approve guard because the guard and the approval script must not ship apart: a script an agent can run freely is worse than no script.

Children 4 and 5 are thrive's one large PR cut in two. Child 4 is inert until child 5 uses it, and it is reviewable as code with tests. If the cut makes child 4's review harder than it is worth, `prism-plan` may merge them.

## Merge order

1, then 2 and 3 in either order, then 4, 5, 6, 7, 8, 9.

- 2 and 3 depend on nothing but the intent. They go first so every later child commits through the git hooks.
- 6 needs the plan folder from 4 and 5.
- 7 comes after 6 so the Voice block is added once to each rewritten skill.
- 8 needs the task parser, the approval script, and reconcile.

After child 9 merges, the npm package is published by hand, per the publishing guide.

## Decisions

- **The port follows the thrive branch tips, not the Kitchen Line guide.** The guide was last updated on 2026-11-09 and the branches moved after it: the small size, the kill switch, the file-claim check, and the five-minute approval window are all gone at the tips.
- **PRISM's hook runtime is the base, with thrive's shell parser ported in.** PRISM already owns delivery to consumers, host gating, marker ownership, and doctor checks, and thrive has none of those. Thrive's parser handles wrappers, `-c` strings, and directory tracking, which the new gates need and PRISM's splitter lacks. Considered: adopting thrive's runtime whole. Rejected, because every consumer-facing part would have to be rebuilt on it.
- **The loaded-line cap keeps counting references.** Considered: thrive's count of the skill body only. Rejected, because a moved line still costs the run that loads it, and phase 1 already paid to cut those lines.
- **Kill switches stay for consumers.** Considered: thrive's no-switch position. Rejected for a shipped toolkit, because a consumer hit by a hook bug has no way to patch it and would be blocked until the next release. The two gates that guard secrets and approval ignore the switches.
- **Plans stay undeletable.** Considered: thrive's rule that a closed plan may be deleted. Rejected, because ADR-0047's reasons still hold here: audits and retros walk the live tree.
- **Merge authority is unchanged.** Thrive lets no agent merge. PRISM keeps `mainSessionMayMerge` for its own PRs, which a consumer has to set by hand.
- **No small size, so no size gate on commits.** The amended intent has two sizes. The earlier rule that a commit outgrowing the small limits is blocked has nothing left to check.
- **Git hooks ship, reversing part of ADR-0076.** Hunter asked for them on 2026-11-17. ADR-0076's objections were that a git hook cannot prompt the model, can be skipped with `--no-verify`, needs a per-clone step, and fires for humans. The commit gate now denies `--no-verify` for agents, the installer runs inside `prism adopt`, and firing for humans is the point.
- **`AGENTS.md` may exceed 32 KiB.** Hunter decided this on 2026-11-17. The file is ordered so the first 32 KiB holds what drives the run, and the limit is raised in the repo's Codex config.
- **OPEN — TBD, needs a live Codex run.** Whether Codex honors `project_doc_max_bytes` in a repo-level config. **Default path (used until resolved):** child 3 writes the key and `prism doctor` prints the per-developer setting as a fallback.
