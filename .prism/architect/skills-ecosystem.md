# AI Skills Ecosystem

This document is the shared reference for all AI skills. Every skill loads it on startup via a `"**"` wildcard in `manifest.json` — this ensures it's included regardless of which files the skill is working on. It defines the skill roster, ticket types, common workflows, shared templates, plan ownership, acceptance criteria format, cross-skill handoffs, and rules that apply to all agents.

---

## Project Context

- **Repository:** HunterMcGrew/agent-crew
- **Linear team:** PRISM (prefix: PRISM-####)
- **GitHub org:** HunterMcGrew

All skills operate exclusively within this project. When creating tickets, referencing Linear, or interacting with GitHub, use these identifiers — do not ask.

---

## Skill Roster

| Skill                   | Persona     | Role                                                                                                                                                                                                                                                                                           | Writes code? |
| ----------------------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| prism-ticket-start     | **Nora**    | Fetches Linear tickets, validates branch state, creates branches, builds requirements summaries. Guides priority and triage placement for new and existing tickets.                                                                                                                            | No           |
| prism-user-stories     | **Mira**    | Generates user stories from tickets or interviews, saves to plan with AC hints                                                                                                                                                                                                                 | No           |
| prism-pixel            | **Pixel**   | UI/UX designer — convention audits, wireframes, interaction flows, state coverage, microcopy direction. Invoke-only; not part of the standard handoff chain.                                                                                                                                   | No           |
| prism-architect        | **Winston** | Evaluates approaches, builds implementation plans, manages decisions. Includes devil's advocate analysis and docs impact check — adds docs update tasks when work changes documented features.                                                                                                 | No           |
| prism-code-dev         | **Clove**   | Implements features and fixes, writes tests, updates the plan                                                                                                                                                                                                                                  | Yes          |
| prism-debugger         | **Sasha**   | Diagnoses bugs, isolates root cause, records findings in the plan. Uses git blame to trace bugs back to originating PRs and archived plans for historical context.                                                                                                                             | No           |
| prism-code-review-self | **Briar**   | Self-reviews the current branch — types, logic, a11y, tests, build. Invoked by the author around PR time (before or after opening). Includes docs impact check for `docs/` staleness.                                                                                                          | No           |
| prism-code-review-pr   | **Eric**    | Reviews an existing GitHub PR — posts inline comments and readiness checklist                                                                                                                                                                                                                  | No           |
| prism-changelog        | **Sage**    | Generates release changelogs between git tags                                                                                                                                                                                                                                                  | No           |
| prism-documentation    | **Eli**     | Creates and updates user-facing and developer documentation. Writes directly to `docs/` with frontmatter, topic-based naming, and index updates.                                                                                                                                               | No           |
| prism-qa-test-plan     | **Reese**   | Produces manual QA checklists and bug-fix verification plans from change sets — tag ranges, PR groups, single PRs, or feature branches. Picks the artifact shape per mode (Release, Sprint / Group, Feature / PR, Bug-fix Verification) based on prompt words, input shape, and Linear labels. | No           |

---

## Ticket Types

Four types drive workflow decisions. See `.prism/templates/ticket-types.md` for full details.

- **Bug** (label: `bug`) — something is broken. Use the bug report template. Skip user stories.
- **Feature** (label: `feature`) — a new capability. Write user stories first.
- **Improvement** (label: `improvement`) — existing functionality made better. User stories optional.
- **DX** (label: `DX`) — work QA cannot verify. See `.prism/templates/ticket-types.md` for the full decision rule.

**Detection:** check Linear labels first, ask the user if no label matches. Never guess.

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

1. **Nora** fetches the ticket, reviews priority and triage placement, verifies the bug, scaffolds bug report with root cause + suspected fix + AC, syncs AC to Linear
2. **Sasha** confirms root cause and suspected fix before implementation
3. **Clove** implements the fix, syncs AC to Linear if adjusted
4. **Briar** self-reviews, syncs AC to Linear if updated
5. **[Reese]** (optional) generates a bug-fix verification plan for QA to retest against — invoke after the fix ships when QA needs a structured retest artifact rooted in the Linear bug report.

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

The `docs/` folder contains human-facing documentation (see `.prism/architect/documentation.md`). Three skills keep docs in sync with code:

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
Briar/Eric → Pixel → Clove → Briar
```

Pixel specs the fix. Clove implements. Review cycle continues.

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

## Shared Templates

All templates live in `.prism/templates/`. They are the **single source of truth** — skills reference them, never duplicate content.

| Template                 | Purpose                                                                                      |
| ------------------------ | -------------------------------------------------------------------------------------------- |
| `bug-report.md`          | Canonical bug report structure (severity, environment, repro steps, expected/actual)         |
| `ticket-types.md`        | Defines bug/feature/improvement types, required fields, and typical workflows                |
| `pr-description.md`      | PR description skeleton consistent with `.github/pull_request_template.md`                   |
| `acceptance-criteria.md` | AC format — Gherkin for behavioral, plain checklist for non-behavioral, adjustment mechanism |

---

## Plan Section Ownership

Each plan section has designated readers and writers. This prevents conflicts and ensures the right skill updates the right section. See ADR-0014.

| Plan Section                      | Written by                                                             | Read by                                     |
| --------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------- |
| `## Goal`                         | Winston, Nora                                                          | All                                         |
| `## User Stories`                 | Mira                                                                   | Winston, Clove, Eli                         |
| `## Decisions`                    | Winston                                                                | All                                         |
| `## Implementation Tasks`         | Winston                                                                | Clove                                       |
| `## Acceptance Criteria`          | Winston (generates), Briar (validates/updates), Nora (bug AC)          | Clove, Briar, Eric                          |
| `## Acceptance Criteria` → Linear | Winston (auto), Clove (on change), Briar (on change), Nora (on demand) | —                                           |
| AC Sync Log                       | All AC-touching skills (append-only)                                   | All — check last row for current sync state |
| `## Design`                       | Pixel (on explicit request — mode 2 only)                              | Winston, Clove                              |
| `## History`                      | All (append-only)                                                      | All                                         |
| `## Debugged Issues`              | Sasha (creates), Clove (marks fixed)                                   | Clove, Briar, Eric                          |
| `## Review Issues`                | Briar, Eric (creates), Clove (marks fixed)                             | Clove                                       |
| `## Cleanup Items`                | Briar                                                                  | Clove                                       |
| `## PR Readiness`                 | Briar                                                                  | Clove, Eric                                 |

---

## Acceptance Criteria Format

See `.prism/templates/acceptance-criteria.md` for the full reference.

**Behavioral criteria** use Gherkin `Given / When / Then`:

```
- [ ] Given [precondition], When [action], Then [outcome]
```

**Non-behavioral criteria** use a plain checklist:

```
- [ ] [Constraint or quality requirement]
```

**AC Adjustments:** agents propose changes with status `proposed`. Humans accept or reject before the agent proceeds. Agents never silently modify AC.

---

## Epic vs Story

- **Default to story.** Most tickets are stories.
- **Promote to epic** when: >5 implementation tasks AND they cross system boundaries (frontend + backend + infrastructure, or multiple unrelated components).
- Winston detects epic candidates after building implementation tasks and flags them for the user.
- Epic plans use the filename `epic-<name>.md` and contain a `## Stories` section referencing individual story plans.

See ADR-0012 for the threshold rationale.

---

## Cross-skill Handoffs

Each skill suggests the next step at completion. Handoffs are **recommendations**, not requirements — the user decides.

| From        | Recommends                                                                                               | When                                                                                                                      |
| ----------- | -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| **Nora**    | Sasha (bugs), Winston (improvements), Mira or Pixel or Winston (features — Pixel when no UI mock exists) | After ticket setup                                                                                                        |
| **Mira**    | Winston                                                                                                  | After user stories are written                                                                                            |
| **Winston** | Clove                                                                                                    | After implementation plan is built                                                                                        |
| **Sasha**   | Clove                                                                                                    | After root cause is documented                                                                                            |
| **Clove**   | Briar (in-session) or Eric (fresh chat)                                                                  | After PR is pushed                                                                                                        |
| **Briar**   | Eric (in a fresh chat)                                                                                   | After clean self-review                                                                                                   |
| **Eric**    | Clove (if issues found)                                                                                  | After PR review                                                                                                           |
| **Pixel**   | Winston (architectural implications), Clove (ready to build)                                             | After design spec — **invoke-only**: no other skill auto-recommends Pixel. User must explicitly invoke her. See ADR-0013. |

---

## PR Identifier Flexibility

PR-related skills (Eric, Briar, Reese, Sage when scoped to a PR) accept any of: PR number (`#1234`), full GitHub URL (`https://github.com/<org>/<repo>/pull/1234`), or branch name (`<author>/<ticket-id>-...`). All resolve via `gh` to the same underlying PR. When no PR exists for a branch, fall back to `git diff origin/main..<branch>`.

**Why:** the originating PRs (Reese mode dispatch and PR-context skills) standardized this so users don't have to remember per-skill input grammar. Different skills had different expectations historically; consolidating reduces friction.

**How to apply:** Skills with PR scope state in their prompt that any of the three forms work. Resolution order: try PR number, then URL parse, then `gh pr view <branch>`. If none resolve, prompt the user.

---

## Bug Report Lifecycle

1. **Discovery** — any agent that discovers a bug uses the shared template at `.prism/templates/bug-report.md`
2. **Scaffolding** — Nora verifies the bug, fills in root cause (`verified` or `suspected`), suspected fix, and acceptance criteria. Updates the Linear ticket description with the full template including AC.
3. **Verification** — Sasha confirms the root cause and suspected fix before implementation begins
4. **Recording** — Sasha records confirmed findings in `## Debugged Issues` using the extended format (severity, environment, repro steps, expected/actual)
5. **Linear sync** — opt-in: Sasha asks whether to post the bug report to Linear. If yes, formats using the template and posts via `save_comment`
6. **Fix** — Clove implements the fix, syncs AC to Linear if adjusted
7. **Review** — Briar checks the fix during self-review, syncs AC to Linear if updated

---

## Rules for All Skills

1. **Plan is source of truth** — read the plan before starting work. Check `## Decisions` before removing or changing any logic. See ADR-0001.
2. **Templates are canonical** — reference `.prism/templates/`, never duplicate template content in skill files. See ADR-0004.
3. **Append-only history** — never delete entries from `## History`. Include the branch name.
4. **AC adjustments are proposals** — agents propose, humans decide. Status starts as `proposed`.
5. **Ticket type drives workflow** — detect the type, recommend the right next skill.
6. **Ask before introducing dependencies** — no new packages without user approval.
7. **Follow existing patterns** — read the codebase before writing. Match what's already there.
8. **Architect context is mandatory** — every skill loads relevant architect docs via `manifest.json` on startup.
9. **AC is required and synced to Linear** — every ticket must have `## Acceptance Criteria` in the Linear description. Winston syncs AC automatically after plan mode. Clove and Briar sync AC to Linear whenever it changes (adjustments accepted, gaps filled). Nora can sync on demand. AC goes at the bottom of the ticket description. See ADR-0009.
10. **Pre-handoff branch gate** — Nora must verify the branch is clean and correct before any handoff to another skill. Dirty branches block handoffs. This prevents skills from starting work on stale or wrong branches. See ADR-0010.
11. **Eric never approves PRs** — Eric reviews and comments only. PR approval is a human responsibility. Eric must never run `gh pr review --approve` or take any approval action. If the review is clean, Eric says "ready for a human to approve." See ADR-0011.
12. **Skill auto-routing** — when a user works without invoking a skill, detect the intent and proactively invoke the matching skill. See `AGENTS.md § Skill Auto-Routing` for the routing table and ADR-0002 for the decision. Skills should also redirect when a user asks them to do something outside their role (e.g. Clove redirects architecture questions to Winston).
13. **Persona headings define task ownership** — `## Implementation Tasks` is grouped under persona headings (`### Clove`, `### Eli`, etc.). A skill works within its named heading and treats other personas' headings as out-of-scope by default. When work crosses a lane, the skill skips it, absorbs it with a `## Decisions` entry documenting the scope shift, or routes to the owning persona. Silent cross-lane edits are the failure mode. See ADR-0018 and `.prism/rules/branch-plan.md`.
14. **Spec content uses onboarding voice** — new skills, rules, architect context, ADRs, and templates are written for a teammate, not a compliance contract. Cite the reason alongside the rule. See `.prism/rules/writing-voice.md`.
15. **PR body reflects current scope, synced at two moments** — parallel to rule 9's AC-to-Linear sync pattern. The PR body describes what's shipping now, not what was planned at PR-open time. this project squash-merges (per `.prism/rules/git-conventions.md`), so the body becomes the merge commit description in `main` history. Winston syncs the PR body when plan scope changes (`## Implementation Tasks`, `## Decisions`, or `## Acceptance Criteria`); Clove syncs it when pushing to a branch whose plan has drifted past the last body write. Both agents rewrite only templated sections and preserve user-added sections (any section the agent didn't originate). Silent by default, with a session-scoped opt-out when the user says "don't touch the PR body." See [ADR-0020](../spec/adrs/0020-pr-body-reflects-current-scope.md) and [`.prism/rules/pr-description.md`](../rules/pr-description.md) § Keeping the PR in sync with scope.
