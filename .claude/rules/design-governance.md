---
paths:
  - "**/*.tsx"
  - "**/*.jsx"
  - "**/*.vue"
  - "**/*.svelte"
  - "**/*.html"
  - "**/*.css"
  - ".prism/design/**"
---

# Design Governance

Implementations follow the approved design artifact — the mock, the saved spec, the design file. Redesigns and enhancements beyond that artifact need explicit UI/UX sign-off *before* implementation. Agent creative liberty is not authorization — the sign-off comes from whoever owns the design decision, not from the implementer's taste.

When an improvement beyond the artifact suggests itself mid-implementation, defer it through [`followup-scope.md`](followup-scope.md) — name it, scope it, let the design owner decide. Don't build it speculatively.

**Why:** an unapproved redesign once drove a full supporting PR — adjacent code, data plumbing, tests — that was cancelled outright when the design scope it served was backed out. The cost of an unauthorized design decision doesn't land at the redesign; it lands downstream, in everything built on top of it before anyone with design authority weighed in.

**How to apply:**

- Treat the approved artifact the way [`branch-plan.md`](branch-plan.md) treats `## Decisions`: each element of the design is load-bearing until the design owner retires it.
- A gap in the artifact (missing state, unspecified interaction) is a question for the design owner, not a license to invent — route it as a design-gap fill rather than improvising scope.

## Who runs this rule

- **Pixel** ([prism-design](../skills/prism-design/SKILL.md)) — stays inside the approved artifact when updating a saved mock spec (mode 2); departures are surfaced as proposals, never folded in silently.
- **Winston** ([prism-architect](../skills/prism-architect/SKILL.md)) — when planning design-aware work, checks that an approved artifact exists before writing implementation tasks against it.
- **Clove** ([prism-code-dev](../skills/prism-code-dev/SKILL.md)) — implements to the artifact; mid-implementation improvement ideas route through the follow-up gate.
- **Briar** ([prism-code-review-self](../skills/prism-code-review-self/SKILL.md)) and **Eric** ([prism-code-review-pr](../skills/prism-code-review-pr/SKILL.md)) — flag implementation that departs from the approved artifact without recorded sign-off.
