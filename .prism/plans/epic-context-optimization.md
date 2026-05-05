# Plan: epic-context-optimization

## Ticket

Internal infrastructure work — no Linear ticket. Tracked via PRISM-side branch and PR.

## Goal

Cut baseline conversation context by roughly 40% and reduce per-invocation cost on heavy skills by 30–50%, without losing the engineering standards the team relies on.

**Status:** Phases 0–5 validated end-to-end in Thrive PR [#1970](https://github.com/TracTru/thrive/pull/1970) (currently in review). Remaining work is Phase 6 — porting the validated changes from Thrive's `.claude/` into PRISM's canonical sources (`.prism/` for content, `.ai-skills/skills/` for skill source) so other consumers inherit them.

---

## Decisions

### Original (still standing)

- **Three-tier rule loading.** Rules in `.prism/rules/` split into always-loaded (Tier 1), path-scoped (Tier 2), and skill-internal (Tier 3) tiers.
  - **Why:** most rules previously loaded on every conversation as project instructions, but most are domain-specific. Scoping them cuts a substantial chunk off baseline with no quality loss when the routing patterns are right.
  - **Chosen approach:** three tiers. Tier 1 set scoped to rules that fire across every persona's lane. Tier 2 uses YAML `paths:` frontmatter. Tier 3 is skill-author-driven extractions.

- **Drop the `**` → `skills-ecosystem.md` manifest fallback.** Replace with explicit globs covering the surfaces where persona-handoff context applies.
  - **Why:** the catch-all fired on every file edit in the repo, loading `skills-ecosystem.md` (~260 lines) on PHP edits, dockerfile edits, lockfile edits — anywhere that doesn't need it.

- **Lazy-load mode-specific reference files for heavy skills.** Pixel and Reese restructure into a thin SKILL.md plus references loaded on demand.

- **Move Nora's ticket scaffolds to `templates/`.** Most of her SKILL.md is structured output that already has a templates home.

- **Revert Lilac to paste-only output.** Drop the Slack MCP send path entirely — the protected `#tractru-dev` channel blocks external Slack MCP connections.

- **Add cross-skill context-reuse instruction to every SKILL.md startup.** Soft instruction. Realistic capture rate ~70%, worth ~3,000–7,700 tokens on chained sessions.

- **Defer the MCP-result `/tmp/` externalization pattern.** Pierre Yohann technique. Only worth building if our MCPs return large payloads in normal flows.

### New (from Thrive PR #1970)

- **Mechanism confirmed: YAML `paths:` frontmatter is the rule-scoping lever.**
  - **Root cause of the original ambiguity:** Phase 0 hedged on whether `manifest.json` could route rules.
  - **Chosen approach:** add `paths:` YAML to each Tier 2 rule. No `manifest.json` involvement for rules — manifest stays for architect docs.
  - **Implementation guidance:** glob slightly wide rather than tight. False positives are cheaper than false negatives.

- **Don't collapse the frontend block/component manifest entries.** They route to three different architect docs; the apparent overlap is complementary by design.

- **Pixel split is two files, not three.** `doctrine.md` + `pattern-vocabulary.md`. `tailwind-tokens.md` dropped — SKILL.md references tokens in context.

- **Nora restructure includes a templates move and a skill-internal extraction.** Triage frameworks (S1-S4 scale, INVEST, splitting strategies, etc.) extracted to `frameworks.md` for lazy load.

- **Drift-class boundary at the rule level.** Rules that govern a drift class need to load on every surface where that drift can occur — including their own meta-surface.
  - **Root cause:** `architect-doc-verification.md` was scoped to architect docs but not ADRs, so phantom-file drift in ADR-0033 survived two review passes.
  - **Chosen approach:** add the missing surface and add a `## Drift classes covered` sub-section to the rule body naming both failure modes (doc-vs-source, citation-vs-cited).

- **Class-sweep on drift fixes.** When a review surfaces a drift pattern, the cleanup pass greps the full spec surface — not just the line-numbered punch list. Promoted to lessons.

- **Behavioral AC for skill load shape.** AC for "this skill loads X files" written as "every file named in SKILL.md's load instruction is read and each named file exists" — survives future refactors.

### PRISM-specific (added during Phase 6 plan rewrite)

- **PRISM canonical structure for skill-internal references is `.ai-skills/skills/<id>/references/`.** Thrive places `doctrine.md`, `pattern-vocabulary.md`, mode files etc. flat alongside `SKILL.md`. PRISM uses the `references/` payload directory recognized by `scripts/ai-skills/build.ts:84` (`optionalSkillPayloads` lists `references` as a directory payload). The build copies `references/` into the platform output, so content references like `[doctrine.md](./references/doctrine.md)` resolve correctly at the platform layer.
  - **How to apply:** when porting Thrive `[file](./file.md)` references inside `shared.md`, change to `[file](./references/file.md)`.

- **PRISM's missing rules are intentionally Thrive-specific.** Of the five rules Thrive PR #1970 path-scoped, only two exist in PRISM canonical (`accessibility.md`, `architect-doc-verification.md`). The other three (`use-effect-guidelines.md`, `data-layer-boundaries.md`, `plugins-manifest.md`) are Thrive-specific React-stack and plugin-architecture rules that don't belong in the canonical toolkit. Phase 6 task 1 ports only the two that exist.

- **PRISM canonical paths use `.prism/` for spec content; skill bodies retain `.claude/` for design-mock and platform-output paths.** Existing PRISM canonical convention. Inherited from how `shared.md` was originally extracted from Thrive — the platform-output paths (`.claude/skills/<id>/SKILL.md`, `.claude/design/mocks/`, `.claude/docs/qa/`) are kept as-is because they're platform-specific outputs (per `install-layout.md` § "The convention does not apply to: skill bodies under `.claude/skills/<id>/SKILL.md` — these are platform-specific outputs"). Spec content paths like `.prism/rules/`, `.prism/architect/`, `.prism/spec/adrs/` use the canonical prefix.

- **PRISM accessibility paths use universal globs.** Thrive's accessibility.md glob is `frontend/**/*.{ts,tsx,jsx}` and `backend/plugins/**/*.tsx`. PRISM consumers may not have a `frontend/` or `backend/plugins/` directory at all (Vue, Svelte, plain Node, etc.), so PRISM canonical uses `**/*.{ts,tsx,jsx,vue,svelte}` to cover the common UI file extensions across stacks.

---

## Implementation Tasks

The bulk of the work landed in Thrive PR #1970. Phase 6 ports the validated changes into PRISM canonical so consumers inherit them.

### Phase 0 — Investigation ✓ COMPLETE (Thrive)

Confirmed Claude Code's `paths:` frontmatter mechanism. See **Mechanism confirmed** decision above.

### Phase 1 — Foundation ✓ COMPLETE (Thrive)

- ADR-0033 written.
- `manifest.json` catch-all dropped, three explicit globs added.
- Frontend block/component overlap deliberately preserved.

### Phase 2 — Rules tier split ✓ COMPLETE (Thrive)

Five Thrive rules path-scoped via YAML frontmatter.

### Phase 3 — Skill restructures ✓ COMPLETE (Thrive)

- Pixel: `SKILL.md` + `doctrine.md` + `pattern-vocabulary.md` (716 → 579 lines).
- Reese: `SKILL.md` + four per-mode files (574 → 312 lines).
- Nora: templates move + skill-internal `frameworks.md` (528 → 391 lines).
- Lilac: paste-only revert (590 → 459 lines).
- Cross-skill context-reuse paragraph in all 12 SKILL.md.

### Phase 4 — AGENTS.md polish ✓ COMPLETE (Thrive)

§0 and §9 persona tables consolidated. 229 → 217 lines.

### Phase 5 — Paired dev doc ✓ COMPLETE (Thrive)

`docs/content/dev/architecture/rule-loading-tiers.md` written.

---

### Phase 6 — Port to PRISM canonical (Clove)

Each task below specifies the exact files to create or modify and the exact content to write. The intent is "no guesswork": every file is fully embedded or has a precise patch. Apply the substitutions noted in each task — primarily `thrive-<id>` → `prism-<id>` in cross-references within content.

**Build step (after each task):** run `pnpm prism:build` to regenerate platform copies. The build script (`scripts/ai-skills/build.ts`) compiles `.ai-skills/skills/<id>/{frontmatter.yml, shared.md, claude.md, codex.md, cursor.md}` into `.claude/skills/<id>/SKILL.md` and copies `references/` if present. Build failures stop the task — fix before committing.

**Commit subject template:** `chore: Phase 6 task N — <short description>` (no Linear ticket).

---

#### Task 6.1 — Add `paths:` frontmatter to PRISM canonical rules

**Scope reduction from original plan:** of the five Thrive rules, only `accessibility.md` and `architect-doc-verification.md` exist in PRISM canonical. The other three (`use-effect-guidelines.md`, `data-layer-boundaries.md`, `plugins-manifest.md`) are Thrive-specific and intentionally absent from PRISM. See PRISM-specific decision above.

**File 6.1.a — `.prism/rules/accessibility.md`**

Prepend the following YAML frontmatter (lines 1–6) to the existing file. Do NOT modify the existing body content — PRISM's accessibility.md has been generalized beyond Thrive's React/JSX-specific framing, and that generalization stays. Only the frontmatter is added.

```yaml
---
description: WCAG 2.1 AA accessibility rules — semantic HTML, keyboard, ARIA, contrast, framework-specific notes
paths:
  - "**/*.{ts,tsx,jsx,vue,svelte}"
---

```

(Note: include the trailing blank line after the closing `---`. The existing first line `# Accessibility (WCAG 2.1 Level AA)` stays intact below.)

**Why universal globs:** Thrive's globs assume `frontend/` and `backend/plugins/` directories. PRISM consumers may not have those — Vue/Svelte/plain-Node stacks all need accessibility coverage. The broader glob keeps the rule firing across stacks.

**File 6.1.b — `.prism/rules/architect-doc-verification.md`**

Replace the entire file content with the following:

```markdown
---
description: Source-verified review bar for architect docs, ADRs, and paired dev docs
paths:
  - .prism/architect/**
  - .prism/spec/adrs/**
  - docs/content/dev/architecture/**
---

# Architect Doc Verification

When authoring or reviewing an architect-class doc — an architect file (`.prism/architect/**`), an ADR (`.prism/spec/adrs/**`), or a paired dev doc (`docs/content/dev/architecture/**`) — every claim about source behavior is checked against the source as written. Glance-mode review — reading the prose without opening the files it describes — is not enough for this class of change.

**Why:** Architect-class docs are durable agent context. Architect files route via `manifest.json` and ADRs route via the `.prism/spec/adrs/*.md` manifest entry, so future agents load them as authoritative. A confident-sounding doc that drifts from source actively misleads — it's worse than no doc, because the reader trusts it. The same failure mode has surfaced on ADR text — an ADR's example list naming files that were never created — when the rule's `paths:` glob excluded ADRs. See [ADR-0023](../spec/adrs/0023-architect-docs-source-verified-review.md).

**How to apply:** When the diff includes `.prism/architect/**`, `.prism/spec/adrs/**`, or `docs/content/dev/architecture/**`, walk every claim in the doc against the cited source. Source includes anything the manifest can route to: YAML, Dockerfiles, schemas, scripts, components, blocks, hooks, services, PHP classes — whatever the doc references. Classify each claim into one of three buckets:

- **Verified** — the claim matches the source as written.
- **Diverged** — the claim contradicts the source. Flag for fix.
- **Missing** — the claim references something that doesn't exist (a file, function, flag, or behavior the source doesn't show). Flag for fix.

The bar applies to both author-side authoring and reviewer-side gating. Authors run the triage before opening the PR; reviewers re-run it on the diff.

## Drift classes covered

This rule covers two failure modes — same severity, different shape:

- **Doc vs. source.** The doc claims X about a code file; the code file does Y. The triage above (Verified / Diverged / Missing) is for this case. The rule auto-loads on `.prism/architect/**`, `.prism/spec/adrs/**`, and `docs/content/dev/architecture/**` because those are the authoring surfaces where this drift originates.

- **Citation vs. cited.** Doc A cites Doc B's framing; Doc A's restatement no longer matches what Doc B actually says. This drift originates on _citing_ surfaces — rules, `AGENTS.md`, plan history, anywhere that re-enumerates ADR or architect content. The verification mechanism for this drift lives in [`implementation-task-detail.md`](./implementation-task-detail.md) § Cite, don't restate, when overlapping existing framing — that rule is Tier 1 (always-loaded per [ADR-0033](../spec/adrs/0033-rule-loading-tiers.md)), so it's in context on every edit regardless of glob match.

If you're editing a citing surface and you touch an ADR citation or a re-enumeration of another spec doc, the Cite-Don't-Restate clause governs — re-read the cited source and verify your restatement matches.

## Who runs this rule

- **[Winston](../skills/prism-architect/SKILL.md)** — runs the triage at startup when the diff includes architect docs, and surfaces diverged/missing claims as Structural Concerns in evaluate-mode output.
- **[Eric](../skills/prism-code-review-pr/SKILL.md)** — auto-trips into source-verification mode for PR-side review on doc-class diffs.
- **[Briar](../skills/prism-code-review-self/SKILL.md)** — same auto-trip on the self-review side, before the PR opens.

Eric's and Briar's hooks share phrasing — the bar reads identically across author-side and reviewer-side surfaces.

## Severity

Diverged and missing claims are at minimum **Major**. The doc is durable agent context — every future agent that loads it inherits the wrong fact, so the blast radius is wider than a typical correctness issue.

Citation-vs-cited drift (see Drift classes covered above) carries the same severity as doc-vs-source drift — both at minimum Major.
```

**Note:** PRISM's existing `architect-doc-verification.md` is shorter than Thrive's because it doesn't have the `implementation-task-detail.md` integration paragraph. The replacement above includes that paragraph — it'll resolve once that rule is added to PRISM in a later phase. The link won't break the build; markdown allows links to nonexistent targets.

**Verification:** open a fresh Claude Code session in any consumer repo with `.prism/`. Confirm `accessibility.md` only loads when a file matching `**/*.{ts,tsx,jsx,vue,svelte}` is read. Confirm `architect-doc-verification.md` only loads when a file under `.prism/architect/**`, `.prism/spec/adrs/**`, or `docs/content/dev/architecture/**` is read.

**Commit:** `chore: Phase 6.1 — path-scope accessibility and architect-doc-verification rules`

---

#### Task 6.2 — Clean up `.prism/architect/manifest.json`

**Action:** Edit `.prism/architect/manifest.json`. Replace the current content with the following.

```json
{
	".claude/skills/prism-qa-test-plan/": "qa-test-planning.md",
	".prism/SPEC.md": "spec-editing.md",
	".claude/skills/**": "spec-editing.md",
	".claude/skills/**/SKILL.md": "skills-ecosystem.md",
	".prism/templates/**": "spec-editing.md",
	".prism/rules/**": "spec-editing.md",
	".prism/spec/adrs/**": "spec-editing.md",
	".prism/spec/adrs/*.md": "skills-ecosystem.md",
	".prism/architect/**": "spec-editing.md",
	".prism/references/**": "spec-editing.md",
	".prism/plans/**": "spec-editing.md",
	".prism/plans/*.md": "skills-ecosystem.md",
	".ai-skills/skills/**": "spec-editing.md",
	"scripts/ai-skills/**": "spec-editing.md",
	".prism/**": "install-layout.md",
	"scripts/ai-skills/build.ts": "install-layout.md",
	"scripts/ai-skills/path-guard.ts": "install-layout.md",
	".ai-skills/definitions/paths.json": "install-layout.md",
	"docs/": "documentation.md",
	"docs/content/dev/architecture/": "architecture-doc-shape.md"
}
```

**Diff from current state:**
- **Removed:** `"**": "skills-ecosystem.md"` (the catch-all that fired on every file edit)
- **Added:** `".claude/skills/**/SKILL.md": "skills-ecosystem.md"` (skills surface)
- **Added:** `".prism/spec/adrs/*.md": "skills-ecosystem.md"` (ADR surface)
- **Added:** `".prism/plans/*.md": "skills-ecosystem.md"` (plans surface)

**Verification:**

```bash
python3 -m json.tool .prism/architect/manifest.json > /dev/null && echo "OK"
```

**Commit:** `chore: Phase 6.2 — drop manifest catch-all, add explicit skills/adrs/plans globs`

---

#### Task 6.3 — Pixel split: extract doctrine and pattern-vocabulary

**Files to create:**
- `.ai-skills/skills/prism-pixel/references/doctrine.md` (NEW, 61 lines)
- `.ai-skills/skills/prism-pixel/references/pattern-vocabulary.md` (NEW, 107 lines)

**Files to modify:**
- `.ai-skills/skills/prism-pixel/shared.md` (slim from current state to remove doctrine and pattern-vocabulary content; add load-on-demand pointers and inline summaries)

**Note on path adaptation:** Thrive places these at `.claude/skills/thrive-pixel/{doctrine,pattern-vocabulary}.md` (flat alongside SKILL.md). PRISM places them at `.ai-skills/skills/prism-pixel/references/` per the canonical structure. References inside `shared.md` use `./references/<file>.md`.

##### File 6.3.a — `.ai-skills/skills/prism-pixel/references/doctrine.md`

Create the directory and file with this exact content:

```markdown
# Pixel Doctrine — Framework Knowledge

