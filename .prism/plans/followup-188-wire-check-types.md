# Plan: followup-188-wire-check-types

> Closed: 2026-06-16

## Ticket

https://github.com/HunterMcGrew/PRISM/issues/188

## Goal

Wire `prism:check-types` into the `prism:check` chain so TypeScript type errors block the gate.

---

## Implementation Tasks

### Clove (implementation)

1. Add `pnpm run prism:check-types` to `prism:check` in `package.json`, immediately after `build --check` and before `prism:test`.

---

## Decisions

- `check-types` placed second in the chain (after `build --check`, before `prism:test`) — both are fast, stateless checks; failing on a type error before the slower test and lint steps avoids wasted wait time. See: https://github.com/HunterMcGrew/PRISM/issues/188
  - → no promotion needed (ticket-tactical ordering choice; no architectural pattern generalizes from this)
- CI workflow (`.github/workflows/prism-check.yml`) invokes `pnpm prism:check` directly — no CI change needed; it inherits `check-types` automatically.
  - → no promotion needed (ticket-tactical; CI confirmed clean by inheriting the `package.json` change)
- Placement decision recorded here rather than as an inline comment — `package.json` has no comment syntax.
  - → no promotion needed (one-time placement call, obvious from the script ordering)

---

## History

- 2026-06-16 [hmcgrew/prism-188-wire-check-types]: Wired `prism:check-types` into `prism:check` chain in `package.json`; CI inherits automatically.
- 2026-06-16 [hmcgrew/prism-188-wire-check-types]: Plan closed; all Decisions carry verdict sub-bullets, no promotions needed.
