# PRISM — Bug-Fix Verification Plan

**Bug:** Bundled `dist/cli.js` runs every subcommand's setup code on any invocation ([plan: followup-cli-multimain-dispatch](../plans/followup-cli-multimain-dispatch.md), `## Debugged Issues`)
**PR:** [#436 — Fix bundled dist/cli.js: every subcommand main() fires on any invocation](https://github.com/HunterMcGrew/PRISM/pull/436)
**Severity:** High
**Environment:** The compiled `dist/cli.js` (what a consumer gets via npm/npx install or `pnpm link --global`). Does not reproduce when running the source files directly with `tsx` — the bug only shows up in the bundled build.
**Who this is for:** Anyone verifying the fix on a checkout of this repo with `pnpm` available. No separate consumer repo is needed except for the one item in §4.

**How to use:** Each item records **Pass/Fail**, plus short notes on failure. Work through the sections in order — §1 exactly reproduces the original bug's repro steps, §2–§3 spot-check that the fix didn't break anything nearby, §4 is the one item that needs a separate consumer repo.

---

## Before you start

- Check out this repo at PR #436's branch (`huntermcgrew/prism-cli-multimain-dispatch`) and run `pnpm install` once.
- `dist/cli.js` is not checked into git — every scenario below that says "freshly built" means run `pnpm run prism:bundle` first (or reuse the bundle from the scenario immediately before it, since nothing in between changes it).

---

## 1. Primary verification — the bug's original repro steps

Before the fix: building the bundle and running any command fired every subcommand's setup at once, producing extra output and often a failed exit because one of those subcommands rejected for missing arguments. Each step below is one of the ways that used to happen — confirm each one now shows only the output for the command actually requested.

- [ ] **1.1 — `--help` on a freshly built bundle shows only the usage banner.**
  1. Run `pnpm run prism:bundle`.
  2. Run `node dist/cli.js --help`.
  - **Pass:** the output is the `prism — PRISM consumer CLI` usage banner (lists the `init`, `adopt`, `update`, `doctor`, `eject` commands) and nothing else — no extra headings, warnings, or error text before or after it. The command exits with code 0 (no red/error styling in the terminal).
  - **Fail:** anything besides the banner appears, or the exit code is non-zero.

- [ ] **1.2 — Running the bundle with no arguments shows only the usage banner.**
  1. Using the same bundle from 1.1, run `node dist/cli.js` with no arguments.
  - **Pass:** identical output to 1.1, exit code 0.
  - **Fail:** any extra output, or a non-zero exit.

- [ ] **1.3 — An unrecognized command fails cleanly, with no other command's output mixed in.**
  1. Run `node dist/cli.js not-a-real-command`.
  - **Pass:** the first line reads `prism: unknown subcommand "not-a-real-command"`, followed by the usage banner. The command exits with a non-zero code. Nothing else appears — specifically, no text like "Sync state:", "Version:", "prism:adopt", or "prism eject" (those belong to other commands and would mean this one leaked through).
  - **Fail:** any output other than the unknown-command message and the banner, or an exit code of 0.

---

## 2. Targeted regression — each command still runs alone

The fix changed how all five commands, plus two behind-the-scenes build scripts, decide whether they're the one being run. Confirm each still does only its own job.

- [ ] **2.1 — `doctor` through the bundle prints one report, nothing else.**
  1. Using the bundle from §1, run `node dist/cli.js doctor`.
  - **Pass:** a single health report (lines such as "Sync state: …", "Version: …", ending in "prism doctor: healthy." or "prism doctor: unhealthy — see findings above."), exit code 0. No text belonging to another command (adopt/eject/update) appears.
  - **Fail:** output from more than one command appears, or the doctor report is missing or garbled.

- [ ] **2.2 — `eject --dry-run` through the bundle previews only the eject action.**
  1. Run `node dist/cli.js eject --dry-run`.
  - **Pass:** output starts with `prism eject (dry run)` and lists what eject would remove — a preview only, exit code 0, no files actually deleted. No doctor/adopt/update output appears.
  - **Fail:** any other command's output appears, real files get removed despite `--dry-run`, or the command errors.

- [ ] **2.3 — The everyday development path still runs one command at a time.**
  1. Run `pnpm run prism:doctor` (this runs the doctor source file directly, not through the bundle).
  - **Pass:** the same single health report as 2.1, exit code 0.
  - **Fail:** output from another command appears, or the command errors.

---

## 3. Root-cause adjacency — same bug pattern, checked everywhere it showed up

The bug came from a stale "am I the one being run?" check inside each command's own file. Two behind-the-scenes build scripts turned out to share the identical check and needed the identical fix — easy to miss in a spot check, so confirm both explicitly.

- [ ] **3.1 — The full local project check passes end to end, including the two build scripts caught by the same fix.**
  1. Run `pnpm run prism:check`.
  - **Pass:** the whole command finishes with exit code 0. Nothing in the output looks cross-contaminated — the section reporting on manifest coverage shows only manifest-coverage output, and nowhere does one script's report bleed into another's.
  - **Fail:** the command fails at any step, or output from one script appears where a different script's output is expected.

- [ ] **3.2 — The dedicated regression test for this bug passes on its own.**
  1. Run `node --test scripts/ai-skills/cli-bundle.test.ts`.
  - **Pass:** the run reports 3 passing tests, 0 failing — these are the automated equivalents of §1's three scenarios.
  - **Fail:** any test fails.

---

## 4. Consumer-repo check (needs a linked or global `prism` — not runnable from inside this checkout)

`adopt` and `update` are the two commands that write to a consumer repo, so they're the riskiest ones if the fix were wrong — worth checking directly rather than inferring from §1–§3.

- [ ] **4.1 — In a real consumer repo, `doctor`, `adopt`, and `update` each run alone.**
  1. In a separate repo with PRISM linked (`pnpm link --global` from this checkout, or the published npm package), run `prism doctor`.
  2. On a repo that hasn't adopted PRISM yet, run `prism adopt` (or, on one that already has, confirm you see only its "already has a PRISM baseline" guard message and nothing else).
  3. On a repo that has already adopted PRISM, run `prism update`.
  - **Pass:** each command's output and effects are limited to that command alone — `doctor` shows only its health report, `adopt` only its adoption summary, `update` only a line starting with "prism:update complete —" (or "prism:update (dry run) —" if run with `--dry-run`) plus its own file-sync notices. Nothing from the other commands appears mixed in.
  - **Fail:** any cross-command output or side effect appears.
  - **If no consumer repo is available:** mark this item **Blocked**, not Pass/Fail, and note that in the sign-off table. This is the one scenario in this plan that a checkout of this repo alone can't exercise.

---

## Sign-off

| Tester | Date | Environment URL | Notes |
|--------|------|-----------------|-------|
|        |      |                 |       |

---

*Reference link: [PR #436](https://github.com/HunterMcGrew/PRISM/pull/436). §3 is the regression sweep — it confirms the automated test suite backs every manual scenario in §1.*
