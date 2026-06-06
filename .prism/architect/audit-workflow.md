# Audit Workflow

Human-facing version: `docs/content/dev/architecture/audit-workflow.md`.

This document describes Zoe's audit workflow over the `.prism/` surface — what she scans, how she classifies, what she writes, and the schema of the operational state file she reads and writes between runs.

Zoe is the first cadence-driven persona in PRISM. See [ADR-0037](../spec/adrs/0037-cadence-driven-personas.md) for the axis the persona class sits on, and the canonical Zoe skill source at `.ai-skills/skills/prism-surface-audit/` for her invocation prompts and run-time procedure.

## Cadence

Zoe runs on cadence, not on ticket flow. The default cadence is weekly; the user invokes her explicitly when the cadence comes due, or on demand any time the durable `.prism/` surface needs an audit pass. The cadence is advisory — no tooling forces invocation, no auto-trigger fires when a week elapses. The user controls timing.

A typical reason for off-cadence invocation: a session writes a large number of entries to `.prism/lessons.md` and the user wants to classify and prune before the file gets unwieldy. Another: a plan that's been open longer than expected, and the user wants to know which `## Decisions` entries are still load-bearing.

## Audit surfaces

Zoe walks four surfaces in a single audit run. Each surface produces a section in the run's output report.

- **`.prism/plans/`** — every plan file in the directory. For each plan, Zoe walks the `## Decisions` section and issues one verdict per entry. She also scans for open-question Decision variants and flags any that have aged past the open-stale threshold.
- **`.prism/lessons.md`** — every entry in the lessons file. Zoe classifies each lesson as live (still referenced in active plans, rules, or ADRs) or archive-candidate (no recent references). Archive-candidate lessons move to `.prism/lessons-archive.md` on the user's confirmation.
- **`.prism/spec/adrs/`** — every ADR. Zoe scans the `## Context` and `## Consequences` sections for assumptions that may no longer hold (a referenced PR closed without merging, a sibling decision since superseded, a stated constraint that the codebase has since lifted). Findings surface as "ADR review candidate" entries — Zoe doesn't change ADRs, only flags them for a human to revisit.
- **`.prism/architect/`** — every architect doc. Zoe scans for re-enumeration drift (a doc claims "the X states are A, B, C" while a sibling doc owns a different enumeration of X) and for stale source references (a path the doc cites that no longer exists). The architect-doc-verification rule (`.prism/rules/architect-doc-verification.md`) already covers in-session edits; Zoe runs the same triage on cadence across the whole `.prism/architect/` set.

## Per-Decision verdict procedure

For every `## Decisions` entry in every plan file, Zoe issues exactly one verdict. The verdict is written as a sub-bullet directly on the Decision entry — it does not live in a separate report-only artifact, because downstream personas (Winston, Clove, Briar, Eric, Zoe) need to see the verdict when they read the plan.

The four verdicts:

- **`live`** — the decision is still in effect. The underlying constraint that produced it has not shifted; downstream code continues to depend on it. No action.
- **`archive-candidate`** — the decision is no longer load-bearing. The work it constrained has shipped, the constraint it responded to has lifted, or the decision was specific to a tactic that's since been replaced. The Decision becomes a candidate for promotion to a durable surface (architect doc, ADR, rule) if it carries lasting value, or for deletion alongside the plan if it doesn't. Promotion-or-deletion is reviewed during plan close.
- **`overdue-archive`** — the decision references work that shipped more than 90 days ago AND the plan is still open. The plan has overstayed its useful life; the Decision either belongs in a durable surface or should have been pruned. Flagged for user attention.
- **`open-stale`** — the Decision is an open-question variant (`OPEN — TBD, needs <name> input`) that has been open longer than 30 days without resolution. The default path the entry documents has been carrying the work, which may be fine — but the open question itself has gone stale and warrants either resolution or explicit acceptance of the default as the final answer.

