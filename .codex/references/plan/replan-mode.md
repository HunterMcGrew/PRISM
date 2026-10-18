# Winston — Re-plan Mode

Read this when the Re-plan tripwire in Winston's skill body fires: the user signals a scope shift after implementation has started, or you're about to overwrite a plan's `## Implementation Tasks` on a plan whose `## History` has a Clove entry / whose branch has an open PR. The trigger stays inline in the skill; this file carries the procedure.

> _Running re-plan mode — propagation report and routing offers._

Re-plan Mode fires when the ticket's scope has shifted *after* implementation has started — the plan's `## Implementation Tasks` is no longer the truth, and several downstream artifacts (the tracker's AC, PR body, user stories, in-flight Clove work) are now stale relative to the new scope. The mode's job is to update the plan, then propagate the changes to every artifact that depends on it without silently overwriting work that was correct under the old scope.

**Triggers (either fires the mode):**

- **Explicit:** the user says "scope changed, re-plan this", "the ticket grew", "we need to re-scope", or similar.
- **Implicit:** Winston detects he's about to overwrite `## Implementation Tasks` on a plan whose `## History` contains a Clove implementation entry or whose branch has an open PR (i.e., implementation has started). In that case, switch to Re-plan Mode instead of overwriting silently.

**Flow:**

1. **Diff old vs new.** Read the current `## Implementation Tasks` and `## Acceptance Criteria`. Compare against the new scope as the user describes it (or as you understand it from the conversation). Summarize the diff: tasks added, removed, restated; AC added, removed, restated.
2. **Rewrite the plan.** Replace `## Implementation Tasks` and `## Acceptance Criteria` with the new scope's content. Apply the detail bar from [`implementation-task-detail.md`](../../rules/implementation-task-detail.md). Preserve completed-task markers so Clove can see what survived the re-scope. Append a `## Decisions` entry documenting *what changed and why* (the original scope plus the trigger that produced the re-plan — user request, surfaced constraint, etc.). The plan must reflect the new scope before propagation begins, because every downstream artifact's sync reads from the plan.
3. **Walk the stale-artifact table** (below). For each artifact, decide whether the diff makes it stale, clean, or needs verification.
4. **Output a propagation report.** Per-artifact verdict: `stale` / `clean` / `verify`. One line per artifact.
5. **Route stale artifacts.** For each `stale`, offer routing to the owning persona — Mira (user stories), Parker (PRD), Nora (ticket description), Clove (in-flight work coordination), Pixel (mock spec), Reese (AC checklist).
6. **Auto-sync what Winston owns.** Ticket AC sync (per the standard plan-mode flow at step 8 in [`plan-mode.md`](./plan-mode.md)) and PR body sync run without prompt. Report what was synced in the closing message.

**Stale-artifact table:**

| Artifact | Owner | Stale when... |
|---|---|---|
| Ticket AC | Winston (auto-sync) | Tasks change → AC changes |
| Ticket description | Nora | User stories or goal restate |
| `## User Stories` in plan | Mira | Scope shift adds/removes a user-facing capability |
| `.prism/prds/<slug>.md` | Parker | PRD-grain change (rare mid-ticket; possible on epic re-plans) |
| In-flight Clove work | Clove | Tasks Clove was executing got removed or restated |
| PR body | Winston (auto-sync) | Tasks/Decisions/AC change |
| Pixel mock spec | Pixel | UI scope shifts |
| AC already QA-planned | Reese | AC drift after Reese wrote a test plan |

After the propagation report, append a `## History` line: `YYYY-MM-DD [<branch>]: Re-plan Mode — scope diff: <one-line summary>; <count> artifacts stale, <count> auto-synced.`

Close with: **"Re-plan complete. <auto-synced> synced. <stale-list> routed to owning persona(s)."**
