---
title: AI-native SDLC for PRISM — thin skills, artifact chains, and enforced gates
author: Hunter McGrew
status: approved
approved_by: Hunter McGrew
approved_at: 2026-10-17
ticket: https://github.com/HunterMcGrew/PRISM/issues/499
created: 2026-10-17
ports: thrive "AI-native SDLC" intent (approved 2026-09-10, revised 2026-10-05)
---

# Intent: AI-native SDLC for PRISM

## Problem

Agents build in minutes, but work still waits on people. A developer watches edits, re-reviews code, and invokes each persona by hand. PRISM ships that same shape to every team that installs it.

The skill layer mostly repeats itself. Measured on `main` on 2026-10-17:

- 33 skills, 6,977 lines of skill body. 29 of them exceed 120 lines.
- Behind those bodies: 70 reference files (50k words) and 59 step files (2.9k lines).
- Always-on rules: 19.7k words. Architect docs: 30 files, 33k words. ADRs: 71.

Thrive's audit of three of the same personas found about 50 of 1,040 lines that exist nowhere else and that a frontier model would not already know. The rest was persona voice, generic engineering method, pointers, or copies of rules and architect docs. PRISM's skills share that origin.

PRISM is also the product. Whatever shape its skills take is the shape every consumer team gets.

## Proposed outcome

Each skill does one job, in a body short enough to follow, and the PR reaches the human already clean. The developer supervises by exception: approve the intent, read the PR. Every ticket runs through a committed artifact chain (`intent.md` → `spec.md` → `plan.md` → code), and deterministic hooks enforce the policies that must always hold. A consumer gets the same system through `prism adopt` and `prism update`.

## Success criteria

In priority order, with a baseline captured before any change lands:

1. **First-pass clean PRs.** The human reviewer requires zero changes after the agent review. Preference tweaks count as clean. Domain, logic, and spec misses do not. Measured on PRISM's own PRs from GitHub.
2. **Human touches per ticket.** Two on a routine ticket: approve the intent, read the PR. A third only when the plan goes beyond its intent.
3. **Size.** Every skill body is 120 lines or less, counting what the skill loads. Always-on content is under 500 lines. `CLAUDE.md` and `AGENTS.md` hand-authored content is under 200 lines each.

Cycle time is a lagging indicator, not a target. The eval harness is rebuilt separately and is not in scope.

## Affected users and systems

- PRISM's maintainer, working on PRISM itself.
- Every consumer team on Claude Code, Codex, or Cursor, through `prism adopt` and `prism update`.
- Systems: `.ai-skills/skills/**`, `.prism/` (rules, architect docs, references, templates, plans, lessons, step files), `scripts/ai-skills/**` (build, update, doctor, hooks), `templates/install/**`, `AGENTS.md`, `CLAUDE.md`, and `docs/`.

## Decisions reached

### Order of work

Skill slimming and the umbrella-section speed bump land first, then the artifact chain, then review and verify, then the context-layer rewrite, then hooks, then the release. The order follows dependencies:

- A skill is deleted only once its replacement exists. Mira folds in when `intent` lands. The review loop goes when `REVIEW.md` and the review runners land.
- Sol, Sasha, Ren, and Theo have no replacement to wait for, so they go in the first phase.

### Skills

- Every skill passes four tests:
  - **Policy:** it encodes policy the model would not apply unprompted.
  - **Trigger:** its description fires it reliably.
  - **Length:** its body is 120 lines or less.
  - **Enforcement:** anything that must always hold is enforced by a hook or a check, not by prose.
- Content that fails the tests is cut, not moved. A line moved into a reference or step file still counts against the skill that loads it, because the cap measures what a run reads.
- Skills are function-shaped, with a verb name and no personality. Persona names stay only as trigger words in the description, so "Briar" still routes to `self-review`.
- Skill IDs keep the `prism-` prefix, so the command is `/prism-plan`, `/prism-implement`, and so on. `prism update` rewrites only `prism-*` skills, so bare verbs would collide with a consumer's own skills and with portable skills of the same name.
- Renames happen during slimming, so each skill is touched once. `main` is heading to a breaking `1.0.0` either way.
- Roster, by today's names:
  - **Engineering flow:** Clove becomes `implement`. Winston becomes `plan`, which writes `plan.md`. Briar becomes `self-review`, Eric `pr-review`, Eli `docs`, Pixel `design`, Nora `start-ticket`, and Atlas `onboard`.
  - **New:** `intent`, `spec`, and `verify`.
  - **Renamed utilities:** `devils-advocate` becomes `challenge`, which also runs the plan-challenge rounds. `tdd` keeps its name and absorbs the planned `testing` skill. `prism-skill-forge` becomes `forge-skill`. Handoff stays `handoff`.
  - **Cadence and release:** Iris becomes `retro`, Zoe `audit`, Sage `changelog`, Lilac `standup`, Reese `qa-plan`, and Parker `prd`.
  - **Business personas stay, held to the same four tests:** Vera `strategy`, Kora `market-research`, Ellis `finance`, Charlie `marketing`, Quinn `sales`, Tess `metrics`, Remy `customer-success`, Penny `recruiting`, and Lex `legal`. The strategy-doc flow is unchanged.
  - **Folded:** Mira into `intent`.
  - **Deleted:** Sol, Sasha, Ren, Theo, and `prism-review-loop`.
