# Chore: Backport TracTru/thrive#2028 — shipping-flow agent hygiene

## Ticket

No Linear ticket — chore PR. Source: [TracTru/thrive#2028 (THR-1882)](https://github.com/TracTru/thrive/pull/2028). Suggested branch: `hmcgrew/chore-thrive-2028-backport`.

## Goal

Backport the four primary shipping-flow agent-hygiene changes from TracTru/thrive#2028 into PRISM: surface the per-push invariant in `shipping-flow.md`, add Clove "How I Think" bullets 9/10/11, codify the multi-commit triggers, and add the `#N` autolink escape rule to both `pr-description.md` and `git-conventions.md`.

---

## Decisions

- **Backport four primary changes; skip the three drift fixes.** The drift fixes from THR-1882 (`lessons.md:333` citation, `shared.md` italic-style, `git-conventions.md` list-introducer blank lines) are thrive-specific — none of those lines exist in PRISM. Backporting them would be ghost-edits against absent content.
  - → no promotion needed (one-off backport scoping; the rule it cites — `followup-scope.md` — already exists)

- **Backport Clove bullets 9, 10, 11 as a cohesive trio rather than bullet 11 alone.**
  - Root cause: Thrive's bullet 11 ("Per-push body sync") parallels its existing bullets 9 ("Decisions read cold") and 10 ("History cap at 3 sentences") as write-time discipline triggers. PRISM's Clove is at bullets 1–8 — bullets 9 and 10 don't exist yet. Dropping bullet 11 in alone orphans the design pattern.
  - Alternatives considered: (a) Bullet 11 only, slotted in as PRISM's bullet 9 — rejected, loses the trio-as-pattern framing and creates a single orphan bullet that future authors won't know how to extend. (b) Defer bullets 9 and 10 to a separate PR and ship only bullet 11 now — rejected, two PRs for one cohesive change is more overhead than one.
  - Chosen approach: backport bullets 9, 10, 11 together. The underlying *rule* for bullet 10 (3-sentence history cap) already exists in PRISM's `.prism/rules/branch-plan.md` § History; bullet 10's job is to cue Clove to apply it. Bullet 9 cites `writing-voice.md` § Anti-pattern: Session-context leakage which also already exists in PRISM. So the bullets are cueing rules PRISM already has, not introducing new rules.
  - Implementation guidance: insert all three at the end of `## How Clove Thinks` in `.ai-skills/skills/prism-code-dev/shared.md`. Rewrite `.ai-spec/architect/`, `.ai-spec/rules/`, `.ai-skills/skills/thrive-code-dev/` path tokens to PRISM equivalents (`.prism/architect/`, `.prism/rules/`, `.ai-skills/skills/prism-code-dev/`).
  - → no promotion needed (codified directly in the Clove canonical; no new architectural pattern)

- **Preserve the THR-1881 originating-incident reference in bullet 11 verbatim.**
  - Root cause: bullet 11 closes with "Originating incident: THR-1881 — three commits on the branch, only the first ran the PR body sync; Briar caught the stale body in self-review." That incident happened in thrive, not PRISM. The question is whether to keep the thrive-specific reference, drop it, or rewrite to a PRISM-local equivalent (which doesn't exist).
  - Alternatives considered: (a) Drop the incident line entirely — rejected, loses the *why* that makes the rule act-on-able. (b) Rewrite to "Originating incident: backported from thrive THR-1881..." — rejected, extra prose without information gain. (c) Keep verbatim — best preserves traceability; the THR-1881 reference is unambiguous (Linear, no GitHub autolink hazard) and the lesson generalizes to any PRISM Clove session even though it originated upstream.
  - Chosen approach: preserve verbatim. PRISM's relationship to thrive as upstream-dogfood is established; an incident reference pointing upstream isn't surprising in PRISM context.
  - → no promotion needed (one-line stylistic call; no rule changes from this)

- **Dual-write every content edit to both `.prism/` and `templates/install/.prism/`.**
  - Root cause: PRISM's canonical content surfaces are dual-written — `.prism/rules/git-conventions.md` and `templates/install/.prism/rules/git-conventions.md` are byte-identical (verified via `diff -q` returning no output). This matches the wave-2 backport pattern (see `epic-prism-thrive-backport-wave-2.md` tasks repeatedly mirroring `.prism/...` edits to `templates/install/.prism/...`).
  - Alternatives considered: edit canonical only and let `pnpm prism:build` regenerate the template — rejected, the templates directory is its own source, not a build output. Build regenerates the `.claude/`, `.codex/`, `.cursor/` mirrors, not the templates.
  - Chosen approach: every edit to `.prism/rules/`, `.prism/references/` lands twice — once in `.prism/...`, once in `templates/install/.prism/...`. `.ai-skills/skills/prism-code-dev/shared.md` is single-source — no template mirror.
  - → no promotion needed (codified in wave-2 plan pattern; this is just adherence)

- **No ADR for this chore.** Same call thrive made on THR-1882. Each change codifies in an existing rule or reference file; none introduces a new architectural pattern that passes the three-gate test (hard-to-reverse + surprising + genuine trade-off).
  - → no promotion needed (meta-decision about ADR scope within this chore)

- **Latent template drift between `.prism/...` and `templates/install/.prism/...` resynced by the dual-write `cp`.** Acknowledging the side-effect, not adding new scope.
  - Root cause: the dual-write `cp` from canonical to template (Decision 4) surfaced two pre-existing drifts in `templates/install/.prism/references/shipping-flow.md`: (1) the intro paragraph was missing the Round-10-framework cross-reference to `.prism/plans/4.7-skill-audit-strategy.md` that the canonical carried; (2) step 7 was missing the `--draft` flag on `gh pr create` that the wave-2 draft-by-default change added to the canonical. The template had drifted away from the canonical at some point between Phase 1.5 sub-PRs without any sync pass catching it.
  - Alternatives considered: (a) hand-revert the `cp`-introduced changes on those two lines to keep this PR's scope tight — rejected, the divergence violates the dual-write invariant Decision 4 establishes and the next `cp` would re-introduce them. (b) split into a separate "template resync" chore — rejected, the diff is already part of the dual-write step; isolating it would be more overhead than acknowledging it here.
  - Chosen approach: accept the `cp`-introduced drift fixes as a documented side-effect of Decision 4. PR body's `## Notes` section names the two specific lines so a reader scanning the templates diff doesn't have to reverse-engineer where they came from.
  - Implementation guidance: no extra edits needed — the `cp` already landed the fixes. Future dual-write passes will continue to enforce the byte-identical invariant.
  - → no promotion needed (one-off acknowledgment; the dual-write invariant in Decision 4 is the standing rule)

- **Scope expansion: fold in the literal-guard worktree-skip fix and remove stale `.claude/worktrees/` content.**
  - Root cause: implementation surfaced a pre-existing bug — `scripts/ai-skills/literal-guard.ts:53` skips dot-prefixed dirs but not `worktrees/`, so the guard recurses into `.claude/worktrees/<id>/` (gitignored operational state — full checkouts of other branches that legitimately contain Thrive-flavored literals). A stale `.claude/worktrees/amazing-brahmagupta-b9e934` from wave-2 work made `pnpm prism:build` exit 1 with 22 false-positive violations. Without the fix, `pnpm prism:check` would fail any time a developer has an active worktree present.
  - Alternatives considered: (a) keep scope tight, file a separate ticket — initially Winston's call per scope-fit check (zero file overlap, low subject-matter adjacency); rejected after user direction to fold in. (b) only delete the stale worktree, don't fix the guard — rejected: the bug fires again the next time any agent creates a worktree, so it would just defer the problem.
  - Chosen approach: surgical worktree-skip in `listFilesRecursively` (one guard clause + why-comment); remove the stale `.claude/worktrees/amazing-brahmagupta-b9e934` via `git worktree remove --force`. Other worktrees outside `.claude/`/`.codex/`/`.cursor/` (e.g. sibling-dir worktrees) are unaffected because they're never under the literal-guard scan roots.
  - Implementation guidance: add task 9 under Clove for the literal-guard fix. AC item added covering the worktree-skip behavior. Followup-scope.md pre-merge fold-in pattern applies — the fix is mechanical (~4 lines + comment) and the value is high (unblocks every future build with a worktree present).
  - → no promotion needed (one-off scope expansion; the rule it cites — `followup-scope.md` — already exists)

---

## Implementation Tasks

### Clove

1. **Add "Per-push invariant" preamble to `shipping-flow.md` (dual-write).**
   - **Files:** `.prism/references/shipping-flow.md` AND `templates/install/.prism/references/shipping-flow.md` — both files should be byte-identical after the edit (verify with `diff -q` after).
   - **Change:** Insert a new `## Per-push invariant` section after the second paragraph (after the "Pushing a completed branch..." line at line 5, before `## Per-persona defaults` at line 7). Insert exactly:
     ```markdown
     ## Per-push invariant

     This flow runs on every `git push`, not once per session. Fix-up commits after Briar-flagged issues, sync regenerations, `lessons.md` appends, and any follow-up commit on the branch all re-enter the flow from step 1 — each commit is a separate diff worth reviewing. If you've already pushed once on this branch, do not treat steps 1–6 as past tense on the next commit.

     ```
   - **Then:** remove the now-redundant line at the bottom of step 2's three-branch block (current line 43): `The step fires on every commit, including re-commits after Briar-flagged fixes — each commit is a separate diff worth reviewing.` Back-reference the preamble inline with the strict-matching sentence above it — replace with: `Matching is strict — only exact \`true\` or \`false\` trigger their paths; anything else is treated as unset and re-asks. See [ADR-0003 § Per-User Overrides](../spec/adrs/0003-authors-ship-reviewers-review.md) for the reasoning. The pause fires on every commit per the per-push invariant above.`
   - **Verification:** `diff -q .prism/references/shipping-flow.md templates/install/.prism/references/shipping-flow.md` returns no output. Visually confirm the preamble reads as a session-level statement and step 2 doesn't duplicate it.
   - **Sequence:** independent — first edit.

2. **Add Clove bullets 9, 10, 11 to `## How Clove Thinks` in `.ai-skills/skills/prism-code-dev/shared.md`.**
   - **File:** `.ai-skills/skills/prism-code-dev/shared.md` (single canonical — no template mirror; build regenerates platform copies).
   - **Change:** After bullet 8 ("Scope discipline", which currently ends around line 80 with "If it doesn't, flag it to the user and let them decide."), append exactly:

     ````markdown

     ### 9. Decisions read cold — scan for temporal framing before saving

     Before saving any new durable artifact — JSDoc, inline comment, ADR, plan `## Decisions`, plan history, PR body — that captures a contract change or describes _what something does_, scan the draft for two things: (a) temporal framing ("pre-refactor", "post-refactor", "originally", "the [X] refactor", "now [Y]", "[X] used to do", "originally Eric / the original [thing]"), and (b) defensive-fallback narration ("this isn't also doing Z because…"). Both describe the moment of writing or the conversation that produced the artifact, not the invariant the reader needs. Decisions get promoted to `.prism/architect/` at ticket close per `branch-plan.md` § Before Closing, where temporal phrasing reads cold ("refactor of what? When?"). JSDoc and inline comments live forever next to the code, where session-context leakage reads even colder. The rule (`writing-voice.md` § Anti-pattern: Session-context leakage) names the failure mode; this discipline catches it at write-time so review doesn't have to.

     Rewrite as present-tense invariants — current contract, then considered alternative, then rejection reason. The substance survives; only the framing changes. Same instinct fires when promoting decisions to architect context: drop "this was added in" / "previously this did X" entirely. For JSDoc and inline comments specifically: cut to the present-tense statement of what the code does; let plans, ADRs, and git history carry the why-not and the migration story.

     ### 10. Cap History entries at 3 sentences

     Before appending to `## History`, scan the draft. If it runs past three sentences, depth wants to move to `## Decisions` and the History entry should link to it instead. The cap, the three costs (load time, edit-time echo, scannability), and where-depth-belongs all live in `branch-plan.md` § History entries: cap at 3 sentences — same write-time discipline as bullet 9, applied to History instead of Decisions.

     ### 11. Per-push body sync, not per-session

     Before `git push`, scan the commit you're about to push: does it add scope past what the current PR body describes? If yes, sync the body first — see `shipping-flow.md` step 5 and `pr-description.md` § Keeping the PR in sync with scope. The flow is per-push, not per-session — fix-up commits, sync regenerations, and `lessons.md` appends all trigger it. Originating incident: THR-1881 — three commits on the branch, only the first ran the PR body sync; Briar caught the stale body in self-review.

     ````

     Path-token rewrites from thrive source: `.ai-spec/architect/` → `.prism/architect/`, no other path changes needed (the `branch-plan.md` and `writing-voice.md` references resolve correctly in PRISM because PRISM has both rules).
   - **Verification:** Read the three new bullets alongside bullets 7 and 8 — confirm the trio reads as a cohesive write-time-discipline group, and bullet 11 references resolve. Bullet count is now 11. Visually verify path-token rewrite landed (no `.ai-spec/` in the new content).
   - **Sequence:** independent of task 1.

3. **Replace the single-commit default in `.ai-skills/skills/prism-code-dev/shared.md` § Git.**
   - **File:** `.ai-skills/skills/prism-code-dev/shared.md`, line 426.
   - **Change:** Replace the exact line `Do not commit mid-implementation unless the user asks. One clean commit at the end is the default.` with:

     ```markdown
     Default to one clean commit at the end. Three exceptions where multiple commits are right:

     - **Multi-task tickets:** if the plan's `## Implementation Tasks` has multiple distinct tasks, commit per task as you complete them. Branch-level `git log` is read by Briar, Eric, and human reviewers during development — readable commit boundaries help review, even though `main` only sees the squash.
     - **Post-review follow-ups:** Briar fixes, Eric fixes, codex follow-ups, and `lessons.md` appends are separate commits, not amends to the prior commit.
     - **User-requested mid-implementation commits:** if the user asks for one, honor it without prompting again.
     ```
   - **Verification:** Read alongside `.prism/rules/git-conventions.md` after task 4 lands — confirm the two documents agree.
   - **Sequence:** independent of tasks 1 and 2.

4. **Soften the squash-merge note in `git-conventions.md` (dual-write).**
   - **Files:** `.prism/rules/git-conventions.md` AND `templates/install/.prism/rules/git-conventions.md`, line 46 in both.
   - **Change:** Replace the exact bullet `- \`fixup!\` or \`squash!\` prefixes — we squash-merge PRs; intermediate commit structure doesn't matter` with `- \`fixup!\` or \`squash!\` prefixes — we squash-merge PRs, so the prefix is purely cosmetic. Branch-level commit structure is still read during review (see \`.ai-skills/skills/prism-code-dev/shared.md\` § Git for when multiple commits are right)`.
   - **Verification:** `diff -q .prism/rules/git-conventions.md templates/install/.prism/rules/git-conventions.md` returns no output. Confirm the surrounding "Not allowed" section still reads as a coherent list — the bullet stays banning fixup/squash prefixes; only the rationale shifts.
   - **Sequence:** depends on task 3 (cross-references it). Dual-write both files in the same edit pass.

5. **Add `#N` autolink escape bullet to `pr-description.md § Writing mechanics` (dual-write).**
   - **Files:** `.prism/rules/pr-description.md` AND `templates/install/.prism/rules/pr-description.md`, in `## Writing mechanics` (line 43 onward).
   - **Change:** Append as the fifth bullet in the existing bullet list (currently four bullets ending at line 50 "Do not delete the base template footer..."). Insert exactly:
     ```markdown
     - Escape bare `#N` references when they aren't real PR/issue links. GitHub autolinks `#N` in PR bodies to PR/issue N in this repo. When referencing internal items — plan step numbers, comment numbers, list positions — wrap them in backticks: write `` `#3` ``, not `#3`. The same rule applies to commit message bodies — see `git-conventions.md` § Body
     ```
   - **Verification:** `diff -q .prism/rules/pr-description.md templates/install/.prism/rules/pr-description.md` returns no output. Confirm the bullet sits as a sibling of the existing four (not an H3 subsection) and the cross-reference to `git-conventions.md` § Body resolves once task 6 lands.
   - **Sequence:** co-required with task 6 (mutual cross-reference; both land in the same commit so the cross-refs resolve simultaneously). Independent of tasks 1–4.

6. **Add `#N` autolink escape paragraph to `git-conventions.md § Body` (dual-write).**
   - **Files:** `.prism/rules/git-conventions.md` AND `templates/install/.prism/rules/git-conventions.md`, in the `### Body` subsection.
   - **Change:** After the existing "Use the body when:" bullet list (after line 26 "A decision was made that someone reading `git log` would question"), insert a blank line then a new paragraph:
     ```markdown

     When writing a body, escape bare `#N` references (plan step numbers, list positions) by wrapping them in backticks: write `` `#3` ``, not `#3`. GitHub autolinks `#N` in commit message displays to PR/issue N. Leave unescaped only when it's a genuine PR or issue reference. Same rule for PR bodies — see `.prism/rules/pr-description.md` § Writing mechanics.
     ```
   - **Verification:** `diff -q .prism/rules/git-conventions.md templates/install/.prism/rules/git-conventions.md` returns no output. Cross-reference to `pr-description.md` § Writing mechanics resolves once task 5 lands.
   - **Sequence:** co-required with task 5 (see task 5 note).

7. **Run `pnpm prism:build` to regenerate platform mirrors.**
   - **Command:** `pnpm prism:build` from repo root.
   - **Why:** Tasks 1, 2, 3, 4, 5, 6 modify canonical sources (`.ai-skills/skills/prism-code-dev/shared.md` and `.prism/` content files). The build regenerates the `.claude/`, `.codex/`, `.cursor/` platform copies per `.ai-skills/definitions/paths.json` `platformContentCopies` and `claudeSkillsRoot`/`codexSkillsRoot`/`cursorSkillsRoot`/`codexAgentsRoot`.
   - **Verification:**
     - `grep -l "Per-push body sync, not per-session" .claude/skills/prism-code-dev/SKILL.md` returns a match.
     - `grep -l "Per-push invariant" .claude/references/shipping-flow.md` returns a match.
     - `grep -l "Escape bare \`#N\`" .claude/rules/pr-description.md` returns a match.
     - `git diff --stat origin/main...HEAD` shows only `.ai-skills/`, `.prism/`, `templates/install/.prism/`, and `.claude/` / `.codex/` / `.cursor/` files — no unexpected mirrors.
   - **Sequence:** depends on tasks 1–6.

8. **Final verification.**
   - **Commands:**
     - `pnpm prism:check` (drift detector — runs the build in `--check` mode plus the test suite)
     - `pnpm prism:check-types` (TypeScript check on the build scripts)
     - `pnpm prism:test` (test suite)
     - `git diff --stat origin/main...HEAD` — confirm change set scope (3 canonical content files dual-written + 1 Clove canonical + 1 build-script fix + N platform mirrors regenerated)
   - **Sequence:** last; depends on tasks 1–7 and task 9.

### Clove — Pre-merge fold-in (scope expansion)

9. **Fix literal-guard scope to skip `worktrees/` subdirs and remove stale worktree.**
   - **Files:**
     - `scripts/ai-skills/literal-guard.ts` — in `listFilesRecursively` (around line 53), after the existing dot-prefix skip, insert a `worktrees` skip with a brief why-comment explaining that per-tool `worktrees/` dirs hold gitignored operational state (full checkouts of other branches that may legitimately contain Thrive-flavored literals).
     - `.claude/worktrees/amazing-brahmagupta-b9e934/` — remove via `git worktree remove --force /Users/hunter/Documents/PRISM/PRISM/.claude/worktrees/amazing-brahmagupta-b9e934` (the worktree's underlying branch `hmcgrew/issue-39-eric-batch-d-label-fix` remains intact in `.git/worktrees/` metadata).
   - **Verification:** `pnpm prism:build` (full build + test) returns exit 0 and 116/116 tests pass; `pnpm prism:check` (drift mode) passes the same way.
   - **Sequence:** independent of tasks 1–7; do before task 8.

---

## Acceptance Criteria

DX/chore PR — no Linear ticket, so AC sync is skipped. Kept here for in-plan verification. Non-behavioral only — behavioral AC for "bullet 11 cued Clove to sync the PR body" would require observing agent cognition, which isn't a tester-checkable outcome.

### Non-behavioral

- [ ] `.prism/references/shipping-flow.md` and `templates/install/.prism/references/shipping-flow.md` both open with a `## Per-push invariant` section after the intro paragraph, before `## Per-persona defaults`. Step 2's three-branch block no longer carries a duplicated per-commit framing line. (REQ-1)
- [ ] `.ai-skills/skills/prism-code-dev/shared.md` `## How Clove Thinks` has 11 bullets (was 8), with bullets 9, 10, 11 following the trigger + moment + cite-canon shape of the rest of the section. (REQ-1)
- [ ] Bullets 9 and 11 in Clove canonical reference PRISM paths (`.prism/architect/`), not thrive paths (`.ai-spec/architect/`). (REQ-1)
- [ ] `.ai-skills/skills/prism-code-dev/shared.md § Git` enumerates three multi-commit triggers (multi-task tickets, post-review follow-ups, user-requested) and keeps single-commit as the default. (REQ-1)
- [ ] `.prism/rules/git-conventions.md` and `templates/install/.prism/rules/git-conventions.md` squash-merge note clarifies that branch-level commit structure is read during review and cross-references the Clove `## Git` section. (REQ-1)
- [ ] `.prism/rules/pr-description.md` and `templates/install/.prism/rules/pr-description.md` have a `#N` escape rule as a fifth sibling bullet under `## Writing mechanics` that cross-references `git-conventions.md` § Body. (REQ-1)
- [ ] `.prism/rules/git-conventions.md` and `templates/install/.prism/rules/git-conventions.md` have a parallel `#N` escape paragraph in the `### Body` subsection that cross-references `pr-description.md` § Writing mechanics. (REQ-1)
- [ ] `pnpm prism:build` regenerates platform mirrors correctly: `.claude/skills/prism-code-dev/SKILL.md` reflects bullets 9/10/11 and `## Git` changes; `.claude/references/shipping-flow.md`, `.claude/rules/git-conventions.md`, `.claude/rules/pr-description.md` reflect their respective canonical changes; `.codex/` and `.cursor/` mirrors track. (REQ-1)
- [ ] `pnpm prism:check`, `pnpm prism:check-types`, and `pnpm prism:test` all pass after the change set lands. (REQ-1)
- [ ] `diff -q` returns no output for all three dual-write pairs: `.prism/references/shipping-flow.md` vs `templates/install/.prism/references/shipping-flow.md`, `.prism/rules/git-conventions.md` vs `templates/install/.prism/rules/git-conventions.md`, `.prism/rules/pr-description.md` vs `templates/install/.prism/rules/pr-description.md`. (REQ-1)
- [ ] `scripts/ai-skills/literal-guard.ts` `listFilesRecursively` skips any directory named `worktrees`; `pnpm prism:build` succeeds even with an active `.claude/worktrees/<id>/`, `.codex/worktrees/<id>/`, or `.cursor/worktrees/<id>/` present in the working tree. (REQ-2 — scope expansion fold-in)

### AC Sync Log

| Date | Agent | Action | Plan | Linear |
| ---- | ----- | ------ | ---- | ------ |
| 2026-05-24 | Winston | Generated AC (chore — no Linear sync) | updated | N/A |

---

## Review Issues

### Briar — 2026-05-24 — self-review pass 1

**Minor** — History entry 1 exceeds the 3-sentence cap

- **Status:** `fixed` — Fixed in: Briar's pass-1 plan edit (rewrote entry 1 to 3 sentences using TracTru/thrive#2028 cross-repo form; "No ADR" sentence dropped — already captured in Decision 5's verdict sub-bullet).
- **Location:** `.prism/plans/chore-thrive-pr-2028-backport.md` § History, first bullet
- **Problem:** "2026-05-24 [main]: Plan created..." entry ran 4 sentences. Violates bullet 10 (Cap History entries at 3 sentences) — the rule WE'RE SHIPPING IN THIS PR. Dogfood gap caught at write-time discipline review.
- **Suggested fix:** Collapse to 3 sentences. Option (a) drop the "No ADR" sentence (already captured in Decision 5's verdict sub-bullet). Option (b) merge bundle-rationale into the Winston-evaluated sentence with em-dash.

**Minor** — Inconsistent `#N` escape in plan title + goal

- **Status:** `fixed` — Fixed in: Clove pass-2 edit. Title and Goal normalized to `TracTru/thrive#2028`. History entry 1 was already fixed by Briar's pass-1 plan edit.
- **Location:** `.prism/plans/chore-thrive-pr-2028-backport.md` § H1 title (line 1), Goal section, History entry 1
- **Problem:** Plan title `# Chore: Backport Thrive PR #2028` and Goal `from Thrive PR #2028 into PRISM` used bare `#2028` while § Ticket uses the proper cross-repo form `TracTru/thrive#2028`. Inconsistent dogfooding of the new `#N` escape rule shipping in this PR.
- **Suggested fix:** Normalize to `TracTru/thrive#2028` everywhere the thrive PR is mentioned (title, Goal, History entry 1).

**Minor** — `cp` silently swept two pre-existing template drifts

- **Status:** `fixed` — Fixed in: Clove pass-2 edit. Added Decision 6 ("Latent template drift...") documenting the two `cp`-resynced lines. PR body `## Notes` section also updated to name the same two lines (intro paragraph + `--draft` flag).
- **Location:** `templates/install/.prism/references/shipping-flow.md` lines 2–4 (intro paragraph) and line 57 (`gh pr create` flag)
- **Problem:** The dual-write `cp` from canonical to template fixed two pre-existing drifts that were not in the plan's scope: (1) intro paragraph added back the Round-10-framework cross-reference to `.prism/plans/4.7-skill-audit-strategy.md` that the template was missing; (2) step 7 added `--draft` to `gh pr create` that the template was missing. Both are correct fixes — they restore the dual-write byte-identical invariant Decision 4 establishes — but unstated drift fold-ins.
- **Suggested fix:** Add a single bullet to the PR body's `## Notes` section (or a new Decision in the plan) acknowledging the resynced drifts. One-liner is enough.

**Minor** — PR-template prettier checkbox checked without actually running prettier

- **Status:** `fixed` — Fixed in: Clove pass-2 PR body edit. Unchecked the prettier checkbox; added Note explaining PRISM has no prettier script for markdown and that the dogfood relies on author hand-formatting + `pnpm prism:check` drift detection rather than prettier on .md files.
- **Location:** PR #47 body, `## Before submitting...` pre-submit checklist
- **Problem:** Clove checked `[x] All changes have been formatted using Prettier.` but didn't run prettier on the changed markdown files during implementation. PRISM doesn't expose a prettier script in `package.json`, so the check is aspirational — but checking it without running prettier (or noting the N/A) misrepresents the verification state.
- **Suggested fix:** Either run `npx prettier --check` on the changed `.md` files and confirm clean (if PRISM has a prettier config), or uncheck the box and note in PR body's `## Notes` that PRISM doesn't run prettier on markdown.

---

## History

- 2026-05-24 [main]: Plan created. Winston evaluated TracTru/thrive#2028 and scoped four primary changes for backport (per-push invariant preamble, Clove bullets 9/10/11, multi-commit triggers + squash-merge softening, `#N` autolink escape) — chose to bundle bullets 9/10/11 together rather than land bullet 11 alone. See `## Decisions` for the bundling and no-ADR calls.
- 2026-05-24 [hmcgrew/chore-thrive-2028-backport]: Tasks 1–8 implementation complete. All 7 primary file edits applied; dual-write verified identical via `diff -q`; `pnpm prism:build` regenerated all 4 platform mirror sets (per-string grep verified). Surfaced pre-existing literal-guard false-positive on a stale `.claude/worktrees/<id>/` — initially flagged for separate ticket per Winston's scope-fit check.
- 2026-05-24 [hmcgrew/chore-thrive-2028-backport]: Task 9 fold-in complete (user reversed Winston's scope-out ruling). Removed stale `.claude/worktrees/amazing-brahmagupta-b9e934` via `git worktree remove --force`; added `worktrees` skip clause to `listFilesRecursively` in `scripts/ai-skills/literal-guard.ts` with why-comment. `pnpm prism:build`, `pnpm prism:check`, `pnpm prism:check-types`, and `pnpm prism:test` all pass; 116/116 tests.
- 2026-05-24 [hmcgrew/chore-thrive-2028-backport]: Briar self-review pass 1 — 4 Minor findings (history-cap violation in entry 1, `#N` escape inconsistency in plan title/goal, undocumented `cp`-swept template drift cleanups, prettier checkbox unchecked-vs-not-run). No critical or major issues. Hand back to Clove.
- 2026-05-24 [hmcgrew/chore-thrive-2028-backport]: Clove pass-2 fixes for all 4 Briar Minors — normalized `TracTru/thrive#2028` in plan title + Goal; added Decision 6 documenting the `cp`-resynced template drifts (intro paragraph + `--draft` flag); updated PR body with `## Notes` for the template drifts and unchecked the prettier checkbox with explanation. Ready for Briar pass 2.

---

## PR Readiness

Living checklist — updated every time `code-review-self` runs. Reflects current state.

- [x] No critical or major issues
- [x] No `any` introduced (N/A — content-only + 1 surgical script fix)
- [x] No stray console.logs or debug artifacts
- [x] Tests written for new logic and edge cases (existing tests cover; 116/116 pass)
- [x] All review issues resolved — Briar pass-1 Minors fixed in Clove pass-2 (see `## Review Issues`)
- [x] Build passes — `pnpm prism:build`, `pnpm prism:check`, `pnpm prism:check-types`, `pnpm prism:test` all green
- [x] PR description up to date — `## Notes` added for template drift; prettier checkbox unchecked with explanation
- [x] Lasting decisions promoted to architect context (N/A — all Decisions carry `→ no promotion needed` verdicts)

**Last updated:** 2026-05-24 — Clove pass 2
