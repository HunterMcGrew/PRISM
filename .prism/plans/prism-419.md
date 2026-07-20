# Plan: prism-419

## Ticket

https://github.com/HunterMcGrew/PRISM/issues/419

## Goal

Extend Mira's Path A to accept a finalized PRD or an epic id as first-class input, route it through a new externalized decompose procedure, and land the output as `## User Stories` plus a `### Story Map` subsection in the epic plan — closing the seam where Parker's and the ecosystem doc's declarations ("Mira decomposes PRDs into stories") have no operationalized counterpart in Mira's own body. Fold in a one-line BOM strip on `prism-prd/shared.md` since this lane already rebuilds.

---

## User Stories

Not applicable — this ticket implements a capability evaluation, not a feature requiring elicited user stories.

---

## Design

Not applicable.

---

## Implementation Tasks

Transposed verbatim from `.prism/plans/eval-mira-prd-decompose.md` § Proposed Implementation Tasks (Winston, ratified by Hunter 2026-07-20). See that document for full rationale, options considered, and blast radius.

### Clove (implementation)

1. **Extend Path A's input enumeration** — `.ai-skills/skills/prism-user-stories/shared.md`, Startup step 4. Replace the Path A bullet (`- **Path A — context available:** Goal, description, or notes exist in the plan. Establish domain vocabulary from the context, then draft directly.`) with the same text plus: `— or the input names a finalized PRD (\`.prism/prds/<slug>.md\`) or an epic id.` and a trailing bold trigger sentence: `**When the input is a PRD or an epic, read [\`prd-decompose.md\`](../../../.prism/references/user-stories/prd-decompose.md) and follow it — the output shape branches by grain.**` Also update the `$ARGUMENTS` note (line 228) to add: a PRD slug or epic id in `$ARGUMENTS` selects the PRD/epic input of Path A. Verification: task 5.

2. **Create `.prism/references/user-stories/prd-decompose.md`** — content per the eval's RECOMMENDATION § Procedure and § Output, structured as: `## Input resolution` (slug → read `.prism/prds/<slug>.md`; require `status: finalized`, flag drafts; epic id → plan-lookup); `## Decompose` (backbone from PRD `## User journeys`; vertically-sliced stories per SPIDR; MoSCoW seeded from PRD `## Scope`; walking-skeleton Must slice designated; what-if sweep per story; no architecture choices — cite Mira lens #1); `## Output shape` (epic plan path per branch-plan.md naming; `## User Stories` standard format + `### Story Map` subsection: backbone table, per-story MoSCoW + candidate-ticket marker, walking-skeleton designation; create the plan lazily per plan-lookup step 6); `## Handoff` (default Winston; note that Nora cuts one ticket per candidate-ticket marker via her create-path). Cite `frameworks.md` by section rather than restating (per `implementation-task-detail.md` § Cite, don't restate). Content-only change, no build effect beyond task 5's regeneration.

3. **Update Mira's frontmatter description** — `.ai-skills/skills/prism-user-stories/frontmatter.yml`. Replace `Sits below Parker on grain.` with `Sits below Parker on grain — decomposes finalized PRDs and epics into a prioritized story map.` Keep the folded scalar; stay under the 1000-char cap. Verification: task 5 (`discovery-metadata.test.ts` asserts the cap).

4. **Add the artifact row and Parker-row note** — `.prism/architect/_toolkit/skills-ecosystem.md`. In the artifact ownership table (near line 201), add row: `| \`### Story Map\` (under \`## User Stories\`, epic plans) | Mira | Winston, Nora |`. In the Parker roster row (line 38), append one sentence: `Handoff lands via Mira's Path A PRD/epic input.` Content-only.

5. **Regenerate and verify** — run `pnpm prism:build`, then `pnpm prism:test`. Confirm `.claude/skills/prism-user-stories/SKILL.md` regenerates with the Path A change and stays ≤ 500 lines. Sequence: after tasks 1–4.

