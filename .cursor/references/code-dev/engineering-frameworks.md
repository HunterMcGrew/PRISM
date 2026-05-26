# Clove — Framework Knowledge

Reference for `prism-code-dev`. Read this when an implementation decision turns on engineering judgment the rules can't settle — applying SOLID, choosing an implementation strategy, reading unfamiliar code, debugging, refactoring, deciding where state lives, designing error handling, weighing performance, structuring tests, or designing components. The skill body pins the cognitive lens (How Clove Thinks) and the anti-patterns; this file carries the model-resident catalog those lenses draw on.

> _Engineering frameworks — SOLID, implementation strategy, code reading, debugging, refactoring, state, errors, performance, testing, component design, complexity._

This is the engineering knowledge that informs Clove's decisions. Not rules to follow mechanically — reasoning frameworks that connect the dots between the rules in `../../rules/` and the judgment calls the rules can't cover.

## Engineering Principles — SOLID

| Principle                 | Application                                                                                                                                |
| ------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| **Single Responsibility** | A unit of code has one reason to change. If a module fetches, filters, sorts, AND renders — extract.                                       |
| **Open/Closed**           | Extend via composition, not by adding flags and branches inside the unit.                                                                  |
| **Liskov Substitution**   | Any implementation satisfying the interface can be swapped in. The interface is the contract.                                              |
| **Interface Segregation** | Take what you need; depend on the smallest surface that does the job.                                                                      |
| **Dependency Inversion**  | Consumers depend on abstractions (interfaces, hooks, ports), not concrete implementations.                                                 |

**Composition over inheritance** — watch for the subtle violations: a unit that takes a "variant" flag with many options and a switch statement inside is inheritance wearing a trench coat. Compose instead.

## Implementation Strategy

**Walking skeleton**: Build the thinnest possible end-to-end slice that touches every layer before filling in any one layer. For a new block: schema → registration → resolver (hardcoded data) → component (renders one field) → confirm data flows. Then iterate. You prove architecture before investing in details.

**Vertical slice**: Organize work by user-visible capability, not by technical layer. "Build the schema, then the API, then the UI" front-loads the boring work and back-loads integration risk. "Build one feature through all layers" front-loads integration risk and produces demoable progress at every step.

**Spike methodology**: A spike is a time-boxed experiment. It answers one question: "Is this approach viable?" The output is knowledge, not code. Spike code gets discarded — it served its purpose by proving (or disproving) the approach. If you find yourself polishing spike code, it's not a spike anymore.

**Tracer bullet** (Hunt & Thomas): Unlike a spike, a tracer bullet is production code — architecturally correct but incomplete. Wire the real resolver to the real component with the real data flow, just with a minimal feature set. It lights up the path: if the bullet hits the target, fill in the details. If it misses, you see immediately where the aim is off.

## Code Reading

**Follow the data**: Pick one user action. Trace it through every file it touches end-to-end. You understand one slice deeply instead of the whole thing shallowly. A stack-specific trace example is pinned in the skill body alongside the `atlas:workflow-example-2` anchor.

**Find the seams** (Michael Feathers): A seam is where you can alter behavior without editing the code at that point. Component boundaries, props, context providers, hooks, dependency-injected interfaces are seams. Hardcoded imports and inline logic are not. Seams tell you where the system is flexible and where it's rigid — and where you can inject tests.

**Dependency mapping**: Before reading implementation, read imports. The shape of the dependency graph tells the architecture story. Look for: circular deps (design problem), deep chains (coupling), shared leaves (core abstractions), unexpected cross-module imports (leaky boundaries).

**Chesterton's Fence** applied to code: Before removing code you don't understand, trace its callers and test coverage. If it survived this long, it's handling something. The burden of proof is on the remover, not the code.

## Debugging

**Scientific method**: Form a specific hypothesis ("the stale data is because the cache key doesn't include the user ID"). Design the smallest experiment that would disprove it. Run it. If disproved, form a new hypothesis. Never "try things" without a hypothesis — that's random search, not debugging.

**Wolf fence (binary search)**: Insert a log or breakpoint at the midpoint of the suspected code path. Is the state correct there? If yes, the bug is downstream. If no, upstream. Repeat. O(log n) instead of O(n) — much faster than reading every line hoping to spot the problem.

**Five Whys** (Toyota Production System): After finding the bug, push for root cause. "Why did the loop happen?" Because state was derived but stored. "Why was it stored?" Because the developer didn't recognize it was derived. "Why?" No review caught it. Each "why" moves from symptom toward systemic fix. The last answer is usually a process gap, not a code gap.

**Delta debugging**: When a change introduced a regression, bisect the change set. `git bisect` is the tooling incarnation. The principle extends: reduce any failing case to its minimal reproduction. If you can reproduce it in 3 lines, you understand it.

## Refactoring Discipline

**Code smells as extraction signals** — diagnostic signals, not rules:

- **Feature Envy**: a function uses another module's data more than its own — move it closer to the data
- **Shotgun Surgery**: one change requires edits in many places — the abstraction boundary is wrong
- **Long Parameter List**: the function knows too much — introduce a parameter object or split responsibilities
- **Data Clumps**: the same 3-4 values travel together everywhere — they want to be a type

**Refactor under test**: Never refactor code that doesn't have test coverage. If there are no tests, write characterization tests first (tests that document current behavior, right or wrong), then refactor. Refactoring without tests is editing and hoping.

**Strangler fig** (Martin Fowler): Replace incrementally. Wrap the old code, redirect callers one by one, delete the old code when it has zero callers. Never rewrite from scratch in a separate branch — strangler fig lets you ship continuously while migrating.

**Separate refactoring from behavior change**: Refactoring changes structure without changing behavior. Behavior changes are features. Don't mix them. Separate commits, separate mental modes. Mixed commits are unreviewable.

## State Management Decisions

**State colocation** (Kent C. Dodds): State lives as close as possible to where it's used. The decision ladder:

1. Can it be computed from existing values? → Not state. Compute inline or `useMemo`.
2. Is it only used in this component? → `useState` (or `useReducer` for complex transitions).
3. Does a sibling need it? → Lift to the nearest common parent.
4. Does it cross 3+ component levels? → Context (or URL/server state if applicable).
5. Should the user be able to bookmark or share it? → URL state.
6. Does it come from the server? → RSC props via resolver. Not client state.

**Single source of truth**: Every piece of state has exactly one owner. If a prop and local state represent the same value, one of them is wrong. Determine which is authoritative and delete the other.

**State machine thinking**: Even without a library, think in states and transitions. A form is in one of: `idle | validating | submitting | success | error`. An `if/else` chain checking `isLoading && !isError && isSubmitted` is a state machine that doesn't know it — and it has implicit impossible states (`isLoading && isError`). Name the states explicitly as a union type.

## Error Handling

**Parse, don't validate** (Alexis King): Push validation to system boundaries. Parse the API response into a typed object at the resolver layer, and use strong types throughout. Components receiving typed props don't need defensive null checks on every field — the resolver already guaranteed the shape. This is the principle behind the codebase's four type layers: Interfaces → DTOs → Props → BlockAttributes.

**Fail-fast at boundaries, degrade gracefully at UI**: Resolvers and data-fetching functions validate strictly and throw or return errors. Components receiving validated data degrade gracefully — show fallback UI, not crashes. Error boundaries catch the unexpected. The user never sees a blank screen.

**Recovery hierarchy**: Can it retry automatically? → Retry silently (network blip). Can the user fix the input? → Show actionable guidance. Is it transient? → Retry button. Is it permanent? → Clear dead-end with next steps. Never show a raw error string to a user.

**Error case first**: Design the empty state and error state before the happy path. If you don't know what the component renders when data is null, you'll discover it in production. Pixel's five-state coverage (empty, loading, error, partial, success) applies to every data-driven component.

## Performance Awareness

Not premature optimization — awareness. These are problems that are expensive to fix later if baked into the architecture.

**Network waterfall prevention**: Sequential fetches (fetch A, then B that depends on A, then C that depends on B) are a common real-world performance killer. Co-locate data requirements at the boundary that owns them. Fetch in parallel where possible.

**Bundle / payload size as constraint**: Every imported dependency has a cost in code size, parse time, or memory. Use lazy/code-split loading for below-the-fold work. Tree-shaking only works with named exports, not barrel re-exports of entire modules. Check size impact before adding dependencies.

**Unnecessary recomputation awareness**: Most recomputation doesn't matter. The ones that do: large lists re-processing on every input, expensive work re-running on unrelated state changes, parent updates cascading through a deep tree. Fix by stabilizing inputs (memoize the object/callback being passed), not by wrapping everything in memoization.

## Testing Philosophy

**Testing Trophy** (Kent C. Dodds): Static analysis (type checkers, linters) catches the most bugs per unit of effort. Integration tests (units exercised with their real collaborators) catch the most behavioral bugs. Unit tests for pure logic and utilities. E2E for critical user journeys only. The trophy shape means more integration tests than unit tests.

**Behavior, not implementation**: Tests assert what the user observes, not internal state. Don't test that a state setter was called — test that the output updated. Don't mock the collaborator unless isolation is required — exercise the real one.

**The test user**: Write tests as if you're the user. Query by role and accessible name, not by class or test ID. If the class name changes but the behavior works, the test shouldn't break. If the accessible name changes, the test SHOULD break — the user's experience changed. The team-specific low-value test-target skip list is pinned in the skill body alongside the `atlas:workflow-example-3` anchor.

**Edge case strategy**: For any feature, test: empty (no data), one (single item), many (typical set), boundary (max values, zero, negative), error (API failure, malformed data). These five cases catch most real bugs.

## Component Design

**Compound components**: Components that work together sharing implicit state via context. `<Select>`, `<Select.Option>`, `<Select.Label>`. The parent owns state, children consume it. This separates layout control (consumer) from behavior (component). Use when multiple related elements share state but consumers need layout flexibility.

**Props interface segregation**: Don't pass a god-object when the component only needs two fields. `({ user }: { user: User })` when you only use `name` and `avatar` couples the component to the entire User shape. Prefer `({ name, avatarUrl })`. The deeper principle: components depend on what they render, not where the data came from.

**Extraction signals** — extract when:

- A component has multiple reasons to change (SRP violation)
- A block of JSX is wrapped in a condition and has its own state
- The same JSX pattern appears in 3+ places (the "three cases earn an abstraction" threshold)
- A component takes props it doesn't use but passes through (prop drilling — extract or use context)
- A side effect and its related state form a self-contained behavior (extract into a custom hook or helper)

## Accidental vs. Essential Complexity (Fred Brooks)

Essential complexity is inherent to the problem — a navigation menu with keyboard movement between panes is inherently complex. Accidental complexity is introduced by the solution — the same menu requiring layers of context, state machines, and effects to manage open/close/focus.

When building: the goal is to solve the essential complexity cleanly while minimizing accidental complexity. When reviewing your own work: if the solution feels harder than the problem, look for accidental complexity you introduced. The question is always "Is this complexity serving the user's need, or is it serving the code's structure?"
