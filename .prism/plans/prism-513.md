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
- **The ticket ID is matched against the config's `ticketPrefix`.** A generic `<letters>-<digits>` match hits slug fragments like `pr-896` in unrelated branch names. Lookup tries `<id>.md`, `epic-<id>.md`, then both under `.prism/archived/plans/`; the `## Ticket` scan from `branch-plan.md` § Plan Lookup is skipped so the hook checks four fixed paths instead of opening every plan on each compaction.
  - → promoted to .prism/architect/_toolkit/hook-runtime.md
- **The install marker is `.prism/architect/manifest.json` via `findRepoRoot`, not the plans directory.** Plans are created lazily, so a fresh install has no `.prism/plans/` and a plans-dir marker would leave the hook silent there.
  - → no promotion needed (reuses the runtime's existing repo-root lookup)
- **Claude only; Codex gets no registration.** Claude Code documents `PreCompact` stdout as summary instructions. No Codex equivalent was verified, so a Codex registration would print text with no known effect.
  - → promoted to .prism/architect/_toolkit/hook-runtime.md
- **`npm pack --json` is parsed in both shapes, in the cold-start test and `verify-pack-parity.ts`.** npm 12 prints an object keyed by package name where npm 10 printed an array, so slicing from the first `[` broke both gates locally while CI's npm 10 stayed green. Absorbed here because the cold-start leg is AC-1's evidence and the parity gate proves the new module ships.
  - → no promotion needed (the comment at each parse site carries the constraint)
- **A filename miss sends the session to the full Plan Lookup instead of declaring no plan.** Ported from TracTru/thrive#2935. The hook skips the `## Ticket` scan, so "no branch plan found" overclaimed on a miss; the note now names `branch-plan.md` § Plan Lookup and the state block says "none found by filename".
  - → promoted to .prism/architect/_toolkit/hook-runtime.md

---

## Sessions

- 2026-11-17 [huntermcgrew/prism-513-compaction-handoff-hook] open: Intent — port the Thrive compaction-handoff hook into PRISM's delivered runtime; Bounds — hook module, dispatch, delivery list, Claude registrations, tests, hook-runtime architect doc and twin; no Codex; Approach — module behind `hook.mjs --event` · close: scope held

---

## History

- 2026-11-17 [huntermcgrew/prism-513-compaction-handoff-hook]: Added the PreCompact and SessionStart compaction arms to the hook runtime and its Claude registrations; see Decision: The arms dispatch through `hook.mjs`.
- 2026-11-17 [huntermcgrew/prism-513-compaction-handoff-hook]: Fixed self-review pass 1: plan-lookup claims now match the four paths checked, a failed `git status` no longer reads as clean, and truncation is tested.

- 2026-11-17 [huntermcgrew/prism-513-compaction-handoff-hook]: Closed on the final PR branch; decisions promoted to `hook-runtime.md`.
- 2026-11-17 [huntermcgrew/prism-513-followup-plan-miss-lookup]: Ported thrive#2935's plan-miss wording and recorded its observed manual-compact behavior; see Decision: A filename miss sends the session to the full Plan Lookup.
- 2026-11-17 [huntermcgrew/prism-513-followup-plan-miss-lookup]: Fixed self-review pass 1: the twin labels the manual-compact behavior as observed, and the multi-hook and stdout claims are scoped to what was verified.

---

## Review Issues

### Architect doc claims the hook follows Plan Lookup, but it skips the `## Ticket` scan

- **Severity:** `major`
- **Status:** `fixed`
- **File:** `.prism/architect/_toolkit/hook-runtime.md:60`
- **Problem:** The doc (and its curated twin) says the plan is "looked up in the order `branch-plan.md` § Plan Lookup gives, archived plans included", but `findPlanForBranch` stops after ticket and epic names in `plans/` then `archived/plans/`. It never runs Plan Lookup step 4 (scan plans for a matching `## Ticket` field), and § Plan Lookup itself has no archive step. A diverged architect-doc claim is Major under `architect-doc-verification.md`.
- **Suggested fix:** Reword in the doc, the twin (`templates/install/.prism/architect/_toolkit/hook-runtime.md`), and the `findPlanForBranch` JSDoc to say what runs: `<id>.md`, then `epic-<id>.md`, then the same two under `.prism/archived/plans/`, with no `## Ticket` field scan. Rebuild the mirrors.

### A failed or timed-out `git status` renders as "(clean)"

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `scripts/ai-skills/hooks/compact-handoff.mjs:123`
- **Problem:** `git()` returns `""` on any failure or the 5 s timeout, so `readLiveState` reports `(clean)`, and the template tells the summarizer to copy these facts as written. A slow `git status` in a large repo would put a false clean-tree claim into the summary.
- **Suggested fix:** Return `null` from `git()` on failure and render the status as `(git status unavailable)` in that case.

### Status truncation and failure paths have no test

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `scripts/ai-skills/compact-handoff.test.ts:50`
- **Problem:** Nothing exercises the `STATUS_LINE_LIMIT` branch (`… N more`), the detached-HEAD label, or a git failure, so the "under 10,000 characters" claim is only checked for a one-file status.
- **Suggested fix:** Add one test with more than 40 untracked files asserting the `… N more` line and the length cap.

Pass 2: No issues found — 2026-11-17 [huntermcgrew/prism-513-compaction-handoff-hook]. The three findings above are confirmed closed; the `PreCompact` stdout claim (summary instructions, 10,000-character cap per hook) was checked against Claude Code's hooks reference.

### Curated twin states the manual-compact behavior as established fact

- **Severity:** `major`
- **Status:** `fixed`
- **File:** `templates/install/.prism/architect/_toolkit/hook-runtime.md:51`
- **Problem:** The canonical doc, the module header, and the PR scope all label "text typed after a manual `/compact` reaches the summarizer" as observed once and not in the Claude Code docs. The twin drops that label and says it still reaches the summarizer, so consumers get an unverified observation as a documented contract. A diverged claim in an architect doc is Major under `architect-doc-verification.md`.
- **Suggested fix:** Add the qualifier to the twin, e.g. "Text you type after a manual `/compact` appears to reach the summarizer alongside the template. That was observed in one live manual compact and is not stated in the Claude Code docs." It passes Test 2 and Test 3, since no unreachable reference is involved. Also give "A miss is a miss by filename only" an antecedent, since the twin never mentions the `## Ticket` scan it contrasts with.

### Unverified "any other `PreCompact` hook" claim and an overstated "prints nothing"

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `.prism/architect/_toolkit/hook-runtime.md:64`
- **Problem:** "Any other `PreCompact` hook that prints to stdout also becomes summary instruction" (also in the `compact-handoff.mjs` header at lines 25-26 and in the twin) is stated flat. The documented fact is per-hook stdout; combined behavior across hooks was not shown. "Prints nothing" is also loose: `runPostCompactArm` writes to stderr on a missing session id and on a failed reset (`hook.mjs:1128`, `hook.mjs:1159`). "Is the only way a second writer appears" ignores user-level and plugin `PreCompact` hooks.
- **Suggested fix:** Say "prints nothing to stdout", mark the multi-hook claim as inferred from the per-hook behavior, and say "another `PreCompact` hook, from the consumer or a plugin" instead of "the only way".

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

- [ ] No critical or major issues — follow-up pass 1 left one Major open (twin drops the observed-once label)
- [x] Tests written for new logic and edge cases
- [x] Build passes — last run: 2026-11-17 (`pnpm prism:check` reported passing by the loop; not re-run in this pass)
- [x] Lasting decisions promoted to architect context

**Last updated:** 2026-11-17
