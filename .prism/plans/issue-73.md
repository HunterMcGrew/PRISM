# Plan: issue-73

## Ticket

GitHub issue #73 — https://github.com/HunterMcGrew/PRISM/issues/73

## Goal

Emit runtime-native artifacts so Codex honors the ADR-0035 tier model: inline always-on (Tier-1) rule bodies into a generated block in `AGENTS.md`, and guard that generated block against drift in `pnpm prism:check`. (Cursor half shipped in a prior PR — this goal is the Codex-only remainder.)

---

## Spike Findings (pre-implementation verification — 2026-06-15)

Spike posted to issue #73 corrected the original premise:

- **Cursor half: confirmed done.** `.cursor/rules/` emits 27 `.mdc` files with translated `globs:`/`alwaysApply:` frontmatter, zero stray `paths:`. Task 1 above shipped this. No additional Cursor work.
- **Codex half: gap confirmed.** `.codex/rules/` emits 27 verbatim `.md` copies — 7 carry a `paths:` key Codex never reads. Codex auto-loads only `AGENTS.md`; it has no rules-directory auto-load mechanism. Root `AGENTS.md` contains a `## Behavioral norms` pointer table (links to `.prism/rules/<file>.md`) but does not inline rule bodies. Net: Tier-1 rule bodies do not reach Codex.
- **#64 unblocked.** Issue #64 (Slim AGENTS.md) merged 2026-06-13 via PR #106. `AGENTS.md` is clean and ready for the generated block.
- **OPEN decision below (Tier-1 source of truth):** the spike confirms ADR-0035 prose identifies the Tier-1 set by example (rules without `paths:` frontmatter = Tier 1). No machine-readable registry exists today. The build can derive the Tier-1 set at build time by inspecting each `.prism/rules/*.md` for absence of `paths:` frontmatter — Winston to confirm this is the right approach before Clove implements.

---

## Implementation Tasks

### Clove (implementation)

1. **Cursor dialect emission (shipped — 2026-06-11).** When `pnpm prism:build` copies rules to `.cursor/rules/`, rewrite the frontmatter to Cursor's dialect and rename `.md` → `.mdc`. Canonical stays Claude-dialect `.md` per ADR-0035.

2. **Add `codexRuleDialect` to `scripts/ai-skills/rule-dialect.ts`** (strips stray `paths:` from `.codex/rules/` — Decision 3). After `cursorRuleDialect` (ends line ~118), add a `codexRuleDialect: RuleDialect` export. `transformContent(area, content)`: when `area === RULES_AREA` and `splitFrontmatter(content).frontmatter` contains a `paths:` key (test `/^paths:/m`), return the body only — `splitFrontmatter(content).body` with a single leading newline stripped (`.replace(/^\r?\n/, "")`), no frontmatter fence re-added (Tier-1 rules have no frontmatter, so they must pass through with none). When the area is not `rules`, or the rule has no `paths:` frontmatter, return `content` unchanged. `mapTargetRelativePath` and `mapSourceRelativePath` are identity (return `relativePath` unchanged — Codex reads `.md`, no rename). Reuse the existing `splitFrontmatter` and `RULES_AREA` already in the file. Verification: `pnpm prism:test` (after task 3 adds the test). Sequence: blocks task 5.

3. **Add `codexRuleDialect` tests to `scripts/ai-skills/rule-dialect.test.ts`.** Append four `test(...)` cases mirroring the cursor cases: (a) "codex dialect strips a Tier 2 paths: block, leaving body only" — input a `---\npaths:\n  - "**/*.tsx"\n---\n\n# Accessibility\n\nBody.` and assert the output `doesNotMatch(/paths:/)`, `doesNotMatch(/^---/)`, and `match(/# Accessibility/)`; (b) "codex dialect leaves a frontmatter-less Tier 1 rule untouched" — input `# Writing Voice\n\nBody.\n`, assert `equal(out, input)`; (c) "codex dialect leaves non-rule areas untouched" — input a `paths:`-bearing string with area `"architect"`, assert `equal(out, input)`; (d) "codex dialect path maps are identity" — assert `mapTargetRelativePath("rules", "accessibility.md") === "accessibility.md"` and `mapSourceRelativePath("rules", "accessibility.md") === "accessibility.md"`. Import `codexRuleDialect` from `./rule-dialect`. Verification: `cd /Users/hunter/Documents/PRISM/PRISM && pnpm prism:test`. Sequence: after task 2.

