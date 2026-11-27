# Ticket Workflows

How a unit of work moves through the roster: the four ticket types and how to
detect them, the persona sequence for each type, the lateral moves that fill
gaps mid-ticket, the epic-vs-story threshold, the bug report lifecycle, and the
identifier forms PR-scoped personas accept.

It does not cover who the personas are or how they hand off — that is
[`skills-ecosystem.md`](./skills-ecosystem.md) § Skill Roster and § Cross-skill
Handoffs. It does not cover what goes inside a plan file — that is
[`plan-authoring.md`](./plan-authoring.md).

---

## Ticket Types

Four types drive workflow decisions. See `.prism/templates/ticket-types.md` for full details.

- **Bug** (label: `bug`) — something is broken. Use the bug report template. Skip the intent unless the cause is unknown (see Diagnosis below).
- **Feature** (label: `feature`) — a new capability. Write the intent first.
- **Improvement** (label: `improvement`) — existing functionality made better. The intent starts the chain, and a small fix with known scope takes the shortcut below.
- **DX** (label: `DX`) — work QA cannot verify. See `.prism/templates/ticket-types.md` for the full decision rule.

**Detection:** check the ticket's labels first, ask the user if no label matches. Never guess.

On a plan folder, the workflow rule's stage order replaces the sequences under Common Workflows.


---

## Common Workflows

### Feature (typical)

```
Nora → Mira → [Pixel] → the spec stage → the plan stage → Clove → Briar → [Sage/Eli/Reese]
```

1. **Nora** fetches the ticket, reviews priority and triage placement, creates the branch, summarizes requirements
2. **Mira** writes the intent, with its acceptance criteria
3. **[Pixel]** designs UI if no mock exists or mock has gaps (invoke-only — include when needed)
4. **The spec stage** (`prism-spec`) writes the spec from the approved intent, and the design when there is one
5. **The plan stage** (`prism-plan`) builds the implementation tasks; Winston gives a fit verdict when asked
6. **Clove** implements, writes tests, updates the plan
7. **Briar** self-reviews the branch
8. **Sage/Eli/Reese** generate release artifacts as needed

### Bug

```
Nora (verify + scaffold + AC) → Clove (confirm root cause, then fix) → Briar → [Reese]
```

1. **Nora** fetches the ticket, reviews priority and triage placement, verifies the bug, scaffolds bug report with root cause + suspected fix + AC, syncs AC to the tracker
2. **Clove** confirms the root cause and suspected fix against the code, records the confirmed finding in `## Debugged Issues`, then implements the fix and syncs AC to the tracker if adjusted
3. **Briar** self-reviews, syncs AC to the tracker if updated
4. **[Reese]** (optional) generates a bug-fix verification plan for QA to retest against — invoke after the fix ships when QA needs a structured retest artifact rooted in the ticket's bug report.

### Improvement

```
Nora → Mira → the spec stage → the plan stage → Clove → Briar
```

1. **Nora** fetches the ticket, reviews priority and triage placement
2. **Mira** writes the intent, with its acceptance criteria
3. **The spec stage** (`prism-spec`) writes the spec from the approved intent
4. **The plan stage** plans the work
5. **Clove** implements
6. **Briar** self-reviews

### Shortcut — small fix, known scope

```
Clove → Briar
```

When the fix is obvious and scoped, skip straight to implementation.

### Documentation integration

The `docs/` folder contains human-facing documentation (see `.prism/architect/_toolkit/documentation.md`). Three skills keep docs in sync with code:

- **The plan stage** — includes docs update tasks when the work changes user-facing behavior for a documented feature
- **Briar** — after review, checks whether changed files have corresponding `docs/` files and flags potential staleness
- **Eli** — after generating draft docs to `.claude/docs/`, offers a "publish" mode that adapts and writes to `docs/` with frontmatter and audience-appropriate prose

### Mid-Ticket Moves

Lateral moves that happen while implementation is in progress. These aren't deviations — they're the standard way to fill gaps without restarting the flow.

**Design Gap Fill** — Clove hits a UI gap (missing state, unclear layout, no spec for an interaction):

