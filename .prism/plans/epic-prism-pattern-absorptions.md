# Plan: epic-prism-pattern-absorptions

## Ticket

PRISM Phase 1.5e — Pattern absorptions from Matt Pocock + BMAD research. See [`roadmap.md` § Phase 1.5e](./roadmap.md#phase-15e--pattern-absorptions) for phase context.

## Goal

Absorb seven non-persona patterns from Matt Pocock and BMAD research into existing PRISM surfaces — sharpening Winston's evaluate axes, Eric's and Briar's review framing, `code-standards.md`'s premature-abstraction guidance, and adding two new reference docs that downstream phases (Theo, Parker) will cite — without introducing a new persona.

---

## User Stories

Not applicable — this is internal toolkit absorption work. The "users" are the personas that pick up these patterns on the next invocation; no end-user behavior changes.

---

## Design

Not applicable — no UI work in this phase.

---

## Implementation Tasks

Tasks must meet the detail bar in [`.prism/rules/implementation-task-detail.md`](../rules/implementation-task-detail.md). All edits target canonical sources (`.ai-skills/skills/<id>/shared.md` for personas, `.prism/<area>/` for rules and references). The build script regenerates platform mirrors at `.claude/skills/` — do not edit those directly.

### Clove (implementation)

1. **Add the deletion test heuristic to Winston's evaluate axes** — file: `.ai-skills/skills/prism-architect/shared.md`. Insertion point: end of the `### Abstraction level` subsection under `## What to evaluate` (after the "Is it too broad?" bullet, before the `### Accessibility architecture` heading). Insert the following block verbatim:

   ```markdown
   ### Deletion test

   When evaluating whether an abstraction earns its keep, run the deletion test: imagine deleting the module. If complexity vanishes, it was a pass-through — the abstraction wasn't carrying weight. If the complexity reappears scattered across multiple callers, it was earning its keep.

   Apply during every evaluation that touches a new or modified abstraction. The test is a one-sentence thought experiment, not a checklist item — let it inform the verdict in `### Abstraction level` rather than producing its own line in the output. Pair with the "two adapters = real seam" rule in [`code-standards.md` § General](../../rules/code-standards.md#general) — the deletion test diagnoses, the two-adapters rule prescribes.
   ```

   Verification: `pnpm prism:check` (must pass — confirms canonical → mirror generation). Content-only edit; no runtime impact. Parallel-safe with tasks 2, 3, 5.

2. **Add the deletion test reflex to Eric's "What to look for"** — file: `.ai-skills/skills/prism-code-review-pr/shared.md`. Insertion point: inside `### Justification Review`, immediately after the four-question list (after the line ending `...wrapper components, and indirection that shapes how future code is written.`). Insert as a new paragraph:

   ```markdown
   When the justification questions land ambiguously — "maybe one consumer is enough" or "this could be useful later" — run the deletion test: imagine deleting the abstraction. If complexity vanishes, it was a pass-through; flag it as premature. If complexity reappears across multiple call sites, it was earning its keep; let it stand. The test is a tiebreaker for ambiguous cases, not a routine checklist item.
   ```

   Verification: `pnpm prism:check`. Content-only edit. Parallel-safe with task 1, 3, 5.

3. **Add the deletion test reflex to Briar's "What to look for"** — file: `.ai-skills/skills/prism-code-review-self/shared.md`. Insertion point: inside `### Justification Review`, immediately after the four-question list (after the line ending `...wrapper components, and indirection that shapes how future code is written.`). Insert the same paragraph as task 2 verbatim — Eric's and Briar's phrasing must stay identical:

   ```markdown
   When the justification questions land ambiguously — "maybe one consumer is enough" or "this could be useful later" — run the deletion test: imagine deleting the abstraction. If complexity vanishes, it was a pass-through; flag it as premature. If complexity reappears across multiple call sites, it was earning its keep; let it stand. The test is a tiebreaker for ambiguous cases, not a routine checklist item.
   ```

   Verification: `pnpm prism:check`. Content-only edit. Parallel-safe with tasks 1, 2, 5.

4. **Add the "two adapters = real seam" rule to `code-standards.md`** — file: `.prism/rules/code-standards.md`. Insertion point: under `## General`, immediately after the existing line `- Avoid premature abstraction — three similar lines are better than one speculative helper.` (line 13). Insert a new bullet directly below it:

   ```markdown
   - Two adapters serving the same port earn the abstraction; one adapter does not. The seam is real when a second concrete implementation forces the interface — until then, the "interface" is whatever the single caller needs, and inlining it produces clearer code.
   ```

   The bullet pairs with the existing "three similar lines" rule — premature-abstraction guidance reads as a two-bullet sequence: don't abstract on volume alone (three lines aren't enough), don't abstract on intent alone (one adapter isn't enough). Verification: `pnpm prism:check`. Content-only edit. Parallel-safe with tasks 1, 2, 3, 5, 6.

