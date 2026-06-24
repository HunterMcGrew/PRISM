# Plan: epic-prism-consumer-boundary

## Ticket

GitHub issue, to be created by Sol at the start of the run — this team tracks work in GitHub issues, not Linear. Successor to the closed `epic-prism-tokenization` (Phase 1.5d). Until the issue exists, this epic carries the work under a descriptive name.

## Goal

Finish separating "what ships to a consumer repo" from "PRISM-internal development record," so a team running `npx @huntermcgrew/prism adopt` gets a clean surface — no personal info, no Thrive/`thr`/WordPress residue, no internal ADRs, the right rules in the right delivery mode, and a merge-authority capability that stays off and out of sight by default.

---

## Design

PRISM was extracted from "Thrive," the host codebase its personas were forged in. The skills are tokenized; the boundary work that remains lives in the rules, the ADRs, the install curation, and lingering personal/stack residue. The model below is the four-lens-vetted result (architect evaluation + Nora/Clove/Briar/Atlas consult, 2026-06-24).

The organizing principle: **the unit of ownership decides the delivery mechanism.**

- Content shared across many skills, or loaded repo-wide, and invariant across teams → **ships verbatim** as a small kernel. Never regenerated (drift), never duplicated into N skills (drift).
- Content owned by exactly one skill → **bakes into that skill's bundle**.
- Content with no universal form (build commands, language standards) → **generated per-team** by Atlas.
- PRISM's own deliberation record → **stays internal**; its operative kernel is distilled into the shipped surface that needs it.

---

## Decisions

- **PRISM ships zero of its own ADRs to consumers; ADR machinery ships so consumers author their own.**
  - **Root cause:** ADRs conflate two roles — the *operative rationale* an agent needs to run a rule correctly (load-bearing, belongs in the shipped rule/skill), and the *decision record* (PRISM's institutional memory, not consumer-relevant). Shipping the files cross-links PRISM-internal history into consumer repos and creates dangling references.
  - **Alternatives considered:** (a) ship only the cited ADRs behind an `audience` flag — rejected: still ships PRISM's deliberation log and leaves a hand-maintained allowlist that drifts (0061/0063 already slipped in while the conductor block was correctly withheld). (b) rewrite citations to public GitHub URLs — rejected: fragile (renumber/move → 404) and forces consumers to depend on PRISM's repo structure.
  - **Chosen approach:** ship no PRISM ADR files. Distill each cited ADR's operative kernel into the rule/skill/reference that cites it; ship the ADR machinery (`TEMPLATE.md`, the triple-gated criterion, an empty `adrs/`) so a greenfield consumer writes fresh and a brownfield consumer has Theo generate from their codebase. Their `spec/adrs/` is theirs alone — no PRISM numbering to collide with.
  - **Implementation guidance:** a consumer rule must be self-sufficient (carry its own `**Why:**`). When a why is too large to inline without bloating the rule, it moves to a shipping reference file (`.prism/references/`), not the rule. The deletion test from the consumer side is the audit: delete every PRISM ADR — if a skill stops working, that skill was leaning on an ADR as a crutch; distill that bit in.
  - → no promotion needed yet (candidate for a PRISM-internal ADR — see Internal-ADR candidates below)

- **ADR references in shipped content split into two lanes, classified before any distillation.**
  - **Root cause:** not every `ADR-NNNN` in a rule is load-bearing. Some back a `**Why:**` (the ADR carries the reasoning); others are illustrative examples of the citation *form* (the number is a sample, not a link to follow). A uniform sweep mis-classifies the illustrative ones as structural threats and risks "fixing" guidance that is actually correct for consumers.
  - **Chosen approach:** tag each reference first.
    - **Load-bearing citation** (`See ADR-NNNN` backing a Why) → confirm the why is self-sufficient inline (usually already is), drop the link.
    - **Illustrative example** (ADR number is a sample of the form) → genericize the PRISM-specific number/topic, keep the instruction. Mechanical; no distillation.
  - **Implementation guidance:** `writing-voice.md` is the canonical example of both lanes in one file — lines 13/29 (`ADR-0015`/`ADR-0016`) are load-bearing citations behind its own Why; line 35 (`e.g. "see ADR-0011" for "Eric never approves PRs"`) is illustrative. The instruction on line 35 survives untouched — authoring and citing your own ADRs is the intended consumer workflow — only the concrete PRISM example needs genericizing, because a consumer's ADR-0011 is about something else and the specific example misleads (the rule's own session-context-leakage anti-pattern, appearing inside the rule).
  - → no promotion needed (folds into the boundary ADR)

