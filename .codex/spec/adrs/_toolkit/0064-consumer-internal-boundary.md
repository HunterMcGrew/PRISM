---
Number: 0064
Title: Consumer/Internal Boundary — PRISM Ships No ADRs; Operative Kernels Distill Into the Shipped Surface
Status: accepted
Date: 2026-06-24
Supersedes: 0061
---

## Context

PRISM was extracted from "Thrive," the host codebase its personas were forged in. As the skills tokenized, a boundary question stayed unresolved: what belongs in a consumer repo that runs `npx @huntermcgrew/prism adopt`, versus what is PRISM's own institutional development record that should never leave this repo?

ADRs were the sharp edge of the question. An ADR conflates two roles: the *operative rationale* an agent needs to run a rule correctly (load-bearing — the agent must know it to behave right), and the *decision record* (PRISM's institutional memory — why we chose this over the alternative, who was consulted, what we rejected). The first is consumer-relevant; the second is not. Shipping the ADR files cross-linked PRISM-internal history into consumer repos and created dangling references — a consumer opening `See ADR-0018` lands on a decision about *PRISM's* persona-lane ownership that has nothing to do with their codebase.

Two narrower fixes were considered and rejected:

- **Ship only the cited ADRs behind an `audience` flag.** Rejected: still ships PRISM's deliberation log, and leaves a hand-maintained allowlist that drifts. The drift was already live — `0061`/`0063` had slipped into the shipped surface while the conductor ADR block was correctly withheld, proving the allowlist can't hold the line by hand.
- **Rewrite ADR citations to public GitHub URLs.** Rejected: fragile (a renumber or move → 404) and it forces every consumer to depend on PRISM's repo structure forever.

This decision is the spine of the `epic-prism-consumer-boundary` epic (11 lanes, merged 2026-06-24). It supersedes ADR-0061's *shipping posture* — 0061 granted Sol merge authority and shipped that ADR to consumers, where "this repo's owner granted Sol authority" reads as nonsense (the delivery-mechanism replacement is recorded in ADR-0066).

## Decision

PRISM ships zero of its own ADR files to consumers. The ADR *machinery* ships so consumers author their own.

1. **No PRISM ADR file reaches `templates/install/`.** Every ADR under `.prism/spec/adrs/_toolkit/` is listed in `excluded[]` in `.ai-skills/definitions/seed-curation.json`. A new internal ADR is born excluded — adding it to `excluded[]` is part of authoring it.
2. **Operative kernels distill into the shipped surface.** Each ADR that a shipped rule/skill cited has its load-bearing rationale folded into that rule/skill/reference. A consumer rule must be self-sufficient — it carries its own `**Why:**`. When a why is too large to inline without bloating the rule, it moves to a shipping reference file under `.prism/references/`, not the rule, and never to an ADR.
3. **The ADR machinery ships.** `TEMPLATE.md`, the README's triple-gated "when to write an ADR" criterion, and an empty `adrs/` directory ship. A greenfield consumer writes fresh ADRs; a brownfield consumer has Theo (the architect-doc walker) generate them from their codebase. Their `spec/adrs/` is theirs alone — no PRISM numbering to collide with.
4. **A CI gate forbids any `ADR-NNNN` reference under `templates/install/`.** `crossref-lint.ts` runs an install-ADR gate (`runInstallAdrGate`) over the install mirror; a planted dangling ADR link fails `pnpm prism:check`. Only the curated machinery files (README, the triple-gated criterion) are allowlisted. This gate is the prerequisite that made the removal safe — it catches every later slip, including bare-text mentions (`"see ADR-0018"`) which are equally confusing to a consumer with no ADR to open.

### ADR references split into two lanes, classified before any distillation

Not every `ADR-NNNN` in a shipped rule is load-bearing, and a uniform sweep mis-classifies the harmless ones. Tag each reference first, then act:

- **Load-bearing citation** — `See ADR-NNNN` backing a `**Why:**`, where the ADR carries the reasoning. Confirm the why is self-sufficient inline (it usually already is), then drop the link.
- **Illustrative example** — the ADR number is a *sample of the citation form*, not a link to follow (e.g. `e.g. "see ADR-0011" for "Eric never approves PRs"`). Genericize the PRISM-specific number/topic, keep the instruction. Mechanical; no distillation.

`writing-voice.md` is the canonical example of both lanes in one file: its load-bearing citations back its own Why and get their links dropped; its illustrative line keeps the instruction (authoring and citing your own ADRs is the intended consumer workflow) while the concrete PRISM example is genericized — a consumer's `ADR-0011` is about something else, so the specific example misleads.

## Consequences

- **Positive:** Consumer repos carry no PRISM-internal history and no dangling ADR links. The boundary is enforced by CI (`runInstallAdrGate`), not by a hand-maintained allowlist that drifts. Consumers author their own ADRs with their own numbering, free of collision.
- **Positive:** Shipped rules are self-sufficient — the deletion test from the consumer side is the audit: delete every PRISM ADR, and if a skill stops working, that skill was leaning on an ADR as a crutch. Distilling that bit in removes the crutch.
- **Negative:** The distillation is one-time manual work per cited ADR, and the self-sufficiency discipline is ongoing — every new shipped rule must carry its own why inline, never deferring it to an ADR. The CI gate enforces the structural half (no ADR ref ships); the prose-quality half (the why is actually self-sufficient) stays an authoring discipline.
- **Neutral:** PRISM's internal ADRs keep numbering, indexing, and the full record at `.prism/spec/adrs/_toolkit/` — nothing about the internal decision log changes. Only the shipping boundary moved.

## References

- `.prism/plans/epic-prism-consumer-boundary.md` — the epic this decision spines (Decisions: "PRISM ships zero of its own ADRs", "ADR references split into two lanes", "The crossref-lint relative-link gap is the prerequisite")
- ADR-0061 — Sol merge authority (superseded shipping posture; see ADR-0066 for the replacement mechanism)
- ADR-0030 — Token substitution at build time (the layer residue scrub runs through)
- ADR-0031 — Bifurcated install layout (`.prism/` canonical, `templates/install/` mirror — the boundary this gate guards)
- `scripts/ai-skills/crossref-lint.ts` — `runInstallAdrGate`, `INSTALL_ADR_MACHINERY_ALLOWLIST`
- `.ai-skills/definitions/seed-curation.json` — `excluded[]`
