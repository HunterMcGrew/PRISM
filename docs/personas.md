---
title: "PRISM Personas"
description: "What each persona does, when to call them, and what they hand off."
category: "personas"
audience: "developer-user"
last_updated: "2026-06-27"
---

# PRISM Personas

Each persona owns a domain. They read the branch plan to pick up context, do their work, and hand off to the next persona. The table below is the at-a-glance guide — the skill file for each persona (`.ai-skills/skills/<id>/`) carries the full behavior, workflows, and output format.

> [!NOTE]
> Auto-routing fires most of these automatically. If you describe an architecture question, Winston fires. If you ask for implementation, Clove fires. You can always invoke by name if you want a specific persona.

---

## Build & ship

### Winston — architect (`prism-architect`)

**What he does:** Evaluates approaches against codebase patterns, data flow, coupling, and risk. Writes ordered implementation tasks into the branch plan. Never writes code.

**When to call:** Before implementing anything non-trivial. "Winston, plan this out." or describe an architecture question.

**Hands off to:** Clove for implementation.

**Skill:** [`.ai-skills/skills/prism-architect/`](../.ai-skills/skills/prism-architect/)

---

### Clove — implementation (`prism-code-dev`)

**What she does:** Implements features, fixes, and tasks on the current branch following codebase patterns. Reads the branch plan before editing; updates it after meaningful changes. Ships the PR when the branch is ready.

**When to call:** "Clove, implement this." or describe what you want built.

**Hands off to:** Briar for self-review before opening a PR.

**Skill:** [`.ai-skills/skills/prism-code-dev/`](../.ai-skills/skills/prism-code-dev/)

---

### Briar — self-review (`prism-code-review-self`)

**What she does:** Reviews the current branch covering types, logic, accessibility, tests, and build. Reports findings in chat and in the branch plan's `## Review Issues` section. Never posts to GitHub.

**When to call:** Before opening a PR. "Briar, review my changes."

**Hands off to:** Clove for fixes, then back to Briar until clean.

**Skill:** [`.ai-skills/skills/prism-code-review-self/`](../.ai-skills/skills/prism-code-review-self/)

---

### Eric — PR review (`prism-code-review-pr`)

**What he does:** Runs a full review on an open GitHub PR. Posts inline comments, severity-ranked issues, test coverage gaps, and a readiness checklist directly to the PR. Never approves — that's a human responsibility.

**When to call:** After the PR is open. "Eric, review PR #123."

**Hands off to:** Clove for fixes.

**Skill:** [`.ai-skills/skills/prism-code-review-pr/`](../.ai-skills/skills/prism-code-review-pr/)

---

### Sasha — debugger (`prism-debugger`)

**What she does:** Diagnoses bugs from logs, errors, or failing tests. Records findings with root cause, confidence level, and recommended fix in the branch plan's `## Debugged Issues`.

**When to call:** "This is broken." or share an error/log. Works well mid-Clove when a bug surfaces during implementation.

**Hands off to:** Clove for the fix.

**Skill:** [`.ai-skills/skills/prism-debugger/`](../.ai-skills/skills/prism-debugger/)

---

## Plan & spec

### Nora — ticket setup (`prism-ticket-start`)

**What she does:** Picks up a ticket, confirms scope, creates the branch, and initializes the branch plan. Applies the follow-up scope rule — same-scope follow-ups go into the active PR, not new tickets.

**When to call:** "Nora, start PRISM-1234." or "Pick up this ticket."

**Hands off to:** Winston (if planning is needed) or Clove.

**Skill:** [`.ai-skills/skills/prism-ticket-start/`](../.ai-skills/skills/prism-ticket-start/)

---

### Mira — user stories (`prism-user-stories`)

**What she does:** Writes user stories in standard "As a / I want / So that" format. Records them in the branch plan's `## User Stories` section. Adds AC citations.

**When to call:** Before planning, when you need to define requirements. "Write user stories for this."

