# Plan: prism-246

## Ticket

https://github.com/HunterMcGrew/PRISM/issues/246

## Goal

When adopt/update runs from inside a vendored PRISM, target the enclosing consumer repo (no global link required).

---

## User Stories

_Not populated for this ticket — vendored-model UX is addressed directly in the Goal and Design direction._

---

## Design

_No mock needed — CLI-only change._

---

## Design direction (for Winston to evaluate)

These are hypotheses and open questions for Winston to resolve — not accepted decisions.

**Current behavior:** in `scripts/ai-skills/adopt.ts` and `update.ts`, `consumerRepoRoot` is derived from `process.cwd()`. When run via `pnpm prism:adopt` inside a vendored PRISM clone, cwd resolves to the PRISM repo itself.

**Proposed detection heuristic:** when the resolved consumer target is the PRISM repo itself (cwd === self-prism-root, derivable via `resolveSelfPrismSource` from #245), retarget to the enclosing consumer repo instead. Rationale: adopting PRISM into PRISM is nonsensical, so "run from inside PRISM" unambiguously means "adopt the repo that contains me."

**Robustness nuance Winston must resolve:** "one level up" is too literal. If PRISM is vendored at `repo/tools/PRISM`, the naïve `..` resolves to `tools/`, not the repo root. The likely correct rule is "walk up to the nearest enclosing git repo that is not PRISM itself." Winston decides the exact algorithm and whether a `--consumer-root <path>` override flag is warranted for edge cases.

**Coexistence requirement:** this adds the vendored/parent-targeting default — it does not remove the global-link / standalone model. Running `prism adopt` from a separate consumer cwd (global binary workflow) must continue to work unchanged. Winston defines resolution precedence (e.g., explicit flag > vendored-parent-detection > cwd).

---

## Implementation Tasks

All tasks land in `scripts/ai-skills/`. The design adds one resolver function, wires it into the two CLI entry points, adds a `--consumer` override flag, and documents the vendored workflow. No adopt/update internals change.

### Clove (implementation)

1. **Add `resolveConsumerRoot` to a new file `scripts/ai-skills/lib/consumer-root.ts`.** This is the core of the ticket — consumer-target resolution. New file, full content below. It exports one function plus a small typed result. The function takes the explicit-flag value (or `null`), the cwd, and the self-PRISM root, and returns the resolved consumer root or throws a clear error. It shells out to `git` via `node:child_process` `execFileSync` (already the project's runtime; no new dependency).

   Full file content:

   ```ts
   /**
    * Resolves which repo a consumer-side adopt/update run targets.
    *
    * Default behavior is cwd — the standalone/global-link workflow from #245 is
    * unchanged. The vendored case is the new path: when adopt/update runs from
    * inside a PRISM checkout (cwd resolves under the PRISM root), targeting PRISM
    * itself is nonsensical, so resolution retargets to the git repository that
    * encloses PRISM. An explicit `--consumer <dir>` flag overrides both.
    *
    * Enclosing-repo detection leans entirely on `git rev-parse`, never on manual
    * `.git` parsing:
    *   - PRISM vendored as a plain subdirectory (no own `.git`) — the common case —
    *     `git -C <prismRoot> rev-parse --show-toplevel` already returns the
    *     enclosing consumer root, because PRISM is not its own repo. Works at any
    *     nesting depth (`repo/PRISM`, `repo/tools/PRISM`).
    *   - PRISM as a git submodule — `.git` is a gitdir file; `git rev-parse
    *     --show-superproject-working-tree` returns the superproject (consumer) root.
    *   - PRISM as a nested standalone clone (own `.git`, not a submodule) —
    *     `show-toplevel` returns PRISM's own root and `show-superproject` is empty;
    *     resolution re-runs `show-toplevel` from PRISM's parent directory to find
    *     the enclosing repo.
    *   - PRISM not enclosed by any other git repo — all probes resolve to PRISM
    *     itself or fail; resolution throws rather than silently adopting `/` or home.
    */
   import { execFileSync } from "node:child_process";
   import path from "node:path";

   /** Runs a git command in `cwd`, returning trimmed stdout or null on any failure. */
   function gitCapture(args: string[], cwd: string): string | null {
   	try {
   		const out = execFileSync("git", args, {
   			cwd,
   			encoding: "utf8",
   			stdio: ["ignore", "pipe", "ignore"],
   		});
   		const trimmed = out.trim();

   		return trimmed.length > 0 ? trimmed : null;
   	} catch {
   		return null;
   	}
   }

   /**
    * Finds the git repository that encloses the PRISM checkout, or null when PRISM
    * is not nested inside another repo. See the file header for the three git
    * probes and why each is needed.
    */
   export function resolveEnclosingConsumerRoot(prismRoot: string): string | null {
   	const topLevel = gitCapture(["rev-parse", "--show-toplevel"], prismRoot);

   	// Plain-subdirectory case: PRISM has no own .git, so show-toplevel already
   	// points at the enclosing consumer repo. Resolved.
   	if (topLevel !== null && path.resolve(topLevel) !== path.resolve(prismRoot)) {
   		return path.resolve(topLevel);
   	}

   	// PRISM has its own repo identity (topLevel === prismRoot). Submodule first:
   	// the superproject working tree is the consumer.
   	const superproject = gitCapture(
   		["rev-parse", "--show-superproject-working-tree"],
   		prismRoot
   	);
   	if (superproject !== null) {
   		return path.resolve(superproject);
   	}

   	// Nested standalone clone: step out of PRISM and ask git again from the parent.
   	const parent = path.dirname(path.resolve(prismRoot));
   	if (parent === path.resolve(prismRoot)) {
   		return null;
   	}

   	const parentTopLevel = gitCapture(["rev-parse", "--show-toplevel"], parent);
   	if (
   		parentTopLevel !== null &&
   		path.resolve(parentTopLevel) !== path.resolve(prismRoot)
   	) {
   		return path.resolve(parentTopLevel);
   	}

   	return null;
   }

   /**
    * Resolves the consumer root for an adopt/update run.
    *
    * Precedence: explicit `--consumer <dir>` > vendored-parent detection (cwd is
    * inside PRISM) > cwd. The vendored branch only fires when cwd resolves to the
    * PRISM root itself — running adopt/update from a separate consumer cwd keeps
    * the #245 behavior untouched.
    */
   export function resolveConsumerRoot(options: {
   	explicitConsumer: string | null;
   	cwd: string;
   	selfPrismRoot: string;
   }): string {
   	const { explicitConsumer, cwd, selfPrismRoot } = options;

   	if (explicitConsumer !== null) {
   		return path.resolve(cwd, explicitConsumer);
   	}

   	const runningFromInsidePrism =
   		path.resolve(cwd) === path.resolve(selfPrismRoot);
   	if (!runningFromInsidePrism) {
   		return path.resolve(cwd);
   	}

   	const enclosing = resolveEnclosingConsumerRoot(selfPrismRoot);
   	if (enclosing === null) {
   		throw new Error(
   			"prism: running from inside the PRISM checkout, but PRISM is not nested " +
   				"inside another git repository — there is no consumer repo to target. " +
   				"Run from your consumer repo, vendor PRISM inside it, or pass " +
   				"--consumer <path-to-consumer-repo>."
   		);
   	}

   	if (path.resolve(enclosing) === path.resolve(selfPrismRoot)) {
   		throw new Error(
   			"prism: enclosing-repo detection resolved back to the PRISM checkout " +
   				"itself — refusing to adopt PRISM into PRISM. Pass --consumer <path> " +
   				"to target the consumer repo explicitly."
   		);
   	}

   	return path.resolve(enclosing);
   }

   /** Parses the `--consumer <dir>` / `--consumer=<dir>` flag from argv, or null. */
   export function parseConsumerFlag(argv: string[]): string | null {
   	const flagIndex = argv.indexOf("--consumer");
   	if (flagIndex !== -1 && argv[flagIndex + 1]) {
   		return argv[flagIndex + 1];
   	}

   	const inlineFlag = argv.find((arg) => arg.startsWith("--consumer="));
   	if (inlineFlag) {
   		return inlineFlag.slice("--consumer=".length);
   	}

   	return null;
   }
   ```

   Mirror the flag-parsing shape of `resolvePrismSource` (`update.ts:573–593`) for `parseConsumerFlag` — both space-separated and `=`-joined forms. Verification: `pnpm prism:check-types`.

2. **Wire `resolveConsumerRoot` into `runAdoptCli`** in `scripts/ai-skills/adopt.ts:134–151`. After task 1. Replace the opening of `runAdoptCli`:

   - Current `adopt.ts:135`: `const consumerRepoRoot = process.cwd();`
   - Replace with:
     ```ts
     const argv = process.argv.slice(2);
     const consumerRepoRoot = resolveConsumerRoot({
     	explicitConsumer: parseConsumerFlag(argv),
     	cwd: process.cwd(),
     	selfPrismRoot: resolveSelfPrismSource(),
     });
     const prismRepoRoot = resolvePrismSource(argv, consumerRepoRoot);
     ```
   - The existing `resolvePrismSource(process.argv.slice(2), consumerRepoRoot)` call on `adopt.ts:136` is replaced by the `argv`-variable version above (reuse the one `argv` binding rather than slicing twice).
   - Add imports at the top of `adopt.ts` (the import block, lines 17–23): `import { resolveConsumerRoot, parseConsumerFlag } from "./lib/consumer-root";` and add `resolveSelfPrismSource` to the existing `import { resolvePrismSource, runUpdate, type UpdateSummary } from "./update";` line (becomes `import { resolvePrismSource, resolveSelfPrismSource, runUpdate, type UpdateSummary } from "./update";`).

   Safety note for Clove: do not remove `runAdopt`'s internal `assertConsumerIsEstablished` guard (`adopt.ts:121`) — it is the blast-radius backstop. A mis-resolved consumer that happens to already hold a `.sync-manifest.json` is refused; one that doesn't gets seeded (file-additive, never deletes). Verification: `pnpm prism:check-types`.

3. **Wire `resolveConsumerRoot` into `runUpdateCli`** in `scripts/ai-skills/update.ts:616–633`. After task 1. Replace `update.ts:617` `const consumerRepoRoot = process.cwd();` with the same three-line block as task 2 (using the local `argv` binding), and change `update.ts:618` `resolvePrismSource(process.argv.slice(2), consumerRepoRoot)` to `resolvePrismSource(argv, consumerRepoRoot)`. Add the import `import { resolveConsumerRoot, parseConsumerFlag } from "./lib/consumer-root";` to update.ts's import block (lines 20–47). `resolveSelfPrismSource` is already defined in this file — call it directly, no import needed.

   Safety note for Clove: leave the existing `update.ts:628` guard (`path.resolve(prismRepoRoot) === path.resolve(consumerRepoRoot)` → refuse) in place. With the new resolution it becomes the second safety net: if detection ever returned the PRISM root as the consumer, update refuses before any file movement, and `assertSourceIsPlausible` (`update.ts:603`) refuses an empty/mispointed source independently. Verification: `pnpm prism:check-types`.

4. **Add a `--consumer` mention to the `prism` CLI usage text** in `scripts/ai-skills/cli.ts:18–25`. After tasks 2–3. Append one line to the `USAGE` template literal, after the existing `--prism-source` sentence:

   > `Pass --consumer <path> to target a specific consumer repo (defaults to the`
   > `current repo, or — when run from inside a vendored PRISM — the repo that`
   > `contains PRISM).`

   Content-only change, no build effect — `pnpm prism:check-types` still confirms the template compiles.

5. **Add unit tests for the resolver** in a new file `scripts/ai-skills/consumer-root.test.ts`. After task 1. Follow the `node:test` + `node:assert/strict` + `fs.mkdtemp` fixture style of `cli.test.ts` (lines 10–23, 116–151). The git-topology cases need real git repos in temp dirs — initialize them with `execFileSync("git", ["init", "-q"], { cwd })` and friends inside the fixture. Required test cases (one `test(...)` each):

   - **Explicit flag wins** — `resolveConsumerRoot({ explicitConsumer: "../somewhere", cwd, selfPrismRoot: cwd })` returns `path.resolve(cwd, "../somewhere")`, even when cwd === selfPrismRoot (flag beats vendored detection).
   - **cwd default when not inside PRISM** — `cwd !== selfPrismRoot`, no flag → returns `path.resolve(cwd)` and never shells out to git (the #245 standalone path).
   - **Plain-subdirectory vendoring** — temp `consumer/` (git init) containing `consumer/PRISM/` (no own git); `resolveEnclosingConsumerRoot(prismRoot)` returns the consumer root. Assert `resolveConsumerRoot` with `cwd === selfPrismRoot === prismRoot` returns the consumer root.
   - **Deeper plain nesting** — `consumer/tools/PRISM/` (plain), same assertion → resolves to `consumer/`, proving the depth-independence.
   - **Nested standalone clone** — `consumer/` (git init) containing `consumer/PRISM/` with its own `git init`; resolver steps to the parent and returns `consumer/`.
   - **No enclosing repo** — standalone PRISM with own `.git`, no parent repo → `resolveEnclosingConsumerRoot` returns `null` and `resolveConsumerRoot` throws with a message containing `"not nested inside another git repository"`.
   - **Submodule** — optional/best-effort; submodule setup in a unit test needs `-c protocol.file.allow=always`. If it proves flaky in CI, assert the submodule path with a comment rather than a live `git submodule add`, and rely on the manual probe recorded in the plan's Decisions. Do not let a flaky submodule fixture block the suite.

   Verification: `tsx --test scripts/ai-skills/consumer-root.test.ts`, then full `pnpm prism:test`.

6. **Run the full gate.** After tasks 1–5. `pnpm prism:check` (runs build --check, check-types, prism:test, verify-manifest, crossref-lint). All green is the bar. The existing `adopt.test.ts`, `update.test.ts`, and `cli.test.ts` must stay green — the resolution change is additive at the CLI seam and does not touch `runAdopt`/`runUpdate`/`applyFilePass` signatures, so those suites should pass unmodified.

### Eli (documentation)

7. **Update `docs/adopt-prism.md` to lead with the vendored-in-repo workflow as the recommended default.** After tasks 1–4. The current doc (lines 19–31) opens with the global-link one-time setup as the only path. Restructure so the vendored workflow is the first, recommended quickstart and global-link becomes the alternative:

   - Add a new section after "What you need" titled **"Recommended: vendor PRISM inside your repo"** describing the flow: `git clone`/submodule PRISM into a subdirectory of the consumer repo (e.g. `your-repo/PRISM`), then:
     ```bash
     cd your-repo/PRISM
     pnpm install
     pnpm prism:adopt
     ```
     Explain that `pnpm prism:adopt` run from inside a vendored PRISM auto-targets the enclosing repo — no global link, no PATH setup. State that it works at any nesting depth and for plain-subdir, nested-clone, or submodule vendoring. Steady state is `pnpm prism:update` from the same `your-repo/PRISM` dir.
   - Demote the existing "One-time setup" / `pnpm link --global` section to an **"Alternative: global `prism` command"** section, kept for the standalone-clone workflow, with its existing PATH gotcha.
   - Add `--consumer <path>` to the "Override the auto-derived source" section: note it targets a specific consumer repo, e.g. `pnpm prism:adopt --consumer /path/to/consumer` when running from a PRISM checkout that isn't vendored inside the target.

   Content-only — no build/test impact. Keep the existing frontmatter `last_updated` current.

---

## Decisions

- **Consumer-target resolution algorithm.**
  - **Root cause:** consumer was hardcoded to `process.cwd()` (`adopt.ts:135`, `update.ts:617`). For a vendored PRISM (`cd repo/PRISM && pnpm prism:adopt`), cwd is the PRISM root, so it would try to adopt PRISM into itself.
  - **Alternatives considered:** (a) naïve "one level up" (`path.dirname(prismRoot)`); (b) manual walk up the tree looking for a `.git` directory; (c) lean on `git rev-parse`.
  - **Chosen approach:** (c) `git rev-parse`. Beats (a) — "one level up" breaks at `repo/tools/PRISM`, where the parent is `tools/`, not the repo root. Beats (b) — manual `.git` detection has to special-case submodule gitdir *files* vs. directories, reimplementing what git already does correctly. `git rev-parse --show-toplevel` walks up to the enclosing repo at any depth and handles submodule `.git` files natively.
  - **The algorithm (empirically verified against five git topologies):**
    1. `git -C <prismRoot> rev-parse --show-toplevel`. If it returns a path ≠ prismRoot, that *is* the consumer root (plain-subdirectory vendoring — PRISM has no own `.git`, so git's walk-up already lands on the enclosing repo). Returns the consumer root at any nesting depth. **Done.**
    2. Otherwise PRISM has its own repo identity (`show-toplevel === prismRoot`). Try `git -C <prismRoot> rev-parse --show-superproject-working-tree` — non-empty means PRISM is a **submodule**, and the result is the consumer (superproject) root. **Done.**
    3. Otherwise PRISM is a **nested standalone clone**. Re-run `show-toplevel` from `path.dirname(prismRoot)`; a result ≠ prismRoot is the enclosing consumer. **Done.**
    4. Otherwise (no enclosing repo — standalone clone) → return `null`; the caller throws a clear error. Never silently adopts `/` or home.
  - **Implementation guidance:** lives in new file `scripts/ai-skills/lib/consumer-root.ts` as `resolveEnclosingConsumerRoot` (the git probes) + `resolveConsumerRoot` (precedence + error handling). Shell out via `execFileSync` (no new dependency). Full source in Implementation Task 1.
  - → no promotion needed (ticket-tactical CLI resolution logic; the algorithm is documented here and in `docs/adopt-prism.md` for users, codified in `consumer-root.ts`).

- **Resolution precedence: explicit `--consumer` flag > vendored-parent detection > cwd.**
  - **Chosen approach:** an explicit `--consumer <dir>` flag always wins (escape hatch for any topology the auto-detection mis-reads, and for adopting a consumer that isn't vendoring PRISM). When no flag, vendored detection fires *only* when `cwd === selfPrismRoot` — i.e. the run is literally from inside the PRISM checkout. Otherwise cwd is the consumer, unchanged from #245.
  - **Why the `cwd === selfPrismRoot` trigger is safe:** it's a narrow, unambiguous condition. A consumer running `prism update` from their own repo root never has cwd equal to the PRISM source root, so the global-link / standalone path is untouched. The vendored branch can only fire when the user is standing inside PRISM, which only makes sense as "adopt the repo that contains me."
  - → no promotion needed (ticket-tactical).

- **The `--consumer` override flag is warranted and shipped.**
  - **Root cause / motivation:** the git-topology walk handles all *realistic* vendoring (plain subdir at any depth, submodule, nested clone). The flag exists for the residual cases the walk can't infer: PRISM checked out *beside* the consumer rather than inside it, multiple candidate enclosing repos, or any future topology. It's also the documented escape hatch when auto-detection is wrong.
  - **Alternatives considered:** ship without the flag and rely solely on detection. Rejected — a detection-only design has no escape hatch when it guesses wrong, and the flag is ~15 lines (`parseConsumerFlag`) reusing the existing `--prism-source` parse shape.
  - **Chosen approach:** add `--consumer <dir>` / `--consumer=<dir>`, highest precedence, resolved relative to cwd.
  - → no promotion needed (ticket-tactical).

- **No-enclosing-repo case errors loudly; never silently adopts `/` or home.**
  - **Root cause:** if a user runs `pnpm prism:adopt` from inside a standalone PRISM clone that is *not* nested in any consumer repo, there is no valid target. Silently resolving to `path.dirname(prismRoot)` or `/` could point the file-movement engine at an unintended tree.
  - **Chosen approach:** `resolveEnclosingConsumerRoot` returns `null` in this case and `resolveConsumerRoot` throws a message that names all three remedies (run from the consumer, vendor PRISM inside it, or pass `--consumer`). Combined with the two existing engine guards (`assertConsumerIsEstablished` in adopt, the source-equals-consumer refusal + `assertSourceIsPlausible` in update), a mis-detected target cannot reach destructive file movement.
  - → no promotion needed (ticket-tactical; the safety-guard interaction is documented in the Safety section of the report and inline in the task safety notes).

- **Coexistence / distribution: vendored-parent and global-link both ship; vendored becomes the documented-recommended default.**
  - **Root cause:** #245's global-link model (`pnpm link --global` → `prism` on PATH) has real friction (`pnpm setup` PATH issues, pnpm-version `link` syntax drift) and optimizes for the standalone-clone workflow, while the common real-world shape is PRISM vendored *inside* the consumer repo.
  - **Alternatives considered:** (a) replace global-link with vendored-only; (b) keep global-link as the documented default, add vendored as an alternative; (c) ship both, recommend vendored.
  - **Chosen approach:** (c). Rejected (a) — the global `prism` binary is genuinely useful for someone managing many consumer repos from one PRISM clone, and removing it breaks #245's shipped, tested path. Rejected (b) — that keeps steering users into the higher-friction flow. Shipping both with vendored as the *documented-recommended* default gives the low-friction path first billing while preserving the global binary for the multi-repo maintainer. The two coexist cleanly because they're distinguished by a single unambiguous runtime condition (`cwd === selfPrismRoot`): the global binary runs from a consumer cwd (cwd ≠ PRISM root → cwd path), the vendored command runs from inside PRISM (cwd === PRISM root → enclosing-repo path).
  - **Implementation guidance:** `docs/adopt-prism.md` restructured (Task 7) to lead with the vendored quickstart and demote global-link to "Alternative." No code removed from the global-link path — `cli.ts` dispatch and `resolveSelfPrismSource` are untouched.
  - → no promotion needed (distribution-model decision specific to the consumer CLI; captured here and surfaced to Hunter via Sol's report-back. If the team later wants a durable "how PRISM is distributed" record, this is the candidate to promote to an ADR — flagging, not promoting, since it's one ticket's call.)

- **End-to-end vendored verification (implementation-side).**
  - **What was proven:** the `git rev-parse` algorithm holds at runtime, not just in unit tests. Built temp consumer repos with PRISM vendored as a plain subdir (`consumer/PRISM`), deeper (`consumer/tools/PRISM`), and as a standalone clone with no enclosing repo. Ran the vendored copy's own `cli.ts adopt` with cwd = vendored PRISM root.
  - **Results:** plain-subdir and deeper-nesting both seeded `.prism/` into the enclosing repo root (deeper case correctly skipped the intermediate `tools/` dir) and projected all 31 `prism-*` personas with the consumer's own token substitution. The cwd-default path (run from a separate consumer cwd with `--prism-source`) seeded into cwd, confirming #245 is unbroken. The no-enclosing-repo standalone clone refused with the clear error and a non-zero exit.
  - **Note on `.bak` files in the demo:** the seed lays down install-template copies, then `runUpdate` pulls newer canonical versions and preserves the seed copies as `.bak` per the documented no-manifest path. Expected safety behavior, not a defect.
  - **Submodule fixture:** ran live in the unit test (`-c protocol.file.allow=always`) without needing softening in this environment; the test wraps the `git submodule add` in a try/catch so a CI environment that blocks file:// submodule transport skips the assertion rather than failing the suite.
  - → no promotion needed (ticket-tactical verification record).

---

## History

- 2026-06-23 [hmcgrew/prism-246-vendored-parent-target]: Nora created plan skeleton; branch set up from origin/main. Winston design pass is the next step.
- 2026-06-23 [hmcgrew/prism-246-vendored-parent-target]: Winston designed consumer-target resolution; resolved all three OPEN decisions. Algorithm uses `git rev-parse` (verified against 5 git topologies); precedence is `--consumer` flag > vendored-parent detection > cwd; `--consumer` flag shipped; vendored model recommended as default. See Decisions and Implementation Tasks.
- 2026-06-23 [hmcgrew/prism-246-vendored-parent-target]: Clove implemented tasks 1–6 — new `lib/consumer-root.ts` resolver, wired into both CLI mains (guards intact), `--consumer` usage text, `consumer-root.test.ts` (8 tests). `pnpm prism:check` green (363 tests). Demonstrated all topologies end-to-end against real temp git repos: vendored adopt targets enclosing repo (31 personas projected with consumer tokens), deeper `tools/PRISM` nesting resolves to repo root not `tools/`, cwd-default (#245) path unbroken, no-enclosing-repo refuses with a clear non-zero exit. See Decision: end-to-end vendored verification.
- 2026-06-23 [hmcgrew/prism-246-vendored-parent-target]: Eli updated `docs/adopt-prism.md` — restructured to lead with the vendored-in-repo workflow (recommended, no global link/PATH needed), added `--consumer <path>` override section, demoted global-link to alternative. Updated `docs/getting-started.md` section heading and blurb to match. `pnpm prism:check` green.

---

## Debugged Issues

_None yet._

---

## Review Issues

_None yet._

---

## Acceptance Criteria

### Behavioral

- [x] Given PRISM is vendored as a subdirectory of a consumer repo, When the user runs `pnpm prism:adopt` from inside the PRISM directory, Then `.prism/` is seeded into the enclosing consumer repo (not into PRISM itself) and the persona roster is projected into the consumer's platform directories (REQ-1) — demonstrated: 31 personas projected with consumer tokens
- [x] Given PRISM is vendored deeper at `<consumer>/tools/PRISM`, When the user runs adopt or update from inside PRISM, Then the consumer target resolves to the top-level consumer repo, not the intermediate `tools/` directory (REQ-1) — demonstrated: seeded at repo root, absent at `tools/`
- [x] Given PRISM is a standalone clone not contained in any other git repository, When the user runs `pnpm prism:adopt` from inside it, Then the command stops with a clear error explaining there is no consumer repo to target and listing how to fix it (run from the consumer, vendor PRISM inside it, or pass `--consumer`) (REQ-1) — demonstrated: clear refusal, non-zero exit
- [x] Given a user passes `--consumer <path>` to adopt or update, When the command runs, Then it targets that path as the consumer repo regardless of where it was run from (REQ-1) — covered by unit test (explicit flag wins)
- [x] Given the consumer-side `prism update` is run from a separate consumer repo directory (the global-command workflow), When it runs, Then it targets the current directory exactly as before this change (REQ-1) — demonstrated: cwd-default seeds into cwd, #245 unbroken
- [x] Given PRISM is vendored as a git submodule of the consumer repo, When the user runs adopt or update from inside the submodule, Then the consumer target resolves to the superproject (consumer) repo root (REQ-1) — covered by unit test (submodule fixture, ran live)

### Non-behavioral

- [x] The existing adopt, update, and CLI test suites pass unchanged (REQ-1)
- [x] A mis-detected or empty consumer target is caught by an existing guard before any file is deleted — no resolution path can reach destructive file movement on the wrong tree (REQ-1) — three guards preserved + resolver belt-and-suspenders throw
- [x] `pnpm prism:check` passes (build check, type-check, tests, manifest verification, crossref lint) (REQ-1)

### AC Sync Log

| Date | Agent | Action | Plan | Linear |
| ---- | ----- | ------ | ---- | ------ |

---

## Cleanup Items

_None yet._

---

## PR Readiness

- [x] No critical or major issues
- [x] Types correct — no `any`, no unsafe `as`
- [x] No stray console.logs or debug artifacts
- [x] Tests written for new logic and edge cases
- [x] All debugged issues resolved (no `open` entries)
- [x] Build passes — last run: 2026-06-23 (`pnpm prism:check` green, 363 tests)
- [ ] PR description up to date (Clove offers; PR not yet opened)
- [x] Lasting decisions promoted to architect context (if applicable) — none warranted; all Decisions are ticket-tactical with explicit `no promotion needed` verdicts

**Last updated:** 2026-06-23
