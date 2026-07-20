# Agent Behavior Rules

## Skills Ecosystem

This project uses a multi-agent skills ecosystem. Each skill has a defined role and handoff points; most carry a dedicated persona — utility skills (ADR-0046) carry none and run in the invoking persona's voice. See `.prism/architect/_toolkit/skills-ecosystem.md` for the full reference — it's loaded automatically via `manifest.json` on every skill invocation.

The full tier hierarchy — what binds whom, who can change it, how changes are proposed — lives in `.prism/SPEC.md`. Start there if you're unsure where a decision belongs.

---

## 0. Skill Auto-Routing

See [`.prism/rules/skill-routing.md`](.prism/rules/skill-routing.md). The full
routing table, built-in-skill overrides, utility-skill rules, and the
"authors ship, reviewers review" lane rule live there as an always-on Tier-1
rule — loaded by Claude, Codex (inlined below), and Cursor.

---

## Behavioral norms

The norms that govern every session live as Tier 1 rules in `.prism/rules/` — loaded every chat, citable by path. The section numbers below are kept so existing `AGENTS.md §N` cross-references still resolve; the content lives in the rule files.

| § | Norm | Rule |
| --- | --- | --- |
| 1 | Plan before building — plan mode for non-trivial work; re-plan when the approach breaks | [`.prism/rules/plan-before-building.md`](.prism/rules/plan-before-building.md) |
| 2 | Subagent strategy — offload research to subagents, one task each, to keep the main window clean | [`.prism/rules/subagent-strategy.md`](.prism/rules/subagent-strategy.md) |
| 3 | Self-improvement loop — capture corrections in `.prism/lessons.md`; review lessons at session start | [`.prism/rules/self-improvement-loop.md`](.prism/rules/self-improvement-loop.md) |
| 4 | Verification before done — prove it works against the staff-engineer bar before calling it complete | [`.prism/rules/verification-before-done.md`](.prism/rules/verification-before-done.md) |
| 5 | Demand elegance — ask for the clean solution on non-trivial changes; skip it on obvious fixes | [`.prism/rules/demand-elegance.md`](.prism/rules/demand-elegance.md) |
| 6 | Autonomous bug fixing — just fix the bug; stop only when the blast radius is wide | [`.prism/rules/autonomous-bug-fixing.md`](.prism/rules/autonomous-bug-fixing.md) |
| — | Core principles — simplicity first, no laziness | [`.prism/rules/core-principles.md`](.prism/rules/core-principles.md) |
| 8 | Context window handoff check — assess context load before recommending the next persona | [`.prism/rules/context-window-handoff-check.md`](.prism/rules/context-window-handoff-check.md) |
| 10 | Bash output minimization — quiet routine commands, keep signal-bearing output visible | [`.prism/rules/bash-output-minimization.md`](.prism/rules/bash-output-minimization.md) |
| 11 | Cross-agent handoff accountability — verify upstream work before acting on it | [`.prism/rules/cross-agent-handoff-accountability.md`](.prism/rules/cross-agent-handoff-accountability.md) |
| 12 | Pre-compaction checkpoint — capture critical session state before auto-compaction | [`.prism/rules/pre-compaction-checkpoint.md`](.prism/rules/pre-compaction-checkpoint.md) |

<!-- BEGIN GENERATED TIER-1 RULE BODIES — managed by scripts/ai-skills/build.ts; do not edit -->

<!-- source: .prism/rules/autonomous-bug-fixing.md -->

---
load: always
---

# Autonomous Bug Fixing

## Purpose

When given a bug report, just fix it. Point at logs, errors, or failing tests — then resolve them. The user shouldn't need to context-switch into debugging mode to hand-hold the process.

**Why:** a bug report is a request to fix the bug, not a request to narrate the debugging. Making the user drive each step turns a delegated task back into a supervised one and burns the time the delegation was meant to save. The one exception protects against the opposite failure — fixing autonomously where the blast radius is wide enough that the user needs to weigh in first.

**How to apply:**

- Given logs, errors, or failing tests, diagnose and resolve them without asking the user to walk you through it.
- One exception: if the fix touches a public API, a shared type, or a shared utility, stop and explain before proceeding. A wide blast radius deserves a heads-up — see [`.prism/rules/code-standards.md`](./code-standards.md).

---

<!-- source: .prism/rules/bash-output-minimization.md -->

---
load: always
---

# Bash Output Minimization

## Purpose

Every bash command's input and output consumes tokens from the context window. Minimize output volume for routine operations — and keep it visible where the output is the information.

**Why:** routine confirmations ("push succeeded", "install finished") spend context tokens to tell you something the exit code already says. Cutting that noise keeps the window clear for the output that actually carries signal — diffs, test results, error messages. The goal is to cut noise on routine confirmations, not to hide useful information.

## How to apply

Minimize output for routine operations:

- **Git:** use quiet flags — `git push -q`, `git pull -q`, `git fetch -q`, `git commit -q`. Use `git status -s` (short format) instead of `git status`.
- **gh CLI:** redirect JSON responses to `/dev/null` when you only need the exit code — e.g. `gh api ... > /dev/null`. When creating comments or updating PRs, the response URL is rarely useful.
- **Build tools:** when only pass/fail matters — `pnpm run build > /dev/null 2>&1 && echo "Build passed" || echo "Build failed"`.
- **Package installs:** `pnpm install --silent` or `npm install --silent`.
- **Heredocs to files:** writing content to a temp file (e.g. a PR body) with `cat > /tmp/file.md << 'EOF' ... EOF` already produces no output; don't follow it with a read-back unless needed.

Keep output visible for:

- Diffs, file searches, and test results — the output is the information.
- Commands that fail — error output is needed for debugging.
- Linting and formatting checks that find violations — the violations are actionable.

---

<!-- source: .prism/rules/branch-plan.md -->

---
load: always
---

# Plan Rule

## Purpose

AI agents must maintain a **living plan** that preserves context, decisions, and constraints across the lifecycle of a ticket or epic.
This prevents accidental regressions where previously necessary code changes are undone because their intent was forgotten.

Plans are scoped to **tickets or epics**, not branches. Multiple branches and PRs can reference the same plan. Plans live on `main`, persist through the work, and remain after close as the durable record — plans are never deleted (see ADR-0047).

---

# Plan File Location

Plan files are stored in:

.prism/plans/

The filename must match the ticket or epic identifier in lowercase.

Examples:

- Ticket PRISM-1448 → `.prism/plans/prism-1448.md`
- Epic PRISM-1524 → `.prism/plans/epic-prism-1524.md`
- Epic with no parent ticket → `.prism/plans/epic-<descriptive-name>.md` (fallback — prefer creating a parent ticket in the tracker)

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

- `2026-03-19 [HunterMcGrew/feature-branch]: added mega menu keyboard navigation`

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

**Why:** Conclusions look scannable, but downstream personas (Clove, Briar, Eric) lose the reasoning that makes the conclusion act-on-able. The THR-1775 audit surfaced the cost: Clove picks between plausible interpretations, Briar self-reviews against the same gap, Eric PR-reviews against it. Documenting the _why_ alongside the _what_ turns the plan into the working memory it's already supposed to be. See [ADR-0024](../spec/adrs/_toolkit/0024-branch-plan-decisions-record-the-why.md).

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

**Why declinable, not enforced:** PRISM cannot force a retro to run involuntarily outside a Sol run — no scheduler, personas never auto-invoke each other, and hook enforcement was deliberately reverted. What the gate can replicate is CI's real property: skipping is a visible, recorded override, not a silent omission. Under Sol the retro *is* involuntary — Sol auto-dispatches Iris at run close, both grains, and records every dispatch and its outcome in the run report. Outside Sol, the gate is the human-declinable nudge. Promotion-without-relitigation is the defect the reflect phase fixes — today's ceremony, unrestructured, could promote a decision the work itself disproved.

**Placement:** the pre-merge-on-final-branch placement above stands for the reflect phase too — the retro report rides the final PR as a committed file. At epic grain, earlier children are fully merge-settled by close time; only the final child's main-CI is approximated by its PR CI, and the charter-coverage table names this approximation explicitly.

When the ticket or epic is complete (the final PR is reviewed and ready to merge):

0. **Reflect** — grain-adaptive per above. Record the outcome as `> Retro: <path>` or `> Retro: declined — <reason>` beside the plan's `> Closed:` line (added in step 2 below).
1. **Promote lasting decisions** — review `## Decisions` for any entries that describe how the system works going forward (not just how this ticket was implemented). Add these to the relevant architect context file in `.prism/architect/`. Consume any `## Promotion cautions` from a retro report for this plan: a Decision the execution record refuted is promoted as corrected or demoted to a lesson, never promoted unchanged.
2. **Mark the plan closed** — once decisions are promoted, add a `> Closed: YYYY-MM-DD` line and the `> Retro:` line from step 0 under the plan's title, and append the close entry to `## History`. The file stays in `.prism/plans/` — plans are never deleted, and only Zoe (cadence audit) may later move one out as an archive action. **Why:** "git history preserves it" undercounts the cost — audits, retros, and next-wave triage walk the live tree, not git archaeology, and practice preserved every shipped epic plan from the start while the delete instruction kept re-raising the question at each close. See [ADR-0047](../spec/adrs/_toolkit/0047-plans-are-preserved-at-close.md).

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

<Ticket URL or reference — optional>

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

Tasks must meet the detail bar in `.prism/rules/implementation-task-detail.md` — front-load every decision (file path, exact change, verification command, sequence), no judgment calls left to the implementer. See ADR-0033.

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

- 2026-03-10 [HunterMcGrew/prism-1443-link-types]: Moved `isLinkObject` from interfaces to type-guards to resolve circular dep.
- 2026-03-11 [HunterMcGrew/prism-1443-link-types]: Added `setLinkRel(link, undefined)` test — covers delete-rel branch.

---

## Debugged Issues

Add entries here via the debugger skill. Each entry has a structured format. Non-trivial CI/build failures fixed during implementation earn an entry here even when no debugger session ran — the plan is the durable content bus, and a failure fixed inline without a record starves anything that reads this section later (the retro charter, an audit, a future debugger session).

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
- **Ticket:** `synced` | `not synced` | `N/A`

