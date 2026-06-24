# Plan: prism-250

> Closed: 2026-06-24

## Ticket

https://github.com/HunterMcGrew/PRISM/issues/250

## Goal

Add a `prism init` CLI subcommand that bootstraps `.ai-skills/config.json` so a cold consumer can run `npx @huntermcgrew/prism adopt` without hitting a missing-config error.

---

## User Stories

---

## Design

---

## Implementation Tasks

### Clove (implementation)

Sequence: task 1 (config-layer widening) blocks task 3 (init reuses the widened helper). Task 2 is parallel with task 1. Tasks 4–5 follow task 3. Task 6 (adopt error message) is independent — parallel with everything. Tasks 7–8 are verification.

1. **Widen the config write path to honor `ticketSystem.kind`** — file `scripts/ai-skills/lib/onboarding-config.ts`. Today the write path hardcodes Linear while the schema (`config.schema.json`) and the build reader (`tokens.ts`) already accept `"github-issues"`. Three edits in this one file:
   - **Type** (line 42, inside `PrismOnDiskConfig`): change `kind: "linear";` to `kind: "linear" | "github-issues";`.
   - **`toOnDiskConfig`** (around line 170): the `ticketSystem` object currently sets `kind: "linear"` and `teamKey: config.linearTeam` unconditionally. Change it to derive from the input: when `config.linearTeam` is a non-empty string, emit `{ kind: "linear", teamKey: config.linearTeam }`; otherwise emit `{ kind: "github-issues" }` with no `teamKey`/`workspace`. This keeps Atlas's existing Linear behavior (Atlas always supplies `linearTeam`) byte-identical while letting `init` produce a github-issues config by passing an empty `linearTeam`. Add a JSDoc sentence on the branch explaining the derivation (what + why).
   - **`validateOnDiskConfig`** (line 234): change the `kind !== "linear"` check to reject only values that are neither `"linear"` nor `"github-issues"`: `if (config.ticketSystem.kind !== "linear" && config.ticketSystem.kind !== "github-issues")`. Update the error message to `'must be "linear" or "github-issues"'`.
   - Verification: `cd <repo-root> && pnpm run prism:test` — confirm `onboarding-config.test.ts` still passes (its one `kind` assertion at line 75 is Linear and must stay green).

2. **Add github-issues coverage to the config write tests** — file `scripts/ai-skills/onboarding-config.test.ts`. Add one test: build an `OnboardingConfig` with `linearTeam: ""` (empty), call `writeOnboardingConfig`, read the result, assert `parsed.ticketSystem.kind === "github-issues"` and that no `teamKey`/`workspace` keys are present. Mirror the existing test structure in this file (temp dir via `fs.mkdtemp`, cleanup in `finally`). Verification: `pnpm run prism:test`. Parallel with task 1 — write against the widened behavior task 1 produces.

