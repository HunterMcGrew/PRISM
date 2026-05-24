---
step: step-05-action-items
---

# Step 05 — Synthesize action items

Convert the dialogue's pain points and divergences into a concrete `## Action Items` list with proposed owners.

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

4. **Walk the History** for re-work patterns. If the same area got touched 3+ times in the epic, surface that as an action item proposing a deeper structural fix.

5. **Synthesize and dedupe.** Multiple divergences pointing at the same root cause collapse into one action. Keep the action item count tight — 3–8 items is the right band for an epic retro. More than 10 means the retro is collapsing back into a task list.

6. **Append to state.**
   ```json
   {
     "actionItems": [
       { "action": "...", "proposedOwner": "Winston" },
       { "action": "...", "proposedOwner": "Clove" }
     ],
     "stepsCompleted": [..., "step-05-action-items"],
     "currentStep": "step-06-save-report"
   }
   ```

7. **Offer the Nora handoff** at the end of the step's user-facing output:

   > "Want me to hand off to Nora to file these as follow-up tickets? She'll run the scope-fit gate from `.prism/rules/followup-scope.md` on each one."

   The handoff is a proposal, not an execution. The user types Nora's name (or doesn't) when they're ready.

## Exit condition

`actionItems` array populated with 3–8 items. Each item has a proposed owner. Nora handoff offered.
