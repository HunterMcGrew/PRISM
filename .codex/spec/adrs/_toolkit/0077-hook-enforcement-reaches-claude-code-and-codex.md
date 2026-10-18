---
Number: 0077
Title: Hook-Dependent Enforcement Reaches Claude Code and Codex; Cursor Keeps the Prose Fallback
Status: accepted
Date: 2026-10-12
Supersedes: 0074
---

> Amended by [ADR-0080](./0080-skills-are-function-shaped-and-held-to-four-tests.md)'s phase-1 cut of `skill-core.md`: the paragraph below that keeps the runtime notice in `skill-core.md` no longer holds. The notice's static prose now lives only in `.prism/rules/context-reuse.md` § Architect-context routing is diff-blind, which already names Claude Code and Codex as the hosts the hook reaches. The rejection of a per-host notice and of runtime host detection stands.

## Context

ADR-0074 accepted hook-dependent enforcement as Claude Code only. It rejected
building the Cursor and Codex delivery paths "as scope, not as direction," and
it set the bar any later delivery path would have to clear: a live probe of
that host's deny envelope before `emitDeny` returns anything, because a deny in
an unverified envelope either fails open silently or blocks with a remedy the
model cannot perform.

Two facts about Codex lowered the risk that bar guarded against. OpenAI now
documents the Codex `PreToolUse` deny envelope, and it is the same shape Claude
Code uses: `hookSpecificOutput` carrying `permissionDecision: "deny"` and a
`permissionDecisionReason`. That was checked against OpenAI's hooks
documentation on 2026-09-02. Codex's `hooks.json` also uses the same
`{hooks: {Event: [{matcher, hooks: [{type, command}]}]}}` shape as the `hooks`
block in Claude's `settings.json`, so the existing registration merge and
doctor's command walker carry over with no new parser.

PRISM #487 then shipped Codex delivery. Its plan,
`.prism/plans/prism-477-followup-codex-hooks.md`, chose to amend ADR-0074
rather than supersede it, and it sequenced that amendment into a later
documentation PR held behind a live Codex probe. The code merged and the
documentation PR did not, so ADR-0074 kept stating a Claude-only decision that
`main` no longer implemented, with no record of what replaced it. This ADR is
that record.

## Decision

Hook-dependent enforcement is delivered to Claude Code and Codex from one
shared runtime. Cursor keeps ADR-0074's always-on prose fallback until it has
a delivery path of its own.

That covers everything the runtime delivers: the announce layer (ADR-0071),
the write gate (ADR-0072), the `PostCompact` reset of read-tracking state, and
the git gates (ADR-0076). The shape of the Codex half:

- **The registration lives in `.codex/hooks.json`.** That file is committed, so
  every clone inherits the registration. Codex runs it only once the user
  trusts the project's `.codex/` layer and reviews the hook, per the
  Consequences below. `templates/install/.codex/hooks.json` registers
  `PreToolUse`, `PostToolUse`, and `PostCompact`, the same three events Claude
  Code gets, plus the git-gates `Bash` matcher group.
- **One runtime, two registrations.** Both hosts' registrations point at
  `.claude/hooks/`. `refreshHookRuntime` in `scripts/ai-skills/update.ts`
  delivers the runtime when the consumer's `hosts` includes `claude` or
  `codex`, and merges each host's registration only when that host is listed.
  `mergeHookCodexRegistration` calls the same `mergeHookRegistration` function
  the Claude registration uses, keyed on `PRISM_CODEX_HOOK_COMMAND_PATTERN`.
- **The Codex deny ships in the documented envelope ahead of a live probe.**
  `HARNESSES.codex.emitDeny` in `scripts/ai-skills/hooks/harnesses.mjs` answers
  in the documented shape. This relaxes ADR-0074's bar rather than meeting it.
  ADR-0074 asked for a live probe of the envelope, and this ADR accepts
  OpenAI's published envelope plus the fail-open argument below in its place.
  Shipping before the probe is safe in one direction only. Every exit path in
  `hook.mjs` exits 0 and a deny travels in stdout alone, so an envelope Codex
  did not recognize would fail open, which is exactly how Codex behaved before
  #487.
  `hook-gate.test.ts` asserts that exit-0 property on a spawned Codex deny.
- **`prism doctor` reports per host.** `checkHookRegistration` in
  `scripts/ai-skills/doctor.ts` reads `.codex/hooks.json` beside
  `.claude/settings.json` and reports reach, a missing registration, or a
  leftover registration for a host no longer in `hosts`, for each host
  separately.

Alternatives considered:

- **Amend ADR-0074 in place, as the #487 plan intended.** Rejected because the
  amendment would sit under a title and a Decision sentence that both say
  Claude Code only. A reader who stops at the headline gets the opposite of
  what `main` does. Superseding keeps Cursor's half of ADR-0074: its prose
  fallback and the placement of the runtime notice are carried forward below.
- **Hold the Codex deny until a live probe confirms the envelope.** Rejected
  because the probe needs a delivered registration to run at all, and the
  fail-open asymmetry above means an envelope Codex does not recognize leaves
  Codex where it was before #487. That argument does not cover a recognized
  deny that fires on the wrong path, which only the probe can rule out.
