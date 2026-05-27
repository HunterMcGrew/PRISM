# Anchor Substitution

How Atlas writes per-team specializations into canonical persona sources without contaminating the canonical content. The agent-facing summary lives at [`.prism/architect/anchor-substitution.md`](../../../../.prism/architect/anchor-substitution.md); this doc walks the same surface with longer narrative and a worked example.

## The problem the module solves

PRISM ships canonical persona sources in `.ai-skills/skills/<id>/shared.md`. Those files describe the persona — what Clove specializes in, what Winston looks at, how Sasha debugs — and they get copied into platform-specific mirrors (`.claude/`, `.codex/`, `.cursor/`) on every build.

The challenge: a generic persona is harder to land than a specialized one. "Clove specializes in React, Next.js, and TypeScript" is concrete; "Clove specializes in modern frontend frameworks" is vague. But shipping "React, Next.js, and TypeScript" canonically would exclude every team that runs something else.

ADR-0032 picks the third path: canonical sources stay generic (process and persona shape), and Atlas writes the team-specific specialization at onboarding time. The anchor substitution module is the seam that makes that possible.

## The schema

Anchors are paired HTML-comment markers:

```markdown
<!-- atlas:specializes-in -->
default content the canonical source ships with, used until Atlas overwrites
<!-- atlas:end -->
```

The open marker names the anchor. The close marker is the un-named `<!-- atlas:end -->` sentinel. The name matches `/^[a-z0-9-]+$/` — lowercase letters, digits, and hyphens. No nesting, no duplicate names per file.

HTML comments are invisible in rendered markdown, so a reader opening the canonical source sees only the default content between the markers. The markers themselves don't render. This is the property that lets canonical sources stay readable to authors: they look like normal markdown until you reach for the substitution mechanism.

Markers must be on their own line — line-start (optionally indented) and line-end. This excludes inline prose references like `` `<!-- atlas:<name> -->` `` inside backticks, which is what lets `prism-onboarding/shared.md` itself document the convention without triggering the parser. (The persona that owns the convention needs to write about it.)

## The three layers

The module is layered so each piece is independently testable.

### `findAnchors` — the pure parser

```ts
findAnchors(content: string): Anchor[]
```

Walks the content and returns one descriptor per anchor pair. Pure — no filesystem, no side effects. Throws `AnchorParseError` on four structural violations:

- **invalid-name** — name does not match `/^[a-z0-9-]+$/`.
- **nested-open** — a second open marker appears before the prior close.
- **missing-close** — an open with no close, or a close with no preceding open.
- **duplicate-name** — two opens in the same file share a name.

Each error carries a `code` field discriminating the violation so callers can react differently if needed. Tests assert on the codes.

### `substituteAnchors` — the single-file write

```ts
substituteAnchors(filePath: string, content: string, replacements: Record<string, string>): Promise<{ written: boolean; anchorsReplaced: string[] }>
```

Reads the content via the parser, applies the replacement map, and writes the result back atomically. Three properties matter:

- **Idempotent.** A second run with the same inputs against the same file produces a byte-identical file and reports `written: false`. The check is structural — post-substitution bytes vs on-disk bytes — so the property holds across processes, across reruns, and across machine reboots.
- **Atomic.** The new content lands in a sibling tmp file (`<name>.tmp` in the target's directory) and is renamed over the target. A failed rename triggers a tmp cleanup. A process interrupted mid-write leaves either the prior file or the new one — never a half-written file.
- **Soft-fail on unknown keys.** A replacement key in the map that doesn't appear in the file emits a `console.warn` and proceeds — canonical sources can grow new anchors over time, and Atlas may know about anchors a given canonical source hasn't added yet. Throwing here would block onboarding when a source falls slightly behind the orchestrator's content map.

Orphan anchors — present in the file but not in `replacements` — preserve their existing default content untouched. The canonical default is the v1 fallback until a future Atlas iteration generates the team-specific value.

### `substituteAnchorsAcrossSkills` — the glob layer

```ts
substituteAnchorsAcrossSkills(repoRoot: string, contentByAnchor: Record<string, string>): Promise<Map<string, AnchorResult>>
```

Globs `.ai-skills/skills/*/{shared,claude,codex,cursor}.md` and runs `substituteAnchors` per file. Returns one `AnchorResult` per file that had at least one anchor, keyed by absolute path. Files without anchors are skipped silently — the caller doesn't need to know about unaffected files.

When the skills directory doesn't exist (an empty repo, a misconfigured install), the function returns an empty map rather than throwing. The caller treats "no anchors to touch" as a valid outcome.

## Worked example

A canonical source ships like this:

```markdown
<!-- atlas:specializes-in -->
You specialize in frontend frameworks, backend services, and test-first implementation.
<!-- atlas:end -->

## Domain Context

<!-- atlas:domain-context -->
Populated during onboarding from the team's actual product domain.
<!-- atlas:end -->
```

A reader opening this file sees the persona's generic specializations and a placeholder for domain context — readable as-is, no template syntax visible.

Atlas runs onboarding. The team is on TypeScript + React + Next.js, and the product domain is "multi-team AI agent toolkit." Atlas builds:

```ts
const contentByAnchor = {
  "specializes-in": "Languages: typescript. Frameworks: react, nextjs.",
  "domain-context": "multi-team AI agent toolkit",
};
```

After `substituteAnchorsAcrossSkills`, the file looks like:

```markdown
<!-- atlas:specializes-in -->
Languages: typescript. Frameworks: react, nextjs.
<!-- atlas:end -->

## Domain Context

<!-- atlas:domain-context -->
multi-team AI agent toolkit
<!-- atlas:end -->
```

The markers stay so Atlas can rerun on stack change. A second invocation with the same inputs produces a byte-identical file.

## How Atlas builds the replacement map

`runAnchorSubstitution` is the orchestrator entry point Atlas's shared.md calls. It constructs `contentByAnchor` from `OnboardingConfig`:

- **`specializes-in`** — rendered from `config.techStack.languages` + `frameworks`. Empty when the only detected language is the `unknown` sentinel, in which case the canonical default stays in place.
- **`domain-context`** — rendered from `config.productDomain.trim()`. Empty when the user skips the domain prompt, in which case the canonical default stays in place.
- **`examples` and `workflow-example`** — left empty in v1. Future Atlas iterations populate these from team artifacts.

Only anchors with a non-empty value are added to the map. This is the "leave the canonical default until Atlas has something better" behavior — an empty string in the map would replace existing content with a single newline, which the v1 spec rejects.

## Design choice — HTML comments, not a templating language

ADR-0030 picks build-time token substitution over a runtime templating engine for identifiers. The same reasoning carries over to anchors: a templating language would require a parser, a renderer, escape rules, and a debugger every contributor needs to learn. HTML comments are zero-dependency, invisible in rendered markdown, and survive copy-paste into any markdown-aware editor.

The cost: the parser has to know about its own markers and reject malformed pairs. The benefit: an author writing a new canonical source doesn't need to learn the anchor mechanism until they reach for it. They write markdown.

The duplicate-name rule (`workflow-example`, `workflow-example-2`, `workflow-example-3` when a file needs multiple workflow-example slots) is the one piece of policy the convention requires authors to know — and it surfaces immediately on the first run because `findAnchors` throws.

## Cross-references

- [ADR-0030](../../../../.prism/spec/adrs/0030-token-substitution-at-build-time.md) — the sibling mechanism covering identifier substitution.
- [ADR-0032](../../../../.prism/spec/adrs/0032-canonical-skill-content-is-generic.md) — the decision this module implements.
- [Stack Detection](./stack-detection.md) — produces the `DetectedStack` `runAnchorSubstitution` reads from.
- [Rule Generation](./rule-generation.md) — the sibling Phase 2 step that runs immediately before anchor substitution.
