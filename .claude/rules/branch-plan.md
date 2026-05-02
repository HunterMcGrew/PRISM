# Plan Rule

## Purpose

AI agents must maintain a **living plan** that preserves context, decisions, and constraints across the lifecycle of a ticket or epic.
This prevents accidental regressions where previously necessary code changes are undone because their intent was forgotten.

Plans are scoped to **tickets or epics**, not branches. Multiple branches and PRs can reference the same plan. Plans live on `main` and persist until the work is complete.

---

# Plan File Location

Plan files are stored in:

.claude/plans/

The filename must match the ticket or epic identifier in lowercase.

Examples:

- Ticket THR-1448 → `.claude/plans/thr-1448.md`
- Epic THR-1524 → `.claude/plans/epic-thr-1524.md`
- Epic with no parent ticket → `.claude/plans/epic-<descriptive-name>.md` (fallback — prefer creating a parent ticket in Linear)

---

# Plan Lookup

When looking for an existing plan:

1. Extract a ticket ID from the current context: branch name (`thr-NNNN` pattern), PR title, user input, or task description.
2. Look for `.claude/plans/<ticket-id>.md`.
3. If not found, look for `.claude/plans/epic-<ticket-id>.md`.
4. If not found, scan all plan files for a matching `## Ticket` field.
5. If still not found:
   - **code-dev / architect / self-review / debugger**: ask the user which ticket this work is for, then create a new plan. These skills write into the plan (review issues, debugged issues, PR readiness) and need somewhere to persist findings.
   - **PR review**: note "no plan found" and proceed without one. PR review runs in a worktree on someone else's branch — creating a plan there would cause merge conflicts. All PR review findings go into the GitHub PR comment instead.

---

# Required Workflow

## 1. Find or Create the Plan

Before performing any implementation work:

- Run the plan lookup described above
- If a plan exists: read it fully and treat it as the **source of truth for intent and constraints**
- If no plan exists: create one using the template defined in this rule

---

## 2. Use the Plan as Context

Before making changes:

- Review the goal and user stories (if present)
- Review documented decisions — each one is an implicit do-not-undo
- Review the history log for what has already been done
- Check `## Acceptance Criteria` for what the implementation must satisfy
- Check `## Debugged Issues` and `## Review Issues` for any `open` entries

---

## 3. Preserve Intentional Logic

Before removing, simplifying, or refactoring existing logic:

1. Check whether the plan's `## Decisions` section documents the logic as intentional.
2. If it is documented: do not remove or alter it unless the underlying constraint has changed.
3. If removing it is necessary: update the `## Decisions` section to explain why the previous decision no longer applies.

Never remove logic that solves a documented problem without updating the plan.

---

## 4. Update the Plan After Meaningful Changes

After meaningful implementation changes, update the plan.

Meaningful changes include:

- implementing new behavior
- fixing bugs
- addressing code review feedback
- refactoring architecture
- discovering constraints or edge cases

Skip plan updates for trivial edits such as:

- formatting
- import sorting
- variable renaming
- whitespace fixes

When appending to `## History`, include the branch name for traceability:

- `2026-03-19 [hmcgrew/feature-branch]: added mega menu keyboard navigation`

---

## 5. Keep the Plan Clean and Concise

Plan entries must be:

- short
- factual
- written as bullet points when possible

Avoid long paragraphs or redundant explanations.

The plan should remain easy to scan.

### Depth on Verified Fixes and Non-Trivial Decisions

The brevity default in step 5 is correct for routine entries. Verified fixes and non-trivial decisions are the exception — they use sub-bullets covering root cause, alternatives considered, chosen approach, and implementation guidance.

**Why:** Conclusions look scannable, but downstream personas (Clove, Briar, Eric) lose the reasoning that makes the conclusion act-on-able. The THR-1775 audit surfaced the cost: Clove picks between plausible interpretations, Briar self-reviews against the same gap, Eric PR-reviews against it. Documenting the _why_ alongside the _what_ turns the plan into the working memory it's already supposed to be. See [ADR-0024](../spec/adrs/0024-branch-plan-decisions-record-the-why.md).

