# Review Frameworks

Shared review catalog consumed by Briar (self-review, `prism-code-review-self`) and Eric (PR review, `prism-code-review-pr`). The reasoning lenses — design-before-correctness, severity calibration, the adversarial mindset — stay pinned in each skill's "How X Thinks" section. This file holds the reference tables and procedures both reviewers apply.

## The Two-Pass Model

1. **Intent pass**: Read the PR description, plan decisions, and test files first to understand what the author intended. Tests reveal expected behavior and — critically — edge cases the author didn't consider.
2. **Implementation pass**: Read the diff to evaluate whether the implementation achieves the intent. This is where correctness, design, and edge cases get scrutinized.

Self-review adds a third layer: the **adversarial pass**. After confirming intent and correctness, actively try to break it — for each function ask "how would I break this?", for each state transition "what if this happens in the wrong order?"

## Severity Classification

| Level        | Meaning                                                                          | Action                  |
| ------------ | -------------------------------------------------------------------------------- | ----------------------- |
| **Critical** | Will cause production bugs, data loss, security issues, or crashes               | Must fix before merge   |
| **Major**    | Significant problem — wrong approach, missing edge case, accessibility violation | Should fix before merge |
| **Minor**    | Real improvement — naming, style, small optimization, documentation              | Can be follow-up        |

**Impact × Likelihood determines severity, not the bug class.** A null reference in a rarely-called admin function is lower severity than the same bug in the inventory display — same bug class, different blast radius.

## Review Heuristics by Code Type

| Code type             | Focus on                                                                           |
| --------------------- | ---------------------------------------------------------------------------------- |
| **Components**        | SRP (one reason to change), prop interface design, state management, accessibility |
| **Utility functions** | Edge cases (empty, null, boundary), error handling, naming accuracy                |
| **Type definitions**  | Completeness, consistency with existing types, no `any` or unsafe `as`             |
| **Tests**             | Behavior-not-implementation, assertion quality, edge case coverage, test isolation |
| **Configuration**     | Correctness, no secrets, safe defaults                                             |

## Structural Scan Items

Cross-type scan items both reviewers apply on every pass (remedy shapes for the structural items live in `structural-remedies.md` § Preferred Remedies):

- **"Magic" or brittle behavior** — ad-hoc or magical mechanisms, or generic abstractions that hide simple data-shape assumptions. Prefer direct, boring, explicit code over clever indirection that buys no clarity.
- **Silent fallback over an unclear invariant** — a branch that quietly defaults (e.g. on `undefined`/`unknown`) to avoid confronting an unclear contract. Ask whether the boundary should be made explicit with a typed model or shared contract instead.
- **Removals and renames verified by search, not by diff** — diff-only review structurally cannot catch a missed reconciliation: the file still referencing the old name never appears in the diff. When the PR removes or renames a concept, search the tree for the old name before signing off (author-side gate: `.prism/rules/code-standards.md` § Removal and rename completeness).

## The 400-Line Cliff

Review effectiveness drops below 70% after 400 lines of diff (SmartBear/Cisco research). On large changes, do multiple focused passes: first pass for design and architecture, second for correctness of critical paths, third for edge cases and polish. Never try to catch everything in one scan.

## Self-Review Compensation Techniques

Self-review has specific blind spots that checklists compensate for (most relevant to Briar; Eric reviews with fresh eyes and is less exposed to them):

- **Familiarity bias**: You skip verifying intent because you already know it → use diff-only reading.
- **Confirmation bias**: You see evidence that your code works and ignore evidence it doesn't → use the adversarial mindset.
- **Scope creep blindness**: You don't notice that "while I was here" changes expanded the diff → check every file against the ticket scope.
- **Edge case amnesia**: You remember the happy path you coded, not the edge cases you didn't → run the what-if sweep (empty, one, many, boundary, error, concurrent).
