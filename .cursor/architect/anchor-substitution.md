# Anchor Substitution

The agent-facing reference for Atlas's stub-anchor population mechanism. Lives at `scripts/ai-skills/lib/anchor-substitute.ts` with the orchestrator entry point at `scripts/ai-skills/lib/onboarding-run.ts`. Invoked from Atlas's interactive onboarding flow after rule generation — the substitution walks canonical persona sources and replaces empty stub anchors with team-derived content drawn from `OnboardingConfig`.

See [ADR-0032](../spec/adrs/0032-canonical-skill-content-is-generic.md) for the rationale — canonical sources stay generic, Atlas writes the team-specific specialization. See [ADR-0030](../spec/adrs/0030-token-substitution-at-build-time.md) for the sibling mechanism covering identifier substitution; this module is the content-shape counterpart.

## Public surface

```ts
findAnchors(content: string): Anchor[]
substituteAnchors(filePath: string, content: string, replacements: Record<string, string>): Promise<{ written: boolean; anchorsReplaced: string[] }>
substituteAnchorsAcrossSkills(repoRoot: string, contentByAnchor: Record<string, string>): Promise<Map<string, AnchorResult>>
runAnchorSubstitution(config: OnboardingConfig, repoRoot: string): Promise<AnchorSubstitutionSummary>
```

`findAnchors` is the pure parser — no filesystem, no side effects. `substituteAnchors` is the single-file write seam. `substituteAnchorsAcrossSkills` globs the canonical-source surface (`.ai-skills/skills/*/{shared,claude,codex,cursor}.md`) and runs `substituteAnchors` per file. `runAnchorSubstitution` is Atlas's entry point — it builds `contentByAnchor` from `OnboardingConfig` and delegates to the glob layer.

## Anchor schema

Anchors are paired HTML-comment markers. The open marker names the anchor; the close marker is the un-named `atlas:end` sentinel.

```
<!-- atlas:specializes-in -->
...optional default content the canonical source ships with...
<!-- atlas:end -->
```

The name matches `/^[a-z0-9-]+$/`. The HTML-comment form is invisible in rendered markdown — readers opening the canonical source see the default content; the markers around it don't render. When Atlas runs, it replaces the inner span (between open and close) with team-specific content.

Markers must be on their own line — line-start (optionally indented) and line-end. Inline prose references like `\`<!-- atlas:<name> -->\`` inside backticks are not matched, which is what lets `prism-atlas/shared.md` document the marker convention without triggering the parser.

`findAnchors` throws `AnchorParseError` on four structural violations:

- **invalid-name** — the name does not match `/^[a-z0-9-]+$/`.
- **nested-open** — a second open marker appears before the prior anchor's close.
- **missing-close** — an open marker has no matching `<!-- atlas:end -->`, or an `<!-- atlas:end -->` appears with no preceding open.
- **duplicate-name** — two open markers in one file share the same name.

The errors are distinguishable so callers can surface the specific violation. When more than one occurrence of the same content slot is needed within a file (Clove's multiple workflow-example sections, for instance), the convention is to suffix the duplicates — `workflow-example-2`, `workflow-example-3` — so each anchor stays uniquely named.

## Idempotency and atomic write

`substituteAnchors` is idempotent — running twice with the same inputs against the same on-disk content produces a byte-identical file and reports `written: false` on the second call. The check is structural (the post-substitution bytes equal the on-disk bytes), not state-tracked, so the property holds across processes and across reruns.

Writes are atomic: the new content lands in a sibling tmp file (`<name>.tmp` in the target's directory) and is renamed over the target. A process interrupted mid-write — or a failed rename — leaves either the prior file or the new one, never a half-written file. The pattern mirrors `writeOnboardingConfig`.

Unknown replacement keys (present in `replacements` but not in the file) emit a `console.warn` and don't throw — canonical sources can grow new anchors over time, and Atlas may know about anchors a given canonical source hasn't added yet. Orphan anchors (present in the file but not in `replacements`) preserve their existing default content untouched — the canonical default is the v1 fallback until a future Atlas iteration generates the team-specific value.

## How Atlas builds `contentByAnchor`

`runAnchorSubstitution` constructs the replacement map from `OnboardingConfig`:

- **`specializes-in`** — rendered from the detected stack (`config.techStack.languages` + `frameworks`). Empty when the only detected language is the `unknown` sentinel; the canonical default stays in place.
- **`domain-context`** — rendered from `config.productDomain`, trimmed. Empty when the user skips the domain prompt; the canonical default stays in place.
- **`examples` and `workflow-example`** — left empty in v1. Future Atlas iterations populate these from team artifacts (codebase patterns, existing test fixtures).

Only anchors with a non-empty value are added to the map — this is what triggers the "leave default until Atlas has something to write" behavior. An entry with an empty string would replace existing default content with a single newline, which the v1 spec treats as wrong.

## Adding a new anchor

When a canonical source needs a new team-specific slot:

1. Drop the anchor pair into the canonical source — `<!-- atlas:<name> -->` followed by optional default content followed by `<!-- atlas:end -->`. The name must be lowercase letters, digits, hyphens; the pair must not nest inside another pair.
2. Add the corresponding entry to `runAnchorSubstitution`'s `buildContentByAnchor` in `scripts/ai-skills/lib/onboarding-run.ts`. Source the value from `OnboardingConfig` — detected stack, product domain, future fields.
3. Optionally extend the tests in `scripts/ai-skills/anchor-substitute.test.ts` if the new anchor needs a substitution-shape assertion the existing tests don't cover.

When the second step is skipped, the anchor exists in the canonical source but Atlas doesn't fill it — the canonical default remains, which is the correct posture for anchors a future Atlas iteration will own.

## Design choice — HTML comments over a templating language

ADR-0030 picks build-time token substitution over a runtime templating engine for identifiers (`PRISM`, `PRISM`). The same reasoning carries over to anchors: a templating language would require a parser, a renderer, escape rules, and a debugger every contributor needs to learn. HTML comments are zero-dependency, invisible in rendered markdown, and survive copy-paste into any markdown-aware editor.

The cost: the parser has to know about its own markers and reject malformed pairs. The benefit: canonical sources stay plain markdown — an author writing one doesn't need to know the anchor mechanism exists until they reach for it.

## Who runs this module

- **Atlas** (`scripts/ai-skills/lib/onboarding-run.ts`) — the only documented caller in Phase 2. Invokes `runAnchorSubstitution` once per onboarding session, after rule generation, before the closing summary.
- **Tests** (`scripts/ai-skills/anchor-substitute.test.ts`) — exercise `findAnchors`, `substituteAnchors`, and `substituteAnchorsAcrossSkills` directly against temp-directory fixtures.

Future personas that need to walk the anchor surface (a doc-generation pass, a re-verification step) load the module the same way.
