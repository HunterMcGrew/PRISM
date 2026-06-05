# Plan: epic-prism-theo

> Closed: 2026-06-05

## Ticket

PRISM Phase 2.5 — Theo (architect-doc walker persona). No Linear ticket; tracked via the PRISM roadmap at `.prism/plans/roadmap.md` § Phase 2.5.

## Goal

Ship Theo — a proactive, resumable, codebase-walking persona that surfaces load-bearing decisions worth documenting as architect docs (and their paired dev docs) so consumer teams can convert tacit architectural knowledge into durable agent context after Atlas-driven onboarding completes.

---

## User Stories

- As a consumer team lead who has just completed Atlas-driven onboarding, I want a persona that walks the codebase and proposes architect-doc candidates, so that the tacit knowledge in my team's heads gets converted into durable agent context without me having to manually map the codebase.
- As an engineer working with Theo, I want to pause mid-walk and resume the same walk in a later session, so that long codebase audits don't lock up a single chat window and I can spread the work across multiple sittings.
- As a reviewer evaluating Theo's output, I want each candidate presented with a load-bearing reason and a suggested shape, so that I can decide write/skip/defer without having to re-derive the reasoning Theo already did.
- As a paired-doc author, I want Theo to draft both the architect doc and the paired dev doc together when ADR-0038's gates pass, so that the agent-facing spec and the human-readable narrative land in lockstep instead of one drifting from the other.
- As a future persona author building the next codebase-walking skill, I want Theo's micro-file step machine to serve as a reference implementation, so that I can model my persona's resumability and step structure on a working pattern instead of reinventing it.

---

## Design

Not applicable — Theo is a chat-driven skill with no UI surface. Output is markdown files (architect docs, paired dev docs) and a JSON state file. Interaction is conversational prompting through the 8-phase step machine.

---

## Implementation Tasks

Grouped by sub-PR. Four sub-PRs (PR-2.5.1 through PR-2.5.4). Cross-sub-PR sequencing: PR-2.5.1 (scaffold) blocks PR-2.5.2 (steps); PR-2.5.2 blocks PR-2.5.3 (state); PR-2.5.4 (ADR + dev doc) is parallel-safe with PR-2.5.3 but conventionally lands last.

Tasks meet the detail bar in `.prism/rules/implementation-task-detail.md` — front-load every decision, leave keystrokes to the implementer.

### PR-2.5.1 — Theo scaffold + skill source

