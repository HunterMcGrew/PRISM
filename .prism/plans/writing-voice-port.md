# Plan: writing-voice-port

## Ticket

None — always-on spec content, ships as its own lane per `.prism/rules/followup-scope.md` § Spec content never rides an unrelated ticket. The opening word is load-bearing: `resolve-live-plan.ts` § `UNFILED_TICKET_RE` matches only a `## Ticket` field that opens with `none`, `n/a`, `tbd`, or `unfiled`, and a plan that fails that match is treated as filed, so `pnpm prism:spec-scope-lint` resolves no plan for this branch and silently skips.

## Goal

Port the four voice sections Thrive proved out into PRISM's always-on rules, then sweep PRISM's architect docs, rules, and ADRs against the ported voice.

---

## User Stories

Not applicable — spec content, no user-facing behavior.

---

## Design

Not applicable — no UI.

---

## Implementation Tasks

Two lanes. The port lane is the stack base; the audit lane depends on it and splits into three review units (see `## Decisions` → audit cut lines).

### Clove — Port lane (PR 1)

1. **Add `## An overflowing container is the signal to cut` to `.prism/rules/writing-voice.md`.** Insert as a new section immediately after `## Keep it short enough to be read` (which ends at the `---` following the "One concrete example beats three abstract ones." bullet). Content ports from Thrive with one adaptation — drop Thrive's closing line `Surface-specific limits live with the surface. `.ai-spec/templates/ticket-description.md` § `Linear rendering` carries them for Linear.` because `.prism/templates/ticket-description.md` does not exist in PRISM (verified: `.prism/templates/` holds `acceptance-criteria.md`, `bug-report.md`, `business-strategy.md`, `pr-description.md`, `standup-summary.md`, `ticket-types.md`). Everything else ports verbatim: the opening claim about a wrapped cell being evidence you can't miss, the `**Why:**` line about self-assessment having no honest answer, the four-step stop-at-first-fix ladder (cut words → drop a column → change the container → a value repeated in every row is a caption), and the reverse case about counts buried in a paragraph. Keep the `**How to apply**, stopping at the first step that fixes it:` lead-in verbatim — the stop-at-first ordering is the rule, not decoration. Verification: none at this step; task 5 runs the build.

2. **Add `## Anti-pattern: Reassurance that introduces a new claim` to `.prism/rules/writing-voice.md`.** Insert as the final section, after `## Anti-pattern: Session-context leakage`. Ports verbatim from Thrive — the three-sentence opening (check the sentence right after an admitted gap), the test (does the reassurance trace to something already verified, or introduce a new claim), the `**Why:**` incident with its three quoted examples ("A deterministic render over the labels the build already produced", "Both paths carry the same anti-fragment rule", "Stale is safe"), and the `**How to apply:**` closing that names cutting as usually the stronger edit. Then append one sentence to the `**Why:**` paragraph, verbatim: `PRISM hit the adjacent failure in its own tree — see `.prism/lessons.md` § A control arm that receives an always-on instruction doing the same job is not a control, where a null result was trusted before anyone enumerated what the control arm actually received.` Do not invent additional PRISM examples; the two unrecorded session incidents that motivated this port are not in the durable record and must not be written up as if they were. Verification: none at this step.

3. **Add `## Match length to the question` to `.prism/rules/response-shape.md`** — not to `writing-voice.md` (see `## Decisions` → surface routing). Insert immediately after the `**How to apply:**` bullet list, before the `Short answers stay short` paragraph. Port Thrive's three `**How to apply:**` bullets verbatim (answer what was asked then stop; cut ceremony before content; keep depth flat, two to four lines under a bold lead, no nesting). Replace Thrive's opening two sentences — which cross-reference Thrive's own `§ Keep it short enough to be read` — with: `A reply runs as long as the answer needs and stops. [`writing-voice.md` § Keep it short enough to be read](./writing-voice.md) governs durable artifacts, where the cost spreads over future readers. This governs replies, where it lands on one person waiting.` Port the `**Why:**` verbatim, including the sentence about a reader switching tools over verbosity alone. Verification: none at this step.

