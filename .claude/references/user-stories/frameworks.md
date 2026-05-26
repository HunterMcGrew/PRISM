# Mira — Framework Knowledge

Reference for `prism-user-stories`. Read this when establishing story quality, choosing an elicitation technique, sweeping for edge cases, framing a request as a job, mapping a journey, negotiating scope, or judging AC quality. The skill body pins the cognitive lens (How Mira Thinks) and the domain-specific stubs (Stakeholder Awareness, Domain Modeling, Requirements Traceability); this file carries the model-resident catalog of named requirements-engineering frameworks.

> _Framework catalog — the reasoning frameworks behind better stories, scope, and fewer surprises. Cite by name; the model already holds these._

This is the requirements engineering knowledge that informs Mira's work. Not templates to fill in — reasoning frameworks that produce better stories, better scope, and fewer surprises during implementation.

## Story Quality — INVEST + 3Cs

**INVEST** (Bill Wake) — quality criteria for individual stories:
- **I — Independent**: Can this story be built and delivered without waiting for another? If not, flag the dependency.
- **N — Negotiable**: Does the story leave room for the developer to find the best solution? Stories that prescribe implementation are brittle.
- **V — Valuable**: Does this deliver value to a user or the business? Pure technical work should articulate the user-facing benefit.
- **E — Estimable**: Can a developer estimate the effort? If it's too vague or too novel, it needs a spike or more conversation — not a larger estimate.
- **S — Small**: Can this be completed in one iteration? If not, split it.
- **T — Testable**: Can you write AC that verifies when this is done? "Should be fast" is not testable. "Page loads in under 2 seconds on 3G" is.

**3Cs** (Ron Jeffries) — what a story actually is:
- **Card**: The written story — a reminder to have a conversation, not a specification
- **Conversation**: The discussion that surfaces details, constraints, and edge cases
- **Confirmation**: Acceptance criteria that verify the outcome

When a developer says "I can't estimate this," it's a signal about story quality (usually fails E or S), not developer competence.

## Requirements Elicitation — Technique Selection

Don't default to interviews. Choose the technique based on what you need to learn:

| Technique | When to use |
|-----------|-------------|
| **Interview** | Need depth from someone with unique domain knowledge. Structured for compliance, unstructured for discovery. |
| **Workshop** | Need consensus across multiple stakeholders fast. Mira facilitates; a meeting without facilitation is just a meeting. |
| **Observation** | Stated requirements differ from actual behavior. Watch users do the work before asking what they need. |
| **Document analysis** | Legacy systems or existing processes contain implicit requirements nobody will tell you about. |
| **Prototyping** | Stakeholders can't articulate needs abstractly. Show them something wrong and they'll tell you what right looks like. |
| **Process flow analysis** | Map the current-state workflow before designing the future state. Never skip current-state analysis. |

The heuristic: "What do I not know, and which technique will surface it?" Interviews surface opinions. Observation surfaces behavior. Prototyping surfaces unstated preferences. Match the technique to the knowledge gap.

## Edge Case Discovery — The "What If" Sweep

A systematic checklist, not intuition. Run this against every story:

| Category | Questions |
|----------|-----------|
| **Empty state** | What if there's no data? What does the user see? Can they take action from empty? |
| **Boundary** | What if there's exactly one item? What about the maximum? What about max+1? |
| **Scale** | What if there are thousands of items? Does the design hold up? |
| **Concurrency** | What if two users act simultaneously? What if the same user has two tabs? |
| **Authorization** | What if the user lacks permission? What if permissions change mid-session? |
| **Partial failure** | What if the network drops mid-operation? What if only some data loads? |
| **Data integrity** | What if the data is null? Malformed? At extreme values? Missing required fields? |
| **State transitions** | What states can this entity be in? Are all transitions valid? What about invalid transitions? |

Each "what if" that surfaces a new case becomes either an additional AC hint on the existing story or a separate story. Decision tables help when multiple conditions interact — a 3-condition scenario has 8 combinations, and most teams only think of 2-3.

## Jobs to Be Done (JTBD)

**Core concept** (Clayton Christensen): People don't buy features — they "hire" them to make progress in specific circumstances. The unit of analysis is the job, not the customer segment or the feature request.

**Three job types:**
- **Functional**: The practical task — "find equipment in my price range near my location"
- **Emotional**: How the user wants to feel — "feel confident I'm getting a fair deal"
- **Social**: How the user wants to be perceived — "look thorough to my boss when presenting equipment options"

**Application**: When a stakeholder requests a feature, ask "what job is this feature being hired to do?" This surfaces the real requirement. The requested feature may or may not be the best way to address the underlying job. JTBD prevents building the right feature for the wrong reason — or the wrong feature for the right reason.

## Story Mapping (Jeff Patton)

**Story map structure**: User activities arranged horizontally (the user's journey from left to right). Stories arranged vertically under each activity (highest priority at top). The map preserves the narrative that a flat backlog loses.

**Backbone**: The top row — high-level user activities in journey order. Not prioritized; represents workflow structure.

**Walking skeleton**: The thinnest horizontal slice across the entire map that delivers end-to-end functionality. Build this first. It won't be complete, but it will be coherent — the user can walk the whole journey, even if each step is minimal.

**Release slices**: Horizontal lines drawn across the map. Everything above line 1 is release 1. Each slice must tell a coherent story across the backbone — no partial journeys.

**Application**: When a stakeholder asks "what's in the MVP?" point to the walking skeleton. When scope needs cutting, move stories below the release line rather than deleting them — the full vision stays visible and the team knows what's deferred, not forgotten.

## Scope Negotiation — MoSCoW + Kano + SPIDR

**MoSCoW** (Dai Clegg): Must have, Should have, Could have, Won't have (this time). "Won't" is explicitly scoped — it's "not in this release," not "never." This creates negotiation space beyond binary in/out.

**Kano model** (Noriaki Kano) — classifies features by their relationship to user satisfaction:
- **Must-be (basic)**: Absence causes dissatisfaction, presence is expected. The login must work.
- **One-dimensional (performance)**: More is linearly better. Faster page loads = happier users.
- **Attractive (delighter)**: Absence is fine, presence creates disproportionate delight. An unexpected shortcut or smart default.

Kano helps prioritize: Must-be features are table stakes (do them first but don't over-invest). Delighters are high-leverage but low-urgency.

**SPIDR story splitting** (Mike Cohn): Five axes along which any story can be split:
- **Spike**: Separate the research from the implementation
- **Paths**: Split by workflow path (happy path, error path, edge case path)
- **Interfaces**: Split by interface (web, mobile, API)
- **Data**: Split by data type or data source
- **Rules**: Split by business rule (basic validation vs. complex rules)

Every split story must be a vertical slice — crossing all layers and delivering user-visible value. "Backend only" is not a valid split.

## Acceptance Criteria Quality

**Good AC bridges requirements and testing.** The test: if a tester can't write a test case directly from the AC without asking clarifying questions, the AC is insufficient. If a developer can satisfy the AC with an obviously wrong implementation, the AC is too vague.

**Anti-patterns to flag:**
- "System should work correctly" — no pass/fail criterion
- "API returns JSON with status 200" — couples to implementation, not behavior
- "User experience should be good" — not measurable
- Happy path only — no error states, no boundaries, no edge cases
- Duplicating the story narrative — AC verifies outcomes, not re-explains intent

**Three Amigos concept**: AC written by one person is incomplete. The BA drafts it, the developer checks feasibility, the tester checks coverage. Mira writes AC *hints* — Winston and Clove refine them during planning and implementation.
