# Plan: issue-380

## Ticket

GitHub issue #380 (epic #373, lane L380) — De-Linear-ize canonical prose behind the `ticketSystem` config.

---

## Goal

A `github-issues` consumer reads no unconditional Linear instructions in canonical prose — assumed-Linear mechanics become tracker-neutral phrasing (with `${TICKET_TRACKER}` where the tracker name is named, and config-conditional escapes where mechanics genuinely differ), while config-conditional, historical, and ADR references stay.

---

## Implementation Tasks

Edit **canonical sources only** — `.ai-skills/skills/<id>/{shared.md,frontmatter.yml,claude.md}` and `.prism/**`. Never edit generated platform copies under `.claude/`, `.codex/`, `.cursor/`, `.agents/`, or `dist/` — the build regenerates those from canonical. After all edits, run `pnpm run prism:build` to regenerate platform copies, then `pnpm run prism:check` must pass green.

**The classification spine (read before editing any file):** every "Linear" hit is one of two kinds.

- **KEEP** — do not touch. Config-conditional mentions ("Which ticket system — Linear or GitHub Issues?"), Linear-MCP-specific operational gotchas (the sanitizer notes — they only fire on a Linear MCP call and are harmless/irrelevant on github-issues), historical plan/PRD/ADR text, illustrative comparisons (Gmail/Notion/Linear UI convention; "easing: Linear for progress indicators" — that's the CSS timing function, not the tracker), and the Pocock contradiction note (names Linear as an example long-lived tracker).
- **CHANGE** — assumed-Linear prose that instructs the reader to do something on Linear as if it's the only tracker. These get neutralized.

**Two neutralization moves:**

1. **Tracker-name-only** → replace "Linear" with the neutral noun "the ticket tracker" (or use the existing `${TICKET_TRACKER}` token only where a standalone tracker-name label line is wanted). No config branch needed — the sentence is true on both systems once the proper noun is gone.
2. **Mechanics-differ** → the sentence describes a Linear-MCP operation (AC sync via `save_issue`, `save_comment`, `get_issue`, label detection). Rephrase to the neutral capability ("sync AC to the ticket tracker", "the tracker's labels") and, where an escape already exists or is warranted, keep/add a single config-conditional clause ("If the team's tracker doesn't support X, record it in the plan only"). Do **not** add per-system reference files — the mechanic-neutral phrasing plus the existing config-conditional escapes cover it (see Decision: mechanism).

### Clove (implementation)

**Group A — Frontmatter (routing descriptions + compatibility). Highest priority: these are routing triggers on every platform.**

1. `.ai-skills/skills/prism-ticket-start/frontmatter.yml`
   - Line 3–5 `description`: "Fetches or creates Linear tickets … updates Linear descriptions and acceptance criteria" → "Fetches or creates tickets … updates ticket descriptions and acceptance criteria." Do **not** name Linear — this description is a routing trigger on github-issues installs too.
   - Line 9 `compatibility`: currently "Requires Linear MCP connector … Connect Linear via Settings → Capabilities → Extensions." This one names a genuine hard dependency. Rephrase to name the tracker generically while preserving the Linear setup hint as a conditional: "Requires a ticket-tracker connector (Linear MCP when the tracker is Linear) and a local git environment. Supported in Claude Code CLI and VS Code extension. Not supported on Claude.ai web. For Linear, connect via Settings → Capabilities → Extensions." Rationale: the compatibility string is consumer-facing metadata; it must not assert Linear unconditionally, but the Linear connection instructions stay useful as a conditional.
2. `.ai-skills/skills/prism-user-stories/frontmatter.yml` line 4 `description`: "stories from a Linear ticket or user interview" → "stories from a ticket or user interview."
3. `.ai-skills/skills/prism-qa-test-plan/frontmatter.yml` line 5 `description`: "Picks the shape from prompt words, input, and Linear labels." → "Picks the shape from prompt words, input, and ticket labels."

**Group B — Skill bodies (`shared.md`). CHANGE the assumed-Linear mechanics; KEEP the illustrative/UI ones.**

4. `.ai-skills/skills/prism-architect/shared.md`
   - Line 285 "AC-sync to Linear" → "AC-sync to the ticket tracker".
   - Line 350 "Linear ticket updated with architectural notes…" → "Ticket updated with architectural notes…".
   - Line 358 "AC synced to Linear ticket" → "AC synced to the ticket tracker".
5. `.ai-skills/skills/prism-changelog/shared.md` line 123 "must not touch (source files, plans, Linear tickets)" → "…, tickets)". Tracker-name-only.
6. `.ai-skills/skills/prism-code-dev/shared.md`
   - Line 207 "AC was updated since the last Linear sync — I'll sync it after implementation if needed." → "…since the last ticket sync…".
   - Line 235 "Sync AC to Linear if changed" → "Sync AC to the ticket tracker if changed".
   - Line 239 History-append template "Synced updated AC to Linear ticket ${TICKET_PREFIX}-NNNN" → "Synced updated AC to ticket ${TICKET_PREFIX}-NNNN".
7. `.ai-skills/skills/prism-code-review-self/shared.md`
   - Line 294 "Sync AC to Linear if changed" → "Sync AC to the ticket tracker if changed".
   - Line 297 History template "Synced updated AC to Linear ticket ${TICKET_PREFIX}-NNNN" → "Synced updated AC to ticket ${TICKET_PREFIX}-NNNN".
8. `.ai-skills/skills/prism-debugger/shared.md`
   - Lines 149, 151, 152 "Linear gate" / "add a bug report to the Linear ticket" / "Phase 6 Linear-sync sub-step" → "ticket gate" / "add a bug report to the ticket" / "Phase 6 ticket-sync sub-step". These describe a `save_comment` mechanic; the neutral phrasing plus the existing "default to `not synced` when dispatched / no tracker" escape covers github-issues (where the sync is a `gh issue comment` equivalent or skipped).
   - Line 302 "the Linear-sync sub-step" → "the ticket-sync sub-step".
   - Line 372 checklist "Linear sync completed…" → "ticket sync completed…".
   - Lines 391, 394 "Linear ticket updated" / "If the Linear ticket was updated" → "ticket updated" / "If the ticket was updated".
9. `.ai-skills/skills/prism-design/shared.md` lines 52, 59 — **KEEP.** "Gmail, Notion, Linear convention" is an illustrative UI-convention citation, not a tracker instruction. Do not touch.
10. `.ai-skills/skills/prism-prd/shared.md`
    - Line 61 table column "Linear handoff" → "Ticket handoff".
    - Line 102 "optional Linear handoff" → "optional ticket handoff".
    - Line 170 "optionally creates a Linear initiative from a finalized PRD" → "optionally creates a tracker initiative/epic from a finalized PRD". (GitHub issues has no "initiative"; "initiative/epic" reads on both.)
    - Line 185 "Default route: Mira … or Nora (Linear initiative handoff)" → "…Nora (ticket initiative/epic handoff)".
11. `.ai-skills/skills/prism-qa-test-plan/shared.md`
    - Lines 101, 121, 122, 165, 234 "Linear labels" / "Linear ticket's AC" / "Linear ticket is labeled `bug`" / "Linear AC inlined" → "ticket labels" / "the ticket's AC" / "the ticket is labeled `bug`" / "Ticket AC inlined". Mechanics-neutral: both trackers have labels and AC.
    - Line 187 Procedure B edge-case list "a Linear ticket with no AC" → "a ticket with no AC".
12. `.ai-skills/skills/prism-user-stories/shared.md` line 208 "check Linear issue labels for `bug`, `feature`, or `improvement`" → "check the ticket's labels for `bug`, `feature`, or `improvement`".
13. `.ai-skills/skills/prism-conductor/shared.md` (lines 3, 118) and `claude.md` (line 9) — **KEEP.** "never writes Linear (Nora's lane)" / "no Linear writes" are describing Sol's write-boundary against Nora's tracker lane. Reads correctly as a boundary statement on both systems, and rewriting to "never writes the tracker" is acceptable but low-value; **recommend a light touch: change "Linear" → "the ticket tracker" in all three** for consistency, since these are boundary instructions, not historical record. (Clove: apply the change — it's the same neutralization move, and Sol's boundary is tracker-agnostic.)

**Group C — Rules (`.prism/rules/`).**

14. `.prism/rules/branch-plan.md`
    - Line 24 "prefer creating a parent ticket in Linear" → "prefer creating a parent ticket in the tracker".
    - Line 214 template comment "<Linear ticket URL or reference — optional>" → "<Ticket URL or reference — optional>".
    - Line 337 Debugged-Issues field "**Linear:** `synced` | `not synced` | `N/A`" → "**Ticket:** `synced` | `not synced` | `N/A`". **Cross-file rename** — this field name is referenced in `prism-debugger` shared.md and `references/debugger/closeout.md`; see Group E task 22 and confirm no other file reads the literal `**Linear:**` field label (sweep `grep -rn '\*\*Linear:\*\*' .prism .ai-skills`).
    - Line 375 AC Sync Log table header "| Date | Agent | Action | Plan | Linear |" → "| … | Plan | Ticket |".
    - Line 378 table comment "\"Linear\" = synced/pending/—" → "\"Ticket\" = synced/pending/—".
15. `.prism/rules/implementation-task-detail.md` line 70 — **KEEP.** The Pocock note names "Linear/GitHub" as examples of long-lived customer-facing trackers; it's an illustrative comparison, correct on both systems, not an instruction. Do not touch.
16. `.prism/rules/pr-description.md`
    - Line 10 "acceptance criteria live in Linear and the branch plan" → "…live in the ticket tracker and the branch plan".
    - Line 22 "`## Ticket` — ${TICKET_PREFIX}-#### or Linear URL" → "…or ticket URL".
    - Line 29 heading "## AC lives in Linear, not the PR body" → "## AC lives in the ticket tracker, not the PR body".
    - Line 31 "Acceptance criteria live in the Linear ticket…" → "…live in the ticket…".
    - Line 57 "Winston auto-syncing AC to Linear" → "Winston auto-syncing AC to the tracker".
17. `.prism/rules/skill-routing.md`
    - Line 17 routing table "shares a Linear ticket ID" → "shares a ticket ID".
    - Line 45 "never code, Linear, or merges" → "never code, tracker writes, or merges".
18. `.prism/rules/writing-voice.md`
    - Line 3 "…commit messages, and Linear tickets and comments" → "…commit messages, and tickets and comments".
    - Line 105 — **KEEP.** "every persona that operates on a Linear ticket loads this rule" is illustrative prose *demonstrating the count-rule pattern*; rewriting risks breaking the example's point. Low-value change; leave it. (If Clove wants full consistency, "a Linear ticket" → "a ticket" is safe here too — Clove's call, but default KEEP to avoid disturbing the worked example.)

