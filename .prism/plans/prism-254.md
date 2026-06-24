# Plan: PRISM-254

> Closed: 2026-06-23

## Ticket

https://github.com/HunterMcGrew/PRISM/issues/254

## Goal

Make optional config tokens (Slack channel) safe so cold `npx @huntermcgrew/prism init` → `adopt` completes with zero manual edits and no thrown errors.

---

## User Stories

- As a new consumer running `npx @huntermcgrew/prism init`, I want to skip the Slack channel prompt without errors, so that I can complete onboarding without any manual config edits.
- As a developer running `adopt` in a repo without `slackChannel` configured, I want skill substitution to succeed, so that missing optional tokens never crash the CLI.

---

## Design

Not Applicable

---

## Implementation Tasks

Tasks are sequenced: task 2 is the core fix and unblocks the guard test (task 4); tasks 1, 3, 5 are independent. Run task 4 last so the guard test validates the fixed token map. Verification command for all TypeScript/test changes: `pnpm run prism:test` (runs `tsx --test scripts/ai-skills/*.test.ts`). Full gate before PR: `pnpm run prism:check`.

### Clove (implementation)

1. **Wire the input side of the optional Slack prompt in `scripts/ai-skills/init.ts`.** Three coordinated edits in this one file:
   - **`InitAnswers` interface** (after line 42, the `defaultBranch?: string;` field): add `slackChannel?: string;`. It is optional — a cold `init` that skips the prompt leaves it absent.
   - **Flag parse** (in `runInitCli`, alongside the other `parseFlag` calls at lines 168–175): add `const flagSlackChannel = parseFlag(argv, "slack-channel");`. `parseFlag` already returns `null` when the flag is absent, which is the skip path — no required-value enforcement (Slack is optional).
   - **Interactive prompt + answers assembly** (in the `try` block, after the `githubRepo` resolution at line 266 and before the `answers` object at line 268): add an optional prompt that only fires interactively, mirroring the existing optional `linearWorkspace` pattern at lines 244–249:
     ```ts
     const slackChannel =
       flagSlackChannel ??
       (rl !== null
         ? ((await rl.question("Slack channel for standup summaries (optional, press Enter to skip): ")).trim() ||
           undefined)
         : undefined);
     ```
     Then add `slackChannel,` to the `answers: InitAnswers` object literal (lines 268–278).
   - **Thread it through `runInit`** (the `writeOnboardingConfig` call at lines 90–94): add `slackChannel: answers.slackChannel,` to the options object passed as the third argument. `writeOnboardingConfig` already forwards `options.slackChannel` to `toOnDiskConfig`, which at `onboarding-config.ts:194` only writes it when `length > 0` — so the write side is already correct; this task only feeds the input. An empty/skipped prompt yields `undefined` → omitted from disk (satisfies AC: "omitted from config.json, not written as empty string").
   - Verification: `pnpm run prism:test` plus `pnpm run prism:check-types`. Add/extend a case in `scripts/ai-skills/init.test.ts` asserting that `runInit` with `answers.slackChannel` absent produces a config with no `slackChannel` field, and with a non-empty `answers.slackChannel` produces a config carrying it. Model the assertion on the existing `init.test.ts` config-shape cases.

2. **Apply the core token-map fix in `scripts/ai-skills/lib/tokens.ts:162-164`.** Replace the conditional block:
   ```ts
   if (typeof config.slackChannel === "string") {
     tokenMap.set("SLACK_CHANNEL", config.slackChannel);
   }
   ```
   with the unconditional default:
   ```ts
   tokenMap.set("SLACK_CHANNEL", config.slackChannel ?? "");
   ```
   This is the root-cause fix — `SLACK_CHANNEL` is always in the map (empty string when the config omits it), so `substituteTokens` never throws on the `${SLACK_CHANNEL}` literal in `prism-standup-summary/shared.md:120`. Update the existing `tokens.test.ts:155` assertion `assert.equal(tokenMap.has("SLACK_CHANNEL"), false);` (in the "omits optional tokens" test) — that line now contradicts the fix. Change it to `assert.equal(tokenMap.get("SLACK_CHANNEL"), "");` (and adjust the test name if it now over-claims). Verification: `pnpm run prism:test`. Blocks task 4.