4. **Wire `codexRuleDialect` into the Codex platform copy in `scripts/ai-skills/build.ts`.** Two edits: (i) the import block at lines 25–29 — add `codexRuleDialect` to the named imports from `"./rule-dialect"` (alongside `cursorRuleDialect`, `verbatimRuleDialect`). (ii) the `platformDirs` array in `main()` (lines ~1190–1203) — change the `.codex` entry's `dialect` from `verbatimRuleDialect` to `codexRuleDialect`. Leave the `.claude` entry on `verbatimRuleDialect` (Claude reads canonical dialect directly) and `.cursor` on `cursorRuleDialect`. Verification: `cd /Users/hunter/Documents/PRISM/PRISM && pnpm prism:build` then confirm the 7 `.codex/rules/` Tier-2 files no longer contain a `paths:` line (`grep -L "^paths:" .codex/rules/accessibility.md`). Sequence: after tasks 2–3.

5. **Create `scripts/ai-skills/agents-md-block.ts`** — the Tier-1 inlining generator (new file, Decision 1). Exports: (a) `const AGENTS_MD_BLOCK_BEGIN = "<!-- BEGIN GENERATED TIER-1 RULE BODIES — managed by scripts/ai-skills/build.ts; do not edit -->"` and `const AGENTS_MD_BLOCK_END = "<!-- END GENERATED TIER-1 RULE BODIES -->"`. (b) `const CODEX_INLINE_EXCLUDE: ReadonlySet<string> = new Set([])` — empty today; documented opt-out for any future Tier-3 rule that lands without `paths:` frontmatter but should not inline. (c) `async function collectTier1RuleBodies(rulesDir: string): Promise<{ name: string; body: string }[]>` — read every `*.md` in `rulesDir`, sort by filename ascending (matches `listRelativeDirectoryEntries`), include a file when its frontmatter has no `paths:` key (reuse the `splitFrontmatter` shape from `rule-dialect.ts` — import it or replicate the `/^---\r?\n([\s\S]*?)\r?\n---/` test) AND its basename is not in `CODEX_INLINE_EXCLUDE`; return `{ name: basename, body: full file content trimmed }`. (d) `function renderTier1Block(rules: { name: string; body: string }[]): string` — return `AGENTS_MD_BLOCK_BEGIN + "\n\n" +` each rule rendered as `` `<!-- source: .prism/rules/<name> -->\n\n<body>` `` joined by `\n\n---\n\n"` `` + `"\n\n" + AGENTS_MD_BLOCK_END`. (e) `function replaceTier1Block(agentsMd: string, block: string): string` — if the file already contains a begin/end marker pair, replace everything between (and including) the markers with `block`; otherwise insert `block` immediately after the `## Behavioral norms` table (anchor on the line `| 12 | Pre-compaction checkpoint` ... insert after the blank line following the table, before the `---` separator at AGENTS.md line 81). Use a regex that matches `BEGIN...END` non-greedily for the replace path. Verification: `cd /Users/hunter/Documents/PRISM/PRISM && pnpm prism:check-types`. Sequence: blocks tasks 6–7.

