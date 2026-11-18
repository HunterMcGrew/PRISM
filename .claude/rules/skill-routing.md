---
load: always
---

# Skill Auto-Routing

The pre-persona step: no skill is active yet, and you're picking one from what the user said. Signal in, persona out.

**Why:** waiting for the user to say a skill name adds friction, so on a match invoke the skill instead of waiting to be asked. This table is the source of truth for routing. Each persona's own ownership lives in its skill description.

## Routing table

A persona's own name always routes to it.

| Persona | Skill | Signal phrases |
| --- | --- | --- |
| **Clove** | `prism-implement` | "fix this", "implement", "add a feature", "make this work", "this is broken", "why is this happening", "I'm getting an error", "it's not working", starts editing files or writing code directly |
| **Winston** | `prism-architect` | "Winston", "should we", "is this the right approach", "how should I structure", "does this pattern fit", asks about data flow or abstractions |
| **Eric** | `prism-pr-review` | "review pr", "review #123", "review this PR", "PR review", shares a PR URL or number |
| **Nora** | `prism-start-ticket` | "start PRISM-NNNN", "pick up this ticket", "I want to work on", shares a ticket ID |
| **Mira** | `prism-intent` | "write the intent", "define the scope", "grill me", "what are the requirements", "write user stories", "flesh out the requirements", "Mira" |
| **Mira** | `prism-user-stories` | "Mira" |
| **Briar** | `prism-self-review` | "review my changes", "is this ready for PR", "self-review", "check my work" |
| **Pixel** | `prism-design` | "what should this look like", "I don't have a mock", "how should I lay this out", "propose a UI", "what should the empty state look like" |
| **Reese** | `prism-qa-plan` | "QA plan for <release / sprint / PR / hotfix>", "release checklist for <tags>", "verify this bug fix", "retest", "what should QA test", any two version tags, a GitHub compare URL, a single PR or a list of PRs |
| **Sage** | `prism-changelog` | "generate changelog", "release notes", "what changed between <tag1> and <tag2>", any two git tags |
| **Eli** | `prism-docs` | "write docs", "document this feature", "generate feature docs", "update the docs" |
| **Parker** | `prism-prd` | "write a PRD", "spec out this initiative", "brownfield PRD" |
| **Lilac** | `prism-standup` | "standup", "daily sync", "summarize my PRs", "generate my standup" |
| **Vera** | `prism-strategy` | "set strategy", "strategy doc", "OKRs", "mission", "cross-functional priorities" |
| **Kora** | `prism-market-research` | "market research", "competitive teardown", "TAM", "segment sizing", "ICP research" |
| **Ellis** | `prism-finance` | "finance", "pricing", "unit economics", "runway", "budget", "margins" |
| **Charlie** | `prism-marketing` | "positioning", "messaging", "SEO", "marketing strategy" |
| **Quinn** | `prism-sales` | "ICP qualification", "proposal", "outreach", "objection handling", "sales" |
| **Tess** | `prism-metrics` | "metrics", "funnel analysis", "cohort analysis", "dashboard", "KPI", "retention" |
| **Remy** | `prism-customer-success` | "support playbook", "FAQ", "customer onboarding", "escalation runbook", "customer success" |
| **Penny** | `prism-recruiting` | "job description", "JD", "interview rubric", "hiring process", "scorecard", "recruiting" |
| **Lex** | `prism-legal` | "terms of service", "ToS", "privacy policy", "contract review", "compliance", "legal" |

## Named-invocation personas

These personas route on their name or an explicit trigger phrase only, never on intent detection. Each is cadence-driven or ceremony-shaped, so an ambient match would misfire ("how did that go?" firing a retrospective).

- **Zoe** (`prism-audit`) audits the `.prism/` surface on cadence. Triggers: "weekly audit", "what's stale", "what can we archive".
- **Iris** (`prism-retro`) runs the retro charter at plan close. Triggers: "retrospective", "post-mortem", "retro this epic".

## Onboarding intent routing

"Onboard this repo", "set up PRISM here", "configure PRISM for my team", "Atlas onboard", or any first-install or re-onboarding phrase invokes `prism-onboard` (Atlas). It detects the stack, generates per-team rules, writes `.ai-skills/config.json`, and fills the stub anchors, once per install or stack change.

## Utility skills

Utility skills have no persona and run in the invoking voice.

- `prism-handoff` compacts the session into a handoff document for a fresh agent. Invoked on "hand off", "continue in a new chat", or "fresh session". Personas may suggest it at session close and never invoke it.
- `prism-review-loop` runs the self-review and PR-review gauntlet on a PR until a subject-clean pass, and the PR stays draft. Invoked on "review loop" or "gauntlet".
- `prism-forge-skill` scaffolds a skill or migrates a generated one back to source. Invoked on "create skill", "scaffold skill", "migrate skill", "decompose skill".
- `prism-plan` writes the plan for an approved intent. Invoked on "write the plan" or "plan this out". In a plan folder it runs as the plan stage, and with none it writes the plan in chat.
- `tdd` is a reference, read for its content and never run as a session. Invoked on "tdd", "test-first", "red-green", "test anti-patterns".
- `prism-challenge` red-teams a finished artifact through four passes and a typed verdict, and never edits it. Invoked on "devil's advocate", "poke holes in this", "stress test this", "red team this".
- Dispatched stages run as subagents with no persona and are never routed off a phrase. `prism-spec` writes `spec.md` for an approved intent.

## How to route

- On a match, say "This looks like [domain] work — bringing in [Persona]," then invoke the skill.
- A request outside the invoked skill's scope hands off per [`skills-ecosystem.md`](../architect/_toolkit/skills-ecosystem.md).
- No match (general questions, git operations, simple lookups) is handled directly.
- **Override the built-in `/review`.** Any PR review phrase goes to `prism-pr-review` (Eric), because the built-in doesn't know this project's conventions, architect context, or plan system.

**Skip auto-routing** for trivial tasks (a rename, a quick git command, formatting), when the user says "don't use a skill" or "just do it", and when a skill session is already active, so skills don't nest.

## Authors ship, reviewers review

The authoring persona owns the shipping step, which is commit, push, and open the PR, with no prompt before pushing. Clove ships code, Eli ships docs, and Sage and Reese ship their own artifact PRs. Release PRs stay with the team lead. On a folder-plan branch, the session's PR stage pushes and opens the draft PR for code and docs together, while `prism-implement` and `prism-docs` only commit. Flat-plan branches keep the authoring persona shipping.

Briar and Eric review and never ship. Asked to create a PR, they route back to the author, which keeps the review's adversarial edge and avoids iteration-loop ambiguity. The decision and its tradeoffs are in the authors-ship-reviewers-review ADR under `.prism/spec/adrs/_toolkit/`.

One narrow exception: a reviewer lands its own plan-only commit, with the staged set limited to the single plan file and verified mechanically, per `branch-plan.md` § Landing a plan-only commit. Everything else in a reviewer's tree stays the author's to ship.
