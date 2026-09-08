# Plan: issue-488

## Ticket

https://github.com/HunterMcGrew/PRISM/issues/488

## Goal

Add two opt-in author-side git gates to PRISM — a commit-time cleanup pass and a push-time lint/format verification — delivered as agent-harness hooks on Claude Code, Codex, and Cursor, with an always-on prose step in the shipping flow so every host carries the discipline even where the hook is not registered.

---

## User Stories

- As an author persona (Clove, Eli, Sage, Reese), I want to be prompted to re-read my staged diff once before each commit, so that readability, reuse, and maintainability problems are fixed while the diff is still mine.
- As a team lead, I want an agent's `git push` to fail when lint or the formatter check fails, so that a broken tree never burns a CI cycle or a reviewer's time.
- As a consumer, I want both gates off until I turn them on in `.ai-skills/config.json`, so that a `prism update` never surprises me with a new deny.

---

## Design

Not applicable — no UI.

---

## Implementation Tasks

Two phases. Phase A ships Claude Code end to end and is a complete PR on its own. Phase B adds Codex and Cursor delivery on top of Phase A's runtime and can ship as a second PR on the same issue (`PRISM-488 followup:` subject). Every task is `[AFK]` unless tagged.

Governing docs the write gate will ask for — read them once at session start: `.prism/architect/_toolkit/install-layout.md` § Hook runtime, `.prism/architect/_toolkit/spec-editing.md`, `.prism/architect/guides/writing-a-plan.md`, `.prism/architect/guides/writing-an-adr.md`, `.prism/architect/_toolkit/documentation.md`, `.prism/architect/_toolkit/architecture-doc-shape.md`. The gate holds a write until its route's docs are read; a `cd … && cat` does not credit — run bare `cat <path>` or the Read tool.

### Clove (implementation) — Phase A: runtime, Claude delivery, prose, docs

**A1. Extract the shell splitter to `scripts/ai-skills/hooks/lib/shell.mjs`.**
- Move `splitShellSegments` (`hook.mjs:301`), `readHeredocDelimiter` (`:406`), and `skipHeredocBodies` (`:443`) with their JSDoc, unchanged, into the new file. Export all three. Header: the three-line `@prism-hook-runtime` marker block copied verbatim from `lib/match.mjs:1-3`, then a file-level JSDoc: "Shell command segmentation shared by the architect write gate and the git gates. Zero-dependency `.mjs` — see `hook.mjs` for why."
- Add `lib/shell.d.mts` declaring the three signatures (copy the JSDoc `@param`/`@returns` types).
- In `hook.mjs`: delete the three functions; add `import { splitShellSegments } from "./lib/shell.mjs";` beside the existing `./lib/match.mjs`-style imports. `hook.d.mts` is unchanged (none of the three was exported).
- The splitter's heredoc, `&&`, `|`, and backslash-newline branches were unreachable behind `SHELL_READ_SAFE_CHARACTERS` (JSDoc at old `hook.mjs:272-283`). Git-gates is their first live caller; update that JSDoc paragraph to say so and drop the "unreachable today" wording.
- Verify: `pnpm run prism:check-types` and `node --test scripts/ai-skills/hook-gate.test.ts` both green (the existing `parseShellReadTargets` tests exercise the moved code through `hook.mjs`).

**A2. Add `emitAllow` to `scripts/ai-skills/hooks/harnesses.mjs`** (after A1; parallel with A3).
- Extend the `HarnessSpec` typedef with `@property {(reason: string) => unknown} emitAllow`.
- `claude`: `emitAllow: (reason) => ({ hookSpecificOutput: { hookEventName: "PreToolUse", permissionDecision: "allow", permissionDecisionReason: reason } })`, placed directly after `emitDeny`.
- `cursor` and `codex`: `emitAllow: () => null` for now (Phase B fills them in). Comment: same reasoning as their `emitDeny`.
- Mirror in `harnesses.d.mts`.

**A3. Export `pruneStaleRouteState` from `scripts/ai-skills/hooks/architect-route.mjs` with a prefix parameter** (parallel with A2).
- Current signature reaps `architect-route-state.` files; add a second parameter `filePrefix = "architect-route-state."` and export the function. Every existing caller passes nothing, so behavior is unchanged. Update `architect-route.d.mts`.
- Verify: `node --test scripts/ai-skills/architect-route.test.ts`.

**A4. Export three scaffolding helpers from `hook.mjs`** (parallel with A2–A3): `isForeignPayload` (`:1046`), `parseEventFlag` (`:1461`), `readStdin` (`:1471`). Add `export` and the matching declarations to `hook.d.mts`. No behavior change.

**A5. Write `scripts/ai-skills/hooks/git-gates.mjs` and `git-gates.d.mts`** (after A1–A4).

Header: shebang + the three-line marker block + a file-level JSDoc stating the contract: two `PreToolUse` gates on the shell tool, opt-in per consumer via `config.json#hooks`, exit 0 on every path, one deny at most per invocation. Imports: `node:child_process` (`spawnSync`), `node:fs/promises`, `node:path`, `node:url`; `./harnesses.mjs` (`HARNESSES`, `resolveListedToolKind`); `./hook.mjs` (`resolveHarnessFromArgv`, `isForeignPayload`, `parseEventFlag`, `readStdin`); `./architect-route.mjs` (`MAX_EMISSION_BYTES`, `pruneStaleRouteState`); `./lib/shell.mjs` (`splitShellSegments`).

Exports: `detectGitSegments(command)`, `findConfigRoot(startDir)`, `runGitGatesArm(tool, spec, rawStdin, env = process.env)`. `main()` and the `isEntryPoint` guard copy the shape at `hook.mjs:1419-1502`, dispatching only on `--event=PreToolUse` (any other event → exit 0, no output).

