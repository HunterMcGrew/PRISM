# Plan: chore-manifest-hygiene-dev-doc

## Ticket

Internal infrastructure — no Linear ticket. Closes the manifest-cleanup + paired-dev-doc surface from the abandoned PR #4 (`hmcgrew/context-optimization-thrive-learnings`). Companion to a follow-up "lazy-load heavy personas" ticket that opens after this one merges.

## Goal

Replace the `**` catch-all in `.prism/architect/manifest.json` with explicit globs that preserve `skills-ecosystem.md` coverage for all current consumers, prove the preservation with a re-runnable verification script, and ship the long-overdue paired dev doc for ADR-0035.

---

## Implementation Tasks

Branch: `hmcgrew/chore-manifest-hygiene-dev-doc` (branched from `origin/main`).

### Clove (implementation)

1. **Confirm the OPEN Decision resolution. No code change.**
   - Action: read the `## Decisions` entry "No code-level consumer of `.prism/architect/manifest.json` exists" (added during Winston re-evaluation). Confirm the resolution stands by re-running the verification grep: `grep -rn "manifest.json" scripts/ai-skills/ .ai-skills/ 2>/dev/null`. Expected output: matches only in `scripts/ai-skills/path-guard.test.ts:56` (test data) and `.ai-skills/skills/*/shared.md` (skill specs telling LLM personas to read the manifest).
   - If the grep surfaces a *code-level* consumer that wasn't there at re-eval time (e.g. a new script parsing manifest.json), STOP and escalate — the swap's safety assumptions need to be re-validated against that consumer's matcher logic.
   - Verification: no file changes; the grep result confirms the resolved Decision. Task 1 is a one-minute confirmation before proceeding.
   - Sequence: first task; gates tasks 2–8.

