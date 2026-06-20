# Plan: epic-eve-substrate

> This epic adds Vercel eve as a compile/deploy target for PRISM's autonomous persona slice. The `.prism/` markdown directory stays the single source of truth — porting means extending `pnpm prism:build` with an eve emitter, not relocating the system.

## Ticket

https://github.com/HunterMcGrew/PRISM/issues/235

## Goal

Add a Vercel eve emitter to `pnpm prism:build` and port the autonomous persona slice (Lilac first, then Sage and Zoe) so they run as always-on, channel-driven eve agents orchestrated by Sol.

---

## User Stories

---

## Design

---

## Implementation Tasks

---

## Decisions

---

## History

- 2026-06-19 [hmcgrew/eve-substrate-port]: Created epic branch plan and issue #235.

---

## Debugged Issues

---

## Review Issues

---

## Acceptance Criteria

---

## Cleanup Items

---

## PR Readiness

- [ ] No critical or major issues
- [ ] Types correct — no `any`, no unsafe `as`
- [ ] No stray console.logs or debug artifacts
- [ ] Tests written for new logic and edge cases
- [ ] All debugged issues resolved (no `open` entries)
- [ ] Build passes — last run: TBD
- [ ] PR description up to date
- [ ] Lasting decisions promoted to architect context (if applicable)

**Last updated:** 2026-06-19
