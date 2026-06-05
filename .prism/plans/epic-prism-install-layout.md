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

- 2026-05-03 [no branch yet — plan created on phase-1-foundation]: Plan created. Driven by Winston's evaluation of the asymmetry between platform-specific skill generation (which writes into `.claude/`, `.codex/`, `.cursor/`) and platform-agnostic content (which only landed in `.claude/`). See `.prism/plans/epic-phase-1-foundation.md` § Decisions for the full architectural reasoning.
- 2026-05-03 [prism-install-layout]: Branch cut off post-merge main following PR #1 squash-merge. Hunter directed: "make sure phase 1.5's implementation is detailed so there is no guesswork." Winston dispatched 3 parallel Explore agents for discovery: (1) full path-reference inventory across canonical content (returned 687 swap-targets, zero ambiguous classifications); (2) skill startup-sequence audit across all 12 canonical skills (returned explicit Read line numbers, in-body citations, layout assumptions); (3) templates surface classification (returned per-file destinations: AGENTS.md.tmpl to root, CLAUDE.md.tmpl to .claude/, everything else under .prism/<area>/). Folded all three intel sets into the plan's `## Implementation Tasks` section. Clove rewrite: 14 sub-bulleted tasks with concrete commands, file-level scope, ordering guarantees, edge cases, and verification recipes. Eli rewrite: 3 tasks (distribution.md rewrite, README "Repo shape" rewrite, paired dev doc) split cleanly from Clove's mechanical path-swap pass. Carried forward `epic-phase-1-foundation.md` PR #1 closeout history into this branch.
- 2026-05-03 [prism-install-layout]: Clove executed PR #2 Clove tasks 1-14. Created `.prism/` tree and `git mv`-ed all canonical content (rules, architect, spec, templates, references, plans, SPEC.md, lessons.md) — git rename detection clean across 50+ files. Updated `.prism/architect/manifest.json` keys to `.prism/<area>/**`. Wrote one-shot `scripts/ai-skills/migrate-paths.ts` (since deleted) and swept ~607 path references across `.prism/`, `.ai-skills/skills/`, top-level docs (README, AGENTS.md, CLAUDE.md, docs/parameterization.md), and `templates/install/` (after rename). Renamed `templates/claude/` → `templates/install/` and reorganized into bifurcated sub-layout (`templates/install/.claude/CLAUDE.md.tmpl`, `templates/install/.prism/<area>/`, `templates/install/.codex/.gitkeep`, `templates/install/.cursor/.gitkeep`, `AGENTS.md.tmpl` at root). Anchored `.gitignore` patterns (`.codex/`, `.cursor/`, `.agents/`, `.generated/`) to repo root so templates anchors stay tracked. Extended `paths.json` with `canonical.contentRoot` and `generated.platformContentCopies`; updated `PathDefinitions` interface in `utils.ts`. Extended `scripts/ai-skills/build.ts` with `copyContentToPlatformDir` and `removeDeletedManagedContent` — copies rules/architect/spec/templates/references/SPEC.md from `.prism/` into each platform dir, with managed markers and drift detection (skips agent-written plans/lessons). Authored `scripts/ai-skills/path-guard.ts` as standalone module — fails the build when canonical content cites `.claude/<area>/`, `.codex/<area>/`, or `.cursor/<area>/` paths in copied areas; skips fenced code blocks; allowlists ADR-0031 and `architect/install-layout.md`. Wrote `scripts/ai-skills/path-guard.test.ts` with 7 regression tests (positive flag, all three platform prefixes, fenced-block exclusion, non-copied-area exclusion, allowlist, loose SPEC.md, missing contentRoot). Authored ADR-0031 (bifurcated install layout) on both dogfood and templates surfaces — byte-identical except for plan-file reference dropped from templates per ADR-0029/0030 convention. Authored `.prism/architect/install-layout.md` agent-loaded doc on both surfaces. Updated manifest.json on both surfaces to route `.prism/**`, `scripts/ai-skills/build.ts`, `scripts/ai-skills/path-guard.ts`, and `.ai-skills/definitions/paths.json` to `install-layout.md`. `pnpm prism:build`, `prism:check`, `prism:check-types`, `prism:test` all pass; 14 total tests; path-guard injection sanity check confirmed (inject `.claude/rules/...` ref → check fails; revert → passes). Deleted the one-shot migrate-paths.ts after the sweep landed.
- 2026-05-03 [prism-install-layout]: Eli executed Eli tasks 15-17 in-PR (override of "after PR #2 merges" framing — Hunter pulled the docs into PR #2 directly). Authored `docs/content/dev/architecture/install-layout.md` (new file, follows architecture-doc-shape four-beat arc: anchor → need → technical flows → natural fit → platform limits + custom layer; covers cross-reference convention, layout map, edit loop, trade-offs). Rewrote `docs/distribution.md` for the bifurcated layout — split the source-to-destination map into canonical content / build copies / platform-specific outputs / top-level anchors, updated state-file example to reference `.prism/<area>/` paths, updated team-control section for `.prism/plans/` and `.prism/lessons.md`, added frontmatter (was missing), confirmed Phase 1.5 sequencing in branching section. Rewrote README "Repo shape" to show the bifurcated layout (`.prism/` canonical with annotated subdirs, platform dirs as build copies, `templates/install/` as renamed distribution surface). Updated README Status banner to reflect Phase 1 shipped + Phase 1.5 in progress. `pnpm prism:check` still passes.
- 2026-05-03 [prism-install-layout]: Clove fixed Briar's three open review issues. Major (allowlist count divergence) — updated install-layout.md § Build-time path guard on both dogfood and templates surfaces to read "two entries today" with both paths named, including the rationale for the second entry. Minor #1 (stale parenthetical) — dropped "(paired dev doc, lands after PR #2 merges)" qualifier on both surfaces; now reads simply "the longer human-readable companion." Minor #2 (missing test) — added `respects the file allowlist (architect/install-layout.md)` test in `path-guard.test.ts` covering all three platform-dir path patterns. `pnpm prism:build` regenerated platform copies; `pnpm prism:check` passes; 15 tests pass (was 14).
- 2026-05-03 [prism-install-layout]: Clove fixed Eric's six open review issues. Two Majors (stale `templates/claude/` paths) — `docs/parameterization.md:9` updated to `templates/install/AGENTS.md.tmpl`; ADR-0030 line 10 quote re-anchored and line 12 rewritten on both dogfood and templates surfaces; `.claude/` build copy refreshed via `pnpm prism:build`. Minor #1 (path-guard scope undercount) — install-layout.md sentence on both surfaces now names the loose `SPEC.md` alongside copied-area `.md` files. Minor #2 (gitignored Codex/Cursor copies) — added bullet to dev doc § Trade-offs explaining that in the dogfood only `.claude/` is committed and `pnpm prism:build` is required on fresh clone for non-Claude platforms; consumers choose per-platform. Minor #3 (utf8 read) — extracted `copyFileIfChanged` using `fs.copyFile` for byte-faithful copy. Minor #4 (missing tests) — refactored `copyContentToPlatformDir` and `removeDeletedManagedContent` to accept `checkMode`/`changedPaths` as parameters and exported them; gated `main()` on direct-invocation check; added `scripts/ai-skills/content-copy.test.ts` (5 tests covering happy path, idempotence, check mode, orphan cleanup, marker protection). 20 total tests pass (was 15); types clean; `prism:check` passes.
- 2026-05-03 [prism-install-layout]: Clove fixed Eric's three additional Minors. Stale SPEC.md title — `.prism/SPEC.md` and templates mirror updated to "# PRISM Spec" / "the PRISM ecosystem"; `pnpm prism:build` propagated to all three platform copies. Distribution category mismatch — `git mv docs/distribution.md docs/content/dev/operations/distribution.md` to match the `category: operations` frontmatter; updated README repo-shape diagram, the dev-doc cross-reference, and the doc's own internal link. Loose-file test gap — added `copyContentToPlatformDir copies the loose SPEC.md file` test exercising the previously-uncovered `COPIED_LOOSE_FILES` path. 21 total tests pass (was 20); `prism:check` passes; types clean.
- 2026-05-03 [prism-install-layout]: Eric's fourth-pass review on PR #2. All three open threads from rounds 1–3 confirmed fixed in current state and resolved on GitHub (ADR-0030 stale `templates/claude/` paths, install-layout.md path-guard scan undercount, path-guard.ts module praise). One new Minor logged: `pnpm prism:check` reports false drift on a fresh clone for gitignored `.codex/`, `.cursor/`, `.agents/`, `.generated/` platform dirs — the check iterates every `platformContentCopies` entry regardless of whether the target dir exists, and CI (when wired up) will need either a `prism:build` step ahead of `prism:check` or a "skip-when-platform-absent" branch in the check loop. Three suggested fix directions in the GitHub summary. PR labeled `effort:deep` + `review:has-minors`.
- 2026-05-03 [prism-install-layout]: Clove fixed Eric's fresh-clone false-drift Minor. Took option (a) — opt-out signal based on the area-level `.ai-skill-generated` marker. Extracted `syncPlatformContentCopy` helper at the call site in `main()` so the skip is testable; in check mode, a platform without any marker (i.e. `prism:build` has never run for it) is treated as opt-out, not drift. Same root cause was hitting the skill-output writes too (`.agents/skills/`, `.codex/agents/`, `.generated/cursor-skills/`, `.generated/codex-config.toml`), so applied the same opt-in shape there: `optedIn` map computed once at `main()` start, gates per-platform skill writes, codex agent TOML writes, and codex-config.toml writes; `ensureDirectory` for output roots now skipped in check mode (it's a write op). New helpers: `platformHasManagedContent`, `skillsRootHasManagedContent`, `codexAgentsRootHasManagedContent`. Added 4 new content-copy tests (skips when no managed content; skips when only unrelated dir exists; creates absent platform dir in build mode; drift-checks existing platform dir in check mode). Updated architect doc on both surfaces and dev doc Trade-offs bullet to describe the marker-based opt-out signal. 25 tests pass (was 21); types clean. Verified end-to-end: `rm -rf .codex .cursor .agents .generated && pnpm prism:check` now passes (was failing).
- 2026-05-04 [prism-install-layout]: Eric's fifth-pass review on PR #2. Round-4 false-drift fix verified — marker-based opt-in is consistently applied across content-copy, skill writes, codex agent TOMLs, and codex config (each adapted to its underlying shape). Doc-class triage on `.prism/architect/install-layout.md` and ADR-0031: every claim verified against source. One new Minor logged: path guard scans `.prism/` only, leaving the templates-surface mirror at `templates/install/.prism/` unchecked. Three suggested fix directions in the GitHub summary. Side-note: `optedIn` gating in `main()` lacks unit coverage (skill/codex-agent/codex-config branches) — flagged as fold-in-next-time, not load-bearing. PR labeled `effort:deep` + `review:has-minors`.
- 2026-05-04 [prism-install-layout]: Clove fixed Eric's templates-surface path-guard Minor. Took option (a)-shape with paths.json declaration: added `canonical.templatesContentRoot` and refactored `build.ts main()` to iterate both content roots through `runPathGuard` in a single pass; violations carry a relative-content-root label so the failure message tells reviewers which surface tripped. Existing allowlist keys (relative to contentRoot) work for both surfaces unchanged. Added `scans the templates-surface content root using the same allowlist` test. Architect docs on both surfaces updated. 26 tests pass (was 25); types clean; `prism:check` passes. End-to-end injection verified: stale `.claude/rules/...` reference in templates surface now fails the build with the expected `path-guard: templates/install/.prism/...` message. Caught and reverted a prettier-driven tab-to-space sweep across the touched scripts before commit — kept the diff to logical changes only (~77 lines, 8 files).
- 2026-05-04 [prism-install-layout]: Eric's sixth-pass review on PR #2. Templates-surface path-guard fix verified — data-driven dual-surface invocation is the right shape (paths.json carries the config, `runPathGuard` API stays focused). Doc-class triage on architect/install-layout.md confirms the new wording matches source. Surface-prefixed violation messages are an ergonomic win. No new issues; no open issues. PR labeled `effort:deep` + `confidence:high` — ready for human review and merge.