- **The crossref-lint relative-link gap is the prerequisite — extend the lint before any ADR leaves the surface.**
  - **Root cause:** the lint only validates references under verifiable root prefixes; every rule/skill cites ADRs via *relative* paths (`../spec/adrs/...`), which the lint skips. Removing ADRs would create dangling consumer links that pass `prism:check` green — the build machinery would confirm "all references resolve" while consumer rules point at files that aren't there.
  - **Chosen approach:** extend `crossref-lint.ts` to resolve relative links against the install mirror, and add a gate that forbids any `ADR-NNNN` reference (hyperlinked or bare path) under `templates/install/`. This is a new lint code path, not a config/allowlist addition.
  - **Implementation guidance:** land this first so CI catches every later slip. Bare-text mentions (`"see ADR-0018"` with no link) are confusing to a consumer with no ADR to open — the gate flags them too, except inside curated/shipped machinery files.
  - → no promotion needed (tactical)

- **Rule delivery taxonomy for the canonical rule set.** Each rule lands in exactly one mode:
  - **SHIP (kernel, verbatim, tokenized where a value varies):** the repo-wide always-loaded rules (no `paths:` frontmatter) plus the cross-persona contextual ones — writing-voice, context-reuse, branch-plan, lazy-artifacts, code-comments, code-standards (universal core), core-principles, verification-before-done, demand-elegance, plan-before-building, self-improvement-loop, subagent-strategy, pre-compaction-checkpoint, context-window-handoff-check, cross-agent-handoff-accountability, autonomous-bug-fixing, bash-output-minimization, architect-doc-verification, implementation-task-detail, design-governance, accessibility.
  - **SHIP (build-time token substitution):** git-conventions, pr-description, followup-scope — their only per-team variation is a token Atlas already holds (`${TICKET_PREFIX}`). Substituted by the build, never Atlas-written.
  - **TAILOR (single soft offer, skip-if-exists):** acceptance-criteria only — Gherkin default with a genuine editorial choice (checklist vs Gherkin) worth one skippable onboarding offer.
  - **GENERATE (Atlas, per-team):** verification-commands, code-standards-`<lang>`, security — content with no universal form.
  - **BAKE (into one skill):** skill-authoring → skill-forge's `lib/`.
  - **Root cause for the build-vs-tailor split:** an earlier "SHIP-DEFAULT+TAILOR" bucket conflated token-bearing files (no human choice — the build substitutes) with preference-bearing files (a real editorial choice). Collapsing them created pressure to add interview questions where the data is already collected, and a skip-if-exists/reconfigure conflict (a hand-written file silently no-ops a later prefix change).
  - **Implementation guidance:** the test for GENERATE is "does the content have a universal form?" If yes with only a token varying → SHIP token-sub. If it has a sensible default a team might restyle → TAILOR. Generate only when no universal default exists. Applicability (accessibility, design-governance) is handled by `paths:` load-gating plus a one-line Atlas applicability declaration — not by regenerating invariant content.
  - → no promotion needed yet (candidate for a PRISM-internal ADR)

- **The behavioral kernel ships — it currently reaches no consumer.**
  - **Root cause:** the always-loaded behavioral rules (core-principles, verification-before-done, demand-elegance, plan-before-building, self-improvement-loop, subagent-strategy, pre-compaction-checkpoint, context-window-handoff-check, cross-agent-handoff-accountability, autonomous-bug-fixing, bash-output-minimization) are neither in the install rule surface nor in `AGENTS.md.tmpl`. A consumer's agents run without them — a curation accident, not a decision.
  - **Chosen approach:** promote them into the shipped kernel.
  - **Implementation guidance:** run the literal-Thrive guard on each as it enters the seed — they have never been scanned, so they may carry `THR`/Thrive context the seed scan hasn't been checking.
  - → no promotion needed (corrects an omission)

