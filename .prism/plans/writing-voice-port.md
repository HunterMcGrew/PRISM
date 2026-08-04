# Plan: writing-voice-port

## Ticket

None — always-on spec content, ships as its own lane per `.prism/rules/followup-scope.md` § Spec content never rides an unrelated ticket. The opening word decides whether the lint runs at all: `resolve-live-plan.ts` § `UNFILED_TICKET_RE` matches only a `## Ticket` field that opens with `none`, `n/a`, `tbd`, or `unfiled`, and a plan that fails that match is treated as filed, so `pnpm prism:spec-scope-lint` resolves no plan for this branch and skips with a passing exit code.

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

Two lanes. The port lane is PR 1, the stack base; the audit lane is PRs 2–4, cut by directory. The operator approved the cut lines and the full-surface sweep — both gates that previously blocked this lane are resolved in `## Decisions`, and no task below waits on human input.

### Clove — Port lane (PR 1)

1. **Add `## An overflowing container is the signal to cut` to `.prism/rules/writing-voice.md`.** Insert as a new section immediately after `## Keep it short enough to be read` (which ends at the `---` following the "One concrete example beats three abstract ones." bullet). Content ports from Thrive with one adaptation — drop Thrive's closing line `Surface-specific limits live with the surface. `.ai-spec/templates/ticket-description.md` § `Linear rendering` carries them for Linear.` because `.prism/templates/ticket-description.md` does not exist in PRISM (verified: `.prism/templates/` holds `acceptance-criteria.md`, `bug-report.md`, `business-strategy.md`, `pr-description.md`, `standup-summary.md`, `ticket-types.md`). Everything else ports verbatim: the opening claim about a wrapped cell being evidence you can't miss, the `**Why:**` line about self-assessment having no honest answer, the four-step stop-at-first-fix ladder (cut words → drop a column → change the container → a value repeated in every row is a caption), and the reverse case about counts buried in a paragraph. Keep the `**How to apply**, stopping at the first step that fixes it:` lead-in verbatim — the stop-at-first ordering is the rule, not decoration. Verification: none at this step; task 5 runs the build.

2. **Add `## Anti-pattern: Reassurance that introduces a new claim` to `.prism/rules/writing-voice.md`.** Insert as the final section, after `## Anti-pattern: Session-context leakage`. Ports verbatim from Thrive — the three-sentence opening (check the sentence right after an admitted gap), the test (does the reassurance trace to something already verified, or introduce a new claim), the `**Why:**` incident with its three quoted examples ("A deterministic render over the labels the build already produced", "Both paths carry the same anti-fragment rule", "Stale is safe"), and the `**How to apply:**` closing that names cutting as usually the stronger edit. Then append one sentence to the `**Why:**` paragraph, verbatim: `PRISM hit the adjacent failure in its own tree — see `.prism/lessons.md` § A control arm that receives an always-on instruction doing the same job is not a control, where a null result was trusted before anyone enumerated what the control arm actually received.` Do not invent additional PRISM examples; the two unrecorded session incidents that motivated this port are not in the durable record and must not be written up as if they were. Verification: none at this step.

3. **Add `## Match length to the question` to `.prism/rules/response-shape.md`** — not to `writing-voice.md` (see `## Decisions` → surface routing). Insert after the `---` at `.prism/rules/response-shape.md:24` and before the `` `.prism/rules/writing-voice.md` governs durable artifacts `` paragraph at line 26. Not after the `**How to apply:**` bullet list — the `Short answers stay short` paragraph at line 22 qualifies that bullet list, and a new `##` heading between them would re-parent it under the wrong section. End the new section with its own `---`. Port Thrive's three `**How to apply:**` bullets verbatim (answer what was asked then stop; cut ceremony before content; keep depth flat, two to four lines under a bold lead, no nesting). Replace Thrive's opening two sentences — which cross-reference Thrive's own `§ Keep it short enough to be read` — with: `A reply runs as long as the answer needs and stops. [`writing-voice.md` § Keep it short enough to be read](./writing-voice.md) governs durable artifacts, where the cost spreads over future readers. This governs replies, where it lands on one person waiting.` Port the `**Why:**` verbatim, including the sentence about a reader switching tools over verbosity alone. Verification: none at this step.

