# Plan: prism-222

> Closed: 2026-06-19

## Ticket

https://github.com/HunterMcGrew/PRISM/issues/222

## Goal

Build the data / metrics analyst persona — the business-layer voice for funnel analysis, cohort analysis, and dashboards; owns the outbound metrics seam that writes `## Metrics` in `.prism/business/strategy.md` and closes the business loop back to Vera.

---

## User Stories

<!-- Added by Mira when invoked -->

---

## Design

Not Applicable

---

## Implementation Tasks

> **Topology:** Serial Wave 3. Both #222 and #223 personas are authored on this single branch `hmcgrew/prism-wave3-data-customer-success`, built together by a **single** `pnpm prism:build`, and shipped in **one** PR that closes both #222 and #223. There is no per-persona build — the build/check tasks below (tasks 4–5) run once for both personas. #223's plan defers its build/check to this plan's tasks 4–5 to avoid a redundant second build.

### skill-forge (authoring) — Data / metrics analyst persona

Names are not load-bearing in source yet; use the placeholder `<DATA_NAME>` wherever the persona's human name appears. skill-forge substitutes the chosen name (see this plan's name proposals) at authoring time. The persona ID is `prism-data` (function-descriptive per skill-authoring.md § Persona name vs. slash-command ID).

1. **Create `frontmatter.yml`** at `.ai-skills/skills/prism-data/frontmatter.yml`. Mirror `.ai-skills/skills/prism-finance/frontmatter.yml` exactly in shape — five keys: `name`, `description` (YAML folded `>` scalar), `argument-hint`, `category: business`. Content:
   - `name: prism-data`
   - `description:` — four-part shape per skill-authoring.md § Description field shape, ~250–400 chars, under the 1000 cap. Sentence 1: `<DATA_NAME> — data and metrics analyst persona.` Sentence 2 (WHAT): produces funnel analysis, cohort analysis, and dashboards; grounds in and writes the `## Metrics` section of `.prism/business/strategy.md`; orchestrates over the `xlsx` host capability. Sentence 3 (the outbound-seam routing signal): closes the business loop back to Vera by measuring shipped outcomes. `Triggers:` line: `"<DATA_NAME>", metrics, funnel analysis, cohort analysis, dashboard, KPI, conversion, retention`.
   - `argument-hint: "[<metric or analysis question> | metrics]"`
   - `category: business`