4. **Add `## Narration cadence during a task` to `.prism/rules/response-shape.md`** — not to `writing-voice.md` (same routing decision). Insert immediately after the section added in task 3. Ports verbatim from Thrive: the three-moment opening sentence, the `**Why:**` including the Opus 5 prompting-guide citation and its URL, the `**What the three moments look like:**` four-bullet block (opening / mid-run worth saying / mid-run not worth saying / close), the two-things-earn-an-interruption paragraph, and the correction rule (`**Correct an earlier statement only when the error changes the reader's code, conclusions, or decisions.**`). Thrive's example bullets reference its own work; replace the two that name specific artifacts — `"Every heading is cited — 7 hits on one — so the headings stay and only the bodies get cut."` and `"2,349 words, down from 2,956 — the new vocabulary rule ate into the cut."` — with PRISM-neutral equivalents of the same shape (a finding that changes the plan, and an outcome-first close carrying a number). Keep `"Now regenerating the projections."` as the not-worth-saying example; it is generic already. Verification: none at this step.

5. **Expand `## Plain language over jargon` in `.prism/rules/writing-voice.md`.** Replace the section body (currently the four `**How to apply:**` bullets plus the opening paragraph and `**Why:**`) with Thrive's expanded version, keeping PRISM's section position — do not move it to the head of the file (see `## Decisions` → section order). The expansion adds three things PRISM lacks: the reader model (`**Write for a tenth grader who has taken an intro computer-science class.**` with its `array`/`boolean`/`recursion` examples), the two-clause sentence cap (`**Sentence structure is the half that bar governs.**` — one idea per sentence, two clauses at most, split when the reader must hold a clause to reach the verb), and the keep-vs-cut test (`**Keep a word that names a real thing. Cut a word that dresses up an idea.**` — stack names and CS terms stay, metaphor goes: "load-bearing," "seam," "canonical," "altitude," "surface area"). Port Thrive's six `**How to apply:**` bullets verbatim, including the plain-register substitution list (`subsequent` → later, `utilize` → use, `leverage` → use, `ensure` → make sure, `in order to` → to, `approximately` → about). Adapt one bullet: Thrive's `Same word, two uses, two answers` bullet cites `primitive`; keep it — the term appears in PRISM's own `## Plain language over jargon` as a jargon example already. Verification: none at this step.

6. **Regenerate the mirrors.** Run `pnpm prism:build` from the repo root. This writes `.claude/rules/`, `.codex/rules/`, and the install seed at `templates/install/.prism/rules/` from canonical — do not hand-edit any of those three; `build.ts` § `writeSeedMirror` and the platform-copy step own them, and a hand edit is reverted on the next build. Confirm the build reports the six mirror paths as changed (`.claude/rules/writing-voice.md`, `.claude/rules/response-shape.md`, `.codex/rules/writing-voice.md`, `.codex/rules/response-shape.md`, `templates/install/.prism/rules/writing-voice.md`, `templates/install/.prism/rules/response-shape.md`). Verification: `pnpm prism:check` — exit 0. Sequence: after tasks 1–5.

7. **Commit and open PR 1 as the stack base.** Branch is `huntermcgrew/writing-voice-port` (already created off `origin/main`; this plan is its first commit). Commit message subject: `chore: Port Thrive's writing-voice sections into PRISM`. PR body opens with the surface-routing decision (two sections land in `response-shape.md`, not `writing-voice.md`) so a reviewer does not read it as a misfile. Do not merge. Sequence: after task 6.

### Clove — Audit lane (PRs 2–4)

Blocked on PR 1 merging — the audit checks against the ported voice, so auditing before the port lands measures the wrong file. Cut lines are recommended, not approved; see `## Decisions` → audit cut lines for the gate.

8. **[HITL] Operator approves the audit cut lines.** Blocking input: whether the audit ships as the three-PR stack recommended in `## Decisions` (rules / architect / ADRs), and whether PR 4 splits further. The operator's standing rule is approval on the cuts before a stack is created. Tasks 9–11 do not start until this resolves. Sequence: after task 7, blocks tasks 9–11.

