# Plan: issue-393

## Ticket

https://github.com/HunterMcGrew/PRISM/issues/393 (lane L-SEED of epic #373; sub-issue resolving the `OPEN — needs Hunter` Decision from #374)

## Goal

Give `prism adopt` an opt-in path that seeds a minimal, build-maintainable root `AGENTS.md` when one is absent, closing the Codex-reach gap L374 could only warn about — with a provenance marker so `prism eject` removes a PRISM-seeded `AGENTS.md` and never a consumer-authored one.

---

## Implementation Tasks

> **Decisions 1–4 below are load-bearing.** Read them before executing — they fix the opt-in flag, the seed-content shape (stub, not full block), the provenance marker (in-file HTML comment, not manifest entry), and the no-overwrite guarantee. The task detail here front-loads every file/line/string; the reasoning for each choice lives in `## Decisions`.

### Clove (implementation)

1. **Add the `--seed-agents-md` opt-in flag parser.** File: `scripts/ai-skills/lib/consumer-root.ts`. After `parseConfirmFlag` (ends line 215), add a new boolean-flag parser mirroring it exactly:

   ```ts
   /**
    * Parses the `--seed-agents-md` flag from argv. Same boolean-flag shape as
    * `parseDryRunFlag`/`parseConfirmFlag` — presence means `true`, absence means
    * `false`. Used by `adopt.ts` to opt into seeding a minimal root `AGENTS.md`
    * when one is absent; without it, adopt never creates the file (only warns).
    */
   export function parseSeedAgentsMdFlag(argv: string[]): boolean {
   	return argv.includes("--seed-agents-md");
   }
   ```

   Verification: `pnpm run prism:check-types`.

2. **Author the seed-content constant + marker.** File: `scripts/ai-skills/agents-md-block.ts`. This module already exports `AGENTS_MD_BLOCK_BEGIN`/`AGENTS_MD_BLOCK_END` and owns everything about the generated block — the seed content and its provenance marker belong here too, next to the markers `replaceTier1Block` maintains. After the `AGENTS_MD_BLOCK_END` export (line 25), add:

   ```ts
   /**
    * Provenance marker recording that `prism adopt --seed-agents-md` created this
    * file. `prism eject` keys on this comment to decide whether a root `AGENTS.md`
    * is PRISM-seeded (safe to delete) or consumer-authored (must be preserved).
    * The manifest cannot carry this signal — its keys are `.prism/`-relative
    * (see `PRISM_OWNED_GLOBS`), and a root `AGENTS.md` is not a `.prism/` path.
    */
   export const AGENTS_MD_SEEDED_MARKER =
   	"<!-- prism:seeded-agents-md — this AGENTS.md was created by `prism adopt --seed-agents-md`; prism eject will remove it. Delete this line if you want to keep the file after ejecting. -->";

   /**
    * The minimal root `AGENTS.md` body `prism adopt --seed-agents-md` writes when
    * none exists. Carries the provenance marker plus an empty Tier-1 begin/end
    * marker pair so the next `pnpm prism:build` run's `syncAgentsMdTier1Block`
    * finds the pair and fills it via `replaceTier1Block` — no build.ts change
    * needed, because the file is present after seeding (the early-return at
    * build.ts:476-478 only fires on an absent file).
    */
   export function renderSeededAgentsMd(): string {
   	return [
   		"# Agent Behavior Rules",
   		"",
   		AGENTS_MD_SEEDED_MARKER,
   		"",
   		"PRISM manages the generated block below. Run `pnpm prism:build` to fill it",
   		"with the always-on Tier-1 rule bodies your Codex-based agents load. See",
   		"docs/adopting-into-existing-repos.md.",
   		"",
   		`${AGENTS_MD_BLOCK_BEGIN}`,
   		"",
   		`${AGENTS_MD_BLOCK_END}`,
   		"",
   	].join("\n");
   }
   ```

   Note the empty begin/end pair: `replaceTier1Block` (`agents-md-block.ts:118-125`) tests for the marker pair first and does a clean regex replace when it matches, so the seeded stub is maintained by every subsequent build without ever hitting the `## Behavioral norms` anchor path or the append fallback. Verification: `pnpm run prism:check-types`.

