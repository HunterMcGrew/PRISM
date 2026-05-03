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

---

## Decisions

- **Bifurcated install layout — `.prism/` canonical + platform-dir build copies.** Read-only canonical content (rules, ADRs, architect, templates, references) lives at `.prism/<area>/`. Platform dirs get build-time copies of read-only content (preserves Claude Code auto-load and equivalent on Codex/Cursor). Agent-written content (plans, lessons.md) lives only at `.prism/` — single source. ADR-0031 documents this. Full reasoning in `epic-phase-1-foundation.md` § Decisions.

- **Cross-reference convention: cite `.prism/<area>/<file>` paths in canonical sources.** Platform copies under `.prism/rules/` etc. are reflections — agents read whichever copy their platform's auto-load surfaced, but they edit the canonical at `.prism/`. Build-time guard fails if a canonical source contains `.claude/<area>/` or `.codex/<area>/` etc. paths outside skill files (where platform-specific paths are correct).

- **Distribution surface rename: `templates/claude/` → `templates/install/`.** The current name implies Claude-only distribution; the new layout is multi-platform. Renaming clarifies intent and updates `paths.json` accordingly.

- **Manifest moves with architect docs.** `.prism/architect/manifest.json` → `.prism/architect/manifest.json`. Routing patterns: file patterns like `.claude/skills/**` stay (skills stay platform-local), but architect doc references resolve relative to `.prism/architect/`.

- **Order vs PR #3 (tokenization): layout reorg ships first.** Tokenization sweeps at the final canonical paths instead of v1 `.claude/`-only paths. Saves a second sweep pass.

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
- **Status:** `open`
- **File:** `docs/parameterization.md:9`
- **Problem:** Line 9 still reads `appear in canonical sources (..., templates/claude/AGENTS.md.tmpl, etc.)` after the rename to `templates/install/`. Path no longer exists; reader can't follow it. The plan's task 4 sweep regex `\.claude/(area)/` didn't match `templates/claude/` because of the missing leading dot.
- **Suggested fix:** Replace `templates/claude/AGENTS.md.tmpl` with `templates/install/AGENTS.md.tmpl`. This is the source of the stale quotes in ADR-0030 — fix here first.

### Stale `templates/claude/` paths in ADR-0030 (3 surfaces)

- **Severity:** `major`
- **Status:** `open`
- **File:** `.prism/spec/adrs/0030-token-substitution-at-build-time.md:10,12` plus mirrors at `templates/install/.prism/spec/adrs/0030-token-substitution-at-build-time.md:10,12` and `.claude/spec/adrs/0030-token-substitution-at-build-time.md:10,12` (build copy)
- **Problem:** Line 10 quotes `docs/parameterization.md`'s stale `templates/claude/AGENTS.md.tmpl` reference; line 12 references `templates/claude/AGENTS.md.tmpl` and `templates/claude/SPEC.md.tmpl`. After the rename, paths are `templates/install/AGENTS.md.tmpl` and `templates/install/.prism/SPEC.md.tmpl`.
- **Suggested fix:** Update parameterization.md first, then re-anchor the line 10 quote and rewrite line 12 to match the new paths. Update the canonical `.prism/` copy and the templates mirror; `pnpm prism:build` will refresh the `.claude/` build copy from canonical.

### install-layout.md undercounts what the path guard scans

- **Severity:** `minor`
- **Status:** `open`
- **File:** `.prism/architect/install-layout.md:47` plus templates mirror at `templates/install/.prism/architect/install-layout.md:47`
- **Problem:** Says "It scans every `.md` file under the copied areas of `.prism/`" but the implementation also scans the loose `SPEC.md` (`PATH_GUARD_LOOSE_FILES` in `scripts/ai-skills/path-guard.ts:27`).
- **Suggested fix:** Add ", plus the loose `SPEC.md`" to the sentence on both surfaces. Rebuild to refresh the `.claude/` copy.

### Codex/Cursor build copies gitignored — bifurcation contingent on local build

- **Severity:** `minor`
- **Status:** `open`
- **File:** `.gitignore` + `.prism/architect/install-layout.md` (or `docs/distribution.md`)
- **Problem:** `/.codex/` and `/.cursor/` in `.gitignore` mean the dogfood content copies for those platforms are never committed. The architect doc claims "every platform sees the same rules and architect docs through its own auto-load mechanism" — practically true, but contingent on each developer running `pnpm prism:build` locally before opening Codex/Cursor on a fresh clone. `.claude/` build copies *are* committed, so the bifurcation is fully exercised only for Claude in this repo.
- **Suggested fix:** Either add a sentence in `install-layout.md` or `docs/distribution.md` calling out the build-required step for non-Claude platforms, or relax the gitignore for content copies (only ignore the build outputs that aren't content copies).

### copyContentToPlatformDir reads files as utf8

- **Severity:** `minor`
- **Status:** `open`
- **File:** `scripts/ai-skills/build.ts:386,409`
- **Problem:** `fs.readFile(sourcePath, "utf8")` works for today's markdown/JSON content, but a future binary (image, etc.) under a copied area would be silently corrupted on copy.
- **Suggested fix:** Use `Buffer`-based copy (`fs.copyFile` or `fs.readFile` without encoding then `fs.writeFile` with the buffer), or assert text-only files before copy.

### Missing tests for copy and cleanup logic

- **Severity:** `minor`
- **Status:** `open`
- **File:** `scripts/ai-skills/build.ts:368-464` (no corresponding `*.test.ts`)
- **Problem:** `copyContentToPlatformDir` and `removeDeletedManagedContent` aren't covered by the test suite. The path-guard tests are tight, but the copy and rename-handling logic only run via the manual `pnpm prism:build` smoke test.
- **Suggested fix:** Add at least one regression test that creates a platform copy with a marker, removes the canonical source, and asserts the copy gets cleaned up. Also one that exercises the happy-path copy.

---

## PR Readiness

Living checklist — updated when Briar self-reviews PR #2 or Eric reviews on GitHub.

- [ ] No critical or major issues — **2 Major open from Eric's review (stale `templates/claude/` paths in parameterization.md and ADR-0030)**
- [x] Types correct — `pnpm prism:check-types` passes
- [x] No stray console.logs or debug artifacts
- [ ] Tests written for new logic and edge cases — path-guard coverage is solid; `copyContentToPlatformDir` and `removeDeletedManagedContent` untested
- [x] All debugged issues resolved
- [x] Build passes — `pnpm prism:check` passes after `pnpm prism:build`
- [ ] PR description up to date
- [x] Lasting decisions promoted to architect context (ADR-0031 and `install-layout.md` are exactly this)

**Last updated:** 2026-05-03 (Eric PR review)
