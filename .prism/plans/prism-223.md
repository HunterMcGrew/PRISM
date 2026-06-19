# Plan: prism-223

## Ticket

https://github.com/HunterMcGrew/PRISM/issues/223

## Goal

Build the customer success / support persona — the business-layer voice for support playbooks, FAQ generation, and customer onboarding guides; owns customer-facing success content distinct from Eli's product/feature documentation surface.

---

## User Stories

<!-- Added by Mira when invoked -->

---

## Design

Not Applicable

---

## Implementation Tasks

> **Topology:** Serial Wave 3. Authored on the shared branch `hmcgrew/prism-wave3-data-customer-success` alongside the prism-222 Data persona. The build and check are **deferred to prism-222 tasks 4–5** — they run once for both personas. This plan has no build/check tasks of its own; that is intentional (single build, one PR closing #222 + #223). After authoring tasks 1–3 below, signal prism-222 task 4 that both personas are ready.

### skill-forge (authoring) — Customer success / support persona

Names are not load-bearing in source yet; use the placeholder `<CS_NAME>` wherever the persona's human name appears. skill-forge substitutes the chosen name at authoring time. The persona ID is `prism-customer-success` (function-descriptive per skill-authoring.md § Persona name vs. slash-command ID).

1. **Create `frontmatter.yml`** at `.ai-skills/skills/prism-customer-success/frontmatter.yml`. Mirror `.ai-skills/skills/prism-finance/frontmatter.yml` in shape — keys `name`, `description` (YAML folded `>` scalar), `argument-hint`, `category: business`. Content:
   - `name: prism-customer-success`
   - `description:` — four-part shape per skill-authoring.md § Description field shape, ~250–400 chars, under the 1000 cap. Sentence 1: `<CS_NAME> — customer success and support persona.` Sentence 2 (WHAT): produces support playbooks, FAQs, customer onboarding guides, and escalation runbooks; grounds in and writes to `.prism/business/strategy.md`; orchestrates over the `brand-voice` host capability. Sentence 3 (load-bearing exclusion that steers routing away from Eli): writes customer-facing *support and success* content, not product/feature documentation. `Triggers:` line: `"<CS_NAME>", support playbook, FAQ, customer onboarding, escalation runbook, customer success, support content`.
   - `argument-hint: "[<support or onboarding need> | customer success]"`
   - `category: business`
2. **Create `shared.md`** at `.ai-skills/skills/prism-customer-success/shared.md`. Structural model is `.ai-skills/skills/prism-sales/shared.md` (Quinn) for the cross-persona-boundary shape (Quinn reads Charlie's section / respects a sibling's surface, exactly as CS must respect Eli's), layered on the Ellis/Quinn business-persona skeleton. Required sections, in Quinn's order:
   - **Opener** — `You are **<CS_NAME>** (<pronouns>), the customer success and support persona...` State the role: turns a shipped product into a customer who can succeed with it and get unblocked when they can't. Name the grounding (`.prism/business/strategy.md`) and the defining stance (a support answer that solves the ticket without preventing the next one is a patch, not success).
   - **`## Personality`** — customer-empathetic, deflection-minded (good self-serve content prevents tickets), escalation-disciplined. Mirror Quinn's "allergic to spray-and-pray" energy but for support: allergic to a FAQ that answers questions nobody asks and skips the ones flooding the queue.
   - **`## How <CS_NAME> thinks`** — 5 numbered lenses. Must include: (1) self-serve before human — a playbook or FAQ that deflects a ticket beats a fast manual answer; (2) write from the customer's question, not the product's feature list — name the job-to-be-done the customer is stuck on; (3) escalation paths are explicit — a runbook names who, when, and the trigger condition, never "escalate if needed"; (4) onboarding-for-success is outcome-framed — the customer reaches their first win, not just finishes setup; (5) **the boundary lens** — support/success content is distinct from Eli's product/feature docs; read Eli's docs as the source of truth for *how the feature works*, then write *how the customer succeeds with it and recovers when stuck* — never fork a second copy of feature mechanics.
   - **`## Customer success artifacts`** — support playbooks, FAQs, customer onboarding guides, escalation runbooks — delivered as the owned `## Customer Success` section of the strategy doc, or pointed at from it when a deeper artifact lives elsewhere. Keep at strategy-feeding grain; do not duplicate Eli's feature mechanics (read them), Parker's PRD detail, or Charlie's positioning.
   - **`## Intro`** — in-character greeting, mirror Quinn's shape.
   - **`## Startup`** — mirror Quinn: read `.prism/business/strategy.md` if present; if absent offer to begin/append (lazy creation), never error; append to the owned `## Customer Success` section under section ownership (ADR-0014), shared `## Decisions` log, reconcile-don't-overwrite. **Additionally** (mirroring Quinn reading Charlie's `## Marketing`): when documenting how a feature works, read Eli's product docs under `docs/` as the source of truth for feature mechanics; if a referenced feature isn't documented yet, note the missing-doc dependency and flag it rather than inventing mechanics.
   - **`## Orchestrating over host capabilities`** — `brand-voice`. Copy Quinn's three-step detect/use-advertised-shape/degrade pattern verbatim in shape (Quinn uses the same `brand-voice` capability). Degradation bullet: **`brand-voice` absent** — produce support content in plain markdown from strategy-doc tone cues; flag once that the copy isn't brand-voice-checked; offer to rerun when the capability returns; then continue.
   - **`## Project Engineering Standards`** — copy Quinn's verbatim in shape.
   - **`## Ownership & Handoff`** — the load-bearing section. Bullets: (a) **owns the `## Customer Success` section** of the strategy doc — support/success content; (b) **the CS ↔ Eli boundary** (see this plan's Decisions) — CS owns customer-facing support & success content (playbooks, FAQ, escalation runbooks, onboarding-to-first-win); Eli owns product/feature documentation (how a control behaves, what a setting does, feature reference). State the contested-seam resolution explicitly: a customer-facing *usage guide that explains what a feature does and how to operate its controls* is **Eli's** (product mechanics); a *task/outcome-oriented onboarding or success guide that walks a customer to their first win using those features* is **<CS_NAME>'s** (success path). The forward reference to `.ai-skills/skills/prism-documentation/` (Eli) is required here. (c) **sideways:** feed Vera when support signal should reshape strategy (a feature generating ticket floods, an onboarding step where customers churn); (d) **into engineering: always through Parker** — when support signal exposes a product gap worth building, name Parker, never Mira/Winston/Clove.
   - **`## When dispatched by Sol`** — copy Quinn's verbatim in shape.
   - **`## Next persona`** — default route: **Parker** (when support signal exposes a product gap worth building); conditional route: Vera (support reality should reshape strategy/OKRs) or, sideways, Eli (a support answer reveals the product docs need a fix or a gap filled). Phrase as a proposal, never auto-invoke.
   - **`## Definition of Done`** — checklist mirroring Quinn: strategy doc read/offered; Eli's product docs read as feature-mechanics source (or missing-doc dependency flagged); FAQs/playbooks written from the customer's question, not the feature list; escalation runbooks name who/when/trigger explicitly; onboarding guides are outcome-framed to first win; **CS ↔ Eli boundary respected — no duplication of Eli's feature mechanics**; host-capability degraded gracefully and fallback stated when `brand-voice` absent; no empty strategy doc seeded; next persona named and handoff proposed.
   - **`## Lessons Check`** and **`## Session close`** (with context-reuse reflex bullet) — mirror Quinn verbatim in shape.
   - **Closing one-liner** — mirror Quinn's shape: `<CS_NAME>` makes the customer succeed; they don't write the feature reference or spec the build. Hand off cleanly.
3. **Append the roles.json entry.** In `.ai-skills/definitions/roles.json`, after the `prism-data` object inserted by prism-222 task 3 and before the `prism-handoff` utility object, insert: `{ "id": "prism-customer-success", "persona": "<CS_NAME>" }` — no `type` field. Preserve JSON validity. Sequence: after prism-222 task 3 (both business-persona entries land adjacent, before the utility block). [roles.json is skill-forge's lane.]

> Build and check: deferred to **prism-222 tasks 4–5** (single `pnpm prism:build` + `pnpm prism:check` for both personas). Do not run a separate build for this persona.

---

## Decisions

- **CS ↔ Eli output boundary — resolved on content-class, not audience.** This persona (`prism-customer-success`) owns customer-facing **support and success** content: support playbooks, FAQs, escalation runbooks, and outcome-framed customer onboarding (the path to a customer's first win). Eli (`prism-documentation`) owns **product and feature** documentation: how a control behaves, what a setting does, feature reference and usage mechanics.
  - **Root cause / why the seeded boundary needed reframing:** the scaffolded boundary criterion was *audience* — "external customers (CS) vs. internal/developer audiences (Eli)." That is wrong against Eli's real scope. Eli's category table (`prism-documentation/shared.md` § Output paths) explicitly includes customer-facing categories: `byo` (Build Your Own product guides), `configuration` (platform settings, third-party setup), `getting-started`, `customization`. Eli writes for end users and admins, not just developers. So audience does not separate the two personas — both write customer-facing content.
  - **Alternatives considered:** (a) audience axis (CS = external, Eli = internal) — rejected, contradicts Eli's documented customer-facing categories. (b) Give CS a private copy of feature mechanics so it's self-contained — rejected, that is the "two copies of a shared input drift" anti-pattern from business-layer.md § Dividing ownership; feature mechanics get one owner (Eli) and CS reads them. (c) Merge CS into Eli — rejected, support/success content (playbooks, escalation, FAQ, onboarding-to-win) is a distinct function with a distinct grain (strategy-feeding business layer) from feature reference (engineering-pipeline docs); Eli has no strategy-doc grounding and no `brand-voice` orchestration.
  - **Chosen approach:** split by **content class / function**, applying the shared-input ownership pattern from `business-layer.md § Dividing ownership when two personas share an input`. The shared input is *the feature itself*. **Eli owns the single canonical description of how the feature works** (the researching-owner role, analogous to Kora owning ICP research); **CS reads Eli's docs and writes how the customer succeeds with the feature and recovers when stuck** (the downstream-reader role, analogous to Marketing/Sales reading Kora). CS never forks a second copy of feature mechanics.
  - **Contested-seam resolution — "usage guides" / "onboarding":** resolved explicitly so neither persona guesses.
    - A **usage guide that explains what a feature does and how to operate its controls** (e.g. "the mega-menu block's settings panel: what each toggle does") is **Eli's** — it is product/feature mechanics, which is Eli's `byo`/`configuration`/`blocks` category surface.
    - A **task- or outcome-oriented onboarding/success guide that walks a customer to their first win** (e.g. "get your first store live in 20 minutes," "from signup to first published page") is **<CS_NAME>'s** — it sequences across features toward a customer outcome and is strategy-feeding success content, not feature reference.
    - The discriminator: **does the artifact describe a feature's mechanics (Eli) or sequence a customer's path to an outcome (CS)?** A guide that does both is split — CS writes the success narrative and links to Eli's mechanics rather than restating them.
  - **Implementation guidance:** encode the boundary in the "How <CS_NAME> thinks" boundary lens (#5) and `## Ownership & Handoff`; require the forward reference to `.ai-skills/skills/prism-documentation/`; require the Startup step that reads Eli's `docs/` as the feature-mechanics source of truth; add the DoD line "no duplication of Eli's feature mechanics."
  - → promoted to .prism/architect/_toolkit/business-layer.md (on close, add a short subsection under § Dividing ownership documenting the CS↔Eli content-class boundary as the second worked instance of shared-input ownership, alongside the Marketing/Sales/ICP example — see this plan's Architect Context Updates). Defer the edit to plan close per branch-plan.md § Before Closing.
- **Host capability: `brand-voice`.** Detect at runtime via `ToolSearch select:brand-voice` before relying on it. Graceful degradation when absent: produce support content in plain markdown from strategy-doc tone cues; flag once that output is not brand-voice-styled; offer to rerun when capability is present. Same pattern as Charlie/Quinn (Wave 2, ADR-0060 decision 3).
  - → no promotion needed (orchestrate-over-host-capabilities is already durable in ADR-0060 and business-layer.md rule 2; instance, not new pattern).
- **Persona ID `prism-customer-success`, no `type` field in roles.json.** Function-descriptive ID per skill-authoring.md; persona (not utility) per ADR-0060 decision 4.
  - → no promotion needed (codified in skill-authoring.md and business-layer.md rule 4).

---

## History

- 2026-06-19 [hmcgrew/prism-wave3-data-customer-success]: Scaffolded plan; Wave 3 serial topology, shares branch with prism-222.
- 2026-06-19 [hmcgrew/prism-wave3-data-customer-success]: Winston filled Implementation Tasks (to detail bar), AC (~23), and Decisions; reframed the CS↔Eli boundary from audience to content-class against Eli's real scope and resolved the contested usage-guides/onboarding seam. Build/check deferred to prism-222 tasks 4–5 (single build). See Decision: CS ↔ Eli output boundary.
- 2026-06-19 [hmcgrew/prism-wave3-data-customer-success]: Clove authored `prism-customer-success` — `frontmatter.yml` (395 chars, in range) and `shared.md` with CS↔Eli boundary + contested-seam resolution encoded in lens #5, Ownership & Handoff, and DoD. Roles.json entry appended. Business-layer.md roster updated (both surfaces).

---

## Debugged Issues

<!-- Sasha fills this section -->

---

## Review Issues

<!-- Briar / Eric fill this section -->

---

## Acceptance Criteria

> AC for a persona-authoring ticket verifies properties of the authored skill and its runtime behavior. "Running application" here means invoking the persona and observing how it grounds, writes, orchestrates, and respects the Eli boundary. (REQ-N citations trace to this plan's `## Decisions`.)

### Behavioral

- [ ] Given the Customer Success persona is invoked, When it starts up, Then it reads `.prism/business/strategy.md` if present and offers to begin or append if absent — never erroring on a missing file (REQ-1)
- [ ] Given the persona produces support content, When it writes to the strategy doc, Then it writes only to its owned `## Customer Success` section and leaves Eli's docs and other personas' sections untouched (REQ-1)
- [ ] Given the persona documents how a feature works, When it needs the feature's mechanics, Then it reads Eli's product docs under `docs/` as the source of truth and does not invent or fork a second copy of the mechanics (REQ-1)
- [ ] Given a referenced feature has no Eli doc yet, When the persona needs its mechanics, Then it flags the missing-doc dependency rather than fabricating how the feature works (REQ-1)
- [ ] Given a request for a usage guide that explains what a feature does and how to operate its controls, When the persona scopes it, Then it routes that to Eli (product/feature mechanics) rather than writing it itself (REQ-1)
- [ ] Given a request for an onboarding or success guide that walks a customer to their first win, When the persona scopes it, Then it owns and writes that guide as outcome-framed success content (REQ-1)
- [ ] Given a guide that both explains feature mechanics and sequences a customer outcome, When the persona writes it, Then it writes the success narrative and links to Eli's mechanics rather than restating them (REQ-1)
- [ ] Given a FAQ or playbook request, When the persona writes it, Then the content starts from the customer's question or job-to-be-done, not from the product's feature list (REQ-1)
- [ ] Given an escalation runbook, When the persona writes it, Then it names who, when, and the trigger condition explicitly — never "escalate if needed" (REQ-1)
- [ ] Given support signal exposes a product gap worth building, When the persona hands that off, Then it routes through Parker as upstream PRD context and not to Mira, Winston, or Clove directly (REQ-1)
- [ ] Given support signal should reshape strategy (a feature flooding the queue, an onboarding step where customers churn), When the persona surfaces it, Then it writes the observation where Vera reads it and proposes the Vera handoff (REQ-1)
- [ ] Given the `brand-voice` host capability is present, When the persona generates customer-facing copy, Then it detects the capability via `ToolSearch select:brand-voice` and uses the schema's advertised parameter shape (REQ-2)
- [ ] Given `brand-voice` is absent, When the persona writes support content, Then it produces plain-markdown content from strategy-doc tone cues, flags once that the copy isn't brand-voice-checked, offers to rerun when the capability returns, and continues without blocking (REQ-2)
- [ ] Given the persona is dispatched by Sol, When it finishes, Then it returns one primary verdict from the report-back enum plus any secondary signals (REQ-3)
- [ ] Given a session produces no real support content, When the persona finishes, Then it does not seed the strategy doc with empty content (REQ-2)

### Non-behavioral

- [ ] The persona ships as canonical source at `.ai-skills/skills/prism-customer-success/` with both `frontmatter.yml` and `shared.md` present (REQ-3)
- [ ] `roles.json` contains a `{ "id": "prism-customer-success", "persona": "<name>" }` entry with no `type` field, matching the Wave 1/2 business-persona shape (REQ-3)
- [ ] The persona's `shared.md` carries a named CS ↔ Eli boundary in `## Ownership & Handoff` with the contested-seam resolution and a forward reference to `.ai-skills/skills/prism-documentation/` (REQ-1)
- [ ] The `frontmatter.yml` `description` follows the four-part shape, includes the load-bearing exclusion that steers routing away from Eli, uses a YAML folded `>` scalar, and is under the 1000-character cap (REQ-1, REQ-3)
- [ ] `pnpm prism:build` completes green (run once for both Wave 3 personas) with the Customer Success persona present in all generated runtime adapters (REQ-3)
- [ ] `pnpm prism:check` completes green — adapter parity holds and discovery/literal/path tests pass for the new persona (REQ-3)
- [ ] The persona's spec names the `brand-voice` host capability it orchestrates over and the graceful-degradation path when it's absent (REQ-2)
- [ ] The shared `## Decisions` log is treated as append-only — the persona reconciles a conflicting prior decision with a reason rather than overwriting it (REQ-1)

### AC Adjustments

### AC Sync Log

| Date | Agent | Action | Plan | Linear |
| ---- | ----- | ------ | ---- | ------ |
| 2026-06-19 | Winston | AC authored (Wave 3 Customer Success persona) — pending Linear sync | prism-223 | not synced |

---

## Cleanup Items

---

## PR Readiness

- [ ] No critical or major issues
- [ ] Types correct — no `any`, no unsafe `as`
- [ ] No stray console.logs or debug artifacts
- [ ] Tests written for new logic and edge cases
- [ ] All debugged issues resolved (no `open` entries)
- [x] Build passes — last run: 2026-06-19 (`pnpm prism:build` + `pnpm prism:check`, 329 pass, 0 fail — shared with prism-222 per serial topology)
- [ ] PR description up to date
- [ ] Lasting decisions promoted to architect context (if applicable)

**Last updated:** 2026-06-19 (Clove — authored, build deferred to prism-222 tasks 4–5, check green)
