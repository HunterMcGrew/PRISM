---
load: always
---

# Plan Rule

## Purpose

AI agents must maintain a **living plan** that preserves context, decisions, and constraints across the lifecycle of a ticket or epic.
This prevents accidental regressions where previously necessary code changes are undone because their intent was forgotten.

Plans are scoped to **tickets or epics**, not branches. Multiple branches and PRs can reference the same plan. Plans live on `main`, persist through the work, and remain after close as the durable record — plans are never deleted.

---

# Plan File Location

Plan files are stored in:

.prism/plans/

The filename must match the ticket or epic identifier in lowercase.

Examples:

- Ticket ${TICKET_PREFIX}-1448 → `.prism/plans/${TICKET_PREFIX_LOWERCASE}-1448.md`
- Epic ${TICKET_PREFIX}-1524 → `.prism/plans/epic-${TICKET_PREFIX_LOWERCASE}-1524.md`
- Epic with no parent ticket → `.prism/plans/epic-<descriptive-name>.md` (fallback — prefer creating a parent ticket in Linear)

---

# Plan Lookup

When looking for an existing plan:

1. Extract a ticket ID from the current context: branch name (`thr-NNNN` pattern), PR title, user input, or task description.
2. Look for `.prism/plans/<ticket-id>.md`.
3. If not found, look for `.prism/plans/epic-<ticket-id>.md`.
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

- `2026-03-19 [${GITHUB_OWNER}/feature-branch]: added mega menu keyboard navigation`

Each history entry must be at most 3 sentences. Longer entries indicate the change belongs in ## Decisions with sub-bullets, not in history narration.

### History entries: cap at 3 sentences

The cap is one rule with three reasons.

- **Load time** — every plan in `.prism/plans/` is re-read at session start by the persona owning the branch. Long history narration inflates the read cost without adding signal a downstream persona can act on.
- **Edit-time echo** — agents writing the next entry re-read prior history first. A 6-sentence entry costs every future appender twice: once to read, once to draft against. Write-time savings are tiny; read-time savings compound over the plan's lifetime.
- **Scannability** — a human or agent skimming `## History` to reconstruct what happened reads top to bottom. Each entry is one bullet, so long entries break the rhythm and the reader loses the at-a-glance timeline.

**Where depth belongs:** if the change has a verified-fix or non-trivial-decision story to tell, it belongs in `## Decisions` with the sub-bullet shape from § 5 (root cause, alternatives considered, chosen approach, implementation guidance). The History entry then becomes one line: `YYYY-MM-DD [branch]: <one-sentence change>; see Decision: <title>`.

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

**Why:** Conclusions look scannable, but downstream personas (Clove, Briar, Eric) lose the reasoning that makes the conclusion act-on-able. An early-Phase audit surfaced the cost: Clove picks between plausible interpretations, Briar self-reviews against the same gap, Eric PR-reviews against it. Documenting the _why_ alongside the _what_ turns the plan into the working memory it's already supposed to be.

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

Run the close on the ticket's **final PR branch** — after implementation is done and reviews have passed, before that PR merges. The promotion edits and the close marker then ride the final PR instead of requiring a standalone close-out PR after merge.

**Why:** a close that waits for merge costs an extra PR whose only diff is close bookkeeping for already-shipped work. Closing on the final branch makes the close part of the work that completed it. AC items conditioned on merge ("Given the PR has merged…") are verified as holding-at-merge during the close — the squash makes them true atomically.

The close ceremony runs in two phases: **reflect**, then **close**.

**Reflect** is grain-adaptive. At ticket/PR grain, run the lightweight charter-fidelity check — plan-AC vs. merged diff, its own CI, its own review — mechanical, runnable inside the existing close pass, no persona dispatch required. At epic grain, run the full Iris charter retro (or record the decline). Either way, the reflect phase produces evidence-checked findings — divergence verdicts, action items, lesson candidates, and any `## Promotion cautions` (a Decision the execution record refuted) — that the close phase consumes.

**Close** promotes lasting Decisions (consuming any `## Promotion cautions` from the reflect phase — a Decision the execution record refuted is promoted as corrected or demoted to a lesson, never promoted unchanged), runs the verdict gate, records the retro verdict line, and marks the plan closed. Steps 1–2 below are the close phase; their content is unchanged from before the restructure.

**Universal gate — every plan close, not just epics.** Every plan (ticket and epic) records a retro verdict line beside `> Closed:`: `> Retro: <path>` or `> Retro: declined — <one-line reason>`. The nudge is universal; declining is always legitimate; the decline is visible and recorded so the skip has teeth. The theater risk a universal gate raises — heavyweight synthesis on a one-line bugfix — is answered by **grain**, not by exempting trivial plans from the gate: an exemption would re-open the silent-skip hole the gate exists to close.

