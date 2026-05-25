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

- **Derived explicit-glob replacement set (Clove task 2, 2026-05-25).**
  - **Structural constraint discovered during implementation:** JSON keys must be unique. Four of the initially-proposed globs (`.claude/skills/**`, `.ai-skills/skills/**`, `.prism/**`, `scripts/ai-skills/**`) already exist in the manifest mapped to other architect docs (`spec-editing.md`, `install-layout.md`). Adding them again would either be a duplicate key (silently deduped) or require a manifest-schema change to support array values (out of scope for this PR). Resolution: use syntactically different but semantically equivalent glob expressions for the colliding categories. This is a workaround, not architecturally pure — see the next Decision-class follow-up call.
  - **Final glob set (7 entries replacing the single `**` catch-all):**
    - `AGENTS.md` — top-level routing doc; exact path, no collision
    - `.claude/skills/**/SKILL.md` — Claude skill startup (narrowed from `.claude/skills/**` to avoid the existing `spec-editing.md` collision)
    - `.codex/agents/**` — Codex agent adapter files (TOML); no collision
    - `.cursor/skills/**` — Cursor skill startup; no collision
    - `.ai-skills/skills/**/shared.md` — canonical skill sources (narrowed from `.ai-skills/skills/**` to avoid the existing `spec-editing.md` collision)
    - `.prism/**.md` — markdown files in `.prism/` (narrowed from `.prism/**` to avoid the existing `install-layout.md` collision; matches plans, architect docs, rules, ADRs, references, lessons, SPEC.md, audit reports)
    - `scripts/ai-skills/**.ts` — TypeScript tooling (narrowed from `scripts/ai-skills/**` to avoid the existing `spec-editing.md` collision)
  - **Rationale:** the catch-all `**` matched every file in the working tree, including consumer-app files in a PRISM install. The replacement set covers PRISM-internal markdown/skill/code paths and excludes consumer-app paths. Architectural clarity gain: an edit to `package.json`, `README.md`, `.gitignore`, or other root files does NOT trigger `skills-ecosystem.md` loading — those edits don't need the persona roster.
  - **Known coverage gaps from the narrowed globs (acceptable for this PR):**
    - Non-markdown, non-JSON files in `.prism/` (none exist today; future binary assets wouldn't load the roster)
    - Non-SKILL.md files under `.claude/skills/<id>/` or `.cursor/skills/<id>/` (assets, references — they don't drive persona-roster needs)
    - Non-`shared.md` files under `.ai-skills/skills/<id>/` (frontmatter.yml, claude.md, codex.md — edits to these are platform-specific tweaks that don't need the full roster at the same fidelity as a `shared.md` rewrite)
    - Non-`.ts` files under `scripts/ai-skills/` (only `tsconfig.json` exists today; doesn't need the roster)
  - **"Sage control" adjustment from the plan:** the original task 3 framing suggested sage might lose `skills-ecosystem.md` to prove the swap is doing real work. With `.claude/skills/**/SKILL.md` in the glob set, sage's startup file (`.claude/skills/prism-changelog/SKILL.md`) still matches, so sage continues to load it. The actual architectural-clarity control is the `fallthrough` persona's file scope (`package.json`) — it matches none of the explicit globs and loses `skills-ecosystem.md` post-swap, proving the swap removed real catch-all coverage outside PRISM-internal paths. Sage is reclassified as an expected-positive in the verification script.
  - → no promotion needed (the manifest file IS the durable record; the rationale lives here in the plan and ships with the merge)

- **Follow-up: manifest schema change for multi-value routing (out of scope for this PR; deferred to the persona-splits follow-up ticket).**
  - **Root cause:** during this implementation, JSON's unique-key constraint forced collision-avoiding glob variants for 4 of the 7 explicit-route categories. The cleaner architectural answer would be a manifest-schema change to allow array values (e.g. `{".claude/skills/**": ["spec-editing.md", "skills-ecosystem.md"]}`), which would let any number of architect docs route to the same path pattern under a single semantic key. That's a schema change that affects every manifest consumer (the LLM at runtime, the verification script, any future tooling) and isn't scoped to this PR.
  - **Alternatives considered:** (a) Use array-value schema now and bundle into this PR; (b) Use syntactic workaround (chosen — current PR); (c) Defer the whole manifest cleanup until after the schema change.
  - **Chosen approach:** (b) for this PR. The persona-splits follow-up ticket (mentioned in plan Decision 4) is the natural carrier for the schema change because it'll be touching manifest routing for lazy-load behavior anyway. Cross-link from the persona-splits ticket when it opens.
  - **Implementation guidance:** none for this PR. The follow-up ticket inherits this Decision as the carrier rationale.
  - → no promotion needed (forward-looking note; lives on the next ticket)

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
- 2026-05-25 [hmcgrew/chore-manifest-hygiene-dev-doc]: Clove tasks 1–9 complete. Wrote `verify-manifest-coverage.ts` + paired test (12 cases — matcher rules + coverage validation); swapped manifest's `**` catch-all for 7 explicit globs (syntactic variants for the four entries that already collided with `.claude/skills/**`, `.ai-skills/skills/**`, `.prism/**`, `scripts/ai-skills/**` — see Decision "Derived explicit-glob replacement set"); wired `prism:verify-manifest` into `prism:check`; wrote the dev doc per the four-beat arc plus ADR-0035 back-link plus Cross-Reference Map row. All checks pass — `prism:check` 128/128 tests, `prism:check-types` clean, diff between `/tmp/manifest-baseline.json` and `/tmp/manifest-postswap.json` shows exactly `fallthrough` (package.json) losing `skills-ecosystem.md` and every expected-positive preserved.
- 2026-05-25 [hmcgrew/chore-manifest-hygiene-dev-doc]: Briar self-review pass 1 — 1 Major (dev doc Tier 1 list diverges from ADR-0035; writing-voice is Tier 2 via `paths:` frontmatter) + 4 Minors (doubleStarToken token-collision risk, fictional plan path in scope, non-standard `**.md`/`**.ts` shorthand, missing test for `**/` in middle). Hand back to Clove.
- 2026-05-25 [hmcgrew/chore-manifest-hygiene-dev-doc]: Clove pass-2 fixes for all 5 Briar findings. Dev doc Tier 1 list now matches ADR-0035 exactly (7 rules, no writing-voice); `doubleStarToken` rewritten as `String.fromCharCode(0) + "DOUBLE_STAR" + String.fromCharCode(0)` (clean ASCII source, same null-delimited runtime — also surfaced a previously-hidden truth that the file had null bytes from initial Write, masked by Read-tool display); Nora's scope points at a real plan file; the two non-standard manifest globs split into standard root+nested pairs; matcher test added for `**/` in middle. `prism:check` 129/129 (one new test); coverage diff stays clean — fallthrough still empty, expected positives preserved.
- 2026-05-25 [hmcgrew/chore-manifest-hygiene-dev-doc]: Briar self-review pass 2 caught one regression — pass-1 Minor 3 (Nora's fictional plan path) silently reverted during the sed-rescue mid-pass-2. The Edit landed earlier but `git checkout HEAD --` rolled it back, and the follow-up Python replacement only re-touched lines 99-100. Reopening Minor 3, hand back to Clove.
- 2026-05-25 [hmcgrew/chore-manifest-hygiene-dev-doc]: Clove pass-3 re-applied the line-42 Edit as a standalone fix-up — `.prism/plans/example-plan.md` → `.prism/plans/chore-manifest-hygiene-dev-doc.md`. `pnpm prism:verify-manifest` confirms Nora's loaded-doc set unchanged from the pass-2 baseline (install-layout.md, skills-ecosystem.md, spec-editing.md). `pnpm prism:check` still 129/129; ready for Briar pass 3.

---

## Debugged Issues

_None yet._

---

## Review Issues

### Briar — 2026-05-25 — self-review pass 2

**Minor** — Pass-1 Minor 3 regressed during sed-rescue

- **Status:** `fixed` — Fixed in: Clove pass-3 (commit to follow this plan update). The line-42 Edit was re-applied as a standalone fix-up commit. `pnpm prism:verify-manifest` confirms Nora's loaded-doc set is identical to pre-fix state; `pnpm prism:check` still 129/129. The pass-1 Minor 3 entry's Status has also been updated to `fixed` with the same Fixed-in note.

### Briar — 2026-05-25 — self-review pass 1

**Major** — Dev doc Tier 1 list diverges from ADR-0035 source

- **Status:** `fixed` — Fixed in: Clove pass-2 (see History 2026-05-25 entry 4). Removed "writing voice" from the Tier 1 sentence; count drops to 7 rules matching ADR-0035 § Decision exactly.
- **File:** `docs/content/dev/architecture/rule-loading-tiers.md:43`
- **Problem:** The dev doc names 8 Tier 1 rules (code-comments, code-standards, branch-plan, git-conventions, pr-description, context-reuse, follow-up scope, **writing voice**). ADR-0035 § Decision lists 7 (no writing-voice). `.prism/rules/writing-voice.md` carries `paths: [".claude/**/*.md", "docs/**/*.md"]` frontmatter — per ADR-0035's classification rule ("Tier 2 — Registered in the manifest, but the rule's own `paths:` YAML frontmatter governs when the loader fires"), the presence of `paths:` makes writing-voice Tier 2, not Tier 1.
- **Suggested fix:** Remove "writing voice" from the dev doc's Tier 1 sentence (count drops to 7, matches ADR-0035). Optionally add a one-line note that writing-voice is Tier 2 with broad markdown coverage that approaches always-loaded in practice.
- **Note for the user:** `.ai-skills/skills/prism-code-dev/shared.md` § "Context reuse across skills" ALSO lists writing-voice in the Tier 1 universal load set. That's a pre-existing inconsistency with ADR-0035, outside this PR's local frame. Worth filing as a follow-up so shared.md and the ADR stop disagreeing (the fix is either dropping writing-voice from shared.md's list, or removing the `paths:` frontmatter from writing-voice.md — the latter requires re-evaluation of intent).

**Minor** — `doubleStarToken` could collide with user content

- **Status:** `fixed` — Fixed in: Clove pass-2. Source line now reads `const doubleStarToken = String.fromCharCode(0) + "DOUBLE_STAR" + String.fromCharCode(0);` — plain ASCII source, runtime string is null-byte delimited. (Discovered during the fix: the original file had been written with null bytes from the very first Write call due to Edit/Write tool JSON-decoding ` ` → null. The Read tool displayed null bytes as spaces, hiding the actual content. The `String.fromCharCode(0)` form is unambiguously ASCII in source, eliminating the tool-encoding fragility.)
- **File:** `scripts/ai-skills/verify-manifest-coverage.ts:104`
- **Problem:** `const doubleStarToken = " DOUBLE_STAR ";` — if a future manifest key contains the literal string `" DOUBLE_STAR "`, the matcher would mis-tokenize. Current manifest doesn't have this; defensive concern only.
- **Suggested fix:** Change the token to use null-byte delimiters around the `DOUBLE_STAR` literal — define it as `String.fromCharCode(0) + "DOUBLE_STAR" + String.fromCharCode(0)`, or use a unicode-escape string literal that places `\` `u0000` before and after `DOUBLE_STAR` (split-rendered to avoid corrupting this markdown file). Null bytes can't appear in normal file paths, so the token becomes unmistakable.

**Minor** — Fictional file path in `PERSONA_SCOPES`

- **Status:** `fixed` — Fixed in: Clove pass-3 (commit to follow this plan update). Re-applied the Edit on line 42; the path now reads `.prism/plans/chore-manifest-hygiene-dev-doc.md`. `pnpm prism:verify-manifest` confirms Nora's loaded-doc set is unchanged (`install-layout.md`, `skills-ecosystem.md`, `spec-editing.md` — identical to pre-fix). `pnpm prism:check` still 129/129.
- **File:** `scripts/ai-skills/verify-manifest-coverage.ts:39`
- **Problem:** Nora's scope includes `.prism/plans/example-plan.md`, which doesn't exist on disk. The matcher works against pattern strings regardless of file existence, so the verification logic is sound — but a reader landing on the file cold might wonder why the path is named.
- **Suggested fix:** Use a real existing plan path (e.g. `.prism/plans/chore-manifest-hygiene-dev-doc.md`) OR add a one-line inline comment explaining the path is illustrative for matcher testing.

**Minor** — Non-standard glob syntax in two manifest entries

- **Status:** `fixed` — Fixed in: Clove pass-2. `.prism/**.md` → `.prism/*.md` + `.prism/**/*.md`. `scripts/ai-skills/**.ts` → `scripts/ai-skills/*.ts` + `scripts/ai-skills/**/*.ts`. Manifest now uses 9 explicit entries (7 unique categories, with 2 categories using two-entry pairs for root+nested coverage). `pnpm prism:build` regenerated mirrors; `pnpm prism:verify-manifest` confirms coverage preserved (expected positives still load `skills-ecosystem.md`; fallthrough still empty).
- **File:** `.prism/architect/manifest.json` — `.prism/**.md` and `scripts/ai-skills/**.ts`
- **Problem:** The `**.md` and `**.ts` shorthand isn't standard glob convention. Most glob libraries treat `**` as recursive across path segments; `**.md` is typically parsed as a single path segment containing `.md`, not "any path ending in `.md`". The custom matcher in `verify-manifest-coverage.ts` handles it as the latter via `.*\.md` regex. Runtime LLM consumers probably handle it via common sense, but a strict-glob library or a human reading the manifest could interpret differently. The other 5 new entries (`AGENTS.md`, `.claude/skills/**/SKILL.md`, `.codex/agents/**`, `.cursor/skills/**`, `.ai-skills/skills/**/shared.md`) use standard syntax — the two non-standard ones stand out.
- **Suggested fix:** Replace each non-standard entry with the standard pair:
  - `.prism/**.md` → `.prism/*.md` + `.prism/**/*.md`
  - `scripts/ai-skills/**.ts` → `scripts/ai-skills/*.ts` + `scripts/ai-skills/**/*.ts`
  - Then `pnpm prism:build` to regen mirrors and `pnpm prism:verify-manifest` to confirm coverage is preserved (expected positives still load `skills-ecosystem.md`).

**Minor** — Matcher tests don't cover the actual manifest pattern shapes

- **Status:** `fixed` — Fixed in: Clove pass-2. Added `compileMatcher: ** in the middle of a pattern matches multi-segment` test — asserts `.claude/skills/**/SKILL.md` matches `.claude/skills/prism-architect/SKILL.md` and `.claude/skills/foo/bar/SKILL.md`; rejects `.codex/skills/prism-architect/SKILL.md` (wrong prefix) and `.claude/skills/prism-architect/other.md` (wrong suffix). Test count is now 129 (was 128). The `**.md` shorthand test became redundant — Minor #4 fixed the manifest to use standard syntax, so the shorthand patterns are gone.
- **File:** `scripts/ai-skills/verify-manifest-coverage.test.ts`
- **Problem:** Test cases cover exact path, prefix-with-slash, `**` at end, `*` within a segment, catch-all, and regex-metachar escaping. They don't cover `**/` in the middle of a pattern (used in `.claude/skills/**/SKILL.md`, `.ai-skills/skills/**/shared.md`) or `**.md`/`**.ts` shorthand (used in two manifest entries). The matcher correctly handles both shapes (mentally traced during review — `.claude/skills/**/SKILL.md` → `\.claude/skills/.*/SKILL\.md`), but the test gap leaves them uncovered by the regression suite — a future change to the matcher could break those shapes without any test failing.
- **Suggested fix:** Add two test cases — one for `**/` in the middle of a pattern (e.g. assert that `.claude/skills/**/SKILL.md` matches `.claude/skills/prism-architect/SKILL.md` and does NOT match `.codex/skills/prism-architect/SKILL.md`), one for `**.md` shorthand (if kept per Minor on non-standard syntax above; otherwise this test gap disappears with the fix).

---

## Cleanup Items

_None yet._

---

## PR Readiness

- [x] No critical or major issues — Briar pass-2 caught a Minor 3 regression which Clove re-applied in pass-3 (see `## Review Issues`). All findings `fixed`.
- [x] Types correct — no `any`, no unsafe `as` (`prism:check-types` clean)
- [x] No stray console.logs or debug artifacts
- [x] Tests written for new logic and edge cases — 13 cases now (12 from initial pass + 1 from Clove pass-2 covering `**/` in middle of pattern)
- [x] All debugged issues resolved (no `open` entries)
- [x] Build passes — `pnpm prism:check` 129/129 tests with the `verify-manifest` step in the chain
- [ ] PR description up to date — not yet authored; Clove opens the PR after Briar pass-2 clears
- [x] Lasting decisions promoted — Cross-Reference Map ADR ↔ dev-doc pairing category landed in `.prism/architect/documentation.md` via task 7. Other Decisions carry `→ no promotion needed` verdicts; matcher contract stays in `.prism/references/architect-context.md`. The schema-change follow-up Decision is forward-pointing (rides on the persona-splits ticket).

**Last updated:** 2026-05-25 — Clove pass-3 re-applied Minor 3; ready for Briar pass 3