4. **Add `## Narration cadence during a task` to `.prism/rules/response-shape.md`** — not to `writing-voice.md` (same routing decision). Insert immediately after the section added in task 3 and its closing `---`, still ahead of the `` `.prism/rules/writing-voice.md` governs durable artifacts `` paragraph. End with its own `---`, so the file's untitled closing cross-reference and `## Who runs this rule` stay the last two blocks. Ports verbatim from Thrive: the three-moment opening sentence, the `**Why:**` including the Opus 5 prompting-guide citation and its URL, the `**What the three moments look like:**` four-bullet block (opening / mid-run worth saying / mid-run not worth saying / close), the two-things-earn-an-interruption paragraph, and the correction rule (`**Correct an earlier statement only when the error changes the reader's code, conclusions, or decisions.**`). Thrive's example bullets reference its own work; replace the two that name specific artifacts — `"Every heading is cited — 7 hits on one — so the headings stay and only the bodies get cut."` and `"2,349 words, down from 2,956 — the new vocabulary rule ate into the cut."` — with PRISM-neutral equivalents of the same shape (a finding that changes the plan, and an outcome-first close carrying a number). Keep `"Now regenerating the projections."` as the not-worth-saying example; it is generic already. Verification: none at this step.

5. **Expand `## Plain language over jargon` in `.prism/rules/writing-voice.md`.** Replace the section body (currently the four `**How to apply:**` bullets plus the opening paragraph and `**Why:**`) with Thrive's expanded version, keeping PRISM's section position — do not move it to the head of the file (see `## Decisions` → section order). The expansion adds three things PRISM lacks: the reader model (`**Write for a tenth grader who has taken an intro computer-science class.**` with its `array`/`boolean`/`recursion` examples), the two-clause sentence cap (`**Sentence structure is the half that bar governs.**` — one idea per sentence, two clauses at most, split when the reader must hold a clause to reach the verb), and the keep-vs-cut test (`**Keep a word that names a real thing. Cut a word that dresses up an idea.**` — stack names and CS terms stay, metaphor goes: "load-bearing," "seam," "canonical," "altitude," "surface area"). Port Thrive's six `**How to apply:**` bullets verbatim, including the plain-register substitution list (`subsequent` → later, `utilize` → use, `leverage` → use, `ensure` → make sure, `in order to` → to, `approximately` → about). Adapt one bullet: Thrive's `Same word, two uses, two answers` bullet cites `primitive`; keep it — the term appears in PRISM's own `## Plain language over jargon` as a jargon example already. Verification: none at this step.

6. **Clear the one banned noun the port leaves behind in its own file.** `.prism/rules/writing-voice.md:32` — inside `## Explain the why`, which the port does not otherwise touch — reads `because the reader has no way to tell whether the rule is load-bearing or stale`. Replace `whether the rule is load-bearing or stale` with `whether the rule still prevents something or has gone stale`. The three other `load-bearing` uses in this file (lines 63, 70, 71) all sit inside `## Plain language over jargon` and disappear when task 5 replaces that section body — line 32 is the only survivor. This lands in PR 1 rather than the audit lane because without it PR 1 ships a file whose § Plain language over jargon bans a word its own § Explain the why uses, in the same commit. Verification: `grep -n "load-bearing" .prism/rules/writing-voice.md` — every surviving hit sits inside the § Plain language over jargon keep-vs-cut test, where the banned words are quoted as examples of what to cut. A zero count is the wrong target and would mean task 5's ban list went missing; the target is that no hit remains where the word is *used* rather than quoted. Sequence: after task 5.

7. **Regenerate the mirrors.** Run `pnpm prism:build` from the repo root. This writes `.claude/rules/`, `.codex/rules/`, and the install seed at `templates/install/.prism/rules/` from canonical — do not hand-edit any of those three; `build.ts` § `writeSeedMirror` and the platform-copy step own them, and a hand edit is reverted on the next build. Confirm the build reports the six mirror paths as changed (`.claude/rules/writing-voice.md`, `.claude/rules/response-shape.md`, `.codex/rules/writing-voice.md`, `.codex/rules/response-shape.md`, `templates/install/.prism/rules/writing-voice.md`, `templates/install/.prism/rules/response-shape.md`). Verification: `pnpm prism:check` — exit 0. Sequence: after tasks 1–6.

8. **Commit and open PR 1 as the stack base.** Branch is `huntermcgrew/writing-voice-port` (already created off `origin/main`; this plan is its first commit). Commit message subject: `chore: Port Thrive's writing-voice sections into PRISM`. PR body opens with the surface-routing decision (two sections land in `response-shape.md`, not `writing-voice.md`) so a reviewer does not read it as a misfile, and names the task-6 self-collision fix so the one edit outside the four ported sections reads as deliberate. Do not merge. Sequence: after task 7.

### Clove — Audit lane (PRs 2–4)

Blocked on PR 1 merging — the audit checks against the ported voice, so auditing before the port lands measures the wrong file. Cut lines are approved as recommended; see `## Decisions` → audit cut lines.

