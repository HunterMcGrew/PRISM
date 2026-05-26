# Plan: add-risk-plan-1

## Ticket

None — framework change, tracked locally. (No Linear ticket; AC sync to Linear is N/A.)

## Goal

Add a `## Risks` section to the branch-plan template so forward-looking risk findings have a persistent home, written by Sasha, Briar, and Winston, with Eric contributing via his PR comment.

---

## User Stories

- As a debugger (Sasha), I want to record adjacent fragility I notice while diagnosing a bug somewhere that isn't `## Debugged Issues`, so a real future-facing concern isn't mistyped as a current defect or lost.
- As a self-reviewer (Briar), I want forward-looking "this is fragile under X" observations to have a home separate from `## Review Issues`, so code-quality defects and probabilistic risks don't blur together.
- As an architect (Winston), I want my Devil's Advocate "watch for" signals to persist in the plan instead of evaporating after the evaluation, so the team implements with the risks visible.
- As a PR reviewer (Eric), I want to surface risks in my PR comment in a shape the author can transcribe, so my findings reach the plan without me writing to someone else's branch.

---

## Design

N/A — no UI. Template/format change only.

---

## Implementation Tasks

### Clove (implementation)

1. **Add the `## Risks` section to `.prism/rules/branch-plan.md`.** Insert a new `## Risks` section in the Plan File Template, placed immediately **after** `## Review Issues` and **before** `## Acceptance Criteria` (keeps the three finding-sections — Debugged Issues, Review Issues, Risks — adjacent and scannable). Use this exact block (note: the file is token-templated — match the surrounding token style; this block has no tokens):

   ```markdown
   ## Risks

   Forward-looking concerns — something that could break under a named condition, not something that is broken now. Distinct from `## Debugged Issues` (a defect that exists now, even if root cause is only hypothesized) and `## Review Issues` (a code-quality defect in the diff as written). A risk resolves as `mitigated` / `accepted` / `realized` — never `fixed`.

   Written directly by Sasha, Briar, and Winston. Eric does not write here — he surfaces risks in his PR comment, and the author or Briar transcribes accepted ones into this section (the same handoff shape as `followup-scope.md`, where Eric frames a recommendation for Nora to act on).

   Create this section on the first risk write — do not pre-seed an empty heading (per `.prism/rules/lazy-artifacts.md`).

   ### <short risk title>

   - **Author:** `Sasha` | `Briar` | `Winston` | `Eric (via PR #N)`
   - **Likelihood:** High | Medium | Low
   - **Impact:** Critical | High | Medium | Low
   - **Status:** `open` | `mitigated` | `accepted` | `realized`
   - **Trigger:** the concrete condition under which the risk materializes — a specific scenario, not a generic warning. ("If the upstream API returns null for `items`, the card grid renders zero rows and the layout collapses" — not "the API response could be a problem.")
   - **Mitigation:** what reduces likelihood or impact, or `accepted — no action` with the one-line reason it's acceptable.
   - **Realized-as:** (optional) link to the `## Debugged Issues` entry if the risk materialized into a bug.

   The `Trigger` field is required and must name a concrete, falsifiable scenario — a risk without a trigger is a feeling, not a finding. The `Author` field keeps resolution ownership decidable in a section multiple personas write to.
   ```

   Then make two supporting edits in the same file:
   - In `## PR Readiness`, add a checklist item: `- [ ] No open risks — every ## Risks entry has reached a terminal status (mitigated / accepted / realized)`.
   - In `# Before Closing` (or `# Maintenance Expectations`), add a one-line gate: before close, every `## Risks` entry must carry a terminal status; an `open` risk blocks close the same way an `open` Debugged Issue does.

2. **Add the `## Risks` row to the ownership table in `.prism/architect/skills-ecosystem.md`.** In the `## Plan Section Ownership` table, insert a row immediately after the `## Review Issues` row:

   ```markdown
   | `## Risks`                        | Sasha, Briar, Winston (create); author/Briar transcribe Eric's PR-comment risks | Clove, Eric, Winston                        |
   ```

   Do **not** alter the existing `## Review Issues` row in this ticket (see Decision: out-of-scope crack).

