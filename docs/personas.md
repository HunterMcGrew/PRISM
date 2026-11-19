---
title: "PRISM Personas"
description: "What each persona does, when to call them, and what they hand off."
category: "personas"
audience: "developer-user"
last_updated: "2026-11-19"
---

# PRISM Personas

Each persona owns a domain. They read the branch plan to pick up context, do their work, and hand off to the next persona. The table below is the at-a-glance guide — the skill file for each persona (`.ai-skills/skills/<id>/`) carries the full behavior, workflows, and output format.

> [!NOTE]
> Auto-routing fires most of these automatically. If you describe an architecture question, Winston fires. If you ask for implementation, Clove fires. You can always invoke by name if you want a specific persona.

---

## Build & ship

### Winston — architect (`prism-architect`)

**What he does:** Answers approach questions in chat with a verdict, judging fit against codebase patterns, data flow, coupling, and risk. Also gives a running stage a fit verdict when it asks about a scope idea or a challenge finding. Never writes code or a plan file.

**When to call:** Before building anything non-trivial, whenever you want to know if an approach fits. "Winston, is this the right approach?" or describe an architecture question.

**Hands off to:** Back to whoever asked. A quick question needs no plan folder.

**Skill:** [`.ai-skills/skills/prism-architect/`](../.ai-skills/skills/prism-architect/)

---

### Clove — implementation (`prism-implement`)

**What she does:** Implements features, fixes, and tasks on the current branch following codebase patterns. Reads the branch plan before editing; updates it after meaningful changes. Ships the PR when the branch is ready.

**When to call:** "Clove, implement this." or describe what you want built.

**Hands off to:** Briar for self-review before opening a PR.

**Skill:** [`.ai-skills/skills/prism-implement/`](../.ai-skills/skills/prism-implement/)

---

### Sasha — debugger (`prism-debug`)

**What she does:** Diagnoses one bug. She builds a fast pass/fail feedback loop, minimizes the repro, tests ranked hypotheses one change at a time, and reports the root cause marked verified or suspected, with its evidence. She changes no file except a lessons entry, and removes her own tagged temporary logging before she reports.

**When to call:** When something is broken and nobody knows why. "Sasha, why is this happening?" or describe the unexpected behavior.

**Hands off to:** Mira, whose intent takes the diagnosis as its Problem section, so the fix runs through the chain.

**Skill:** [`.ai-skills/skills/prism-debug/`](../.ai-skills/skills/prism-debug/)

---

### Briar — self-review (`prism-self-review`)

**What she does:** Reviews the current branch by running the passes in the repo's `REVIEW.md` through subagents, and grades the acceptance criteria. Reports findings in chat and records one line per round in the branch plan's `## Review` section. Never posts to GitHub.

**When to call:** Before opening a PR. "Briar, review my changes."

**Hands off to:** Clove for fixes, then back to Briar until clean.

**Skill:** [`.ai-skills/skills/prism-self-review/`](../.ai-skills/skills/prism-self-review/)

---

### Eric — PR review (`prism-pr-review`)

**What he does:** Runs the same `REVIEW.md` passes on an open GitHub PR. Posts marked inline comments, one summary, and labels directly to the PR, resolves the threads a later commit fixed, and logs the human catches his review missed. Never approves — that's a human responsibility.

**When to call:** After the PR is open. "Eric, review PR #123."

**Hands off to:** Clove for fixes.

**Skill:** [`.ai-skills/skills/prism-pr-review/`](../.ai-skills/skills/prism-pr-review/)

---

## Plan & spec

### Nora — ticket setup (`prism-start-ticket`)

**What she does:** Picks up a ticket, confirms scope, and creates the branch. Planning is left to the plan stage. Applies the follow-up scope rule — same-scope follow-ups go into the active PR, not new tickets.

**When to call:** "Nora, start PRISM-1234." or "Pick up this ticket."

**Hands off to:** Mira for the intent on a feature or an improvement, or Clove for a bug.

**Skill:** [`.ai-skills/skills/prism-start-ticket/`](../.ai-skills/skills/prism-start-ticket/)

