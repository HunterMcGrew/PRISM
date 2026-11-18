---
title: AI-native SDLC for PRISM — thin skills, artifact chains, and enforced gates
author: Hunter McGrew
stage: intent
status: approved
approved_by: Hunter McGrew
approved_at: 2026-11-18
approved_via: chat
previously_approved: 2026-11-17 (the Kitchen Line amendment) and 2026-10-17 (the version phase 1 was built from), both by Hunter McGrew
amended: 2026-11-18
ticket: https://github.com/HunterMcGrew/PRISM/issues/499
created: 2026-10-17
size: epic
ports: thrive "Kitchen Line" epic THRN-579 — TracTru/thrive #2844 (intent and spec), #2847, #2853, #2854, #2859, read at their branch tips on 2026-11-17, and #2844 again at 3507ce9e1 and #2859 again at db3570975 on 2026-11-18, after the approve-once change (#2937) was folded into #2859
---

# Intent: AI-native SDLC for PRISM

This is the amended intent. The first version was approved on 2026-10-17 and phase 1 was built from it. Thrive kept refining the same workflow after that, and this amendment brings those refinements over. The section "What this amendment changes" lists every decision that moved, so a reader of the first version can see the difference in one place. A second, smaller amendment on 2026-11-18 cuts the run's stops down to what only the person can decide, and is listed under its own heading in that section.

## Problem

Agents build in minutes, but work still waits on people. A developer watches edits, re-reviews code, and starts each skill by hand. PRISM ships that same shape to every team that installs it.

Phase 1 fixed the skill layer. It took PRISM from 33 skills to 29 and from 20,189 loaded lines to 2,518. What is left is the part a developer feels:

- Nothing drives a ticket from one stage to the next. A person still starts each skill.
- Nothing checks that a person approved the scope before the build starts.
- Review guidance is split across two skills and their references, and nothing records what a human reviewer caught that the agent missed.
- The team's rules are prose. An agent in a long or unattended session can skip them.

PRISM is also the product. Whatever shape its workflow takes is the shape every consumer team gets.

## Proposed outcome

A developer approves a one-page intent. The session then runs every stage after it without being asked, and opens a draft PR that is already clean. The developer comes back to read the PR, flip it to ready, and merge.

- Every ticket runs through a committed plan folder: `intent.md`, `design.md` when needed, `spec.md`, and `plan.md`. A fresh session reads the folder and knows which stage is next.
- Each stage is a skill named for its job. Stages that need a cold read run as subagents.
- Both reviews run one rulebook, `REVIEW.md`. What a human reviewer catches is logged, and a miss that keeps recurring becomes a fix to the rulebook or a hook.
- The rules that must always hold are hooks that stop the action. This covers git hooks for everyone and agent hooks for AI sessions.
- A consumer gets the same line through `prism adopt` and `prism update`, with their own commands and paths in place of thrive's.

## Success criteria

In priority order:

1. **First-pass clean PRs.** The human reviewer requires zero changes after the agent review. Preference tweaks count as clean. Domain, logic, and spec misses do not.
2. **Human touches per ticket.** Two on a routine ticket: approve the intent, read the PR. A third only for a design that needs approval, a plan that fails automatic approval, or a change that would alter the approved intent.
3. **Skill size.** Every skill stays at 120 loaded lines or less, enforced by the existing build check. A persona skill's `## Voice` block does not count, up to 16 lines.

Always-on size is reported by the build and is no longer a target. The phase-1 baseline stands and no new baseline is run. The eval harness is not in scope.

## Affected users and systems

- PRISM's maintainer, working on PRISM itself.
- Every consumer team on Claude Code or Codex, through `prism adopt` and `prism update`. Cursor gets the skills and rules but no hooks.
- Systems: `.ai-skills/skills/**`, `.ai-skills/definitions/**`, `.prism/` (rules, architect docs, references, templates, plans, review passes, ADRs), `scripts/ai-skills/**` (build, update, doctor, onboarding, hook runtime), `templates/install/**`, `AGENTS.md`, `CLAUDE.md`, `REVIEW.md`, and `docs/`.

## Regression surface

- **Consumers mid-upgrade.** A `prism update` must leave a consumer's own skills, docs, plans, and existing git-hook setup alone. A consumer who already uses husky or lefthook keeps it.
- **Legacy flat plans.** Every existing `.prism/plans/<ticket>.md` keeps resolving and keeps working. Nothing is migrated.
- **The existing write gate.** The architect-read gate and the umbrella speed bump keep their current behavior while the shell parser under them is replaced.
- **Phase-1 skills.** The 120-line build check keeps passing for every skill that passes today.
- **Windows.** The hook runtime and the new scripts keep running on Windows, which rules out bash-only scripts.

