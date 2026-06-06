# Plan: epic-prism-thrive-backport-wave-2

> Closed: 2026-06-05

## Ticket

PRISM Phase 1.5f — Thrive backports, second wave (no Linear ticket; phase work). Follows [`epic-prism-thrive-backport.md`](./epic-prism-thrive-backport.md) which absorbed the first wave (Thrive PRs through ~#2024).

## Goal

Absorb Thrive PRs #2025, #2026, and #2027 — direct-write tool outputs (eliminate `.generated/` staging), tool-agnostic Pixel mocks, Decisions verdict pattern, draft PRs by default — across four ordered sub-PRs, so PRISM stays in sync with the Thrive dogfood as it diverges.

---

## History

- 2026-05-23 [main]: Plan created. Winston scoped the second wave of Thrive backports across four sub-PRs: Pixel mocks relocation, Decisions verdict pattern, draft PRs by default, then `.generated/` collapse + full Thrive parity (commit `.cursor/skills/` + compatibility doc + ADR-0044). Order chosen to land smaller content-only edits first and gate the load-bearing install-contract change (1.5f.4) on the others merging clean.
- 2026-05-23 [hmcgrew/prism-1.5f.1-pixel-mocks-relocation]: PR-1.5f.1 implementation complete — all 9 tasks done. Pixel mocks references rewritten `.claude/design/mocks/` → `.prism/design/mocks/` across 9 canonical sources (Pixel skill source/frontmatter, `.prism/SPEC.md`, spec-editing architect doc, implementation-task-detail rule, ADR-0033) plus their templates mirrors; `pnpm prism:build` regenerated `.claude/` mirrors. Drift fix in `scripts/ai-skills/atlas-dogfood.test.ts:56` (`linearWorkspace` → `linearTeam`, pre-existing on main, caught by `prism:check-types`); all verification green.
- 2026-05-23 [hmcgrew/prism-1.5f.2-decisions-verdict-pattern]: PR-1.5f.2 implementation complete — all 6 tasks done plus Eli task #6 absorbed (one-line edit to skills-ecosystem Winston row, faster than handoff). Added `## Decision verdict gate` subsection to `.prism/rules/branch-plan.md` + templates mirror; appended verdict-gate reflex bullets to Winston (close-side), Briar, and Eric (surface-as-Minor side); updated skills-ecosystem Winston row with verdict-gate reference. `pnpm prism:build` regenerated `.claude/` mirrors for the three personas; all verification green.
- 2026-05-23 [hmcgrew/prism-1.5f.3-draft-prs-by-default]: PR-1.5f.3 implementation complete — Clove tasks 1-3 + 5-6 done, task 4 was a no-op (Clove source references shipping-flow.md, doesn't inline `gh pr create`), Eli task #7 absorbed (5 one-line row updates in skills-ecosystem, no other surface than skills-ecosystem affected so handoff would have been pure overhead). Added `--draft` to `gh pr create` at `shipping-flow.md:57` + templates mirror, added new `## Draft-by-default` subsection with per-PR-type flip table, added state-#3-only `gh pr ready` to Eric's batch D label pipeline, updated skills-ecosystem Clove/Eric/Sage/Eli/Reese rows. All verification green; this PR opens non-draft (changes take effect for future PRs).
- 2026-05-23 [hmcgrew/prism-1.5f.4-generated-collapse]: PR-1.5f.4 implementation complete — all 15 tasks done. Flipped paths.json + build.ts JSDoc + README to direct-write `.cursor/skills/` and `.codex/codex-config.toml`; surgical gitignore commits the full `.cursor/` and `.codex/` content trees (223 new tracked files) while keeping `.agents/`, `.codex/codex-config.toml`, and tool worktrees ignored; deleted `.generated/`; authored ADR-0044 (dual-written canonical + templates), `.ai-skills/docs/compatibility.md`, paired `docs/content/dev/ai-skills/compatibility.md`, narrative `docs/content/dev/ai-skills/syncing.md`; added `.ai-skills/docs/**` manifest route; updated install-layout.md with Direct-write tool outputs section; added verdict sub-bullets to all 5 epic Decisions per the verdict-gate rule. Drift fixes: stale `.generated/cursor-skills/` paths in `literal-allowlist.json` rewritten to `.cursor/skills/`. All verification green; plan now complete and ready for Winston to close.
- 2026-06-05 [hmcgrew/prism-audit-2026-06-05]: Plan closed per the 2026-06-05 audit close-out. Verdict gate verified complete (all 5 Decisions carried promotion verdicts since ship); `> Closed:` marker added. See `.prism/plans/audit-2026-06-05-closeout.md`.

---

## Decisions

- **Four sub-PRs in fixed order: 1.5f.1 → (1.5f.2 + 1.5f.3 parallel-safe) → 1.5f.4.**
  - **Root cause:** The four sub-PRs touch disjoint surfaces, but 1.5f.4 changes the consumer install contract for downstream PRISM teams and ships an ADR — that's higher review surface area than the other three combined. Landing the smaller cleanups first means 1.5f.4 reviews against a tidy baseline.
  - **Alternatives considered:** (a) Single mega-PR mirroring Thrive's PR #2025 — too large, mixes install-contract change with unrelated cleanups, review attention drowns. (b) Strict sequential — slower; 1.5f.2 and 1.5f.3 have no file overlap and can land in parallel. (c) Lead with 1.5f.4 — front-loads the riskiest change before the smaller cleanups have validated the build.
  - **Chosen approach:** Four cohesive sub-PRs grouped by concern. 1.5f.1 (Pixel mocks) is the smallest content-only edit and unblocks nothing; ship it first to demonstrate the build holds. 1.5f.2 and 1.5f.3 are parallel-safe content edits to different rule/reference files. 1.5f.4 lands last with its ADR and consumer-facing compatibility doc.
  - **Implementation guidance:** Track each sub-PR as a separate task group below. Branch names follow `hmcgrew/prism-1.5f.N-<slug>`. Each sub-PR closes its own PR before the next opens unless explicitly parallel-safe.
  - → no promotion needed (process scoping specific to Phase 1.5f; no architectural pattern to promote)
  - **Zoe verdict (2026-06-05):** `archive-candidate` — Phase 1.5f shipped 2026-05-23 (History: complete, 'ready for Winston to close'); ADR-0044 + compatibility.md carry the durable record; plan never closed.

- **New mocks directory at `.prism/design/mocks/`, not `.ai-spec/design/mocks/`.**
  - **Root cause:** Thrive chose `.ai-spec/` because their content-root namespace is `.ai-spec/`. PRISM's content root is `.prism/` (per ADR-0031 bifurcated install layout + ADR-0039 `.ai-*` namespace). Mocks belong inside the content namespace, not parallel to it.
  - **Alternatives considered:** (a) Match Thrive verbatim with `.ai-spec/design/mocks/` — diverges from PRISM's `.prism/` namespace; future Pixel mocks would be the only `.ai-spec/`-prefixed content in the repo. (b) Keep `.claude/design/mocks/` — the bug being fixed (tool-agnostic content lives in a tool namespace). (c) `.prism/design/mocks/` — composes with the existing namespace; matches the spirit of Thrive's fix.
  - **Chosen approach:** `.prism/design/mocks/`. Tool-agnostic per Thrive's intent; namespace-consistent per PRISM's existing structure.
  - **Implementation guidance:** All `.claude/design/mocks/` references rewrite to `.prism/design/mocks/`. The Phase 1.5c-style template surface mirror is at `templates/install/.prism/design/` — but since no mocks exist in PRISM yet, only the *references to the path* need updating, not actual mock files. The directory itself gets created on first Pixel mode-2 invocation.
  - → promoted to `.prism/SPEC.md` + `.prism/architect/spec-editing.md` (via PR-1.5f.1 path-rename edits to canonical surfaces)
  - **Zoe verdict (2026-06-05):** `archive-candidate` — Phase 1.5f shipped 2026-05-23 (History: complete, 'ready for Winston to close'); ADR-0044 + compatibility.md carry the durable record; plan never closed.

- **One ADR (ADR-0044) covers 1.5f.4 only.** The other three sub-PRs are rule/reference/template edits that don't pass the immediate-decision-promotion three-gate test.
  - **Root cause:** ADR-0044 (Direct-write tool outputs; commit `.cursor/skills/`) is hard-to-reverse (changes consumer install contract), surprising (reverses PRISM's current "Cursor/Codex output is generated, ignore it" model), and has a real alternative (relocate-only, gitignored). The verdict pattern in 1.5f.2 is hard-to-reverse but is process discipline, not architecture — belongs in `branch-plan.md` rule. Draft PRs in 1.5f.3 is a behavioral change but already industry-standard, not surprising. Pixel mocks in 1.5f.1 is a bug fix, not a decision.
  - **Alternatives considered:** Separate ADR per sub-PR (3–4 ADRs total) — overkill; most of these are codified by the rule/reference edits themselves.
  - **Chosen approach:** Single ADR for the load-bearing install-contract decision. Rule and reference edits codify the smaller decisions in place.
  - **Implementation guidance:** ADR-0044 is dual-written canonical + templates per the ADR-0029/0030 pattern. ADR-0038 paired-dev-doc gate fires because ADR-0044 introduces a new architect-doc topic (compatibility) — Eli pairs `docs/content/dev/ai-skills/compatibility.md` and `docs/content/dev/ai-skills/syncing.md` against the architect surface in 1.5f.4.
  - → no promotion needed (meta-decision about ADR scope within this phase; not a standing rule)
  - **Zoe verdict (2026-06-05):** `archive-candidate` — Phase 1.5f shipped 2026-05-23 (History: complete, 'ready for Winston to close'); ADR-0044 + compatibility.md carry the durable record; plan never closed.

- **`.cursor/skills/` becomes committed surface; `.codex/codex-config.toml` stays gitignored.** Asymmetric on purpose.
  - **Root cause:** `.cursor/skills/` content is consumed by Cursor's skill picker via `git pull` — committing it removes the install step for Cursor users. `.codex/codex-config.toml` is a per-user file (containing personality, projects, marketplaces); committing it would clobber consumer customization. Same logic as Thrive's PR #2025 install-script-scope rule.
  - **Alternatives considered:** (a) Commit both — clobbers consumer codex-config customization. (b) Ignore both — loses the Cursor-user-gets-skills-on-git-pull benefit; defeats the purpose of removing `.generated/`. (c) Commit `.cursor/skills/`, ignore `.codex/codex-config.toml` — matches Thrive's per-tool decision exactly.
  - **Chosen approach:** Path (c). The `.ai-skills/docs/compatibility.md § Install-Script Scope` section codifies the rule for future tool integrations: in-repo destinations get sync; outside-repo destinations get install scripts.
  - **Implementation guidance:** Gitignore in 1.5f.4 replaces blanket `/.cursor/` with surgical rules — `.cursor/skills/` trackable, `.cursor/worktrees/` and `.cursor/plans/` (anything not generated) ignored.
  - → promoted to ADR-0044 + `.ai-skills/docs/compatibility.md` + `.prism/architect/install-layout.md § Direct-write tool outputs`
  - **Zoe verdict (2026-06-05):** `archive-candidate` — Phase 1.5f shipped 2026-05-23 (History: complete, 'ready for Winston to close'); ADR-0044 + compatibility.md carry the durable record; plan never closed.

- **Persona ownership within sub-PRs.** Clove owns implementation tasks (file edits, new file authoring, build verification). Eli owns documentation tasks (ADR Context/Decision/Consequences prose, paired dev doc authoring, compatibility-doc narrative).
  - **Implementation guidance:** Within each sub-PR's heading, tasks split into `#### Clove` and `#### Eli` subheadings. Cross-persona dependencies noted inline.
  - → no promotion needed (codified in ADR-0018 persona lane ownership)
  - **Zoe verdict (2026-06-05):** `archive-candidate` — Phase 1.5f shipped 2026-05-23 (History: complete, 'ready for Winston to close'); ADR-0044 + compatibility.md carry the durable record; plan never closed.

---

## Implementation Tasks

### PR-1.5f.1 — Pixel mocks relocation

**Branch:** `hmcgrew/prism-1.5f.1-pixel-mocks-relocation`
**Depends on:** none — foundational sub-PR for Phase 1.5f.
**Blocks:** none (independent of 1.5f.2 and 1.5f.3; precedes 1.5f.4 only to validate the build holds before the larger change).
**Parallel-safe with:** none (small, simple, ship first).
**Verification:** `pnpm prism:build && pnpm prism:check && pnpm prism:check-types && pnpm prism:test` after each task group.

Backport target: Track B of Thrive PR #2025 (Pixel mocks `.claude/design/mocks/` → `.ai-spec/design/mocks/`). PRISM adapts: `.claude/design/mocks/` → `.prism/design/mocks/` per Decisions § New mocks directory.

#### Clove

1. **Rewrite Pixel skill canonical source.** In `.ai-skills/skills/prism-pixel/shared.md`, replace every occurrence of `.claude/design/mocks/` with `.prism/design/mocks/`. References at lines 337, 342, 417, 515, 525, 531, 572, 616, 658 (per pre-plan grep — re-verify line numbers at task execution since file may shift). Use Edit with `replace_all: true` on the literal string `.claude/design/mocks/` for an atomic single-file rewrite. No structural changes — path substitution only.

2. **Rewrite Pixel skill frontmatter.** In `.ai-skills/skills/prism-pixel/frontmatter.yml`, replace the single reference to `.claude/design/mocks/` (line 3, inside the description string) with `.prism/design/mocks/`. Verify the resulting YAML still parses (`pnpm prism:check-types` covers this transitively).

3. **Rewrite PRISM SPEC.** Edit `.prism/SPEC.md:103` — change the bullet from `**\`.claude/design/mocks/\`** — per-ticket Pixel deliverables...` to `**\`.prism/design/mocks/\`** — per-ticket Pixel deliverables...`. Mirror identical edit to `templates/install/.prism/SPEC.md.tmpl` (which is the source `pnpm prism:build` regenerates `.claude/SPEC.md` from — verify by reading both files to confirm the tmpl is upstream of the rendered `.claude/SPEC.md`). If the templates file uses tokenization for the path, leave it unchanged and verify the rendered `.claude/SPEC.md` still says `.prism/`.

4. **Rewrite spec-editing architect doc.** Edit `.prism/architect/spec-editing.md:34` — change `Out of scope: \`.prism/lessons.md\`, \`.claude/docs/\`, \`.claude/design/mocks/\`` to `Out of scope: \`.prism/lessons.md\`, \`.claude/docs/\`, \`.prism/design/mocks/\``. Mirror to `templates/install/.prism/architect/spec-editing.md`.

5. **Rewrite implementation-task-detail rule.** Edit `.prism/rules/implementation-task-detail.md:9` — replace `\`.claude/design/mocks/<slug>.md\`` with `\`.prism/design/mocks/<slug>.md\``. Edit line 18 — replace `\`.claude/design/mocks/<slug>.md\`` with `\`.prism/design/mocks/<slug>.md\`` (same literal, different line). Mirror to `templates/install/.prism/rules/implementation-task-detail.md`.

6. **Rewrite ADR-0033.** Edit `.prism/spec/adrs/0033-implementation-task-detail.md` — replace every `.claude/design/mocks/` with `.prism/design/mocks/`. Mirror to `templates/install/.prism/spec/adrs/0033-implementation-task-detail.md`. Verify with `diff` that canonical and templates copies are byte-identical except for plan-file references stripped from the templates copy.

7. **Regenerate platform mirrors.** Run `pnpm prism:build`. Verify the four `.claude/` mirror files now reflect `.prism/design/mocks/`:
   - `.claude/SPEC.md`
   - `.claude/spec/adrs/0033-implementation-task-detail.md`
   - `.claude/architect/spec-editing.md`
   - `.claude/rules/implementation-task-detail.md`
   - `.claude/skills/prism-pixel/SKILL.md`
   Verify with `grep -rn '\.claude/design/mocks' .claude/ .prism/` — output should be empty.

8. **Verify clean.** Run `pnpm prism:build && pnpm prism:check && pnpm prism:check-types && pnpm prism:test`. The check command catches any drift between canonical and generated mirrors. No-mocks-yet means no actual mock files to migrate; the rename is reference-only.

#### Eli

9. **Update `.prism/architect/skills-ecosystem.md` Pixel persona section.** Locate the existing Pixel persona description (likely under a `## Pixel` heading or in a table row). Append/edit any path reference to `.claude/design/mocks/` → `.prism/design/mocks/`. If no path reference exists in the Pixel section, this task is a no-op — record in `## History`. Mirror to `templates/install/.prism/architect/skills-ecosystem.md`.

---

### PR-1.5f.2 — Decisions verdict pattern

**Branch:** `hmcgrew/prism-1.5f.2-decisions-verdict-pattern`
**Depends on:** none.
**Blocks:** none within Phase 1.5f.
**Parallel-safe with:** PR-1.5f.3 (different file surfaces — branch-plan.md + Winston source vs shipping-flow.md + Clove/Eric sources; no merge conflict risk).
**Verification:** `pnpm prism:build && pnpm prism:check && pnpm prism:check-types && pnpm prism:test` after each task.

Backport target: Thrive PR #2026 (REV-4 hygiene — every `## Decisions` entry carries an explicit `→ promoted to X` or `→ no promotion needed (reason)` verdict before plan close).

#### Clove

1. **Add verdict requirement to `branch-plan.md § Before Closing`.** Edit `.prism/rules/branch-plan.md`. Locate the existing `# Before Closing` section (currently around line 153–181 — re-verify at execution since edits to this file shift line numbers). After the existing four-step closing procedure but before the `# Plan File Template` heading, insert a new subsection `## Decision verdict gate`. Full content to insert:

   ```markdown
   ## Decision verdict gate

   Before promoting decisions and deleting the plan (steps 1–2 above), every entry in `## Decisions` must carry an explicit verdict sub-bullet. The verdict closes the loop on whether the decision was promoted to a durable surface or intentionally stays local.

   **Verdict format:** append as the last sub-bullet on each Decision entry:

   - `→ promoted to .prism/architect/<file>.md` — decision graduated to a durable architect doc.
   - `→ promoted to ADR-NNNN` — decision graduated to its own ADR.
   - `→ no promotion needed (<one-line reason>)` — decision is ticket-tactical, codified elsewhere, or otherwise doesn't generalize. Reason is required, not optional.

   **Why:** Without an explicit verdict, decisions get promoted mentally, the plan deletes, and the architect surface silently misses the update. The verdict forces the promotion call before close — and makes the call auditable in PR review.

   **How to apply:** Winston runs this gate during plan close. Briar surfaces missing verdicts as a Minor in self-review when a plan is being closed. Eric surfaces missing verdicts during PR review when the PR is the close-out PR for a ticket.
   ```

   Mirror byte-identically to `templates/install/.prism/rules/branch-plan.md`.

2. **Add verdict-gate reflex bullet to Winston's canonical source.** Edit `.ai-skills/skills/prism-architect/shared.md`. Locate the existing reflex-bullets section (search for `**Reflex bullets:**` or `## Lessons Check`). Append a new bullet: `- During plan close, every \`## Decisions\` entry must carry a \`→ promoted to X\` or \`→ no promotion needed (reason)\` verdict sub-bullet — see [.prism/rules/branch-plan.md § Decision verdict gate](../../../.prism/rules/branch-plan.md#decision-verdict-gate).` No structural changes; bullet-only addition.

3. **Add verdict-gate surfacing to Briar and Eric.** Edit `.ai-skills/skills/prism-code-review-self/shared.md` and `.ai-skills/skills/prism-code-review-pr/shared.md` reflex-bullets sections. For each, append: `- During plan close-out PRs, flag any \`## Decisions\` entry missing a verdict sub-bullet as Minor — see [.prism/rules/branch-plan.md § Decision verdict gate](../../../.prism/rules/branch-plan.md#decision-verdict-gate).`

4. **Regenerate platform mirrors.** Run `pnpm prism:build`. Verify the three regenerated `.claude/skills/<id>/SKILL.md` outputs (Winston, Briar, Eric) reflect the new reflex bullets.

5. **Verify clean.** Run `pnpm prism:build && pnpm prism:check && pnpm prism:check-types && pnpm prism:test`.

#### Eli

6. **Note pattern in skills-ecosystem architect doc.** Edit `.prism/architect/skills-ecosystem.md`. Under the existing Winston section, add a one-line reference to the verdict gate (e.g. "Winston enforces the Decision verdict gate at plan close per `branch-plan.md § Decision verdict gate`"). Mirror to `templates/install/.prism/architect/skills-ecosystem.md`.

---

### PR-1.5f.3 — Draft PRs by default

**Branch:** `hmcgrew/prism-1.5f.3-draft-prs-by-default`
**Depends on:** none.
**Blocks:** none within Phase 1.5f.
**Parallel-safe with:** PR-1.5f.2.
**Verification:** `pnpm prism:build && pnpm prism:check && pnpm prism:check-types && pnpm prism:test` after each task.

Backport target: Thrive PR #2027 (Open agent-authored PRs as draft; Eric flips ready on clear pass). PRISM adapts: agent-authored PRs (Clove, Eli, Sage, Reese) open as draft via `gh pr create --draft`; Eric appends `gh pr ready` to his Phase 4 batch D label pipeline in state #3 (all clear) only.

#### Clove

1. **Add `--draft` to `gh pr create` in shipping-flow reference.** Edit `.prism/references/shipping-flow.md:57`. Change the command from `gh pr create --title "<commit subject>" --body-file /tmp/pr-body.md` to `gh pr create --draft --title "<commit subject>" --body-file /tmp/pr-body.md`. No surrounding prose changes — the existing context still applies; `--draft` is an additive flag.

2. **Add "Draft-by-default" subsection to shipping-flow.** Same file, after the existing `## Two-path closing` section but before `## Release PR ownership`, insert a new `## Draft-by-default` subsection. Full content:

   ```markdown
   ## Draft-by-default

   Agent-authored PRs open as draft. The platform-level "you cannot merge a draft" rule is the load-bearing review gate — labels alone aren't reliable because the team lead doesn't always check them; the draft state is enforced by GitHub itself.

   **Per-PR-type flip path:**

   | PR type | Author | Flip path |
   | --- | --- | --- |
   | Code | Clove | Eric flips ready in his Phase 4 batch D label pipeline when state #3 (`confidence:high` or `confidence:needs-judgment`) fires. |
   | Docs | Eli | No agent reviewer. The human flips ready before merging. |
   | Changelog | Sage | No agent reviewer. The human flips ready before merging. |
   | QA checklist | Reese | No agent reviewer. The human flips ready before merging. |

   **Why:** Code PRs have an agent reviewer (Eric) who can flip ready with confidence. Doc/changelog/checklist PRs don't — the draft state stays until a human reviews. The platform enforces the gate either way.
   ```

3. **Add ready-flip to Eric's Phase 4 batch D label pipeline.** Edit `.ai-skills/skills/prism-code-review-pr/shared.md`. Locate the existing label decision gate section (search for `### Applying labels in batch D` — currently around line 430–446). In the state #3 path (the "All clear (zero issues, or all minors addressed/acknowledged)" branch — currently around line 446), append after the existing label-apply command:

   ```bash
   gh pr ready <pr-number> 2>/dev/null || true
   ```

   Add a one-line note: `Ready-flip only fires in state #3 — states #1 (critical/major) and #2 (unaddressed minors) leave the PR in draft so the merge gate stays in place until the next review pass.`

   Verify by reading the surrounding context that states #1 and #2 still leave the PR untouched (no ready-flip in those branches).

4. **Update Clove's flow to mention draft default.** Edit `.ai-skills/skills/prism-code-dev/shared.md`. Locate the PR creation step (search for `gh pr create` or `shipping-flow.md`). If Clove's source references the shipping-flow.md command directly, no edit needed — the change in task #1 propagates. If Clove inlines the command, add `--draft` there too. Verify by grep: `grep -n 'gh pr create' .ai-skills/skills/prism-code-dev/shared.md`. If the grep returns results, edit each to include `--draft`.

5. **Regenerate platform mirrors.** Run `pnpm prism:build`. Verify Eric and Clove's regenerated `.claude/skills/<id>/SKILL.md` outputs reflect the new draft-default and ready-flip behavior.

6. **Verify clean.** Run `pnpm prism:build && pnpm prism:check && pnpm prism:check-types && pnpm prism:test`.

#### Eli

7. **Update skills-ecosystem architect doc with draft default.** Edit `.prism/architect/skills-ecosystem.md`. Under the Clove, Eli, Sage, Reese persona sections, add a one-line note that PRs open as draft. Under Eric, add a one-line note about the state #3 ready-flip. Mirror to `templates/install/.prism/architect/skills-ecosystem.md`.

---

### PR-1.5f.4 — `.generated/` collapse + full Thrive parity

**Branch:** `hmcgrew/prism-1.5f.4-generated-collapse`
**Depends on:** PR-1.5f.1, PR-1.5f.2, PR-1.5f.3 (validates that smaller content edits land cleanly before the install-contract change).
**Blocks:** none within Phase 1.5f.
**Parallel-safe with:** none — must follow the others to gate the riskiest change on a tidy baseline.
**Verification:** `pnpm prism:build && pnpm prism:check && pnpm prism:check-types && pnpm prism:test` after each task. Also: manual smoke test in a fresh clone (see task #14).

Backport target: Track A + Track C of Thrive PR #2025 (collapse `.generated/` staging; surgical gitignore) plus the install-contract codification from Thrive PR #2026 (`.ai-skills/docs/compatibility.md`). PRISM adds: ADR-0044 covering the load-bearing install-contract decision; paired dev doc per ADR-0038.

#### Eli

1. **Author ADR-0044 — Direct-write tool outputs; commit `.cursor/skills/`.** Dual-write to `.prism/spec/adrs/0044-direct-write-tool-outputs.md` AND `templates/install/.prism/spec/adrs/0044-direct-write-tool-outputs.md`. Required sections:
   - **Context** — PRISM currently writes Cursor skills and the Codex config to `.generated/cursor-skills/` and `.generated/codex-config.toml` respectively, then `.gitignore` blanket-ignores `/.generated/`, `/.cursor/`, and `/.codex/`. Cursor consumers of PRISM must run an install script before any skill is usable. The `.generated/` namespace is a pass-through — it adds an artificial third namespace without carrying weight.
   - **Decision** — direct-write build outputs to their tool-namespaced destinations: Cursor skills to `.cursor/skills/`, Codex config to `.codex/codex-config.toml`. Commit `.cursor/skills/` to the repo via surgical gitignore (replacing the blanket `/.cursor/`). `.codex/codex-config.toml` stays gitignored because it's a per-user file that would clobber consumer customization if committed. Delete `.generated/` and any install scripts targeting it.
   - **Consequences** — Cursor users get skills via `git pull`, no install step needed. Codex users still run `pnpm skills:install-codex` (or PRISM's equivalent) because the destination is outside the repo (`~/.codex/`). The committed-vs-ignored split inside each tool namespace becomes a rule consumers internalize — codified in the new `.ai-skills/docs/compatibility.md § Per-Tool Directory Ownership` (task #10). Drift risk: someone hand-edits `.cursor/skills/<id>/SKILL.md` directly instead of `.ai-skills/skills/<id>/` — mitigated by the existing `.ai-skill-generated` marker file convention and `pnpm prism:check` drift detection.
   - **Alternatives considered** — (a) Relocate-only: move `.generated/cursor-skills/` → `.cursor/skills/` and `.generated/codex-config.toml` → `.codex/codex-config.toml` but keep both gitignored. Removes the `.generated/` namespace cleanly with zero consumer contract change. Rejected because it doesn't solve the problem Thrive PR #2025 was solving — Cursor users still run an install step they shouldn't have to. (b) Match Thrive verbatim (commit `.cursor/skills/`, also commit `.codex/codex-config.toml`). Rejected because committing the codex-config would clobber per-user customization.
   - **References** — Thrive PR #2025; Thrive PR #2026 (compatibility doc origin); PRISM ADR-0031 (bifurcated install layout); PRISM ADR-0038 (paired dev doc gates); PRISM ADR-0039 (`.ai-*` namespace).
   Strip plan-file references from the templates copy.

2. **Author paired dev doc at `docs/content/dev/ai-skills/compatibility.md`.** Per ADR-0038 paired-doc gate, the new compatibility architect surface gets a teammate-facing narrative companion. Sections mirror task #10's compatibility.md content but written for human reading (longer prose, more rationale, fewer enumerations). The architect file is the short agent-facing spec; this dev doc is the longer narrative version.

3. **Author `docs/content/dev/ai-skills/syncing.md` narrative doc.** Backport from Thrive PR #2025's `docs/content/dev/ai-skills/syncing.md`. Required sections: sync flow (the two commands developers need — `pnpm prism:build` for source-to-output regen; `pnpm prism:install-codex` for per-user Codex install); why each step exists; Cursor-users-pull, Codex-users-install rationale. Adapt Thrive's content to PRISM-specific commands (`prism:build` not `skills:sync`; `prism:install-codex` if it exists, or document the gap).

4. **Cross-link from existing PRISM docs.** Edit `docs/content/dev/ai-skills/overview.md` if it exists (verify first). Add a Setup Requirements callout pointing at `syncing.md` and `compatibility.md`. Edit the sidebar configuration (verify path — likely `docs/content/sidebars.js` or `_meta.json` adjacent to the markdown files) to register the two new docs.

#### Clove

5. **Flip path destinations in `paths.json`.** Edit `.ai-skills/definitions/paths.json`. Change `"codexConfigFile": ".generated/codex-config.toml"` to `"codexConfigFile": ".codex/codex-config.toml"` and `"cursorSkillsRoot": ".generated/cursor-skills"` to `"cursorSkillsRoot": ".cursor/skills"`. Verify the JSON parses (`pnpm prism:check-types` covers this transitively). No other edits to this file.

6. **Update build.ts JSDoc and any path references.** Edit `scripts/ai-skills/build.ts`. Update the JSDoc at lines 10–11 from:
   ```
   *   - .generated/cursor-skills/<id>/SKILL.md (Cursor)
   *   - .generated/codex-config.toml
   ```
   to:
   ```
   *   - .cursor/skills/<id>/SKILL.md (Cursor)
   *   - .codex/codex-config.toml
   ```
   The path-reading code at lines 655–675 reads from `pathDefinitions.generated.codexConfigFile` and `pathDefinitions.generated.cursorSkillsRoot` — those are now the new paths from task #5, no code change needed.

7. **Surgical gitignore rewrite.** Edit `.gitignore`. Replace the existing block:
   ```
   # PRISM build outputs (generated from .ai-skills/) — anchored to repo root so
   # `templates/install/.codex/`, `templates/install/.cursor/`, etc. stay tracked.
   /.agents/
   /.codex/
   /.cursor/
   /.generated/
   ```
   with:
   ```
   # PRISM build outputs — committed-vs-ignored split per `.ai-skills/docs/compatibility.md § Per-Tool Directory Ownership`.
   # Codex skills root and config stay ignored (per-user destinations / config).
   /.agents/
   /.codex/codex-config.toml
   # Cursor skills root is committed (consumers get skills via git pull).
   # Other tool-namespaced state stays ignored.
   /.claude/worktrees/
   /.codex/worktrees/
   /.cursor/worktrees/
   /.claude/settings.local.json
   ```
   Remove the `/.cursor/` blanket ignore (committed surface). Keep `/.agents/` blanket-ignored (per-user Codex skills root). Keep `/.codex/codex-config.toml` surgically ignored but allow other `.codex/` content (already tracked: `SPEC.md`, `agents/`, `architect/`, `references/`, `rules/`, `spec/`, `templates/`). Delete the `/.generated/` line — the directory is removed in task #13.

8. **Verify gitignore behavior.** After the gitignore edit, run:
   ```bash
   git check-ignore -v .cursor/skills/prism-architect/SKILL.md
   git check-ignore -v .cursor/worktrees/foo
   git check-ignore -v .codex/codex-config.toml
   ```
   First command should return empty (not ignored — committed). Second and third should report ignored.

9. **Update `.ai-skills/README.md` references.** Edit `.ai-skills/README.md`. Change line 31 (the `pnpm prism:build` description) from referencing `.generated/cursor-skills/`, `.generated/codex-config.toml` to `.cursor/skills/`, `.codex/codex-config.toml`. Verify the rest of the README still reads correctly with the path changes.

10. **Author `.ai-skills/docs/compatibility.md`.** Create the directory if it doesn't exist. New file at `.ai-skills/docs/compatibility.md`. Required sections (full prose authored from scratch — Thrive PR #2026 is the reference, but PRISM-specific):
    - `# Compatibility`
    - `## Runtime Expectations` — supported tools and minimum versions (Claude Code, Codex, Cursor).
    - `## Generated Outputs` — table mapping `.ai-skills/skills/<id>/` source → `.claude/skills/<id>/SKILL.md`, `.agents/skills/<id>/SKILL.md`, `.codex/agents/<id>.toml`, `.cursor/skills/<id>/SKILL.md` destinations. Reference `paths.json` as the authoritative source.
    - `## Per-Tool Directory Ownership` — codify the committed-vs-ignored split. Required content (paraphrase Thrive #2026's section):
      - `.claude/` — committed (PRISM dogfoods Claude Code; consumers of PRISM inherit `.claude/` content).
      - `.codex/` — partially committed. `SPEC.md`, `agents/`, `architect/`, `references/`, `rules/`, `spec/`, `templates/` tracked; `codex-config.toml` and `worktrees/` ignored (per-user surfaces).
      - `.cursor/` — partially committed. `skills/` tracked (consumers get skills via `git pull`); `worktrees/` and any per-team state ignored.
      - `.agents/` — fully ignored. Per-user Codex skills root; never committed.
      - The rule for future tool integrations: per-tool workspace state belongs under each tool's own namespace, with the committed-vs-ignored split codified per-tool.
    - `## Install-Script Scope` — codify the rule from Thrive PR #2026. Required content: install scripts exist only when the destination is outside the repo. In-repo destinations get sync (`pnpm prism:build` writes directly to `.cursor/skills/`); outside-repo destinations get install scripts (`pnpm prism:install-codex` copies to `~/.agents/skills/` and `~/.codex/agents/`). Failure mode named: staging-and-deploy drift — without this rule, build outputs accrue in `.generated/` and the install scripts drift from the source of truth.
    The architect file is the short agent-facing spec; the paired `docs/content/dev/ai-skills/compatibility.md` from task #2 is the longer narrative version.

11. **Add manifest route for `.ai-skills/docs/`.** Edit `.prism/architect/manifest.json`, `.claude/architect/manifest.json`, `.codex/architect/manifest.json`, and `.cursor/architect/manifest.json`. Add a new entry routing `.ai-skills/docs/**` to `install-layout.md` (which already routes `.ai-skills/definitions/paths.json` and `scripts/ai-skills/build.ts` — the compatibility doc lives in the same conceptual surface). Verify the four manifests stay in sync.

12. **Update `install-layout.md` architect doc.** Edit `.prism/architect/install-layout.md` (and the three platform mirrors at `.claude/architect/`, `.codex/architect/`, `.cursor/architect/`). Add a new section `## Direct-write tool outputs` summarizing ADR-0044's decision: no `.generated/` staging; tool-namespaced direct write; per-tool committed-vs-ignored split per `.ai-skills/docs/compatibility.md`. Cross-link to ADR-0044 and to the new compatibility doc.

13. **Delete `.generated/` directory.** After tasks #5–#12 land and `pnpm prism:build` writes to the new locations:
    ```bash
    rm -rf .generated/
    ```
    Verify `.generated/` no longer exists. Add a release-notes line to the PR body warning consumers with stale checkouts to run `rm -rf .generated/` after pulling.

14. **Smoke test in a fresh clone.** Clone the repo into a scratch directory (e.g. `~/scratch/prism-smoke`), run `pnpm install && pnpm prism:build`, verify:
    - `.cursor/skills/` populated with all skill outputs.
    - `.codex/codex-config.toml` populated.
    - `.codex/agents/` populated.
    - `.agents/skills/` populated.
    - `.claude/skills/` populated.
    - No `.generated/` directory created.
    - `pnpm prism:check` passes.
    Document the smoke test result in the PR body.

15. **Run full verification.** `pnpm prism:build && pnpm prism:check && pnpm prism:check-types && pnpm prism:test`. The check command is the highest-risk gate — verifies all platform mirrors match canonical sources after the path flip.

---

## Acceptance Criteria

### Behavioral

- [ ] Given PR-1.5f.1 has merged, When Pixel writes a mode 2 mock spec, Then the file lands at `.prism/design/mocks/<slug>.md` not `.claude/design/mocks/<slug>.md` (US-1).
- [ ] Given PR-1.5f.1 has merged, When a developer greps for `.claude/design/mocks/` across the repo, Then no matches are returned outside historical plan files (REQ-1).
- [ ] Given PR-1.5f.2 has merged, When Winston closes a plan, Then every `## Decisions` entry has been verified to carry a `→ promoted to X` or `→ no promotion needed (reason)` verdict sub-bullet (US-2).
- [ ] Given PR-1.5f.2 has merged, When Briar self-reviews a close-out PR, Then a missing verdict sub-bullet is flagged as Minor (US-3).
- [ ] Given PR-1.5f.3 has merged, When Clove ships a code PR, Then the PR opens in draft state and cannot be merged until Eric flips it ready (US-4).
- [ ] Given PR-1.5f.3 has merged, When Eric's review pass results in state #3 (`confidence:high` or `confidence:needs-judgment`), Then Eric runs `gh pr ready` as part of the Phase 4 batch D label pipeline (US-5).
- [ ] Given PR-1.5f.3 has merged, When Eli, Sage, or Reese ships an artifact PR, Then the PR opens in draft state and stays draft until the human flips it ready before merge (US-6).
- [ ] Given PR-1.5f.4 has merged, When a developer clones PRISM and opens it in Cursor without running any install command, Then all team-synced skills appear in the Cursor skill picker (US-7).
- [ ] Given PR-1.5f.4 has merged, When `pnpm prism:build` runs, Then outputs land at `.cursor/skills/` and `.codex/codex-config.toml` and no `.generated/` directory is created (REQ-2).
- [ ] Given PR-1.5f.4 has merged, When a developer runs `git check-ignore .cursor/skills/prism-architect/SKILL.md`, Then the file is NOT reported as ignored (REQ-3).
- [ ] Given PR-1.5f.4 has merged, When a developer runs `git check-ignore .codex/codex-config.toml`, Then the file IS reported as ignored (REQ-4).

### Non-behavioral

- [ ] After each sub-PR merges, `pnpm prism:build` completes without error.
- [ ] After each sub-PR merges, `pnpm prism:check` reports no drift between canonical sources and generated outputs.
- [ ] After each sub-PR merges, `pnpm prism:check-types` reports no TypeScript errors.
- [ ] After each sub-PR merges, `pnpm prism:test` reports all tests passing.
- [ ] ADR-0044 exists on both surfaces — `.prism/spec/adrs/0044-direct-write-tool-outputs.md` AND `templates/install/.prism/spec/adrs/0044-direct-write-tool-outputs.md` (byte-identical except for plan-file reference stripping in the templates copy).
- [ ] The compatibility doc exists at `.ai-skills/docs/compatibility.md` with `## Per-Tool Directory Ownership` and `## Install-Script Scope` sections.
- [ ] The paired dev doc exists at `docs/content/dev/ai-skills/compatibility.md` per ADR-0038.
- [ ] The narrative sync doc exists at `docs/content/dev/ai-skills/syncing.md` and is cross-linked from `overview.md`.
- [ ] ADR numbering does not collide — ADR-0044 is the next number after the existing 0043.

### AC Adjustments

### AC Sync Log

| Date | Agent | Action | Plan | Linear |
| ---- | ----- | ------ | ---- | ------ |

---

## Review Issues

### Plan task #1 count typo (`7 references` listed 9 line numbers)

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `.prism/plans/epic-prism-thrive-backport-wave-2.md` (PR-1.5f.1 task #1)
- **Problem:** Plan task said "7 references at lines [9 line numbers]" — count mismatched the enumeration.
- **Suggested fix:** Drop the count, let the enumeration stand (per writing-voice § Count rules, not numbers). Fixed in this PR per the goal directive.

### ADR-0044 + docs reference `pnpm prism:install-codex` which doesn't exist in PRISM

- **Severity:** `major`
- **Status:** `fixed`
- **File:** `.prism/spec/adrs/0044-direct-write-tool-outputs.md`, `.prism/architect/install-layout.md`, `.ai-skills/docs/compatibility.md`, `docs/content/dev/ai-skills/syncing.md` (plus templates mirrors of ADR + install-layout)
- **Problem:** Four documentation surfaces referenced `pnpm prism:install-codex` as if it were a shipped command. The script is planned for Phase 2 but doesn't exist in `package.json` today. Per `architect-doc-verification.md`, missing/diverged claims in architect docs are Major minimum — durable agent context that misleads every future reader.
- **Additionally:** Two false historical claims in syncing.md and ADR-0044 that "Cursor consumers had to run an install script" — PRISM never shipped a Cursor install script (the upstream Thrive dogfood had one; PRISM was extracted before that script was added).
- **Suggested fix:** Hedge the `prism:install-codex` references as planned-for-Phase-2; rewrite the historical claims to accurately describe PRISM's pre-1.5f state (no Cursor install script existed). Fixed in this PR per the goal directive — all four surfaces updated; ADR + install-layout mirrored to templates; build green post-fix.

## Cleanup Items

None at plan-creation time.

---

## PR Readiness

Living checklist — updated by each sub-PR's self-review run.

- [ ] No critical or major issues across all four sub-PRs
- [ ] Types correct — no `any`, no unsafe `as`
- [ ] No stray console.logs or debug artifacts
- [ ] Tests written for new logic and edge cases (especially the surgical gitignore behavior in PR-1.5f.4 task #8)
- [ ] All debugged issues resolved (no `open` entries)
- [x] Build passes — last run: 2026-05-23 (1.5f.4 + Briar review fixes: `prism:build`, `prism:check`, `prism:check-types` all green; 116/116 tests pass; `.generated/` deleted; `git check-ignore` verified surgical gitignore behavior; install-codex doc drift fixed across 4 surfaces)
- [ ] PR descriptions up to date for each sub-PR
- [ ] Lasting decisions promoted to architect context (ADR-0044 + compatibility.md cover the durable surface for 1.5f.4; rule edits in 1.5f.1/1.5f.2/1.5f.3 codify the smaller decisions in place)
