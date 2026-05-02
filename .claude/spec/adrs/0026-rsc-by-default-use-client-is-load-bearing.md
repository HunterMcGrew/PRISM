---
Number: 0026
Title: RSC by Default; "use client" is Load-Bearing
Status: accepted
Date: 2026-04-29
---

## Context

The Next.js App Router runs every component as a React Server Component unless the file (or a file in its import tree) declares `"use client"`. The directive is the boundary between two runtimes — RSC code runs on the server, never ships, has full server-only API access; `"use client"` code runs in the browser bundle and must obey serialization, browser-API, and bundle-size constraints.

The directive is also viral. Anything imported from a `"use client"` file becomes part of the client bundle — utilities, constants, types-with-runtime, helper functions, even icons. The bundler walks the full import tree from each `"use client"` entry point. A single misplaced `"use client"` at the top of a wrapper component can pull `ServiceFactory`, Apollo, an entire icon library, or 50KB of date-formatting utilities into the client bundle without anyone noticing — the page renders, types pass, tests pass, and the regression is invisible until someone profiles bundle size.

The team has hit this class of issue repeatedly in concrete ways:

- **THR-1591 / ADR-0025** — constants exported from a `"use client"` component shipped as opaque proxies to RSC consumers. Lookups silently fell through. The fix was to move constants to a plain module so RSC code reads the real object.
- **THR-1573-era refactor** (lessons.md 2026-03-21) — removing `"use client"` from a parent component dropped `@dnd-kit` from the visitor bundle entirely. The DnD library wasn't doing anything on the visitor side; it was riding along because the parent was marked client.
- **Recurring review pattern** — components are reflexively marked `"use client"` because they need a hook, when only a small interactive child does. The boundary climbs higher than it has to, and the cost compounds invisibly.

The narrative of "stay RSC, use thin client leaves" is in `headless-architecture.md` § RSC-First Design. ADR-0025 captures one specific anti-pattern (constants proxies). What's missing is the decision-shaped artifact at the parent rule level — the citable "we decided RSC is the default; `"use client"` is a load-bearing choice that needs justification" — that other ADRs and architect files can derive from.

## Decision

RSC is the default. Components stay server components unless they need a hook (`useState`, `useEffect`, `useContext`, custom hooks that call them), an event handler, a browser API, or a third-party library that requires the client runtime.

When client code is genuinely needed, extract **only the interactive piece** into a thin `"use client"` leaf. The parent stays RSC. The boundary lives at the smallest unit that needs it — never higher.

`"use client"` is treated as a load-bearing decision, not a stylistic one:

- Adding `"use client"` to a file is an architectural change. It shifts the file and everything it imports into the client bundle.
- Moving `"use client"` higher up the tree is also an architectural change — it widens the client surface and tends to be irreversible without bundle audits.
- Removing `"use client"` from a component is the reverse: an architectural improvement worth surfacing in PR descriptions because it can drop unrelated dependencies from the bundle (THR-1573).

Specific anti-patterns are the corollaries this rule generates — currently ADR-0025 (constants leaking as proxies). Future cases land as their own narrowly-scoped ADRs deriving from this one.

## Consequences

- **Positive:** the visitor bundle stays small. Server-only code (data access, mappers, services, large constant tables, server-side utilities) can't ride along on a client component by accident if the boundary is kept tight.
- **Positive:** RSC capabilities (server-only env vars, server-only data access, no hydration cost) stay available to most of the tree.
- **Positive:** anti-patterns like ADR-0025 (constants-as-proxies) are framed as derived from a parent rule rather than as isolated rules. New developers reading the codebase encounter the parent decision before the corollary.
- **Positive:** PR review has a clear signal — `"use client"` additions are flagged for justification, the same way new dependencies are.
- **Negative:** the wrapper pattern adds files. A button that needs an `onClick` plus a server-rendered shell is two files (the RSC wrapper + the `"use client"` button) instead of one. Worth it for the bundle protection; still real friction when sketching a new component.
- **Negative:** developers used to "everything is a client component" frameworks need to internalize the directive's transitivity. The mental model is non-obvious until the team sees a concrete bundle-size win or production bug from getting it wrong.
- **Neutral:** Backend editor blocks (running outside Next.js, in wp-admin) are unaffected by the RSC boundary mechanically — but they follow `"use client"` discipline anyway because shared frontend components need to remain RSC-safe for the visitor bundle to benefit. The directive consistency across both runtimes is the load-bearing piece.

## References

- `.claude/rules/headless-architecture.md` § RSC-First Design — the everyday rule and the wrapper pattern this ADR formalizes
- `.claude/spec/adrs/0025-use-client-constants-leak-as-proxies-in-rsc.md` — the specific anti-pattern derived from this general rule
- `.claude/lessons.md` 2026-03-21 — `"use client"` removal dropping unrelated bundle dependencies
- `.claude/architect/frontend-blocks.md`, `.claude/architect/frontend-components.md` — where the rule shows up in everyday block and component work
- `.claude/architect/caching-and-revalidation.md` — the `"use cache"` directive constraint is a corollary at the caching layer
