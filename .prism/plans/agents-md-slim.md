# Plan: AGENTS.md slim

## Ticket

GitHub issue #64 — https://github.com/HunterMcGrew/PRISM/issues/64

## Goal

Cut `AGENTS.md` from 234 lines to ~120–140 by removing duplicated content (`§9 Ownership & Handoff` already lives in `skills-ecosystem.md`) and externalizing behavioral norms (`§§ 1–6, 8, 10–12`) to `.prism/rules/` as Tier 1 rules per ADR-0035 — while keeping load-bearing pre-skill content (`§0 Skill Auto-Routing`) intact.

---

## Audit — what `skills-ecosystem.md` already owns

Verified canonical content already in `.prism/architect/skills-ecosystem.md`:

- **Skill Roster** — full table split into ticket-flow + cadence-driven personas, with persona name, role, code-writing flag (lines 22–46). Richer than AGENTS.md `§9`.
- **Cross-skill Handoffs** — `From → Recommends → When` table (lines 230–239). The canonical handoff routing.
- **Plan Section Ownership** — full per-section reader/writer table (lines 177–192).
- **Common Workflows** — feature, bug, improvement, shortcut, mid-ticket moves with decision tree (lines 70–157).
- **Rules for All Skills** — 15 numbered rules including auto-routing pointer (line 295: `"see AGENTS.md § Skill Auto-Routing for the routing table"`).

Gap analysis — what `§9` has that `skills-ecosystem.md` doesn't:

- **Handoff language quotes** — 11 specific quoted phrases (`"That's Clove's department — want me to hand off?"` etc.) for routing back when a request drifts past a skill's lane. **Not present in skills-ecosystem.md.** This is the only content unique to `§9`; it needs a home before the table cuts.

Verdict: `§9`'s table is duplicate. `§9`'s handoff phrases need to move to `skills-ecosystem.md` first, then the whole section gets replaced with a one-line citation.

---

## Section-by-section verdict on AGENTS.md

| Section | Verdict | Destination | Reasoning |
|---|---|---|---|
| Header (`Skills Ecosystem` + `Key files`, lines 1–19) | TRIM | stays in AGENTS.md | Keep the framing line. `Key files` block is a static directory map — move to a new `.prism/architect/spec-map.md` (or fold into `skills-ecosystem.md`). |
| `§0 Skill Auto-Routing` (21–61) | KEEP | stays in AGENTS.md | **Load-bearing pre-skill.** When the auto-routing decision fires, no skill is active yet — so `skills-ecosystem.md` isn't manifest-loaded. AGENTS.md is the only routing surface in context. Tighten the signal-phrases column; do not remove the table. |
| `§1 Plan Before Building` (65–69) | EXTERNALIZE | `.prism/rules/plan-before-building.md` (Tier 1) | Behavioral norm that applies every session. |
| `§2 Subagent Strategy` (71–73) | EXTERNALIZE | `.prism/rules/subagent-strategy.md` (Tier 1) | Same. |
| `§3 Self-Improvement Loop` (75–79) | EXTERNALIZE | `.prism/rules/self-improvement-loop.md` (Tier 1) | Same. |
| `§4 Verification Before Done` (81–83) | EXTERNALIZE | `.prism/rules/verification-before-done.md` (Tier 1) | Same. |
| `§5 Demand Elegance` (85–89) | EXTERNALIZE | `.prism/rules/demand-elegance.md` (Tier 1) | Same. |
| `§6 Autonomous Bug Fixing` (91–95) | EXTERNALIZE | `.prism/rules/autonomous-bug-fixing.md` (Tier 1) | Bug-fixing posture baseline. |
| `Task Management` (99–108) | CUT | already in `.prism/rules/branch-plan.md` | Pure duplication — `branch-plan.md` already owns the full workflow. Replace with one-line citation. |
| `Core Principles` (110–116) | EXTERNALIZE | `.prism/rules/core-principles.md` (Tier 1) | Two bullets but referenced from other docs. |
| `§7 Project Engineering Standards` (118–128) | TRIM | stays in AGENTS.md | Points at `.prism/rules/` + `.prism/architect/`. Already concise; tighten further to 4 lines. |
| `§8 Context Window Handoff Check` (130–149) | EXTERNALIZE | `.prism/rules/context-window-handoff-check.md` (Tier 1) | Meaty protocol. Better as a citable rule. |
| `§9 Ownership & Handoff` (153–189) | CUT (after gap fill) | duplicate of `skills-ecosystem.md` Skill Roster + Cross-skill Handoffs | First move the 11 handoff-language quotes into `skills-ecosystem.md § Cross-skill Handoffs` (new sub-section "Handoff phrases"). Then replace `§9` with one-line citation. |
| `§10 Bash Output Minimization` (191–208) | EXTERNALIZE | `.prism/rules/bash-output-minimization.md` (Tier 1) | Operational guidance. |
| `§11 Cross-Agent Handoff Accountability` (212–220) | EXTERNALIZE | `.prism/rules/cross-agent-handoff-accountability.md` (Tier 1) | Behavioral norm. |
| `§12 Pre-Compaction Checkpoint` (224–235) | EXTERNALIZE | `.prism/rules/pre-compaction-checkpoint.md` (Tier 1) | Protocol. |