## Security surface

- **Secrets.** Agents get a gate that denies reading `.env` files, key files, and `secrets/` directories. Before this, nothing stopped a secret from landing in a transcript.
- **Approval.** A script and a guard hook keep approval a person's act. The guard stops accidents, not a determined agent. The real control is a person reading the commit that carries the approval.
- **Hook bypass.** Agents can no longer commit or push with `--no-verify`. The two existing kill switches stay for a broken hook, and the approve guard and the secrets gate ignore them.
- **Codex config.** Onboarding writes one key to the repo's `.codex/config.toml`. It writes nothing to a developer's home directory.

## Design

not needed — this work changes skills, scripts, hooks, and docs. It has no user interface.

## Acceptance criteria

none — this is an epic. Each child PR carries its own criteria in its plan, and the spec lists what each child must prove.

## Decisions reached

### Workflow

- There are two sizes. **Standard** is the default and may ship as one PR or a stack. **Epic** is several stories under one tracker parent. There is no small size and no file or line threshold.
- **Standard** runs: intent → design when needed → spec → plan → challenge twice → implement → verify → review → draft PR → PR review → retro.
- **Epic** has a folder with `intent.md` and `spec.md` and no `plan.md`. The spec names the children and their merge order. Each child is a standard ticket.
- No orchestrator skill drives the run. The stage order and a resume table in the always-on workflow block do. A fresh session reads the plan folder and runs the first row that matches.
- Four stages run as fresh subagents because their value is a cold read: spec, challenge, verify, and PR review. Everything else runs in the session.
- Caps: 20 subagents at once, 3 writers on files no other writer touches, 3 rounds per stage. A plan challenge that still blocks after round 3 gets a confirm round, rerun once after an architect verdict, and neither counts against the 3.

### Where the run stops for a person

Once the intent is approved, the run is meant to finish without the person. Questions go to `prism-architect` first, and anything that does not block the build waits for the end.

- **The intent, always.** Approving it also approves the size.
- **The design**, when the intent says it needs approval.
- **The plan**, only when automatic approval fails. The plan stage asks once, after every pending edit has landed, because an edit made after the person's `approve` voids it.
- **A change that would alter the approved intent or its foundation.** This includes a changed acceptance criterion and a change that contradicts one of the person's rulings. Only `prism-architect` can send one to the person, and only when the build cannot go on without the answer.
- **Ready and merge.** Every agent PR opens as a draft.

What does not stop the run:

- **Scope ideas.** A change that follows from the approved outcome goes ahead as a Decision. Anything else a stage thinks of goes to `prism-architect` for a fit verdict, and a "proceed" goes ahead as a recorded Decision.
- **Challenge findings.** A blocking finding is fixed. When round 3 still blocks, the plan stage fixes it and runs a confirm round, which lets the plan through unless a finding is major. Non-major findings are carried: each is fixed where it can be, or recorded as an open Decision, and the plan goes on. A major finding, one that looks like a change to the intent or its foundation, holds the plan and goes to `prism-architect`. When the architect says it is not intent-level, the stage fixes it that way or records it as an open Decision, then runs the confirm round again with the verdict. Only a finding the architect judges intent-level reaches the person.
- **Review findings.** Anything only a person can decide lands on the draft PR.
- **Open items.** Anything non-blocking is recorded as an open Decision and listed in the PR body and the closing summary, for the person to follow up after the run.

The run halts only when going on cannot work: a blocked build, or a second re-plan on one task.

### Artifact chain

- Plan folders live at `.prism/plans/<ticket>/`. Lookup checks the folder first, then the flat file.
- **`intent.md`** requires a regression surface, a security surface, a design need (`needed`, `supplement`, or `not needed`, each with a reason), and acceptance criteria. A surface may be "none" only with a reason.
- The intent stage is an interview: one question per message, each with a recommended answer. Facts the agent can look up are never questions.
- **`design.md`** exists only when the intent asks for it.
- **`spec.md`** is never approved. It holds the requirements and the affected-systems globs the plan is checked against.
- **`plan.md`** holds tasks. Each task names its files, its proof, and what it depends on. Tasks group into bundles, and one bundle is one commit.
- A commit subject names its tasks, such as `T3:` or `T3-T5:`. A task is done when a commit names it. Nothing edits the plan to mark a task done.
- Approval is recorded by a script. In a terminal it needs a keypress. In chat, typing `approve` lets the agent run the script once. That approval is tied to the file's content, so a draft edited after the `approve` is not approved.
- A person's answer in chat to a question the run asked counts as approval of the edit that records it. The agent writes the ruling into the file in the person's words, and the file stays approved. An approved `plan.md` also stays approved through an edit outside its tasks.
- The plan approves automatically when it has at least one task, every file is inside the spec's affected systems, the last challenge round is clean, resolved, or carried, and no file is on a stop path. Otherwise it asks. There is no task limit, because a cap sends a sound plan to a person for its size alone.
- Plan folders hold no section-sign citations, because the files move and get renamed.