The inline tag on `Root cause` and the explicit `Confidence` field carry the same evidence grading principle: every claim names whether it's observed (`Confirmed`), inferred with named logical steps (`Deduced`), or unverified (`Hypothesized`). The `Refuted hypotheses` and `Missing evidence` fields keep eliminated alternatives and known gaps visible — a refuted hypothesis is data, and a missing-evidence note is itself a finding (not an admission that the investigation is incomplete).

---

## Review Issues

Add entries here via the code-review-self or code-review-pr skills. Briar (self-review) writes here on every run — structured entries when issues are found, and a single `No issues found — <date>` line on a clean pass — so the section is a durable review record, not just a defect log. Iris reads it as self-review evidence for charter items 4/5. Each entry has a structured format:

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

| Date | Agent | Action | Plan | Ticket |
| ---- | ----- | ------ | ---- | ------ |

<!-- Each skill appends a row when it creates, updates, or syncs AC. "Plan" = updated/—, "Ticket" = synced/pending/—. Downstream skills check the last row to see current sync state. -->

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

---

<!-- source: .prism/rules/code-comments.md -->

---
load: always
---

# Code Comments

## JSDoc

Lead with a short summary line describing purpose. Additional context, caveats, or design decisions go in a separate paragraph after a blank line.

```ts
/**
 * Extracts serializable props from inner block children.
 *
 * Required because Next.js strips non-serializable properties during
 * server-to-client handoff, including the `type` property needed by
 * the MobileMegaMenu type guard.
 */
```

### Where to place JSDoc

- **Functions and components** — the primary use case. Every exported function or component that isn't self-evident from its name and signature.
- **Interfaces and type aliases** — when the name alone doesn't convey the purpose or constraints (e.g. `DragAndDropLink`, `RenderContext`). Skip for types that are obvious from their name and fields.
- **File-level** (above all imports) — when the module has a non-obvious responsibility, side-effect imports, or architectural context that doesn't belong to any single declaration.

Do not use JSDoc on constants or variables — the name and type should be sufficient.

---

## Inline Comments

### Prefer self-documenting code

Before writing a comment, ask whether a rename, extraction, or reorganization would eliminate the need for it.

- **Rename**: if a comment explains what a variable or function holds/does, the name should say it instead (`data` → `activeEmployees`, `handleClick` → `handleFilterToggle`)
- **Extract**: if a comment explains a block of logic, extract it into a well-named function (`// build N IPostBlock objects for inner panels` → `buildInnerPanelBlocks(...)`)
- **Reorganize**: if a comment acts as a section header to separate concerns, the concerns may belong in separate files or functions

A comment that restates what clear code already communicates is noise. Make the code say it first — comment only what remains unexplained.

**Apply the Delete Test as you write each comment, not just at review.** Mentally delete the comment before you commit it. If the code is equally clear without it, don't write it. Catching noise at write-time is essentially free; catching it at review-time is busywork that should never need to happen. The Delete Test in § Review Rules below is a backstop for what slips past, not a routine cleanup pass.

### When to comment — the Reader Question Test

Write a comment only when a competent developer reading this code for the first time would have a question that the code, types, and naming cannot answer.

If no question arises, no comment is needed. Most code should not have inline comments.

**Comment required** — the code is correct but surprising:
```ts
// populateDynamicFormFields mutates the form object in place
const clonedForm = structuredClone(form);
```

**No comment needed** — the code speaks for itself:
```ts
// Bad: "Append the new scripts to the container"
container.appendChild(script);

// Bad: "set the state"
setIsOpen(true);
```

**Comment is a code smell** — if you need a paragraph to explain what the code does, revisit the "Prefer self-documenting code" section above.

### How to write — "what" + "why", never "what" alone

When a comment is warranted, pair a brief "what" with the "why". The "what" gives scanning context so the reader doesn't have to parse the code first; the "why" explains the reasoning, constraint, or non-obvious consequence. A "what" without a "why" is narration — delete it or add the reason.

```ts
// Good — what + why
// Disable Splide's built-in pagination and arrows — Splide creates its own DOM
// elements on each re-initialization, duplicating the custom React elements below
const splideOptions = { ...optionsToUse, pagination: false, arrows: false };

// Good — what is implicit in the code, why is the valuable part
// Order here determines Algolia ranking priority
const facets = ["category", "brand", "price"];

// Bad — "what" alone, no reason given
// Disable Splide's built-in pagination and arrows
const splideOptions = { ...optionsToUse, pagination: false, arrows: false };

// Bad — narrates the code with no insight
// Creates an array of refinement option objects from synced shortlines
const options = shortlines.map(toRefinementOption);
```

The "why" the comment owes the reader is the invariant that makes the current code correct — not the migration that produced it. Changelog-voice ("Moved here from X", "Previously in Y", "Added to fix Z") looks like a "why" on the surface but describes the commit, not the code. Rewrite it as the constraint the reader cares about now — "X must happen here because Y" — and let git history carry the migration story.

### Placement

- Always on the line **above** the code it explains
- Never trailing on the same line
- Never in the import section — import sorting plugins (`@ianvs/prettier-plugin-sort-imports`) may reorder or detach comments. If an import needs explanation (side-effect imports, polyfill workarounds), place it in a file-level JSDoc above the imports or in the JSDoc of the function that depends on it

### No tags or prefixes

Write a plain sentence. No `// Why:`, `// NOTE:`, or any other prefix — if the comment survived the Reader Question Test, its purpose is already clear from context.

```ts
// Router routeToState does not run in block preview, so defaults must be set manually
const initialUiState = { [indexName]: { sortBy: sortBy.defaultValue } };
```

### Section markers

Use `// --- Label ---` to visually separate logical regions in files over ~150 lines.

```ts
// --- Event listener setup ---
document.addEventListener("DOMContentLoaded", () => {
  registerTooltips(".js-tooltip");
});
```

Keep to one short phrase. If you need many section markers, the file is probably too long — consider splitting it.

In JSX, use `{/* --- Label --- */}` for the same purpose. All other rules (Reader Question Test, Delete Test, no narration) apply to `{/* */}` comments the same as `//`.

---

## Not Allowed

| Pattern | Why | What to do instead |
|---|---|---|
| ALL CAPS comments (`// FILTER BY HEX COLOR`) | Reads as shouting, always narration | Rewrite in sentence case with a reason, or delete |
| `// TODO` / `// FIXME` | Becomes invisible debt, never gets done | Create a follow-up ticket |
| `// NOTE:` / `// HACK:` / `// XXX:` | Ambiguous intent, multiple tags for the same thing | Write a plain sentence explaining the constraint, or delete |
| `// START ... ` / `// END ...` block markers | Invented syntax to bracket code regions | Extract to a named function |
| Comments in the import section | Import sorting plugins may reorder or detach them | Use a file-level JSDoc above imports, or the JSDoc of the function that depends on the import |
| Changelog-voice comments (`// Moved here from X`, `// Previously in Y`, `// Added to fix Z`) | Describes the commit, not the code — rots as history moves and doesn't help the reader understand the current invariant | State the invariant that makes the current code correct ("X must happen here because Y") and let git history carry the migration story |

---

## Scope

These rules apply to **new and modified code**. Do not touch comments on lines you are not otherwise changing — cleaning up pre-existing comments is a separate, intentional task, not a side effect of unrelated work.

---

## Review Rules

### The Delete Test

When reviewing a comment on new or modified code, mentally delete it. Is the code equally clear without it? If yes, request removal. This catches narration, redundancy, and verbosity in one check.

### Always flag in review (new or modified code only)

- ALL CAPS comments — rewrite or delete
- Keyword tags (`TODO`, `FIXME`, `HACK`, `NOTE`, `XXX`) — rewrite as a plain sentence or create a ticket
- Comments that state "what" without "why" ("X is disabled", "set the variable", "filter the list") — either add the reason or delete
- Changelog-voice comments ("Moved here from X", "Previously in Y", "Added to fix Z") — rewrite as the current invariant or delete
- Multi-line comments that could be one line
- Comments that restate what TypeScript types already communicate (optionality, nullability, parameter names)
- `// START` / `// END` region markers

---

<!-- source: .prism/rules/code-standards.md -->

---
load: always
---

# Code Standards

Universal standards that apply to all code in this repository. Language-specific rules live in dedicated files (see the dedicated standards section at the bottom — opt-in based on the team's stack).

## General

- Do not introduce formatting-only changes.
- Do not remove pre-existing code comments in code you are not otherwise modifying.
- Propose large architectural changes instead of executing them.
- Stop and explain before changing public APIs, shared types, or shared utilities.
- Follow existing repository patterns — read before writing.
- Do not introduce new dependencies without approval.
- Avoid premature abstraction — three similar lines are better than one speculative helper.
- Two adapters serving the same port earn the abstraction; one adapter does not. The seam is real when a second concrete implementation forces the interface — until then, the "interface" is whatever the single caller needs, and inlining it produces clearer code.

### Refactor scope

Refactor code you're already modifying for the ticket — including small local-frame reshape (initializing a variable to its default, extracting a helper from the function you're in, collapsing redundant branches) when the existing shape is making the right answer harder than it needs to be. That's not drive-by refactor; it's making the fix compose.

Do not refactor code outside the local frame. Drive-by cleanup of nearby-but-unrelated code goes in a follow-up ticket.

**Why:** Terse "do not refactor unrelated code" wording can override downstream guidance on ambiguous calls and prime minimum-diff fixation — bolting fallback after fallback onto an awkward shape instead of reshaping the frame so the fix composes. Defining the local frame flips the precedence correctly without losing scope discipline.

**What "local frame" means:**

- **In scope:** the lines you're already modifying; the function or method containing those lines; helpers you extract from that code; files already in the diff for this ticket.
- **Out of scope:** unmodified code elsewhere in the same file; sibling files; "while I'm here" cleanup of code the ticket doesn't otherwise touch.