**How to apply:** When Winston records a verified fix or a non-trivial decision in `## Decisions`, write sub-bullets — not paragraph drift. Five tight bullets beat one long paragraph.

- **Root cause** — what the underlying problem turned out to be.
- **Alternatives considered** — what other approaches were on the table.
- **Chosen approach** — the path taken and the one-line reason it beat the alternatives.
- **Implementation guidance** — what Clove (or the executing persona) needs to know to act on it.

Routine implementation tactics — variable choices, file placements, refactor styles obvious from the diff — keep the existing one-line shape. The depth bar applies to depth, not length: it kicks in when the reasoning is the thing downstream personas need.

Example:

- **Preview props reset on parent attribute change instead of being memoized.**
  - **Root cause:** memoized props returned a stale reference because the dependency array didn't capture nested attribute changes; the editor showed last render's values.
  - **Alternatives considered:** deep-equal dependency check; effect-driven sync; full reset on parent change.
  - **Chosen approach:** full reset on parent change. Beats deep-equal (expensive on large attribute trees) and effect-driven sync (introduces a render cycle the user sees).
  - **Implementation guidance:** clear preview props in the parent's attribute-change handler; do not memoize.

---

## 6. One Plan Per Ticket

For each ticket or epic:

- Maintain **one plan file only**
- Multiple branches reference the same plan
- Prefer updating the existing file instead of creating new ones
- Do not create duplicate or versioned plans

---

# Before Closing

When the ticket or epic is complete (all PRs merged, work is done):

1. **Promote lasting decisions** — review `## Decisions` for any entries that describe how the system works going forward (not just how this ticket was implemented). Add these to the relevant architect context file in `.claude/architect/`.
2. **Delete the plan** — once decisions are promoted, delete the plan file. Git history preserves it if you ever need to look back.

Decisions that should be promoted:

- Architectural patterns established (e.g., "blocks use resolver pattern")
- Constraints discovered that affect future work (e.g., "X API doesn't support Y")
- Design choices that other developers need to know about

Decisions that stay in git history only:

- Implementation tactics specific to this ticket
- Bug workarounds that are self-evident from the code
- Temporary scaffolding decisions

---

# Plan File Template

When creating a new plan, use the following structure.

---

# Plan: <ticket-id>

## Ticket

<Linear ticket URL or reference — optional>

## Goal

One sentence. What this ticket or epic achieves.

---

## User Stories

Add entries here via the user stories skill (Mira). Optional — not all tickets need user stories.

- As a [user type], I want to [action], so that [benefit]

---

## Design

Add entries here via the design skill (Pixel). Optional — not all tickets need a design phase. Pixel writes here in mode 2 (saved mock spec) only.

---

## Implementation Tasks

Added by the architect skill (Winston). Tasks are grouped by persona — each group has a heading naming the skill that owns those tasks. The persona heading is the source of truth for ownership: a skill works within its named heading and treats other personas' headings as out-of-scope by default. See ADR-0018.

When work needs to cross a lane, the skill has three options:

- **Skip and let the owner handle it.** Default — leave the lane to its owner and continue with in-scope work.
- **Absorb with a `## Decisions` entry.** When same-PR absorption is meaningfully faster (shared file, related rewrite, redundant handoff otherwise), the skill may absorb the cross-lane work — but only with a `## Decisions` entry documenting the scope shift, the reason, and the affected files.
- **Route to the owning persona now.** Mid-ticket handoff to the named persona.

Silent cross-lane edits are the failure mode. Documented absorption is fine; undocumented absorption is not.

### Clove (implementation)

1. <task description — one concrete unit of work>

### Eli (documentation)

1. <task description — docs changes go here>

Tasks may reference other personas as needed (e.g. `### Briar`, `### Sasha`). Cross-persona dependencies are noted inline.

---

## Decisions

- <what was decided and why — one line each>
- Each bullet is an implicit do-not-undo. Reasoning is the signal.