5. **Replace Winston's fuzzy ADR criterion with the triple-gate** — file: `.ai-skills/skills/prism-architect/shared.md`. Target: `## Immediate Decision Promotion` section. Replace the existing "Promote immediately" bullet and its qualifying language (the lines starting `**Promote immediately** if the decision establishes a pattern, constraint, or architectural rule...`) with the following block:

   ```markdown
   **Promote immediately** when the decision passes all three gates:

   - **Hard to reverse** — the decision shapes interfaces, schemas, persona ownership, or pattern conventions that downstream work composes against. Reversing it later requires migrating consumers, not just editing one file.
   - **Surprising without explanation** — a competent reader looking at the resulting code or doc would ask "why is this shaped this way?" The reasoning isn't self-evident from the artifact.
   - **Genuine trade-off** — a real alternative was considered and rejected. If there was no alternative, there's nothing to document; the choice was forced.

   All three gates must fire. One gate alone is not enough — a hard-to-reverse choice with no alternative is just inevitable; a surprising choice that's trivially reversible is a curiosity, not an ADR. Two of three is still not enough — the absent gate is usually the one that makes the ADR worth the maintenance cost.

   Promote to the relevant `.prism/architect/` file for patterns; promote to a new ADR in `.prism/spec/adrs/` for decisions that justify their own durable record.
   ```

   Leave the "Skip these — they stay local" list intact below the replaced block. Verification: `pnpm prism:check`. Content-only edit. Parallel-safe with tasks 1, 2, 3, 4, 6.

