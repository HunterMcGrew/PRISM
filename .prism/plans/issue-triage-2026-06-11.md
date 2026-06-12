# Plan: issue-triage-2026-06-11

## Ticket

Triage sweep over all open GitHub issues in HunterMcGrew/PRISM. No single ticket — spans #53, #61, #64, #73, #79, #80, #81, #82, #83, #84. Implementation is routed per-issue; this plan is the durable record of the triage and the working memory for the implementation run that follows.

## Goal

A ranked, deduped action board over every open issue — each with validity, fix shape, effort, owning persona, and dependencies — plus the decisions that unblock the implementation run.

---

## The board

Assessed 2026-06-11 against `main` @ `17c1d58`. Each issue was validity-checked against the live tree before its fix shape was assessed — `main` had advanced since the issues were filed (notably PR #88, which removed ghost ADR index rows), so the issue text alone was not trusted.

| Issue | What | Validity | Effort | Persona | Deps |
|-------|------|----------|--------|---------|------|
| #53 | CONTEXT.md ubiquitous-language glossary | done-on-branch (PR #89 open) | 1 | Clove | — |
| #79a | `config.json` `repo: agent-crew → PRISM` + build | still-real | 1 | Clove | upstream of identifiers |
| #84 | install-layout gitignore claim (`.codex`/`.cursor` are tracked, not ignored) | still-real | 2 | Eli | — |
| #83 | Surface reviewer model-pin contract in Briar/Eric SKILL.md bodies | still-real | 2 | spec-edit | family: #73 |
| #80 | Zoe's plan-archive lane (ADR-0047) absent from her spec | still-real | 3 | spec-edit | family: #73/#83 |
| #82 | Backfill ADR index 0029–0045 + state the inclusion rule | still-real | 3 | Eli | — |
| #81 | Fold `worktree-isolation.md` into the worktree-mode reference | still-real | 3 | spec-edit | family: #73 |
| #61 | Repoint stale skill citations (item 1 already resolved) | partially-stale | 3 | mixed | — |
| #64 | Slim AGENTS.md — Slices 2–4 | still-real | 5 | Clove | blocks #73 |
| #73 | Cross-runtime rule-tier honoring (Cursor `.mdc`/Codex AGENTS.md block) | still-real | 5 | mixed | needs #64 first |

Two edges are load-bearing; everything tagged "family" is a reference cross-link, not a sequencing constraint:

- **#79a is upstream** of the token-substituted identifiers in `skills-ecosystem.md § Project Context` — fix it first so nothing else inherits `agent-crew`.
- **#64 blocks #73** — #73's Codex task inlines a managed block *into* AGENTS.md while #64 restructures that file; they collide unless #64 lands first or the marker fence is co-designed.

No duplicates. #83 and #73 are the same exists-vs-honored *family* but different layers (skill model-pins vs. rule-tier loading); #83 says "cross-link, don't merge."

**First implementation batch (no decisions blocked):** #53 → #79a → #84 → #83 → #82, plus #80 once the relocation sweep below is acceptable. Clears 6 of 10.

---

## Decisions

- **#79 splits into a one-line value fix (#79a) and a tracker-support feature (#79b).** The repo uses GitHub issues; the engine supports only Linear.
  - **Root cause:** `tokens.ts:108` hard-rejects any `kind !== "linear"` and `config.schema.json:31` enums only `["linear"]`, so `config.json` cannot truthfully name `github-issues` as the tracker. The repo never went through onboarding, so `config.json` is unconfigured defaults end-to-end, not just the two fields #79 names.
  - **Alternatives considered:** (a) keep the Linear placeholder with clarified "GitHub issues is the real tracker" prose — interim only, leaves the engine gap; (b) build `github-issues` support now — correct for reality, touches the tokenization engine.
  - **Chosen approach:** ship #79a (the `repo` value) immediately because it's a live wrong claim token-substituted into every mirror's Project Context, and split #79b (build `github-issues` kind + proper config init) as its own issue routed to the tokenization concern. Path (a)'s clarified prose is the interim until #79b lands.
  - **Implementation guidance:** #79a is `config.json` `repo: "PRISM"` + `pnpm prism:build`. #79b edits `config.schema.json` (enum), `tokens.ts` (guard ~line 108), `templates/install/.prism/architect/skills-ecosystem.md` (graceful degrade), then sets `kind: "github-issues"` and does a full config pass.
  - → tracked as GitHub issues #79 (a) and #79b (b); no architect-doc promotion needed (the engine change is the durable surface).

- **Zoe's archived content lives under one parent: `.prism/archived/{plans/, lessons-archive.md}`.** #80's plan-archive destination is `.prism/archived/plans/`.
  - **Root cause:** ADR-0047 assigns plan archiving to Zoe but her spec defines a destination only for lessons (`.prism/lessons-archive.md`). The plan-archive lane needs a destination.
  - **Alternatives considered:** (a) add `.prism/plans-archive/` alongside the existing `.prism/lessons-archive.md` — minimal, but leaves two top-level archive surfaces; (b) unify under an `archived/` parent — one archive root, plans get a subdir (many files), lessons stays a single file inside it.
  - **Chosen approach:** unify (b). `.prism/archived/plans/` holds archived closed-plan files; `.prism/lessons-archive.md` relocates to `.prism/archived/lessons-archive.md`.
  - **Implementation guidance:** #80 grows a rename-completeness sweep for the relocation — the canonical references to `.prism/lessons-archive.md` (in `lazy-artifacts.md`, `prism-surface-audit/shared.md`, the `skills-ecosystem.md` Zoe row, `audit-workflow.md`) repoint to the new path, then `pnpm prism:build`. This nudges #80 from effort 2 → 3 and pairs a Clove sweep with the spec edit.
  - → no promotion needed until #80 implements (the structure is recorded here and codifies into Zoe's spec at implementation).

- **#73's verification spike is resolved: Cursor still requires `.mdc` + `globs:`.** Confirmed by Hunter (added ~late May 2026). #73 drops from an 8-point spike-gated task to a ~5-point build.
  - **Root cause:** the prior escalation flagged one unknown — whether Cursor still needs dialect translation or now reads AGENTS.md. It needs the dialect.
  - **Implementation guidance:** before building, verify where the `.mdc`/`globs:` work actually lives. The tree at `17c1d58` shows `.cursor/rules/*.md` carrying `paths:` frontmatter (the Claude dialect) with no `.mdc`/`globs:`/`alwaysApply:`. If hand-added `.mdc` files existed, the verbatim platform-copy in `build.ts` (`copyContentToPlatformDir`) likely clobbered them — which makes the fix "stop the copy from clobbering + emit the dialect," not "add translation from scratch." Confirm before scoping. The #64-before-#73 ordering on the AGENTS.md marker stands.
  - → no promotion needed (the build-pipeline change is the durable surface; #73 carries it).

- **#64's `§N` numbering OPEN decision is resolved: keep numbering.** Confirmed by Hunter. Recorded authoritatively in `.prism/plans/agents-md-slim.md` → `## Decisions`; noted here because it unblocks #64's Slice 4.

---

## History

- 2026-06-11 [hmcgrew/issue-triage-2026-06-11]: Triage sweep over all 10 open issues produced the board above (one assessor per issue, validity-checked against the live tree; cross-runtime and low-confidence issues escalated for deeper assessment). Recorded the four resolved decisions; filed #79b for the github-issues tracker gap split out of #79.
