# Plan: followup-163-crossref-lint

## Ticket

https://github.com/HunterMcGrew/PRISM/issues/163 (Part of #154)

> Commits use the `#163:` prefix — PRISM-internal work tracks on GitHub issues, not Linear.

---

## Goal

Add a prose cross-reference lint to `pnpm prism:check` that fails when any content carrier references a repo-relative path that does not resolve on disk — the general guard PR #156's three-pass sweep miss showed the existing checks don't provide.

---

## Design

### Where it hooks in

A new standalone script `scripts/ai-skills/crossref-lint.ts`, wired into the `prism:check` chain in `package.json` as a fourth step, mirroring `verify-manifest-coverage.ts`.

**Why standalone, not folded into `build.ts --check`:** `build.ts` owns the canonical→platform generation pipeline; its `--check` mode guards *generated-output drift* (path-guard, literal-guard, seed-drift). The cross-ref lint guards a different invariant — *prose reference resolvability* — and runs against source content roots only, never the generated mirrors. The repo already establishes "one standalone script per independent invariant, composed into `prism:check`" as the pattern: `verify-manifest-coverage.ts` is exactly this shape (own file, own `main()`, own `package.json` step, exit 1 on failure). Following it keeps `build.ts` focused and makes the lint independently runnable and testable. Folding into `build.ts` would couple an unrelated concern into the generation path and force the lint to share the build's check-mode/changedPaths plumbing it doesn't need.

### What it scans (search roots, not a file list)

Two **source** content roots, each walked recursively:

- `.prism/` (canonical)
- `templates/install/.prism/` (seed twin)

Plus two loose seed-twin files at the `templates/install/` root level:

- `templates/install/AGENTS.md.tmpl`
- `templates/install/.claude/CLAUDE.md.tmpl`

And the repo-root loose files that carry cross-refs:

- `AGENTS.md`
- `.prism/SPEC.md` (already inside the `.prism/` walk)

**Carrier extensions (walked):** `.md`, `.tmpl`, `.mdc` — prose carriers only. `.json` and `.toml` are **excluded from the file walk** in v1 (see Decisions — JSON/TOML structural path-checking is deferred to a follow-up). The `CARRIER_EXTENSIONS` constant retains all five values because it doubles as the inline-code path-shape test set; `PROSE_SCAN_EXTENSIONS` is the subset actually walked.

**Excluded subtrees (by search root, not by line-prefix grep):**

- `.prism/plans/` — historical plan files carry stale relative refs by design (pre-`_toolkit/`-move paths, refs to deleted scaffolding). Plans are append-only working records, not durable cross-ref surfaces. Already excluded from path-guard's copied areas for the analogous reason.
- `.prism/lessons.md` — frozen incident citations reference paths as evidence, including paths that have since moved.
- `.prism/audits/`, `.prism/retros/`, `.prism/prds/`, `.prism/design/` — agent-generated working artifacts, not cross-ref-guaranteed surfaces.
- Any generated platform mirror (`.claude/`, `.codex/`, `.cursor/`, `.agents/`) — these are build outputs; their refs are guarded by being byte-copies of guarded canonical sources.

