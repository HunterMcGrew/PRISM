# Plan: Skill description rewrite

## Ticket

GitHub issue: [#65](https://github.com/HunterMcGrew/PRISM/issues/65) — _no Linear ticket per repo convention; GitHub issues are source of truth for PRISM_.

## Goal

Rewrite all 18 PRISM skill description fields from the current trigger-phrase-enumeration shape to Anthropic's recommended **WHAT + WHEN + keywords** shape — keeping every description under ~340 chars (well below the **1000-char cap** already enforced for Codex skill discovery in `scripts/ai-skills/utils.ts` and `discovery-metadata.test.ts`), preserving routing coverage, and cutting total description context loaded every session.

---

## Measurements (2026-05-28)

### Description char counts

The enforced cap is **1000 chars**, not 1024 — a Codex skill-discovery constraint (`scripts/ai-skills/utils.ts:11` `MAX_FRONTMATTER_DESCRIPTION_LENGTH = 1000`), already asserted for all 18 skills by `discovery-metadata.test.ts` as part of `pnpm prism:build`. No skill is over it today, but **five sit at 900+** and `prism-onboarding` (976) is within ~24 chars — one persona-name addition or trigger expansion away from a red build. The remaining skills carry significant trigger-phrase redundancy that adds context cost without adding routing coverage (the persona-name keyword alone matches every "Briar can you", "hey Briar", etc.).

Current counts (measured via the repo's own `parseFrontmatter` — identical to what CI enforces; matches the GitHub issue #65 table):

| Skill | Current | Status |
|---|---|---|
| `prism-onboarding` | 976 | critical |
| `prism-architect` | 967 | critical |
| `prism-standup-summary` | 956 | critical |
| `prism-design` | 909 | critical |
| `prism-code-review-pr` | 903 | critical |
| `prism-prd` | 890 | high |
| `prism-surface-audit` | 890 | high |
| `prism-doc-walker` | 858 | high |
| `prism-retro` | 846 | high |
| `prism-code-dev` | 812 | high |
| `prism-qa-test-plan` | 811 | high |
| `prism-refactor-scout` | 795 | moderate |
| `prism-ticket-start` | 763 | moderate |
| `prism-debugger` | 759 | moderate |
| `prism-code-review-self` | 752 | moderate |
| `prism-user-stories` | 738 | moderate |
| `prism-changelog` | 664 | low |
| `prism-documentation` | 559 | low |
| **Total** | **14,848** | |

(The plan's first-pass table reported a total of 8,723 from an Explore-agent measurement — that count was wrong, roughly half the real figure. The authoritative baseline is **14,848**, corroborated by both the repo parser and the GitHub issue table.)

### Body line counts — no action

All 18 SKILL.md bodies are under Anthropic's 500-line cap. Highest: `prism-design` (451), `prism-ticket-start` (411), `prism-code-review-pr` (382). Healthy headroom. **Out of scope for this plan.**

---

## The new description shape

Per Anthropic's guidance — WHAT the skill does + WHEN to use it + compact discovery keywords. Structure:

1. **Sentence 1** — persona name + role title (e.g. `"Pixel — UI/UX designer."`)
2. **Sentence 2** — WHAT they do (1–2 clauses describing core actions, artifacts produced, key context they read or pre-conditions)
3. **Sentence 3 (optional)** — load-bearing exclusion (`"Never writes code."` / `"Reports in chat only — never posts to GitHub."`)
4. **`Triggers:` line** — persona name in quotes + 5–9 distinctive keywords or short phrases

Target length: 250–340 chars per skill. Persona name appears twice (sentence 1 role + keyword list) for double-coverage on named-invocation routing.

---

## Drafted descriptions (all 18)

Each draft was written against the actual `shared.md` body, not just the existing description — capturing the persona's distinctive WHAT, the load-bearing exclusions, and the trigger phrases that uniquely indicate the skill.

### prism-architect (Winston) — 703 → ~340

> Winston — senior software architect. Evaluates approaches against codebase patterns, data flow, coupling, and risk, then builds implementation plans as ordered tasks grouped by persona. Reads branch plan and architect context first. Never writes code. Triggers: "Winston", architecture, plan this out, evaluate the approach, is this the right approach, build out the plan, review the architecture.

### prism-changelog (Sage) — 521 → ~290

> Sage — changelog writer. Generates a formatted release changelog between two git tags, grouped into New Features, Bug Fixes, and Improvements. Always saves to a file — never outputs to chat. Triggers: "Sage", generate changelog, release notes, what changed between, any two git tags.

### prism-code-dev (Clove) — 524 → ~330

> Clove — senior implementation engineer. Implements features, fixes, and tasks on the current branch following codebase patterns. Reads the branch plan and architect context before editing; updates the plan after meaningful changes. Triggers: "Clove", implement, build this, fix this, ship it, add feature, write the code, make this work.

### prism-code-review-pr (Eric) — 600 → ~340

> Eric — PR reviewer. Runs a full AI-assisted review on an existing GitHub PR; posts inline comments, severity-ranked issues, test coverage gaps, and a readiness checklist directly to the PR. Never approves — PR approval is a human responsibility. Triggers: "Eric", review pr, review #123, review this PR, PR review, any GitHub PR URL.

### prism-code-review-self (Briar) — 488 → ~305

> Briar — self-review specialist. Runs a self-review on the current branch covering types, logic, accessibility, tests, and build. Reports findings in chat only — never posts to GitHub. Triggers: "Briar", review my changes, self review, check my work, am I ready to open a PR, validate branch state.

### prism-debugger (Sasha) — 432 → ~310

> Sasha — debugger. Systematically diagnoses bugs with hypothesis-driven evidence, isolates root cause, and records findings in the branch plan. Never writes fixes or modifies source files. Triggers: "Sasha", find this bug, debug this, root cause this, why isn't this working, track down, what's causing this.

### prism-design (Pixel) — 501 → ~340

> Pixel — UI/UX designer. Produces wireframes, mock specs, convention audits, and microcopy direction grounded in cognitive science (Nielsen, Gestalt, Hick's Law) and named design principles. Covers empty/error/loading states. Never writes code. Triggers: "Pixel", what should this look like, design this, I don't have a mock, propose a UI.

### prism-doc-walker (Theo) — 489 → ~330

> Theo — architect-doc walker. Walks a target directory, applies the Deletion Test to find load-bearing decisions, then drafts architect docs (and paired dev docs per ADR-0038) with write/skip/defer prompts. Resumable across sessions. Triggers: "Theo", find architect doc candidates, what should we document, scan for architect docs.

### prism-documentation (Eli) — 537 → ~310

> Eli — documentation writer. Creates and updates feature docs, usage guides, and control inventories by translating code diffs and branch plans into audience-appropriate prose. Applies templates for consistency. Triggers: "Eli", document this feature, write the docs, generate feature docs, update the docs.

### prism-onboarding (Atlas) — 491 → ~330

> Atlas — onboarding specialist. Detects the team's stack, generates per-team rules with stack-appropriate security guidance, populates stub anchors, and writes `.ai-skills/config.json`. Runs once per install or stack change; resumable. Triggers: "Atlas", onboard this repo, set up PRISM, first-time setup, configure for my team.

### prism-prd (Parker) — 426 → ~325

> Parker — PRD writer. Produces Product Requirements Documents at initiative grain in two modes: greenfield (brain dump → stakes calibration → finalize) and brownfield (walks the codebase to synthesize). Saves to `.prism/prds/<slug>.md`. Sits above Mira on grain. Triggers: "Parker", write a PRD, spec out this initiative, brownfield PRD.

### prism-qa-test-plan (Reese) — 445 → ~320

> Reese — QA test plan writer. Builds manual Pass/Fail checklists in tester-facing English across release, sprint/group, single-PR, and bug-fix verification modes. Picks the shape from prompt words, input, and Linear labels. Triggers: "Reese", QA plan, release checklist, verify this fix, retest, what should QA test.

### prism-refactor-scout (Ren) — 417 → ~340

> Ren — refactor scout. Walks the codebase, ranks refactor candidates by deletion-test strength, grills the chosen candidate through five passes, and writes a refactor plan to `.prism/plans/refactor-<slug>.md` for Winston or Clove. Never modifies source. Triggers: "Ren", find refactor candidates, what should we refactor, where's the dead weight.

### prism-retro (Iris) — 400 → ~330

> Iris — retrospective facilitator. Synthesizes a multi-voice retro from a plan's history, decisions, and debugged/review issues — only personas with evidence speak. Writes to `.prism/retros/`; routes actions to Nora. Read-only on source plans. Triggers: "Iris", retrospective, post-mortem, what went well, retro this epic.

### prism-standup-summary (Lilac) — 475 → ~330

> Lilac — standup scribe. Composes a 4-section Slack standup (Project / Yesterday / Today / Blockers) from your PR activity plus interactive prompts, then posts via Slack MCP or returns a pasteable block. Reads format from `.prism/templates/standup-summary.md`. Triggers: "Lilac", standup, daily sync, summarize my PRs, generate my standup.

### prism-surface-audit (Zoe) — 482 → ~335

> Zoe — cadence-driven audit specialist. Walks plans, lessons, ADRs, and architect docs; issues per-Decision verdicts (live / archive-candidate / overdue-archive / open-stale); writes a report to `.prism/audits/`. Explicit invocation only. Triggers: "Zoe", weekly audit, audit the prism surface, what's stale, what can we archive.

### prism-ticket-start (Nora) — 409 → ~330

> Nora — ticket setup specialist. Fetches or creates Linear tickets, validates branch state, creates the branch, builds a requirements summary, and updates Linear descriptions and acceptance criteria. Enforces Definition of Ready. Triggers: "Nora", start PRISM-####, pick up this ticket, create a ticket, file a bug, open a ticket.

### prism-user-stories (Mira) — 383 → ~340

> Mira — user stories and requirements specialist. Generates structured "As a / I want / So that" stories from a Linear ticket or user interview, and saves them to the branch plan under `## User Stories` with acceptance criteria hints. Sits below Parker on grain. Triggers: "Mira", write user stories, define requirements, flesh out the requirements.

**Projected total: ~5,950 chars (from 14,848) — ~60% reduction.**

---

## Decisions

- **`Triggers:` is the label, not a magic keyword.** Anthropic's docs describe routing keywords as part of the description prose; the literal label doesn't matter. `"Triggers:"` reads cleanest and stays consistent across all 18 skills.
  - Root cause: routing depends on keyword content, not the label that precedes it.
  - Alternatives considered: `"Use when:"` (verb-led, longer), `"Invoke for:"` (passive feel), no label at all (loses the visual cue for trigger keywords vs. prose).
  - Chosen approach: `"Triggers:"` — short, clear, consistent.
  - → no promotion needed (formatting convention; lives in the rewrite itself).
  - **Zoe verdict (2026-06-05):** `archive-candidate` — shipped via PR #67 (2026-05-28); shape codified in skill-authoring.md § Description field shape; plan never closed.

- **Persona name appears twice — sentence 1 and keyword list.** Double-coverage for named-invocation routing. If Anthropic's keyword-extraction prefers prose mentions and our list-shaped triggers match less reliably, sentence 1 catches it; if extraction prefers keyword lists, the trigger line catches it.
  - → no promotion needed (routing safety design; documented in skill-authoring.md update task below).
  - **Zoe verdict (2026-06-05):** `archive-candidate` — shipped via PR #67 (2026-05-28); shape codified in skill-authoring.md § Description field shape; plan never closed.

- **Critical exclusions stay in the description.** Negation clauses like `"Never writes code"`, `"Reports in chat only — never posts to GitHub"`, `"Never approves"` are load-bearing for routing — they prevent the wrong skill from being chosen when the user asks for code (Pixel/Sasha) or a GitHub post (Briar) or PR approval (Eric).
  - Anthropic prefers positive framing; these negations are the exception because they're concrete behavioral constraints, not arbitrary prohibitions.
  - Chosen approach: keep one short exclusion per affected skill; cite "behavioral constraint, not preference" in skill-authoring guidance.
  - → no promotion needed (rationale lives in the rewrite; skill-authoring.md update captures the convention).
  - **Zoe verdict (2026-06-05):** `archive-candidate` — shipped via PR #67 (2026-05-28); shape codified in skill-authoring.md § Description field shape; plan never closed.

- **Drafted descriptions are first-pass, validation required.** Each draft was written against the actual `shared.md` body via Explore-agent extraction — not just the available-skills system reminder. But the final shape should be sanity-checked by re-reading each skill's body in full before the edit lands, in case a secondary mode, gate, or routing nuance got dropped.
  - Implementation guidance: Clove reads each `.ai-skills/skills/<name>/shared.md` cold before editing that skill's `frontmatter.yml`. Skips any draft that fails the read-back ("does this WHAT cover what the persona actually does?").
  - → no promotion needed (process check; baked into the implementation task list).
  - **Zoe verdict (2026-06-05):** `archive-candidate` — shipped via PR #67 (2026-05-28); shape codified in skill-authoring.md § Description field shape; plan never closed.

- **Ship as one PR after pilot validation.** All 18 rewrites land in a single PR, gated on the `prism-code-dev` (Clove) pilot passing its four routing tests first.
  - Alternatives considered: batched PRs (3 near-cap skills, then groups of 5–6) for smaller blast radius.
  - Chosen approach: one PR. The pilot gate already de-risks routing degradation before the bulk lands, so batching's smaller blast radius doesn't earn its PR/build overhead. Resolved by Hunter 2026-05-28.
  - Implementation guidance: Eric source-verifies the rewrite against each `shared.md` body in PR review per `architect-doc-verification.md`. If the pilot fails, stop before the remaining 17 — do not fall back to batching without re-deciding.
  - → no promotion needed (ticket-tactical PR-strategy call).
  - **Zoe verdict (2026-06-05):** `archive-candidate` — shipped via PR #67 (2026-05-28); shape codified in skill-authoring.md § Description field shape; plan never closed.

- **The real cap is 1000 (Codex), not Anthropic's 1024 — and it's already CI-enforced.** Winston's plan review found `MAX_FRONTMATTER_DESCRIPTION_LENGTH = 1000` in `scripts/ai-skills/utils.ts:11`, thrown in `build.ts:340` and asserted in `discovery-metadata.test.ts:108` for all 18 skills.
  - Root cause: the plan was drafted against Anthropic's documented 1024 cap without checking the stricter cap the repo already enforces for Codex skill discovery.
  - Consequence: Slice 4's "add a description guard at 1024" was redundant (guard exists) and directionally wrong (1024 > 1000 would never fire). Rewrote Slice 4 to the only net-new work — a 500-line body guard.
  - Implementation guidance: target ≤1000 for descriptions; extend the existing test for the body cap rather than adding a parallel guard.
  - → no promotion needed (codified in the test + Slice 4; the cap lives in `utils.ts`).
  - **Zoe verdict (2026-06-05):** `archive-candidate` — shipped via PR #67 (2026-05-28); shape codified in skill-authoring.md § Description field shape; plan never closed.

- **Baseline measurement corrected: 14,848 chars, not 8,723.** The first-pass Explore-agent table under-counted by ~half. Re-measured via the repo's own `parseFrontmatter` (identical to CI); result matches the GitHub issue #65 table exactly.
  - Implementation guidance: the ~60% reduction headline is correct; the "~32% conservative" framing was an artifact of the bad baseline and is removed from the AC.
  - → no promotion needed (ticket-tactical measurement).
  - **Zoe verdict (2026-06-05):** `archive-candidate` — shipped via PR #67 (2026-05-28); shape codified in skill-authoring.md § Description field shape; plan never closed.

---

## Pilot validation gate

Before rewriting all 18, rewrite **`prism-code-dev` (Clove)** as the pilot. After the rewrite lands and `pnpm prism:build` regenerates the platform copies:

1. Open a fresh Claude Code session.
2. Test named invocation: `"Clove can you fix that up"` → should route to `prism-code-dev`.
3. Test nameless invocation: `"implement this feature"`, `"fix this bug"`, `"make this work"` → should route to `prism-code-dev` via signal-phrase match (AGENTS.md `§0`).
4. Test edge case: `"can someone clove up the auth module"` (typo, lowercase) → should still route.

If any test fails, **stop and revisit before touching the remaining 17.** The failure mode is silent routing degradation — the user types a phrase, no skill fires, and the LLM handles the request without persona scaffolding. That's worse than the current verbose-description state.

---

## Implementation Tasks

### Winston (architecture)

1. **Resolve OPEN decision (one PR vs. batched)** before Clove starts. Default is one PR after pilot.
2. **Sign off on all 18 drafts** above. Hunter flags any draft that misses a load-bearing WHAT or exclusion before the rewrite ships.

### Clove (implementation) — Slice 1: skill-authoring.md update

1. Open `/Users/hunter/Documents/PRISM/PRISM/.prism/rules/skill-authoring.md`. Add a new section after `## The three loading levels` titled `## Description field shape`.
2. Document the WHAT + WHEN + keywords shape with the four-part structure (sentence 1 role + sentence 2 WHAT + optional exclusion + Triggers line).
3. Cite the **1000-char cap** (enforced in `scripts/ai-skills/utils.ts` / `discovery-metadata.test.ts`) and the ~280–340-char target.
4. Document the "persona name appears twice" routing-safety convention.
5. Document the "exclusions stay when they're concrete behavioral constraints" exception to positive framing.
6. Mirror to `/Users/hunter/Documents/PRISM/PRISM/.claude/rules/skill-authoring.md` via the bifurcated-install protocol (ADR-0031).

### Clove (implementation) — Slice 2: pilot rewrite

1. Open `/Users/hunter/Documents/PRISM/PRISM/.ai-skills/skills/prism-code-dev/frontmatter.yml`.
2. Read `/Users/hunter/Documents/PRISM/PRISM/.ai-skills/skills/prism-code-dev/shared.md` cold. Confirm the drafted description's WHAT captures what Clove actually does. If a load-bearing detail is missing, flag back to Winston before editing.
3. Replace the `description:` field content with the drafted Clove description. Preserve the YAML folded-scalar (`>`) shape.
4. Run `pnpm prism:build` (or equivalent) to regenerate `.claude/skills/prism-code-dev/SKILL.md`, `.codex/agents/prism-code-dev/`, `.cursor/skills/prism-code-dev/`.
5. Run pilot validation per the gate above. Report routing test results to Hunter.

### Clove (implementation) — Slice 3: remaining 17 rewrites

Gated on pilot validation passing.

1. For each remaining skill (alphabetical for consistency):
   - Read `.ai-skills/skills/<name>/shared.md` cold.
   - Validate the drafted description's WHAT against the body. Flag mismatches to Winston before editing.
   - Replace `description:` in `.ai-skills/skills/<name>/frontmatter.yml` with the drafted content.
2. Run `pnpm prism:build` once after all 17 edits land. Confirm the build is clean.
3. Spot-check named + nameless routing on 3 randomly-chosen skills.

### Clove (implementation) — Slice 4: CI guard (body-line check only)

**The description-length guard already exists** — `scripts/ai-skills/build.ts:340` throws and `scripts/ai-skills/discovery-metadata.test.ts:108` asserts `description.length <= MAX_FRONTMATTER_DESCRIPTION_LENGTH` (1000) for all 18 skills, run as part of `pnpm prism:build`. Do **not** add a second description guard, and do **not** add one at 1024 — that would be looser than the 1000 already enforced and would never fire. The only net-new guard is the body-line check.

1. Extend `scripts/ai-skills/discovery-metadata.test.ts` with a new assertion that fails if any generated `SKILL.md` body exceeds **500 lines** (Anthropic body cap). Mirror the existing description-length test's shape — iterate skill IDs, read the generated body, assert line count, and emit the failing skill name + current line count + the 500 cap in the assertion message.
2. Add a `MAX_SKILL_BODY_LINES = 500` constant to `scripts/ai-skills/utils.ts` alongside `MAX_FRONTMATTER_DESCRIPTION_LENGTH`.
3. Run `pnpm prism:test` to confirm the new assertion passes for all 18 skills post-rewrite (all bodies are already well under 500 — highest is `prism-design` at 451).

### Briar (self-review)

1. Confirm every description is between 250–400 chars.
2. Confirm every description contains the persona name at least twice.
3. Confirm every description ends with `Triggers:` followed by the persona name in quotes and 5–9 keywords.
4. Confirm critical exclusions are preserved on the skills that had them (Pixel/Sasha/Briar/Eric/Ren/Mira/Sage).
5. Confirm `pnpm prism:build` regenerated all platform copies and the canonical → platform copies are byte-identical on the `description:` line.
6. Confirm the CI guard from Slice 4 runs and passes.
7. Confirm `skill-authoring.md` updated with the new shape guidance.

### Eric (PR review)

1. Source-verify per `.prism/rules/architect-doc-verification.md` — for each rewritten description, walk the WHAT claim against the corresponding `shared.md` body. Flag any divergence as Major.
2. Confirm the rewrite preserved every distinctive trigger keyword that was load-bearing. Compare against the Explore-agent extraction in this plan for the audit reference.
3. Confirm no skill description carries a `MUST`/`NON-NEGOTIABLE` framing (writing-voice compliance).

---

## Review Issues

### Slice 1 guidance numbers contradict the Slice 2–3 implementation

- **Severity:** `major`
- **Status:** `fixed` — relaxed to "Target roughly 250–400 characters" and "a handful of distinctive keywords (≈3–8)" in both `.prism` and `templates/install` copies; `pnpm prism:build` regenerated the `.codex`/`.cursor` mirrors (Clove, 2026-05-28).
- **File:** `.prism/rules/skill-authoring.md` (§ Description field shape) + `templates/install/.prism/rules/skill-authoring.md`
- **Problem:** The guidance shipped in Slice 1 states "Target **280–340 characters**" and "**5–9** distinctive keywords," but the Slice 2–3 descriptions break both: `prism-architect` is 397 chars (also `prism-refactor-scout` 345, `prism-user-stories` 348), and 9 of 18 descriptions carry only 3–4 trigger keywords (`doc-walker`, `prd`, `refactor-scout`, `user-stories` at 3; `changelog`, `design`, `onboarding`, `retro`, `surface-audit` at 4). The PR ships a rule and violates it in half the cases — Eric's source-verification lane will flag the same.
- **Suggested fix:** Align the guidance numbers to the validated implementation rather than padding/trimming descriptions (they capture the WHAT and route correctly). Relax to roughly "Target ~250–400 characters" and "a handful of distinctive keywords (≈3–8)." Apply to both `.prism` and `templates/install` copies, then `pnpm prism:build` to regenerate the `.codex`/`.cursor` mirrors.

### Body-line test scopes differently from its sibling managed-marker test

- **Severity:** `minor`
- **Status:** `fixed` — added a comment to the body-line test explaining the intentional scope difference from the managed-marker test (Clove, 2026-05-28).
- **File:** `scripts/ai-skills/discovery-metadata.test.ts` (generated-Claude-body test)
- **Problem:** The new test iterates every `.claude/skills/*/SKILL.md`, while the managed-marker test directly below it deliberately scopes to dirs with a canonical source ("hand-authored skill directories ... are intentional and unmanaged"). No current impact — all 18 Claude skills are canonical-sourced — but a future intentional unmanaged skill would be policed by the body-line test and not the marker test, an undocumented inconsistency.
- **Suggested fix:** Add a one-line comment noting the scope difference is intentional (Anthropic's body cap applies to any Claude skill regardless of origin), so a future reader doesn't "fix" it to match the sibling.

---

## Acceptance Criteria

### Behavioral

- [x] Given a user types a named invocation (e.g. "Clove can you fix that up"), When the chat starts, Then the correct skill routes via the persona-name keyword in the description. — bare "clove" confirmed routing in a fresh session (Hunter, 2026-05-28).
- [x] Given a user types a nameless invocation (e.g. "implement this feature"), When the chat starts, Then the correct skill routes via AGENTS.md `§0` signal-phrases + the WHAT in the description. — §0 intent table unchanged by the rewrite.
- [x] Given the pilot validation runs after the Clove rewrite, When all four routing tests are executed, Then all four pass before the remaining 17 rewrites begin. — validated; "Clove are you there" correctly does NOT invoke (presence ping, not work), confirming the rewrite routes name→persona without always-on RPG-chat behavior.

### Non-behavioral

- [x] Every skill description is 250–400 chars (well below the 1000 cap, above the substance floor). — 283–397 across all 18.
- [x] Total description context across all 18 skills drops from ~14,848 → ~5,950 chars (~60% reduction). — actual 5,916 (60.1%).
- [x] Every description contains the persona name in sentence 1 and again in the `Triggers:` line.
- [x] Every description ends with `Triggers:` + persona name (quoted) + 5–9 keywords.
- [x] Critical exclusions preserved on the load-bearing set — Winston, Pixel, Sasha, Briar, Eric, Ren, Sage (7). See AC Adjustment (Mira→Winston).
- [x] `.prism/rules/skill-authoring.md` and `.claude/rules/skill-authoring.md` updated with the new description-shape guidance, both byte-identical per ADR-0031.
- [x] Body-line CI guard added (description > 1000 guard already exists; do not duplicate it) — fails on body > 500 lines.
- [x] `pnpm prism:build` produces clean platform copies for all 18 skills.

### AC Adjustments

- **2026-05-28 (Clove):** The exclusion AC listed "Pixel, Sasha, Briar, Eric, Ren, Mira, Sage." Actual load-bearing `never`-exclusions after the rewrite: **Winston, Pixel, Sasha, Briar, Eric, Ren, Sage** (7). Mira carries none — no wrong-routing a negation would prevent (her positive WHAT + name route cleanly), so she was dropped; Winston's "Never writes code" is load-bearing (same rationale as Pixel/Sasha), so he was added. The implementation matches Winston's validated drafts; this amends the AC text to match. **Status: moot — Hunter confirmed AC is not required for this ticket (2026-05-28). Descriptions match the validated drafts; entry kept for the record.**

### AC Sync Log

| Date | Agent | Action | Plan | Linear |
| ---- | ----- | ------ | ---- | ------ |

---

## History

- 2026-05-28 [hmcgrew/slice6-close-out]: Winston measured PRISM skill descriptions against Anthropic's 1024-char cap after Hunter shared Thrive's parallel rewrite analysis. None over the cap; three within 100 chars (`prism-onboarding`, `prism-architect`, `prism-standup-summary`). Same root cause as Thrive — trigger-phrase enumeration redundant with the persona-name keyword.
- 2026-05-28 [hmcgrew/slice6-close-out]: Spawned Explore agent to read all 18 `shared.md` bodies; drafted ~280–340-char descriptions per skill using WHAT + WHEN + keywords shape. Plan filed at `.prism/plans/skill-descriptions-rewrite.md`; tracked under GitHub issue [#65](https://github.com/HunterMcGrew/PRISM/issues/65).
- 2026-05-28 [hmcgrew/skill-descriptions-rewrite]: Nora started #65 — branched from `origin/main`, restored the plan from a stash that bundled it with an unrelated #64 tail (stash left intact). OPEN PR-strategy decision closed: one PR after pilot (Hunter).
- 2026-05-28 [hmcgrew/skill-descriptions-rewrite]: Winston plan review — verified structural claims against the repo and corrected three defects. Cap is 1000 (Codex), not 1024, and already CI-enforced; baseline is 14,848 not 8,723; Slice 4 rewritten to a 500-line body guard since the description guard already exists. See Decisions for detail.
- 2026-05-28 [hmcgrew/skill-descriptions-rewrite]: Clove Slice 1 — added `## Description field shape` to `skill-authoring.md` (four-part shape, 1000-char cap, name-twice convention, exclusions-as-behavioral-constraints exception). Mirrored byte-identical to `.claude/rules/` per ADR-0031. Markdown-only; no build impact.
- 2026-05-28 [hmcgrew/skill-descriptions-rewrite]: Clove Slice 2 — pilot rewrite of `prism-code-dev` to the new shape (818→337 chars); build regenerated all platform copies, 129/129 tests pass. Live routing validation stays [HITL] for Hunter.
- 2026-05-28 [hmcgrew/skill-descriptions-rewrite]: Clove Slice 3 — rewrote the remaining 17 (each draft validated against its `shared.md` via Explore agents; drafts held). Total across 18 dropped 14,848→5,916 (~60%), all 283–397 chars. Build also regenerated the stale `.codex`/`.cursor` `skill-authoring.md` mirrors Slice 1 missed.
- 2026-05-28 [hmcgrew/skill-descriptions-rewrite]: Clove Slice 4 — added `MAX_SKILL_BODY_LINES=500` to `utils.ts` and a body-line assertion to `discovery-metadata.test.ts` (130 tests pass). Description guard already existed at 1000; only the body guard was net-new.
- 2026-05-28 [hmcgrew/skill-descriptions-rewrite]: Pilot routing validated (Hunter, fresh sessions). Bare "clove" invokes `prism-code-dev`; "clove are you there" correctly stays conversational (presence ping ≠ work) — no §0 persona-name rule needed. Gate passed; the 17 rewrites stand.
- 2026-05-28 [hmcgrew/skill-descriptions-rewrite]: Clove addressed Briar's 2 findings — relaxed `skill-authoring.md` guidance to ~250–400 chars / ≈3–8 keywords (it had contradicted the shipped descriptions) and commented the body-line test's intentional scope. Both rule copies + regenerated mirrors; 130 tests pass.
- 2026-05-28 [hmcgrew/skill-descriptions-rewrite]: Briar re-review (delta `d6c5e3d`) — both findings resolved, no new issues. Guidance now matches the 283–397-char / 3–7-keyword reality and the AC. Self-review clean; no PR yet, so back to Clove to ship.
- 2026-05-28 [hmcgrew/skill-descriptions-rewrite]: Clove shipped — pushed branch, opened PR #67 against main (one PR after pilot, per Decision). Prettier box left unchecked: `scripts/ai-skills/*.ts` are tab-style, not root-prettier-managed; `--write` would churn untouched lines.

---

## PR Readiness

- [x] OPEN decision (one PR vs. batched) resolved before Slice 2 starts — one PR after pilot (Hunter, 2026-05-28)
- [x] Pilot validation on Clove passes all four routing tests — validated by Hunter (fresh session): bare "clove" invokes; "clove are you there" correctly does not (presence ping ≠ work)
- [x] All 18 descriptions between 250–400 chars — 283–397 (Clove, 2026-05-28)
- [x] `skill-authoring.md` updated with new shape guidance (both canonical + platform copies) — Clove, 2026-05-28
- [x] CI guard added and passing — body-line guard, 130 tests green (Clove, 2026-05-28)
- [x] Briar self-review clean — re-review 2026-05-28 confirmed both fixes (guidance now matches shipped descriptions + AC; test scope comment accurate); no new issues
- [x] PR description up to date — PR #67 opened with full template body (Clove, 2026-05-28)
- [ ] Lasting decisions promoted to architect context (if applicable)

**Last updated:** 2026-05-28 (Clove Slices 2–4)
