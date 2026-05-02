---
Number: 0022
Title: Encounter Protocol for Out-of-Scope Anti-Patterns
Status: accepted
Date: 2026-04-28
---

## Context

ADR-0019 introduced an "Encounter Protocol" specifically for `url: string` block attributes during the ILink migration. The protocol — migrate-in-scope, file-a-ticket, never-silent-workaround — was written for that one migration but applies generally. Across the plan archive, the same shape recurs: out-of-scope code that's wrong but tempting to silently work around.

- THR-1422 — search input scroll lock. The original scope was an unrelated bug; the scroll-lock smell was noticed in passing and consciously left for a separate ticket rather than absorbed.
- THR-1614 — promotions block `useSelect` registry bug. The cross-registry pattern was discovered; the broader rule was filed as a separate spec promotion rather than fixed silently in place.
- THR-1655 — drive-by alignment fixes. Out-of-scope alignment edits were absorbed deliberately, but only with a `## Decisions` entry recording the scope shift.
- THR-1632 — ADR corpus extension. Scope expansions were logged as they happened, not at the end.

Each ticket made the same call independently. Document the protocol once at the general level so it's the default, not a per-migration footnote.

## Decision

When implementation work touches code that's wrong but out of scope, choose explicitly between three paths — never the third one silently:

1. **Migrate in the current ticket** when the wrong code is already being touched, the fix is contained, and the PR narrative still reads cleanly.
2. **File a Linear ticket** when the wrong code is unrelated to current work, the fix touches shared types or multiple consumers, or folding it in would broaden review surface.
3. **Silent workaround** — routing data around the wrong code to avoid touching it — is the failure mode this ADR prevents. Flag every encounter: migrate or ticket, never ignore.

Whichever path is chosen, record the encounter in the plan's `## Decisions` section so the audit trail is explicit.

## Consequences

- Positive: Out-of-scope problems get tracked instead of accumulating as silent workarounds. Future agents inherit a process for the in-the-moment decision.
- Positive: The `## Decisions` section of plans now records every encounter explicitly — better audit trail.
- Negative: Adds friction at the moment of encounter — the agent has to write a one-line tradeoff log instead of just ignoring the problem. Friction is the point; the alternative is silent debt accumulation.
- Neutral: ADR-0019's narrower Encounter Protocol stays as the worked example for ILink migrations specifically. ADR-0022 is the generalization; ADR-0019 keeps its scope-specific version with a pointer to ADR-0022.

## References

- `.claude/spec/adrs/0019-block-links-use-ilink.md` § Encounter Protocol — the origin
- `.claude/plans/archive/thr-1422.md` — search input scope de-escalation
- `.claude/plans/archive/thr-1614.md` — promotions block out-of-scope flag
- `.claude/plans/archive/thr-1655.md` — drive-by alignment, documented absorption
- `.claude/plans/archive/thr-1632.md` — ADR corpus extension, scope expansions logged
- `.claude/rules/code-standards.md` — the "do not refactor unrelated code" principle this is built on
