# Plan: epic-prism-thrive-backport-wave-4

## Ticket

PRISM Thrive backports, fourth wave (no Linear ticket; phase work). Follows [`epic-prism-thrive-backport.md`](./epic-prism-thrive-backport.md) (Wave 1, Thrive PRs through ~#2024), [`epic-prism-thrive-backport-wave-2.md`](./epic-prism-thrive-backport-wave-2.md) (#2025–#2027), and wave 3 (#2032–#2043 — epic closed in `#75`, plan deleted).

## Goal

Absorb the incident-born governance and git-workflow rules from Thrive PRs `#2047`–`#2049` and `#2056`, and break PRISM's all-skills-are-personas assumption by implementing utility-skill support natively — shipping `/prism-handoff` as the first utility skill from the architecture resolved in Thrive's THR-1912 plan, and `/prism-review-loop` (issue `#77`) as the second — across three ordered sub-PRs.

---

## Scope boundary — what this wave does NOT do

Discovery triaged Thrive PRs `#2044`–`#2056` (Hunter-authored: `#2045`, `#2047`, `#2048`, `#2049`, `#2052`, `#2056`). Exclusions, each with a recorded reason:

- **`#2052` (THR-1922, backend GraphQL) — CANCELLED upstream, product-only.** Its surviving doc nuggets were already carried forward into `#2056` on the Thrive side. Its cancellation is the originating incident for `design-governance.md` (ported in this wave) — the incident ports, the code does not.
- **`#2056` product scope — Thrive app code.** The Latest Posts block, WYSIWYG-parity docs, and block-registration docs are WordPress-specific. Only the `design-governance.md` rule ports.
- **`#2047` pipeline scope — belongs to the deferred `#2042` lane.** The join-engine deletion and fail-loud link-rebase guard modify Thrive's preamble generator, which wave 3 deferred (PRISM doesn't have the drift problem it solves). This wave annotates the wave-3 deferral record instead (task 4.1-9).
- **`#2045` (THR-1912) implementation — unlanded on Thrive.** The PR is a draft carrying only the branch plan. PRISM implements the *resolved architecture* natively (see Decisions); there is no Thrive diff to port. Revisit only to reconcile if Thrive's landed shape diverges materially.
- **`#2044`, `#2046`, `#2050`–`#2055` — other-author product/CI work.** Docker caching, Playwright cache, deployignore, WP plugin updates, fleet tooling. No PRISM relevance.

---

## Implementation Tasks

Three ordered sub-PRs. Sub-PR 4.1 is a single PR (user-confirmed 2026-06-04 — no further split). Sub-PR 4.3 was added 2026-06-05 when issue `#77` slotted into the wave (plan survives per ADR-0047). Rule-edit mechanics for every 4.1 task: edit the canonical `.prism/rules/<file>`, propagate to the four mirrors (`templates/install/.prism/rules/`, `.claude/rules/`, `.codex/rules/`, `.cursor/rules/` — wave 3.1 precedent shows all five surfaces move together; if `pnpm prism:build` does not regenerate the rule mirrors, mirror manually with token substitution as 3.1 did), then `pnpm prism:check` green.

### Sub-PR wave 4.1 — governance + git-workflow rule ports

#### Clove (implementation)

1. **Add `git-conventions.md § Who merges`** (Thrive `#2049`). Insert a new `## Who merges` section immediately after `## Merge Strategy` in `.prism/rules/git-conventions.md`. Content shape: merging and approving PRs is a human responsibility, on every tool; cues like "it's approved" / "let's get it in" mean *finish the handoff* (push, sync the PR body, report ready) — never run the merge; this complements Eric's review-side "never approves" with a merge-side rule that binds every persona. Onboarding voice, no THR references, no incident narration.

2. **Promote Commit Granularity to the shared rule** (Thrive `#2048`). Add `## Commit Granularity` to `.prism/rules/git-conventions.md` — the definition currently living only in `.ai-skills/skills/prism-code-dev/shared.md § Git`. Trim that skill section to its flow-specific triggers (commit-per-task, post-review follow-up commits, user-requested commits) plus a citation to the new shared section. Update the `### Not allowed` fixup-bullet cross-reference (currently cites the skill path) to point at the new section. Regenerate skill adapters via `pnpm prism:build`.

3. **Add `git-conventions.md § When to Commit` + `§ Keeping a Branch Current`** (Thrive `#2048`). When to Commit: commit your own work before handing off to another persona or session. Keeping a Branch Current: merge-as-default for refreshing a branch from main; rebase reserved for the squash-already-upstream trap (the squash-merged copy of your commits is on main while the individual commits are still on your branch — live for PRISM, which squash-merges); never rebase a shared branch. Name the trap generically — no mega-menu/THR incident reference.

4. **Add `writing-voice.md § Answer first, one offer at a time`** (Thrive `#2048`). New section in `.prism/rules/writing-voice.md`: lead with the answer (BLUF); point, don't menu; no caveat sandwiches; be opinionated when you have an opinion; name the tangent instead of following it; surface the bigger version but build the asked-for one. Frame as cognitive-load reduction for every reader. Two carve-outs so it doesn't fight existing mechanics: it does not override scope-discipline rules (`followup-scope.md`, code-standards § Refactor scope), and deliberate decision gates (Winston's A/P/C menu, Theo's write/skip/defer prompts) are exempt — those menus are the product, not throat-clearing.

5. **Scale the PR Summary rule to PR size** (Thrive `#2048`). In `.prism/rules/pr-description.md` (line 16): change `## Summary — one-line TL;DR` to a BLUF scaled to PR size — one line for small PRs, a short bullet BLUF for large ones; the reviewer should know what they're walking into before the first heading scroll. Make the matching placeholder-text change in `.prism/templates/pr-description.md`.

