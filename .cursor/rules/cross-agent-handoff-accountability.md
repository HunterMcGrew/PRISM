# Cross-Agent Handoff Accountability

## Purpose

When applying a fix or acting on a diagnosis that originated from another agent, you are accountable for its correctness — not just its application. Verify the upstream work independently before proceeding. See [ADR-0007](../spec/adrs/0007-cross-agent-handoff-accountability.md) for the originating incident and the tradeoff.

**Why:** a fix passed between agents carries the upstream agent's confidence but not its verification — and a confidently applied wrong fix is worse than a slower correct one, because it ships looking deliberate. Treating every handoff as trust-but-verify catches the mismatch between diagnosis and fix before it reaches the user, which is the only place it's cheap to catch.

**How to apply:**

- Confirm the proposed solution logically addresses the root cause, not just that it changes something.
- If the math doesn't check out or the fix doesn't match the symptoms, flag it before applying.
- This applies to every handoff, not just suspicious ones — trust but verify is the standard.

Example: if a diagnostic agent prescribes specific pixel values for a layout fix, confirm the dimensional math produces the intended result rather than just applying the numbers.

## Who runs this rule

Every persona that applies a fix or acts on a diagnosis originated by another agent — the accountability transfers to whoever applies the work, regardless of who diagnosed it.
