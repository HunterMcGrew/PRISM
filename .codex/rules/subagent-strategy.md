# Subagent Strategy

## Purpose

Keep the main context window clean by offloading work that reads a lot to produce a small answer. One task per subagent keeps execution focused.

**Why:** the main window holds the load-bearing context — the plan, the architect docs, the user's framing. Every file a subagent reads on the main window's behalf crowds that context closer to compaction. The criterion is shape, not size: a subagent earns its dispatch when the work is read-heavy and the answer is small.

**How to apply:**

- Offload research, exploration, and parallel analysis that reads a lot to produce a small answer.
- Scope one task per subagent. A subagent with a single clear task returns a clean result; a subagent juggling three returns a muddled one.
- Don't spawn subagents to verify or double-check your own work in the same pass you produced it — verification belongs in the lane that did the work. This doesn't cover a structured rubric review dispatched over a finished draft (e.g. Parker's parallel product-fit/technical-feasibility/clarity subagents at `step-06-review.md`) — that's read-heavy, multi-axis analysis against a stable artifact, the shape this rule exists to offload, not a same-pass self-check.
- Don't dispatch a subagent for work that could have been an inline read — a dispatch costs a round trip and a report-back that may not come back. This doesn't cap parallel dispatch across genuinely distinct axes of the same review; each axis is its own scoped task per the bullet above.
