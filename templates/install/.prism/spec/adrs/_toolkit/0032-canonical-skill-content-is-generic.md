---
Number: 0032
Title: Canonical Skill Content Is Generic; Onboarding Writes Per-Team Specializations
Status: accepted
Date: 2026-05-03
---

## Context

Phase 1's audit of the distribution surface surfaced three categories of bleed in canonical skill sources (`.ai-skills/skills/<id>/shared.md`) and the templates copy that ships to consumer teams:

- **Language and framework specializations** in every persona's "specializes in" intro and most workflow examples — `TypeScript / React`, `WordPress block (Gutenberg)`, `PHP class-based architecture`, `useEffect`, `RSC`, `Next.js`, `Pest PHP`, `Jest`, `Apollo`, `GraphQL`. A Python/Django consumer installing PRISM gets Briar telling them she specializes in WordPress block development.
- **Equipment dealership domain context blocks** across multiple persona sources — multi-tenant blast radius, complex inventory data, mobile field use by sales reps, B2B quote flows. A non-dealership consumer team gets every persona instructed to think about dealer sites.
- **Originating-incident citations** with hardcoded `THR-NNNN` IDs. A consumer team has no way to look up `THR-1636` — the citation lands as a broken pointer.

ADR-0029 (rules self-declare) addresses how skills cite per-team rule files: they don't, the rules declare their own applicability and the agent picks them up. ADR-0030 (token substitution at build time) addresses identifier mapping: project-name and owner literals map through the `${...}` token form into per-team values. Together those two ADRs cover the mechanical bleed — file references and identifiers.

Neither covers content shape. Substituting a tech-stack identifier into prose is meaningless when the surrounding paragraph assumes the reader is on that stack. The prose was authored against one team's stack and one team's domain; substitution alone can't decouple it.

Three approaches were considered:

- **(a) Replace specifics with fictional generics** (`Acme runs 100+ retail sites...`). Still ships one team's shape baked in, just a fictional one. Doesn't generalize and doesn't serve any actual consumer team — a Python shop installing PRISM still gets retail-site framing that doesn't match their work.
- **(b) Strip specifics entirely; Atlas writes per-team during onboarding** from the team's actual codebase. Canonical content describes process and persona shape only.
- **(c) Multiple specialized variants per skill** (`prism-code-dev-react.md`, `prism-code-dev-rust.md`, etc.). Combinatorial explosion across language × framework × domain. Consumer teams whose stack doesn't match a variant lose all customization, and maintenance cost grows multiplicatively with each new skill or stack.

## Decision

Canonical skill content describes process and persona shape only — what each skill does, when it runs, what it outputs, what its handoffs look like. Per-team specializations (language and framework intros, domain context, illustrative examples drawn from the team's product) are stripped from canonical sources and written in by Atlas during onboarding when the consumer's actual codebase context is known.

Where canonical content needs a section that Atlas will fill in, the section heading stays in the canonical source as a stub anchor (e.g. `## Domain Context — populated during onboarding`). The anchor reserves the slot; Atlas writes the team's actual content into it during Phase 2 onboarding, drawing from the codebase scan.

Composes with ADR-0029: skills stay generic process definitions; rules carry team-specific checklists; Atlas wires them up. Composes with ADR-0030: token substitution handles identifier mapping; this principle handles content-shape mapping.

## Consequences

- Positive: canonical sources stop assuming the consumer's stack or domain. A Python/Django team and a Rust/Go team and a WordPress/PHP team all install the same canonical content; their team-specific specialization comes from Atlas-generated content alongside.
- Positive: persona behavior and process shape remain in one place (canonical sources). Team-specific examples and framing remain in one place (Atlas-generated content). The two don't drift because they're separated by responsibility.
- Negative: canonical content reads slightly thinner on first install, before Atlas has run. The dogfood install (PRISM on PRISM) shows this most directly — persona intros are language-agnostic until self-onboarding lands in Phase 2.
- Negative: stub anchors are a new convention contributors need to know. Canonical source authors must distinguish "process shape" content (stays here) from "team specialization" content (becomes a stub for Atlas).
- Neutral: implementation is editorial, not mechanical. Token substitution can't do this work — humans (and review agents like Briar) decide which content is per-team and which is durable.

## References

- ADR-0029 (Rules Self-Declare Their Applicability) — sibling principle covering rule references.
- ADR-0030 (Token Substitution at Build Time) — sibling mechanism covering identifier substitution.
- `.prism/rules/writing-voice.md` § Anti-pattern: Session-context leakage — the same principle applied to authoring artifacts in a session.
