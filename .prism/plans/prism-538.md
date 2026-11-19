# Plan: prism-538

## Ticket

https://github.com/HunterMcGrew/PRISM/issues/538

## Goal

An approved epic carries its children without asking the person again, and the approve guard records chat approvals from a worktree session and only for messages that give one.

---

## Implementation Tasks

### Clove (implementation), part B: the approve guard

1. `scripts/ai-skills/hooks/plan/chat-approval.mjs`: `parseApprovePrompt` skips a sentence with `to` right before the approve word or a hedge (`if`, `could`, `will`, `want`, …, or an `'ll` contraction) anywhere earlier in it. Proof: `npx tsx --test scripts/ai-skills/plan-chat-approval.test.ts`, with Hunter's two messages from 2026-11-19 as no-approval cases.
2. `scripts/ai-skills/hooks/approve-guard.mjs`: when the payload's `cwd` sits in another checkout that holds a copy of the guard at the same repo-relative path, run that copy on the same argv and stdin and pass its output through. Proof: the two "another checkout" tests in `scripts/ai-skills/approve-guard.test.ts`, which fail on `main`.
3. `.claude/settings.json`: PRISM's own `UserPromptSubmit` registration checks the guard file exists, and when it doesn't, prints `systemMessage` and `additionalContext` JSON saying chat approvals aren't recorded. Proof: `scripts/ai-skills/approve-guard-registration.test.ts`.
4. `.prism/architect/_toolkit/hook-runtime.md` and its curated twin under `templates/install/`: document the hedge rule and the worktree hand-off.

### Clove (implementation), part A: an approved epic carries its children

A child folder `.prism/plans/<child>/` holds `spec.md` and `plan.md` and no `intent.md`. The child spec's frontmatter carries `epic: <epic folder name>` (a folder name such as `prism-499`, not a ticket ID) and `child: <first-column value of its Children row>`. Its acceptance criteria live in `plan.md`'s `## Acceptance Criteria`, where `.prism/review/intent-scope.md` already reads them for a folder with no intent.

5. `scripts/ai-skills/hooks/plan/auto-approve.mjs`: add a condition, reported like the others under a new `intent` key, that passes when the folder's `intent.md` reads `status: approved`, or when there is no `intent.md` and `spec.md`'s frontmatter has an `epic:` value whose `.prism/plans/<value>/intent.md` reads `status: approved`. Read status through `approvalLines` from `frontmatter.mjs`. An `epic:` value holding `/`, `\`, or `..`, a missing epic folder, a draft epic intent, and a folder with neither an intent nor an `epic:` line all fail with a message naming the file. Proof: new cases in `scripts/ai-skills/plan-auto-approve.test.ts` (own intent approved, own intent draft, child under an approved epic, child under a draft epic, missing epic folder, traversal value, no intent and no `epic:`), and every existing fixture there gets an approved intent so its outcome is unchanged.
6. `scripts/ai-skills/hooks/plan/tasks.mjs` `loadPlanState`: anchor the done range on the commit that first added `intent.md`, else `spec.md`, whichever exists first in that order. A folder holding only `plan.md` keeps the `origin/<defaultBranch>..HEAD` fallback. Update the file's header comment. Proof: a test in the tasks suite where a child folder with `spec.md` and no intent, on a branch stacked on a sibling's `T1:` commit, reads its own `T1` as open.
7. `.prism/templates/spec.md`: add `epic:` and `child:` frontmatter keys with a comment that both are for an epic child only and are deleted otherwise.
8. `.ai-skills/skills/prism-spec/shared.md`: add child mode. Dispatched with an epic folder and a Children row, it reads the epic's `intent.md` (must read `status: approved`, else report `blocked`), the epic's `spec.md`, and that row (must exist, else `blocked`), and writes `.prism/plans/<child>/spec.md` with `epic:` and `child:` set, scoped to the row. A row that names a system missing from the epic spec's `## Affected systems` goes in its report as a scope change, not into the spec.
9. `.ai-skills/skills/prism-plan/shared.md` Startup: the approved intent it requires is the folder's `intent.md`, or for a child (spec has an `epic:` line) the epic's. For a child, the plan writes `## Acceptance Criteria` in `plan.md`, derived from the child's Children row and its spec, with IDs and Evidence lines per `.prism/templates/acceptance-criteria.md`, and the coverage check reads those.
10. `.ai-skills/skills/prism-architect/shared.md` dispatched mode, and `.ai-skills/skills/prism-intent/shared.md` Size bullet: the first reads the epic's intent for a child. The second says an approved epic intent covers its children, and no child gets an intent of its own.
11. `.prism/rules/workflow.md`: the epic bullet says what a child folder holds and that the epic's approved intent covers it; the approval paragraph says an epic intent's approval covers its children; the epic resume row says `prism-spec` writes the child's spec in its own folder. Pay for the added bytes by cutting the three sentences Winston named (stage-skill restatement, the Cursor terminal sentence, the unreadable-config sentence), each owned elsewhere. Proof: `npx tsx --test scripts/ai-skills/agents-md-budget.test.ts` after `pnpm run prism:build`.
12. `.prism/architect/_toolkit/plan-chain-scripts.md` § Auto-approval, § Tasks and subjects, § Templates; `.prism/architect/_toolkit/ticket-workflows.md` § Epic vs Story and its curated twin; `.prism/references/plan-lookup.md` step 5: describe the child folder, the intent condition, and the `spec.md` anchor.
13. `pnpm run prism:build`, then `pnpm run prism:check`.

