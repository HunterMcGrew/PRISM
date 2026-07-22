# Evaluation: should PRISM's prose decision-gates convert to `AskUserQuestion`?

> Winston, evaluate mode — 2026-07-21, on `main` @ `b5afc58`. Dispatched by Sol, internal autonomy.
> Scope: per-gate recommendation for Winston's A/P/C, Theo's write/skip/defer, and Sol's human gates against the new "Surface the ask, don't bury it" bullet (`followup-port-2197-surface-decisions.md`). No skill-body edits, no `pnpm prism:build`. This file is the only write.

## Orientation

- **Intent:** decide, per gate, whether it should render as a structured `AskUserQuestion` or stay a prose menu — a reasoned split, not a blanket call.
- **Ambiguity:** none load-bearing. The one thing that could have blocked — whether `AskUserQuestion` is even reachable where each gate fires — resolved empirically (below), not by assumption.
- **Bounds:** recommendation only. No skill bodies, no rule edits, no build. If any gate converts, I name the carve-out change and the blast radius so the follow-on ticket writes itself; I do not make the edit.
- **Approach:** read the canonical sources for all three gates and the new bullet; establish where each gate fires (interactive vs. mid-dispatch) before judging fit; run each against the bullet's own scope guard and `AskUserQuestion`'s shape limits.

## The finding that orders everything: where the menu actually renders

`AskUserQuestion` needs an interactive session with a user present. It is **not in this dispatched session's toolset at all** — not even deferred — which is itself the cleanest confirmation of the constraint: a Sol-dispatched agent has no such tool. So the first question for every gate is not "does it fit the shape" but "is a user even there when the menu renders."

Running that check against the three gates splits them cleanly:

| Gate | Fires in | User present when the menu renders? | `AskUserQuestion` reachable? |
| --- | --- | --- | --- |
| Winston A/P/C | Interactive evaluate session, after Devil's Advocate | Yes | Yes |
| Theo write/skip/defer | Interactive walk, phase 3 (present) | Yes | Yes |
| Sol's human gates | **Inside autonomous Workflow dispatches** | **No** (mid-dispatch) → batched → surfaced later by Sol at the segment boundary | Only at the boundary, and only for shapes that fit |

The decisive detail for the two persona gates: **on the autonomous path they never render as a menu.** When Sol dispatches Winston, A/P/C returns a gate disposition (`auto-cleared` / `needs-human`), not a rendered menu (`report-back.md` gate registry, line 117). When Theo is dispatched with no user, he emits `needs-human` at the first candidate rather than prompting (`prism-doc-walker/shared.md` § How Theo Thinks 4). The prose menu only ever reaches a human in the **interactive standalone** session — exactly where `AskUserQuestion` is available. That means converting either gate's *rendering* is safe by construction: it touches only the interactive path; the autonomous path already routes them as typed dispositions and is untouched by a rendering change.

Sol is the opposite. Its gates are raised by owning personas *mid-dispatch*, where `session-orientation.md`'s calibration clause holds plainly: "there is no user available mid-dispatch." They batch into `pendingHumanReport` and Sol — "the conversational main loop" (`prism-conductor/claude.md:18`) — surfaces them at the segment boundary. A user *is* present at that boundary. So Sol is not blocked by availability the way a mid-dispatch persona is; Sol is decided by *shape*, below.

---

## Per-gate verdicts

| Gate | Verdict | Single most important reason |
| --- | --- | --- |
| Winston A/P/C | **Convert-conditionally** — pilot candidate | Best fit: interactive-only rendering, fires once, three discrete options; convert after the bullet has a track record, since value is unproven and this gate isn't yet suffering burial. |
| Theo write/skip/defer | **Convert-conditionally** — after the pilot | Strongest *decision* fit (three action-changing outcomes), but multi-candidate repetition adds a batch-judgment tradeoff prose handles today; convert only with a conversational escape preserved. |
| Sol's human gates | **Stay prose** | The report is a legitimately board-leads orchestration update whose batched asks are often free-form and can exceed `AskUserQuestion`'s 4-question / 2–4-option limits — the bullet's own carve-out already blesses prose here. |

### Winston A/P/C — convert-conditionally, and make it the pilot

A/P/C is a genuine user-owned branch, not a proceed-gate: [A] re-engages on a raised concern, [P] re-runs the evaluation through another persona's lens, [C] continues to Suggested Approach. Two of the three options change what Winston does next — that clears the new bullet's scope bar ("decisions the user owns that change what you do next"). The option set is exactly three, comfortably inside the 2–4 limit, and the auto-added "Other" absorbs "actually, let me ask something specific" (which is [A] anyway). Evaluate output is long — Understanding, Premise gate, Recommendation, Structural Concerns, a11y, a four-part Devil's Advocate — so the trailing gate is at real risk of being scrolled past, which is precisely the burial the bullet targets.

Why conditional rather than convert-now: the bullet's value is unproven until it has mileage, and A/P/C works acceptably as prose in an engaged conversational session today. This is the *lowest-risk place to prove the pattern* — it fires once per session (no repetition), has no batch wrinkle, and its rendering is provably isolated to the interactive path. Pilot here; if it proves out, extend to Theo.

Condition: (1) the port has landed and accumulated a track record of agents reaching for `AskUserQuestion` on ad-hoc asks; (2) the question prose preserves the Devil's-Advocate context the options reference, so the structured render doesn't strip the connective tissue that makes [A]/[P] meaningful.

### Theo write/skip/defer — convert-conditionally, after the pilot

This is the cleanest *single* decision of the three: write → draft (phase 5), skip → move on, defer → mark for later. Three discrete, action-changing outcomes, and the "Other" slot maps naturally onto Theo's phase-4 "discuss first" path. It also repeats once per candidate across a long, resumable walk — so an unmissable render arguably pays off more than Winston's once-per-session gate.

The wrinkle that makes it *second*, not first: repetition cuts both ways. A walk that surfaces many candidates would fire many structured popups. Each is a genuine decision (so it is *not* the popup-fatigue the scope guard warns against — that guard is about non-decisions), but prose affords something a rigid per-candidate question does not: **batch judgment** — "write the two in `core/`, skip everything in `utils/`" in one message. `AskUserQuestion` is one-to-four discrete questions per call; it cannot capture a fuzzy batch rule as fluidly. Converting Theo is right, but only if the conversion preserves a conversational escape for batch answers rather than forcing the walk into one-candidate-at-a-time popups.

Condition: the Winston pilot has proven out, **and** the conversion keeps a batch-judgment escape (an explicit "or give me a rule to apply across candidates" affordance alongside the structured selection).

### Sol's human gates — stay prose

Two independent reasons, either sufficient:

1. **Shape.** `pendingHumanReport` batches whatever parked the segment — possibly several lanes on `needs-human`, `OPEN —` decisions, an integration-gate approval, parked-lane reasons. `OPEN —` resolutions are frequently *free-form* ("what should the default be for X?"), which the bullet itself routes to a prose block, not a structured question. A fleet run can park more than four lanes, exceeding the 4-question-per-call cap outright. And the step-10 report carries structure — tree view, per-team summary, budget attribution, discovered spin-outs — that collapsing into popups would destroy.
2. **The bullet already blesses this.** Its own text carves out "a status or orchestration update the board legitimately leads and the ask follows the context." Sol's report *is* that update. The bullet's instruction there is to surface the ask unmissably *within* the prose, not to convert the report to popups.

Sol's mid-dispatch emit side is settled independently: no user is present, so no conversion is even possible there — the typed-disposition batching is correct as-is.

One narrow, non-blocking future note (not a conversion): if a segment breaks on a *single* discrete, clearly-optioned gate — the integration gate is a clean two-option "approve dispatch / escalate" — Sol *could* append one `AskUserQuestion` after the prose report that carries the context. That is an optional enhancement far downstream of proving the pattern on the persona gates, not part of this recommendation.

---

## The existing carve-out: reframe, don't delete

Constraint that any conversion has to answer: the same section's second carve-out names A/P/C and write/skip/defer as examples of gates that "stay menus." Converting them to `AskUserQuestion` would contradict the carve-out as written.

The fix is a reframe, because the carve-out's *principle* survives conversion. The carve-out exists to say a menu-placed-as-a-gate is **not** the "menu standing in for an answer" anti-pattern — the gate is legitimate. That is still true when the gate renders as a structured question; `AskUserQuestion` *is* a menu-as-gate, just in structured UI instead of prose. So the carve-out should not be deleted and should not simply narrow — it should gain a sub-clause:

> Deliberate decision gates are exempt from "Point, don't menu." The exemption is about the gate being a legitimate designed decision point — not about its *rendering*. When the gate's options are discrete and a user is present, prefer the structured render (`AskUserQuestion`) per "Surface the ask, don't bury it"; prose is the fallback when the answer is free-form or no user is present (Sol's batched gates).

This reconciles the two bullets instead of leaving them contradicting: the exemption holds, and the rendering preference points at the new bullet. If the conversions are *not* pursued (or before the pilot lands), the carve-out stays exactly as-is with no contradiction — so the reframe ships *with* the pilot ticket, never ahead of it.

---

## Blast radius, per gate