Detailed treatments of the cognitive science and usability frameworks Pixel reasons from. Loaded on demand: mode 2 saved specs, deep audits, and any time a citation needs the full chapter or list reference. For mode 1 inline sketches, the principle names in SKILL.md are usually enough — load this file when authoritative depth is needed.

---

## Nielsen's 10 Usability Heuristics

The shared language of interface evaluation. Cite by number and name.

1. **Visibility of system status** — the system always tells the user what's happening, through appropriate feedback within reasonable time
2. **Match between system and real world** — speak the user's language, follow real-world conventions, present information in natural logical order
3. **User control and freedom** — support undo and redo; provide clearly marked emergency exits
4. **Consistency and standards** — users shouldn't wonder whether different words, situations, or actions mean the same thing
5. **Error prevention** — eliminate error-prone conditions; offer confirmation before committing
6. **Recognition over recall** — minimize memory load; make objects, actions, and options visible
7. **Flexibility and efficiency of use** — accelerators for experts that don't encumber novices; allow frequent actions to be tailored
8. **Aesthetic and minimalist design** — every extra unit of information competes with relevant information and diminishes relative visibility
9. **Help users recognize, diagnose, and recover from errors** — error messages in plain language, indicate the problem, suggest a solution
10. **Help and documentation** — best if unnecessary; when needed, easy to search, focused on the task, concrete steps

## Cognitive Science Foundations (Jeff Johnson)

From "Designing with the Mind in Mind." These are the biological constraints every interface must work within.

