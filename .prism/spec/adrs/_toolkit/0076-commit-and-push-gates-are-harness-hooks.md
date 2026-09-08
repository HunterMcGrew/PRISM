---
Number: 0076
Title: Commit and Push Gates Are Harness Hooks, Opted In Per Consumer
Status: accepted
Date: 2026-09-07
---

## Context

Two asks arrived together (issue #488): an author persona should re-read its
diff before each commit, and lint and the formatter check should hold a push
that would fail them. The shipping flow (`.prism/references/shipping-flow.md`)
already prescribed lint and format in prose as its first step, unenforced;
nothing prescribed a cleanup read at all. ADR-0072 had measured that a prose
announcement habituates, so a prose-only answer was known to decay.

Two prior decisions bound the shape of any answer. ADR-0074 rejected a git
`pre-commit`/`pre-push` floor as a substitute for read-before-write — a
guarantee a commit-time hook cannot provide, because the write has already
happened by the time a commit runs. ADR-0069 closed the report-back channel to
hooks after the enforcement floor built on it was reverted; the revert plan
(`.prism/plans/epic-floor-revert.md`) left room for "a separate, smaller
opt-in" that sits on a mid-work tool call rather than on the report-back turn.

The hook runtime delivered for the architect write gate already watches the
shell tool's pre-execution event and already judges `git` subcommands in the
command text, so the seam for a commit-time and push-time gate existed. What
did not exist was a decision about mechanism, gate strength, and default.

## Decision

The gates are `PreToolUse` hooks on the shell tool that recognize a `git
commit` or `git push` segment in the command text, delivered by the existing
hook runtime as a second entry point (`git-gates.mjs`), and opted in per
consumer through a `hooks` block in `.ai-skills/config.json`.

- **Commit cleanup pass** — the first `git commit` on each HEAD sha is denied
  once per session with a pointer to `.prism/references/cleanup-pass.md`; the
  retry of the same command goes through. State is saved before the deny.
- **Push verification** — `commands.lint` and then `commands.format` run
  inside the hook; a non-zero exit denies the push with the output tail. A
  timeout or a command that cannot start allows the push with an
  announcement.
- **Off by default** — absent `hooks` block means every gate is off. PRISM's
  own config enables both. `PRISM_HOOK_DISABLE` and `PRISM_HOOK_DENY_DISABLE`
  silence them the same way they silence the write gate.

Alternatives, and why each lost:

- **Real git hooks.** Cannot prompt the model — they can only print to Bash
  output the agent may `--no-verify` past; cost `husky` (a new dependency) or
  a per-clone `core.hooksPath` step; and fire for every human on the team.
  This is not a reopening of ADR-0074, which rejected git hooks as a
  *substitute for read-before-write*, a guarantee a commit-time hook cannot
  provide. Here observation at diff-complete time is the guarantee, and the
  harness hook is the only mechanism that can put a message in front of the
  model at that moment.
- **Nag-only commit gate.** ADR-0072 measured that announcement habituates.
- **Hard commit gate cleared by a self-attested marker.** Theater — the
  persona writes the marker it is then judged against — and a gate a persona
  must satisfy on its own turn is the reverted floor's shape in miniature.
- **One-shot keyed on the staged-diff hash.** Cleanup edits change the hash
  and re-hold the retry. HEAD sha is stable across the retry and changes
  exactly when a commit lands, so "once per commit" falls out with no marker.
- **Deny on a push-gate timeout.** The retry times out again — an
  unperformable remedy. Fail open with an announcement instead.
- **A new `formatCheck` config slot.** `commands.format` is already the
  check-mode command per `config.schema.json`; a second slot would duplicate
  it.

## Consequences

- One `node` spawn per `git commit` and per `git push`, on the hosts that
  receive the runtime. Every other shell call pays a process start that
  exits on the first non-matching check.
- `commands.lint` becomes a live dependency of `git push` for an opted-in
  consumer. A lint slower than `pushVerificationTimeoutMs` degrades to an
  announced allow rather than a deny, so the gate is friction, not a wall —
  and a consumer whose lint is routinely slow gets a gate that routinely
  waves them through.
- The commit hold is a nudge with no deterministic evidence behind it. A
  persona can retry without reading the reference, and nothing in the hook
  can tell. The compensating control is the prose step in the shipping flow,
  which every host carries whether or not the hook is registered.
- The gates sit on a mid-work tool call, never on the report-back channel
  ADR-0069 closed, so they cannot trap a persona in its own report-back turn.
- Reach is Claude Code only, the same delivery gap ADR-0074 records for the
  write gate. Codex and Cursor both document the shell-precondition event and
  its deny envelope, so their delivery is a follow-up on the same runtime
  rather than a platform limit; until it lands, those hosts have the prose
  step and nothing else.
- Recognizing `commit` and `push` in command text has the same three gaps the
  write gate's shell arm has: a command built from a variable, a `cd` into a
  subrepo, and a `"` inside a heredoc body closing the splitter's quote early
  are each invisible or misread. The last of these can at most trigger a
  spurious push check, which blocks nothing unless lint actually fails.

## References

- `.prism/plans/issue-488.md`
- [ADR-0069](0069-deterministic-verification-is-a-pipeline-stage.md) — the report-back channel is closed to hooks
- [ADR-0072](0072-write-gate-on-routed-paths.md) — the write gate this runtime was built for, and the habituation measurement
- [ADR-0074](0074-hook-enforcement-is-claude-only-with-a-prose-fallback.md) — git hooks rejected as a read-before-write substitute; Claude-only reach with a prose fallback
- `.prism/plans/epic-floor-revert.md` — the revert that left room for a smaller opt-in
- `.prism/architect/_toolkit/install-layout.md` § Git gates
- `.prism/references/cleanup-pass.md`