The scan is **allowlist-of-roots** (`.prism/{rules,architect,spec,references,templates}` + `.prism/SPEC.md` + the seed twin's mirror of those + the loose `AGENTS.md`/`CLAUDE.md.tmpl` files), NOT "all of `.prism/` minus excludes" — choosing roots is the lesson's prescribed exclusion mechanism (exclude by search root / precise pattern, never by `grep -v` on `grep -rn` line prefixes).

### How it extracts path references

A "repo path reference" is one of these two precisely-defined shapes, extracted per content line (outside fenced code blocks — see exclusions):

1. **Markdown inline links** — `[text](target)`. Extract `target`. Regex anchor: `\[[^\]]*\]\(([^)]+)\)`.
2. **Inline-code repo paths** — a backtick span ``` `...` ``` whose content, after token-stripping, matches a repo-path shape: contains a `/` and starts with a verifiable repo-root segment (see § How it resolves them). Regex anchor: `` `([^`]+)` `` then shape-test the capture.

A capture qualifies as a **repo path reference** only if it is repo-root-absolute — see the resolution model below. Bare prose words, prose containing slashes that aren't paths (`server/client`, `and/or`), non-path code spans, and relative links are not resolved.

> **JSON/TOML carriers are out of scope for v1.** See the Decisions section — applying markdown-link and inline-code regexes to structured data produces high false-positive rates, and structural path-checking needs a dedicated parser. Deferred to a follow-up.

### How it resolves them — repo-root-absolute refs only

**The resolution model is the load-bearing decision of this re-plan.** The v1 lint resolved *every* ref — including relative links — against the on-disk tree the referencing file sits in. That over-flagged 354 refs on the live tree, and Sol verified the bulk are false positives. The root cause, confirmed by direct measurement (see Decisions): **canonical `.prism/` content authors relative links to resolve in the *consumer's installed tree*, not in the PRISM monorepo's partial `.prism/` tree.** Three independent proofs of this:

- Cross-tree skill links like `[x](../skills/prism-architect/SKILL.md)` from `.prism/rules/` resolve only in the generated `.claude/` mirror (where `rules/` and `skills/` are flat siblings). `.prism/skills/prism-architect/SKILL.md` does not exist — only 5 skills carry any `.prism/skills/<name>/` content.
- The install seed (`templates/install/.prism/`) ships **no** `.claude/` twin, so its `../skills/` links resolve in no in-repo surface at all — only after the consumer runs the build.
- `_toolkit/`-nested docs (`.prism/architect/_toolkit/`, `.prism/spec/adrs/_toolkit/`) use `../`-math authored as if the `_toolkit/` segment weren't there; the build copies `_toolkit/` **verbatim**, so these over-climb in `.prism/` **and** `.claude/` identically. Resolving against the mirror location made it *worse* (465 violations, measured).

There is no single in-repo surface where all correctly-authored relative links resolve. So the lint resolves **only the one ref class with an unambiguous, monorepo-verifiable target: repo-root-absolute refs.**

For each extracted `target`:

1. **Strip the anchor fragment and query string** — split on `#` then `?`, keep the path part. A pure-anchor ref (`#section`, empty path part) is skipped.
2. **Repo-root-absolute gate.** Resolve the ref **only if** `target` (after stripping) starts with one of the verifiable repo-root prefixes: `.prism/`, `scripts/`, `.ai-skills/`, `templates/`. **Every other ref is skipped** — relative links (`./`, `../`, bare `foo/bar.md`) and refs into surfaces the monorepo doesn't materialize (`.claude/`, `.codex/`, `.cursor/`, `.github/`, `docs/`) are not resolved. This is the inversion of the v1 model: v1 resolved everything and excluded edge cases; the corrected model resolves nothing *except* the verifiable repo-root-absolute class.
3. **Resolve against repo root.** `path.resolve(repoRoot, target)`. A repo-root-absolute ref has exactly one resolution regardless of the referencing file's location, so seed-twin and canonical files resolve identically — no per-root self-containment needed.
4. **Existence check** — `pathExists(resolved)`. A ref whose resolved path does not exist is a **violation**, unless excluded (below). A `.tmpl` twin fallback applies: if `foo.md` doesn't exist but `foo.md.tmpl` does, treat as resolved.

**Why this still catches the PR #156 class:** the moved-`_toolkit/` failure that shipped green three times was a *repo-root-absolute* `.prism/...` ref to a file that moved. Repo-root-absolute refs into `.prism/` are exactly what this model verifies — the gate fixture (a stale `.prism/architect/skills-ecosystem.md` ref when only `.prism/architect/_toolkit/skills-ecosystem.md` exists) still fails as required. What the model gives up is relative-link verification — an acceptable trade, because relative links in canonical are authored for a surface the monorepo can't validate anyway.

**Lazy-artifact and historical-surface exclusions (by target pattern, never by `grep -v`):** these repo-root-absolute targets are intentionally-absent paths referenced as concepts, not live files, and must be skipped before the existence check:

- `**/*-state.json` and `**/*-state.json.tmp` under `.prism/` — persona state files created on first write (per `.prism/rules/lazy-artifacts.md`): `theo-state.json`, `sasha-state.json`, `ren-state.json`, `parker-state.json`, `iris-state.json`, `architect-walker-state.json`, etc. The exclusion is the pattern `/^\.prism\/[a-z-]+-state\.json(\.tmp)?$/`, not an enumerated list — new personas add state files.
- `.ai-skills/registry/**` — `onboarding-state.json` and siblings, created on first write.
- `templates/install/.prism/lessons-archive.md` and `.prism/archived/lessons-archive.md` — lazy archive files.
- `.prism/plans/**` — historical plan citations from ADRs (e.g. `.prism/plans/4.7-skill-audit-strategy.md`) reference plans that legitimately may not exist; `plans/` is already a scan-exclusion surface, and refs *into* it from ADRs are evidence citations, not live links.

**Excluded from resolution (never violations):**

- **Anchors / intra-doc** — `#section` and empty-path-part refs (step 1).
- **External URLs** — `target` matching `^(https?|mailto|tel|ftp)://` or `^mailto:` or `^//`. Skip before resolution.
- **Token literals** — any `target` containing a `${...}` substitution token. After token-stripping, if the path still contains `$`, it's a templated path that can't be statically resolved — skip. (`${PROJECT_LOWERCASE}.pauseBeforeCommit` and similar.)

### False-positive exclusions (precise pattern / content, never line-prefix grep)

