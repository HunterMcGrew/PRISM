# Sage — Framework Knowledge

> _Release communication reasoning frameworks: audience layering, the three-layer entry test, categorization decision tree, consolidation rules, breaking-change detection, release-shape recognition._

Attribution: these belong to the `prism-changelog` skill (Sage).

This is the release communication knowledge that informs Sage's decisions. Not templates to follow mechanically — reasoning frameworks that produce changelogs people actually read.

## Audience Layering

Different readers scan changelogs for different things. Sage writes for all of them simultaneously through structure and language:

| Audience               | What they scan for                                      | What matters                                                                |
| ---------------------- | ------------------------------------------------------- | --------------------------------------------------------------------------- |
| **Stakeholders / PMs** | Features, high-impact fixes, release themes             | Business impact, user-facing changes, what to communicate to dealers        |
| **Developers**         | Technical changes, breaking changes, dependency updates | PR links, specifics of what changed, migration notes                        |
| **QA / Support**       | Bug fixes, behavioral changes, regression risk          | What was broken, what's fixed, what to retest, what dealers might ask about |
| **Dealer support**     | Dealer-facing changes, known issues resolved            | What dealers will notice, what to tell dealers who ask "what changed"       |

The structure (New Features → Bug Fixes → Improvements → Other) serves all audiences because it answers the four questions they each care about in a predictable order.

## Entry Writing — The Three-Layer Test

Every changelog entry has three layers. Good entries nail all three:

1. **What changed** — the observable difference. "Equipment detail pages now show the dealer's business hours" not "Added business hours component to equipment detail resolver."
2. **Who it affects** — implied or stated. "All dealer sites" vs "admin users only" vs "sites with Advanced Search enabled."
3. **Traceability** — the PR link and ticket ID that let someone dig deeper if they need to.

Every entry needs Layer 1. Layer 2 is needed when the scope isn't obvious. Layer 3 is always needed — no entry without a PR link.

## Categorization Decision Tree

When keyword matching is ambiguous, apply this decision tree:

1. **Was something broken before?** → Bug Fix (regardless of whether the commit says "add," "update," or "fix")
2. **Can the user do something new that they couldn't before?** → New Feature
3. **Does an existing thing work better, faster, or differently?** → Improvement
4. **Is this purely internal with no user-visible effect?** → Other or omit (with explicit note)
5. **Still unclear after checking the PR?** → Other, with a flag

"Add missing validation for equipment price field" → Bug Fix (validation was missing = something was broken).
"Add equipment comparison feature" → New Feature (users can do something new).
"Update filter panel to load results without page refresh" → Improvement (existing feature works better).
"Refactor carousel test utilities" → Other / internal (no user-visible change).

## Change Consolidation Rules

Multiple commits that form one logical change should be one entry. Consolidation signals:

- **Same ${TICKET_PREFIX}-\* ticket** — almost always one entry. The ticket is the unit of work.
- **Same PR** — definitely one entry. A PR is a single shippable change.
- **Sequential PRs on the same feature** — one entry citing all PRs. "Added equipment comparison feature ([#1450], [#1455], [#1462])."
- **Follow-up fix for a feature in the same release** — merge into the feature entry. Don't list "Added X" and then "Fixed X" — that tells the reader X shipped broken. Present the final state: X works.
- **Separate follow-up fix** — if the feature shipped in a prior release and the fix is in this one, they're separate entries. The fix is a Bug Fix.

The consolidation question: "Would a reader understand this as one change or multiple?" Trust the answer.

## Breaking Change Detection

Changes that require action from downstream consumers deserve special treatment:

- **API contract changes** — endpoint shape, schema modifications, response format changes
- **Content / data schema changes** — existing stored content may need migration
- **Extension-point removals or signature changes** — downstream consumers (plugins, themes, integrations) depending on them will break
- **Dependency version bumps with breaking changes** — the transitive break matters
- **Configuration or environment changes** — new required env vars, changed defaults

When detected, add a `⚠️ Breaking Changes` section at the top of the changelog, before New Features. Each entry describes: what changed, what breaks, and what to do about it.

## Release Shape Recognition

A release has a shape — the distribution across categories tells a story:

| Shape                 | Signal                | Framing                                                        |
| --------------------- | --------------------- | -------------------------------------------------------------- |
| **Feature-heavy**     | 60%+ New Features     | "This release introduces several new capabilities..."          |
| **Stability-focused** | 60%+ Bug Fixes        | "This release focuses on stability and bug fixes..."           |
| **Polish release**    | 60%+ Improvements     | "This release improves existing functionality..."              |
| **Mixed**             | No dominant category  | No framing needed — the structure speaks                       |
| **Maintenance**       | Mostly internal/infra | "This release includes infrastructure and maintenance work..." |

Sage notices the shape and lets it inform the document structure. She doesn't editorialize, but a single-sentence framing line after the header helps the reader set expectations.
