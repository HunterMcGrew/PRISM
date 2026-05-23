---
step: step-06-review
---

# Step 06 — Review

Dispatch the three rubric subagents (in parallel on Claude; sequential on Codex/Cursor) and synthesize findings into a triage table.

## Auto-skip for hobby stakes

If PRD frontmatter `stakes: hobby`, skip the rubric entirely:

> "Hobby stakes — skipping the reviewer rubric. Proceed to finalize?"

Update PRD frontmatter: append `step-06-review` to `stepsCompleted` with note `skipped: hobby stakes`. Advance to step-07-finalize.

## Dispatch (internal / launch stakes)

Three subagents read the PRD and apply one rubric each:

- **Product fit** — `.prism/skills/prism-parker/rubrics/product-fit.md`
- **Technical feasibility framing** — `.prism/skills/prism-parker/rubrics/technical-feasibility.md`
- **Clarity** — `.prism/skills/prism-parker/rubrics/clarity.md`

**Claude:** Use the `Task` tool to dispatch the three subagents in parallel. Aggregate findings when all three return.

**Codex / Cursor:** Run sequentially in the order above (product fit → technical feasibility → clarity), aggregating findings as they come back.

## Synthesize triage table

Present findings to the user as a triage table:

| # | Severity | Axis | Rubric | Problem | Suggested fix |
|---|----------|------|--------|---------|---------------|
| 1 | critical | Problem clarity | product-fit | ... | ... |
| 2 | major | Unknown surfacing | technical-feasibility | ... | ... |
| ... |

Sort by severity descending (critical → major → minor). Within severity, sort by rubric (product-fit → technical-feasibility → clarity).

## User decisions

After presenting findings, prompt:

> "Three options for each finding:
> - **`fix <n>`** — apply the suggested fix to the PRD (Parker drafts the edit; user confirms before write)
> - **`accept <n>`** — record the finding as a known risk in `## Open questions` and proceed
> - **`override <n>`** — dismiss the finding with a note explaining why
>
> Critical findings must be fixed or overridden. Block finalize otherwise."

Apply user decisions. Each `fix` writes back to the PRD via `Edit`; each `accept` appends to `## Open questions`; each `override` records in the decision log (greenfield) or in `## Open questions` (brownfield).

## Escalation for launch stakes

For `stakes: launch`, after rubric findings are resolved, ask:

> "Launch stakes — recommend escalating any remaining major findings to a second reviewer (Winston for technical framing, Pixel for product-fit UX angle, or a teammate). Want to route any of these?"

User can route or decline.

## Actions (closing)

1. Apply all user decisions.
2. Update PRD frontmatter: append `step-06-review` to `stepsCompleted`. `lastEdited: <ISO 8601>`. `status: reviewed`.
3. Confirm: "Review complete. `<C>` critical resolved, `<M>` major resolved, `<m>` minor noted. Advance to finalize?"

## Exit condition

All critical findings resolved (fix or override). PRD `status: reviewed`. Advance to step-07-finalize.