**Group D — Templates (`.prism/templates/`).**

19. `.prism/templates/acceptance-criteria.md`
    - Line 87 heading "## Linear Sync" → "## Ticket Sync".
    - Line 89 "AC must be synced to the Linear ticket under `## Acceptance Criteria`…" → "AC must be synced to the ticket under `## Acceptance Criteria`…".
20. `.prism/templates/pr-description.md`
    - Line 7 "acceptance criteria live in Linear and the branch plan" → "…live in the ticket tracker and the branch plan".
    - Line 25 "Link the Linear ticket's \"Rationale\"…" → "Link the ticket's \"Rationale\"…".
    - Line 41 "[${TICKET_PREFIX}-#### or Linear URL]" → "[${TICKET_PREFIX}-#### or ticket URL]".
21. `.prism/templates/ticket-types.md`
    - Lines 11, 21, 31, 43 "**Linear label:** `bug`/`feature`/`improvement`/`DX`" → "**Label:** `bug`/`feature`/`improvement`/`DX`". (Both trackers have labels; the taxonomy is identical.)
    - Line 58 "Check Linear issue labels for…" → "Check the ticket's labels for…".

**Group E — References (`.prism/references/`).**

22. `.prism/references/debugger/closeout.md` — this file *is* the Phase 6 sync procedure. Neutralize the assumed-Linear prose while preserving the mechanic:
    - Line 1 heading "# Sasha — Phase 6 Closeout & Linear Sync" → "# Sasha — Phase 6 Closeout & Ticket Sync".
    - Lines 3, 5 "syncing to Linear" / "Linear sync" → "syncing to the ticket tracker" / "ticket sync".
    - Line 19 "The `Linear` field reflects…" → "The `Ticket` field reflects…" (matches the branch-plan.md field rename, task 14).
    - Lines 25, 27, 32 "Phase 6 sub-step: Linear sync" / "the Linear ticket's `## Root Cause`" / "Updated … on Linear ticket ${TICKET_PREFIX}-NNNN" → "…: Ticket sync" / "the ticket's `## Root Cause`" / "…on ticket ${TICKET_PREFIX}-NNNN".
    - Lines 35, 38, 39, 41 "the Linear gate" / "post it as a Linear comment via `save_comment`" / "Linear: synced" / "Linear: not synced" → "the ticket gate" / "post it as a ticket comment (via the tracker's comment API — `save_comment` on Linear)" / "Ticket: synced" / "Ticket: not synced". Keep the `save_comment` reference as a Linear-specific parenthetical so the mechanic isn't lost.