### Skills

- Skills stay function-shaped with verb names and the `prism-` prefix, held to the four tests from phase 1.
- **Persona voice comes back as one short block.** A persona skill carries a `## Voice` section of about a dozen lines. It holds no rules, shows in chat only, and is skipped when the skill runs as a subagent. The "how this persona thinks" sections stay gone, because those were the part that repeated rules.
- **New stage skills:** `prism-intent`, `prism-spec`, and `prism-verify`.
- **`prism-architect` is new and is Winston.** It answers "is this the right approach?" at any time, in chat, with no plan folder and no approval. A running stage also sends it scope ideas and unresolved challenge findings, and it returns a verdict to that stage instead of offering a next step. `prism-plan` becomes a persona-less utility that writes `plan.md` and runs the challenge rounds.
- **`prism-debug` is new and is Sasha.** It diagnoses and changes no source. Its report becomes the Problem section of an intent. This reverses the phase-1 deletion.
- **`prism-pr-review` stays Eric** and gains a chat voice that stays out of his GitHub comments.
- `prism-challenge` runs the plan challenge rounds. `tdd` holds the test-first rules the implement stage loads.
- **Folded:** `prism-user-stories` into `prism-intent`. No skill writes user stories.
- **Deleted:** `prism-review-loop`, once `REVIEW.md` and the review rounds inside the stages replace it. Sol, Ren, and Theo stay deleted.
- Acceptance-criteria grading moves out of `prism-qa-plan` and into the review's intent-conformance pass.
- `prism-audit` learns to archive a plan folder whole.
- The 120-line cap keeps counting everything a skill loads. Thrive reached its numbers partly by moving text into references its check does not count. PRISM does not copy that. Content that fails the tests is still cut, not moved.

### Review and verify

- One `REVIEW.md` holds severity, finding shape, the exit rule, and ten passes. Each pass runs only when its trigger fires. The passes' stack-specific checklists come from the consumer.
- `prism-self-review` runs the passes on the branch before anything reaches GitHub, split across subagents. The session fixes what it finds, for at most three rounds.
- `prism-pr-review` runs the same passes on the PR in a fresh context, posts inline comments and one summary, and applies the review labels. It never approves and never flips the PR to ready.
- A reconcile script resolves addressed threads, corrects labels, and reports unanswered human comments. A stop gate sends the PR review back until it is clean, up to three times.
- A human comment the agent missed is logged. A class of miss that reaches three gets a proposed fix, and a person approves each one.
- `prism-verify` runs once after the build, in a fresh context, with the consumer's own commands. It fixes nothing.
- **The retro is the fixed last stage** of every workflow and cannot be declined. It grades the work against the plan, gives every Decision a verdict, and prunes lessons.

### Hooks

- **Git hooks for everyone.** PRISM ships a pre-commit hook and a pre-push hook and installs them through `core.hooksPath`. They run commands from the consumer's config and skip with a notice when the tool is missing. The installer refuses to replace a hook path it does not recognize. This reverses the earlier decision against real git hooks.
- **Agent hooks for AI sessions.** The new gates are the secrets gate, the dispatch-brief gate, the reconcile stop gate, the approve guard, and a wider commit gate.
- The commit gate checks the task subject, weakened or deleted tests, bypass flags such as `--no-verify`, and stop paths. It does not check that every file belongs to the named task. Thrive removed that check, and so does this intent.
- **Architect reads stay enforced by default.** Onboarding writes routes over the consumer's product code, so the gate covers more than PRISM's own files.
- **Kill switches.** PRISM keeps its two existing switches, because a consumer cannot patch a broken hook the way a maintainer can. The approve guard and the secrets gate ignore them, and an agent cannot set one on its own command.
- The gates are built on PRISM's hook runtime, with thrive's shell parser ported in.
- Each hook is registered on Claude Code and Codex wherever the host exposes the event. A missing event is recorded as a host limitation. Cursor hook delivery is not part of this work.
- Commands, paths, test globs, and stop paths come from the consumer's config, never from PRISM's or thrive's toolchain.

### AGENTS.md and the Codex limit

