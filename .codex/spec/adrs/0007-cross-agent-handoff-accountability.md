---
Number: 0007
Title: Cross-Agent Handoff Accountability
Status: accepted
Date: 2026-04-19
---

## Context

When one skill (Sasha, Winston) prescribes a fix and another skill (Clove) applies it, the applier tends to trust the upstream work without independently verifying it. On Claude 4.7 this tendency is stronger — regression 3.1 (handoff trust erosion) documents Clove applying Sasha's diagnosis without checking the math.

Concrete failure: the MegaMenuFeaturedBanner incident, where a diagnostic agent prescribed specific pixel values and the implementing agent applied them without confirming the dimensional math produced the intended visual result. The fix shipped wrong because nobody verified the diagnosis against the symptoms.

## Decision

When an agent applies a fix or acts on a diagnosis that originated from another agent, the applying agent is accountable for its correctness — not just its application.

- Confirm that the proposed solution logically addresses the root cause, not just that it changes something.
- If the math doesn't check out or the fix doesn't match the symptoms, flag it before applying.
- This applies to every handoff — trust but verify is the standard, not a suspicion check.

Example: if a diagnostic agent prescribes specific pixel values for a layout fix, confirm the dimensional math produces the intended result rather than just applying the numbers.

## Consequences

- Positive: diagnosis-to-fix handoffs catch mismatches before they ship. The receiver is not a rubber stamp.
- Positive: every skill in a multi-agent workflow has explicit accountability for its own output correctness.
- Negative: verification is work. The receiver must hold enough context to independently validate the upstream claim, which is slower than naive application.
- Neutral: when the receiver can't verify (missing context, out-of-lane domain), the expectation is to flag the gap rather than silently trust.

## References

- `AGENTS.md § 11 Cross-Agent Handoff Accountability` — live specification with example
- `CLAUDE.md § Verification Before Implementation` — Claude-specific reinforcement
