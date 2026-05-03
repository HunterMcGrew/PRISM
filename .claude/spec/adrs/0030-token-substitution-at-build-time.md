---
Number: 0030
Title: Token Substitution at Build Time
Status: accepted
Date: 2026-05-03
---

## Context

PRISM ships per-team customization via tokens — `${TICKET_PREFIX}`, `${ORG}`, `${PROJECT}`, `${GITHUB_OWNER}`, etc. — that resolve to team-specific values when PRISM installs into a consumer repo. The token contract is documented in `docs/parameterization.md`, which states tokens "appear in canonical sources (`.ai-skills/skills/<id>/shared.md`, `templates/install/AGENTS.md.tmpl`, etc.) and are substituted to literal values at sync time."

The Phase 1 audit surfaced that the substitution layer described by the docs does not yet exist. `scripts/ai-skills/build.ts` is byte-faithful concatenation today (`buildSkillMarkdown` at lines 96-114 assembles frontmatter + shared body + platform body and writes the result verbatim). Of the templates the docs claim are tokenized, only `templates/install/AGENTS.md.tmpl` line 33 and `templates/install/.prism/SPEC.md.tmpl` carry actual `${TOKEN}` literals. The remaining distribution files and canonical skill sources contain hardcoded `Thrive`, `tractru`, `THR-NNNN`, `thrive.<key>` literals that would ship verbatim to any consumer team.

Three approaches were considered:

- Templating language (Mustache, Handlebars). Adds a dependency for richer conditional logic that the substitution surface doesn't need — every token resolves to a literal value, no conditionals or loops involved.
- Substitution at sync time inside Atlas (Phase 2). Scatters substitution across two layers — canonical sources stay tokenized, Atlas does find/replace before writing to the consumer repo. Adds coupling between Atlas and every other consumer of canonical sources, and pushes substitution past the build-test boundary so build-time guards can't catch unmatched tokens.
- Build-time substitution from `.ai-skills/config.json`. One substitution seam, one config source. Tokens are obvious in canonical sources; consumers receive substituted output; sync-time copying is mechanical.

## Decision

Token substitution happens at build time inside `scripts/ai-skills/build.ts`. The build reads `.ai-skills/config.json`, derives the token map (per the table in `docs/parameterization.md`), and substitutes `${TOKEN}` literals in assembled markdown before writing platform outputs.

The substitution map mirrors the contract in `docs/parameterization.md` § All tokens. Derived tokens (`PROJECT_LOWERCASE`, `TICKET_PREFIX_LOWERCASE`) are computed from raw config values at substitution time.

A `scripts/ai-skills/lib/tokens.ts` module owns the derivation map and substitution function. New derived tokens are added at that single seam and documented in `docs/parameterization.md`. A regression test pins the substitution behavior against a sample config. A build-time guard fails the build if assembled output contains literal `Thrive`, `tractru`, `TracTru/thrive`, or `THR-[0-9]+` outside an explicit allowlist (frozen incident citations, fictional examples).

Implementation lands in a follow-up PR (the `prism-tokenization` branch tracked under `## Implementation Tasks > Clove (PR #3)` in `.prism/plans/epic-phase-1-foundation.md`). This ADR pre-agrees the design so the implementation PR is mechanical execution against a known plan.

## Consequences

- Positive: one substitution seam in the build pipeline. Consumer repos receive pre-substituted output; the Phase 2 sync flow is mechanical copy-with-state-tracking.
- Positive: tokens are visible in canonical sources, making per-team customization surface-level rather than implicit.
- Positive: build-time guard catches drift — if a contributor adds a literal `Thrive` to a canonical source, the build fails before the literal can ship.
- Negative: canonical sources become slightly harder to read (tokens in prose). Mitigated by the small number of tokens and their uppercase form making them visually distinct.
- Negative: the substitution layer is a build-time contract. A bug in derivation produces broken consumer installs — the regression test and the literal-Thrive guard are how we catch this before ship.
- Neutral: adding new tokens requires updating the schema (`.ai-skills/config.schema.json`), the token map (`scripts/ai-skills/lib/tokens.ts`), and the parameterization doc. Single seam keeps the cost predictable.

## References

- `docs/parameterization.md` — the token contract this ADR makes real.
- `scripts/ai-skills/build.ts` — current byte-faithful build; substitution slots in between assembly (lines 96-114) and write.
- `.prism/plans/epic-phase-1-foundation.md` § Implementation Tasks > Clove (PR #3) — the implementation plan.
- ADR-0029 (Rules Self-Declare) — sibling Phase 1 architectural decision.
