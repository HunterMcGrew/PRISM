---
Number: 0061
Title: Sol Holds Standing Merge Authority for PRISM's Own Self-Development PRs
Status: accepted
Date: 2026-06-18
---

## Context

[ADR-0011](./0011-eric-never-approves-prs.md) and `git-conventions.md § Who merges` set a single, unconditional rule: merging and approving PRs is a human responsibility, on every tool and for every persona. The human clicking merge is the last gate where a wrong change can still be stopped, and approval excitement ("it's approved", "let's get it in") reads like authorization but isn't. That rule is correct for the teams PRISM is built to serve — they install PRISM into their own repo and merge their own work.

PRISM also develops *itself*. This repo is PRISM's own dogfood install: the personas build the persona system, Sol (the conductor) orchestrates lifecycle runs, and the Briar→Eric review loop runs on PRISM's own PRs before they merge to `main`. In that setting the unconditional human-merge gate creates real friction — every self-development PR that has already passed a clean review loop still stalls waiting for the repo owner to perform a mechanical merge that the review already justified.

On 2026-06-18, PRISM's architect and repo owner granted Sol standing authority to merge PRISM's own self-development PRs on their behalf, under named conditions. This grant is what the ADR records. It was first exercised across Epic #212, where Sol merged PRs #217, #221, #224, #227, and #228, each after an in-session human authorization.

The grant is narrow on purpose. It does not touch ADR-0011 as it applies to PRISM's consumers, and it does not remove the human from the loop — it relocates where the human authorizes, from "human performs every merge" to "the repo owner stands behind a conditional grant, and each session still gets an explicit yes."

## Decision

**Sol holds standing authority to merge PRISM's own self-development PRs (PRs in this repo, targeting `main`) on the repo owner's behalf — but only when both conditions hold:**

1. The Briar→Eric review loop comes back **clean**, AND
2. the PR carries **no `review:has-minors` label**.

When `review:has-minors` is present, Sol does not merge. It investigates first — re-review or fix the flagged items — and merges only once the label is cleared and the review loop is clean.

**Scope boundary — this is a repo-scoped exception, not a change to ADR-0011.** The grant applies *only* to PRISM building itself: self-development PRs in this repository. For any team that installs PRISM, merging remains an unconditional human responsibility exactly as ADR-0011 and `git-conventions.md § Who merges` describe. PRISM ships with the human-merge gate intact; this exception applies only to PRISM's own repository. The justification is specific to this repo: the architect is the repo owner, and the conductor operates under his standing authority — neither condition holds for a consumer install.

**Enforcement boundary — the human stays in the loop per session.** Standing authority that lives only in agent-maintained state (handoff docs, `conductor-state.json`, persona memory) is not honored by the Claude Code auto-mode classifier — the classifier does not treat agent-written state as authorization to execute a merge. In practice this means each session still requires an explicit in-session user authorization before a merge runs. The standing grant sets the *policy* (these PRs are mergeable by Sol under these conditions); the per-session "yes" is the *act* that authorizes the specific merge. This is not a gap to close — it is the property that keeps a human in the loop even with the standing authority in place, and it is the reason the grant is safe.

## Consequences

- **Positive:** PRISM's own clean-reviewed PRs merge without the repo owner performing every mechanical merge by hand. The conductor can close the lifecycle loop it already orchestrates, under conditions the review loop already establishes.
- **Positive:** the two named conditions (clean loop + no `review:has-minors`) make the merge call auditable. Anyone reading a merged self-development PR can confirm the gate held — the label and the review state are both visible.
- **Positive:** the scope boundary keeps ADR-0011 fully intact for consumers. PRISM's safety story for the teams that install it is unchanged; this exception is invisible to them.
- **Negative:** ADR-0011 now has a documented exception, and the exception is repo-specific. A future reader has to hold two rules at once — the unconditional gate for consumers, the conditional grant for the dogfood install. The scope boundary in this ADR is the thing that keeps them straight; if it blurs, the consumer-facing guarantee is what's at risk.
- **Negative:** the grant depends on the `review:has-minors` label being applied correctly. If the review loop fails to tag a PR that has minors, the second condition reads as satisfied when it isn't. The label discipline in the review loop is load-bearing for this grant.
- **Neutral:** the enforcement boundary means the standing authority is, in practice, a policy plus a per-session confirmation — not unattended auto-merge. If the auto-mode classifier ever did honor agent-written state, this ADR would need revisiting, because the per-session human confirmation is what currently makes the grant safe.

## References

- [ADR-0011](./0011-eric-never-approves-prs.md) — the unconditional human-merge / no-agent-approval rule this ADR carves a narrow, repo-scoped exception from. ADR-0011 remains the rule; this is the exception for PRISM's own self-development.
- `.prism/rules/git-conventions.md` § Who merges — the merge-side statement of ADR-0011; cross-references this ADR for the dogfood-install exception.
- `.prism/plans/prism-229.md` — the plan for this ADR.
- #212 (epic) — the run across which the grant was first exercised (PRs #217, #221, #224, #227, #228, each merged after an in-session authorization).
- `.ai-skills/skills/prism-conductor/` — Sol, the conductor persona that operates under this standing authority.
