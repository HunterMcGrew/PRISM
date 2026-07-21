# Evaluation: Mira PRD/Epic Decomposition Capability

> Winston evaluate-mode output, dispatched by Sol. Not a branch plan — an architecture evaluation.
> Subject: should Mira gain a method that takes a PRD or epic and breaks it into chunks Nora can cut tickets from?

## Verified findings

Each of Sol's five pre-dispatch observations was checked against the actual files. Four hold cleanly; one holds with a nuance that changes the sibling lane's calculus.

1. **Path A never names a PRD — holds.** `.ai-skills/skills/prism-user-stories/shared.md:223`: Path A triggers on "Goal, description, or notes exist in the plan." No path in Mira's body reads `.prism/prds/`, and the `$ARGUMENTS` fallback (line 228) treats input as generic "feature context." The sharper version of the finding: Mira's **frontmatter description already claims the relationship** ("Sits below Parker on grain") — the routing surface advertises a capability the body never operationalizes. `claude.md`/`codex.md`/`cursor.md` are all empty stubs; nothing platform-specific fills the gap.

2. **Story mapping is catalog, not procedure — holds, with a split.** `.prism/references/user-stories/frameworks.md` carries Patton story mapping (backbone, walking skeleton, release slices), MoSCoW/Kano/SPIDR, INVEST/3Cs, JTBD, the what-if sweep — all as reasoning frameworks with no output shape or artifact target. Nuance: MoSCoW **is** operationalized per-run (lens #5, shared.md:94 — "classify every story Must/Should/Could/Won't" with a forcing trigger). The story map **as an artifact** is not operationalized anywhere: no output shape, no file target, no consumer named.

3. **Parker's side is fully declared — holds, five ways.** `prism-prd/shared.md:1` ("Mira decomposes them into stories"), `:44-46` (grain test, redirect to Mira), `:177` ("Mira decomposes finalized PRDs into user stories"), `:193` (default route), and `.prism/skills/prism-prd/step-08-ticket-handoff.md:37` ("Mira can pick up `<slug>` to decompose into stories whenever you're ready"). Plus `skills-ecosystem.md:38` ("PRDs decompose into stories"). Five-plus declarations from above, zero implementation below. Asymmetric seam confirmed.

4. **No epic-grain output shape — holds, with a wrinkle that shrinks the fix.** Mira writes `## User Stories` into `.prism/plans/<ticket-id>.md` (shared.md:281). Epic plans exist (`epic-<id>.md`, branch-plan.md; plan-lookup step 3 resolves them), and the plan template's `## User Stories` section is grain-agnostic — so Mira has a *place* to write at epic grain via existing machinery. What's genuinely missing is not the container but two things: (a) an input trigger routing a PRD into the flow, and (b) a home for the map-shaped ordering — backbone, MoSCoW, walking-skeleton designation, candidate ticket boundaries. A flat story list loses exactly the structure Nora needs, forcing re-derivation.

5. **Parker absent from `skill-routing.md` — holds, with a nuance for the sibling lane.** Grep confirms only Mira's row (line 18) exists; no Parker row. But `skills-ecosystem.md:38` explicitly declares Parker "**Invoke-only; not part of the standard handoff chain**" — so the routing-table absence may be partially *intentional*. The sibling eval (`eval-routing-and-rule-load.md`) owns this call; it should weigh the invoke-only declaration before treating the absence as pure drift. Not re-decided here.

**Findings beyond Sol's list:**

6. **Winston's rung doesn't read PRDs either.** Zero PRD mentions in `prism-architect/shared.md` and `.prism/references/architect/plan-mode.md`. Winston reads `## User Stories` from the plan (plan-mode step 1). Consequence: the plan is the content bus — fixing Mira's rung (PRD → plan) fixes Winston's rung for free, because his existing read picks up whatever Mira lands there. No Winston edit needed. His vertical-mode gate (plan-mode:22-23) even keys off "stories are independently shippable" — a story map feeds it directly.

7. **The standard chain runs the other direction.** `skills-ecosystem.md:94` declares the feature flow as Nora → Mira → [Pixel] → Winston → Clove — ticket-first, bottom-up. Parker's top-down direction (PRD → stories → tickets) exists only in Parker's own files. This is the systemic root of the asymmetry: the chain predates Parker, and Parker's arrival taught only his own docs about the new direction.

8. **Winston's epic-plan shape and Mira's stories are adjacent but distinct.** Plan-mode Epic Detection (:123) creates epic plans with a `## Stories` section referencing *child story plans* — different from Mira's `## User Stories`. Any story-map artifact must be coherent with both: the map's candidate-ticket boundaries should be the same boundaries Winston's `## Stories` child references later adopt.

9. **Stray artifact (out of scope, flagged):** `prism-prd/shared.md` ends with a planted BOM (`ef bb bf`) plus the literal text `# BOM planted for sanity check` — leftover test contamination in canonical source, flowing into generated/published surfaces. Follow-up work, one-line fix, not this ticket.

## Real-gap-or-not verdict

**Real gap — narrow.** It is both a discoverability gap (input side: no path fires on a PRD, so the capability in the model's head is never routed into) and a small real artifact gap (output side: no shape carries backbone/priority/ticket-boundary structure to Nora and Winston).

The hot-springs session's hypothesis — "not a separately named mode; her normal Path A + Story Mapping covers it" — is **half right**. Right: no new mode is warranted (see Options). Wrong: normal Path A does *not* cover it as written — its trigger cannot fire (no plan exists at PRD grain), and its output shape drops the ordering structure. Path A needs the PRD named as first-class input and a grain-branched output shape.

## Options considered

Per branch-plan.md § Decisions, each rejection was rethought before recording.

**Option 1 — Named MODE on Mira (like Reese's mode selection). Rejected.** Reese's modes exist because her *procedures* genuinely diverge (release vs. sprint vs. bug-fix verification produce different artifacts via different steps). Mira's flow is the same elicit → draft → quality-check → review → save regardless of input; only the input source and output grain differ. One caller, one procedure variant — per code-standards § "two adapters serving the same port earn the abstraction," a mode is surface every reader loads for a branch most sessions never take. Rethink: would a second caller (e.g., decomposing a Vera strategy doc) force the mode later? Possibly — but that second adapter doesn't exist yet, and the path extension upgrades to a mode cheaply if it arrives. Rejection stands.

**Option 2 — Artifact-first only (define the story-map shape, let existing paths fill it). Rejected.** The input side is the actual break: an artifact with no trigger routing into it is a shape nobody produces. This is the same failure as the current state — capability declared, never fired. Rethink: could Atlas onboarding or the ecosystem doc alone advertise the artifact hard enough? No — advertising from *outside* Mira's body is exactly the asymmetric-seam pattern that broke (finding 3). Rejection stands.

**Option 3 — Do nothing; the model figures it out from frameworks.md. Rejected.** The hot-springs session is the counter-evidence: a live consumer hit the seam and the human had to hand-derive the flow. Unshaped output diverges across models, violating the cross-LLM portability bar (`implementation-task-detail.md`). Rejection stands.

**Option 4 — Path A extension + externalized procedure + grain-scoped artifact subsection. Chosen** — see Recommendation.

Also considered and rejected: **adding `## Story Map` to the branch-plan template.** That edits the shared plan template every persona reads — wide blast radius for a section only epic plans use. The leaner reframe: `### Story Map` as a *subsection under `## User Stories`* in epic plans only. Sections are additive per the template's own convention ("create the section if it doesn't exist"); Winston and Nora already read `## User Stories`, so the map rides along in reads that already happen. No template change, no new top-level section, no new file. This is the reframe that halves the change.

## RECOMMENDATION

**Proceed — as a Path A input extension plus an externalized decompose procedure plus a grain-scoped artifact subsection. Not a mode.**

Shape:

1. **Input:** Path A's trigger enumeration gains "a finalized PRD (`.prism/prds/<slug>.md`) or an epic id" as first-class input, with a deterministic externalization trigger: *"When the input is a PRD or an epic, read `prd-decompose.md` and follow it."* This matches the skill-authoring disclosure gate (deterministic condition + whole conditional procedure → externalize; precedent: Nora's `create-path.md`) and keeps the body lean — generated SKILL.md is 364 lines; the inline addition is well under the 500 cap.

2. **Procedure** (new reference `.prism/references/user-stories/prd-decompose.md`): read the PRD; verify `status: finalized` (draft → flag, don't decompose); derive the journey backbone from the PRD's `## User journeys`; write vertically-sliced stories per journey (SPIDR — every slice user-visible); classify MoSCoW seeded from the PRD's `## Scope`; designate the walking-skeleton Must slice; run the what-if sweep per story; mark candidate ticket boundaries (each INVEST-Small story = one candidate ticket); **no architecture choices** — solutions belong to Winston, per Mira's existing lens #1.

3. **Output:** the epic plan (`.prism/plans/epic-<id>.md`, or `epic-<slug>.md` when no parent ticket exists — both already sanctioned by branch-plan.md). `## User Stories` in the normal format, plus a `### Story Map` subsection: backbone table (journey order), per-story MoSCoW + candidate-ticket marker, walking-skeleton designation. Created lazily on first write per lazy-artifacts.md — plan-lookup step 6 already sanctions plan creation.

4. **Consumers, unchanged:** Winston's plan-mode reads `## User Stories` today and picks up the map for free; his vertical-mode gate and Epic Detection `## Stories` child references adopt the map's boundaries. Nora cuts a ticket per candidate-ticket marker through her existing create-path — title, AC hints, and priority derive from the map without re-elicitation. Zero edits to Winston's or Nora's skill bodies in v1.

This is the design where the new code nearly disappears: one trigger clause, one reference file, one subsection convention, one ecosystem-doc row — everything else rides seams that already exist.

### Devil's Advocate

**Risks.** (a) Attention dilution: Path A grows a branch most ticket-grain sessions never take. Mitigated by externalizing the procedure — the body cost is ~6 lines. (b) The `### Story Map` subsection is a convention, not a template section — a future template refactor could orphan it. Mitigated by the ecosystem-doc artifact-table row making it a named, findable artifact. (c) Mira creating epic plans means a persona other than Winston now originates epic plan files; if Winston later runs Epic Detection on the same work, two epic-plan origins could collide. Mitigated: same filename convention means plan-lookup resolves to the same file; Winston appends, doesn't recreate.

**Tradeoffs.** A named mode would be more discoverable in the skill body itself; we're trading that for a leaner body and betting discoverability on the frontmatter description + Path A clause + routing signals (sibling lane). The artifact-only option would have been zero body cost, but it repeats the exact failure being fixed.

**Why anyway.** The seam is currently declared five times from above and implemented zero times below. The minimal symmetric fix — name the input, shape the output, leave every consumer read untouched — closes the break at the lowest possible surface cost while the two-adapters rule keeps a mode available later if a second decompose-source appears.

**Watch for.** During implementation: if the Path A clause plus output-shape prose exceeds ~15 body lines, stop — that's the signal the externalization boundary was drawn wrong. Post-ship: if consumer sessions still hand-derive the flow (the hot-springs failure recurring), the discoverability bet failed and the routing-signal side (sibling lane) needs strengthening, not Mira's body.

*(A/P/C gate acknowledged and passed through — scripted dispatch, no human at the wheel; the conductor consumes this document as the decision point.)*

## Grain-ladder audit table

| Rung | Declared from above? | Implemented below? | Artifact match? | Verdict |
| --- | --- | --- | --- | --- |
| Parker (initiative) → Mira (story) | Yes — 5+ sites (`prism-prd/shared.md:1,:44-46,:177,:193`; `step-08:37`; `skills-ecosystem.md:38`) | No — no path names a PRD; frontmatter claims the grain relation, body silent | No — PRD lives at `.prism/prds/`; Mira reads `.prism/plans/` only | **Broken** (this eval's subject) |
| Mira (story) → Winston (task) | Yes — Mira's closing handoff (shared.md:284); ecosystem:256 | Yes — plan-mode step 1 reads `## User Stories` | Yes at ticket grain; at epic grain, ordering/priority currently lost (Story Map fixes) | **Holds** (weak at epic grain) |
| Winston (task) → Nora (ticket) | Weak — plan-mode:123 "prefer creating a parent ticket first" names no actor or payload | Partial — Nora's create-path is generic one-at-a-time; no batch cut from an epic plan | Partial — epic-plan `## Stories` child refs vs. tracker tickets have no declared linkage | **Thin** (deferred; see Open questions) |
| Routing visibility (cross-cutting) | — | Parker absent from `skill-routing.md`; ecosystem declares him invoke-only | — | **Sibling lane** |

**Systemic statement:** yes, the Mira gap is one instance of a directional asymmetry — the handoff chain was built bottom-up ticket-first (Nora → Mira → Winston, ecosystem:94), and Parker's later arrival added a top-down direction that only Parker's own files learned about. Fixing it is **several separable changes, not one**: (1) this eval's Mira-rung fix; (2) the sibling lane's routing visibility; (3) a deferred, optional Nora batch-cut convenience. Each ships independently; none blocks another.

## Blast radius

| Surface | Files | Kind |
| --- | --- | --- |
| Canonical skill source | `.ai-skills/skills/prism-user-stories/shared.md`, `.ai-skills/skills/prism-user-stories/frontmatter.yml` | Edit |
| New reference | `.prism/references/user-stories/prd-decompose.md` | Create (lazily justified — content exists at creation) |
| Architect context | `.prism/architect/_toolkit/skills-ecosystem.md` (artifact table row; one-line Parker-row note) | Edit |
| Generated | `.claude/skills/prism-user-stories/SKILL.md` (+ codex/cursor outputs) via `pnpm prism:build` | Regenerated, not hand-edited |
| Consumer impact | Ships in the next npm publish (main is post-eval-layer, unpublished 0.8.0 pending) — consumers pick it up via the update flow | No manual consumer edits |
| Explicitly untouched | `.prism/rules/branch-plan.md` template (deliberate — subsection convention avoids it); Winston and Nora skill bodies; `.prism/rules/skill-routing.md` (sibling lane); portable Downloads roster (separate backport) | — |

No shared types, no public APIs, no code paths. Line budget: generated Mira SKILL.md is 364 lines; the addition keeps it well under the 500-line cap (`pnpm prism:test` asserts).

## Proposed lane split

**Genuinely independent from the routing/rule-load lane.** Shared symptom family (Parker's invisibility) but different roots and disjoint fix surfaces: the sibling fixes *routing-table and rule-classification drift* in `.prism/rules/skill-routing.md`; this fixes *seam implementation* inside Mira's own files. No file overlap. One new ticket for this work (scope splits from the in-flight routing eval: different files, different concern, independently shippable — two of the four followup-scope split signals).

**Named intersections (for Sol to route, not re-decide here):**
1. Parker's routing-table row — sibling owns. Hand them finding 5's nuance: ecosystem declares Parker invoke-only, so absence may be partially by design.
2. If the sibling adds signal phrases to Mira's routing row, "decompose this PRD" / "break down the PRD" belong there. This lane touches only Mira's own frontmatter description; the routing-table row is theirs.

## Proposed Implementation Tasks

### Clove (implementation)

1. **Extend Path A's input enumeration** — `.ai-skills/skills/prism-user-stories/shared.md`, Startup step 4. Replace the Path A bullet (`- **Path A — context available:** Goal, description, or notes exist in the plan. Establish domain vocabulary from the context, then draft directly.`) with the same text plus: `— or the input names a finalized PRD (\`.prism/prds/<slug>.md\`) or an epic id.` and a trailing bold trigger sentence: `**When the input is a PRD or an epic, read [\`prd-decompose.md\`](../../../.prism/references/user-stories/prd-decompose.md) and follow it — the output shape branches by grain.**` Also update the `$ARGUMENTS` note (line 228) to add: a PRD slug or epic id in `$ARGUMENTS` selects the PRD/epic input of Path A. Verification: task 5.

2. **Create `.prism/references/user-stories/prd-decompose.md`** — content per RECOMMENDATION § Procedure and § Output, structured as: `## Input resolution` (slug → read `.prism/prds/<slug>.md`; require `status: finalized`, flag drafts; epic id → plan-lookup); `## Decompose` (backbone from PRD `## User journeys`; vertically-sliced stories per SPIDR; MoSCoW seeded from PRD `## Scope`; walking-skeleton Must slice designated; what-if sweep per story; no architecture choices — cite Mira lens #1); `## Output shape` (epic plan path per branch-plan.md naming; `## User Stories` standard format + `### Story Map` subsection: backbone table, per-story MoSCoW + candidate-ticket marker, walking-skeleton designation; create the plan lazily per plan-lookup step 6); `## Handoff` (default Winston; note that Nora cuts one ticket per candidate-ticket marker via her create-path). Cite frameworks.md by section rather than restating (per implementation-task-detail § Cite, don't restate). Content-only change, no build effect beyond task 5's regeneration.

3. **Update Mira's frontmatter description** — `.ai-skills/skills/prism-user-stories/frontmatter.yml`. Replace `Sits below Parker on grain.` with `Sits below Parker on grain — decomposes finalized PRDs and epics into a prioritized story map.` Keep the folded scalar; stay under the 1000-char cap. Verification: task 5 (`discovery-metadata.test.ts` asserts the cap).

4. **Add the artifact row and Parker-row note** — `.prism/architect/_toolkit/skills-ecosystem.md`. In the artifact ownership table (near line 201), add row: `| \`### Story Map\` (under \`## User Stories\`, epic plans) | Mira | Winston, Nora |`. In the Parker roster row (line 38), append one sentence: `Handoff lands via Mira's Path A PRD/epic input.` Content-only.

5. **Regenerate and verify** — run `pnpm prism:build`, then `pnpm prism:test`. Confirm `.claude/skills/prism-user-stories/SKILL.md` regenerates with the Path A change and stays ≤ 500 lines. Sequence: after tasks 1–4.

### Winston (plan close, when the implementing ticket lands)

6. Promote the decision "PRD decomposition is a Path A input extension, not a mode; story map lives as `### Story Map` under `## User Stories` in epic plans" to `skills-ecosystem.md` context (largely done by task 4; verify at close per the Decision verdict gate).

### Follow-up (separate vehicles — not this ticket)

7. **Strip the BOM artifact** from the tail of `.ai-skills/skills/prism-prd/shared.md` (`ef bb bf` + `# BOM planted for sanity check` after "Hand off cleanly.") and rebuild. One-line fix; follow-up PR per followup-scope.md.
8. **Nora batch-cut convenience** — only if post-ship friction shows (see Open questions).

## Proposed Acceptance Criteria

### Behavioral

- [ ] **AC-1** Given a finalized PRD exists at `.prism/prds/<slug>.md` and no plan exists for it, When Mira is invoked with the slug or "decompose the `<slug>` PRD," Then Mira reads the PRD and writes `.prism/plans/epic-<id-or-slug>.md` containing `## User Stories` and a `### Story Map` subsection with a journey backbone, per-story MoSCoW classification, a designated walking-skeleton Must slice, and candidate-ticket markers.
  - Evidence (machine): scripted run produces the file with all four required elements present.
- [ ] **AC-2** Given the PRD's frontmatter is `status: draft`, When Mira is invoked to decompose it, Then she flags the non-finalized status and does not write stories until the user overrides.
  - Evidence (human): transcript review of a draft-PRD run.
- [ ] **AC-3** Given the story map exists in an epic plan, When Winston runs plan mode against that plan, Then his story read picks up the map without any Winston-side change, and slice ordering follows the map rather than being re-derived.
  - Evidence (human): plan-mode transcript on a mapped epic plan.
- [ ] **AC-4** Given the story map marks candidate tickets, When Nora is asked to create a ticket for a marked story, Then the ticket title, AC hints, and priority derive from the map entry without re-elicitation.
  - Evidence (human): Nora create-path transcript.
- [ ] **AC-5** Given any decompose run, Then no written story names an implementation mechanism (UI widget, schema, function) — solutions stay with Winston.
  - Evidence (human): spot-check of story text.

### Non-behavioral

- [ ] **AC-6** `pnpm prism:build` and `pnpm prism:test` pass; generated `prism-user-stories/SKILL.md` ≤ 500 lines; frontmatter description ≤ 1000 chars.
  - Evidence (machine): CI run.

## Open questions (each with a default path)

1. **OPEN — needs post-ship signal.** Does Nora need a batch "cut tickets from this story map" mode? **Default path:** no — she cuts one ticket per candidate-ticket marker through the existing create-path; add the batch convenience only if consumer friction shows.
2. **OPEN — needs sibling-lane outcome.** How is the seam kept verifiable so the ladder can't silently break again? **Default path:** both sides of the seam name each other's exact file paths (greppable convention: Parker's declarations name Mira's Path A input; Mira's trigger names `.prism/prds/<slug>.md`); fold a mechanical assertion into the cross-reference lint if `followup-163-crossref-lint` lands.
3. **OPEN — needs sibling-lane outcome.** Do "decompose this PRD"-class signal phrases enter `skill-routing.md`'s Mira row? **Default path:** this lane edits only Mira's frontmatter description; the routing-table row belongs to the routing lane.
4. **OPEN — needs maintainer call.** Portable Downloads roster parity (the standalone `mira` skill also claims "sits below parker on grain"). **Default path:** separate backport after the canonical change ships; not this ticket.

---

**Closing Re-Orientation Battery** — *Scope boundary:* touched exactly one file (this evaluation); read-only everywhere else. Left alone and flagged: the BOM artifact in `prism-prd/shared.md` (found-followup-work), the thin Winston→Nora rung (deferred, documented above), Parker's routing-row absence (sibling lane). *Unasked assumptions:* treated "PRD slug" and "epic id" as two spellings of one input grain; assumed epic plans are the right container over the PRD directory because plans are the content bus every consumer already reads. *Edge recall:* draft-PRD input (AC-2), PRD with no parent ticket (epic-`<slug>` fallback), epic plan pre-existing from Winston's Epic Detection (append, don't recreate — Devil's Advocate risk c). *Verification honesty:* every file/line citation above was read or grepped this session; AC-1's "scripted run" and AC-3/4 transcripts are proposed evidence, not yet produced — nothing here claims the fix works, only that the gap is real and the shape is sound.
