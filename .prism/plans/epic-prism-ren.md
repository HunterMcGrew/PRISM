# Plan: epic-prism-ren

## Ticket

PRISM Phase 2.6 — Ren (refactor scout persona). No parent Linear ticket; this is an internal PRISM phase tracked via the roadmap at `.prism/plans/roadmap.md`.

## Goal

Introduce Ren — a proactive refactor-scout persona that walks the consumer's codebase, ranks refactor candidates by deletion-test strength, and drops into an interactive grilling loop on the chosen one, producing a refactor plan at `.prism/plans/refactor-<slug>.md` that Winston or Clove can pick up.

---

## User Stories

- As a PRISM consumer, I want a persona proactively scouting my codebase for refactor opportunities, so that I can surface structural debt without first naming what's wrong.
- As a PRISM consumer, I want candidates ranked by deletion-test strength, so that I can focus attention on Strong candidates first rather than wading through speculative noise.
- As a PRISM consumer, I want a grilling loop on the picked candidate (not committed until Ren walks the design tree), so that the refactor plan reflects real reasoning rather than a first-pass hunch.
- As a PRISM consumer, I want the output as a plan file at `.prism/plans/refactor-<slug>.md`, so that Winston or Clove can pick it up like any other ticket rather than asking me to hand-translate an HTML report.
- As a PRISM consumer, I want a resumable walk across sessions, so that I can pause exploration mid-codebase and pick up later without losing visited paths or pending candidates.

---

## Design

Not applicable — Ren is a chat-driven persona with no UI surface. Step files and shared.md carry the interaction shape; Pixel is not involved.

---

## Implementation Tasks

Tasks are grouped by sub-PR. Four sub-PRs (PR-2.6.1 through PR-2.6.4). Every task hits the detail bar per `.prism/rules/implementation-task-detail.md` — front-loaded file paths, exact changes, verification commands, and sequence dependencies.

### PR-2.6.1 — Ren scaffold + skill source

**Branch:** `hmcgrew/prism-2.6.1-ren-scaffold`
**Depends on:** Phase 2 (Atlas) — Ren's `<!-- atlas:specializes-in -->` anchor needs Atlas to exist for population.
**Blocks:** PR-2.6.2 (step files reference scaffold).
**Parallel-safe with:** none within Phase 2.6 — scaffold lands first.
**Verification:** `pnpm prism:build && pnpm prism:check && pnpm prism:check-types && pnpm prism:test`.

#### Clove (implementation)

1. **Create canonical skill directory** at `.ai-skills/skills/prism-ren/`. Use `mkdir -p`. No file content yet — directory exists for tasks 2–5 to populate.
2. **Write frontmatter.yml** at `.ai-skills/skills/prism-ren/frontmatter.yml`. Full content:
   ```yaml
   name: prism-ren
   displayName: Ren
   description: |
     Ren — the refactor scout. Invoke this skill whenever the user mentions "Ren" in any context — including "Ren scout the codebase", "Ren what should we refactor", "hey Ren", "over to Ren", "bring in Ren", "ask Ren", "Ren's turn", or any sentence containing the name "Ren". Also triggers on refactor-discovery phrases: "find refactor candidates", "look for shallow modules", "look for leaky seams", "what's structurally weak in this codebase", "where's the dead weight", "what can we delete", or any request to proactively surface structural debt. Walks the codebase, ranks refactor candidates by deletion-test strength, grills the chosen candidate through five passes, and produces a refactor plan at `.prism/plans/refactor-<slug>.md` that Winston or Clove can pick up. Never modifies source code.
   pronouns: he/him
   ```
   Verification: `pnpm prism:build` after the rest of the skill source lands (task 6).
