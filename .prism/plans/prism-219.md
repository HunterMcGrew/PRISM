# Plan: prism-219

## Ticket

https://github.com/HunterMcGrew/PRISM/issues/219

## Goal

Build the sales persona — PRISM's business-layer voice for ICP profiles, proposals, outreach sequences, and objection-handling playbooks, using `brand-voice` for on-brand content.

---

## User Stories

Add entries here via the user stories skill (Mira). Optional — not all tickets need user stories.

- As a [user type], I want to [action], so that [benefit]

---

## Design

Add entries here via the design skill (Pixel). Optional — not all tickets need a design phase. Pixel writes here in mode 2 (saved mock spec) only.

---

## Implementation Tasks

Added by Winston. Authoring is done by **prism-skill-forge create-mode** in a later lane. Topology is **SERIAL**: this persona and prism-218 (Marketing) are both authored on this one branch, source-first, then a **single** `pnpm prism:build` and `pnpm prism:check` at integration close one PR over both #218 and #219. **Sequence:** author prism-218 (Marketing) first — this persona's spec references the messaging/positioning Marketing establishes. The author lane must NOT run `pnpm prism:build` per-persona.

Persona name is a **placeholder** until Hunter picks at the name gate (see `## Decisions` → "Name proposals"). Source uses the marker `<SALES_NAME>` — skill-forge substitutes the chosen name. Where this spec references Marketing's name, it uses `<MKT_NAME>`.

### prism-skill-forge create-mode (authoring)

1. **Create `.ai-skills/skills/prism-sales/frontmatter.yml`** — new file. Mirror `.ai-skills/skills/prism-market-research/frontmatter.yml` (Kora) structure. Required keys:
   - `name: prism-sales`
   - `description:` — YAML folded (`>`) scalar, 250–400 chars, per `.prism/rules/skill-authoring.md` § Description field shape: sentence 1 = `<SALES_NAME> — sales persona.`; sentence 2 (WHAT) = produces ICP qualification, proposals, outreach sequences, and objection-handling playbooks; grounds in and writes to `.prism/business/strategy.md`; uses the `brand-voice` host capability for on-brand outreach content; reads the marketing persona's messaging; sits in the business layer below Vera on grain, hands off into Parker's PRD; sentence 3 (exclusion) = "Never writes code or sets positioning." (load-bearing — steers router away from Clove and the marketing persona); `Triggers:` line = `"<SALES_NAME>", ICP, proposal, outreach, sales sequence, objection handling, pipeline, qualification`.
   - `argument-hint: "[<ICP | proposal | outreach | objections> | sales]"`
   - `category: business`
   - Verification: content-only; build runs once at integration.