2. **Derive the explicit-glob replacement set from current `skills-ecosystem.md` dependencies.**
   - File: `.prism/plans/chore-manifest-hygiene-dev-doc.md` (this plan) — record the derived set as a new `## Decisions` entry titled "Derived explicit-glob replacement set" *before* applying in task 6, so Briar/Eric can review the proposed swap without diffing the manifest.
   - Derivation: run `grep -rn "skills-ecosystem" .ai-skills/ .claude/ .prism/ AGENTS.md 2>/dev/null` to enumerate every surface that references the doc. Map each reference to the glob(s) needed.
   - Starting set (verify and extend during derivation — keep entries that survive the grep, drop entries that don't, add entries the grep surfaces):
     - `.claude/skills/**/SKILL.md` (every Claude skill startup)
     - `.codex/agents/**` (Codex equivalent)
     - `.cursor/skills/**/SKILL.md` (Cursor equivalent)
     - `.ai-skills/skills/**/shared.md` (canonical sources)
     - `AGENTS.md` (cross-references throughout)
     - `.prism/SPEC.md`, `.claude/SPEC.md` (routing lookups)
     - Likely additions surfaced during re-eval: `.prism/plans/**`, `.prism/architect/**`, `.prism/rules/**`, `.prism/spec/adrs/**`, `.prism/references/**`, `.prism/lessons.md` — any session touching these needs the persona roster
   - **Do not copy PR 4's replacement set verbatim.** Re-derive against current usage — the dependency surface has shifted in 19 days.
   - Verification: the new `## Decisions` entry lists the derived glob set with one bullet per glob and a one-line "why this glob" justification per entry.
   - Sequence: after task 1.

3. **Write the verification script at `scripts/ai-skills/verify-manifest-coverage.ts` and its paired `verify-manifest-coverage.test.ts`.**
   - File: `scripts/ai-skills/verify-manifest-coverage.ts` (new)
   - **Implements** the matcher contract from `.prism/references/architect-context.md:14–22` ("iterate the full file list and check each path against every key in `manifest.json`. For each file, walk every manifest key and collect all matches"). Note: there is no runtime code consumer to test against (see `## Decisions` § "No code-level consumer..."); the script implements the contract *independently* to validate spec-level coverage.
   - Matcher rules to support (derive from current manifest entries):
     - Exact path match (e.g. `.prism/SPEC.md`)
     - Directory prefix match with trailing `/` (e.g. `.claude/skills/prism-qa-test-plan/`)
     - Glob pattern with `**` and `*` wildcards (e.g. `.claude/skills/**`, `.prism/rules/**/*.md`)
   - Test set (each entry: name + representative file-scope + expected-loaded docs):
     - `nora` — file scope `[".claude/skills/prism-ticket-start/SKILL.md", ".prism/plans/example.md"]` → MUST include `skills-ecosystem.md`
     - `zoe` — file scope `[".claude/skills/prism-zoe/SKILL.md", ".prism/lessons.md", ".prism/spec/adrs/0035-rule-loading-tiers.md"]` → MUST include `skills-ecosystem.md`
     - `winston` — file scope `[".claude/skills/prism-architect/SKILL.md"]` → MUST include `skills-ecosystem.md`
     - `eric` — file scope `[".claude/skills/prism-code-review-pr/SKILL.md"]` → MUST include `skills-ecosystem.md`
     - `sage` (control) — file scope `[".claude/skills/prism-changelog/SKILL.md"]` → MAY lose `skills-ecosystem.md` after the swap (proves the swap removes a real entry, not just a vacuous one)
     - `fallthrough` (control) — file scope `["scripts/ai-skills/build.ts"]` → expected to match `install-layout.md` and `spec-editing.md`, no `skills-ecosystem.md` after the swap
   - Output: prints JSON `{[personaName]: string[]}` (sorted doc filenames) to stdout. Exit 0 on success.
   - CLI shape: read `scripts/ai-skills/build.ts` lines 81–93 for the script-directory + repo-root resolution pattern; read `scripts/ai-skills/path-guard.ts` for the matcher-logic + violation-reporting pattern. Use the same `tsx` invocation style and `node:fs/promises` import shape.
   - Paired test: `scripts/ai-skills/verify-manifest-coverage.test.ts` — at minimum, fixture tests for the three matcher rules (exact, prefix, glob) using `node:test`. Follow the shape of `scripts/ai-skills/path-guard.test.ts`.
   - Header comment (JSDoc): purpose, when to run (any `manifest.json` edit), how it composes with `pnpm prism:check`, and the matcher-contract citation to `.prism/references/architect-context.md`.
   - Verification: `tsx scripts/ai-skills/verify-manifest-coverage.ts` exits 0 with valid JSON on stdout; `tsx --test scripts/ai-skills/verify-manifest-coverage.test.ts` passes all matcher-rule fixture tests.
   - Sequence: parallel with task 2 (independent); both must complete before task 4.

4. **Wire the script to `package.json` and into `pnpm prism:check`.**
   - File: `package.json` lines 7–13 (the `scripts` object)
   - Change A — add a new script entry. Insert this line in the `scripts` object (alphabetical order suggests between `prism:check-types` and `prism:test`):
     ```json
     "prism:verify-manifest": "tsx scripts/ai-skills/verify-manifest-coverage.ts",
     ```
   - Change B — chain `prism:verify-manifest` into `prism:check`. Replace the exact line:
     ```json
     "prism:check": "tsx scripts/ai-skills/build.ts --check && pnpm run prism:test",
     ```
     with:
     ```json
     "prism:check": "tsx scripts/ai-skills/build.ts --check && pnpm run prism:test && pnpm run prism:verify-manifest",
     ```
   - Verification: `pnpm prism:verify-manifest` exits 0; `pnpm prism:check` runs build-check → tests → verify-manifest in sequence and reports the new step in its output.
   - Sequence: after task 3.

5. **Capture the pre-swap baseline.**
   - Sequence: must run BEFORE task 6 (the swap). With task 3's script in place but the manifest still carrying `"**": "skills-ecosystem.md"`, run:
     ```bash
     pnpm prism:verify-manifest > /tmp/manifest-baseline.json
     ```
   - Verification: `cat /tmp/manifest-baseline.json` shows the expected `{persona: [docs]}` map with `skills-ecosystem.md` present in every expected-positive persona's load set.
   - **Why baseline before swap:** Briar's verification (task 10) requires before/after diff. Without the baseline, post-swap output is uncheckable.

6. **Swap `.prism/architect/manifest.json` and regenerate platform mirrors.**
   - Step A: Edit `.prism/architect/manifest.json` — remove the exact line `"**": "skills-ecosystem.md"` (currently line 37); add the explicit-glob entries derived in task 2 (recorded in `## Decisions`).
   - Step B: Run `pnpm prism:build` to regenerate the platform mirrors (`.claude/architect/manifest.json`, `.codex/architect/manifest.json`, `.cursor/architect/manifest.json`). `.prism/architect/` is in `COPIED_CONTENT_AREAS` per `scripts/ai-skills/build.ts:370` — without this step, platform mirrors stay stale and `pnpm prism:check` flags drift.
   - Step C: Capture the post-swap output: `pnpm prism:verify-manifest > /tmp/manifest-postswap.json`.
   - Verification: `diff /tmp/manifest-baseline.json /tmp/manifest-postswap.json` shows no diff except for the control cases (`sage` may lose `skills-ecosystem.md`, `fallthrough` matches install-layout + spec-editing). Any expected-positive persona losing `skills-ecosystem.md` is a regression — investigate and add a glob to cover it before continuing.
   - Sequence: after task 5 (baseline captured); blocks task 7 only conceptually (task 7 can run in parallel since it edits a different file).

7. **Update `.prism/architect/documentation.md` Cross-Reference Map — add ADR ↔ dev-doc category.**
   - File: `.prism/architect/documentation.md`
   - Locate the Cross-Reference Map table (around line 116–119, currently with two sample rows for `.prism/rules/` and `.prism/architect/` pairings).
   - Add this exact row after the last existing row:
     ```markdown
     | `.prism/spec/adrs/0035-rule-loading-tiers.md` | `docs/content/dev/architecture/rule-loading-tiers.md` | ADR specifies the rule-loading tier model; dev doc walks teammates through the same model |
     ```
   - This establishes a third pairing category (`.prism/spec/adrs/` ↔ `docs/content/dev/architecture/`) per the new `## Decisions` entry.
   - Verification: the row appears in the Cross-Reference Map, points at the file Eli is writing in task 9, and uses the same `| Agent File | Docs Counterpart | Relationship |` shape as existing rows.
   - Sequence: parallel with Eli's task 9 — but the row's right-hand path must match the path Eli creates.

8. **Run `pnpm prism:check` end-to-end.**
   - Command: `pnpm prism:check`
   - Verification: passes end-to-end. The new `verify-manifest` step runs after build-check + tests. Exit code 0.
   - **Why:** catches drift between canonical `.prism/architect/` and platform mirrors (in case task 6 step B was skipped) AND validates the post-swap manifest preserves `skills-ecosystem.md` coverage.
   - If drift surfaces: re-run `pnpm prism:build` then `pnpm prism:check`.
   - Sequence: last Clove task before handoff to Briar.

### Eli (documentation)

9. **Write `docs/content/dev/architecture/rule-loading-tiers.md` and back-link from ADR-0035.**
   - File A (new): `docs/content/dev/architecture/rule-loading-tiers.md`
   - Source: `.prism/spec/adrs/0035-rule-loading-tiers.md` (the ADR is the agent-facing short form; the dev doc is the teammate-facing narrative).
   - Anchor sentence + four-beat arc per `.prism/architect/architecture-doc-shape.md` § The four-beat arc:
     - **Anchor sentence** (before Beat 1, one sentence): name the system and the coordination problem it solves — e.g. "PRISM ships durable agent context as rules, and the rule-loading system decides which of those rules enter context on a given session."
     - **Beat 1 — Need:** the concrete cost of indiscriminate rule loading. Name the actual numbers if known (per-session context cost, rule count, LLM-tier sensitivity to wasted context).
     - **Beat 2 — Technical flows:** the requirements any solution must answer — selective loading by file scope, durable universal set, escape hatch for skill-local rules.
     - **Beat 3 — Natural fit:** the three-tier model. Tier 1 (manifest entry, always loaded), Tier 2 (manifest entry + `paths:` frontmatter governs load), Tier 3 (skill-internal, no manifest entry, skill references by path).
     - **Beat 4 — Platform limits + custom layer:** what's still rough — Tier 2 frontmatter glob drift (caught only at review time), Tier 3 isolation boundaries across skill handoffs (see ADR-0035's Negative consequences).
   - Frontmatter: per `.prism/architect/documentation.md` § Frontmatter schema — title, description, category=`architecture`, audience=`dev`, last_updated=today.
   - Cross-links: open with "Spec source: [ADR-0035](../../spec/adrs/0035-rule-loading-tiers.md)". Cross-reference precedent: `.prism/architect/plugin-management.md` ↔ `docs/content/dev/architecture/plugin-management.md`.
   - **Do not reference `.claude/`, `.codex/`, or `.cursor/` directly in prose.** Per task 9's previous-PR-#4 incident, the path-guard at `scripts/ai-skills/path-guard.ts` fires on any `(\.claude|\.codex|\.cursor)/(rules|architect|spec|templates|references|plans)/` reference in `.prism/` or `templates/install/.prism/` markdown. For dev docs under `docs/`, the guard doesn't apply directly, but matching the canonical voice is good practice — use "the per-platform copies that `pnpm prism:build` writes" instead.
   - File B (edit): `.prism/spec/adrs/0035-rule-loading-tiers.md` § References (note: the section is named `## References`, NOT "Notes / Related") — append this bullet at the end of the section:
     ```markdown
     - [`docs/content/dev/architecture/rule-loading-tiers.md`](../../../docs/content/dev/architecture/rule-loading-tiers.md) — paired human-readable companion to this ADR (Eli convention; see `.prism/architect/documentation.md` § Cross-Reference Map).
     ```
   - Verification: the new dev doc opens with the anchor sentence + four beats in order; `## References` in ADR-0035 includes the new back-link; `pnpm prism:check` passes (path-guard is clean).
   - Sequence: parallel with Clove's tasks 1–8. Eli's edits don't block Clove's; Clove's task 7 references the dev doc's path but doesn't depend on it existing yet.

