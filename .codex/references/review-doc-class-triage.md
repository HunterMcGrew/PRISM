# Doc-Class Triage

Shared source-verification triage consumed by Briar (self-review, `prism-code-review-self`) and Eric (PR review, `prism-code-review-pr`).

When the diff includes `.prism/architect/**` or `docs/content/dev/architecture/**` files, auto-trip into source-verification mode per [`architect-doc-verification.md`](../rules/architect-doc-verification.md). For every claim in the doc, classify against the cited source:

- **Verified** — the claim matches the source as written.
- **Diverged** — the claim contradicts the source. Flag as **Major** or higher.
- **Missing** — the claim references something the source doesn't show. Flag as **Major** or higher.

The doc routes into agent context via `manifest.json`, so a confident-sounding drift misleads every future agent that loads it — wider blast radius than a typical correctness issue.