9. **Audit `.prism/rules/*.md` (PR 2).** File set: every markdown file in `.prism/rules/`. Run the seven-check pass in `## Audit method` below against each. Record findings per that section's format. Apply `fix` findings; record `flag` findings in this plan's `## Review Issues` with `Status: open` and make no edit. Two files are already at the ported voice by construction and are audited last as a self-check, not skipped: `writing-voice.md` and `response-shape.md`. Because every always-on rule is spec content under `.prism/rules/followup-scope.md` § Spec content never rides an unrelated ticket, `pnpm prism:spec-scope-lint` requires each edited file's basename to appear in this plan outside its bookkeeping sections — the always-on set is enumerated in `## Decisions` → spec-scope-lint clearance, which satisfies that condition for all of them. Verification: `pnpm prism:check` — exit 0. Sequence: after task 8.

10. **Audit `.prism/architect/*.md` (PR 3).** File set: every markdown file under `.prism/architect/`, including `_toolkit/`. Exclude `manifest.json` — it is routing data, not prose. Same seven-check pass and same `fix`/`flag` split as task 9. Architect docs are not in `spec-scope-lint`'s always-on scope (the lint covers `load: always` rules, `.ai-skills/skills/**` bodies, and `.prism/references/review-*.md`), so no plan-enumeration clearance is needed here. Verification: `pnpm prism:check` — exit 0. Sequence: after task 8; parallel with task 9.

11. **Audit `.prism/spec/adrs/**` (PR 4).** File set: every markdown file under `.prism/spec/adrs/`, including `README.md` and `TEMPLATE.md`. `TEMPLATE.md` is the highest-leverage file in the set — it seeds every future ADR — so audit it first. Same seven-check pass, with one narrowing: an ADR is a historical decision record, so edits are voice-only. Never change what an ADR decided, never update a `## Context` section to reflect what was learned later, never renumber. If a check would require changing meaning, it is a `flag`, not a `fix`, regardless of how mechanical the wording change looks. Verification: `pnpm prism:check` — exit 0. Sequence: after task 8; parallel with tasks 9–10.

### Briar (self-review)

12. **Self-review each audit PR against the ported voice before it opens.** The audit's own findings tables and this plan's entries are themselves durable artifacts subject to checks 1–7. A findings table that overflows its container is the rule failing its first live test. Sequence: per PR, before each opens.

---

## Audit method

The per-file check, the finding format, and how a finding becomes an edit. Tasks 9–11 run this identically; only the file set differs.

### The seven checks

Run per file, in order. Checks 1–4 are the newly ported surface and produce most of the volume; checks 5–7 re-verify rules PRISM already carried and should come back mostly clean.

1. **Overflow** (§ An overflowing container). A table row whose longest cell wraps past roughly 120 characters; a bullet that ran to a paragraph; a sentence you cannot read aloud in one breath. Apply the ladder in order and stop at the first step that fixes it. Also run it in reverse: counts buried in a paragraph are a two-column table.
2. **Reader model and sentence cap** (§ Plain language over jargon). Sentences carrying more than two clauses. Metaphor nouns from the named list — `load-bearing`, `seam`, `canonical`, `altitude`, `surface area`, and `primitive` used to mean "reusable building block" rather than `string | number | boolean`. Plain-register substitutions: `subsequent`, `utilize`, `leverage`, `ensure`, `in order to`, `approximately`.
3. **Length versus the question** (§ Match length to the question, § Keep it short enough to be read). Framing prose before the point. Redundant summary sections. Sub-bullets nested three deep.
4. **Reassurance** (§ Anti-pattern: Reassurance that introduces a new claim). Find each admitted gap — "known false negative", "accepted", "we measured X but not Y", "verified A but not B" — and read the sentence after it. Name the property that sentence asserts, then ask where it was proven.
5. **Mandate voice** (§ Onboarding voice, not mandate voice). `NON-NEGOTIABLE`, all-caps `MUST`, `FAILURE STATE`, `HARD RULE`.
6. **Missing why** (§ Explain the why). A directive with no `**Why:**` line, no `## Context`, and no reason obvious from context.
7. **Counts** (§ Count rules, not numbers). `(N files)` beside a directory or glob. Compound claims like "5 of 12 personas". Bare counts describing a collection that grows.

