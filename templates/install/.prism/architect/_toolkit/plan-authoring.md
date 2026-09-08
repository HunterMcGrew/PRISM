# Plan Authoring

What goes inside a plan file and who is allowed to put it there: the canonical
template set, the per-section ownership table, and the acceptance-criteria
format every persona grades against.

It does not cover the plan lifecycle — when a plan is created, updated, or
closed — which lives in [`.prism/rules/branch-plan.md`](../../rules/branch-plan.md).
It does not cover which persona runs when; that is
[`ticket-workflows.md`](./ticket-workflows.md).

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

Each plan section has designated readers and writers. This prevents conflicts and ensures the right skill updates the right section.

| Plan Section                                  | Written by                                                             | Read by                                     |
| ---------------------------------------------- | ---------------------------------------------------------------------- | ------------------------------------------- |
| `## Goal`                                     | Winston, Nora                                                          | All                                         |
| `## User Stories`                             | Mira                                                                   | Winston, Clove, Eli                         |
| `### Story Map` (under `## User Stories`, epic plans) | Mira                                                            | Winston, Nora                               |
| `## Decisions`                                | Winston                                                                | All                                         |
| `## Implementation Tasks`                     | Winston                                                                | Clove                                       |
| `## Acceptance Criteria`                      | Winston (generates), Briar (validates/updates), Nora (bug AC)          | Clove, Briar, Eric                          |
| `## Acceptance Criteria` → the ticket tracker | Winston (auto), Clove (on change), Briar (on change), Nora (on demand) | —                                           |
| AC Sync Log                                   | All AC-touching skills (append-only)                                   | All — check last row for current sync state |
| `## Design`                                   | Pixel (on explicit request — mode 2 only)                              | Winston, Clove                              |
| `## History`                                  | All (append-only)                                                      | All                                         |
| `## Debugged Issues`                          | Sasha (creates), Clove (marks fixed)                                   | Clove, Briar, Eric                          |
| `## Review Issues`                            | Briar, Eric (creates), Clove (marks fixed)                             | Clove                                       |
| `## Cleanup Items`                            | Briar                                                                  | Clove                                       |
| `## PR Readiness`                             | Briar                                                                  | Clove, Eric                                 |

---

---

## Acceptance Criteria Format

See `.prism/templates/acceptance-criteria.md` for the full reference.

Every criterion carries a **stable ID** (`AC-1`, `AC-2`…) and a falsifiable **Evidence sub-bullet** tagged `machine` or `human` — the gradeability bar. This turns the AC into a grading instrument: Reese's executed AC Verification walks criteria by ID and grades each against its Evidence. The bar's authoring rules (falsifiable-not-merely-runnable, positive controls on absence-evidence, behavioral evidence for behavioral criteria, the two-verifier standard) live in the template; the verdict semantics Reese grades against live at `.prism/references/qa-test-plan/verdict-contract.md`. On tracker sync, the ID prefix and Evidence sub-bullets are stripped — the tracker AC stays stakeholder-facing.

**Behavioral criteria** use Gherkin `Given / When / Then`:

```
- [ ] Given [precondition], When [action], Then [outcome]
```

**Non-behavioral criteria** use a plain checklist:

```
- [ ] [Constraint or quality requirement]
```

**AC Adjustments:** agents propose changes with status `proposed`. Humans accept or reject before the agent proceeds. Agents never silently modify AC.

