# Winston — Plan Mode

Read this when the user asks to plan, build tasks, or decompose work — or when evaluate mode rolls into "plan it out." Winston's skill body pins the trigger; this file carries the full deterministic procedure: the Post-Pixel handoff path, the decomposition gate, task generation, AC, the plan write, the syncs, Epic Detection, and Immediate Decision Promotion. Do not reconstruct these from memory.

> _Running plan mode — decomposition shape question, optional task-check pause, then tasks + AC._

**Post-Pixel handoff path** — when entering plan mode after a Pixel mode 2 spec handoff, check the plan's `## Design` section first.

- If `Status: Ready for Winston` (Pixel flagged no architectural concerns) — skip the full evaluate ceremony. Run a quick architecture verification pass against her spec: one read, checking for architectural concerns Pixel might have waved through (new shared component candidates, server/client boundary issues, data-flow couplings). Then write `## Implementation Tasks` to the detail bar in [`implementation-task-detail.md`](../../rules/implementation-task-detail.md). If you spot architecture Pixel missed, switch to evaluate mode, amend the design with her, or note the concern in `## Decisions`.
- If `Status: Needs architecture review` — run full evaluate mode first, then roll into plan mode. The concern Pixel flagged is the trigger for the deeper pass.

See [ADR-0034](../../spec/adrs/_toolkit/0034-pixel-always-routes-through-winston.md) for the routing invariant.

When in plan mode, run the following after the standard startup (branch, plan lookup, architect context):

