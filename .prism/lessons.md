# Lessons

Append-only working memory for the dogfood install. Captures patterns from corrections, mistakes, and confirmed-good calls during work on PRISM itself — anything a future session would want to pick up without re-litigating.

## Format

One entry per pattern. Lead with the rule, then a `**Why:**` line (the trigger — usually a date and a one-line summary of what happened), and a `**How to apply:**` line (when the rule kicks in). Keep entries short — one sentence per line where possible.

```markdown
## Don't reach for X when Y is available

**Why:** 2026-05-02 — used X for Z and lost an hour debugging when Y would have done the same job in three lines.

**How to apply:** Check for Y first. Reach for X only when Y demonstrably can't carry the case.
```

Group related entries under topical headings. Update existing entries before adding new ones — duplicate lessons defeat the purpose.

## Scope

This file is for the **PRISM toolkit's own evolution** — patterns about how the build works, how the canonical sources behave, how the dogfood interacts with consumers. Team-side lessons (lessons a consumer team learns about their own codebase) belong in their own `.prism/lessons.md`, generated during onboarding.

## Why this file is otherwise empty

PRISM was extracted from a personal install of Thrive's `.claude/` toolkit. The original `lessons.md` carried 200+ lines of Thrive-specific corrections that don't apply outside Thrive. Phase 1 prune cleared them out. New lessons accumulate from PRISM development going forward.

## Epic plans are preserved, not deleted, despite branch-plan.md saying "delete"

**Why:** 2026-05-23 — Phase 1.5f close-out hit a rule-vs-practice divergence. `.prism/rules/branch-plan.md § Before Closing` says "Delete the plan — once decisions are promoted, delete the plan file. Git history preserves it if you ever need to look back." But the actual PRISM practice for shipped epic plans (1.5c, 1.5d, 1.5e all still exist) is to preserve them — the roadmap links each shipped epic to its plan file as an archived reference. Epic plans serve as durable historical records of the architectural decisions and persona changes the phase introduced, more useful preserved than deleted.

**How to apply:** Until the rule is reconciled with the practice, follow the practice for epic plans (preserve, mark `shipped` in roadmap). Regular ticket plans likely still follow the rule (delete after close). The branch-plan.md § Before Closing language needs an update to distinguish the two — flag for Winston (or a future Theo pass) to resolve. Surface as a follow-up: either tighten the rule to except epic plans, or formally delete the prior shipped epics if the rule's intent is to preserve only in git history. (Resolved 2026-06-05: Hunter ruled plans are never deleted — any class; branch-plan.md § Before Closing now codifies preserve-and-mark-closed. ADR-0047.)

## AC evidence commands are code — dry-run them at authoring time

**Why:** 2026-07-22 (followup-port-2196-worktree-lifecycle, per-PR retro) — two of the plan's twelve machine-evidence AC clauses could never return their asserted result as authored: AC-9 asserted a grep count of `0` that the plan's own task 2 made `1` by design, and AC-8's pattern `"rev-list --count"` can never match code that passes `"rev-list"` and `"--count"` as separate `execFile` argv elements. Each survived a full review pass before self-review caught it, and AC-8's original clause would have passed-by-vacuous-miss if run uncritically.

**How to apply:** When an AC's evidence is a command with an asserted result, execute it — against the tree, or reasoned against the plan's own tasks — before the plan ships. A grep meant to match code must account for argv-array invocation style: a shell command written as prose never appears as a joined string in `execFile` calls.

## A control arm that receives an always-on instruction doing the same job is not a control

**Why:** 2026-08-02 (context-delivery-mechanism, task 9 A/B) — the hook adherence harness compared a control arm (`PRISM_HOOK_DISABLE=1`) against a variant, grading constraints deliberately chosen to live only in one architect doc. Both graded prompts scored full marks in the *control*. Root cause: `.prism/rules/context-reuse.md` is `load: always`, and its "Architect-context routing is diff-blind" section instructs the agent to match the target path against `manifest.json` and load the matching doc before editing — the hook's job, written as prose, reaching both arms through the generated `AGENTS.md`. The control arm's own response cited the doc by name. The experiment was prose vs. prose+hook, and its falsifier was one row from reverting a shipped mechanism it had never contrasted. A second ceiling compounded it: every run was a fresh worktree with one small task, so context was never tight enough for an agent to skip a lookup — the harness measured the mechanism exactly where the mechanism is least needed.

