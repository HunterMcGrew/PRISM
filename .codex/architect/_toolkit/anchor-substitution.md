# Anchor Substitution

The agent-facing reference for how PRISM's stub-anchor mechanism populates team-specific content. Lives at `scripts/ai-skills/lib/anchor-substitute.ts`, with the content-map builder at `scripts/ai-skills/lib/onboarding-run.ts`. Anchors substitute during output regeneration (`generatePlatformSkills` in `scripts/ai-skills/generate-skills.ts`), in memory, on every render — not by a separate Atlas-run step.

Canonical sources stay generic; the render pass writes the team-specific specialization into the rendered output only. The sibling mechanism for identifier substitution (build-time `${...}` tokens) is covered in `.prism/architect/_toolkit/install-layout.md`; this module is the content-shape counterpart.

## Public surface

```ts
findAnchors(content: string): Anchor[]
substituteAnchorsInContent(content: string, replacements: Record<string, string>): { content: string; anchorsReplaced: string[] }
substituteAnchors(filePath: string, content: string, replacements: Record<string, string>): Promise<{ written: boolean; anchorsReplaced: string[] }>
buildContentByAnchor(config: { productDomain: string }): Record<string, string>
```

`findAnchors` is the pure parser — no filesystem, no side effects. `substituteAnchorsInContent` is the pure in-memory substitution seam — no filesystem, no side effects — and is what the render pass calls. `substituteAnchors` is the single-file write primitive; it now exists as a public seam in its own right rather than a step inside a bigger orchestration, and calls `substituteAnchorsInContent` internally before writing. `buildContentByAnchor` builds the replacement map from the fields a rendered anchor actually needs — narrower than the full onboarding config, since the render-time caller (`update.ts`) holds the on-disk config shape, not an in-session onboarding one.

## Anchor schema

Anchors are paired HTML-comment markers. The open marker names the anchor; the close marker is the un-named `atlas:end` sentinel.

```
<!-- atlas:domain-context -->
...optional default content the canonical source ships with...
<!-- atlas:end -->
```

The name matches `/^[a-z0-9-]+$/`. The HTML-comment form is invisible in rendered markdown — readers opening the canonical source see the default content; the markers around it don't render. At render time, the inner span (between open and close) is replaced with team-specific content.

Markers must be on their own line — line-start (optionally indented) and line-end. Inline prose references like `\`<!-- atlas:<name> -->\`` inside backticks are not matched, which is what lets `prism-onboarding/shared.md` document the marker convention without triggering the parser.

`findAnchors` throws `AnchorParseError` on four structural violations:

- **invalid-name** — the name does not match `/^[a-z0-9-]+$/`.
- **nested-open** — a second open marker appears before the prior anchor's close.
- **missing-close** — an open marker has no matching `<!-- atlas:end -->`, or an `<!-- atlas:end -->` appears with no preceding open.
- **duplicate-name** — two open markers in one file share the same name.

The errors are distinguishable so callers can surface the specific violation. When more than one occurrence of the same content slot is needed within a file (Clove's multiple workflow-example sections, for instance), the convention is to suffix the duplicates — `workflow-example-2`, `workflow-example-3` — so each anchor stays uniquely named.

## Idempotency, ordering, and atomic write

Substitution is now trivially idempotent — the render pass reruns `substituteAnchorsInContent` from the canonical source and the consumer's current config on every regeneration, in memory, with no on-disk state to drift. There is no longer a mutated file whose byte-identity across reruns needs checking; the property that mattered before (rerun with the same inputs produces the same output) now follows directly from the function being pure.

`substituteAnchorsInContent` runs before `substituteTokens` in `generate-skills.ts`, never after. Anchor content is derived from the same config that feeds the token map, so an anchor's replacement text may legitimately carry a `${...}`-form placeholder of its own. Running tokens first would leave that placeholder unresolved and trip the leftover-token guard (`.prism/architect/_toolkit/output-guards.md`); anchors-first composes and the reverse does not. This ordering is a render-pass invariant, not an incidental call sequence — see ADR-0075.

`substituteAnchors`, the single-file write primitive, still writes atomically when called directly: the new content lands in a sibling tmp file (`<name>.tmp` in the target's directory) and is renamed over the target, mirroring `writeOnboardingConfig`. It is no longer invoked by the render pass — no persona or build step calls it on `.ai-skills/skills/**` any more, since those files are read-only inputs to the render, never write targets.

Unknown replacement keys (present in `replacements` but not in the file) emit a `console.warn` and don't throw — canonical sources can grow new anchors over time, and a given consumer's config may not carry every anchor's value. Orphan anchors (present in the file but not in `replacements`) preserve their existing default content untouched — the canonical default is the fallback until a future iteration generates the team-specific value.

## How `buildContentByAnchor` builds the replacement map

`buildContentByAnchor` constructs the map from the config fields a rendered anchor actually needs:

- The former **`specializes-in`** lane is retired: specialization blocks were removed from the skill bodies (the team's stack facts live in its generated rules and repo map), so no content is generated for it and any leftover anchor is preserved as an orphan.
- **`domain-context`** — rendered from `productDomain`, trimmed. Empty when the consumer's config carries no product domain; the canonical default stays in place.
- **`examples` and `workflow-example`** — left empty in v1. Future iterations populate these from team artifacts (codebase patterns, existing test fixtures).

Only anchors with a non-empty value are added to the map — this is what triggers the "leave default until there is something to write" behavior. An entry with an empty string would replace existing default content with a single newline, which the spec treats as wrong.

## Adding a new anchor

When a canonical source needs a new team-specific slot:

1. Drop the anchor pair into the canonical source — `<!-- atlas:<name> -->` followed by optional default content followed by `<!-- atlas:end -->`. The name must be lowercase letters, digits, hyphens; the pair must not nest inside another pair.
2. Add the corresponding entry to `buildContentByAnchor` in `scripts/ai-skills/lib/onboarding-run.ts`. Source the value from the consumer's on-disk config — detected stack, product domain, future fields.
3. Optionally extend the tests in `scripts/ai-skills/anchor-substitute.test.ts` if the new anchor needs a substitution-shape assertion the existing tests don't cover.

When the second step is skipped, the anchor exists in the canonical source but the render pass doesn't fill it — the canonical default remains, which is the correct posture for anchors a future iteration will own.

## Design choice — HTML comments over a templating language

Build-time token substitution was chosen over a runtime templating engine for identifiers (`PRISM`, `PRISM`). The same reasoning carries over to anchors: a templating language would require a parser, a renderer, escape rules, and a debugger every contributor needs to learn. HTML comments are zero-dependency, invisible in rendered markdown, and survive copy-paste into any markdown-aware editor.

The cost: the parser has to know about its own markers and reject malformed pairs. The benefit: canonical sources stay plain markdown — an author writing one doesn't need to know the anchor mechanism exists until they reach for it.

## Who runs this module

- **The render pass** (`generatePlatformSkills` in `scripts/ai-skills/generate-skills.ts`) — the only caller. Runs on every output regeneration, in every install context (PRISM's own build, a vendored toolkit checkout, an npm consumer's `update`/`adopt`), because it depends only on the consumer's config and the render seam every context already runs. Atlas runs no anchor step of its own; anchor content simply appears in the rendered roster the next time outputs regenerate.
- **Tests** (`scripts/ai-skills/anchor-substitute.test.ts`) — exercise `findAnchors`, `substituteAnchorsInContent`, and `substituteAnchors` directly against fixtures.

Future personas that need to walk the anchor surface (a doc-generation pass, a re-verification step) load the module the same way.
