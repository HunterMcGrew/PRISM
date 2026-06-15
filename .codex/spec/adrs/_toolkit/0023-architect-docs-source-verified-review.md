---
Number: 0023
Title: Architect Docs Require Source-Verified Review
Status: accepted
Date: 2026-04-28
---

## Context

A `.prism/architect/` doc shipped through glance-mode review on a small-diff PR. A deeper Winston audit caught five substantive accuracy gaps post-merge — claims about install asymmetry, missing prerequisites, undocumented dual-purpose env vars, undocumented skip behavior, and misleading phrasing.

Glance review was right-sized for the change *count* — the diff was small. It was wrong-sized for the change *class*. Architect docs route into agent context via `manifest.json` and load as authoritative every time a relevant edit happens. A confident-sounding doc that drifts from source actively misleads every future agent that reads it — worse than no doc, because the reader trusts it.

The same shape applies to paired dev docs at `docs/content/dev/architecture/**` — they're the human-readable companions to architect files and carry the same trust contract.

A `review:source-verified` GitHub label was considered as a process gate. Rejected — the label adds ceremony without changing behavior. The bar lives in the rule and the skills, not in repository chrome.

## Decision

Architect docs (`.prism/architect/**`) and paired dev docs (`docs/content/dev/architecture/**`) require source-verified review by both author and reviewer. Glance is not sufficient for this class of change.

The verification procedure walks every claim in the doc against the cited source — anything the manifest can route to: configuration files, schemas, scripts, components, services, classes, hooks. Each claim classifies as **verified** (matches source), **diverged** (contradicts source), or **missing** (references something that doesn't exist). Diverged and missing claims are at minimum **Major** severity.

The bar is codified across three surfaces:

- [`.prism/rules/architect-doc-verification.md`](../../rules/architect-doc-verification.md) — the rule.
- Winston's startup adds an architect-doc lane that runs the triage automatically when the diff touches the relevant paths.
- Eric and Briar auto-trip into source-verification mode on doc-class diffs, with shared phrasing so the bar reads identically across author-side and reviewer-side surfaces.

## Consequences

- Positive: claims stay grounded in source. Future agents inherit a verified record, not a confident-sounding drift.
- Positive: the rule applies to authoring, not just reviewing — the author verifies before opening the PR, so gaps are caught before review.
- Negative: review takes longer on doc PRs. The cost is real, and worth it — agents read these docs every time the manifest routes them.
- Neutral: the bar applies only to architect docs and paired dev docs. Other documentation classes (user guides, getting-started, reference) keep their existing review depth.

## References

- [`.prism/rules/architect-doc-verification.md`](../../rules/architect-doc-verification.md) — the rule this ADR backs.
- [ADR-0024](0024-branch-plan-decisions-record-the-why.md) — sibling decision, governs plan-entry depth.