```
Clove → Pixel → Clove
```

Pixel answers inline (mode 1) or updates the mock spec (mode 2). Clove resumes.

**UX Concern from Review** — Briar surfaces a UX problem, not just a code problem:

```
Briar → Pixel → the spec stage → the plan stage → Clove → Briar
```

Pixel specs the fix (mode 2). The spec stage reads the design, and the plan stage plans against the spec. Clove implements. Review cycle continues. If the gap is small enough that Pixel resolves it via mode 1 inline sketch, Clove can pick up directly without the plan stage.

**Diagnosis** — the cause of a bug is unknown:

```
[any skill] → Sasha → Mira
```

Sasha (`prism-debug`) builds a feedback loop, finds the root cause, and changes no source. Her report becomes the Problem section of the bug's intent, so the fix runs through the chain. A bug whose root cause is already known keeps the Bug workflow above. Inside a ticket whose intent is already approved, her report goes to Clove instead, as the confirmed root cause for the fix, and a bug outside that ticket's scope goes to Nora.

**UI/UX Quick Question** — dev needs a quick answer without full design work:

```
[any skill] → Pixel → [resume]
```

"Where does Save go in this modal?" "Is this hierarchy right?" "What's missing from this screen?" Pixel answers in chat and hands back. No plan update, no spec file.

**Decision tree — no mocks / mocks have gaps:**

- Ticket has UI work but no mock → invoke Pixel before the spec stage
- Mock exists but missing states (empty, error, loading) → invoke Pixel to fill gaps
- Mock exists and is complete → skip Pixel, proceed to the spec stage


---

## Epic vs Story

- **Default to story.** Most tickets are stories.
- **On a plan folder,** the intent stage proposes the size, `standard` or `epic`, with its reason, and the person approves it with the intent. An epic is an `epic-<ticket>/` folder holding `intent.md` and `spec.md` and no `plan.md`, per `.prism/rules/workflow.md`. Approving the epic's intent approves its children, so a child's folder holds `spec.md` and `plan.md` and no intent. The child spec's `epic:` line names the epic folder, its acceptance criteria live in its `plan.md`, auto-approval reads the epic's intent, and the task script starts its commit range at the child's spec.
- **On a legacy flat plan,** promote to epic when there are more than 5 implementation tasks and they cross system boundaries (frontend + backend + infrastructure, or multiple unrelated components). An epic plan uses the filename `epic-<name>.md` and contains a `## Stories` section referencing individual story plans.



---

## Bug Report Lifecycle

1. **Discovery** — any agent that discovers a bug uses the shared template at `.prism/templates/bug-report.md`
2. **Scaffolding** — Nora verifies the bug, fills in root cause (`verified` or `suspected`), suspected fix, and acceptance criteria. Updates the ticket description with the full template including AC.
3. **Verification** — Clove confirms the root cause and suspected fix against the code before changing it
4. **Recording** — Clove records confirmed findings in `## Debugged Issues` using the extended format (severity, environment, repro steps, expected/actual)
5. **Ticket sync** — opt-in: Clove asks whether to post the bug report to the tracker. If yes, formats using the template and posts via `save_comment`
6. **Fix** — Clove implements the fix, syncs AC to the tracker if adjusted
7. **Review** — Briar checks the fix during self-review, syncs AC to the tracker if updated


---

## PR Identifier Flexibility

PR-related skills (Briar, Reese, Sage when scoped to a PR) accept any of: PR number (`#1234`), full GitHub URL (`https://github.com/<org>/<repo>/pull/1234`), or branch name (`<author>/<ticket-id>-...`). All resolve via `gh` to the same underlying PR. When no PR exists for a branch, fall back to `git diff origin/${DEFAULT_BRANCH}..<branch>`.

**Why:** the originating PRs (Reese mode dispatch and PR-context skills) standardized this so users don't have to remember per-skill input grammar. Different skills had different expectations historically; consolidating reduces friction.

**How to apply:** Skills with PR scope state in their prompt that any of the three forms work. Resolution order: try PR number, then URL parse, then `gh pr view <branch>`. If none resolve, prompt the user.

