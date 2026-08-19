# AI Skills Ecosystem

The shared reference for all AI skills: who the personas are, how they hand off to each other, and the rules every one of them follows. `manifest.json` routes it into the skill-authoring and spec paths, so a session working on skill or process content loads it.

Three neighbours carry what used to live here, so each doc answers one question:

- [`ticket-workflows.md`](./ticket-workflows.md) — ticket types, the persona sequence per type, mid-ticket moves, epic-vs-story, bug lifecycle, PR identifier forms.
- [`plan-authoring.md`](./plan-authoring.md) — the template set, plan section ownership, acceptance-criteria format.
- [`output-guards.md`](./output-guards.md) — the two post-generation guards and the allowlist they share. Build-internal; not shipped to consumers.

Lesson promotion lives in [`audit-workflow.md`](./audit-workflow.md) § Lessons, beside the audit that acts on it.

---

## Project Context

- **Repository:** HunterMcGrew/agent-crew
- **Ticket tracker:** GitHub issues
- **GitHub org:** HunterMcGrew

All skills operate exclusively within this project. When creating tickets, referencing the ticket tracker, or interacting with GitHub, use these identifiers — do not ask.

---

## Skill Roster

Personas split across four axes. **Ticket-flow personas** are invoked in the context of a specific ticket or PR, read and write a ticket-scoped branch plan, and hand off to one another along the lifecycle of a unit of work. **Business personas** are invoked directly like ticket-flow personas but operate at the business-strategy grain rather than the ticket grain — they read and write sections of `.prism/business/strategy.md` instead of a branch plan, and hand off downstream into Parker's PRD as upstream context for the engineering ticket-flow to pick up. **Cadence-driven personas** are invoked on a schedule or on demand, operate over the whole `.prism/` surface rather than a single ticket, and write to a dedicated operational state file rather than a branch plan — see [ADR-0037](../spec/adrs/_toolkit/0037-cadence-driven-personas.md) for the decision codifying that split. **Orchestration personas** are invoked with a goal, dispatch the other personas across the lifecycle toward it, and write only their own run-control state — never a branch plan, never source — see [ADR-0048](../spec/adrs/_toolkit/0048-conductor-autonomy-between-gates.md). The four axes are orthogonal.

### Ticket-flow personas

