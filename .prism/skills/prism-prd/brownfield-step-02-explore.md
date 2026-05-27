---
step: brownfield-step-02-explore
---

# Brownfield Step 02 — Explore

Walk the named code area and enumerate the surface.

## Actions

1. **Identify target.** The user names a feature, module, directory, or block. If ambiguous ("the auth feature"), ask one clarifying question to land on a concrete path.
2. **Walk the target.** Use `Grep` and `Read` to enumerate:
   - Top-level files in the named directory
   - Exported symbols (functions, classes, types) — grep for `^export` (TypeScript/JS) or language-equivalent
   - Paired test files — common patterns: `<name>.test.ts`, `<name>.spec.ts`, `tests/<name>_test.py`, etc.
   - Dependency edges — files that import from the target and files the target imports from
3. **Build the observed surface.** Compose an `## Observed surface` section in scratch state (chat memory, not the PRD yet):
   - File list with one-line role-of-each
   - Public API (exported symbols + signatures where evident)
   - Test surfaces
   - Inbound dependencies (who calls this)
   - Outbound dependencies (what this calls)
4. **Update PRD frontmatter:** append `brownfield-step-02-explore` to `stepsCompleted`. `lastEdited: <ISO 8601>`.

## Exit condition

Observed surface composed in scratch state. Advance to brownfield-step-03-sketch.