3. **Add the empty-channel routing gate in `.prism/references/standup-summary/phases.md:181` (Phase 7.1).** Path note: this is the canonical routing seam — the standup skill externalized its phase bodies to this reference (`shared.md:137` instructs reading it). References are copied verbatim by the build (`generate-skills.ts:353` `fs.cp`), never token-substituted, so `${SLACK_CHANNEL}` here is a runtime literal Lilac reads — editing this file is the right and only place for the routing change. Replace the current line 181:
   > Ask: "Post to `${SLACK_CHANNEL}`, or would you rather paste it yourself?" (If no Slack MCP was found during detection, skip straight to the paste path and tell the user why.) If the user names a different channel ("post to #planning"), use that channel instead — default is `${SLACK_CHANNEL}`, never inferred. If the user switched channels, loop back to the channel-resolution step in [`./slack-mcp.md`](./slack-mcp.md) to resolve the new channel's ID.

   with a version that gates on empty `${SLACK_CHANNEL}` first, then asks the post-vs-paste question only when a channel is configured:
   > If `${SLACK_CHANNEL}` is empty (no channel configured at install) or no Slack MCP was found during detection, skip the post path entirely — go straight to the paste path (step 7.5) and tell the user once why ("no Slack channel is configured, so here's a pasteable standup"). Never auto-post and never ask the post-vs-paste question in this case.
   >
   > Otherwise, ask: "Post to `${SLACK_CHANNEL}`, or would you rather paste it yourself?" If the user names a different channel ("post to #planning"), use that channel instead — default is `${SLACK_CHANNEL}`, never inferred. If the user switched channels, loop back to the channel-resolution step in [`./slack-mcp.md`](./slack-mcp.md) to resolve the new channel's ID.

   This is Hunter's product call: empty = no channel configured = pasteable block only. The paste path already exists at lines 200–207 (step 7.5), so the gate routes into existing behavior. Content-only change to a reference — no build effect and no token substitution applies to it, so there is nothing to compile; verify by re-reading the edited Phase 7.1 to confirm the gate reads cleanly and the paste-path reference (7.5) is intact. Note: `phases.md` is canonical source under `.prism/references/` — it is NOT regenerated by `pnpm prism:build` (the build copies references verbatim, it does not rewrite them), so no rebuild step is needed for this edit.

4. **Add the guard test as a new file `scripts/ai-skills/optional-token-coverage.test.ts`** (top-level `scripts/ai-skills/`, not `lib/` — `prism:test` globs `scripts/ai-skills/*.test.ts`). The test is the regression backstop for the whole class of cold-start token bugs. Structure (model imports and the `tsx --test` / `node:assert/strict` idiom on the existing `tokens.test.ts`):
   - **Build the minimal valid init config** — exactly what `init` writes when every optional field is skipped. Inline it as a `PrismConfig` literal:
     ```ts
     const MINIMAL_INIT_CONFIG: PrismConfig = {
       org: "ACME",
       project: "WIDGET",
       ticketPrefix: "WGT",
       ticketSystem: { kind: "github-issues" },
       github: { owner: "acme", repo: "widget" },
       defaultBranch: "main",
     };
     ```
     (No `slackChannel`, no `linearWorkspace`/`teamKey` — this is the cold-`init`-with-Slack-skipped shape. `github.owner`/`repo` are always written by `init`, so they belong in the minimal config.)
   - **Scan surface — mirror what `substituteTokens` actually processes.** For every skill directory under `.ai-skills/skills/`, read `shared.md` (always present) plus any of `claude.md` / `codex.md` / `cursor.md` that exist. Concatenate per skill. Do NOT scan `references/` — those are copied verbatim (`generate-skills.ts:353`) and contain shell-variable `${...}` references that are not build tokens; scanning them would false-positive. (Rationale to put in a file-level JSDoc: the scan must match the real substitution surface so it neither misses a token nor flags a runtime shell var.)
   - **Assertion** — build the token map once (`const tokenMap = deriveTokenMap(MINIMAL_INIT_CONFIG);`), then for each skill's concatenated content call `substituteTokens(content, tokenMap)` inside `assert.doesNotThrow(...)`, naming the skill in the assertion message so a failure points at the offending skill. Because `substituteTokens` throws `Unknown token ${X}` on the first unmapped token, a new optional token added to skill content without a default in `deriveTokenMap` makes this test fail deterministically — which is the class-level guarantee the AC requires.
   - Verification: `pnpm run prism:test`. This test must pass only after task 2 lands (the empty-string default is what lets the `${SLACK_CHANNEL}` reference in `shared.md:120` resolve). Run after task 2.

