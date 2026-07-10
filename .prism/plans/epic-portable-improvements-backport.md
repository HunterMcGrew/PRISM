# Plan: epic-portable-improvements-backport

## Ticket

None yet — epic fallback naming per branch-plan rule. Suggest nora create a parent ticket on run start; rename this file to `epic-<ticket-id>.md` when it exists.

## Goal

Back-port the quality improvements proven in the portable skill roster (`~/Downloads/portable-skills/`) into PRISM's canonical skill sources — the improvements only, none of the portability layer.

---

## What's in scope (the improvement package)

1. **Battery persistence** — opening-battery answers compress to one line appended to the plan's `## Sessions` section; the closing battery re-reads that `open:` line, diffs the finished work against it (Q1 becomes "scope vs. opening Bounds"), and appends a `close: scope held` / `close: drifted — <why>` verdict.
2. **Mid-flight re-anchors** — event-triggered one-line re-orientation between the batteries, with per-persona triggers (the trigger table below is the spec).
3. **Lifecycle list** — a short "The run, in order" canonical sequence near the top of each skill; doubles as a long-context anchor.
4. **Source bug fixes** — defects the port agents found while reading PRISM's generated skills (verify-then-fix list below).
5. **Targeted per-skill improvements** — sasha phase-boundary checkpointing; eric worktree-cleanup-in-closing.

## What's explicitly NOT in scope (the portability layer)

Repo map / `.repo-map.md` / first-run interview; `_shared/core.md` pointer blocks; `<plans>`/`~/worklogs` private-state layout; `~/.claude-work` references; bare-name-routing and send-out dispatch rules; host-capability detect-and-degrade rewrites. PRISM keeps its own paths, rules layer, config, and Sol machinery. Any portable text copied in must be stripped of these before landing.

---

## Implementation Tasks

### winston (design pass — run first, human gate before implementation)

1. **Decide the placement of shared mechanics.** Default path: a new rule `.prism/rules/session-orientation.md` carrying the generic mechanics once — both batteries (current text lives per-skill), battery persistence to `## Sessions`, close-diffs-open, and the generic re-anchor rule — with skills keeping only their persona-specific trigger lines and battery pointers (mirror of how `context-reuse.md` is loaded by every skill). Verify against how PRISM skills currently embed batteries; if per-skill embedding is load-bearing for generation, fall back to per-skill edits with identical text.
2. **Spec the `## Sessions` plan-section addition** to `.prism/rules/branch-plan.md` (canonical) and its `templates/install/.prism/rules/` copy: one line per session, `- YYYY-MM-DD [<branch>] open: Intent — …; Bounds — …; Approach — …` plus the close verdict appended to the same entry. Wide blast radius (every persona reads the plan rule) — present at the gate before clove starts.
3. Confirm the verify-then-fix list below against **canonical sources** (`.ai-skills/skills/<id>/`), not the generated `.claude/skills/` copies the port agents read — per `cross-agent-handoff-accountability.md`, each reported bug is a diagnosis to verify, not a fact.

### clove (implementation — one lane per group; edit canonical sources only, never generated outputs)

4. **Foundation lane:** add `## Sessions` to the plan template in `.prism/rules/branch-plan.md` + install template; create `.prism/rules/session-orientation.md` per winston's task 1 outcome.
5. **Skill lanes — apply the improvement package to every persona skill in `.ai-skills/skills/`** (utilities `prism-handoff` / `prism-review-loop` get only what applies; `prism-onboarding` gets lifecycle only). For each skill: read the canonical source AND its portable counterpart (mapping table below) as the reference implementation; apply lifecycle list, battery persistence + close-diff wiring, and the persona's re-anchor trigger line; strip every portability artifact before landing. Suggested lane batching: (a) core dev — architect, code-dev, debugger, code-review-self, code-review-pr, documentation; (b) workflow — ticket-start, user-stories, prd, design, qa-test-plan, changelog, standup-summary, retro, doc-walker, refactor-scout, surface-audit, conductor; (c) business — founder, market-research, finance, marketing, sales, data, customer-success, recruiting, legal; (d) utilities.
6. **Verify-then-fix lane** (each item: confirm in canonical source first; fix only what reproduces):
   - `prism-ticket-start`: stale `thr-###` branch-derivation → `<username>/<ticket-id>-<slug>` per git-conventions.
   - `prism-refactor-scout`: Definition of Done checks candidate status `drafting`, which the state schema doesn't define — correct value `grilling`.
   - `prism-prd`: brownfield mode never sets the `stakes` field its review branches on (add the one-question stakes confirm at init); greenfield dispatched with no live user should return `blocked`, not invent interview answers.
   - `prism-debugger`: "the only file she writes to is the plan / source files stay untouched" contradicts Phase-4 instrumentation — reword to no-*persistent*-modification + the Phase-6 cleanup gate. Also add phase-boundary plan checkpointing (stub entry at Phase 2, updated at each transition — the compaction-proof resume point).
   - `prism-documentation`: Definition of Done says presenting the path is the final act while the shipping flow ships afterward — align DoD with shipping.
   - `prism-code-review-self`: hardcoded `main` in branch-diff commands → resolve `<default-branch>` from `origin/HEAD` once, use everywhere.
   - `prism-code-review-pr`: worktree cleanup should appear in the closing flow, not only the procedure section.