**How to apply:** Before trusting a null result, enumerate what the control arm actually receives — every always-on rule, every preloaded file, every generated block — and check whether any of it performs the intervention. Grade the arm's own output for citations of the material it was supposed to lack; that is the cheapest detector. Pair the dosing check ("did the variant get the intervention?") with a headroom check ("did the control have room to lose?"): a prompt whose control pilot saturates is inadmissible, and saturation voids the prompt, never the mechanism. And check that the test environment can produce the condition the mechanism exists for — an intervention that helps under context pressure cannot be measured in a session that never has any.

---

## A refactor that moves an existing check under a new condition narrows its reach silently

**Why:** 2026-09-02 (prism-477-followup-hook-optin, PR #480) — a plan Decision stated that a hand-edited hook registration surviving a removal is reported by doctor's existing dead-registration warning, and used that as the reason the removal's match could stay strict. The same PR then restructured `checkHookRegistration` around the new `hosts` gate and moved that pre-existing check inside `if (hosts.includes("claude"))`, so it stopped running on exactly the host mix the Decision was about. Every test still passed — the check was correct on the paths the suite covered — and self-review passed over it; Eric's PR review caught it.

**How to apply:** when a refactor moves an existing check under a new branch, treat the check's reach as changed until proven otherwise, and re-read every prose claim about what that check covers — the plan's own Decisions included. The tell is a check that was unconditional before the change and is not after it; add the test for the combination the new branch excludes, since the existing tests were written when no branch existed to exclude anything.

---

## A site with no opt-in object cannot be found by grepping the name of the site that has one

**Why:** 2026-09-02 (prism-477-followup-skills-hosts, PR #482) — PR #480 gated hook delivery on `hosts` and recorded the skill roster as the one remaining ungated fanout, having searched for the `optedIn` object that identifies it. The consumer path had a second ungated fanout: `refreshPlatformDirs`, which copies rules, architect docs, and templates into all three platform dirs through `buildPlatformDirs`. It carried no `optedIn` object at all, so no widening of that search would ever have reached it — the token the search keyed on was exactly what the missed site lacked. It surfaced by walking every write reachable from `runUpdate`, the one seam the consumer path goes through.

**How to apply:** when completing an opt-in or feature gate, enumerate the sites from the call graph of the entry point, not from a search for the marker the known sites carry. A grep finds sites that already participate in the mechanism; the ones that need adding are, by definition, the ones with nothing to match. Name the single seam every write passes through, list what it reaches, and gate from that list. Same completeness family as the grep-narrower-than-the-defect-class lesson above, with the opposite remedy: there is no pattern to widen, so the enumeration has to come from structure.

---

## A bug report's inventory is a snapshot of where the reporter looked, not a boundary on the defect

**Why:** 2026-09-02 (PRISM-481, PRs #483/#484) — issue #481 listed the consumer-unreachable commands Atlas names and proposed three CLI subcommands as the fix. Two of the three already had consumer-reachable equivalents (`prism doctor` already exposes config validation standalone), and the defect that actually broke every npm install was absent from the report: anchor substitution rewrote `.ai-skills/skills/**` in place, which in a consumer install sits inside `node_modules`, so no anchor had ever reached an npm consumer. It surfaced by tracing the render pipeline out from `runUpdate`, not by working the report's list.

**How to apply:** treat a report's inventory as evidence a defect exists, not as its edge. Check each proposed remedy against what already ships — a subcommand duplicating an existing one is a permanent public surface bought for nothing — and walk the pipeline the symptom implicates end to end before adopting the proposed shape.

---

## Prose naming who performs a step goes stale when a refactor moves the step, and no symbol search finds it

**Why:** 2026-09-02 (PRISM-481, PR #484) — moving anchor substitution out of Atlas and into the render pass left three sentences still crediting Atlas with running it: `anchor-substitution.md` § Anchor schema, `shared.md`'s Procedure D, and `shared.md`'s opening persona description. AC-9's grep passed over all three, because it searched the deleted function names and each stale sentence names only an actor. Plan close found a fourth in `_toolkit/onboarding.md`'s checkpoint-density section. Third occurrence of the class in one session — see the PRISM-477 entry above, where a refactor moved a check under a new branch and the plan's own Decision still described its old reach.

**How to apply:** the removal-and-rename-completeness section of the always-on code standards already owns this; it reads as being about a changed *predicate*, and this is a changed *actor*. When a change moves a step from one component to another, run a prose search for the old performer's name across every doc describing the step, alongside the symbol grep rather than instead of it — a grep for deleted symbols cannot see a sentence whose only stale token is a persona's name.

---

## Under `shell: true`, a missing command is never `ENOENT` — the shell reports it as its own exit status

**Why:** 2026-09-07 (issue #488) — the push gate's fail-open path was specified on `result.error` carrying `ENOENT`, and the test row for a nonexistent lint command expected an allow. Under `spawnSync(cmd, { shell: true })` the shell starts fine and the miss is the shell's own exit: `127` on every POSIX shell, `1` plus `is not recognized as an internal or external command` on `cmd.exe` — not `9009`, which is only what `%ERRORLEVEL%` shows interactively. The first smoke run denied instead of allowing.

**How to apply:** when a spec says "spawn error" for a `shell: true` command, read it as "the shell's not-found report" and detect that on `status` and `stderr`; keep the `result.error` branch for `ETIMEDOUT`, which `spawnSync` does report.

---

## A `spawnSync` child killed on timeout can hold its cwd open on Windows past the call's return

**Why:** 2026-09-07 (issue #488) — the git-gates test fixture removed its temp repo right after the timeout case and hit `EBUSY: resource busy or locked, rmdir` about one run in three on Windows; the killed `node -e "setTimeout(…)"` child had not released the directory yet.

**How to apply:** a fixture that spawns a process with `timeout` and then removes the directory it ran in passes `maxRetries`/`retryDelay` to `fs.rm`; a bare `fs.rm` is a flake waiting for the CI Windows leg.

## `git merge -X ours origin/main` on a stacked branch can silently revert the lower PR's late review fixes

**Why:** 2026-10-17 — PR 3 of the PRISM-499 stack had absorbed PR 2 at an earlier head. PR 2 then took three more review fixes and squash-merged. Absorbing that squash with `-X ours` kept PR 3's older copies of four PR 2 files, which reverted the fixes. `prism:check` stayed green, because the old code and the old tests agreed. Self-review caught it by diffing the squash's files against `main`.

**How to apply:** Before a lower PR squashes, merge its final head into every branch above it. After any `-X ours` absorb, run `git diff origin/main HEAD -- <file>` for every file the squash touched, and confirm it shows only the branch's own edits. Resolve each conflict hunk by hunk, never with `git checkout --theirs <file>` or `--ours <file>`: those replace the whole file and drop the other side's non-conflicting edits. On 2026-10-18 that dropped PR 10's `docs/ai-skills/parker.md` rewrite while absorbing PR 9, and only PR review caught it.

## A claim about every skill's sections goes false when a thinning cuts the section

**Why:** 2026-10-18 (PRISM-499 PR 8) — `closing-messages.md` said every persona's `shared.md` has a `## Next persona` section that cites it. The thinning PRs cut that section from each skill, and no rename or symbol search flagged the doc, because it names a section heading and not a skill.

**How to apply:** When thinning or renaming a skill, grep the architect docs for claims about every skill's sections (for example `## Next persona`), and reword the claim in the same PR.

## `git add` after the Write tool rewrites a script's mode to 100644

**Why:** 2026-11-18 (PRISM-516) — the committed git hook shims were `100644` because the Write tool recreated each file, dropping the executable bit, before `git add`. Git ignores a hook that is not executable, so the hooks did not run until a test that checked the index mode caught it.

**How to apply:** After writing or rewriting a file git must execute, run `chmod +x` and then `git add`, and check `git ls-files -s <path>` prints `100755`. Pin the mode in a test.

## The config validator does not enforce `additionalProperties` or `minItems`

**Why:** 2026-11-18 (PRISM-516) — `validateOnDiskConfig` accepts a typo under a schema block that sets `additionalProperties: false`, so `config.schema.json` alone does not reject it. A new config block's strictness has to be pinned by a test on the schema keywords.

**How to apply:** When adding a config block, do not assume the schema's `additionalProperties` or `minItems` rejects bad input at write time. Pin the keywords in a test, and make the reader skip with a notice on a malformed block.

## A delivery path that refreshes an executable file must restore its mode on the no-op path too

**Why:** 2026-11-18 (PRISM-516) — `deliverGitHookShims` ran `chmod 0o755` only after a write, so a byte-identical shim that had lost its mode (a commit from a `core.fileMode=false` clone) was never repaired. Git skipped the hook silently while doctor and the push gate, which checked only the marker, reported it installed.

**How to apply:** In any copy step that owns an executable file, set the mode on every pass, including the no-op, and make every "is it installed" check require the executable bit off Windows. The authoring-side twin is the `git add` lesson above.

## Compare paths only when both sides come from the same source

**Why:** 2026-11-18 (PRISM-516) — `otherWorktreeHasShim` compared Node's `realpathSync(repoRoot)` with the paths in `git worktree list --porcelain`. Windows spells the same directory differently in Node and in git, so the current worktree counted as a sibling and `removeGitHooksPath` kept the value. Linux CI passed, and Windows CI failed on the unset test.

**How to apply:** Compare paths only when both sides come from one source, both from git or both from Node, and normalize both the same way. For "is this the current worktree", take self from `git rev-parse --show-toplevel`, as the list entries are, the way `classifyHooksPath` uses `resolveCommonDir`.

## A safety gate that reads config through a helper returning null on a parse failure fails open

**Why:** 2026-11-18 (PRISM-520) — `auto-approve.mjs` read `.ai-skills/config.json` through `readRepoConfig`, which returns null for an absent file and for one that does not parse. A trailing comma in a config that set `stopPaths.contract` resolved to the defaults, whose contract list is empty, so the plan approved. The architect doc and a comment both said an unreadable config exits 2, and only the PR review's probe showed otherwise.

**How to apply:** A gate that decides from config tells "file absent" from "file present but unreadable" itself, with an `existsSync` check beside the helper, and refuses on the second. A helper written never to throw for a git hook is the wrong default for a check that allows something.

## Check plan citations after writing plan text, before landing it

**Why:** 2026-11-18 (PRISM-522) — plan text with a section sign in a plan folder fails the plan-citations check in CI, and a local run catches it before the push.

**How to apply:** After writing plan text, run `pnpm run prism:plan-citations` (or the full `pnpm run prism:check`) before landing it. A section sign in a plan folder fails CI.

## A reworded architect-doc sentence that fixes one half can narrow the other

**Why:** 2026-11-18 (PRISM-522, PR #531) — Eric's first review found the Token bullet claimed too much about the prompt-event half, and the fix probed that half only. The same sentence's file-edit half was reworded to "whose target is the token file", which understated the Codex `apply_patch` case, where the target is the whole patch text. A second review caught it by probing the guard.

**How to apply:** When a fix rewords a sentence with two clauses, re-probe both before committing, including the clause the finding did not name. Rewording is a new claim and gets the same source check as the first draft.

## A changed route has to clear the new destination's gate for what that ticket type carries

**Why:** 2026-11-18 (PRISM-522, PR #532) — sending improvement and DX tickets to the intent stage was a one-word route fix. Briar's re-review found that the approval script refuses "none" criteria on a non-epic intent, and the DX docs said a DX ticket's criteria are always "None", so a ticket following both instructions would stall at approval.

**How to apply:** When a change reroutes a ticket type to another stage, read that stage's entry checks (the script or refusal that gates it) and compare them with what the type carries, not only with whether the stage exists.

## Reversing a retirement starts from the retiring commit's file list

**Why:** 2026-11-19 (PRISM-537, PR #542): bringing Sasha back fixed PRISM's own `AGENTS.md` but missed `templates/install/AGENTS.md.tmpl`, which 020859f7 had edited when it retired her. PR review round 1 caught it.

**How to apply:** Before reversing a removal, run `git show --stat <retiring commit>` and check every file it touched, beside the tree grep for the moved phrase.

## Check the folder-plan template before sending a handoff to a plan section

**Why:** 2026-11-19 (PRISM-537): self-review round 1 told Sasha's report to land in `## Debugged Issues`, which a folder `plan.md` does not have, so the Decision had to route around it.

**How to apply:** Before a handoff names a plan section, confirm `.prism/templates/plan.md` carries it, or route the content to a section the folder plan does have.

## A PR-review re-run PATCHes the marked summary comment and never POSTs a new one

**Why:** 2026-11-19 (PRISM-544): reconcile reads the verdict only from the latest comment that carries the `code-review-pr-summary` marker, so a second marked summary comment is read and the earlier one goes stale.

**How to apply:** On a re-run, find the marked comment and PATCH it in place; post a new comment only when none carries the marker.

## Linux-only verification lets Windows path failures reach the PR's CI

**Why:** 2026-11-20 (PRISM-544, PR #546): part 2's verify and three self-review rounds all ran on Linux, so the Windows failures in the path-sensitive gate tests first showed up on the PR's CI.

**How to apply:** Before opening a PR, check any test that builds, compares, or matches a path for Windows forms (backslashes, drive letters, `\\?\` prefixes, case-insensitive names), since neither verify nor self-review runs on Windows.

## Verify a tool's behavior for each case a prose exception lists before writing it as the reason

**Why:** 2026-11-20 (PRISM-544): the commit-naming exception in `git-conventions.md` said git refuses named paths during a merge, cherry-pick, or revert. A fixture run showed git accepts named paths while a revert is in progress, so the reason was false for one of the three.

**How to apply:** Before a rule gives a reason for each case in a list (merge, cherry-pick, revert), run the tool once per case in a scratch repo, and split the sentence where the reasons differ.

## When a review finds one config-sensitive git read, audit every git read in the module at once

**Why:** 2026-11-20 (PRISM-544): the commit gate's diff and blame calls surfaced one git flag per review round (`--no-ext-diff`, then `--text` and `--inter-hunk-context`, then `--no-textconv`), because each round fixed the call it found and none listed the rest.

**How to apply:** When a finding shows a git call whose output a user's config can change, list every `runGit` call in the module and check each against color, external diff, textconv, ignore-revs, and attributes before the fix lands.

## A review's prescribed fix is spec, so state its boundary as precisely as the defect

**Why:** 2026-11-20 (PRISM-544, PR #547): round 1 prescribed "realpath the longest existing prefix of each path" and "pair only the lines next to the markers". The author applied both literally. The first also resolved a symlink leaf and left `repoRoot` unresolved, so the gate failed open on a committed outside link and 74 Windows tests went red. The second over-denied an ordinary insert. Each regression traced to the fix text, not to the author.

**How to apply:** When a finding's fix touches path canonicalization or diff pairing, name what stays untouched (the leaf, the other operand, the adjacent run) and the case the fix must still pass, so the fix carries its own regression test.

## `git mv` and `git rm` break `plan/commit.mjs`

2026-11-27 (PRISM-553 T2): `commit.mjs` runs `git add` on every path it is given, and after `git mv` the old path no longer exists in the tree, so `git add` fails and the commit aborts. Use plain `mv` or `rm` before `commit.mjs`, which stages the moves itself, or run `git reset -q -- <paths>` first.

## A spec sentence that promises a consumer override names the key that reads it

**Why:** 2026-11-27 (PRISM-557 retro): the epic spec said a consumer's per-persona pin still wins over `inherit` for the builder's model. No such pin exists. `CLAUDE_AGENT_MODEL_DEFAULTS` is a fixed map, and `modelTiers.overrides` is read only for `briar`. The sentence stood because no criterion graded it.

**How to apply:** When a spec says a consumer can override a default, cite the config key and the code that reads it in the same sentence, or cut the promise.
