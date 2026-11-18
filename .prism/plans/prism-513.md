# Plan: prism-513

> Closed: 2026-11-17
> Retro: declined — single-PR port of a design already specified in a handoff brief; the AC grading below is the ticket-grain fidelity check.

## Ticket

https://github.com/HunterMcGrew/PRISM/issues/513

## Goal

Ship compaction arms in the hook runtime so every consumer's compacted sessions keep handoff-quality state and re-read their plan afterward.

---

## Implementation Tasks

### Clove (implementation)

1. Add `scripts/ai-skills/hooks/compact-handoff.mjs` (marker line, `runPreCompactArm`, `runSessionStartArm`, `findPlanForBranch`) with a `.d.mts` sidecar.
2. Dispatch `--event=PreCompact` and `--event=SessionStart` from `hook.mjs`.
3. Add the module to `HOOK_RUNTIME_FILES` in `update.ts`.
4. Register both events in `templates/install/.claude/settings.json` and PRISM's own `.claude/settings.json`.
5. Tests: `compact-handoff.test.ts`, plus delivery assertions in `hook-gate.test.ts`.
6. Document the arms in `hook-runtime.md` and its curated install twin.

---

## Decisions

- **The arms dispatch through `hook.mjs`, not a third entry point.**
  - **Root cause:** the handoff brief shipped a standalone script with its own registration command.
  - **Alternatives considered:** a `compact-handoff.mjs` entry point, which would need `PRISM_HOOK_COMMAND_PATTERN`, `PRISM_CODEX_HOOK_COMMAND_PATTERN`, `HOOK_RUNTIME_ENTRY_POINTS`, and doctor's dead-registration check all widened.
  - **Chosen approach:** a library module behind `hook.mjs --event=…`. The existing command pattern, doctor checks, kill switch, and merge ownership cover it with no changes.
  - → promoted to .prism/architect/_toolkit/hook-runtime.md
- **The ticket ID is matched against the config's `ticketPrefix`.** A generic `<letters>-<digits>` match hits slug fragments like `pr-896` in unrelated branch names. Lookup order follows `branch-plan.md` § Plan Lookup, with `.prism/archived/plans/` standing in for the brief's `archive/`.
  - → promoted to .prism/architect/_toolkit/hook-runtime.md
- **The install marker is `.prism/architect/manifest.json` via `findRepoRoot`, not the plans directory.** Plans are created lazily, so a fresh install has no `.prism/plans/` and a plans-dir marker would leave the hook silent there.
  - → no promotion needed (reuses the runtime's existing repo-root lookup)
- **Claude only; Codex gets no registration.** Claude Code documents `PreCompact` stdout as summary instructions. No Codex equivalent was verified, so a Codex registration would print text with no known effect.
  - → promoted to .prism/architect/_toolkit/hook-runtime.md
- **`npm pack --json` is parsed in both shapes, in the cold-start test and `verify-pack-parity.ts`.** npm 12 prints an object keyed by package name where npm 10 printed an array, so slicing from the first `[` broke both gates locally while CI's npm 10 stayed green. Absorbed here because the cold-start leg is AC-1's evidence and the parity gate proves the new module ships.
  - → no promotion needed (the comment at each parse site carries the constraint)

---

## Sessions

- 2026-11-17 [huntermcgrew/prism-513-compaction-handoff-hook] open: Intent — port the Thrive compaction-handoff hook into PRISM's delivered runtime; Bounds — hook module, dispatch, delivery list, Claude registrations, tests, hook-runtime architect doc and twin; no Codex; Approach — module behind `hook.mjs --event` · close: scope held

---

## History

- 2026-11-17 [huntermcgrew/prism-513-compaction-handoff-hook]: Added the PreCompact and SessionStart compaction arms to the hook runtime and its Claude registrations; see Decision: The arms dispatch through `hook.mjs`.
- 2026-11-17 [huntermcgrew/prism-513-compaction-handoff-hook]: Closed on the final PR branch; decisions promoted to `hook-runtime.md`.

---

## Acceptance Criteria

### Behavioral

- [x] AC-1: Given a consumer adopts with every host, When adopt finishes, Then `.claude/settings.json` registers `PreCompact` and `SessionStart` (matcher `compact`) and `.claude/hooks/compact-handoff.mjs` exists.
  - Evidence (machine): `assertAdoptedConsumerState` in `hook-gate.test.ts` fails if either registration or the delivered file is missing from the `npm pack` install.
- [x] AC-2: Given a `PreCompact` payload in a PRISM repo, When the hook runs, Then stdout is the eight-section template under 10,000 characters with the live branch, plan, and status.
  - Evidence (machine): `compact-handoff.test.ts` asserts every heading, the branch, a `?? dirty.txt` status line that only git could report, and the length cap.
- [x] AC-3: Given a `SessionStart` payload, When `source` is `compact`, Then stdout is the post-compact note; for `startup` or `resume` it is empty.
  - Evidence (machine): `compact-handoff.test.ts` "SessionStart prints the post-compact note only for source compact".
- [x] AC-4: Given a malformed payload, a cwd outside a PRISM install, or `PRISM_HOOK_DISABLE=1`, When either arm runs, Then stdout is empty and the process exits 0.
  - Evidence (machine): the silent-paths test, and the spawned `hook.mjs` test asserting exit 0 and empty stdout on `not json`.

---

## PR Readiness

- [x] No critical or major issues
- [x] Tests written for new logic and edge cases
- [x] Build passes — last run: 2026-11-17
- [x] Lasting decisions promoted to architect context

**Last updated:** 2026-11-17