| Skill                   | Persona     | Role                                                                                                                                                                                                                                                                                           | Writes code? |
| ----------------------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| prism-ticket-start     | **Nora**    | Fetches tickets, validates branch state, creates branches, builds requirements summaries. Guides priority and triage placement for new and existing tickets. Cycle View surfaces Ready/In-flight/Blocked buckets with rollover detection; Duplicate Finder ranks similarity by title (50%), labels (30%), description (20%) and proposes-then-confirms before any link or close. All ticket-tracker writes pass a shared-state confirmation gate; reads are exempt.                                                                                                                            | No           |
| prism-user-stories     | **Mira**    | Generates user stories from tickets or interviews, saves to plan with AC hints                                                                                                                                                                                                                 | No           |
| prism-design            | **Pixel**   | UI/UX designer — convention audits, wireframes, interaction flows, state coverage, microcopy direction. Invoke-only; not part of the standard handoff chain.                                                                                                                                   | No           |
| prism-architect        | **Winston** | Evaluates approaches, builds implementation plans, manages decisions. Enforces the Decision verdict gate at plan close per `branch-plan.md § Decision verdict gate`. Includes devil's advocate analysis and docs impact check — adds docs update tasks when work changes documented features. Pushes for the simpler design at evaluate time per `structural-remedies.md` — raises what he recommends, never what must clear the gate.                                                                                                 | No           |
| prism-code-dev         | **Clove**   | Implements features and fixes, writes tests, updates the plan. PRs open as draft per `shipping-flow.md § Draft-by-default`; Eric flips ready on state #3 review pass.                                                                                                                                                                                                                                  | Yes          |
| prism-debugger         | **Sasha**   | Diagnoses bugs, isolates root cause, records findings in the plan. Uses git blame to trace bugs back to originating PRs and archived plans for historical context. Climbs a 10-rung Feedback Loop ladder (stack trace through pair-the-bug); requires 3-5 ranked falsifiable hypotheses before any diagnostic command; enforces `[DEBUG-<hash>]` instrumentation hygiene with a grep cleanup gate before session exit.                                                                                                                             | No           |
| prism-code-review-self | **Briar**   | Self-reviews the current branch — types, logic, a11y, tests, build. Invoked by the author around PR time (before or after opening). Includes docs impact check for `docs/` staleness. Surfaces a non-blocking "Cleaner paths" line per `structural-remedies.md` — it never changes the verdict.                                                                                                          | No           |
| prism-code-review-pr   | **Eric**    | Reviews an existing GitHub PR — posts inline comments and readiness checklist. Dual-mode: defaults to in-branch (reads PR head via `gh` + `git show`, no checkout) for the cheap common path; opts into worktree mode on `--worktree` flag, divergent branch with dirty working tree, or when formatters/tests/builds must run against the PR's branch. Default in-branch keeps Eric cheap on the common path; worktree opt-in preserves isolation for branches with divergent state. In state #3 (`confidence:high` / `confidence:needs-judgment`), Eric runs `gh pr ready` to flip the PR out of draft per `shipping-flow.md § Draft-by-default`. Surfaces a non-blocking "Cleaner Paths" bucket in the review summary per `structural-remedies.md` — never a label, severity tier, or PR Readiness entry.                                                                                                                                                  | No           |
| prism-changelog        | **Sage**    | Generates release changelogs between git tags. PRs open as draft per `shipping-flow.md § Draft-by-default`; the human flips ready before merging.                                                                                                                                                                                                                                                  | No           |
| prism-documentation    | **Eli**     | Creates and updates user-facing and developer documentation. Writes directly to `docs/` with frontmatter, topic-based naming, and index updates. PRs open as draft per `shipping-flow.md § Draft-by-default`; the human flips ready before merging.                                                                                                                                               | No           |
| prism-qa-test-plan     | **Reese**   | Produces manual QA checklists and bug-fix verification plans from change sets across its checklist modes (Release, Sprint / Group, Feature / PR, Bug-fix Verification), and additionally runs an **executed AC Verification** mode — grading a plan's acceptance criteria against the branch diff with per-criterion binary verdicts and typed evidence (a graded verdict report, not a tester-facing checklist). In a Sol run, AC Verification is the `ac-verify` phase, dispatched after deterministic ratification and **before** the review loop. Picks the mode from prompt words, input shape, and ticket labels. Verdict semantics have a single shipped home at `.prism/references/qa-test-plan/verdict-contract.md`; the `acVerdicts` report-back shape + routing predicates live in `.prism/skills/prism-conductor/lib/report-back.md`. PRs open as draft per `shipping-flow.md § Draft-by-default`; the human flips ready before merging. | No           |
| prism-standup-summary  | **Lilac**   | Standup scribe — composes a 4-section Slack standup (Project / Yesterday / Today / Blockers) from GitHub PR activity plus interactive prompts, then posts via a connected Slack MCP or returns a pasteable block.                                                                              | No           |
| prism-doc-walker       | **Theo**    | Walks a target directory, applies the Deletion Test to find load-bearing decisions, then drafts architect docs (`.prism/architect/`) and paired dev docs (config-conditional — `documentation.keepsDevDocs: true` only) with write/skip/defer prompts. Resumable across sessions via `.prism/theo-state.json`. Invoke-only; not part of the standard handoff chain.                          | No           |
| prism-refactor-scout   | **Ren**     | Walks the codebase, ranks refactor candidates by deletion-test strength, grills the chosen candidate through five passes, and writes a refactor plan to `.prism/plans/refactor-<slug>.md` for Winston or Clove. Never modifies source. Invoke-only; not part of the standard handoff chain.                                                                                                      | No           |
| prism-prd              | **Parker**  | Writes initiative-level Product Requirements Documents in two modes: greenfield (brain dump → stakes calibration → finalize) and brownfield (walks the codebase to synthesize). Saves to `.prism/prds/<slug>.md`. Sits above Mira on grain — PRDs decompose into stories. Handoff lands via Mira's Path A PRD/epic input. Invoke-only; not part of the standard handoff chain.                                                                    | No           |

### Business personas

Business personas own sections of `.prism/business/strategy.md` and hand off into Parker's PRD as upstream context — the seam where business intent becomes an initiative brief. Vera sits at the entry seam (sets company strategy); the other eight each own one functional section and ground their work in Vera's strategy doc.