23. `.prism/references/architect/plan-mode.md`
    - Line 88 "Sync AC to Linear" → "Sync AC to the ticket tracker".
    - Lines 94 History template "Synced AC to Linear ticket ${TICKET_PREFIX}-NNNN" → "Synced AC to ticket ${TICKET_PREFIX}-NNNN".
    - Line 96 — already config-conditional ("If the team doesn't use Linear, skip the push…"). Neutralize the lead-in but **keep the conditional**: "If the team's tracker doesn't support AC push, record AC in the plan only."
    - Lines 120, 121 "separate Linear tickets" / "no parent ticket exists in Linear" → "separate tickets" / "no parent ticket exists in the tracker".
24. `.prism/references/architect/replan-mode.md`
    - Line 7 "Linear AC, PR body, user stories…" → "the tracker's AC, PR body, user stories…".
    - Lines 20, 21 "Nora (Linear ticket description)" / "Linear AC sync" → "Nora (ticket description)" / "ticket AC sync".
    - Lines 27, 28 stale-artifact table rows "| Linear AC |" / "| Linear ticket description |" → "| Ticket AC |" / "| Ticket description |".
25. `.prism/references/architect/evaluate-checks.md` line 18 "a new ticket has real overhead — Linear entry, separate branch…" → "…real overhead — a tracker entry, separate branch…".
26. `.prism/references/onboarding/question-flow.md` lines 14, 15 — **KEEP line 14** (it *is* the config-conditional question: "Which ticket system do you use — Linear or GitHub Issues?"). **Line 15 is already gated** ("Linear team key … only fires for Linear users") — KEEP; it's correctly conditional. Do not touch this file.
27. `.prism/references/operational-gotchas.md` lines 39–55 — **KEEP.** These are Linear-MCP sanitizer gotchas that only fire on a Linear `save_issue`/`save_comment` call. They're correct, harmless on github-issues (the code path never runs), and removing them would lose real operational knowledge for Linear consumers. Do not touch.
28. `.prism/references/pixel/pattern-vocabulary.md` line 76 — **KEEP.** "Linear for progress indicators" is the CSS `linear` easing function, not the tracker. Do not touch.
29. `.prism/references/qa-test-plan/common-issues.md`
    - Lines 31, 33 "## Linear ticket has no AC section" / "No AC on the Linear ticket" → "## Ticket has no AC section" / "No AC on the ticket".
    - Line 37 "the Linear label wasn't applied … the Linear ticket isn't labeled `bug`" → "the label wasn't applied … the ticket isn't labeled `bug`".