---

## Decisions

- **Bifurcated install layout — `.prism/` canonical + platform-dir build copies.** Read-only canonical content (rules, ADRs, architect, templates, references) lives at `.prism/<area>/`. Platform dirs get build-time copies of read-only content (preserves Claude Code auto-load and equivalent on Codex/Cursor). Agent-written content (plans, lessons.md) lives only at `.prism/` — single source. ADR-0031 documents this. Full reasoning in `epic-phase-1-foundation.md` § Decisions.
  - **Zoe verdict (2026-06-05):** `archive-candidate` — Phase 1.5a shipped via PR #2 (2026-05-03); promoted to ADR-0031 + `.prism/architect/install-layout.md`; plan never closed.

- **Cross-reference convention: cite `.prism/<area>/<file>` paths in canonical sources.** Platform copies under `.prism/rules/` etc. are reflections — agents read whichever copy their platform's auto-load surfaced, but they edit the canonical at `.prism/`. Build-time guard fails if a canonical source contains `.claude/<area>/` or `.codex/<area>/` etc. paths outside skill files (where platform-specific paths are correct).
  - **Zoe verdict (2026-06-05):** `archive-candidate` — Phase 1.5a shipped via PR #2 (2026-05-03); promoted to ADR-0031 + `.prism/architect/install-layout.md`; plan never closed.

