# Plan: readme-docs-cleanup

> Closed: 2026-06-16

## Ticket

Direct maintainer request (no issue). Branch: `hmcgrew/readme-docs-cleanup`.

## Goal

Make the README user-facing by replacing internal-roadmap framing with capability-oriented content, and remove every mention of "Thrive"/"TracTru"/"SPC" from README.md and docs/.

---

## Implementation Tasks

### Eli (documentation)

1. Replace README.md `## Status` + `## Overview` with a unified `## Overview` section that leads with named personas, multi-platform sync, drop-in adoption, and Sol — in user terms with no epic/ADR references.
2. Reword README.md `## Background` to remove "Thrive" and "TracTru/thrive#1758" (private-repo link).
3. Replace `TracTru`/`tractru` example values in `docs/parameterization.md` config JSON and token table with generic `Acme`/`acme`.
4. Reframe the literal guard description in `docs/parameterization.md` generically — describe what it catches, not which origin-project tokens it looks for.
5. Drop "Thrive" from `docs/ai-skills/syncing.md` Cursor install script mention.
6. Drop "Thrive" from `docs/ai-skills/conductor.md` convergence governor defaults line.

---

## Decisions

- `## Status` folded into `## Overview` — the status content was internal-roadmap framing that a user or evaluator landing cold would not understand. The capability bullet list replaces it and is durable (doesn't reference a dated roadmap phase).
  - → no promotion needed (ticket-tactical doc restructuring; the README itself is the durable surface)
- `## Background` preserved but reworded — the origin story is still true and useful context; dropping the project-specific naming and private-repo PR link keeps the point without the reference.
  - → no promotion needed (ticket-tactical copy decision; the reworded README is the durable record)
- `TracTru`/`tractru` in parameterization.md replaced with `Acme`/`acme` — these appeared in example config JSON and the token table as illustrative values. `Acme` is a well-understood placeholder; no meaning is lost.
  - → no promotion needed (one-time substitution of origin-specific example values; the updated docs are the record)
- Literal guard description reframed generically — the guard mechanism is documented accurately; the specific tokens it watches for are an implementation detail of the guard config, not a user-facing concept.
  - → no promotion needed (doc-accuracy fix; no architectural pattern that generalizes beyond this ticket)
- Scope strictly README.md and docs/ — no edits to `.prism/`, `.ai-skills/`, `scripts/`, or the literal-allowlist itself.
  - → no promotion needed (ticket-scoping constraint, not a durable architectural rule)

---

## History

- 2026-06-16 [hmcgrew/readme-docs-cleanup]: Removed `## Status` section; rewrote `## Overview` with capability-oriented bullet list. Rewrote `## Background` without Thrive/TracTru naming.
- 2026-06-16 [hmcgrew/readme-docs-cleanup]: Replaced TracTru/tractru example values with Acme/acme in docs/parameterization.md. Reframed literal guard description generically.
- 2026-06-16 [hmcgrew/readme-docs-cleanup]: Dropped "Thrive" from docs/ai-skills/syncing.md and docs/ai-skills/conductor.md. Literal sweep confirmed zero remaining hits.
- 2026-06-16 [hmcgrew/readme-docs-cleanup]: Fixed README.md literal-guard comment (inverted direction); added plan verdict sub-bullets and closed plan.
