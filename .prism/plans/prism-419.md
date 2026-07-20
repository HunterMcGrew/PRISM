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

### Clove (review fixes — Eric PR `#423` round 2; classifier completion, no semantics change)

13. **Derive `<input>` from `$ARGUMENTS` before the existence check** — `.ai-skills/skills/prism-user-stories/shared.md`, Startup step 4 (Determine path). Insert a derivation clause ahead of the ordered existence check: lowercase `$ARGUMENTS`, strip leading filler tokens (`decompose`, `the`) and trailing filler tokens (`prd`, `epic`) case-insensitively (repeated until none remain) plus surrounding quotes/punctuation, and use the remaining token as `<input>`. Content-only. Verification: rebuild + test.
14. **Skip plan-lookup step 6 when the classifier resolves** — same file, Startup step 2 (Plan lookup). Add a sub-bullet: run step 4's existence check against `$ARGUMENTS` before plan-lookup step 6 fires; if it resolves as a PRD or an epic, skip step 6 — the decompose flow resolves its own target and step 6 would otherwise prompt for a ticket or create a spurious ticket-grain plan before classification runs. Content-only. Verification: rebuild + test.
15. **Fix the re-inherited plan-lookup citation** — `.prism/references/user-stories/prd-decompose.md § Input resolution`, the "Epic id" bullet. Replace the `../plan-lookup.md` call with a direct read of `.prism/plans/epic-<input>.md` — the file Path A's existence check (task 13) already resolved. Content-only. Verification: rebuild + test + crossref-lint.

### Clove (review fixes — Eric PR `#423` round 3; two Minors, no Majors)

