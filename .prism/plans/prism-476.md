# Plan: PRISM-476

## Ticket

https://github.com/HunterMcGrew/PRISM/issues/476

## Goal

Rename the three stakes-calibration levels to names that say what they do, and make every prompt that asks for a level show the one-line behavior alongside each option.

---

## Implementation Tasks

Winston wrote these. One persona owns the whole change — the rename spans Parker's spec, Sol's spec, the shared reference, the docs, and one new ADR, and splitting it would ship a half-renamed vocabulary.

**Write-gate mechanics, read this before task 1.** A `PreToolUse` gate denies reads and writes on routed paths until the route's architect docs are read. Two things clear it reliably:

- Run each `cat` **alone in its own command** — no `cd … &&`, no `> /dev/null`, no second `cat` in the same message. A compound command or a redirect does not register as a read.
- Use one file operand per `grep`/`cat` when a routed path is involved. A recursive directory operand (`grep -rn … .prism/spec/adrs/_toolkit/`) is denied even after the docs are read.

The docs each route asks for, from this branch's paths:

- `.prism/references/**`, `.prism/plans/**`, `.prism/skills/**`, `.prism/spec/adrs/**` → `cat .prism/architect/_toolkit/spec-editing.md` and `cat .prism/architect/guides/writing-an-architect-doc.md` (ADRs ask for `cat .prism/architect/guides/writing-an-adr.md` instead of the second one)
- `.ai-skills/skills/**` → `cat .prism/architect/_toolkit/spec-editing.md`, `cat .prism/architect/_toolkit/skills-ecosystem.md`, `cat .prism/architect/_toolkit/ticket-workflows.md`, `cat .prism/architect/_toolkit/closing-messages.md`
- `docs/**` → `cat .prism/architect/_toolkit/documentation.md` and `cat .prism/architect/_toolkit/architecture-doc-shape.md`
- `.ai-skills/definitions/**` → `cat .prism/architect/_toolkit/install-layout.md`

### Clove (implementation)

1. **Rewrite the level table and add the behavior lines in `.prism/references/stakes-calibration.md`.** This file is the one source both Parker's prompt and Sol's intake quote; every later task cites it rather than restating it.

   In `## The three levels`, replace the three table rows so the level column reads `**quick**`, `**reviewed**`, `**strict**` in place of `**Hobby**`, `**Internal**`, `**Launch**`. Leave the Signal and Calibration cells' content as-is except for the level words inside them.

   Below that table, add a new section:

   ```markdown
   ## What each level changes

   The one-line description a consumer shows next to each option. Quote these verbatim in a prompt rather than paraphrasing — a paraphrase is where the two prompts drift apart.

   | Level | What it changes |
   | --- | --- |
   | `quick` | No reviewer rubric, no decision log, no ticket handoff — open questions may stay open. |
   | `reviewed` | Reviewer rubric runs; decision log optional; open questions expected to resolve before merge. |
   | `strict` | Reviewer rubric runs and escalates; decision log required; every open question resolved before finalize. |

   ## The same words as an autonomy ceiling

   Sol reuses these level names for `autonomyPolicy` — the human-set ceiling on which gates a persona may clear for itself. Same vocabulary, a different axis, so the lines differ:

   | Level | What it changes |
   | --- | --- |
   | `quick` | Personas clear their own gates; they escalate only on genuine risk. |
   | `reviewed` | Personas self-clear the clearly-simple cases and escalate on judgment — the balanced default. |
   | `strict` | Every gate stays human. |

   ## Reading older artifacts

   Artifacts written before the rename carry the old words. Read `hobby` as `quick`, `internal` as `reviewed`, and `launch` as `strict`. Closed plans, finalized PRDs, and accepted ADRs keep their original wording — they are records of what was decided then, and rewriting them would make the record lie about itself.
   ```

   In the paragraph under the first table, replace `"What's the stakes here: hobby, internal, or launch?"` with `"How much rigor should this get: quick, reviewed, or strict?"`, and replace `"launch rigor on hobby work"` / `"hobby rigor on launch work"` with `"strict rigor on quick work"` / `"quick rigor on strict work"`. In `## What calibrates`, replace `Hobby tolerates ambiguity that internal flags as risk; launch tolerates none of it.` with `Quick tolerates ambiguity that reviewed flags as risk; strict tolerates none of it.` and `Hobby may finalize with several; launch finalizes with zero.` with `Quick may finalize with several; strict finalizes with zero.`

   Verification: content-only, no build effect on its own. Task 10 runs the build.