- **Distribution surface rename: `templates/claude/` → `templates/install/`.** The current name implies Claude-only distribution; the new layout is multi-platform. Renaming clarifies intent and updates `paths.json` accordingly.
  - **Zoe verdict (2026-06-05):** `archive-candidate` — Phase 1.5a shipped via PR #2 (2026-05-03); promoted to ADR-0031 + `.prism/architect/install-layout.md`; plan never closed.

- **Manifest moves with architect docs.** `.prism/architect/manifest.json` → `.prism/architect/manifest.json`. Routing patterns: file patterns like `.claude/skills/**` stay (skills stay platform-local), but architect doc references resolve relative to `.prism/architect/`.
  - **Zoe verdict (2026-06-05):** `archive-candidate` — Phase 1.5a shipped via PR #2 (2026-05-03); promoted to ADR-0031 + `.prism/architect/install-layout.md`; plan never closed.

- **Order vs PR #3 (tokenization): layout reorg ships first.** Tokenization sweeps at the final canonical paths instead of v1 `.claude/`-only paths. Saves a second sweep pass.
  - **Zoe verdict (2026-06-05):** `archive-candidate` — Phase 1.5a shipped via PR #2 (2026-05-03); promoted to ADR-0031 + `.prism/architect/install-layout.md`; plan never closed.

---

## Implementation Tasks

### Clove

The 14 sequenced tasks below bifurcate the install layout end-to-end. Tasks 1–4 do the file-system move and reference rewrites; tasks 5–6 rename the templates surface and sweep its internals; tasks 7–9 wire the build script to the new shape; tasks 10–12 author the durable record (ADR + architect doc + manifest route); tasks 13–14 verify and ship.

**Discovery already done before pickup.** Three Explore-agent inventories Winston ran during plan refinement landed concrete intel. Use these as the to-do lists for the sweep and rewrite tasks below — they're the difference between "no guesswork" and ad-hoc grepping.

- **Path-reference inventory:** every `.claude/<area>/` reference in canonical content classified `swap` (zero `keep`, zero `unsure`). Total ~687 occurrences across canonical skill bodies, the moving `.claude/` content's internal cross-references, the shipping `templates/claude/` tree, and the top-level docs.
- **Skill startup-sequence audit:** explicit Reads at named line numbers in 6+ skill bodies (manifest, plan-lookup, architect-context, documentation, standup-summary template), plus mid-skill in-body citations and layout assumptions.
- **Templates surface classification:** every file in `templates/claude/` mapped to a post-bifurcation destination — `AGENTS.md.tmpl` to root, `CLAUDE.md.tmpl` to `templates/install/.claude/`, everything else under `templates/install/.prism/<area>/`.

1. **Create `.prism/` directory tree and move content.**
   - Pre-flight: `mkdir -p .prism/rules .prism/spec/adrs .prism/architect .prism/templates .prism/references .prism/plans` — `git mv` requires destinations to exist.
   - Pre-flight: confirm `.gitignore` doesn't exclude `.prism/`. Current gitignore excludes `.claude/worktrees/`, `.claude/settings.local.json`, `.agents/`, `.codex/`, `.generated/` — none affect `.prism/`. New files under `.prism/` will be tracked.
   - Move directories with glob expansion (Git Bash on Windows handles this fine):
     - `git mv .prism/rules/* .prism/rules/`
     - `git mv .prism/architect/* .prism/architect/`
     - `git mv .prism/spec/* .prism/spec/`
     - `git mv .prism/templates/* .prism/templates/`
     - `git mv .prism/references/* .prism/references/`
     - `git mv .prism/plans/* .prism/plans/`
   - Move loose files: `git mv .prism/SPEC.md .prism/SPEC.md`, `git mv .prism/lessons.md .prism/lessons.md`.
   - Verify with `git status` — all moves should appear as `renamed:`. If anything appears as `deleted` + `new file`, the rename detection broke; investigate before continuing.
   - Do NOT move: `.claude/skills/**` (platform-specific build outputs — stay where Claude Code auto-loads them), `.claude/worktrees/`, `.claude/settings.local.json`.

2. **Update `.prism/architect/manifest.json` keys.** The manifest moved with the architect dir. Its keys are file-pattern matchers; values resolve relative to the manifest's location and stay correct since matched files moved alongside. Update every key from `.claude/<area>/` to `.prism/<area>/`:
   - `.prism/SPEC.md` → `.prism/SPEC.md`
   - `.prism/templates/**` → `.prism/templates/**`
   - `.prism/rules/**` → `.prism/rules/**`
   - `.prism/spec/adrs/**` → `.prism/spec/adrs/**`
   - `.prism/architect/**` → `.prism/architect/**`
   - `.prism/references/**` → `.prism/references/**`
   - `.prism/plans/**` → `.prism/plans/**`
   - Keys that STAY: `.claude/skills/prism-qa-test-plan/`, `.claude/skills/**`, `.ai-skills/skills/**`, `scripts/ai-skills/**`, `docs/`, `docs/content/dev/architecture/`, `**`. Skills are platform-specific; the routing for them stays at `.claude/skills/`.
   - Sanity-check: `cat .prism/architect/manifest.json | jq .` confirms valid JSON.