| Gate | Canonical files touched | Regeneration | Notes |
| --- | --- | --- | --- |
| Winston A/P/C | `.ai-skills/skills/prism-architect/shared.md` (A/P/C menu section) + `.prism/rules/writing-voice.md` (carve-out reframe) | `pnpm prism:build` → `.claude/`, `.codex/`, `.cursor/`, `.prism/`, `AGENTS.md` | Moderate. No change to `report-back.md`'s gate registry — the autonomous-path disposition semantics are unaffected. |
| Theo write/skip/defer | `.ai-skills/skills/prism-doc-walker/shared.md` **and** `.prism/skills/prism-doc-walker/step-03-present.md` | `shared.md` regenerates via build; the step file is its own canonical hand-authored home (build reads only `{frontmatter,shared,claude,codex,cursor}`, not step files) and is edited directly | Larger and more scattered than Winston — the prompt lives in two canonical places. Confirm both before editing. |
| Sol's human gates | None (stay prose) | None | Zero. |

Never hand-edit a generated mirror (`.claude/`, `.codex/`, `.cursor/`, `.prism/rules|architect|spec`, `AGENTS.md`, `templates/install/`) — the build overwrites them and `pnpm prism:check` fails seed-drift in the meantime.

## Vehicle and sequencing

Per `followup-scope.md`: this splits from the port cleanly — different personas (Winston, Theo), different systems (skill bodies, not one rule's prose), and a size well beyond the content-only port. It is **new-ticket work, not a fold-in**, and it is post-merge relative to the port. But it should **not be filed yet** — filing conversion tickets now trips the scope-fit gate's speculative-follow-up guard: the shape is known, but the *value* is explicitly unproven and each ticket's done-condition depends on the pilot's outcome.

Recommended order:

1. **Land the port** (the "Surface the ask" bullet — `followup-port-2197-surface-decisions.md`). It is the substrate; nothing converts before it exists and has mileage.
2. **Let it accumulate a track record** — agents actually reaching for `AskUserQuestion` on ad-hoc asks. Do not file conversion tickets during this window; carry the conversion as a recorded observation, not a backlog entry.
3. **Pilot Winston A/P/C** — one ticket, bundling the carve-out reframe with the A/P/C render change (they must ship together to stay coherent). Cleanest proving ground: interactive-only, once per session, three discrete options.
4. **If the pilot proves out, convert Theo write/skip/defer** — a follow-on ticket gated on the pilot, with the batch-judgment escape as an explicit requirement and the two canonical files named.
5. **Sol stays prose** throughout. Revisit only the narrow single-discrete-gate enhancement, and only much later, if ever.

Net: two gates convert, conditionally and in sequence, behind a proven pilot; one stays prose on the merits; nothing is filed until the substrate has mileage.

---

## Closing battery

1. **Scope boundary:** wrote this file only. No skill bodies, no `writing-voice.md` edit, no build. Left alone and flagged: Theo's step-file canonical home (`.prism/skills/prism-doc-walker/step-03-present.md`) is a hand-authored file outside the build's `{frontmatter,shared,claude,codex,cursor}` read set — noted in blast radius so the follow-on ticket doesn't miss it, not acted on here.
2. **Unasked assumptions:** (a) `AskUserQuestion`'s limits are 1–4 questions / 2–4 options / auto-"Other" as the dispatch brief states — I could not read the tool schema directly because the tool is absent from this dispatched session, which independently corroborates the interactive-only constraint; (b) "the port" is the still-unmerged `followup-port-2197` bullet — confirmed against that plan; (c) the pilot ticket bundles the carve-out reframe with the A/P/C render — a coherence call, trivially separable if the human prefers two tickets.
3. **Edge recall:** the mid-dispatch no-user case (Sol emit side) and the >4-batched-lanes case (Sol surface side) are the boundary inputs that decide Sol; both point to prose. The autonomous-path rendering of A/P/C and write/skip/defer (never a menu — always a disposition) is the boundary that makes converting the persona gates safe; verified against the gate registry and Theo's dispatched-run note.
4. **Verification honesty:** `AskUserQuestion` absent from toolset — observed. Winston A/P/C fires interactive / routes as disposition under Sol — verified against `report-back.md:117` and my own skill body. Theo emits `needs-human` when dispatched — verified against `prism-doc-walker/shared.md` § How Theo Thinks 4. Sol surfaces `pendingHumanReport` at the boundary in the conversational main loop — verified against `prism-conductor/claude.md:18` and `step-10-report.md`. Theo step file being canonical (not build-generated) — verified against `build.ts:5` read set plus the file's presence only under `.prism/skills/`, not `.ai-skills/skills/`.

> Sessions: 2026-07-21 [main] open: Intent — per-gate convert/stay-prose call for three decision gates vs. the new surface-the-ask bullet; Bounds — this file only, no code, no build; Approach — establish interactive-vs-mid-dispatch availability per gate before judging shape-fit · close: scope held