2. **Rewrite Parker's calibration prompt in `.prism/skills/prism-prd/greenfield-step-02-stakes.md`.** This is the file the issue is actually about — the bare-label question.

   Replace question 1 (`"Is this a **hobby project**, an **internal tool**, or a **public launch**?"`) with:

   ```markdown
   1. "How much rigor should this PRD get?"

      - **quick** — no reviewer rubric, no decision log, no ticket handoff; open questions may stay open.
      - **reviewed** — reviewer rubric runs; decision log optional; open questions expected to resolve before merge.
      - **strict** — reviewer rubric runs and escalates; decision log required; every open question resolved before finalize.

      Show the three lines with the question. They come from [`stakes-calibration.md`](../../references/stakes-calibration.md) § What each level changes — quote them rather than restating, so the prompt and the reference can't drift.
   ```

   In `## Mapping`, replace the three `→ stakes` values `hobby` / `internal` / `launch` with `quick` / `reviewed` / `strict`. Update the contradiction example `("internal tool" + "10,000 users" + "regulatory")` to `("internal tool" + "10,000 users" + "regulatory" pointing at three different levels)`.

   In `## Actions`, step 5 becomes `Update PRD frontmatter: `stakes: <quick|reviewed|strict>`, `lastEdited: <ISO 8601>`.` Step 7's STOP template becomes:

   ```markdown
   > "Stakes calibrated as `<level>` — <the level's line from `stakes-calibration.md` § What each level changes>. Before I move to drafting, **STOP**: review the stakes call. Do you want to recalibrate, or proceed?"
   ```

   The conditional skip becomes `if `stakes == quick`, skip the STOP`, and the sentence after it becomes `Rubric is auto-skipped at `quick` per `step-06-review.md`` — drop the `:11` line pin, which will drift.

   Verification: content-only. Sequence: after task 1 (the wording comes from the reference doc).

3. **Rename the level tokens across Parker's remaining step files.** All under `.prism/skills/prism-prd/`. Replace `hobby` → `quick`, `internal` → `reviewed`, `launch` → `strict` **only where the word names a stakes level** — leave ordinary uses alone (`greenfield-step-03-mode.md:15` uses "internally" and `mode-internal`; `rubrics/clarity.md` uses "internal consistency" and "internal contradiction"; neither is a level).

   - `step-01-init.md:28, 38, 40` — L28 is the frontmatter seed (`stakes: null`, no level word — check it and leave it if so); L38 is the greenfield live-user guard; L40 is the brownfield confirm. Replace L40's question with: `Ask one question, showing the three lines from` `stakes-calibration.md` `§ What each level changes: "How much rigor should this PRD get — quick, reviewed, or strict?" Map the answer to` `stakes` `using the same levels as` `greenfield-step-02-stakes.md`. Then `stakes: <quick|reviewed|strict>`.
   - `greenfield-step-03-mode.md:17` — `For `quick` stakes, default to fast path…`
   - `greenfield-step-03-mode.md:18` — `For `strict` stakes, recommend coaching path explicitly: "At strict stakes, coaching path catches more gaps. …"`
   - `greenfield-step-04-draft.md:42` — `Decision log next (for reviewed/strict stakes), then review.`
   - `greenfield-step-05-decision-log.md:7, 11, 21, 41` — three `hobby` → `quick`, plus L21's decision-log seed template line naming the stakes level.
   - `step-06-review.md:9, 11, 13, 15, 17, 54, 56` — heading `## Auto-skip for quick stakes`, `stakes: quick`, the user-facing string `"Hobby stakes — skipping…"` → `"Quick stakes — skipping…"`, `skipped: quick stakes`, `## Dispatch (reviewed / strict stakes)`, `## Escalation for strict stakes`, `For `stakes: strict`,`.
   - `step-07-finalize.md:23` — `'skipped (quick stakes)'`.
   - `step-08-ticket-handoff.md:16, 17, 18, 26` — the three bullets become `**`quick`**`, `**`reviewed`**`, `**`strict`**`; the launch bullet's prose becomes `Strict stakes — recommend creating a tracker initiative for cross-team visibility. …`; L26's handoff field carries the level value.

   Verification: `grep -rn -iE '\b(hobby)\b' .prism/skills/prism-prd/` returns nothing. Sequence: after task 2.