---

## Decisions

- **Flat plan, not a plan folder.**
  - **Root cause:** a folder plan opens with an `intent.md` only the person can approve, and the scope here was already set by Hunter's ruling and the side-session brief of 2026-11-19.
  - **Chosen approach:** a flat plan per `branch-plan.md`'s legacy template, so the run doesn't stop on an intent approval for work whose scope is fixed.
- **The guard hands the event to the session checkout's own copy instead of changing the registration command.**
  - **Root cause:** `$CLAUDE_PROJECT_DIR` is the directory the session started in, so a worktree session ran the main checkout's guard. That copy pinned the allowed command to the main checkout's `approve.mjs` (`node ../../../scripts/…`), and when the file was missing, node exited 1 as a non-blocking hook error nobody saw.
  - **Alternatives considered:** resolve the script from the hook's working directory in the command (`$(git rev-parse --show-toplevel)`), which the hooks docs don't pin down; change the consumer registration shape, which `PRISM_HOOK_COMMAND_PATTERN` in `update.ts` and `doctor.ts` match exactly, a shared-utility change.
  - **Chosen approach:** the payload's `cwd` is documented as the worktree root, so the guard reads it and delegates. Consumers commit `.claude/hooks/`, so their worktrees get the fix with no registration change.
  - **Implementation guidance:** delegation happens only when the session copy exists and isn't this file by realpath, so a checkout without a copy, and every existing test fixture, runs the old path.
- **Only PRISM's own `UserPromptSubmit` registration gets the fail-loud wrapper.** The prompt arm is where an approval is lost. A missing guard on `PreToolUse` fails open, which the guard already accepts, and consumer registrations stay in the shape `PRISM_HOOK_COMMAND_PATTERN` claims.
- **An epic child is a folder with `spec.md` and `plan.md` and no intent, and its spec's `epic:` line names the epic whose approved intent covers it.**
  - **Root cause:** Hunter's 2026-11-19 ruling: approving the epic approves its children. The workflow read every child as a standard ticket with its own intent, and with no child `spec.md`, `auto-approve.mjs` always exited 1, so every child plan went to the person.
  - **Alternatives considered:** an intent per child (the status quo the ruling rejects); a stub child `intent.md` auto-stamped from the epic, which keeps every reader unchanged but puts an approval stamp the person never gave on a file, the thing the approve guard exists to stop.
  - **Chosen approach:** Winston's design (fit verdict 2026-11-19, proceed with changes). Lookup, bundles, `approve.mjs`, and `chat-approval.mjs` already handle a folder with no intent. `auto-approve.mjs` gains the intent check, which also closes the gap where a standard folder with a draft intent auto-approved.
  - **Implementation guidance:** ADR candidate at close: it passes all three gates in `.prism/references/triple-gated-adr-criterion.md`.