---

### Mira — intent (`prism-intent`)

**What she does:** Grills you one question at a time, each with a recommended answer, then writes `intent.md` into the ticket's plan folder for you to approve. Its proposed outcome and acceptance criteria take the place of user stories.

**When to call:** When starting new work, or when a plan folder has no approved intent. "Mira, write the intent for this."

**Hands off to:** The spec stage, which starts once you approve the intent.

**Skill:** [`.ai-skills/skills/prism-intent/`](../.ai-skills/skills/prism-intent/)

---

### Parker — PRD (`prism-prd`)

**What he does:** Writes product requirement documents from scratch (greenfield) or synthesizes a PRD from existing code (brownfield). Produces `.prism/prds/<slug>.md`.

**When to call:** "Parker, write a PRD for this." or describe the feature/product area.

**Hands off to:** Mira to decompose it into intents, or Nora for ticket setup.

**Skill:** [`.ai-skills/skills/prism-prd/`](../.ai-skills/skills/prism-prd/)

---

### Pixel — UI/UX design (`prism-design`)

**What she does:** Produces UI/UX designs, wireframes, and mock specs. Works in three modes: inline sketch (chat), saved design (`design.md` in the plan folder, or `.prism/design/mocks/<slug>.md` with no plan folder), and HTML mockup. Never writes production code.

**When to call:** "What should this look like?" or "I don't have a mock for this."

**Hands off to:** The spec stage for a saved design on a plan folder, where the next stage starts without asking, or `prism-intent` with no folder.

**Skill:** [`.ai-skills/skills/prism-design/`](../.ai-skills/skills/prism-design/)

---

### Reese — QA test plans (`prism-qa-plan`)

**What he does:** Writes QA test plans for releases, sprints, PRs, or hotfixes. Produces checklists that a tester can execute against the running app, and nothing else. Grading acceptance criteria belongs to the review stages.

**When to call:** "QA plan for PR #123." or "Release checklist for v1.2.0."

**Skill:** [`.ai-skills/skills/prism-qa-plan/`](../.ai-skills/skills/prism-qa-plan/)

---

## Chain stages (no persona)

These stages carry no persona and no voice. A person approves the intent and the session runs the rest, as the workflow rule lays out.

### `prism-spec` — spec stage

**What it does:** Runs as a subagent. Reads the approved `intent.md`, `design.md` when present, the routed architect docs, and the code, then writes `spec.md` with requirements, design, and the Affected systems the plan is checked against. For an epic it writes the epic spec with children and merge order.

**When it runs:** After the intent is approved. The workflow dispatches it, and no phrase routes to it.

**Skill:** [`.ai-skills/skills/prism-spec/`](../.ai-skills/skills/prism-spec/)

---

### `prism-plan` — plan stage

**What it does:** Writes `plan.md` for an approved intent and spec, as ordered tasks with files, proofs, and dependencies. Runs the challenge rounds, then approves the plan itself or asks you. With no plan folder it writes the plan in chat only.

**When to call:** "Plan this out." or "Write the plan." In a plan folder it runs on its own after the spec.

**Hands off to:** Implementation, one commit per bundle.

**Skill:** [`.ai-skills/skills/prism-plan/`](../.ai-skills/skills/prism-plan/)

---

### `prism-verify` — verify stage

**What it does:** Runs as a subagent after the build. Runs every check in `commands` of `.ai-skills/config.json`, plus a check on the rules, skills, and docs when the diff touches them, and records the results under `## Verification` in `plan.md`. It fixes nothing and grades no acceptance criterion.

**When it runs:** Once per head after the build, and again after a later commit for the checks that commit reaches. The workflow dispatches it, and no phrase routes to it.

**Skill:** [`.ai-skills/skills/prism-verify/`](../.ai-skills/skills/prism-verify/)

---

### `prism-challenge` — challenge rounds

**What it does:** Red-teams a finished plan, PRD, strategy, model, diagnosis, or approach through four passes and returns a typed verdict. It never edits what it challenges. Inside the plan stage it runs as a subagent for each challenge round, and its one edit is a round line under `## Challenge`.

