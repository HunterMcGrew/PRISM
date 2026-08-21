# Skill core — the shared startup and close contract

Read once per session, at Step 0 of a persona skill, before the greeting. Each
section is a pointer plus the fact it establishes — the cited file owns the
mechanics, and restating them here would fork them. A persona that overrides a
core section does it with a one-line stub under a `Persona notes on the shared
core:` sub-list in its own body, never a restatement.

## Orientation

Run the Opening Orientation Battery per
[`session-orientation.md`](../rules/session-orientation.md) before the skill's
core work. The no-user-available calibration, stated once: mid-dispatch there
is no user — for each load-bearing gap pick a defensible default, state the
assumption, and proceed; escalate only by typed verdict (`needs-replan` /
`blocked` / `needs-human`), never by a question into the void.

## The plan is the working memory

Resolve the plan before the work: follow
[`plan-lookup.md`](plan-lookup.md), and treat the plan per
[`branch-plan.md`](../rules/branch-plan.md) — `## Decisions` entries are
intentional constraints until explicitly retired, and `## History` is
append-only.

## Reading before writing

Match the paths you will touch against `.prism/architect/manifest.json` and
load every matching architect doc — partial loads miss constraints, and
architect-context routing is diff-blind to a doc you are about to edit (see
[`context-reuse.md`](../rules/context-reuse.md) § Architect-context routing is
diff-blind). Authoring paths are write-gated: on hosts with the hook runtime,
edits to routed paths are denied until their routed docs are read (ADR-0072).

## Reporting back

When dispatched by Sol, finish by returning one report-back in the canonical
dispatch schema. The schema's single owner is
`.prism/skills/prism-conductor/lib/report-back.md` § Canonical dispatch schema;
it is quoted here verbatim because something downstream parses it — never
paraphrase it, never abbreviate the enum:

```
{
  verdict: "done" | "needs-fix" | "blocked" | "needs-replan" | "needs-stronger-model" | "needs-human",
  summary: string,
  signals?: [
    {
      kind: "found-bug" | "found-followup-work" | "observation",
      note: string,
      target?: { file?: string, symbol?: string, scopeSlug?: string, errorSignature?: string }
    }
  ],
  gateDisposition?: "auto-cleared" | "needs-human" | "blocked" | "none",

  // write lanes only — see § Evidence fields (write lanes)
  filesChanged?: string[],
  verificationCommand?: string,
  verificationExitCode?: number,

  // Reese's ac-verify dispatch only — see § `acVerdicts`
  acVerdicts?: [
    {
      id: string,
      criterion: string,
      verdict: "MET" | "UNMET" | "UNGRADEABLE",
      evidenceType: "executed" | "inspected" | "demonstrated",
      evidence: string,
      reason?: "ac-defect" | "harness" | "dead-reference" | "requires-human" | "converted"
    }
  ]
}
```

## Closing

Run the Closing Re-Orientation Battery per
[`session-orientation.md`](../rules/session-orientation.md) before any
`done`-class verdict — the closing battery does not scale down with task size —
then close the session per [`session-close.md`](session-close.md).

## Context budget

The main window is for reasoning. Reuse what's already loaded: read once,
refer many; re-read only after a mutation or an explicit "it changed." Batch
independent reads into a single parallel pass. Quiet routine commands
(`git push -q`, silent installs, pass/fail-only build output); keep full
output where it is the information — diffs, test failures, errors (see
[`bash-output-minimization.md`](../rules/bash-output-minimization.md)).

Delegate to a subagent only for work that's genuinely independent and big
enough to pay for itself — a wide multi-file investigation, a broad search
across unfamiliar directories — and keep only the conclusion. Don't delegate
what you'd finish in a handful of tool calls, don't spawn several agents where
one would do, and don't use a subagent to check your own work (see
[`subagent-strategy.md`](../rules/subagent-strategy.md)).
