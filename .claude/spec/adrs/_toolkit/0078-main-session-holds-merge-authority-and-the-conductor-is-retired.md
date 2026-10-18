---
Number: 0078
Title: The Main Session Holds Merge Authority and the Conductor Is Retired
Status: accepted
Date: 2026-10-17
Supersedes: 0048, 0049, 0050, 0051, 0052, 0053, 0054, 0055, 0056, 0061, 0066, 0069
---

## Context

Sol, the conductor persona, took in three jobs over time. It orchestrated goal-driven runs across lanes, teams, and partitioned run-control state (ADRs 0048 to 0056). It held standing merge authority over PRISM's own PRs (ADR-0061), later moved behind the hidden `features.conductorMayMerge` flag (ADR-0066). It ratified a write lane's `done` with a deterministic pipeline stage (ADR-0069).

The AI-native SDLC intent (PRISM-499, approved 2026-10-17) changes who does that work. The main session drives each ticket through a committed artifact chain, deterministic hooks enforce the policies that must always hold, and the developer supervises by exception: approve the intent, read the PR. In that flow nothing dispatches personas in sequence, so the conductor's run-control state, dispatch schema, and fleet scheduler have no caller.

The cost of keeping it was already visible. Every persona skill carried a "When dispatched by Sol" section, and the shared startup contract quoted the canonical dispatch schema, so every session paid to load a protocol with one consumer. [ADR-0067](./0067-runtime-ratifies-verdicts.md) had already been reverted because a gate on Sol's report-back channel degraded orchestration.

The merge authority is the one conductor job that still has work to do. Without it, self-development PRs that passed a clean review loop would stall again on a mechanical merge, the friction ADR-0061 recorded, and that friction does not depend on who orchestrates.

## Decision

**The conductor is retired with no replacement, and the main session holds the merge authority ADR-0061 gave Sol.**

- The main session may squash-merge a PR when `features.mainSessionMayMerge: true`, the review loop came back clean, and the PR carries no `review:has-minors` label. These are ADR-0061's two conditions, unchanged.
- The flag keeps ADR-0066's mechanics under a new name. It is absent or false by default, never surfaced during init or onboarding, and preserved across reconfigure. Absent or false means the human merges, which is the consumer default.
- A reviewer persona or a subagent never merges, whatever the flag says.

Alternatives considered:

- **Keep the conductor for parallel lanes only.** Rejected. The intent's flow has one session doing the work, and the fleet, team, and partition machinery had no consumer outside Sol runs.
- **Keep the flag name `conductorMayMerge`.** Rejected. It names a deleted actor and would point every reader at a persona that no longer exists. A consumer who set it loses nothing, because without Sol nothing read it.
- **Return merge to the human everywhere.** Rejected. The review loop already establishes the readiness the owner would re-verify, so the stall ADR-0061 described would return.
- **Give merge to a reviewer persona.** Rejected. A reviewer who can merge stops being an independent check, which is why [ADR-0011](./0011-eric-never-approves-prs.md) keeps reviewers from approving.

ADRs 0048 to 0056, 0061, 0066, and 0069 describe conductor behavior or its delivery and are superseded. [ADR-0067](./0067-runtime-ratifies-verdicts.md) was already superseded by the enforcement-floor revert. [ADR-0068](./0068-retro-charter-and-two-grain-cadence.md) and [ADR-0073](./0073-stakes-levels-name-their-behavior.md) keep their decisions and lose one clause each, so they carry an amendment note instead.

## Consequences

- **Positive:** One session drives the work, so no dispatch schema, run-state file, or per-persona dispatch section remains. Each persona skill and the shared core got shorter.
- **Negative:** Orchestrated multi-lane runs are gone. Parallel work now means the user starting separate sessions, or the main session spawning subagents with no run-state, budget governor, or reconcile registry behind them.
- **Negative:** No dispatcher runs the retro involuntarily. The plan-close retro gate is a declinable nudge only, which was true before Sol and is true again.
- **Negative:** For self-development PRs the main session is now both author and merger. The compensating controls are the two merge conditions, which are visible on the PR, and the review loop, which runs reviewers as separate agents. ADR-0061 recorded that the auto-mode classifier ignores agent-written authority, so each session still needs an explicit in-session yes. This ADR relies on the same property and has not re-tested it for the main session.
- **Neutral:** Consumers are unchanged. The flag is absent in their config, so the human merges.
- **Neutral:** The `needs-fix`, `needs-replan`, and `found-followup-work` vocabulary still appears in persona prose. Its only defined consumer was Sol, and the per-lane skill rewrites retire it.

## References

- `.prism/plans/prism-499/intent.md` § Merging and release and § Skills
- `.prism/plans/prism-499/plan.md` § Implementation Tasks, PR 3
- [ADR-0061](./0061-sol-merge-authority.md) and [ADR-0066](./0066-sol-merge-hidden-config-capability.md), the merge authority and flag this decision moves
- [ADR-0011](./0011-eric-never-approves-prs.md), the default the flag gates an exception to
- `.prism/rules/git-conventions.md` § Who merges
- `docs/parameterization.md` § Feature flags
