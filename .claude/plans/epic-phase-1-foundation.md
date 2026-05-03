# Plan: epic-phase-1-foundation

## Ticket

PR #1 — Phase 1: PRISM foundation (skill generator, canonical sources, dogfood prefix migration). No Linear ticket; phase branch.

## Goal

Bootstrap PRISM as a multi-team distributable AI toolkit: rebrand `thrive-` → `prism-`, populate canonical skill sources under `.ai-skills/`, prune Thrive-specific dogfood content, populate `templates/claude/` distribution surface, add parameterization layer.

---

## History

- [phase-1-foundation, commit f8faf53]: Bootstrap PRISM foundation and migrate skills to prism- prefix — project tooling, multi-platform skill generator, canonical sources under `.ai-skills/skills/`, dogfood `thrive-` → `prism-` migration.
- [phase-1-foundation, commit 4a4c99d]: Phase 1 chunk 1 — Prune Thrive-specific dogfood content (architect docs, ADRs, rules, plans, design mocks; emptied lessons.md).
- [phase-1-foundation, commit 6af65f3]: Phase 1 chunk 2 — Generalize universal rules and toolkit ADRs (code-standards, accessibility, surviving ADRs stripped of Thrive-specific phrasing).
- [phase-1-foundation, commit 762e46e]: Phase 1 chunk 3 — Populate templates/claude/ distribution surface (verbatim from dogfood; tokenization deferred — see Review Issues #1, #2).
- [phase-1-foundation, commit 8956e09]: Phase 1 chunk 4 — Tokenize AGENTS.md.tmpl, CLAUDE.md.tmpl, SPEC.md.tmpl (root-level only; balance of templates remains untokenized — PR #2 work).
- [phase-1-foundation, commit e612e25]: Phase 1 chunk 5 — README rewrite, distribution doc, parameterization doc.
- [phase-1-foundation, commit b70f7fa]: Phase 1 chunk 6 — Drop static language/framework rule templates; generalize operational gotchas (introduced the dangling-rule-references issue Briar caught — addressed in this PR via ADR-0029 and the 5 skill edits).
- 2026-05-02 [phase-1-foundation]: Briar self-review opened. Created plan to capture findings (none existed; prior `hmcgrew-ai-skills.md` deleted in chunk 1).
- 2026-05-02 [phase-1-foundation]: Clove fixed PR #1 inline comment — dropped hardcoded persona counts from `templates/claude/spec/adrs/0002-skill-auto-routing.md:10`, `.claude/spec/adrs/0002-skill-auto-routing.md:10`, and `README.md:9,110`. Replaced "11 workflow personas" / "12 named personas" / "12 personas" with plurality phrasing per writing-voice § Count rules, not numbers.
- 2026-05-02 [phase-1-foundation]: Winston evaluated Briar's open issues and built phased plan. Two new architectural decisions documented: (1) conditional file-existence references for per-team rules (resolves Hunter's #3 question — Phase 1 deliverable, no Phase 2 dependency), (2) token substitution at build time in `scripts/ai-skills/build.ts`. PR split: PR #1 ships architectural decisions + small fixes; PR #2 implements substitution layer; PR #3 sweeps `templates/claude/**`. Implementation Tasks added with persona ownership.
- 2026-05-02 [phase-1-foundation]: Winston revised #3 architectural decision after Hunter pushback. Conditional file-existence references rejected as adding dead lines that couple skill maintenance to per-team rules surface. Inverted to "rules self-declare; skills don't reference per-team rule files" — matches existing pattern (`architect-doc-verification.md` "Who runs this rule" section). Skills delete the 5 dangling refs, no replacement. Atlas-generated rules MUST open with applicability declaration. PR #2 + PR #3 collapsed to a single follow-up PR.
- 2026-05-03 [phase-1-foundation]: Winston resolved open questions. ADR numbering confirmed at 0029. Follow-up PR work tracked in this plan only (no GitHub issues — solo-shipping cost/benefit doesn't justify the duplication). Dogfood Project Context uses pretend Linear placeholder (`Linear team: PRISM (prefix: PRISM-####)`) — no actual Linear backing for the meta-project; the placeholder keeps doc shape consistent with what consumer teams receive.
- 2026-05-03 [phase-1-foundation]: Clove executed PR #1 finalization tasks 1-12. Wrote ADR-0029 (rules self-declare) and ADR-0030 (token substitution at build time) to both dogfood and templates. Deleted 3 dangling useEffect bullets (prism-debugger, prism-code-review-pr, prism-code-review-self) and revised 2 paragraphs in prism-code-dev to drop `headless-architecture.md` and `component-props-decoupling.md` pointers. Reconfigured dogfood `.claude/architect/skills-ecosystem.md` to PRISM identity. Mirrored generic-prose edits (PR URL example, originating-PRs reframing, "this project squash-merges") to both dogfood and templates. Dropped dealership context block from `templates/claude/architect/qa-test-planning.md`. Dropped `$id` from config schema. Replaced Thrive anchor in architecture-doc-shape.md with fictional "100+ retail sites" example. Generalized THR-1634 ref in spec-editing.md and THR-1775 refs in ADR-0024 (both surfaces). Backfilled 7 chunk history entries above. `pnpm prism:build`, `prism:check`, `prism:check-types` all pass.
- 2026-05-03 [phase-1-foundation]: Winston evaluated install layout asymmetry. Decision: bifurcate to `.prism/` canonical + platform-dir build copies (ADR-0031). PR ordering swapped — layout reorg becomes PR #2 (`prism-install-layout`), tokenization moves to PR #3 (`prism-tokenization`). New epic plan created at `.claude/plans/epic-prism-install-layout.md`.
- 2026-05-03 [phase-1-foundation]: Hunter confirmed three open questions: `.prism/` naming, plans + lessons + everything system-related stays under `.prism/`, merge PR #1 first then PR #2 + #3 follow up. Phase 1.5 label adopted for the bridge work (layout reorg + tokenization). README `## Phased roadmap` updated to show Phase 1 → Phase 1.5 → Phase 2 → Phase 3 progression.

---

## Decisions

- Distribution surface lives at `templates/claude/**`; dogfood install lives at `.claude/**`. Dogfood reconfigured to PRISM identity in this PR (was previously Thrive-pinned); full self-onboarding still deferred to Phase 2.
- Canonical skill sources at `.ai-skills/skills/<id>/{shared,claude,codex,cursor}.md` + `frontmatter.yml` + `claude.md`-style platform addenda. Build script generates `.claude/skills/<id>/SKILL.md` etc.
- Toolkit-level ADRs only land in `templates/claude/spec/adrs/`. Thrive-specific ADRs (0019, 0021, 0025–0028) deleted from dogfood, never copied to templates. Numbering gaps preserved; next toolkit-level ADR is 0029.
- Static language/framework rules dropped from `.claude/rules/` and not shipped — Atlas (Phase 2) generates per-team during onboarding.

- **Skills do not reference per-team rule files by name. Rules declare their own applicability; the agent loads all rules in `.claude/rules/` automatically and applies them when relevant.** Skills are generic process definitions; rules carry the specific checklists.
  - **Root cause:** Chunk 6 deleted language/framework rules from `.claude/rules/` (deferred to Atlas in Phase 2), but canonical skill sources still cited them by name. Generated `.claude/skills/<id>/SKILL.md` outputs inherited dangling refs. Hunter's deeper question: how do skills cite per-team rules they can't statically know about — without adding wasted lines for teams that don't have those rules?
  - **Alternatives considered:** (a) Rule discovery via taxonomy — too dynamic. (b) Tech-stack flag branching — brittle coupling. (c) Rule manifest at `.claude/rules/manifest.json` — extra layer that doesn't earn its keep. (d) Inline rule content into skills — defeats per-team value prop. (e) Defer entirely to Phase 2 — forces retrofit. (f) Conditional file-existence references in skills (`if .claude/rules/X.md exists, apply X`) — adds dead lines for teams without that rule and couples skill maintenance to the per-team rules surface; rejected after Hunter pushback.
  - **Chosen approach: invert the relationship.** Rules self-declare when they apply (the existing pattern in `accessibility.md`, `code-standards.md`, `code-comments.md`, `architect-doc-verification.md` — the latter even names the personas it binds in a "Who runs this rule" section). Skills stay generic process definitions; rules — whether universal or Atlas-generated — carry the specific checklists and the applicability declaration. The agent loads all `.claude/rules/` files into context automatically (Tier 2 per SPEC.md), so when Atlas writes a per-team rule, the agent has it in context for every relevant action without any skill change.
  - **Implementation guidance:** Delete the 5 dangling references in `.ai-skills/skills/*/shared.md` — no replacement. Where the bullet containing the reference is itself a per-team-only concern (e.g. "Unnecessary useEffect — apply the full review checklist in use-effect-guidelines.md"), delete the whole bullet too. Document the convention as ADR-0029. Atlas-generated rules MUST open with an applicability statement following the pattern of existing rules: "These rules apply when [doing X]" plus an optional "Who runs this rule" section naming the bound personas.

- **Token substitution at build time.** `scripts/ai-skills/build.ts` reads `.ai-skills/config.json`, derives the token map (per `docs/parameterization.md`), and substitutes `${TOKEN}` literals in canonical sources before writing platform outputs. Single substitution layer; consumers never see raw tokens.
  - **Root cause:** Issues #1, #2, #5, #7 are all the same gap — tokens promised in `docs/parameterization.md` don't exist in canonical sources or templates because no substitution layer was implemented. `buildSkillMarkdown` (build.ts:96-114) is byte-faithful concatenation today.
  - **Alternatives considered:** Mustache or another templating language (richer logic, adds dependency); substitution at sync time inside Atlas (scatters substitution across two layers); keeping templates Thrive-flavored and treating it as a "style guide" consumers fork (defeats the multi-team promise).
  - **Chosen approach:** Build-time substitution from `.ai-skills/config.json`. One substitution seam, one config source, tokens are obvious in canonical sources. The Phase 2 sync flow then just copies pre-substituted output to consumer repos.
  - **Implementation guidance:** Add `scripts/ai-skills/lib/tokens.ts` for the derivation map (PROJECT_LOWERCASE, TICKET_PREFIX_LOWERCASE, etc.). Hook substitution into `buildSkillMarkdown` between assembly and write. Add regression test that substitution on a sample config produces expected output. Add build-time guard that fails if assembled output contains literal `Thrive`/`tractru`/`TracTru/thrive`/`THR-` outside an explicit allowlist (frozen incident citations, fictional examples). Implementation lands in follow-up PR (see Implementation Tasks); ADR-0030 documents the design.

- **PR split for Phase 1 finalization.** Architectural decisions + small fixes ship in PR #1 (this branch). Token substitution implementation + canonical-source sweep + template sweep + literal-Thrive guard all ship in a single follow-up PR #2 (`prism-tokenization` or similar branch name).
  - **Why:** PR #1 is already 391 files; the substitution work is sequenced after to keep this PR reviewable. Hunter prefers one follow-up over two — the substitution layer and the sweeps are mechanically related and naturally land together.

- **Dealership context dropped from `templates/claude/architect/qa-test-planning.md`.** Domain-specific guidance is per-team, not toolkit-level. Phase 3 (Winston codebase-scan integration) will generate per-team domain context; until then, the shipped template is domain-neutral.

- **Dogfood install reconfigured to PRISM identity in this PR.** Minimum needed so dogfood persona sessions stop loading a stale Thrive identity. `.claude/architect/skills-ecosystem.md` Project Context updated to PRISM. Full self-onboarding (Atlas walking PRISM through itself) still deferred to Phase 2.
  - **Concrete values for the dogfood Project Context:** `Repository: HunterMcGrew/agent-crew`, `Linear team: PRISM (prefix: PRISM-####)`, `GitHub org: HunterMcGrew`. The Linear team is a pretend placeholder — no actual Linear backing exists for the PRISM meta-project; Hunter is not setting up a personal Linear account for this. Treating it as if it exists keeps the doc shape consistent with what consumer teams will receive (the persona workflows assume a Linear-shaped ticket system). If a skill tries to call Linear MCP against the placeholder team key, it will fail gracefully — that's a known limitation of the dogfood, not a bug.

- **Follow-up PRs use the plan as the canonical tracker, not GitHub issues.** The plan's `## Implementation Tasks` already enumerates PR #2 work with persona ownership; every persona reads the plan at session start (ADR-0001). Adding GitHub issues for the follow-up tasks duplicates that record without earning anything while PRISM is solo-shipping. Revisit when Phase 2/3 brings contributors who need an external discovery surface; until then, the plan is sufficient.

- **Bifurcated install layout: `.prism/` for platform-agnostic content, platform dirs for platform-specific.** Read-only canonical content (rules, ADRs, architect, templates, references) lives at `.prism/<area>/`. Platform dirs (`.claude/`, `.codex/`, `.cursor/`) get build-time copies of read-only content (preserves auto-load) plus their own platform-specific bits (skills, native config). Agent-written content (plans, lessons) lives only at `.prism/` — single source.
  - **Root cause:** Phase 1 distribution map only writes shared content into `.claude/`. Codex/Cursor consumers never see rules or architect docs because their platforms don't auto-load `.claude/`. The asymmetry is structural and gets worse with each platform added.
  - **Alternatives considered:** (a) `.prism/` only without platform copies — breaks Claude Code auto-load, costs 5–10 Read calls per session start. (b) Symlinks — Windows-broken. (c) Pure duplication with `.claude/` as canonical — privileges Claude, violates symmetry. (d) Top-level `rules/` / `spec/` (no leading dot) — pollutes consumer's repo root. (e) Status quo — Codex/Cursor stay second-class, defeats multi-platform value prop.
  - **Chosen approach:** Bifurcated `.prism/` canonical + build-time copies into platform dirs. Preserves auto-load on every platform without privileging any one of them. Build's drift check (`prism:check`) catches out-of-band edits to platform copies. New architect doc and ADR-0031 codify the convention.
  - **Implementation guidance:** Single follow-up PR `prism-install-layout` does the dogfood reorg (~50+ file moves), updates manifest paths, extends `build.ts` with copy logic, sweeps internal cross-references to `.prism/<area>/` form, renames `templates/claude/` → `templates/install/`, rewrites `docs/distribution.md`, authors ADR-0031 and `.prism/architect/install-layout.md`. Tracked in the new epic plan `epic-prism-install-layout.md`.

- **PR ordering after PR #1: layout-reorg first, tokenization second.** Previously planned: PR #2 = tokenization. Revised: PR #2 = layout reorg (`prism-install-layout` branch), PR #3 = tokenization (`prism-tokenization` branch). Reorg first so the tokenization sweep touches the final canonical paths instead of the v1 `.claude/`-only paths.

- **Both follow-up PRs labeled Phase 1.5.** Phase 1 = PR #1 (this branch, foundation). Phase 1.5 = PR #2 (layout reorg) + PR #3 (tokenization) — bridge work between Phase 1 (foundation done) and Phase 2 (Atlas runs against the bifurcated, tokenized install). Phase 2 and Phase 3 proceed as originally planned. README's `## Phased roadmap` section updated to reflect.

---

## Implementation Tasks

### Clove (PR #1 finalization — this branch)

1. **Author ADR-0029** (Rules self-declare; skills don't reference per-team rule files) — write to both `.claude/spec/adrs/0029-rules-self-declare-applicability.md` and `templates/claude/spec/adrs/0029-rules-self-declare-applicability.md` (byte-identical). Use ADR template; pull Context/Decision/Consequences from the `## Decisions` entry above. Reference all six rejected alternatives explicitly (a-f, including the conditional-reference pattern that was rejected after Hunter pushback). Document the convention that Atlas-generated rules MUST open with an applicability statement.
2. **Author ADR-0030** (Token substitution at build time) — same dual-write pattern. Document the design; explicitly note implementation deferred to PR #2.
3. **Delete the 5 dangling rule references** in canonical skill sources — no replacement. For bullets that are entirely per-team-specific (the useEffect bullet pattern), delete the whole bullet. For passages where the reference is mid-sentence in broader prose (e.g. the headless-architecture mention inside a network-waterfall paragraph), revise the surrounding sentence to drop the file pointer while keeping the generic guidance:
   - `.ai-skills/skills/prism-debugger/shared.md:280` — delete the useEffect bullet entirely
   - `.ai-skills/skills/prism-code-review-pr/shared.md:336` — delete the useEffect bullet entirely
   - `.ai-skills/skills/prism-code-review-self/shared.md:263` — delete the useEffect bullet entirely
   - `.ai-skills/skills/prism-code-dev/shared.md:187` — revise the network-waterfall paragraph to drop the `headless-architecture.md` pointer; keep the generic RSC/parallel-fetch guidance
   - `.ai-skills/skills/prism-code-dev/shared.md:209` — revise the props-segregation paragraph to drop the `component-props-decoupling.md` pointer; keep the generic guidance
   Run `pnpm prism:build` after to regenerate the four `.claude/skills/*/SKILL.md` outputs.
4. **Reconfigure dogfood `.claude/architect/skills-ecosystem.md`** — rewrite lines 9-11 (Project Context), 225 (PR URL example), 227 (THR-1630/THR-1631 incident citation), 261 (Thrive squash-merges in rule #15) to PRISM identity. Concrete values: `Repository: HunterMcGrew/agent-crew`, `Linear team: PRISM (prefix: PRISM-####)`, `GitHub org: HunterMcGrew`. The Linear team is a pretend placeholder per the Decisions entry above. Generalize line 225's PR URL example to use `HunterMcGrew/agent-crew`, line 227's historical incident citations to "originating PRs" with no THR ID, line 261's Thrive squash-merges reference to "this project squash-merges". Mirror the appropriate edits to `templates/claude/architect/skills-ecosystem.md` ONLY where they're generic (lines 225, 227, 261); the dogfood-specific Project Context values (lines 9-11) stay out of templates — templates use tokens (handled by PR #2 sweep).
5. **Drop the dealership context block** from `templates/claude/architect/qa-test-planning.md:145-164`. Replace with one-line note that domain context is per-team and gets generated during Phase 3 codebase scan.
6. **Drop `$id` from `.ai-skills/config.schema.json:3`** — schema doesn't require it; placeholder URL is misleading.
7. **Replace Thrive anchor example** in `templates/claude/architect/architecture-doc-shape.md:36` with a fictional generic ("Acme runs a fleet of regional storefront sites from one codebase") explicitly labeled as illustration.
8. **Generalize Thrive incident citations** in shipped docs:
   - `templates/claude/architect/spec-editing.md:13` — THR-1634 → "voice drift in spec content; see ADR-0015"
   - `templates/claude/spec/adrs/0024-branch-plan-decisions-record-the-why.md:10,47,48` — THR-1775 → "an audit of the architect docs surface"
9. **Backfill plan `## History`** — add one-liner per chunk (chunks 1-6) for traceability of the phase work.
10. **Update Review Issues statuses** — mark issues #3, #4, #5, #6, #7, #8, #9, #10 as `fixed` with `Fixed in: phase-1-foundation, this pass`. Issues #1 and #2 stay `open` with new note pointing to PR #2 / PR #3 as the fix venues.
11. **Update PR Readiness checklist** — reflect the architectural decisions are now made, count of open issues drops to 1 critical + 1 major (both queued for follow-up PRs).
12. **Run verification before commit** — `pnpm prism:check`, `pnpm prism:check-types`. Ship per shipping-flow.

### Clove (PR #2 — `prism-install-layout` branch — bifurcated layout reorg)

Tracked separately in [`.claude/plans/epic-prism-install-layout.md`](./epic-prism-install-layout.md). 14 sequenced tasks moving content from `.claude/` to `.prism/`, extending the build with copy logic, sweeping cross-references, renaming `templates/claude/` → `templates/install/`, authoring ADR-0031 and `install-layout.md`.

### Clove (PR #3 — `prism-tokenization` branch — sweeps at the post-reorg paths)

Note: paths below assume PR #2 has landed and content lives at `.prism/<area>/`. Token map and approach unchanged from earlier; only the target paths shifted.

13. **Implement token substitution in `scripts/ai-skills/build.ts`** — load `.ai-skills/config.json`, derive token map per `docs/parameterization.md`, substitute in assembled markdown before write. Hook into `buildSkillMarkdown` (lines 96-114). Token substitution applies to canonical content under `.prism/` AND to the build-time platform copies — same content, substituted once at build.
14. **Extract derivation logic** into `scripts/ai-skills/lib/tokens.ts` — single seam for adding derived tokens later (PROJECT_LOWERCASE, TICKET_PREFIX_LOWERCASE).
15. **Add substitution regression test** at `scripts/ai-skills/tokens.test.ts` — sample config in, expected output out. Cover edge cases: missing config keys, malformed token literals, derived-token cascades.
16. **Add literal-Thrive build-time guard** — fail if assembled output contains `Thrive`/`tractru`/`TracTru/thrive`/`THR-[0-9]+` outside an explicit allowlist file. Allowlist seeds with frozen incident citations and fictional examples.
17. **Tokenize `.ai-skills/skills/*/shared.md`** — sweep all 11 files with hardcoded Thrive references. Token map: `Thrive` → `${PROJECT}`, `tractru` → `${LINEAR_WORKSPACE}` or `${GITHUB_OWNER}` per context, `TracTru/thrive` → `${GITHUB_OWNER}/${GITHUB_REPO}`, `THR` (in ticket prefix usage) → `${TICKET_PREFIX}`, `thrive.<key>` → `${PROJECT_LOWERCASE}.<key>`, output paths like `.claude/docs/qa/thrive-*` → `.claude/docs/qa/${PROJECT_LOWERCASE}-*`. Skip frozen incident citations (`THR-1636`, `THR-1775`) inside Why/Originating-incident prose where the ticket is a stable historical reference.
18. **Tokenize `templates/install/**`** — sweep the 16 files per Briar's catalog in Review Issues #1, but now under the renamed `templates/install/` directory tree. Same token map as task #17.
19. **Verify dogfood install still builds correctly** — `pnpm prism:check` should pass with `.ai-skills/config.json` providing PRISM's own substitution values. Re-run the literal-Thrive guard against the full surface.
20. **Update `docs/parameterization.md`** — replace "Phase 2" mentions of `scripts/ai-skills/lib/tokens.ts` with "implemented." Verify the schema and substitution table are accurate against the implementation.

### Eli (after PR #2 merges)

21. **Update README** — revise the "Phase 1 — Foundation" bullet to reflect what shipped, and call out that the PR #2 layout reorg landed before tokenization. Particular attention to the "Repo shape" section which needs to reflect the new `.prism/` layout. (Detailed scope tracked in `epic-prism-install-layout.md`.)

---

## Review Issues

### Distribution surface ships hardcoded Thrive identifiers

- **Severity:** `critical`
- **Status:** `open` — deferred to PR #2 (token substitution layer)
- **File:** `templates/claude/architect/skills-ecosystem.md:9-11,225,227,261`, `templates/claude/templates/standup-summary.md:36-217 (~25 refs)`, `templates/claude/rules/git-conventions.md:7,16,34,69`, `templates/claude/rules/pr-description.md:5,6,22,54`, `templates/claude/rules/branch-plan.md:22,23,119`, `templates/claude/templates/pr-description.md:41`, `templates/claude/templates/bug-report.md:39`, `templates/claude/architect/qa-test-planning.md:30,145,161,163,164`, `templates/claude/references/shipping-flow.md:13-16,24,37,39`, `templates/claude/references/dev-doc-template.md:3`, `templates/claude/spec/adrs/0003-authors-ship-reviewers-review.md:38-40,59`
- **Problem:** 16 distribution files contain literal `Thrive`, `tractru`, `TracTru/thrive`, `THR-NNNN`, `thrive.pauseBeforeCommit`. `docs/parameterization.md` claims "Generation-time tokens — `${TICKET_PREFIX}`, `${ORG}`, `${PROJECT}`, etc. appear in canonical sources... and templates/claude/AGENTS.md.tmpl, etc." — only AGENTS.md.tmpl line 33 and SPEC.md.tmpl actually carry tokens. Consumer teams pulling this distribution receive `git config --global thrive.pauseBeforeCommit` and `Format: THR-NNNN: <imperative summary>` hardcoded. Phase 1's "distribution surface populated" promise is incomplete: populated, not generalized.
- **Suggested fix:** Replace `Thrive` → `${PROJECT}`, `THR-NNNN`/`THR-####` → `${TICKET_PREFIX}-NNNN`, `tractru` → `${LINEAR_WORKSPACE}` / `${GITHUB_OWNER}` per context, `thrive.<key>` → `${PROJECT_LOWERCASE}.<key>`, `TracTru/thrive` URLs → `${GITHUB_OWNER}/${GITHUB_REPO}`. Keep ticket numbers in incident-citing prose (e.g. "the THR-1775 audit") only when they're stable historical references that survive shipping; otherwise generalize to "an audit of the architect docs surface" and let the ADR carry the citation.

### Canonical skill sources still hardcode TracTru/thrive

- **Severity:** `major`
- **Status:** `open` — deferred to PR #2 (token substitution layer)
- **File:** `.ai-skills/skills/prism-standup-summary/shared.md:116,120,122,193,199,205,211,223,233,255 (28 refs total)`, `.ai-skills/skills/prism-qa-test-plan/shared.md:7,78,90,98,104,129,177,190,205,251,257,287,289,303,304,309 (38 refs total)`, `.ai-skills/skills/prism-architect/shared.md:4,165,275,324`, `.ai-skills/skills/prism-code-dev/shared.md:5,308,387` (~105 occurrences across 11 of 12 skill sources)
- **Problem:** Same root cause as critical above, on the canonical-sources side. These build into every consumer team's `.claude/skills/`. Lilac runs `gh search prs --repo=TracTru/thrive`; Reese writes output paths to `.claude/docs/qa/thrive-*.md`; Winston references `Thrive_Core\` PHP namespace as the example architecture. `prism:check` passes because the build is byte-faithful — the drift check doesn't validate semantic genericness.
- **Suggested fix:** Same token replacement as critical above. Add a build-time guard that fails when canonical sources contain `Thrive`/`tractru`/`THR-` outside explicit allowlist (e.g. example-payload prose).

### Skills reference rule files deleted in chunk 6

- **Severity:** `major`
- **Status:** `fixed`
- **File:** `.ai-skills/skills/prism-debugger/shared.md:280` (→ `use-effect-guidelines.md`), `.ai-skills/skills/prism-code-review-pr/shared.md:336` (→ `use-effect-guidelines.md`), `.ai-skills/skills/prism-code-review-self/shared.md:263` (→ `use-effect-guidelines.md`), `.ai-skills/skills/prism-code-dev/shared.md:187` (→ `headless-architecture.md`), `.ai-skills/skills/prism-code-dev/shared.md:209` (→ `component-props-decoupling.md`)
- **Problem:** Chunk 6 dropped `use-effect-guidelines.md`, `headless-architecture.md`, `component-props-decoupling.md`, `prop-ordering.md`, `code-standards-{ts,php}.md`, `data-layer-boundaries.md`, `plugins-manifest.md` from `.claude/rules/`. The "framework-specific guidelines" row in `code-standards.md` defers them to per-team Atlas generation. But canonical skill sources still cite them by name. Generated `.claude/skills/<id>/SKILL.md` outputs inherit the dangling refs (line 275 in the SKILL.md driving this very review). Agents loading these skills will look for files that don't exist; the workflow fragment that depends on the rule silently no-ops.
- **Suggested fix:** Either (a) generalize the references to "if your team includes a `use-effect-guidelines.md` rule (generated by Atlas in Phase 2 for React/Next teams), apply it" and let the file's presence drive behavior, or (b) inline the relevant checklist content into the skill itself so the skill stays self-contained.

### Dogfood architect doc contradicts "PRISM on PRISM" framing

- **Severity:** `major`
- **Status:** `fixed`
- **File:** `.claude/architect/skills-ecosystem.md:9-11,225,227,261`
- **Problem:** README says "PRISM uses itself for its own evolution — Winston for architectural decisions, Clove for implementation, Eric and Briar for review. The `.claude/` install at the root is the dogfood." But the dogfood architect doc still anchors to `Repository: tractru/thrive`, `Linear team: THR (prefix: THR-####)`, `GitHub org: tractru`. This is the doc loaded by `**` route on every skill invocation in this repo — so any Winston/Clove/Briar/etc. session in the PRISM repo gets told they're working in tractru/thrive. Currently bites: this review session loaded that doc and had to reason past the lie.
- **Suggested fix:** Reconfigure dogfood `Project Context` to PRISM (`Repository: HunterMcGrew/agent-crew`, `Linear team: <none>` or whatever ticket system the team uses for PRISM work, `GitHub org: HunterMcGrew`). Or accept dogfood-stays-Thrive as a Phase 2 deferred item and document explicitly in `.claude/architect/skills-ecosystem.md`'s opening paragraph that the dogfood install is intentionally pinned to Thrive's shape until Phase 2 self-onboarding lands.

### qa-test-planning ships dealership-specific context

- **Severity:** `major`
- **Status:** `fixed`
- **File:** `templates/claude/architect/qa-test-planning.md:145-164`
- **Problem:** "Thrive serves equipment dealership websites. This shapes what a test plan covers..." plus a dealership-specific context block ships verbatim to consumers. A KTC team or any non-dealership consumer receives instruction to consider "multi-tenant blast radius across dealer sites", "complex inventory data with optional fields like hours/attachments/condition", and "mobile field use by sales reps". This is hard-coded domain context, not a tokenizable string.
- **Suggested fix:** Drop the dealership context block from the shipped template. If domain context belongs in QA planning at all, generate it per-team during onboarding (Phase 2/3) by asking the team about their product domain.

### Schema `$id` references unowned domain

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `.ai-skills/config.schema.json:3`
- **Problem:** `"$id": "https://prism.dev/config.schema.json"` — `prism.dev` is a placeholder. JSON Schema treats `$id` as a canonical URI; if the domain isn't owned, validators following the URI fail.
- **Suggested fix:** Drop `$id` (it's optional) or replace with the GitHub raw URL (`https://raw.githubusercontent.com/HunterMcGrew/agent-crew/main/.ai-skills/config.schema.json`).

### Architecture-doc-shape example anchored to Thrive

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `templates/claude/architect/architecture-doc-shape.md:36`
- **Problem:** "Thrive runs 400+ dealer sites from one codebase" as the model anchor-sentence example. Fine as illustration but signals the generic distribution still drips Thrive-flavor on first read.
- **Suggested fix:** Replace with a fictional-but-plausible example (e.g. "Acme runs N storefront sites from one codebase") or pull the example into a side-by-side panel labelled "Example from PRISM's own dogfood".

### spec-editing.md cites internal Thrive incident in shipped doc

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `templates/claude/architect/spec-editing.md:13`
- **Problem:** "Treating an enumerated list as exhaustive is a known LLM failure mode; it's what produced the Lilac voice drift during THR-1634." Internal incident reference in the shipped distribution doc.
- **Suggested fix:** Generalize to "...is a known LLM failure mode that has produced voice drift in spec content; see ADR-0015 for the originating reasoning."

### ADR-0024 references THR-1775 audit twice in shipped ADR

- **Severity:** `minor`
- **Status:** `fixed`
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
- **Status:** `fixed`
- **File:** `.claude/plans/`
- **Problem:** `phase-1-foundation` is a 391-file epic-scale branch with no plan tracking it (the prior `hmcgrew-ai-skills.md` was deleted in chunk 1). This violates ADR-0001 (plan is source of truth) and the branch-plan rule. Briar created this plan retroactively at review time.
- **Suggested fix:** Backfill `## History` entries for the seven chunks (one line each) and treat this plan as the canonical record going forward. Phase 2 / 3 should each have their own epic plan from day one.

---

## Cleanup Items

- None beyond the dangling rule references in Review Issues #3.

---

## PR Readiness

- [ ] No critical or major issues — **2 open, both deferred to PR #2** (1 critical, 1 major — both tokenization-layer concerns); 8 fixed in this pass (3 major + 5 minor including the inline-comment from earlier)
- [x] Types correct — `pnpm prism:check-types` passes
- [x] No stray console.logs or debug artifacts
- [x] Tests written for new logic — `pnpm prism:test` passes (5 tests covering canonical-source invariants)
- [x] All debugged issues resolved — N/A (no debugged issues)
- [x] Build passes — `pnpm prism:check` passes (drift check + 5 tests); no Next.js bundle in this repo
- [x] PR description up to date — body sync planned at end of this pass (per agent-owned section auto-sync)
- [x] Lasting decisions promoted to architect context — ADR-0029 (rules self-declare) and ADR-0030 (token substitution at build time) authored in dogfood and templates this pass

**Last updated:** 2026-05-03
