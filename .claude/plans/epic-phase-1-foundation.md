# Plan: epic-phase-1-foundation

## Ticket

PR #1 — Phase 1: PRISM foundation (skill generator, canonical sources, dogfood prefix migration). No Linear ticket; phase branch.

## Goal

Bootstrap PRISM as a multi-team distributable AI toolkit: rebrand `thrive-` → `prism-`, populate canonical skill sources under `.ai-skills/`, prune Thrive-specific dogfood content, populate `templates/claude/` distribution surface, add parameterization layer.

---

## History

- 2026-05-02 [phase-1-foundation]: Briar self-review opened. Created plan to capture findings (none existed; prior `hmcgrew-ai-skills.md` deleted in chunk 1).
- 2026-05-02 [phase-1-foundation]: Clove fixed PR #1 inline comment — dropped hardcoded persona counts from `templates/claude/spec/adrs/0002-skill-auto-routing.md:10`, `.claude/spec/adrs/0002-skill-auto-routing.md:10`, and `README.md:9,110`. Replaced "11 workflow personas" / "12 named personas" / "12 personas" with plurality phrasing per writing-voice § Count rules, not numbers.

---

## Decisions

- Distribution surface lives at `templates/claude/**`; dogfood install lives at `.claude/**`. Dogfood may stay Thrive-flavored until Phase 2 self-onboarding runs PRISM on PRISM.
- Canonical skill sources at `.ai-skills/skills/<id>/{shared,claude,codex,cursor}.md` + `frontmatter.yml` + `claude.md`-style platform addenda. Build script generates `.claude/skills/<id>/SKILL.md` etc.
- Toolkit-level ADRs only land in `templates/claude/spec/adrs/`. Thrive-specific ADRs (0019, 0021, 0025–0028) deleted from dogfood, never copied to templates. Numbering gaps preserved.
- Static language/framework rules dropped from `.claude/rules/` and not shipped — Atlas (Phase 2) generates per-team during onboarding.

---

## Review Issues

### Distribution surface ships hardcoded Thrive identifiers

- **Severity:** `critical`
- **Status:** `open`
- **File:** `templates/claude/architect/skills-ecosystem.md:9-11,225,227,261`, `templates/claude/templates/standup-summary.md:36-217 (~25 refs)`, `templates/claude/rules/git-conventions.md:7,16,34,69`, `templates/claude/rules/pr-description.md:5,6,22,54`, `templates/claude/rules/branch-plan.md:22,23,119`, `templates/claude/templates/pr-description.md:41`, `templates/claude/templates/bug-report.md:39`, `templates/claude/architect/qa-test-planning.md:30,145,161,163,164`, `templates/claude/references/shipping-flow.md:13-16,24,37,39`, `templates/claude/references/dev-doc-template.md:3`, `templates/claude/spec/adrs/0003-authors-ship-reviewers-review.md:38-40,59`
- **Problem:** 16 distribution files contain literal `Thrive`, `tractru`, `TracTru/thrive`, `THR-NNNN`, `thrive.pauseBeforeCommit`. `docs/parameterization.md` claims "Generation-time tokens — `${TICKET_PREFIX}`, `${ORG}`, `${PROJECT}`, etc. appear in canonical sources... and templates/claude/AGENTS.md.tmpl, etc." — only AGENTS.md.tmpl line 33 and SPEC.md.tmpl actually carry tokens. Consumer teams pulling this distribution receive `git config --global thrive.pauseBeforeCommit` and `Format: THR-NNNN: <imperative summary>` hardcoded. Phase 1's "distribution surface populated" promise is incomplete: populated, not generalized.
- **Suggested fix:** Replace `Thrive` → `${PROJECT}`, `THR-NNNN`/`THR-####` → `${TICKET_PREFIX}-NNNN`, `tractru` → `${LINEAR_WORKSPACE}` / `${GITHUB_OWNER}` per context, `thrive.<key>` → `${PROJECT_LOWERCASE}.<key>`, `TracTru/thrive` URLs → `${GITHUB_OWNER}/${GITHUB_REPO}`. Keep ticket numbers in incident-citing prose (e.g. "the THR-1775 audit") only when they're stable historical references that survive shipping; otherwise generalize to "an audit of the architect docs surface" and let the ADR carry the citation.

### Canonical skill sources still hardcode TracTru/thrive

