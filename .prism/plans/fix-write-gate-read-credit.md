# Plan: fix-write-gate-read-credit

## Ticket

None. Reported during the Kitchen Line epic run on 2026-11-18 (PRISM-499 children 5 and 6).

## Goal

The architect-doc write gate records every read it observes, follows a literal `cd`, ignores text a data-only command reads on stdin, and tells the reader what counts as a read.

---

## Implementation Tasks

### Clove (implementation)

1. **Serialize state updates.** In `scripts/ai-skills/hooks/architect-route.mjs`, add a per-scope lock (an atomic `mkdir` of `<state>.lock`, stale after 10 s, give up after about 2 s) and run every load-modify-save inside it: `resolveArchitectNag` and the umbrella acknowledgement in `resolveUmbrellaSpeedBump`, which reloads and merges under the lock. Test: `hook-gate.test.ts` spawns eight concurrent hook processes reading eight docs and asserts all eight credit.
2. **Model a literal `cd`.** In `scripts/ai-skills/hooks/hook.mjs`, track `cd <literal>` across segments. The read arm admits `&&` (and no other `&`) and resolves each `cat` operand against the directory in effect for its segment. The gate arm resolves every unproven candidate against the original cwd and each `cd` target. `checkSegmentWritesNoFile` treats a `cd` with one literal operand and no flags as a no-write segment. Tests: a `cd`-prefixed flagless `cat` credits; `cd scripts && tee hooks/x.mjs` is denied; `cd x && cat y` is not gated.
3. **Exempt data heredocs.** In `scripts/ai-skills/hooks/lib/shell.mjs`, let `splitShellSegments` report each heredoc body with the head of the command that reads it. In `hook.mjs`, drop from the candidate scan a body whose reader is `gh`, `cat`, `tee`, or `jq`. Tests: Eric's `gh api … --input - <<'EOF'` comment edit is allowed; a `bash <<EOF` body naming a routed path is still denied; `tee <routed> <<EOF` is still denied.
4. **Say what counts.** `formatDenyMessage` adds one line after the remedies naming what counts as a read. Test: the deny for `cat <doc> > /dev/null` names redirects.

### Eli (documentation)

1. Update `.prism/architect/_toolkit/hook-runtime.md` § Write gate and § Umbrella-section speed bump to match: what clears the gate, the heredoc exemption, the `cd` modelling and its remaining gap, and the concurrency guarantee. Absorbed by Clove, since the doc is the contract for the code in this diff.

---

## Decisions

- **Heredoc bodies read by `gh`, `cat`, `tee`, or `jq` are not scanned for paths.** Approved by Hunter on 2026-11-18.
  - **Root cause:** `scanPathShapedTokens` scans the raw command, heredoc bodies included, and the `docs/` route matches the bare word `docs`, so an Eric comment edit mentioning docs was denied.
  - **Alternatives considered:** keep scanning and explain it in the deny message; exempt every heredoc body.
  - **Chosen approach:** exempt only bodies whose reader treats stdin as data. Every heredoc an interpreter, `git apply`, or `patch` reads is still scanned, because those run their stdin. Targets on the command line still gate.
  - **Implementation guidance:** the allow-list fails toward scanning: an unknown reader keeps its body in the scan.
- **A literal `cd` is modelled on both arms.** Approved by Hunter on 2026-11-18.
  - **Root cause:** Claude Code strips a `cd <current cwd> &&` prefix before the hook sees it, but a `cd` anywhere else reaches the hook intact. Its `&` fails `SHELL_READ_SAFE_CHARACTERS`, so the read credits nothing, and the gate resolves operands against the original cwd, so `cd scripts && …` moves them out of a route's reach.
  - **Alternatives considered:** close the gate bypass only and tell agents to drop the `cd`.
  - **Chosen approach:** track `cd <literal>`. A `cd $VAR`, `cd -`, or `cd ~` target stays unknown; the read arm stops crediting after one, and the gate keeps it as a documented gap.
