# Plan: issue-302-skill-routing-claude-blind

## Ticket

HunterMcGrew/PRISM#302 — Skill auto-routing governance is Claude-blind (lives only in AGENTS.md, which Claude does not auto-load)

## Goal

Externalize the Claude-blind skill-routing governance from `AGENTS.md` §0 into an always-on Tier-1 rule (`.prism/rules/skill-routing.md`) so the build's existing sync reaches Claude (`.claude/rules/`), Codex (AGENTS.md inlined block), and Cursor (`.cursor/rules/`) — without breaking any name- or number-based citation to the moved section.

---

## User Stories

_(none — internal infra fix)_

---

## Design

_(no UI)_

---

## Implementation Tasks

### Clove (implementation)

Sequence matters: **Task 0 (human grant — prerequisite) → Task 1 (create rule) → Task 2 (gut AGENTS.md §0) → Task 3 (seed-curation) → Task 4 (reference sweep) → Task 5 (verify)**. Build regenerates the AGENTS.md inlined block and seed twin, so the rule must exist before you build.

---

**Task 0 — [HITL] Human grants the routing-fix write paths. (Blocks Tasks 1-3.)**

Clove is the gated implementer (`#301` live on main). Three of this ticket's write targets are outside `clove.may_write` in the runtime `.claude/hooks/gates.json`, so the ownership-guard denies the Edit/Write tool path until Hunter grants them. **Clove does not self-edit `gates.json`** — that would reopen the canonical-tamper hole (see Review Issue: canonical gates.json back-door). Hunter applies this by hand.

- **What Hunter adds** — three new entries to the `ownership.may_write` array in `.claude/hooks/gates.json`, after the existing `".ai-skills/definitions/**"` line:
  ```json
          ".ai-skills/definitions/**",
          ".prism/rules/skill-routing.md",
          "AGENTS.md",
          "templates/install/.prism/rules/skill-routing.md"
  ```
  (First line is the existing last entry — add a trailing comma to it; the three below are new.)
- **Why per-file, not glob:** scope to the two named files, NOT `.prism/rules/**` or `templates/install/.prism/rules/**`. A gated implementer with write to the whole rules tree could rewrite rules that constrain its own behavior — the same escalation shape as the Q2 finding. One file each.
- **`.ai-skills/definitions/**` is already granted** (existing `may_write` entry) — the `seed-curation.json` edit in Task 3 needs no new grant.
- **Ticket-scoped — revert after merge.** This grant exists for #302 implementation only. Remove the three lines once the branch merges; otherwise the next gated run inherits write access to `AGENTS.md` for no reason.
- **Clove's check before starting:** confirm the three paths are present in `.claude/hooks/gates.json#clove.ownership.may_write`. If absent, stop and request the grant — do not attempt to add them yourself.

---

**Task 1 — Create the new Tier-1 rule `.prism/rules/skill-routing.md`.**