**Hands off to:** Winston for implementation planning.

**Skill:** [`.ai-skills/skills/prism-user-stories/`](../.ai-skills/skills/prism-user-stories/)

---

### Parker — PRD (`prism-prd`)

**What he does:** Writes product requirement documents from scratch (greenfield) or synthesizes a PRD from existing code (brownfield). Produces `.prism/prds/<slug>.md`.

**When to call:** "Parker, write a PRD for this." or describe the feature/product area.

**Hands off to:** Mira for user stories, Nora for ticket setup, Winston for planning.

**Skill:** [`.ai-skills/skills/prism-prd/`](../.ai-skills/skills/prism-prd/)

---

### Pixel — UI/UX design (`prism-design`)

**What she does:** Produces UI/UX designs, wireframes, and mock specs. Works in three modes: inline sketch (chat), saved mock spec (`.prism/design/mocks/<slug>.md`), and HTML mockup. Never writes production code.

**When to call:** "What should this look like?" or "I don't have a mock for this."

**Hands off to:** Winston for implementation planning (she includes architectural inputs in mode 2 specs).

**Skill:** [`.ai-skills/skills/prism-design/`](../.ai-skills/skills/prism-design/)

---

### Reese — QA test plans (`prism-qa-test-plan`)

**What she does:** Writes QA test plans for releases, sprints, PRs, or hotfixes. Produces checklists that a tester can execute against the running app.

**When to call:** "QA plan for PR #123." or "Release checklist for v1.2.0."

**Skill:** [`.ai-skills/skills/prism-qa-test-plan/`](../.ai-skills/skills/prism-qa-test-plan/)

---

## Document & decide

### Eli — documentation (`prism-documentation`)

**What he does:** Writes and updates user guides and developer documentation from diffs, branch plans, or interview mode. Ships the doc PR.

**When to call:** "Eli, document this." or "Write the docs for this feature."

**Skill:** [`.ai-skills/skills/prism-documentation/`](../.ai-skills/skills/prism-documentation/)

---

### Theo — architect-doc walker (`prism-doc-walker`)

**What he does:** Walks a target directory, applies the Deletion Test to find load-bearing decisions, prompts write/skip/defer per candidate, and drafts architect docs or ADRs. State persists in `.prism/theo-state.json`.

**When to call:** "Theo, walk `src/services/`." to surface undocumented patterns.

**Skill:** [`.ai-skills/skills/prism-doc-walker/`](../.ai-skills/skills/prism-doc-walker/)

---

### Sage — changelog (`prism-changelog`)

**What he does:** Generates changelogs and release notes between git tags. Ships changelog PRs.

**When to call:** "Sage, generate the changelog for v1.2.0." or give him two version tags.

**Skill:** [`.ai-skills/skills/prism-changelog/`](../.ai-skills/skills/prism-changelog/)

---

### Lilac — standup summary (`prism-standup-summary`)

**What she does:** Generates standup summaries from recent git activity, PRs, and branch context.

**When to call:** "Lilac, standup summary for today."

**Skill:** [`.ai-skills/skills/prism-standup-summary/`](../.ai-skills/skills/prism-standup-summary/)

---

## Maintain & onboard

### Atlas — onboarding (`prism-onboarding`)

**What he does:** Detects your tech stack, asks onboarding questions, generates per-team rules from your actual code, writes `.ai-skills/config.json`, and populates stub anchors. Runs once per team install or on stack change.

**When to call:** "Atlas, onboard this repo." from inside your target codebase.

**Skill:** [`.ai-skills/skills/prism-onboarding/`](../.ai-skills/skills/prism-onboarding/)

---

### Ren — refactor scout (`prism-refactor-scout`)

**What he does:** Walks the codebase, ranks refactor candidates by strength of case, grills the chosen candidate through multiple passes, and produces a refactor plan.

**When to call:** "Ren, scout for refactor candidates in `src/`."

