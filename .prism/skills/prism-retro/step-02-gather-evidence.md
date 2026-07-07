---
step: step-02-gather-evidence
---

# Step 02 — Gather evidence

Gather *intent* evidence (plan sections) and *outcome* evidence (execution record), then compute charter coverage. Iris reads only — she does not modify the source plan.

## Actions

1. **Read the per-team evidence config first.** Load `.ai-skills/config.json#retroEvidence`. It declares which execution-record sources exist for this team: CI system present + name; PR/review platform; test command; DoD/coverage gates. Every outcome-evidence source below is gated on this config, not hardcoded — a source the config marks absent is skipped and rendered as `not configured for this team` in the coverage table, distinct from `configured but unreachable this run`. When `retroEvidence` is absent entirely (team hasn't onboarded the block yet), treat every execution-record source as not configured and proceed on plan evidence + git (git is always available, never gated).

2. **Grain switch.** Read `grain` from the dispatch input (`per-pr` | `epic`, default `epic`; Sol and the branch-plan ceremony pass it explicitly).
   - **`per-pr`** — scope is one ticket/PR. Read only that ticket's plan-AC, its merged diff, its own CI conclusion, and its PR review thread. No cross-plan glob, no aggregation. Output is the compact per-ticket fidelity note (charter items 1/4/5/6 for this ticket only).
   - **`epic`** — scope is the epic plan and its children. Full source set below, **plus** ingest any per-PR fidelity notes emitted by child tickets (the map-reduce: per-PR notes are the map output, the epic retro reduces them) so the epic retro spends budget on cross-ticket patterns, not re-deriving per-ticket fidelity.

3. **Read the target plan(s) — intent evidence.**
   - Epic-plan mode: read the single plan file at `retroTarget.planPath`.
   - Date-range mode: glob `.prism/plans/*.md` and include every plan whose `## History` section has at least one entry whose date falls inside `[from, to]`.
   - Per-PR mode: read the single ticket's plan file at `retroTarget.planPath`.

4. **Categorize the intent evidence.** For each plan in scope, extract entries from these sections:
   - `## History` — every dated line. Capture date, branch name, and the one-line summary.
   - `## Decisions` — every Decision bullet. Capture the headline, sub-bullets (root cause / alternatives / chosen approach / implementation guidance), and the verdict sub-bullet if present.
   - `## Acceptance Criteria` — every AC item, for charter item 1 (did we do what we said).
   - `## Debugged Issues` — every entry with status, severity, root cause, recommended fix.
   - `## Review Issues` — every entry with severity, status, file:line, problem, suggested fix.

5. **Gather outcome evidence — each action config-gated and individually skippable.**
   - **Merged diffs (git — always available, never `not configured`).** From `## History` branch names and PR references, resolve merge commits: `git log --oneline --grep=<ticket-id>`, or `gh pr view <n> --json mergeCommit,files` when the config's PR platform is GitHub. Used for charter item 1 (AC-vs-shipped).
   - **PR review threads.** Via the config's PR platform for every PR the plan names. For GitHub, fetch **all three** surfaces and merge them — none alone is complete:
     - **Issue-comments** (where Eric actually posts review findings, since he files no Review object — ADR-0011): `gh api repos/{owner}/{repo}/issues/{number}/comments --paginate` (PR comments live on the *issues* endpoint). This is the load-bearing addition — without it, a reviewed PR reads as un-reviewed.
     - **Review objects and their line comments** (present when a reviewer did attach a formal review): `gh pr view <n> --json reviews` and `gh api repos/{owner}/{repo}/pulls/{number}/comments --paginate`.
     - **Check-run rollup** for the CI cross-reference (see the CI bullet below): `gh pr view <n> --json statusCheckRollup`.

     Resolve `{owner}/{repo}` from the git remote (`gh repo view --json owner,name -q '.owner.login + "/" + .name'`). Used for charter items 4/5 (standards adherence and "did we do anything wrong" findings that never reached the plan). Tag every entry `source: "pr-thread"` regardless of which surface it came from. Items 4/5 are answerable when *any* of the three surfaces yields review content; they render `pr-thread-unreachable` only when the platform is configured-but-all-surfaces-failed, and `not-configured` only when the team config declares no PR platform. An empty `reviews[]` with non-empty issue-comments is **answerable**, not a gap.
   - **CI conclusions.** Only when the config declares a CI system — check-run *conclusions* (pass/fail history), not log archaeology. Used for charter item 6. No-CI team → this row renders `CI — not configured for this team`.
   - When dispatched by Sol, evidence pointers (plan path, PR numbers, CI outcomes, lane verdicts) arrive in the dispatch prompt — use them before searching.
   - **Runtime gate on top of the config gate.** Even a configured source can be unreachable this run (e.g. `gh auth status` fails) — that renders `configured but unreachable this run`, and the dependent charter items are unanswered for this run only (not marked `not-configured`).

6. **At `epic` grain, ingest per-PR fidelity notes.** Glob `.prism/retros/<epic-slug>/*.md` (or `.prism/retros/per-pr/<ticket-id>.md` for tickets that predate the epic subdir convention) for every child ticket named in the epic plan's `## History` or a `## Stories` reference. Read each note's charter-coverage row and fidelity gap. These feed the dialogue synthesis in step 04 and the `### Per-ticket fidelity` citations in step 06 — do not re-derive a child ticket's AC-vs-diff fidelity from scratch when its note already answered it.

7. **Cross-reference Decisions against Debugged Issues and outcome evidence.** For each Decision that names a chosen approach, scan `## Debugged Issues` for entries whose root-cause text overlaps with the Decision's rejection rationale or chosen-approach claim. At `epic` grain, extend the scan: divergence candidates also include AC items with no corresponding shipped change (merged diff doesn't cover the AC), Decisions contradicted by PR-thread findings, and CI red-cycles clustered on an area a Decision called low-risk. Flag any divergences — these are the candidates for evidence-based disagreement in step 04.

