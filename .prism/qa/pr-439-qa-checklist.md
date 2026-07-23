# PRISM — PR QA Checklist

**PR:** [#439 — chore: Port thrive PR 2196 — Worktree lifecycle + removal classifier](https://github.com/HunterMcGrew/PRISM/pull/439)
**Ticket:** none — ticketless port (per `git-conventions.md` § Commit Messages), tracked via plan [`followup-port-2196-worktree-lifecycle.md`](../plans/followup-port-2196-worktree-lifecycle.md), which carries the AC directly since there's no tracker issue to pull them from.
**Scope:** a new worktree entry/removal rule (`.prism/rules/worktree-git.md`), the GREEN/RED/YELLOW removal-safety classifier (`scripts/ai-skills/worktree-classify.ts` + its test suite), Zoe's new explicit-only worktree hygiene lane and Procedure E batch-confirmation gate, and the manifest/mirror/doc registration that makes all of it show up correctly across every generated surface.
**Who this is for:** anyone verifying this PR on a checkout of this repo with `pnpm` available — no separate consumer repo, no UI, no server. Every scenario below is a terminal command plus a git working tree. §3.3's Zoe-lane scenarios additionally need a PRISM agent session (Claude Code or any other host running PRISM skills), since that lane is agent behavior, not a script.
**How to use:** each item records **Pass/Fail** plus short notes on failure. Work through in order — §1 sets up, §2 walks the plan's own acceptance criteria, §3 exercises the classifier and the rule it implements, §4 confirms every generated surface carries the change identically, §5 is the regression sweep on the always-loaded files this PR edited, §6 covers edge cases.

---

## 1. Before you start

- Check out this repo at PR #439's branch (`huntermcgrew/prism-port-2196-worktree-lifecycle`) — a plain `git clone` into a scratch directory plus `git fetch origin huntermcgrew/prism-port-2196-worktree-lifecycle && git checkout FETCH_HEAD` works well if your primary checkout already has this branch open elsewhere. Run `pnpm install` once.
- No feature flags, env vars, or seed data needed. The classifier's own test suite builds disposable fixture repos under your OS temp directory (`mkdtemp`) and cleans them up itself — you don't need `gh` on `PATH` or any real GitHub state for §2–§3.2.
- §3.3 (Zoe's hygiene lane) is the one part of this PR that touches real `git worktree` state on your machine. Don't run its removal step (item 3.3.4) against a worktree you care about — read the dry-run listing and stop there unless you have disposable worktrees to test against.

---

## 2. Acceptance criteria from the plan

- [ ] **AC-1 — a squash-merged branch with a stale tracking ref classifies GREEN.**
  1. Run `npx tsx --test scripts/ai-skills/worktree-classify.test.ts`.
  - **Pass:** the `GREEN pr-merged` case reports `ok`.
  - **Fail:** that case reports `not ok`, or the file doesn't run.

- [ ] **AC-2 — a commit added after the PR merged classifies RED, never GREEN.**
  1. Same test run as AC-1.
  - **Pass:** the case titled "regression guard: a commit after the merged PR's oid must never read GREEN" reports `ok`.
  - **Fail:** `not ok`, or the result printed is anything other than `RED unpushed-commits`.

- [ ] **AC-3 — RED is responsive, not sticky.**
  1. Same test run.
  - **Pass:** the "RED tracked-changes, then positive control after reverting" case reports `ok` — meaning it verified `RED` while dirty, then `GREEN pushed` after the tracked change was reverted, in the same worktree.
  - **Fail:** `not ok`.

- [ ] **AC-4 — an untracked file blocks GREEN.**
  1. Same test run.
  - **Pass:** the `YELLOW untracked-only` case reports `ok`.
  - **Fail:** `not ok`.

- [ ] **AC-5 — detached HEAD is never GREEN and never RED.**
  1. Same test run.
  - **Pass:** both `YELLOW detached-dangling` and `YELLOW detached-referenced` cases report `ok`.
  - **Fail:** either reports `not ok`.

- [ ] **AC-6 — the dry-run listing never proposes a RED or YELLOW worktree as removable.**
  1. Run `git worktree list --porcelain` from your repo root and pick two or three real entries you don't mind reading (don't remove anything).
  2. Classify each with `npx tsx scripts/ai-skills/worktree-classify.ts <path>` from the branch checkout.
  3. For any entry you know independently to be dirty, unpushed, or detached, confirm the classifier's color matches what `git -C <path> status` and `git -C <path> log @{u}..HEAD` (or the absence of an upstream) show by hand.
  - **Pass:** every classifier verdict you hand-checked matches the real git state; nothing dirty or unpushed reads GREEN.
  - **Fail:** any mismatch — record the path, the classifier's verdict, and what the real state was.

- [ ] **AC-7 — the worktree hygiene lane never runs under a default Zoe invocation.**
  1. Read `.ai-skills/skills/prism-surface-audit/shared.md` § "The run, in order" step 2, and § "Worktree hygiene lane".
  - **Pass:** both places state the `worktrees` mode is explicit-only and is never selected by a bare invocation or `all`.
  - **Fail:** either place is silent on this, or contradicts it.

- [ ] **AC-8 — the GREEN/RED/YELLOW predicate has exactly one implementation.**
  1. Run `grep -rln "rev-list" .prism/ .ai-skills/ scripts/ --include='*.md' --include='*.ts'`.
  - **Pass:** the only `.ts` hit is `scripts/ai-skills/worktree-classify.ts`; every other hit is a `.md` file (prose describing the predicate, not code implementing it).
  - **Fail:** a second `.ts` file appears, or the predicate's logic (git subcommands, the containment-check comparison) is duplicated anywhere outside that one file.
  - **Note:** the plan's own AC-8 evidence command as originally written (`grep -rn "rev-list --count" ...`) never matches the `.ts` source, because the code calls `execFile` with `"rev-list"` and `"--count"` as separate argv entries — the joined string only exists in prose. Use the single-token `"rev-list"` search above; this is a known, already-flagged evidence-command wording gap, not a defect in the code.

- [x] **AC-9 — the new rule costs zero always-on context budget.**
  1. Run `ls .claude/rules/worktree-git.md .cursor/rules/worktree-git.mdc .codex/rules/worktree-git.md` — expect all three missing.
  2. Run `grep -c "worktree-git" AGENTS.md` — expect `1` (the intentional cross-reference in `git-conventions.md` § Worktrees, not the rule body).
  - **Pass:** step 1 reports all three files absent, and step 2 returns exactly `1`.
  - **Fail:** any mirror file exists, or the `AGENTS.md` count is `0` or greater than `1`.

- [ ] **AC-10 — the rule is registered and the install seed is in parity.**
  1. Run `pnpm prism:check` from the repo root.
  2. Run `test -f templates/install/.prism/rules/worktree-git.md && echo present`.
  - **Pass:** step 1 exits `0`; step 2 prints `present`.
  - **Fail:** any non-zero exit from step 1 (name which of the six stages failed — it prints right before the failure), or step 2 finds nothing.

- [ ] **AC-11 — no generated file was hand-edited.**
  1. Run `pnpm prism:build` followed by `git status -s`.
  - **Pass:** `git status -s` shows no further modifications to any generated path (`AGENTS.md`, `.claude/**`, `.codex/**`, `.cursor/**`, `templates/install/**`).
  - **Fail:** any generated path shows as modified after a clean rebuild.

- [ ] **AC-12 — the classifier's tests run with no new CI wiring.**
  1. Run `pnpm prism:test` and confirm the new file's cases appear in the output (search for `worktree-classify` or the case titles from AC-1–AC-5).
  - **Pass:** the cases run and pass as part of the existing test command — no separate script or CI job needed.
  - **Fail:** the cases don't run under `pnpm prism:test`, or a new CI step was required to surface them.

---

## 3. Feature — worktree entry/removal convention

**Goal:** confirm the documented decision tree and the coded predicate agree with each other, and that both correctly separate safe-to-remove worktrees from everything else.

### 3.1 The rule reads as a coherent, self-contained procedure

- [ ] **3.1.1 — the entry decision tree covers all three real situations without gaps.**
  1. Read `.prism/rules/worktree-git.md` § "Entering a worktree".
  - **Pass:** a reader can tell, from the three bullets alone, what to do for (a) a worktree that already exists for the branch, (b) a brand-new branch, and (c) an existing branch with no worktree yet (someone else's in-flight work). No fourth case is left unaddressed.
  - **Fail:** any of the three cases is missing, or the reader would have to guess which bullet applies.

- [ ] **3.1.2 — the removal predicate's three colors and their order are unambiguous.**
  1. Read § "Removing a worktree", including the "checked in order, not evaluated independently" paragraph.
  - **Pass:** the text states plainly that tracked changes are checked before the detached-HEAD check, and gives the concrete example (a dirty detached worktree is RED, not YELLOW) so a reader isn't left to infer the ordering.
  - **Fail:** the ordering is asserted without the example, or a reader could plausibly apply the checks in a different order and get a different answer.

- [ ] **3.1.3 — the "why a merged PR overrides ahead-count" explanation would stop someone from reintroducing the old bug by hand.**
  1. Read the paragraph by that name.
  - **Pass:** it explains, in plain terms, why checking "is the branch still on `origin`" is not enough (a commit landed after merge would still pass that check) and why the fix is a containment check against the PR's own shipped commit rather than against `main`.
  - **Fail:** the explanation is missing, or doesn't make clear why the naive fallback is unsafe.

### 3.2 The classifier's live behavior on your own machine

- [ ] **3.2.1 — the CLI reports usage and exits non-zero with no argument.**
  1. Run `npx tsx scripts/ai-skills/worktree-classify.ts` with no path.
  - **Pass:** prints a `Usage: prism:worktree-classify <worktree-path>` line to stderr and exits `1`.
  - **Fail:** it crashes with a stack trace, hangs, or exits `0`.

- [ ] **3.2.2 — the CLI reports a clear failure on a path that isn't a git working tree.**
  1. Run `npx tsx scripts/ai-skills/worktree-classify.ts /tmp` (or any non-repo directory you have) — or a path that doesn't exist at all.
  - **Pass:** exits `1` and the error message names the path you gave it.
  - **Fail:** exits `0`, or the message doesn't name the path.

- [ ] **3.2.3 — classifying a real worktree on your machine produces a color that matches what you already know about it.**
  1. Pick one worktree from `git worktree list` that you know is clean and fully pushed, and classify it with `npx tsx scripts/ai-skills/worktree-classify.ts <path>` (or `pnpm prism:worktree-classify <path>` from the repo root).
  2. Pick a second one you know has uncommitted or unpushed work.
  - **Pass:** the clean/pushed one reports `GREEN pushed` (or `GREEN pr-merged` if its branch already shipped and its tracking ref is stale); the dirty/unpushed one reports `RED` with a reason that matches what you observed.
  - **Fail:** either verdict contradicts the worktree's actual state.

### 3.3 Zoe's worktree hygiene lane (needs a PRISM agent session)

- [ ] **3.3.1 — a bare or `all` Zoe invocation never touches worktrees.**
  1. In a PRISM agent session on this branch, invoke Zoe with no arguments (or "Zoe, run a cadence audit").
  - **Pass:** the run's output has no worktree section at all, and no `git worktree` command runs.
  - **Fail:** any worktree listing, classification, or removal happens without the lane being named explicitly.

- [ ] **3.3.2 — naming the lane explicitly produces a dry-run listing grouped by color, nothing removed yet.**
  1. Ask Zoe explicitly: "Zoe, clean up worktrees" (or "run the worktree hygiene lane").
  - **Pass:** the response lists every worktree (except the main tree and the one the session is running from) grouped under GREEN/RED/YELLOW with a reason per entry, and states plainly that nothing has been removed.
  - **Fail:** removal happens before you've confirmed anything, or the listing is missing a color group or reasons.

- [ ] **3.3.3 — the batch confirmation gate asks for one confirmation covering the whole GREEN set, not per-item.**
  1. After the dry-run listing (3.3.2), read how Zoe asks you to proceed.
  - **Pass:** the ask names every GREEN path and nothing else, and is phrased as one confirmation for the whole set ("remove the green ones?") — not a separate yes/no per worktree.
  - **Fail:** it asks item by item, or the ask includes a RED/YELLOW path in what it's proposing to remove.

- [ ] **3.3.4 — confirming removes only the GREEN set, and re-checks each one immediately before removing it.** *(Only run this against disposable worktrees — see § Before you start.)*
  1. Confirm the batch removal on a small set of worktrees you're fine losing.
  - **Pass:** only the confirmed GREEN paths are removed; RED and YELLOW entries are untouched; if you dirty one of the GREEN worktrees between the listing and your confirmation, Zoe catches the flip and skips removing it instead of removing it anyway.
  - **Fail:** anything RED or YELLOW gets removed, or a worktree that flipped away from GREEN gets removed anyway.

---

## 4. Mirror parity — every generated surface carries identical content

- [ ] **4.1 — the `git-conventions.md` § Worktrees cross-reference is identical across every mirror.**
  1. Run `diff <(grep -A2 "^## Worktrees" .prism/rules/git-conventions.md) <(grep -A2 "^## Worktrees" AGENTS.md)`.
  2. Repeat against `.claude/rules/git-conventions.md`, `.codex/rules/git-conventions.md`, and `.cursor/rules/git-conventions.mdc`.
  - **Pass:** every `diff` call produces no output.
  - **Fail:** any mirror's cross-reference text differs — name which one.

- [ ] **4.2 — the `code-standards.md` § Removal and rename completeness addition is identical across every mirror.**
  1. Run `diff <(grep -A2 "A changed \*behavior\* has the same reach" .prism/rules/code-standards.md) <(grep -A2 "A changed \*behavior\* has the same reach" AGENTS.md)`.
  2. Repeat against `.claude/rules/code-standards.md` and `.codex/rules/code-standards.md`.
  - **Pass:** no diff output on any comparison.
  - **Fail:** any mismatch — name which mirror.

- [ ] **4.3 — the install seed for the new rule matches the canonical source exactly.**
  1. Run `diff .prism/rules/worktree-git.md templates/install/.prism/rules/worktree-git.md`.
  - **Pass:** no output.
  - **Fail:** any difference between the source rule and its install-template seed.

---

## 5. Targeted regression

`git-conventions.md` and `code-standards.md` are always-loaded rules read by every persona skill session, so a bad edit to either has broad reach even though both edits here are additive (a new `## Worktrees` section, and one new paragraph under an existing heading).

- [ ] **5.1 — the diff to both always-loaded rule files touches only the intended additions.**
  1. Run `git diff origin/main...HEAD -- .prism/rules/git-conventions.md .prism/rules/code-standards.md`.
  - **Pass:** the diff shows only the new `## Worktrees` section (git-conventions.md) and the one new paragraph (code-standards.md) as additions — no existing line reworded, removed, or reflowed.
  - **Fail:** any line outside those two additions appears changed.

- [ ] **5.2 — `docs/personas.md`'s Zoe entry still reads correctly alongside her existing cadence-audit description.**
  1. Read the "Zoe — cadence audit" section in `docs/personas.md`.
  - **Pass:** the new worktree-hygiene sentence reads as an addition to what Zoe already does, not a replacement — her original audit description (stale decisions, unclosed plans, graduating lessons) is still intact.
  - **Fail:** the original description is missing or garbled.

- [ ] **5.3 — the full pipeline (build, types, tests, manifest, crossref, pack parity) is unaffected.**
  1. Run `pnpm prism:check` (same command as AC-10 — one run covers both).
  - **Pass:** exit `0`, all six stages report clean.
  - **Fail:** any stage reports a new failure.

---

## 6. Edge cases

- [ ] **6.1 — a worktree directory that's been deleted outside of git ("unreadable" to the lane) doesn't crash the classifier.**
  1. Create a throwaway worktree (`git worktree add /tmp/qa-scratch-worktree -b qa-scratch-worktree`), then delete its directory by hand (`rm -rf /tmp/qa-scratch-worktree`) without telling git.
  2. Run `npx tsx scripts/ai-skills/worktree-classify.ts /tmp/qa-scratch-worktree`.
  - **Pass:** exits `1` with an error naming the path (not a crash/stack trace), matching the rule's documented `unreadable` bucket. Clean up afterward with `git worktree prune` and `git branch -D qa-scratch-worktree`.
  - **Fail:** the command hangs, crashes with an unhandled exception, or silently reports a color instead of failing.

- [ ] **6.2 — a worktree with commits ahead of upstream and no merged PR anywhere classifies RED, not YELLOW.**
  1. In a throwaway worktree, make a local commit without pushing, and don't merge any PR for it.
  2. Classify it.
  - **Pass:** reports `RED unpushed-commits`.
  - **Fail:** reports anything else.

- [ ] **6.3 — a worktree with no upstream configured and no merged PR classifies YELLOW, not RED.**
  1. In a throwaway worktree created with `git worktree add <path> -b <new-branch>` and never pushed, classify it without any commits beyond the branch point.
  - **Pass:** reports `YELLOW no-upstream`.
  - **Fail:** reports `RED` or `GREEN`.

- [ ] **6.4 — the consumer-install guard: the lane reports itself unavailable rather than falling back to a weaker check.**
  1. Read `.ai-skills/skills/prism-surface-audit/shared.md` § "Worktree hygiene lane", the paragraph about `scripts/ai-skills/worktree-classify.ts` not being present in a consumer install.
  - **Pass:** it states the lane reports itself unavailable and classifies nothing when the script is absent — no weaker fallback predicate is described anywhere.
  - **Fail:** any fallback behavior is described, or the unavailable case isn't handled at all.

---

## Sign-off

| Tester | Date | Environment | Notes |
|--------|------|-------------|-------|
|        |      |             |       |

---

*Reference link: [PR #439](https://github.com/HunterMcGrew/PRISM/pull/439). §5 is the regression sweep — it confirms the two always-loaded rule files this PR touched didn't shift outside their intended additions, and that the full six-stage build pipeline stays clean. The plan's `## History` (task 11) also records a live dry-run of the classifier against every worktree in this repo at the time — useful context for §3.2 and §6, though it doesn't substitute for running the checks fresh.*