7. **Build + tests per lane:** `pnpm prism:build` after each lane (regenerates platform outputs + runs tests); full `pnpm prism:check` before review. Generated `.claude/.cursor/.codex/.agents` diffs are expected and land with the lane.

### briar → eric (review)

8. Self-review then PR review per the normal loop. Review focus: no portability artifacts leaked into canonical content (grep for `repo-map`, `_shared`, `.claude-work`, `worklogs`); re-anchor triggers match the persona's actual work shape; `## Sessions` wording identical between rule, template, and any skill references.

## Per-persona re-anchor trigger spec

The portable roster is the reference: each portable skill's "Persona notes on the shared core" block contains the tuned trigger line (`grep "Re-anchor triggers for" ~/Downloads/portable-skills/skills/*/SKILL.md` prints the full table). Mapping: winston=prism-architect, sasha=prism-debugger, clove=prism-code-dev, briar=prism-code-review-self, eric=prism-code-review-pr, eli=prism-documentation, nora=prism-ticket-start, mira=prism-user-stories, parker=prism-prd, pixel=prism-design, reese=prism-qa-test-plan, sage=prism-changelog, lilac=prism-standup-summary, iris=prism-retro, theo=prism-doc-walker, ren=prism-refactor-scout, zoe=prism-surface-audit, sol=prism-conductor, vera=prism-founder, kora=prism-market-research, ellis=prism-finance, charlie=prism-marketing, quinn=prism-sales, tess=prism-data, remy=prism-customer-success, penny=prism-recruiting, lex=prism-legal.

---

## Decisions

- **Improvements yes, portability no.** The scope split above is the contract; the portable roster is a reference implementation, never a copy source. Reason: PRISM's rules layer, build system, and Sol machinery already own what the portability layer re-invented for repo-independence.
- **Shared mechanics land as a rule, not 30 copies** (default path, winston task 1 confirms). Reason: PRISM loads `.prism/rules/` into every session — it is the native `_shared/core.md`; per-skill duplication is the drift the portable roster just engineered away.
- **Edit canonical sources only** (`.ai-skills/skills/`, `.prism/rules/`, `templates/install/.prism/`); generated outputs come from `pnpm prism:build`. Reason: generated files carry the AUTO-GENERATED header for exactly this.
- **Every reported source bug is verify-then-fix.** Reason: the port agents diagnosed against generated copies; canonical may differ — `cross-agent-handoff-accountability.md`.
- **OPEN — TBD, needs Hunter input.** Whether winston's quick-consult mode (answer architecture questions without a resolved plan when no ticket exists) back-ports too — it loosens PRISM's "no evaluation without a resolved plan" invariant, which may be intentional discipline in team settings. **Default path (used until resolved):** not ported; note it in the run report as a candidate follow-up.

---

## History

- 2026-07-09 [claude/prism-skills-portability-f37a25]: Plan created — backport spec drafted from the completed portable-roster build; see the improvement package and verify-then-fix list.

---

## Acceptance Criteria

### Behavioral

- [ ] Given any persona skill session completes its opening battery, When the plan is inspected, Then a `## Sessions` entry with the `open:` line exists (or the skill stated answers inline where no plan applies)
- [ ] Given a persona finishes its run, When the closing battery executes, Then it references the opening answers and appends a `close:` verdict to the same entry
- [ ] Given the fixed bugs' trigger conditions (ticket-start branch derivation, refactor-scout DoD, prd stakes/dispatch, debugger instrumentation, documentation DoD, self-review default branch), When exercised, Then each behaves per its fix description

### Non-behavioral

- [ ] `pnpm prism:check` passes (build, types, tests, manifest, crossref-lint)
- [ ] No portability artifacts in canonical content (`repo-map`, `_shared`, `.claude-work`, `worklogs` grep-clean)
- [ ] Every persona skill carries its lifecycle list and its re-anchor trigger line

### AC Sync Log

| Date | Agent | Action | Plan | Ticket |
| ---- | ----- | ------ | ---- | ------ |