3. **Create ADR-0045 at `.prism/spec/adrs/0045-branch-plan-risks-section.md`.** Use the repo ADR format (match `0014-plan-section-ownership.md` for shape). Content is fully specified in `## Decisions` below — transcribe it. Status: `accepted`, Date: `2026-05-26`. Reference ADR-0014 (extends its ownership model) and ADR-0003 (why Eric doesn't write to the plan).

4. **Update Sasha's skill source — `.ai-skills/skills/prism-debugger/shared.md`.** In the Phase 6 "Record findings in the plan" area (around the `## Debugged Issues` write instruction, ~line 339 in the generated `.claude/skills/prism-debugger/SKILL.md`), add guidance: when diagnosis surfaces a forward-looking risk that is *not* the defect being diagnosed (adjacent fragility, a condition that could break later), record it under `## Risks` using the structured format — not under `## Debugged Issues`. The diagnose-only invariant still holds; recording a risk is a plan write, not a fix.

5. **Update Briar's skill source — `.ai-skills/skills/prism-code-review-self/shared.md`.** Add guidance: forward-looking risks (fragility that isn't a current defect) go under `## Risks` with a concrete `Trigger`, not under `## Review Issues`. Briar writes `## Risks` directly (she runs on the author's own branch).

6. **Update Eric's skill source — `.ai-skills/skills/prism-code-review-pr/shared.md`.** Add guidance: Eric does **not** write `## Risks` in the plan (preserves the GitHub-only / worktree invariant). When he identifies a risk, he surfaces it in the PR summary comment under a `### Risks` subsection, framed for transcription — concrete trigger + suggested likelihood/impact — so the author or Briar can lift it into the plan's `## Risks`.

7. **Rebuild and verify.** Run `pnpm prism:build` (regenerates `.claude/` platform copies from the canonical `.prism/` and `.ai-skills/` sources, then runs `prism:test`). Confirm path-guard, literal-guard, and tests pass. Verify the generated `.claude/rules/branch-plan.md` shows the `## Risks` block with tokens substituted.

---

## Decisions

- **Risk writers are Sasha + Briar + Winston (direct); Eric contributes via PR comment.**
  - **Root cause of the design question:** the user's framing had Eric writing to the plan, but Eric reviews someone else's branch and his skill mandates GitHub-only writes (`prism-code-review-pr/SKILL.md:198`), grounded in `worktree-isolation.md` + ADR-0003.
  - **Alternatives considered:** (a) make Eric a direct plan-writer — rejected: reverses a load-bearing isolation rule for one section's convenience; (b) Sasha + Briar only — rejected: Winston's Devil's Advocate is the team's primary risk engine and those signals currently evaporate.
  - **Chosen approach:** three in-branch plan-writers (Sasha, Briar, Winston) write directly; Eric surfaces risks in his PR comment for transcription — the same handoff shape `followup-scope.md` already uses for Eric → Nora.
  - **Implementation guidance:** Eric's skill gets a `### Risks` PR-comment subsection, not a plan write. Author/Briar transcribe.
  - → promote to ADR-0045 (this ticket creates it).

- **Three-way boundary between the finding sections.** `## Debugged Issues` = a defect that exists now (even if hypothesized). `## Review Issues` = a code-quality defect in the diff as written. `## Risks` = nothing is broken yet; a named future condition could break it. Enforced by the lifecycle: risks never resolve as `fixed`. → promote to ADR-0045.

- **Risk lifecycle vocabulary: `open` / `mitigated` / `accepted` / `realized`.** Distinct from `fixed`/`deferred` because a risk is probabilistic — you reduce it, accept it, or it materializes into a bug (then `realized` + link to the Debugged Issues entry). → promote to ADR-0045.

- **Per-entry `Author` field is mandatory.** This is the first deliberately cross-work-class shared section (ADR-0014 is effectively single-owner; Review Issues' two writers are the same work-class). The `Author` field keeps resolution ownership decidable — same role the `Linear:` field plays for sync state. → promote to ADR-0045.

- **`Trigger` field is mandatory and must be a concrete scenario.** This is the section's anti-vagueness / done-condition gate — analogous to `followup-scope.md`'s done-condition requirement. A risk without a falsifiable trigger is a feeling, not a finding, and would turn the section into a junk drawer. → promote to ADR-0045.

- **Close-time terminal-status gate.** Every `## Risks` entry must reach `mitigated` / `accepted` / `realized` before plan close; an `open` risk blocks close like an `open` Debugged Issue. Surfaced as a new PR-Readiness item. Mirrors the Decision verdict gate. → promote to ADR-0045.

- **OUT OF SCOPE — ADR-0014 `## Review Issues` writer crack (follow-up).** ADR-0014's table and `skills-ecosystem.md:189` list `## Review Issues` as written by "Briar, Eric (creates)," which already contradicts Eric's GitHub-only rule. This ticket does **not** fix that row — it only avoids compounding it for `## Risks`. Done condition for the follow-up: reconcile the `## Review Issues` row (and ADR-0014) to reflect that Eric's plan-bound findings reach the plan via transcription, not direct write. Persona class: architecture (Winston). → no promotion needed here (routed to a follow-up ticket per `followup-scope.md`).

---

## History

- 2026-05-26 [hmcgrew/lean-skill-architecture]: Plan created — add `## Risks` section to the branch-plan template; writers Sasha/Briar/Winston direct, Eric via PR-comment transcription; ADR-0045 to be created. See Decisions for the writer-set rationale and the three-way section boundary.

---

## Acceptance Criteria

### Behavioral

- [ ] Given a debugging session where Sasha finds a forward-looking risk adjacent to the bug she's diagnosing, When she records her findings, Then the risk appears under `## Risks` with Author / Likelihood / Impact / Status / Trigger / Mitigation — and not under `## Debugged Issues`.
- [ ] Given a self-review where Briar spots fragility that is not a current defect, When she writes findings, Then it appears under `## Risks` with a concrete Trigger and her name in Author.
- [ ] Given Winston runs evaluate mode and produces "watch for" signals, When the plan is updated, Then those signals land under `## Risks` with status `open`.
- [ ] Given Eric reviews a PR and identifies a risk, When he posts his summary comment, Then the risk appears in a `### Risks` subsection of that comment framed for transcription, and no risk is written into the branch plan by Eric.
- [ ] Given a plan that has an `open` entry under `## Risks`, When someone attempts to close the ticket, Then close is blocked until every risk reaches a terminal status (mitigated / accepted / realized).

### Non-behavioral

- [ ] `## Risks` section added to the template in `.prism/rules/branch-plan.md`, placed after `## Review Issues` and before `## Acceptance Criteria`, with the structured entry format.
- [ ] The ownership table in `.prism/architect/skills-ecosystem.md` includes a `## Risks` row; the existing `## Review Issues` row is unchanged.
- [ ] ADR-0045 created at `.prism/spec/adrs/0045-branch-plan-risks-section.md`, referencing ADR-0014 and ADR-0003.
- [ ] `## PR Readiness` gains a "No open risks" checklist item.
- [ ] `pnpm prism:build` regenerates the `.claude/` copies; path-guard, literal-guard, and tests pass.
- [ ] No empty `## Risks` heading is pre-seeded into existing plans (per `lazy-artifacts.md`).

### AC Adjustments

### AC Sync Log

| Date | Agent | Action | Plan | Linear |
| ---- | ----- | ------ | ---- | ------ |
| 2026-05-26 | Winston | Generated AC | updated | N/A (no ticket) |

---

## Cleanup Items

- None.

---

## PR Readiness

- [ ] No critical or major issues
- [ ] No stray debug artifacts
- [ ] `## Risks` block renders correctly in the generated `.claude/rules/branch-plan.md` after build
- [ ] Build passes — last run: not yet run
- [ ] ADR-0045 cross-references ADR-0014 and ADR-0003
- [ ] Lasting decisions promoted (ADR-0045 is the promotion target)

**Last updated:** 2026-05-26

---

## Risks

Forward-looking concerns — something that could break under a named condition, not something that is broken now. (This section is also the live dogfood of the feature this plan ships.)

### Risk section becomes a junk drawer

- **Author:** Winston
- **Likelihood:** Medium
- **Impact:** Medium
- **Status:** `open`
- **Trigger:** if the first 2–3 real plans show `## Risks` entries indistinguishable from Low-severity Review Issues or Hypothesized Debugged Issues, the three-way boundary failed in practice.
- **Mitigation:** the mandatory `Trigger` field and the explicit boundary text in the template + ADR-0045. Watch the first few plans that use the section; if entries blur, sharpen the boundary or retire the section.

### Multi-writer attribution erodes

- **Author:** Winston
- **Likelihood:** Low
- **Impact:** Medium
- **Status:** `open`
- **Trigger:** if entries accumulate without an `Author` value, resolution ownership goes ambiguous and risks rot unclosed.
- **Mitigation:** `Author` is a required field; the close-time terminal-status gate forces disposition before the plan deletes.
