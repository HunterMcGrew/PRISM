# Plan: sol-deterministic-verification

## Ticket

https://github.com/HunterMcGrew/PRISM/issues/408

## Goal

Close the trust gap the enforcement-floor revert left open: a write-lane's `done` becomes **proposed, not accepted** until a deterministic pipeline stage ratifies it, workers gain a `needs-stronger-model` verdict so the model-escalation axis is verdict-driven and not only strike-driven, and Sol's skill carries the no-hooks anti-pattern note so the reverted design is never rebuilt.

## Source design

The proven rebuild lives in the portable-skills roster (maintained locally, outside this repo). That design was itself recovered from PRISM history:

- `44f9f2a` — verdict enum + routing (`lib/report-back.md`), route/escalate/budget steps
- `45f0198` — "autonomy between gates, never through them"
- `fec26cc` (PR #386, issue-381) — the `modelTiers` config seam (PRISM already has this; portable deferred it)
- `a1907b6` + revert series — the enforcement floor and its removal; see `epic-floor-revert.md` and superseded ADR-0067. **The hooks are the anti-pattern; the ratification goal survives as a pipeline stage.**

## Implementation Tasks

All edits are conductor spec surfaces. Run `pnpm prism:build` after canonical-source edits (regenerates `SKILL.md` + platform mirrors; enforces the 500-line body cap), then `pnpm prism:crossref-lint` and `pnpm prism:test`.

### Clove

1. **Add `needs-stronger-model` to the verdict contract in `.prism/skills/prism-conductor/lib/report-back.md`.**
   - Primary-verdict table, new row: `needs-stronger-model` — "The persona judges the task exceeds its dispatched tier — an execution-capability call, not a plan defect, not a human call. Source example: Clove reports the task is within the plan's spec but beyond the worker tier's ability to execute correctly."
   - Routing table, new row: `primary needs-stronger-model` → "re-dispatch the same lane, same persona, at `top` tier (`escalation.axis: model`); log the escalation. A lane already at `top` skips the escalation and parks at the gate (`needs-human`) with both attempts summarized."
   - Routing note, verbatim in spirit: "A bigger model does not fix a vague plan. If the worker had to guess because the plan was ambiguous, the verdict is `needs-replan` (→ Winston), not `needs-stronger-model`." (Recovers `44f9f2a:step-06-escalate.md`.)
   - Verification: read-through; grep consistency check in task 9.

2. **Add evidence fields and the proposed-not-accepted rule to `lib/report-back.md`.** New subsection after § Primary verdict, `## Evidence fields (write lanes)`:
   - Any lane that wrote files reports, alongside its verdict: `filesChanged: [paths]`, `verificationCommand: <exact command run>`, `verificationExitCode: <int>`.
   - Rationale line: evidence fields turn "I ran the tests" into a falsifiable claim the ratification stage re-checks.
   - Contract line on the `done` row: a `done` from a write-lane is **proposed, not accepted** — it advances only after deterministic ratification (step-05 § Deterministic ratification).
   - In fleet mode these are schema fields on the `agent()` report-back shape (task 5 wires that); read-lanes (review, plan, QA-plan) are exempt — no files, nothing to ratify.
   - Sequence: same edit session as task 1 (same file).

3. **Add `### Deterministic ratification` to `.prism/skills/prism-conductor/step-05-route.md`, before the routing bullets.** Contents:
   - Before routing a write-lane `done`: (a) `git diff --stat` in the lane's worktree is non-empty — an empty diff behind a `done` routes as `needs-replan` (the lane claims work that doesn't exist); (b) re-run the lane's reported `verificationCommand` and require exit 0 — **never trust the reported exit code**.
   - Doer ≠ checker: ratification is a deterministic script stage (fleet) or Sol's own re-run (conducted segments) — a doer never grades its own homework.
   - Trust asymmetry, one line: **cheaper tier in → harder gate out.** A `top`-tier plan rides on the plan-readiness firewall; a `worker`-tier code edit gets the deterministic gate *and* the review gauntlet before advancing.
   - Ratification is evidence-checking, not verdict interpretation — checking an exit code is not re-deciding the work (guards the § How Sol thinks #3 invariant; task 6 adds the matching line there).
   - Provenance line: this is ADR-0067's ratification goal relocated from Stop-hooks (reverted — `epic-floor-revert.md`) to an explicit pipeline stage that never sits on the report-back turn. Cite ADR-0069 (task 8).
   - Sequence: after tasks 1–2 (cites the evidence fields).

4. **Extend `.prism/skills/prism-conductor/step-06-escalate.md` model axis.** Change the trigger sentence to: "Triggered when the persona returns `needs-stronger-model` (the worker's own capability call) **or** when worker tier stalled the unit twice (strike 2 — Sol's count)." Add the already-at-top guard: a `top` lane cannot escalate further on this axis — route `needs-human`. Verification: the two triggers and one target read as one axis, not two.

5. **Update the canonical Claude dispatch surface `.ai-skills/skills/prism-conductor/claude.md`.** Three edits:
   - Tool routing, Bash bullet: extend "git context only" to "git context, plus re-running a lane's reported `verificationCommand` read-only during ratification — verification, not work; it does not violate Sol's no-write hard line."
   - `agent()` schema clause: the report-back `schema` includes the evidence fields (`filesChanged`, `verificationCommand`, `verificationExitCode`) for write-phase dispatches.
   - The autonomous segment: after each write-phase `agent()` stage, the script runs a deterministic ratification stage (plain script code, not an agent) per step-05 § Deterministic ratification; a failed ratification routes the lane as `needs-replan` without burning a dispatch.
   - Sequence: after task 3. Verification: `pnpm prism:build` passes the 500-line body cap.

6. **Update the canonical body `.ai-skills/skills/prism-conductor/shared.md`.** Three small edits:
   - § How Sol thinks #3 ("Route a verdict, never interpret one"): add one line — deterministic ratification of a write-lane `done` (step-05) is evidence-checking, not interpretation; routing on a re-run exit code is still routing.
   - New short subsection at the end of § Model tiering or after it, `### Enforcement is guidance + pipeline stages, never runtime hooks`: no `Stop`/`SubagentStop` gates on report-backs, no `PreToolUse` ownership guards on writes. One-sentence failure citation: gated personas spent their final turns satisfying their own gate instead of reporting back, and one dogfooding agent tried to edit the gate's own code to force a stop. Point at ADR-0067 (superseded) and `epic-floor-revert.md` for the record; ADR-0069 for the surviving design.
   - Closing Re-Orientation Battery item 4 ("Verification honesty"): extend the evidence parenthetical to include the ratification record for write lanes.
   - Sequence: after task 3. Verification: `pnpm prism:build` body cap; no `launch`/`hobby` vocabulary removed (the dial stays — see Decisions).

7. **Extend the goal-state schema in `.prism/skills/prism-conductor/lib/goal-state.md`.** Two additive v2 edits:
   - `lastVerdict` enum gains `needs-stronger-model` (both the schema block and the field note).
   - Lane gains a nullable `verification` object written at ratification: `{ "command": "string", "exitCode": 0, "diffStat": "string", "ratifiedAt": "ISO-8601" }` — absent until a write-lane `done` is ratified; field note states it's the audit record the step-10 report reads, never a routing input.
   - Sequence: after tasks 1–3. Verification: additive-migration note still holds (missing fields read as `null`).

8. **Write ADR-0069 at `.prism/spec/adrs/_toolkit/0069-deterministic-verification-is-a-pipeline-stage.md`.** Status: accepted. Context: ADR-0067's goal (runtime ratifies, model proposes) and its supersession; the portable-roster rebuild as the proving ground. Decision: proposed-not-accepted `done` for write lanes; ratification as a script stage (fleet) or Sol's own re-run (conducted); evidence fields as the falsifiable-claim contract; hooks permanently rejected on the report-back channel. Consequences: honest — the gate covers provable claims only (exit codes, diffs), never quality; flaky verification commands can bounce lanes (mitigation path: baseline reconciliation per ADR-0067's "no regression versus dispatch baseline," deferred until dogfooding shows it's needed). Passes the triple gate: hard to reverse (contract change), surprising without explanation (why not hooks), genuine trade-off (re-run cost vs. trust).
   - Sequence: parallel to tasks 1–7.

9. **Tier-table refinement — Sasha and Pixel default to `top`** (flagged default; veto before implementing). `.ai-skills/skills/prism-conductor/shared.md` § Model tiering table: add Sasha (debugging) and Pixel (design) as top-default rows with the portable rationale — judgment cannot be front-loaded out of diagnosis or design by a better plan. Update the two "opus for Winston and Eric" phrasings (`.prism/skills/prism-conductor/step-04-dispatch.md` line 7, `claude.md` final paragraph) to "for top-tier personas per the tiering table." Consumers who want cheap Sasha keep the `modelTiers.overrides` escape. Sequence: independent.

10. **Consistency sweep + full verification.** Grep `needs-stronger-model` — expected hits: `lib/report-back.md` (enum + routing), `step-05-route.md`, `step-06-escalate.md`, `lib/goal-state.md`, `claude.md` schema clause — all consistent. Grep the conductor surface for `Stop hook|SubagentStop|PreToolUse` — hits only in the anti-pattern note and ADR citations. Run `pnpm prism:build && pnpm prism:crossref-lint && pnpm prism:test`. Read the generated `.claude/skills/prism-conductor/SKILL.md` top to bottom once for internal contradictions (the Bash tool-routing line and the ratification instruction must agree). Sequence: last.

---

## Decisions

- **The autonomy dial (`launch`/`internal`/`hobby`) stays — the portable deletion is deliberately not ported.**
  - **Root cause of the divergence:** portable's deletion test — "one person, one working style, a dial permanently parked on one setting" — is true for Hunter's personal roster and false for a multi-consumer product.
  - **Alternatives considered:** full parity (hardcode `internal`). Rejected: a new team adopting PRISM legitimately starts at `launch`; the dial threads through the decision box, gate registry, and goal-state schema, so deletion is a wide blast radius for negative value.
  - **Chosen approach:** keep the dial untouched; port only the trust-hardening pieces.
  - **Implementation guidance:** task 6 explicitly verifies no `launch`/`hobby` vocabulary is removed.
- **Ratification is a pipeline stage, never a hook.** ADR-0067's goal survives; its seam does not. The Stop-hook floor sat on the report-back channel and made agents fight their own gate (`epic-floor-revert.md`). Promoted to ADR-0069 (task 8), added to `seed-curation.json` excluded list per ADR-0064 (PRISM ships no ADR files). → promoted to ADR-0069.
- **The model-escalation axis becomes two-trigger, one-target:** worker-returned `needs-stronger-model` (self-judgment) + Sol's strike-2 count. The doer's verdict picks the axis; Sol never re-diagnoses. A lane already at `top` parks instead of looping.
- **Evidence fields apply to write lanes only.** Read-lanes (review, plan, QA) produce no diff and no verification command — ratifying them is theater. The gate covers provable claims; quality stays with the review gauntlet (ADR-0067's Briar-ceiling caveat still binds: no review-quality gate, it's impossible by construction).
- **Naive exit-0 ratification is accepted for v1; baseline reconciliation is the named upgrade path.** A flaky verification command can bounce an innocent lane to `needs-replan`. Deferred until dogfooding shows it bites — recorded in ADR-0069 Consequences so the mitigation isn't re-derived.
- **Sasha and Pixel default to `top` tier (portable refinement adopted — user may veto task 9).** Diagnosis and design are judgment tasks the plan can't front-load; the `modelTiers.overrides` config seam is the consumer escape valve either way.
- **Sol re-running a verification command is verification, not work.** The no-write hard line binds writes; a read-only build/test re-run creates no artifact. The `claude.md` Bash tool-routing line is amended so the contract and the procedure agree (Structural Concern #1 from evaluate).

---

## History

- 2026-07-12 [main]: Plan created — port the portable-roster Sol trust-hardening design (needs-stronger-model verdict, evidence fields, deterministic ratification, no-hooks note) back into prism-conductor; dial kept, tiers refined. Winston evaluate + plan session.
- 2026-07-12 [huntermcgrew/sol-deterministic-verification]: Implemented all 10 tasks — `needs-stronger-model` verdict + evidence fields in `lib/report-back.md`; deterministic ratification in `step-05-route.md`; two-trigger model axis in `step-06-escalate.md`; evidence-schema + ratification-stage wiring in `claude.md`; no-hooks anti-pattern note + tiering-table Sasha/Pixel top-default rows in `shared.md`; `verification` object + enum extension in `lib/goal-state.md`; wrote ADR-0069 (added to seed-curation excluded list per ADR-0064 — new ADRs default to mirrored unless excluded). `pnpm prism:build && pnpm prism:crossref-lint && pnpm prism:test` all pass; SKILL.md read-through found no contradictions.

---

## Acceptance Criteria

### Behavioral

- [x] Given a fleet lane that wrote files reports success with its evidence fields, When the ratification stage finds an empty diff or the re-run verification command exits non-zero, Then the lane is not advanced and is routed back for re-planning. (`step-05-route.md` § Deterministic ratification)
- [x] Given a worker persona reports the task exceeds its capability tier, When Sol routes the verdict, Then the same persona is re-dispatched on the same unit at the top tier and the escalation is logged in the run state. (`lib/report-back.md` routing table, `step-06-escalate.md` model axis)
- [x] Given a worker reports it guessed because the plan was vague, When Sol routes the verdict, Then the lane goes to the architect for re-planning — not to a stronger model. (`lib/report-back.md` § Primary verdict routing note)
- [x] Given a lane already running at the top tier reports it needs a stronger model, When Sol routes the verdict, Then the lane parks for the human with both attempts summarized instead of looping. (`lib/report-back.md` routing table, `step-06-escalate.md` already-at-top guard)
- [x] Given any run in progress, When a merge, review-verdict, or plan-readiness gate is reached, Then the run pauses for its owning gate exactly as before — this work changes no gate ownership. (no edits touched gate ownership; verified by read-through)

### Non-behavioral

- [x] No hook-based enforcement introduced or implied anywhere in the edited files. (verified — `Stop hook|SubagentStop|PreToolUse` hits only in the anti-pattern note and ADR-0069 citations)
- [x] The autonomy policy dial (`launch`/`internal`/`hobby`) is unchanged. (verified — no edits touched dial vocabulary; `goal-state.md` `autonomyPolicy` field untouched)
- [x] The new verdict is consistent across the report-back contract, the routing step, the escalation step, the run-state schema, and the dispatch schema. (verified — `needs-stronger-model` greps consistently across `lib/report-back.md`, `step-05-route.md`, `step-06-escalate.md`, `lib/goal-state.md`, `shared.md`, `claude.md`)
- [x] `pnpm prism:build`, `pnpm prism:crossref-lint`, and `pnpm prism:test` all pass; the generated conductor skill body stays under the 500-line cap. (all three green; generated `.claude/skills/prism-conductor/SKILL.md` is 185 lines)

### AC Adjustments

### AC Sync Log

| Date | Agent | Action | Plan | Ticket |
| ---- | ----- | ------ | ---- | ------ |
| 2026-07-12 | Winston | Generated AC | updated | not synced — no ticket yet |

---

## Review Issues

No issues found — 2026-07-12 [huntermcgrew/sol-deterministic-verification]

Two Minor observations recorded for visibility (neither blocks PR readiness):

### Task 9 veto point not visibly confirmed

- **Severity:** minor
- **Status:** open
- **File:** `.prism/plans/sol-deterministic-verification.md:69` (task 9), `.ai-skills/skills/prism-conductor/shared.md` (Sasha/Pixel top-default rows)
- **Problem:** Task 9 was explicitly flagged "veto before implementing" in the plan, but the History entry shows it was implemented in the same pass as tasks 1–8/10 with no visible stop-and-confirm checkpoint in this session's evidence.
- **Suggested fix:** confirm with the user (Hunter) before merge that the Sasha/Pixel top-tier default is wanted; if not, revert that one table change independently of the rest of the branch.

### Stray untracked file from this Sol run

- **Severity:** minor
- **Status:** open
- **File:** `.prism/conductor/sol-deterministic-verification.md` (untracked, not part of the diff)
- **Problem:** a leftover run artifact sits in the working tree. It doesn't match the `.gitignore` conductor-state patterns (`conductor-state*.json`), so a broad `git add -A` would sweep it into a future commit.
- **Suggested fix:** delete the file, or extend `.gitignore` to cover `.prism/conductor/` if it's expected recurring output.

---

## PR Readiness

- [x] No critical or major issues — Briar self-review clean, 2026-07-12
- [ ] No stray debug artifacts — untracked `.prism/conductor/sol-deterministic-verification.md` found in working tree (see Review Issues)
- [x] All verification commands pass — `pnpm prism:build && pnpm prism:crossref-lint && pnpm prism:test` all green (Sol re-ran independently)
- [ ] PR description up to date — PR not yet opened; Sol drives the review chain before shipping
- [x] Lasting decisions promoted (ADR-0069) — written and added to `seed-curation.json` excluded list

**Last updated:** 2026-07-12 (Briar self-review)
