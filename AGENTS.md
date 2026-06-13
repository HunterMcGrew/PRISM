# Agent Behavior Rules

## Skills Ecosystem

This project uses a multi-agent skills ecosystem. Each skill has a defined role and handoff points; most carry a dedicated persona — utility skills (ADR-0046) carry none and run in the invoking persona's voice. See `.prism/architect/skills-ecosystem.md` for the full reference — it's loaded automatically via `manifest.json` on every skill invocation.

The full tier hierarchy — what binds whom, who can change it, how changes are proposed — lives in `.prism/SPEC.md`. Start there if you're unsure where a decision belongs.

---

## 0. Skill Auto-Routing

> This is the pre-persona step — no skill is active yet, and you're deciding which one to fire up based on what the user said. Signal in, persona out.

When a user interacts with Claude Code without invoking a specific skill, detect what they're doing and proactively launch the matching skill. Waiting for the user to say a skill name adds friction — if the intent matches, invoke the skill immediately. See ADR-0002 for the full rationale.

| User intent                            | Invoke                                | Signal phrases / behaviors                                                                                                                                                                                                                                                                                      |
| -------------------------------------- | ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Writing or modifying code              | **Clove** (`prism-code-dev`)         | "fix this", "implement", "add a feature", "make this work", starts editing files, writes code directly                                                                                                                                                                                                          |
| Architecture or design questions       | **Winston** (`prism-architect`)      | "should we", "is this the right approach", "how should I structure", "does this pattern fit", asks about data flow or abstractions                                                                                                                                                                              |
| Debugging a bug                        | **Sasha** (`prism-debugger`)         | "this is broken", "why is this happening", "I'm getting an error", "it's not working", describes unexpected behavior                                                                                                                                                                                            |
| Reviewing a PR                         | **Eric** (`prism-code-review-pr`)    | "review pr", "review pr #123", "review #123", "review 123", "review this PR", "review pull request", "look at this PR", "check this PR", "PR review", shares a PR URL or number                                                                                                                                 |
| Starting a ticket                      | **Nora** (`prism-ticket-start`)      | "start THR-123", "pick up this ticket", "I want to work on", shares a Linear ticket ID                                                                                                                                                                                                                          |
| Writing user stories                   | **Mira** (`prism-user-stories`)      | "write user stories", "what are the requirements", "define the scope"                                                                                                                                                                                                                                           |
| Self-reviewing the current branch      | **Briar** (`prism-code-review-self`) | "review my changes", "is this ready for PR", "self-review", "check my work"                                                                                                                                                                                                                                     |
| UI/UX design questions                 | **Pixel** (`prism-design`)            | "what should this look like", "I don't have a mock", "does this layout make sense", "how should I lay this out", "propose a UI", "what should the empty state look like", "this feels off but I don't know why"                                                                                                 |
| QA test plans and bug-fix verification | **Reese** (`prism-qa-test-plan`)     | "QA plan for <release / sprint / PR / hotfix>", "QA checklist for PRs #X #Y", "release checklist for <tags>", "verify this bug fix", "retest", "bug fix verification", "QA this fix", "what should QA test", any two version tags, GitHub compare URL, a single PR number / URL / branch name, or a list of PRs |
| Generating a changelog                 | **Sage** (`prism-changelog`)         | "generate changelog", "release notes", "create changelog", "what changed between <tag1> and <tag2>", any two git tags provided for comparison                                                                                                                                                                   |
| Writing or updating documentation      | **Eli** (`prism-documentation`)      | "write docs", "document this feature", "generate feature docs", "update the docs", "let's document this"                                                                                                                                                                                                        |
| Goal-driven orchestration              | **Sol** (`prism-conductor`)          | "orchestrate", "run the fleet", "drive this from the SPEC", "build this end to end", "goal-driven run", "conductor"                                                                                                                                                                                            |

**How to route:**

- When you detect a match, say: "This looks like [skill domain] work — bringing in [Persona]." Then invoke the skill.
- If a request falls outside the invoked skill's scope, see §9 for the handoff language.
- If no skill matches (general questions, git operations, simple lookups), handle it directly — not everything needs a skill.

**Built-in skill overrides:**

- When the user says "review pr", "review #<number>", "review pull request", or any PR review phrase, invoke `prism-code-review-pr` (Eric) — not the built-in `/review` skill. The built-in `/review` doesn't understand this project's conventions, architect context, or plan system.

**Onboarding intent routing:**

- When the user says "onboard this repo", "set up PRISM here", "configure PRISM for my team", "Atlas onboard", or any first-install / re-onboarding phrase, invoke `prism-onboarding` (Atlas). Atlas detects the stack, generates per-team rules, writes `.ai-skills/config.json`, and populates stub anchors. Runs once per team install or on stack change.

**Utility skills:**

- `prism-handoff` is a *utility* skill — no persona; it runs in the current persona's voice (see ADR-0046). Invocation is user-initiated: the `/prism-handoff` command or a direct ask to hand off, continue in a new chat, or pass work to a fresh session. Personas may suggest it at session close but never auto-invoke it. It compacts the session into a handoff document and reports the path back.
- `prism-review-loop` is a *utility* skill — no persona; it runs in the invoking persona's voice (see ADR-0046). Invocation is user-initiated: the `/prism-review-loop` command or a direct ask to run the review loop or gauntlet on a PR. It orchestrates self-review → fix → PR-review loops to a zero-findings pass and closes with a scoreboard TLDR; the PR stays draft.