8. **Tag every outcome-evidence entry** with its source: `"pr-thread"`, `"ci"`, or `"merged-diff"` — so plan-borne and execution-borne citations never blend in step 06's Citations split.

9. **Compute charter coverage.** For each of the six charter items, determine whether the evidence reached (intent + outcome, gated by config and runtime reachability) can answer it. Build `evidence.charterCoverage`:
   ```json
   [
     { "item": 1, "answerable": true, "sources": ["decisions", "merged-diff"], "gap": null },
     { "item": 6, "answerable": false, "sources": [], "gap": "not-configured" }
   ]
   ```
   `gap` is `"not-configured"` when the config marks the source absent, the name of the missing source when a source exists but wasn't reached (e.g. `"pr-thread-unreachable"`), or `null` when answerable.

10. **Write the evidence blob to state.** Append to `.prism/iris-state.json`:
    ```json
    {
      "grain": "per-pr" | "epic",
      "evidence": {
        "history": [...], "decisions": [...], "debugged": [...], "review": [...], "divergences": [...],
        "census": { "history": N, "decisions": N, "debugged": N, "review": N, "prThreads": N, "ciRuns": N, "mergedPrs": N },
        "charterCoverage": [...]
      },
      "stepsCompleted": [..., "step-02-gather-evidence"],
      "currentStep": "step-03-stage-voices"
    }
    ```

## Exit condition

`evidence` blob populated in state with categorized intent and outcome entries. `evidence.charterCoverage` populated with one entry per charter item, each carrying a named `gap` (`not-configured` distinguished from an unreachable source) or `null`. At `per-pr` grain, at least the plan-AC and merged-diff sources were attempted (git is never `not configured`). At `epic` grain, at least one entry exists in `history` (a retro with zero history entries has no signal to work with — surface the miss and abort).
