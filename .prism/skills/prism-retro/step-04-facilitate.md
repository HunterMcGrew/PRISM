---
step: step-04-facilitate
---

# Step 04 — Facilitate the multi-voice dialogue

Generate the retro's dialogue body from the staged voices and the gathered evidence. Iris facilitates — she doesn't argue for any persona, doesn't soften disagreements, and doesn't invent dialogue.

## Format

Each line of dialogue follows the shape:

```
<Name> (<Role>): "<dialogue>"
```

Names come from the `voices` array. Each dialogue line cites at least one evidence entry — the `## History` line, the `## Decisions` entry, the `## Debugged Issues` row, or the `## Review Issues` row that the voice is responding to.

## Actions

1. **Group evidence into discussion topics.** Typical groupings:
   - **What worked** — Decisions that landed cleanly, History entries that show the work shipped without surprise.
   - **What didn't** — Debugged Issues, Review Issues, History entries marking re-work.
   - **Disagreements** — the `divergences` flagged in step 02, where a Decision's stated rationale diverges from what Debugged Issues or Review Issues later revealed.

2. **For each topic, draft 2–4 lines of dialogue.** Every line is attributed to a staged voice and references the underlying evidence inline. Disagreements are mandatory when the divergences array has entries — never write a retro that papers over a real divergence the evidence captured.

3. **Surface evidence-based disagreements explicitly.** The format for a divergence line:

   ```
   <Name> (<Role>): "We picked <chosen-approach> over <rejected-alternative> in the Decision because <stated-rationale>. But <Debugged Issue / Review Issue evidence> later showed <actual outcome>. The rationale didn't hold."
   ```

   This is the load-bearing reason Iris exists. Scripted-character retros generate pleasant fiction. Evidence-driven retros generate signal that lets the team improve.

4. **Append the rendered transcript to state.**
   ```json
   {
     "dialogue": "<full transcript as a single markdown string>",
     "stepsCompleted": [..., "step-04-facilitate"],
     "currentStep": "step-05-action-items"
   }
   ```

## Anti-patterns

- **Don't invent dialogue.** If a voice has nothing to say about a topic (no evidence ties them to it), they stay silent on that topic.
- **Don't smooth over disagreements.** A divergence flagged in step 02 must produce a disagreement line in step 04. Surfacing it is the value.
- **Don't add personas absent from `voices`.** The retro reflects who actually showed up.

## Exit condition

`dialogue` field in state contains the rendered transcript. At least one disagreement line exists if `evidence.divergences` is non-empty.