3. **Seed the file in `runAdopt`, gated on opt-in + absence.** File: `scripts/ai-skills/adopt.ts`.

   (a) Add `seedAgentsMd?: boolean` to the `runAdopt` options object (line 171-175) and thread it: `const { prismSourceRoot, consumerRepoRoot, dryRun = false, seedAgentsMd = false } = options;` (line 176).

   (b) Add a field to `AdoptSummary` (line 43-48): `agentsMdSeeded: boolean;`.

   (c) Import the seed helpers at the top of `adopt.ts` alongside the existing imports:

   ```ts
   import { renderSeededAgentsMd } from "./agents-md-block";
   ```

   (d) Write the seed **after** `collectRootFileNotices` runs (line 217) and before the `return` (line 219). The seed must only fire when opt-in is given AND `AGENTS.md` is absent — reuse the same `pathExists` check `collectRootFileNotices` already performs, and respect `dryRun` (compute the outcome, guard the write — the pattern the whole file uses):

   ```ts
   	const agentsMdPath = path.join(consumerRepoRoot, "AGENTS.md");
   	const agentsMdAbsent = !(await pathExists(agentsMdPath));
   	const agentsMdSeeded = seedAgentsMd && agentsMdAbsent;

   	if (agentsMdSeeded && !dryRun) {
   		await fs.writeFile(agentsMdPath, renderSeededAgentsMd(), "utf8");
   	}

   	return { pathsProvisioned, seed, update, rootFileNotices, agentsMdSeeded };
   ```

   Do **not** move or duplicate the notice logic — `collectRootFileNotices` still runs and returns the absent-AGENTS.md notice. When the seed fires, `reportSummary` prints an additional seeded-confirmation line (task 3f); the absent-warning notice is still accurate at the moment adopt inspected the file, and the seed-confirmation line that follows tells the reader the gap was just closed. (See Decision 4 for why both print rather than suppressing the warning.)

   (e) Thread the flag through `runAdoptCli` (line 222-246): after `const dryRun = parseDryRunFlag(argv);` (line 239) add `const seedAgentsMd = parseSeedAgentsMdFlag(argv);`, import `parseSeedAgentsMdFlag` from `./lib/consumer-root` (extend the existing import block at line 21-26), and pass it into the `runAdopt` call (line 243): `await runAdopt({ prismSourceRoot: prismRepoRoot, consumerRepoRoot, dryRun, seedAgentsMd });`.

   (f) Print the seed confirmation in `reportSummary` (line 248-311). Destructure `agentsMdSeeded` from `summary` (line 249), and after the `for (const notice of rootFileNotices)` loop (line 308-310) add:

   ```ts
   	if (agentsMdSeeded) {
   		console.log(
   			dryRun
   				? `${prefix} would seed a minimal AGENTS.md — run pnpm prism:build to fill its Tier-1 rules block.`
   				: `${prefix} seeded a minimal AGENTS.md — run pnpm prism:build to fill its Tier-1 rules block.`
   		);
   	}
   ```

   Verification: `pnpm run prism:check-types`.

