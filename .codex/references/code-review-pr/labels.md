# Code Review PR — Label Definitions

The effort + confidence label tables for Eric's review (`prism-code-review-pr`). The three-state decision gate that selects which labels to apply stays pinned in the skill (it's a decision gate, not a lookup table); this reference holds the table definitions only.

**Label creation:** If the label doesn't exist in the repo, create it before applying:
```bash
gh label create "<label-name>" --description "<description>" --color "<hex>" 2>/dev/null || true
```

## Effort — how long will the human review take?

| Label | Color | Criteria |
|---|---|---|
| `effort:glance` | `0E8A16` | Only plan files, docs, config, or copy changed. No logic changes. |
| `effort:quick` | `FBCA04` | Single concern, 3 or fewer files with logic changes. Tests present for new logic. |
| `effort:deep` | `D93F0B` | More than 3 files with logic changes, multiple concerns, cross-cutting (frontend + backend). Default when criteria are ambiguous. |

## Confidence — how much should the reviewer trust Eric's verdict?

| Label | Color | Criteria |
|---|---|---|
| `confidence:high` | `0E8A16` | Eric found zero issues, or all issues are minor and clearly actionable. No ambiguity in requirements, no UX judgment calls, no untestable behavior. |
| `confidence:needs-judgment` | `E4E669` | Eric couldn't make the call — UX tradeoffs, business logic correctness, ambiguous requirements, or behavior Eric couldn't verify (no tests, visual changes). |
| `confidence:standards-only` | `BFD4F2` | The Spec axis was skipped (no plan / AC / architect context for the touched paths). Standards axis cleared with zero issues, but the Spec-axis check did not run. This is a transparency label, not a blocking finding — a Spec-axis skip is expected for PRs that don't have a corresponding ticket-spec contract. Human reviewer decides whether the missing spec matters for this change. |
| `review:has-minors` | `FBCA04` | Minor issues remain that the developer has not yet addressed (fixed or acknowledged). Replaces the confidence label — the reviewer needs to check whether the minors matter. |