3. **Create the init module** — new file `scripts/ai-skills/init.ts`. Exports `runInitCli(): Promise<void>` and a testable core `runInit(options: { consumerRepoRoot: string; answers: InitAnswers }): Promise<{ path: string }>`. Structure (RSC-free Node module, `node:` built-ins only — the substrate has zero runtime deps; no `prompts`/`inquirer`):
   - **Imports:** `detectStack` from `./lib/stack-detect`, `writeOnboardingConfig` from `./lib/onboarding-config`, `OnboardingConfig` type from `./lib/onboarding-types`, `resolveConsumerRoot`/`parseConsumerFlag` from `./lib/consumer-root`, `resolveSelfPrismSource` from `./update`, `node:readline/promises`, `node:process`.
   - **`InitAnswers` interface:** `{ project: string; org?: string; ticketPrefix: string; ticketSystemKind: "linear" | "github-issues"; linearTeam?: string; linearWorkspace?: string; githubOwner: string; githubRepo: string; defaultBranch?: string }`.
   - **Guard:** before doing anything, if `<consumerRepoRoot>/.ai-skills/config.json` already exists, throw `"prism init: .ai-skills/config.json already exists — edit it directly or remove it to re-init."` (mirrors adopt's `assertConsumerIsEstablished` posture: refuse to clobber, guard lives in `runInit` so every caller inherits it).
   - **`runInit` body:** call `detectStack(consumerRepoRoot)` to get the `DetectedStack`. Build an `OnboardingConfig` from `answers` + the detected stack: `{ project, ticketPrefix, githubOwner, githubRepo, linearTeam: answers.linearTeam ?? "", productDomain: "", existingStandards: [], techStack: <detected> }`. (`productDomain`/`existingStandards` are Atlas-only fields `toOnDiskConfig` drops — pass empty.) Call `writeOnboardingConfig(consumerRepoRoot, config, { org: answers.org, defaultBranch: answers.defaultBranch, linearWorkspace: answers.linearWorkspace })`. Return `{ path }`.
   - **`runInitCli` body:** resolve `consumerRepoRoot` via `resolveConsumerRoot` (same call shape as `runAdoptCli` in adopt.ts:142). Parse flags (`--project`, `--org`, `--ticket-prefix`, `--ticket-system` (`linear`|`github-issues`), `--linear-team`, `--linear-workspace`, `--github-owner`, `--github-repo`, `--default-branch`). For each required field still missing after flags: if `process.stdin.isTTY`, prompt via `readline/promises`; if not a TTY, throw naming the missing flag (`"prism init: --project is required in non-interactive mode"`). Required = `project`, `ticketPrefix`, `ticketSystemKind`, `githubOwner`, `githubRepo`. `org` defaults to `project` (handled by `writeOnboardingConfig` options). `linearTeam`/`linearWorkspace` prompted only when kind is `linear`. `defaultBranch` defaults to `main`. After assembling `InitAnswers`, call `runInit` and `console.log` the written path.
   - Verification: `pnpm run prism:check-types` then `pnpm run prism:test`.

4. **Wire `init` into the CLI dispatcher** — file `scripts/ai-skills/cli.ts`. Add `import { runInitCli } from "./init";` (line 15 area). Add a `case "init": await runInitCli(); break;` to the switch (before `adopt`). Update the `USAGE` string: add a line under Usage — `  prism init     Write .ai-skills/config.json so this repo can adopt PRISM (run before adopt)` — and reorder so `init` reads first (it's the first command a cold consumer runs). Verification: content + dispatch only; covered by task 7's CLI test.

5. **Add init core coverage** — new file `scripts/ai-skills/init.test.ts`. Three tests against `runInit` (the non-interactive core, no readline): (a) a Linear answer set writes a config with `kind: "linear"` and the team key; (b) a github-issues answer set (`ticketSystemKind: "github-issues"`, no `linearTeam`) writes `kind: "github-issues"` with no team key; (c) calling `runInit` when `config.json` already exists throws the guard error. Use a temp consumer dir seeded with a minimal `package.json` (so `detectStack` returns a real stack, not just the sentinel) and clean up in `finally`. Verification: `pnpm run prism:test`.

6. **Make adopt point at `init` on missing config** — file `scripts/ai-skills/adopt.ts`. Today a cold adopt fails deep inside `runUpdate → loadConfig` with the raw `tokens.ts:61` message. In `runAdopt` (after `assertConsumerIsEstablished`, before `seedConsumerContentRoot`, around line 127), add a check: if `<consumerRepoRoot>/.ai-skills/config.json` does not exist, throw `"prism adopt: no .ai-skills/config.json found. Run 'npx @huntermcgrew/prism init' first to create it, then re-run adopt."` This converts the circular-bootstrap symptom into an actionable next step. Verification: covered by task 7.

7. **Add adopt-missing-config and init-dispatch coverage** — file `scripts/ai-skills/cli.test.ts` (or `adopt.test.ts` for the adopt-guard test, matching where the adopt suite lives). Add: (a) `runAdopt` against a consumer with no `config.json` rejects with a message containing `"Run 'npx @huntermcgrew/prism init'"`; (b) the `init` subcommand is reachable through the dispatcher (assert `cli.ts` routes `"init"` — follow the existing dispatcher-coverage note in cli.test.ts's header comment). Verification: `pnpm run prism:test`.

8. **Full check** — run `cd <repo-root> && pnpm run prism:check` (build + check-types + test + verify-manifest + crossref-lint). This is the gate the prepublish flow runs; it must pass before PR. Note any leftover-token or manifest-coverage failures — `init.ts` is a new script, not new canonical content, so it should not affect the manifest, but confirm.

### Eli (documentation)

1. **Document the cold-start flow** — file `docs/parameterization.md` (the doc `tokens.ts` cites as the token source-of-truth) or the install-layout architect doc `.prism/architect/_toolkit/install-layout.md` § First-contact. Add a short subsection: the cold-consumer install order is now `npx @huntermcgrew/prism init` → `npx @huntermcgrew/prism adopt` → (later, in-agent) Atlas for rich onboarding. State that `init` writes only `config.json` (deterministic, no agent) and Atlas owns the rest (per-team rules, security docs, anchors). Cite ADR-0040 (Atlas owns conversational onboarding) and ADR-0059 (adopt is seed-and-sync). Verification: content-only, no build effect.

---

## Decisions

- **`prism init` is a separate CLI subcommand, not folded into `adopt`.**
  - Root cause: `adopt`/`update` are a frozen no-second-engine merge core (ADR-0059(a2)); threading interactive prompts into that path contradicts the principle and doubles write sites.
  - Alternatives considered: fold init into adopt behind a `--init` flag; auto-run init from adopt on missing config.
  - Chosen approach: separate `init` command + adopt detects missing config and *points at* `init` (task 6). Beats auto-run (keeps adopt deterministic and non-interactive) and the `--init` flag (keeps the merge core untouched).
  - Implementation guidance: tasks 3–6.
  - → no promotion needed (ticket-tactical CLI shape; the durable lineage is already in ADR-0040/0059).

- **`ticketSystem.kind` write support is widened to `"github-issues"`, reusing `writeOnboardingConfig` after the fix — not bypassing it.**
  - Root cause: the schema (`config.schema.json`) and build reader (`tokens.ts` `loadConfig`/`deriveTicketTracker`) accept `github-issues`, but the write path (`onboarding-config.ts` type + `toOnDiskConfig` + `validateOnDiskConfig`) hardcodes `"linear"`. A cold consumer using GitHub issues — the likely npm-adopt profile — could not get a truthful config.
  - Alternatives considered: (a) init writes Linear-only, defer github-issues to a follow-up — rejected: ships a config that lies about the tracker for the most likely consumer; (b) init bypasses `writeOnboardingConfig` and writes `config.json` directly — rejected: discards the tested atomic-write + validation that is the whole reason to reuse the helper.
  - Chosen approach: widen the write path (task 1). Bounded to `onboarding-config.ts` (verified: `onboarding-config.test.ts` has one Linear `kind` assertion that stays green; `atlas-dogfood.test.ts` has zero `kind` refs; `cli.test.ts` already round-trips a github-issues fixture through `loadConfig`). The widening also retroactively lets Atlas write github-issues configs — a real capability gain.
  - Implementation guidance: task 1, covered by task 2.
  - → promoted to .prism/architect/_toolkit/install-layout.md (the github-issues write path is now a durable capability of the config layer; record it during close).

- **`init` prompts use `node:readline/promises`; flags-and-prompts hybrid.** Substrate has zero runtime deps (`onboarding-config.ts` cites the same constraint for not pulling in AJV), so no `prompts`/`inquirer`. Flags serve CI/scripted adopt; TTY prompts serve cold `npx`; non-TTY + missing required field throws naming the flag.
  - → no promotion needed (implementation tactic, self-evident from `init.ts`).

- **`init` does not write `paths.json`.** Confirmed: `paths.json` ships in the npm package `files` array and is seeded by adopt; `update.ts` reads it from the consumer root. Out of scope for `init`.
  - → no promotion needed (verified non-requirement, ticket-local).

- **Atlas existing-config detection is a noted follow-up, not this ticket.** After `init` lands, Atlas should detect an existing `config.json` and not re-ask/clobber. The task-1 widening does not break Atlas (it strictly adds capability), so this is non-blocking. Cross-persona (Atlas skill files) — file as a follow-up per `.prism/rules/followup-scope.md` after this ships.
  - **Follow-up (for Nora to file / Sol to surface):** Atlas should detect an existing `.ai-skills/config.json` written by `init`, read its values as the starting point, and not re-prompt for or clobber fields already present. **Done-condition:** running Atlas in a repo where `init` already wrote `config.json` reuses those values without overwriting them, and only prompts for fields `init` does not collect (per-team rules, security guidance, anchors). **Traces to:** this Decision and the task-1 `ticketSystem.kind` widening (`scripts/ai-skills/lib/onboarding-config.ts`). **Owner:** Atlas skill (`prism-onboarding`).
  - → no promotion needed (tracked as a scoped follow-up, not a decision about this implementation).

---

## History

- 2026-06-23 [hmcgrew/prism-250-init-command]: Plan created; issue #250 opened. Cold-adopt repro confirmed: `tokens.ts:61` throws on missing `config.json` before any skills are projected. Branch created from `origin/main` at `ed221f9`.
- 2026-06-23 [hmcgrew/prism-250-init-command]: Winston evaluated — Proceed with changes. Endorsed the init/Atlas split; resolved OPEN decision. Verified `detectStack` reuses cleanly; `writeOnboardingConfig` reuses after a bounded widening to honor `ticketSystem.kind` (see Decision). Wrote Implementation Tasks + AC.
- 2026-06-23 [hmcgrew/prism-250-init-command]: Clove shipped tasks 1–8. Widened `onboarding-config.ts` type + `toOnDiskConfig` + `validateOnDiskConfig` for github-issues. Created `init.ts` (`runInit`/`runInitCli`) with `node:readline/promises` prompts and CI flag path. Wired `init` into `cli.ts` dispatcher with updated USAGE. Added adopt missing-config guard pointing at `prism init`. All 371 tests pass; `prism:check` gate green.
- 2026-06-23 [hmcgrew/prism-250-init-command]: Eli documented cold-start flow. Added `prism init → adopt → Atlas` three-step section to `install-layout.md` § First-contact; added pre-adopt pointer to `docs/adopt-prism.md`. Commands and flags verified against `init.ts` and `cli.ts` source.
- 2026-06-23 [hmcgrew/prism-250-init-command]: Briar self-review. Types clean; 371 tests green. One major: Eli's `install-layout.md` edit was not propagated to platform mirrors — `prism:check` fails. Fix: run `pnpm prism:build`. One minor: unsafe `as` cast on `flagTicketSystem` before validation in `init.ts:167`.
- 2026-06-23 [hmcgrew/prism-250-init-command]: Clove fixed all three Briar review issues. Ran `pnpm prism:build` to sync platform mirrors; restructured `parseFlag`/validate/assign to eliminate `as` cast on `rawTicketSystem`; added `fieldName` param to `resolveRequired` so empty-answer errors read cleanly without prompt hint text. `prism:check` fully green: build sync, tsc clean, 371 tests pass, verify-manifest clean, crossref-lint clean.
- 2026-06-23 [hmcgrew/prism-250-init-command]: Eli fixed Eric's Minor — stale "only linear supported" claim at lines 91 and 140 of `prism-onboarding/shared.md`. Both now reflect that `ticketSystem.kind` accepts `"linear"` or `"github-issues"`. Rebuilt mirrors; `prism:check` green at 371/371.
- 2026-06-24 [hmcgrew/prism-250-init-command]: Winston closed the plan on the final PR branch (#251, review-clean). Promoted the github-issues write-path capability to `install-layout.md` § First-contact; rebuilt mirrors and confirmed `prism:check` green. Applied the Decision verdict gate (all entries carry verdicts), sharpened the Atlas existing-config follow-up with a done-condition + owner, and verified all 9 AC at-merge.

---

## Debugged Issues

---

## Review Issues

### Build break: install-layout.md platform mirrors out of sync

- **Severity:** `major`
- **Status:** `fixed`
- **Fixed in:** `PRISM-250: Fix Briar review issues — mirrors, unsafe cast, error message` (review-fix commit)
- **File:** `.prism/architect/_toolkit/install-layout.md`
- **Problem:** Eli edited the canonical architect doc but `pnpm prism:build` was not re-run. The platform mirrors (`.claude/architect/_toolkit/install-layout.md`, `.codex/architect/_toolkit/install-layout.md`, `.cursor/architect/_toolkit/install-layout.md`) are 13 lines behind the canonical. `pnpm run prism:check` fails at the `build.ts --check` step with "These files are out of sync". The plan's History entry claims `prism:check` was green — it was not green after Eli's doc commit.
- **Suggested fix:** Run `pnpm prism:build` from the repo root. This propagates the canonical change to all three platform mirrors. Then confirm `pnpm run prism:check` is fully green before opening the PR.

### Minor: unsafe `as` cast on `flagTicketSystem`

- **Severity:** `minor`
- **Status:** `fixed`
- **Fixed in:** `PRISM-250: Fix Briar review issues — mirrors, unsafe cast, error message` (review-fix commit)
- **File:** `scripts/ai-skills/init.ts:167`
- **Problem:** `parseFlag` returns `string | null`. The result is cast with `as "linear" | "github-issues" | null`, widening the raw string to a union of literals before it's validated. TypeScript treats the cast as authoritative — it will not warn if an arbitrary string passes through. The explicit three-branch guard below (lines 178–185) catches invalid values at runtime, so this is not a correctness bug, but the `as` cast bypasses compile-time safety that a narrowing pattern would preserve.
- **Suggested fix:** Accept the `string | null` return, validate against the union, then assign the narrowed value. Example: `const raw = parseFlag(argv, "ticket-system"); if (raw !== null && raw !== "linear" && raw !== "github-issues") { throw ... }; const flagTicketSystem = raw as "linear" | "github-issues" | null;` — or restructure so the cast happens after the validation block has already narrowed the type. Low risk given the guard, but the pattern sets a precedent for init clones.

### Cleaner-path: `resolveRequired` error leaks prompt hint text

- **Severity:** `minor`
- **Status:** `fixed`
- **Fixed in:** `PRISM-250: Fix Briar review issues — mirrors, unsafe cast, error message` (review-fix commit)
- **File:** `scripts/ai-skills/init.ts:147`
- **Problem:** When a TTY user enters an empty answer, `resolveRequired` throws `${prompt.trim()} is required`, surfacing the prompt's `(e.g. ...)` hint in the error — e.g. "Project name (e.g. ACME) is required". The hint is for guiding input, not for error messages.
- **Suggested fix:** Added a `fieldName` optional parameter to `resolveRequired`. The empty-answer error now uses `fieldName ?? --${flagName}` so it reads cleanly (e.g. "Project name is required") without the `(e.g. ...)` hint.

---

## Acceptance Criteria

### Behavioral

- [x] Given a repo with no PRISM config file, When the consumer runs `npx @huntermcgrew/prism init` and answers the prompts, Then a config file is written and the run reports success (REQ-1)
- [x] Given the consumer chooses GitHub issues as their ticket system during init, When the config is written, Then the saved config records GitHub issues as the tracker and does not invent a Linear team (REQ-2)
- [x] Given init has already been run for a repo, When the consumer runs init again, Then it refuses and tells them to edit or remove the existing config rather than overwriting it (REQ-3)
- [x] Given init has been run, When the consumer runs `npx @huntermcgrew/prism adopt`, Then adopt succeeds and does not stop on a missing config (REQ-1)
- [x] Given init has NOT been run, When the consumer runs adopt, Then adopt stops with a message telling them to run init first (REQ-4)
- [x] Given a scripted/CI run with no interactive terminal, When the consumer runs init with the required values supplied as flags, Then the config is written without prompting; and When a required value is missing, Then init stops and names the missing flag (REQ-5)

### Non-behavioral

- [x] `prism init` reuses the existing `detectStack` logic rather than duplicating stack-detection (REQ-6)
- [x] `prism init` reuses the existing `writeOnboardingConfig` function (validation + atomic write) rather than writing the config file directly (REQ-6)
- [x] The CLI help text lists `init` with a description, ordered before `adopt` (REQ-1)

### AC Adjustments

- 2026-06-24 — All AC verified-at-merge via the test suite (`init.test.ts`, `adopt.test.ts`, `cli.test.ts`, `onboarding-config.test.ts`); full `prism:check` green at close. No AC deferred: every item is unit-verifiable against the `runInit`/`runAdopt` cores and the CLI dispatcher. An end-to-end `npx` smoke against the *published* npm artifact is out of AC grain — tracked separately under the npm-publish tail (issue #248), not a blocker for this close.

### AC Sync Log

| Date | Agent | Action | Plan | Linear |
| ---- | ----- | ------ | ---- | ------ |
| 2026-06-24 | Winston | AC verified-at-merge (all 9 checked); plan close | synced | N/A (GitHub issues) |

---

## Cleanup Items

---

## PR Readiness

- [x] No critical or major issues — all fixed
- [x] Types correct — no `any`, no unsafe `as` — `as` cast on `flagTicketSystem` removed; narrowing now follows validation
- [x] No stray console.logs or debug artifacts
- [x] Tests written for new logic and edge cases
- [x] All debugged issues resolved (no `open` entries)
- [x] Build passes — `prism:check` fully green (build sync + tsc + 371 tests + verify-manifest + crossref-lint). Last run: 2026-06-24 (post architect-doc mirror rebuild).
- [x] PR description up to date
- [x] Lasting decisions promoted to architect context — github-issues write-path capability recorded in `install-layout.md` § First-contact

**Last updated:** 2026-06-24 (Winston plan close)