**Branch naming, all three PRs.** Cut each audit branch from `origin/main` after PR 1 merges, named `huntermcgrew/writing-voice-port-audit-<dir>` — `-audit-rules`, `-audit-architect`, `-audit-adrs`. The `writing-voice-port` token run is required, not cosmetic: `resolve-live-plan.ts` § `findUnfiledPlanCandidatesBySlug` resolves this plan only when its slug tokens `writing`, `voice`, `port` appear as a contiguous in-order run in the branch's final segment, so a branch named `writing-voice-audit-rules` resolves no plan and `pnpm prism:spec-scope-lint` skips instead of enforcing. Verified that no other unfiled plan slug forms a contiguous run inside these three names, so each resolves to exactly one plan rather than failing closed on ambiguity.

9. **Audit `.prism/rules/*.md` (PR 2).** File set: every markdown file in `.prism/rules/`. Run the seven-check pass in `## Audit method` below against each. Record findings per that section's format. Apply `fix` findings; record `flag` findings in this plan's `## Review Issues` with `Status: open` and make no edit. Two files are already at the ported voice by construction and are audited last as a self-check, not skipped: `writing-voice.md` and `response-shape.md`. Because every always-on rule is spec content under `.prism/rules/followup-scope.md` § Spec content never rides an unrelated ticket, `pnpm prism:spec-scope-lint` requires each edited file's basename to appear in this plan outside its bookkeeping sections — the always-on set is enumerated in `## Decisions` → spec-scope-lint clearance, which satisfies that condition for all of them.

   **The banned-noun findings in this directory are already located — apply these four and re-run check 2 to catch anything the inventory missed.** Every one is a whole-word hit on the check-2 list; the directory carries no hits on the plain-register list at all.

   | File:line | Word | Replacement | Disposition |
   | --- | --- | --- | --- |
   | `code-standards.md:18` | `seam` | `The seam is real when` → `The abstraction earns its place when` | `fix` |
   | `followup-scope.md:55` | `load-bearing` | `that isn't load-bearing for the current PR` → `that nothing in the current PR depends on` | `fix` |
   | `branch-plan.md:321` | `canonical` | `A canonical \`OPEN\` entry inline` → `An example \`OPEN\` entry inline` | `fix` |
   | `branch-plan.md:376` | `seam` | none — do not edit | `flag` |

   `code-standards.md:18` and `branch-plan.md:321` are decorative: the sentence already names the concrete thing ("the abstraction", and an example introduced by a code fence), so the metaphor is a restatement. `followup-scope.md:55` is the opposite — the word is the criterion separating a follow-up from a blocker, so it needs the substitute named above rather than deletion. `branch-plan.md:376` is a `flag` under the third clause in `## Audit method` → the fix/flag rule: the word sits inside the fixed string `"no correct seam — architecture prevents lockdown"`, which personas write verbatim into a `## Debugged Issues` entry and which appears across the tree in Sasha's skill body, its generated mirrors, and `AGENTS.md`. Editing it here alone splits the format. Verification: `pnpm prism:check` — exit 0. Sequence: after task 8 merges.

10. **Audit `.prism/architect/*.md` (PR 3).** File set: every markdown file under `.prism/architect/`, including `_toolkit/`. Exclude `manifest.json` — it is routing data, not prose. Same seven-check pass and same `fix`/`flag` split as task 9. Architect docs are not in `spec-scope-lint`'s always-on scope (the lint covers `load: always` rules, `.ai-skills/skills/**` bodies, and `.prism/references/review-*.md`), so no plan-enumeration clearance is needed here.

   **Expect roughly three times the rules directory's finding volume from a directory half its file count** — the banned nouns land far more densely here, and most of that density is `canonical` inside the build-pipeline docs (`_toolkit/install-layout.md` and `_toolkit/anchor-substitution.md` carry the bulk). Nearly all of it falls under the artifact-sense carve-out in `## Audit method` → check 2 and is not a finding. Run the substitution test rather than the grep count, or this directory reads as three times the work it is.

   One finding is already located: `_toolkit/spec-editing.md:13` — replace `The "include, but aren't limited to" framing is load-bearing — don't collapse it into a closed list.` with `Keep the "include, but aren't limited to" framing — don't collapse it into a closed list.` Disposition `fix`; the clause after the dash already carries the instruction, so the metaphor is emphasis rather than meaning. Verification: `pnpm prism:check` — exit 0. Sequence: after task 8 merges; parallel with task 9.

