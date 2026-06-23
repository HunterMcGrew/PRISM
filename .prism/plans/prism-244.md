# Plan: prism-244

## Ticket

https://github.com/HunterMcGrew/PRISM/issues/244

## Goal

Make consumer adopt/update runnable as a real `prism` command from the consumer repo, instead of a raw tsx invocation.

---

## User Stories

_Not populated — not required for this ticket._

---

## Design

_Not applicable._

---

## Design direction (for Winston to evaluate)

Starting hypothesis only — these are not accepted decisions. Winston owns evaluation and may revise or reject any of these.

- **`bin` entry in `package.json`** — add `"prism"` → a small subcommand dispatcher (`adopt`, `update`) so consumers get a real `prism` binary on PATH after install. Removes the need to know PRISM's internal script paths.
- **Auto-derive `prismSource` from `import.meta.url`** — the key ergonomic win: the running script knows where it lives, so `--prism-source` is no longer required for the common case. Open risk Winston must evaluate: this interacts with the existing `resolvePrismSource` fallback chain in `scripts/ai-skills/update.ts` (order: `--prism-source` CLI arg → `prismSource` in consumer config → error) and the `assertSourceIsPlausible` safety guard. The fallback chain may need to grow a third slot (self-location via `import.meta.url`) ahead of the existing error path.
- **OPEN — distribution mechanism (delegated to Winston):** global link (`pnpm link --global` → `prism` on PATH) vs. npx-from-git (consumer adds PRISM as a git devDependency, runs `npx prism adopt`). Tradeoffs: version pinning, consumer setup friction, whether `import.meta.url` self-location works correctly under each install shape. See OPEN decision entry in `## Decisions` below.

---

## Implementation Tasks

_Winston (architect) populates this section next. Do not add tasks here until Winston has evaluated the design direction above._

---

## Decisions

- **OPEN — TBD, needs Winston input.** Distribution mechanism for the `prism` binary: global link (`pnpm link --global`) vs. npx-from-git (PRISM as a git devDependency). The choice affects how consumers install, whether version pinning is explicit, and whether `import.meta.url` self-location resolves correctly under each shape. **Default path (used until resolved):** proceed with design and task planning against the global-link model; Winston may flip to npx-from-git if the evaluation favors it.

---

## History

- 2026-06-23 [hmcgrew/prism-244-consumer-prism-cli]: Plan skeleton created by Nora; Winston to evaluate design direction and populate implementation tasks, decisions, and AC.

---

## Debugged Issues

_None._

---

## Review Issues

_None._

---

## Acceptance Criteria

_Winston (architect) populates this section next._

---

## Cleanup Items

_None._

---

## PR Readiness

- [ ] No critical or major issues
- [ ] Types correct — no `any`, no unsafe `as`
- [ ] No stray console.logs or debug artifacts
- [ ] Tests written for new logic and edge cases
- [ ] All debugged issues resolved (no `open` entries)
- [ ] Build passes — last run: not yet run
- [ ] PR description up to date
- [ ] Lasting decisions promoted to architect context (if applicable)

**Last updated:** 2026-06-23
