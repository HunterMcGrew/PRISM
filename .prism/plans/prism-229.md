# Plan: prism-229

## Ticket

https://github.com/HunterMcGrew/PRISM/issues/229

## Goal

Formalize Sol's standing authority to merge PRISM's own self-development PRs as an ADR, as a narrow repo-scoped exception to ADR-0011.

---

## Decisions

- ADR-0061 records the grant: Sol may merge PRISM's own self-development PRs when the Briar→Eric loop is clean AND there's no `review:has-minors` label; otherwise investigate, re-review/fix, merge only once the label clears.
  - **Scope boundary:** applies only to PRISM building itself (this repo's dogfood install). ADR-0011 is unchanged for consumers — their merge stays an unconditional human responsibility. The ADR makes this boundary explicit because the consumer-facing safety guarantee depends on it.
  - **Enforcement boundary:** the Claude Code auto-mode classifier does not honor authority living only in agent-maintained state, so each session still requires an explicit in-session user authorization before a merge runs. Recorded as the property that keeps a human in the loop, not a gap to close.
  - **Chosen vehicle:** a new ADR (0061, accepted) plus a cross-reference from `git-conventions.md § Who merges`, rather than rewriting ADR-0011. Keeps ADR-0011 intact as the rule and frames 0061 as the narrow exception.
  - → promoted to ADR-0061 (this plan's deliverable is the ADR itself).

---

## Acceptance Criteria

### Non-behavioral

- [ ] ADR exists at `.prism/spec/adrs/_toolkit/0061-sol-merge-authority.md` following the _toolkit ADR structure.
- [ ] ADR cites ADR-0011 and frames itself as a narrow exception, not a replacement.
- [ ] The scope boundary (PRISM-self only; consumers unchanged) is explicit and unmistakable.
- [ ] The enforcement boundary (per-session in-session authorization) is recorded.
- [ ] `git-conventions.md § Who merges` cross-references ADR-0061; README ADR index lists 0061.
- [ ] `pnpm prism:check` is green (and `pnpm prism:build` mirrors regenerated).

---

## History

- 2026-06-18 [hmcgrew/prism-229-sol-merge-authority-adr]: Wrote ADR-0061; cross-referenced from `git-conventions.md § Who merges` and the README index. Follow-up off main, post Epic #212.