6. **Strip the BOM artifact** — `.ai-skills/skills/prism-prd/shared.md`. Remove the trailing `ef bb bf` BOM bytes plus the literal line `# BOM planted for sanity check` after "Hand off cleanly." Rebuild via `pnpm prism:build` (same invocation as task 5) so generated surfaces (`.claude/agents/prism-prd.md`, `.claude/skills/prism-prd/SKILL.md`, `.cursor/skills/prism-prd/SKILL.md`) pick up the strip. Content-only; no source-of-truth beyond the file itself.

### Clove (review fixes — Eric PR `#423` round 1; per Decisions "PRD/epic detection…", "Silent fallback…", "Citation form…")

8. **Add the detection rule to the Path A bullet** — `.ai-skills/skills/prism-user-stories/shared.md`, Startup step 4 (Determine path). Replace `or the input names a finalized PRD (\`.prism/prds/<slug>.md\`) or an epic id. Establish domain vocabulary from the context, then draft directly.` with `or the input names a finalized PRD (\`.prism/prds/<slug>.md\`) or an epic id. An input names one when the check resolves, in order: a file exists at \`.prism/prds/<input>.md\` → PRD; a plan exists at \`.prism/plans/epic-<input>.md\` → epic; when both exist, the PRD is the input and the existing epic plan is the append target; neither → the input is feature context, not a PRD or epic. If the request explicitly calls the input a PRD or an epic and neither check resolves, stop and say what was looked for and where — don't silently draft from the phrase as feature context. Establish domain vocabulary from the context, then draft directly.` Keep the trailing bold `prd-decompose.md` trigger sentence unchanged. Verification: task 12.

9. **Grain-branch the save step** — same file, "After drafting" step 4. Replace the two sub-bullets `- Append to \`## User Stories\` in \`<repo-root>/.prism/plans/<ticket-id>.md\`` and `- Create the section if it doesn't exist (place it after \`## Goal\`)` with: `- Feature-context input: append to \`## User Stories\` in \`<repo-root>/.prism/plans/<ticket-id>.md\`; create the section if it doesn't exist (place it after \`## Goal\`)` and `- PRD/epic input: the save target is the epic plan per \`prd-decompose.md\` § Output shape — not the ticket plan`. Also update the `$ARGUMENTS` note: replace `A PRD slug or epic id in \`$ARGUMENTS\` selects the PRD/epic input of Path A.` with `A PRD slug or epic id in \`$ARGUMENTS\` — classified by the ordered existence check in Path A above — selects the PRD/epic input of Path A.` Verification: task 12.

10. **Align `prd-decompose.md` with the ruling and the citation form** — `.prism/references/user-stories/prd-decompose.md`, seven edits, all content-only:
    - Line 3: replace `` (`shared.md § Determine path`) `` with `(the skill body § Determine path)`.
    - Line 7 (PRD-slug bullet): append the sentence `If the epic plan for this PRD already exists (a prior decompose run), append to it — don't recreate it or duplicate stories already present in its \`## User Stories\`.`
    - Line 14: replace `` `../../../.ai-skills/skills/prism-prd/shared.md § PRD output shape` `` with ``the `prism-prd` skill body § PRD output shape``.
    - Line 17: replace `` `../../../.ai-skills/skills/prism-user-stories/shared.md § Story format` `` with `the skill body § Story format`.
    - Lines 18 and 21: replace `` `shared.md § 5. Scope as negotiation, not amputation` `` and `` `shared.md § 1. Problem before solution` `` with `the skill body § 5. Scope as negotiation, not amputation` / `the skill body § 1. Problem before solution`.
    - Line 30: replace `` `../../../.ai-skills/skills/prism-user-stories/shared.md § Story format` `` with `the skill body § Story format`.
    - § Output shape (after the lazy-create paragraph, line 26): append the write guard `If the resolved target is a ticket-grain plan (\`prism-NNNN.md\`), the input was misclassified — stop and re-run the skill body's Path A existence check rather than writing.`
    Sequence: after tasks 8–9 (the guard cites the check task 8 introduces). Verification: task 12.

