# Subagent Strategy

## Purpose

Keep the main context window clean by offloading work that reads a lot to produce a small answer. One task per subagent keeps execution focused.

**Why:** the main window holds the load-bearing context — the plan, the architect docs, the user's framing. Every file a subagent reads on the main window's behalf crowds that context closer to compaction. The criterion is shape, not size: a subagent earns its dispatch when the work is read-heavy and the answer is small.

**How to apply:**

- Offload research, exploration, and parallel analysis that reads a lot to produce a small answer.
- Scope one task per subagent. A subagent with a single clear task returns a clean result; a subagent juggling three returns a muddled one.
- Don't spawn subagents to verify or double-check your own work in the same pass you produced it — verification belongs in the lane that did the work. A structured review dispatched over a finished draft is a different shape: several parallel axes (product-fit, feasibility, clarity) reading a stable artifact is the read-heavy analysis this rule exists to offload, not a same-pass self-check.
- Don't dispatch for work that could have been an inline read, and when you're unsure which it is, do it yourself: an inline read that turns out to have been delegable costs one extra read, while a needless dispatch costs a round trip and a report-back that may never arrive. This doesn't cap parallel dispatch across genuinely distinct axes of one review — each axis is its own scoped task per the one-task-per-subagent bullet.