### Briar (self-review before PR open)

10. **Run the standard self-review pass plus manifest-specific checks.**
    - Standard: `pnpm prism:check-types` (TypeScript check), `pnpm prism:check` (drift + tests + verify-manifest), `pnpm prettier --check` on touched files.
    - Manifest-specific:
      - Confirm `/tmp/manifest-baseline.json` vs `/tmp/manifest-postswap.json` diff is empty modulo the control cases (`sage` may show `skills-ecosystem.md` removed; `fallthrough` matches only install-layout + spec-editing). Any expected-positive persona regression is a blocker.
      - Confirm the Cross-Reference Map row added in task 7 points at the file Eli wrote in task 9 (path-string match between the row and the dev-doc filename).
      - Confirm ADR-0035 `## References` carries the new back-link bullet to the dev doc.
      - Confirm `verify-manifest-coverage.test.ts` exists and passes — the matcher-rule fixture tests are the actual coverage check on the script itself.
    - Lessons.md append: if any surprise surfaced during implementation (e.g. a persona dependency we missed, a manifest-format quirk, a matcher edge case), append per `.prism/lessons.md` format with class-sweep ("could another persona's manifest dependency be hiding?").

### Clove — Post-merge close-out

11. **Close PR #4 with cross-links after this PR merges.**
    - File: GitHub PR #4 (`HunterMcGrew/PRISM` repo) — the abandoned `hmcgrew/context-optimization-thrive-learnings` branch.
    - Action: after this PR squash-merges, post a comment on PR #4 explaining the close and then close the PR:
      ```bash
      gh pr close 4 --comment "Closing — work shipped via #<this-pr-number> (manifest cleanup + ADR-0035 paired dev doc). The persona-splits portion is tracked separately and will open as a follow-up ticket once #<this-pr-number> verifies clean on main. Per Zoe's cadence-audit rules, this PR was \`overdue-archive\` — the close is a hygiene signal."
      ```
    - Verification: `gh pr view 4 --json state` shows `"state": "CLOSED"`; the comment appears on the PR with cross-links to this PR.
    - Sequence: AFTER this PR merges. This task does not run during the current branch's implementation — it's a one-line action item Clove (or the user) executes post-merge.
    - Source: `## Decisions` § "PR #4 closes explicitly with cross-links..."