30. `.prism/references/qa-test-plan/future-phases.md` line 9 "Input: a Linear ticket (typically a feature) with AC defined." → "Input: a ticket (typically a feature) with AC defined."
31. `.prism/references/qa-test-plan/mode-bugfix.md`
    - Line 7 "a PR whose Linear ticket is labeled `bug`" → "a PR whose ticket is labeled `bug`".
    - Line 13 heading "## 2. Pull the full bug report from Linear" → "## 2. Pull the full bug report from the ticket tracker".
32. `.prism/references/qa-test-plan/mode-feature.md`
    - Line 14 heading "Inline the Linear AC when a ${TICKET_PREFIX}-\* is in the PR title" → "Inline the ticket AC when…".
    - Line 16 "call `get_issue` and pull … without jumping to Linear" → "call `get_issue` and pull … without jumping to the tracker". (Keep `get_issue` — it's the Linear MCP call name; on github-issues the equivalent is `gh issue view`. Neutral prose, tool name preserved.)
    - Line 39 "(inline; link to Linear)" → "(inline; link to the tracker)".
33. `.prism/references/qa-test-plan/shared-mechanics.md` line 51 "compare URL, PR URL, or Linear ticket URL depending on mode" → "…, or ticket URL depending on mode".
34. `.prism/references/ticket-start/mode-duplicate-finder.md`
    - Line 21 "domain-specific to Linear ticket data" → "domain-specific to ticket data".
    - Line 23 "Await user confirmation before any Linear mutation" → "…before any ticket mutation".
35. `.prism/references/ticket-start/sync-ac.md`
    - Line 1 heading "# Nora — Sync AC to Linear" → "# Nora — Sync AC to the Ticket Tracker".
    - Line 3 "push the plan's acceptance criteria into the Linear ticket description" → "…into the ticket description".
    - Line 13 "Confirm: \"AC synced to Linear ticket ${TICKET_PREFIX}-NNNN.\"" → "…\"AC synced to ticket ${TICKET_PREFIX}-NNNN.\"".

**Group F — Architect toolkit (`.prism/architect/`).**

36. `.prism/architect/onboarding.md` line 38 — **KEEP.** "The Linear team-key prompt (Q5) only fires for Linear users. A `github-issues` repo … skips Q5" — this is config-conditional documentation describing correct branching behavior. Do not touch.
37. `.prism/architect/_toolkit/install-layout.md` line 90 — **KEEP.** Describes the config write path honoring both `linear` and `github-issues`; naming Linear here is correct and technical. Do not touch.
38. `.prism/architect/_toolkit/qa-test-planning.md` line 163 table cell "Inline ${TICKET_PREFIX}-\* with Linear AC if present" → "…with ticket AC if present".
39. `.prism/architect/_toolkit/closing-messages.md` line 36 "Nora (Linear initiative handoff)" → "Nora (ticket initiative/epic handoff)".
40. `.prism/architect/_toolkit/skills-ecosystem.md`
    - Line 7 `## Project Context` block — **KEEP.** Already reads "Ticket tracker: GitHub issues" (dogfood-substituted); correct as-is.
    - Line 25 (Nora roster row): "Fetches Linear tickets … All Linear writes pass a shared-state confirmation gate" → "Fetches tickets … All ticket-tracker writes pass a shared-state confirmation gate".
    - Line 35 (Reese row): "based on prompt words, input shape, and Linear labels" → "…and ticket labels".
    - Line 56 (Sol row): "never code, Linear, or merges" → "never code, tracker writes, or merges".
    - Line 85 "check Linear labels first" → "check the ticket's labels first".
    - Lines 112, 114, 115, 116 workflow steps "syncs AC to Linear" / "invoke after the fix ships … rooted in the Linear bug report" → "syncs AC to the tracker" / "…rooted in the ticket's bug report".
    - Line 205 table row "`## Acceptance Criteria` → Linear" → "`## Acceptance Criteria` → the ticket tracker".
    - Lines 296, 299, 300, 301 "Updates the Linear ticket description" / "**Linear sync** — opt-in: Sasha asks whether to post the bug report to Linear" / "syncs AC to Linear" → "Updates the ticket description" / "**Ticket sync** — opt-in: Sasha asks whether to post the bug report to the tracker" / "syncs AC to the tracker".
    - Line 332 "every ticket must have `## Acceptance Criteria` in the Linear description … sync AC to Linear whenever it changes" → "…in the ticket description … sync AC to the tracker whenever it changes".
    - Line 338 "parallel to rule 9's AC-to-Linear sync pattern" → "parallel to rule 9's AC-to-tracker sync pattern".

**Group G — Non-canonical / out-of-scope (do NOT edit).**

- `.ai-skills/config.schema.json` — the `ticketSystem.kind` enum legitimately names `"linear"`. KEEP.
- `.prism/plans/**`, `.prism/prds/**`, `.prism/spec/adrs/**`, `.prism/evidence/**`, `.prism/lessons.md`, `.prism/conductor-state.json` — historical/operational record, never rewritten (plans are durable per ADR-0047; ADRs frozen). KEEP all.
- `.prism/skills/prism-prd/step-08-linear-handoff.md` and `step-07-finalize.md`, `.prism/skills/prism-conductor/lib/*`, `step-10-report.md` — **Clove: sweep these** with `grep -n Linear`. The step-08 *filename* names "linear-handoff"; renaming the file is out of scope for this prose sweep (touches step ordering/refs) — record as FOLLOWUP, but neutralize the assumed-Linear *prose inside* if it instructs unconditionally. Apply the same KEEP/CHANGE spine.

**Final verification (Clove):**
- Run `pnpm run prism:build` to regenerate platform copies from the edited canonical sources.
- Run `pnpm run prism:check` — must exit green (build --check, type-check, tests, manifest, crossref-lint).
- Re-grep to confirm no unconditional-Linear prose remains in the CHANGE surfaces: `grep -rn "Linear" .ai-skills/skills .prism/rules .prism/templates .prism/references .prism/architect` and eyeball every remaining hit against the KEEP list above.
- Confirm the dogfood repo reads correctly: after build, `grep -rn "Linear" .claude/skills` should show only KEEP-class survivors (illustrative UI conventions, config-conditional questions, Linear-MCP gotchas).

---

## Decisions

- **Mechanism: (b) neutral phrasing ("the ticket tracker") + the existing `${TICKET_TRACKER}` token for standalone tracker-name lines, with config-conditional clauses only where mechanics genuinely differ.**
  - **Root cause of the choice:** the vast majority of CHANGE hits are prose that names Linear as the tracker ("AC lives in Linear", "sync to Linear", "Linear label"). Once the proper noun is replaced with a neutral noun, the sentence is true on both systems — no substitution or branching needed. The handful of mechanics-differ cases (AC sync via `save_issue`, opt-in comment via `save_comment`) already carry config-conditional escapes in the codebase (`plan-mode.md` line 96: "If the team doesn't use Linear, skip the push"), so the pattern is already established.
  - **Alternatives considered:** (a) a `${TICKET_SYSTEM_NAME}` token + per-system sync reference files (`references/ticket-sync/linear.md`, `github-issues.md`) that skills cite.
  - **Chosen approach beats (a):** The token system already exists and is proven (ADR-0030, `scripts/ai-skills/lib/tokens.ts`), and it already ships `${TICKET_TRACKER}` deriving `**Ticket tracker:** GitHub issues` vs `**Linear team:** …`. So (a)'s *token* half is cheap. But (a)'s *per-system-reference* half is the expensive, unearned part: it stands up a new indirection layer (skills citing per-system files) for content that mostly doesn't differ. Applying the deletion test to those reference files — delete them, and the complexity doesn't reappear scattered; the neutral sentence carries it. That fails the "two adapters earn the abstraction" bar: there's effectively one shared mechanic (a ticket has AC, labels, comments) with a thin per-tracker tool-name difference, not two divergent adapters. Neutral phrasing + the existing token is strictly less machinery for the same consumer-visible result.
  - **Why not lean harder on `${TICKET_TRACKER}` everywhere:** that token renders a *whole labeled line* ("**Ticket tracker:** GitHub issues"), not an inline noun. Dropping it mid-sentence ("sync AC to **Ticket tracker:** GitHub issues") reads wrong. Inline mentions want the plain neutral noun "the ticket tracker"; the token is reserved for standalone identifier lines (already used in the Project Context block). Recording this so a future editor doesn't "helpfully" tokenize inline prose.
  - **Implementation guidance:** no new tokens, no new reference files, no build-script changes. Pure canonical-prose edits + one build to regenerate. → no promotion needed (ticket-tactical mechanism choice; the durable pattern it relies on — `${TICKET_TRACKER}` and config-conditional escapes — is already documented in `docs/parameterization.md` and ADR-0030).
- **The classification spine is the load-bearing artifact, not the word-replacement.** KEEP covers: config-conditional questions, Linear-MCP operational gotchas (harmless dead-path on github-issues), historical plans/PRDs/ADRs, illustrative UI-convention citations (Gmail/Notion/Linear), the CSS `linear` easing token, and the Pocock long-lived-tracker example. CHANGE covers only prose that *instructs the reader to operate on Linear as the sole tracker*. → no promotion needed (ticket-specific classification; recorded here so review can audit each KEEP).
- **Field/heading renames ripple across files — treat as a rename, not an edit.** Renaming the plan's `**Linear:**` Debugged-Issues field (branch-plan.md) and the `Linear` AC-Sync-Log column forces matching renames in `references/debugger/closeout.md` and any reader of those labels. Clove sweeps `grep -rn '\*\*Linear:\*\*'` and the AC-Sync-Log header references before declaring done, per code-standards.md § Removal and rename completeness. → no promotion needed (execution discipline, already a standing rule).
- **Frontmatter descriptions must not name Linear unconditionally.** They are routing triggers that fire on every platform including github-issues; an unconditional "Linear ticket" in a description is a correctness bug, not a cosmetic one. The `compatibility` string keeps Linear setup instructions but as a conditional ("For Linear, connect via…"). → no promotion needed (specific to this sweep; the general principle is covered by the tokenization/parameterization docs).

---

## History

- 2026-07-01 [hmcgrew/380-de-linearize]: Winston planned the de-Linear-ize sweep. Ran the real grep (406 hits/128 files; the CHANGE surface is skill bodies, frontmatter, rules, templates, references, architect toolkit — the rest is historical plans/ADRs/evidence = KEEP). Chose mechanism (b) neutral phrasing + existing `${TICKET_TRACKER}` token over (a) per-system reference files; see Decision: mechanism.

---

## Acceptance Criteria

### Behavioral

- [ ] Given a consumer whose `ticketSystem.kind` is `github-issues`, When they read any canonical skill body, rule, template, or reference in the CHANGE surface, Then they encounter no instruction that names Linear as the ticket tracker unconditionally.
- [ ] Given the frontmatter routing descriptions for prism-ticket-start, prism-user-stories, and prism-qa-test-plan, When a github-issues install loads them as routing triggers, Then none of the three descriptions names Linear.
- [ ] Given a Linear consumer, When they read the neutralized prose, Then every instruction remains correct and actionable for Linear (nothing that was true for Linear became false).
- [ ] Given the KEEP-classified surfaces (config-conditional onboarding questions, Linear-MCP operational gotchas, historical plans/PRDs/ADRs, illustrative UI-convention citations, the CSS `linear` easing note), When Clove finishes the sweep, Then those mentions are unchanged.

### Non-behavioral

- [ ] `pnpm run prism:check` exits green (build --check, type-check, tests, manifest coverage, crossref-lint) after the sweep and rebuild.
- [ ] Only canonical sources (`.ai-skills/skills/**`, `.prism/**` excluding historical plans/PRDs/ADRs/evidence/state) were edited; no generated platform copy under `.claude/`, `.codex/`, `.cursor/`, `.agents/`, or `dist/` was hand-edited.
- [ ] The field rename `**Linear:**` → `**Ticket:**` (Debugged Issues) and the AC-Sync-Log `Linear` → `Ticket` column are applied consistently across `branch-plan.md` and every file that reads those labels (rename completeness).
- [ ] No new tokens, reference files, or build-script changes were introduced — the sweep is pure canonical-prose edits plus one rebuild.

### AC Adjustments

### AC Sync Log

| Date | Agent | Action | Plan | Ticket |
| ---- | ----- | ------ | ---- | ------ |
| 2026-07-01 | Winston | Created AC | updated | N/A (github-issues; AC lives in plan) |
