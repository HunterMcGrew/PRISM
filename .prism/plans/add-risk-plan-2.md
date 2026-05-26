# Plan: add-risk-plan-2

## Ticket

No Linear (this team doesn't use it). Tracked by branch `hmcgrew/lean-skill-architecture`. This plan is the output of the lean-skill-architecture pilot benchmark (evaluate→plan on "add a `## Risks` section to the branch-plan template").

## Goal

Give risk findings a reliably enforced home in the *existing* plan sections — without adding a dedicated `## Risks` section — by making the routing explicit in Sasha's, Eric's, and Briar's skills and documenting the decision in the plan rule.

---

## Design

N/A — no UI. The decision is a content-disclosure / section-ownership choice, captured in `## Decisions`.

---

## Implementation Tasks

Horizontal decomposition — single content layer (markdown spec). Not an epic. Sequence: skill + rule edits (tasks 1–4, independent of each other) → build/verify (task 5, depends on 1–4).

### Clove (implementation)

1. **Sasha — state that risk-flavored findings live in `## Debugged Issues`.** File: `.ai-skills/skills/prism-debugger/shared.md`. In **Phase 6 → "2. Record findings in the plan"**, immediately after the `Suggested tests:` bullet in the field list (the bullet ending `…if the Phase 1/5 seam check failed.`), add one new bullet:
   > - **Risk-flavored findings have a home here — there is no separate `## Risks` section.** A forward-looking hazard, an observed-but-unconfirmed fragility, or a low-confidence diagnosis is recorded in this section: `Confidence: Low`, the `Missing evidence` table, and `Suggested tests: "no correct seam …"` carry the risk signal. A concern that is genuinely separate from the bug routes to a follow-up ticket per `.prism/rules/followup-scope.md`.

   Content-only change — no runtime effect; verified by the build in task 5. Use the `.prism/…` path exactly as written (path-guard rejects platform-copy paths).

2. **Eric — risk rides severity; forward-looking architectural risk routes to Winston.** File: `.ai-skills/skills/prism-code-review-pr/shared.md`, section `### 5. Severity calibration`. After the `**Impact × Likelihood** determines severity…` sentence (the line ending `…different blast radius.`), add:
   > A "works, but it's fragile" finding is still a Review Issue — Impact × Likelihood already encodes the risk, so it rides the severity you assign, not a separate `## Risks` section. Forward-looking *architectural* risk that isn't a defect in this diff is Winston's lane (his evaluate-mode Devil's Advocate "Watch for") — surface it as a cross-cutting observation and route to Winston rather than opening a new section.

   Content-only; verified by the build in task 5.

3. **Briar — same risk-routing note, phrasing aligned with Eric.** File: `.ai-skills/skills/prism-code-review-self/shared.md`, section `### 4. Severity calibration`. After the `…Over-classifying everything as critical causes alert fatigue.` sentence, add a note worded to match task 2 (Eric's and Briar's review phrasing is kept aligned per `.prism/rules/architect-doc-verification.md`):
   > A "works, but it's fragile" finding is still a Review Issue — Impact × Likelihood already encodes the risk, so it rides the severity, not a separate `## Risks` section. Forward-looking architectural risk that isn't a defect in this diff is Winston's lane — flag it as a cross-cutting observation and route to Winston.

   Content-only; verified by the build in task 5.

### Winston (rules)

4. **Document the no-`## Risks`-section decision in the plan rule.** File: `.prism/rules/branch-plan.md`. In the **Plan File Template**, immediately after the `## Review Issues` structured-format block (the block ending with the `- **Suggested fix:** minimal description` line) and before the `## Acceptance Criteria` heading, insert this guidance note (same template zone where `## Decisions` already embeds guidance prose, so it reads as instruction, not as a section to copy):
   > **Where risk findings go — there is intentionally no dedicated `## Risks` section.** Risk already has homes: Sasha records forward-looking hazards and low-confidence diagnoses in `## Debugged Issues` (the `Confidence: Low`, `Missing evidence`, and `"no correct seam"` fields carry the risk signal); Briar and Eric record "works, but it's fragile" findings in `## Review Issues`, where Impact × Likelihood severity *is* the risk ranking; forward-looking architectural risk surfaced before implementation lives in Winston's evaluate-mode Devil's Advocate ("Watch for"). A separate `## Risks` section co-owned by the debugger and reviewer was considered and rejected — it reintroduces the section-boundary ambiguity the Plan Section Ownership model exists to prevent, forcing every persona into a routing judgment call on every finding. If a concern is genuinely separate from all three homes, route it to a follow-up ticket per `.prism/rules/followup-scope.md`.

   Edit the canonical source under `.prism/rules/` only — the build mirrors it to `.claude/`, `.codex/`, and `.cursor/`. Use `.prism/…` paths in the note (path-guard rejects platform-copy paths). Content-only; verified by the build in task 5.

### Clove (verification)

5. **Build and verify.** After tasks 1–4 land, run `pnpm prism:check` from the repo root — it runs the build in `--check` mode (fails on drift between canonical source and platform copies), runs `pnpm prism:test`, and runs the manifest verifier. If `--check` reports drift, run `pnpm prism:build` to regenerate the platform copies, then re-run `pnpm prism:check`. Confirm: tests pass, path-guard reports no violations, and the four edited surfaces are reflected in their generated `.claude/`/`.codex/`/`.cursor/` copies. Depends on tasks 1–4.

---

## Decisions

- **No dedicated `## Risks` section; risk routes to the existing section homes.**
  - **Root cause:** the proposal assumed risk findings were homeless. They aren't — Sasha's `Confidence`/`Missing evidence`/`"no correct seam"` fields, Briar/Eric's Impact × Likelihood severity, and Winston's Devil's Advocate "Watch for" each already carry a distinct slice of risk.
  - **Alternatives considered:** (a) a Winston-owned `## Risks` register populated from Devil's Advocate "Watch for," read by Sasha/Eric — viable and the strongest "add a section" variant, but it scatters the unified-risk-view benefit and still leaves Eric's review-time risk in `## Review Issues`; deferred as unnecessary for now. (b) The originally-requested `## Risks` section co-owned by Sasha **and** Eric — rejected: it has no admission criterion mutually exclusive with `## Debugged Issues` and `## Review Issues`, so it forces a routing judgment call on every finding (the exact failure the Plan Section Ownership model and ADR-0033 portability bar prevent), and it reintroduces the catch-all shape the team removed three commits ago (`e110a60`, manifest catch-all → explicit globs).
  - **Chosen approach:** sharpen the existing homes. Make the routing explicit in three skills and document the decision in the plan rule as a re-proposal tripwire. Lowest surface, zero new ambiguity.
  - **Implementation guidance:** the rule note (task 4) is the load-bearing artifact — it sits where a future contributor looks when tempted to add the section. Keep Eric's and Briar's notes phrase-aligned.
  - **→ promoted to `.prism/rules/branch-plan.md`** (task 4) — a standing decision about the plan model; trivially reversible, so it fails the triple-gated ADR criterion (gate 1, hard-to-reverse) and stays a rule note rather than an ADR.

- **Skill-body edits are Clove's; the plan-rule edit is Winston's.** Matches the lane convention in `epic-lean-skill-architecture.md` (skill `shared.md` edits → Clove; rule/ADR authoring → Winston). → no promotion needed (ownership convention already codified in `skills-ecosystem.md` § Plan Section Ownership and ADR-0018).

---

## History

- 2026-05-26 [hmcgrew/lean-skill-architecture]: Plan created from the lean-skill-architecture pilot benchmark. Winston evaluated the proposed `## Risks` section, recommended against the co-owned variant, and (per Hunter's pick) planned the "sharpen existing homes" option: explicit risk-routing notes in Sasha/Eric/Briar + a decision note in `branch-plan.md`. No Linear; no open PR.

---

## Acceptance Criteria

### Behavioral

- [ ] Given a debugger session surfaces a forward-looking hazard or low-confidence diagnosis, When findings are recorded, Then they appear in `## Debugged Issues` (via `Confidence: Low` / `Missing evidence` / `"no correct seam"`), not a separate section (REQ-1)
- [ ] Given a reviewer finds a "works, but it's fragile" issue, When it is recorded, Then it appears as a severity-ranked `## Review Issues` entry, and any forward-looking architectural risk is routed to Winston instead of a new section (REQ-1)

### Non-behavioral

- [ ] `.prism/rules/branch-plan.md` states there is no dedicated `## Risks` section and names where each class of risk finding is recorded (REQ-1)
- [ ] Sasha's, Eric's, and Briar's skill sources each route risk-flavored findings to their existing section, with Eric's and Briar's notes phrase-aligned (REQ-1)
- [ ] No new `## Risks` section is added to the plan template (REQ-1)
- [ ] Every added file-path reference uses the canonical `.prism/<area>/` form, not a platform-copy path (path-guard passes) (REQ-1)
- [ ] `pnpm prism:check` passes — platform copies in sync, tests green, manifest verified (REQ-1)

### AC Adjustments

### AC Sync Log

| Date | Agent | Action | Plan | Linear |
| ---- | ----- | ------ | ---- | ------ |
| 2026-05-26 | Winston | Generated AC | updated | N/A (no Linear) |

---

## PR Readiness

- [ ] No critical or major issues
- [ ] No new `## Risks` section introduced
- [ ] Eric/Briar risk notes phrase-aligned
- [ ] Build passes — last run: (pending)
- [ ] PR description up to date
- [ ] Decision recorded in `branch-plan.md` (promotion target for the no-Risks-section decision)

**Last updated:** 2026-05-26