4. **Teach `prism eject` to remove a PRISM-seeded `AGENTS.md`.** File: `scripts/ai-skills/eject.ts`.

   The current `collectRootFileNotices` (line 414-433) only *notices* AGENTS.md/CLAUDE.md — it never deletes a root file. Extend eject so a PRISM-seeded `AGENTS.md` (one carrying `AGENTS_MD_SEEDED_MARKER`) is removed, while a consumer-authored one (marker absent) is preserved with the existing notice.

   (a) Import the marker: extend the existing import from `./agents-md-block` (line 37) to `import { AGENTS_MD_BLOCK_BEGIN, AGENTS_MD_BLOCK_END, AGENTS_MD_SEEDED_MARKER } from "./agents-md-block";`.

   (b) Add a root-file removal pass. In `runEject` (line 442-489), after the manifest removal (line 472-476) and before `collectRootFileNotices` (line 478), add a step that reads `AGENTS.md`, and when it contains `AGENTS_MD_SEEDED_MARKER`, removes it (guarded by `previewOnly`). Track the removal so the report can name it. Add a helper mirroring the compute-then-guard shape:

   ```ts
   /**
    * Removes a PRISM-seeded root `AGENTS.md` — one carrying
    * `AGENTS_MD_SEEDED_MARKER`, written by `prism adopt --seed-agents-md`. A root
    * `AGENTS.md` without the marker is consumer-authored (or had the marker line
    * deleted on purpose) and is never removed. Returns the notice describing what
    * happened, or null when there is no seeded file to act on.
    */
   async function removeSeededAgentsMd(
   	consumerRepoRoot: string,
   	previewOnly: boolean
   ): Promise<{ removed: boolean; notice: string } | null> {
   	const agentsMdPath = path.join(consumerRepoRoot, "AGENTS.md");
   	const content = await readFileIfExists(agentsMdPath);

   	if (content === null || !content.includes(AGENTS_MD_SEEDED_MARKER)) {
   		return null;
   	}

   	if (!previewOnly) {
   		await fs.rm(agentsMdPath);
   	}

   	return {
   		removed: true,
   		notice: previewOnly
   			? "Would remove PRISM-seeded AGENTS.md (carries the prism:seeded-agents-md marker)."
   			: "Removed PRISM-seeded AGENTS.md (carried the prism:seeded-agents-md marker).",
   	};
   }
   ```

   Call it in `runEject` and fold its notice into `rootFileNotices`:

   ```ts
   	const seededAgentsMdResult = await removeSeededAgentsMd(consumerRepoRoot, previewOnly);
   	const rootFileNotices = await collectRootFileNotices(consumerRepoRoot);

   	if (seededAgentsMdResult !== null) {
   		rootFileNotices.unshift(seededAgentsMdResult.notice);
   	}
   ```

   Sequence note: `removeSeededAgentsMd` runs **before** `collectRootFileNotices`, so after the seeded file is deleted, `collectRootFileNotices` no longer finds an `AGENTS.md` and emits no stale "contains a PRISM-generated block" notice for a file that's now gone. When `previewOnly`, the file stays and `collectRootFileNotices` still names it — correct for a preview.

   (c) `collectRootFileNotices` (line 414-433) is unchanged for the consumer-authored case: an `AGENTS.md` without the seeded marker still flows through its existing `AGENTS_MD_BLOCK_BEGIN` / present-notice logic and is preserved. No edit to that function's body.

   Verification: `pnpm run prism:check-types`.

