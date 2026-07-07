---
step: step-04-facilitate
---

# Step 04 — Facilitate the multi-voice dialogue

Generate the retro's dialogue body from the staged voices and the gathered evidence. Iris facilitates — she doesn't argue for any persona, doesn't soften disagreements, and doesn't invent dialogue.

## Grain switch

**At `per-pr` grain, skip this step's multi-voice staging entirely.** Emit the compact fidelity note instead — one line per charter item: shipped-vs-said (item 1), CI pass/fail (item 6), Eric's-review-clean (items 4/5). No dialogue, no cross-ticket topics. Step-03's two-voice floor is relaxed at this grain — a single-scope mechanical fidelity check needs no second voice. Skip directly to the "Append to state" action below with the fidelity note in place of a rendered transcript, then proceed to step-05.

**At `epic` grain, run the full multi-voice dialogue as designed below**, and open with a synthesis of the ingested per-PR fidelity notes (from step-02's `evidence` blob) before moving into the cross-ticket topics.

## Format

Each line of dialogue follows the shape:

```
<Name> (<Role>): "<dialogue>"
```

Names come from the `voices` array. Each dialogue line cites at least one evidence entry — the `## History` line, the `## Decisions` entry, the `## Debugged Issues` row, the `## Review Issues` row, or an execution-record entry (PR thread, CI conclusion, merged diff) that the voice is responding to.

## Actions

1. **Group evidence into charter-keyed topics.** Topics are the six charter items, grouped when evidence is thin:
   - **Topic 1 (did we do what we said)** — Decisions/AC vs. merged diffs and `## History` entries showing clean delivery vs. surprise.
   - **Topic 2+3 (issues/bottlenecks; actionable improvements)** — Debugged Issues, Review Issues, History entries marking re-work.
   - **Topic 4+5 (standards adherence; anything wrong)** — PR-thread findings (Eric/Briar) that never reached the plan, Review Issues, Decisions contradicted by execution-record evidence.
   - **Topic 6 (tests passing / CI record)** — CI conclusions: red cycles, late catches, cost.

   Every topic either gets dialogue grounded in cited evidence or an explicit "unanswered — <missing source>" line. A topic with no cited evidence and no charter-coverage gap recorded is a bug in step 02, not a silent skip here.

2. **For each topic, draft 2–4 lines of dialogue.** Every line is attributed to a staged voice and references the underlying evidence inline. Disagreements are mandatory when the divergences array has entries — never write a retro that papers over a real divergence the evidence captured.

3. **Surface evidence-based disagreements explicitly.** The format for a divergence line:

   ```
   <Name> (<Role>): "We picked <chosen-approach> over <rejected-alternative> in the Decision because <stated-rationale>. But <Debugged Issue / Review Issue / PR-thread / CI evidence> later showed <actual outcome>. The rationale didn't hold."
   ```

   This is the load-bearing reason Iris exists. Scripted-character retros generate pleasant fiction. Evidence-driven retros generate signal that lets the team improve.

4. **Append the rendered transcript to state.**
   ```json
   {
     "dialogue": "<full transcript as a single markdown string, or the compact fidelity note at per-pr grain>",
     "stepsCompleted": [..., "step-04-facilitate"],
     "currentStep": "step-05-action-items"
   }
   ```

## Anti-patterns

- **Don't invent dialogue.** If a voice has nothing to say about a topic (no evidence ties them to it), they stay silent on that topic.
- **Don't smooth over disagreements.** A divergence flagged in step 02 must produce a disagreement line in step 04. Surfacing it is the value.
- **Don't add personas absent from `voices`.** The retro reflects who actually showed up.
- **Don't emit an unqualified "no divergences" conclusion.** When any charter item is unanswerable, the closing line lists the unanswered items and their missing sources — full coverage: "No divergences surfaced — and all six charter items were answerable from the evidence reached. This shipped close to plan." Partial coverage: "No divergences detectable from the evidence reached — charter items <list> went unanswered (<missing or not-configured source>). Treat this as absence of evidence, not absence of drift."

## Exit condition

`dialogue` field in state contains the rendered transcript (epic grain) or the compact fidelity note (per-pr grain). At least one disagreement line exists if `evidence.divergences` is non-empty. Every charter item appears in the output — as dialogue at epic grain, as a fidelity row at per-pr grain — either answered or explicitly unanswered.