**When to call:** "Devil's advocate", "poke holes in this", or "stress test this" on any finished artifact.

**Skill:** [`.ai-skills/skills/prism-challenge/`](../.ai-skills/skills/prism-challenge/)

---

## Document & decide

### Eli — documentation (`prism-docs`)

**What he does:** Writes and updates user guides and developer documentation from diffs, branch plans, or interview mode. Ships the doc PR.

**When to call:** "Eli, document this." or "Write the docs for this feature."

**Skill:** [`.ai-skills/skills/prism-docs/`](../.ai-skills/skills/prism-docs/)

---

### Sage — changelog (`prism-changelog`)

**What she does:** Generates changelogs and release notes between git tags. Ships changelog PRs.

**When to call:** "Sage, generate the changelog for v1.2.0." or give her two version tags.

**Skill:** [`.ai-skills/skills/prism-changelog/`](../.ai-skills/skills/prism-changelog/)

---

### Lilac — standup summary (`prism-standup`)

**What she does:** Generates standup summaries from recent git activity, PRs, and branch context.

**When to call:** "Lilac, standup summary for today."

**Skill:** [`.ai-skills/skills/prism-standup/`](../.ai-skills/skills/prism-standup/)

---

## Maintain & onboard

### Atlas — onboarding (`prism-onboard`)

**What he does:** Detects your tech stack, asks onboarding questions, generates per-team rules from your actual code, writes `.ai-skills/config.json`, and populates stub anchors. Runs once per team install or on stack change.

**When to call:** "Atlas, onboard this repo." from inside your target codebase.

**Skill:** [`.ai-skills/skills/prism-onboard/`](../.ai-skills/skills/prism-onboard/)

---

### Zoe — cadence audit (`prism-audit`)

**What she does:** Audits plans, plan folders, lessons, and open decisions, and checks that each `promoted to` claim in a plan names a file that holds the text. Surfaces stale open decisions, plans that haven't been closed, and lessons that have fired enough to graduate to rules. Also carries an explicit-only worktree hygiene lane that classifies every `git worktree` entry GREEN/RED/YELLOW and clears the GREEN set on one batch confirmation.

**When to call:** "Zoe, run a cadence audit." — typically at the end of a sprint or release cycle. "Zoe, clean up worktrees." for the explicit worktree hygiene lane.

**Skill:** [`.ai-skills/skills/prism-audit/`](../.ai-skills/skills/prism-audit/)

---

### Iris — retrospective facilitator (`prism-retro`)

**What she does:** Compares a plan's stated intent with the execution record (merged diffs, PR threads, CI) against a six-question charter, at a light per-ticket grain or a full epic grain. Every finding cites its evidence. Writes the report to `.prism/retros/` and offers action items to Nora. On a folder plan she is the fixed last stage: she runs after PR review without being asked, writes the Decision verdicts, the `Retro:` and `> Closed:` lines, and the lessons exits, and commits them. She also proposes a fix for each open review-miss class. On a flat plan she stays optional and read-only.

**When to call:** "Iris, retro this epic." or "What went well on PRISM-1234?"

**Hands off to:** Nora for any action items that warrant tickets.

**Skill:** [`.ai-skills/skills/prism-retro/`](../.ai-skills/skills/prism-retro/)

---

## Business layer

