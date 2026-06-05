# Plan: epic-prism-tokenization

## Ticket

PRISM Phase 1.5d — Tokenization + content cleanup. No Linear ticket; phase branch.

## Goal

Run the originally-planned PR #3 (token substitution layer) and PR #4 (canonical-content cleanup) as one combined sweep against post-Phase-1.5c content — implement build-time substitution, the literal-Thrive guard, tokenize canonical sources and templates, and strip per-team specifics (language/framework framing, dealership domain blocks, originating-incident THR-* IDs) per ADR-0032.

---

## History

- 2026-05-22 [main]: Plan created. Supersedes epic-phase-1-foundation.md tasks 13-28 which were authored pre-roadmap-revision. Tasks ported with paths refreshed for the post-Phase-1.5a bifurcated layout (`templates/claude/` → `templates/install/.prism/`) and re-sequenced behind Phase 1.5c backports.
- 2026-05-22 [hmcgrew/prism-1.5d-tokenization-and-cleanup]: PR-1.5d implementation complete — substitution layer + literal-Thrive guard + allowlist landed, canonical sources and templates surface swept clean of identifiers, editorial cleanup per ADR-0032 added atlas stub anchors across persona sources, Problem-shape examples in architecture-doc-shape.md stubbed for Atlas to populate. Verification gates all green: `pnpm prism:build`, `pnpm prism:check`, `pnpm prism:check-types`, `pnpm prism:test`. Implemented across 5 sliced subagent dispatches (substitution infra → tokenization sweep → editorial canonical → editorial templates + stub anchor → docs final).

---

## Decisions

- **Combine the original PR #3 (tokenization) and PR #4 (content cleanup) into a single sweep.** The roadmap revision sequences Phase 1.5c (Thrive backports) ahead of this phase.
  - **Root cause:** Doing tokenization first and backports second forces a double-tokenization pass — every backport would land Thrive-flavored content that then needs to be re-swept. Sequencing backports first means there is one stable post-backport surface to tokenize and clean editorially.
  - **Alternatives considered:** Keep PR #3 and PR #4 separate (preserves the original "one concern per PR" split); land tokenization first and backports second (forces double work); skip the literal-Thrive guard until Phase 2 (defers the safety net to Atlas).
  - **Chosen approach:** One sweep, two concerns (mechanical substitution + editorial cleanup). Both touch the same canonical sources and the same templates surface — the file set overlaps near-completely, so doing them in one pass cuts churn. The literal-Thrive guard lands here so any backport drift gets caught at build time before Phase 2.
  - **Implementation guidance:** Substitution layer lands first (tasks 1–4), then the literal-Thrive guard (task 5), then the editorial sweeps on canonical sources (tasks 6–11) and templates (tasks 12–13), then verification (task 14).
  - **Zoe verdict (2026-06-05):** `archive-candidate` — Phase 1.5d shipped 2026-05-22 (History); substitution layer, guard, and allowlist live in scripts/ai-skills; plan never closed.

- **Allowlist mechanism: file-level entries in `.ai-skills/definitions/literal-allowlist.json`.** Path-prefix matching; a file under an allowlisted path is exempt entirely.
  - **Root cause:** Frozen incident citations (`lessons.md`, originating-incident ADRs) must legitimately contain literal `THR-NNNN` IDs and references to "Thrive" by name. A line-level allowlist (file:line entries) is brittle because lines drift; a wildcard-glob allowlist is too loose because it hides accidental drift.
  - **Alternatives considered:** Line-level allowlist (drifts with edits); inline `<!-- allow-literal -->` markers in source (clutters prose); wildcard globs (too loose); no allowlist (forces tokenization of historical incident references that should stay literal).
  - **Chosen approach:** File-level allowlist with explicit `reason` strings. Path-prefix matching keeps the JSON small (one entry covers an ADR directory or a single file). Reasons are required so future maintainers know why each entry exists.
  - **Implementation guidance:** Seed the allowlist from inspection — frozen incident citations in `.prism/lessons.md` and originating-incident ADRs (e.g. `.prism/spec/adrs/0015-humane-language-over-mandates.md`, ADR-0024). Future entries get added with explicit `reason` strings during review.
  - **Zoe verdict (2026-06-05):** `archive-candidate` — Phase 1.5d shipped 2026-05-22 (History); substitution layer, guard, and allowlist live in scripts/ai-skills; plan never closed.