- **Read-modify-write on the state file is serialized with a lock.**
  - **Root cause:** each hook process loads state, adds its doc, and saves. A tool batch spawns them concurrently, so later saves drop earlier credits. Measured: 4 of 8 parallel reads credited.
  - **Alternatives considered:** merge-on-save without a lock (still loses updates in the load-to-rename window); an append-only credit log (changes the state format every reader shares).
  - **Chosen approach:** an `mkdir` lock, because it is atomic on every platform the runtime runs on and needs no dependency. A lock it cannot take in time proceeds unlocked, so the hook never stalls a tool call.
  - **Implementation guidance:** the shared `.tmp` name stays. Under the lock only one writer uses it, and `umbrella-speed-bump.test.ts` forces a save failure by squatting that exact path.
- **A proven write-free command has no candidates at all, command words included.** Follows from the `cd` ruling.
  - **Root cause:** the proof dropped only operands, so a command word such as `cat` stayed a candidate. Resolved inside a routed directory it matched the route, and `cd src && cat index.ts` was denied. The same happens on `main` to any read-only command run from a cwd inside a routed directory.
  - **Chosen approach:** `checkCommandWritesNoFile` returns a boolean, and a proven command returns no candidates. The proof stays all-or-nothing, so an unproven command still gates on every token.
- **`cd` targets resolve per segment, not across the whole command.** Resolving every token against every `cd` directory named `src/src` in the deny instead of the real target. Only the arguments of segments after a `cd` resolve against its directory, beside the whole-command scan against `cwd`.
- **`&&` credits only directly after a `cd`.** `cat a.md && cat b.md` skips the second `cat` when the first fails, and the existing suite pins that refusal. The proof side admits `&&` anywhere, because it never claims a segment ran.
- **ADR-0072 gets two "has since" notes.** Its § Decision and § Consequences restate the proof rule and the credit class this diff changes. `code-standards.md` § Removal and rename completeness asks for every prose home of a changed predicate, and the ADR's own Codex note set the inline-note precedent.

---

## Sessions

- 2026-11-18 [claude/sleepy-mccarthy-b15lxp] open: Intent — make the write gate record reads reliably, follow `cd`, and stop parsing stdin text; Bounds — hooks runtime, its tests, hook-runtime.md; Approach — reproduce each behavior, fix the root cause, a failing-on-main test per fix

---

## History

- 2026-11-18 [claude/sleepy-mccarthy-b15lxp]: Reproduced all three reported behaviors with a scratch harness and live probes; plan written.
- 2026-11-18 [claude/sleepy-mccarthy-b15lxp]: Tasks 1-4 and the doc update landed; `hook-gate-read-credit.test.ts` fails 7 of 11 rows against `main`'s `hooks/`, passes all here. See the Decisions on proven commands and per-segment `cd` for two findings made while testing.

---

## Review Issues

---

## Acceptance Criteria

### Behavioral

- [x] AC-1: Given eight concurrent hook processes each reading a different doc, When they finish, Then all eight docs are credited.
  - Evidence (machine): `hook-gate.test.ts` concurrency test reads the state file and finds eight entries; on `main` it finds fewer.
- [x] AC-2: Given a command `cd <dir> && cat <doc>`, When it runs, Then the doc is credited.
  - Evidence (machine): the state file's `read` array holds the doc after `runPostToolUseArm`.
- [x] AC-3: Given `cd scripts && tee hooks/x.mjs` where `scripts/hooks/**` is routed and unread, When it runs, Then it is denied.
  - Evidence (machine): `runPreToolUseArm` returns a deny envelope.
- [x] AC-4: Given a `gh api … --input - <<'EOF'` whose body names a routed word, When it runs, Then it is allowed.
  - Evidence (machine): `runPreToolUseArm` returns `null`.
- [x] AC-5: Given a `bash <<EOF` whose body names a routed path, When it runs, Then it is denied.
  - Evidence (machine): `runPreToolUseArm` returns a deny envelope, the positive control for AC-4.
- [x] AC-6: Given a gated `cat <doc> > /dev/null`, When it is denied, Then the message says a redirected read does not count.
  - Evidence (machine): the deny reason matches `/redirect/`.

### Non-behavioral

- [x] AC-7: Every fix has a test that fails on `main`.
  - Evidence (machine): the new tests run against `main`'s `hooks/` fail.
- [ ] AC-8: `hook-runtime.md` matches the code, checked claim by claim.
  - Evidence (human): self-review's source-verification pass.

---

## PR Readiness

- [ ] No critical or major issues
- [ ] Tests written for new logic and edge cases
- [ ] Build passes
- [ ] PR description up to date
