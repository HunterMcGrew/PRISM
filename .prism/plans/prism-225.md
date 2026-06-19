# Plan: prism-225

## Ticket

https://github.com/HunterMcGrew/PRISM/issues/225

## Goal

Build the Recruiting / People persona — the business-layer voice for job descriptions, interview rubrics, and hiring process documentation, grounded in ADR-0060 and the Wave 1 substrate.

---

## User Stories

Add entries here via the user stories skill (Mira). Optional — not all tickets need user stories.

---

## Design

Add entries here via the design skill (Pixel). Optional — not all tickets need a design phase.

---

## Implementation Tasks

Added by the architect skill (Winston). Single-persona PR — author the Recruiting persona source, append its `roles.json` entry, one build, one PR closing #225. Ellis (`prism-finance`) is the structural model for every task below; mirror its `shared.md` shape, section-ownership wiring, and host-capability degradation pattern.

> Name placeholder: `<RECRUITER_NAME>` throughout. Hunter picks from the proposals in this report; skill-forge applies the chosen name. Use `she/her` placeholder pronouns unless Hunter specifies otherwise — match the chosen name.

### Clove (implementation)

1. **Create `.ai-skills/skills/prism-recruiting/frontmatter.yml`** — new file. Mirror `.ai-skills/skills/prism-finance/frontmatter.yml` exactly in shape (folded `>` scalar `description`, `argument-hint`, `category: business`). Content:
   - `name: prism-recruiting`
   - `description:` (folded scalar) — four-part shape per `.prism/rules/skill-authoring.md` § Description field shape: sentence 1 = `<RECRUITER_NAME> — recruiting and people persona.`; sentence 2 (WHAT) = produces job descriptions, interview rubrics, and hiring-process documentation; grounds in and writes the `## People` section of `.prism/business/strategy.md`; sits in the business layer below Vera on grain; hands off into Parker's PRD as upstream context; `Triggers:` line = `"<RECRUITER_NAME>", job description, JD, interview rubric, hiring process, scorecard, headcount, recruiting`. Target 250–400 chars.
   - `argument-hint: "[<job description | rubric | hiring process> | recruiting]"`
   - `category: business`
   - Verification: deferred to task 4 (`pnpm prism:build`). Content-only file, no standalone check.

