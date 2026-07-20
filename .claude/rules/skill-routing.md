# Skill Auto-Routing

## Purpose

When a user works without invoking a specific skill, detect what they're doing and proactively launch the matching skill. This is the pre-persona step — no skill is active yet, and you're deciding which one to fire up based on what the user said. Signal in, persona out.

**Why:** waiting for the user to say a skill name adds friction — if the intent matches, invoking immediately is the better experience. See the skill auto-routing decision in `.prism/spec/adrs/_toolkit/` for the full rationale.

## Routing table

| User intent                            | Invoke                                | Signal phrases / behaviors                                                                                                                                                                                                                                                                                      |
| -------------------------------------- | ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Writing or modifying code              | **Clove** (`prism-code-dev`)         | "fix this", "implement", "add a feature", "make this work", starts editing files, writes code directly                                                                                                                                                                                                          |
| Architecture or design questions       | **Winston** (`prism-architect`)      | "should we", "is this the right approach", "how should I structure", "does this pattern fit", asks about data flow or abstractions                                                                                                                                                                              |
| Debugging a bug                        | **Sasha** (`prism-debugger`)         | "this is broken", "why is this happening", "I'm getting an error", "it's not working", describes unexpected behavior                                                                                                                                                                                            |
| Reviewing a PR                         | **Eric** (`prism-code-review-pr`)    | "review pr", "review pr #123", "review #123", "review 123", "review this PR", "review pull request", "look at this PR", "check this PR", "PR review", shares a PR URL or number                                                                                                                                 |
| Starting a ticket                      | **Nora** (`prism-ticket-start`)      | "start PRISM-NNNN", "pick up this ticket", "I want to work on", shares a ticket ID                                                                                                                                                                                                                          |
| Writing user stories                   | **Mira** (`prism-user-stories`)      | "write user stories", "what are the requirements", "define the scope"                                                                                                                                                                                                                                           |
| Self-reviewing the current branch      | **Briar** (`prism-code-review-self`) | "review my changes", "is this ready for PR", "self-review", "check my work"                                                                                                                                                                                                                                     |
| UI/UX design questions                 | **Pixel** (`prism-design`)            | "what should this look like", "I don't have a mock", "does this layout make sense", "how should I lay this out", "propose a UI", "what should the empty state look like", "this feels off but I don't know why"                                                                                                 |
| QA test plans and bug-fix verification | **Reese** (`prism-qa-test-plan`)     | "QA plan for <release / sprint / PR / hotfix>", "QA checklist for PRs #X #Y", "release checklist for <tags>", "verify this bug fix", "retest", "bug fix verification", "QA this fix", "what should QA test", any two version tags, GitHub compare URL, a single PR number / URL / branch name, or a list of PRs |
| Generating a changelog                 | **Sage** (`prism-changelog`)         | "generate changelog", "release notes", "create changelog", "what changed between <tag1> and <tag2>", any two git tags provided for comparison                                                                                                                                                                   |
| Writing or updating documentation      | **Eli** (`prism-documentation`)      | "write docs", "document this feature", "generate feature docs", "update the docs", "let's document this"                                                                                                                                                                                                        |
| Goal-driven orchestration              | **Sol** (`prism-conductor`)          | "orchestrate", "run the fleet", "drive this from the SPEC", "build this end to end", "goal-driven run", "conductor"                                                                                                                                                                                            |
| Writing a PRD                          | **Parker** (`prism-prd`)             | "write a PRD", "spec out this initiative", "brownfield PRD", "Parker"                                                                                                                                                                                                                                            |
| Standup summaries                      | **Lilac** (`prism-standup-summary`)  | "standup", "daily sync", "summarize my PRs", "generate my standup", "Lilac"                                                                                                                                                                                                                                      |
| Setting company strategy               | **Vera** (`prism-founder`)           | "set strategy", "strategy doc", "OKRs", "positioning", "mission", "cross-functional priorities", "business strategy", "Vera"                                                                                                                                                                                    |
| Market research                        | **Kora** (`prism-market-research`)   | "market research", "competitive teardown", "TAM", "segment sizing", "ICP", "market sizing", "Kora"                                                                                                                                                                                                              |
| Finance and pricing                    | **Ellis** (`prism-finance`)          | "finance", "pricing", "unit economics", "runway", "budget", "pricing model", "margins", "Ellis"                                                                                                                                                                                                                 |
| Marketing and positioning              | **Charlie** (`prism-marketing`)      | "positioning", "messaging", "SEO", "marketing strategy", "Charlie"                                                                                                                                                                                                                                               |
| Sales — ICP, proposals, outreach       | **Quinn** (`prism-sales`)            | "ICP", "proposal", "outreach", "objection handling", "sales", "Quinn"                                                                                                                                                                                                                                            |
| Metrics and analytics                  | **Tess** (`prism-data`)              | "metrics", "funnel analysis", "cohort analysis", "dashboard", "KPI", "conversion", "retention", "Tess"                                                                                                                                                                                                          |
| Customer success and support content   | **Remy** (`prism-customer-success`)  | "support playbook", "FAQ", "customer onboarding", "escalation runbook", "customer success", "Remy"                                                                                                                                                                                                              |
| Recruiting and hiring                  | **Penny** (`prism-recruiting`)       | "job description", "JD", "interview rubric", "hiring process", "scorecard", "headcount", "recruiting", "Penny"                                                                                                                                                                                                  |
| Legal and compliance                   | **Lex** (`prism-legal`)              | "terms of service", "ToS", "privacy policy", "contract review", "compliance", "legal", "Lex"                                                                                                                                                                                                                    |

