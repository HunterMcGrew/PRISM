# Plan: prism-226

> Closed: 2026-06-19

## Ticket

https://github.com/HunterMcGrew/PRISM/issues/226

## Goal

Build the Legal / compliance persona — the business-layer voice for ToS drafts, privacy policy reviews, and contract review assistance, grounded in ADR-0060 with a mandatory "not legal advice" disclaimer on every artifact.

---

## User Stories

Add entries here via the user stories skill (Mira). Optional — not all tickets need user stories.

---

## Design

Add entries here via the design skill (Pixel). Optional — not all tickets need a design phase.

---

## Implementation Tasks

Added by the architect skill (Winston). Single-persona PR — author the Legal persona source, append its `roles.json` entry, one build, one PR closing #226. **This branch is cut from updated `main` AFTER Recruiting (#225) merges** — do not create it alongside the Recruiting branch (sequential topology, see `## Decisions`). Ellis (`prism-finance`) is the structural model; the "not legal advice" disclaimer is an *architectural* constraint encoded at four points (tasks 2a–2d), not a style note.

> Name placeholder: `<LEGAL_NAME>` throughout. Hunter picks from the proposals in this report; skill-forge applies the chosen name. Use `they/them` placeholder pronouns unless Hunter specifies otherwise — match the chosen name.

### Clove (implementation)