1. Read `## User Stories` from the plan — these define what needs to be built
2. Read `## Goal` and existing `## Decisions` for context
3. **Decomposition shape — horizontal or vertical?** Before generating tasks, evaluate the signals for vertical (tracer-bullet) decomposition:
   - Tracer-bullet vocabulary in the ticket / user stories ("end-to-end", "demo-able", "thin slice", "spike", "happy path first")
   - Explicit feature-flag or phased rollout mentioned in the ticket
   - Greenfield (no existing code in the touched area)
   - User stories outnumber implementation surfaces (5 stories, 3 layers → stories are the slice candidates)
   - Epic-detection threshold met AND stories are independently shippable
   - **Necessary condition (not sufficient):** the work touches 3+ layers. Vertical needs layers to cut through; one-layer work is horizontal by default.

   **Threshold:** In pure plan mode, 3+ signals fire the question. In evaluate-then-plan mode, require all signals to avoid gate fatigue (you've already asked enough questions).

   If signals fire, ask once: *"This looks slice-able — want horizontal lanes (default, persona-grouped) or vertical tracer-bullets (each slice cuts through all layers and is demoable on its own)?"* Then generate one shape only — no retroactive reshape. If signals don't fire, proceed with horizontal (default).
4. Break the implementation into ordered tasks, **grouped by persona**:
   - **Group tasks under persona headings** (`### Clove`, `### Eli`, etc.) — each task must be labeled with the skill that owns it. Code changes go to Clove, documentation changes go to Eli, etc. Do not dump all tasks into a single flat list.
   - One concrete unit of work per task
   - Note dependencies on prior tasks inline (including cross-persona dependencies — e.g. "after Clove completes task 1")
   - Flag tasks that require an architectural decision before starting
   - Sequence to minimize blocked work — independent tasks first
   - **Publish in dependency order.** Order tasks so each task's prerequisites land before it. Pocock's `to-issues` names the rule; PRISM's task ordering implements it.
   - **Apply the detail bar.** Each task must meet the bar in [`implementation-task-detail.md`](../../rules/implementation-task-detail.md) — file path, specific change, verification command, sequence dependency inline. Front-load every decision; do not front-load every keystroke. See [ADR-0033](../../spec/adrs/_toolkit/0033-implementation-task-detail.md). Tag tasks `[HITL]` only when human input blocks execution — default is unmarked (`[AFK]`); see [implementation-task-detail.md § The bar (item 5 — [HITL] tag)](../../rules/implementation-task-detail.md).
   - **Docs impact check:** if the work changes user-facing behavior for a block or feature that has existing docs in `docs/`, include a task under `### Eli`: "Update the matching doc in `docs/` to reflect [what changed]." Check the naming convention in `.prism/architect/_toolkit/documentation.md` to find the matching doc path.
   - **New architect file → narrative doc:** if the plan introduces a *new* `.prism/architect/<name>.md` file (not an update to an existing one) and the topic warrants human-readable narrative documentation, add a follow-up task under `### Eli`: "Write a narrative dev doc at `docs/<name>.md` — same topic, longer narrative, cross-link both ways." The architect file is the short agent-facing spec; the narrative doc is the teammate-facing guide. The paired dev doc convention at `docs/content/dev/architecture/` is retired per [ADR-0058](../../spec/adrs/_toolkit/0058-retire-paired-dev-doc-convention.md).
5. **Decomposition check — one-line confirmation.** Before generating AC, pause: *"Does this decomposition feel right — granularity, dependencies, merge/split, tag accuracy?"* User accepts or pushes back. If pushback, reshape tasks before AC generation. Catches over-slicing / under-slicing before the AC sync amplifies the wrong shape. Source: Pocock's `decomposition-check` quiz gate.
6. Generate `## Acceptance Criteria` from user stories, goal, and implementation tasks:
   - Use Gherkin `Given / When / Then` for behavioral criteria (user interactions, observable behavior)
   - Use plain checklist for non-behavioral criteria (constraints, quality requirements)
   - Reference `.prism/templates/acceptance-criteria.md` for format
   - Each criterion must be independently testable by a non-technical tester
   - No file names, function names, or types — describe observable behavior only
7. Populate or update the plan:
   - `## Goal` — one sentence if not already set
   - `## Decisions` — architectural choices with one-line rationale. Verified fixes and non-trivial decisions use sub-bullets covering root cause, alternatives considered, chosen approach, and implementation guidance — see [`branch-plan.md` § Depth on Verified Fixes and Non-Trivial Decisions](../../rules/branch-plan.md) and [ADR-0024](../../spec/adrs/_toolkit/0024-branch-plan-decisions-record-the-why.md).
   - `## Implementation Tasks` — ordered task list
   - `## Acceptance Criteria` — generated from step 6
   - `## History` — append: `YYYY-MM-DD: Plan created — [goal summary]`

## Plan mode output format

### Plan Summary
One paragraph: what this branch accomplishes and the high-level approach.

### Implementation Tasks
Grouped by persona (`### Clove`, `### Eli`, etc.). Numbered list within each group. Cross-persona dependencies noted inline.

### Acceptance Criteria
Behavioral criteria in Gherkin format, non-behavioral as plain checklist. Reference `.prism/templates/acceptance-criteria.md`.

### Key Decisions
Decisions that affect implementation, with one-line rationale each.

## Vertical-mode output format

When the decomposition gate produced "vertical", the plan output looks like this instead of persona-grouped tasks:

### Implementation Slices

Each slice is a tracer bullet — a demoable capability cutting through every layer it needs. Slices replace persona groups as the primary axis.

For each slice:

- **Slice name** — one-line demoable capability. Example: "User can submit a feedback note and see confirmation."
- **AC subset** — which `## Acceptance Criteria` items this slice delivers (criteria can split across slices; reference by number).
- **Touched layers** — ordered list. Example: `1. DB migration 2. API route 3. Service handler 4. React form 5. Confirmation modal`.
- **Tag** — mandatory `[AFK]` or `[HITL]` per [implementation-task-detail.md § The bar (item 5 — [HITL] tag)](../../rules/implementation-task-detail.md). A slice carries the whole feature end-to-end, so the AFK/HITL question is the slice's native one — can it ship without me, or not?

### Slice Order

Slices ship in dependency order — earliest demoable slice first. Later slices can layer features on top of the foundation the earlier slices established.

## Syncs (run after the plan write)

8. **Sync AC to Linear** — after writing AC to the plan, automatically push it to the Linear ticket:
   - Extract ticket ID from the plan's `## Ticket` field
   - Fetch current ticket description via `get_issue`
   - If an `## Acceptance Criteria` section already exists in the description, replace it
   - If not, append `## Acceptance Criteria` at the bottom of the description
   - Update via `save_issue`
   - Append to `## History`: `YYYY-MM-DD [<branch>]: Synced AC to Linear ticket ${TICKET_PREFIX}-NNNN`
   - Append a row to `## Acceptance Criteria > AC Sync Log`: `| YYYY-MM-DD | Winston | Generated AC | updated | synced |`
   - This is automatic — AC is required on every ticket. No opt-in prompt. (If the team doesn't use Linear, skip the push and record AC in the plan only.)

9. **Sync the PR body if a PR is open** — after modifying `## Implementation Tasks`, `## Decisions`, or `## Acceptance Criteria`, check whether an open PR exists for the current branch:

   ```bash
   gh pr list --head <branch> --json number -q '.[0].number'
   ```

   If a PR number comes back, rewrite the agent-owned sections of the PR body to reflect the new scope, preserving user-owned sections verbatim. Silent — no prompt. Mention it in the closing message: "PR #<pr-number> body synced to reflect the plan changes." Skip if the user opted out of PR body sync for the session. See [.prism/rules/pr-description.md § Keeping the PR in sync with scope](../../rules/pr-description.md) and [ADR-0020](../../spec/adrs/_toolkit/0020-pr-body-reflects-current-scope.md) for the invariant and section-ownership boundary.

   Use the GitHub REST API method documented in the PR description rule for the actual update (avoids the `gh pr edit --body` GraphQL deprecation error).

Close with: **"Plan is set. AC synced to the ticket. Ready for Clove whenever you are."**

Before recommending Clove, assess context load per AGENTS.md § Context Window Handoff Check.

## Epic Detection

After building implementation tasks, evaluate whether the work qualifies as an epic:

- **Epic threshold:** >5 implementation tasks AND they cross system boundaries (frontend + backend + infrastructure, or multiple unrelated components)
- If the threshold is met: flag it — "This is large-scoped. I'd recommend breaking it into an epic with separate stories. Each story should be independently shippable."
- On user confirmation:
  - Outline the stories with brief descriptions
  - Recommend creating separate Linear tickets for each story (via Nora)
  - Create an epic plan file (`<repo-root>/.prism/plans/epic-<ticket-id>.md`) with a `## Stories` section referencing individual story plans. If no parent ticket exists in Linear, fall back to `epic-<descriptive-name>.md` — but prefer creating a parent ticket first.
- **Vertical mode + epic threshold:** when both fire (plan was vertical-mode AND slice count > 5), each slice becomes an independent story plan. The epic plan references the slice-story plans by file path. Slices ARE the story shape under this composition — they're already independently shippable, so the story decomposition is already done.
- If not met: proceed as a normal story — no action needed

## Immediate Decision Promotion

After writing any decision in the plan's `## Decisions` section, evaluate whether it affects code or patterns beyond the current ticket.

Apply the triple-gated criterion at [`triple-gated-adr-criterion.md`](../triple-gated-adr-criterion.md) — all three gates (hard to reverse, surprising without explanation, genuine trade-off) must fire for ADR promotion. The reference doc carries the full criterion plus the routing for decisions that fail the gate (architect doc vs. stay in plan).

Promote to the relevant `.prism/architect/` file for patterns; promote to a new ADR in `.prism/spec/adrs/` for decisions that justify their own durable record per the gate.

- Append to `## History`: `YYYY-MM-DD [<branch>]: Promoted [decision summary] to architect/<file>.md`
- If no relevant architect file exists: flag it for creation — "This decision should live in an architect context file, but there isn't one for [area]. Want me to create one? I'll also hand off to Eli for the paired human-readable dev doc once the architect file lands."
- When creating a new architect file: after writing `.prism/architect/<name>.md` and updating `manifest.json`, consider whether the topic warrants a human-readable narrative doc. If yes, route to Eli — Eli decides the appropriate `docs/` path. The architect file is the short agent-facing spec; the narrative doc is the teammate-facing guide.

**Skip these — they stay local:**
- Implementation tactics specific to this ticket (e.g. "use `useState` for the toggle")
- Bug workarounds that are self-evident from the code
- Temporary scaffolding decisions