5. **Commit the version bump to `0.6.0` in `package.json`** as its own `chore:` commit, matching the established convention. The prior unit shipped `0.5.1` as a standalone `chore: bump version to 0.5.1 ...` commit (`a4a4e64`) — committing the bump to git (rather than leaving it to `npm version` at publish) prevents git↔npm version drift. Edit `package.json` `"version"` field from `"0.5.1"` to `"0.6.0"`. Commit message: `chore: bump version to 0.6.0 for optional-token cold-start fix`. Hunter still runs `npm publish` at release; this task only commits the bump so the tree's version matches what gets published. No build/test effect — verify the field reads `"0.6.0"`. Independent of tasks 1–4; do it last so the bump rides the completed work.

---

## Decisions

- `SLACK_CHANNEL` is an optional token — it has valid semantic meaning when absent (no Slack integration configured). The fix sets it unconditionally to an empty string rather than leaving it unmapped, which keeps `substituteTokens` from throwing while preserving the "no channel" state for downstream routing.
  - → promoted to .prism/architect/_toolkit/install-layout.md (§ Optional tokens must default in `deriveTokenMap` — generalizes to the whole optional-token class, not just `SLACK_CHANNEL`)
- Lilac's empty-channel path routes to pasteable-block output (existing behavior) rather than auto-posting, making the empty string a first-class state rather than an error condition.
  - → no promotion needed (Lilac-specific routing tactic; the empty-string-as-first-class-state principle is captured in the install-layout § above via the `SLACK_CHANNEL` example, and the routing itself lives in `phases.md` Phase 7.1)
- A guard test scanning all shipped skill content for `${TOKEN}` references against a minimal-config token map is the missing gate that let this bug (and the prior two cold-start bugs) ship. It belongs in `scripts/ai-skills/` alongside the token machinery it validates.
  - → promoted to .prism/architect/_toolkit/install-layout.md (§ Optional tokens must default — the guard test and its scan-surface rationale are documented as the class-level backstop)
- **Routing-seam path confirmed: `.prism/references/standup-summary/phases.md:181`, NOT `.ai-skills/skills/prism-standup-summary/`.** The standup skill externalized its phase bodies to a reference (per `shared.md:137`), so the post-vs-paste question Lilac asks lives in the reference, not the skill body. Sasha's line number (181) was correct; the path needed pinning down. At adopt-time, `syncOptionalSkillPayloads` copies skill `references/` payloads verbatim via `fs.cp` (no `substituteTokens` call) — `${SLACK_CHANNEL}` in `phases.md` is a runtime literal Lilac resolves, not a token the adopt-time build substitutes. The PRISM maintainer's own build (`build.ts` → `copyContentToPlatformDir`) does substitute `.prism/references/` when writing to platform dirs (`.claude/`, `.codex/`, `.cursor/`) — that is a separate pass against the dogfood config, not the consumer adopt-time path.
  - → promoted to .prism/architect/_toolkit/install-layout.md (§ Two substitution passes, two surfaces — the build-vs-adopt substitution asymmetry generalizes to all content; the standup-specific path stays ticket-local)
- **Guard-test scan surface = `shared.md` + platform body files (`claude.md`/`codex.md`/`cursor.md`) per skill; skill `references/` payloads excluded.** This mirrors exactly what `substituteTokens` processes at adopt-time (`buildSkillMarkdown` assembles frontmatter + shared + platform body, then substitutes; `syncOptionalSkillPayloads` copies the `references/` payload via `fs.cp` with no substitution). Scanning skill references would false-positive on shell-variable `${...}` usages that are never build tokens (e.g. `${GITHUB_OWNER}` inside bash blocks in `fetch.md`) and would not reflect the crash-producing substitution surface. Confirmed: the only `${SLACK_CHANNEL}` in any `shared.md` is `prism-standup-summary/shared.md:120`.
  - → promoted to .prism/architect/_toolkit/install-layout.md (§ Two substitution passes — the scan-surface rationale follows directly from the substitution-asymmetry fact now documented there)
- **Version bump to 0.6.0 is a Clove task (committed `chore:` commit), not a Hunter-at-publish step.** The prior unit committed `0.5.1` as a standalone `chore:` commit (`a4a4e64`) rather than relying on `npm version` at publish; committing the bump to git prevents git↔npm version drift. Hunter still runs `npm publish` at release. Considered: leaving the bump to `npm version` at publish — rejected because it reopens the drift the handoff explicitly flagged.
  - → no promotion needed (release tactic specific to this ticket; the commit-the-bump convention is established by the `a4a4e64` precedent and self-evident from git history)

---

## History