6. **Create `scripts/ai-skills/agents-md-block.test.ts`** — regression suite for the generator. Cases: (a) "collectTier1RuleBodies includes no-paths rules and excludes paths-bearing rules" — build a temp `rules/` dir with one `paths:`-bearing file and one frontmatter-less file, assert only the frontmatter-less one is returned; (b) "collectTier1RuleBodies returns rules in alphabetical order" — temp dir with `b.md`, `a.md` (both no frontmatter), assert order `["a.md", "b.md"]`; (c) "renderTier1Block wraps bodies in begin/end markers with source comments" — assert output starts with `AGENTS_MD_BLOCK_BEGIN`, ends with `AGENTS_MD_BLOCK_END`, and contains `<!-- source: .prism/rules/a.md -->`; (d) "replaceTier1Block replaces an existing block idempotently" — run `replaceTier1Block` twice, assert the second output equals the first (no duplicate blocks); (e) "replaceTier1Block inserts after Behavioral norms when no block exists" — feed a minimal AGENTS.md containing the `## Behavioral norms` table and assert the block lands after it. Verification: `cd /Users/hunter/Documents/PRISM/PRISM && pnpm prism:test`. Sequence: after task 5.

7. **Wire the AGENTS.md sync into `build.ts` main() (build + check paths).** (i) Add `import { collectTier1RuleBodies, renderTier1Block, replaceTier1Block, AGENTS_MD_BLOCK_BEGIN, AGENTS_MD_BLOCK_END } from "./agents-md-block";` to the import block. (ii) Add an exported `async function syncAgentsMdTier1Block(repoRootArg, checkModeArg, changedPathsArg)`: read `path.join(repoRootArg, "AGENTS.md")`; if absent, return (lazy — no creation). Compute `const rules = await collectTier1RuleBodies(path.join(repoRootArg, ".prism/rules"))`, `const block = renderTier1Block(rules)`, `const next = replaceTier1Block(current, block)`. If `next === current`, return. Otherwise push `path.join(repoRootArg, "AGENTS.md")` to `changedPathsArg`; when `!checkModeArg`, `await fs.writeFile(agentsPath, next)`. This mirrors the `writeFileIfChanged` contract but operates on a root file outside the copied-area pipeline, so it is its own function. (iii) Call `await syncAgentsMdTier1Block(repoRoot, checkMode, changedPaths);` in `main()` immediately after the `syncPlatformContentCopy` loop (after line ~1214, before `removeDeletedManagedSkills`). The existing check-mode block at lines 1275–1290 already turns a populated `changedPaths` into a non-zero exit with the file listed — no separate guard needed. Verification: `cd /Users/hunter/Documents/PRISM/PRISM && pnpm prism:build` (writes the block), then `pnpm prism:check` (passes green), then manually edit one inlined rule body in AGENTS.md and confirm `pnpm prism:check` exits non-zero listing `AGENTS.md`, then re-run `pnpm prism:build` to restore. Sequence: after tasks 5–6; this is the integration point that satisfies all four behavioral ACs.

8. **Add `AGENTS.md` to the literal-guard / build-copy exclusions if it trips a guard, and confirm no seed interaction.** Run `pnpm prism:check` after task 7. If `literal-guard` flags `AGENTS.md` (it scans platform output roots, listed at build.ts lines 1252–1261 — `AGENTS.md` is root-level and not in those roots, so it should NOT be scanned; confirm), no change is needed. AGENTS.md is not under `.prism/` and is not in `templates/install/` (confirmed: no seed AGENTS.md exists), so `checkSeedDrift` does not touch it — no seed-curation edit required. This task is a verification gate, not an edit: confirm `pnpm prism:check` is green end-to-end with zero new guard violations. If any guard does flag AGENTS.md, stop and route back to Winston — do not add allowlist entries without confirming the guard's intent. Verification: `cd /Users/hunter/Documents/PRISM/PRISM && pnpm prism:check`. Sequence: last; gates PR readiness.

### Winston (architecture — pre-implementation) — COMPLETE 2026-06-15

1. ✅ Read build pipeline (`build.ts`, `rule-dialect.ts`) and confirmed AGENTS.md sits outside the `copyContentToPlatformDir` `.prism/<area>` pipeline — the inlining is a new dedicated build step, not a copied area.
2. ✅ Insertion point chosen: a new generated block placed immediately after the `## Behavioral norms` table (AGENTS.md line ~80). The block SUPPLEMENTS the table — the table stays as the human-scannable index whose `§N` cross-references other docs depend on; the block adds machine-inlined full bodies for Codex.
3. ✅ All three OPEN decisions resolved below (frontmatter discriminator; Tier-1-only; codexRuleDialect strips stray `paths:`).
4. ✅ Clove tasks 2–8 written at the detail bar.