6. **Write the micro-file step machine reference doc** — new file: `.prism/references/micro-file-step-machine.md`. Full content:

   ```markdown
   # Micro-File Step Machine

   A pattern for structuring long-running, resumable workflows as a sequence of small per-step markdown files. Each phase of work lives in its own `step-NN-name.md` file; resumability is tracked via a `stepsCompleted` array in the workflow's frontmatter.

   **Source:** BMAD's `bmad-create-architecture` workflow established this shape. PRISM adopts it as a named pattern so future skills with multi-phase workflows don't reinvent the structure.

   ## When to use it

   The pattern is appropriate when **all three** apply:

   - The workflow has discrete, ordered phases (4+) where each phase produces an output the next phase reads.
   - A single run plausibly outlasts a context window — either because the work itself is large, or because the user pauses and resumes across sessions.
   - The phases are auditable in isolation — a reviewer can look at step 3's output without re-running steps 1 and 2.

   Skip the pattern when the workflow is short (≤3 phases), single-session, or when the phases are tightly entangled and don't produce intermediate artifacts.

   ## File naming convention

   - One file per step: `step-NN-<slug>.md` where `NN` is zero-padded (`step-01-scan.md`, `step-02-classify.md`, `step-10-finalize.md`).
   - Files live in the skill's working directory or a workflow-scoped subdirectory (e.g. `.prism/workflows/<workflow-id>/step-NN-*.md`).
   - The slug names the phase's intent, not its mechanics — `step-03-grill-candidates.md`, not `step-03-loop.md`.

   ## Frontmatter shape

   Each workflow has a top-level state file (e.g. `.prism/workflows/<workflow-id>/state.json` or YAML frontmatter on the workflow's entry doc) tracking completion:

   ```yaml
   workflowId: ren-walk-2026-05-22
   stepsCompleted: [1, 2, 3]
   currentStep: 4
   status: in-progress
   ```

   - `stepsCompleted` is an integer array — the step numbers that finished. Append on completion; never edit retroactively.
   - `currentStep` is the next step to execute. On resume, the skill reads this and jumps to the corresponding file.
   - `status` enumerates `not-started | in-progress | paused | complete | aborted`.

   ## Resume detection

   When the skill starts, it checks for an existing state file before creating a new one:

   1. Look for a state file matching the workflow ID (or the current ticket / branch / user context).
   2. If found and `status` is `in-progress` or `paused`: load `currentStep`, read the corresponding `step-NN-*.md`, and offer the user resumption: "Found prior run at step N — continue from step N, restart from step 1, or abort?"
   3. If not found: create a fresh state file with `stepsCompleted: []`, `currentStep: 1`, `status: in-progress`.

   The skill never silently overwrites a prior state file. Resumption is always offered, even if the user clearly wants a fresh run — explicit confirmation is cheaper than discovering the override after the fact.

   ## Who cites this pattern

   - **Theo** (Phase 2.5, architect-doc walker) — uses the pattern for the multi-phase scan → identify candidates → present → write loop. State at `.prism/architect-walker-state.json`.
   - **Ren** (Phase 2.6, refactor scout) — uses the pattern for the explore → categorize → present → grill loop. State at `.prism/ren-state.json`.
   - **Parker** (Phase 3, PRD persona) — uses the pattern for greenfield mode's brain-dump → stakes calibration → draft → rubric → finalize sequence. State at `.prism/prds/<slug>/state.yaml`.
   - **Winston** (existing) — does not currently use the pattern, but if plan mode grows beyond its current shape, this is the pattern it should grow into.

   ## Why a reference doc rather than inlining

   Three downstream consumers (Theo, Ren, Parker) need the same pattern shape with workflow-specific instantiations. Inlining the pattern into each skill triples the maintenance surface and guarantees drift. The reference doc owns the pattern; each skill cites it and documents only what's specific to its workflow.

   The pattern is also relevant outside PRISM's current persona set — any future skill that grows multi-thousand-line SKILL.md should compare against this pattern before bloating further.
   ```

   Verification: `pnpm prism:check`. New file; no existing content to preserve. Parallel-safe with tasks 1–5.

