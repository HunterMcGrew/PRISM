# PR 3B foreclosure table — judgment pass output

> Produced 2026-08-21 by the read-only foreclosure session per
> `.prism/plans/pr3b-session-brief.md`. No edits, no branch, no commits — this file is
> untracked; the implementation session commits it (or lifts its slices into commit
> messages per the redesign proposal § 3B commit rules).
>
> Criterion applied: before deleting a block, write one sentence naming the alternative
> behavior it forecloses. Sentence → compress to the sentence. No sentence → delete.
> Exceptions honored: typed contracts, reference sets, verbatim calibration strings.
> Reviewer bodies judged from PR #471's branch (`343588ab`), not `main`.

## How to read this file

- One table per deletion class. Class = commit boundary (redesign proposal § 3B rule 3).
- `Verdict`: `delete` / `compress` / `keep` / `n/a — <reason>`.
- A `compress` or `keep` row always carries its foreclosure sentence(s); a `delete` row
  carries `none — <reason>`. One sentence per bound: rows foreclosing several
  alternatives list several sentences.
- "→ owner: X" marks a dedupe: the bound survives, but at the named single owner, and
  this block's copy goes. That is a delete of the copy, not of the bound.

## Class map → commits

| Commit | Class | Task |
| --- | --- | --- |
| D1 | Run-order headings | 22 (settled — summary only) |
| D2 | Closing-battery restatements | 23 (settled — summary only) |
| D3 | DoD dedup | 24 |
| D4 | Read sequences → exit conditions | 25 (settled — per-file notes) |
| D5 | Credentials, specialization lists, Purpose sections, closing exhortations | N3 class 1 |
| D6 | Personality → Voice, greeting compression | N3 class 2 (+ N4 rides here or D7) |
| D7 | Stack/domain leakage | N3 class 3 |
| D8 | Capability restatements: lens elaboration, duplicate anti-patterns, cross-file repetition | brief target 4 — **new class, own commit recommended** |

N4 (Pixel catalog protection + rationale line) rides whichever commit touches
`prism-design` flavor first — recommend D6, since D6 is the pass most likely to over-cut
Pixel.

---

## D1 — `## The run, in order` (task 22, settled)

| Skill | Section | Verdict | Foreclosure |
| --- | --- | --- | --- |
| 22 files carrying the heading + 4 prose mentions | `## The run, in order` | delete | none — every step restates content existing elsewhere in the same file (measured in the portable run: 27/27 pure restatement; PR 1 removed the mandating rules) |

## D2 — Closing-battery restatements (task 23, settled)

| Skill | Section | Verdict | Foreclosure |
| --- | --- | --- | --- |
| 30 files | `## Closing Re-Orientation Battery` body prose | compress to one close-line pointer | forecloses skipping the closing battery — the mechanism survives at its single owner, `session-orientation.md`; the per-file persona-specific battery *calibrations* (see D2-a) are bounds, not restatement |

**D2-a — persona-specific battery calibration sentences survive the collapse.** Several
files append real calibration to the pointer; these are one-sentence bounds, keep them on
the close line:

| Skill | Surviving calibration | Foreclosure |
| --- | --- | --- |
| prism-debugger | Scope = only file touched is the plan; unproven claim carries `Confidence: Low` + `Missing evidence`, never `High` | forecloses closing an unproven diagnosis as confirmed |
| prism-design | assumptions = colors/states/components decided unasked; edge recall = the five UI states; evidence = named principle / documented convention / verified component | forecloses a design "done" claim with no citable principle or verified component |
| prism-code-review-pr | assumptions name skipped axis; edge recall names the six degenerate PR states | forecloses reporting a skipped axis as reviewed |
| prism-ticket-start, prism-qa-test-plan, prism-changelog, prism-standup-summary, prism-user-stories, prism-prd, prism-founder, prism-conductor, prism-surface-audit | their existing one-line edge-recall / evidence calibrations | forecloses generic battery answers where the persona has enumerable boundary states |

## D3 — Definition of Done dedup (task 24)

Rule applied per item: delete items restating a battery, "types/lint pass"-class
verification rituals, output-format restatements, and `load: always` rule restatements.
The deliverable sentence at the top of each DoD survives everywhere (it is a scope
statement, not a verification ritual). Survivor lists below are exhaustive — anything not
listed deletes.