`runGitGatesArm` flow — each numbered step returns `null` (write nothing) on its stated exit:
1. `env.PRISM_HOOK_DISABLE === "1"` or `env.PRISM_HOOK_DENY_DISABLE === "1"` → null. (`main()` also checks `PRISM_HOOK_DISABLE` before reading stdin, mirroring `hook.mjs:1420`.)
2. `JSON.parse(rawStdin)`; parse failure → null. `isForeignPayload(tool, payload)` → null. `resolveListedToolKind(spec, payload.tool_name) !== "shell"` → null. `spec.scopeId(payload)` null → null.
3. `configRoot = await findConfigRoot(payload.cwd ?? process.cwd())` — walk up until a directory contains `.ai-skills/config.json`; none → null. Do **not** reuse `findRepoRoot` (it keys on `architect/manifest.json`, a different feature's file). Read and parse the config; parse error → one stderr line `git-gates: .ai-skills/config.json is not valid JSON — gates off` and null. `config.hooks` not an object → null.
4. `command = spec.commandOf(payload)` — for Phase A read `payload.tool_input?.command` directly (Phase B adds the accessor to `HarnessSpec`). `segments = detectGitSegments(command)`.
5. If `hooks.commitCleanupPass === true` and `segments.includes("commit")` → run the commit gate (A5-C). If it returns a deny, return it immediately — a `git commit && git push` one-liner surfaces the commit hold first; the retry evaluates the push.
6. If `hooks.pushVerification === true` and `segments.includes("push")` → run the push gate (A5-P) and return its result.
7. Otherwise null. Wrap 2–6 in one `try/catch`: any throw → stderr `git-gates failed: <message>`, return null.

`detectGitSegments(command)` — returns an array of `"commit" | "push"` in order, one per matching segment:
- `splitShellSegments(command)` with no pre-filter.
- Per segment: drop leading `NAME=value` tokens and a leading `env`; the head token must be `git` or end in `/git` (or `\git`); walk the remaining tokens skipping `-C <dir>`, `-c <k=v>`, `--git-dir=…`, `--work-tree=…`, and any other `-`-prefixed token; the first bare token is the subcommand.
- `commit` counts with any flags (`--amend`, `-a`, `--no-edit` all included — an amend rewrites content the pass should see). `push` counts with any flags except `--delete`/`-d` (nothing to verify). Everything else (`merge`, `rebase`, `cherry-pick`, `revert`, `log`, `gh pr create`, `echo "git commit"`) does not count.
- The HEREDOC commit form from `.prism/rules/git-conventions.md` § Formatting (`git commit -m "$(cat <<'EOF' … EOF)"`) is one double-quoted token to the splitter, so the head/subcommand read is unaffected. An unquoted heredoc body is skipped by `skipHeredocBodies`. Accepted gap, documented in the function's JSDoc: a `"` inside a heredoc body closes the splitter's quote early and the remainder tokenizes as commands; only a body line beginning with `git push` could trip a spurious check, and a spurious push check is non-blocking unless lint actually fails.

**A5-C. Commit gate.**
- `sha = spawnSync("git", ["rev-parse", "HEAD"], { cwd: configRoot, encoding: "utf8", timeout: 5000, windowsHide: true })`; non-zero status or error → key `"unborn"` (a first commit is still gated once).
- State file `.prism/git-gates-state.<safeScopeId>.json` under `configRoot`, shape `{ "cleanupPassSeen": ["<sha>", …] }`. `safeScopeId` = the scope id with every character outside `[A-Za-z0-9._-]` replaced by `_` (same rule `architect-route.mjs` uses for its state filename — reuse its helper if exported, else copy the one-liner). Atomic write: `<file>.tmp` then `fs.rename` (copy the pattern at `architect-route.mjs:397-413`). Unreadable/unparseable → treat as empty. Call `pruneStaleRouteState(configRoot, "git-gates-state.")` first.
- `sha` already in `cleanupPassSeen` → null (allow).
- Else append `sha`, **save, then deny**. Save-before-deny is load-bearing: a crash between deny and retry fails open, never loops. If the save throws (read-only `.prism/`) → stderr `git-gates: could not record cleanup-pass state — commit allowed` and null.
- Deny reason (exact text, `spec.emitDeny(reason)` serialized with `JSON.stringify`):
  ```
  Cleanup pass before this commit (once per HEAD — the retry of this same command goes through).
  Re-read the diff with the three lenses, fix what is in the local frame, log the rest under ## Cleanup Items:
  cat .prism/references/cleanup-pass.md
  git diff --cached
  ```

**A5-P. Push gate.**
- For each of `config.commands?.lint`, then `config.commands?.format`: skip when not a non-empty string. Run `spawnSync(cmd, { shell: true, cwd: configRoot, encoding: "utf8", timeout: hooks.pushVerificationTimeoutMs ?? 120000, maxBuffer: 8 * 1024 * 1024, windowsHide: true })`. `shell: true` is required — `pnpm` is a `.cmd` shim on Windows. Sequential, so a deny names exactly one command.
- `status === 0` → next command. All pass → null.
- Non-zero `status` → deny with reason:
  ```
  Push verification failed: `<cmd>` exited <status>. Fix, commit the fix, then retry the push.
  --- last lines of output ---
  <tail of stdout + stderr, trimmed to fit MAX_EMISSION_BYTES>
  ```
- `result.error` (`ETIMEDOUT`, `ENOENT`, anything) → **fail open with an announcement**: write `git-gates: \`<cmd>\` <timed out after Nms | could not start (<code>)> — push allowed, run it yourself` to stderr and return `spec.emitAllow(sameLine)`; when `emitAllow` returns null (Phase A cursor/codex) return null. Rationale: a plain silent allow makes a broken lint command indistinguishable from a passing one.
- `pushVerification: true` with both commands unset → null (doctor warns in A9).

Verify A5 with the smoke commands in `## Verification` before moving on.

**A6. Register the hook** (after A5).
- `templates/install/.claude/settings.json`: append to `hooks.PreToolUse` a new entry
  ```json
  {
    "matcher": "Bash",
    "hooks": [
      {
        "type": "command",
        "command": "node \"$CLAUDE_PROJECT_DIR/.claude/hooks/git-gates.mjs\" --tool=claude --event=PreToolUse"
      }
    ]
  }
  ```
  Its own group, not a second command in the `Write|Edit|Bash` entry — that would spawn it on every edit. No `timeout` field: Claude Code's default for command hooks is 600 s (hooks reference § configuration), comfortably above `pushVerificationTimeoutMs`'s 120 s default, so the script's fail-open path decides, not the host.
- `.claude/settings.json` (PRISM's own): same entry with the path `$CLAUDE_PROJECT_DIR/scripts/ai-skills/hooks/git-gates.mjs`.

**A7. Delivery — `scripts/ai-skills/update.ts`** (after A5).
- `HOOK_RUNTIME_FILES` (`:1081`): add `"git-gates.mjs"` and `"lib/shell.mjs"`.
- `HOOK_RUNTIME_ENTRY_POINTS` (`:1089`): `["hook.mjs", "git-gates.mjs"]`.
- `HOOK_STATE_GITIGNORE_LINES` (`:1274`): add `".prism/git-gates-state.*.json"` and `".prism/git-gates-state.*.json.tmp"`. Update the JSDoc "two hook state-file globs" → "the hook state-file globs".
- `PRISM_HOOK_COMMAND_PATTERN` (`:1364`): `hook\.mjs` → `(?:hook|git-gates)\.mjs`. `isPrismOwnedHookEntry`/`mergeHookEventEntries` then claim the new entry on repeat runs with no further change.
- PRISM's own `.gitignore`: add the two globs after the existing `architect-route-state` lines.
- Verify: `node --test scripts/ai-skills/update.test.ts`.

**A8. Config schema and PRISM's own config** (parallel with A7).
- `.ai-skills/config.schema.json`, top-level `properties`, after `features`:
  ```json
  "hooks": {
    "type": "object",
    "description": "Opt-in git gates run by the hook runtime on the hosts that receive it. Absent means every gate is off. Not surfaced during init or onboarding — set by hand, like features.",
    "properties": {
      "commitCleanupPass": {
        "type": "boolean",
        "description": "Hold the first `git commit` on each HEAD until .prism/references/cleanup-pass.md has been read this session; the retry goes through."
      },
      "pushVerification": {
        "type": "boolean",
        "description": "Run commands.lint and commands.format before every `git push`; a non-zero exit denies the push with the output tail. An unset command is skipped; a timeout allows the push and says so."
      },
      "pushVerificationTimeoutMs": {
        "type": "integer",
        "minimum": 1000,
        "default": 120000,
        "description": "Per-command budget for pushVerification. Keep it below the host's own hook timeout (Claude Code: 600 s by default) so the script, not the host, decides the outcome."
      }
    }
  }
  ```
  `commands.format` is already documented as check mode ("Prettier --check, or equivalent") — no new slot. Append one sentence to its description: "Read by the push gate when hooks.pushVerification is on."
- `.ai-skills/config.json`: add `"hooks": { "commitCleanupPass": true, "pushVerification": true }` after `features`.
- `config-schema-validate.ts` type-checks listed properties automatically; no validator change. Verify: `pnpm run prism:test`.

**A9. Doctor — `scripts/ai-skills/doctor.ts`** (after A7).
- `HOOK_COMMAND_PATH_RE` (`:625`): `hook\.mjs` → `(?:hook|git-gates)\.mjs`.
- `readConsumerConfigSafely` (`:686`): widen the return type to `{ hosts?: unknown; hooks?: unknown; commands?: unknown } | null`.
- `checkHookRegistration` (`:726`), inside the `hosts.includes("claude")` branch: (a) mirror the "present but unregistered" warning at `:796-805` for `.claude/hooks/git-gates.mjs`; (b) after the existing reach `info`, push one more `info`: when `config.hooks` is absent → `Git gates are delivered and off — add a hooks block to .ai-skills/config.json (commitCleanupPass, pushVerification) to enable them.`; when present → `Git gates: commit cleanup pass <on|off>, push verification <on|off> (lint: <cmd|unset>, format: <cmd|unset>).`; (c) `pushVerification === true` with lint and format both unset → `warning`: `hooks.pushVerification is on but commands.lint and commands.format are both unset — the push gate can never deny.`
- Verify: `node --test scripts/ai-skills/doctor.test.ts`.

**A10. Write `.prism/references/cleanup-pass.md`** (parallel with A5). Full content:

```markdown
# Cleanup Pass

Read before every commit. The diff is complete and the code works; this pass asks whether it should be committed as written. It is a re-read, not a rewrite — minutes, not a session.

## Scope

Only the local frame, per `.prism/rules/code-standards.md` § Refactor scope: the changed lines, the functions containing them, helpers extracted from them, and files already in this ticket's diff. A finding outside the frame goes under `## Cleanup Items` in the branch plan as one line, never into this commit.

## Three lenses

Run `git diff --cached` and read it as a reviewer who did not write it.

1. **Readability** — Can each changed function be followed top to bottom without the conversation that produced it? Rename what only made sense mid-session. Apply the Delete Test from `.prism/rules/code-comments.md` to every comment in the diff: delete it mentally, and if the code reads the same, delete it for real. Comments that narrate the change ("moved from", "added to fix") go.
2. **Reusability** — Did the diff copy something that already existed? The self-review thresholds apply: identical logic over shared state at 2 sites, similar shape at 3 or more. A helper with one caller is not reuse; leave it inline. Duplication across the frame boundary is a Cleanup Item, not a refactor now.
3. **Maintainability** — Is anything in the diff scaffolding from the session? Debug output, commented-out code, a fallback bolted on for a case the fix should have absorbed, a test skipped to get green. Would a stack trace through this code name the right thing? Fix it in the frame or record it as a Cleanup Item.

## Exit

- Fixes inside the frame: apply them, re-run the verification scope, then commit.
- Findings outside the frame: one line each under `## Cleanup Items`.
- Nothing found: say so in one line and commit. A clean pass is a normal outcome.

Where the git-gates hook is registered, the first `git commit` on each HEAD is held until this file has been read; the retry goes through. Elsewhere the pass is yours to run.
```

Backticked rule paths only — no ADR links (ship-closure roots `scripts/ai-skills/hooks`, and the deny message names this file). `prism:build` auto-mirrors the seed twin; classify nothing (default bucket).

**A11. Shipping flow — `.prism/references/shipping-flow.md`** (parallel with A10).
- Insert a new step 2 and renumber the current 2–8 to 3–9:
  > 2. **Cleanup pass.** Before committing, re-read the diff through [`.prism/references/cleanup-pass.md`](cleanup-pass.md): three lenses over the local frame, findings beyond it to `## Cleanup Items`. Depth per persona is the "Cleanup pass" column above. Where the git-gates hook is registered, the first `git commit` on each HEAD is held until that file has been read this session; the retry goes through.
- Fix the two cross-references: line 9 `steps 1–6` → `steps 1–7`; line 52 (now step 6) `step 4 returned` → `step 5 returned` (three occurrences in that step and the following two), `step 7` → `step 8`.
- Append to the push step (now 7): "Where `hooks.pushVerification` is on in `.ai-skills/config.json`, the push first runs `commands.lint` and `commands.format` and is denied with the output tail on a non-zero exit. Step 1 already ran these, so a deny here means a fix-up after step 2 regressed one."
- Per-persona table: add a fourth column **Cleanup pass** — Clove: `Full pass: all three lenses over \`git diff --cached\`.`; Eli, Sage, Reese: `Cold re-read of the changed Markdown for session-context leakage per \`.prism/rules/writing-voice.md\` § Anti-pattern: Session-context leakage; one line.`
- Content-only; seed twin auto-mirrored.

**A12. Skill bodies** (parallel with A11).
- `.ai-skills/skills/prism-code-dev/shared.md:190`: in the Clove-row parenthetical, after `verification scope: …changed files;` add `cleanup pass: full;`. In `## Definition of Done` (`:222` onward) add the checklist line `- [ ] Cleanup pass run per \`.prism/references/cleanup-pass.md\` before each commit.`
- `.ai-skills/skills/prism-code-review-self/shared.md` § What to look for (`:235-249`): add one bullet `- The three cleanup-pass lenses (\`.prism/references/cleanup-pass.md\`) — readability, reuse, maintainability over the local frame. The author ran them before committing; you confirm they held.`
- Verify: `pnpm prism:build` (regenerates `.claude/.cursor/.agents` skill outputs; the 500-line body cap is asserted).

**A13. Verification-commands rule — canonical and curated twin** (parallel with A12).
- `.prism/rules/verification-commands.md`: after `## Verification Order`, add:
  ```markdown
  ## Git gates (`.ai-skills/config.json#hooks`)

  Two opt-in gates ride the hook runtime. `hooks.commitCleanupPass` holds the first `git commit` on each HEAD until `.prism/references/cleanup-pass.md` has been read; `hooks.pushVerification` runs `{{commands.lint}}` and `{{commands.format}}` before every `git push` and denies on a non-zero exit. `format` is the check-mode command for exactly this reason — the gate must never rewrite files. Both are off until set; `PRISM_HOOK_DISABLE=1` turns every hook off for a session.
  ```
- `templates/install/.prism/rules/verification-commands.md` is `curated` (hand-maintained — `seed-curation.json`); add the same section by hand. Verify: `diff` the two sections match.

**A14. Architect doc — `.prism/architect/_toolkit/install-layout.md` § Hook runtime** (parallel with A13). Every claim source-verified per `.prism/rules/architect-doc-verification.md`:
- Delivery path paragraph: "copies every module" already covers the new files; add "`hook.mjs` and `git-gates.mjs` are the two entry points and both get the executable bit."
- State file paragraph: add "`git-gates.mjs` keeps its own family beside it, `.prism/git-gates-state.<scope>.json`, keyed by session and HEAD sha; both globs are appended to `.gitignore`."
- Switches paragraph: `PRISM_HOOK_DENY_DISABLE=1` now "turns off both the write gate and the git gates while leaving announcements on."
- New sub-heading `### Git gates` after `## Write gate`: three short paragraphs — what each gate does, the opt-in `hooks` block, the fail-open rule for the push gate, and a pointer to ADR-0076.

**A15. Consumer docs** (parallel with A14; read `.prism/architect/_toolkit/documentation.md` and `architecture-doc-shape.md` first — the gate routes `docs/**` there).
- `docs/ai-skills/compatibility.md` § "Hook-based enforcement is Claude Code only": add a paragraph naming the two git gates, the `hooks` block, and that after Phase B they reach Codex and Cursor too.
- `docs/parameterization.md` field table: rows for `hooks.commitCleanupPass`, `hooks.pushVerification`, `hooks.pushVerificationTimeoutMs`, beside `features.conductorMayMerge`.
- `docs/what-prism-writes.md` and `docs/adopting-into-existing-repos.md`: the sentences that say a PRISM registration is "identified by the `.claude/hooks/hook.mjs` command path" → "by the `.claude/hooks/hook.mjs` or `git-gates.mjs` command path".

**A16. ADR-0076** (after A5; confirm the next number by listing `.prism/spec/adrs/_toolkit/` — 0075 is the current highest).
- File: `.prism/spec/adrs/_toolkit/0076-commit-and-push-gates-are-harness-hooks.md`, `Status: accepted`.
- `## Context`: the ask (author re-reads the diff before commit; lint/format hold the push); shipping-flow step 1 already prescribed lint/format in prose, unenforced; nothing prescribed a cleanup read; ADR-0074 rejected a git `pre-commit`/`pre-push` floor for read-before-write; ADR-0069 closed the report-back channel to hooks; `epic-floor-revert.md` left room for "a separate, smaller opt-in".
- `## Decision` (one sentence first): the gates are `PreToolUse` hooks on the shell tool that recognize a `git commit` / `git push` segment, delivered by the existing hook runtime, opted in per consumer through `config.json#hooks`. Alternatives, one line each: **git hooks** — cannot prompt the model, cost `husky` or per-clone `core.hooksPath`, fire for humans; not a reopening of ADR-0074, which rejected a *substitute for read-before-write*, a guarantee a commit-time hook cannot prevent — here observation at diff-complete time is the guarantee. **Nag-only commit gate** — ADR-0072 measured that announcement habituates. **Hard commit gate with a self-attested marker** — theater, and a gate a persona must satisfy on its own turn is the reverted floor's shape in miniature. **One-shot keyed on staged-diff hash** — cleanup edits change the hash and re-hold the retry; HEAD sha is stable across the retry.
- `## Consequences`: one node spawn per commit/push; a lint slower than the budget degrades to an announced allow, so the gate is friction, not a wall; `commands.lint` becomes a live dependency of `git push` for opted-in consumers; the commit hold is a nudge with no deterministic evidence behind it — a persona can retry without reading, and the compensating control is the prose step every host carries; sits on a mid-work tool call, never the report-back channel.
- `README.md` in the same directory: append the index row in the shape of row 0075. `.ai-skills/definitions/seed-curation.json`: add the ADR path to `excluded` after the 0075 line (ADR-0064 — numbered ADRs never ship).

**A17. Tests** (after A5–A9).
- New `scripts/ai-skills/git-gates.test.ts`. Copy `withTempRepo` (`hook-gate.test.ts:50`), `toShellPath` (`:92`), `denyReason` (`:1254`); add `seedGitRepo(root, hooksBlock, commands)` that runs `git init -q`, `git -c user.name=t -c user.email=t@t commit -q --allow-empty -m init`, and writes `.ai-skills/config.json` with the given `hooks` and `commands`. Cases:
  - `detectGitSegments` table: `git commit -m "x"` → `["commit"]`; `git commit --amend --no-edit` → `["commit"]`; the HEREDOC form from `git-conventions.md` with a body line reading `git push` → `["commit"]`; `MSYS_NO_PATHCONV=1 git commit -m x` → `["commit"]`; `git -C sub commit -m x` → `["commit"]`; `git add -A && git commit -m x && git push -q` → `["commit","push"]`; `git push -u origin HEAD:refs/heads/x` → `["push"]`; `git push --delete origin x` → `[]`; `gh pr create --draft` → `[]`; `git merge origin/main` → `[]`; `git log --oneline` → `[]`; `echo "git commit"` → `[]`; `tee f <<'E'\ngit push\nE` → `[]`.
  - Commit gate: first call denies with reason containing `cat .prism/references/cleanup-pass.md`; second call on the same HEAD → null; after a new empty commit → denies again; `--amend` on a seen HEAD → null; the state file exists after the first call and lists the sha; `"unborn"` key on a repo with no commits.
  - Push gate: lint `node -e "process.exit(3)"` → deny whose reason contains `exited 3`; lint `node -e "console.log('ok')"` → null; `format` unset → only lint runs; both unset → null; `pushVerificationTimeoutMs: 100` with `node -e "setTimeout(()=>{},5000)"` → allow envelope whose reason contains `timed out`; command `definitely-not-a-binary-xyz` → allow envelope; output tail present in the deny reason and total length ≤ `MAX_EMISSION_BYTES` + reason prefix.
  - Inert paths: no `.ai-skills/config.json` → null; config without `hooks` → null; both flags `false` → null; malformed config → null and one stderr line; `PRISM_HOOK_DISABLE=1` → null; `PRISM_HOOK_DENY_DISABLE=1` → null; `--tool=cursor` (Phase A) → null; `tool_name: "Write"` → null.
  - Spawned entry point: `node scripts/ai-skills/hooks/git-gates.mjs --tool=claude --event=PreToolUse` with a commit payload on stdin → deny envelope on stdout, exit 0; without `--event` → no output, exit 0.
  - `lib/shell.mjs` direct: `a && b`, `a | b`, `a; b`, heredoc skip, `<<-` with tab indent, quoted delimiter `<<'E'`, backslash-newline continuation.
- `scripts/ai-skills/update.test.ts`: `HOOK_RUNTIME_RELATIVE_PATHS` (`:2077`) += the two files; "update twice leaves exactly one git-gates entry"; "a consumer settings file from an older PRISM (hook.mjs entries only) gains the git-gates entry"; "a consumer wrapper `bash -c 'lint && node …/git-gates.mjs'` is not claimed" (mirror `:2507`); four gitignore lines present exactly once.
- `scripts/ai-skills/doctor.test.ts`: git-gates present/unregistered warning; hooks-absent info; hooks-on info; `pushVerification` with no commands warning.
- `scripts/ai-skills/hook-gate.test.ts` `assertAdoptedConsumerState` (`:531-599`): four gitignore lines; a `PreToolUse` entry whose command contains `git-gates.mjs`; `git-gates.mjs` executable.
- Verify: `pnpm prism:check`.

### Clove (implementation) — Phase B: Cursor delivery, and the Codex half doctor still misses

Re-planned 2026-09-08 against `origin/main` at `22bd24d7`, after PR #487 (`PRISM-477 followup: Deliver the hook runtime to Codex consumers`) landed most of what B1–B4 originally described. What #487 already did, verified against the source on this branch:

- `HARNESSES.codex` (`harnesses.mjs:182-232`) has both `emitDeny` (`:213`) and `emitAllow` (`:225`) in the documented Claude-shaped envelope, with `toolKinds` listing `Bash`, `apply_patch`, `Edit`, `Write` explicitly (`:187-192`).
- `update.ts` has the generalized `mergeHookRegistration(sourcePath, targetPath, pattern, dryRun, deliver)` seam (`:1467`) plus `mergeHookCodexRegistration` (`:1561`), and `refreshHookRuntime` (`:1297`) delivers the runtime when `hosts` includes `claude` **or** `codex` (`:1315`).
- `templates/install/.codex/hooks.json` registers `hook.mjs` on `PreToolUse`/`PostToolUse`/`PostCompact` **and** `git-gates.mjs` on its own `^Bash$` `PreToolUse` group; `PRISM_CODEX_HOOK_COMMAND_PATTERN` (`:1399`) already claims `(?:hook|git-gates)\.mjs`.
- So **Codex git gates fire today on `main`.** Every precondition holds: Codex's payload carries `tool_name: "Bash"`, `tool_input.command`, and `session_id`, which is exactly what `runGitGatesArm` reads at `git-gates.mjs:594`, `:603`, and `:598`.

What is left is Cursor end to end, plus the Codex half doctor still cannot report. Two constraints reshape the original B2/B3 and are the reason this is a re-plan rather than a trim:

- **One runtime, two — now three — registrations.** #487's Decision put the shared runtime at `.claude/hooks/` for every host and gave each host only its own registration file. The original B3's per-host target-dir table (`cursor → .cursor/hooks`) is therefore wrong: Cursor's command names `.claude/hooks/git-gates.mjs`, exactly like Codex's, and a Cursor-only consumer gets a `.claude/hooks/` directory by design. This also invalidates AC-10's evidence — see the AC Adjustments proposal below.
- **Cursor's hook entry shape is flat, and its file carries a top-level `version`.** Confirmed against https://cursor.com/docs/agent/hooks (fetched 2026-09-08, treated as authoritative): `{"version": 1, "hooks": {"beforeShellExecution": [{"command": "…", "timeout": 30, "matcher": "curl|wget"}]}}`. The entry is a flat object whose `command` is a string — **not** Claude's and Codex's shared `{matcher, hooks: [{type, command}]}` nesting. `isPrismOwnedHookEntry` (`update.ts:1406`) requires an inner `hooks` array and `collectHookCommands` (`doctor.ts:655`) walks the same two levels, so neither recognizes a Cursor entry today. `matcher` there is a regex over the **command text**, not a tool name, so PRISM omits it and lets `detectGitSegments` decide. Payload (same page): top-level `command`, `cwd`, `conversation_id`, `hook_event_name`, no `tool_name`. Output: `{"permission": "allow"|"deny"|"ask", "user_message", "agent_message"}`. Project hooks live at `<project-root>/.cursor/hooks.json` and **run from the project root**, which settles the relative-command-path question for Cursor (Codex's is already settled by #487).

Every task is `[AFK]` unless tagged. Governing docs the write gate will ask for — read them once at session start with a bare `cat <path>` (a `cd … && cat` does not credit): `.prism/architect/_toolkit/install-layout.md`, `.prism/architect/_toolkit/skills-ecosystem.md`, `.prism/architect/_toolkit/output-guards.md`, `.prism/architect/_toolkit/spec-editing.md`, `.prism/architect/guides/writing-a-plan.md`, `.prism/architect/guides/writing-an-adr.md`, `.prism/architect/_toolkit/documentation.md`, `.prism/architect/_toolkit/architecture-doc-shape.md`.

**B1. Teach the runtime Cursor's shell payload.** (First; B2 and B4 depend on it.)

- `scripts/ai-skills/hooks/harnesses.mjs`:
  - `HookPayload` typedef (`:19-27`): add `@property {string} [command]` — Cursor's `beforeShellExecution` names the command at the top level, not under `tool_input`.
  - `HarnessSpec` typedef (`:44-52`): add `@property {(payload: HookPayload) => string | undefined} commandOf`.
  - `claude` (after `filePaths`, `:135`) and `codex` (after `filePaths`, `:197`): `commandOf: (payload) => payload.tool_input?.command`.
  - `cursor` (after `filePaths`, `:172`): `commandOf: (payload) => payload.command ?? payload.tool_input?.command`. Comment the fallback: `beforeShellExecution` carries `command` at the top level; the `tool_input` arm is what a future Cursor event of the Claude/Codex shape would use.
  - `cursor.emitDeny` (`:178`) and `cursor.emitAllow` (`:180`): replace both `() => null` stubs and the two comments above them with the documented envelope — `emitDeny: (reason) => ({ permission: "deny", user_message: reason, agent_message: reason })`, `emitAllow: (reason) => ({ permission: "allow", agent_message: reason })`. The replacement comment states the same asymmetry the `codex.emitDeny` comment states (`:205-212`): documentation-verified at https://cursor.com/docs/agent/hooks read 2026-09-08, not live-probed until B5; an envelope Cursor does not recognize fails open because every exit path sets `exitCode = 0`. Do not delete the `HarnessSpec` JSDoc paragraph (`:34-42`) explaining why `emitDeny` may return `null` — it is still the right rule and no host returns `null` only because all three now clear it. Reword its "the Codex row below" citation so it does not read as though Cursor is still the exception.
  - `cursor.toolKinds` (`:170`) already lists `Shell: "shell"`; leave it. It is not what admits the Cursor path — B1's `git-gates.mjs` change is.
  - Mirror every addition in `harnesses.d.mts`.
- `scripts/ai-skills/hooks/git-gates.mjs`:
  - `:594` — `resolveListedToolKind(spec, payload.tool_name) !== "shell"` rejects every Cursor `beforeShellExecution` payload, which carries no `tool_name`. Replace with: resolve the command first via `spec.commandOf(payload)`; when `payload.tool_name` is undefined **and** the command is a non-empty string, treat the payload as shell; otherwise keep the existing listed-kind check. Comment the reason — a host whose shell event is its own event name has no tool name to list, so the tool-name table cannot be the only admission route.
  - `:603` — `detectGitSegments(payload.tool_input?.command)` becomes `detectGitSegments(command)` using the value resolved above. This is the last direct `tool_input` read in the arm.
  - `main()` (`:670`) — `parseEventFlag(argv) !== "PreToolUse"` rejects Cursor's registration. Accept `beforeShellExecution` as well, via a small `const SHELL_PRECONDITION_EVENTS = new Set(["PreToolUse", "beforeShellExecution"])` near the top with a one-line JSDoc naming both hosts' spellings. Update the `main()` JSDoc (`:641-646`), which currently says "only `--event=PreToolUse` dispatches". Registering Cursor with `--event=PreToolUse` was the alternative; it lies about the host event in a committed file a consumer reads, which is exactly the confusion `install-layout.md` § Hook-runtime ownership warns about for hand-read commands.
  - Note, no change needed: `isForeignPayload` (`hook.mjs:810`) only fires for `tool === "claude"`, so a `--tool=cursor` payload passes. And git-gates writes nothing (not `emitNone`) on the allow path, which Cursor documents as success on exit 0.
- Extend the existing `harnesses` unit assertions for `commandOf` on all three rows and for Cursor's two envelope shapes. #487's review added a shape assertion for `emitDeny`; give `emitAllow` the matching one (this closes the open Review Issue "`emitAllow` has no shape assertion" carried in `prism-477-followup-codex-hooks.md`).
- Verify: `pnpm run prism:check-types` and `node --test scripts/ai-skills/git-gates.test.ts`.

**B2. Registration seeds — Cursor's, plus PRISM's own two.** (After B1.)

- `templates/install/.cursor/hooks.json` (new; the directory exists with a `.gitkeep`):
  ```json
  {
  	"version": 1,
  	"hooks": {
  		"beforeShellExecution": [
  			{
  				"command": "node \".claude/hooks/git-gates.mjs\" --tool=cursor --event=beforeShellExecution"
  			}
  		]
  	}
  }
  ```
  No `matcher` — Cursor's matcher is a regex over the command text, and `detectGitSegments` is the thing that decides. Path is `.claude/hooks/…` and relative, matching Codex's, because the runtime is one tree (#487's "one runtime, two registrations") and Cursor runs project hooks from the project root. Only `git-gates.mjs` is registered: the architect-context write gate stays Claude-and-Codex, since nothing here delivers Cursor's write-side envelope through `hook.mjs`'s deny arm and ADR-0074 still records that gap.
  `templates/install/` ships wholesale via `package.json#files`, so no pack-list change; `.ai-skills/definitions/seed-curation.json` has no `.codex/hooks.json` entry either, so classify nothing.
- PRISM's own `.cursor/hooks.json` — same file, same content. PRISM's own `.codex/hooks.json` — **create it**, copying `templates/install/.codex/hooks.json` verbatim; it does not exist today (`ls .codex/` shows no `hooks.json`), because PRISM dogfoods `pnpm prism:build` and never runs `refreshHookRuntime` against itself. Without both files B5 has no registration to probe against, and PRISM's own tree silently under-enforces the gates it ships. Both paths are committed — `git check-ignore` clears them; only `/.codex/codex-config.toml` is ignored.
  Their commands name `scripts/ai-skills/hooks/git-gates.mjs`, PRISM's own runtime path, not `.claude/hooks/` — the same substitution `.claude/settings.json` already makes for PRISM's own copy (task A6). These two files are hand-maintained dogfood config, not build output; note that in a one-line comment nowhere (JSON has no comments) but state it in B6's install-layout edit.
- Verify: `node -e "JSON.parse(require('fs').readFileSync(process.argv[1],'utf8'))"` over each of the three files, then `pnpm prism:check`.

**B3. `update.ts` — an entry-shape seam, then Cursor delivery.** (After B2.)

The merge machinery assumes one entry shape. Cursor's is different, so generalize before adding the third host rather than forking a parallel writer.

- `isPrismOwnedHookEntry` (`:1406`): today it returns `false` unless `entry.hooks` is an array. Widen it to recognize both shapes — a flat entry whose own `command` is a string matching `pattern`, or a nested entry with an inner `hooks` array (unchanged). Keep it one function: the nested check already walks `innerHooks.some(...)`, and the flat check is the same predicate over the entry itself. The two shapes are structurally disjoint (`hooks` array present or not), so no entry is ever claimed twice. JSDoc gains one sentence naming which host uses which shape.
- `mergeHookEventEntries` (`:1435`) needs no change — it delegates ownership entirely to `isPrismOwnedHookEntry`.
- `mergeHookRegistration` (`:1467`): the merged object is `{ ...targetSettings, hooks: mergedHooks }` (`:1507`), which drops every non-`hooks` top-level key the **source** carries. That is a no-op for Claude and Codex (their seeds have none) and loses Cursor's `"version": 1` on a fresh write. Change to `{ ...sourceRest, ...targetSettings, hooks: mergedHooks }`, where `sourceRest` is the source object minus `hooks`. Target wins on a key both define, so a consumer who pinned their own `version` keeps it; the source only supplies defaults on a file that did not exist. Add a JSDoc sentence saying so — this is a host-neutral fix whose only current beneficiary is Cursor.
- `PRISM_CODEX_HOOK_COMMAND_PATTERN` (`:1399`) already matches the exact command shape Cursor's seed uses (`^node "\.claude\/hooks\/(?:hook|git-gates)\.mjs"(?: --[a-zA-Z]+=[\w.-]+)*$`; `beforeShellExecution` is all word characters, so the `[\w.-]+` value class covers it). Do not duplicate the regex. **Rename it** to `PRISM_RELATIVE_HOOK_COMMAND_PATTERN` — a const named for one host that two hosts key on is the "will mislead the next reader" case — and rewrite its JSDoc to say it matches the relative-path invocation both Codex and Cursor register, against `PRISM_HOOK_COMMAND_PATTERN`'s `$CLAUDE_PROJECT_DIR` form. Sweep the tree for the old name per `.prism/rules/code-standards.md` § Removal and rename completeness: `grep -rn "PRISM_CODEX_HOOK_COMMAND_PATTERN" . --exclude-dir=node_modules --exclude-dir=.git` — known callers are `doctor.ts:40` (import) and `:866`, plus `update.test.ts` and `doctor.test.ts`, and prose in `install-layout.md` and both plans.
- `mergeHookCursorRegistration(prismRepoRoot, consumerRepoRoot, dryRun, deliver = true)`: a third thin wrapper beside `mergeHookCodexRegistration` (`:1561`), source `templates/install/.cursor/hooks.json`, target `<consumer>/.cursor/hooks.json`, pattern `PRISM_RELATIVE_HOOK_COMMAND_PATTERN`.
- `refreshHookRuntime` (`:1297`): the runtime-removal guard at `:1315` becomes "none of claude, codex, cursor"; add `mergeHookCursorRegistration(..., false)` to the removal branch (`:1319-1320`) and `mergeHookCursorRegistration(..., dryRun, hosts.includes("cursor"))` to the delivery branch (`:1354-1364`). Update the comment at `:1310-1314` and the function JSDoc (`:1284-1296`), both of which name two hosts. `HOOK_STATE_GITIGNORE_LINES`, `HOOK_RUNTIME_FILES`, `HOOK_RUNTIME_ENTRY_POINTS`, and the `.claude/hooks/` target dir are all unchanged — one runtime, three registrations.
- `deriveOptedIn` (`lib/hosts.ts`) stays untouched; `refreshHookRuntime` reads `hosts` directly, as #487 decided.
- Tests in `scripts/ai-skills/update.test.ts`: a `hosts: ["cursor"]` consumer receives `.claude/hooks/git-gates.mjs` and a `.cursor/hooks.json` carrying `version: 1` and exactly one PRISM entry, and no `.claude/settings.json` or `.codex/hooks.json` PRISM entry; a second run changes no bytes; dropping `cursor` from `hosts` removes the `.cursor/hooks.json` entry and leaves a consumer-authored `beforeShellExecution` entry in place; a consumer wrapper `bash -c 'my-lint && node .claude/hooks/git-gates.mjs --tool=cursor'` is **not** claimed (mirror the existing wrapper case for the Claude pattern); a `.cursor/hooks.json` the consumer pinned to `"version": 2` keeps that value through the merge.
- Verify: `node --test scripts/ai-skills/update.test.ts`.

**B4. `doctor.ts` — one host loop, and git-gates lines for every delivered host.** (After B3.)

This task also carries `prism-477-followup-codex-hooks.md`'s Decision "Doctor's Codex git-gates reach lines belong to issue-488 B4" — a Codex consumer today is never told whether its git gates are on, off, or inert.

- `collectHookCommands` (`:655`) walks `hooks[event][].hooks[].command` and so returns nothing for a Cursor file. Widen it the same way `isPrismOwnedHookEntry` is widened in B3: for each entry, take its own `command` when that is a string, and otherwise walk the inner `hooks` array. Update its JSDoc, which says "across every event and every matcher group".
- Replace the three parallel per-host blocks with one loop over a small host table — `{ host, registrationLabel, registrationPath, raw, parsed, parseFailed, registeredPaths }` for `claude` → `.claude/settings.json`, `codex` → `.codex/hooks.json`, `cursor` → `.cursor/hooks.json`. This collapses: the parse-and-collect blocks (`:814-852`), the three `!hosts.includes(host) && …IsRegistered` stale-registration pushes (`:888-903`) plus a new Cursor one, and the two per-host reachability arms (`:945-1010`). Every message keeps its current wording; only the file name and host name vary. The runtime-staleness push at `:875` widens to "none of claude, codex, cursor".
- Lift `describeGitGates(config)` (`:719`) and the `gitGatesInert` warning (`:956-965`) out of the Claude arm so each runs once per delivered host that registers `git-gates.mjs`. Both messages currently name `.claude/settings.json` in their repair text — parameterize on the host's registration label. `describeGitGates`'s own JSDoc says "for a consumer whose `hosts` includes `claude`"; rewrite it. Guard against a duplicate config summary when two hosts both register the gates: emit `describeGitGates`'s `info`/`warning` pair **once**, keyed on any delivered host registering `git-gates.mjs`, since the block it describes is per-repo config, not per-host. The per-host `gitGatesInert` warning stays per-host — that one really is about one registration file.
- The `codexGitGatesInert` variable at `:995` and its comment (`:998-1002`, which says "No Codex git-gates info/warning message exists yet (issue-488 B4)") are both absorbed by the lift; delete the comment rather than leaving it pointing at work that is now done. Same for the Claude arm's `:967-969` comment, which stays true but should name hosts generically.
- The `hosts.includes("claude") || hosts.includes("codex")` early return (`:1012`) gains `cursor`. The final "not delivered" `info` (`:1018`) names `claude` or `codex` in its remedy sentence and cites `docs/ai-skills/compatibility.md` § "Hook-based enforcement is Claude Code only" — a heading B6 renames. Update both halves in B6's sweep, not here, so the heading and its citations move in one commit.
- `readConsumerConfigSafely` (`:687`) already returns `hooks` and `commands`; no change.
- `checkHostOutputStaleness` (`:1041-1043`) already iterates all three hosts; no change.
- Tests in `scripts/ai-skills/doctor.test.ts`: Cursor delivered-and-registered `info`; Cursor `git-gates.mjs` present but `.cursor/hooks.json` registering nothing → inert `warning` naming `.cursor/hooks.json`; a Codex-only consumer with the gates on gets the `Git gates: commit cleanup pass on…` line (the gap this task closes); a claude+codex consumer gets that line exactly **once**; `hosts` dropping `cursor` while `.cursor/hooks.json` still registers → stale-registration `warning`; a malformed `.cursor/hooks.json` produces its own parse `error` and does not suppress the other hosts' findings (mirror the Codex case #487's review added).
- Verify: `node --test scripts/ai-skills/doctor.test.ts`, then `pnpm prism:check`.

**B5. [HITL] One live probe session, covering both plans' host questions.** (After B1–B4 land. Blocks B6.)

This is the single probe session the Decision "One probe session and one documentation PR cover both plans' tails" describes — it carries `prism-477-followup-codex-hooks.md` task 8's four Codex write-gate observations as well as the git-gate observations below. Hunter runs it; the implementer prepares a scratch consumer (PRISM installed, `hosts: ["claude","codex","cursor"]`, `hooks: {"commitCleanupPass": true, "pushVerification": true}`, `commands.lint` set) and hands over the exact commands.

Codex write gate and announce layer (477 task 8):
- Does the `PostToolUse` announcement reach the model?
- Does an edit to a routed path with the governing doc unread get blocked, and does `permissionDecisionReason` render?
- What is `payload.cwd` — the repo root or below it? This settles 477's relative-command-string Decision.
- Does the deny cross into a Codex subagent, if Codex has one?

Git gates, per host:
- Codex: first `git commit` on a HEAD is held, the retry passes.
- Cursor: same, and confirm the `{"permission":"deny","user_message":…,"agent_message":…}` envelope renders — this is the one shape no probe has ever observed.
- Cursor: confirm the hook process's working directory is the project root, so the relative `.claude/hooks/git-gates.mjs` path resolves. The docs say project hooks run from the project root; the probe is what makes that a measurement. If it is not, the contingency is the host's own project-dir variable, adopted only after the probe — not speculatively (477's command-string Decision).
- One host, once: `pushVerificationTimeoutMs: 100` with a slow lint → the announced allow, not a deny.

Record the date and outcome in this plan's `## Decisions` (D7), in `prism-477-followup-codex-hooks.md`'s `## History`, and in the `harnesses.mjs` comments B1 wrote. If the Cursor deny does not render, re-plan rather than proceeding: `HARNESSES.cursor.emitDeny` goes back to `null` and Cursor ships announce-only, which is a materially different B6.

**B6. Docs and ADR follow-through — one PR, both plans' tails.** (After B5.)

Eli owns this PR and carries `prism-477-followup-codex-hooks.md` tasks 9–15 into it alongside everything below; that plan's tasks 11, 13, and the ADR-0074 half of task 10 touch lines this task also rewrites, so write each line once at its final three-host wording. Because the PR spans two plans, it records a `## History` line in both.

Absorbed from Eric's `found-followup-work` on PR #487 (pass 5) — two statements whose Codex half went false the moment #487 merged, and which `prism-477-followup-codex-hooks.md` AC-9 would grade UNMET again if tasks 9–14 ran verbatim:
- `.prism/spec/adrs/_toolkit/0076-commit-and-push-gates-are-harness-hooks.md:87` — "Reach is Claude Code only, the same delivery gap ADR-0074 records for the write gate." False for Codex since #487, and false for Cursor once B1–B4 land. Replace with the per-host reach as shipped, and keep the honest negative the guide asks for: name what each host does **not** get (Cursor has no architect-context write gate; the commit hold is still a nudge on every host).
- `docs/ai-skills/compatibility.md:83` — "Today they reach Claude Code only, on the same delivery as the write gate; the shipping flow carries the cleanup pass as a prose step on every host, and a follow-up delivers the gates to Codex and Cursor." Same correction. The sentence also promises the follow-up this task closes, so it is rewritten, not patched.

The rest of B6:
- `docs/ai-skills/compatibility.md`: the summary bullet at `:17`; the section heading at `:69` ("Hook-based enforcement is Claude Code only"), renamed to state the split — the git gates reach all three hosts, the architect-context write gate reaches Claude Code and Codex; the body at `:71-83`, whose "no equivalent is written for Codex or Cursor" is now wrong twice over. Renaming the heading breaks every cross-reference: sweep with `grep -rn "Hook-based enforcement is Claude Code only" . --exclude-dir=node_modules --exclude-dir=.git` and fix each hit — known callers are ADR-0074's closing paragraph, `doctor.ts:1018`'s not-delivered message (B4 left it for this sweep), and `AGENTS.md:858`, which is hand-maintained rather than a build mirror.
- `.prism/architect/_toolkit/install-layout.md` § Hook runtime: a per-host delivery table (which registration file, which events, which gates), the one-runtime-at-`.claude/hooks/` rule and its consequence that a Cursor-only or Codex-only consumer has a `.claude/hooks/` directory, and a line saying PRISM's own `.codex/hooks.json` and `.cursor/hooks.json` are hand-maintained dogfood config rather than build output (B2). Every claim source-verified per `.prism/rules/architect-doc-verification.md`.
- `templates/install/.prism/architect/_toolkit/install-layout.md` — the curated twin (`seed-curation.json`), hand-edited to match, including the pre-existing "the hook announces; it never blocks" contradiction 477 task 12 names.
- ADR-0076 `## Consequences`: the per-host reach above, plus a line that ADR-0074's Cursor and Codex delivery seams now exist for the git gates and are the model for extending the write gate. ADR-0074: the `## Amendment` 477 task 10 specifies, written once at its final three-host wording. ADR-0072's Consequences bullet at `:65` per 477 task 9 — with Cursor now named as the write-gate-only gap, not as an undelivered host outright.
- `.prism/rules/context-reuse.md:30` per 477 task 14 (canonical only; mirrors are build output). Its `load: always` discriminator is named here deliberately, satisfying `.prism/rules/followup-scope.md` § "Spec content never rides an unrelated ticket".
- `docs/parameterization.md` and `docs/what-prism-writes.md`: wherever they name `.claude/settings.json` and `.codex/hooks.json` as the registration files, add `.cursor/hooks.json`.
- Verify: `pnpm prism:build`, then `pnpm prism:check` end to end, then the rename sweep greps return no stale hits.

---

## Decisions

- **D1 — Mechanism is the agent harness's shell-precondition hook, not a git hook.** No harness exposes a "pre-commit" event; the gate watches the shell tool's pre-execution event (`PreToolUse` on Claude Code and Codex, `beforeShellExecution` on Cursor) and recognizes a `git commit` / `git push` segment in the command text — the same technique `hook.mjs` already uses to judge `git` subcommands for the write gate.
  - **Root cause:** a git hook fires for every human on the team, needs `husky` (a new dependency) or a per-clone `core.hooksPath` step, and cannot prompt the model — it can only print to Bash output that the agent may `--no-verify` past.
  - **Alternatives considered:** real git hooks (rejected for the three costs above and by ADR-0074); prose only (rejected — ADR-0072 measured that announcement habituates).
  - **Chosen approach:** harness hooks delivered by the existing runtime, opted in per consumer; prose in the shipping flow carries the discipline on any host that lacks the hook.
  - **Implementation guidance:** all three hosts document the event and its deny envelope (Phase B header); Claude ships first because its seams exist, Codex/Cursor follow on the same runtime.
  - → promoted to ADR-0076 (task A16).

- **D2 — Commit gate is a one-shot hold per HEAD sha, session-scoped.** First `git commit` on a HEAD is denied with a pointer to `cleanup-pass.md`; the retry passes. State is saved before the deny.
  - **Alternatives considered:** nag-only (habituates — ADR-0072); a hard gate cleared by a marker the persona writes (self-attested, so theater, and it recreates the reverted floor's gate-on-own-turn shape from ADR-0069's incident); keying on the staged-diff hash (cleanup edits change the hash and re-hold the retry).
  - **Chosen approach:** HEAD sha is stable across the retry and changes exactly when a commit lands, so "once per commit" falls out with no marker. Save-before-deny means a crash between deny and retry fails open rather than looping.
  - → promoted to ADR-0076.

- **D3 — Push gate runs `commands.lint` and `commands.format` inside the hook and denies on non-zero; timeout and spawn errors fail open with an announcement.** `commands.format` is already the check-mode command per `config.schema.json`, so no new slot.
  - **Alternatives considered:** a new `formatCheck` slot (rejected — duplicates a slot the schema already defines as check mode); evidence-ledger style "hold unless verification was recorded" (rejected — the reverted floor's mechanism); deny on timeout (rejected — the retry times out again, an unperformable remedy).
  - **Implementation guidance:** sequential commands so a deny names one; `shell: true` for Windows `.cmd` shims; the allow envelope carries the announcement because an exit-0 stderr line reaches the transcript only in verbose mode.
  - → promoted to ADR-0076.

- **D4 — Opt-in `hooks` block in `.ai-skills/config.json`; absent means off; PRISM's own config enables both.** Matches `features.conductorMayMerge` and `epic-floor-revert.md`'s "separate, smaller opt-in". The block is read by the hook runtime, not a persona, so it is its own top-level key rather than a `features.*` entry. `PRISM_HOOK_DISABLE` and `PRISM_HOOK_DENY_DISABLE` both silence it.
  - → promoted to `.prism/architect/_toolkit/install-layout.md` § Git gates (task A14).

- **D5 — New `git-gates.mjs` beside `hook.mjs`, own `Bash` matcher group.** `hook.mjs` is 1,500 lines about architect routing; the shell splitter moves to `lib/shell.mjs` so both import it. A separate matcher group avoids spawning the script on every `Write`/`Edit` and keeps the two gates' timeouts independent. No `timeout` field: Claude Code's command-hook default is 600 s.
  - → no promotion needed (file placement; the install-layout doc names both entry points).

- **D6 — Cleanup-pass scope is the local frame.** The pass fixes inside the diff and the functions it touches; larger findings go to `## Cleanup Items`. This keeps it consistent with `code-standards.md § Refactor scope` and Clove's anti-drive-by rule, and leaves Briar as the independent post-push reviewer.
  - → no promotion needed (codified in `cleanup-pass.md` itself).

- **D7 — Codex and Cursor delivery is in scope as Phase B, after Phase A is green.** ADR-0074 called the Claude-only reach "a delivery gap, not a platform limit" and named the missing pieces: a registration writer, an idempotent merge, and a probed deny envelope. Both hosts' docs now specify the envelope, so the git gates build those seams; the architect-context write gate stays Claude-only until someone extends it over the same seams.
  - **Alternatives considered:** Claude-only with prose elsewhere (the ADR-0074 pattern — rejected here because the ask was parity and the envelopes are documented); shipping all three in one PR (rejected — Phase A is a complete, reviewable unit and Phase B needs a live probe).
  - **Implementation guidance:** B5 is `[HITL]`; do not mark Phase B done on the docs alone — the repo's convention (ADR-0072, ADR-0074) is a live probe before trusting a deny envelope.
  - → promoted to ADR-0076 § Consequences (task B6).

- **D8 — The push gate's "could not start" case is read off the shell's own report, not `result.error`.** Under `shell: true` a missing binary never produces `ENOENT`: the shell starts fine and reports the miss itself — exit `127` on every POSIX shell, exit `1` plus `is not recognized as an internal or external command` on `cmd.exe` (measured 2026-09-07; `9009` is what `%ERRORLEVEL%` shows in an interactive prompt, not what `cmd /c` returns).
  - **Alternatives considered:** deny on not-found (holds every push until the config changes — a wall, which D3 rules out); status-only detection (misses `cmd.exe`, which returns `1`).
  - **Chosen approach:** status `127`, or the `cmd.exe` message on any non-zero exit, routes to the announced allow. The `result.error` branch stays for `ETIMEDOUT`, which `spawnSync` does report.
  - **Implementation guidance:** A5-P's `result.error` (`ENOENT`) wording and A17's "`definitely-not-a-binary-xyz` → allow envelope" test describe the same outcome by a different signal; the test holds as written.
  - → no promotion needed (implementation tactic; `git-gates.mjs` documents it at the constant).

- **D9 — `unquote` lives in `lib/shell.mjs`, imported by both `hook.mjs` and `git-gates.mjs`.** The cleanup pass on this diff found it copied verbatim into `git-gates.mjs`; identical logic at two sites is the self-review threshold, and the splitter's module is the natural home.
  - → no promotion needed (file placement).

- **D11 — The review loop's subject-clean exit is one clean pass, not two consecutive.** `.ai-skills/skills/prism-review-loop/shared.md` § Guardrails and its verification-honesty echo change from "two consecutive passes" to "one pass" at Hunter's direction, folded into this PR. A second clean pass over a frozen subject re-reads text the first pass already cleared; the pass budget and the three-strike rule still bound the loop.
  - → no promotion needed (the skill body is the durable surface).

- **D10 — `git-gates.mjs` reads stdin before it checks `--event`, so a host that registers it on another event has its pipe drained rather than left unread.** Mirrors `hook.mjs`'s `main`; costs nothing on the dispatching path.
  - → no promotion needed (mirrors the existing entry point).

- **D12 — One probe session and one documentation PR cover this plan's tail and `prism-477-followup-codex-hooks.md`'s.** B5 is that probe (this plan's Codex and Cursor git gates plus that plan's four Codex write-gate observations from its task 8); B6 is that documentation PR (this plan's docs and ADR follow-through plus that plan's tasks 9–15). This is the mirror of the Decision of the same name in `prism-477-followup-codex-hooks.md` — read that entry for the full argument; what follows is what it means on this side.
  - **Root cause:** both plans' tails rewrite the same paragraphs of the same files. `docs/ai-skills/compatibility.md`'s hook-enforcement heading, `.prism/architect/_toolkit/install-layout.md` § Hook runtime, and ADR-0074 each get one wording from that plan's tasks 11/13/10 and a different one from B6. Landing them separately writes the same lines twice and ships an intermediate claim already scheduled to go stale.
  - **Alternatives considered:** run that plan's PR 2 first and let B6 rewrite whatever it rewrites. Rejected — the second pass is written down and waiting, so the intermediate heading is known wrong before anyone writes it.
  - **Cost, stated rather than hedged:** that plan's documentation corrections wait for B1–B4 to land, because B5 cannot probe git gates that do not exist yet on Cursor. The stale "Claude Code only" claims stay in the tree for that window. If Phase B stalls, that plan's PR 2 runs standalone on its own task list — this is a sequencing choice, not a dependency it cannot walk back.
  - **Implementation guidance:** B4 carries that plan's Decision "Doctor's Codex git-gates reach lines belong to issue-488 B4" — it lifts `describeGitGates` and the `gitGatesInert` warning out of `doctor.ts`'s Claude-only arm so each runs per delivered host, which is what finally gives a Codex-only consumer a reading on its own git gates. Eli owns B6 and records a `## History` line in both plans, since the PR spans two.
  - → no promotion needed (a sequencing choice between two open plans; nothing survives their close).

- **D13 — Two git-gates reach statements go false the moment #487 merges, so B6 absorbs them rather than leaving them to `prism-477-followup-codex-hooks.md`'s task list.** `.prism/spec/adrs/_toolkit/0076-commit-and-push-gates-are-harness-hooks.md:87` ("Reach is Claude Code only…") and `docs/ai-skills/compatibility.md:83` ("Today they reach Claude Code only…") both describe the git gates, not the write gate, so neither is covered by that plan's tasks 9–15, which sweep write-gate claims.
  - **Root cause:** PR #487 registered `git-gates.mjs` in `templates/install/.codex/hooks.json` and widened the Codex ownership pattern to claim it. Every other precondition already held — Codex's payload carries `tool_name: "Bash"`, `tool_input.command`, and `session_id`, and `HARNESSES.codex` has a documented `emitDeny` — so Codex git gates fire on `main` today and both sentences are already wrong on their Codex half. Surfaced by Eric as `found-followup-work` on PR #487 pass 5, with Reese naming the two sites.
  - **Alternatives considered:** a new follow-up ticket; folding into that plan's PR 2 task list as a task 16. Rejected — the sites are two sentences inside files B6 already rewrites, which is `.prism/rules/followup-scope.md` § Choosing the vehicle's fold-in case, and a separate task on the other plan would split one paragraph's rewrite across two owners.
  - **Implementation guidance:** running that plan's tasks 9–14 verbatim would leave both sentences standing and grade its AC-9 UNMET a second time. B6 names both sites explicitly so the sweep cannot miss them, and asks for the honest negative the ADR guide requires — say what each host does *not* get, rather than replacing one over-claim with another.
  - → no promotion needed (a correction to two sentences; the corrected sentences are themselves the durable record).

---

## History

- 2026-09-07 [huntermcgrew/issue-488-git-gates]: Issue #488 filed; branch cut from `origin/main` at `f569c57`; plan seeded with D1–D7 and Phase A/B tasks. Design agreed in chat (mechanism, gate strength, push gate, opt-in default); Codex/Cursor confirmed feasible from their hook docs and added as Phase B.
- 2026-09-07 [huntermcgrew/issue-488-git-gates]: Phase A implemented end to end (A1–A17): `lib/shell.mjs` extracted, `git-gates.mjs` runtime with both gates, Claude registration and delivery, config schema + PRISM's own opt-in, doctor lines, `cleanup-pass.md`, shipping-flow step 2, ADR-0076, and four test suites. `pnpm prism:check` green on Windows with no new failures; scratch-consumer adopt → update ×2 is a byte-stable no-op; see Decisions D8–D10 for what the plan's spec had to bend on.
- 2026-09-07 [huntermcgrew/issue-488-git-gates]: Review loop run (loopBase `a00829d5`): Briar pass 1 found the `-C` commit-key gap, Eric pass 1 its push-side twin; both closed by scoping each gate's config to the repo the call runs in (`b48654ad`, `b13118c4`). Both phases subject-clean on the next pass under the one-pass exit (D11); Eric resolved his thread and labeled `confidence:high`; PR #489 stays draft for the human gate.
- 2026-09-08 [huntermcgrew/prism-488-followup-windows-ci-toplevel]: Root-caused the Windows-CI-only `git-gates.test.ts` nested-repo failure; the config-root walk's stop boundary compares two spellings of one directory as text, so a short-name `TEMP` disables nested-repo isolation. See Debugged Issues: Nested-repo isolation fails when the same directory is spelled two ways.
- 2026-09-08 [huntermcgrew/prism-488-followup-windows-ci-toplevel]: Fixed the nested-repo isolation bug — `findConfigRoot` canonicalizes `startDir`/`stopDir` via `realpathSync.native` before the inclusive-stop compare, plus a symlink-based regression test and two now-necessary fixes to the pre-existing `findConfigRoot` test's spelling-dependent assertions. `pnpm prism:check` green, and the suite re-verified green under an artificially short-named `TMP`/`TEMP` reproducing the CI condition. See Debugged Issues for the full fix note.
- 2026-09-08 [huntermcgrew/prism-488-followup-windows-ci-toplevel]: Fixed Eric's three PR #491 Minors — two changelog-voice comments in `git-gates.test.ts` reworded to state the current invariant, the EPERM branch now calls `t.skip()` instead of a bare `return`, and `resolveCanonicalDir`'s JSDoc cites `resolveSegmentDir`'s unvalidated `-C` path as the production caller instead of only the unit test. `pnpm prism:check` green (900/902, 2 skipped by design, 0 fail).
- 2026-09-08 [huntermcgrew/prism-488-followup-codex-cursor-gates]: Re-planned Phase B against `origin/main` at `22bd24d7` — PR #487 shipped most of the original B1–B4, so what remains is Cursor end to end plus the Codex git-gates lines doctor still misses. Cursor's hook entry shape turned out flat rather than the nested shape Claude and Codex share, which adds an entry-shape seam to B3 and B4; see Decisions D12–D13.

---

## Sessions

- 2026-09-07 [huntermcgrew/issue-488-git-gates] open: Intent — ship Phase A (A1–A17) as one reviewable draft PR; Bounds — done is `prism:check` green plus a draft PR, Phase B untouched, the six pre-existing untracked files left out of every commit; Approach — plan order A1→A17 with the runtime smoke-tested in a scratch repo before the delivery wiring · close: scope held — every write is under a Phase A task, the one addition (D9's `unquote` move) came from the cleanup pass on this diff
- 2026-09-07 [huntermcgrew/issue-488-git-gates] open: Intent — Briar self-review pass 1 of the review loop over the full Phase A diff (`origin/main...a00829d5`); Bounds — done is Review Issues/Cleanup Items/PR Readiness written to this plan plus a chat quick-scan checklist, no code changes, the six pre-existing untracked files never staged; Approach — read the diff by file group (runtime, delivery, tests, prose/ADR), re-derive the `detectGitSegments` table by hand, re-run `pnpm prism:build`/`pnpm prism:check` · close: scope held — one Minor finding filed (commit-gate HEAD tracking under `git -C <dir>`), all nine review angles swept or n/a, no code touched
- 2026-09-07 [huntermcgrew/issue-488-git-gates] open: Intent — Briar self-review pass 2, dispatched by Clove after `b48654ad` fixed the pass-1 Minor; Bounds — repair surface (`a00829d5..HEAD`) held to the four-anchor regression bar, subject surface (`f569c57c..a00829d5`) re-swept in full, ledger sections out of scope, no code changes, the six pre-existing untracked files never staged; Approach — read the fix diff, independently re-derive the `-C` chain resolution and five `detectGitSegments` rows by hand, re-run the git-gates/hook-gate suites, type-check, and `pnpm prism:build` · close: scope held — pass-1 finding confirmed fixed and closed, no new findings, all nine angles swept or n/a
- 2026-09-08 [huntermcgrew/prism-488-followup-windows-ci-toplevel] open: Intent — root-cause the Windows-runner-only failure of the `-C into a separate nested repo` test; Bounds — done is a graded `## Debugged Issues` entry with a named fix and suggested test, no source file touched, no fix written; Approach — deduce the boundary from the code path, then reproduce locally by pointing `TMP`/`TEMP` at an 8.3 short-name directory · close: scope held — the plan file is the only write, the repro ran outside the repo, and the recommended fix is named but not applied
- 2026-09-08 [huntermcgrew/prism-488-followup-windows-ci-toplevel] open: Intent — implement Sasha's diagnosed fix for the nested-repo config-root bug and add the suggested regression test; Bounds — done is `findConfigRoot` canonicalized, `pnpm prism:check` green, a draft PR opened, no unrelated files touched; Approach — verify the diagnosis against source first, apply `realpathSync.native` canonicalization matching the codebase's existing `consumer-root.test.ts` precedent, then run the new test red-then-green against the pre-fix code · close: scope held — only `git-gates.mjs` and `git-gates.test.ts` changed; found and fixed an additional gap the diagnosis didn't name (two pre-existing test assertions broken by the same canonicalization), verified against both normal and an artificially short-named `TMP`/`TEMP`
- 2026-09-08 [huntermcgrew/prism-488-followup-windows-ci-toplevel] open: Intent — fix Eric's three Minor findings from PR #491 pass 1 (two changelog-voice comments, an EPERM branch reporting pass instead of skip, a JSDoc citing the wrong caller); Bounds — done is all three ## Review Issues entries marked fixed, `pnpm prism:check` green, one review-fix commit pushed, no unrelated files touched; Approach — verify each finding against the cited lines before editing, apply the minimal wording/behavior fix, re-run the git-gates suite and the full check · close: scope held — only `git-gates.test.ts` and `git-gates.mjs` changed, exactly the three cited findings, all local-frame comment/JSDoc/test-reporting fixes with no design tradeoff
- 2026-09-08 [huntermcgrew/prism-488-followup-codex-cursor-gates] open: Intent — re-plan Phase B so every task describes work that still exists after PR #487, and fold Eric's two stale git-gates statements into B6; Bounds — done is `.prism/plans/issue-488.md` rewritten at the implementation-task-detail bar with D12/D13 and an AC-10 evidence proposal, no source file touched, one plan-only commit, the six pre-existing untracked files never staged; Approach — verify each post-#487 claim against source before relying on it, fetch Cursor's hooks docs as authoritative, keep the B5/B6 numbering stable so AC-11's citation still resolves · close: scope held — the plan file is the only write; Cursor's flat entry shape was the one finding that reshaped tasks rather than trimming them

---

## Debugged Issues

### git-gates test temp dir fails to remove on Windows after the timeout case

- **Status:** `fixed`
- **Severity:** Low
- **Confidence:** `High`
- **Environment:** Windows 11, `node --test scripts/ai-skills/git-gates.test.ts`, one run in three
- **File:** `scripts/ai-skills/git-gates.test.ts:31`
- **Root cause:** `[Confirmed]` — the lint child `spawnSync` kills on timeout can still hold the scratch cwd open when the fixture's `fs.rm` runs, so `rmdir` returns `EBUSY`.
- **Steps to Reproduce:**
  1. Run the suite repeatedly on Windows; the `timed out` case intermittently fails on teardown.
- **Expected behavior:** teardown removes the temp dir every run.
- **Actual behavior:** `EBUSY: resource busy or locked, rmdir` on roughly one run in three.
- **Recommended fix:** `fs.rm(..., { maxRetries: 10, retryDelay: 200 })` in the fixture (applied). Fixed in: this branch, `git-gates.test.ts` `withTempRepo`.
- **Suggested tests:** none needed — the fixture is the test's own scaffolding.
- **Ticket:** `N/A`

---

### Nested-repo isolation fails when the same directory is spelled two ways

- **Status:** `fixed`
- **Severity:** High
- **Confidence:** `High`
- **Environment:** GitHub `windows-latest` runner (`pnpm prism:check`, `main` at `972c7757`, run 34192646364; same failure on PR #487's and #459's Windows legs). Reproduced on Windows 11 by pointing `TMP`/`TEMP` at an 8.3 short-name directory. Green on ubuntu everywhere, and green on Windows whenever `TEMP` is already the long form.
- **File:** `scripts/ai-skills/hooks/git-gates.mjs:202` (`findConfigRoot`'s inclusive-stop check) and `:497` (`resolveGateContext`, which pairs it with `resolveGitToplevel` at `:221`)
- **Root cause:** `[Confirmed]` — `resolveGateContext` compares two independently-produced spellings of the same directory as plain text: the walk's `startDir` comes from `path.resolve` over the harness payload's `cwd`, while `stopDir` comes from `git rev-parse --show-toplevel`, which always returns the long canonical form regardless of the spelling of the cwd it was run in — so `path.relative(stopDir, dir) === ""` never fires, the walk climbs past the nested repo's toplevel, and the enclosing repo's `.ai-skills/config.json` governs the nested repo.
- **Steps to Reproduce:**
  1. On Windows, create a temp directory whose name is longer than 8 characters and take its 8.3 short form (`(New-Object -ComObject Scripting.FileSystemObject).GetFolder($p).ShortPath`).
  2. Set `TMP` and `TEMP` to that short form, so `os.tmpdir()` — and therefore the test fixture's repo root and the payload `cwd` — carries the short spelling.
  3. Run `npx tsx --test scripts/ai-skills/git-gates.test.ts`. Result: 19 pass, 1 fail. Re-run with `TMP`/`TEMP` set to the long form of the same directory: 20 pass, 0 fail.
- **Expected behavior:** a `git -C sub commit` into a separate nested repo with no config of its own is governed by no config — the walk stops at the nested repo's own toplevel.
- **Actual behavior:** the walk reaches the enclosing repo's config, so the enclosing repo's `commitCleanupPass` holds the nested repo's commit (and, on the push side, the enclosing repo's `commands.lint` would run for a push of the nested repo — the exact reach D-level review closed in `b48654ad`/`b13118c4`).
- **Refuted hypotheses:**
  - Drive-letter or separator case difference — refuted by measurement: `path.relative("C:\\a", "c:\\a")` is `""` (Node's win32 `relative` compares case-insensitively), and `path.resolve` already folds `/` to `\`, so neither spelling difference can reach the comparison.
  - `git rev-parse` failing inside the nested repo (a `safe.directory` refusal) so `stopDir` is `null` — refuted by the CI log: the run reports `# fail 1`, and every other git-gates test that shells out to `git` in the same temp tree passes, including the fixture's own `git init` / `git commit` in the nested directory. A repo the test process just created is not owned by another user, and the checkout step's `safe.directory` entry names only `D:\a\PRISM\PRISM`.
  - The inclusive-stop comparison is simply wrong — refuted: the `findConfigRoot` unit test (`git-gates.test.ts:495`) exercises the same stop check and passes on the runner, because it builds both arguments from the same `os.tmpdir()` string. The defect is the mismatch between two producers, not the check.
- **Recommended fix:** canonicalize both sides before comparing, inside `findConfigRoot`. Resolve `startDir` and `stopDir` through one helper that calls `fs.realpath.native` (on Windows this expands 8.3 short names and resolves junctions; on POSIX it resolves symlinks) and falls back to `path.resolve` when the call throws, then keep the existing `path.relative(...) === ""` check. The fallback is required, not defensive: `findConfigRoot`'s own unit test passes a directory that does not exist (`path.join(os.tmpdir(), "prism-no-config-here")`), and `realpath` on a missing path throws `ENOENT`. `resolveGitToplevel` already returns `path.resolve(toplevel)`, which is canonical, so it needs no change. Rejected alternative: setting `TMP`/`TEMP` to the long form in the Windows CI job — that repaints CI green while leaving the production defect live for any consumer whose repo is reached through a short name, a junction, a `subst` drive, or a symlinked checkout. **Fixed in:** `git-gates.mjs`'s new `resolveCanonicalDir` helper (`realpathSync.native`, matching the precedent already in `consumer-root.test.ts`'s `makeTempRoot`), called on `startDir` once and `stopDir` once before the walk starts — not re-run per loop iteration, since a realpath'd path stays canonical as `path.dirname` walks it upward. Considered switching to the already-imported `fs.promises.realpath` instead of adding the `node:fs` sync import — a probe confirmed it also expands 8.3 short names on this Node build — but kept `realpathSync.native` for consistency with the existing precedent rather than adding a second solution to the same problem.
- **Suggested tests:** a `findConfigRoot` unit case pinning the inclusive stop when its two arguments are different spellings of one directory. Build the second spelling with a symlink — `fs.symlink(target, link, "junction")` on Windows, `"dir"` elsewhere — so the case runs on both platforms and does not depend on 8.3 being enabled on the volume: assert `findConfigRoot(<link>/sub, <realpath of link>/sub)` returns `null` while a config sits above the link. The existing `-C into a separate nested repo` arm test then covers the integration path unchanged. **Added as written**, plus one gap the original suggestion didn't cover: canonicalizing `findConfigRoot`'s return value broke the pre-existing `findConfigRoot: walks up from a subdirectory…` test's two assertions that compared the result against the raw (non-canonical) `mkdtemp` output — a real regression this fix would have reintroduced on any runner whose own temp dir is short-form (the exact CI condition), since that test's assumption held only by accident before. Both assertions now compare against `realpathSync.native(root)` instead.
- **Ticket:** `not synced`

---

## Review Issues

### Commit-gate HEAD tracking is scoped to `configRoot`, not to a `git -C <dir>` target

- **Severity:** `minor`
- **Status:** `fixed` — Fixed in: `detectGitSegments` now returns `{ subcommand, directories }` with every `-C` value; `runGitGatesArm` resolves the chain against `payload.cwd` and `resolveHeadKey` runs there. New test: a `-C` commit into a separate nested repo is keyed on that repo's HEAD. `--git-dir`/`--work-tree` remain an accepted gap, named in `resolveGitInvocation`'s JSDoc.
- **File:** `scripts/ai-skills/hooks/git-gates.mjs:276-289,312-331`
- **Problem:** `detectGitSegments` correctly recognizes `git -C <dir> commit ...` as a commit segment (per the A17 test table), but `runCommitGate` always calls `resolveHeadKey(configRoot)` — the repo root found by walking up from `payload.cwd`, never the `-C` target directory. When `<dir>` is a genuinely separate git repository (a nested repo, not just a subdirectory of the same repo — the common `-C packages/foo` case is unaffected because it shares `configRoot`'s `.git`), the hold is recorded against `configRoot`'s HEAD, which never changes when the commit lands in `<dir>`. After the first hold on that unrelated HEAD, the state file marks it "seen," so every subsequent `-C <dir>` commit to that separate repo in the same session silently skips the cleanup-pass hold. Fails open (no security impact) and the trigger is narrow — PRISM's own repo has no nested git repos — but it's a real gap the three documented gaps in ADR-0076 § Consequences (a command built from a variable, a `cd` into a subrepo, the heredoc-quote edge case) don't cover.
- **Suggested fix:** Either resolve the `-C` target directory from the command tokens and use it for `resolveHeadKey`/the state-file scope, or document the gap explicitly in ADR-0076 § Consequences and `install-layout.md` § Git gates alongside the other three. Given how narrow the trigger is, documenting it is likely the better cost/benefit — Clove's call.

No issues found — 2026-09-07 [huntermcgrew/issue-488-git-gates] (pass 2 — repair-surface + subject re-sweep)

### Push gate runs the enclosing config's commands for a `git -C <nested-repo> push`

- **Severity:** `minor`
- **Status:** `fixed` — Fixed in: both gates now resolve their config from the segment's own directory (`cwd` + `-C` chain) bounded by that repo's git toplevel (`resolveGateContext`, `findConfigRoot(startDir, stopDir)`), so a separate nested repo is governed by its own config or by none; the commit-side scope from Briar's finding falls out of the same change. Tests: nested repo without config → both gates inert; with its own config → its own HEAD key, its own `.prism` state, its own lint; `-C packages/app` inside the same repo → root config.
- **File:** `scripts/ai-skills/hooks/git-gates.mjs:513-515` (at `b48654ad`)
- **Problem:** Eric (PR #489, pass 1): `runPushGate` always ran `commands.lint`/`commands.format` at the config root even when the push's `-C` chain targeted a separate nested repo — the push-side twin of Briar's commit-side finding.
- **Suggested fix:** resolve the push's own directory from `push.directories`, or document the asymmetry. Resolved by scoping the config lookup instead — running the enclosing repo's commands inside a different repo would have been wrong in either directory.

### Angle Coverage (pass 2)

- Runtime behavior — swept — repair surface: independently re-derived `resolveGitInvocation`'s `-C` accumulation and the `path.resolve` chain in `runGitGatesArm` against git's own "each `-C` relative to the previous" semantics; re-ran five `detectGitSegments` rows by hand against the fixed code (`git -C sub commit -m x`, `--amend --no-edit`, `push --delete`, the `MSYS_NO_PATHCONV=1` env-prefix form, the `commit && push` one-liner) — all match. Confirmed `resolveHeadKey` now runs at `commitDir` (resolved from `cwd` plus the `-C` chain), not `configRoot`, closing the pass-1 finding. Subject re-sweep found nothing pass 1 missed.
- Test efficacy — swept — new test `commit gate: a -C commit into a separate nested repo is keyed on that repo's HEAD, not the config root's` asserts on the hold/retry/new-HEAD sequence against a genuinely separate nested repo, the exact scenario the pass-1 finding named; would fail if `commitDir` resolution regressed. New `detectGitSegments` `-C` test covers multi-`-C` ordering and a quoted `-C "a dir"` value.
- Spec and doc consistency — n/a for the repair surface (no doc changes in this diff); AC-1 through AC-13 still hold against the fixed runtime.
- Citation integrity — n/a for the repair surface.
- External-system claims — n/a for the repair surface.
- Repo writing rules — swept — JSDoc on `GitGateSegment`, `resolveGitInvocation`, and `resolveHeadKey` states the reason per `code-comments.md`; no drive-by changes outside the fix's frame.
- Security — n/a — same local opt-in gate, no new trust boundary.
- Docs impact — n/a for the repair surface.
- Accessibility — n/a.

Verification re-run this pass: `node --test scripts/ai-skills/git-gates.test.ts` (19/19 pass), `node --test scripts/ai-skills/hook-gate.test.ts` (87/87 pass, 1 skipped by design), `pnpm run prism:check-types` (clean), `pnpm prism:build` (899/900 pass, 1 skipped, 0 fail). `git status -s` confirmed no untracked/staged surprises beyond the six pre-existing untracked files.

### Angle Coverage

- Runtime behavior — swept — 14 items enumerated, 14 verdicts
  - `resolveGitInvocation` (env/`-C`/`-c`/`--git-dir`/`--work-tree` skip loop) — correct against every A17 table row I traced by hand, including the flags-only case (`git --version`) returning `null`
  - `detectGitSegments` (commit/push recognition, `--delete`/`-d` exclusion) — correct
  - `runCommitGate` HEAD-scoping under `git -C <dir>` — incorrect for a genuinely separate nested repo (see Review Issues above); correct for the common same-repo `-C` idiom
  - `runGitGatesArm` short-circuit order (commit deny returned before push is evaluated) — correct, and the one-liner test (`git commit && git push`) confirms it
  - `saveGateState`/`loadGateState` atomic tmp-then-rename — mirrors `architect-route.mjs`'s established pattern; correct
  - `runPushGate` sequential lint-then-format, `shell: true` for Windows `.cmd` shims — correct
  - `formatOutputTail` byte-boundary tail cut — can in principle split a multi-byte UTF-8 char at the cut point, but the following `firstLineBreak` discard removes the corrupted partial line in every case except a single unbroken line longer than `MAX_EMISSION_BYTES`; too narrow to file separately
  - POSIX/`cmd.exe` "command not found" detection (`POSIX_COMMAND_NOT_FOUND_STATUS`, `CMD_EXE_COMMAND_NOT_FOUND`) — correct per D8, ran the reasoning against both shell families
  - `pruneStaleRouteState(configRoot, filePrefix)` new parameter, default preserved — verified the one existing caller (`architect-route.mjs:419`) still passes no second argument
  - `harnesses.mjs` `emitAllow` (claude real envelope; cursor/codex stubs return `null`) — correct, mirrors `emitDeny`'s existing shape
  - `hook.mjs` → `lib/shell.mjs` extraction (`splitShellSegments`, `unquote`, `readHeredocDelimiter`, `skipHeredocBodies`) — moved verbatim, `hook.mjs` re-imports; confirmed via diff
  - `update.ts` `PRISM_HOOK_COMMAND_PATTERN`, `HOOK_RUNTIME_FILES`, `HOOK_RUNTIME_ENTRY_POINTS`, `HOOK_STATE_GITIGNORE_LINES` — all four additions correct and idempotent per the new tests
  - `doctor.ts` `checkHookRegistration`/`describeGitGates` — info/warning lines gated on `registeredPaths.has(gitGatesRuntimePath)` rather than unconditionally inside the `hosts.includes("claude")` branch as the plan's task A9(b) literally reads; a deliberate, reasonable narrowing (avoids an "off" message when the runtime was never even delivered) rather than a bug — not filed as a finding
  - Subcommand-token quoting (`git 'commit' -m x` would not match, since only the head token is `unquote()`-ed) — mirrors an existing, accepted pattern in `hook.mjs:571`'s own git-subcommand check, which has the same gap; not a regression introduced here
- Test efficacy — swept — 9 items enumerated, 9 verdicts
  - `detectGitSegments` table (13 rows) — each row would fail if the corresponding branch in `resolveGitInvocation`/`detectGitSegments` regressed; confirmed by re-deriving the expected output for the trickier rows (`-C sub`, the HEREDOC form, `MSYS_NO_PATHCONV=1`) by hand
  - Commit-gate hold/retry/amend/new-HEAD sequence — asserts on the actual state file contents, not just the return value; would fail if `saveGateState` or `resolveHeadKey` regressed
  - Unborn-repo gating — would fail if the `"unborn"` sentinel path changed
  - Commit-and-push one-liner ordering — would fail if the short-circuit in `runGitGatesArm` were reordered
  - Push-gate deny/allow/timeout/not-found paths — each asserts the specific envelope shape and reason substring, not just null-vs-non-null
  - Push-gate tail-length bound — would fail if `formatOutputTail` stopped bounding
  - Inert-path matrix (no config, no hooks block, both flags off, foreign tool, non-shell tool, either kill switch, malformed config) — each a distinct assertion, would fail if any early-exit branch were removed
  - Spawned entry point argv dispatch (`--event=PreToolUse` only) — would fail if `main()`'s event check regressed
  - `update.test.ts`/`hook-gate.test.ts`/`doctor.test.ts` additions (idempotent registration, older-PRISM upgrade path, wrapper-not-claimed, gitignore lines, doctor info/warning lines) — each asserts a specific, falsifiable shape
  - No test exercises the `-C <dir>` cross-repo HEAD-tracking gap from the Review Issues finding above — a real gap in coverage, consistent with the implementation gap it would have caught
- Spec and doc consistency — swept — 4 items enumerated, 4 verdicts
  - AC-1 through AC-13 — each traced against the actual `git-gates.mjs` behavior and the `git-gates.test.ts`/`doctor.test.ts` coverage; all hold as written
  - `cleanup-pass.md`, `shipping-flow.md` step 2/7, `verification-commands.md` § Git gates, and its curated twin under `templates/install/` — all four describe the identical hold-once-per-HEAD and push-verification rules (AC-13); confirmed by diffing the curated twin against the canonical section
  - `shipping-flow.md` step renumbering (1–6 → 1–7, steps 2–8 → 3–9, all four "step 4 returned" → "step 5 returned" cross-references, "step 7" → "step 8") — every occurrence updated correctly, no dangling reference
  - `install-layout.md` § Git gates and § Hook runtime additions — checked claim-by-claim against `git-gates.mjs`, `update.ts`, and `.gitignore`; all verified (see Doc-Class Triage below)
- Citation integrity — swept — 6 items enumerated, 6 verdicts
  - ADR-0076's citations to ADR-0069, ADR-0072, ADR-0074, and `epic-floor-revert.md` — each cited claim (report-back channel closed, habituation measurement, Claude-only reach with prose fallback, "separate, smaller opt-in") matches what those documents actually say per prior review context
  - `install-layout.md` § Git gates's pointer to ADR-0076 — resolves
  - The plan's task A1 line-number citations (`hook.mjs:301`, `:406`, `:443`) — pre-diff line numbers, unverifiable against the current tree post-move; not a diff defect, just noting the citation is now historical
  - `.prism/rules/code-standards.md` § Refactor scope citation in `cleanup-pass.md` — resolves, section exists
  - `.prism/rules/code-comments.md` Delete Test citation in `cleanup-pass.md` — resolves
  - `.prism/rules/writing-voice.md` § Anti-pattern: Session-context leakage citation in `shipping-flow.md`'s new table column — resolves
- External-system claims — swept — 3 items enumerated, 3 verdicts
  - Claude Code's `PreToolUse` command-hook default timeout (600s) cited in A6/the config schema description — this is a host-platform claim I could not independently verify against Claude Code's own docs from inside this repo; treated as inherited from the pre-existing write-gate's identical claim in `install-layout.md`, not newly asserted by this diff
  - `spawnSync`'s `shell: true` Windows `.cmd`-shim behavior — verified directly: `pnpm prism:check` passed on this Windows machine with the push-gate tests exercising real `pnpm`/`node` invocations under `shell: true`
  - POSIX exit 127 / `cmd.exe`'s "is not recognized" message for a missing binary — the D8 Decision states this was "measured 2026-09-07"; I did not re-measure it independently, but the `push gate: a command that does not exist allows with an announcement` test passed on this Windows machine, which is a real (if not cross-platform) confirmation of the `cmd.exe` half
- Repo writing rules — swept — verdict-only — JSDoc, inline-comment, and naming conventions in `git-gates.mjs` and `lib/shell.mjs` follow `.prism/rules/code-comments.md` (what+why, no ALL CAPS, no tags); no drive-by refactors outside the diff's local frame
- Security — n/a — the diff adds a local opt-in gate around the agent's own shell tool calls; no new trust boundary, network surface, secret handling, or permission change
- Docs impact — swept — 4 items enumerated, 4 verdicts — `docs/ai-skills/compatibility.md`, `docs/parameterization.md`, `docs/what-prism-writes.md`, `docs/adopting-into-existing-repos.md` all updated to name the new `git-gates.mjs` entry point and the `hooks` config block; checked each against the corresponding code change
- Accessibility — n/a — no UI in the reviewed range

No issues found — 2026-09-08 [huntermcgrew/prism-488-followup-windows-ci-toplevel] (pass 1 — Windows-CI-toplevel followup, PR #491)

### Angle Coverage (pass 1, PR #491)

- Runtime behavior — swept — 1 item enumerated, 1 verdict
  - `resolveCanonicalDir`/`findConfigRoot`'s canonicalize-then-compare fix — reproduced the reported CI failure directly: built a real Windows 8.3 short-name directory, pointed `TMP`/`TEMP` at it, and reran the suite against the fixed branch (21/21 pass, matching the plan's claim) and against `git-gates.mjs` reverted to `origin/main` under the identical env (18/21 pass — the exact reported test plus the two updated `findConfigRoot` assertions fail, nothing else). Traced every `configRoot` consumer (`loadConsumerConfig`'s `fs.readFile` join, `buildStateFilePath`, `runPushGate`'s `cwd`, the `resolveGateContext` cache key) — a canonical path is valid input to all four, and the cache key change is a strict improvement (two spellings of one directory no longer produce two cache entries). `resolveCanonicalDir` is called once per bound before the walk starts, not per iteration, matching the plan's stated intent.
- Test efficacy — swept — 2 items enumerated, 2 verdicts
  - The new symlink-based inclusive-stop test — confirmed by the same revert-and-rerun above that it fails without the fix (junction-based `sub`/`realSub` spelled two ways, asserted `null`); the EPERM skip-early-return is a documented, narrow concession for locked-down runners and doesn't weaken the primary nested-repo regression test, which covers the same defect end to end.
  - The two updated assertions in the pre-existing `findConfigRoot: walks up from a subdirectory…` test (now comparing against `realpathSync.native(root)` instead of raw `root`) — correct: `findConfigRoot` now always returns the canonical spelling regardless of which spelling `stopDir` carries, so the old raw-`root` expectation was the thing that would have gone wrong on a short-name runner, exactly as the plan's Debugged Issues entry describes.
- Spec and doc consistency — swept — 1 item enumerated, 1 verdict — `install-layout.md` § Git gates's description of the config-root walk ("no further than that repo's own toplevel … governed by its own config or by none") still holds; canonicalization is an internal comparison fix, not a change to the documented contract, so no doc update is needed.
- Citation integrity — swept — 1 item enumerated, 1 verdict — the new JSDoc's and the plan's claim that `realpathSync.native` matches the existing `consumer-root.test.ts` precedent — confirmed: that file imports and calls `realpathSync.native` the same way, for the same reason (8.3 short-name expansion).
- External-system claims — swept — 1 item enumerated, 1 verdict — the root-cause claim that `git rev-parse --show-toplevel` always answers in canonical long form regardless of the cwd's own spelling — not re-derived from git's source, but the revert-and-rerun above is a direct behavioral confirmation rather than borrowed trust: the reverted code reproduces the exact reported failure under a real short-name `TEMP`, and only the fixed code clears it.
- Repo writing rules — swept — verdict-only — `resolveCanonicalDir`'s JSDoc and the updated `findConfigRoot` doc comment follow `code-comments.md` (what+why, no tags, no ALL CAPS); the new test's inline comments explain the symlink and EPERM-skip rationale; no drive-by changes outside the fix's frame.
- Security — n/a — no new trust boundary; same local opt-in gate, now comparing canonicalized paths.
- Docs impact — n/a — no `docs/` changes in this diff, and none needed (see Spec and doc consistency above).
- Accessibility — n/a — no UI in the diff.

Verification this pass: `pnpm run prism:check-types` (clean), `pnpm run prism:crossref-lint` (clean), `pnpm run prism:test` (900/902 pass, 2 skipped by design, 0 fail), `pnpm run prism:build` (901/902 pass, 1 skipped, 0 fail) — all on a fresh scratch worktree at the PR tip on Windows. Independent repro in the same worktree: `npx tsx --test scripts/ai-skills/git-gates.test.ts` under a real 8.3-short-name `TMP`/`TEMP` — 21/21 pass on the fixed branch, 18/21 pass (3 failing, matching the CI report plus the two now-necessary assertion updates) with `git-gates.mjs` reverted to `origin/main` under the identical env. `git status -s` on the PR branch worktree: clean.

### Changelog-voice comments in the canonicalization test

- **Severity:** `minor`
- **Status:** `fixed` — Fixed in: dropped "now" from the `findConfigRoot` comment and reworded the `realSub` comment from "used to treat" to a plain statement of the current invariant.
- **File:** `scripts/ai-skills/git-gates.test.ts:501,543`
- **Problem:** Eric (PR #491, pass 1 — GitHub review, after Briar's self-review above): two comments described the change rather than the current code — "findConfigRoot NOW canonicalizes internally" and "the two spellings a bare `path.relative` comparison used to treat as different directories" — changelog voice per `.prism/rules/code-comments.md` § Not Allowed.
- **Suggested fix:** state the invariant that makes the current code correct; let git history carry the migration story.

### EPERM branch in the junction test passes with zero assertions instead of skipping

- **Severity:** `minor`
- **Status:** `fixed` — Fixed in: the test now takes the `t` context parameter and calls `t.skip(...)` before the early `return`, so a junction-refusing runner reports skipped rather than passed.
- **File:** `scripts/ai-skills/git-gates.test.ts:521-535`
- **Problem:** Eric (PR #491, pass 1): the `EPERM` branch did a bare `return`, which node:test reports as a pass with zero assertions rather than a skip — on a junction-refusing runner the regression guard for this CI-only bug would report green while asserting nothing. The `-C into a separate nested repo` test covers the same defect end to end, so this was a reporting-honesty gap, not a coverage hole.
- **Suggested fix:** call `t.skip()` with a reason, taking `t` as the test callback's parameter.

### resolveCanonicalDir's JSDoc cites the unit test, not the production path that needs the fallback

- **Severity:** `minor`
- **Status:** `fixed` — Fixed in: JSDoc now names `resolveSegmentDir`'s unvalidated `-C` directory building as the production path that can hand `findConfigRoot` a `startDir` not on disk.
- **File:** `scripts/ai-skills/hooks/git-gates.mjs:183-185`
- **Problem:** Eric (PR #491, pass 1): the fallback's justification cited `findConfigRoot`'s own unit test rather than the production path that needs it — `resolveSegmentDir` never validates the directories it builds from `-C` tokens, so `git -C does-not-exist commit` reaches the walk with a nonexistent `startDir`. The framing invited a future reader to drop the catch as test scaffolding. Bounded today because `runGitGatesArm`'s catch-all fails open.
- **Suggested fix:** name the production caller, not just the test.

Verification after these three fixes: `node --test scripts/ai-skills/git-gates.test.ts` (21/21 pass, 0 skipped — this machine's junction creation succeeds so the EPERM branch didn't fire), `pnpm run prism:check-types` (clean), `pnpm run prism:check` (exit 0; 900/902 pass, 2 skipped by design, 0 fail across the full suite).

---

## Acceptance Criteria

### Behavioral

**Background:** A repo with `.ai-skills/config.json` carrying `"hooks": {"commitCleanupPass": true, "pushVerification": true}`, `commands.lint` set, and the git-gates hook registered for the host in use.

- [ ] **AC-1** When the agent runs `git commit` for the first time on the current HEAD, Then the commit is held and the agent is told to read the cleanup-pass reference and re-run the commit (REQ-1)
  - Evidence (machine): pipe `{"session_id":"s1","cwd":"<root>","tool_name":"Bash","tool_input":{"command":"git commit -m \"x\""}}` into `node scripts/ai-skills/hooks/git-gates.mjs --tool=claude --event=PreToolUse` → stdout is a `permissionDecision: "deny"` envelope whose reason contains `cat .prism/references/cleanup-pass.md` · UNMET looks like: empty stdout or an `allow` envelope
- [ ] **AC-2** When the agent re-runs the same `git commit` on the same HEAD, Then the commit goes through (REQ-1)
  - Evidence (machine): repeat the AC-1 pipe with the same `session_id` → empty stdout, exit 0 · UNMET looks like: a second deny
- [ ] **AC-3** When a new commit has landed and the agent runs `git commit` again, Then the hold fires once more (REQ-1)
  - Evidence (machine): `git commit --allow-empty -m t`, then the AC-1 pipe → deny envelope · UNMET looks like: empty stdout
- [ ] **AC-4** When the agent runs `git push` and the lint command exits non-zero, Then the push is denied and the agent sees the last lines of the lint output (REQ-2)
  - Evidence (machine): set `commands.lint` to `node -e "console.log('boom'); process.exit(3)"`, pipe a `git push -q` payload → deny envelope whose reason contains `exited 3` and `boom` · UNMET looks like: empty stdout or a reason without the output tail
- [ ] **AC-5** When the agent runs `git push` and lint and format both pass, Then the push goes through with no message (REQ-2)
  - Evidence (machine): `commands.lint` = `node -e "0"`, pipe a `git push` payload → empty stdout · UNMET looks like: any envelope
- [ ] **AC-6** When the lint command exceeds the configured budget, Then the push is allowed and the agent is told the check did not finish (REQ-2)
  - Evidence (machine): `pushVerificationTimeoutMs: 100`, `commands.lint` = `node -e "setTimeout(()=>{},5000)"` → `permissionDecision: "allow"` envelope whose reason contains `timed out`; stderr carries the same line · UNMET looks like: a deny, or an empty stdout with no stderr line
- [ ] **AC-7** Given the config has no `hooks` block, When the agent runs `git commit` or `git push`, Then nothing is held (REQ-3)
  - Evidence (machine): remove `hooks` from the config, run the AC-1 and AC-4 pipes → empty stdout both times · UNMET looks like: any envelope
- [ ] **AC-8** Given `PRISM_HOOK_DISABLE=1` is set, When the agent runs `git commit`, Then nothing is held (REQ-3)
  - Evidence (machine): `PRISM_HOOK_DISABLE=1` + AC-1 pipe → empty stdout · UNMET looks like: a deny
- [ ] **AC-9** Given a consumer runs `prism update` with `claude` in `hosts`, When the update finishes, Then the git-gates hook is on disk, registered, and its state files are git-ignored (REQ-4)
  - Evidence (machine): scratch consumer, `update.ts --consumer <dir>` twice → `.claude/hooks/git-gates.mjs` and `lib/shell.mjs` exist with the marker line; `.claude/settings.json` has exactly one `PreToolUse` entry containing `git-gates.mjs`; `.gitignore` carries both `git-gates-state` globs once; second run changes no bytes · UNMET looks like: missing file, duplicate entry, or a diff on the second run
- [ ] **AC-10** Given a consumer lists only `codex` (or only `cursor`) in `hosts`, When Phase B's `prism update` finishes, Then that host's hooks file registers git-gates and no `.claude/` delivery exists (REQ-5)
  - Evidence (machine): scratch consumer with `"hosts":["codex"]` → `.codex/hooks/git-gates.mjs` and `.codex/hooks.json` present, `.claude/hooks/` absent; same for cursor · UNMET looks like: a `.claude/hooks/` tree or a missing registration
- [ ] **AC-11** Given Codex or Cursor is the running host, When the agent runs its first `git commit` on a HEAD, Then the commit is held and the retry passes (REQ-5)
  - Evidence (human): B5 live probe on each host; note the date and outcome in `## Decisions` D7 · UNMET looks like: the commit runs on the first attempt, or the deny message never reaches the agent

### Non-behavioral

- [ ] **AC-12** `pnpm prism:check` is green on a fresh checkout (Windows: only the four pre-existing failures named in `epic-floor-revert.md`) (REQ-6)
  - Evidence (machine): run it → exit 0 (Windows: exactly those four) · UNMET looks like: any new failure
- [ ] **AC-13** The consumer-facing prose names the same behavior the hook enforces — shipping-flow step 2, `cleanup-pass.md`, `verification-commands.md` § Git gates, and the curated seed twin all agree (REQ-6)
  - Evidence (human): read the four; the hold rule and the push rule are stated identically · UNMET looks like: one surface describing a different trigger or scope

### AC Adjustments

- **AC-10 evidence — `proposed` 2026-09-08 (Winston, Phase B re-plan).** The current evidence asserts `.codex/hooks/git-gates.mjs` present and `.claude/hooks/` absent for a Codex-only consumer. Both halves contradict what PR #487 shipped: the runtime is one tree at `.claude/hooks/` serving every host's registration, so a Codex-only or Cursor-only consumer has a `.claude/hooks/` directory **by design** and there is no `.codex/hooks/` directory at all. Graded as written, AC-10 would fail on correct behavior.
  - **Criterion text:** unchanged. What it asserts — that host's registration file registers git-gates, and no other host's delivery appears — is still the right requirement.
  - **Proposed evidence (machine):** scratch consumer with `"hosts":["codex"]` → `.claude/hooks/git-gates.mjs` present, `.codex/hooks.json` registers a command naming it, `.claude/settings.json` carries no PRISM entry; same shape for `"hosts":["cursor"]` against `.cursor/hooks.json`, which also carries `"version": 1` · UNMET looks like: a missing registration, a PRISM entry in a non-listed host's file, or a second copy of the runtime under `.codex/hooks/` or `.cursor/hooks/`.
  - **Why the change is evidence-only:** the requirement did not move; the delivery shape it was written against did. Recording it as a proposal rather than a silent rewrite per `.prism/rules/branch-plan.md` § AC Adjustments — Hunter accepts or rejects before B3 is graded.

- **AC-11 — no change proposed.** It stays behavioral, `Evidence (human)`, and graded by the B5 live probe. B5's scope grew (it now also carries `prism-477-followup-codex-hooks.md` task 8's four Codex write-gate observations, per D12), but nothing AC-11 asserts changed: the first `git commit` on a HEAD is held on Codex and on Cursor, and the retry passes.

### AC Sync Log

| Date | Agent | Action | Plan | Ticket |
| ---- | ----- | ------ | ---- | ------ |

---

## Cleanup Items

- `scripts/ai-skills/hooks/git-gates.mjs` `saveGateState` and `architect-route.mjs` `saveRouteState` — the same tmp-then-rename atomic write at two sites (A5-C asked for the copy). A shared `writeJsonAtomically` in `lib/` would remove it; outside this ticket's frame, Briar's call. Deferring — the duplication is small (a handful of lines) and the two call sites have slightly different failure-handling needs (the commit gate falls open on a save failure; the route-state save does not), so extracting now would need a parameter or two to cover both, which is its own small design call rather than a pure copy-paste removal.

---

## PR Readiness

- [x] No critical or major issues — none found; three Minors from Eric's PR #491 pass 1 fixed (see Review Issues)
- [x] Types correct — no `any`, no unsafe `as`
- [x] No stray console.logs or debug artifacts
- [x] Tests written for new logic and edge cases (symlink-based `findConfigRoot` regression test; confirmed to fail without the fix)
- [x] All debugged issues resolved (no `open` entries)
- [x] Build passes — last run: 2026-09-08 (post-review-fix: `pnpm run prism:check-types` clean, `node --test scripts/ai-skills/git-gates.test.ts` 21/21 pass, `pnpm run prism:check` exit 0 — 900/902 pass, 2 skipped by design, 0 fail)
- [x] PR description up to date
- [x] Lasting decisions promoted to architect context (no new promotable decision — this is a bugfix, not a pattern change)

**Last updated:** 2026-09-08 (Eric's PR #491 pass 1 Minors fixed by Clove; three review-fix edits, all local-frame comment/JSDoc/test-reporting)

---

## Verification (implementer's run sheet)

```bash
pnpm prism:build
pnpm prism:check
```

Hook smoke from the repo root (PRISM's own config enables both gates):

```bash
printf '%s' '{"session_id":"s1","cwd":"'"$PWD"'","tool_name":"Bash","tool_input":{"command":"git commit -m \"x\""}}' | node scripts/ai-skills/hooks/git-gates.mjs --tool=claude --event=PreToolUse
```

Expect the deny envelope; run again → no output. Same with `"git push -q"` → runs crossref-lint, no output on pass. `PRISM_HOOK_DISABLE=1` → no output. Remove `.prism/git-gates-state.s1.json` afterwards.

Scratch consumer: `git init` a temp dir with a minimal config carrying `"hooks":{"commitCleanupPass":true}`; run `npx tsx scripts/ai-skills/update.ts --consumer <dir> --dry-run`, then the real update twice, then `npx tsx scripts/ai-skills/doctor.ts --consumer <dir>`.

Live in Claude Code on this repo: `git commit` held once, `cat` the reference, retry passes; temporarily break `commands.lint`, confirm `git push` is denied with the tail; restore. The cold-start `npm pack` leg of `hook-gate.test.ts` is skipped on Windows and is the only test proving the new files ship — rely on CI's ubuntu leg before merge.

Pre-existing gap, not this ticket: no onboarding question populates `commands.*` although `verification-commands.md` says Atlas does (`question-flow.md` has 12 questions; `onboarding-config.ts` `ORDERED_TOP_LEVEL_KEYS` omits `commands`). File a follow-up issue when Phase A ships.
