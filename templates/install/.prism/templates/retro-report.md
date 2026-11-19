# Retro Report Templates

The report skeletons for `prism-retro`, one per grain. The skill owns the paths, naming rules, and write mechanics, and this file owns the shapes.

## Epic grain

```markdown
# Retro — <slug-or-date-range>

**Target:** <plan-path-or-date-range>
**Grain:** epic
**Generated:** <YYYY-MM-DD>
**Graded at:** <sha of the branch head the evidence was read against>
**Voices:** <comma-separated stage names, or persona names on a legacy flat plan>

## Summary
<one-paragraph synthesis of the main finding>

## Charter coverage
<the six-row table from the skill's evidence step, plus the evidence-count line>

## Multi-voice dialogue
<each finding on its own line, attributed to the stage that left the evidence, opening with the per-PR fidelity synthesis>

## Action Items
- <action> — proposed owner: <stage or persona> → <ticket-id>, Tasks (Implementation Tasks on a legacy flat plan)
- <action> — proposed owner: <stage or persona> → ticket proposal via Nora

## Promotion cautions
<Decisions the execution record refuted, with citing evidence>

## Lesson candidates
<patterns fitting `.prism/lessons.md`, proposed and appended only once the user accepts>

## Lessons exits
<each entry promoted, expired, or merged this run, with its heading and the reason, or "none">

## Review-miss classes
<the output of `node ${HOOK_RUNTIME_DIR}/review/reconcile.mjs --classes`, then one line per class: proposed fix, the human's verdict, and the resolve row appended, or "no open class">

## Citations
### Plan evidence
### Execution record
### Per-ticket fidelity
```

## Per-pr grain

```markdown
# Retro — <ticket-id>

**Target:** <plan-path>
**Grain:** per-pr
**Generated:** <YYYY-MM-DD>
**Graded at:** <sha of the PR head commit the evidence was read against>

## Charter coverage
<one row per charter item: shipped-vs-said, review-clean, CI pass, fail, or pending>

## Fidelity gap
<any divergence between said and shipped, or "none — shipped as planned">

## Action Items
<at most two, same pointer lines as the epic grain — omit the section when none>

## Promotion cautions
<any `## Decisions` entry the execution record refuted, with citing evidence — omit the section when none>

## Lessons exits
<each entry promoted, expired, or merged this run, with its heading and the reason, or "none">

## Review-miss classes
<the output of `node ${HOOK_RUNTIME_DIR}/review/reconcile.mjs --classes`, then one line per class: proposed fix, the human's verdict, and the resolve row appended, or "no open class">

## Citations
### Plan evidence
### Execution record
```