| Skill | Verdict | Survivors (each with its bound) |
| --- | --- | --- |
| prism-architect | compress | deliverable sentence (plan is the deliverable; plan writes are the final act — forecloses closing with the plan unwritten); "No implementation code written" (forecloses Winston writing source); "AC synced to the ticket tracker" (forecloses plan-only AC drifting from the ticket). All 25 checkboxes otherwise restate the output format, the batteries, or plan-mode.md. |
| prism-code-dev | compress | deliverable sentence; types/lint/tests fresh at stop (genuine build gate per `epic-floor-revert.md` Class A — forecloses shipping on a stale green); "graded verdict is Reese's when `ac-verify` in chain" → owner: Implementation Instructions §7, cite don't restate. Delete: code-quality/design-soundness/plan-updated/console.logs/handoff rows (restatements). |
| prism-debugger | compress | deliverable sentence; the typed-escapes paragraph (escapes are the sanctioned early stop — forecloses forcing a diagnosis on incomplete evidence); "No source files modified, no fixes applied" (forecloses the debugger patching); "If unconfirmed: `Confidence: Low`, leading hypothesis stated — do not close as 'unknown'" (forecloses an unlabeled dead-end close). The 15 phase checkboxes restate the phases themselves — delete. |
| prism-code-review-self (471) | keep | already at target shape: deliverable sentence + plan-commit landing contract (unpushed review record does not count as written — forecloses a review stranded in a worktree) + GitHub-surface scope. |
| prism-code-review-pr (471) | keep | deliverable sentence + worktree-teardown-is-final-act + "Eric never approves (ADR-0011)" (forecloses agent approval). |
| prism-design | delete checklists, keep sentence | deliverable sentence incl. mode-1-completes-in-chat (forecloses saving files for inline riffs); mode-2 routes through Winston → owner: § Handing off Procedure A / ADR-0034, cite. The three checklists (18 boxes) and the "Before presenting, walk the relevant checklist" instruction are the named Anthropic-flagged verification ritual — delete. |
| prism-ticket-start | compress | deliverable sentence; "Bug tickets: AC generated and synced" (forecloses a bug branch with no AC on the ticket); the start-path/create-path skip markers ride whichever rows survive. Everything else restates Startup steps 4b–11 one-for-one — delete. |
| prism-changelog | compress | deliverable sentence incl. never-output-to-chat (forecloses dumping the changelog into chat); "every commit appears somewhere in the output" → single owner here (anti-pattern copy deletes in D8) — forecloses silent omission; "output format confirmed before generating" (forecloses generating before the user picked a format). |
| prism-qa-test-plan | compress | deliverable sentence (two products by mode); "every exclusion listed with a reason" (forecloses silent scope filtering); "no jargon / observable outcomes" → owner: § Writing Rules, cite. |
| prism-documentation | compress | deliverable sentence (shipping is the final act, not presenting the path — forecloses stopping at "here's the file"); "control inventory built from source" (forecloses documenting only the controls the plan mentions); the three conditional Large-write checks (keep — they fire on structural triggers, not per-run ritual). Template/frontmatter/callout rows → owners: their own sections. |
| prism-user-stories | compress | deliverable sentence; "bug tickets redirected — no stories written" (forecloses stories on a bug); "stories saved to `## User Stories`" is the deliverable sentence itself. INVEST/so-that/sweep rows → owner: Story format § Quality checks. |
| prism-standup-summary | compress hard | deliverable sentence; confirm-before-post + paste-fallback (forecloses an unconfirmed Slack post). The other ~21 boxes are the *third* copy of the formatting contract (lenses + anti-patterns) — delete; single owner decided in D8. |
| prism-conductor | keep | the four run-completion states are the run-state contract (forecloses declaring a run done with goal-state unsaved or a source write). |
| prism-surface-audit | keep | already the target shape — two boxes, both worktree-lane safety invariants (forecloses removing RED/YELLOW; forecloses stale-classification removal). |
| prism-retro, prism-refactor-scout, prism-doc-walker, prism-onboarding, prism-prd | compress | deliverable sentence + the genuinely non-restated policy rows (Theo: "no doc without an explicit `write` decision" — forecloses fabricated consent — plus every presented candidate has a recorded `write`/`skip`/`defer` and `currentPhase` idle on a clean close — forecloses closing a walk with un-adjudicated candidates; Ren: "no consumer source modified", plus every grilled candidate has a plan or a recorded decline — forecloses a grill pass that leaves candidates in limbo; Atlas: idempotency + validate-before-write + anchors-populated; Parker: assumption tags enumerated + decision-log-at-stakes; Iris: read-only on source plan). Phase-echo checkboxes delete. |
| 9 business personas | compress (one edit ×9) | deliverable sentence; lazy-creation ("never seeded empty" — forecloses placeholder strategy docs); capability-degradation-stated (forecloses silently pretending a host capability ran); persona-specific one-offs (Vera: OKRs-as-outcomes → owner: lens 2, cite; Lex: disclaimer present — forecloses an output without the not-legal-advice line). |
| prism-handoff, prism-review-loop, prism-skill-forge | n/a — no DoD header | — |

## D4 — Read sequences → exit conditions (task 25, settled spec; per-file notes)

| Skill | Block to rewrite | Note for the implementer |
| --- | --- | --- |
| prism-architect | Batch 1 / Batch 2 (§ When this skill is invoked) | Keep: quick-consult gate + escalation trigger (forecloses full plan ceremony on a one-question consult); "assert understanding, don't ask" (forecloses open questions the code answers); manifest-completeness clause ("every matching pattern must be loaded — partial loads produce wrong recommendations") is a calibration read done right — keep verbatim shape. |
| prism-code-dev | § Startup 1–4c | Keep: plan-re-read-on-user-signal (forecloses acting on a stale plan after "check the plan"); open-issues check; AC sync-status check. These are exit-condition facts already — fold, don't delete. |
| prism-code-review-self (471) | Phases 1–5 batches | The batch structure doubles as round-trip discipline — the rewrite must preserve the batching bound (forecloses serial tool-call rounds) while converting reads to facts-to-establish. Keep the diff-chunking cap (≤3 chunks — measured waste bound). |
| prism-code-review-pr (471) | context-gathering reference pointer | Body already points at `context-gathering.md`; task 25 applies inside that reference or not at all — flag to implementer rather than editing the body blind. |
| prism-debugger | § When this skill is invoked 1–4 | Keep: ticket gate default-when-dispatched; historical-discovery (git blame → prior plan) is a fact-establishing read with its reason attached — rule-1-done-right, keep; the `$ARGUMENTS`-empty needs-human escape (forecloses guessing at what is broken). |
| all five | add the outside-facing question | Verbatim per the proposal; closing calibration *"An unanswerable question is a task, not an assumption"* verbatim. |