- 2026-06-23 [hunter/thr-254-optional-token-cold-start-fix]: Plan created; ticket filed as GitHub issue #254. Third cold-start bug in the consumer adoption path — `slackChannel` absent crashes `substituteTokens` with Unknown token.
- 2026-06-23 [hunter/thr-254-optional-token-cold-start-fix]: Sasha confirmed root cause — `deriveTokenMap` conditionally omits `SLACK_CHANNEL` when `slackChannel` is absent from config; `init` never writes it; `adopt` throws at skill-assembly time on `substituteTokens`. `GITHUB_OWNER`/`GITHUB_REPO` are not at risk (`init` requires them). `LINEAR_*` tokens not referenced in any `shared.md`. Fix: unconditional `SLACK_CHANNEL` default of `""` in `deriveTokenMap`; guard test to cover the class.
- 2026-06-23 [hunter/thr-254-optional-token-cold-start-fix]: Winston built five Clove tasks to the detail bar. Confirmed routing seam is `.prism/references/standup-summary/phases.md:181` (skill externalized phase bodies to the reference); scoped guard-test scan to `shared.md`+platform bodies (references excluded — verbatim copy, not substituted); version bump 0.6.0 set as a committed Clove `chore:` task per the prior unit's convention.
- 2026-06-23 [hunter/thr-254-optional-token-cold-start-fix]: Clove implemented all five tasks. Canonical source for phases.md confirmed as `.prism/references/standup-summary/phases.md` (no `.ai-skills/` mirror). Guard test proved red without task 2's fix, green after. `pnpm run prism:check` passed; 377 tests, 0 failures.
- 2026-06-23 [hunter/thr-254-optional-token-cold-start-fix]: Briar self-review complete. No critical/major issues. Three minors filed: plan Decision wording on reference substitution (inaccurate — build.ts does token-substitute references), missing AC citations (added), docs/parameterization.md staleness (SLACK_CHANNEL now always present in token map). Build and tests confirmed green.
- 2026-06-23 [hunter/thr-254-optional-token-cold-start-fix]: Clove closed all three Briar minors. Definitively traced two substitution passes: build.ts substitutes `.prism/references/` when mirroring to platform dirs (dogfood config); adopt-time `syncOptionalSkillPayloads` copies skill `references/` payloads via `fs.cp` with no substitution. Guard test exclusion confirmed correct — it mirrors the adopt-time crash surface. Updated plan Decisions to accurately describe both passes; updated `docs/parameterization.md` to note `${SLACK_CHANNEL}` is always present in the token map.
- 2026-06-23 [hunter/thr-254-optional-token-cold-start-fix]: Clove applied Eric's PR-review minor: guard-test JSDoc line 16 changed from "...the plan's AC requires" to "...this guard provides" — removes session-context leak per writing-voice.md.
- 2026-06-23 [hunter/thr-254-optional-token-cold-start-fix]: Winston ran plan close on the final PR branch (PR #255, pre-merge). Promoted two decisions to `install-layout.md` (build-vs-adopt substitution asymmetry; optional-token-must-default invariant + guard test), source-verified against `build.ts:207`, `generate-skills.ts:348-353/130`, `tokens.ts:162`. Verdict gate applied to all six Decisions; plan marked closed.

---

## Debugged Issues

### `Unknown token ${SLACK_CHANNEL}` crash on cold `adopt`

- **Status:** `fixed`
- **Fixed in:** `hunter/thr-254-optional-token-cold-start-fix` — `deriveTokenMap` now sets `SLACK_CHANNEL` unconditionally to `""` via `config.slackChannel ?? ""`
- **Severity:** High
- **Confidence:** `High` (Confirmed root cause + deterministic repro)
- **Environment:** Consumer repo immediately after `npx @huntermcgrew/prism init` with no `slackChannel` in config, followed by `adopt`
- **File:** `scripts/ai-skills/lib/tokens.ts:162-164` (conditional set), `scripts/ai-skills/lib/tokens.ts:192-196` (throw site); proximate trigger in `scripts/ai-skills/generate-skills.ts:130` (`buildSkillMarkdown` → `substituteTokens`) and `.ai-skills/skills/prism-standup-summary/shared.md:120` (token reference)
- **Root cause:** `[Confirmed]` — `deriveTokenMap` sets `SLACK_CHANNEL` only when `config.slackChannel` is a string (`if (typeof config.slackChannel === "string")`). `init.ts` never prompts for `slackChannel` and `onboarding-config.ts` only writes `slackChannel` to disk when a non-empty string is provided (line 194: `options.slackChannel.length > 0`). A cold `init` therefore produces a config with no `slackChannel` field. When `adopt` runs, `refreshPlatformSkills` calls `generatePlatformSkills` which calls `buildSkillMarkdown` which calls `substituteTokens` on the assembled `shared.md` content for every skill including `prism-standup-summary`. `shared.md:120` contains the literal `${SLACK_CHANNEL}`, which is not in the token map, so `substituteTokens` throws `Unknown token ${SLACK_CHANNEL}`.
- **Steps to Reproduce:**
  1. Run `npx @huntermcgrew/prism init` in a fresh consumer repo, supplying project/prefix/ticket-system/github-owner/github-repo but pressing Enter (skipping) at any Slack prompt (or run non-interactively without `--slack-channel`)
  2. Confirm the written `config.json` has no `slackChannel` field
  3. Run `prism adopt` (or `npx @huntermcgrew/prism adopt`)
  4. Observe: throws `Unknown token ${SLACK_CHANNEL} in content near: ...` before any files are written
- **Expected behavior:** `adopt` completes with zero errors; Lilac's standup skill is installed with `${SLACK_CHANNEL}` substituted to empty string (or equivalent no-channel sentinel)
- **Actual behavior:** `adopt` throws during skill assembly, leaving the consumer in a half-initialized state
- **Refuted hypotheses:**
  - "References files (`phases.md`, `fetch.md`, `slack-mcp.md`) also throw on `${GITHUB_OWNER}` / `${GITHUB_REPO}`" — refuted. The `references/` directory is copied verbatim via `fs.cp` (no `substituteTokens` call) in `generate-skills.ts:353`. The `${GITHUB_OWNER}/${GITHUB_REPO}` occurrences in those files are shell variable references inside bash code blocks, resolved at Lilac's runtime by the shell, not by the build's substitution layer.
  - "`GITHUB_OWNER` / `GITHUB_REPO` could throw for a config missing `github.*`" — refuted for the `init` path. `init.ts` requires `--github-owner` and `--github-repo` (lines 252-267) and `onboarding-config.ts` unconditionally writes `github.owner` and `github.repo` (lines 181-182). Both tokens are always present after a valid `init`.
  - "`LINEAR_WORKSPACE` or `LINEAR_TEAM_KEY` could throw for a github-issues config" — refuted for `shared.md` content. Grepping all `skills/*/shared.md` files found zero references to `${LINEAR_WORKSPACE}` or `${LINEAR_TEAM_KEY}`. Those tokens appear in `skills-ecosystem.md` references via `${TICKET_TRACKER}` which is always-set (derived unconditionally at `tokens.ts:149`).
- **Recommended fix:** In `deriveTokenMap` (`scripts/ai-skills/lib/tokens.ts`), set `SLACK_CHANNEL` unconditionally to an empty string when `config.slackChannel` is absent, replacing the current conditional block (lines 162-164) with `tokenMap.set("SLACK_CHANNEL", config.slackChannel ?? "")`. This keeps `substituteTokens` from throwing while preserving the "no channel configured" state (empty string) for Lilac's Phase 7.1 routing logic.
- **Suggested tests:**
  - Guard test in `scripts/ai-skills/tokens.test.ts` (or a new `scripts/ai-skills/optional-token-coverage.test.ts`): build a minimal valid config matching exactly what `init` writes when all optional fields are skipped (no `slackChannel`, `ticketSystem.kind: "github-issues"`), call `deriveTokenMap`, then call `substituteTokens` over the assembled content of every `skills/*/shared.md` file and assert no throw. Structured to fail deterministically when a new optional token is added to skill content without a default in `deriveTokenMap`.
  - Existing `tokens.test.ts`: add a test asserting `deriveTokenMap` with no `slackChannel` produces a map that contains `SLACK_CHANNEL` with value `""`.
- **Missing evidence:** None — root cause is fully confirmed. The empty-string value `""` substituted into Lilac's Phase 7.1 ask (`"Post to \`\`, or would you rather paste it yourself?"`) produces slightly awkward copy, but the routing falls through to paste correctly (the Phase 7.5 paste path triggers on empty/no channel — confirmed by reading `phases.md:181,202`).
- **Linear:** `N/A` (GitHub Issues)

---

## Review Issues

### Decision inaccuracy: "references are never token-substituted"

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `.prism/plans/prism-254.md` (Decisions section)
- **Problem:** The Decision bullet said "References are copied verbatim by the build (`generate-skills.ts:353` `fs.cp`) and never token-substituted." In fact, `build.ts` lists `"references"` in `COPIED_CONTENT_AREAS` and calls `copyContentFileWithSubstitution` on every file in it (line 207) — so platform-copy references (`.claude/`, `.codex/`, `.cursor/`) do receive token substitution against the dogfood config.
- **Fixed in:** Decision bullets updated to distinguish the two passes: at adopt-time `syncOptionalSkillPayloads` copies skill `references/` via `fs.cp` (no substitution — the crash-producing path); the PRISM maintainer's own build substitutes `.prism/references/` when mirroring to platform dirs (separate pass, different surface). The guard test exclusion is correct — it mirrors the adopt-time crash surface, not the maintainer build surface.

### AC citations missing

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `.prism/plans/prism-254.md` (Acceptance Criteria section)
- **Problem:** Per `acceptance-criteria.md`, every AC item must end with a `(US-N)`, `(Debug-N)`, or `(REQ-N)` citation. All 7 AC items lacked citations.
- **Fixed in:** Citations added to all 7 AC items by Briar.

### docs/parameterization.md staleness

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `docs/parameterization.md:74`
- **Problem:** The `${SLACK_CHANNEL}` row in the "All tokens" table implied the token is conditionally present. After the fix, `SLACK_CHANNEL` is always emitted by `deriveTokenMap` (empty string default).
- **Fixed in:** Row updated to state "Always present in the token map; defaults to `""` when `slackChannel` is absent from config."

### Guard-test JSDoc session-context leak

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `scripts/ai-skills/optional-token-coverage.test.ts:16`
- **Problem:** File-level JSDoc ended with "...the class-level guarantee the plan's AC requires" — references the branch plan, meaningless to a cold reader (writing-voice.md § Anti-pattern: Session-context leakage).
- **Fixed in:** Changed to "...the class-level guarantee this guard provides." — describes the guard's own contract.

---

## Acceptance Criteria

### Behavioral

- [ ] Given a consumer with no `slackChannel` in config, When `npx @huntermcgrew/prism init` is run and the Slack prompt is skipped (Enter), Then `adopt` completes with zero thrown errors and zero manual edits required. (US-1)
- [ ] Given `init` is run interactively, When the user presses Enter at the Slack channel prompt, Then `slackChannel` is omitted from `config.json` (not written as empty string). (US-1)
- [ ] Given `init` is run non-interactively, When `--slack-channel` flag is omitted, Then the same zero-error adoption path holds. (US-2)
- [ ] Given `SLACK_CHANNEL` resolves to empty string after substitution, When Lilac's standup skill runs, Then it returns a pasteable block and does NOT attempt to post to Slack. (Debug-1)

### Non-behavioral

- [ ] Guard test exists in `scripts/ai-skills/` and passes: scans all shipped skill content for `${TOKEN}` patterns, asserts the token map built from a minimal valid `init` config (no slackChannel) covers every reference. (Debug-1)
- [ ] Guard test is structured to catch the class of bug: a new optional token added to skill content without a default in `deriveTokenMap` causes the test to fail. (Debug-1)
- [ ] Version bumped to 0.6.0. (REQ-1)

### AC Sync Log

| Date | Agent | Action | Plan | Linear |
| ---- | ----- | ------ | ---- | ------ |
| 2026-06-23 | Nora | Seeded AC from agreed four-part design | created | N/A (GitHub Issues) |
| 2026-06-23 | Briar | Added citations to all 7 AC items per acceptance-criteria.md rule | updated | N/A (GitHub Issues) |

---

## Cleanup Items

_None yet._

---

## PR Readiness

- [x] No critical or major issues
- [x] Types correct — no `any`, no unsafe `as`
- [x] No stray console.logs or debug artifacts
- [x] Tests written for new logic and edge cases (2 in `init.test.ts`, 1 updated in `tokens.test.ts`, 1 guard test in `optional-token-coverage.test.ts`)
- [x] All debugged issues resolved (no `open` entries)
- [x] Build passes — last run: 2026-06-23 (`pnpm run prism:check` passed, 377 tests, 0 failures)
- [x] All 3 minor review issues closed — confirmed by Briar follow-up pass (2026-06-23)
- [x] PR description up to date
- [x] Lasting decisions promoted to architect context (if applicable) — `install-layout.md` § Two substitution passes + § Optional tokens must default

**Last updated:** 2026-06-23 (plan closed on PR `#255` branch, pre-merge)