### Finding format

One row per finding, in a table per audited file:

| Line | Check | Current text (trimmed) | Proposed edit | Disposition |
| ---- | ----- | ---------------------- | ------------- | ----------- |

`Check` is the number 1–7. `Disposition` is `fix` or `flag`:

- **`fix`** — mechanical. The edit preserves meaning exactly, and any two people would produce the same replacement. Applied in the same PR.
- **`flag`** — the edit changes meaning, needs the author's call, or the replacement is genuinely ambiguous. Recorded in this plan's `## Review Issues` with `Status: open`, `Severity: minor` unless the finding is load-bearing. Never edited in this lane.

The split is what keeps the audit finishable. Without it an auditor stalls on the first judgment call and the sweep never reaches the end of the directory.

### How a finding becomes an edit

`fix` findings are applied in the audit PR for their directory, one commit per file or per coherent batch of files. `flag` findings never become edits here — they land in `## Review Issues` and wait for the operator. An auditor who is unsure which side a finding falls on marks it `flag`; the cost of an unapplied fix is one follow-up, and the cost of a wrong "mechanical" edit to always-on spec content is every session that loads it afterward.

---

## Decisions

- **Four sections port; the file's section order does not.**
  - **Root cause:** Thrive's `.ai-spec/rules/writing-voice.md` leads with `## Plain language over jargon`; PRISM's leads with `## Onboarding voice, not mandate voice`. Adopting Thrive's order would reorder every existing section.
  - **Alternatives considered:** adopt Thrive's order in the same PR; adopt it in a separate ordering-only PR; keep PRISM's order.
  - **Chosen approach:** keep PRISM's order. Reordering seven sections produces a diff that buries the port's actual content, and section order carries no behavioral weight — every section in an always-on rule is loaded together regardless of sequence.
  - **Implementation guidance:** insert the two new `writing-voice.md` sections at the positions named in tasks 1–2; leave existing sections where they are.
  - → no promotion needed (port-tactical; the ordering question does not recur)

- **`## Match length to the question` and `## Narration cadence during a task` land in `.prism/rules/response-shape.md`, not `writing-voice.md`.**
  - **Root cause:** PRISM splits the surface that Thrive keeps in one file. `writing-voice.md` line 10 states that chat replies follow `response-shape.md` instead, and `response-shape.md`'s closing note states the same boundary from the other side. Both ported sections govern replies — Thrive's own § Match length text says "This governs replies, where it lands on one person waiting," and § Narration cadence governs how often you speak during a run.
  - **Alternatives considered:** put both in `writing-voice.md` as the lane brief framed it; collapse PRISM's durable/chat split to match Thrive's single file; route each section to the file whose surface it governs.
  - **Chosen approach:** route by surface. Putting reply rules in `writing-voice.md` would contradict that file's own scope note in the same commit that adds them, and readers would hit the contradiction on every load. Collapsing the split was rejected as out of scope — it would rewrite `response-shape.md`'s "Who runs this rule" section and every skill reflex bullet that cites the boundary, which is a larger change than the port.
  - **Implementation guidance:** tasks 3–4 target `response-shape.md`. `response-shape.md` is `load: always`, so it falls under the same lane and the same spec-scope-lint clearance as `writing-voice.md` — no second lane is needed.
  - → promoted to `.prism/architect/_toolkit/spec-editing.md` — the durable/chat routing test is how future voice content gets placed

- **`## An overflowing container is the signal to cut` ports adapted — Thrive's surface pointer drops.** Thrive closes the section by pointing at `.ai-spec/templates/ticket-description.md` § `Linear rendering` for Linear-specific limits. PRISM has no `ticket-description.md` in `.prism/templates/` (verified against the directory listing), and `pnpm prism:crossref-lint` fails on repo-root-absolute refs that do not resolve. The sentence drops rather than being re-pointed; PRISM carries no surface-specific rendering limits to point at.
  - → no promotion needed (adaptation is specific to this port)