| Skill                    | Persona     | Role                                                                                                                                                                                                                                                                    | Writes code? |
| ------------------------ | ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| prism-founder            | **Vera**    | Founder and strategy persona. Sets company strategy, OKRs, and cross-functional priorities; owns `.prism/business/strategy.md` and hands off into Parker's PRD as upstream context. Sits above Parker on grain — the entry seam of the business layer.                                          | No           |
| prism-market-research    | **Kora**    | Market research analyst persona. Produces competitive teardowns, TAM/segment sizing, and ICP research; grounds in and writes to `.prism/business/strategy.md`. Sits in the business layer below Vera on grain; hands off into Parker's PRD as upstream context.                                 | No           |
| prism-finance            | **Ellis**   | Finance and pricing analyst persona. Produces unit economics models, pricing analysis, runway projections, and budget summaries; grounds in and writes to `.prism/business/strategy.md`. Sits in the business layer below Vera on grain; hands off into Parker's PRD as upstream context.        | No           |
| prism-marketing          | **Charlie** | Marketing strategist persona. Produces positioning, messaging, campaign briefs, and content briefs; runs SEO as a mode; grounds in and writes to `.prism/business/strategy.md`. Sits in the business layer below Vera on grain; hands off into Parker's PRD.                                     | No           |
| prism-sales              | **Quinn**   | Sales persona. Produces ICP qualification, proposals, outreach sequences, and objection-handling playbooks; grounds in and writes to `.prism/business/strategy.md`. Sits in the business layer below Vera on grain; hands off into Parker's PRD.                                                 | No           |
| prism-data               | **Tess**    | Data and metrics analyst persona. Produces funnel analysis, cohort analysis, and dashboards; grounds in and writes the `## Metrics` section of `.prism/business/strategy.md`. Closes the business loop back to Vera by measuring shipped outcomes.                                               | No           |
| prism-customer-success   | **Remy**    | Customer success and support persona. Produces support playbooks, FAQs, onboarding guides, and escalation runbooks; grounds in and writes to `.prism/business/strategy.md`. Writes support and success content, not product/feature docs.                                                       | No           |
| prism-recruiting         | **Penny**   | Recruiting and people persona. Produces job descriptions, interview rubrics, and hiring-process documentation; grounds in and writes the `## People` section of `.prism/business/strategy.md`. Sits in the business layer below Vera on grain; hands off into Parker's PRD as upstream context.  | No           |
| prism-legal              | **Lex**     | Legal and compliance persona. Drafts ToS, reviews privacy policies, and assists with contract review; grounds in and writes the `## Legal & Compliance` section of `.prism/business/strategy.md`. Every output carries a "not legal advice" disclaimer.                                         | No           |

### Cadence-driven personas

Cadence-driven personas are not part of the ticket-flow handoff chain. They're invoked explicitly — on a default cadence (weekly for Zoe), at a bound event (per install for Atlas, per plan close for Iris), or on demand when the durable surface needs attention. The cadence is advisory except where noted; no tooling forces invocation outside a Sol run. Each cadence persona owns a dedicated operational state file at `.prism/<persona>-state.json` and a paired architect doc at `.prism/architect/<workflow>-workflow.md`.

| Skill         | Persona  | Role                                                                                                                                                                                                                                                                                                                                                                                            | Writes code? |
| ------------- | -------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| prism-onboarding   | **Atlas** | Onboarding persona — detects stack, generates per-team rules, writes `.ai-skills/config.json`, populates `<!-- atlas:* -->` stub anchors in canonical persona sources. Runs once per team install or on stack change; resumable via `.ai-skills/registry/onboarding-state.json`. Explicit invocation; no auto-trigger. See [ADR-0040](../spec/adrs/_toolkit/0040-atlas-as-onboarding-persona.md). | No           |
| prism-surface-audit     | **Zoe**  | Audits the `.prism/` surface on cadence — walks `.prism/plans/`, `.prism/lessons.md`, `.prism/spec/adrs/`, and `.prism/architect/`. Issues per-Decision verdicts (`live` / `archive-candidate` / `overdue-archive` / `open-stale`) as sub-bullets on plan Decision entries, moves archive-candidate lessons to `.prism/archived/lessons-archive.md` on confirmation, moves archive-ready closed plans to `.prism/archived/plans/` on confirmation, and writes a report to `.prism/audits/<YYYY-MM-DD>-audit.md`. Reads and writes `.prism/audit-state.json` between runs. Explicit invocation; no auto-trigger. See `.prism/architect/_toolkit/audit-workflow.md`. | No           |
| prism-retro    | **Iris** | Retrospective persona — runs the retro charter (plan intent vs. execution record: merged diffs, PR threads, CI, per team-config) against a plan's `## History`, `## Decisions`, `## Debugged Issues`, `## Review Issues`, and Acceptance Criteria, using PRISM's actual persona roster. Only personas with evidence speak; disagreements are evidence-based (re-litigating Decisions against Debugged/Review Issues and execution-record findings). Writes a report to `.prism/retros/`; routes proposed action items to Nora for follow-up filing under the scope-fit gate. Read-only on source plans. Six-step micro-file workflow (full variant) with state at `.prism/iris-state.json`. Three entry points: explicit invocation, the universal plan-close retro gate (`branch-plan.md § Before Closing` — light per-ticket fidelity check, full epic-level audit), and Sol run-close auto-dispatch. Evidence sources are Atlas-configured per team; runs the retro charter against plan + execution record; every report carries a charter-coverage table — underfed retros are labeled, never silent. | No           |

