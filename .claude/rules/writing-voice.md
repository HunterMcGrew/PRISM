---
load: always
---

# Writing Voice

Write durable communication like you're onboarding a teammate, not drafting a compliance contract. This rule applies to skills, rules, architect context, ADRs, templates, the durable parts of plan files, PR descriptions, commit messages, and tickets and comments — and the rule itself follows the voice it asks for, so the example reads alongside the explanation.

The principle is _durable_ communication — anything a future reader will load as context. Lessons (`.prism/lessons.md`), in-progress plan history, Slack messages, and ad-hoc conversation are not held to this standard — they're working notes, not durable record.
Chat replies — the live, synchronous surface this rule doesn't cover — follow `.prism/rules/response-shape.md` instead.

---

## Onboarding voice, not mandate voice

Mandate voice — `NON-NEGOTIABLE`, all-caps `MUST`, `FAILURE STATE`, `HARD RULE` — reads as a contract written for someone who needs to be controlled. Onboarding voice reads as guidance from a colleague who already trusts you to do the right thing once you understand it. The constraint is the same; the framing changes how the reader receives it.

**Why:** Absolute mandates trigger an alignment-override reflex that can invert or ignore the instruction. The team also reads better-framed prose more carefully, and rules that read like prose age better than rules that read like policy.

**How to apply:**

- Reframe absolute mandates as contextual authority. "The team's intentional engineering standards — built through iterative testing" lands better than "NON-NEGOTIABLE — follow exactly as written."
- Reframe prohibitions as consequences. "Fabricating a search erodes trust faster than admitting uncertainty" lands better than "Do not fabricate searches."
- Use imperative form without mandate prefixes. "Offer this after every PR push" works; "MUST offer this after every PR push" doesn't.
- Lowercase natural usage is fine. The problem is `MUST` as behavioral framing, not the word "must" inside a sentence ("partial loads miss constraints, so every matching pattern must be loaded").
- Section headings that name an anti-pattern (e.g. `Anti-pattern: Drive-by refactoring`) work better than headings that shout at the reader (e.g. `FAILURE STATE: NEVER DO THIS`).

---

## Explain the why

Every rule, every ADR, every architect-context constraint cites its reason. A rule without a reason gets treated as arbitrary and skipped in edge cases, because the reader has no way to tell whether the rule still prevents something or has gone stale.

**Why:** The reason is what survives contact with situations the rule's author didn't anticipate. "We learned the hard way that Y caused Z" lets the reader judge whether Z is still a risk in front of them. "Do X" doesn't.

**How to apply:**

- Rules in `.prism/rules/` lead with the rule, then a `**Why:**` line (the reason — often a past incident or an observed cost) and a `**How to apply:**` line (when the rule kicks in). This rule's structure is the example.
- ADRs use the `## Context` section for the same purpose. No decision is documented in isolation.
- Skill files cite ADRs when they encode a cross-cutting decision (e.g. "see ADR-NNNN" for a rule like "Eric never approves PRs"). The skill carries the narrative; the ADR carries the reasoning.
- The exception is where the reason is obvious from context — "use TypeScript" in a TypeScript project doesn't need a citation. Non-obvious reasons do.
- When you find yourself writing a directive without a reason, pause and add it. If you can't articulate the reason, the directive may not earn its place.

---

## Keep it short enough to be read

A short rule that gets read beats a long rule that gets skimmed. Aim for the minimum prose that conveys the rule, the reason, and how to apply it. If a rule needs many sub-cases, that's a signal to either split it or accept that it's a long rule and structure it for scanning.

**Why:** Spec files are loaded into agent context and read by humans during PR review. Both audiences cost time on every word. Padding inflates the cost without adding signal.

**How to apply:**

- Lead with the point. Don't open with framing prose ("This document covers...") — start with the rule.
- Cut the meta. "It is important to note that..." adds nothing. Remove it.
- Use lists for parallel cases, prose for connected reasoning. A bullet list with five entries is more scannable than the same content in a paragraph.
- One concrete example beats three abstract ones. Pick the example that's most likely to come up in real work.

---

## An overflowing container is the signal to cut

A table cell wrapping to four lines is evidence you can't miss. So is a bullet that ran to a paragraph, or a sentence you can't read aloud in one breath.

**Why:** "is this too long" has no honest answer from the person who wrote it. A wrapped cell is visible to anyone looking at the same page.

**How to apply**, stopping at the first step that fixes it:

- **Cut words.** An over-budget cell is usually a sentence where a phrase would do.
- **Drop a column.** Most three-column tables are two columns plus commentary, and the commentary belongs in a sentence below.
- **Change the container.** Content that survives an honest trim and still overflows needs bullets or prose, not cells.
- **A value repeated in every row is a caption.** Move it to the sentence above the table.
- **It runs the other way too.** Counts buried in a paragraph — "Mira 7, Clove 6, Nora 6" — are a two-column table that reads in one glance.