### Briar (self-review — post-implementation)

1. Confirm the generated block in `AGENTS.md` contains all Tier-1 rule bodies (manifest-listed rules without `paths:` frontmatter).
2. Confirm `pnpm prism:check` exits non-zero when the generated block is manually drifted (spot-test one rule body edit).
3. Confirm Tier-2 rules (with `paths:` frontmatter) are excluded from the generated block.
4. Confirm build passes: `pnpm prism:build && pnpm prism:check`.

---

## Decisions

- **Cursor dialect is a per-platform translation in the content-copy step, not a canonical-source change.** A `RuleDialect` (`scripts/ai-skills/rule-dialect.ts`) carries three operations — `transformContent`, `mapTargetRelativePath`, `mapSourceRelativePath` — threaded through `copyContentToPlatformDir`, `syncPlatformContentCopy`, and `removeDeletedManagedContent`. Claude and Codex use the identity (`verbatimRuleDialect`); Cursor uses `cursorRuleDialect`.
  - **Root cause:** the build copied rule content verbatim, so Cursor received `.md` files carrying `paths:`, which its `.mdc`/`globs:`/`alwaysApply:` loader doesn't read — the tiers were inert on Cursor (lessons.md 2026-06-04).
  - **Alternatives considered:** (a) change canonical rules to the Cursor dialect — rejected, ADR-0035 fixes the canonical as Claude-dialect and Claude/Codex read it directly; (b) a one-off rename pass after copy — rejected, the cleanup/drift machinery needs the rename to be reversible, so the mapping belongs in one place.
  - **Chosen approach:** a dialect object passed per-platform. Beats (b) because `removeDeletedManagedContent` can reverse-map `.mdc` → `.md` to decide orphan-hood, and the orphan test additionally re-maps the source forward to catch stale pre-dialect `.md` copies.
  - **Implementation guidance:** the transform applies only to the `rules` area; every other copied area and every other platform passes through unchanged. The area marker (`.ai-skill-generated`) is never renamed.
  - → promoted to .prism/architect/install-layout.md (Cursor-dialect divergence documented in the concrete example) and the paired dev doc `docs/content/dev/architecture/rule-loading-tiers.md`

- **Stale `.cursor/rules/*.md` copies are cleaned by a forward-map check in the orphan pass.** A target is live only when its canonical source exists AND that source maps forward to the exact target name. A pre-dialect `.cursor/rules/foo.md` fails the forward check (source `foo.md` now maps to `foo.mdc`) and is removed.
  - → no promotion needed (build-internal cleanup mechanics; self-evident from `removeDeletedManagedContent`)

- **RESOLVED (2026-06-15, Winston). Tier-1 set is identified by absence of `paths:` frontmatter, NOT by manifest membership.** The default path (manifest-membership AND-test) is rejected — the manifest is broken as a tier registry in both directions, and using it couples tier-detection to an unrelated routing table.
  - **Root cause of the rejection:** `lazy-artifacts.md` carries no `paths:` frontmatter and is genuine Tier 1 (it appears in ADR-0035's own Tier-1 example list, line 26), yet it is NOT individually listed in `manifest.json` — only the blanket `.prism/**` entry covers it. The proposed `manifest AND no-paths` AND-test would wrongly drop a real Tier-1 rule from the Codex block. In the other direction, `worktree-isolation.md` is listed in the manifest but no longer exists on disk (stale entry). The manifest is an architect-context routing table, not a tier registry.
  - **Tier-3 conflation is empty in practice:** ADR-0035 says Tier 3 = "no manifest entry, referenced from one skill." Verified: all 20 `.prism/rules/*.md` files without `paths:` frontmatter are universal-class — each is either in AGENTS.md's `## Behavioral norms` table or in ADR-0035's explicit Tier-1 list. PRISM has zero Tier-3 rules under `.prism/rules/` today. The frontmatter test is correct for the current rule set.
  - **Chosen approach:** Tier-1 set = every `.prism/rules/*.md` whose frontmatter has no `paths:` key. Future-proofing: a small explicit exclusion constant (`CODEX_INLINE_EXCLUDE`, empty today) lets a future Tier-3 rule opt out without reintroducing the manifest dependency. Beats the AND-test because it is faithful to ADR-0035's stated discriminator and does not inherit manifest staleness.
  - **Implementation guidance:** reuse `splitFrontmatter` from `rule-dialect.ts` to detect the `paths:` key; iterate `.prism/rules/*.md` in alphabetical order (matches `listRelativeDirectoryEntries` sort) for deterministic block output.
  - → promotes to ADR-0035 reference (already names the frontmatter discriminator); no new architect doc needed — confirmed in this plan's Decisions and the dev doc `docs/content/dev/architecture/rule-loading-tiers.md`.

- **RESOLVED (2026-06-15, Winston). Inline Tier-1 only; Tier-2 rules are NOT inlined and NOT given nested `AGENTS.md` files.** Codex gets a Tier-1-only always-on set, by deliberate acceptance.
  - **Root cause of the rejection of nested AGENTS.md:** PRISM's Tier-2 rules gate on file *globs* (`accessibility.md` → `**/*.tsx`, `**/*.jsx`, ...), not directories. Codex's nested-`AGENTS.md` mechanism keys on cwd/directory, not glob match. A glob like `**/*.tsx` cannot be expressed as a directory-rooted `AGENTS.md` without either massive duplication across every directory containing a `.tsx` file or false matches in directories that mix file types. The primitive does not fit the gating model.
  - **Alternatives considered:** (a) nested AGENTS.md by cwd — rejected, glob-vs-directory mismatch above; (b) inline Tier-2 unconditionally into AGENTS.md — rejected, defeats ADR-0035's whole point (Tier-2 exists precisely so file-type-specific rules don't load on every session).
  - **Chosen approach:** inline Tier-1 only. The 7 Tier-2 rules remain citable at `.codex/rules/<file>.md` (skills reference them by path when their work touches the gated file types). Codex lacks the path-tiering primitive, so Tier-1-only is the faithful ceiling.
  - **Implementation guidance:** the generated block contains exactly the Tier-1 set from Decision 1. No Tier-2 body appears in AGENTS.md.
  - → no promotion needed (Codex-platform constraint, documented here and in the dev doc).

- **RESOLVED (2026-06-15, Winston). Keep emitting `.codex/rules/`, but strip the stray `paths:` key via a new `codexRuleDialect` — do NOT stop emitting.** The 7 stray-key files become clean Codex-dialect copies; the directory stays as the citable Tier-2 home.
  - **Root cause:** 7 `.codex/rules/*.md` files (the exact Tier-2 set: acceptance-criteria, accessibility, architect-doc-verification, design-governance, implementation-task-detail, skill-authoring, verification-commands) carry a `paths:` YAML key Codex never reads. The key misrepresents the file as path-tiered when Codex cannot tier.
  - **Alternatives considered:** (a) stop emitting `.codex/rules/` entirely once bodies are inlined — rejected, the directory is the citable home for Tier-2 rules in Codex (Decision 2); deleting it breaks path citations and the Tier-2 fallback. (b) leave the stray key inert — rejected, it is dead frontmatter that lies about the file's loading behavior; the Cursor lane already set the precedent that a wrong-dialect key gets translated, not tolerated.
  - **Chosen approach:** add `codexRuleDialect` to `rule-dialect.ts` — a content transform that strips the `paths:` frontmatter block from the `rules` area (leaving Tier-1 rules, which have no frontmatter, untouched) and an identity path map (no `.md`→`.mdc` rename; Codex reads `.md`). Wire it as the Codex platform's dialect in `build.ts` (replacing `verbatimRuleDialect` for the `.codex` entry). Beats leaving-inert because it is the exact single-source analogue of the Cursor fix and removes the lie in one place.
  - **Implementation guidance:** `transformContent("rules", content)` strips the leading `---\n...paths:...\n---\n` block when present, returns body-only; non-rule areas and Tier-1 rules (no frontmatter) pass through unchanged. `mapTargetRelativePath`/`mapSourceRelativePath` are identity (Codex keeps `.md`). The 7 stray-key files will be rewritten on next build; the orphan pass needs no special handling since names don't change.
  - → no promotion needed (build-internal dialect mechanics; mirrors the documented Cursor-dialect decision above).