**Why declinable, not enforced:** most teams cannot force a retro to run involuntarily outside an orchestrated run — no scheduler, personas never auto-invoke each other. What the gate can replicate is CI's real property: skipping is a visible, recorded override, not a silent omission. Under an orchestrated run the retro can be made involuntary — the orchestrator auto-dispatches the retro persona at run close, both grains, and records every dispatch and its outcome in the run report. Outside orchestration, the gate is the human-declinable nudge. Promotion-without-relitigation is the defect the reflect phase fixes — today's ceremony, unrestructured, could promote a decision the work itself disproved.

**Placement:** the pre-merge-on-final-branch placement above stands for the reflect phase too — the retro report rides the final PR as a committed file. At epic grain, earlier children are fully merge-settled by close time; only the final child's main-CI is approximated by its PR CI, and the charter-coverage table names this approximation explicitly.

When the ticket or epic is complete (the final PR is reviewed and ready to merge):

0. **Reflect** — grain-adaptive per above. Record the outcome as `> Retro: <path>` or `> Retro: declined — <reason>` beside the plan's `> Closed:` line (added in step 2 below).
1. **Promote lasting decisions** — review `## Decisions` for any entries that describe how the system works going forward (not just how this ticket was implemented). Add these to the relevant architect context file in `.prism/architect/`. Consume any `## Promotion cautions` from a retro report for this plan: a Decision the execution record refuted is promoted as corrected or demoted to a lesson, never promoted unchanged.
2. **Mark the plan closed** — once decisions are promoted, add a `> Closed: YYYY-MM-DD` line and the `> Retro:` line from step 0 under the plan's title, and append the close entry to `## History`. The file stays in `.prism/plans/` — plans are never deleted, and only Zoe (cadence audit) may later move one out as an archive action. **Why:** "git history preserves it" undercounts the cost — audits, retros, and next-wave triage walk the live tree, not git archaeology, and practice preserved every shipped epic plan from the start while the delete instruction kept re-raising the question at each close.

Decisions that should be promoted:

- Architectural patterns established (e.g., "blocks use resolver pattern")
- Constraints discovered that affect future work (e.g., "X API doesn't support Y")
- Design choices that other developers need to know about

Decisions that stay in the closed plan only:

- Implementation tactics specific to this ticket
- Bug workarounds that are self-evident from the code
- Temporary scaffolding decisions

---

## Decision verdict gate

Before promoting decisions and marking the plan closed (steps 1–2 above), every entry in `## Decisions` must carry an explicit verdict sub-bullet. The verdict closes the loop on whether the decision was promoted to a durable surface or intentionally stays local.

**Verdict format:** append as the last sub-bullet on each Decision entry:

- `→ promoted to .prism/architect/<file>.md` — decision graduated to a durable architect doc.
- `→ promoted to ADR-NNNN` — decision graduated to its own ADR.
- `→ no promotion needed (<one-line reason>)` — decision is ticket-tactical, codified elsewhere, or otherwise doesn't generalize. Reason is required, not optional.

**Why:** Without an explicit verdict, decisions get promoted mentally, the plan closes, and the architect surface silently misses the update. The verdict forces the promotion call before close — and makes the call auditable in PR review.

**How to apply:** Winston runs this gate during plan close. Briar surfaces missing verdicts as a Minor in self-review when a plan is being closed. Eric surfaces missing verdicts during PR review when the PR is the close-out PR for a ticket.

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

Added by the architect skill (Winston). Tasks are grouped by persona — each group has a heading naming the skill that owns those tasks. The persona heading is the source of truth for ownership: a skill works within its named heading and treats other personas' headings as out-of-scope by default.

Tasks must meet the detail bar in `.prism/rules/implementation-task-detail.md` — front-load every decision (file path, exact change, verification command, sequence), no judgment calls left to the implementer.

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

### Open-question Decision variant

Some decisions surface during planning but can't be resolved without input the team doesn't yet have — a stakeholder hasn't weighed in, a benchmark hasn't run, a constraint is genuinely open. Record these explicitly using the open-question variant, so work can continue under a documented default path while the open question stays visible.

**Format:**

```markdown
- **OPEN — TBD, needs <name> input.** <Description of the open question>. **Default path (used until resolved):** <Description of the path work follows in the meantime>.
```

**Why this is a variant and not a missing bullet:** undocumented open questions either block work or get silently absorbed into one of the implicit paths. Both fail. The `OPEN` marker lets a default path carry the work without losing the question — and Zoe's cadence audit later flags `OPEN` Decisions that have aged past 30 days as `open-stale` so they don't sit forever.

**How to apply:**