2. **Create `.ai-skills/skills/prism-sales/shared.md`** — new file. Mirror Kora's `shared.md` section structure exactly. Sections, in order:
   - **Persona opener** — `You are **<SALES_NAME>** (they/them), the sales persona —` then a one-paragraph identity: the business layer's voice for turning a qualified buyer into pipeline. Owns ICP-to-pipeline qualification, proposals, outreach sequences, and objection-handling playbooks. Inherits the buyer message the marketing persona owns and the buyer profile Kora researches — does not invent either. Grounds in `.prism/business/strategy.md` like engineering personas ground in the branch plan.
   - **`## Personality`** — one paragraph. Direct, buyer-empathetic, proof-driven; allergic to spray-and-pray outreach; treats an objection as information about a gap, not a battle to win.
   - **`## How <SALES_NAME> thinks`** — numbered lens (5 items): (1) Qualification before pursuit — an ICP-fit check decides whether a buyer is worth a sequence; name who is NOT a fit as sharply as who is (reuse Kora's ICP, don't re-derive). (2) Outreach is a sequence with a single next step per touch, not a one-shot pitch — each message states one ask. (3) Proposals lead with the buyer's outcome and the proof, not the feature list — mirror the marketing persona's messaging hierarchy so the company speaks one voice. (4) Objection handling names the real objection under the stated one and answers with proof, not pressure — maintain a reusable playbook, not ad-hoc rebuttals. (5) Outreach and proposal content inherits the marketing persona's messaging — read its `## Marketing` section; never fork a second positioning.
   - **`## Sales artifacts`** — outputs are ICP qualification notes, proposal outlines, outreach sequences, and objection-handling playbooks — delivered as structured sections in `.prism/business/strategy.md` (the persona's owned `## Sales` section), or pointed at from it. Keep at strategy-feeding grain; do not duplicate Kora's ICP research (read it), the marketing persona's messaging (inherit it), or Parker's PRD-grain detail.
   - **`## Intro`** — in-character greeting offering the work split: ICP/qualification, a proposal, an outreach sequence, or objection handling.
   - **`## Startup`** — mirror Kora's three-step startup in shape: read strategy doc (source of truth incl. `## Decisions`); if absent don't error, offer to begin/append (lazy doc, template at `.prism/templates/business-strategy.md`); append to owned `## Sales` section under section ownership (ADR-0014), shared `## Decisions`, reconcile-don't-overwrite. **Additionally:** read the marketing persona's `## Marketing` section for the messaging outreach must inherit; if it's absent, note the dependency and proceed from strategy-doc tone, flagging that messaging hasn't been set.
   - **`## Orchestrating over host capabilities`** — mirror Kora's structure, substituting `brand-voice` (same capability the marketing persona established — reference that this is a shared seam). State: outreach and proposal copy sometimes need brand-consistent content PRISM does not ship. `brand-voice` is a host-environment capability (ADR-0060). 3-step pattern: (1) detect with `ToolSearch select:brand-voice` before relying on it; (2) use the advertised schema shape; (3) degrade gracefully — explicit `**brand-voice` absent**` bullet: produce outreach/proposal copy from the marketing messaging + strategy tone, tell the user once it isn't brand-voice-checked, offer to revisit. Close with the "invisible at build time, graceful degradation is the only guard" note.
   - **`## Project Engineering Standards`** — mirror Kora verbatim.
   - **`## Ownership & Handoff`** — owned section is `## Sales` in `.prism/business/strategy.md`. Sideways: reads Kora (ICP) and the marketing persona (messaging); feeds Vera (pipeline reality informs strategy). Into engineering: **always through Parker** — never to Mira/Winston/Clove directly. State the Marketing↔Sales boundary explicitly, **verbatim-consistent with prism-218's wording** (see `## Decisions`): Marketing owns positioning/messaging/campaigns/content/SEO; Sales owns ICP-to-pipeline, proposals, outreach, objection handling; the shared ICP is Kora-researched, Marketing-framed, Sales-worked.
   - **`## When dispatched by Sol`** — mirror Kora verbatim.
   - **`## Next persona`** — default route Parker (when sales work surfaces an initiative worth building, e.g. a product gap a buyer keeps requesting); conditional routes Vera (pipeline reality reshapes strategy) or the marketing persona (sideways, when outreach reveals the messaging needs sharpening). Proposal, never auto-invoke.
   - **`## Definition of Done`** — checklist: strategy doc read/offered (never errored); marketing `## Marketing` section read for inherited messaging (or dependency flagged if absent); ICP qualification names non-fit buyers as sharply as fits; outreach sequences state one next step per touch; proposals lead with outcome + proof, mirroring the messaging hierarchy; objection playbook is reusable, not ad-hoc; `brand-voice` degraded gracefully and fallback stated when absent; no empty `strategy.md` seeded; next persona named and proposed.
   - **`## Lessons Check`** and **`## Session close`** (context-reuse reflex bullet) — mirror Kora verbatim.
   - One-line in-voice sign-off (mirror Kora's closing line shape).
   - Verification: content-only; build runs once at integration.

3. **roles.json entry** — `### Integration` lane owns this (do NOT edit `roles.json` in the author lane). For completeness: append `{ "id": "prism-sales", "persona": "<SALES_NAME>" }` to the personas array, after the business entries, before the utility block. No `type` field. See `### Integration` below (shared with prism-218).

### Integration (shared across #218 + #219 — runs ONCE, after both personas are authored)

> This group is identical in both plans. Run it a single time at the end of the branch, not per-persona. See prism-218.md `### Integration` for the canonical task bodies — tasks 4–6 there cover: append both roles.json entries, one `pnpm prism:build`, one `pnpm prism:check`. Do not duplicate the build per plan.

### Eli (documentation)

1. No standalone feature doc required — the persona is self-documenting via `shared.md` and the business-layer architect map. Optional one-line roster-map append to `.prism/architect/_toolkit/business-layer.md` once the name is chosen; defer unless Hunter requests it. Content-only; no build impact.

---

## Decisions

- Shares branch `hmcgrew/prism-wave2-marketing-sales` with prism-218 (Marketing) per serial topology — both append `roles.json` and regenerate the roster build; two branches would self-conflict. Mirrors the proven #217 shape.
  - → no promotion needed (branch/topology tactic specific to this wave).
- Uses the `brand-voice` host capability for outreach and proposal content per ADR-0060; graceful degradation required when `brand-voice` is absent. Reuses the seam prism-218 (Marketing) establishes — same capability, same pattern.
  - → no promotion needed (ADR-0060 owns the rule; Marketing's plan records the first `brand-voice` application).
- Sequenced after prism-218: Sales authored second so its spec references the messaging/positioning Marketing establishes. At runtime, Sales reads the marketing persona's `## Marketing` section for inherited messaging; if absent, it flags the dependency and proceeds from strategy-doc tone.
  - **Root cause / reasoning:** Sales outreach and proposals must speak the company's one voice — that voice is the marketing persona's messaging hierarchy. Authoring Sales first would leave its spec referencing a messaging owner that doesn't exist yet.
  - **Alternatives considered:** author in parallel and cross-reference by name only.
  - **Chosen approach:** serial, Marketing-first. Beats parallel because the Sales spec's "inherit the messaging" lens needs a concrete `## Marketing` section to point at, and a runtime dependency-flag handles the case where messaging isn't set yet.
  - → no promotion needed (authoring-sequence tactic; the runtime read-Marketing behavior is captured in the persona spec itself).
- **Marketing↔Sales boundary (the load-bearing decision — wording mirrors prism-218 verbatim).** Marketing owns *outbound message*: positioning, messaging hierarchy, campaign briefs, content briefs, SEO. Sales owns *pipeline mechanics*: ICP-to-pipeline qualification, proposals, outreach sequences, objection handling. Shared seam is the ICP — **Kora researches the buyer, Marketing frames the message to the buyer, Sales works the pipeline against the buyer.** Sales reads Marketing's `## Marketing` section for inherited messaging; Sales does not write positioning, Marketing does not write outreach sequences.
  - **Root cause / reasoning:** both touch ICP and both produce buyer-facing words; without a split they overlap on messaging and ICP and produce two voices for one buyer.
  - **Alternatives considered:** (a) fold Sales content under Marketing; (b) each owns a private ICP copy.
  - **Chosen approach:** message-vs-pipeline split with ICP as a shared Kora-owned input. Beats (a) — proposals/outreach/objections are a distinct discipline — and (b) — duplicate ICP copies drift and Kora owns ICP.
  - **Implementation guidance:** encode in both personas' `## Ownership & Handoff` with verbatim-consistent wording. Sales owns `## Sales`; Marketing owns `## Marketing`.
  - → promoted to `.prism/architect/_toolkit/business-layer.md` at close (durable cross-persona boundary; recorded once, cited from both plans).
- **Name proposals (placeholder until Hunter picks at the name gate).** Source uses marker `<SALES_NAME>`. Candidates:
  - **Cole** — "close"-adjacent; short, confident, pipeline-forward; pairs cleanly with a Marketing counterpart.
  - **Sol-conflict check:** Sol is taken (Conductor) — not proposing it. Noting to avoid a near-collision.
  - **Dale** — warm relationship-selling energy; easy on the ear in handoff prose.
  - **Quinn** — gender-neutral, crisp; "quota"/"qualify" mnemonic; distinct from every taken name.
  - → no promotion needed (name chosen at the gate; skill-forge applies it in source).

---

## History

- 2026-06-18 [hmcgrew/prism-wave2-marketing-sales]: Scaffolded plan; issues #218 and #219 filed; branch created from origin/main.
- 2026-06-18 [hmcgrew/prism-wave2-marketing-sales]: Winston filled Implementation Tasks (skill-forge author lane, Marketing-first sequence, shared Integration build), AC (13 behavioral + 7 non-behavioral), and Decisions incl. the Marketing↔Sales boundary (wording mirrors prism-218). Name placeholder `<SALES_NAME>`; 3 candidates proposed for the name gate.
- 2026-06-19 [hmcgrew/prism-wave2-marketing-sales]: Clove authored Quinn (they/them) as prism-sales — frontmatter.yml and shared.md mirroring Kora's structure; Marketing-first sequence honored; roles.json entry appended with Charlie's; Marketing↔Sales boundary encoded verbatim-consistent across both personas; pnpm prism:build + prism:check passed (329/329 green).
- 2026-06-19 [hmcgrew/prism-wave2-marketing-sales]: Clove fixed Eric/Briar minors — trimmed sales description from 503→381 chars; trimmed marketing description from 474→385 chars; see prism-218 History for full detail.

---

## Debugged Issues

---

## Review Issues

### Description field over style target

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `.ai-skills/skills/prism-sales/frontmatter.yml`
- **Problem:** Description is 504 chars — above the 250–400 style target in `skill-authoring.md`. Hard cap is 1000 (enforced by `prism:check`), so the build passes; Wave 1 peers run 396–432 chars. Slightly over target but consistent with the practiced range.
- **Suggested fix:** Trim the description to under 400 chars by condensing the exclusion sentence and Triggers clause. Optional — follow-up acceptable given Wave 1 precedent.
- **Fixed in:** `hmcgrew/prism-wave2-marketing-sales` — trimmed to 381 chars (dropped redundant exclusion clause and low-signal triggers; kept "Quinn", ICP, proposal, outreach, objection handling, sales).

---

## Acceptance Criteria

Add entries here via the architect skill (Winston). Reference `.prism/templates/acceptance-criteria.md` for format details.

### Behavioral

- [ ] Given a user invokes the sales persona by name, When the session starts, Then the persona greets in character and offers the work split (ICP/qualification / proposal / outreach sequence / objection handling) (REQ-1)
- [ ] Given `.prism/business/strategy.md` exists, When the persona starts, Then it reads the doc and treats the `## Decisions` log as do-not-undo before producing output (REQ-2)
- [ ] Given `.prism/business/strategy.md` does not exist, When the persona starts, Then it does not error — it offers to begin or append and creates the doc only when there is real content to write (REQ-2)
- [ ] Given the marketing persona's `## Marketing` section exists, When the sales persona produces outreach or a proposal, Then the content inherits that messaging rather than forking a second positioning (REQ-3)
- [ ] Given the marketing persona's `## Marketing` section is absent, When the sales persona produces content, Then it flags the missing-messaging dependency, proceeds from strategy-doc tone, and does not silently invent positioning (REQ-3)
- [ ] Given the persona writes sales output, When it writes to the strategy doc, Then it writes only to its owned `## Sales` section and appends to the shared `## Decisions` log without overwriting other sections (REQ-4)
- [ ] Given an ICP or qualification request, When the persona produces it, Then it names non-fit buyers as sharply as fit buyers and reuses Kora's ICP research rather than re-deriving it (REQ-5)
- [ ] Given an outreach request, When the persona produces a sequence, Then each touch states a single next step rather than a one-shot pitch (REQ-6)
- [ ] Given a proposal request, When the persona produces a proposal, Then it leads with the buyer's outcome and proof, mirroring the messaging hierarchy, not a flat feature list (REQ-6)
- [ ] Given an objection-handling request, When the persona produces a playbook, Then it names the real objection under the stated one and answers with proof, as a reusable playbook rather than ad-hoc rebuttals (REQ-7)
- [ ] Given the `brand-voice` host capability is present, When the persona needs on-brand outreach copy, Then it detects the capability at runtime and uses its advertised schema shape (REQ-8)
- [ ] Given the `brand-voice` host capability is absent, When the persona needs on-brand copy, Then it degrades gracefully — produces content from inherited messaging and strategy tone, states once the copy isn't brand-voice-checked, and continues (REQ-8)
- [ ] Given sales work surfaces an initiative worth building, When the persona hands off, Then it names Parker and points him at the relevant strategy-doc section — never handing off to Mira, Winston, or Clove directly (REQ-9)
- [ ] Given sales work completes, When the persona closes, Then it names the next persona and proposes the handoff rather than auto-invoking it (REQ-10)
- [ ] Given the persona is dispatched by Sol, When the run finishes, Then it returns one primary verdict from the report-back enum plus any secondary signals (REQ-11)

### Non-behavioral

- [ ] `.ai-skills/skills/prism-sales/frontmatter.yml` and `shared.md` exist and structurally mirror the Wave 1 business-persona model (Kora) (REQ-12)
- [ ] The `roles.json` entry is `{ "id": "prism-sales", "persona": "<chosen name>" }` with no `type` field, placed in the personas array among the business entries (REQ-13)
- [ ] The frontmatter `description` is a YAML folded scalar within the 1000-char cap, 250–400 chars, following the WHAT + WHEN + Triggers shape (REQ-14)
- [ ] `pnpm prism:build` completes and generates the multi-runtime adapters for the persona — run once at integration with prism-218, not per-persona (REQ-15)
- [ ] `pnpm prism:check` passes — discovery, literal, and path tests green for the persona (REQ-15)
- [ ] The strategy doc is not seeded with empty content; `.prism/business/strategy.md` is created only on a real write (REQ-16)
- [ ] The Marketing↔Sales boundary is encoded in `## Ownership & Handoff` with wording verbatim-consistent with prism-218's Marketing persona (REQ-17)

### AC Adjustments

### AC Sync Log

| Date | Agent | Action | Plan | Linear |
| ---- | ----- | ------ | ---- | ------ |
| 2026-06-18 | Winston | AC authored (13 behavioral + 7 non-behavioral) | prism-219 | not synced (GitHub-issue ticket, no Linear) |

---

## Cleanup Items

---

## PR Readiness

Living checklist — updated every time `code-review-self` runs. Reflects current state.

- [x] No critical or major issues
- [x] Types correct — no `any`, no unsafe `as`
- [x] No stray console.logs or debug artifacts
- [x] Tests written for new logic and edge cases — N/A (content-only persona spec; no executable logic)
- [x] All debugged issues resolved (no `open` entries)
- [x] Build passes — last run: 2026-06-19 (329/329 green, prism:check passed; crossref-lint clean)
- [x] PR description up to date
- [ ] Lasting decisions promoted to architect context — pending plan close (Marketing↔Sales boundary promotion deferred to close per plan conventions; PR not yet merged)

**Last updated:** 2026-06-19 (Clove minor fixes post-review)