16. **Fix the derivation's position-lock and the re-surfaced plan-lookup citation** — two content-only edits:
    - `.ai-skills/skills/prism-user-stories/shared.md`, Startup step 4 (Determine path): replace the leading/trailing filler-list derivation sentence with an either-end whole-token strip over the set `decompose`, `the`, `for`, `from`, `prd`, `epic`, `plan` (exact-token match only, never substring/prefix), repeated until neither end matches; join a multi-token remainder with hyphens; fall through to Path B on an empty remainder.
    - `.prism/references/user-stories/prd-decompose.md` § Output shape: replace the `../plan-lookup.md` step-6 citation with `../../rules/branch-plan.md § Plan File Template`.
    Verification: `pnpm run prism:check`; hand-trace the derivation against `decompose the sol-product-lead-conductor PRD`, bare `PRISM-1524`, `decompose epic PRISM-1524`, and `epic-onboarding` (must survive intact).

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
- **The classifier's `<input>` is derived from `$ARGUMENTS`, not read raw; plan-lookup step 6 is guarded until classification runs.** (Round 2 fixes completing Winston's "two LLMs produce identical classifications" bar; no change to the classifier's ratified semantics.)
  - **Root cause:** the existence check never said how `<input>` comes out of a natural-language `$ARGUMENTS` — "decompose the sol-product-lead-conductor PRD" (AC-1's own invocation form) reads as the raw string, misses both filesystem checks, and trips the explicit-name loud-stop; `PRISM-1524` misses the lowercase-named `epic-prism-1524.md` on a case-sensitive filesystem. Separately, Startup step 2 (Plan lookup) ran plan-lookup's step 6 (ask-then-create) before step 4's classifier ever ran, so AC-1's own precondition ("no plan exists for it") drove Mira into asking for a ticket or creating a spurious ticket-grain plan.
  - **Chosen approach:** derive `<input>` by lowercasing `$ARGUMENTS` and stripping leading (`decompose`, `the`) / trailing (`prd`, `epic`) filler tokens plus surrounding punctuation, repeated until none remain — deterministic string stripping, not phrase-matching. Guard Plan lookup step 2 with a forward reference to step 4's existence check: if it resolves as a PRD or an epic, skip plan-lookup step 6. `prd-decompose.md`'s "Epic id" bullet now reads `.prism/plans/epic-<input>.md` directly instead of re-running `../plan-lookup.md`, closing the last place the pre-classifier id-extraction fuzz could re-enter post-classification.
  - **Alternatives considered:** phrase-matching for the derivation ("decompose", "PRD" as keywords with positional rules) — rejected, same non-determinism risk the classifier itself was built to avoid; reordering Startup so step 4 runs textually before step 2 — rejected, would restructure the numbered step list Nora/Mira share the shape of; a guard clause achieves the same effect without renumbering.
  - **Implementation guidance:** task 13 (derivation), task 14 (plan-lookup guard), task 15 (Epic id citation fix). Verified against both of Winston's named failure cases (AC-1's own phrasing; `PRISM-1524`'s lowercase mismatch).
  - → no promotion needed (skill-behavior rule; Mira's body, edited by tasks 13–14, is itself the durable surface — same rationale as the round-1 detection-rule Decision above).

---

## Sessions

- 2026-07-20 [huntermcgrew/prism-419-mira-prd-decompose] open: Intent — seed the branch and plan for the ratified Mira PRD-decomposition lane per Winston's evaluation; Bounds — file the issue, create the branch, transpose tasks/AC verbatim into a new plan file, commit only the plan; no implementation in this session; Approach — dupe-search, branch from origin/main, write plan, single-file commit. · close: scope held
- 2026-07-20 [huntermcgrew/prism-419-mira-prd-decompose] open: Intent — implement tasks 1-6 exactly as Winston's plan specifies (Path A extension, new prd-decompose.md reference, frontmatter/ecosystem-doc updates, BOM strip), no relitigating the ratified design; Bounds — touch only the files named in the plan tasks, zero edits to Winston's or Nora's skill bodies, no new mode; Approach — apply each task's exact old_string/new_string per the detail bar, regenerate via prism:build, verify via prism:test, two commits (implementation, then BOM strip per the assignment). · close: scope held — touched exactly the files named across tasks 1-6 plus their generated mirrors; no drift into Winston, Nora, or the sibling routing lane.
- 2026-07-20 [huntermcgrew/prism-419-mira-prd-decompose] open: Intent — self-review PR #423 against the design constraints (no mode, zero Winston/Nora body edits, no branch-plan template edit) and independently verify AC-6/AC-7 and Clove's manual-QA framing for AC-1–AC-5; Bounds — read-only review, findings go to the plan, never to GitHub; Approach — diff against main in the correct worktree, re-run build/test/lint independently rather than trusting the plan's claims, byte-scan for the BOM, grep for existing PRD fixtures to check the honesty-flag framing. · close: scope held — one Minor finding written to `## Review Issues`; no critical or major issues; verdict done.
- 2026-07-20 [huntermcgrew/prism-419-mira-prd-decompose] open: Intent — rule on Eric's round-1 needs-replan (detection rule, silent-wrong-plan save, citation form) and encode the ruling as Decisions + review-fix tasks; Bounds — plan file only, no code or reference edits, zero Winston/Nora body scope; Approach — adopt Eric's existence check with three amendments, grain-branch Mira's own save step, one prose citation rule, tasks 8–12 at the detail bar. · close: scope held — plan file is the only edit; all fixes routed to Clove as exact-string tasks.
- 2026-07-20 [huntermcgrew/prism-419-mira-prd-decompose] open: Intent — execute tasks 8–12 exactly as Winston's ruling specifies (detection rule in the Path A bullet, grain-branched save step, seven prd-decompose.md citation-form edits, plan-text Minor fixes, regenerate/verify); Bounds — touch only the files named in tasks 8–11 plus their generated mirrors via rebuild, zero Winston/Nora body edits, no relitigating the ruling; Approach — apply each task's exact old_string/new_string, one local-frame wording fix on the doubled "skill body" citation produced by task 10's literal line-3 replacement, rebuild, test, crossref-lint. · close: scope held — diff touches exactly `shared.md`, `prd-decompose.md` (+ generated mirrors across `.claude/`, `.codex/`, `.cursor/`, `templates/install/`), and the plan file; `pnpm prism:build` + `pnpm prism:test` 504/504, `pnpm prism:crossref-lint` clean, generated SKILL.md 365 lines (≤500).
- 2026-07-20 [huntermcgrew/prism-419-mira-prd-decompose] open: Intent — delta re-review of commit `39d1706` against Eric's PR `#423` round-1 findings, diffing what changed since the round-1 self-review rather than re-reviewing from scratch; Bounds — read-only, findings go to the plan, never to GitHub; verify the fix matches Winston's ruling (three amendments), not Eric's original formulation; Approach — diff the fix commit against the plan's tasks 8–11, independently re-run build/test/crossref-lint in the matching worktree, cross-check every one of Eric's four round-1 findings (1 Major, 3 Minors) against the current file state and the actual GitHub review-comment text. · close: scope held — zero new issues found; all four round-1 findings confirmed genuinely fixed, not moved; verdict done.
- 2026-07-20 [huntermcgrew/prism-419-mira-prd-decompose] open: Intent — complete the classifier to Winston's own stated bar ("two LLMs produce identical classifications") per Eric's round-2 findings, without changing its ratified semantics; Bounds — touch only `shared.md`'s Startup steps 2 and 4 plus `prd-decompose.md`'s Epic id bullet, zero Winston/Nora body edits, no relitigating the classifier's three amendments from round 1; Approach — add a deterministic `<input>` derivation clause (lowercase + strip filler tokens) ahead of the existence check, guard plan-lookup step 6 behind step 4's classifier, fix the re-inherited plan-lookup citation, rebuild, run full `pnpm run prism:check`. · close: scope held — diff touches exactly `shared.md`, `prd-decompose.md`, the plan file, and their generated mirrors; `pnpm run prism:check` green (504/504 tests, crossref-lint/install-adr-gate/install-relative-link-gate/verify-pack-parity all clean), generated SKILL.md 366 lines (≤500); verdict done.
- 2026-07-20 [huntermcgrew/prism-419-mira-prd-decompose] open: Intent — delta re-review of commit `7c11462` against Eric's round-2 findings (two Majors, one Minor); confirm the fix is genuine and not relocated, and adversarially probe the derivation clause with inputs neither Eric nor Winston named; Bounds — read-only, findings go to the plan, never to GitHub; Approach — independently re-run `pnpm run prism:check` in the matching worktree, hand-trace the derivation against both named repro cases plus untested phrasings, verify all three generated-surface mirrors and the plan-lookup guard's ordering claim against `plan-lookup.md`'s actual step 6. · close: scope held — both Majors and the Minor confirmed genuinely fixed, not relocated; one new Minor found (derivation's leading-filler-token list doesn't mirror the trailing list — "decompose epic PRISM-1524" fails to derive, though the loud-stop guard keeps the failure visible rather than silent); verdict done.
- 2026-07-20 [huntermcgrew/prism-419-mira-prd-decompose] open: Intent — close Eric's PR `#423` round-3 findings (two Minors, no Majors — derivation asymmetry/undefined multi-token join, re-surfaced `plan-lookup.md` citation in `prd-decompose.md § Output shape`), fixing the root cause rather than the one repro Eric named; Bounds — touch only `shared.md`'s Path A derivation sentence and `prd-decompose.md`'s Output-shape citation plus their generated mirrors, zero Winston/Nora body edits; Approach — replace the positional filler lists with a single either-end whole-token set, define the join/empty-remainder behavior, hand-trace every named case plus `epic-onboarding` as a safety check, cite `branch-plan.md § Plan File Template` in place of `plan-lookup.md` step 6, rebuild, run `pnpm run prism:check`. · close: scope held — diff touches exactly `shared.md`, `prd-decompose.md`, the plan file, and their generated mirrors; `pnpm run prism:check` green (504/504 tests, all lint/parity gates clean); every named case (AC-1 phrasing, bare `PRISM-1524`, `decompose epic PRISM-1524`, `epic-onboarding`) hand-traced correctly; verdict done.
- 2026-07-20 [huntermcgrew/prism-419-mira-prd-decompose] open: Intent — final delta re-review of commit `73339de` (task 16, Eric's round-3 fixes) against the plan and Eric's round-3 findings, independently confirming the derivation rewrite is correct rather than trusting Clove's or Eric's traces; Bounds — read-only, findings go to the plan, never to GitHub; verify the either-end whole-token strip is genuinely whole-token (not prefix-stripping) and that the mirrors are a real rebuild; Approach — hand-trace the tokenize→strip→join algorithm from the shipped rule text against all four named cases plus two adversarial multi-token/verb-leading inputs not named by any prior reviewer, independently rebuild to confirm zero diff, independently re-run `pnpm run prism:check`, verify the `branch-plan.md § Plan File Template` citation resolves and matches the sentence's existing citation form, check the live PR body against the plan's stale "not yet synced" claim. · close: scope held — both Minors confirmed genuinely fixed; whole-token matching verified correct (protects `epic-onboarding` from the filler strip); rebuild produced zero diff (mirrors are genuine, not hand-edited); `pnpm run prism:check` green (504/504, all gates clean); PR body found already synced with round-3 content — the plan's readiness checkbox was stale, corrected below; verdict done, zero new findings.

---

## History

- 2026-07-20 [huntermcgrew/prism-419-mira-prd-decompose]: Created plan from Winston's ratified evaluation (`.prism/plans/eval-mira-prd-decompose.md`); tasks and AC transposed verbatim, no re-derivation.
- 2026-07-20 [huntermcgrew/prism-419-mira-prd-decompose]: Implemented tasks 1-5 — Path A now names a finalized PRD or epic id as first-class input with a deterministic trigger into new `.prism/references/user-stories/prd-decompose.md`; added `### Story Map` artifact row + Parker handoff note to `skills-ecosystem.md`; regenerated via `pnpm prism:build` (365-line generated SKILL.md, well under the 500 cap; 408-char frontmatter description, under the 1000 cap); `pnpm prism:test` passes 504/504.
- 2026-07-20 [huntermcgrew/prism-419-mira-prd-decompose]: Fixed AC-7 — stripped the planted BOM (`ef bb bf` + `# BOM planted for sanity check`) from `.ai-skills/skills/prism-prd/shared.md` and rebuilt; confirmed byte-clean across `.claude/agents/prism-prd.md`, `.claude/skills/prism-prd/SKILL.md`, `.cursor/skills/prism-prd/SKILL.md`, and a repo-wide BOM grep found no other occurrences.
- 2026-07-20 [huntermcgrew/prism-419-mira-prd-decompose]: Briar self-review — independently reproduced AC-6/AC-7 (build+test 504/504, crossref-lint clean, byte scan clean), confirmed all design constraints held, and flagged one Minor: the AC Adjustments note overstates the fixture barrier for AC-1–AC-5 (finalized PRDs already exist at `.prism/prds/sol-*.md`).
- 2026-07-20 [huntermcgrew/prism-419-mira-prd-decompose]: Winston ruling on Eric's PR `#423` round-1 needs-replan — adopted the existence-check detection rule with three amendments, grain-branched Mira's save step (zero-Winston/Nora constraint holds), and set the prose citation form; see the three new Decisions and tasks 8–12. Added AC-8 for the classifier's loud-failure branch.
- 2026-07-20 [huntermcgrew/prism-419-mira-prd-decompose]: Implemented tasks 8–11 — Path A's Determine-path bullet now carries the ordered existence check plus the loud-failure clause, the save step is grain-branched (feature-context → ticket plan, PRD/epic → epic plan), all seven `prd-decompose.md` citations moved to the skill-body prose form (Winston's citation-form ruling), and the plan's AC Adjustments note now names the four ready-to-use finalized PRDs and narrows the BOM claim to `prism-prd` surfaces. Regenerated via `pnpm prism:build`, verified via `pnpm prism:test` (504/504) and `pnpm prism:crossref-lint` (clean).
- 2026-07-20 [huntermcgrew/prism-419-mira-prd-decompose]: Briar delta re-review of commit `39d1706` — independently reverified all four of Eric's PR `#423` round-1 findings against Winston's ruling and the actual fix; zero new issues introduced. See `## Review Issues`.
- 2026-07-20 [huntermcgrew/prism-419-mira-prd-decompose]: Implemented tasks 13–15 (Eric PR `#423` round 2, two Majors + one Minor) — added a deterministic `<input>` derivation step ahead of the existence check (lowercase + strip filler tokens), guarded Startup step 2's plan-lookup step 6 behind step 4's classifier, and replaced `prd-decompose.md`'s re-inherited `../plan-lookup.md` call with a direct `epic-<input>.md` read. Regenerated via `pnpm prism:build` and verified via `pnpm run prism:check` (504/504 tests, crossref-lint clean, generated SKILL.md 366 lines).
- 2026-07-20 [huntermcgrew/prism-419-mira-prd-decompose]: Briar delta re-review of commit `7c11462` — both round-2 Majors and the Minor confirmed genuinely fixed against both of Winston's named repro cases, independently re-ran `pnpm run prism:check` (504/504, all lint/parity gates clean); flagged one new Minor — the derivation's filler-token list is asymmetric ("epic" strips trailing but not leading), so "decompose epic PRISM-1524" fails to derive though the loud-stop guard keeps it a visible failure, not a silent one. See `## Review Issues`.
- 2026-07-20 [huntermcgrew/prism-419-mira-prd-decompose]: Fixed Eric PR `#423` round-3 findings (two Minors, no Majors; task 16) — replaced the position-locked leading/trailing filler lists with an either-end whole-token strip (`decompose`, `the`, `for`, `from`, `prd`, `epic`, `plan`), hyphen-joined a multi-token remainder, and fell through to Path B on an empty remainder; replaced `prd-decompose.md § Output shape`'s re-surfaced `../plan-lookup.md` step-6 citation with the plan template at `branch-plan.md § Plan File Template`. Hand-traced against `decompose the sol-product-lead-conductor PRD`, bare `PRISM-1524`, `decompose epic PRISM-1524` (Briar's failing case, now resolves), and `epic-onboarding` (survives intact). `pnpm run prism:check` green (504/504 tests, crossref-lint/install-adr-gate/install-relative-link-gate/verify-pack-parity all clean).
- 2026-07-20 [huntermcgrew/prism-419-mira-prd-decompose]: Briar final delta re-review of commit `73339de` — both round-3 Minors independently reverified as genuinely fixed; hand-traced the whole-token strip against the four named cases plus two adversarial multi-token/verb-leading inputs (confirmed the algorithm degrades safely — a garbage multi-token remainder fails the existence check and falls through to the explicit-name loud-stop rather than misrouting silently); independently rebuilt (zero diff — mirrors confirmed genuine) and re-ran `pnpm run prism:check` (504/504, all gates clean); found the PR body already synced with round-3 content, correcting the plan's stale readiness checkbox. Zero new issues. See `## Review Issues`.

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

### No issues found — delta re-review of commit `39d1706` (Eric PR `#423` round-1 fixes)

All four of Eric's round-1 findings independently reverified against the fix commit and Winston's ruling (not Eric's original formulation) — none moved or papered over:

- **Major (detection rule + silent-wrong-plan save), both halves fixed.** The Path A Determine-path bullet now carries a direct filesystem-existence classifier — `.prism/prds/<input>.md` exists → PRD, `.prism/plans/epic-<input>.md` exists → epic, both → PRD-first with the existing epic plan as append target, neither → feature context — matching Winston's amendment (i) exactly (not "plan lookup resolved an epic-*.md," which would have inherited plan-lookup's undefined bare-slug id-extraction). The explicit-name-mismatch loud-failure clause (amendment iii) is present verbatim. The save step ("After drafting" step 4) is grain-branched: feature-context input still targets `<ticket-id>.md`; PRD/epic input targets the epic plan per `prd-decompose.md § Output shape`, which now also carries the ticket-grain write guard from task 10.
- **Minor — `.ai-skills/skills/` citations don't resolve in a consumer install: fixed.** All three flagged citations (`prd-decompose.md:14,17,30`) now read as prose (`the prism-prd skill body § PRD output shape`, `the skill body § Story format`) with no filesystem path.
- **Minor — bare `shared.md § N` citations have no target: fixed.** Lines 3, 18, and 21 now read `the skill body § <section>` — no `shared.md` token remains anywhere in the file. Verified line 3 specifically for the doubled-phrase risk Clove flagged in the commit message (`stay in the skill body (the skill body § ...)` from a literal task-10 replacement) — the shipped text reads `stay in the skill body (§ Determine path)`, correctly tightened, no doubling.
- **Minor — plan pre-flight note over-claims the BOM scan: fixed.** `## Acceptance Criteria > AC Adjustments` now reads "in `prism-prd` sources or generated surfaces" instead of "anywhere in the tree," and independently re-confirmed: a repo-wide BOM byte-scan in the matching worktree still finds `ef bb bf` only in `.prism/lessons.md` (pre-existing, unrelated, exactly as the narrowed sentence claims).

Independently re-ran the verification chain in worktree `wf_20910795-84f-3` (commit `39d1706`) rather than trusting the plan's or the commit message's claims: `pnpm prism:build` + `pnpm prism:test` → 504/504; `pnpm prism:crossref-lint` → passed (crossref-lint, install-adr-gate, install-relative-link-gate all clean); generated `prism-user-stories/SKILL.md` → 365 lines (≤500 cap); frontmatter description → 408 chars (≤1000 cap, matches Clove's figure — Eric's independent 413-char measurement in his round-1 review was a whitespace-normalization artifact on his side, both comfortably under cap). No regressions found in the fix commit — the diff touches exactly the files task 8–11 name, plus their generated mirrors.

### `<input>` never derived from `$ARGUMENTS`

- **Severity:** `major`
- **Status:** `fixed` — task 13. Derivation clause inserted ahead of the ordered existence check in the Path A bullet.
- **File:** `.ai-skills/skills/prism-user-stories/shared.md` (Startup step 4, Determine path)
- **Problem:** The existence check named `.prism/prds/<input>.md` and `epic-<input>.md` but never defined how `<input>` comes out of a natural-language `$ARGUMENTS`. "Decompose the sol-product-lead-conductor PRD" (AC-1's own second invocation form) resolved neither path against the raw string and tripped the explicit-name loud-stop; `PRISM-1524` missed the lowercase-named `epic-prism-1524.md` on a case-sensitive filesystem, silently falling to feature-context drafting.
- **Suggested fix:** Add a deterministic derivation step — lowercase `$ARGUMENTS`, strip leading/trailing filler tokens (`decompose`, `the`, `prd`, `epic`) and surrounding punctuation — before running the existence check. See Decisions § "The classifier's `<input>` is derived from `$ARGUMENTS`…".

### Plan lookup runs before classification

- **Severity:** `major`
- **Status:** `fixed` — task 14. Startup step 2 now guards plan-lookup step 6 with a forward reference to step 4's existence check.
- **File:** `.ai-skills/skills/prism-user-stories/shared.md` (Startup step 2, Plan lookup)
- **Problem:** Plan lookup (step 2) ran plan-lookup's step 6 ("ask the user which ticket this work is for, then create one") before step 4's classifier ever ran. AC-1's own precondition — a finalized PRD exists and no plan exists for it — drove Mira straight into step 6: a wrong prompt, or a spurious ticket-grain plan, before classification could route the input correctly.
- **Suggested fix:** Guard step 2 — run step 4's existence check against `$ARGUMENTS` before plan-lookup step 6 fires; skip step 6 when it resolves as a PRD or epic. See Decisions § "The classifier's `<input>` is derived…".

### `prd-decompose.md`'s Epic id bullet re-inherits plan-lookup's id-extraction fuzz

- **Severity:** `minor`
- **Status:** `fixed` — task 15. The "Epic id" bullet now reads `.prism/plans/epic-<input>.md` directly.
- **File:** `.prism/references/user-stories/prd-decompose.md` § Input resolution
- **Problem:** The "Epic id" bullet still said "run `../plan-lookup.md` against the epic id" — re-inheriting, post-classification, exactly the id-extraction fuzz the round-1 classifier fix excised. Where both `<id>.md` and `epic-<id>.md` exist, plan-lookup could resolve the wrong (ticket-grain) plan and the decompose would read its `## Goal`/`## User Stories` before the write guard ever caught the bad write.
- **Suggested fix:** Replace the plan-lookup call with a direct read of the file Path A's check already resolved.

### `prd-decompose.md § Output shape` still cites `plan-lookup.md` step 6 as the plan-creation path

- **Severity:** `minor`
- **Status:** `fixed` — task 16. Replaced the `../plan-lookup.md` step-6 citation with a direct cite of the plan template at `../../rules/branch-plan.md § Plan File Template`.
- **File:** `.prism/references/user-stories/prd-decompose.md` § Output shape (was line 26)
- **Problem:** Step 6 is "ask the user which ticket this work is for, then create one" — ask-then-create at ticket grain, the exact path Startup step 2's guard (task 14) exists to suppress. Task 15 closed this leak at the "Epic id" bullet, but this second site — reached on the main success path (PRD input, epic plan not yet created) — still pointed there. In an unattended run this stalls waiting for a human who isn't there. The sentence already names the target filename (`.prism/plans/epic-<id-or-slug>.md`), so the citation added only hazard, not information.
- **Suggested fix:** Cite the plan template in `branch-plan.md` instead of the step-6 ask-then-create path. (Eric PR `#423`, Spec Minor 1.)

### Derivation's filler-token list is asymmetric — leading "epic" isn't stripped

- **Severity:** `minor`
- **Status:** `fixed` — task 16. Replaced the positional leading/trailing filler lists with a single either-end whole-token filler set (`decompose`, `the`, `for`, `from`, `prd`, `epic`, `plan`), stripped from both edges until neither matches; a multi-token remainder joins with hyphens; an empty remainder falls through to Path B.
- **File:** `.ai-skills/skills/prism-user-stories/shared.md` (Startup step 4, Determine path)
- **Problem:** The leading filler list was `decompose`, `the`; the trailing filler list was `prd`, `epic`. That's correct for "decompose the `<slug>` PRD" and "decompose the `<id>` epic," but a natural mirror of the PRD phrasing — "decompose epic PRISM-1524" — puts "epic" at the front, which the leading list didn't strip. Derived `<input>` was `epic prism-1524`, which resolved against neither `.prism/prds/epic prism-1524.md` nor `.prism/plans/epic-epic prism-1524.md`. Not a silent misroute — the explicit-name loud-stop still caught it — but a real epic id was reported "not found" for a phrasing a user would reasonably try. Eric additionally flagged the rule's "the remaining token" (singular) as undefined for multi-token remainders (e.g. "decompose the PRD for `<slug>`", "write stories from the `<slug>` PRD"), which two implementers could resolve differently (hyphenate vs. drop `epic` as a keyword).
- **Suggested fix (applied):** Eric's fix, adopted verbatim per Sol's dispatch — strip whole-token fillers from either end (not positional lists), join a multi-token remainder with hyphens, and fall through to Path B on an empty remainder. Whole-token matching (exact equality per token, never substring/prefix) keeps real slugs like `epic-onboarding` intact — it isn't the token `epic`, so it's never stripped. Hand-traced against `decompose epic PRISM-1524` → `prism-1524` (fixed), `decompose epic-onboarding` → `epic-onboarding` (survives intact), plus the two original AC-1/bare-id cases and the two multi-token phrasings Eric named — all deterministic.

### No issues found — final delta re-review of commit `73339de` (Eric PR `#423` round-3 fixes)

Both of Eric's round-3 findings independently reverified against the shipped rule text (not Clove's commit message or hand-trace claims):

- **Derivation position-lock, fixed.** The shipped rule tokenizes on whitespace (a hyphenated compound is one token), then strips whole-token fillers from either end (`decompose`, `the`, `for`, `from`, `prd`, `epic`, `plan`) — exact-token match only, repeated until neither end matches — joining a multi-token remainder with hyphens and falling through to Path B on an empty remainder. Independently hand-traced all four named cases from the shipped text (not copied from the commit message): "decompose the sol-product-lead-conductor PRD" → `sol-product-lead-conductor`; bare `PRISM-1524` → `prism-1524`; "decompose epic PRISM-1524" (the previously-failing case) → `prism-1524`, confirmed fixed; "decompose epic-onboarding" → `epic-onboarding`, confirmed the whole-token match protects the `epic-` prefix from the filler strip (it never equals the bare token `epic`). Additionally probed two adversarial inputs neither Eric nor Clove named — "decompose the PRD for `<slug>`" (filler tokens on both sides of the remainder, correctly stripped from a single end each) and "write stories from the `<slug>` PRD" (a verb-leading phrase outside the documented invocation pattern) — the second produces a garbage hyphen-joined remainder that fails both filesystem checks, but the request's literal "PRD" mention still trips the explicit-name loud-stop (checked against the raw request text, not the derived `<input>`), so the failure is loud and visible rather than a silent misroute. Not a new defect — this input was never a documented trigger pattern, and the degradation is fail-loud, not fail-silent.
- **Re-surfaced `plan-lookup.md` citation, fixed.** `prd-decompose.md § Output shape` now cites `../../rules/branch-plan.md § Plan File Template` instead of `../plan-lookup.md` step 6. Verified the target file and heading exist (`.prism/rules/branch-plan.md:217`, `# Plan File Template`) and that the citation form matches the sentence's existing `../../rules/branch-plan.md` naming citation — consistent, not a new citation style.

Independently rebuilt in worktree `wf_20910795-84f-3` (commit `73339de`) rather than trusting the plan's claims: `pnpm prism:build` produced **zero diff** against the committed mirrors — confirms the nine generated/mirror files (`.claude/`, `.codex/`, `.cursor/`, `templates/install/` copies of `shared.md`/`prd-decompose.md`/`SKILL.md`/agent files) are a genuine regeneration, not hand-edited to match. `pnpm run prism:check` green: 504/504 tests, crossref-lint clean, install-adr-gate clean, install-relative-link-gate clean, verify-pack-parity clean (5/5 runtime-read paths present in the tarball). Generated `prism-user-stories/SKILL.md` independently measured at 366 lines (≤500 cap). Checked the live PR `#423` body via `gh pr view` — it already contains the round-3 narrative (whole-token matching, fall-through-to-Path-B, plan-template citation); the plan's `## PR Readiness` "PR description up to date" checkbox was stale (said "not yet synced"), corrected below.

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

- [x] No critical or major issues (Eric's round-1 Major, round-2 two Majors, and round-3 two Minors — detection rule, silent-wrong-plan save, `<input>` derivation, plan-lookup sequencing, derivation position-lock, re-surfaced plan-lookup citation — all fixed; see `## Review Issues`)
- [x] Types correct — no `any`, no unsafe `as` (content-only change; no TypeScript touched)
- [x] No stray console.logs or debug artifacts
- [ ] Tests written for new logic and edge cases (content-only reference doc; no new test-bearing logic — AC-1 through AC-5 need a live-run scripted test per the pre-flight note above)
- [x] All debugged issues resolved (no `open` entries)
- [x] Build passes — last run: 2026-07-20 (`pnpm run prism:check` — 504/504 tests, crossref-lint/install-adr-gate/install-relative-link-gate/verify-pack-parity all clean — independently reconfirmed by Briar's final delta re-review of `73339de`)
- [x] PR description up to date (confirmed live via `gh pr view 423` — round-3 narrative already present; prior checkbox was stale)
- [ ] Lasting decisions promoted to architect context (Winston task 7, at plan close)

**Last updated:** 2026-07-20 (Briar final delta re-review)