- **Perception** — users see what they expect. Visual hierarchy must match mental models. Gestalt principles govern grouping: proximity, similarity, continuity, closure, figure-ground, common region.
- **Attention** — selective and limited. Peripheral cues guide focus; animation draws attention whether you want it to or not. Use sparingly and intentionally.
- **Working memory** — 4±1 chunks (modern revision of Miller's 7±2). Forms, filters, and navigation that exceed this cause errors and abandonment.
- **Long-term memory and schema** — users rely on prior patterns (Jakob's Law). Deviating from conventions has a cognitive cost that must be earned.
- **Reading and scanning** — F-pattern and Z-pattern. Users don't read; they scan for signal. Labels and CTAs must survive a 200ms glance.
- **Decision-making** — Hick's Law: decision time grows logarithmically with choices. Every option has a measurable cost.
- **Motor control** — Fitts's Law: target acquisition time = f(target size, distance). Small targets and long pointer travel are measurable friction.
- **Response time** — 100ms feels instant; 1s breaks flow; 10s loses the user. Perceived performance matters as much as actual performance (Doherty Threshold: productivity soars when response is <400ms).

## Gestalt Principles

How the visual system groups and interprets elements. Violations feel "off" even when users can't name why.

- **Proximity** — elements near each other are perceived as related. Spacing IS meaning.
- **Similarity** — elements that look alike are perceived as belonging together. Consistent styling signals consistent function.
- **Continuity** — the eye follows smooth paths. Alignment creates invisible connections.
- **Closure** — the mind completes incomplete shapes. Cards, containers, and grouped elements leverage this.
- **Figure-ground** — the eye separates foreground from background. Modals, overlays, and focus states depend on this.
- **Common region** — elements within a shared boundary are perceived as grouped. Cards, panels, and sections use this.

## Named Laws

Cite by name with the specific number when applicable.

- **Fitts's Law** — time to reach a target = f(distance / size). Primary actions should be large and reachable; destructive actions should require more deliberate effort.
- **Hick's Law** — decision time = f(log₂ number of choices). Progressive disclosure and smart defaults reduce the cost.
- **Miller's Law** — working memory holds 7±2 items (revised to 4±1 chunks). Chunk information to fit. Menus, nav lists, and filter panels that exceed the threshold need grouping.
- **Jakob's Law** — users spend most of their time on *other* sites. They expect yours to work like the ones they already know. Convention deviations must earn their cognitive cost.
- **Peak-End Rule** — users judge an experience by its emotional peak and its ending, not the average. Error states and completion flows are disproportionately memorable. Make them good.
- **Doherty Threshold** — productivity soars when system response is <400ms. Design for perceived speed when actual speed isn't achievable (skeleton screens, optimistic UI).

## Additional Principles

- **Cognitive load** — three types. Intrinsic (task complexity — can't reduce). Extraneous (bad design overhead — Pixel's target). Germane (learning that sticks — worth investing in). UX work is reducing extraneous load while preserving germane load.
- **Progressive disclosure** — show what's needed now; reveal complexity on demand. Critical for equipment dealership sites where data is deep but attention is shallow.
- **Affordance and signifiers** — visual elements should suggest their function. Norman's distinction: affordance is what an object CAN do; a signifier is what tells the user it can do that. A button that doesn't look clickable fails before anyone touches it.
```

##### File 6.3.b — `.ai-skills/skills/prism-pixel/references/pattern-vocabulary.md`

Create with this exact content:

```markdown
# Pixel Pattern Vocabulary

Tactical design patterns Pixel draws from. Loaded on demand: mode 2 saved specs, convention and deep audits, mode 3 HTML mockups. Mode 1 quick inline sketches typically don't need this catalog — load it when proposing a new pattern, auditing across multiple dimensions, or specifying a saved mock.

Each pattern has a "when to use" and a "watch out for." Cite these in proposals and audits.

---

## Form Design

- **Inline validation** — validate on blur, not on keystroke. Show errors next to the field, not at the top. Green confirmation for fields that pass non-obvious validation.
- **Error message anatomy** — what went wrong + why + how to fix it. Never "Invalid input." Always actionable: "Phone number needs 10 digits — you entered 9."
- **Multi-step forms** — show progress (step 2 of 4), allow back-navigation, preserve state. For equipment quotes: break into logical chunks (equipment selection → contact info → financing preferences).
- **Smart defaults** — pre-fill what you can. Location from browser. Currency from locale. Equipment type from the page they came from. Nielsen #7 (flexibility and efficiency).
- **Required vs optional** — mark the minority. If most fields are required, mark the optional ones and vice versa.

## States

Every UI has five states. Designing only the happy path is designing 20% of the experience.

- **Empty state** — never a dead end. Always include: what this area will contain, why it's empty, and a CTA to fill it. "No saved equipment yet. Browse inventory to start building your list."
- **Loading state** — skeleton screens for layout-predictable content (cards, lists, tables). Spinners only for unpredictable-length operations. Progressive loading: show summary data first, detail after. Never a blank screen.
- **Error state** — problem + cause + next step. "Couldn't load inventory. Check your connection and try again, or call [number] for help." Include a retry action. Severity levels: critical (blocking) vs. warning (degraded) vs. info (notification).
- **Partial/edge state** — one item in a list that expects many. Very long content that breaks a layout. Missing data in one field of a card. Design for these explicitly.
- **Success/confirmation** — toast for background operations. Inline for context-dependent confirmation. Redirect for completion (quote submitted → confirmation page). Peak-End Rule: make this moment feel good.

## Container Patterns

The impulse to use a modal is almost always wrong. Decision framework:

- **Modal** — quick confirmations (1-2 fields), destructive action confirmation, alerts that need acknowledgment. Not for content the user needs to reference while acting.
- **Drawer / side panel** — detail views alongside a list, filters, multi-field forms that benefit from context. Keep the underlying page visible.
- **Inline** — quick edits, toggles, contextual settings. Lowest cognitive cost — user stays in place.
- **Full page** — complex forms, multi-step wizards, anything needing full attention. Equipment configuration, financing applications.
- **Bottom sheet (mobile)** — the mobile equivalent of a drawer. Rises from the thumb zone. Use for filters, quick actions, detail previews.

## Feedback Patterns

- **Toast** — transient (3-5s), non-blocking, confirmatory. "Equipment added to comparison." Include undo when reversible. `role="status"` for screen readers. Max 3 visible; queue the rest.
- **Banner** — persistent until dismissed or resolved. "Financing terms expire in 2 hours." Contextual and important but not blocking.
- **Inline feedback** — attached to the element. Form validation, character counts, status badges on cards.
- **Modal alert** — blocking. Only for critical information requiring acknowledgment. Data loss warnings, authentication failures.

## Search & Discovery

- **Faceted search** — filters narrow results. Show active filters as removable chips. Update result counts on each change so users never hit a dead end. Group related filters under labeled headings (Gestalt proximity).
- **Autocomplete** — 8 suggestions on mobile, 10 on desktop. Show recent searches, popular searches, and matching results. Categorize when inventory is diverse.
- **Zero results** — never a dead end. Suggest: relax a filter, expand the radius, try related terms, browse popular categories.
- **Search intent** — distinguish known-item search ("Cat 320D") from exploratory search ("compact excavators near me"). The UI should adapt.

## Data Tables & Lists

- **Filter placement** — sidebar on desktop, bottom sheet on mobile. Real-time update for exploration; "Apply" button for saved searches.
- **Sorting** — column headers for tables, dropdown for lists. Always indicate sort direction. Server-side for large datasets.
- **Pagination vs infinite scroll** — pagination for bounded datasets (equipment inventory with total count). Infinite scroll for feeds. Always show total.
- **Bulk actions** — floating action bar on selection. "Compare selected (3)" / "Request quote for selected."
- **Responsive tables** — never horizontally scroll. Reflow to card layout on mobile. Show P0 columns, collapse P2-P3 behind expand.

## Typography System

- **Hierarchy** — display → h1 → h2 → h3 → body → caption → overline. Each level must be visually distinct at a glance.
- **Line length** — 45-75 characters per line for body text. Shorter lines feel choppy; longer lines cause tracking errors.
- **Vertical rhythm** — consistent spacing based on a baseline unit (typically 4px or 8px). Consistency creates calm; inconsistency creates noise.
- **Scanning** — bold key terms, use sentence case for labels, front-load important words. Users scan the first 2 words of every line (F-pattern).

## Color System

- **Contrast minimums** — 4.5:1 for normal text, 3:1 for large text (18px+ or 14px+ bold), 3:1 for UI components and graphical objects. These are WCAG 2.1 AA requirements — the legal and ethical floor.
- **Color semantics** — red = error/danger, green = success, amber/yellow = warning, blue = info/primary action. Established conventions; don't fight them without strong justification.
- **Never color alone** — color is never the sole means of conveying information. Pair with icons, text labels, or patterns.
- **Dark/light mode** — if supported, design both. Contrast ratios shift, shadows disappear, images may need different treatments. Don't just invert.

## Motion & Animation

- **Functional vs decorative** — functional animation conveys state change (collapse, expand, slide in) or spatial relationship (where did this come from). Decorative animation is noise. Every animation should answer "what does this teach the user?"
- **`prefers-reduced-motion`** — respect this always. Disable non-essential animation; reduce essential animation to opacity transitions for users who set this flag. This is an accessibility baseline, not a nice-to-have.
- **Duration** — micro-interactions: 100-200ms. Transitions: 200-400ms. Page-level: 300-500ms. Over 500ms feels sluggish.
- **Easing** — ease-out for entering elements (fast start, gentle landing). ease-in for exits. Linear for progress indicators only.

## Micro-interactions & Affordances

- **Hover states** — desktop only. Reveal secondary actions, indicate clickability. Must have keyboard and touch equivalents.
- **Press/active states** — visual feedback that the tap/click registered. Critical for touch where there's no hover.
- **Drag affordances** — grip dots on the left (convention), cursor change, shadow lift. Must have keyboard alternative (arrow keys or move buttons).
- **Focus indicators** — visible, consistent, high-contrast. Never `outline: none` without a replacement.

## Content-First Design

Design serves content, not the reverse. Before designing a layout:

- **Content priority** — what does the user need first, second, third? For equipment cards: photo + price + location (P0), then specs + hours + model (P1), then service history + certification (P2). Design for the priority, not for visual balance.
- **Content absence** — what happens when content is missing? A card without a price, a listing without a photo, a dealer without reviews. Design for the holes, not just the ideal.
- **Content structure** — understand types, lengths, and relationships before drawing boxes. Lorem ipsum hides layout failures.

## Dark Patterns (Pixel flags these)

Trust is the currency of high-consideration purchasing. Pixel flags these if she sees them:

- **Confirmshaming** — guilt-trip language on decline buttons ("No, I don't want to save money")
- **False scarcity** — "Only 2 left!" when inventory is fine
- **Hidden costs** — fees revealed only at checkout or "Call for pricing" after showing a price range
- **Roach motel** — easy to enter (newsletter signup), hard to exit (buried unsubscribe)
- **Bait-and-switch** — advertised price ≠ actual price
- **Forced continuity** — auto-renewal without clear notice
- **Misdirection** — visual emphasis on the option that benefits the business, not the user

Equipment buyers research for days. One deceptive experience destroys trust permanently. Ethical design isn't just principled — it's good business.
```

##### File 6.3.c — slim `.ai-skills/skills/prism-pixel/shared.md`

The current PRISM `shared.md` is 689 lines. The slim removes the "Framework Knowledge" detailed section (full Nielsen breakdown, full Gestalt section, full Named Laws section, full Cognitive Science section, full Additional Principles section) and replaces it with a quick-reference summary plus load-on-demand pointer. Same for "Design Pattern Vocabulary."

**Strategy:** find the existing detailed Framework Knowledge section in `shared.md` and replace it with the quick-reference + pointer block below. Find the existing Pattern Vocabulary detail block (if present) and replace it with the load-on-demand pointer.

The Pixel SKILL.md from Thrive PR #1970 is the canonical post-slim shape — embed this content as the model. PRISM's `shared.md` should match this body (with `thrive-pixel` → `prism-pixel` substitutions in the cross-references).

**The replacement strategy explicitly:**

1. Locate in PRISM `shared.md` the section starting with `## Framework Knowledge` (or similar — Pixel's deep doctrine block). It begins with detailed Nielsen entries, includes Cognitive Science Foundations (Jeff Johnson), Gestalt Principles, Named Laws, Additional Principles. **Replace this entire block** with the quick-reference + pointer below.

2. Locate any **Design Pattern Vocabulary** section that contains the full Form Design, States, Container Patterns, etc. (the content now in `references/pattern-vocabulary.md`). **Replace with the load-on-demand pointer below.**

3. Update internal references from `[doctrine.md](./doctrine.md)` to `[doctrine.md](./references/doctrine.md)` and `[pattern-vocabulary.md](./pattern-vocabulary.md)` to `[pattern-vocabulary.md](./references/pattern-vocabulary.md)`.

4. Substitute `thrive-pixel` → `prism-pixel`, `thrive-architect` → `prism-architect`, etc. anywhere these appear in cross-references.

**Replacement block 1 — the quick-reference Framework Knowledge:**

```markdown
---

## Framework Knowledge — quick reference

The principles Pixel cites by name. Brief definitions kept inline; full treatments live in [`doctrine.md`](./references/doctrine.md) and load on demand for mode 2 specs and deep audits.

**Nielsen's 10 Heuristics** — visibility of status (#1), real-world match (#2), user control / freedom (#3), consistency / standards (#4), error prevention (#5), recognition over recall (#6), flexibility / efficiency (#7), aesthetic / minimalist (#8), error recovery (#9), help / docs (#10).

**Named Laws** — Fitts (target time = f(distance/size)), Hick (decision time grows with choices), Miller (working memory ≈ 4±1 chunks), Jakob (users expect your site to work like sites they know), Peak-End (judged by peak and ending, not average), Doherty Threshold (<400ms response feels instant).

**Gestalt** — proximity, similarity, continuity, closure, figure-ground, common region. Spacing IS meaning.

**Cognitive science (Johnson)** — perception, attention (limited), working memory (chunked), schema reuse, F/Z scanning, response timing (100ms instant / 1s breaks flow / 10s lost).

When a citation needs the full chapter reference, the complete definition, or the full Gestalt treatment — load [`doctrine.md`](./references/doctrine.md). For quick mode 1 inline citations ("Hick's Law is working against you here"), the names above are usually enough.

---

## Design Pattern Vocabulary — load on demand

Tactical patterns (form design, the five states, container patterns, feedback patterns, search & discovery, data tables, typography, color, motion, micro-interactions, content-first design, dark patterns) live in [`pattern-vocabulary.md`](./references/pattern-vocabulary.md). Load it for:

- Mode 2 saved specs — the spec needs cited patterns to meet the implementation-task detail bar
- Convention audits and deep audits — the audit dimensions reference these patterns directly
- Mode 3 HTML mockups — the visual decisions draw from this vocabulary
- Any time a proposal cites a pattern by name and needs the "when to use" / "watch out for" detail

For mode 1 inline sketches answering a focused question ("where does Save go," "is this hierarchy right"), don't load — the answer rarely needs the full catalog.

The five states (empty / loading / error / partial / success) are load-bearing for every saved spec — that section in `pattern-vocabulary.md` is the canonical reference for the state-coverage requirement in the Definition of Done.

---
```

This block lands between the existing "Personality" / "How Pixel sees it" sections and the existing "Equipment Dealership Context" section in PRISM `shared.md` — replacing whatever detailed Framework Knowledge / Pattern Vocabulary content currently sits in that location.

**Note for Clove:** the exact insertion point will become obvious after reading `shared.md` — find where "Equipment Dealership Context" starts and where "How Pixel sees it" or similar ends. The doctrine and pattern-vocab content currently sits between them; that's what gets replaced.

After the substitution, `shared.md` should drop ~140 lines (the detailed doctrine + pattern catalog content moves to references/), bringing the file to roughly 549 lines.

**Verification:** `pnpm prism:build` runs clean; `wc -l .ai-skills/skills/prism-pixel/shared.md` shows ~549 lines (target: substantial reduction from 689); `wc -l .ai-skills/skills/prism-pixel/references/*.md` shows the two reference files.

**Commit:** `chore: Phase 6.3 — Pixel split shared.md + references/{doctrine,pattern-vocabulary}.md`

---

#### Task 6.4 — Reese split: extract per-mode files

**Files to create (all under `.ai-skills/skills/prism-qa-test-plan/references/`):**
- `release-mode.md` (NEW, 98 lines)
- `sprint-mode.md` (NEW, 60 lines)
- `single-pr-mode.md` (NEW, 55 lines)
- `bug-fix-mode.md` (NEW, 59 lines)

**Files to modify:**
- `.ai-skills/skills/prism-qa-test-plan/shared.md` — slim to retain persona, How Reese Thinks, mode detection, shared mechanics, writing rules; remove the four mode-specific sections and replace with load-on-demand pointers. Update internal links to `./references/<mode>.md`.

##### File 6.4.a — `.ai-skills/skills/prism-qa-test-plan/references/release-mode.md`

Create with this content (Thrive content with `thrive-` → `prism-` substitutions where applicable; this file has no skill-name references that need swapping):

```markdown
# Reese — Release Mode

Triggered by a tag pair, a GitHub compare URL between tags, or release-flavored prompt words. Produces a full release checklist with scope tables, RTM, broad regression sweep, and sign-off. Loaded on demand by SKILL.md when mode detection lands on Release.

### 1. Parse the input

- **Two tags** (e.g. `v1.0.812 v1.1.10`, `v1.0.812..v1.1.10`, `v1.0.812 to v1.1.10`, `from v1.0.812 to v1.1.10`): extract `<base>` (old) and `<head>` (new). Normalize tags — if a tag is missing the `v` prefix, prepend it (`1.0.812` → `v1.0.812`). Tags always start with `v`.
- **GitHub compare URL** (e.g. `https://github.com/<org>/<repo>/compare/v1.0.812...v1.1.10`): parse `/compare/<base>...<head>` from the URL path (three dots).
- **One tag only**: ask which end it represents and what the other tag is.
- **No tags**: ask for the previous and new release tags.

### 2. Validate both tags exist

```bash
git tag -l <base>
git tag -l <head>
```

If either is missing, `git fetch origin tag <name> 2>/dev/null` and retry. If it's still missing, stop and tell the user.

### 3. Confirm the range

```bash
git log --oneline <base>..<head> | wc -l
```

Tell the user: "Alright, N commits between `<base>` and `<head>` — let me see what we're working with."

### 4. Resolve the commit set

```bash
git log --format='%h|%an|%s' <base>..<head>
```

Collect **hash, author, subject** per commit. Extract **PR numbers** from subjects (`(#1234)`).

### 5. Filter scope

Default audience is manual UI testers — visitors and block editor users, not engineers running unit tests.

**Exclude from dedicated manual scenarios** (list in an **Out of scope** table with reason):

- Agent / dev-only: commits whose subject indicates **AI skills**, **branch plans**, **agents.md**, **lesson md**, **AGENTS**, **.claude** housekeeping — unless the user explicitly says to include them
- **Tests-only / types-only** PRs: no new user-facing UI — optionally one **regression** bullet under a spot-check section and a footnote in the ticket table

**Include:** anything that plausibly touches visitor UI, wp-admin / block editor, 404 / error pages, forms, search, header, or bundles that change when scripts load.

If unsure whether a PR is UI-facing, run `git show <hash> --stat` and decide from file paths (`edit.tsx`, `blocks/`, `components/`, `app/not-found`, etc.).

### 6. Map tickets, identify regression risks, build the document

Follow the shared mechanics in SKILL.md (_Shared Mechanics_) for ticket mapping and regression scanning.

Then build the document using this skeleton:

**Output path:** `.claude/docs/qa/<project>-<base>-<head>-manual-qa-checklist.md`

First, derive the GitHub compare URL from the repo's origin remote:

```bash
REPO_URL=$(git remote get-url origin | sed 's/\.git$//' | sed 's|git@github.com:|https://github.com/|')
```

Then use `$REPO_URL/compare/<base>...<head>` wherever a compare link is needed.

**Header:**

```
# <project> — Manual QA Checklist

**Release reference:** [<base> → <head>]($REPO_URL/compare/<base>...<head>)
**Scope:** Manual scenarios for **UI-facing work** merged in this tag range from **all authors**. Internal-only PRs are listed under **Out of scope** below.

**Who this is for:** Testers using the site like real visitors, plus structured passes in the **WordPress block editor** where noted.

**How to use:** Take sections in order or split by person. For each item, record **Pass / Fail**, **browser**, **URL**, short **notes**, and a **screenshot** on failure.

---
```

**Body sections:**

1. **Out of scope** — table: PR | Reason (agentic, automated-only, types-only)
2. **Ticket coverage (THR-\*)** — table: Ticket | PR(s) | Plain-language focus | Section(s)
3. **Before you start** — environment, visitor vs editor, cache, product-specific toggles (e.g. Advanced vs simple header search)
4. **Feature sections** (numbered) — each with:
   - **Tickets:** line (list all relevant THR-\* IDs)
   - **Goal:** one sentence, tester-facing
   - Small **table**: Steps | What "good" looks like
   - **Checklist** `- [ ] id.x` lines mirroring the table
5. **Regression testing** — a dedicated section after the feature sections:
   - **Goal:** verify that changes in this release haven't broken existing functionality outside the feature areas above
   - Grouped by risk area (e.g. "Shared components", "Sitewide rendering", "Navigation")
   - Each group gets a brief _why_ (e.g. "PR #1451 refactored the block registry — all blocks could be affected")
   - Spot-check scenarios in the same table + checklist format as feature sections
6. **Sign-off** — see SKILL.md _Shared Mechanics_

**Commit subject template (Release):** `chore: Add QA checklist for <base> → <head>` (or `THR-NNNN:` variant when tied to a ticket).
```

##### File 6.4.b — `.ai-skills/skills/prism-qa-test-plan/references/sprint-mode.md`

```markdown
# Reese — Sprint / Group Mode

Triggered by multiple PRs, a commit range, or sprint-flavored prompt words. Produces a lighter living checklist covering several PRs with per-PR ticket callouts and a shared regression section across the group. Loaded on demand by SKILL.md when mode detection lands on Sprint / Group.

### 1. Parse the input

- **Multiple PRs** (e.g. `#1234 #1235 #1236` or full URLs): collect the PR numbers.
- **Commit range** (e.g. `origin/main..HEAD`, `<sha>..<sha>`): use `git log --format='%h|%an|%s' <range>` to resolve commits, then extract PR numbers from subjects.
- **Named branch or cycle reference** without explicit PRs: ask which PRs or commit range to cover.

### 2. Resolve the commit set

For explicit PR inputs:

```bash
gh pr view <num> --json commits,title,headRefName,baseRefName,number
```

Per PR, collect the commits and PR metadata. For commit ranges, use `git log` as above.

### 3. Filter scope

Same heuristic as Release mode — exclude agentic / tests-only / types-only PRs, but note that at sprint scale there's usually less to exclude than in a full release.

### 4. Map tickets, identify regression risks, build the document

Follow SKILL.md _Shared Mechanics_ for ticket mapping and regression scanning. Regression here focuses on shared surfaces touched across the group — if two PRs in the set both touch `components/ui/`, that's a stronger signal than either one alone.

Build the document using this skeleton:

**Output path:**

- If explicit PR list: `.claude/docs/qa/<project>-prs-<first>-through-<last>-qa-checklist.md`
- If commit range: `.claude/docs/qa/<project>-<range-slug>-qa-checklist.md` (e.g. `origin-main-to-head`)

**Header:**

```
# <project> — Sprint QA Checklist

**Change set:** <list PRs with links, or the commit range>
**Scope:** Manual scenarios for UI-facing work across this sprint / PR group. Non-UI PRs are listed under **Out of scope** below.

**Who this is for:** Testers using the site like real visitors, plus structured passes in the **WordPress block editor** where noted.

**How to use:** Take sections in order or split by person. For each item, record **Pass / Fail**, **browser**, **URL**, short **notes**, and a **screenshot** on failure.

---
```

**Body sections:**

1. **Out of scope** — same table format as Release
2. **PR coverage** — table: PR | Ticket(s) | Plain-language focus | Section(s) — no release-wide RTM, but each PR gets a row
3. **Before you start** — environment, toggles, preconditions
4. **Per-PR feature sections** — same format as Release feature sections, one per in-scope PR
5. **Regression testing — shared surfaces across the group** — grouped by risk area, explicitly noting which PRs contributed to each risk
6. **Sign-off** — see SKILL.md _Shared Mechanics_

**Commit subject template (Sprint / Group):** `chore: Add QA checklist for PRs #X, #Y, #Z` (or `chore: Add QA checklist for <range-slug>` for commit ranges).
```

##### File 6.4.c — `.ai-skills/skills/prism-qa-test-plan/references/single-pr-mode.md`

```markdown
# Reese — Feature / PR Mode

Triggered by a single PR (number, URL, or branch name) without bug-verification cues. Produces a tight impact-analysis checklist scoped to that one PR's diff. Loaded on demand by SKILL.md when mode detection lands on Feature / PR.

### 1. Parse the input

- **PR number or URL:** resolve with `gh pr view <num> --json commits,title,headRefName,baseRefName,number,url`.
- **Branch name:** resolve with `gh pr view <branch>` (same JSON fields). If no PR exists for the branch yet, fall back to treating it as an in-flight feature: `origin/main..<branch>` is the commit range, no PR number yet.

### 2. Inline the Linear AC when a THR-\* is in the PR title

If the PR title contains `THR-NNNN`, call `get_issue` and pull the `## Acceptance Criteria` section from the ticket description. These get inlined in the document so the tester can verify acceptance directly from the checklist without jumping to Linear.

### 3. Resolve the commit set and inspect the diff

```bash
gh pr view <num> --json commits -q '.commits[].oid'
```

Or, for a branch with no PR, use the `origin/main..<branch>` range. Then run `git show <hash> --stat` (or `gh pr diff <num> --name-only`) to see what surfaces the change touches — this is what drives the regression section.

### 4. Build the document

**Output path:**

- If a PR exists: `.claude/docs/qa/<project>-pr-<number>-qa-checklist.md`
- If branch-only (no PR yet): `.claude/docs/qa/<project>-<branch-slug>-qa-checklist.md`

**Header:**

```
# <project> — PR QA Checklist

**PR:** [#<number> — <title>](<pr-url>)
**Ticket:** THR-NNNN (inline; link to Linear)
**Scope:** Manual scenarios for the user-visible change in this PR, plus targeted regression on surfaces the diff touches.

**Who this is for:** Testers using the site like real visitors, plus the **WordPress block editor** when the change involves editor UI.

**How to use:** Each item records **Pass / Fail**, **browser**, **URL**, short **notes**, and a **screenshot** on failure.

---
```

**Body sections:**

1. **Before you start** — environment, toggles, preconditions
2. **Acceptance criteria from the ticket** (if THR-\* found) — inline the AC items so testers can verify each one. Give them Pass/Fail checkboxes.
3. **Feature sections** — same format as Release feature sections, scoped to this one PR's change. Each with Tickets line, Goal, Steps | What "good" looks like table, and a Pass/Fail checklist.
4. **Targeted regression** — spot-checks on the specific shared surfaces the diff touched (not the broad release-style sweep). If no shared surfaces were touched, say so and include a minimal smoke test.
5. **Sign-off** — see SKILL.md _Shared Mechanics_

No "Out of scope" table (nothing to exclude — it's one PR) and no release-wide RTM table.

**Commit subject template (Feature / PR):** `chore: Add QA checklist for PR #<number>` — and if a THR-NNNN is in the PR title, prefer `THR-NNNN: Add QA checklist for PR #<number>`.
```

##### File 6.4.d — `.ai-skills/skills/prism-qa-test-plan/references/bug-fix-mode.md`

```markdown
# Reese — Bug-fix Verification Mode

Triggered by a PR whose Linear ticket is labeled `bug`, or by explicit prompt words like "verify this bug fix," "retest," "bug fix verification," "QA this fix." Produces a verification plan structured around the bug report — not around the feature diff. Loaded on demand by SKILL.md when mode detection lands on Bug-fix Verification.

### 1. Parse the input

Same as Feature / PR mode: single PR number, URL, or branch name. Resolve with `gh pr view`.

### 2. Pull the full bug report from Linear

Call `get_issue` on the linked THR-\* and capture:

- **Severity** (S1 / S2 / S3 / S4)
- **Environment** (staging, production, browser, device)
- **Steps to reproduce**
- **Expected behavior**
- **Actual behavior**
- **Root cause** (verified or suspected — both are usable)

These become the spine of the verification plan.

### 3. Resolve the commit set and inspect the diff

Same mechanics as Feature / PR mode — `gh pr diff <num> --name-only` to see what surfaces the fix touched. This drives the regression section.

### 4. Build the document

**Output path:** `.claude/docs/qa/<project>-bug-<thr-number>-verification.md`

**Header:**

```
# <project> — Bug-Fix Verification Plan

**Bug:** [THR-NNNN — <title>](<linear-url>)
**PR:** [#<number> — <title>](<pr-url>)
**Severity:** <S1 / S2 / S3 / S4>
**Environment:** <where it was observed>
**Who this is for:** Testers verifying the defect is gone and hasn't taken anything with it.

**How to use:** Each item records **Pass / Fail**, **browser**, **URL**, short **notes**, and a **screenshot** on failure.

---
```

**Body sections:**

1. **Before you start** — environment to reproduce against, any preconditions from the ticket
2. **Primary verification** — the bug's repro steps converted into Pass/Fail scenarios:
   - **Follow the repro steps from the ticket** (list them)
   - **What "good" looks like now:** the expected behavior from the ticket — the fix means actual behavior should now match expected
   - Checklist items mirroring each repro step
3. **Targeted regression** — spot-checks on the surfaces the fix touched (diff-driven, same technique as Feature / PR mode)
4. **Root-cause adjacency** — scenarios that verify the _class_ of bug isn't present elsewhere. Example: if the root cause is "null check missing on X," write a scenario that verifies other similar surfaces handle the null case. If the root cause is "race condition on Y," check other places where the same race could bite.
5. **Sign-off** — see SKILL.md _Shared Mechanics_

No "Out of scope" table and no release-wide RTM table. The ticket's severity and environment are the banner.

**Commit subject template (Bug-fix Verification):** `THR-NNNN: Add bug-fix verification plan for PR #<number>`.
```

##### File 6.4.e — slim `.ai-skills/skills/prism-qa-test-plan/shared.md`

The current PRISM `shared.md` for Reese contains the four mode-specific sections inline. Slim by removing those four sections and replacing with load-on-demand pointers.

**Find the existing four mode sections** in `shared.md` (Release / Sprint / Single-PR / Bug-fix mode sections, each with detailed parsing/output instructions). **Replace them with** a single section like this:

```markdown
## Mode files — load on demand

After mode detection lands, load the matching mode file from this skill's `references/` folder before building the plan. Each mode file holds the input parsing, commit-set resolution, scope filtering (where applicable), output path, and document skeleton specific to that mode:

- **Release** — [`release-mode.md`](./references/release-mode.md)
- **Sprint / Group** — [`sprint-mode.md`](./references/sprint-mode.md)
- **Feature / PR** — [`single-pr-mode.md`](./references/single-pr-mode.md)
- **Bug-fix Verification** — [`bug-fix-mode.md`](./references/bug-fix-mode.md)

Don't load mode files Reese isn't running. The shared mechanics below apply across all four modes — load only the matching mode file alongside SKILL.md.
```

Substitute `thrive-qa-test-plan` → `prism-qa-test-plan` etc. throughout `shared.md` for any cross-skill references.

**Verification:** `pnpm prism:build` runs clean; line count drops substantially in `shared.md`; the four reference files exist.

**Commit:** `chore: Phase 6.4 — Reese split shared.md + references/ four mode files`

---

#### Task 6.5 — Nora restructure: templates move + skill-internal frameworks

**Files to create:**
- `.prism/templates/ticket-description.md` (NEW, 43 lines)
- `.ai-skills/skills/prism-ticket-start/references/frameworks.md` (NEW, 158 lines)

**Files to modify:**
- `.ai-skills/skills/prism-ticket-start/shared.md` — remove the inline triage frameworks block, add a load-on-demand pointer to `frameworks.md`. Move the ticket-description scaffold (if present) to a one-line link to the templates file.

##### File 6.5.a — `.prism/templates/ticket-description.md`

```markdown
# Ticket Description

The default scaffold Nora uses when creating or fleshing out a Linear ticket. Fill every section heading — write "Not Applicable" under any heading that doesn't apply rather than omitting it. Downstream personas (Winston, Mira, Sasha, Clove) reference these section names directly when reading the ticket; missing headings create gaps.

For type-specific structure (bug, feature, improvement, DX), see [`ticket-types.md`](./ticket-types.md). For acceptance criteria format, see [`acceptance-criteria.md`](./acceptance-criteria.md). For bug-specific fields, use [`bug-report.md`](./bug-report.md) and skip this scaffold.

---

## Problem statement

One paragraph describing the problem or outcome — not the solution. The user, what they're trying to accomplish, and why the current state is insufficient. If the trigger was a specific incident or piece of feedback, reference it.

## Currently

Concrete description of how things work today. One paragraph. The "before" half of the standard "Currently X. This change makes it Y because Z." structure.

## This change makes it

What changes — described in observable terms. The "after" half of the same structure. If a mock or design exists, link it here.

## Because

The rationale. What problem this solves, what value it delivers, what it unblocks.

## Scope

What's in:
- [item]

What's out:
- [item]

## Technical notes

Optional. Constraints, dependencies, complexity signals, or context the team needs that doesn't fit cleanly above. Skip the heading if there's nothing to add.

## Links

Optional. Related tickets, design references, prior conversations, external context. Skip the heading if there's nothing to add.

## Acceptance Criteria

See [`acceptance-criteria.md`](./acceptance-criteria.md) for the format. Behavioral criteria use Gherkin; non-behavioral use a plain checklist. Winston typically generates AC during planning; Nora can scaffold a placeholder when creating the ticket so the section heading is present.
```

##### File 6.5.b — `.ai-skills/skills/prism-ticket-start/references/frameworks.md`

```markdown
# Triage Frameworks

Reference content for Nora's triage assessments. Loaded by `SKILL.md` when running Definition of Ready, severity classification, impact assessment, scope/INVEST checks, blast radius mapping, or requirements quality review. Cite the framework by name when applying it ("this fails the INVEST 'Estimable' test" / "putting this at S2 because…") so downstream personas can audit the reasoning.

---

## Severity Classification

| Level | Label | Criteria | Example |
|-------|-------|----------|---------|
| **S1** | Critical | System down or data integrity at risk. No workaround. Affects all/most users or dealers. Revenue-impacting or data-corrupting. | Inventory sync deleting records. Checkout flow crashing on all sites. |
| **S2** | High | Major feature broken. Workaround exists but is painful or non-obvious. Affects many users. Core workflow degraded. | Filters return wrong results. Quote form submits but doesn't reach dealer. Equipment images not loading on mobile. |
| **S3** | Medium | Feature degraded. Reasonable workaround exists. Affects some users. Non-core workflow. | Sort order resets on page reload. Admin settings don't save on first try (works on retry). Slow image gallery on one browser. |
| **S4** | Low | Cosmetic or minor inconvenience. Easy workaround or negligible impact. Affects few users. | Button alignment off by 4px. Placeholder text typo. Tooltip shows on wrong side on one breakpoint. |

**Priority ≠ Severity.** A Low-severity bug on every dealer's homepage (blast radius: thousands of visitors daily) is higher priority than a High-severity bug in an admin tool used by three people. Always assess both dimensions before recommending priority.

---

## Impact Assessment

For any ticket — bug, feature, or improvement — assess impact across four dimensions:

- **Reach** — how many users, dealers, or sites are affected? All sites vs one site? All users vs admin-only? End customers vs internal staff?
- **Severity/Value** — how badly affected (bugs) or how much value delivered (features)? Can they work around it?
- **Frequency** — how often does this occur or how often will this be used? Every page load vs once a month? Daily workflow vs annual configuration?
- **Business cost** — revenue risk? Dealer churn risk? Compliance risk? Reputation risk? Does this block other work?

**Quick prioritization:** Impact = Reach × Severity × Frequency. Layer business cost on top. High reach + high severity + high frequency = drop everything. Low reach + low severity + low frequency = backlog.

When recommending a priority, show the reasoning: "Putting this at High — it's S2 severity affecting all dealers (high reach), happens on every inventory page load (high frequency), and there's no workaround. The only reason it's not Urgent is that it's a degradation, not a total failure."

---

## Definition of Ready

A ticket is "ready" when the next skill in the chain can start without coming back to ask questions.

**Universal (all types):**
- [ ] Goal is stated as a problem or outcome, not a solution
- [ ] Ticket type is labeled (bug / feature / improvement / DX)
- [ ] Scope is bounded — "in scope" and "out of scope" are explicit
- [ ] Acceptance criteria exist or can be derived from the description
- [ ] No unresolved blockers or dependencies
- [ ] Estimate exists or the ticket is estimable from the description
- [ ] Downstream skill can start from what's here (Winston can plan / Mira can write stories / Sasha can investigate)

**Bug-specific additions:**
- [ ] Steps to reproduce are present and verified (or marked suspected)
- [ ] Environment specified (staging / production, browser, device)
- [ ] Expected vs actual behavior described
- [ ] Severity classified (S1-S4) with rationale
- [ ] Blast radius assessed (affected sites, features, users, regression risk)
- [ ] Root cause identified (verified or suspected) — or flagged for Sasha

**Feature-specific additions:**
- [ ] User and their goal identified (not just "the system should...")
- [ ] Success criteria defined — how do you know when this is done?
- [ ] Edge cases or secondary users noted (even if just "TBD for Mira")
- [ ] Design reference linked or flagged as needed (no mock → flag for Pixel)

**Improvement-specific additions:**
- [ ] Current behavior described concretely
- [ ] Proposed change and rationale explained — why is the current way insufficient?
- [ ] Migration or backward compatibility considered if applicable

When a ticket fails the DoR, don't block silently — say what's missing and offer to help: "This needs scope boundaries before it's ready. Want me to help pin down what's in and what's out?"

---

## INVEST Criteria (Scope Assessment)

Evaluate whether a ticket is workable. Flag violations by name.

- **I — Independent:** Can this be worked on without waiting for another ticket? If not, flag the dependency and assess whether to decouple or sequence.
- **N — Negotiable:** Is there room to adjust scope during implementation, or is this locked to a specific solution? Tickets that prescribe implementation are fragile — the team should have room to find the best approach.
- **V — Valuable:** Does this deliver value to a user or the business? Pure technical refactors should articulate the user-facing benefit (faster load times, fewer errors, reduced maintenance cost).
- **E — Estimable:** Can the team estimate the effort? If it's too vague or too novel to estimate, it needs discovery first (Mira for requirements, Winston for technical feasibility), not implementation.
- **S — Small:** Can this be completed in one cycle? If not, split it. A ticket that spans multiple sprints is a project, not a ticket.
- **T — Testable:** Can you write acceptance criteria that verify when this is done? If the description says "should be fast" or "should look good," it's not testable. Pin it: "Fast means under 2 seconds on 3G" or "Good means matching the existing card pattern."

---

## Splitting Strategies

When a ticket fails the S (Small) test, or when the scope feels unbounded:

- **By user type** — admin vs frontend user vs API consumer. Ship one user's experience per ticket.
- **By workflow step** — separate create / edit / delete into individual tickets. Each is independently valuable.
- **By data type** — one ticket per entity when changes touch multiple models. Reduces blast radius.
- **By happy path vs edge cases** — ship core behavior first, handle edge cases in follow-up tickets.
- **Vertical slice** — one ticket delivers one thin path from UI to data layer. Never split horizontally (frontend in one ticket, backend in another) — that creates integration risk and blocks testing.

When suggesting a split, name the strategy: "This ticket covers create, edit, delete, and bulk operations for equipment listings. I'd split by workflow step — create first (it unblocks the demo), then edit and delete, then bulk as a follow-up."

---

## Complexity Signals

Tickets that are "bigger than they look." Flag these in the summary:

- Touches shared components used by multiple blocks or pages
- Requires changes across both frontend and backend
- Involves data migration or schema changes
- Needs coordination with external APIs or services
- Has no existing pattern to follow (novel architecture)
- Crosses the server/client boundary in a new way
- Affects both the block editor AND the frontend rendering
- Modifies behavior of a block that's used on every dealer site

Example surfacing: "Heads up — this touches the mega menu block, which is on every dealer site. Complexity signal: high blast radius, shared component, editor + frontend rendering. The estimate may need revision."

---

## Requirements Quality

When building requirements or reviewing a ticket description, check for:

**Ambiguity red flags** — words that signal unclear requirements:
- "appropriate," "suitable," "reasonable" — appropriate to whom? By what standard?
- "etc.," "and so on," "similar items" — what specifically? List them.
- "fast," "responsive," "user-friendly" — measurable to what threshold?
- "should" (ambiguous intent) vs "must" (clear requirement)
- "handle errors gracefully" — what does gracefully mean? Toast? Inline? Modal? Recovery path?
- "improve" without criteria — improve by what measure?

When you spot these, pin them: "The description says 'handle errors appropriately' — appropriate how? Let's define the error states and recovery paths so Clove doesn't have to guess."

**The "tomorrow test":** If you read this ticket tomorrow with no context, can you start working? If the answer is "I'd have a list of questions first," those questions should be answered in the ticket now.

**Completeness check:**
- Who is the user? (Not "the user" — which user?)
- What are they trying to accomplish?
- What does success look like?
- What does failure look like? (Edge cases, error states)
- What's in scope and what's out of scope?

---

## Blast Radius Assessment

For bugs, map blast radius before recommending priority:

1. **Which sites?** All dealer sites, or specific ones? Is the bug in shared code (affects everyone) or site-specific config (affects one)?
2. **Which pages/features?** Just this page, or anything that uses the same component or block?
3. **Which users?** All visitors, logged-in users, admin users, specific roles?
4. **What shares the code path?** If the bug is in a shared component (SlidingPanel, SearchBox, mega menu, carousel), other features using it may be affected.
5. **Regression risk of the fix:** What could the fix break? Heavily shared code paths need extra review scrutiny. Flag for Briar.

---

## Dependency Detection

Before recommending priority or status, check for dependencies:

- **Blocked by** — is this ticket waiting on another ticket, an API change, a design decision, or an external dependency? If blocked, don't put it in Todo — it'll sit there and create false signal.
- **Blocking** — are other tickets waiting on this one? Blockers get a priority bump. Flag: "THR-1234 is waiting on this — that changes the priority calculus."
- **Related** — are there tickets in the same area that should be sequenced together? Batch-related work reduces context-switching for Clove and Winston.
```

##### File 6.5.c — slim `.ai-skills/skills/prism-ticket-start/shared.md`

In PRISM's existing Nora `shared.md`, find the inline Triage Frameworks section (S1-S4 scale, Impact, DoR, INVEST, Splitting, Complexity, Requirements Quality, Blast Radius, Dependency Detection — substantial block). **Replace it with** a single load-on-demand pointer:

```markdown
## Triage Frameworks

Nora reasons from a small set of named frameworks — Severity Classification (S1-S4), Impact Assessment, Definition of Ready, INVEST, Splitting Strategies, Complexity Signals, Requirements Quality (ambiguity red flags + the "tomorrow test"), Blast Radius Assessment, and Dependency Detection. She cites them by name when applying them so downstream personas can audit the reasoning.

The full framework reference lives at [`frameworks.md`](./references/frameworks.md) in this skill folder. Read it before running the priority/severity/DoR/INVEST checks in the startup flow — without it, the assessment defaults to vibes, which is the failure mode this skill exists to prevent.
```

If the existing `shared.md` has an inline ticket-description scaffold, replace it with a one-line link to `.prism/templates/ticket-description.md` matching the way `bug-report.md` is referenced today.

In the Startup section, ensure the load-on-demand instruction reads:

```markdown
## Startup

Run these steps automatically. Before step 4 (the first assessment step), read [`frameworks.md`](./references/frameworks.md) — the S1-S4 scale, impact formula, Definition of Ready checklists, INVEST criteria, splitting strategies, complexity signals, blast radius, and dependency detection all live there.
```

Substitute `thrive-` → `prism-` in any cross-skill references throughout `shared.md`.

**Verification:** `pnpm prism:build` runs clean; `wc -l` on `shared.md` shows a substantial drop; `frameworks.md` is 158 lines; `.prism/templates/ticket-description.md` exists.

**Commit:** `chore: Phase 6.5 — Nora templates move + frameworks.md skill-internal extraction`

---

#### Task 6.6 — Lilac paste-only revert

**File to modify:** `.ai-skills/skills/prism-standup-summary/shared.md`

**Goal:** remove the Slack MCP send branch entirely. The protected `#tractru-dev` channel blocks external MCP connections, so the post path is dead code.

**What to remove from PRISM's existing Lilac `shared.md`:**

1. Any Phase that probes MCP availability (e.g. "Phase 5 — MCP availability probe" or similar)
2. Any Phase that resolves the Slack channel (e.g. "Phase 5.5 — channel resolution")
3. Any sub-phases that handle the delivery path or MCP-send call (e.g. "Phase 7.1: MCP delivery", "Phase 7.4: Slack send")
4. The bot-identity default section (if present)
5. The "confirmation before posting" think-section
6. The MCP wrapper contract section
7. Any anti-patterns or Common Issues that are specific to MCP failures

**What to keep:**

1. Persona, How Lilac Thinks, all Anti-patterns that are not MCP-specific
2. Phase 1 (Context), Phase 2 (Fetch and verify PR activity), Phase 3 (Assign, label, format), Phase 4 (Assemble Yesterday section)
3. Renumber the remaining interactive prompt phase to **Phase 5 — Interactive prompts** (Today, Blockers, Conversational normalization)
4. Renumber the render step to **Phase 6 — Render and deliver**
5. Closing message: always emit a single pasteable block. No MCP send attempt under any condition.

**Closing message replacement:**

```markdown
Present the rendered standup in chat as a plain-text block (no backticks wrapping it — the user will copy and paste into Slack). Close with a one-line: "Paste this into #tractru-dev when ready ✿"
```

**Use Thrive's post-PR `thrive-standup-summary/SKILL.md` body as the canonical reference shape** — the content above starts at Thrive line 8 (after frontmatter) and ends at line 463. The PRISM `shared.md` body should match that shape, with `thrive-` → `prism-` substitutions in any cross-skill references.

The full Thrive content (post-revert, with prefix substitutions ready to apply) is staged at `/tmp/pr1970/.claude_skills_thrive-standup-summary_SKILL.md` for Clove's reference. Apply this transformation:
- Drop the YAML frontmatter (lines 1–6) — that lives in `frontmatter.yml`, not `shared.md`
- Substitute `thrive-` → `prism-` in any skill-folder cross-references
- Write everything from line 8 to line 463 of the Thrive file as the new PRISM `shared.md` body

**Verification:** `pnpm prism:build` runs clean; `grep -i "slack_send_message\|MCP availability\|MCP wrapper" .ai-skills/skills/prism-standup-summary/shared.md` returns nothing; line count drops substantially.

**Commit:** `chore: Phase 6.6 — Lilac paste-only revert (drop Slack MCP send path)`

---

#### Task 6.7 — Cross-skill context-reuse paragraph in all SKILL.md

**Files to modify:** every `.ai-skills/skills/prism-*/shared.md` (12 files total).

**Action:** Insert this exact paragraph as a new section between the existing Intro section and the Startup section in every SKILL.md. The section heading is `## Context reuse from prior skills`.

```markdown
## Context reuse from prior skills

Before reading an architect doc, plan, or rule file from this skill's startup, scan recent tool results in the conversation for an existing complete read of the same file. If a previous skill in this session already read the file in full, use that content instead of re-reading. Re-read only when the previous read was partial (offset/limit), the file may have changed since (a previous skill edited it), or the situation is ambiguous.
```

**Files affected (all 12):**
- `.ai-skills/skills/prism-architect/shared.md`
- `.ai-skills/skills/prism-changelog/shared.md`
- `.ai-skills/skills/prism-code-dev/shared.md`
- `.ai-skills/skills/prism-code-review-pr/shared.md`
- `.ai-skills/skills/prism-code-review-self/shared.md`
- `.ai-skills/skills/prism-debugger/shared.md`
- `.ai-skills/skills/prism-documentation/shared.md`
- `.ai-skills/skills/prism-pixel/shared.md`
- `.ai-skills/skills/prism-qa-test-plan/shared.md`
- `.ai-skills/skills/prism-standup-summary/shared.md`
- `.ai-skills/skills/prism-ticket-start/shared.md`
- `.ai-skills/skills/prism-user-stories/shared.md`

**Insertion point:** after the existing `## Intro — do this first` section's closing line, before the existing `## Startup` (or `## When this skill is invoked`) section heading.

**If the skill already has a `## Context reuse from prior skills` section** (e.g. because Pixel already had one in PRISM canonical), skip that file — don't duplicate.

**Verification:** `grep -l "## Context reuse from prior skills" .ai-skills/skills/prism-*/shared.md | wc -l` returns 12.

**Commit:** `chore: Phase 6.7 — context-reuse section in all SKILL.md`

---

#### Task 6.8 — ADR-0033

**File to create:** `.prism/spec/adrs/0033-rule-loading-tiers.md`

```markdown
---
Number: 0033
Title: Rule Loading Tiers
Status: accepted
Date: 2026-05-04
---

## Context

Every Claude Code conversation in this repo loads a baseline of context before the user types anything. Most of that baseline is the contents of `.prism/rules/*.md`, which Claude Code auto-discovers (via the platform copy at `.claude/rules/`) and treats as project instructions. The team's rules directory has grown over time — the cumulative load runs into the thousands of lines on every session, much of it irrelevant to the conversation at hand.

THR-1826 measured the load and found that domain-specific rules were loading on every conversation regardless of whether the conversation touched the relevant code. A docs-only conversation paid the same React-hook-rules tax as a frontend block edit.

Claude Code's memory mechanism already supports the fix. From the [memory docs § Path-specific rules](https://code.claude.com/docs/en/memory#path-specific-rules): a rule with YAML `paths:` frontmatter only loads when Claude reads files matching those globs. A rule without `paths:` loads unconditionally on every session.

Three approaches were considered for the remaining unscoped rules:

- **(a) Single tier — leave everything unscoped.** The status quo. Rejected: this is the cost we're trying to leave behind.
- **(b) Two tiers — always-loaded versus scoped, no further structure.** Workable, but doesn't capture rules that are referenced only by specific skills. Two tiers conflate "general workflow rules" with "skill-internal references" and miss the optimization on the latter.
- **(c) Three tiers — always-loaded, path-scoped, skill-internal.** Adopted. Maps cleanly onto the rule taxonomy: cross-cutting workflow rules stay unscoped, domain rules use `paths:` frontmatter to load only when relevant, skill-internal references load via the citing skill's reading flow.

## Decision

Rules in `.prism/rules/` fall into three tiers based on when they should be in context. Tier membership is determined by the rule's content, not its filename.

**Tier 1 — Always-loaded.** Rules that apply across every persona's lane and every conversation. No `paths:` frontmatter. Members: workflow rules (`branch-plan.md`, `pr-description.md`, `git-conventions.md`, `verification-commands.md`, `acceptance-criteria.md`), universal code rules (`code-comments.md`, `code-standards.md`).

**Tier 2 — Path-scoped via `paths:` frontmatter.** Rules that only apply when files in a specific area are being read or edited. The frontmatter scopes them to the relevant globs. Members include the writing-voice rule (`writing-voice.md`, scoped to durable spec content), the accessibility rule (`accessibility.md`, scoped to UI files), and the architect-doc-verification rule (`architect-doc-verification.md`, scoped to architect/ADR/dev-doc surfaces).

**Tier 3 — Skill-internal references.** Files referenced by specific skills as part of their workflow but not loaded as project instructions on every session. Pixel's `doctrine.md` and `pattern-vocabulary.md` (introduced in THR-1826 and ported to PRISM) are the canonical examples — the SKILL.md instructs the persona to read them at specific points in its mode-detection flow. These live inside the skill folder under `references/`, not in `.prism/rules/`, so they fall outside the auto-load mechanism entirely.

The membership rule for adding a new rule: **default to Tier 2 if the rule applies to a specific code area; default to Tier 1 only if the rule applies across every persona's lane.** Tier 3 is for skill-specific references the skill author chooses to extract for lazy loading; it's not a destination for general project rules.

## Consequences

- **Positive:** Baseline conversation context drops by a measurable amount on conversations that don't touch the relevant code areas. THR-1826 measured roughly 16,400 tokens shed from baseline on the rules tier alone.
- **Positive:** The mechanism is built into Claude Code. No custom routing layer, no `manifest.json` extension, no maintenance burden beyond keeping `paths:` globs accurate as the codebase evolves.
- **Positive:** New rule authors have a clear default. "Does this apply to a specific code area?" is a question with a yes/no answer that produces the right tier.
- **Negative:** Rules in Tier 2 don't load on conversations that should have triggered them but didn't match the glob. Mitigation: cast `paths:` globs slightly wide rather than tight — false positives are cheaper than false negatives. If reviewers (Briar, Eric) catch a missed-rule case in PR review, the fix is widening the glob, not abandoning the tier model.
- **Negative:** Skill-internal Tier 3 references depend on the SKILL.md correctly instructing the persona to load them. A SKILL.md edit that drops the load instruction silently breaks the lazy-load. Mitigation: each Tier 3 reference is named explicitly in its citing SKILL.md's startup section, so removing the citation is a visible diff in PR review.
- **Neutral:** The tier model is descriptive, not normative. It documents how rules are already loaded today (Tier 1 = unscoped, Tier 2 = `paths:`-scoped) and gives a name to the new Tier 3 pattern.

## References

- [.prism/plans/epic-context-optimization.md](../../plans/epic-context-optimization.md) — implementation plan and history of the migration.
- [Claude Code memory docs § Path-specific rules](https://code.claude.com/docs/en/memory#path-specific-rules) — the underlying mechanism.
- [docs/content/dev/architecture/rule-loading-tiers.md](../../../docs/content/dev/architecture/rule-loading-tiers.md) — paired human-readable dev doc with longer narrative for teammates (to be written by Eli in task 11).
- [ADR-0015](./0015-humane-language-over-mandates.md), [ADR-0016](./0016-explain-the-why.md) — voice principles applied to the rules themselves.
```

**Verification:** file exists, parses as markdown, all template sections (`## Context`, `## Decision`, `## Consequences`, `## References`) present.

**Commit:** `chore: Phase 6.8 — Add ADR-0033 (rule loading tiers)`

---

#### Task 6.9 — AGENTS.md table consolidation

**File to modify:** `AGENTS.md` (root of repo)

**Goal:** replace §0's "User intent / Invoke / Signal phrases" table and §9's "Skill / Owns / Routes to" table with a single 5-column persona table in §0. §9 back-references §0 instead of duplicating ownership data.

**Action 1: Replace the table in §0 (currently a 3-column "User intent / Invoke / Signal phrases" table) with the following 5-column persona table:**

```markdown
| Persona | Skill | Owns | Routes to | Signal phrases |
| ------- | ----- | ---- | --------- | -------------- |
| **Clove** | `prism-code-dev` | Implementation — writes and modifies source code | Winston (architecture), Briar/Eric (review) | "fix this", "implement", "add a feature", "make this work", starts editing files, writes code directly |
| **Winston** | `prism-architect` | Architecture evaluation and planning | Clove (implementation), Sasha (debugging) | "should we", "is this the right approach", "how should I structure", "does this pattern fit", asks about data flow or abstractions |
| **Sasha** | `prism-debugger` | Debugging — diagnoses and records findings | Clove (implementation of fix) | "this is broken", "why is this happening", "I'm getting an error", "it's not working", describes unexpected behavior |
| **Eric** | `prism-code-review-pr` | PR review — comments and feedback, not approval | Clove (fixes), Briar (self-review) | "review pr", "review pr #123", "review #123", "review 123", "review this PR", "review pull request", "look at this PR", "check this PR", "PR review", shares a PR URL or number |
| **Nora** | `prism-ticket-start` | Ticket setup and coordination | Winston (architecture), Clove (implementation) | "start THR-123", "pick up this ticket", "I want to work on", shares a Linear ticket ID |
| **Mira** | `prism-user-stories` | User stories and requirements | Winston (architecture), Pixel (UI/UX) | "write user stories", "what are the requirements", "define the scope" |
| **Briar** | `prism-code-review-self` | Self-review — flags issues, doesn't fix them | Clove (fixes), Eric (PR review) | "review my changes", "is this ready for PR", "self-review", "check my work" |
| **Pixel** | `prism-pixel` | UI/UX design — convention audits, wireframes, state coverage, interaction flows, microcopy | Winston (always for mode 2 specs); Clove (mode 1 inline sketches only — mid-ticket gap-fill) | "what should this look like", "I don't have a mock", "does this layout make sense", "how should I lay this out", "propose a UI", "what should the empty state look like", "this feels off but I don't know why" |
| **Reese** | `prism-qa-test-plan` | QA test plans and bug-fix verification across release, sprint, single-PR, and bug-fix modes | Clove (implementation), Sasha (debugging) | "QA plan for <release / sprint / PR / hotfix>", "QA checklist for PRs #X #Y", "release checklist for <tags>", "verify this bug fix", "retest", "bug fix verification", "QA this fix", "what should QA test", any two version tags, GitHub compare URL, a single PR number / URL / branch name, or a list of PRs |
| **Sage** | `prism-changelog` | Changelog documents | Clove (implementation) | "generate changelog", "release notes", "create changelog", "what changed between <tag1> and <tag2>", any two git tags provided for comparison |
| **Eli** | `prism-documentation` | Feature documentation | Clove (implementation) | "write docs", "document this feature", "generate feature docs", "update the docs", "let's document this" |
```

Add a sentence above the table: `The persona table below is the source of truth for routing, ownership, and handoffs across the skills ecosystem. §9 (Ownership & Handoff) refers back to this table for the in-persona handoff step.`

**Action 2: Replace §9's "Ownership & Handoff" table** with a back-reference to §0:

Find the `| Skill | Owns | Routes to |` table in §9 and remove it. The §9 paragraph should now say something like:

```markdown
> This is the in-persona step — a skill is already active, and a request just drifted past its lane.

The persona table in [§0 (Skill Auto-Routing)](#0-skill-auto-routing) is the source of truth for who owns what and where to route. Each skill owns a specific domain — when a request falls outside that domain, hand it off to the right person rather than stretching scope. The handoff language below is what the active skill says when redirecting.

**Handoff language** — when a request falls outside scope:
```

(Keep the existing handoff language list — that block stays.)

End §9 with: `The persona table in [§0](#0-skill-auto-routing) is the source of truth for who does what. Individual skill files reference that table rather than defining their own boundaries independently.`

**Verification:** `wc -l AGENTS.md` shows reduction (target ~217 lines per Thrive); every persona from the original two tables appears in the merged table.

**Commit:** `chore: Phase 6.9 — Consolidate AGENTS.md persona tables`

---

#### Task 6.10 — Class-sweep lesson in `.prism/lessons.md`

**File to modify:** `.prism/lessons.md`

**Action:** append the following entry at the end of the file (after the existing last entry, with a blank line separator):

```markdown

## 2026-05-04: When fixing a class of drift, sweep the full spec surface — not just the punch list

- **What happened:** THR-1826's first review pass caught Pixel AC and task 5 description referencing `states-canon.md` and `tailwind-tokens.md` (files that were never created — Pixel scope narrowed from 3 → 2 files during implementation). Briar logged 4 review issues, Clove cleaned them up, all marked `fixed`. Hunter then caught a 5th instance: ADR-0033 line 30's Tier 3 paragraph still listed `doctrine.md`, `states-canon.md`, and `tailwind-tokens.md` as the canonical examples. Same phantom-file class. Briar's first pass had focused on the AC and task body; the ADR's terminology fix on line 20 was on the punch list but the file roster on line 30 was a different surface and slipped through. Clove's cleanup faithfully executed the specified line numbers (15, 20, 34) without sweeping for the same drift class elsewhere.
- **Rule:** When a review surfaces a drift pattern (phantom file references, stale identifiers, count drift, terminology drift), the fix pass must include a full-repo grep for the same pattern across all spec surfaces — ADRs, architect docs, dev docs, plan files, skill files. The original review identifies _instances_; the cleanup pass enumerates the _class_ and sweeps it. A `grep -rn "<drifted-name>" .prism/ docs/` before declaring done would have caught ADR-0033 line 30 in the same pass.
- **Process takeaway:** Two how-to-think failures stacked. Briar's adversarial sweep didn't extrapolate from "AC has phantom files" to "where else might this class live?" — she stayed inside the AC/task surface. Clove's cleanup followed the line-numbered punch list as a literal recipe rather than a signal that there's a class to sweep. For Briar: when a review flags drift, the closing sweep must be class-level, not instance-level — grep for the drifted name before signing off. For Clove: when the punch list names specific lines, treat them as the _known_ instances and grep for siblings before committing. The architect-doc-verification rule already says diverged claims in ADRs are at minimum Major because of blast radius into agent context — the verification triage needs to apply not just to "is _this_ doc accurate?" but to "are all docs in _this class_ accurate?"
```

**Verification:** the entry appears at the end of `.prism/lessons.md` with the heading line and three structured bullets.

**Commit:** `chore: Phase 6.10 — Append class-sweep lesson to .prism/lessons.md`

---

#### Final task — Build, verify, push, open PR

After tasks 6.1 through 6.10 are committed:

1. **Run the build:** `pnpm prism:build`
   - This regenerates platform copies (`.claude/skills/`, `.codex/`, `.cursor/`, `.agents/`) from canonical sources.
   - If the build fails, fix the failure before proceeding (likely a path-guard error or a malformed YAML frontmatter).
2. **Run the check:** `pnpm prism:check`
   - This validates the build is up to date and the path guard is clean.
3. **Stage and commit the regenerated files:**
   - `git add .claude/ .codex/ .cursor/ .agents/ .generated/` (whichever exist after build)
   - `git commit -m "chore: Phase 6 build — regenerate platform copies"`
4. **Push the branch:**
   - `git push -u origin hmcgrew/context-optimization-thrive-learnings`
5. **Open the PR:**
   ```bash
   gh pr create --title "Context optimization: port Thrive PR #1970 learnings to PRISM canonical" --body "$(cat <<'EOF'
## Summary

Ports the validated context-optimization changes from TracTru/thrive#1970 into PRISM canonical sources so all consumers inherit the rules tier split, lazy-loaded skill references, manifest cleanup, persona table consolidation, and paired ADR + lesson.

## What did you do?

Ten Phase 6 tasks per [`.prism/plans/epic-context-optimization.md`](../blob/hmcgrew/context-optimization-thrive-learnings/.prism/plans/epic-context-optimization.md):

- **6.1** — `paths:` frontmatter on `.prism/rules/accessibility.md` and `.prism/rules/architect-doc-verification.md`. Skipped the three Thrive-specific rules that don't exist in PRISM canonical (`use-effect-guidelines.md`, `data-layer-boundaries.md`, `plugins-manifest.md`).
- **6.2** — `.prism/architect/manifest.json` cleanup: dropped `**` catch-all, added explicit globs for `.claude/skills/**/SKILL.md`, `.prism/spec/adrs/*.md`, `.prism/plans/*.md`.
- **6.3** — Pixel split: created `.ai-skills/skills/prism-pixel/references/{doctrine.md, pattern-vocabulary.md}`; slimmed `shared.md` with quick-reference + load-on-demand pointers.
- **6.4** — Reese split: created four mode files under `.ai-skills/skills/prism-qa-test-plan/references/`; slimmed `shared.md`.
- **6.5** — Nora restructure: created `.prism/templates/ticket-description.md` + `.ai-skills/skills/prism-ticket-start/references/frameworks.md`; slimmed `shared.md`.
- **6.6** — Lilac paste-only revert: removed Slack MCP send branch from `.ai-skills/skills/prism-standup-summary/shared.md`.
- **6.7** — Cross-skill context-reuse section in all 12 `.ai-skills/skills/prism-*/shared.md`.
- **6.8** — `.prism/spec/adrs/0033-rule-loading-tiers.md` (PRISM-canonical version of Thrive's ADR-0033).
- **6.9** — `AGENTS.md` table consolidation: §0 5-column persona table, §9 back-references §0.
- **6.10** — Class-sweep lesson appended to `.prism/lessons.md`.
- **Build** — `pnpm prism:build` regenerated `.claude/`, `.codex/`, `.cursor/` platform copies. `pnpm prism:check` clean.

## Why did you do it?

Validated end-to-end in TracTru/thrive#1970 — measured ~16,400 tokens shed from baseline on the rules tier alone, plus per-invocation savings on Pixel mode 1 (~168 lines), Reese (~170 lines), Nora (~158 lines lazy), Lilac (~131 lines). Eli's paired dev doc (task 11) is out of scope for this PR — separate ticket.

## Notes

- Phase 6 tasks were committed individually to make review easier.
- Task 11 (paired dev doc at `docs/content/dev/architecture/rule-loading-tiers.md`) is intentionally out of scope — owned by Eli, will follow as a separate PR.
- See [`.prism/plans/epic-context-optimization.md`](../blob/hmcgrew/context-optimization-thrive-learnings/.prism/plans/epic-context-optimization.md) for the full task-by-task content and verification steps.

## Type of Change

- [x] Other (refactor / DX / context-loading hygiene — no observable user-facing behavior change for consumers)

## Pre-submit checklist

- [x] Git conflicts have been resolved
- [x] You have removed all console.logs, unnecessary comments, and/or whitespace
- [x] You've evaluated whether the code you are adding or editing is using best practices
EOF
)"
   ```

**Commit:** `chore: Phase 6 build — regenerate platform copies` (then push + PR)

---

### Eli's tasks (out of scope for this PR)

11. Write paired dev doc at `docs/content/dev/architecture/rule-loading-tiers.md`.
12. Update PRISM onboarding/install guides with the path-scoping default for new rule authors.

---

## Empirical Validation

From Thrive PR #1970's `/context` snapshot (mid-implementation, rules tier split alone):

| Rule | Tokens | Loads on |
| ---- | ------ | -------- |
| `use-effect-guidelines.md` | 6,800 | React/TS files only |
| `accessibility.md` | 4,500 | UI files only |
| `data-layer-boundaries.md` | 3,900 | Data layer / blocks / components only |
| `architect-doc-verification.md` | 1,100 | Architect docs, ADRs, paired dev docs only |
| `plugins-manifest.md` | 83 | The manifest file itself only |
| **Total newly scoped (Thrive)** | **~16,400 tokens** | — |

PRISM canonical only ports two of these five (the others are Thrive-specific). PRISM consumers will see savings proportional to which of the two scoped rules apply to their stack. Skill restructures stack additional per-invocation savings.

---

## Cleanup Items

- **Operational/reference doc verification rule.** Eric flagged `docs/content/dev/references/**` and `docs/content/dev/operations/**` as a candidate `architect-doc-verification.md` glob expansion in Thrive PR #1970. Winston rejected: those surfaces have a different verification shape than architecture docs. Track as a separate PRISM ticket if/when those doc surfaces exist.
- **Promote membership rule to `.prism/architect/spec-editing.md`.** So future rule authors see the path-scoped default on every spec edit, not just when they happen to read ADR-0033. Optional polish.

---

## Acceptance Criteria

### Behavioral

- [ ] Given a fresh Claude Code session in a PRISM-installed repo, When I open a docs-only conversation that touches no UI files, Then `accessibility.md` does not appear in the system prompt.
- [ ] Given a fresh session editing a `.tsx` file, When the session loads, Then `accessibility.md` appears in the system prompt.
- [ ] Given Pixel is invoked with a mode 1 inline-sketch prompt, When Pixel starts, Then no skill-internal references load — `SKILL.md` only.
- [ ] Given Pixel is invoked with a mode 2 saved-spec prompt, When Pixel starts, Then `doctrine.md` and `pattern-vocabulary.md` are read alongside `SKILL.md` and each named file exists in the `references/` folder.
- [ ] Given Reese is invoked with a release-mode prompt, When Reese starts, Then only `release-mode.md` loads alongside `SKILL.md`.
- [ ] Given Lilac is invoked, When Lilac generates the standup, Then the output is a single pasteable Slack-formatted block and no Slack MCP send is attempted.
- [ ] Given a chained-skill conversation (Winston → Clove on the same diff), When Clove starts after Winston, Then Clove's startup reuses Winston's prior reads of the same architect docs instead of re-reading them.

### Non-behavioral

- [ ] `.prism/architect/manifest.json` validates as JSON after task 6.2.
- [ ] `pnpm prism:build` runs clean after the final task.
- [ ] `pnpm prism:check` runs clean after the final task.
- [ ] `.prism/spec/adrs/0033-rule-loading-tiers.md` exists with `Status: accepted` frontmatter.
- [ ] PRISM's AGENTS.md persona table consolidation: every persona is represented in the merged 5-column table.
- [ ] PRISM's `.ai-skills/skills/prism-standup-summary/shared.md` no longer contains references to `slack_send_message`, `MCP availability`, or `MCP wrapper`.
- [ ] PRISM's `.prism/lessons.md` carries the class-sweep entry from 2026-05-04.
- [ ] Every `.ai-skills/skills/prism-*/shared.md` contains a `## Context reuse from prior skills` section.

### AC Adjustments

- 2026-05-04 — Pixel and Reese AC rewritten in behavior-based shape.

### AC Sync Log

| Date | Agent | Action | Plan | Linear |
| ---- | ----- | ------ | ---- | ------ |
| 2026-05-04 | Winston | Initial creation | created | N/A (no Linear ticket) |
| 2026-05-04 | Winston | Phase 6 rewrite with embedded executable content | updated | N/A (no Linear ticket) |
| 2026-05-04 | Clove | Phase 6 implementation complete; non-behavioral AC verified (frontmatter exists, manifest valid, ADR exists, 12 skills carry section, lessons entry present, no MCP send refs); behavioral AC (path-scope load behavior, mode-file load behavior, context reuse) requires a fresh Claude Code session in a consumer repo to verify and is flagged for manual QA | unchanged | N/A (no Linear ticket) |

---

## Review Issues

### ADR number collision — 0033 used twice

- **Severity:** `critical`
- **Status:** `fixed`
- **Fixed in:** 2026-05-05 [hmcgrew/context-optimization-thrive-learnings] — `git mv` renamed `.prism/spec/adrs/0033-rule-loading-tiers.md` and `.claude/spec/adrs/0033-rule-loading-tiers.md` to `0035-rule-loading-tiers.md`. Frontmatter `Number:` updated. References updated in `.prism/architect/documentation.md:120`, `.claude/architect/documentation.md:120`, `.prism/rules/architect-doc-verification.md` § Drift classes covered, `.claude/rules/architect-doc-verification.md` § Drift classes covered, `docs/content/dev/architecture/rule-loading-tiers.md:51` and `:95`, and `.prism/lessons.md:36` (historical reference updated for accuracy).
- **File:** `.prism/spec/adrs/0033-implementation-task-detail.md`, `.prism/spec/adrs/0033-rule-loading-tiers.md` (and the same pair under `.claude/spec/adrs/`)
- **Problem:** Two distinct ADRs share number 0033 — `0033-implementation-task-detail.md` (dated 2026-05-03, merged via PR #3) and `0033-rule-loading-tiers.md` (dated 2026-05-04, added in this PR). `.prism/spec/adrs/README.md:29` explicitly forbids reuse: "never reuse numbers, never renumber to fill gaps." Every bare "ADR-0033" reference (e.g. `.prism/rules/branch-plan.md:208` "See ADR-0033") is now ambiguous, and downstream agents loading the spec see two ADRs with the same identifier.
- **Suggested fix:** Renumber the rule-loading-tiers ADR to `0035-rule-loading-tiers.md` (next unused number — 0034 is taken by the Pixel routing ADR also added in this branch). Touch every "ADR-0033" reference to disambiguate where the link is bare: in canonical, `.prism/rules/branch-plan.md:208`, `.prism/rules/architect-doc-verification.md` § Drift classes covered (the inline link to "ADR-0033" pointing at rule-loading-tiers), `docs/content/dev/architecture/rule-loading-tiers.md:95`, `.prism/architect/documentation.md:120`. Same paths under `.claude/`. After renumbering, run `pnpm prism:build` to refresh platform copies and `pnpm prism:check` to confirm.

### Tier 1 enumeration omits implementation-task-detail.md

- **Severity:** `major`
- **Status:** `fixed`
- **Fixed in:** 2026-05-05 — added `implementation-task-detail.md` to the Tier 1 workflow-rules group in `.prism/spec/adrs/0035-rule-loading-tiers.md:26`, `.claude/spec/adrs/0035-rule-loading-tiers.md:26`, `templates/install/.prism/spec/adrs/0035-rule-loading-tiers.md:26`, and `docs/content/dev/architecture/rule-loading-tiers.md:51`.
- **File:** `.prism/spec/adrs/0033-rule-loading-tiers.md:26` and `docs/content/dev/architecture/rule-loading-tiers.md:51`
- **Problem:** Both ADR and paired dev doc enumerate Tier 1 members as a closed list — `branch-plan.md, pr-description.md, git-conventions.md, verification-commands.md, acceptance-criteria.md, code-comments.md, code-standards.md`. Implementation-task-detail.md, added in this same PR, has no `paths:` frontmatter and is therefore Tier 1 by the membership rule. Architect-doc-verification.md § Drift classes covered explicitly states "[implementation-task-detail.md] is Tier 1 (always-loaded per ADR-0033)" — confirming it belongs in the enumeration. Missing claim per `.prism/rules/architect-doc-verification.md`. Severity Major because the doc is durable agent context; future agents reading the Tier 1 list will treat the new rule as something other than Tier 1.
- **Suggested fix:** Add `implementation-task-detail.md` to the Tier 1 enumeration in both surfaces (the ADR Members line and the dev doc table row). Same Tier 1 list also appears in `.claude/spec/adrs/0033-rule-loading-tiers.md` after rebuild.

### Templates mirror drift — accessibility.md missing paths frontmatter

- **Severity:** `major`
- **Status:** `fixed`
- **Fixed in:** 2026-05-05 — prepended the canonical `paths:` frontmatter block to `templates/install/.prism/rules/accessibility.md`.
- **File:** `templates/install/.prism/rules/accessibility.md:1`
- **Problem:** `.prism/rules/accessibility.md` got `paths:` YAML frontmatter scoping it to UI files in this PR. The templates/install mirror (its own canonical surface per `install-layout.md:47`) did not get the same change, so consumers installing PRISM after this PR ships will get the unscoped (Tier 1) version of accessibility.md and pay the rule-tier cost the optimization was supposed to remove. The optimization target named in the plan goal — "cut baseline conversation context by roughly 40%" — depends on consumers receiving the path-scoped rule.
- **Suggested fix:** Prepend the same `paths:` frontmatter block (description + `**/*.{ts,tsx,jsx,vue,svelte}`) to `templates/install/.prism/rules/accessibility.md`. Per the Phase 6 task 6.1 instruction format.

### Templates mirror drift — architect-doc-verification.md retains Thrive specifics

- **Severity:** `major`
- **Status:** `fixed`
- **Fixed in:** 2026-05-05 — replaced `templates/install/.prism/rules/architect-doc-verification.md` with the canonical body (frontmatter, Drift classes covered section, ADR-0035 link). The canonical version is already PRISM-neutral so no further generalization needed.
- **File:** `templates/install/.prism/rules/architect-doc-verification.md:5`
- **Problem:** The file was modified in this PR (in the merge from main) but is incomplete vs canonical: missing `paths:` frontmatter, missing `## Drift classes covered` section, and retains a stale Thrive-specific reference — "THR-1775 shipped with five accuracy gaps (composer-install asymmetry rationale, missing `composer test:install` prereq, undocumented `THRIVE_TOKEN` dual purpose, undocumented `release/v*` skip, muddled HOST_UID phrasing) because PR #1925 received glance review." The history line at 2026-05-05 noted this drift but flagged it as out of scope for the merge. Since this PR ships the canonical→consumer path, the inconsistency lands in front of every PRISM consumer who reads the rule.
- **Suggested fix:** Replace `templates/install/.prism/rules/architect-doc-verification.md` body with the canonical `.prism/rules/architect-doc-verification.md` body, generalizing or stripping the THR-1775 incident reference for consumer audiences (the canonical's "an ADR's example list naming files that were never created" framing is already PRISM-neutral and works).

### Templates mirror missing 0033-rule-loading-tiers.md

- **Severity:** `major`
- **Status:** `fixed`
- **Fixed in:** 2026-05-05 — created `templates/install/.prism/spec/adrs/0035-rule-loading-tiers.md` (renumbered per fix #1). Generalized THR-1826 references to consumer-neutral phrasing ("An initial audit", "Pilot adoption shed roughly 16,000 tokens"). Dropped the dogfood plan reference and the paired dev-doc reference since `templates/install/` ships neither.
- **File:** `templates/install/.prism/spec/adrs/` (file absent)
- **Problem:** The new ADR added in this PR exists in `.prism/spec/adrs/` and `.claude/spec/adrs/` but not in `templates/install/.prism/spec/adrs/`. `templates/install/.prism/rules/branch-plan.md:208` and `templates/install/.prism/rules/architect-doc-verification.md` reference "ADR-0033" — in a consumer install, that resolves only to the implementation-task-detail.md ADR since the rule-loading-tiers ADR isn't shipped. Consumers won't have access to the decision rationale for the tier system that scopes the rules they're consuming.
- **Suggested fix:** Copy `0033-rule-loading-tiers.md` (or its renumbered version after fix #1) into `templates/install/.prism/spec/adrs/`. If it lands as `0035-rule-loading-tiers.md` per fix #1, ship the renumbered filename.

### Bare "ADR-0033" references after collision

- **Severity:** `major`
- **Status:** `fixed`
- **Fixed in:** 2026-05-05 — resolved as a cascade of fix #1. After the renumber, every remaining `ADR-0033` reference (in `.prism/rules/branch-plan.md:208`, `.claude/rules/branch-plan.md:208`, `templates/install/.prism/rules/branch-plan.md:208`, `.prism/rules/implementation-task-detail.md:5` and platform copies, `.prism/plans/prism-detailed-plans.md:15`, `.ai-skills/skills/prism-architect/shared.md:249`, `.claude/skills/prism-architect/SKILL.md:260`) unambiguously points at the implementation-task-detail ADR — the only remaining ADR-0033. Verified with `grep -rn "ADR-0033"` post-renumber.
- **File:** `.prism/rules/branch-plan.md:208`, `templates/install/.prism/rules/branch-plan.md:208`, `.prism/lessons.md:36`, `.prism/plans/prism-detailed-plans.md:15` and surrounding lines
- **Problem:** These references read "See ADR-0033" or "ADR-0033 line 30" without a slug or link, leaving the reader to guess which 0033 is meant. Same problem persists in the synced platform copies (`.claude/rules/branch-plan.md:208`, etc.).
- **Suggested fix:** This issue dissolves after fix #1 (renumber the second 0033). The bare references — once one of the two ADRs has a different number — become unambiguous because only one ADR-0033 exists. Verify by re-grepping `ADR-0033|adrs/0033` after the renumber pass and confirming each reference points at the intended ADR.

### ADR README index out of date

- **Severity:** `minor`
- **Status:** `fixed`
- **Fixed in:** 2026-05-05 [hmcgrew/context-optimization-thrive-learnings] — Eli added Index rows for 0029, 0030, 0031, 0032, 0033, 0034, and 0035 in `.prism/spec/adrs/README.md` and `templates/install/.prism/spec/adrs/README.md`. Each row carries title, status, and a one-line summary written from the ADR's Decision section. `pnpm prism:build` resynced the three platform copies; `pnpm prism:check` clean. Note: the existing 0021/0025/0026 rows reference files that don't exist in PRISM canonical (carryover from the Thrive README port) — flagged for a separate cleanup, out of scope for this PR.
- **File:** `.prism/spec/adrs/README.md:79-86` (Index section)
- **Problem:** Index lists 0021–0026 only; the canonical now has 0027 through 0034 (with 0033 used twice — see fix #1). The Index header acknowledges "older ADRs (0001–0020) are discoverable by listing the directory" but doesn't surface 0027+. Minor because it's a navigation aid, not a load-bearing claim — but the ADRs landing in this PR (0033, 0034) earn easy-lookup placement.
- **Suggested fix:** Add rows for 0027 through 0034 with their titles and one-line summaries. Skip in this PR if scope creep is a concern; track as cleanup.

---

## PR Readiness

- [x] No critical or major issues — all 7 Briar issues fixed (1 critical, 5 major, 1 minor)
- [x] Types correct — N/A; no TypeScript code in diff except `scripts/ai-skills/build.ts` which already passed prism-test
- [x] No stray console.logs or debug artifacts
- [x] Tests written for new logic and edge cases — `pnpm prism:test` runs 26 tests, all pass
- [x] All debugged issues resolved (no `open` entries)
- [ ] Build passes — needs re-run after Briar fixes (renumber + templates/install changes)
- [ ] PR description up to date — needs sync after build re-verification
- [ ] Lasting decisions promoted to architect context — defer until PR description is synced

**Last updated:** 2026-05-05

---

## History

- 2026-05-04 [main]: Plan drafted on desktop — context optimization epic. Goal is roughly 40% baseline context reduction and 30–50% reduction on heavy-skill invocation cost.
- 2026-05-04 [hmcgrew/context-optimization-thrive-learnings]: Plan moved into PRISM canonical at `.prism/plans/epic-context-optimization.md` and updated from Thrive PR [#1970](https://github.com/TracTru/thrive/pull/1970). Phases 0–5 marked complete in Thrive; Phase 6 (port to PRISM canonical) defined.
- 2026-05-04 [hmcgrew/context-optimization-thrive-learnings]: Phase 6 rewritten with embedded executable content. Each task now carries the exact file content (full text for new files, specific patches for modifications), file paths, substitution rules (`thrive-` → `prism-`, `references/` subdirectory adaptation), and per-task verification + commit instructions. Three PRISM-specific decisions added: skill-internal references live under `.ai-skills/skills/<id>/references/`; missing rules are intentionally Thrive-specific; PRISM accessibility uses universal `**/*.{ts,tsx,jsx,vue,svelte}` glob. Scope reduction noted on task 6.1 (5 rules → 2 in PRISM).
- 2026-05-04 [hmcgrew/context-optimization-thrive-learnings]: Phase 6 implementation by Clove. All 10 tasks complete: paths frontmatter on accessibility.md + architect-doc-verification.md (rephrased ADR-0033 line to satisfy path-guard); manifest catch-all dropped; Pixel/Reese/Nora split into shared.md + references/ files; Lilac paste-only revert (459 lines, all `slack_send_message`/`MCP availability`/`MCP wrapper` refs removed); context-reuse section added to all 12 skills; ADR-0033 created; AGENTS.md tables consolidated (217 lines); class-sweep lesson appended. Build script bug fixed: `optedIn.claude` branch in scripts/ai-skills/build.ts was missing the `syncOptionalSkillPayloads` call that Codex and Cursor branches both have, so `references/` payloads weren't copying to `.claude/skills/<id>/references/` — added the call so AC #4 (Pixel doctrine.md/pattern-vocabulary.md exist in references/) actually holds at the platform layer. `pnpm prism:build` and `pnpm prism:check` both clean; 26 tests pass.
- 2026-05-05 [hmcgrew/context-optimization-thrive-learnings]: Eli task 11 complete — wrote `docs/content/dev/architecture/rule-loading-tiers.md` (paired dev doc for ADR-0033). Followed the four-beat arc per `.prism/architect/architecture-doc-shape.md`: anchor sentence, then Need / Technical flows / Natural fit (`paths:` frontmatter + `references/` folder pattern) / Platform limits (the convention layer that decides which rule belongs in which tier). Added a Cross-Reference Map row in `.prism/architect/documentation.md` linking ADR-0033 to the new doc. Eli task 12 (update PRISM onboarding/install guides with the path-scoping default) deferred — `docs/content/dev/getting-started/` doesn't exist yet, so there's no onboarding doc to update; flagged for when the onboarding flow lands (Phase 2 per `.prism/rules/code-standards.md` § Dedicated Standards).
- 2026-05-05 [hmcgrew/context-optimization-thrive-learnings]: Merged `origin/main` into branch to clear PR #4 conflicts. Three conflicts resolved in favor of HEAD: (1) AGENTS.md §9 keeps the cite-back to §0 instead of duplicating the persona table — §0's preamble explicitly names §9 as the section that refers back; (2)+(3) `.prism/rules/architect-doc-verification.md` and `.claude/rules/architect-doc-verification.md` § Severity keep the "Citation-vs-cited drift" wording, which matches the "Drift classes covered" subsection HEAD added above. `templates/install/.prism/rules/architect-doc-verification.md` auto-merged to main's "Re-enumeration drift" wording — pre-existing structural asymmetry between install templates (sparser, no Drift classes section) and canonical `.prism/rules/`. Worth a follow-up to bring install templates in line, but out of scope for the merge.
- 2026-05-05 [hmcgrew/context-optimization-thrive-learnings]: Briar self-review run on PR #4 — found 1 critical (ADR number collision: 0033 used twice) and 5 major issues (Tier 1 enumeration omission, three templates/install drift cases, bare "ADR-0033" references) plus 1 minor (README index stale). Findings logged under `## Review Issues`. PR Readiness shows 6 open issues blocking. Build clean (`pnpm prism:build` + `pnpm prism:check` pass; 26 tests). Class-sweep lesson at `.prism/lessons.md:36` would have caught the ADR collision via `ls .prism/spec/adrs/ | sort | uniq -c -w4` — the same author wrote the rule and shipped its violation in the same PR.
- 2026-05-05 [hmcgrew/context-optimization-thrive-learnings]: Eli resolved Briar's deferred minor issue #7 (ADR README index out of date) — added Index rows for 0029, 0030, 0031, 0032, 0033 (implementation-task-detail), 0034 (pixel-routing), and 0035 (rule-loading-tiers) in `.prism/spec/adrs/README.md` and `templates/install/.prism/spec/adrs/README.md`. Each row written with a one-line summary derived from the ADR's Decision section. Build clean (3 platform README copies resynced via `pnpm prism:build`; `pnpm prism:check` confirms in sync). Flagged a separate pre-existing issue: the README's existing 0021/0025/0026 rows reference ADR files that don't exist in PRISM canonical — likely carryover from the original Thrive README port. Out of scope for this PR but worth a dedicated cleanup.
- 2026-05-05 [hmcgrew/context-optimization-thrive-learnings]: Clove resolved Briar's 6 actionable issues. (1) Critical — renumbered `0033-rule-loading-tiers.md` → `0035-rule-loading-tiers.md` in `.prism/spec/adrs/` and `.claude/spec/adrs/` via `git mv`; updated frontmatter `Number:`; updated five reference sites (`.prism/architect/documentation.md:120`, `.claude/architect/documentation.md:120`, `.prism/rules/architect-doc-verification.md:29`, `.claude/rules/architect-doc-verification.md:29`, `docs/content/dev/architecture/rule-loading-tiers.md:95`); also updated the historical pointer at `.prism/lessons.md:36` for accuracy. (2) Major — added `implementation-task-detail.md` to the Tier 1 workflow-rules enumeration in three ADR copies and the dev doc table row. (3) Major — prepended canonical `paths:` frontmatter to `templates/install/.prism/rules/accessibility.md`. (4) Major — replaced `templates/install/.prism/rules/architect-doc-verification.md` with the canonical body (which is already PRISM-neutral, no THR-1775 references to strip). (5) Major — created `templates/install/.prism/spec/adrs/0035-rule-loading-tiers.md`, generalizing THR-1826 references to consumer-neutral phrasing and dropping `.prism/plans/...` and `docs/content/dev/...` references that templates/install does not ship. (6) Major — bare "ADR-0033" references resolved via cascade from fix #1; verified with `grep -rn "ADR-0033"` that all remaining bare references unambiguously point at the implementation-task-detail ADR. Minor #7 (ADR README index) deferred per Briar's own suggestion — separate cleanup ticket.