---

## History

- 2026-06-11 [hmcgrew/issue-73-cross-runtime-tiers]: Shipped task 1 (Cursor dialect emission). Added `scripts/ai-skills/rule-dialect.ts` + tests; threaded `RuleDialect` through the content-copy functions; updated `literal-allowlist.json` cursor entries to `.mdc`; synced `install-layout.md` and `rule-loading-tiers.md` byte-identical claims. Tasks 2–3 (Codex AGENTS.md inlining + its check) deferred — blocked on a Tier 1 source-of-truth; see the OPEN Decision.

- 2026-06-13 [hmcgrew/issue-73-cross-runtime-tiers]: Merged origin/main; resolved AGENTS.md routing-table conflict (took main's version with Sol row) and worktree-isolation rename/delete (honored main's delete, stale .mdc dropped out). Ran prism:build — 14 new Tier 1 .mdc rule copies emitted; prism:check green 158/158.
- 2026-06-15 [hmcgrew/issue-73-codex-tier-inlining]: Nora re-opened implementation lane on new branch. Spike findings recorded: Cursor confirmed done, Codex gap confirmed, #64 unblocked. Three OPEN decisions posted for Winston to resolve before Clove starts tasks 2–3.
- 2026-06-15 [hmcgrew/issue-73-codex-tier-inlining]: Winston resolved all three OPEN decisions and wrote Clove tasks 2–8 at the detail bar. Tier-1 discriminator is frontmatter-absence (NOT manifest membership — manifest is stale in both directions; see Decisions); Tier-1-only for Codex (nested AGENTS.md doesn't fit glob-gated Tier-2); new `codexRuleDialect` strips stray `paths:` from the 7 `.codex/rules/` Tier-2 copies. AGENTS.md inlining is a new dedicated build step outside the copied-area pipeline. Lane is AFK-ready for Clove.
- 2026-06-15 [hmcgrew/issue-73-codex-tier-inlining]: Clove implemented tasks 2–8. Added `codexRuleDialect` (strips `paths:` from `.codex/rules/` Tier-2 copies), `agents-md-block.ts` (Tier-1 body collection + block render/replace), wired both into `build.ts`. `pnpm prism:build` updated 8 files (7 `.codex/rules/` + `AGENTS.md`); `pnpm prism:check` green 0 failures; drift-detection spot-test confirmed non-zero exit on manual edit.
- 2026-06-15 [hmcgrew/issue-73-codex-tier-inlining]: Briar self-review. 3 minor issues found: insertion-point test assertion trivially true (test doesn't catch wrong placement), AC wording used rejected "manifest-listed" discriminator (corrected), `rule-loading-tiers.md` dev doc now diverged ("byte-identical" claim no longer true; Codex inlining not mentioned). All behavioral ACs pass on spot-test; build and check green; Cursor dialect untouched.
- 2026-06-15 [hmcgrew/issue-73-codex-tier-inlining]: Fixed trivially-true insertion-point assertion in `agents-md-block.test.ts`. Anchored `standaloneSepPos` via `indexOf("\n---\n", tableRowPos)` so the `| --- |` table-header divider cannot match; asserts `blockPos < standaloneSepPos` so a wrong-location insertion now fails the test.
- 2026-06-15 [hmcgrew/issue-73-codex-tier-inlining]: Eli updated `docs/content/dev/architecture/rule-loading-tiers.md` to correct the byte-identical claim (Claude verbatim; Codex strips stray `paths:`; Cursor full dialect) and document the Codex Tier-1 AGENTS.md inlining behavior and Tier-1-only limitation. `pnpm prism:check` green.
- 2026-06-15 [hmcgrew/issue-73-codex-tier-inlining]: Draft PR #153 opened — https://github.com/HunterMcGrew/PRISM/pull/153.
- 2026-06-15 [hmcgrew/issue-73-codex-tier-inlining]: Fixed Eric Major: threaded `tokenMap` through `syncAgentsMdTier1Block` → `collectTier1RuleBodies`; apply `substituteTokens` to each rule body. Added regression test asserting no `${` survives. `pnpm prism:build` updated `AGENTS.md` (0 placeholders in block); `pnpm prism:check` green; 175/175 tests pass.

---

## Acceptance Criteria

### Behavioral

- [ ] Given a Codex session starts, When `AGENTS.md` is loaded, Then every Tier-1 rule body (rules in `.prism/rules/` with no `paths:` frontmatter) is present in the generated block — inlined, not just linked. (REQ-1)
- [ ] Given `pnpm prism:build` runs, When a Tier-1 rule body in `.prism/rules/` changes, Then `AGENTS.md`'s generated block reflects the updated body. (REQ-1)
- [ ] Given `pnpm prism:check` runs against a manually drifted `AGENTS.md`, When the generated block does not match the current Tier-1 rule bodies, Then the check exits non-zero with a meaningful error. (REQ-1)
- [ ] Given a Tier-2 rule (with `paths:` frontmatter), When `pnpm prism:build` runs, Then that rule body is NOT inlined into the `AGENTS.md` generated block. (REQ-1)
- [ ] Given `pnpm prism:build` runs, When the Codex rule copies are emitted, Then no `.codex/rules/*.md` file retains a `paths:` frontmatter key. (REQ-5)

### Non-behavioral

- [ ] The generated block in `AGENTS.md` is delimited by build-managed begin/end markers so contributors know not to hand-edit it. (REQ-2)
- [ ] The `## Behavioral norms` pointer table in `AGENTS.md` is preserved — the generated block supplements it, does not replace it. (REQ-2)
- [ ] `pnpm prism:build` and `pnpm prism:check` remain green for the full suite after changes land. (REQ-3)
- [ ] All three OPEN decisions are resolved with verdicts recorded in `## Decisions` before Winston hands off to Clove. (REQ-4)

### AC Adjustments

### AC Sync Log

| Date | Agent | Action | Plan | Linear |
| ---- | ----- | ------ | ---- | ------ |
| 2026-06-15 | Nora | Initial AC generated from spike findings | created | N/A (GitHub-tracked) |
| 2026-06-15 | Winston | Added REQ-5 (no stray `paths:` in `.codex/rules/`) + table-preservation AC after resolving Decision 3 | updated | N/A (GitHub-tracked) |
| 2026-06-15 | Briar | Corrected first behavioral AC item — replaced "manifest-listed" wording with frontmatter-only discriminator to match Decision 1 | updated | N/A (GitHub-tracked) |

---

## Review Issues

### Token substitution missing from Tier-1 inlining path

- **Severity:** `major`
- **Status:** `fixed`
- **Fixed in:** `scripts/ai-skills/agents-md-block.ts`, `scripts/ai-skills/build.ts`, `scripts/ai-skills/agents-md-block.test.ts`
- **File:** `scripts/ai-skills/build.ts:737` (`syncAgentsMdTier1Block`)
- **Problem:** `syncAgentsMdTier1Block` called `collectTier1RuleBodies` and `renderTier1Block` without applying `substituteTokens`, so the generated AGENTS.md block contained 11 literal `${TICKET_PREFIX}` / `${TICKET_PREFIX_LOWERCASE}` placeholders instead of the configured values (e.g. `PRISM`). Every sibling rule-copy path applies substitution via `copyContentFileWithSubstitution`; this path did not.
- **Suggested fix:** Thread `tokenMap` through `syncAgentsMdTier1Block` to `collectTier1RuleBodies`; apply `substituteTokens(body, tokenMap)` to each rule body before collecting. Add a regression test asserting no `${` survives in the output. (Eric PR #153 Major.)

### Insertion-point test assertion is trivially true

- **Severity:** `minor`
- **Status:** `fixed`
- **Fixed in:** `scripts/ai-skills/agents-md-block.test.ts:128-129`
- **File:** `scripts/ai-skills/agents-md-block.test.ts:128-129`
- **Problem:** The insertion-point assertion `blockPos > separatorPos || result.indexOf("---", blockPos) > blockPos` resolves `separatorPos` via `result.indexOf("---")`, which finds the `---` inside the `| --- | --- | --- |` table header row rather than the standalone `---` separator after the table. Both clauses are trivially true for any insertion location after the table; the test passes even if the block is appended to the end of the file instead of inserted in the correct position.
- **Suggested fix:** Replace the assertion with two explicit checks: `assert.ok(blockPos > tableRowPos, "block should appear after the table row")` and `assert.ok(blockPos < standaloneSepPos, "block should appear before the --- separator after the table")`, where `standaloneSepPos` is found via a search for `\n---\n` (the standalone separator form) after `tableRowPos`.

### AC first behavioral item uses "manifest-listed" wording that contradicts Decision 1

- **Severity:** `minor`
- **Status:** `open`
- **File:** `.prism/plans/issue-73.md:110`
- **Problem:** The first behavioral AC item says "every Tier-1 rule body (manifest-listed rules without `paths:` frontmatter)" — but Decision 1 explicitly rejected manifest membership as a discriminator. `lazy-artifacts.md` is correctly included by the implementation (frontmatter-only test) yet is NOT individually manifest-listed, so the AC wording misrepresents the actual discriminator.
- **Suggested fix:** Change to "every Tier-1 rule body (rules in `.prism/rules/` with no `paths:` frontmatter)" to match Decision 1 and the implementation.

### `rule-loading-tiers.md` dev doc is diverged after the Codex changes

- **Severity:** `minor`
- **Status:** `fixed`
- **Fixed in:** `docs/content/dev/architecture/rule-loading-tiers.md`
- **File:** `docs/content/dev/architecture/rule-loading-tiers.md:47`
- **Problem:** Line 47 stated "Claude and Codex receive byte-identical copies" — which was true before this branch but is no longer true. Codex copies now have the `paths:` frontmatter stripped via `codexRuleDialect`. The doc also made no mention of Tier-1 bodies being inlined into `AGENTS.md` for Codex, which is the primary behavioral change this PR ships.
- **Suggested fix:** Updated the per-platform emission paragraph to: correct the byte-identical claim (Claude verbatim; Codex has `paths:` stripped; Cursor gets the full dialect translation); document the Codex AGENTS.md Tier-1 inlining behavior and why it exists; document the Tier-1-only limitation and why Tier-2 rules are excluded.

---

## Cleanup Items

(none)

---

## PR Readiness (Codex inlining — tasks 2–8)

- [ ] No critical or major issues — **1 major fixed (token substitution); 2 minors fixed; 1 minor open (AC wording — cosmetic)**
- [x] Types correct — no `any`, no unsafe `as`
- [x] No stray console.logs or debug artifacts
- [x] Tests written for new logic and edge cases (`rule-dialect.test.ts` + `agents-md-block.test.ts`)
- [x] All OPEN decisions resolved (Winston gate — all three resolved 2026-06-15)
- [x] Build passes — last run: 2026-06-15 (`pnpm prism:build` updated 8 files; `pnpm prism:check` green; drift-detection spot-test passed by Briar 2026-06-15)
- [x] PR description up to date — PR #153 opened as draft 2026-06-15
- [ ] Lasting decisions promoted to architect context — `rule-loading-tiers.md` diverged; Eli update needed before close

**Last updated:** 2026-06-15

---

### PR Readiness — Task 1 (Cursor dialect — shipped PR #XX)

- [x] No critical or major issues
- [x] Types correct — no `any`, no unsafe `as`
- [x] No stray console.logs or debug artifacts
- [x] Tests written for new logic and edge cases
- [x] Build passes — last run: 2026-06-11
- [x] PR description up to date
- [x] Lasting decisions promoted to architect context (if applicable)

**Last updated:** 2026-06-11