7. **Add the A/P/C menu subsection to Winston's evaluate mode** — file: `.ai-skills/skills/prism-architect/shared.md`. Insertion point: after the `### Devil's Advocate` subsection in the `## Output format` block, immediately before `### Suggested Approach`. Insert the following block:

   ```markdown
   ### A/P/C menu

   After delivering the Devil's Advocate critique, present an explicit gate before moving on to `### Suggested Approach` (or, when in evaluate-then-plan mode, before transitioning to plan mode). The gate has three options:

   - **[A]dvanced Elicitation** — the user has questions, pushback, or wants Winston to dig deeper on a specific concern raised in the evaluation. Winston re-engages on that thread before continuing.
   - **[P]arty Mode** — the user wants the same architecture evaluated from a different persona's lens (e.g. "what would Eric flag?", "how would Pixel push back on the UX implications?"). Winston re-runs the evaluation framed through the requested persona's priorities.
   - **[C]ontinue** — proceed to `### Suggested Approach` and the rest of the output as planned.

   Phrase the gate plainly: "Before I move on — want to push back on anything (A), evaluate this from another angle (P), or continue with the suggested approach (C)?" The gate fires once per evaluate run, after Devil's Advocate. It exists because evaluations that flow straight from critique to prescription give the user no decision point — and the post-critique moment is where new concerns most often surface.

   Source: BMAD's Advanced Elicitation / Party Mode / Continue menu pattern. Absorbed into Winston's evaluate flow rather than added as a generic skill mechanic — the gate only makes sense between critique and prescription, which is a Winston-specific shape.
   ```

   Verification: `pnpm prism:check`. Content-only edit. Sequence: parallel-safe with tasks 1, 4, 5, 6, 8.

8. **Write the stakes calibration reference doc** — new file: `.prism/references/stakes-calibration.md`. Full content:

   ```markdown
   # Stakes Calibration

   A pattern for tuning a skill's rigor to the stakes of the work in front of it. One skill, three intensity levels — the skill reads a stakes signal from the user (or infers it from context) and calibrates depth accordingly.

   **Source:** BMAD's `bmad-prd` skill established the pattern — instead of three separate PRD skills for different scopes, one PRD skill with three calibration modes. PRISM adopts the pattern by name so Phase 3 (Parker) and any future stakes-sensitive skill can cite it rather than reinventing.

   ## The three levels

   | Level | Signal | Calibration |
   | --- | --- | --- |
   | **Hobby** | Personal projects, exploratory tickets, learning work | Light PM-thinking, generous `[ASSUMPTION]` tolerance, looser reviewer rubric, fast path preferred |
   | **Internal** | Team-internal tools, dogfood-only features, low-blast-radius work | Standard PM-thinking, scoped `[ASSUMPTION]` tags expected to resolve before merge, default reviewer rubric |
   | **Launch** | Customer-facing, public release, multi-tenant blast radius | Deep PM-thinking, no unresolved `[ASSUMPTION]` tags, strict reviewer rubric, coaching path preferred over fast path |

   The signal is asked explicitly when the skill starts — "What's the stakes here: hobby, internal, or launch?" — and the user's answer becomes the calibration setting for the rest of the run. Calibration is not implicit; making it a named question forces the conversation and prevents skills from defaulting to "launch rigor on hobby work" (over-engineering) or "hobby rigor on launch work" (shipping with gaps).

   ## What calibrates

   For any skill adopting the pattern, three dimensions calibrate to the stakes level:

   - **Depth of PM-thinking sections** — how many of the standard sections (problem statement, user segments, success metrics, scope boundaries, etc.) the skill drives to completion vs. flags as `[ASSUMPTION]` for later resolution.
   - **Reviewer-rubric strictness** — what the skill flags as a blocker vs. a non-blocking note. Hobby tolerates ambiguity that internal flags as risk; launch tolerates none of it.
   - **Assumption-tagging tolerance** — how many `[ASSUMPTION]` tags the skill leaves unresolved at finalize. Hobby may finalize with several; launch finalizes with zero.

   Skills should document their own calibration table — which sections, which rubric items, which assumption thresholds correspond to which level — rather than handwaving "more rigor at launch."

   ## Who cites this pattern

   - **Parker** (Phase 3, PRD persona) — primary consumer. Greenfield mode asks the stakes question early; the rest of the flow calibrates against the answer.
   - **Mira** (existing, user-story persona) — a stakes signal at the user-story grain may compose cleanly with Parker's signal when the PRD decomposes into stories. Composition shape decided when Phase 3 lands; for now, Mira does not implement the pattern.
   - Any future skill that produces planning artifacts at variable stakes (release plans, migration plans, infrastructure proposals) should evaluate whether the pattern applies.

   ## Why a reference doc rather than inlining

   Phase 3 (Parker) needs the pattern, and at least one other future skill (Mira-level stakes signal, possibly more) plausibly needs it. Inlining the calibration table into Parker's spec and then re-deriving it for the next consumer guarantees drift. The reference doc owns the pattern shape; each consumer documents only its own calibration dimensions.

   This phase (1.5e) does not modify any existing skill to adopt the pattern — Parker doesn't exist yet, and adding calibration to Mira without Parker's anchor would be premature. The reference doc lands now so Phase 3 has somewhere to cite from on day one.
   ```

   Verification: `pnpm prism:check`. New file; no existing content to preserve. Parallel-safe with tasks 1–7.

9. **Regenerate platform mirrors and verify** — run the build and check commands in sequence after tasks 1–8 land:

   ```bash
   pnpm prism:build
   pnpm prism:check
   pnpm prism:check-types
   pnpm prism:test
   ```

   `prism:build` regenerates `.claude/skills/<id>/SKILL.md` from the canonical `.ai-skills/skills/<id>/shared.md` sources edited in tasks 1, 2, 3, 5, 7. `prism:check` confirms no drift between canonical and mirror. `prism:check-types` and `prism:test` confirm no regressions in the build toolchain itself.

   Expected: all four commands exit clean. If `prism:check` reports drift, the canonical source and mirror diverged — re-run `prism:build` and inspect the diff to find which file was edited in the wrong place. Sequence: must run after tasks 1–8 complete.

### Eli (documentation)

10. **Evaluate whether the micro-file step machine reference warrants a paired dev doc** — per `.prism/architect/documentation.md` paired-dev-doc convention, agent-facing reference docs that document non-trivial patterns get a teammate-facing companion at `docs/content/dev/architecture/<name>.md`. The micro-file step machine pattern is a candidate — it's the kind of pattern a new teammate joining a Theo/Ren/Parker codebase would benefit from understanding.

    Decision criterion: if Theo's, Ren's, or Parker's eventual implementation will touch developer-facing tooling (CLI, build scripts, state files inspectable by humans), write the paired dev doc at `docs/content/dev/architecture/micro-file-step-machine.md`. If the pattern stays entirely internal to skill execution, defer.

    Current call: **defer**. None of Theo/Ren/Parker exist yet; the pattern is agent-internal at this phase. Revisit when Theo's epic plan lands.

    Verification: none — no file written. Parallel-safe with all Clove tasks; no blocking dependency.

11. **Evaluate whether the stakes calibration reference warrants a paired dev doc** — same criterion as task 10. Stakes calibration is a Parker-internal pattern at this phase; teammates won't encounter it until Parker ships in Phase 3.

    Current call: **defer**. Revisit when Parker's epic plan lands.

    Verification: none. Parallel-safe.

---

## Decisions

- **Deletion test heuristic lands in three persona surfaces, not as a standalone rule.**
  - **Root cause:** The deletion test is a thought-experiment phrasing, not a procedural rule. Procedural rules live in `.prism/rules/`; thought-experiment phrasings live where the persona that uses them encounters its trigger — Winston during evaluation, Eric and Briar during justification review.
  - **Alternatives considered:** Standalone rule at `.prism/rules/deletion-test.md`; inline in `code-standards.md`; persona-only placement (chosen).
  - **Chosen approach:** Persona-only placement. The test is a tiebreaker, not a checklist item; rules-file placement would over-formalize it. Adding it to `code-standards.md` alongside two-adapters would conflate diagnosis (deletion test) with prescription (two-adapters seam rule).
  - **Implementation guidance:** Identical phrasing in Eric and Briar (tasks 2 and 3); Winston gets a slightly longer framing as a named subsection since evaluation is his primary lane. The cross-reference between the deletion test (in personas) and the two-adapters rule (in `code-standards.md`) is the seam — diagnosis points at prescription.

- **Two-adapters rule lands in `code-standards.md` § General, not in a persona.**
  - **Root cause:** "Two adapters = real seam" is a prescriptive coding standard — it tells the implementer when to introduce an abstraction. Prescriptive standards belong in `.prism/rules/code-standards.md` where every implementing persona loads them as default authority.
  - **Alternatives considered:** Standalone rule at `.prism/rules/two-adapters-seam.md`; inline in Winston (chosen against because the rule applies during implementation, not just architecture); persona-only placement.
  - **Chosen approach:** `code-standards.md` § General, immediately after the existing "three similar lines" bullet. The two rules form a sequence — don't abstract on volume alone, don't abstract on intent alone.
  - **Implementation guidance:** Single bullet, no subsection. The companion thought experiment (deletion test) is cross-referenced from the personas, keeping diagnosis and prescription separate but findable.

- **Triple-gated ADR criterion replaces Winston's existing fuzzy criterion in-place, not as a new section.**
  - **Root cause:** The existing "establishes a pattern, constraint, or architectural rule that other developers or future tickets need to know about" criterion is one fuzzy gate. The triple-gate replaces it with three specific gates that must all fire. Side-by-side existence would invite Winston to use whichever criterion fits the case, which defeats the purpose.
  - **Alternatives considered:** Add the triple-gate as a new criterion alongside the existing one; promote the triple-gate to `.prism/rules/branch-plan.md` § Before Closing instead; replace in-place (chosen).
  - **Chosen approach:** Replace in-place in Winston. Branch-plan rule already says "decisions that describe how the system works going forward" — that's pointing at architect file promotion, not ADR creation. The triple-gate is specifically about when a decision warrants an ADR vs. an architect file note vs. staying in git history; that's Winston's call.
  - **Implementation guidance:** Task 5 specifies the exact replacement block. Leave the "Skip these" list intact below the replaced section.

- **Micro-file step machine ships as a reference doc, not inlined into Winston or Theo.**
  - **Root cause:** Three downstream consumers (Theo, Ren, Parker) need the same pattern shape with workflow-specific instantiations. Inlining triples the maintenance surface; the pattern owns the shape, each skill owns its specifics.
  - **Alternatives considered:** Inline in Winston's plan mode (chosen against — Winston doesn't currently use the pattern); inline in Theo's eventual spec (chosen against — Ren and Parker need it too, and Theo doesn't exist yet); reference doc (chosen).
  - **Chosen approach:** Reference doc at `.prism/references/micro-file-step-machine.md`. Phase 2.5/2.6/3 plans cite it on day one. Available for any future skill that grows past the threshold.
  - **Implementation guidance:** Reference doc shape mirrors existing `.prism/references/` files — agent-facing, citation-friendly, no narrative bloat. Companion human-readable dev doc deferred (Eli task 10) until at least one downstream consumer ships.

- **Stakes calibration ships as a reference doc with no current consumers, anchoring Phase 3.**
  - **Root cause:** Parker (Phase 3) is the only consumer in the planning horizon, but the pattern is shaped by BMAD's existing implementation and is portable. Documenting it now means Parker's plan can cite from day one; deferring means Parker's plan re-derives the pattern, then a hypothetical second consumer re-derives it again.
  - **Alternatives considered:** Defer until Phase 3 (chosen against — would force Parker's plan to derive a pattern that's already shaped externally); inline into Mira (chosen against — premature, Parker is the anchor not Mira); reference doc (chosen).
  - **Chosen approach:** Reference doc at `.prism/references/stakes-calibration.md` with explicit "no current consumers" framing. Phase 3 plan picks it up.
  - **Implementation guidance:** Document the three-level table and the three calibration dimensions; do NOT modify Mira or any existing skill in this phase. Mira composition is a Phase 3-or-later question.

- **A/P/C menu lands in Winston's evaluate mode, not as a generic skill mechanic.**
  - **Root cause:** The gate's three options (Advanced Elicitation, Party Mode, Continue) only make sense between critique and prescription. That's a Winston-specific shape — other skills don't have a Devil's Advocate → Suggested Approach transition.
  - **Alternatives considered:** Generic skill mechanic documented in `AGENTS.md` (chosen against — no other skill has the right shape); rules file (chosen against — same reason); Winston-specific (chosen).
  - **Chosen approach:** Subsection in Winston's `## Output format` between Devil's Advocate and Suggested Approach.
  - **Implementation guidance:** Task 7 specifies exact placement and phrasing. The gate fires once per evaluate run; do not stack gates between every output section.