- **Severity:** `major`
- **Status:** `open`
- **File:** `.ai-skills/skills/prism-standup-summary/shared.md:116,120,122,193,199,205,211,223,233,255 (28 refs total)`, `.ai-skills/skills/prism-qa-test-plan/shared.md:7,78,90,98,104,129,177,190,205,251,257,287,289,303,304,309 (38 refs total)`, `.ai-skills/skills/prism-architect/shared.md:4,165,275,324`, `.ai-skills/skills/prism-code-dev/shared.md:5,308,387` (~105 occurrences across 11 of 12 skill sources)
- **Problem:** Same root cause as critical above, on the canonical-sources side. These build into every consumer team's `.claude/skills/`. Lilac runs `gh search prs --repo=TracTru/thrive`; Reese writes output paths to `.claude/docs/qa/thrive-*.md`; Winston references `Thrive_Core\` PHP namespace as the example architecture. `prism:check` passes because the build is byte-faithful — the drift check doesn't validate semantic genericness.
- **Suggested fix:** Same token replacement as critical above. Add a build-time guard that fails when canonical sources contain `Thrive`/`tractru`/`THR-` outside explicit allowlist (e.g. example-payload prose).

### Skills reference rule files deleted in chunk 6

- **Severity:** `major`
- **Status:** `open`
- **File:** `.ai-skills/skills/prism-debugger/shared.md:280` (→ `use-effect-guidelines.md`), `.ai-skills/skills/prism-code-review-pr/shared.md:336` (→ `use-effect-guidelines.md`), `.ai-skills/skills/prism-code-review-self/shared.md:263` (→ `use-effect-guidelines.md`), `.ai-skills/skills/prism-code-dev/shared.md:187` (→ `headless-architecture.md`), `.ai-skills/skills/prism-code-dev/shared.md:209` (→ `component-props-decoupling.md`)
- **Problem:** Chunk 6 dropped `use-effect-guidelines.md`, `headless-architecture.md`, `component-props-decoupling.md`, `prop-ordering.md`, `code-standards-{ts,php}.md`, `data-layer-boundaries.md`, `plugins-manifest.md` from `.claude/rules/`. The "framework-specific guidelines" row in `code-standards.md` defers them to per-team Atlas generation. But canonical skill sources still cite them by name. Generated `.claude/skills/<id>/SKILL.md` outputs inherit the dangling refs (line 275 in the SKILL.md driving this very review). Agents loading these skills will look for files that don't exist; the workflow fragment that depends on the rule silently no-ops.
- **Suggested fix:** Either (a) generalize the references to "if your team includes a `use-effect-guidelines.md` rule (generated by Atlas in Phase 2 for React/Next teams), apply it" and let the file's presence drive behavior, or (b) inline the relevant checklist content into the skill itself so the skill stays self-contained.

### Dogfood architect doc contradicts "PRISM on PRISM" framing

- **Severity:** `major`
- **Status:** `open`
- **File:** `.claude/architect/skills-ecosystem.md:9-11,225,227,261`
- **Problem:** README says "PRISM uses itself for its own evolution — Winston for architectural decisions, Clove for implementation, Eric and Briar for review. The `.claude/` install at the root is the dogfood." But the dogfood architect doc still anchors to `Repository: tractru/thrive`, `Linear team: THR (prefix: THR-####)`, `GitHub org: tractru`. This is the doc loaded by `**` route on every skill invocation in this repo — so any Winston/Clove/Briar/etc. session in the PRISM repo gets told they're working in tractru/thrive. Currently bites: this review session loaded that doc and had to reason past the lie.
- **Suggested fix:** Reconfigure dogfood `Project Context` to PRISM (`Repository: HunterMcGrew/agent-crew`, `Linear team: <none>` or whatever ticket system the team uses for PRISM work, `GitHub org: HunterMcGrew`). Or accept dogfood-stays-Thrive as a Phase 2 deferred item and document explicitly in `.claude/architect/skills-ecosystem.md`'s opening paragraph that the dogfood install is intentionally pinned to Thrive's shape until Phase 2 self-onboarding lands.

### qa-test-planning ships dealership-specific context

- **Severity:** `major`
- **Status:** `open`
- **File:** `templates/claude/architect/qa-test-planning.md:145-164`
- **Problem:** "Thrive serves equipment dealership websites. This shapes what a test plan covers..." plus a dealership-specific context block ships verbatim to consumers. A KTC team or any non-dealership consumer receives instruction to consider "multi-tenant blast radius across dealer sites", "complex inventory data with optional fields like hours/attachments/condition", and "mobile field use by sales reps". This is hard-coded domain context, not a tokenizable string.
- **Suggested fix:** Drop the dealership context block from the shipped template. If domain context belongs in QA planning at all, generate it per-team during onboarding (Phase 2/3) by asking the team about their product domain.

