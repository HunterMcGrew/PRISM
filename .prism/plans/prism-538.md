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
- **A child's acceptance criteria stay in `plan.md`, not in its spec.** Winston proposed a `## Acceptance criteria` section in the child spec, which would change `REVIEW.md`, `.prism/review/intent-scope.md`, and `prism-self-review`. `intent-scope.md` already reads a folder with no intent from `plan.md`'s `## Acceptance Criteria`, and every PRISM-499 child already did that. The one rulebook edit is in `intent-scope.md`'s criterion-defect route, which names `prism-plan` as the owner on an epic child's folder.
- **A child's `epic:` must name an intent that reads `size: epic`.** Self-review found any approved sibling intent satisfied the check, so an agent-written spec could borrow an unrelated ticket's approval. The size line is already in every intent, so the check costs one read.
- **`wanted` is not a hedge, and `'d` is.** "it's what I wanted, approved" reports a past fact and approves, and "I'd approve this one" is a condition, the same as "I would".
- **The hedge check scans the whole sentence before the match, not three words.** "if there is an epic like this, i approve the epic" puts the condition seven words back. A false negative costs the person one more message, and a false approval stamps a file.
- **The guard compares paths through `realpathSync.native`.**
  - **Root cause:** `[Deduced]` from CI run 44587940829. The Windows temp dir is `C:\Users\RUNNER~1`, an 8.3 short name that JS `realpathSync` keeps, so the delegated copy's long `APPROVE_SCRIPT` never equals the payload's short spelling. The prompt arm passed and the execution arm failed, which fits a path-spelling mismatch.
  - **Chosen approach:** `.native` in `isChatApproveCommand`, `findSessionCopy`, and `findCheckout`, which expands short names. Not reproduced locally; the Windows leg passed at 830991fc (run 44589622597).
- **The guard delegates only to a checkout of the same repository.** Eric found delegation reached any checkout holding a guard copy. Both checkouts must share `git rev-parse --git-common-dir`, and the tests use a real `git worktree add` pair plus a negative case for an unrelated repo.
- **The `workflow.md` hedge clause lands in part 2, not part 1.** Eric asked for it on #539, but part 2 rewrites the same paragraph, and part 1's `AGENTS.md` lead sections ended at byte 31,737, 7 bytes under the 31,744 working line PRISM-522 and PRISM-530 set (1 KiB under Codex's 32,768). `agents-md-budget.test.ts` enforces only 32,768, so by the test part 1 had 1,031 bytes; the working line is a convention no test holds.
- **Part 1 is merged into part 2, not rebased,** because part 2 was already pushed and `git-conventions.md` forbids rebasing a shared branch.
- **A child must be listed in its epic's `## Children`.** Eric found `checkIntent` proved the named folder was an approved epic but never read `child:`. `auto-approve.mjs` now requires a `## Children` row in the epic's `spec.md` whose first cell, backticks aside, equals `child:`, so an agent-written spec can't claim an unrelated approved epic.
- **On an epic child, "the intent" every review reader names is the epic's `intent.md`.** One sentence in `.prism/review/intent-scope.md` covers every pass file, and `prism-self-review` and `prism-challenge` name the epic route where they read the intent.
- **A child's acceptance criteria are agent-written in `plan.md` with no person-approved source.** Eric's decision item, accepted as shipped: Hunter's 2026-11-19 ruling says approving the epic approves its children, and every PRISM-499 child already worked this way.
- **Trailing hedges still approve** ("approve it if the tests pass"). Eric's observation, left as is: the reported messages put the hedge first, and a condition after the verb is arguably an approval. A follow-up PR off `main` if it bites.

---

## History