- **Canonical files on disk stay in `${TOKEN}` form; substitution happens in-memory only.** The dogfood install and consumer installs run the same build script with different `.ai-skills/config.json` values — neither writes substituted content back to canonical paths.
  - **Root cause:** Substituting on disk would force two source-of-truth shapes (tokenized canonical + substituted dogfood) and break the symmetry the bifurcated layout (ADR-0031) established between dogfood and consumer installs.
  - **Alternatives considered:** Substitute on disk during build (forces two surface shapes); substitute at sync time inside Atlas (Phase 2 scatters substitution across two layers); keep canonical literal-Thrive (defeats the multi-team value prop).
  - **Chosen approach:** Substitution happens in `scripts/ai-skills/build.ts` between assembly and write — same seam ADR-0030 names. Canonical sources stay tokenized; platform outputs (`.claude/`, `.codex/`, `.cursor/`, `.generated/`) receive substituted content.
  - **Implementation guidance:** Build sequence (this phase locks it in): read canonical → substitute in memory → run path-guard on disk (still tokenized) → write platform outputs (substituted) → run literal-Thrive guard against the outputs.
  - **Zoe verdict (2026-06-05):** `archive-candidate` — Phase 1.5d shipped 2026-05-22 (History); substitution layer, guard, and allowlist live in scripts/ai-skills; plan never closed.

