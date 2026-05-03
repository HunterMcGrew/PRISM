# Plan: epic-prism-install-layout

## Ticket

PRISM Phase 1.5 (PR #2 of 2) — bifurcated install layout. No Linear ticket; phase-bridge work between Phase 1 (foundation) and Phase 2 (Atlas onboarding). Tracked here so Atlas in Phase 2 writes the new layout from day one.

Phase 1.5 has two PRs:
- **PR #2 — `prism-install-layout`** — this plan. Bifurcates the layout (`.prism/` canonical + platform-dir build copies).
- **PR #3 — `prism-tokenization`** — tracked in [`epic-phase-1-foundation.md`](./epic-phase-1-foundation.md) under `## Implementation Tasks > Clove (PR #3)`. Implements ADR-0030 substitution layer at the post-reorg paths.

## Goal

Move PRISM's platform-agnostic content (rules, ADRs, architect docs, templates, references, plans, lessons) out of `.claude/` and into a neutral `.prism/` directory. Platform dirs (`.claude/`, `.codex/`, `.cursor/`) retain only platform-specific bits (skills, native config) plus build-time copies of read-only canonical content for auto-load preservation.

---

## History

- 2026-05-03 [no branch yet — plan created on phase-1-foundation]: Plan created. Driven by Winston's evaluation of the asymmetry between platform-specific skill generation (which writes into `.claude/`, `.codex/`, `.cursor/`) and platform-agnostic content (which only landed in `.claude/`). See `.claude/plans/epic-phase-1-foundation.md` § Decisions for the full architectural reasoning.

---

## Decisions

- **Bifurcated install layout — `.prism/` canonical + platform-dir build copies.** Read-only canonical content (rules, ADRs, architect, templates, references) lives at `.prism/<area>/`. Platform dirs get build-time copies of read-only content (preserves Claude Code auto-load and equivalent on Codex/Cursor). Agent-written content (plans, lessons.md) lives only at `.prism/` — single source. ADR-0031 documents this. Full reasoning in `epic-phase-1-foundation.md` § Decisions.

- **Cross-reference convention: cite `.prism/<area>/<file>` paths in canonical sources.** Platform copies under `.claude/rules/` etc. are reflections — agents read whichever copy their platform's auto-load surfaced, but they edit the canonical at `.prism/`. Build-time guard fails if a canonical source contains `.claude/<area>/` or `.codex/<area>/` etc. paths outside skill files (where platform-specific paths are correct).

- **Distribution surface rename: `templates/claude/` → `templates/install/`.** The current name implies Claude-only distribution; the new layout is multi-platform. Renaming clarifies intent and updates `paths.json` accordingly.

- **Manifest moves with architect docs.** `.claude/architect/manifest.json` → `.prism/architect/manifest.json`. Routing patterns: file patterns like `.claude/skills/**` stay (skills stay platform-local), but architect doc references resolve relative to `.prism/architect/`.

- **Order vs PR #3 (tokenization): layout reorg ships first.** Tokenization sweeps at the final canonical paths instead of v1 `.claude/`-only paths. Saves a second sweep pass.

---

## Implementation Tasks

### Clove

1. **Create `.prism/` directory and move content.** `git mv .claude/rules/* .prism/rules/`, same for `spec/`, `architect/`, `templates/`, `references/`, `plans/`, `SPEC.md`, `lessons.md`. Use `git mv` so history follows the files.

2. **Update `.prism/architect/manifest.json` paths.** The manifest's keys are file-pattern matchers; values are paths to architect docs. After the move, value paths are still relative to the manifest's location (`.prism/architect/`), so most won't change. Verify each route still resolves.

3. **Extend `scripts/ai-skills/build.ts`** with read-only-content copy logic:
   - On every build, copy `.prism/rules/`, `.prism/spec/`, `.prism/architect/`, `.prism/templates/`, `.prism/references/` into each platform dir under `<platform-dir>/<area>/`
   - Add managed-marker file in each copied dir (`.ai-skill-generated`) so `prism:check` can detect out-of-band edits
   - Use the same drift-check mechanism as skills

4. **Update `.ai-skills/definitions/paths.json`** with new keys:
   - `canonical.contentRoot: ".prism"`
   - `generated.platformContentCopies` listing each platform-dir target

5. **Add build-time path guard.** Fail the build if any canonical source under `.prism/` references `.claude/<area>/`, `.codex/<area>/`, or `.cursor/<area>/` paths outside of skill files (where platform-specific paths are intentional). Allowlist: skill bodies that document platform-specific behavior.

6. **Sweep canonical sources for cross-reference rewrites.** All references to `.claude/rules/<rule>.md`, `.claude/architect/<doc>.md`, `.claude/spec/adrs/<adr>.md`, etc. become `.prism/rules/<rule>.md` etc. Touches: every file in `.prism/` (post-move), every file in `.ai-skills/skills/<id>/shared.md`, README.md, AGENTS.md, CLAUDE.md, docs/distribution.md, docs/parameterization.md.

7. **Rename `templates/claude/` → `templates/install/`.** `git mv` the directory. Restructure the contents to match the new layout: `templates/install/.prism/`, `templates/install/.claude/`, `templates/install/.codex/`, `templates/install/.cursor/`, `templates/install/AGENTS.md.tmpl`, `templates/install/CLAUDE.md.tmpl`. Update `paths.json` if it references `templates/claude/`.

8. **Update CLAUDE.md and AGENTS.md** with two changes: (a) sweep prose for `.claude/<area>/` refs and rewrite to `.prism/<area>/`; (b) add an explicit instruction to AGENTS.md (cross-platform constitution) that the agent should treat `.prism/rules/*.md` as the canonical rules surface, with platform-dir copies under `.claude/rules/` etc. as auto-load conveniences.

9. **Rewrite `docs/distribution.md`.** New source-to-destination map covering the bifurcated layout. Every row updates.

10. **Author ADR-0031 — Bifurcated install layout.** Write to both `.prism/spec/adrs/0031-bifurcated-install-layout.md` and `templates/install/.prism/spec/adrs/0031-bifurcated-install-layout.md`. Pull Context/Decision/Consequences from the Decisions entry above. Reference all five rejected alternatives explicitly.

11. **Author new architect doc — `install-layout.md`.** Write to `.prism/architect/install-layout.md` and `templates/install/.prism/architect/install-layout.md`. Documents the bifurcation convention, the canonical-vs-copy distinction, the cross-reference convention, the build-time copy mechanism, and the drift detection. Routes via `manifest.json` so any agent editing layout-related files loads the doc.

12. **Update `manifest.json` to route the new architect doc.** Add an entry mapping layout-related file patterns (e.g. `.prism/**`, `scripts/ai-skills/build.ts`, `.ai-skills/definitions/paths.json`) to the new `install-layout.md`.

13. **Run verification.** `pnpm prism:build` (regenerates everything), `pnpm prism:check` (drift check), `pnpm prism:check-types`. Open every persona session in chat and confirm rules still load (manual smoke test — Briar, Clove, Winston each).

14. **Ship per shipping-flow.** Single PR titled `chore: Bifurcate install layout — .prism/ canonical with platform copies`.

### Eli (after PR #2 merges)

15. **Update README.md** to describe the new layout. Particular attention to the "Repo shape" section (lines 38-72 of current README) — rewrite to show `.prism/`, the bifurcation, and the build-time copy mechanism. Update the Phase 1 / Phase 2 / Phase 3 narrative to note that Phase 1.5 (this work) shipped before Atlas.

16. **Write paired dev doc.** New architect doc at `.prism/architect/install-layout.md` (Clove's task #11) gets a paired human-readable companion at `docs/content/dev/architecture/install-layout.md` per the documentation pairing convention. Same topic, longer narrative, cross-link both ways.

---

## Acceptance Criteria

### Behavioral

- [ ] Given a consumer running Claude Code with the bifurcated layout installed, When the agent invokes any skill, Then the rules under `.claude/rules/` (build-time copy) are auto-loaded into context exactly as they are today
- [ ] Given a consumer running Codex with the bifurcated layout installed, When the agent invokes any skill, Then the rules under `.codex/rules/` (build-time copy) are reachable by the agent on the platform
- [ ] Given an edit to `.prism/rules/<rule>.md`, When `pnpm prism:build` runs, Then `.claude/rules/<rule>.md`, `.codex/rules/<rule>.md`, and `.cursor/rules/<rule>.md` reflect the change
- [ ] Given `pnpm prism:check` runs after a manual edit to `.claude/rules/<rule>.md` (out-of-band edit), Then the drift check fails and reports the file
- [ ] Given the dogfood install in this repo, When any persona session starts, Then plans are read from and written to `.prism/plans/` (not `.claude/plans/`)
- [ ] Given any canonical source under `.prism/` containing a `.claude/rules/` or `.claude/architect/` path reference (other than skill files documenting platform-specific behavior), When `pnpm prism:check` runs, Then the build fails with a path-guard error

### Non-behavioral

- [ ] All internal path references in canonical sources use `.prism/<area>/<file>` form
- [ ] ADR-0031 authored in both dogfood and templates
- [ ] New architect doc at `.prism/architect/install-layout.md` (mirrored to templates) documents the bifurcation
- [ ] `docs/distribution.md` rewritten with the new source-to-destination map
- [ ] `templates/claude/` renamed to `templates/install/` with the bifurcated sub-layout
- [ ] `manifest.json` updated to route layout-related files to the new architect doc
- [ ] `README.md` "Repo shape" section reflects the new layout (Eli's task)
- [ ] Paired dev doc exists at `docs/content/dev/architecture/install-layout.md` (Eli's task)

---

## Cleanup Items

- None expected; flagged here in case the migration surfaces stale content in `.claude/` that wasn't part of any tracked area (e.g. orphan files left behind by earlier work).

---

## PR Readiness

Living checklist — updated when Briar self-reviews PR #2.

- [ ] No critical or major issues
- [ ] Types correct — `pnpm prism:check-types` passes
- [ ] No stray console.logs or debug artifacts
- [ ] Tests written for new logic and edge cases (path-guard test, copy-logic regression test)
- [ ] All debugged issues resolved
- [ ] Build passes — `pnpm prism:check` passes; manual smoke test on each persona session confirms rules still load
- [ ] PR description up to date
- [ ] Lasting decisions promoted to architect context (ADR-0031 and `install-layout.md` are exactly this)

**Last updated:** 2026-05-03