6. **Add `code-standards.md § Removal and rename completeness`** (Thrive `#2047`). Author gate in `.prism/rules/code-standards.md`: when removing or renaming a concept, sweep every reference by searching for the old name — compiler errors and the diff are not the sweep. Reviewer gate: add a matching scan item to `.prism/references/review-frameworks.md` (Eric + Briar's shared scan surface): diff-only review structurally cannot catch a missed reconciliation — the unfixed file never appears in the diff; verify removals/renames by search, not by diff.

7. **New rule: `design-governance.md`** (Thrive `#2056`). Create `.prism/rules/design-governance.md` (+ four mirrors): implementations follow the approved design artifact (mock, spec, design file); redesigns or enhancements beyond it require explicit UI/UX sign-off *before* implementation — agent creative liberty is not authorization; unapproved enhancements are deferred through `followup-scope.md`, not built speculatively. Why (genericized): an unapproved redesign once drove a full supporting PR that was cancelled when the design scope it served was backed out — the cost lands downstream of the redesign, not at it. Who runs this rule: Pixel (stays inside the approved artifact in mode 2), Winston (design-aware flag checks for an approved artifact), Clove (implements to the artifact), Briar/Eric (flag unapproved redesign in review). No THR references, no WordPress nouns (ADR-0032).

8. **Promote `writing-voice.md` to the always-on tier** (wave-4 audit finding; Thrive `#2037` Phase 1E parity; **resolves issue #51 via its Option B**). Remove the frontmatter gating from `.prism/rules/writing-voice.md` and all four mirrors so the rule loads every session — match the shape of the existing always-on rules per surface (compare `git-conventions.md` across all five copies and mirror that shape exactly). Per `#51` Option B, also update ADR-0035's Tier 1 example list (`.prism/spec/adrs/0035-rule-loading-tiers.md` + templates mirror + the paired dev doc `docs/content/dev/architecture/rule-loading-tiers.md`, which PR `#49` set to the 7-rule list) to include writing-voice; verify `prism-code-dev/shared.md`'s existing 8-rule Tier 1 list now matches without edit. No body edit to writing-voice itself: it already claims commit messages, PR bodies, and Linear comments — surfaces that are not file edits and can never match a `paths:` gate. Put `Closes #51` in the sub-PR body. Verify post-change that a fresh session lists writing-voice in its loaded rules.

9. **Annotate the wave-3 `#2042` deferral** (bookkeeping). *(Superseded — wave-3 epic closed in `#75` and its plan was deleted after this task's annotation was committed; see AC Adjustments 2026-06-04. The post-`#2047` guidance lives in this plan's Scope boundary and Decisions.)* Original task: append a sub-bullet to the wave-3 plan's "#2042 deferred" Decision noting Thrive `#2047` (merged 2026-06-01) deleted the manifest × `paths:` join engine and added a fail-loud link-rebase guard — if the revisit trigger ever fires, port the post-`#2047` end-state, not the `#2042`-era shape.

### Sub-PR wave 4.2 — utility-skill support + `/prism-handoff`

#### Clove (implementation)

1. **`roles.json` — add the entry.** Append `{ "id": "prism-handoff", "type": "utility" }` to the `skills` array in `.ai-skills/definitions/roles.json`. Existing entries unchanged (absent `type` = persona).

2. **`build.ts:44` — widen `RoleDefinition`.** Change `persona: string` to `persona?: string; type?: "persona" | "utility"`. Blocks tasks 3–5.

3. **`build.ts:686` — relax validation.** Require `persona` only when `type !== "utility"`; a utility entry validates with `id` + `type: "utility"`. Keep the every-skill-must-have-an-entry throw intact.

4. **`build.ts:133` — guard persona token substitution.** `substituteTokens(roleDefinition.persona, …)` assumes persona exists; skip (or pass empty) for utility entries.

5. **`build.ts:788-792` — gate agent-adapter generation.** Wrap `buildCodexAgentToml` and the `.codex/agents/<id>.toml` write in `if (roleDefinition.type !== "utility")`. Verify `codex-config.toml` needs no change (Thrive's `[agents]` block was static, no per-skill enumeration — confirm PRISM's matches before assuming).

6. **New skill source: `.ai-skills/skills/prism-handoff/frontmatter.yml`.** User-approved draft (2026-06-04 session), ship verbatim:

   ```yaml
   name: prism-handoff
   description: Compact the current session into a scoped handoff document a fresh
     agent can continue from — same persona or a different one. Flushes plan-worthy
     state into the branch plan first, then writes only the session residue to a
     unique path under the OS temp dir and reports that path back. Explicit
     /prism-handoff invocation; no persona — runs in the current persona's voice.
     Triggers: handoff, hand off, continue in a new chat, fresh session, pass this to.
   argument-hint: "[scope and/or target — e.g. 'story 4' or 'clove: implement story 4.1']"
   ```

7. **New skill source: `.ai-skills/skills/prism-handoff/shared.md`.** User-approved draft (2026-06-04 session), ship verbatim — no `You are X` opener; skills stack additively and the active persona supplies the voice. No platform files (`claude.md`/`codex.md`/`cursor.md`) unless a platform delta surfaces.

   ````markdown
   Compact the current session into a handoff document a fresh agent can continue
   from. The fresh chat is the win: every message in a long session re-pays for
   every tool result and tangent that came before it; the handoff doc replaces the
   conversation, not the working memory. The branch plan stays the working memory.

   ## Step 1 — Flush before writing

   Before writing the handoff doc, promote any plan-worthy state into the branch
   plan: unrecorded decisions to `## Decisions`, meaningful changes to `## History`,
   unresolved bugs to their structured sections. The handoff doc carries only what
   the plan structurally can't — in-flight reasoning, the user's framing, open
   threads, this session's dead ends. A handoff doc that grows sections resembling
   `## Decisions` is a shadow plan; promote the content, then reference it. The
   better the session maintained its plan, the thinner this doc — that's the
   system working, not a failure to summarize.

   ## Step 2 — Parse the arguments

   - **Scope filter** — keep only threads pertaining to the named scope; everything
     else goes in the dropped-threads manifest.
   - **Target prefix** (`clove:`, `sasha:`, any persona name followed by a colon) —
     produce the cross-persona shape below instead of the same-persona resume.
   - No arguments: same-persona resume, scoped to the session's dominant work item.

   ## Step 3 — Write the document

   Write to `<os-temp>/prism-handoffs/<branch-slug>/<UTC-timestamp>-<shortid>.md`,
   creating directories as needed. Join path segments explicitly — do not assume
   `$TMPDIR` ends with a separator (it varies by environment; `"${TMPDIR%/}/..."`
   guarantees exactly one slash either way). Never a fixed shared path — unique
   paths prevent collisions between concurrent sessions and stale reads of dead
   handoffs.

   Both shapes share these sections; the shape changes the emphasis:

   - **`## Continue from`** — one paragraph: what this session was doing and where
     it stopped. Same-persona resume: where the reasoning was mid-flight.
     Cross-persona route: a next-action brief — what to do, not how we got here.
   - **`## Artifacts`** — plan, ADRs, issues, PRs, key files. Paths and URLs only;
     never duplicate content the artifact already holds.
   - **`## Open threads`** — questions raised and unresolved, one line each.
   - **`## Live state`** — anything the next session inherits physically:
     uncommitted files, open worktrees, background processes, an un-pushed branch.
   - **`## Dropped`** — one line per thread the scope filter excluded. Dropping is
     a visible decision, not silent decay.
   - **`## Suggested skills`** — by capability, citing AGENTS.md routing; don't
     re-enumerate the roster.
   - **`## Focus`** — the passed args, restated as the next session's brief.

   Write the doc in neutral structured prose — the next reader may be a different
   persona or model, and persona flavor is noise to it. The spoken summary back to
   the user may stay in the current persona's voice. Redact secrets and PII.

   ## Step 4 — Report the path

   The absolute path is the final output — the path is the handoff token. Include
   the one-line start for the next session, e.g.:

   > New chat → `/prism-architect` → "continue from <path>"

   ## Read-side contract

   A fresh agent reads a handoff only when handed its path. Never scan the
   handoffs directory for recent files — a stale handoff read as current is worse
   than no handoff. The receiving persona still runs its own startup (plan lookup,
   architect context); the handoff doc supplements the plan, never replaces it.

   ## Timing

   Hand off while the summarizer is still sharp. A session at the edge of its
   context window writes a degraded summary exactly when a good one matters most —
   around 20+ messages or the first signs of drift is the right moment, not 95%.
   ````

8. **Test coverage.** In `scripts/ai-skills/discovery-metadata.test.ts` (plus build-path tests where the new branches live): a `type: "utility"` skill generates Claude/Codex/Cursor `SKILL.md` and no agent TOML; validation accepts a utility entry with no `persona`; existing persona skills regenerate byte-identical (regression).

9. **Regenerate + verify.** `pnpm prism:build`; commit generated `.claude/skills/prism-handoff/`, `.agents/skills/prism-handoff/`, `.cursor/skills/prism-handoff/`; confirm no `.codex/agents/prism-handoff.toml`; `pnpm prism:check` green.

10. **ADR-0046 — persona-vs-utility skill type.** New `.prism/spec/adrs/0046-persona-vs-utility-skill-type.md` (+ templates mirror if ADRs ship in install templates — match ADR-0044/0045 precedent). Records the `type` discriminator, the agent-adapter gate, and the rejected alternatives (fake persona: permanent lie in the data model, pollutes the agent roster; bare slash-command outside `.ai-skills`: fragments the canonical→multi-runtime pipeline). Passes the triple gate: hard to reverse (registry schema), surprising without explanation (breaks the skills≡personas assumption every existing skill embodies), genuine trade-off. Update the ADR README index.

11. **`skill-authoring.md` — utility-skill subsection.** Add a short section to `.prism/rules/skill-authoring.md` (+ mirrors): utility skills carry no persona, no voice section, no "How X Thinks" lens, no `You are X` opener; the description field drops persona double-coverage (function keywords only); the disclosure gate and loading levels apply unchanged. (after Clove task 10 — cite the ADR)

#### Eli (documentation)

12. **`.ai-skills/docs/compatibility.md`** — add a "Persona vs Utility skills" subsection: utility skills generate skill adapters in all three runtimes but no Codex agent adapter; cite the `roles.json` `type` discriminator and ADR-0046. Update the generated-outputs matrix note. (after Clove task 5)

13. **`AGENTS.md`** — two edits: (a) add `prism-handoff` to the skill roster, marked as a *utility* skill: explicit `/prism-handoff` invocation, no persona; (b) in § Context Window Handoff Check, add one line naming `/prism-handoff` as the remedy when the check fires — personas suggest it in the closing message on long/mixed-context sessions. Coordinate with issue #64 (agents-md-slim owns AGENTS.md restructuring).

### Sub-PR wave 4.3 — `prism-review-loop` utility skill (issue `#77`)

Second utility skill; the proof of the wave's zero-pipeline-edit contract (ADR-0046). Skill sources ship verbatim from issue `#77`'s embedded drafts, pending normal review. The issue's dry-run done condition is already satisfied — the ladder was hand-run as PR `#78`'s review process (2026-06-04/05; recorded in issue `#77` § Dry-run findings).

#### Winston (plan bookkeeping)

1. **Add this 4.3 section to the plan.** Goal amended ("two" → "three ordered sub-PRs"), task group + Decisions + AC added, History appended. *(Done at plan write — this section.)*

#### Clove (implementation)

2. **`roles.json` — add the entry.** Append `{ "id": "prism-review-loop", "type": "utility" }` to the `skills` array in `.ai-skills/definitions/roles.json`. Existing entries unchanged. Build stays red until tasks 3–4 land — sequence within the same commit; verification is task 7.

3. **New skill source: `.ai-skills/skills/prism-review-loop/frontmatter.yml`.** The issue `#77` draft with one mechanical change: the `description` value uses the folded (`>`) scalar style rendering the identical string — `parseFrontmatter` truncates plain multi-line continuations to their first line (see Decisions; prism-handoff precedent). `argument-hint` unchanged.

4. **New skill source: `.ai-skills/skills/prism-review-loop/shared.md`.** Ship the issue `#77` body verbatim — the ladder, four guardrails (pass budget, three-strike, disagreement fast-path, phase-boundary gate, state-travels), closing scoreboard. No `You are X` opener; no platform files unless a platform delta surfaces (prism-handoff precedent).

5. **Promote the parseFrontmatter constraint into `skill-authoring.md`** (second trip = promotion per the lesson taxonomy — the issue `#77` draft itself re-tripped the 2026-06-04 lesson). In `.prism/rules/skill-authoring.md` § Description field shape, add a short mechanics note: multi-line `description` values use the YAML folded (`>`) scalar — `parseFrontmatter` (`scripts/ai-skills/utils.ts`) reads single-line and folded scalars only; a plain continuation silently truncates to its first line. Incident shape, no wave narration (ADR-0032). Canonical + four mirrors via `pnpm prism:build`.

6. **Doc surfaces gain the second utility skill.** (a) `.prism/architect/skills-ecosystem.md` § Utility skills (+ install seed `templates/install/.prism/architect/skills-ecosystem.md`; platform mirrors regenerate): after the prism-handoff sentence, add `prism-review-loop` — orchestrates the review gauntlet (self-review → fix → PR-review loops to zero findings), user-initiated, runs in the invoking persona's voice. (b) `AGENTS.md` skill roster: add a `prism-review-loop` utility line adjacent to prism-handoff's, same shape. Verify issue `#64` (agents-md-slim, owns AGENTS.md) is still unmoved before editing — last verified 2026-05-28.

7. **Regenerate + verify.** `pnpm prism:build`; commit generated `.claude/skills/prism-review-loop/` and `.cursor/skills/prism-review-loop/`; confirm no `.codex/agents/prism-review-loop.toml`; confirm the generated SKILL.md description carries the full string (grep for `review until clean`); `pnpm prism:check` and `pnpm prism:test` green. No new tests — the 4.2 suite locks the discriminator generically; a second utility entry exercises already-locked paths. 137/137 expected.

#### Winston (close)

8. **Run the epic close on this branch** (after review passes, before merge — 4.3 is the wave's final PR). Verdict sub-bullets on the 4.3 Decisions, promote anything lasting, `> Closed:` marker + History entry per `branch-plan.md § Before Closing`. The plan file stays in `.prism/plans/` (ADR-0047).

---

## Decisions

- **Wave sourced partly from open Thrive PRs — annotated, not blocked.**
  - **Root cause:** `#2048`, `#2049`, `#2056` are still in review on Thrive at triage time (2026-06-04); only `#2047` is merged. Prior waves ported merged PRs only.
  - **Alternatives considered:** wait for merges (stalls PRISM on Thrive's review latency, for content Hunter authored and stands behind); port verbatim and diff later (imports churn risk).
  - **Chosen approach:** port now. ADR-0032 forces a prose rewrite anyway, so Thrive review churn on *wording* can't drift PRISM; only substance changes would. Source-PR state recorded here; a later wave reconciles if Thrive review changes substance.
  - **Implementation guidance:** each 4.1 task cites its source PR; porters work from the principle, never the prose.
  - → no promotion needed (wave-sourcing tactic; by precedent the next wave's triage re-checks Thrive's landed state, so the reconcile-if-substance-changes watch transfers there)
- **Utility-skill support implemented natively (leapfrog), not ported.**
  - **Root cause:** Thrive `#2045` is a draft carrying only the THR-1912 branch plan — there is no implementation diff to port. The architecture is resolved in that plan: `type` discriminator in the role registry, agent-adapter gate, rejected fake-persona and bare-slash-command alternatives.
  - **Chosen approach:** PRISM implements from the resolved decisions against its own pipeline (`build.ts`, verified line-level targets in tasks 4.2-2..5). PRISM landing before Thrive is acceptable — the dogfood flow reverses occasionally; the decisions are settled, only Thrive's keystrokes are pending.
  - → promoted to ADR-0046
- **The discriminator is generic — built for the utility-skill pipeline, not just `/prism-handoff`.** Hunter has more utility skills incoming (shapes TBD). Adding one = a `roles.json` entry + a skill source directory; zero pipeline edits. The gate stays single-purpose: utility ⇒ no persona requirement, no agent adapter — nothing else forks on type.
  - → promoted to ADR-0046 (the zero-pipeline-edit contract is its Decision section)
- **`prism-handoff` is function-descriptive with no persona** — per `skill-authoring.md § Persona name vs. slash-command ID`; a handoff is an action, not a role. Considered: naming a persona for it. Rejected: a persona nobody switches into is a permanent lie in the data model (THR-1912's own finding).
  - → no promotion needed (codified in ADR-0046's rejected alternatives and skill-authoring.md § Utility skills)
- **`/prism-handoff` design extends THR-1912 with four PRISM-specific behaviors** (explored and user-approved 2026-06-04; full draft embedded in tasks 4.2-6/7).
  - **Root cause:** the user's value case is context hygiene, not just continuation — shed a long mixed session's conversation tail (token cost paid on every message) while keeping the work item's state; hand back to the same persona or route to another.
  - **Flush-before-handoff:** plan-worthy state promotes to the branch plan *before* the doc is written; the doc carries only the residue (in-flight reasoning, open threads, user framing). Guards the shadow-plan failure mode — a second memory surface drifting against the plan. A thin handoff doc means the plan discipline worked.
  - **Two shapes keyed on args:** same-persona resume (default) vs cross-persona route (`persona:` prefix → next-action brief). Args double as scope filter; excluded threads land in a `## Dropped` manifest so loss is visible, not silent.
  - **Trigger integration:** explicit invocation stays (THR-1912's call), but AGENTS.md § Context Window Handoff Check gains `/prism-handoff` as its named remedy — personas suggest, never auto-invoke.
  - **Timing guidance in-body:** hand off while the summarizer is sharp (~20+ messages), not at 95% context — a degraded agent writes a degraded summary exactly when it matters most.
  - → no promotion needed (the shipped skill body carries the design; AGENTS.md § Context Window Handoff Check carries the trigger integration)
- **Handoff path contract: unique branch-namespaced path under OS tmp; path-as-token; read-side never scans tmp.** A fixed shared path causes collisions and stale reads (documented Thrive incident); branch is the namespace key because it's always available. Cross-session, same-machine, single-user scope — no repo path, no cross-person sharing.
  - → no promotion needed (codified in the skill body — Step 3 and the Read-side contract)
- **Rules-loading audit (this session): PRISM does NOT have Thrive's rules-not-loading issue.** 8 ungated rules load every session; 8 path-gated rules load contextually — observed firing correctly mid-session (`skill-authoring.md`, `worktree-isolation.md`). Thrive's historical breakage predates its THR-1900 generated-loader pipeline (hand-maintained fan-out drifted); PRISM inherited the generated shape from day one.
  - → no promotion needed (point-in-time audit finding; the surviving cross-runtime gap is tracked in issue #73)
- **`writing-voice.md` promoted to always-on (replaces the paths-widening fix).**
  - **Root cause:** path gating only sees file edits, but writing-voice's most common surfaces are not files — commit messages, PR bodies written via `gh api`, Linear comments. No `paths:` glob can ever match them; widening paths fixes only the file-surface gap (`.prism/**`, `.ai-skills/**`) and leaves the non-file gap open.
  - **Alternatives considered:** widen paths only (original 4.1 task 8) — rejected, structurally can't cover non-file writing; leave gated and rely on personas remembering — rejected, that's the hand-maintained drift Thrive already paid for.
  - **Chosen approach:** always-on tier, mirroring Thrive `#2037` Phase 1E ("writing-voice → Tier 1 + chat scope"), which wave 3 had triaged as a low-value follow-up — the wave-4 audit revalidated it. Cost accepted by Hunter (2026-06-04): ~2.3k tokens/session on a ~11.2k always-on base, paid by every consumer via install templates.
  - **Implementation guidance:** 4.1 task 8 — strip frontmatter on all five surfaces, match the existing always-on rules' per-surface shape.
  - → promoted to ADR-0035 (Tier 1 list updated in PR `#76`; the rule itself now carries no gating on any surface)
- **Cross-runtime tier honoring flagged, NOT absorbed — routed to issue #73.** The wave-4 audit found the ADR-0035 tier model is honored by Claude Code only: the build's `platformContentCopies` step copies rule content verbatim, so Cursor receives `.md` files with a `paths:` key its `.mdc`/`globs:`/`alwaysApply:` dialect doesn't read, and Codex (which auto-loads only AGENTS.md) reaches `.codex/rules/` solely via prose pointers. The fix is the dialect-emission subset of Thrive THR-1900 (Cursor `.mdc` translation + Codex AGENTS.md inlining) — a pipeline feature the size of sub-PR 4.2, deliberately kept out of this wave. Issue #73 carries the verification spike + done condition; coordinates with issue #64 (agents-md-slim), which owns AGENTS.md.
  - → no promotion needed (tracked in issue #73; lessons.md 2026-06-04 carries the mirror-exists-vs-honored lesson)
- **Issue #51 (writing-voice tier conflict) resolved by this wave via its Option B.** The pre-existing shared.md-vs-ADR-0035 disagreement on writing-voice's tier needed an intent decision; the wave-4 audit supplied the rationale (path gating structurally misses non-file writing surfaces) and Hunter picked promotion. Task 4.1-8 carries the mechanics; the sub-PR closes `#51`.
  - → no promotion needed (resolution recorded in issue `#51`'s close and ADR-0035's updated list)
- **`worktree-isolation.md` tier inversion noted, deferred.** It gates on `.prism/**` + `scripts/**` (fires nearly every PRISM session) but is relevant only to worktree-mode review — candidate to fold into the `worktree-mode.md` reference Eric already loads (~600 tokens/session saved). Not approved this wave; revisit if always-on budget becomes a concern.
  - → no promotion needed (deliberate deferral with a revisit trigger — but it dies with this plan unless filed as a follow-up; flagged at close, see the staged-close History entry)
- **Sub-PR 4.1 ships as a single PR** (user-confirmed) — all sub-30-line content edits in the same `.prism/rules/` neighborhood; splitting adds review overhead without isolation value.
  - → no promotion needed (PR-shaping tactic for this wave)
- **`prism-handoff` frontmatter uses the folded (`>`) scalar style.** `parseFrontmatter` (`scripts/ai-skills/utils.ts`) reads single-line values and `>` folded scalars only — a plain multi-line continuation parses as its first line, silently truncating the description that the length check and Codex discovery read. The folded form renders the identical string to the approved task-6 draft; only the YAML scalar style differs.
  - → no promotion needed (lessons.md 2026-06-04 carries the constraint; promotes into skill-authoring.md on recurrence per the lesson taxonomy)
- **Agent-adapter cleanup excludes utility skill IDs.** `removeDeletedManagedAgentFiles` receives only persona skill IDs, so a skill that flips persona→utility gets its stale `.codex/agents/<id>.toml` removed on the next build. Complements the task-5 generation gate — without this, the stale adapter would persist because the flipped skill's ID still exists in the registry.
  - → no promotion needed (codified in ADR-0046 and locked by the build tests)
- **Tasks 4.2-12/13 (Eli lane) absorbed by Clove.** Two small doc edits (`.ai-skills/docs/compatibility.md`, `AGENTS.md`) tightly coupled to the pipeline change and shipping in the same PR; a separate docs handoff would re-load full context for ~20 lines of prose. Issue `#64` (agents-md-slim, owns AGENTS.md) verified unmoved since 2026-05-28 before the edit.
  - → no promotion needed (documented absorption per ADR-0018; ticket-tactical)
- **Plans are never deleted — preserve and mark closed (Hunter, 2026-06-05).** Retires the staged close's deletion step; this plan survives as living memory and stays open for 4.3, which dissolves the `#77` scope conflict (the plan gains a 4.3 section when that work starts). Only Zoe may later move a plan out of `.prism/plans/` (cadence-audit archive on confirmation); no persona deletes one. Deletion language reconciled tree-wide in the close pass — `branch-plan.md` § Before Closing, `skills-ecosystem.md` § Lessons, ADR-0001's consequence line, each on canonical + install seed (rule edits absorbed by Winston per ADR-0018: spec-only, coupled to the close that surfaced them); the 2026-05-23 lesson's second trip is the recurrence that triggered promotion per the taxonomy.
  - → promoted to ADR-0047 (and codified in branch-plan.md § Before Closing)
- **4.3 frontmatter ships in folded scalar style, not the issue draft's plain multiline.** The issue `#77` `frontmatter.yml` draft writes `description` as a plain YAML multi-line continuation, which `parseFrontmatter` truncates to its first line — the same constraint the 4.2 Decision above records for prism-handoff. Identical rendered string; only the YAML scalar style differs. Caught at planning (Winston, 2026-06-05); second occurrence → promoted to `skill-authoring.md` in task 4.3-5 per the lesson taxonomy.
- **4.3 skill body ships verbatim, pending normal review.** The gauntlet policy (zero-findings exit, 20-pass budget, three-strike rule, phase-boundary user gate) was calibrated against the real 4.1 run and dry-run-validated on PR `#78`; review may amend prose, not policy, without a new Hunter call.
- **4.3 doc updates ride with implementation, not a separate Eli lane** — same shape as the 4.2 absorption Decision: ~10 lines of prose tightly coupled to the registry change, same PR. Assigned to Clove at planning time, not absorbed mid-flight.
- **No new pipeline tests for 4.3.** The zero-pipeline-edit contract (ADR-0046) means there is no new behavior to lock; the second utility entry is a consumer of paths the 4.2 suite already locks (utility-adapter gate, utility+persona rejection, unknown-type rejection).

---

## History

- 2026-06-04 [hmcgrew/prism-wave3.1-writing-ac-refinements]: Plan created — Winston triaged Thrive PRs `#2044`–`#2056`, scoped a 2-sub-PR wave (governance/git-workflow rule ports + native utility-skill support with `/prism-handoff`). Caught `#2045` in the wave-3 triage gap. Rules-loading audit cleared PRISM of Thrive's loading bug; surfaced the `writing-voice.md` mis-tiering (4.1 task 8).
- 2026-06-04 [hmcgrew/prism-wave3.1-writing-ac-refinements]: Task 4.1-8 upgraded from paths-widening to always-on promotion (Hunter approved the per-session cost); see Decision "writing-voice promoted to always-on". Worktree-isolation tier inversion recorded as deferred.
- 2026-06-04 [hmcgrew/prism-wave3.1-writing-ac-refinements]: Cross-runtime tier-honoring gap routed to issue #73 (not absorbed); discovered task 4.1-8 resolves pre-existing issue #51 via its Option B — task and AC updated to carry the ADR-0035 list sync and `Closes #51`.
- 2026-06-04 [hmcgrew/prism-wave3.1-writing-ac-refinements]: `/prism-handoff` design explored with Hunter and approved — full frontmatter + body drafts embedded verbatim in tasks 4.2-6/7; see Decision "`/prism-handoff` design extends THR-1912". AGENTS.md task 13 gains the Context Window Handoff Check remedy line.
- 2026-06-04 [hmcgrew/prism-wave3.1-writing-ac-refinements]: Dry-ran the handoff spec by hand (doc handed to Clove for wave-4 implementation); caught a path-join footgun (`$TMPDIR` trailing-separator assumption) and patched the embedded draft's Step 3 with the explicit-join guard.
- 2026-06-04 [hmcgrew/prism-wave4.1-governance-git-rule-ports]: Implemented all nine 4.1 tasks, commit-per-task — four new git-conventions sections, writing-voice § Answer first + always-on promotion (ADR-0035 + dev doc synced; their Tier 2 frontmatter example re-pointed at accessibility.md since writing-voice no longer carries one), removal/rename gates, new design-governance.md, wave-3 `#2042` deferral annotated. Plan + lessons landed on main first via chore PR `#74` (wave-3 precedent); branch merged post-`#72` main mid-flight when wave 3.1 squashed. `pnpm prism:check` and `prism:check-types` green.
- 2026-06-04 [hmcgrew/prism-wave4.1-governance-git-rule-ports]: Briar self-review of PR `#76` — two Minors: AC's `#51` third leg mislocated (fixed, see AC Adjustments) and Tier 1 roster enumerations omit always-on `lazy-artifacts.md` (open, for Clove). Removal-sweep, five-surface, and ADR-claim checks all pass; `prism:check` + `check-types` green.
- 2026-06-04 [hmcgrew/prism-wave4.1-governance-git-rule-ports]: Clove fixed Briar's open Minor — `lazy-artifacts.md` added to the Tier 1 roster lists in ADR-0035, the paired dev doc, and `session-close.md` (absorbed — same gap, exhaustive-reading list), on all five surfaces. Checks green.
- 2026-06-04 [hmcgrew/prism-wave4.1-governance-git-rule-ports]: Briar follow-up review of the `5d24d21` delta — clean; no remaining Tier 1 enumerations missing lazy-artifacts anywhere in the tree, PR body sync verified. Both review issues now `fixed`; handing to Eric for PR review.
- 2026-06-04 [hmcgrew/prism-wave4.1-governance-git-rule-ports]: Eric PR review pass 1 — no Critical/Major, two Minors (ALL-CAPS lesson heading; PR-body lead overstating "each on all five surfaces"). Clove fixed both: heading now italics matching the file's emphasis style, body lead softened to Eric's wording.
- 2026-06-04 [hmcgrew/prism-wave4.1-governance-git-rule-ports]: Merged origin/main post-`#75`; resolved the wave-3 plan modify/delete by accepting the deletion (epic close wins; task 4.1-9's annotation superseded — guidance survives in this plan, see AC Adjustments). `prism:check` green; handing to Briar for the post-merge pass.
- 2026-06-04 [hmcgrew/prism-wave4.1-governance-git-rule-ports]: Briar post-merge pass — merge resolution verified correct (PR net diff carries no wave-3 plan; nothing contradicts `#75`'s close-timing rule). Two new Minors: PR body Summary stale on task-9 (per-push sync miss on `bb0844d`), task-9 text lacks supersession marker; one Cleanup (dead wave-3 lineage link). All routed to Clove.
- 2026-06-04 [hmcgrew/prism-wave4.1-governance-git-rule-ports]: Clove fixed both Minors + the Cleanup — PR body Summary/How synced via REST PATCH (Notes untouched), task 9 carries the supersession marker, AC bullet's orphanable SHA claim dropped, dead lineage link de-linked. Both issues `fixed`.
- 2026-06-04 [hmcgrew/prism-wave4.1-governance-git-rule-ports]: Briar re-swept the fix delta clean; Eric pass 3 (head `32dc85f`) — zero findings, merge resolution verified, labels `effort:glance` + `confidence:needs-judgment`, PR returned to draft per Hunter. Two human items remain: fresh-session writing-voice check, accept/reject the proposed task-9 AC adjustment.
- 2026-06-04 [hmcgrew/prism-wave4.1-governance-git-rule-ports]: Hunter ran the fresh-session check on this branch — writing-voice.md auto-loads (4.2k tokens in Memory files); AC checked off. One human item remains: the proposed task-9 AC adjustment. Worktree removed; branch now checked out in the main working copy.
- 2026-06-04 [hmcgrew/prism-wave4.1-governance-git-rule-ports]: `#74` merged on main → squash-already-upstream conflicts on plan + lessons; resolved keeping branch versions (newer on both counts — plan evolved through the review loop, lessons heading carries Eric's de-caps fix). PR `#76` mergeable again, checks green, still draft. (Entry re-appended on the 4.2 branch: its flush commit `5d43eb7` was pushed minutes after `#76`'s squash-merge, so it never reached main.)
- 2026-06-04 [hmcgrew/prism-wave4.2-utility-skill-prism-handoff]: PR `#76` merged; Hunter accepted the task-9 AC adjustment. Implemented all thirteen 4.2 tasks — `type` discriminator + build gates, `/prism-handoff` skill sources, five new tests, ADR-0046 (+ index, both surfaces), skill-authoring utility subsection (five surfaces), compatibility.md + AGENTS.md docs (Eli lane absorbed; see Decisions). `prism:build`/`check`/`check-types`/`test` all green; persona outputs byte-identical; `.agents/` adapter generated but gitignored (per-user root), so task 9's "commit `.agents/skills/`" leg doesn't apply in the dogfood install.
- 2026-06-04 [hmcgrew/prism-wave4.2-utility-skill-prism-handoff]: Winston staged the plan close — verdict sub-bullets on all 15 Decisions; utility-skill roster note promoted to skills-ecosystem.md (dogfood + install seed), the one promotion the in-flight work hadn't already made. Deletion deferred until Briar/Eric pass and the two manual-QA AC items verify, per branch-plan § Before Closing. The worktree-isolation deferral and the ADR-index 0027–0045 backfill are flagged for follow-up filing so they survive plan deletion.
- 2026-06-04 [hmcgrew/prism-wave4.2-utility-skill-prism-handoff]: Briar gauntlet pass 1 — 2 Majors (AGENTS.md:5 still claims every skill has a persona; utility-skill routing wording diverges across skills-ecosystem/AGENTS.md vs the frontmatter Triggers line) + 3 Minors (utility+persona entry validates silently; test comment misstates the opt-out signal; human compatibility page lags). All routed to Clove; `prism:check`/`check-types`/`test` green at HEAD.
- 2026-06-04 [hmcgrew/prism-wave4.2-utility-skill-prism-handoff]: Clove gauntlet fix pass 1 — all five pass-1 findings fixed: AGENTS.md persona claim scoped, routing wording harmonized to user-initiated across both doc surfaces (five copies), utility+persona entries now rejected with a locking test, test comment corrected, human compatibility page gained the utility section. Checks green, 136/136 tests.
- 2026-06-04 [hmcgrew/prism-wave4.2-utility-skill-prism-handoff]: Briar gauntlet pass 2 — fix delta (`d5daf65`) swept clean: all five fixes verified closed, tree-wide residue sweep found no stale phrasing, nothing new introduced. Self-review phase ends at zero findings; PR Readiness updated.
- 2026-06-05 [hmcgrew/prism-wave4.2-utility-skill-prism-handoff]: First real `/prism-handoff` invocation (cross-persona route to PR review, gauntlet phase handoff) — both manual-QA behavioral AC items verified and ticked. All five behavioral AC now hold; the non-behavioral `prism:check` tick lands at PR close-out per its note.
- 2026-06-05 [hmcgrew/prism-wave4.2-utility-skill-prism-handoff]: Gauntlet dry-run surfaced two 4.3 design inputs (mid-gauntlet handoffs must carry the orchestrator's rules + state; the self-review→PR-review phase boundary is a session boundary, which is also what engages the reviewer model pins) — recorded in the handoff doc's Gauntlet state section. Discovered the reviewer skills carry frontmatter model pins (self-review: sonnet, PR review: opus) that in-session Skill invocations don't switch to — a second exists-vs-honored instance (recurrence: promotion candidate per the lesson taxonomy); flagged for follow-up filing alongside the worktree-isolation and ADR-index items.
- 2026-06-05 [hmcgrew/prism-wave4.2-utility-skill-prism-handoff]: Third 4.3 design input (Hunter): the self-review→PR-review boundary is a user gate, not a fixed rule — fresh-chat-via-handoff as the recommended default (cold context + pin engagement; required on runtimes without per-skill model honoring), continue-in-session offered where pins are honored and context is quiet, anchoring tradeoff stated. Recorded in the handoff doc's Gauntlet state; the accumulated 4.3 inputs need a durable home (issue or 4.3 plan seed) before this plan deletes at close.
- 2026-06-05 [hmcgrew/prism-wave4.2-utility-skill-prism-handoff]: All 4.3 dry-run inputs consolidated into issue `#77` (gate + state-travels guardrails folded into its embedded draft; dry-run record satisfies its validation done-condition). Surfaced a scope conflict needing Hunter's call: `#77` slots the gauntlet as wave-4 sub-PR 4.3 with this plan surviving to gain a 4.3 section, while the plan's Goal says two sub-PRs and the staged close treats `#78` as final — plan-deletion timing depends on the resolution.
- 2026-06-05 [hmcgrew/prism-wave4.2-utility-skill-prism-handoff]: Eric gauntlet PR-review pass 1 (head `22dcade`) — no Critical/Major, two Minors (buildRoleMap silently accepts unrecognized `type` values; PR body counts stale since `d5daf65`); labels `effort:quick` + `review:has-minors`, PR stays draft. Clove fix pass 2: both fixed — unknown discriminators rejected with a locking test (137/137 green), PR body agent-owned counts synced via REST PATCH. Both recorded in Review Issues as `fixed`.
- 2026-06-05 [hmcgrew/prism-wave4.2-utility-skill-prism-handoff]: Eric re-review (head `93e5581`) — zero findings, both fixes verified, thread resolved; labels `effort:quick` + `confidence:needs-judgment` (the `#77` plan-survival call), draft flipped ready.
- 2026-06-05 [hmcgrew/prism-wave4.2-utility-skill-prism-handoff]: Winston ran the 4.2 close under Hunter's ruling — plans are never deleted; this plan survives and stays open for 4.3, dissolving the `#77` scope conflict. Deletion language reconciled tree-wide (branch-plan.md, skills-ecosystem § Lessons, ADR-0001, both surfaces each) and promoted to ADR-0047; final `prism:check` AC ticked. See Decision: "Plans are never deleted — preserve and mark closed".
- 2026-06-05 [main]: PR `#78` merged (`2cd308a`); Nora filed the six accumulated follow-up flags as GitHub issues `#79`–`#84` through the scope-fit gate — `#79` config.json identifiers (widened to cover the ticketSystem block pointing at a nonexistent Linear team), `#80` Zoe's plan-archive lane, `#81` worktree-isolation tier inversion, `#82` ADR README index, `#83` reviewer model pins (cross-linked to `#73`), `#84` install-layout gitignore claim. Filing tracker verified against reality first (GitHub issues, not the configured Linear team); see lessons.md 2026-06-05.
- 2026-06-05 [hmcgrew/prism-wave4.3-review-loop-skill]: Plan gained sub-PR 4.3 (issue `#77`, `prism-review-loop` utility skill) — Goal now reads three ordered sub-PRs. Winston caught the issue draft's plain-multiline frontmatter re-tripping the parseFrontmatter truncation lesson; folded-scalar fix + skill-authoring.md promotion folded into the tasks. AC extended with 4.3 criteria; dry-run AC pre-satisfied via PR `#78`'s hand-run gauntlet.
- 2026-06-05 [hmcgrew/prism-wave4.3-review-loop-skill]: Implemented 4.3 tasks 2–7, commit-per-task — registry entry + skill sources (folded-scalar divergence only), parseFrontmatter constraint promoted into skill-authoring.md § Description field shape, both utility-skill doc surfaces updated, platform outputs regenerated. Zero pipeline edits and zero new tests, per the ADR-0046 contract; `prism:check` + `prism:test` green, 137/137. All five open 4.3 AC items verified and ticked.
- 2026-06-05 [hmcgrew/prism-wave4.3-review-loop-skill]: Briar self-review pass 1 (PR `#85`) — zero findings. shared.md byte-diffed identical to the issue `#77` draft, frontmatter divergence confirmed sole, the skill-authoring rule's parseFrontmatter claims source-verified, tree-wide sweep found no stale utility enumerations; checks green at HEAD. Self-review phase closes at zero findings; verdict sub-bullets on the 4.3 Decisions deferred to Winston's task-8 close.
- 2026-06-05 [hmcgrew/prism-wave4.3-review-loop-skill]: Eric gauntlet PR-review pass 1 — no Critical/Major, two Minors (stale "first utility skill" ordinal in `docs/content` compatibility doc; bare git-conventions citations in the review-loop skill body); labels `effort:glance` + `review:has-minors`, PR stays draft. Clove fix pass 3: both fixed, AC source-match wording adjusted with Hunter's acceptance; `prism:check` + `prism:test` green, 137/137. Both recorded in Review Issues as `fixed`.

---

## Review Issues

### AC cites a Tier 1 list that doesn't exist in shared.md

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `.prism/plans/epic-prism-thrive-backport-wave-4.md` (AC, issue `#51` done-condition bullet)
- **Problem:** Task 4.1-8 and the AC name `prism-code-dev/shared.md`'s "8-rule Tier 1 list" as `#51`'s third leg, but shared.md carries no such list — the universal-load-set enumeration lives in `.prism/references/session-close.md` (the PR body already identifies it correctly).
- **Suggested fix:** Re-point the AC bullet at session-close.md — done in this review pass (see AC Adjustments).

### Tier 1 roster enumerations omit lazy-artifacts.md

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `.prism/spec/adrs/0035-rule-loading-tiers.md:26` (also `docs/content/dev/architecture/rule-loading-tiers.md:31`, `.prism/references/session-close.md:9`)
- **Problem:** `lazy-artifacts.md` carries no `paths:` frontmatter and ships in install templates — Tier 1 by the ADR's own mechanism (it loads always-on in live sessions) — yet all three roster enumerations omit it, including the two lines this PR edits to add writing-voice.
- **Suggested fix:** Add `lazy-artifacts.md` to the ADR and dev-doc lists (both lines already in this diff's local frame), or restate the lists per writing-voice § Count rules, not numbers; session-close.md's omission is pre-existing and may ride along or go to a follow-up.
- **Fixed in:** Clove follow-up commit on `hmcgrew/prism-wave4.1-governance-git-rule-ports` — `lazy-artifacts.md` added to all three lists; session-close.md absorbed (same one-rule gap, its list reads exhaustive so it was the most-wrong of the three). All five surfaces synced; `prism:check` + `check-types` green.

### PR body Summary stale after merge resolution dropped the task-9 annotation

- **Severity:** `minor`
- **Status:** `fixed`
- **Fixed in:** body PATCH 2026-06-04 — Summary bullet rewritten to current scope; merge-resolution context added to "How did you achieve it?" (Notes preserved verbatim per seed-once)
- **File:** PR `#76` body, Summary last bullet
- **Problem:** The bullet still claims "wave-3 plan's `#2042` deferral annotated with the post-`#2047` source state," but the merge resolution (8d759ef) dropped that annotation when it accepted `#75`'s deletion — the PR no longer ships it. The `bb0844d` push changed scope without the per-push body sync (`pr-description.md` § Keeping the PR in sync with scope).
- **Suggested fix:** Rewrite the bullet to state what ships now (deferral-annotation superseded by `#75`'s epic close; AC adjusted) and add a Notes line on the merge resolution.

### Task 4.1-9 text lacks a supersession marker

- **Severity:** `minor`
- **Status:** `fixed`
- **Fixed in:** plan commit on this branch — task 9 carries the supersession marker up front; SHA claim dropped from the AC bullet; dead lineage link replaced with "closed in `#75`" text (Cleanup item resolved in the same pass)
- **File:** `.prism/plans/epic-prism-thrive-backport-wave-4.md:49` (also the adjusted AC bullet's bare `1442c5b` reference)
- **Problem:** The task still instructs editing `.prism/plans/epic-prism-thrive-backport-wave-3.md`, which `#75` deleted — a cold reader of the task list can't tell it's been superseded; the AC Adjustments entry holds the truth but the task doesn't point there. The adjusted AC bullet also cites branch SHA `1442c5b` as a durable record, but squash-merge + branch deletion will orphan that SHA while the plan lives on into sub-PR 4.2.
- **Suggested fix:** Append "(superseded — wave-3 epic closed in `#75`; see AC Adjustments 2026-06-04)" to task 9; drop or soften the SHA claim in the AC bullet — the plan's own Scope boundary + Decisions are the durable record.

### AGENTS.md § Skills Ecosystem still claims every skill has a persona

- **Severity:** `major`
- **Status:** `fixed`
- **Fixed in:** gauntlet fix pass 1 — claim scoped to "most carry a dedicated persona — utility skills (ADR-0046) carry none"
- **File:** `AGENTS.md:5`
- **Problem:** "Each skill has a dedicated persona, role, and defined handoff points" is falsified by this PR — `prism-handoff` carries no persona. The PR edited AGENTS.md twice without updating the claim; classic removal-sweep miss (the all-skills-are-personas concept was retired everywhere except the sentence that states it most directly, in the always-loaded file).
- **Suggested fix:** Reword to scope the persona claim, e.g. "Each skill has a defined role and handoff points; most carry a dedicated persona — utility skills (ADR-0046) run in the invoking persona's voice."

### Utility-skill routing wording diverges across surfaces

- **Severity:** `major`
- **Status:** `fixed`
- **Fixed in:** gauntlet fix pass 1 — both doc surfaces now read "invocation is user-initiated: the `/prism-handoff` command or a direct hand-off request; personas may suggest at session close but never auto-invoke" (canonical + install seed + three mirrors; frontmatter untouched as approved)
- **File:** `.prism/architect/skills-ecosystem.md` § Utility skills (+ install seed and three platform mirrors); `AGENTS.md` utility-skills bullet
- **Problem:** skills-ecosystem says "explicit `/prism-handoff` invocation only" and AGENTS.md says "Invoke it on explicit `/prism-handoff` only, when the user asks to hand off…" — while the frontmatter description (the routing surface) carries a `Triggers:` line of user phrases. A cold router reading the two always-loaded docs can't tell whether a user's "hand off" request should route; the docs and the routing surface disagree. Doc-class diverged claim.
- **Suggested fix:** Harmonize both doc surfaces to the design intent (plan Decision "Trigger integration"): invocation is *user-initiated* — the `/prism-handoff` command or a direct hand-off request; personas may suggest it at session close but never auto-invoke. Frontmatter stays as approved.

### buildRoleMap silently accepts a contradictory utility-with-persona entry

- **Severity:** `minor`
- **Status:** `fixed`
- **Fixed in:** gauntlet fix pass 1 — `buildRoleMap` throws on utility+persona; locked by the `rejects a utility entry that carries a persona` test
- **File:** `scripts/ai-skills/build.ts` (`buildRoleMap`)
- **Problem:** `{ id, persona, type: "utility" }` validates without complaint; the persona is silently inert (the agent-adapter path is gated off). A lying registry entry is exactly the failure ADR-0046's honest-data rationale exists to prevent.
- **Suggested fix:** Throw when a utility entry carries `persona`; add a test locking the contract.

### Test comment misstates the build's opt-out signal

- **Severity:** `minor`
- **Status:** `fixed`
- **Fixed in:** gauntlet fix pass 1 — comment now states what the skip does (root absent locally, e.g. gitignored Codex root on a fresh clone)
- **File:** `scripts/ai-skills/discovery-metadata.test.ts` (utility-adapter repo-state test)
- **Problem:** The comment claims the bare `pathExists(root)` skip is "the same opt-out signal the build's check mode uses" — but check mode keys on managed-content markers (`skillsRootHasManagedContent`), not directory existence. Wrong claim about an invariant, sitting next to the code it describes.
- **Suggested fix:** Reword the comment to what the skip actually does (skip platforms whose skills root doesn't exist locally), or adopt the marker-based signal.

### Human-facing compatibility page lags the utility-skill concept

- **Severity:** `minor`
- **Status:** `fixed`
- **Fixed in:** gauntlet fix pass 1 — "Persona vs utility skills" section added to the page, citing ADR-0046
- **File:** `docs/content/dev/ai-skills/compatibility.md`
- **Problem:** The agent-facing `.ai-skills/docs/compatibility.md` names this page as its "longer narrative" companion and gained the Persona vs Utility subsection; the companion now lags by a shipped concept (no false claim, but a reader following the companion link finds no mention of utility skills).
- **Suggested fix:** One short paragraph mirroring the new subsection (utility skills: skill adapters in all runtimes, no agent adapter, cite ADR-0046) — ride-along scale.

### buildRoleMap accepts unrecognized type values

- **Severity:** `minor`
- **Status:** `fixed`
- **Fixed in:** gauntlet fix pass 2 — unknown discriminators now throw before the persona check; locked by the `rejects an unrecognized type value` test (built via `JSON.parse` to mirror the unchecked production cast)
- **File:** `scripts/ai-skills/build.ts` (`buildRoleMap`)
- **Problem:** The registry loads through an unchecked JSON cast, so the `"persona" | "utility"` union never reaches runtime — a typo'd `type` (e.g. `"utilty"`) with a persona silently builds as a persona and ships an agent adapter; without a persona it throws a misleading missing-persona error.
- **Suggested fix:** Throw on any `type` other than `"persona"`/`"utility"`; add a locking test.

### PR body lagged the fix-pass scope in agent-owned sections

- **Severity:** `minor`
- **Status:** `fixed`
- **Fixed in:** gauntlet fix pass 2 — Summary test count and pre-submit checklist synced via REST PATCH to post-fix state (seven new tests, 137/137); Notes preserved verbatim per seed-once
- **File:** PR `#78` body (Summary; pre-submit checklist)
- **Problem:** Summary said "Five new tests" and the checklist "135/135" after `d5daf65` added the sixth test (136/136) — a per-push body-sync miss; squash-merge would freeze the stale counts into main history.
- **Suggested fix:** Sync the agent-owned sections on the next push. The Notes manual-QA bullet is user-owned/seed-once — Hunter may clear it now that the 2026-06-05 invocation verified both items.

### Published compatibility doc carries a stale utility-skill ordinal

- **Severity:** `minor`
- **Status:** `fixed`
- **Fixed in:** gauntlet fix pass 3 — reworded to the example form (`e.g. prism-handoff, prism-review-loop`), matching the canonical doc's count-rule-safe phrasing
- **File:** `docs/content/dev/ai-skills/compatibility.md:19`
- **Problem:** The published doc said "`prism-handoff` is the first" utility skill — a roster claim this PR's second utility skill makes false on arrival; the 4.3 tree-wide sweep covered `.prism/`/`.ai-skills/` but not `docs/content/`.
- **Suggested fix:** Example form per `writing-voice.md` § Count rules, not numbers — done this pass.

### Review-loop skill body cites git-conventions without a resolvable path

- **Severity:** `minor`
- **Status:** `fixed`
- **Fixed in:** gauntlet fix pass 3 — both citations expanded to `` `.prism/rules/git-conventions.md` § ... `` in canonical shared.md; platform outputs regenerated
- **File:** `.ai-skills/skills/prism-review-loop/shared.md:10,54`
- **Problem:** Bare `git-conventions § ...` citations give the runtime agent no path to the rule, unlike peer skill bodies that cite the full `.prism/rules/` path.
- **Suggested fix:** Expand both citations; AC "sole divergence" wording adjusted with Hunter's acceptance (see AC Adjustments) since this is a second documented divergence from the issue `#77` draft — prose amendment sanctioned by the verbatim-shipment Decision.

---

## Acceptance Criteria

> Phase work, no Linear ticket — Linear AC sync skipped per wave-3 precedent. These are developer-verification criteria for the wave's two PRs.

### Behavioral

- [x] Given a skill declares `type: "utility"` in the role registry, when the build runs, then skill adapters are generated for all three runtimes and no Codex agent adapter is created for it. (Verified 2026-06-04: build run + the `utility skills generate skill adapters but no codex agent adapter` test.)
- [x] Given a utility entry with no persona, when the build runs, then it completes without the missing-persona error. (Verified 2026-06-04: build run + `buildRoleMap` tests.)
- [x] Given the existing persona skills, when the build re-runs after the change, then their generated outputs are unchanged. (Verified 2026-06-04: `prism:check` green with zero diffs to pre-existing generated files.)
- [x] Given `/prism-handoff` is invoked, when it completes, then a handoff document exists at a unique branch-namespaced path under the OS temp directory and that absolute path is reported back as the final output. (Verified 2026-06-05: first real invocation, on this branch — doc at `$TMPDIR/prism-handoffs/<branch-slug>/20260605T145545Z-f94871f2.md`, path reported as final output; the explicit-join guard handled macOS's `/var/folders/...` TMPDIR.)
- [x] Given a handoff document, when it is written, then it references existing artifacts by path rather than duplicating them and contains no secrets. (Verified 2026-06-05: same invocation — Artifacts section is paths/URLs only; no credentials or PII.)
- [x] Given the role registry carries the review-loop utility entry, when the build runs, then skill adapters generate for all three runtimes and no Codex agent adapter is created for it (REQ — issue `#77` done condition) (Verified 2026-06-05: build run — SKILL.md generated under `.claude/`, `.cursor/`, and the gitignored `.agents/`; no `.codex/agents/prism-review-loop.toml`.)
- [x] Given the generated review-loop skill files, when discovery metadata reads the description, then the full description — through "review until clean" — is present, not truncated to the first line (REQ — parseFrontmatter constraint, see Decisions) (Verified 2026-06-05: grep on both committed SKILL.md files; the live session roster also surfaced the full description.)
- [x] Dry-run validation: one real invocation of the gauntlet flow on a draft PR (satisfied pre-implementation — hand-run as PR `#78`'s review process, 2026-06-04/05; recorded in issue `#77` § Dry-run findings)

### Non-behavioral

- [x] `pnpm prism:check` green after each sub-PR. (4.1: green 2026-06-04, `check-types` also green; 4.2: green at close-out 2026-06-05 — `prism:check` passed, 137/137 tests.)
- [x] Every rule edit present on all five surfaces (canonical + four mirrors).
- [x] No Thrive-session specifics in ported prose: no THR-NNNN references, no WordPress nouns, no Thrive incident narration (ADR-0032).
- [x] `writing-voice.md` loads in every session (always-on tier — no frontmatter gating) on all five surfaces. (Frontmatter verified stripped on all five; Hunter ran the fresh-session spot check 2026-06-04 on this branch — writing-voice.md listed in the auto-loaded Memory files at 4.2k tokens.)
- [x] ADR-0035's Tier 1 example list, its paired dev doc, and `session-close.md`'s universal-load-set list all agree that writing-voice is Tier 1 (issue `#51` done condition).
- [x] The `#2042` deferral's post-`#2047` end-state guidance is durably recorded (originally as a wave-3 plan annotation per task 4.1-9; superseded when PR `#75` closed that epic and deleted its plan — the guidance now lives in this plan's Scope boundary and Decisions).
- [x] ADR-0046 exists, records the rejected alternatives, and is indexed. (Both surfaces; index gap for 0027–0045 is pre-existing — see Cleanup Items.)
- [x] `pnpm prism:check` and `pnpm prism:test` green after sub-PR 4.3 (Verified 2026-06-05: both green at implementation HEAD, 137/137 tests.)
- [x] 4.3 skill source matches the issue `#77` drafts, with documented divergences only: the frontmatter description's YAML scalar style and the review-amended citation paths in shared.md (REQ — see Decisions and Review Issues) (Verified 2026-06-05: shared.md otherwise verbatim; frontmatter line content identical, only `description: >` added; citation amendment accepted by Hunter in the Eric pass-1 fix.)
- [x] Every always-loaded surface that enumerates utility skills (AGENTS.md, skills-ecosystem.md) names `prism-review-loop` (Verified 2026-06-05: AGENTS.md roster bullet + skills-ecosystem § Utility skills, canonical + install seed + regenerated mirrors.)
- [x] The wave-4 plan carries a sub-PR 4.3 section referencing issue `#77`; Goal reads three ordered sub-PRs (issue `#77` done condition — satisfied at plan write, 2026-06-05)

### AC Adjustments

- 2026-06-04 (Briar): Re-pointed the `#51` done-condition bullet from `prism-code-dev/shared.md` (which has no Tier 1 list) to `.prism/references/session-close.md`'s universal-load-set enumeration — matches what was actually built and verified. See Review Issues.
- 2026-06-04 (Clove): **Status: accepted** (Hunter, 2026-06-04, post-`#76`-merge). Task 4.1-9's bullet ("Wave-3 plan's `#2042` deferral carries the annotation") became unsatisfiable when PR `#75` closed the wave-3 epic and deleted its plan after the annotation was committed. Rewrote the bullet to name the surviving durable record (this plan's Scope boundary + Decisions; branch history `1442c5b`). No implementation rides on this.
- 2026-06-05 (Clove): **Status: accepted** (Hunter, 2026-06-05, Eric pass-1 fix). Reworded the 4.3 source-match bullet from "YAML scalar style as the sole, documented divergence" to "documented divergences only" (scalar style + review-amended citation paths in shared.md) — Eric's citation-path Minor is a prose amendment the verbatim-shipment Decision sanctions, but it makes a second divergence the AC wording had ruled out.

### AC Sync Log

| Date | Agent | Action | Plan | Linear |
| ---- | ----- | ------ | ---- | ------ |
| 2026-06-04 | Winston | Generated AC | updated | N/A — no Linear ticket (phase work) |
| 2026-06-04 | Briar | Refined AC from 4.1 self-review (re-pointed `#51` third leg; ticked verified items) | updated | N/A — no Linear ticket (phase work) |
| 2026-06-04 | Clove | Task-9 adjustment accepted by Hunter; ticked 4.2 items verified by build + tests | updated | N/A — no Linear ticket (phase work) |
| 2026-06-05 | Winston | Generated 4.3 AC (issue `#77` done conditions; dry-run item pre-satisfied) | updated | N/A — no Linear ticket (phase work) |
| 2026-06-05 | Clove | Citation-divergence adjustment accepted by Hunter; source-match bullet reworded | updated | N/A — no Linear ticket (phase work) |

---

## Cleanup Items

- ~~`.prism/plans/epic-prism-thrive-backport-wave-4.md:5` — lineage link to `epic-prism-thrive-backport-wave-3.md` went dead when `#75` deleted the file~~ — resolved: link replaced with "epic closed in `#75`, plan deleted" text.
- `.prism/spec/adrs/README.md` (+ templates mirror) — the index table skips 0027–0045; surfaced while adding the 0046 row. Pre-existing, not absorbed in 4.2 — follow-up candidate (backfill the rows or restate the index's inclusion rule).

---

## PR Readiness

Scope: sub-PR 4.3 (PR `#85`, draft). Sub-PRs 4.1 (PR `#76`) and 4.2 (PR `#78`) merged 2026-06-04/05.

- [x] No critical or major issues (Briar pass 1: zero findings — shared.md byte-identical to the issue `#77` draft, frontmatter divergence confirmed sole, parseFrontmatter rule claims source-verified against `utils.ts`)
- [x] Types correct — no `any`, no unsafe `as` (`pnpm prism:check-types` green; diff carries no TS)
- [x] No stray console.logs or debug artifacts
- [x] Tests written for new logic and edge cases (none needed per Decisions — zero pipeline edits; the 4.2 suite locks the utility paths generically)
- [x] All debugged issues resolved (no `open` entries)
- [x] Build passes — last run: 2026-06-05 (`prism:build` + `prism:check` + `prism:test` 137/137 green at implementation HEAD)
- [x] PR description up to date (authored this session at PR open)
- [ ] Lasting decisions promoted to architect context — in-flight promotion done (parseFrontmatter → skill-authoring.md, task 5); verdict sub-bullets on the four 4.3 Decisions land with Winston's task-8 epic close on this branch

**Last updated:** 2026-06-05 (Briar, 4.3 self-review pass 1 — clean)
