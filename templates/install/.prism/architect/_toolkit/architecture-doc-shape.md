# Architecture Doc Shape

Architecture docs explain _choices_, not just what exists. An architect reasons from the business need to the technical flows that fall out of it, matches those requirements to an existing solution, and builds custom only where nothing fits. A doc that walks the reader through the same reasoning chain is easier to understand, harder to regress, and survives contact with questions the original author didn't anticipate.

This rule governs the shape of docs in `docs/content/dev/architecture/`. Apply it to new architecture docs and to restructures of existing ones. Companion operational procedures move to `docs/content/dev/operations/` — see the operational-bleed principle below.

This file lives in `.prism/architect/` (not `.prism/rules/`) because it applies only to architecture docs — the manifest loads it when an architecture doc is in scope, not on every conversation.

---

## The four-beat arc

Every architecture doc opens with four beats, in order:

1. **Need.** The business or operational reality the system answers to. Concrete facts, not abstractions. Name the concrete shape — fleet size, deploy targets, request volumes — instead of collapsing it into a label like "a multi-tenant architecture."
2. **Technical flows.** The requirements the need forces on any solution — what the system must do, regardless of how. This is where the architect translates the business need into technical primitives. Beat 2 is the bridge between domain language and tool language.
3. **Natural fit.** The tool or approach that answers the requirements. Name it as the fit and move on — don't enumerate what you didn't pick unless an alternative is load-bearing (see shopping-list principle below).
4. **Platform limits + custom layer.** The specific platform limits that forced custom work, and the layer you built on top. If the architecture is "platform plus custom," this beat explains why you couldn't stop at platform.

**Why:** Mirrors how an architect actually reasons. Makes design choices visible rather than collapsing them into "here's what we built." Procurement-voice openings — "Our CI pipeline is built around X. It gives us A, B, and C" — read as product descriptions, not architecture. The four-beat arc tells a story about choices instead.

**How to apply:** the four beats map to paragraphs in the opening. One paragraph per beat is typical; two is acceptable when the content earns it. The body of the doc — taxonomy, mechanics, reference detail — assumes the reader has absorbed the four-beat context. Don't re-explain the reasoning in the body.

**Adapt beats 3-4 when the architecture isn't tool-selection.** Some architectural patterns (the resolver pattern, the block registry) answer internal questions with no external tool to evaluate. Beat 3 becomes "the constraint that ruled out simpler approaches"; beat 4 becomes "the pattern we converged on."

---

## Supporting principles

### Anchor sentence before the arc

Open the doc with one sentence, before Beat 1, that names the system and what problem it coordinates. Short. Not a thesis. An orientation.

**Why:** The four-beat arc is a reasoning chain. A reader entering cold needs a referent before the chain starts — otherwise Beat 1's concrete facts read as context-free facts. The arc is the reasoning; the anchor is the doormat.

**How to apply:** one sentence, before the first body paragraph. Name the system and the coordination problem in the most compressed form possible. `A platform running 100+ retail sites from one codebase, and the CI pipeline is the system that coordinates how code reaches all of them` is the shape to match (illustrative — replace with your team's actual coordination problem). The anchor is not a thesis and not a synthesis — if it starts naming tools or solutions, it's crossed into Beat 3's territory; pull it back.

---

### Shopping-list anti-pattern

Don't enumerate tools you didn't pick. The architect does the research; the doc names the fit. Listing CircleCI + Jenkins + GitLab when you chose GitHub Actions is noise — the reader can't learn anything from a menu of conceptually equivalent alternatives.

**Exception — load-bearing alternatives.** An alternative belongs in the doc, briefly, with the reason for rejection, when it's load-bearing:

- A reader would naturally assume you'd use it and would have to mentally dismiss otherwise, OR
- The team actively considered and rejected it for a reason that generalizes beyond this ticket.

**Why:** Tool-inventory bullets don't carry signal. But preempting an obvious question the reader will otherwise carry unanswered does — and the rejection itself often illuminates the architecture more than the selection does.

**How to apply:** the test is recoverability. If a reader could recover the rejection reason from the surrounding architecture prose alone, skip the alternative — it's noise. If the reader would need to be told explicitly, name the alternative and its rejection reason in one or two sentences. One or two alternatives per doc is usually the ceiling.

---

### Concrete platform limits

When the architecture is "platform plus custom layer," name the specific platform constraints that forced the custom work. Vague "the platform fell short" framing leaves room for the reader to suspect the custom layer was a preference rather than a necessity.

Specific limits read like this:

- "GitHub Actions caps jobs at 6 hours"
- "matrix strategies don't bind to GitHub Environments"

**Corollary — when multiple constraints stack, name them all.** A single limit might not force custom work; it's the intersection that does. When several stacked rate limits jointly force resumability, any one alone wouldn't be enough — it's their combination that does. Missing any one would let the reader conclude "but we could just fix that one constraint" and miss the point.

**Why:** Specific limits make custom work feel inevitable. Vague framing lets the reader suspect the custom work was optional — which erodes trust in the rest of the architectural reasoning.

**How to apply:** every "platform plus custom layer" architecture doc names at least one concrete limit in its opening. Sections like "Why a dedicated package" or "Why we built our own" should cover two to three specific limits, each paired with the feature it forced in the custom layer.

---

### Operational bleed anti-pattern

Architecture docs explain shape; operations docs explain procedure. The moment a section reads like a checklist — "1. Open the Actions tab 2. Uncheck pre-release 3. Check Latest" — it belongs in a paired operations doc under `docs/content/dev/operations/`.

**Why:** Two readers with two different needs. The first-time architect reader wants to understand the design; the 3am operator reader wants a checklist. A single doc that serves both compromises both — the architect is buried under keystrokes, the operator has to hunt through reasoning paragraphs for the next step. This is the Two-Reader Model (see `.prism/architect/_toolkit/documentation.md`).

**How to apply:** pair architecture and operations docs by topic — `docs/content/dev/architecture/<topic>.md` and `docs/content/dev/operations/<topic>.md` — and cross-link both ways. The architecture doc explains _why_ a procedure is the shape it is; the operations doc owns _how_ to execute it. When you're tempted to add a step-by-step section to an architecture doc, that's the signal to create or update the operations counterpart.

---

### Problem-shape ↔ solution-shape

When an architecture has multiple layers or subsystems, the doc should show how that multiplicity maps to something real in the problem domain — multiple operational modes, user types, constraint categories. A two-layer architecture should map to a two-mode reality the reader can recognize.

**Why:** If the architecture has more layers than the problem has modes, it's probably over-abstracted. If it has fewer, something's being compressed that shouldn't be. Either way, naming the match between problem-shape and solution-shape in the opening lets the layer descriptions land as inevitability rather than preference. A reader who can't see the match has to trust the architecture instead of understanding it.

**How to apply:** before describing the layers, name the shape of the problem.

<!-- atlas:problem-shape-examples -->
Per-team examples are populated during onboarding from the team's actual architecture.

The layer descriptions then fall out naturally once the problem-shape is named — "and here's which layer handles which shape."

---

### Natural-fit framing

Beat 3 names the tool you picked as the _natural fit_ for the requirements you listed in beat 2. Don't ask "which tool should we use" — answer "given these requirements, which tool already maps cleanly." Compressed. One to three sentences.

**Why:** This is the architect's actual reasoning path, not a post-hoc justification. Requirements come first; the tool that fits them falls out. Writing in natural-fit voice makes the architecture feel less like "we picked X because we liked it" and more like "X was what the requirements pointed at." It also makes the shopping-list anti-pattern easier to enforce — if you frame the selection as natural fit, there's no room for a competitor menu.

**How to apply:** beat 3 opens with "`<tool>` was a natural fit" or "the natural fit was `<tool>`" and names two or three requirement-to-capability mappings. Don't sell. If you catch yourself defending the selection, something's wrong — either the fit isn't as natural as you thought (reconsider), or you're writing procurement voice (rewrite).

---

## Cross-references

- `.prism/rules/writing-voice.md` — onboarding voice over mandate voice; architecture docs follow the same voice rules as other spec content
- `.prism/architect/_toolkit/documentation.md` — documentation conventions, Two-Reader Model, Doc-to-Doc Overlap tracking
- `.prism/references/dev-doc-template.md` — dev doc template that architecture-category docs extend with this rule
- [ADR-0016](../spec/adrs/_toolkit/0016-explain-the-why.md) — explain the why (the parent principle behind this rule's insistence on reasoning over inventory)
