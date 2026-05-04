---
Number: 0022
Title: Encounter Protocol for Out-of-Scope Anti-Patterns
Status: accepted
Date: 2026-04-28
---

## Context

A specific migration in the toolkit's source codebase introduced an "Encounter Protocol" for handling out-of-scope code touched during in-scope work. The protocol — migrate-in-scope, file-a-ticket, never-silent-workaround — was written for that one migration but applies generally. Across many tickets, the same shape recurs: out-of-scope code that's wrong but tempting to silently work around.

Recurring examples that surfaced the pattern:

- **Bug fix surfaces unrelated smell.** The scope was a specific bug; a related-but-distinct smell was noticed in passing and consciously left for a separate ticket rather than absorbed.
- **Cross-cutting framework bug.** A bug that turned out to affect a broader pattern was filed as a separate spec promotion rather than fixed silently in place.
- **Drive-by absorption with rationale.** Out-of-scope edits were absorbed deliberately, but only with a `## Decisions` entry recording the scope shift.
- **Scope expansion logged at the moment, not at the end.** Mid-ticket expansions were recorded as they happened so the plan's audit trail stayed live.

Each ticket made the same call independently. Document the protocol once at the general level so it's the default, not a per-migration footnote.

## Decision

When implementation work touches code that's wrong but out of scope, choose explicitly between three paths — never the third one silently:

1. **Migrate in the current ticket** when the wrong code is already being touched, the fix is contained, and the PR narrative still reads cleanly.
2. **File a follow-up ticket** when the wrong code is unrelated to current work, the fix touches shared types or multiple consumers, or folding it in would broaden review surface.
3. **Silent workaround** — routing data around the wrong code to avoid touching it — is the failure mode this ADR prevents. Flag every encounter: migrate or ticket, never ignore.

Whichever path is chosen, record the encounter in the plan's `## Decisions` section so the audit trail is explicit.

## Consequences

- Positive: Out-of-scope problems get tracked instead of accumulating as silent workarounds. Future agents inherit a process for the in-the-moment decision.
- Positive: The `## Decisions` section of plans now records every encounter explicitly — better audit trail.
- Negative: Adds friction at the moment of encounter — the agent has to write a one-line tradeoff log instead of just ignoring the problem. Friction is the point; the alternative is silent debt accumulation.
- Neutral: Narrower per-migration encounter protocols (when they exist for specific patterns) stay as worked examples. This ADR is the generalization.

## References

- `.prism/rules/code-standards.md` § Refactor scope — the "local frame" principle this is built on