4. **Update Parker's persona body at `.ai-skills/skills/prism-prd/shared.md`.** This is the file the disclosure gate and the build both read, so it changes with the step files rather than after them.

   - Lens 7 (around lines 47 and 49) — `Skipping the rubric at `reviewed` or `strict` stakes…`; `If `reviewed` or `strict` — dispatch…`; `If `quick` — skip the rubric…`.
   - Lens 8 (around line 55) — `in greenfield mode with `reviewed` or `strict` stakes…`; `if the user asks Parker to skip the decision log at `strict` stakes…`; `(strict PRDs without a decision log lose the "why"…)`.
   - `## Stakes calibration table` (lines 61–63) — the three level cells become `**quick**`, `**reviewed**`, `**strict**`. Leave the `See … for the level definitions. Do not re-enumerate them here.` line as-is; it is why this table stays a summary.
   - Frontmatter block (line 76) — `stakes: quick | reviewed | strict`.
   - `## Next persona` conditional route (line 179) — `At strict stakes with rubric findings → Winston`.
   - Definition of Done (line 194) — `(or explicitly skipped at quick stakes); decision log created in greenfield mode at `reviewed` / `strict` stakes.`

   Verification: `grep -n -iE 'hobby' .ai-skills/skills/prism-prd/shared.md` returns nothing. Sequence: after task 3.

5. **Rename `autonomyPolicy` values across Sol's spec.** All under `.prism/skills/prism-conductor/`. Same substitution as task 3, again only where the word names a policy level.

   - `step-01-init.md:6` — rewrite the intake option list so each level carries its line: ``strict` (every gate stays human), `reviewed` (personas self-clear the clearly-simple cases and escalate on judgment — the balanced default), or `quick` (personas escalate only on genuine risk)`. Add after it: `The lines come from` `stakes-calibration.md` `§ The same words as an autonomy ceiling — quote them rather than restating.`
   - `step-02-decompose.md:20` — `at `quick` stakes where the gate auto-clears`.
   - `step-03-plan-readiness.md:5` — `may auto-clear under `reviewed` / `quick``.
   - `step-06-escalate.md:12` — `including `quick``; `no `auto-cleared` when `strict` locked the gate`.
   - `lib/goal-state.md:17, 74, 104` — the two schema strings become `"autonomyPolicy": "strict | reviewed | quick"`; line 74's prose becomes `set once at intake (strict / reviewed / quick, reusing Parker's stakes-calibration vocabulary)`.
   - `lib/report-back.md:18, 117, 118, 126, 152, 157, 158, 160, 163` — nine substitutions across the verdict table, the Nora autonomy rows, the hard-pause gate registry, and the merge-backstop paragraph.
   - `lib/fleet.md:39` — `at every autonomy level, including `quick``.
   - `lib/greenfield-decompose.md:41, 42, 50, 56, 57` — including the two table rows.
   - `lib/decision-box.md:65` — ``reviewed`/`strict` above trivial`.

   One hit lives outside Sol's own directory: `.ai-skills/skills/prism-ticket-start/shared.md:346`, in Nora's `## In-loop decision-box mode (dispatched by Sol)`. It is the same `autonomyPolicy` concept (`goal-state.md:74` says so explicitly), so it renames here — `under `reviewed`/`strict`, a ticket commit above trivial returns `needs-human`… Under `quick`, commit autonomously.` This is a cross-lane edit into Nora's persona file; it is in scope because Nora is quoting Sol's policy vocabulary, not defining her own.

   `.ai-skills/skills/prism-conductor/shared.md` needs no edit — it names the dial as "autonomy-policy" and never lists the level words.

   Verification: `grep -rn -iE '\b(hobby)\b' .prism/skills/prism-conductor/ .ai-skills/skills/prism-ticket-start/` returns nothing. Sequence: parallel with tasks 2–4; both depend only on task 1.