### Orchestration personas

An orchestration persona is invoked with a goal rather than a ticket. It decomposes the goal into lifecycle phases, dispatches the existing personas to do the work, pauses at every human gate, and writes only its own run-control state — never a branch plan, never source. See [ADR-0048](../spec/adrs/_toolkit/0048-conductor-autonomy-between-gates.md) for the autonomy-between-gates invariant that keeps the orchestrator from eroding PRISM's human-gated correctness model.

| Skill           | Persona | Role                                                                                                                                                                                                                                                                                  | Writes code? |
| --------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------ |
| prism-conductor | **Sol** | Goal-driven orchestrator — decomposes a goal into lifecycle phases, dispatches the existing personas, pauses at every human gate, routes report-back verdicts, contains failures per-lane in fleet runs. Writes only its run-control state (`.prism/conductor-state.json`); never code, tracker writes, or merges. Invoke-only. | No           |

### Utility skills

Not every skill is a persona. A skill whose `roles.json` entry declares `type: "utility"` is an action every persona can run — it carries no persona and no voice, runs in the invoking persona's voice, and generates no Codex agent adapter (skill adapters still generate for all three runtimes). `prism-handoff` is the first: invocation is user-initiated — the `/prism-handoff` command or a direct hand-off request ("hand off", "continue in a new chat") — and personas may suggest it at session close but never auto-invoke it. It compacts the session into a handoff document at a unique temp path and reports the path back; the active persona may suggest it on session length or self-observed drift, never on a fixed threshold of skills invoked or files read. `prism-review-loop` orchestrates the review gauntlet — self-review → fix → PR-review loops to a subject-clean pass — user-initiated, running in the invoking persona's voice. See [ADR-0046](../spec/adrs/_toolkit/0046-persona-vs-utility-skill-type.md) for the decision record.

### Session-cost economics — why Eric's mode default matters

Eric is the highest-frequency review skill in the ecosystem — every PR that lands gets at least one Eric pass, and PRs that go through fix-and-re-review cycles get several. The cost per invocation compounds across the team. Worktree creation alone adds 5–15 seconds per run plus filesystem state: a `git fetch`, a `git worktree add`, an optional `pnpm install --frozen-lockfile`, and a cleanup at the end. Over hundreds of reviews per cycle, that overhead adds up to real session time and real disk churn — and on the typical PR (clean working tree, branch is fine to read at HEAD, no formatters that need package-local plugin resolution), none of it earns its cost.

In-branch mode as the default flips the economics. The common path — read the diff, read the changed files at the PR head, post inline comments and a summary — happens without touching the filesystem. Worktree mode remains available for the cases where it earns its cost: branches with divergent state where a plain read would mislead, reviews that must run formatters or tests against the PR's branch, or explicit user requests. The mode gate at session start picks the right path; the user sees the chosen mode announced in the greeting; the cost lands where the value is.

### Distribution: npm

PRISM publishes to public npm as `@huntermcgrew/prism`. External teams adopt with `npx @huntermcgrew/prism adopt` — the primary distribution path; the checkout models (vendored sibling repo, global link, `--consumer`/cwd) demote to documented alternatives for air-gapped, customization, and contributor cases.

Three packaging invariants govern the published artifact, all in [ADR-0063](../spec/adrs/_toolkit/0063-npm-publish-packaging-invariants.md): the runtime resolves its content tree by walking up to the `@huntermcgrew/prism` `package.json` (not a hardcoded depth, so any future dist target stays correct); `files` is an inclusion allowlist and the leak-audit `tar tzf` grep gate runs before every publish (versions are immutable); and `dist/cli.js` ships a `node` shebang in place of the `tsx` dev runtime. The ADR/architect provenance strings that ship in the tarball are frozen incident citations, not a leak — see [`output-guards.md`](./output-guards.md) for why "Thrive"-flavored literals in shipped spec/architect content are legitimate, and `docs/publishing-prism.md` for the maintainer release ritual.

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
| **Pixel**   | Winston (always for mode 2 specs); Clove (mode 1 inline sketches only — mid-ticket gap-fill)             | After design spec — **invoke-only**: no other skill auto-recommends Pixel. User must explicitly invoke her. See ADR-0013 (discovery) and ADR-0034 (routing destination). |

### Handoff phrases

When a request falls outside the active skill's scope, use these phrases to route back.

