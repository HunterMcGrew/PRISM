# Plan: epic-prism-atlas

## Ticket

PRISM Phase 2 — Atlas onboarding persona (no Linear ticket; phase work tracked under `.prism/plans/roadmap.md` § Phase 2).

## Goal

Build Atlas as PRISM's onboarding persona that detects each consumer team's stack, generates per-team rules (including a stack-appropriate `security.md`), populates stub anchors left in canonical persona sources, writes `.ai-skills/config.json`, and coordinates with the Phase 1.5d token-substitution layer so a fresh install lands a fully configured `.prism/` reflecting the team's actual codebase.

---

## User Stories

- As a consumer team lead running `Atlas onboard` in my repo, I want a guided, resumable conversation that probes my stack, asks the small set of questions Atlas can't infer (project name, ticket prefix, GitHub org/repo, Linear workspace, product domain), and then writes `.ai-skills/config.json` plus per-team rules, so that after one command my `.prism/` install reflects how my team actually works.
- As a PRISM contributor authoring canonical persona source, I want to drop `<!-- atlas:<anchor> -->` markers wherever team-specific content belongs and trust Atlas will fill them at onboarding, so that I can keep canonical sources generic (per ADR-0032) without losing the ability to ship rich per-team context.
- As a Python/Django team installing PRISM, I want Atlas to detect Django from `requirements.txt` or `pyproject.toml`, generate `.prism/rules/code-standards-python.md` and `.prism/rules/security.md` populated with Django-appropriate guidance (CSRF, ORM safety, template auto-escape), so that PRISM's review and implementation personas have the same applicability-declaring rules a TypeScript shop gets, without hand-authoring them.
- As Hunter, the PRISM maintainer, I want to run Atlas against PRISM itself as the first dogfood — exercising the whole flow on a repo I fully control — so that bugs in detection, generation, and substitution surface before any external team installs.

---

## Design

Not applicable — Atlas is a conversational onboarding flow. No UI surface beyond the chat transcript and the files Atlas writes. Pixel is not in scope for this epic.

---

## Implementation Tasks

Tasks are grouped by sub-PR. Each task hits the detail bar in `.prism/rules/implementation-task-detail.md` — file paths, exact changes, verification commands, and sequence dependencies noted inline. Verification commands assume `pnpm prism:*` scripts from Phase 1; substitute equivalents if the script names have changed by the time this epic starts.

### PR-2.1 — Atlas skill scaffold + interactive flow + config writing