- **Sol's merge authority becomes a hidden, default-off config capability.**
  - **Root cause:** ADR-0061 grants Sol authority to merge PRISM's *own* self-development PRs. That carve-out and the ADR both ship to consumers today, where "the repo owner granted Sol authority, this repo only" reads as nonsense — and it ships a behavior on by exception rather than off by default.
  - **Alternatives considered:** a git config variable (rejected — invisible to the schema, easy to lose); leaving it as prose in git-conventions (rejected — it's the current bug).
  - **Chosen approach:** a `config.json` field `features.conductorMayMerge`, absent/false by default, read only by Sol. Documented only in the docs; never surfaced during init or onboarding; Sol mentions it only if asked. ADR-0061 stays an internal record. The shipped git-conventions prose becomes "Sol may merge when `features.conductorMayMerge: true`" — the flag is the gate, with no restated conditions to drift against it.
  - **Implementation guidance:** the config write must read-merge-preserve unknown fields, or a reconfigure run silently drops the flag (a latent data-loss bug for any field added after the write logic). Reconfigure's "current config" display must filter `features.conductorMayMerge` so the hidden flag stays hidden. Removing the carve-out paragraph + moving ADR-0061 to `excluded` in `seed-curation.json` is the immediate live-bug fix and can land before the rest of the epic.
  - → no promotion needed yet (candidate for a PRISM-internal ADR)

- **Residue scrub runs through the build-time token layer, not as a one-off find-replace.**
  - **Chosen approach:** personal info (`hmcgrew`, `Hunter`/`McGrew`, the email) and the live `thr-NNNN` branch convention tokenize to `${GITHUB_OWNER}` / `${TICKET_PREFIX_LOWERCASE}`; `@huntermcgrew/prism` stays a literal npm package name on the allowlist; frozen incident citations (`THR-1775` etc. in lessons/ADR prose) stay literal. The git commit author identity in public history is metadata, not content — left as-is.
  - **Implementation guidance:** the `thr-NNNN` runtime regex in plan-lookup and Nora's startup is a separate concern from the template substitution — scope the template tokenization here and note the runtime-regex handling as out-of-scope, tracked separately, so the ticket doesn't balloon.
  - → no promotion needed (tactical)

- **Eric dispatches at Opus on Claude, not Sonnet.** (Folded into this epic per the run owner — a Sol dispatch-policy fix, orthogonal to the boundary goal but bundled for one handoff.)
  - **Root cause:** the model-tiering table (`prism-conductor/shared.md` § Model tiering) classes Eric in the worker-persona row — Sonnet by default, escalating to Opus only on a strike-2 signal. PR review is a high-judgment task where the model tier materially changes findings quality; a Sonnet reviewer under-catches relative to Opus. Eric should be top-tier by default like Winston, not escalate-on-failure.
  - **Chosen approach:** move Eric out of the Sonnet worker row into the Opus default tier. Update `prism-conductor/claude.md` so Sol sets `model: 'opus'` for Winston **and Eric** dispatches (and still on any worker's escalation); the other-runtime config seam follows the same table.
  - **Open consideration:** Briar (self-review) is the same review-judgment class. Whether Briar also moves to Opus is left to the run owner — out of scope unless requested, to avoid widening a targeted fix.
  - **Implementation guidance:** the per-dispatch tier is read off the goal-state lane; seed Eric lanes at the Opus tier rather than Sonnet-with-escalation. Verify `shared.md` § Model tiering, `claude.md`, and any goal-state lane-seeding default all agree.
  - → no promotion needed yet (Sol-internal dispatch policy; candidate note for the conductor architecture doc)

- **All skills ship; skill-forge ships as a consumer utility.**
  - **Chosen approach:** no skill is PRISM-only. skill-forge ships carrying the knowledge of how to build and sync a skill across claude/codex/cursor (the Sol-lib pattern), so a consumer can author their own skills. The `skill-authoring` rule folds into skill-forge's bundle as its first single-owner bake.
  - **Note:** lowering the skills' floor for weaker (non-frontier) models is a real, large, separate initiative — a per-skill rewrite, explicitly out of scope here. The in-scope minimum is baking the build/sync mechanics into skill-forge so the capability exists.
  - → no promotion needed (tactical)

---

## Internal-ADR candidates

These are durable PRISM-internal decisions worth their own ADRs (internal-only — they do not ship under the boundary model above):

1. The consumer/internal boundary model — ADRs don't ship; operative kernels distill into the shipped surface; consumers author their own ADRs.
2. The rule delivery taxonomy — ship-kernel / token-sub / tailor / generate / bake, with the ownership-unit test.
3. Sol-merge as a hidden, default-off config capability.
4. (Optional) The two-lane ADR-reference classification, if it doesn't fold cleanly into #1.

---

## Implementation Tasks

Grouped by owning persona. Ordered by the build sequence — the lint extension gates the ADR removal; the live-bug fix and the mechanical scrub are independent and can run in parallel.

### Clove (implementation)

1. **Live-bug fix (independent, do first):** remove the Sol-merge carve-out paragraph from `templates/install/.prism/rules/git-conventions.md`; move `ADR-0061` to `excluded` in `seed-curation.json`. Verify it no longer ships to the install surface.
2. **crossref-lint relative-link gate (Gate 1, blocks ADR removal):** extend `scripts/ai-skills/crossref-lint.ts` to resolve relative links against the install mirror and forbid any `ADR-NNNN` reference (hyperlinked or bare) under `templates/install/`. Add tests proving a planted dangling ADR link fails the gate.
3. **Personal-info + `thr` scrub (independent):** tokenize residue through the build-time token layer (`${GITHUB_OWNER}`, `${TICKET_PREFIX_LOWERCASE}`); keep `@huntermcgrew/prism` and frozen incident citations literal. Note runtime branch-regex as out-of-scope.
4. **ADR classify + distill (gated on task 2):** classify every shipped ADR reference into load-bearing vs illustrative; for load-bearing, confirm the why is self-sufficient inline (move to a reference file if it can't compress) and drop the link; for illustrative, genericize the PRISM-specific example. Do it per-ADR in reviewable commits. Remove PRISM ADR files from the install surface; ship the machinery (TEMPLATE + criterion + empty `adrs/`).
5. **Rule bucket moves:** promote the behavioral kernel into the seed (run the literal guard on each); route git-conventions/pr-description/followup-scope to build-time token substitution; bake `skill-authoring` into skill-forge's `lib/`. Strip the dead `.prism/spec/adrs/**` route from `manifest.stub.json`.
6. **Sol config plumbing:** add `features.conductorMayMerge` to `config.schema.json` (default off); make the config write preserve unknown fields; gate Sol's merge path on the flag; rewrite the git-conventions prose to "Sol may merge when `features.conductorMayMerge: true`."
7. **Eric Opus tiering (independent):** move Eric to the Opus default tier in `prism-conductor/shared.md` § Model tiering; update `prism-conductor/claude.md` so Sol dispatches Eric at `model: 'opus'`; confirm goal-state lane-seeding defaults agree. Leave Briar's tier unchanged unless the run owner asks.

### Sol (orchestration)

1. At run start, create the GitHub issue for this epic (the team tracks in GitHub issues, not Linear), then drive the build sequence — live-bug fix and Eric tiering first (independent), the crossref-lint gate before any ADR removal, mechanical scrub in parallel, then distillation, rule-bucket moves, and Sol config. Pause at every human gate.

### Atlas (onboarding)

1. The single `acceptance-criteria` format offer (skip-if-exists); the one-line applicability declaration for accessibility/design-governance during anchor substitution; filter `features.conductorMayMerge` from reconfigure's current-config display. No interview question for token-bearing files.

### Eli (documentation)

1. Document the `features.conductorMayMerge` flag in the docs only — how to enable it — with no echo into init, onboarding, or shipped rules.

---


---

## Review Issues

### Branch naming illustrative token contradicts lowercased instruction

- **Severity:** major
- **Status:** fixed
- **File:** `.prism/rules/git-conventions.md:76` (all platform copies + install seed)
- **Problem:** Branch Naming section used `${GITHUB_OWNER}` as the illustrative username token, contradicting the "lowercased" qualifier — `GITHUB_OWNER` resolves as-is (e.g. `HunterMcGrew` PascalCase) for consumers with mixed-case GitHub owners.
- **Suggested fix:** replace illustrative token with `${GITHUB_OWNER_LOWERCASE}`; already a registered token with a test.
- **Fixed in:** commit ac287e0 on hunter/261-consumer-boundary-l4-token-scrub

### ADR-0010 Decision body retained hard-coded thr-NNNN convention

- **Severity:** major
- **Status:** fixed
- **File:** `templates/install/.prism/spec/adrs/_toolkit/0010-pre-handoff-branch-gate.md:19` (and all copies)
- **Problem:** ADR-0010 ships to consumers (not in excluded list) and contained the Thrive-specific `thr-NNNN` convention in its Decision body — the L4 scrub updated git-conventions and branch-plan but missed this ADR.
- **Suggested fix:** update all five copies to `${TICKET_PREFIX_LOWERCASE}-NNNN-<slug>`; build resolves token in platform mirrors.
- **Fixed in:** commit ac287e0 on hunter/261-consumer-boundary-l4-token-scrub

### knownKeys Set duplicates orderedTopLevel array in serializeConfig

- **Severity:** minor
- **Status:** fixed
- **File:** `scripts/ai-skills/lib/onboarding-config.ts` (readUnknownFields + serializeConfig)
- **Problem:** Two hand-maintained copies of the same key list — if they drift, a known field silently reorders to the bottom of the output.
- **Suggested fix:** extract to a shared module-level constant; derive both functions from it.
- **Fixed in:** commit 46c28e2 on hunter/consumer-boundary-l7-sol-config-plumbing

### serializeConfig JSDoc says "JSON.stringify replacer enforces the order"

- **Severity:** minor
- **Status:** fixed
- **File:** `scripts/ai-skills/lib/onboarding-config.ts:375`
- **Problem:** The replacer param in the JSON.stringify call is null — order comes from building the object in insertion order, not a replacer.
- **Suggested fix:** correct the docstring to describe the actual mechanism.
- **Fixed in:** commit 46c28e2 on hunter/consumer-boundary-l7-sol-config-plumbing

## History

- 2026-06-24 [hunter/thr-254-optional-token-cold-start-fix]: Created the epic from the architect evaluation + Nora/Clove/Briar/Atlas design consult. Captured the boundary model, the two-lane ADR-reference classification (corrects an over-broad earlier reading of the `writing-voice.md` citation guidance), the rule delivery taxonomy, the crossref-lint relative-link prerequisite, the live ADR-0061 leak, and the Sol-merge hidden-config design.
- 2026-06-24 [hunter/thr-254-optional-token-cold-start-fix]: Folded in the Eric-Opus tiering fix and switched the tracking vehicle to a GitHub issue (Sol creates it at run start; team uses GitHub issues, not Linear). Run to be driven by Sol via `/prism-handoff`.
- 2026-06-24 [hunter/consumer-boundary-plans]: Committed this plan and `readme-refresh.md` (both previously untracked on `main`) via a worktree agent. The README refresh is a sibling work item Sol also drives — an interactive Eli session, gated on the one-vs-two-README open question; see `.prism/plans/readme-refresh.md`.
- 2026-06-24 [hunter/consumer-boundary-l2-262-eric-opus-tiering]: Moved Eric from the Sonnet worker row to the Opus-by-default tier in `shared.md` § Model tiering; updated `claude.md` dispatch sentence and `goal-state.md` schema example to match; `pnpm prism:build` and `pnpm prism:check` both green.
- 2026-06-24 [hunter/261-consumer-boundary-l4-token-scrub]: Tokenized personal info (`hmcgrew`, `Hunter` in shipped templates/skills, `thr-NNNN` branch convention) to `${GITHUB_OWNER}` / `${TICKET_PREFIX_LOWERCASE}` across canonical rules, skill sources, ADRs, and install seed. Note: runtime `thr-NNNN` regex in plan-lookup and Nora's startup is out-of-scope (tracked separately). `pnpm prism:build` and `pnpm prism:check` both pass clean.
- 2026-06-24 [hunter/261-consumer-boundary-l4-token-scrub]: Fixed two Briar majors: replaced `${GITHUB_OWNER}` with `${GITHUB_OWNER_LOWERCASE}` in the Branch Naming example (git-conventions + all mirrors + install seed), and updated ADR-0010 Decision body from hard-coded `thr-NNNN` to `${TICKET_PREFIX_LOWERCASE}-NNNN` across all five copies. Also genericized `hunter@example.com` to `owner@example.com` in phases.md. `pnpm prism:check` passes clean.
- 2026-06-24 [hunter/263-consumer-boundary-l1-strip-sol-merge-carveout]: L1 live-bug fix — removed the Sol-merge carve-out paragraph from canonical `git-conventions.md` (propagated to all platform copies and the install seed via `pnpm prism:build`); git-rm'd `templates/install/.prism/spec/adrs/_toolkit/0061-sol-merge-authority.md` and added it to `excluded[]` in `seed-curation.json`; removed dangling 0061 row from the curated install README. `pnpm prism:check` passes (377 tests, no drift).
- 2026-06-24 [hunter/264-consumer-boundary-l3-crossref-lint-adr-gate]: Extended `crossref-lint.ts` with `runInstallAdrGate` — a second lint pass that detects `ADR-NNNN` references under `templates/install/` and fails unless the file is in the permanent machinery allowlist (README.md, triple-gated-adr-criterion.md) or the pre-L5 temporary allowlist covering all current violating files. `prism:check` stays green on current `main`; gate is live and gates L5.
- 2026-06-24 [hunter/264-consumer-boundary-l3-crossref-lint-adr-gate]: Fixed three Briar minors: removed phantom CLAUDE.md.tmpl from CROSSREF_SCAN_ROOTS (zero verifiable refs), wired `runInstallAdrGate` to delegate to `isInstallAdrAllowlisted` so the exported predicate is the single canonical check, corrected JSDoc ("call" → "function"), and added integration test for the pre-L5 allowlist path. 68 tests pass.
- 2026-06-24 [hunter/264-consumer-boundary-l3-crossref-lint-adr-gate]: Fixed two Briar minors from second review: added `(?!\d)` lookahead to `ADR_REF_RE` (5-digit strings like ADR-12345 no longer match as ADR-1234) and updated JSDoc; added unit test for `isInstallAdrAllowlisted` pre-L5 branch. 391 tests pass.
- 2026-06-24 [hunter/264-consumer-boundary-l3-crossref-lint-adr-gate]: Fixed Briar minor: `INSTALL_ADR_PRE_L5_ALLOWLIST` JSDoc said to delete `isInstallAdrAllowlisted` when the set reaches zero, but that function is the canonical exported predicate used by `runInstallAdrGate`; corrected to say delete the constant and simplify the function to delegate directly to `INSTALL_ADR_MACHINERY_ALLOWLIST`.
- 2026-06-24 [hunter/consumer-boundary-l7-sol-config-plumbing]: L7 Sol config plumbing — added `features.conductorMayMerge` to `config.schema.json` (absent/false by default, Sol-read-only); made config write read-merge-preserve unknown fields to fix latent data-loss on reconfigure; gated Sol's merge path on the flag in `shared.md`; rewrote "Who merges" in canonical `git-conventions.md` to state the flag as the gate (propagated to all platform copies and install seed via `prism:build`). Three new tests for the preserve-unknown-fields contract. `pnpm prism:check` + `pnpm prism:build` both green; 395 tests pass.
- 2026-06-24 [hunter/consumer-boundary-l7-sol-config-plumbing]: Fixed two Eric minors — extracted `ORDERED_TOP_LEVEL_KEYS` as a module-level constant so `readUnknownFields` and `serializeConfig` derive from the same source of truth (no drift risk); corrected `serializeConfig` JSDoc to say insertion-order rather than JSON.stringify replacer. 395 tests pass.
- 2026-06-24 [hunter/consumer-boundary-l7-sol-config-plumbing]: Fixed two Eric Pass-2 minors — moved TECH_STACK_ENUM JSDoc to sit adjacent to its declaration (orphaned by Pass-1 ORDERED_TOP_LEVEL_KEYS insertion); added "by default" to the Who-merges opening sentence so the Sol flag-gate exception reconciles with the rule across all 6 platform copies. 395 tests pass.

---

## PR Readiness

- [ ] crossref-lint relative-link gate lands first and is green
- [ ] No `ADR-NNNN` reference survives under `templates/install/`
- [ ] No `hmcgrew`/`Hunter`/email residue under `templates/install/` (except the `@huntermcgrew/prism` npm literal)
- [ ] Behavioral kernel ships and passes the literal-Thrive guard
- [ ] `features.conductorMayMerge` defaults off, never surfaced in init/onboarding, preserved across reconfigure
- [ ] Build parity holds with the ADR exclusion recorded in `seed-curation.json`

**Last updated:** 2026-06-24
