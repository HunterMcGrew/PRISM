# Plan: followup-port-2197-surface-decisions

## Ticket

Upstream source: `https://github.com/TracTru/thrive/pull/2197` — "surface user decisions unmissably" (thrive THR-2053). Open upstream, not merged; ported into PRISM on its own.

## Goal

Add a "Surface the ask, don't bury it" bullet to `.prism/rules/writing-voice.md` § "Answer first, one offer at a time" so a decision an agent needs back from the user is rendered unmissably — `AskUserQuestion` first, clearly-marked trailing block as fallback.

---

## Implementation Tasks

### Clove (implementation)

1. **Add the "Surface the ask, don't bury it" bullet to the canonical rule.**
   - File: `.prism/rules/writing-voice.md` — § `## Answer first, one offer at a time` (heading at :75, `**How to apply:**` list starts at :83).
   - Insert as a new list item on the line **immediately after** the existing `- Point, don't menu. …` bullet (currently :83) and **before** `- No caveat sandwiches. …` (currently :84). Verify these line numbers before editing — earlier tasks in other lanes may have shifted the file.
   - Insert verbatim (single line, no leading `**bold**` lead-in — the sibling bullets in this list are unbolded, unlike the upstream file):

     ```
     - Surface the ask, don't bury it. When a message needs a decision back before you can proceed, make that ask impossible to miss — don't leave it trailing in prose at the bottom of a long update. Reach for `AskUserQuestion` (or the host's structured-question tool): it renders the choice in a distinct, selectable UI the reader can't scroll past. Reserve it for genuine decisions the user owns that change what you do next — not a generic "can I proceed?" checkpoint, which trades one friction for another. When the ask doesn't fit discrete options — a free-form answer, no user present, or the tool isn't available — fall back to a single clearly-marked block as the last thing in the message. This governs the *ask-back*, not the answer: leading with the answer decides where the *conclusion* goes. In a status or orchestration update the board legitimately leads and the ask follows the context — this keeps that following ask from vanishing into the wall of text above it.
     ```

   - Verification: `grep -c "Surface the ask, don't bury it" .prism/rules/writing-voice.md` → `1`.

2. **Append one sentence to that section's shared `**Why:**` paragraph.** (after task 1)
   - File: `.prism/rules/writing-voice.md`, the `**Why:**` line at :79 — the one beginning `**Why:** every sentence before the answer is cognitive load…`. This paragraph is worded differently from the upstream file's, so append PRISM-adapted prose rather than the upstream sentence verbatim.
   - Append to the end of that same paragraph, as the final sentence on the same line:

     ```
     An ask-back buried at the end of a long update pushes the same decision back onto the reader by placement rather than by content — they have to hunt for the one line that needs their action.
     ```

   - Verification: `grep -c "pushes the same decision back onto the reader by placement" .prism/rules/writing-voice.md` → `1`.

3. **Regenerate the generated mirrors.** (after tasks 1–2)
   - Run `pnpm prism:build` from the repo root. `.claude/`, `.codex/`, `AGENTS.md`, and the install seed at `templates/install/.prism/` are generated mirrors — regenerate them with this command, never hand-edit them.
   - Verification: `grep -rl "Surface the ask, don't bury it" AGENTS.md .claude/rules/writing-voice.md .codex/rules/writing-voice.md templates/install/.prism/rules/writing-voice.md | wc -l` → `4`. (`.cursor/` carries skills only, not rules — no cursor mirror of this file exists; do not create one.)

4. **Run the full check gate.** (after task 3)
   - Run `pnpm prism:check` from the repo root.
   - Verification: exit code `0` — this covers build-drift (`build.ts --check`), seed parity between `.prism/` and `templates/install/.prism/`, type-check, tests, manifest coverage, crossref lint, and pack parity. A non-zero exit on seed drift means task 3 did not run or was run from the wrong root; re-run `pnpm prism:build` rather than editing the seed by hand.

No documentation, design, or test-authoring tasks — this change is content-only inside an always-loaded rule file, and the rule text is itself the deliverable.

---

## Decisions