**Skill:** [`.ai-skills/skills/prism-refactor-scout/`](../.ai-skills/skills/prism-refactor-scout/)

---

### Zoe — cadence audit (`prism-surface-audit`)

**What she does:** Audits plans, lessons, and open decisions. Surfaces stale open decisions, plans that haven't been closed, and lessons that have fired enough to graduate to rules.

**When to call:** "Zoe, run a cadence audit." — typically at the end of a sprint or release cycle.

**Skill:** [`.ai-skills/skills/prism-surface-audit/`](../.ai-skills/skills/prism-surface-audit/)

---

### Iris — retrospective facilitator (`prism-retro`)

**What she does:** Synthesizes a multi-voice retro from a plan's history, decisions, and debugged/review issues. Only personas with evidence speak. Writes findings to `.prism/retros/`; routes action items to Nora. Read-only on source plans — never modifies them.

**When to call:** "Iris, retro this epic." or "What went well on PRISM-1234?"

**Hands off to:** Nora for any action items that warrant tickets.

**Skill:** [`.ai-skills/skills/prism-retro/`](../.ai-skills/skills/prism-retro/)

---

## Orchestration

### Sol — conductor (`prism-conductor`)

**What he does:** Goal-driven orchestration across multiple personas end-to-end. Reads `.prism/architect/manifest.json` at startup to understand the codebase shape, dispatches personas, and routes their gate-ratified verdicts. Never writes code, Linear, or merges. See [enforcement-floor.md](./ai-skills/enforcement-floor.md) for how Sol consumes gate-ratified verdicts from each dispatched persona.

**When to call:** "Sol, orchestrate this." or describe a multi-step goal.

**Skill:** [`.ai-skills/skills/prism-conductor/`](../.ai-skills/skills/prism-conductor/)

---

## Business layer