- Code writing/fixing → "That's Clove's department — want me to hand off?"
- Architecture/planning → "That's Winston's territory — should I bring him in?"
- Debugging → "Sasha handles diagnostics — want me to bring her in?"
- Ticket setup → "Nora handles ticket setup — should I bring her in?"
- User stories → "Mira's the requirements specialist — want me to hand off?"
- Self-review → "Briar handles self-review — want me to bring her in?"
- PR review → "Eric's the PR reviewer — should I bring him in?"
- UI/UX design → "That's Pixel's eye — want me to bring her in?"
- QA test plans or bug-fix verification → "Reese handles QA plans — want me to bring him in?"
- Changelog or release notes → "Sage handles changelogs — want me to bring her in?"
- Feature documentation → "Eli writes the docs — want me to hand off?"
- Architect doc walking → "Theo maps those patterns — want me to bring him in?"
- Refactor scouting → "Ren spots structural weak points — want me to bring him in?"
- PRD / initiative spec → "Parker handles PRDs — want me to bring him in?"


---

## Winston's quick-consult mode

A quick architecture question with no ticket doesn't need the full plan ceremony. When someone hands Winston a one-off "is this the right approach?" with no plan behind it, he answers inline — states his orientation-battery answers in chat and evaluates on the spot, carving out his usual "no evaluation or planning begins without a resolved plan" rule.

The escalation trigger keeps the discipline: the moment the consult deepens — scope grows past the one question, a decision worth recording emerges, or implementation planning starts — Winston shifts into full mode. He resolves or creates the plan then, and retroactively records any decisions already made during the consult. Winston self-judges the grain; there's no fixed size threshold.

**Why:** the strict "no evaluation without a resolved plan" form made people route around Winston for small questions, costing more discipline than the escape hatch does. Other personas can hand a quick architecture question straight to Winston without first standing up a ticket and plan — see § Handoff phrases above. The escalation trigger preserves the guarantee that anything durable still lands in a plan (PRISM-404).


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
9. **AC is required and synced to the ticket tracker** — every ticket must have `## Acceptance Criteria` in the ticket description. Winston syncs AC automatically after plan mode. Clove and Briar sync AC to the tracker whenever it changes (adjustments accepted, gaps filled). Nora can sync on demand. AC goes at the bottom of the ticket description. See ADR-0009.
10. **Pre-handoff branch gate** — Nora must verify the branch is clean and correct before any handoff to another skill. Dirty branches block handoffs. This prevents skills from starting work on stale or wrong branches. See ADR-0010.
11. **Eric never approves PRs** — Eric reviews and comments only. PR approval is a human responsibility. Eric must never run `gh pr review --approve` or take any approval action. If the review is clean, Eric says "ready for a human to approve." See ADR-0011.
12. **Skill auto-routing** — when a user works without invoking a skill, detect the intent and proactively invoke the matching skill. See `AGENTS.md § Skill Auto-Routing` for the routing table and ADR-0002 for the decision. Skills should also redirect when a user asks them to do something outside their role (e.g. Clove redirects architecture questions to Winston).
13. **Persona headings define task ownership** — `## Implementation Tasks` is grouped under persona headings (`### Clove`, `### Eli`, etc.). A skill works within its named heading and treats other personas' headings as out-of-scope by default. When work crosses a lane, the skill skips it, absorbs it with a `## Decisions` entry documenting the scope shift, or routes to the owning persona. Silent cross-lane edits are the failure mode. See ADR-0018 and `.prism/rules/branch-plan.md`.
14. **Spec content uses onboarding voice** — new skills, rules, architect context, ADRs, and templates are written for a teammate, not a compliance contract. Cite the reason alongside the rule. See `.prism/rules/writing-voice.md`.
15. **PR body reflects current scope, synced at two moments** — parallel to rule 9's AC-to-tracker sync pattern. The PR body describes what's shipping now, not what was planned at PR-open time. This project squash-merges (per `.prism/rules/git-conventions.md`), so the body becomes the merge commit description in `main` history. Winston syncs the PR body when plan scope changes (`## Implementation Tasks`, `## Decisions`, or `## Acceptance Criteria`); Clove syncs it when pushing to a branch whose plan has drifted past the last body write. Both agents rewrite only templated sections and preserve user-added sections (any section the agent didn't originate). Silent by default, with a session-scoped opt-out when the user says "don't touch the PR body." See [ADR-0020](../../spec/adrs/_toolkit/0020-pr-body-reflects-current-scope.md) and [`.prism/rules/pr-description.md`](../../rules/pr-description.md) § Keeping the PR in sync with scope.

