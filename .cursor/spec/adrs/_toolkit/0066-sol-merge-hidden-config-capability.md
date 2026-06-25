---
Number: 0066
Title: Sol-Merge Becomes a Hidden, Default-Off Config Capability
Status: accepted
Date: 2026-06-24
Supersedes: 0061
---

## Context

ADR-0061 granted Sol standing authority to merge PRISM's *own* self-development PRs, as a narrow repo-scoped exception to ADR-0011 (merge is a human responsibility). Both ADR-0061 and the carve-out prose in `git-conventions.md` shipped to consumers.

In a consumer repo that shipping reads as nonsense. "The repo owner granted Sol authority, this repo only" is a sentence about *PRISM's* governance that means nothing in a team's codebase — and worse, it ships a behavior that is on by exception rather than off by default. A consumer who never opted in inherits prose describing a merge capability they didn't ask for.

The same boundary epic that removed all PRISM ADRs from the consumer surface (ADR-0064) had to resolve what happens to the merge capability itself. Two alternatives were rejected:

- **A git config variable.** Rejected: invisible to the config schema, easy to lose on a reconfigure, no validation.
- **Leave it as prose in git-conventions.** Rejected: that *is* the current bug — prose that ships to consumers and reads as nonsense.

## Decision

Sol's merge authority becomes a `config.json` field, `features.conductorMayMerge`, absent/false by default and read only by Sol.

1. **The flag is the gate.** The shipped `git-conventions.md` "Who merges" prose becomes "Sol may merge when `features.conductorMayMerge: true`" — a single conditional with no restated conditions to drift against it. Absent or false (the default) means the human merges, on every tool and for every persona.
2. **Hidden by default.** The flag is documented only in the docs (how to enable it). It is never surfaced during init or onboarding. Sol mentions it only if asked. Reconfigure's "current config" display filters `features.conductorMayMerge` so the hidden flag stays hidden.
3. **The config write preserves unknown fields.** The write is read-merge-preserve — a reconfigure run must not silently drop the flag. This also fixes a latent data-loss bug for any field added to the schema after the write logic.
4. **ADR-0061 stays an internal record.** It is excluded from the consumer surface like every other PRISM ADR (ADR-0064). This ADR supersedes 0061's *delivery posture* — the authority survives, but it ships as a hidden config capability, not as carve-out prose plus a shipped ADR.

## Consequences

- **Positive:** Consumers get a clean default — merge is a human responsibility, full stop, with no nonsense prose about Sol's authority over PRISM's own PRs. The capability exists for any team that wants it, behind one documented flag.
- **Positive:** The flag is schema-visible and validated, surviving reconfigure via the preserve-unknown-fields write. The hidden-from-display filter keeps it out of sight for teams that never enable it.
- **Negative:** A hidden, undocumented-in-init capability is discoverable only by reading the docs — intentional, but it means a team enabling it has to know to look. The trade is deliberate: off and out of sight beats on by exception.
- **Neutral:** Sol's in-session merge behavior is unchanged when the flag is true — the auto-mode classifier still ignores agent-written authority, so each session still needs an explicit in-session "yes" (the boundary that keeps a human in the loop, from ADR-0061).

## References

- `.prism/plans/epic-prism-consumer-boundary.md` — Decision: "Sol's merge authority becomes a hidden, default-off config capability"
- ADR-0061 — Sol merge authority (the authority this preserves; delivery posture superseded here)
- ADR-0011 — Eric never approves PRs / merge is a human responsibility (the default this flag gates an exception to)
- ADR-0064 — Consumer/internal boundary (why ADR-0061 doesn't ship)
- `config.schema.json` — `features.conductorMayMerge`
- `scripts/ai-skills/lib/onboarding-config.ts` — the preserve-unknown-fields config write
- `docs/parameterization.md` § Feature flags — the consumer-facing documentation of the flag
