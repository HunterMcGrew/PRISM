---
Number: 0017
Title: Dual-Axis Review — Correctness and Necessity
Status: accepted
Date: 2026-04-19
---

## Context

Review skills (Briar, Eric) initially focused on correctness: "does this code do what it claims?" They checked logic, edge cases, type safety, accessibility. What they missed: necessity — "does this need to exist?"

The concrete failure: `IDataAccessLayer<T, TId>` had a generic parameter (`TId`) used by only 1 of 13 repos. The interface was internally inconsistent (`getItemById` hardcoded to `string`, `getItemsByIds` used `TId`). 12+ review rounds by Briar and Eric across multiple PRs never flagged it. The user spotted it and brought it to Winston, who promoted the missing check into the skill files (recorded in `lessons.md` 2026-04-08).

Correct code can still be wrong. A generic parameter used by one consumer is not an abstraction — it's indirection. An interface that's half-generic is a contract that doesn't cohere. Review that only checks correctness misses these.

## Decision

Review covers two axes, not one:

1. **Correctness** — does the code do what it claims? (logic, edge cases, types, accessibility, tests)
2. **Necessity** — does each structural decision earn its complexity? (abstractions, generic parameters, shared utilities, wrapper components)

For every new or modified abstraction, the reviewer asks:

- Why does this exist? (one-sentence answer required)
- Who uses it? (count consumers — one is indirection, three earns the abstraction)
- What's the simpler alternative? (inline at each call site)
- Is it internally consistent? (half-generic contracts signal the abstraction doesn't fit)

This applies to structural decisions _within_ code, not the existence of new files driven by the ticket.

Flag both directions: **missed abstractions** (duplicated logic across 3+ sites, or identical data/logic over shared state at 2+ sites) AND **premature abstractions** (generic params, wrappers, helpers with only 1 consumer).

## Consequences

- Positive: review catches premature abstractions before they calcify. Wrong abstractions are expensive to remove once code depends on them.
- Positive: reviewers stay adversarial on structure, not just lines. "Is this correct?" and "should this exist?" are different questions; both get asked.
- Positive: the Necessity axis carries an offensive complement — reviewers hunt the reframe that deletes complexity, not just unjustified additions, surfaced non-blockingly via the Cleaner Paths bucket and `.prism/references/structural-remedies.md` § Preferred Remedies. Severity discipline still governs what blocks merge.
- Negative: review takes longer. Structural questions require more thought than correctness questions.
- Neutral: the 3-site threshold for pattern duplication vs. 2-site for shared state duplication is a calibration based on lessons (2026-04-08). May shift with more data.

## References

- `.prism/lessons.md` 2026-04-08 (IDataAccessLayer) — the incident that surfaced the gap
- `.prism/lessons.md` 2026-04-08 (3+ sites threshold for data duplication) — the calibration refinement
- `.claude/skills/prism-code-review-self/SKILL.md` § Justification Review
- `.claude/skills/prism-code-review-pr/SKILL.md` — Eric's matching Justification Review section