- `retro` (Iris) runs in every standard and epic flow, on the final branch before merge, so the durable record stays current without anyone asking:
  - It gives each Decision a verdict and promotes the lasting ones into the architect doc that owns the subject, per the writing guide's placement order.
  - It runs the lessons lifecycle: promote, expire, or merge each entry.
  - It runs a light retro per ticket and a full one per epic.
  - The PR is not ready until the retro has run. A missing `> Retro:` line on the plan is a check failure, not a reminder.
- A skill must run as a subagent only when its value comes from a cold read: `spec`, `challenge`, `verify`, and `pr-review`. Everything else runs in the session by default.

### Artifact chain

- Plan folders live at `.prism/plans/<ticket>/` and hold `intent.md`, `spec.md`, and `plan.md`. Legacy flat plans stay where they are and keep working. Lookup checks the folder first, then the flat file.
- Only the intent always needs human approval. A script records approval and needs a keypress the model cannot supply. The build gate reads it.
- The plan auto-approves inside limits: a task cap, every file inside the spec's affected systems, and no unresolved challenge. A plan outside those limits asks.
- There are three workflows:
  - **Small:** intent → build.
  - **Standard:** intent → spec → plan → build → verify → review → PR → review → reconcile → retro.
  - **Epic:** one intent and spec that cut child tickets.
  - A commit that outgrows the small limits is blocked until a spec and plan exist.
- A plan task names its files, its proof, and its dependencies. Each commit names its task IDs, and a commit hook holds the staged paths to those tasks' file lists.

### Review and verify

- One `REVIEW.md` holds the review passes, severity definitions, and what to skip, with a 200-line ceiling. `self-review` and `pr-review` both read it, and the review loop collapses into that runner sequence.
- A stop hook on the review runners reconciles the PR before they can stop. It resolves threads that were addressed, corrects labels against the verdict, and checks the PR body.
- `verify` runs once at the end, in a fresh context, and fixes nothing.

### Hooks

- Hooks constrain outcomes, never the session's tools. The new ones are the commit gate, the dispatch-brief shape gate, the stop-reconcile gate, and a secrets read gate.
- **Umbrella-section speed bump**, ported from thrive #2728 (THRN-576). The manifest gains an `umbrellas` list of broad docs, plus the always-on rules. The write gate stops an edit that adds a new heading to one of them, and the stop names the doc's load routes and the placement-order section. It fires once per session, doc, and heading, and a retry of the same edit passes. This lands in the first phase, because it finishes the placement work #492 started and depends on nothing else.
- Each hook is registered on Claude Code, Codex, and Cursor wherever the host exposes the event. A missing event is recorded as a host limitation instead of being papered over.
- Commands come from the consumer's `commands.*` config, never from PRISM's own toolchain.

### Context layer

- Rules and architect docs are rewritten from `main` under judgment-first guidance: what to do and why, with positive examples. No anti-pattern catalogs, no instructions to verify twice, nothing tuned to older models.

### Merging and release

- **Merge authority.** The main session squash-merges PRISM's own PRs once their review comes back clean with no `review:has-minors` label. This replaces Sol's authority and gets an ADR. Consumers keep the human merge gate.
- **Release.** The port ships as `1.0.0`, a clean break with a migration note. `prism update` removes the deleted skills, and old persona names keep routing through the new skills' descriptions.
- **What carries over from thrive.** Only what fits a generic toolkit. Thrive's per-worktree Docker admin, Storybook scoping, and screenshot script stay out, because they belong to thrive.

## Constraints

- An unfinished migration must not freeze routine work. Legacy flat plans keep working until the last one is archived.
- A consumer's own skills, docs, and plans are never touched by the port.
- Every always-on rule and skill keeps working on all three hosts at every merged step.

## Open questions

- **First-pass clean baseline.** Set from PRISM's recent merged PRs before slimming lands.

## Not in scope

- The eval harness.
- Auto-approving intents.
- Thrive-specific infrastructure.
- Rewriting consumers' business or user docs.
- Changing how consumers merge.