- **Register under `[hooks]` in a TOML config.** PRISM's
  `.codex/codex-config.toml` is per-user and gitignored, so a registration
  there is invisible to the rest of the team and gone on a fresh clone. Codex
  also reads inline `[hooks]` from a committed `<repo>/.codex/config.toml`,
  and that file is rejected on cost: no TOML merge writer exists, while the
  `hooks.json` shape matches Claude's `hooks` block, so `mergeHookEventEntries`
  and doctor's `collectHookCommands` carry over with no new parser.
- **Anchor the command at the git root with
  `node "$(git rev-parse --show-toplevel)/.claude/hooks/hook.mjs"`**, the
  spelling OpenAI's hooks examples use. Rejected until the probe shows Codex
  runs `command` through a shell. The documentation neither states nor denies
  that, and if Codex takes the string literally, node cannot find the file and
  the hook never fires, with nothing on screen to say so. It stays the
  contingency if the probe shows sessions starting below the repo root.
- **A second runtime copy under `.codex/hooks/`, or one shared copy moved to
  `.prism/hooks/`.** Rejected on cost. The second copy is the same bytes at a
  second path, doubling the deliver, prune, and backup work. The move is the
  better long-term home but rewrites the command string every existing consumer
  already has registered, so the ownership pattern would have to match two
  spellings for a release or old registrations would stop being claimed as
  PRISM's.

ADR-0074's other rejections stand unchanged. A git `pre-commit` floor
still cannot enforce read-before-write, because it fires after the edit is on
disk. Removing the Claude Code gate to make every host behave alike still
trades a measured guarantee for symmetry.

The runtime notice also stays where ADR-0074 put it: static prose in
`skill-core.md` § "Reading before writing", which now names
Claude Code and Codex as the hosts that receive the runtime. Both
placements ADR-0074 rejected for it, a per-host notice in each skill's
platform body and a runtime host-detection check, stay rejected for the same
reasons.

## Consequences

- A Codex session that edits a routed path with its governing docs unread is
  denied, provided Codex honors the documented envelope. The announce layer
  and the `PostCompact` reset are registered for Codex too, so a long Codex
  session should drop read credit for a doc it lost to compaction. Neither has
  been observed firing on Codex, and the relative-path bullet below is one
  reason either might not.
- On Codex, a committed registration is not a running gate. OpenAI's hooks
  documentation says project-local hooks load only when the project's
  `.codex/` layer is trusted, and that each hook definition must be reviewed
  and trusted before it runs. Trust is recorded against the definition's hash,
  so a PRISM update that changes the command string puts the hook back under
  review. A teammate who has not trusted the project gets no gate, and
  `prism doctor` still reports the registration, because it reads the file
  and cannot see Codex's trust state. Whether an untrusted clone says anything
  on screen is one more thing for the probe to observe.
- The Codex deny is documentation-verified, not live-probed. No measured
  session has shown a Codex deny reason reaching the model. Until one does, a
  clean `prism doctor` run on Codex proves the registration is present, not
  that the gate fires. If Codex ignores the envelope, the gate fails open with
  nothing on screen to say so. The probe is the only control that closes this.
- The Codex command is a path relative to the session's working directory,
  `node ".claude/hooks/hook.mjs"`, because Codex documents no
  project-directory variable to anchor it. A Codex session started below the
  repo root will not find the runtime, and the hook will not run. What Codex
  actually sends as `cwd` is one of the things the probe has to settle.
- A Codex-only consumer still gets a `.claude/hooks/` directory. That is the
  price of one shared runtime.
- Codex's scope id is `session_id` with no agent suffix, where Claude Code
  appends the agent id. OpenAI documents Codex subagents and says their hooks
  use the parent's `session_id`. It lists `agent_id` on `SubagentStart` and
  `SubagentStop` only, not on `PreToolUse` or `PostToolUse`. So a Codex
  subagent most likely shares its parent's read credit, because the scope id
  reads `session_id` alone. Whether tool events inside a subagent carry an
  `agent_id`, and whether a deny reason reaches a subagent, are unprobed.
- Doctor's git-gates info and warning lines run in the Claude arm only. A
  Codex-only consumer's git-gates registration is covered by the generic
  dead-registration check, but doctor never says whether its git gates are on,
  off, or inert.
- Cursor has no delivery path. `HARNESSES.cursor.emitDeny` returns `null` and
  no install path writes a Cursor hook file, so a Cursor session can edit a
  routed file with its doc unread and nothing stops it. ADR-0074's negative
  carries over intact for Cursor: always-on prose in `context-reuse.md` and
  `skill-core.md` is the only thing standing in the way, and nothing inside a
  Cursor session signals the difference.

Numbered ADRs do not ship to consumers (ADR-0064), so this is the
maintainer-facing record only.

## References

- [ADR-0074](0074-hook-enforcement-is-claude-only-with-a-prose-fallback.md) — the Claude-only decision this supersedes
- [ADR-0071](0071-architect-context-read-hook.md) — the announce layer
- [ADR-0072](0072-write-gate-on-routed-paths.md) — the write gate
- [ADR-0076](0076-commit-and-push-gates-are-harness-hooks.md) — the git gates
- `.prism/plans/prism-477-followup-codex-hooks.md` — the Codex delivery plan and its live-probe task
- `.prism/architect/_toolkit/hook-runtime.md` § Hook runtime
- PRISM #487 — the Codex delivery change