---

## Plain language over jargon

**Write for a tenth grader who has taken an intro computer-science class.** They know `array`, `boolean`, `recursion`, `primitive`, `closure`. They have never heard a wall called load-bearing.

**Sentence structure is the half that bar governs.** One idea per sentence, two clauses at most. If the reader has to hold a clause in memory to reach the verb, split the sentence. A short sentence carrying a real technical term reads fine; a sixty-word sentence with five clauses doesn't, whatever words are in it.

**Keep a word that names a real thing. Cut a word that dresses up an idea.** Two kinds earn their place — names from our stack (`useEffect`, `block.json`, a codebase's own class or type names) and computer-science terms the reader already met in class (`primitive`, `recursion`, `closure`, `RSC`). What goes is metaphor: "load-bearing," "seam," "canonical," "altitude," "surface area."

**Why:** you shouldn't need a PhD to read our docs. But deleting a precise term doesn't make a doc clearer — it makes the reader rebuild the concept from a longer paraphrase. Metaphor is what costs the reader with nothing in return.

**How to apply:**

- **The test: would plain English cost precision, or only characters?** `primitive` has no short plain twin — spelling it out takes a full sentence, so the term is doing real work. "Load-bearing" means "required," which is shorter. Keep the first, cut the second.
- **Gloss a precise term on first use instead of dropping it.** "Returns a primitive — a string, number, or boolean, not an object" keeps the precision for one extra clause.
- **Where a short plain twin exists, use the twin.** `idempotent` → safe to run twice. `memoize` → cache the result. `dedupe` → remove duplicates. `wire up` → connect. `fan out` → split.
- Same word, two uses, two answers. `primitive` meaning `string | number | boolean` names a thing and stays. `primitive` meaning "a reusable building block" is metaphor and goes.
- Say what breaks instead of calling something load-bearing. "Required — without it the resolver returns null."
- Plain register, always: `subsequent` → later, `utilize` → use, `leverage` → use, `ensure` → make sure, `in order to` → to, `approximately` → about.

---

## Answer first, one offer at a time

Lead with the answer. When the reader asked a question, the first sentence answers it; when they asked for work, the first thing is the result. Support follows the answer — don't build up to it through context the reader has to hold open.

**Why:** every sentence before the answer is cognitive load the reader carries while waiting to learn whether the rest matters. Menus of options, caveat sandwiches, and trailing offer-stacks each push a decision back onto the reader that the writer was better positioned to make. An ask-back buried at the end of a long update pushes the same decision back onto the reader by placement rather than by content — they have to hunt for the one line that needs their action.

**How to apply:**

- Point, don't menu. When you have a recommendation, make it — "do X, because Y" beats three options with neutral trade-off prose. Reserve option lists for calls that are genuinely the reader's.
- Surface the ask, don't bury it. When a message needs a decision back before you can proceed, make that ask impossible to miss — don't leave it trailing in prose at the bottom of a long update. Reach for `AskUserQuestion` (or the host's structured-question tool): it renders the choice in a distinct, selectable UI the reader can't scroll past. Reserve it for genuine decisions the user owns that change what you do next — not a generic "can I proceed?" checkpoint, which trades one friction for another. When the ask doesn't fit discrete options — a free-form answer, no user present, or the tool isn't available — fall back to a single clearly-marked block as the last thing in the message. This governs the *ask-back*, not the answer: leading with the answer decides where the *conclusion* goes. In a status or orchestration update the board legitimately leads and the ask follows the context — this keeps that following ask from vanishing into the wall of text above it.
- No caveat sandwiches. Qualify once, where the qualification matters — not before and after every claim.
- Be opinionated when you have an opinion. Hedged prose reads as false modesty or real uncertainty; if it's real uncertainty, name what would resolve it instead of hedging around it.
- Name the tangent instead of following it. "X is also worth a look — separate thread" keeps the answer on the asked question.
- Surface the bigger version, build the asked-for one. "This could generalize to all blocks; building the one you asked for" — one line, then the work.
- One offer at a time. Close with the single next step you'd actually take, not a menu of everything you could do.

Two carve-outs:

- Scope discipline still governs what gets *built*. "Build the asked-for one" doesn't license absorbing the bigger version — [`followup-scope.md`](followup-scope.md) and [`code-standards.md` § Refactor scope](code-standards.md) decide what's in scope; this section only shapes how the bigger version gets *mentioned*.
- Deliberate decision gates are exempt. Menus that *are* the product at a designed decision point — an architect's approve/adjust/cancel gate, a doc-walker's write/skip/defer prompt — stay menus. The anti-pattern is a menu standing in for an answer, not a menu placed as a gate.

---

## Count rules, not numbers

When spec refers to a collection that grows over time — per-block docs, rules, allowed blocks, registered endpoints, persona roster — state the rule that defines membership ("one per block," "every feature flag gets an entry") rather than the current count ("14 files," "8 rules"). Counts drift the moment the collection grows; rules stay true.

**Why:** Hard counts are observations, not specifications. They go stale silently — a new doc lands, the count doesn't update, and a reader two months later sees `15 files` next to a directory of 16 and loses trust in the whole document. Rules describe the shape of the collection, which doesn't change when the collection grows. See PR #1845 (Eric's glob-vs-count minor on the Mega Menu per-block docs) for the incident that surfaced the pattern.

**How to apply:**

- Count rules like "one per block" or "every X has a Y" are strictly more informative than numbers — they tell the reader _why_ the count is what it is, and let them predict what next week's count will be.
- Counts earn their place only for (1) closed sets ("all 8 HTTP methods," "four `wp_options` keys"), (2) order-of-magnitude signals with a `+` ("60,000+ plugins," "400+ dealer sites"), or (3) historical snapshots in a changelog or plan History entry ("added 14 per-block docs in this PR") where the count is a frozen fact about a moment in time.
- If you catch yourself writing `(N files)` alongside a directory or glob pattern — delete it. The directory is the source of truth; the count is redundant when it's right and misleading when it's wrong.
- When the itemized list feels too loose and you reach for a count to tighten it — write the rule instead. If the rule is hard to articulate, the collection may not have a coherent boundary, and the spec has a bigger problem than a drifting number.
- Compound count claims drift twice as fast as standalone counts. "5 of 12 personas load this rule" goes wrong the moment either side moves — a new persona lands, or a different subset loads the rule. Replace the compound with the rule that governs membership: "every persona that operates on a ticket in the team's tracker loads this rule" stays true through both kinds of growth. Same trap for "three of the four backports" — name the criterion ("the backports that touch reviewer skills") instead of the count.

---

## Anti-pattern: Session-context leakage

A durable artifact — anything a future reader loads cold, with no memory of the work that produced it — describes its subject only, never the session that wrote it. The principle is the test, not the list. Comparative language across other artifacts in the run ("largest so far," "third one I've written," "unlike the others"), progress markers ("in the loop," "in this batch," "next up"), and any framing that requires knowing the run's order or scope to make sense leak the moment of writing into content that gets read cold months later. The same leak shows up in docs, ADRs, plan entries, PR bodies, source comments and JSDoc, and test descriptions (`describe`/`it` strings) — the list is illustrative, not exhaustive.

**Why:** Eli wrote `docs/content/dev/blocks/feature.md` during a batch run documenting many blocks in sequence. The Overview included the line _"This is the largest single-block editor in the loop so far (~410 lines of `edit.tsx`)... The frontend block (~230 lines)..."_ — comparison ("largest so far") that only made sense inside that generation session, paired with hard line counts that drift the moment the file changes. Caught on read-through, after the doc shipped. lessons.md 2026-04-27.

**How to apply:** Before saving a durable artifact, re-read it as someone landing on it cold from search six months from now. If a sentence only makes sense given the session that wrote it — delete it. The Overview should land for a reader who has no idea other docs were generated in the same sitting. Test descriptions are durable too: name the contract under test, not the change that produced it or the implementation token it happens to use — prefer `it("renders the newest size", ...)` over a name pinned to a specific token or the edit that introduced it. This pairs with the "Count rules, not numbers" section above — both are observations about the moment of writing, not specifications about the subject.

---

## Anti-pattern: Reassurance that introduces a new claim

When a passage has just admitted a gap — measured X but not Y, verified A but not B — check the sentence right after it. A line whose job is to make the reader feel better about the unknown is the likeliest place to assert something nobody verified.

The test isn't whether it sounds reassuring; good writing reassures constantly. The test is whether the reassurance traces back to something already verified, or introduces a new claim.

**Why:** one architecture doc took several review passes, each catching a closing sentence that asserted a property sounding like it followed from the design. "A deterministic render over the labels the build already produced" — no labels existed at that step. "Both paths carry the same anti-fragment rule" — it lived on one path. "Stale is safe" — the fallback didn't cover an outdated node that still matched. Each read as a natural conclusion, and each got past a reviewer once. PRISM hit the adjacent failure in its own tree — see `.prism/lessons.md` § A control arm that receives an always-on instruction doing the same job is not a control, where a null result was trusted before anyone enumerated what the control arm actually received.

**How to apply:** find each admission and read the sentence after it. Name the property it asserts, then ask where that property was proven. "It follows from the design" is a guess, not proof. Cutting is usually the stronger edit — an admission that ends on the admission is more trustworthy than one that ends on a hedge.