- **No new ADR is needed for this phase.** Each pattern absorbs into existing surfaces or new reference docs without altering an architectural decision that warrants ADR-class documentation. The triple-gate (task 5) itself confirms this — these absorptions are easy to reverse (delete the inserted block), explainable inline, and not contested trade-offs. ADR creation would fail the triple-gate the phase itself is codifying.

---

## Acceptance Criteria

### Behavioral

- [ ] Given Winston is invoked on a ticket with abstraction concerns, When he evaluates the proposed approach, Then his output references the deletion test as a tiebreaker for ambiguous abstraction calls.
- [ ] Given Eric or Briar is reviewing a diff that introduces a new generic parameter or wrapper component, When the four justification questions land ambiguously, Then the reviewer applies the deletion test and surfaces the verdict (pass-through vs. earning its keep) in the review output.
- [ ] Given an implementer is consulting `.prism/rules/code-standards.md` § General before introducing an interface, When they read the premature-abstraction guidance, Then they encounter the two-adapters seam rule directly after the three-similar-lines rule.
- [ ] Given Winston is closing an evaluation with a decision worth recording, When he evaluates whether to promote the decision, Then he applies all three gates (hard to reverse, surprising without explanation, genuine trade-off) and only promotes when all three fire.
- [ ] Given Winston completes his Devil's Advocate critique in evaluate mode, When he transitions to the next output section, Then he presents the A/P/C menu and waits for the user's selection before continuing.
- [ ] Given a future skill author is designing a multi-phase resumable workflow, When they read `.prism/references/micro-file-step-machine.md`, Then they find the file naming convention, frontmatter shape, resume-detection logic, and consumer list documented in one place.
- [ ] Given Phase 3 (Parker) begins planning, When the planner consults `.prism/references/stakes-calibration.md`, Then they find the three-level table and the three calibration dimensions documented for citation.

