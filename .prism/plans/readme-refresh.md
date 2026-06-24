# Plan: readme-refresh

## Ticket

No ticket yet; file a GitHub issue when the work starts. This team tracks work in GitHub issues, and none is filed for the README refresh.

## Goal

Refresh PRISM's README so a new external team landing on it — via npm/npx or GitHub — understands what PRISM is and how to adopt it, with `npx @huntermcgrew/prism adopt` as the recommended entry point.

---

## Design

This is the context the future interactive session needs, plus the one open question that gates the work.

### The work is an interactive Eli session

The refresh is an **interactive `prism-documentation` (Eli) session** — Eli grills Hunter on content before writing. It cannot run as a dispatched subagent, because the value comes from the back-and-forth on what the README should say. Owner: Eli.

### npm-first framing is the documented direction

The README should lead with `npx @huntermcgrew/prism adopt` as the recommended entry point and demote the checkout / vendored adoption methods to alternatives. This matches the docs-framing decision already applied to `docs/adopt-prism.md` — the README should land on the same hierarchy so npm and repo readers get a consistent story.

### Open question — gates the work

- **OPEN — needs Hunter input.** Whether npm and GitHub share one `README.md` or get two differentiated files. **Context:** today `README.md` is a single file in the package `files` allowlist, so npm (package README) and GitHub (repo README) render the same file. **Default path (used until resolved):** one shared `README.md`. This is Eli's first question to settle with Hunter in the interactive session — the answer shapes the entire refresh (single audience vs. two), so resolve it before writing prose.

---

## History

- 2026-06-24 [main]: Created plan to scaffold the deferred README-refresh work for a future interactive Eli session. Captures the npm-first goal and the one-vs-two-README open question; work itself deferred.