- **File:** `D:/Documents/Coding Stuff/agent-crew/.prism/rules/skill-routing.md` (NEW).
- **No frontmatter.** A rule with no `paths:` key is Tier-1 → always-on. This is the load-bearing mechanism: `collectTier1RuleBodies` (`scripts/ai-skills/agents-md-block.ts:81`) inlines it into AGENTS.md for Codex, and the platform-copy loop (`build.ts:106-112`, `rules` ∈ `COPIED_CONTENT_AREAS`) copies it to `.claude/rules/`, `.cursor/rules/`, `.codex/rules/`. Do **not** add a `paths:` frontmatter block — that would make it Tier-3 (manifest-routed, NOT always-on) and re-open the exact Claude-blind gap we're closing.
- **Voice:** onboarding voice per `.prism/rules/writing-voice.md` — lead with the rule, cite the reason, count rules not numbers. This file is durable always-on content read every session, so keep it tight.
- **No bare `ADR-NNNN` references in the body.** Every Tier-1 rule that ships to the seed cites ADRs by descriptive name or path, never bare number — verified: zero seed rules carry `ADR-NNNN`. Bare ADR numbers would trip `install-adr-gate` (crossref-lint pass 2) once this file mirrors to `templates/install/`. Where §0 currently says "See ADR-0002 for the full rationale," rewrite as a named reference (e.g. "see the skill auto-routing decision in `.prism/spec/adrs/`") — no four-digit ADR token.
- **Content:** move the body of AGENTS.md §0 (lines 11-59 of the current `AGENTS.md`) into this file, restructured as a standalone rule. Preserve these sub-parts verbatim in substance (they are cited or load-bearing):
  - The intro sentence + the full routing table (User intent | Invoke | Signal phrases). **Keep the persona/`prism-*` rows exactly** — the table is the shared source of truth for both pre-persona routing and in-persona handoff.
  - **How to route** (announce-then-invoke: `"This looks like [skill domain] work — bringing in [Persona]."`).
  - **Built-in skill overrides** (`prism-code-review-pr` over built-in `/review`).
  - **Onboarding intent routing** (Atlas).
  - **Utility skills** (`prism-handoff`, `prism-review-loop`) + the **"Sol is a persona, not a utility"** paragraph.
  - **Skip auto-routing when** (trivial tasks / "don't use a skill" / already inside a skill session).
  - **Authors ship, reviewers review** paragraph (the lane rule — currently AGENTS.md §0's last block; cited by `shipping-flow.md` and skills-ecosystem.md as "AGENTS.md § 0").
- **Heading:** the file's top-level `# ` heading and the in-file section heading text must keep the literal string **`Skill Auto-Routing`** so name-based citations (`AGENTS.md § Skill Auto-Routing`) still resolve against the inlined AGENTS.md block. Suggested shape:
  ```markdown
  # Skill Auto-Routing

  ## Purpose

  When a user works without invoking a specific skill, detect the intent and
  proactively invoke the matching skill. <reason — onboarding voice>

  ## Routing table
  <the table>

  ## How to route
  ...
  ## Built-in skill overrides
  ...
  ## Authors ship, reviewers review
  ...
  ```
- **Cross-references inside the body:** when pointing at the handoff phrases, link `.prism/architect/_toolkit/skills-ecosystem.md` by repo-root-absolute path (crossref-lint pass 1 resolves `.prism/...` refs and they must exist — this file does). Do not use `#anchor` links to AGENTS.md headings from inside the rule.

---

**Task 2 — Gut AGENTS.md §0, leave a thin pointer that preserves the heading + the generated-block insertion anchor.**

- **File:** `D:/Documents/Coding Stuff/agent-crew/AGENTS.md`, lines 11-61 (the `## 0. Skill Auto-Routing` section through its trailing `---`).
- **Replace the section body** with a thin pointer, matching how §1-§12 behavioral norms already point at their Tier-1 rule files (see AGENTS.md §8: `## 8. Context Window Handoff Check\n\nSee \`.prism/rules/...\`.`). Keep the heading line **`## 0. Skill Auto-Routing`** verbatim — both the `## 0` number (number-based citations: `AGENTS.md § 0`) and the `Skill Auto-Routing` name (name-based citations) must survive.
  ```markdown
  ## 0. Skill Auto-Routing

  See [`.prism/rules/skill-routing.md`](.prism/rules/skill-routing.md). The full
  routing table, built-in-skill overrides, utility-skill rules, and the
  "authors ship, reviewers review" lane rule live there as an always-on Tier-1
  rule — loaded by Claude, Codex (inlined below), and Cursor.

  ---
  ```
- **Do NOT renumber any other `## N` section.** Number-based citations across the tree pin `§ 0`, `§ 3`, `§ 9` by number. Renumbering would dangle them. The section stays `## 0`.
- **Verify the generated-block anchor still works:** `replaceTier1Block` (`agents-md-block.ts:130-131`) inserts the block after the `| 12 | Pre-compaction checkpoint` table row, OR replaces the existing `<!-- BEGIN GENERATED TIER-1 RULE BODIES ... -->` marker pair. The marker pair already exists in AGENTS.md (line 81). Gutting §0 does not touch the marker or the table anchor, so insertion is unaffected. After build, the new `skill-routing.md` body appears inside that generated block automatically (filename-sorted) — Codex gets it.
- **Leave §9 Ownership & Handoff exactly as-is.** It is already a thin pointer to `skills-ecosystem.md §§ Skill Roster, Cross-skill Handoffs`. It is NOT moving. (The dispatch brief's "§3" maps to PRISM's live §9; no §3-content move is needed — PRISM already extracted ownership/handoff.)

---

**Task 3 — Register the new rule as a curated seed file.**

- **File:** `D:/Documents/Coding Stuff/agent-crew/.ai-skills/definitions/seed-curation.json`.
- Add `"rules/skill-routing.md"` to the **`curated`** array (alongside `"rules/branch-plan.md"`, `"rules/verification-commands.md"`, etc.).
- **Why curated, not auto-mirrored:** a curated file gets a hand-tailored consumer-facing seed twin and `checkSeedDrift` only requires the twin to *exist*, not byte-match canonical. This (a) silences the `prism:build` "auto-mirrored N unclassified file(s)" warning, (b) gives explicit consumer-facing intent matching the other rule twins, and (c) lets the seed twin stay ADR-clean by construction. Auto-mirror would copy canonical bytes verbatim into the seed — fine only because Task 1 already keeps the body ADR-free, but curated is the intentional, consistent choice for a routing-governance rule.
- **Create the seed twin:** `D:/Documents/Coding Stuff/agent-crew/templates/install/.prism/rules/skill-routing.md` (NEW). For a first pass, it may be identical to the canonical body (the body is already generic + ADR-free + token-free, so no Thrive-isms to strip). Confirm it carries no bare `ADR-NNNN` and no `${TOKEN}` literals. `prism:build` will report seed drift if the twin is missing; create it in the same commit.

---

**Task 4 — Reference sweep (removal/rename completeness per `code-standards.md § Removal and rename completeness`).**

The §0 *heading* is preserved (number + name), so name- and number-based citations resolve against the thinned section. Confirm — do NOT edit generated mirrors (`.claude/`, `.cursor/`, `.codex/`, `templates/install/AGENTS.md.tmpl`); those regenerate from canonical on build. Canonical citations to verify still resolve (all by name or number, all preserved — expect NO edits needed, but confirm each):

- `.prism/architect/_toolkit/skills-ecosystem.md:335` — `AGENTS.md § Skill Auto-Routing` (name) ✓ resolves to preserved heading.
- `.prism/architect/_toolkit/closing-messages.md:63` — `AGENTS.md § Skill Auto-Routing` (name) ✓.
- `.prism/references/shipping-flow.md:5` — `AGENTS.md § 0` (number) ✓.
- `.prism/spec/adrs/_toolkit/0002-skill-auto-routing.md:16,27,33` — `AGENTS.md § 0` / `§ 0 Skill Auto-Routing` (number+name) ✓.
- `.prism/spec/adrs/_toolkit/0003-authors-ship-reviewers-review.md:68` — `AGENTS.md § 0` (number) ✓.
- `.prism/spec/adrs/_toolkit/README.md:54` — `AGENTS.md § 0` (number) ✓.
- `.ai-skills/skills/prism-code-review-self/shared.md:355` — `AGENTS.md § 0` (number) ✓.
- All `.ai-skills/skills/*/shared.md` citations of `AGENTS.md § Ownership & Handoff` — **untouched** (§9 not moving) ✓.
- **Action:** run `grep -rn "§ Skill Auto-Routing\|§ 0\b\|AGENTS.md § 0" .prism .ai-skills AGENTS.md` and confirm every hit resolves to the preserved `## 0. Skill Auto-Routing` heading. If any citation used a `#anchor` form (e.g. `AGENTS.md#0-skill-auto-routing`), confirm the anchor still matches — the heading text is unchanged, so GitHub's auto-anchor `#0-skill-auto-routing` is stable. Expect zero dangling refs.
- **Optional consideration (Clove's call, document if taken):** ADR-0002 line 27 says "routing logic lives in one place (`AGENTS.md § 0`)." This is still true in spirit — AGENTS.md §0 now points at the single rule file. Leave the ADR text as-is (ADRs are historical decision records; `seed-curation.json` excludes them from the seed so the install-adr-gate never sees them). Do not edit the ADR.

---

**Task 5 — Verify.**

Run from repo root, in order:

1. `pnpm prism:build` — regenerates `.claude/rules/skill-routing.md`, the AGENTS.md inlined block (now containing the skill-routing body), `.cursor/`/`.codex/` copies, and the seed twin. Expect NO "auto-mirrored unclassified file" warning for `skill-routing.md` (it's curated). Expect the changed-files list to include `.claude/rules/skill-routing.md`, `.cursor/rules/skill-routing.mdc`, `.codex/rules/skill-routing.md`, and `AGENTS.md`.
2. `test -f .claude/rules/skill-routing.md && echo "Claude rule synced ✓"` — the core fix: confirm the synced Claude-loaded copy exists post-build.
3. `grep -q "Skill Auto-Routing" .claude/rules/skill-routing.md && echo "heading present ✓"`.
4. `grep -c "skill-routing" AGENTS.md` — confirm the AGENTS.md generated block inlined the body (expect ≥1 from the `<!-- source: .prism/rules/skill-routing.md -->` comment) AND the §0 pointer link is present.
5. `pnpm prism:check` — must pass (drift check + check-types + tests + verify-manifest + crossref-lint). This is the gate that proves no dangling references, no seed drift, no leftover tokens, no forbidden ADRs on the install surface.
6. `pnpm prism:crossref-lint` — explicit re-run (also inside `prism:check`); must report "crossref-lint passed", "install-adr-gate passed", "install-relative-link-gate passed". If install-adr-gate fails on `skill-routing.md`, a bare `ADR-NNNN` leaked into the body or seed twin — strip it (Task 1 constraint).

---

## Decisions

- **The Claude-blindness is in the routing *governance*, not the persona surface; the fix is a standard Tier-1 rule, no `CLAUDE.md` surgery.**
  - **Root cause:** AGENTS.md §0 (routing table + announce-then-invoke protocol + built-in-skill overrides + skip heuristics + "authors ship, reviewers review" lane rule) lived only in hand-authored AGENTS.md. Claude does not auto-load AGENTS.md (`CLAUDE.md:3` points at it in prose, no `@`-import; the build never touches `CLAUDE.md`). So that governance reached Codex (auto-loads AGENTS.md) but was Claude-blind. The task→persona *map* itself still reaches Claude via Skill/Agent `description` trigger words — confirmed Partial, not catastrophic.
  - **Alternatives considered:** (a) add a `CLAUDE.md` `@`-import of AGENTS.md or §0; (b) duplicate §0 into `CLAUDE.md`; (c) extract §0 to an always-on Tier-1 rule that the build syncs to `.claude/rules/`.
  - **Chosen approach:** (c). Verified this session that Claude DOES auto-load `.claude/rules/*.md` (this very session loaded ~20 of them as project instructions), so the standard Tier-1 sync closes the gap with zero new mechanism. (a)/(b) reject: `CLAUDE.md` is hand-maintained and outside the build's sync surface, so they'd drift and re-introduce a single-surface authoring point — the exact failure §1-§12 already solved by extraction. No `CLAUDE.md` `@`-import or surgery needed.
  - **Implementation guidance:** new rule has NO `paths:` frontmatter (Tier-1 → always-on); build syncs it to all three surfaces automatically.
  - → promoted to no promotion needed (this plan + the new rule file ARE the durable record; the rule self-documents its own always-on intent).

- **Move only §0 Skill Auto-Routing; §9 Ownership & Handoff stays put.** The dispatch brief referenced Thrive's §0+§3 combined extraction, but PRISM already extracted ownership/handoff — its §9 is a thin pointer to `skills-ecosystem.md`, and the §1-§12 behavioral norms are already Tier-1 rules. Only §0 remains as a fat inline block. So PRISM's fix is narrower than Thrive's: one section, one rule file. Combining §0 and §9 into one rule would duplicate the skills-ecosystem.md handoff content (a second source of truth) — rejected.
  - → promoted to no promotion needed (scoping decision specific to this ticket's diff against the already-extracted PRISM AGENTS.md).

- **Handoff phrases stay in `skills-ecosystem.md` (manifest-loaded); they are NOT externalized to a Tier-1 rule. (Scope call on Nora's open question.)**
  - **Root cause of the question:** the out-of-lane handoff phrases (`"That's Clove's department — want me to hand off?"` etc.) live in `skills-ecosystem.md § Cross-skill Handoffs`, which loads via `manifest.json` only AFTER a skill fires — so they don't reach the bare pre-skill Claude agent.
  - **Decision: leave them where they are.** The handoff phrases are *in-persona* content — they govern what a persona says when a request lands outside *its* lane, which by definition only matters once a persona is active (and `skills-ecosystem.md` is loaded). The bare pre-skill agent doesn't need handoff phrases; it needs the routing *table* (which IS moving to the always-on rule) to pick the right persona in the first place. Routing-in vs. handing-off-out are two distinct moments: the rule covers the first, skills-ecosystem.md covers the second.
  - **Alternatives considered:** (a) duplicate the handoff phrases into `skill-routing.md`; (b) move them out of skills-ecosystem.md into the rule entirely.
  - **Chosen approach:** neither — keep them in skills-ecosystem.md. (a) creates two sources of truth for the same phrase table (drift risk, the precise thing Removal/rename completeness warns against). (b) would strip in-persona reference content out of the doc that personas load on every invocation, for no gain — the pre-skill agent never reaches an "out-of-lane" moment because it hasn't entered a lane yet.
  - **What the rule DOES carry for routing-out:** the "authors ship, reviewers review" lane rule and the announce-then-invoke protocol move into `skill-routing.md` because those govern the *routing* decision, which is pre-skill. The conversational handoff *phrases* are the post-skill artifact and stay.
  - → promoted to no promotion needed (documented here; the boundary is self-evident from where each artifact loads).

- **Sync mechanism confirmed end-to-end (file:line).** A no-`paths:` `.prism/rules/skill-routing.md` will: (a) sync to `.claude/rules/skill-routing.md` — `syncAllPlatformContentCopies` → `copyContentToPlatformDir`, `rules` ∈ `COPIED_CONTENT_AREAS` (`build.ts:106-112`, called `build.ts:932-940`); Claude auto-loads `.claude/rules/*.md` (confirmed this session). (b) inline into AGENTS.md's generated block — `syncAgentsMdTier1Block` → `collectTier1RuleBodies` filters to no-`paths:` rules (`agents-md-block.ts:81`), `replaceTier1Block` injects (`agents-md-block.ts:118`); Codex auto-loads AGENTS.md. (c) sync to `.cursor/` (`.mdc` dialect) and `.codex/` via the same platform-copy loop with per-platform dialects (`build.ts:933` `buildPlatformDirs`).
  - → promoted to no promotion needed (verification fact, captured in this plan + Task 5's checks).

- **Register as a curated seed file, not auto-mirrored.** Add to `seed-curation.json` `curated`. Matches the treatment of every other consumer-facing rule twin (`branch-plan.md`, `verification-commands.md`). Keeps the body ADR-free in the seed (install-adr-gate stays green), silences the auto-mirror warning, and makes consumer-facing intent explicit.
  - → promoted to no promotion needed (build-config tactic specific to this file).

- **Routing-fix writes are human-granted to the runtime gate, not Clove-self-granted. (Q1 ownership ruling.)** The three out-of-`may_write` targets (`.prism/rules/skill-routing.md`, `AGENTS.md`, the seed twin) are granted by a human edit to `.claude/hooks/gates.json` (Task 0), scoped per-file, ticket-scoped, reverted after merge. Clove never touches `gates.json`. Considered: widen Clove's `may_write` with a `.prism/rules/**` glob — rejected, because a gated persona with write to the whole always-on rules tree could rewrite the rules that govern itself (escalation), and a glob outlives the one file this ticket needs.
  - → promoted to no promotion needed (ticket-scoped grant; the boundary rationale generalizes via the Q2 finding below, which routes to the enforcement epic).

- **Canonical-source enforcement files are a tamper surface the runtime denylist doesn't cover. (Q2 ruling — REAL hole, OUT of #302 scope.)** Recorded as a Review Issue (below) and routed to the enforcement epic, NOT fixed here. The boundary: #302 closes the routing-blindness gap and must not absorb an enforcement-floor fix. The Q1 per-file grant is designed to not depend on or widen this hole.
  - → promoted to no promotion needed for #302 (the durable record is the Review Issue + its route to the enforcement epic; promotion happens when that epic picks it up).

- **Moving §0 to a Tier-1 rule subjects its content to the Thrive-literal guard, which the verbatim move did not anticipate.**
  - **Root cause:** AGENTS.md §0's Nora routing row carries the example ticket ID `"start THR-123"`. `THR-123` is a Thrive-flavored literal. In AGENTS.md it was never checked — AGENTS.md is a single hand-authored surface, not a platform-synced rule. Once §0 becomes `.prism/rules/skill-routing.md` (Tier-1, no `paths:`), the build copies it to `.claude/rules/`, `.codex/rules/`, `.cursor/rules/`, and `prism:test`'s literal-guard scans those platform outputs and fails on `THR-123` (3 hits, one per platform dialect).
  - **Alternatives considered:** (a) add the three platform paths to `literal-allowlist.json`; (b) tokenize the literal as `${TICKET_PREFIX}-NNNN` so build-time substitution resolves it per-team and the seed gets a generic example.
  - **Chosen approach:** (b) tokenize. The established pattern (epic-phase-1-foundation.md:422) replaces illustrative `THR-NNNN` examples with `${TICKET_PREFIX}-NNNN` placeholders substituted at sync time. (a) rejected: allowlisting ships a Thrive-ism into the consumer seed, contradicting the rule's whole purpose of being generic always-on content. The exact edit: in both `.prism/rules/skill-routing.md:17` and `templates/install/.prism/rules/skill-routing.md:17`, change `"start THR-123"` to `"start ${TICKET_PREFIX}-123"` (or `-NNNN` per the cited convention).
  - **Fix applied:** after human re-grant of the three Task-0 paths, Clove tokenized line 17 in both files (`${TICKET_PREFIX}-NNNN`), ran `pnpm prism:build`, and confirmed literal-guard and leftover-token guard both passed. The build substituted `${TICKET_PREFIX}` → `PRISM` in the platform outputs; the seed twin retains the token for consumer-side substitution at their team's config.
  - → promoted to no promotion needed (ticket-tactical; fix complete).

---

## History

- 2026-06-26 [hmcgrew/issue-302-skill-routing-claude-blind]: Winston designed the fix — extract AGENTS.md §0 Skill Auto-Routing into always-on Tier-1 rule `.prism/rules/skill-routing.md` (no `paths:` → syncs to `.claude/rules/` for Claude, AGENTS.md inlined block for Codex, `.cursor/`/`.codex/` for the rest); §9 Ownership & Handoff and the skills-ecosystem.md handoff phrases stay put. Scope call: handoff phrases are post-skill in-persona content and do NOT need externalizing — the pre-skill agent needs the routing table (which moves), not the handoff phrases. Reference sweep: all canonical §0 citations are name- or number-based and resolve against the preserved `## 0. Skill Auto-Routing` heading; zero dangling refs expected.
- 2026-06-26 [hmcgrew/issue-302-skill-routing-claude-blind]: Winston ruled on two ownership questions. Q1 (routing-fix write grant): added Task 0 — Hunter grants three per-file paths (`.prism/rules/skill-routing.md`, `AGENTS.md`, the seed twin) to the runtime `gates.json` `may_write`, ticket-scoped, Clove's hands off gates.json. Q2 (canonical gates.json back-door): confirmed REAL — gated Clove can edit canonical `.ai-skills/hooks/gates.json` + run build to propagate a weakened gate; recorded as a critical deferred Review Issue routed to the enforcement epic, kept out of #302.
- 2026-06-26 [hmcgrew/issue-302-skill-routing-claude-blind]: Clove implemented Tasks 1-3 (created `.prism/rules/skill-routing.md`, gutted AGENTS.md §0 to a thin pointer with heading preserved, registered the curated seed twin), then ran `pnpm prism:build`. Build synced the rule to `.claude/rules/`, `.codex/rules/`, `.cursor/rules/` and reverted the gates.json grant as expected, but failed `prism:test`'s literal-guard on the `THR-123` example in the Nora routing row — a Thrive literal safe in AGENTS.md but flagged once synced to platform rule dirs. See Decision: literal-guard divergence.
- 2026-06-26 [hmcgrew/issue-302-skill-routing-claude-blind]: Tasks 1-5 complete. After human re-grant, Clove tokenized `THR-123` → `${TICKET_PREFIX}-NNNN` on line 17 of canonical and seed twin, re-ran `pnpm prism:build` (literal-guard + leftover-token guard pass; 6 files updated; gates.json diff vs origin/main empty). `crossref-lint`, `install-adr-gate`, and `install-relative-link-gate` all pass. `.claude/rules/skill-routing.md` confirmed present; 4 pre-existing Windows path-norm test failures confirmed not regressions.
- 2026-06-26 [hmcgrew/issue-302-skill-routing-claude-blind]: Briar self-review complete. Content fidelity confirmed (all §0 sub-parts present), all 4 surfaces verified, all 8 citations resolve, tokenization clean. One minor finding added (link display text vs. href cosmetic in platform copies — non-blocking). PR Readiness updated; routing to Eric.

---

## Acceptance Criteria

### Behavioral

- [ ] Given a fresh Claude Code session in a PRISM-installed repo, When the session loads project instructions, Then the skill auto-routing table and routing governance are present in context (via `.claude/rules/skill-routing.md`).
- [ ] Given the build runs (`pnpm prism:build`), When it completes, Then `.claude/rules/skill-routing.md`, `.cursor/rules/skill-routing.mdc`, `.codex/rules/skill-routing.md`, and the AGENTS.md inlined Tier-1 block (containing the skill-routing body) all exist and match canonical.
- [ ] Given a Codex session, When it loads AGENTS.md, Then the skill auto-routing governance is present in the generated Tier-1 block (no regression for Codex).

### Non-behavioral

- [ ] `pnpm prism:check` passes (drift, check-types, tests, verify-manifest, crossref-lint all green).
- [ ] `pnpm prism:crossref-lint` reports crossref-lint, install-adr-gate, and install-relative-link-gate all passed.
- [ ] No bare `ADR-NNNN` reference appears in `.prism/rules/skill-routing.md` or its seed twin.
- [ ] The `## 0. Skill Auto-Routing` heading (number + name) is preserved in AGENTS.md; no other `## N` section is renumbered.
- [ ] No dangling reference to `AGENTS.md § 0` / `§ Skill Auto-Routing` across the canonical tree.
- [ ] The new rule has no `paths:` frontmatter (Tier-1 / always-on).

### AC Adjustments

### AC Sync Log

| Date | Agent | Action | Plan | Linear |
| ---- | ----- | ------ | ---- | ------ |
| 2026-06-26 | Winston | created AC | updated | N/A (GitHub issue tracker) |

---

## Review Issues

### Link display text vs. href mismatch in platform copies (cosmetic)

- **Severity:** `minor`
- **Status:** `open`
- **File:** `.claude/rules/skill-routing.md:29`, `.codex/rules/skill-routing.md:29`, `.cursor/rules/skill-routing.mdc:33`, `templates/install/.prism/rules/skill-routing.md:29`
- **Problem:** The `How to route` link text reads `.prism/architect/_toolkit/skills-ecosystem.md` but the href is `../architect/_toolkit/skills-ecosystem.md` — which resolves correctly per platform (`../architect/` from `.claude/rules/` → `.claude/architect/`), but the display text implies a `.prism/` path. A developer reading raw markdown in `.claude/rules/` sees a misleading path in the link label. The href is functionally correct and install-relative-link-gate passes; this is cosmetic only.
- **Suggested fix:** Non-blocking. Either (a) change display text to match href context (e.g. `skills-ecosystem.md` with no path prefix), or (b) leave as-is since crossref-lint passes. The mismatch won't cause breakage — the link target is valid. This is a build-time display artifact from a single canonical source serving multiple platform directories with different roots.

---

### Canonical gates.json back-door bypasses the runtime enforcement floor

- **Severity:** `critical`
- **Status:** `deferred` — **out of scope for #302; routes to the enforcement epic (Phase 5 / follow-up).** Do NOT fix in this ticket.
- **File:** `.ai-skills/hooks/gates.json` (canonical source), `scripts/ai-skills/build.ts:740-773` (`emitHooks`), `.ai-skills/hooks/ownership-guard.mjs` (`PROTECTED_WRITE_PATHS`)
- **Problem:** The `#301` denylist protects the *runtime* `.claude/hooks/gates.json` from in-place edits, but the *canonical* `.ai-skills/hooks/gates.json` is in `clove.may_write` (`.ai-skills/hooks/**`) and `build.ts` is too. A gated Clove can edit canonical `gates.json` (drop its own `tests` gate or widen `may_write`), run `pnpm prism:build`, and `emitHooks` copies the weakened gate raw to the runtime (no integrity validation) — the next SubagentStop reads a gate Clove authored, escaping the verdict gate. Same in-place-tamper class `#301` hardened, reopened via the canonical back door. The canonical → build → runtime path that `emitHooks`'s JSDoc calls "the only lawful path" has its protection on the wrong end of the pipe.
- **Suggested fix (priority order, for the epic — not #302):**
  1. **Protect the canonical enforcement sources from gated personas** — add `.ai-skills/hooks/**` (or at minimum `gates.json` + the enforcement `*.mjs`) to `ownership-guard.mjs` `PROTECTED_WRITE_PATHS`, OR carve `.ai-skills/hooks/**` out of `clove.may_write` (Clove writing its own *skill* under `.ai-skills/skills/prism-code-dev/**` stays legit; writing the enforcement *runtime sources* is the hole — separable). Cleanest single fix.
  2. **Build-refuses-to-emit-a-weaker-gate (defense in depth)** — `emitHooks` validates the canonical `gates.json` doesn't remove a gate or widen `may_write` vs. the live runtime without a human-approved diff. Heavier; backstop to #1.
  3. **Route gates.json through a human/non-gated path** — treat it like `.claude/settings.json` (hand-maintained). Q1's Task 0 already does this manually; #1/#2 make it structural.
  - Note: `build.ts` itself being in `may_write` is a related, larger surface — epic-scope, flagged but not part of this finding.

---

## PR Readiness

- [x] No critical or major issues (one pre-existing deferred critical; one new minor — non-blocking)
- [x] No stray console.logs or debug artifacts
- [x] Build passes — `pnpm prism:build` green (6 files updated; literal-guard and leftover-token guard pass; gates.json diff empty); `crossref-lint`, `install-adr-gate`, `install-relative-link-gate` all pass
- [x] Content fidelity confirmed — all §0 sub-parts present in the new rule (routing table, announce-then-invoke, built-in overrides, Atlas routing, utility skills, Sol-is-a-persona, skip heuristics, authors-ship/reviewers-review)
- [x] Rule reaches all surfaces — `.claude/rules/skill-routing.md` (Claude), `.codex/rules/skill-routing.md` (Codex), `.cursor/rules/skill-routing.mdc` (Cursor), AGENTS.md generated block (line 1331)
- [x] Citations resolve — all 8 named citers verified; `## 0. Skill Auto-Routing` heading preserved; no dangling refs
- [x] Tokenization clean — `${TICKET_PREFIX}-NNNN` in canonical + seed twin; `PRISM-NNNN` in platform copies; zero `THR-` literals in any synced output
- [x] No `paths:` frontmatter in canonical rule (Tier-1 / always-on confirmed)
- [x] No bare `ADR-NNNN` in rule or seed twin
- [ ] PR description up to date
- [ ] Lasting decisions promoted to architect context (no decisions generalize beyond this ticket)

**Task status:** Briar self-review complete. All tasks verified. One minor finding (link display text cosmetic — non-blocking). Ready for Eric.

**Last updated:** 2026-06-26
