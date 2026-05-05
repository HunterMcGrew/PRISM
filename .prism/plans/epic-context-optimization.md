# Plan: epic-context-optimization

## Ticket

Internal infrastructure work — no Linear ticket. Tracked via PRISM-side branch and PR.

## Goal

Cut baseline conversation context by roughly 40% and reduce per-invocation cost on heavy skills by 30–50%, without losing the engineering standards the team relies on.

**Status:** Phases 0–5 validated end-to-end in Thrive PR [#1970](https://github.com/TracTru/thrive/pull/1970) (currently in review). Remaining work is Phase 6 — porting the validated changes from Thrive's `.claude/` into PRISM's `.prism/` canonical sources so other consumers inherit them.

---

## Decisions

### Original (still standing)

- **Three-tier rule loading.** Rules in `.prism/rules/` split into always-loaded (Tier 1), path-scoped (Tier 2), and skill-internal (Tier 3) tiers.
  - **Why:** most rules previously loaded on every conversation as project instructions, but most are domain-specific (`use-effect-guidelines.md` doesn't matter on a docs edit). Scoping them cuts a substantial chunk off baseline with no quality loss when the routing patterns are right.
  - **Alternatives considered:** single tier (status quo); four-tier (separating cross-cutting from base). Rejected single tier — that's what we're trying to leave. Rejected four-tier — gain over three tiers not worth the routing complexity.
  - **Chosen approach:** three tiers. Tier 1 set scoped to rules that fire across every persona's lane (commit messages, PR descriptions, plan workflow, comments, voice). Tier 2 uses YAML `paths:` frontmatter. Tier 3 is skill-author-driven extractions, not a destination for general project rules.

- **Drop the `**` → `skills-ecosystem.md` manifest fallback.** Replace with explicit globs covering the surfaces where persona-handoff context applies.
  - **Why:** the catch-all fired on every file edit in the repo, loading `skills-ecosystem.md` (~260 lines) on PHP edits, dockerfile edits, lockfile edits — anywhere that doesn't need it.
  - **How to apply:** add explicit patterns for `.prism/skills/**/SKILL.md`, `.prism/plans/*.md`, `.prism/spec/adrs/*.md`. Done in Thrive PR #1970 against `.claude/` paths; Phase 6 ports to PRISM.

- **Lazy-load mode-specific reference files for heavy skills.** Pixel and Reese restructure into a thin SKILL.md plus references loaded on demand.
  - **Why:** Pixel mode 1 (inline sketch) doesn't need the full doctrine; Reese release-mode doesn't need bug-fix-mode logic. Loading everything always wastes context on the dominant invocation modes.
  - **Chosen approach:** matches the design Anthropic's official skills repo uses — small SKILL.md, adjacent reference files the skill loads as needed.

- **Move Nora's ticket scaffolds to `templates/`.** Most of her SKILL.md is structured output that already has a templates home.
  - **Why:** her job description is clean — fetch ticket, validate branch state, assign, create branch, summarize requirements, sync AC. The flow is small; the scaffolds dwarf it.

- **Revert Lilac to paste-only output.** Drop the Slack MCP send path entirely.
  - **Why:** the protected `#tractru-dev` channel blocks external Slack MCP connections, so the MCP-send branch is dead code.
  - **How to apply:** keep the formatter and the paste-block presentation. Closing message always points at the pasteable block.

- **Add cross-skill context-reuse instruction to every SKILL.md startup.** Soft instruction, not a hardcoded check.
  - **Why:** chained skills re-read the same architect docs and plan four times today. Cache hits help on the system prompt but not on tool-result content.
  - **How to apply:** insert a dedicated `## Context reuse from prior skills` section between Intro and Startup. Realistic capture rate ~70% based on the soft-instruction nature, but worth ~3,000–7,700 tokens on chained Nora → Winston → Clove → Briar flows.

- **Defer the MCP-result `/tmp/` externalization pattern.** Pierre Yohann technique from the Medium article.
  - **Why:** only worth building if our MCPs return large payloads in normal flows. We don't have evidence they do. Revisit if a future ticket surfaces a measurable cost.

### New (from Thrive PR #1970)

- **Mechanism confirmed: YAML `paths:` frontmatter is the rule-scoping lever.**
  - **Root cause of the original ambiguity:** Phase 0 of the original plan asked whether `manifest.json` could route rules, and Phase 2 was written hedged against either answer.
  - **Alternatives considered:** building a custom rule-routing layer; extending `manifest.json` to map rule paths. Both rejected — Claude Code's native mechanism already exists and is simpler. The platform auto-discovers `.claude/rules/*.md` (and equivalently `.prism/rules/*.md`) at session start, reads YAML frontmatter, and uses `paths:` globs to gate conditional loading.
  - **Chosen approach:** add a `paths:` YAML block to each Tier 2 rule. No `manifest.json` involvement for rules. `manifest.json` stays for architect docs only — that's a different load category.
  - **Implementation guidance:** glob slightly wide rather than tight — false positives are cheaper than false negatives. If a reviewer flags a missed-rule case, widen the glob; don't abandon the tier model.

- **Don't collapse the frontend block/component manifest entries.** Original plan called for dropping the broadest of three matches as redundant.
  - **Root cause of the original misread:** the three entries route to three different architect docs (`frontend-blocks.md`, `headless-ui.md`, `ux-patterns.md`), so the apparent overlap is complementary by design.
  - **Alternatives considered:** drop `frontend/blocks/**` (the broadest); same for `frontend/components/**`. Both rejected — each glob loads a different doc, so collapsing loses doc coverage on the dropped pattern.
  - **Chosen approach:** leave the triple matches alone.

- **Pixel split is two files, not three.** `doctrine.md` (61 lines) + `pattern-vocabulary.md` (107 lines).
  - **Root cause of the original mismatch:** plan called for `doctrine.md`, `states-canon.md`, `tailwind-tokens.md`. The states canon is pattern-shaped, not principle-shaped — it belongs inside `pattern-vocabulary.md`. The tailwind tokens dropped because SKILL.md references them in context rather than enumerating them, so there was nothing concrete to extract.
  - **Alternatives considered:** keep the three-file split; force-extract a `tailwind-tokens.md` even with thin content. Rejected — extracting for the sake of the original plan would create a file that's harder to keep in sync than it's worth.
  - **Chosen approach:** two files. Mode 1 inline sketches load neither; mode 2 specs load both; mode 3 HTML mock loads `pattern-vocabulary.md` only.
  - **Implementation guidance:** when porting Pixel into PRISM, mirror this two-file split — don't reintroduce the three-file design from the original plan.

- **Nora restructure includes both a templates move and a skill-internal extraction.**
  - **Root cause of the original underscope:** plan only described moving scaffolds to templates. The triage frameworks (S1-S4 scale, Impact Assessment, Definition of Ready, INVEST, Splitting Strategies, Complexity Signals, Requirements Quality, Blast Radius, Dependency Detection) were heavyweight and benefited from lazy load too.
  - **Chosen approach:** new `.prism/templates/ticket-description.md` for the feature/improvement/DX path, plus a skill-internal `frameworks.md` (158 lines) for the triage scaffolds. SKILL.md reads `frameworks.md` lazily before the assessment steps.

- **Drift-class boundary at the rule level.** Rules that govern a drift class need to load on every surface where that drift can occur — including their own meta-surface when applicable.
  - **Root cause:** PR #1970 surfaced a self-referential gap. `architect-doc-verification.md` was scoped to `.claude/architect/**` and `docs/content/dev/architecture/**` but not `.claude/spec/adrs/**`. ADR-0033 phantom-file drift survived two review passes because the rule that catches that exact failure mode wasn't loading on ADRs. Eric caught it on PR review.
  - **Alternatives considered:** broaden the glob to also include `.claude/rules/**` and `AGENTS.md` (citing surfaces). Rejected — that drift class (citation-vs-cited) is governed by `implementation-task-detail.md` § Cite-Don't-Restate, which is Tier 1 (always-loaded), so the principle is in context on every edit to citing surfaces regardless. Broadening would duplicate coverage at the cost of fire-on-every-rule-edit noise (~95% of rule edits don't touch ADR citations).
  - **Chosen approach:** add the missing surface (`.claude/spec/adrs/**` → `.prism/spec/adrs/**` for PRISM) and add a `## Drift classes covered` sub-section to the rule body that names both failure modes (doc-vs-source, citation-vs-cited) and points each at the right load mechanism. Boundary is now explicit at the rule level so future rule authors know which load lever their concern belongs under.
  - **Implementation guidance:** when scoping any rule, ask — what surfaces does this rule's failure class show up on? — and make sure all of them are in the glob, including the rule's own meta-surface if applicable.

- **Class-sweep on drift fixes.** When a review surfaces a drift pattern, the cleanup pass greps the full spec surface for the same pattern, not just the line-numbered punch list.
  - **Root cause:** PR #1970 had ADR-0033 phantom-file drift survive two review passes. Briar's first sweep stayed inside the AC/task surface; Clove's cleanup followed the line-numbered punch list literally. Both missed the ADR file body where the pattern also existed. The drift was a class, not an instance.
  - **Chosen approach:** when a review identifies an instance of drift, the fix pass enumerates the class and greps every spec surface (ADRs, architect docs, dev docs, plan files, skill files) before sign-off. The original review identifies *instances*; the cleanup pass enumerates the *class*.
  - **Implementation guidance:** Promoted to Thrive's `.claude/lessons.md` (2026-05-04). Port to PRISM's `.prism/lessons.md` as part of Phase 6.

- **Behavioral AC for skill load shape.** AC for "this skill loads X files" should be written in behavioral form — "every file named in SKILL.md's load instruction is read and each named file exists" — not with hardcoded counts and filenames.
  - **Root cause:** PR #1970 had AC drift twice — file roster changed (3 → 2 files for Pixel) and counts changed ("8 domain rules" → "5 path-scoped Tier 2 rules"). Behavioral AC doesn't drift when the underlying numbers shift.
  - **Implementation guidance:** apply the same shape to PRISM AC when porting.

---

## Implementation Tasks

The bulk of the work landed in Thrive PR #1970. Remaining PRISM-side execution: port the validated changes into `.prism/` canonical sources.

### Phase 0 — Investigation ✓ COMPLETE (Thrive)

Confirmed Claude Code's `paths:` frontmatter mechanism. See **Mechanism confirmed** decision above.

### Phase 1 — Foundation ✓ COMPLETE (Thrive)

- ADR-0033 written.
- `manifest.json` catch-all dropped, three explicit globs added.
- Frontend block/component overlap deliberately preserved (per **Don't collapse** decision above).

### Phase 2 — Rules tier split ✓ COMPLETE (Thrive)

Five rules path-scoped via YAML frontmatter:
- `use-effect-guidelines.md` → `frontend/**/*.{ts,tsx}`, backend plugin TSX
- `accessibility.md` → frontend UI files, backend plugin TSX
- `data-layer-boundaries.md` → data-access / services / domain / blocks / components / GraphQL
- `plugins-manifest.md` → the manifest file itself only
- `architect-doc-verification.md` → `.claude/architect/**`, paired dev docs, **and `.claude/spec/adrs/**`** (broadened during Eric's PR review)

Eight rules remain Tier 1: `code-comments.md`, `code-standards.md`, `git-conventions.md`, `branch-plan.md`, `pr-description.md`, `verification-commands.md`, `acceptance-criteria.md`, `implementation-task-detail.md`.

### Phase 3 — Skill restructures ✓ COMPLETE (Thrive)

- Pixel: `SKILL.md` + `doctrine.md` + `pattern-vocabulary.md` (716 → 579 lines).
- Reese: `SKILL.md` + four per-mode files (574 → 312 lines).
- Nora: templates move + skill-internal `frameworks.md` (528 → 391 lines).
- Lilac: paste-only revert (590 → 459 lines).
- Cross-skill context-reuse paragraph added to all 12 `SKILL.md` files as a dedicated `## Context reuse from prior skills` section between Intro and Startup.

### Phase 4 — AGENTS.md polish ✓ COMPLETE (Thrive)

§0 and §9 persona tables consolidated into a single 5-column table (`Persona | Skill | Owns | Routes to | Signal phrases`). 229 → 217 lines.

### Phase 5 — Paired dev doc ✓ COMPLETE (Thrive)

`docs/content/dev/architecture/rule-loading-tiers.md` written, cross-linked to ADR-0033, sidebar entry added.

---

### Phase 6 — Port to PRISM canonical (Clove)

The work above lives in Thrive's `.claude/`. PRISM's `.prism/` canonical sources need the same changes so future installs and consumers inherit the optimization.

#### Clove

1. **Port the rule frontmatter changes to `.prism/rules/*.md`.**
   - Files: the same five rules in `.prism/rules/`: `use-effect-guidelines.md`, `accessibility.md`, `data-layer-boundaries.md`, `plugins-manifest.md`, `architect-doc-verification.md`.
   - For each: copy the YAML `paths:` block from the matching Thrive `.claude/rules/<name>.md`, adapting glob roots from `.claude/` to `.prism/` where the rule's own surfaces are referenced (the `architect-doc-verification.md` glob includes `.prism/spec/adrs/**` for PRISM; user-code globs like `frontend/**` are unchanged because the consumer's repo has the same shape).
   - Verification: each PRISM rule file has `paths:` frontmatter; `grep -l "^paths:" .prism/rules/*.md` returns the five files plus any others already path-scoped in the bifurcation cleanup.

2. **Port the manifest cleanup to `.prism/architect/manifest.json`.**
   - Drop any `**` → `skills-ecosystem.md` catch-all entry if present.
   - Add three explicit patterns: `.prism/skills/**/SKILL.md`, `.prism/plans/*.md`, `.prism/spec/adrs/*.md` — all routed to `skills-ecosystem.md`.
   - Verification: `python3 -m json.tool .prism/architect/manifest.json > /dev/null` returns 0.

3. **Port the Pixel split to `.prism/skills/prism-pixel/`.**
   - Create `.prism/skills/prism-pixel/doctrine.md` (61 lines) — framework knowledge (Nielsen, cognitive science, Gestalt, named laws).
   - Create `.prism/skills/prism-pixel/pattern-vocabulary.md` (107 lines) — design patterns (form design, five states, container patterns, feedback patterns, search, tables, typography, color, motion, micro-interactions, content-first, dark patterns).
   - Slim `.prism/skills/prism-pixel/SKILL.md` to mirror the Thrive shape (~579 lines): retain persona, mode detection, mode routing, handoff with Winston, output shape per mode. Add load instructions: mode 1 reads SKILL.md only; mode 2 reads `doctrine.md` and `pattern-vocabulary.md`; mode 3 reads `pattern-vocabulary.md` only.
   - Verification: invoke Pixel on a mode 1 prompt — only SKILL.md is read. Invoke on a mode 2 prompt — both refs are read alongside SKILL.md.

4. **Port the Reese split to `.prism/skills/prism-qa-test-plan/`.**
   - Create per-mode files: `release-mode.md` (~98 lines), `sprint-mode.md` (~60 lines), `single-pr-mode.md` (~55 lines), `bug-fix-mode.md` (~59 lines).
   - Slim `.prism/skills/prism-qa-test-plan/SKILL.md` to ~312 lines: retain persona, mode detection, signal-phrase routing, shared mechanics, writing rules, DoD. Add startup instruction to read the matching mode file after detection.
   - Verification: each mode prompt loads only its matching mode file alongside SKILL.md.

5. **Port the Nora restructure to `.prism/skills/prism-ticket-start/` and `.prism/templates/`.**
   - Create `.prism/templates/ticket-description.md` (~43 lines) — the ticket-description scaffold.
   - Create `.prism/skills/prism-ticket-start/frameworks.md` (~158 lines) — S1-S4 scale, INVEST, splitting strategies, complexity signals, requirements quality, blast radius, dependency detection.
   - Slim `.prism/skills/prism-ticket-start/SKILL.md` to ~391 lines: retain persona, fetch-or-create flow, MCP wiring, branch creation, requirements-summary generation, AC sync flow. Reference scaffolds and frameworks by link, load `frameworks.md` lazily before assessment steps.
   - Verification: invoke Nora with a "start <ticket>" prompt against a real ticket — full setup completes without inline scaffolds.

6. **Port the Lilac paste-only revert to `.prism/skills/prism-standup-summary/SKILL.md`.**
   - Remove Slack MCP send branch, channel resolution, MCP availability detection, dual-path closing message, bot-identity default, MCP wrapper contract, MCP-related Common Issues.
   - Retain: format spec, PR activity gathering, ticket/PR formatting, Slack-flavored markdown output, paste-block presentation. Closing always points at the paste action.
   - Verification: invoke Lilac — output is a single pasteable block, no Slack MCP call attempted.

7. **Port the cross-skill context-reuse section to all `.prism/skills/*/SKILL.md`.**
   - Insert a dedicated `## Context reuse from prior skills` section between Intro and Startup in every `.prism/skills/*/SKILL.md`.
   - Paragraph instructs the agent to scan recent tool results for an existing complete read of the same architect doc, plan, or rule file before re-reading. Re-read only when the previous read was partial, the file may have changed since (a previous skill edited it), or the situation is ambiguous.
   - Verification: invoke a chained-skill conversation (Winston → Clove on the same diff); Clove's startup explicitly cites Winston's prior reads and skips re-reading the same architect docs.

8. **Port ADR-0033 to `.prism/spec/adrs/0033-rule-loading-tiers.md`.**
   - Adapt path references from `.claude/` to `.prism/` where the ADR body cites surfaces.
   - Verification: file exists, parses as markdown, all template sections present.

9. **Port the AGENTS.md table consolidation to PRISM's root agent doc.**
   - Replace the §0 and §9 tables with a single 5-column persona table.
   - Verification: `wc -l` shows reduction; every persona retained in the merged table.

10. **Port the lesson promotion to `.prism/lessons.md`.**
    - Append the 2026-05-04 entry: *"When fixing a class of drift, sweep the full spec surface — not just the punch list."*
    - Verification: file contains the entry with correct date and framing.

#### Eli

11. **Write the paired human-readable dev doc for ADR-0033 in PRISM's docs.**
    - File: `docs/content/dev/architecture/rule-loading-tiers.md` (or PRISM's equivalent docs path).
    - Same topic as ADR-0033, written for a teammate reading cold months later: why we tier rules, how `paths:` routes them, what skill authors should know when adding new rules.
    - Cross-link both ways: ADR cites the dev doc; dev doc opens with a link to ADR-0033.
    - Voice: follows `.prism/rules/writing-voice.md` if present — onboarding, plain language, explain the why.
    - Verification: file exists, links resolve.

12. **Update PRISM onboarding / install guides.**
    - Skill authors adding new rules need to know: default to path-scoped (Tier 2); default to always-loaded (Tier 1) only if the rule applies across every persona's lane.
    - Verification: docs read cleanly when followed step-by-step by a new contributor.

---

## Empirical Validation

From Thrive PR #1970's `/context` snapshot (mid-implementation, rules tier split alone):

| Rule | Tokens | Loads on |
| ---- | ------ | -------- |
| `use-effect-guidelines.md` | 6,800 | React/TS files only |
| `accessibility.md` | 4,500 | UI files only |
| `data-layer-boundaries.md` | 3,900 | Data layer / blocks / components only |
| `architect-doc-verification.md` | 1,100 | Architect docs, ADRs, paired dev docs only |
| `plugins-manifest.md` | 83 | The manifest file itself only |
| **Total newly scoped** | **~16,400 tokens** | — |

Conversations that don't touch the relevant code areas shed all 16,400 tokens of these rules from baseline.

Skill restructures stack additional per-invocation savings:

- **Pixel mode 1** (default per the skill's docs, ~90% of invocations) skips ~168 lines of doctrine + pattern vocabulary.
- **Reese** loads only the matching mode file (~60–98 lines) instead of all four (~272 lines combined).
- **Nora** loads `frameworks.md` (158 lines) lazily before the first assessment step; invocations that don't reach assessment skip it.
- **Lilac** stays at 459 lines vs 590, with no Slack MCP path to evaluate at startup.
- **Cross-skill context-reuse paragraph**: realistic capture rate ~70%, worth ~3,000–7,700 tokens on chained Nora → Winston → Clove → Briar flows.

---

## Cleanup Items

- **Operational/reference doc verification.** Eric's PR review on PR #1970 flagged `docs/content/dev/references/**` and `docs/content/dev/operations/**` as a candidate `architect-doc-verification.md` glob expansion. Winston's evaluate pass rejected the expansion: operations describe procedures and references describe API values; both have a different verification shape than "doc claims about source code." If verification coverage is wanted on those surfaces, it warrants its own rule with a tailored triage. Track as a separate PRISM ticket.
- **Promote the membership rule to `.prism/architect/spec-editing.md`.** So future rule authors see the path-scoped default on every spec edit, not just when they happen to read ADR-0033. Optional polish.

---

## Acceptance Criteria

### Behavioral

- [ ] Given a fresh Claude Code session in a PRISM-installed repo, When I open a docs-only conversation that touches no code files, Then the system prompt contains only the always-loaded (Tier 1) rules and none of the path-scoped (Tier 2) rules.
- [ ] Given a fresh session editing a frontend file matched by a Tier 2 rule's `paths:` glob, When the session loads, Then the matching Tier 2 rules are present in the system prompt.
- [ ] Given Pixel is invoked with a mode 1 inline-sketch prompt, When Pixel starts, Then no skill-internal references load — `SKILL.md` only.
- [ ] Given Pixel is invoked with a mode 2 saved-spec prompt, When Pixel starts, Then every file named in SKILL.md's load instruction is read and each named file exists in the skill folder.
- [ ] Given Reese is invoked with a release-mode prompt, When Reese starts, Then only the release-mode file loads alongside `SKILL.md`.
- [ ] Given Lilac is invoked, When Lilac generates the standup, Then the output is a single pasteable Slack-formatted block and no Slack MCP send is attempted.
- [ ] Given a chained-skill conversation (Winston → Clove on the same diff), When Clove starts after Winston, Then Clove's startup reuses Winston's prior reads of the same architect docs instead of re-reading them.

### Non-behavioral

- [ ] `.prism/architect/manifest.json` validates as JSON after Phase 6 task 2.
- [ ] Every PRISM skill still produces correctly-shaped output for a representative prompt per skill (no regression from porting).
- [ ] ADR-0033 exists at `.prism/spec/adrs/0033-rule-loading-tiers.md` and follows the structure in `TEMPLATE.md`.
- [ ] Paired dev doc exists in PRISM's docs structure and cross-links to ADR-0033.
- [ ] PRISM's AGENTS.md (or root agent doc) persona table consolidation: every persona is represented in the merged table.
- [ ] PRISM's Lilac SKILL.md no longer contains references to Slack MCP send paths.
- [ ] PRISM's `lessons.md` carries the class-sweep entry from 2026-05-04.

### AC Adjustments

- 2026-05-04 — Pixel and Reese AC rewritten in behavior-based shape (tests load behavior per mode, not file rosters or counts) per learnings from PR #1970 review cycles.

### AC Sync Log

| Date | Agent | Action | Plan | Linear |
| ---- | ----- | ------ | ---- | ------ |
| 2026-05-04 | Winston | Updated from Thrive PR #1970 learnings | updated | N/A (no Linear ticket) |

---

## History

- 2026-05-04 [main]: Plan drafted on desktop — context optimization epic. Goal is roughly 40% baseline context reduction and 30–50% reduction on heavy-skill invocation cost.
- 2026-05-04 [hmcgrew/context-optimization-thrive-learnings]: Plan moved into PRISM canonical at `.prism/plans/epic-context-optimization.md` and updated from Thrive PR [#1970](https://github.com/TracTru/thrive/pull/1970). Phases 0–5 marked complete in Thrive; Phase 6 (port to PRISM canonical) defined. Added six new Decisions (mechanism confirmed, manifest collapse abandoned, Pixel scope narrowed, Nora scope expanded, drift-class boundary, class-sweep, behavioral AC). Added Empirical Validation section with measured token savings (~16,400 on rules tier alone). Added Cleanup Items (operational/reference doc verification, membership rule promotion).