11. **Audit `.prism/spec/adrs/**` (PR 4).** File set: every markdown file under `.prism/spec/adrs/`, including `README.md` and `TEMPLATE.md`. `TEMPLATE.md` does the most work in the set — it seeds every future ADR — so audit it first. Same seven-check pass, with one narrowing: an ADR is a historical decision record, so edits are voice-only. Never change what an ADR decided, never update a `## Context` section to reflect what was learned later, never renumber. If a check would require changing meaning, it is a `flag`, not a `fix`, regardless of how mechanical the wording change looks.

   **This directory carries the most banned-noun hits in the surface and the fewest legitimate edits** — the two facts are the same fact. The density is again `canonical` in the artifact sense, concentrated in the build-pipeline ADRs; one of them is named `_toolkit/0032-canonical-skill-content-is-generic.md`, where the word is in the filename and the decision itself. The carve-out in check 2 covers these, and the ADR narrowing above covers the rest: a `## Context` section that used a metaphor when the decision was made is a record of how it was written, not a voice defect to correct. Expect this PR to be the largest by file count and among the smallest by edit count. Verification: `pnpm prism:check` — exit 0. Sequence: after task 8 merges; parallel with tasks 9–10.

### Briar (self-review)

12. **Self-review each audit PR against the ported voice before it opens.** The audit's own findings tables and this plan's entries are themselves durable artifacts subject to checks 1–7. A findings table that overflows its container is the rule failing its first live test. Sequence: per PR, before each opens.

---

## Audit method

The per-file check, the finding format, and how a finding becomes an edit. Tasks 9–11 run this identically; only the file set differs.

### The seven checks

Run per file, in order. Checks 1–4 are the newly ported surface and produce most of the volume; checks 5–7 re-verify rules PRISM already carried and should come back mostly clean.

1. **Overflow** (§ An overflowing container). A table row whose longest cell wraps past roughly 120 characters; a bullet that ran to a paragraph; a sentence you cannot read aloud in one breath. Apply the ladder in order and stop at the first step that fixes it. Also run it in reverse: counts buried in a paragraph are a two-column table.
2. **Reader model and sentence cap** (§ Plain language over jargon). Sentences carrying more than two clauses. Metaphor nouns from the named list — `load-bearing`, `seam`, `canonical`, `altitude`, `surface area`, and `primitive` used to mean "reusable building block" rather than `string | number | boolean`. Plain-register substitutions: `subsequent`, `utilize`, `leverage`, `ensure`, `in order to`, `approximately`.

   **`canonical` naming the pre-build artifact is not a finding.** In PRISM the word names a real thing — the source under `.ai-skills/skills/**` and `.prism/rules/**` that `.claude/`, `.codex/`, and the install seed are generated from — and it carries over half of the surface's banned-noun hits, nearly all of them in the build-pipeline docs. The ported § Plain language over jargon already supplies the discriminator: keep a word that names a real thing, cut a word that dresses up an idea. Apply it as a substitution test — read `example` in place of `canonical`. If the sentence still means what it meant, the word was metaphor and the occurrence is a finding (`a canonical \`OPEN\` entry` means `an example \`OPEN\` entry`). If the sentence breaks, the word names the artifact and the occurrence is not recorded at all — there is no such thing as an `example source`. This carve-out is stated once, here, so a reader who greps the surface and counts more hits than the findings tables contain knows why, and so no auditor records the same non-finding a hundred times.
3. **Length versus the question** (§ Match length to the question, § Keep it short enough to be read). Framing prose before the point. Redundant summary sections. Sub-bullets nested three deep.
4. **Reassurance** (§ Anti-pattern: Reassurance that introduces a new claim). Find each admitted gap — "known false negative", "accepted", "we measured X but not Y", "verified A but not B" — and read the sentence after it. Name the property that sentence asserts, then ask where it was proven.
5. **Mandate voice** (§ Onboarding voice, not mandate voice). `NON-NEGOTIABLE`, all-caps `MUST`, `FAILURE STATE`, `HARD RULE`.
6. **Missing why** (§ Explain the why). A directive with no `**Why:**` line, no `## Context`, and no reason obvious from context.
7. **Counts** (§ Count rules, not numbers). `(N files)` beside a directory or glob. Compound claims like "5 of 12 personas". Bare counts describing a collection that grows.

### Finding format

One row per finding, in a table per audited file:

| Line | Check | Current text (trimmed) | Proposed edit | Disposition |
| ---- | ----- | ---------------------- | ------------- | ----------- |

**Every audited file gets a heading and a table, including the clean ones.** A file with no findings records the table with zero rows — that empty table is the evidence the file was opened and checked. An auditor who silently omits a clean file leaves a record indistinguishable from never having reached it, and at this file count nobody can reconstruct the difference afterward. Expect a large share of zero-row tables, especially in the ADRs: the checks are looking for defects, and most files will not have them.