3. **Sweep canonical cross-references** — apply the path swap across the ~687 occurrences identified in the inventory.
   - Approach: write a one-shot Node script at `scripts/ai-skills/migrate-paths.ts` (delete after this PR) that walks the listed paths, applies the regex `\.claude/(rules|architect|spec|templates|references|plans)/` → `.prism/$1/`, plus the loose-file substitutions `.prism/SPEC.md` → `.prism/SPEC.md` and `.prism/lessons.md` → `.prism/lessons.md`. Add a `--dry-run` flag that reports per-file diff summaries and a total hit count.
   - Scope: `.prism/**/*.md`, `.ai-skills/skills/**/*.md`. Exclude `.claude/skills/**` (build outputs — `pnpm prism:build` regenerates these from canonical), `.codex/**`, `.cursor/**`, `.generated/**`, `node_modules/**`, `.git/**`.
   - Run dry first. The hit count should be in the same neighborhood as the inventory's counts — if it's wildly off, investigate before writing.
   - **Skill startup-time Reads** the audit flagged for verification (every one of these should read `.prism/...` after the sweep):
     - `prism-architect/shared.md:88-90` (plan-lookup, architect-context, manifest)
     - `prism-code-dev/shared.md:264, 269` (plan-lookup, manifest)
     - `prism-code-review-pr/shared.md:175, 181, 219` (plan-lookup, manifest, architect-context)
     - `prism-code-review-self/shared.md:146, 147` (plan-lookup, manifest)
     - `prism-debugger/shared.md:168, 194` (plan-lookup, architect-context)
     - `prism-documentation/shared.md:119, 165` (documentation.md, plan-lookup)
     - `prism-standup-summary/shared.md:130` (`.prism/templates/standup-summary.md` → `.prism/templates/standup-summary.md`)
   - **Out-of-scope for this PR — agent-output paths.** Sage's `.claude/changelogs/`, Pixel's `.claude/design/mocks/`, Reese's `.claude/docs/qa/` are NOT under the moving `<area>/` set, so the regex above won't touch them. They're agent-written output locations, conceptually similar to plans/lessons. Whether they should follow the bifurcation principle (move to `.prism/changelogs/`, etc.) is a separate decision belonging to Phase 2 (Atlas configures output paths per team during onboarding). Leave them as `.claude/<output>/` for now and flag in Phase 2 plan.
   - After sweep: run `pnpm prism:build` to regenerate `.claude/skills/<id>/SKILL.md` outputs with the new path references inside them.

4. **Mechanical path swap in top-level docs.** Same regex as task 3, applied to: `README.md`, `AGENTS.md`, `CLAUDE.md`, `docs/parameterization.md`. Per the inventory: README has 2 refs, AGENTS.md has 16, parameterization.md has 1, CLAUDE.md handful. Path-swap only — the conceptual rewrites of README "Repo shape" and `docs/distribution.md` are Eli's job (tasks 16 and 15 below). `docs/distribution.md` is excluded from this mechanical pass since Eli rewrites the whole thing.

5. **Rename `templates/claude/` → `templates/install/` and reorganize the sub-layout.** Per the templates classification audit:
   - `git mv templates/claude templates/install`
   - Inside the renamed directory, build the new sub-layout:
     - Create `templates/install/.claude/`. Move `CLAUDE.md.tmpl` here (Claude-specific behavioral guidance).
     - Create `templates/install/.prism/` and the area subdirs (`architect/`, `rules/`, `spec/adrs/`, `templates/`, `references/`). Move every other directory's contents under their matching `.prism/<area>/` path. Move `SPEC.md.tmpl` to `templates/install/.prism/SPEC.md.tmpl` (matches the dogfood placement of `.prism/SPEC.md`).
     - `templates/install/AGENTS.md.tmpl` STAYS at root — cross-platform constitution, applies to Claude/Codex/Cursor uniformly.
     - Create empty `templates/install/.codex/` and `templates/install/.cursor/` directories with `.gitkeep` files. Codex/Cursor anchor files (if/when they exist) land here. Documenting the convention in advance keeps the layout symmetrical.

6. **Sweep references inside `templates/install/**`** with the same regex as task 3. The inventory counted ~198 references in the templates surface — these become consumer install content, so every `.claude/<area>/` mention here would otherwise ship as a stale layout reference to consumer teams. Run the migrate-paths.ts script with the templates tree as scope.

7. **Update `.ai-skills/definitions/paths.json`** with the new keys. Preserve the existing structure; the changes are additive plus one small rename:
   ```json
   {
     "canonical": {
       "skillsRoot": ".ai-skills/skills",
       "contentRoot": ".prism"
     },
     "generated": {
       "claudeSkillsRoot": ".claude/skills",
       "codexSkillsRoot": ".agents/skills",
       "codexAgentsRoot": ".codex/agents",
       "codexConfigFile": ".generated/codex-config.toml",
       "cursorSkillsRoot": ".generated/cursor-skills",
       "platformContentCopies": {
         "claude": ".claude",
         "codex": ".codex",
         "cursor": ".cursor"
       }
     }
   }
   ```
   Update the `PathDefinitions` interface in `scripts/ai-skills/utils.ts:22-33` to match — add `canonical.contentRoot: string` and `generated.platformContentCopies: { claude: string; codex: string; cursor: string }`.

8. **Extend `scripts/ai-skills/build.ts` with content-copy logic** for the bifurcation.
   - Add a function `copyContentToPlatformDirs(repoRoot, contentRoot, platformCopies, checkMode, changedPaths)` that, for each platform target, copies these areas from `<contentRoot>/<area>/` to `<platformDir>/<area>/`:
     - `rules/` (whole tree)
     - `architect/` (whole tree, including `manifest.json`)
     - `spec/` (whole tree, including `adrs/`)
     - `templates/` (whole tree)
     - `references/` (whole tree)
     - Loose file: `SPEC.md`
   - Skip copying: `plans/`, `lessons.md`. These are agent-written content; they live only at canonical (`.prism/plans/`, `.prism/lessons.md`) and must not be mirrored — mirroring would create write conflicts when an agent edits the plan and the build later overwrites the platform copy.
   - Reuse `MANAGED_MARKER` from `utils.ts` (value: `.ai-skill-generated`) for drift detection. Write the marker file at the root of each copied area inside each platform dir — e.g. `.prism/rules/.ai-skill-generated`, `.prism/architect/.ai-skill-generated`. Content matches the existing pattern: `Managed by scripts/ai-skills/build.ts\n`.
   - Reuse `writeFileIfChanged(targetPath, content, checkMode, changedPaths)` from `utils.ts` for the per-file copy — handles the drift-detection bookkeeping.
   - Add a parallel cleanup function `removeDeletedManagedContent(platformDir, area, canonicalArea, checkMode, changedPaths)` (modeled on `removeDeletedManagedSkills`). For each file under `<platformDir>/<area>/`, compute the corresponding canonical path under `<contentRoot>/<area>/`. If canonical doesn't exist AND the directory contains the marker, remove the file. Handles renames (canonical file renamed → old build-copy gets cleaned up, new one written).
   - Wire into `main()` after the existing skill-build loop and before the final `removeDeletedManagedSkills` calls. Make sure `--check` mode (`pnpm prism:check`) flags any out-of-band edit to a build-copy file.