- Codex reads at most 32 KiB of `AGENTS.md` by default and drops the rest without a warning. PRISM's file is about four times that.
- PRISM does not cap `AGENTS.md` at 32 KiB. Claude Code is the primary host, and the always-on rules are a cost already accepted.
- The generator puts the workflow block, the resume table, routing, and the behavioral norms first, so a Codex session that reads only the start still gets the part that drives the run.
- When `codex` is among the hosts, onboarding writes a raised `project_doc_max_bytes` to the repo's `.codex/config.toml`.
- `prism doctor` warns when `AGENTS.md` is over the limit Codex will read.

### Merging and release

- **Merge authority is unchanged.** Consumers keep the human merge gate. PRISM's own PRs keep the `mainSessionMayMerge` flag from phase 1.
- **Plans are still never deleted.** Thrive now allows deleting a closed plan. PRISM keeps its rule.
- **Release.** The port ships as `1.0.0`, a clean break with a migration note. `prism update` removes the deleted skills, and old persona names keep routing.
- **What carries over from thrive.** Only what fits a generic toolkit. Thrive's Docker routing, Storybook and Pest steps, screenshot script, dealer vocabulary rule, tracker-specific ticket flow, and per-worktree dev port stay out.

## What this amendment changes

Against the version approved on 2026-10-17:

- **Sizes.** Small, standard, and epic become standard and epic.
- **Stages.** A design stage, two challenge rounds, and a fixed retro are added. The reconcile step becomes a script and a stop gate inside PR review.
- **Intent.** It gains the required regression, security, and design fields, and holds the acceptance criteria.
- **Personas.** "No personality" becomes a short Voice block. Sasha returns as `prism-debug`. Winston moves to a new `prism-architect`.
- **Approval.** "A keypress the model cannot supply" gains a second route: a typed `approve` in chat, tied to the file's content.
- **Who pushes.** On a plan-folder branch the implement and docs stages commit only, and the session pushes and opens the PR. Before, each authoring skill shipped its own PR.
- **Acceptance criteria.** Grading moves from `prism-qa-plan` into review.
- **Cursor.** Hooks were to be registered on Cursor wherever it exposed the event. Cursor hook delivery is now out of scope.
- **Commit gate.** It no longer holds staged paths to a task's file list.
- **Git hooks.** They are added, reversing the earlier rejection.
- **Size targets.** The 200-line `REVIEW.md` ceiling and the always-on, `CLAUDE.md`, and `AGENTS.md` line targets are dropped. The skill cap stays.
- **Context layer.** The rewrite of rules and architect docs is out of scope. Only edits a child PR needs are made.
- **Retro.** It can no longer be declined.
- **Hooks.** The approve guard is added, and the kill-switch behavior is stated.
- **Codex.** The `AGENTS.md` limit is handled.

### Second amendment, 2026-11-18

Against the version approved on 2026-11-17. Hunter's rulings in chat on 2026-11-18 approve it.

- **Independence.** Once the intent is approved, the run is meant to finish without the person. `prism-architect` takes the questions a stage would have asked, and open items wait for the end.
- **Scope changes.** A change to user-visible behavior, an acceptance criterion, or a new system was asked as its own question. It now goes to `prism-architect`, and reaches the person only when it would change the intent or its foundation.
- **Challenge.** A challenge still blocking after three rounds halted the run. It now gets a confirm round, then `prism-architect`, and only an intent-level finding reaches the person.
- **Approval.** A chat answer counts as approval of the edit that records it, and an approved plan survives edits outside its tasks. The plan stage asks once.
- **Auto-approval.** The 12-task limit is gone.

## Constraints

- An unfinished migration must not freeze routine work. Legacy flat plans keep working until the last one is archived.
- A consumer's own skills, docs, plans, and git-hook setup are never touched by the port.
- Every always-on rule and skill keeps working on all three hosts at every merged step. Hooks and chat approval reach Claude Code and Codex only, and a Cursor user approves from a terminal.
- A skill is deleted only once its replacement exists.
- Design calls that do not change this intent stay with the session or `prism-architect`. Anything that would change it comes back to Hunter.

## Open questions

- **Codex project config.** The Codex docs show a repo-level `.codex/config.toml` and do not list `project_doc_max_bytes` among the keys it ignores there, but they do not say outright that it is honored. The Codex child PR proves it with a live run. If it is not honored, `prism doctor` tells each developer to set it.
- **Approval from a terminal inside a host.** Whether a host's own shell mode counts as a terminal for the approval script is unprobed on thrive too. The chain PR checks it on Claude Code.

## Not in scope

- The eval harness, a metrics store, and a new baseline.
- Auto-approving intents.
- Rewriting the rules and architect docs.
- Cursor hook delivery.
- A generic version of thrive's domain vocabulary rule.
- Thrive-specific infrastructure.
- Changing how consumers merge.