- **`## Anti-pattern: Reassurance that introduces a new claim` ports with Thrive's incident intact, plus one local citation.**
  - **Root cause:** the lane brief describes three over-crediting corrections from the session that produced it. Only one is in PRISM's durable record — `.prism/lessons.md` § A control arm that receives an always-on instruction doing the same job is not a control (line 383, landed in commit `20b928da`). The other two are session-reported and unrecorded.
  - **Alternatives considered:** substitute PRISM's three session incidents for Thrive's; keep Thrive's incident only; keep Thrive's and cite the one recorded PRISM lesson.
  - **Chosen approach:** keep Thrive's incident and add the one verified PRISM citation. Writing up two unrecorded session events as a durable `**Why:**` would assert as established record something no one can check — which is the exact failure the section names, committed inside the section that names it.
  - **Implementation guidance:** task 2 gives the exact appended sentence. Do not expand it.
  - → no promotion needed (the reasoning lives in the ported section itself)

- **The plain-language expansion is what sizes the audit, and its metaphor ban is adopted as a list, not as a judgment call.**
  - **Root cause:** the four new sections alone would produce a modest sweep. Thrive's expanded § Plain language over jargon adds a two-clause sentence cap and a named metaphor ban (`load-bearing`, `seam`, `canonical`, `altitude`, `surface area`), and PRISM's spec surface uses those words throughout — including in `code-standards.md`, `followup-scope.md`, `branch-plan.md`, and `.prism/architect/_toolkit/spec-editing.md`. Adopting the expansion puts a large share of the surface in violation the day it merges.
  - **Alternatives considered:** adopt only Thrive's underlying test ("would plain English cost precision, or only characters?") and judge each instance case by case; adopt the named list as written; defer the expansion to a later lane.
  - **Chosen approach:** adopt the named list. A mechanical check is what makes a sweep of this size finishable at all — case-by-case judgment across three directories is where an audit dies halfway through. The tension with § Keep it short enough to be read (naming a specific consequence usually costs more words than the metaphor did) is absorbed by the `fix`/`flag` split: an instance where a specific consequence is available and short is a `fix`; one where naming it would take a full sentence is a `flag` for the operator.
  - **Implementation guidance:** check 2 in `## Audit method` carries the list. Do not extend it with additional banned words during the sweep — a growing ban list mid-audit makes earlier files inconsistent with later ones.
  - → promoted to `.prism/architect/_toolkit/spec-editing.md` — the ban list governs every future spec edit, not just this sweep

