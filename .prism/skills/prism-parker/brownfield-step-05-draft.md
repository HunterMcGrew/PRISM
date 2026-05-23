---
step: brownfield-step-05-draft
---

# Brownfield Step 05 — Draft

Synthesize the PRD from observed code + confirmed sketch + confirmed tests.

## Critical: `[INFERRED]` not `[ASSUMPTION]`

Brownfield mode uses `[INFERRED: <text>]` markers, not `[ASSUMPTION]`. The distinction is load-bearing:

- **`[ASSUMPTION]`** (greenfield) — Parker is deferring an unknown because the brain dump didn't cover it.
- **`[INFERRED]`** (brownfield) — Parker is inferring from existing code; the truth exists in the user's head but wasn't observable from the implementation.

Use `[INFERRED]` for: user intent, business rationale, downstream impact, scope boundaries, success metrics — anything the code can't tell you directly.

Every `[INFERRED]` claim also gets a numbered entry in `## Open questions`.

## Actions

1. **Synthesize sections** from observed surface + sketch + tests:
   - Problem statement → `[INFERRED]`
   - Target users → `[INFERRED]` (or observable from auth/permission patterns)
   - Success metrics → `[INFERRED]` (or observable from telemetry calls)
   - Scope → observable (in = what code does; out = test limit cases; won't = empty in brownfield)
   - User journeys → observable (trace code paths)
   - Requirements functional → observable (one per public API method)
   - Requirements non-functional → observable (test surfaces from step-04)
   - Constraints → partial (deps observable; business `[INFERRED]`)
   - Open questions → enumerate every `[INFERRED]`
   - Stakeholders → `[INFERRED]`

2. **Tag inferred claims** inline as `[INFERRED-1]` through `[INFERRED-N]`; enumerate in `## Open questions`.

3. **Update PRD frontmatter:** append `brownfield-step-05-draft` to `stepsCompleted`. `lastEdited: <ISO 8601>`.

4. **Confirm to user:** "Brownfield draft complete with `<N>` inferred claims tagged for validation. Review next."

## Exit condition

All 10 PRD sections present. `[INFERRED]` markers tagged inline and enumerated. No `[ASSUMPTION]` markers. Advance to step-06-review.