3. **Write shared.md** at `.ai-skills/skills/prism-ren/shared.md`. Sections in order:
   - Persona blurb — observant, exploratory, sharp-eyed for shallow abstractions and leaky seams; he/him. Note explicitly: "Different posture from Theo. Theo documents what's load-bearing; Ren spots what's NOT."
   - `## Intro` — greeting examples ("Ren here. Where should we start scouting — repo root, or a specific subtree?", "Ren reporting in. I'll take a pass and flag what looks structurally weak.").
   - `## When this skill is invoked` — startup batch: read git context, run plan lookup per `.prism/rules/branch-plan.md`, read architect manifest, read `.prism/ren-state.json` if it exists.
   - `## Workflow overview` — seven-step explore → categorize → present → pick → grill → plan → continue loop. Cite the step files at `.prism/skills/prism-ren/step-01-init.md` through `step-08-continue.md`. Do not restate step content — cite per `.prism/rules/implementation-task-detail.md` § Cite, don't restate.
   - `## Heuristics` — friction signals Ren looks for. Cite `.prism/rules/code-standards.md` § General ("three similar lines are better than one speculative helper") and Phase 1.5e patterns (two adapters = real seam, deletion test as primary heuristic). Include the anchor comment `<!-- atlas:specializes-in -->` at the end of this section so Atlas has a clean insertion point for per-team customization (WordPress block patterns, React RSC/client boundaries, Django ORM N+1, etc.).
   - `## State file schema` — single line citing `.prism/architect/ren-state.md` for the normative schema. Do not restate the JSON shape here.
   - `## Output` — refactor plan at `.prism/plans/refactor-<slug>.md`. Cite ADR-0042 for the rationale that this is a plan file, not an HTML report.
   - `## Definition of Done` — Ren has either produced a refactor plan, paused with state saved, or explicitly declined the candidate.
   - `## Lessons Check` — closing reminder that Ren never modifies consumer source code.
4. **Write claude.md** at `.ai-skills/skills/prism-ren/claude.md`. Content names the tool surface: Ren reads files with Read, walks directories with Glob and Grep, writes plans with Write. Ren does NOT use Edit on consumer source code — never modifies source. The only files Ren writes are `.prism/plans/refactor-<slug>.md` and `.prism/ren-state.json`.
5. **Write codex.md and cursor.md** at `.ai-skills/skills/prism-ren/codex.md` and `.ai-skills/skills/prism-ren/cursor.md`. Parallel structure to claude.md, swapping tool names for platform equivalents.
6. **Run `pnpm prism:build`** from repo root. Verification: build succeeds, generated skill mirrors land at `.claude/skills/prism-ren/`, `.codex/skills/prism-ren/`, `.cursor/skills/prism-ren/`.
7. **Register Ren in the available-skills index** if a manual index file exists (check `.prism/skills/index.md` or equivalent — if the build handles registration, skip this task and note that in `## History`).

#### Eli (documentation)

No docs in PR-2.6.1 — paired dev doc lands in PR-2.6.4.

---

### PR-2.6.2 — Step files for the workflow phases