**Final AGENTS.md shape:** header + `§0 Skill Auto-Routing` (tightened) + `§7 Project Engineering Standards` (tightened) + a short "Behavioral norms" section listing the new Tier 1 rule files with one-line summaries each. Estimate ~120–140 lines.

---

## Decisions

- **Why `§0` stays in AGENTS.md.** Auto-routing fires before any skill is invoked, which means `skills-ecosystem.md` is not yet manifest-loaded at that moment. AGENTS.md is the only routing surface in context. Demoting `§0` to "job titles + pointer" forces an extra navigation hop on the highest-frequency decision in the system, paid every session.
  - Root cause: manifest loading is skill-triggered, not chat-triggered. Pre-skill decisions need their input data in the chat-load set.
  - Alternatives considered: (a) demote `§0` to job titles and let the LLM navigate to `skills-ecosystem.md` for signals — rejected, breaks the pre-skill load contract; (b) duplicate `§0` content into `skills-ecosystem.md` and slim AGENTS.md — rejected, doesn't solve the timing problem.
  - Chosen approach: keep `§0` table in AGENTS.md, tighten the signal-phrases column where verbose, leave the routing logic intact.
  - Implementation guidance: don't touch the User intent / Invoke columns. Trim long signal phrases to representative examples. Authors-ship-reviewers-review paragraph stays — it's the load-bearing variant note.
  - → no promotion needed (architecture invariant — lives in the plan and the routing-table preamble itself).
  - **Zoe verdict (2026-06-05):** `live` — issue #64 in progress — Slice 1 merged (PR #66), Slices 2–4 pending (AGENTS.md still 241 lines); decision still governs the remaining work.

- **Why `§9` cuts entirely.** The Skill Roster + Cross-skill Handoffs tables in `skills-ecosystem.md` are richer and canonical. `§9` is a thin restatement that gets out of sync the moment either file edits.
  - Root cause: `§9` was added before `skills-ecosystem.md` had its current depth. The slim moves AGENTS.md to a pointer.
  - Alternatives considered: keep `§9` as a quick-reference TL;DR of `skills-ecosystem.md` — rejected, two surfaces with the same content drift, and the "quick reference" is the failure mode the lean-skill epic is fighting against.
  - Chosen approach: move the 11 handoff-language quotes into `skills-ecosystem.md § Cross-skill Handoffs` as a new "Handoff phrases" sub-section, then replace `§9` with a one-line citation.
  - Implementation guidance: preserve the handoff-phrase quotes verbatim — they're tested phrasing. Don't editorialize them in the move.
  - → no promotion needed (cleanup, content moves to existing canonical home).
  - **Zoe verdict (2026-06-05):** `live` — issue #64 in progress — Slice 1 merged (PR #66), Slices 2–4 pending (AGENTS.md still 241 lines); decision still governs the remaining work.