For the implementation-mode framing of the same rule, see `.claude/skills/prism-code-dev/SKILL.md` § Scope discipline and `### Anti-pattern: Drive-by refactoring`.

### Removal and rename completeness

When removing or renaming a concept — a function, type, config key, rule section, anything other code or docs reference — sweep every reference by searching the tree for the old name. Compiler errors and the diff are not the sweep: the compiler only sees code it type-checks, and the diff only shows files you already touched. The reference you missed lives in a file the change never opened — docs, templates, string literals, generated mirrors, sibling configs.

**Why:** a removal that leaves dangling references ships a claim that the concept still exists, and every later reader pays for the confusion. Diff-bounded review can't catch it either — the unfixed file never appears in the diff — so the author's tree-wide search is the only gate that sees the whole repo (the reviewer-side check lives in `.prism/references/review-frameworks.md` § Structural Scan Items).

## Whitespace

Use blank lines to separate logical units and improve scannability. Remove double blank lines and trailing whitespace.

### Required blank lines

- Between functions, methods, classes, types, and interfaces
- Before and after control structures (`if`, `else`, `for`, `foreach`, `while`, `switch`, `try`) — except:
  - When the control structure is the first statement in a block (right after `{`), omit the blank line above
  - When two tightly related control structures form a single logical check (e.g. sequential guard clauses that early-return), they may be grouped without a blank line between them
- Before a `return` statement, unless it is the only statement in the block
- Between groups of related variable assignments or declarations

### Not required

- Between individual lines within a single logical group (e.g. consecutive function calls or property assignments that form one operation)
- After an opening brace or before a closing brace

## Naming

- Functions must start with a verb — `checkPermission`, `filterItems`, `validateInput`.
- Do not use `is`-/`has`-prefixed names for regular functions — these read as boolean variables. **Exception:** TypeScript type guard functions (`x is SomeType` return type) use `is`-prefix by convention.
- Follow the language's convention for casing (camelCase, snake_case, PascalCase). When the codebase mixes languages, each language uses its own convention — don't normalize across the boundary.

## Handlers

- Event handler functions use the `handle` prefix — `handleLinkChange`, `handleImageSelect`. Names like `onChange` / `onSelect` / `onClose` are reserved for prop names passed to components or callbacks accepted by APIs.
- When a named handler function exists, it must contain all its logic — callers pass the handler reference directly (e.g. `onChange={handleLinkChange}`, not `onChange={(v) => handleLinkChange(transform(v))}`).
- If a handler needs to transform its input, widen its parameter type and do the transformation inside the handler body.

## File Organization

- Order within a module: imports → constants → exported types → exported functions → private utilities.
- Constants (queries, static config, lookup tables) go above types and functions, immediately after imports.

## Tests

- Do not break existing tests.
- Do not delete tests to make changes pass.
- Add tests when changes introduce meaningful risk.
- Explain verification steps when behavior changes.
- Test descriptions state the contract under test in the present tense, not the change that added them — see `writing-voice.md § Anti-pattern: Session-context leakage`.
- For UI work: visual regressions are caught at the visual layer (Storybook, Chromatic, Percy, screenshot diffing — whichever your team uses), not in unit tests. The team's tech-stack rules in `code-standards-*.md` (when included) cover the specific tooling.

## Comments

Follow `.prism/rules/code-comments.md` — JSDoc on declarations, plain sentences for inline comments, no tags or prefixes, no ALL CAPS, and apply the Delete Test in review.

## Dedicated Standards

Universal rules ship with PRISM. Language- and framework-specific rules are **generated per-codebase during onboarding** (Phase 2) — Atlas asks about your stack, then writes the relevant files into `.prism/rules/` populated with patterns from your actual code, not pre-shipped templates.

| Topic | Source | Loaded |
|-------|--------|--------|
| Comments | `.prism/rules/code-comments.md` | always (universal) |
| Accessibility (WCAG 2.1 AA) | `.prism/rules/accessibility.md` | always (universal) |
| Language-specific code standards (TypeScript, PHP, Python, Go, etc.) | generated per-team during onboarding | per `techStack` |
| Framework-specific guidelines (React useEffect, Vue composables, prop/arg ordering, component-props decoupling, etc.) | generated per-team during onboarding | per `techStack` |
| Build / test / lint / format commands | `.prism/rules/verification-commands.md` | always (Winston populates per-team in Phase 3) |

When the onboarding flow lands, an opt-in step asks: "Do you already have engineering standards (style guides, ESLint configs, Cursor/ChatGPT rules)?" If yes, Atlas reads them and decides — per the rule placement test in [`.prism/SPEC.md`](../SPEC.md) — whether each goes into `.prism/rules/` (loaded every chat), `.prism/architect/<topic>.md` (loaded contextually), or as an ADR (durable decision).

---

<!-- source: .prism/rules/context-reuse.md -->

---
load: always
---

# Context Reuse Within a Session

## Purpose

When a skill is multi-step and the same file shows up across steps, re-reading it on every step is wasted work. The file's content already lives in the session — the tokens are paid for, the bytes are in context, and another `Read` call adds noise without adding signal. The cost compounds across long sessions: a five-step skill that re-reads the same three files at every step burns roughly fifteen redundant tool calls and the read-results overhead that comes with them, all to learn what the session already knows.

**Why:** Skills that re-read are skills that drift. The re-read appears safe — "just confirm the file hasn't changed" — but in practice nothing's changed between two steps of the same session, and the safety margin is illusory. The real cost is that re-reads crowd context with duplicate content and push older, load-bearing context (the plan, the architect docs, the user's framing) closer to compaction. Reuse keeps the working memory intact.

## When to apply

Any multi-step skill invocation that touches the same file across steps. Concretely:

- Read each file once at the point it first matters, then refer back to that content from memory for the rest of the session.
- If the user explicitly says "the plan changed, re-read it" — re-read. The explicit signal overrides the default.
- If a tool you ran modified the file (e.g. `Edit`, `Write`, a build script that regenerates the file), the in-memory copy is stale by definition — re-read after the mutation, not before the next step.
- Otherwise, treat the first read as authoritative for the session.

The pattern is "read once, refer many" — not "read every step."

## Citation list — skills that load this rule

This rule is referenced by every PRISM skill's reflex-bullets section:

- prism-architect (Winston)
- prism-code-dev (Clove)
- prism-code-review-pr (Eric)
- prism-code-review-self (Briar)
- prism-debugger (Sasha)
- prism-documentation (Eli)
- prism-design (Pixel)
- prism-qa-test-plan (Reese)
- prism-ticket-start (Nora)
- prism-user-stories (Mira)
- prism-changelog (Sage)
- prism-standup-summary (Lilac)

---

<!-- source: .prism/rules/context-window-handoff-check.md -->

---
load: always
---

# Context Window Handoff Check

## Purpose

Before recommending the next persona or skill at the end of a skill session, assess context load. When the session has accumulated enough context pressure, name `/prism-handoff` as the remedy alongside the recommendation so the fresh chat doesn't lose details to compression.

**Why:** a persona recommendation that ignores context load hands the next persona a session already close to compaction, where load-bearing details get silently dropped. The check costs one evaluation at session close and protects the handoff at exactly the moment the context is most likely to be lost.

**Scope:** this check applies only to persona/skill handoffs — not to committing, pushing, running git commands, answering questions, or any non-skill task.

## How to apply

Evaluate these three signals:

1. **Multiple skills invoked** — 5 or more skill invocations in this conversation.
2. **Large codebase reads** — 30 or more files read, or 1,000 or more combined insertions and deletions (per `git diff --stat`).
3. **Extensive back-and-forth** — 100 or more user exchanges.

- **When 2 or more signals fire**, include in the handoff:

  > "We've covered a lot of ground. I'd recommend opening a new chat for [next persona] — they'll have full context available and won't risk losing details from compression."

  Name `/prism-handoff` as the remedy alongside that recommendation — it compacts this session into a handoff document the fresh chat continues from. Suggest it in the closing message; never auto-invoke it.

- **When only 1 signal fires**, proceed normally — a single signal alone is not sufficient evidence of context pressure.

- **When 0 signals fire**, don't mention context load at all.

## Who runs this rule

Every persona runs this check at the end of a skill session before recommending the next persona. The `/prism-handoff` utility skill is the named remedy when 2 or more signals fire.

---

<!-- source: .prism/rules/core-principles.md -->

---
load: always
---

# Core Principles

## Purpose

Two principles govern every change: keep it simple, and find the root cause.

- **Simplicity first** — make every change as simple as possible. Touch the minimal code that solves the problem.
- **No laziness** — find root causes. No temporary fixes. Senior-developer standards.

**Why:** the two pull in tension, and naming both keeps either from winning by default. Simplicity without root-cause discipline produces a quick patch that hides the real bug; root-cause discipline without simplicity produces a sprawling rewrite where a small fix would do. Holding both is the senior-developer standard — the smallest change that actually fixes the underlying problem.

**How to apply:**

- Prefer the smallest change that solves the problem. A larger change carries its own review and regression cost — earn it.
- When a fix would only mask a symptom, find the cause instead. A temporary fix is a deferred bug, not a closed one.

---

<!-- source: .prism/rules/cross-agent-handoff-accountability.md -->

---
load: always
---

# Cross-Agent Handoff Accountability

## Purpose

When applying a fix or acting on a diagnosis that originated from another agent, you are accountable for its correctness — not just its application. Verify the upstream work independently before proceeding.

**Why:** a fix passed between agents carries the upstream agent's confidence but not its verification — and a confidently applied wrong fix is worse than a slower correct one, because it ships looking deliberate. Treating every handoff as trust-but-verify catches the mismatch between diagnosis and fix before it reaches the user, which is the only place it's cheap to catch.

**How to apply:**

- Confirm the proposed solution logically addresses the root cause, not just that it changes something.
- If the math doesn't check out or the fix doesn't match the symptoms, flag it before applying.
- This applies to every handoff, not just suspicious ones — trust but verify is the standard.

Example: if a diagnostic agent prescribes specific pixel values for a layout fix, confirm the dimensional math produces the intended result rather than just applying the numbers.

## Who runs this rule

