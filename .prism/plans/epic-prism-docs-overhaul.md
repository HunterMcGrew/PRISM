# Plan: epic-prism-docs-overhaul

## Ticket

No Linear ticket — PRISM's own work tracks via plan files + PRs. Epic A of a three-epic program (A: docs, B: prism:sync steady-state, C: first-contact reconciliation). See `epic-prism-sync-steady-state.md` and `epic-prism-first-contact-reconciliation.md` for the deferred siblings.

## Goal

Retire Thrive's inherited documentation system, stand up a flat config-driven `docs/`, and write PRISM's own user guides — so a developer who pulls PRISM down has an on-ramp that isn't "read 17 skill files and the spec."

---

## Implementation Tasks

### Clove (implementation)

1. **Add a `documentation` block to `.ai-skills/config.schema.json`.** Lightweight and *extensible, not exhaustive* (see Decisions): `location` (string, e.g. `docs/`), `audience` (string/short growable enum, e.g. `developer-user`), `keepsDevDocs` (boolean — does this team maintain technical/dev docs separate from user docs), `format` (open string or growable enum — NOT a closed union; PRISM = flat-markdown-guides, Thrive = nextra-blocks). Mirror the shape/validation style of the existing `techStack` and `rules` blocks. Update `.ai-skills/config.json` (PRISM's own) to answer it: `{ location: "docs/", audience: "developer-user", keepsDevDocs: false, format: "flat-markdown-guides" }`.
2. **Flatten the docs tree.** Collapse `docs/content/dev/` and the Thrive-shaped `docs/content/user/` taxonomy into a flat `docs/<files>` + `docs/<folders>`. Move `docs/parameterization.md` stays at `docs/`. Migrate the genuinely PRISM-relevant content out of `docs/content/dev/` (most is contributor/build internals — keep what a user needs, drop the rest; `distribution.md` content is needed by Epic B docs, preserve it). No `content/` wrapper.
3. **Remove dead references to the paired-dev-doc convention** once Winston supersedes the ADRs (task below): strip the `docs/content/dev/architecture/**` path from `.prism/rules/architect-doc-verification.md` frontmatter; confirm no build script references the (never-implemented) pairing gate — `package.json` `prism:check` does NOT call a pairing check today, verified 2026-05-29.

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

1. **Supersede the paired-dev-doc ADRs.** Write one ADR that supersedes ADR-0023 (source-verified review of dev docs), ADR-0038 (paired-dev-doc gates), and the dev-doc half of ADR-0044 — documenting that PRISM has one audience (the developer-user), dev/user doc pairing is retired, and doc format is now a per-team onboarding output. Note these were correct for Thrive's Nextra/block context; the context changed when PRISM became its own product.
2. **Rework Theo's paired-doc workflow.** `.prism/skills/prism-doc-walker/` steps 05/06/07 draft paired dev docs as a core flow. Demote paired-doc drafting to *config-conditional* (only when `documentation.keepsDevDocs` is true). Hand the actual edits to Clove/Eli once the ADR lands.

---

## Decisions

- **Doc format is an Atlas onboarding output, not a hardcoded default.** Extends the existing `techStack` → per-team rule-generation precedent (Phase 2). **Why:** hardcoding a PRISM-native format just repeats the Thrive mistake for the next consumer — replacing one hardcoded format with another is the same bug with a new default.
  - → no promotion needed (captured in the superseding ADR per Winston task 1).
  - **Zoe verdict (2026-06-05):** `live` — Epic A active, implementation not started (no `documentation` block in config.schema.json as of this audit); decision governs upcoming work.
- **One Eli mechanism; PRISM is its first consumer.** PRISM's own `config.json` answers the doc questions for PRISM; Eli reads config and writes PRISM's flat guides *through* the same mechanism a consumer team uses. No separate "PRISM docs" vs "consumer docs" systems. Dogfooding holds.
  - → no promotion needed (ticket-tactical; the config-driven principle lands in the ADR).
  - **Zoe verdict (2026-06-05):** `live` — Epic A active, implementation not started (no `documentation` block in config.schema.json as of this audit); decision governs upcoming work.
- **Lightweight config + adaptive Eli — no format-generator matrix yet.** PRISM (flat-markdown-guides) and Thrive (nextra-blocks) are two genuinely divergent formats *today*, which earns the config-driven *seam* now (per code-standards.md "two adapters earn the seam"). It does NOT earn a pluggable per-framework generator. Build the seam; defer format-specific handlers until a second concrete format forces one. Considered: building Nextra/Docusaurus/Storybook adapters now — rejected as premature abstraction against formats no live consumer has specified.
  - → promoted to the superseding ADR (the seam-vs-fill split is a durable architectural decision).
  - **Zoe verdict (2026-06-05):** `live` — Epic A active, implementation not started (no `documentation` block in config.schema.json as of this audit); decision governs upcoming work.
- **Config schema extensible, not exhaustive.** `documentation.format` is an open string / growable enum, never a closed union. **Why:** keeps SPC (and any future team) a one-field config change, not a schema migration.
  - → promoted to the superseding ADR.
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
  - → promoted to the superseding ADR (cross-epic contract).
  - **Zoe verdict (2026-06-05):** `live` — Epic A active, implementation not started (no `documentation` block in config.schema.json as of this audit); decision governs upcoming work.

## History

- 2026-05-29 [claude/stupefied-ardinghelli-189bdd]: Plan created from a Winston design session (party mode: Atlas, Eli, Mira, Sage, Clove). Captured the de-Thrive + config-driven-Eli direction; B and C split into deferred sibling epics.

## Acceptance Criteria

### Behavioral

- [ ] Given a developer who has never used PRISM, When they open the README, Then they reach a working setup in their repo by following links into one getting-started guide (no setup steps duplicated across README/guide/Atlas).
- [ ] Given a developer mid-feature, When they read the practitioner guide, Then they can tell which persona to invoke next and what it hands off to, without reading any SKILL.md.
- [ ] Given the PRISM repo itself, When Eli writes a doc, Then the output shape comes from PRISM's `config.json` `documentation` block, not from hardcoded WordPress/block assumptions.

### Non-behavioral

- [ ] No user-facing doc restates the tier table, the persona roster, or config keys inline — each links to its single source (SPEC.md / AGENTS.md / parameterization.md).
- [ ] No user guide contains point-in-time language ("current," "in progress"); status lives only in CHANGELOG + dated README block.
- [ ] `documentation.format` in the schema is an open/growable type, not a closed union.
- [ ] ADRs 0023, 0038, and the dev-doc half of 0044 are marked superseded with a successor ADR.
