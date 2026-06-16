# Changelog

PRISM has no versioned releases. This file tracks the evolution of the toolkit by phase and epic, sourced from the development history. Most recent work is at the top.

---

## [Epic C — First-Contact Reconciliation] — 2026-06-16

Epic tracking issue: #195

- Added `pnpm prism:adopt` install entry — seeds `.prism/` from `templates/install/.prism/`, then runs the first sync to establish the steady-state baseline manifest (#196)
- Added first-contact onboarding mode to Atlas — detects established repos, surveys existing skills/architect-docs/ADRs/rules/docs (and their paths), runs a discovery sweep, and adopts-or-leaves per asset class without overwriting existing work (#197)
- Added ADR-0059 (first-contact adopts via seed-and-sync), updated install-layout doc with first-contact section, and closed the epic (#198)

---

## [Epic A — Docs Overhaul] — 2026-06-16

Epic tracking issue: #180

- Added Atlas documentation onboarding question set with established-repo detection (#186)
- Made the documentation kit config-driven and removed Thrive-specific references from operational docs (#185)
- Flattened the `docs/` tree and de-Thrived the taxonomy — `content/dev/` moved to top-level `docs/` (#183)
- Retired the paired-dev-doc convention from spec surfaces; added ADR-0058 (#182, #184)
- Added documentation config block to `.ai-skills/config.schema.json` (#181)
- Wrote timeless user guides (`docs/overview.md`, `docs/getting-started.md`, `docs/workflow.md`, `docs/personas.md`) and slimmed the README (#187)

---

## [#171 — prism:migrate-skill CLI] — 2026-06-16

- Added `pnpm prism:migrate-skill` command for migrate-mode automation when renaming or moving skill sources (#177)

---

## [#170 — prism:update hardening] — 2026-06-16

- Hardened `prism:update` source handling and deduplicated platform-dir resolution (#176)

---

## [#163, #164 — check and cleanup] — 2026-06-15 to 2026-06-16

- Added prose cross-reference lint to `pnpm prism:check` — broken internal links now fail CI (#175)
- Deleted the orphaned `.generated/cursor-skills/` tree (#174)

---

## [#154 — prism:update epic] — 2026-06-15

Epic: distribution-pull and consumer sync tooling

- Phase 1: `_toolkit` namespace separation — moved architect docs and ADRs to underscore-prefixed subdirs (#156)
- Phase 2: hash manifest (`.sync-manifest.json`) for drift detection (#165)
- Phase 3: `pnpm prism:update` command — three-way merge into consumer repos (#167)
- Phase 4: `.prism/custom` overlay model for consumer overrides (#168)
- Phase 5: path-based ownership classifier (#166)
- Phase 7: `prism-skill-forge` utility skill for creating new skills from within PRISM (#169)
- ADR-0057 promotion and install-layout doc update on epic close (#172)

---

## [Sol conductor — #115, #127, #131, #138] — 2026-06-13 to 2026-06-14

Epic: Sol multi-agent orchestration conductor

- Phase A: self-growing conductor v1 — scaffold, goal-state, agent definitions, report-back protocol, fleet management (#126)
- Phase B: hierarchy decomposition and greenfield decompose mode (#144)
- Phase C: teams, cross-team seam, and integration gate (#145)
- Phase D: scale — batching and partitioning (#146)
- ADR-0048, ecosystem registration, and dev doc on epic close (#106)
- Added seed-sync enforcement and CI workflow (#151)
- Added idempotency marker to Eric's PR-review summary template (#149)
- Inlined Tier-1 rule bodies into AGENTS.md so Codex honors the tier model (#153)

---

## [Wave 4 — Thrive backports] — 2026-06-04 to 2026-06-05

Backport wave 4 from Thrive's `.claude/` toolkit:

- Wave 4.1: governance and git-workflow rule ports (#76)
- Wave 4.2: utility-skill support (`/prism-handoff`) (#78)
- Wave 4.3: `prism-review-loop` utility skill (#85)
- Cross-runtime rule-tier honoring: Cursor `.mdc` globs and Codex AGENTS.md block (#102)
- Slimmed AGENTS.md — externalized behavioral norms to Tier 1 rules (#100)
- Three-tier follow-up-scope model ported from Thrive (#114)
- Added CONTEXT.md ubiquitous-language glossary (#89)

---

## [Wave 3 — writing and AC rules] — 2026-06-04

- Wave 3.1: writing voice and acceptance-criteria rule refinements (#72)

---

## [Wave 2 — persona upgrades] — 2026-05-24

- Wave 2 PR 1: Foundation rules and closing-messages doc (#41)
- Wave 2 PR 2: Sasha six-phase debug workflow, evidence grading, case file (#42)
- Wave 2 PR 3: Eric two-axis review restructure (#43)
- Wave 2 PR 4: Winston re-plan mode, vertical slicing, AFK/HITL, mode banners (#44)
- Wave 2 PR 5: Iris persona and Parker/Atlas STOP conventions (#45)
- Backport from Thrive PR 2028: shipping-flow agent hygiene (#47)
- Backport from Thrive PR 2039: structural-leverage review concepts (#69)

---

## [Phase 3 — Parker PRD persona] — 2026-05-23

- PRISM-3.1: Scaffolded Parker with greenfield mode (#27)
- PRISM-3.2: Brownfield mode step files (#28)
- PRISM-3.3: Reviewer rubric dispatch (#29)
- PRISM-3.4: Linear initiative handoff (#30)
- PRISM-3.5: ADR-0043 and paired dev doc (#31)

---

## [Phase 2.6 — Ren refactor scout] — 2026-05-23

- PRISM-2.6.1: Scaffolded Ren skill source and registered role (#23)
- PRISM-2.6.2: Step files for the 8-phase scout workflow (#24)
- PRISM-2.6.3: State lib doc and gitignore (#25)
- PRISM-2.6.4: ADR-0042 and paired dev doc (#26)

---

## [Phase 2.5 — Theo architect-doc walker] — 2026-05-22 to 2026-05-23

- PRISM-2.5.1: Scaffolded Theo skill source and registered role (#19)
- PRISM-2.5.2: Step files for the 8-phase workflow (#20)
- PRISM-2.5.3: State lib doc, scenarios, gitignore (#21)
- PRISM-2.5.4: ADR-0041 and paired dev doc (#22)
- Dogfooded Atlas against this repo — smoke test, anchor warning fix, docs (#18)

---

## [Phase 2 — Atlas onboarding skill] — 2026-05-22

- PRISM-2.1: Atlas skill scaffold, interactive flow, config writing (#14)
- PRISM-2.2: Stack detection subsystem (#15)
- PRISM-2.3: Per-team rule generators (#16)
- PRISM-2.4: Stub-anchor population mechanism (#17)

---

## [Phase 1.5 — bridge work] — 2026-05-22 to 2026-05-23

Five sub-phases (1.5a through 1.5f) consolidating the bifurcated install layout and closing gaps from Phase 1:

- PRISM-1.5c.1: Universal rule backports (#6)
- PRISM-1.5c.2: Sasha upgrade (#7)
- PRISM-1.5c.3: Nora upgrade (#8)
- PRISM-1.5c.4: Eric dual-mode (#9)
- PRISM-1.5c.5: Three-tier rule loading model (#10)
- PRISM-1.5c.6: Zoe persona (#11)
- PRISM-1.5d: Tokenization and content cleanup (#12)
- PRISM-1.5e: Deletion test added to Winston, Eric, Briar (#13)
- Phase 1.5f: Collapsed `.generated/`, committed `.cursor/skills/`, decisions verdict pattern, draft-PR-by-default, ADR-0044 (#34–#38)
- Replaced manifest catch-all with explicit globs and shipped ADR-0035 (#49)
- Codified implementation task detail bar; routed Pixel through Winston (#3)

---

## [Phase 1 — Foundation] — 2026-05-02 to 2026-05-04

- Initial extraction from Thrive's `.claude/` toolkit (2026-05-02)
- Phase 1: skill generator, canonical sources for every named persona, dogfood prefix migration (#1)
- Bifurcated install layout — `.prism/` canonical with build-time copies into platform dirs (#2)
