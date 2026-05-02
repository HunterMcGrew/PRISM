---
Number: 0025
Title: "use client" constants leak as proxies in RSC
Status: accepted
Date: 2026-04-28
---

## Context

Constants exported from a file marked `"use client"` ship as a client reference proxy when imported from a React Server Component. Server code reads the proxy, not the real object — `in` checks miss every key, lookups by string fall through to the default branch, and there is no error. The symptom only surfaces when a server-rendered path consumes the constant.

This platform constraint surfaced twice in independent mega menu work:

- **THR-1591** shipped a bug where every valid icon name in `MEGA_MENU_LINK_ICONS` resolved to `"call"`. The constant was exported from `MegaMenuLinkWithIcon.tsx` (`"use client"`), and the resolver imported it expecting a real object. The proxy made the lookup quietly fall through.
- **THR-1131** hit the same shape earlier and worked around it by rebuilding the icon map inside the editor. The workaround prevented the bug locally but masked the underlying rule.

Two independent rediscoveries inside the same feature area is the trigger to write the rule down so the third occurrence is caught at review.

## Decision

Constants live in plain modules under `frontend/lib/constants/`, one file per domain. Files exporting constants do not carry a `"use client"` directive and do not import client-only APIs.

When a client component owns conceptual authorship of a constant, the component imports the value from `frontend/lib/constants/<domain>.ts` rather than declaring and exporting it locally. The client component is the _user_ of the data; the constants file is the source of truth and must remain RSC-safe so resolvers and other server code see the real object.

## Consequences

- Positive: RSC consumers (resolvers, server components, server-only utilities) read the real object. `in` checks and enum-like lookups behave as written.
- Positive: Single source of truth per domain. No "rebuild the map in the editor" workaround like THR-1131.
- Negative: When a client component's data is logically colocated with its presentation, the constant still has to move out — a small file split and an extra import. Worth it for a class of bugs that ship silently.
- Neutral: Backend editor blocks (running outside Next.js) are unaffected by the proxy issue but follow the same rule for cross-bundle consistency.

## References

- `.claude/plans/archive/thr-1591.md` — production bug, icon map proxy
- `.claude/plans/archive/thr-1131.md` — earlier workaround that masked the constraint
- `.claude/architect/frontend-constants.md` § Constants must not live in "use client" modules — the everyday rule
- `.claude/rules/headless-architecture.md` § Key Rules — broader RSC rule this is a corollary of
