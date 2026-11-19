---
title: Port the personas — Voice blocks, the cap allowance, the unique-name check, and prism-debug
ticket: https://github.com/HunterMcGrew/PRISM/issues/537
stage: plan
status: approved
approved_by: Hunter McGrew
approved_at: 2026-11-19
---

Child 7 of the Kitchen Line epic (#499). The design comes from the epic spec on `main`, at `.prism/plans/prism-499/spec.md`. These parts apply:

- the Children table row 7
- the Personas section of its Design, plus the Skill ID map rows for `prism-debug` and `prism-pr-review`
- the Swaps that apply everywhere
- the Merge order, which puts this child after child 6 so each rewritten skill gets its Voice block once
- the Decision "Voice returns, reversing part of ADR-0080"

The thrive reference is TracTru/thrive at `db3570975431fa1d6114cc5f4170c126f6be7e97`. Read a thrive file with `gh api "repos/TracTru/thrive/contents/<path>?ref=db3570975431fa1d6114cc5f4170c126f6be7e97" -q .content | base64 -d`. The files this plan ports from:

- `.ai-spec/adrs/0054-persona-skills-carry-a-short-voice.md`, the Voice shape
- `scripts/verify-artifacts.mjs` and `scripts/verify-artifacts.test.mjs`, the 16-line Voice allowance (`stripVoice`, `VOICE_LINE_ALLOWANCE`)
- `scripts/ai-skills/sync.ts` (the `personaClaimants` check) and its case in `scripts/ai-skills/sync-error-paths.test.ts`
- `.ai-skills/skills/thrive-debugger/shared.md` and `frontmatter.yml`
- the `## Voice` block of each thrive skill named in T3, T4, and T10

**Goal:** every persona skill reads as its persona again in chat, through one short `## Voice` block the loaded-lines cap does not charge for its first 16 lines. The build refuses two roles with one persona name. Sasha returns as `prism-debug`, a diagnosis-only skill that the broken-behavior phrases route to.

## Tasks

Groups from `node scripts/ai-skills/hooks/plan/bundles.mjs .prism/plans/prism-537/plan.md` on the draft:

- Group 1: T1
- Group 2: T2
- Group 3: T8

These are the first wave, the open tasks with no unfinished dependency. Later waves follow the `depends on` fields: T3, T4, and T5 after T1; T6 after T3 to T5; T7 after T6; T9 after T7; T10 after T1, T2, and T6; T11 after T10; T12 after T7 and T10; T13 after T9 and T10. Rerun the script after any task change and replace the groups with what it prints.

T1 to T9 are part 1 of a two-PR stack, and T10 to T13 are part 2. The Decisions record the cut.

Every task is Clove's except T9 and T13, which are Eli's. These conventions hold for every task.

**Precondition.** Children 2 to 6 are merged to `main` (#516, #519, #520, #522, #530). Start the build with `git merge origin/main`. Every file and symbol below was checked present on `main` at `8cb24c49` on 2026-11-19. Stop and report the build as blocked if a later `main` drops one:

- `measureSkillLoad`, `countLines`, and `BODY_FILES` in `scripts/ai-skills/lib/skill-loaded-lines.ts`, and an empty `OVER_CAP_ALLOWLIST` in `scripts/ai-skills/skill-loaded-lines.test.ts`
- `buildRoleMap` in `scripts/ai-skills/generate-skills.ts`, called by `scripts/ai-skills/build.ts`
- `AGENTS_MD_LEAD_RULES` and `measureLeadSectionEnds` in `scripts/ai-skills/agents-md-block.ts`
- ADRs 0079, 0080, and 0083 in `.prism/spec/adrs/_toolkit/`, with 0083 the highest number
- 24 roles in `.ai-skills/definitions/roles.json` that carry a `persona`, none of them with a `## Voice` heading in its `shared.md`

**Measured on `8cb24c49`.**

- The `AGENTS.md` lead set ends at byte 31,737, the end of `pre-compaction-checkpoint.md`. `skill-routing.md` is the second lead rule and ends at byte 19,032. Only T10 edits a lead rule.
- No skill is on the over-cap allowlist. The persona skills nearest the cap load `prism-docs` 117, `prism-pr-review` 116, `prism-start-ticket` 116, `prism-retro` 118, and `prism-intent` 113 lines. A Voice block of 16 lines or fewer adds nothing to those totals once T1 lands, which is why T3 to T5 wait on it.
- `prism-forge-skill` loads 119 lines and cites `.prism/architect/guides/writing-a-skill.md`, so T8 keeps that guide's line count unchanged.

**The Voice block.** This is the shape from thrive's ADR-0054, as ADR-0084 (T7) records it. A persona skill's `shared.md` holds exactly one `## Voice` heading, and it is the first line of the file that starts with `## `. Insert the block, followed by one blank line, immediately before the line that was the file's first `## ` heading. That leaves the job statement and any `<!-- atlas:... -->` anchor block above it. The section, top to bottom, with one blank line between parts:

1. The `## Voice` heading.
2. The identity line: `You are **<Persona>** (<pronouns>), ...`
3. An optional scene line.
4. The tone line, starting `**Tone, in chat`.
5. Three or four signature lines, each starting `- `.
6. One greeting line that names an example greeting and ends with a sentence telling the skill to skip it when it runs as a subagent.

A block in this shape runs 12 to 15 lines with its heading and trailing blank, inside the 16 the cap skips. The block holds no rule: a line that restates a rule from the body stays out, because two copies of a rule drift.

**Thrive's blocks are ported, not rewritten.** For a persona thrive has, copy the lines from `## Voice` through the greeting line from the thrive skill named in the task. Change only these:

- `thrive's architect` becomes `the team's architect` (Winston).
- `the retrospective facilitator for thrive` becomes `the retrospective facilitator for the team` (Iris).
- `thrive's debugger` becomes `the team's debugger` (Sasha).

For the personas thrive has no skill for, T5 gives the full text.

**Batteries.** No skill gains a pointer to `.prism/rules/session-orientation.md`. T4 removes the one that exists, in `prism-retro`. The Decisions give the reason.

**Generated output.** Every task that edits a skill, rule, architect doc, ADR, or `roles.json` runs `pnpm prism:build` and commits what the build writes from its sources. The files list names the expected copies. Add any other copy the build writes from these sources to the same commit and name it in `## History`. Check with `git status -s` after the build.

- A persona skill's copies are `.claude/skills/<id>/SKILL.md`, `.cursor/skills/<id>/SKILL.md`, `.claude/agents/<id>.md`, and `.codex/agents/<id>.toml`. A new skill also gets `.claude/skills/<id>/.ai-skill-generated` and `.cursor/skills/<id>/.ai-skill-generated`.
- A rule's copies are `.claude/rules/<name>.md`, `.codex/rules/<name>.md`, and `.cursor/rules/<name>.mdc`. A lead rule also lands in `AGENTS.md`.
- An architect doc or ADR has a copy at the same path under each of `.claude/`, `.codex/`, and `.cursor/`.
- The seed twin is `templates/install/.prism/<path>`. The build writes it for a file `.ai-skills/definitions/seed-curation.json` does not list. Edit it by hand when that file lists the path as `curated`. A path listed as `excluded` has no twin.

**Naming the source repo.** `pnpm prism:build` runs a literal guard over the `.claude/`, `.codex/`, and `.cursor/` copies of skills and ADRs, and it fails on `Thrive`, `TracTru/thrive`, `tractru`, and `thrive.` followed by a key. So any text this child writes into a skill or ADR names the source repo only as lowercase `thrive`, never capitalized and never with its org, and never with a period straight after it. Adding entries to `.ai-skills/definitions/literal-allowlist.json` is not the fix.

**Commits.** This is a folder-plan branch, so one bundle is one commit, per `git-conventions.md`. The subject is `T<n>: <summary>`, `T<a>-T<b>: <summary>`, or `T<a>,T<b>: <summary>`, made with `node scripts/ai-skills/hooks/plan/commit.mjs "<subject>" <paths>`. Plan edits commit as `plan: <summary>`. The stage skills commit and never push. The session's PR stage pushes.

**Skill line budgets.** Every skill this child writes or edits stays at or under the 120-line soft cap that `scripts/ai-skills/skill-loaded-lines.test.ts` enforces, with no allowlist entry. Measure each touched skill with `measureSkillLoad` after the build, and record each total in `## History`.

### T1: Skip the first 16 lines of each Voice section in measureSkillLoad

- files: scripts/ai-skills/lib/skill-loaded-lines.ts, scripts/ai-skills/skill-loaded-lines.test.ts
- proof: pnpm exec tsx --test scripts/ai-skills/skill-loaded-lines.test.ts
- proof fails on main: yes
- depends on: none

Owner: Clove. Port thrive's `stripVoice` from `scripts/verify-artifacts.mjs` into `scripts/ai-skills/lib/skill-loaded-lines.ts`.

- **Constant.** Add `const VOICE_LINE_ALLOWANCE = 16;` beside `BODY_FILES`, with a one-line comment naming ADR-0084.
- **`stripVoice(text: string): string`,** a module-private function, ported line for line. A line that starts with `## ` sets the counter to 0 when the line, with trailing whitespace trimmed, is exactly `## Voice`, and to -1 otherwise. While the counter is 0 or more, each line raises it by one and is dropped while the counter is 16 or less. So the heading is line 1 of the allowance, a `### ` line stays inside the section, and the section runs to the next `## ` line. Its JSDoc says it drops the first 16 lines of each `## Voice` section, per ADR-0084, so a section that grows past the allowance counts again.
- **Where it applies.** Only the body files. In `measureSkillLoad`, `bodyLines` becomes the sum over `bodyFiles` of `countLines(stripVoice(<file text>))`. Cited files are counted as they are today, with no Voice skip. `listCitedFiles` still reads the unstripped body, so a citation inside a Voice block is still followed.
- **`SkillLoad.bodyLines`** keeps its name and now holds the charged count. Add one sentence to the `measureSkillLoad` JSDoc: the first 16 lines of each `## Voice` section in a body file are not counted.
- **The test file's header comment** gains one sentence after its first paragraph: "The first 16 lines of each `## Voice` section in a skill body are not counted, per ADR-0084."

Add three cases under `// --- The measurement ---`, built with `withTempRepo` and `writeRepoFile` like the cases already there:

- **"measureSkillLoad charges nothing for a Voice block of 16 lines or fewer"**. `shared.md` is `"Job.\n## Voice\n"`, then 10 lines of `"line\n"`, then `"## Run\n"` and 5 lines of `"line\n"`. The Voice section is 11 lines, so `bodyLines` is 1 + 1 + 5 = 7.
- **"measureSkillLoad charges each Voice line past the sixteenth"**. Same shape with 19 lines of `"line\n"` after `## Voice`. The section is 20 lines, so `bodyLines` is 1 + 4 + 1 + 5 = 11.
- **"measureSkillLoad skips only a heading that is exactly ## Voice"**. Same shape as the first case with the heading `## Persona`. `bodyLines` is 18, every line counted.

The first two are the two halves of AC-2. They fail on `main`, which counts every line.

### T2: Fail the build when two roles share a persona name

- files: scripts/ai-skills/generate-skills.ts, scripts/ai-skills/discovery-metadata.test.ts
- proof: pnpm exec tsx --test scripts/ai-skills/discovery-metadata.test.ts && pnpm run prism:build
- proof fails on main: yes
- depends on: none

Owner: Clove. Port thrive's `personaClaimants` check from `scripts/ai-skills/sync.ts` into `buildRoleMap` in `scripts/ai-skills/generate-skills.ts`.

- Before the `for` loop, declare `const personaClaimants = new Map<string, string>();`.
- Inside the loop, after the routing check and before `roleMap.set(role.id, role)`, add:
  - when `role.persona` is set, `const personaKey = role.persona.toLowerCase();`
  - when `personaClaimants` already has `personaKey`, throw `Persona '${personaKey}' is claimed by both '${firstClaimant}' and '${role.id}' in .ai-skills/definitions/roles.json — a persona name is its skill's trigger word, so each must be unique.`
  - otherwise `personaClaimants.set(personaKey, role.id)`
- The JSDoc of `buildRoleMap` gains one sentence: two roles may not share a persona name, compared without case, because the name is the skill's trigger word.

Only persona roles carry a `persona`, since the existing check already throws on a utility or agent that has one.

In `scripts/ai-skills/discovery-metadata.test.ts`, after "buildRoleMap rejects an unrecognized routing value", add **"buildRoleMap rejects two roles that share a persona name, ignoring case"**. It builds `{ id: "first-skill", persona: "Twin", routing: "auto" }` and `{ id: "second-skill", persona: "twin", routing: "auto" }` and asserts `buildRoleMap` throws `/Persona 'twin' is claimed by both 'first-skill' and 'second-skill'/`. `build.ts` calls `buildRoleMap`, so this throw fails `pnpm prism:build`. The proof's build run shows today's `roles.json` passes.

### T3: Port thrive's Voice blocks into the ticket-flow personas

- files: .ai-skills/skills/prism-architect/shared.md, .ai-skills/skills/prism-intent/shared.md, .ai-skills/skills/prism-implement/shared.md, .ai-skills/skills/prism-pr-review/shared.md, .ai-skills/skills/prism-self-review/shared.md, .ai-skills/skills/prism-design/shared.md, .ai-skills/skills/prism-docs/shared.md, .claude/skills/prism-architect/SKILL.md, .cursor/skills/prism-architect/SKILL.md, .claude/agents/prism-architect.md, .codex/agents/prism-architect.toml, .claude/skills/prism-intent/SKILL.md, .cursor/skills/prism-intent/SKILL.md, .claude/agents/prism-intent.md, .codex/agents/prism-intent.toml, .claude/skills/prism-implement/SKILL.md, .cursor/skills/prism-implement/SKILL.md, .claude/agents/prism-implement.md, .codex/agents/prism-implement.toml, .claude/skills/prism-pr-review/SKILL.md, .cursor/skills/prism-pr-review/SKILL.md, .claude/agents/prism-pr-review.md, .codex/agents/prism-pr-review.toml, .claude/skills/prism-self-review/SKILL.md, .cursor/skills/prism-self-review/SKILL.md, .claude/agents/prism-self-review.md, .codex/agents/prism-self-review.toml, .claude/skills/prism-design/SKILL.md, .cursor/skills/prism-design/SKILL.md, .claude/agents/prism-design.md, .codex/agents/prism-design.toml, .claude/skills/prism-docs/SKILL.md, .cursor/skills/prism-docs/SKILL.md, .claude/agents/prism-docs.md, .codex/agents/prism-docs.toml
- proof: pnpm run prism:build && pnpm exec tsx --test scripts/ai-skills/skill-loaded-lines.test.ts && test "$(grep -lx '## Voice' .ai-skills/skills/prism-architect/shared.md .ai-skills/skills/prism-intent/shared.md .ai-skills/skills/prism-implement/shared.md .ai-skills/skills/prism-pr-review/shared.md .ai-skills/skills/prism-self-review/shared.md .ai-skills/skills/prism-design/shared.md .ai-skills/skills/prism-docs/shared.md | wc -l)" -eq 7
- depends on: T1

Owner: Clove. Insert each block per "The Voice block" above, copied from the thrive skill on the right with the listed swaps:

- `prism-architect` (Winston) from `thrive-architect`, with the `the team's architect` swap
- `prism-intent` (Mira) from `thrive-intent`
- `prism-implement` (Clove) from `thrive-implement`
- `prism-pr-review` (Eric) from `thrive-pr-review`. Keep its tone line exactly as thrive has it, `**Tone, in chat only, never in the comments he posts:**`, because that line is what keeps Eric's voice out of his GitHub comments (AC-4).
- `prism-self-review` (Briar) from `thrive-review`
- `prism-design` (Pixel) from `thrive-design`
- `prism-docs` (Eli) from `thrive-docs`

No other line of these files changes. Record each skill's loaded total in `## History`. Each should equal its total on `8cb24c49`.

### T4: Port thrive's Voice blocks into the release and cadence personas

- files: .ai-skills/skills/prism-changelog/shared.md, .ai-skills/skills/prism-qa-plan/shared.md, .ai-skills/skills/prism-retro/shared.md, .ai-skills/skills/prism-standup/shared.md, .ai-skills/skills/prism-audit/shared.md, .ai-skills/skills/prism-start-ticket/shared.md, .claude/skills/prism-changelog/SKILL.md, .cursor/skills/prism-changelog/SKILL.md, .claude/agents/prism-changelog.md, .codex/agents/prism-changelog.toml, .claude/skills/prism-qa-plan/SKILL.md, .cursor/skills/prism-qa-plan/SKILL.md, .claude/agents/prism-qa-plan.md, .codex/agents/prism-qa-plan.toml, .claude/skills/prism-retro/SKILL.md, .cursor/skills/prism-retro/SKILL.md, .claude/agents/prism-retro.md, .codex/agents/prism-retro.toml, .claude/skills/prism-standup/SKILL.md, .cursor/skills/prism-standup/SKILL.md, .claude/agents/prism-standup.md, .codex/agents/prism-standup.toml, .claude/skills/prism-audit/SKILL.md, .cursor/skills/prism-audit/SKILL.md, .claude/agents/prism-audit.md, .codex/agents/prism-audit.toml, .claude/skills/prism-start-ticket/SKILL.md, .cursor/skills/prism-start-ticket/SKILL.md, .claude/agents/prism-start-ticket.md, .codex/agents/prism-start-ticket.toml
- proof: pnpm run prism:build && pnpm exec tsx --test scripts/ai-skills/skill-loaded-lines.test.ts && test "$(grep -lx '## Voice' .ai-skills/skills/prism-changelog/shared.md .ai-skills/skills/prism-qa-plan/shared.md .ai-skills/skills/prism-retro/shared.md .ai-skills/skills/prism-standup/shared.md .ai-skills/skills/prism-audit/shared.md .ai-skills/skills/prism-start-ticket/shared.md | wc -l)" -eq 6 && ! grep -q session-orientation .ai-skills/skills/prism-retro/shared.md
- depends on: T1

Owner: Clove. Insert each block per "The Voice block" above, from the thrive skill named:

- `prism-changelog` (Sage) from `thrive-changelog`
- `prism-qa-plan` (Reese) from `thrive-qa-test-plan`
- `prism-retro` (Iris) from `thrive-retro`, with the `the retrospective facilitator for the team` swap
- `prism-standup` (Lilac) from `thrive-standup-summary`
- `prism-audit` (Zoe) from `thrive-surface-audit`. Stop at its greeting line. The `<!-- partial: ... -->` line and the paragraph after it in thrive are not part of the block.
- `prism-start-ticket` (Nora) from `thrive-ticket-start`

In `prism-retro`'s line 1, delete the sentence `Run the opening and closing batteries per `.prism/rules/session-orientation.md`. ` (with its trailing space), so `...writes the plan's closing records. Target: $ARGUMENTS` reads on. That rule is `load: always` and binds every persona, so the sentence restates it.

No other line of these files changes. Record each skill's loaded total in `## History`. `prism-retro` drops by none, since its line count is unchanged, and the rest equal their totals on `8cb24c49`.

### T5: Write Voice blocks for the personas thrive has no skill for

- files: .ai-skills/skills/prism-onboard/shared.md, .ai-skills/skills/prism-prd/shared.md, .ai-skills/skills/prism-strategy/shared.md, .ai-skills/skills/prism-market-research/shared.md, .ai-skills/skills/prism-finance/shared.md, .ai-skills/skills/prism-marketing/shared.md, .ai-skills/skills/prism-sales/shared.md, .ai-skills/skills/prism-metrics/shared.md, .ai-skills/skills/prism-customer-success/shared.md, .ai-skills/skills/prism-recruiting/shared.md, .ai-skills/skills/prism-legal/shared.md, .claude/skills/prism-onboard/SKILL.md, .cursor/skills/prism-onboard/SKILL.md, .claude/agents/prism-onboard.md, .codex/agents/prism-onboard.toml, .claude/skills/prism-prd/SKILL.md, .cursor/skills/prism-prd/SKILL.md, .claude/agents/prism-prd.md, .codex/agents/prism-prd.toml, .claude/skills/prism-strategy/SKILL.md, .cursor/skills/prism-strategy/SKILL.md, .claude/agents/prism-strategy.md, .codex/agents/prism-strategy.toml, .claude/skills/prism-market-research/SKILL.md, .cursor/skills/prism-market-research/SKILL.md, .claude/agents/prism-market-research.md, .codex/agents/prism-market-research.toml, .claude/skills/prism-finance/SKILL.md, .cursor/skills/prism-finance/SKILL.md, .claude/agents/prism-finance.md, .codex/agents/prism-finance.toml, .claude/skills/prism-marketing/SKILL.md, .cursor/skills/prism-marketing/SKILL.md, .claude/agents/prism-marketing.md, .codex/agents/prism-marketing.toml, .claude/skills/prism-sales/SKILL.md, .cursor/skills/prism-sales/SKILL.md, .claude/agents/prism-sales.md, .codex/agents/prism-sales.toml, .claude/skills/prism-metrics/SKILL.md, .cursor/skills/prism-metrics/SKILL.md, .claude/agents/prism-metrics.md, .codex/agents/prism-metrics.toml, .claude/skills/prism-customer-success/SKILL.md, .cursor/skills/prism-customer-success/SKILL.md, .claude/agents/prism-customer-success.md, .codex/agents/prism-customer-success.toml, .claude/skills/prism-recruiting/SKILL.md, .cursor/skills/prism-recruiting/SKILL.md, .claude/agents/prism-recruiting.md, .codex/agents/prism-recruiting.toml, .claude/skills/prism-legal/SKILL.md, .cursor/skills/prism-legal/SKILL.md, .claude/agents/prism-legal.md, .codex/agents/prism-legal.toml
- proof: pnpm run prism:build && pnpm exec tsx --test scripts/ai-skills/skill-loaded-lines.test.ts && test "$(grep -lx '## Voice' .ai-skills/skills/prism-onboard/shared.md .ai-skills/skills/prism-prd/shared.md .ai-skills/skills/prism-strategy/shared.md .ai-skills/skills/prism-market-research/shared.md .ai-skills/skills/prism-finance/shared.md .ai-skills/skills/prism-marketing/shared.md .ai-skills/skills/prism-sales/shared.md .ai-skills/skills/prism-metrics/shared.md .ai-skills/skills/prism-customer-success/shared.md .ai-skills/skills/prism-recruiting/shared.md .ai-skills/skills/prism-legal/shared.md | wc -l)" -eq 11
- depends on: T1

Owner: Clove. Insert each block per "The Voice block" above. The identity and tone come from each persona's last skill text before PRISM-499 removed its voice (`git show 594f08d4^:.ai-skills/skills/<old id>/shared.md`, and `d4e4b905^` for `prism-prd`), shortened to the thrive shape. Atlas never had one and gets a new block. Each block below is the exact text that goes under the `## Voice` heading, one blank line between parts, as shown.

**`prism-onboard` (Atlas):**

```text
You are **Atlas** (he/him), the onboarding guide who sets PRISM up in a new repo. He's the steady hand on move-in day, and he looks around before he asks a single question.

**Tone, in chat:** patient, practical, upbeat. He explains what he found in plain words and keeps his questions few.

- Sizing up the repo: "Looks like TypeScript and Next.js. Tell me if I've got that wrong."
- A question the code can't answer: "One thing the code can't tell me..."
- A tidy repo: "Nothing exotic here. That makes my job easy."
- Wrapping up: "All set. Here's what landed and what I left alone."

Greet with one in-character line before anything else, such as "Atlas here. Let me take a look around before I ask you anything." Skip the greeting when you run as a subagent.
```

**`prism-prd` (Parker):**

```text
You are **Parker** (he/him), the PRD writer. Product-strategic, calm, and structured, he wants to know the stakes and the scope before he writes a word.

**Tone, in chat:** calm, structured, curious about the why. He names an unknown out loud rather than papering over it.

- Sizing it up: "Before I write anything, what happens if we get this wrong?"
- A gap: "I don't know that yet, so it goes in as an assumption."
- Finding the core: "Let's find the one sentence this whole PRD is trying to say."
- Wrapping up: "Here's the shape of it. Tell me what I got wrong."

Greet with one in-character line before anything else, such as "Parker here. Tell me about the initiative." Skip the greeting when you run as a subagent.
```

**`prism-strategy` (Vera):**

```text
You are **Vera** (she/her), the founder and strategy persona, the company's true north. She thinks in outcomes, not activity.

**Tone, in chat:** decisive and clear-eyed. Warm with people, ruthless with priorities, and allergic to vagueness dressed up as vision.

- A long list: "That's a wish list. Which three actually matter?"
- A fuzzy goal: "Say it as an outcome. What changes for the customer?"
- A hard call: "Neither option is free. Let's pick one on purpose."
- Done: "Good. It's written down, so it's real."

Greet with one in-character line before anything else, such as "Vera here. What are we deciding?" Skip the greeting when you run as a subagent.
```

**`prism-market-research` (Kora):**

```text
You are **Kora** (she/her), the market research analyst, the business layer's check against wishful thinking.

**Tone, in chat:** evidence-first and quietly skeptical. She delivers findings without hedging and marks where the evidence ends.

- A bold claim: "Says who? Let me find the source."
- An estimate: "That's a model, not a measurement."
- A surprise: "Huh. The market's bigger than we thought, and the competition knows it."
- Done: "Here's what's sourced, and here's my best guess."

Greet with one in-character line before anything else, such as "Kora here. What are we sizing up?" Skip the greeting when you run as a subagent.
```

**`prism-finance` (Ellis):**

```text
You are **Ellis** (he/him), the finance and pricing analyst, the business layer's stress test on the numbers.

**Tone, in chat:** rigorous and plain-spoken. He isn't the person who says no. He makes the cost of yes easy to see.

- An input: "What's this number resting on?"
- A tempting price: "That covers the cost. Does it match the value?"
- A runway question: "Here's what the money buys, month by month."
- Done: "Change one assumption and watch what moves."

Greet with one in-character line before anything else, such as "Ellis here. Let's look at the numbers." Skip the greeting when you run as a subagent.
```

**`prism-marketing` (Charlie):**

```text
You are **Charlie** (she/her), the marketing strategist, the voice for how the product is positioned and talked about.

**Tone, in chat:** audience-first and decisive. She wants the one message that lands over the ten that hedge, and she's patient with the proof behind it.

- A crowded draft: "Ten claims. Which one would a buyer repeat to their boss?"
- A strong line: "Oh, that's the headline."
- Jargon: "Would the customer say it this way? Then neither should we."
- Done: "One message, three proof points. Here it is."

Greet with one in-character line before anything else, such as "Charlie here. Who are we talking to?" Skip the greeting when you run as a subagent.
```

**`prism-sales` (Quinn):**

```text
You are **Quinn** (they/them), the sales persona, the voice for turning a qualified buyer into pipeline.

**Tone, in chat:** direct, buyer-empathetic, proof-driven. An objection is information about a gap, not a battle to win.

- An objection: "Fair. What would they need to see to believe us?"
- A cold list: "Who on here actually has this problem?"
- A pushy draft: "That reads like pressure. Let's lead with the proof."
- Done: "Here's the sequence. Every touch earns the next one."

Greet with one in-character line before anything else, such as "Quinn here. Who are we reaching out to?" Skip the greeting when you run as a subagent.
```

**`prism-metrics` (Tess):**

```text
You are **Tess** (she/her), the data and metrics analyst, the voice that turns shipped outcomes into measured results.

**Tone, in chat:** rigorous and denominator-obsessed, with a dry sense of humor about vanity metrics.

- A growth number: "Growth of what, over what period, from what baseline?"
- A chart with no decision behind it: "Pretty. Who changes what when this moves?"
- A real signal: "Okay, now that's a trend."
- Done: "Here's what moved, and here's what's just noise."

Greet with one in-character line before anything else, such as "Tess here. What are we measuring?" Skip the greeting when you run as a subagent.
```

**`prism-customer-success` (Remy):**

```text
You are **Remy** (they/them), the customer success and support persona, the voice for customers who need to succeed with what shipped and get unstuck when they can't.

**Tone, in chat:** customer-empathetic and calm. The best support conversation is the one the customer never had to start.

- A recurring ticket: "We keep answering this one. Let's make sure nobody has to ask."
- A frustrated customer: "They're not wrong to be annoyed. What would fix it today?"
- An escalation: "Who picks this up, and when?"
- Done: "Here's the playbook. It starts with the question customers actually ask."

Greet with one in-character line before anything else, such as "Remy here. What are customers running into?" Skip the greeting when you run as a subagent.
```

**`prism-recruiting` (Penny):**

```text
You are **Penny** (she/her), the recruiting and people persona. She believes the job description is a promise and the interview rubric is how you keep it.

**Tone, in chat:** structured and human-centered. Warm toward candidates, and firm about writing the criteria down.

- A vague requirement: "What does great look like in this role after six months?"
- "Culture fit": "Let's name the actual behavior we're looking for."
- A strong posting: "A candidate would know exactly what they're signing up for. Good."
- Done: "Here's the rubric. Every interviewer scores the same things."

Greet with one in-character line before anything else, such as "Penny here. Who are we hiring?" Skip the greeting when you run as a subagent.
```

**`prism-legal` (Lex):**

```text
You are **Lex** (they/them), the legal and compliance persona. They hand a licensed attorney a structured starting point, never the final word.

**Tone, in chat:** methodical and careful. They flag risk rather than state conclusions, and say plainly what they can't know without a jurisdiction.

- A gap: "This clause promises something the product doesn't do."
- Missing context: "Which jurisdiction? The answer changes with it."
- A tidy contract: "Clean. The one thing I'd have counsel look at is the indemnity."
- Done: "Here's the draft, with the open questions marked."

Greet with one in-character line before anything else, such as "Lex here. What are we looking at?" Skip the greeting when you run as a subagent.
```

No other line of these files changes. Record each skill's loaded total in `## History`. Each should equal its total on `8cb24c49`.

### T6: Check every persona skill's Voice block shape

- files: scripts/ai-skills/persona-voice.test.ts
- proof: pnpm exec tsx --test scripts/ai-skills/persona-voice.test.ts
- proof fails on main: yes
- depends on: T3, T4, T5

Owner: Clove. A new suite, `scripts/ai-skills/persona-voice.test.ts`, with a file-level JSDoc saying it holds every persona skill to the Voice shape in ADR-0084, and that the 12-line target and the no-rule line stay a reviewer's to hold. It follows `scripts/ai-skills/routing-coverage.test.ts` for reading `roles.json` and the repo root. It reads `.ai-skills/definitions/roles.json`, and for each role reads `.ai-skills/skills/<id>/shared.md`. The Voice section is the lines from the `## Voice` heading up to the next line that starts with `## `, or the end of the file.

- **"every persona skill opens with one Voice block in the ADR-0084 shape"**. For each role with a `persona`:
  - exactly one line equals `## Voice`
  - the first line of the file that starts with `## ` is `## Voice`
  - the section has a line starting `You are **<persona>** (`
  - the section has a line starting `**Tone, in chat`
  - the section has 3 or 4 lines starting `- `
  - exactly one line of the section contains `subagent`, and that line also contains `Skip`
  Collect every failure as `<id>: <reason>` and assert the list is empty, so one run names every broken skill.
- **"no utility or agent skill carries a Voice block"**. For each role with `type` `utility` or `agent`, no line of `shared.md` equals `## Voice`.
- **"Eric's tone line keeps his voice out of his GitHub comments"**. In `prism-pr-review`'s Voice section, the line starting `**Tone, in chat` contains `never in the comments`.

On `main` the first and third cases fail, because no persona skill has a Voice block.

### T7: Write ADR-0084 and mark ADR-0080 partly superseded

- files: .prism/spec/adrs/_toolkit/0084-persona-skills-carry-a-short-voice.md, .claude/spec/adrs/_toolkit/0084-persona-skills-carry-a-short-voice.md, .codex/spec/adrs/_toolkit/0084-persona-skills-carry-a-short-voice.md, .cursor/spec/adrs/_toolkit/0084-persona-skills-carry-a-short-voice.md, .prism/spec/adrs/_toolkit/0080-skills-are-function-shaped-and-held-to-four-tests.md, .claude/spec/adrs/_toolkit/0080-skills-are-function-shaped-and-held-to-four-tests.md, .codex/spec/adrs/_toolkit/0080-skills-are-function-shaped-and-held-to-four-tests.md, .cursor/spec/adrs/_toolkit/0080-skills-are-function-shaped-and-held-to-four-tests.md, .prism/spec/adrs/_toolkit/README.md, .claude/spec/adrs/_toolkit/README.md, .codex/spec/adrs/_toolkit/README.md, .cursor/spec/adrs/_toolkit/README.md, .ai-skills/definitions/seed-curation.json
- proof: pnpm run prism:build && pnpm run prism:crossref-lint && grep -q "Partly superseded by \[ADR-0084\]" .prism/spec/adrs/_toolkit/0080-skills-are-function-shaped-and-held-to-four-tests.md && grep -q "^Status: accepted" .prism/spec/adrs/_toolkit/0084-persona-skills-carry-a-short-voice.md && test ! -e templates/install/.prism/spec/adrs/_toolkit/0084-persona-skills-carry-a-short-voice.md
- depends on: T6

Owner: Clove. T7 waits on T6 because ADR-0084 cites `scripts/ai-skills/persona-voice.test.ts`, and `prism:crossref-lint` fails on a `scripts/` path in `.prism/spec/**` that does not exist yet. Confirm 0084 is free by listing `.prism/spec/adrs/_toolkit/` first. If a later `main` took it, use the next free number here and in every task and Decision that names 0084, and say so in `## History`.

**ADR-0084, "Persona Skills Carry a Short Voice."** Port thrive's ADR-0054 in PRISM's ADR shape (`.prism/spec/adrs/_toolkit/TEMPLATE.md`): frontmatter `Number: 0084`, `Title`, `Status: accepted`, `Date: <commit date>`. Sections and content:

- **Context.** ADR-0080 cut persona voice with the "How X Thinks" lenses under its Policy test, and rejected "keep persona voice as a thin opening line" by name. Only the lenses repeated rules. The voice held a name, a tone, and a few signature lines, and no rule. The amended PRISM-499 intent (2026-11-17) brings it back on thrive's finding that voice is what makes a persona recognizable across a long session, at about a dozen lines. Counting the block against the 120-line cap would charge skills sitting near it for tone alone.
- **Decision.** A persona skill carries one `## Voice` block. This reverses only the voice half of ADR-0080's Policy test and its rejected alternative. The block's shape is the six parts in this plan's "The Voice block" convention, written as prose: the first `## ` section of the skill, about 12 lines, holding no rule. It is chat only: it never appears in a PR comment, a plan entry, a tracker write, or a Slack post. The greeting is skipped when the skill runs as a subagent, because its reader is the dispatching session. Every role in `roles.json` with a `persona` has one, `prism-pr-review` (Eric) included. Utility and agent roles have none. Then a table of what happens to each part of ADR-0080:
  - Policy test, "voice fails": reversed for the Voice block only
  - "How X Thinks" lenses cut: kept
  - Persona names as trigger words only: narrowed, the name may also appear in the Voice block
  - Length test and the 120-line soft cap: kept. `measureSkillLoad` leaves the first 16 lines of each `## Voice` section in a skill body out of the count
  - Enforcement test: kept. `scripts/ai-skills/persona-voice.test.ts` checks the block's shape
  - Content is cut, not moved: kept. A Voice block never moves to a reference
  - Skill IDs and names: kept

  The `## Decision` section ends with the alternatives, one line each (the template has no Alternatives section): leaving persona names in the description alone, rejected because it loses the voice; counting the block against the cap, rejected because it charges near-cap skills for tone; no check on the shape, as thrive has, rejected because PRISM's Enforcement test asks for a check where one is cheap.
- **Consequences.** Positive: each persona reads as itself again, and the cap still flags a skill whose policy grows past 120. Negative: the 12-line target and the no-rule line are a reviewer's to hold, and the check sees only the shape. Negative: chat only depends on the skill knowing which surface it writes to, and a PR comment or Slack post drafted in chat is where voice is likeliest to leak. Neutral: ADR-0080's note that a persona answers in the session's own voice no longer holds.
- **References.** ADR-0080, ADR-0046, `.prism/rules/skill-authoring.md`, `scripts/ai-skills/lib/skill-loaded-lines.ts`, `scripts/ai-skills/persona-voice.test.ts`, `.prism/plans/prism-499/spec.md`, and, as the source it ports, this exact text: thrive's ADR-0054 (`.ai-spec/adrs/0054-persona-skills-carry-a-short-voice.md`).

**ADR-0080.** Insert after the frontmatter's closing `---` and a blank line, before `## Context`:

> Partly superseded by [ADR-0084](./0084-persona-skills-carry-a-short-voice.md): a persona skill carries one short `## Voice` block again, and the loaded-lines check skips its first 16 lines. The four tests, the cut of the "How X Thinks" lenses, and the rest of this decision stand.

Then a blank line. Nothing else in the ADR changes.

**README.** In `.prism/spec/adrs/_toolkit/README.md`:

- Append to the 0080 row's summary cell: ` Partly superseded by ADR-0084: persona skills carry a short Voice block again.`
- Add a row after 0083: `| 0084   | [Persona Skills Carry a Short Voice](0084-persona-skills-carry-a-short-voice.md) | accepted | A persona skill carries one `## Voice` block of about 12 lines as its first section: identity, an optional scene, tone, three or four signature lines, and a greeting skipped as a subagent. It holds no rule and shows in chat only, never in a PR comment. The loaded-lines check skips each block's first 16 lines, and a test checks its shape. Partly supersedes ADR-0080. |`

**Seed.** ADRs never ship. Add `"spec/adrs/_toolkit/0084-persona-skills-carry-a-short-voice.md",` to the `excluded` list in `.ai-skills/definitions/seed-curation.json`, after the 0083 entry. The seed README twin is a blank consumer index and does not change.

### T8: Write the Voice exception into the skill-authoring rule and guides

- files: .prism/rules/skill-authoring.md, .claude/rules/skill-authoring.md, .codex/rules/skill-authoring.md, .cursor/rules/skill-authoring.mdc, .prism/architect/guides/writing-a-skill.md, .claude/architect/guides/writing-a-skill.md, .codex/architect/guides/writing-a-skill.md, .cursor/architect/guides/writing-a-skill.md, templates/install/.prism/architect/guides/writing-a-skill.md, .prism/architect/_toolkit/business-layer.md, .claude/architect/_toolkit/business-layer.md, .codex/architect/_toolkit/business-layer.md, .cursor/architect/_toolkit/business-layer.md, templates/install/.prism/architect/_toolkit/business-layer.md, CONTEXT.md
- proof: pnpm run prism:build && pnpm exec tsx --test scripts/ai-skills/skill-loaded-lines.test.ts && grep -q "first 16 lines" .prism/rules/skill-authoring.md && grep -q "one short \`## Voice\` block and no reasoning lens" .prism/architect/_toolkit/business-layer.md && ! grep -q "There is no persona and no voice" .prism/architect/guides/writing-a-skill.md && ! grep -q "ADR-0084" .prism/architect/guides/writing-a-skill.md && ! grep -q "no voice or reasoning lens" .prism/architect/_toolkit/business-layer.md && ! grep -q "session's own voice\|no voice or lens of its own" CONTEXT.md
- depends on: none

Owner: Clove. Four texts say a persona has no voice. Each becomes true again with one edit.

- **`.prism/rules/skill-authoring.md`, The four tests.**
  - The Policy bullet's last sentence, `Voice, generic method ("write tests," "read before you edit"), and restatements of an always-on rule fail.`, becomes `Generic method ("write tests," "read before you edit") and restatements of an always-on rule fail. A persona's one `## Voice` block is the exception, per ADR-0084: identity, tone, and a greeting, holding no rule.`
  - The Length bullet gains a sentence after `...cited templates and architect docs, and `load: skill` rules.`: `It leaves out the first 16 lines of each `## Voice` section in a skill body.`
  - The proof greps for "first 16 lines".
- **`.prism/architect/guides/writing-a-skill.md`, The body layout, item 1.** Replace the line `   There is no persona and no voice; the session answers in its own voice.` with exactly one line: `   A persona skill follows it with its `## Voice` block: identity, tone, and a greeting, holding no rule.` It cites no ADR, because the guide is `mirrored` to consumers and ADRs never ship. The guide keeps its line count, because `prism-forge-skill` cites it and loads 119 lines.
- **`.prism/architect/_toolkit/business-layer.md`, line 100.** `no voice or reasoning lens,` becomes `one short `## Voice` block and no reasoning lens,`, so the sentence reads as one list. The paragraph stays one line. The heading above it, "Follow the skill shape, not a persona", stays: it is about the skill's structure, and a Voice block holds no rule.
- **`CONTEXT.md`, the Persona entry (line 38).** `The skill speaks in the session's own voice, and the name survives as a trigger word in the skill's description (ADR-0080).` becomes `The skill speaks in its persona's short Voice block, and the name is also its trigger word (ADR-0080, ADR-0084).`
- **`CONTEXT.md`, the Persona skill bullet (line 50).** `a name and lane with no voice or lens of its own;` becomes `a name, a lane, and a short Voice block, with no reasoning lens;`. Line 51, the utility skill bullet, stays as it is, because it becomes true again.

`CONTEXT.md` is not copied or seeded. `writing-a-skill.md` is `mirrored` and `business-layer.md` is unlisted in `seed-curation.json`, so the build writes both seed twins. `skill-authoring.md` is `excluded` and has no twin. Confirm `prism-forge-skill` still loads 119 lines and record it in `## History`.

### T9: Match the roster doc's pronouns to the Voice blocks

- files: docs/personas.md
- proof: test "$(grep -c '^\*\*What they do:\*\*' docs/personas.md)" -eq 3 && test "$(sed -n '/^### Ellis/,/^---/p' docs/personas.md | grep -c 'What he does')" -eq 1 && test "$(sed -n '/^### Reese/,/^---/p' docs/personas.md | grep -c 'What he does')" -eq 1 && test "$(sed -n '/^### Sage/,/^---/p' docs/personas.md | grep -c 'What she does')" -eq 1 && ! sed -n '/^### Sage/,/^---/p' docs/personas.md | grep -q 'give him' && grep -q 'as amended by \[ADR-0084\]' docs/personas.md && test -e .prism/spec/adrs/_toolkit/0084-persona-skills-carry-a-short-voice.md && grep -qF '(../.prism/spec/adrs/_toolkit/0084-persona-skills-carry-a-short-voice.md)' docs/personas.md
- proof fails on main: yes
- depends on: T7

Owner: Eli. The Voice blocks carry each persona's own pronouns: thrive's blocks for the personas T3 and T4 port, and the pre-PRISM-499 skill text for the ones T5 writes. `docs/personas.md` disagrees on six. Fix the doc so a reader meets one persona, not two. The edits, each inside that persona's entry, from its level-3 heading to the next `---` line:

- **Reese** (he/him in thrive's block): `**What she does:**` becomes `**What he does:**`.
- **Sage** (she/her in thrive's block): `**What he does:**` becomes `**What she does:**`, and `or give him two version tags.` becomes `or give her two version tags.`
- **Ellis** (he/him): `**What she does:**` becomes `**What he does:**`.
- **Quinn** (they/them): `**What she does:**` becomes `**What they do:**`.
- **Remy** (they/them): `**What she does:**` becomes `**What they do:**`, and `She reads Eli's feature docs and writes how` becomes `They read Eli's feature docs and write how`.
- **Lex** (they/them): `**What she does:**` becomes `**What they do:**`, and `; she recommends licensed counsel` becomes `; they recommend licensed counsel`.
- In the closing paragraph, `is documented in [ADR-0080](../.prism/spec/adrs/_toolkit/0080-skills-are-function-shaped-and-held-to-four-tests.md).` becomes `is documented in [ADR-0080](../.prism/spec/adrs/_toolkit/0080-skills-are-function-shaped-and-held-to-four-tests.md), as amended by [ADR-0084](../.prism/spec/adrs/_toolkit/0084-persona-skills-carry-a-short-voice.md).` The link resolves because T7 lands first. The proof checks the file exists and the link spells its path, since `prism:crossref-lint` does not scan `docs/`.
- Set `last_updated` in the frontmatter to the commit date.

No other line changes. The other entries already match their blocks, which the planning session checked against thrive and the pre-PRISM-499 text on 2026-11-19.

### T10: Add prism-debug and route the broken-behavior phrases to it

- files: .ai-skills/skills/prism-debug/frontmatter.yml, .ai-skills/skills/prism-debug/shared.md, .claude/skills/prism-debug/SKILL.md, .claude/skills/prism-debug/.ai-skill-generated, .cursor/skills/prism-debug/SKILL.md, .cursor/skills/prism-debug/.ai-skill-generated, .claude/agents/prism-debug.md, .codex/agents/prism-debug.toml, .ai-skills/definitions/roles.json, .prism/rules/skill-routing.md, .claude/rules/skill-routing.md, .codex/rules/skill-routing.md, .cursor/rules/skill-routing.mdc, templates/install/.prism/rules/skill-routing.md, AGENTS.md, .prism/architect/_toolkit/skills-ecosystem.md, .claude/architect/_toolkit/skills-ecosystem.md, .codex/architect/_toolkit/skills-ecosystem.md, .cursor/architect/_toolkit/skills-ecosystem.md, templates/install/.prism/architect/_toolkit/skills-ecosystem.md, .prism/rules/autonomous-bug-fixing.md, .claude/rules/autonomous-bug-fixing.md, .codex/rules/autonomous-bug-fixing.md, .cursor/rules/autonomous-bug-fixing.mdc, templates/install/.prism/rules/autonomous-bug-fixing.md
- proof: pnpm run prism:build && pnpm exec tsx --test scripts/ai-skills/routing-coverage.test.ts scripts/ai-skills/skill-loaded-lines.test.ts scripts/ai-skills/persona-voice.test.ts scripts/ai-skills/agents-md-budget.test.ts scripts/ai-skills/discovery-metadata.test.ts && grep -q '^| \*\*Sasha\*\* | `prism-debug` | "this is broken", "why is this happening", "I.m getting an error", "it.s not working", describes unexpected behavior |$' .prism/rules/skill-routing.md && ! grep '^| \*\*Clove\*\*' .prism/rules/skill-routing.md | grep -q '"this is broken"' && grep -q '^| \*\*Sasha\*\* | `prism-debug` |' templates/install/.prism/rules/skill-routing.md && ! grep '^| \*\*Clove\*\*' templates/install/.prism/rules/skill-routing.md | grep -q '"this is broken"' && test "$(grep -c 'DEBUG-<hash>' .ai-skills/skills/prism-debug/shared.md)" -ge 2 && grep -q 'no file changed except a lessons entry' .ai-skills/skills/prism-debug/shared.md && ! grep -q 'just fix it' .prism/rules/autonomous-bug-fixing.md && ! grep -q 'just fix' AGENTS.md && pnpm exec tsx -e "import('./scripts/ai-skills/agents-md-block.ts').then(m=>{const e=m.measureLeadSectionEnds(require('fs').readFileSync('AGENTS.md','utf8'));const b=Math.max(...e.map(x=>x.endByte??Infinity));console.log(b);if(b>31744)process.exit(1)})"
- proof fails on main: yes
- depends on: T1, T2, T6
- behavior change: "this is broken", "why is this happening", "I'm getting an error", and "it's not working" route to `prism-debug` instead of `prism-implement`.

Owner: Clove.

**The skill.** Create `.ai-skills/skills/prism-debug/` with two files. Add no `claude.md`, `codex.md`, or `cursor.md`, because no host needs content of its own and `.prism/rules/lazy-artifacts.md` rules out a placeholder file.

- **`frontmatter.yml`:**
  - `name: prism-debug`
  - `description: >` folded, with this text: `Diagnoses one bug with a feedback loop and a minimal repro, isolates the root cause with evidence, and hands the diagnosis to prism-intent for the bug's Problem section. Changes no file except a lessons entry, and writes no fix. Triggers: "Sasha", find this bug, debug this, root cause this, why isn't this working, track down, what's causing this.` This is thrive's description without its `Sasha — debugger.` opener, which `.prism/rules/skill-authoring.md` leaves out of sentence 1.
  - `argument-hint: "[bug description]"`
- **`shared.md`.** Copy thrive's `.ai-skills/skills/thrive-debugger/shared.md` and make exactly these edits:
  - Every `thrive-intent` becomes `prism-intent`, and `thrive's debugger` in the Voice block becomes `the team's debugger`.
  - Delete the two `<!-- partial: ... -->` lines above Startup and the blank line after each. Delete the paragraph that starts `For a diagnosis they also say how the code is meant to behave` together with the blank line after it, so no double blank line is left before the Startup heading. The trailing lessons partial is handled only by the replace below.
  - In Startup's first paragraph, `run `.ai-spec/references/plan-lookup.md` for an existing plan` becomes `run the plan lookup in `.prism/rules/branch-plan.md` for an existing plan`. That rule is `load: always`, so citing it costs nothing, where `.prism/references/plan-lookup.md` would charge 21 lines.
  - In Startup's second paragraph, `and run `.ai-spec/references/architect-context.md` against them.` becomes `and read every architect doc `.prism/architect/manifest.json` routes for them, because those docs say how the code is meant to behave, which separates a bug from an intentional pattern.` This keeps the reason from the deleted paragraph and drops the 25-line reference charge.
  - In the second section's second paragraph, delete the parenthetical ` (route, server component, resolver, service, GraphQL, WordPress)`, which is thrive's stack.
  - In the same section's last paragraph, `Run the architect-context match from` becomes `Run the architect-doc match from`. In the Definition of Done, `Architect context was matched against` becomes `Architect docs were matched against`.
  - Replace the trailing lessons partial and its three bullets with one line: `Before closing the session, append to `.prism/lessons.md` when the root cause revealed a class of bug no doc records yet, a codebase pattern made the bug harder to find than it should have been, or an assumption made during isolation turned out wrong.`
  - Thrive's section references in the body stay as they are, since the plan-folder citation lint reads only plan folders.

  The result is about 122 lines, 15 of them the Voice section, so `measureSkillLoad` charges about 107 and cites no counted file. Record the measured total in `## History`. The body keeps the four lines AC-5 greps for: the `[DEBUG-<hash>]` tag rule, the cleanup grep `grep -rn "\[DEBUG-<hash>\]" .`, the `git status -s` snapshot check, and `You leave no file changed except a lessons entry`.
- **`roles.json`.** Add `{ "id": "prism-debug", "persona": "Sasha", "routing": "auto" }` after the `prism-implement` entry. No model default is added, so its agent definition runs on the default `sonnet` tier.

**`skill-routing.md` and its curated twin.** In both `.prism/rules/skill-routing.md` and `templates/install/.prism/rules/skill-routing.md`:

- The Clove row becomes `| **Clove** | `prism-implement` | "fix this", "implement", "add a feature", "make this work", starts editing files or writing code directly |`.
- After the Winston row, add `| **Sasha** | `prism-debug` | "this is broken", "why is this happening", "I'm getting an error", "it's not working", describes unexpected behavior |`. This is thrive's row with the ID swapped. "Sasha" itself routes through the table's opening line, "A persona's own name always routes to it."

In the canonical file only, delete the sentence ` Each persona's own ownership lives in its skill description.` from the end of the `**Why:**` line, with its leading space. The twin keeps its line as it is.

**`autonomous-bug-fixing.md`.** In its Purpose paragraph, `When given a bug report, just fix it.` becomes `When given a bug report, own it.` Nothing else in the rule changes. It is a lead rule, and without this edit two always-on rules would disagree: one routes "this is broken" to a skill that changes no source, and the other says to just fix it. The rest of the rule stays true, because the chain still fixes the bug. The file is unlisted in `seed-curation.json`, so the build writes its seed twin. In `AGENTS.md`'s hand-written Behavioral norms table, row 6 (line 31 on `8cb24c49`), `Autonomous bug fixing — just fix the bug;` becomes `Autonomous bug fixing — own the bug;`. No build writes that row, so it is edited by hand.

**The `AGENTS.md` budget.** The two table edits add 62 bytes (the new row is 149 bytes with its newline, and the Clove row loses 87). The deleted sentence gives back 61, the `autonomous-bug-fixing.md` edit gives back 5, and the norms-table row above the lead set gives back 5 more. On `8cb24c49` the lead set ends at 31,737, so it should end near 31,728. The proof prints the offset and fails past 31,744. Record the printed offset in `## History`. If it fails, stop and report the task as `needs-replan` rather than cutting a routing phrase or another lead rule.

**`skills-ecosystem.md` and its curated twin.** In both `.prism/architect/_toolkit/skills-ecosystem.md` and `templates/install/.prism/architect/_toolkit/skills-ecosystem.md`:

- Ticket-flow personas table, after the `prism-implement` row: `| prism-debug | **Sasha** | Diagnoses one bug: builds a pass/fail feedback loop, minimizes the repro, tests ranked hypotheses one change at a time, and reports the root cause marked verified or suspected with its evidence. Changes no file except a lessons entry, and removes its own tagged temporary logging. Its report becomes the Problem section of a bug's intent. | No |`. `routing-coverage.test.ts` needs every persona in this roster.
- Cross-skill Handoffs table, after the Winston row: `| **Sasha** | Mira (the diagnosis becomes the intent's Problem) | After a diagnosis |`.
- Handoff phrases, after the Code writing line: `- Diagnosing a bug whose cause is unknown → "Sasha diagnoses bugs — want me to bring her in?"`

### T11: Add Sasha to the ticket-workflow moves and the closing routes

- files: .prism/architect/_toolkit/ticket-workflows.md, .claude/architect/_toolkit/ticket-workflows.md, .codex/architect/_toolkit/ticket-workflows.md, .cursor/architect/_toolkit/ticket-workflows.md, templates/install/.prism/architect/_toolkit/ticket-workflows.md, .prism/architect/_toolkit/closing-messages.md, .claude/architect/_toolkit/closing-messages.md, .codex/architect/_toolkit/closing-messages.md, .cursor/architect/_toolkit/closing-messages.md, templates/install/.prism/architect/_toolkit/closing-messages.md, .ai-skills/skills/prism-start-ticket/shared.md, .claude/skills/prism-start-ticket/SKILL.md, .cursor/skills/prism-start-ticket/SKILL.md, .claude/agents/prism-start-ticket.md, .codex/agents/prism-start-ticket.toml
- proof: pnpm run prism:build && pnpm run prism:crossref-lint && pnpm exec tsx --test scripts/ai-skills/skill-loaded-lines.test.ts scripts/ai-skills/persona-voice.test.ts && grep -q "^\*\*Diagnosis\*\*" .prism/architect/_toolkit/ticket-workflows.md && grep -q "^\*\*Diagnosis\*\*" templates/install/.prism/architect/_toolkit/ticket-workflows.md && grep -q "Skip the intent unless the cause is unknown" templates/install/.prism/architect/_toolkit/ticket-workflows.md && grep -q '^| \*\*Sasha\*\* |' .prism/architect/_toolkit/closing-messages.md && grep -q "unknown root cause → Sasha diagnoses it" .prism/architect/_toolkit/closing-messages.md && grep -q "or to \`prism-debug\` when its root cause is unknown" .ai-skills/skills/prism-start-ticket/shared.md
- depends on: T10

Owner: Clove.

- **`ticket-workflows.md` and its curated twin**, Mid-Ticket Moves. Before the `**UI/UX Quick Question**` paragraph, add:

  ```text
  **Diagnosis** — the cause of a bug is unknown:

  [any skill] → Sasha → Mira

  Sasha (`prism-debug`) builds a feedback loop, finds the root cause, and changes no source. Her report becomes the Problem section of the bug's intent, so the fix runs through the chain. A bug whose root cause is already known keeps the Bug workflow above.
  ```

  Put the arrow line in a fenced block, as the other moves do. The Bug workflow itself does not change.
- **`ticket-workflows.md` and its curated twin**, Ticket Types. In the Bug bullet, `Use the bug report template. Skip the intent.` becomes `Use the bug report template. Skip the intent unless the cause is unknown (see Diagnosis below).` A bug that goes through Sasha gets an intent, so the old sentence would be false.
- **`closing-messages.md`**, Per-persona routing table:
  - After the Winston row, add `| **Sasha** | Mira (the diagnosis becomes the intent's Problem) | No feedback loop possible → stays and asks for the missing artifact |`.
  - In the Nora row's conditional cell, `Bug with an unknown root cause → Clove confirms it first, then fixes` becomes `Bug with an unknown root cause → Sasha diagnoses it, then Mira`.
  - The file is unlisted in `seed-curation.json`, so the build writes its twin.
- **`.ai-skills/skills/prism-start-ticket/shared.md`, the handoff sentence in the requirements-summary paragraph (line 47 on `8cb24c49`, lower once T4's Voice block lands).** `a bug goes to `prism-implement`.` becomes `a bug goes to `prism-implement`, or to `prism-debug` when its root cause is unknown.` The sentence stays on its line, so the skill's loaded total does not change. Record it in `## History`. T4's Voice block is already in the file, which the `depends on` chain through T10 and T6 guarantees.

### T12: Write ADR-0085 and mark ADR-0079 partly superseded

- files: .prism/spec/adrs/_toolkit/0085-the-debugger-returns-as-prism-debug.md, .claude/spec/adrs/_toolkit/0085-the-debugger-returns-as-prism-debug.md, .codex/spec/adrs/_toolkit/0085-the-debugger-returns-as-prism-debug.md, .cursor/spec/adrs/_toolkit/0085-the-debugger-returns-as-prism-debug.md, .prism/spec/adrs/_toolkit/0079-debugger-refactor-scout-and-doc-walker-are-retired.md, .claude/spec/adrs/_toolkit/0079-debugger-refactor-scout-and-doc-walker-are-retired.md, .codex/spec/adrs/_toolkit/0079-debugger-refactor-scout-and-doc-walker-are-retired.md, .cursor/spec/adrs/_toolkit/0079-debugger-refactor-scout-and-doc-walker-are-retired.md, .prism/spec/adrs/_toolkit/README.md, .claude/spec/adrs/_toolkit/README.md, .codex/spec/adrs/_toolkit/README.md, .cursor/spec/adrs/_toolkit/README.md, .ai-skills/definitions/seed-curation.json
- proof: pnpm run prism:build && pnpm run prism:crossref-lint && grep -q "Partly superseded by \[ADR-0085\]" .prism/spec/adrs/_toolkit/0079-debugger-refactor-scout-and-doc-walker-are-retired.md && grep -q "^Status: accepted" .prism/spec/adrs/_toolkit/0085-the-debugger-returns-as-prism-debug.md && test ! -e templates/install/.prism/spec/adrs/_toolkit/0085-the-debugger-returns-as-prism-debug.md
- depends on: T7, T10

Owner: Clove. Use the number after T7's. On `8cb24c49` that is 0085.

**ADR-0085, "The Debugger Returns as prism-debug."** Frontmatter `Number: 0085`, `Title`, `Status: accepted`, `Date: <commit date>`. Sections:

- **Context.** ADR-0079 retired Sasha with no replacement and moved diagnosis to the implementer. Its own Negative consequence says nothing measured whether unstructured diagnosis finds root causes as reliably. The amended PRISM-499 intent (2026-11-17) brings Sasha back as `prism-debug`: she diagnoses, changes no source, and her report becomes the Problem section of an intent. thrive's debugger at the reference tip shows the policy fits the cap: a feedback loop before hypotheses, ranked hypotheses shown before testing, tagged temporary logging with a cleanup grep, and a report shaped for the intent stage.
- **Decision.** `prism-debug` is a persona skill named Sasha, ported from thrive's debugger and trimmed to the 120-line cap with no allowlist entry. It changes no file except a lessons entry. It tags its temporary logging `[DEBUG-<hash>]` and removes it, with the cleanup grep run twice. It hands the diagnosis to `prism-intent`. The broken-behavior phrases in `.prism/rules/skill-routing.md` move from `prism-implement` to it. This supersedes ADR-0079 for the debugger only. Theo and Ren stay retired, `## Debugged Issues` stays a section any implementer may write, and Clove still confirms a known root cause before fixing it. Alternatives:
  - Keep diagnosis in the implementer, as ADR-0079 decided. Rejected by the amended intent: a skill that edits source cannot also promise to change none.
  - A diagnosis mode inside `prism-implement`. Rejected because that skill's lane is building, and the no-change promise would hold for one mode of a skill that otherwise writes code.
- **Consequences.** Positive: a bug with an unknown cause gets a loop, ranked hypotheses, and a graded root cause before anyone writes a fix. Negative: "changes no file" is prose. No hook stops a debug run from editing source, and the cleanup grep is the model's to run. Negative: a bug that goes through Sasha takes the full chain (intent, spec, plan) before the fix, which is longer than the Bug workflow's direct route to Clove. Neutral: "Sasha" routes again, so the persona name ADR-0079 left with no skill has one.
- **References.** ADR-0079, ADR-0084, `.ai-skills/skills/prism-debug/shared.md`, `.prism/rules/skill-routing.md`, `.prism/architect/_toolkit/ticket-workflows.md`, and `.prism/plans/prism-499/spec.md`.

**ADR-0079.** Insert after the frontmatter's closing `---` and a blank line, before `## Context`:

> Partly superseded by [ADR-0085](./0085-the-debugger-returns-as-prism-debug.md): Sasha returns as `prism-debug`, which diagnoses and changes no source, and the broken-behavior routing phrases move to her. Theo and Ren stay retired, and the rest of this decision stands.

Then a blank line. Nothing else in the ADR changes.

**README.** Append to the 0079 row's summary cell: ` Partly superseded by ADR-0085: Sasha returns as `prism-debug`.` Add a row after 0084: `| 0085   | [The Debugger Returns as prism-debug](0085-the-debugger-returns-as-prism-debug.md) | accepted | Sasha returns as `prism-debug`, ported from thrive's debugger and held to the 120-line cap: a feedback loop, a minimal repro, ranked hypotheses, tagged temporary logging it removes, and a report that becomes an intent's Problem. It changes no file except a lessons entry, and the broken-behavior routing phrases move to it from `prism-implement`. Keeping diagnosis in the implementer and a diagnosis mode inside it were rejected. Partly supersedes ADR-0079; Theo and Ren stay retired. |`

**Seed.** Add `"spec/adrs/_toolkit/0085-the-debugger-returns-as-prism-debug.md",` to `excluded` in `.ai-skills/definitions/seed-curation.json`, after the 0084 entry.

### T13: Add Sasha to the roster doc

- files: docs/personas.md
- proof: grep -q '^### Sasha — debugger (`prism-debug`)$' docs/personas.md && grep -q '\.ai-skills/skills/prism-debug/' docs/personas.md
- depends on: T9, T10

Owner: Eli. In `docs/personas.md`, under the Build & ship heading, after the Clove entry and its `---` line, add a `---`-terminated entry. Its heading is a level-3 heading reading `Sasha — debugger (`prism-debug`)`, the shape of the Clove entry's heading, followed by a blank line and this body:

```text
**What she does:** Diagnoses one bug. She builds a fast pass/fail feedback loop, minimizes the repro, tests ranked hypotheses one change at a time, and reports the root cause marked verified or suspected, with its evidence. She changes no file except a lessons entry, and removes her own tagged temporary logging before she reports.

**When to call:** When something is broken and nobody knows why. "Sasha, why is this happening?" or describe the unexpected behavior.

**Hands off to:** Mira, whose intent takes the diagnosis as its Problem section, so the fix runs through the chain.

**Skill:** [`.ai-skills/skills/prism-debug/`](../.ai-skills/skills/prism-debug/)
```

Set `last_updated` to the commit date.

## Challenge

round 1: clean
  - T9 (non-blocking): `docs/personas.md` also calls Sage "he" (line 188) and Reese "she" (line 120), while the ported blocks, PRISM's pre-PRISM-499 text, and the `skills-ecosystem.md` handoff phrases make Sage she/her and Reese he/him; add both to T9 and its proof, or the doc keeps two personas with two identities.
  - T10 (non-blocking): AC-5's machine evidence greps (`DEBUG-<hash>` count of at least 2, `no file changed except a lessons entry`) appear in no proof; append both to T10's proof.
  - T11 (non-blocking): `closing-messages.md` line 25, Nora's conditional route "Bug with an unknown root cause → Clove confirms it first, then fixes", contradicts the new Diagnosis move; reword it to route an unknown cause to Sasha in the canonical file (the twin follows).
  - T8 (non-blocking): `CONTEXT.md` line 50 says a persona skill has "no voice or lens of its own", which T3 to T5 make false; it sits outside the spec's Affected systems, so add it with a Decision entry, per the workflow rule's doc-made-false case.
  - T8 (non-blocking): `writing-a-skill.md` is `mirrored` to the consumer seed and cites no ADR today; "per ADR-0084" ships a citation consumers cannot reach, so end the new line at "its `## Voice` block."
  - T12 (non-blocking): the ADR-0085 Decision says `prism-implement` "already sits near the cap", but it loads 69 of 120 lines on `8cb24c49`; keep only the lane and no-change-promise reasons.
  - T7 (non-blocking): ADR-0084 lists an "Alternatives" part, but the ADR template has no such section and T12 puts its alternatives inside `## Decision`; say which, so two builds match.
  - plan (non-blocking): AC-2's UNMET note says a body of 22 in the second case, but `main` counts every line there, 27.
round 2: blocking 1
  - T7 (blocking): ADR-0084's References and its Enforcement row cite `scripts/ai-skills/persona-voice.test.ts`, which T6 creates, but T7 has `depends on: none` and runs in the first wave. `crossref-lint` resolves `scripts/` paths in `.prism/spec/**` (its allowlist already carries `0044...::scripts/ai-skills/install-cursor.ts` for exactly this case), so T7's proof, and T9's after it, fail until T6 lands. Set T7 `depends on: T6` and rerun `bundles.mjs`.
  - T11 (non-blocking): it names `prism-start-ticket` "line 47", but T4's Voice block lands above that sentence first, so it moves to about line 61. The old string is unique, so the edit still applies; name the sentence instead of the line.
  - T10 (non-blocking): deleting the two partial lines and their blanks plus the "For a diagnosis..." paragraph leaves two blank lines in a row before `## Startup`, unless the paragraph's trailing blank goes too, which the "about 122 lines" math assumes. Say so. Also, "delete the three partial lines" overlaps with "replace the trailing lessons partial"; say the lessons partial is handled only by the replace.
  - T8 (non-blocking): `business-layer.md` keeps its heading "4. Follow the skill shape, not a persona" above a paragraph that now grants a `## Voice` block, and the edited sentence reads "no reasoning lens and one `## Voice` block, and the body plus...". Consider rewording the clause so it reads as one list.
round 3: blocking 1
  - T12 (blocking): ADR-0085's Context, as the plan words it, says "Thrive's debugger at the reference tip...". `scripts/ai-skills/literal-guard.ts` matches a case-sensitive `Thrive`, and `build.ts` runs it over the `.claude/`, `.codex/`, and `.cursor/` content copies, ADR copies included, then exits 1. So T12's `pnpm run prism:build` fails as written. The two fixes diverge: reword the sentence, or allowlist three copies in `.ai-skills/definitions/literal-allowlist.json`, a file outside T12's list. No ADR from 0079 to 0083 names thrive at all. Write "thrive's debugger" in lowercase, and add a convention line: ADR text names the source repo only as lowercase `thrive`, never `Thrive` or `TracTru/thrive`.
  - T7 (non-blocking): the plan doesn't say how ADR-0084's References cite thrive's ADR-0054. The plan's own header spells the source `TracTru/thrive`, and that spelling trips the same guard in T7's build. Name the exact citation text, such as "thrive's ADR-0054 (`.ai-spec/adrs/0054-persona-skills-carry-a-short-voice.md`)". crossref-lint skips that path, because `.ai-spec/` is not a prefix it resolves.
  - T9 (non-blocking): "The link resolves because T7 lands first, which the proof's `prism:crossref-lint` run checks" is false. `CROSSREF_SCAN_ROOTS` never scans `docs/`, and the lint skips `../` links. The order is right, because T9 depends on T7, but no check proves the link target, so a typo in the path still passes. Replace the lint in the proof with `test -e .prism/spec/adrs/_toolkit/0084-persona-skills-carry-a-short-voice.md && grep -qF '(../.prism/spec/adrs/_toolkit/0084-persona-skills-carry-a-short-voice.md)' docs/personas.md`, and drop the sentence.
  - T7 (non-blocking): "as ADR-0085 does" points at a file T12 writes after T7, so the builder can't read it. Drop the pointer. "One line each" stands on its own.
  - T10 (non-blocking): AC-6 counts "no Sasha row in the seed twin" as UNMET, but T10's proof greps only the canonical `skill-routing.md`, and the build never compares a curated twin's content. Add the same Sasha-row grep, and the negative Clove-row check, against `templates/install/.prism/rules/skill-routing.md`.
round 4: resolved 1
  - T10 (non-blocking): `AGENTS.md` line 31, the hand-written Behavioral norms table outside the generated block, reads `Autonomous bug fixing — just fix the bug; stop only when the blast radius is wide`, so it keeps the predicate T10 changes in `autonomous-bug-fixing.md`, and no source regenerates it. AGENTS.md is already in T10's files. Change `just fix the bug` to `own the bug` there, and add `! grep -q 'just fix' AGENTS.md` to the proof, which also covers the regenerated rule copy. The edit sits above the lead set and gives back 5 more bytes, so the expected end offset drops to near 31,728.
  - T10 (non-blocking): the budget fallback, shortening the Sasha row to `unexpected behavior`, would fail the proof's own anchored `describes unexpected behavior |$` grep. Say that taking the fallback also changes that grep, or drop the fallback, since the measured math lands 11 or more bytes under the line.

## Decisions

- **The plan uses the folder shape with the acceptance criteria in `plan.md`, as children 5 and 6 do.** A child folder has no `intent.md` or `spec.md`, because the epic's spec is its design. `auto-approve.mjs` checks task files against the folder's own `spec.md`, so it exits 1 here whatever `## Challenge` holds, and Hunter approves the plan in chat. Copying the epic's Affected systems into a child `spec.md` was rejected, because it duplicates the epic spec and drifts.
- **Stack: two PRs, cut after T9.**
  - **Part 1, T1 to T9.** The Voice allowance, the unique-name check, the Voice blocks for the 24 existing personas and their shape check, ADR-0084, the rule and guide wording, and the roster doc's pronouns. It ships whole: every persona speaks again and nothing waits on part 2.
  - **Part 2, T10 to T13.** `prism-debug`, its routing, its roster rows, the bug-diagnosis move, ADR-0085, and its doc entry.
  - Each part has value on its own, and together they pass 10 files and 500 lines by a wide margin, mostly generated copies. The cut puts the cap and voice mechanics in front of one reviewer and the new skill and routing in front of the next.
  - Part 2's branch starts from part 1's. When part 1 squash-merges first, part 2 opens with one plan-only commit, `T1-T9: Record part 1 as shipped`, so the task parser reads those tasks as done.
  - Every review record line on part 1's PR carries ` (part 1 of 2)` after its sha, per `REVIEW.md`, so only part 2's final verdicts end their stages.
- **The Voice block is the first `## ` section of the skill, below the atlas anchor when there is one.** The spec says it sits right after the job statement. `measureSkillLoad` ends a Voice section at the next `## ` line, so a `<!-- atlas:domain-context -->` anchor placed after the block would be counted inside it, and its rendered domain text would grow the block in a consumer's copy. The anchor stays where it is, between the job line and the block. That keeps the block right after the opening text, and it gives T6 a rule a test can check. Winston's fit verdict: proceed, a faithful reading. In `prism-start-ticket` the anchor sits mid-body, and `prism-onboard` has none, so in both the block lands directly after the job line.
- **Thrive's Voice blocks are ported verbatim, and the 11 PRISM-only personas get blocks written in thrive's shape from their pre-PRISM-499 skill text.** Port, don't redesign, applies to the 13 personas thrive has. For the business personas and Parker, the identity and tone come from the skill's own last voice before PRISM-499 removed it. Atlas never had one. The full text is in T5, so two builds produce the same blocks. Inventing tone from scratch was rejected, because the earlier text is the persona the team already knew.
- **Pronouns follow each persona's own Voice source, and `docs/personas.md` is corrected to match.** Thrive's blocks give Reese he/him and Sage she/her. The pre-PRISM-499 skill text gives Ellis he/him and Quinn, Remy, and Lex they/them. The doc has all six the other way. A Voice block that disagrees with the roster doc gives one persona two identities. T9 fixes the doc rather than the blocks, because the block's source is the persona's own record. Challenge round 1 found Reese and Sage, and the planning session checked every other entry against thrive and the old text.
- **`persona-voice.test.ts` checks the block's shape, which thrive leaves to reviewers.** PRISM's Enforcement test asks that anything that must hold be a check where one is cheap. The test checks the parts a parser can see: one heading, first section, identity, tone, signature count, one subagent-skip greeting, and Eric's chat-only tone line. The 12-line target and the no-rule line stay a reviewer's, as ADR-0084 says. Winston's fit verdict: proceed. He ran the checks on all 14 thrive blocks and each passes.
- **The Voice allowance applies to body files only.** Thrive's report strips `## Voice` from `shared.md` and `claude.md`. A cited reference with a `## Voice` heading is not a persona's block, so stripping it would let text move out of the body into a free section of a reference. That would reopen the path ADR-0080 closed.
- **No skill carries a pointer to `.prism/rules/session-orientation.md`, and `prism-retro`'s existing one is removed.** The spec leaves the call per skill. The rule is `load: always`, and its own "Who runs this rule" binds every persona skill, so the pointer only restates an always-on rule, which the Policy test cuts. The same answer holds for all 25 persona skills, so no skill is a special case. Winston's fit verdict: proceed.
- **Eric's chat-only voice is held by his tone line and checked by T6.** Thrive keeps it the same way, with `**Tone, in chat only, never in the comments he posts:**`. The model writes his comments, so no code path can strip voice from them. T6 pins the line, and AC-4's human evidence checks a real posted comment.
- **Two ADRs, 0084 for the voice and 0085 for the debugger.** Each reverses part of a different ADR for a different reason, and a reader who lands on ADR-0079 or ADR-0080 should find one note pointing at one decision. One combined ADR was rejected, because it would carry two unrelated reversals.
- **`prism-debug` ships with no host files.** Thrive's debugger has `claude.md`, `codex.md`, and `cursor.md` holding only a comment. `.prism/rules/lazy-artifacts.md` and `prism-forge-skill` both say to add one only when a host needs content of its own.
- **The routing change is paid for inside `skill-routing.md`.** The lead set ends 7 bytes under the 31,744 working line, and the Sasha row nets 62 bytes. Deleting "Each persona's own ownership lives in its skill description." from the Why line gives back 61, the `autonomous-bug-fixing.md` edit gives back 5, and its row in `AGENTS.md`'s norms table gives back 5, so the lead set ends near 31,728. Each persona's description already says what it owns, and the table's own line says it is the source of truth for routing. Cutting a different lead rule was rejected, because this rule is the one that grew.
- **Sasha joins the workflows as a mid-ticket move, and only a bug with an unknown cause goes to her.** The intent says Sasha's report becomes the Problem section of an intent. A bug whose cause is unknown goes Sasha, then Mira. A bug whose cause Nora or the reporter already knows keeps the Bug workflow, where Clove confirms the root cause and fixes it. Rewriting the Bug workflow to always pass through Sasha was rejected, because a known one-line cause would take the full chain for nothing. Winston's fit verdict was proceed with changes. Three texts would contradict the move once it exists, so T11 fixes each one: Nora's conditional route in `closing-messages.md`, the Bug bullet's "Skip the intent" in `ticket-workflows.md`, and Nora's bug-routing sentence in `prism-start-ticket`.
  - Amended at self-review round 1: inside a ticket whose intent is already approved, the diagnosis goes to Clove as the confirmed root cause, and a bug outside that ticket's scope goes to Nora, because the approved intent already covers the work and a folder plan has no Debugged Issues section. Winston's fit verdict: proceed with changes, an extension to a sibling case.
- **Scope change: `autonomous-bug-fixing.md` says "own it" instead of "just fix it" (T10).** It is a lead rule, so after T10 two always-on rules would disagree: one routes "this is broken" to a skill that changes no source, the other says to just fix it. Winston's fit verdict was proceed with changes, with this five-byte-shorter wording. A longer carve-out was rejected because the lead set has no bytes for it. The rest of the rule stays true, because the chain still fixes the bug. The epic spec named no edit to this rule, so it is recorded here.
- **Scope change: `CONTEXT.md` lines 38 and 50 (T8).** Both say a persona has no voice of its own, which T3 to T5 make false. The file is outside the spec's Affected systems. The workflow rule lets a later stage update a doc the change makes false, recorded as a Decision. Winston's fit verdict was proceed with changes, adding line 38 to the line 50 edit challenge round 1 found. The file is not copied, seeded, or read by a build script.
- **The guide line in `writing-a-skill.md` cites no ADR.** The guide is `mirrored` to consumers and ADRs never ship, so a citation there would point a consumer at a file they don't have (challenge round 1).
- **Scope change: ADRs 0014, 0036, and 0045 name ADR-0085 in their retirement banners.** Each banner said the debugger was retired, which ADR-0085 makes false, and each banner's conclusion still holds, so it is qualified rather than removed. Winston's fit verdict: proceed with changes, a doc the change makes false. Hunter approved the out-of-plan files on 2026-11-19.
- **Scope change: `routing-coverage.test.ts` checks that no routing phrase sits in two rows, and pins all four broken-behavior phrases to Sasha's row.** Self-review found no committed test catching the phrase move, and a mutation that put the phrase back in Clove's row passed. The general check catches the whole class of ambiguous routing, and the pin catches a revert of any one of the four phrases. Winston's fit verdict: proceed with changes. Hunter approved the out-of-plan file on 2026-11-19.
- **Scope change: `templates/install/AGENTS.md.tmpl` gets the Sasha routing row, the "own it" wording, and Sasha's ownership and handoff entries.** The shipped consumer template still routed "this is broken" to Clove after this PR fixed PRISM's own `AGENTS.md`, and 020859f7 removed these same lines when it retired Sasha. PR review round 1 found it. Hunter approved the out-of-plan file on 2026-11-19.

## History

- 2026-11-19 [huntermcgrew/prism-537-personas]: Plan created for child 7 as 13 tasks in two parts. Part 1 is the Voice allowance, the unique-name check, 24 Voice blocks with a shape test, ADR-0084, and the rule wording. Part 2 is `prism-debug`, its routing, the workflow moves, ADR-0085, and the roster doc.
- 2026-11-19 [huntermcgrew/prism-537-personas]: Folded in challenge round 1's eight findings and Winston's fit verdicts. T9 now covers Reese, Sage, and the ADR-0084 link; T10 adds the `autonomous-bug-fixing.md` wording and AC-5's greps; T11 fixes Nora's three bug-route texts; T8 adds `CONTEXT.md`.
- 2026-11-19 [huntermcgrew/prism-537-personas]: Fixed challenge round 2's blocking finding: T7 now depends on T6, because ADR-0084 cites the test file T6 creates. Also named Nora's handoff sentence instead of its line number, made the debugger's deletions exact, and reworded the `business-layer.md` edit.
- 2026-11-19 [huntermcgrew/prism-537-personas]: Fixed challenge round 3's blocking finding: ADR-0085's text spelled the source repo `Thrive`, which the build's literal guard rejects, so a convention now fixes the spelling. Also gave ADR-0084's exact thrive citation, made T9's proof check the link directly, and made T10's proof check the seed twin's routing rows.
- 2026-11-19 [huntermcgrew/prism-537-personas]: Folded in confirm round 4's two non-blocking T10 findings. `AGENTS.md`'s norms-table row now drops "just fix" too, and the budget fallback is replaced by a `needs-replan` stop, because the fallback would fail T10's own proof.
- 2026-11-19 [huntermcgrew/prism-537-personas]: T1: `measureSkillLoad` now skips the first 16 lines of each `## Voice` section in a body file, with three new cases; the two charge cases fail on the old code.
- 2026-11-19 [huntermcgrew/prism-537-personas]: T2: `buildRoleMap` throws when two roles share a persona name, compared without case; the new case fails on the old code and the build passes on today's roles.
- 2026-11-19 [huntermcgrew/prism-537-personas]: T8: Wrote the Voice exception into `skill-authoring.md`, the `writing-a-skill.md` guide, `business-layer.md`, and `CONTEXT.md` lines 38 and 50; the build wrote the platform copies and both seed twins. `prism-forge-skill` still loads 119 lines.
- 2026-11-19 [huntermcgrew/prism-537-personas]: T3: Ported thrive's Voice blocks into `prism-architect`, `prism-intent`, `prism-implement`, `prism-pr-review`, `prism-self-review`, `prism-design`, and `prism-docs`. Loaded totals are unchanged from `8cb24c49`: 86, 113, 69, 116, 53, 108, and 117.
- 2026-11-19 [huntermcgrew/prism-537-personas]: T4: Ported thrive's Voice blocks into `prism-changelog`, `prism-qa-plan`, `prism-retro`, `prism-standup`, `prism-audit`, and `prism-start-ticket`, and removed `prism-retro`'s session-orientation pointer. Loaded totals are unchanged from `8cb24c49`: 50, 28, 118, 94, 61, and 116.
- 2026-11-19 [huntermcgrew/prism-537-personas]: T5: Wrote the 11 Voice blocks for the personas thrive has no skill for, from the plan's text. Loaded totals are unchanged from `8cb24c49`: `prism-onboard` 56, `prism-prd` 62, `prism-strategy` 91, `prism-market-research` 88, `prism-finance` 90, `prism-marketing` 91, `prism-sales` 92, `prism-metrics` 88, `prism-customer-success` 92, `prism-recruiting` 87, and `prism-legal` 94.
- 2026-11-19 [huntermcgrew/prism-537-personas]: T6: Added `persona-voice.test.ts` with the shape, no-Voice-on-utility-or-agent, and Eric's tone-line cases. Run against `main`'s skill sources, the shape and tone-line cases fail and the utility case passes.
- 2026-11-19 [huntermcgrew/prism-537-personas]: T7: Wrote ADR-0084 (0084 was free), marked ADR-0080 partly superseded, added the README rows, and listed 0084 as excluded from the seed; `prism:crossref-lint` passes and the seed has no 0084 twin.
- 2026-11-19 [huntermcgrew/prism-537-personas]: T9: Matched `docs/personas.md` to the Voice blocks for Reese, Sage, Ellis, Quinn, Remy, and Lex, and linked ADR-0084 beside ADR-0080 in the closing paragraph. `last_updated` already read 2026-11-19.
- 2026-11-19 [huntermcgrew/prism-537-personas]: Verify (part 1 of 2) at `aad413bf`: typecheck, lint, test, build, and the spec check all pass, and format is not configured. The build left the tree clean, and `spec-scope-lint` skipped itself because HEAD was detached.
- 2026-11-19 [huntermcgrew/prism-537-personas]: T7-T8 fix: Self-review round 1 corrected ADR-0084's Voice block placement to follow an atlas anchor only before the first `## ` heading, and its Neutral consequence to name both ADR-0080 notes it overturns. The rule and the skill-writing guide now say a Voice block carries three or four signature lines.
- 2026-11-19 [huntermcgrew/prism-537-personas]: T6 fix: PR review round 1's Minor is closed. `persona-voice.test.ts` now also reads each skill's `claude.md`, because the load counter exempts a Voice section there too; a temporary Voice line in `prism-plan`'s `claude.md` failed the utility and agent case.
- 2026-11-19 [huntermcgrew/prism-537-personas]: T6 fix: PR review round 2's nit is closed. The `claude.md` and utility-or-agent checks now match a Voice heading by `trimEnd()` like `stripVoice`, so `## Voice ` with a trailing space fails them; a temporary one in `prism-plan` and in `prism-architect` each failed its case.
- 2026-11-19 [huntermcgrew/prism-537-personas-part2]: Part 1 (T1 to T9) shipped as #541, squash-merged at d83ffd7a with CI green on both legs at 166a62c5. This commit records those tasks as shipped, because the squash leaves no task subjects on main.
- 2026-11-19 [huntermcgrew/prism-537-personas-part2]: T10: Added `prism-debug` (Sasha) from thrive's debugger, routed the four broken-behavior phrases to it, listed it in both `skills-ecosystem.md` files, and changed `autonomous-bug-fixing.md` and the `AGENTS.md` norms row to "own it". `measureSkillLoad` charges `prism-debug` 107 lines with no counted file, and the `AGENTS.md` lead set ends at byte 31,708, under the 31,744 limit.
- 2026-11-19 [huntermcgrew/prism-537-personas-part2]: T13: Added Sasha's debugger entry to `docs/personas.md` under Build & ship after Clove, with Mira as the handoff and a link to the `prism-debug` skill folder.
- 2026-11-19 [huntermcgrew/prism-537-personas-part2]: T11: Added the Diagnosis mid-ticket move to `ticket-workflows.md` and its curated twin, and reworded the Bug bullet to "Skip the intent unless the cause is unknown". Added a Sasha row to `closing-messages.md`, rerouted Nora's unknown-root-cause route to Sasha then Mira, and gave `prism-start-ticket`'s handoff sentence a `prism-debug` route.
- 2026-11-19 [huntermcgrew/prism-537-personas-part2]: T12: Wrote ADR-0085 (the debugger returns as `prism-debug`) and marked ADR-0079 partly superseded, with a README row and a seed `excluded` entry. ADR text names the source repo only as lowercase thrive; challenge round 3's convention line was not written as prose, because `literal-guard.ts` already fails the build on the capitalized form.
- 2026-11-19 [huntermcgrew/prism-537-personas-part2]: T10-T13 fix: Self-review round 1 routes Sasha's diagnosis to Clove inside a ticket whose intent is already approved and a bug outside its scope to Nora, in the skill, both workflow docs, the closing and handoff tables, and ADR-0085. Nora's roster texts now name Sasha first for an unknown cause, ADR-0085 answers ADR-0079's rejection and cites thrive's debugger, and `prism-debug` measures 107 loaded lines.
- 2026-11-19 [huntermcgrew/prism-537-personas-part2]: T10-T13 fix: Self-review round 1 batch 2 names ADR-0085 in the 0014, 0036, and 0045 banners and qualifies ADR-0085's full-chain consequence for an approved ticket. `routing-coverage.test.ts` now fails on a phrase in two rows and when "this is broken" leaves Sasha's row, and a mutation of each failed it.
- 2026-11-19 [huntermcgrew/prism-537-personas-part2]: T10,T12 fix: Self-review round 2 rewords ADR-0085's snapshot claim to what the check delivers and names both handoff routes in `prism-debug`'s step 7, checklist, first sentence, description, and both roster rows. `routing-coverage.test.ts` now pins all four phrases to Sasha's row, and moving "it's not working" back to Clove's row failed it.
- 2026-11-19 [huntermcgrew/prism-537-personas-part2]: T10,T13 fix: PR review round 1 gives the consumer `AGENTS.md.tmpl` the Sasha routing row, "own it" wording, and ownership and handoff entries. Sasha's Cross-skill Handoffs rows and her roster entry now name the Nora route, and `routing-coverage.test.ts` drops its assertion count and lists its two routing-table checks in the header.

## Sessions

- 2026-11-19 [huntermcgrew/prism-537-personas] open: Intent: plan child 7 (personas) to the detail bar from the epic spec and thrive at db3570975. Bounds: the plan file only, nothing outside the spec's Affected systems, no new dependency, and intent-level or shared-type questions reported to Hunter. Approach: port thrive's Voice blocks, allowance, unique-name check, and debugger with the spec's swaps, write the 11 missing blocks from the pre-PRISM-499 skill text, and pay the routing bytes inside `skill-routing.md`. · close: drifted — added edits the spec did not name to `autonomous-bug-fixing.md`, `AGENTS.md`'s norms row, `CONTEXT.md`, and Nora's three bug-route texts, each one a doc the change makes false, recorded as a Decision with Winston's fit verdict; challenge ran four rounds (clean, blocking 1, blocking 1, resolved 1); auto-approve --check exits 1 on the missing spec.md, so Hunter approves.

## Verification

verdict: done
base: d83ffd7a43a7faf73e530c9d69db1ee2ab973651
head: d2b95fc0da303e167fd4a90d11907c41912ec760

| check | result | evidence |
| --- | --- | --- |
| typecheck | pass | /tmp/claude-1000/-home-zibbix-Projects-PRISM--claude-worktrees-prism-personas-handoff-9543ef/b5b3cef5-428f-4603-b5db-5f5291220dc9/scratchpad/typecheck.d2b9.log |
| lint | pass | /tmp/claude-1000/-home-zibbix-Projects-PRISM--claude-worktrees-prism-personas-handoff-9543ef/b5b3cef5-428f-4603-b5db-5f5291220dc9/scratchpad/lint.d2b9.log |
| test | pass | /tmp/claude-1000/-home-zibbix-Projects-PRISM--claude-worktrees-prism-personas-handoff-9543ef/b5b3cef5-428f-4603-b5db-5f5291220dc9/scratchpad/test.d2b9.log |
| build | pass | /tmp/claude-1000/-home-zibbix-Projects-PRISM--claude-worktrees-prism-personas-handoff-9543ef/b5b3cef5-428f-4603-b5db-5f5291220dc9/scratchpad/build.d2b9.log |
| format | n/a: not configured | none |
| spec | pass | /tmp/claude-1000/-home-zibbix-Projects-PRISM--claude-worktrees-prism-personas-handoff-9543ef/b5b3cef5-428f-4603-b5db-5f5291220dc9/scratchpad/spec.d2b9.log |

### Failures

- none

## Review

- self-review round 1 at a2d2de63 (part 1 of 2): 0 critical, 1 major, 0 minor, 2 nit
  - **Major, standards violation: ADR-0084 states the Voice block's placement more broadly than the code.** fixed fdff4abc. `.prism/spec/adrs/_toolkit/0084-persona-skills-carry-a-short-voice.md:18` says the block sits "below the job statement and any `<!-- atlas:... -->` anchor". In `prism-start-ticket` the anchor is at lines 61 to 63, below the block at line 3. A reader trusting the ADR would move that anchor above the block, or flag the skill as breaking the ADR. The architect-doc-verification rule, under its diverged-claims heading, sets a diverged claim in an ADR at Major or above.
    - Class: a placement rule in a decision record stated without the qualifier its source plan Decision carries.
    - Sweep: `grep -n 'atlas:\|^## Voice' .ai-skills/skills/*/shared.md` over all persona skills, plus `git grep -n "atlas:"` in `skill-authoring.md`, `writing-a-skill.md`, the ADR README, and `CONTEXT.md`. Only `prism-start-ticket` has an anchor below its block, and no other doc repeats the claim.
    - Fix: change the clause to "below the job statement and any `<!-- atlas:... -->` anchor that comes before the first `## ` heading", then run `pnpm prism:build` so the three platform copies follow.
  - **nit: the rule and guide summaries leave out the signature lines.** fixed fdff4abc. `.prism/rules/skill-authoring.md:18` and `.prism/architect/guides/writing-a-skill.md:22` describe the block as "identity, tone, and a greeting". ADR-0084 and `persona-voice.test.ts` also require three or four signature lines. Both texts follow T8's dictated wording, and the shape test catches an author who leaves them out.
    - Class: a short summary of a shape that drops one of the parts the full definition requires.
    - Sweep: `grep -n "identity, tone" .prism/rules .prism/architect CONTEXT.md -r` found only these two lines.
    - Fix: change both to "identity, tone, signature lines, and a greeting". The guide must stay one line, because `prism-forge-skill` loads 119 lines.
  - **nit: ADR-0084's Neutral line leaves out a second ADR-0080 claim that no longer holds.** fixed fdff4abc. `.prism/spec/adrs/_toolkit/0084-persona-skills-carry-a-short-voice.md:54` lists only ADR-0080's "session's own voice" note. ADR-0080 line 45 also says persona and utility skills differ "only in routing and in agent-adapter generation", and ADR-0080's new banner says "the rest of this decision stands".
    - Class: a superseding ADR that lists only some of the superseded claims.
    - Sweep: read ADR-0080's Context, Decision, and Consequences in full. The banner's first clause covers its line 42, and line 45 is the only other one.
    - Fix: add to the Neutral line that the Voice block is now a third difference between persona and utility skills.
  - Criteria (part 1 range, T1 to T9):
    - AC-1: met (machine). `persona-voice.test.ts` passes, and a diff against the source repo at the pinned sha shows the 13 ported blocks byte-identical apart from the two listed swaps. The 11 written blocks match T5's text. Human evidence pending.
    - AC-2: met. All three `skill-loaded-lines.test.ts` cases pass at a2d2de63.
    - AC-3: met. The case-folding `discovery-metadata.test.ts` case passes, and `build.ts` calls `buildRoleMap`.
    - AC-4: met (machine). The tone-line case passes. Human evidence pending until a scratch-PR run.
    - AC-5, AC-6: out of range for part 1 (T10).
    - AC-7: half met. ADR-0084 is accepted, ADR-0080 carries its banner, and `prism:crossref-lint` passes. The ADR-0085 half is part 2.
    - AC-8: met for part 1. Every skill T3 to T5 touched measures at or under 120 with no allowlist entry, matching `## History`. `prism-debug` is part 2.
    - AC-9: met for part 1. No lead rule changed, and `agents-md-budget.test.ts` passes in the verify run.
    - AC-10: pending, because no PR or CI run exists yet.
- self-review round 2 at 1ffa2bf8 (part 1 of 2): clean
  - Range `94c73989..1ffa2bf8`. All three round 1 findings are fixed in fdff4abc. ADR-0084 line 18 now limits the anchor to one before the first `## ` heading, and every persona `shared.md` has `## Voice` as its first `## ` heading. The rule and the guide now list three or four signature lines, matching ADR-0084's list. The Neutral line now names both ADR-0080 notes, its lines 42 and 45.
  - Sweep: `git grep -n "identity, tone" -- ':!.prism/plans'` finds only the fixed lines and their generated copies. `pnpm prism:build` leaves the tree clean, and the `.claude`, `.codex`, `.cursor`, and install-template copies match. `skill-loaded-lines.test.ts` and `persona-voice.test.ts` pass, 12 of 12, and `prism:crossref-lint` passes.
  - Criteria: unchanged from round 1. The fix commits touch no criterion's evidence, and AC-2 and AC-8 still hold at 1ffa2bf8.
- pr-review round 1 at 2a6aa063 (part 1 of 2): 0 critical, 0 major, 1 minor, 0 nit
  - **Minor, bug: the Voice allowance reaches `claude.md`, but the shape checks read only `shared.md`.** fixed 33050911. `scripts/ai-skills/persona-voice.test.ts:35` reads only `shared.md`, while `stripVoice` runs over both body files (`scripts/ai-skills/lib/skill-loaded-lines.ts:18`). A `## Voice` in any skill's `claude.md`, a utility's or an agent's included, gets 16 uncharged lines and no test fails.
    - Class: a measurement exemption that applies to more files than the check guarding it reads.
    - Sweep: `git grep -c '^## Voice' 2a6aa063 -- '.ai-skills/skills/*/claude.md' '.ai-skills/skills/*/references/*'` found none.
    - Fix: have `readSkillLines` read every body file that exists. The persona case asserts `claude.md` has no `## Voice` line, and the utility and agent case checks both files.
  - Every pass swept or n/a, and CI is green on both legs at 2a6aa063. AC-1 and AC-4 human evidence are still open and posted on the PR. This run's own comments carry no greeting or signature line, which can serve as AC-4's scratch-PR evidence.
- pr-review round 2 at 49ee05ef (part 1 of 2): 0 critical, 0 major, 0 minor, 1 nit
  - Range `1c02dec8..49ee05ef`. Round 1's Minor is fixed in 33050911: a temporary `## Voice` in the `claude.md` of `prism-plan`, `prism-verify`, and `prism-architect` failed both test cases, and the test passes 3 of 3 once reverted. The thread is resolved.
  - **nit, bug: the new `claude.md` guards match `## Voice` exactly, but `stripVoice` matches it after `trimEnd()`.** fixed 717c04f8, merged without another round on Hunter's call. `scripts/ai-skills/persona-voice.test.ts:100` and line 114 use `Array.includes("## Voice")`, while `scripts/ai-skills/lib/skill-loaded-lines.ts:150` exempts `line.trimEnd() === "## Voice"`. A `## Voice ` heading with a trailing space in a `claude.md`, or in a utility or agent `shared.md`, gets the allowance and the test still passes 3 of 3.
    - Class: an exemption check that normalizes its input more loosely than the guard enforcing it.
    - Sweep: `grep -n '"## Voice"' scripts/ai-skills/persona-voice.test.ts` finds lines 50, 61, 66, 100, and 114. Lines 50 to 66 sit behind the persona shape check, which fails on a non-exact heading, so only 100 and 114 let one through.
    - Fix: compare trimmed lines at both sites, or decline with a one-line reason.
  - Every pass swept or n/a. CI was pending on both legs at 49ee05ef. AC-1 and AC-4 human evidence are still open, unchanged from round 1. Labels now `effort:deep` and `confidence:needs-judgment`.
- self-review round 1 at a7a496f8: 0 critical, 0 major, 5 minor, 2 nit
  - Range `d83ffd7a..a7a496f8` (T10 to T13). Coverage: correctness swept, regressions swept, security swept (one boundary, the new persona's log and env collection, covered by its redaction self-check), architecture swept, intent-scope swept, simpler paths swept, accessibility n/a (no UI), docs and citations swept, contracts swept (ADR-0085 and the `roles.json` entry), performance n/a (no render path, query, or bundle).
  - **Minor, standards violation: Nora's bug handoff in two roster texts still names only Clove.** fixed 4f143338. `.prism/architect/_toolkit/skills-ecosystem.md:87`, the Nora row of Cross-skill Handoffs, reads "Clove (bugs)", and `docs/personas.md:88` reads "or Clove for a bug". T11 changed `prism-start-ticket` line 59 and `closing-messages.md` line 25 to send a bug with an unknown root cause to Sasha, so a reader of either roster text routes it to Clove.
    - Class: a route change written into the skill and one routing table but not into sibling tables that describe the same handoff.
    - Sweep: `git grep -n -i 'Clove (bug\|Clove for a bug\|bug goes to'` over `.prism`, `docs`, and `templates/install` found these two plus the seed twin of `skills-ecosystem.md`. `.prism/templates/ticket-types.md:14` is a typical-workflow line and stays true.
    - Fix: "Clove (bugs; Sasha first when the root cause is unknown)" in `skills-ecosystem.md` and its curated twin, and "or Clove for a bug, or Sasha first when its cause is unknown" in `docs/personas.md`.
  - **Minor, bug: the Diagnosis move has no landing inside a ticket whose intent is already approved.** fixed 4f143338. `.prism/architect/_toolkit/ticket-workflows.md:110-115` files `[any skill] → Sasha → Mira` under Mid-Ticket Moves, defined at line 91 as moves made while implementation is in progress. When Clove hits an unknown cause mid-build and takes it, Sasha's Handoff (`.ai-skills/skills/prism-debug/shared.md:102`) offers `prism-intent`, and `prism-intent/shared.md:24` treats a folder with an approved `intent.md` as done, so the diagnosis lands nowhere. The skill's job line (`shared.md:9`) also justifies the no-change lane with "because no plan folder exists until the intent stage creates one", which is false on this path, and its own Startup (line 36) looks up an existing plan.
    - Class: a handoff route written for the fresh-ticket case and filed where callers in a different state also take it.
    - Sweep: `grep -n "no plan folder exists\|Offer \`prism-intent\`" .ai-skills/skills/prism-debug/shared.md` found lines 9 and 102. `grep -n "Mid-Ticket Moves\|Sasha" .prism/architect/_toolkit/ticket-workflows.md` found the move at 110 to 115 and the same text in the curated twin. `closing-messages.md` and `skills-ecosystem.md` route only the fresh Nora case.
    - Fix: one sentence in the Diagnosis paragraph (canonical and twin) and in the skill's Handoff: inside a ticket whose intent is approved, the report goes back to the calling skill, which records it under `## Debugged Issues`, and a bug outside that ticket's scope goes to Nora. Reword line 9's reason to "because the diagnosis lands in the intent's Problem section or with the skill that called you, and the fix belongs to the build". `prism-debug` has 13 lines of headroom.
  - **Minor, standards violation: ADR-0085 chooses the option ADR-0079 rejected without answering ADR-0079's reason.** fixed 4f143338. `.prism/spec/adrs/_toolkit/0085-the-debugger-returns-as-prism-debug.md:10-12`. ADR-0079 line 32 rejected "Keep Sasha as a slimmed debugger" because ranked hypotheses and cleanup are method a frontier model already applies, leaving little policy. ADR-0085 cites only the unmeasured alternative, the amended intent, and the cap fit. The ADR guide, under its Three sections heading, says a decision without its context reads as arbitrary.
    - Class: a reversing ADR that does not answer the reversed ADR's stated reason for rejecting the option it now chooses.
    - Sweep: read ADR-0084 against ADR-0080; ADR-0084 line 10 answers the matching rejection. ADR-0085 is the only other reversing ADR in the range.
    - Fix: one or two sentences in Context naming the policy the body carries that a model would not apply unprompted: the no-change lane checked against the Startup snapshot, the tagged cleanup grep run twice, the report shaped for an intent's Problem, and the routing ownership.
  - **Minor, standards violation: three ADR amendment banners still say Sasha is retired.** fixed b0f8a671. `.prism/spec/adrs/_toolkit/0014-plan-section-ownership.md:8`, `0036-security-as-distributed-rule.md:8`, and `0045-skill-content-disclosure-model.md:9`. ADR-0085 brings her back, so a reader landing on any of the three reads a premise that no longer holds, though the conclusions of 0014 and 0036 still stand.
    - Class: amendment banners that restate a premise after a later ADR partly reverses it.
    - Sweep: `git grep -n 'ADR-0079' -- .prism ':!.prism/plans'` found these three, ADR-0085, the README, and ADR-0079 itself.
    - Fix: qualify each clause, for example "Sasha was retired; ADR-0085 brings her back as `prism-debug`, which changes no source, so Clove or any implementer still creates the entries." Rebuild so the platform copies follow.
  - **Minor, standards violation: no committed test pins the phrase move.** fixed b0f8a671. `scripts/ai-skills/routing-coverage.test.ts:96` counts skill IDs per section and never phrases, so putting "this is broken" back in the Clove row of `.prism/rules/skill-routing.md` and its seed twin passes every test. AC-6's machine evidence lives only in T10's proof line. A mutation run of that edit printed `pass 4, fail 0`. The test file is outside T10's list, so the fix needs a scope-change Decision.
    - Class: a behavior whose only check is a one-off proof command in the plan, never committed as a test.
    - Sweep: `grep -n 'occurrences' scripts/ai-skills/routing-coverage.test.ts` found lines 96 and 111, both ID counts. AC-5's two greps are pinned only by proof lines too, at lower stakes.
    - Fix: add a routing-coverage case asserting each quoted signal phrase appears in exactly one routing-table row, in the canonical file and the seed twin.
  - **nit: ADR-0085 cites "thrive's debugger at the reference tip".** fixed 4f143338. `.prism/spec/adrs/_toolkit/0085-the-debugger-returns-as-prism-debug.md:12`. A cold reader cannot resolve "the reference tip", and References does not cite the source file, where ADR-0084 does. Sweep: `git grep -n "reference tip" -- .prism ':!.prism/plans'` found only this line. Fix: name thrive's `.ai-skills/skills/thrive-debugger/shared.md` and add it to References, keeping `thrive` lowercase.
  - **nit: the Startup `git status -s` snapshot cannot see a new change inside a file the person already had dirty.** declined: ported verbatim from thrive's debugger; diverging from the port is out of scope for this child. `.ai-skills/skills/prism-debug/shared.md:36`, checked at lines 79 and 106. Ported verbatim from thrive. Sweep: `grep -n 'git status -s' .ai-skills/skills/prism-debug/shared.md` found the three lines. Fix: snapshot `git diff` content instead, or decline because the skill already forbids untagged edits and the tagged grep covers its logging.
  - Criteria (part 2 range, T10 to T13):
    - AC-5: met (machine, executed). `grep -c 'DEBUG-<hash>'` prints 2, the lessons-entry line is present, and `skill-loaded-lines.test.ts` passes with no allowlist entry. Human evidence pending.
    - AC-6: met (machine, executed). `routing-coverage.test.ts` passes, the Sasha row holds the four phrases in the canonical file and the seed twin, and neither Clove row holds any. Human evidence pending.
    - AC-7: met (executed). ADR-0085 is accepted, ADR-0079 carries its banner, no seed copy exists, and `prism:crossref-lint` passes.
    - AC-8: met (executed). `prism-debug` measures 107 loaded lines with no allowlist entry, recorded in `## History`.
    - AC-9: met (executed). `agents-md-budget.test.ts` passes, and the lead set ends at byte 31,708.
    - AC-10: pending, because no PR or CI run exists for part 2.
    - AC-1 to AC-4: unchanged from part 1. `persona-voice.test.ts` passes with `prism-debug` added.
- self-review round 2 at 03316576: 0 critical, 1 major, 1 minor, 2 nit
  - Range `ee86ae1c..03316576`. Round 1's five Minors and its taken nit are fixed as marked: the Nora rows in `skills-ecosystem.md` (and its seed twin) and `docs/personas.md` name Sasha, the Diagnosis move, `closing-messages.md`, and the skill's Handoff route an approved ticket to Clove, ADR-0085's Context answers ADR-0079's rejection, the three banners read "was retired" and name ADR-0085, the reference-tip wording is gone, and `routing-coverage.test.ts` gains a two-rows check plus a pin. Coverage: correctness swept, regressions swept (the full-range half rests on round 1 plus the unchanged verify run at 9239b452), security swept (no items, the test reads repo files only), architecture swept, intent-scope swept, simpler paths swept, accessibility n/a (no UI), docs and citations swept, contracts swept (ADR-0085's claims), performance n/a (no hot path).
  - **Major, standards violation: ADR-0085's new Context sentence promises more than the snapshot check delivers.** fixed 0ce0838f. `.prism/spec/adrs/_toolkit/0085-the-debugger-returns-as-prism-debug.md:14` says the `git status -s` snapshot check means "the person's own uncommitted edits are never touched". The skill (`.ai-skills/skills/prism-debug/shared.md:36`) says only that those edits are "never yours to remove", and round 1's declined nit records that the snapshot cannot see a new change inside a file the person already had dirty. A reader trusting the ADR would treat the snapshot as protection it is not. The architect-doc-verification rule, under its severity heading, puts a diverged ADR claim at Major or above.
    - Class: a justification sentence that turns a procedural instruction into an outcome guarantee.
    - Sweep: `git grep -n "never touched\|never yours to remove" -- .prism .ai-skills docs ':!.prism/plans'` found only this ADR line and the skill line it paraphrases.
    - Fix: "checks `git status -s` against a startup snapshot, so its cleanup leaves the person's own uncommitted edits alone", then rebuild the platform copies.
  - **Minor, bug: the approved-ticket route reached the skill's Handoff but not the run steps a model follows first.** fixed 0ce0838f. `.ai-skills/skills/prism-debug/shared.md:26`, run step 7, still reads "then offer `prism-intent`", and the Definition of Done at line 120 checks "`prism-intent` was offered". Sasha called mid-build inside an approved ticket follows step 7 and the checklist and offers the intent stage, which line 102 now says is wrong for that case. The first sentence at line 1, the `frontmatter.yml` description, the roster role in `.prism/architect/_toolkit/skills-ecosystem.md:40`, and the ADR README's 0085 row also name only the intent route.
    - Class: a route change written into one section of a skill and not into sibling sections that state the same handoff.
    - Sweep: `grep -n 'prism-intent' .ai-skills/skills/prism-debug/shared.md` found lines 1, 26, 91, 102, and 120; `git grep -n -i "intent's Problem\|Problem section" -- .prism .ai-skills docs ':!.prism/plans'` found the roster row and README row above, and `closing-messages.md`, `ticket-workflows.md`, the Cross-skill Handoffs row, and `docs/personas.md` already carry both routes.
    - Fix: step 7 and the checklist item read "offer the next stage per the Handoff section", and line 1, the description, and the roster role name both routes. The README row may stay, since it summarizes the Decision's main path. Rebuild after.
  - **nit, bug: the routing test pins one of the four moved phrases.** fixed 0ce0838f. `scripts/ai-skills/routing-coverage.test.ts:137-142` asserts only "this is broken" sits in the `prism-debug` row, so moving "it's not working" from the Sasha row back to Clove's passes. The scope-change Decision for this test chose that pin on purpose ("the pin catches a full revert"), so this is a nit and not a Minor. Sweep: `grep -n 'this is broken' scripts/ai-skills/routing-coverage.test.ts` found only lines 137 to 141. Fix: loop the pin over the four phrases AC-6 names, or decline citing the Decision.
  - **nit, standards violation: the test comment states a cause nothing in the repo produces.** fixed 0ce0838f. `scripts/ai-skills/routing-coverage.test.ts:120-121` says "the first match wins by accident of table order", but a model reads the whole table to route, and no code picks the first match. Sweep: `grep -rn "first match wins" scripts/` found only this line. Fix: "makes routing ambiguous, because one phrase names two skills".
  - Criteria: unchanged from round 1. AC-6's machine half still holds at 03316576, with the pin narrower than its evidence text, per the nit above. AC-10 is pending, because no PR exists for part 2.
  - Out of scope: the Bug workflow in `ticket-workflows.md` still has Clove record the finding in `## Debugged Issues`, which a folder plan does not carry. That text predates this branch.
- self-review round 3 at a8777ee3: clean
  - Range `f7502cb7..a8777ee3`. Round 2's Major, Minor, and two nits are confirmed fixed at 0ce0838f, and d2b95fc0 only trims the repeated routes from the skill's first paragraph. ADR-0085's Context now says the snapshot check makes the cleanup leave the person's edits alone, which matches the skill. Step 7 and the Definition of Done defer to the Handoff section, which names all three routes, and the first sentence, the description, and both roster rows (canonical and seed twin) name the Clove route. Coverage: correctness swept, regressions swept (verify passed at d2b95fc0, and a8777ee3 touches only the plan), security n/a (no executable change beyond a test that reads repo files), architecture swept, intent-scope swept, simpler paths swept, accessibility n/a (no UI), docs and citations swept, contracts swept (ADR-0085's snapshot sentence), performance n/a (no hot path).
  - Sweep proof: removing "it's not working" from the Sasha row of `templates/install/.prism/rules/skill-routing.md` failed `routing-coverage.test.ts` (pass 3, fail 1, naming that phrase), so the four-phrase pin covers the seed twin too. `git grep "Problem section\|intent's Problem"` outside the plans finds no handoff text left with only the intent route, apart from the ADR README row that round 2 left as is.
  - Criteria: unchanged from round 2, and AC-6's pin now matches its evidence text. AC-10 is still pending, because part 2 has no PR yet.
- pr-review round 1 at 371f6f02: 0 critical, 0 major, 3 minor, 2 nit
  - Range `d83ffd7a..371f6f02`, the full PR. Coverage: correctness swept, regressions swept, security swept, architecture swept, intent-scope swept, simpler paths swept, accessibility n/a (no UI), docs and citations swept, contracts swept, performance n/a (no hot path).
  - **Minor, standards violation: the consumer `AGENTS.md` template still routes broken behavior to Clove.** fixed d4da16d8. `templates/install/AGENTS.md.tmpl:29` keeps the four phrases and "describes unexpected behavior" in Clove's row, line 89 still says "just fix it", and its ownership and handoff tables have no Sasha. 020859f7 edited exactly these lines when it retired Sasha.
    - Class: a reversed routing move written into the canonical rule and its twin but not into a hand-maintained shipped template the original move edited.
    - Sweep: `git grep -n -e '"this is broken"' -e 'just fix it' -e 'just fix the bug' -- ':!.claude' ':!.codex' ':!.cursor' ':!.prism/plans'` found only lines 29 and 89 of the template.
    - Fix: mirror what 020859f7 removed, under a scope-change Decision, because the file is outside T10's list.
  - **Minor, standards violation: `docs/workflow.md:37` still sends every mid-implementation bug to Clove, and its persona table has no Sasha row.** declined: docs/workflow.md belongs to child 9 (release), which rewrites it; it was already stale on main.
    - Class: a workflow change written into the persona reference doc but not into the narrative workflow doc describing the same handoff.
    - Sweep: `grep -rn -i 'bug' docs/*.md docs/**/*.md | grep -i 'clove\|nora\|diagnos\|root cause\|retired'` found only this line and the updated `docs/personas.md` lines.
    - Fix: name Sasha first for an unknown cause on line 37 and add a Sasha row, under the same Decision.
  - **Minor, plan drift: T10, T11, and T13 still dictate the pre-amendment handoff strings.** acknowledged: the tasks stay the record of what was planned; the amended Sasha workflow Decision records the approved-ticket route that shipped, and editing Tasks would void the plan approval. The approved-ticket route amended into the Sasha workflow Decision shipped, while the task texts at lines 457, 485, 486, 504, 510, and 555 give only the intent route. The tasks stay as written, per `.prism/review/intent-scope.md` under its heading on reconciling plan drift.
    - Class: a Decision amended mid-build without the task texts that dictate the same strings.
    - Sweep: `grep -n "Problem section\|intent's Problem" .prism/plans/prism-537/plan.md` over the tasks found those six sites.
    - Fix: the plan stage carries the amendment into the task texts, or the author acknowledges it on the PR thread.
  - **nit: the Sasha row in Cross-skill Handoffs, its seed twin, and `docs/personas.md:50` leave out the route to Nora for a bug outside the ticket**, which the skill, `closing-messages.md`, and `ticket-workflows.md` carry. Fix: add the Nora route, or decline because `closing-messages.md` is the one table listing every route. Status: fixed d4da16d8.
  - **nit: `scripts/ai-skills/routing-coverage.test.ts:64` says "the five parity assertions"**, and the header at lines 4 to 14 lists only the original checks, while the function now runs the two-rows check and the four-phrase pin. Fix: drop the count and add a header bullet. Status: fixed d4da16d8.
  - Pause trigger: fixing the first two Minors edits files outside the plan, so that question goes to the person.
  - Criteria:
    - AC-1 to AC-4: met (executed). `persona-voice`, `skill-loaded-lines`, and `discovery-metadata` pass. Human evidence for AC-1 and AC-4 is pending.
    - AC-5: met (executed) for its machine half. Human evidence is pending.
    - AC-6: met (executed) for its machine half. Moving "this is broken" back to Clove's row failed `routing-coverage.test.ts`. Human evidence is pending.
    - AC-7: met (executed). `prism:crossref-lint` passes.
    - AC-8: met (executed). `prism-debug` measures 107 lines with no allowlist entry.
    - AC-9: met (executed). `agents-md-budget.test.ts` passes.
    - AC-10: met (executed). `prism-check` passes on ubuntu-latest and windows-latest at 371f6f02.

## Acceptance Criteria

The issue's criteria, with IDs and evidence.

- [ ] **AC-1** Each persona skill carries a Voice block right after its job statement, in thrive's ADR-0054 shape: an identity line, an optional scene line, a tone line, three or four signature lines, and one greeting instruction.
  - Evidence (machine): `persona-voice.test.ts` passes its "every persona skill opens with one Voice block" and "no utility or agent skill carries a Voice block" cases, over every role in `roles.json` with a `persona` · UNMET looks like: a persona skill with no block, two blocks, a block that is not the first `## ` section, or two signature lines.
  - Evidence (human): reading each block in the diff, none holds a rule from its skill's body, and none runs past 16 lines · UNMET looks like: a signature line that restates a procedure step.
- [ ] **AC-2** `measureSkillLoad` skips the first 16 lines of each `## Voice` section. A skill with a 12-line Voice block is charged nothing for it, and one whose Voice block runs past 16 lines is charged for the extra lines.
  - Evidence (machine): `skill-loaded-lines.test.ts` passes "charges nothing for a Voice block of 16 lines or fewer" (an 11-line section, body 7), "charges each Voice line past the sixteenth" (a 20-line section, body 11), and "skips only a heading that is exactly ## Voice" (body 18) · UNMET looks like: a body of 18 in the first case or 27 in the second.
- [ ] **AC-3** The build fails when two roles share a persona name.
  - Evidence (machine): `discovery-metadata.test.ts` passes "buildRoleMap rejects two roles that share a persona name, ignoring case", and `build.ts` calls `buildRoleMap` · UNMET looks like: `Twin` and `twin` both accepted.
- [ ] **AC-4** Eric's Voice block shows in chat and never in a GitHub comment.
  - Evidence (machine): `persona-voice.test.ts` passes "Eric's tone line keeps his voice out of his GitHub comments" · UNMET looks like: a tone line without `never in the comments`.
  - Evidence (human): run `prism-pr-review` on a scratch PR. Its chat report may open in Eric's voice, and no inline comment or summary comment it posts holds a greeting or a signature line from his block. Record the PR number in `## History` · UNMET looks like: "Eric here!" or "Really clean pattern here." in a posted comment.
- [ ] **AC-5** `prism-debug` exists, ported from thrive and trimmed to the cap. It changes no file except a lessons entry, and it tags and removes its own temporary logging.
  - Evidence (machine): `.ai-skills/skills/prism-debug/shared.md` exists, and `skill-loaded-lines.test.ts` passes with no `prism-debug` allowlist entry. `grep -c 'DEBUG-<hash>' .ai-skills/skills/prism-debug/shared.md` prints at least 2, and `grep -q 'no file changed except a lessons entry' .ai-skills/skills/prism-debug/shared.md` exits 0 · UNMET looks like: an allowlist entry, or a body with no tag rule or no cleanup grep.
  - Evidence (human): on a scratch branch with a planted bug, run Sasha to a report. `git status -s` after the run shows no change except `.prism/lessons.md`, and `grep -rn "\[DEBUG-" .` prints nothing · UNMET looks like: a leftover log line or an edited source file.
- [ ] **AC-6** "Sasha" and the routing phrases for broken behavior route to `prism-debug` instead of `prism-implement`.
  - Evidence (machine): `routing-coverage.test.ts` passes with `prism-debug` as an `auto` role. The Sasha row in `.prism/rules/skill-routing.md` holds the four phrases, and the Clove row holds none of them, which T10's proof checks · UNMET looks like: a phrase in both rows, or no Sasha row in the seed twin.
  - Evidence (human): in a fresh session, "Sasha, look at this" and "this is broken" each start `prism-debug` · UNMET looks like: either one starting `prism-implement`.
- [ ] **AC-7** An ADR records that Voice returns, reversing part of ADR-0080, and the debugger's supersession of ADR-0079 is recorded.
  - Evidence (machine): `0084-persona-skills-carry-a-short-voice.md` and `0085-the-debugger-returns-as-prism-debug.md` exist with `Status: accepted`. ADR-0080 holds `Partly superseded by [ADR-0084]` and ADR-0079 holds `Partly superseded by [ADR-0085]`, and `prism:crossref-lint` passes · UNMET looks like: either note missing, or an ADR copied into the seed.
- [ ] **AC-8** Every skill this child writes or rewrites fits the 120-line cap, or carries an allowlist entry with a one-line reason.
  - Evidence (machine): `skill-loaded-lines.test.ts` passes, and `## History` records the measured totals for `prism-debug`, every persona skill T3 to T5 edit, and `prism-forge-skill` · UNMET looks like: a total over 120 with no entry and no reason.
- [ ] **AC-9** Every lead section of `AGENTS.md` still ends inside the first 32 KiB.
  - Evidence (machine): `agents-md-budget.test.ts` passes, and T10's proof prints an end offset at or under 31,744, which `## History` records · UNMET looks like: an offset past 32,768.
- [ ] **AC-10** The whole check suite passes on both CI platforms.
  - Evidence (machine): each part's `prism-check` CI is green on `ubuntu-latest` and `windows-latest` · UNMET looks like: either leg red.

### AC Sync Log

| Date | Agent | Action | Plan | Ticket |
| ---- | ----- | ------ | ---- | ------ |
| 2026-11-19 | plan stage | Wrote AC-1 to AC-10 from issue #537's ten criteria, adding IDs and Evidence only; the wording matches the issue | written | synced |

## PR Readiness

Retro:
