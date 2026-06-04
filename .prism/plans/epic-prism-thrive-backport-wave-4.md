# Plan: epic-prism-thrive-backport-wave-4

## Ticket

PRISM Thrive backports, fourth wave (no Linear ticket; phase work). Follows [`epic-prism-thrive-backport.md`](./epic-prism-thrive-backport.md) (Wave 1, Thrive PRs through ~#2024), [`epic-prism-thrive-backport-wave-2.md`](./epic-prism-thrive-backport-wave-2.md) (#2025–#2027), and [`epic-prism-thrive-backport-wave-3.md`](./epic-prism-thrive-backport-wave-3.md) (#2032–#2043).

## Goal

Absorb the incident-born governance and git-workflow rules from Thrive PRs `#2047`–`#2049` and `#2056`, and break PRISM's all-skills-are-personas assumption by implementing utility-skill support natively — shipping `/prism-handoff` as the first utility skill from the architecture resolved in Thrive's THR-1912 plan — across two ordered sub-PRs.

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

Two ordered sub-PRs. Sub-PR 4.1 is a single PR (user-confirmed 2026-06-04 — no further split). Rule-edit mechanics for every 4.1 task: edit the canonical `.prism/rules/<file>`, propagate to the four mirrors (`templates/install/.prism/rules/`, `.claude/rules/`, `.codex/rules/`, `.cursor/rules/` — wave 3.1 precedent shows all five surfaces move together; if `pnpm prism:build` does not regenerate the rule mirrors, mirror manually with token substitution as 3.1 did), then `pnpm prism:check` green.

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

9. **Annotate the wave-3 `#2042` deferral** (bookkeeping). In `.prism/plans/epic-prism-thrive-backport-wave-3.md`, Decision "#2042 (preamble generator) deferred": append a sub-bullet noting Thrive `#2047` (merged 2026-06-01) deleted the manifest × `paths:` join engine and added a fail-loud link-rebase guard — if the revisit trigger ever fires, port the post-`#2047` end-state, not the `#2042`-era shape.

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

---

## Decisions

- **Wave sourced partly from open Thrive PRs — annotated, not blocked.**
  - **Root cause:** `#2048`, `#2049`, `#2056` are still in review on Thrive at triage time (2026-06-04); only `#2047` is merged. Prior waves ported merged PRs only.
  - **Alternatives considered:** wait for merges (stalls PRISM on Thrive's review latency, for content Hunter authored and stands behind); port verbatim and diff later (imports churn risk).
  - **Chosen approach:** port now. ADR-0032 forces a prose rewrite anyway, so Thrive review churn on *wording* can't drift PRISM; only substance changes would. Source-PR state recorded here; a later wave reconciles if Thrive review changes substance.
  - **Implementation guidance:** each 4.1 task cites its source PR; porters work from the principle, never the prose.
- **Utility-skill support implemented natively (leapfrog), not ported.**
  - **Root cause:** Thrive `#2045` is a draft carrying only the THR-1912 branch plan — there is no implementation diff to port. The architecture is resolved in that plan: `type` discriminator in the role registry, agent-adapter gate, rejected fake-persona and bare-slash-command alternatives.
  - **Chosen approach:** PRISM implements from the resolved decisions against its own pipeline (`build.ts`, verified line-level targets in tasks 4.2-2..5). PRISM landing before Thrive is acceptable — the dogfood flow reverses occasionally; the decisions are settled, only Thrive's keystrokes are pending.
- **The discriminator is generic — built for the utility-skill pipeline, not just `/prism-handoff`.** Hunter has more utility skills incoming (shapes TBD). Adding one = a `roles.json` entry + a skill source directory; zero pipeline edits. The gate stays single-purpose: utility ⇒ no persona requirement, no agent adapter — nothing else forks on type.
- **`prism-handoff` is function-descriptive with no persona** — per `skill-authoring.md § Persona name vs. slash-command ID`; a handoff is an action, not a role. Considered: naming a persona for it. Rejected: a persona nobody switches into is a permanent lie in the data model (THR-1912's own finding).
- **`/prism-handoff` design extends THR-1912 with four PRISM-specific behaviors** (explored and user-approved 2026-06-04; full draft embedded in tasks 4.2-6/7).
  - **Root cause:** the user's value case is context hygiene, not just continuation — shed a long mixed session's conversation tail (token cost paid on every message) while keeping the work item's state; hand back to the same persona or route to another.
  - **Flush-before-handoff:** plan-worthy state promotes to the branch plan *before* the doc is written; the doc carries only the residue (in-flight reasoning, open threads, user framing). Guards the shadow-plan failure mode — a second memory surface drifting against the plan. A thin handoff doc means the plan discipline worked.
  - **Two shapes keyed on args:** same-persona resume (default) vs cross-persona route (`persona:` prefix → next-action brief). Args double as scope filter; excluded threads land in a `## Dropped` manifest so loss is visible, not silent.
  - **Trigger integration:** explicit invocation stays (THR-1912's call), but AGENTS.md § Context Window Handoff Check gains `/prism-handoff` as its named remedy — personas suggest, never auto-invoke.
  - **Timing guidance in-body:** hand off while the summarizer is sharp (~20+ messages), not at 95% context — a degraded agent writes a degraded summary exactly when it matters most.
- **Handoff path contract: unique branch-namespaced path under OS tmp; path-as-token; read-side never scans tmp.** A fixed shared path causes collisions and stale reads (documented Thrive incident); branch is the namespace key because it's always available. Cross-session, same-machine, single-user scope — no repo path, no cross-person sharing.
- **Rules-loading audit (this session): PRISM does NOT have Thrive's rules-not-loading issue.** 8 ungated rules load every session; 8 path-gated rules load contextually — observed firing correctly mid-session (`skill-authoring.md`, `worktree-isolation.md`). Thrive's historical breakage predates its THR-1900 generated-loader pipeline (hand-maintained fan-out drifted); PRISM inherited the generated shape from day one.
- **`writing-voice.md` promoted to always-on (replaces the paths-widening fix).**
  - **Root cause:** path gating only sees file edits, but writing-voice's most common surfaces are not files — commit messages, PR bodies written via `gh api`, Linear comments. No `paths:` glob can ever match them; widening paths fixes only the file-surface gap (`.prism/**`, `.ai-skills/**`) and leaves the non-file gap open.
  - **Alternatives considered:** widen paths only (original 4.1 task 8) — rejected, structurally can't cover non-file writing; leave gated and rely on personas remembering — rejected, that's the hand-maintained drift Thrive already paid for.
  - **Chosen approach:** always-on tier, mirroring Thrive `#2037` Phase 1E ("writing-voice → Tier 1 + chat scope"), which wave 3 had triaged as a low-value follow-up — the wave-4 audit revalidated it. Cost accepted by Hunter (2026-06-04): ~2.3k tokens/session on a ~11.2k always-on base, paid by every consumer via install templates.
  - **Implementation guidance:** 4.1 task 8 — strip frontmatter on all five surfaces, match the existing always-on rules' per-surface shape.
- **Cross-runtime tier honoring flagged, NOT absorbed — routed to issue #73.** The wave-4 audit found the ADR-0035 tier model is honored by Claude Code only: the build's `platformContentCopies` step copies rule content verbatim, so Cursor receives `.md` files with a `paths:` key its `.mdc`/`globs:`/`alwaysApply:` dialect doesn't read, and Codex (which auto-loads only AGENTS.md) reaches `.codex/rules/` solely via prose pointers. The fix is the dialect-emission subset of Thrive THR-1900 (Cursor `.mdc` translation + Codex AGENTS.md inlining) — a pipeline feature the size of sub-PR 4.2, deliberately kept out of this wave. Issue #73 carries the verification spike + done condition; coordinates with issue #64 (agents-md-slim), which owns AGENTS.md.
- **Issue #51 (writing-voice tier conflict) resolved by this wave via its Option B.** The pre-existing shared.md-vs-ADR-0035 disagreement on writing-voice's tier needed an intent decision; the wave-4 audit supplied the rationale (path gating structurally misses non-file writing surfaces) and Hunter picked promotion. Task 4.1-8 carries the mechanics; the sub-PR closes `#51`.
- **`worktree-isolation.md` tier inversion noted, deferred.** It gates on `.prism/**` + `scripts/**` (fires nearly every PRISM session) but is relevant only to worktree-mode review — candidate to fold into the `worktree-mode.md` reference Eric already loads (~600 tokens/session saved). Not approved this wave; revisit if always-on budget becomes a concern.
- **Sub-PR 4.1 ships as a single PR** (user-confirmed) — all sub-30-line content edits in the same `.prism/rules/` neighborhood; splitting adds review overhead without isolation value.

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

---

## Acceptance Criteria

> Phase work, no Linear ticket — Linear AC sync skipped per wave-3 precedent. These are developer-verification criteria for the wave's two PRs.

### Behavioral

- [ ] Given a skill declares `type: "utility"` in the role registry, when the build runs, then skill adapters are generated for all three runtimes and no Codex agent adapter is created for it.
- [ ] Given a utility entry with no persona, when the build runs, then it completes without the missing-persona error.
- [ ] Given the existing persona skills, when the build re-runs after the change, then their generated outputs are unchanged.
- [ ] Given `/prism-handoff` is invoked, when it completes, then a handoff document exists at a unique branch-namespaced path under the OS temp directory and that absolute path is reported back as the final output.
- [ ] Given a handoff document, when it is written, then it references existing artifacts by path rather than duplicating them and contains no secrets.

### Non-behavioral

- [ ] `pnpm prism:check` green after each sub-PR. (4.1: green 2026-06-04, `check-types` also green; 4.2 pending)
- [x] Every rule edit present on all five surfaces (canonical + four mirrors).
- [x] No Thrive-session specifics in ported prose: no THR-NNNN references, no WordPress nouns, no Thrive incident narration (ADR-0032).
- [ ] `writing-voice.md` loads in every session (always-on tier — no frontmatter gating) on all five surfaces. (Frontmatter verified stripped on all five; mechanism confirmed by parity — frontmatter-less rules load always-on in live sessions. Fresh-session spot check still pending per PR `#76` Notes.)
- [x] ADR-0035's Tier 1 example list, its paired dev doc, and `session-close.md`'s universal-load-set list all agree that writing-voice is Tier 1 (issue `#51` done condition).
- [x] Wave-3 plan's `#2042` deferral carries the post-`#2047` end-state annotation.
- [ ] ADR-0046 exists, records the rejected alternatives, and is indexed.

### AC Adjustments

- 2026-06-04 (Briar): Re-pointed the `#51` done-condition bullet from `prism-code-dev/shared.md` (which has no Tier 1 list) to `.prism/references/session-close.md`'s universal-load-set enumeration — matches what was actually built and verified. See Review Issues.

### AC Sync Log

| Date | Agent | Action | Plan | Linear |
| ---- | ----- | ------ | ---- | ------ |
| 2026-06-04 | Winston | Generated AC | updated | N/A — no Linear ticket (phase work) |
| 2026-06-04 | Briar | Refined AC from 4.1 self-review (re-pointed `#51` third leg; ticked verified items) | updated | N/A — no Linear ticket (phase work) |

---

## PR Readiness

Scope: sub-PR 4.1 (PR `#76`). Sub-PR 4.2 not yet started.

- [x] No critical or major issues (two Minors found in self-review — both fixed)
- [x] Types correct — no `any`, no unsafe `as` (no runtime code in diff; `pnpm prism:check-types` green)
- [x] No stray console.logs or debug artifacts
- [x] Tests written for new logic and edge cases (N/A — markdown-only diff; mirror fidelity guarded by `pnpm prism:check`)
- [x] All debugged issues resolved (no `open` entries)
- [x] Build passes — last run: 2026-06-04 (`pnpm prism:check` + `prism:check-types`; full app build N/A for rule/doc content)
- [x] PR description up to date (stacked-on-`#74` note accurate; `#74` still open — refresh branch once it merges, picking up `#75` on main at the same time)
- [ ] Lasting decisions promoted to architect context (plan stays open for sub-PR 4.2)

**Last updated:** 2026-06-04 (Briar, 4.1 self-review)