6. **Update the Parker row in `.prism/architect/_toolkit/closing-messages.md`.** In the per-persona routing table, the Parker row's conditional route reads `At launch stakes with rubric findings → Winston`; change `launch` to `strict`. This is the same string as `shared.md` line 179 — they are a matched pair and go stale together.

   Verification: content-only. Sequence: with task 4.

7. **Update the two human-facing docs.** `docs/ai-skills/parker.md` — the `## Stakes calibration` table's three level cells, plus the sentence `production code = internal/launch; sandbox/experiment = hobby` → `production code = reviewed/strict; sandbox/experiment = quick`, and `(greenfield + internal/launch stakes)` → `(greenfield + reviewed/strict stakes)`. Add a `What it changes` column to that table carrying the three lines from the reference doc, since this page is where a human meets the levels first.

   `docs/ai-skills/conductor.md` — lines 62, 128, 185, 189, 191, 248, 359, 361. Note line 359 and 361 are ADR link descriptions; rename the tokens in the description text, not the link targets.

   Verification: `grep -rn -iE 'hobby' docs/` returns nothing. Sequence: after tasks 1–5.

8. **Write ADR-0073 recording the rename.** New file `.prism/spec/adrs/_toolkit/0073-stakes-levels-name-their-behavior.md`, following `.prism/architect/guides/writing-an-adr.md` (three sections, an honest negative, `Status: accepted`). 0073 is the next free number — confirmed against the directory, highest existing is 0072.

   - `## Context` — the levels named their audience (`hobby`/`internal`/`launch`), so the prompt asking for one carried no information about what the answer changed. A dogfood session had to explain "internal" in prose at the moment of asking, which is the friction the names themselves should have removed. Sol had reused the same three words for `autonomyPolicy` (ADR-0048), so the names were load-bearing on two axes at once.
   - `## Decision` — rename to `quick` / `reviewed` / `strict`, and give the reference doc a per-level behavior line that both Parker's prompt and Sol's intake quote verbatim. Rejected: keeping the names and only adding descriptions to the prompts (the labels still mislead when they appear alone, in frontmatter or a state file, with no prompt around them). Rejected: renaming Parker's levels while leaving Sol's `autonomyPolicy` on the old words (ADR-0048 pins the two to one vocabulary; a fork costs more than the wider diff).
   - `## Consequences` — the honest negative: every artifact written before the rename carries the old words, and the frozen ones are not being migrated, so a reader of a closed plan or an accepted ADR needs the mapping note in the reference doc to resolve them. Consumer repos on an older PRISM version carry old values in their own PRD frontmatter and any `conductor-state.json`; nothing in the build translates them, so the mapping note is the whole compatibility story.

   Verification: content-only. Sequence: after tasks 1–7.

9. **Point the four affected ADRs at 0073, without rewriting them.** Accepted ADRs are records of what was decided when; the bodies stay as written. Append one line under the `Status` line of each of `.prism/spec/adrs/_toolkit/0043-parker-prd-persona.md`, `0048-conductor-autonomy-between-gates.md`, `0052-conductor-greenfield-decompose-and-ratification-gate.md`, and `0054-conductor-integration-gate-always-human.md`:

   ```markdown
   > Amended by [ADR-0073](./0073-stakes-levels-name-their-behavior.md): the level names below were renamed — read `hobby` as `quick`, `internal` as `reviewed`, `launch` as `strict`.
   ```

   ADR-0054 carries a level name in its **title** ("…Including at `hobby`"), and `.prism/spec/adrs/_toolkit/README.md` quotes that title in its index row. Leave both. Renaming the title would mean renaming the file, which breaks every existing link to 0054, and an index that quotes a title accurately is not stale. The amendment pointer on 0054 is what tells a reader what `hobby` meant.

   Verification: content-only. Sequence: after task 8.