- **Scatter (one rule per concern), not bundle.** Each externalized behavioral norm gets its own Tier 1 rule file in `.prism/rules/`.
  - Root cause: the question is whether one edit unit (bundle) or many (scatter) better serves how these norms are read, cited, and evolved.
  - Alternatives considered: bundle into a single `agent-behavior-norms.md` (~150–200 lines) — rejected, couples unrelated norms into one edit unit, weakens self-declared applicability per ADR-0029, and breaks the path-citation pattern other personas already use.
  - Chosen approach: scatter — ~9 short rule files (~10–30 lines each). Matches existing Tier 1 pattern (`code-comments.md`, `code-standards.md`, `branch-plan.md` are separate files, not bundled into `code-norms.md`). Per-session load cost is identical either way.
  - Implementation guidance: Slice 2 creates one file per norm. Each file applies `.prism/rules/writing-voice.md`, includes a `## Purpose` section, a `**Why:**` line, a `**How to apply:**` line, and (where applicable) a `## Who runs this rule` section. Cite by `.prism/rules/<file>.md` path, never `AGENTS.md §N`.
  - → no promotion needed (planning decision, lives in this plan; the resulting rule files are themselves the durable surface).
  - **Zoe verdict (2026-06-05):** `live` — issue #64 in progress — Slice 1 merged (PR #66), Slices 2–4 pending (AGENTS.md still 241 lines); decision still governs the remaining work.

- **Token economics.** Externalizing short sections does not save chat-load tokens — AGENTS.md is loaded every chat, and Tier 1 rules are also loaded every chat. The win is structural: cleaner authority hierarchy (rules live in `.prism/rules/`, not in the agent-behavior-router file), better scannability of AGENTS.md, and ability for other personas to cite a specific rule by path rather than "AGENTS.md `§5`."
  - → no promotion needed (planning rationale, not a durable invariant).
  - **Zoe verdict (2026-06-05):** `live` — issue #64 in progress — Slice 1 merged (PR #66), Slices 2–4 pending (AGENTS.md still 241 lines); decision still governs the remaining work.

