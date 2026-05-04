# Plan: prism-detailed-plans

## Ticket

No Linear ticket — meta improvement to PRISM workflow. Out-of-phase work per Hunter direction (between Phase 1.5 PR #2 merge and Phase 1.5 PR #3 tokenization start).

## Goal

Codify a high-detail bar for implementation-driving artifacts (Winston's `## Implementation Tasks` and Pixel's mode 2 mock specs) so any LLM at any effort level can execute without judgment calls, and remove Pixel's direct-to-Clove routing path so all mode 2 work runs Pixel → Winston → Clove.

---

## History

- 2026-05-03 [prism-detailed-plans]: Plan created. Codifies implementation task detail bar (ADR-0033) and removes Pixel direct-to-Clove path (ADR-0034). Out-of-phase work between PR #2 merge and PR #3 start.
- 2026-05-03 [prism-detailed-plans]: Winston executed tasks 1-20 in one session under auto mode. Authored rule + ADRs 0033/0034 on both surfaces; updated Pixel/Winston/branch-plan/AGENTS/skills-ecosystem on both surfaces; ran `pnpm prism:build` clean (26 tests pass); `pnpm prism:check` and `pnpm prism:check-types` clean. ADR-0033 templates version intentionally drops the two `.prism/plans/...` reference lines from the dogfood version per the established pattern in PR #1 task #17 (templates ship to consumer teams without dogfood plan files) — diff result expected, not byte-identical for that file. ADR-0034 is byte-identical between surfaces. Also fixed mock-spec Status field options in Pixel skill template — replaced `Ready for implementation` with `Ready for Winston` to match the new routing.

---

## Decisions

- **Implementation-driving artifacts must hit a detail bar that eliminates implementer judgment calls on what file, what change, what verification.** Codified as a universal rule.
  - **Root cause:** Cross-LLM portability is the core PRISM promise. Sonnet, low-effort Opus, ChatGPT, and Cursor all hit ambiguity differently but they all hit it. Plans that leave decisions to the implementer produce divergent outputs across runs and across models. The existing pattern in `epic-phase-1-foundation.md` tasks 13–19 already meets this bar implicitly — we're codifying what's already working, not inventing it.
  - **Alternatives considered:** (a) Skill-level guidance only without a rule — gets diluted on every skill rewrite. (b) Rule but no examples — fails the same way as vague guidance. (c) Apply the bar uniformly across all artifacts including HTML mocks and inline sketches — kills mode 1's value as a quick riff.
  - **Chosen approach:** Universal rule at `.prism/rules/implementation-task-detail.md` with concrete good/bad examples drawn from existing detailed tasks. Applies to Winston's `## Implementation Tasks` and Pixel's mode 2 mock specs only. Mode 1 inline sketches and mode 3 HTML mocks explicitly exempt. Mirrored to templates surface.
  - **Implementation guidance:** Authored on this branch. Per ADR-0029, opens with applicability declaration and names personas (Winston, Pixel) in "Who runs this rule" section. Skills reference the rule by name (it's universal, not per-team — ADR-0029's prohibition doesn't apply).

- **Pixel always routes to Winston for mode 2 specs. Direct-to-Clove path removed.**
  - **Root cause:** Pixel's design depth doesn't include architecture depth. The "does this design have architectural implications?" call lives outside her lane — she'll wave through new shared component candidates, server/client boundary issues, and data-flow couplings that Winston would catch. One wrong direct-route costs more in rework than always running Winston in light plan-mode.
  - **Alternatives considered:** (a) Keep Path B with stricter Pixel self-route checklist — still asks Pixel to make calls outside her lane. (b) Make Path B explicit-opt-in only — same problem, same risk. (c) Drop Pixel altogether and have Winston do design — loses Pixel's design depth.
  - **Chosen approach:** Always Pixel → Winston → Clove for mode 2 specs. Winston runs in plan-mode-only when Pixel flagged "no architectural concerns" — quick architecture verification pass against her spec, then writes `## Implementation Tasks`. No full evaluate ceremony. If Winston spots architecture Pixel missed, switches to evaluate mode and amends. Mode 1 inline sketches keep direct-back-to-Clove (mid-ticket gap-fill carve-out — those are conversational by design, not spec-class).
  - **Implementation guidance:** Update Pixel skill's "Handing off (conditional)" section to drop the "ready to build → hand straight to Clove" branch. Update "Where Pixel fits in the team flow" to reflect single path. Update Winston skill to add post-Pixel plan-mode-only path. Update AGENTS.md § 9 ownership table and skills-ecosystem.md § Cross-skill Handoffs.

- **Pixel's mode 2 spec must give Winston enough fidelity to write detail-bar tasks without round-tripping for clarification.** This is the spec-side enforcement of the bar.
  - **Root cause:** If Winston has to come back to Pixel mid-plan for "what's the data flow" or "where does state live", the always-Winston rule degrades into churn instead of one clean handoff.
  - **Chosen approach:** Mock-spec template tightened. Wireframes annotate measurable units (Tailwind tokens like `text-lg`, `p-4`, `gap-2`, or explicit px/rem when a token doesn't fit). Each interaction cites the UI/UX principle that justifies it (Hick's, Fitts's, Miller's, Nielsen heuristic by number, Gestalt principle by name). All five states with annotated wireframes. Copy direction precise enough to write final strings without judgment. Keyboard flow, focus order, ARIA roles named. Reused components named with file paths. New section: `## Architectural inputs for Winston` covering data flow, fetch boundary, server/client classification, surfaced architectural concerns.
  - **Implementation guidance:** Update the mock-spec template in Pixel's skill source. Add new Definition of Done bullets for mode 2.

- **Mode 3 HTML mocks and Mode 1 inline sketches are exempt from the detail bar.** Bar applies to Mode 2 saved markdown specs and `## Implementation Tasks` only.
  - **Root cause:** Mode 1 is conversational by design — riffing in chat. Mode 3 is a visual preview, not a spec. Holding either to the implementation-grade bar would defeat their purpose.
  - **Chosen approach:** Bar limited to spec-class artifacts. Rule states the exemption explicitly so future reviewers don't try to apply the bar to inline sketches.

---

## Implementation Tasks

Added by the architect skill (Winston). All tasks meet the detail bar codified in `.prism/rules/implementation-task-detail.md` (the rule we're authoring) — file paths, exact changes or content, verification commands, sequence dependencies inline.

### Clove

1. **Author `.prism/rules/implementation-task-detail.md`.** Universal rule following the structure of `.prism/rules/architect-doc-verification.md` (the model). Required sections in order: opening one-paragraph summary stating the bar applies to `## Implementation Tasks` and Pixel mode 2 mock specs; "When this rule applies" section enumerating the two artifact classes and explicit exemptions (Mode 1 sketches, Mode 3 HTML); "The bar" section with the principle "front-load every decision; do not front-load every keystroke" plus definitions of decision (file path, exact change, verification command, sequence) vs keystroke (variable names, loop constructs, line counts); "For Winston's tasks" section listing required elements per task (file path, specific change as text-to-text replacement when applicable, verification command, dependency notes); "For Pixel's mode 2 specs" section listing required elements (Tailwind tokens or px/rem, cited UI/UX principles by name, all five states with annotated wireframes, copy direction precise enough to write final strings without judgment, keyboard flow + focus order + ARIA roles, reused components with file paths, server/client classification); "Good vs bad examples" section with one good Winston task and one bad (under-specified) version of the same; one good Pixel mode-2 excerpt and one bad version; "Severity" section stating tasks or specs that fail the bar are at minimum Major in self-review and PR review; "Who runs this rule" section linking to Winston (`../skills/prism-architect/SKILL.md`) and Pixel (`../skills/prism-pixel/SKILL.md`).

2. **Mirror the rule byte-identical to `templates/install/.prism/rules/implementation-task-detail.md`.** Verify with `diff .prism/rules/implementation-task-detail.md templates/install/.prism/rules/implementation-task-detail.md` after the write — output must be empty.

3. **Author `.prism/spec/adrs/0033-implementation-task-detail.md`.** Use `.prism/spec/adrs/TEMPLATE.md` as starting point. Frontmatter: `Number: 0033`, `Title: Implementation Task Detail Bar`, `Status: accepted`, `Date: 2026-05-03`. Sections:
   - **Context:** Cross-LLM portability is PRISM's core promise; the existing detailed task pattern in `epic-phase-1-foundation.md` tasks 13–19 is the latent model; without codifying the bar, plans drift toward under-specification when the original author isn't around.
   - **Decision:** State the bar in one paragraph. List the two artifact classes covered (Winston's tasks; Pixel's mode 2 specs). State the two exemptions (Mode 1, Mode 3). Cross-reference the rule file at `.prism/rules/implementation-task-detail.md`.
   - **Consequences:** Positive (more deterministic execution across LLMs; lower review-cycle volume; the bar exists in one durable place). Negative (planning sessions get longer; plans are more brittle when files move between planning and implementation; one extra planning cost per ticket). Neutral (the bar describes existing pattern in the dogfood; codification doesn't create new behavior, it documents it).
   - **References:** Link to the rule, ADR-0029 (sibling — rules self-declare), ADR-0034 (sibling — Pixel always routes through Winston), `.prism/plans/epic-phase-1-foundation.md` tasks 13–19 as the latent model.

4. **Mirror ADR-0033 byte-identical to `templates/install/.prism/spec/adrs/0033-implementation-task-detail.md`.** Verify with `diff` afterward.

5. **Author `.prism/spec/adrs/0034-pixel-always-routes-through-winston.md`.** Frontmatter: `Number: 0034`, `Title: Pixel Always Routes Through Winston`, `Status: accepted`, `Date: 2026-05-03`. Sections:
   - **Context:** Pixel's existing skill has two handoff paths — through Winston when she flags architectural implications, direct to Clove when she flags "ready to build". The direct-to-Clove path asks Pixel to make architecture calls outside her lane. With ADR-0033's detail bar in place, the cost of one wrong direct-route is rework of detail-bar-quality work — steeper than before. Always-Winston is the cleaner invariant.
   - **Decision:** Pixel always routes to Winston for mode 2 saved specs. Winston runs plan-mode-only when Pixel flagged no architectural concerns (quick verification pass, no full evaluate). Mode 1 inline sketches keep direct-back-to-Clove (mid-ticket gap-fill carve-out).
   - **Consequences:** Positive (architectural safety net widens; Pixel stops making calls outside her lane; cross-LLM portability holds because every implementation has explicit `## Implementation Tasks`). Negative (one extra session per UI ticket; trivial UI changes pay a small Winston cost). Neutral (the change is mechanical — two routing surfaces and the skill source files).
   - **References:** Link to ADR-0033 (sibling), ADR-0013 (Pixel is invoke-only — about discovery, not routing destination, but related), `.ai-skills/skills/prism-pixel/shared.md` (the surface where the change lands).

6. **Mirror ADR-0034 byte-identical to `templates/install/.prism/spec/adrs/0034-pixel-always-routes-through-winston.md`.**

7. **Update `.ai-skills/skills/prism-pixel/shared.md` — `## Handing off (conditional)` section.** Specific edits:
   - **Delete the `## Handing off (conditional)` paragraph that begins** "If the design is **ready to build** — reuses existing patterns, no architectural questions, all states covered, all open questions resolved — hand straight to Clove. Say: 'Design is locked. Ready for Clove whenever you are.'..." (the entire paragraph through "implement against the mock spec").
   - **Replace it with:** A new paragraph stating that mode 2 saved specs always route to Winston regardless of whether Pixel sees architectural implications. When Pixel flagged "no architectural concerns", Winston runs plan-mode-only (quick verification pass, then writes `## Implementation Tasks`). When Pixel flagged architectural implications, Winston runs full evaluate. Status field in plan: `Ready for Winston` (no architectural concerns) or `Needs architecture review` (concerns flagged).
   - **In the copy-pass branch paragraph** ("If the design **needs a copy polish pass** — ..."), change "Clove or the dev will write actual strings against that direction during implementation" to "Winston incorporates copy guidance into Clove's tasks; Clove writes actual strings during implementation against that direction."
   - **Keep the a11y branch as-is** — already routes to Winston when warranted.
   - **Keep the mid-ticket gap-fill paragraph as-is** — that's the mode 1 carve-out.
   - **Keep the conversational riff paragraph as-is** — no formal handoff.
   - **Update the Handoff paragraph template at the end of the section.** Change the example status from "Needs architecture review" to "Ready for Winston" in the example handoff note. The template should read: "**Handoff note:** Mock saved at `.claude/design/mocks/<slug>.{md,html}`. Covers default, empty, edit, loading, and error states. Reuses [components] from [paths] and [restitched components]. [Architectural concerns flagged for Winston, if any]. Plan updated, status: Ready for Winston."

8. **Update `.ai-skills/skills/prism-pixel/shared.md` — `## Where Pixel fits in the team flow` section.** Specific edits:
   - **In the "After Mira, before Winston" bullet**, change "Flow becomes: **Nora → Mira → Pixel → Winston → Clove → Briar → Eric**" to remain unchanged — but add a sentence at the end of the bullet: "This is now the only canonical path for mode 2 saved specs — direct-to-Clove was removed in ADR-0034."
   - **In the "Mid-ticket, while Clove is implementing" bullet**, add at the end: "This carve-out applies to mode 1 inline sketches only. If a mid-ticket gap grows into a mode 2 spec, route the spec through Winston."
   - **In the "After a review surfaces a UX concern" bullet**, change the flow from `Briar/Eric → Pixel → Clove → Briar → Eric` to `Briar/Eric → Pixel → Winston → Clove → Briar → Eric`.

9. **Update `.ai-skills/skills/prism-pixel/shared.md` — Mode 2 mock-spec template (under `### 2. Saved mock spec`).** Specific edits to the template fenced markdown block:
   - **In each `### <state>` subsection** (Default, Empty, Loading, Error, Partial, Success) **add a one-line instruction at the top of each:** "Annotate the wireframe with Tailwind tokens (`text-lg`, `p-4`, `gap-2`) or explicit px/rem where tokens don't fit. Cite the UI/UX principle justifying each visual choice (Hick's, Fitts's, Miller's, Nielsen heuristic by number, Gestalt principle by name)."
   - **In the `## Reused components` subsection** add at the end: "Include file paths for every component named (e.g. `frontend/components/Button.tsx`). Note server/client classification (RSC default; mark `'use client'` requirement explicitly)."
   - **Add a new section after `## Open questions`** titled `## Architectural inputs for Winston` with bulleted instructions: data flow (where state lives), fetch boundary (server-side or client-side), server/client component classification, any architectural concerns Pixel surfaced (new shared component candidate, coupling risk, design system pattern questions). One sentence describing what Winston needs to write tasks against the spec without round-tripping.

10. **Update `.ai-skills/skills/prism-pixel/shared.md` — Definition of Done.** In the "**Mode 2 (saved spec):**" checklist, add four bullets after the existing "Handoff paragraph written with status" bullet:
    - `[ ] Spec includes Tailwind/rem/px annotations for measurable design choices`
    - `[ ] Spec cites UI/UX principles by name for each interaction or layout decision`
    - `[ ] Spec includes Architectural inputs for Winston section`
    - `[ ] Spec routed to Winston (no direct-to-Clove)`

11. **Update `.ai-skills/skills/prism-architect/shared.md` — `## Plan Mode` section.** Specific edits:
    - **At the top of `## Plan Mode`, before the "When in plan mode, run the following..." paragraph,** insert a new paragraph: "**Post-Pixel handoff path** — when entering plan mode after a Pixel mode 2 spec handoff (the plan's `## Design` section has `Status: Ready for Winston`), skip the full evaluate ceremony. Run a quick architecture verification pass against her spec — one read, checking for architectural concerns Pixel might have waved through (new shared component candidates, server/client boundary issues, data-flow couplings). Then write `## Implementation Tasks` to the detail bar against her spec. If you spot architecture Pixel missed, switch to evaluate mode and amend the design with her or note the concern in `## Decisions`."
    - **In the existing numbered Plan Mode steps,** insert a new step 0 before step 1: "0. **Check for `## Design` section.** If present and `Status: Ready for Winston`, treat the design as the spec; verify architecture in a quick pass; do not redesign. If `Status: Needs architecture review`, run full evaluate mode first."
    - **In step 3 (Break the implementation into ordered tasks),** add a new bullet after the existing bullets: "**Apply the detail bar.** Each task must meet the bar in `.prism/rules/implementation-task-detail.md` — file path, specific change, verification command, sequence dependency inline. Front-load every decision; do not front-load every keystroke."

12. **Update `.prism/rules/branch-plan.md` — `## Implementation Tasks` template comment.** After line 206 (the line ending "treats other personas' headings as out-of-scope by default. See ADR-0018."), insert one line: "Tasks must meet the detail bar in `.prism/rules/implementation-task-detail.md` — front-load every decision, no judgment calls left to the implementer."

13. **Mirror the same edit to `templates/install/.prism/rules/branch-plan.md`** — same insertion point, same line.

14. **Update `AGENTS.md` § 9 Ownership & Handoff table.** In the row for `Pixel`, change "Routes to" from `Clove (implementation)` to `Winston (mode 2 specs), Clove (mode 1 inline sketches only)`.

15. **Mirror the same edit to `templates/install/AGENTS.md.tmpl`** — same row, same change.

16. **Update `.prism/architect/skills-ecosystem.md` — Cross-skill Handoffs table.** In the row for `Pixel`, change the "Recommends" cell from "Winston (architectural implications), Clove (ready to build)" to "Winston (always for mode 2 specs); Clove (mode 1 inline sketches only — mid-ticket gap-fill)".

17. **Update `.prism/architect/skills-ecosystem.md` — Mid-Ticket Moves section.** In the "UX Concern from Review" subsection's flow diagram, change the flow from `Briar/Eric → Pixel → Clove → Briar` to `Briar/Eric → Pixel → Winston → Clove → Briar`.

18. **Mirror both skills-ecosystem.md edits to `templates/install/.prism/architect/skills-ecosystem.md`** — same Cross-skill Handoffs row change, same Mid-Ticket Moves flow diagram change.

19. **Run `pnpm prism:build`.** Regenerates `.claude/skills/prism-pixel/SKILL.md` and `.claude/skills/prism-architect/SKILL.md` from the canonical sources, plus content copies to platform dirs. Required because canonical source edits don't propagate to platform outputs without this step.

20. **Run verification.** Three commands, must all pass before commit:
    - `pnpm prism:check` — confirms no drift between canonical and generated
    - `pnpm prism:check-types` — type-check the build script
    - `pnpm prism:test` — full test suite

21. **Append plan history entry.** After verification passes, append to `## History` in this plan: `2026-05-03 [prism-detailed-plans]: Clove executed tasks 1-20 — authored rule + ADRs 0033/0034, updated Pixel/Winston/branch-plan/AGENTS/skills-ecosystem on both surfaces, build+verification clean.`

### Eli (after PR merges)

22. **Audit README for Pixel routing references.** Grep `README.md` for any mention of the Pixel→Clove path or the team flow. If the workflow description mentions Pixel handing to Clove for ready-to-build designs, update to Pixel→Winston→Clove. If no such reference exists, no action needed — note in plan.

---

## Acceptance Criteria

### Behavioral

- [ ] Given Winston is in plan mode after a Pixel mode 2 handoff, When Pixel's `## Design` section has `Status: Ready for Winston` with no architectural concerns, Then Winston runs plan-mode-only (no full evaluate ceremony) and writes `## Implementation Tasks`.
- [ ] Given Winston writes a task in `## Implementation Tasks`, When the task is read by an implementer, Then the implementer can execute it without making judgment calls on file path, specific change, or verification approach.
- [ ] Given Pixel produces a mode 2 saved spec, When Winston reads the spec, Then Winston has enough fidelity (Tailwind tokens, cited principles, server/client classification, data flow, file paths for reused components) to write detail-bar tasks without round-tripping to Pixel for clarification.
- [ ] Given Pixel produces a mode 2 saved spec, When Pixel sets the plan status, Then the only valid handoff is to Winston (no direct-to-Clove path remains in skill or routing tables).
- [ ] Given Pixel produces a mode 1 inline sketch (mid-ticket gap-fill), When Pixel hands back, Then Clove can pick up directly without Winston routing — the mode 1 carve-out remains.
- [ ] Given Pixel produces a mode 3 HTML mockup, When Pixel produces it, Then the detail bar does not apply (it's a visual preview, not a spec — exemption explicit in the rule).

### Non-behavioral

- [ ] `.prism/rules/implementation-task-detail.md` exists with applicability declaration and "Who runs this rule" section naming Winston and Pixel.
- [ ] `templates/install/.prism/rules/implementation-task-detail.md` exists byte-identical to canonical (verified via `diff`).
- [ ] `.prism/spec/adrs/0033-implementation-task-detail.md` exists. Mirrored to templates with the two `.prism/plans/...` reference lines stripped per PR #1 task #17 convention (templates don't reference dogfood plans).
- [ ] `.prism/spec/adrs/0034-pixel-always-routes-through-winston.md` exists. Mirrored to templates byte-identical.
- [ ] `.ai-skills/skills/prism-pixel/shared.md` updated: handoff section, team-flow section, mock-spec template, Definition of Done.
- [ ] `.ai-skills/skills/prism-architect/shared.md` updated: post-Pixel plan-mode-only path, rule reference in step 3.
- [ ] `.prism/rules/branch-plan.md` cross-reference added at line 206. Mirrored to templates.
- [ ] `AGENTS.md` § 9 Pixel row updated. Mirrored to `templates/install/AGENTS.md.tmpl`.
- [ ] `.prism/architect/skills-ecosystem.md` Cross-skill Handoffs and Mid-Ticket Moves updated. Mirrored to templates.
- [ ] `pnpm prism:build` regenerates outputs without drift.
- [ ] `pnpm prism:check`, `pnpm prism:check-types`, `pnpm prism:test` all pass.

### AC Sync Log

| Date | Agent | Action | Plan | Linear |
| ---- | ----- | ------ | ---- | ------ |
| 2026-05-03 | Winston | Generated AC | updated | N/A (no Linear ticket) |

---

## PR Readiness

- [ ] No critical or major issues
- [ ] Types correct — no `any`, no unsafe `as`
- [ ] No stray console.logs or debug artifacts
- [ ] Tests written for new logic and edge cases (existing prism:test suite covers build + path-guard + content-copy)
- [ ] All debugged issues resolved (no `open` entries)
- [x] Build passes — last run: 2026-05-03 (`pnpm prism:build` + `prism:check` + `prism:check-types` all clean)
- [ ] PR description up to date
- [ ] Lasting decisions promoted to architect context (ADRs 0033 + 0034 already serve this role)

**Last updated:** 2026-05-03