When a decision had a real alternative that was considered and rejected, rethink the rejection before recording it — was the alternative really worse, or was "rejected" a lazy path dressed up as a tradeoff? If the rethink flips the call, go back and apply the better approach. If the rejection still stands, record it as a TL;DR: alternative + one-line reason. No essay. The point of writing it down is to force the rethink, not to produce documentation.

Examples:

- `isLinkObject` lives in `type-guards/link.ts`, not `interfaces/link.ts` — avoids circular dependency.
- `setLinkTarget` with `undefined` deletes both `target` and `rel` — callers must use `setLinkRel` to set rel independently.
- `ModalPhoneSource` is a separate type from `PhoneSource`, not an extension. Considered: extending `PhoneSource` with `"all"`. Rejected: schema files would also accept `"all"` as a stored value, which is wrong — `"all"` only exists as a runtime modal-display value, never on a CTA.

---

## History

Append-only log. One line per meaningful change, oldest first. Include the branch name.

- YYYY-MM-DD [branch-name]: <what changed and why, mention file inline if useful>

Examples:

- 2026-03-10 [hmcgrew/thr-1443-link-types]: Moved `isLinkObject` from interfaces to type-guards to resolve circular dep.
- 2026-03-11 [hmcgrew/thr-1443-link-types]: Added `setLinkRel(link, undefined)` test — covers delete-rel branch.

---

## Debugged Issues

Add entries here via the debugger skill. Each entry has a structured format:

### <short issue title>

- **Status:** `open` | `fixed`
- **Severity:** Critical / High / Medium / Low
- **Environment:** [where it was observed]
- **File:** `<file>:<line>`
- **Root cause:** one sentence
- **Steps to Reproduce:**
  1. [step]
- **Expected behavior:** one sentence
- **Actual behavior:** one sentence
- **Recommended fix:** minimal description
- **Suggested tests:** what to cover, or "none needed"
- **Linear:** `synced` | `not synced` | `N/A`

---

## Review Issues

Add entries here via the code-review-self or code-review-pr skills. Each entry has a structured format:

### <short issue title>

- **Severity:** `critical` | `major` | `minor`
- **Status:** `open` | `fixed` | `deferred`
- **File:** `<file>:<line>`
- **Problem:** one sentence
- **Suggested fix:** minimal description

---

## Acceptance Criteria

Add entries here via the architect skill (Winston). Reference `.claude/templates/acceptance-criteria.md` for format details.

### Behavioral

- [ ] Given [precondition], When [action], Then [outcome]

### Non-behavioral

- [ ] [Constraint or quality requirement]

### AC Adjustments

<!-- Agents propose changes here; human accepts/rejects -->

### AC Sync Log

| Date | Agent | Action | Plan | Linear |
| ---- | ----- | ------ | ---- | ------ |

<!-- Each skill appends a row when it creates, updates, or syncs AC. "Plan" = updated/—, "Linear" = synced/pending/—. Downstream skills check the last row to see current sync state. -->

---

## Cleanup Items

Dead code, debug artifacts, stray comments found during review.

- <file>:<line> — <what to clean up>

---

## PR Readiness

Living checklist — updated every time `code-review-self` runs. Reflects current state.

- [ ] No critical or major issues
- [ ] Types correct — no `any`, no unsafe `as`
- [ ] No stray console.logs or debug artifacts
- [ ] Tests written for new logic and edge cases
- [ ] All debugged issues resolved (no `open` entries)
- [ ] Build passes — last run: YYYY-MM-DD (or `skipped — diff does not affect Next.js bundle` when Briar's conditional build rules apply)
- [ ] PR description up to date
- [ ] Lasting decisions promoted to architect context (if applicable)

**Last updated:** YYYY-MM-DD

---

# Maintenance Expectations

The plan should evolve alongside the implementation.

When updating the plan:

- Append new entries to `## History` — never delete old ones
- Update `## Decisions` when constraints change (add a note if a prior decision was reversed)
- Update `## Debugged Issues` status as bugs are fixed
- Keep `## PR Readiness` current after every self-review
- Keep sections accurate and current — the plan is the working memory for the ticket