- **OPEN — TBD, needs Hunter input.** Slice 4 §N numbering: whether AGENTS.md `§§ 1–6` keep their section numbering as discovery shells (each body becomes a one-line citation to `.prism/rules/<file>.md`), or shed numbering entirely so the file is structured around `.prism/rules/<file>.md` citations alone. **Default path (used until resolved):** keep numbering. Preserves existing in-tree `AGENTS.md §N` cross-references; less disruption to Slice 4 execution. Trade-off: shedding numbering aligns more cleanly with the externalization direction (rules live in `.prism/rules/`, AGENTS.md doesn't number-own them), but expands Slice 4 task #4 and Briar self-review task #5 to sweep and rewrite existing `AGENTS.md §N` references across `.prism/`, `.claude/`, `.codex/`, `.cursor/`.
  - **Zoe verdict (2026-06-05):** `live` (open-question, not yet stale) — OPEN since 2026-05-28 (8 days, under the 30-day threshold); default path (keep numbering) carries Slice 4.

---

## Implementation Tasks

### Winston (architecture)

1. ~~**Resolve OPEN decision (bundle vs. scatter)** before Clove starts. Default path is scatter; confirm or flip with Hunter.~~ **Resolved 2026-05-28: scatter confirmed.** See `## Decisions`.
2. **Approve final section-by-section verdicts** in the audit table above. Hunter signs off before extraction begins.

### Clove (implementation) — Slice 1: gap-fill `skills-ecosystem.md`

1. Add a "Handoff phrases" sub-section under `## Cross-skill Handoffs` in `.prism/architect/skills-ecosystem.md`. Move the 11 quoted handoff phrases from AGENTS.md `§9` (lines 174–186) verbatim. One-line preamble: "When a request falls outside the active skill's scope, use these phrases to route back."
2. Confirm no claim in the moved content depends on `§9`'s surrounding context. If it does, rewrite the dependent line to stand alone.
3. Verify: open `skills-ecosystem.md`, confirm the new sub-section reads cleanly, all 11 phrases present, no duplicate of existing handoff table content.

### Clove (implementation) — Slice 2: extract Tier 1 rules

1. Create `.prism/rules/plan-before-building.md` with `§1` content. Add `# Plan Before Building` title, `## Purpose` paragraph (the rule), `**Why:**` (cite the cost of late ambiguity), `**How to apply:**` (3+ steps trigger, mid-implementation course-correct). Frontmatter: no `paths:` (Tier 1 universal).
2. Create `.prism/rules/subagent-strategy.md` with `§2` content. Same shape.
3. Create `.prism/rules/self-improvement-loop.md` with `§3` content. Same shape.
4. Create `.prism/rules/verification-before-done.md` with `§4` content. Same shape.
5. Create `.prism/rules/demand-elegance.md` with `§5` content. Same shape. Preserve the "flip side: skip for trivial fixes" balance — that's the load-bearing nuance.
6. Create `.prism/rules/autonomous-bug-fixing.md` with `§6` content. Same shape. Preserve the public-API/shared-type exception.
7. Create `.prism/rules/core-principles.md` with the two `Core Principles` bullets. Same shape — short rule body is fine.
8. Create `.prism/rules/context-window-handoff-check.md` with `§8` content. Preserve the three signals and the 2-or-more threshold verbatim. Cite ADR-0006.
9. Create `.prism/rules/bash-output-minimization.md` with `§10` content. Preserve the per-tool guidance and the "keep output visible for" list.
10. Create `.prism/rules/cross-agent-handoff-accountability.md` with `§11` content. Cite ADR-0007.
11. Create `.prism/rules/pre-compaction-checkpoint.md` with `§12` content. Cite ADR-0008.
12. For each new rule: apply `.prism/rules/writing-voice.md` (no MUST/NON-NEGOTIABLE, explain the why, short enough to be read). Add `## Who runs this rule` section naming the bound personas where applicable.

### Clove (implementation) — Slice 3: register new rules in manifest

1. Add entries to `.prism/architect/manifest.json` for each new rule file, routing to `spec-editing.md` (matching the pattern for existing Tier 1 rules at lines 6–20). Order alphabetically by rule filename.
2. Confirm via `pnpm prism:build` (or equivalent) that the manifest validates and the new rules are picked up.

### Clove (implementation) — Slice 4: rewrite AGENTS.md

1. Open `/Users/hunter/Documents/PRISM/PRISM/AGENTS.md`. Working from the section-by-section verdict table:
2. **Header (1–19):** Keep `## Skills Ecosystem` intro paragraph. Cut `Key files` block (move to new `.prism/architect/spec-map.md` if Hunter wants it preserved; otherwise drop — most paths are findable via `.prism/SPEC.md`).
3. **`§0` (21–61):** Keep table. Tighten signal-phrases column — trim phrases longer than ~80 characters to the 1–2 most representative examples. Keep the routing-instructions, built-in-skill-overrides, onboarding-intent-routing, skip-conditions, and authors-ship-reviewers-review paragraph verbatim.
4. **`§§ 1–6` (65–95):** Keep the section headings (§1–§6) so existing `AGENTS.md §N` cross-references in the repo still resolve. Replace each section body with a one-line citation: `See [.prism/rules/<file>.md](.prism/rules/<file>.md).` (Numbering retention is the default path of an OPEN Decision — see `## Decisions` → "Slice 4 §N numbering". If Hunter resolves to remove numbering, this task and Briar self-review task #5 both expand to sweep the in-tree references.)
5. **`Task Management` (99–108):** Replace with single line: `See [.prism/rules/branch-plan.md](.prism/rules/branch-plan.md) for the full workflow.`
6. **`Core Principles` (110–116):** Replace with citation to `.prism/rules/core-principles.md`.
7. **`§7` (118–128):** Tighten to ~4 lines. Drop the "Framing" paragraph (the citations belong in the rules themselves, not in AGENTS.md).
8. **`§8` (130–149):** Replace with citation.
9. **`§9` (153–189):** Replace with: `Skill ownership and handoff phrases live in [.prism/architect/skills-ecosystem.md](.prism/architect/skills-ecosystem.md) §§ Skill Roster, Cross-skill Handoffs.`
10. **`§§ 10–12` (191–235):** Replace each with citation.
11. Add a new short section `## Behavioral norms` listing all extracted Tier 1 rules with one-line summaries — this keeps AGENTS.md as a discovery surface for what governs behavior, even though the content lives elsewhere.
12. Verify final line count is in the 120–140 range. If over, audit `§0` and `§7` for further trim. If under 100, something load-bearing got cut — re-check the verdict table.

### Briar (self-review)

1. Diff AGENTS.md before/after. Confirm no load-bearing content disappeared — every cut maps to either a new rule file, a citation, or `skills-ecosystem.md`.
2. Read AGENTS.md cold (as a new contributor would) and confirm the auto-routing decision is still actionable from `§0` alone, without needing to chase citations.
3. Confirm each new Tier 1 rule file applies `.prism/rules/writing-voice.md` — no MUST/NON-NEGOTIABLE, every rule has a `**Why:**`, plain language.
4. Confirm `skills-ecosystem.md` has the "Handoff phrases" sub-section and all 11 quotes are present verbatim.
5. Run `grep -rn "AGENTS.md §" .prism/ .claude/` and confirm any in-tree references to specific AGENTS.md sections still resolve (or get updated to point at the new rule paths).

### Eric (PR review)

1. Source-verify per `.prism/rules/architect-doc-verification.md` since the diff touches a routed architect doc (`skills-ecosystem.md`) — walk every claim in the new "Handoff phrases" sub-section against the original `§9` source.
2. Flag any rule file that ships with only a header and no body (per `.prism/rules/lazy-artifacts.md`).
3. Confirm the manifest registration matches every new rule file (orphan check).

---

## Review Issues

### Slice 4 task #4 has an unresolved OR-clause

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `.prism/plans/agents-md-slim.md` → `## Implementation Tasks > ### Clove (implementation) — Slice 4: rewrite AGENTS.md` task #4
- **Problem:** Task offered two paths ("Keep the section headings so existing references (`AGENTS.md §3`) still resolve, OR remove the numbering entirely and direct citations to `.prism/rules/<file>.md` — Hunter to confirm during sign-off") instead of front-loading the decision. Per `.prism/rules/implementation-task-detail.md`, decisions belong in `## Decisions`; task options leave divergence room across LLM runs.
- **Fixed in:** PR #66, commit on hmcgrew/agents-md-slim. Wrapped as a new `OPEN — TBD, needs Hunter input.` Decision (see `## Decisions` → "Slice 4 §N numbering"). Default path: keep numbering (preserves existing in-tree `AGENTS.md §N` cross-references). Slice 4 task #4 rewritten to follow the default path with a back-link to the Decision.

### Ticket field references Linear; should reference GitHub issue #64

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `.prism/plans/agents-md-slim.md:5`
- **Problem:** Plan's `## Ticket` read "_Needs Linear ticket — Nora to file. Working slug: `agents-md-slim`._" — but the work is tracked on GitHub issue #64 (PRISM is GitHub-only, not Linear). Plan should reflect actual ticket location.
- **Fixed in:** PR #66, commit on hmcgrew/agents-md-slim. Replaced with `GitHub issue #64 — https://github.com/HunterMcGrew/PRISM/issues/64`.

---

## Acceptance Criteria

### Behavioral

- [ ] Given the auto-routing decision needs to fire pre-skill, When a chat starts, Then `§0`'s routing table is in context without requiring a skill invocation.
- [ ] Given a skill needs to cite a behavioral norm, When the skill loads, Then the norm is citable by `.prism/rules/<file>.md` path (no `AGENTS.md §N` references).
- [ ] Given AGENTS.md is read cold by a new contributor, When they scan it top-to-bottom, Then they can route to the right persona and find every behavioral norm via one-hop citation.

### Non-behavioral

- [ ] AGENTS.md final line count is 120–140 (from 234).
- [ ] Every new Tier 1 rule file has frontmatter without `paths:` (universal load), a `## Purpose` section, a `**Why:**` line, a `**How to apply:**` line, and (where applicable) a `## Who runs this rule` section.
- [ ] `.prism/architect/manifest.json` registers every new rule.
- [ ] `skills-ecosystem.md` contains a "Handoff phrases" sub-section with all 11 quotes preserved verbatim.
- [ ] No rule file ships header-only (lazy-artifacts gate).

### AC Adjustments

### AC Sync Log

| Date | Agent | Action | Plan | Linear |
| ---- | ----- | ------ | ---- | ------ |

---

## History

- 2026-05-28 [hmcgrew/slice6-close-out]: Winston drafted slim plan after Hunter asked about porting Thrive's tiered-rules architecture. PRISM already has ADRs 0029, 0035, 0045 covering the conceptual work; the actual gap is AGENTS.md bloat. Plan focuses on duplicate removal (`§9`) and behavioral-norm externalization (`§§ 1–6, 8, 10–12`).
- 2026-05-28 [hmcgrew/agents-md-slim]: Nora opened the ticket. Branched from `origin/main` after committing in-flight Slice 6 self-review edit. OPEN decision (bundle vs. scatter for behavioral norm rules) resolved → scatter; Slice 2 unblocked.
- 2026-05-28 [hmcgrew/agents-md-slim]: Slice 1 — Clove moved the 11 handoff phrases from AGENTS.md §9 into a new `### Handoff phrases` sub-section under `## Cross-skill Handoffs` in `.prism/architect/skills-ecosystem.md`. Verbatim move with the plan-specified preamble; verified no §9-internal context dependencies. No duplication with the existing handoff table — phrases are routing language, the table is routing logic.
- 2026-05-28 [hmcgrew/agents-md-slim]: Mid-Slice-1, Hunter flagged "Sage handles changelogs — want me to bring him in?" as mis-pronouned (Sage is she/her). Fixed across all four `skills-ecosystem.md` surfaces + `AGENTS.md §9`; grep surfaced a third occurrence in `.ai-skills/skills/prism-changelog/shared.md` ("When he's unsure"), fixed at source. Rebuilt — 129/129 tests pass.
- 2026-05-28 [hmcgrew/agents-md-slim]: Briar self-review of PR #66 — 2 Minor found, no Critical/Major. Doc-class triage clean (11 phrases verified verbatim vs AGENTS.md §9 post-Sage-fix, 4 mirror surfaces coherent). Build skipped (markdown-only diff; prior `pnpm prism:build` clean).
- 2026-05-28 [hmcgrew/agents-md-slim]: Clove addressed both Briar Minor — `## Ticket` now points at GitHub issue #64, Slice 4 task #4 OR-clause replaced by a new `OPEN — TBD, needs Hunter input.` Decision (default: keep §N numbering) with task #4 rewritten to follow the default path. Plan-only fixes; no source changes.
- 2026-06-13 [hmcgrew/issue-64-slim-agents]: Merged origin/main (Sol conductor epic — PR #106); resolved AGENTS.md conflict. §0 routing table: took main version (adds Sol row, expands Eric/Pixel signal phrases). §9: kept branch one-liner citation. pnpm prism:check 145/145 pass.

---

## PR Readiness

- [ ] No critical or major issues
- [x] OPEN decision (bundle vs. scatter) resolved before Slice 2 starts — scatter, see Decisions
- [x] All 11 handoff phrases preserved in `skills-ecosystem.md` — verbatim under `### Handoff phrases`; Sage pronoun fixed in transit
- [ ] Every extracted rule applies writing-voice
- [ ] AGENTS.md line count in 120–140 range
- [ ] Manifest registers every new rule (no orphans)
- [ ] Briar self-review clean
- [ ] PR description up to date

**Last updated:** 2026-05-28 (Slice 1 complete)

### PR #66 (Slice 1 — gap-fill handoff phrases)

- [x] No critical or major issues — Briar self-review caught 2 Minor (see `## Review Issues`)
- [x] Doc-class triage clean — 11 phrases verified verbatim against AGENTS.md §9 (post-Sage-fix); preamble change is directional instruction, not a source claim
- [x] Cross-platform mirror coherence — handoff sub-section added identically to 4 mirrored `skills-ecosystem.md` surfaces; Sage Tone fix propagated to 4 changelog surfaces
- [x] Sage pronoun fix symmetric — `§9` source and new sub-section both updated; aligned with persona frontmatter `Sage (she/her)`
- [x] Plan structure follows `branch-plan.md` — 4 Decisions with verdicts, 4 History entries each within 3-sentence cap, OPEN→scatter recorded with chosen approach
- [x] Build skipped — markdown-only diff; `pnpm prism:build` ran clean during implementation (129/129)
- [x] 2 Minor findings fixed — Ticket field now points at GitHub issue #64; Slice 4 task #4 OR-clause wrapped as `OPEN` Decision with default path

**Last updated:** 2026-05-28 (Clove addressed Briar's 2 Minor; re-review pending)