Every persona that applies a fix or acts on a diagnosis originated by another agent — the accountability transfers to whoever applies the work, regardless of who diagnosed it.

---

<!-- source: .prism/rules/demand-elegance.md -->

---
load: always
---

# Demand Elegance

## Purpose

For non-trivial changes, pause and ask "is there a more elegant way?" If a fix feels hacky, step back and ask: "Knowing everything I know now, what's the clean solution?" Challenge your own work before presenting it. The flip side: skip this for simple, obvious fixes — elegance is a tool, not a tax.

**Why:** the first working version of a non-trivial change is rarely the clean one, and the moment to find the clean version is before it ships — once it's in the tree, the hacky shape becomes the pattern the next change copies. The balance matters as much as the demand: over-engineering a one-line config change is its own failure, spending elegance budget where there's nothing to gain.

**How to apply:**

- For non-trivial changes, pause before presenting and ask whether a cleaner solution exists. If the fix feels hacky, it probably is — step back and find the clean version.
- Skip the pause for simple, obvious fixes. A one-line config change doesn't earn an elegance review.
- The test for which side you're on: does the change have a design with tradeoffs, or is it a mechanical edit? Designs get the pause; mechanical edits don't.

---

<!-- source: .prism/rules/followup-scope.md -->

---
load: always
---

# Follow-up Scope

## Purpose

Work surfaced after a ticket is underway doesn't always earn its own ticket. Same-scope work folds into the active PR when the originating ticket hasn't merged, or ships as a follow-up PR off `main` when it has — a new ticket is reserved for work whose scope genuinely splits from the original. When a follow-up *does* warrant a ticket, it earns its place only when its scope is sharp enough to act on; open-ended follow-ups ("clean up X someday") drift into the backlog as dead weight, because no one can tell when they're done or whether the next reader will agree on what "X" even means.

**Why:** Filing a new ticket for every small same-thread correction inflates ticket and story-point counts on work that's really one continuous effort — and each ticket carries real overhead: a backlog entry, a separate branch, cycle planning, and another full review cycle. When the work doesn't earn that overhead, the overhead is pure tax. The flip side is just as real: a vague follow-up ticket is worse than none — it consumes ticket-hygiene budget, gives the originating ticket false confidence that the work is "tracked," and leaves the next implementer guessing at intent. Both failure modes come from picking the wrong vehicle, so the rule's first job is choosing the vehicle.

## Choosing the vehicle: fold-in, follow-up PR, or new ticket

Walk this table before opening a ticket or recommending one:

| Situation | Action |
| --- | --- |
| **Pre-merge** — surfaced work is same-scope as the active ticket's thread | Fold into the active PR |
| **Post-merge** — small follow-up that's same-scope as the just-merged ticket | Open a follow-up PR off `main`, no new ticket |
| **Scope genuinely splits** — different personas, different systems, or a size that wouldn't have fit in the original ticket | New ticket |

**Four signals decide same-scope vs. splits:**

