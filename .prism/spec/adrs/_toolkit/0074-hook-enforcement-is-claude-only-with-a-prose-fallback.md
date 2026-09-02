---
Number: 0074
Title: Hook-Dependent Enforcement Reaches Claude Code Only; the Fallback Everywhere Else Is Always-On Prose
Status: accepted
Date: 2026-09-02
---

## Context

PRISM ships exactly three hook-registered behaviors on `main`, all from
`scripts/ai-skills/hooks/` and all registered in
`templates/install/.claude/settings.json`: a `PostToolUse` announce layer on
`Read|Grep|Bash` that names each still-unread architect doc for a routed path
(ADR-0071), a `PreToolUse` write gate on `Write|Edit|Bash` that denies an edit
to a routed path until that route's docs are read (ADR-0072), and a
`PostCompact` handler. Those three registrations are the whole of the runtime.

Issue #477 inventories the hook runtime differently — it lists
`run-gates`, `ownership-guard`, `evidence-ledger`, and `gates.json`. That
inventory is stale. Those files belong to the
verdict-ratification floor that was built and then reverted — ADR-0067
(superseded) into ADR-0069, with the revert recorded in
`.prism/plans/epic-floor-revert.md`. None of them exists on `main`, and none
is coming back on that channel: ADR-0069 rejects hooks on the
`Stop`/`SubagentStop` report-back channel permanently. The record is corrected
here rather than repeated.

The Claude-only reach reads like a platform limit, and it is not one. This is
a delivery gap. `scripts/ai-skills/hooks/harnesses.mjs` carries working Cursor
and Codex adapters — payload shapes, scope ids, tool-kind tables — and its own
comment on the Codex adapter reads "Codex supports `PreToolUse`, but as with
Cursor nothing delivers it a registration and no probe has observed its deny
envelope." The asymmetry inside the runtime is narrower than the issue
suggests: `emitNag` is defined for all three hosts, so the announce layer
would work on Cursor and Codex the moment a registration existed; only
`emitDeny` returns `null` on those two, and only because no probe has observed
the envelope to answer in. The issue's finding that Codex "exposes no
registration mechanism" contradicts the code and does not survive contact with
it. What is actually missing per host is a registration writer, idempotent
merge semantics for that host's settings file, and a live probe of its deny
envelope.

A fallback already exists, and it is already portable. `context-reuse.md`
§ "Architect-context routing is diff-blind" declares `load: always`, so it
reaches every host through AGENTS.md, and it already states the prose
obligation and names the hook as Claude-only. `skill-core.md` § "Reading
before writing" states the same obligation at Step 0 of every persona
session, on every host.

Delivery was not gated on the consumer's host. `refreshHookRuntime` was called
unconditionally from `runUpdate` (`scripts/ai-skills/update.ts`) with no
`optedIn` check, so every `prism update` wrote `.claude/hooks/` and merged
the registration into `.claude/settings.json` even for a consumer who opted
into Codex or Cursor only. That fact is stated here; its consequence is below,
and the follow-up that closed it is recorded there too.

## Decision

Hook-dependent enforcement is accepted as Claude Code-only, and the guarantee
everywhere else is carried by always-on prose rather than by a second
enforcement mechanism.

Three alternatives were on the table:

- **Build the Cursor and Codex delivery seams now.** Rejected as scope, not
  as direction — each needs its own registration format, its own idempotent
  settings merge, and a live probe of that host's deny envelope before
  `emitDeny` can return anything trustworthy. Shipping a deny in an unverified
  envelope produces a gate that either fails open silently or blocks with an
  unperformable remedy, which is the failure ADR-0067's revert was about.
  This stays open follow-up work.
- **A git `pre-commit` / `pre-push` floor as the portable equivalent.**
  Rejected because it cannot enforce the guarantee at all: the guarantee is
  read-*before*-write, and a commit hook fires after every edit in the change
  is already on disk. It can observe a violation, never prevent one. Two
  costs on top: installing it needs either a new dependency (`husky` —
  `code-standards.md` § General forbids a new dependency without approval)
  or a per-clone `git config core.hooksPath` step every consumer must run by
  hand, the same "consumer must take a step" failure that removing the
  `.generated/` staging directory already corrected (`docs/ai-skills/compatibility.md`
  § The install-script rule). The spec-lint half of enforcement already has a
  portable floor that needs no local hook — `pnpm prism:check` runs in CI on
  every PR and on `main`, on both ubuntu and windows.
- **Level down — remove the Claude Code gate so every host behaves
  identically.** Rejected because it trades a real guarantee on one host for
  symmetry on three. The gate was added on measured evidence that
  announcement alone habituates (ADR-0072 § Context); deleting it reinstates
  the failure that measurement identified.

The runtime notice itself lives in `.prism/references/skill-core.md`
§ "Reading before writing", a single static host-neutral sentence read at
Step 0 of every persona session on every host. Two placements were rejected:

- **A per-host notice in each skill's `codex.md` / `cursor.md` platform
  body.** Rejected because `buildSkillMarkdown` in
  `scripts/ai-skills/generate-skills.ts` composes exactly `shared.md` plus the
  one host's file, per skill, with no layer above it — there is no shared
  per-host prelude any skill would inherit, and `.ai-skills/skills/_shared/`
  does not exist. The notice would be one copy per skill per host, every copy
  free to drift, and every one of those files is an empty placeholder comment
  today.
- **A runtime host-detection check inside the skill.** Rejected because it
  spends a tool call every session on every host to rediscover a fact that is
  static and already known when the registration is written — the
  registration itself passes `--tool=claude` on the command line.

## Consequences

A Codex or Cursor session can edit a routed spec file with the governing doc
unread and nothing will stop it. The only thing standing between that session
and a wrong edit is prose it may not act on — which is precisely the
habituation ADR-0072 measured for the announce layer.

The asymmetry is invisible from inside a session. A persona behaves correctly
under Claude Code and permissively under Codex with no signal that anything
differs, and the compensating control is the static sentence in the shared
startup contract, not a detection.

The compensating control ADR-0072 named does not reach the hosts that need
it, and its stated reason for staying quiet is false. `checkHookRegistration`
in `scripts/ai-skills/doctor.ts` reports only three findings, all keyed on
`.claude/`, and its own doc comment justifies silence on the grounds that "a
Cursor or Codex consumer has no `.claude/` tree at all." That premise does
not hold: `refreshHookRuntime` is ungated, so any consumer who has run
`prism update` does have a `.claude/hooks/` tree and a registration — both
halves present, doctor quiet, and the gate still never fires because Codex
and Cursor receive no registration of their own. A clean `doctor` run on
those hosts was therefore not evidence that enforcement is present. The
follow-up to this ticket closed both halves: an optional `hosts` array in
`.ai-skills/config.json` now gates delivery, so a consumer who does not list
`claude` receives no runtime and no registration and has a prior delivery
taken back out; and `checkHookRegistration` reads the same key, reporting the
prose fallback where the gate is not delivered and warning where a delivery
is left over. The `## Context` sentence above stating that delivery is not
gated on the consumer's host describes the state this ADR was written in, not
the state on `main`.

Numbered ADRs do not ship to consumers (ADR-0064), so this ADR is the
maintainer-facing record only. The consumer-facing statement lives in
`docs/ai-skills/compatibility.md` § "Hook-based enforcement is Claude Code
only".