**Branch:** `hmcgrew/prism-2.1-atlas-scaffold`
**Depends on:** Phase 1.5d (tokenization layer in place — Atlas writes config.json that the build's substitution layer consumes).
**Blocks:** PR-2.2, PR-2.3, PR-2.4, PR-2.5 (all subsequent Atlas sub-PRs extend the scaffold).
**Parallel-safe with:** none — must merge first within Phase 2.
**Verification:** `pnpm prism:build && pnpm prism:check && pnpm prism:check-types && pnpm prism:test` after each task.

#### Clove (implementation)

1. **Create the canonical skill directory** at `.ai-skills/skills/prism-atlas/`. Mirror the layout used by `.ai-skills/skills/prism-architect/` — directory with `frontmatter.yml`, `shared.md`, `claude.md`, `codex.md`, `cursor.md`. Verification: `ls -la .ai-skills/skills/prism-atlas/` shows the five files. No build effect yet.

2. **Write `.ai-skills/skills/prism-atlas/frontmatter.yml`** with:
   - `id: prism-atlas`
   - `name: Atlas`
   - `description:` triggers on "Atlas onboard", "onboard this repo", "set up PRISM here", "configure PRISM for my team"
   - `category: onboarding`
   - `allowed-tools: [Read, Write, Edit, Bash, Glob, Grep]`
   - No `paths:` constraint — Atlas runs on a fresh repo; no diff to scope against.
   Verification: `pnpm prism:check` parses the frontmatter without error.

3. **Write `.ai-skills/skills/prism-atlas/shared.md`** with these sections in order:
   - Identity (one paragraph — Atlas is the onboarding persona; runs once per team install or on stack change)
   - Personality (calm, methodical, cartographic — maps the team's terrain before drawing the map)
   - When this skill is invoked (auto-run startup batch — read `.ai-skills/config.json` if it exists, scan repo root for package-file fingerprints, locate `.ai-skills/registry/onboarding-state.json`)
   - Onboarding modes (first-install — no prior config; reconfigure — config exists, user wants to re-run; dogfood-self — PRISM running Atlas against itself)
   - Interactive flow (project name, ticket prefix, GitHub org/repo, Linear workspace, product domain, existing engineering standards — one question per turn, save state after each)
   - Output contract (writes `.ai-skills/config.json` validated against `.ai-skills/config.schema.json`; writes `.ai-skills/registry/onboarding-state.json` tracking step completion; emits a final summary listing every file touched)
   - Definition of Done (config schema-validates; state file marked complete; rules generated for every detected language; build runs green)
   Reference `.ai-skills/skills/prism-architect/shared.md` for tone and section depth. Verification: file exists and contains all named sections.

4. **Write platform variants** `claude.md`, `codex.md`, `cursor.md` at `.ai-skills/skills/prism-atlas/`. Each is the platform-specific overlay. Mirror the pattern used by `.ai-skills/skills/prism-architect/claude.md` — keep platform files thin, push shared behavior into `shared.md`. Verification: `pnpm prism:build` assembles all three platform outputs at `.claude/skills/prism-atlas/SKILL.md`, `.codex/skills/prism-atlas/SKILL.md`, `.cursor/skills/prism-atlas/SKILL.md` without error.

5. **Wire Atlas into `.ai-skills/manifest.json`** — add an entry for `prism-atlas` with `paths: ["**"]` so Atlas loads on any startup, alongside `skills-ecosystem.md`. Verification: `pnpm prism:check-types && pnpm prism:test --testPathPatterns=manifest`.

6. **Define `OnboardingConfig` and supporting types** at `scripts/ai-skills/lib/onboarding-types.ts`. Shape:
   ```ts
   export interface OnboardingConfig {
     project: string;
     ticketPrefix: string;
     githubOwner: string;
     githubRepo: string;
     linearTeam: string;
     productDomain: string;
     techStack: DetectedStack; // from PR-2.2 — typed forward; placeholder ok in this PR
     existingStandards: string[]; // paths to user-supplied standards docs
   }
   ```
   Plus `OnboardingState` (step name, status, timestamp). Verification: `pnpm prism:check-types`.

7. **Implement `writeOnboardingConfig`** at `scripts/ai-skills/lib/onboarding-config.ts`. Behavior:
   - Validate input against `.ai-skills/config.schema.json` before write
   - Atomic write: write to `.ai-skills/config.json.tmp`, then `rename` to `.ai-skills/config.json`
   - Return `{ path, schemaValidated: true }` on success; throw a typed error on schema failure
   No external dependencies — use built-in `fs.promises`. Verification: `pnpm prism:test --testPathPatterns=onboarding-config`.

8. **Add tests** at `scripts/ai-skills/onboarding-config.test.ts`. Cover:
   - Valid config writes successfully
   - Invalid config (missing required field) throws with field name in the message
   - Atomic write — interrupted mid-write leaves the original `.ai-skills/config.json` untouched (test by mocking `rename` to throw after the tmp file lands)
   - Idempotent — writing the same config twice produces byte-identical output
   Sequence: after task 7. Verification: `pnpm prism:test --testPathPatterns=onboarding-config` — all green.

9. **Implement state tracking** at `scripts/ai-skills/lib/onboarding-state.ts`. Behavior:
   - `loadState(repoRoot): OnboardingState | null` — returns null if no file
   - `saveState(repoRoot, state): void` — atomic write to `.ai-skills/registry/onboarding-state.json`
   - `markStepComplete(state, stepName): OnboardingState` — pure function returning new state
   - `nextIncompleteStep(state): string | null` — drives resume-from-where-you-left-off
   Verification: file exists and types compile.

10. **Add tests** at `scripts/ai-skills/onboarding-state.test.ts`. Cover load-empty, save-load roundtrip, mark-complete idempotency, next-incomplete after partial progress. Sequence: after task 9. Verification: `pnpm prism:test --testPathPatterns=onboarding-state`.

#### Eli (documentation)

11. **Write ADR-0040** at `.prism/spec/adrs/0040-atlas-as-onboarding-persona.md` and templates mirror at `templates/claude/spec/adrs/0040-atlas-as-onboarding-persona.md`. Structure per other PRISM ADRs (Context / Decision / Consequences / References). Cover: why Atlas is its own persona (not a Winston sub-mode — proactive vs reactive cadence, distinct invocation surface, separate state file); why onboarding lives in a dedicated skill rather than a script (conversational flow, can ask clarifying questions, can re-enter on reconfigure). Cite ADRs 0029, 0030, 0032 as upstream architectural commitments Atlas implements. Verification: `pnpm prism:check` parses both files; cross-link from roadmap.

12. **Update `.prism/plans/roadmap.md` § Phase 2** — replace the `TBD: epic-prism-atlas.md` cell in the proposed-phases table with a live link to this plan. Verification: `grep -n "epic-prism-atlas.md" .prism/plans/roadmap.md` returns a markdown link, not a TBD string.

13. **Update `.prism/architect/skills-ecosystem.md` § Skill Roster** to add an Atlas row. Slot it between the header row and `prism-ticket-start` so onboarding reads first. Cells: `prism-atlas` | `Atlas` | "Onboarding persona — detects stack, generates per-team rules, writes config.json, populates stub anchors. Runs once per team install or on stack change." | `No`. Verification: `pnpm prism:check`.

14. **Update `AGENTS.md` § Skill Auto-Routing** with onboarding intent routing. Add a row: trigger phrases ("onboard this repo", "set up PRISM here", "configure PRISM for my team", "Atlas onboard") → invoke `prism-atlas`. Verification: file diff shows the new row only; no other rows touched.

### PR-2.2 — Stack detection subsystem

**Branch:** `hmcgrew/prism-2.2-stack-detection`
**Depends on:** PR-2.1 (Atlas's scaffold provides the invocation point for `detectStack`).
**Blocks:** PR-2.3 (rule generators consume `DetectedStack`).
**Parallel-safe with:** PR-2.4 (anchor substitution is independent of stack detection — different files, different module boundaries).
**Verification:** `pnpm prism:build && pnpm prism:check-types && npx jest --testPathPatterns=stack-detect --no-coverage`.

#### Clove (implementation)

1. **Define detection types** at `scripts/ai-skills/lib/stack-detect.ts`:
   ```ts
   export interface DetectedLanguage {
     name: 'typescript' | 'javascript' | 'php' | 'python' | 'go' | 'rust' | 'ruby' | 'elixir' | 'java' | 'unknown';
     confidence: 'high' | 'medium' | 'low';
     evidence: string[]; // paths to files that triggered detection
   }
   export interface DetectedFramework {
     name: string; // 'react' | 'next' | 'vue' | 'svelte' | 'express' | 'fastify' | 'wordpress' | 'laravel' | 'symfony' | 'django' | 'flask' | 'fastapi' | 'rails' | 'sinatra' | 'spring' | 'phoenix'
     confidence: 'high' | 'medium' | 'low';
     evidence: string[];
   }
   export type DetectedStack = {
     languages: DetectedLanguage[];
     frameworks: DetectedFramework[];
   } | { languages: [{ name: 'unknown'; confidence: 'high'; evidence: [] }]; frameworks: [] };
   ```
   The empty-repo sentinel is `["unknown"]`, not an error. Verification: `pnpm prism:check-types`.

2. **Implement `detectStack(repoRoot: string): Promise<DetectedStack>`** in the same file. Algorithm: glob for the package-file fingerprints below in parallel; for each match, call the corresponding inspector; merge results; deduplicate by name; sort by confidence descending. Verification: deferred to task 11.

3. **Implement `inspectPackageJson(path: string): { languages, frameworks }`**. Detect TypeScript by presence of `typescript` in `dependencies`/`devDependencies` OR a `tsconfig.json` sibling. Detect frameworks by dependency name: `react`, `next`, `vue`, `nuxt`, `svelte`, `@sveltejs/kit`, `express`, `fastify`, `@nestjs/core`. JS-only when no TS signal. Verification: deferred to task 11.

4. **Implement `inspectComposerJson(path: string)`**. Detect PHP. Frameworks: `johnpbloch/wordpress-core` or `roots/wordpress` → wordpress; `laravel/framework` → laravel; `symfony/symfony` or `symfony/framework-bundle` → symfony. Verification: deferred to task 11.

5. **Implement `inspectPython(repoRoot: string)`** — checks all three Python package files in priority order: `pyproject.toml` (preferred), then `Pipfile`, then `requirements.txt`. Detect frameworks: `django` or `Django` → django; `flask` or `Flask` → flask; `fastapi` → fastapi. Use a tolerant parser (regex match per line for `requirements.txt`; minimal TOML walk for `pyproject.toml`). Verification: deferred to task 11.

6. **Implement `inspectGoMod(path: string)`**. Detect Go. Framework detection minimal in v1 — flag Go and leave framework empty; future enhancement can detect gin/echo/fiber/chi. Verification: deferred to task 11.

7. **Implement `inspectCargoToml(path: string)`**. Detect Rust. Framework detection: `actix-web`, `axum`, `rocket`, `warp` → name accordingly. Verification: deferred to task 11.

8. **Implement `inspectGemfile(path: string)`**. Detect Ruby. Frameworks: `rails` → rails; `sinatra` → sinatra. Verification: deferred to task 11.

9. **Implement `inspectMixExs(path: string)`**. Detect Elixir. Framework: `phoenix` → phoenix. Verification: deferred to task 11.

10. **Implement `inspectPomXmlGradle(repoRoot: string)`**. Detect Java. Framework: presence of `spring-boot-starter` or `org.springframework.boot` → spring. Walk both `pom.xml` and `build.gradle`/`build.gradle.kts` since teams use either. Verification: deferred to task 11.

11. **Write test suite** at `scripts/ai-skills/stack-detect.test.ts`. Fixtures live under `scripts/ai-skills/__fixtures__/stack-detect/<lang>/` — one fixture directory per inspector plus `multi-lang/` (TS + PHP), `empty/` (no package files), and `partial/` (package.json with no recognized framework). Tests assert detected name + framework + confidence + evidence path. Sequence: after tasks 1–10. Verification: `pnpm prism:test --testPathPatterns=stack-detect` — all green.

12. **Wire `detectStack` into Atlas's interactive flow** — add a startup step in Atlas's shared.md noting "before any user prompts, run stack detection; surface results conversationally before asking the first question." Update `scripts/ai-skills/lib/onboarding-config.ts` to call `detectStack(repoRoot)` and store the result in `OnboardingConfig.techStack`. Verification: `pnpm prism:check-types && pnpm prism:build`.

#### Eli (documentation)

13. **Write `.prism/architect/stack-detection.md`** — the agent-facing reference. Cover: the inspector matrix (file fingerprint → language → framework set); confidence levels and what triggers them; the `["unknown"]` sentinel; how to add a new inspector (template + where to register). Cite ADR-0040 for the why. Verification: `pnpm prism:check`.

14. **Write paired dev doc** at `docs/content/dev/architecture/stack-detection.md` per ADR-0038 (paired dev doc gates) when that ADR lands in Phase 1.5c. Until then, write the dev doc following the existing precedent at `.prism/architect/plugin-management.md` + companion. Same topic, longer narrative, cross-link both ways. Verification: link from architect doc resolves; link from dev doc resolves.

### PR-2.3 — Per-team rule generators

**Branch:** `hmcgrew/prism-2.3-rule-generators`
**Depends on:** PR-2.1, PR-2.2 (rule generators consume `DetectedStack` output from PR-2.2).
**Blocks:** PR-2.5 (dogfood test exercises generated rules).
**Parallel-safe with:** PR-2.4 (different module boundary — rule generators write to `.prism/rules/`; anchor substitution writes inside skill sources).
**Verification:** `pnpm prism:build && pnpm prism:check-types && npx jest --testPathPatterns="(code-standards|security|framework-guidelines)" --no-coverage`.

#### Clove (implementation)

1. **Create generator directory** at `scripts/ai-skills/lib/rule-generators/`. One file per generator. Each generator exports `generate(config: OnboardingConfig, repoRoot: string): Promise<{ path: string; written: boolean; reason: string }>`. The `written: false` case fires when a file already exists at the target path (skip-if-exists posture). Verification: `ls scripts/ai-skills/lib/rule-generators/`.

2. **Implement `scripts/ai-skills/lib/rule-generators/code-standards.ts`** generating per-language `.prism/rules/code-standards-<lang>.md`. Each generated file opens with an applicability declaration per ADR-0029 (e.g. "These rules apply when writing or reviewing TypeScript code in this repository"). Skip-if-exists check at the top — if `.prism/rules/code-standards-typescript.md` exists, return `{ written: false, reason: 'exists — preserve team hand-edits; pass --force to regenerate' }`. Per-language content comes from inline templates in this file — TypeScript, PHP, Python, Go, Rust, Ruby, Elixir, Java. Tone matches `.prism/rules/code-standards.md` (the universal one). Verification: deferred to task 5.

3. **Implement `scripts/ai-skills/lib/rule-generators/security.ts`** generating `.prism/rules/security.md`. Single file, sections gated on detected frameworks:
   - Universal section (always emitted) — secret-scanning, dependency hygiene, input validation at the boundary
   - TypeScript/JavaScript section (when JS or TS detected) — XSS via DOM injection, prototype pollution, `dangerouslySetInnerHTML` discipline
   - PHP/WordPress section (when PHP detected, especially WordPress) — nonce verification, capability checks, `wp_kses` output escaping, `$wpdb->prepare` for SQL
   - Python/Django section (when Django detected) — CSRF middleware on, ORM parameter binding, template auto-escape, `mark_safe` discipline
   - Go section (when Go detected) — `html/template` over `text/template`, SQL parameter binding
   - Rust section (when Rust detected) — `unsafe` review bar, `unwrap()` in production-path discipline, `serde` deserialization input validation
   - Ruby/Rails section (when Rails detected) — `html_safe` discipline, mass-assignment guards (`strong_parameters`), CSRF token verification
   Skip-if-exists at the top with the same posture as code-standards. Verification: deferred to task 5.

4. **Implement `scripts/ai-skills/lib/rule-generators/framework-guidelines.ts`** generating framework-specific rule files. One file per detected framework:
   - React → `.prism/rules/react-guidelines.md` (component patterns, props decoupling, hook discipline)
   - Next.js → `.prism/rules/next-guidelines.md` (server vs client components, data fetching, route handlers)
   - Vue → `.prism/rules/vue-guidelines.md` (Composition API, reactivity rules, props vs emits)
   - WordPress → `.prism/rules/wordpress-guidelines.md` (block patterns, hook timing, capability gates)
   - Django → `.prism/rules/django-guidelines.md` (view shape, ORM query patterns, template loading)
   - Rails → `.prism/rules/rails-guidelines.md` (Rails-way preferences, ActiveRecord patterns, callback discipline)
   Each file opens with its applicability declaration. Skip-if-exists. Verification: deferred to task 5.

5. **Add tests** at `scripts/ai-skills/rule-generators.test.ts`. Cover per generator:
   - Happy path — generates with expected applicability declaration as the first non-frontmatter content
   - Skip-if-exists — returns `{ written: false }` with a stable reason string when target exists
   - Multi-language composition — security generator emits both JS and PHP sections for a multi-language repo
   - Force flag — when called with `{ force: true }`, overwrites existing file
   Use temp directories per test; clean up in `afterEach`. Sequence: after tasks 2–4. Verification: `pnpm prism:test --testPathPatterns=rule-generators`.

6. **Wire generators into Atlas onboarding flow** — extend Atlas's shared.md with a step "after stack detection and user prompts, invoke each rule generator in order: code-standards → security → framework-guidelines. Report each file's `written` and `reason` in the closing summary." Update the relevant orchestration code at `scripts/ai-skills/lib/onboarding-config.ts` (or a new `scripts/ai-skills/lib/onboarding-run.ts` if the orchestration grows past a single function). Sequence: after task 5. Verification: `pnpm prism:check-types && pnpm prism:build && pnpm prism:test`.

7. **Manual end-to-end smoke** — point Atlas at a scratch fixture directory containing a `package.json` with `react` and `next`, confirm Atlas writes `code-standards-typescript.md`, `security.md` (with universal + JS sections), `react-guidelines.md`, `next-guidelines.md`. Document the smoke recipe in the PR body for reviewers. Sequence: after task 6. Verification: visual inspection of generated files.

#### Eli (documentation)

8. **Write `.prism/architect/rule-generation.md`** — agent-facing reference. Cover: the generator matrix (detected stack → emitted rules); the skip-if-exists posture and why (preserves team hand-edits; the `--force` flag is the escape hatch); the applicability-declaration convention each generated rule must follow (cite ADR-0029); how to add a new generator (template + registration steps). Verification: `pnpm prism:check`.

9. **Write paired dev doc** at `docs/content/dev/architecture/rule-generation.md`. Same topic, narrative-form, examples of generated output. Cross-link both ways. Verification: links resolve.

### PR-2.4 — Stub-anchor population mechanism

**Branch:** `hmcgrew/prism-2.4-anchor-substitution`
**Depends on:** PR-2.1 (Atlas invokes anchor substitution after collecting per-team content).
**Blocks:** PR-2.5 (dogfood test exercises anchor substitution).
**Parallel-safe with:** PR-2.2, PR-2.3 (independent module — anchor substitution doesn't consume `DetectedStack`; operates on canonical skill sources directly).
**Verification:** `pnpm prism:build && pnpm prism:check-types && npx jest --testPathPatterns=anchor-substitute --no-coverage`.

#### Clove (implementation)

1. **Define the anchor schema** at the top of `scripts/ai-skills/lib/anchor-substitute.ts`:
   - Open marker: `<!-- atlas:<name> -->` where `<name>` matches `/^[a-z0-9-]+$/`
   - Close marker: `<!-- atlas:end -->`
   - No nesting — `findAnchors` throws if a second open marker appears before a close
   - Duplicate name validation — `findAnchors` throws if two open markers share a name within the same file
   These are HTML comments deliberately — they're invisible in rendered markdown and the canonical sources stay readable. Verification: deferred to task 5.

2. **Implement `findAnchors(content: string): Anchor[]`** — a pure function that returns `{ name, start, end, range }` for each anchor pair. Pure → testable without filesystem. Verification: deferred to task 5.

3. **Implement `substituteAnchors(filePath: string, content: string, replacements: Record<string, string>): Promise<{ written: boolean; anchorsReplaced: string[] }>`**. Behavior:
   - Idempotent — running twice with the same input produces byte-identical output
   - Atomic write — tmp file + rename, same pattern as `writeOnboardingConfig`
   - Unknown anchors in `replacements` are ignored (warn but don't throw — Atlas may know about anchors a canonical source hasn't added yet)
   - Anchors in the file with no replacement key are left untouched (the canonical source still shows the empty stub until next onboarding)
   Verification: deferred to task 5.

4. **Implement `substituteAnchorsAcrossSkills(repoRoot: string, contentByAnchor: Record<string, string>): Promise<Map<string, AnchorResult>>`**. Glob `.ai-skills/skills/*/shared.md`, `.ai-skills/skills/*/claude.md`, etc., run `substituteAnchors` on each, return a map keyed by file path. Verification: deferred to task 5.

5. **Add tests** at `scripts/ai-skills/anchor-substitute.test.ts`. Cover:
   - `findAnchors` happy path — single anchor, multiple anchors, no anchors
   - `findAnchors` rejection — duplicate name in same file, missing close, nested open
   - `substituteAnchors` idempotency — second run produces byte-identical output
   - `substituteAnchors` atomic write — mocked `rename` failure leaves original file untouched
   - `substituteAnchors` unknown-replacement-key — emits a warning, doesn't throw
   - `substituteAnchors` orphan-anchor — anchor in file with no replacement key is preserved
   - `substituteAnchorsAcrossSkills` — glob picks up all platform files (shared.md + claude.md + codex.md + cursor.md)
   Verification: `pnpm prism:test --testPathPatterns=anchor-substitute`.

6. **Drop stub anchors into canonical persona sources** — for the personas where per-team context is needed, add the anchor pairs. Initial set (one anchor per file per slot):
   - `.ai-skills/skills/prism-architect/shared.md` — at the "specializes in" intro: `<!-- atlas:specializes-in --><!-- atlas:end -->`; at the domain section: `<!-- atlas:domain-context --><!-- atlas:end -->`; in the examples blocks: `<!-- atlas:examples --><!-- atlas:end -->`
   - `.ai-skills/skills/prism-code-review-pr/shared.md` — same three anchor slots
   - `.ai-skills/skills/prism-code-review-self/shared.md` — same three anchor slots
   - `.ai-skills/skills/prism-code-dev/shared.md` — same three anchor slots
   - `.ai-skills/skills/prism-debugger/shared.md` — same three anchor slots
   Each anchor pair starts empty `<!-- atlas:<name> --><!-- atlas:end -->` (no content between markers). Sequence: after tasks 1–5. Verification: `grep -rn "atlas:" .ai-skills/skills/` enumerates exactly the expected anchors.

7. **Wire anchor substitution into Atlas onboarding flow** — add a final step in Atlas's shared.md "after rules are generated, populate canonical persona anchors with team-derived content. The content for each anchor comes from a template registry — `specializes-in` references the detected stack; `domain-context` uses the `productDomain` value; `examples` is left empty in v1 and filled by future iterations of Atlas." Update the orchestration code to call `substituteAnchorsAcrossSkills` with the populated `contentByAnchor` map. Sequence: after task 6. Verification: `pnpm prism:check-types && pnpm prism:build && pnpm prism:test`.

#### Eli (documentation)

8. **Write `.prism/architect/anchor-substitution.md`** — agent-facing reference. Cover: the anchor schema (HTML-comment marker form, no nesting, no duplicate names per file); idempotency and atomic-write guarantees; how canonical-source authors add a new anchor (drop the empty pair, update `contentByAnchor` in Atlas, optionally update tests); the design decision (HTML comments over a templating language) and why (cite ADR-0030's preference for build-time substitution over template engines). Verification: `pnpm prism:check`.

9. **Write paired dev doc** at `docs/content/dev/architecture/anchor-substitution.md`. Narrative-form with worked examples. Cross-link both ways. Verification: links resolve.

### PR-2.5 — Atlas runs against PRISM itself as dogfood

**Branch:** `hmcgrew/prism-2.5-atlas-dogfood`
**Depends on:** PR-2.1, PR-2.2, PR-2.3, PR-2.4 (dogfood exercises the full Atlas surface).
**Blocks:** none — final sub-PR in Phase 2.
**Parallel-safe with:** none — must follow 2.1–2.4.
**Verification:** PRISM-first dogfood per the resolved Decisions § Atlas dogfood timing (path confirmed 2026-05-22). Run `pnpm prism:build && pnpm prism:check && pnpm prism:check-types && pnpm prism:test` after each task.

Dogfood target: PRISM itself. Real-consumer dogfood scheduled as a follow-up exercise after PR-2.5 lands clean.

#### Clove (implementation)

1. **Run Atlas against PRISM** using PRISM's actual values: `PROJECT=PRISM`, `TICKET_PREFIX=PRISM`, `GITHUB_OWNER=HunterMcGrew`, `GITHUB_REPO=agent-crew`, `LINEAR_TEAM=PRISM`, `DOMAIN="multi-team AI agent toolkit"`. Capture the full transcript of the interactive session. Verification: `.ai-skills/config.json` updated, `.ai-skills/registry/onboarding-state.json` shows all steps complete.

2. **Diff the pre/post-run state** — `git status` should show changes to `.ai-skills/config.json`, `.ai-skills/registry/onboarding-state.json`, any newly generated rule files, and any canonical sources whose anchors got populated. Document each unexpected file in the PR body. Sequence: after task 1. Verification: `git diff --stat` reviewed and explained.

3. **For each surfaced bug, log under `## Debugged Issues` and fix in place.** Don't ship PR-2.5 with known broken Atlas behavior — that's the whole point of the dogfood. If a bug needs more than a small fix, split it into a follow-up sub-PR and document the dependency. Sequence: parallel with task 2. Verification: `## Debugged Issues` has no `open` entries before merge.

4. **Update PRISM's `.ai-skills/config.json`** to be Atlas's output — if Hunter confirms the generated values are correct, commit them. If Hunter has hand-edits he wants to preserve, document the divergence in `## Decisions` and adjust Atlas's generator to match Hunter's preference (or accept the divergence with reason). Sequence: after task 3. Verification: `git diff .ai-skills/config.json` reviewed.

5. **Add smoke-test harness** at `scripts/ai-skills/atlas-dogfood.test.ts`. The test creates a temp directory, copies a minimal repo skeleton into it (one `package.json` with `react`+`next`, the `.ai-skills/` skeleton), runs Atlas's orchestration entry point against it, asserts the expected files appear with expected content. This is a CI smoke check — fast (<10s), deterministic, no Linear/GitHub network calls. Mock the conversational prompts with a fixed answer map. Sequence: after task 4. Verification: `pnpm prism:test --testPathPatterns=atlas-dogfood`.

#### Eli (documentation)

6. **Document the dogfood process** at `docs/content/dev/atlas-dogfood.md`. Cover: what we did (ran Atlas against PRISM itself); what we learned (the bug list from `## Debugged Issues`); how to repeat the dogfood (commands, expected file changes, validation steps); how this pattern generalizes (future PRISM personas should consider their own dogfood story). Sequence: after PR-2.5 work is substantively done. Verification: `pnpm prism:check`.

7. **Update `.prism/plans/roadmap.md` § Phase 2** with the PR-2.5 merge URL once it lands. Same convention as Phases 1, 1.5a, 1.5b. Sequence: at PR-2.5 merge time. Verification: roadmap shows shipped status.

8. **Promote Atlas-related decisions to `.prism/architect/onboarding.md`** — create the file if it doesn't exist. Pull lasting decisions from this plan's `## Decisions` section: Atlas as a dedicated persona, security as Atlas-generated per stack, anchor schema, skip-if-exists posture, unknown-stack sentinel. Add a row to `.prism/architect/manifest.json` routing `onboarding.md` to relevant edits. Sequence: after task 6. Verification: `pnpm prism:check && pnpm prism:test`.

9. **Write paired dev doc** at `docs/content/dev/architecture/onboarding.md` per ADR-0038. Narrative version of the architect doc. Cross-link both ways. Sequence: after task 8. Verification: links resolve.

10. **Close-out** — once PR-2.5 merges and lasting decisions are promoted (task 8), delete this plan file. Git history preserves it. Sequence: final task in the epic. Verification: `ls .prism/plans/epic-prism-atlas.md` returns "No such file" after the close-out commit.

---

## Decisions

- **Atlas is a dedicated persona, not a Winston sub-mode.**
  - **Root cause:** Winston is reactive — he evaluates an approach the user brings him. Onboarding is proactive — Atlas drives the conversation and asks the user questions. The cadence and invocation surface are fundamentally different.
  - **Alternatives considered:** (a) Winston mode-switch — add an `onboard` mode to Winston alongside evaluate/plan. (b) A script (`pnpm prism:onboard`) with no skill at all. (c) A dedicated persona (chosen).
  - **Chosen approach:** Dedicated persona. Beats Winston mode-switch (conflates two cadences in one skill, dilutes Winston's evaluate-mode identity) and the script-only approach (loses conversational flow — can't ask clarifying questions, can't re-enter on reconfigure, can't adapt to ambiguous state).
  - **Implementation guidance:** Atlas's skill scaffold mirrors `.ai-skills/skills/prism-architect/` for shape but the shared.md content describes a fundamentally different startup batch — read `.ai-skills/config.json` if present, scan repo, locate state file, resume from `nextIncompleteStep` or start fresh.
  - **Zoe verdict (2026-06-05):** `archive-candidate` — Atlas shipped — `.ai-skills/skills/prism-onboarding/`, ADR-0040, and architect docs (onboarding, stack-detection, rule-generation, anchor-substitution) all exist; plan never closed.

- **Security guidance is Atlas-generated per stack, not a universal PRISM rule.**
  - **Root cause:** Stack-specific security concerns (Django CSRF middleware, WordPress nonce verification, Rust `unsafe` discipline) don't compose into a single universal rule without becoming either too generic to act on or too long to load on every chat.
  - **Alternatives considered:** (a) Universal `security.md` with all stacks' content stacked — rejected as excessive context load and applicability-declaration confusion. (b) Skill-internal security checklists — rejected as coupling skill maintenance to security guidance. (c) Per-stack `security.md` generated by Atlas (chosen).
  - **Chosen approach:** Per-stack security.md. The file declares its applicability per ADR-0029; the agent loads it via Tier 2 when relevant; multi-language repos get composite sections. Same pattern as `code-standards-<lang>.md`.
  - **Implementation guidance:** PR-2.3 task 3 owns this. The composition logic for multi-language repos lives in the generator, not in the agent's loading logic.
  - **Zoe verdict (2026-06-05):** `archive-candidate` — Atlas shipped — `.ai-skills/skills/prism-onboarding/`, ADR-0040, and architect docs (onboarding, stack-detection, rule-generation, anchor-substitution) all exist; plan never closed.

- **Stub-anchor pattern uses HTML comments, not a templating language.**
  - **Root cause:** Canonical sources need to stay readable as markdown. A templating language (Mustache, Handlebars, etc.) would introduce another syntax for contributors to learn and another build-time dependency.
  - **Alternatives considered:** (a) Handlebars-style `{{ atlas.specializesIn }}` — rejected per ADR-0030's same reasoning against templating languages. (b) A custom syntax (`@@atlas:name@@`) — rejected as inventing yet-another-marker. (c) HTML comments (chosen).
  - **Chosen approach:** `<!-- atlas:<name> -->` / `<!-- atlas:end -->`. HTML comments render invisibly in markdown previews, parse with simple string operations, can't accidentally match content because the prefix `atlas:` is namespaced.
  - **Implementation guidance:** PR-2.4 task 1 owns the schema definition. No nesting, no duplicate names per file, validation happens in `findAnchors`.
  - **Zoe verdict (2026-06-05):** `archive-candidate` — Atlas shipped — `.ai-skills/skills/prism-onboarding/`, ADR-0040, and architect docs (onboarding, stack-detection, rule-generation, anchor-substitution) all exist; plan never closed.

- **Skip-if-exists is Atlas's update posture for generated rules.**
  - **Root cause:** Teams hand-edit generated rules to encode patterns Atlas can't infer. Overwriting silently destroys that work.
  - **Alternatives considered:** (a) Always overwrite — rejected as destroying hand-edits. (b) Three-way merge — rejected as too complex for the value (hand-edits are the team's intent; merging them with regenerated content risks producing nonsense). (c) Skip-if-exists with explicit `--force` flag (chosen).
  - **Chosen approach:** Skip-if-exists. When a target file already exists, the generator returns `{ written: false, reason: '...' }`. The team gets the explicit `--force` escape hatch when they genuinely want to regenerate.
  - **Implementation guidance:** PR-2.3 task 2 owns the posture; every generator follows the same shape. Atlas's closing summary lists each file's `written` status so the team sees what was skipped.
  - **Zoe verdict (2026-06-05):** `archive-candidate` — Atlas shipped — `.ai-skills/skills/prism-onboarding/`, ADR-0040, and architect docs (onboarding, stack-detection, rule-generation, anchor-substitution) all exist; plan never closed.

- **Stack detection returns `["unknown"]` sentinel for empty repos, not an error.**
  - **Root cause:** An empty repo is a valid input — someone might run Atlas before adding any code. Throwing an error there forces Atlas's UX to handle exceptions instead of conversationally asking the user about their intended stack.
  - **Alternatives considered:** (a) Throw — rejected as forcing exception-handling complexity onto Atlas's flow. (b) Return empty arrays — rejected as ambiguous (is empty "no detection ran" or "detection ran and found nothing"?). (c) Explicit `["unknown"]` sentinel (chosen).
  - **Chosen approach:** Return `{ languages: [{ name: 'unknown', confidence: 'high', evidence: [] }], frameworks: [] }`. Atlas's flow checks for the unknown sentinel and asks the user "I didn't find any package files yet — what stack will this repo use?" The flow continues normally with user-supplied stack.
  - **Implementation guidance:** PR-2.2 task 1 owns the sentinel definition; task 11 tests the empty fixture path.
  - **Zoe verdict (2026-06-05):** `archive-candidate` — Atlas shipped — `.ai-skills/skills/prism-onboarding/`, ADR-0040, and architect docs (onboarding, stack-detection, rule-generation, anchor-substitution) all exist; plan never closed.

- **Atlas dogfood timing — PRISM-first.** Resolved 2026-05-22 by Hunter.
  - **Alternatives considered:** PRISM-first (PR-2.5 as written — lower risk, Hunter controls both sides, immediate validation on a familiar codebase); real-consumer-first (higher external-validity signal but slower iteration, depends on consumer team availability and coordination overhead).
  - **Chosen approach:** PRISM-first. The dogfood pattern is already load-bearing across many of PRISM's design decisions (the install runs against itself, the rules apply to PRISM's own development, the personas are tested in PRISM's own ticket flow) — PRISM-first Atlas dogfood is the natural extension. Surfaces bugs in a controlled environment where Hunter can fix-in-place during PR-2.5 rather than blocking on a consumer team's schedule. Real-consumer dogfood remains valuable as a follow-up validation after PR-2.5 lands clean.
  - **Implementation guidance:** PR-2.5 tasks 1–5 proceed as written against PRISM's own repo. After PR-2.5 merges, schedule a follow-up real-consumer dogfood as a separate exercise — track in roadmap or a new plan, not in this epic. The smoke-test harness added in PR-2.5 task 5 carries forward as the regression catch for both PRISM-self and future consumer-team onboardings.
  - **Zoe verdict (2026-06-05):** `archive-candidate` — Atlas shipped — `.ai-skills/skills/prism-onboarding/`, ADR-0040, and architect docs (onboarding, stack-detection, rule-generation, anchor-substitution) all exist; plan never closed.

---

## Acceptance Criteria

### Behavioral

- [ ] Given a fresh repo with `package.json` declaring `react` and `next` dependencies, When the user invokes Atlas, Then Atlas presents the detected stack as TypeScript + React + Next.js before asking the first user question.
- [ ] Given a fresh repo with no recognized package files, When the user invokes Atlas, Then Atlas surfaces the unknown-stack sentinel and asks the user what stack the repo will use, instead of erroring.
- [ ] Given a repo where `.prism/rules/code-standards-typescript.md` already exists, When Atlas's code-standards generator runs, Then the existing file is preserved untouched and Atlas's closing summary reports the file was skipped with the stable reason string.
- [ ] Given the same set of user inputs and the same source repo state, When Atlas is run twice in succession, Then the second run produces byte-identical output to the first across `.ai-skills/config.json`, generated rules, and substituted anchors.
- [ ] Given a canonical persona source containing `<!-- atlas:specializes-in --><!-- atlas:end -->` markers, When the build runs after Atlas substitutes anchors, Then the assembled platform output contains the substituted content and the markers are gone from the platform output.
- [ ] Given a multi-language repo with both `package.json` (React) and `composer.json` (WordPress), When the security generator runs, Then `.prism/rules/security.md` contains both the JavaScript/XSS section and the PHP/WordPress section.
- [ ] Given an interrupted onboarding session, When the user re-invokes Atlas, Then Atlas reads the state file and resumes from the next incomplete step instead of restarting from step one.
- [ ] Given an existing `.ai-skills/config.json`, When the user invokes Atlas, Then Atlas detects the prior install and enters reconfigure mode instead of first-install mode.

### Non-behavioral

- [ ] Every generated rule file opens with an applicability declaration per ADR-0029 (e.g. "These rules apply when…").
- [ ] Atlas's canonical skill source (`.ai-skills/skills/prism-atlas/shared.md`) contains no hardcoded language, framework, or domain references — the file describes the onboarding process and persona shape only.
- [ ] `detectStack` handles all 10 package-file types (`package.json`, `composer.json`, `pyproject.toml`, `Pipfile`, `requirements.txt`, `go.mod`, `Cargo.toml`, `Gemfile`, `mix.exs`, `pom.xml`/`build.gradle`) without throwing.
- [ ] Unit-level test coverage exists for each subsystem — onboarding-config, onboarding-state, stack-detect, rule-generators, anchor-substitute, atlas-dogfood.
- [ ] ADR-0040 (Atlas as the Onboarding Persona) exists at `.prism/spec/adrs/0040-atlas-as-onboarding-persona.md` with template mirror.
- [ ] Each new architect doc has its paired dev doc in `docs/content/dev/architecture/` per ADR-0038's pairing convention.
- [ ] PR-2.5's smoke-test harness runs in CI as part of `pnpm prism:test` and completes in under 10 seconds.

### AC Adjustments

### AC Sync Log

| Date | Agent | Action | Plan | Linear |
| ---- | ----- | ------ | ---- | ------ |

---

## History

- 2026-05-22 [main]: Plan created. Five-PR breakdown for Atlas — scaffold + flow + config (PR-2.1), stack detection (PR-2.2), per-team rule generators (PR-2.3), stub-anchor population (PR-2.4), PRISM dogfood (PR-2.5). Closes the loop on ADRs 0029/0030/0032's deferred Atlas references. Open decision on dogfood timing flagged for Hunter input before PR-2.5 starts.
- 2026-05-22 [main]: Atlas dogfood timing decision resolved by Hunter — PRISM-first (PR-2.5 as written). Open section removed from Decisions; PR-2.5 task specs already aligned with PRISM-first so no rewrites required. Real-consumer dogfood scheduled as a follow-up exercise after PR-2.5 lands clean.

---

## Debugged Issues

None at plan creation.

---

## Review Issues

None at plan creation.

---

## Cleanup Items

None at plan creation.

---

## PR Readiness

Per-sub-PR checklist — each sub-PR runs its own PR Readiness pass before merge.

### PR-2.1 — Atlas skill scaffold + interactive flow + config writing

- [ ] No critical or major issues
- [ ] Types correct — no `any`, no unsafe `as`
- [ ] No stray console.logs or debug artifacts
- [ ] Tests written for `writeOnboardingConfig` and state-tracking
- [ ] All debugged issues resolved (no `open` entries)
- [ ] Build passes
- [ ] PR description up to date
- [ ] ADR-0040 lands in the same PR

### PR-2.2 — Stack detection subsystem

- [ ] No critical or major issues
- [ ] All 10 inspectors implemented and tested with fixtures
- [ ] Empty-repo sentinel path tested
- [ ] Multi-language detection tested
- [ ] Architect doc + paired dev doc both land
- [ ] Build passes

### PR-2.3 — Per-team rule generators

- [ ] No critical or major issues
- [ ] All three generators implemented (code-standards, security, framework-guidelines)
- [ ] Skip-if-exists posture verified per generator
- [ ] Multi-language composition tested
- [ ] Every generated file opens with an applicability declaration
- [ ] Architect doc + paired dev doc both land
- [ ] Build passes

### PR-2.4 — Stub-anchor population mechanism

- [ ] No critical or major issues
- [ ] Anchor schema validated (no nesting, no duplicate names, no missing close)
- [ ] Idempotency verified
- [ ] Atomic write verified
- [ ] Anchors dropped into the five canonical persona sources
- [ ] Architect doc + paired dev doc both land
- [ ] Build passes

### PR-2.5 — Atlas runs against PRISM itself as dogfood

- [ ] Open decision on dogfood timing resolved before kickoff
- [ ] No critical or major issues
- [ ] All bugs surfaced during dogfood logged in `## Debugged Issues` and fixed (no `open` entries)
- [ ] Smoke-test harness runs in CI under 10 seconds
- [ ] PRISM's `.ai-skills/config.json` reflects Atlas's output (or divergence documented)
- [ ] Architect doc + paired dev doc both land
- [ ] Build passes

### Epic close-out

- [ ] All five sub-PRs merged
- [ ] Lasting decisions promoted to `.prism/architect/onboarding.md`
- [ ] Manifest updated to route onboarding.md
- [ ] Roadmap § Phase 2 marked shipped with merge URLs
- [ ] This plan file deleted (git history preserves it)

**Last updated:** 2026-05-22