- **A child's acceptance criteria stay in `plan.md`, not in its spec.** Winston proposed a `## Acceptance criteria` section in the child spec, which would change `REVIEW.md`, `.prism/review/intent-scope.md`, and `prism-self-review`. `intent-scope.md` already reads a folder with no intent from `plan.md`'s `## Acceptance Criteria`, and every PRISM-499 child already did that, so nothing in the review rulebook changes.
- **The hedge check scans the whole sentence before the match, not three words.** "if there is an epic like this, i approve the epic" puts the condition seven words back. A false negative costs the person one more message, and a false approval stamps a file.

---

## History

- 2026-11-19 [huntermcgrew/prism-538-epic-children-approve-guard]: Filed #538 and fixed both approve-guard bugs (part B tasks 1–4).
- 2026-11-19 [huntermcgrew/prism-538-epic-children-approve-guard]: Part A tasks 5–13: epic child folders, the intent condition in `auto-approve.mjs`, and the `spec.md` anchor in `tasks.mjs`; see Decision: An epic child is a folder with `spec.md` and `plan.md` and no intent.

---

## Acceptance Criteria

### Behavioral

- [ ] **AC-1** Given Hunter's two 2026-11-19 messages that discuss approval, When the prompt arm reads them, Then neither writes a token.
  - Evidence (machine): `npx tsx --test scripts/ai-skills/plan-chat-approval.test.ts` passes, and the same two strings return `{ path: null }` from `main`'s parser.
- [ ] **AC-2** Given a session whose `cwd` is a checkout holding its own guard, When the guard runs from another checkout, Then the prompt reply and the deny text name `scripts/ai-skills/hooks/plan/approve.mjs` in the session checkout, and the chat command for that script passes under a token.
  - Evidence (machine): the "another checkout" tests in `scripts/ai-skills/approve-guard.test.ts` pass, and fail with `main`'s guard swapped in.
- [ ] **AC-3** Given PRISM's settings and a project dir with no guard file, When the `UserPromptSubmit` command runs, Then it exits 0 and prints JSON with a `systemMessage` saying approvals aren't recorded.
  - Evidence (machine): the warning test in `scripts/ai-skills/approve-guard-registration.test.ts`.

- [ ] **AC-5** Given an epic child folder with `spec.md` naming an approved epic intent on its `epic:` line and no `intent.md`, When `auto-approve.mjs` runs on a plan meeting every other condition, Then it approves; with a draft epic intent, a missing epic folder, or no `epic:` line, it exits 1 naming the file.
  - Evidence (machine): the intent cases in `scripts/ai-skills/plan-auto-approve.test.ts` pass, and the draft and missing cases fail on `main`'s script, which approves them.
- [ ] **AC-6** Given a child folder with `spec.md` and no intent, stacked on a sibling branch's `T1:` commit, When `tasks.mjs` reads it, Then its own `T1` is open.
  - Evidence (machine): the stacked-child test in `scripts/ai-skills/plan-tasks.test.ts` passes and fails on `main`'s script.
- [ ] **AC-7** `AGENTS.md`'s lead sections still end inside the working line after the `workflow.md` edits.
  - Evidence (machine): `npx tsx --test scripts/ai-skills/agents-md-budget.test.ts` passes.

### Non-behavioral

- [ ] **AC-4** `pnpm run prism:check` passes.
  - Evidence (machine): the command exits 0 on the PR head.

### AC Adjustments

### AC Sync Log

| Date | Agent | Action | Plan | Ticket |
| ---- | ----- | ------ | ---- | ------ |