**Branch:** `hmcgrew/prism-2.6.2-ren-step-files`
**Depends on:** PR-2.6.1 (step files reference scaffold's frontmatter), Phase 1.5e (cites micro-file step machine reference doc).
**Blocks:** PR-2.6.3 (state schema consumed by step files).
**Parallel-safe with:** none within Phase 2.6.
**Verification:** `pnpm prism:build && pnpm prism:check`.

#### Clove (implementation)

8. **Create step file directory** at `.prism/skills/prism-ren/`. Use `mkdir -p`.
9. **Write `step-01-init.md`** at `.prism/skills/prism-ren/step-01-init.md`. Frontmatter: `stepsCompleted: []`. Body covers: init state, detect resume (read `.prism/ren-state.json`, validate against schema in `.prism/architect/ren-state.md`, on schema mismatch refuse to proceed and prompt backup-or-abort), decide jump-to step based on `currentPhase` in state file.
10. **Write `step-02-explore.md`** at `.prism/skills/prism-ren/step-02-explore.md`. Frontmatter: `stepsCompleted: [step-01-init]`. Body: walk directory tree from user-provided root (or repo root default), use Glob and Grep to locate friction signals — shallow modules, leaky seams, untested interfaces, pass-through modules failing the deletion test, premature abstractions with one caller. Cite `.prism/rules/code-standards.md` for the underlying rule; do not restate.
11. **Write `step-03-categorize.md`** at `.prism/skills/prism-ren/step-03-categorize.md`. Frontmatter: `stepsCompleted: [step-01-init, step-02-explore]`. Body: apply strength badge taxonomy:
    - **Strong** — deletion test passes cleanly AND ≥2 call sites AND no missing test coverage AND clear refactor approach.
    - **Worth exploring** — 2–3 criteria met with one ambiguous.
    - **Speculative** — only one criterion met OR uncertain deletion test.
    Each candidate gets a `strength` field on its state entry.
12. **Write `step-04-present.md`** at `.prism/skills/prism-ren/step-04-present.md`. Frontmatter: `stepsCompleted: [step-01-init, step-02-explore, step-03-categorize]`. Body: present ranked candidates grouped by strength. Each candidate displays file path(s), one-line problem statement, suggested approach (collapse / extract / inline / move), and a before/after sketch in fenced ASCII when the shape change is visual. Cap at 10 candidates per round.
13. **Write `step-05-pick.md`** at `.prism/skills/prism-ren/step-05-pick.md`. Frontmatter: `stepsCompleted: [step-01-init, step-02-explore, step-03-categorize, step-04-present]`. Body: capture user choice. Supported inputs: pick number (e.g. "3"), `skip <n>` (mark status: skipped, do not re-present), `defer <n>` (mark status: deferred, may resurface in later session), `continue` (scan a new directory).
14. **Write `step-06-grill.md`** at `.prism/skills/prism-ren/step-06-grill.md`. Frontmatter: `stepsCompleted: [step-01-init, step-02-explore, step-03-categorize, step-04-present, step-05-pick]`. Body: five-pass grilling loop on the chosen candidate:
    - Pass 1 — design tree walk (what does this code reach, what reaches it).
    - Pass 2 — challenge assumptions (why does the abstraction exist, what changed since).
    - Pass 3 — deletion test rigor (re-run the test with full context, not the surface heuristic).
    - Pass 4 — surface alternatives (collapse / extract / inline / move).
    - Pass 5 — user confirms the approach or rejects (rejection bumps status to deferred and returns to step-04).
15. **Write `step-07-plan.md`** at `.prism/skills/prism-ren/step-07-plan.md`. Frontmatter: `stepsCompleted: [step-01-init, step-02-explore, step-03-categorize, step-04-present, step-05-pick, step-06-grill]`. Body: generate slug from candidate topic (kebab-case, ≤40 chars), create refactor plan at `.prism/plans/refactor-<slug>.md` using the template from `.prism/rules/branch-plan.md`. Populate `## Goal` from candidate problem statement, `## Decisions` from grill-pass outcomes, `## Implementation Tasks` as a stub heading reserved for Winston, `## History` with initial entry naming Ren as author.
16. **Write `step-08-continue.md`** at `.prism/skills/prism-ren/step-08-continue.md`. Frontmatter: `stepsCompleted: [step-01-init, step-02-explore, step-03-categorize, step-04-present, step-05-pick, step-06-grill, step-07-plan]`. Body: continue scouting another directory or pause. On pause, state file is saved at `.prism/ren-state.json` with `currentPhase: idle`.
17. **Update shared.md `## Workflow overview` section** to list the eight step files in order with one-line summaries. Each entry cites the step file path.
18. **Run `pnpm prism:build`** from repo root. Verification: build succeeds and step files are accessible from the generated skill mirrors.

#### Eli (documentation)

No docs in PR-2.6.2.

---

### PR-2.6.3 — State file management + resume detection

**Branch:** `hmcgrew/prism-2.6.3-ren-state-mgmt`
**Depends on:** PR-2.6.2 (state schema consumed by step files).
**Blocks:** none within Phase 2.6.
**Parallel-safe with:** PR-2.6.4 (state file work and ADR + dev doc touch different files).
**Verification:** `pnpm prism:build && pnpm prism:check`.

#### Clove (implementation)

19. **Write `.prism/architect/ren-state.md`** architect doc against the four-beat arc per `.prism/architect/architecture-doc-shape.md`. Structure:
    - **Anchor sentence** — one line: "Ren's state file at `.prism/ren-state.json` carries visited paths, ranked candidates, and resume metadata across sessions."
    - **Beat 1 — Need** — why a state file at all (resumability across sessions, defer/skip status persistence, schema validation to refuse malformed input).
    - **Beat 2 — Technical flows** — write at every phase transition (step-01 init, step-03 categorize, step-05 pick, step-07 plan, step-08 continue); read at startup of every Ren invocation.
    - **Beat 3 — Natural fit** — Theo's state file at `.prism/theo-state.json` (Phase 2.5) established the convention; Ren follows it. Cite the precedent rather than re-derive the rationale.
    - **Beat 4 — Platform limits** — JSON has no native schema enforcement; step-01-init validates against the schema below.
    Include the full JSON schema as a fenced block:
    ```json
    {
      "version": "1",
      "lastUpdated": "ISO-8601 timestamp",
      "currentPhase": "exploring | presenting | grilling | idle",
      "stepsCompleted": ["step-01-init", "..."],
      "visitedPaths": [
        { "path": "relative-path-from-repo-root", "visitedAt": "ISO-8601 timestamp" }
      ],
      "candidates": [
        {
          "id": "uuid-or-slug",
          "topic": "short description",
          "files": ["relative path", "..."],
          "strength": "strong | worth-exploring | speculative",
          "problem": "one-sentence problem statement",
          "suggestedApproach": "collapse | extract | inline | move",
          "status": "open | skipped | deferred | planned",
          "refactorPlanPath": ".prism/plans/refactor-<slug>.md or null"
        }
      ]
    }
    ```
20. **Update `.prism/architect/manifest.json`** to route `ren-state.md` on edits touching `.prism/ren-state.json` or `.prism/skills/prism-ren/step-*.md`. Add the route entry following the pattern established by `theo-state.md` (Phase 2.5).
21. **Mirror `ren-state.md` to `templates/install/.prism/architect/ren-state.md`** byte-identical. Use `cp` from `.prism/architect/ren-state.md`. Verification: `diff .prism/architect/ren-state.md templates/install/.prism/architect/ren-state.md` exits 0.
22. **Mirror the manifest update to `templates/install/.prism/architect/manifest.json`** byte-identical. Same `diff` verification.
23. **Update shared.md `## State file schema` section** at `.ai-skills/skills/prism-ren/shared.md` to cite `ren-state.md` per cite-don't-restate. Replace any inline schema fragments with the citation.
24. **Add schema validation step to `step-01-init.md`** at `.prism/skills/prism-ren/step-01-init.md`. On read, validate `currentPhase` enum, `version` matches `"1"`, required top-level fields present. On mismatch: refuse to proceed, print a diff of the failing fields, prompt backup-or-abort.
25. **Add idempotent-write guidance to `step-07-plan.md` and `step-08-continue.md`**. Pattern: read-modify-write, write to a tmp file (`.prism/ren-state.json.tmp`), atomic rename to final path. Never overwrite without preserving the existing `visitedPaths` and `candidates` arrays — merge by `id` and `path` respectively.

Verification: `pnpm prism:check` after task 25. The check runs the manifest validator and the template-mirror diff.

#### Eli (documentation)

No docs in PR-2.6.3.

---

### PR-2.6.4 — ADR-0042 + paired dev doc

**Branch:** `hmcgrew/prism-2.6.4-ren-adr-dev-doc`
**Depends on:** PR-2.6.1 (ADR documents the persona shape).
**Blocks:** none — conventionally lands last in Phase 2.6.
**Parallel-safe with:** PR-2.6.3 (different files).
**Verification:** `pnpm prism:check` (ADR linter validates byte-parity dual-write).

#### Clove (implementation)

26. **Write ADR-0042** at `.prism/spec/adrs/0042-ren-refactor-scout.md`. Structure:
    - **Status** — Accepted.
    - **Context** — name the alternatives considered: (a) absorb Ren into Winston as a third mode, (b) absorb into Theo as a second walk type, (c) introduce Ren as a separate persona.
    - **Decision** — (c) Ren as a separate persona.
    - **Reasoning** — Winston is reactive (responds to ideas presented by the user); Ren is proactive (hunts for ideas the user hasn't named yet). Theo documents what IS load-bearing; Ren spots what looks load-bearing but isn't. Output types differ — evaluations, architect docs, and refactor plans would conflict if multiplexed through one persona.
    - **Alternatives discussion** — one paragraph per alternative explaining why it was rejected. Cite Phase 1.5e patterns (deletion test, two-adapters seam, micro-file step machine, strength badges) as absorbed inputs to Ren's design rather than as alternatives.
    - **Consequences** — PRISM ships a fourth codebase-walking surface (after Theo, Winston, Atlas). State files multiply: `theo-state.json` and `ren-state.json` live side-by-side. Consumer onboarding adds one more persona name to learn.
27. **Mirror ADR-0042 to `templates/install/.prism/spec/adrs/0042-ren-refactor-scout.md`** byte-identical. `diff` verification.
28. **Update ADR numbering plan in `.prism/plans/roadmap.md`** § ADR numbering. Reserve 0042 for Ren so subsequent phases don't collide.

#### Eli (documentation)

29. **Write paired dev doc** at `docs/content/dev/ai-skills/ren.md`. Sections:
    - **Overview** — Ren is the refactor scout. Proactive where Winston is reactive; spots what's NOT load-bearing where Theo documents what IS.
    - **When to invoke** — trigger phrases (full list from frontmatter.yml) + situations (codebase feels heavy, suspect premature abstractions, want to clean up before a major feature).
    - **Workflow narrative** — the eight-step loop in prose. Link to each step file at `.prism/skills/prism-ren/step-01-init.md` through `step-08-continue.md`.
    - **Output shape** — refactor plan template (link to `.prism/rules/branch-plan.md`) + ADR-0042 link explaining the plan-file-not-HTML decision.
    - **State and resumability** — link to `.prism/architect/ren-state.md` for the schema.
    - **Composition with Theo and Winston** — "when to use which" guide. Three-line decision tree: "I want to know what's load-bearing → Theo. I want to evaluate an approach I've drafted → Winston. I want to find what's structurally weak → Ren."
30. **Update docs sidebar index** to add Ren in the personas list after Theo, before Parker. Path: `docs/content/dev/ai-skills/_meta.json` (or equivalent — check repo convention).
31. **Add cross-references in Theo's and Winston's dev docs** — append a "Composition with Ren" paragraph in each at `docs/content/dev/ai-skills/theo.md` and `docs/content/dev/ai-skills/winston.md`. Three to five sentences each, pointing back at the decision tree in Ren's doc.

Verification: `pnpm prism:build` after task 31. Docs build succeeds, sidebar renders Ren in the correct position, cross-references resolve.

---

## Decisions

- **Ren is a separate persona from Theo despite the shared codebase-walking mechanic.**
  - **Root cause:** Theo and Ren both walk the codebase but produce different artifacts for different reasons. Theo answers "what's load-bearing here?" (output: architect doc). Ren answers "what looks load-bearing but isn't?" (output: refactor plan).
  - **Alternatives considered:** absorb Ren into Theo as a second walk type with a mode flag.
  - **Chosen approach:** separate persona. The intent, output type, and posture toward existing code diverge enough that a mode flag would muddle both personas' workflows.
  - **Implementation guidance:** keep Theo's and Ren's state files, step files, and architect docs cleanly separate. Cross-link in docs; never share runtime state.
- **Ren is a separate persona from Winston.**
  - **Root cause:** Winston reacts to ideas presented by the user (evaluate this approach, plan this work). Ren proactively hunts for ideas the user hasn't named yet.
  - **Alternatives considered:** absorb Ren into Winston as a third mode (evaluate / plan / scout).
  - **Chosen approach:** separate persona. The proactive-vs-reactive split is a different operating mode; collapsing them would force one persona to context-switch between asking-the-user-what-to-do and telling-the-user-what's-wrong.
  - **Implementation guidance:** Ren hands off to Winston after the refactor plan lands. Winston then writes `## Implementation Tasks` per the detail bar and routes to Clove.
- **Refactor plans land as plan files at `.prism/plans/refactor-<slug>.md`, NOT HTML reports.**
  - **Root cause:** PRISM's plan-file-as-source-of-truth convention is already established. Every downstream persona (Winston, Clove, Briar, Eric) reads plan files. An HTML report would require hand-translation.
  - **Alternatives considered:** HTML report with embedded ASCII wireframes and a "copy to plan" button.
  - **Chosen approach:** plan file. Removes a translation step and keeps Ren's output inside the same lineage every other PRISM artifact lives in.
  - **Implementation guidance:** the plan file uses the branch-plan.md template with `## Goal`, `## Decisions`, and `## Implementation Tasks` populated. Winston picks it up unchanged.
- **Ren hands off to Clove after the refactor plan is accepted, not during grill.**
  - **Root cause:** grill is a design conversation; implementation is a separate phase. Mixing them would compress the five-pass grilling loop and lose the "did we really need this?" pressure that justifies the persona.
  - **Alternatives considered:** Ren writes implementation tasks inline during grill pass 4.
  - **Chosen approach:** three-hop chain — Ren scouts → Winston plans → Clove executes. Each persona owns one phase.
  - **Implementation guidance:** step-07-plan leaves `## Implementation Tasks` as a stub heading. Winston populates it on the next invocation.
- **State file schema lives in `.prism/architect/ren-state.md`, not duplicated across step files.**
  - **Root cause:** schema drift is the predictable failure mode if every step file restates the shape. Phase 1.5e's cite-don't-restate rule already covers this class of mistake.
  - **Alternatives considered:** inline the schema in each step file that reads or writes state.
  - **Chosen approach:** single source at `.prism/architect/ren-state.md`. Every step file cites it.
  - **Implementation guidance:** when the schema evolves, edit only `ren-state.md`; downstream cites pick up the change automatically.
- **Step files use the micro-file step machine pattern with `stepsCompleted` frontmatter.**
  - **Root cause:** absorbed from BMAD via Phase 1.5e. The pattern keeps each step under 100 lines and gives the resume detector a clean cursor.
  - **Alternatives considered:** one monolithic workflow file with section anchors.
  - **Chosen approach:** eight micro-files. Resume detection reads the frontmatter cursor; no need to parse section state.
  - **Implementation guidance:** each step file ≤100 lines; `stepsCompleted` lists the prior steps in order.
- **The `<!-- atlas:specializes-in -->` anchor lives in the Heuristics section of shared.md.**
  - **Root cause:** Ren's friction signals are universal across stacks (shallow modules, leaky seams, deletion test). Specific signals — WordPress block patterns, React RSC/client boundaries, Django ORM N+1 — differ per team. Atlas needs a clean insertion point.
  - **Alternatives considered:** scatter team-specific signals through the step files; require Atlas to patch step-02-explore directly.
  - **Chosen approach:** single anchor in shared.md § Heuristics. Atlas injects team-specific signals there, leaving step files untouched.
  - **Implementation guidance:** the anchor sits at the end of § Heuristics. Atlas appends new bullets between the anchor and the section's closing marker.

---

## Acceptance Criteria

### Behavioral

- [ ] Given a fresh PRISM install with Ren registered, When the user says "Ren, scout the codebase", Then Ren greets in character and asks for a starting directory or accepts repo root as the default.
- [ ] Given a fresh run, When Ren completes a directory walk, Then Ren presents ranked candidates grouped by strength (Strong / Worth exploring / Speculative) with file paths, problem statement, suggested approach, and a before/after sketch where applicable.
- [ ] Given Ren has presented candidates, When the user picks one by number, Then Ren enters the grilling loop and walks all five passes (design tree, challenge assumptions, deletion test rigor, surface alternatives, user confirms or rejects).
- [ ] Given the user confirms a refactor approach in grill pass 5, When Ren completes step-07-plan, Then a refactor plan file lands at `.prism/plans/refactor-<slug>.md` with `## Goal`, `## Decisions`, `## Implementation Tasks` (stub for Winston), and `## History` populated, and the state file is updated with `refactorPlanPath`.
- [ ] Given the user pauses mid-walk, When they later start a new session with Ren, Then Ren detects the state file at `.prism/ren-state.json` and offers to resume from the saved `currentPhase`.
- [ ] Given a presented candidate, When the user says "skip 3", Then candidate 3's status is set to `skipped` and it is not re-presented in subsequent rounds within the same session.
- [ ] Given a presented candidate, When the user says "defer 2", Then candidate 2's status is set to `deferred` and may resurface in a later session if the directory is rescouted.
- [ ] Given a malformed `.prism/ren-state.json` (schema mismatch, missing required field, invalid `currentPhase` enum), When step-01-init runs, Then Ren refuses to proceed, prints a diff of the failing fields, and prompts backup-or-abort.
- [ ] Given Winston is invoked against a Ren-produced refactor plan, When Winston reads the plan, Then Winston treats it as a branch plan and populates `## Implementation Tasks` per the detail bar in `.prism/rules/implementation-task-detail.md`.

### Non-behavioral

- [ ] Canonical skill source exists at `.ai-skills/skills/prism-ren/` with five files: `frontmatter.yml`, `shared.md`, `claude.md`, `codex.md`, `cursor.md`.
- [ ] Generated mirrors land at `.claude/skills/prism-ren/`, `.codex/skills/prism-ren/`, and `.cursor/skills/prism-ren/` after `pnpm prism:build`.
- [ ] Step files exist at `.prism/skills/prism-ren/step-01-init.md` through `step-08-continue.md`, each ≤100 lines and each carrying `stepsCompleted` frontmatter.
- [ ] State file schema lives at `.prism/architect/ren-state.md` and is mirrored byte-identical to `templates/install/.prism/architect/ren-state.md`.
- [ ] ADR-0042 documents the Ren-vs-Theo-vs-Winston separation with rationale and is mirrored byte-identical to the templates surface.
- [ ] Paired dev doc lives at `docs/content/dev/ai-skills/ren.md` and is linked from the sidebar after Theo, before Parker.
- [ ] `.prism/architect/manifest.json` routes `ren-state.md` correctly on edits touching `.prism/ren-state.json` or step files.
- [ ] Ren never modifies consumer source code — the only files Ren writes are `.prism/plans/refactor-<slug>.md` and `.prism/ren-state.json`, plus chat output.
- [ ] `pnpm prism:check` and `pnpm prism:build` pass after each of the four sub-PRs.

### AC Adjustments

_(none yet)_

### AC Sync Log

| Date | Agent | Action | Plan | Linear |
| ---- | ----- | ------ | ---- | ------ |

---

## History

- 2026-05-22 [main]: Plan created. Phase 2.6 — Ren as the refactor scout persona, four sub-PRs (skill scaffold + step files + state schema + ADR/dev doc), depends on Atlas (Phase 2) and Phase 1.5e patterns (deletion test, two-adapters seam, micro-file step machine, strength badges), parallel-safe with Theo (Phase 2.5) and Parker (Phase 3).

---

## Debugged Issues

_(none yet)_

---

## Review Issues

_(none yet)_

---

## Cleanup Items

_(none yet — populated during self-review on each sub-PR)_

---

## PR Readiness

Living checklist — updated every time `code-review-self` runs. Reflects current state.

- [ ] No critical or major issues
- [ ] Types correct — no `any`, no unsafe `as`
- [ ] No stray console.logs or debug artifacts
- [ ] Tests written for new logic and edge cases
- [ ] All debugged issues resolved (no `open` entries)
- [ ] Build passes — last run: _(pending)_
- [ ] PR description up to date
- [ ] Lasting decisions promoted to architect context (if applicable)

**Last updated:** 2026-05-22
