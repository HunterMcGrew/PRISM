# Plan: followup-430-bom-guard

## Ticket

GitHub issue [#430](https://github.com/HunterMcGrew/PRISM/issues/430) — "bom-guard.ts only checks leading bytes — blind to trailing-BOM contamination class"

## Goal

Make `scripts/ai-skills/bom-guard.ts` detect a UTF-8 BOM anywhere in a canonical source file, not only at byte offset 0, so the contamination class that shipped to npm in 0.7.3 cannot ship again undetected.

---

## User Stories

None. DX/tooling change with no consumer-observable behavior; the issue explicitly states no QA acceptance criteria.

---

## Design

Not applicable — no UI.

---

## Implementation Tasks

Sequence is strictly 1 → 2 → 3 → 4. Tasks 1–3 are one commit's worth of work; task 4 is the verification gate.

All tasks are `[AFK]`.

### Clove (implementation)

1. **Widen the scan in `scripts/ai-skills/bom-guard.ts` from a 3-byte header read to a whole-buffer search.**

   Three edits in this one file:

   **1a — extend the exported violation shape.** Replace:

   ```ts
   export interface BomGuardViolation {
   	relativePath: string;
   }
   ```

   with:

   ```ts
   export interface BomGuardViolation {
   	relativePath: string;
   	/** Byte offsets of every UTF-8 BOM occurrence in the file, ascending. Offset 0 is a leading BOM. */
   	byteOffsets: number[];
   }
   ```

   **1b — replace the header read with a whole-buffer scan.** In `walk()`, replace the entire `const handle = await fs.open(entryPath, "r"); try { ... } finally { await handle.close(); }` block (the `fs.open` / `Buffer.alloc(3)` / `handle.read` / `headerBuf.equals(UTF8_BOM)` sequence) with:

   ```ts
   const contents = await fs.readFile(entryPath);
   const byteOffsets: number[] = [];
   let searchFrom = 0;

   while (searchFrom <= contents.length - UTF8_BOM.length) {
   	const found = contents.indexOf(UTF8_BOM, searchFrom);

   	if (found === -1) {
   		break;
   	}

   	byteOffsets.push(found);
   	searchFrom = found + UTF8_BOM.length;
   }

   if (byteOffsets.length > 0) {
   	violations.push({
   		relativePath: path.relative(repoRoot, entryPath).split(path.sep).join("/"),
   		byteOffsets,
   	});
   }
   ```

   `fs.open` is no longer used in this file after the replacement — the `fs` import stays (still used for `readdir` and `readFile`). No new imports.

   **1c — update the two stale JSDoc blocks to say "anywhere in" instead of "begins with".** In the file-level JSDoc (line 1–12), replace `fails when any canonical source file begins with a UTF-8 BOM (0xEF 0xBB 0xBF)` with `fails when any canonical source file contains a UTF-8 BOM (0xEF 0xBB 0xBF) at any byte offset`, and append this sentence to that same paragraph: `A trailing or embedded BOM is as damaging as a leading one and shipped to npm in 0.7.3 under the older leading-bytes-only check — see issue #430.` In the `runBomGuard` JSDoc, replace `for a leading UTF-8 BOM. Returns one violation per affected file.` with `for a UTF-8 BOM at any byte offset. Returns one violation per affected file, carrying every occurrence's offset.`

   Verification: `pnpm run prism:check-types` (must pass — this is the type-shape gate for task 2).

2. **Update the build-time error output in `scripts/ai-skills/build.ts` (lines 987–996) to report offsets.** After task 1.

   Replace:

   ```ts
   		for (const violation of bomViolations) {
   			console.error(`bom-guard: ${violation.relativePath}: UTF-8 BOM detected`);
   		}
   		console.error(
   			`bom-guard: ${bomViolations.length} canonical source file(s) begin with a UTF-8 BOM. Re-save as UTF-8 without BOM.`
   		);
   ```

   with:

   ```ts
   		for (const violation of bomViolations) {
   			console.error(
   				`bom-guard: ${violation.relativePath}: UTF-8 BOM detected at byte offset(s) ${violation.byteOffsets.join(", ")}`
   			);
   		}
   		console.error(
   			`bom-guard: ${bomViolations.length} canonical source file(s) contain a UTF-8 BOM. Re-save as UTF-8 without BOM.`
   		);
   ```

   Nothing else in `build.ts` changes. Verification: `pnpm run prism:check-types`.

3. **Add trailing-BOM and mid-file-BOM coverage in `scripts/ai-skills/bom-guard.test.ts`.** After tasks 1–2.

   **3a — update the file-level JSDoc.** Replace `for files that begin with a UTF-8 BOM (0xEF 0xBB 0xBF)` with `for files containing a UTF-8 BOM (0xEF 0xBB 0xBF) at any byte offset`.

   **3b — tighten the existing leading-BOM markdown test.** In `test("bom guard flags a markdown file with a leading UTF-8 BOM", ...)`, after the existing `assert.match(violations[0].relativePath, /shared\.md$/);` line, add:

   ```ts
   		assert.deepEqual(violations[0].byteOffsets, [0]);
   ```

   Leave the `.mjs`, `.json`, clean-pass, extension-filter, absent-directory, and multi-file tests unchanged — they assert on `violations.length` only and stay green.

   **3c — append three new tests** at the end of the file, using the existing `withTempRepo` / `writeSource` helpers and the module-level `UTF8_BOM` constant:

   - `test("bom guard flags a markdown file with a trailing UTF-8 BOM", ...)` — write `skills/prism-x/shared.md` as `Buffer.concat([Buffer.from("<!-- AUTO-GENERATED -->\nHello.\n", "utf8"), UTF8_BOM])`. This is the #430 regression case, mirroring the contaminated `prism-prd/shared.md` that shipped in 0.7.3. Assert `violations.length === 1`, `assert.match(violations[0].relativePath, /shared\.md$/)`, and `assert.deepEqual(violations[0].byteOffsets, [31])` — the prefix `"<!-- AUTO-GENERATED -->\nHello.\n"` is 31 bytes. If that literal is changed, compute the offset from the prefix's byte length rather than hardcoding a different number.
   - `test("bom guard flags a UTF-8 BOM embedded mid-file", ...)` — write `definitions/example.json` as `Buffer.concat([Buffer.from('{"a":1,', "utf8"), UTF8_BOM, Buffer.from('"b":2}\n', "utf8")])`. Assert `violations.length === 1` and `assert.deepEqual(violations[0].byteOffsets, [7])`.
   - `test("bom guard reports every BOM occurrence in a single file", ...)` — write `skills/prism-x/shared.md` as `Buffer.concat([UTF8_BOM, Buffer.from("body\n", "utf8"), UTF8_BOM])`. Assert `violations.length === 1` and `assert.deepEqual(violations[0].byteOffsets, [0, 8])` — the BOM is 3 bytes, `"body\n"` is 5.

   Verification: `pnpm run prism:test` (all tests green, including the four pre-existing ones).

4. **Run the full gate.** After tasks 1–3.

   Run `pnpm run prism:check`. It must exit 0. This is the task that proves the widened guard does not newly fail on the live tree — `pnpm prism:build` runs `runBomGuard` over the 99 canonical `.md`/`.mjs`/`.json` files under `.ai-skills/`, and a whole-buffer scan flags strictly more than a header scan.

   The tree was confirmed clean during planning (`grep -rlP '\xef\xbb\xbf' .ai-skills/` returned no files), so no violations are expected. If `prism:check` does surface a violation, that is a genuine find, not a false positive — strip the BOM from the named file at the reported offset rather than weakening the guard.

   No rule, doc, or skill source changes in this plan, so no generated mirrors move and no `pnpm prism:build` mirror regeneration is required beyond what `prism:check` already runs. Should a later revision of this work touch anything under `.ai-skills/` or `.prism/rules/`, the generated mirrors under `.claude/`, `.cursor/`, `.codex/`, and `templates/` are regenerated via `pnpm prism:build` and never hand-edited.

### Eli (documentation)

None. `grep` across the repo found no doc, rule, or architect-context file describing `bom-guard`'s scan window — the only references outside `scripts/` are plan files. Nothing to update.

---

## Decisions

- **Whole-buffer `indexOf` scan, not a leading-plus-trailing check.** The issue's title names trailing BOMs, but the defect class is "BOM at an offset the guard doesn't look at." A leading+trailing pair would leave a mid-file BOM — the exact shape produced by a bad concatenation or a partial-file editor save — uncaught, and would be the same bug filed again in three months. Whole-buffer costs nothing here: 99 files, all small, already fully read elsewhere in the build.
  - → no promotion needed (implementation tactic scoped to one guard file).
- **Read the whole file with `fs.readFile` instead of `fs.open` + partial reads.** The header-read approach existed to avoid loading whole files; a whole-buffer scan needs the whole buffer regardless, and `readFile` is simpler than a chunked reader. At this corpus size a streaming scan would be premature optimization with real complexity cost (BOM sequences straddling chunk boundaries).
  - → no promotion needed (implementation tactic).
- **`byteOffsets: number[]` added to `BomGuardViolation`, and every occurrence reported.** A guard that says "there is a BOM in this 400-line file" without saying where sends the fixer hunting; reporting all offsets in one pass means a single fix cycle instead of re-running the build per BOM. `build.ts` is the only consumer of the interface, so widening it is contained. Considered: reporting only the first offset. Rejected — a file contaminated once is often contaminated twice (concatenation), and the second run costs a full build.
  - → no promotion needed (local interface, one consumer).
- **No allowlist or exclusion mechanism for files that legitimately contain U+FEFF.** No canonical source contains one today (verified during planning). If a future doc genuinely needs to show a BOM, it writes the escaped hex form (`0xEF 0xBB 0xBF`) the way `bom-guard.ts`'s own JSDoc already does — not a literal byte. Adding an escape hatch now would be the same false-confidence failure the issue is about.
  - → no promotion needed (documented here; revisit only if a real case appears).
- **Scope stays `.ai-skills/**` (`.md`, `.mjs`, `.json`) — unchanged.** Widening to `templates/install/` or the generated platform trees is a separate question about guard coverage, not about the blind spot #430 names, and would grow a half-day lane. Generated outputs derive from BOM-free sources, so the existing scope argument still holds.
  - → no promotion needed (preserves existing documented scope; no change to promote).
- **`.prism/lessons.md`'s leading BOM stays untouched.** Out of scope per the issue — it is not a shipped surface and not under `.ai-skills/`.
  - → no promotion needed (explicit non-scope).

---

## Sessions

- 2026-07-21 [main] open: Intent — plan the whole-buffer widening of `bom-guard.ts` plus trailing-BOM fixtures before the next npm publish; Bounds — write this plan file only, no code, no branch, no tracker writes; Approach — read the guard, its tests, and its one consumer, then specify exact edits · close: scope held
- 2026-07-21 [huntermcgrew/prism-430-bom-guard-whole-buffer] open: Intent — implement the plan's whole-buffer BOM scan, offset reporting, and trailing/mid-file/multi-occurrence test fixtures exactly as specified; Bounds — the three named files only (`bom-guard.ts`, `build.ts` lines 987–996, `bom-guard.test.ts`), no scope beyond the plan's four tasks; Approach — apply each edit verbatim against the plan's exact replacements, verify after each task per the plan's sequencing · close: scope held

---

## History

- 2026-07-21 [main]: Winston wrote the implementation plan for issue #430 (whole-buffer BOM scan + offset reporting + trailing/mid-file/multi-occurrence fixtures). No code written.
- 2026-07-21 [huntermcgrew/prism-430-bom-guard-whole-buffer]: Implemented all four plan tasks — widened `bom-guard.ts` to a whole-buffer `indexOf` scan with `byteOffsets: number[]` on `BomGuardViolation`, updated `build.ts`'s error output to print offsets, and added trailing/mid-file/multi-occurrence test fixtures plus a tightened offset assertion on the existing leading-BOM test. `pnpm run prism:check` exits 0 with no violations on the live tree.

---

## Debugged Issues

None.

---

## Review Issues

None yet.

---

## Acceptance Criteria

The issue states no QA acceptance criteria — this is developer-verified DX tooling. The criteria below are the developer-verifiable done condition.

### Behavioral

- [x] **AC-1** — Given a canonical source file under `.ai-skills/` whose bytes end with `0xEF 0xBB 0xBF`, When `runBomGuard` scans the tree, Then it reports exactly one violation for that file with the BOM's byte offset.
  - Evidence (`machine`): the new `bom guard flags a markdown file with a trailing UTF-8 BOM` test passes under `pnpm run prism:test`.
- [x] **AC-2** — Given a canonical source file containing `0xEF 0xBB 0xBF` at a byte offset that is neither the start nor the end of the file, When `runBomGuard` scans the tree, Then it reports a violation for that file with the correct offset.
  - Evidence (`machine`): the new `bom guard flags a UTF-8 BOM embedded mid-file` test passes under `pnpm run prism:test`.
- [x] **AC-3** — Given a file containing more than one BOM occurrence, When `runBomGuard` scans it, Then a single violation is reported carrying every occurrence's byte offset in ascending order.
  - Evidence (`machine`): the new `bom guard reports every BOM occurrence in a single file` test passes under `pnpm run prism:test`.
- [x] **AC-4** — Given canonical source files with no BOM at any offset, When `runBomGuard` scans them, Then no violations are reported.
  - Evidence (`machine`): the pre-existing `bom guard passes on BOM-free canonical source files`, `bom guard ignores non-target file extensions`, and `bom guard returns empty array when .ai-skills directory is absent` tests still pass unchanged.
- [x] **AC-5** — Given the build fails on a BOM violation, When the failure prints, Then the message names the file and the byte offset(s) of each occurrence.
  - Evidence (`human`): read `scripts/ai-skills/build.ts` lines 987–996 and confirm the `console.error` interpolates `violation.byteOffsets`.

### Non-behavioral

- [x] **AC-6** — The full repository gate passes on the widened guard.
  - Evidence (`machine`): `pnpm run prism:check` exits 0.
- [x] **AC-7** — The leading-BOM behavior documented in `bom-guard.ts` and `bom-guard.test.ts` JSDoc no longer claims the guard checks only the file's opening bytes.
  - Evidence (`human`): both file-level JSDoc blocks and the `runBomGuard` JSDoc read "at any byte offset" and no longer say "begins with".

### AC Adjustments

None.

### AC Sync Log

| Date | Agent | Action | Plan | Ticket |
| ---- | ----- | ------ | ---- | ------ |
| 2026-07-21 | Winston | AC authored in plan; not synced (dispatch bounds: no tracker writes) | followup-430-bom-guard | #430 |

---

## Cleanup Items

None.

---

## PR Readiness

- [x] No critical or major issues
- [x] Types correct — no `any`, no unsafe `as`
- [x] No stray console.logs or debug artifacts
- [x] Tests written for new logic and edge cases
- [x] All debugged issues resolved (no `open` entries)
- [x] Build passes — last run: 2026-07-21 (`pnpm run prism:check` exits 0)
- [x] PR description up to date
- [x] Lasting decisions promoted to architect context (if applicable) — none warranted; every Decision in this plan carries `→ no promotion needed`

**Last updated:** 2026-07-21
