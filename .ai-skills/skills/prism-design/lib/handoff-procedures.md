# Pixel Handoff Procedures

Read the design you just produced and select the matching procedure. They are mutually exclusive — pick the one that fits.

---

## Procedure A — Mode 2 spec to Winston (canonical path for all saved specs)

**Trigger:** whenever a mock spec was saved (mode 2), regardless of whether you see architectural implications. This is the [ADR-0034](../../../../spec/adrs/_toolkit/0034-pixel-always-routes-through-winston.md) invariant — design depth doesn't include architecture depth, so Winston catches what you can't see (server/client boundary issues, new-shared-component candidates, data-flow couplings).

Set the spec's `Status` field and say one of:
- "This needs a Winston pass before implementation — [specific reason]." Set `Status: Needs architecture review`. Winston runs full evaluate mode, updates `## Decisions`, then writes `## Implementation Tasks`.
- "Design is locked. Ready for Winston." Set `Status: Ready for Winston`. Winston runs plan-mode-only — quick verification pass against your spec, then writes `## Implementation Tasks` to the detail bar in [`implementation-task-detail.md`](../../../rules/implementation-task-detail.md).

Either way, Clove implements against Winston's tasks with your spec as the design reference — never against your spec alone.

If the spec needs a copy polish pass — final button labels, error wording, empty-state microcopy, confirmation-dialog language — leave clear **Copy direction** in the spec (tone, length, what each string should accomplish) rather than trying to write the final strings. Set `Status: Needs copy pass` if the direction isn't enough and real strings are blocking implementation; otherwise `Ready for Winston` is fine.

**Escape:** if the spec reveals that a required design element is unimplementable within the current architecture (component doesn't exist, data shape isn't defined, the pattern would require a new server boundary) — emit `needs-replan` to Winston naming the specific architectural gap and why it prevents locking the spec. Do not set `Status: Ready for Winston` until the gap is resolved.

---

## Procedure B — Mid-ticket gap-fill (mode 1 inline only)

**Trigger:** when Clove hit a missing state mid-implementation and Pixel specced it inline with no full mock file saved.

Close with: "This is a mode-1 sketch, not a full spec — Clove, you're unblocked. If this ends up being more than a one-off state, ping me back and I'll write a proper mock." Tiny inline riffs don't need a plan update — it's noise. Clove picks up directly without routing through Winston.

If the gap grows into something that warrants a full spec (multiple states, a new shared component, a pattern that will recur), upgrade to Procedure A instead.

---

## Procedure C — Copy direction gap

**Trigger:** when the spec's copy direction says what strings need to accomplish but Pixel doesn't have enough context to draft the actual strings (tone, regulatory constraints, brand voice not established).

Write clear copy direction in the spec — tone, length, what each string should accomplish — and set `Status: Needs copy pass`. Then route to Winston who will incorporate the copy direction into Clove's tasks.

**Escape:** if the copy direction itself can't be written because a foundational constraint (regulatory language, data-sensitivity classification, brand voice guidelines) is unknown and only a human holds that information — emit `needs-human` naming the specific constraint required. Do not route to Winston with a spec whose copy direction is unresolvable.

---

## Procedure D — Conversational riff (no output artifact)

**Trigger:** when the user was thinking out loud and didn't ask for anything saved — no mock spec produced, no plan update needed.

Close with: "When you're ready to lock this in, say the word and I'll write it up." No handoff, no plan update.

---

## Procedure E — Design-quality second opinion (Pixel uncertain, no structural issue)

**Trigger:** when the design feels done but Pixel herself is uncertain about design quality — hierarchy unclear, flow feels off, something isn't clicking — and the uncertainty is not structural (no unimplementable elements, no new server boundary, no missing component).

Hand back to the user with specific questions rather than a generic "any thoughts?" Name the specific concern: "I wasn't sure if the destructive confirmation is heavy enough — thoughts on making it typed instead of checkbox?" Structural uncertainty (unimplementable element, missing API contract) routes to Winston via Procedure A's escape instead.
