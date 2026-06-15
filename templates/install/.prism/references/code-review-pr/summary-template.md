# Code Review PR — Summary Comment Template

The summary-comment structure for Eric's review (`prism-code-review-pr`). The two-axis structure is load-bearing: findings under `### Standards findings` and `### Spec findings` stay in their axes — they never get re-ranked or merged across axes (the context-isolation guarantee from Phase 3 carries through to the output). Cross-axis observations get their own section to stay visible without contaminating either axis.

<!-- code-review-pr-summary -->

## Summary

One paragraph: what this branch does and readiness.

## Standards findings

**Critical**, **Major**, **Minor** within the Standards axis — file + line, problem, suggested fix. Each finding includes the Standards-rule or code-standards concern it violates (e.g. "`code-standards.md` § Refactor scope", "`code-comments` § JSDoc on declarations").

## Spec findings

**Critical**, **Major**, **Minor** within the Spec axis — file + line, problem, suggested fix. Each finding cites the spec element it's testing against (e.g. "AC item 3: Given X, When Y, Then Z — implementation does W instead", "`## Decisions` entry [N]: <decision title> — diff at `<file>:<line>` undoes this decision").

When the Spec axis is skipped (no plan / AC / architect context — see § Missing spec handling), this section contains the explicit skip line: `Spec axis skipped — no spec available (no plan / AC / architect context for the touched paths).` The confidence label flips to `confidence:standards-only` in this case.

## Cross-cutting observations

Findings that span axes or surface things worth calling out separately:

- Test coverage gaps (often emerge from Standards-axis logic checks but apply across the change set)
- Doc-class triage results (Standards-axis source-verification flags that the author may want to address as docs even if the diff isn't `.prism/architect/**`)
- Security concerns, shared-code blast radius observations, new-pattern callouts
- A11y observations that don't fit cleanly into a single line of code

Cross-cutting findings carry no severity tag of their own — if they're severe enough to gate the merge, they belong in the appropriate axis (Standards or Spec) with a Critical/Major. This section is for observations the author should know about that don't fit the gate-the-merge framing.

## Cleaner Paths (non-blocking)

Structural simplifications worth considering — reach for [`structural-remedies.md`](../structural-remedies.md) § Preferred Remedies and [`review-justification.md`](../review-justification.md) § Simplification & Structural Leverage. This section is explicitly **non-blocking**: it lives in the summary-comment body only, never gets a GitHub label, and never appears in the PR Readiness checklist below. Keep it to genuinely structural moves (delete a layer, reframe so conditionals disappear, move logic to the module that owns the concept) — if this section runs longer than the findings above, the lens is mis-calibrated. Omit if none.

## PR Readiness

- [ ] No critical or major issues found
- [ ] Type-checks clean — no unsafe casts or escape-hatch types
- [ ] No stray debug output or artifacts
- [ ] Accessibility requirements met for UI changes
- [ ] Tests written for new logic and edge cases
- [ ] All debugged/review issues resolved
- [ ] Lasting decisions promoted to architect context (if applicable)
- [ ] PR description accurately reflects changes
- [ ] Visual-regression / component-explorer coverage exists for touched UI
- [ ] Flagged or recommended updates to `.prism/rules/` or `.prism/architect/` files where gaps were discovered
