# Plan: epic-prism-docs-overhaul

> Closed: 2026-06-16

## Ticket

No Linear ticket — PRISM's own work tracks via plan files + PRs. Epic A of a three-epic program (A: docs, B: prism:sync steady-state, C: first-contact reconciliation). See `epic-prism-sync-steady-state.md` and `epic-prism-first-contact-reconciliation.md` for the deferred siblings.

## Goal

Retire Thrive's inherited documentation system, stand up a flat config-driven `docs/`, and write PRISM's own user guides — so a developer who pulls PRISM down has an on-ramp that isn't "read 17 skill files and the spec."

---

## Implementation Tasks

### Clove (implementation)

1. **Add a `documentation` block to `.ai-skills/config.schema.json`.** Lightweight and *extensible, not exhaustive* (see Decisions): `location` (string, e.g. `docs/`), `audience` (string/short growable enum, e.g. `developer-user`), `keepsDevDocs` (boolean — does this team maintain technical/dev docs separate from user docs), `format` (open string or growable enum — NOT a closed union; PRISM = flat-markdown-guides, Thrive = nextra-blocks). Mirror the shape/validation style of the existing `techStack` and `rules` blocks. Update `.ai-skills/config.json` (PRISM's own) to answer it: `{ location: "docs/", audience: "developer-user", keepsDevDocs: false, format: "flat-markdown-guides" }`.
2. **Flatten the docs tree.** Collapse `docs/content/dev/` and the Thrive-shaped `docs/content/user/` taxonomy into a flat `docs/<files>` + `docs/<folders>`. Move `docs/parameterization.md` stays at `docs/`. Migrate the genuinely PRISM-relevant content out of `docs/content/dev/` (most is contributor/build internals — keep what a user needs, drop the rest; `distribution.md` content is needed by Epic B docs, preserve it). No `content/` wrapper.
3. **Remove dead references to the paired-dev-doc convention** once Winston supersedes the ADRs (task below): strip the `docs/content/dev/architecture/**` path from the `architect-doc-verification.md` frontmatter in **both** copies — canonical `.prism/rules/architect-doc-verification.md` AND the templates mirror `templates/install/.prism/rules/architect-doc-verification.md` (the two share identical frontmatter; only the `**Why:**` prose body differs, so edit the `paths:` block in each). Confirm no build script references the (never-implemented) pairing gate — `package.json` `prism:check` does NOT call a pairing check today (it calls build-check, prism:test, prism:verify-manifest, prism:crossref-lint), verified 2026-06-16.

### Atlas (onboarding)

1. **Add a documentation question set to onboarding** that populates the new `documentation` config block. For an *established* repo, detect the existing docs layout (scan for `docs/`, Nextra/Docusaurus config, etc.) and propose it as the default rather than asking cold. This is the seam SPC and Thrive fill at their onboarding/sync time.

### Eli (documentation)

1. **De-Thrive Eli's kit — make it config-driven, not PRISM-hardcoded.** Rewrite `.prism/references/user-doc-template.md` to read `documentation` config instead of hardcoding "dealers / site builders / WordPress admin / blocks." Same for `.prism/references/documentation/startup.md` — drop the dev/user audience-split assumption and the `docs/content/user/blocks/` keying; read audience + location from config. The Thrive-isms (blocks, WordPress, Nextra, dev/user split, paired docs) demote from hardcoded assumptions to *possible configured answers*.
2. **Write PRISM's own user guides**, organized by reader goal (Mira), not by topic:
   - Evaluator-facing: project overview (what PRISM is, why adopt) — feeds the slim README.
   - Operator-facing: getting started / setup — the single authoritative home for setup steps; README + Atlas intro point *in* (see Decisions: Atlas single source of truth).
   - Practitioner-facing: the workflow guide (ticket → plan → implement → review → ship; who to call when) + a persona reference at the "what they do / when to call / what they hand off to" altitude that *links* to each SKILL.md rather than re-listing behavior. The tier system folds into this guide as the "why your rules load when they do" answer — not a standalone topic dump.
   - Each guide carries a "Going deeper" pointer to `SPEC.md` + `.prism/spec/adrs/` for readers who want the technical record (no new deep-dive docs written — that tier already exists).
3. **Slim the README** to a true front door: one-paragraph overview, quick start that points into the getting-started guide, repo shape, commands. Pull the phased-roadmap + status content OUT (see Sage decision).

### Sage (changelog)

1. **Give roadmap/status a single timeless-safe home.** The README's "Status:" line and phased roadmap are point-in-time content that rots on every ship. Move to a `CHANGELOG.md` (or release notes generated between git tags) + a short, clearly-*dated* status block in the README. The user *guides* stay timeless — no "current" / "in progress" language anywhere in them.

### Winston (architecture)

1. **Supersede the paired-dev-doc ADRs.** Write one ADR — **next number is 0058** — that supersedes ADR-0023 (source-verified review of dev docs), ADR-0038 (paired-dev-doc gates), and the dev-doc half of ADR-0044 — documenting that PRISM has one audience (the developer-user), dev/user doc pairing is retired, and doc format is now a per-team onboarding output. Note these were correct for Thrive's Nextra/block context; the context changed when PRISM became its own product. **Dual-write to both `.prism/spec/adrs/_toolkit/0058-<slug>.md` AND `templates/install/.prism/spec/adrs/_toolkit/0058-<slug>.md`** (the `_toolkit/` subdir and the canonical+templates dual-write are both live conventions post the `_toolkit` reorg, #155, and the prism:update epic). Also flip the `Status:` line of all three superseded ADRs to `superseded by 0058` in **both** their canonical and templates copies (6 files: 0023/0038/0044 × 2 trees). 0023 and 0038 retain accuracy-bar value for the *architect-doc* surface (`.prism/architect/**`) — supersession retires only the **paired dev-doc** half, not source-verified review of architect docs themselves; the superseding ADR must say so explicitly.
2. **Rework Theo's paired-doc workflow.** `.prism/skills/prism-doc-walker/` steps 05/06/07 draft paired dev docs as a core flow. Demote paired-doc drafting to *config-conditional* (only when `documentation.keepsDevDocs` is true). Hand the actual edits to Clove/Eli once the ADR lands.

---

## Decisions

- **Doc format is an Atlas onboarding output, not a hardcoded default.** Extends the existing `techStack` → per-team rule-generation precedent (Phase 2). **Why:** hardcoding a PRISM-native format just repeats the Thrive mistake for the next consumer — replacing one hardcoded format with another is the same bug with a new default.
  - → promoted to ADR-0058 (Decision: doc format/placement is a per-team onboarding output Atlas owns) and `.prism/architect/_toolkit/documentation.md` (§ Model overview — reads `documentation.format` from config).
  - **Zoe verdict (2026-06-05):** `live` — Epic A active, implementation not started (no `documentation` block in config.schema.json as of this audit); decision governs upcoming work.
- **One Eli mechanism; PRISM is its first consumer.** PRISM's own `config.json` answers the doc questions for PRISM; Eli reads config and writes PRISM's flat guides *through* the same mechanism a consumer team uses. No separate "PRISM docs" vs "consumer docs" systems. Dogfooding holds.
  - → no promotion needed (ticket-tactical; the config-driven principle lands in the ADR).
  - **Zoe verdict (2026-06-05):** `live` — Epic A active, implementation not started (no `documentation` block in config.schema.json as of this audit); decision governs upcoming work.
- **Lightweight config + adaptive Eli — no format-generator matrix yet.** PRISM (flat-markdown-guides) and Thrive (nextra-blocks) are two genuinely divergent formats *today*, which earns the config-driven *seam* now (per code-standards.md "two adapters earn the seam"). It does NOT earn a pluggable per-framework generator. Build the seam; defer format-specific handlers until a second concrete format forces one. Considered: building Nextra/Docusaurus/Storybook adapters now — rejected as premature abstraction against formats no live consumer has specified.
  - → promoted to ADR-0058 (the seam-vs-fill split is a durable architectural decision — config-driven seam now, format-specific handlers deferred until a second concrete format forces one).
  - **Zoe verdict (2026-06-05):** `live` — Epic A active, implementation not started (no `documentation` block in config.schema.json as of this audit); decision governs upcoming work.
- **Config schema extensible, not exhaustive.** `documentation.format` is an open string / growable enum, never a closed union. **Why:** keeps SPC (and any future team) a one-field config change, not a schema migration.
  - → promoted to ADR-0058 (extensibility is the durable contract behind the per-team-onboarding-output decision); shipped in `.ai-skills/config.schema.json` (PR-1, #181 — `format` is an open `string`, `additionalProperties: false` removed per PR-1 re-review).
  - **Zoe verdict (2026-06-05):** `live` — Epic A active, implementation not started (no `documentation` block in config.schema.json as of this audit); decision governs upcoming work.
- **Guides only; deep-divers read SPEC + ADRs.** No new technical-doc tier. `SPEC.md`, `AGENTS.md`, and `.prism/spec/adrs/` already *are* the deep-dive record for the "how does it work" reader, kept current as a matter of course. Guides link to them.
  - → no promotion needed (scoping decision, self-evident from the docs themselves).
  - **Zoe verdict (2026-06-05):** `live` — Epic A active, implementation not started (no `documentation` block in config.schema.json as of this audit); decision governs upcoming work.
- **Atlas is the single authoritative home for setup steps.** README quick-start and Atlas's skill intro point *into* the getting-started guide; `parameterization.md` stays the config-key source. **Why:** three copies of the setup story (README, Atlas skill, a new doc) drift independently.
  - → no promotion needed (ticket-tactical).
  - **Zoe verdict (2026-06-05):** `live` — Epic A active, implementation not started (no `documentation` block in config.schema.json as of this audit); decision governs upcoming work.
- **Organize docs by reader goal, not by topic.** Three readers: evaluator (deciding to adopt), operator (installing), practitioner (using daily). **Why (Mira):** nobody wakes up wanting to "understand the five tiers" — they want "how do I set this up," "who do I call next."
  - → no promotion needed (codified in Eli's rewritten startup sequence).
  - **Zoe verdict (2026-06-05):** `live` — Epic A active, implementation not started (no `documentation` block in config.schema.json as of this audit); decision governs upcoming work.
- **Roadmap/status out of the timeless docs.** Into `CHANGELOG.md` + a dated README status block. **Why (Sage):** point-in-time content in timeless guides rots on every ship and creates two drifting snapshots.
  - → no promotion needed (ticket-tactical).
  - **Zoe verdict (2026-06-05):** `live` — Epic A active, implementation not started (no `documentation` block in config.schema.json as of this audit); decision governs upcoming work.
- **Docs are team-owned content; sync must never clobber them.** The `documentation.location` field tells the Epic B sync layer where the team's docs live so the merge leaves that path alone — same hands-off class as `.prism/plans/` and `lessons.md`. **Why (Eli):** forward dependency — wire it now so a future `prism:sync` can't stomp a team's `docs/`.
  - → promoted to ADR-0058 (cross-epic contract — `documentation.location` as the Epic B sync hands-off boundary; ADR-0058 records doc placement as a per-team output the sync layer must respect).
  - **Zoe verdict (2026-06-05):** `live` — Epic A active, implementation not started (no `documentation` block in config.schema.json as of this audit); decision governs upcoming work.

## History

- 2026-05-29 [claude/stupefied-ardinghelli-189bdd]: Plan created from a Winston design session (party mode: Atlas, Eli, Mira, Sage, Clove). Captured the de-Thrive + config-driven-Eli direction; B and C split into deferred sibling epics.
- 2026-06-16 [hmcgrew/epic-a-plan-sync]: Winston build-readiness pass for Sol. Synced two stale task lines to current main: Clove task 3 now names both `architect-doc-verification.md` copies (canonical + templates mirror); Winston task 1 now names ADR-0058, the `_toolkit/` dual-write path, and scopes supersession to the dev-doc half only. Design unchanged — no replan.
- 2026-06-16 [hmcgrew/epic-a-pr1-doc-config]: PR-1 — added `documentation` config block to `.ai-skills/config.schema.json` (open-string format, four properties) and answered it in `.ai-skills/config.json` for PRISM; updated `PrismOnDiskConfig` interface and `serializeConfig` key order in `scripts/ai-skills/lib/onboarding-config.ts`. All checks green (prism:check, prism:check-types).
- 2026-06-16 [hmcgrew/epic-a-pr1-doc-config]: PR-1 re-review (Briar) — Clove removed `additionalProperties: false` from the `documentation` schema block (commit `e1159a0`; only `.ai-skills/config.schema.json` touched). Four properties intact, `format` still open string, sibling extensibility restored. `pnpm prism:check` green, `pnpm prism:check-types` exit 0. Minor resolved; PR #181 ready for Eric.
- 2026-06-16 [hmcgrew/epic-a-pr2-adr0058]: PR-2 — authored ADR-0058 (single-audience retires paired dev docs) dual-written to canonical + templates trees; flipped 0038 to `superseded` (wholesale) and added `Superseded-in-part-by: 0058` notes to 0023 (architect-doc gate survives) and 0044 (direct-write spine survives) across both trees; added 0058 to the ADR index and allowlisted its Thrive-context literal. Downstream prose sweep (Clove task 3, Winston task 2) remains separate Epic A lanes.
- 2026-06-16 [epic-a parallel-wave lanes, consolidated at close]: Sol tracked the remaining lanes in run-state to avoid merge conflicts; capturing them here. PR-1 documentation config block (#181), PR-2 ADR-0058 (#182), PR-3-eli config-driven Eli kit + de-Thrive references (#185), PR-3-atlas documentation onboarding question set with established-repo detection (#186), PR-4a paired-dev-doc retirement from spec surfaces (#184), PR-4b docs-tree flatten + taxonomy de-Thrive (#183), PR-5 user guides + slim README + CHANGELOG (#187). All seven merged 2026-06-16.
- 2026-06-16 [hmcgrew/epic-a-close]: Epic A closed (#180). Ran the decision verdict gate — all ten Decisions carry explicit verdicts; finalized the four ADR-promoted verdicts to name landed surfaces (ADR-0058 + `documentation.md` + config.schema.json) and confirmed the six `no-promotion-needed` calls hold. Verified ADR-0058 dual-write, the 0038/0023/0044 status flips in both trees, and the config-driven `documentation.md` all landed; checked the satisfied AC boxes.

## Acceptance Criteria

### Behavioral

- [x] Given a developer who has never used PRISM, When they open the README, Then they reach a working setup in their repo by following links into one getting-started guide (no setup steps duplicated across README/guide/Atlas).
- [x] Given a developer mid-feature, When they read the practitioner guide, Then they can tell which persona to invoke next and what it hands off to, without reading any SKILL.md.
- [x] Given the PRISM repo itself, When Eli writes a doc, Then the output shape comes from PRISM's `config.json` `documentation` block, not from hardcoded WordPress/block assumptions.

### Non-behavioral

- [x] No user-facing doc restates the tier table, the persona roster, or config keys inline — each links to its single source (SPEC.md / AGENTS.md / parameterization.md).
- [x] No user guide contains point-in-time language ("current," "in progress"); status lives only in CHANGELOG + dated README block.
- [x] `documentation.format` in the schema is an open/growable type, not a closed union.
- [x] ADRs 0023, 0038, and the dev-doc half of 0044 are marked superseded with a successor ADR.

---

## Review Issues

### PR-1: `additionalProperties: false` inconsistent with sibling schema blocks

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `.ai-skills/config.schema.json` — `documentation` block
- **Problem:** The `documentation` object block sets `additionalProperties: false`; all sibling object blocks (`rules`, `github`, `ticketSystem`) leave it unset. The plan says to "mirror the shape/validation style of the existing `techStack` and `rules` blocks." Runtime impact is zero (JSON schema is IDE tooling only; `validateOnDiskConfig` does not enforce it). The inconsistency is a forward-compatibility footgun: any future undeclared key Atlas writes to `documentation` would appear as an IDE schema violation, while siblings accept unknown keys silently.
- **Suggested fix:** Remove `additionalProperties: false` from the `documentation` block to match sibling style.

---

## Cleanup Items

None.

---

## PR Readiness

Living checklist for PR-1 (`hmcgrew/epic-a-pr1-doc-config`, PR #181).

- [x] No critical or major issues
- [x] Types correct — `documentation` block optional, all sub-fields optional, `format` is `string` not enum
- [x] No stray console.logs or debug artifacts
- [x] Tests written for new logic — no new logic paths requiring tests (schema addition + serializer key order only)
- [x] All debugged issues resolved (no `open` entries)
- [x] Build passes — skipped (diff does not affect Next.js bundle; only `.ai-skills/config*.json` and `scripts/ai-skills/lib/onboarding-config.ts`)
- [x] `pnpm prism:check` — green (exit 0, 2026-06-16)
- [x] `pnpm prism:check-types` — exit 0 (2026-06-16)
- [ ] Minor: `additionalProperties: false` inconsistency (see Review Issues) — non-blocking, acceptable to ship
- [x] PR description up to date
- [x] Scope clean — 4 files only; stash on unrelated branch; cherry-pick left no artifacts; HEAD `4db5521`

**Last updated:** 2026-06-16