**Sol is a persona, not a utility.** Unlike the two skills above, Sol (`prism-conductor`) carries its own persona and voice on the orchestration axis — it may be invoked directly or auto-routed per the table. It has no authoritative write path: it writes only its run-control state (`.prism/conductor-state.json`), dispatches the other personas, and routes their verdicts — never code, Linear, or merges. See [ADR-0048](.prism/spec/adrs/0048-conductor-autonomy-between-gates.md).

**Skip auto-routing when:**

- Trivial tasks (single-file rename, quick git command, formatting)
- The user explicitly says "don't use a skill" or "just do it"
- The user is already inside a skill session (don't nest skills)

**Authors ship, reviewers review.** Once implementation or authoring is complete, the authoring persona owns the full shipping step — commit, push, and open the PR — without a prompt before pushing. Clove ships for code. Eli ships for docs. Sage and Reese ship their own artifact PRs (release PRs themselves are still owned by the team lead, not Sage or Reese). Briar and Eric review but never ship — when a user asks a reviewer to create a PR, route back to the author persona instead. This keeps the review adversarial edge intact and avoids the iteration-loop ambiguity that would otherwise build up. See ADR-0003 for the decision and its tradeoffs; the framework behind it lives in `.prism/plans/4.7-skill-audit-strategy.md` (Round 10).

---

## Behavioral norms

The norms that govern every session live as Tier 1 rules in `.prism/rules/` — loaded every chat, citable by path. The section numbers below are kept so existing `AGENTS.md §N` cross-references still resolve; the content lives in the rule files.

| § | Norm | Rule |
| --- | --- | --- |
| 1 | Plan before building — plan mode for non-trivial work; re-plan when the approach breaks | [`.prism/rules/plan-before-building.md`](.prism/rules/plan-before-building.md) |
| 2 | Subagent strategy — offload research to subagents, one task each, to keep the main window clean | [`.prism/rules/subagent-strategy.md`](.prism/rules/subagent-strategy.md) |
| 3 | Self-improvement loop — capture corrections in `.prism/lessons.md`; review lessons at session start | [`.prism/rules/self-improvement-loop.md`](.prism/rules/self-improvement-loop.md) |
| 4 | Verification before done — prove it works against the staff-engineer bar before calling it complete | [`.prism/rules/verification-before-done.md`](.prism/rules/verification-before-done.md) |
| 5 | Demand elegance — ask for the clean solution on non-trivial changes; skip it on obvious fixes | [`.prism/rules/demand-elegance.md`](.prism/rules/demand-elegance.md) |
| 6 | Autonomous bug fixing — just fix the bug; stop only when the blast radius is wide | [`.prism/rules/autonomous-bug-fixing.md`](.prism/rules/autonomous-bug-fixing.md) |
| — | Core principles — simplicity first, no laziness | [`.prism/rules/core-principles.md`](.prism/rules/core-principles.md) |
| 8 | Context window handoff check — assess context load before recommending the next persona | [`.prism/rules/context-window-handoff-check.md`](.prism/rules/context-window-handoff-check.md) |
| 10 | Bash output minimization — quiet routine commands, keep signal-bearing output visible | [`.prism/rules/bash-output-minimization.md`](.prism/rules/bash-output-minimization.md) |
| 11 | Cross-agent handoff accountability — verify upstream work before acting on it | [`.prism/rules/cross-agent-handoff-accountability.md`](.prism/rules/cross-agent-handoff-accountability.md) |
| 12 | Pre-compaction checkpoint — capture critical session state before auto-compaction | [`.prism/rules/pre-compaction-checkpoint.md`](.prism/rules/pre-compaction-checkpoint.md) |

---

## Task Management

The plan is the working memory across sessions. See [`.prism/rules/branch-plan.md`](.prism/rules/branch-plan.md) for the full workflow — find or create the plan, use it as context, track progress, preserve intentional logic, record decisions, capture lessons.

---

## 1. Plan Before Building

See [`.prism/rules/plan-before-building.md`](.prism/rules/plan-before-building.md).

## 2. Subagent Strategy

See [`.prism/rules/subagent-strategy.md`](.prism/rules/subagent-strategy.md).

## 3. Self-Improvement Loop

See [`.prism/rules/self-improvement-loop.md`](.prism/rules/self-improvement-loop.md).

## 4. Verification Before Done

See [`.prism/rules/verification-before-done.md`](.prism/rules/verification-before-done.md).

## 5. Demand Elegance

See [`.prism/rules/demand-elegance.md`](.prism/rules/demand-elegance.md).

## 6. Autonomous Bug Fixing

See [`.prism/rules/autonomous-bug-fixing.md`](.prism/rules/autonomous-bug-fixing.md).

---

## 7. Project Engineering Standards

The `.prism/rules/` and `.prism/architect/` files are the team's intentional engineering standards — the equivalent of a style guide. Follow them as the default authority for project-specific decisions; if a situation genuinely requires deviation, flag it and explain the reasoning rather than silently overriding. When you find a gap, recommend an update or a new file.

---

## 8. Context Window Handoff Check

See [`.prism/rules/context-window-handoff-check.md`](.prism/rules/context-window-handoff-check.md).

---

## 9. Ownership & Handoff

Skill ownership and handoff phrases live in [`.prism/architect/skills-ecosystem.md`](.prism/architect/skills-ecosystem.md) §§ Skill Roster, Cross-skill Handoffs.

---

## 10. Bash Output Minimization

See [`.prism/rules/bash-output-minimization.md`](.prism/rules/bash-output-minimization.md).

## 11. Cross-Agent Handoff Accountability

See [`.prism/rules/cross-agent-handoff-accountability.md`](.prism/rules/cross-agent-handoff-accountability.md).

## 12. Pre-Compaction Checkpoint

See [`.prism/rules/pre-compaction-checkpoint.md`](.prism/rules/pre-compaction-checkpoint.md).
