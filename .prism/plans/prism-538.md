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
- **The hedge check scans the whole sentence before the match, not three words.** "if there is an epic like this, i approve the epic" puts the condition seven words back. A false negative costs the person one more message, and a false approval stamps a file.

---

## History

- 2026-11-19 [huntermcgrew/prism-538-epic-children-approve-guard]: Filed #538 and fixed both approve-guard bugs (part B tasks 1–4).

---

## Acceptance Criteria

### Behavioral

- [ ] **AC-1** Given Hunter's two 2026-11-19 messages that discuss approval, When the prompt arm reads them, Then neither writes a token.
  - Evidence (machine): `npx tsx --test scripts/ai-skills/plan-chat-approval.test.ts` passes, and the same two strings return `{ path: null }` from `main`'s parser.
- [ ] **AC-2** Given a session whose `cwd` is a checkout holding its own guard, When the guard runs from another checkout, Then the prompt reply and the deny text name `scripts/ai-skills/hooks/plan/approve.mjs` in the session checkout, and the chat command for that script passes under a token.
  - Evidence (machine): the "another checkout" tests in `scripts/ai-skills/approve-guard.test.ts` pass, and fail with `main`'s guard swapped in.
- [ ] **AC-3** Given PRISM's settings and a project dir with no guard file, When the `UserPromptSubmit` command runs, Then it exits 0 and prints JSON with a `systemMessage` saying approvals aren't recorded.
  - Evidence (machine): the warning test in `scripts/ai-skills/approve-guard-registration.test.ts`.

### Non-behavioral

- [ ] **AC-4** `pnpm run prism:check` passes.
  - Evidence (machine): the command exits 0 on the PR head.

### AC Adjustments

### AC Sync Log

| Date | Agent | Action | Plan | Ticket |
| ---- | ----- | ------ | ---- | ------ |