### Non-behavioral

- [ ] All canonical source edits land in `.ai-skills/skills/<id>/shared.md` (not in the generated `.claude/skills/<id>/SKILL.md` mirrors).
- [ ] `pnpm prism:build` completes without errors after the edits.
- [ ] `pnpm prism:check` reports no drift between canonical sources and generated mirrors.
- [ ] `pnpm prism:check-types` exits clean.
- [ ] `pnpm prism:test` exits clean.
- [ ] No new ADR file is created in `.prism/spec/adrs/` for this phase — the absorptions intentionally don't warrant ADR-class documentation per the triple-gate criterion this phase introduces.
- [ ] Two new reference docs exist at `.prism/references/micro-file-step-machine.md` and `.prism/references/stakes-calibration.md`, each citation-friendly and agent-facing.

### AC Adjustments

### AC Sync Log

| Date | Agent | Action | Plan | Linear |
| ---- | ----- | ------ | ---- | ------ |

---

## History

- 2026-05-22 [main]: Plan created. Phase 1.5e scoped per roadmap.md — seven pattern absorptions from Matt Pocock (deletion test, two-adapters seam rule, triple-gated ADR criterion) and BMAD (micro-file step machine, stepsCompleted frontmatter, A/P/C menu, stakes calibration) into existing PRISM surfaces and two new reference docs. No new persona; no new ADR.
- 2026-05-22 [hmcgrew/prism-1.5e-pattern-absorptions]: PR-1.5e implementation complete — deletion-test thought experiment added to Winston/Eric/Briar; two-adapters seam rule added to code-standards.md (canonical + templates); Winston's ADR-promotion criterion replaced with the triple-gate (hard-to-reverse + surprising + genuine trade-off); A/P/C menu inserted between Devil's Advocate and Suggested Approach; new reference docs at .prism/references/micro-file-step-machine.md and .prism/references/stakes-calibration.md (dual-written to templates). Paired dev docs deferred until Theo/Parker land per Eli's task 10/11 evaluation. All verification gates green.

