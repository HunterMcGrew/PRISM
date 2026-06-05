# Plan: epic-prism-parker

## Ticket

PRISM Phase 3 — Parker (PRD persona). Internal epic, no Linear ticket. See [roadmap.md § Phase 3](./roadmap.md#phase-3--parker-prd-persona).

---

## Goal

Ship Parker as PRISM's PRD persona — one skill with greenfield and brownfield modes that produces initiative-grain PRDs above Mira's story grain, with stakes calibration, `[ASSUMPTION]` markers, parallel reviewer-rubric subagents, and resumable workflow state.

---

## User Stories

Not applicable — internal PRISM persona epic. Parker is shipped infrastructure, not user-facing product. User-story-grain requirements are Mira's territory; this epic builds Mira's upstream counterpart.

---

## Design

Not applicable — chat persona, not a UI surface. Parker's "interaction design" lives in the step-file machine (PR-3.2) and the rubric subagent contracts (PR-3.3), which are captured in the implementation tasks below rather than in a Pixel mock spec.

---

## Implementation Tasks

Tasks must meet the detail bar in `.prism/rules/implementation-task-detail.md` — front-load every decision (file path, exact change, verification command, sequence). Tasks are grouped by sub-PR; within each sub-PR, by persona.

**Cross-PR sequencing:**
- PR-3.1 (scaffold + greenfield) blocks all subsequent PRs.
- PR-3.2 (brownfield steps) depends on PR-3.1's step-machine wiring.
- PR-3.3 (reviewer rubric) depends on PR-3.1 and PR-3.2 — step-06-review.md is a stub until PR-3.3.
- PR-3.4 (Linear handoff) depends on PR-3.2 finalize step.
- PR-3.5 (ADR + dev doc) depends on PR-3.1 through PR-3.4 landing — documents the final shape.

**Open-question gate cleared:** PRD output location resolved 2026-05-22 by Hunter — local canonical at `.prism/prds/<slug>.md` with optional Linear handoff. See `## Decisions` § PRD output location. PR-3.1 merge gate is open.

---

### PR-3.1 — Parker scaffold + greenfield mode

**Branch:** `hmcgrew/prism-3.1-parker-scaffold`
**Depends on:** Phase 2 (Atlas) for stub-anchor specializations; Phase 1.5e (cites stakes-calibration.md and micro-file step machine reference docs).
**Blocks:** PR-3.2, PR-3.3, PR-3.4, PR-3.5 (all subsequent Parker sub-PRs extend the scaffold).
**Parallel-safe with:** none within Phase 3 — scaffold lands first.
**Verification:** `pnpm prism:build && pnpm prism:check && pnpm prism:check-types && pnpm prism:test`.

Scope: stand up the canonical Parker skill with greenfield mode end-to-end (stakes calibration → fast/coaching path → draft → stub review → finalize). Brownfield mode is stubbed (returns "not yet implemented"); reviewer rubric is stubbed (returns "review pending implementation").

#### Clove

1. **Create canonical skill directory** at `.ai-skills/skills/prism-parker/`. New directory. No existing files. Verification: `ls .ai-skills/skills/prism-parker/` returns the five files listed in tasks 2–6.

2. **Write `.ai-skills/skills/prism-parker/frontmatter.yml`** with the following exact content:
   ```yaml
   name: prism-parker
   description: |
     Parker — the PRD persona. Invoke whenever the user mentions "Parker" in any context, or needs a Product Requirements Document above user-story grain. Triggers on phrases like "write a PRD", "draft a PRD for", "we need a PRD", "spec out this initiative", "product requirements document", "I need to think through this feature at the product level", "what's the PRD say", "let's PRD this", "document this existing feature as a PRD", "brownfield PRD", or any sentence containing the name "Parker". Two modes: greenfield (brain dump → stakes calibration → fast/coaching path → reviewer rubric → finalize) and brownfield (walks existing codebase and synthesizes a PRD without an interview). Produces `.prism/prds/<slug>.md` plus an optional `decision-log.md` audit trail in greenfield mode. Sits above Mira on grain — Parker writes initiative-level PRDs; Mira decomposes a PRD into user stories.
   personas:
     - claude
     - codex
     - cursor
   ```
   Verification: `pnpm prism:check` parses frontmatter without error.

3. **Write `.ai-skills/skills/prism-parker/shared.md`** — the canonical persona file, target 400–500 lines. Required sections in this order:
   - Persona header: "You are **Parker** (he/him), the PRD persona..." — product-strategic posture, asks hard questions about stakes and scope, sits above Mira on grain.
   - **Personality** — calm, structured, product-strategic. Cites stakes calibration and `[ASSUMPTION]` markers naturally. Distinguishes initiative-grain from story-grain at every handoff.
   - **How Parker thinks** — eight bullets covering: (1) Stakes before scope (one calibration interview drives everything downstream); (2) `[ASSUMPTION]` tags are first-class — never silently fill in unknowns; (3) PRDs are decision artifacts, not feature lists; (4) Initiative grain vs story grain — PRDs decompose into multiple stories; (5) Greenfield brain dump → coaching path stress-tests thin PM thinking; (6) Brownfield walks code, never interviews; (7) Reviewer rubric catches what the author can't self-see; (8) Decision log is the audit trail, the PRD is the deliverable.
   - **Stakes calibration table** — three levels (hobby / internal / launch) with what each unlocks: review rubric (skip / run / run + escalate), depth of Open questions (none required / encouraged / required), decision log creation (skip / optional / mandatory), Linear handoff (skip / offered / encouraged). Cite `.prism/references/stakes-calibration.md` — do not re-enumerate the level definitions in Parker's body. (Reference doc lands in Phase 1.5e per `.prism/plans/epic-prism-pattern-absorptions.md` task 8 — if not yet present, write the cite-link anyway; the link will resolve when the reference doc lands.)
   - **PRD output shape** — YAML frontmatter (`slug`, `title`, `mode: greenfield|brownfield`, `stakes: hobby|internal|launch`, `status: draft|reviewed|finalized`, `created`, `lastEdited`, `stepsCompleted: []`, `linearInitiativeId: null`) followed by sections in this order: Problem statement, Target users, Success metrics, Scope (with `in scope`, `out of scope`, `won't this time` subsections per MoSCoW), User journeys, Requirements (functional + non-functional subsections), Constraints, Open questions (numbered list of every `[ASSUMPTION]` referenced inline), Stakeholders, Decision log link.
   - **Two modes** — short summary of greenfield (interview-driven) vs brownfield (code-walking, no interview). Cite the micro-file step machine pattern via `.prism/references/micro-file-step-machine.md` — do not re-explain the pattern in Parker's body. (Same Phase 1.5e dependency caveat as stakes calibration.)
   - **Intro** — one-liner greeting on invocation (e.g. "Parker here. Greenfield or brownfield?").
   - **Startup** — detect mode from trigger phrase + check for existing draft in `.prism/prds/`; if draft frontmatter has `status: draft` and `stepsCompleted: [...]`, offer to resume; if `status: finalized`, require explicit confirmation before any edit (per resumability AC).
   - **Step dispatch** — Parker reads `.prism/skills/prism-parker/step-XX-*.md` files in order based on mode + stepsCompleted. Step files are not loaded into context until needed (micro-file pattern). Greenfield reads `step-01-init.md → greenfield-step-02-stakes.md → greenfield-step-03-mode.md → greenfield-step-04-draft.md → greenfield-step-05-decision-log.md → step-06-review.md → step-07-finalize.md → step-08-linear-handoff.md (optional)`. Brownfield reads `step-01-init.md → brownfield-step-02-explore.md → brownfield-step-03-sketch.md → brownfield-step-04-tests.md → brownfield-step-05-draft.md → step-06-review.md → step-07-finalize.md → step-08-linear-handoff.md (optional)`.
   - **Project Engineering Standards** — same boilerplate as Mira/Nora — cite `AGENTS.md § Ownership & Handoff`, redirect non-PRD requests appropriately.
   - **Ownership & Handoff** — Parker writes PRDs at initiative grain. Mira decomposes PRDs into stories (downstream). Nora optionally creates a Linear initiative from a finalized PRD (downstream). Winston evaluates the technical approach for an in-scope ticket (further downstream).
   - **Definition of Done** — checklist: PRD frontmatter complete; all required sections present; `[ASSUMPTION]` tags numbered and enumerated in `## Open questions`; reviewer rubric run (or explicitly skipped for hobby stakes); `status` updated to `finalized` on finalize; decision log created in greenfield mode for internal/launch stakes; lasting decisions promoted to architect context when applicable.
   - **Lessons Check** — same shape as Mira/Nora boilerplate.
   - Closing one-liner.

   Verification: `pnpm prism:check` passes; `wc -l .ai-skills/skills/prism-parker/shared.md` reports between 400 and 500.

4. **Write `.ai-skills/skills/prism-parker/claude.md`** — Claude-specific overrides. Header: "Claude-specific notes for Parker." Body: note that Claude's parallel `Task` tool dispatch is the default for reviewer rubric subagents (per PR-3.3); note that step-file frontmatter `paths:` keys are honored by Claude's path-scoped loading. Target 30–50 lines. Verification: `pnpm prism:check`.

5. **Write `.ai-skills/skills/prism-parker/codex.md`** — Codex-specific overrides. Header: "Codex-specific notes for Parker." Body: note that Codex executes rubric subagents sequentially (no parallel `Task` tool); document the fallback ordering (product fit → technical feasibility → clarity). Target 30–50 lines. Verification: `pnpm prism:check`.

6. **Write `.ai-skills/skills/prism-parker/cursor.md`** — Cursor-specific overrides. Header: "Cursor-specific notes for Parker." Body: note that Cursor uses inline rubric dispatch (no separate subagent process); rubric findings are appended directly to the chat thread. Target 30–50 lines. Verification: `pnpm prism:check`.

7. **Create stub step files** at `.prism/skills/prism-parker/` (operational state directory — not canonical) with placeholder content for each step. Tasks 1 through 7 in PR-3.2 will fill these out. For PR-3.1, write each file with this exact content:
   ```markdown
   ---
   step: <step-id>
   stepsCompleted: false
   ---

   # <step title>

   Stub — implementation lands in PR-3.2 (brownfield steps) or PR-3.3 (reviewer rubric).
   ```
   Files to create:
   - `.prism/skills/prism-parker/step-01-init.md`
   - `.prism/skills/prism-parker/greenfield-step-02-stakes.md`
   - `.prism/skills/prism-parker/greenfield-step-03-mode.md`
   - `.prism/skills/prism-parker/greenfield-step-04-draft.md`
   - `.prism/skills/prism-parker/greenfield-step-05-decision-log.md`
   - `.prism/skills/prism-parker/brownfield-step-02-explore.md`
   - `.prism/skills/prism-parker/brownfield-step-03-sketch.md`
   - `.prism/skills/prism-parker/brownfield-step-04-tests.md`
   - `.prism/skills/prism-parker/brownfield-step-05-draft.md`
   - `.prism/skills/prism-parker/step-06-review.md`
   - `.prism/skills/prism-parker/step-07-finalize.md`

   Verification: `ls .prism/skills/prism-parker/` returns all eleven files.

8. **Implement greenfield step-01-init.md and step-02-stakes.md and step-03-mode.md and step-04-draft.md and step-05-decision-log.md and step-07-finalize.md** with full content for greenfield happy path. Brownfield steps (02-05) remain stubs in PR-3.1; review step-06 and Linear handoff step-08 remain stubs.
   - `step-01-init.md` — mode detection from trigger phrase ("greenfield" / "brownfield" / ambiguous → ask user). Sets `mode` in frontmatter of the new PRD draft at `.prism/prds/<slug>.md`. Resumability check: if an existing draft is found, offer to resume.
   - `greenfield-step-02-stakes.md` — interactive stakes calibration interview. Three questions: (1) "Is this a hobby project, an internal tool, or a public launch?"; (2) "How many users are affected?"; (3) "What's the cost of getting this wrong?". Maps answers to `stakes: hobby|internal|launch` in the PRD frontmatter.
   - `greenfield-step-03-mode.md` — asks "Fast path (batch-draft with `[ASSUMPTION]` tags, you review at the end) or coaching path (we build each PRD section together)?". Sets internal flag to drive step-04 behavior.
   - `greenfield-step-04-draft.md` — fast path: batch-write all PRD sections from the brain dump, inserting `[ASSUMPTION: <text>]` markers wherever the brain dump didn't cover something. Every `[ASSUMPTION]` also gets a numbered entry in `## Open questions`. Coaching path: walk through each section interactively, asking PM-style clarifying questions before writing.
   - `greenfield-step-05-decision-log.md` — for `stakes: internal|launch`, create `.prism/prds/<slug>.decision-log.md` and seed it with the stakes calibration outcome + the fast/coaching choice. Skip for `stakes: hobby`.
   - `step-07-finalize.md` — set `status: finalized` and `lastEdited: <date>` in the PRD frontmatter; append `step-07-finalize` to `stepsCompleted`; offer the Linear handoff (step-08) but do not run it automatically.

   Verification per step: `pnpm prism:check` passes after each file is written; manually exercise the greenfield happy path against a throwaway PRD slug (`.prism/prds/test-parker-greenfield.md`) and confirm each step writes the expected frontmatter changes.

9. **Stub step-06-review.md and step-08-linear-handoff.md** with placeholder content noting they ship in PR-3.3 and PR-3.4 respectively. Step-06 placeholder returns a one-line message: "Review step pending — PR-3.3 implements parallel rubric subagent dispatch. Skipping review for now and proceeding to finalize." Step-08 placeholder returns: "Linear handoff step pending — PR-3.4 implements optional handoff. Finalize without Linear handoff for now."

10. **Register prism-parker in the canonical manifest** at `.ai-skills/manifest.json`. Append a new entry with `name: prism-parker`, `path: skills/prism-parker/`, `personas: [claude, codex, cursor]`. Verification: `pnpm prism:build` succeeds and emits the platform copies at `templates/claude/skills/prism-parker/`, `templates/codex/skills/prism-parker/`, `templates/cursor/skills/prism-parker/`.

11. **Cross-reference Parker in skills-ecosystem.md** at `.prism/architect/skills-ecosystem.md`. Add a new row to the persona table: `Parker | PRD persona | Phase 3 | initiative grain — sits above Mira`. Add a paragraph in the routing section explaining: "When the user asks for a PRD or initiative-level requirements work, route to Parker before Mira. Mira decomposes Parker's PRDs into stories. If the user is already at story grain (single-ticket work), skip Parker and go straight to Mira." Verification: `pnpm prism:check`.

12. **Smoke test greenfield happy path** by manually invoking Parker (via the trigger phrase "write a PRD for X") and walking through all seven steps end-to-end against a real test slug. Confirm: (a) draft PRD is created at `.prism/prds/<slug>.md` with valid frontmatter; (b) stakes calibration writes the right `stakes:` value; (c) fast path emits `[ASSUMPTION]` markers and they appear in `## Open questions`; (d) decision log is created for `internal`/`launch` stakes and skipped for `hobby`; (e) finalize updates `status: finalized`; (f) the stubbed step-06 prints its placeholder message and proceeds; (g) the stubbed step-08 prints its placeholder message. Delete the test slug afterward. Verification: manual chat-driven smoke test.

#### Eli

1. **Add a one-paragraph note to `docs/content/dev/ai-skills/overview.md`** announcing Parker's arrival, with one sentence on each of: (a) what Parker does (PRDs at initiative grain), (b) how Parker relates to Mira (Parker → Mira on grain, never the reverse), (c) the two modes (greenfield + brownfield). Do not document the full step machine here — that lands in PR-3.5's paired dev doc. Verification: `pnpm prism:check` passes; visual scan confirms the paragraph is placed after the existing persona list, before the manifest reference.

---

### PR-3.2 — Brownfield mode step files

**Branch:** `hmcgrew/prism-3.2-parker-brownfield`
**Depends on:** PR-3.1 (brownfield steps extend the scaffold).
**Blocks:** PR-3.3 (reviewer rubric is invoked from both greenfield and brownfield flows).
**Parallel-safe with:** none within Phase 3.
**Verification:** `pnpm prism:build && pnpm prism:check`.

Scope: implement brownfield step files so Parker can walk an existing codebase and synthesize a PRD without conducting an interview. Greenfield mode is unchanged from PR-3.1.

#### Clove

1. **Implement `.prism/skills/prism-parker/brownfield-step-02-explore.md`** — codebase walk. Inputs: the user names a feature, module, directory, or block. Parker walks the named area using `Grep` and `Read` to enumerate: top-level files, exported symbols, paired test files (if any), dependency edges. Output: an `## Observed surface` section in scratch state listing files, exports, tests, and call sites. Replace the PR-3.1 stub content entirely. Frontmatter `step: brownfield-step-02-explore`, `stepsCompleted: false`. Verification: manual exercise against a known module (e.g. `.ai-skills/skills/prism-architect/`); confirm the observed surface section enumerates the expected files and exports.

2. **Implement `.prism/skills/prism-parker/brownfield-step-03-sketch.md`** — module sketch confirmation. Parker presents the observed surface to the user as a labeled sketch: "Here's what I see — does this match how you think about the module?" The user confirms, corrects, or augments. Corrections write back to the scratch state. The user's confirmed sketch is the ground truth for step-04 and step-05. Replace the PR-3.1 stub content entirely. Verification: manual exercise — confirm Parker accepts user corrections and the corrected sketch flows into the next step.

3. **Implement `.prism/skills/prism-parker/brownfield-step-04-tests.md`** — test scope confirmation. Parker presents: "Here are the tests I found alongside this module — [list]. Are there other test surfaces I should consider (integration tests, e2e tests, manual QA flows)?" The user confirms or adds. Test surfaces are stored in the scratch state and referenced in the Requirements > Non-functional section of the final PRD. Replace the PR-3.1 stub content entirely. Verification: manual exercise — confirm test surfaces appear in the final brownfield PRD's Requirements section.

4. **Implement `.prism/skills/prism-parker/brownfield-step-05-draft.md`** — synthesize the PRD from observed code + confirmed sketch + confirmed tests. Critical detail: any claim that cannot be observed directly from the code (user intent, business rationale, downstream impact) must be tagged `[INFERRED: <text>]` — not `[ASSUMPTION]`. Brownfield uses `[INFERRED]` because the persona is inferring from existing code rather than deferring an unknown. Every `[INFERRED]` claim also gets a numbered entry in `## Open questions` for the user to validate or correct after generation. Replace the PR-3.1 stub content entirely. Verification: manual exercise — confirm `[INFERRED]` markers appear inline and in Open questions; confirm `[ASSUMPTION]` markers do NOT appear in brownfield-generated PRDs.

5. **Wire brownfield mode end-to-end** in Parker's step dispatch (already in `shared.md` from PR-3.1 task 3) — confirm that selecting `mode: brownfield` in step-01 routes to brownfield-step-02 through brownfield-step-05, then to the shared step-06 (review stub) and step-07 (finalize). Verification: manual smoke test against a real test slug (`.prism/prds/test-parker-brownfield.md`); confirm: (a) no stakes calibration interview runs in brownfield mode; (b) `[INFERRED]` markers appear (not `[ASSUMPTION]`); (c) finalize updates `status: finalized`. Delete the test slug afterward.

6. **Update Parker's `shared.md` § Two modes section** to remove any "brownfield is stubbed" caveat language added in PR-3.1. Target file: `.ai-skills/skills/prism-parker/shared.md`. Specific change: locate the paragraph noting "brownfield mode lands in PR-3.2" and delete it. Verification: `pnpm prism:check`; visual scan of the updated section.

#### Eli

1. **Add brownfield mode coverage** to `docs/content/dev/ai-skills/overview.md` — extend the Parker paragraph from PR-3.1 with one additional sentence: "Brownfield mode walks the named code area, confirms the module sketch and test scope with the user, and synthesizes a PRD that uses `[INFERRED]` markers for any claim that can't be observed directly from the code." Verification: `pnpm prism:check`.

---

### PR-3.3 — Reviewer rubric subagent dispatch

**Branch:** `hmcgrew/prism-3.3-parker-reviewer-rubric`
**Depends on:** PR-3.2 (reviewer rubric is invoked from both greenfield and brownfield flows; both need to exist first).
**Blocks:** PR-3.4 (Linear handoff offered after reviewer rubric completes).
**Parallel-safe with:** none within Phase 3.
**Verification:** `pnpm prism:build && pnpm prism:check`. Smoke test: invoke step-06 against a sample PRD with planted gaps; verify all three subagents return matching findings.

Scope: implement the parallel reviewer rubric in `step-06-review.md`. Three rubric subagents (product fit, technical feasibility framing, clarity) dispatched in parallel via the `Task` tool. Auto-skip for `stakes: hobby`. Synthesize findings into a triage table.

#### Clove

1. **Create rubric files** at `.prism/skills/prism-parker/rubrics/`:
   - `.prism/skills/prism-parker/rubrics/product-fit.md` — rubric for product fit review. Contents: subagent prompt header ("You are a product-fit reviewer for a PRD..."), evaluation axes (problem clarity, target-user specificity, success-metric measurability, scope coherence, JTBD alignment), severity scale (`critical | major | minor`), output format (numbered findings, each with severity + axis + one-sentence problem statement + one-sentence suggested fix). Target 80–120 lines.
   - `.prism/skills/prism-parker/rubrics/technical-feasibility.md` — rubric for technical feasibility framing review. Critical detail: Parker is NOT evaluating technical feasibility itself (that's Winston's domain). Parker is evaluating whether the PRD frames the technical feasibility questions correctly — does it surface the unknowns Winston will need to answer? Are constraints articulated? Are dependencies named? Same severity scale and output format as product-fit. Target 80–120 lines.
   - `.prism/skills/prism-parker/rubrics/clarity.md` — rubric for clarity review. Evaluation axes: ambiguity red flags (uses Nora's list from `.ai-skills/skills/prism-ticket-start/shared.md` § Requirements Quality — cite, don't re-enumerate), `[ASSUMPTION]` / `[INFERRED]` discipline (numbered, enumerated in Open questions), section completeness, internal consistency (does the scope match the requirements?). Same severity scale and output format. Target 80–120 lines.

   Verification per file: `pnpm prism:check` passes; visual scan confirms the cite to Nora's ambiguity red flags doesn't re-enumerate them.

2. **Rewrite `.prism/skills/prism-parker/step-06-review.md`** — replace the PR-3.1 stub entirely. New content:
   - Frontmatter: `step: step-06-review`, `stepsCompleted: false`.
   - Auto-skip gate: if PRD frontmatter `stakes: hobby`, print one line ("Skipping reviewer rubric — hobby-stakes PRD per stakes calibration. Proceeding to finalize.") and exit the step.
   - For `stakes: internal|launch`: dispatch three rubric subagents in parallel via the `Task` tool. Each subagent receives the full PRD contents + its rubric file. Each returns a structured findings list.
   - Synthesize findings into a triage table with columns: `# | Severity | Rubric | Finding | Suggested fix`. Sort by severity (critical → major → minor), then by rubric order (product fit → technical feasibility → clarity).
   - Present the triage table to the user. Offer three actions per finding: `accept (edit PRD)`, `defer (add to Open questions)`, `dismiss (log in decision log)`.
   - On user response, edit the PRD as directed; append all decisions to the decision log (for `stakes: internal|launch`).

   Verification: manual smoke test — invoke Parker against a deliberately-flawed test PRD (`.prism/prds/test-parker-review.md`) with `stakes: launch`; confirm three subagents dispatch in parallel (visible in the Task tool output stream); confirm triage table is sorted correctly; confirm user actions are applied to the PRD and logged to the decision log. Delete the test slug afterward.

3. **Document the auto-skip behavior in Parker's `shared.md`** — locate the "Stakes calibration table" section authored in PR-3.1 and confirm the `hobby` row's "review rubric" column reads `skip` (it should, from PR-3.1). If it reads anything else, fix it. Verification: visual scan.

4. **Update Parker's `shared.md` Two modes section** to remove any "reviewer rubric is stubbed" caveat language from PR-3.1. Same shape as PR-3.2 task 6 — locate and delete the placeholder sentence. Verification: `pnpm prism:check`.

#### Eli

1. **Add reviewer rubric coverage** to `docs/content/dev/ai-skills/overview.md` — extend the Parker paragraph with one additional sentence: "Reviewer rubric dispatches three parallel subagents (product fit, technical feasibility framing, clarity) for `internal` and `launch` stakes, and auto-skips for `hobby` — skipping the rubric for hobby stakes is a feature, not a gap." Verification: `pnpm prism:check`.

---

### PR-3.4 — Linear initiative handoff

**Branch:** `hmcgrew/prism-3.4-parker-linear-handoff`
**Depends on:** PR-3.3 (Linear handoff is offered after reviewer rubric completes).
**Blocks:** none within Phase 3.
**Parallel-safe with:** PR-3.5 (Linear handoff and ADR + dev doc touch different files).
**Verification:** `pnpm prism:build && pnpm prism:check`. Manual smoke test with Linear MCP if available.

Scope: implement the optional Linear initiative handoff in `step-08-linear-handoff.md`. Two paths: (A) hand off to Nora for ticket creation; (B) Parker creates the initiative directly via Linear MCP. On success, write `linearInitiativeId` to the PRD frontmatter. Optional per the resolved Decisions § PRD output location (local canonical confirmed 2026-05-22; Linear push remains optional).

#### Clove

1. **Rewrite `.prism/skills/prism-parker/step-08-linear-handoff.md`** — replace the PR-3.1 stub entirely. New content:
   - Frontmatter: `step: step-08-linear-handoff`, `stepsCompleted: false`.
   - Gate: only runs if `status: finalized` (i.e. step-07 completed).
   - Ask the user: "Do you want to create a Linear initiative from this PRD? (yes — Path A: hand off to Nora; yes — Path B: I'll create it directly; no — skip)"
   - **Path A (Nora handoff)**: emit a structured handoff message naming the PRD slug, the PRD path (`.prism/prds/<slug>.md`), and the recommended initiative title (derived from PRD `title` frontmatter). Suggest the user invoke Nora next with phrasing like "Nora, create a Linear initiative from PRD `<slug>`". Do not block — exit cleanly.
   - **Path B (direct creation)**: call the Linear MCP `save_initiative` tool with: `name` = PRD `title`, `description` = PRD `## Problem statement` section contents, `teamId` from project config. On success, capture the returned `initiativeId` and write it to the PRD frontmatter as `linearInitiativeId: <id>`. On failure, log the error and fall through to Path A handoff messaging.

   Verification: manual smoke test against a finalized test PRD; exercise both paths; confirm Path B writes `linearInitiativeId` to frontmatter on success.

2. **Update Nora's shared.md to accept PRD-slug invocations** at `.ai-skills/skills/prism-ticket-start/shared.md`. Specific change: add a new section after the existing "Create-ticket path" section, titled `## Create-from-PRD path`. Content: triggered by phrases like "create a Linear initiative from PRD `<slug>`" or "Nora, create initiative from PRD". On trigger: read the PRD at `.prism/prds/<slug>.md`, derive initiative title from PRD frontmatter `title`, derive description from PRD `## Problem statement` + `## Target users` + `## Success metrics` sections, call `save_initiative` via Linear MCP, write the returned `initiativeId` back to the PRD frontmatter as `linearInitiativeId: <id>`. Target 30–50 lines. Verification: `pnpm prism:check`; manual smoke test against a finalized test PRD.

3. **Update Parker's `step-07-finalize.md`** to offer the Linear handoff option explicitly. Specific change: at the end of the finalize step's user-facing output, append the line: "PRD finalized. Want to create a Linear initiative from this PRD? Path A (hand off to Nora) or Path B (I'll create it directly via the Linear MCP)?". On user choice, route to step-08 with the chosen path flag. Verification: manual smoke test — confirm the offer appears and routes correctly.

#### Eli

1. **Add Linear handoff coverage** to `docs/content/dev/ai-skills/overview.md` — extend the Parker paragraph with one additional sentence: "Finalized PRDs can optionally hand off to Nora for Linear initiative creation (Path A) or Parker creates the initiative directly via Linear MCP (Path B); on success, `linearInitiativeId` is written back to the PRD frontmatter." Verification: `pnpm prism:check`.

---

### PR-3.5 — ADR-0043 + paired dev doc

**Branch:** `hmcgrew/prism-3.5-parker-adr-dev-doc`
**Depends on:** PR-3.1 (ADR documents the persona shape established in scaffold).
**Blocks:** none — final sub-PR in Phase 3.
**Parallel-safe with:** PR-3.4 (different files).
**Verification:** `pnpm prism:check` (ADR linter validates byte-parity dual-write).

Scope: ship the ADR documenting Parker's design + the paired dev doc explaining usage. This PR locks the architectural record once PR-3.1 through PR-3.4 have landed.

#### Clove

1. **Create `.prism/spec/adrs/0043-parker-prd-persona.md`** — ADR-0043. Required sections (per existing ADR shape — read `.prism/spec/adrs/0033-implementation-task-detail.md` as the template):
   - Title: "Parker as the PRD persona with greenfield and brownfield modes"
   - Status: Accepted
   - Context: PRISM had no persona at initiative-grain. Mira sits at story-grain. Winston sits at ticket-grain (evaluating approach for in-scope tickets). PRDs were either skipped (work flowing straight into Mira from raw user input) or written by hand outside of PRISM. BMAD's `bmad-prd` validates that one persona with two modes (collapsed from `bmad-create-prd` + `bmad-edit-prd`) is the right grain.
   - Decision: Ship Parker as a single PRISM skill with two modes — greenfield (interview-driven, stakes-calibrated, fast/coaching paths) and brownfield (code-walking, no interview, `[INFERRED]` markers).
   - Consequences: (a) PRISM now has full persona coverage from initiative (Parker) → story (Mira) → ticket (Nora/Winston) → implementation (Clove). (b) PRD output lives at `.prism/prds/<slug>.md` — Parker writes only here, never to `.prism/plans/`. (c) Reviewer rubric is parallel-subagent-dispatched in Claude; sequential in Codex; inline in Cursor. (d) Linear handoff is optional and survives across both modes via step-08.
   - Alternatives considered: (1) Two separate personas for greenfield + brownfield — rejected, BMAD's collapse validates one-persona-two-modes; (2) Parker absorbs into Mira — rejected, grain mismatch (PRD generates multiple stories); (3) Parker absorbs into Winston — rejected, Winston is reactive evaluation, Parker is generative authoring.

   Target 150–250 lines. Verification: `pnpm prism:check`; visual scan confirms ADR shape matches existing ADRs.

2. **Mirror ADR-0043 byte-identically to `templates/claude/spec/adrs/0043-parker-prd-persona.md`**. Specific command: `cp .prism/spec/adrs/0043-parker-prd-persona.md templates/claude/spec/adrs/0043-parker-prd-persona.md`. Verification: `diff .prism/spec/adrs/0043-parker-prd-persona.md templates/claude/spec/adrs/0043-parker-prd-persona.md` returns no output (byte-identical).

3. **Create `docs/content/dev/ai-skills/parker.md`** — paired dev doc. Required sections per `.prism/references/dev-doc-template.md`:
   - Overview: one paragraph on Parker's role and the two modes.
   - When to invoke: trigger phrases (mirror the frontmatter description in PR-3.1 task 2 — cite, don't re-enumerate; link to `.ai-skills/skills/prism-parker/frontmatter.yml`).
   - Greenfield workflow: step-by-step walkthrough of the seven-step flow with screenshots or transcript snippets at each step. Include the stakes calibration table (cite `.prism/references/stakes-calibration.md` — do not re-enumerate level definitions).
   - Brownfield workflow: step-by-step walkthrough of the six-step flow. Emphasize `[INFERRED]` vs `[ASSUMPTION]` distinction.
   - Reviewer rubric: explain the three subagents and the auto-skip-for-hobby rule. Cite the three rubric files in `.prism/skills/prism-parker/rubrics/`.
   - Linear handoff: explain Path A vs Path B and when each is appropriate.
   - PRD output shape: cite Parker's `shared.md` § PRD output shape — do not re-enumerate the frontmatter fields or section list.
   - Handoff diagram: ASCII or mermaid showing Parker → (optional Linear initiative via Nora) → Mira (story decomposition) → Winston (technical evaluation) → Clove (implementation).

   Target 250–400 lines. Verification: `pnpm prism:check`; run the architect-doc-verification triage from `.prism/rules/architect-doc-verification.md` against the doc — every claim about Parker's source behavior must be Verified (no Diverged, no Missing).

4. **Add cross-references** between ADR-0043 and the paired dev doc:
   - In `.prism/spec/adrs/0043-parker-prd-persona.md`, add a `## Paired dev doc` section near the end linking to `docs/content/dev/ai-skills/parker.md`.
   - In `docs/content/dev/ai-skills/parker.md`, add a `## ADR` section near the end linking to `.prism/spec/adrs/0043-parker-prd-persona.md`.
   - Mirror the ADR change byte-identically to `templates/claude/spec/adrs/0043-parker-prd-persona.md`.

   Verification: `pnpm prism:check`; visual scan confirms both directions of the cross-link.

5. **Run the architect-doc-verification triage** from `.prism/rules/architect-doc-verification.md` against `docs/content/dev/ai-skills/parker.md`. Walk every claim about Parker's source behavior — trigger phrases, step file paths, rubric file paths, frontmatter shape, mode-specific marker tags (`[ASSUMPTION]` vs `[INFERRED]`), Linear handoff paths, output location — against the canonical files in `.ai-skills/skills/prism-parker/` and `.prism/skills/prism-parker/`. Every claim must be classified Verified. Diverged or Missing claims block the PR. Verification: triage report attached to PR description.

6. **Update `.prism/architect/skills-ecosystem.md`** to reference ADR-0043 in Parker's row. Specific change: in the Parker row added in PR-3.1 task 11, append `(ADR-0043)` after `Phase 3`. Verification: `pnpm prism:check`.

#### Eli

1. **Replace the rolling Parker paragraph in `docs/content/dev/ai-skills/overview.md`** with a final summary paragraph that links to the new dedicated dev doc at `docs/content/dev/ai-skills/parker.md`. Specific change: locate the Parker paragraph (built up across PR-3.1 through PR-3.4) and replace it with: "Parker is PRISM's PRD persona — initiative-grain requirements work above Mira's story-grain. Two modes: greenfield (interview-driven, stakes-calibrated) and brownfield (code-walking, `[INFERRED]` markers). See [Parker dev doc](./parker.md) for the full workflow walkthroughs, rubric details, and handoff diagram." Verification: `pnpm prism:check`; visual scan confirms the rolling paragraph is gone and the link resolves.

2. **Add Parker to the persona index** in `docs/content/dev/ai-skills/index.md` (or whatever the platform's persona index file is — check the existing structure). Specific change: add a row matching the existing pattern: `| Parker | PRD persona | [parker.md](./parker.md) | ADR-0043 |`. Verification: `pnpm prism:check`.

---

## Decisions

- **One persona, two modes (greenfield + brownfield), not two cousins.**
  - **Root cause:** Greenfield (interview-driven) and brownfield (code-walking) are different input shapes but the same output (a PRD). Spinning them up as two personas creates twin shared scaffolding (PRD frontmatter logic, stakes calibration, reviewer rubric, finalize, Linear handoff) that has to be maintained in two places.
  - **Alternatives considered:** Two separate personas (`prism-parker-greenfield` + `prism-parker-brownfield`); one persona with mode flag (chosen); absorb brownfield into a future persona (rejected — premature speculation).
  - **Chosen approach:** One persona, mode flag. Validated by BMAD's collapse of `bmad-create-prd` + `bmad-edit-prd` into `bmad-prd` — exact same divergence point, exact same resolution.
  - **Implementation guidance:** Step-01 detects mode (from trigger phrase or asks user); subsequent step files are mode-prefixed (`greenfield-step-XX` / `brownfield-step-XX`); shared steps (review, finalize, Linear handoff) live at the un-prefixed step number.
  - **Zoe verdict (2026-06-05):** `archive-candidate` — Parker shipped — `.ai-skills/skills/prism-prd/`, ADR-0043, `docs/content/dev/ai-skills/parker.md` all exist; plan never closed.

- **Parker separate from Mira — initiative grain vs story grain.**
  - **Root cause:** A PRD generates multiple user stories. Audience differs: PRDs are read by PMs and leadership; stories are read by developers. Artifact shape differs: a PRD is a standalone doc at `.prism/prds/<slug>.md`; stories are entries in `## User Stories` of a branch plan.
  - **Alternatives considered:** Parker absorbs into Mira (rejected — grain mismatch); Mira absorbs into Parker (rejected — Mira's INVEST/3Cs/JTBD framework is story-specific and doesn't apply at initiative grain); two personas with explicit handoff (chosen).
  - **Chosen approach:** Two personas. Parker writes PRDs. Mira decomposes PRDs into stories during her own invocation (read PRD → write story bundle into the branch plan).
  - **Implementation guidance:** Mira's startup flow already reads existing context — extend it in a future PR (out of scope for this epic) to detect a referenced PRD slug and read `.prism/prds/<slug>.md` as input. For this epic, Mira's flow is unchanged; the handoff is a chat-level suggestion at Parker's finalize step.
  - **Zoe verdict (2026-06-05):** `archive-candidate` — Parker shipped — `.ai-skills/skills/prism-prd/`, ADR-0043, `docs/content/dev/ai-skills/parker.md` all exist; plan never closed.

- **Reviewer rubric uses three parallel subagents (product fit, technical feasibility framing, clarity), not sequential or single self-review.**
  - **Root cause:** Single self-review converges on the author's blind spots — Parker doesn't see what Parker can't see. Sequential rubrics let each rubric's findings bias the next. Parallel-dispatched subagents review independently against orthogonal axes.
  - **Alternatives considered:** Single self-review pass (rejected — blind-spot drift); sequential rubrics (rejected — finding bias); parallel subagents (chosen).
  - **Chosen approach:** Three parallel subagents via Claude's `Task` tool. Sequential fallback for Codex (no parallel Task tool); inline fallback for Cursor.
  - **Implementation guidance:** Rubric files at `.prism/skills/prism-parker/rubrics/{product-fit,technical-feasibility,clarity}.md`. Each subagent receives full PRD + its rubric file. Findings are synthesized into a sorted triage table (severity desc, then rubric order). Critical detail: the technical-feasibility rubric evaluates *framing* (does the PRD surface the right questions?), not feasibility itself (that's Winston's job).
  - **Zoe verdict (2026-06-05):** `archive-candidate` — Parker shipped — `.ai-skills/skills/prism-prd/`, ADR-0043, `docs/content/dev/ai-skills/parker.md` all exist; plan never closed.

- **Greenfield decision log is separate from PRD body.**
  - **Root cause:** PRD is the deliverable (read by PMs, leadership, downstream personas). Decision log is the audit trail (read when someone asks "why does this PRD say X?"). Mixing them dilutes both.
  - **Alternatives considered:** Inline decision log inside the PRD (rejected — pollutes the deliverable); separate file (chosen); skip the decision log entirely (rejected for `internal`/`launch` stakes — high-stakes PRDs benefit from audit-ability).
  - **Chosen approach:** `.prism/prds/<slug>.decision-log.md` paired with `.prism/prds/<slug>.md`. Decision log is created in greenfield mode for `stakes: internal|launch`; skipped for `stakes: hobby`; skipped entirely in brownfield mode (the code IS the decision log).
  - **Implementation guidance:** Step-05 in greenfield mode creates the decision log file. Subsequent steps (review, finalize) append to it. The PRD frontmatter does NOT track the decision log path — convention is the pairing by filename stem.
  - **Zoe verdict (2026-06-05):** `archive-candidate` — Parker shipped — `.ai-skills/skills/prism-prd/`, ADR-0043, `docs/content/dev/ai-skills/parker.md` all exist; plan never closed.

- **PRD output location — local canonical at `.prism/prds/<slug>.md`, Linear push as optional handoff.** Resolved 2026-05-22 by Hunter.
  - **Alternatives considered:** (1) Local-only canonical (`.prism/prds/<slug>.md`) with Linear push as optional handoff — chosen; (2) Linear-only — PRD lives only in a Linear document, no local file; (3) Hybrid — local file is source of truth, Linear initiative description is a generated view.
  - **Chosen approach:** local-only canonical with optional Linear handoff. Matches PRISM's existing local-first convention (`.prism/plans/`, `.prism/architect/`, `.prism/lessons.md` all live local-canonical); decouples PRD lifecycle from Linear MCP availability (teams without Linear can still author PRDs); preserves the PRD as a versionable artifact in git, so PRD evolution is reviewable in PR diffs. Linear push remains available via PR-3.4's step-08 for teams that want the PRD reflected in their Linear initiative.
  - **Implementation guidance:** PR-3.1 through PR-3.5 proceed as originally written — local-canonical was the provisional default and is now confirmed. PR-3.4 (Linear initiative handoff) stays optional. `.prism/prds/<slug>.md` is the source of truth; `linearInitiativeId` in the PRD frontmatter is nullable and only populated when the user opts into the Linear handoff. The PR-3.1 merge gate is cleared.
  - **Zoe verdict (2026-06-05):** `archive-candidate` — Parker shipped — `.ai-skills/skills/prism-prd/`, ADR-0043, `docs/content/dev/ai-skills/parker.md` all exist; plan never closed.

- **`[ASSUMPTION]` tags are first-class artifacts (inline + numbered in `## Open questions`); brownfield uses `[INFERRED]` instead.**
  - **Root cause:** Silent assumptions in a PRD bias every downstream decision. Surfacing them as inline markers AND collecting them in a numbered list at the end gives both context-local visibility (reading section X, see assumption) and global tractability (scanning Open questions reveals everything still unresolved).
  - **Alternatives considered:** Inline-only (rejected — easy to miss in a 4-page PRD); list-only (rejected — loses local context); both (chosen). Single tag for both modes (rejected — `[ASSUMPTION]` and `[INFERRED]` have different semantics).
  - **Chosen approach:** Inline marker at the point of use; numbered enumeration in `## Open questions`. Greenfield uses `[ASSUMPTION: <text>]` (deferred decision the user hasn't made). Brownfield uses `[INFERRED: <text>]` (claim derived from code observation that needs user validation).
  - **Implementation guidance:** Step-04 (greenfield draft) and brownfield-step-05 (brownfield draft) both emit inline markers and the numbered enumeration. Step-06 reviewer rubric's clarity rubric specifically checks marker discipline (every inline marker has a matching numbered entry; every numbered entry has at least one inline reference).
  - **Zoe verdict (2026-06-05):** `archive-candidate` — Parker shipped — `.ai-skills/skills/prism-prd/`, ADR-0043, `docs/content/dev/ai-skills/parker.md` all exist; plan never closed.

- **Micro-file step machine over single shared.md.**
  - **Root cause:** Parker's flow is multi-step, branching (greenfield vs brownfield, fast vs coaching), and resumable. A single shared.md would hit context length and re-load full instructions for every step regardless of relevance.
  - **Alternatives considered:** Everything in shared.md (rejected — context inefficiency); micro-file step machine per BMAD (chosen).
  - **Chosen approach:** shared.md carries persona + dispatch logic only. Each step is its own file at `.prism/skills/prism-parker/step-XX-*.md`, loaded only when that step runs.
  - **Implementation guidance:** Cite the pattern reference at `.prism/references/micro-file-step-machine.md` (Phase 1.5e — write the link even if the reference doesn't exist yet; it'll resolve when 1.5e lands).
  - **Zoe verdict (2026-06-05):** `archive-candidate` — Parker shipped — `.ai-skills/skills/prism-prd/`, ADR-0043, `docs/content/dev/ai-skills/parker.md` all exist; plan never closed.

- **Skipping reviewer rubric for hobby stakes is a feature, not a gap.**
  - **Root cause:** Hobby projects don't have audiences large enough to justify rubric-level scrutiny. Forcing the rubric on hobby PRDs adds friction without proportional value.
  - **Alternatives considered:** Always run rubric (rejected — friction); always skip rubric (rejected — internal/launch PRDs benefit); stakes-gated (chosen).
  - **Chosen approach:** Auto-skip rubric for `stakes: hobby`; auto-run for `stakes: internal|launch`. Document the skip in step-06 output ("Skipping reviewer rubric — hobby-stakes PRD per stakes calibration. Proceeding to finalize.") so the user knows it's deliberate.
  - **Implementation guidance:** Gate is in step-06-review.md at the top. No user prompt — silent skip with explanatory line.
  - **Zoe verdict (2026-06-05):** `archive-candidate` — Parker shipped — `.ai-skills/skills/prism-prd/`, ADR-0043, `docs/content/dev/ai-skills/parker.md` all exist; plan never closed.

---

## Acceptance Criteria

### Behavioral

**Greenfield mode:**

- [ ] Given a user invokes Parker with the trigger phrase "write a PRD for X", When step-01 runs, Then mode is detected as `greenfield` and written to the PRD frontmatter at `.prism/prds/<slug>.md`.
- [ ] Given a greenfield PRD draft exists with no stakes set, When step-02 runs, Then Parker asks the three stakes calibration questions and writes `stakes: hobby|internal|launch` to the frontmatter based on the answers.
- [ ] Given the user selects "fast path" in step-03, When step-04 runs, Then Parker batch-drafts all PRD sections from the brain dump and emits inline `[ASSUMPTION: <text>]` markers wherever the brain dump didn't cover something.
- [ ] Given the user selects "coaching path" in step-03, When step-04 runs, Then Parker walks through each PRD section interactively, asking PM-style clarifying questions before writing.
- [ ] Given `stakes: hobby`, When step-06 runs, Then the reviewer rubric is skipped with an explanatory line ("Skipping reviewer rubric — hobby-stakes PRD per stakes calibration") and the step proceeds to finalize.
- [ ] Given `stakes: internal` or `stakes: launch`, When step-06 runs, Then three rubric subagents (product fit, technical feasibility framing, clarity) dispatch in parallel and return findings; a triage table is presented to the user with severity-sorted findings.
- [ ] Given an `[ASSUMPTION]` marker is emitted inline by step-04, When step-04 completes, Then a numbered entry for that assumption also appears in the PRD's `## Open questions` section.
- [ ] Given step-07 finalize runs, When the user confirms finalization, Then PRD frontmatter `status: draft` becomes `status: finalized` and `lastEdited: <today>` is written.

**Brownfield mode:**

- [ ] Given a user invokes Parker with the trigger phrase "brownfield PRD for the inventory sync module", When step-01 runs, Then mode is detected as `brownfield` and Parker proceeds without conducting any interview (no stakes calibration in brownfield mode).
- [ ] Given brownfield step-02 runs, When Parker explores the named code area, Then Parker uses `Grep` and `Read` to enumerate top-level files, exported symbols, paired tests, and dependency edges, and presents an observed-surface section to the user.
- [ ] Given brownfield step-03 runs, When Parker presents the module sketch, Then the user can confirm, correct, or augment it, and the confirmed sketch is the ground truth for subsequent steps.
- [ ] Given brownfield step-04 runs, When Parker presents the test scope, Then the user can confirm or add test surfaces, and the confirmed test scope feeds into the final PRD's Requirements > Non-functional section.
- [ ] Given brownfield step-05 runs, When Parker synthesizes the PRD, Then any claim that cannot be observed directly from the code is tagged `[INFERRED: <text>]` (not `[ASSUMPTION]`) and listed in the PRD's `## Open questions` section.

**Resumability:**

- [ ] Given a draft PRD exists at `.prism/prds/<slug>.md` with `status: draft` and `stepsCompleted: [step-01-init, greenfield-step-02-stakes]`, When the user invokes Parker again with the same slug, Then Parker offers to resume at the next step (`greenfield-step-03-mode`) rather than starting from scratch.
- [ ] Given a finalized PRD exists at `.prism/prds/<slug>.md` with `status: finalized`, When the user invokes Parker against the same slug, Then Parker requires explicit confirmation ("This PRD is already finalized. Modifying it will revert status to draft. Continue?") before any edit.

**Linear handoff:**

- [ ] Given a finalized PRD and the user selects Path A (Nora handoff) in step-08, When step-08 runs, Then Parker emits a structured handoff message naming the PRD slug, path, and recommended initiative title, suggests invoking Nora next, and exits cleanly without calling the Linear MCP itself.
- [ ] Given a finalized PRD and the user selects Path B (direct creation) in step-08, When step-08 runs, Then Parker calls Linear MCP `save_initiative` with the PRD title and problem statement, and on success writes `linearInitiativeId: <id>` to the PRD frontmatter.
- [ ] Given Path B fails (Linear MCP unavailable or returns an error), When step-08 detects the failure, Then Parker falls through to Path A handoff messaging and does not block.

**Reviewer rubric:**

- [ ] Given step-06 runs for an `internal`-stakes PRD, When the three rubric subagents complete, Then findings from all three are synthesized into a single triage table with columns `# | Severity | Rubric | Finding | Suggested fix`, sorted by severity descending (critical → major → minor), then by rubric order (product fit → technical feasibility → clarity).
- [ ] Given the user selects `accept (edit PRD)` for a finding, When the action runs, Then the PRD is edited per the suggested fix and the decision is appended to the decision log (for `internal`/`launch` stakes).
- [ ] Given the user selects `defer (add to Open questions)` for a finding, When the action runs, Then the finding text is appended as a new numbered entry in the PRD's `## Open questions` section.
- [ ] Given the user selects `dismiss (log in decision log)` for a finding, When the action runs, Then the dismissal (with the user's stated reason) is appended to the decision log, and the PRD is left unchanged.

### Non-behavioral

- [ ] `.ai-skills/skills/prism-parker/shared.md` is between 400 and 500 lines (per Mira/Nora benchmark; long enough to capture persona, short enough not to be a context burden).
- [ ] Every step file at `.prism/skills/prism-parker/step-*.md` has valid YAML frontmatter with `step:` and `stepsCompleted:` keys.
- [ ] Every rubric file at `.prism/skills/prism-parker/rubrics/*.md` has a subagent prompt header, evaluation axes, severity scale, and output format section.
- [ ] `pnpm prism:build` succeeds after the canonical skill is registered in `.ai-skills/manifest.json`, emitting platform copies at `templates/claude/skills/prism-parker/`, `templates/codex/skills/prism-parker/`, and `templates/cursor/skills/prism-parker/`.
- [ ] `.prism/spec/adrs/0043-parker-prd-persona.md` and `templates/claude/spec/adrs/0043-parker-prd-persona.md` are byte-identical (verified via `diff` returning no output).
- [ ] `docs/content/dev/ai-skills/parker.md` passes the architect-doc-verification triage (per `.prism/rules/architect-doc-verification.md`) — every claim about Parker's source behavior is classified Verified, no Diverged or Missing claims remain.
- [ ] Parker writes only to `.prism/prds/<slug>.md` and `.prism/prds/<slug>.decision-log.md` — never to `.prism/plans/`. (This is the load-bearing artifact boundary: plans are Winston's territory; PRDs are Parker's.)

### AC Adjustments

<!-- Agents propose changes here; human accepts/rejects -->

### AC Sync Log

| Date | Agent | Action | Plan | Linear |
| ---- | ----- | ------ | ---- | ------ |
| 2026-05-22 | (plan creator) | Initial AC drafted | updated | N/A (no Linear ticket) |

---

## History

- 2026-05-22 [main]: Plan created. Phase 3 — Parker, the PRD persona. Five-PR breakdown (scaffold + greenfield → brownfield steps → reviewer rubric → Linear handoff → ADR + dev doc). Decisions logged: one-persona-two-modes per BMAD validation, separate-from-Mira on grain, parallel-subagent rubric, separate decision log, micro-file step machine, hobby-stakes skip-rubric. Open question flagged: PRD output location (.prism/prds/ vs Linear-only vs hybrid) — needs Hunter input before PR-3.1 merges.
- 2026-05-22 [main]: PRD output location resolved by Hunter — local canonical at `.prism/prds/<slug>.md` with Linear push as optional handoff (path 1, provisional default confirmed). PR-3.1 merge gate cleared. All five sub-PRs proceed as originally written; no task rewrites required.

---

## Debugged Issues

None yet.

---

## Review Issues

None yet.

---

## Cleanup Items

None yet.

---

## PR Readiness

Living checklist — updated every time `code-review-self` runs against any of the five sub-PRs. Reflects current state of the epic.

**Open-question gate:**

- [x] PRD output location decision resolved by Hunter (local canonical with optional Linear handoff) — resolved 2026-05-22, PR-3.1 merge gate cleared

**Per sub-PR readiness:**

- [ ] PR-3.1 — Parker scaffold + greenfield mode merged
- [ ] PR-3.2 — Brownfield mode step files merged
- [ ] PR-3.3 — Reviewer rubric subagent dispatch merged
- [ ] PR-3.4 — Linear initiative handoff merged
- [ ] PR-3.5 — ADR-0043 + paired dev doc merged

**Cross-cutting readiness (checked at PR-3.5 close):**

- [ ] No critical or major review issues across the epic
- [ ] All five sub-PRs pass `pnpm prism:check` and `pnpm prism:build`
- [ ] No stray console.logs or debug artifacts in any Parker file
- [ ] Manual smoke tests pass for both greenfield and brownfield happy paths
- [ ] Reviewer rubric smoke test passes (three subagents dispatch in parallel against a deliberately-flawed test PRD)
- [ ] Linear handoff smoke test passes for both Path A and Path B
- [ ] ADR-0043 and its `templates/claude/` mirror are byte-identical
- [ ] `docs/content/dev/ai-skills/parker.md` passes architect-doc-verification triage
- [ ] Lasting decisions promoted to architect context (Parker's relationship to Mira, Nora, Winston in `.prism/architect/skills-ecosystem.md`)
- [ ] Plan deleted after PR-3.5 merges and lasting decisions are promoted

**Last updated:** 2026-05-22