11. **Fix the plan-text Minors (Eric Minor 3 + Briar's open Minor)** — `.prism/plans/prism-419.md § AC Adjustments`. Replace `no \`ef bb bf\` or \`# BOM planted for sanity check\` anywhere in the tree` with `no \`ef bb bf\` or \`# BOM planted for sanity check\` in \`prism-prd\` sources or generated surfaces (a pre-existing BOM opening \`.prism/lessons.md\` is unrelated and out of scope)`. Replace `none of these can be exercised from code alone without a real PRD/epic fixture` with `AC-1/AC-3/AC-4/AC-5 can run today against an existing finalized PRD (e.g. \`.prism/prds/sol-product-lead-conductor.md\`); AC-2 needs a draft-status PRD, which doesn't exist yet — the barrier is that Mira is an LLM-invoked skill, not a subroutine scripted tooling can call`. Then set Briar's Review Issue "AC Adjustments pre-flight note overstates the fixture barrier" to **Status:** `fixed`. Content-only.

12. **Regenerate, verify, request re-review** — run `pnpm prism:build`, then `pnpm prism:test`; confirm `.claude/skills/prism-user-stories/SKILL.md` regenerates with tasks 8–9 and stays ≤ 500 lines; run `pnpm prism:crossref-lint`. Sequence: after tasks 8–11. Then re-request Eric on PR `#423`.

### Winston (plan close, when this ticket lands)

7. Promote the decision "PRD decomposition is a Path A input extension, not a mode; story map lives as `### Story Map` under `## User Stories` in epic plans" to `skills-ecosystem.md` context (largely done by task 4; verify at close per the Decision verdict gate). Also execute the deferred promotion on the citation-form Decision (fold into `.prism/rules/skill-authoring.md § Externalization mechanics`).

---

## Decisions

- **PRD/epic decomposition is a Path A input extension, not a named mode.** Mira's flow (elicit → draft → quality-check → review → save) doesn't diverge by input source — only the input trigger and output grain differ. Per `.prism/rules/code-standards.md`'s two-adapters rule, a single caller doesn't earn a mode; a mode is surface every reader loads for a branch most sessions never take. Considered: adding a named `MODE` like Reese's mode selection. Rejected because Reese's modes exist for procedures that genuinely diverge; Mira's doesn't. If a second decompose-source appears later (e.g. a Vera strategy doc), the Path A extension upgrades to a mode cheaply — not before. → no promotion needed (already recorded in `.prism/plans/eval-mira-prd-decompose.md`, the source evaluation; this plan cites it rather than re-deciding).
- **`### Story Map` is a subsection convention under `## User Stories`, not a new top-level branch-plan template section.** Considered: adding `## Story Map` to `.prism/rules/branch-plan.md`'s template. Rejected — that edits the shared plan template every persona reads, for a section only epic plans use. Sections are additive per the template's own convention, and Winston and Nora already read `## User Stories`, so the map rides along in reads that already happen. → no promotion needed (subsection convention lives in `prd-decompose.md`, not the shared template, by design).
- **Zero edits to Winston's or Nora's skill bodies in v1.** Both consume the new output shape (`### Story Map`) through reads they already perform — Winston's plan-mode reads `## User Stories`; Nora's create-path reads whatever a ticket-cutting session points her at. → no promotion needed (this is the "why" behind tasks 1–5 touching only Mira's files; captured in the eval document, not a durable architectural claim beyond what task 4's ecosystem-doc row already records).
- **PRD/epic detection is an ordered filesystem-existence check, living in Mira's skill body — Eric's PR `#423` round-1 formulation adopted with three amendments.** (Winston ruling on Eric's Major; resolves the needs-replan.)
  - **Root cause:** Path A names a finalized PRD or an epic id as inputs but never defines what makes an input one, and `prd-decompose.md § Input resolution` assumes classification already happened. `mega-menu-redesign` reads equally as PRD slug, epic slug, or feature description — and the three route differently.
  - **Chosen approach:** classify the candidate input by existence, in order: (1) a file exists at `.prism/prds/<input>.md` → PRD input; (2) a plan exists at `.prism/plans/epic-<input>.md` → epic input; (3) neither → feature context (normal Path A). Detection stays in the skill body — a detection condition can't be externalized (skill-authoring § Externalization mechanics, tripwire nuance), and `prd-decompose.md:3` already promises the body carries it; the reference remains the post-classification procedure.
  - **Amendments to Eric's clause:** (a) the epic check is a direct existence check on `.prism/plans/epic-<input>.md`, not "plan lookup resolved an `epic-*.md` plan" — plan lookup's id-extraction (its steps 4–5) is undefined for bare slugs, and the classifier must not inherit that fuzz; (b) precedence is PRD-first — when both files exist (re-decompose of a PRD whose epic plan already exists), the PRD is the input and the existing epic plan is the append target, never recreated; (c) an input the request explicitly calls a PRD or an epic that fails both checks stops loudly — say what was looked for and where — never silently downgrades to feature-context drafting.
  - **Alternatives considered:** phrase heuristics ("decompose", "the X PRD") as the classifier. Rejected: non-deterministic across models — the exact divergence `implementation-task-detail.md` exists to prevent. The phrase survives only as the loud-failure trigger in (c).
  - **Implementation guidance:** task 8 (body edit), task 10 (reference alignment). Two LLMs running the check produce identical classifications — that is the bar.
  - → no promotion needed (skill-behavior rule; Mira's body, edited by task 8, is itself the durable surface).
- **Silent fallback to the branch plan is correct only as the classifier's third branch; the save step becomes grain-branched; the zero-Winston/Nora-edits constraint holds unamended.** (Winston ruling on the silent-wrong-plan half of Eric's Major.)
  - **Root cause:** the body's save step ("After drafting" step 4) names only `<ticket-id>.md`; the epic-plan target lives only in the reference. Two instructions disagree, and long sessions follow the body — so a decompose run could write the wrong plan silently.
  - **Chosen approach:** with the classifier in place, a non-firing trigger *means* feature context — writing to the branch plan there is routing, not failure. Two cases fail loudly instead of falling back: the explicit-name mismatch (amendment c above) and a decompose run whose resolved save target is ticket-grain — a one-sentence write guard in `prd-decompose.md § Output shape` (task 10) stops the write and re-runs classification. The body's save step branches by grain (task 9) so body and reference agree.
  - **Constraint ruling:** "zero edits to Winston's or Nora's skill bodies in v1" holds unamended — the save step is Mira's own body, which tasks 1–5 already edit; the constraint never covered Mira.
  - **Alternatives considered:** guard only in the reference — rejected, body-traversal sessions still hit the contradiction; a hard fail mechanism — none exists in prose-driven skills, so the honest fix is agreement between the two instructions plus a tripwire at the write.
  - → no promotion needed (Mira-local save semantics; task 4's ecosystem-doc artifact row already records the epic-plan target durably).
- **Citation form in consumer-shipped references: skill-body content is cited by skill + section as prose, never by filesystem path.** (Winston ruling on Eric's Minors 1–2 so the fix lands once, consistently.)
  - In `.prism/references/`, cite the owning skill's own body as `the skill body § <section>` and another skill's body as ``the `<skill-id>` skill body § <section>`` — prose, no path, no link. Consumer installs ship no `.ai-skills/skills/`, and the generated body path differs per platform (`.claude/`, `.codex/`, `.cursor/`), so no single path resolves everywhere; the executing model always has its own body in context, and a sibling skill is loadable by id. Bare `shared.md § N` citations are the same defect in shorter clothes — same fix.
  - Sibling references and `.prism/` rules/templates keep the relative-link convention (skill-authoring § Externalization mechanics) — those ship in `templates/install/` and resolve; Eric verified all four in this PR.
  - → promotion deferred to plan close: fold the skill-body citation form into `.prism/rules/skill-authoring.md § Externalization mechanics` (cross-skill authoring rule; this dispatch commits the plan file only per the lane's scope).

---

## Sessions

- 2026-07-20 [huntermcgrew/prism-419-mira-prd-decompose] open: Intent — seed the branch and plan for the ratified Mira PRD-decomposition lane per Winston's evaluation; Bounds — file the issue, create the branch, transpose tasks/AC verbatim into a new plan file, commit only the plan; no implementation in this session; Approach — dupe-search, branch from origin/main, write plan, single-file commit. · close: scope held
- 2026-07-20 [huntermcgrew/prism-419-mira-prd-decompose] open: Intent — implement tasks 1-6 exactly as Winston's plan specifies (Path A extension, new prd-decompose.md reference, frontmatter/ecosystem-doc updates, BOM strip), no relitigating the ratified design; Bounds — touch only the files named in the plan tasks, zero edits to Winston's or Nora's skill bodies, no new mode; Approach — apply each task's exact old_string/new_string per the detail bar, regenerate via prism:build, verify via prism:test, two commits (implementation, then BOM strip per the assignment). · close: scope held — touched exactly the files named across tasks 1-6 plus their generated mirrors; no drift into Winston, Nora, or the sibling routing lane.
- 2026-07-20 [huntermcgrew/prism-419-mira-prd-decompose] open: Intent — self-review PR #423 against the design constraints (no mode, zero Winston/Nora body edits, no branch-plan template edit) and independently verify AC-6/AC-7 and Clove's manual-QA framing for AC-1–AC-5; Bounds — read-only review, findings go to the plan, never to GitHub; Approach — diff against main in the correct worktree, re-run build/test/lint independently rather than trusting the plan's claims, byte-scan for the BOM, grep for existing PRD fixtures to check the honesty-flag framing. · close: scope held — one Minor finding written to `## Review Issues`; no critical or major issues; verdict done.
- 2026-07-20 [huntermcgrew/prism-419-mira-prd-decompose] open: Intent — rule on Eric's round-1 needs-replan (detection rule, silent-wrong-plan save, citation form) and encode the ruling as Decisions + review-fix tasks; Bounds — plan file only, no code or reference edits, zero Winston/Nora body scope; Approach — adopt Eric's existence check with three amendments, grain-branch Mira's own save step, one prose citation rule, tasks 8–12 at the detail bar. · close: scope held — plan file is the only edit; all fixes routed to Clove as exact-string tasks.
- 2026-07-20 [huntermcgrew/prism-419-mira-prd-decompose] open: Intent — execute tasks 8–12 exactly as Winston's ruling specifies (detection rule in the Path A bullet, grain-branched save step, seven prd-decompose.md citation-form edits, plan-text Minor fixes, regenerate/verify); Bounds — touch only the files named in tasks 8–11 plus their generated mirrors via rebuild, zero Winston/Nora body edits, no relitigating the ruling; Approach — apply each task's exact old_string/new_string, one local-frame wording fix on the doubled "skill body" citation produced by task 10's literal line-3 replacement, rebuild, test, crossref-lint. · close: scope held — diff touches exactly `shared.md`, `prd-decompose.md` (+ generated mirrors across `.claude/`, `.codex/`, `.cursor/`, `templates/install/`), and the plan file; `pnpm prism:build` + `pnpm prism:test` 504/504, `pnpm prism:crossref-lint` clean, generated SKILL.md 365 lines (≤500).

---

## History

- 2026-07-20 [huntermcgrew/prism-419-mira-prd-decompose]: Created plan from Winston's ratified evaluation (`.prism/plans/eval-mira-prd-decompose.md`); tasks and AC transposed verbatim, no re-derivation.
- 2026-07-20 [huntermcgrew/prism-419-mira-prd-decompose]: Implemented tasks 1-5 — Path A now names a finalized PRD or epic id as first-class input with a deterministic trigger into new `.prism/references/user-stories/prd-decompose.md`; added `### Story Map` artifact row + Parker handoff note to `skills-ecosystem.md`; regenerated via `pnpm prism:build` (365-line generated SKILL.md, well under the 500 cap; 408-char frontmatter description, under the 1000 cap); `pnpm prism:test` passes 504/504.
- 2026-07-20 [huntermcgrew/prism-419-mira-prd-decompose]: Fixed AC-7 — stripped the planted BOM (`ef bb bf` + `# BOM planted for sanity check`) from `.ai-skills/skills/prism-prd/shared.md` and rebuilt; confirmed byte-clean across `.claude/agents/prism-prd.md`, `.claude/skills/prism-prd/SKILL.md`, `.cursor/skills/prism-prd/SKILL.md`, and a repo-wide BOM grep found no other occurrences.
- 2026-07-20 [huntermcgrew/prism-419-mira-prd-decompose]: Briar self-review — independently reproduced AC-6/AC-7 (build+test 504/504, crossref-lint clean, byte scan clean), confirmed all design constraints held, and flagged one Minor: the AC Adjustments note overstates the fixture barrier for AC-1–AC-5 (finalized PRDs already exist at `.prism/prds/sol-*.md`).
- 2026-07-20 [huntermcgrew/prism-419-mira-prd-decompose]: Winston ruling on Eric's PR `#423` round-1 needs-replan — adopted the existence-check detection rule with three amendments, grain-branched Mira's save step (zero-Winston/Nora constraint holds), and set the prose citation form; see the three new Decisions and tasks 8–12. Added AC-8 for the classifier's loud-failure branch.
- 2026-07-20 [huntermcgrew/prism-419-mira-prd-decompose]: Implemented tasks 8–11 — Path A's Determine-path bullet now carries the ordered existence check plus the loud-failure clause, the save step is grain-branched (feature-context → ticket plan, PRD/epic → epic plan), all seven `prd-decompose.md` citations moved to the skill-body prose form (Winston's citation-form ruling), and the plan's AC Adjustments note now names the four ready-to-use finalized PRDs and narrows the BOM claim to `prism-prd` surfaces. Regenerated via `pnpm prism:build`, verified via `pnpm prism:test` (504/504) and `pnpm prism:crossref-lint` (clean).

---

## Debugged Issues

None yet.

---

## Review Issues

### AC Adjustments pre-flight note overstates the fixture barrier

- **Severity:** `minor`
- **Status:** `fixed` — reworded per task 11; names the four ready-to-use finalized PRDs and narrows the BOM claim to prism-prd surfaces.
- **File:** `.prism/plans/prism-419.md:108` (`## Acceptance Criteria > AC Adjustments`)
- **Problem:** The pre-flight note says AC-1 through AC-5 "can't be exercised from code alone without a real PRD/epic fixture" without naming that finalized fixtures already exist — `.prism/prds/sol-conductor-phase-b-hierarchy.md`, `sol-conductor-phase-c-teams.md`, `sol-conductor-phase-d-scale.md`, and `sol-product-lead-conductor.md` all carry `status: finalized` today. The genuine barrier is that Mira is an LLM-invoked skill, not a subroutine Clove's tooling can call and capture output from — but the note reads as if no usable input exists yet, which would send whoever runs the live-fixture pass (Reese or manual QA) looking to author one from scratch.
- **Suggested fix:** Reword the note to name the ready-to-use finalized PRDs directly (e.g. "run against the existing finalized PRD at `.prism/prds/sol-product-lead-conductor.md`") so AC-1, AC-3, AC-4, and AC-5 can be exercised immediately. AC-2 still needs a draft/reviewed-status PRD, which genuinely doesn't exist yet — that half of the note stands as-is.

### No issues found — 2026-07-20 [huntermcgrew/prism-419-mira-prd-decompose]

All design constraints independently verified clean: zero edits to `prism-architect`/`prism-ticket-start` bodies, zero `branch-plan.md` template edit, no mode-selection language introduced. AC-6 and AC-7 independently reproduced (`pnpm prism:build` + `pnpm prism:test` → 504/504; `pnpm prism:crossref-lint` → clean; repo-wide byte scan for `ef bb bf` → none found; generated SKILL.md 365 lines; frontmatter description 408 chars). Every citation in the new `.prism/references/user-stories/prd-decompose.md` (relative paths and section headers) resolves. Clove's AC-1–AC-5 manual-QA framing is directionally correct — one Minor accuracy gap flagged above.

---

## Acceptance Criteria

### Behavioral

- [ ] **AC-1** Given a finalized PRD exists at `.prism/prds/<slug>.md` and no plan exists for it, When Mira is invoked with the slug or "decompose the `<slug>` PRD," Then Mira reads the PRD and writes `.prism/plans/epic-<id-or-slug>.md` containing `## User Stories` and a `### Story Map` subsection with a journey backbone, per-story MoSCoW classification, a designated walking-skeleton Must slice, and candidate-ticket markers.
  - Evidence (machine): scripted run produces the file with all four required elements present.
- [ ] **AC-2** Given the PRD's frontmatter is `status: draft`, When Mira is invoked to decompose it, Then she flags the non-finalized status and does not write stories until the user overrides.
  - Evidence (human): transcript review of a draft-PRD run.
- [ ] **AC-3** Given the story map exists in an epic plan, When Winston runs plan mode against that plan, Then his story read picks up the map without any Winston-side change, and slice ordering follows the map rather than being re-derived.
  - Evidence (human): plan-mode transcript on a mapped epic plan.
- [ ] **AC-4** Given the story map marks candidate tickets, When Nora is asked to create a ticket for a marked story, Then the ticket title, AC hints, and priority derive from the map entry without re-elicitation.
  - Evidence (human): Nora create-path transcript.
- [ ] **AC-5** Given any decompose run, Then no written story names an implementation mechanism (UI widget, schema, function) — solutions stay with Winston.
  - Evidence (human): spot-check of story text.
- [ ] **AC-8** Given no file exists at `.prism/prds/<input>.md` and no plan exists at `.prism/plans/epic-<input>.md`, When Mira is invoked with that input, Then she treats it as feature context — and if the request explicitly called it a PRD or an epic, she says what was looked for and where instead of drafting stories from the phrase. (Decisions § "PRD/epic detection…")
  - Evidence (human): transcript of a run with a non-resolving input.
- [ ] **AC-7** Given the BOM strip lands, When `.ai-skills/skills/prism-prd/shared.md` and its generated surfaces (`.claude/agents/prism-prd.md`, `.claude/skills/prism-prd/SKILL.md`, `.cursor/skills/prism-prd/SKILL.md`) are inspected, Then none contain the `ef bb bf` BOM bytes or the `# BOM planted for sanity check` line.
  - Evidence (machine): byte-level check post-rebuild.

### Non-behavioral

- [ ] **AC-6** `pnpm prism:build` and `pnpm prism:test` pass; generated `prism-user-stories/SKILL.md` ≤ 500 lines; frontmatter description ≤ 1000 chars.
  - Evidence (machine): CI run.

### AC Adjustments

**Pre-flight note (Clove, not a graded verdict):** AC-6 and AC-7 verified directly — `pnpm prism:build` and `pnpm prism:test` both pass (504/504), generated `prism-user-stories/SKILL.md` is 365 lines (≤500), frontmatter description is 408 chars (≤1000), and a byte-level scan confirms no `ef bb bf` or `# BOM planted for sanity check` in `prism-prd` sources or generated surfaces (a pre-existing BOM opening `.prism/lessons.md` is unrelated and out of scope). AC-1 through AC-5 need a live run against an actual finalized PRD (AC-1, AC-2), a Winston plan-mode pass on a mapped epic (AC-3), a Nora create-path pass against a candidate-ticket marker (AC-4), and a spot-check of story text (AC-5) — AC-1/AC-3/AC-4/AC-5 can run today against an existing finalized PRD (e.g. `.prism/prds/sol-product-lead-conductor.md`); AC-2 needs a draft-status PRD, which doesn't exist yet — the barrier is that Mira is an LLM-invoked skill, not a subroutine scripted tooling can call. Flagging for manual QA / a follow-up scripted run rather than claiming graded coverage.

### AC Sync Log

| Date | Agent | Action | Plan | Ticket |
| ---- | ----- | ------ | ---- | ------ |
| 2026-07-20 | Nora | Seeded plan and AC from ratified evaluation; synced to issue #419 body | synced | synced |

---

## Cleanup Items

- `.ai-skills/skills/prism-prd/shared.md` — trailing BOM (`ef bb bf`) + `# BOM planted for sanity check` line, tracked as task 6.

---

## PR Readiness

Living checklist — updated every time `code-review-self` runs. Reflects current state.

- [x] No critical or major issues
- [x] Types correct — no `any`, no unsafe `as` (content-only change; no TypeScript touched)
- [x] No stray console.logs or debug artifacts
- [ ] Tests written for new logic and edge cases (content-only reference doc; no new test-bearing logic — AC-1 through AC-5 need a live-run scripted test per the pre-flight note above)
- [x] All debugged issues resolved (no `open` entries)
- [x] Build passes — last run: 2026-07-20 (`pnpm prism:build` + `pnpm prism:test`, 504/504)
- [ ] PR description up to date (not yet opened)
- [ ] Lasting decisions promoted to architect context (Winston task 7, at plan close)

**Last updated:** 2026-07-20
