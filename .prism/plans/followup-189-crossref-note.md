# Plan: followup-189-crossref-note

> Closed: 2026-06-16

## Ticket

https://github.com/HunterMcGrew/PRISM/issues/189

## Goal

Add a paragraph to `install-layout.md` documenting the crossref-lint resolution model so readers understand that "crossref-lint green" means only the repo-root-absolute class resolves — not every prose cross-reference.

---

## Implementation Tasks

### Eli (documentation)

1. Add `## Cross-reference lint` section to canonical `.prism/architect/_toolkit/install-layout.md` before `## Where to look`, explaining that crossref-lint resolves only repo-root-absolute refs (`.prism/`, `scripts/`, `.ai-skills/`, `templates/`) and deliberately skips relative links authored for the consumer's installed platform tree.
2. Run `pnpm prism:build` to regenerate the three platform mirrors.
3. Backport the same section byte-faithfully to `templates/install/.prism/architect/_toolkit/install-layout.md`, preserving pre-existing intentional differences between canonical and twin.
4. Verify with `pnpm run prism:check` — must be green with no new crossref violations.

---

## Decisions

- New section placed before `## Where to look` in both canonical and twin — this is where readers already looking for "what does prism:check do?" naturally arrive after reading drift detection.
  - → no promotion needed (ticket-tactical placement choice; the section itself in install-layout.md is the durable surface)
- Twin receives the same section content as canonical (unlike dogfood-specific sections like `## First-contact adoption` which are canonical-only). The crossref-lint model applies to all consumers.
  - → no promotion needed (ticket-tactical content-scope decision; the twin section itself is the durable record)
- No literal gitignored path tokens in the prose (e.g. `.prism/.sync-manifest.json`) per the lessons.md lesson from PR #198 — the section describes the resolution model without citing a runtime-generated file.
  - → no promotion needed (codified in lessons.md from PR #198; no further promotion needed)

---

## History

- 2026-06-16 [hmcgrew/prism-189-crossref-note]: Added `## Cross-reference lint` section to install-layout.md (canonical + twin) documenting resolution model; ran prism:build to regenerate mirrors.
- 2026-06-16 [hmcgrew/prism-189-crossref-note]: Closed plan — added verdict sub-bullets to all Decisions entries; no promotions needed (crossref resolution model documented in install-layout.md itself).