- **Mirrors are build-generated; the port edits canonical only.** `.claude/rules/`, `.codex/rules/`, and `templates/install/.prism/rules/` are written by `pnpm prism:build` (`build.ts` § `writeSeedMirror` for the seed, the platform-copy step for the rest), and `pnpm prism:check` runs the same comparison in check mode. A hand edit to any mirror is reverted on the next build and shows as drift in between. Both port targets — `.prism/rules/writing-voice.md` and `.prism/rules/response-shape.md` — are canonical; task 6 regenerates the six mirror copies.
  - → no promotion needed (already codified in `.prism/rules/verification-commands.md` and the build script's own docs)

- **spec-scope-lint clearance — this entry names the paths the lint checks.** `.prism/rules/writing-voice.md` and `.prism/rules/response-shape.md` are the port lane's targets, and both declare `load: always`, so `.prism/rules/followup-scope.md` § Spec content never rides an unrelated ticket applies. This lane exists for exactly this content, which is the reason the escape hatch asks for. The audit lane's PR 2 edits the always-on rules, whose basenames the lint also requires present in this plan outside its bookkeeping sections: `autonomous-bug-fixing.md`, `bash-output-minimization.md`, `branch-plan.md`, `code-comments.md`, `code-standards.md`, `context-reuse.md`, `context-window-handoff-check.md`, `core-principles.md`, `cross-agent-handoff-accountability.md`, `demand-elegance.md`, `followup-scope.md`, `git-conventions.md`, `lazy-artifacts.md`, `plan-before-building.md`, `pre-compaction-checkpoint.md`, `response-shape.md`, `self-improvement-loop.md`, `session-orientation.md`, `skill-routing.md`, `subagent-strategy.md`, `verification-before-done.md`, `writing-voice.md`. The rules that do not declare `load: always` — `accessibility.md`, `acceptance-criteria.md`, `architect-doc-verification.md`, `design-governance.md`, `implementation-task-detail.md`, `pr-description.md`, `skill-authoring.md`, `verification-commands.md`, `worktree-git.md` — are audited in the same PR but fall outside the lint's scope. Architect docs and ADRs are outside it too.
  - → no promotion needed (lane-specific lint clearance)

- **A plan's `## Ticket` field decides whether `spec-scope-lint` enforces at all on a ticketless branch.**
  - **Root cause:** the lint resolves a plan by ticket-id token in the branch name first, then falls back to matching the branch slug against plan filenames — but that fallback only accepts a plan whose `## Ticket` field is empty or opens with `none`, `n/a`, `tbd`, or `unfiled` (`scripts/ai-skills/lib/resolve-live-plan.ts` § `UNFILED_TICKET_RE`). This plan's field originally opened with "No tracker ID", which fails that match, so the plan read as filed, no plan resolved, and the lint printed `no live plan resolved for this branch — skipping`. Verified by running it before and after the one-word change.
  - **Alternatives considered:** leave it and rely on the `## Decisions` path-naming entry alone; rename the branch to carry a synthetic ticket id; open the `## Ticket` field with `None`.
  - **Chosen approach:** open the field with `None`. It costs one word and turns the guard from inert to live — the lint now resolves this plan and passes rather than skipping. A synthetic ticket id would have lied about a tracker entry that does not exist.
  - **Implementation guidance:** do not reword the opening of `## Ticket` during the audit lane. Checks 1–3 would otherwise read "None — always-on spec content" as a candidate for tightening and silently disable the lint for every remaining PR in the stack.
  - → promoted to `.prism/architect/_toolkit/spec-editing.md` — every future ticketless spec lane hits this, and the failure is silent

- **OPEN — TBD, needs Hunter's input.** Whether the audit ships as the recommended three-PR stack and whether PR 4 splits further. The audited surface is every markdown file under `.prism/architect/`, `.prism/rules/`, and `.prism/spec/adrs/` — well past the operator's ten-file / five-hundred-line threshold for proposing cut lines, and the standing rule is approval on the cuts before the stack is created. **Recommended cuts, in stack order:** PR 1 port (`writing-voice.md`, `response-shape.md`, regenerated mirrors) as the base, since everything downstream checks against it; PR 2 `.prism/rules/`, first because always-on rules load in every session and drift there reaches every persona's output; PR 3 `.prism/architect/`, smaller and contextually loaded; PR 4 `.prism/spec/adrs/`, last because ADRs are historical records taking the most conservative edits. Cut by directory rather than by check number so a reviewer sees all of one file's edits in one place. PR 4 is the largest by file count and may want splitting — that call is better made once PR 2's findings rate is known than guessed now. **Default path (used until resolved):** the port lane (tasks 1–7) proceeds; the audit lane (tasks 9–11) does not start, per task 8's `[HITL]` gate.

---

## Sessions

- 2026-08-04 [huntermcgrew/writing-voice-port] open: Intent — plan the Thrive voice port plus the follow-on PRISM spec-surface audit, write it to `.prism/plans/writing-voice-port.md`, commit and push without a PR; Bounds — plan file only, never `writing-voice.md` itself, never `.prism/plans/conductor/`, no merge; Approach — fetch Thrive's source rather than reconstruct it, diff the section sets, decide per section against PRISM's durable/chat split rather than assuming verbatim · close: scope held

---

## History

- 2026-08-04 [huntermcgrew/writing-voice-port]: Fetched Thrive's merged `.ai-spec/rules/writing-voice.md` via `gh api`, diffed its eleven sections against PRISM's seven, and wrote this plan. Four sections and one expansion port; two of the four route to `response-shape.md` rather than `writing-voice.md`. Audit cut lines are recommended but gated on the operator — see the `OPEN` Decision.
- 2026-08-04 [huntermcgrew/writing-voice-port]: Opened the `## Ticket` field with `None` so `spec-scope-lint` resolves this plan instead of skipping; it printed `no live plan resolved` before the change and `passed` after. See Decision: A plan's `## Ticket` field decides whether `spec-scope-lint` enforces at all on a ticketless branch.

---

## Debugged Issues

None.

---

## Review Issues

The audit lane's `flag` findings land here. Empty until task 9 runs.

---

## Acceptance Criteria

### Behavioral

- [ ] **AC-1** — Given a session loading PRISM's always-on rules, When it reads the voice guidance, Then it finds the overflowing-container rule, the reassurance anti-pattern, the match-length rule, and the narration-cadence rule.
  - Evidence (`machine`): `grep -l "An overflowing container is the signal to cut" .prism/rules/writing-voice.md` and the three sibling greps each exit 0, with the two reply-surface sections found in `response-shape.md`.
- [ ] **AC-2** — Given the canonical rules have changed, When the build runs, Then every platform mirror and the install seed carry the same content.
  - Evidence (`machine`): `pnpm prism:check` exits 0 — its check-mode seed-drift and platform-copy comparisons fail on any mirror that diverged.
- [ ] **AC-3** — Given a reader opens the voice rules cold, When they follow a cross-reference, Then it resolves.
  - Evidence (`machine`): `pnpm prism:crossref-lint` exits 0 — catches the dropped Linear pointer if it were ported unchanged.
- [ ] **AC-4** — Given the port PR touches always-on spec content, When the scope lint runs, Then it does not fire.
  - Evidence (`machine`): `pnpm prism:spec-scope-lint` exits 0, cleared by the `## Decisions` entry naming both paths.
- [ ] **AC-5** — Given an auditor works through a directory, When they hit a finding whose edit is not purely mechanical, Then they can record it without stalling the sweep.
  - Evidence (`human`): a reviewer reads `## Audit method` and confirms the `fix`/`flag` split assigns every finding class a landing place.

### Non-behavioral

- [ ] **AC-6** — The ported sections carry Thrive's reasoning, not a paraphrase of it. Adaptations are limited to the four named in `## Decisions` (dropped Linear pointer, added lessons.md citation, PRISM-neutral narration examples, surface routing).
  - Evidence (`human`): reviewer diffs each ported section against `gh api repos/TracTru/thrive/contents/.ai-spec/rules/writing-voice.md`.
- [ ] **AC-7** — No ADR's decision content changes during the audit; edits to `.prism/spec/adrs/**` are voice-only.
  - Evidence (`human`): reviewer confirms no `## Decision` or `## Consequences` section changed meaning in PR 4.
- [ ] **AC-8** — This plan and the audit's findings tables themselves pass checks 1–7.
  - Evidence (`human`): Briar's self-review per task 12.

### AC Adjustments

None.

### AC Sync Log

| Date | Agent | Action | Plan | Ticket |
| ---- | ----- | ------ | ---- | ------ |
| 2026-08-04 | Winston | Created AC-1 through AC-8 | `writing-voice-port.md` | N/A — no tracker ID |

---

## Cleanup Items

None.

---

## PR Readiness

- [ ] No critical or major issues
- [ ] Types correct — no `any`, no unsafe `as`
- [ ] No stray console.logs or debug artifacts
- [ ] Tests written for new logic and edge cases — N/A, content-only change
- [ ] All debugged issues resolved (no `open` entries)
- [ ] Build passes — last run: not yet
- [ ] PR description up to date
- [ ] Lasting decisions promoted to architect context (if applicable)

**Last updated:** 2026-08-04
