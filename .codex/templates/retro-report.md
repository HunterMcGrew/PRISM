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
<a source the team lacks reads `not configured for this team` and a configured one that failed reads `unreachable this run`, never one for the other. Add "N of 6 unanswered" when more than half are, and say the final child's main-branch CI is approximated by its PR CI, since earlier children have fully merged>
| Charter question | Answer | Sources | Gap |
| --- | --- | --- | --- |
| <one row per charter question> | <answer, or "unanswered"> | <the evidence that reached it> | <what no source reached, or "none"> |

## Multi-voice dialogue
<each finding on its own line, attributed to the stage that left the evidence, opening with the per-PR fidelity synthesis>

## Action Items
- <action> — proposed owner: <stage or persona> → <ticket-id>, Tasks (Implementation Tasks on a legacy flat plan)
- <action> — proposed owner: <stage or persona> → ticket proposal via Nora

## Promotion cautions
<Decisions the execution record refuted, with citing evidence>

## Lesson candidates
<patterns fitting `.prism/lessons.md`, proposed and never appended>

## Lessons exits
<folder plan only, so omit the section on a flat plan. Each entry promoted, expired, or merged this run, with its heading and the reason, or "none">

## Review-miss classes
<folder plan only, so omit the section on a flat plan. The output of `node scripts/ai-skills/hooks/review/reconcile.mjs --classes`, then one line per class: proposed fix, the human's verdict, and the resolve row appended, or "no open class">

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
**Trigger:** <each reason `retro-trigger.mjs` printed, such as `review: <line>`, `challenge: round <n>`, or `amended: T<n>`, separated by semicolons>
**Generated:** <YYYY-MM-DD>
**Graded at:** <sha of the PR head commit the evidence was read against>

## Charter coverage
<the same table as the epic grain, one row per charter question, with a CI check still pending shown as `CI pending on <sha>`>

## Fidelity gap
<any divergence between said and shipped, or "none — shipped as planned">

## Action Items
<at most two, same pointer lines as the epic grain — omit the section when none>

## Promotion cautions
<any `## Decisions` entry the execution record refuted, with citing evidence — omit the section when none>

## Lessons exits
<folder plan only, so omit the section on a flat plan. Each entry promoted, expired, or merged this run, with its heading and the reason, or "none">

## Review-miss classes
<folder plan only, so omit the section on a flat plan. The output of `node scripts/ai-skills/hooks/review/reconcile.mjs --classes`, then one line per class: proposed fix, the human's verdict, and the resolve row appended, or "no open class">

## Citations
### Plan evidence
### Execution record
```