- Use `OPEN — TBD, needs <name> input.` as the first sentence so the marker is scannable.
- Name the person whose input resolves the question. If multiple people, name the decision-maker.
- Always include the **Default path** sub-clause — work has to be able to continue. If you can't articulate a default, the open question isn't ready to be a Decision yet.
- When the question resolves, replace the entry with a normal Decision capturing the resolution (and note in `## History` that the open question closed).

A canonical `OPEN` entry inline — open question + named reviewer + default path on a single bullet, ready to drop into a plan's `## Decisions` section:

```markdown
- **OPEN — TBD, needs <decision-maker> input.** Whether <open question — e.g. the audit report at `.prism/audits/<YYYY-MM-DD>-audit.md` should also post a Slack summary on completion>. **Default path (used until resolved):** <what work follows in the meantime — e.g. report stays file-local; user shares manually if desired>.
```

Examples:

- `isLinkObject` lives in `type-guards/link.ts`, not `interfaces/link.ts` — avoids circular dependency.
- `setLinkTarget` with `undefined` deletes both `target` and `rel` — callers must use `setLinkRel` to set rel independently.
- `ModalPhoneSource` is a separate type from `PhoneSource`, not an extension. Considered: extending `PhoneSource` with `"all"`. Rejected: schema files would also accept `"all"` as a stored value, which is wrong — `"all"` only exists as a runtime modal-display value, never on a CTA.
- **OPEN — TBD, needs <owner> input.** Whether the audit report at `.prism/audits/<YYYY-MM-DD>-audit.md` should also post a Slack summary on completion. **Default path (used until resolved):** report stays file-local; user manually shares if desired.

---

## Sessions

Append-only orientation log — one line per skill session. The opening battery compresses to the `open:` clause at session start; the closing battery appends the `close:` verdict to the same line at session end.

- YYYY-MM-DD [<branch>] open: Intent — <one line>; Bounds — <one line>; Approach — <one line> · close: <scope held | drifted — why>

---

## History

Append-only log. One line per meaningful change, oldest first. Include the branch name.

- YYYY-MM-DD [branch-name]: <what changed and why, mention file inline if useful>

Examples:

- 2026-03-10 [${GITHUB_OWNER}/${TICKET_PREFIX_LOWERCASE}-1443-link-types]: Moved `isLinkObject` from interfaces to type-guards to resolve circular dep.
- 2026-03-11 [${GITHUB_OWNER}/${TICKET_PREFIX_LOWERCASE}-1443-link-types]: Added `setLinkRel(link, undefined)` test — covers delete-rel branch.

---

## Debugged Issues

Add entries here via the debugger skill. Each entry has a structured format. Non-trivial CI/build failures fixed during implementation earn an entry here even when no debugger session ran — the plan is the durable content bus, and a failure fixed inline without a record starves anything that reads this section later (a retro, an audit, a future debugger session).

### <short issue title>

- **Status:** `open` | `fixed`
- **Severity:** Critical / High / Medium / Low
- **Confidence:** `High` (Confirmed root cause + deterministic repro) | `Medium` (Deduced) | `Low` (Hypothesized, named data gap)
- **Environment:** [where it was observed]
- **File:** `<file>:<line>`
- **Root cause:** `[Confirmed]` | `[Deduced]` | `[Hypothesized]` — one sentence
- **Steps to Reproduce:**
  1. [step]
- **Expected behavior:** one sentence
- **Actual behavior:** one sentence
- **Refuted hypotheses:** (optional — list hypotheses tested and eliminated; skip when there were no real alternatives)
  - <hypothesis> — refuted by <evidence>
- **Recommended fix:** minimal description
- **Suggested tests:** what to cover, or "none needed", or `"no correct seam — architecture prevents lockdown"` (legitimate finding that flags Winston/Ren follow-up)
- **Missing evidence:** (optional — Gap / Impact / How to Obtain mini-table for any unconfirmed claims that the diagnosis still depends on)
- **Linear:** `synced` | `not synced` | `N/A`

The inline tag on `Root cause` and the explicit `Confidence` field carry the same evidence grading principle: every claim names whether it's observed (`Confirmed`), inferred with named logical steps (`Deduced`), or unverified (`Hypothesized`). The `Refuted hypotheses` and `Missing evidence` fields keep eliminated alternatives and known gaps visible — a refuted hypothesis is data, and a missing-evidence note is itself a finding (not an admission that the investigation is incomplete).

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

Add entries here via the architect skill (Winston). Reference `.prism/templates/acceptance-criteria.md` for format details.

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

- Append to `## Sessions` at session start and close — never delete entries
- Append new entries to `## History` — never delete old ones
- Update `## Decisions` when constraints change (add a note if a prior decision was reversed)
- Update `## Debugged Issues` status as bugs are fixed
- Keep `## PR Readiness` current after every self-review
- Keep sections accurate and current — the plan is the working memory for the ticket