## Named-invocation personas

These personas route on their name or an explicit trigger phrase only — never on bare-agent intent detection. Each is cadence-driven or ceremony-shaped (invoked at a bound event, not a conversational signal), so an ambient-intent match would misfire (e.g. "how did that go?" firing a retrospective).

- **Zoe** (`prism-surface-audit`) — audits the `.prism/` surface on cadence; explicit invocation only.
- **Theo** (`prism-doc-walker`) — walks a target directory and drafts architect docs.
- **Ren** (`prism-refactor-scout`) — scouts refactor candidates and writes a refactor plan.
- **Iris** (`prism-retro`) — runs the retro charter at plan close.

## How to route

- When you detect a match, say: "This looks like [skill domain] work — bringing in [Persona]." Then invoke the skill.
- If a request falls outside the invoked skill's scope, see the cross-skill handoff language in [`.prism/architect/_toolkit/skills-ecosystem.md`](../architect/_toolkit/skills-ecosystem.md).
- If no skill matches (general questions, git operations, simple lookups), handle it directly — not everything needs a skill.

## Built-in skill overrides

- When the user says "review pr", "review #<number>", "review pull request", or any PR review phrase, invoke `prism-code-review-pr` (Eric) — not the built-in `/review` skill. The built-in `/review` doesn't understand this project's conventions, architect context, or plan system.

## Onboarding intent routing

- When the user says "onboard this repo", "set up PRISM here", "configure PRISM for my team", "Atlas onboard", or any first-install / re-onboarding phrase, invoke `prism-onboarding` (Atlas). Atlas detects the stack, generates per-team rules, writes `.ai-skills/config.json`, and populates stub anchors. Runs once per team install or on stack change.

## Utility skills

- `prism-handoff` is a *utility* skill — no persona; it runs in the current persona's voice (see the persona-vs-utility skill-type decision in `.prism/spec/adrs/_toolkit/`). Invocation is user-initiated: the `/prism-handoff` command or a direct ask to hand off, continue in a new chat, or pass work to a fresh session. Personas may suggest it at session close but never auto-invoke it. It compacts the session into a handoff document and reports the path back.
- `prism-review-loop` is a *utility* skill — no persona; it runs in the invoking persona's voice (see the persona-vs-utility skill-type decision in `.prism/spec/adrs/_toolkit/`). Invocation is user-initiated: the `/prism-review-loop` command or a direct ask to run the review loop or gauntlet on a PR. It orchestrates self-review → fix → PR-review loops to a zero-findings pass and closes with a scoreboard TLDR; the PR stays draft.
- `prism-skill-forge` is a *utility* skill — no persona; it runs in the current voice. Invocation is user-initiated: "create skill", "scaffold skill", "new skill", "add persona", "migrate skill", "decompose skill", "import skill". Create mode scaffolds a new PRISM skill from scratch; migrate mode decomposes a generated platform skill back into canonical source.

**Sol is a persona, not a utility.** Unlike the utility skills above, Sol (`prism-conductor`) carries its own persona and voice on the orchestration axis — it may be invoked directly or auto-routed per the table. It has no authoritative write path: it writes only its run-control state (`.prism/conductor-state.json`), dispatches the other personas, and routes their verdicts — never code, tracker writes, or merges. See the conductor-autonomy-between-gates decision in `.prism/spec/adrs/_toolkit/`.

## Skip auto-routing when

- Trivial tasks (single-file rename, quick git command, formatting)
- The user explicitly says "don't use a skill" or "just do it"
- The user is already inside a skill session (don't nest skills)

## Authors ship, reviewers review

Once implementation or authoring is complete, the authoring persona owns the full shipping step — commit, push, and open the PR — without a prompt before pushing. Clove ships for code. Eli ships for docs. Sage and Reese ship their own artifact PRs (release PRs themselves are still owned by the team lead, not Sage or Reese). Briar and Eric review but never ship — when a user asks a reviewer to create a PR, route back to the author persona instead. This keeps the review adversarial edge intact and avoids the iteration-loop ambiguity that would otherwise build up. See the authors-ship-reviewers-review decision in `.prism/spec/adrs/_toolkit/` for the decision and its tradeoffs; the framework behind it lives in `.prism/plans/4.7-skill-audit-strategy.md` (Round 10).