**Branch:** `hmcgrew/prism-2.5.1-theo-scaffold`
**Depends on:** Phase 2 (Atlas) — Theo's `<!-- atlas:specializes-in -->` anchor needs Atlas to exist for population.
**Blocks:** PR-2.5.2 (step files reference scaffold's frontmatter and persona body).
**Parallel-safe with:** none within Phase 2.5 — scaffold lands first.
**Verification:** `pnpm prism:build && pnpm prism:check && pnpm prism:check-types && pnpm prism:test`.

#### Clove (implementation)

1. **Create canonical skill directory** at `.ai-skills/skills/prism-theo/`. New directory; mirrors the layout of `.ai-skills/skills/prism-architect/` and `.ai-skills/skills/prism-pixel/`. Verification: `ls -la .ai-skills/skills/prism-theo/` returns the directory. Sequence: blocks tasks 2–6.

2. **Write `.ai-skills/skills/prism-theo/frontmatter.yml`** with the following fields:
   - `name: prism-theo`
   - `displayName: "Theo — architect-doc walker"`
   - `pronouns: he/him`
   - `triggers:` array — exact list: `"Theo"`, `"Theo walk the codebase"`, `"find architect doc candidates"`, `"find load-bearing decisions"`, `"what should we document"`, `"scan for architect docs"`
   - `handoff: [winston, eli]`
   - `stateFile: ".prism/theo-state.json"`
   Sequence: after task 1. Verification: `pnpm prism:build` succeeds after task 6 lands and emits a generated `.claude/skills/prism-theo/SKILL.md`.

3. **Write `.ai-skills/skills/prism-theo/shared.md`** — the persona body shared across platforms. Required sections in order:
   - Identity opening line: "You are **Theo**, a methodical, observant, cartographic codebase walker who maps load-bearing decisions for documentation."
   - Personality section — measured, descriptive, geological tone; takes time to look at the rock layers before naming what's there; never rushes.
   - Tone — "measured, descriptive, geological."
   - Quirks — opens by orienting (asks where to start walking), names what he sees before naming what to do about it, surfaces patterns by citing where else he's seen them in the same codebase, closes each candidate with a clear write/skip/defer prompt.
   - Cognitive Approach — Deletion Test as primary heuristic (cite the Phase 1.5e absorption — "if I deleted this module, where does complexity reappear"); cartographic-over-evaluative boundary vs Ren ("Theo names shape; Ren grades quality").
   - Project Engineering Standards paragraph — same shape as Winston's: defer to `.prism/rules/` and `.prism/architect/` as authoritative; flag gaps.
   - Intro greeting examples (give 3): "Theo here. Where would you like me to start walking?", "Hey — Theo checking in. Got a directory you'd like me to map?", "Theo at the table. Let me get oriented before I start sketching."
   - **When this skill is invoked** section — matching Winston's startup-batch shape (Batch 1: git context + reference files; Batch 2: plan lookup + state-file detection + architect manifest read).
   - **Workflow at a glance** — name the 8 phases (init → scan → present → discuss → draft → review → commit → continue) and cite the step files (`.prism/skills/prism-theo/step-01-init.md` through `step-08-continue.md`) — do not restate step content.
   - **Output** section — architect docs in `.prism/architect/<topic>.md`; paired dev docs in `docs/content/dev/architecture/<topic>.md` per ADR-0038 gates; state file at `.prism/theo-state.json`.
   - **Paired dev doc gates** subsection — cite ADR-0038 (`.prism/spec/adrs/0038-paired-dev-doc-gates.md`) for the two gates (category-fit + pairing-value). Do not restate the gates.
   - **When to write an ADR vs architect doc** subsection — cite the triple-gated ADR criterion from Phase 1.5e (`.prism/references/triple-gated-adr-criterion.md` once that file lands; until then cite the roadmap reference at § Phase 1.5e). Do not restate.
   - **State file management** subsection — link to `.prism/skills/prism-theo/lib/state.md` (PR-2.5.3 creates this); name the atomic-write protocol at a sentence ("write to `.prism/theo-state.json.tmp`, then rename") and defer detail to the lib doc.
   - **Atlas integration** subsection — names the `<!-- atlas:specializes-in -->` HTML comment anchor as the deterministic insertion point for per-team walking priorities. One paragraph; explain that Atlas (Phase 2) fills the anchor with team-specific walking guidance during onboarding, and Theo reads whatever Atlas wrote.
   - **Outside Theo's scope** section — bullets: Clove's implementation work, Ren's refactor evaluations, Winston's plan-mode evaluations, Atlas's onboarding configuration.
   - **Definition of Done** checklist — every candidate has a load-bearing reason + suggested shape; every committed file has a state-file entry; every paired dev doc passes ADR-0038's two gates; no architect doc is written without user-explicit "write" decision.
   - **Lessons Check** section — matches Winston's shape; ask whether the session warrants an entry in `.prism/lessons.md`.

   Verification: file exists and includes every section listed above. Content-only — no build effect until task 6.

4. **Write `.ai-skills/skills/prism-theo/claude.md`** — Claude-platform overrides. Content: tool routing (use Read/Edit/Write/Bash from Claude's native toolset); step file loading via Read tool; long-running session resume offer ("on startup, if `.prism/theo-state.json` exists and `currentPhase` is not `idle`, offer to resume from that phase"); atomic state writes (write to `.prism/theo-state.json.tmp`, then move; never write directly to the canonical path). 30–60 lines. Sequence: after task 3.

5. **Write stub `.ai-skills/skills/prism-theo/codex.md` and `.ai-skills/skills/prism-theo/cursor.md`** — both files identical content noting Theo behaves identically on these platforms; one short paragraph each pointing readers at `shared.md` for behavior and `claude.md` for the Claude-specific tool routing reference. Sequence: after task 3.

6. **Run `pnpm prism:build`** to regenerate platform mirrors. Verification: build exits 0; `.claude/skills/prism-theo/SKILL.md` exists; the new file matches the shape of other generated SKILL.md files (frontmatter + concatenated body). Sequence: after tasks 2–5.

### PR-2.5.2 — Step files for the workflow phases

**Branch:** `hmcgrew/prism-2.5.2-theo-step-files`
**Depends on:** PR-2.5.1 (step files reference scaffold's frontmatter), Phase 1.5e (cites micro-file step machine reference doc).
**Blocks:** PR-2.5.3 (state schema is consumed by step files).
**Parallel-safe with:** none within Phase 2.5.
**Verification:** `pnpm prism:build && pnpm prism:check`.

Step files live in `.prism/skills/prism-theo/` and are referenced from the canonical `shared.md` (PR-2.5.1 task 3). Each step file is 30–100 lines and follows the micro-file step machine pattern from Phase 1.5e — one workflow phase per file, no monolithic SKILL.md.

#### Clove (implementation)

7. **Write `.prism/skills/prism-theo/step-01-init.md`** — phase 1, init. Content:
   - Read `.prism/theo-state.json` if it exists; if not, treat as fresh start.
   - On fresh start: prompt user for the target directory to walk ("Where would you like me to start? Default is the repo root.").
   - On resume detection (state file exists and `currentPhase != "idle"`): present a resume offer ("I see we paused at phase `<phase>` last <timestamp>. Resume from there, or start fresh?"). On resume, jump to the phase named in `currentPhase`.
   - On fresh start, write initial state with `currentPhase: "exploring"`, empty arrays for `stepsCompleted`, `visitedPaths`, `candidates`, and the current timestamp.
   - Append `step-01-init` to `stepsCompleted`.
   Sequence: standalone within PR-2.5.2; blocks task 14 (commit step depends on this writing initial state).

8. **Write `.prism/skills/prism-theo/step-02-scan.md`** — phase 2, scan. Content:
   - Walk the target directory using Bash (`find <dir> -type f -name '*.ts' -o -name '*.tsx' -o -name '*.php' -o -name '*.py'` etc. — match common code extensions, skip `node_modules`, `vendor`, `.git`, `dist`, `build`).
   - Apply the Deletion Test in cartographic mode: for each cluster of files, ask "if I deleted this module/pattern/abstraction, where does the complexity reappear?" — naming shape, not grading quality (that's Ren's lane).
   - Look for the four candidate signals (each is a separate scanning pass; document them as a checklist in the step file):
     - Multi-file coupling — when the same concept is touched across 3+ files with no doc explaining the shape.
     - Load-bearing single files — when one file's structure dictates how callers shape their input.
     - Surprising patterns — when the implementation contradicts what a reader would assume from the names.
     - Constraints — when a comment or test enforces a non-obvious rule.
   - For each candidate, allocate a UUID (use `crypto.randomUUID()` equivalent), stage it in state under `candidates[]` with `status: "pending"`, populate `topic`, `files`, `loadBearingReason`, `suggestedShape`, `pairedDevDoc` (boolean — apply ADR-0038 gates), and `createdAt`.
   - Update state's `currentPhase` to `"presenting"` and `visitedPaths` with the directory just walked.
   - Append `step-02-scan` to `stepsCompleted`.
   Sequence: after task 7; blocks task 9.

9. **Write `.prism/skills/prism-theo/step-03-present.md`** — phase 3, present. Content:
   - Iterate pending candidates (status `"pending"`); for each one, present:
     - Topic name (one line)
     - Affected files (bulleted list)
     - Load-bearing reason (one paragraph — why this is worth documenting)
     - Suggested shape (architect doc / paired dev doc verdict per ADR-0038 / ADR — cite the triple-gated criterion when ADR is the verdict)
     - One-line preview of what the doc would say
   - Prompt user with four explicit options: `discuss` / `write` / `skip` / `defer`.
   - Do not advance to the next candidate until the user has chosen one option.
   - Update state's `currentPhase` to `"presenting"` on entry; do not change phase here (next phase determined by user choice in step-04).
   Sequence: after task 8; blocks task 10.

10. **Write `.prism/skills/prism-theo/step-04-discuss.md`** — phase 4, discuss/route. Content:
    - Branch on the user's choice from step-03:
      - `discuss` — provide deeper context for the candidate: cite the files involved, walk the reader through the load-bearing reason, surface the deletion-test answer that flagged this. After discussion, loop back to step-03 for write/skip/defer choice.
      - `write` — set candidate `status: "drafting"`, advance to step-05.
      - `skip` — set candidate `status: "skipped"`, record `decidedAt`, advance to next pending candidate (back to step-03).
      - `defer` — set candidate `status: "deferred"`, record `decidedAt`, advance to next pending candidate. Deferred candidates resurface only on explicit user prompt in step-08.
    - Append `step-04-discuss` to `stepsCompleted` per candidate decided.
    Sequence: after task 9; blocks task 11.

11. **Write `.prism/skills/prism-theo/step-05-draft.md`** — phase 5, draft. Content:
    - Draft architect doc content against the four-beat arc from `.prism/architect/architecture-doc-shape.md` (cite the doc; do not restate the four beats here).
    - Conditionally draft a paired dev doc when ADR-0038's two gates pass (category-fit + pairing-value); do not draft the paired doc when either gate fails — record the gate verdict in the candidate's `pairedDevDoc` field and surface it to the user in step-06.
    - Drafts live in working memory at this phase — do not write to disk until step-07. The drafts are presented to the user inline in step-06 for review.
    - Update state's `currentPhase` to `"grilling"` (review/iteration loop is upcoming).
    Sequence: after task 10; blocks task 12.

12. **Write `.prism/skills/prism-theo/step-06-review.md`** — phase 6, review. Content:
    - Present the drafted architect doc (and paired dev doc if drafted) inline in chat.
    - Prompt user with three options: `accept` / `iterate` / `discard`.
    - On `iterate`: ask the user what to change, redraft against feedback, loop back to step-06.
    - On `accept`: advance to step-07.
    - On `discard`: set candidate `status: "skipped"`, record `decidedAt` with a reason field ("discarded after review"), advance to next pending candidate (step-03).
    Sequence: after task 11; blocks task 13.

13. **Write `.prism/skills/prism-theo/step-07-commit.md`** — phase 7, commit. Content:
    - Write the architect doc to `.prism/architect/<topic>.md` using the Write tool.
    - Write the paired dev doc to `docs/content/dev/architecture/<topic>.md` if drafted.
    - Cross-link both files: architect doc has a closing "Paired dev doc: `docs/content/dev/architecture/<topic>.md`" line; dev doc has a closing "Agent-facing spec: `.prism/architect/<topic>.md`" line.
    - Update `.prism/architect/manifest.json` with a new entry routing the new architect doc to relevant file patterns (the topic determines patterns; the candidate's `files` field is the starting list).
    - Update state file via atomic tmp-then-rename: serialize the updated state JSON, write to `.prism/theo-state.json.tmp`, then `mv .prism/theo-state.json.tmp .prism/theo-state.json`.
    - Set candidate `status: "committed"`, record `decidedAt`.
    Sequence: after task 12; blocks task 14.

14. **Write `.prism/skills/prism-theo/step-08-continue.md`** — phase 8, continue. Content:
    - Count pending candidates remaining (status `"pending"`).
    - If pending candidates remain, prompt user: `continue` (back to step-03 for next candidate) / `revisit-deferred` (re-present any candidate with status `"deferred"`) / `pause` (set `currentPhase: "idle"`, append `step-08-continue` to `stepsCompleted`, close session).
    - If no pending candidates remain but deferred candidates exist, prompt user: `revisit-deferred` / `pause` / `finish` (set `currentPhase: "idle"`, mark walk complete).
    - If no pending and no deferred, prompt user: `finish` (close cleanly) or `walk-new-directory` (prompt for new directory, jump back to step-01).
    Sequence: after task 13; closes the loop.

### PR-2.5.3 — State file management + resume detection

**Branch:** `hmcgrew/prism-2.5.3-theo-state-mgmt`
**Depends on:** PR-2.5.2 (state schema consumed by step files).
**Blocks:** none within Phase 2.5.
**Parallel-safe with:** PR-2.5.4 (state file work and ADR + dev doc touch different files; can run concurrently or in either order).
**Verification:** `pnpm prism:build && pnpm prism:check`.

#### Clove (implementation)

15. **Write `.prism/skills/prism-theo/lib/state.md`** — reference doc for state file read/write/mutate protocol. Required content:
    - JSON schema definition (verbatim, in a code block):
      ```json
      {
        "version": 1,
        "lastUpdated": "<ISO 8601 timestamp>",
        "currentPhase": "exploring | presenting | grilling | idle",
        "stepsCompleted": ["<step-id>", "..."],
        "visitedPaths": [{"path": "<relative path>", "visitedAt": "<ISO 8601>"}],
        "candidates": [
          {
            "id": "<UUID>",
            "topic": "<short topic name>",
            "files": ["<relative path>", "..."],
            "status": "pending | drafting | committed | skipped | deferred",
            "loadBearingReason": "<one paragraph>",
            "suggestedShape": "architect-doc | paired-dev-doc | adr",
            "pairedDevDoc": true/false,
            "createdAt": "<ISO 8601>",
            "decidedAt": "<ISO 8601 | null>"
          }
        ]
      }
      ```
    - Read protocol — open file at `.prism/theo-state.json`, parse as JSON, return parsed object. If file missing, return null. If parse fails, surface the error to the user and ask whether to start fresh.
    - Write protocol — serialize updated state to JSON (2-space indent), write to `.prism/theo-state.json.tmp`, then `mv .prism/theo-state.json.tmp .prism/theo-state.json`. Never write directly to the canonical path — partial writes during interruption corrupt resumability.
    - Mutate protocol — read → mutate in-memory copy → write back atomically. Always update `lastUpdated` to current ISO 8601 timestamp.
    - Resume detection logic — if state file exists and `currentPhase` is one of `exploring`, `presenting`, `grilling`, treat as resumable; if `currentPhase == "idle"`, treat as completed (offer fresh start instead of resume).
    Sequence: blocks task 16.

16. **Add `## State Schema` section to `.ai-skills/skills/prism-theo/shared.md`** — cite the lib doc at `.prism/skills/prism-theo/lib/state.md` rather than restating the schema. One paragraph; one link. Sequence: after task 15; verification — `pnpm prism:build` succeeds and the generated SKILL.md includes the new section.

17. **Add resume-detection logic to `.prism/skills/prism-theo/step-01-init.md`** — extend task 7's step file with explicit resume-detection branching that points at the lib doc's resume-detection logic (don't restate; cite). Sequence: after task 15.

18. **Update `.gitignore`** at repo root — add two lines:
    ```
    .prism/theo-state.json
    .prism/theo-state.json.tmp
    ```
    Sequence: standalone within PR-2.5.3. Verification: `git status` shows no untracked theo-state files after the next Theo invocation.

19. **Write state-file scenario test at `.prism/skills/prism-theo/lib/state-test.md`** — markdown-format test scenarios (not executable code; agent-readable). Required scenarios:
    - Fresh start (no state file) → initial state written successfully.
    - Resume from `exploring` phase → jumps to step-02-scan with prior `visitedPaths` preserved.
    - Resume from `presenting` phase → jumps to step-03-present with `candidates` array intact.
    - Resume from `grilling` phase → jumps to step-06-review with current candidate's draft regenerated.
    - Interrupted state write (tmp file present, canonical file present) → canonical file is read; tmp file is ignored and overwritten next write.
    - Interrupted state write (tmp file present, canonical file absent) → treat as fresh start; warn user that state may have been corrupted.
    - Parse failure on existing state file → surface error; offer fresh-start fallback.
    Sequence: after task 15.

### PR-2.5.4 — ADR-0041 + paired dev doc

**Branch:** `hmcgrew/prism-2.5.4-theo-adr-dev-doc`
**Depends on:** PR-2.5.1 (ADR documents the persona shape established in scaffold).
**Blocks:** none — conventionally lands last in Phase 2.5 so the ADR codifies the shape after 2.5.1–2.5.3 establish it.
**Parallel-safe with:** PR-2.5.3 (different files; can run concurrently).
**Verification:** `pnpm prism:check` (ADR linter validates byte-parity dual-write).

#### Clove (implementation)

20. **Write ADR-0041 at `.prism/spec/adrs/0041-theo-architect-doc-walker.md`** — required sections in ADR format:
    - **Status:** Accepted
    - **Date:** 2026-05-22
    - **Context:** Phase 2 ships Atlas as a one-shot configurator (runs once per team install or on stack change). Ongoing codebase mapping is a different workflow — iterative, resumable, proactive — and PRISM needs a persona for that work. The roadmap at `.prism/plans/roadmap.md` § Phase 2.5 names Theo as the architect-doc walker.
    - **Decision:** Theo is a separate persona from Atlas, not a mode of Atlas. Theo walks the codebase iteratively, surfaces load-bearing decisions worth documenting, drafts architect docs (and paired dev docs per ADR-0038), and resumes across sessions via a state file.
    - **Rationale:** Different posture (Atlas is one-shot configurator; Theo is proactive walker). Different shape (Atlas is single-turn onboarding; Theo is multi-phase 8-step machine). Different cognitive posture (Atlas asks what the team has; Theo names what the team's code is telling him).
    - **Alternatives considered:**
      - **Atlas mode.** Rejected — Atlas runs once per install; folding ongoing walking into Atlas would force every Atlas invocation to ask "are we onboarding or walking?" and that ambiguity dilutes both jobs.
      - **Winston mode.** Rejected — Winston is reactive (evaluates proposed approaches); Theo is proactive (goes hunting for candidates). Same domain, different posture. Cleaner to keep them separate.
      - **Shared utility with Ren.** Rejected for v1 — Ren and Theo share the codebase-walking mechanic but have different intents (Theo documents what's load-bearing; Ren spots what's structurally weak). The state files and output types differ enough that shared abstraction would be premature. Revisit after both ship.
    - **Consequences:** Theo's state file (`.prism/theo-state.json`) is independent of Ren's (`.prism/ren-state.json`). Ren (Phase 2.6) will follow the same step-machine pattern Theo establishes here. PRISM gains a reference implementation of the micro-file step machine pattern (from Phase 1.5e absorption); future persona authors can model on it.
    Sequence: blocks task 21.

21. **Mirror ADR-0041** to `templates/install/.prism/spec/adrs/0041-theo-architect-doc-walker.md` — byte-identical copy. Verification: `diff .prism/spec/adrs/0041-theo-architect-doc-walker.md templates/install/.prism/spec/adrs/0041-theo-architect-doc-walker.md` returns empty. Sequence: after task 20.

#### Eli (documentation)

22. **Write paired dev doc at `docs/content/dev/ai-skills/theo.md`** — human-readable narrative version of Theo's behavior. Required structure:
    - YAML frontmatter:
      ```yaml
      ---
      title: "Theo — the architect-doc walker"
      description: "How Theo finds load-bearing decisions in your codebase and proposes them as architect docs."
      category: "ai-skills"
      audience: "dev"
      last_updated: "2026-05-22"
      ---
      ```
    - **What Theo does** — plain-English walkthrough of the 8 phases. No micro-file step references; speak in narrative. Roughly: "Theo opens by orienting — asks where to walk. He explores the directory you point him at, naming what he sees instead of grading it. For each load-bearing decision he finds, he presents it to you with a reason and a suggested shape — then asks whether to write it up, skip it, or set it aside for later. If you say write, he drafts the doc, hands it to you for review, iterates if you want changes, and commits when you accept. He tracks where he's been so you can pause mid-walk and resume next session."
    - **When to use Theo** — three scenarios:
      - Post-Atlas onboarding — after Atlas has configured the team, Theo's the first ongoing skill to invoke; he turns Atlas's stub anchors into real architect docs.
      - Periodic audit — every few cycles, walk a feature area to surface decisions that were implicit and should become explicit.
      - Pre-refactor — before Ren goes hunting for refactor candidates, Theo maps what's load-bearing so Ren knows what's intentional vs. what's accidental complexity.
    - **How Theo works** — interaction shape only; no micro-file step detail. Cite the reference doc at `.prism/skills/prism-theo/lib/state.md` for implementation detail.
    - **Output** — describes the two file types Theo produces (architect docs, paired dev docs) and the state file. Cross-link to the architect-doc shape doc at `.prism/architect/architecture-doc-shape.md`.
    - **Composition table** comparing the four codebase-touching personas:
      | Persona | Posture | Shape | Output |
      | --- | --- | --- | --- |
      | Atlas | One-shot configurator | Single-turn onboarding | `.prism/config.json`, per-team rules |
      | Theo | Proactive walker | Multi-phase, resumable | Architect docs + paired dev docs |
      | Winston | Reactive evaluator | Per-ticket | `## Implementation Tasks`, `## Decisions` |
      | Ren | Proactive scout | Multi-phase, resumable | Refactor plans |
    - **Trigger phrases** — list the same trigger phrases from frontmatter.yml task 2 so users know how to invoke Theo by intent, not just by name.
    - **Related docs** — cross-link ADR-0041, the architect-doc shape doc, ADR-0038 (paired dev doc gates), and the Phase 2.5 roadmap entry.
    Sequence: after task 20; blocks task 24.

23. **Cross-link ADR-0041 and dev doc both ways.** Edit ADR-0041 (`.prism/spec/adrs/0041-theo-architect-doc-walker.md`) to add a "See also" link at the bottom pointing at `docs/content/dev/ai-skills/theo.md`. Edit the dev doc to add the reverse link to the ADR in the Related docs section. Sequence: after tasks 20 and 22.

24. **Update docs index with Theo row.** Add a row for Theo in the AI skills section of the docs index (the team's docs README or `docs/content/dev/ai-skills/README.md` — whichever the team uses; check the existing entries for Winston, Pixel, etc., to match shape). One line: name + one-sentence description + link. Sequence: after task 22.

25. **Verify cross-links resolve.** Open both files (`docs/content/dev/ai-skills/theo.md` and `.prism/spec/adrs/0041-theo-architect-doc-walker.md`); confirm the links land on the right anchors and the related-docs sections include each other. Content-only — no build effect. Sequence: after task 23.

---

## Decisions

- **Theo is a separate persona from Atlas, not a mode.**
  - **Root cause:** Atlas is a one-shot configurator; ongoing codebase mapping is a fundamentally different workflow — iterative, resumable, proactive.
  - **Alternatives considered:** Atlas mode (rejected — dilutes onboarding); Winston mode (rejected — different posture, reactive vs proactive); shared utility with Ren (rejected for v1 — premature abstraction; revisit after both ship).
  - **Chosen approach:** Standalone persona with own state file, own skill directory, own ADR. Composes well with Atlas (post-onboarding) and Ren (parallel-safe).
  - **Implementation guidance:** Theo's skill directory is `.ai-skills/skills/prism-theo/`; state file is `.prism/theo-state.json`; ADR is `.prism/spec/adrs/0041-theo-architect-doc-walker.md`.
  - → promoted to ADR-0041 (authored during this epic)
  - **Zoe verdict (2026-06-05):** `archive-candidate` — Theo shipped — `.ai-skills/skills/prism-doc-walker/`, ADR-0041, `docs/content/dev/ai-skills/theo.md` all exist; plan never closed.

- **Theo uses the micro-file step machine pattern, not a monolithic SKILL.md.**
  - **Root cause:** 8 workflow phases × monolithic SKILL.md = the model loads every phase's instructions even when it only needs one. Wasteful and obscures the active step.
  - **Alternatives considered:** Single monolithic SKILL.md (rejected — pure waste during phases that don't need other phases' instructions); single SKILL.md with conditional includes (rejected — adds complexity without solving the load problem).
  - **Chosen approach:** Per-phase step files at `.prism/skills/prism-theo/step-01-init.md` through `step-08-continue.md`, each 30–100 lines. The canonical `shared.md` cites the step files rather than restating them.
  - **Implementation guidance:** Follow the pattern from Phase 1.5e (BMAD's `bmad-create-architecture` reference); each step file is a single workflow phase with clear entry/exit conditions named in the file.
  - → no promotion needed (instance of `.prism/references/micro-file-step-machine.md`; the skill's structure is the record)
  - **Zoe verdict (2026-06-05):** `archive-candidate` — Theo shipped — `.ai-skills/skills/prism-doc-walker/`, ADR-0041, `docs/content/dev/ai-skills/theo.md` all exist; plan never closed.

- **State file uses JSON, not YAML.**
  - **Root cause:** State file gets written and read atomically across sessions; format must be reliably parseable without significant-whitespace gotchas.
  - **Alternatives considered:** YAML (rejected — significant whitespace risk during atomic writes; no expressiveness benefit for this schema).
  - **Chosen approach:** JSON with 2-space indent; atomic write via tmp-then-rename pattern.
  - **Implementation guidance:** See `.prism/skills/prism-theo/lib/state.md` for the schema and write protocol.
  - → no promotion needed (codified in the skill's `lib/state.md`; `lazy-artifacts.md` cites Theo's state file as the canonical atomic-write pattern)
  - **Zoe verdict (2026-06-05):** `archive-candidate` — Theo shipped — `.ai-skills/skills/prism-doc-walker/`, ADR-0041, `docs/content/dev/ai-skills/theo.md` all exist; plan never closed.

- **Theo writes architect docs vs. ADRs against the triple-gated criterion.**
  - **Root cause:** Architect docs document patterns and conventions; ADRs document decisions. Confusing the two leads to ADRs that read like reference material and architect docs that read like committee minutes.
  - **Alternatives considered:** Theo writes only architect docs and lets Winston decide ADR status (rejected — Winston isn't in the walking loop; Theo has the candidate's context fresh); Theo writes both indiscriminately (rejected — produces ADR sprawl).
  - **Chosen approach:** Apply the triple-gated criterion from Phase 1.5e — a candidate becomes an ADR when (1) it's hard to reverse, (2) it's surprising to a new reader, AND (3) there was a genuine tradeoff. Otherwise it's an architect doc.
  - **Implementation guidance:** Step-05-draft.md branches the draft format on the suggested-shape field; suggestedShape is set in step-02-scan.md when the candidate is allocated.
  - → no promotion needed (the skill cites `.prism/references/triple-gated-adr-criterion.md`; the citation is the codification)
  - **Zoe verdict (2026-06-05):** `archive-candidate` — Theo shipped — `.ai-skills/skills/prism-doc-walker/`, ADR-0041, `docs/content/dev/ai-skills/theo.md` all exist; plan never closed.

- **Atlas integration uses an HTML comment anchor, not fuzzy text matching.**
  - **Root cause:** Per-team walking priorities need a deterministic insertion point in Theo's persona body; fuzzy text matching breaks when the surrounding prose drifts.
  - **Alternatives considered:** Fuzzy text matching (rejected — fragile); separate per-team file Theo reads at startup (rejected — adds another file to track; anchor pattern is already established for Atlas in other personas).
  - **Chosen approach:** `<!-- atlas:specializes-in -->` HTML comment anchor in `shared.md`; Atlas inserts team-specific walking guidance at that exact location during Phase 2 onboarding.
  - **Implementation guidance:** Place the anchor in `shared.md`'s "When this skill is invoked" or a dedicated subsection — match the placement Atlas uses in other personas (verify against Phase 2 work once Atlas lands).
  - → no promotion needed (instance of the anchor-substitution convention in `.prism/architect/anchor-substitution.md`)
  - **Zoe verdict (2026-06-05):** `archive-candidate` — Theo shipped — `.ai-skills/skills/prism-doc-walker/`, ADR-0041, `docs/content/dev/ai-skills/theo.md` all exist; plan never closed.

- **Paired-dev-doc decisions apply ADR-0038's two gates verbatim.**
  - **Root cause:** ADR-0038 already defines when a paired dev doc belongs alongside an architect doc; Theo shouldn't invent his own criteria and drift from the rest of PRISM.
  - **Alternatives considered:** Theo defines his own gates (rejected — divergence drift); Theo skips paired dev docs entirely (rejected — defeats one of the persona's primary outputs).
  - **Chosen approach:** Cite ADR-0038 in shared.md; apply the two gates (category-fit + pairing-value) in step-02-scan.md when allocating the candidate's `pairedDevDoc` field.
  - **Implementation guidance:** Do not restate the gates in Theo's persona body; cite ADR-0038 (`.prism/spec/adrs/0038-paired-dev-doc-gates.md`). Per the cite-don't-restate rule in `.prism/rules/implementation-task-detail.md`.
  - → no promotion needed (ADR-0038 owns the gates; note ADR-0038's supersession is pending via the docs-overhaul Epic A)
  - **Zoe verdict (2026-06-05):** `archive-candidate` — Theo shipped — `.ai-skills/skills/prism-doc-walker/`, ADR-0041, `docs/content/dev/ai-skills/theo.md` all exist; plan never closed.

- **Theo's scope is cartographic, not evaluative.**
  - **Root cause:** Ren (Phase 2.6) covers the evaluative side (grading structural quality); overlap between Theo and Ren would muddle both personas and produce conflicting recommendations.
  - **Alternatives considered:** Theo grades quality too (rejected — duplicates Ren's job; one persona can't be both cartographer and critic without diluting both roles).
  - **Chosen approach:** Theo names shape; Ren grades quality. Surface the boundary explicitly in Theo's Cognitive Approach section.
  - **Implementation guidance:** When Theo encounters a candidate that's structurally weak (Ren's lane), he notes it as a candidate worth documenting (because the weakness is itself a load-bearing fact) but does not propose a refactor — that's Ren's output type, not Theo's.
  - → no promotion needed (the Theo/Ren boundary is codified in ADR-0041/ADR-0042 and both skills' cognitive-approach sections)
  - **Zoe verdict (2026-06-05):** `archive-candidate` — Theo shipped — `.ai-skills/skills/prism-doc-walker/`, ADR-0041, `docs/content/dev/ai-skills/theo.md` all exist; plan never closed.

---

## History

- 2026-05-22 [main]: Plan created. Outlines four sub-PRs (scaffold + skill source, step files, state-file management, ADR + paired dev doc) for shipping Theo as Phase 2.5 of PRISM. Theo is the second proactive codebase-walking persona (after the Phase 1.5e patterns land) and the first reference implementation of the micro-file step machine pattern absorbed in Phase 1.5e.
- 2026-06-05 [hmcgrew/prism-audit-2026-06-05]: Plan closed retroactively per the 2026-06-05 audit close-out — implementation shipped by 2026-05-27 (`prism-doc-walker` skill, ADR-0041, `theo.md` dev doc) but History was not maintained during implementation. Verdict gate run on all 7 Decisions; ADR-0041 promotion recorded, rest codified in references/architect docs. See `.prism/plans/audit-2026-06-05-closeout.md`.

---

## Debugged Issues

None at plan-creation. Add entries here when bugs are discovered during implementation.

---

## Review Issues

None at plan-creation. Add entries here during self-review (Briar) and PR review (Eric).

---

## Acceptance Criteria

### Behavioral

- [ ] Given a fresh Theo invocation with no existing state file, When the user names a directory to walk, Then Theo walks that directory and presents at least one candidate with topic, files, load-bearing reason, and suggested shape.
- [ ] Given a candidate presented by Theo, When the user responds "write", Then Theo drafts the architect doc against the four-beat arc and presents the draft for review before writing to disk.
- [ ] Given a candidate presented by Theo, When the user responds "skip", Then Theo marks the candidate as skipped and advances to the next pending candidate without writing any files.
- [ ] Given a candidate presented by Theo, When the user responds "defer", Then Theo marks the candidate as deferred and resurfaces it only when the user explicitly prompts to revisit deferred candidates in step-08.
- [ ] Given a candidate that passes ADR-0038's two gates (category-fit + pairing-value), When the user accepts the draft in step-06, Then Theo writes both the architect doc and a paired dev doc and cross-links them.
- [ ] Given a candidate that fails ADR-0038's gates, When the user accepts the draft, Then Theo writes only the architect doc and surfaces the gate verdict to the user.
- [ ] Given an active Theo session that the user pauses mid-walk, When the user invokes Theo in a subsequent session, Then Theo detects the existing state file and offers to resume from the paused phase.
- [ ] Given a state write that was interrupted (tmp file present, canonical file present), When Theo reads state on resume, Then the canonical file's prior state is intact and the tmp file is ignored.
- [ ] Given a candidate matching the triple-gated ADR criterion (hard-to-reverse + surprising + genuine tradeoff), When Theo determines suggested shape in step-02-scan, Then the suggestedShape is set to `adr` or to both architect-doc and ADR — never to architect-doc alone.
- [ ] Given a draft presented in step-06 review, When the user responds "discard", Then the candidate is marked as skipped with a reason field "discarded after review" and no files are written to disk.

### Non-behavioral

- [ ] Skill canonical directory `.ai-skills/skills/prism-theo/` contains the five canonical files: `frontmatter.yml`, `shared.md`, `claude.md`, `codex.md`, `cursor.md`.
- [ ] All 8 step files exist at `.prism/skills/prism-theo/step-01-init.md` through `step-08-continue.md`, plus `lib/state.md` and `lib/state-test.md`.
- [ ] ADR-0041 exists at both `.prism/spec/adrs/0041-theo-architect-doc-walker.md` and `templates/install/.prism/spec/adrs/0041-theo-architect-doc-walker.md` byte-identical.
- [ ] Paired dev doc exists at `docs/content/dev/ai-skills/theo.md` with valid YAML frontmatter (all required fields present).
- [ ] `.gitignore` includes `.prism/theo-state.json` and `.prism/theo-state.json.tmp`.
- [ ] Canonical `shared.md` contains the `<!-- atlas:specializes-in -->` HTML comment anchor for Atlas integration.
- [ ] Persona body in `shared.md` cites (does not restate) the four-beat arc, the Two-Reader Model, ADR-0038's gates, and the triple-gated ADR criterion — per the cite-don't-restate rule in `.prism/rules/implementation-task-detail.md`.
- [ ] Each step file is between 30 and 100 lines (count via `wc -l`).
- [ ] All implementation tasks in this plan meet the detail bar in `.prism/rules/implementation-task-detail.md` (file path, specific change, verification command, sequence dependency).

### AC Adjustments

### AC Sync Log

| Date | Agent | Action | Plan | Linear |
| ---- | ----- | ------ | ---- | ------ |
| 2026-05-22 | Winston | Generated AC | updated | N/A — no Linear ticket |

---

## Cleanup Items

None at plan-creation.

---

## PR Readiness

Living checklist — updated every time `code-review-self` runs. Reflects current state across the four sub-PRs.

- [ ] No critical or major issues
- [ ] Types correct — no `any`, no unsafe `as`
- [ ] No stray console.logs or debug artifacts
- [ ] Tests written for new logic and edge cases (state-file scenario tests at minimum)
- [ ] All debugged issues resolved (no `open` entries)
- [ ] Build passes — `pnpm prism:build` succeeds and generates all platform mirrors
- [ ] PR description up to date for each sub-PR
- [ ] Lasting decisions promoted to architect context (Atlas integration anchor pattern, micro-file step machine reference implementation)

**Last updated:** 2026-05-22

---

## Dependencies and Sequencing Notes

**Blocks on:**

- **Phase 2 (Atlas)** — for stub-anchor population. Theo's `<!-- atlas:specializes-in -->` anchor needs Atlas to be the writer that fills it; without Atlas, the anchor is decorative until Phase 2 lands. Theo can ship before Atlas populates the anchor — the anchor is a no-op when empty — but the integration story isn't complete until Atlas writes to it.
- **Phase 1.5e (Pattern absorptions)** — for the micro-file step machine pattern, the Deletion Test heuristic, the triple-gated ADR criterion, and the paired-dev-doc gates ADR (ADR-0038). Theo cites all four; the citations are dead links until 1.5e ships. Sequence Phase 2.5 after 1.5e to keep the citations live.

**Parallel-safe with:**

- **Phase 2.6 (Ren — refactor scout)** — touches different state file (`.prism/ren-state.json` vs `.prism/theo-state.json`), produces different output type (refactor plans vs architect docs), and lives in a different skill directory (`.ai-skills/skills/prism-ren/` vs `.ai-skills/skills/prism-theo/`). The two personas share the codebase-walking mechanic but no code; they can ship in either order or in parallel.
- **Phase 3 (Parker — PRD persona)** — touches different state surfaces (PRD workspace folder vs walker state file) and different output types (PRDs vs architect docs). Parallel-safe.

**Sub-PR sequencing within Phase 2.5:**

```
PR-2.5.1 (scaffold + skill source)
   └─> PR-2.5.2 (step files)
        └─> PR-2.5.3 (state file + resume detection)
              └─> PR-2.5.4 (ADR-0041 + paired dev doc)
```

PR-2.5.4 is parallel-safe with PR-2.5.3 (the ADR doesn't depend on the state file implementation), but conventionally lands last so that the ADR can reference the implementation as a working reference.