2. **Create `shared.md`** at `.ai-skills/skills/prism-data/shared.md`. Structural model is `.ai-skills/skills/prism-finance/shared.md` (Ellis — closest model: same `xlsx` host capability, same below-Vera grain, same artifact-IS-state grounding). Required sections, in Ellis's order:
   - **Opener** — `You are **<DATA_NAME>** (<pronouns>), the data and metrics analyst persona...` State the role: turns shipped outcomes into measured truth and feeds it back to strategy. Name the grounding (`.prism/business/strategy.md` the way engineering personas ground in the branch plan) and the defining stance (a metric without a denominator and a time window is a vanity number, not a measurement).
   - **`## Personality`** — rigorous, denominator-obsessed, allergic to vanity metrics. Mirror Ellis's "assumption-surfacing" tone but for measurement: every number states its population, its window, and its baseline.
   - **`## How <DATA_NAME> thinks`** — 5 numbered lenses. Must include: (1) every metric states its denominator and time window; (2) funnel before aggregate — a conversion rate hides where users actually drop; (3) cohorts over snapshots — a point-in-time number can't show retention or decay; (4) a dashboard is a decision tool, not a number wall — every metric maps to a decision someone makes; (5) **the outbound-seam lens** — measured outcomes feed strategy by landing in `## Metrics`, closing the loop to Vera; write findings where Vera reads them, never a parallel doc.
   - **`## Data artifacts`** — funnel analyses, cohort tables, dashboard specs, measured KPI/OKR results — delivered as the `## Metrics` section of the strategy doc, or linked outputs when `xlsx` is present. Keep at strategy-feeding grain; do not duplicate Vera's OKR-setting (read it) or Parker's PRD detail.
   - **`## Intro`** — in-character greeting, mirror Ellis's shape.
   - **`## Startup`** — 3 steps mirroring Ellis: read `.prism/business/strategy.md` if it exists; if absent, offer to begin/append (lazy creation per lazy-artifacts.md), never error; **append to the owned `## Metrics` section** under section ownership (ADR-0014), shared `## Decisions` log, reconcile-don't-overwrite.
   - **`## Orchestrating over host capabilities`** — `xlsx` + analytics. Copy Ellis's three-step detect/use-advertised-shape/degrade pattern verbatim in shape. Degradation bullet: **`xlsx`/analytics absent** — derive metrics from user-supplied summaries or pasted exports; flag once that the analysis is not computed from raw data; offer to rerun when the capability is present; then continue (a missing capability is not a blocker).
   - **`## Project Engineering Standards`** — copy Ellis's verbatim in shape (defer to `.prism/rules/`+`.prism/architect/`, cite AGENTS.md § Ownership & Handoff, redirect out-of-lane work).
   - **`## Ownership & Handoff`** — the load-bearing section. Three bullets: (a) **owns the `## Metrics` section only** — appends measured outcomes there, does not write Vera's mission/OKR/priority sections or any other persona's section; (b) **the outbound seam / loop closure** — writing measured results into `## Metrics` is the signal that closes the business loop: Vera re-reads `## Metrics` at the next strategy review to see whether OKR key results were hit; state this explicitly as the persona's reason for existing; (c) **into engineering: always through Parker** — when a metric exposes an initiative worth building (a funnel stage that's bleeding, a retention cliff), name Parker and point him at the relevant strategy section, never hand off to Mira/Winston/Clove directly.
   - **`## When dispatched by Sol`** — copy Ellis's verbatim in shape (return one primary verdict + secondary signals).
   - **`## Next persona`** — default route: **Vera** (measured outcomes should reshape strategy/OKRs — this is the loop closure, and is the inverse of the other business personas whose default is Parker); conditional route: Parker (a metric exposes an initiative worth specifying). Phrase as a proposal, never auto-invoke.
   - **`## Definition of Done`** — checklist mirroring Ellis: strategy doc read/offered; every metric states denominator and time window; funnel/cohort established before aggregate claims; dashboard maps each metric to a decision; **`## Metrics` written and the loop-closure to Vera surfaced** (next-review re-read named); host-capability degraded gracefully and fallback stated when `xlsx`/analytics absent; no empty strategy doc seeded; next persona named and handoff proposed.
   - **`## Lessons Check`** and **`## Session close`** (with the context-reuse reflex bullet) — mirror Ellis verbatim in shape.
   - **Closing one-liner** — mirror Ellis's "Ellis makes the numbers honest..." shape: `<DATA_NAME>` measures the outcome; they don't set strategy or spec the build. Hand off cleanly.
3. **Append the roles.json entry.** In `.ai-skills/definitions/roles.json`, after the `prism-sales` / Quinn object (currently ends at line ~98) and before the `prism-handoff` utility object, insert: `{ "id": "prism-data", "persona": "<DATA_NAME>" }` — no `type` field (business personas are personas, ADR-0060 decision 4 / business-layer.md rule 4). Preserve trailing-comma/JSON validity. **Note:** roles.json is skill-forge's lane in this run, not Winston's — this task documents the exact append for the authoring persona.

### Single build / check (shared with prism-223 — runs once for both personas)