- **File overlap** — touches files in the original diff or the same directory? High overlap → same-scope.
- **Subject-matter adjacency** — same thread of thought (same refactor theme, same bug's root cause, same design goal)? Same thread → same-scope.
- **Size** — small enough to review as one focused PR without drowning the original change? Small → same-scope.
- **Persona alignment** — owned by the same persona class that owned the original? Cross-persona expansion signals that scope is splitting.

**Default to fold-in or follow-up PR.** Recommend a new ticket only when at least two signals point to "splits" — for example different personas plus different systems, or a size that would have triggered an epic in the original ticket.

## Follow-up PR conventions

When the vehicle is a follow-up PR (the post-merge, same-scope case):

- **Branch naming:** `<username>/prism-NNNN-followup-<short-slug>` — the original ticket ID anchors the lineage so PR lists and git logs read coherently. Follows the base convention in [`git-conventions.md`](./git-conventions.md) § Branch Naming.
- **PR body opener:** "Follow-up to PRISM-NNNN. No new ticket per `.prism/rules/followup-scope.md`." This pre-empts the "where's the ticket?" reflex from reviewers and auto-link tooling.
- **Ticket linkage (optional):** drop a one-line comment on the original ticket linking the follow-up PR when the audit trail matters — a notable feature, an epic, or a post-incident fix.

## Scope-fit gate

When the vehicle is a new ticket, the proposed scope passes the gate before Nora files it:

- **One fix or one feature.** A follow-up ticket addresses a single concern. "Refactor X and update Y and add tests for Z" is three follow-ups, not one.
- **Traceable to one decision.** The follow-up cites the specific decision, review comment, or plan entry in the originating ticket that produced it. The citation is a one-liner inside the ticket description, not buried in conversation.
- **Has a done condition.** A reader landing on the ticket cold can tell when it's complete. "When the helper is extracted and the three callers updated" passes; "when this feels cleaner" doesn't.
- **Owned by a known persona class.** The follow-up names which kind of work it is (implementation, debugging, design, documentation) so the next persona invocation routes correctly.

If the proposed scope fails any of these, Nora asks the user to narrow it before creating the ticket. The ticket is not created without an explicit override.

## What counts as in-scope for a follow-up

- A specific refactor, surfaced during review, that's larger than the local frame defined by [`.prism/rules/code-standards.md` § Refactor scope](./code-standards.md).
- A separate bug discovered while implementing the originating ticket — recorded in the plan's `## Debugged Issues`, not silently fixed inline.
- A documentation gap noted by Briar or Eric that isn't load-bearing for the current PR.
- A design follow-up Pixel flagged as out-of-scope for the current mock spec.
- A test coverage gap the originating ticket couldn't reach without scope creep.

The common shape: it could plausibly have been part of the originating ticket but wasn't, and there's a single specific action that closes it.

## Anti-patterns

- **Bundled cleanup tickets.** "Clean up the auth module" combining six unrelated cleanups into one ticket. Each cleanup is its own follow-up — or, if they're not worth filing individually, none of them are.
- **Open-ended phrasing.** "We'll figure out scope later." If you don't know what's in scope at file time, the ticket isn't ready to file.
- **Speculative follow-ups.** "Maybe we should look into X someday." Backlog noise. Either it's a known problem with a known shape (file it), or it's not (don't).
- **Follow-ups without traceability.** A ticket with no link back to the decision that produced it. Six months later no one can answer "why is this ticket here?" and it gets closed unread.

## Who runs this rule

- **Nora** (`prism-ticket-start`) — walks the three-tier table before filing. When the situation is a same-scope follow-up, redirects to a fold-in or a follow-up PR instead of creating a ticket. When a new ticket is warranted, applies the scope-fit gate and, if scope fails, asks the user to narrow it before filing.
- **Winston** (`prism-architect`) — during evaluate mode, before recommending a new ticket for surfaced work, walks the table; same-scope work is a fold-in or a follow-up PR, not a ticket.
- **Briar** (`prism-code-review-self`) and **Eric** (`prism-code-review-pr`) — when surfacing a follow-up item during review, the default answer is "follow-up PR." A recommended ticket arrives with the scope-fit elements already filled in so Nora can act on it without round-tripping.
- **Sasha** (`prism-debugger`) — when investigation surfaces an adjacent fix or refinement, applies the same table.

## Worker emit pre-filter (Sol-run-time)

When a worker persona (Clove, Briar, Eric, Sasha) operates inside a Sol run, it runs a lightweight two-question pre-filter before deciding whether to emit a `found-bug` or `found-followup-work` signal. This pre-filter is a cheap subset of the scope-fit gate above — it keeps trivial noise out of the registry without attempting Nora's full adjacency/size/persona-alignment judgment (that belongs in the decision box, per `lib/decision-box.md`).

**Two questions, in order:**

1. **Is this work inside my local frame?** The local frame is the lines being modified, the function or method containing those lines, and helpers extracted from that code — per `.prism/rules/code-standards.md § Refactor scope`. Work inside the local frame that is also trivial is fixed inline; everything else is emitted.
2. **Is this trivial?** Trivial means a one-line fix with no design trade-off. Non-trivial work is emitted even if it is inside the local frame.

**Decision table:**

| In local frame? | Trivial? | Action |
| --- | --- | --- |
| Yes | Yes | Fix inline, emit nothing. |
| Yes | No | Emit the signal. |
| No | Yes or No | Emit the signal. |

**Tiebreaker — borderline finds:** when uncertain whether to emit, **over-emit**. Downstream dedup and the decision box collapse duplicates and drop noise; a signal that is silently swallowed is unrecoverable. Over-emit < under-emit.

**Broken-dependency stub convention:** when a worker finds that a dependency of the code it is currently writing is broken and cannot proceed cleanly, it:

1. Emits the signal with a structured `target` (file, symbol, scopeSlug, or errorSignature as appropriate — per `lib/goal-state.md` schema).
2. Proceeds on a **documented stub** — a clearly-marked placeholder whose comment names the emitted signal's `target`. Example: `// Placeholder while <target.symbol> is broken — found-bug signal emitted; the reconcile pass tracks the fix.`
3. Does **not** stall the lane. The stub lets the lane continue; the emitted signal enters the registry for the next reconcile pass.

Reconciliation for stubs is **surface-not-rewire**: when the fix lane lands, the end-of-run report flags the original stub site for human or follow-up attention. v1 never auto-replaces stubs — the dependent lane's worktree may already be done, and rewiring is itself follow-up work.

---

<!-- source: .prism/rules/git-conventions.md -->

---
load: always
---

# Git Conventions

## Commit Messages

### Subject line

Format: `PRISM-NNNN: <imperative summary>`

- Start with the ticket ID, colon, space
- Use imperative mood ("Fix image distortion", not "Fixed" or "Fixes")
- Keep under 72 characters
- Capitalize the first word after the colon
- No trailing period

Variants:
- Follow-up commits after the main PR has merged: `PRISM-NNNN followup: <summary>`
- Chores not tied to a ticket (plan updates, CI config, tooling): `chore: <summary>`

### Body

Optional. When included, separate from the subject with a blank line. Explain **why**, not what — the diff shows what changed. Wrap at 80 characters.

Use the body when:
- The subject alone doesn't explain the motivation
- Multiple files changed for a non-obvious reason
- A decision was made that someone reading `git log` would question

When writing a body, escape bare `#N` references (plan step numbers, list positions) by wrapping them in backticks: write `` `#3` ``, not `#3`. GitHub autolinks `#N` in commit message displays to PR/issue N. Leave unescaped only when it's a genuine PR or issue reference. Same rule for PR bodies — see `.prism/rules/pr-description.md` § Writing mechanics.

### Formatting

Always pass the commit message via HEREDOC to preserve formatting:

```bash
git commit -m "$(cat <<'EOF'
PRISM-1588: Fix remaining ILink migration gaps in block registration and view props

The ILink migration missed two files: index.tsx still registered buttonUrl/buttonUrlTarget
as block attributes, and MegaMenuInfoBannerBlock.view.tsx still exported the old prop types.
Updated both to use link: ILink, matching the featured-banner pattern.
EOF
)"
```

### Not allowed

- `WIP` or `wip` commits — commit when the unit of work is complete
- `fixup!` or `squash!` prefixes — we squash-merge PRs, so the prefix is purely cosmetic. Branch-level commit structure is still read during review (see § Commit Granularity for when multiple commits are right)
- Emoji prefixes — the ticket ID and description carry the intent
- Generic messages ("update", "changes", "fix stuff") — every commit should be traceable to a reason

---

## Commit Granularity

Default to one clean commit per unit of work. Three exceptions earn multiple commits on a branch:

- **Multi-task work** — when the plan's `## Implementation Tasks` has multiple distinct tasks, commit per task as each completes. Branch-level `git log` is read by Briar, Eric, and human reviewers during development — readable commit boundaries help review, even though `main` only sees the squash (§ Merge Strategy).
- **Post-review follow-ups** — review fixes and `lessons.md` appends are separate commits, not amends to the prior commit. The reviewer diffs what changed since their last pass; an amend hides it.
- **User-requested mid-implementation commits** — if the user asks for one, honor it without prompting again.

---

## When to Commit

Commit your own work before handing off — to another persona, another session, or another person.

**Why:** uncommitted changes are invisible everywhere except the working tree they sit in. A handoff that leaves work uncommitted hands over a branch that misstates its own state — the next session can't tell finished work from forgotten scraps, and a concurrent session on the same checkout can sweep your changes into its own commits.

---

## Branch Naming

Format: `<username>/prism-NNNN-<slug>`

- `<username>`: GitHub username or author shortname, lowercased (e.g. `huntermcgrew`)
- `prism-NNNN`: ticket ID, lowercase
- `<slug>`: short summary from the ticket title, lowercase, hyphenated

Example: `huntermcgrew/prism-1588-mega-menu-info-banner-image-is-squished`

Always branch from `origin/main` — never from the current branch, which may carry unrelated commits.

---

## Merge Strategy

PRs are **squash-merged** on GitHub. This means:
- The PR title becomes the merge commit subject — which is why `pr-description.md` documents the title format (`PRISM-NNNN: <description>`)
- Individual commit messages on the branch don't appear in `main` history
- Commit quality still matters for branch-level `git log` and `git blame` during development

---

## Who merges

Merging and approving PRs is a human responsibility — on every tool (GitHub UI, `gh pr merge`, any future automation), for every persona by default. This is the merge-side complement of "Eric never approves PRs": the review-side rule binds the reviewer; this one binds every persona that touches a branch.

Cues like "it's approved", "QA passed", or "let's get it in" mean *finish the handoff* — push the final commits, sync the PR body, report the PR ready to merge. They are never an instruction to run the merge.

**Why:** the human clicking merge is the last gate where a wrong change can still be stopped. Approval excitement reads like authorization but isn't — an agent that merges on an enthusiastic cue removes that gate at exactly the moment scrutiny is lowest.

Sol may merge when `features.conductorMayMerge: true` is set in `.ai-skills/config.json`. The flag is the gate — Sol checks for it before any merge; absent or false means the human merges.

---

## Keeping a Branch Current

Refresh a branch from `main` by merging — `git merge origin/main`. Merge never rewrites commits another checkout may already hold, so it's always safe on a branch you share with reviewers, other sessions, or CI.

One trap earns a rebase instead: **the squash-already-upstream trap**. After a PR from your branch squash-merges, `main` carries a single commit with your changes while your branch still holds the individual commits. Merging `main` back in replays your own changes against their squashed copy — every subsequent edit to the same lines becomes a conflict with yourself. When continuing work on a branch whose PR already squash-merged, rebase the unmerged remainder onto `origin/main` (the already-merged commits drop out as empty) — or start a fresh branch from `origin/main`. This trap is live here because PRs squash-merge (§ Merge Strategy).

Never rebase a shared branch. Rewriting commits that exist in someone else's checkout forks the branch's identity, and reconciling afterward requires the force-push damage § Force Push Policy exists to prevent.

---

## Force Push Policy

- **Never** force-push to `main` or `master`
- Feature branches: allowed only when the user explicitly requests it
- Prefer new commits over amending — amending after a failed pre-commit hook targets the wrong commit
- `--no-verify` and `--no-gpg-sign`: never use unless the user explicitly asks

---

<!-- source: .prism/rules/lazy-artifacts.md -->

---
load: always
---

# Lazy Artifacts

## Purpose

Personas don't create empty or header-only placeholder files at install time or session start. Files come into existence when content is being written, not before. This keeps the consumer's `.prism/` surface honest — every file the team sees has content; nothing is a placeholder waiting to be filled in.

**Why:** Speculative seeding produces "files in waiting" that consumers scan through and dismiss. The cost compounds: every empty seed adds a paper-tiger file the team scans past on every audit, and the seed quietly diverges from how the file would actually be created (different header text, different timestamp format, different metadata) when the real first write happens. The originating trip-point was `templates/install/.prism/lessons-archive.md` — a header-only file consumers got pre-installed even when Zoe had nothing to archive. It was never load-bearing; it just sat there until wave 2 removed it.

## When to apply

- **Persona state files** — return `null` or sentinel on absent. Don't auto-initialize at session start; create on first content write. Atomic-write protocol (write to `.tmp`, rename) for state files that consumers may read concurrently.
- **Archive files** — create with the standard header on the first archive move, not at install time.
- **Report directories** (`.prism/audits/`, `.prism/retros/`, etc.) — create the directory when writing the first report; don't `mkdir` empty.
- **Install templates** — never ship empty or header-only files under `templates/install/.prism/`. Consumers receive nothing until they have something to receive.

## Canonical patterns

- **Theo's state file** (`.prism/theo-state.json`) — returns `null` on absent; created on first phase advance. Atomic-write via `.tmp` + rename. See `.prism/skills/prism-doc-walker/lib/state.md`.
- **Pixel's mock directory** (`.prism/design/mocks/`) — created on first mode 2 spec save.
- **Zoe's audits directory** (`.prism/audits/`) — created on first audit run (see `prism-surface-audit/shared.md` § Output format).
- **Atlas's onboarding state** (`.ai-skills/registry/onboarding-state.json`) — written on first answer; not seeded at session start.
- **Zoe's lessons archive** (`.prism/archived/lessons-archive.md`) — created with the standard header on first archive move. Wave 2 removed the install-template seed that previously shipped this file empty.
- **Zoe's archived plans directory** (`.prism/archived/plans/`) — created on first confirmed plan archive move; not pre-seeded.

## Exception: schema-required structural stubs

Some files need non-empty contents to be valid for downstream consumers — a manifest with default pattern→file routing, a config file with sentinel keys downstream code reads. These aren't speculative seeds; they're structural starting points without which the system fails on first load.

The test: **would the system fail to function if the file were absent at install time?** If yes (and the missing content is structural, not example data), the stub stays. If no (header placeholder, empty array, "this fills in when you do X"), it's a lazy candidate.

`templates/install/.prism/architect/manifest.stub.json` is the canonical exception — ships with the default pattern→file routing table consumers depend on before Atlas customizes during onboarding. Removing it would break first-load architect-context lookups for fresh installs. The exception is content-bearing on install (default routes), not a header-only placeholder.

## Who runs this rule

Every persona that creates files in `.prism/` applies this rule. Cite it when:

- Writing a new persona spec that produces operational state
- Adding install-template content
- Reviewing a PR that introduces a new file in `.prism/` or `templates/install/.prism/`

Briar and Eric flag any install-template addition that ships empty as Minor in review — apply the schema-required-stub test before accepting it.

---

<!-- source: .prism/rules/plan-before-building.md -->

---
load: always
---

# Plan Before Building

## Purpose

For any non-trivial task — 3 or more steps, or a real architectural decision — enter plan mode first and write the spec upfront. Plan mode covers verification steps too, not just the build. If something goes sideways mid-implementation, stop and re-plan rather than pushing through a broken approach.

**Why:** ambiguity at the start becomes rework at the end — the cheapest place to resolve an unclear requirement is before any code exists, and the most expensive is after the implementation has committed to the wrong shape. The plan exists to absorb course corrections cheaply: re-planning when the approach breaks costs a paragraph, while pushing through a broken approach costs the whole branch.

**How to apply:**

- A task is non-trivial when it spans 3 or more steps or turns on an architectural decision. When it does, plan before writing code.
- Write the spec — file paths, exact changes, verification — before implementing. The branch plan (`.prism/rules/branch-plan.md`) is where that spec lives.
- Plan the verification path too, not just the build. "How will I prove this works?" belongs in the plan from the start.
- When the approach breaks mid-implementation, stop and re-plan. Don't bolt fallbacks onto a shape that's fighting you.

---

<!-- source: .prism/rules/pre-compaction-checkpoint.md -->

---
load: always
---

# Pre-Compaction Checkpoint

## Purpose

When context usage approaches the compaction threshold, proactively create a summary checkpoint that captures the session's critical state. This protects against silent information loss during auto-compaction.

**Why:** auto-compaction drops context without announcing what it dropped, and the worst losses are silent — a constraint everyone still believes is in effect, a root cause that gets re-investigated because the first finding vanished. A checkpoint written before the threshold preserves the load-bearing state on purpose, so compaction reshapes the narration without losing the facts.

**How to apply:**

The checkpoint should include:

- Active branch plan state — what we're building, what's done, what's next.
- Architectural constraints and decisions established during this session.
- Known failures and their root causes — things we tried that didn't work and why.
- Cross-agent handoff state — what was diagnosed, by whom, what's pending.
- Any user corrections or lessons captured during this session.

## Who runs this rule

Every persona running a session long enough to approach the compaction threshold writes the checkpoint before compaction fires.

---

<!-- source: .prism/rules/self-improvement-loop.md -->

---
load: always
---

# Self-Improvement Loop

## Purpose

After a correction from the user, capture the pattern in `.prism/lessons.md`. Review lessons at session start. The goal is a mistake rate that drops over time — each lesson is a ratchet that prevents the same class of error from recurring.

**Why:** a correction that isn't captured is a correction you'll earn again. Writing the pattern down once turns a repeated mistake into a one-time cost. The flip side is real too: a lessons file that's too long to scan defeats its own purpose, so brevity and de-duplication are part of the rule, not an afterthought.

**How to apply:**

- After a correction, write the pattern to `.prism/lessons.md`. Before adding an entry, check whether an existing one already covers it — update rather than duplicate.
- Keep entries to one sentence where possible. The file earns its place only if it stays scannable.
- Review lessons at session start so the ratchet actually catches before the mistake repeats.

---

<!-- source: .prism/rules/session-orientation.md -->

---
load: always
---

# Session Orientation

## Purpose

Every persona skill opens a session with the same four-question battery, closes with another four, and checks in briefly whenever the work shifts underneath it in between. Getting this right catches scope drift, silent assumptions, and unproven "done" claims before they compound — on a five-minute fix as much as a multi-hour epic. This rule carries the mechanics once, so every skill body can point here instead of repeating the same paragraphs across the roster.

**Why:** the batteries only protect against drift if every skill runs them the same way — a skill that quietly drops the Ambiguity calibration clause, or forgets to persist the opening Bounds for the closing battery to diff against, loses the guarantee without anyone noticing. Centralizing the mechanic here means a wording fix lands once, not in however many skill bodies have already drifted from each other.

**How to apply:** run the Opening Orientation Battery at session start, persist it per Battery Persistence, run the Closing Re-Orientation Battery before reporting back, re-anchor at your skill's own event boundaries, and keep a lifecycle list near the top of your skill body. The sections below carry the exact mechanics for each.

## Opening Orientation Battery

Run this battery once, immediately after startup completes and before any of the skill's core work begins. Answer all four questions in sequence, inline in the response, so the scope and intent are clear before the first edit.

1. **Intent** — in one sentence, what is the plan/user actually asking for (the outcome, not the literal words)?
2. **Ambiguity** — what is unclear, under-specified, or readable two ways? For each: load-bearing (must resolve before starting) or non-load-bearing (proceed on a documented default)? **Calibration:** there is no user available mid-dispatch — do not stall; for each load-bearing gap pick a defensible default, state the assumption, and proceed. Escalate only by emitting a typed verdict (`needs-replan` / `blocked` / `needs-human`) when a gap genuinely blocks — never by a question into the void.
3. **Bounds** — what does "done" look like, and what must I not touch?
4. **Approach** — what is the smallest correct approach; is there a simpler framing than the obvious one?

## Battery Persistence

The opening battery's answers don't stay in the transcript — they compress to one line appended to the branch plan's `## Sessions` section (see `.prism/rules/branch-plan.md`), in an `open:` clause. The closing battery re-reads that line and diffs the finished work against the opening `Bounds` answer — Closing Q1 (Scope boundary) is that diff. When the closing battery finishes, append its verdict to the same line as a `close:` clause: `scope held` if the work matched the opening Bounds, or `drifted — <why>` if it didn't.

## Closing Re-Orientation Battery

Run this battery once, immediately before declaring the work complete and reporting back. Answer all four questions in sequence, inline in the response.

1. **Scope boundary** — what did I touch; is any of it outside what was named? What did I notice in adjacent work and leave alone? Emit `found-followup-work` or `found-bug` per `.prism/rules/followup-scope.md` § worker-emit pre-filter for anything left alone that warranted it.
2. **Unasked assumptions** — what did the request not specify that my work nonetheless decided? Name each silent decision.
3. **Edge recall** — what boundary inputs (empty, zero, absent, negative, malformed) does my work hit, and did I choose its behavior on purpose?
4. **Verification honesty** — for each thing I claim is done, what is the evidence (a test, a trace, a run)? Where am I asserting without proof?

Append the `close:` verdict to the same `## Sessions` line from the opening battery (see Battery Persistence above) before stopping.

## Mid-flight Re-anchors

Long sessions drift between the opening and closing batteries — a plan gets re-read, a scope-changing fact surfaces, a review comes back with findings. At each such event boundary, emit a one-line re-orientation: restate the current Intent and Bounds in one sentence each, confirm they still hold, and continue. This rule carries the generic trigger — re-anchor at event boundaries — because the specific events that count as a boundary are persona-shaped: a phase transition for a diagnostic skill, a review round for a reviewer, a plan re-read for an implementer. Each skill's own body names its own trigger events.

**Why:** a session that only checks orientation at the two ends can drift for hours in the middle without anyone noticing — the mid-flight re-anchor is cheap insurance against exactly that, and it costs one sentence, not a battery re-run.

## Lifecycle List

Every skill carries a short "The run, in order" list near the top of its body — the lifecycle phases in sequence, named in a few words each. It isn't new information; it's a long-context anchor, so a session that has read a lot since startup can re-orient from the list without re-reading the whole body.

## Who runs this rule

Every persona skill loads this rule and runs both batteries. Utility skills and onboarding run whichever parts fit their shape — a persona-less utility skips the persona-specific re-anchor line but still runs the batteries and keeps a lifecycle list; each skill's own body states which parts apply.

---

<!-- source: .prism/rules/skill-routing.md -->

---
load: always
---

# Skill Auto-Routing

## Purpose

When a user works without invoking a specific skill, detect what they're doing and proactively launch the matching skill. This is the pre-persona step — no skill is active yet, and you're deciding which one to fire up based on what the user said. Signal in, persona out.

**Why:** waiting for the user to say a skill name adds friction — if the intent matches, invoking immediately is the better experience. See the skill auto-routing decision in `.prism/spec/adrs/_toolkit/` for the full rationale.

## Routing table

| User intent                            | Invoke                                | Signal phrases / behaviors                                                                                                                                                                                                                                                                                      |
| -------------------------------------- | ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Writing or modifying code              | **Clove** (`prism-code-dev`)         | "fix this", "implement", "add a feature", "make this work", starts editing files, writes code directly                                                                                                                                                                                                          |
| Architecture or design questions       | **Winston** (`prism-architect`)      | "should we", "is this the right approach", "how should I structure", "does this pattern fit", asks about data flow or abstractions                                                                                                                                                                              |
| Debugging a bug                        | **Sasha** (`prism-debugger`)         | "this is broken", "why is this happening", "I'm getting an error", "it's not working", describes unexpected behavior                                                                                                                                                                                            |
| Reviewing a PR                         | **Eric** (`prism-code-review-pr`)    | "review pr", "review pr #123", "review #123", "review 123", "review this PR", "review pull request", "look at this PR", "check this PR", "PR review", shares a PR URL or number                                                                                                                                 |
| Starting a ticket                      | **Nora** (`prism-ticket-start`)      | "start PRISM-NNNN", "pick up this ticket", "I want to work on", shares a ticket ID                                                                                                                                                                                                                          |
| Writing user stories                   | **Mira** (`prism-user-stories`)      | "write user stories", "what are the requirements", "define the scope"                                                                                                                                                                                                                                           |
| Self-reviewing the current branch      | **Briar** (`prism-code-review-self`) | "review my changes", "is this ready for PR", "self-review", "check my work"                                                                                                                                                                                                                                     |
| UI/UX design questions                 | **Pixel** (`prism-design`)            | "what should this look like", "I don't have a mock", "does this layout make sense", "how should I lay this out", "propose a UI", "what should the empty state look like", "this feels off but I don't know why"                                                                                                 |
| QA test plans and bug-fix verification | **Reese** (`prism-qa-test-plan`)     | "QA plan for <release / sprint / PR / hotfix>", "QA checklist for PRs #X #Y", "release checklist for <tags>", "verify this bug fix", "retest", "bug fix verification", "QA this fix", "what should QA test", any two version tags, GitHub compare URL, a single PR number / URL / branch name, or a list of PRs |
| Generating a changelog                 | **Sage** (`prism-changelog`)         | "generate changelog", "release notes", "create changelog", "what changed between <tag1> and <tag2>", any two git tags provided for comparison                                                                                                                                                                   |
| Writing or updating documentation      | **Eli** (`prism-documentation`)      | "write docs", "document this feature", "generate feature docs", "update the docs", "let's document this"                                                                                                                                                                                                        |
| Goal-driven orchestration              | **Sol** (`prism-conductor`)          | "orchestrate", "run the fleet", "drive this from the SPEC", "build this end to end", "goal-driven run", "conductor"                                                                                                                                                                                            |
| Writing a PRD                          | **Parker** (`prism-prd`)             | "write a PRD", "spec out this initiative", "brownfield PRD", "Parker"                                                                                                                                                                                                                                            |
| Standup summaries                      | **Lilac** (`prism-standup-summary`)  | "standup", "daily sync", "summarize my PRs", "generate my standup", "Lilac"                                                                                                                                                                                                                                      |
| Setting company strategy               | **Vera** (`prism-founder`)           | "set strategy", "strategy doc", "OKRs", "mission", "cross-functional priorities", "business strategy", "Vera"                                                                                                                                                                                    |
| Market research                        | **Kora** (`prism-market-research`)   | "market research", "competitive teardown", "TAM", "segment sizing", "ICP research", "market sizing", "Kora"                                                                                                                                                                                                              |
| Finance and pricing                    | **Ellis** (`prism-finance`)          | "finance", "pricing", "unit economics", "runway", "budget", "pricing model", "margins", "Ellis"                                                                                                                                                                                                                 |
| Marketing and positioning              | **Charlie** (`prism-marketing`)      | "positioning", "messaging", "SEO", "marketing strategy", "Charlie"                                                                                                                                                                                                                                               |
| Sales — ICP, proposals, outreach       | **Quinn** (`prism-sales`)            | "ICP qualification", "proposal", "outreach", "objection handling", "sales", "Quinn"                                                                                                                                                                                                                                            |
| Metrics and analytics                  | **Tess** (`prism-data`)              | "metrics", "funnel analysis", "cohort analysis", "dashboard", "KPI", "conversion", "retention", "Tess"                                                                                                                                                                                                          |
| Customer success and support content   | **Remy** (`prism-customer-success`)  | "support playbook", "FAQ", "customer onboarding", "escalation runbook", "customer success", "Remy"                                                                                                                                                                                                              |
| Recruiting and hiring                  | **Penny** (`prism-recruiting`)       | "job description", "JD", "interview rubric", "hiring process", "scorecard", "headcount", "recruiting", "Penny"                                                                                                                                                                                                  |
| Legal and compliance                   | **Lex** (`prism-legal`)              | "terms of service", "ToS", "privacy policy", "contract review", "compliance", "legal", "Lex"                                                                                                                                                                                                                    |

## Named-invocation personas

These personas route on their name or an explicit trigger phrase only — never on bare-agent intent detection. Each is cadence-driven or ceremony-shaped (invoked at a bound event, not a conversational signal), so an ambient-intent match would misfire (e.g. "how did that go?" firing a retrospective).

- **Zoe** (`prism-surface-audit`) — audits the `.prism/` surface on cadence; explicit invocation only. Triggers: "weekly audit", "what's stale", "what can we archive".
- **Theo** (`prism-doc-walker`) — walks a target directory and drafts architect docs. Triggers: "find architect doc candidates", "what should we document", "scan for architect docs".
- **Ren** (`prism-refactor-scout`) — scouts refactor candidates and writes a refactor plan. Triggers: "find refactor candidates", "what should we refactor", "where's the dead weight".
- **Iris** (`prism-retro`) — runs the retro charter at plan close. Triggers: "retrospective", "post-mortem", "retro this epic".

## How to route

- When you detect a match, say: "This looks like [skill domain] work — bringing in [Persona]." Then invoke the skill.
- If a request falls outside the invoked skill's scope, see the cross-skill handoff language in [`.prism/architect/_toolkit/skills-ecosystem.md`](../architect/_toolkit/skills-ecosystem.md).
- If no skill matches (general questions, git operations, simple lookups), handle it directly — not everything needs a skill.

## Built-in skill overrides

- When the user says "review pr", "review #<number>", "review pull request", or any PR review phrase, invoke `prism-code-review-pr` (Eric) — not the built-in `/review` skill. The built-in `/review` doesn't understand this project's conventions, architect context, or plan system.

## Onboarding intent routing

- When the user says "onboard this repo", "set up PRISM here", "configure PRISM for my team", "Atlas onboard", or any first-install / re-onboarding phrase, invoke `prism-onboarding` (Atlas). Atlas detects the stack, generates per-team rules, writes `.ai-skills/config.json`, and populates stub anchors. Runs once per team install or on stack change.

## Utility skills

- `prism-handoff` is a *utility* skill — no persona; it runs in the current persona's voice (see the persona-vs-utility skill-type decision in `.prism/spec/adrs/_toolkit/`). Invocation is user-initiated: the `/prism-handoff` command or a direct ask to hand off, continue in a new chat, or pass work to a fresh session. Personas may suggest it at session close but never auto-invoke it. It compacts the session into a handoff document and reports the path back.
- `prism-review-loop` is a *utility* skill — no persona; it runs in the invoking persona's voice (see the persona-vs-utility skill-type decision in `.prism/spec/adrs/_toolkit/`). Invocation is user-initiated: the `/prism-review-loop` command or a direct ask to run the review loop or gauntlet on a PR. It orchestrates self-review → fix → PR-review loops to a zero-findings pass and closes with a scoreboard TLDR; the PR stays draft.
- `prism-skill-forge` is a *utility* skill — no persona; it runs in the current voice. Invocation is user-initiated: "create skill", "scaffold skill", "new skill", "add persona", "migrate skill", "decompose skill", "import skill". Create mode scaffolds a new PRISM skill from scratch; migrate mode decomposes a generated platform skill back into canonical source.

## Sol is a persona, not a utility

Unlike the utility skills above, Sol (`prism-conductor`) carries its own persona and voice on the orchestration axis — it may be invoked directly or auto-routed per the table. It has no authoritative write path: it writes only its run-control state (`.prism/conductor-state.json`), dispatches the other personas, and routes their verdicts — never code, tracker writes, or merges. See the conductor-autonomy-between-gates decision in `.prism/spec/adrs/_toolkit/`.

## Skip auto-routing when

- Trivial tasks (single-file rename, quick git command, formatting)
- The user explicitly says "don't use a skill" or "just do it"
- The user is already inside a skill session (don't nest skills)

## Authors ship, reviewers review

Once implementation or authoring is complete, the authoring persona owns the full shipping step — commit, push, and open the PR — without a prompt before pushing. Clove ships for code. Eli ships for docs. Sage and Reese ship their own artifact PRs (release PRs themselves are still owned by the team lead, not Sage or Reese). Briar and Eric review but never ship — when a user asks a reviewer to create a PR, route back to the author persona instead. This keeps the review adversarial edge intact and avoids the iteration-loop ambiguity that would otherwise build up. See the authors-ship-reviewers-review decision in `.prism/spec/adrs/_toolkit/` for the decision and its tradeoffs; the framework behind it lives in `.prism/plans/4.7-skill-audit-strategy.md` (Round 10).

---

<!-- source: .prism/rules/subagent-strategy.md -->

---
load: always
---

# Subagent Strategy

## Purpose

Keep the main context window clean by offloading research, exploration, and parallel analysis to subagents. One task per subagent keeps execution focused.

**Why:** the main window holds the load-bearing context — the plan, the architect docs, the user's framing. Every file a subagent reads on the main window's behalf crowds that context closer to compaction. For complex problems, more compute via subagents is almost always the right call: it's cheaper to spend a subagent than to run out of context in the main window and lose the thread.

**How to apply:**

- Offload research, exploration, and parallel analysis to subagents — anything that reads a lot to produce a small answer.
- Scope one task per subagent. A subagent with a single clear task returns a clean result; a subagent juggling three tasks returns a muddled one.
- When a problem is large enough that you're unsure whether to spend the compute, spend it. Running out of context is the more expensive failure.

---

<!-- source: .prism/rules/verification-before-done.md -->

---
load: always
---

# Verification Before Done

## Purpose

Prove a task works before marking it complete. Run tests, check logs, demonstrate correctness. The bar is: "Would a staff engineer approve this?" If you're not sure, you're not done.

**Why:** "done" claimed without proof is a claim the next reader inherits and pays for when it turns out false. Demonstrated correctness — a passing test, a clean log, a behavior diff — is the difference between believing the work is right and knowing it. The staff-engineer bar names the standard concretely so "done" means the same thing across sessions and models.

**How to apply:**

- Run the tests, check the logs, and demonstrate the behavior before calling a task complete.
- Diff behavior between `main` and your changes when the change is behavioral — the diff is the proof.
- Hold the work to the staff-engineer bar. If you're not sure it would pass review, it isn't done yet.

---

<!-- source: .prism/rules/writing-voice.md -->

---
load: always
---

# Writing Voice

Write durable communication like you're onboarding a teammate, not drafting a compliance contract. This rule applies to skills, rules, architect context, ADRs, templates, the durable parts of plan files, PR descriptions, commit messages, and tickets and comments — and the rule itself follows the voice it asks for, so the example reads alongside the explanation.

The principle is _durable_ communication — anything a future reader will load as context. Lessons (`.prism/lessons.md`), in-progress plan history, Slack messages, and ad-hoc conversation are not held to this standard — they're working notes, not durable record.

---

## Onboarding voice, not mandate voice

Mandate voice — `NON-NEGOTIABLE`, all-caps `MUST`, `FAILURE STATE`, `HARD RULE` — reads as a contract written for someone who needs to be controlled. Onboarding voice reads as guidance from a colleague who already trusts you to do the right thing once you understand it. The constraint is the same; the framing changes how the reader receives it.

**Why:** Absolute mandates trigger an alignment-override reflex that can invert or ignore the instruction. The team also reads better-framed prose more carefully, and rules that read like prose age better than rules that read like policy.

**How to apply:**

- Reframe absolute mandates as contextual authority. "The team's intentional engineering standards — built through iterative testing" lands better than "NON-NEGOTIABLE — follow exactly as written."
- Reframe prohibitions as consequences. "Fabricating a search erodes trust faster than admitting uncertainty" lands better than "Do not fabricate searches."
- Use imperative form without mandate prefixes. "Offer this after every PR push" works; "MUST offer this after every PR push" doesn't.
- Lowercase natural usage is fine. The problem is `MUST` as behavioral framing, not the word "must" inside a sentence ("partial loads miss constraints, so every matching pattern must be loaded").
- Section headings that name an anti-pattern (e.g. `Anti-pattern: Drive-by refactoring`) work better than headings that shout at the reader (e.g. `FAILURE STATE: NEVER DO THIS`).

---

## Explain the why

Every rule, every ADR, every architect-context constraint cites its reason. A rule without a reason gets treated as arbitrary and skipped in edge cases, because the reader has no way to tell whether the rule is load-bearing or stale.

**Why:** The reason is what survives contact with situations the rule's author didn't anticipate. "We learned the hard way that Y caused Z" lets the reader judge whether Z is still a risk in front of them. "Do X" doesn't.

**How to apply:**

- Rules in `.prism/rules/` lead with the rule, then a `**Why:**` line (the reason — often a past incident or an observed cost) and a `**How to apply:**` line (when the rule kicks in). This rule's structure is the example.
- ADRs use the `## Context` section for the same purpose. No decision is documented in isolation.
- Skill files cite ADRs when they encode a cross-cutting decision (e.g. "see ADR-NNNN" for a rule like "Eric never approves PRs"). The skill carries the narrative; the ADR carries the reasoning.
- The exception is where the reason is obvious from context — "use TypeScript" in a TypeScript project doesn't need a citation. Non-obvious reasons do.
- When you find yourself writing a directive without a reason, pause and add it. If you can't articulate the reason, the directive may not earn its place.

---

## Keep it short enough to be read

A short rule that gets read beats a long rule that gets skimmed. Aim for the minimum prose that conveys the rule, the reason, and how to apply it. If a rule needs many sub-cases, that's a signal to either split it or accept that it's a long rule and structure it for scanning.

**Why:** Spec files are loaded into agent context and read by humans during PR review. Both audiences cost time on every word. Padding inflates the cost without adding signal.

**How to apply:**

- Lead with the point. Don't open with framing prose ("This document covers...") — start with the rule.
- Cut the meta. "It is important to note that..." adds nothing. Remove it.
- Use lists for parallel cases, prose for connected reasoning. A bullet list with five entries is more scannable than the same content in a paragraph.
- One concrete example beats three abstract ones. Pick the example that's most likely to come up in real work.

---

## Plain language over jargon

When a plainer word carries the same meaning, use it. When a technical term is load-bearing — the reader will keep seeing it, or plain words can't carry the concept alone — introduce the concept in plain words first and drop the term in behind.

**Why:** Spec content is read by people with different levels of context — a senior engineer scanning for correctness, a new hire reading to learn, a reviewer scanning for concerns. Jargon-dense nouns ("primitive," "manifest," "orchestrator") make comprehension harder for every reader at once. The plainer phrasing is free; jargon only earns its place when nothing else fits.

**How to apply:**

- When you reach for a noun that needs a gloss to land, try the gloss on its own first. If the gloss carries the meaning, delete the noun.
- When a term is genuinely load-bearing, introduce the plain version first and drop the term in behind — don't ask the reader to learn the term from the cold. `GitHub Environments already hold the authoritative list of dealers... the environments _are_ the fleet manifest` works; opening with `GitHub Environments are the fleet manifest` doesn't.
- One concrete example beats an abstract definition. If a term earns a paragraph of gloss, it probably isn't load-bearing enough to include at all.
- Watch for nouns that sound architectural but add no signal — "primitive," "abstraction," "mechanism." These are usually standing in for a verb phrase that would land directly.

---

## Answer first, one offer at a time

Lead with the answer. When the reader asked a question, the first sentence answers it; when they asked for work, the first thing is the result. Support follows the answer — don't build up to it through context the reader has to hold open.

**Why:** every sentence before the answer is cognitive load the reader carries while waiting to learn whether the rest matters. Menus of options, caveat sandwiches, and trailing offer-stacks each push a decision back onto the reader that the writer was better positioned to make.

**How to apply:**

- Point, don't menu. When you have a recommendation, make it — "do X, because Y" beats three options with neutral trade-off prose. Reserve option lists for calls that are genuinely the reader's.
- No caveat sandwiches. Qualify once, where the qualification matters — not before and after every claim.
- Be opinionated when you have an opinion. Hedged prose reads as false modesty or real uncertainty; if it's real uncertainty, name what would resolve it instead of hedging around it.
- Name the tangent instead of following it. "X is also worth a look — separate thread" keeps the answer on the asked question.
- Surface the bigger version, build the asked-for one. "This could generalize to all blocks; building the one you asked for" — one line, then the work.
- One offer at a time. Close with the single next step you'd actually take, not a menu of everything you could do.

Two carve-outs:

- Scope discipline still governs what gets *built*. "Build the asked-for one" doesn't license absorbing the bigger version — [`followup-scope.md`](followup-scope.md) and [`code-standards.md` § Refactor scope](code-standards.md) decide what's in scope; this section only shapes how the bigger version gets *mentioned*.
- Deliberate decision gates are exempt. Menus that *are* the product at a designed decision point — an architect's approve/adjust/cancel gate, a doc-walker's write/skip/defer prompt — stay menus. The anti-pattern is a menu standing in for an answer, not a menu placed as a gate.

---

## Count rules, not numbers

When spec refers to a collection that grows over time — per-block docs, rules, allowed blocks, registered endpoints, persona roster — state the rule that defines membership ("one per block," "every feature flag gets an entry") rather than the current count ("14 files," "8 rules"). Counts drift the moment the collection grows; rules stay true.

**Why:** Hard counts are observations, not specifications. They go stale silently — a new doc lands, the count doesn't update, and a reader two months later sees `15 files` next to a directory of 16 and loses trust in the whole document. Rules describe the shape of the collection, which doesn't change when the collection grows. See PR #1845 (Eric's glob-vs-count minor on the Mega Menu per-block docs) for the incident that surfaced the pattern.

**How to apply:**

- Count rules like "one per block" or "every X has a Y" are strictly more informative than numbers — they tell the reader _why_ the count is what it is, and let them predict what next week's count will be.
- Counts earn their place only for (1) closed sets ("all 8 HTTP methods," "four `wp_options` keys"), (2) order-of-magnitude signals with a `+` ("60,000+ plugins," "400+ dealer sites"), or (3) historical snapshots in a changelog or plan History entry ("added 14 per-block docs in this PR") where the count is a frozen fact about a moment in time.
- If you catch yourself writing `(N files)` alongside a directory or glob pattern — delete it. The directory is the source of truth; the count is redundant when it's right and misleading when it's wrong.
- When the itemized list feels too loose and you reach for a count to tighten it — write the rule instead. If the rule is hard to articulate, the collection may not have a coherent boundary, and the spec has a bigger problem than a drifting number.
- Compound count claims drift twice as fast as standalone counts. "5 of 12 personas load this rule" goes wrong the moment either side moves — a new persona lands, or a different subset loads the rule. Replace the compound with the rule that governs membership: "every persona that operates on a Linear ticket loads this rule" stays true through both kinds of growth. Same trap for "three of the four backports" — name the criterion ("the backports that touch reviewer skills") instead of the count.

---

## Anti-pattern: Session-context leakage

A durable artifact — anything a future reader loads cold, with no memory of the work that produced it — describes its subject only, never the session that wrote it. The principle is the test, not the list. Comparative language across other artifacts in the run ("largest so far," "third one I've written," "unlike the others"), progress markers ("in the loop," "in this batch," "next up"), and any framing that requires knowing the run's order or scope to make sense leak the moment of writing into content that gets read cold months later. The same leak shows up in docs, ADRs, plan entries, PR bodies, source comments and JSDoc, and test descriptions (`describe`/`it` strings) — the list is illustrative, not exhaustive.

**Why:** Eli wrote `docs/content/dev/blocks/feature.md` during a batch run documenting many blocks in sequence. The Overview included the line _"This is the largest single-block editor in the loop so far (~410 lines of `edit.tsx`)... The frontend block (~230 lines)..."_ — comparison ("largest so far") that only made sense inside that generation session, paired with hard line counts that drift the moment the file changes. Caught on read-through, after the doc shipped. lessons.md 2026-04-27.

**How to apply:** Before saving a durable artifact, re-read it as someone landing on it cold from search six months from now. If a sentence only makes sense given the session that wrote it — delete it. The Overview should land for a reader who has no idea other docs were generated in the same sitting. Test descriptions are durable too: name the contract under test, not the change that produced it or the implementation token it happens to use — prefer `it("renders the newest size", ...)` over a name pinned to a specific token or the edit that introduced it. This pairs with the "Count rules, not numbers" section above — both are observations about the moment of writing, not specifications about the subject.

<!-- END GENERATED TIER-1 RULE BODIES -->

---

## Task Management

The plan is the working memory across sessions. See [`.prism/rules/branch-plan.md`](.prism/rules/branch-plan.md) for the full workflow — find or create the plan, use it as context, track progress, preserve intentional logic, record decisions, capture lessons.

---

## 1. Plan Before Building

See [`.prism/rules/plan-before-building.md`](.prism/rules/plan-before-building.md).

## 2. Subagent Strategy

See [`.prism/rules/subagent-strategy.md`](.prism/rules/subagent-strategy.md).

## 3. Self-Improvement Loop

See [`.prism/rules/self-improvement-loop.md`](.prism/rules/self-improvement-loop.md).

## 4. Verification Before Done

See [`.prism/rules/verification-before-done.md`](.prism/rules/verification-before-done.md).

## 5. Demand Elegance

See [`.prism/rules/demand-elegance.md`](.prism/rules/demand-elegance.md).

## 6. Autonomous Bug Fixing

See [`.prism/rules/autonomous-bug-fixing.md`](.prism/rules/autonomous-bug-fixing.md).

---

## 7. Project Engineering Standards

The `.prism/rules/` and `.prism/architect/` files are the team's intentional engineering standards — the equivalent of a style guide. Follow them as the default authority for project-specific decisions; if a situation genuinely requires deviation, flag it and explain the reasoning rather than silently overriding. When you find a gap, recommend an update or a new file.

---

## 8. Context Window Handoff Check

See [`.prism/rules/context-window-handoff-check.md`](.prism/rules/context-window-handoff-check.md).

---

## 9. Ownership & Handoff

Skill ownership and handoff phrases live in [`.prism/architect/_toolkit/skills-ecosystem.md`](.prism/architect/_toolkit/skills-ecosystem.md) §§ Skill Roster, Cross-skill Handoffs.

---

## 10. Bash Output Minimization

See [`.prism/rules/bash-output-minimization.md`](.prism/rules/bash-output-minimization.md).

## 11. Cross-Agent Handoff Accountability

See [`.prism/rules/cross-agent-handoff-accountability.md`](.prism/rules/cross-agent-handoff-accountability.md).

## 12. Pre-Compaction Checkpoint

See [`.prism/rules/pre-compaction-checkpoint.md`](.prism/rules/pre-compaction-checkpoint.md).