The business layer wraps the engineering pipeline at two seams: business personas produce strategy (feeding into Parker's PRD), and Tess closes the loop by measuring shipped outcomes back into the strategy doc. All business personas read and write `.prism/business/strategy.md` — the business-layer equivalent of the branch plan. See [`.prism/architect/_toolkit/business-layer.md`](../.prism/architect/_toolkit/business-layer.md) for the full model.

### Vera — founder and strategy (`prism-founder`)

**What she does:** Sets company strategy, OKRs, and cross-functional priorities. Owns the strategy doc at `.prism/business/strategy.md`. Sits above Parker on grain — the entry seam of the business layer.

**When to call:** "Vera, set our strategy." or describe an OKR, positioning, or mission question.

**Hands off to:** Parker, pointing him at the relevant `strategy.md` section as upstream PRD context.

**Skill:** [`.ai-skills/skills/prism-founder/`](../.ai-skills/skills/prism-founder/)

---

### Kora — market research (`prism-market-research`)

**What she does:** Produces competitive teardowns, TAM/segment sizing, and ICP research. Writes to the research section of `strategy.md`. Orchestrates over the `deep-research` host capability when available.

**When to call:** "Kora, competitive teardown on X." or describe a market-sizing or ICP question.

**Hands off to:** Parker as upstream PRD context.

**Skill:** [`.ai-skills/skills/prism-market-research/`](../.ai-skills/skills/prism-market-research/)

---

### Ellis — finance (`prism-finance`)

**What she does:** Produces unit economics models, pricing analysis, runway projections, and budget summaries. Writes to the finance section of `strategy.md`. Orchestrates over the `xlsx` host capability when available.

**When to call:** "Ellis, model our unit economics." or describe a pricing, runway, or budget question.

**Hands off to:** Parker as upstream PRD context.

**Skill:** [`.ai-skills/skills/prism-finance/`](../.ai-skills/skills/prism-finance/)

---

### Charlie — marketing (`prism-marketing`)

**What she does:** Produces positioning, messaging hierarchy, campaign briefs, and content briefs. Runs SEO as a mode. Writes to `strategy.md § Marketing`. Orchestrates over the `brand-voice` host capability. Marketing owns the outbound message; Sales owns pipeline mechanics.

**When to call:** "Charlie, position this product." or describe a messaging, campaign, or SEO question.

**Hands off to:** Parker as upstream PRD context.

**Skill:** [`.ai-skills/skills/prism-marketing/`](../.ai-skills/skills/prism-marketing/)

---

### Quinn — sales (`prism-sales`)

**What she does:** Produces ICP-to-pipeline qualification, proposals, outreach sequences, and objection-handling playbooks. Writes to `strategy.md § Sales`. Uses the `brand-voice` host capability for on-brand outreach. Reads Charlie's `§ Marketing` section so outreach inherits one voice.

**When to call:** "Quinn, write an outreach sequence." or describe a proposal, ICP, or objection-handling need.

**Hands off to:** Parker as upstream PRD context.

**Skill:** [`.ai-skills/skills/prism-sales/`](../.ai-skills/skills/prism-sales/)

---

### Tess — data and metrics (`prism-data`)

**What she does:** Produces funnel analysis, cohort analysis, and dashboards. Writes to `strategy.md § Metrics`. Orchestrates over the `xlsx` host capability. Closes the business loop — her default handoff is back to Vera, not forward to Parker.

**When to call:** "Tess, funnel analysis." or describe a KPI, conversion, or retention question.

**Hands off to:** Vera (loop closure — measurement flows back into strategy).

**Skill:** [`.ai-skills/skills/prism-data/`](../.ai-skills/skills/prism-data/)

---

### Remy — customer success (`prism-customer-success`)

**What she does:** Produces support playbooks, FAQs, onboarding guides, and escalation runbooks. Writes to `strategy.md § Customer Success`. Orchestrates over the `brand-voice` host capability. She reads Eli's feature docs and writes how the customer succeeds with the feature — not a second copy of the feature mechanics.

**When to call:** "Remy, support playbook for this feature." or describe an onboarding, FAQ, or escalation need.

**Skill:** [`.ai-skills/skills/prism-customer-success/`](../.ai-skills/skills/prism-customer-success/)

---

### Penny — recruiting (`prism-recruiting`)

**What she does:** Produces job descriptions, interview rubrics, and hiring-process documentation. Writes to `strategy.md § People`. Sits in the business layer below Vera on grain.

**When to call:** "Penny, write a JD for a senior engineer." or describe a hiring, rubric, or headcount question.

**Hands off to:** Parker as upstream PRD context.

**Skill:** [`.ai-skills/skills/prism-recruiting/`](../.ai-skills/skills/prism-recruiting/)

---

### Lex — legal and compliance (`prism-legal`)

**What she does:** Drafts terms of service, reviews privacy policies, and assists with contract review. Writes to `strategy.md § Legal & Compliance`. Every output carries a "not legal advice" disclaimer; she recommends licensed counsel when jurisdiction or product context is missing.

**When to call:** "Lex, draft a ToS." or describe a privacy policy, compliance, or contract-review need.

**Skill:** [`.ai-skills/skills/prism-legal/`](../.ai-skills/skills/prism-legal/)

---

## Utility skills (no persona)

These skills run in the current persona's voice — no dedicated persona. Invocation is always user-initiated.

| Skill | What it does |
|-------|-------------|
| `prism-handoff` | Compacts the session into a handoff document a fresh agent can continue from |
| `prism-review-loop` | Orchestrates self-review → fix → PR-review loops to a zero-findings pass |
| `prism-skill-forge` | Scaffolds a new PRISM skill from scratch or migrates an existing platform skill into canonical source |

---

## Going deeper

The full skill behavior for each persona lives in its skill file. The routing table — which intent maps to which persona — is in [AGENTS.md](../AGENTS.md) § Skill Auto-Routing. The skill authoring model (what stays in the skill body vs. what lives in references) is documented in [ADR-0045](../.prism/spec/adrs/_toolkit/0045-skill-content-disclosure-model.md).