`Check` is the number 1–7. `Disposition` is `fix` or `flag`:

A finding is a `fix` only when all three of these are true. Any single "no" makes it a `flag`:

1. **The replacement preserves meaning exactly.** Not "close enough" — the sentence asserts the same thing afterward.
2. **Any two auditors would write the same replacement.** If the right substitute is a judgment call between several defensible options, it is not mechanical.
3. **The word appears only inside the file being audited.** A word that also appears elsewhere in the tree is a rename, not a voice edit, and renames are swept whole per `.prism/rules/code-standards.md` § Removal and rename completeness.

`fix` findings are applied in the same PR. `flag` findings are recorded in this plan's `## Review Issues` with `Status: open` and `Severity: minor` unless the finding changes behavior, and are never edited in this lane.

The third question is what the full-surface sweep adds, and it is the one an auditor will skip. The worked case is `.prism/rules/branch-plan.md:376`: the word `seam` sits inside a fixed string personas copy verbatim into a plan, and that string appears across Sasha's skill body, its generated mirrors, and `AGENTS.md`. Locally the edit is as mechanical as any on the list — and applying it would split a format the rest of the tree still writes the old way.

The split is what keeps the audit finishable. Without it an auditor stalls on the first judgment call and the sweep never reaches the end of the directory. At this file count that is the likely failure, not a wrong edit: an auditor who treats every ambiguous instance as something to resolve now will not finish the first directory. When unsure, `flag` — an unapplied fix costs one follow-up, and a wrong "mechanical" edit to always-on spec content costs every session that loads it afterward.

### How a finding becomes an edit

`fix` findings are applied in the audit PR for their directory, one commit per file or per coherent batch of files. `flag` findings never become edits here — they land in `## Review Issues` and wait for the operator.

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

- **RESOLVED — the metaphor ban is adopted as written, with no grandfather clause, and every file in the surface is checked against it.**
  - **Root cause:** the ban puts a large share of the existing surface in violation the day it merges, so adopting it is a scope decision rather than a wording one, and it was escalated to the operator alongside the cut lines.
  - **Alternatives considered:** grandfather existing writing so the ban binds only new prose; port § Plain language over jargon but drop the named noun list and keep only Thrive's underlying test; adopt the list as written and sweep the whole surface.
  - **Chosen approach:** the operator chose the full sweep, deliberately, over the two cheaper options. The named list ports unchanged — `load-bearing`, `seam`, `canonical`, `altitude`, `surface area`, `primitive` — and the sweep covers every markdown file under `.prism/architect/`, `.prism/rules/`, and `.prism/spec/adrs/`, not only files touched for other reasons.
  - **Implementation guidance:** the surface is 112 files and 7,312 lines, carrying 336 whole-word hits on the list — 35 in `rules`, 97 in `architect`, 204 in `adrs`. That raw count badly overstates the work: over half of it is `canonical` in the artifact sense, which the next Decision excludes. Do not extend the list mid-sweep; a growing ban makes earlier files inconsistent with later ones.
  - → promoted to `.prism/architect/_toolkit/spec-editing.md` — the ban list governs every future spec edit, not just this sweep

- **`canonical` naming the pre-build artifact is excluded from the ban, on the ported rule's own test.**
  - **Root cause:** `canonical` is over half the surface's banned-noun hits, and in PRISM it names a concrete artifact — the source that `.claude/`, `.codex/`, and the install seed are generated from. The hits concentrate in the build-pipeline docs, including an ADR whose own filename is `0032-canonical-skill-content-is-generic.md`. Treating those as violations is a rename of a repo concept, not a voice fix.
  - **Alternatives considered:** record all of them as findings; drop `canonical` from the ban list; exclude only the artifact sense.
  - **Chosen approach:** exclude the artifact sense, using the discriminator the ported § Plain language over jargon already carries — keep a word that names a real thing, cut a word that dresses up an idea. Dropping `canonical` from the list was rejected because the metaphor sense is real and worth catching: `branch-plan.md:321` uses it to mean "an example." Recording all of them was rejected because a findings table with a hundred non-findings in it is what stops the sweep finishing.
  - **Implementation guidance:** `## Audit method` check 2 carries the substitution test and states the carve-out once, so the gap between a grep count and the findings tables is explained rather than looking like missed work.
  - → promoted to `.prism/architect/_toolkit/spec-editing.md` — the same word recurs in every future spec edit