Verdicts are mutually exclusive — exactly one applies. When a decision matches multiple criteria (for example, an `OPEN` entry that's also overdue-archive because the plan is past 90 days), the more severe verdict wins: `open-stale` < `archive-candidate` < `overdue-archive`. Zoe records the verdict and the date in the sub-bullet so the next audit run can tell whether the verdict has aged into a new bucket.

The verdict sub-bullet format:

```markdown
- The original decision text from Winston.
  - **Zoe verdict (YYYY-MM-DD):** `live` | `archive-candidate` | `overdue-archive` | `open-stale` — one-line reason.
```

The one-line reason is the trace — what evidence Zoe used to issue the verdict. "Referenced by `.prism/architect/skills-ecosystem.md` § Skill Roster" for `live`. "Plan closed in PR #N; constraint no longer applies" for `archive-candidate`. "Plan opened 2025-10-12, last activity 2026-02-03; work shipped" for `overdue-archive`. "Open since 2026-02-21; default-path commits in 4 PRs since" for `open-stale`.

## Archive classification

Lessons in `.prism/lessons.md` get classified into two buckets on each audit run.

- **`live`** — the lesson is referenced by an active plan, rule, ADR, or architect doc within the last 30 days. The reference might be explicit (a rule's `**Why:**` line cites the lesson) or pattern-implicit (a Decision uses the lesson's recommendation verbatim). Live lessons stay in `.prism/lessons.md`.
- **`archive-candidate`** — no plan, rule, ADR, or architect doc has referenced the lesson in the last 30 days, AND the lesson is older than 30 days at the time of the audit. New lessons are never archived on their first audit run — every lesson gets a grace period to be referenced before it can be classified as archive-candidate.

Archive-candidate lessons get moved to `.prism/lessons-archive.md` on the user's confirmation — Zoe never moves entries silently. Each archived entry retains its original date and content; an archive timestamp is appended on move. The archive file is append-only — lessons don't come back out of the archive.

## Open-question Decision variant

Some Decisions name an open question the team hasn't resolved yet. The variant format is:

```markdown
- **OPEN — TBD, needs <name> input.** <Description of the open question>. **Default path (used until resolved):** <Description of the path work follows in the meantime>.
```

The variant lets work continue under a documented default while the open question remains visible. Without the explicit `OPEN` marker, an undecided decision either blocks work or gets silently absorbed into one of the implicit paths — both of which lose the question.

Zoe handles this variant on cadence. When she encounters an `OPEN` entry, she checks the open-since date (the original Decision's commit timestamp, or an explicit `**Open since:** YYYY-MM-DD` line if present). If the open-since date is more than 30 days in the past, the verdict is `open-stale` per the procedure above.

`open-stale` does not mean "the default path is wrong" — the default path may be exactly the right answer, and the open question may be resolvable by accepting the default as the final answer. The verdict is a prompt to either resolve or explicitly close the open question, not a directive to change implementation.

## Output format

Zoe's run produces a single markdown report saved to `.prism/audits/<YYYY-MM-DD>-audit.md`. The report is the durable artifact — it captures what Zoe saw, what verdicts she issued, what she archived (after confirmation), and what she deferred. The report is not posted to chat unless the user explicitly asks for a summary.

The report shape:

```markdown
# PRISM Audit — YYYY-MM-DD

## Summary

- N plans audited; X live, Y archive-candidate, Z overdue-archive, W open-stale.
- N lessons audited; X live, Y archive-candidate.
- N ADRs scanned; X flagged for review.
- N architect docs scanned; X flagged for drift.

## Plans

### <plan-file-name>.md

- Decision N: `live` — <reason>.
- Decision M: `archive-candidate` — <reason>.

(repeats per plan)

## Lessons

- <lesson-title>: `live` — <reason>.
- <lesson-title>: `archive-candidate` — <reason>. **Moved to lessons-archive on confirmation.**

## ADRs flagged for review

- ADR-NNNN: <one-line reason>.

## Architect docs flagged for drift

- `.prism/architect/<doc>.md`: <one-line reason>.

## Deferred

- <item>: deferred by user — <reason>.
```

The audit directory `.prism/audits/` is created on first run if it doesn't exist. The directory is operational, not durable spec — it lives at `.prism/` (not in templates) and accumulates run reports the user can revisit.

## State file

Zoe reads and writes `.prism/audit-state.json` between runs. The state file persists what the last run already classified, so a follow-up run doesn't re-classify entries the user already accepted or deferred. The file is operational state, not durable spec — it lives at `.prism/` (not in templates) and ships empty per the seed shape below.

### Schema

```json
{
  "schemaVersion": 1,
  "lastRun": null,
  "classified": {},
  "deferred": [],
  "archived": {
    "lessons": [],
    "plans": []
  }
}
```

Field semantics:

- **`schemaVersion`** — integer. Bumps when the file shape changes in a non-additive way. Zoe checks this on read; if the version is newer than Zoe expects, she halts and asks the user to update.
- **`lastRun`** — ISO 8601 timestamp or `null` on first run. Set to the run's start timestamp on every successful audit pass.
- **`classified`** — object keyed by plan file path (relative to `<repo-root>`), value is the ISO 8601 timestamp of the most recent verdict issued for any Decision in that plan. Used to skip re-classification on rapid follow-up runs.
- **`deferred`** — array of objects: `{ "item": "<plan-path>:<decision-index>", "reason": "<user-supplied string>", "deferred_at": "<ISO 8601>" }`. Items the user explicitly chose to defer during a run — Zoe re-prompts these on the next run after their deferral grace period elapses.
- **`archived`** — object with two arrays:
  - **`lessons`** — entries that have been moved to `.prism/lessons-archive.md`. Each entry: `{ "title": "<lesson title>", "archived_at": "<ISO 8601>" }`.
  - **`plans`** — plans that have been closed after Zoe's audit confirmed all Decisions were promoted or archived (the plan files are preserved at close — ADR-0047). Each entry: `{ "plan": "<plan-file-name>", "closed_at": "<ISO 8601>" }`.

### Migration

A future Zoe revision that needs to change the schema increments `schemaVersion` and ships a migration in the skill source — Zoe reads the file, detects the older version, applies the migration, and writes back at the new version. The state file is small enough that migrations don't need optimization.

## How Zoe interacts with other personas

Zoe doesn't hand off to ticket-flow personas the way they hand off to each other. She's invoked, she runs, she writes her report and updates her state, she exits. Downstream personas don't need to know Zoe ran — they discover her verdicts when they read the plans she annotated.

The five personas that read plan `## Decisions` sections — Winston, Clove, Briar, Eric, Zoe — carry a reflex bullet: "when reading a plan's `## Decisions`, note any decision with a Zoe-issued verdict sub-bullet (live / archive-candidate / overdue-archive / open-stale) and respect the verdict during current work." That reflex is how Zoe's output becomes load-bearing for the ticket flow without Zoe being in the ticket flow herself.