---

## Debugged Issues

_None._

---

## Review Issues

_None yet._

---

## Cleanup Items

_None yet._

---

## PR Readiness

- [ ] No critical or major issues
- [ ] Types correct — no `any`, no unsafe `as`
- [ ] No stray console.logs or debug artifacts
- [ ] Tests written for new logic and edge cases — _N/A, content-only edits_
- [ ] All debugged issues resolved (no `open` entries)
- [ ] Build passes — last run: _pending_
- [ ] PR description up to date
- [ ] Lasting decisions promoted to architect context (if applicable) — _N/A, this phase introduces no architect-context-level decisions; all changes ARE the absorption_

**Last updated:** 2026-05-22

---

## Dependencies and Sequencing

- **Can land before, during, or after Phase 2.** Surface-light enough to not block any other phase.
- **Suggested sequencing per roadmap:** after Phase 1.5d (tokenization) to avoid merge churn during the content cleanup sweep — but not a hard dependency. If 1.5d slips, 1.5e can land first.
- **Internal sequencing:** tasks 1–8 are parallel-safe (independent file edits). Task 9 (build + check) must run after tasks 1–8 complete. Eli tasks 10 and 11 are evaluation-only and parallel-safe with everything.
- **No cross-phase dependencies.** Patterns absorbed here don't depend on Atlas (Phase 2), Theo (Phase 2.5), Ren (Phase 2.6), or Parker (Phase 3) existing — those phases will cite the patterns when they land.
