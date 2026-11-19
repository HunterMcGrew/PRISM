# Simpler paths

Is this the simplest form, and is there a cleaner path? Trigger: always.

Its enumeration unit, severity, finding shape, and coverage line are in `REVIEW.md`.

## Checklist

- **Ask the question of each structural change.** A new layer, branch, wrapper, flag, generic parameter, shared type, interface change, or fallback has to earn its place against the shape that wouldn't need it. New files a ticket calls for, such as components, tests, and constants, aren't the subject. The structural choices inside them are.
- **Four questions per abstraction.** What concrete problem does it solve, in one sentence? How many consumers use it? One consumer is indirection, not an abstraction. Would solving it inline at each call site be worse? Does a changed shared interface use the change uniformly across its methods? A half-generic interface says the abstraction doesn't fit the contract.
- **Look for the reframe that deletes, not the tidy-up.** The strongest simplification makes whole branches, helpers, modes, or layers disappear rather than relocating them. Scattered special cases dropped into unrelated flows are a design problem, not a style nit. A clever mechanism, or a generic abstraction hiding a simple data-shape assumption, loses to direct, explicit code.
- **Name a concrete remedy.** "Maybe rename this" is not a remedy. Reach for one from § `Structural remedies`.
- **Don't downgrade a structural problem.** When the real issue is structural, say so, rather than reporting it as a naming nit because that's easier to phrase.

## Severity

This pass raises what a review suggests, not what blocks merge. A simpler reframe the author could reasonably decline is a nit, because a Minor holds the exit and a declinable suggestion shouldn't. Structure that has to change is a Minor, and it rises to Major when the current structure will cause bugs, mislead the next developer, or compound real maintenance cost, judged by impact times likelihood like every other finding. Ambition is not a license to gatekeep on taste.

## Structural remedies

The same remedies serve a review of a diff and a plan evaluating an approach before code exists. Prefer the ones that remove moving pieces over ones that spread the same complexity around:

- Delete a whole layer of indirection rather than polishing it.
- Reframe the state model so conditionals disappear instead of getting centralized.
- Turn special-case logic into a simpler default flow with fewer exceptions.
- Collapse duplicate branches into a single clearer flow.
- Replace condition chains with a typed model or an explicit dispatcher.
- Move feature-specific logic behind a dedicated abstraction.
- Move the logic to the package, module, or layer that already owns the concept.
- Reuse the existing helper instead of introducing a near-duplicate.
- Delete wrappers that don't clarify the API.
- Separate orchestration from business logic.
- Extract a helper or pure function, or split a large file into smaller focused modules.
- Make type boundaries explicit so the control flow gets simpler.
- Restructure related updates into a more atomic flow when partial state would be harder to reason about.

The remedy you name is the difference between guidance the author can act on and guidance they have to redesign from.

Stack checks for this pass, when the repo has them: `.prism/review/stack/simpler-paths.md`.
