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

- **Bug** (label: `bug`) — something is broken. Use the bug report template. Skip user stories.
- **Feature** (label: `feature`) — a new capability. Write user stories first.
- **Improvement** (label: `improvement`) — existing functionality made better. User stories optional.
- **DX** (label: `DX`) — work QA cannot verify. See `.prism/templates/ticket-types.md` for the full decision rule.

**Detection:** check the ticket's labels first, ask the user if no label matches. Never guess.


---

## Common Workflows

### Feature (typical)

```
Nora → Mira → [Pixel] → Winston → Clove → Briar → [Eric] → [Sage/Eli/Reese]
```

1. **Nora** fetches the ticket, reviews priority and triage placement, creates the branch, summarizes requirements
2. **Mira** writes user stories with AC hints
3. **[Pixel]** designs UI if no mock exists or mock has gaps (invoke-only — include when needed)
4. **Winston** evaluates the approach, builds implementation tasks, generates AC
5. **Clove** implements, writes tests, updates the plan
6. **Briar** self-reviews the branch
7. **Eric** reviews the PR (optional — for team PRs)
8. **Sage/Eli/Reese** generate release artifacts as needed

### Bug

```
Nora (verify + scaffold + AC) → Sasha (confirm root cause + fix) → Clove → Briar → [Eric] → [Reese]
```

1. **Nora** fetches the ticket, reviews priority and triage placement, verifies the bug, scaffolds bug report with root cause + suspected fix + AC, syncs AC to the tracker
2. **Sasha** confirms root cause and suspected fix before implementation
3. **Clove** implements the fix, syncs AC to the tracker if adjusted
4. **Briar** self-reviews, syncs AC to the tracker if updated
5. **[Reese]** (optional) generates a bug-fix verification plan for QA to retest against — invoke after the fix ships when QA needs a structured retest artifact rooted in the ticket's bug report.

### Improvement

```
Nora → Winston (or Mira first) → Clove → Briar → [Eric]
```

1. **Nora** fetches the ticket, reviews priority and triage placement
2. **Winston** plans the work (or **Mira** fleshes out requirements first if scope is unclear)
3. **Clove** implements
4. **Briar** self-reviews

### Shortcut — small fix, known scope

```
Clove → Briar
```

When the fix is obvious and scoped, skip straight to implementation.

### Documentation integration

The `docs/` folder contains human-facing documentation (see `.prism/architect/_toolkit/documentation.md`). Three skills keep docs in sync with code:

- **Winston** — in plan mode, includes docs update tasks when the work changes user-facing behavior for a documented feature
- **Briar** — after review, checks whether changed files have corresponding `docs/` files and flags potential staleness
- **Eli** — after generating draft docs to `.claude/docs/`, offers a "publish" mode that adapts and writes to `docs/` with frontmatter and audience-appropriate prose

### Mid-Ticket Moves

Lateral moves that happen while implementation is in progress. These aren't deviations — they're the standard way to fill gaps without restarting the flow.

**Design Gap Fill** — Clove hits a UI gap (missing state, unclear layout, no spec for an interaction):

```
Clove → Pixel → Clove
```

Pixel answers inline (mode 1) or updates the mock spec (mode 2). Clove resumes. Same pattern the team uses for Clove → Sasha → Clove on bugs.

**UX Concern from Review** — Briar or Eric surfaces a UX problem, not just a code problem:

```
Briar/Eric → Pixel → Winston → Clove → Briar → Eric
```

Pixel specs the fix (mode 2). Winston plans against the spec. Clove implements. Review cycle continues. If the gap is small enough that Pixel resolves it via mode 1 inline sketch, Clove can pick up directly without Winston.

**UI/UX Quick Question** — dev needs a quick answer without full design work:

```
[any skill] → Pixel → [resume]
```

"Where does Save go in this modal?" "Is this hierarchy right?" "What's missing from this screen?" Pixel answers in chat and hands back. No plan update, no spec file.

**Decision tree — no mocks / mocks have gaps:**

- Ticket has UI work but no mock → invoke Pixel before Winston
- Mock exists but missing states (empty, error, loading) → invoke Pixel to fill gaps
- Mock exists and is complete → skip Pixel, proceed to Winston


---

## Epic vs Story

- **Default to story.** Most tickets are stories.
- **Promote to epic** when: >5 implementation tasks AND they cross system boundaries (frontend + backend + infrastructure, or multiple unrelated components).
- Winston detects epic candidates after building implementation tasks and flags them for the user.
- Epic plans use the filename `epic-<name>.md` and contain a `## Stories` section referencing individual story plans.



---

## Bug Report Lifecycle

1. **Discovery** — any agent that discovers a bug uses the shared template at `.prism/templates/bug-report.md`
2. **Scaffolding** — Nora verifies the bug, fills in root cause (`verified` or `suspected`), suspected fix, and acceptance criteria. Updates the ticket description with the full template including AC.
3. **Verification** — Sasha confirms the root cause and suspected fix before implementation begins
4. **Recording** — Sasha records confirmed findings in `## Debugged Issues` using the extended format (severity, environment, repro steps, expected/actual)
5. **Ticket sync** — opt-in: Sasha asks whether to post the bug report to the tracker. If yes, formats using the template and posts via `save_comment`
6. **Fix** — Clove implements the fix, syncs AC to the tracker if adjusted
7. **Review** — Briar checks the fix during self-review, syncs AC to the tracker if updated


---

## PR Identifier Flexibility

PR-related skills (Eric, Briar, Reese, Sage when scoped to a PR) accept any of: PR number (`#1234`), full GitHub URL (`https://github.com/<org>/<repo>/pull/1234`), or branch name (`<author>/<ticket-id>-...`). All resolve via `gh` to the same underlying PR. When no PR exists for a branch, fall back to `git diff origin/${DEFAULT_BRANCH}..<branch>`.

**Why:** the originating PRs (Reese mode dispatch and PR-context skills) standardized this so users don't have to remember per-skill input grammar. Different skills had different expectations historically; consolidating reduces friction.

**How to apply:** Skills with PR scope state in their prompt that any of the three forms work. Resolution order: try PR number, then URL parse, then `gh pr view <branch>`. If none resolve, prompt the user.