- **Stub-anchor pattern for per-team content: HTML comment markers.** Canonical sources use markers like `<!-- atlas:specializes-in -->`, `<!-- atlas:domain-context -->` to reserve slots where Atlas writes during onboarding.
  - **Root cause:** Atlas needs a deterministic way to locate per-team content insertion points without doing fuzzy text matching against canonical prose. ADR-0032 names the principle ("stub anchors where Atlas writes") but doesn't pin the convention.
  - **Alternatives considered:** Section-heading-only anchors (`## Domain Context` alone) — Atlas has to detect "this is empty, write here" which is heuristic; YAML-frontmatter anchor lists (couples Atlas to a metadata surface that doesn't exist yet); inline `{{atlas:...}}` template literals (collides with future templating).
  - **Chosen approach:** HTML comments. Invisible in rendered markdown, easy for Atlas to find with a literal grep, and don't collide with the existing token-substitution literal form (`${...}`).
  - **Implementation guidance:** Anchor naming follows `atlas:<slot-name>` — `atlas:specializes-in` for persona stack intros, `atlas:domain-context` for domain blocks, `atlas:workflow-example` for language-specific workflow snippets. Each anchor sits immediately above the section it owns. Don't pre-populate the slots — Atlas writes them from the team's actual codebase in Phase 2.
  - **Zoe verdict (2026-06-05):** `archive-candidate` — Phase 1.5d shipped 2026-05-22 (History); substitution layer, guard, and allowlist live in scripts/ai-skills; plan never closed.

- **Skip frozen incident citations during tokenization.** `THR-1636`, `THR-1775`, and similar IDs that appear in Why/Originating-incident prose in `.prism/lessons.md` and originating-incident ADRs stay as literal IDs and get added to the allowlist (task 5).
  - **Root cause:** These are stable historical references — the lessons.md entries and ADRs cite specific incidents that produced specific decisions. Tokenizing them to `${TICKET_PREFIX}-NNNN` would substitute on every consumer install to a number that has no meaning in that team's Linear workspace.
  - **Alternatives considered:** Tokenize them anyway (breaks the citation chain); delete the incident citations entirely (loses historical traceability the ADRs depend on); maintain a separate "frozen IDs" list in each ADR (scatters the convention).
  - **Chosen approach:** Allowlist the files that contain frozen citations; sweep everywhere else.
  - **Implementation guidance:** During the canonical-source sweep (task 9), explicitly distinguish frozen citations (skip + add to allowlist) from illustrative ticket-ID examples (tokenize to `${TICKET_PREFIX}-NNNN`). Originating-incident *prose* in canonical sources outside `lessons.md`/ADRs gets generalized (`THR-1636 — Winston recommended...` becomes `an early-Phase incident where Winston recommended...`) rather than tokenized — the durable record lives in `lessons.md` and the ADR.
  - **Zoe verdict (2026-06-05):** `archive-candidate` — Phase 1.5d shipped 2026-05-22 (History); substitution layer, guard, and allowlist live in scripts/ai-skills; plan never closed.

- **The `.prism/architect/architecture-doc-shape.md` Problem-shape section examples get the stub-anchor treatment.** Carried forward as the only remaining `open` Minor from epic-phase-1-foundation.md — landed via this phase's task 14.
  - **Why:** ADR-0032's principle says canonical content should be generic with stub anchors where Atlas writes specifics. The CI / block-system examples in that section encode Thrive's specific architecture (fleet of dealer sites, WordPress + Next.js split, Gutenberg block editor) even though they read as concrete and plausible. Replacing with `<!-- atlas:problem-shape-examples -->` lets Atlas write per-team illustrations during onboarding.
  - **Zoe verdict (2026-06-05):** `archive-candidate` — Phase 1.5d shipped 2026-05-22 (History); substitution layer, guard, and allowlist live in scripts/ai-skills; plan never closed.

---

## Implementation Tasks

Tasks are grouped by persona per ADR-0018. The Clove block is internally organized by sub-area (substitution layer → guard → canonical sweep → templates sweep → content cleanup → verification) since one persona owns it end-to-end. Sequence dependencies are noted inline.

### Clove (substitution layer)

1. **Extract derivation logic to `scripts/ai-skills/lib/tokens.ts`.** New file. Exports:
   - `loadConfig(repoRoot: string): PrismConfig` — reads `.ai-skills/config.json`, parses JSON, validates against `.ai-skills/config.schema.json`. Throws with file path + JSON Pointer when validation fails.
   - `deriveTokenMap(config: PrismConfig): Map<string, string>` — builds the full substitution map. Raw keys (from config): `${PROJECT}`, `${TICKET_PREFIX}`, `${GITHUB_OWNER}`, `${GITHUB_REPO}`, `${LINEAR_WORKSPACE}`. Derived keys: `${PROJECT_LOWERCASE}`, `${TICKET_PREFIX_LOWERCASE}`, `${GITHUB_OWNER_LOWERCASE}`. Source-of-truth list lives in `docs/parameterization.md` § Substitution table — verify the doc matches the implementation before commit.
   - `substituteTokens(content: string, tokenMap: Map<string, string>): string` — straight `${KEY}` literal replacement, no escapes, no conditional logic. Unknown tokens (literal in content but not in map) throw with the literal token name plus the first 80 chars of surrounding context.
   - Verification: file compiles standalone (`pnpm prism:check-types`). Sequence: blocks tasks 2, 3, 5.

2. **Implement token substitution in `scripts/ai-skills/build.ts`.** Load config once at the start of `main()` via `loadConfig()`. Apply `substituteTokens()` at the seam between assembly and write — both in `buildSkillMarkdown` (skill outputs to `.claude/skills/`, `.codex/skills/`, `.cursor/skills/`, `.generated/cursor-skills/`) and in `copyContentToPlatformDirs` (the content copy paths under `.claude/`, `.codex/`, `.cursor/` per ADR-0031). Both paths run substituted output through `writeFileIfChanged` so drift detection still operates on the post-substitution form. Canonical files at `.prism/<area>/` and `.ai-skills/skills/<id>/` stay tokenized on disk. Verification: `pnpm prism:check` against the dogfood `config.json` (`PROJECT=PRISM`, `TICKET_PREFIX=PRISM`, `GITHUB_OWNER=HunterMcGrew`, `GITHUB_REPO=agent-crew`) — outputs should be substituted; drift check should pass. Sequence: after task 1; blocks tasks 5, 6.

3. **Add substitution regression tests at `scripts/ai-skills/tokens.test.ts`.** New file. Cover:
   - **Happy path:** sample `PrismConfig` + sample input string `"Welcome to ${PROJECT} (${TICKET_PREFIX}-NNNN format)"` → expected output `"Welcome to PRISM (PRISM-NNNN format)"`.
   - **Missing config key referenced in content:** input contains `${UNKNOWN_TOKEN}` → `substituteTokens` throws with the token name in the message.
   - **Malformed token literal handling:** input contains `${` (unterminated), `${ KEY }` (whitespace), `${KEY` (no closing brace) → all three left alone (passed through verbatim). Lock the behavior down with explicit test assertions so future contributors can't quietly change it.
   - **Derived-token cascades:** `${PROJECT_LOWERCASE}` resolves to `lowercase(${PROJECT})` regardless of map iteration order. Test by reversing the insertion order in the map and asserting same output.
   Run via `pnpm prism:test`. Sequence: after task 1.

4. **Update `docs/parameterization.md`.** Replace any "Phase 2" mentions of `scripts/ai-skills/lib/tokens.ts` with "implemented in Phase 1.5d." Verify § Substitution table matches `deriveTokenMap` output exactly — if the table drifted during implementation, sync the doc to the code. Verification: content-only change, no build effect; `pnpm prism:check` confirms no drift on the build outputs. Sequence: after task 1.

### Clove (literal-Thrive build-time guard)

5. **Add literal-Thrive guard to the build.** In `scripts/ai-skills/build.ts`, after substitution and write, scan all platform outputs (`.claude/`, `.codex/`, `.cursor/`, `.generated/cursor-skills/`) for the regex `(Thrive|tractru|TracTru/thrive|THR-[0-9]+|thrive\.[a-zA-Z]+)`. Implementation:
   - Read each output file as UTF-8, match the regex line-by-line, collect file:line:match tuples for any hit.
   - Load `.ai-skills/definitions/literal-allowlist.json` (new file, schema below). Filter out hits under any allowlisted path (path-prefix matching).
   - If any hits remain, print each as `<file>:<line>: <matched literal>` and `process.exit(1)`. Build fails.
   - Schema for the allowlist file:
     ```json
     {
       "files": [
         { "path": ".claude/lessons.md", "reason": "lessons cite originating incidents by ticket ID" },
         { "path": ".codex/lessons.md", "reason": "platform-copy mirror of canonical lessons" },
         { "path": ".cursor/lessons.md", "reason": "platform-copy mirror of canonical lessons" },
         { "path": ".claude/spec/adrs/0015-humane-language-over-mandates.md", "reason": "ADR cites originating incident" },
         { "path": ".codex/spec/adrs/0015-humane-language-over-mandates.md", "reason": "platform-copy mirror" },
         { "path": ".cursor/spec/adrs/0015-humane-language-over-mandates.md", "reason": "platform-copy mirror" }
       ]
     }
     ```
   - Seed with the platform-copy mirror paths for every allowlisted canonical file (because the guard runs against post-substitution outputs, every canonical exemption needs a matching mirror exemption).
   Verification: `pnpm prism:check` runs the guard and exits non-zero on a deliberate test violation (add a literal `Thrive` to a temp canonical file, confirm build fails; remove and confirm build passes). Sequence: after task 2; blocks task 15.

### Clove (canonical source tokenization sweep)

6. **Tokenize identifiers in `.ai-skills/skills/*/shared.md`.** Sweep every `shared.md` with hardcoded identifiers; canonical addenda (`claude.md`, `codex.md`, `cursor.md`) too. Token map:
   - `Thrive` → `${PROJECT}` (literal name in prose)
   - `tractru` in Linear-workspace context (e.g. `linear-workspace=tractru`, `gh search prs --repo=tractru/...`) → `${LINEAR_WORKSPACE}` when the surrounding prose names Linear, `${GITHUB_OWNER}` when it names GitHub. Determine by reading the surrounding sentence.
   - `TracTru/thrive` (GitHub repo URL form) → `${GITHUB_OWNER}/${GITHUB_REPO}`
   - `THR-NNNN` in illustrative ticket-prefix usage → `${TICKET_PREFIX}-NNNN`
   - `thrive.<key>` (e.g. `git config --global thrive.pauseBeforeCommit`) → `${PROJECT_LOWERCASE}.<key>`
   - Output paths `.claude/docs/qa/thrive-*` → `.claude/docs/qa/${PROJECT_LOWERCASE}-*` (the leading `.claude/docs/qa/` segment stays — platform output paths are deferred to Phase 2).
   - **Skip frozen incident citations** (e.g. `THR-1636`, `THR-1775` in Why / Originating-incident prose) — add the containing file to the literal-Thrive allowlist (task 5) instead of tokenizing.
   Files (from epic-phase-1-foundation.md Issue #2 catalog): `.ai-skills/skills/prism-standup-summary/shared.md`, `.ai-skills/skills/prism-qa-test-plan/shared.md`, `.ai-skills/skills/prism-architect/shared.md`, `.ai-skills/skills/prism-code-dev/shared.md`, plus every other `shared.md` that contains any pattern in the regex above. Verification: `pnpm prism:build` regenerates platform outputs; `pnpm prism:check` confirms no drift; task 5's guard reports zero non-allowlisted violations. Sequence: after task 5; blocks task 15.

7. **Tokenize identifiers in canonical addenda (`claude.md`, `codex.md`, `cursor.md`).** Same token map as task 6. Files: every `.ai-skills/skills/<id>/{claude,codex,cursor}.md` that contains a regex match. Verification: same as task 6. Sequence: after task 5; can run parallel with task 6.

### Clove (templates surface tokenization sweep)

8. **Tokenize identifiers in `templates/install/.prism/**`.** Apply the same token map as task 6 across the templates surface (post-Phase-1.5a layout — templates moved from `templates/claude/` to `templates/install/.prism/`). Files (from epic-phase-1-foundation.md Issue #1 catalog, refreshed for new paths):
   - `templates/install/.prism/architect/skills-ecosystem.md` — Repository / Linear team / GitHub org Project Context block, plus PR URL examples and `Thrive squash-merges` phrasing
   - `templates/install/.prism/templates/standup-summary.md` — ~25 refs across the file
   - `templates/install/.prism/rules/git-conventions.md` — Format `THR-NNNN: <imperative summary>` examples + `Thrive squash-merges` policy line
   - `templates/install/.prism/rules/pr-description.md` — PR Title format + Thrive squash-merge reference
   - `templates/install/.prism/rules/branch-plan.md` — ticket ID examples (THR-1448, THR-1524, THR-1775) + plan filename examples
   - `templates/install/.prism/templates/pr-description.md` — THR-#### Linear URL example
   - `templates/install/.prism/templates/bug-report.md` — ticket ID example
   - `templates/install/.prism/architect/qa-test-planning.md` — Thrive product name references
   - `templates/install/.prism/references/shipping-flow.md` — `git config --global thrive.pauseBeforeCommit` invocations
   - `templates/install/.prism/references/dev-doc-template.md` — Thrive product name reference
   - `templates/install/.prism/spec/adrs/0003-authors-ship-reviewers-review.md` — Thrive review-flow references in narrative
   - Plus any other file under `templates/install/.prism/` that task 5's guard surfaces during verification — the guard is the source of truth for what's left.
   Verification: `pnpm prism:build` runs the platform-output write against the templates surface (templates are content-only, not part of the build's skill assembly — verify by inspecting the surface after the build); task 5's guard reports zero non-allowlisted violations under `templates/install/.prism/`. Sequence: after task 5; parallel-safe with tasks 6–7.

### Clove (editorial content cleanup per ADR-0032)

9. **Strip language and framework-specific framing from canonical persona "specializes in" intros.** Files and lines (carried from epic-phase-1-foundation.md task 21 — verify lines against current file content before editing, post-Phase-1.5c content may have shifted):
   - `.ai-skills/skills/prism-architect/shared.md:2-4` — strip `TypeScript / React, WordPress, PHP class-based architecture` framing; rewrite to language-agnostic ("Application architecture, frontend frameworks and component design, backend services and APIs, test coverage and quality assurance"); insert `<!-- atlas:specializes-in -->` anchor immediately above the rewritten intro.
   - `.ai-skills/skills/prism-code-dev/shared.md:3-6` — same pattern.
   - `.ai-skills/skills/prism-code-review-pr/shared.md:4-6` — same pattern.
   - `.ai-skills/skills/prism-code-review-self/shared.md:3-5` — same pattern.
   - `.ai-skills/skills/prism-debugger/shared.md:7-9` — same pattern.
   - `.ai-skills/skills/prism-documentation/shared.md:3` — same pattern.
   - `.ai-skills/skills/prism-changelog/shared.md:83` — same pattern (intro is later in this file).
   Verification: `pnpm prism:build` regenerates the SKILL.md mirrors; `pnpm prism:check` confirms no drift; manual read of regenerated outputs confirms the intros read sensibly without specializations baked in. Sequence: after task 6 (so identifier substitution doesn't conflict with prose rewrites).

10. **Strip language and framework-specific framing from canonical workflow examples and review checklists.** Files and lines (carried from epic-phase-1-foundation.md task 21):
    - `.ai-skills/skills/prism-code-dev/shared.md:55,125,139,167-169,187,195,217,229-234,238,289,364-365,378,409` — rewrite examples to language-agnostic concepts ("derived state in effects", "server/client boundary violations") OR mark them as "language-specific example — adapt for your stack" with `<!-- atlas:workflow-example -->` anchors where Atlas writes the team-stack-specific version during onboarding. Drop framework-conditional bullets that only apply to React/Next.js/WordPress shops; rely on Atlas-generated rules per ADR-0029 to carry per-team checklists.
    - `.ai-skills/skills/prism-code-review-pr/shared.md:109-110,305,333,386` — same pattern.
    - `.ai-skills/skills/prism-code-review-self/shared.md:180,218,225,232,246,256,262` — same pattern.
    - `.ai-skills/skills/prism-debugger/shared.md:57,128,140-141,218,278-299` — same pattern.
    - `.ai-skills/skills/prism-documentation/shared.md:92-94,200,247,250,269,273-274,282-284,328` — same pattern.
    - `.ai-skills/skills/prism-changelog/shared.md:149,177` — same pattern.
    - `.ai-skills/skills/prism-architect/shared.md:139,157-165` — same pattern.
    Verification: `pnpm prism:build` + `pnpm prism:check` + manual read. Sequence: after task 9 (sibling content; ordering avoids merge churn within the same files).

11. **Strip equipment dealership domain context blocks from canonical persona sources.** Replace each `## Equipment Dealership Context` (or similarly-named) section with a `## Domain Context` stub — section heading present, immediately followed by an `<!-- atlas:domain-context -->` anchor and a one-line note: `Populated during onboarding from the team's actual product domain.` Atlas writes the team's actual domain content into the slot during Phase 2. Files (from epic-phase-1-foundation.md task 22):
    - `.ai-skills/skills/prism-pixel/shared.md:53,305,323,542,557`
    - `.ai-skills/skills/prism-code-dev/shared.md:228-234`
    - `.ai-skills/skills/prism-code-review-pr/shared.md:117-122`
    - `.ai-skills/skills/prism-code-review-self/shared.md:120-126`
    - `.ai-skills/skills/prism-debugger/shared.md:144-152`
    - `.ai-skills/skills/prism-documentation/shared.md:98-106`
    - `.ai-skills/skills/prism-changelog/shared.md:181-186`
    - `.ai-skills/skills/prism-ticket-start/shared.md:251-258`
    Verification: same as task 9. Sequence: after task 10 (avoid same-file overlap with the workflow-example rewrites).

12. **Generalize originating-incident citations in canonical sources.** Two sub-patterns:
    - **Originating-incident citations** — rephrase to drop the specific THR-* ID, keep the phenomenon. Files (carried from epic-phase-1-foundation.md task 23): `.ai-skills/skills/prism-architect/shared.md:324`, `.ai-skills/skills/prism-code-dev/shared.md:387`, `.ai-skills/skills/prism-qa-test-plan/shared.md:519`. Pattern: `THR-1636 — Winston recommended a new ticket for in-scope work` → `an early-Phase incident where Winston recommended a new ticket for in-scope work`. The `lessons.md` entry and the relevant ADR carry the durable record; these in-line citations only need to evoke the phenomenon.
    - **Illustrative ticket-ID examples** — replace literal `THR-NNNN` with `${TICKET_PREFIX}-NNNN` so substitution at build time resolves to the consumer team's prefix. Files: `.ai-skills/skills/prism-qa-test-plan/shared.md:104`, `.ai-skills/skills/prism-ticket-start/shared.md:100,244,282,411`, `.ai-skills/skills/prism-documentation/shared.md:149`.
    Verification: same as task 9. Sequence: after task 6 (the identifier-substitution sweep handles the mechanical part; this task handles the prose-level distinction between citation and example).

13. **Apply the same editorial passes to `templates/install/.prism/**`.** Two sub-patterns from the templates surface (carried from epic-phase-1-foundation.md task 24):
    - **Originating-incident citations in templates** — `templates/install/.prism/spec/adrs/0018-persona-lane-ownership.md:12` (THR-1632), `templates/install/.prism/rules/architect-doc-verification.md:5` (THR-1775), `templates/install/.prism/rules/branch-plan.md:119` (THR-1775). Same generalization pattern as task 12.
    - **Illustrative ticket-ID examples in templates** — `templates/install/.prism/rules/branch-plan.md:22-23` (THR-1448, THR-1524), `templates/install/.prism/rules/git-conventions.md:34` (THR-1588). Replace with `${TICKET_PREFIX}-NNNN` literals; substitution layer (task 2) handles the rest.
    - **In-prose plan-file references** — `templates/install/.prism/spec/adrs/0030-token-substitution-at-build-time.md:28` (and the 8 additional dangling-internal-path refs Winston surfaced during PR #1: ADRs 0003, 0005, 0015, 0016, 0017, 0018 and `references/shipping-flow.md`). Drop the file path from the prose; rephrase so the sentence reads naturally without the dangling pointer.
    Verification: `pnpm prism:check` (templates are content-only); task 5's guard reports zero non-allowlisted violations. Sequence: parallel-safe with tasks 9–12 (different file tree).

### Clove (carryover from PR #1 deferred items)

14. **Apply the stub-anchor treatment to the architecture-doc-shape Problem-shape examples.** Files: `.prism/architect/architecture-doc-shape.md` and the templates mirror `templates/install/.prism/architect/architecture-doc-shape.md`. Replace the CI / block-system example paragraph with `<!-- atlas:problem-shape-examples -->` anchor + a one-line note: `Per-team examples are populated during onboarding from the team's actual architecture.` The principle (problem-shape↔solution-shape framing) stands without the specific examples — consumer teams add their own paired example during Phase 2. Verification: content-only change, no build effect; manual read of both surfaces confirms the section still teaches the principle. Sequence: parallel-safe with tasks 9–13.

### Clove (verification)

15. **Run full verification before commit.** In sequence:
    - `pnpm prism:build` — substituted outputs regenerate cleanly; literal-Thrive guard runs as part of the build and reports zero non-allowlisted violations.
    - `pnpm prism:check` — drift check passes (canonical + outputs in sync); 5+ existing tests pass; new tokens.test.ts tests pass.
    - `pnpm prism:check-types` — types clean across tokens.ts, build.ts, tests.
    - `pnpm prism:test` — substitution tests + canonical-source invariant tests all pass.
    - Manual smoke test: open a Briar / Clove / Winston session in chat against the dogfood install and confirm the persona intros read sensibly without specializations baked in (they should sound generic, with stub anchors where Atlas would write). Confirm illustrative ticket-ID examples render as `PRISM-NNNN` (the dogfood's substituted value).
    Sequence: after every other Clove task; blocks shipping.

### Eli (documentation)

16. **Update README to reflect Phase 1.5d completion.** Revise the `## Phased roadmap` section to mark Phase 1.5d as shipped. Particular attention to any roadmap entries that still phrase tokenization as "Phase 2" — Phase 1.5d is the substitution layer, Phase 2 is Atlas writing the per-team config. Verification: content-only change, no build effect; visual inspection confirms the roadmap reads correctly. Sequence: after task 15.

17. **Update `docs/parameterization.md` final state.** Confirm § Substitution table matches `deriveTokenMap` output exactly (task 4 already started this — task 17 is the final pass after all sweeps land). Add a "How tokens propagate to consumer installs" subsection: canonical sources stay tokenized; the build substitutes when generating platform outputs; consumer installs run their own build against their own `.ai-skills/config.json`. Verification: content-only change; manual read confirms the doc matches the implementation. Sequence: after task 15.

---

## Acceptance Criteria

### Behavioral

- [ ] Given `.ai-skills/config.json` is set to PRISM's dogfood values (`PROJECT=PRISM`, `TICKET_PREFIX=PRISM`, `GITHUB_OWNER=HunterMcGrew`, `GITHUB_REPO=agent-crew`, `LINEAR_WORKSPACE=PRISM`), When `pnpm prism:build` runs, Then platform outputs under `.claude/`, `.codex/`, `.cursor/`, `.generated/cursor-skills/` contain the substituted values in place of `${TOKEN}` literals.
- [ ] Given canonical sources at `.prism/` and `.ai-skills/skills/`, When inspected on disk, Then they still contain `${TOKEN}` literals (substitution is in-memory only; canonical files stay tokenized).
- [ ] Given a contributor adds a literal `Thrive` to a canonical source outside the allowlist, When `pnpm prism:build` runs, Then the build exits non-zero with the offending file:line.
- [ ] Given a file is listed in `.ai-skills/definitions/literal-allowlist.json`, When the literal-Thrive guard runs against the platform-output mirror of that file, Then the guard reports zero violations for paths under the allowlisted prefix.
- [ ] Given a non-WordPress / non-React consumer team's `config.json`, When `pnpm prism:build` runs, Then the generated persona intros contain no `WordPress`, `React`, `TypeScript`, `PHP`, `useEffect`, `RSC`, `Next.js`, `Pest PHP`, `Jest`, `Apollo`, `GraphQL`, `Gutenberg` literals.
- [ ] Given a non-dealership consumer team's install, When the user opens a Pixel/Briar/Clove/Winston session, Then the loaded persona content contains no `dealer`, `dealership`, `multi-tenant blast radius`, `B2B quote flow` framing.
- [ ] Given a consumer team's `config.json` with `TICKET_PREFIX=ACME`, When `pnpm prism:build` runs, Then illustrative ticket-ID examples in canonical sources render as `ACME-NNNN` (not `THR-NNNN` and not `PRISM-NNNN`).
- [ ] Given `lessons.md` and originating-incident ADRs are in the allowlist, When `pnpm prism:build` runs, Then frozen incident citations (`THR-1636`, `THR-1775`, etc.) survive in their platform-output mirrors without tripping the guard.

### Non-behavioral

- [ ] `scripts/ai-skills/lib/tokens.ts` exists and exports `loadConfig`, `deriveTokenMap`, `substituteTokens`.
- [ ] `scripts/ai-skills/tokens.test.ts` exists with happy-path, missing-key, malformed-literal, and derived-cascade test coverage.
- [ ] `.ai-skills/definitions/literal-allowlist.json` exists, conforms to the documented schema, and seeds with `lessons.md` (canonical + 3 platform mirrors) and originating-incident ADR entries (canonical + 3 platform mirrors per allowlisted ADR).
- [ ] `pnpm prism:check`, `pnpm prism:check-types`, `pnpm prism:test`, `pnpm prism:build` all pass with zero drift and zero non-allowlisted guard violations.
- [ ] Every persona's "specializes in" intro section in `.ai-skills/skills/*/shared.md` has an `<!-- atlas:specializes-in -->` anchor.
- [ ] Every `## Equipment Dealership Context` section in `.ai-skills/skills/*/shared.md` has been replaced with `## Domain Context` + `<!-- atlas:domain-context -->` anchor.
- [ ] `docs/parameterization.md` § Substitution table matches `deriveTokenMap` output exactly.
- [ ] README `## Phased roadmap` reflects Phase 1.5d as shipped.

### AC Adjustments

### AC Sync Log

| Date | Agent | Action | Plan | Linear |
| ---- | ----- | ------ | ---- | ------ |
| 2026-05-22 | Winston | Created initial AC | updated | N/A |

---

## Cleanup Items

- None at plan creation. Cleanup items get added as Briar/Eric surface them during review.

---

## PR Readiness

- [ ] No critical or major issues
- [ ] Types correct — no `any`, no unsafe `as`
- [ ] No stray console.logs or debug artifacts
- [ ] Tests written for new logic and edge cases
- [ ] All debugged issues resolved (no `open` entries)
- [ ] Build passes — last run: TBD
- [ ] PR description up to date
- [ ] Lasting decisions promoted to architect context (if applicable)

**Last updated:** 2026-05-22