---

## Decisions

- **Replace `**` catch-all with explicit globs derived from current usage, not PR 4's set.**
  - **Root cause of the original ambiguity:** PR 4 was 19 days ago; the `skills-ecosystem.md` dependency surface has shifted since then. Copying PR 4's set risks propagating stale assumptions.
  - **Alternatives considered:** (a) Keep the catch-all; (b) Copy PR 4's replacement set verbatim; (c) Re-derive from current `grep -rn skills-ecosystem`.
  - **Chosen approach:** (c) re-derive. (a) defeats the purpose of the cleanup (architectural clarity per ADR-0035 § Decision). (b) inherits 19 days of drift.
  - **Implementation guidance:** task 2 runs the derivation; result goes into a comment in the task's body or in a new Decision before applying in task 6.
  - → no promotion needed (one-off scope-shaping for this PR; the manifest itself is the durable record)

- **Verification is a re-runnable script chained into `pnpm prism:check`, not a manual eyeball check.**
  - **Root cause:** catch-all removal is invisible-failure territory — a missing glob doesn't surface until a persona invocation later. Eyeball checks are not auditable or replayable.
  - **Alternatives considered:** (a) Manual one-time check; (b) Re-runnable script in `scripts/ai-skills/`; (c) Audit report under `.prism/audits/`.
  - **Chosen approach:** (b). Lives next to `build.ts` and `path-guard.ts` per the existing tooling pattern. Chains into `pnpm prism:check` so future manifest edits get verified by the same command. (c) was rejected because `.prism/audits/` is for Zoe's markdown audit reports, not executable scripts.
  - **Implementation guidance:** tasks 3–4. Script at `scripts/ai-skills/verify-manifest-coverage.ts` (with paired `.test.ts`); `package.json` script `prism:verify-manifest`; appended to `prism:check` via `&&`.
  - → no promotion needed (codified in package.json + scripts/; not architecturally novel)

