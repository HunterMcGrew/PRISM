# Plan: epic-prism-update

## Ticket

https://github.com/HunterMcGrew/PRISM/issues/154

## Goal

Build `pnpm prism:update` so a consumer can pull PRISM's latest skills and context into an already-onboarded repo, keeping every local edit (as `.bak` where it conflicts) and extending personas through a `.prism/custom/` overlay that updates never touch.

---

## User Stories

Not required for this epic — the goal and per-phase gates are sufficient for implementation routing.

---

## Design

Not applicable.

---

## Implementation Tasks

The approved plan is structured by phase. Phase is the organizing spine; persona ownership is noted per phase. Phases 1–6 are predominantly Clove (implementation + tests). Phase 7 (`prism-skill-forge`) is also Clove / skill-authoring. Each phase ships as its own PR; the gate for each phase is `pnpm prism:check` green on a fresh checkout (plus any additional per-phase test suite).

**Phase 7 is an independent parallel track** — it couples only to Phase 1's `_toolkit/` layout and Phase 5's consumer-skill-namespace convention, not to the sync engine. It can ship as its own PR at any point after Phase 1 lands.

---

### Phase 1 — Namespace reorg (Clove)

Highest blast radius. Ships alone. Goal: PRISM-owned content becomes a glob; flat area dirs become consumer-owned space.

1. **Move architect docs into `.prism/architect/_toolkit/`.** Move the following files from `.prism/architect/` to `.prism/architect/_toolkit/`: `install-layout.md`, `onboarding.md`, `rule-generation.md`, `stack-detection.md`, `anchor-substitution.md`, `skills-ecosystem.md`, `spec-editing.md`, `audit-workflow.md`, `closing-messages.md`, `architecture-doc-shape.md`, `documentation.md`, `qa-test-planning.md`. Flat `.prism/architect/*.md` is then reserved for consumer product docs. The leading underscore keeps the recursive walker working unchanged and sorts the reserved dir first. Commit this move separately from the ADR move.

2. **Move ADRs into `.prism/spec/adrs/_toolkit/`.** Move all current ADRs (0001–0056) plus `README.md` and `TEMPLATE.md` from `.prism/spec/adrs/` to `.prism/spec/adrs/_toolkit/`. Flat `spec/adrs/*.md` is then reserved for consumer product ADRs, which eliminates the numbering-collision concern. Do this as a separate commit from the architect move.

3. **Split `manifest.json` ownership.** Create `.prism/architect/_toolkit/manifest.base.json` containing the toolkit-only routes (PRISM-owned). Keep the live `.prism/architect/manifest.json` as consumer-owned (merged from base + per-team routes at onboard). The merge-at-onboard logic may be deferred; lock the ownership split now. `scripts/ai-skills/verify-manifest-coverage.ts` is the regression guard.

4. **Update all cross-references to moved files.** Run a scripted grep inventory first to enumerate touch points. Expected scope: ~16 skill `shared.md` files, other architect docs/ADRs, `manifest.json` route values, `.ai-skills/definitions/seed-curation.json` (`curated`/`excluded`/`renames` path values → `_toolkit/`), and `scripts/ai-skills/path-guard.ts` allowlist (e.g. `architect/install-layout.md` → `architect/_toolkit/install-layout.md`). The `plans/` directory is out of scope — path-guard ignores it. Rewrite cross-references in the same commit as each move (architect move commit, then ADR move commit).

5. **Mirror Phase 1 moves in `templates/install/.prism/`.** Apply the identical directory structure changes to `templates/install/.prism/architect/` and `templates/install/.prism/spec/adrs/` in lockstep with the source moves — `checkSeedDrift` expects a seed twin at the same relative path for every canonical file.

**Gate:** `pnpm prism:check` green on fresh checkout (runs path-guard + seed-drift + manifest-coverage + check-mode copy). No new runtime behavior in this phase.

---

### Phase 2 — Hash manifest (Clove)

Additive phase. Builds `.prism/.sync-manifest.json` (dot-prefixed so existing walkers skip it; confirmed dot-file skip at `utils.ts:81` and `build.ts:215` — the `listRelativeDirectoryEntries` walker that actually performs the dot-skip).

1. **Add hash utilities to `scripts/ai-skills/utils.ts`.** Add two new exports after the existing `filesAreEqual` block: `hashContent(content: string | Buffer): string` and `hashFile(filePath: string): Promise<string>`, both using `node:crypto` `createHash("sha256")`. Hash raw bytes (consistent with `filesAreEqual`'s `Buffer.equals`). The hash string format is `sha256:<hex>`.

2. **Export `listRelativeDirectoryEntries` from `build.ts`.** It is currently module-private at `build.ts:236`. Add `export` to its declaration — no other change. This allows `sync-manifest.ts` to reuse it.

3. **Create `scripts/ai-skills/sync-manifest.ts`** with two exported functions:
   - `generateSyncManifest(prismContentRoot: string): Promise<SyncManifest>` — walks PRISM-owned globs, hashes each file using `hashFile`, returns the manifest object. The manifest shape:
     ```json
     { "prismVersion": "x.y.z", "sourceCommit": "<sha>", "generatedAt": "<ISO>",
       "files": { "architect/_toolkit/install-layout.md": { "contentHash": "sha256:..." } } }
     ```
     Keys are relative to `.prism/`. `contentHash` hashes canonical pre-substitution bytes (per ADR-0030: seed ships token literals; substitution is install-time). Per-file object retained for forward-compat (`renamedFrom` etc.).
   - `loadSyncManifest(consumerContentRoot: string): Promise<SyncManifest | null>` — reads `.prism/.sync-manifest.json`; returns `null` if absent (graceful path for older installs lacking a manifest).

4. **Wire `generateSyncManifest` into `build.ts main()`.** Add a call after the content-copy block (~line 1214), gated like other opt-in writes. Writes `.prism/.sync-manifest.json` to the PRISM content root.

**Gate:** `pnpm prism:check` green; `sync-manifest.test.ts` passes (Phase 6 test; write alongside this phase).

---

### Phase 3 — `pnpm prism:update` command (Clove)

First cross-repo behavior. New `scripts/ai-skills/update.ts`; `package.json` → `"prism:update": "tsx scripts/ai-skills/update.ts"`.

1. **Source resolution.** At startup: resolve `--prism-source <path>` CLI arg → fallback to `prismSource` field in consumer's `.ai-skills/config.json` → else error with guidance message. Compute `prismContentRoot` (source `.prism/`) and `consumerContentRoot = cwd/.prism`. Refuse with an explicit error if source === consumer (that is `prism:build`, not `prism:update`).

2. **Per-file algorithm** (PRISM-owned files only — determined by the ownership classifier from Phase 5, or the PRISM-owned globs defined in Phase 5; Phase 3 may stub the classifier as "all files in the manifest" until Phase 5 ships):
   - File not in consumer → write incoming.
   - `consumerHash === incomingHash` → no-op.
   - `recordedHash` exists and `consumerHash === recordedHash` → overwrite freely (clean base, consumer never diverged).
   - Otherwise (diverged, or no manifest for this file) → copy consumer file to `<file>.bak`, then write incoming; record the `.bak` path in the run summary.
   - **Important:** when no manifest exists at all (pre-manifest install), fall back to byte-compare against PRISM source before writing `.bak` — do not `.bak` an already-current file.
   - Deletions: files present in the consumer manifest but absent from PRISM source → remove (`.bak` first if diverged).

3. **Rewrite `.sync-manifest.json`** after the file pass: update `manifest.files[…]` with new hashes; carry `prismVersion`/`sourceCommit` from the PRISM source manifest.

4. **Refresh platform dirs.** After `.prism/` is updated, call the extracted `syncAllPlatformContentCopies` (see task 5) for each platform using a token map derived from the consumer's `config.json` (`deriveTokenMap(loadConfig(consumerRepoRoot))`).

5. **Refactor `build.ts` — extract platform-copy loop.** Extract the platform-copy-all loop from `build.ts main()` (currently at lines ~1188–1214) into an exported function `syncAllPlatformContentCopies(contentRoot, platformDirs, checkMode, changedPaths, tokenMap)`. Call it from both `main()` (unchanged behavior) and `update.ts`. Mechanical extraction; leave everything else in `build.ts` untouched. `content-copy.test.ts` covers the primitives.

6. **Skills (v1 scope note).** Skills are regenerated by recommending the consumer run `pnpm prism:build` post-update (per the end-to-end verification section). Full automated skill sync (factoring `main()`'s skill loop to accept consumer target roots) may be deferred to Phase 3b if needed.

**Gate:** `update.test.ts` exercises every per-file branch in temp repos (see Phase 6).

---

### Phase 4 — Overlay model (Clove)

Extends `update.ts` with a second platform-copy pass for `.prism/custom/`.

1. **Document overlay layout.** `.prism/custom/` mirrors canonical area names: `{rules,architect,references,templates}/`. Consumer-owned; the sync never writes into it. No files to create here — document the convention in the plan and confirm `update.ts` includes `.prism/custom/**` in the consumer-owned SKIP glob.

2. **Second `syncPlatformContentCopy` pass per platform.** After the base `.prism/` platform copy, run a second pass with `contentRoot = .prism/custom`, outputting into a `custom/` subpath per area:
   - `.claude/rules/custom/<filename>.md`
   - `.cursor/rules/custom/<filename>.mdc` (dialect-translated via existing `cursorRuleDialect`)
   - `.codex/rules/custom/<filename>.md`
   The `custom/` subdir makes base-vs-overlay collision structurally impossible (no "overlay wins by last-write" ambiguity). Token substitution applies — overlay rules can use team tokens. Reuses `copyContentFileWithSubstitution` + existing dialects unchanged.

3. **Marker.** Overlay platform output (the `custom/` subdir contents) gets a `.ai-skill-generated` marker at the `custom/` subdir root. Orphan cleanup walks it as managed but scoped to `custom/` — base and overlay cleanup never cross.

4. **SKIP glob in `update.ts`.** Add `.prism/custom/**` to the consumer-owned SKIP glob so `update.ts`'s canonical sync pass never touches the overlay source; only the platform-copy step reads it.

**Gate:** `overlay-copy.test.ts` covers all 3 platforms + marker + scoped cleanup (see Phase 6).

---

### Phase 5 — Ownership classification (Clove)

Pure function. Can be developed alongside Phase 2.

1. **Export `compileMatcher` from `scripts/ai-skills/verify-manifest-coverage.ts:88`.** Currently module-private. Add `export` — no other change. Already tested for `**`/`*`/prefix/exact patterns.

2. **Create `scripts/ai-skills/ownership.ts`** (or add to `sync-manifest.ts` — prefer a separate file for testability). Export two constants and a classifier:
   ```typescript
   export const PRISM_OWNED_GLOBS = [
     'architect/_toolkit/**', 'spec/adrs/_toolkit/**',
     'rules/**', 'templates/**', 'references/**',
     'spec/**', 'SPEC.md'
   ];
   export const CONSUMER_OWNED_GLOBS = [
     'architect/*.md',         // flat architect — consumer product docs
     'spec/adrs/*.md',         // flat consumer ADRs
     'architect/manifest.json', // live manifest — consumer-owned
     'custom/**',              // overlay — never touched
     'plans/**',               // branch plans
     'lessons.md'
   ];
   export function classifyPath(relativePath: string): 'prism' | 'consumer' | 'unknown';
   ```
   Reuse `compileMatcher` for glob matching.

3. **Skill ownership convention.** Document in `ownership.ts` (JSDoc on `PRISM_OWNED_GLOBS`): PRISM owns `prism-*` skill IDs; consumer-authored skills use the org token from `config.json` (e.g. `acme-<role>`) or `custom-<role>` prefix and are consumer-owned. `update.ts`'s skill-regeneration globs `prism-*` only (Phase 3b, when built).

4. **Wire the classifier into `update.ts`.** Replace the Phase 3 stub ("all files in manifest") with `classifyPath` calls — consumer-owned paths are skipped entirely.

**Gate:** `ownership.test.ts` passes (see Phase 6); `pnpm prism:check` green.

---

### Phase 6 — Testing (Clove)

Tests written alongside each phase (`withTempRoots` pattern from `content-copy.test.ts:23`). This phase lists the full test suite for completeness; individual suites are gated per their phase.

1. **`sync-manifest.test.ts`** — hash stability across identical inputs; `generateSyncManifest` covers exactly PRISM-owned globs; load/parse round-trip; `loadSyncManifest` returns `null` on missing file. (With Phase 2.)

2. **`ownership.test.ts`** — classifier verdicts for `_toolkit/**` (prism), flat `architect/*.md` (consumer), `custom/**` (consumer), loose `SPEC.md` (prism), `plans/**` (consumer). (With Phase 5.)

3. **`update.test.ts`** — all per-file branches: new / no-op / clean-overwrite / diverged→.bak / no-manifest fallback (byte-compare before .bak) / consumer-owned untouched / overlay untouched / deleted-in-PRISM removed; manifest rewritten after run. (With Phase 3.)

4. **`overlay-copy.test.ts`** — overlay file → Claude verbatim, Cursor `.mdc` dialect-translated, Codex verbatim; marker present at `custom/` subdir root; scoped cleanup does not touch base files. (With Phase 4.)

5. **Extend `seed-drift.test.ts`** — confirm reorged paths (Phase 1 moves) still satisfy seed-drift checks. (With Phase 1 or immediately after.)

6. **Extend `path-guard.test.ts`** — confirm moved allowlist entries (e.g. `architect/install-layout.md` → `architect/_toolkit/install-layout.md`) resolve correctly after Phase 1. (With Phase 1.)

7. **Check `verify-manifest-coverage.test.ts`** — if any `PERSONA_SCOPES` paths reference docs moved in Phase 1, update the expected paths. (With Phase 1.)

**Gate:** `pnpm prism:test` green (all above suites + existing).

---

### Phase 7 — `prism-skill-forge` utility (Clove / skill-authoring)

**Independent parallel track** — couples only to Phase 1's `_toolkit/` layout convention and Phase 5's consumer-skill-namespace convention. Can ship as its own PR at any point after Phase 1 lands.

1. **Create the skill source directory.** Scaffold `.ai-skills/skills/prism-skill-forge/` with:
   - `frontmatter.yml`: `name: prism-skill-forge`, `description` using the 4-part shape (≤1000 chars, folded `>` scalar), triggers covering "create skill", "scaffold skill", "migrate skill", "add persona".
   - `shared.md`: procedure-first, no persona voice or "You are X" (utility type per ADR-0046). Two modes: Create and Migrate (detailed below).
   - Add `roles.json` entry: `{ "id": "prism-skill-forge", "type": "utility" }`.

2. **Create mode — guided scaffolding.** The skill walks the user through:
   - ADR-0046 decision: persona (switches voice, has name/domain/triggers) vs utility (action, current voice, function keywords only). If proposed new persona overlaps existing, route to Winston.
   - Collect ID (consumer skills default to org token from `config.json` or `custom-<role>` — never `prism-*`), and for persona: human name, voice/lens, triggers.
   - Write `.ai-skills/skills/<id>/`: `frontmatter.yml` (4-part description ≤1000 chars, folded `>` scalar — enforced by `discovery-metadata.test.ts`), `shared.md` skeleton (persona: PIN voice/lens/anti-patterns/router/DoD; utility: procedure-first, no voice/lens/"You are X"), optional `claude.md`/`codex.md`/`cursor.md`.
   - Add `roles.json` entry.
   - Run `pnpm prism:build` and confirm build passes + discovery/literal/path tests green.

3. **Migrate mode — decompose an existing platform skill into canonical source.** Detect source shape and decompose:
   - **Skill-markdown forms** (`.claude/skills/<id>/SKILL.md`, `.cursor/skills/<id>/SKILL.md`, `.agents/skills/<id>/SKILL.md`): split frontmatter → `frontmatter.yml`, body → `shared.md`. Generalize `scripts/ai-skills/bootstrap-from-claude.ts` (already handles the Claude case) — reuse `splitFrontmatter`, `rewriteSkillIdReferences` (prefix remap), `writeIfMissingOrForce`.
   - **Codex agent adapter** (`.codex/agents/<id>.toml`): new TOML-aware extractor that strips the `buildCodexAgentToml` wrapper (`You are X` opener + always-on-rules block) and recovers skill body + persona. Prefer `.agents/skills/<id>/SKILL.md` when both exist.
   - **Strip generated artifacts**: remove `GENERATED_HEADER_LINE` and `.ai-skill-generated` marker. Re-tokenizing substituted literals is best-effort and lossy — flag for human review, do not block.
   - **Platform delta recovery** (nice-to-have): if multiple platform copies of the same skill exist, diff them to recover per-platform deltas; otherwise default all to `shared.md` and leave `claude.md`/`codex.md`/`cursor.md` empty.
   - Normalize ID to consumer namespace (Phase 5 convention), add `roles.json` entry, run `prism:build`, verify.

4. **Note on migrating rules.** Migrating a hand-authored Cursor `.mdc` rule (with `globs:`/`alwaysApply:`) requires the reverse of `cursorRuleDialect`. Flag as a small adjacent capability; not v1-blocking for this skill.

**Gate:** the new skill builds clean via `pnpm prism:build`; round-trips through `prism:test`; a created utility produces no `.codex/agents/<id>.toml`; a created/migrated consumer skill carries a non-`prism-*` ID.

---

## Decisions

- **Merge = overwrite + `.bak` + overlay (BMAD-style). No three-way merge.** The danger of a naive copy is real: PRISM ships its own ADRs, rules, and architect docs, and consumers hand-edit some of them. BMAD's model writes PRISM-owned files freely, preserves consumer-diverged files as `.bak` (never silent-lose), and puts all consumer customization in `.prism/custom/` which the sync never touches.
  - → no promotion needed (implementation-level decision; supersedes Epic B's three-way-merge model which is documented in `epic-prism-sync-steady-state.md`)

- **Physical namespace separation so ownership is path-decidable.** Moving PRISM-owned docs to `_toolkit/` subdirs makes the sync's classification a glob, not a guess. Before Phase 1, "what is PRISM allowed to overwrite" was undecidable by path — Thrive mixes PRISM-lineage toolkit docs flat alongside its own product docs in one directory.
  - → no promotion needed (implementation decision; documented here)

- **Overlay mechanism in v1; a dedicated "extend/add a skill" persona is a follow-up ticket.** The `.prism/custom/` overlay covers the "extend an existing rule or skill" use case. A guided persona-extension workflow inside `prism-skill-forge` is a follow-up, not a blocker.
  - → no promotion needed (scope boundary; follow-up tracked in plan § Follow-up)

- **Overlay syncs to all 3 platforms (Claude/Codex/Cursor) via the existing content-copy + dialect pipeline.** No new dialect logic needed; the overlay just runs `syncPlatformContentCopy` a second time with `contentRoot = .prism/custom`.
  - → no promotion needed (implementation detail)

- **Thrive is read-only reference. Nothing in this epic writes to Thrive.** Thrive was read to confirm the flat-directory collision failure mode concretely. No `.ai-spec/→.prism/` migration mode.
  - → no promotion needed (scope boundary)

- **`.sync-manifest.json` dot-prefixed so existing walkers skip it.** Dot-file skip confirmed at `utils.ts:81` (the primary dot-skip in `listRelativeFilePaths`) and `build.ts:215` (the dot-skip walker inside `listRelativeDirectoryEntries`). Note: `build.ts:244` is the *signature* of `listRelativeDirectoryEntries`, not the dot-skip line — the approved plan cited `:244` for the dot-skip but that is the function signature; the actual skip is at `:215`. Phase 2 tasks reflect the corrected line reference.
  - → no promotion needed (implementation detail with citation correction)

- **Consumer-skill namespace: non-`prism-*` prefix (org token or `custom-`).** PRISM owns `prism-*` skill IDs; the sync regenerates only these. Consumer-authored skills use the org token from `config.json` or `custom-` prefix. Enforced by Phase 7's skill-creator. This is the reason Phase 3b's skill-regeneration globs `prism-*` only.
  - → no promotion needed (convention; enforced by tooling)

- **Cross-ref sweeps during a move must cover `.tmpl` install-template sources, not just `.md`.** The Phase 1 sweep missed `templates/install/AGENTS.md.tmpl` and `templates/install/.prism/SPEC.md.tmpl` because both files are hand-edited source templates (not generated by `pnpm prism:build`) and the sweep was scoped to `.md` files. Install templates carry their own prose references to moved files and must be included in any future reorg sweep.
  - → no promotion needed (Phase 1 reorg tactic; future sweeps should extend to `.tmpl`/`.mdc`/`.json` as Sol's sweep confirmed)

- **`manifest.json` is split-ownership.** `.prism/architect/_toolkit/manifest.base.json` holds toolkit routes (PRISM-owned); `.prism/architect/manifest.json` is consumer-owned (merged from base + per-team routes at onboard). The merge-at-onboard logic may be deferred; the ownership split is locked in Phase 1. `verify-manifest-coverage.ts` guards it.
  - → no promotion needed (implementation decision; may graduate to ADR when merge-at-onboard is built)

---

## History

- 2026-06-15 [main]: Epic plan created from approved design session (greedy-conjuring-barto.md). 7-phase build plan transcribed. Linear epic pending. Epic-B superseded; Epic-C flagged for replan.
- 2026-06-15 [hmcgrew/prism-update-phase-1-namespace-reorg]: Phase 1 complete — 12 architect docs moved to `.prism/architect/_toolkit/`, 54 ADRs moved to `.prism/spec/adrs/_toolkit/`, all cross-references rewritten, manifest split created, seed twins synced. `pnpm prism:check` green (175/175 tests pass, manifest coverage verified). Two commits: architect move (320 files) and ADR move (242 files).
- 2026-06-15 [hmcgrew/prism-update-phase-1-namespace-reorg]: Briar self-review found 3 major issues: (1) 5 seed twin rule/reference files have stale flat ADR refs that weren't updated alongside canonicals; (2) `templates/install/.prism/references/review-docs-impact.md` seed twin links to old `architect/documentation.md` path; (3) `CONTEXT.md` was missed in the reorg sweep and still references 3 flat architect doc paths. All clear-cut fixes — routing to Clove.
- 2026-06-15 [hmcgrew/prism-update-phase-1-namespace-reorg]: Clove (#155) fixed all 3 major review issues — comprehensive tree-wide grep found 2 additional stale refs (ADR-0044 in install-layout.md seed twin, ADR-0029 illustrative example in implementation-task-detail.md seed twin). 15 files updated; `pnpm prism:check` green 175/175.
- 2026-06-15 [hmcgrew/prism-update-phase-1-namespace-reorg]: Clove (#155 follow-up) fixed 2 remaining Eric Majors — `AGENTS.md.tmpl` (3 stale `architect/skills-ecosystem.md`/`spec-editing.md` refs) and `SPEC.md.tmpl` (1 stale `architect/skills-ecosystem.md` ref + 1 stale ADR-0003 flat path). Sweep clean; `pnpm prism:check` green 175/175.
- 2026-06-15 [hmcgrew/prism-update-phase-1-namespace-reorg]: Eric PR-review (#156) found a 3rd Major round — the moved ADRs' own `## References` sections still pointed at flat `architect/skills-ecosystem.md`. Sol's corrected sweep (prior passes were `.md`-scoped and a `grep -v "_toolkit/"` filter matched the line's path prefix — a false-clean) found the complete set: 28 source files (13 canonical `_toolkit/` ADRs + 13 template twins + 2 template architect docs).
- 2026-06-15 [hmcgrew/prism-update-phase-1-namespace-reorg]: Clove (Opus, #155, `cf22072`) applied 37 substring-safe `architect/<doc>` → `architect/_toolkit/<doc>` replacements across the 28 files + regenerated platform copies + fixed the `AGENTS.md.tmpl:119` minor. Sol independently re-verified the corrected sweep clean; Eric re-review clean (`pnpm prism:check` 175/175).
- 2026-06-15 [main]: Phase 1 MERGED via PR #156 (squash `519b0f5`). Phases 2 (hash manifest) and 5 (ownership classifier) unblocked. Run paused for handoff to a fresh Sol session.
- 2026-06-15 [hmcgrew/prism-update-phase-2-hash-manifest]: Phase 2 complete (#158) — added `hashContent`/`hashFile` (utils.ts), `generateSyncManifest`/`loadSyncManifest` (new `sync-manifest.ts`), exported `listRelativeDirectoryEntries`, and wired the build-mode-only `.prism/.sync-manifest.json` write into `build.ts main()`. The manifest carves consumer-owned globs back out of the broader PRISM-owned globs so flat `spec/adrs/*.md`/`architect/*.md` never enter it; it is gitignored (volatile `sourceCommit`/`generatedAt`) so it is never a `prism:check` drift target. `pnpm prism:check` green 182/182 (was 175; +7 from `sync-manifest.test.ts`).

---

## Debugged Issues

(None yet.)

---

## Review Issues

### Stale flat ADR refs in 5 seed twin rule/reference files

- **Severity:** `major`
- **Status:** `fixed`
- **Fixed in:** `#155` — updated all flat ADR refs to `_toolkit/` paths in seed twin rules and references; also caught ADR-0044 in install-layout.md seed twin and ADR-0029 illustrative example in implementation-task-detail.md seed twin
- **File:** `templates/install/.prism/references/architect/plan-mode.md:12,36,48,104`; `templates/install/.prism/rules/branch-plan.md:131,172`; `templates/install/.prism/rules/skill-authoring.md:11,17,79`; `templates/install/.prism/rules/architect-doc-verification.md:11`; `templates/install/.prism/rules/implementation-task-detail.md:60`
- **Problem:** These 5 seed twin files contain ADR hyperlinks using the old flat path (`../spec/adrs/0NNN-*.md`) instead of `../spec/adrs/_toolkit/0NNN-*.md`. The canonical counterparts were correctly updated; the seed twins were partially missed. A consumer who installs from `templates/install/.prism/` will get hyperlinks that point to empty consumer-space (`spec/adrs/`) rather than to `spec/adrs/_toolkit/` where the ADRs now live.
- **Suggested fix:** Update each of the 5 files to change `spec/adrs/0NNN-` → `spec/adrs/_toolkit/0NNN-` for all ADR cross-references. The canonical `.prism/` counterpart for each is already correct — diff against it to find every affected line.

### Stale flat architect doc refs in `templates/install/.prism/references/review-docs-impact.md`

- **Severity:** `major`
- **Status:** `fixed`
- **Fixed in:** `#155` — both `documentation.md` refs updated to `_toolkit/documentation.md`
- **File:** `templates/install/.prism/references/review-docs-impact.md:7,9`
- **Problem:** The seed twin still references `../architect/documentation.md` (a file that no longer exists at the flat path in the seed — it moved to `_toolkit/`). The canonical `.prism/references/review-docs-impact.md` was correctly updated to `../architect/_toolkit/documentation.md`. A consumer who installs will have a broken relative link in this reference doc.
- **Suggested fix:** Change both occurrences from `../architect/documentation.md` to `../architect/_toolkit/documentation.md` to match the canonical.

### CONTEXT.md has stale flat architect doc references (missed in Phase 1)

- **Severity:** `major`
- **Status:** `fixed`
- **Fixed in:** `#155` — all 7 flat architect doc refs updated to `_toolkit/` paths
- **File:** `CONTEXT.md:27,38,67,77,101,121,146,155,178`
- **Problem:** `CONTEXT.md` was not changed in Phase 1. It contains multiple prose references to `architect/skills-ecosystem.md`, `architect/audit-workflow.md`, and `architect/install-layout.md` — all docs that moved to `_toolkit/`. These are not clickable hyperlinks in the current format, but they are load-bearing references that agents and humans follow. The plan's Phase 1 scope said "Plans directory is out of scope" but CONTEXT.md is a root-level glossary file, not a plan — it should have been included.
- **Suggested fix:** Update `CONTEXT.md` to replace `architect/skills-ecosystem.md` → `architect/_toolkit/skills-ecosystem.md`, `architect/audit-workflow.md` → `architect/_toolkit/audit-workflow.md`, and `architect/install-layout.md` → `architect/_toolkit/install-layout.md` throughout.

---

## Acceptance Criteria

Derived from per-phase gates and the end-to-end verification section of the approved plan.

### Behavioral

- [ ] Given Phase 1 is complete, When `pnpm prism:check` runs on a fresh checkout, Then it exits green (path-guard + seed-drift + manifest-coverage + check-mode copy all pass). (REQ-1: Phase 1 gate)
- [ ] Given Phase 2 is complete, When `pnpm prism:test` runs, Then `sync-manifest.test.ts` passes (hash stability, generateSyncManifest covers PRISM-owned globs, load/parse round-trip, null on missing manifest). (REQ-2: Phase 2 gate)
- [ ] Given Phase 3 is complete, When `pnpm prism:test` runs, Then `update.test.ts` passes all per-file branches (new / no-op / clean-overwrite / diverged→.bak / no-manifest fallback / consumer-owned untouched / deleted-in-PRISM removed). (REQ-3: Phase 3 gate)
- [ ] Given Phase 4 is complete, When `pnpm prism:test` runs, Then `overlay-copy.test.ts` passes for all 3 platforms, marker present, scoped cleanup does not touch base files. (REQ-4: Phase 4 gate)
- [ ] Given Phase 5 is complete, When `pnpm prism:test` runs, Then `ownership.test.ts` passes classifier verdicts for `_toolkit/**` (prism), flat `architect/*.md` (consumer), `custom/**` (consumer), `SPEC.md` (prism), `plans/**` (consumer). (REQ-5: Phase 5 gate)
- [ ] Given the end-to-end scenario: a throwaway temp consumer dir seeded from `templates/install/.prism` with one rule hand-edited and one `.prism/custom/rules/team.md` added, When `pnpm prism:update --prism-source <PRISM path>` runs, Then: the hand-edited rule is preserved as `.bak` and the new version written; the custom overlay is untouched at source and emitted to `.claude/rules/custom/`, `.cursor/rules/custom/*.mdc`, `.codex/rules/custom/`; `.sync-manifest.json` is rewritten; a consumer-owned flat `architect/foo.md` is untouched. (REQ-6: end-to-end verification)
- [ ] Given Phase 7 is complete, When a user runs `prism-skill-forge` in create mode and chooses "utility", Then the resulting skill builds clean via `pnpm prism:build` and produces no `.codex/agents/<id>.toml`. (REQ-7: Phase 7 gate — utility type)
- [ ] Given Phase 7 is complete, When a user runs `prism-skill-forge` in create mode or migrate mode with a consumer skill, Then the resulting skill ID carries a non-`prism-*` prefix. (REQ-7: Phase 7 gate — namespace)

### Non-behavioral

- [ ] `pnpm prism:check` remains green after every phase (per-phase invariant). (REQ-1 through REQ-6)
- [ ] `.prism/custom/**` is never written by `pnpm prism:update` — only read by the platform-copy overlay pass. (REQ-4)
- [ ] `.bak` files are created only when the consumer file genuinely diverged from the last-known PRISM base; no-op files do not produce `.bak` artifacts. (REQ-3)
- [ ] Phase 7 skills carry a non-`prism-*` ID in `roles.json`. (REQ-7)

### AC Sync Log

| Date | Agent | Action | Plan | Linear |
| ---- | ----- | ------ | ---- | ------ |
| 2026-06-15 | Nora | Generated AC from approved plan per-phase gates and end-to-end verification | created | pending |

---

## Cleanup Items

(None yet.)

---

## PR Readiness

Phase 2 branch (`hmcgrew/prism-update-phase-2-hash-manifest`). Phase 1 merged (PR #156, `519b0f5`).

- [x] No critical or major issues
- [x] Types correct — no `any`, no unsafe `as` (`pnpm prism:check-types` clean)
- [x] No stray console.logs or debug artifacts
- [x] Tests written for new logic and edge cases (`sync-manifest.test.ts`: hash stability, exact PRISM-owned-glob coverage, load/parse round-trip, null-on-missing, check-mode no-write)
- [x] All debugged issues resolved (no `open` entries)
- [x] Build passes — last run: 2026-06-15 (`pnpm prism:check` green, 182/182 tests pass)
- [ ] PR description up to date (PR not yet opened — conductor runs Briar self-review first)
- [x] Lasting decisions promoted to architect context (not applicable for Phase 2 — `.sync-manifest.json` shape decisions stay in plan; manifest may graduate to ADR when Phase 3 consumes it)
- [ ] Phase 2 PR open / merged — pending self-review and conductor dispatch

**Last updated:** 2026-06-15 (Clove — Phase 2 implemented; awaiting Briar self-review)

---

## Follow-up (not this epic)

- **Prose cross-reference lint in `pnpm prism:check`** (decided in-scope as its own GitHub issue, priority; Nora to file). Scan every content carrier (`.md`/`.tmpl`/`.mdc`/`.json`) across canonical + seed-twin for references to paths that don't exist. Motivated by PR #156's 3-pass completeness miss — the existing check (path-guard + seed-drift + manifest-coverage) does not scan prose hyperlink/path correctness, so stale refs in `.tmpl` sources, seed-twin `.md` files, and moved-ADR `## References` bodies all passed green. Scope is the GENERAL guard, NOT just the two `.tmpl` pairs the original suggested-task named — the same defect hit all three carrier types. See `.prism/lessons.md` (the sweep-methodology trap: extension-scoped greps + the `grep -v` path-prefix false-clean).
- **Delete the orphaned `.generated/cursor-skills/` tree** — tracked but no longer a build target (build writes Cursor output to `.cursor/skills` per `.ai-skills/definitions/paths.json`); last touched 2026-06-13 by #73, drifts from the live output. Small cleanup PR.
- **`manifest.json` merge-at-onboard logic**, if deferred from Phase 1.
- **Overlay-authoring affordance inside `prism-skill-forge`** — a guided "extend Briar" flow (appended steps / extra menu items written into `.prism/custom/`) once both the overlay and the forge exist.
- **Migrating hand-authored Cursor `.mdc` rules** (reverse of `cursorRuleDialect`) — flagged in Phase 7 as adjacent but not v1-blocking.
- **Phase 3b: automated skill sync** (factoring `main()`'s skill loop to accept consumer target roots), if the v1 "recommend `pnpm prism:build`" approach proves insufficient.