- **§ Plain language over jargon's "names from our stack" example genericizes Thrive's own class names, forced by the build pipeline rather than chosen.**
  - **Root cause:** Thrive's verbatim illustration is `useEffect`, `block.json`, `Thrive_Core`, `IEquipment` — the last two are proper nouns from TracTru/thrive's own codebase, which this repo does not contain. `scripts/ai-skills/build.ts`'s seed-literal-guard flagged the literal word `Thrive` at `templates/install/.prism/rules/writing-voice.md:83` and failed the build with `Genericize the canonical source, or allowlist the file` — the install seed ships this content verbatim to every consumer, so a Thrive-specific class name would read as a dogfooding leak on every fresh install.
  - **Alternatives considered:** keep Thrive's exact examples and add the file to `.ai-skills/definitions/literal-allowlist.json`; keep the examples and accept a failing build; genericize the two proper nouns and keep everything else in the sentence verbatim.
  - **Chosen approach:** genericize the two proper nouns only (`Thrive_Core`, `IEquipment` → `a codebase's own class or type names`), keep `useEffect` and `block.json` — neither is Thrive-specific, both are common patterns any adopting team's codebase could carry. Allowlisting was rejected: the guard exists precisely to catch this class of leak, and this instance has no reason to be an exception. Discovered after the first `pnpm prism:build` run silently stopped short of regenerating every mirror (including `AGENTS.md`) because the guard failure aborted the build before that step — a second, clean build confirmed the fix.
  - **Implementation guidance:** this is the fifth adaptation from Thrive's source, alongside the four already named in the Decision above titled "Four sections port; the file's section order does not" and its neighbors. AC-6 names it explicitly so a reviewer diffing against Thrive's source doesn't read it as an unexplained deviation.
  - → no promotion needed (port-tactical; future ports hit the same guard and get the same signal)

- **The port fixes `writing-voice.md:32` in PR 1 rather than leaving it to the audit lane.**
  - **Root cause:** § Explain the why uses `load-bearing` and the port does not otherwise touch that section, while § Plain language over jargon — which task 5 replaces with the version carrying the ban — is what forbids it. PR 1 as originally tasked would land one file whose two sections contradict each other in the same commit.
  - **Alternatives considered:** leave it for PR 2, which audits this directory anyway; fix it in PR 1.
  - **Chosen approach:** fix it in PR 1. The window between the two PRs is exactly when a reader would hit the contradiction, and the whole point of the rule is that readers act on what it says.
  - **Implementation guidance:** task 6 names the exact replacement. The file's other three occurrences vanish with task 5's section replacement, so a zero-count grep is a valid check that both tasks landed.
  - → no promotion needed (port-tactical; the collision exists only during this port)

- **The audit branches carry the `writing-voice-port` token run so the scope lint stays live across the stack.**
  - **Root cause:** this branch has no ticket id, so `spec-scope-lint` resolves its plan through the slug fallback, which matches only when the plan's tokens appear as a contiguous in-order run in the branch's final segment. The obvious names for PRs 2–4 — `writing-voice-audit-rules` and siblings — break the run, resolve no plan, and the lint skips on exactly the three PRs that edit the most always-on spec content in this lane.
  - **Alternatives considered:** name the branches naturally and accept the skip; fix the lint itself here; constrain the branch names.
  - **Chosen approach:** constrain the branch names. It costs one token per branch and keeps the guard live for the whole stack; fixing the lint is the separate work in the next Decision.
  - **Implementation guidance:** the audit lane header names the three branches. Verified that no other unfiled plan slug forms a contiguous run inside them, so each resolves to one plan rather than failing closed on ambiguity.
  - → no promotion needed (lane-specific; the general defect is recorded separately below)

