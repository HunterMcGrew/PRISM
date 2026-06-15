---
paths:
  - ".prism/architect/**/*.md"
  - "docs/content/dev/architecture/**/*.md"
---

# Architect Doc Verification

When authoring or reviewing an architect doc (`.prism/architect/**`) or its paired dev doc (`docs/content/dev/architecture/**`), every claim about source behavior is checked against the source as written. Glance-mode review — reading the prose without opening the files it describes — is not enough for this class of change.

**Why:** Architect docs are durable agent context. The `manifest.json` routes them into every relevant edit, so future agents load them as authoritative. A confident-sounding doc that drifts from source actively misleads — it's worse than no doc, because the reader trusts it. An early-Phase architect doc shipped with several accuracy gaps because the PR received glance review — right-sized for the change count, wrong-sized for the change class. See [ADR-0023](../spec/adrs/_toolkit/0023-architect-docs-source-verified-review.md).

**How to apply:** When the diff includes `.prism/architect/**` or `docs/content/dev/architecture/**`, walk every claim in the doc against the cited source. Source includes anything the manifest can route to: YAML, Dockerfiles, schemas, scripts, components, blocks, hooks, services, PHP classes — whatever the doc references. Classify each claim into one of three buckets:

- **Verified** — the claim matches the source as written.
- **Diverged** — the claim contradicts the source. Flag for fix.
- **Missing** — the claim references something that doesn't exist (a file, function, flag, or behavior the source doesn't show). Flag for fix.

The bar applies to both author-side authoring and reviewer-side gating. Authors run the triage before opening the PR; reviewers re-run it on the diff.

## Who runs this rule

- **[Winston](../skills/prism-architect/SKILL.md)** — runs the triage at startup when the diff includes architect docs, and surfaces diverged/missing claims as Structural Concerns in evaluate-mode output.
- **[Eric](../skills/prism-code-review-pr/SKILL.md)** — auto-trips into source-verification mode for PR-side review on doc-class diffs.
- **[Briar](../skills/prism-code-review-self/SKILL.md)** — same auto-trip on the self-review side, before the PR opens.

Eric's and Briar's hooks share phrasing — the bar reads identically across author-side and reviewer-side surfaces.

## Severity

Diverged and missing claims are at minimum **Major**. The doc is durable agent context — every future agent that loads it inherits the wrong fact, so the blast radius is wider than a typical correctness issue.

Re-enumeration drift in an architect doc — when the doc re-enumerates a concept owned by another doc and the enumerations disagree — counts as a diverged claim under this severity bar. Same Major minimum. See [implementation-task-detail.md](./implementation-task-detail.md) § Cite, don't restate, when overlapping existing framing.