10. **Migrate the in-repo PRD frontmatter, then regenerate and check.** Four finalized PRDs carry `stakes: internal` in frontmatter: `.prism/prds/sol-conductor-phase-b-hierarchy.md:5`, `sol-conductor-phase-c-teams.md:5`, `sol-conductor-phase-d-scale.md:5`, `sol-product-lead-conductor.md:5`. Change each to `stakes: reviewed`. Frontmatter is a machine-read field, not narrative — this is the one part of a frozen PRD that gets migrated, and the bodies stay untouched.

    Then, in order:

    ```
    pnpm prism:build
    pnpm prism:check
    ```

    `pnpm prism:build` regenerates every mirror under `.claude/`, `.codex/`, `.cursor/`, and `templates/install/` — do not hand-edit those; a hand edit is drift and `pnpm prism:check` flags it. `pnpm prism:check` is the full gate and includes `pnpm prism:spec-scope-lint`; that lint wants the changed spec paths' discriminators named in this plan, which tasks 1–9 do.

    Final sweep: `grep -rn --exclude-dir=node_modules --exclude-dir=.git -iE '\bhobby\b' .` should return hits only in the frozen-record set — `.prism/plans/`, `.prism/prds/` bodies and decision logs, `.prism/retros/`, `.prism/qa/`, the four amended ADR bodies, `.prism/spec/adrs/_toolkit/README.md` (it quotes ADR-0054's title), and the generated mirrors of all of those under `.claude/`, `.codex/`, `.cursor/`, `templates/install/`. Any hit outside that set is a missed rename.

    `scripts/` needs no change — there is no schema, enum, or test assertion on the level values anywhere under `scripts/ai-skills/`, and `.ai-skills/config.schema.json` does not constrain them. The only machine-shaped constraints are the illustrative JSON in `lib/goal-state.md` and the frontmatter seed in Parker's `shared.md`, both of which tasks 4–5 cover.

    Sequence: last.

---

## Decisions

- **D1 — the level names are `quick` / `reviewed` / `strict`.**
  - **Root cause:** the old names (`hobby` / `internal` / `launch`) described the *audience* for the work, so the answer to "hobby, internal, or launch?" told the user nothing about what their answer changed. The friction is in the label, not only in the missing description.
  - **Alternatives considered:** `light` / `standard` / `strict` — rejected, "standard" names a position in a list rather than a behavior, which reproduces the original defect on the middle level. Keeping the old names and adding descriptions only at the prompt — rejected, the labels travel without their prompt (PRD frontmatter, `conductor-state.json`, a plan citation) and mislead everywhere the prompt isn't.
  - **Chosen approach:** the issue's own starting point. The three words are monotonic in rigor, each names a process rather than an audience, and each reads correctly on both axes the vocabulary serves — `strict` means "gates stay human" for Sol as naturally as it means "rubric plus escalation" for Parker.
  - **Implementation guidance:** rename the token everywhere it names a level; leave ordinary uses of "internal" and "launch" alone. Task 3 lists the specific false positives.
  - → promoted to ADR-0073 (task 8)

- **D2 — Sol's `autonomyPolicy` renames with Parker's levels, in this PR.** Alternative: rename Parker only and leave `autonomyPolicy` on the old words. Rejected — ADR-0048 pins Sol's policy to Parker's stakes-calibration vocabulary by name, so a partial rename forks one vocabulary into two and every future reader has to learn the mapping. The wider diff is cheaper than the fork, and the two halves cannot ship separately without leaving `main` in the forked state.
  - → promoted to ADR-0073 (task 8)

- **D3 — the per-level behavior lines live in `.prism/references/stakes-calibration.md`, and every prompt quotes them.** Alternative: write the description into each prompt directly. Rejected — Parker asks in two places (greenfield step 02, brownfield step 01) and Sol asks in a third, so three hand-written copies drift on the first edit; `implementation-task-detail.md` § Cite, don't restate already names this failure. The reference doc gets two tables because the vocabulary genuinely serves two axes: what rigor Parker applies, and which gates Sol's personas may clear. Same words, two consequences, one home.
  - → promoted to ADR-0073 (task 8)

- **D4 — frozen records keep their original wording; a mapping note in the reference doc makes them readable.** Accepted ADRs, closed plans, finalized PRD bodies, retros, and the changelog are records of what was decided at a moment; rewriting their prose would make the record misstate itself. Alternative: rewrite the tokens everywhere for a clean `grep`. Rejected for that reason. The four ADRs that carry the vocabulary get a one-line amendment pointer under `Status` instead (task 9) — a pointer is a header annotation, not a body rewrite, and it is what stops a reader of ADR-0052 from hunting for a level that no longer exists.
  - → promoted to ADR-0073 (task 8)

- **D5 — PRD frontmatter `stakes:` values are migrated; nothing else is.** The four in-repo finalized PRDs get `stakes: internal` → `stakes: reviewed`. Alternative: leave them and rely on the mapping note. Rejected — frontmatter is read by Parker as machine state (`shared.md` § Startup: "The PRD's frontmatter IS Parker's state"), so a resumed session on one of those PRDs would branch on a value the renamed step files no longer recognize. A stale narrative sentence is survivable; stale machine state is not. No `.prism/conductor-state.json` exists in this repo — it is a lazy artifact — so there is nothing to migrate on Sol's side.
  - → no promotion needed (one-time migration of four files, not a rule that governs future work)

- **D6 — no alias or back-compat shim in code.** Consumer repos on an older PRISM version may carry old values in their own PRD frontmatter and conductor state, and nothing in `pnpm prism:build` translates them. Alternative: accept the old words as aliases in the step files. Rejected — the step files are prose instructions to a model, not a parser, so an "alias" is just both vocabularies present in the spec, which is the fork D2 rejects. The § Reading older artifacts note in the reference doc is the compatibility story, and it is honest about being the whole of it.
  - → promoted to ADR-0073 § Consequences (task 8)

---

## Sessions

- 2026-09-02 [huntermcgrew/prism-476-stakes-level-names] open: Intent — pick names that carry their own meaning and give every calibration prompt a per-level behavior line, without forking Parker's and Sol's shared vocabulary; Bounds — plan only, no implementation, no edits outside `.prism/plans/prism-476.md` and the GitHub issue body; Approach — one source of truth for the behavior lines in the existing reference doc, rename both consumers in one PR, leave frozen records alone and point at a new ADR · close: scope held
- 2026-09-02 [huntermcgrew/prism-476-stakes-level-names] open: Intent — execute all ten Clove tasks: rename hobby/internal/launch to quick/reviewed/strict everywhere live, add ADR-0073, migrate PRD frontmatter, keep frozen records untouched; Bounds — the ten tasks as written, no scope beyond the plan; Approach — task order 1→10, one commit per task, rebuild and check at the end · close: scope held — a rename-completeness sweep after task 10 found two additional `internal`/`launch` mentions in `.ai-skills/skills/prism-prd/shared.md` that the task 4 pass missed (fixed in a follow-up commit within the same session, not a scope change)

---

## History

- 2026-09-02 [huntermcgrew/prism-476-stakes-level-names]: Winston planned the stakes-level rename — ten Clove tasks, six Decisions, AC synced to issue #476. No implementation.
- 2026-09-02 [huntermcgrew/prism-476-stakes-level-names]: Implemented all ten tasks — renamed hobby/internal/launch to quick/reviewed/strict across `.prism/references/stakes-calibration.md`, Parker's and Sol's specs, the two human docs, and four PRD frontmatter values; added ADR-0073 and pointed the four earlier ADRs at it. `pnpm prism:build && pnpm prism:check` pass clean.

---

## Acceptance Criteria

### Behavioral

- [ ] **AC-1** Given a user starts a new PRD and reaches the stakes question, When the question is asked, Then the three options are named quick, reviewed and strict, and each one is shown with a one-line description of what it changes, without the user having to open any other document.
  - Evidence (machine): `cat .prism/skills/prism-prd/greenfield-step-02-stakes.md` → question 1 lists `quick`, `reviewed`, `strict`, each followed by a description naming at least the reviewer rubric and the decision log · UNMET looks like: the question still lists bare labels, or lists levels with no description beside them

- [ ] **AC-2** Given a user documents an existing feature as a PRD, When the single stakes-confirmation question is asked, Then it offers the same three named levels with the same one-line descriptions as the new-PRD flow.
  - Evidence (machine): `grep -n -A6 'stakes confirm' .prism/skills/prism-prd/step-01-init.md` → the question names `quick`/`reviewed`/`strict` and cites `stakes-calibration.md` § What each level changes · UNMET looks like: the brownfield question still says hobby/internal/launch, or offers the new names with no descriptions

- [ ] **AC-3** Given a user starts an orchestrated run, When asked to set the autonomy policy, Then the options are named quick, reviewed and strict, and each is shown with a one-line description of which gates it lets a persona clear.
  - Evidence (machine): `sed -n '1,12p' .prism/skills/prism-conductor/step-01-init.md` → item 2 names `strict`/`reviewed`/`quick` with a clause each on gate-clearing behavior · UNMET looks like: the intake still offers launch/internal/hobby, or offers the new names as bare labels

- [ ] **AC-4** Given a person reads the human-facing Parker guide, When they reach the stakes section, Then the table names the three levels and states what each one changes.
  - Evidence (human): open `docs/ai-skills/parker.md`, find the stakes table → rows read quick/reviewed/strict and the table carries a column describing what changes at each level · UNMET looks like: the table still lists hobby/internal/launch, or lists the new names with only the rubric/open-questions/decision-log columns

- [ ] **AC-5** Given someone reads a document written before this change that mentions an old level name, When they look up what it meant, Then the shared reference tells them which new level it maps to.
  - Evidence (machine): `grep -n -A4 'Reading older artifacts' .prism/references/stakes-calibration.md` → the section maps `hobby`→`quick`, `internal`→`reviewed`, `launch`→`strict` · UNMET looks like: no mapping section exists, or it names fewer than all three old words

### Non-behavioral

- [ ] **AC-6** No live specification, skill, or documentation file still uses an old level name for a level.
  - Evidence (machine): `grep -rn --exclude-dir=node_modules --exclude-dir=.git -iE '\bhobby\b' .` → every remaining hit is a frozen record (`.prism/plans/`, `.prism/prds/`, `.prism/retros/`, `.prism/qa/`, the four ADR bodies, the ADR index README quoting ADR-0054's title) or a generated mirror of one · UNMET looks like: a hit in `.prism/skills/`, `.ai-skills/skills/`, `.prism/references/`, `.prism/architect/`, or `docs/`. Positive control: the same grep before the change returns hits in `.prism/skills/prism-prd/` — the probe is known to fire

- [ ] **AC-7** The generated platform mirrors match the canonical sources and the full repository gate passes.
  - Evidence (machine): `pnpm prism:build && pnpm prism:check` → exit 0, no drift reported · UNMET looks like: `prism:check` reports drift under `.claude/`, `.codex/`, `.cursor/`, or `templates/install/`, or any lint fails

- [ ] **AC-8** The rename is recorded as an accepted architecture decision, and every earlier decision record that uses the old vocabulary points at it.
  - Evidence (machine): `ls .prism/spec/adrs/_toolkit/0073-*.md` → one file exists with `Status: accepted` and Context/Decision/Consequences sections; `grep -l 'ADR-0073' .prism/spec/adrs/_toolkit/00{43,48,52,54}-*.md` → all four listed · UNMET looks like: no 0073 file, or fewer than four ADRs carrying the pointer

- [ ] **AC-9** Accepted decision records, closed plans, finalized PRD bodies, retros, and the changelog keep their original wording.
  - Evidence (machine): `git diff --stat origin/main` → the only changed lines under `.prism/spec/adrs/_toolkit/00{43,48,52,54}-*.md` are the added amendment-pointer lines, and the only changed lines under `.prism/prds/` are the four `stakes:` frontmatter values · UNMET looks like: prose edits inside any ADR body, retro, or PRD body

### AC Adjustments

### AC Sync Log

| Date | Agent | Action | Plan | Ticket |
| ---- | ----- | ------ | ---- | ------ |
| 2026-09-02 | Winston | AC synced to issue #476 | prism-476 | PRISM-476 |

---

## PR Readiness

- [ ] No critical or major issues — self-review not yet run
- [x] Build passes — last run: 2026-09-02, `pnpm prism:build && pnpm prism:check` both exit 0
- [x] PR description up to date
- [x] Lasting decisions promoted to architect context — ADR-0073, task 8

**Last updated:** 2026-09-02