9. **Add build-time path guard.** New step in `build.ts` (called from `main()`, runs in both build mode and check mode) that fails if any markdown file under `.prism/**` references `.claude/<area>/`, `.codex/<area>/`, or `.cursor/<area>/` paths where `<area>` is one of `rules|architect|spec|templates|references|plans`.
   - Implementation: regex `(\.claude|\.codex|\.cursor)/(rules|architect|spec|templates|references|plans)/`, scan every `.md` file under `.prism/`. Print file:line for each match.
   - Skip matches inside fenced code blocks (` ```...``` `) — code blocks may legitimately discuss the OLD layout for historical reasons (e.g. ADR-0031's Context section).
   - Allowlist by filename: `.prism/spec/adrs/0031-bifurcated-install-layout.md` (this PR's ADR explicitly discusses the v1 layout in its Context). Any other allowlist entries get added with a comment explaining why.
   - On match: print a summary like `path-guard: 3 violation(s) found in .prism/...` and exit non-zero. Build/check fail.

10. **Author ADR-0031 — Bifurcated install layout.**
    - Write to both `.prism/spec/adrs/0031-bifurcated-install-layout.md` and `templates/install/.prism/spec/adrs/0031-bifurcated-install-layout.md`. Byte-identical mirror per the ADR-0029/0030 convention.
    - Use `.prism/spec/adrs/TEMPLATE.md` as the structural template. Sections: Status (Accepted), Date (2026-05-03), Context, Decision, Consequences, References.
    - Pull Context / Decision / Consequences from `## Decisions` in this plan and the parent decision in `epic-phase-1-foundation.md`. Reference all five rejected alternatives explicitly: (a) `.prism/`-only with no platform copies, (b) symlinks, (c) `.claude/` as canonical, (d) top-level `rules/`/`spec/` (no leading dot), (e) status quo.
    - References section: link to the new architect doc `.prism/architect/install-layout.md`, ADR-0029 (rules self-declare — sibling principle), and ADR-0030 (token substitution — parallel build-time mechanism).
    - **Templates-vs-dogfood split for plan-file references:** the dogfood ADR may cite `.prism/plans/epic-prism-install-layout.md` in References; the templates-surface ADR must NOT — consumer teams won't have the plan file. Same dogfood-vs-templates split PR #1 task 17 established for ADR-0029 and ADR-0030.

11. **Author the new architect doc — `install-layout.md`.**
    - Write to both `.prism/architect/install-layout.md` and `templates/install/.prism/architect/install-layout.md`. Byte-identical mirror.
    - Sections: brief summary; the bifurcation (canonical vs build-copy distinction with one concrete example); the cross-reference convention (cite `.prism/<area>/` paths in canonical content; platform copies are auto-load-only); the build-time copy mechanism (what `prism:build` copies, what areas get copied, what stays canonical-only); drift detection (`MANAGED_MARKER`, `prism:check` behavior); the path guard (regex, exclusions).
    - Keep it tight — architect docs are agent-loaded; aim for ~80–100 lines.
    - Cross-link to the longer human-readable companion at `docs/content/dev/architecture/install-layout.md` (Eli's task 17 below). Forward-reference is fine — the dev doc lands after PR #2 merges.

12. **Update `.prism/architect/manifest.json` to route layout-related files to the new architect doc.** Add three entries:
    - `.prism/**` → `install-layout.md` (any edit to canonical content surfaces the layout context)
    - `scripts/ai-skills/build.ts` → `install-layout.md`
    - `.ai-skills/definitions/paths.json` → `install-layout.md`
    - Mirror to `templates/install/.prism/architect/manifest.stub.json` (the consumer stub) so consumer teams pick up the same routing once they install.

13. **Run verification** — full pass before opening the PR.
    - `pnpm prism:build` — regenerates everything. Should report changes in skill outputs (path swaps inside generated SKILL.md) plus new content-copy outputs under `.claude/<area>/`, etc.
    - `pnpm prism:check` — drift check should pass after the build. Sanity-check the guard: temporarily edit one byte of a `.prism/rules/<rule>.md` build-copy file, run `prism:check`, confirm it reports drift, revert.
    - `pnpm prism:check-types` — TypeScript check on the generator. Confirms the new `paths.json` shape and `utils.ts` types compile.
    - `pnpm prism:test` — regression suite passes. Add a new test for the path-guard if not already covered (e.g. `scripts/ai-skills/path-guard.test.ts` — feed a fixture markdown with a `.prism/rules/` reference, expect the guard to flag it).
    - **Manual smoke test:** in chat, invoke Briar (or any persona) on this branch and confirm the persona's startup auto-loads rules and architect docs from the new `.claude/<area>/` build-copy locations without errors. Also confirm a Read on a canonical `.prism/rules/<rule>.md` path resolves.
    - **Path-guard sanity:** temporarily inject a `.prism/rules/code-comments.md` reference into one canonical file under `.prism/`, run `pnpm prism:check`, confirm it fails with a path-guard error and prints the offending file:line. Revert.

14. **Ship per shipping-flow.** Single PR titled `chore: Bifurcate install layout — .prism/ canonical with platform copies`. Body follows the template in `.prism/rules/pr-description.md`; reference ADR-0031 in the "Why did you do it?" section.

### Eli (after PR #2 merges)

15. **Rewrite `docs/distribution.md` source-to-destination map.** The current map (13 rows per the audit) describes the v1 layout where everything copies into `.claude/`. Rewrite for the bifurcation:
    - Sources from `templates/install/.prism/<area>/` and `.ai-skills/skills/<id>/`.
    - Consumer-side destinations split: `.prism/<area>/` (canonical), `.claude/<area>/` / `.codex/<area>/` / `.cursor/<area>/` (build copies regenerated by `prism:build` on the consumer's side), and root-level (AGENTS.md, CLAUDE.md).
    - Preserve sections on state management (`.ai-skills/.prism-state.json`), three-way merge behavior, files-not-copied, and team-control boundaries — these don't change with the bifurcation.
    - Update branching strategy mention to confirm Phase 1.5 → Phase 2 → Phase 3 sequencing.

16. **Update `README.md` "Repo shape" section** (current README lines 38-72). Rewrite to show the bifurcated layout:
    - `.prism/` canonical at root with `architect/`, `rules/`, `spec/adrs/`, `templates/`, `references/`, `plans/`, `lessons.md`, `SPEC.md`.
    - `.claude/`/`.codex/`/`.cursor/` as build copies of the canonical content, plus their platform-specific bits (skills under `.claude/skills/`, agents under `.codex/agents/`, etc.).
    - `templates/install/` as the consumer distribution surface (renamed from `templates/claude/`).
    - Update the "Phased roadmap" prose (current README lines 110-113) to confirm Phase 1.5 (this work) shipped before Atlas. The mechanical path-swaps in the rest of the README were already done by Clove in task 4 — task 16 is the structural rewrite of the layout diagram only.

17. **Author paired dev doc — `docs/content/dev/architecture/install-layout.md`.** Per the documentation pairing convention: same topic as `.prism/architect/install-layout.md` but human-readable narrative for teammates. Walk through the bifurcation, why the v1 asymmetry was a problem (Codex/Cursor consumers were second-class), the build-time copy mechanism, the cross-reference convention, the path guard, and the trade-offs (vs `.prism/`-only, vs symlinks, vs status quo). Cross-link both ways. Length: ~150–200 lines is appropriate for a dev-architecture doc.

---

## Acceptance Criteria

### Behavioral

- [ ] Given a consumer running Claude Code with the bifurcated layout installed, When the agent invokes any skill, Then the rules under `.prism/rules/` (build-time copy) are auto-loaded into context exactly as they are today
- [ ] Given a consumer running Codex with the bifurcated layout installed, When the agent invokes any skill, Then the rules under `.codex/rules/` (build-time copy) are reachable by the agent on the platform
- [ ] Given an edit to `.prism/rules/<rule>.md`, When `pnpm prism:build` runs, Then `.prism/rules/<rule>.md`, `.codex/rules/<rule>.md`, and `.cursor/rules/<rule>.md` reflect the change
- [ ] Given `pnpm prism:check` runs after a manual edit to `.prism/rules/<rule>.md` (out-of-band edit), Then the drift check fails and reports the file
- [ ] Given the dogfood install in this repo, When any persona session starts, Then plans are read from and written to `.prism/plans/` (not `.claude/plans/`)
- [ ] Given any canonical source under `.prism/` containing a `.prism/rules/` or `.prism/architect/` path reference (other than skill files documenting platform-specific behavior), When `pnpm prism:check` runs, Then the build fails with a path-guard error

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

## Review Issues

### Diverged claim: install-layout.md says allowlist has one entry but source has two

- **Severity:** `major`
- **Status:** `fixed`
- **Fixed in:** `.prism/architect/install-layout.md` (and templates mirror at `templates/install/.prism/architect/install-layout.md`); platform copies regenerated via `pnpm prism:build`. Doc now reads "two entries today: `spec/adrs/0031-bifurcated-install-layout.md` and `architect/install-layout.md` — the latter so this doc's own example block can name `.claude/rules/<file>.md` etc. without the guard tripping."
- **File:** `.prism/architect/install-layout.md` (§ Build-time path guard) + `.claude/architect/install-layout.md` (build copy — will be fixed by rebuild once canonical is fixed)
- **Problem:** Doc says "Filename allowlist (one entry today: `.prism/spec/adrs/0031-bifurcated-install-layout.md`)" but `scripts/ai-skills/path-guard.ts` `PATH_GUARD_FILE_ALLOWLIST` has two entries: `spec/adrs/0031-bifurcated-install-layout.md` AND `architect/install-layout.md`. The second entry exists because `install-layout.md` itself references platform-dir paths in its concrete example block.
- **Suggested fix:** Update the doc to: "Filename allowlist (two entries today: `spec/adrs/0031-bifurcated-install-layout.md` and `architect/install-layout.md`). New allowlist entries need a comment explaining why." Run `pnpm prism:build` to propagate the canonical fix to the `.claude/` build copy.

### Stale parenthetical in install-layout.md forward-reference

- **Severity:** `minor`
- **Status:** `fixed`
- **Fixed in:** `.prism/architect/install-layout.md` (and templates mirror); parenthetical removed on both surfaces. Now reads simply "the longer human-readable companion."
- **File:** `.prism/architect/install-layout.md` (§ Where to look)
- **Problem:** "docs/content/dev/architecture/install-layout.md (paired dev doc, lands after PR #2 merges)" — the dev doc was pulled into PR #2 directly (per plan history 2026-05-03 Eli entry). The "(lands after PR #2 merges)" qualifier is stale.
- **Suggested fix:** Remove the parenthetical or update it to "(paired dev doc, in this PR)".

### Missing regression test for second allowlist entry

- **Severity:** `minor`
- **Status:** `fixed`
- **Fixed in:** `scripts/ai-skills/path-guard.test.ts` — added `respects the file allowlist (architect/install-layout.md)` test. Writes a fixture `architect/install-layout.md` with all three platform-dir path patterns and asserts zero violations. 15 tests pass (was 14).
- **File:** `scripts/ai-skills/path-guard.test.ts`
- **Problem:** `path-guard.test.ts` tests the ADR-0031 allowlist entry but not the `architect/install-layout.md` entry. If someone removed the second entry from `PATH_GUARD_FILE_ALLOWLIST`, the build would fail silently in CI because `install-layout.md` references platform-dir paths in its example block.
- **Suggested fix:** Add a test: write a fixture `architect/install-layout.md` with platform-dir path references, assert `runPathGuard` returns zero violations.

### Stale `templates/claude/` paths in docs/parameterization.md

- **Severity:** `major`
- **Status:** `fixed`
- **Fixed in:** `docs/parameterization.md:9` — `templates/claude/AGENTS.md.tmpl` → `templates/install/AGENTS.md.tmpl`.
- **File:** `docs/parameterization.md:9`
- **Problem:** Line 9 still reads `appear in canonical sources (..., templates/claude/AGENTS.md.tmpl, etc.)` after the rename to `templates/install/`. Path no longer exists; reader can't follow it. The plan's task 4 sweep regex `\.claude/(area)/` didn't match `templates/claude/` because of the missing leading dot.
- **Suggested fix:** Replace `templates/claude/AGENTS.md.tmpl` with `templates/install/AGENTS.md.tmpl`. This is the source of the stale quotes in ADR-0030 — fix here first.

### Stale `templates/claude/` paths in ADR-0030 (3 surfaces)

- **Severity:** `major`
- **Status:** `fixed`
- **Fixed in:** `.prism/spec/adrs/0030-token-substitution-at-build-time.md` lines 10 + 12 + templates mirror; line 10 quote re-anchored to `templates/install/AGENTS.md.tmpl`; line 12 rewritten to name `templates/install/AGENTS.md.tmpl` and `templates/install/.prism/SPEC.md.tmpl`. `pnpm prism:build` refreshed the `.claude/` build copy from canonical.
- **File:** `.prism/spec/adrs/0030-token-substitution-at-build-time.md:10,12` plus mirrors at `templates/install/.prism/spec/adrs/0030-token-substitution-at-build-time.md:10,12` and `.claude/spec/adrs/0030-token-substitution-at-build-time.md:10,12` (build copy)
- **Problem:** Line 10 quotes `docs/parameterization.md`'s stale `templates/claude/AGENTS.md.tmpl` reference; line 12 references `templates/claude/AGENTS.md.tmpl` and `templates/claude/SPEC.md.tmpl`. After the rename, paths are `templates/install/AGENTS.md.tmpl` and `templates/install/.prism/SPEC.md.tmpl`.
- **Suggested fix:** Update parameterization.md first, then re-anchor the line 10 quote and rewrite line 12 to match the new paths. Update the canonical `.prism/` copy and the templates mirror; `pnpm prism:build` will refresh the `.claude/` build copy from canonical.

### install-layout.md undercounts what the path guard scans

- **Severity:** `minor`
- **Status:** `fixed`
- **Fixed in:** `.prism/architect/install-layout.md` § Build-time path guard + templates mirror — sentence now reads "every `.md` file under the copied areas of `.prism/`, plus the loose `SPEC.md`".
- **File:** `.prism/architect/install-layout.md:47` plus templates mirror at `templates/install/.prism/architect/install-layout.md:47`
- **Problem:** Says "It scans every `.md` file under the copied areas of `.prism/`" but the implementation also scans the loose `SPEC.md` (`PATH_GUARD_LOOSE_FILES` in `scripts/ai-skills/path-guard.ts:27`).
- **Suggested fix:** Add ", plus the loose `SPEC.md`" to the sentence on both surfaces. Rebuild to refresh the `.claude/` copy.

### Codex/Cursor build copies gitignored — bifurcation contingent on local build

- **Severity:** `minor`
- **Status:** `fixed`
- **Fixed in:** `docs/content/dev/architecture/install-layout.md` § Trade-offs — added bullet calling out that in the dogfood install only `.claude/` is committed; `.codex/`/`.cursor/`/`.agents/`/`.generated/` are gitignored as build outputs and require `pnpm prism:build` on a fresh clone before opening those platforms. Consumer teams choose per-platform whether to commit. Architect doc kept terse; the trade-off lives in the dev-doc companion where it belongs.
- **File:** `.gitignore` + `.prism/architect/install-layout.md` (or `docs/distribution.md`)
- **Problem:** `/.codex/` and `/.cursor/` in `.gitignore` mean the dogfood content copies for those platforms are never committed. The architect doc claims "every platform sees the same rules and architect docs through its own auto-load mechanism" — practically true, but contingent on each developer running `pnpm prism:build` locally before opening Codex/Cursor on a fresh clone. `.claude/` build copies *are* committed, so the bifurcation is fully exercised only for Claude in this repo.
- **Suggested fix:** Either add a sentence in `install-layout.md` or `docs/distribution.md` calling out the build-required step for non-Claude platforms, or relax the gitignore for content copies (only ignore the build outputs that aren't content copies).

### copyContentToPlatformDir reads files as utf8

- **Severity:** `minor`
- **Status:** `fixed`
- **Fixed in:** `scripts/ai-skills/build.ts` — extracted `copyFileIfChanged` helper that uses `fs.copyFile` for byte-faithful copy plus the existing `filesAreEqual` (Buffer-based) for the change-detection compare. No utf8 round-trip on the copy path.
- **File:** `scripts/ai-skills/build.ts:386,409`
- **Problem:** `fs.readFile(sourcePath, "utf8")` works for today's markdown/JSON content, but a future binary (image, etc.) under a copied area would be silently corrupted on copy.
- **Suggested fix:** Use `Buffer`-based copy (`fs.copyFile` or `fs.readFile` without encoding then `fs.writeFile` with the buffer), or assert text-only files before copy.

### Missing tests for copy and cleanup logic

- **Severity:** `minor`
- **Status:** `fixed`
- **Fixed in:** `scripts/ai-skills/content-copy.test.ts` (new, 5 tests). Refactored `copyContentToPlatformDir` and `removeDeletedManagedContent` to take `checkMode` and `changedPaths` as parameters (formerly module-level state) and exported them. Made `main()` invocation conditional on direct script execution so the test can import without triggering the dogfood build. Tests cover: happy-path copy with marker, no-op on second pass, check-mode reports drift but writes nothing, orphan cleanup after canonical removal, refuses to delete from unmanaged directories. 20 total tests pass (was 15).
- **File:** `scripts/ai-skills/build.ts:368-464` (no corresponding `*.test.ts`)
- **Problem:** `copyContentToPlatformDir` and `removeDeletedManagedContent` aren't covered by the test suite. The path-guard tests are tight, but the copy and rename-handling logic only run via the manual `pnpm prism:build` smoke test.
- **Suggested fix:** Add at least one regression test that creates a platform copy with a marker, removes the canonical source, and asserts the copy gets cleaned up. Also one that exercises the happy-path copy.

### Stale title in .prism/SPEC.md

- **Severity:** `minor`
- **Status:** `fixed`
- **Fixed in:** `.prism/SPEC.md:1-3` updated to "# PRISM Spec" / "the PRISM ecosystem"; templates mirror at `templates/install/.prism/SPEC.md.tmpl` matched. `pnpm prism:build` propagated to `.claude/SPEC.md`, `.codex/SPEC.md`, `.cursor/SPEC.md` — all three build copies now lead with `# PRISM Spec`.
- **File:** `.prism/SPEC.md:1-3` (and build copy `.claude/SPEC.md:1-3`)
- **Problem:** The canonical `.prism/SPEC.md` was created in this PR with the title "# `.claude/` Spec" and opening line "This document defines the tier hierarchy for the `.claude/` ecosystem." The file moved from being authored at `.claude/SPEC.md` to canonical at `.prism/SPEC.md`, but the title was not updated. When the build copies this to `.codex/SPEC.md` and `.cursor/SPEC.md`, those platforms read a title that references `.claude/` — confusing and inconsistent with the bifurcated layout.
- **Suggested fix:** Update the title to "# PRISM Spec" (or "# `.prism/` Spec") and the first paragraph to reference "the PRISM ecosystem" rather than "the `.claude/` ecosystem." Run `pnpm prism:build` to refresh build copies. The `templates/install/.prism/SPEC.md.tmpl` should receive the same update.

### docs/distribution.md frontmatter category mismatch

- **Severity:** `minor`
- **Status:** `fixed`
- **Fixed in:** Took option (a) — `git mv docs/distribution.md docs/content/dev/operations/distribution.md`. Frontmatter `category: "operations"` now matches placement. Updated the two referrers: README.md repo-shape diagram and `docs/content/dev/architecture/install-layout.md` cross-reference (now points to `../operations/distribution.md`). Updated the doc's own internal link to `install-layout.md` (now `../architecture/install-layout.md`).
- **File:** `docs/distribution.md:4` (frontmatter added in this PR by Eli)
- **Problem:** The new frontmatter sets `category: "operations"` but the documentation rule says "category: Match the subdirectory the file lives in." The file is at the root of `docs/` (`docs/distribution.md`), not under `docs/content/dev/operations/`. A reader using the category to navigate would expect this file at `docs/content/dev/operations/distribution.md`.
- **Suggested fix:** Either (a) move the file to `docs/content/dev/operations/distribution.md` to match the category, or (b) update the category to something that reflects root-level placement (e.g. `"reference"` or leave it as a convention gap for root-level docs). If option (b), document the root-level exception in `documentation.md`.

### content-copy.test.ts does not cover loose file copy path

- **Severity:** `minor`
- **Status:** `fixed`
- **Fixed in:** `scripts/ai-skills/content-copy.test.ts` — added `copyContentToPlatformDir copies the loose SPEC.md file` test. Writes a `SPEC.md` to the source contentRoot, runs the copy, asserts the file landed at the platform dir, then re-runs to confirm idempotence. 21 total tests pass (was 20).
- **File:** `scripts/ai-skills/content-copy.test.ts`
- **Problem:** `copyContentToPlatformDir` has two code paths: the `COPIED_CONTENT_AREAS` loop (tested) and the `COPIED_LOOSE_FILES` loop (`["SPEC.md"]`). No test creates a `SPEC.md` in the source contentRoot, so the loose file copy call to `copyFileIfChanged` is never exercised. The loop body silently skips when the source doesn't exist, so the tests pass — but the actual copy behavior for `SPEC.md` is untested.
- **Suggested fix:** Add one test that writes a `SPEC.md` to the source contentRoot, runs `copyContentToPlatformDir`, and asserts the file was copied to the platform dir. Cover both the happy path and check mode.

### `prism:check` reports false drift on a fresh clone for gitignored platforms

- **Severity:** `minor`
- **Status:** `fixed`
- **Fixed in:** Took option (a). `scripts/ai-skills/build.ts` — extracted `syncPlatformContentCopy` helper that gates content copy on the area-level `.ai-skill-generated` marker in check mode. Same root cause was also hitting skill-output writes (`.agents/skills/`, `.codex/agents/`, `.generated/cursor-skills/`, `.generated/codex-config.toml`), so applied the same opt-in shape there: `optedIn` map at `main()` start, computed via `skillsRootHasManagedContent`, `codexAgentsRootHasManagedContent`, and `pathExists`; per-platform skill writes, codex agent TOML writes, and codex-config write all gate on `optedIn`; `ensureDirectory(targetRoot)` skipped in check mode. Architect docs (both surfaces) and dev doc Trade-offs bullet now describe the marker-based opt-out signal. `scripts/ai-skills/content-copy.test.ts` — 4 new tests (skips with no managed content; skips with only unrelated dir; creates absent dir in build mode; drift-checks existing dir in check mode). 25 tests pass (was 21). End-to-end verified: `rm -rf .codex .cursor .agents .generated && pnpm prism:check` now passes (was failing with ~80+ false-drift entries).

### Path guard does not scan `templates/install/.prism/`

- **Severity:** `minor`
- **Status:** `fixed`
- **Fixed in:** Took option (a)-shape with a paths.json declaration. Added `canonical.templatesContentRoot: "templates/install/.prism"` to `.ai-skills/definitions/paths.json` and the matching field in `PathDefinitions` (`scripts/ai-skills/utils.ts`). Refactored `scripts/ai-skills/build.ts` `main()` to iterate both content roots in a single pass — accumulates violations across both surfaces and prefixes each violation message with the relative content-root label so reviewers see which surface tripped. `runPathGuard` API unchanged; the existing allowlist (keyed by relative-to-contentRoot paths) applies to both surfaces unchanged. Updated `path-guard.ts` header comment to document the dual-surface invocation. Added regression test `scans the templates-surface content root using the same allowlist` (26 total, was 25). Architect doc on both surfaces updated to mention the templates-surface scan. End-to-end verified: injecting a stale `.claude/rules/...` reference into `templates/install/.prism/rules/code-comments.md` makes `prism:check` fail with the expected `path-guard: templates/install/.prism/...` message; revert restores green.

---

## PR Readiness

Living checklist — updated when Briar self-reviews PR #2 or Eric reviews on GitHub.

- [x] No critical or major issues
- [x] Types correct — `pnpm prism:check-types` passes
- [x] No stray console.logs or debug artifacts
- [x] Tests written for new logic and edge cases — 26 passing (path-guard + content-copy + cleanup + opt-out + discovery-metadata + dual-surface guard)
- [x] All debugged issues resolved — Eric's templates-surface path-guard Minor is fixed
- [x] Build passes — `pnpm prism:check` passes after `pnpm prism:build`, and also passes on a simulated fresh clone (gitignored platforms absent)
- [x] PR description up to date
- [x] Lasting decisions promoted to architect context (ADR-0031 and `install-layout.md` are exactly this)

**Last updated:** 2026-05-04 (Clove fix for Eric's templates-surface path-guard Minor)
