# Retro — PRISM-558

**Target:** `.prism/plans/prism-558/plan.md` and `spec.md`, both parts of the stack
**Grain:** per-pr
**Generated:** 2026-11-27
**Graded at:** `791eaba0`, the head of PR #563 (part 2). Part 1 is graded at its merge, `6b97a1d6` (PR #560, final head `886d2790`).

## Charter coverage

This run reached every source `.ai-skills/config.json#retroEvidence` declares: git, the GitHub PR platform (`gh` signed in), and GitHub Actions CI. No source reads `not configured for this team` or `unreachable this run`. All six questions are answered, and one answer waits on CI.

| Charter question | Answer | Sources | Gap |
| --- | --- | --- | --- |
| Did we do what we said? | Yes. All 15 requirements shipped, and AC-1 to AC-15 are met at `791eaba0`. This retro re-ran the machine evidence: the nine test files the criteria name (`plan-templates`, `plan-approve`, `plan-auto-approve`, `plan-folder-citations`, `plan-tasks`, `claude-agent-def`, `skill-loaded-lines`, `role-preloads`, `compact-handoff`) ran 320 tests with 0 failures. The greps for AC-2, AC-3, AC-7 to AC-14 printed as required, and the template's headings read Tasks, Challenge, Decisions, Verification, Review, PR Readiness. Part 2's tests fail without part 2: the three changed test files run against the sources at `c7b56795` fail 20 tests, including every Approach refusal case and both dashed-round cases. AC-16 is met for part 1 and pending for part 2. | `## Tasks`, `## Acceptance Criteria`, `git log`, PR #560 and #563 bodies, local `tsx --test`, greps, a scratch worktree at `c7b56795` | AC-16 on part 2: `CI pending on 791eaba0` (ubuntu passed, windows in progress). AC-4's "fails on `main`" half was not re-run for part 1, which merged before this retro. T3 carries `proof fails on main: yes` and part 1's review ended clean. |
| Were there issues or bottlenecks? | Three. The challenge took four rounds (blocking 3, 1, 3, then resolved 3), and each blocking finding named a build that would have stopped or a criterion that could not pass: `role-preloads.test.ts` pinned `model: sonnet`, the commit gate's weakened-tests check would have refused T1's removed lines, and T3's new result field broke nine existing tests. Part 1's review round 1 found 2 Major, 6 Minor, and 4 nits. And two proofs were wrong as written: T4's `--test-name-pattern` lookahead skips nothing in Node 24, so its proof fails until T14 rebuilds, and T13's grep already passed on `main`. | `## Challenge`, `## Review`, PR #560 body | none |
| What improvements could we make? | Have the plan stage dry-run every task proof, not only the AC evidence. Round 3 of the challenge prescribed T4's lookahead pattern, and nobody ran it before it went into the plan. This is observation only, because the existing lesson "AC evidence commands are code" already covers the class and this extends it to task proofs. | `## Challenge`, PR #560 body, `.prism/lessons.md` | none |
| Did we follow the code standards? | Yes, after review. Verify passed at head `e7a7d763` (base `07ba5288`): typecheck, test, lint, build, and spec, with format `n/a: not configured`. Part 1's round 2 was clean at `67d38b0b`, and part 2's round 1 was clean at `83f0ff6d` with 0 findings. `reconcile.mjs 563 --no-write --json` reports `clean: true`. `pnpm prism:check` also exited 0 on the tree with this retro's edits in it. | `## Verification`, `## Review`, `reconcile.mjs` | The review's mutation check of `approve.mjs` and `auto-approve.mjs` did not run, because a hook blocks source edits during review (PR #563 body). Each refusal case is tested directly instead. |
| Did we do anything wrong, or could we have done better? | Two things. The consumer-pin claim from the epic spec reached ADR-0088 in part 1, although this ticket's own spec already recorded it as false in a Decision. And two surfaces that teach the old Decisions norm were left standing (see Fidelity gap). | `spec.md` `## Decisions`, PR #560 body, `templates/install/AGENTS.md.tmpl`, `compact-handoff.mjs` | none |
| Are the tests passing? | Yes, at every head CI has finished. Part 1's `prism-check` passed on ubuntu and windows at merge. Part 2 passed on ubuntu at `791eaba0`. Verify ran the full suite green at `e7a7d763` and part 1's at `b6725fbd` (2,909 pass, 0 fail), and 320 targeted tests pass locally at `791eaba0`. | `gh pr view --json statusCheckRollup`, `## Verification`, local `tsx --test` | `CI pending on 791eaba0` (windows), owned by the session's watcher |

## Fidelity gap

- **Planned and shipped match on every requirement.** Scope moved only through recorded Decisions: the plan stage running as a subagent, T23 and its widening (both cleared as docs the change makes false), the added `compact-handoff.test.ts` case, and the race on the task-prose allowlist. That race resolved the way the spec's second branch said: child 11 merged after #560, and `prism-557/plan.md` is in `PLAN_TASK_PROSE_ALLOWLIST` on `main`. No Decision was refuted by the execution record, so there are no promotion cautions.
- **A spec Decision did not reach the task that needed it.** The spec's last Decision says the epic's "per-persona pin still wins" sentence is false and that `modelTiers` offers the builder no pin. Part 1's review round 1 still found ADR-0088 citing that pin, as a Major, according to the PR #560 body. T6, the task that writes the ADR, carries no gotcha line about it. One case does not show that two-line tasks lose decisions, because the builder is meant to read the spec. It is the first data point on the cost ADR-0088's Consequences names, and the epic retro should weigh it with PRISM-553 and PRISM-557.
- **The epic spec's false sentence still stands.** `.prism/plans/prism-499/spec.md` line 301 still ends "A consumer's per-persona pin still wins." This ticket's Decision left it for the retro, and the PRISM-557 retro routed it to the main session. This retro does not edit the epic spec either.
- **Two surfaces still teach the old Decisions norm.** `templates/install/AGENTS.md.tmpl` item 5 tells every agent to log any approach choice in `## Decisions`, and `compact-handoff.mjs` line 242 tells a compacted session to write each unrecorded decision there. Both were open items in the PR #560 body and are unchanged at `791eaba0`. REQ-2 named only three surfaces and no criterion grades these two, so the review could not fail them. A consumer's folder-plan agent reads `AGENTS.md.tmpl` and is told the opposite of the lean rule.
- **Other open items, out of scope and listed in the PR bodies.** `docs/workflow.md:32` lists the intent's contents without the surfaces or Approach lines. `plan-chain-scripts.md` does not describe `approve.mjs`'s intent content checks, which was true of the surface checks before this change. Part 1's list holds the rest: the lint field keys not tested against the parser's list, `prism-handoff` still naming `## Debugged Issues` and `## Review Issues`, and a fenced `##` inside a task ending the task section for both the lint and `tasks.mjs`.
- **T21 changed nothing.** The spec said `prism-challenge` documents only the dashed round form. Review round 1 confirmed its `shared.md` already lists the bare form, so no edit was owed, and the plan records it.

## Action Items

- **Scope the two surfaces that still say every plan logs choices in Decisions.** Add "On a plan folder, only scope changes and open questions go here; a routine implementation choice is a commit." to item 5 of `templates/install/AGENTS.md.tmpl`, and the same clause to the post-compact note at `scripts/ai-skills/hooks/compact-handoff.mjs` line 242, then run `pnpm prism:build`. Done when neither text tells a folder-plan session to log an approach choice in `## Decisions`. Traces to the Fidelity gap above. It is a follow-up PR off `main` with no ticket, per `.prism/rules/followup-scope.md`, because it is the same thread as PRISM-558 and small. — proposed owner: Clove → follow-up PR, no new ticket
- **Correct the epic spec's consumer-pin sentence, with the PRISM-557 retro's resume-table item.** Replace "A consumer's per-persona pin still wins." in `.prism/plans/prism-499/spec.md` line 301 with what is true: the builder's model comes from `CLAUDE_AGENT_MODEL_DEFAULTS`, and `modelTiers.overrides` is read only for `briar`. Two retros have now deferred it, so it belongs in the epic's own close. Done when no sentence in the epic spec promises a builder pin. — proposed owner: the main session, as the epic spec's author, at the epic's retro → observation only if Hunter would rather build the pin

## Lessons exits

The 90-day window opens 2026-08-29.

**Promoted (0).** No lesson's rule now lives in a file this run's verdicts name. The one promoted Decision, the dashed round line, has no lesson.

**Expired (0).** Three entries are dated before 2026-08-29, and each is still cited. "Epic plans are preserved, not deleted" is cited by ADR-0047. "AC evidence commands are code" is cited by `.prism/plans/opus5-port.md` and `reviewer-scope-bookkeeping.md`. "A control arm that receives an always-on instruction" is cited by `.prism/rules/writing-voice.md` and `.prism/plans/writing-voice-port.md`. The fourth early heading, "Don't reach for X when Y is available", is the format example inside a code fence and not an entry.

**Merged (0).** No two entries record the same rule.

**Appended (0).** The T4 proof finding is the same class as "AC evidence commands are code", which already tells an author to run a command with an asserted result before it ships. A per-PR retro proposes no lesson candidates, so nothing was appended and the existing entry is unchanged.

## Review-miss classes

`node scripts/ai-skills/hooks/review/reconcile.mjs --classes` printed "No open class has 3 or more rows." So there is no open class, no proposal, and no resolve row to append. `reconcile.mjs 563 --no-write --json` reports `clean: true`, with no unlogged human comment, no thread needing a reply, and no missing PR body heading. The misses log does not exist, since no human comment on either PR was ever logged.

## Citations

### Plan evidence

- `plan.md` `## Decisions`: 10 entries, all given a verdict this run (`no promotion needed`, each with its reason). `spec.md` `## Decisions`: 4 entries. One is promoted, to `plan-chain-scripts.md` (its Auto-approval part carries the leading `- ` clause), and three are ticket tactics or open items routed above.
- `## Challenge`: round 1 blocking 3, round 2 blocking 1, round 3 blocking 3, round 4 resolved 3.
- `## Review`: part 1 round 1 at `bb6ff420` (0 critical, 2 major, 6 minor, 4 nit) and round 2 at `67d38b0b` clean. Part 2 round 1 at `83f0ff6d` clean.
- `## Verification`: `verdict: done`, base `07ba5288`, head `e7a7d763`.

### Execution record

- **PR #560** (part 1): merged as `6b97a1d6`, 94 files, +1449/−470. `prism-check` succeeded on `ubuntu-latest` and `windows-latest`. It has no review objects, issue comments, or inline threads.
- **PR #563** (part 2): an open draft at `791eaba0`, 21 files, +274/−39 against `origin/main`. It has no review objects, issue comments, or inline threads. `prism-check` succeeded on ubuntu and is in progress on windows.
- **Commits after the last review round (`83f0ff6d`):** `4ab6d40c`, `e7a7d763`, and `791eaba0`, all plan-only.

### Per-ticket fidelity

- Every changed path in #563 sits inside the spec's Affected systems.
- Part 1's PR body lists the open items quoted above, and part 2's PR body lists its own. Both bodies state their scope changes.
