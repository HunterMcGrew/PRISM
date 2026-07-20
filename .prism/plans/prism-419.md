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

### Winston (plan close, when this ticket lands)

7. Promote the decision "PRD decomposition is a Path A input extension, not a mode; story map lives as `### Story Map` under `## User Stories` in epic plans" to `skills-ecosystem.md` context (largely done by task 4; verify at close per the Decision verdict gate).

---

## Decisions

- **PRD/epic decomposition is a Path A input extension, not a named mode.** Mira's flow (elicit → draft → quality-check → review → save) doesn't diverge by input source — only the input trigger and output grain differ. Per `.prism/rules/code-standards.md`'s two-adapters rule, a single caller doesn't earn a mode; a mode is surface every reader loads for a branch most sessions never take. Considered: adding a named `MODE` like Reese's mode selection. Rejected because Reese's modes exist for procedures that genuinely diverge; Mira's doesn't. If a second decompose-source appears later (e.g. a Vera strategy doc), the Path A extension upgrades to a mode cheaply — not before. → no promotion needed (already recorded in `.prism/plans/eval-mira-prd-decompose.md`, the source evaluation; this plan cites it rather than re-deciding).
- **`### Story Map` is a subsection convention under `## User Stories`, not a new top-level branch-plan template section.** Considered: adding `## Story Map` to `.prism/rules/branch-plan.md`'s template. Rejected — that edits the shared plan template every persona reads, for a section only epic plans use. Sections are additive per the template's own convention, and Winston and Nora already read `## User Stories`, so the map rides along in reads that already happen. → no promotion needed (subsection convention lives in `prd-decompose.md`, not the shared template, by design).
- **Zero edits to Winston's or Nora's skill bodies in v1.** Both consume the new output shape (`### Story Map`) through reads they already perform — Winston's plan-mode reads `## User Stories`; Nora's create-path reads whatever a ticket-cutting session points her at. → no promotion needed (this is the "why" behind tasks 1–5 touching only Mira's files; captured in the eval document, not a durable architectural claim beyond what task 4's ecosystem-doc row already records).

---

## Sessions

- 2026-07-20 [huntermcgrew/prism-419-mira-prd-decompose] open: Intent — seed the branch and plan for the ratified Mira PRD-decomposition lane per Winston's evaluation; Bounds — file the issue, create the branch, transpose tasks/AC verbatim into a new plan file, commit only the plan; no implementation in this session; Approach — dupe-search, branch from origin/main, write plan, single-file commit. · close: scope held

---

## History

- 2026-07-20 [huntermcgrew/prism-419-mira-prd-decompose]: Created plan from Winston's ratified evaluation (`.prism/plans/eval-mira-prd-decompose.md`); tasks and AC transposed verbatim, no re-derivation.

---

## Debugged Issues

None yet.

---

## Review Issues

None yet.

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
- [ ] **AC-7** Given the BOM strip lands, When `.ai-skills/skills/prism-prd/shared.md` and its generated surfaces (`.claude/agents/prism-prd.md`, `.claude/skills/prism-prd/SKILL.md`, `.cursor/skills/prism-prd/SKILL.md`) are inspected, Then none contain the `ef bb bf` BOM bytes or the `# BOM planted for sanity check` line.
  - Evidence (machine): byte-level check post-rebuild.

### Non-behavioral

- [ ] **AC-6** `pnpm prism:build` and `pnpm prism:test` pass; generated `prism-user-stories/SKILL.md` ≤ 500 lines; frontmatter description ≤ 1000 chars.
  - Evidence (machine): CI run.

### AC Adjustments

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

- [ ] No critical or major issues
- [ ] Types correct — no `any`, no unsafe `as`
- [ ] No stray console.logs or debug artifacts
- [ ] Tests written for new logic and edge cases
- [ ] All debugged issues resolved (no `open` entries)
- [ ] Build passes — last run: not yet run
- [ ] PR description up to date
- [ ] Lasting decisions promoted to architect context (if applicable)

**Last updated:** 2026-07-20