### Schema `$id` references unowned domain

- **Severity:** `minor`
- **Status:** `open`
- **File:** `.ai-skills/config.schema.json:3`
- **Problem:** `"$id": "https://prism.dev/config.schema.json"` — `prism.dev` is a placeholder. JSON Schema treats `$id` as a canonical URI; if the domain isn't owned, validators following the URI fail.
- **Suggested fix:** Drop `$id` (it's optional) or replace with the GitHub raw URL (`https://raw.githubusercontent.com/HunterMcGrew/agent-crew/main/.ai-skills/config.schema.json`).

### Architecture-doc-shape example anchored to Thrive

- **Severity:** `minor`
- **Status:** `open`
- **File:** `templates/claude/architect/architecture-doc-shape.md:36`
- **Problem:** "Thrive runs 400+ dealer sites from one codebase" as the model anchor-sentence example. Fine as illustration but signals the generic distribution still drips Thrive-flavor on first read.
- **Suggested fix:** Replace with a fictional-but-plausible example (e.g. "Acme runs N storefront sites from one codebase") or pull the example into a side-by-side panel labelled "Example from PRISM's own dogfood".

### spec-editing.md cites internal Thrive incident in shipped doc

- **Severity:** `minor`
- **Status:** `open`
- **File:** `templates/claude/architect/spec-editing.md:13`
- **Problem:** "Treating an enumerated list as exhaustive is a known LLM failure mode; it's what produced the Lilac voice drift during THR-1634." Internal incident reference in the shipped distribution doc.
- **Suggested fix:** Generalize to "...is a known LLM failure mode that has produced voice drift in spec content; see ADR-0015 for the originating reasoning."

### ADR-0024 references THR-1775 audit twice in shipped ADR

- **Severity:** `minor`
- **Status:** `open`
- **File:** `templates/claude/spec/adrs/0024-branch-plan-decisions-record-the-why.md:10,47,48`
- **Problem:** ADR ships with `THR-1775` incident references. Toolkit ADRs that reference Thrive tickets confuse consumer teams reading the ADR cold.
- **Suggested fix:** Generalize the incident phrasing or sanitize ticket IDs to a generic placeholder (`<originating audit incident>`) before shipping.

### Hardcoded persona counts in ADR-0002 and README (PR #1 inline comment)

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `templates/claude/spec/adrs/0002-skill-auto-routing.md:10`, `.claude/spec/adrs/0002-skill-auto-routing.md:10`, `README.md:9,110`
- **Problem:** Hunter's PR #1 comment ("lets keep a count out of the files. Drifts too easily") on ADR-0002 line 10. Hardcoded "11 workflow personas" was already wrong — the roster has 12 (Lilac was added without updating the count). Same anti-pattern lived in README.md:9 ("12 named personas") and README.md:110 ("canonical sources for 12 personas"). Violates writing-voice § Count rules, not numbers.
- **Suggested fix:** Drop the count, keep the plurality. Used "a roster of workflow personas" (ADR), "Named personas" (README:9 bullet header), "every named persona" (README:110).
- **Fixed in:** phase-1-foundation, this pass.

### `## History` not maintained for phase work

- **Severity:** `minor`
- **Status:** `open`
- **File:** `.claude/plans/`
- **Problem:** `phase-1-foundation` is a 391-file epic-scale branch with no plan tracking it (the prior `hmcgrew-ai-skills.md` was deleted in chunk 1). This violates ADR-0001 (plan is source of truth) and the branch-plan rule. Briar created this plan retroactively at review time.
- **Suggested fix:** Backfill `## History` entries for the seven chunks (one line each) and treat this plan as the canonical record going forward. Phase 2 / 3 should each have their own epic plan from day one.

---

## Cleanup Items

- None beyond the dangling rule references in Review Issues #3.

---

## PR Readiness

- [ ] No critical or major issues — **6 open** (1 critical, 5 major); 1 minor fixed in this pass (PR #1 inline comment)
- [x] Types correct — `pnpm prism:check-types` passes
- [x] No stray console.logs or debug artifacts
- [x] Tests written for new logic — `pnpm prism:test` passes (5 tests covering canonical-source invariants)
- [ ] All debugged issues resolved — N/A (no debugged issues; review issues open)
- [x] Build passes — `pnpm prism:check` passes (drift check); full Next.js build skipped — diff does not affect Next.js bundle
- [x] PR description up to date — PR #1 description present (not reviewed for scope-sync this round)
- [ ] Lasting decisions promoted to architect context — pending tokenization fix

**Last updated:** 2026-05-02
