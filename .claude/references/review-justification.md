# Justification Review

Shared abstraction-justification procedure consumed by Briar (self-review, `prism-code-review-self`) and Eric (PR review, `prism-code-review-pr`). The "justify every abstraction" lens stays pinned in each skill's "How X Thinks" section; this file holds the four-question procedure and the deletion-test tiebreaker.

After the correctness sweep, step back and evaluate whether each structural change in the diff earns its complexity.

For every new or modified abstraction (generic parameter, utility function, wrapper component, shared type, interface change):

1. **Why does this exist?** What concrete problem does it solve? If you can't articulate the problem in one sentence, the abstraction may be speculative.
2. **Who uses it?** Count the consumers. If only one call site uses a generic parameter, shared utility, or type — the logic likely belongs at that call site, not in a shared layer. One consumer is not an abstraction; it's indirection.
3. **What's the simpler alternative?** If you removed this abstraction and solved the problem inline at each call site, would the code be worse? If not, flag the abstraction as premature.
4. **Is it internally consistent?** When a shared interface or type is modified, check that all methods use the change uniformly. A half-generic interface (some methods use the parameter, others don't) signals the abstraction doesn't fit the contract.

This does not apply to the existence of new files (components, tests, constants) — those are driven by the ticket. It applies to structural decisions _within_ any code, new or modified: generic parameters, shared utilities, abstraction layers, interface changes, wrapper components, and indirection that shapes how future code is written.

When the justification questions land ambiguously — "maybe one consumer is enough" or "this could be useful later" — run the deletion test: imagine deleting the abstraction. If complexity vanishes, it was a pass-through; flag it as premature. If complexity reappears across multiple call sites, it was earning its keep; let it stand. The test is a tiebreaker for ambiguous cases, not a routine checklist item.

## Simplification & Structural Leverage

The checks above are defensive — they stop unjustified complexity from landing. This section is the offensive counterpart: once correctness holds, ask whether the change could be _dramatically_ simpler, not just slightly tidier.

- **Don't stop at "this could be a bit cleaner."** Look for a reframe that makes whole branches, helpers, modes, conditionals, or layers disappear entirely. The strongest simplification _deletes_ complexity rather than relocating it.
- **Assume a structural-leverage move is often available** — a re-organization that leans on the existing architecture more effectively and makes the change far simpler. If you can see a path to remove moving pieces instead of rearranging them, push hard for it.
- **Treat scattered special-cases as a design problem, not a style nit.** New ad-hoc conditionals, one-off branches, or "weird if statements in random places" dropped into otherwise unrelated flows are a smell. Prefer pushing that logic into a dedicated abstraction, helper, state model, policy object, or separate module over tangling an existing path. Flag changes that make the surrounding code harder to reason about even when they technically work.
- **Prefer the solution that makes the code feel inevitable in hindsight.** Don't settle for a merely cleaner version of the same messy idea when there's a plausible path to a much simpler idea.

**Severity discipline still governs.** This raises the ceiling of what you _suggest_, not what _blocks merge_. A simpler reframe the author could reasonably decline is a **Minor** with a strong suggestion — or a non-blocking note (see "Cleaner Paths" in each reviewer's output format). It rises to **Major** only when the current structure will actually cause bugs, mislead the next developer, or compound real maintenance cost — judged like every other finding, by impact × likelihood. Ambition is not a license to gatekeep on taste.

The remedy shapes to reach for live in [`structural-remedies.md`](structural-remedies.md) § Preferred Remedies.
