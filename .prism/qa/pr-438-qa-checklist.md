# PRISM — PR QA Checklist

**PR:** [#438 — chore: Port thrive PR 2197 — Surface the ask, don't bury it](https://github.com/HunterMcGrew/PRISM/pull/438)
**Ticket:** none — ticketless port (per `git-conventions.md` § Commit Messages), tracked via plan [`followup-port-2197-surface-decisions.md`](../plans/followup-port-2197-surface-decisions.md), which carries the AC directly since there's no tracker issue to pull them from.
**Scope:** the new "Surface the ask, don't bury it" bullet added to `.prism/rules/writing-voice.md` § "Answer first, one offer at a time", the matching sentence added to that section's `**Why:**` paragraph, and propagation of both across every generated mirror.
**Who this is for:** anyone verifying this PR on a checkout of this repo with `pnpm` available — no separate consumer repo needed. §3.2's behavioral spot-check additionally needs a PRISM agent session (Claude Code or any other host running PRISM skills), since the change under test is guidance text an agent reads, not application UI.
**How to use:** each item records **Pass/Fail** plus short notes on failure. Work through in order — §1 sets up, §2 walks the plan's own acceptance criteria, §3 checks the new guidance itself, §4 confirms every generated surface carries it, §5 is the regression sweep, §6 covers edge cases.

---

## 1. Before you start

- Check out this repo at PR #438's branch (`huntermcgrew/prism-port-2197-surface-decisions`) and run `pnpm install` once.
- No feature flags, env vars, or seed data needed — this is a content-only change to always-loaded rule files. No build artifact needs regenerating before testing; the mirrors are already committed on the branch.

---

## 2. Acceptance criteria from the plan

- [ ] **AC-1 — the new bullet appears immediately after "Point, don't menu", not appended elsewhere in the list.**
  1. Run `grep -n "Surface the ask, don't bury it" .prism/rules/writing-voice.md`.
  2. Run `grep -n "Point, don't menu" .prism/rules/writing-voice.md`.
  - **Pass:** the first command returns exactly one line, and its line number is exactly one greater than the second command's line number.
  - **Fail:** zero or more than one match, or the line numbers aren't adjacent.

- [ ] **AC-2 — the section's Why paragraph explains a buried ask-back is a placement problem, not just a content problem.**
  1. Run `grep -c "pushes the same decision back onto the reader by placement" .prism/rules/writing-voice.md`.
  2. Open the file and confirm that sentence sits on the same line as the section's `**Why:**` marker, not as a new standalone paragraph.
  - **Pass:** the grep returns `1`, and the sentence is the last sentence of the existing `**Why:**` line.
  - **Fail:** the grep returns `0` or more than `1`, or the sentence appears on its own line/paragraph.

- [ ] **AC-3 — the guidance is present on every host surface an agent could be running under.**
  1. Run `grep -rl "Surface the ask, don't bury it" AGENTS.md .claude/rules/writing-voice.md .codex/rules/writing-voice.md templates/install/.prism/rules/writing-voice.md | wc -l`.
  - **Pass:** returns `4`.
  - **Fail:** returns anything other than `4` — name which surface is missing.

- [ ] **AC-4 — the guidance tells the reader when to reach for a structured question and when not to.**
  1. Read the new bullet in `.prism/rules/writing-voice.md` (or any mirror).
  - **Pass:** the bullet's text contains both the clause reserving the tool for "genuine decisions the user owns that change what you do next" and the clause warning it's "not a generic 'can I proceed?' checkpoint."
  - **Fail:** either clause is missing, or the wording no longer draws that distinction.

- [ ] **AC-5 — no generated mirror was hand-edited; everything came from the build script.**
  1. Run `pnpm prism:check` from the repo root.
  - **Pass:** the command exits `0`.
  - **Fail:** any non-zero exit. Note which stage failed (build-drift, seed-parity, type-check, tests, manifest coverage, crossref lint, or pack-parity — the failing stage's name appears in the output right before the failure).

- [ ] **AC-6 — the change is confined to rule prose and its own paper trail, not to any script, schema, or skill body.**
  1. Run `git diff --name-only origin/main...HEAD`.
  - **Pass:** the file list is exactly these eight paths, no more and no fewer: `.prism/rules/writing-voice.md`; its five generated mirrors (`AGENTS.md`, `.claude/rules/writing-voice.md`, `.codex/rules/writing-voice.md`, `.cursor/rules/writing-voice.mdc`, `templates/install/.prism/rules/writing-voice.md`); this port's own plan file (`.prism/plans/followup-port-2197-surface-decisions.md`); and the AC-verification report this same QA skill wrote earlier in this PR's life (`.prism/qa/ac-verification-followup-port-2197-surface-decisions.md`). None of the eight is a script, schema, or skill body.
  - **Fail:** any path outside that list appears — especially anything under `scripts/`, `.ai-skills/skills/`, or a schema file.
  - **Note:** the plan's own AC-6 text says "four generated mirrors" and doesn't mention the QA report file — both are accounted for elsewhere in this same plan's `## Decisions` (the fifth `.cursor` mirror) and `## History` (the AC-verification report), so treat the eight-file list above as the current correct Pass condition, not the plan's original six-file count.

---

## 3. Feature — the "Surface the ask, don't bury it" guidance

**Goal:** confirm the new guidance reads correctly in place and, where testable, actually changes what an agent following it does.

### 3.1 Content and placement

- [ ] **3.1.1 — the bullet reads as a coherent instruction on its own, without needing the rest of the file for context.**
  1. Read only the bullet text (the line found in AC-1).
  - **Pass:** a reader who has never seen this file can tell, from the bullet alone, what to do (use `AskUserQuestion` or the host's structured-question tool for a needed decision), when to do it (a genuine decision that changes what happens next), when not to (a generic "can I proceed?" checkpoint), and what to do when the tool doesn't fit (a clearly-marked trailing block).
  - **Fail:** any of those four pieces requires guessing or isn't there.

- [ ] **3.1.2 — the new bullet doesn't contradict the "deliberate decision gates" carve-out two paragraphs below it.**
  1. In the same section, read the "Two carve-outs" block that follows the how-to-apply list (it exempts things like an architect's approve/adjust/cancel gate from "Point, don't menu").
  - **Pass:** the new bullet's "not a generic 'can I proceed?' checkpoint" language and the carve-out's "deliberate decision gates stay menus" language read as compatible — one is about ad hoc pause points, the other is about designed decision points.
  - **Fail:** a reader would come away unsure whether a tool's existing approve/adjust/cancel gate is now supposed to become an `AskUserQuestion` call.

### 3.2 Behavioral spot-check (best-effort — one observed run, not a guarantee)

This checks whether an agent that has this rule loaded actually behaves differently, not just whether the text is correct. Because this is guidance to a language model rather than enforced code, one run is a spot-check, not proof the behavior is universal — note that caveat in your Pass/Fail record rather than treating a single Pass as a hard guarantee.

- [ ] **3.2.1 — an agent with this rule loaded surfaces a genuine decision through a structured question instead of trailing prose.**
  1. In a PRISM agent session running on this branch (so the rule is loaded), give it a task with a real fork the agent can't resolve on its own — for example, ask it to pick between two genuinely different implementation approaches for something, where the choice changes what it builds next.
  2. Observe how the agent asks for your decision.
  - **Pass:** the agent renders the choice through `AskUserQuestion` (or the host's equivalent structured-question UI) as a distinct, selectable element — not as a sentence buried at the end of a longer message you'd have to scroll past.
  - **Fail:** the agent asks the question only as trailing prose at the bottom of a longer update, or doesn't surface the decision at all.

---

## 4. Mirror parity — every generated surface carries identical text

- [ ] **4.1 — all five mirrors contain the exact same bullet text as the canonical file, character for character.**
  1. Run `diff <(grep "Surface the ask, don't bury it" .prism/rules/writing-voice.md) <(grep "Surface the ask, don't bury it" AGENTS.md)`.
  2. Repeat against `.claude/rules/writing-voice.md`, `.codex/rules/writing-voice.md`, `.cursor/rules/writing-voice.mdc`, and `templates/install/.prism/rules/writing-voice.md`.
  - **Pass:** every `diff` call produces no output (identical text) for all five mirrors.
  - **Fail:** any `diff` shows a difference — name which mirror and what differs.

---

## 5. Targeted regression

`.prism/rules/writing-voice.md` is an always-loaded rule read by every persona skill session, so a bad edit here has broad reach even though this change is additive-only (nothing existing was removed or reworded outside the two intended edits).

- [ ] **5.1 — the full rule-file diff touches only the two intended spots, nothing else in the file shifted.**
  1. Run `git diff origin/main...HEAD -- .prism/rules/writing-voice.md`.
  - **Pass:** the diff shows exactly two changed lines — the `**Why:**` paragraph (one appended sentence) and the how-to-apply list (one new bullet). No other line in the file shows as added, removed, or reflowed.
  - **Fail:** any line outside those two spots appears in the diff.

- [ ] **5.2 — the rule file's build, cross-reference, and manifest pipeline is unaffected.**
  1. Run `pnpm prism:check` (same command as AC-5 — one run covers both).
  - **Pass:** exit `0`, and the output's crossref-lint and manifest-coverage stages report clean (no new broken references introduced by the edit).
  - **Fail:** any stage reports a new failure.

---

## 6. Edge cases

- [ ] **6.1 — the PR's own known-and-fixed defect stayed fixed: no bare `#2197` autolink in the title or body.**
  1. Run `gh pr view 438 --json title,body -q '.title + "\n" + .body' | grep -c '#2197'`.
  - **Pass:** returns `0`.
  - **Fail:** returns `1` or more — a bare `#2197` reintroduced itself (this was a Minor finding fixed earlier in this PR's review; a regression here means something re-edited the title or body since).

- [ ] **6.2 — no stray whitespace or malformed Markdown around either edited line.**
  1. Run `grep -n ' $' .prism/rules/writing-voice.md` (trailing-whitespace check).
  2. Visually confirm both edited lines still render as a normal paragraph and a normal single-level bullet — no broken list nesting, no stray blank line inside the bullet.
  - **Pass:** the grep returns nothing, and both lines render normally.
  - **Fail:** any trailing whitespace, or either line renders as broken Markdown.

---

## Sign-off

| Tester | Date | Environment URL | Notes |
|--------|------|-----------------|-------|
|        |      |                 |       |

---

*Reference link: [PR #438](https://github.com/HunterMcGrew/PRISM/pull/438). §5 is the regression sweep — it confirms nothing outside the two intended edits shifted, and that the rule file's own build pipeline stays clean.*
