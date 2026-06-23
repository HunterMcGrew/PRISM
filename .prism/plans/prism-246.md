# Plan: prism-246

## Ticket

https://github.com/HunterMcGrew/PRISM/issues/246

## Goal

When adopt/update runs from inside a vendored PRISM, target the enclosing consumer repo (no global link required).

---

## User Stories

_Not populated for this ticket — vendored-model UX is addressed directly in the Goal and Design direction._

---

## Design

_No mock needed — CLI-only change._

---

## Design direction (for Winston to evaluate)

These are hypotheses and open questions for Winston to resolve — not accepted decisions.

**Current behavior:** in `scripts/ai-skills/adopt.ts` and `update.ts`, `consumerRepoRoot` is derived from `process.cwd()`. When run via `pnpm prism:adopt` inside a vendored PRISM clone, cwd resolves to the PRISM repo itself.

**Proposed detection heuristic:** when the resolved consumer target is the PRISM repo itself (cwd === self-prism-root, derivable via `resolveSelfPrismSource` from #245), retarget to the enclosing consumer repo instead. Rationale: adopting PRISM into PRISM is nonsensical, so "run from inside PRISM" unambiguously means "adopt the repo that contains me."

**Robustness nuance Winston must resolve:** "one level up" is too literal. If PRISM is vendored at `repo/tools/PRISM`, the naïve `..` resolves to `tools/`, not the repo root. The likely correct rule is "walk up to the nearest enclosing git repo that is not PRISM itself." Winston decides the exact algorithm and whether a `--consumer-root <path>` override flag is warranted for edge cases.

**Coexistence requirement:** this adds the vendored/parent-targeting default — it does not remove the global-link / standalone model. Running `prism adopt` from a separate consumer cwd (global binary workflow) must continue to work unchanged. Winston defines resolution precedence (e.g., explicit flag > vendored-parent-detection > cwd).

---

## Implementation Tasks

_Winston populates this section. Nora has intentionally left it empty — design is pending._

---

## Decisions

- **OPEN — TBD, needs Winston input.** Whether the vendored-parent detection algorithm should be "walk up to the nearest enclosing git repo that is not PRISM" or a simpler heuristic (e.g. `git -C .. rev-parse --show-toplevel`). **Default path (used until resolved):** implementation blocked on this decision — Winston designs before Clove implements.

- **OPEN — TBD, needs Winston input.** Resolution precedence between explicit `--consumer-root` flag, vendored-parent-detection, and cwd fallback. **Default path (used until resolved):** Winston defines the precedence order; no code ships until it is defined.

- **OPEN — TBD, needs Winston input.** Whether an explicit override flag (`--consumer-root <path>`) is required for correctness in edge cases (e.g., PRISM vendored more than one level deep), or whether the walk-up algorithm handles all realistic cases. **Default path (used until resolved):** assume flag is needed; Winston may narrow or remove it.

---

## History

- 2026-06-23 [hmcgrew/prism-246-vendored-parent-target]: Nora created plan skeleton; branch set up from origin/main. Winston design pass is the next step.

---

## Debugged Issues

_None yet._

---

## Review Issues

_None yet._

---

## Acceptance Criteria

_Winston populates this section after designing the implementation._

### AC Sync Log

| Date | Agent | Action | Plan | Linear |
| ---- | ----- | ------ | ---- | ------ |

---

## Cleanup Items

_None yet._

---

## PR Readiness

- [ ] No critical or major issues
- [ ] Types correct — no `any`, no unsafe `as`
- [ ] No stray console.logs or debug artifacts
- [ ] Tests written for new logic and edge cases
- [ ] All debugged issues resolved (no `open` entries)
- [ ] Build passes — last run: pending
- [ ] PR description up to date
- [ ] Lasting decisions promoted to architect context (if applicable)

**Last updated:** 2026-06-23