The business layer wraps the engineering pipeline at two seams: business personas produce strategy (feeding into Parker's PRD), and Tess closes the loop by measuring shipped outcomes back into the strategy doc. All business personas read and write `.prism/business/strategy.md` — the business-layer equivalent of the branch plan. See [`.prism/architect/_toolkit/business-layer.md`](../.prism/architect/_toolkit/business-layer.md) for the full model.

### Vera — strategy (`prism-strategy`)

**What she does:** Sets company strategy, OKRs, and cross-functional priorities. Owns the strategy doc at `.prism/business/strategy.md`. Sits above Parker on grain — the entry seam of the business layer.

**When to call:** "Vera, set our strategy." or describe an OKR, positioning, or mission question.

**Hands off to:** Parker, pointing him at the relevant `strategy.md` section as upstream PRD context.

**Skill:** [`.ai-skills/skills/prism-strategy/`](../.ai-skills/skills/prism-strategy/)

---

### Kora — market research (`prism-market-research`)

**What she does:** Produces competitive teardowns, TAM/segment sizing, and ICP research. Writes to the research section of `strategy.md`. Orchestrates over the `deep-research` host capability when available.

**When to call:** "Kora, competitive teardown on X." or describe a market-sizing or ICP question.

**Hands off to:** Parker as upstream PRD context.

**Skill:** [`.ai-skills/skills/prism-market-research/`](../.ai-skills/skills/prism-market-research/)

---

### Ellis — finance (`prism-finance`)

**What he does:** Produces unit economics models, pricing analysis, runway projections, and budget summaries. Writes to the finance section of `strategy.md`. Orchestrates over the `xlsx` host capability when available.

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

**What they do:** Produces ICP-to-pipeline qualification, proposals, outreach sequences, and objection-handling playbooks. Writes to `strategy.md § Sales`. Uses the `brand-voice` host capability for on-brand outreach. Reads Charlie's `§ Marketing` section so outreach inherits one voice.

**When to call:** "Quinn, write an outreach sequence." or describe a proposal, ICP, or objection-handling need.

**Hands off to:** Parker as upstream PRD context.

**Skill:** [`.ai-skills/skills/prism-sales/`](../.ai-skills/skills/prism-sales/)

---

### Tess — metrics (`prism-metrics`)

**What she does:** Produces funnel analysis, cohort analysis, and dashboards. Writes to `strategy.md § Metrics`. Orchestrates over the `xlsx` host capability. Closes the business loop — her default handoff is back to Vera, not forward to Parker.

**When to call:** "Tess, funnel analysis." or describe a KPI, conversion, or retention question.

**Hands off to:** Vera (loop closure — measurement flows back into strategy).

**Skill:** [`.ai-skills/skills/prism-metrics/`](../.ai-skills/skills/prism-metrics/)

---

### Remy — customer success (`prism-customer-success`)

**What they do:** Produces support playbooks, FAQs, onboarding guides, and escalation runbooks. Writes to `strategy.md § Customer Success`. Orchestrates over the `brand-voice` host capability. They read Eli's feature docs and write how the customer succeeds with the feature — not a second copy of the feature mechanics.

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

**What they do:** Drafts terms of service, reviews privacy policies, and assists with contract review. Writes to `strategy.md § Legal & Compliance`. Every output carries a "not legal advice" disclaimer; they recommend licensed counsel when jurisdiction or product context is missing.

**When to call:** "Lex, draft a ToS." or describe a privacy policy, compliance, or contract-review need.

**Skill:** [`.ai-skills/skills/prism-legal/`](../.ai-skills/skills/prism-legal/)

---

## Utility skills (no persona)

These skills run in the current persona's voice — no dedicated persona. Invocation is always user-initiated.

| Skill | What it does |
|-------|-------------|
| `prism-handoff` | Compacts the session into a handoff document a fresh agent can continue from |
| `prism-forge-skill` | Scaffolds a new PRISM skill from scratch or migrates an existing platform skill into canonical source |
| `tdd` | Utility *reference* — holds the red-green loop, the test-first rules, and the three anti-patterns (with their tells); read for its content, not invoked as a session |

---

## Going deeper

The full skill behavior for each persona lives in its skill file. The routing table — which intent maps to which persona — is in [AGENTS.md](../AGENTS.md) § Skill Auto-Routing. The skill authoring model (what a skill is, and the tests that keep it function-shaped) is documented in [ADR-0080](../.prism/spec/adrs/_toolkit/0080-skills-are-function-shaped-and-held-to-four-tests.md), as amended by [ADR-0084](../.prism/spec/adrs/_toolkit/0084-persona-skills-carry-a-short-voice.md).
