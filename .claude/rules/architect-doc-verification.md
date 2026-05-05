---
description: Source-verified review bar for architect docs, ADRs, and paired dev docs
paths:
  - .prism/architect/**
  - .prism/spec/adrs/**
  - docs/content/dev/architecture/**
---

# Architect Doc Verification

When authoring or reviewing an architect-class doc — an architect file (`.prism/architect/**`), an ADR (`.prism/spec/adrs/**`), or a paired dev doc (`docs/content/dev/architecture/**`) — every claim about source behavior is checked against the source as written. Glance-mode review — reading the prose without opening the files it describes — is not enough for this class of change.

**Why:** Architect-class docs are durable agent context. Architect files route via `manifest.json` and ADRs route via the `.prism/spec/adrs/*.md` manifest entry, so future agents load them as authoritative. A confident-sounding doc that drifts from source actively misleads — it's worse than no doc, because the reader trusts it. The same failure mode has surfaced on ADR text — an ADR's example list naming files that were never created — when the rule's `paths:` glob excluded ADRs. See [ADR-0023](../spec/adrs/0023-architect-docs-source-verified-review.md).

**How to apply:** When the diff includes `.prism/architect/**`, `.prism/spec/adrs/**`, or `docs/content/dev/architecture/**`, walk every claim in the doc against the cited source. Source includes anything the manifest can route to: YAML, Dockerfiles, schemas, scripts, components, blocks, hooks, services, PHP classes — whatever the doc references. Classify each claim into one of three buckets:

- **Verified** — the claim matches the source as written.
- **Diverged** — the claim contradicts the source. Flag for fix.
- **Missing** — the claim references something that doesn't exist (a file, function, flag, or behavior the source doesn't show). Flag for fix.

The bar applies to both author-side authoring and reviewer-side gating. Authors run the triage before opening the PR; reviewers re-run it on the diff.

## Drift classes covered

This rule covers two failure modes — same severity, different shape:

- **Doc vs. source.** The doc claims X about a code file; the code file does Y. The triage above (Verified / Diverged / Missing) is for this case. The rule auto-loads on `.prism/architect/**`, `.prism/spec/adrs/**`, and `docs/content/dev/architecture/**` because those are the authoring surfaces where this drift originates.

- **Citation vs. cited.** Doc A cites Doc B's framing; Doc A's restatement no longer matches what Doc B actually says. This drift originates on _citing_ surfaces — rules, `AGENTS.md`, plan history, anywhere that re-enumerates ADR or architect content. The verification mechanism for this drift lives in [`implementation-task-detail.md`](./implementation-task-detail.md) § Cite, don't restate, when overlapping existing framing — that rule is Tier 1 (always-loaded per [ADR-0033](../spec/adrs/0033-rule-loading-tiers.md)), so it's in context on every edit regardless of glob match.

If you're editing a citing surface and you touch an ADR citation or a re-enumeration of another spec doc, the Cite-Don't-Restate clause governs — re-read the cited source and verify your restatement matches.

## Who runs this rule

- **[Winston](../skills/prism-architect/SKILL.md)** — runs the triage at startup when the diff includes architect docs, and surfaces diverged/missing claims as Structural Concerns in evaluate-mode output.
- **[Eric](../skills/prism-code-review-pr/SKILL.md)** — auto-trips into source-verification mode for PR-side review on doc-class diffs.
- **[Briar](../skills/prism-code-review-self/SKILL.md)** — same auto-trip on the self-review side, before the PR opens.

Eric's and Briar's hooks share phrasing — the bar reads identically across author-side and reviewer-side surfaces.

## Severity

Diverged and missing claims are at minimum **Major**. The doc is durable agent context — every future agent that loads it inherits the wrong fact, so the blast radius is wider than a typical correctness issue.

Citation-vs-cited drift (see Drift classes covered above) carries the same severity as doc-vs-source drift — both at minimum Major.