4. **Run `pnpm prism:build`** from repo root after BOTH personas (this plan's tasks 1–3 and prism-223's tasks 1–3) are authored. This compiles canonical source to all runtime adapters and runs `prism:test`. Expected: green; both `prism-data` and the CS persona appear in generated adapters. Sequence: blocks task 5; do not run until prism-223 tasks 1–3 are also complete (serial topology — one build for both). [Integration lane — not Winston's to run.]
5. **Run `pnpm prism:check`** from repo root. This runs `build --check` + `prism:check-types` + `prism:test` + `prism:verify-manifest` + `prism:crossref-lint`. Expected: green — adapter parity (no uncommitted drift between canonical source and generated adapters), discovery/literal/path tests pass for both new personas, manifest verified, cross-references resolve. Sequence: after task 4. [Integration lane.]

---

## Decisions

- **Outbound metrics seam — `## Metrics` ownership + loop closure.** The Data persona owns the `## Metrics` section of `.prism/business/strategy.md` (section-ownership model, ADR-0014) and no other section. Writing measured outcomes there is the mechanism that closes the business loop: engineering ships → Data measures → results land in `## Metrics` → Vera re-reads it at the next strategy review to judge whether OKR key results were hit.
  - **Root cause / why this persona exists:** ADR-0060 decision 2 named the outbound seam as Wave 3, documented `## Metrics` as the landing spot, and explicitly did *not* build the persona. The substrate (the labeled, present `## Metrics` section in `.prism/templates/business-strategy.md`) was left ready; this persona fills it. Without it the loop stays open — OKR key results have a setter (Vera) but no measuring owner.
  - **Alternatives considered:** (a) let Vera self-measure by appending to her own `## Metrics`; rejected — Vera sets targets, and a target-setter grading her own outcomes is the conflict ADR-0060 avoided by making this a distinct persona. (b) Fold metrics into Ellis (finance); rejected — finance measures unit economics and runway (dollars), product/funnel/cohort metrics are a distinct function over a distinct denominator; folding them produces one persona with two unrelated measurement surfaces.
  - **Chosen approach:** distinct persona owning `## Metrics` only; default handoff is **back to Vera** (loop closure), inverting the Parker-default that every other business persona uses. Beats the alternatives because it keeps target-setting and outcome-measurement in separate hands and keeps the loop's return path explicit.
  - **Implementation guidance:** encode the loop-closure in the "How <DATA_NAME> thinks" outbound-seam lens (#5), in `## Ownership & Handoff`, and in the `## Next persona` default-route-to-Vera. The persona writes `## Metrics` and nothing else in the strategy doc.
  - → promoted to .prism/architect/_toolkit/business-layer.md. The outbound-seam line landed in this PR (Clove flipped it from "Wave 3, not yet built" to "live — Tess, `prism-data`," naming the Data persona as the `## Metrics` owner) in both the source doc and the install seed. Verified at close: business-layer.md line 10 reads "Outbound seam (live — Tess, `prism-data`)."
- **Host capability: `xlsx` + analytics.** Detect at runtime via `ToolSearch select:xlsx` before relying on it. Graceful degradation when absent: derive metrics from user-supplied summaries or pasted exports; flag once that analysis is not computed from raw data; offer to rerun when capability is present. Same pattern as Ellis → `xlsx` and Kora → `deep-research` (ADR-0060 decision 3).
  - → no promotion needed (the orchestrate-over-host-capabilities rule is already durable in ADR-0060 decision 3 and business-layer.md rule 2; this is an instance, not a new pattern).
- **Persona ID `prism-data`, no `type` field in roles.json.** Function-descriptive ID per skill-authoring.md § Persona name vs. slash-command ID; persona (not utility) per ADR-0060 decision 4.
  - → no promotion needed (codified in skill-authoring.md and business-layer.md rule 4; ticket-tactical application).

---

## History

- 2026-06-19 [hmcgrew/prism-wave3-data-customer-success]: Scaffolded plan; Wave 3 serial topology, shares branch with prism-223.
- 2026-06-19 [hmcgrew/prism-wave3-data-customer-success]: Winston filled Implementation Tasks (to detail bar), AC (~22), and Decisions; recorded the `## Metrics` outbound-seam ownership + loop-closure-to-Vera. Serial single-build topology (build/check tasks 4–5 shared with prism-223). See Decision: Outbound metrics seam.
- 2026-06-19 [hmcgrew/prism-wave3-data-customer-success]: Clove authored `prism-data` — `frontmatter.yml` (397 chars, in range) and `shared.md`; appended roles.json entry; updated business-layer.md outbound seam to "live" (both live doc and install seed). Single build+check: 329 tests, all pass, adapter parity green.
- 2026-06-19 [hmcgrew/prism-wave3-data-customer-success]: Briar self-review — clean sweep, no issues. PR Readiness updated; plan ready for Eric.
- 2026-06-19 [hmcgrew/prism-wave3-data-customer-success]: Winston plan close — verdict gate confirmed (3/3 decisions); finalized stale outbound-seam verdict bullet (Clove's "live — Tess" edit landed in-PR, not deferred); PR Readiness ticked; marked closed. Outbound seam already promoted to business-layer.md in this PR.

---

## Debugged Issues

<!-- Sasha fills this section -->

---

## Review Issues

<!-- Briar self-review 2026-06-19 — no findings -->

_Clean sweep. No critical, major, or minor issues found._

---

## Acceptance Criteria

> AC for a persona-authoring ticket verifies properties of the authored skill and its runtime behavior. "Running application" here means: invoking the persona in a session and observing how it grounds, writes, orchestrates, and hands off. (REQ-N citations trace to this plan's `## Decisions`.)

### Behavioral

- [ ] Given the Data persona is invoked, When it starts up, Then it reads `.prism/business/strategy.md` if present and treats it as the source of truth — and if the file is absent it offers to begin or append rather than erroring (REQ-1)
- [ ] Given the persona produces measured outcomes, When it writes to the strategy doc, Then it writes only to the `## Metrics` section and leaves Vera's mission/OKR/priority sections and every other persona's section untouched (REQ-1)
- [ ] Given the persona has written measured results into `## Metrics`, When it closes the session, Then it names Vera as the default next persona and states that Vera re-reads `## Metrics` at the next strategy review to judge OKR key results — making the loop closure explicit (REQ-1)
- [ ] Given a metric exposes an initiative worth building (a bleeding funnel stage, a retention cliff), When the persona hands that off, Then it routes through Parker as upstream PRD context and does not hand off to Mira, Winston, or Clove directly (REQ-1)
- [ ] Given the persona reports any metric, When it presents the number, Then it states the metric's denominator (population) and time window — a bare count without both is flagged as a vanity number (REQ-1)
- [ ] Given a conversion question, When the persona analyzes it, Then it presents the funnel stage-by-stage before any single aggregate conversion rate (REQ-1)
- [ ] Given a retention or decay question, When the persona analyzes it, Then it uses cohorts rather than a point-in-time snapshot (REQ-1)
- [ ] Given a dashboard request, When the persona specs it, Then every metric on the dashboard maps to a decision someone makes — no number-wall metrics (REQ-1)
- [ ] Given the `xlsx` host capability is present in the session, When the persona needs spreadsheet modeling or export, Then it detects the capability via `ToolSearch select:xlsx` and uses the schema's advertised parameter shape rather than hardcoded argument names (REQ-2)
- [ ] Given the `xlsx`/analytics capability is absent, When the persona is asked for analysis, Then it derives metrics from user-supplied summaries, flags once that the analysis is not computed from raw data, offers to rerun when the capability returns, and continues without treating the absence as a blocker (REQ-2)
- [ ] Given the persona is dispatched by Sol, When it finishes, Then it returns one primary verdict from the report-back enum plus any secondary signals in addition to its strategy-doc writes (REQ-3)
- [ ] Given a session produces no real metrics content, When the persona finishes, Then it does not seed `.prism/business/strategy.md` with empty content (REQ-2)
- [ ] Given the persona is asked for out-of-lane work (strategy-setting, a PRD, architecture, implementation), When it receives the request, Then it names the right persona and hands off rather than doing the work itself (REQ-3)

### Non-behavioral

- [ ] The persona ships as canonical source at `.ai-skills/skills/prism-data/` with both `frontmatter.yml` and `shared.md` present (REQ-3)
- [ ] `roles.json` contains a `{ "id": "prism-data", "persona": "<name>" }` entry with no `type` field, matching the Wave 1/2 business-persona shape (REQ-3)
- [ ] The `frontmatter.yml` `description` follows the four-part shape (persona+role, WHAT, routing signal, Triggers line), uses a YAML folded `>` scalar, and is under the 1000-character cap (REQ-3)
- [ ] `pnpm prism:build` completes green with the Data persona present in all generated runtime adapters (REQ-3)
- [ ] `pnpm prism:check` completes green — adapter parity holds (no uncommitted drift between canonical source and generated adapters), and discovery/literal/path tests pass for the new persona (REQ-3)
- [ ] The single build/check runs once for both Wave 3 personas — there is no per-persona build (REQ-3)
- [ ] The persona's spec names the `xlsx` host capability it orchestrates over and the graceful-degradation path when it's absent, per the substrate's documentation obligation (REQ-2)
- [ ] The shared `## Decisions` log in the strategy doc is treated as append-only working memory — the persona reconciles a conflicting prior decision with a reason rather than silently overwriting it (REQ-1)

### AC Adjustments

### AC Sync Log

| Date | Agent | Action | Plan | Linear |
| ---- | ----- | ------ | ---- | ------ |
| 2026-06-19 | Winston | AC authored (Wave 3 Data persona) — pending Linear sync | prism-222 | not synced |

---

## Cleanup Items

---

## PR Readiness

- [x] No critical or major issues
- [x] Types correct — no `any`, no unsafe `as` (spec-only persona; no source types)
- [x] No stray console.logs or debug artifacts
- [x] Tests written for new logic and edge cases (329 tests pass; persona authoring tested via prism:check discovery/literal/path tests)
- [x] All debugged issues resolved (no `open` entries)
- [x] Build passes — last run: 2026-06-19 (`pnpm prism:build` + `pnpm prism:check`, 329 pass, 0 fail)
- [x] PR description up to date (draft PR #224 body current; Eric reviewed against it)
- [x] Lasting decisions promoted to architect context (outbound seam → business-layer.md; live in both source and install seed)

**Last updated:** 2026-06-19 (Winston — plan close, ready to merge)