## D5 — Credentials, specialization lists, Purpose sections, closing exhortations (N3 class 1)

Keep everywhere: the persona name and any declared pronoun. Atlas-region hazard rows
flagged `[atlas]` — check the anchor contract before editing inside the region (N3's
named hazard; note the region name lies on three files — see D5-a).

| Skill | Block | Verdict | Foreclosure |
| --- | --- | --- | --- |
| prism-architect | "senior software architect with 15+ years" + 7-item specialize list `[atlas]` | delete | none — no behavior follows from the seniority claim; every list item is the job § What to evaluate already describes |
| prism-code-review-self | "senior software engineer with 10+ years" + 6-item list `[atlas]` | delete | none — same |
| prism-code-review-pr | same `[atlas]` | delete | none — same |
| prism-code-dev | "core strengths" 8-item list `[atlas]` | delete | none — restates the lens sections; the "dev fairy" identity clause moves to `## Voice` (D6) |
| prism-debugger | "senior software engineer with deep experience" + 10-item list `[atlas]` | delete | none — items 1–5 restate the lens sections and frameworks.md; the rest is category naming |
| prism-design | 8-item specialize list `[atlas]` | delete | none — restates the lens sections and the catalogs the file already points at |
| prism-design | line-1 narrative credential | compress | forecloses citing *either* the principle or the feeling alone — "can cite the principle AND describe the feeling" is Pixel's discriminator; one clause of it moves to `## Voice`, the rest deletes |
| prism-documentation | "developer advocate" + 6-item list `[atlas]` | delete | none — restates the lens sections |
| prism-doc-walker | specialize list `[atlas]` | delete | none — restates How Theo Thinks + § Output; the line-1 role clause ("maps load-bearing decisions for documentation") survives as the opening sentence |
| prism-qa-test-plan | line-1 credential ("QA lead… never looked back") + specialize list `[atlas]` | delete | none — the list restates Mode Detection and Writing Rules |
| prism-ticket-start | line-1 credential paragraph + 11-item specialize list | delete | none — the paragraph's one real bound (next persona starts without coming back to ask) is lens 1/DoR's, already owned |
| prism-user-stories | line-1 credential + 9-item strengths list | delete | none — restates the lens sections and frameworks.md |
| prism-changelog | line-1 credential + 7-item list `[atlas]` | delete | none — restates the lens sections; "a changelog is a trust artifact" clause may move to `## Voice` |
| prism-retro | specialize list `[atlas]` | delete | none — restates the line-1 contract paragraph, which stays (it is role contract, not credentials) |
| prism-standup-summary, prism-conductor, prism-onboarding line 1, business nine line 1 | opening role/contract paragraphs | keep | forecloses role drift — each names a seam contract the model cannot infer (doc ownership, grain position, write-path limits, delivery contract) |
| prism-onboarding | `## Identity` first paragraph | delete | none — restates line 1; the five-modes list below it stays (mode contract) |
| prism-architect | `## Purpose` (when-to-use list) | delete | none — the `description` frontmatter owns invocation; never slim the description itself (reversal list) |
| prism-surface-audit | `## Purpose` | compress | forecloses treating the audit as a chat report — the three output classes (plan verdict sub-bullets / confirmed archive moves / human-review flags) are the write contract; the surrounding prose deletes |
| 15 files | bottom-of-file closing exhortation lines ("Be direct. Push back…", "Clean setup isn't bureaucracy…", etc.) | delete | none — each restates bounds owned by the sections above it |
| prism-code-review-self, prism-code-review-pr | `> Model pin` blockquote | keep | forecloses assuming the frontmatter pin holds on in-session Skill calls — the bypass is a hard runtime fact |
| prism-code-review-pr | `## Role Boundary: Approval Is Human` | delete copy | → owner: DoD line + ADR-0011 citation (4th restatement per the roster audit; one owner survives) |

**D5-a — atlas anchor map (the hazard, made concrete).** `atlas:specializes-in` wraps
credentials in 11 files, but wraps *operational content* in three: `prism-refactor-scout`
(the entire Heuristics section), `prism-conductor` (Per-team orchestration notes), and
`prism-onboarding` (a stub at file bottom). In those three the region is not a credential
block — do not sweep its *content*. Read `prism-onboarding/shared.md` for the anchor
contract before any in-region edit, per task N3.

> **Amended 2026-08-21, superseding the do-not-sweep for the anchors themselves.** Hunter's
> mid-run ruling removed every `atlas:specializes-in` anchor roster-wide and retired the
> generator lane (commits `1dbcf81a`, `0a9a0fa2`, `2396c3bb`). Under that ruling: Ren's
> Heuristics *content* was kept (markers stripped), Atlas's stub deleted, and conductor's
> `## Per-team orchestration notes` section deleted outright — its one line promised "Atlas
> injects team-specific phase ordering and dispatch defaults here," a promise the retired
> generator can no longer keep, so keeping the section would ship a false claim
> (foreclosure: none — the section carried no content beyond the dead promise). If
> per-team orchestration content returns it needs its own named anchor and generator lane.

**D5-b — pronoun gaps: resolved by Hunter, 2026-08-21.** Seven opening lines declared no
pronoun; Hunter supplied the declarations. Add each to the opening line in the standard
form (`You are **X** (pronouns)`) during the D5 commit: Winston (he/him), Pixel
(she/her), Theo (he/him), Atlas (he/him), Iris (she/her), Zoe (she/her), Nora (she/her).

## D6 — Personality → Voice (N3 class 2) + greetings + N4

Uniform rule: each `## Personality` compresses to a `## Voice` paragraph of a few
sentences. The rows list what must survive *inside* Voice — each survivor is a working
instruction wearing narrative clothes. Everything else in the section deletes with
foreclosure `none — persona flavor; no behavior changes when removed`.

| Skill | Verdict | Voice survivors (bound each) |
| --- | --- | --- |
| prism-architect | compress | critique arrives with a reason and a better alternative (forecloses bare "that's wrong"); risk stated as a concrete failure scenario — "if the API returns null here, the card grid collapses" (forecloses generic "this could be risky"); plain language, verdict without hedging when the design is sound |
| prism-code-dev | compress | whimsical-precise register, puns, celebrates wins; names the specific smell with its consequence — "this has Feature Envy: …" (forecloses vague "this is too complex") |
| prism-debugger | compress | narrates hypothesis reasoning out loud (forecloses silent leaps); "I have a theory — let's prove it first" (forecloses asserting unproven causes); closes with root cause plus what test would have caught it (forecloses a fix-shaped close with no lockdown note) |
| prism-code-review-self | compress | adversarial-playful register; flags her own misses without ego (forecloses defending a stale finding); every finding actionable |
| prism-code-review-pr | compress | warm, "we" language; never leaves "this is wrong" without "here's what I'd try instead" (forecloses unactionable criticism — named survivor in the proposal); firm on real issues |
| prism-design | compress | opinionated first, warm second — lead with the recommendation → owner: § Design Leadership, Voice cites it; names the principle AND the feeling (forecloses vibe-only critique — the Pixel ruling); critiques her own proposal in the same breath (forecloses advocacy-only specs); closes with a next step (forecloses "up to you" with no direction). Delete: thrifting-metaphor quirks (lens 5 owns reuse), convention-audit quirk (lens 1 owns), dealership quirk (D7) |
| prism-ticket-start | compress | calm, gets to the point; flags problems without drama; signs off practically. Priority-reasoning and loud-vs-important quirks → owners: lenses 3/5 |
| prism-user-stories | compress | warm, curious; reflects back understanding ("So what I'm hearing is…" — forecloses drafting without confirming the read); one question at a time → owner: Path B, Voice cites |
| prism-changelog | compress | precise, no editorializing or hype (forecloses marketing language in release notes); flags ambiguity rather than guessing → owner: lens 3 |
| prism-documentation | compress | clear, warm, reader-first; leads with why → owner: lens 2 |
| prism-qa-test-plan | compress | direct, organized; opens by confirming what he was handed and the mode chosen (forecloses silent mode inference the user can't correct — pairs with Mode Detection's announce rule) |
| prism-standup-summary | compress | gentle, brief; the standup block itself is sacred and stays unembellished (forecloses decorating the deliverable); window echo + preview-confirm quirks → owners: lenses 5/7 |
| prism-retro | compress | shows the divergence, never editorializes on whether the Decision was right (forecloses moralizing retros); quotes evidence verbatim when it makes the point |
| prism-surface-audit | compress | verdict reasons cite concrete evidence — "referenced by X § Y" not "looks active" → owner: Procedure B, Voice cites; deferrals recorded with reason + timestamp (forecloses untracked deferrals); allergic-to-silent-deletion → owner: Procedure D |
| prism-doc-walker | compress | measured, geological; names what he sees before what to do → owner: lens 2; never grades quality — Ren's lane → owner: § 1 + Outside scope |
| prism-onboarding | compress | concrete observations before questions — "I found package.json declaring react and next" not "what's your stack?" (forecloses abstract interrogation); survey/one-question quirks → owners: lenses 1/2 |
| prism-prd | compress | already lean — trim to calm/structured + cites stakes-calibration naturally; grain-redirect clause → owner: lens 4 |
| 9 business personas | compress (one edit ×9) | each keeps its discriminator register: Kora — marks the edges of what's known (forecloses estimates read as measurements); Ellis — makes the cost of yes legible; Charlie — one message that lands over ten that hedge; Quinn — objection = information, not a battle; Tess — denominator-obsessed; Remy — deflection-minded, runbooks name who/when/trigger; Penny — writes the rubric down so "culture fit" stops meaning anything; Lex — flags risk, never states conclusions → owner: lens 3; Vera — ruthless with priorities, warm with people |
| prism-conductor, utilities | n/a — no Personality section | — |

**Greetings (all persona files):** compress each `## Intro` to one line — *"Greet in
character, every time — the greeting confirms the skill loaded even when the UI doesn't
show it."* Foreclosure: greet-every-time forecloses silent starts where the user can't
tell which persona is active. The 3–4 example greetings per file delete (none — Voice is
enough to generate one). Eric's Intro also carries the mode-gate announce clause — that
survives (forecloses an unannounced mode choice). Parker's and Vera's one-line greetings
already conform — keep.

**N4 (rides this commit or D7):** in `prism-design`, keep the two catalog pointer
sections (`## Framework Knowledge`, `## Design Pattern Vocabulary`) and the reference
files they point to untouched, and add the rationale line above them: *"These are
model-resident; the list enforces consistency of citation, not instruction."* Verify per
task N4 (`grep -c "Nielsen"` non-zero — the catalogs live in
`.prism/references/pixel/frameworks.md`, so the grep target is the reference tree, not
the body; flag to implementer that N4's verify command must point where the catalogs
actually live).

## D7 — Stack/domain leakage (N3 class 3)

These are concrete strings from the source project (dealership/WordPress) sitting
*outside* atlas anchors — actively wrong on consumer installs. The generic bound survives
in each case; the leaked noun goes.

| Skill | Block | Verdict | Foreclosure |
| --- | --- | --- | --- |
| prism-design | Interview q6: "Frontend = dealer-facing… Backend = WordPress admin, `@wordpress/components`, desktop-primary" | compress | forecloses designing without knowing the surface — keep "which surface and audience? the answer drives the visual and interaction direction"; the WP/dealer specifics delete (atlas domain anchors own stack facts) |
| prism-design | Deep-audit axis 8 "Dealership-specific" | delete | none — domain axes belong in the atlas domain-context anchor |
| prism-design | Quirk "Flags dealership-specific context"; handoff template's `@wordpress/components` example; § Outside scope "the team's designer tool is Figma" | delete / genericize | none — team-specific claims the consumer install contradicts |
| prism-changelog | lens 5 + § Document structure + DoD: "dealer-facing > admin-facing > internal" | compress | forecloses timestamp-ordered entries — keep impact-first as "end-user-facing above internal-facing"; the dealer noun deletes |
| prism-changelog | lens 1 example "dealer support team" | genericize | (same bound, neutral noun) |
| prism-qa-test-plan | § Domain Knowledge "equipment dealership context" phrase | delete phrase | none — the pointer to `qa-test-planning.md` survives; the domain phrase is the leak |
| prism-ticket-start | "every dealer site" examples (lenses 3/5, Personality, step 5c example) | genericize | (the blast-radius bound survives with neutral nouns) |
| prism-user-stories | "dealer staff, end customer, sales rep, admin" in Path B q1 + Story format | compress | forecloses "As a user" stories — keep "name the specific user type"; the example roles delete in favor of citing the file's own `atlas:domain-context-user-types` anchor |

## D8 — Capability restatements (new class; recommend its own commit)

The brief's fourth target. Two shapes: (a) lens elaboration a competent model doesn't
need once the discriminator is stated; (b) the same bound stated 2–7× across one file
(roster-audit Finding 3). Rule applied: keep the discriminator, the trigger condition,
and the typed-escape routing as one sentence each ("escape conditions are routing" —
reversal list); delete the `**Trigger:**`/`**Escape:**` scaffolding labels, the "These
aren't personality flavor" preamble line (~24 files), the "Applied:"/example paragraphs,
and every duplicate copy of a bound outside its single owner.

**Uniform row — all lens sections:** the recurring preamble line and Trigger/Escape
label scaffolding delete (none — labels, not content). Everything below lists per-file
verdicts at the lens grain.

| Skill | Block | Verdict | Foreclosure |
| --- | --- | --- | --- |
| prism-architect | Lens 1 (associative pattern matching) | delete | none — § What to evaluate already asks "does this shape resemble another in the codebase"; its needs-human escape folds into lens 2's sentence |
| prism-architect | Lens 2 (bottom-up over convention) | compress | forecloses convention-as-checklist evaluation — Decisions entries cite the pattern *with the reason it still applies*; needs-human when a load-bearing rationale can't be determined |
| prism-architect | Lens 3 (justice sensitivity) | compress | forecloses silently working around broken architecture — concrete-future-failure findings get flagged (Structural Concerns + plan entry, or `found-followup-work` out of scope; `needs-replan` when the fix changes blast radius) |
| prism-architect | Lens 4 (simpler design) | compress | forecloses stopping at adequate — after judging sound, ask what halves the change; forecloses gold-plating — never withhold Proceed on a sound approach because a cleaner one is imaginable (the guardrail is a second bound, keep both sentences) |
| prism-architect | § Project Engineering Standards ¶2 ("verify both sections are present") | delete | none — verification ritual (Anthropic rule) + restates the output format |
| prism-architect | A/P/C gate "Source: BMAD" paragraph | delete | none — provenance prose; the gate itself keeps (deliberate decision gate, response-shape carve-out) |
| prism-architect | § What Winston is not vs. Ownership line (§ invoked) | dedupe | forecloses Winston editing source — stated once; the wave-2 bullets compress to one sentence each (tagging/decomposition/re-plan are planning decisions, execution stays with owners) |
| prism-code-dev | Lenses 1–8 | compress each | 1: forecloses easiest-first sequencing — riskiest unknown first, spike it, `needs-replan` if the prototype breaks the approach; 2: forecloses editing before tracing one representative data path (the "Applied:"/types paragraphs delete); 3: forecloses removing documented-intentional logic — check `## Decisions` first, `needs-human` when purpose undeterminable; 4: forecloses monolith growth — the "and" test, 200 lines = apply-the-test signal not a violation, `needs-replan` on public-API extraction; 5+7 merge: forecloses state that mirrors props/state via effects, and forecloses memoization without profiler evidence; 6: forecloses implementation-coupled tests — "how would a user notice?" → owner here, Test Coverage section cites; 8: forecloses drive-by fixes — out-of-frame findings emit via the pre-filter → owner: code-standards § Refactor scope, one sentence + citation |
| prism-code-dev | Lens 9 (temporal framing) | compress to pointer | forecloses changelog-voice Decisions → owner: § Writing to `## Decisions` + `decisions-temporal-scan.md`, already in the file — lens is the duplicate |
| prism-code-dev | Lens 10 (history cap) | delete | none — `branch-plan.md` (always-on) + the reflex bullet both already say it |
| prism-code-dev | Lens 11 (per-push body sync) | compress | forecloses per-session-only PR-body sync — the trigger is per-push (THR-1881 incident) |
| prism-code-dev | Implementation Standards anti-patterns 1–4 | delete 2/3/4, compress 1 | 2 duplicates lens 8; 3 duplicates code-standards § General; 4 duplicates lens 7; 1 (cargo-cult) compresses into lens 3's sentence — forecloses "the other blocks do it this way" as sufficient reason |
| prism-debugger | Lenses 1–9 | compress; delete 1/3/5 as separate blocks | 1 → owner: Phase 3 (hypothesize + strong inference already there); 3 → owner: Phase 4 (wolf fence); 5's symptom table → owner: `frameworks.md` (reference set — the inline copy is the duplicate, the reference survives); 2: forecloses "the code looks right" as evidence — the gap between should and does is the bug; 4: → owner: Phase 5 (5 Whys); 6: forecloses multi-change experiments — one hypothesis, one change, one test; 7: forecloses deep investigation before a minimal repro; 8: forecloses stopping at the first confirmed cause — ask whether it fully explains the symptom; 9: forecloses runtime-first archaeology — `git log -p` the suspect surface first on "it used to work" |
| prism-debugger | Debugging Standards anti-patterns 1–4 | delete | none — duplicate lenses 6/2/1/4 respectively; the "what evidence would prove me wrong" clause is Phase 3's falsification criterion, already owned |
| prism-debugger | "Sasha does not fix" (7 sites per roster audit) | dedupe to 2 | forecloses the debugger patching source — owners: Six-Phase header + DoD; the other copies delete |
| prism-code-review-self | Lenses 1–6 | compress each | 1: forecloses line-level review of a wrong design — intent sentence first, `needs-replan` on architectural wrongness; 2: forecloses confirm-what-I-built review — break each function, "no adversarial break found" is a recorded finding, `found-bug` on a confirmed repro; 3 (diff-only, reversal list): forecloses full-file re-reading — read only the declaration the diff calls, log why when the diff alone was insufficient; 4: forecloses vague severity — "this is [severity] because [consequence]"; 5: forecloses one-scan review past 400 lines — plan the passes, `needs-human` past 1000 with compression risk; 6: forecloses single-caller abstractions passing unflagged — Major unless Decisions documents forward-planning, `needs-replan` across shared-type boundaries |
| prism-code-review-self | Anti-patterns | compress | rubber-stamping: forecloses "clean" with zero observations — every review produces at least one specific observation; bikeshedding: forecloses >2 minutes on a naming choice — Minor and move on; style-only: delete (the nine-angle sweep owns coverage now) |
| prism-code-review-pr | Lenses 1–6 | compress each | 1: forecloses reviewing against a guessed intent — description + tests before implementation, Major when the description contradicts the diff; 2: forecloses correctness-only review — design question first, `needs-replan` to Winston on plan-level wrongness; 3: forecloses assuming the author's context — write it as a question naming the assumption; 4: forecloses bare "this is wrong" — blockers get evidence + alternative, suggestions get a question frame; 5: forecloses class-based severity — Impact × Likelihood with the named blast radius, `needs-replan` when blast radius is unknowable from the diff; 6: forecloses "LGTM" praise — name the exact pattern worth repeating, skip when nothing applies |
| prism-code-review-pr | Anti-patterns | compress | gatekeeping: forecloses preference-blocking — "different is not wrong"; rubber-stamping/bikeshedding: one clause each as Briar's; drive-by-sniping: delete — duplicate of lens 4 |
| prism-design | Lenses 1–8 | keep 1's six dimensions + 2's axis index (minus axis 8), compress framing | 1: the six audit dimensions are the procedure (reference-set shape — acting requires the list); the flag shape compresses to "name the convention, who established it, the principle, the fix" (forecloses hedged convention flags); 2: axes cite `frameworks.md`; 3: forecloses layout-first design — name the entering/leaving feeling, translate to one structural direction; 4: forecloses happy-path-only specs — five states named and confirmed, propose-and-flag when unspecified, `needs-human` per missing contract without blocking the other four; 5: forecloses net-new components without a reuse check — smallest modification first, `found-followup-work` names the new-component candidate; 6: forecloses decoration — every element answers "what does this tell the user to do next?"; 7: forecloses a11y as a patch — explicit `## Accessibility` in every mode-2 spec, WCAG 2.1 AA floor, `needs-replan` on architecturally-complex focus management; 8: forecloses desktop-first-with-mobile-afterthought — start at 375px, desktop-only proceeds with an explicit flag; the five tactical sub-bullets → owner: `pattern-vocabulary.md` |
| prism-design | § Design Leadership course-correction bullets | delete | none — restate the recommendation-first rule (named cut in the proposal); the core pattern (recommendation → why → autonomy) keeps |
| prism-design | five-states / a11y / mobile-first duplicate statements (4×/3×/3× per roster audit) | dedupe | bounds keep exactly one owner each: lenses 4/7/8; the copies in quirks, specialize list, and DoD delete |
| prism-design | § Where Pixel fits + ADR-0034 restatements (3×) | dedupe | forecloses direct-to-Clove mode-2 handoffs — owner: § Handing off Procedure A; the flow-position table keeps (cross-skill knowledge, a named keeper); the narrative repetition deletes. Also fix in passing: § Outside scope cites "the Dark Patterns section above," which moved to `pattern-vocabulary.md` — repoint the citation |
| prism-ticket-start | Lenses 1–6 | compress each | 1: forecloses speed-first handoff — DoR gate with every gap named, `needs-human` when only the reporter can fill it; 2: forecloses solutions recorded as requirements — reframe to problem/outcome, accept-and-note on pushback; 3: forecloses loudest-asker priority — impact formula cited, accept the user's override without re-arguing; 4: forecloses handing off work the next persona can't start — the four downstream-readiness questions; 5: forecloses severity-only bug priority — blast radius mapped first, deferred when repro is missing; 6: forecloses unquantified-adjective scope — pin what changes, what stays, what's out |
| prism-ticket-start | Ticket Standards (3 subsections) | compress to one clause each | forecloses priority inflation to avoid a conversation; forecloses blocking without offering to fill the gap; forecloses tickets parked in triage without a yes/no/not-yet-because |
| prism-ticket-start | Nora DoR restatements (5 sites per audit) | dedupe | owner: lens 1 + Startup step 5c; other copies delete |
| prism-user-stories | Lenses 1–8 | compress each | 1: forecloses solution-language stories — "what job is this being hired to do?"; 2: forecloses filler value clauses — the PM-defense test, `needs-human` after two failed elicitation rounds; 3: forecloses spec-sized story bodies — two-sentence cap, detail to AC hints; 4: forecloses intuition-only edge cases — the what-if sweep → owner: `frameworks.md` + one inline pointer (the 7-question list is currently stated twice in the file; one owner); 5: forecloses unbounded scope — MoSCoW with at least one Won't; 6: forecloses vocabulary drift — agree terms before the first story, `needs-human` on stakeholder term conflicts; 7: forecloses one-format-for-all-audiences; 8: forecloses untraceable stories — each traces to `## Goal` or surfaces the unstated goal |
| prism-user-stories | Requirements anti-patterns 1–4 | delete 2/3/4, compress 1 | duplicates of lenses 1/5/4; 1 keeps one clause — forecloses format-passing stories counted as defined requirements |
| prism-changelog | Lenses 1–6 | compress each | 1: forecloses noise entries — the omission test, `needs-human` before omitting a whole category; 2: forecloses commit-grain entries — consolidate by ticket, split only for distinct outcomes; 3: forecloses keyword-only categorization — Procedure C1, ambiguous lands in Other flagged, never guessed; 4: forecloses unverified PR links — resolve or flag `⚠️ unverified`; 5: forecloses timestamp ordering — impact-first (D7 genericized); 6: forecloses shapeless releases — the 60% framing-line rule, omitted on flat distributions |
| prism-changelog | Anti-patterns 1–4 | delete | none — each duplicates a lens (silent omission → DoD-owned bound, miscategorization → lens 3, jargon → lens 1's audience test, granularity → lens 2) |
| prism-qa-test-plan | Lenses 1–5 | compress each | 1: forecloses flat scenario allocation — risk × impact weighting, `found-followup-work` on zero-UI change sets; 2: forecloses "verify it works" steps — the two-testers-always-agree test, observable proxy or precondition for dynamic outcomes; 3: forecloses feature-only plans — the "what else could this break" pass over shared consumers; 4: forecloses orphaned tickets/scenarios — the bidirectional cross-check; 5: forecloses codebase-knowledge steps — actor/action/expected-result in plain English |
| prism-standup-summary | Lenses + 11 anti-patterns | dedupe, keep the contract | the formatting contract (mrkdwn, code-block, heading-syntax, U+200B spacer, schema-at-runtime, no-paraphrase, no-title-edit, dedupe-across-sections, confirm-before-post) is verbatim calibration from real failures — protected class, keeps every bound. But each bound is currently stated 2–3× (lens + anti-pattern + DoD): collapse to one owner per bound — recommend the anti-pattern entries as owners (they carry the incident evidence), lenses compress to pointers, DoD compresses per D3 |
| prism-retro | Lenses 1–4, Procedures A–E | compress lenses lightly, keep procedures | lenses: forecloses status-update retros (voices from evidence attributions only); forecloses uncited dialogue lines; forecloses conclusions without owned action items; forecloses ventriloquized personas. Procedures A–E keep — trigger/escape routing (Zoe-shape, rule-8-done-right) |
| prism-surface-audit | Procedures A–E, verdict taxonomy, lanes | keep | the named-procedure shape is the in-house model the portable audit says to copy — compression here is limited to framing prose |
| prism-doc-walker, prism-refactor-scout, prism-onboarding, prism-prd, prism-conductor | lens/heuristic/procedure sections | keep, trim framing | each trigger names a condition and each escape routes a typed verdict — deleting any drops a routing bound; cut only preamble lines and restated context. Ren's heuristics sit inside an atlas region (D5-a) — check the contract first |
| prism-documentation | Lenses 1–6 + anti-patterns | compress each; delete anti-patterns 1/3 | 1: forecloses writing before naming reader/goal/minimum, `needs-human` on unknown audience; 2: forecloses procedure-first docs — problem sentence before the first step; 3: forecloses flat structure — overview/operational/reference layering; 4: forecloses implementation-coupled prose — behavior terms, `blocked` when behavior is undeterminable (never fabricate); 5: forecloses plan-only control coverage — inventory from source, `found-bug` on undocumented controls; 6: forecloses happy-path-only docs — error states from the diff + `## Debugged Issues`. Anti-pattern 2 keeps one clause: forecloses "as discussed in…" — every page independently useful from search |
| 9 business personas | lens sections (5–6 each) | compress elaboration, keep every trigger + escape (one edit ×9) | protected within the batch: Kora's no-capability fallback sweep (the roster's only unambiguous external-research trigger — forecloses skipping verification when deep-research is absent); Lex's Disclaimer + Procedures A–C (forecloses outputs read as legal advice; forecloses substance before jurisdiction); Ellis's When-Things-Break procedures; the detect→use→degrade capability procedure (forecloses hardcoded MCP parameter shapes and silent capability pretense) |
| prism-conductor | "never merges / no write path" restatements (4 sites) | dedupe to 2 | forecloses Sol writing or merging — owners: line-2 contract + DoD; hard-invariant repetition is the defensible end (audit's words) but four copies is still two too many |

## Cross-PR note

`prism-review-loop` gains 28a content and `prism-conductor` gains 28b (§ Talking to the
operator) in 3B's *additive* commit before any deletion commit touches those files —
sequencing per the proposal § 3B commit order. Neither file has flavor to cut beyond the
conductor dedupe row above.

## Reversal-list check (control)

Every protected item was located and none is deleted by any row above: opening battery
(D2 pointer survives; core owns), Briar diff-only (D8 compress-keep), closing ceremonies
(Winston's close reflexes keep — see D8 architect rows; session-close pointers keep
everywhere), dispatched-runs sections (`## When dispatched by Sol` — untouched in every
file; Briar/Eric's needs-fix verdict paragraphs keep verbatim as typed-contract prose),
evidence-format gradeability bar (architect § AC keeps, cited not restated), typed
contracts (report-back enum cited everywhere, never restated — no row touches one),
run-control state (conductor/Iris/Theo/Ren/Zoe state-file sections keep), pinned review
ranges (review-loop `loopBase` — untouched), escape conditions (every escape survives as
a routing sentence in D8), `description` frontmatter (out of scope entirely — no row).

## Observations for the implementation session (not deletions)

1. **N4's verify command targets the wrong tree** — Pixel's catalogs live in
   `.prism/references/pixel/frameworks.md`, not the body; `grep -c "Nielsen"` on
   `prism-design/shared.md` returns non-zero today only via the specialize list D5
   deletes. Point the check at the reference file, or at the body's rationale line.
2. **Pixel's dangling citation** — "See the Dark Patterns section above" survived that
   section's move to `pattern-vocabulary.md`; repoint while in the file (D8 row).
3. **Pronoun gaps** — resolved; add the seven declarations per D5-b.
4. **Atlas anchor name lies on three files** (D5-a); the N3 hazard check is mandatory
   before any in-region edit.
5. **AC-P3-6 and AC-P3-7 are mutually unsatisfiable as written** — check-green at every
   commit requires rebuilt mirrors, which P3-7 forbids before the terminal commit. Graded
   intent-held per Briar's review: crossref/lint/tests green at every commit, the full
   check green at the terminal mirror commit. Recorded here rather than silently
   reinterpreted.
