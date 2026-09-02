---
Number: 0073
Title: Stakes Levels Are Renamed to Name Their Behavior
Status: accepted
Date: 2026-09-02
---

## Context

The stakes-calibration levels (`hobby` / `internal` / `launch`) named who the work was for, not what the answer changed. Asking "hobby, internal, or launch?" told the user nothing about what their answer set in motion — no reviewer rubric, no decision log, no ticket handoff at one end; a rubric that escalates and a mandatory decision log at the other. A dogfood session had to explain "internal" in prose at the moment of asking, which is exactly the friction the names themselves should have removed (GitHub issue #476).

The friction compounds because Sol reused the same three words for `autonomyPolicy` — the human-set ceiling on which gates a persona may clear for itself (ADR-0048). The names were load-bearing on two axes at once, and neither axis's label described its own behavior.

## Decision

Rename the levels to `quick` / `reviewed` / `strict`, and give the shared reference doc (`.prism/references/stakes-calibration.md`) a per-level behavior line that both Parker's calibration prompt and Sol's intake question quote verbatim rather than paraphrase. The same three words still serve two axes — Parker's PRD rigor and Sol's autonomy ceiling — each with its own one-line table, since the vocabulary genuinely carries two consequences.

Rejected: keeping the old names and only adding descriptions at the point the question is asked. The labels travel without their prompt — PRD frontmatter, `conductor-state.json`, a plan citation — and mislead everywhere the prompt isn't attached to them.

Rejected: renaming Parker's levels while leaving Sol's `autonomyPolicy` on the old words. ADR-0048 pins the two to one shared vocabulary by name; forking it costs more than the wider diff this rename already is.

## Consequences

- Positive: every prompt that asks for a level now shows what the level does, sourced from one reference doc, so the two callers can't drift apart.
- Positive: the same three words read correctly on both axes — `strict` means "gates stay human" for Sol as naturally as it means "rubric plus escalation" for Parker.
- Negative: every artifact written before the rename carries the old words, and the frozen ones (closed plans, finalized PRD bodies, accepted ADRs, retros) are not migrated — rewriting them would make the record misstate what was decided at the time. A reader of a closed plan or an accepted ADR needs the mapping note in `stakes-calibration.md` § Reading older artifacts to resolve `hobby` / `internal` / `launch` into the current vocabulary.
- Negative: a consumer repo on an older PRISM version may carry old values in its own PRD frontmatter or `conductor-state.json`, and nothing in `pnpm prism:build` translates them — the mapping note is the whole compatibility story, not a code-level shim.

## References

- GitHub issue #476 — the report that started this rename
- [ADR-0043](./0043-parker-prd-persona.md) — Parker as the PRD persona; the original `hobby` / `internal` / `launch` vocabulary
- [ADR-0048](./0048-conductor-autonomy-between-gates.md) — the decision that pins Sol's `autonomyPolicy` to Parker's stakes-calibration vocabulary by name
- `.prism/references/stakes-calibration.md` — the renamed levels and the per-level behavior lines this decision requires
- `.prism/plans/prism-476.md` — the implementation plan and Decisions this ADR promotes
