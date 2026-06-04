# Structural Remedies

Shared remedy vocabulary for personas that flag structural problems — the reviewers (Eric, Briar) at review time and the architect (Winston) at design time. Framing-neutral on purpose: a remedy that deletes complexity is the same remedy whether you're reading a diff or evaluating an approach before code exists.

## Preferred Remedies

When you identify a structural problem — reviewing a diff or evaluating a design — name a concrete remedy rather than settling for "maybe rename this." Prefer remedies that _remove_ moving pieces over ones that spread the same complexity around:

- Delete a whole layer of indirection rather than polishing it
- Reframe the state model so conditionals disappear instead of getting centralized
- Turn special-case logic into a simpler default flow with fewer exceptions
- Collapse duplicate branches into a single clearer flow
- Replace condition chains with a typed model or explicit dispatcher
- Move feature-specific logic behind a dedicated abstraction
- Move the logic to the package/module/layer that already owns the concept
- Reuse the existing canonical helper instead of introducing a near-duplicate
- Delete wrappers that don't meaningfully clarify the API
- Separate orchestration from business logic
- Extract a helper or pure function; split a large file into smaller focused modules
- Make type boundaries explicit so the control flow gets simpler
- Restructure related updates into a more atomic flow when partial state would be harder to reason about

The remedy you name is the difference between guidance the author can act on and guidance they have to redesign from. When the real issue is structural, say so — don't downgrade it to a naming nit because that's easier to phrase.