- **Paired dev doc bundles with this PR, not with the persona-splits ticket.**
  - **Root cause:** ADR-0035 has been on `main` since 2026-05-22 without its paired narrative doc — overdue by Eli's pairing convention. Bundling it with the larger persona-splits ticket delays it further and bloats that ticket's review surface.
  - **Alternatives considered:** (a) Bundle into persona-splits ticket; (b) Bundle into this manifest-cleanup ticket; (c) Standalone third ticket.
  - **Chosen approach:** (b). Small enough to ride along; the dev doc shares conceptual subject matter with the manifest cleanup (both implement the three-tier loading model from ADR-0035).
  - **Implementation guidance:** task 9 (Eli). Independent of Clove's tasks; can run in parallel.
  - → no promotion needed (one-off bundling decision for this PR)

- **Persona-splits follow-up ticket opens only after this PR merges and verifies clean downstream.**
  - **Root cause:** two open PRs touching manifest routing simultaneously creates a conflict surface neither PR should own. Plus the persona splits' lazy-load behavior depends on the routing model this PR establishes.
  - **Alternatives considered:** (a) Open both PRs in parallel; (b) Sequence them with explicit dependency.
  - **Chosen approach:** (b). Cross-link the persona-splits ticket back to this one when it opens.
  - **Implementation guidance:** N/A for this plan — applies to the next ticket.
  - → no promotion needed (one-off sequencing; the dependency is forward-looking and lives on the next ticket)

- **PR #4 closes explicitly with cross-links to this ticket (and the upcoming persona-splits ticket) after this PR merges.**
  - **Root cause:** PR #4 is `overdue-archive` by Zoe's cadence rules — work shipped via other paths, original carrier no longer load-bearing, but sitting open. The close is itself a hygiene signal.
  - **Implementation guidance:** task 11 (Clove, post-merge) — post a comment on PR #4 explaining the close (work shipped via this PR + the upcoming persona-splits ticket) and close PR #4 via `gh pr close 4 --comment "..."`.
  - → no promotion needed (one-off hygiene action; the close + cross-links capture the rationale on the PR itself)

- **No code-level consumer of `.prism/architect/manifest.json` exists; the matcher contract lives in `.prism/references/architect-context.md`.**
  - **Root cause:** the original OPEN Decision assumed a code-level consumer might iterate keys differently than the reference doc claims. Grep of `manifest.json` across `scripts/ai-skills/` and `.ai-skills/skills/` (Winston re-eval, 2026-05-25) shows references only in (1) test data (`scripts/ai-skills/path-guard.test.ts:56`), (2) skill specs telling LLM personas to read the manifest. `scripts/ai-skills/build.ts` does not parse `manifest.json` at all.
  - **Alternatives considered:** (a) Verify against an imagined code consumer; (b) Resolve against the spec contract; (c) Add a code consumer (e.g. a runtime resolver in `scripts/`).
  - **Chosen approach:** (b). The "consumer" is the LLM persona at runtime, governed by `.prism/references/architect-context.md` lines 14–22 ("iterate the full file list and check each path against every key... walk every manifest key and collect all matches"). The verification script (task 3) implements this matcher contract independently for testing purposes.
  - **Implementation guidance:** task 1 is now a confirmation-only task — no code change needed. Task 3 framing updates to "implements the architect-context.md matcher contract".
  - → no promotion needed (contract already lives in architect-context.md as the source of truth)

- **Cross-Reference Map adds a third pairing category: `.prism/spec/adrs/` ↔ `docs/content/dev/architecture/`.**
  - **Root cause:** `.prism/architect/documentation.md` § Cross-Reference Map currently shows two sample categories — `.prism/rules/` ↔ `docs/content/dev/standards/` and `.prism/architect/` ↔ `docs/content/dev/architecture/`. ADR-0035 is in `.prism/spec/adrs/`, not the existing categories. Eli's task 9 pairs an ADR with a dev doc — establishing a third category.
  - **Alternatives considered:** (a) Put the back-link only in the ADR itself, skip the Cross-Reference Map row; (b) Add a row to documentation.md establishing the new category.
  - **Chosen approach:** (b). The pairing is durable; future ADRs that earn dev docs will follow the same pattern. The map is the discoverability surface for that.
  - **Implementation guidance:** task 7. Exact row format provided in the task body.
  - → promoted to .prism/architect/documentation.md (the new row IS the promotion)

