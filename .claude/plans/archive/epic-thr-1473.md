# Plan: epic-thr-1473

## Ticket

[THR-1473 — AI Skills Ecosystem Upgrade](https://linear.app/tractru/issue/THR-1473/ai-skills-ecosystem-upgrade)

## Goal

Upgrade the AI skills ecosystem with ticket type awareness, shared templates (bug report, PR description, AC), structured handoffs, Gherkin-style acceptance criteria, epic/story management, and a skills ecosystem architecture doc that all agents load on startup.

---

## Decisions

- Shared templates live in `.claude/templates/` — single source of truth, all skills reference them, never duplicate content in skill files
- Ticket type detection uses Linear labels first (`bug`, `feature`, `improvement`), user prompt as fallback — no heuristic guessing
- Plan is source of truth for bug reports; Linear is the broadcast channel — Sasha's Linear gate is opt-in
- Gherkin AC (`Given/When/Then`) for user interactions; plain checklist for non-behavioral constraints
- AC adjustments by agents are `proposed` — human accepts/rejects before they're final; agents never silently modify AC
- Epic threshold: >5 tasks crossing system boundaries; default to story, promote to epic when plan reveals scope
- `## Debugged Issues` in plan template extended with full bug report fields (severity, environment, repro steps, expected/actual) — not replaced with a new section
- PR description template mirrors GitHub's `PULL_REQUEST_TEMPLATE.md` structure: `## Summary` first, `## Checklist` last, custom sections between
- Immediate decision promotion: when Winston writes a decision that affects code beyond the current ticket, promote to `.claude/architect/` immediately — don't wait for ticket close
- No UX/UI agent yet — extend Winston with design-aware flags when no mock exists
- No separate e2e test skill yet — extend Clove with e2e test offer post-implementation
- `skills-ecosystem.md` uses a `"**"` wildcard in `manifest.json` — narrow patterns (`.claude/skills/`, `.claude/templates/`) didn't match the files skills actually work on (frontend/, backend/), so the doc rarely loaded; wildcard ensures it's always in context, which also lets the LLM recommend the right skill and workflow even outside explicit skill invocations
- Nora's bug handoff goes to Sasha by default (not optional) — root cause must be verified before implementation
- Nora's improvement handoff goes to Winston; feature handoff recommends Mira but user can go straight to Winston
- Nora gains a create-ticket path (not just fetch) — QA and anyone can create structured tickets via Nora
- Any AI agent that discovers a bug uses the shared bug report template — not just Sasha
- AC is required on every ticket — Winston syncs automatically after plan mode, Clove/Briar sync when AC changes, Nora syncs on demand
- Bug report template includes Root Cause (verified/suspected), Suspected Fix (Sasha confirms), and AC — Nora fills these during verification
- AC goes under `## Acceptance Criteria` at the bottom of the Linear ticket description — replace if exists, append if not

---

## Stories

This epic breaks into 7 independently shippable stories, ordered by dependency.

### Story 1: Foundation — shared templates and ecosystem doc
Create the shared templates and skills-ecosystem.md that all subsequent stories depend on.

### Story 2: Plan template upgrade
Update `branch-plan.md` with extended `## Debugged Issues` format, new `## Acceptance Criteria` section with Gherkin format and AC adjustment mechanism.

### Story 3: Nora — ticket type awareness and create-ticket path
Add type detection, type-specific summaries, bug report template injection, create-ticket flow, and type-aware handoffs.

### Story 4: Sasha — bug report lifecycle and Linear integration
Add plan check → Linear gate → bug report creation using shared template. Any-agent bug reporting guidance.

### Story 5: Winston — Gherkin AC, epic management, immediate promotion
Add AC generation in Gherkin format, epic vs story detection and creation, immediate decision promotion rule.

### Story 6: Mira — ticket type awareness and Gherkin AC hints
Update for type-aware story writing (bugs vs features vs improvements) and Gherkin-format AC hints.

### Story 7: Clove — AC awareness and adjustment mechanism
Add AC checking before implementation, AC adjustment proposals, awareness of Gherkin format.

### Story 8: Bug template upgrade, AC sync to Linear, and handoff fixes
Update bug report template with Root Cause, Suspected Fix, and Acceptance Criteria sections. Add automatic AC sync to Linear from Winston (after plan mode), Clove (on AC change), and Briar (on AC change). Add on-demand sync via Nora. Fix handoff logic: bugs→Sasha, improvements→Winston, features→Mira/Winston.

---

## Implementation Tasks

### Story 1: Foundation — shared templates and ecosystem doc

**1.1** Create `.claude/templates/` directory

**1.2** Create `.claude/templates/bug-report.md` — the canonical bug report template:
- Severity (Critical / High / Medium / Low)
- Environment ([Staging / Production] — [URL])
- Browser/Device
- Reported By — Date
- Steps to Reproduce (numbered)
- Expected Behavior
- Actual Behavior
- Additional Context (first noticed, frequency, affected sites, related tickets)
- Attachments checklist (screenshots, console errors, network tab)

**1.3** Create `.claude/templates/ticket-types.md` — defines the three ticket types (bug, feature, improvement), their Linear labels, required fields, description structure, and typical workflow. Reference the ecosystem doc for workflow details.

**1.4** Create `.claude/templates/pr-description.md` — PR description skeleton:
- `## Summary` (always first)
- `## Changes` (file-level bullets)
- `## Acceptance Criteria` (pulled from plan)
- `**Ticket:**` line
- `## Checklist` (always last — mirrors GitHub template's checklist items)
- Note: must stay consistent with `.github/PULL_REQUEST_TEMPLATE.md`

**1.5** Create `.claude/templates/acceptance-criteria.md` — AC format reference:
- Behavioral section: Gherkin `Given/When/Then` format
- Non-behavioral section: plain checklist
- AC Adjustment block: Original / Proposed / Reason / Status

**1.6** Create `.claude/architect/skills-ecosystem.md` — full ecosystem doc as designed in this conversation (skill roster, ticket types, common workflows, epic vs story criteria, shared templates, shared plan sections ownership table, AC format, cross-skill handoffs, bug report lifecycle, rules for all skills)

**1.7** Update `.claude/architect/manifest.json` — add entry for `skills-ecosystem.md` with a broad pattern (e.g. `.claude/skills/`) so every skill loads it. Also add `.claude/templates/` pattern.

---

### Story 2: Plan template upgrade

**2.1** Update `.claude/rules/branch-plan.md` — extend `## Debugged Issues` entry format:
```markdown
### <short issue title>
- **Status:** `open` | `fixed`
- **Severity:** Critical / High / Medium / Low
- **Environment:** [where it was observed]
- **File:** `<file>:<line>`
- **Root cause:** one sentence
- **Steps to Reproduce:**
  1. [step]
- **Expected behavior:** one sentence
- **Actual behavior:** one sentence
- **Recommended fix:** minimal description
- **Suggested tests:** what to cover, or "none needed"
- **Linear:** `synced` | `not synced` | `N/A`
```

**2.2** Add `## Acceptance Criteria` section to plan template (placed after `## Implementation Tasks`):
```markdown
## Acceptance Criteria

### Behavioral
- [ ] Given [precondition], When [action], Then [outcome]

### Non-behavioral
- [ ] [Constraint or quality requirement]

### AC Adjustments
<!-- Agents propose changes here; human accepts/rejects -->
```

**2.3** Add `## User Stories` placeholder to plan template (placed after `## Goal`) — currently Mira creates this ad-hoc; make it part of the standard template so agents know where to look.

---

### Story 3: Nora — ticket type awareness and create-ticket path

**3.1** Add ticket type detection to startup step 3 (after `get_issue`):
- Check issue labels for `bug`, `feature`, `improvement`
- If no matching label: ask "Is this a bug, feature, or improvement?"
- Store type for use in subsequent steps

**3.2** Update display summary (step 4) to be type-specific:
- **Bug**: severity, environment, repro steps, expected/actual — flag missing template fields
- **Feature**: objective, scope, user stories (if they exist in plan)
- **Improvement**: current behavior, proposed change, rationale

**3.3** Add bug report template scaffolding offer:
- When type is `bug` and description is sparse or missing template fields
- Offer: "The description doesn't follow the bug report template. Want me to scaffold it?"
- On yes: populate Linear ticket description with template from `.claude/templates/bug-report.md`, pre-filling from existing description text and comments

**3.4** Add create-ticket path:
- New trigger detection: "I found a bug", "create a ticket", "new ticket", "file a bug" (distinct from "start THR-123")
- Ask for ticket type if not obvious from context
- Collect required fields based on type (bug: use template interactively; feature: objective + scope; improvement: current + proposed)
- Create Linear issue via `save_issue` with appropriate label
- Continue with branch setup as normal

**3.5** Update handoff recommendations (step 10) to be type-aware:
- **Bug**: "Root cause known? Bring in Sasha to investigate, or straight to Winston if you already know what's wrong."
- **Feature**: "This is a new feature — I'd recommend starting with Mira to define user stories before Winston plans the implementation. Want to bring her in?"
- **Improvement**: "Want to go straight to Winston, or flesh out the requirements with Mira first?"

**3.6** Update Nora's description/trigger list to include create-ticket phrases.

---

### Story 4: Sasha — bug report lifecycle and Linear integration

**4.1** Add plan + ticket check to startup (after existing plan lookup):
- If plan exists and has a THR-#: note it
- Ask: "Want me to add a bug report to the Linear ticket when we're done?" (positive/negative gate)
- Store the answer — don't ask again during the session

**4.2** Update "Record in plan" step (step 5) to use extended `## Debugged Issues` format:
- Use the full format from Story 2 (severity, environment, repro steps, expected/actual)
- Status defaults to `open`

**4.3** Add Linear sync step (after recording in plan):
- If user said yes to Linear gate: format bug report using `.claude/templates/bug-report.md` and post as Linear comment via `save_comment`, or update description
- Mark `Linear: synced` in the plan entry
- If user said no: mark `Linear: not synced`

**4.4** Add guidance note to Sasha's skill file: "Any AI agent that discovers a bug during work should invoke Sasha or use the shared bug report template at `.claude/templates/bug-report.md` to record findings."

**4.5** Update Sasha's closing handoff to be bug-report-aware:
- "Root cause is documented [and synced to Linear]. Want to bring in Clove to pick up the fix?"

---

### Story 5: Winston — Gherkin AC, epic management, immediate promotion

**5.1** Add `## Acceptance Criteria` generation to plan mode:
- After writing `## Implementation Tasks`, generate AC from user stories and goal
- Use Gherkin format for behavioral criteria, plain checklist for non-behavioral
- Reference `.claude/templates/acceptance-criteria.md` for format

**5.2** Add epic detection and creation:
- After building implementation tasks, evaluate against epic criteria (>5 tasks crossing system boundaries)
- If epic threshold met: flag it — "This is large-scoped. I'd recommend breaking it into an epic with separate stories."
- On user confirmation: outline the stories, recommend creating separate Linear tickets (via Nora)
- Create epic plan file (`epic-<name>.md`) with story references

**5.3** Add immediate decision promotion rule:
- After writing any decision in `## Decisions`, evaluate: does this affect code or patterns beyond the current ticket?
- If yes: promote to the relevant `.claude/architect/` file immediately
- Add note in `## History`: "Promoted [decision] to `architect/<file>.md`"
- If no relevant architect file exists: flag it for creation

**5.4** Update Winston's evaluate mode output to include AC section:
- Add `### Acceptance Criteria` to the output format (between Suggested Approach and Open Questions)
- Gherkin for behavioral, plain for non-behavioral

**5.5** Add design-aware flag for features without mocks:
- When evaluating a feature with UI implications and no mock referenced in the ticket or plan: "No mock for this UI — here's what I'd recommend based on the existing component library and patterns."

---

### Story 6: Mira — ticket type awareness and Gherkin AC hints

**6.1** Add ticket type awareness to startup:
- Read ticket type from plan or detect from context
- Adjust story format based on type:
  - **Bug**: "As a [user], I expect [behavior] when [condition]" — focus on expected vs broken behavior
  - **Feature**: standard "As a [user], I want to [action], so that [benefit]"
  - **Improvement**: "As a [user], I want [existing thing] to [change], so that [benefit]"

**6.2** Update acceptance criteria hints to use Gherkin format:
- Change from plain checklist to `Given/When/Then` where the criterion describes a user interaction
- Keep plain checklist for non-behavioral constraints

**6.3** Add awareness of bug report template:
- If ticket type is `bug`: don't write user stories — instead suggest: "This is a bug ticket. User stories aren't the right format here. Want me to help verify the bug report template is filled in, or should we go straight to Sasha?"

**6.4** Update Mira's handoff:
- "Stories are locked in. Want to bring in Winston to evaluate the approach and build out the implementation plan?"
- Add: if AC hints are written in Gherkin, note that Winston will formalize them into full AC

---

### Story 7: Clove — AC awareness and adjustment mechanism

**7.1** Add AC check to startup:
- After reading `## Implementation Tasks`, also read `## Acceptance Criteria`
- If AC exists: acknowledge it — "I see N acceptance criteria. I'll make sure the implementation covers these."
- If no AC: note it but proceed — AC is not mandatory for every ticket

**7.2** Add AC adjustment proposals:
- If during implementation Clove discovers an AC item can't be met as written, or needs to be different:
- Do NOT silently change behavior — instead add to `## Acceptance Criteria > AC Adjustments`:
```markdown
### AC Adjustment: [short title]
- **Original:** Given X, When Y, Then Z
- **Proposed:** Given X, When Y, Then W
- **Reason:** [why]
- **Status:** `proposed`
```
- Notify the user: "I've proposed an AC adjustment — [short description]. Can you review and accept/reject before I proceed?"

**7.3** Update Clove's implementation completion checklist:
- Add: "All acceptance criteria addressed (or adjustments proposed and accepted)"

**7.4** Add e2e test offer (lightweight):
- After implementation is complete: "Want me to write e2e tests for the acceptance criteria?"
- Only offer, don't auto-generate — this is the seed for a future dedicated skill if needed

---

### Story 8: Bug template upgrade, AC sync to Linear, and handoff fixes

**8.1** Update `.claude/templates/bug-report.md`:
- Add `## Root Cause` section (with `verified` / `suspected` confidence level)
- Add `## Suspected Fix` section (Sasha confirms before implementation)
- Add `## Acceptance Criteria` section (Gherkin behavioral + non-behavioral checklist)
- Fold `Browser / Device` into `Environment` as a sub-line
- Fold `Reported By` into `Additional Context`
- Add `Scope` field to Additional Context (blast radius)

**8.2** Update Nora's skill (`thrive-ticket-start/SKILL.md`):
- Update bug scaffolding (step 4b) to fill Root Cause, Suspected Fix, and AC from verification
- Update create-ticket path to collect Root Cause, Suspected Fix, and AC for bugs
- Fix handoff logic (step 10): bugs→Sasha (default, not optional), improvements→Winston, features→Mira or Winston
- Add "Sync AC to Linear" path for on-demand AC updates

**8.3** Update Winston's skill (`thrive-architect/SKILL.md`):
- Add automatic AC sync to Linear after plan mode step 5 (AC generation)
- No opt-in prompt — AC is required on every ticket

**8.4** Update Clove's skill (`thrive-code-dev/SKILL.md`):
- Add AC sync to Linear step after verifying AC (step 8) — only when AC adjustments were accepted

**8.5** Update Briar's skill (`thrive-code-review-self/SKILL.md`):
- Add AC sync to Linear step after generating/updating AC (step 4) — only when AC was created or changed

**8.6** Update ecosystem doc (`skills-ecosystem.md`):
- Update bug workflow diagram to reflect Nora verify + scaffold + AC flow
- Update cross-skill handoffs table
- Add rule 9: AC is required and synced to Linear
- Update Plan Section Ownership table with AC → Linear row
- Update Bug Report Lifecycle with scaffolding and verification steps

---

## Acceptance Criteria

### Behavioral

- [ ] Given a user invokes Nora with an existing bug ticket, When the ticket has no bug report template fields, Then Nora offers to scaffold the description using the shared template
- [ ] Given a user invokes Nora with "I found a bug", When Nora collects the required fields, Then a new Linear ticket is created with the bug report template pre-filled and the `bug` label applied
- [ ] Given a user invokes Nora with a feature ticket, When the handoff step is reached, Then Nora recommends Mira before Winston
- [ ] Given Sasha is invoked on a branch with a plan and THR-#, When Sasha asks about the Linear gate and user says yes, Then the bug report is recorded in the plan AND posted to Linear using the shared template
- [ ] Given Sasha is invoked and user says no to the Linear gate, Then the bug report is recorded in the plan only with `Linear: not synced`
- [ ] Given Winston builds an implementation plan with >5 tasks crossing system boundaries, When the tasks are complete, Then Winston flags it as an epic candidate and offers to break into stories
- [ ] Given Winston writes a decision that affects code beyond the current ticket, When the decision is recorded, Then it is immediately promoted to the relevant `.claude/architect/` file
- [ ] Given Winston generates AC, When the criterion describes a user interaction, Then it uses Gherkin `Given/When/Then` format
- [ ] Given Clove discovers during implementation that an AC item needs to change, When she records the adjustment, Then the status is `proposed` and she asks the human to accept/reject before proceeding
- [ ] Given Mira is invoked on a bug ticket, When she detects the type, Then she suggests verifying the bug report template instead of writing user stories

### Non-behavioral

- [ ] All templates in `.claude/templates/` are the single source of truth — no duplicated template content in skill files
- [ ] `skills-ecosystem.md` is loaded by every skill via `manifest.json`
- [ ] PR description template is consistent with `.github/PULL_REQUEST_TEMPLATE.md`
- [ ] Plan template in `branch-plan.md` includes extended `## Debugged Issues`, `## Acceptance Criteria`, and `## User Stories` sections

---

## History

- 2026-03-31 [feature/hmcgrew/thr-1135-info-banner-block-for-mega-menu-2]: Epic plan created — upgrade AI skills ecosystem with ticket type awareness, shared templates, Gherkin AC, and cross-skill architecture doc. Designed during Winston session.
- 2026-03-31 [hmcgrew/thr-1473-ai-skills-ecosystem-upgrade]: Story 1 complete — created `.claude/templates/` with bug-report.md, ticket-types.md, pr-description.md, acceptance-criteria.md; created `.claude/architect/skills-ecosystem.md` (full ecosystem doc); updated manifest.json with `.claude/skills/` and `.claude/templates/` patterns.
- 2026-03-31 [hmcgrew/thr-1473-ai-skills-ecosystem-upgrade]: Story 2 complete — extended `## Debugged Issues` in plan template with severity, environment, repro steps, expected/actual, Linear sync fields; added `## User Stories` placeholder after Goal; added `## Acceptance Criteria` section with Gherkin behavioral, non-behavioral, and AC Adjustments subsections; updated step 2 context checklist to reference new sections.
- 2026-03-31 [hmcgrew/thr-1473-ai-skills-ecosystem-upgrade]: Story 3 complete — added ticket type detection (step 3b) using Linear labels with user fallback; type-specific display summary (bug/feature/improvement); bug report scaffolding offer for sparse descriptions; create-ticket path with type-aware field collection and `save_issue`; type-aware handoff recommendations; updated trigger list with create-ticket phrases.
- 2026-03-31 [hmcgrew/thr-1473-ai-skills-ecosystem-upgrade]: Story 4 complete — upgraded Sasha's skill with Linear gate (step 2b), extended Debugged Issues format (step 5), Linear sync step (step 5b), any-agent bug reporting guidance section, bug-report-aware closing handoff, and updated Definition of Done checklist.
- 2026-03-31 [hmcgrew/thr-1473-ai-skills-ecosystem-upgrade]: Story 6 complete — updated Mira's SKILL.md with ticket type detection in startup (step 3), bug ticket redirect (step 4 path), type-aware story format (feature vs improvement phrasing), Gherkin AC hints in story template, bug report template awareness, type-aware handoff with Gherkin note, and updated Definition of Done.
- 2026-03-31 [hmcgrew/thr-1473-ai-skills-ecosystem-upgrade]: Story 5 complete — Winston gains Gherkin AC generation in plan mode (step 4) and evaluate mode output; epic detection after building tasks (>5 cross-boundary tasks); immediate decision promotion to `.claude/architect/`; design-aware flag for UI features without mocks; updated Definition of Done for both modes.
- 2026-03-31 [hmcgrew/thr-1473-ai-skills-ecosystem-upgrade]: Story 7 complete — Clove gains AC awareness at startup (step 3c acknowledges AC items), AC adjustment proposal mechanism (flags discrepancies, records in plan, waits for human accept/reject), AC verification in implementation checklist (step 7), and e2e test offer post-implementation.
- 2026-03-31 [hmcgrew/thr-1473-ai-skills-ecosystem-upgrade]: Bug fix — replaced narrow `.claude/skills/` and `.claude/templates/` manifest patterns for skills-ecosystem.md with `"**"` wildcard; narrow patterns never matched the frontend/backend files skills actually work on, so the ecosystem doc rarely loaded.
- 2026-04-01 [hmcgrew/thr-1473-bug-template-ac-sync]: Story 8 complete — updated bug-report.md with Root Cause (verified/suspected), Suspected Fix, and AC sections; folded Browser/Device into Environment, Reported By into Additional Context, added Scope field. Updated Nora handoff: bugs→Sasha (default), improvements→Winston, features→Mira/Winston. Added automatic AC sync to Linear from Winston (plan mode), Clove (on AC change), Briar (on AC change). Added Nora on-demand AC sync path. Updated ecosystem doc: bug workflow, handoffs table, AC sync rule, plan ownership, bug report lifecycle.

---

## Debugged Issues

None.

---

## Review Issues

None.

---

## Cleanup Items

None.

---

## PR Readiness

- [ ] No critical or major issues
- [ ] Types correct — no `any`, no unsafe `as`
- [ ] No stray console.logs or debug artifacts
- [ ] Tests written for new logic and edge cases
- [ ] All debugged issues resolved (no `open` entries)
- [ ] Build passes — last run: N/A
- [ ] PR description up to date
- [ ] Lasting decisions promoted to architect context (if applicable)

**Last updated:** 2026-03-31
