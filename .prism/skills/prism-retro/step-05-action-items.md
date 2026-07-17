---
step: step-05-action-items
---

# Step 05 — Synthesize action items

Convert the dialogue's pain points and divergences into a concrete `## Action Items` list with proposed owners, plus two additional output lists this step now owns: `lessonCandidates` and `promotionCautions`.

## Grain switch

**At `per-pr` grain**, this step is lightweight: walk the fidelity note for any gap (shipped ≠ said, CI failed, review findings unaddressed) and emit at most 1–2 action items. No lesson candidates at this grain — a single ticket's fidelity gap rarely rises to a durable lesson on its own. **Promotion cautions are the exception:** run action 7 below (unchanged) against any evidence entry step-02 tagged `refutesDecision: true` — a Decision the execution record refuted needs to reach the plan-close ceremony regardless of grain, per `branch-plan.md` § Before Closing. Skip to the "Append to state" action with a short `actionItems` list (0–2 items is normal here) and a `promotionCautions` array (usually empty at this grain), and proceed to step-06.

**At `epic` grain**, run the full procedure below.

## Format

Each action item follows the shape:

```
[ ] <action> — proposed owner: <persona>
```

Owners come from the `voices` array. Don't propose owners who weren't staged — if the action falls outside the staged voices, name the persona class anyway (e.g. "proposed owner: Theo" for an architect-doc gap) and let the user decide whether to route it.

## Actions

1. **Walk the divergences first.** Every divergence in `evidence.divergences` produces at least one candidate action — either a Decision-template tightening, a downstream-persona reflex change, or a new follow-up ticket. Don't skip these; they're the entries the team will actually act on.

2. **Walk the Debugged Issues** with `status: open` or "fixed but recurring root cause." Each one is a candidate for a regression-test action, a follow-up refactor, or a rule update.

3. **Walk the Review Issues** with `status: open` or `deferred`. Same logic — open issues become action items proposing the work, deferred ones become tickets if they should resurface.

4. **Walk the execution-record evidence** — PR-thread findings that never reached the plan (charter items 4/5), CI red-cycles clustered on an area a Decision called low-risk (charter item 6). Each is a candidate action item the same way a plan-borne Debugged/Review Issue is.

5. **Walk the History** for re-work patterns. If the same area got touched 3+ times in the epic, surface that as an action item proposing a deeper structural fix.

6. **Synthesize and dedupe.** Multiple divergences pointing at the same root cause collapse into one action. Keep the action item count tight — 3–8 items is the right band for an epic retro. More than 10 means the retro is collapsing back into a task list.

7. **Draft `promotionCautions`.** For every `## Decisions` entry the execution record refuted — a PR-thread finding, a Debugged Issue, a CI pattern, or an AC-verification report row that directly contradicts the Decision's stated rationale or chosen-approach claim (tagged `refutesDecision: true` by step-02, action 7) — add an entry: `{ "decision": "<headline>", "refutedBy": "<citing evidence>" }`. Runs at both grains. These feed Winston's Decision verdict gate during plan close: a refuted Decision is promoted as corrected or demoted to a lesson, never promoted unchanged.

8. **Draft `lessonCandidates`.** Patterns that fit `.prism/lessons.md` — recurring mistakes, constraints discovered mid-epic, assumptions that turned out wrong — proposed here, not appended. Winston or the session-close mechanic appends them after the user reviews the report.

9. **Append to state.**
   ```json
   {
     "actionItems": [
       { "action": "...", "proposedOwner": "Winston" },
       { "action": "...", "proposedOwner": "Clove" }
     ],
     "promotionCautions": [
       { "decision": "...", "refutedBy": "..." }
     ],
     "lessonCandidates": [
       { "pattern": "...", "evidence": "..." }
     ],
     "stepsCompleted": [..., "step-05-action-items"],
     "currentStep": "step-06-save-report"
   }
   ```

10. **Offer the Nora handoff** at the end of the step's user-facing output:

    > "Want me to hand off to Nora to file these as follow-up tickets? She'll run the scope-fit gate from `.prism/rules/followup-scope.md` on each one."

    The handoff is a proposal, not an execution. The user types Nora's name (or doesn't) when they're ready.

## Exit condition

`actionItems` array populated (3–8 items at epic grain, 0–2 at per-pr grain). Each item has a proposed owner. `promotionCautions` is populated at both grains (usually empty at per-pr grain — non-empty only when step-02 tagged a `refutesDecision` entry). `lessonCandidates` is epic-grain only. An empty array is a valid, explicit answer, not a skipped step. Nora handoff offered.