5. **Tighten the loose eject test assertion (Eric's L374 minor, folded in).** File: `scripts/ai-skills/eject.test.ts:549`. The current assertion `report.preservedNotices.some((n) => n.includes("CLAUDE.md"))` (line 549) passes on any notice merely mentioning "CLAUDE.md" — it would not catch a regression in the corrected wording. Pin it to the exact corrected string from `eject.ts:428`:

   Replace line 549:
   ```ts
   		assert.ok(report.preservedNotices.some((n) => n.includes("CLAUDE.md")));
   ```
   with:
   ```ts
   		assert.ok(
   			report.preservedNotices.some(
   				(n) => n === "CLAUDE.md is present but was not created by PRISM — review manually before deleting."
   			)
   		);
   ```

   This is same-scope per `.claude/rules/followup-scope.md` (same file family, this lane already touches eject tests). Verification: `pnpm run prism:test`.

6. **Add adopt seed tests.** File alongside `scripts/ai-skills/adopt.test.ts`. Cover the three seed branches against a fixture consumer root (follow the existing `adopt.test.ts` fixture setup for `runAdopt` — config.json present, git repo, no `.sync-manifest.json`):
   - **seed-when-absent-opt-in**: no `AGENTS.md` at consumer root + `seedAgentsMd: true` → after `runAdopt`, `AGENTS.md` exists, its content includes `AGENTS_MD_SEEDED_MARKER` and the `AGENTS_MD_BLOCK_BEGIN`/`END` pair, and `summary.agentsMdSeeded === true`.
   - **no-seed-when-absent-without-opt-in**: no `AGENTS.md` + `seedAgentsMd` omitted/false → `AGENTS.md` does not exist after `runAdopt`, `summary.agentsMdSeeded === false`, and the absent-AGENTS.md notice still appears in `summary.rootFileNotices`.
   - **no-seed-when-present**: an existing `AGENTS.md` (arbitrary consumer content) + `seedAgentsMd: true` → file content is byte-identical to what was written before adopt, `summary.agentsMdSeeded === false`.
   - **dry-run seeds nothing**: no `AGENTS.md` + `seedAgentsMd: true` + `dryRun: true` → `AGENTS.md` does not exist after `runAdopt`, but `summary.agentsMdSeeded === true` (the outcome is computed even in preview).

   Verification: `pnpm run prism:test`.

7. **Add eject seed-reversal tests.** File: `scripts/ai-skills/eject.test.ts`, alongside the existing `// --- AGENTS.md / CLAUDE.md reporting ---` block (line 526+). Cover:
   - **eject-removes-seeded**: write a root `AGENTS.md` containing `AGENTS_MD_SEEDED_MARKER`, run `runEject` with `confirmed: true, dryRun: false` → the file no longer exists, and `report.preservedNotices` includes the "Removed PRISM-seeded AGENTS.md" notice.
   - **eject-preserves-consumer-authored**: write a root `AGENTS.md` **without** the marker (e.g. the existing test's `${AGENTS_MD_BLOCK_BEGIN}...${AGENTS_MD_BLOCK_END}` fixture, which has no seeded marker) → after `runEject`, the file still exists and the existing "contains a PRISM-generated block" preserve notice is present. (The existing test at line 528 already asserts preservation for the marker-less case — extend or add a sibling asserting the seeded marker is what flips the behavior.)
   - **eject preview keeps a seeded file**: seeded `AGENTS.md` + `confirmed: false` (or `dryRun: true`) → file still exists, and the notice reads "Would remove PRISM-seeded AGENTS.md".

   Verification: `pnpm run prism:test`.

8. **Verification gate for the whole change set:** `pnpm run prism:check-types`, `pnpm run prism:crossref-lint`, `pnpm run prism:test`, `pnpm run prism:build` — all clean. Sequence: types → lint → test can run in parallel; build last (per `.claude/rules/verification-commands.md`).

9. **Open the PR once code + docs land** — see `.claude/rules/skill-routing.md § Authors ship, reviewers review`. Update this plan's `## History` and `## PR Readiness` after implementing.

### Eli (documentation)

1. **Update `docs/adopting-into-existing-repos.md`** (written in L374) to describe the opt-in seed path alongside the existing absent-AGENTS.md warning. The doc currently says a consumer with no `AGENTS.md` must add one by hand — add the `prism adopt --seed-agents-md` path as the automatic alternative:
   - What the flag does: seeds a minimal `AGENTS.md` carrying PRISM's generated Tier-1 block markers, which `pnpm prism:build` then fills and maintains.
   - The no-overwrite guarantee: the flag only writes when `AGENTS.md` is absent; an existing file is never touched, with or without the flag.
   - The provenance + eject-reversal story: a seeded `AGENTS.md` carries the `prism:seeded-agents-md` marker comment; `prism eject` removes a seeded file but preserves a consumer-authored one. Note that deleting the marker line converts the file to consumer-authored (eject will then preserve it) — this is the documented escape hatch for a consumer who wants to keep the seeded file after ejecting.
   - Keep the by-hand path documented too — the flag is opt-in, so the manual route remains valid for consumers who don't pass it.

   Verification: `pnpm run prism:crossref-lint` clean (relative links resolve). Cross-persona note: this doc task depends on Clove's marker constant wording (task 2) landing first so the doc quotes the correct marker text — sequence after Clove tasks 2–4.

---

## Decisions

- **Opt-in mechanism: a `--seed-agents-md` CLI flag, not an interactive prompt or a config field.** (REQ-1: issue requires explicit consent, mechanism left to design.)
  - **Chosen approach:** a boolean CLI flag parsed by `parseSeedAgentsMdFlag`, mirroring the existing `parseDryRunFlag`/`parseConfirmFlag`/`--yes` shape exactly. Consent is explicit (the flag must be typed), the flow stays non-interactive (adopt is scriptable/CI-runnable today and the flag preserves that), and it composes with the existing argv-parsing convention with zero new machinery.
  - **Alternatives considered:** (1) *Interactive prompt* ("no AGENTS.md found — seed one? [y/N]"). Rejected: `runAdopt` is a pure orchestration function that returns a summary and does no I/O prompting; adding a readline prompt would break its testability seam and its CI/scripted-run compatibility. The whole adopt/eject family is deliberately prompt-free (`--yes` gates eject instead of prompting) — a prompt here would be the only interactive step in the family. (2) *Config field* (`seedAgentsMd: true` in `.ai-skills/config.json`). Rejected: a persisted config field is a standing instruction, not a one-time consent — it would silently re-seed on any future adopt-like run and muddies the "seed-once, opt-in each time" posture. A flag is per-invocation consent, which matches the trust model in `.claude/rules/lazy-artifacts.md` (files come into existence when the consumer explicitly asks, not from standing config).
  - → no promotion needed (implementation mechanism; the corrected `docs/adopting-into-existing-repos.md` is the durable consumer-facing record).

- **Seed content: a minimal STUB carrying empty Tier-1 markers, not the full Tier-1 block; `build.ts` does NOT change.** (REQ-2: Nora's key question — does the seed write the full block or a stub build maintains?)
  - **Root cause the decision turns on:** `syncAgentsMdTier1Block` early-returns only when `AGENTS.md` is **absent** (`build.ts:476-478`). Once adopt has seeded the file, it is present, so the next `pnpm prism:build` runs the full sync against it. `replaceTier1Block` (`agents-md-block.ts:118-125`) tests for the begin/end marker pair **first** and does a clean regex replace when it matches — so a stub that already contains an empty marker pair is filled and maintained by every subsequent build.
  - **Chosen approach:** seed a minimal stub — a heading, the provenance marker, a one-line pointer to `pnpm prism:build`, and an **empty** `AGENTS_MD_BLOCK_BEGIN`/`END` pair. First build after seed fills the pair via the marker-replace path; every build after that re-syncs it. The seed helper `renderSeededAgentsMd` lives in `agents-md-block.ts` next to the markers it depends on.
  - **Why this beats the full-block dump:** a full-block seed would (1) duplicate `renderTier1Block`'s output in a second code path that drifts the moment Tier-1 rules change between seed-time and the consumer's first build, and (2) require the seed to run token substitution (`substituteTokens`, `collectTier1RuleBodies`) itself — re-implementing build's job in adopt. The stub delegates all of that to the generator that already owns it. **No `build.ts` change is needed** — the early-return is correct as-is (it guards genuine absence; a seeded file is not absent). Scoping note: `build.ts` is shared, so leaving it untouched is the low-blast-radius call.
  - **Alternatives considered:** (1) *Full Tier-1 block at seed time* — rejected per above (drift + duplicated substitution logic). (2) *Change the `build.ts:476-478` early-return to create AGENTS.md when absent* — rejected: that would make `pnpm prism:build` silently create a root file in any repo lacking one, violating the opt-in/no-overwrite posture and the lazy-artifacts rule; seeding belongs in the explicitly-consented adopt flag, not in the always-on build.
  - → no promotion needed (composition detail; the code + the doc carry it).

- **Provenance marker: an in-file HTML-comment marker (`AGENTS_MD_SEEDED_MARKER`), not a manifest entry.** (REQ-3: Nora — no eject-reversal provenance convention exists yet.)
  - **Root cause the decision turns on:** the sync manifest is structurally `.prism/`-scoped. `listPrismOwnedRelativePaths` filters to `classifyPath(rel) === "prism"` and every `PRISM_OWNED_GLOBS` entry is a `.prism/`-relative path (`ownership.ts:24-30`). A root `AGENTS.md` is not under `.prism/`, so it **cannot** be a manifest key without widening the manifest's scope and schema — a shared-schema change touching `sync-manifest.ts`, `ownership.ts`, adopt, update, and eject. That blast radius is disproportionate to recording one bit of provenance.
  - **Chosen approach:** an HTML-comment marker written into the seeded file's body (`<!-- prism:seeded-agents-md ... -->`). eject keys on `content.includes(AGENTS_MD_SEEDED_MARKER)` to decide remove-vs-preserve. This composes directly with eject's **existing** `collectRootFileNotices`, which already reads `AGENTS_MD_BLOCK_BEGIN` out of the file's content (`eject.ts:419`) — reading one more marker line is the same mechanism, no new provenance store.
  - **Why the user-visibility "downside" is actually a feature:** Nora flagged that a marker in the file is user-editable (a consumer could delete it) whereas a manifest entry is more robust. Here that editability is the intended escape hatch: a consumer who wants to keep the seeded `AGENTS.md` after ejecting deletes the marker line, and eject then treats the file as consumer-authored and preserves it. The "seed-once, then it's yours if you claim it" posture matches PRISM's no-lock-in intent (the reason eject exists at all — `eject.ts:9-11`). A manifest entry would make the seeded file harder to disown, which is the wrong default for an opt-in convenience.
  - **Alternatives considered:** (1) *Manifest provenance entry* — rejected: requires widening the `.prism/`-scoped manifest to carry a repo-root path, a cross-cutting schema change across five files for one provenance bit, and it removes the consumer's disown escape hatch. (2) *A separate `.prism/.seeded-root-files` sidecar* — rejected: a new state file for one boolean is exactly the speculative-artifact shape `.claude/rules/lazy-artifacts.md` warns against; the in-file marker needs no new file.
  - → no promotion needed (the marker constant + its JSDoc in `agents-md-block.ts` and the doc are the durable record; this is an implementation convention, not a cross-cutting architectural rule).

- **No-overwrite guarantee: seed fires only when `seedAgentsMd === true` AND `AGENTS.md` is absent; the absent-warning still prints alongside the seed-confirmation.** (REQ-4.)
  - **Chosen approach:** the seed is gated on `seedAgentsMd && !(await pathExists(agentsMdPath))`. An existing `AGENTS.md` is never inspected for content or touched — the presence check short-circuits before any write. Both the existing `collectRootFileNotices` absent-warning AND a new seed-confirmation line print when the seed fires.
  - **Why print both rather than suppress the warning:** the absent-warning is computed by `collectRootFileNotices` from the file's state at inspection time, and it is accurate at that instant. The seed-confirmation line that follows ("seeded a minimal AGENTS.md — run pnpm prism:build to fill it") tells the reader the gap the warning names was just closed and what to do next. Suppressing the warning when seeding would mean re-plumbing `collectRootFileNotices` to know about the seed decision, coupling the notice pass to the seed pass for no reader benefit — the two-line sequence reads correctly as "here's the gap; here's the fix that just ran."
  - **Alternatives considered:** *Suppress the absent-warning when the seed fires* — rejected: couples two independent passes and saves the reader nothing; the ordered pair is self-explanatory.
  - → no promotion needed (behavior detail; docs + tests carry it).

- **Eric's L374 loose-assertion minor folded into this lane, not split to a follow-up.** The `eject.test.ts:549` `includes("CLAUDE.md")` assertion is same-file-family, same-subject (eject root-file notices), and this lane already edits eject tests for the seed-reversal coverage. Per `.claude/rules/followup-scope.md` the signals point to same-scope (high file/subject adjacency, small size, same persona), so it folds in as Clove task 5. Documented here as the required scope note.
  - → no promotion needed (test-tightening tactic; the task + tests are the trace).

---

## History

- 2026-07-02 [hmcgrew/393-seed-agents-md]: Winston created the plan for issue #393 (lane L-SEED, epic #373). Verified the composition points before designing — `syncAgentsMdTier1Block` early-returns only on absent file (`build.ts:476-478`), `replaceTier1Block` matches the marker pair first (`agents-md-block.ts:118-125`), and the sync manifest is `.prism/`-scoped so a root `AGENTS.md` cannot be a manifest key (`ownership.ts:24-30`, `sync-manifest.ts:45-55`). Those three facts fixed Decisions 2 (stub not full block) and 3 (in-file marker not manifest entry).

---

## Debugged Issues

---

## Review Issues

---

## Acceptance Criteria

### Behavioral

- [ ] Given a consumer repo with no `AGENTS.md` at the root, When the consumer runs `prism adopt` with the seed opt-in given, Then a minimal `AGENTS.md` is created carrying PRISM's generated-block markers and a note to run the build step, and adopt reports that it seeded the file (REQ-1, REQ-2)
- [ ] Given a consumer repo with no `AGENTS.md`, When the consumer runs `prism adopt` without the seed opt-in, Then no `AGENTS.md` is created and the existing "no AGENTS.md found" warning still prints (REQ-4)
- [ ] Given a consumer repo that already has an `AGENTS.md`, When the consumer runs `prism adopt` with or without the seed opt-in, Then the existing file is left byte-for-byte unchanged (REQ-4)
- [ ] Given a consumer seeds an `AGENTS.md` and then runs the project's build step, When the build completes, Then the file's generated block is filled with the always-on Tier-1 rule bodies (REQ-2)
- [ ] Given an `AGENTS.md` that PRISM seeded (carrying the seeded-provenance marker), When the consumer runs `prism eject` to completion, Then the seeded `AGENTS.md` is removed and the eject report names it (REQ-3)
- [ ] Given an `AGENTS.md` the consumer authored themselves (no seeded-provenance marker), When the consumer runs `prism eject`, Then the file is preserved and the eject report notes it was not created by PRISM (REQ-3)
- [ ] Given a consumer previews `prism eject` without confirming, When the report prints for a PRISM-seeded `AGENTS.md`, Then the file is left in place and the report states it would be removed (REQ-3)

### Non-behavioral

- [ ] `docs/adopting-into-existing-repos.md` describes the opt-in seed path, the no-overwrite guarantee, and the seeded-marker/eject-reversal behavior (REQ-1)
- [ ] The project's type-check, cross-reference lint, test, and build steps all pass with the new flag, seed content, eject-reversal logic, and tests added (REQ-1)
- [ ] The tightened eject test pins the exact corrected CLAUDE.md notice wording so a wording regression fails the suite (REQ-3)

### AC Adjustments

### AC Sync Log

| Date | Agent | Action | Plan | Linear |
| ---- | ----- | ------ | ---- | ------ |
| 2026-07-02 | Winston | Authored AC from issue #393 scope + Decisions 1–4 | issue-393 | N/A (GitHub issues; no AC auto-sync surface) |

---

## Cleanup Items

---

## PR Readiness

- [ ] `--seed-agents-md` flag parser added (`consumer-root.ts`)
- [ ] Seed content + provenance marker authored (`agents-md-block.ts`)
- [ ] Seed wired into `runAdopt` gated on opt-in + absence, threaded through CLI + report (`adopt.ts`)
- [ ] eject removes PRISM-seeded AGENTS.md, preserves consumer-authored (`eject.ts`)
- [ ] Loose `eject.test.ts:549` assertion tightened
- [ ] adopt seed tests + eject seed-reversal tests added
- [ ] Docs updated (Eli)
- [ ] No critical or major issues
- [ ] Types correct — no `any`, no unsafe `as`
- [ ] No stray console.logs or debug artifacts
- [ ] Tests written for new logic and edge cases
- [ ] Build passes — last run: (pending Clove)
- [ ] PR description up to date
- [ ] Lasting decisions promoted to architect context (if applicable — none pending; all four Decisions carry `no promotion needed` verdicts)

**Last updated:** 2026-07-02