---

## Acceptance Criteria

### Behavioral

- [ ] Given the manifest changes are merged, When Nora is invoked for ticket triage, Then her startup architect-context load still includes the content from `skills-ecosystem.md`
- [ ] Given the manifest changes are merged, When Zoe runs a cadence audit, Then her verdict evidence still cites `skills-ecosystem.md § Skill Roster`
- [ ] Given the paired dev doc is published, When a reader follows the link from ADR-0035, Then they reach a teammate-facing narrative covering the three-tier loading model
- [ ] Given the verification script is run on `main` versus the branch, When the diffs are compared, Then no persona on the expected-positive list has lost `skills-ecosystem.md` from its loaded set

### Non-behavioral

- [ ] The `**` catch-all is removed from `.prism/architect/manifest.json`
- [ ] Every surface that depends on `skills-ecosystem.md` (enumerated during task 2) has an explicit glob route in the manifest
- [ ] The verification script `scripts/ai-skills/verify-manifest-coverage.ts` is checked in and re-runnable
- [ ] `pnpm prism:verify-manifest` is wired in `package.json` and included in the `pnpm prism:check` sequence
- [ ] The paired dev doc at `docs/content/dev/architecture/rule-loading-tiers.md` follows the four-beat arc from `.prism/architect/architecture-doc-shape.md`
- [ ] `.prism/architect/documentation.md` Cross-Reference Map includes the ADR-0035 ↔ dev doc row
- [ ] ADR-0035 includes a back-link to the new dev doc in its Notes / Related section
- [ ] `pnpm prism:check` passes end-to-end including the new `verify-manifest` step

### AC Adjustments

### AC Sync Log

| Date | Agent | Action | Plan | Linear |
| ---- | ----- | ------ | ---- | ------ |
| 2026-05-24 | Winston | Generated AC | created | N/A (no Linear ticket) |

---

## History

- 2026-05-24 [hmcgrew/chore-manifest-hygiene-dev-doc]: Plan created — manifest catch-all replaced with explicit globs preserving `skills-ecosystem.md` coverage, verification script wired into `pnpm prism:check`, paired dev doc for ADR-0035 written. Carries forward the salvageable portion of abandoned PR #4 (`hmcgrew/context-optimization-thrive-learnings`); persona-splits work deferred to a follow-up ticket that opens after this merges.
- 2026-05-25 [hmcgrew/chore-manifest-hygiene-dev-doc]: Winston re-evaluated the plan after branch creation; verified `scripts/ai-skills/build.ts` has no `manifest.json` consumer (the matcher contract lives in `.prism/references/architect-context.md`), resolving the OPEN Decision into a normal Decision. Tightened tasks 1, 3, 4, 6, 7, 9 to the detail bar — exact `package.json` edit, exact Cross-Reference Map row, corrected ADR-0035 § References section name, added paired `verify-manifest-coverage.test.ts`. Added task 11 (post-merge close PR #4) to surface a previously silent action from Decision 5.

---

## Debugged Issues

_None yet._

---

## Review Issues

_None yet._

---

## Cleanup Items

_None yet._

---

## PR Readiness

- [ ] No critical or major issues
- [ ] Types correct — no `any`, no unsafe `as`
- [ ] No stray console.logs or debug artifacts
- [ ] Tests written for new logic and edge cases (`verify-manifest-coverage.test.ts` covers the matcher rules)
- [ ] All debugged issues resolved (no `open` entries)
- [ ] Build passes — `pnpm prism:check` end-to-end with new `verify-manifest` step
- [ ] PR description up to date
- [ ] Lasting decisions promoted — N/A. Winston re-eval ruled out a separate `.prism/architect/manifest-routing.md`: the matcher contract lives in `.prism/references/architect-context.md`, and the human-readable narrative is Eli's task-9 dev doc. The Cross-Reference Map pairing-category addition (task 7) IS the architect-doc promotion for the ADR ↔ dev-doc convention this PR establishes.

**Last updated:** 2026-05-25 — Winston re-eval pass 1
