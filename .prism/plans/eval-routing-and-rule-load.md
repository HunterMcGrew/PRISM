# Architecture Evaluation: Skill-Routing Completeness & Explicit Rule-Load Declaration

> Status: evaluation — awaiting human ratification. No issue numbers exist yet; Nora files
> the issues after ratification. This document is the architecture record both issues will
> cite; per-issue plans are created by Winston plan-mode once issues exist.
>
> Evidence provenance: upstream tree at `2d1d6bb` (main), plus a freshly onboarded consumer
> repo (`/Users/hunter/Documents/Projects/Event`) used read-only as evidence. Consumer
> claims arrived via handoff and were re-verified where the upstream tree could confirm them.

---

## Verified Findings

### Defect 1 — the auto-routing surface is incomplete relative to the registry

| Claim | Verdict | Evidence |
| --- | --- | --- |
| `roles.json` registers 28 personas + 3 utilities | **Confirmed** | `.ai-skills/definitions/roles.json` — 28 `persona` entries, 3 `type: "utility"` entries (`prism-handoff`, `prism-review-loop`, `prism-skill-forge`) |
| Routing table routes 12 personas; onboarding clause adds Atlas = 13 | **Confirmed** | `.prism/rules/skill-routing.md` — table rows: Clove, Winston, Sasha, Eric, Nora, Mira, Briar, Pixel, Reese, Sage, Eli, Sol; Atlas via the onboarding-intent clause |
| 15 personas omitted (Iris, Parker, Ren, Lilac, Theo, Zoe, Vera, Kora, Ellis, Charlie, Quinn, Tess, Remy, Penny, Lex) | **Confirmed** | 28 − 13 = 15; none of the listed ids appear anywhere in the rule |
| `prism-skill-forge` missing from the utility section | **Confirmed** | Rule's Utility skills section names only `prism-handoff` and `prism-review-loop` |
| Canonical and install-seed routing rules are byte-identical | **Does NOT hold upstream** | `shasum -a 256`: canonical `8a4b43f3…`, seed `0883b7fc…`. The consumer's copy matches the *seed* hash — so the substantive claim (consumer copy came straight from the install seed; Atlas never rebuilt it) **holds**. But the seed twin has drifted behind canonical: PRISM-380 (`7ef3380`) de-Linear-ized canonical prose ("shares a ticket ID", "never code, tracker writes, or merges") and did not touch the seed twin, which still ships "Linear" literals to consumers. Curated seeds are only checked for *existence*, not parity (`seed-curation.json` `curated`; see issue-302 plan Task 3 rationale) — so this drifted silently. |
| No statement declares the omissions intentional | **Confirmed with nuance** | The routing rule carries no selective-routing policy. `skills-ecosystem.md` does say cadence personas (Zoe, Atlas, Iris) "are invoked explicitly," and Zoe's own description says "Explicit invocation only" — partial intent exists for the cadence four, none for the 9 business personas, Parker, or Lilac. |
| No generation or validation ties the table to the registry | **Confirmed** | `grep -rn "skill-routing" scripts/ai-skills/*.ts` → zero hits. The table is hand-maintained prose with no gate. |
| **New finding:** `skills-ecosystem.md` roster also omits the business personas | **Confirmed** | `grep -c "Vera\|Kora\|Lex\|Penny" .prism/architect/_toolkit/skills-ecosystem.md` → 0. The roster doc every skill loads on startup doesn't know 9 of the 28 personas exist. |

Softening note on impact: the loss is partial, not total. Skill frontmatter `description` fields still carry per-skill triggers (skill-authoring.md calls `description` "the routing surface"), so *named* invocation ("Vera", "Zoe") still resolves on Claude. What the omission breaks is bare-agent *intent* detection ("what should our pricing be" never routes to Ellis), the announce-then-invoke protocol coverage, and Codex/Cursor parity — and it silently recurs on every roster addition.

### Defect 2 — always-on rules are selected by missing metadata

| Claim | Verdict | Evidence |
| --- | --- | --- |
| Tier-1 = any rule without `paths:` frontmatter; `CODEX_INLINE_EXCLUDE` empty | **Confirmed** | `scripts/ai-skills/agents-md-block.ts:116` (`/^paths:/m` test), `:68` (empty exclude set). JSDoc cites ADR-0035's discriminator. |
| Upstream tier split | **Confirmed** | 29 canonical rules: 21 no-`paths:` (treated Tier-1), 8 with `paths:` (Tier-2). `branch-plan.md` 439 lines Tier-1; `pr-description.md` 83 lines Tier-1; `verification-before-done.md` 13 lines Tier-1. |
| Tier-3 is structurally indistinguishable from Tier-1 | **Confirmed — sharper than reported** | ADR-0035 defines Tier-3 as "no manifest entry, skill references by path" — but a Tier-3 rule file also has no `paths:`, so the classifier would inline it as always-on. The only Tier-3 opt-out is `CODEX_INLINE_EXCLUDE`, a hand-maintained empty list. The tier model is sound; its *machine-readable encoding* is lossy. |
| No consumer-side seam regenerates the AGENTS Tier-1 block | **Confirmed** | The CLI's subcommands are `init/adopt/update/doctor/eject` (`cli.ts:40-56`). `syncAgentsMdTier1Block` is called only from upstream `build.ts:937`. `adopt` seeds an *empty* marker pair and prints "run `pnpm prism:build`" — a script consumers don't have wired. Event evidence: `AGENTS.md` 1,590 lines, 22 embedded rule bodies, 4 Atlas-generated stack rules (no `paths:`) created after the last fill and not embedded. A rebuild would silently raise the always-on set 22 → 26 with no one deciding that. |
| Classification quality of specific rules | **Confirmed** | `pr-description.md` is action-scoped (fires when authoring a PR body — no path glob can express that). `branch-plan.md`'s essential contract is a fraction of its 439 lines; the template, issue schemas, and close ceremony are trigger-shaped. `verification-before-done.md` (13 lines) is correctly always-on. |

### Prior art, checked