1. **Fenced code blocks** — track ```` ``` ```` fence state line-by-line (same `inFence` toggle as `path-guard.ts scanLines`). Refs inside fences are frozen examples (e.g. `install-layout.md`'s platform-path example block) and are skipped. This is the primary "frozen example block" exclusion.
2. **Indented code blocks** — lines indented 4+ spaces following a blank line are skipped (markdown code-block convention; conservative — only when clearly a code block, not a nested list).
3. **Historical / working surfaces** — excluded by search root (`plans/`, `lessons.md`, `audits/`, etc. — see § What it scans). This is the "historical plan files" exclusion, done by root choice not path-substring filtering.
4. **Token literals** — `${...}`-bearing targets skipped (see § How it resolves).
5. **External URLs and anchors** — skipped (see § How it resolves).
6. **Example-only / illustrative paths** — a small **file+ref allowlist** (`CROSSREF_FILE_ALLOWLIST`, a `Set` of exact `relativePath::ref` pairs, each with a source comment). Matched by exact `(file, ref)` pair — never by a path-substring `grep -v`. Under the corrected repo-root-absolute model, the allowlist carries the handful of repo-root-absolute refs that point at **generated-per-team or intentionally-absent** files the monorepo doesn't ship but legitimately names:
   - `.prism/rules/security.md`, `.prism/rules/react-guidelines.md`, `.prism/rules/manifest.json` — Atlas generates these per-consumer-stack (documented in `rule-generation.md` as generated output); PRISM itself doesn't carry them. They are illustrative references in `rule-generation.md`.
   - `scripts/ai-skills/install-cursor.ts` in ADR-0044 — the ADR *narrates* that this script intentionally doesn't exist in PRISM ("PRISM was extracted before that script was added"). A prose mention of an absent file, not a live link.

   These get allowlist entries (with the explaining comment) rather than being fixed, because the referenced absence is correct. Genuine stale refs (below) are fixed, not allowlisted.

**The lesson's false-clean trap is structurally avoided:** the lint never shells out to `grep -rn ... | grep -v`. It reads files, tracks fence state in code, resolves each ref against the filesystem, and excludes by search-root choice + precise `(file, ref)` allowlist matching. There is no line-prefix string to accidentally filter on.

### The gate (PR #156-class catch)

The lint must catch a moved-`_toolkit/` path that no longer resolves — the exact class that shipped green three times in PR #156. Because the corrected model resolves **only repo-root-absolute refs**, the fixture uses a repo-root-absolute form: a doc with a backtick ref `` `.prism/architect/skills-ecosystem.md` `` (the pre-move path) when only `.prism/architect/_toolkit/skills-ecosystem.md` exists must produce one violation; the corrected `` `.prism/architect/_toolkit/skills-ecosystem.md` `` ref must pass clean. This is the real shape of the PR #156 failure — the moved file was referenced by its repo-root-absolute `.prism/...` path, which is exactly what this model verifies.

---

## Implementation Tasks

> **Re-plan note (2026-06-15):** The shipped lint (`scripts/ai-skills/crossref-lint.ts`, commit `a1aa94d`, draft PR #175) has sound infra — 36/36 tests green, gate fixture catches a moved-`_toolkit/` ref — but its **resolution model over-flags 354 refs** on the live tree, almost all false positives. These tasks describe the **changes to the shipped file**, not a from-scratch build. The infra (file walk, fence tracking, `extractRefs`, `isExternalOrToken`, test harness) is kept; the resolution model is replaced. Tasks are sequenced: 1 (resolution model) → 2 (tests) → 3 (true-positive fixes) → 4 (allowlist) → 5 (verify). Wiring into `prism:check` already shipped — no change.

### Clove (implementation)

1. **Replace the resolution model in `scripts/ai-skills/crossref-lint.ts` with repo-root-absolute-only resolution.** The shipped file resolves every ref against the referencing file's directory; the corrected model resolves **only repo-root-absolute refs** (see § How it resolves them). Concretely:

   - **Add a `VERIFIABLE_ROOT_PREFIXES` constant** above the helpers, after `REPO_ROOT_SEGMENTS`:
     ```ts
     /**
      * Repo-root-absolute prefixes the monorepo materializes and can verify. A ref
      * is resolved only when it starts with one of these — relative links and refs
      * into generated/published surfaces (.claude/, .codex/, .cursor/, .github/,
      * docs/) are authored to resolve in the consumer's installed tree, not in this
      * partial canonical tree, so the monorepo can't validate them. See the plan's
      * resolution-model decision.
      */
     const VERIFIABLE_ROOT_PREFIXES = [".prism/", "scripts/", ".ai-skills/", "templates/"] as const;
     ```
     Note `.claude/` is intentionally **removed** from the resolved set (it was in `REPO_ROOT_SEGMENTS`). `REPO_ROOT_SEGMENTS` stays as-is for `extractRefs`'s shape-test; the new constant gates *resolution*.

   - **Add a `LAZY_OR_HISTORICAL_TARGET` predicate** (exported, for tests):
     ```ts
     /**
      * Repo-root-absolute targets that are intentionally absent — persona state
      * files created on first write (.prism/rules/lazy-artifacts.md), the onboarding
      * registry, lazy archive files, and historical plan citations. Skipped before
      * the existence check.
      */
     export function isLazyOrHistoricalTarget(cleaned: string): boolean {
       if (/^\.prism\/[a-z-]+-state\.json(\.tmp)?$/.test(cleaned)) return true;
       if (cleaned.startsWith(".ai-skills/registry/")) return true;
       if (/(^|\/)lessons-archive\.md$/.test(cleaned)) return true;
       if (cleaned.startsWith(".prism/plans/")) return true;
       return false;
     }
     ```

   - **Rewrite `scanLines`'s resolution branch.** After `isExternalOrToken` filtering and pure-anchor skip, replace the unconditional `resolveRef(...)` + push with:
     ```ts
     const cleaned = rawRef.split("#")[0].split("?")[0];
     if (!cleaned) continue;
     if (!VERIFIABLE_ROOT_PREFIXES.some((p) => cleaned.startsWith(p))) continue;
     if (isLazyOrHistoricalTarget(cleaned)) continue;
     const allowlistKey = `${relativePath}::${rawRef}`;
     if (allowlist.has(allowlistKey)) continue;
     const resolved = path.resolve(repoRootPath, cleaned);
     if (!(await refResolves(resolved))) {
       violations.push({ relativePath, line: index + 1, ref: rawRef, resolved });
     }
     ```
     `resolveRef` is no longer called from `scanLines` (repo-root-absolute resolution is a one-line `path.resolve`). Keep `resolveRef` exported — the test suite covers it — but it's now used only by tests, or delete it and drop its tests if Clove prefers a smaller surface. Document whichever choice in a one-line code comment.

   - **No change to:** `extractRefs`, `looksLikeRepoPath`, `isExternalOrToken`, `refResolves`, the file walker, `CROSSREF_SCAN_ROOTS`, `CARRIER_EXTENSIONS`, `PROSE_SCAN_EXTENSIONS`, `main()`, the `invokedDirectly` guard. The `.json`/`.toml` walk-exclusion already shipped correctly — keep it (see Decisions).

   **Verification:** `npx tsx scripts/ai-skills/crossref-lint.ts` against the live tree must report **only the genuine true positives** (Task 3's list) — after Task 3 fixes them and Task 4 allowlists the illustrative ones, it exits 0. Before Task 3/4, expect ~6-8 raw violations (the true-positive set, doubled across canonical + seed twin).

2. **Update `scripts/ai-skills/crossref-lint.test.ts` for the repo-root-absolute model.** The shipped suite tests relative-ref resolution that no longer happens. Required changes:

   - **Rewrite the gate fixture to repo-root-absolute form.** Replace the `../architect/skills-ecosystem.md` relative-ref cases with: a temp tree containing `.prism/architect/_toolkit/skills-ecosystem.md`, and a doc with a backtick ref `` `.prism/architect/skills-ecosystem.md` `` (pre-move). Assert `scanLines` (with `repoRootPath` = temp root) yields exactly one violation. Then assert the corrected `` `.prism/architect/_toolkit/skills-ecosystem.md` `` ref yields zero. Because resolution is now repo-root-absolute, the temp tree must mirror the real `.prism/...` layout under the temp root.
   - **Replace relative-link cases with skip-assertions.** Add cases asserting **zero violations** for: a relative link `[x](../skills/prism-architect/SKILL.md)` (not resolved — relative), a `.claude/` ref `[x](.claude/skills/foo/SKILL.md)` (not resolved — non-verifiable surface), a `docs/` ref, a `.github/` ref. These lock in the false-positive fix.
   - **Add lazy/historical exclusion cases.** Assert zero violations for `` `.prism/sasha-state.json` ``, `` `.prism/ren-state.json` ``, `` `.ai-skills/registry/onboarding-state.json` ``, `` `.prism/plans/old-plan.md` ``, and a direct `isLazyOrHistoricalTarget` unit test covering each branch (state-json, registry, lessons-archive, plans).
   - **Keep:** the fence-skip, external-URL-skip, anchor-skip, token-skip, non-path-slash-prose, and `.tmpl`-twin-fallback cases — these are model-independent and still valid. The `.tmpl` fallback case must use a repo-root-absolute target (e.g. `` `templates/install/.prism/SPEC.md` `` resolving via the `SPEC.md.tmpl` twin) since relative refs are no longer resolved.
   - **Allowlist case:** assert a `scanLines` call with a populated `allowlist` param containing `"somedoc.md::.prism/rules/security.md"` skips that exact pair.

   **Verification:** `npx tsx --test scripts/ai-skills/crossref-lint.test.ts` — all cases green.

3. **Fix the genuine stale refs (the PR #156-class true positives).** After the corrected model, these repo-root-absolute refs point at files that exist in no surface — fix each at its source. Each appears twice (canonical + `templates/install/` seed twin); fix both. **The seed twin is drift-checked by `prism:check`, so canonical and seed must stay byte-identical for non-excluded files** — edit both to the same corrected text.

   - **`scripts/office/validate.py`** in `.prism/references/changelog/doc-generation.md:23` (and seed twin) — `scripts/office/` is a Thrive-era path that didn't survive extraction. Determine the correct PRISM validation step or remove the stale reference. Confirm against the changelog skill's actual validation flow before editing; if no PRISM equivalent exists, rewrite the line to drop the dead path. **[HITL]** if the correct replacement isn't determinable from the changelog skill source — surface to Sol/Hunter rather than guess.
   - **`.prism/architect/plugin-management.md`** in `.prism/references/architect/plan-mode.md:38` and `:135` (and seed twin) — cited as the "paired dev doc" precedent, but the file doesn't exist in `.prism/architect/`. This is a Thrive-era precedent reference. Replace with an extant pairing precedent from `.prism/architect/` (verify one exists by listing `.prism/architect/*.md` that have a `docs/content/dev/architecture/` companion), or rewrite the sentence to describe the pairing rule without citing a missing example file. **[HITL]** if no extant paired-doc precedent exists in PRISM — the reference may need Sol/Hunter input on whether to create the precedent doc or drop the citation.
   - **`.prism/spec/adrs/README.md`** in `.prism/SPEC.md:142` (and `SPEC.md.tmpl` twin) — the markdown link's *display text* (backtick span) reads `.prism/spec/adrs/README.md` while the href correctly points at `./spec/adrs/_toolkit/README.md`. The href resolves; only the backtick display text is stale. Fix the display text to match the real path: change `` [`.prism/spec/adrs/README.md`] `` to `` [`.prism/spec/adrs/_toolkit/README.md`] ``. Low-risk text fix, no [HITL].

   **Verification:** after each fix, `npx tsx scripts/ai-skills/crossref-lint.ts` shows that ref's violation gone. `pnpm prism:build` (or the seed-drift portion of `prism:check`) confirms canonical and seed twin stayed in sync.

4. **Seed `CROSSREF_FILE_ALLOWLIST` with the generated-per-team and intentionally-absent illustrative refs.** These repo-root-absolute refs name files PRISM doesn't ship but legitimately references (see § False-positive exclusions item 6). Add exact `relativePath::ref` entries, each with a source comment. Both the canonical and `templates/install/` file paths need entries (the lint scans both):

   - `.prism/architect/_toolkit/rule-generation.md::.prism/rules/security.md` and `::.prism/rules/react-guidelines.md` — and the `0029-rules-self-declare-applicability.md::.prism/rules/manifest.json` ref. Comment: "Atlas generates these per consumer stack (see rule-generation.md); PRISM does not ship them — illustrative reference to generated output."
   - `.prism/architect/_toolkit/onboarding.md::.prism/rules/security.md` (same generated-rule case).
   - `.prism/spec/adrs/_toolkit/0044-direct-write-tool-outputs.md::scripts/ai-skills/install-cursor.ts` — comment: "ADR narrates this script's intentional absence in PRISM; prose mention, not a live link."
   - Mirror each with its `templates/install/.prism/...` path.

   Run `npx tsx scripts/ai-skills/crossref-lint.ts` and add an allowlist entry for **every** remaining false-positive repo-root-absolute illustrative ref it reports, until the only violations left are genuine (which Task 3 fixes). Do not allowlist genuine stale refs — those are fixed in Task 3.

   **Verification:** `npx tsx scripts/ai-skills/crossref-lint.ts` exits 0 against the live tree.

5. **Full-chain verification.** Run `pnpm prism:check` and confirm it passes end-to-end (build-check + test + verify-manifest + crossref-lint all green). Then prove the gate still fires: temporarily add a backtick ref `` `.prism/architect/does-not-exist.md` `` to one canonical doc, re-run `pnpm prism:check`, confirm it exits 1 with a `crossref-lint:` violation line naming that ref, then revert. Record the clean pass and the deliberate-break confirmation in `## History`.

   **Verification:** `pnpm prism:check` (clean) → exit 0; `pnpm prism:check` (with deliberate stale repo-root-absolute ref) → exit 1 naming the stale ref; revert → exit 0.

---

## Decisions

- **Standalone script wired into `prism:check`, not folded into `build.ts --check`.** Considered: adding a `runCrossRefLint` call inside `build.ts main()` alongside path-guard/literal-guard. Rejected: `build.ts` owns generated-output drift detection and shares check-mode/changedPaths plumbing the lint doesn't need; the lint guards source-prose resolvability, an orthogonal invariant. `verify-manifest-coverage.ts` already establishes the standalone-script-per-invariant pattern, and following it keeps `build.ts` focused and the lint independently runnable. → no promotion needed (implementation-structural choice specific to this lint; the standalone-script-per-invariant pattern is already codified by `verify-manifest-coverage.ts`'s existence).

- **REVERSED (2026-06-15 re-plan): Resolution model is repo-root-absolute-only, not resolve-everything-against-the-referencing-file's-directory.** The v1 "resolve every ref relative to its own directory" model over-flagged 354 refs on the live tree; Sol verified the bulk are false positives, and a re-plan investigation confirmed the root cause by direct measurement.
  - **Root cause:** canonical `.prism/` content authors relative links to resolve in the **consumer's installed tree** (where `.claude/{rules,skills,spec,architect}` are flat siblings and the seed is expanded), not in the PRISM monorepo's partial `.prism/` tree. Proven three ways: (1) `.prism/skills/<persona>/SKILL.md` doesn't exist for most skills — cross-tree skill links resolve only in `.claude/skills/`; (2) the install seed ships no `.claude/` twin, so its `../skills/` links resolve in no in-repo surface; (3) `_toolkit/`-nested docs use `../`-math authored as if `_toolkit/` weren't there, and the build copies `_toolkit/` verbatim, so those refs over-climb identically in `.prism/` and `.claude/`.
  - **Alternatives considered and measured:**
    - **(a) Lint the generated output trees (`.claude/` etc.) instead of canonical.** Rejected: the install seed has no `.claude/` twin (its refs would resolve nowhere); `docs/` published mirror doesn't exist in this repo at all; and `.claude/worktrees/` contains dozens of stale nested tree copies that would pollute the walk. No single generated surface is complete.
    - **(b) Keep linting canonical but resolve each `.prism/X/foo.md` ref against its `.claude/X/` mirror location.** Rejected — **measured worse: 465 violations vs 354.** The `.prism/<area>/` → `.claude/<area>/` mapping isn't uniform across the `_toolkit/` and `spec/adrs/` nestings, so re-basing to `.claude/` breaks more than it fixes.
    - **(c) Allowlist the canonical→generated adjacency.** Rejected: would require ~350 entries — that's a suppression list, not an allowlist, and it defeats the lint's purpose (every new cross-tree link would need a manual entry).
    - **(d) Scope to within-content-root relative refs only.** Rejected — still 245 violations, because `_toolkit/` over-climb refs stay *within* `.prism/` while landing at a wrong intra-tree path.
  - **Chosen: (e) repo-root-absolute refs only.** Resolve only refs starting with `.prism/`/`scripts/`/`.ai-skills/`/`templates/` against repo root — the one ref class with a single unambiguous, monorepo-verifiable target. Measured: 32 raw → ~6-8 after lazy/historical exclusions → ~4 unique genuine after dedup. It catches the PR #156 class (the moved file was referenced by its repo-root-absolute `.prism/...` path) while producing zero false positives on the legitimately cross-surface relative links. The trade — relative links go unverified — is acceptable: they're authored for a surface the monorepo can't validate anyway.
  - **Implementation guidance:** gate resolution on a `VERIFIABLE_ROOT_PREFIXES` check in `scanLines`; skip lazy-artifact and historical targets via `isLazyOrHistoricalTarget`; `.claude/` drops out of the *resolved* set but stays in `REPO_ROOT_SEGMENTS` for `extractRefs`'s shape-test. See Implementation Task 1.
  - → no promotion needed (lint-local resolution rule, documented in the module doc comment and this plan; not a cross-cutting architecture decision — though the underlying fact that "canonical links are authored for the consumer-installed tree" is a candidate for an architect-context note; see Architect Context Updates below).

- **JSON/TOML carriers are OUT OF SCOPE for v1 — deferred to a follow-up.** The original #163 spec named `.json` as a ref carrier (moved-ADR refs in config could go stale), and v1's design listed JSON/TOML string-value extraction as a third ref shape. Clove deviated during implementation by excluding `.json`/`.toml` from the file walk; this re-plan **ratifies that deviation as the correct v1 call.**
  - **Root cause of the deviation:** applying markdown-link and inline-code regexes to structured data (JSON/TOML) yields high false-positive rates — every string value with a slash looks like a path candidate, and structural path-checking (which keys hold real paths) needs a dedicated parser per format.
  - **Alternatives considered:** (1) in-scope for v1 with regex extraction — rejected, the false-positive rate defeats the lint; (2) in-scope with a real JSON/TOML parser and a per-file key-allowlist (which keys in `manifest.json`/`paths.json`/`seed-curation.json` hold paths) — rejected for v1 as disproportionate scope for a follow-up ticket; the prose carriers are where the PR #156 class actually lived.
  - **Chosen: dropped from the walk in v1, deferred.** `PROSE_SCAN_EXTENSIONS` (`.md`/`.tmpl`/`.mdc`) is what's walked; `CARRIER_EXTENSIONS` keeps all five values only as the inline-code shape-test set. A follow-up ticket can add structural JSON/TOML path-checking with a proper parser when the need is demonstrated.
  - → no promotion needed (scope decision for this ticket; the follow-up, if filed, carries its own design).

- **Exclude `plans/`, `lessons.md`, and agent-generated working surfaces by search-root choice, not by path-substring filtering.** Historical plans and frozen lesson citations legitimately reference moved/deleted paths as working records or evidence. The sweep-methodology lesson prescribes excluding by search root or precise pattern, never by `grep -v` on a `grep -rn` line prefix (which silently false-cleans). The lint honors this structurally: it never shells to grep; it chooses scan roots and excludes by precise `(file, ref)` allowlist matching. → no promotion needed (codifies an existing lesson's prescription in code; lesson already durable).

- **Walked extensions are `.md`/`.tmpl`/`.mdc` (`PROSE_SCAN_EXTENSIONS`); `CARRIER_EXTENSIONS` keeps all five as the shape-test set.** The prose carriers (`.md`/`.tmpl`/`.mdc`) are walked; `.json`/`.toml` are excluded from the walk per the JSON/TOML deferral decision above. `CARRIER_EXTENSIONS` retains `.json`/`.toml` only because it doubles as the inline-code path-shape test (`looksLikeRepoPath` recognizes a `.json` ref inside a markdown doc). Per writing-voice "count rules, not numbers," the walked set is "every prose carrier extension," not a fixed count. → no promotion needed (lint-local).

---

## History

- 2026-06-15 [main]: Plan created by Winston for issue #163 — prose cross-reference lint. Design locked: standalone `crossref-lint.ts` wired as a 4th `prism:check` step; scans `.md`/`.tmpl`/`.mdc`/`.json`/`.toml` across canonical + seed-twin roots (excluding plans/lessons/agent-working surfaces); resolves markdown-link + inline-code + JSON/TOML-string path refs relative to each ref's own content root; excludes fences, externals, anchors, tokens, and a precise `(file,ref)` allowlist; gate proven by a PR #156-class stale-`_toolkit/`-ref fixture.
- 2026-06-15 [hmcgrew/prism-163-crossref-lint]: Clove shipped the lint to draft PR #175 (commit `a1aa94d`) — infra sound (36/36 tests, gate fixture catches moved-`_toolkit/`), but the resolve-against-own-directory model over-flagged 354 refs on the live tree, mostly false positives. Clove also excluded `.json`/`.toml` from the walk (deviation from v1 spec).
- 2026-06-15 [main]: Winston re-planned the resolution model. Investigation measured 4 candidate models (resolve-own-dir 354, mirror-rebase 465, within-root 245, repo-root-absolute 32→~4-genuine) and chose repo-root-absolute-only. Root cause: canonical links are authored for the consumer's installed tree, not the partial monorepo; see Decision: Resolution model reversed. Ratified the `.json`/`.toml` walk-exclusion as the correct v1 call (deferred to follow-up). True-positive remainder is ~4 genuine stale refs that fold into #163.

---

## Acceptance Criteria

### Behavioral

- [ ] Given a content file references a repo-root-absolute path (`.prism/...`, `scripts/...`, `.ai-skills/...`, `templates/...`) that does not exist on disk, When `pnpm prism:check` runs, Then the check fails and names the file, line, and unresolved reference (REQ-1)
- [ ] Given a content file references a path inside a fenced code block, When the lint runs, Then that reference is not flagged (REQ-2)
- [ ] Given a content file references an external URL (`http(s)://`, `mailto:`) or an in-document anchor (`#section`), When the lint runs, Then that reference is not flagged (REQ-3)
- [ ] Given a content file references a templated path containing a `${...}` token, When the lint runs, Then that reference is not flagged (REQ-4)
- [ ] Given a moved `.prism/...` path that no longer resolves (a PR #156-class stale reference referenced by its repo-root-absolute path), When the lint runs, Then the check fails on it (REQ-5)
- [ ] Given a reference inside a historical plan file or `lessons.md`, When the lint runs, Then it is not scanned and not flagged (REQ-6)
- [ ] Given a relative link or a link into a generated surface (`.claude/`, `.codex/`, `.cursor/`, `.github/`, `docs/`), When the lint runs, Then that reference is not resolved or flagged — these are authored for the consumer's installed tree (REQ-10)
- [ ] Given a reference to a lazy-artifact path (a persona `*-state.json`, the onboarding registry, a lessons-archive file), When the lint runs, Then it is not flagged even though the file is intentionally absent (REQ-11)
- [ ] Given the current PRISM tree, When `pnpm prism:check` runs, Then the full chain passes (REQ-7)

### Non-behavioral

- [ ] The lint never resolves references by shelling out to `grep -rn ... | grep -v <path-substring>` — exclusions are by repo-root-prefix gate, target-pattern, and precise `(file, reference)` allowlist matching (REQ-8)
- [ ] The lint is a standalone script composed into `pnpm prism:check`, following the `verify-manifest-coverage.ts` pattern (REQ-9)

### AC Adjustments

- 2026-06-15 (re-plan): REQ-1 and REQ-5 tightened from "repo-relative path" to "repo-root-absolute path" — the resolution model was reversed to resolve only repo-root-absolute refs (see Decisions). Added REQ-10 (relative/generated-surface refs not flagged) and REQ-11 (lazy-artifact refs not flagged) to lock in the false-positive fix.

### AC Sync Log

| Date | Agent | Action | Plan | Linear |
| ---- | ----- | ------ | ---- | ------ |
| 2026-06-15 | Winston | Generated AC | followup-163-crossref-lint | N/A (GitHub issue #163) |
| 2026-06-15 | Winston | Re-plan AC adjust (REQ-1/5 tightened, REQ-10/11 added) | followup-163-crossref-lint | N/A (GitHub issue #163) |

---

## True-Positive Remainder Finding (re-plan investigation)

Measured against the live tree (354 raw violations from the shipped v1 lint). After applying the corrected repo-root-absolute model with lazy/historical exclusions, the genuine dangling-ref count is **~4 unique** (each doubled across canonical + seed twin ≈ 7-8 raw). Buckets:

| Bucket | Raw count | Verdict |
| --- | --- | --- |
| Cross-tree skill links (`../skills/prism-*`) | 57 | False positive — resolve in `.claude/skills/`, not flagged under model (e) |
| `_toolkit/` over-climb (`../spec/`, `../../rules/`) | 96 | False positive — relative links, not resolved under model (e) |
| `.github/`, `docs/content/dev/` published-doc refs | 50 | False positive — non-verifiable surface, not resolved |
| Lazy-artifact concept paths (`*-state.json`, registry, lessons-archive) | 26 | False positive — excluded by `isLazyOrHistoricalTarget` |
| Bare `lib/`, `prism-*/shared.md` persona-relative refs | ~70 | False positive — relative, not resolved |
| `.prism/plans/` historical citations from ADRs | 15 | Excluded — `plans/` is a working/historical surface |
| Generated-per-team illustrative refs (`security.md`, `react-guidelines.md`, `manifest.json`, `install-cursor.ts`) | ~8 | False positive in spirit — **allowlisted** (Task 4) |
| **Genuine stale (true positives)** | **~7-8 raw / ~4 unique** | **Fixed in Task 3** |

The ~4 unique genuine true positives:

1. `scripts/office/validate.py` (changelog `doc-generation.md`) — Thrive-era path, didn't survive extraction. **Genuine stale.**
2. `.prism/architect/plugin-management.md` (`plan-mode.md` ×2) — cited paired-doc precedent that doesn't exist in PRISM. **Genuine stale (Thrive-era precedent).**
3. `.prism/spec/adrs/README.md` display text (`SPEC.md`) — backtick text stale; the href correctly points at `_toolkit/README.md`. **Stale display text** (link works).

**Routing recommendation: these fold into #163 — no separate cleanup epic.** The genuine count is the PR #156-class handful Sol predicted, not a doc-rot cleanup intersecting Epic A. Task 3 fixes all of them in the same PR before the gate goes green. Two carry `[HITL]` flags where the correct replacement needs Sol/Hunter input (the `validate.py` replacement and the `plugin-management.md` precedent substitution).

---

## Review Issues

These are the genuine stale refs the corrected lint surfaces — tracked here so the gate can't go green until they're fixed (Task 3).

### Stale `scripts/office/validate.py` reference

- **Severity:** `minor`
- **Status:** `open`
- **File:** `.prism/references/changelog/doc-generation.md:23` (+ `templates/install/` twin)
- **Problem:** References `scripts/office/validate.py`, a Thrive-era path that doesn't exist in PRISM.
- **Suggested fix:** Replace with the correct PRISM validation step or remove the dead path. `[HITL]` if no PRISM equivalent is determinable from the changelog skill source.

### Stale `.prism/architect/plugin-management.md` precedent reference

- **Severity:** `minor`
- **Status:** `open`
- **File:** `.prism/references/architect/plan-mode.md:38` and `:135` (+ `templates/install/` twin)
- **Problem:** Cites `.prism/architect/plugin-management.md` as the paired-dev-doc precedent, but the file doesn't exist in PRISM (Thrive-era leftover).
- **Suggested fix:** Substitute an extant `.prism/architect/` paired-doc precedent, or rewrite the sentence to describe the pairing rule without citing a missing example. `[HITL]` if no extant precedent exists.

### Stale display text in SPEC.md ADR-README link

- **Severity:** `minor`
- **Status:** `open`
- **File:** `.prism/SPEC.md:142` (+ `SPEC.md.tmpl` twin)
- **Problem:** Link display text reads `` `.prism/spec/adrs/README.md` `` while the href correctly points at `./spec/adrs/_toolkit/README.md`. The link works; the backtick display text is stale.
- **Suggested fix:** Update display text to `` `.prism/spec/adrs/_toolkit/README.md` ``.

---

## Architect Context Updates

- **Candidate note (not blocking #163):** The fact that "canonical `.prism/` content authors relative cross-references to resolve in the consumer's installed tree, not in the partial monorepo" is a durable architectural property worth a short note in `.prism/architect/_toolkit/install-layout.md` (the doc that already covers the canonical→generated layout). It would warn future authors and tooling that relative links in canonical are not monorepo-verifiable. **Routed as a suggestion, not a #163 task** — flag to Sol/Hunter whether to fold a one-paragraph note into this PR or file a follow-up. The crossref-lint's repo-root-absolute scope is the current mitigation; the architect note would make the constraint explicit rather than implicit-in-the-lint.

---

## PR Readiness

- [ ] No critical or major issues
- [ ] Types correct — no `any`, no unsafe `as`
- [ ] No stray console.logs or debug artifacts (the lint's `console.error`/`console.log` are intentional reporting)
- [ ] Tests written for new logic and edge cases
- [ ] All debugged issues resolved (no `open` entries)
- [ ] Build passes — `pnpm prism:check` green end-to-end
- [ ] PR description up to date
- [ ] Lasting decisions promoted to architect context (if applicable)

**Last updated:** 2026-06-15
