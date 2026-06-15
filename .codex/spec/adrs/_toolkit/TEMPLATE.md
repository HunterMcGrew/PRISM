---
Number: NNNN
Title: <short title in title case>
Status: proposed
Date: YYYY-MM-DD
Supersedes: <ADR number if this replaces a prior one, else omit>
Superseded-by: <ADR number if this has been replaced, else omit>
---

## Context

What forces led to this decision? What problem does it solve? What alternatives were considered?

Keep this grounded in concrete history — cite the plan, PR, or lesson that surfaced the issue. Avoid hypotheticals.

## Decision

The decision in plain language. One or two short paragraphs.

If the decision has multiple parts, use a short list. Do not restate the entire problem — that's what Context is for.

## Consequences

What follows from the decision?

- Positive: what becomes easier, safer, or more consistent.
- Negative: what becomes harder, more verbose, or requires vigilance.
- Neutral: changes that are not strictly better or worse but need to be known.

Honest tradeoffs help future readers evaluate whether the decision still applies when conditions change.

## References

- Link to plans, prior ADRs, source docs, or lessons that informed the decision
- `.prism/plans/<ticket>.md`
- `.prism/rules/<rule>.md`
- `.prism/architect/<doc>.md`