> **Sequence gate:** before any task here, confirm Recruiting (#225) has merged to `main` and this branch was cut from updated `main`. If not, stop — the topology requires it.

1. **Create `.ai-skills/skills/prism-legal/frontmatter.yml`** — new file. Mirror `.ai-skills/skills/prism-finance/frontmatter.yml` in shape (folded `>` scalar, `argument-hint`, `category: business`). Content:
   - `name: prism-legal`
   - `description:` (folded scalar) — four-part shape per `.prism/rules/skill-authoring.md`: sentence 1 = `<LEGAL_NAME> — legal and compliance persona.`; sentence 2 (WHAT) = drafts ToS, reviews privacy policies, and assists with contract review; grounds in and writes the `## Legal & Compliance` section of `.prism/business/strategy.md`; sits in the business layer below Vera on grain. **Sentence 3 (load-bearing exclusion, keep it):** `Every output carries a "not legal advice" disclaimer; recommends licensed counsel when jurisdiction or product context is missing.` `Triggers:` line = `"<LEGAL_NAME>", terms of service, ToS, privacy policy, contract review, compliance, legal`. Target 250–400 chars (the exclusion sentence pushes toward the upper end — that's correct, it's load-bearing for routing and for the persona's identity).
   - `argument-hint: "[<ToS | privacy policy | contract review> | legal]"`
   - `category: business`
   - Verification: deferred to task 4.

2. **Create `.ai-skills/skills/prism-legal/shared.md`** — new file. Structural model is `.ai-skills/skills/prism-finance/shared.md`. **The `## Disclaimer` section is placed FIRST, immediately after the persona opener and before `## Personality`** — it is the most-visible structural element, not a footer. Section skeleton in order: persona opener, `## Disclaimer` (see 2a), `## Personality`, `## How <LEGAL_NAME> thinks` (see 2c), `## Legal artifacts` (see 2b), `## Intro`, `## Startup`, `## Graceful degradation` (see 2d), `## Orchestrating over host capabilities`, `## Project Engineering Standards`, `## Ownership & Handoff`, `## When dispatched by Sol`, `## Next persona`, `## Definition of Done`, `## Lessons Check`, `## Session close`.

   The four disclaimer/degradation constraints are encoded as follows (this is the architectural core of the ticket — each is a required, reviewable element):

   - **2a — Dedicated `## Disclaimer` section near the top of `shared.md`.** Place it immediately after the persona opener, before `## Personality`. Content: a plain-language statement that `<LEGAL_NAME>` produces drafts and reviews for informational purposes only, is not a licensed attorney, and that nothing it produces is legal advice or creates an attorney-client relationship; the user is directed to have any output reviewed by licensed counsel in the relevant jurisdiction before relying on it. Two or three sentences — prominent, not buried.

   - **2b — Disclaimer surfaced at the artifact/template level.** In `## Legal artifacts`, state the structural rule: every artifact the persona produces (ToS draft, privacy-policy review, contract-review notes) **leads with or carries** the "not legal advice" disclaimer as the first line of the output — it is part of the template, not appended as an afterthought. Name the rule explicitly so a reviewer can confirm it structurally: "No legal artifact is emitted without the disclaimer at its head." Artifacts are delivered as structured content in the `## Legal & Compliance` section or pointed at from it; keep at strategy-feeding grain (do not duplicate Vera's or Parker's grain).

   - **2c — Disclaimer reflected in the `## How <LEGAL_NAME> thinks` lens.** The FIRST lens point makes the persona lead with its own limitation: it states up front that it is not a substitute for licensed counsel and frames every output as a starting point a lawyer must review — before any substantive legal reasoning. The remaining lens points cover legal-reasoning craft (e.g. jurisdiction-specificity, plain-language drafting, surfacing assumptions, flagging risk vs. stating conclusions). Five points total, mirroring Ellis's structure.

   - **2d — Graceful degradation when jurisdiction/product context is absent.** A dedicated `## Graceful degradation` section spelling out the path: when `.prism/business/strategy.md` lacks the jurisdiction, entity type, or product context needed to tailor an output, the persona (1) does not guess silently; (2) names each assumption it would otherwise have to make; (3) produces the output flagged as assumption-based scaffolding; (4) explicitly recommends consulting licensed legal counsel in the relevant jurisdiction before the user acts on it. State this as the default path, not an error path — the persona still helps, but it makes the gap and the recommendation explicit.

   - **Owned section, Startup, host capability, Ownership & Handoff** — same structural wiring as Recruiting/Ellis:
     - **Owned section:** `## Legal & Compliance` in `.prism/business/strategy.md`. Append under section ownership ([ADR-0014](../../../.prism/spec/adrs/_toolkit/0014-plan-section-ownership.md)); `## Decisions` shared; reconcile before overwriting.
     - **Startup:** 3 steps mirroring Ellis (read strategy doc if present; if absent, offer to begin/append per `lazy-artifacts.md` and the template; append to owned section). The strategy doc is where jurisdiction/entity/product context lives — Startup reads it precisely so 2d can detect when that context is missing.
     - **Host capability:** Legal orchestrates over `deep-research` (for jurisdiction-specific statute/regulation lookup — same capability Kora uses), detected with `ToolSearch select:deep-research`, degrading gracefully. Degradation line: `deep-research` absent → rely on general knowledge, flag that jurisdiction-specific verification was not performed, and fold this into the 2d counsel recommendation.
     - **Ownership & Handoff:** default route Parker (when a compliance requirement surfaces an initiative worth building — e.g. a consent flow, a data-retention feature); sideways to Vera (when a legal constraint should reshape strategy/priorities). Into engineering always through Parker.
     - **`## When dispatched by Sol`:** copy Ellis's block verbatim.
     - **Definition of Done:** adapt Ellis's and add disclaimer-specific gates — every artifact led with the disclaimer; the missing-context path flagged assumptions and recommended counsel when jurisdiction/product context was absent; host-capability degraded gracefully when `deep-research` absent; next persona proposed not executed.
   - Verification: deferred to task 4. Content-only.

3. **Append the Legal entry to `.ai-skills/definitions/roles.json`** — placed with the other business personas (after `prism-recruiting` once #225 has merged, before the `prism-handoff` utility entry). Exact insertion:
   ```json
   {
       "id": "prism-legal",
       "persona": "<LEGAL_NAME>"
   },
   ```
   Match tab indentation and trailing-comma convention. No `type` field. Verification: deferred to task 4.

4. **Run `pnpm prism:build`** from repo root — generates the runtime adapters from the two source files and runs `pnpm prism:test`. Never hand-author generated adapters. Expect build success and green discovery/literal/path tests. Then run `pnpm prism:check` (types, manifest coverage, crossref-lint). Blocks task 5.

5. **Open the PR closing #226** — single-persona PR, **focused disclaimer review**. PR body per `.prism/templates/pr-description.md`; `## Ticket` references #226. In `## Notes`, call out the four disclaimer/degradation constraints (2a–2d) so the reviewer (Eric) can confirm each is structurally present, not advisory. This is the highest-risk persona — the review's job is to confirm the disclaimer cannot be bypassed by the persona's normal output path.

### Eli (documentation)

No documentation tasks. Spec is self-documenting. Adding Legal to the business-layer architect-doc roster is a close-time promotion (see `## Decisions`), handled during plan close, not a separate Eli task.

---

## Decisions

- **Highest-risk persona in the suite. "Not legal advice" disclaimer is architectural, encoded at four points.** Winston translated Nora's DoR constraint into four reviewable structural elements (tasks 2a–2d): (2a) a dedicated `## Disclaimer` section placed first, right after the persona opener; (2b) the disclaimer surfaced at the artifact/template level — every output leads with it, stated as a rule a reviewer can confirm ("no legal artifact is emitted without the disclaimer at its head"); (2c) the FIRST `## How <name> thinks` lens point makes the persona lead with its limitation before any substantive reasoning; (2d) a dedicated `## Graceful degradation` section for the missing-context path.
  - **Why four points, not one:** a single `## Disclaimer` section is bypassable — the persona's normal output path could emit an artifact that never re-states it. Encoding it at the section level (2a), the artifact level (2b), and the reasoning level (2c) means the disclaimer rides every path the persona can take. The degradation section (2d) covers the case the disclaimer alone doesn't: not just "this isn't advice" but "I don't have the context to even draft well — get counsel."
  - **Implementation guidance:** the `## Disclaimer` section is placed *first* (before `## Personality`) deliberately — it is the most-visible element, and placement is the structural signal that it's load-bearing, not decorative. The frontmatter `description` keeps a load-bearing exclusion sentence (per skill-authoring § Exclusions) naming the disclaimer — this is one of the few personas where the negation clause earns its place.
  - → promoted to `.prism/architect/_toolkit/business-layer.md` — landed inline in this PR (commit cc59df7). The `### Disclaimer-as-architecture for high-liability personas` subsection captures the four-point pattern as the worked precedent for any future high-liability persona (medical, financial-advice, etc.); written to both source and the install seed.
- **Legal owns the `## Legal & Compliance` section of `.prism/business/strategy.md`.** Follows the Charlie/Quinn/Tess precedent — one named section per persona.
  - **Alternatives considered:** ground without owning a section; a sibling `.prism/business/legal.md`.
  - **Chosen approach:** own `## Legal & Compliance`. Jurisdiction, entity type, and product context are durable strategy-grain inputs the persona reads on every run (and whose absence triggers 2d) — they need a home in the strategy doc, not a parallel file (single-file-with-sections rule, ADR-0060). ToS/privacy/contract artifacts are pointed at *from* the section.
  - **Implementation guidance:** template not pre-listing `## Legal & Compliance` is correct (matches Charlie's `## Marketing`); persona appends on first write.
  - → promoted to `.prism/architect/_toolkit/business-layer.md` — landed inline in this PR (commit cc59df7). Lex + `## Legal & Compliance` added to the business-layer persona roster; written to both source and the install seed.
- **Ships in its own PR with focused disclaimer review; branch cut from updated `main` AFTER Recruiting (#225) merges.** Sequential topology — do not create the Legal branch alongside Recruiting's.
  - **Root cause:** shared `roles.json` append + shared `pnpm prism:build` regen output collide across parallel branches; and Legal's risk profile earns an isolated disclaimer-only review a combined PR would dilute.
  - → no promotion needed (ticket-tactical Wave 4 sequencing; same rationale recorded in #225's Decisions).
- **Legal orchestrates over `deep-research` for jurisdiction-specific lookup, degrading gracefully.** Same host capability Kora uses. When absent, the persona flags that jurisdiction-specific verification was not performed and folds that gap into the 2d counsel recommendation — degradation and disclaimer reinforce each other.
  - → no promotion needed (application of the orchestrate-don't-vendor rule already durable in `business-layer.md` rule 2).

---

## History

- 2026-06-19 [hmcgrew/prism-wave4-recruiting]: Scaffolded plan alongside #225; both plans committed on Recruiting branch (plans live on main, Winston fills them there; Legal branch cut from main after Recruiting merges).
- 2026-06-19 [hmcgrew/prism-wave4-recruiting]: Winston filled Implementation Tasks (5 Clove tasks w/ disclaimer encoded at 4 points 2a–2d) and AC (~25); decided `## Legal & Compliance` ownership, disclaimer-as-architecture, `deep-research` orchestration; name placeholder `<LEGAL_NAME>` pending Hunter. See Decisions.
- 2026-06-19 [hmcgrew/prism-wave4-legal]: Clove authored Lex (they/them, prism-legal) — frontmatter.yml, shared.md with all four disclaimer points (2a–2d), roles.json entry, business-layer.md updated in both source and install seed; `pnpm prism:build` + `pnpm prism:check` GREEN (329/329 tests, crossref-lint clean).
- 2026-06-19 [hmcgrew/prism-wave4-legal]: Briar self-review — all four disclaimer points verified in source; one minor (description 519 chars, trim substrate boilerplate to ≤450); no blockers. Build confirmed 329/329 clean.
- 2026-06-19 [hmcgrew/prism-wave4-legal]: Trimmed Lex description from 519 to 422 chars — removed substrate boilerplate clause; disclaimer and routing signal intact. Build + check GREEN (329/329).
- 2026-06-19 [hmcgrew/prism-wave4-legal]: Winston closed plan — verdict gate confirmed (4/4 Decisions carry verdicts; two promotion verdicts sharpened from "at close" to "landed inline in this PR"). No new promotion needed (disclaimer-as-architecture + section ownership already landed in cc59df7, source + seed). Plan-only close, no rebuild. Closes Epic #212 (Waves 1–4 complete).

---

## Debugged Issues

---

## Review Issues

### Description length at 519 chars — over peer range

- **Severity:** `minor`
- **Status:** `fixed`
- **Fixed in:** `.ai-skills/skills/prism-legal/frontmatter.yml` — removed substrate boilerplate clause; trimmed to 422 chars. Disclaimer clause and all routing signal preserved.
- **File:** `.ai-skills/skills/prism-legal/frontmatter.yml`
- **Problem:** Description is 519 chars; target is 250–400 (skill-authoring.md); peer max is Penny at 481. The substrate boilerplate clause "sits in the business layer below Vera on grain; hands off into Parker's PRD as upstream context" (79 chars) is not routing-critical and is the trim opportunity.
- **Suggested fix:** Remove the substrate boilerplate clause. Removing it lands at ~440 chars — exclusion clause and all routing-signal content stays. Alternatively keep it and accept ~440 as within "toward the upper end" since the exclusion clause earns the extra length; but the full 519 is outside the peer range and should be trimmed.

---

## Acceptance Criteria

### Behavioral

- [ ] Given the Legal persona is invoked by name, When the session starts, Then it greets in character and surfaces its limitation up front before offering to help (REQ-1, REQ-3)
- [ ] Given the Legal persona produces any artifact (ToS, privacy policy, contract-review notes), When the output is delivered, Then the artifact leads with the "not legal advice" disclaimer as its first line (REQ-1)
- [ ] Given the Legal persona is asked for a ToS draft, When it responds, Then it produces a structured draft grounded in the company context recorded in the strategy doc, led by the disclaimer (REQ-2)
- [ ] Given the Legal persona is asked to review a privacy policy, When it responds, Then it produces structured review notes flagging risks rather than asserting conclusions, led by the disclaimer (REQ-2)
- [ ] Given the Legal persona is asked for a contract review, When it responds, Then it produces structured review notes grounded in the company's known context, led by the disclaimer (REQ-2)
- [ ] Given jurisdiction, entity type, or product context is absent from the strategy doc, When the persona is invoked, Then it names each assumption it would have to make rather than guessing silently (REQ-4)
- [ ] Given jurisdiction or product context is absent, When the persona produces output, Then it marks the output as assumption-based scaffolding and explicitly recommends consulting licensed counsel in the relevant jurisdiction before acting (REQ-4)
- [ ] Given the strategy doc exists, When the persona starts, Then it reads the doc first and treats recorded decisions as constraints (REQ-5)
- [ ] Given the strategy doc is absent, When the persona is invoked, Then it does not error — it offers to start or append and requests the needed legal context (REQ-5)
- [ ] Given the persona records legal content, When it writes to the strategy doc, Then the content lands in the `## Legal & Compliance` section and the shared decisions log is left intact (REQ-6)
- [ ] Given the jurisdiction-research capability is absent, When the persona reasons about jurisdiction-specific rules, Then it flags that jurisdiction-specific verification was not performed and folds that into the counsel recommendation — it does not error or stall (REQ-7)
- [ ] Given a compliance requirement worth building surfaces, When the persona proposes a handoff, Then it names Parker and points at the relevant strategy section — not Mira, Winston, or Clove directly (REQ-8)
- [ ] Given a session completes, When the persona closes, Then it proposes the next persona rather than auto-invoking it (REQ-8)

### Non-behavioral

- [ ] `shared.md` includes a dedicated `## Disclaimer` section placed first, immediately after the persona opener and before `## Personality` (REQ-1)
- [ ] The disclaimer rule is stated at the artifact level — a reviewer can confirm "no legal artifact is emitted without the disclaimer at its head" from the spec text (REQ-1)
- [ ] The first `## How <name> thinks` lens point makes the persona lead with its limitation before substantive legal reasoning (REQ-1)
- [ ] `shared.md` includes a dedicated `## Graceful degradation` section spelling out the missing-context path (name assumptions, mark as scaffolding, recommend counsel) (REQ-4)
- [ ] The frontmatter `description` carries the load-bearing exclusion sentence naming the disclaimer and the counsel recommendation, within the 1000-char cap (REQ-1)
- [ ] Persona spec follows the persona shape (ADR-0046): `frontmatter.yml` + `shared.md`, `persona` field in `roles.json` with no `type` field (REQ-9)
- [ ] `roles.json` entry present, correctly placed, and valid JSON (REQ-9)
- [ ] `pnpm prism:build` passes; discovery/literal/path tests pass (REQ-10)
- [ ] `pnpm prism:check` passes — types, manifest coverage, and crossref-lint clean (REQ-10)
- [ ] No runtime adapter (`.claude/skills/`, `.codex/agents/`) is hand-authored — all generated by the build (REQ-10)
- [ ] PR reviewer can confirm the disclaimer is structurally enforced across all four points (2a–2d), not advisory (REQ-1, REQ-4)
- [ ] Persona grounds in `.prism/business/strategy.md` only — no sibling state file under `.prism/business/` (REQ-6)

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
- [x] Tests written for new logic and edge cases (build pipeline, 329/329)
- [x] All debugged issues resolved (no `open` entries)
- [x] Build passes — last run: 2026-06-19 (329/329 pass, crossref-lint clean)
- [x] PR description up to date
- [x] Lasting decisions promoted to architect context (business-layer.md updated with Lex roster entry + disclaimer-as-architecture note)
- [x] Minor: description trimmed from 519 to 422 chars (removed substrate boilerplate clause; disclaimer intact)

**Last updated:** 2026-06-19 (Clove post-review fix — description minor resolved)