- **The canonical file is `.prism/rules/writing-voice.md`, not anything under `.ai-skills/`.**
  - **Root cause:** the dispatch brief described `.prism/` as a generated mirror. `.ai-skills/definitions/paths.json` says otherwise: `canonical.contentRoot` is `.prism`, and `canonical.skillsRoot` is `.ai-skills/skills`. `.ai-skills/` is canonical for *skills*; `.prism/` is canonical for *content* (rules, architect docs, ADRs, templates). There is no `writing-voice.md` under `.ai-skills/` at all.
  - **Alternatives considered:** editing `.claude/rules/writing-voice.md` (a generated copy); creating a source file under `.ai-skills/`.
  - **Chosen approach:** edit `.prism/rules/writing-voice.md`. `.claude/rules/`, `.codex/rules/`, `AGENTS.md`, and `templates/install/.prism/rules/` are all written by `scripts/ai-skills/build.ts` from that file; editing any of them directly is overwritten on the next build and fails `prism:check` seed-drift in the meantime.
  - **Implementation guidance:** one hand-edit (tasks 1–2), then `pnpm prism:build` propagates to all four mirrors. Never hand-edit a mirror.
  - → no promotion needed (the canonical/generated split is already documented in `paths.json` and every mirror's own header)

- **"tool", not "mechanism", in the ported bullet.** Upstream shipped "the host's structured-question mechanism" and deferred a reviewer flag on it. PRISM's own § Plain language over jargon names "mechanism" explicitly as a noun that sounds architectural and adds no signal — and the edit lands in the same file. "Tool" carries the meaning with no loss, so the port fixes it at write time rather than inheriting a known minor. Considered: keeping upstream's wording verbatim for diff fidelity — rejected, because a rule that violates its own neighboring section is a worse artifact than a one-word divergence from an unmerged upstream PR.
  - → no promotion needed (wording adaptation local to this port)

- **Scoped to decisions that change what happens next — not a generic proceed-gate.** The bullet reserves `AskUserQuestion` for genuine user-owned decisions that change the next action, and explicitly rejects a "can I proceed?" checkpoint. Considered: the broader reading, where any point an agent could pause becomes a structured question — rejected, because it trades buried asks for popup fatigue, which is the failure the upstream PR guards against by name. The guard is carried into the PRISM wording verbatim, not just into this plan.
  - → no promotion needed (the guard ships inside the rule text itself)

- **PRISM's existing A/P/C-style decision gates are out of scope for this port.** The same section's second carve-out already exempts deliberate decision gates (Winston's approve/adjust/cancel, Theo's write/skip/defer) from "Point, don't menu," and the new bullet does not retrofit those gates onto `AskUserQuestion`. Converting them is a separate, larger change across persona skill bodies — a follow-up, not this port. Considered: sweeping the gates in the same PR — rejected on blast radius; it would touch multiple skill files under `.ai-skills/skills/` for a change whose value is unproven until the bullet has been in use.
  - → no promotion needed (scope boundary for this ticket; the follow-up is emitted as a signal, not filed here)

- **Bullet is unbolded to match its siblings.** Upstream's list uses `**Bold lead-in.**`; PRISM's `**How to apply:**` list in this section does not. Match the local file. Considered: bolding for prominence — rejected, it would make one bullet in a six-bullet list read as more important than the rest for a purely inherited reason.
  - → no promotion needed (style match, self-evident from the diff)

- **Correction: `.cursor/rules/writing-voice.mdc` does exist and is a fifth generated mirror.** Task 3's plan text said "no cursor mirror of this file exists; do not create one" — that premise was wrong. `pnpm prism:build` updated the file (it pre-existed on `origin/main`, content-identical rule prose); nothing was hand-created or hand-edited. AC-3's verification command still checks only the four named mirrors and still returns `4`, so this doesn't fail any acceptance criterion — it's a correction to the plan's stated premise, not a scope change.
  - → no promotion needed (build-script behavior already correct; the plan's premise was the only thing wrong)

---

## Acceptance Criteria

### Behavioral

- [ ] **AC-1** — Given an agent reading `writing-voice.md` § "Answer first, one offer at a time", When it reaches the how-to-apply list, Then it finds guidance to surface a needed user decision through a structured question rather than trailing prose, immediately after the "Point, don't menu" guidance.
  - Evidence (`machine`): `grep -n "Surface the ask, don't bury it" .prism/rules/writing-voice.md` returns exactly one line, and its line number is exactly one greater than the line number returned by `grep -n "Point, don't menu"`.
- [ ] **AC-2** — Given a reader who wants to know why the guidance exists, When they read that section's Why paragraph, Then it explains that a buried ask-back pushes the decision back onto the reader by placement.
  - Evidence (`machine`): `grep -c "pushes the same decision back onto the reader by placement" .prism/rules/writing-voice.md` returns `1`, and the match is on the same line as the section's `**Why:**` marker.
- [ ] **AC-3** — Given an agent running under any supported host surface (Claude, Codex, the AGENTS.md preamble, or a fresh consumer install), When it loads its always-on rules, Then the new guidance is present.
  - Evidence (`machine`): `grep -rl "Surface the ask, don't bury it" AGENTS.md .claude/rules/writing-voice.md .codex/rules/writing-voice.md templates/install/.prism/rules/writing-voice.md | wc -l` returns `4`.
- [ ] **AC-4** — Given a reader deciding whether to reach for a structured question, When they read the new guidance, Then it tells them to reserve it for decisions that change what happens next and warns against a generic proceed-gate.
  - Evidence (`human`): the shipped bullet contains both the "genuine decisions the user owns that change what you do next" clause and the "not a generic 'can I proceed?' checkpoint" clause; a reviewer confirms on read.

### Non-behavioral

- [ ] **AC-5** — No generated mirror is hand-edited; every mirror change comes from `pnpm prism:build`.
  - Evidence (`machine`): `pnpm prism:check` exits `0` (its build-drift and seed-parity stages fail on any hand-edited mirror).
- [ ] **AC-6** — The change is confined to rule prose; no script, schema, or skill body is modified.
  - Evidence (`machine`): `git diff --name-only origin/main...HEAD` lists only `.prism/rules/writing-voice.md`, its four generated mirrors, and this plan file.

### AC Adjustments

### AC Sync Log

| Date | Agent | Action | Plan | Ticket |
| ---- | ----- | ------ | ---- | ------ |

---

## Sessions

- 2026-07-21 [main] open: Intent — port thrive PR #2197's "surface the ask" convention into PRISM's canonical `writing-voice.md`; Bounds — plan file only, no code, no branch, no commit; the port itself is one rule edit plus a regenerate; Approach — verify the canonical/generated split first (the brief had it inverted), adapt upstream wording to PRISM's differently-worded Why paragraph and unbolded bullet style, carry the popup-fatigue guard into the rule text rather than only into the plan. · close: scope held
- 2026-07-22 [huntermcgrew/prism-port-2197-surface-decisions] open: Intent — implement the plan's 4 tasks (edit canonical rule, regenerate mirrors, pass `prism:check`) and ship a draft PR; Bounds — `.prism/rules/writing-voice.md` + its generated mirrors + this plan file only; Approach — two Edit calls on the canonical file, `pnpm prism:build`, `pnpm prism:check`, verify plan's grep checks, commit, push, open draft PR. · close: scope held — one plan-premise correction recorded (see Decisions: `.cursor` mirror), no scope drift
- 2026-07-22 [huntermcgrew/prism-port-2197-surface-decisions] open: Intent — grade the plan's 6 AC against the branch diff with typed evidence (Reese AC-verification, first pass); Bounds — read-only grading plus plan/report write-back on the branch, no source touched; Approach — walk AC by ID against the branch ref (`git show`/`git diff`), run `prism:check` in a throwaway deps-provisioned checkout of the branch tip for AC-5. · close: scope held — 5 machine AC MET, AC-4 awaiting-human, one observation to sharpen AC-6's stale mirror count

---

## History

- 2026-07-21 [main]: Plan created for the #2197 port. Confirmed `.prism/rules/writing-voice.md` is canonical (`paths.json` `canonical.contentRoot`) and that `AGENTS.md`, `.claude/rules/`, `.codex/rules/`, and `templates/install/.prism/rules/` are all regenerated by `pnpm prism:build`. Adapted the upstream bullet to PRISM's local wording and style; no blocking design decision found.
- 2026-07-22 [huntermcgrew/prism-port-2197-surface-decisions]: Implemented tasks 1–4 — added the "Surface the ask, don't bury it" bullet and Why-sentence to `.prism/rules/writing-voice.md`, ran `pnpm prism:build` to regenerate mirrors, ran `pnpm prism:check` (exit 0). All plan verification greps passed; see Decisions for a correction to the `.cursor` mirror premise.
- 2026-07-22 [huntermcgrew/prism-port-2197-surface-decisions]: Reese AC-verification (first pass) — report at `.prism/qa/ac-verification-followup-port-2197-surface-decisions.md`; 5 MET · 0 UNMET · 0 UNGRADEABLE · 1 awaiting-human (AC-4). AC-6 MET with an observation to sharpen its stale "four mirrors" count at close.

---

## PR Readiness

- [x] No critical or major issues
- [x] `pnpm prism:check` passes — last run: 2026-07-22
- [x] PR description up to date — https://github.com/HunterMcGrew/PRISM/pull/438
- [ ] Lasting decisions promoted to architect context (if applicable) — pending plan close; every Decision in this plan carries `→ no promotion needed`

**Last updated:** 2026-07-22
