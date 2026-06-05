# Plan: audit-2026-06-05-closeout

> Closed: 2026-06-05

## Ticket

None — chore work spun out of Zoe's first cadence audit (`.prism/audits/2026-06-05-audit.md`). Branch: `hmcgrew/prism-audit-2026-06-05`.

## Goal

Close out every shipped-but-never-closed plan flagged by the 2026-06-05 audit, retire the stale roadmap, and remove every live spec claim that plans are deleted at close.

---

## Decisions

- **Batch close-out in one chore PR, riding the audit branch.** The close-on-final-branch rule (`branch-plan.md § Before Closing`) can't apply retroactively — these plans' final PRs merged weeks ago — so a standalone close-out PR is the unavoidable cost of the missed gate. Pay it once, not fourteen times; the closes ride with the Zoe verdicts that justify them.
  - → no promotion needed (PR-shape tactic for this chore)
- **roadmap.md is superseded and closed, not refreshed.** Considered: refreshing statuses in place. Rejected: the file has demonstrated twice over that nobody maintains it between milestones — a refresh re-arms the staleness clock and re-flags at the next audit. Per-epic plans plus audit reports are the live source of truth; the roadmap's phase rationale and ADR renumbering map keep their value as historical record. A fresh forward-looking roadmap can be written later if a single planning surface is wanted — deliberately not part of this close-out.
  - → no promotion needed (disposition recorded in roadmap.md's supersession note itself)
- **The deletion-claim rule fixes are absorbed by Winston in this PR** (documented absorption per ADR-0018's cross-lane options). Sentence-level edits in `.prism/SPEC.md`, `.prism/rules/`, `.prism/references/`, `.prism/architect/` — all Winston's write surface; platform mirrors regenerate mechanically via `pnpm prism:build`. Routing to Clove would cost more than the work.
  - → no promotion needed (documented absorption per ADR-0018; the rule fixes are the durable artifact)
- **Sweep scope: fix live policy claims only; leave historical records.** `lessons.md:35` (quotes the old rule as incident context, resolution note already appended), `epic-prism-thrive-backport-wave-4.md:51` (records that the wave-3 plan *was* deleted — true at the time), and the audit report itself (Zoe's record of what she saw) all describe history, not current policy. Rewriting them would falsify the record.
  - → no promotion needed (sweep-scope call specific to this chore; the fix-policy-preserve-history principle is ADR-0047's)
- **Persona-epic History gaps get one factual backfill line inside the close entry, not a reconstructed timeline.** atlas/theo/ren/parker shipped with zero History past creation; the close entry states what the evidence shows (shipped by 2026-05-27; History not maintained) without inventing dates.
  - → no promotion needed (one-shot backfill approach)
- **`.prism/audit-state.json` stays untouched.** It's Zoe's operational state — Winston writing it crosses her lane for no benefit; her next run reads the `> Closed:` markers directly. The schema's `archived.plans` description in `audit-workflow.md` is corrected from "closed and deleted" to "closed" (ADR-0047), which changes the doc, not the state file.
  - → no promotion needed (lane-respect call; Zoe's state ownership is codified in audit-workflow.md)
- **Stale Review Issues resolve at close:** the three `open` entries in `epic-phase-1-foundation.md` flip to `fixed` (Phase 1.5d resolved them — audit evidence); the one Minor in `prism-detailed-plans.md` flips to `deferred` (a Minor on a closing plan that nobody will pick up — formal deferral beats a paper-tiger `open`).
  - → no promotion needed (status corrections recorded in the affected plans)

---

## Implementation Tasks

### Winston

1. **Verdict-gate + close the ten older plans** that lack promotion verdicts: `epic-phase-1-foundation.md`, `epic-prism-install-layout.md`, `prism-detailed-plans.md`, `epic-prism-thrive-backport.md`, `epic-prism-tokenization.md`, `epic-prism-pattern-absorptions.md`, `epic-prism-atlas.md`, `epic-prism-theo.md`, `epic-prism-ren.md`, `epic-prism-parker.md` (all in `.prism/plans/`). For each: append a verdict sub-bullet to every `## Decisions` entry (`→ promoted to <architect-doc/ADR>` or `→ no promotion needed (<reason>)` — Zoe's `archive-candidate` verdicts inform but don't substitute); add `> Closed: 2026-06-05` under the title; append a `## History` close entry. For atlas/theo/ren/parker include the factual backfill clause per Decisions. Any decision found genuinely unpromoted gets promoted to its architect doc/ADR before the marker lands — list these in the PR body. Verification: every plan has the marker and zero verdict-less Decision bullets.
2. **Verify-and-close the four newer plans**: `epic-prism-thrive-backport-wave-2.md`, `issue-39.md`, `epic-lean-skill-architecture.md`, `skill-descriptions-rewrite.md`. Confirm existing promotion coverage on each Decision (add verdicts where missing), then marker + History entry as in task 1.
3. **Backfill the marker on `epic-prism-pattern-absorptions-wave-2.md`**: add `> Closed: 2026-05-24` (the History-recorded close date) under the title; one-line History entry noting the backfill. No verdict work — its 2026-05-24 close already ran promotion.
4. **Flip stale Review Issues** (part of tasks 1's files, sequenced with them): `epic-phase-1-foundation.md` — three `open` → `fixed`, each with a one-line note citing Phase 1.5d as resolver; `prism-detailed-plans.md` — the 2026-05-04 Minor (state-wireframe annotation placement) → `deferred`, note "deferred at plan close 2026-06-05."
5. **Fix the stale PR-Readiness item in `epic-prism-parker.md:471`** during its close: `Plan deleted after PR-3.5 merges and lasting decisions are promoted` → `Plan closed after PR-3.5 merged; lasting decisions promoted (plans are preserved at close — ADR-0047)`.
6. **Supersede + close `roadmap.md`**: under the title add `> Closed: 2026-06-05` and a note: "**Superseded.** All phases below shipped (or moved to their own epic plans). Current work and status live in the per-epic plans in this directory and in `.prism/audits/`; this file is preserved as the historical record of PRISM's phased buildout and ADR renumbering." Append a History entry. No status-table edits — the stale rows are part of the record.
7. **Deletion-claim sweep** — replace every live policy claim that plans are deleted at close (verified site list; mirrors regenerate in task 8):
   - `.prism/SPEC.md:75`: `Then delete the plan — git history preserves it.` → `The plan is then marked closed and preserved in .prism/plans/ — plans are never deleted (ADR-0047).` (No install seed exists for SPEC.md.)
   - `.prism/rules/implementation-task-detail.md:70`: `…PRISM tasks are session-local execution units deleted with the plan. The detail bar fits PRISM's lifetime…` → `…PRISM tasks live in the branch plan and go inert once the ticket closes (the plan is preserved — ADR-0047). The detail bar fits PRISM tasks' short working lifetime…` (Install seed already generalized — canonical only.)
   - `.prism/references/triple-gated-adr-criterion.md:23`: `belongs in the plan's ## Decisions and gets deleted with the plan` → `belongs in the plan's ## Decisions, carrying a no-promotion verdict when the plan closes (ADR-0047)`. Line 30: `Git history preserves these once the plan closes.` → `The closed plan preserves these — plans are never deleted (ADR-0047).` Same two edits in `templates/install/.prism/references/triple-gated-adr-criterion.md`.
   - `.prism/architect/audit-workflow.md:141`: `plans that have been closed and deleted after Zoe's audit confirmed` → `plans that have been closed after Zoe's audit confirmed` (+ same edit in `templates/install/.prism/architect/audit-workflow.md:141`). Zoe's skill source delegates the schema to this doc — no skill edit needed.
8. **Regenerate mirrors and verify**: run `pnpm prism:build`, then `pnpm prism:check` — both must exit clean. After task 7, re-run the sweep grep (`grep -rni "deleted with the plan|closed and deleted|delete the plan" .prism/ templates/ --include="*.md"`) and confirm only the historical-record sites from Decisions remain.
9. **Close this plan**: verdict-gate its own Decisions, `> Closed: 2026-06-05`, History entry. Commit per task group along the way (`chore:` subjects per git-conventions).

### Clove

10. **Ship** (after tasks 1–9): push `hmcgrew/prism-audit-2026-06-05`, open a draft PR per the shipping flow with body from `.prism/templates/pr-description.md`. The body's Notes section leads with the exceptions: any decisions task 1 found genuinely unpromoted, so the reviewer reads the judgment calls, not the rubber stamps.

---

## Acceptance Criteria

### Behavioral

- [ ] Given any shipped plan in the plans folder, when a reader opens it, then a "Closed" line appears under the title and every Decisions entry carries a promotion verdict (REQ-1)
- [ ] Given the roadmap file, when a reader opens it, then the opening lines state it is superseded and point to where current status lives (REQ-2)

### Non-behavioral

- [ ] No live rule, reference, architect doc, or spec text claims plans are deleted at close; historical records (lessons, plan histories, audit reports) are unchanged (REQ-3)
- [ ] Platform mirror check passes after regeneration (REQ-4)
- [ ] The audit branch carries both the audit annotations and the close-outs in a single PR (REQ-5)

### AC Adjustments

### AC Sync Log

| Date | Agent | Action | Plan | Linear |
| ---- | ----- | ------ | ---- | ------ |
| 2026-06-05 | Winston | Generated AC | updated | N/A — no Linear ticket for this chore |

---

## History

- 2026-06-05 [hmcgrew/prism-audit-2026-06-05]: Plan created — close-out of the 2026-06-05 audit findings (14 plan closes, wave-2 marker backfill, roadmap supersession, deletion-claim sweep). Dispositions confirmed by Hunter; site list verified by tree-wide grep, which surfaced `.prism/SPEC.md:75` and `audit-workflow.md:141` beyond the audit's two flagged sites.
- 2026-06-05 [hmcgrew/prism-audit-2026-06-05]: Tasks 1–9 executed — 15 plans closed (14 retroactive closes + this one), wave-2 marker backfilled, roadmap superseded, deletion-claim sweep applied (7 edits across 5 files + 2 seeds), mirrors regenerated, all verification gates green. One genuine promotion executed: the templates/install dual-write convention → `install-layout.md` § The templates/install seed surface. Plan closed; ship (task 10) remains.
- 2026-06-05 [hmcgrew/prism-audit-2026-06-05]: Task 10 shipped — branch pushed, draft PR #86 opened with exceptions-first Notes per the Decisions.