- **`issue-302-skill-routing-claude-blind.md`** — created the routing rule (PR #303, merged). Solved platform visibility; copied the then-current 12-row table verbatim. Roster completeness was never in its scope. The plan carries no `> Closed:` marker but its work shipped — do **not** append this work to it; it gets its own issue.
- **`agents-md-slim.md`** (issue #64) — established that moving content between two *always-on* surfaces saves zero chat-load tokens. This constrains Defect 2's framing: the win from reclassifying `pr-description.md` or splitting `branch-plan.md` is real only because content moves *out of the always-on set entirely* (to skill-triggered load) — that is a genuine load reduction, not the refuted shuffle.
- **`epic-lean-skill-architecture.md`** (Closed 2026-06-05) — PIN/EXTERNALIZE/CATALOG/CUT is the disclosure taxonomy; this evaluation reuses it (the branch-plan split is an EXTERNALIZE call at the rule layer). ADR-0045 and `skill-authoring.md` carry it durably.
- **ADR-0035** — owns the tier model and the word "tier". This evaluation *keeps the three-tier model* and changes only its encoding (implicit absence → explicit declaration). A new ADR amends 0035; nothing supersedes it.
- **Gate precedents** — `verify-pack-parity.ts` (declared runtime-read paths vs. `npm pack` output) and `verify-manifest-coverage.ts` (manifest contract vs. persona scopes) are the established shape: a small script asserting a registry and a derived surface agree, wired into `prism:check`/`prism:test`. Both new gates instantiate this pattern.
- **Open GitHub issues** — #415 (crossref-lint gate), #413 (eval layer), #404 (back-port portable roster), #288, #235. **No duplicates.** #404 is adjacent (roster quality parity portable↔canonical) but does not cover either defect; note the relationship in the issue bodies.

---

## Root-Cause Framing

Both defects — and the two additional instances found during verification — are the same failure:

> **A PRISM-owned enumeration of a growing collection is maintained by hand, and no gate
> fails when the collection grows past the enumeration.**

Four live instances, one class:

1. Routing table (`skill-routing.md`) vs. persona registry (`roles.json`) — 15 personas behind.
2. Consumer AGENTS Tier-1 block vs. the consumer's rules directory — 4 rules behind, and the classifier that would refill it decides membership by *absence* of metadata.
3. Curated seed twin (`templates/install/.prism/rules/skill-routing.md`) vs. canonical — one genericization pass behind, shipping "Linear" literals.
4. `skills-ecosystem.md` roster vs. `roles.json` — 9 personas behind.

This is `writing-voice.md § Count rules, not numbers` operating at the architecture level: the tree holds *observations* about the roster and rule set where it needs *rules* — and where the rule can't be self-enforcing prose, it needs a machine gate. The repo already knows how to build these gates (pack-parity, manifest-coverage); it just never pointed one at these surfaces.

---

## Defect 1 — Options and Recommendation

### Options considered

- **(a) Blanket completeness — every registered persona gets an auto-route row.** Rejected: some personas are deliberately not intent-routed. Zoe declares "Explicit invocation only"; Theo, Ren, and Iris are cadence/ceremony-shaped, invoked at bound events, not on conversational signals. Blanket rows would make the bare agent fire Iris on "how did that go?" — a real misroute cost. Rethink: is "deliberate" actually documented? Partially (ecosystem cadence paragraph, Zoe's description) — the policy is real but scattered and unenforceable. The rejection stands; the fix is to make the policy *explicit and machine-checked*, not to erase it.
- **(b) Fully generate the routing table from the registry.** Signal phrases would move into `roles.json` (or be extracted from skill frontmatter at build time) and the table would become a rendered artifact. Rejected — but this was the closest call, so the rethink in full: generation kills prose drift as well as membership drift, and frontmatter `description` fields already carry per-skill triggers. It loses because (1) the table's Signal-phrases column is curated routing prose beyond the frontmatter triggers (behavioral signals like "starts editing files" have no frontmatter home), so generation either flattens the table or pushes writing-voice-governed prose into JSON; (2) the observed failure is *set membership*, which a validator catches completely at a fraction of the build-surface change; (3) validation is forward-compatible — if prose drift later proves real, generation can be layered on and the validator stays as the gate. Not a lazy rejection: genuinely worse cost/benefit today, revisit if the table's prose demonstrably rots.
- **(c) Validate: registry carries an explicit routing policy; a test asserts the rule and the registry agree.** **Accepted.**
- Sub-option on the policy enum — `auto` / `explicit-only` / `cadence-only`: rejected the three-value form. For *routing* purposes cadence-only and explicit-only behave identically (route on name or explicit phrase; never on ambient intent). Cadence is scheduling metadata and already lives in `skills-ecosystem.md`. Two values: **`auto`** and **`named-only`**.

### Recommendation (Defect 1): **Proceed — validate, don't generate**

1. Every entry in `.ai-skills/definitions/roles.json` gains a required `routing` field: `"auto"` or `"named-only"`. Utilities are `"named-only"` (user-initiated by definition — matches skill-routing.md's existing utility framing).
2. `.prism/rules/skill-routing.md` gains the missing content: table rows for every `auto` persona, and a new compact `## Named-invocation personas` section listing every `named-only` persona and utility (one line each: name, id, one-clause purpose) — so the bare agent can still route "Zoe, what's stale?" and the omissions become *declared* rather than accidental.
3. A new gate, `scripts/ai-skills/routing-coverage.test.ts` (auto-discovered by `run-tests.ts`, so it rides `prism:test` → `prism:check` → CI), asserts set-equality in both directions: every `auto` id appears exactly once in the canonical table; every `named-only` id appears in the named-invocation section; every `prism-*` id cited in the rule exists in `roles.json` (no ghost routes); and the same assertions hold against the seed twin. A roster assertion for `skills-ecosystem.md` (every registry persona appears in the roster tables) rides the same file.
4. Fix the seed-twin content drift (Linear literals) in the same pass, since the file is being rewritten anyway.

Default policy assignment (ratify or amend — see Open Questions): `auto` = the current 13 + Parker, Lilac, Vera, Kora, Ellis, Charlie, Quinn, Tess, Remy, Penny, Lex (they have clean intent signals: "write a PRD", "standup", "pricing model", …). `named-only` = Zoe, Theo, Ren, Iris + the 3 utilities.

## Defect 2 — Options and Recommendation

### Options considered

- **(a) Keep implicit classification, populate `CODEX_INLINE_EXCLUDE`.** Rejected: the exclude list is a second hand-maintained enumeration — the exact failure class — and it only covers Codex inlining, not the Claude/Cursor copies. Rethink: it *is* the smallest diff, but it treats the symptom in one platform surface and leaves "always-on by omission" intact. Stands rejected.
- **(b) Central rule registry file (e.g. `.ai-skills/definitions/rule-loading.json`) mapping rule → tier.** Rejected: a sidecar registry detaches the declaration from the file it governs — a new rule (especially an Atlas-generated one landing in a consumer repo) can be created without touching the sidecar, which is omission-drift again. ADR-0035 already ruled that classification "belongs in the rule's frontmatter." Rethink: a sidecar *would* give one scannable overview — but `grep -L "^load:" .prism/rules/*.md` gives the same overview for free, and frontmatter travels with the file through adopt/update/eject. Stands rejected.
- **(c) Explicit `load:` frontmatter key on every rule, with a build gate that fails on absence.** **Accepted.**

### Recommendation (Defect 2): **Proceed — explicit `load:` declaration + a consumer-side regeneration seam**

The two sub-problems get two distinct mechanisms:

**(2a) The classifier becomes affirmative.** Every canonical rule declares `load: always | paths | skill` in frontmatter:

- `load: always` — Tier-1. Inlined into the AGENTS block, copied to `.claude/rules/` and `.cursor/rules/` (`alwaysApply: true`), exactly as today.
- `load: paths` — Tier-2. Requires a `paths:` list (build error if absent); `paths:` without `load: paths` is also an error. Platform dialect handling unchanged (`rule-dialect.ts` already translates `paths:` → Cursor `globs:` and strips for Codex).
- `load: skill` — Tier-3. Never inlined, never copied to platform always-on dirs; lives canonically in `.prism/rules/` and is loaded by the skills that cite it with imperative triggers. This finally gives ADR-0035's Tier-3 a machine-readable encoding distinct from Tier-1.

`collectTier1RuleBodies` filters on `load: always` and **the build hard-fails on any canonical rule missing `load:`** — "always on" becomes an affirmative decision, and a future rule (or a rewrite of this mechanism) cannot reintroduce opt-in-by-omission without CI catching it. A short new ADR records the encoding change and marks ADR-0035 amended (the tier *model* is untouched).

**(2b) The consumer surface gets a regeneration seam.** `prism update` re-renders the AGENTS Tier-1 marker-pair block from the *consumer's* `.prism/rules/` (marker-pair replacement only — consumer-authored content outside the markers is untouched, which is already `replaceTier1Block`'s contract). `prism doctor` reports rules missing `load:`. Atlas onboarding (question flow + rule generation) assigns `load:` to every generated rule as part of the generation decision — the Event evidence shows this is a real per-team judgment (TypeScript rules path-scoped; framework rules always-on for a single-stack repo; security baseline always-on) — and finishes by running the block refresh so the AGENTS surface is never stale at onboarding close.

**Reclassifications shipping with the mechanism:** `pr-description.md` → `load: skill`, with imperative load-triggers added to the personas that author or sync PR bodies (Clove, Briar, Eric, Winston — the skills already cite it; the citations become deterministic read-triggers per skill-authoring.md's externalization mechanics). `verification-before-done.md` stays `load: always` — record the verdict so the classification is affirmative, not inherited.

**`branch-plan.md` split is a named follow-up, not part of this lane.** The essential contract (find/read the plan, one plan per ticket, Decisions are do-not-undo, update after meaningful work, Sessions verdicts, plans never deleted) stays `load: always`; the template, structured issue schemas, close ceremony, and verdict gate move behind skill-triggered load. That restructure touches many skill bodies and deserves its own reviewable unit — and it *depends on* the `load: skill` mechanism existing. Filing it separately keeps lane 2 mechanism-shaped. The token argument survives agents-md-slim's refutation because the moved content leaves the always-on set entirely.

## Cross-Cutting Recommendation

**One pattern, two fixes.** The shared failure gets a shared *gate shape* — a registry-parity check wired into `prism:check`, in the mold of `verify-pack-parity` — instantiated once per surface: `routing-coverage.test.ts` for the roster surfaces, and the `load:` hard-fail inside the build for the rule surface. Do **not** build a single unified "generate everything from one registry" mechanism: the two surfaces have different registries (`roles.json` vs. the rules directory itself), different derived artifacts (prose tables vs. build outputs), and different lifecycles (upstream-only vs. consumer-side). A mega-registry would be the premature abstraction `code-standards.md` warns against — the *pattern* already has multiple adapters (pack-parity, manifest-coverage, now these two); the *implementation* does not need to be shared. This is a recommendation, not a menu: two issues, one named pattern cited in both.

The two instances fixed opportunistically (seed-twin Linear literals, ecosystem roster) ride lane 1. The *class* behind instance 3 — curated seed twins are checked for existence, not content parity — is flagged for a Zoe/Nora follow-up decision, not fixed here: curated twins diverge from canonical *by design*, so a byte-parity gate is wrong; the right future shape (if any) is a staleness signal, and that's a separate conversation.

---

## Devil's Advocate

1. **Risks.** (i) Lane 2 touches the frontmatter of all canonical rules and their platform copies — a wide, mostly-mechanical diff that could mask a real regression in review; mitigate by landing the mechanism + migration in one commit and reclassifications in separate commits. (ii) The exact mechanism by which Claude Code loads `.claude/rules/` (always vs. `paths:`-respecting) is inferred from observed behavior, not documented contract — if `load: skill` rules were still copied and auto-loaded, the reclassification would be a no-op; the fix (don't copy them at all) avoids depending on loader semantics, but verify with a cold-session smoke test. (iii) `prism update` writing into consumer `AGENTS.md` is new write behavior in consumer trees — the marker-pair contract contains it, but a consumer who hand-edited *inside* the markers loses those edits (the markers say "do not edit"; still, call it out in the changelog). (iv) Validation-only routing leaves signal-phrase prose free to rot; accepted consciously (see the option (b) rethink).
2. **Tradeoffs.** Explicit `load:` adds an authoring step to every future rule — the exact "classification decision on creation" cost ADR-0035 already accepted; this makes it enforced rather than optional. Validate-not-generate keeps two artifacts (registry + table) instead of one, paying a small ongoing sync cost the test converts from silent to loud.
3. **Why anyway.** Both defects are *silent-drift* failures; both fixes convert silence into a red CI check using a gate pattern the repo already trusts. The alternatives that remove drift entirely (full generation, mega-registry) buy marginal additional safety at the cost of new machinery and prose-in-JSON coupling.
4. **Watch for.** If `rule-dialect.ts` starts needing per-platform special cases beyond copy/strip/exclude to handle `load:`, stop — that's the signal the enum grain is wrong. If the routing test needs fuzzy parsing of the markdown table (more than "extract backticked `prism-*` ids per section"), stop and restructure the rule for parseability instead of hardening the parser. If lane 2's consumer-default question (Open Question 2) turns contentious, ship upstream enforcement first and hold the consumer seam — the two halves are severable.

---

## Blast Radius

### Lane 1 — routing completeness

| File | Role | Change |
| --- | --- | --- |
| `.ai-skills/definitions/roles.json` | canonical | `routing` field on all 31 entries |
| `scripts/ai-skills/generate-skills.ts` (`buildRoleMap`) + `discovery-metadata.test.ts` | canonical | validate the new field (enum check; required) |
| `.prism/rules/skill-routing.md` | canonical | add missing rows + `## Named-invocation personas` section |
| `templates/install/.prism/rules/skill-routing.md` | canonical (curated seed) | same content, tokenized/genericized; fixes the Linear-literal drift |
| `.prism/architect/_toolkit/skills-ecosystem.md` | canonical | roster rows for the 9 business personas |
| `scripts/ai-skills/routing-coverage.test.ts` | canonical (new) | the parity gate |
| `.claude/rules/skill-routing.md`, `.codex/rules/skill-routing.md`, `.cursor/rules/skill-routing.mdc`, `AGENTS.md` generated block, mirrored ecosystem copies | **generated** | regenerate via `pnpm prism:build` — never hand-edit |

Backward compat: none broken. Consumers pick up the complete table on their next `prism update` (PRISM-owned rule files are hash-tracked in `.sync-manifest.json` and refreshed). No CLI behavior change. Version: rides any release; patch/minor.

### Lane 2 — explicit load declaration

| File | Role | Change |
| --- | --- | --- |
| `.prism/rules/*.md` (all canonical rules) | canonical | add `load:` frontmatter (21 `always`, 8 `paths`, then reclassify `pr-description.md` → `skill`) |
| `templates/install/.prism/rules/*.md` | canonical (seeds) | matching frontmatter |
| `scripts/ai-skills/agents-md-block.ts` | canonical | classifier reads `load: always`; hard-fail on missing/invalid declaration; retire `CODEX_INLINE_EXCLUDE` (subsumed by `load: skill`) |
| `scripts/ai-skills/rule-dialect.ts` | canonical | translate/strip `load:` per platform; exclude `load: skill` from platform copies |
| `scripts/ai-skills/build.ts` | canonical | validation wiring; platform-copy exclusion |
| `scripts/ai-skills/update.ts` | canonical | consumer AGENTS marker-pair refresh on `prism update` |
| `scripts/ai-skills/doctor.ts` | canonical | report undeclared rules |
| `.ai-skills/skills/prism-onboarding/` (+ question-flow reference) | canonical | Atlas assigns `load:` at rule generation; runs block refresh at close |
| `.ai-skills/skills/{prism-code-dev,prism-code-review-self,prism-code-review-pr,prism-architect}/shared.md` | canonical | imperative load-triggers for `pr-description.md` |
| `.prism/spec/adrs/_toolkit/` | canonical | new ADR (amends ADR-0035's discriminator); ADR-0035 gains an "amended by" note |
| tests: `agents-md-block.test.ts`, dialect/content-copy tests, `adopt.test.ts`, `update.test.ts` | canonical | updated + new cases |
| `.claude/rules/`, `.codex/rules/`, `.cursor/rules/`, `AGENTS.md` block | **generated** | regenerate |

Backward compat for consumers running `prism update`: PRISM-owned rules are overwritten with declared versions (normal update path). Consumer-owned rules (Atlas-generated or hand-written) without `load:` hit the Open Question 2 default: **treated as `always` + loud per-file warning** — behavior-preserving (no silent change to the load set in either direction) but no longer silent; `doctor` nags until declared. The AGENTS refresh replaces only the marker-pair block. **Version bump: minor is implied** (new CLI write behavior + rule file format extension) — lands in the next minor after the pending eval-layer publish (0.8.0), i.e. 0.9.0, or folds into 0.8.0 if unpublished when this ships.

---

## Lane Split: two issues, plus one named follow-up

**Two issues.** Per `followup-scope.md`'s four signals: file overlap between the defects is near-zero (registry/prose files vs. build pipeline + every rule's frontmatter); subject adjacency is real but only at the root-cause level; each lane is independently review-sized and would drown the other's diff; acceptance gates differ entirely (a set-equality test vs. build hard-fail + CLI behavior). Two "splits" signals ≫ the threshold. They share this evaluation as their architecture record and can land in either order (no dependency between them).

**Named follow-up (filed at the same time, blocked on lane 2): `branch-plan.md` slim.** One fix (EXTERNALIZE the template/schemas/close-ceremony out of the always-on contract), traceable to this evaluation's Defect-2 finding, done when the always-on `branch-plan.md` carries only the contract and the moved content loads via skill triggers, owned by Winston (spec) + Clove (execution). Passes the scope-fit gate; kept out of lane 2 because it multiplies the touched-skill surface and needs the `load: skill` mechanism to exist first.

**Not filed:** a curated-seed staleness gate (the class behind the Linear-literal drift). Deliberately parked — curated twins diverge by design; whether a staleness signal is wanted is a Zoe/Nora conversation, and an open-ended "make seeds fresher" ticket would fail the scope-fit gate today.

---

## Proposed Implementation Tasks

Grouped by persona per lane, at the `implementation-task-detail.md` bar. Issue numbers pending; Winston plan-mode transposes these into each issue's plan after Nora files.

### Lane 1 — routing completeness

**Winston (spec ratification)**

1. `[HITL]` **Ratify the per-persona routing policy** (Open Question 1's table below). Blocks task 2 only in the sense that a flipped assignment changes row placement; the default is executable as written.

**Clove (implementation)**

2. **Add `routing` to `.ai-skills/definitions/roles.json`.** Every entry gains `"routing": "auto"` or `"routing": "named-only"` per the ratified table (default: `named-only` for `prism-surface-audit`, `prism-doc-walker`, `prism-refactor-scout`, `prism-retro`, and the 3 utilities; `auto` for all other personas). Keep key order `id`, `persona`/`type`, `routing`.
3. **Extend `buildRoleMap` validation** in `scripts/ai-skills/generate-skills.ts` to require `routing` and reject values outside the enum; add matching cases in `discovery-metadata.test.ts` alongside the existing utility-entry tests (`:191-215`).
4. **Rewrite `.prism/rules/skill-routing.md`:** add one table row per missing `auto` persona (Parker, Lilac, Vera, Kora, Ellis, Charlie, Quinn, Tess, Remy, Penny, Lex), deriving Signal phrases from each skill's frontmatter `Triggers:` line (curate, don't paste); add `## Named-invocation personas` after `## Utility skills` listing Zoe, Theo, Ren, Iris with one-clause purposes and the note that they route on explicit name/phrase only; add `prism-skill-forge` to the utility section. Keep the `# Skill Auto-Routing` heading and all existing section headings verbatim (issue-302 citation contract). No bare `ADR-NNNN` (install-adr-gate).
5. **Sync the curated seed twin** `templates/install/.prism/rules/skill-routing.md` to the new content — tokenized (`${TICKET_PREFIX}`), genericized ("tracker", not "Linear" — this closes the PRISM-380 drift), ADR-free.
6. **Add the 9 business personas to `skills-ecosystem.md`'s roster** (`.prism/architect/_toolkit/skills-ecosystem.md`), following the existing table shape; place them per the doc's ticket-flow/cadence grouping logic (they are neither — add a third grouping if the doc's structure demands it, mirroring how the doc already separates cadence personas).
7. **Create `scripts/ai-skills/routing-coverage.test.ts`** asserting: (a) every `routing: "auto"` id appears exactly once as a backticked id in the canonical rule's routing table; (b) every `named-only` id appears in the named-invocation or utility section; (c) every `prism-*` id in the rule exists in `roles.json`; (d) assertions a–c against the seed twin; (e) every `persona` name in `roles.json` appears in `skills-ecosystem.md`. Auto-discovered by `run-tests.ts` — no `package.json` change.
8. **Verify:** `pnpm prism:build` (regenerates all platform copies + AGENTS block), then `pnpm prism:check` green. Confirm the new test fails when a `roles.json` entry is added without a rule edit (mutate locally, observe red, revert).

### Lane 2 — explicit load declaration

**Winston (spec)**

1. **Write the ADR** (next free number in `.prism/spec/adrs/_toolkit/`): explicit `load: always|paths|skill` replaces absence-of-`paths:` as the tier discriminator; ADR-0035's model unchanged; note the amendment in ADR-0035's References.

**Clove (implementation)**

2. **Add `load:` frontmatter to all canonical rules** in `.prism/rules/` and their seed twins: `load: always` for the current 21 no-`paths:` rules, `load: paths` for the 8 `paths:` rules (keep `paths:` as the data). Content-only change to the rules themselves.
3. **Rewrite the classifier:** `agents-md-block.ts` — `collectTier1RuleBodies` includes iff frontmatter declares `load: always`; **throw** (fail the build) naming the file when a canonical rule lacks a valid `load:`; delete `CODEX_INLINE_EXCLUDE` and its references (subsumed — sweep per `code-standards.md § Removal completeness`). Update `agents-md-block.test.ts` cases.
4. **Teach `rule-dialect.ts` and the platform-copy path in `build.ts`** the `load:` key: strip it from Codex copies (like `paths:` today); Cursor keeps `alwaysApply: true` derivation from `load: always`; **`load: skill` rules are excluded from all platform copies and from AGENTS inlining** — they exist only canonically. Update dialect/content-copy tests.
5. **Reclassify `pr-description.md` → `load: skill`,** and in `.ai-skills/skills/{prism-code-dev,prism-code-review-self,prism-code-review-pr,prism-architect}/shared.md`, convert each existing `pr-description.md` citation at a PR-body-authoring moment into an imperative read-trigger ("When opening or syncing a PR body, read `.prism/rules/pr-description.md` and follow it") — locate via `grep -rn "pr-description" .ai-skills/skills/*/shared.md`. Sweep dangling platform copies (they stop being generated; ensure build removes or they're cleaned).
6. **Consumer seam:** in `update.ts`, after `refreshPlatformSkills`, re-render the consumer `AGENTS.md` marker-pair block from the consumer's `.prism/rules/` via the (relocated/shared) `collectTier1RuleBodies` + `replaceTier1Block`; only when the marker pair exists — never create or restructure a consumer AGENTS.md on update. Undeclared consumer-owned rules: per Open Question 2 default, include as `always` and print a per-file warning naming the missing declaration. Add `update.test.ts` cases: block refreshed; markers absent → untouched; undeclared rule → warned + included.
7. **`doctor.ts`:** report every consumer rule missing `load:` with the one-line remedy.
8. **Atlas:** in `.ai-skills/skills/prism-onboarding/` (shared.md + the question-flow reference), the rule-generation step assigns `load:` per generated rule (stack-scoped rules default `paths`; single-stack framework guidance and the security baseline default `always` — confirmed with the user in the flow), and onboarding's closing build/refresh step regenerates the AGENTS block.
9. **Verify:** `pnpm prism:check` green; cold-session smoke check that `pr-description.md` no longer loads at session start and is read at the Clove shipping trigger; local mutation test — remove `load:` from one rule, observe the build fail naming it.

**Briar / Eric (review focus)** — lane 1: parity-test correctness and citation-contract preservation; lane 2: canonical-vs-generated ownership on every touched file, consumer-update safety (marker-pair containment), and that no reclassification silently changes any platform's effective load set except the two intended (`pr-description.md` out; nothing in).

---

## Proposed Acceptance Criteria

### Lane 1 — routing completeness

- [ ] **AC-1** Given a persona entry is added to `roles.json` without a matching `skill-routing.md` edit, When `pnpm prism:test` runs, Then the routing-coverage gate fails naming the unrouted id. (REQ-1)
  - Evidence: `machine` — mutation run: add a dummy entry, observe named failure, revert.
- [ ] **AC-2** Given the shipped rule, When every `routing: "auto"` entry in `roles.json` is checked against the routing table, Then each appears exactly once, and every `named-only` persona and utility appears in its dedicated section. (REQ-1)
  - Evidence: `machine` — `routing-coverage.test.ts` green on `main`.
- [ ] **AC-3** Given the install seed twin, When the same assertions run against `templates/install/.prism/rules/skill-routing.md`, Then they pass, and the twin contains no "Linear" literal and no bare `ADR-NNNN`. (REQ-1)
  - Evidence: `machine` — gate + `grep -c "Linear" == 0` + install-adr-gate green.
- [ ] **AC-4** Given a fresh session in this repo after `pnpm prism:build`, When the always-on rules load, Then the routing surface presents a route (auto row or named-invocation entry) for every installed persona and utility. (US: consumer onboarding evidence)
  - Evidence: `human` — cold-session spot check: ask for market-research work, observe Kora routed; ask "what's stale", observe Zoe reachable by name.
- [ ] **AC-5** Given `skills-ecosystem.md`, When compared against `roles.json`, Then every registered persona appears in the roster. (REQ-1)
  - Evidence: `machine` — roster assertion in the same gate.

### Lane 2 — explicit load declaration

- [ ] **AC-1** Given a canonical rule file without a `load:` declaration, When `pnpm prism:build` runs, Then the build fails naming the file. (REQ-2)
  - Evidence: `machine` — mutation run: strip `load:` from one rule, observe named failure, revert.
- [ ] **AC-2** Given all canonical rules carry `load:`, When the build runs, Then the AGENTS block, `.claude/rules/`, and `.cursor/rules/` contain exactly the `load: always` set (plus `paths` rules in their path-scoped form), and no `load: skill` rule appears on any always-on platform surface. (REQ-2)
  - Evidence: `machine` — build assertions + `grep -L`/diff checks in tests.
- [ ] **AC-3** Given a consumer repo with a PRISM-managed AGENTS marker pair and a rules directory that changed since the last fill, When `prism update` runs, Then the marker-pair block is regenerated from the consumer's rules and content outside the markers is byte-identical to before. (REQ-2, consumer evidence)
  - Evidence: `machine` — `update.test.ts` fixture asserting block refresh + outside-markers equality.
- [ ] **AC-4** Given a consumer-owned rule without `load:`, When `prism update` or `prism doctor` runs, Then the file is named in a warning with the remedy, and the effective load set does not change silently. (Open Question 2)
  - Evidence: `machine` — CLI test asserting the warning text and unchanged classification.
- [ ] **AC-5** Given a session that is not authoring or syncing a PR body, When always-on context loads, Then `pr-description.md` is absent; Given Clove reaches the shipping step, When the trigger fires, Then the rule is read before the PR body is written. (REQ-2)
  - Evidence: `human` — cold-session smoke check on both halves.
- [ ] **AC-6** Given Atlas generates a stack rule during onboarding, When the file is written, Then it carries a `load:` declaration chosen in the question flow, and onboarding ends with a fresh AGENTS block. (consumer evidence)
  - Evidence: `human` — scripted onboarding dry-run transcript showing the declaration decision and the closing refresh.

---

## Open Questions (each with a default path)

1. **Per-persona routing policy ratification.** Default (used until amended): `auto` for all personas except `named-only` = Zoe (`prism-surface-audit`), Theo (`prism-doc-walker`), Ren (`prism-refactor-scout`), Iris (`prism-retro`), and the 3 utilities. The genuinely judgment-shaped calls: Lilac (standup — proposed `auto`; "standup" is an unambiguous signal) and Parker (proposed `auto`; "write a PRD" is unambiguous). Needs Hunter's yes/amend before lane 1 task 2.
2. **Legacy undeclared consumer-owned rules on `prism update`.** Default: include as `always` + loud per-file warning (behavior-preserving, non-silent); `doctor` nags. Alternative: exclude + warn (safer context-wise, but silently *removes* rules from Codex reach that consumers currently rely on). Needs Hunter's call; the default is implemented absent a ruling.
3. **`branch-plan.md` slim: separate follow-up issue (default) vs. folded into lane 2.** Default: separate, blocked on lane 2, filed by Nora in the same batch with the split spec sketched in this evaluation's Defect-2 recommendation.
4. **Curated-seed staleness signal** (the class behind the Linear-literal drift). Default: no work filed; instance fixed in lane 1; the class question routes to the next Zoe audit / Nora triage as a discussion item, not a ticket.

---

## Design Decision Log (for the issue plans' `## Decisions`)

- Routing completeness is enforced by **validation against `roles.json`, not generation** — membership drift is the observed failure and set-equality checking catches it completely; generation would move curated routing prose into build tooling for marginal gain. Revisit only if signal-phrase prose demonstrably rots.
- Routing policy is a two-value enum on the registry entry (`auto` / `named-only`); cadence is scheduling metadata and stays in `skills-ecosystem.md`.
- Rule tier encoding moves from implicit (`paths:` absence) to explicit (`load: always|paths|skill`), with a build hard-fail on absence — always-on becomes an affirmative authoring decision. ADR-0035's tier model is unchanged; a new ADR amends its discriminator.
- Consumer AGENTS freshness is owned by `prism update` (marker-pair replacement only) + Atlas onboarding close — never by asking consumers to run upstream build scripts.
- One gate *pattern* (registry parity in `prism:check`), two instantiations — no unified mega-registry (premature abstraction; the registries, artifacts, and lifecycles differ).
- `branch-plan.md` slim is a dependent follow-up, not lane-2 scope — mechanism first, largest content migration second, each independently reviewable.