2. **Create `.ai-skills/skills/prism-recruiting/shared.md`** — new file. Structural model is `.ai-skills/skills/prism-finance/shared.md`; reproduce its section skeleton in order: persona opener (`You are **<RECRUITER_NAME>** (she/her), the recruiting and people persona — …`), `## Personality`, `## How <RECRUITER_NAME> thinks` (5 numbered lens points), `## Recruiting artifacts`, `## Intro`, `## Startup`, `## Orchestrating over host capabilities`, `## Project Engineering Standards`, `## Ownership & Handoff`, `## When dispatched by Sol`, `## Next persona`, `## Definition of Done`, `## Lessons Check`, `## Session close`. Content requirements that make this persona distinct (front-loaded so the writer makes no judgment calls):
   - **Owned section:** `## People` in `.prism/business/strategy.md`. State this in the artifacts paragraph and the Startup step 3 exactly as Ellis names his finance section — "Append to your owned `## People` section under section ownership ([ADR-0014](../../../.prism/spec/adrs/_toolkit/0014-plan-section-ownership.md)); the `## Decisions` log is shared. Reconcile before you overwrite a recorded decision."
   - **Artifacts:** job descriptions, interview rubrics/scorecards, and hiring-process documentation — delivered as structured content in the `## People` section, or pointed at from it when a deeper artifact lives elsewhere (mirror Charlie's "pointed at from it when a deeper artifact lives elsewhere" phrasing in `prism-marketing/shared.md:17`). Keep at strategy-feeding grain; do not duplicate Vera's mission/OKR detail or Parker's PRD-grain detail.
   - **Grounding tie-in for the lens:** at least one `## How <RECRUITER_NAME> thinks` point ties hiring to strategy — headcount and role priorities derive from OKRs and the runway Ellis models; write hiring plans where Vera and Ellis read them (the `## People` section), not a parallel doc. This mirrors Ellis's lens point 5 (write findings where downstream personas read).
   - **Startup:** 3 steps mirroring Ellis — (1) read `.prism/business/strategy.md` if it exists, treat as source of truth incl. `## Decisions`; (2) if absent, don't error — offer to begin or append, cite `lazy-artifacts.md` and the template at `.prism/templates/business-strategy.md`; (3) append to owned `## People` section under section ownership.
   - **Host capability:** Recruiting orchestrates over `brand-voice` (job descriptions and outreach must sound like the company — same capability Charlie/Quinn use). Reproduce Ellis's `## Orchestrating over host capabilities` pattern: detect with `ToolSearch select:brand-voice`, use the advertised shape, degrade gracefully. Degradation line: `brand-voice` absent → write JDs in a neutral professional voice, tell the user once, offer to re-voice when the capability is present.
   - **Ownership & Handoff:** default route Parker (when a hiring initiative worth specifying surfaces — e.g. a hiring-ops tool or careers page); sideways to Vera (when headcount should reshape OKRs/priorities) and Ellis (headcount feeds runway/burn). Into engineering always through Parker — never Mira/Winston/Clove directly.
   - **`## When dispatched by Sol`:** copy Ellis's block verbatim (return one primary verdict from the report-back enum plus secondary signals).
   - **Definition of Done & Lessons Check & Session close:** adapt Ellis's to recruiting (strategy doc read or offered; JDs/rubrics at strategy-feeding grain; host-capability degraded gracefully when `brand-voice` absent; no empty strategy.md seeded; next persona named not executed; reflex bullet citing `context-reuse.md`).
   - Verification: deferred to task 4. Content-only.

3. **Append the Recruiting entry to `.ai-skills/definitions/roles.json`** — after the `prism-customer-success` entry (currently `roles.json:104–106`), before the `prism-handoff` utility entry. Exact insertion (mirror the no-`type`-field persona shape at lines 88–106):
   ```json
   {
       "id": "prism-recruiting",
       "persona": "<RECRUITER_NAME>"
   },
   ```
   Match the file's existing tab indentation and trailing-comma convention (the entry is followed by `prism-handoff`, so it needs a trailing comma). No `type` field — personas omit it (per `.prism/architect/_toolkit/business-layer.md` rule 4). Verification: deferred to task 4.

4. **Run `pnpm prism:build`** from repo root. This generates `.claude/skills/prism-recruiting/SKILL.md`, `.codex/agents/prism-recruiting.toml`, and the other runtime adapters from the two source files, then runs `pnpm prism:test`. All generated adapters are build output — never hand-author them. Expect: build succeeds, discovery/literal/path tests green. After it passes, run `pnpm prism:check` to confirm types, manifest coverage, and crossref-lint all pass. Blocks task 5.

5. **Open the PR closing #225** — single-persona PR off `hmcgrew/prism-wave4-recruiting`. PR body per `.prism/templates/pr-description.md`; `## Ticket` references #225. After Recruiting merges to `main`, the Legal branch (#226) is cut from updated `main` — do not create the Legal branch before this merges (sequential topology, see `## Decisions`).

### Eli (documentation)

No documentation tasks. The persona spec is self-documenting (frontmatter + shared.md); the business-layer architect doc (`.prism/architect/_toolkit/business-layer.md`) already covers the substrate. If Hunter wants the Wave 4 roster reflected in business-layer doc's persona list, that's a follow-up — out of scope for this single-persona PR.

---

## Decisions

- Ships in its own PR first; Legal (#226) branches from updated `main` after this merges — sequential topology per ADR-0060 and Sol's Wave 4 plan to avoid roles.json/build conflicts.
  - **Root cause of the topology:** two personas both append to `roles.json` and both run `pnpm prism:build`, which regenerates shared adapter output. Parallel branches would collide on the roles.json append and the generated-file diffs.
  - **Chosen approach:** sequential single-persona PRs — Recruiting merges first, Legal branches from updated `main`. Beats a combined two-persona PR (Legal is the highest-risk persona and earns a focused disclaimer-only review that a combined PR would dilute).
  - → no promotion needed (ticket-tactical sequencing for Wave 4; the general "one persona per PR, sequential when sharing roles.json" pattern is already implied by ADR-0060 and the build model).
- **Recruiting owns the `## People` section of `.prism/business/strategy.md`.** Follows the Charlie/Quinn/Tess precedent — each business persona owns one named section (`## Marketing`, `## Sales`, `## Metrics`); Recruiting owns `## People`.
  - **Alternatives considered:** (a) ground without owning a section (write only to `## Decisions`); (b) a sibling file under `.prism/business/`.
  - **Chosen approach:** own a named `## People` section. Rejected (a) because hiring plans/headcount are durable strategy-grain content Vera and Ellis read, not one-off decisions — they need a home. Rejected (b) because a sibling file fragments reads before contention justifies it (the template's single-file-with-sections rule, ADR-0060). Job descriptions and rubrics are artifacts pointed at *from* the section, exactly as Charlie's campaign briefs are.
  - **Implementation guidance:** the strategy template (`.prism/templates/business-strategy.md`) does not pre-list `## People` — that's correct; Charlie's `## Marketing` isn't in the template either. The persona appends the section on first write. No template edit needed.
  - → promoted to `.prism/architect/_toolkit/business-layer.md` at close (add Recruiting + its `## People` section to the persona roster paragraph, mirroring how Charlie/Quinn/Tess/Remy are listed).
- **Recruiting orchestrates over `brand-voice`, not a new capability.** Job descriptions and candidate-facing copy must sound like the company — the same host capability Charlie and Quinn use. PRISM ships no copy; detect at runtime, degrade gracefully (neutral professional voice when absent).
  - → no promotion needed (the orchestrate-don't-vendor rule is already durable in `business-layer.md` rule 2 and ADR-0060; this is its application).

---

## History

- 2026-06-19 [hmcgrew/prism-wave4-recruiting]: Scaffolded plan; issues #225 (Recruiting) and #226 (Legal) filed; Recruiting branch created from origin/main @ 30234af.
- 2026-06-19 [hmcgrew/prism-wave4-recruiting]: Winston filled Implementation Tasks (5 Clove tasks, single-persona PR) and AC (~21); decided `## People` section ownership and `brand-voice` orchestration; name placeholder `<RECRUITER_NAME>` pending Hunter's pick. See Decisions.
- 2026-06-19 [hmcgrew/prism-wave4-recruiting]: Clove authored Penny (`prism-recruiting`) — frontmatter.yml + shared.md, roles.json entry (after prism-customer-success), business-layer.md roster updated in both live and install-seed surfaces; pnpm prism:build + prism:check GREEN (329/329 tests).

---

## Debugged Issues

---

## Review Issues

---

## Acceptance Criteria

### Behavioral

- [ ] Given the Recruiting persona is invoked by name, When the session starts, Then it greets in character and names what it can help with (job description, rubric, or hiring process) (REQ-1)
- [ ] Given the Recruiting persona is invoked, When asked for a job description, Then it produces a structured JD grounded in the company context recorded in the strategy doc (REQ-1)
- [ ] Given the Recruiting persona is invoked, When asked for an interview rubric or scorecard, Then it produces a structured rubric with named evaluation criteria (REQ-1)
- [ ] Given the Recruiting persona is invoked, When asked for hiring-process documentation, Then it produces a structured process doc at strategy-feeding grain (REQ-1)
- [ ] Given the strategy doc exists, When the persona starts, Then it reads the doc first and treats the recorded decisions as constraints before producing new content (REQ-2)
- [ ] Given the strategy doc is absent, When the persona is invoked, Then it does not error — it offers to start one or append, and requests the relevant company context before proceeding (REQ-2)
- [ ] Given the persona records hiring content, When it writes to the strategy doc, Then the content lands in the `## People` section and existing decisions in the shared decisions log are left intact (REQ-3)
- [ ] Given a recorded decision conflicts with new hiring content, When the persona writes, Then it surfaces the conflict and updates the decision entry with the reason it changed rather than silently overwriting (REQ-3)
- [ ] Given the on-brand-voice capability is available in the session, When the persona writes a job description, Then the copy reflects the company voice (REQ-4)
- [ ] Given the on-brand-voice capability is absent, When the persona writes a job description, Then it produces neutral professional copy, says so once, and offers to re-voice later — it does not error or stall (REQ-4)
- [ ] Given a hiring initiative worth building surfaces, When the persona proposes a handoff, Then it names Parker and points at the relevant strategy section — not Mira, Winston, or Clove directly (REQ-5)
- [ ] Given headcount or role priorities should reshape strategy, When the persona finishes, Then it offers a sideways handoff to Vera (priorities) or the finance persona (runway impact) (REQ-5)
- [ ] Given a session completes, When the persona closes, Then it proposes the next persona rather than auto-invoking it (REQ-5)

### Non-behavioral

- [ ] Persona spec follows the persona shape (ADR-0046): `frontmatter.yml` + `shared.md`, `persona` field in `roles.json` with no `type` field (REQ-6)
- [ ] `frontmatter.yml` `description` follows the four-part shape and stays within the 1000-char cap, target 250–400 chars (REQ-6)
- [ ] `shared.md` carries a `## How <name> thinks` lens, an `## Orchestrating over host capabilities` section, and a `## Definition of Done` (REQ-6)
- [ ] `roles.json` entry present, correctly placed, and valid JSON (REQ-6)
- [ ] `pnpm prism:build` passes; discovery/literal/path tests pass (REQ-7)
- [ ] `pnpm prism:check` passes — types, manifest coverage, and crossref-lint clean (REQ-7)
- [ ] No runtime adapter (`.claude/skills/`, `.codex/agents/`) is hand-authored — all generated by the build (REQ-7)
- [ ] Persona grounds in `.prism/business/strategy.md` only — no sibling state file created under `.prism/business/` (REQ-3)

### AC Sync Log

| Date | Agent | Action | Plan | Linear |
| ---- | ----- | ------ | ---- | ------ |

---

## Cleanup Items

---

## PR Readiness

- [x] No critical or major issues
- [x] Types correct — no `any`, no unsafe `as`
- [x] No stray console.logs or debug artifacts
- [x] Tests written for new logic and edge cases (329/329 pass — build tests cover all persona adapters)
- [x] All debugged issues resolved (no `open` entries)
- [x] Build passes — last run: 2026-06-19 (`pnpm prism:build` + `pnpm prism:check` GREEN)
- [ ] PR description up to date
- [x] Lasting decisions promoted to architect context (business-layer.md updated in live + install-seed)

**Last updated:** 2026-06-19
