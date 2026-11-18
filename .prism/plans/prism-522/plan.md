---
title: Port the chain skills, the workflow block, and approval
ticket: https://github.com/HunterMcGrew/PRISM/issues/522
stage: plan
status: approved
approved_by: Hunter McGrew
approved_at: 2026-11-18
approved_via: chat
---

Child 5 of the Kitchen Line epic (#499). The design comes from the epic spec on `huntermcgrew/prism-499-approve-once` (PR #518), at `.prism/plans/prism-499/spec.md`. The parts that apply are:

- the Children table row 5 and the paragraph saying approval, chat approval, and the guard ship together
- the Skill ID map, Plan folder, "Workflow block and resume table", and Personas sections
- the approve-guard row of "Agent hooks", "AGENTS.md and Codex", and "Always-on rule edits"
- the Child 5 entry under "Carried in from the 2026-11-18 tips"

The thrive reference is TracTru/thrive at `db3570975431fa1d6114cc5f4170c126f6be7e97`.

**Goal:** a ticket runs on a plan folder from a typed `approve` on its intent to committed task bundles with no person starting a stage, and an agent that runs the approval script without a fresh chat approval is denied.

## Tasks

Parallel groups, listed per stack PR so PR A's commits form a prefix of the branch. Each group's tasks touch disjoint files, and no task runs beside one that edits a file its own files import. Tasks that edit `roles.json`, `skill-routing.md`, `skills-ecosystem.md`, or `AGENTS.md` are chained by `depends on`, because those files are shared. The groups were checked with child 4's `analyzeBundles` on 2026-11-18, one stack PR at a time. This plan is not driven by `bundles.mjs` itself, for the reason in the first Decision.

PR A, the approval mechanics (T1 to T8, and T25):

- Group 1: T1, T2, T25
- Group 2: T3
- Group 3: T4
- Group 4: T5
- Group 5: T6
- Group 6: T7, T8

PR B, the skills, rules, and docs (T9 to T24), built after every PR A task is committed:

- Group 7: T9, T10, T17, T18
- Group 8: T11, T20
- Group 9: T12, T23
- Group 10: T13
- Group 11: T14
- Group 12: T15
- Group 13: T16
- Group 14: T19
- Group 15: T21, T24
- Group 16: T22

The bundle check adds import edges from T5 and T6 to T9 and T10, because `update.ts` imports `generate-skills.ts` and `agents-md-block.ts`. Those edges only keep two tasks from running side by side, and the stack order already does that, since every PR A task is committed before any PR B task starts.

Every task is Clove's except T8 and T24, which are Eli's. These conventions hold for every task:

- **Precondition.** Children 2 (#516), 3 (#519), and 4 (#520) are merged to `main`, as 7ded6ecb, 8e1dabc7, and bd666c58. Start the build with `git merge origin/main`. Stop and report the build as blocked if any of these is missing on `main`:
  - `readRepoConfig` in `scripts/ai-skills/hooks/lib/command.mjs`
  - `AGENTS_MD_LEAD_RULES` in `scripts/ai-skills/agents-md-block.ts`
  - `scripts/ai-skills/hooks/plan/frontmatter.mjs`
  - `scripts/ai-skills/hooks/lib/tokenize.mjs`
  - `.prism/templates/intent.md`
- **Reading thrive.** `gh api "repos/TracTru/thrive/contents/<path>?ref=db3570975431fa1d6114cc5f4170c126f6be7e97" -q .content | base64 -d`. "Port" means copy the file and change only the swaps the task names, plus the JSDoc types `checkJs` asks for.
- **Swaps that apply to every port.**
  - `.ai-spec/` becomes `.prism/`, and `.ai-spec/plans/archive` becomes `.prism/archived/plans`.
  - `thrive-<stage>` becomes the PRISM id from the spec's Skill ID map, and `thrive-devils-advocate` becomes `prism-challenge`.
  - `thrive-chat-approval.json` becomes `prism-chat-approval.json`, and a `thrive.*` git-config key becomes `${PROJECT_LOWERCASE}.*` in skill text.
  - "Linear parent" becomes "tracker parent". `THRN-1` and `THR-123` test ids become `acme-1` and `ACME-123`. The container name `thrive-admin-1` becomes `app-1`.
- **Runtime modules** follow child 4's rule:
  - the three-line `@prism-hook-runtime` header from `scripts/ai-skills/hooks/lib/match.mjs`
  - `node:` builtins and sibling runtime modules only
  - a `.d.mts` sidecar
  - `pnpm prism:check-types` passing
- **Tests** are top-level `scripts/ai-skills/<name>.test.ts` files using `node:test` and `node:assert/strict`, ported case for case.
  - Fixture git repos set `GIT_CONFIG_NOSYSTEM=1` and point `GIT_CONFIG_GLOBAL` at an empty temp file.
  - A symlink case skips on `win32` when `symlinkSync` throws `EPERM`.
  - Spawned processes get an env with every host marker deleted: `CLAUDECODE`, `CLAUDE_CODE_SESSION_ID`, `CODEX_THREAD_ID`, `CODEX_SESSION_ID`, `CODEX_CI`, `PRISM_HOOK_DISABLE`, and `PRISM_HOOK_DENY_DISABLE`. A case that needs a marker sets it explicitly.
- **Skill line budgets.** Every skill this child writes stays at or under the 120-line loaded-line cap that `scripts/ai-skills/skill-loaded-lines.test.ts` enforces.
  - A skill's budget for its own body is 120 minus the lines of every file it cites. A rule is charged only when it is `load: skill`.
  - Cut content that fails the four skill tests. Never move it into an uncited file to dodge the count, because the intent rules that out.
  - Measure with `measureSkillLoad` from `scripts/ai-skills/lib/skill-loaded-lines.ts`.
- **Shared mechanics live in the workflow rule.** Stage order, stops, approval, caps, the build report, and the resume table live in `.prism/rules/workflow.md` (T10). That rule is `load: always`, so citing it costs a skill nothing. A skill points at the workflow rule rather than restating any of these.
- **Script paths in skill and rule text** are spelled `${HOOK_RUNTIME_DIR}/plan/<name>.mjs` (T1). That renders as `scripts/ai-skills/hooks` in PRISM and `.claude/hooks` in a consumer.
- **Chain-script exit codes** follow the Invocation section of `plan-chain-scripts.md`: 0 on success, 1 when one of the script's own conditions fails, and 2 on a usage or config error. `commit.mjs` also passes any other git failure through with git's code. Skill and rule text routes them apart. Exit 1 is a condition the stage handles, such as asking the person when `auto-approve.mjs` fails. Exit 2, or a git failure from `commit.mjs`, is an environment problem: the stage reports the message and stops, and a build stage returns `blocked`.
- **Generated output.** Every task that edits a skill, rule, reference, template, architect doc, ADR, or `roles.json` runs `pnpm prism:build` and commits what the build writes from its sources. The files list names the expected copies. Add any other copy the build writes from these sources to the same commit and name it in `## History`.
  - A skill's copies are `.claude/skills/<id>/SKILL.md`, `.claude/skills/<id>/.ai-skill-generated`, `.cursor/skills/<id>/SKILL.md`, and `.cursor/skills/<id>/.ai-skill-generated`. A non-utility role adds `.claude/agents/<id>.md` and `.codex/agents/<id>.toml`.
  - A rule's copies are `.claude/rules/<name>.md`, `.codex/rules/<name>.md`, `.cursor/rules/<name>.mdc`, and `AGENTS.md`.
  - A reference's copies are `.claude/references/<path>`, `.codex/references/<path>`, and `.cursor/references/<path>`.
  - The seed twin is `templates/install/.prism/<path>`. The build writes it for a non-curated file. Edit it by hand when `seed-curation.json` lists the file as curated.
- **Commits.** One commit per task, subject `PRISM-522: <summary> (T<n>)`.

### T1: Add the hookRuntimeDir config key and the HOOK_RUNTIME_DIR token

- files: .ai-skills/config.schema.json, .ai-skills/config.json, scripts/ai-skills/lib/tokens.ts, scripts/ai-skills/hook-runtime-dir-token.test.ts
- proof: pnpm exec tsx --test scripts/ai-skills/hook-runtime-dir-token.test.ts scripts/ai-skills/optional-token-coverage.test.ts
- proof fails on main: yes
- depends on: none

Owner: Clove. Skills and rules name the chain scripts by path, and the path differs between PRISM's tree and a consumer's.

- **Schema.** Add a top-level optional `hookRuntimeDir` string to `.ai-skills/config.schema.json`. Its description: the repo-relative directory holding the hook runtime, default `.claude/hooks`, set only by a repo that runs the runtime from its source tree.
- **Type and token.** Add `hookRuntimeDir?: string` to `PrismConfig` in `scripts/ai-skills/lib/tokens.ts`. In `deriveTokenMap`, add `tokenMap.set("HOOK_RUNTIME_DIR", config.hookRuntimeDir ?? ".claude/hooks")`, the default form `token-substitution.md` requires.
- **PRISM's config.** Set `"hookRuntimeDir": "scripts/ai-skills/hooks"` in `.ai-skills/config.json`.

The test covers four cases:

- a config with no key maps `HOOK_RUNTIME_DIR` to `.claude/hooks`
- `scripts/ai-skills/hooks` maps through
- `config-schema-validate.ts` rejects `hookRuntimeDir: 3`
- PRISM's own config still validates

### T2: Port chat approval

- files: scripts/ai-skills/hooks/plan/chat-approval.mjs, scripts/ai-skills/hooks/plan/chat-approval.d.mts, scripts/ai-skills/plan-chat-approval.test.ts
- proof: pnpm exec tsx --test scripts/ai-skills/plan-chat-approval.test.ts
- proof fails on main: yes
- depends on: none

Owner: Clove. Port thrive's `scripts/plan/chat-approval.mjs`, which is the content-hash form with no expiry. Keep these as they are:

- `parseApprovePrompt`, with its approve word, harness-opener, quoted-text, negation, and contraction rules
- `findTokenPath`, which puts the token in `git rev-parse --absolute-git-dir`, so it is never committed and needs no `.gitignore` line
- `hashFile`, `readChatToken`, and `takeChatToken`

The swaps:

- `TOKEN_FILE = "prism-chat-approval.json"`.
- `hashChainFiles` walks `.prism/plans` and `.prism/archived/plans`, one folder deep. `CHAIN_STAGES` stays `intent.md`, `design.md`, and `plan.md`, because a spec is never approved.

Port `scripts/plan/chat-approval.test.mjs` case for case with the path swaps.

### T3: Port the approval script with every host's agent markers

- files: scripts/ai-skills/hooks/plan/approve.mjs, scripts/ai-skills/hooks/plan/approve.d.mts, scripts/ai-skills/plan-approve.test.ts
- proof: pnpm exec tsx --test scripts/ai-skills/plan-approve.test.ts
- proof fails on main: yes
- depends on: T2

Owner: Clove. Port thrive's `scripts/plan/approve.mjs`. It imports `./chat-approval.mjs` and child 4's `./frontmatter.mjs`. Keep these as they are:

- the keypress path and the one-use chat-token path
- the refusals: a spec, a non-chain file, a missing required intent field or section, a bare "none" on a surface, a file changed since the approve message, and a token from another session or naming another file
- re-approval replacing the old approval lines
- the `approved_via: chat` stamp
- every message

The swaps:

- **Agent detection.** It reads every host's marker, not only Claude's. `viaChat` is true when `env.CLAUDECODE`, `env.CODEX_THREAD_ID`, `env.CODEX_SESSION_ID`, or `env.CODEX_CI` is set, or stdin is not a TTY. The missing-token message names "an agent session" where thrive's names Claude Code.
- **Session id.** `process.env.CLAUDE_CODE_SESSION_ID || process.env.CODEX_THREAD_ID || null`.
- **Path comparison.** `comparablePath` uses `realpathSync.native`, so a Windows 8.3 short name compares equal to its long form.
- **Error text.** The not-a-chain-file message names `.prism/plans/<folder>/{intent,design,plan}.md`.
- **Usage.** `Usage: approve.mjs <path>`, with no directory. A missing argument exits 2, where thrive exits 1, because every chain command exits 2 on a usage error. Every refusal stays exit 1.
- **Imports.** It takes `approvalLines`, `CHAIN_FILE`, `formatLocalDate`, `readFrontmatter`, `replaceFrontmatterLine`, `sectionBody`, and `stampApproval` from child 4's `./frontmatter.mjs`, which exports all seven under thrive's names. `stampApproval`'s fourth argument writes the `approved_via:` line.

Port `scripts/plan/approve.test.mjs` case for case, with the path and id swaps. Then adapt it for Windows:

- Drop the shebang case, because the module carries the runtime header instead.
- Create a directory symlink with type `"junction"`.
- Skip the file-symlink case on `win32`.

Add these cases:

- With `CODEX_THREAD_ID` set, a TTY, and no token, the script refuses.
- A token whose `sessionId` equals `CODEX_THREAD_ID` is accepted when `CLAUDE_CODE_SESSION_ID` is unset.
- Run with no argument, the script prints the usage line and exits 2.

### T4: Port the approve guard as its own entry point

- files: scripts/ai-skills/hooks/approve-guard.mjs, scripts/ai-skills/hooks/approve-guard.d.mts, scripts/ai-skills/approve-guard.test.ts
- proof: pnpm exec tsx --test scripts/ai-skills/approve-guard.test.ts
- proof fails on main: yes
- depends on: T2, T3

Owner: Clove. Port thrive's `scripts/hooks/approve-guard/hook.mjs`. Keep every arm and its order:

- the token arm, which runs first
- the execution arm, which allows exactly one bare `node <approve script> <artifact>` per unused same-session token and fails closed on shell it cannot read
- the frontmatter arm, which denies an edit that changes the `status`, `approved_by`, or `approved_at` lines, read through child 4's `matchApprovalLine` and `approvalLines`. `approved_via` is not an approval line, as `frontmatter.mjs` documents, so an edit to it alone passes, the same as in thrive
- the prompt arm, which records a chat approval on the prompt-submit event and adds the context line

Keep the known-misses header, the read-only command set, the brace-expansion budget, and every deny text except the swaps below.

The swaps:

- **Imports.** `./plan/chat-approval.mjs`, `./plan/frontmatter.mjs` (`approvalLines`, `CHAIN_FILE`, `matchApprovalLine`), and `./lib/tokenize.mjs` (`PIPES`, `REDIRECTS`, `tokenize`). Child 4 exports each of these under thrive's names. Do not import `./lib/segments.mjs`, because thrive's guard has its own segment reader. Child 4 named this guard as the walker's first caller, and that turns out not to hold, so record it in `## History`.
- **Script location.** `APPROVE_SCRIPT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "plan/approve.mjs")`.
  - Every deny and context text names the command as `node <rel> <artifact>`. `<rel>` is `path.relative(<git toplevel>, APPROVE_SCRIPT)` with `\` turned into `/`, computed at run time.
  - `CHAT_APPROVE_COMMAND` matches that relative spelling and the absolute one.
- **Local harness table.** No Cursor row, because PRISM delivers no Cursor hooks.
  - `claude`: `sessionKey: "session_id"`, `cwdKey: "cwd"`, `shellTools: ["Bash", "PowerShell"]`, `editTools: ["Edit", "Write", "MultiEdit"]`, `promptEvent: "UserPromptSubmit"`.
  - `codex`: `sessionKey: "session_id"`, `cwdKey: "cwd"`, `shellTools: ["Bash"]`, `editTools: ["apply_patch", "Edit", "Write"]`, `promptEvent: "UserPromptSubmit"`.
  - Do not use `harnesses.mjs`'s `scopeId`. It appends the Claude agent id, and a chat approval belongs to the session, not to one subagent.
- **Foreign payloads.** Keep a local `declineForeignPayload` that declines a payload whose event is `beforeSubmitPrompt`, Cursor's prompt event, as well as thrive's list.
- **Deny envelope.** Emit the deny the way `hook.mjs` does for the same harness, reusing `emitDeny` from `./harnesses.mjs` for `claude` and `codex`.
- **Kill switches are ignored.** The guard never reads `PRISM_HOOK_DISABLE` or `PRISM_HOOK_DENY_DISABLE`, per the spec's kill-switch line. This is why it is a separate entry point and not an arm of `hook.mjs`, which checks the switches before it parses stdin.
- **Text.** The header and texts name the script only through `<rel>`, so they hold in both trees. "Hunter's ruling" in the header becomes "the approve-once rule".

Port `scripts/hooks/approve-guard/hook.test.mjs` case for case, with these changes:

- Drop the Cursor rows.
- Fixtures use `acme-1`.
- The command under test is built from `<rel>`.
- A case with an absolute `D:\` path in the approve command skips on `win32` unless the fixture sits on the checkout drive.

Add these cases:

- **Kill switches.** With `PRISM_HOOK_DISABLE=1` set, the no-token execution still denies.
- **Bad prompt.** A `UserPromptSubmit` payload whose prompt is "don't approve" writes no token.
- **Codex.** A payload with `--tool=codex` and `tool_name: "apply_patch"` that edits `status:` in an approved `intent.md` denies.

### T5: Register and deliver the approve guard

- files: scripts/ai-skills/update.ts, scripts/ai-skills/doctor.ts, templates/install/.claude/settings.json, templates/install/.codex/hooks.json, .claude/settings.json, scripts/ai-skills/update.test.ts, scripts/ai-skills/doctor.test.ts, scripts/ai-skills/hook-gate.test.ts, scripts/ai-skills/plan-runtime-delivery.test.ts, scripts/ai-skills/approve-guard-registration.test.ts
- proof: pnpm exec tsx --test scripts/ai-skills/approve-guard-registration.test.ts scripts/ai-skills/update.test.ts scripts/ai-skills/doctor.test.ts scripts/ai-skills/hook-gate.test.ts scripts/ai-skills/plan-runtime-delivery.test.ts && pnpm run prism:verify-pack
- proof fails on main: yes
- depends on: T4
- behavior change: a consumer's update now delivers and registers a third hook entry point, and doctor reports it like the other two.

Owner: Clove. Edits to `update.ts`:

- `HOOK_RUNTIME_FILES` gains `"approve-guard.mjs"`, `"plan/approve.mjs"`, and `"plan/chat-approval.mjs"`.
- `HOOK_RUNTIME_ENTRY_POINTS` gains `"approve-guard.mjs"`, so it gets the executable bit.
- `PRISM_HOOK_COMMAND_PATTERN` and `PRISM_CODEX_HOOK_COMMAND_PATTERN` change their entry-name group to `(?:hook|git-gates|approve-guard)`, so the merge claims and refreshes the new entries.

Registrations. Append each new entry after the existing ones in its event, so `hook-gate.test.ts`'s `PreToolUse[0]` assertion still holds. Each command is node, the quoted guard path, then the flags:

- **`templates/install/.claude/settings.json`.**
  - A new `UserPromptSubmit` event running `node "$CLAUDE_PROJECT_DIR/.claude/hooks/approve-guard.mjs" --tool=claude --event=UserPromptSubmit`.
  - A `PreToolUse` matcher `Bash|PowerShell|Edit|Write|MultiEdit` running the same path with `--event=PreToolUse`.
- **`templates/install/.codex/hooks.json`.**
  - `UserPromptSubmit` running `node ".claude/hooks/approve-guard.mjs" --tool=codex --event=UserPromptSubmit`.
  - A `PreToolUse` matcher `^(Bash|apply_patch|Edit|Write)$` running the same path with `--event=PreToolUse`.
- **PRISM's own `.claude/settings.json`** is hand-maintained. It gets the same two entries with the path `$CLAUDE_PROJECT_DIR/scripts/ai-skills/hooks/approve-guard.mjs`. PRISM has no root `.codex/hooks.json`, so nothing changes for Codex here.

`doctor.ts`:

- Widen `HOOK_COMMAND_PATH_RE` to the same three entry names.
- Add `approve-guard.mjs` to the per-entry-point checks for a runtime without its registration and a registration pointing at a missing file, beside the `git-gates.mjs` case.

Tests:

- **`update.test.ts`.** Add the three paths to `HOOK_RUNTIME_RELATIVE_PATHS`.
- **`hook-gate.test.ts`.** Extend the registration assertions to the new event and matcher. Keep every existing assertion.
- **`doctor.test.ts`.** Add a missing-guard warning case and a dead-registration case.
- **`plan-runtime-delivery.test.ts`** (child 4's). Add the three files to its delivered list.
- **New `approve-guard-registration.test.ts`.** It pins each host template's event, matcher, and command for the guard. A second `prism update` leaves exactly one guard entry per event, and a consumer's own `UserPromptSubmit` entry survives.

### T6: Deliver the hook runtime files on every host

- files: scripts/ai-skills/update.ts, scripts/ai-skills/doctor.ts, scripts/ai-skills/update.test.ts, scripts/ai-skills/doctor.test.ts, scripts/ai-skills/plan-runtime-delivery.test.ts
- proof: pnpm exec tsx --test scripts/ai-skills/update.test.ts scripts/ai-skills/doctor.test.ts scripts/ai-skills/plan-runtime-delivery.test.ts scripts/ai-skills/git-hooks-delivery.test.ts
- proof fails on main: yes
- depends on: T5
- behavior change: a Cursor-only install (`hosts: ["cursor"]`) now receives the runtime files under `.claude/hooks/` with no registration, no git hook shims, and no `.gitignore` lines, where before it received nothing. The intent requires that a Cursor user approve from a terminal, and the skills it receives name these scripts.

Owner: Clove. In `update.ts`, `refreshHookRuntime` delivers every `HOOK_RUNTIME_FILES` entry, runs `pruneStaleHookRuntimeFiles`, and sets the entry points' executable bit whatever `hosts` holds. The neither-host branch no longer calls `removeDeliveredHookRuntimeFiles`. Delete that function if nothing else calls it.

These stay gated on `claude` or `codex`, as child 2 and child 4 left them:

- **Git hook shims.** With neither host, `removeDeliveredGitHookShims` still runs and `deliverGitHookShims` does not. `git-hooks.md` gives a Cursor-only consumer no git hooks, and that is child 2's call, not this child's.
- **Registrations.** Each host's registration merges only for that host, and a dropped host's registration is still removed.
- **`.gitignore` lines.** `appendHookStateGitignoreLines` runs only when a host is registered, because only the registered entry points write state files.

In `doctor.ts`, delete the warning whose message starts `hosts does not list "claude" or "codex", but PRISM's hook runtime is still present`, and the branch that raises it. Keep the per-host installed and registered report. Check that no other hook finding fires on a Cursor-only install that holds the runtime.

Tests:

- **`update.test.ts`.** "refreshHookRuntime: a repo that runs neither Claude Code nor Codex receives no runtime, no registration, and no gitignore lines" becomes a case where that repo receives every runtime file, and still gets no `.claude/settings.json`, no `.codex/hooks.json`, no `.githooks/`, and no `.gitignore`.
- **`doctor.test.ts`.** Delete the case that pins the removed warning. Add one: a Cursor-only install with the runtime on disk reports no hook warning.
- **`plan-runtime-delivery.test.ts`.** "hosts: [cursor] delivers none of the plan-chain modules" becomes "hosts: [cursor] delivers every plan-chain module and writes no registration". `node .claude/hooks/plan/tasks.mjs <fixture>/plan.md --base HEAD` exits 0 there too.
- **`git-hooks-delivery.test.ts`** is unchanged. Its `hosts: [cursor]` cases (no shims, marked shims removed, `core.hooksPath` unset) are the proof that the shim gating held, so the proof runs it.

### T7: Document approval in the hook-runtime and chain-scripts docs

- files: .prism/architect/_toolkit/hook-runtime.md, .prism/architect/_toolkit/plan-chain-scripts.md, .prism/architect/_toolkit/git-hooks.md, templates/install/.prism/architect/_toolkit/hook-runtime.md, templates/install/.prism/architect/_toolkit/plan-chain-scripts.md, templates/install/.prism/architect/_toolkit/git-hooks.md, .claude/architect/_toolkit/hook-runtime.md, .codex/architect/_toolkit/hook-runtime.md, .cursor/architect/_toolkit/hook-runtime.md, .claude/architect/_toolkit/plan-chain-scripts.md, .codex/architect/_toolkit/plan-chain-scripts.md, .cursor/architect/_toolkit/plan-chain-scripts.md, .claude/architect/_toolkit/git-hooks.md, .codex/architect/_toolkit/git-hooks.md, .cursor/architect/_toolkit/git-hooks.md
- proof: pnpm run prism:build && pnpm run prism:crossref-lint
- depends on: T1, T5, T6, T25

Owner: Clove. Write every claim against T1 to T6 and T25's merged source. Edit existing paragraphs, except the one new `###` named below, because `hook-runtime.md` is a topic doc rather than an umbrella. Make the same edits by hand in the curated `hook-runtime.md` twin wherever it carries the paragraph. The `plan-chain-scripts.md` and `git-hooks.md` twins are not curated, so the build writes them.

**`hook-runtime.md`:**

- **Delivery path.**
  - The runtime files reach every install whatever `hosts` holds. Registrations, the git hook shims, and the `.gitignore` lines stay per host.
  - The three entry points are `hook.mjs`, `git-gates.mjs`, and `approve-guard.mjs`.
  - Delete the sentences saying the runtime files are removed when both hosts are gone.
- **The gate is friction, not a wall.** Its last sentence says doctor warns when the runtime remains after both `claude` and `codex` left `hosts`. T6 deletes that warning, so drop that clause and keep the dropped-host registration warning.
- **Switches.** Add that the approve guard ignores both kill switches, with the reason: an approval path an agent can turn off is not a control.
- **New `### Approve guard` subsection,** after Git gates:
  - its four arms and what each denies
  - the token's home in the git directory, its content hash, and that it never expires
  - the one bare command it allows
  - that it fails closed on shell it cannot read
  - that it is an accident backstop and not a sandbox
  - the known-misses list's location
  - a host note: Cursor has no prompt-submit delivery, so a Cursor user approves from a terminal with the keypress
  - a write-gate note: the approve command names a plan path, which the write gate routes, so a session that has not read the plan docs gets a read deny first, and the remedy is the read

**`plan-chain-scripts.md`:**

- Add one Contracts line each for `approve.mjs` and `chat-approval.mjs`.
- **Invocation.** `approve` joins `tasks`, `bundles`, `auto-approve`, and `commit` as a command. Add that a `.ai-skills/config.json` that exists but does not parse is a config error, exit 2, for every command that reads it (T25).
- **Hosts.** Replace the paragraph saying a Cursor-only consumer does not receive these modules with one saying every install receives them, and only the registrations and git hook shims follow `hosts`.
- Name `${HOOK_RUNTIME_DIR}` as how skill and rule text spells the path.
- **Templates.** Leave the paragraph as it is. It cites the four templates by path, and once T12, T13, T14, and T18 cite them from skills it no longer carries `ship-closure`, but what it says about the headings the scripts read stays true.

**`git-hooks.md`:**

- **Delivery paragraph.** Add that a Cursor-only consumer receives the git hook modules with the rest of the runtime but no shims, so git runs nothing.
- **The setup-script line.** It says the import form exits 0 "when `install.mjs` is absent, as it is after `hosts` drops to Cursor only". After T6 the module is present on a Cursor-only install, where it finds no shims, says so, and exits 0. Reword the clause to say that, and keep the absent case for a clone that never ran an update.

### T8: Document the config key and the delivered approval files for consumers

- files: docs/parameterization.md, docs/what-prism-writes.md
- proof: pnpm run prism:crossref-lint
- depends on: T1, T6

Owner: Eli. Set `last_updated` to the edit date.

- **`parameterization.md`.** Add a field-reference row for `hookRuntimeDir`, using T1's schema description. Say a consumer never sets it.
- **`what-prism-writes.md`.**
  - Add rows for `.claude/hooks/approve-guard.mjs`, `.claude/hooks/plan/approve.mjs`, and `.claude/hooks/plan/chat-approval.mjs`.
  - Change the hook-runtime rows to say the files reach every install, while registrations and the `.githooks/` shims follow `hosts`.
  - Add one line saying the chat approval token lives inside the repo's git directory and never appears in the working tree.

### T9: Add the agent role type and preloads to the registry

- files: scripts/ai-skills/generate-skills.ts, scripts/ai-skills/claude-agent-def.test.ts, scripts/ai-skills/discovery-metadata.test.ts, scripts/ai-skills/role-preloads.test.ts
- proof: pnpm exec tsx --test scripts/ai-skills/role-preloads.test.ts scripts/ai-skills/claude-agent-def.test.ts scripts/ai-skills/discovery-metadata.test.ts && pnpm run prism:check-types
- proof fails on main: yes
- depends on: none

Owner: Clove. `RoleDefinition` gains two things:

- **The `"agent"` type,** in `type?: "persona" | "utility" | "agent"`. An agent role has no persona, generates both agent files (Claude `.md` and Codex `.toml`), and is dispatched as a subagent.
- **`preloads?: string[]`.**

Validation in the roles loader:

- An agent role must not carry a persona, with a message shaped like the utility one.
- `preloads` must be an array of distinct ids. Each must name a role in `roles.json`, and none may be the role itself. Otherwise the build fails with `Role '<id>' preloads '<x>', which ...` and the reason.

Agent-def builder changes:

- Where it reads the persona name, an agent role uses its id.
- When `preloads` is non-empty, the frontmatter gains `skills:` followed by one `  - <id>` line per entry. The Claude Code subagent docs define that field as a list of skill names whose content is injected at start.
- The Codex `.toml` builder is unchanged.

Tests:

- **`claude-agent-def.test.ts`.** Its one-def-per-persona expectation widens to one per non-utility role.
- **`discovery-metadata.test.ts`.** Its non-utility-has-a-persona assertion excludes `agent`.
- **New `role-preloads.test.ts`.**
  - A role with `preloads: ["tdd"]` renders `skills:` then `  - tdd` in its Claude agent def.
  - Its Codex `.toml` is byte-identical to the same role without preloads.
  - An unknown preload, a self preload, and a duplicate each throw.
  - An agent role with a persona throws.
  - An agent role gets both agent files and no persona line.

Leave `scripts/ai-skills/build.ts` alone unless `pnpm prism:check-types` fails on the widened union. If it does, fix the type there, add the file to the commit, and say so in `## History`.

### T10: Add the workflow rule, put it first in AGENTS.md, and compact skill routing

- files: .prism/rules/workflow.md, .prism/rules/skill-routing.md, templates/install/.prism/rules/skill-routing.md, scripts/ai-skills/agents-md-block.ts, scripts/ai-skills/agents-md-budget.test.ts, .claude/rules/workflow.md, .codex/rules/workflow.md, .cursor/rules/workflow.mdc, templates/install/.prism/rules/workflow.md, .claude/rules/skill-routing.md, .codex/rules/skill-routing.md, .cursor/rules/skill-routing.mdc, AGENTS.md
- proof: pnpm run prism:build && pnpm exec tsx --test scripts/ai-skills/agents-md-budget.test.ts scripts/ai-skills/routing-coverage.test.ts && pnpm run prism:crossref-lint
- proof fails on main: yes
- depends on: T1

Owner: Clove. These are the spec's workflow block and resume table, delivered as a `load: always` rule. Claude reads it from `.claude/rules/`, Cursor from an `alwaysApply` `.mdc`, and Codex from the first lead section of `AGENTS.md`. The Claude Code subagent docs say rules without `paths` reach subagents too, so a dispatched stage reads the build report shape from here.

**`.prism/rules/workflow.md`.** It opens with `load: always` frontmatter and a `# Workflow` title. Port thrive's `## Workflow` block from `AGENTS.md` at the ref (its Limits, Approval, Advancing, Scope changes, Commit subjects, and Resume parts) with the global swaps, plus these:

- **Approval.**
  - The command is `node ${HOOK_RUNTIME_DIR}/plan/approve.mjs <artifact>`.
  - "Refuses inside Claude Code" becomes "refuses inside an agent session".
  - Add: "A Cursor user runs the command in their own terminal."
  - "`plan.md` needs it when `auto-approve.mjs` fails" means exit 1. Add one sentence: a chain script that exits 2 has a usage or config error, so the stage reports its message and stops, and never turns it into an approval ask. A person approving over an unreadable config would approve a plan whose stop paths were never checked.
- **Advancing.**
  - Drop every `watch-ci.mjs` and `REVIEW.md` sentence. Child 6 brings those.
  - Keep the run goal, the resume rule, the stops, and the four review-pause triggers, worded without the `REVIEW.md` citation.
  - Keep "fix a red CI result and push again, at most 3 times, then put it on the PR".
- **Scope changes.** Apply PRISM's one difference from the spec Decision on approve-once. A change that contradicts a person's ruling, or changes an acceptance criterion, goes to `prism-architect` first, and the architect forwards it to the person.
- **Limits.** Add "2 re-dispatches of one `blocked` bundle".
- **Commit subjects.** Legacy flat-plan branches keep `${TICKET_PREFIX}-NNNN:`.
- **New "Build report" paragraph** for the implement and docs stages. Give the shape as a fenced block:
  - `verdict: done | needs-replan | blocked`
  - `tasks:`
  - `commit:` (a SHA, or none)
  - `files:` (each changed path, or `unlisted: <path>`)
  - `checks:`
  - `history:` (one `## History` line)
  - then one paragraph

  Then the routing:
  - `done`: rerun `bundles.mjs <plan.md> --base <base>`, dispatch the next bundles, and after each wave append the reports' History lines to `plan.md` and commit `plan: <summary>`.
  - `blocked`: fix the environment and re-dispatch, at most 2 times. A chain script's exit 2, or a `commit.mjs` failure other than an unchanged path, is `blocked`.
  - `needs-replan`: the plan stage's re-plan, where a second one on the same task asks the person.
  - An unlisted file, or an acceptance criterion the tasks cannot meet, is `needs-replan`.
  - The session checks that a report arrived before routing it.
- **Resume table.** Thrive's fourteen rows, with these changes:
  - "devil's advocate" becomes "challenge".
  - The plan-approval row reads `auto-approve.mjs`, then the person on exit 1, or a stop on exit 2.
  - The `verify` row runs the `.prism/rules/verification-commands.md` checks on the head and records them under `## Verification`.
  - The `review` row runs `prism-self-review`.
  - The `PR` row follows `.prism/references/shipping-flow.md` (T20).
  - The `PR review` row dispatches `prism-pr-review` as a subagent.
  - The `retro` row runs `prism-retro`, then the session writes `Retro: <report path>` under `## PR Readiness` and commits it as `retro: <summary>`, because `prism-retro` is read-only on plans.

Target 7,000 bytes or less. It cites sections by heading text in backticks, never with the section sign, and never points at a plan Decision.

**`.prism/rules/skill-routing.md`.** Rewrite to thrive's compact shape at 8,700 bytes or less. These must hold:

- The four headings `routing-coverage.test.ts` reads (`## Routing table`, `## Onboarding intent routing`, `## Named-invocation personas`, `## Utility skills`) stay, with the same membership rules.
- **Routing table.** One row per current `auto` role, as Persona, Skill, Signal phrases, with signals trimmed to the distinguishing ones. The business rows stay.
- **Named invocation** keeps Zoe and Iris with their triggers.
- **Utility skills.** One line each for `prism-handoff`, `prism-review-loop`, `prism-forge-skill`, `tdd`, and `prism-challenge`.
- **How to route,** the built-in `/review` override, and skip-routing stay, one short paragraph each.
- **Authors ship, reviewers review** gains the folder-plan sentence. On a folder-plan branch, the session's PR stage pushes and opens the draft PR for code and docs together, while `prism-implement` and `prism-docs` only commit. Flat-plan branches keep the authoring persona shipping.
- The plan-only-commit exception sentence stays.
- Every backticked id-shaped token is a `roles.json` id.

The seed twin is curated. Apply the same rewrite by hand, with consumer-unreachable references dropped per the curation boundary.

**`agents-md-block.ts`.** Put `workflow.md` first in `AGENTS_MD_LEAD_RULES`.

**`agents-md-budget.test.ts`.** Add an assertion that `workflow.md` is the first lead section.

Record both byte sizes, and the byte offset where the last lead section ends, in `## History`. If that offset is past 31,744 (1 KiB under the Codex limit), cut skill-routing prose until it is not.

### T11: Add prism-architect and make prism-plan persona-less

- files: .ai-skills/skills/prism-architect/frontmatter.yml, .ai-skills/skills/prism-architect/shared.md, .ai-skills/skills/prism-architect/claude.md, .ai-skills/skills/prism-architect/codex.md, .ai-skills/skills/prism-architect/cursor.md, .ai-skills/definitions/roles.json, .ai-skills/skills/prism-plan/frontmatter.yml, scripts/ai-skills/generate-skills.ts, .prism/rules/skill-routing.md, templates/install/.prism/rules/skill-routing.md, .prism/architect/_toolkit/skills-ecosystem.md, templates/install/.prism/architect/_toolkit/skills-ecosystem.md, .claude/skills/prism-architect/SKILL.md, .claude/skills/prism-architect/.ai-skill-generated, .cursor/skills/prism-architect/SKILL.md, .cursor/skills/prism-architect/.ai-skill-generated, .claude/agents/prism-architect.md, .codex/agents/prism-architect.toml, .claude/agents/prism-plan.md, .codex/agents/prism-plan.toml, .claude/skills/prism-plan/SKILL.md, .cursor/skills/prism-plan/SKILL.md, .claude/rules/skill-routing.md, .codex/rules/skill-routing.md, .cursor/rules/skill-routing.mdc, .claude/architect/_toolkit/skills-ecosystem.md, .codex/architect/_toolkit/skills-ecosystem.md, .cursor/architect/_toolkit/skills-ecosystem.md, AGENTS.md
- proof: pnpm run prism:build && pnpm exec tsx --test scripts/ai-skills/routing-coverage.test.ts scripts/ai-skills/skill-loaded-lines.test.ts scripts/ai-skills/claude-agent-def.test.ts
- proof fails on main: yes
- depends on: T9, T10

Owner: Clove. **`roles.json`:**

- Add `{ "id": "prism-architect", "persona": "Winston", "routing": "auto" }`.
- `prism-plan` becomes `{ "id": "prism-plan", "type": "utility", "routing": "named-only" }`.

The build then deletes `.claude/agents/prism-plan.md` and `.codex/agents/prism-plan.toml`. Commit the deletions.

**`generate-skills.ts`.** In `CLAUDE_AGENT_MODEL_DEFAULTS`, move the `prism-plan` entry to `prism-architect`, keeping its tier and comment. A utility gets no agent def, and the architect is where Winston's judgment now runs.

**`prism-plan/frontmatter.yml`.** Its description becomes thrive-plan's, with the swaps: writes `plan.md` and runs the challenge rounds, and with no plan folder writes the plan in chat. The trigger words drop "Winston" and "evaluate the approach". The body rewrite is T14.

**`prism-architect`.** Port thrive's `thrive-architect` (`shared.md` and `frontmatter.yml`), with the evaluation content taken from the current `prism-plan/shared.md`. It has two modes.

- **Chat consult.** A person asks "is this the right approach?", with or without a plan folder. The output is these five sections, and nothing in this mode writes a file:
  - **Verdict:** proceed, proceed with changes, or don't proceed.
  - **Evaluation:** one line each for fit with existing patterns and why the pattern exists, data flow and boundaries, coupling, abstraction level and the deletion test, accessibility architecture, testability, and risk with the "what am I assuming" check.
  - **Suggested approach.**
  - **Watch for:** the devil's-advocate risks and tradeoffs, condensed.
  - **Open items.**

  The premise gate (does the proposal earn its existence) runs before Evaluation.
- **Dispatched.** A stage sends a plan folder plus a scope idea or a challenge finding. It reads that folder's `intent.md` and `spec.md` and returns a fit verdict to the stage. It also says whether the finding changes the intent or its foundation (an acceptance criterion, the spec's approach or Affected systems, a shared type, a public API, or a dependency), which is what "intent-level" means. It offers nothing and hands off to no one.
- **Startup** cites `.prism/references/architect-context.md` for loading routed docs. It never writes code, and it never writes a plan file.

Budget: 120 minus `architect-context.md`'s lines. `structural-remedies.md` is not cited. Its one principle ("push for the simpler design before writing proceed") is a single line in the body.

**`skill-routing.md` and its twin.** The architect row takes Winston's signal phrases plus "Winston". The `prism-plan` row leaves the routing table and gets a Utility skills line: "write the plan", "plan this out"; in a plan folder it runs as the plan stage.

**`skills-ecosystem.md` and its curated twin.**

- Roster: replace the `prism-plan` Winston row with a `prism-architect` Winston row (approach questions in chat, and fit verdicts for a running stage), and add `prism-plan` to the Utility skills paragraph.
- Replace the whole "Winston's quick-consult mode" section with two sentences. A quick approach question goes to `prism-architect`, which needs no plan folder. Anything that grows into planned work starts an intent.

### T12: Add prism-intent

- files: .ai-skills/skills/prism-intent/frontmatter.yml, .ai-skills/skills/prism-intent/shared.md, .ai-skills/skills/prism-intent/claude.md, .ai-skills/skills/prism-intent/codex.md, .ai-skills/skills/prism-intent/cursor.md, .ai-skills/definitions/roles.json, .prism/rules/skill-routing.md, templates/install/.prism/rules/skill-routing.md, .prism/architect/_toolkit/skills-ecosystem.md, templates/install/.prism/architect/_toolkit/skills-ecosystem.md, .claude/skills/prism-intent/SKILL.md, .claude/skills/prism-intent/.ai-skill-generated, .cursor/skills/prism-intent/SKILL.md, .cursor/skills/prism-intent/.ai-skill-generated, .claude/agents/prism-intent.md, .codex/agents/prism-intent.toml, .claude/rules/skill-routing.md, .codex/rules/skill-routing.md, .cursor/rules/skill-routing.mdc, .claude/architect/_toolkit/skills-ecosystem.md, .codex/architect/_toolkit/skills-ecosystem.md, .cursor/architect/_toolkit/skills-ecosystem.md, AGENTS.md, .prism/architect/_toolkit/hook-runtime.md, templates/install/.prism/architect/_toolkit/hook-runtime.md, .claude/architect/_toolkit/hook-runtime.md, .codex/architect/_toolkit/hook-runtime.md, .cursor/architect/_toolkit/hook-runtime.md, docs/ai-skills/compatibility.md, docs/parameterization.md, scripts/ai-skills/update.ts
- proof: pnpm run prism:build && pnpm exec tsx --test scripts/ai-skills/routing-coverage.test.ts scripts/ai-skills/skill-loaded-lines.test.ts
- proof fails on main: yes
- depends on: T11

Owner: Clove. `roles.json`: add `{ "id": "prism-intent", "persona": "Mira", "routing": "auto" }`. Two roles carry "Mira" until T19 removes `prism-user-stories`. No name-uniqueness check exists before child 7.

Port thrive's `thrive-intent`, trimmed to budget: 120 minus `.prism/templates/intent.md`'s lines. Cite no other file. The acceptance-criteria template is 121 lines, so the intent template's comment carries the pointer to it and this skill does not. The body covers:

- **Where an intent comes from:** a ticket, a person, or a diagnosis report.
- **The folder.** `.prism/plans/<ticket>/` for standard, and `epic-<ticket>/` for epic, using the configured `ticketPrefix`.
- **Grilling.** One question at a time. Read the code before asking, and state an understanding rather than asking where the code answers.
- **Writing `intent.md`** from the template:
  - the proposed size
  - each surface filled or `none — <why>`
  - the Design line, `needed`, `supplement`, or `not needed`, with its reason
  - acceptance criteria with stable IDs and Evidence lines
  - open questions
- **Approval.** Land every pending edit, then ask once for `approve`. On approval, run `node ${HOOK_RUNTIME_DIR}/plan/approve.mjs <path>` as its own command, and commit the stamp as `plan: approve intent`. Approval rules beyond that are the workflow rule's.
- **After approval.**
  - Offer to sync the acceptance criteria to the ticket. It is a tracker write, so it waits for a yes.
  - Start the next stage from the workflow rule's resume table.
- **No user stories.** The Proposed outcome and the criteria replace them.

**`skill-routing.md` and its twin.** Add a Mira row for `prism-intent` with "write the intent", "define the scope", "grill me", "what are the requirements", and "Mira". Move "write user stories" and "flesh out the requirements" from the `prism-user-stories` row to this one. Leave `prism-user-stories`'s row with only its name trigger until T19.

**`skills-ecosystem.md` and its twin.** Add a `prism-intent` Mira roster row.

**Re-add the delivery reason PR A dropped.** This is the first task that makes a skill name the plan-chain scripts, so the reason "the skills a consumer receives name these scripts" becomes true here. Put it back beside the Cursor-terminal reason, in the same commit, in these places (see the Decision on the dropped clause):

- `.prism/architect/_toolkit/hook-runtime.md`, Delivery path: "because the skills a consumer receives name these scripts and a Cursor user runs them from a terminal".
- `templates/install/.prism/architect/_toolkit/hook-runtime.md`, Delivery path, by hand because the twin is curated: "The skills you receive name these scripts, and a Cursor user runs them from a terminal."
- `docs/ai-skills/compatibility.md`, the runtime-delivery paragraph: "because the skills you receive name those scripts and a Cursor user runs them from a terminal".
- `docs/parameterization.md`, the `hosts` row: "because the skills name them and a Cursor user runs them from a terminal".
- The `refreshHookRuntime` doc comment in `scripts/ai-skills/update.ts` carries the same clause and goes back with the other four.

`pnpm prism:build` rewrites the three `.claude/`, `.codex/`, and `.cursor/` copies of `hook-runtime.md`.

### T13: Add prism-spec as a dispatched agent

- files: .ai-skills/skills/prism-spec/frontmatter.yml, .ai-skills/skills/prism-spec/shared.md, .ai-skills/skills/prism-spec/claude.md, .ai-skills/skills/prism-spec/codex.md, .ai-skills/skills/prism-spec/cursor.md, .ai-skills/definitions/roles.json, .prism/rules/skill-routing.md, templates/install/.prism/rules/skill-routing.md, .claude/skills/prism-spec/SKILL.md, .claude/skills/prism-spec/.ai-skill-generated, .cursor/skills/prism-spec/SKILL.md, .cursor/skills/prism-spec/.ai-skill-generated, .claude/agents/prism-spec.md, .codex/agents/prism-spec.toml, .claude/rules/skill-routing.md, .codex/rules/skill-routing.md, .cursor/rules/skill-routing.mdc, AGENTS.md
- proof: pnpm run prism:build && pnpm exec tsx --test scripts/ai-skills/routing-coverage.test.ts scripts/ai-skills/skill-loaded-lines.test.ts scripts/ai-skills/role-preloads.test.ts
- proof fails on main: yes
- depends on: T12

Owner: Clove. `roles.json`: add `{ "id": "prism-spec", "type": "agent", "routing": "named-only" }`.

Port thrive's `thrive-spec`, trimmed to budget: 120 minus `.prism/templates/spec.md`'s lines. The body covers:

- **Precondition.** It runs as a fresh subagent on an approved `intent.md`, plus an approved `design.md` when one is required. It refuses otherwise and says which approval is missing.
- **What it reads:** the intent, the design, the routed architect docs for the paths it expects to touch, and the code those paths hold.
- **What it writes.** `spec.md` from the template: Requirements, Design, and an Affected systems fenced block of one glob per line in the manifest route syntax. An epic adds Children, Merge order, and Decisions. A spec is never approved.
- **Commit.** `node ${HOOK_RUNTIME_DIR}/plan/commit.mjs "plan: write spec" <spec path>`.
- **Return** a one-paragraph summary and any scope idea it found, for the session to send to `prism-architect`.

`skill-routing.md` and its twin: add `prism-spec` to the Utility skills section's dispatched-stages line. It is never routed off a phrase.

### T14: Rewrite prism-plan as the plan stage and delete its old references

- files: .ai-skills/skills/prism-plan/shared.md, .ai-skills/skills/prism-plan/claude.md, .ai-skills/skills/prism-plan/codex.md, .ai-skills/skills/prism-plan/cursor.md, .prism/references/plan/plan-mode.md, .prism/references/plan/replan-mode.md, .prism/references/plan/evaluate-checks.md, templates/install/.prism/references/plan/plan-mode.md, templates/install/.prism/references/plan/replan-mode.md, templates/install/.prism/references/plan/evaluate-checks.md, .claude/references/plan/plan-mode.md, .claude/references/plan/replan-mode.md, .claude/references/plan/evaluate-checks.md, .codex/references/plan/plan-mode.md, .codex/references/plan/replan-mode.md, .codex/references/plan/evaluate-checks.md, .cursor/references/plan/plan-mode.md, .cursor/references/plan/replan-mode.md, .cursor/references/plan/evaluate-checks.md, .ai-skills/definitions/seed-curation.json, .prism/references/triple-gated-adr-criterion.md, templates/install/.prism/references/triple-gated-adr-criterion.md, .claude/references/triple-gated-adr-criterion.md, .codex/references/triple-gated-adr-criterion.md, .cursor/references/triple-gated-adr-criterion.md, scripts/ai-skills/skill-loaded-lines.test.ts, .claude/skills/prism-plan/SKILL.md, .cursor/skills/prism-plan/SKILL.md
- proof: pnpm run prism:build && pnpm exec tsx --test scripts/ai-skills/skill-loaded-lines.test.ts && pnpm run prism:crossref-lint
- proof fails on main: yes
- depends on: T13

Owner: Clove. Port thrive's `thrive-plan`, trimmed to budget: 120 minus `.prism/templates/plan.md`'s lines. `implementation-task-detail.md` is `load: paths`, so citing it is free. The body covers:

- **Precondition.** Approved `intent.md`, `spec.md` present, and an approved `design.md` when one is required.
- **Writing `plan.md`** from the template, with tasks at the detail bar in `.prism/rules/implementation-task-detail.md`, test-first per `tdd`, and a bug's failing test as its own earlier task.
- **Grouping.** Run `node ${HOOK_RUNTIME_DIR}/plan/bundles.mjs <plan.md>` and record the groups it prints. A duplicate claim, a cycle, or a task the parser rejects is fixed before going on. Each `files` entry is one repo path with forward slashes, because the parser rejects a backslash, a glob character, a space, and a trailing slash.
- **Challenge rounds.**
  - Dispatch `prism-challenge` with the folder and the round number. Rounds 1 and 2 always run, then up to round 3, then the confirm round, per the workflow rule.
  - Fix each blocking finding before the next round, and commit `plan: challenge round <n>`.
  - A major finding goes to `prism-architect` as a subagent with the folder and the finding.
- **Approval.** Run `node ${HOOK_RUNTIME_DIR}/plan/auto-approve.mjs <folder>`. When it exits 1, land every pending edit and ask the person once, naming the conditions it printed. When it exits 2, report the config error and stop, per the workflow rule.
- **Re-plan on `needs-replan`.**
  - Append tasks, never renumbering, and mark changed ones `amended:`.
  - Rerun `bundles.mjs`, then one challenge round and its confirm round, then `auto-approve.mjs --check`.
  - A second `needs-replan` on one task asks the person.
- **No plan folder.**
  - A person asking to plan something small gets the plan in chat.
  - A branch with a legacy flat plan keeps that plan's own shape, per `branch-plan.md`, including its close.
- It never writes code and never edits `intent.md` or `spec.md`. A needed change there goes to `prism-architect`.

Delete the three files under `.prism/references/plan/`, their seed twins, and their platform copies. Then:

- Remove the `references/plan/plan-mode.md` entry from `seed-curation.json`.
- In `triple-gated-adr-criterion.md` and its twin, replace the citation of plan-mode's Immediate Decision Promotion with plain words ("the plan stage's decision promotion at close").
- In `skill-loaded-lines.test.ts`, delete the `prism-plan` entry from `OVER_CAP_ALLOWLIST`. The allowlist ratchets, so the entry has to go once the skill fits.

ADR-0045 mentions `plan-mode.md` inside a quoted history line that `crossref-lint` skips. Leave it.

### T15: Turn prism-challenge into the round-grammar agent

- files: .ai-skills/skills/prism-challenge/frontmatter.yml, .ai-skills/skills/prism-challenge/shared.md, .ai-skills/definitions/roles.json, .prism/rules/skill-routing.md, templates/install/.prism/rules/skill-routing.md, .claude/skills/prism-challenge/SKILL.md, .cursor/skills/prism-challenge/SKILL.md, .claude/agents/prism-challenge.md, .codex/agents/prism-challenge.toml, .claude/rules/skill-routing.md, .codex/rules/skill-routing.md, .cursor/rules/skill-routing.mdc, AGENTS.md
- proof: pnpm run prism:build && pnpm exec tsx --test scripts/ai-skills/routing-coverage.test.ts scripts/ai-skills/skill-loaded-lines.test.ts
- proof fails on main: yes
- depends on: T14

Owner: Clove. `roles.json`: `prism-challenge` becomes `{ "id": "prism-challenge", "type": "agent", "routing": "named-only" }`.

Keep the four passes and the output rules. Add thrive-devils-advocate's round mechanics from the ref:

- **Plan round.** Dispatched by the plan stage with a folder and `<n>`. It reads `intent.md`, `spec.md`, and `plan.md` cold, and the code the tasks name.
- **The one edit it makes to `plan.md`** is to append, under `## Challenge`, the line `round <n>: clean`, `round <n>: resolved <count>`, `round <n>: carried <count>`, or `round <n>: blocking <count>`. The grammar is `auto-approve.mjs`'s `ROUND_LINE`.
  - `carried` is valid only for `<n>` of 4 or more.
  - A major finding always makes the round `blocking`, where "major" is the intent-level definition from T11.
- **Return.** Each finding with its severity, major or not, and the task it touches. The plan stage owns the fix and the commit.
- **Standalone use.** A person invoking "devil's advocate" or "poke holes in this" on any artifact gets the chat output and no file edit.

Budget: 120 lines, with no citations.

`skill-routing.md` and its twin: move `prism-challenge` to the dispatched-stages line, and keep its trigger phrases on its Utility line.

### T16: Make implement and docs commit-only stages on a folder plan

- files: .ai-skills/skills/prism-implement/shared.md, .ai-skills/skills/prism-docs/shared.md, .ai-skills/definitions/roles.json, .claude/skills/prism-implement/SKILL.md, .cursor/skills/prism-implement/SKILL.md, .claude/agents/prism-implement.md, .codex/agents/prism-implement.toml, .claude/skills/prism-docs/SKILL.md, .cursor/skills/prism-docs/SKILL.md, .claude/agents/prism-docs.md, .codex/agents/prism-docs.toml
- proof: pnpm run prism:build && pnpm exec tsx --test scripts/ai-skills/skill-loaded-lines.test.ts scripts/ai-skills/role-preloads.test.ts
- proof fails on main: yes
- depends on: T9, T15
- behavior change: on a folder-plan branch, prism-implement and prism-docs commit their bundle and return a build report instead of pushing and opening a PR. Flat-plan branches keep the ship behavior.

Owner: Clove. `roles.json`: `prism-implement` gains `"preloads": ["tdd"]`.

**`prism-implement`.** Add a folder-plan bullet group near the top of Startup:

- On a plan folder, refuse unless `plan.md`'s frontmatter `status` is `approved`, and return `blocked` naming the missing approval.
- Build only the tasks in the dispatched bundle, test-first per `tdd`.
- Commit each bundle with `node ${HOOK_RUNTIME_DIR}/plan/commit.mjs "<T-subject>" <paths>`, after the cleanup pass. The subject is a task form from the workflow rule. Name only the paths the bundle changed, because `commit.mjs` refuses a path with no change. Any other non-zero exit returns `blocked` with its stderr.
- Never edit `plan.md` and never push. Return the build report from the workflow rule, whose `history:` line the session appends.
- A file outside the tasks' lists, or an acceptance criterion the tasks cannot meet, returns `needs-replan`.

The Record and Ship parts gain "On a flat plan" as their lead-in.

**`prism-docs`.** Add the same folder-plan bullet with "docs task" in place of "tasks". Its Ship bullet gains "On a flat plan" as its lead-in.

To stay under the cap, delete the "Describe observable behavior, not implementation" bullet. `user-doc-template.md`'s Writing rules already say it ("Observable behavior only", "no code, no file names").

Record both measured totals in `## History`. `prism-docs` must be at 120 or less.

### T17: Give tdd the test-first rules

- files: .ai-skills/skills/tdd/shared.md, .claude/skills/tdd/SKILL.md, .cursor/skills/tdd/SKILL.md
- proof: pnpm run prism:build && pnpm exec tsx --test scripts/ai-skills/skill-loaded-lines.test.ts
- depends on: none
- behavior change: tdd no longer asks the user to confirm a test seam. On a plan, the task's proof names the seam.

Owner: Clove. Port thrive-testing's "Test-first rules", "Changing an existing test", and "Test efficacy" sections from the ref:

- characterization tests first on untested code the task changes
- a bug fix's failing test in its own earlier task with `proof fails on main: yes`
- an existing test line changed only when the task's `files:` names the file and it carries `behavior change:`, otherwise return `needs-replan` naming the test
- a mutation check on every new test: break what it pins, see it fail, restore, and confirm with `git diff`

Drop thrive's "Where tests live" list. It is thrive's stack, and PRISM's commands come from `.prism/rules/verification-commands.md`.

Replace the "Test only at pre-agreed seams" paragraph:

- On a plan, the task's `proof` names the seam.
- With no plan, pick the defensible seam, name it and the rejected alternative in the closing message, and proceed.

Keep the loop and the three anti-patterns.

### T18: Make prism-design write design.md as a stage

- files: .ai-skills/skills/prism-design/shared.md, .claude/skills/prism-design/SKILL.md, .cursor/skills/prism-design/SKILL.md, .claude/agents/prism-design.md, .codex/agents/prism-design.toml
- proof: pnpm run prism:build && pnpm exec tsx --test scripts/ai-skills/skill-loaded-lines.test.ts
- proof fails on main: yes
- depends on: none

Owner: Clove. Budget: 120 minus `.prism/templates/design.md`'s lines.

- **Mode 2.** Becomes "Mode 2, saved design".
  - On a plan folder whose approved intent says `Design: needed` or `supplement`, write `.prism/plans/<ticket>/design.md` from `.prism/templates/design.md`.
  - Otherwise write `.prism/design/mocks/<slug>.md` with the same sections.
  - Drop the inline section list and the plan `## Design` summary, which the template now carries.
- **Approval.** When the design needs approval, land every pending edit, ask once, then run `node ${HOOK_RUNTIME_DIR}/plan/approve.mjs <path>`.
- **Handoff.** "Architectural inputs for Winston" becomes "Architectural inputs for the spec". On a plan folder, the handoff is the next resume-table row.
- **States** stays the source of the state list that the template cites.

### T19: Remove prism-user-stories

- files: .ai-skills/skills/prism-user-stories/frontmatter.yml, .ai-skills/skills/prism-user-stories/shared.md, .ai-skills/skills/prism-user-stories/claude.md, .ai-skills/skills/prism-user-stories/codex.md, .ai-skills/skills/prism-user-stories/cursor.md, .ai-skills/definitions/roles.json, .prism/references/user-stories/frameworks.md, .prism/references/user-stories/prd-decompose.md, templates/install/.prism/references/user-stories/frameworks.md, templates/install/.prism/references/user-stories/prd-decompose.md, .claude/references/user-stories/frameworks.md, .claude/references/user-stories/prd-decompose.md, .codex/references/user-stories/frameworks.md, .codex/references/user-stories/prd-decompose.md, .cursor/references/user-stories/frameworks.md, .cursor/references/user-stories/prd-decompose.md, .claude/skills/prism-user-stories/SKILL.md, .claude/skills/prism-user-stories/.ai-skill-generated, .cursor/skills/prism-user-stories/SKILL.md, .cursor/skills/prism-user-stories/.ai-skill-generated, .claude/agents/prism-user-stories.md, .codex/agents/prism-user-stories.toml, .ai-skills/skills/prism-prd/frontmatter.yml, .ai-skills/skills/prism-prd/shared.md, .ai-skills/skills/prism-start-ticket/shared.md, .claude/skills/prism-prd/SKILL.md, .cursor/skills/prism-prd/SKILL.md, .claude/agents/prism-prd.md, .codex/agents/prism-prd.toml, .claude/skills/prism-start-ticket/SKILL.md, .cursor/skills/prism-start-ticket/SKILL.md, .claude/agents/prism-start-ticket.md, .codex/agents/prism-start-ticket.toml, .prism/rules/context-reuse.md, templates/install/.prism/rules/context-reuse.md, .claude/rules/context-reuse.md, .codex/rules/context-reuse.md, .cursor/rules/context-reuse.mdc, .prism/rules/skill-routing.md, templates/install/.prism/rules/skill-routing.md, .claude/rules/skill-routing.md, .codex/rules/skill-routing.md, .cursor/rules/skill-routing.mdc, .prism/architect/_toolkit/skills-ecosystem.md, templates/install/.prism/architect/_toolkit/skills-ecosystem.md, .claude/architect/_toolkit/skills-ecosystem.md, .codex/architect/_toolkit/skills-ecosystem.md, .cursor/architect/_toolkit/skills-ecosystem.md, scripts/ai-skills/bootstrap-from-claude.ts, scripts/ai-skills/skill-loaded-lines.test.ts, AGENTS.md
- proof: pnpm run prism:build && pnpm run prism:test && pnpm run prism:crossref-lint
- proof fails on main: yes
- depends on: T16

Owner: Clove. The spec folds this skill into `prism-intent`, and no skill writes user stories any more. Delete the skill directory, its two references with their seed twins and platform copies, its generated outputs, and its `roles.json` entry. Then sweep every reference the tree search found:

- **`prism-prd`.** Its frontmatter line naming `prism-user-stories` and its two body mentions hand a finished PRD to `prism-intent`, one intent per story-sized slice or one epic intent.
- **`prism-start-ticket`.** Its two mentions hand a feature ticket to `prism-intent`.
- **`context-reuse.md`.** Drop the citation-list line. Add `prism-intent` and `prism-architect` in its place.
- **`skill-routing.md`** and its twin: delete the row.
- **`skills-ecosystem.md`** and its twin: delete the roster row and its handoff-phrase line.
- **`bootstrap-from-claude.ts`.** `thrive-architect` maps to `prism-architect`. Delete the `thrive-user-stories` pair.
- **`skill-loaded-lines.test.ts`.** Delete the `prism-user-stories` allowlist entry. Only `prism-review-loop` remains.

Run `git grep -n prism-user-stories` after the build. Only plans, retros, audits, ADRs, `CHANGELOG.md`, and `.prism/lessons.md` may still match.

### T20: Add the PR stage reference and the review record

- files: .prism/references/shipping-flow.md, templates/install/.prism/references/shipping-flow.md, .claude/references/shipping-flow.md, .codex/references/shipping-flow.md, .cursor/references/shipping-flow.md, .ai-skills/skills/prism-self-review/shared.md, .claude/skills/prism-self-review/SKILL.md, .cursor/skills/prism-self-review/SKILL.md, .claude/agents/prism-self-review.md, .codex/agents/prism-self-review.toml
- proof: pnpm run prism:build && pnpm exec tsx --test scripts/ai-skills/skill-loaded-lines.test.ts && pnpm run prism:crossref-lint
- proof fails on main: yes
- depends on: T10

Owner: Clove. **New `.prism/references/shipping-flow.md`.** Port thrive's `.ai-spec/references/shipping-flow.md`, keeping only the PR-stage row and the flow. Its new non-curated file prints the expected build warning. The changes:

- **Opening.** The session runs this on a folder-plan branch. Sage and Reese keep their own flows.
- **Drop:** `watch-ci.mjs`, the `REVIEW.md` citations, and the Sage and Reese rows.
- **Step 1.** On the first push, no verification beyond the verify row. On a later push, rerun the verification commands when a commit since `## Verification` touches a file they cover.
- **Step 2.** The pause preference is `git config --global --get ${PROJECT_LOWERCASE}.pauseBeforeCommit`, read at the push here because the build commits are already made.
- **Body.** The PR title is `${TICKET_PREFIX}-NNNN: <imperative subject>`, and the body follows `.prism/rules/pr-description.md`. The body lists every `OPEN` Decision and every scope change since the intent.
- **Close.** Dispatch `prism-pr-review` as a subagent, without waiting for a reply.

It cites sections by heading text, never with the section sign.

**`prism-self-review`.** Add one bullet: on a plan folder, record the result under `plan.md`'s `## Review` (the findings in the Review Issues entry shape, or `No issues found — <date>`) instead of `## Review Issues`, and commit it as `plan: review`. The cap must still hold.

### T21: Teach the git and plan rules the folder-plan commit forms

- files: .prism/rules/git-conventions.md, .prism/rules/branch-plan.md, templates/install/.prism/rules/git-conventions.md, templates/install/.prism/rules/branch-plan.md, .prism/architect/_toolkit/closing-messages.md, templates/install/.prism/architect/_toolkit/closing-messages.md, .claude/rules/git-conventions.md, .codex/rules/git-conventions.md, .cursor/rules/git-conventions.mdc, .claude/rules/branch-plan.md, .codex/rules/branch-plan.md, .cursor/rules/branch-plan.mdc, .claude/architect/_toolkit/closing-messages.md, .codex/architect/_toolkit/closing-messages.md, .cursor/architect/_toolkit/closing-messages.md, AGENTS.md
- proof: pnpm run prism:build && pnpm run prism:crossref-lint && pnpm run prism:spec-scope-lint
- depends on: T19

Owner: Clove. Edit existing paragraphs. The one exception is the new heading named below, because `git-conventions.md` is a rule file.

- **`git-conventions.md`.**
  - Under Commit Messages, add a `### Folder-plan branches` subsection with the task subject forms from the workflow rule (`T3:`, `T3-T5:`, `T11,T15,T22:`, `T3 fix:`, `plan:`, `retro:`). Note that the task id carries the ticket, so no ticket prefix is added. A `plan:` commit stages only files inside the plan folder, and `retro:` only the retro's paths.
  - Under Commit Granularity, "commit per task" becomes "one commit per bundle on a folder plan, and per task on a flat plan".
- **`branch-plan.md`.**
  - Under "Landing a plan-only commit", add the folder form. The staged set is files under `.prism/plans/<ticket>/` only, checked with `git diff --cached --name-only`. The subject is `plan: <persona> record`.
  - Under the Plan File Template intro, add one sentence. A folder plan uses the four templates in `.prism/templates/`, and this flat template stays for legacy plans.
  - The curated twin gets both edits by hand.
- **`closing-messages.md`.** "No persona auto-invokes another" gains its scope. That holds outside a plan folder. On a folder-plan run, the session starts the next stage from the workflow rule's resume table without asking.

### T22: Sweep the planner role off Winston's name

- files: .prism/SPEC.md, templates/install/.prism/SPEC.md.tmpl, .prism/architect/_toolkit/audit-workflow.md, .prism/architect/_toolkit/closing-messages.md, .prism/architect/_toolkit/lesson-promotion.md, .prism/architect/_toolkit/onboarding.md, .prism/architect/_toolkit/plan-authoring.md, .prism/architect/_toolkit/skills-ecosystem.md, .prism/architect/_toolkit/ticket-workflows.md, .prism/architect/_toolkit/business-layer.md, .prism/references/structural-remedies.md, .prism/references/triple-gated-adr-criterion.md, .prism/references/qa-plan/verdict-contract.md, .prism/rules/acceptance-criteria.md, .prism/rules/architect-doc-verification.md, .prism/rules/branch-plan.md, .prism/rules/code-standards.md, .prism/rules/design-governance.md, .prism/rules/followup-scope.md, .prism/rules/implementation-task-detail.md, .prism/rules/pr-description.md, .prism/templates/acceptance-criteria.md, .prism/templates/ticket-types.md, templates/install/.prism/architect/_toolkit/audit-workflow.md, templates/install/.prism/architect/_toolkit/closing-messages.md, templates/install/.prism/architect/_toolkit/lesson-promotion.md, templates/install/.prism/architect/_toolkit/plan-authoring.md, templates/install/.prism/architect/_toolkit/skills-ecosystem.md, templates/install/.prism/architect/_toolkit/ticket-workflows.md, templates/install/.prism/architect/_toolkit/business-layer.md, templates/install/.prism/architect/_toolkit/qa-test-planning.md, templates/install/.prism/references/structural-remedies.md, templates/install/.prism/references/triple-gated-adr-criterion.md, templates/install/.prism/references/qa-plan/verdict-contract.md, templates/install/.prism/rules/acceptance-criteria.md, templates/install/.prism/rules/architect-doc-verification.md, templates/install/.prism/rules/branch-plan.md, templates/install/.prism/rules/code-standards.md, templates/install/.prism/rules/design-governance.md, templates/install/.prism/rules/followup-scope.md, templates/install/.prism/rules/implementation-task-detail.md, templates/install/.prism/rules/pr-description.md, templates/install/.prism/rules/verification-commands.md, templates/install/.prism/templates/acceptance-criteria.md, templates/install/.prism/templates/ticket-types.md, templates/install/AGENTS.md.tmpl, .ai-skills/skills/prism-handoff/shared.md, .ai-skills/skills/prism-onboard/shared.md, AGENTS.md
- proof: pnpm run prism:build && pnpm run prism:check
- depends on: T21

Owner: Clove. "Winston" now names `prism-architect`. `prism-plan` is persona-less, and the code-standards removal-and-rename rule asks for every reference to be swept. The files list is the `git grep -c Winston` and `git grep -l prism-plan` result over the spec surfaces on 2026-11-18. Add the platform copies the build writes for each, and rerun both greps after the precondition merge to catch lines added since.

Apply one test to each mention:

- **Writing or changing a plan.** Writing tasks, writing AC, the decision verdict gate, plan close, or epic detection becomes "the plan stage (`prism-plan`)". AC authorship on a folder plan becomes "the intent stage (`prism-intent`)".
- **Judging an approach.** An architecture question, a fit verdict, or a structural escalation stays Winston and names `prism-architect`.
- **Mira writing user stories** becomes `prism-intent` writing the intent.

Further edits:

- **`skills-ecosystem.md`** and its twin:
  - Rule 9 (AC sync) and rule 15 (PR-body sync) name the intent stage and the PR stage.
  - The Cross-skill Handoffs table gets an intent row, an architect row, and a plan row.
  - The Utility skills paragraph defines the `agent` type (no persona, dispatched as a subagent, both agent files) and lists `prism-spec` and `prism-challenge`.
- **`ticket-workflows.md`** and its twin. Add one sentence above Common Workflows: on a plan folder, the workflow rule's stage order replaces these sequences.
- **`AGENTS.md.tmpl`.**
  - The routing rows for Winston and Mira name `prism-architect` and `prism-intent`.
  - Add a `prism-plan` utility line.
  - The ownership table rows follow the same test.

Curated twins (`hook-runtime`, `plan-authoring`, `skills-ecosystem`, `ticket-workflows`, `branch-plan`, `skill-routing`) are edited by hand. Leave `CONTEXT.md`, `README.md`, `CHANGELOG.md`, `SECURITY.md`, `.prism/prds/`, `.prism/qa/`, and `.prism/research/` alone. The first four sit outside the spec's Affected systems, and the rest are dated records. Note them in `## History` for child 9.

### T23: Record that the session ships on a folder-plan branch

- files: .prism/spec/adrs/_toolkit/0082-session-ships-on-folder-plan-branches.md, .prism/spec/adrs/_toolkit/0003-authors-ship-reviewers-review.md, .prism/spec/adrs/_toolkit/README.md, .claude/spec/adrs/_toolkit/0082-session-ships-on-folder-plan-branches.md, .codex/spec/adrs/_toolkit/0082-session-ships-on-folder-plan-branches.md, .cursor/spec/adrs/_toolkit/0082-session-ships-on-folder-plan-branches.md, .claude/spec/adrs/_toolkit/0003-authors-ship-reviewers-review.md, .codex/spec/adrs/_toolkit/0003-authors-ship-reviewers-review.md, .cursor/spec/adrs/_toolkit/0003-authors-ship-reviewers-review.md, .claude/spec/adrs/_toolkit/README.md, .codex/spec/adrs/_toolkit/README.md, .cursor/spec/adrs/_toolkit/README.md
- proof: pnpm run prism:build && pnpm run prism:crossref-lint
- depends on: T20

Owner: Clove. Take the number from the directory after the precondition merge: the highest plus one. Child 2 takes 0081, so expect 0082, and rename the file and every files entry if it differs. Confirm the ADR-0003 filename with `ls` and fix the files entries to match.

The ADR follows `TEMPLATE.md`:

- **Context.** ADR-0003 has the authoring persona push. A folder-plan run builds in bundles from several dispatched agents, and one push per bundle would open a PR before the code and its docs are whole.
- **Decision.** On a folder-plan branch, `prism-implement` and `prism-docs` commit only, and the session's PR stage pushes once and opens the draft PR. Reviewers never ship. Flat-plan branches keep ADR-0003. Alternatives:
  - each stage pushes, rejected because it opens a half-built PR
  - `prism-docs` ships its own PR, rejected because docs ride the feature PR per the spec
- **Consequences.** The pause preference fires once, at the push, and not per commit. A session that stops before the PR stage leaves local commits. The resume table's PR row picks them up.

Add `Amended by ADR-0082 for folder-plan branches.` to ADR-0003's status line, and add the new ADR's row to the README index.

### T24: Update the persona guide

- files: docs/personas.md
- proof: pnpm run prism:crossref-lint
- depends on: T19

Owner: Eli. Set `last_updated`.

- Mira's entry becomes `prism-intent`, which writes the intent and grills the person.
- Winston's entry becomes `prism-architect`, which answers approach questions in chat and gives a running stage a fit verdict.
- Add short entries for the `prism-plan`, `prism-spec`, and `prism-challenge` stages, each with no persona.
- Delete every `prism-user-stories` mention.

`docs/workflow.md` is child 9's and stays as it is.

### T25: Make tasks and bundles fail closed on an unreadable config

- files: scripts/ai-skills/hooks/plan/tasks.mjs, scripts/ai-skills/hooks/plan/tasks.d.mts, scripts/ai-skills/hooks/plan/bundles.mjs, scripts/ai-skills/hooks/plan/auto-approve.mjs, scripts/ai-skills/plan-tasks.test.ts, scripts/ai-skills/plan-bundles.test.ts, scripts/ai-skills/plan-auto-approve.test.ts
- proof: pnpm exec tsx --test scripts/ai-skills/plan-tasks.test.ts scripts/ai-skills/plan-bundles.test.ts scripts/ai-skills/plan-auto-approve.test.ts && pnpm run prism:check-types
- proof fails on main: yes
- depends on: none
- behavior change: `tasks.mjs` and `bundles.mjs` exit 2 naming the file when `.ai-skills/config.json` exists but does not parse, where before they read the defaults. `auto-approve.mjs` keeps its exit 2 and its message.

Owner: Clove. Child 4's `auto-approve.mjs` already refuses an unreadable config through its private `readStopPathConfig`, while `tasks.mjs` and `bundles.mjs` call `readRepoConfig` from `lib/command.mjs`, which returns null for a broken file. The skills in PR B are their first callers.

- **`tasks.mjs`.** Move `readStopPathConfig` here as an exported `readPlanConfig(repoRoot)`, with its JSDoc, check, and message unchanged. It throws a `PlanConfigError`, a new exported `Error` subclass, when the file exists but `readRepoConfig` returns null. `loadPlanState` reads `ticketPrefix` and `defaultBranch` through it.
- **`tasks.d.mts`.** Declare `readPlanConfig` and `PlanConfigError`.
- **`bundles.mjs`.** `readAliases` reads through `readPlanConfig`.
- **The CLI catch blocks** in `tasks.mjs` and `bundles.mjs` set exit 2 for a `PlanConfigError` and keep exit 1 for every other error.
- **`auto-approve.mjs`.** Delete `readStopPathConfig` and call `readPlanConfig` from `./tasks.mjs`, which it already imports.
- Leave `readRepoConfig` alone. The git hooks need its null for a broken file, as child 4 recorded.

Tests:

- **`plan-tasks.test.ts`.** A CLI case: in a fixture repo whose `.ai-skills/config.json` holds `{"ticketPrefix": "ACME",}`, `tasks.mjs <plan.md>` exits 2 and stderr names `.ai-skills/config.json`. Without the trailing comma, the same run exits 0.
- **`plan-bundles.test.ts`.** The same pair for `bundles.mjs`.
- **`plan-auto-approve.test.ts`.** The existing case that matches `exists but is not a readable JSON object` still passes unchanged.

## Challenge

## Decisions

- **The plan uses the folder shape and the chain task shape, as child 4's does.** The round runner lands in this child, so no challenge rounds ran, and Hunter McGrew approved the plan by hand in chat on 2026-11-18 ("Yes, all of it"). Commits use `PRISM-522: <summary> (T<n>)`, because the `T<n>:` subject rule lands here in T21.
  - **Where the bridge ends.** Child 4's closed plan named this child as the end of the folder-shape bridge, because this child lands approval, the round runner, and the `T<n>:` subject rule. This plan still can't use them on itself. It has no `intent.md` or `spec.md`, so `auto-approve.mjs` has nothing to check, and the tools are not merged while it builds. The first plan off the bridge is the next child's.
  - **Done is tracked by hand.** `tasks.mjs` reads `PRISM-522:` subjects as ticket subjects that complete nothing, so it reports every task open for the whole build. The session tracks done tasks from `## History` and `git log`, and builds the groups listed under `## Tasks` rather than running `bundles.mjs` on this plan. The groups match `analyzeBundles` run one stack PR at a time.
- **The shared workflow mechanics live in one always-on rule, `.prism/rules/workflow.md`, first in the AGENTS.md lead list.**
  - **Root cause.** The spec asks for the workflow block in `AGENTS.md` and `CLAUDE.md` as generated content. PRISM's `CLAUDE.md` is a pointer, and Claude reads always-on rules from `.claude/rules/`.
  - **Alternatives considered.** Hand-written blocks in the preamble and in `CLAUDE.md`, which drift. A reference file each skill cites, which charges every stage skill's line cap.
  - **Chosen approach.** One rule source reaches Claude (`.claude/rules/`, and per the Claude Code subagent docs, subagents too), Cursor (`alwaysApply`), and Codex (inlined first). That is the spec's "cannot drift" by construction.
  - **Implementation guidance.** The build-report shape and its routing live here too, so `prism-docs`, which sits at 117 of 120 lines, pays nothing for them. The Claude subagent claim is from the docs, not from a live run.
- **The Codex budget is met by compacting `skill-routing.md`, not by dropping lead sections.** The lead rules end near byte 30,549. Adding the workflow rule (target 7,000 bytes or less) and cutting skill-routing from 14,676 to 8,700 bytes or less leaves the last lead section near 31,600, under the 32,768 limit with about 1 KiB of headroom. Thrive's routing rule is 8,190 bytes in the same shape, so the target is reachable.
- **`roles.json` gains an `agent` type and `preloads`.**
  - **Root cause.** The spec makes `prism-spec` and `prism-challenge` dispatched subagents with no persona. PRISM's two types are `persona`, which needs a name, and `utility`, which gets no agent file. Neither fits.
  - **Alternatives considered.** Giving each stage a persona name, which contradicts the spec. A `utility` that still emits agent files, which breaks the meaning `utility` has in ADR-0046.
  - **Chosen approach.** A third type, plus the `preloads` field the spec names.
  - **Implementation guidance.** `RoleDefinition` is build-internal (`generate-skills.ts` and its tests), not a public API. Flagged here because it is a shared type inside the build.
  - **Approved:** Hunter McGrew, in chat on 2026-11-18: "Yes, all of it".
- **Skills spell script paths with a `${HOOK_RUNTIME_DIR}` token from a new `hookRuntimeDir` config key.** Child 4 left the spelling to this child. Alternatives:
  - A hard-coded `.claude/hooks/`, rejected because PRISM's own sessions would point at a path that does not exist in this tree.
  - Prose naming both paths, rejected because every reader pays for a path they can't use.
  - A `prism` subcommand, rejected because it adds public CLI surface and needs `npx` per call.

  The token defaults to `.claude/hooks`, so no consumer sets anything.
  - **Approved:** Hunter McGrew, in chat on 2026-11-18: "Yes, all of it".
- **The hook runtime files now reach Cursor-only installs, and only registrations stay per host.** The intent says a Cursor user approves from a terminal and that every skill keeps working on all three hosts. Child 4 left Cursor-only reach to this child. Alternatives:
  - A separate host-neutral directory, rejected for the same second-copy-path cost child 4 recorded.
  - Leaving Cursor-only installs on flat plans, rejected because the skills they receive would name scripts they don't have.

  The cost is a `.claude/hooks/` directory in a Cursor-only repo.
  - **Approved:** Hunter McGrew, in chat on 2026-11-18: "Yes, all of it". The approval covers the runtime files only. Git hook shims and `.gitignore` lines stay out of Cursor-only installs (see the shim-gating Decision below).
- **The approve guard is its own entry point and ignores both kill switches.** `hook.mjs` checks the switches before parsing stdin, and the spec exempts the approve guard from them. It does not use `segments.mjs`, because thrive's guard reads shell through its own segment walk over `tokenize.mjs`. That contradicts child 4's note that the guard would be the walker's first caller, and the walker stays callerless until child 8.
- **Cursor rows are dropped from the guard's harness table.** PRISM delivers no Cursor hooks, and `emitDeny` returns null for Cursor by policy. The local `declineForeignPayload` still declines Cursor's `beforeSubmitPrompt`, so a stray Cursor payload never writes a token.
- **`prism-architect` keeps prism-plan's evaluation coverage, trimmed to the cap.** The spec says the evaluation sections move unchanged. The intent says the 120-line cap counts everything and cut content is not moved, and the current skill loads 1,108 lines. Every evaluation heading survives as one line, while the A/P/C gate and the long output template do not, since the spec gives the architect five output sections.
- **The three `references/plan/` files are deleted, not slimmed.**
  - Plan mode's procedure is now `prism-plan` plus the workflow rule.
  - Re-plan is a workflow-rule paragraph.
  - The design-aware flag is replaced by the intent's Design line, and the scope-fit check already lives in `followup-scope.md`.
- **The resume table's later rows use existing skills until child 6.** Verify runs `verification-commands.md`, review runs `prism-self-review` writing `## Review`, PR runs the new `shipping-flow.md`, and retro runs `prism-retro`, then the session writes `Retro:`. Every merged step works before `prism-verify` and `REVIEW.md` exist, and child 6 swaps the rows.
- **The pause-before-commit preference fires at the PR push on a folder plan.** The stages commit through `commit.mjs` many times per run, and a pause per bundle would put the person back in the loop the intent removes. ADR-0082 records it.
- **The "Winston" sweep (T22) runs over spec surfaces only.** Root files outside the spec's Affected systems (`CONTEXT.md`, `README.md`, `CHANGELOG.md`, `SECURITY.md`) and dated records (`.prism/prds/`, `.prism/qa/`, `.prism/research/`) are left alone. Child 9 owns the user docs.
  - **Approved:** Hunter McGrew, in chat on 2026-11-18: "Yes, all of it".
- **`tasks.mjs` and `bundles.mjs` fail closed on a config that does not parse, through one reader shared with `auto-approve.mjs` (T25).**
  - **Root cause.** Child 4 left this to the child that writes the first callers, which is this one. Both scripts read config through `readRepoConfig`, which returns null for a broken file, so a trailing comma silently drops `importAliases`, `ticketPrefix`, and `defaultBranch`. Dropped aliases lose import edges, so two tasks that should run in order can run side by side. A dropped `defaultBranch` reads the wrong commit range for a plan with no `intent.md`, which can mark a task done that isn't.
  - **Alternatives considered.** Leaving them lenient, since `auto-approve.mjs` exits 2 on the same file before any build starts. Rejected, because the plan stage runs `bundles.mjs` before approval, and a config broken after approval reaches `bundles.mjs --base` and `tasks.mjs` with no check in front. A new `plan/config.mjs` module was the other home. Rejected, because `tasks.mjs` is already imported by both other scripts, and a new module adds a `HOOK_RUNTIME_FILES` entry and a delivery test for one function.
  - **Chosen approach.** `readStopPathConfig` moves to `tasks.mjs` as `readPlanConfig`, throwing `PlanConfigError`. Every chain command then gives one answer for a broken config: exit 2.
  - **Implementation guidance.** `readRepoConfig` stays unchanged for the git hooks. T25 sits in PR A because it changes runtime code the PR B skills call.
- **Exit 2 from a chain script stops the run, and exit 1 is the only failure that reaches the person as an approval ask.** Thrive's workflow says `plan.md` goes to the person "when `auto-approve.mjs` fails". Child 4's script now has two failures. Exit 1 means a condition failed, such as a stop path or a missing challenge round, and a person can judge the plan instead. Exit 2 means the config couldn't be read, so no stop path was checked, and an approval ask would have the person approve without knowing that. The same split applies in a build: a chain script's exit 2, or a `commit.mjs` git failure, returns `blocked`. T10, T14, and T16 carry it.
- **Git hook shims and the `.gitignore` lines stay gated on `claude` or `codex` when Cursor-only installs receive the runtime files (T6).** `git-hooks.md` records child 2's call that a Cursor-only consumer gets no git hooks, and the shim removal and `core.hooksPath` unset live in the same branch T6 removes. Deleting that branch whole would hand Cursor-only consumers git hooks as a side effect. T6 therefore narrows the branch to the runtime files, and `git-hooks-delivery.test.ts`'s Cursor-only cases stay unchanged as the proof. The `.gitignore` lines cover state files that only the registered entry points write, so a Cursor-only repo has nothing to ignore. This refines how T6 delivers. The call on Cursor-only delivery itself is approved in the Decision above.
- **`plan-chain-scripts.md` keeps its Templates paragraph after the skills cite the templates.** Child 4 cited the four templates there so `ship-closure` could reach them before any skill did, and named this child as the end of that bridge. T12, T13, T14, and T18 cite them from skills, so the bridge reason ends. The paragraph stays, because what it says about the headings and frontmatter keys the scripts read by name is a contract a template editor needs, whatever cites the files.
- **The issue's acceptance criteria were synced after Hunter approved the plan.** Writing them into issue #522 is a tracker edit, so it waited for his go-ahead, which came in chat on 2026-11-18 ("Yes, all of it"). The sync log records it.
- **The approve guard keeps the drive-letter prefix on its allow spelling.** `CHAT_APPROVE_COMMAND` and `PLAIN_WORD` take an optional `[A-Za-z]:` so an absolute Windows path passes after a PowerShell call's backslashes become slashes. Thrive's guard has no such prefix, and T4's swaps did not list it. It stays because a Windows session spells the command with its drive letter, so without the prefix the one allowed command would be denied there. The spelling adds no new allow: the command still has to realpath-match this repo's `approve.mjs`, and a same-session token must exist, so a drive-letter command naming another file is denied on every platform.
- **`readPlanConfig`'s error message is generic, which amends T25.** T25 asked for `readStopPathConfig`'s message unchanged, which ends "so its stop paths cannot be applied". `tasks.mjs` and `bundles.mjs` now throw it, and their runs have no stop paths, so the clause misled their users. The message ends at "is not a readable JSON object.", for all three commands. `auto-approve.mjs` still exits 2 and the text before the period is unchanged. The test that pinned the prefix now pins the whole line, and so do the `tasks.mjs` and `bundles.mjs` CLI cases.
- **OPEN — TBD, needs a live Codex run.** Whether a Codex hook payload's `session_id` equals the `CODEX_THREAD_ID` a command sees. **Default path (used until resolved):** `approve.mjs` compares a chat token's session against `CODEX_THREAD_ID`, so a mismatch fails closed, and a Codex user approves from a terminal.
- **Child 5 ships as a stack of two PRs.** The change is far past ten files and five hundred lines, and the approval trio alone is about 1,800 lines of source and 2,600 of tests. PR A is T1 to T8 plus T25, the approval mechanics and the chain scripts' config check, registered and delivered but called by no skill, so it ships inert and self-consistent. PR B is T9 to T24, the skills, rules, and docs that use it. The groups under `## Tasks` build PR A first, so its commits form a prefix of the branch.
  - **Whose call.** Stacking is the orchestrator's call under Hunter's 2026-11-18 ruling, so no separate approval is asked. The split above is the one chosen.
  - **Resolves** the earlier open question on whether child 5 stacks.
- **The delivery reason "the skills a consumer receives name these scripts" is out of PR A and comes back with PR B.**
  - **Root cause.** T7 and T8 wrote the clause as one of two reasons the runtime files reach every install. No skill, rule, or reference names `approve.mjs`, `HOOK_RUNTIME_DIR`, or `hooks/plan/` until T12 lands in PR B, so between the two merges the architect doc and the pages that repeat it say something false. Eric's PR review graded it Major, because a diverged architect-doc claim has that floor. The self-review had deferred it as Minor.
  - **Alternatives considered.** Recording the window as an accepted Decision and leaving the clause in. Rejected, because the other reason (a Cursor user runs the scripts from a terminal) holds now and carries the sentence alone, so dropping the clause costs nothing.
  - **Chosen approach.** Drop it from the `hook-runtime.md` Delivery path, its curated twin, `docs/ai-skills/compatibility.md`, the `hosts` row of `docs/parameterization.md`, and the `refreshHookRuntime` comment in `scripts/ai-skills/update.ts`.
  - **Implementation guidance.** T12 re-adds it in those places, in the commit where the first skill names the scripts. The T12 task carries the list.
- **Three references lost their only citations when T11, T14, and T19 removed the files that cited them, and are cited again from `branch-plan.md` and `skills-ecosystem.md`.**
  - **Root cause:** on `main`, `plan-lookup.md` and `structural-remedies.md` were cited from the old `prism-plan` and `prism-user-stories` bodies, and `triple-gated-adr-criterion.md` from `plan-mode.md`. After those removals nothing on the ship surface linked them, so `ship-closure` reported them as seeded files nothing reaches. `skills-ecosystem.md` named `structural-remedies.md` only as a bare filename, which does not resolve as a link.
  - **Alternatives considered:** excluding the three from the seed, rejected because the architect and the plan close still use them. Citing `structural-remedies.md` from `prism-architect`, rejected because T11 kept it uncited to protect the 120-line cap, and the citation took the skill from 93 to 116 loaded lines.
  - **Chosen approach:** `branch-plan.md` and its curated twin cite `plan-lookup.md` beside the folder-resolution sentence, and `triple-gated-adr-criterion.md` in the promotion step. `skills-ecosystem.md` and its curated twin cite `structural-remedies.md` by its full path in the architect's roster row. Rules and routed architect docs are closure roots and cost no skill lines.
  - **Implementation guidance:** a removal that deletes a file's last citer also has to re-home the citation, or `ship-closure` fails. Check with `pnpm exec tsx scripts/ai-skills/ship-closure.ts`.
- **Edits outside a task's own file list were absorbed into this PR, each because the task's change made the old text false or a gate failed without it.**
  - T11 changed `claude-agent-def.test.ts`, a T9 file. The test pinned the opus default on `prism-plan`, which T11 moves to `prism-architect`, and T11's proof runs it.
  - T12 updated the header comment of `agents-md-budget.test.ts`, a T10 file, to name the workflow rule as the first lead section, which T10 made true.
  - T20 changed the PR row of `workflow.md`, its seed twin, and `AGENTS.md`, all T10 files, to the full `.prism/references/shipping-flow.md` path T10 asked for. `crossref-lint` rejects that path until T20 creates the file.
  - T22 changed `context-reuse.md` and its twin, both T19 files, so `prism-plan` no longer carries "(Winston)", since it has no persona after T11.
  - T23 added ADR-0082 to the `excluded` list in `seed-curation.json`, because numbered ADRs never ship to consumers and the build otherwise mirrors it into the seed.
  - T23 amended ADR-0003 with a `> Amended by` note under its frontmatter instead of its `Status:` line. Twelve ADRs already use the note, none amend the status line, and the ADR guide's statuses are `accepted` and `superseded`.
  - T24 also rewrote Nora's, Parker's, and Pixel's hand-off lines and Pixel's mode 2 wording. They named Winston for planning, Mira for user stories, or only the mock-spec path, all false after T11, T18, and T19.
- **The epic resume row that waits on `## Retro` stays as written, and child 6 owns the fix.**
  - **Root cause:** nothing writes `## Retro` in `spec.md`, and `prism-retro` is read-only on plans, so an epic resume that waits on the section loops at retro.
  - **Alternatives considered:** a stopgap where the session appends the section. Rejected, because it would pre-empt child 6's design of who writes it.
  - **Chosen approach:** defer to child 6 (issue #530), which `prism-499/spec.md` gives the fixed retro and its check.
  - **Implementation guidance:** leave `.prism/rules/workflow.md` as is. The loop is only reachable on an epic-size chain run, and none happens before child 6 lands.

## History

- 2026-11-18 [huntermcgrew/prism-522-chain-skills]: Plan created: approval script, chat approval, and guard with delivery; registry agent type and preloads; workflow rule; architect, intent, spec, plan, and challenge skills; commit-only stages; user-stories removal; rule, ADR, and doc edits; as 24 tasks.
- 2026-11-18 [huntermcgrew/prism-522-chain-skills]: Merged `origin/main` with child 4 (bd666c58) and reconciled every task against its source: T3, T4, T6, T7, T10, T14, and T16 changed, T25 added for the config check, and the groups were rebuilt per stack PR and checked with `analyzeBundles`. The new Decisions cover the config check, exit-code routing, shim gating, and the Templates paragraph.
- 2026-11-18 [huntermcgrew/prism-522-chain-skills]: Recorded Hunter's chat approval of the plan, the four calls, and the two AC adjustments; the stacking Decision is now settled as A = T1-T8 + T25, B = T9-T24; synced the 11 criteria to issue #522.

- 2026-11-18 [huntermcgrew/prism-522-chain-skills]: Built T1, T2, T25, and T3: the `hookRuntimeDir` key and `HOOK_RUNTIME_DIR` token, the chat approval module, `readPlanConfig` with exit 2 on an unreadable config, and `approve.mjs` with every host's agent markers. T25 replaced the one existing test that pinned lenient reading of a broken config with exit-2 pairs.
- 2026-11-18 [huntermcgrew/prism-522-chain-skills]: Built T4 and T5: `approve-guard.mjs` as its own entry point, then its registration on both hosts, its delivery, and doctor coverage. The guard walks shell through its own segment walk over `tokenize.mjs` and not `segments.mjs`, so the walker still has no caller. It keeps a shebang line before the marker like `hook.mjs`, accepts a drive letter in the approve command, and assumes Codex's `Edit` and `Write` carry `file_path`, which is unverified.
- 2026-11-18 [huntermcgrew/prism-522-chain-skills]: T4 appended the hook-driven block of `plan-approve.test.ts`, held back from T3, which is a pinned test outside T4's file list. `approve-guard.d.mts` is `export {};` because the module is an entry point with no importers. T5's doctor warns about an unregistered guard on Codex as well as on Claude Code.
- 2026-11-18 [huntermcgrew/prism-522-chain-skills]: Built T6: `refreshHookRuntime` delivers every runtime file on every host, while the shims, registrations, and `.gitignore` lines still follow `hosts`. It deleted `removeDeliveredHookRuntimeFiles`, the `deliveredPaths` parameter of `pruneStaleHookRuntimeFiles`, and doctor's neither-host warning. It rewrote four `update.test.ts` cases and one `plan-runtime-delivery.test.ts` case that pinned the old removal, renamed the doctor case that only passed through the Codex inert warning, and added a Cursor-only doctor case.
- 2026-11-18 [huntermcgrew/prism-522-chain-skills]: Built T7 and T8: the hook-runtime, plan-chain-scripts, and git-hooks docs with their mirrors, the curated hook-runtime twin, `parameterization.md`, and `what-prism-writes.md`. The architect docs name the token as `HOOK_RUNTIME_DIR` without `${}`, because the build substitutes tokens in the platform copies. The curated twin gained its own short Approve guard subsection, since it carries no Git gates section to follow, and `parameterization.md` gained a `${HOOK_RUNTIME_DIR}` row in its token table as that page asks for a new token.
- 2026-11-18 [huntermcgrew/prism-522-chain-skills]: `docs/ai-skills/compatibility.md` still says the runtime is copied only when `hosts` includes `claude` or `codex` and that a Cursor-only repo gets no `.claude/hooks/`. It is outside PR A's task lists, so it was left for a follow-up call.
- 2026-11-18 [huntermcgrew/prism-522-chain-skills]: Self-reviewed PR A: 1 major (five Windows-only test failures from 8.3 temp paths and a slash regex) and 6 minor, recorded under `## Review`. The thrive port of the approval trio diffed clean apart from the listed swaps.
- 2026-11-18 [huntermcgrew/prism-522-chain-skills]: Fixed the self-review of PR A: the five Windows test failures (`a169e985`), three new guard cases and the ported shebang case (`8e45f6d4`), the stale `compatibility.md` and Codex session claims (`8951e24b`), and a generic config error (`b6d8920c`). Two new Decisions record the drive-letter spelling and the T25 message amendment, and the build wrote the three `hook-runtime.md` mirrors.
- 2026-11-18 [huntermcgrew/prism-522-chain-skills]: Self-reviewed the fixes (`c5dcdaa6..42adaf81`). All seven hold, and CI is green on both legs. Two minors are open (a missed 8.3 site in `approveCommandPath`, the stale PR body) and one is deferred to PR B, recorded in the second pass under `## Review`.
- 2026-11-18 [huntermcgrew/prism-522-chain-skills]: Fixed the second pass: `approveCommandPath` takes its base from the git toplevel (`11aa142d`), ADR-0081 carries a dated amendment note for the hook modules reaching every install (`7835ad89`), and the PR body was synced. Added the plan-citations lesson to `.prism/lessons.md` (`00ea6f97`).
- 2026-11-18 [huntermcgrew/prism-522-chain-skills]: Fixed Eric's PR review of PR A: the architect-doc claims (`7ac8b7f2`), two stale Cursor-only comments and the `readPlanConfig` JSDoc (`6f939bf6`), and the duplicated guard edit check (`2b971c5d`). The delivery clause dropped from PR A is a new Decision, and T12 now re-adds it in PR B.
- 2026-11-18 [huntermcgrew/prism-522-chain-skills]: Fixed Eric's re-review: the Token bullet and its curated twin now say a Codex `apply_patch` target is its whole patch text, so a patch naming the token file is denied (`fbfd5092`). Probed the guard on both halves of the sentence first, and added the half-rewording lesson to `.prism/lessons.md`.
- 2026-11-18 [huntermcgrew/prism-522-chain-skills-part-2]: Folded in two stack A review items: two token-arm guard cases (a Codex `apply_patch` naming the token file in another file's hunk denies, and a Claude `Edit` naming it only in `new_string` passes), and the `## PR Readiness` Build line, which cited `2b971c5d` as after the fourth pass fix when that SHA is older than `fbfd5092`.
- 2026-11-18 [huntermcgrew/prism-522-chain-skills-part-2]: Built T9: the `agent` role type and `preloads`, validated in `buildRoleMap` with no `build.ts` change. Persona-less roles skip the persona line, so the Codex builder needed no edit.
- 2026-11-18 [huntermcgrew/prism-522-chain-skills-part-2]: Built T10: `workflow.md` is 8,354 bytes, over its 7,000 target, and `skill-routing.md` went from 14,676 to 6,850 bytes (its seed twin is 6,476). The last lead section ends at byte 31,123, under the 31,744 line. The PR row names `shipping-flow.md` by filename because crossref-lint rejects the path until T20 creates the file, and T20 puts the path back.
- 2026-11-18 [huntermcgrew/prism-522-chain-skills-part-2]: Built T11: `prism-architect` (93 loaded lines) and `prism-plan` as a persona-less utility, with the build deleting `prism-plan`'s two agent files. `claude-agent-def.test.ts` moved its opus-tier cases to `prism-architect`, a file T9 listed but T11 did not, and `prism-plan`'s trigger words dropped the architecture phrases along with "Winston" and "evaluate the approach".
- 2026-11-18 [huntermcgrew/prism-522-chain-skills-part-2]: Built T12: `prism-intent` at 117 loaded lines, and the delivery clause "the skills a consumer receives name these scripts" back in the five places T12 lists. `agents-md-budget.test.ts` also got its header comment updated, since the workflow rule now leads. `consumer-sync-flow.md` still says the lead rules are "routing and the behavioral norms", a stale line in a file no task lists, left for a follow-up.
- 2026-11-18 [huntermcgrew/prism-522-chain-skills-part-2]: Built T13: `prism-spec` as an `agent` role at 115 loaded lines (66 body, 1 claude.md, 48 template), and a dispatched-stages line in the routing rule and its twin. The line is new, so T15 adds `prism-challenge` to it.
- 2026-11-18 [huntermcgrew/prism-522-chain-skills-part-2]: Built T14: `prism-plan` rewritten as the plan stage at 116 loaded lines (51 body, 1 claude.md, 64 template), the three `references/plan/` files deleted with their twins and platform copies, and the `prism-plan` allowlist entry removed. The plan-mode citation in `triple-gated-adr-criterion.md` and its twin now reads "the plan stage's decision promotion at close".
- 2026-11-18 [huntermcgrew/prism-522-chain-skills-part-2]: Built T15: `prism-challenge` is an `agent` role with the plan-round grammar (60 lines, no citations), and the routing rule names it on the dispatched-stages line beside its trigger phrases. The AGENTS.md lead sections now end at byte 31,645 of the 31,744 working limit, so T19's routing edit has to shrink the rule.
- 2026-11-18 [huntermcgrew/prism-522-chain-skills-part-2]: Built T16: `prism-implement` and `prism-docs` commit their bundle and return the build report on a plan folder, and keep the ship steps for a flat plan. Measured loaded lines are 69 for `prism-implement` and 117 for `prism-docs`, which dropped its "Describe observable behavior" bullet to fit. `prism-implement` now preloads `tdd`, and its Claude agent file lists it under `skills:`.
- 2026-11-18 [huntermcgrew/prism-522-chain-skills-part-2]: Built T17: `tdd` gained the test-first rules, the rule for changing an existing test, and a mutation check for every new test. It no longer asks the user to confirm a seam, because on a plan the task's `proof` names it.
- 2026-11-18 [huntermcgrew/prism-522-chain-skills-part-2]: Built T18: `prism-design` mode 2 is "saved design", written to `design.md` on a plan folder whose intent needs a design and to `.prism/design/mocks/` otherwise. It loads 107 lines, the plan `## Design` summary and its status list are gone, and on a plan folder the handoff is the next resume-table row.
- 2026-11-18 [huntermcgrew/prism-522-chain-skills-part-2]: Built T19: removed `prism-user-stories`, its two references, their twins and generated outputs, and swept the `prism-prd`, `prism-start-ticket`, `context-reuse`, routing, ecosystem, `bootstrap-from-claude.ts`, and allowlist mentions. Two `prism-user-stories` mentions remain outside T19's list, in `templates/install/AGENTS.md.tmpl` (T22's) and `docs/personas.md` (T24's). The lead sections now end at byte 31,600.
- 2026-11-18 [huntermcgrew/prism-522-chain-skills-part-2]: Built T20: `.prism/references/shipping-flow.md` holds the PR stage flow, and `prism-self-review` records a folder plan's result under `## Review` and commits it as `plan: review` (63 loaded lines). The PR row in `workflow.md` and its mirrors now cite the full path `.prism/references/shipping-flow.md`, which T10 left as a bare filename until this file existed.
- 2026-11-18 [huntermcgrew/prism-522-chain-skills-part-2]: Built T21: `git-conventions.md` gained a "Folder-plan branches" subsection and the per-bundle commit granularity, `branch-plan.md` gained the folder form of the plan-only commit and the folder-plan template sentence, and `closing-messages.md` scopes "no persona auto-invokes another" to outside a plan folder. The curated `branch-plan.md` twin carries only the template sentence, because it has no "Landing a plan-only commit" section to extend.
- 2026-11-18 [huntermcgrew/prism-522-chain-skills-part-2]: Built T22: the planner role moved off Winston's name across SPEC, the rules, templates, references, the ecosystem, workflow, closing-message and plan-authoring docs, `AGENTS.md.tmpl`, and the onboarding suggestion, with Mira's rows pointing at `prism-intent`. Left for child 9: `onboarding.md`, `business-layer.md`, `code-standards.md`, `verification-commands.md`, `qa-test-planning.md`, lines 5 and 45 of `triple-gated-adr-criterion.md` and its seed twin, `prism-handoff`'s `/prism-plan` example, the Pixel, Atlas, and Parker examples in `closing-messages.md`, the ADR mentions, and the dated records. Root files and `docs/` were not touched, and `structural-remedies.md`, `triple-gated-adr-criterion.md`, and `plan-lookup.md`, which T11, T14, and T19 left with no citation and so failed `ship-closure`, are cited again from `prism-architect` and `branch-plan.md`.
- 2026-11-18 [huntermcgrew/prism-522-chain-skills-part-2]: Built T23: ADR-0082 records that the session's PR stage pushes once on a folder-plan branch while `prism-implement` and `prism-docs` commit only, with its README row. ADR-0003 carries the amendment as a `> Amended by` note after its frontmatter, the form ADR-0014 and ADR-0043 use, not in its `Status:` line, which stays `accepted`. `seed-curation.json` also lists ADR-0082 as excluded, a file T23 does not name, because the build otherwise mirrors the ADR into the install seed.
- 2026-11-18 [huntermcgrew/prism-522-chain-skills-part-2]: Built T24: `docs/personas.md` points Mira at `prism-intent` and Winston at `prism-architect`, drops every `prism-user-stories` mention, and gains a "Chain stages (no persona)" section for `prism-spec`, `prism-plan`, and `prism-challenge`. Nora, Parker, and Pixel's hand-off lines and Pixel's mode 2 wording changed with them, and `prism-challenge` left the utility table, since it is now a stage as well as a direct skill.
- 2026-11-18 [huntermcgrew/prism-522-chain-skills-part-2]: Fixed nine of Briar's eleven PR B findings and Winston's three scope items (`efc91b48`). `structural-remedies.md` is now cited from the architect's roster row and not from the skill, and findings 5 (the epic resume row) and 6 (the two plan-record subjects) stay open for a ruling.
- 2026-11-18 [huntermcgrew/prism-522-chain-skills-part-2]: Applied the rulings on the three open items: `prism-self-review` and `branch-plan.md` now agree on the folder-plan record subject (`9cf06720`), the Nora rows, Improvement and UX-concern flows, ticket-types lines, and personas line now route through the intent and spec stages (`d45f44d8`), and the epic resume row is deferred to child 6 with a Decision.
- 2026-11-18 [huntermcgrew/prism-522-chain-skills-part-2]: Finished finding 1's class (`ad481ce3`): `prism-start-ticket` and the DX workflow now send improvement and DX tickets to `prism-intent`, the Pixel decision tree goes on to the spec stage, and the two "intent is optional" lines were reworded. `## PR Readiness` now matches the findings' state.
- 2026-11-18 [huntermcgrew/prism-522-chain-skills-part-2]: Fixed Briar's second pass (`d881c3bf`): a DX intent holds machine-checked criteria and only the tracker field says "None", which clears the `approve.mjs` check, and the no-folder design route names `prism-architect` first in the tables. The Parker guide now says Mira writes the intent, and a lesson records the gate check.

## Sessions

- 2026-11-18 [huntermcgrew/prism-522-chain-skills] open: Intent: plan child 5 (chain skills and approval) to the detail bar from the epic spec and thrive at db3570975. Bounds: plan file only, no code, no PR, nothing outside the spec's Affected systems, no new dependency, and flag any shared-type or public-surface change. Approach: put shared mechanics in one always-on workflow rule so stage skills fit the cap, port the approval trio onto PRISM's runtime, and order tasks so the approval mechanics form a clean first stack PR. · close: scope held
- 2026-11-18 [huntermcgrew/prism-522-chain-skills] open: Intent: refresh this plan against what child 4 merged (#528, bd666c58). Bounds: plan file only, no code; keep the two-PR stack unless the refresh changes what ships together; leave Hunter's four pending calls as they are. Approach: merge main, diff every task's named module, export, flag, exit code, and config key against child 4's source, decide child 4's two hand-offs as Decisions, and recheck the groups with `analyzeBundles`. · close: scope held; PR A gains T25, and T6 narrowed to keep child 2's git hook gating
- 2026-11-18 [huntermcgrew/prism-522-chain-skills] open: Intent: build PR A (T1-T8, T25) of this plan, after recording Hunter's approvals. Bounds: PR A's task files and generated copies only; no PR B tasks, no new dependency, no merge, draft PR only. Approach: approvals commit first, then one commit per task in the plan's group order, porting thrive's approval trio onto PRISM's runtime. · close: scope held; one pinned test outside T4's list (`plan-approve.test.ts`) and one stale prose home left for a call (`docs/ai-skills/compatibility.md`)
- 2026-11-18 [huntermcgrew/prism-522-chain-skills] open: Intent: self-review PR A (T1-T8, T25) against the plan, the rules, and thrive. Bounds: the plan's `## Review`, `## PR Readiness`, `## History`, and `## Sessions` only; no source fixes, no GitHub posts. Approach: run `prism:check`, diff the ported trio against thrive at db357097, and source-verify the edited architect docs. · close: scope held
- 2026-11-18 [huntermcgrew/prism-522-chain-skills] open: Intent: self-review the PR A fix commits (`c5dcdaa6..42adaf81`). Bounds: the plan's `## Review`, `## PR Readiness`, `## History`, and `## Sessions` only; no source fixes, no GitHub posts, no merge. Approach: wait on CI for both legs, run `prism:check`, mutation-probe the new guard cases, and source-verify the edited Hosts claim and `compatibility.md`. · close: scope held; the frontmatter probe edit was reverted and the tree left clean
- 2026-11-18 [huntermcgrew/prism-522-chain-skills] open: Intent: fix Eric's findings on PR A (three Major architect-doc claims, three Minor, and the PR body). Bounds: the named files and their build mirrors, the plan, and the PR body; no resolving threads, no merge, no flipping the PR ready, no CI polling. Approach: probe the guard to confirm the token-arm claim before rewording it, fix in three commits, then the plan in its own. · close: scope held; the `refreshHookRuntime` comment in `update.ts` carried the dropped clause too and was fixed with it
- 2026-11-18 [huntermcgrew/prism-522-chain-skills] open: Intent: fix Eric's one remaining major on PR A, the Token bullet's file-edit half. Bounds: `hook-runtime.md` and its curated twin with their mirrors, the plan's third-pass entry, one lesson, and the PR body; no other files, no merge, PR stays draft. Approach: probe the guard on both halves of the sentence before rewording, then record it in the plan after the doc commit. · close: scope held
- 2026-11-18 [huntermcgrew/prism-522-chain-skills-part-2] open: Intent: build PR B (T9-T24) of this plan, plus two stack A review fold-ins. Bounds: PR B's task files and generated copies only; no new dependency, no merge, no close of the plan, draft PR only. Approach: one commit per task in the plan's group order, porting thrive's skills at db357097 onto PRISM's registry and always-on rules. · close: drifted: a few edits fell outside a task's file list or text (`workflow.md` path in T20, the curated `branch-plan.md` twin in T21, three re-added citations and extra mentions in T22, the `seed-curation.json` entry in T23, and hand-off lines in T24), each recorded in `## History`
- 2026-11-18 [huntermcgrew/prism-522-chain-skills-part-2] open: Intent: fix Briar's PR B findings and Winston's three scope items. Bounds: the files the findings and items name, with their twins and generated copies; no new dependency, no merge, draft PR only. Approach: verify each cited line against the current text before editing, rule on findings 5, 6, and 7 from the spec and ADR-0080, and commit the fixes before the plan record. · close: scope held; the same-class routes the finding 1 entry lists were left alone, and findings 5 and 6 stay open
- 2026-11-18 [huntermcgrew/prism-522-chain-skills-part-2] open: Intent: apply the orchestrator's rulings on findings 6, 5, and 1's leftovers. Bounds: the files those three items name, with their twins and generated copies, and the plan record; no new dependency, no merge, draft PR only. Approach: grep every `plan: review` and every same-class route, fix them in two commits, then record both in the plan. · close: scope held; `prism-start-ticket`'s handoff line sends an improvement to `prism-plan` and was left for a call, since no item names it
- 2026-11-18 [huntermcgrew/prism-522-chain-skills-part-2] open: Intent: apply the orchestrator's rulings on the leftovers of finding 1's class. Bounds: `prism-start-ticket`, the Pixel decision tree, the two optional-intent lines, and the plan record, with twins and generated copies; no merge, draft PR only. Approach: take the DX route from `ticket-types.md` where it gives one, and fix it too when it is the refused plan-stage route. · close: scope held; the DX workflow line of `ticket-types.md` named the plan stage, so it was changed with the skill
- 2026-11-18 [huntermcgrew/prism-522-chain-skills-part-2] open: Intent: re-review PR B's commits `fb46a9c6..5a4069ff` and confirm the first pass's findings are closed. Bounds: the review record in this plan only; no source edits, no merge. Approach: tree-search each first-pass finding, verify the new routes against `approve.mjs` and the skills they name, run `prism:check`, and read the head's CI. · close: scope held

## Verification

## Review

Self-review of PR A (#531), 2026-11-18 [huntermcgrew/prism-522-chain-skills], range `bd666c58..d8f2ad70`. 1 major, 6 minor.

### Five approval tests fail on Windows from 8.3 short temp paths and a forward-slash regex

- **Severity:** `major`
- **Status:** `fixed`
- **Fixed in:** `a169e985`: a shared `resolveFixtureRoot` helper in `scripts/ai-skills/lib/fixture-root.ts` uses `realpathSync.native` at the three fixture-root sites, and the regex reads `acme-2[\\/]intent\.md`. The Windows leg was not rerun here, and the failure does not reproduce on Linux.
- **File:** `scripts/ai-skills/plan-chat-approval.test.ts:159`
- **Problem:** `prism-check (windows-latest)` fails 5 tests (run 44348696721), so AC-10 is unmet. Four tests build expected paths with `realpathSync(root)`, which on Windows keeps the `RUNNER~1` short name, while `git rev-parse` and `approve.mjs`'s `realpathSync.native` return `runneradmin`. Those are `plan-chat-approval.test.ts:159` and `:246`, plus `approve-guard.test.ts:1095`, which runs once each for claude and codex. The fifth, `plan-approve.test.ts:1089`, matches `acme-2\/intent\.md` against a message that prints `\` on Windows. The product compares through `comparablePath` and is consistent, so only the tests are wrong.
- **Suggested fix:** use `realpathSync.native` at the three fixture-root sites, and `acme-2[\\/]intent\.md` in the regex. Then rerun the Windows leg.

### The approve guard's `approved_via`-only edit has no regression test

- **Severity:** `minor`
- **Status:** `fixed`
- **Fixed in:** `8e45f6d4`: one Claude `Edit` case and one Codex `apply_patch` case. Both fail when `approved_via` is added to `approvalLines`'s keys and the approval-line pattern.
- **File:** `scripts/ai-skills/approve-guard.test.ts:844`
- **Problem:** T4 says an edit that changes only `approved_via` passes, as it does in thrive. A probe confirms it does, but no case pins it, so a change to `approvalLines` could start denying it unnoticed.
- **Suggested fix:** add one Claude `Edit` case and one Codex `apply_patch` case that change only `approved_via` on an approved `intent.md` and assert no deny.

### The drive-letter allow spelling is outside the listed swaps and untested

- **Severity:** `minor`
- **Status:** `fixed`
- **Fixed in:** `8e45f6d4`: a `win32` PowerShell case allows the drive-letter spelling under a fresh token, and a case on every platform denies a drive-letter command naming another file under a fresh token. The spelling stays, per the Decision on it.
- **File:** `scripts/ai-skills/hooks/approve-guard.mjs:302`
- **Problem:** `CHAT_APPROVE_COMMAND` and `PLAIN_WORD` accept a `(?:[A-Za-z]:)?` prefix, a new allow spelling for an approval control. It is recorded only in `## History`, not as a Decision, and no test covers the allow side. It still requires a realpath match and a same-session token, so it does not weaken the guard.
- **Suggested fix:** add a `win32` case that allows `node C:/…/approve.mjs <path>` under a token, plus a one-line Decision.

### Thrive's shebang-executable guard test was dropped without a plan line

- **Severity:** `minor`
- **Status:** `fixed`
- **Fixed in:** `8e45f6d4`: the case runs a chmodded copy of the guard through its shebang and skips on `win32`. The source file is mode 100644, so the test copies the hooks directory and sets the bit, the way `prism update` does on delivery.
- **File:** `scripts/ai-skills/approve-guard.test.ts:1`
- **Problem:** thrive's `hook.test.mjs:1334` ("the hook runs as an executable through its shebang") has no counterpart. T4 lists only the Cursor rows as dropped, and the guard keeps its shebang line.
- **Suggested fix:** port the case behind a `win32` skip, or record why it was dropped.

### `docs/ai-skills/compatibility.md` still says a Cursor-only repo gets no `.claude/hooks/`

- **Severity:** `minor`
- **Status:** `fixed`
- **Fixed in:** `8951e24b`: the two statements on `docs/ai-skills/compatibility.md` now say every install gets the runtime files and the registrations, git hook shims, and `.gitignore` lines follow `hosts`. Folded into PR A instead of PR B, because PR A changed the behavior.
- **File:** `docs/ai-skills/compatibility.md:81`
- **Problem:** `:73` and `:81` say the runtime is copied only when `hosts` includes `claude` or `codex`, which T6 reversed. Doctor's not-delivered message at `scripts/ai-skills/doctor.ts:1152` links readers to this page. Already named in the PR body and `## History`.
- **Suggested fix:** fold a two-sentence fix into PR B's docs task (`prism-docs`), so the page is corrected before both PRs reach `main`.

### `hook-runtime.md` doesn't say that `approve.mjs` skips the session check with no Codex thread id

- **Severity:** `minor`
- **Status:** `fixed`
- **Fixed in:** `8951e24b`: the Hosts paragraph and its curated twin now say that a mismatch fails closed only with `CODEX_THREAD_ID` set. With only `CODEX_CI` or `CODEX_SESSION_ID`, `approve.mjs` skips its session check and the guard's same-session check stands alone.
- **File:** `.prism/architect/_toolkit/hook-runtime.md:72`
- **Problem:** "a mismatch fails closed, since `approve.mjs` refuses a token from another session" holds only when `CODEX_THREAD_ID` is set. A session marked only by `CODEX_CI` or `CODEX_SESSION_ID` gets a null session id, and `approve.mjs:289` then skips the check, so the guard's same-session check stands alone. The source comment at `approve.mjs:446` says this, but the doc does not.
- **Suggested fix:** add that clause to the Hosts paragraph and its curated twin. Alternatively, refuse in `approve.mjs` when `inAgentSession` holds and no session id is available.

### `readPlanConfig`'s error names stop paths when `tasks.mjs` or `bundles.mjs` throws it

- **Severity:** `minor`
- **Status:** `fixed`
- **Fixed in:** `b6d8920c`: the message ends at "is not a readable JSON object.", and the three CLI tests pin the whole stderr line. See the Decision on the amendment to T25.
- **File:** `scripts/ai-skills/hooks/plan/tasks.mjs:308`
- **Problem:** the message ends "so its stop paths cannot be applied", which misleads a `tasks.mjs` or `bundles.mjs` user, whose run has no stop paths. T25 asked for the message unchanged, so the code follows the plan.
- **Suggested fix:** end the message at "is not a readable JSON object" and amend T25's wording to match.

### Second pass: the fixes

Self-review of the PR A fixes, 2026-11-18 [huntermcgrew/prism-522-chain-skills], range `c5dcdaa6..42adaf81`. 0 major, 2 minor open, 1 minor deferred. All seven first-pass fixes hold. `prism:check` passes locally, and CI run 44351936636 is green on `ubuntu-latest` and `windows-latest`. The Windows leg ran the drive-letter allow case (it did not skip) and passed the four 8.3 sites and the regex case. A mutation probe that adds `approved_via` to `APPROVAL_KEYS` and the approval-line pattern fails both new `approved_via` cases, and they pass again after the revert. The `hook-runtime.md` Hosts claim matches `approve.mjs:448-451` and the guard's `token?.session === session` at `approve-guard.mjs:688`. No cleanup items.

### The guard test's `approveCommandPath` still builds the expected path with plain `realpathSync`

- **Severity:** `minor`
- **Status:** `fixed`
- **Fixed in:** `11aa142d`: `approveCommandPath` takes its base from `git rev-parse --show-toplevel` and falls back to `realpathSync(cwd)` when git fails, the order the guard uses. It does not use `resolveFixtureRoot`, so the non-git `makeRepo` cases still resolve.
- **File:** `scripts/ai-skills/approve-guard.test.ts:175`
- **Problem:** this is the same 8.3 class the first-pass major fixed, at a site that fix missed. For a git fixture (`makeGitRepo`), the guard bases its `<rel>` on `git rev-parse --show-toplevel`, which gives the long name (`approve-guard.mjs:323`). The test bases it on `realpathSync(cwd)`, which keeps `RUNNER~1`. The two only differ when the checkout shares the short-named profile directory with the temp dir, so CI's `D:` checkout can't hit it. This is minor because it fails only on a local Windows checkout under a long-named user profile, and I reasoned it out rather than ran it.
- **Suggested fix:** derive the base the way the guard does, which is `git rev-parse --show-toplevel` and then plain `realpathSync` on failure. A blanket switch to `resolveFixtureRoot` would break the non-git `makeRepo` cases, where the guard falls back to plain `realpathSync` (`approve-guard.mjs:330`).

### `compatibility.md` says the delivered skills name the runtime scripts, which no PR A skill does

- **Severity:** `minor`
- **Status:** `fixed`
- **Fixed in:** `7ac8b7f2`: the clause is dropped from both pages and every other place that carried it, and T12 re-adds it. See the Decision on the dropped clause and the third pass below.
- **File:** `docs/ai-skills/compatibility.md:73`
- **Problem:** "because the skills you receive name those scripts". No skill under `.ai-skills/skills/` names `approve.mjs`, `HOOK_RUNTIME_DIR`, or `hooks/plan/` until PR B lands T12 to T18. `hook-runtime.md:9` has made the same claim since T7. This is minor because the claim is false only between PR A's merge and PR B's, and the other reason it gives (a Cursor user runs them from a terminal) holds now.
- **Suggested fix:** none while PR B ships. If PR B stalls, cut the clause from both pages.

### The PR body still reports the Windows leg unrun and `compatibility.md` stale

- **Severity:** `minor`
- **Status:** `fixed`
- **Fixed in:** the PR body, rewritten with `gh pr edit --body-file`. "Not verified" drops Windows and AC-10, a "Verified on CI" bullet cites run 44353891936 on 7345ce2b, and the stale-prose bullet now says `compatibility.md` was updated here and that its "skills name those scripts" clause becomes true when PR B merges. The config bullet mentions the generic error.
- **File:** PR #531 body, the "Not verified" and "Stale prose left in place" bullets
- **Problem:** the body says Windows "was not run" and AC-10 is open, and it says `compatibility.md` needs a fix in part 2 or a follow-up. Both are now wrong. CI is green on both legs, and `8951e24b` fixed the page in this PR. This is minor because the PR squash-merges, so the body becomes `main`'s commit description and would carry both false claims into history.
- **Suggested fix:** sync the body. Drop Windows and AC-10 from "Not verified", replace the stale-prose bullet with a line saying `compatibility.md` was fixed here, and mention the generic config error and the two new Decisions.

### Third pass: Eric's PR review

Eric's review of PR #531 at `ad4f3d68`, range `bd666c58..ad4f3d68`, 2026-11-18. 3 major, 3 minor, plus 1 PR body note. All are fixed. The guard probes behind finding 2 were rerun here: the Codex `apply_patch <<EOF` shell form and a Claude `Write` to the token file deny, and a Claude `Edit` or Codex `apply_patch` tool call adding `UserPromptSubmit` to a registration file passes.

### The entry-guard section of `plan-chain-scripts.md` says four commands, and there are five

- **Severity:** `major`
- **Status:** `fixed`
- **Fixed in:** `7ac8b7f2`: the section says every command carries the guard, and "before a bundled module imports a command module". `approve.mjs`, `auto-approve.mjs`, `bundles.mjs`, `commit.mjs`, and `tasks.mjs` each carry it.
- **File:** `.prism/architect/_toolkit/plan-chain-scripts.md:30`
- **Problem:** the Invocation paragraph lists five commands, and `plan/approve.mjs:423-426` has the same realpath `process.argv[1]` guard, so "the four commands" and "one of the four" were wrong.
- **Suggested fix:** state the rule ("every command") instead of a count.

### The Token bullet of `hook-runtime.md` says a file edit naming a prompt-submit event is denied

- **Severity:** `major`
- **Status:** `fixed`
- **Fixed in:** `7ac8b7f2`: the bullet and the curated twin's "What it denies" bullet now say a shell command is denied for naming the token file or a prompt-submit event, and a file edit only when its target names the token file. This fixed the event half and narrowed the target half too far: a Codex `apply_patch` target is the whole patch text, so any patch naming the token file is denied. The fourth pass below corrects it. The architect doc names the known miss, and says the Codex `apply_patch <<EOF` form is a shell command and is denied.
- **File:** `.prism/architect/_toolkit/hook-runtime.md:59`
- **Problem:** `touchesToken` checks a file edit's target against the token file name and never checks for an event name, so a Claude `Edit` or Codex `apply_patch` call adding `UserPromptSubmit` to a registration file passes. The header of `approve-guard.mjs` lists edits to the harness settings files as a known miss.
- **Suggested fix:** split the sentence into shell commands and file edits, and name the known miss.

### The delivery clause "the skills a consumer receives name these scripts" is false in PR A

- **Severity:** `major`
- **Status:** `fixed`
- **Fixed in:** `7ac8b7f2`: the clause is dropped from `hook-runtime.md`, its curated twin, `docs/ai-skills/compatibility.md`, the `hosts` row of `docs/parameterization.md`, and the `refreshHookRuntime` comment in `update.ts`, which carried it too. T12 re-adds it. See the Decision on the dropped clause.
- **File:** `.prism/architect/_toolkit/hook-runtime.md:9`
- **Problem:** no skill, rule, or reference names the scripts until PR B, so the clause was false at this head. The second pass had graded it Minor and deferred it, but a diverged architect-doc claim is Major.
- **Suggested fix:** drop the clause here and keep the Cursor-terminal reason. PR B re-adds it.

### Two comments still call an absent `install.mjs` a Cursor-only case

- **Severity:** `minor`
- **Status:** `fixed`
- **Fixed in:** `6f939bf6`: both comments name a clone that never ran an update, which is the case that remains.
- **File:** `scripts/ai-skills/hooks/git-hooks/install.mjs:500`
- **Problem:** T6 delivers `install.mjs` to a Cursor-only install, and `git-hooks.md` was reworded for that, but this comment and the one at `scripts/ai-skills/git-hooks-install.test.ts:543` were missed.
- **Suggested fix:** say a clone that never ran an update.

### The approve guard's two host rows repeat one edit check

- **Severity:** `minor`
- **Status:** `fixed`
- **Fixed in:** `2b971c5d`: `editChangesApproval(harness, payload, cwd)` holds the resolve, read, and compare body, and both rows call it with their own `editTarget`. Behavior is unchanged, and `approve-guard.test.ts` and `plan-approve.test.ts` pass as they were.
- **File:** `scripts/ai-skills/hooks/approve-guard.mjs:491`
- **Problem:** the Codex `Edit` and `Write` branch repeated the Claude row's `deniesEdit` body at 458-465.
- **Suggested fix:** a shared helper.

### `readPlanConfig`'s JSDoc gives only the stop-path reason

- **Severity:** `minor`
- **Status:** `fixed`
- **Fixed in:** `6f939bf6`: the JSDoc adds that a dropped `importAliases` loses import edges and a dropped `defaultBranch` reads the wrong commit range, which is why `tasks.mjs` and `bundles.mjs` fail closed too.
- **File:** `scripts/ai-skills/hooks/plan/tasks.mjs:290`
- **Problem:** the comment explained failing closed only for `auto-approve.mjs`, though `tasks.mjs` and `bundles.mjs` read through it as well.
- **Suggested fix:** add the reason for the other two callers.

### The PR body cites an old CI run and omits two changes

- **Severity:** `minor`
- **Status:** `fixed`
- **Fixed in:** the PR body, rewritten with `gh pr edit --body-file`. It cites the CI state of the new head, mentions the ADR-0081 amendment note and the `.prism/lessons.md` entry, and ticks "Build succeeds".
- **File:** PR #531 body
- **Problem:** the body cited run 44353891936 on `7345ce2b` where the head had moved, and left out the amendment and the lesson.
- **Suggested fix:** cite the head's run, mention both, and tick the Build box.

### Fourth pass: Eric's re-review

Eric's re-review of PR #531 at `7390d3d8`, 2026-11-18. 1 major, now fixed.

### The Token bullet of `hook-runtime.md` understates the Codex deny

- **Severity:** `major`
- **Status:** `fixed`
- **Fixed in:** `fbfd5092`: the bullet and the curated twin's "What it denies" bullet now say a file edit is denied when its target names the token file, a Claude `Edit` or `Write` is judged on its `file_path` alone, and a Codex `apply_patch` call's target is its whole patch text, so a patch naming the token file anywhere is denied. Probed against `approve-guard.mjs` before rewording: Codex `apply_patch` with an added line naming the token file in a hunk for another file denies, Claude `Edit` with `new_string` naming it passes, Codex `apply_patch` or Claude `Edit` adding `UserPromptSubmit` to a registration file passes, a Claude `Write` or Codex patch creating the token file denies, and a shell `grep` or `cat` passes while a shell write or the `apply_patch <<EOF` form denies.
- **File:** `.prism/architect/_toolkit/hook-runtime.md:59`
- **Problem:** the third-pass fix reworded the file-edit half to "whose target is the token file". `touchesToken` tests a Codex patch's whole text against the token file name, so a patch that only mentions the file in another hunk is denied. This doc and its twin both name the file, so a Codex patch to either is denied.
- **Suggested fix:** keep the target rule for Claude and add the Codex patch-text case to both bullets.

### PR B, first pass: Briar's self-review

Briar's self-review of PR #532, 2026-11-18 [huntermcgrew/prism-522-chain-skills-part-2], range `origin/main...2cf5d71b`. 4 major, 7 minor, all open. `pnpm run prism:check` passes locally at `2cf5d71b` (2163 pass, 0 fail, 2 skipped), and CI run 44368244035 on `2cf5d71b` is green on both platforms. Out-of-plan files were reviewed for content only, since their scope gets a separate check.

### Handoff tables send Mira's intent and Pixel's design to a plan stage that refuses without a spec

- **Severity:** `major`
- **Status:** `fixed`
- **Fixed in:** `efc91b48`, `d45f44d8`, and `ad481ce3`. `efc91b48`: the Mira and Pixel rows of `closing-messages.md`, the Feature sequence of `ticket-workflows.md` (a spec stage step added), the Mira and Pixel rows of `AGENTS.md.tmpl`, and the stale "always routes through Winston" clause of the `skills-ecosystem.md` seed twin. Each fixed directly, and the five handoff tables were not restructured. `d45f44d8` fixed the leftovers the same direct way, without restructuring the tables: the Nora rows of `closing-messages.md` and `skills-ecosystem.md` now send an improvement to Mira's intent, the Improvement and UX-concern flows of `ticket-workflows.md` add the spec stage, `ticket-types.md` lines 24, 25, and 34 do the same, and `docs/personas.md` line 76 names Mira for an improvement. The curated twins and generated copies carry the same edits. `ad481ce3` finished the class: the `prism-start-ticket` handoff and the DX workflow in `ticket-types.md` now go to `prism-intent`, the Pixel decision tree in `ticket-workflows.md` sends the person on to the spec stage, and the two "intent is optional" lines (the Improvement type in `ticket-workflows.md` and `ticket-types.md`) now say the intent starts the chain, with small fixes taking the shortcut.
- **File:** `.prism/architect/_toolkit/closing-messages.md:26`
- **Problem:** `closing-messages.md` lines 26-27 route Mira and Pixel to the plan stage, the Feature sequence in `ticket-workflows.md` line 36 runs Mira, Pixel, then the plan stage, the Mira row in `templates/install/AGENTS.md.tmpl` routes to `prism-plan`, and the install twin `skills-ecosystem.md` line 91 still says mode 2 "always routes through Winston". `prism-plan` refuses a folder with no `spec.md`, while `skills-ecosystem.md` and `docs/personas.md` route Mira to the spec stage, so these architect docs diverge from the skills and from each other. This is major because a reader following them stalls at a refusal.
- **Suggested fix:** route an approved intent, and a saved design on a folder plan, to the spec stage in all four places and their generated copies.

### Approach and architecture calls still go to the plan skill after the planner split

- **Severity:** `major`
- **Status:** `fixed`
- **Fixed in:** `efc91b48`: the architecture and approach calls in `prism-design`, `prism-implement`, and `prism-prd` now name `prism-architect`, and `context-reuse.md` no longer cites the dead startup step. Three citations were not approach calls and went elsewhere. The AC-rewrite lines (`prism-implement` line 37, `prism-qa-plan` lines 36 and 37) go to the criterion's owner, `prism-intent` on a folder plan, as `.prism/references/qa-plan/verdict-contract.md` already says. `prism-docs` lines 1 and 27 stay on the plan skill, since the plan stage runs decision promotion at close per `branch-plan.md`.
- **File:** `.ai-skills/skills/prism-design/shared.md:33`
- **Problem:** after T22 moved approach judgment to `prism-architect`, these lines still send it to the plan skill: `prism-design/shared.md` lines 1, 33, and 36, `prism-implement/shared.md` lines 1, 24, and 37, `prism-docs/shared.md` lines 1 and 27, `prism-qa-plan/shared.md` lines 36-37, `prism-prd/shared.md` lines 55 and 59, and `.prism/rules/context-reuse.md` line 26, which cites a `prism-plan` "startup step 3" that no longer exists. `prism-plan` with no folder only writes a plan in chat and never judges an approach, so a structural design problem or a public-API stop lands on a skill that cannot rule on it. This is major because the routing contradicts the T22 split the plan records.
- **Suggested fix:** send architecture and approach calls to `prism-architect`, keep "write the plan" calls on `prism-plan`, and reword `context-reuse.md` line 26 without the dead step reference.

### `shipping-flow.md` says the pause fires on every commit

- **Severity:** `major`
- **Status:** `fixed`
- **Fixed in:** `efc91b48`: the line now says the pause fires before each push, which on a folder plan is once at the PR stage and not once per bundle commit.
- **File:** `.prism/references/shipping-flow.md:24`
- **Problem:** the line reads "The pause fires on every commit, per the per-push invariant." The plan's Decision that the pause-before-commit preference fires at the PR push on a folder plan, and ADR-0082's Consequences, both say it fires once at the push. Build stages don't read this file, so the practical effect is small, but this is major because it contradicts a recorded Decision.
- **Suggested fix:** say the pause fires before each push, which on a folder plan is once at the PR stage.

### Mira is still named as the writer of user stories and story maps

- **Severity:** `major`
- **Status:** `fixed`
- **Fixed in:** `efc91b48`: both `plan-authoring.md` rows now say no current writer, the `branch-plan.md` template line calls `## User Stories` a legacy flat-plan section, and the AC trace line in `acceptance-criteria.md` drops Mira. The two curated twins carry the same edits.
- **File:** `.prism/architect/_toolkit/plan-authoring.md:35`
- **Problem:** `plan-authoring.md` lines 35-36 name Mira as the writer of `## User Stories` and `### Story Map` on legacy flat plans, `.prism/rules/branch-plan.md` line 260 says to add stories "via the user stories skill (Mira)", and `.prism/rules/acceptance-criteria.md` line 43 traces AC to "a user story written by Mira". `prism-user-stories` is deleted and `prism-intent` writes no user stories, so the removal sweep missed these, along with their install twins and generated copies. This is major because a diverged architect-doc claim sends a reader to a skill that no longer exists.
- **Suggested fix:** mark both sections as legacy with no current writer, and drop the Mira reference from the template line and the AC trace line.

### The epic resume row waits on a `## Retro` nothing writes

- **Severity:** `minor`
- **Status:** `deferred`
- **Deferred to:** child 6 (issue #530) defines who writes `## Retro` in `spec.md`, per `prism-499/spec.md`, which gives child 6 the fixed retro and its check.
- **File:** `.prism/rules/workflow.md:62`
- **Problem:** the row resumes an epic at retro until `spec.md` holds `## Retro`, but no skill writes that section and `prism-retro` is read-only on plans, so an epic resume loops at retro.
- **Suggested fix:** key the row on the retro report or the `Retro:` line, or name the stage that writes `## Retro`. Child 6 owns later rows and may absorb this.

### Two commit subjects for a reviewer's folder-plan record

- **Severity:** `minor`
- **Status:** `fixed`
- **Fixed in:** `9cf06720`: `prism-self-review` now says `plan: self-review record`, the `plan: <persona> record` form `branch-plan.md` already gave. The `branch-plan.md` bullet after it, `chore: <persona> plan record for <ticket-id>`, is the flat-plan form, but it read as applying to a folder plan too, so the folder bullet now says its subject replaces that `chore:` subject, the same wording the skill uses. A search found no other `plan: review` instruction outside this plan.
- **File:** `.prism/rules/branch-plan.md:179`
- **Problem:** `branch-plan.md` gives the folder form as `plan: <persona> record`, while `prism-self-review/shared.md` says to commit as `plan: review`.
- **Suggested fix:** pick one form and use it in both.

### New skills carry a persona voice that ADR-0080 rejects

- **Severity:** `minor`
- **Status:** `fixed`
- **Fixed in:** `efc91b48`: the Voice blocks, the greeting, and the "You are" openers are gone from `prism-intent` and `prism-architect`. No task in this plan calls for Voice, ADR-0080 is accepted and rejects it, and the epic spec puts the Voice block and its ADR in child 7.
- **File:** `.ai-skills/skills/prism-intent/shared.md:1`
- **Problem:** `prism-intent` and `prism-architect` add `## Voice` sections and an opening greeting, while ADR-0080, which is accepted, rejects persona voice. The epic spec schedules Voice, its ADR, and the cap allowance for child 7.
- **Suggested fix:** strip the Voice blocks until child 7, or record a Decision that brings them forward.

### The spec stage checks `design.md` only when it exists

- **Severity:** `minor`
- **Status:** `fixed`
- **Fixed in:** `efc91b48`: `prism-spec` returns `blocked` when the intent's Design line says `needed`, or `supplement` with `approval: required`, and `design.md` is missing or unapproved.
- **File:** `.ai-skills/skills/prism-spec/shared.md:15`
- **Problem:** the skill checks `design.md` approval "when the folder has one", but T13 says to refuse when the intent says `Design: needed` and no approved design exists. The resume order hides the gap today.
- **Suggested fix:** refuse when the intent says `Design: needed` and `design.md` is missing or unapproved.

### The first push skips re-verify even after review-fix commits

- **Severity:** `minor`
- **Status:** `fixed`
- **Fixed in:** `efc91b48`: step 1 reruns the checks on any push, the first included, when a commit since `## Verification` touches a file they cover.
- **File:** `.prism/references/shipping-flow.md:13`
- **Problem:** step 1 skips re-verification on the first push, even when review-fix commits landed after `## Verification`. The wording follows T20, and CI is the backstop.
- **Suggested fix:** skip only when no commit landed after the verification record.

### `prism-design` still sets a status whose list was removed

- **Severity:** `minor`
- **Status:** `fixed`
- **Fixed in:** `efc91b48`: the Copy bullet says to note the open copy in the design.
- **File:** `.ai-skills/skills/prism-design/shared.md:35`
- **Problem:** the Copy bullet says to set `Needs copy pass`, a Status value from a list this change removed.
- **Suggested fix:** say to note the open copy in the design instead, or restore the status list.

### `tdd` assumes a story tool in a stack-neutral reference

- **Severity:** `minor`
- **Status:** `fixed`
- **Fixed in:** `efc91b48`: the story line is dropped, for the reason T17 dropped "Where tests live".
- **File:** `.ai-skills/skills/tdd/shared.md:35`
- **Problem:** "A new component or block gets a story plus tests" assumes a component-explorer stack. T17 dropped "Where tests live" from this reference for that same reason.
- **Suggested fix:** drop the line, or condition it on the repo having a component explorer.

### PR B, second pass: Briar's re-review

Briar's re-review of PR #532, 2026-11-18 [huntermcgrew/prism-522-chain-skills-part-2], range `fb46a9c6..5a4069ff`. The ten fixed first-pass findings are closed in the files they name, and a tree search found no remaining `plan: review`, `Needs copy pass`, `startup step 3`, Voice block, or plan-stage route for Nora, Mira, or Pixel. The epic resume row is deferred to child 6 as ruled. The new changes add 1 major and 1 minor, both fixed in `d881c3bf`. `pnpm run prism:check` passes locally at `5a4069ff` (2163 pass, 0 fail, 2 skipped), `ship-closure` holds at 267 files, and CI run 44373296490 on `5a4069ff` is green on `ubuntu-latest` and `windows-latest`.

### DX tickets now go to the intent stage, which refuses the "None" criteria DX tickets must carry

- **Severity:** `major`
- **Status:** `fixed`
- **Fixed in:** `d881c3bf`: DX enters the chain, and "None for this ticket." now covers only the tracker's AC field. `ticket-types.md` and `prism-start-ticket` say the intent holds criteria the developer proves with a machine check, such as a passing build or test or a lint rule that fires. `approve.mjs` refuses a non-epic intent only when its criteria section opens with "none", so criteria that open with a real criterion clear it. The twins and generated copies carry the same wording.
- **File:** `.prism/templates/ticket-types.md:46`
- **Problem:** `ad481ce3` routes a non-trivial DX ticket through Mira's intent at line 46 and in `prism-start-ticket/shared.md` line 47. Line 48 and `prism-start-ticket/shared.md` line 15 still say a DX ticket's acceptance criteria are always "None for this ticket.", and `approve.mjs` line 361 refuses `none` criteria on any intent that is not an epic. This is major because a DX ticket that follows both instructions stalls at the approval script's refusal, the same failure the first pass's handoff finding graded major. If Mira writes criteria instead, she contradicts the DX rule and syncs QA-facing criteria to a ticket that must carry none.
- **Suggested fix:** pick one rule and use it in all four places and their twins. Either the DX criteria line limits "None" to the tracker and lets the intent hold developer-verified criteria with machine evidence, or DX skips the intent stage. This needs a ruling, since the orchestrator chose the DX route.

### The no-folder route for a saved design differs between `prism-design` and the handoff tables

- **Severity:** `minor`
- **Status:** `fixed`
- **Fixed in:** `d881c3bf`: `prism-plan` accepts the no-folder case, so the route stands. The plan skill's Startup writes the plan in chat when it resolves no folder. `closing-messages.md`, `skills-ecosystem.md` (and its install twin), and `AGENTS.md.tmpl` now say `prism-architect` then the plan skill with no folder, as `prism-design` does.
- **File:** `.ai-skills/skills/prism-design/shared.md:33`
- **Problem:** the skill sends a saved design with no plan folder to `prism-architect`, then the plan skill, because the design needs an architecture review. `closing-messages.md` line 27, `AGENTS.md.tmpl` line 144, and the `skills-ecosystem.md` Pixel row (line 93, and line 91 of its install twin) send it straight to the plan skill. This is minor because a reader following the tables reaches a plan, but skips the architecture review the skill says the design needs.
- **Suggested fix:** add the `prism-architect` step to the three tables, or drop it from the skill.

### PR B, third pass: Briar's re-review

Briar's re-review of PR #532, 2026-11-18 [huntermcgrew/prism-522-chain-skills-part-2], range `a3b66f46..099ff81e`. Both second-pass findings are closed in the files they name. `approve.mjs` line 361 refuses a non-epic intent only when its criteria open with "none", so a DX intent with machine-checked criteria clears it, and all four route tables now name `prism-architect` before the plan skill. The DX wording matches across `ticket-types.md`, `prism-start-ticket`, their install twins, and the generated copies. The new changes add 2 minor, both open. `pnpm run prism:check` passes locally at `099ff81e` (2163 pass, 0 fail, 2 skipped), `ship-closure` holds at 267 files, `spec-scope-lint` passes with the branch name set, and CI run 44375602291 on `099ff81e` is green on `ubuntu-latest` and `windows-latest`.

### `prism-intent` offers to sync a DX intent's criteria to the tracker

- **Severity:** `minor`
- **Status:** `open`
- **File:** `.ai-skills/skills/prism-intent/shared.md:41`
- **Problem:** `d881c3bf` says at `ticket-types.md` line 48 that a DX intent's criteria are not synced to the tracker, and ADR-0009 line 16 already limits the sync to non-DX tickets. The intent skill's After approval offers the sync on every intent, with no DX exception. This is minor because the offer waits on a yes, so the cost is a person writing developer criteria into the tracker field that should say "None for this ticket.", where QA reads it.
- **Suggested fix:** make the offer skip DX: "Offer to sync the acceptance criteria to the ticket, except on a DX ticket, whose tracker field stays None for this ticket." Rule 9 of `skills-ecosystem.md` ("every ticket must have AC in the ticket description") predates this PR and has the same gap, so it can take the same carve-out.

### A saved design with no plan folder ends at a chat plan that can't be built from

- **Severity:** `minor`
- **Status:** `open`
- **File:** `.ai-skills/skills/prism-design/shared.md:33`
- **Problem:** the design skill sends a saved design with no folder, whatever its size, to `prism-architect` and then the plan skill, and says the implementer works from the plan's tasks. With no folder, `prism-plan/shared.md` line 5 writes a plan in chat for "a person planning something small" and says that plan can't be built from until it goes through the chain. `d881c3bf` copied the route into four tables on the basis that the plan skill accepts the no-folder case, but the plan it gives back is not one the implementer may use. This is minor because the reader learns to start an intent at the plan skill's reply, one extra hop, and no code is built from the wrong plan.
- **Suggested fix:** send a saved design with no folder to `prism-intent`, which starts the folder the spec stage reads the design from, in the skill and the four tables. `skills-ecosystem.md` already says anything that grows into planned work starts an intent. This changes a route the orchestrator ruled on, so it needs a ruling.

## Acceptance Criteria

The issue's proof ("a ticket runs from a typed `approve` to committed bundles with no person starting a stage; an agent running the approval script with no token is denied"), expanded into checkable criteria.

- [ ] **AC-1** On a plan folder, after the person types `approve` on the intent, the run reaches committed task bundles with no person starting a stage.
  - Evidence (human): on a scratch ticket in a Claude Code session, the person types `approve` once on `intent.md`, and nothing else unless auto-approval fails. `git log` then shows `plan:` commits for the spec, challenge rounds, and approval, followed by `T<n>:` commits for every task. The transcript shows no stage started by the person · UNMET looks like: a stage that waited for the person, or a task with no commit.
- [ ] **AC-2** An agent running the approval script with no fresh chat approval is denied, and one typed `approve` allows exactly one run.
  - Evidence (machine): in `approve-guard.test.ts`, a `PreToolUse` shell payload running the approve command with no token is denied with a message naming the command. After a `UserPromptSubmit` "approve", the same command is allowed once and denied on the second run. With `PRISM_HOOK_DISABLE=1`, the no-token case still denies · UNMET looks like: an allow with no token, or a second allow.
- [ ] **AC-3** The approval script itself refuses an agent session with no token, on Claude Code and Codex markers alike.
  - Evidence (machine): in `plan-approve.test.ts`, the run is refused with `CLAUDECODE=1` and with `CODEX_THREAD_ID` set, both with no token, and the file is byte-identical afterward · UNMET looks like: a stamp written under either marker.
- [ ] **AC-4** The workflow rule leads `AGENTS.md`, and every lead section ends inside the first 32 KiB.
  - Evidence (machine): `agents-md-budget.test.ts` passes with `workflow.md` asserted first, and `## History` records the end offset · UNMET looks like: a lead section past byte 32,768, or another section first.
- [ ] **AC-5** Every skill this child writes or rewrites fits the 120-line cap, and the over-cap allowlist holds only `prism-review-loop`.
  - Evidence (machine): `skill-loaded-lines.test.ts` passes, and `OVER_CAP_ALLOWLIST` has one entry · UNMET looks like: a `prism-plan` or `prism-user-stories` entry left, or a new one added.
- [ ] **AC-6** "Winston" routes to `prism-architect`, "write the intent" or "write user stories" routes to `prism-intent`, and `prism-user-stories` no longer exists.
  - Evidence (machine): `routing-coverage.test.ts` passes. `git grep -l prism-user-stories` matches only plans, retros, audits, ADRs, `CHANGELOG.md`, and `.prism/lessons.md`. No `prism-user-stories` directory exists under `.claude/skills/` or `.cursor/skills/` · UNMET looks like: a routing failure, or a live reference left.
- [ ] **AC-7** A consumer update delivers and registers the approve guard, and a Cursor-only install receives the runtime files with no registration and no git hook shims.
  - Evidence (machine): `approve-guard-registration.test.ts`, `plan-runtime-delivery.test.ts`, and `git-hooks-delivery.test.ts` pass, including their Cursor-only cases · UNMET looks like: a missing guard entry on Claude or Codex, a registration written for Cursor, or a `.githooks/` shim delivered to a Cursor-only install.
- [ ] **AC-8** The implement agent preloads `tdd`, and a preload naming no skill fails the build.
  - Evidence (machine): `.claude/agents/prism-implement.md` frontmatter holds `skills:` with `- tdd`, and `role-preloads.test.ts` passes its unknown-preload throw case · UNMET looks like: no `skills:` line, or an unknown preload that builds.
- [ ] **AC-9** Approval from Claude Code's own shell mode counts as an agent session, not a terminal, answering the intent's open question on Claude Code.
  - Evidence (human): in a Claude Code session with no chat approval, running the approve command through the `!` shell prefix is refused. Record the observed result in `## History`, and if it was accepted, record that and open an `OPEN` Decision · UNMET looks like: the run not done, or its result not recorded.
- [ ] **AC-10** The whole check suite passes on both CI platforms.
  - Evidence (machine): the PR's `prism-check` CI is green on `ubuntu-latest` and `windows-latest` · UNMET looks like: either leg red.
- [ ] **AC-11** A chain command run against a config file that does not parse stops with a config error instead of reading the defaults.
  - Evidence (machine): in `plan-tasks.test.ts` and `plan-bundles.test.ts`, the CLI exits 2 naming `.ai-skills/config.json` on a config with a trailing comma, and exits 0 on the same config without it · UNMET looks like: an exit 0 or 1 on the broken config, or a nonzero exit on the valid one.

### AC Adjustments

### AC Adjustment: AC-7 also forbids git hook shims on a Cursor-only install

- **Original:** A consumer update delivers and registers the approve guard, and a Cursor-only install receives the runtime files with no registration.
- **Proposed:** The same, ending "with no registration and no git hook shims", and its evidence adds `git-hooks-delivery.test.ts`.
- **Reason:** Child 2 decided a Cursor-only consumer gets no git hooks. Delivering the runtime files to Cursor-only installs (T6) must not hand them shims as a side effect.
- **Status:** accepted. Hunter McGrew, in chat on 2026-11-18: "Yes, all of it".

### AC Adjustment: AC-11 added for the config check

- **Original:** none. The criterion did not exist.
- **Proposed:** AC-11, a chain command run against a config file that does not parse stops with a config error instead of reading the defaults.
- **Reason:** T25 makes `tasks.mjs` and `bundles.mjs` fail closed on an unreadable config, and no earlier criterion covers it.
- **Status:** accepted. Hunter McGrew, in chat on 2026-11-18: "Yes, all of it".

### AC Sync Log

| Date | Agent | Action | Plan | Ticket |
| ---- | ----- | ------ | ---- | ------ |
| 2026-11-18 | Winston | Generated AC from the issue's proof line | written | not synced (awaiting go-ahead) |
| 2026-11-18 | Winston | Refreshed against child 4: AC-7 adds the git hook shims, AC-11 added for T25 | written | not synced (awaiting go-ahead) |
| 2026-11-18 | Clove | Accepted both AC adjustments on Hunter's approval, then synced all 11 criteria to issue #522 with IDs and Evidence stripped | synced | synced |

## PR Readiness

- [x] No critical or major issues. No minors are open. Eric's three majors and three minors are fixed, see the third pass under `## Review`, and so is the re-review's major under the fourth pass.
- [x] Types: `pnpm run prism:check-types` passes, as part of `prism:check`.
- [x] No stray console.logs or debug artifacts in the diff.
- [x] Tests written for new logic. The `approved_via`, drive-letter, and shebang cases are in. A mutation probe fails both `approved_via` cases.
- [x] No `open` debugged issues.
- [x] Build passes: the full `pnpm run prism:check` passes locally on Linux at 2b971c5d (2026-11-18). The fourth pass fix, `fbfd5092`, came after that run and changed only `hook-runtime.md` and its four copies. CI run 44358792289 on 7390d3d8 is the last green run, on `ubuntu-latest` and on `windows-latest`. The run on the new head is pending.
- [x] PR description up to date: it cites run 44358792289 on 7390d3d8 as the last green run and the new head's run as pending, and it mentions the ADR-0081 amendment, the lesson, and `compatibility.md` updated in this PR.
- [ ] AC for PR A: AC-2, AC-3, AC-7, AC-10, and AC-11 are met, and AC-10 is met by CI run 44351936636. AC-9 and the Codex payload checks were not run live. AC-1, AC-4, AC-5, AC-6, and AC-8 are PR B's.
- [x] PR B (#532): no critical or major issues. Briar's first pass found 4 major and 7 minor, listed under `## Review`. All of them are fixed except the epic resume row, which is deferred to child 6 (issue #530). The second pass found 1 major (DX criteria against the intent stage) and 1 minor (the no-folder design route), both fixed. The third pass found 2 minor (the intent's tracker sync on a DX ticket, and the no-folder design route ending at a chat plan), both open.
- [x] PR B build passes: `pnpm run prism:check` and `ship-closure` pass locally on Linux at `099ff81e` (2026-11-18). CI run 44375602291 on `099ff81e` is green on `ubuntu-latest` and `windows-latest`.
- [x] PR B has no stray debug artifacts, and the new logic has tests: `role-preloads.test.ts`, the `agents-md-budget.test.ts` order case, and two `approve-guard.test.ts` token cases.
- [ ] AC for PR B: AC-4, AC-5, AC-6, AC-8, and AC-10 are met, and AC-10 is met by CI run 44368244035. AC-1 and AC-9 need a live run and were not run.

**Last updated:** 2026-11-18

Retro:
