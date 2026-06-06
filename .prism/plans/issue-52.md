# Plan: issue-52

## Ticket

GitHub issue #52 — "Allow string[] values in manifest.json for multi-doc routing"

## Goal

Replace the syntactic-variant workarounds in `manifest.json` with proper `string | string[]` values, so a single glob key can route to multiple architect docs.

---

## Implementation Tasks

### Clove (implementation)

1. **Update the `Manifest` type in `scripts/ai-skills/verify-manifest-coverage.ts`** — change `Record<string, string>` to `Record<string, string | string[]>`. Update the `compiledEntries` mapping in `loadedDocsForScope` to normalize array values: when a value is `string[]`, produce one `{matcher, docs}` entry with all docs; when `string`, wrap in a single-element array. The inner loop adds each doc in the array to the set on match. Verify: `pnpm prism:check-types` passes.

2. **Add array-value test cases to `scripts/ai-skills/verify-manifest-coverage.test.ts`** — add tests covering: (a) `loadedDocsForScope` with a manifest entry whose value is `string[]` returns all docs for a matching file; (b) deduplication still works when array entries overlap with other keys; (c) `compileMatcher` is unaffected (no changes needed there). Verify: `node --test scripts/ai-skills/verify-manifest-coverage.test.ts` passes.

3. **Migrate `manifest.json` entries** — collapse the 6 workaround entries (lines 39–46) into natural array values on the 4 canonical keys:
   - `.claude/skills/**` → `["spec-editing.md", "skills-ecosystem.md"]` (remove `.claude/skills/**/SKILL.md` entry)
   - `.ai-skills/skills/**` → `["spec-editing.md", "skills-ecosystem.md"]` (remove `.ai-skills/skills/**/shared.md` entry)
   - `.prism/**` → `["install-layout.md", "skills-ecosystem.md"]` (remove `.prism/*.md` and `.prism/**/*.md` entries)
   - `scripts/ai-skills/**` → `["spec-editing.md", "skills-ecosystem.md"]` (remove `scripts/ai-skills/*.ts` and `scripts/ai-skills/**/*.ts` entries)
   Also keep the standalone `skills-ecosystem.md` entries that have no collision (`AGENTS.md`, `.codex/agents/**`, `.cursor/skills/**`). Verify: `pnpm prism:verify-manifest` passes with no coverage loss.

4. **Update the matcher contract in `.prism/references/architect-context.md`** — in Step 1, change "values are the architect doc filenames to load" to specify that values can be `string` (single doc) or `string[]` (multiple docs). In Step 3, note that when a value is an array, all docs in the array are loaded for that match. Keep it concise — one sentence each.

5. **Run full verification** — execute `pnpm prism:check` (which runs build + tests + verify-manifest). Confirm zero failures and that the `skills-ecosystem.md` coverage for all expected-positive personas is preserved.

---

## Decisions

- **Normalize arrays at iteration time, not at parse time.** The `loadedDocsForScope` function normalizes `string | string[]` → `string[]` inside the `compiledEntries` mapping, keeping the manifest JSON schema simple (no wrapper objects) and the matcher contract minimal.
  - **Alternatives considered:** (a) normalize at JSON parse into a canonical form; (b) flatMap each entry into duplicate `{matcher, doc}` pairs.
  - **Chosen approach:** Normalize inside `compiledEntries` with a `docs: string[]` field. Beats (b) because it avoids recompiling the same regex for each doc in an array. Beats (a) because it keeps the type assertion minimal — one `as Manifest` cast, no intermediate transforms.
  - **Implementation guidance:** Change the `compiledEntries` shape from `{matcher, doc}` to `{matcher, docs}`, where `docs` is always an array (1 element for string values, N for arrays). The inner loop iterates `docs` and adds each to the set.

- **Broadened coverage is intentional.** Collapsing `.prism/*.md` + `.prism/**/*.md` → `.prism/**` means non-`.md` files (like `manifest.json` itself) now also load `skills-ecosystem.md`. This is the correct semantic intent — the `.md` limitation was a collision artifact, not a design choice.

---

## Acceptance Criteria

### Behavioral

- [ ] Given a manifest entry with a `string[]` value, When a file matches that pattern, Then all docs in the array are loaded for that match
- [ ] Given the migrated manifest, When running the verification script against all expected-positive persona scopes, Then every persona that previously loaded `skills-ecosystem.md` still loads it
- [ ] Given the migrated manifest, When a file matches a pattern with both a string value and an array value on different keys, Then both the string doc and all array docs are collected

### Non-behavioral

- [ ] The `Manifest` type accepts `Record<string, string | string[]>`
- [ ] `manifest.json` contains no syntactic-variant workaround entries (no `.prism/*.md`, `.prism/**/*.md`, `.claude/skills/**/SKILL.md`, `.ai-skills/skills/**/shared.md`, `scripts/ai-skills/*.ts`, `scripts/ai-skills/**/*.ts`)
- [ ] The matcher contract in `architect-context.md` documents array values
- [ ] `pnpm prism:check` passes cleanly

---

## History

- 2026-06-05 [hmcgrew/issue-52-manifest-array-routing]: Plan created — replace manifest workaround entries with string[] values for multi-doc routing.
- 2026-06-05 [hmcgrew/issue-52-manifest-array-routing]: Implemented all 5 tasks — type change, tests, manifest migration, contract doc update, verification. All 140 tests pass, coverage preserved.

---

## Debugged Issues

(none)

---

## Review Issues

(none)

---

## Cleanup Items

(none)

---

## PR Readiness

- [ ] No critical or major issues
- [ ] Types correct — no `any`, no unsafe `as`
- [ ] No stray console.logs or debug artifacts
- [ ] Tests written for new logic and edge cases
- [ ] All debugged issues resolved (no `open` entries)
- [ ] Build passes — last run: not yet
- [ ] PR description up to date
- [ ] Lasting decisions promoted to architect context (if applicable)

**Last updated:** 2026-06-05