- **The lint's fail-open is real but belongs to separate work, not this lane.**
  - **Root cause:** `evaluateSpecScopeLint` returns no violations when no plan resolves, and `main` prints a skip line and returns without a non-zero exit. CI gates on the exit code, so a branch touching always-on spec content with no resolvable plan is indistinguishable from a clean pass — the failure mode is invisible precisely when the guard is doing nothing.
  - **Alternatives considered:** fix it in this lane; open a follow-up off `main`; leave it and rely on the branch-naming constraint.
  - **Chosen approach:** separate work. Two of the four signals in `.prism/rules/followup-scope.md` point to a scope split — a different system (`scripts/ai-skills/` TypeScript against this lane's markdown) and a size that is a policy call rather than an edit: whether an unresolved plan should fail, warn, or require a named opt-out, with blast radius across every branch in the repo. Folding a CI-policy change into a voice port would invert the rule this lane exists to honor.
  - **Implementation guidance:** this lane's own exposure is closed by the branch-naming Decision above, so nothing here waits on the general fix. It is emitted as follow-up work from this session rather than tracked as a task in this plan.
  - → no promotion needed (routing call; the work itself is emitted as a follow-up signal)

- **RESOLVED — the audit ships as the four-PR stack, cut by directory, in the recommended order.**
  - **Root cause:** the audited surface is well past the threshold at which cut lines get proposed before a stack is created, and the operator's standing rule is approval on the cuts.
  - **Alternatives considered:** one PR for the whole audit; cut by check number; cut by directory.
  - **Chosen approach:** the operator approved the recommended cuts as written — PR 1 port as the base, then PR 2 `.prism/rules/`, PR 3 `.prism/architect/`, PR 4 `.prism/spec/adrs/` — and confirmed the reasoning for putting rules first: they are always-on, so drift there reaches every persona on every session. Cutting by directory rather than by check keeps all of one file's edits in one place for a reviewer.
  - **Implementation guidance:** whether PR 4 splits further is deliberately left open until PR 2's findings rate is known, per the operator. The inputs for that call: `adrs` is the largest directory by file count and carries the most raw hits, but most of those are the excluded `canonical` sense and ADRs take voice-only edits, so its edit count is expected to be among the smallest. Decide it against PR 2's measured fix-versus-flag ratio, not against the file count.
  - → no promotion needed (lane-specific stack shape)


---

## Sessions

- 2026-08-04 [huntermcgrew/writing-voice-port] open: Intent — plan the Thrive voice port plus the follow-on PRISM spec-surface audit, write it to `.prism/plans/writing-voice-port.md`, commit and push without a PR; Bounds — plan file only, never `writing-voice.md` itself, never `.prism/plans/conductor/`, no merge; Approach — fetch Thrive's source rather than reconstruct it, diff the section sets, decide per section against PRISM's durable/chat split rather than assuming verbatim · close: scope held
- 2026-08-04 [huntermcgrew/writing-voice-port] open: Intent — record the operator's answers to both escalated questions and re-size the audit tasks so Clove can run PR 1 with no further gate; Bounds — this plan file only, never the two rule files themselves, never `.prism/plans/conductor/` or `.claude/settings.json`, no PR and no merge; Approach — measure the real violation surface before re-tasking, so the sweep is sized against counted hits rather than an estimate · close: scope held
- 2026-08-04 [huntermcgrew/writing-voice-port] open: Intent — implement PR 1 (tasks 1–8): port the four Thrive voice sections into `writing-voice.md` and `response-shape.md`, fix the task-6 self-collision, regenerate mirrors, and open the stack-base PR as a draft; Bounds — only the two named rule files and their generated mirrors, never `.prism/architect/` or `.prism/spec/adrs/`, never `.prism/plans/conductor/`, no merge; Approach — fetch Thrive's merged source via `gh api` rather than reconstruct it, apply each task's named adaptation, then build and check · close: scope held — one branch-naming wrinkle noted below, no task scope changed
- 2026-08-04 [huntermcgrew/writing-voice-port] open: Intent — self-review PR `#455` against the five named checks (routing geometry, the fifth adaptation's resolution, the self-collision fix, mirror integrity, scope containment) plus the live spec-scope-lint defect, and run the standard pass; Bounds — report findings only, no fixes, no GitHub posting, never `.prism/plans/conductor/`, never `.claude/settings.json`, no PR-ready mark, no merge; Approach — diff-only reading against the plan's own claims, verify each with a direct command rather than trusting the plan's narrative · close: scope held

---

## History

- 2026-08-04 [huntermcgrew/writing-voice-port]: Fetched Thrive's merged `.ai-spec/rules/writing-voice.md` via `gh api`, diffed its eleven sections against PRISM's seven, and wrote this plan. Four sections and one expansion port; two of the four route to `response-shape.md` rather than `writing-voice.md`. Audit cut lines are recommended but gated on the operator — see the `OPEN` Decision.
- 2026-08-04 [huntermcgrew/writing-voice-port]: Opened the `## Ticket` field with `None` so `spec-scope-lint` resolves this plan instead of skipping; it printed `no live plan resolved` before the change and `passed` after. See Decision: A plan's `## Ticket` field decides whether `spec-scope-lint` enforces at all on a ticketless branch.
- 2026-08-04 [huntermcgrew/writing-voice-port]: Recorded the operator's answers to both escalated questions — the metaphor ban adopts as written with no grandfather clause, and the four-PR stack ships as cut — closing the `OPEN` Decision. Measured the sweep surface at 112 files, 7,312 lines, 336 banned-noun hits, which surfaced two findings that changed the tasks: over half the hits are `canonical` in a sense that names a real artifact, and PR 1 as originally tasked would have shipped a rule contradicting itself. See Decisions: the metaphor ban resolution, the `canonical` carve-out, and the `writing-voice.md:32` fix.
- 2026-08-04 [huntermcgrew/writing-voice-port]: Added the clean-file recording rule and a third fix/flag question covering blast radius, and constrained the audit branch names so `spec-scope-lint` resolves this plan across the whole stack. Routed the lint's general fail-open to separate work. See Decision: The lint's fail-open is real but belongs to separate work.
- 2026-08-04 [huntermcgrew/writing-voice-port]: Implemented PR 1 (tasks 1–8) — ported the four Thrive sections, expanded § Plain language over jargon, fixed the `writing-voice.md:32` self-collision, and regenerated all mirrors. Pushed as commit `9ff6d07b`. `.claude/worktrees/agent-ae51a1101420f54f4` held this branch checked out at the stale tip `f8688576`, so this session worked from a detached checkout at `31f5022c` and pushed via the full refspec rather than checking out the branch by name.

---

## Debugged Issues

None.

---

## Review Issues

The audit lane's `flag` findings land here. Empty until task 9 runs.

No issues found — 2026-08-04 [huntermcgrew/writing-voice-port]. Briar's self-review of PR 1 confirmed: the `response-shape.md` insertion geometry left the closing cross-reference paragraph and `## Who runs this rule` as the last two blocks, un-re-parented; the fifth (seed-literal-guard) adaptation is fully resolved in `## Decisions` and AC-6 with no `Thrive_Core`/`IEquipment` literal surviving in any mirror; the `writing-voice.md:32` self-collision fix landed, and every remaining `load-bearing`/`seam`/`canonical`/`altitude`/`surface area`/`primitive` hit in the two ported files sits inside § Plain language over jargon's own keep-vs-cut examples; all six mirrors (`.claude/`, `.codex/`, `.cursor/`, install seed) are byte-identical to canonical modulo each platform's own frontmatter convention; the 12-file diff touches only the two named rules, their generated mirrors, `AGENTS.md`, and this plan — no `.prism/architect/` or `.prism/spec/adrs/` reach; and `spec-scope-lint` printed `spec-scope-lint passed. No unrelated spec content found.`, the message `evaluateSpecScopeLint` only emits when `result.planPath` is non-null — confirming this PR's lint genuinely resolved this plan rather than skipping. `pnpm prism:check` exits 0.

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
- [ ] **AC-9** — Given the port has landed, When a reader opens the voice rules, Then no section uses a word another section bans.
  - Evidence (`machine`): `grep -n "load-bearing" .prism/rules/writing-voice.md` shows hits only inside the § Plain language over jargon keep-vs-cut test, where the words are quoted as examples — no hit in `## Explain the why` or any other section.
- [ ] **AC-10** — Given an audit PR is open, When a reviewer looks for a file they expected to be checked, Then they can tell a clean file from a skipped one.
  - Evidence (`human`): every file in the PR's directory has a heading and a findings table in the PR body, clean files carrying a zero-row table.
- [ ] **AC-11** — Given each stacked audit PR, When the scope lint runs on its branch, Then it resolves this plan rather than skipping.
  - Evidence (`machine`): `pnpm prism:spec-scope-lint` on each audit branch prints a resolved plan path, not `no live plan resolved for this branch — skipping`.

### Non-behavioral

- [ ] **AC-6** — The ported sections carry Thrive's reasoning, not a paraphrase of it. Adaptations are limited to the five named in `## Decisions` (dropped Linear pointer, added lessons.md citation, PRISM-neutral narration examples, surface routing, genericized stack-name example).
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
| 2026-08-04 | Winston | Added AC-9 through AC-11 on resolving both escalated gates | `writing-voice-port.md` | N/A — no tracker ID |

---

## Cleanup Items

None.

---

## PR Readiness

- [x] No critical or major issues
- [x] Types correct — no `any`, no unsafe `as` — N/A, content-only change
- [x] No stray console.logs or debug artifacts
- [x] Tests written for new logic and edge cases — N/A, content-only change
- [x] All debugged issues resolved (no `open` entries)
- [x] Build passes — last run: 2026-08-04, `pnpm prism:check` exit 0 (spec-scope-lint resolved this plan and passed, not skipped — confirmed by reading `evaluateSpecScopeLint`'s exit path; crossref-lint, manifest coverage, pack parity, and build --check all passed too)
- [x] Self-review complete — Briar, 2026-08-04, no findings; see `## Review Issues`
- [ ] PR description up to date — PR 1 not yet opened
- [ ] Lasting decisions promoted to architect context — deferred to plan close per `branch-plan.md` § Before Closing; several `## Decisions` entries already carry a promotion verdict for when that runs

**Last updated:** 2026-08-04