- 2026-11-19 [huntermcgrew/prism-538-epic-children-approve-guard]: Filed #538 and fixed both approve-guard bugs (part B tasks 1–4).
- 2026-11-19 [huntermcgrew/prism-538-epic-children-approve-guard]: Part A tasks 5–13: epic child folders, the intent condition in `auto-approve.mjs`, and the `spec.md` anchor in `tasks.mjs`; see Decision: An epic child is a folder with `spec.md` and `plan.md` and no intent.
- 2026-11-19 [huntermcgrew/prism-538-epic-children]: Fixed PR-review round 1 on both parts: Windows path spelling and same-repo delegation (part 1), `## Children` membership, epic intent routes in review readers, and the hedge clause in `workflow.md` (part 2).
- 2026-11-19 [huntermcgrew/prism-538-epic-children]: Part 1 (#539) squash-merged as fd6ddcd6 after a clean round 3; part 2 retargeted to `main` and took `origin/main` by merge, with no force-push, because the merged tree matched its own.

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

---

## Review Issues

Self-review round 1 at 49388842, over both commits (part 1 of 2 is 24d3907b, part 2 of 2 is 49388842). All ten passes ran; `pnpm run prism:check` exits 0 on this head.

AC grades: AC-1 met (executed: parser test passes, and main's guard records approvals for both messages). AC-2 met (executed: the two "another checkout" tests pass, and main's guard names `../main/...` from a second checkout). AC-3 met (executed: registration warning test). AC-4 met (executed: `prism:check` exit 0). AC-5 met (executed: intent cases pass; main's `auto-approve.mjs` has no intent check, by inspection). AC-6 met (executed: stacked-child test; main's script anchors on `intent.md` only, by inspection). AC-7 met (executed: `agents-md-budget.test.ts`).

### Hedge set misses the `'d` contraction

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `scripts/ai-skills/hooks/plan/chat-approval.mjs:105`
- **Problem:** `CONTRACTED_FUTURE` is `/'ll$/`, so `I'd approve this one` parses as an approval and records a token, while `I would approve this one` (in the test list) does not.
- **Class:** hedge or modal forms the word set misses, so a sentence that talks about approving still approves.
- **Sweep:** `grep -n "HEDGES\|CONTRACTED_FUTURE" scripts/ai-skills/hooks/plan/chat-approval.mjs` shows the two sites; 28 probe sentences run through `parseApprovePrompt`, and only the `'d` form got through among the earlier-position hedges.
- **Suggested fix:** widen the contraction pattern to `/'(?:ll|d)$/` and add `I'd approve this one` to `NOT_APPROVALS`.

### The delegation target is trusted by `cwd` alone, and the header's known-misses list doesn't say so

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `scripts/ai-skills/hooks/approve-guard.mjs:125`
- **Problem:** with a payload `cwd` inside any git checkout that holds a file at `scripts/ai-skills/hooks/approve-guard.mjs`, the guard runs that file and passes its output through. A stub copy that prints nothing turns every deny into an allow (run: a scratch repo holding a no-op guard, `cwd` set to it, `node scripts/ai-skills/hooks/plan/approve.mjs x.md` returns the deny from the real cwd and empty output from the scratch one). The header says a new bypass shape goes on the known-miss list, and this one is not on it. `runSessionCopy` also ignores `child.error`, so a spawn failure writes no stderr line, against the header's "every error writes one stderr line".
- **Class:** a new bypass or trust shape missing from a file's own known-misses list.
- **Sweep:** `grep -n "Known misses" scripts/ai-skills/hooks/approve-guard.mjs` (one list, line 125) and `grep -n "known misses" .prism/architect/_toolkit/hook-runtime.md` (points at the header); neither names the delegation.
- **Suggested fix:** add one clause to the known-misses list ("a copy of this file in another checkout the session's `cwd` sits in, which the guard hands the event to"), and write one stderr line when `child.error` is set.

### The child-spec gate is only in step 3, so step 1 and the done-when list contradict it

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `.ai-skills/skills/prism-spec/shared.md:13`
- **Problem:** step 1 says to read `intent.md` and return `blocked` on a missing approval, and the final checklist says every intent criterion has a requirement. A child folder has no `intent.md`, and the child-mode paragraph sits in step 3 under the epic bullets. A subagent that follows the file in order blocks on every child.
- **Class:** a mode added in a later section of a stepwise skill while the earlier gate still reads as unconditional.
- **Sweep:** `grep -n "intent" .ai-skills/skills/prism-spec/shared.md` (lines 12, 13, 22, 28, 66 all assume an own intent); the other three edited skill sources condition the child case in the sentence that states the rule.
- **Suggested fix:** in step 1, add "For an epic child, the intent is the epic's, read per step 3", and in the done-when list, "every criterion in the intent or the child's row".

### `## Acceptance Criteria` ownership still names only the intent stage

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `.prism/architect/_toolkit/plan-authoring.md:39`
- **Problem:** the section-ownership table says the intent stage generates a plan's acceptance criteria. For an epic child, `prism-plan` now writes them into `plan.md`, so a reader of the table looks for an intent that doesn't exist. `.prism/review/intent-scope.md` § Grading a criterion has the same owner gap: it sends a criterion defect to `prism-intent` on a plan folder.
- **Class:** behavior change with no shared symbol, so prose that describes the old owner survives.
- **Sweep:** `git grep -n "Acceptance Criteria" -- .prism/architect/_toolkit/plan-authoring.md .prism/review/intent-scope.md` (lines 39, 40 and line 17 of the review file).
- **Suggested fix:** one clause in each: "the plan stage, for an epic child".

- pr-review round 1 at 1c8d51b (part 1 of 2): 0 critical, 1 major, 2 minor, 0 nit
- pr-review round 1 at 580af0da (part 2 of 2): 0 critical, 1 major, 3 minor, 0 nit
- pr-review round 2 at 830991fc (part 1 of 2): 0 critical, 0 major, 1 minor open (stale delegation header comment)
- pr-review round 2 at 4761e654 (part 2 of 2): 0 critical, 0 major, 0 minor, 1 nit
- pr-review round 3 at 58bd694d (part 1 of 2): clean

### Three pass files read the intent without the epic route (#540, nit)

- **Severity:** `nit`
- **Status:** `fixed` in part 2
- **File:** `.prism/review/intent-scope.md:3`
- **Problem:** a pass subagent reads only its own pass file, so `regressions.md`, `security.md`, and `contracts.md` didn't see `intent-scope.md`'s epic-route sentence.
- **Suggested fix:** name the epic's `intent.md` in each of the three lines.

### Guard header still describes delegation to any checkout (#539)

- **Severity:** `minor`
- **Status:** `fixed` in 58bd694d
- **File:** `scripts/ai-skills/hooks/approve-guard.mjs:22`
- **Problem:** the module header said delegation reaches "another checkout", after 830991fc limited it to a worktree of the same repository.
- **Suggested fix:** reword to "another worktree of the same repository", and say a different repository's checkout runs this copy.

### Execution arm fails on Windows (#539, #540)

- **Severity:** `major`
- **Status:** `fixed` in 830991fc (Windows leg green, run 44589622597)
- **File:** `scripts/ai-skills/hooks/approve-guard.mjs:596`
- **Problem:** the "another checkout" execution-arm test denies on `windows-latest`.
- **Suggested fix:** `realpathSync.native`; see Decision: The guard compares paths through `realpathSync.native`.

### Delegation reaches unrelated checkouts (#539)

- **Severity:** `minor`
- **Status:** `fixed` in 830991fc
- **File:** `scripts/ai-skills/hooks/approve-guard.mjs:572`
- **Problem:** any git checkout holding the guard file got the event.
- **Suggested fix:** require a shared `--git-common-dir`.

### `workflow.md` states the old approval predicate (#539)

- **Severity:** `minor`
- **Status:** `fixed` in part 2
- **File:** `.prism/rules/workflow.md:14`
- **Problem:** the Approval paragraph didn't name the hedge exclusion.
- **Suggested fix:** add the hedge clause at source and rebuild.

### `checkIntent` never reads `child:` (#540)

- **Severity:** `minor`
- **Status:** `fixed` in part 2
- **File:** `scripts/ai-skills/hooks/plan/auto-approve.mjs:212`
- **Problem:** a spec could name any approved epic it isn't a child of.
- **Suggested fix:** require a matching `## Children` row.

### Review readers point a child at its own `intent.md` (#540)

- **Severity:** `minor`
- **Status:** `fixed` in part 2
- **File:** `.prism/review/intent-scope.md:28`
- **Problem:** five readers of "the intent" had no epic route.
- **Suggested fix:** one sentence in `intent-scope.md`, plus the route in `prism-self-review` and `prism-challenge`.

### No line says a child runs the standard stages (#540)

- **Severity:** `minor`
- **Status:** `fixed` in part 2
- **File:** `.prism/rules/workflow.md:10`
- **Problem:** the resume table's `standard,` rows depend on it.
- **Suggested fix:** one sentence on the epic bullet, and reword `prism-spec`'s child line.

### Still open (decision items)

- **An `epic:` line names any approved intent.** `checkIntent` accepts any sibling folder whose `intent.md` reads `status: approved`, so a spec written by the agent can point at an unrelated approved ticket. It is still tighter than main, which checked no intent. Recommend adding one condition: the named intent reads `size: epic`.
- **The hedge scan blocks real approvals.** `I read the epic and it's what I wanted, approved <file>.md`, `looks good and should be fine, approved <file>.md`, and `it will cost one more night, but approved` all return no approval, because the scan covers the whole sentence. Recommend keeping the Decision as written, and dropping `wanted` from `HEDGES` since it reports a past fact.

## Debugged Issues

### Delegated guard denies its own approve command on Windows

- **Status:** `fixed` (Windows leg green at 830991fc, run 44589622597)
- **Severity:** Major
- **Confidence:** `Medium`
- **Environment:** GitHub Actions `windows-latest`, run 44587940829
- **File:** `scripts/ai-skills/hooks/approve-guard.mjs:596`
- **Root cause:** `[Deduced]` JS `realpathSync` keeps the 8.3 short name `RUNNER~1`, so the session copy's path never equals the payload-spelled path.
- **Steps to Reproduce:**
  1. Run `approve-guard.test.ts` on Windows.
- **Expected behavior:** the execution arm passes the session checkout's `approve.mjs`.
- **Actual behavior:** it denies; the prompt arm in the same setup passes.
- **Recommended fix:** `realpathSync.native`.
- **Suggested tests:** the existing "another checkout" tests on the Windows leg.
- **Ticket:** `N/A`

## Cleanup Items

- None.

## PR Readiness

- [x] No critical or major issues (four minor open)
- [x] Types correct (`pnpm run prism:check` includes `check-types`)
- [x] No stray debug artifacts
- [x] Tests written for new logic (the guard, parser, intent condition, and spec anchor each have cases)
- [x] All debugged issues resolved (none recorded)
- [x] Build passes, last run 2026-11-19 (`pnpm run prism:check` exit 0)
- [ ] PR description up to date (no PR yet)
- [ ] Lasting decisions promoted (at close; the epic-child decision is an ADR candidate)

**Last updated:** 2026-11-19
