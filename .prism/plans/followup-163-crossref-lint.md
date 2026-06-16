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

**Carrier extensions:** `.md`, `.tmpl`, `.mdc`, `.json`, `.toml` — the full ref-carrying set named in the sweep-methodology lesson. (`.mdc`/`.toml` count is currently 0 under these roots; including them is forward-proofing per "count rules, not numbers" — the rule is "every ref-carrying extension," not "the three that exist today.")

**Excluded subtrees (by search root, not by line-prefix grep):**

- `.prism/plans/` — historical plan files carry stale relative refs by design (pre-`_toolkit/`-move paths, refs to deleted scaffolding). Plans are append-only working records, not durable cross-ref surfaces. Already excluded from path-guard's copied areas for the analogous reason.
- `.prism/lessons.md` — frozen incident citations reference paths as evidence, including paths that have since moved.
- `.prism/audits/`, `.prism/retros/`, `.prism/prds/`, `.prism/design/` — agent-generated working artifacts, not cross-ref-guaranteed surfaces.
- Any generated platform mirror (`.claude/`, `.codex/`, `.cursor/`, `.agents/`) — these are build outputs; their refs are guarded by being byte-copies of guarded canonical sources.

The scan is **allowlist-of-roots** (`.prism/{rules,architect,spec,references,templates}` + `.prism/SPEC.md` + the seed twin's mirror of those + the loose `AGENTS.md`/`CLAUDE.md.tmpl` files), NOT "all of `.prism/` minus excludes" — choosing roots is the lesson's prescribed exclusion mechanism (exclude by search root / precise pattern, never by `grep -v` on `grep -rn` line prefixes).

### How it extracts path references

A "repo path reference" is one of these three precisely-defined shapes, extracted per content line (outside fenced code blocks — see exclusions):

1. **Markdown inline links** — `[text](target)`. Extract `target`. Regex anchor: `\[[^\]]*\]\(([^)]+)\)`.
2. **Inline-code repo paths** — a backtick span ``` `...` ``` whose content, after token-stripping, matches a repo-path shape: contains a `/` and ends in a known carrier extension OR starts with a known root segment (`.prism/`, `templates/`, `.claude/`, `scripts/`, `.ai-skills/`) OR is a relative path (`./` or `../`) ending in a carrier extension. Regex anchor: `` `([^`]+)` `` then shape-test the capture.
3. **JSON/TOML string values that look like repo-relative paths** — for `.json`/`.toml`/`.mdc`-with-frontmatter carriers, string values matching the same repo-path shape test as (2). Applies to `manifest.json` route keys/values, `paths.json`, `seed-curation.json` entries, etc.

A capture qualifies as a **repo path reference** only if, after exclusion filtering (below), it is shape-valid: it resolves to a candidate filesystem path. Bare prose words, prose containing slashes that aren't paths (`server/client`, `and/or`), and non-path code spans are not references.

### How it resolves them

For each extracted `target`:

1. **Strip the anchor fragment** — split on `#`, keep the path part. A pure-anchor ref (`#section`, empty path part) is skipped (intra-document link).
2. **Strip query strings** — split on `?`, keep the path part (defensive; rare in repo refs).
3. **Resolve relative-to-the-referencing-file's-own-directory.** `[x](../foo/bar.md)` from `.prism/architect/doc.md` resolves to `.prism/foo/bar.md`. `[x](./spec/adrs/0003.md)` from `templates/install/.prism/SPEC.md.tmpl` resolves to `templates/install/.prism/spec/adrs/0003.md`. **Each content root is self-contained** — seed-twin refs resolve against the seed tree, canonical refs against the canonical tree. No cross-root resolution.
4. **Repo-root-absolute refs** — a target starting with a known root segment (`.prism/`, `templates/`, `scripts/`, `.ai-skills/`, `.claude/`) resolves relative to repo root, regardless of the referencing file's location.
5. **Existence check** — `pathExists(resolved)`. A ref whose resolved path does not exist on disk is a **violation**. A ref to a `.tmpl` twin: if `foo.md` doesn't exist but `foo.md.tmpl` does, treat as resolved (the seed stores `.tmpl` twins of `.md` canonical files).

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
6. **Example-only / illustrative paths** — a small **file+pattern allowlist** (mirroring `path-guard.ts`'s `PATH_GUARD_FILE_ALLOWLIST` shape): a `Set` of `{ relativePath, refPattern }` entries, each with a source comment explaining why a specific illustrative ref in a specific doc is exempt. Seeded empty; entries added only when a genuine illustrative ref surfaces. The exclusion is matched by `(file, refText)` pair — never by a path-substring `grep -v`.

**The lesson's false-clean trap is structurally avoided:** the lint never shells out to `grep -rn ... | grep -v`. It reads files, tracks fence state in code, resolves each ref against the filesystem, and excludes by search-root choice + precise `(file, ref)` allowlist matching. There is no line-prefix string to accidentally filter on.

### The gate (PR #156-class catch)

The lint must catch a moved-`_toolkit/` path that no longer resolves — the exact class that shipped green three times in PR #156. Verified by the test fixture: a doc with a ref to `architect/skills-ecosystem.md` (the pre-move path) when only `architect/_toolkit/skills-ecosystem.md` exists must produce one violation; the corrected `architect/_toolkit/skills-ecosystem.md` ref must pass clean.

---

## Implementation Tasks

Tasks are sequenced: 1 (lint module) → 2 (test) → 3 (wiring) → 4 (verify). Tasks 1 and 2 may be authored in parallel but task 2 imports task 1's exports.

### Clove (implementation)

1. **Create `scripts/ai-skills/crossref-lint.ts`** — the lint module. Model its structure on `scripts/ai-skills/path-guard.ts` (recursive file walk, `scanLines` with `inFence` tracking, exported pure functions + a `main()`) and `scripts/ai-skills/verify-manifest-coverage.ts` (standalone-script `main()` + `invokedDirectly` guard + exit-1-on-failure shape).

   Export the following (named exports, for the test to import):

   - `interface CrossRefViolation { relativePath: string; line: number; ref: string; resolved: string; }`
   - `const CARRIER_EXTENSIONS = [".md", ".tmpl", ".mdc", ".json", ".toml"] as const;`
   - `const CROSSREF_SCAN_ROOTS` — the allowlist of `{ contentRoot, areas, looseFiles }` scan descriptors:
     - `.prism/` with areas `["rules", "architect", "spec", "references", "templates"]` and loose files `["SPEC.md"]`
     - `templates/install/.prism/` with the same areas and loose files `["SPEC.md.tmpl"]`
     - repo-root loose files `["AGENTS.md", "templates/install/AGENTS.md.tmpl", "templates/install/.claude/CLAUDE.md.tmpl"]`
   - `const CROSSREF_FILE_ALLOWLIST: ReadonlySet<string>` — seeded empty (`new Set([])`), with a doc comment matching `path-guard.ts`'s allowlist comment style (each future entry needs a source comment explaining why an illustrative ref is exempt).
   - `function extractRefs(line: string): string[]` — given a non-fenced line, return all raw ref targets. Apply, in order: (a) markdown-link regex `\[[^\]]*\]\(([^)]+)\)` → capture group 1; (b) inline-code regex `` /`([^`]+)`/g `` → each capture shape-tested by `looksLikeRepoPath`. Union the results.
   - `function looksLikeRepoPath(candidate: string): boolean` — true when the candidate (anchor/query stripped) contains a `/` AND (ends in a `CARRIER_EXTENSIONS` member, OR starts with a known root segment `.prism/`/`templates/`/`scripts/`/`.ai-skills/`/`.claude/`, OR starts with `./` or `../`). Used to filter inline-code and JSON/TOML string candidates.
   - `function isExternalOrToken(target: string): boolean` — true when `target` matches `/^(https?|mailto|tel|ftp):/` or `/^\/\//` or contains `${`. These are skipped before resolution.
   - `function resolveRef(referencingFileAbsPath: string, repoRoot: string, target: string): string` — strip `#`-fragment and `?`-query; if target starts with a known repo-root segment, resolve against `repoRoot`; else resolve relative to `path.dirname(referencingFileAbsPath)`. Return the absolute resolved path.
   - `async function refResolves(resolvedAbsPath: string): Promise<boolean>` — `pathExists(resolvedAbsPath)` OR `pathExists(resolvedAbsPath + ".tmpl")` (seed `.tmpl` twin fallback) OR (when the resolved path ends in `.tmpl`) `pathExists` of the `.tmpl`-stripped `.md` form.
   - `function scanLines(lines, relativePath, referencingFileAbsPath, repoRoot): Promise<CrossRefViolation[]>` — toggle `inFence` on `/^\s{0,3}```/` (copy `path-guard.ts`'s fence logic); skip indented-4-space code lines; for each non-fenced line, `extractRefs` → filter `isExternalOrToken` → for each surviving ref, skip pure-anchor (empty path part after `#`-split), resolve, and push a violation when `!refResolves` and the `(relativePath, ref)` pair is not in `CROSSREF_FILE_ALLOWLIST`.
   - `async function runCrossRefLint(repoRoot: string): Promise<CrossRefViolation[]>` — walk every `CROSSREF_SCAN_ROOTS` descriptor (recursive file list filtered to `CARRIER_EXTENSIONS`, skipping dotfile dirs and the excluded subtrees), read each file, call `scanLines`, aggregate violations. Return `[]` when a root does not exist (mirror `runPathGuard`'s early-empty-return contract).
   - `main()` — call `runCrossRefLint(repoRoot)`; on violations, `console.error` one line per violation in the format `crossref-lint: <relativePath>:<line>: <ref> → <resolved> (does not exist)` plus a summary line, then `process.exit(1)`; on clean, `console.log("crossref-lint passed. All prose cross-references resolve.")`. Use the same `repoRoot` derivation as `verify-manifest-coverage.ts` (`PRISM_REPO_ROOT` env override → `path.resolve(scriptDirectory, "../..")`) and the same `invokedDirectly` guard.

   Import `pathExists` from `./utils` (already exported, used by `path-guard.ts`).

   **Verification:** `npx tsx scripts/ai-skills/crossref-lint.ts` runs clean against the current tree (all current refs resolve — if any real stale ref surfaces, that is a true positive to fix, not a lint bug; record it in `## History`).

2. **Create `scripts/ai-skills/crossref-lint.test.ts`** — the regression suite. Model on `scripts/ai-skills/path-guard.test.ts` (`withTempContentRoot` helper, `node:test` + `node:assert/strict`, build-a-temp-tree-then-assert shape). Because `runCrossRefLint` walks fixed real roots, the test exercises the exported pure functions (`extractRefs`, `looksLikeRepoPath`, `isExternalOrToken`, `resolveRef`, `refResolves`, `scanLines`) directly against temp trees rather than calling `runCrossRefLint`. Required cases:

   - **PR #156-class catch (the gate):** build a temp dir with `architect/_toolkit/skills-ecosystem.md` present, and a `rules/sample.md` containing `` See [the roster](../architect/skills-ecosystem.md). `` (the pre-move, now-stale path). Assert `scanLines` on that file yields exactly one violation whose `ref` is `../architect/skills-ecosystem.md`.
   - **Clean pass on the corrected ref:** same tree, `rules/sample.md` references `../architect/_toolkit/skills-ecosystem.md`. Assert zero violations.
   - **Fenced example block skipped:** a doc with a stale ref inside a ```` ``` ```` fence yields zero violations.
   - **External URL skipped:** `[docs](https://example.com/x)` and `[mail](mailto:a@b.c)` yield zero violations.
   - **Anchor-only skipped:** `[jump](#section)` yields zero violations.
   - **Token literal skipped:** `[adr](./spec/adrs/${SLUG}.md)` yields zero violations (un-resolvable templated path).
   - **Inline-code repo path resolved:** `` `.prism/rules/missing.md` `` in a doc, with no such file, yields one violation; `` `.prism/rules/present.md` `` with the file present yields zero.
   - **Non-path slash prose not flagged:** a line containing `server/client boundary` and `and/or` yields zero violations (`looksLikeRepoPath` rejects — no carrier extension, no root segment, no `./`).
   - **`.tmpl` twin fallback:** a ref to `./spec/adrs/0003.md` resolves when only `spec/adrs/0003.md.tmpl` exists.
   - **Allowlisted `(file, ref)` pair skipped:** add a temp entry behavior test — a `scanLines` call with a populated allowlist set passed in (if `scanLines` takes the allowlist as a param) confirms the pair is exempt. If `CROSSREF_FILE_ALLOWLIST` is module-const, test `runCrossRefLint`'s real-tree clean run instead and assert the allowlist mechanism via a smaller unit on the matching helper.

   **Verification:** `npx tsx --test scripts/ai-skills/crossref-lint.test.ts` — all cases green.

3. **Wire the lint into `prism:check`** — edit `package.json` line 10. Change:

   ```
   "prism:check": "tsx scripts/ai-skills/build.ts --check && pnpm run prism:test && pnpm run prism:verify-manifest",
   ```

   to append the lint as the final step:

   ```
   "prism:check": "tsx scripts/ai-skills/build.ts --check && pnpm run prism:test && pnpm run prism:verify-manifest && pnpm run prism:crossref-lint",
   ```

   and add a new script entry (alphabetically adjacent to the other `prism:` keys, after `prism:check-types`):

   ```
   "prism:crossref-lint": "tsx scripts/ai-skills/crossref-lint.ts",
   ```

   Note: `prism:test` (line 12) runs `tsx --test scripts/ai-skills/*.test.ts`, which automatically picks up the new `crossref-lint.test.ts` — no change needed there. The lint runs as both a standalone `prism:check` step (full-tree resolution) AND has its pure functions covered by `prism:test`.

   **Verification:** `pnpm run prism:crossref-lint` exits 0 against the current clean tree.

4. **Full-chain verification.** Run `pnpm prism:check` and confirm it passes end-to-end (build-check + test + verify-manifest + crossref-lint all green). Then prove the gate: temporarily edit one canonical doc to reference a non-existent `_toolkit/`-class path, re-run `pnpm prism:check`, confirm it now exits 1 with a `crossref-lint:` violation line, then revert the temporary edit. Record both the clean pass and the deliberate-break confirmation in `## History`.

   **Verification:** `pnpm prism:check` (clean) → exit 0; `pnpm prism:check` (with deliberate stale ref) → exit 1 naming the stale ref; revert → exit 0.

---

## Decisions

- **Standalone script wired into `prism:check`, not folded into `build.ts --check`.** Considered: adding a `runCrossRefLint` call inside `build.ts main()` alongside path-guard/literal-guard. Rejected: `build.ts` owns generated-output drift detection and shares check-mode/changedPaths plumbing the lint doesn't need; the lint guards source-prose resolvability, an orthogonal invariant. `verify-manifest-coverage.ts` already establishes the standalone-script-per-invariant pattern, and following it keeps `build.ts` focused and the lint independently runnable. → no promotion needed (implementation-structural choice specific to this lint; the standalone-script-per-invariant pattern is already codified by `verify-manifest-coverage.ts`'s existence).

- **Resolve every ref relative-to-the-referencing-file's-own-directory; each content root is self-contained.** Considered: resolving seed-twin refs against the canonical tree (since the seed is a curated subset). Rejected: the seed ships its own `spec/`/`architect/`/`rules/` trees, so a seed `.tmpl`'s `./spec/adrs/x.md` correctly resolves within the seed; resolving against canonical would mask a genuine dangling ref in the shipped seed (the exact PR #156 seed-twin failure). "Resolve against on-disk reality of the file's own root" is correct by construction and needs no curation-awareness. → no promotion needed (resolution rule lives in the lint module's doc comment; not a cross-cutting decision).

- **Exclude `plans/`, `lessons.md`, and agent-generated working surfaces by search-root choice, not by path-substring filtering.** Historical plans and frozen lesson citations legitimately reference moved/deleted paths as working records or evidence. The sweep-methodology lesson prescribes excluding by search root or precise pattern, never by `grep -v` on a `grep -rn` line prefix (which silently false-cleans). The lint honors this structurally: it never shells to grep; it chooses scan roots and excludes by precise `(file, ref)` allowlist matching. → no promotion needed (codifies an existing lesson's prescription in code; lesson already durable).

- **Carrier extension set is `.md`/`.tmpl`/`.mdc`/`.json`/`.toml` even though `.mdc`/`.toml` count is 0 under the scanned roots today.** Per writing-voice "count rules, not numbers": the rule is "every ref-carrying extension," not "the three present today." Forward-proofs against Cursor `.mdc` rules or future `.toml` config carriers landing under the roots. → no promotion needed (forward-proofing rationale, lint-local).

---

## History

- 2026-06-15 [main]: Plan created by Winston for issue #163 — prose cross-reference lint. Design locked: standalone `crossref-lint.ts` wired as a 4th `prism:check` step; scans `.md`/`.tmpl`/`.mdc`/`.json`/`.toml` across canonical + seed-twin roots (excluding plans/lessons/agent-working surfaces); resolves markdown-link + inline-code + JSON/TOML-string path refs relative to each ref's own content root; excludes fences, externals, anchors, tokens, and a precise `(file,ref)` allowlist; gate proven by a PR #156-class stale-`_toolkit/`-ref fixture.
- 2026-06-15 [hmcgrew/prism-163-crossref-lint]: Implemented `crossref-lint.ts`, `crossref-lint.test.ts` (36 tests, all green), `package.json` wiring. Deviation from plan: `.json`/`.toml` excluded from file walk (PROSE_SCAN_EXTENSIONS) — applying markdown-link/backtick regexes to JSON produces high false-positive rates; shape-test still recognizes `.json`/`.toml` extensions in inline code spans. Lint finds 364 genuine stale cross-refs on the live tree (true positives); `prism:check` fails on crossref-lint step — human triage needed before it can go green (REQ-7 blocked).

---

## Acceptance Criteria

### Behavioral

- [ ] Given a content file references a repo-relative path that does not exist on disk, When `pnpm prism:check` runs, Then the check fails and names the file, line, and unresolved reference (REQ-1)
- [ ] Given a content file references a path inside a fenced code block, When the lint runs, Then that reference is not flagged (REQ-2)
- [ ] Given a content file references an external URL (`http(s)://`, `mailto:`) or an in-document anchor (`#section`), When the lint runs, Then that reference is not flagged (REQ-3)
- [ ] Given a content file references a templated path containing a `${...}` token, When the lint runs, Then that reference is not flagged (REQ-4)
- [ ] Given a moved `_toolkit/` path that no longer resolves (a PR #156-class stale reference), When the lint runs, Then the check fails on it (REQ-5)
- [ ] Given a reference inside a historical plan file or `lessons.md`, When the lint runs, Then it is not scanned and not flagged (REQ-6)
- [ ] Given the current PRISM tree with all references resolving, When `pnpm prism:check` runs, Then the full chain passes (REQ-7)

### Non-behavioral

- [ ] The lint never resolves references by shelling out to `grep -rn ... | grep -v <path-substring>` — exclusions are by search-root choice and precise `(file, reference)` matching (REQ-8)
- [ ] The lint is a standalone script composed into `pnpm prism:check`, following the `verify-manifest-coverage.ts` pattern (REQ-9)

### AC Adjustments

### AC Sync Log

| Date | Agent | Action | Plan | Linear |
| ---- | ----- | ------ | ---- | ------ |
| 2026-06-15 | Winston | Generated AC | followup-163-crossref-lint | N/A (GitHub issue #163) |

---

## PR Readiness

- [x] No critical or major issues
- [x] Types correct — no `any`, no unsafe `as`
- [x] No stray console.logs or debug artifacts (the lint's `console.error`/`console.log` are intentional reporting)
- [x] Tests written for new logic and edge cases — 36 tests, all pass
- [x] All debugged issues resolved (no `open` entries)
- [ ] Build passes — `pnpm prism:check` BLOCKED: crossref-lint finds 364 genuine stale refs in live tree; `needs-human` before this can go green
- [ ] PR description up to date
- [ ] Lasting decisions promoted to architect context (if applicable)

**Last updated:** 2026-06-15
